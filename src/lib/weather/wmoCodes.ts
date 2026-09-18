/**
 * WMO weather interpretation codes as used by Open-Meteo. Cross-checked
 * against https://open-meteo.com/en/docs before implementing; any code not
 * listed here falls back to a generic condition rather than an error.
 */
export interface WmoCondition {
  label: string;
  daySymbol: string;
  nightSymbol: string;
}

export const WMO_CONDITIONS: Readonly<Record<number, WmoCondition>> = {
  0: { label: 'Clear sky', daySymbol: '☀️', nightSymbol: '🌙' },
  1: { label: 'Mainly clear', daySymbol: '🌤️', nightSymbol: '🌙' },
  2: { label: 'Partly cloudy', daySymbol: '⛅', nightSymbol: '☁️' },
  3: { label: 'Overcast', daySymbol: '☁️', nightSymbol: '☁️' },
  45: { label: 'Fog', daySymbol: '🌫️', nightSymbol: '🌫️' },
  48: { label: 'Depositing rime fog', daySymbol: '🌫️', nightSymbol: '🌫️' },
  51: { label: 'Light drizzle', daySymbol: '🌦️', nightSymbol: '🌦️' },
  53: { label: 'Moderate drizzle', daySymbol: '🌦️', nightSymbol: '🌦️' },
  55: { label: 'Dense drizzle', daySymbol: '🌦️', nightSymbol: '🌦️' },
  56: { label: 'Light freezing drizzle', daySymbol: '🌧️', nightSymbol: '🌧️' },
  57: { label: 'Dense freezing drizzle', daySymbol: '🌧️', nightSymbol: '🌧️' },
  61: { label: 'Slight rain', daySymbol: '🌧️', nightSymbol: '🌧️' },
  63: { label: 'Moderate rain', daySymbol: '🌧️', nightSymbol: '🌧️' },
  65: { label: 'Heavy rain', daySymbol: '🌧️', nightSymbol: '🌧️' },
  66: { label: 'Light freezing rain', daySymbol: '🌧️', nightSymbol: '🌧️' },
  67: { label: 'Heavy freezing rain', daySymbol: '🌧️', nightSymbol: '🌧️' },
  71: { label: 'Slight snow fall', daySymbol: '🌨️', nightSymbol: '🌨️' },
  73: { label: 'Moderate snow fall', daySymbol: '🌨️', nightSymbol: '🌨️' },
  75: { label: 'Heavy snow fall', daySymbol: '🌨️', nightSymbol: '🌨️' },
  77: { label: 'Snow grains', daySymbol: '🌨️', nightSymbol: '🌨️' },
  80: { label: 'Slight rain showers', daySymbol: '🌦️', nightSymbol: '🌦️' },
  81: { label: 'Moderate rain showers', daySymbol: '🌦️', nightSymbol: '🌦️' },
  82: { label: 'Violent rain showers', daySymbol: '⛈️', nightSymbol: '⛈️' },
  85: { label: 'Slight snow showers', daySymbol: '🌨️', nightSymbol: '🌨️' },
  86: { label: 'Heavy snow showers', daySymbol: '🌨️', nightSymbol: '🌨️' },
  95: { label: 'Thunderstorm', daySymbol: '⛈️', nightSymbol: '⛈️' },
  96: { label: 'Thunderstorm with slight hail', daySymbol: '⛈️', nightSymbol: '⛈️' },
  99: { label: 'Thunderstorm with heavy hail', daySymbol: '⛈️', nightSymbol: '⛈️' },
};

const GENERIC_CONDITION: WmoCondition = {
  label: 'Unknown conditions',
  daySymbol: '❓',
  nightSymbol: '❓',
};

export function resolveCondition(
  weatherCode: number,
  isDay: boolean,
): { label: string; symbol: string } {
  const condition = WMO_CONDITIONS[weatherCode] ?? GENERIC_CONDITION;
  return { label: condition.label, symbol: isDay ? condition.daySymbol : condition.nightSymbol };
}
