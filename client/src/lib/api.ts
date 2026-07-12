import type { HeatmapData, NewTask, Task } from '../types.ts';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listAll: () => req<Task[]>('/tasks'),
  listRange: (from: string, to: string) =>
    req<Task[]>(`/tasks?from=${from}&to=${to}`),
  listUnscheduled: () => req<Task[]>('/tasks?unscheduled=1'),
  get: (id: string) => req<Task>(`/tasks/${id}`),
  create: (task: NewTask) =>
    req<Task>('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  update: (id: string, patch: Partial<Task>) =>
    req<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => req<void>(`/tasks/${id}`, { method: 'DELETE' }),
  heatmap: (from: string, to: string) =>
    req<HeatmapData>(`/tasks/meta/heatmap?from=${from}&to=${to}`),
};
