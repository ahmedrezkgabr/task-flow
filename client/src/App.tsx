import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useTasks } from './store.tsx';
import type { NewTask, Task } from './types.ts';
import { parseSlotId } from './lib/grid.ts';
import {
  addDays,
  fmtLong,
  fmtMonthYear,
  parseISODate,
  toISODate,
  today,
  weekDays,
} from './lib/dates.ts';
import { TYPE_COLOR } from './lib/theme.ts';
import { PlannerGrid } from './components/PlannerGrid.tsx';
import { MonthView } from './components/MonthView.tsx';
import { Heatmap } from './components/Heatmap.tsx';
import { Backlog } from './components/Backlog.tsx';
import { TaskListPanel } from './components/TaskListPanel.tsx';
import { TaskEditor } from './components/TaskEditor.tsx';

type View = 'day' | 'week' | 'month' | 'heatmap';

const VIEWS: { id: View; label: string; key: string }[] = [
  { id: 'day', label: 'Day', key: 'D' },
  { id: 'week', label: 'Week', key: 'W' },
  { id: 'month', label: 'Month', key: 'M' },
  { id: 'heatmap', label: 'Heatmap', key: 'H' },
];

function addMonths(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setMonth(d.getMonth() + n);
  return toISODate(d);
}

interface EditorState {
  task?: Task;
  defaults?: Partial<NewTask>;
}

