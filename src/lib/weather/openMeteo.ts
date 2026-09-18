/**
 * All knowledge of the Open-Meteo API shape lives in this one module, so
 * switching provider is a one-file change. No API key, no registration,
 * open CORS.
 */
export interface WeatherSnapshot {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  isDay: boolean;
  tempMax: number;
  tempMin: number;
}

export interface WeatherFetchOptions {
  latitude: number;
  longitude: number;
  units: 'metric' | 'imperial';
  signal?: AbortSignal;
}

export function buildForecastUrl(options: Omit<WeatherFetchOptions, 'signal'>): string {
  const params = new URLSearchParams({
    latitude: String(options.latitude),
    longitude: String(options.longitude),
    current: 'temperature_2m,apparent_temperature,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '1',
    temperature_unit: options.units === 'imperial' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: options.units === 'imperial' ? 'mph' : 'kmh',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Never trusts the response shape: any missing or malformed field is
 * treated as a failure rather than crashing the header.
 */
export function parseForecastResponse(json: unknown): WeatherSnapshot | null {
  if (typeof json !== 'object' || json === null) return null;
  const root = json as Record<string, unknown>;

  const current = root.current;
  const daily = root.daily;
  if (typeof current !== 'object' || current === null) return null;
  if (typeof daily !== 'object' || daily === null) return null;

  const c = current as Record<string, unknown>;
  const d = daily as Record<string, unknown>;

  const temperature = c.temperature_2m;
  const apparentTemperature = c.apparent_temperature;
  const weatherCode = c.weather_code;
  const isDay = c.is_day;
  const tempMaxList = d.temperature_2m_max;
  const tempMinList = d.temperature_2m_min;

  if (!isFiniteNumber(temperature)) return null;
  if (!isFiniteNumber(apparentTemperature)) return null;
  if (!isFiniteNumber(weatherCode)) return null;
  if (typeof isDay !== 'number' && typeof isDay !== 'boolean') return null;
  if (!Array.isArray(tempMaxList) || !Array.isArray(tempMinList)) return null;

  const tempMax = tempMaxList[0];
  const tempMin = tempMinList[0];
  if (!isFiniteNumber(tempMax) || !isFiniteNumber(tempMin)) return null;

  return {
    temperature,
    apparentTemperature,
    weatherCode,
    isDay: Boolean(isDay),
    tempMax,
    tempMin,
  };
}

export async function fetchWeather(options: WeatherFetchOptions): Promise<WeatherSnapshot | null> {
  const response = await fetch(buildForecastUrl(options), { signal: options.signal });
  if (!response.ok) return null;
  const json: unknown = await response.json();
  return parseForecastResponse(json);
}
