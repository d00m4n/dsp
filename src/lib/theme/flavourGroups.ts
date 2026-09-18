import type { Flavour } from '../../types/config';

/** Shared between AppearanceSection.svelte (global) and TabEditor.svelte (per-tab override) pickers. */
export const LIGHT_FLAVOURS: readonly Flavour[] = ['dsp-dawn', 'd00man', 'reus'];
export const DARK_FLAVOURS: readonly Flavour[] = ['dsp-dusk', 'dsp-night', 'dsp-abyss', 'd00man-dark'];

/** Every flavour, regardless of light/dark grouping — used where a picker
 * (e.g. a per-tab override) should allow any flavour in any slot. */
export const ALL_FLAVOURS: readonly Flavour[] = [...LIGHT_FLAVOURS, ...DARK_FLAVOURS];
