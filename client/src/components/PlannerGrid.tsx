import { useDroppable } from '@dnd-kit/core';
import { HOUR_PX, HOURS, layoutDay, slotId } from '../lib/grid.ts';
import type { Task } from '../types.ts';
import { fmtHour, fmtWeekday, fmtDayNum, today } from '../lib/dates.ts';
import { TaskBlock } from './TaskBlock.tsx';

function HourSlot({ date, hour }: { date: string; hour: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: slotId(date, hour),
    data: { kind: 'slot', date, hour },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ height: HOUR_PX }}
      className={`border-b border-line/70 transition-colors ${
        isOver ? 'bg-work/15' : ''
      } ${hour % 6 === 0 ? 'border-b-line-strong/50' : ''}`}
    />
  );
}

/** Red rule marking the current time, only within today's column. */
function NowLine({ date }: { date: string }) {
  if (date !== today()) return null;
  const now = new Date();
  const top = ((now.getHours() * 60 + now.getMinutes()) * HOUR_PX) / 60;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top }}>
      <div className="relative border-t border-errand">
        <span className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full bg-errand" />
      </div>
    </div>
  );
}

interface ColumnProps {
  date: string;
  tasks: Task[];
  onOpen: (id: string) => void;
  compact?: boolean;
}

function DayColumn({ date, tasks, onOpen, compact }: ColumnProps) {
  const placed = layoutDay(tasks);
  return (
    <div className="relative flex-1" style={{ minWidth: compact ? 96 : 0 }}>
      {/* droppable hour slots (background layer) */}
      <div>
        {HOURS.map((h) => (
          <HourSlot key={h} date={date} hour={h} />
        ))}
      </div>
      {/* task blocks (foreground layer) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto relative h-full">
          {placed.map((p) => (
            <TaskBlock key={p.task.id} placed={p} onOpen={onOpen} compact={compact} />
          ))}
        </div>
      </div>
      <NowLine date={date} />
    </div>
  );
}

interface Props {
  dates: string[];
  tasksByDate: Map<string, Task[]>;
  onOpen: (id: string) => void;
}

export function PlannerGrid({ dates, tasksByDate, onOpen }: Props) {
  const compact = dates.length > 1;
  return (
    <div className="panel flex h-full flex-col overflow-hidden rounded-card">
      {/* Column headers */}
      <div className="flex border-b border-line-strong bg-surface">
        <div className="w-14 shrink-0 border-r border-line" />
        {dates.map((d) => {
          const isToday = d === today();
          return (
            <div
              key={d}
              className={`flex-1 border-r border-line px-2 py-2 text-center last:border-r-0 ${
                isToday ? 'bg-work/10' : ''
              }`}
              style={{ minWidth: compact ? 96 : 0 }}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {fmtWeekday(d)}
              </div>
              <div
                className={`font-mono text-sm ${isToday ? 'text-work' : 'text-ink'}`}
              >
                {String(fmtDayNum(d)).padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid body */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* Hour ruler */}
          <div className="w-14 shrink-0 border-r border-line">
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_PX }}
                className="relative border-b border-line/40"
              >
                <span className="absolute -top-[7px] right-1.5 font-mono text-[10px] text-muted">
                  {fmtHour(h)}
                </span>
                {/* ruler tick */}
                <span className="absolute right-0 top-0 h-px w-2 bg-line-strong" />
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex flex-1">
            {dates.map((d) => (
              <div key={d} className="flex-1 border-r border-line last:border-r-0" style={{ minWidth: compact ? 96 : 0 }}>
                <DayColumn
                  date={d}
                  tasks={tasksByDate.get(d) ?? []}
                  onOpen={onOpen}
                  compact={compact}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
