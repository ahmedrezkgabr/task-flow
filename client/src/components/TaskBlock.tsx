import { useDraggable } from '@dnd-kit/core';
import type { PlacedTask } from '../lib/grid.ts';
import { TYPE_COLOR } from '../lib/theme.ts';
import { fmtHour } from '../lib/dates.ts';
import { StatusCheckbox, nextStatus } from './StatusCheckbox.tsx';
import { useTasks } from '../store.tsx';

interface Props {
  placed: PlacedTask;
  onOpen: (id: string) => void;
  compact?: boolean; // week view = tighter
}

export function TaskBlock({ placed, onOpen, compact }: Props) {
  const { task, top, height, lane, lanes } = placed;
  const { update } = useTasks();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task, kind: 'task' },
  });

  const gap = 3;
  const widthPct = 100 / lanes;
  const accent = TYPE_COLOR[task.type];
  const endHour = task.scheduledHour! + task.durationMinutes / 60;

  return (
    <div
      ref={setNodeRef}
      className="absolute"
      style={{
        top,
        height,
        left: `calc(${lane * widthPct}% + ${lane === 0 ? 2 : gap}px)`,
        width: `calc(${widthPct}% - ${lanes > 1 ? gap + 2 : 4}px)`,
        opacity: isDragging ? 0.35 : 1,
        zIndex: isDragging ? 40 : 10,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={() => onOpen(task.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen(task.id);
        }}
        className={`group flex h-full cursor-grab touch-none flex-col overflow-hidden rounded-[3px] border border-line-strong/60 bg-surface-2 pl-2 pr-1.5 text-left shadow-sm active:cursor-grabbing ${
          task.status === 'done' ? 'opacity-60' : ''
        }`}
        style={{
          borderLeft: `3px solid ${accent}`,
          background: `linear-gradient(90deg, ${accent}1f, ${accent}0d 40%, #1D212A 60%)`,
        }}
      >
        <div className="flex items-start gap-1.5 py-1">
          <div className="pt-[1px]">
            <StatusCheckbox
              size="sm"
              status={task.status}
              onToggle={() => update(task.id, { status: nextStatus(task.status) })}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-xs font-medium leading-tight text-ink ${
                task.status === 'done' ? 'line-through' : ''
              }`}
            >
              {task.title}
            </p>
            {!compact && height > 34 && (
              <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
                {fmtHour(task.scheduledHour!)}–{fmtHour(Math.min(24, Math.round(endHour)))}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
