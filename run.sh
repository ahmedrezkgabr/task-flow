#!/usr/bin/env bash
#
# TaskFlow — one-shot launcher.
# Ensures a compatible Node, installs deps on first run, then starts the API
# server (:47821) and the Vite client (:47820) together. Ctrl+C stops both.
#
# Usage:
#   ./run.sh            # install (if needed) + run server & client
#   ./run.sh install    # install dependencies only, then exit
#   ./run.sh doctor      # check Node/npm versions and exit
#   ./run.sh -h|--help   # show this help
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$ROOT/server"
CLIENT="$ROOT/client"
MIN_NODE_MAJOR=22
MIN_NODE_MINOR=5

# --- pretty output ----------------------------------------------------------
c_reset=$'\033[0m'; c_dim=$'\033[2m'; c_blue=$'\033[34m'; c_green=$'\033[32m'
c_red=$'\033[31m'; c_yellow=$'\033[33m'
say()  { printf '%s[taskflow]%s %s\n' "$c_blue" "$c_reset" "$*"; }
ok()   { printf '%s✓%s %s\n' "$c_green" "$c_reset" "$*"; }
warn() { printf '%s!%s %s\n' "$c_yellow" "$c_reset" "$*"; }
die()  { printf '%s✗ %s%s\n' "$c_red" "$*" "$c_reset" >&2; exit 1; }

usage() { sed -n '3,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

# --- ensure a Node >= 22.5 --------------------------------------------------
# node:sqlite (DatabaseSync) does not exist before Node 22.5. If the current
# node is too old, try to switch via nvm before giving up.
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
node_minor() { node -p 'process.versions.node.split(".")[1]' 2>/dev/null || echo 0; }

node_ok() {
  local maj min
  maj="$(node_major)"; min="$(node_minor)"
  [ "$maj" -gt "$MIN_NODE_MAJOR" ] && return 0
  [ "$maj" -eq "$MIN_NODE_MAJOR" ] && [ "$min" -ge "$MIN_NODE_MINOR" ] && return 0
  return 1
}

ensure_node() {
  if command -v node >/dev/null 2>&1 && node_ok; then
    ok "Node $(node --version) (node:sqlite available)"
    return
  fi
  warn "Node $(node --version 2>/dev/null || echo 'not found') is too old; need >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}."
  # Try nvm. It isn't safe under `set -euo pipefail`, so relax strict mode
  # for the duration of sourcing/switching, then restore it.
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    say "Attempting to switch Node via nvm…"
    set +euo pipefail
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm use --lts >/dev/null 2>&1 || nvm use node >/dev/null 2>&1 || true
    if ! node_ok; then
      # Fall back to any installed >= 22 version.
      local cand
      cand="$(nvm ls --no-colors 2>/dev/null | grep -oE 'v(22|23|24|25)\.[0-9]+\.[0-9]+' | tail -1)"
      [ -n "$cand" ] && nvm use "$cand" >/dev/null 2>&1
    fi
    set -euo pipefail
    node_ok && { ok "Switched to Node $(node --version)"; return; }
  fi
  die "Need Node >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}. Install it (e.g. 'nvm install 24') and re-run."
}

# --- dependency install -----------------------------------------------------
install_dir() {
  local dir="$1" name="$2"
  if [ ! -d "$dir/node_modules" ]; then
    say "Installing $name dependencies…"
    ( cd "$dir" && npm install )
    ok "$name dependencies installed"
  else
    ok "$name dependencies present"
  fi
}

install_all() {
  install_dir "$SERVER" "server"
  install_dir "$CLIENT" "client"
}

# --- run both services ------------------------------------------------------
PIDS=()

# Recursively kill a process and all of its descendants. npm spawns
# node/tsx/vite as grandchildren, so killing the top pid alone leaves them
# running — walk the tree depth-first.
kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

_cleaned=0
cleanup() {
  [ "$_cleaned" = 1 ] && return; _cleaned=1
  say "Shutting down…"
  for pid in "${PIDS[@]:-}"; do
    [ -n "${pid:-}" ] && kill_tree "$pid"
  done
  pkill -P $$ 2>/dev/null || true
}

run_all() {
  trap cleanup EXIT INT TERM

  say "Starting API server on http://localhost:47821"
  ( cd "$SERVER" && npm start ) &
  PIDS+=("$!")

  say "Starting web client on http://localhost:47820"
  ( cd "$CLIENT" && npm run dev ) &
  PIDS+=("$!")

  printf '\n'
  ok "TaskFlow is up:"
  printf '   %s→%s  App:  %shttp://localhost:47820%s\n' "$c_dim" "$c_reset" "$c_green" "$c_reset"
  printf '   %s→%s  API:  %shttp://localhost:47821/api%s\n' "$c_dim" "$c_reset" "$c_green" "$c_reset"
  printf '   %sPress Ctrl+C to stop both.%s\n\n' "$c_dim" "$c_reset"

  # Exit (and trigger cleanup) as soon as either service dies.
  wait -n
}

# --- entrypoint -------------------------------------------------------------
case "${1:-run}" in
  -h|--help|help) usage ;;
  doctor)
    command -v node >/dev/null 2>&1 && say "node: $(node --version)" || warn "node: not found"
    command -v npm  >/dev/null 2>&1 && say "npm:  $(npm --version)"  || warn "npm: not found"
    ensure_node ;;
  install)
    ensure_node; install_all; ok "Done." ;;
  run)
    ensure_node; install_all; run_all ;;
  *)
    die "Unknown command '$1'. Try: ./run.sh --help" ;;
esac
