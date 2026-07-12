import { useEffect, useState } from 'react';
import { TASK_TYPES, type NewTask, type Task, type TaskType } from '../types.ts';
import { TYPE_COLOR, TYPE_LABEL } from '../lib/theme.ts';
import { useTasks } from '../store.tsx';
import { fmtHour } from '../lib/dates.ts';

interface Props {
  // Existing task to edit, or a set of defaults for a new task.
  task?: Task;
  defaults?: Partial<NewTask>;
  onClose: () => void;
}

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

export function TaskEditor({ task, defaults, onClose }: Props) {
  const { create, update, remove, byId } = useTasks();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? defaults?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [type, setType] = useState<TaskType>(task?.type ?? defaults?.type ?? 'work');
  const [scheduledDate, setScheduledDate] = useState<string>(
    task?.scheduledDate ?? defaults?.scheduledDate ?? '',
  );
  const [scheduledHour, setScheduledHour] = useState<number | null>(
    task?.scheduledHour ?? defaults?.scheduledHour ?? null,
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    task?.durationMinutes ?? defaults?.durationMinutes ?? 60,
  );

  const parent = task?.parentId ? byId.get(task.parentId) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    if (!title.trim()) return;
    const payload: Partial<Task> = {
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      type,
      scheduledDate: scheduledDate || null,
      scheduledHour: scheduledDate ? scheduledHour : null,
      durationMinutes,
    };
    if (isEdit) {
      await update(task!.id, payload);
    } else {
      await create({ ...(defaults ?? {}), ...payload, title: title.trim() });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[8vh]"
      onMouseDown={onClose}
    >
      <div
        className="panel w-full max-w-lg rounded-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-widest text-muted">
              {isEdit ? 'Edit task' : 'New task'}
            </h2>
            {parent && (
              <p className="mt-0.5 text-xs text-muted">
                subtask of <span className="text-ink">{parent.title}</span>
              </p>
            )}
          </div>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="space-y-4 p-4">
          <div>
            <label className="label" htmlFor="te-title">
              Title
            </label>
            <input
              id="te-title"
              className="input"
              value={title}
              autoFocus
              placeholder="What needs doing?"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
              }}
            />
          </div>

          <div>
            <label className="label">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {TASK_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center gap-1.5 rounded-card border px-2.5 py-1 text-xs transition-colors ${
                    type === t
                      ? 'border-line-strong bg-surface-2 text-ink'
                      : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-[2px]"
                    style={{ background: TYPE_COLOR[t] }}
                  />
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="te-date">
                Date
              </label>
              <input
                id="te-date"
                type="date"
                className="input"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted">Empty = backlog</p>
            </div>
            <div>
              <label className="label" htmlFor="te-hour">
                Hour
              </label>
              <select
                id="te-hour"
                className="input disabled:opacity-40"
                disabled={!scheduledDate}
                value={scheduledHour ?? ''}
                onChange={(e) =>
                  setScheduledHour(e.target.value === '' ? null : Number(e.target.value))
                }
              >
                <option value="">— unset —</option>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {fmtHour(h)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="te-dur">
              Duration
            </label>
            <select
              id="te-dur"
              className="input"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d < 60 ? `${d} min` : `${d / 60} hr${d >= 120 ? 's' : ''}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="te-notes">
              Notes
            </label>
            <textarea
              id="te-notes"
              className="input min-h-[72px] resize-y"
              value={notes}
              placeholder="Optional details…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-line px-4 py-3">
          {isEdit ? (
            <button
              className="btn-ghost text-errand hover:text-errand"
              onClick={async () => {
                await remove(task!.id);
                onClose();
              }}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-active border-work bg-work/20 text-ink"
              onClick={submit}
              disabled={!title.trim()}
            >
              {isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
