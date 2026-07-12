export const TASK_TYPES = [
  'work',
  'personal',
  'health',
  'learning',
  'errand',
  'other',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  type: TaskType;
  status: TaskStatus;
  scheduledDate: string | null; // YYYY-MM-DD
  scheduledHour: number | null; // 0-23
  durationMinutes: number;
  parentId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export function isTaskType(v: unknown): v is TaskType {
  return typeof v === 'string' && (TASK_TYPES as readonly string[]).includes(v);
}

export function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === 'string' && (TASK_STATUSES as readonly string[]).includes(v);
}
