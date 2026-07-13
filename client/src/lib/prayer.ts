// Islamic prayer times via the free, key-less, CORS-enabled Aladhan API.
// https://aladhan.com/prayer-times-api
//
// Design notes:
// - We fetch a whole MONTH per request (the /calendar endpoint) and cache the
//   parsed result in localStorage. Prayer times for a given date/location are
//   deterministic, so once a month is cached it never needs refetching — that
//   is what makes the feature work offline.
// - Times come back in the *location's* timezone (e.g. Cairo/EEST) as "HH:MM".
//   The planner grid renders in the device's local time, so the lines are
//   accurate when the device timezone matches the prayer location (the Egypt
//   case this app targets). See README for the caveat.

export const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = (typeof PRAYERS)[number];

// Short labels for narrow (week) columns.
export const PRAYER_SHORT: Record<PrayerName, string> = {
  Fajr: 'Fajr',
  Dhuhr: 'Dhuhr',
  Asr: 'Asr',
  Maghrib: "Magh",
  Isha: 'Isha',
};

// Aladhan calculation method. 5 = Egyptian General Authority of Survey — the
// correct method for Egypt, which is this app's default region.
export const PRAYER_METHOD = 5;

// Fallback location (Cairo) used until/unless geolocation resolves.
export const DEFAULT_LOCATION: PrayerLocation = {
  lat: 30.0444,
  lng: 31.2357,
  label: 'Cairo, Egypt',
};

export interface PrayerLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface Prayer {
  name: PrayerName;
  short: string;
  hour: number;
  minute: number;
  minutes: number; // minutes since midnight, for grid placement
  time: string; // "HH:MM"
}

/** Parsed month: prayer "HH:MM" strings keyed by ISO date then prayer name. */
export interface MonthData {
  fetchedAt: string;
  days: Record<string, Partial<Record<PrayerName, string>>>;
}

const CACHE_PREFIX = 'taskflow.prayer.v1';
const LOCATION_KEY = 'taskflow.prayer.location';

const round = (n: number) => Math.round(n * 1000) / 1000;

function cacheKey(loc: PrayerLocation, year: number, month: number): string {
  return `${CACHE_PREFIX}.${PRAYER_METHOD}.${round(loc.lat)},${round(loc.lng)}.${year}-${String(
    month,
  ).padStart(2, '0')}`;
}

// --- localStorage helpers (guarded; storage can be unavailable/full) --------
function readCache(key: string): MonthData | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as MonthData) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: MonthData): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* storage full or unavailable — feature still works for this session */
  }
}

export function readCachedLocation(): PrayerLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    return raw ? (JSON.parse(raw) as PrayerLocation) : null;
  } catch {
    return null;
  }
}

export function writeCachedLocation(loc: PrayerLocation): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
  } catch {
    /* ignore */
  }
}

// --- parsing ---------------------------------------------------------------
/** "04:12 (EEST)" -> "04:12"; returns null if unparseable. */
function normalizeTime(raw: string): string | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** "DD-MM-YYYY" -> "YYYY-MM-DD". */
function gregToISO(dmy: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dmy);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

interface AladhanDay {
  timings: Record<string, string>;
  date: { gregorian: { date: string } };
}

function parseCalendar(days: AladhanDay[]): MonthData {
  const out: MonthData = { fetchedAt: new Date().toISOString(), days: {} };
  for (const d of days) {
    const iso = gregToISO(d.date?.gregorian?.date ?? '');
    if (!iso) continue;
    const dayTimes: Partial<Record<PrayerName, string>> = {};
    for (const p of PRAYERS) {
      const t = normalizeTime(d.timings?.[p] ?? '');
      if (t) dayTimes[p] = t;
    }
    out.days[iso] = dayTimes;
  }
  return out;
}

/** Turn a cached day's "HH:MM" strings into ordered Prayer objects for drawing. */
export function toPrayers(day: Partial<Record<PrayerName, string>>): Prayer[] {
  const result: Prayer[] = [];
  for (const name of PRAYERS) {
    const time = day[name];
    if (!time) continue;
    const [h, m] = time.split(':').map(Number);
    result.push({ name, short: PRAYER_SHORT[name], hour: h, minute: m, minutes: h * 60 + m, time });
  }
  return result;
}

// --- month loading (cache-first, offline-tolerant) -------------------------
/**
 * Load one month of prayer times. Returns cache immediately when present
 * (offline-safe); otherwise fetches from Aladhan and caches the result. On a
 * network failure with no cache, returns null.
 */
export async function loadMonth(
  year: number,
  month: number,
  loc: PrayerLocation,
): Promise<MonthData | null> {
  const key = cacheKey(loc, year, month);
  const cached = readCache(key);
  if (cached) return cached;

  const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${loc.lat}&longitude=${loc.lng}&method=${PRAYER_METHOD}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { code: number; data: AladhanDay[] };
    if (!Array.isArray(json.data)) return null;
    const parsed = parseCalendar(json.data);
    writeCache(key, parsed);
    return parsed;
  } catch {
    return null; // offline and uncached — caller renders no lines for this month
  }
}
