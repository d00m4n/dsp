import type { Flavour, FlavourChoice, SavedTheme } from '../../types/config';

/** Shared between AppearanceSection.svelte (global) and TabEditor.svelte (per-tab override) pickers. */
export const LIGHT_FLAVOURS: readonly Flavour[] = ['dsp-dawn', 'd00man', 'reus'];
export const DARK_FLAVOURS: readonly Flavour[] = ['dsp-dusk', 'dsp-night', 'dsp-abyss', 'd00man-dark'];

/** Every flavour, regardless of light/dark grouping — used where a picker
 * (e.g. a per-tab override) should allow any flavour in any slot. */
export const ALL_FLAVOURS: readonly Flavour[] = [...LIGHT_FLAVOURS, ...DARK_FLAVOURS];

export function isLightFlavour(flavour: Flavour): boolean {
  return (LIGHT_FLAVOURS as readonly string[]).includes(flavour);
}

/** A choice pickable in a flavour select: a built-in flavour, or a saved theme (shown under its own name). */
export interface FlavourOption {
  value: FlavourChoice;
  label: string;
}

/**
 * Combines the built-in flavours with the user's saved themes into the
 * option list for a picker, so an imported theme shows up in exactly the
 * same place as the rest of the flavours — no separate "apply" step. Saved
 * themes are grouped as light/dark by their own `baseFlavour`.
 */
export function flavourOptions(
  builtIn: readonly Flavour[],
  savedThemes: readonly SavedTheme[] | undefined,
  flavourNames: Record<Flavour, string>,
  group: 'light' | 'dark' | 'all',
): FlavourOption[] {
  const options: FlavourOption[] = builtIn.map((flavour) => ({
    value: flavour,
    label: flavourNames[flavour],
  }));
  for (const saved of savedThemes ?? []) {
    const savedIsLight = isLightFlavour(saved.baseFlavour);
    if (group === 'light' && !savedIsLight) continue;
    if (group === 'dark' && savedIsLight) continue;
    options.push({ value: `theme:${saved.id}`, label: saved.name });
  }
  return options;
}
