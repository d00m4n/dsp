import { describe, it, expect, vi, afterEach } from 'vitest';
import { getRemoteTablerIcon } from '../../src/lib/icons/iconifyFallback';

describe('getRemoteTablerIcon', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('resolves icon data from a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        icons: { 'test-icon': { body: '<path d="M0 0" />' } },
        width: 24,
        height: 24,
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRemoteTablerIcon('test-icon');
    expect(result).toEqual({ body: '<path d="M0 0" />', width: 24, height: 24 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches by name so a repeat lookup does not refetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        icons: { 'cached-icon': { body: '<path d="M1 1" />' } },
        width: 24,
        height: 24,
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getRemoteTablerIcon('cached-icon');
    await getRemoteTablerIcon('cached-icon');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when the API responds without the icon', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ icons: {}, width: 24, height: 24 }),
    }) as unknown as typeof fetch;

    const result = await getRemoteTablerIcon('missing-icon');
    expect(result).toBeNull();
  });

  it('returns null instead of throwing on a network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    const result = await getRemoteTablerIcon('offline-icon');
    expect(result).toBeNull();
  });

  it('returns null when the response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const result = await getRemoteTablerIcon('bad-status-icon');
    expect(result).toBeNull();
  });
});
