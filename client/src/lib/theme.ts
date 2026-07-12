import type { TaskType } from '../types.ts';

/** Hex accent per category — mirrors the server enum and Tailwind config. */
export const TYPE_COLOR: Record<TaskType, string> = {
  work: '#4C6EF5',
  personal: '#F5A623',
  health: '#2FB380',
  learning: '#B15CDE',
  errand: '#E5484D',
  other: '#8B93A7',
};

export const TYPE_LABEL: Record<TaskType, string> = {
  work: 'Work',
  personal: 'Personal',
  health: 'Health',
  learning: 'Learning',
  errand: 'Errand',
  other: 'Other',
};

/** Translucent fill for a task card body, derived from the accent. */
export function typeFill(type: TaskType): string {
  return `${TYPE_COLOR[type]}22`;
}
