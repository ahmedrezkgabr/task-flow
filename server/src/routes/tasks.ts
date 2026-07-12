import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db, rowToTask } from '../db.ts';
import { isTaskRepeat, isTaskStatus, isTaskType, type Task } from '../types.ts';

export const tasksRouter = Router();

function getTaskById(id: string): Task | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToTask(row) : null;
}

/**
 * GET /api/tasks
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD  -> tasks scheduled in a date range (inclusive)
 *   ?unscheduled=1                  -> backlog tasks with no scheduledDate
 *   (no params)                     -> all tasks
 */
tasksRouter.get('/', (req: Request, res: Response) => {
  const { from, to, unscheduled } = req.query;

  if (unscheduled === '1' || unscheduled === 'true') {
    const rows = db
      .prepare(
        'SELECT * FROM tasks WHERE scheduledDate IS NULL ORDER BY position ASC, createdAt ASC',
      )
      .all() as Record<string, unknown>[];
    return res.json(rows.map(rowToTask));
  }

  if (typeof from === 'string' && typeof to === 'string') {
    const rows = db
      .prepare(
        `SELECT * FROM tasks
         WHERE scheduledDate IS NOT NULL AND scheduledDate >= ? AND scheduledDate <= ?
         ORDER BY scheduledDate ASC, scheduledHour ASC, position ASC`,
      )
      .all(from, to) as Record<string, unknown>[];
    return res.json(rows.map(rowToTask));
  }

  const rows = db
    .prepare('SELECT * FROM tasks ORDER BY position ASC, createdAt ASC')
    .all() as Record<string, unknown>[];
  res.json(rows.map(rowToTask));
});

/**
 * GET /api/tasks/meta/heatmap?from=&to=
 * Aggregates top-level (parentId IS NULL) task counts per day, grouped by type.
 */
tasksRouter.get('/meta/heatmap', (req: Request, res: Response) => {
  const { from, to } = req.query;
  if (typeof from !== 'string' || typeof to !== 'string') {
    return res.status(400).json({ error: 'from and to query params are required' });
  }

  const rows = db
    .prepare(
      `SELECT scheduledDate AS date, type, COUNT(*) AS count
       FROM tasks
       WHERE parentId IS NULL
         AND scheduledDate IS NOT NULL
         AND scheduledDate >= ? AND scheduledDate <= ?
       GROUP BY scheduledDate, type
       ORDER BY scheduledDate ASC`,
    )
    .all(from, to) as { date: string; type: string; count: number }[];

  // Shape: { [date]: { total, byType: { work: n, ... } } }
  const result: Record<string, { total: number; byType: Record<string, number> }> = {};
  for (const r of rows) {
    if (!result[r.date]) result[r.date] = { total: 0, byType: {} };
    result[r.date].byType[r.type] = Number(r.count);
    result[r.date].total += Number(r.count);
  }
  res.json(result);
});

tasksRouter.get('/:id', (req: Request, res: Response) => {
  const task = getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

tasksRouter.post('/', (req: Request, res: Response) => {
  const b = req.body ?? {};

  if (typeof b.title !== 'string' || b.title.trim() === '') {
    return res.status(400).json({ error: 'title is required' });
  }
  const type = b.type ?? 'other';
  if (!isTaskType(type)) {
    return res.status(400).json({ error: `invalid type: ${b.type}` });
  }
  const status = b.status ?? 'pending';
  if (!isTaskStatus(status)) {
    return res.status(400).json({ error: `invalid status: ${b.status}` });
  }
  const repeat = b.repeat ?? 'none';
  if (!isTaskRepeat(repeat)) {
    return res.status(400).json({ error: `invalid repeat: ${b.repeat}` });
  }
  if (b.parentId != null && !getTaskById(b.parentId)) {
    return res.status(400).json({ error: 'parentId does not exist' });
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  // Default position: append to the end of the relevant bucket.
  let position = 0;
  if (typeof b.position === 'number') {
    position = b.position;
  } else {
    const max = db
      .prepare('SELECT COALESCE(MAX(position), -1) AS m FROM tasks')
      .get() as { m: number };
    position = Number(max.m) + 1;
  }

  db.prepare(
    `INSERT INTO tasks
       (id, title, notes, type, status, scheduledDate, scheduledHour, scheduledMinute, durationMinutes, repeat, parentId, position, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    b.title.trim(),
    b.notes ?? null,
    type,
    status,
    b.scheduledDate ?? null,
    b.scheduledHour ?? null,
    typeof b.scheduledMinute === 'number' ? b.scheduledMinute : null,
    typeof b.durationMinutes === 'number' ? b.durationMinutes : 60,
    repeat,
    b.parentId ?? null,
    position,
    now,
    now,
  );

  res.status(201).json(getTaskById(id));
});

// Fields a client is allowed to PATCH, with validation per field.
const UPDATABLE: Record<string, (v: unknown) => boolean> = {
  title: (v) => typeof v === 'string' && v.trim() !== '',
  notes: (v) => v === null || typeof v === 'string',
  type: (v) => isTaskType(v),
  status: (v) => isTaskStatus(v),
  scheduledDate: (v) => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)),
  scheduledHour: (v) => v === null || (typeof v === 'number' && v >= 0 && v <= 23),
  scheduledMinute: (v) => v === null || (typeof v === 'number' && v >= 0 && v <= 59),
  durationMinutes: (v) => typeof v === 'number' && v > 0,
  repeat: (v) => isTaskRepeat(v),
  parentId: (v) => v === null || typeof v === 'string',
  position: (v) => typeof v === 'number',
};

tasksRouter.patch('/:id', (req: Request, res: Response) => {
  const existing = getTaskById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const b = req.body ?? {};
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, validate] of Object.entries(UPDATABLE)) {
    if (!(key in b)) continue;
    let value = b[key];
    if (!validate(value)) {
      return res.status(400).json({ error: `invalid value for ${key}` });
    }
    // Clearing the date also clears the hour/minute (backlog items aren't on the grid).
    if (key === 'scheduledDate' && value === null) {
      sets.push('scheduledHour = ?', 'scheduledMinute = ?');
      values.push(null, null);
    }
    if (key === 'title' && typeof value === 'string') value = value.trim();
    sets.push(`${key} = ?`);
    values.push(value);
  }

  if (sets.length === 0) return res.json(existing);

  sets.push('updatedAt = ?');
  values.push(new Date().toISOString());
  values.push(req.params.id);

  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...(values as never[]));
  res.json(getTaskById(req.params.id));
});

// DELETE cascades to subtasks via the ON DELETE CASCADE foreign key.
tasksRouter.delete('/:id', (req: Request, res: Response) => {
  const existing = getTaskById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
