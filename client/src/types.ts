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

export const TASK_REPEATS = ['none', 'daily', 'weekly', 'monthly'] as const;
export type TaskRepeat = (typeof TASK_REPEATS)[number];

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  type: TaskType;
  status: TaskStatus;
  scheduledDate: string | null;
  scheduledHour: number | null;
  scheduledMinute: number | null;
  durationMinutes: number;
  repeat: TaskRepeat;
  parentId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type NewTask = Partial<Task> & { title: string };

/** Per-day heatmap aggregate returned by /api/tasks/meta/heatmap. */
export type HeatmapData = Record<
  string,
  { total: number; byType: Partial<Record<TaskType, number>> }
>;
