/**
 * Palette token identifiers.
 *
 * Generated from the Catppuccin palette structure; see NOTICE.
 * The names describe positions in the palette, not the final colours.
 */
export const PALETTE_TOKENS = [
  'rosewater',
  'flamingo',
  'pink',
  'mauve',
  'red',
  'maroon',
  'peach',
  'yellow',
  'green',
  'teal',
  'sky',
  'sapphire',
  'blue',
  'lavender',
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
] as const;

export type PaletteToken = (typeof PALETTE_TOKENS)[number];

/** Tokens that make sense as an accent colour choice in settings. */
export const ACCENT_TOKENS: readonly PaletteToken[] = PALETTE_TOKENS.filter(
  (token) => !token.startsWith('surface') && !token.startsWith('overlay') &&
    !['base', 'mantle', 'crust', 'text', 'subtext0', 'subtext1'].includes(token),
);
