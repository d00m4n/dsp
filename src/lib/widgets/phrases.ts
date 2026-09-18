/** Picks one entry at random; `null` when the list is empty. */
export function pickRandomPhrase(phrases: readonly string[]): string | null {
  if (phrases.length === 0) return null;
  const index = Math.floor(Math.random() * phrases.length);
  return phrases[index] ?? null;
}
