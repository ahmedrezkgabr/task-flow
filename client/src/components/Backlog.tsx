import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Task } from '../types.ts';
import { TYPE_COLOR, TYPE_LABEL } from '../lib/theme.ts';
import { StatusCheckbox, nextStatus } from './StatusCheckbox.tsx';
import { useTasks } from '../store.tsx';

function BacklogItem({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const { update } = useTasks();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task, kind: 'task' },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.35 : 1, borderLeft: `3px solid ${TYPE_COLOR[task.type]}` }}
      className="group flex cursor-grab touch-none items-start gap-2 rounded-[3px] border border-line bg-surface-2 px-2 py-1.5 active:cursor-grabbing hover:border-line-strong"
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(task.id);
      }}
    >
      <div className="pt-[2px]">
        <StatusCheckbox
          size="sm"
          status={task.status}
          onToggle={() => update(task.id, { status: nextStatus(task.status) })}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm leading-tight text-ink ${
            task.status === 'done' ? 'text-muted line-through' : ''
          }`}
        >
          {task.title}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
          {TYPE_LABEL[task.type]}
        </p>
      </div>
    </div>
  );
}

interface Props {
  tasks: Task[];
  onOpen: (id: string) => void;
  onNew: () => void;
}

export function Backlog({ tasks, onOpen, onNew }: Props) {
  // Only top-level unscheduled tasks appear in the backlog.
  const items = tasks.filter((t) => t.scheduledDate === null && t.parentId === null);
  const { setNodeRef, isOver } = useDroppable({ id: 'backlog', data: { kind: 'backlog' } });

  return (
    <aside className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Backlog · {items.length}
        </h2>
        <button className="btn-ghost px-1.5 py-0.5 text-xs" onClick={onNew} title="New task">
          + New
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-1.5 overflow-y-auto rounded-card border border-dashed p-2 transition-colors ${
          isOver ? 'border-work bg-work/10' : 'border-line'
        }`}
      >
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted">
            Drag scheduled tasks here to unschedule, or add a new one.
          </p>
        ) : (
          items.map((t) => <BacklogItem key={t.id} task={t} onOpen={onOpen} />)
        )}
      </div>
    </aside>
  );
}
