import { PALETTE_TOKENS, type PaletteToken } from '../../types/palette';
import type {
  AppConfig,
  BackdropConfig,
  BehaviourConfig,
  ClockWidget,
  ContentWidthConfig,
  DateWidget,
  Flavour,
  GreetingWidget,
  Link,
  LinkGroup,
  PhraseWidget,
  SearchConfig,
  SearchEngine,
  Tab,
  ThemeConfig,
  WeatherWidget,
  Widget,
  WidgetSlot,
} from '../../types/config';
import { DEFAULT_CONFIG } from './defaults';
import { isAllowedUrl } from '../search/protocols';

export interface ConfigError {
  /** Dotted/bracket path to the offending field, e.g. 'tabs[0].links[3].url'. */
  path: string;
  reason: string;
}

export interface ParseResult {
  config: AppConfig;
  errors: ConfigError[];
}

const FLAVOURS: readonly Flavour[] = [
  'dsp-dawn',
  'dsp-dusk',
  'dsp-night',
  'dsp-abyss',
  'd00man',
  'd00man-dark',
  'reus',
];
const WIDGET_SLOTS: readonly WidgetSlot[] = [
  'header-left',
  'header-center',
  'header-right',
  'footer-left',
  'footer-center',
  'footer-right',
];
const BACKDROP_KINDS = ['none', 'solid', 'image'] as const;
const FOOTER_POSITIONS = ['page-end', 'after-content'] as const;
/** A backdrop `source` is either a bundled wallpaper path or an IndexedDB reference. */
const BACKDROP_SOURCE_PATTERN = /^wallpapers\/|^idb:[a-zA-Z0-9_-]+$/;
const BACKDROP_FITS = ['cover', 'contain', 'tile'] as const;
const CONTENT_WIDTH_MODES = ['full', 'percent', 'fixed'] as const;
const DATE_STYLES = ['full', 'long', 'medium', 'short'] as const;
const WIDGET_TYPES = ['clock', 'date', 'weather', 'greeting', 'phrase'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function report(errors: ConfigError[], path: string, reason: string): void {
  errors.push({ path, reason });
}

function str(value: unknown, path: string, fallback: string, errors: ConfigError[]): string {
  if (typeof value === 'string') return value;
  report(errors, path, `expected a string, got ${typeof value}`);
  return fallback;
}

function optionalStr(value: unknown, path: string, errors: ConfigError[]): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  report(errors, path, `expected a string or undefined, got ${typeof value}`);
  return undefined;
}

/** Non-string or blank entries are dropped and reported rather than kept as noise. */
function stringArray(value: unknown, path: string, errors: ConfigError[]): string[] {
  if (!isArray(value)) {
    if (value !== undefined) report(errors, path, `expected an array, got ${typeof value}`);
    return [];
  }
  const result: string[] = [];
  value.forEach((entry, i) => {
    if (typeof entry === 'string' && entry.trim() !== '') {
      result.push(entry);
    } else {
      report(errors, `${path}[${i}]`, `expected a non-empty string, got ${JSON.stringify(entry)}`);
    }
  });
  return result;
}

function bool(value: unknown, path: string, fallback: boolean, errors: ConfigError[]): boolean {
  if (typeof value === 'boolean') return value;
  report(errors, path, `expected a boolean, got ${typeof value}`);
  return fallback;
}

function num(value: unknown, path: string, fallback: number, errors: ConfigError[]): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  report(errors, path, `expected a finite number, got ${typeof value}`);
  return fallback;
}

function clamped(
  value: unknown,
  path: string,
  fallback: number,
  min: number,
  max: number,
  errors: ConfigError[],
): number {
  const n = num(value, path, fallback, errors);
  if (n < min || n > max) {
    report(errors, path, `${n} is outside [${min}, ${max}]`);
    return Math.min(Math.max(n, min), max);
  }
  return n;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  fallback: T,
  errors: ConfigError[],
): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  report(errors, path, `expected one of [${allowed.join(', ')}], got ${JSON.stringify(value)}`);
  return fallback;
}

/** Like `oneOf`, but `undefined` input is left as undefined instead of reported/defaulted. */
function optionalOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  errors: ConfigError[],
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  report(errors, path, `expected one of [${allowed.join(', ')}], got ${JSON.stringify(value)}`);
  return undefined;
}

