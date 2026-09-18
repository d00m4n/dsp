import { describe, expect, it } from 'vitest';
import { buildGeocodeUrl, parseGeocodeResponse } from '../../src/lib/geocoding/openMeteoGeocode';

const validResponse = {
  results: [
    { id: 1, name: 'Reus', latitude: 41.155, longitude: 1.1075, country: 'Spain', admin1: 'Catalonia' },
  ],
};

describe('buildGeocodeUrl', () => {
  it('produces the documented URL shape', () => {
    const url = buildGeocodeUrl('Reus');
    expect(url).toContain('https://geocoding-api.open-meteo.com/v1/search?');
    expect(url).toContain('name=Reus');
    expect(url).toContain('count=5');
    expect(url).toContain('language=ca');
  });

  it('URL-encodes a query containing a space', () => {
    const url = buildGeocodeUrl('New York');
    expect(url).toContain('name=New+York');
  });

  it('URL-encodes a query containing accented characters', () => {
    const url = buildGeocodeUrl('Empúries');
    const params = new URL(url).searchParams;
    expect(params.get('name')).toBe('Empúries');
    expect(url).not.toContain('Empúries');
  });
});

describe('parseGeocodeResponse', () => {
  it('parses a well-formed response', () => {
    expect(parseGeocodeResponse(validResponse)).toEqual([
      {
        id: 1,
        name: 'Reus',
        latitude: 41.155,
        longitude: 1.1075,
        country: 'Spain',
        admin1: 'Catalonia',
      },
    ]);
  });

  it('omits optional fields when absent', () => {
    const json = { results: [{ id: 2, name: 'Tarragona', latitude: 41.1, longitude: 1.25 }] };
    expect(parseGeocodeResponse(json)).toEqual([
      { id: 2, name: 'Tarragona', latitude: 41.1, longitude: 1.25, country: undefined, admin1: undefined },
    ]);
  });

  it.each([
    null,
    42,
    'garbage',
    [],
    {},
    { results: 'not-an-array' },
    { results: [null] },
    { results: [{ id: 'not-a-number', name: 'X', latitude: 1, longitude: 1 }] },
    { results: [{ id: 1, name: '', latitude: 1, longitude: 1 }] },
    { results: [{ id: 1, name: 'X', latitude: 'nope', longitude: 1 }] },
    { results: [{ id: 1, name: 'X', latitude: 1, longitude: 'nope' }] },
  ])('never throws and returns [] for a malformed shape: %j', (input) => {
    expect(() => parseGeocodeResponse(input)).not.toThrow();
    expect(parseGeocodeResponse(input)).toEqual([]);
  });
});
