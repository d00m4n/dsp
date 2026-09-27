import { describe, expect, it } from 'vitest';
import { COMMANDS, matchCommand } from '../../src/lib/search/commands';

describe('matchCommand', () => {
  it.each([
    ['!theme', 'theme'],
    ['!help', 'help'],
    ['  !HELP  ', 'help'],
    ['!unknown', null],
    ['theme', null],
    ['!theme extra', null],
    ['', null],
  ])('matches %j', (input, bang) => {
    expect(matchCommand(input)?.bang ?? null).toBe(bang);
  });

  it('lists every registered command exactly once', () => {
    const bangs = COMMANDS.map((c) => c.bang);
    expect(new Set(bangs).size).toBe(bangs.length);
  });
});
