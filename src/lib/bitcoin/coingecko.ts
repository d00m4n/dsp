/**
 * All knowledge of the CoinGecko API shape lives in this one module, so
 * switching provider is a one-file change. No API key, no registration,
 * open CORS.
 */
export interface BitcoinSnapshot {
  price: number;
  /** 24h change, as a percentage (e.g. 1.23 means +1.23%). */
  change24h: number | null;
}

export interface BitcoinFetchOptions {
  currency: 'usd' | 'eur';
  signal?: AbortSignal;
}

export function buildPriceUrl(options: Omit<BitcoinFetchOptions, 'signal'>): string {
  const params = new URLSearchParams({
    ids: 'bitcoin',
    vs_currencies: options.currency,
    include_24hr_change: 'true',
  });
  return `https://api.coingecko.com/api/v3/simple/price?${params.toString()}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Never trusts the response shape: any missing or malformed field is
 * treated as a failure rather than crashing the widget.
 */
export function parsePriceResponse(
  json: unknown,
  currency: 'usd' | 'eur',
): BitcoinSnapshot | null {
  if (typeof json !== 'object' || json === null) return null;
  const root = json as Record<string, unknown>;

  const bitcoin = root.bitcoin;
  if (typeof bitcoin !== 'object' || bitcoin === null) return null;
  const b = bitcoin as Record<string, unknown>;

  const price = b[currency];
  if (!isFiniteNumber(price)) return null;

  const change = b[`${currency}_24h_change`];
  const change24h = isFiniteNumber(change) ? change : null;

  return { price, change24h };
}

export async function fetchBitcoinPrice(
  options: BitcoinFetchOptions,
): Promise<BitcoinSnapshot | null> {
  const response = await fetch(buildPriceUrl(options), { signal: options.signal });
  if (!response.ok) return null;
  const json: unknown = await response.json();
  return parsePriceResponse(json, options.currency);
}
