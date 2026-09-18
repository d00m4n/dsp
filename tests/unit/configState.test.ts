import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// configState is a module-level singleton constructed at import time, and its
// constructor kicks off an async fetch('config.json'). Stub fetch before
// importing so that background call resolves harmlessly in jsdom.
vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.resolve({ ok: false, status: 404 } as Response)),
);

const { configState } = await import('../../src/lib/state/config.svelte');

describe('configState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces updates to the same field within 500ms', () => {
    configState.update((draft) => (draft.theme.fontScale = 1.1), { field: 'theme.fontScale' });
    expect(configState.canUndo).toBe(true);
    const undoDepthAfterFirst = (configState as unknown as { undoStack: unknown[] }).undoStack.length;

    vi.advanceTimersByTime(100);
    configState.update((draft) => (draft.theme.fontScale = 1.2), { field: 'theme.fontScale' });
    const undoDepthAfterSecond = (configState as unknown as { undoStack: unknown[] }).undoStack.length;

    expect(undoDepthAfterSecond).toBe(undoDepthAfterFirst);
    expect(configState.config.theme.fontScale).toBe(1.2);
  });

  it('pushes a separate undo entry once 500ms elapse for the same field', () => {
    configState.update((draft) => (draft.theme.fontScale = 1.1), { field: 'theme.fontScale' });
    const depthBefore = (configState as unknown as { undoStack: unknown[] }).undoStack.length;

    vi.advanceTimersByTime(501);
    configState.update((draft) => (draft.theme.fontScale = 1.3), { field: 'theme.fontScale' });
    const depthAfter = (configState as unknown as { undoStack: unknown[] }).undoStack.length;

    expect(depthAfter).toBe(depthBefore + 1);
  });

  it('pushes a separate undo entry for a different field', () => {
    configState.update((draft) => (draft.theme.fontScale = 1.1), { field: 'theme.fontScale' });
    const depthBefore = (configState as unknown as { undoStack: unknown[] }).undoStack.length;

    configState.update((draft) => (draft.theme.radius = 8), { field: 'theme.radius' });
    const depthAfter = (configState as unknown as { undoStack: unknown[] }).undoStack.length;

    expect(depthAfter).toBe(depthBefore + 1);
  });

  it('destructive mutations always push their own entry, never coalescing', () => {
    configState.update((draft) => (draft.theme.fontScale = 1.1), { field: 'theme.fontScale' });
    const depthBefore = (configState as unknown as { undoStack: unknown[] }).undoStack.length;

    configState.update((draft) => (draft.theme.fontScale = 1.4), {
      field: 'theme.fontScale',
      destructive: true,
    });
    const depthAfterFirstDestructive = (configState as unknown as { undoStack: unknown[] }).undoStack
      .length;
    expect(depthAfterFirstDestructive).toBe(depthBefore + 1);

    // Immediately another destructive call with the same field: still separate.
    configState.update((draft) => (draft.theme.fontScale = 1.5), {
      field: 'theme.fontScale',
      destructive: true,
    });
    const depthAfterSecondDestructive = (configState as unknown as { undoStack: unknown[] }).undoStack
      .length;
    expect(depthAfterSecondDestructive).toBe(depthAfterFirstDestructive + 1);
  });

  it('caps the undo stack at 20 entries, dropping the oldest', () => {
    for (let i = 0; i < 25; i++) {
      configState.update((draft) => (draft.theme.radius = i), { destructive: true });
    }
    const undoStack = (configState as unknown as { undoStack: unknown[] }).undoStack;
    expect(undoStack.length).toBe(20);
  });

  it('clears the redo stack on any new update', () => {
    configState.update((draft) => (draft.theme.radius = 1), { destructive: true });
    configState.update((draft) => (draft.theme.radius = 2), { destructive: true });
    configState.undo();
    expect(configState.canRedo).toBe(true);

    configState.update((draft) => (draft.theme.radius = 3), { destructive: true });
    expect(configState.canRedo).toBe(false);
  });

  it('undo -> redo round trip restores deep-equal state', () => {
    configState.update((draft) => (draft.theme.radius = 42), { destructive: true });
    const beforeSecond = JSON.parse(JSON.stringify(configState.config)) as typeof configState.config;

    configState.update((draft) => (draft.theme.radius = 99), { destructive: true });
    expect(configState.config.theme.radius).toBe(99);

    configState.undo();
    expect(configState.config).toEqual(beforeSecond);

    configState.redo();
    expect(configState.config.theme.radius).toBe(99);
  });
});
