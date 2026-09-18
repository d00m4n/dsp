import { describe, expect, it } from 'vitest';
import { resolveCondition } from '../../src/lib/weather/wmoCodes';

describe('resolveCondition', () => {
  it('resolves a known code with day/night symbols', () => {
    expect(resolveCondition(0, true).label).toBe('Clear sky');
    expect(resolveCondition(0, true).symbol).not.toBe(resolveCondition(0, false).symbol);
  });

  it('falls back to a generic condition for an unknown code, never throwing', () => {
    expect(() => resolveCondition(12345, true)).not.toThrow();
    expect(resolveCondition(12345, true).label).toBe('Unknown conditions');
  });
});
