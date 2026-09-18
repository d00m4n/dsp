import type { SearchEngine } from '../../types/config';

export interface BangResult {
  /** Engine id claimed by a bang, or null. */
  engineId: string | null;
  /** Input with the bang token removed and trimmed. */
  query: string;
}

function matchToken(token: string, engineIds: Set<string>): string | null {
  if (!token.startsWith('!')) return null;
  const id = token.slice(1).toLowerCase();
  if (id === '') return null;
  return engineIds.has(id) ? id : null;
}

/**
 * Recognises a `!engineId` bang as the first or last whitespace-delimited
 * token of the input, case-insensitively. If both ends look like a bang, the
 * first one wins. An unknown engine id is left as literal text.
 */
export function extractBang(input: string, engines: SearchEngine[]): BangResult {
  const trimmed = input.trim();
  if (trimmed === '') return { engineId: null, query: trimmed };

  const tokens = trimmed.split(/\s+/);
  const engineIds = new Set(engines.map((e) => e.id.toLowerCase()));

  const first = tokens[0]!;
  const firstMatch = matchToken(first, engineIds);
  if (firstMatch !== null) {
    return { engineId: firstMatch, query: tokens.slice(1).join(' ') };
  }

  if (tokens.length > 1) {
    const last = tokens[tokens.length - 1]!;
    const lastMatch = matchToken(last, engineIds);
    if (lastMatch !== null) {
      return { engineId: lastMatch, query: tokens.slice(0, -1).join(' ') };
    }
  }

  return { engineId: null, query: trimmed };
}
