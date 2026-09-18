/**
 * tools/palette.ts
 *
 * Build-time-only Node script (never imported from `src/`). Reads the current
 * hex values baked into the four `[data-flavour]` blocks of
 * `src/styles/flavours.css`, converts each to OKLCH, applies a per-flavour
 * `PaletteSpec` (hue rotation / chroma scale / lightness adjust), converts
 * back to sRGB hex, and rewrites the file in place — token names, selectors,
 * comments and the semantic `:root` block are left byte-for-byte untouched;
 * only the 96 hex literals change.
 *
 * Run with:
 *   npm run palette:build   -> regenerate flavours.css
 *   npm run palette:check   -> verify WCAG contrast against the CURRENT file
 *                               without regenerating it (also runs as part
 *                               of `npm test` via tests/unit/paletteContrast.test.ts)
 *
 * All sRGB<->OKLCH math below is hand-rolled (no runtime color library) per
 * PHASE-5-PLAN.md Phase 1 / PHASE-5.md §3.1's explicit "no HSL" + "no new
 * runtime dependency" constraints. This file is devDependency-only tooling
 * (`tsx`), never imported by anything under `src/`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { contrastRatio } from './contrast.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FLAVOURS_CSS_PATH = path.resolve(__dirname, '../src/styles/flavours.css');

// ---------------------------------------------------------------------------
// sRGB <-> OKLCH color math
//
// sRGB -> linear sRGB -> OKLab -> OKLCH, and the reverse. Matrices are
// Björn Ottosson's reference constants for OKLab
// (https://bottosson.github.io/posts/oklab/, "conversion" section) — the
// direct linear-sRGB<->OKLab matrices, not a separately-composed CIE XYZ
// round trip (composing sRGB->XYZ and XYZ->LMS by hand is a common source
// of transcription error; Ottosson's post gives the direct linear-sRGB->LMS
// matrix instead, which is what's used here).
// ---------------------------------------------------------------------------

interface Oklch {
  l: number; // perceptual lightness, roughly 0-1
  c: number; // chroma, roughly 0-0.4 for in-gamut sRGB
  h: number; // hue, degrees, 0-360 (0 for achromatic colors)
}

function srgbChannelToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearChannelToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function hexToOklch(hex: string): Oklch {
  const h = hex.replace('#', '');
  const r8 = parseInt(h.slice(0, 2), 16) / 255;
  const g8 = parseInt(h.slice(2, 4), 16) / 255;
  const b8 = parseInt(h.slice(4, 6), 16) / 255;

  const r = srgbChannelToLinear(r8);
  const g = srgbChannelToLinear(g8);
  const b = srgbChannelToLinear(b8);

  // linear sRGB -> approximate cone responses (LMS)
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(a * a + bb * bb);
  let hDeg = (Math.atan2(bb, a) * 180) / Math.PI;
  if (hDeg < 0) hDeg += 360;

  return { l: L, c, h: c < 1e-6 ? 0 : hDeg };
}

function oklchToHex(oklch: Oklch): string {
  const hRad = (oklch.h * Math.PI) / 180;
  const a = oklch.c * Math.cos(hRad);
  const bb = oklch.c * Math.sin(hRad);
  const L = oklch.l;

  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bb;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS -> linear sRGB (inverse of the forward matrix above)
  const rl = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // Gamut-clip: sRGB channels must land in [0, 1]. Hue rotation / chroma
  // scaling can push some tokens slightly out of gamut; clamping is a
  // pragmatic, consistent choice for a first-pass palette (see PHASE-5-PLAN
  // Phase 1's note that mechanical consistency matters more than perfect
  // gamut mapping here).
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const r255 = Math.round(clamp01(linearChannelToSrgb(rl)) * 255);
  const g255 = Math.round(clamp01(linearChannelToSrgb(gl)) * 255);
  const b255 = Math.round(clamp01(linearChannelToSrgb(bl)) * 255);

  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r255)}${toHex(g255)}${toHex(b255)}`;
}

// ---------------------------------------------------------------------------
// Palette spec
// ---------------------------------------------------------------------------

export interface PaletteSpec {
  /** Degrees to rotate hue by, applied to every chromatic token. */
  hueRotation: number;
  /** Multiplier applied to OKLCH chroma (saturation-like axis). */
  chromaScale: number;
  /** Additive shift applied to OKLCH lightness (fine per-flavour trim). */
  lightnessAdjust: number;
}