function url(value: unknown, path: string, fallback: string, errors: ConfigError[]): string {
  if (typeof value === 'string') {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      report(errors, path, `'${value}' is not a valid URL`);
      return fallback;
    }
    if (!isAllowedUrl(value)) {
      report(errors, path, `protocol '${parsed.protocol}' is not allowed`);
      return fallback;
    }
    return value;
  }
  report(errors, path, `expected a URL string, got ${typeof value}`);
  return fallback;
}

/**
 * Validates an IANA timezone name; Intl throws on an unknown one. Exported
 * so UI components (the widgets settings section) can reuse the exact same
 * try/catch logic instead of reimplementing it.
 */
export function timezone(value: unknown, path: string, fallback: string, errors: ConfigError[]): string {
  const tz = str(value, path, fallback, errors);
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    report(errors, path, `'${tz}' is not a valid IANA timezone`);
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

/**
 * Validates a BCP 47 locale tag; same try/catch shape as `timezone`, using
 * `Intl.DateTimeFormat`'s locale argument instead of its `timeZone` option.
 * Exported for reuse by the widgets settings UI.
 */
export function locale(value: unknown, path: string, fallback: string, errors: ConfigError[]): string {
  const loc = str(value, path, fallback, errors);
  try {
    new Intl.DateTimeFormat(loc);
    return loc;
  } catch {
    report(errors, path, `'${loc}' is not a valid locale`);
    return fallback;
  }
}

/** Ensures `candidate` is a non-empty, unique string within `used`, regenerating if needed. */
function uniqueId(
  candidate: unknown,
  used: Set<string>,
  path: string,
  prefix: string,
  errors: ConfigError[],
): string {
  const id = typeof candidate === 'string' && candidate.length > 0 ? candidate : '';
  if (id === '') {
    if (candidate !== undefined) report(errors, path, `expected a non-empty string id`);
  }
  if (id !== '' && !used.has(id)) {
    used.add(id);
    return id;
  }
  if (id !== '') {
    report(errors, path, `duplicate id '${id}', regenerating`);
  }
  let n = 0;
  let generated = `${prefix}-${n}`;
  while (used.has(generated)) {
    n += 1;
    generated = `${prefix}-${n}`;
  }
  used.add(generated);
  return generated;
}

function validateBackdrop(
  value: unknown,
  path: string,
  fallback: BackdropConfig,
  errors: ConfigError[],
): BackdropConfig {
  if (!isRecord(value)) {
    if (value !== undefined) report(errors, path, `expected an object, got ${typeof value}`);
    return fallback;
  }
  let source = optionalStr(value.source, `${path}.source`, errors);
  if (source !== undefined && !BACKDROP_SOURCE_PATTERN.test(source)) {
    report(
      errors,
      `${path}.source`,
      `'${source}' must match ^wallpapers/ or ^idb:[a-zA-Z0-9_-]+$`,
    );
    source = undefined;
  }
  return {
    kind: oneOf(value.kind, BACKDROP_KINDS, `${path}.kind`, fallback.kind, errors),
    source,
    staticFallback: optionalStr(value.staticFallback, `${path}.staticFallback`, errors),
    fit: oneOf(value.fit, BACKDROP_FITS, `${path}.fit`, fallback.fit, errors),
    blur: clamped(value.blur, `${path}.blur`, fallback.blur, 0, 100, errors),
    opacity: clamped(value.opacity, `${path}.opacity`, fallback.opacity, 0, 1, errors),
  };
}

function validateContentWidth(
  value: unknown,
  path: string,
  fallback: ContentWidthConfig,
  errors: ConfigError[],
): ContentWidthConfig {
  if (!isRecord(value)) {
    if (value !== undefined) report(errors, path, `expected an object, got ${typeof value}`);
    return fallback;
  }
  return {
    mode: oneOf(value.mode, CONTENT_WIDTH_MODES, `${path}.mode`, fallback.mode, errors),
    percent: clamped(value.percent, `${path}.percent`, fallback.percent, 10, 100, errors),
    fixedPx: clamped(value.fixedPx, `${path}.fixedPx`, fallback.fixedPx, 320, 3000, errors),
  };
}

function validateOverrides(
  value: unknown,
  path: string,
  errors: ConfigError[],
): Partial<Record<PaletteToken, string>> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    report(errors, path, `expected an object, got ${typeof value}`);
    return undefined;
  }
  const result: Partial<Record<PaletteToken, string>> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!PALETTE_TOKENS.includes(key as PaletteToken)) {
      report(errors, `${path}.${key}`, `'${key}' is not a palette token`);
      continue;
    }
    if (typeof raw !== 'string' || raw.trim() === '') {
      report(errors, `${path}.${key}`, `expected a non-empty string, got ${typeof raw}`);
      continue;
    }
    result[key as PaletteToken] = raw;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function validateTheme(value: unknown, path: string, errors: ConfigError[]): ThemeConfig {
  const fallback = DEFAULT_CONFIG.theme;
  if (!isRecord(value)) {
    if (value !== undefined) report(errors, path, `expected an object, got ${typeof value}`);
    return structuredClone(fallback);
  }
  const accent = PALETTE_TOKENS.includes(value.accent as PaletteToken)
    ? (value.accent as PaletteToken)
    : (report(errors, `${path}.accent`, `'${String(value.accent)}' is not a palette token`),
      fallback.accent);
  return {
    lightFlavour: oneOf(
      value.lightFlavour,
      FLAVOURS,
      `${path}.lightFlavour`,
      fallback.lightFlavour,
      errors,
    ),
    darkFlavour: oneOf(
      value.darkFlavour,
      FLAVOURS,
      `${path}.darkFlavour`,
      fallback.darkFlavour,
      errors,
    ),
    fallbackFlavour: oneOf(
      value.fallbackFlavour,
      FLAVOURS,
      `${path}.fallbackFlavour`,
      fallback.fallbackFlavour,
      errors,
    ),
    accent,
    fontScale: clamped(value.fontScale, `${path}.fontScale`, fallback.fontScale, 0.8, 1.4, errors),
    radius: clamped(value.radius, `${path}.radius`, fallback.radius, 0, 64, errors),
    backdrop: validateBackdrop(value.backdrop, `${path}.backdrop`, fallback.backdrop, errors),
    contentWidth: validateContentWidth(
      value.contentWidth,
      `${path}.contentWidth`,
      fallback.contentWidth,
      errors,
    ),
    overrides: validateOverrides(value.overrides, `${path}.overrides`, errors),
    iconColor: optionalStr(value.iconColor, `${path}.iconColor`, errors),
  };
}

