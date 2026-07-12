// Date helpers working in local time on `YYYY-MM-DD` strings — no timezone drift.

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/**
 * Saturday as start of week (Egypt convention). Returns the Saturday ISO date
 * for the week containing `iso`.
 */
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso);
  const dow = (d.getDay() + 1) % 7; // 0 = Saturday
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

export function weekDays(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(iso: string): string {
  const d = parseISODate(iso);
  d.setDate(1);
  return toISODate(d);
}

export function endOfMonth(iso: string): string {
  const d = parseISODate(iso);
  d.setMonth(d.getMonth() + 1, 0);
  return toISODate(d);
}

/** Full weeks (Mon-Sun) covering the month grid that contains `iso`. */
export function monthGridDays(iso: string): string[] {
  const first = startOfMonth(iso);
  const gridStart = startOfWeek(first);
  const last = endOfMonth(iso);
  const days: string[] = [];
  let cur = gridStart;
  // 6 weeks max covers any month layout.
  for (let i = 0; i < 42; i++) {
    days.push(cur);
    cur = addDays(cur, 1);
    // Stop once we're past the month and back at a week boundary (Saturday).
    if (cur > last && parseISODate(cur).getDay() === 6) break;
  }
  return days;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function fmtWeekday(iso: string): string {
  return WEEKDAY[parseISODate(iso).getDay()];
}

export function fmtDayNum(iso: string): number {
  return parseISODate(iso).getDate();
}

export function fmtMonthYear(iso: string): string {
  const d = parseISODate(iso);
  return `${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtLong(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}`;
}

export function fmtHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

/** HH:MM label from an hour and optional minute (null → :00). */
export function fmtHM(h: number, m: number | null): string {
  return `${String(h).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;
}

/** Add minutes to an hour:minute and return { hour, minute } clamped to the day. */
export function addMinutes(h: number, m: number | null, add: number): { hour: number; minute: number } {
  const total = Math.min(24 * 60, h * 60 + (m ?? 0) + add);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export function isSameMonth(iso: string, refIso: string): boolean {
  const a = parseISODate(iso);
  const b = parseISODate(refIso);
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
