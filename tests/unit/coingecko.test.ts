import { describe, expect, it } from 'vitest';
import { buildPriceUrl, parsePriceResponse } from '../../src/lib/bitcoin/coingecko';

const validResponse = {
  bitcoin: {
    usd: 65000.5,
    usd_24h_change: 1.234,
  },
};

describe('buildPriceUrl', () => {
  it('encodes the currency into the query string', () => {
    const url = buildPriceUrl({ currency: 'usd' });
    expect(url).toContain('https://api.coingecko.com/api/v3/simple/price?');
    expect(url).toContain('ids=bitcoin');
    expect(url).toContain('vs_currencies=usd');
    expect(url).toContain('include_24hr_change=true');
  });

  it('uses the requested currency', () => {
    const url = buildPriceUrl({ currency: 'eur' });
    expect(url).toContain('vs_currencies=eur');
  });
});

describe('parsePriceResponse', () => {
  it('parses a well-formed response', () => {
    const snapshot = parsePriceResponse(validResponse, 'usd');
    expect(snapshot).toEqual({ price: 65000.5, change24h: 1.234 });
  });

  it('treats a missing change field as null rather than failing', () => {
    const snapshot = parsePriceResponse({ bitcoin: { usd: 65000.5 } }, 'usd');
    expect(snapshot).toEqual({ price: 65000.5, change24h: null });
  });

  it.each([
    null,
    42,
    'garbage',
    [],
    {},
    { bitcoin: {} },
    { bitcoin: { eur: 60000 } }, // wrong currency key
    { bitcoin: { usd: 'expensive' } },
  ])('never throws and returns null for a malformed shape: %j', (input) => {
    expect(() => parsePriceResponse(input, 'usd')).not.toThrow();
    expect(parsePriceResponse(input, 'usd')).toBeNull();
  });
});