function validateSearchEngine(
  value: unknown,
  path: string,
  used: Set<string>,
  errors: ConfigError[],
): SearchEngine {
  if (!isRecord(value)) {
    report(errors, path, `expected an object, got ${typeof value}`);
    return {
      id: uniqueId(undefined, used, `${path}.id`, 'engine', errors),
      name: 'Unnamed',
      template: 'https://duckduckgo.com/?q={query}',
    };
  }
  return {
    id: uniqueId(value.id, used, `${path}.id`, 'engine', errors),
    name: str(value.name, `${path}.name`, 'Unnamed', errors),
    template: str(
      value.template,
      `${path}.template`,
      'https://duckduckgo.com/?q={query}',
      errors,
    ),
    icon: optionalStr(value.icon, `${path}.icon`, errors),
  };
}

function validateSearch(value: unknown, path: string, errors: ConfigError[]): SearchConfig {
  const fallback = DEFAULT_CONFIG.search;
  if (!isRecord(value)) {
    if (value !== undefined) report(errors, path, `expected an object, got ${typeof value}`);
    return structuredClone(fallback);
  }
  const used = new Set<string>();
  const engines = isArray(value.engines)
    ? value.engines.map((e, i) => validateSearchEngine(e, `${path}.engines[${i}]`, used, errors))
    : (report(errors, `${path}.engines`, `expected an array`), [...fallback.engines]);
  const engineIds = new Set(engines.map((e) => e.id));
  let defaultEngineId = str(
    value.defaultEngineId,
    `${path}.defaultEngineId`,
    fallback.defaultEngineId,
    errors,
  );
  if (!engineIds.has(defaultEngineId)) {
    report(
      errors,
      `${path}.defaultEngineId`,
      `'${defaultEngineId}' does not match any engine id`,
    );
    defaultEngineId = engines[0]?.id ?? fallback.defaultEngineId;
  }
  return {
    defaultEngineId,
    engines,
    detectUrls: bool(value.detectUrls, `${path}.detectUrls`, fallback.detectUrls, errors),
    suggestFromLinks: bool(
      value.suggestFromLinks,
      `${path}.suggestFromLinks`,
      fallback.suggestFromLinks,
      errors,
    ),
  };
}

