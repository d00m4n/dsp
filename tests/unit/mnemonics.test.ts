import { describe, expect, it } from 'vitest';
import { parseName } from '../../src/lib/mnemonics/parseName';
import { assignMnemonics } from '../../src/lib/mnemonics/assign';
import type { Link, Tab } from '../../src/types/config';

function link(id: string, name: string, url = 'https://example.com'): Link {
  return { id, name, url };
}

function tab(id: string, links: Link[]): Tab {
  return { id, name: id, icon: 'folder', groups: [{ id: 'g', name: 'g', links }] };
}

describe('parseName', () => {
  it.each([
    ['Reddit', 'Reddit', null, null],
    ['&Reddit', 'Reddit', 'r', 0],
    ['Git&Hub', 'GitHub', 'h', 3],
    ['R&&D', 'R&D', null, null],
    ['T&elegram', 'Telegram', 'e', 1],
    ['&', '', null, null],
    ['&1abc', '1abc', null, null],
    ['Àl&bums', 'Àlbums', 'b', 2],
  ])('parses %s', (raw, display, explicit, explicitIndex) => {
    const result = parseName(raw);
    expect(result.display).toBe(display);
    expect(result.explicit).toBe(explicit);
    expect(result.explicitIndex).toBe(explicitIndex);
  });

  it('only lets the first ampersand claim a letter', () => {
    const result = parseName('A&B&C');
    expect(result.display).toBe('ABC');
    expect(result.explicit).toBe('b');
    expect(result.explicitIndex).toBe(1);
  });
});

describe('assignMnemonics — Annex A fixture', () => {
  const social = tab('social', [
    link('mastodon', 'Mastodon'),
    link('bluesky', 'Bluesky'),
    link('reddit', 'Reddit'),
    link('youtube', 'YouTube'),
    link('instagram', 'Instagram'),
    link('linkedin', 'LinkedIn'),
    link('twitch', 'Twitch'),
    link('telegram', 'T&elegram'),
    link('discord', 'Discord'),
    link('github', 'Git&Hub'),
  ]);

  const expected: Record<string, { key: string; displayIndex: number | null }> = {
    telegram: { key: 'e', displayIndex: 1 },
    github: { key: 'h', displayIndex: 3 },
    mastodon: { key: 'm', displayIndex: 0 },
    bluesky: { key: 'b', displayIndex: 0 },
    reddit: { key: 'r', displayIndex: 0 },
    youtube: { key: 'y', displayIndex: 0 },
    instagram: { key: 'i', displayIndex: 0 },
    linkedin: { key: 'l', displayIndex: 0 },
    twitch: { key: 't', displayIndex: 0 },
    discord: { key: 'd', displayIndex: 0 },
  };

  it('matches the expected key/index table', () => {
    const map = assignMnemonics(social);
    for (const [linkId, want] of Object.entries(expected)) {
      const got = map.byLink.get(linkId);
      expect(got, `mnemonic for ${linkId}`).toEqual(want);
    }
    expect(map.conflicts).toEqual([]);
    expect(map.unassigned).toEqual([]);
  });
});

describe('assignMnemonics — edge cases', () => {
  it('resolves an explicit collision: first wins, second falls back', () => {
    const t = tab('t', [link('a1', '&Apple'), link('a2', '&Avocado')]);
    const map = assignMnemonics(t);
    expect(map.byLink.get('a1')).toEqual({ key: 'a', displayIndex: 0 });
    expect(map.conflicts).toEqual([{ linkId: 'a2', requested: 'a', takenBy: 'a1' }]);
    // The loser still ends up with some mnemonic, from a later pass.
    const loser = map.byLink.get('a2');
    expect(loser).toBeDefined();
    expect(loser?.key).not.toBe('a');
  });

  it('Twitter and Twitch: second must not fail, takes the next free letter', () => {
    const t = tab('t', [link('tw1', 'Twitter'), link('tw2', 'Twitch')]);
    const map = assignMnemonics(t);
    expect(map.byLink.get('tw1')).toEqual({ key: 't', displayIndex: 0 });
    expect(map.byLink.get('tw2')).toEqual({ key: 'w', displayIndex: 1 });
    expect(map.unassigned).toEqual([]);
  });

  it('empty name, digits-only name, emoji-only name fall through to pass 3 with null displayIndex', () => {
    const t = tab('t', [link('e1', ''), link('e2', '123'), link('e3', '🎉🎉')]);
    const map = assignMnemonics(t);
    for (const id of ['e1', 'e2', 'e3']) {
      const m = map.byLink.get(id);
      expect(m, id).toBeDefined();
      expect(m?.displayIndex).toBeNull();
      expect(m?.key).toMatch(/^[a-z]$/);
    }
    expect(map.unassigned).toEqual([]);
  });

  it('a tab with 30 links assigns 26 and leaves 4 unassigned, without throwing', () => {
    const links = Array.from({ length: 30 }, (_, i) => link(`l${i}`, `Link${i}`));
    const t = tab('t', links);
    expect(() => assignMnemonics(t)).not.toThrow();
    const map = assignMnemonics(t);
    expect(map.byLink.size).toBe(26);
    expect(map.unassigned).toHaveLength(4);
  });

  it('is stable across repeated calls on the same tab', () => {
    const t = tab('t', [
      link('a', 'Mastodon'),
      link('b', 'Bluesky'),
      link('c', 'T&elegram'),
      link('d', 'Git&Hub'),
      link('e', 'Twitter'),
      link('f', 'Twitch'),
    ]);
    const results = Array.from({ length: 10 }, () => assignMnemonics(t));
    const first = JSON.stringify([...results[0]!.byLink.entries()]);
    for (const result of results.slice(1)) {
      expect(JSON.stringify([...result.byLink.entries()])).toBe(first);
    }
  });

  it('accents: Àlbums claims a, Ñam claims n', () => {
    const t = tab('t', [link('albums', 'Àlbums'), link('nyam', 'Ñam')]);
    const map = assignMnemonics(t);
    expect(map.byLink.get('albums')).toEqual({ key: 'a', displayIndex: 0 });
    expect(map.byLink.get('nyam')).toEqual({ key: 'n', displayIndex: 0 });
  });
});
