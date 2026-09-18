import type { WeatherSnapshot } from './openMeteo';

export interface CachedWeather {
  fetchedAt: number;
  snapshot: WeatherSnapshot;
}

function cacheKey(latitude: number, longitude: number, units: string): string {
  return `homebase:weather:${latitude},${longitude},${units}`;
}

function isSnapshot(value: unknown): value is WeatherSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.temperature === 'number' &&
    typeof v.apparentTemperature === 'number' &&
    typeof v.weatherCode === 'number' &&
    typeof v.isDay === 'boolean' &&
    typeof v.tempMax === 'number' &&
    typeof v.tempMin === 'number'
  );
}

export function readWeatherCache(
  latitude: number,
  longitude: number,
  units: string,
): CachedWeather | null {
  try {
    const raw = localStorage.getItem(cacheKey(latitude, longitude, units));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { fetchedAt, snapshot } = parsed as Record<string, unknown>;
    if (typeof fetchedAt !== 'number' || !isSnapshot(snapshot)) return null;
    return { fetchedAt, snapshot };
  } catch {
    return null;
  }
}

export function writeWeatherCache(
  latitude: number,
  longitude: number,
  units: string,
  snapshot: WeatherSnapshot,
): void {
  try {
    const entry: CachedWeather = { fetchedAt: Date.now(), snapshot };
    localStorage.setItem(cacheKey(latitude, longitude, units), JSON.stringify(entry));
  } catch {
    // Best-effort: a full quota or disabled storage just means no cache next time.
  }
}
