import { describe, expect, it } from 'vitest';
import { targetIndexForKeyboardMove } from '../../src/lib/components/settings/reorder';

describe('targetIndexForKeyboardMove', () => {
  const ids = ['a', 'b', 'c'];

  it('moves an item up to the previous index', () => {
    expect(targetIndexForKeyboardMove(ids, 'b', 'up')).toBe(0);
  });

  it('moves an item down to the next index', () => {
    expect(targetIndexForKeyboardMove(ids, 'b', 'down')).toBe(2);
  });

  it('returns a negative index when the first item moves up (caller clamps)', () => {
    expect(targetIndexForKeyboardMove(ids, 'a', 'up')).toBe(-1);
  });

  it('returns an out-of-range index when the last item moves down (caller clamps)', () => {
    expect(targetIndexForKeyboardMove(ids, 'c', 'down')).toBe(3);
  });

  it('returns 0 for an id not present in the list', () => {
    expect(targetIndexForKeyboardMove(ids, 'missing', 'down')).toBe(0);
  });
});
