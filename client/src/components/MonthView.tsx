import { useMemo, useState } from 'react';
import type { Task } from '../types.ts';
import { TYPE_COLOR } from '../lib/theme.ts';
import {
  fmtDayNum,
  fmtLong,
  isSameMonth,
  monthGridDays,
  today,
} from '../lib/dates.ts';
import { StatusCheckbox, nextStatus } from './StatusCheckbox.tsx';
import { useTasks } from '../store.tsx';

interface Props {
  anchor: string; // any date within the month to display
  tasks: Task[];
  onOpen: (id: string) => void;
}

const WEEK_HEADS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthView({ anchor, tasks, onOpen }: Props) {
  const { update } = useTasks();
  const days = useMemo(() => monthGridDays(anchor), [anchor]);
  const [selected, setSelected] = useState<string | null>(null);

  // Top-level scheduled tasks grouped by date.
  const byDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.scheduledDate && t.parentId === null) {
        (m.get(t.scheduledDate) ?? m.set(t.scheduledDate, []).get(t.scheduledDate)!).push(t);
      }
    }
    for (const list of m.values()) {
      list.sort((a, b) => (a.scheduledHour ?? 99) - (b.scheduledHour ?? 99));
    }
    return m;
  }, [tasks]);

  const selectedTasks = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div className="flex h-full gap-3">
      <div className="panel flex flex-1 flex-col overflow-hidden rounded-card">
        {/* weekday header */}
        <div className="grid grid-cols-7 border-b border-line-strong">
          {WEEK_HEADS.map((w) => (
            <div
              key={w}
              className="border-r border-line px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-widest text-muted last:border-r-0"
            >
              {w}
            </div>
          ))}
        </div>

        {/* day grid */}
        <div className="grid flex-1 auto-rows-fr grid-cols-7">
          {days.map((d) => {
            const dayTasks = byDate.get(d) ?? [];
            const inMonth = isSameMonth(d, anchor);
            const isToday = d === today();
            return (
              <button
                key={d}
                onClick={() => setSelected(d)}
                className={`flex flex-col gap-1 border-b border-r border-line p-1.5 text-left transition-colors last:border-r-0 hover:bg-surface-2 ${
                  inMonth ? '' : 'opacity-40'
                } ${selected === d ? 'bg-surface-2 ring-1 ring-inset ring-work' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs ${
                      isToday
                        ? 'grid h-5 w-5 place-items-center rounded-full bg-work text-white'
                        : 'text-muted'
                    }`}
                  >
                    {fmtDayNum(d)}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="font-mono text-[10px] text-muted">{dayTasks.length}</span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className="flex items-center gap-1 truncate text-[11px] text-ink"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-[2px]"
                        style={{ background: TYPE_COLOR[t.type] }}
                      />
                      <span className={`truncate ${t.status === 'done' ? 'text-muted line-through' : ''}`}>
                        {t.title}
                      </span>
                    </span>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="font-mono text-[10px] text-muted">
                      +{dayTasks.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <aside className="panel hidden w-72 shrink-0 flex-col overflow-hidden rounded-card lg:flex">
        <header className="border-b border-line px-3 py-2">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
            {selected ? fmtLong(selected) : 'Select a day'}
          </h3>
        </header>
        <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
          {selected && selectedTasks.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-muted">No tasks scheduled.</p>
          )}
          {selectedTasks.map((t) => (
            <div
              key={t.id}
              onClick={() => onOpen(t.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onOpen(t.id)}
              style={{ borderLeft: `3px solid ${TYPE_COLOR[t.type]}` }}
              className="flex cursor-pointer items-start gap-2 rounded-[3px] border border-line bg-surface-2 px-2 py-1.5 hover:border-line-strong"
            >
              <div className="pt-[2px]">
                <StatusCheckbox
                  size="sm"
                  status={t.status}
                  onToggle={() => update(t.id, { status: nextStatus(t.status) })}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm text-ink ${t.status === 'done' ? 'line-through text-muted' : ''}`}>
                  {t.title}
                </p>
                {t.scheduledHour !== null && (
                  <p className="font-mono text-[10px] text-muted">
                    {String(t.scheduledHour).padStart(2, '0')}:00
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
