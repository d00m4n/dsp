import { describe, expect, it } from 'vitest';
import { reorderByPointer } from '../../src/lib/reorder/pointerReorder';

describe('reorderByPointer', () => {
  const list = ['a', 'b', 'c', 'd', 'e'];

  it('moves an item down (later in the list)', () => {
    expect(reorderByPointer(list, 'a', 2)).toEqual(['b', 'c', 'a', 'd', 'e']);
  });

  it('moves an item up (earlier in the list)', () => {
    expect(reorderByPointer(list, 'd', 1)).toEqual(['a', 'd', 'b', 'c', 'e']);
  });

  it('is a no-op when the target index equals the current index', () => {
    expect(reorderByPointer(list, 'c', 2)).toEqual(list);
  });

  it('moves an item to the start', () => {
    expect(reorderByPointer(list, 'e', 0)).toEqual(['e', 'a', 'b', 'c', 'd']);
  });

  it('moves an item to the end', () => {
    expect(reorderByPointer(list, 'a', 4)).toEqual(['b', 'c', 'd', 'e', 'a']);
  });

  it('clamps an out-of-range target index above the list length', () => {
    expect(reorderByPointer(list, 'a', 99)).toEqual(['b', 'c', 'd', 'e', 'a']);
  });

  it('clamps a negative target index to the start', () => {
    expect(reorderByPointer(list, 'e', -5)).toEqual(['e', 'a', 'b', 'c', 'd']);
  });

  it('returns a copy (not the same array reference) even for a no-op move', () => {
    const result = reorderByPointer(list, 'c', 2);
    expect(result).not.toBe(list);
  });
});
