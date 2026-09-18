import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Regression guard for the three README files (`README.md`, `README.ca.md`,
 * `README.es.md`), which must stay "complete and equivalent" (per
 * PHASE-5.md §7.1) rather than one full README and two stale summaries.
 * This can't verify the *content* is equivalent, but it catches the most
 * common way the three drift apart: a section (or a shortcut) added to one
 * language and forgotten in the other two.
 */

const README_FILES = ['README.md', 'README.ca.md', 'README.es.md'];

function readReadme(name: string): string {
  return readFileSync(path.resolve(dirname, '../../', name), 'utf8');
}

/** Counts level-2 ("## ") markdown headings. */
function countLevel2Headings(content: string): number {
  return content.split('\n').filter((line) => line.startsWith('## ')).length;
}

/**
 * The keyboard-shortcuts table lives in the 4th "## " section of each
 * README (Overview, Features, Mnemonics, Keyboard shortcuts, ...) — this
 * holds regardless of language, since the section *order* is fixed even
 * though the heading text is translated.
 */
function getShortcutsSection(content: string): string {
  const lines = content.split('\n');
  const headingIndices: number[] = [];
  lines.forEach((line, i) => {
    if (line.startsWith('## ')) headingIndices.push(i);
  });

  const sectionIndex = 3; // 0-based: Overview, Features, Mnemonics, Keyboard shortcuts
  const start = headingIndices[sectionIndex];
  const end = headingIndices[sectionIndex + 1] ?? lines.length;
  if (start === undefined) {
    throw new Error(`Expected at least ${sectionIndex + 1} "## " headings`);
  }
  return lines.slice(start, end).join('\n');
}

/** A markdown table separator row, e.g. `| --- | --- |` or `|---|:---:|`. */
function isSeparatorRow(row: string): boolean {
  const cells = row
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c !== '');
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

/** Counts data rows (excludes the header row and the separator row). */
function countShortcutRows(content: string): number {
  const tableLines = content.split('\n').filter((line) => line.trim().startsWith('|'));
  if (tableLines.length === 0) return 0;
  // First table row is the header; the next is the separator; the rest are data.
  const [, ...rest] = tableLines;
  return rest.filter((row) => !isSeparatorRow(row)).length;
}

describe('README sync (en/ca/es)', () => {
  const contents = README_FILES.map(readReadme);

  it('all three files start with the language-switcher line', () => {
    for (const content of contents) {
      expect(content.split('\n')[0]).toMatch(/English.*Català.*Español/);
    }
  });

  it('all three files have the same number of level-2 (## ) headings', () => {
    const counts = contents.map(countLevel2Headings);
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts[1]).toBe(counts[0]);
    expect(counts[2]).toBe(counts[0]);
  });

  it('all three files have the same number of keyboard-shortcut rows', () => {
    const counts = contents.map((content) => countShortcutRows(getShortcutsSection(content)));
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts[1]).toBe(counts[0]);
    expect(counts[2]).toBe(counts[0]);
  });
});