type FlavourName = 'dsp-dawn' | 'dsp-dusk' | 'dsp-night' | 'dsp-abyss';

/**
 * First-pass default spec, one per flavour (dawn/dusk/night/abyss need
 * different lightness handling to keep their light/dark character).
 * hueRotation sits in the 15-30deg range PHASE-5.md §3.1 suggests;
 * chromaScale stays close to 1.0; lightnessAdjust is a small per-flavour
 * trim, tuned here just enough to clear the WCAG minimums checked by
 * checkPalette() below.
 *
 * THIS IS AN AESTHETIC FIRST DRAFT, NOT A FINAL DECISION — PHASE-5.md §3.1
 * explicitly calls the exact rotation/scale a human judgment call. Flagged
 * in the Phase 1 report for review/tuning before publishing.
 */
export const DEFAULT_SPECS: Record<FlavourName, PaletteSpec> = {
  'dsp-dawn': { hueRotation: 20, chromaScale: 1.0, lightnessAdjust: -0.02 },
  'dsp-dusk': { hueRotation: 20, chromaScale: 1.0, lightnessAdjust: 0.02 },
  'dsp-night': { hueRotation: 20, chromaScale: 1.0, lightnessAdjust: 0.03 },
  'dsp-abyss': { hueRotation: 20, chromaScale: 1.0, lightnessAdjust: 0.035 },
};

/**
 * Catppuccin's "neutral" tokens (very low chroma already: grays/near-grays
 * used for surfaces and text). Rotating hue barely affects these, but a full
 * chromaScale multiply can visibly tint/"dirty" a near-gray. Exact names per
 * the current flavours.css.
 */
const NEUTRAL_TOKENS = new Set([
  'text',
  'subtext1',
  'subtext0',
  'overlay2',
  'overlay1',
  'overlay0',
  'surface2',
  'surface1',
  'surface0',
  'base',
  'mantle',
  'crust',
]);

/**
 * Chroma threshold (OKLCH C, roughly 0-0.4 for in-gamut sRGB) below which a
 * token is considered "already low-chroma" and gets its chromaScale
 * dampened rather than applied in full. Chosen empirically: Catppuccin's
 * neutral tokens sit around C ~0.005-0.02, while chromatic accent tokens
 * (red, green, mauve, ...) sit at C ~0.08-0.2+, so 0.03 cleanly separates
 * the two groups with margin.
 */
const NEUTRAL_CHROMA_THRESHOLD = 0.03;

/**
 * How much of (chromaScale - 1) to actually apply to a dampened neutral
 * token. 0.3 means a neutral only gets 30% of the requested chroma change,
 * keeping near-grays close to gray even when chromaScale pushes accents
 * noticeably more saturated.
 */
const NEUTRAL_DAMPING_FACTOR = 0.3;

function effectiveChromaScale(tokenName: string, chroma: number, spec: PaletteSpec): number {
  const isNeutralToken = NEUTRAL_TOKENS.has(tokenName);
  const isLowChroma = chroma < NEUTRAL_CHROMA_THRESHOLD;
  if (isNeutralToken || isLowChroma) {
    return 1 + (spec.chromaScale - 1) * NEUTRAL_DAMPING_FACTOR;
  }
  return spec.chromaScale;
}

function applySpec(tokenName: string, hex: string, spec: PaletteSpec): string {
  const oklch = hexToOklch(hex);
  const scale = effectiveChromaScale(tokenName, oklch.c, spec);
  const rotated: Oklch = {
    l: Math.max(0, Math.min(1, oklch.l + spec.lightnessAdjust)),
    c: Math.max(0, oklch.c * scale),
    h: (((oklch.h + spec.hueRotation) % 360) + 360) % 360,
  };
  return oklchToHex(rotated);
}

// ---------------------------------------------------------------------------
// flavours.css parsing / rewriting
// ---------------------------------------------------------------------------

interface FlavourBlock {
  flavourName: FlavourName;
  /** Full matched block text, `[data-flavour="x"] { ... }` */
  fullMatch: string;
  /** Ordered list of (token name without --p- prefix, hex value) */
  tokens: Array<{ name: string; hex: string }>;
}