function validateWidget(
  value: unknown,
  path: string,
  used: Set<string>,
  errors: ConfigError[],
): Widget | null {
  if (!isRecord(value)) {
    report(errors, path, `expected an object, got ${typeof value}`);
    return null;
  }
  const type = oneOf(value.type, WIDGET_TYPES, `${path}.type`, 'clock', errors);
  const id = uniqueId(value.id, used, `${path}.id`, `${type}-widget`, errors);
  const slot = oneOf(value.slot, WIDGET_SLOTS, `${path}.slot`, 'header-left', errors);
  const order = num(value.order, `${path}.order`, 0, errors);
  const enabled = bool(value.enabled, `${path}.enabled`, true, errors);
  const base = { id, slot, order, enabled };

  switch (type) {
    case 'clock':
      return {
        ...base,
        type: 'clock',
        label: optionalStr(value.label, `${path}.label`, errors),
        timezone: timezone(value.timezone, `${path}.timezone`, 'UTC', errors),
        hour12: bool(value.hour12, `${path}.hour12`, false, errors),
        showSeconds: bool(value.showSeconds, `${path}.showSeconds`, false, errors),
        locale: locale(value.locale, `${path}.locale`, 'en-GB', errors),
      } satisfies ClockWidget;
    case 'date':
      return {
        ...base,
        type: 'date',
        label: optionalStr(value.label, `${path}.label`, errors),
        timezone: timezone(value.timezone, `${path}.timezone`, 'UTC', errors),
        locale: locale(value.locale, `${path}.locale`, 'en-GB', errors),
        style: oneOf(value.style, DATE_STYLES, `${path}.style`, 'full', errors),
        capitalise: bool(value.capitalise, `${path}.capitalise`, false, errors),
        showWeekNumber: bool(value.showWeekNumber, `${path}.showWeekNumber`, false, errors),
      } satisfies DateWidget;
    case 'weather':
      return {
        ...base,
        type: 'weather',
        latitude: clamped(value.latitude, `${path}.latitude`, 0, -90, 90, errors),
        longitude: clamped(value.longitude, `${path}.longitude`, 0, -180, 180, errors),
        label: str(value.label, `${path}.label`, 'Weather', errors),
        units: oneOf(value.units, ['metric', 'imperial'] as const, `${path}.units`, 'metric', errors),
        refreshMinutes: clamped(
          value.refreshMinutes,
          `${path}.refreshMinutes`,
          30,
          5,
          1440,
          errors,
        ),
      } satisfies WeatherWidget;
    case 'greeting':
      return {
        ...base,
        type: 'greeting',
        name: str(value.name, `${path}.name`, '', errors),
        templates: isRecord(value.templates)
          ? (value.templates as GreetingWidget['templates'])
          : undefined,
      } satisfies GreetingWidget;
    case 'phrase':
      return {
        ...base,
        type: 'phrase',
        label: optionalStr(value.label, `${path}.label`, errors),
        phrases: stringArray(value.phrases, `${path}.phrases`, errors),
      } satisfies PhraseWidget;
  }
}

function validateLink(
  value: unknown,
  path: string,
  used: Set<string>,
  errors: ConfigError[],
): Link | null {
  if (!isRecord(value)) {
    report(errors, path, `expected an object, got ${typeof value}`);
    return null;
  }
  return {
    id: uniqueId(value.id, used, `${path}.id`, 'link', errors),
    name: str(value.name, `${path}.name`, 'Untitled', errors),
    url: url(value.url, `${path}.url`, 'https://example.com', errors),
    icon: optionalStr(value.icon, `${path}.icon`, errors),
    newTab: value.newTab === undefined ? undefined : bool(value.newTab, `${path}.newTab`, false, errors),
  };
}

function validateGroup(
  value: unknown,
  path: string,
  used: Set<string>,
  errors: ConfigError[],
): LinkGroup | null {
  if (!isRecord(value)) {
    report(errors, path, `expected an object, got ${typeof value}`);
    return null;
  }
  const linkIds = new Set<string>();
  const links = isArray(value.links)
    ? value.links
        .map((l, i) => validateLink(l, `${path}.links[${i}]`, linkIds, errors))
        .filter((l): l is Link => l !== null)
    : (report(errors, `${path}.links`, `expected an array`), []);
  return {
    id: uniqueId(value.id, used, `${path}.id`, 'group', errors),
    name: str(value.name, `${path}.name`, 'Group', errors),
    icon: optionalStr(value.icon, `${path}.icon`, errors),
    links,
  };
}

