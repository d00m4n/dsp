import type { BitcoinSnapshot } from './coingecko';

export interface CachedBitcoin {
  fetchedAt: number;
  snapshot: BitcoinSnapshot;
}

function cacheKey(currency: string): string {
  return `homebase:bitcoin:${currency}`;
}

function isSnapshot(value: unknown): value is BitcoinSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.price === 'number' && (v.change24h === null || typeof v.change24h === 'number');
}

export function readBitcoinCache(currency: string): CachedBitcoin | null {
  try {
    const raw = localStorage.getItem(cacheKey(currency));
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

export function writeBitcoinCache(currency: string, snapshot: BitcoinSnapshot): void {
  try {
    const entry: CachedBitcoin = { fetchedAt: Date.now(), snapshot };
    localStorage.setItem(cacheKey(currency), JSON.stringify(entry));
  } catch {
    // Best-effort: a full quota or disabled storage just means no cache next time.
  }
}