const FLAVOUR_BLOCK_RE = /\[data-flavour="([^"]+)"\]\s*\{([^}]*)\}/g;
const TOKEN_RE = /--p-([a-z0-9]+):\s*(#[0-9a-fA-F]{6});/g;

function parseFlavourBlocks(css: string): FlavourBlock[] {
  const blocks: FlavourBlock[] = [];
  let match: RegExpExecArray | null;
  FLAVOUR_BLOCK_RE.lastIndex = 0;
  // Non-null assertions below are safe: FLAVOUR_BLOCK_RE / TOKEN_RE's capture
  // groups are never optional in the pattern, so a successful exec() always
  // populates them.
  while ((match = FLAVOUR_BLOCK_RE.exec(css)) !== null) {
    const fullMatch = match[0];
    const flavourName = match[1]!;
    const body = match[2]!;
    const tokens: Array<{ name: string; hex: string }> = [];
    let tokenMatch: RegExpExecArray | null;
    TOKEN_RE.lastIndex = 0;
    while ((tokenMatch = TOKEN_RE.exec(body)) !== null) {
      tokens.push({ name: tokenMatch[1]!, hex: tokenMatch[2]! });
    }
    blocks.push({ flavourName: flavourName as FlavourName, fullMatch, tokens });
  }
  return blocks;
}

/** Looks up a required token, throwing a clear error if it's absent (an
 * internal-invariant failure — flavours.css always has all 24 tokens per
 * flavour — rather than something a caller is expected to recover from). */
function requireToken(tokens: Record<string, string>, name: string): string {
  const value = tokens[name];
  if (value === undefined) {
    throw new Error(`Missing expected --p-${name} token in flavours.css`);
  }
  return value;
}

/** Reads flavours.css and returns { flavourName -> { tokenName -> hex } }. */
export function readCurrentPalette(
  cssPath: string = FLAVOURS_CSS_PATH,
): Record<string, Record<string, string>> {
  const css = readFileSync(cssPath, 'utf8');
  const blocks = parseFlavourBlocks(css);
  const result: Record<string, Record<string, string>> = {};
  for (const block of blocks) {
    const flavourTokens: Record<string, string> = {};
    for (const { name, hex } of block.tokens) {
      flavourTokens[name] = hex;
    }
    result[block.flavourName] = flavourTokens;
  }
  return result;
}

/**
 * Foreground/background token pairs checked for WCAG contrast, expressed in
 * raw `--p-*` token names (without the `p-` prefix) rather than semantic
 * token names, so `enforceContrast` can nudge the exact hex it generated.
 * Mirrors CONTRAST_CHECKS below one-for-one.
 */
const CONTRAST_PAIR_TOKENS: Array<{ fg: string; bg: string; minimum: number }> = [
  { fg: 'text', bg: 'base', minimum: 4.5 },
  { fg: 'text', bg: 'surface0', minimum: 4.5 },
  { fg: 'subtext1', bg: 'base', minimum: 4.5 },
  { fg: 'subtext0', bg: 'base', minimum: 4.5 },
  { fg: 'overlay1', bg: 'base', minimum: 3 },
  { fg: 'mauve', bg: 'base', minimum: 3 },
  { fg: 'crust', bg: 'mauve', minimum: 4.5 },
  { fg: 'red', bg: 'base', minimum: 4.5 },
  { fg: 'yellow', bg: 'base', minimum: 4.5 },
  { fg: 'green', bg: 'base', minimum: 4.5 },
  { fg: 'blue', bg: 'base', minimum: 4.5 },
];

/**
 * Automated WCAG safety net, run after the OKLCH spec transform.
 *
 * Rotating hue in OKLCH keeps *perceptual* lightness constant, but it does
 * NOT keep WCAG relative luminance constant (WCAG luminance is a fixed
 * Rec.709 weighting of *sRGB* channels, which shift non-trivially under a
 * hue rotation even at fixed OKLab L). Catppuccin's saturated accent/status
 * colors already sit close to the WCAG minimums against their own base
 * (PHASE-5.md §3.2 warns about this explicitly), so a naive hue rotation can
 * tip a passing pair into failure.
 *
 * Rather than hand-tuning 4 flavours x 11 pairs of hex values by hand (which
 * PHASE-5.md explicitly forbids — "no hand-edited hex values"), this nudges
 * only the failing pair's foreground token a small step further from its
 * background's luminance (darker if it's already the darker of the two,
 * lighter otherwise), in OKLCH L, re-checking after every step; if lightness
 * alone can't clear the gap after enough steps (some hues have limited
 * achievable contrast range at high chroma), it also gently reduces chroma.
 * This keeps the result deterministic, reproducible, and still governed
 * entirely by this script rather than by hand-edited values.
 */
function enforceContrast(tokens: Record<string, string>): Record<string, string> {
  const t = { ...tokens };
  const MAX_ROUNDS = 5;
  const MAX_ITER_PER_PAIR = 400;
  const CHROMA_REDUCTION_AFTER_ITER = 150;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let anyFail = false;
    for (const { fg, bg, minimum } of CONTRAST_PAIR_TOKENS) {
      let iter = 0;
      let chromaFactor = 1;
      while (iter < MAX_ITER_PER_PAIR) {
        const fgHex = requireToken(t, fg);
        const bgHex = requireToken(t, bg);
        const ratio = contrastRatio(fgHex, bgHex);
        if (ratio >= minimum) break;
        anyFail = true;
        const fgLum = relativeLuminanceLocal(fgHex);
        const bgLum = relativeLuminanceLocal(bgHex);
        const direction = fgLum >= bgLum ? 1 : -1;
        const oklch = hexToOklch(fgHex);
        const newL = Math.max(0.01, Math.min(0.99, oklch.l + direction * 0.004));
        if (iter > CHROMA_REDUCTION_AFTER_ITER) chromaFactor *= 0.99;
        t[fg] = oklchToHex({ l: newL, c: oklch.c * chromaFactor, h: oklch.h });
        iter++;
      }
    }
    if (!anyFail) break;
  }
  return t;
}

