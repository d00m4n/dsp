import { PALETTE_TOKENS } from '../../types/palette';
import type { ThemeConfig } from '../../types/config';
import { resolveFlavour, type FlavourOverride } from './resolveFlavour';

/**
 * Applies the resolved flavour and runtime tokens to <html>. This is the one
 * place allowed to reference a --p-* variable (accent override), per the
 * contract in flavours.css: components only ever consume semantic tokens.
 * `tabOverride` is the active tab's own flavour override, if any (see
 * `resolveFlavour`).
 */
export function applyTheme(
  theme: ThemeConfig,
  prefersDark: boolean,
  tabOverride?: FlavourOverride,
): void {
  const flavour = resolveFlavour(theme, prefersDark, tabOverride);
  const root = document.documentElement;
  root.setAttribute('data-flavour', flavour);
  root.style.setProperty('--accent', `var(--p-${theme.accent})`);
  root.style.setProperty('--font-scale', String(theme.fontScale));
  root.style.setProperty('--radius', `${theme.radius}px`);

  if (theme.iconColor) {
    root.style.setProperty('--icon', theme.iconColor);
  } else {
    root.style.removeProperty('--icon');
  }

  // Per-token colour overrides (set via the "!theme" customizer) apply on
  // top of whichever flavour is active, regardless of light/dark — they
  // are not stored per-flavour. Any token without an override must have
  // its inline value removed, so a cleared override actually reverts to
  // the flavour's own value instead of sticking with a stale one.
  for (const token of PALETTE_TOKENS) {
    const override = theme.overrides?.[token];
    if (override) {
      root.style.setProperty(`--p-${token}`, override);
    } else {
      root.style.removeProperty(`--p-${token}`);
    }
  }
}
