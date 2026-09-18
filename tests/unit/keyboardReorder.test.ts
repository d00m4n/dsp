import { describe, expect, it } from 'vitest';
import { moveByKeyboard } from '../../src/lib/reorder/keyboardReorder';

function keyEvent(key: string, opts: { altKey?: boolean; ctrlKey?: boolean } = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    altKey: opts.altKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
  });
}

describe('moveByKeyboard', () => {
  it.each([
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
  ] as const)('maps Alt+%s to %s', (key, expected) => {
    expect(moveByKeyboard(keyEvent(key, { altKey: true }))).toBe(expected);
  });

  it.each(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])(
    'returns null for plain %s (no Alt)',
    (key) => {
      expect(moveByKeyboard(keyEvent(key))).toBeNull();
    },
  );

  it('returns null for Alt+non-arrow key', () => {
    expect(moveByKeyboard(keyEvent('a', { altKey: true }))).toBeNull();
  });

  it('returns null for Ctrl+Arrow without Alt', () => {
    expect(moveByKeyboard(keyEvent('ArrowUp', { ctrlKey: true }))).toBeNull();
  });
});
