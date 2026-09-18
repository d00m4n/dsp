import { describe, expect, it } from 'vitest';
import { buildExportFilename, countTabsAndLinks } from '../../src/lib/config/summary';

describe('countTabsAndLinks', () => {
  it('counts zero tabs and zero links for an empty config', () => {
    expect(countTabsAndLinks({ tabs: [] })).toEqual({ tabs: 0, links: 0 });
  });

  it('sums links across multiple groups within a tab', () => {
    const config = {
      tabs: [
        {
          id: 't1',
          name: 'Tab',
          icon: '',
          groups: [
            { id: 'g1', name: 'G1', links: [{ id: 'l1', name: 'L1', url: 'https://a' }] },
            {
              id: 'g2',
              name: 'G2',
              links: [
                { id: 'l2', name: 'L2', url: 'https://b' },
                { id: 'l3', name: 'L3', url: 'https://c' },
              ],
            },
          ],
        },
      ],
    };
    expect(countTabsAndLinks(config)).toEqual({ tabs: 1, links: 3 });
  });

  it('sums links across multiple tabs', () => {
    const config = {
      tabs: [
        { id: 't1', name: 'A', icon: '', groups: [{ id: 'g1', name: 'G', links: [{ id: 'l1', name: 'L', url: 'https://a' }] }] },
        { id: 't2', name: 'B', icon: '', groups: [{ id: 'g2', name: 'G', links: [{ id: 'l2', name: 'L', url: 'https://b' }] }] },
      ],
    };
    expect(countTabsAndLinks(config)).toEqual({ tabs: 2, links: 2 });
  });

  it('handles tabs with no groups and groups with no links', () => {
    const config = {
      tabs: [
        { id: 't1', name: 'A', icon: '', groups: [] },
        { id: 't2', name: 'B', icon: '', groups: [{ id: 'g1', name: 'G', links: [] }] },
      ],
    };
    expect(countTabsAndLinks(config)).toEqual({ tabs: 2, links: 0 });
  });
});

describe('buildExportFilename', () => {
  it('formats a date with zero-padded month and day', () => {
    expect(buildExportFilename(new Date(2026, 0, 5))).toBe('homebase-config-2026-01-05.json');
  });

  it('formats a date with double-digit month and day', () => {
    expect(buildExportFilename(new Date(2026, 10, 23))).toBe('homebase-config-2026-11-23.json');
  });

  it('formats the December 31st edge case', () => {
    expect(buildExportFilename(new Date(2025, 11, 31))).toBe('homebase-config-2025-12-31.json');
  });
});