// Local relative-luminance helper (kept separate from contrast.ts's
// hexToRgb-based one purely to avoid a second file read at module scope;
// same WCAG formula).
function relativeLuminanceLocal(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function buildPalette(
  specs: Record<FlavourName, PaletteSpec>,
): Record<FlavourName, Record<string, string>> {
  const css = readFileSync(FLAVOURS_CSS_PATH, 'utf8');
  const blocks = parseFlavourBlocks(css);
  const out = {} as Record<FlavourName, Record<string, string>>;
  for (const block of blocks) {
    const spec = specs[block.flavourName];
    // Hand-authored flavours (e.g. "d00man", "reus") have no spec here by
    // design — they're not Catppuccin-derived and are left untouched by
    // `palette:build`. See the comment above their blocks in flavours.css.
    if (!spec) continue;
    const rotated: Record<string, string> = {};
    for (const { name, hex } of block.tokens) {
      rotated[name] = applySpec(name, hex, spec);
    }
    out[block.flavourName] = enforceContrast(rotated);
  }
  return out;
}

function writePalette(specs: Record<FlavourName, PaletteSpec>): void {
  const css = readFileSync(FLAVOURS_CSS_PATH, 'utf8');
  const generated = buildPalette(specs);

  const rewritten = css.replace(
    FLAVOUR_BLOCK_RE,
    (fullMatch: string, flavourNameRaw: string, body: string) => {
      const flavourName = flavourNameRaw as FlavourName;
      const newHexByToken = generated[flavourName];
      // Hand-authored flavours aren't in `generated` (see the `continue`
      // above) — leave their block exactly as written.
      if (!newHexByToken) return fullMatch;
      const newBody = body.replace(TOKEN_RE, (_tokenMatch: string, name: string) => {
        const newHex = requireToken(newHexByToken, name);
        return `--p-${name}: ${newHex};`;
      });
      return fullMatch.replace(body, newBody);
    },
  );

  writeFileSync(FLAVOURS_CSS_PATH, rewritten, 'utf8');
}

// ---------------------------------------------------------------------------
// Contrast verification (shared with tests/unit/paletteContrast.test.ts)
// ---------------------------------------------------------------------------

/**
 * Semantic-token pairs to verify per flavour, mirroring PHASE-5.md §3.2's
 * table exactly. Each `resolve` maps a flavour's `--p-*` values (as read
 * from flavours.css) to the two hex colors being compared, matching how
 * `:root`'s semantic tokens alias `--p-*` per flavour.
 */
export interface ContrastCheck {
  pairName: string;
  minimum: number;
  fg: (p: Record<string, string>) => string;
  bg: (p: Record<string, string>) => string;
}

export const CONTRAST_CHECKS: ContrastCheck[] = [
  {
    pairName: 'text-primary/surface-page',
    minimum: 4.5,
    fg: (p) => requireToken(p, 'text'),
    bg: (p) => requireToken(p, 'base'),
  },
  {
    pairName: 'text-primary/surface-raised',
    minimum: 4.5,
    fg: (p) => requireToken(p, 'text'),
    bg: (p) => requireToken(p, 'surface0'),
  },
  {
    pairName: 'text-secondary/surface-page',
    minimum: 4.5,
    fg: (p) => requireToken(p, 'subtext1'),
    bg: (p) => requireToken(p, 'base'),
  },
  {
    pairName: 'text-muted/surface-page',
    minimum: 4.5,
    fg: (p) => requireToken(p, 'subtext0'),
    bg: (p) => requireToken(p, 'base'),
  },
  {
    pairName: 'text-faint/surface-page',
    minimum: 3,
    fg: (p) => requireToken(p, 'overlay1'),
    bg: (p) => requireToken(p, 'base'),
  },
  {
    pairName: 'accent/surface-page',
    minimum: 3,
    fg: (p) => requireToken(p, 'mauve'),
    bg: (p) => requireToken(p, 'base'),
  },
  {
    pairName: 'text-on-accent/accent',
    minimum: 4.5,
    fg: (p) => requireToken(p, 'crust'),
    bg: (p) => requireToken(p, 'mauve'),
  },
  {
    pairName: 'focus-ring/surface-page',
    minimum: 3,
    fg: (p) => requireToken(p, 'mauve'), // --focus-ring: var(--accent) -> --p-mauve
    bg: (p) => requireToken(p, 'base'),
  },
  {
    pairName: 'status-danger/surface-page',
    minimum: 4.5,
    fg: (p) => requireToken(p, 'red'),
    bg: (p) => requireToken(p, 'base'),
  },
  {
    pairName: 'status-warning/surface-page',
    minimum: 4.5,
    fg: (p) => requireToken(p, 'yellow'),
    bg: (p) => requireToken(p, 'base'),
  },
  {
    pairName: 'status-success/surface-page',
    minimum: 4.5,
    fg: (p) => requireToken(p, 'green'),
    bg: (p) => requireToken(p, 'base'),
  },
  {
    pairName: 'status-info/surface-page',
    minimum: 4.5,
    fg: (p) => requireToken(p, 'blue'),
    bg: (p) => requireToken(p, 'base'),
  },
];

export interface CheckResult {
  flavour: string;
  pairName: string;
  minimum: number;
  ratio: number;
  pass: boolean;
}

export function checkPalette(
  palette: Record<string, Record<string, string>>,
): CheckResult[] {
  const results: CheckResult[] = [];
  for (const [flavour, tokens] of Object.entries(palette)) {
    for (const check of CONTRAST_CHECKS) {
      const fg = check.fg(tokens);
      const bg = check.bg(tokens);
      const ratio = contrastRatio(fg, bg);
      results.push({
        flavour,
        pairName: check.pairName,
        minimum: check.minimum,
        ratio,
        pass: ratio >= check.minimum,
      });
    }
  }
  return results;
}

function printResults(results: CheckResult[]): boolean {
  const flavourWidth = Math.max(...results.map((r) => r.flavour.length), 'flavour'.length);
  const pairWidth = Math.max(...results.map((r) => r.pairName.length), 'pair'.length);
  const header = `${'flavour'.padEnd(flavourWidth)}  ${'pair'.padEnd(pairWidth)}  ratio   min    result`;
  console.log(header);
  console.log('-'.repeat(header.length));
  let allPass = true;
  for (const r of results) {
    if (!r.pass) allPass = false;
    const status = r.pass ? 'PASS' : 'FAIL';
    console.log(
      `${r.flavour.padEnd(flavourWidth)}  ${r.pairName.padEnd(pairWidth)}  ${r.ratio
        .toFixed(2)
        .padStart(5)}  ${String(r.minimum).padStart(4)}:1  ${status}`,
    );
  }
  console.log('-'.repeat(header.length));
  console.log(allPass ? 'All pairs pass.' : 'One or more pairs FAILED WCAG minimums.');
  return allPass;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');

  if (!checkOnly) {
    console.log('Regenerating src/styles/flavours.css from DEFAULT_SPECS ...');
    writePalette(DEFAULT_SPECS);
    console.log('Done. Run `npm run palette:check` to verify contrast.');
    return;
  }

  const palette = readCurrentPalette();
  const results = checkPalette(palette);
  const allPass = printResults(results);
  if (!allPass) {
    process.exitCode = 1;
  }
}

const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
