import { describe, expect, it } from 'vitest';
import { insertionIndex, reorderByPointer } from '../../src/lib/reorder/pointerReorder';

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

describe('insertionIndex', () => {
  // Wide rows stacked vertically, like the link rows in settings: 400x40 each.
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ top: i * 50, bottom: i * 50 + 40, left: 0, right: 400 }));

  it('uses the vertical axis for wide rows, even with the pointer on the left edge', () => {
    // Five siblings (the dragged sixth row excluded); pointer on the left
    // handle at the height of the second row's lower half.
    expect(insertionIndex(rows(5), 10, 35)).toBe(1);
  });

  it('places the item first when above every midpoint', () => {
    expect(insertionIndex(rows(5), 10, 5)).toBe(0);
  });

  it('places the item last when below every midpoint', () => {
    expect(insertionIndex(rows(5), 10, 1000)).toBe(5);
  });

  it('uses the horizontal axis when every sibling shares one row', () => {
    const chips = [0, 1, 2].map((i) => ({ top: 0, bottom: 30, left: i * 100, right: i * 100 + 80 }));
    expect(insertionIndex(chips, 150, 15)).toBe(2);
    expect(insertionIndex(chips, 10, 15)).toBe(0);
  });

  it('returns 0 for an empty sibling list', () => {
    expect(insertionIndex([], 0, 0)).toBe(0);
  });
});
