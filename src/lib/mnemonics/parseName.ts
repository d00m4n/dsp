export interface ParsedName {
  /** Text to render. Never contains a marker '&'. */
  display: string;
  /** Lowercase a-z letter claimed with '&', if any. */
  explicit: string | null;
  /** Index within `display` of the claimed character. */
  explicitIndex: number | null;
}

/** Strips diacritics and lower-cases; returns null unless the result is a-z. */
export function normaliseLetter(ch: string): string | null {
  const n = ch
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return /^[a-z]$/.test(n) ? n : null;
}

/**
 * Parses the '&' mnemonic marker syntax out of a raw link name.
 * '&x' claims the letter at that position (first claim wins); '&&' is a
 * literal ampersand; a dangling trailing '&' is dropped.
 */
export function parseName(raw: string): ParsedName {
  let display = '';
  let explicit: string | null = null;
  let explicitIndex: number | null = null;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== '&') {
      display += ch;
      continue;
    }

    const next = raw[i + 1];
    if (next === undefined) {
      // Dangling '&' at the end of the string: drop it.
      continue;
    }
    if (next === '&') {
      // Escaped ampersand: literal '&' in the display text.
      display += '&';
      i += 1;
      continue;
    }

    if (explicit === null) {
      const letter = normaliseLetter(next);
      if (letter !== null) {
        explicit = letter;
        explicitIndex = display.length;
      }
    }
    display += next;
    i += 1;
  }

  return { display, explicit, explicitIndex };
}
