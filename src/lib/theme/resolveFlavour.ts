import type { Flavour, ThemeConfig } from '../../types/config';

/** The subset of `Tab` fields a per-tab flavour override can supply. */
export interface FlavourOverride {
  lightFlavour?: Flavour;
  darkFlavour?: Flavour;
  fallbackFlavour?: Flavour;
}

/**
 * Resolves which flavour applies given the current dark-mode media query
 * state, and optionally the active tab's own flavour override (unset
 * fields on the override fall back to the global theme's). Mirrors the
 * inline bootstrap script in index.html so both agree.
 */
export function resolveFlavour(
  theme: ThemeConfig,
  prefersDark: boolean,
  tabOverride?: FlavourOverride,
): Flavour {
  const lightFlavour = tabOverride?.lightFlavour ?? theme.lightFlavour;
  const darkFlavour = tabOverride?.darkFlavour ?? theme.darkFlavour;
  const fallbackFlavour = tabOverride?.fallbackFlavour ?? theme.fallbackFlavour;
  return (prefersDark ? darkFlavour : lightFlavour) || fallbackFlavour;
}
