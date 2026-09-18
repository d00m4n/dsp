import { describe, expect, it } from 'vitest';
import { getIsoWeek } from '../../src/lib/widgets/isoWeek';

describe('getIsoWeek', () => {
  it.each([
    ['2026-01-01', 1],
    ['2027-01-01', 53],
    ['2021-01-01', 53],
    ['2026-12-31', 53],
    ['2024-02-29', 9],
  ])('%s -> week %d', (iso, expected) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    expect(getIsoWeek(new Date(y, m - 1, d))).toBe(expected);
  });
});
