import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId } from '../../src/lib/utils/id';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses crypto.randomUUID when available', () => {
    const spy = vi.spyOn(crypto, 'randomUUID');
    const id = generateId();
    expect(spy).toHaveBeenCalled();
    expect(id).toMatch(UUID_V4_RE);
  });

  it('falls back to a hand-built v4 UUID when crypto.randomUUID is unavailable', () => {
    const original = crypto.randomUUID;
    // @ts-expect-error simulating an insecure context, where this is undefined
    crypto.randomUUID = undefined;

    try {
      const id = generateId();
      expect(id).toMatch(UUID_V4_RE);
    } finally {
      crypto.randomUUID = original;
    }
  });

  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
