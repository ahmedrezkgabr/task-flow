import type { Task } from '../types.ts';
import { addDays, parseISODate } from './dates.ts';

/**
 * A concrete instance of a task on a given day. For non-repeating tasks this is
 * the task itself (`baseId === id`, `isRepeat === false`). For repeating tasks,
 * each occurrence gets a synthetic `id` (`<baseId>@<date>`) so it stays unique
 * for React keys and dnd-kit, while `baseId` points at the real row to mutate.
 */
export interface Occurrence extends Task {
  baseId: string;
  isRepeat: boolean;
}

function matchesOn(startISO: string, dISO: string, repeat: Task['repeat']): boolean {
  if (dISO < startISO) return false;
  if (repeat === 'daily') return true;
  const start = parseISODate(startISO);
  const d = parseISODate(dISO);
  if (repeat === 'weekly') return start.getDay() === d.getDay();
  if (repeat === 'monthly') return start.getDate() === d.getDate();
  return false;
}

/**
 * Expand scheduled tasks into concrete occurrences that fall within
 * [from, to] (inclusive). Repeating tasks recur from their scheduledDate
 * onward. Only top-level scheduling is expanded; subtasks are looked up by
 * `baseId` where needed.
 */
export function expandOccurrences(tasks: Task[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const t of tasks) {
    if (!t.scheduledDate) continue;

    if (t.repeat === 'none') {
      if (t.scheduledDate >= from && t.scheduledDate <= to) {
        out.push({ ...t, baseId: t.id, isRepeat: false });
      }
      continue;
    }

    // Repeating: walk each day in the visible window from the later of
    // (from, scheduledDate) through to.
    let cur = from < t.scheduledDate ? t.scheduledDate : from;
    while (cur <= to) {
      if (matchesOn(t.scheduledDate, cur, t.repeat)) {
        out.push({
          ...t,
          id: cur === t.scheduledDate ? t.id : `${t.id}@${cur}`,
          baseId: t.id,
          scheduledDate: cur,
          isRepeat: true,
        });
      }
      cur = addDays(cur, 1);
    }
  }
  return out;
}
