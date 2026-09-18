import type { PaletteToken } from './palette';

/** Palette identifiers. Deliberately not named after any upstream project. */
export type Flavour =
  | 'dsp-dawn'
  | 'dsp-dusk'
  | 'dsp-night'
  | 'dsp-abyss'
  | 'd00man'
  | 'd00man-dark'
  | 'reus';

export interface AppConfig {
  /** Schema version, used by the migration pipeline. */
  schemaVersion: number;
  theme: ThemeConfig;
  search: SearchConfig;
  widgets: Widget[];
  tabs: Tab[];
  behaviour: BehaviourConfig;
}

export interface ThemeConfig {
  /** Always follows prefers-color-scheme; there is no manual override. */
  lightFlavour: Flavour;
  darkFlavour: Flavour;
  /** Palette used when the media query cannot be resolved. Must be a dark one. */
  fallbackFlavour: Flavour;
  /** Optional overrides for individual palette tokens. */
  overrides?: Partial<Record<PaletteToken, string>>;
  accent: PaletteToken;
  /** Colour used for every rendered icon (IconGlyph). Defaults to `--accent` when unset. */
  iconColor?: string;
  fontScale: number; // 0.8 - 1.4
  radius: number; // px
  backdrop: BackdropConfig;
  contentWidth: ContentWidthConfig;
}

export interface ContentWidthConfig {
  /** 'full' always fills the viewport; 'percent'/'fixed' cap it and centre it. */
  mode: 'full' | 'percent' | 'fixed';
  percent: number; // 10 - 100, used when mode is 'percent'
  fixedPx: number; // 320 - 3000, used when mode is 'fixed'
}

export interface BackdropConfig {
  kind: 'none' | 'solid' | 'image';
  /**
   * Where the backdrop image comes from. Either:
   * - `wallpapers/{file}`: a relative path under the deployed `/wallpapers`
   *   directory (static, bundled with the app). Animated formats are allowed.
   * - `idb:{id}`: a reference to a user-picked image stored in IndexedDB
   *   (see `src/lib/wallpapers/idbStore.ts`); `{id}` is the wallpaper's id.
   */
  source?: string;
  /**
   * Still image shown instead of `source` when the user prefers reduced motion,
   * or when `source` fails to load. Strongly recommended for animated backdrops.
   */
  staticFallback?: string;
  fit: 'cover' | 'contain' | 'tile';
  blur: number; // px
  opacity: number; // 0 - 1
}

export interface SearchConfig {
  defaultEngineId: string;
  engines: SearchEngine[];
  /** Treat input that parses as a URL as a direct navigation. */
  detectUrls: boolean;
  /** Suggestions come only from local links; never from a remote API. */
  suggestFromLinks: boolean;
}

export interface SearchEngine {
  id: string; // e.g. 'd'
  name: string; // e.g. 'DuckDuckGo'
  /** Query template; '{query}' is replaced with the URL-encoded input. */
  template: string; // 'https://duckduckgo.com/?q={query}'
  icon?: string;
}

export interface Tab {
  id: string;
  name: string;
  icon: string; // tabler icon name
  /** Relative path under /wallpapers. Animated formats are allowed. */
  banner?: string;
  bannerStatic?: string;
  /**
   * Per-tab flavour override: when set, replaces the matching field of the
   * global `theme` config while this tab is active. Still follows
   * prefers-color-scheme like the global setting does — a tab can pick a
   * different light/dark *pair*, not force one regardless of the system.
   * Unset fields fall back to the global theme's own value.
   */
  lightFlavour?: Flavour;
  darkFlavour?: Flavour;
  fallbackFlavour?: Flavour;
  groups: LinkGroup[];
}

export interface LinkGroup {
  id: string;
  name: string;
  icon?: string;
  links: Link[];
}

export interface Link {
  id: string;
  /**
   * Display name. An '&' marks the following character as the mnemonic key
   * ('Git&Hub' -> 'h'). Use '&&' for a literal ampersand. When no '&' is present
   * the mnemonic is resolved automatically (see the mnemonic algorithm).
   */
  name: string;
  url: string;
  icon?: string;
  /** Open in a new tab instead of the current one. */
  newTab?: boolean;
}

/* ---------- Widgets ---------- */

export type WidgetSlot =
  | 'header-left'
  | 'header-center'
  | 'header-right'
  | 'footer-left'
  | 'footer-center'
  | 'footer-right';

interface WidgetBase {
  id: string;
  slot: WidgetSlot;
  /** Position within the slot, ascending. */
  order: number;
  enabled: boolean;
}

export interface ClockWidget extends WidgetBase {
  type: 'clock';
  label?: string;
  timezone: string; // IANA, e.g. 'Europe/Madrid'
  hour12: boolean;
  showSeconds: boolean;
  locale: string; // e.g. 'ca-ES'
}

export interface DateWidget extends WidgetBase {
  type: 'date';
  label?: string;
  timezone: string;
  locale: string;
  style: 'full' | 'long' | 'medium' | 'short';
  /** Uppercase the first letter (Catalan and Spanish render months lowercase). */
  capitalise: boolean;
  showWeekNumber: boolean;
}

export interface WeatherWidget extends WidgetBase {
  type: 'weather';
  latitude: number;
  longitude: number;
  label: string;
  units: 'metric' | 'imperial';
  /** Cache lifetime in minutes. */
  refreshMinutes: number;
}

export interface GreetingWidget extends WidgetBase {
  type: 'greeting';
  name: string;
  /** Message templates keyed by part of day. '{name}' is substituted. */
  templates?: Partial<Record<'morning' | 'afternoon' | 'evening' | 'night', string>>;
}

export interface PhraseWidget extends WidgetBase {
  type: 'phrase';
  label?: string;
  /** One entry is picked at random each time the page loads. */
  phrases: string[];
}

export type Widget = ClockWidget | DateWidget | WeatherWidget | GreetingWidget | PhraseWidget;

export interface BehaviourConfig {
  /** Which tab is active on load; 'last' restores the previous session. */
  startTab: 'first' | 'last' | string;
  confirmBeforeReset: boolean;
  /** Show the mnemonic letter underlined on every link card. */
  showMnemonics: boolean;
  /** Browser tab title (document.title). */
  pageTitle: string;
  /**
   * Where the footer (footer-* widgets) sits: pinned to the bottom of the
   * viewport, or immediately after the last row of links.
   */
  footerPosition: 'page-end' | 'after-content';
}
