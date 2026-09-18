import { describe, expect, it } from 'vitest';
import { buildForecastUrl, parseForecastResponse } from '../../src/lib/weather/openMeteo';

const validResponse = {
  current: {
    temperature_2m: 18.4,
    apparent_temperature: 17.1,
    weather_code: 1,
    is_day: 1,
  },
  daily: {
    temperature_2m_max: [22.3],
    temperature_2m_min: [12.1],
  },
};

describe('buildForecastUrl', () => {
  it('encodes coordinates and units into the query string', () => {
    const url = buildForecastUrl({ latitude: 41.155, longitude: 1.1075, units: 'metric' });
    expect(url).toContain('https://api.open-meteo.com/v1/forecast?');
    expect(url).toContain('latitude=41.155');
    expect(url).toContain('longitude=1.1075');
    expect(url).toContain('temperature_unit=celsius');
    expect(url).toContain('wind_speed_unit=kmh');
  });

  it('uses imperial units when requested', () => {
    const url = buildForecastUrl({ latitude: 0, longitude: 0, units: 'imperial' });
    expect(url).toContain('temperature_unit=fahrenheit');
    expect(url).toContain('wind_speed_unit=mph');
  });
});

describe('parseForecastResponse', () => {
  it('parses a well-formed response', () => {
    const snapshot = parseForecastResponse(validResponse);
    expect(snapshot).toEqual({
      temperature: 18.4,
      apparentTemperature: 17.1,
      weatherCode: 1,
      isDay: true,
      tempMax: 22.3,
      tempMin: 12.1,
    });
  });

  it.each([
    null,
    42,
    'garbage',
    [],
    {},
    { current: {} },
    { current: validResponse.current },
    { current: validResponse.current, daily: {} },
    { current: { ...validResponse.current, temperature_2m: 'hot' }, daily: validResponse.daily },
    { current: validResponse.current, daily: { temperature_2m_max: [], temperature_2m_min: [] } },
  ])('never throws and returns null for a malformed shape: %j', (input) => {
    expect(() => parseForecastResponse(input)).not.toThrow();
    expect(parseForecastResponse(input)).toBeNull();
  });
});
