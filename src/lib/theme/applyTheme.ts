import { PALETTE_TOKENS, type PaletteToken } from '../../types/palette';
import type { ThemeConfig } from '../../types/config';
import { resolveTheme, type FlavourOverride } from './resolveFlavour';

/**
 * Tokens repurposed to drive a semantic token directly instead of their own
 * --p-{token} variable. Their default comes from that semantic token (see
 * flavours.css), not from the generated palette, so --p-{token} can't reach
 * it — the theme editor still lets the user override them (as "Widget
 * text"/"Widget icon"/"Widget bar"), just applied here instead of through
 * the palette.
 */
export const SEMANTIC_OVERRIDES: Partial<Record<PaletteToken, string>> = {
  rosewater: '--text-widget',
  flamingo: '--icon-widget',
  pink: '--surface-widget-bar',
};

/**
 * Applies the resolved flavour and runtime tokens to <html>. This is the one
 * place allowed to reference a --p-* variable (accent override), per the
 * contract in flavours.css: components only ever consume semantic tokens.
 * `tabOverride` is the active tab's own flavour override, if any (see
 * `resolveTheme`) — it may itself pick a saved theme via `theme:{id}`.
 */
export function applyTheme(
  theme: ThemeConfig,
  prefersDark: boolean,
  tabOverride?: FlavourOverride,
): void {
  const resolved = resolveTheme(theme, prefersDark, tabOverride);
  const root = document.documentElement;
  root.setAttribute('data-flavour', resolved.flavour);
  root.style.setProperty('--accent', `var(--p-${theme.accent})`);
  root.style.setProperty('--font-scale', String(theme.fontScale));
  root.style.setProperty('--radius', `${theme.radius}px`);

  // theme.iconColor/overrides are the manual "!theme" customizer's live
  // edits: they apply on top of whichever flavour is active, built-in or a
  // saved one picked in a flavour slot, and win over that saved theme's own
  // baked-in values when both set the same thing.
  const iconColor = theme.iconColor ?? resolved.iconColor;
  if (iconColor) {
    root.style.setProperty('--icon', iconColor);
  } else {
    root.style.removeProperty('--icon');
  }

  // Any token without an override must have its inline value removed, so a
  // cleared override actually reverts to the flavour's own value instead of
  // sticking with a stale one.
  for (const token of PALETTE_TOKENS) {
    if (token in SEMANTIC_OVERRIDES) continue;
    const override = theme.overrides?.[token] ?? resolved.overrides?.[token];
    if (override) {
      root.style.setProperty(`--p-${token}`, override);
    } else {
      root.style.removeProperty(`--p-${token}`);
    }
  }

  for (const [token, cssVar] of Object.entries(SEMANTIC_OVERRIDES) as [PaletteToken, string][]) {
    const override = theme.overrides?.[token] ?? resolved.overrides?.[token];
    if (override) {
      root.style.setProperty(cssVar, override);
    } else {
      root.style.removeProperty(cssVar);
    }
  }
}
