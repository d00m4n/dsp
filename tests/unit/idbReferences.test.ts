import { describe, expect, it } from 'vitest';
import { collectIdbReferences } from '../../src/lib/wallpapers/idbReferences';

describe('collectIdbReferences', () => {
  it('finds a single idb: reference in backdrop.source', () => {
    const config = { theme: { backdrop: { source: 'idb:a7f3c2', kind: 'image' } } };
    expect(collectIdbReferences(config)).toEqual(new Set(['a7f3c2']));
  });

  it('finds references in multiple fields, not just backdrop.source', () => {
    const config = {
      theme: { backdrop: { source: 'idb:aaa111', staticFallback: 'idb:bbb222' } },
      tabs: [{ id: 't1', banner: 'idb:ccc333', bannerStatic: 'wallpapers/x.jpg' }],
    };
    expect(collectIdbReferences(config)).toEqual(new Set(['aaa111', 'bbb222', 'ccc333']));
  });

  it('ignores non-idb sources', () => {
    const config = { theme: { backdrop: { source: 'wallpapers/reus.jpg' } } };
    expect(collectIdbReferences(config)).toEqual(new Set());
  });

  it('dedupes repeated references to the same id', () => {
    const config = {
      a: 'idb:dup1',
      b: { c: 'idb:dup1' },
    };
    expect(collectIdbReferences(config)).toEqual(new Set(['dup1']));
  });

  it('returns an empty set for a config with no idb references', () => {
    expect(collectIdbReferences({ theme: { backdrop: { kind: 'solid' } } })).toEqual(new Set());
  });
});
