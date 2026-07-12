import type { Task } from '../types.ts';
import type { Occurrence } from './occurrences.ts';

export const HOUR_PX = 52; // pixel height of one hour row on the planner
export const HOURS: number[] = Array.from({ length: 24 }, (_, i) => i);

export type SlotId = `slot::${string}::${number}`;
export const slotId = (date: string, hour: number): SlotId => `slot::${date}::${hour}`;

export function parseSlotId(id: string): { date: string; hour: number } | null {
  if (!id.startsWith('slot::')) return null;
  const [, date, hour] = id.split('::');
  return { date, hour: Number(hour) };
}

export interface PlacedTask {
  task: Occurrence;
  top: number;
  height: number;
  lane: number; // 0-based lane index
  lanes: number; // total lanes in this task's overlap cluster
}

/**
 * Greedy interval partitioning: lay out a day's scheduled tasks into side-by-side
 * lanes so overlapping blocks don't cover each other.
 */
export function layoutDay(tasks: Occurrence[]): PlacedTask[] {
  const scheduled = tasks
    .filter((t) => t.scheduledHour !== null)
    .sort((a, b) => (a.scheduledHour! - b.scheduledHour!) || a.position - b.position);

  const placed: PlacedTask[] = [];
  // Track cluster of currently-overlapping tasks to compute lane counts.
  let cluster: PlacedTask[] = [];
  let clusterEnd = -1;

  // Minute-of-day start/end, so a 09:30 task sits half a row down.
  const start = (t: Task) => t.scheduledHour! * 60 + (t.scheduledMinute ?? 0);
  const end = (t: Task) => start(t) + t.durationMinutes;

  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((p) => p.lane + 1));
    for (const p of cluster) p.lanes = lanes;
    cluster = [];
  };

  const laneEnds: number[] = []; // end time per active lane

  for (const t of scheduled) {
    if (start(t) >= clusterEnd) {
      flush();
      laneEnds.length = 0;
    }
    // Find a free lane (one whose last task already ended).
    let lane = laneEnds.findIndex((e) => e <= start(t));
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end(t));
    } else {
      laneEnds[lane] = end(t);
    }
    const p: PlacedTask = {
      task: t,
      top: (start(t) * HOUR_PX) / 60,
      height: Math.max(22, (t.durationMinutes * HOUR_PX) / 60),
      lane,
      lanes: 1,
    };
    cluster.push(p);
    placed.push(p);
    clusterEnd = Math.max(clusterEnd, end(t));
  }
  flush();
  return placed;
}
