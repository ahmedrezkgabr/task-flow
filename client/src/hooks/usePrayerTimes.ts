import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LOCATION,
  loadMonth,
  readCachedLocation,
  toPrayers,
  writeCachedLocation,
  type MonthData,
  type Prayer,
  type PrayerLocation,
} from '../lib/prayer.ts';

/**
 * Resolve the location for prayer-time lookups. Starts from a cached fix (or the
 * Cairo default) so lines appear instantly, then asks the browser for geolocation
 * once — caching the result for next time. Denied/unavailable → keep the default.
 */
function usePrayerLocation(): PrayerLocation {
  const [loc, setLoc] = useState<PrayerLocation>(() => readCachedLocation() ?? DEFAULT_LOCATION);

  useEffect(() => {
    if (readCachedLocation()) return; // already have a real fix
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: PrayerLocation = {
          lat: Math.round(pos.coords.latitude * 1000) / 1000,
          lng: Math.round(pos.coords.longitude * 1000) / 1000,
          label: 'Current location',
        };
        writeCachedLocation(next);
        setLoc(next);
      },
      () => {
        /* denied / unavailable — keep the default location */
      },
      { timeout: 8000, maximumAge: 24 * 60 * 60 * 1000 },
    );
  }, []);

  return loc;
}

/**
 * Prayer times for the given visible dates, keyed by ISO date. Loads (and caches)
 * each needed month cache-first, so repeat views and offline use hit no network.
 */
export function usePrayerTimes(dates: string[]): {
  location: PrayerLocation;
  byDate: Map<string, Prayer[]>;
} {
  const location = usePrayerLocation();

  // Distinct "YYYY-MM" months covering the visible dates.
  const months = useMemo(() => {
    const set = new Set(dates.map((d) => d.slice(0, 7)));
    return [...set].sort();
  }, [dates]);

  // Loaded month data keyed by "lat,lng|YYYY-MM" so a location change reloads.
  const [store, setStore] = useState<Record<string, MonthData>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const ym of months) {
        const storeKey = `${location.lat},${location.lng}|${ym}`;
        if (store[storeKey]) continue;
        const [y, m] = ym.split('-').map(Number);
        const data = await loadMonth(y, m, location);
        if (!alive) return;
        if (data) setStore((prev) => ({ ...prev, [storeKey]: data }));
      }
    })();
    return () => {
      alive = false;
    };
    // store is intentionally omitted: we guard with the storeKey check inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, location]);

  const byDate = useMemo(() => {
    const map = new Map<string, Prayer[]>();
    for (const d of dates) {
      const storeKey = `${location.lat},${location.lng}|${d.slice(0, 7)}`;
      const md = store[storeKey];
      const day = md?.days[d];
      if (day) map.set(d, toPrayers(day));
    }
    return map;
  }, [dates, store, location]);

  return { location, byDate };
}
