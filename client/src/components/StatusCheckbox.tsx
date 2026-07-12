import type { TaskStatus } from '../types.ts';

interface Props {
  status: TaskStatus;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

/** Blueprint-style tri-state check: pending → done, with an in_progress dash. */
export function StatusCheckbox({ status, onToggle, size = 'md' }: Props) {
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const done = status === 'done';
  const inProgress = status === 'in_progress';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? 'Mark not done' : 'Mark done'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`grid ${dim} shrink-0 place-items-center rounded-[3px] border transition-colors ${
        done
          ? 'border-health bg-health/20 text-health'
          : inProgress
            ? 'border-work bg-work/10 text-work'
            : 'border-line-strong text-transparent hover:border-muted'
      }`}
    >
      {done ? (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
          <path
            d="M2.5 6.2 4.7 8.4 9.5 3.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : inProgress ? (
        <span className="h-[2px] w-2 rounded bg-work" />
      ) : null}
    </button>
  );
}

/** Cycle order used everywhere the user toggles a status. */
export function nextStatus(status: TaskStatus): TaskStatus {
  return status === 'done' ? 'pending' : status === 'pending' ? 'in_progress' : 'done';
}
