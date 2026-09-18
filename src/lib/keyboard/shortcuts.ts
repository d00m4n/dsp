import type { Link, Tab } from '../../types/config';
import type { MnemonicMap } from '../mnemonics/assign';
import { normaliseLetter } from '../mnemonics/parseName';
import { isAllowedUrl } from '../search/protocols';
import { strings } from '../strings';

export interface ShortcutMeta {
  keys: string[]; // e.g. ['Ctrl', 'K']
  descriptionKey: string;
  group: 'navigation' | 'search' | 'general';
}

/**
 * Single source of truth for both the keyboard handler below and the '?'
 * help modal. A hand-written help table would drift the first time a key
 * changes, so ShortcutsHelp.svelte renders this array instead.
 */
export const SHORTCUTS: ShortcutMeta[] = [
  { keys: ['a-z'], descriptionKey: 'Open the mnemonic link in the current tab', group: 'navigation' },
  { keys: ['Shift', 'a-z'], descriptionKey: 'Open the mnemonic link in a new tab', group: 'navigation' },
  { keys: ['1', '…', '9'], descriptionKey: 'Jump to tab N', group: 'navigation' },
  { keys: ['↑', '↓', '←', '→'], descriptionKey: 'Move focus around the grid', group: 'navigation' },
  { keys: ['/'], descriptionKey: 'Open search', group: 'search' },
  { keys: ['Ctrl', 'K'], descriptionKey: 'Open search', group: 'search' },
  { keys: ['?'], descriptionKey: 'Show this help', group: 'general' },
  { keys: [','], descriptionKey: strings.settings.openSettingsShortcut, group: 'general' },
  { keys: ['Esc'], descriptionKey: 'Close the open dialog', group: 'general' },
];

export interface KeyboardDeps {
  getActiveTab: () => Tab | undefined;
  getMnemonics: (tabId: string) => MnemonicMap | undefined;
  getTabs: () => Tab[];
  setActiveTabId: (id: string) => void;
  isModalOpen: () => boolean;
  openSearch: () => void;
  openHelp: () => void;
  openSettings: () => void;
}

function findLink(tab: Tab, linkId: string): Link | undefined {
  for (const group of tab.groups) {
    const link = group.links.find((l) => l.id === linkId);
    if (link) return link;
  }
  return undefined;
}

type Direction = 'up' | 'down' | 'left' | 'right';

/** Moves focus to the nearest link card in the given direction, by geometry. */
function moveFocus(direction: Direction): void {
  const cards = Array.from(document.querySelectorAll<HTMLAnchorElement>('.link-card'));
  if (cards.length === 0) return;

  const current = document.activeElement;
  const currentIndex = cards.indexOf(current as HTMLAnchorElement);
  if (currentIndex === -1) {
    cards[0]?.focus();
    return;
  }

  const currentRect = cards[currentIndex]!.getBoundingClientRect();
  let bestIndex = -1;
  let bestDistance = Infinity;

  cards.forEach((card, i) => {
    if (i === currentIndex) return;
    const rect = card.getBoundingClientRect();
    const dx = rect.left - currentRect.left;
    const dy = rect.top - currentRect.top;
    const inDirection =
      direction === 'right'
        ? dx > 4
        : direction === 'left'
          ? dx < -4
          : direction === 'down'
            ? dy > 4
            : dy < -4;
    if (!inDirection) return;
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  });

  (bestIndex >= 0 ? cards[bestIndex] : cards[currentIndex])?.focus();
}

/**
 * Builds the single window keydown handler for the app. Must be attached
 * with `{ capture: true }`. Uses `event.key`, never `event.code`, so it
 * behaves the same on AZERTY, QWERTY and QWERTZ layouts.
 */
export function createKeyboardHandler(deps: KeyboardDeps): (event: KeyboardEvent) => void {
  return function handleKeydown(event: KeyboardEvent): void {
    // A modal (search dialog, help) manages its own keys locally; bail out
    // immediately without preventDefault so its own listeners still see the
    // event, and so typing "reddit" doesn't fire ten mnemonics.
    if (deps.isModalOpen()) return;

    if (event.isComposing || event.keyCode === 229) return; // IME active

    const target = event.target as HTMLElement | null;
    const inFormField = target?.closest('input, textarea, select, [contenteditable="true"]');
    if (inFormField && event.key !== 'Escape') return;

    const isK = event.key.toLowerCase() === 'k';
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && isK) {
      event.preventDefault();
      deps.openSearch();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Enter') return; // native activation, do not intercept

    if (event.key === '/') {
      event.preventDefault();
      deps.openSearch();
      return;
    }

    if (event.key === '?') {
      event.preventDefault();
      deps.openHelp();
      return;
    }

    if (event.key === ',') {
      event.preventDefault();
      deps.openSettings();
      return;
    }

    if (event.key >= '1' && event.key <= '9') {
      const tab = deps.getTabs()[Number(event.key) - 1];
      if (tab) {
        deps.setActiveTabId(tab.id);
        event.preventDefault();
      }
      return;
    }

    if (
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight'
    ) {
      const direction: Direction =
        event.key === 'ArrowUp'
          ? 'up'
          : event.key === 'ArrowDown'
            ? 'down'
            : event.key === 'ArrowLeft'
              ? 'left'
              : 'right';
      moveFocus(direction);
      event.preventDefault();
      return;
    }

    const letter = normaliseLetter(event.key);
    if (letter === null) return;

    const activeTab = deps.getActiveTab();
    if (!activeTab) return;
    const linkId = deps.getMnemonics(activeTab.id)?.byKey.get(letter);
    if (!linkId) return; // unassigned letter: no perceptible action

    const link = findLink(activeTab, linkId);
    if (!link || !isAllowedUrl(link.url)) return;

    event.preventDefault();
    if (event.shiftKey) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = link.url;
    }
  };
}
