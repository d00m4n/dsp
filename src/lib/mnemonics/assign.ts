import type { Link, Tab } from '../../types/config';
import { normaliseLetter, parseName } from './parseName';

export interface Mnemonic {
  key: string;
  /** Index in the display name to underline, or null if the letter is not in the name. */
  displayIndex: number | null;
}

export interface MnemonicConflict {
  linkId: string;
  requested: string;
  /** Id of the link that got the letter first. */
  takenBy: string;
}

export interface MnemonicMap {
  byLink: Map<string, Mnemonic>;
  byKey: Map<string, string>; // key -> linkId
  conflicts: MnemonicConflict[];
  /** Links left with no mnemonic because the alphabet ran out. */
  unassigned: string[];
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

interface Entry {
  link: Link;
  display: string;
  explicit: string | null;
  explicitIndex: number | null;
}

/**
 * Assigns a mnemonic key to every link in a tab, in three deterministic
 * passes over group -> position-within-group order. Never throws.
 */
export function assignMnemonics(tab: Tab): MnemonicMap {
  const entries: Entry[] = [];
  for (const group of tab.groups) {
    for (const link of group.links) {
      const { display, explicit, explicitIndex } = parseName(link.name);
      entries.push({ link, display, explicit, explicitIndex });
    }
  }

  const taken = new Set<string>();
  const byLink = new Map<string, Mnemonic>();
  const byKey = new Map<string, string>();
  const conflicts: MnemonicConflict[] = [];
  const unassigned: string[] = [];
  const remaining: Entry[] = [];

  // Pass 1: explicit claims.
  for (const entry of entries) {
    if (entry.explicit === null) {
      remaining.push(entry);
      continue;
    }
    if (taken.has(entry.explicit)) {
      conflicts.push({
        linkId: entry.link.id,
        requested: entry.explicit,
        takenBy: byKey.get(entry.explicit) ?? '',
      });
      remaining.push(entry);
      continue;
    }
    taken.add(entry.explicit);
    byKey.set(entry.explicit, entry.link.id);
    byLink.set(entry.link.id, { key: entry.explicit, displayIndex: entry.explicitIndex });
  }

  // Pass 2: first free letter in the display name, left to right.
  const stillRemaining: Entry[] = [];
  for (const entry of remaining) {
    let assigned = false;
    for (let i = 0; i < entry.display.length; i += 1) {
      const letter = normaliseLetter(entry.display[i] ?? '');
      if (letter !== null && !taken.has(letter)) {
        taken.add(letter);
        byKey.set(letter, entry.link.id);
        byLink.set(entry.link.id, { key: letter, displayIndex: i });
        assigned = true;
        break;
      }
    }
    if (!assigned) stillRemaining.push(entry);
  }

  // Pass 3: residual, first free letter of the alphabet.
  for (const entry of stillRemaining) {
    const letter = ALPHABET.split('').find((l) => !taken.has(l));
    if (letter === undefined) {
      unassigned.push(entry.link.id);
      continue;
    }
    taken.add(letter);
    byKey.set(letter, entry.link.id);
    byLink.set(entry.link.id, { key: letter, displayIndex: null });
  }

  return { byLink, byKey, conflicts, unassigned };
}