export function App() {
  const { tasks, loading, error, byId, update } = useTasks();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState<string>(today());
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Dates visible in the current planner view.
  const dates = useMemo(() => {
    if (view === 'day') return [anchor];
    if (view === 'week') return weekDays(anchor);
    return [];
  }, [view, anchor]);

  // Tasks scheduled within the current scope, grouped by date.
  const { scopeTasks, tasksByDate } = useMemo(() => {
    let from = '';
    let to = '';
    if (view === 'day') {
      from = to = anchor;
    } else if (view === 'week') {
      const w = weekDays(anchor);
      from = w[0];
      to = w[6];
    } else {
      // month
      const first = parseISODate(anchor);
      first.setDate(1);
      from = toISODate(first);
      const last = parseISODate(anchor);
      last.setMonth(last.getMonth() + 1, 0);
      to = toISODate(last);
    }
    const inScope = tasks.filter(
      (t) => t.scheduledDate !== null && t.scheduledDate >= from && t.scheduledDate <= to,
    );
    const map = new Map<string, Task[]>();
    for (const t of inScope) {
      if (!map.has(t.scheduledDate!)) map.set(t.scheduledDate!, []);
      map.get(t.scheduledDate!)!.push(t);
    }
    return { scopeTasks: inScope, tasksByDate: map };
  }, [tasks, view, anchor]);

  const activeTask = activeId ? byId.get(activeId) : undefined;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const task = active.data.current?.task as Task | undefined;
    if (!task) return;

    if (over.id === 'backlog') {
      if (task.scheduledDate !== null) {
        update(task.id, { scheduledDate: null, scheduledHour: null });
      }
      return;
    }
    const slot = parseSlotId(String(over.id));
    if (slot) {
      if (task.scheduledDate !== slot.date || task.scheduledHour !== slot.hour) {
        update(task.id, { scheduledDate: slot.date, scheduledHour: slot.hour });
      }
    }
  };

  const shift = (dir: -1 | 1) => {
    if (view === 'day') setAnchor((a) => addDays(a, dir));
    else if (view === 'week') setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => addMonths(a, dir));
  };

  const headerLabel = () => {
    if (view === 'day') return fmtLong(anchor);
    if (view === 'week') {
      const w = weekDays(anchor);
      return `${fmtLong(w[0])} — ${fmtLong(w[6])}`;
    }
    if (view === 'month') return fmtMonthYear(anchor);
    return 'Trailing 53 weeks';
  };

  const scopeLabel =
    view === 'day' ? 'Day tasks' : view === 'week' ? 'Week tasks' : 'Month tasks';

  const newTaskDefaults = (): Partial<NewTask> => {
    if (view === 'day') return { scheduledDate: anchor };
    return {};
  };

  const showSidebar = view !== 'heatmap';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-screen flex-col bg-base text-ink">
        {/* Top bar */}
        <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-[3px] bg-work/20 font-mono text-xs text-work">
              TF
            </div>
            <span className="font-mono text-sm tracking-wide text-ink">TaskFlow</span>
          </div>

          {/* View switcher */}
          <nav className="flex items-center gap-0.5 rounded-card border border-line bg-surface p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`rounded-[2px] px-3 py-1 text-sm transition-colors ${
                  view === v.id ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {v.label}
              </button>
            ))}
          </nav>

          {/* Date nav */}
          {view !== 'heatmap' && (
            <div className="flex items-center gap-1">
              <button className="btn-ghost px-2" onClick={() => shift(-1)} aria-label="Previous">
                ‹
              </button>
              <button className="btn-ghost px-2 text-xs" onClick={() => setAnchor(today())}>
                Today
              </button>
              <button className="btn-ghost px-2" onClick={() => shift(1)} aria-label="Next">
                ›
              </button>
            </div>
          )}

          <div className="font-mono text-sm text-muted">{headerLabel()}</div>

          <div className="ml-auto">
            <button
              className="btn btn-active border-work bg-work/20"
              onClick={() => setEditor({ defaults: newTaskDefaults() })}
            >
              + New task
            </button>
          </div>
        </header>

        {error && (
          <div className="shrink-0 border-b border-errand/40 bg-errand/10 px-4 py-1.5 text-xs text-errand">
            {error}
          </div>
        )}

        {/* Body */}
        <main className="flex min-h-0 flex-1 gap-3 p-3">
          <section className="min-w-0 flex-1">
            {loading ? (
              <div className="grid h-full place-items-center text-sm text-muted">Loading…</div>
            ) : view === 'heatmap' ? (
              <Heatmap anchor={anchor} />
            ) : view === 'month' ? (
              <MonthView anchor={anchor} tasks={tasks} onOpen={(id) => setEditor({ task: byId.get(id) })} />
            ) : (
              <PlannerGrid
                dates={dates}
                tasksByDate={tasksByDate}
                onOpen={(id) => setEditor({ task: byId.get(id) })}
              />
            )}
          </section>

          {showSidebar && (
            <aside className="flex w-64 shrink-0 flex-col gap-3 xl:w-72">
              <div className="min-h-0 flex-1">
                <TaskListPanel
                  scopeLabel={scopeLabel}
                  tasks={scopeTasks}
                  onOpen={(id) => setEditor({ task: byId.get(id) })}
                  onNewSubtask={(parentId) => {
                    const parent = byId.get(parentId);
                    setEditor({
                      defaults: {
                        parentId,
                        type: parent?.type,
                        scheduledDate: parent?.scheduledDate ?? undefined,
                      },
                    });
                  }}
                />
              </div>
              <div className="h-[45%] min-h-[180px]">
                <Backlog
                  tasks={tasks}
                  onOpen={(id) => setEditor({ task: byId.get(id) })}
                  onNew={() => setEditor({ defaults: {} })}
                />
              </div>
            </aside>
          )}
        </main>
      </div>

      {/* Drag preview */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div
            className="max-w-[220px] rounded-[3px] border border-line-strong bg-surface-2 px-2 py-1.5 text-xs text-ink shadow-xl"
            style={{ borderLeft: `3px solid ${TYPE_COLOR[activeTask.type]}` }}
          >
            {activeTask.title}
          </div>
        ) : null}
      </DragOverlay>

      {editor && (
        <TaskEditor task={editor.task} defaults={editor.defaults} onClose={() => setEditor(null)} />
      )}
    </DndContext>
  );
}
