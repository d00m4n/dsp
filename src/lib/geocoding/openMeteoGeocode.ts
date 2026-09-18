/**
 * City search against Open-Meteo's geocoding API. Mirrors the shape of
 * `src/lib/weather/openMeteo.ts`: a pure URL builder, a defensive response
 * parser that never trusts the shape, and a thin fetch wrapper accepting an
 * `AbortSignal`. Unlike weather, results are used once and discarded — no
 * caching module here.
 */
export interface GeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export function buildGeocodeUrl(query: string): string {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'ca',
  });
  return `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Never trusts the response shape: any missing or malformed field is
 * treated as an unusable entry rather than crashing the search dropdown.
 */
export function parseGeocodeResponse(json: unknown): GeocodeResult[] {
  if (typeof json !== 'object' || json === null) return [];
  const root = json as Record<string, unknown>;

  const results = root.results;
  if (!Array.isArray(results)) return [];

  const parsed: GeocodeResult[] = [];
  for (const entry of results) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;

    const id = e.id;
    const name = e.name;
    const latitude = e.latitude;
    const longitude = e.longitude;
    if (!isFiniteNumber(id)) continue;
    if (!isNonEmptyString(name)) continue;
    if (!isFiniteNumber(latitude)) continue;
    if (!isFiniteNumber(longitude)) continue;

    const country = e.country;
    const admin1 = e.admin1;

    parsed.push({
      id,
      name,
      latitude,
      longitude,
      country: isNonEmptyString(country) ? country : undefined,
      admin1: isNonEmptyString(admin1) ? admin1 : undefined,
    });
  }
  return parsed;
}

export async function fetchGeocode(query: string, signal: AbortSignal): Promise<GeocodeResult[]> {
  const response = await fetch(buildGeocodeUrl(query), { signal });
  if (!response.ok) return [];
  const json: unknown = await response.json();
  return parseGeocodeResponse(json);
}
