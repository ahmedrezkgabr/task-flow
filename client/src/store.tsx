import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './lib/api.ts';
import type { NewTask, Task } from './types.ts';

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  byId: Map<string, Task>;
  childrenOf: (parentId: string) => Task[];
  refresh: () => Promise<void>;
  create: (task: NewTask) => Promise<Task | null>;
  update: (id: string, patch: Partial<Task>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const all = await api.listAll();
      setTasks(all);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (task: NewTask): Promise<Task | null> => {
    try {
      const created = await api.create(task);
      setTasks((prev) => [...prev, created]);
      return created;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create task');
      return null;
    }
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Task>) => {
    // Optimistic update; reconcile with the server response.
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      const updated = await api.update(id, patch);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update task');
      void refresh(); // roll back to server truth
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const prevTasks = tasks;
    // Optimistically drop the task and any of its subtasks.
    setTasks((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
    try {
      await api.remove(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete task');
      setTasks(prevTasks);
    }
  }, [tasks]);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const childrenOf = useCallback(
    (parentId: string) =>
      tasks
        .filter((t) => t.parentId === parentId)
        .sort((a, b) => a.position - b.position),
    [tasks],
  );

  const value: TasksContextValue = {
    tasks,
    loading,
    error,
    byId,
    childrenOf,
    refresh,
    create,
    update,
    remove,
  };

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
