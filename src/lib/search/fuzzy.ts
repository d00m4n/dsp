import { normaliseLetter } from '../mnemonics/parseName';

export interface Candidate {
  linkId: string;
  tabId: string;
  /** Deterministic tie-break order: tab, then group, then position. */
  tabIndex: number;
  groupIndex: number;
  positionInGroup: number;
  /** Display name (already stripped of the '&' mnemonic marker). */
  name: string;
  /** Hostname of the link's URL. */
  host: string;
}

export interface Match {
  linkId: string;
  tabId: string;
  score: number;
  /** Indices in the display name to highlight. */
  positions: number[];
}

const SCORE_NAME_PREFIX = 3;
const SCORE_WORD_PREFIX = 2;
const SCORE_NAME_SUBSEQUENCE = 1;
const SCORE_HOST_MATCH = 0;

function normaliseText(value: string): string {
  return Array.from(value)
    .map((ch) => normaliseLetter(ch) ?? ch.toLowerCase())
    .join('');
}

/** Returns matched indices in `text` if `query` is a subsequence of it, else null. */
function subsequencePositions(query: string, text: string): number[] | null {
  const positions: number[] = [];
  let qi = 0;
  for (let ti = 0; ti < text.length && qi < query.length; ti += 1) {
    if (text[ti] === query[qi]) {
      positions.push(ti);
      qi += 1;
    }
  }
  return qi === query.length ? positions : null;
}

interface ScoreResult {
  score: number;
  positions: number[];
}

function scoreCandidate(normalisedQuery: string, candidate: Candidate): ScoreResult | null {
  const name = normaliseText(candidate.name);

  if (normalisedQuery.length > 0 && name.startsWith(normalisedQuery)) {
    return {
      score: SCORE_NAME_PREFIX,
      positions: Array.from({ length: normalisedQuery.length }, (_, i) => i),
    };
  }

  let wordStart = 0;
  for (const word of name.split(/(\s+)/)) {
    if (!/\s/.test(word) && word.startsWith(normalisedQuery)) {
      return {
        score: SCORE_WORD_PREFIX,
        positions: Array.from({ length: normalisedQuery.length }, (_, i) => wordStart + i),
      };
    }
    wordStart += word.length;
  }

  const namePositions = subsequencePositions(normalisedQuery, name);
  if (namePositions) {
    return { score: SCORE_NAME_SUBSEQUENCE, positions: namePositions };
  }

  const host = normaliseText(candidate.host);
  if (subsequencePositions(normalisedQuery, host)) {
    return { score: SCORE_HOST_MATCH, positions: [] };
  }

  return null;
}

/**
 * Hand-written subsequence fuzzy matcher over link names and URL hosts.
 * Deterministic: ties break by tab order, then group, then position within
 * the group, never by object iteration order.
 */
export function fuzzyMatch(query: string, candidates: Candidate[]): Match[] {
  const normalisedQuery = normaliseText(query.trim());
  if (normalisedQuery === '') return [];

  const scored = candidates
    .map((candidate) => ({ candidate, result: scoreCandidate(normalisedQuery, candidate) }))
    .filter(
      (entry): entry is { candidate: Candidate; result: ScoreResult } => entry.result !== null,
    );

  scored.sort((a, b) => {
    if (b.result.score !== a.result.score) return b.result.score - a.result.score;
    if (a.candidate.tabIndex !== b.candidate.tabIndex) {
      return a.candidate.tabIndex - b.candidate.tabIndex;
    }
    if (a.candidate.groupIndex !== b.candidate.groupIndex) {
      return a.candidate.groupIndex - b.candidate.groupIndex;
    }
    return a.candidate.positionInGroup - b.candidate.positionInGroup;
  });

  return scored.map(({ candidate, result }) => ({
    linkId: candidate.linkId,
    tabId: candidate.tabId,
    score: result.score,
    positions: result.positions,
  }));
}
