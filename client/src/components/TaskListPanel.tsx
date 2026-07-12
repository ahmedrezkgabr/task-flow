import { useState } from 'react';
import type { Task } from '../types.ts';
import type { Occurrence } from '../lib/occurrences.ts';
import { TYPE_COLOR } from '../lib/theme.ts';
import { StatusCheckbox, nextStatus } from './StatusCheckbox.tsx';
import { RepeatBadge } from './RepeatBadge.tsx';
import { useTasks } from '../store.tsx';
import { fmtHM } from '../lib/dates.ts';

interface Props {
  scopeLabel: string;
  // Top-level occurrences in the current scope (already filtered by the parent view).
  tasks: Occurrence[];
  onOpen: (id: string) => void;
  onNewSubtask: (parentId: string) => void;
}

function Row({
  task,
  depth,
  onOpen,
  onNewSubtask,
}: {
  task: Task;
  depth: 0 | 1;
  onOpen: (id: string) => void;
  onNewSubtask: (parentId: string) => void;
}) {
  const { update, childrenOf } = useTasks();
  // Occurrences carry the real row id in baseId; subtasks use their own id.
  const rowId = (task as Occurrence).baseId ?? task.id;
  const kids = depth === 0 ? childrenOf(rowId) : [];
  const [open, setOpen] = useState(true);

  return (
    <>
      <div
        className={`group flex items-center gap-2 rounded-[3px] px-2 py-1.5 hover:bg-surface-2 ${
          depth === 1 ? 'ml-5' : ''
        }`}
      >
        {depth === 0 ? (
          kids.length > 0 ? (
            <button
              onClick={() => setOpen((o) => !o)}
              className="grid h-4 w-4 place-items-center text-muted hover:text-ink"
              aria-label={open ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              <svg
                viewBox="0 0 10 10"
                className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-90' : ''}`}
                fill="currentColor"
              >
                <path d="M3 1.5 7 5 3 8.5z" />
              </svg>
            </button>
          ) : (
            <span className="h-4 w-4 shrink-0" />
          )
        ) : (
          <span className="ml-1 h-4 w-4 shrink-0 border-l border-line" />
        )}

        <StatusCheckbox
          size="sm"
          status={task.status}
          onToggle={() => update(rowId, { status: nextStatus(task.status) })}
        />

        <span
          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
          style={{ background: TYPE_COLOR[task.type] }}
        />

        <button
          onClick={() => onOpen(rowId)}
          className={`min-w-0 flex-1 truncate text-left text-sm ${
            task.status === 'done' ? 'text-muted line-through' : 'text-ink'
          }`}
        >
          {task.title}
        </button>

        {task.repeat !== 'none' && <RepeatBadge repeat={task.repeat} />}

        {task.scheduledHour !== null && (
          <span className="shrink-0 font-mono text-[10px] text-muted">
            {fmtHM(task.scheduledHour, task.scheduledMinute)}
          </span>
        )}

        {depth === 0 && (
          <button
            onClick={() => onNewSubtask(rowId)}
            className="shrink-0 text-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
            title="Add subtask"
            aria-label="Add subtask"
          >
            +
          </button>
        )}
      </div>

      {depth === 0 &&
        open &&
        kids.map((k) => (
          <Row key={k.id} task={k} depth={1} onOpen={onOpen} onNewSubtask={onNewSubtask} />
        ))}
    </>
  );
}

export function TaskListPanel({ scopeLabel, tasks, onOpen, onNewSubtask }: Props) {
  const top = tasks.filter((t) => t.parentId === null);
  const doneCount = top.filter((t) => t.status === 'done').length;

  return (
    <div className="panel flex h-full flex-col overflow-hidden rounded-card">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {scopeLabel}
        </h2>
        <span className="font-mono text-[11px] text-muted">
          {doneCount}/{top.length}
        </span>
      </header>
      <div className="flex-1 overflow-y-auto p-1.5">
        {top.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted">No tasks in this scope.</p>
        ) : (
          top
            .sort((a, b) => (a.scheduledHour ?? 99) - (b.scheduledHour ?? 99) || a.position - b.position)
            .map((t) => (
              <Row key={t.id} task={t} depth={0} onOpen={onOpen} onNewSubtask={onNewSubtask} />
            ))
        )}
      </div>
    </div>
  );
}