function validateTab(
  value: unknown,
  path: string,
  used: Set<string>,
  errors: ConfigError[],
): Tab | null {
  if (!isRecord(value)) {
    report(errors, path, `expected an object, got ${typeof value}`);
    return null;
  }
  const groupIds = new Set<string>();
  const groups = isArray(value.groups)
    ? value.groups
        .map((g, i) => validateGroup(g, `${path}.groups[${i}]`, groupIds, errors))
        .filter((g): g is LinkGroup => g !== null)
    : (report(errors, `${path}.groups`, `expected an array`), []);
  return {
    id: uniqueId(value.id, used, `${path}.id`, 'tab', errors),
    name: str(value.name, `${path}.name`, 'Tab', errors),
    icon: str(value.icon, `${path}.icon`, 'folder', errors),
    banner: optionalStr(value.banner, `${path}.banner`, errors),
    bannerStatic: optionalStr(value.bannerStatic, `${path}.bannerStatic`, errors),
    lightFlavour: optionalOneOf(value.lightFlavour, FLAVOURS, `${path}.lightFlavour`, errors),
    darkFlavour: optionalOneOf(value.darkFlavour, FLAVOURS, `${path}.darkFlavour`, errors),
    fallbackFlavour: optionalOneOf(
      value.fallbackFlavour,
      FLAVOURS,
      `${path}.fallbackFlavour`,
      errors,
    ),
    groups,
  };
}

function validateBehaviour(
  value: unknown,
  path: string,
  errors: ConfigError[],
): BehaviourConfig {
  const fallback = DEFAULT_CONFIG.behaviour;
  if (!isRecord(value)) {
    if (value !== undefined) report(errors, path, `expected an object, got ${typeof value}`);
    return fallback;
  }
  const startTab =
    typeof value.startTab === 'string' ? value.startTab : fallback.startTab;
  if (typeof value.startTab !== 'string') {
    report(errors, `${path}.startTab`, `expected a string, got ${typeof value.startTab}`);
  }
  return {
    startTab,
    confirmBeforeReset: bool(
      value.confirmBeforeReset,
      `${path}.confirmBeforeReset`,
      fallback.confirmBeforeReset,
      errors,
    ),
    showMnemonics: bool(
      value.showMnemonics,
      `${path}.showMnemonics`,
      fallback.showMnemonics,
      errors,
    ),
    pageTitle: pageTitle(value.pageTitle, `${path}.pageTitle`, fallback.pageTitle, errors),
    footerPosition: oneOf(
      value.footerPosition,
      FOOTER_POSITIONS,
      `${path}.footerPosition`,
      fallback.footerPosition,
      errors,
    ),
  };
}

/** A blank/whitespace-only title falls back rather than leaving the browser tab untitled. */
function pageTitle(value: unknown, path: string, fallback: string, errors: ConfigError[]): string {
  const raw = str(value, path, fallback, errors).trim();
  return raw === '' ? fallback : raw;
}

/**
 * Validates and normalises arbitrary input into a usable AppConfig.
 * Never throws: invalid or missing fields fall back to defaults and are
 * reported in `errors` with a path and a reason.
 */
export function parseConfig(input: unknown): ParseResult {
  const errors: ConfigError[] = [];
  const root = isRecord(input) ? input : {};
  if (!isRecord(input)) {
    report(errors, '', `root is ${input === null ? 'null' : typeof input}, expected an object`);
  }

  const widgetIds = new Set<string>();
  const widgets = isArray(root.widgets)
    ? root.widgets
        .map((w, i) => validateWidget(w, `widgets[${i}]`, widgetIds, errors))
        .filter((w): w is Widget => w !== null)
    : (root.widgets !== undefined && report(errors, 'widgets', `expected an array`),
      structuredClone(DEFAULT_CONFIG.widgets));

  const tabIds = new Set<string>();
  const tabs = isArray(root.tabs)
    ? root.tabs
        .map((t, i) => validateTab(t, `tabs[${i}]`, tabIds, errors))
        .filter((t): t is Tab => t !== null)
    : (root.tabs !== undefined && report(errors, 'tabs', `expected an array`),
      structuredClone(DEFAULT_CONFIG.tabs));

  const config: AppConfig = {
    schemaVersion: num(root.schemaVersion, 'schemaVersion', DEFAULT_CONFIG.schemaVersion, errors),
    theme: validateTheme(root.theme, 'theme', errors),
    search: validateSearch(root.search, 'search', errors),
    widgets,
    tabs: tabs.length > 0 ? tabs : structuredClone(DEFAULT_CONFIG.tabs),
    behaviour: validateBehaviour(root.behaviour, 'behaviour', errors),
  };

  return { config, errors };
}
