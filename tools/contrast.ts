/**
 * tools/contrast.ts
 *
 * Pure WCAG 2.1 contrast-ratio helpers, operating on hex color strings.
 * Used by tools/palette.ts (build + --check mode) and by
 * tests/unit/paletteContrast.test.ts. Deliberately dependency-free and
 * side-effect-free so both a Node script and vitest can import it.
 *
 * Spec: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

/** Parses a `#rrggbb` (or `#rgb`) hex string into 0-255 integer channels. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Formats 0-255 integer channels as a lowercase `#rrggbb` hex string. */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * WCAG sRGB channel linearization.
 * c is a 0-1 sRGB channel value; returns the linear-light value.
 */
function linearizeChannel(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Relative luminance of a hex color per WCAG 2.1 §1.4.3 / §G18,
 * using the standard Rec. 709 luma weights (0.2126 / 0.7152 / 0.0722).
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const rl = linearizeChannel(r / 255);
  const gl = linearizeChannel(g / 255);
  const bl = linearizeChannel(b / 255);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/**
 * WCAG 2.1 contrast ratio between two hex colors: (L1 + 0.05) / (L2 + 0.05),
 * with L1 the larger of the two relative luminances. Result is always >= 1.
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const l1 = Math.max(la, lb);
  const l2 = Math.min(la, lb);
  return (l1 + 0.05) / (l2 + 0.05);
}
