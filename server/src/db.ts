import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import type { Task, TaskType } from './types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, 'taskflow.db');
export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    notes           TEXT,
    type            TEXT NOT NULL DEFAULT 'other',
    status          TEXT NOT NULL DEFAULT 'pending',
    scheduledDate   TEXT,
    scheduledHour   INTEGER,
    durationMinutes INTEGER NOT NULL DEFAULT 60,
    parentId        TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    position        INTEGER NOT NULL DEFAULT 0,
    createdAt       TEXT NOT NULL,
    updatedAt       TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_scheduledDate ON tasks(scheduledDate);
  CREATE INDEX IF NOT EXISTS idx_tasks_parentId ON tasks(parentId);
`);

/**
 * Rows come back from node:sqlite with SQLite's loose typing. Normalize into a
 * strongly-typed Task so the rest of the app never deals with `null` vs numbers.
 */
export function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    notes: (row.notes as string | null) ?? null,
    type: row.type as TaskType,
    status: row.status as Task['status'],
    scheduledDate: (row.scheduledDate as string | null) ?? null,
    scheduledHour:
      row.scheduledHour === null || row.scheduledHour === undefined
        ? null
        : Number(row.scheduledHour),
    durationMinutes: Number(row.durationMinutes),
    parentId: (row.parentId as string | null) ?? null,
    position: Number(row.position),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM tasks').get() as { n: number };
  if (count.n > 0) return;

  const now = new Date();
  const iso = () => new Date().toISOString();

  // Build YYYY-MM-DD strings relative to today, in local time.
  const dayOffset = (offset: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  };

  const insert = db.prepare(`
    INSERT INTO tasks
      (id, title, notes, type, status, scheduledDate, scheduledHour, durationMinutes, parentId, position, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  type Seed = Partial<Task> & { title: string; type: TaskType };
  const make = (s: Seed, position: number): string => {
    const id = randomUUID();
    insert.run(
      id,
      s.title,
      s.notes ?? null,
      s.type,
      s.status ?? 'pending',
      s.scheduledDate ?? null,
      s.scheduledHour ?? null,
      s.durationMinutes ?? 60,
      s.parentId ?? null,
      position,
      iso(),
      iso(),
    );
    return id;
  };

  let pos = 0;

  // --- Scheduled this week ---
  const standup = make(
    {
      title: 'Team standup',
      type: 'work',
      notes: 'Daily sync — blockers & priorities',
      scheduledDate: dayOffset(0),
      scheduledHour: 9,
      durationMinutes: 30,
      status: 'done',
    },
    pos++,
  );

  const designReview = make(
    {
      title: 'Design review: planner grid',
      type: 'work',
      scheduledDate: dayOffset(0),
      scheduledHour: 11,
      durationMinutes: 90,
      status: 'in_progress',
    },
    pos++,
  );
  make(
    {
      title: 'Draft ruler tick spec',
      type: 'work',
      parentId: designReview,
      status: 'done',
    },
    pos++,
  );
  make(
    {
      title: 'Collect accent-color feedback',
      type: 'work',
      parentId: designReview,
    },
    pos++,
  );

  make(
    {
      title: 'Gym — lower body',
      type: 'health',
      scheduledDate: dayOffset(0),
      scheduledHour: 18,
      durationMinutes: 60,
    },
    pos++,
  );

  make(
    {
      title: 'Read: SQLite internals',
      type: 'learning',
      scheduledDate: dayOffset(1),
      scheduledHour: 8,
      durationMinutes: 60,
    },
    pos++,
  );

  const groceries = make(
    {
      title: 'Weekly groceries',
      type: 'errand',
      scheduledDate: dayOffset(1),
      scheduledHour: 17,
      durationMinutes: 45,
    },
    pos++,
  );
  make({ title: 'Coffee beans', type: 'errand', parentId: groceries }, pos++);
  make({ title: 'Oats & fruit', type: 'errand', parentId: groceries }, pos++);

  make(
    {
      title: 'Call plumber',
      type: 'personal',
      scheduledDate: dayOffset(2),
      scheduledHour: 10,
      durationMinutes: 30,
    },
    pos++,
  );

  make(
    {
      title: 'Deep work: API layer',
      type: 'work',
      notes: 'No meetings block',
      scheduledDate: dayOffset(3),
      scheduledHour: 14,
      durationMinutes: 120,
    },
    pos++,
  );

  make(
    {
      title: 'Meal prep',
      type: 'health',
      scheduledDate: dayOffset(4),
      scheduledHour: 12,
      durationMinutes: 90,
    },
    pos++,
  );

  make(
    {
      title: 'Morning run',
      type: 'health',
      scheduledDate: dayOffset(-1),
      scheduledHour: 7,
      durationMinutes: 45,
      status: 'done',
    },
    pos++,
  );

  // --- Backlog (unscheduled) ---
  make({ title: 'Plan Q3 learning roadmap', type: 'learning' }, pos++);
  make({ title: 'Renew passport', type: 'errand', notes: 'Photos + form DS-11' }, pos++);
  const refactor = make(
    { title: 'Refactor drag-and-drop hook', type: 'work' },
    pos++,
  );
  make({ title: 'Extract slot math helper', type: 'work', parentId: refactor }, pos++);
  make({ title: 'Add keyboard reordering', type: 'work', parentId: refactor }, pos++);
  make({ title: 'Book dentist appointment', type: 'personal' }, pos++);
  make({ title: 'Try new pasta recipe', type: 'personal' }, pos++);

  void standup;
  console.log('[db] seeded example tasks');
}

seedIfEmpty();
