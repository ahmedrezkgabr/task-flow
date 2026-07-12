import type { TaskRepeat } from '../types.ts';

const SHORT: Record<Exclude<TaskRepeat, 'none'>, string> = {
  daily: 'D',
  weekly: 'W',
  monthly: 'M',
};

/** Compact recurrence marker: a loop glyph plus a D/W/M cadence letter. */
export function RepeatBadge({ repeat, className = '' }: { repeat: TaskRepeat; className?: string }) {
  if (repeat === 'none') return null;
  return (
    <span
      title={`Repeats ${repeat}`}
      className={`inline-flex shrink-0 items-center gap-0.5 font-mono text-[9px] text-muted ${className}`}
    >
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden="true">
        <path
          d="M2 5a4 4 0 0 1 6.9-2.4M10 7a4 4 0 0 1-6.9 2.4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path d="M8.6 1.4V3H7M3.4 10.6V9H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {SHORT[repeat]}
    </span>
  );
}
