import { describe, expect, it } from 'vitest';
import { extractBang } from '../../src/lib/search/bangs';
import type { SearchEngine } from '../../src/types/config';

const engines: SearchEngine[] = [
  { id: 'd', name: 'DuckDuckGo', template: 'https://duckduckgo.com/?q={query}' },
  { id: 'g', name: 'Google', template: 'https://www.google.com/search?q={query}' },
  { id: 'w', name: 'Wikipedia (ca)', template: 'https://ca.wikipedia.org/w/index.php?search={query}' },
];

describe('extractBang', () => {
  it.each([
    ['!g svelte runes', 'g', 'svelte runes'],
    ['svelte runes !g', 'g', 'svelte runes'],
    ['!g svelte !d', 'g', 'svelte !d'],
    ['!zz svelte', null, '!zz svelte'],
    ['hola!g', null, 'hola!g'],
    ['!g', 'g', ''],
    ['!', null, '!'],
    ['  !G  Svelte  ', 'g', 'Svelte'],
  ])('parses %j', (input, engineId, query) => {
    const result = extractBang(input, engines);
    expect(result.engineId).toBe(engineId);
    expect(result.query).toBe(query);
  });
});
