import { describe, expect, it } from 'vitest';
import { locale, parseConfig, timezone } from '../../src/lib/config/parse';
import { DEFAULT_CONFIG } from '../../src/lib/config/defaults';

describe('parseConfig — never throws, always returns a usable config', () => {
  it.each([null, 42, '[]', '{}', [], 'garbage', undefined, true])(
    'handles garbage input: %j',
    (input) => {
      expect(() => parseConfig(input)).not.toThrow();
      const { config, errors } = parseConfig(input);
      expect(config.tabs.length).toBeGreaterThan(0);
      expect(config.tabs[0]!.groups[0]!.links.length).toBeGreaterThan(0);
      expect(errors.length).toBeGreaterThan(0);
    },
  );

  it('returns the defaults untouched for a bare {}', () => {
    const { config } = parseConfig({});
    expect(config.theme.darkFlavour).toBe(DEFAULT_CONFIG.theme.darkFlavour);
    expect(config.tabs).toEqual(DEFAULT_CONFIG.tabs);
  });

  it('rejects a tabs field that is a number, falling back to default tabs', () => {
    const { config, errors } = parseConfig({ tabs: 42 });
    expect(config.tabs).toEqual(DEFAULT_CONFIG.tabs);
    expect(errors.some((e) => e.path === 'tabs')).toBe(true);
  });

  it('rejects an invalid link URL and substitutes a default', () => {
    const { config, errors } = parseConfig({
      tabs: [
        {
          id: 't',
          name: 'T',
          icon: 'folder',
          groups: [
            {
              id: 'g',
              name: 'G',
              links: [{ id: 'l', name: 'Bad', url: 'not a url' }],
            },
          ],
        },
      ],
    });
    const link = config.tabs[0]!.groups[0]!.links[0]!;
    expect(() => new URL(link.url)).not.toThrow();
    expect(errors.some((e) => e.path.endsWith('.url'))).toBe(true);
  });

  it('regenerates duplicate ids within the same scope', () => {
    const { config, errors } = parseConfig({
      tabs: [
        {
          id: 't',
          name: 'T',
          icon: 'folder',
          groups: [
            {
              id: 'g',
              name: 'G',
              links: [
                { id: 'dup', name: 'One', url: 'https://example.com' },
                { id: 'dup', name: 'Two', url: 'https://example.com' },
              ],
            },
          ],
        },
      ],
    });
    const ids = config.tabs[0]!.groups[0]!.links.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(errors.some((e) => e.reason.includes('duplicate id'))).toBe(true);
  });

  it('clamps fontScale to [0.8, 1.4]', () => {
    const { config } = parseConfig({ theme: { fontScale: 99 } });
    expect(config.theme.fontScale).toBe(1.4);
    const { config: config2 } = parseConfig({ theme: { fontScale: -5 } });
    expect(config2.theme.fontScale).toBe(0.8);
  });

  it('accepts a valid per-tab flavour override and rejects an invalid one', () => {
    const { config, errors } = parseConfig({
      tabs: [
        {
          id: 't',
          name: 'T',
          icon: 'folder',
          darkFlavour: 'dsp-night',
          fallbackFlavour: 'not-a-flavour',
          groups: [],
        },
      ],
    });
    expect(config.tabs[0]!.darkFlavour).toBe('dsp-night');
    expect(config.tabs[0]!.fallbackFlavour).toBeUndefined();
    expect(config.tabs[0]!.lightFlavour).toBeUndefined();
    expect(errors.some((e) => e.path === 'tabs[0].fallbackFlavour')).toBe(true);
  });

  it('accepts valid theme.overrides tokens and drops unknown ones', () => {
    const { config, errors } = parseConfig({
      theme: { overrides: { mauve: '#123456', notAToken: '#ffffff' } },
    });
    expect(config.theme.overrides).toEqual({ mauve: '#123456' });
    expect(errors.some((e) => e.path === 'theme.overrides.notAToken')).toBe(true);
  });

  it('drops an empty theme.overrides down to undefined', () => {
    const { config } = parseConfig({ theme: { overrides: {} } });
    expect(config.theme.overrides).toBeUndefined();
  });

  it('rejects an invalid flavour and falls back to the default', () => {
    const { config, errors } = parseConfig({ theme: { darkFlavour: 'not-a-flavour' } });
    expect(config.theme.darkFlavour).toBe(DEFAULT_CONFIG.theme.darkFlavour);
    expect(errors.some((e) => e.path === 'theme.darkFlavour')).toBe(true);
  });

  it('rejects a javascript: URL and never lets it through validation', () => {
    const { config, errors } = parseConfig({
      tabs: [
        {
          id: 't',
          name: 'T',
          icon: 'folder',
          groups: [
            {
              id: 'g',
              name: 'G',
              links: [{ id: 'l', name: 'Evil', url: 'javascript:alert(1)' }],
            },
          ],
        },
      ],
    });
    const link = config.tabs[0]!.groups[0]!.links[0]!;
    expect(link.url).not.toMatch(/^javascript:/i);
    expect(errors.some((e) => e.path.endsWith('.url') && e.reason.includes('protocol'))).toBe(
      true,
    );
  });

  it.each([
    ['idb:abc123', true],
    ['wallpapers/x.jpg', true],
    ['not-a-thing', false],
  ])('validates backdrop.source %s (valid: %s)', (source, valid) => {
    const { config, errors } = parseConfig({ theme: { backdrop: { source } } });
    const sourceErrors = errors.filter((e) => e.path === 'theme.backdrop.source');
    if (valid) {
      expect(sourceErrors).toEqual([]);
      expect(config.theme.backdrop.source).toBe(source);
    } else {
      expect(sourceErrors.length).toBeGreaterThan(0);
      expect(config.theme.backdrop.source).toBeUndefined();
    }
  });

  it('rejects an invalid widget slot and falls back to a default slot', () => {
    const { config, errors } = parseConfig({
      widgets: [
        {
          id: 'w1',
          type: 'clock',
          slot: 'sideways',
          order: 0,
          enabled: true,
          timezone: 'UTC',
          hour12: false,
          showSeconds: false,
          locale: 'en',
        },
      ],
    });
    expect(config.widgets[0]!.slot).toBe('header-left');
    expect(errors.some((e) => e.path === 'widgets[0].slot')).toBe(true);
  });

  it('parses a phrase widget, dropping blank/non-string entries', () => {
    const { config, errors } = parseConfig({
      widgets: [
        {
          id: 'w1',
          type: 'phrase',
          slot: 'footer-left',
          order: 0,
          enabled: true,
          label: 'Quote',
          phrases: ['Carpe diem', '  ', 42, 'Memento mori'],
        },
      ],
    });
    const widget = config.widgets[0]!;
    expect(widget.type).toBe('phrase');
    expect(widget.type === 'phrase' && widget.phrases).toEqual(['Carpe diem', 'Memento mori']);
    expect(errors.some((e) => e.path === 'widgets[0].phrases[1]')).toBe(true);
    expect(errors.some((e) => e.path === 'widgets[0].phrases[2]')).toBe(true);
  });

  it('defaults a phrase widget with a missing phrases field to an empty list', () => {
    const { config } = parseConfig({
      widgets: [
        { id: 'w1', type: 'phrase', slot: 'footer-left', order: 0, enabled: true },
      ],
    });
    const widget = config.widgets[0]!;
    expect(widget.type === 'phrase' && widget.phrases).toEqual([]);
  });
});

describe('timezone validator', () => {
  it.each([
    ['UTC', true],
    ['Europe/Madrid', true],
    ['America/New_York', true],
    ['Not/AZone', false],
    ['garbage', false],
  ])('validates %s (valid: %s)', (value, valid) => {
    const errors: { path: string; reason: string }[] = [];
    const result = timezone(value, 'tz', 'UTC', errors);
    if (valid) {
      expect(result).toBe(value);
      expect(errors).toEqual([]);
    } else {
      expect(errors.length).toBeGreaterThan(0);
    }
  });
});

describe('locale validator', () => {
  it.each([
    ['en-GB', true],
    ['ca-ES', true],
    ['es', true],
    ['not a locale!!', false],
  ])('validates %s (valid: %s)', (value, valid) => {
    const errors: { path: string; reason: string }[] = [];
    const result = locale(value, 'loc', 'en-GB', errors);
    if (valid) {
      expect(result).toBe(value);
      expect(errors).toEqual([]);
    } else {
      expect(errors.length).toBeGreaterThan(0);
      expect(result).toBe('en-GB');
    }
  });
});
