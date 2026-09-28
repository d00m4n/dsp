import type { Flavour, FlavourChoice, SavedTheme, ThemeConfig } from '../../types/config';
import type { PaletteToken } from '../../types/palette';

/** The subset of `Tab` fields a per-tab flavour override can supply. */
export interface FlavourOverride {
  lightFlavour?: FlavourChoice;
  darkFlavour?: FlavourChoice;
  fallbackFlavour?: FlavourChoice;
}

/** The full look a resolved `FlavourChoice` maps to. */
export interface ResolvedTheme {
  flavour: Flavour;
  overrides?: Partial<Record<PaletteToken, string>>;
  iconColor?: string;
}

/** A hardcoded last resort if even `fallbackFlavour` turns out to be a dangling `theme:{id}` reference. */
const HARD_FALLBACK: Flavour = 'd00man-dark';

function lookupChoice(
  choice: FlavourChoice,
  savedThemes: readonly SavedTheme[],
): ResolvedTheme | undefined {
  if (!choice.startsWith('theme:')) return { flavour: choice as Flavour };
  const id = choice.slice('theme:'.length);
  const saved = savedThemes.find((t) => t.id === id);
  if (!saved) return undefined;
  return { flavour: saved.baseFlavour, overrides: saved.overrides, iconColor: saved.iconColor };
}

/**
 * Resolves the full look (flavour, plus any saved-theme overrides/icon
 * colour) that applies given the current dark-mode media query state, and
 * optionally the active tab's own flavour override (unset fields on the
 * override fall back to the global theme's). A `theme:{id}` choice that no
 * longer names a saved theme (deleted since being picked) falls back the
 * same way an unset field would. Mirrors the inline bootstrap script in
 * index.html, which resolves just the flavour half before first paint.
 */
export function resolveTheme(
  theme: ThemeConfig,
  prefersDark: boolean,
  tabOverride?: FlavourOverride,
): ResolvedTheme {
  const savedThemes = theme.savedThemes ?? [];
  const lightChoice = tabOverride?.lightFlavour ?? theme.lightFlavour;
  const darkChoice = tabOverride?.darkFlavour ?? theme.darkFlavour;
  const fallbackChoice = tabOverride?.fallbackFlavour ?? theme.fallbackFlavour;
  const primaryChoice = (prefersDark ? darkChoice : lightChoice) || fallbackChoice;
  return (
    lookupChoice(primaryChoice, savedThemes) ??
    lookupChoice(fallbackChoice, savedThemes) ?? { flavour: HARD_FALLBACK }
  );
}

/** Just the flavour id, for callers (e.g. the theme editor's colour preview) that don't need overrides. */
export function resolveFlavour(
  theme: ThemeConfig,
  prefersDark: boolean,
  tabOverride?: FlavourOverride,
): Flavour {
  return resolveTheme(theme, prefersDark, tabOverride).flavour;
}
