# TaskFlow

A standalone, single-user **task & time-planning manager** with an *engineering-blueprint*
aesthetic — a ruled hourly planner, drag-and-drop scheduling, a backlog, a month calendar, and a
GitHub-style activity heatmap.

Runs locally with **zero native build steps**: persistence uses Node's built-in
[`node:sqlite`](https://nodejs.org/api/sqlite.html) module (`DatabaseSync`) — no Prisma, no
`better-sqlite3`, no compilation.

```
task-flow/
├── server/   Express + TypeScript API, SQLite via node:sqlite
└── client/   React + TypeScript + Vite + Tailwind + dnd-kit
```

## Requirements

- **Node.js ≥ 22.5.0** — required. `node:sqlite` does not exist in Node 20/earlier, and the server
  is launched with the `--experimental-sqlite` flag. Check with `node --version`; upgrade via
  [nvm](https://github.com/nvm-sh/nvm) (`nvm install 22 && nvm use 22`) if you're below it.
- npm (bundled with Node).

## Quick start

The root [`run.sh`](run.sh) launcher installs dependencies (first run only) and starts **both** the
API and the web client together, with clean shutdown on `Ctrl+C`:

```bash
./run.sh            # install if needed, then run server (:47821) + client (:47820)
./run.sh install    # install dependencies only, then exit
./run.sh doctor     # report Node/npm versions and check compatibility
./run.sh --help     # usage
```

If your default Node is older than 22.5, the script automatically switches to a compatible version
via [nvm](https://github.com/nvm-sh/nvm) when one is installed. Then open
**<http://localhost:47820>**.

## Running it manually

Prefer to run each side yourself? Open **two terminals**.

**1 · API server** (port 47821):

```bash
cd server
npm install
npm run dev
```

On first boot it creates `server/data/taskflow.db` and seeds a handful of example tasks
(mixed types, some with subtasks, some scheduled around today).

**2 · Web client** (port 47820):

```bash
cd client
npm install
npm run dev
```

Then open **<http://localhost:47820>**. The Vite dev server proxies `/api/*` to the server on 47821.

> To start over from an empty database, stop the server and delete `server/data/taskflow.db`
> (and any `-wal`/`-shm` files); it will re-seed on next boot.

## Features / views

- **Day planner** — 24-hour ruled grid; drag task blocks onto hour slots. Start time is
  minute-precise (e.g. 09:15), block height reflects `durationMinutes`, and the left accent bar and
  tint reflect `type`. A red rule marks the current time.
- **Week planner** — the same grid across 7 day-columns. **The week starts on Saturday** (Egypt
  convention: Sat → Fri).
- **Month view** — calendar grid (Saturday-first) with a compact task list per day; click a day for
  the full list.
- **Task list panel** — tasks in the current Day/Week/Month scope with **one level of collapsible
  subtasks** and a checkbox to cycle `pending → in_progress → done`.
- **Backlog** — unscheduled tasks (`scheduledDate = null`); drag onto the planner to schedule, or
  drag a scheduled task back onto the backlog to unschedule it.
- **Repeating tasks** — a task can repeat **daily**, **weekly** (same weekday), or **monthly** (same
  day-of-month). Recurring occurrences are expanded across every view from the start date onward and
  carry a small `↻` badge; editing or toggling any occurrence updates the underlying task.
- **Heatmap** — GitHub-contribution-style calendar (Saturday-first rows). Cell intensity = task
  count that day; cell color = dominant `type` (split fill when multiple). Toggle types to filter.
- **Prayer times** — the Day and Week planners draw the five daily prayers (Fajr, Dhuhr, Asr,
  Maghrib, Isha) as thin teal lines on each day, behind the task blocks. Toggle them with the
  **☾ Prayers** button. See below for how the data is sourced and cached.

## Prayer times

- **Source**: the free, key-less [Aladhan API](https://aladhan.com/prayer-times-api) — one
  `/v1/calendar/{year}/{month}` request per visible month.
- **Location & method**: defaults to **Cairo, Egypt** with calculation **method 5** (Egyptian
  General Authority of Survey). On first load the app asks the browser for geolocation once and
  caches the result; if you deny it, the Cairo default is used. Change the defaults in
  [`client/src/lib/prayer.ts`](client/src/lib/prayer.ts) (`DEFAULT_LOCATION`, `PRAYER_METHOD`).
- **Offline cache**: each fetched month is stored in `localStorage` and read **cache-first**. Prayer
  times for a date are deterministic, so once a month has been seen it renders with no network —
  the feature works fully offline afterward.
- **Timezone caveat**: Aladhan returns times in the *location's* timezone, while the grid renders in
  the *device's* local time. These match for an Egypt user on Egypt time; a device set to a
  different timezone than the prayer location would show the lines offset by that difference.

## Data model (`tasks`)

`id` · `title` · `notes?` · `type` (`work|personal|health|learning|errand|other`) ·
`status` (`pending|in_progress|done`) · `scheduledDate?` (`YYYY-MM-DD`) · `scheduledHour?` (0–23) ·
`scheduledMinute?` (0–59) · `durationMinutes` · `repeat` (`none|daily|weekly|monthly`) ·
`parentId?` (one level of subtasks) · `position` · `createdAt` · `updatedAt`.

## API

Base URL `/api`.

| Method | Path | Notes |
| ------ | ---- | ----- |
| `GET`  | `/tasks?from=&to=` | tasks scheduled in a date range (inclusive) |
| `GET`  | `/tasks?unscheduled=1` | backlog tasks with no date |
| `GET`  | `/tasks` | all tasks |
| `GET`  | `/tasks/:id` | one task |
| `POST` | `/tasks` | create (validates `type`/`status`/`repeat` enums) |
| `PATCH`| `/tasks/:id` | partial update (drag reschedule, status toggle, edits) |
| `DELETE`| `/tasks/:id` | deletes the task; subtasks cascade |
| `GET`  | `/tasks/meta/heatmap?from=&to=` | per-day counts grouped by `type` (top-level tasks only) |

## Tech notes

- **Server**: Express 4 + TypeScript, run through `tsx` with `node --experimental-sqlite`. Schema and
  seed live in [`server/src/db.ts`](server/src/db.ts); routes in
  [`server/src/routes/tasks.ts`](server/src/routes/tasks.ts). SQLite foreign keys enforce the
  subtask cascade.
- **Client**: Vite + React 18, Tailwind for the blueprint palette/typography, `@dnd-kit` for
  drag-and-drop. All tasks are loaded once into a small context store
  ([`client/src/store.tsx`](client/src/store.tsx)) and views derive from it; mutations are optimistic.

## Scripts

Server: `npm run dev` (watch) · `npm start` · `npm run typecheck`
Client: `npm run dev` · `npm run build` · `npm run preview` · `npm run typecheck`
