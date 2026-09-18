import { describe, expect, it } from 'vitest';
import { fuzzyMatch, type Candidate } from '../../src/lib/search/fuzzy';

const candidates: Candidate[] = [
  {
    linkId: 'mastodon',
    tabId: 'social',
    tabIndex: 0,
    groupIndex: 0,
    positionInGroup: 0,
    name: 'Mastodon',
    host: 'mastodon.social',
  },
  {
    linkId: 'bluesky',
    tabId: 'social',
    tabIndex: 0,
    groupIndex: 0,
    positionInGroup: 1,
    name: 'Bluesky',
    host: 'bsky.app',
  },
  {
    linkId: 'albums',
    tabId: 'social',
    tabIndex: 0,
    groupIndex: 0,
    positionInGroup: 2,
    name: 'Àlbums',
    host: 'photos.example.com',
  },
  {
    linkId: 'my-blog',
    tabId: 'social',
    tabIndex: 0,
    groupIndex: 0,
    positionInGroup: 3,
    name: 'My Blog',
    host: 'example.com',
  },
];

describe('fuzzyMatch', () => {
  it('returns an empty array for an empty query', () => {
    expect(fuzzyMatch('', candidates)).toEqual([]);
    expect(fuzzyMatch('   ', candidates)).toEqual([]);
  });

  it('ranks an exact name prefix above a subsequence match', () => {
    const results = fuzzyMatch('mast', candidates);
    expect(results[0]?.linkId).toBe('mastodon');
  });

  it('finds accented names via ascii input', () => {
    const results = fuzzyMatch('alb', candidates);
    expect(results.some((r) => r.linkId === 'albums')).toBe(true);
  });

  it('matches a word prefix that is not the first word', () => {
    const results = fuzzyMatch('blog', candidates);
    expect(results[0]?.linkId).toBe('my-blog');
  });

  it('falls back to matching the host', () => {
    const results = fuzzyMatch('bsky', candidates);
    expect(results.some((r) => r.linkId === 'bluesky')).toBe(true);
  });

  it('is stable across repeated calls', () => {
    const runs = Array.from({ length: 10 }, () => fuzzyMatch('a', candidates));
    const first = JSON.stringify(runs[0]);
    for (const run of runs.slice(1)) {
      expect(JSON.stringify(run)).toBe(first);
    }
  });
});
