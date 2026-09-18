import { describe, expect, it, vi } from 'vitest';
import { pickRandomPhrase } from '../../src/lib/widgets/phrases';

describe('pickRandomPhrase', () => {
  it('returns null for an empty list', () => {
    expect(pickRandomPhrase([])).toBeNull();
  });

  it('returns the only entry for a single-item list', () => {
    expect(pickRandomPhrase(['Carpe diem'])).toBe('Carpe diem');
  });

  it('always returns one of the given entries', () => {
    const phrases = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 50; i++) {
      expect(phrases).toContain(pickRandomPhrase(phrases));
    }
  });

  it('picks the entry at the index derived from Math.random', () => {
    const phrases = ['a', 'b', 'c'];
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(pickRandomPhrase(phrases)).toBe('b');
    vi.restoreAllMocks();
  });
});
