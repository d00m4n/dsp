/**
 * tests/unit/paletteContrast.test.ts
 *
 * Regression guard for RF-50b's WCAG contrast requirement: reads the
 * CURRENT (already-generated) `src/styles/flavours.css`, resolves the same
 * semantic-token pairs listed in PHASE-5.md §3.2, and asserts every pair
 * meets its minimum ratio for all four flavours. A future palette-spec
 * tweak (or worse, a hand-edited hex) that breaks contrast fails `npm test`
 * instead of shipping unnoticed.
 */
import { describe, expect, it } from 'vitest';
import { CONTRAST_CHECKS, readCurrentPalette } from '../../tools/palette.ts';
import { contrastRatio } from '../../tools/contrast.ts';

describe('flavours.css contrast (WCAG 2.1)', () => {
  const palette = readCurrentPalette();
  const flavours = Object.keys(palette);

  it('has all expected flavours present', () => {
    expect(flavours.sort()).toEqual([
      'd00man',
      'd00man-dark',
      'dsp-abyss',
      'dsp-dawn',
      'dsp-dusk',
      'dsp-night',
      'reus',
    ]);
  });

  for (const flavour of flavours) {
    for (const check of CONTRAST_CHECKS) {
      it(`${flavour}: ${check.pairName} >= ${check.minimum}:1`, () => {
        const tokens = palette[flavour];
        if (!tokens) throw new Error(`Missing palette for flavour: ${flavour}`);
        const fg = check.fg(tokens);
        const bg = check.bg(tokens);
        const ratio = contrastRatio(fg, bg);
        expect(ratio).toBeGreaterThanOrEqual(check.minimum);
      });
    }
  }
});
