import { useMemo, useState } from 'react';
import type { HeatmapData, Task, TaskType } from '../types.ts';
import { TASK_TYPES } from '../types.ts';
import { expandOccurrences } from '../lib/occurrences.ts';
import { TYPE_COLOR, TYPE_LABEL } from '../lib/theme.ts';
import { addDays, fmtLong, parseISODate, startOfWeek, toISODate } from '../lib/dates.ts';

const WEEKS = 53;
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface Props {
  anchor: string;
  tasks: Task[];
}

export function Heatmap({ anchor, tasks }: Props) {
  const [enabled, setEnabled] = useState<Set<TaskType>>(new Set(TASK_TYPES));

  // Trailing 53 weeks ending at the anchor's (Saturday-first) week.
  const { columns, from, to } = useMemo(() => {
    const endWeek = startOfWeek(anchor);
    const startWeek = addDays(endWeek, -(WEEKS - 1) * 7);
    const cols: string[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const weekStart = addDays(startWeek, w * 7);
      cols.push(Array.from({ length: 7 }, (_, d) => addDays(weekStart, d)));
    }
    return { columns: cols, from: startWeek, to: addDays(endWeek, 6) };
  }, [anchor]);

  // Aggregate top-level occurrences (repeats expanded) per day, grouped by type.
  const data: HeatmapData = useMemo(() => {
    const occ = expandOccurrences(tasks, from, to).filter((t) => t.parentId === null);
    const result: HeatmapData = {};
    for (const t of occ) {
      const d = t.scheduledDate!;
      if (!result[d]) result[d] = { total: 0, byType: {} };
      result[d].byType[t.type] = (result[d].byType[t.type] ?? 0) + 1;
      result[d].total += 1;
    }
    return result;
  }, [tasks, from, to]);

  // Max filtered count for intensity scaling.
  const filteredCount = (date: string): { total: number; top: TaskType[] } => {
    const entry = data[date];
    if (!entry) return { total: 0, top: [] };
    let total = 0;
    const pairs: [TaskType, number][] = [];
    for (const t of TASK_TYPES) {
      if (!enabled.has(t)) continue;
      const n = entry.byType[t] ?? 0;
      if (n > 0) {
        total += n;
        pairs.push([t, n]);
      }
    }
    pairs.sort((a, b) => b[1] - a[1]);
    return { total, top: pairs.slice(0, 2).map((p) => p[0]) };
  };

  const max = useMemo(() => {
    let m = 1;
    for (const col of columns) {
      for (const date of col) m = Math.max(m, filteredCount(date).total);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, data, enabled]);

  const cellStyle = (date: string): React.CSSProperties => {
    const { total, top } = filteredCount(date);
    if (total === 0) return { background: '#171A21' };
    const alpha = 0.3 + 0.7 * (total / max);
    const toHexA = (hex: string) =>
      `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
    if (top.length >= 2) {
      // multi-type split
      return {
        background: `linear-gradient(135deg, ${toHexA(TYPE_COLOR[top[0]])} 50%, ${toHexA(
          TYPE_COLOR[top[1]],
        )} 50%)`,
      };
    }
    return { background: toHexA(TYPE_COLOR[top[0]]) };
  };

  const toggle = (t: TaskType) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  // Month labels above the columns.
  const monthLabels = columns.map((col, i) => {
    const first = parseISODate(col[0]);
    const prev = i > 0 ? parseISODate(columns[i - 1][0]) : null;
    return !prev || prev.getMonth() !== first.getMonth() ? MONTH_ABBR[first.getMonth()] : '';
  });

  const totalTasks = useMemo(
    () => columns.flat().reduce((sum, d) => sum + filteredCount(d).total, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, data, enabled],
  );

  return (
    <div className="panel flex h-full flex-col overflow-hidden rounded-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            Activity heatmap
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {totalTasks} scheduled task{totalTasks === 1 ? '' : 's'} over 53 weeks
          </p>
        </div>
        {/* Type filter toggles */}
        <div className="flex flex-wrap gap-1.5">
          {TASK_TYPES.map((t) => {
            const on = enabled.has(t);
            return (
              <button
                key={t}
                onClick={() => toggle(t)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-card border px-2 py-1 text-xs transition-colors ${
                  on ? 'border-line-strong bg-surface-2 text-ink' : 'border-line text-muted opacity-50'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ background: TYPE_COLOR[t] }}
                />
                {TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="inline-block min-w-full">
          {/* month labels */}
          <div className="mb-1 flex pl-8">
            {monthLabels.map((m, i) => (
              <div key={i} className="w-[15px] font-mono text-[9px] text-muted">
                {m}
              </div>
            ))}
          </div>
          <div className="flex">
            {/* weekday labels */}
            <div className="mr-1 flex w-7 flex-col justify-between py-[1px] font-mono text-[9px] text-muted">
              <span>Sat</span>
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            {/* grid */}
            <div className="flex gap-[3px]">
              {columns.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {col.map((date) => {
                    const { total } = filteredCount(date);
                    const future = date > toISODate(new Date());
                    return (
                      <div
                        key={date}
                        title={`${fmtLong(date)} · ${total} task${total === 1 ? '' : 's'}`}
                        className={`h-3 w-3 rounded-[2px] border border-black/20 ${
                          future ? 'opacity-30' : ''
                        }`}
                        style={cellStyle(date)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* intensity legend */}
          <div className="mt-3 flex items-center gap-2 pl-8 font-mono text-[10px] text-muted">
            <span>less</span>
            {[0.25, 0.45, 0.65, 0.85, 1].map((a) => (
              <span
                key={a}
                className="h-3 w-3 rounded-[2px] border border-black/20"
                style={{ background: `#8B93A7${Math.round(a * 255).toString(16).padStart(2, '0')}` }}
              />
            ))}
            <span>more</span>
          </div>
        </div>
      </div>
    </div>
  );
}
