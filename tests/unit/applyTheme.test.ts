import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme } from '../../src/lib/theme/applyTheme';
import { DEFAULT_CONFIG } from '../../src/lib/config/defaults';

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-flavour');
  });

  it('sets an inline --p-{token} custom property for each override', () => {
    applyTheme(
      { ...DEFAULT_CONFIG.theme, overrides: { mauve: '#123456', red: '#abcdef' } },
      false,
    );
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--p-mauve')).toBe('#123456');
    expect(style.getPropertyValue('--p-red')).toBe('#abcdef');
  });

  it('removes a previously-set override once it is no longer present', () => {
    applyTheme({ ...DEFAULT_CONFIG.theme, overrides: { mauve: '#123456' } }, false);
    expect(document.documentElement.style.getPropertyValue('--p-mauve')).toBe('#123456');

    applyTheme({ ...DEFAULT_CONFIG.theme, overrides: {} }, false);
    expect(document.documentElement.style.getPropertyValue('--p-mauve')).toBe('');
  });

  it('sets and clears --icon based on theme.iconColor', () => {
    applyTheme({ ...DEFAULT_CONFIG.theme, iconColor: '#ff00ff' }, false);
    expect(document.documentElement.style.getPropertyValue('--icon')).toBe('#ff00ff');

    applyTheme({ ...DEFAULT_CONFIG.theme, iconColor: undefined }, false);
    expect(document.documentElement.style.getPropertyValue('--icon')).toBe('');
  });

  it('sets data-flavour based on prefersDark', () => {
    applyTheme(DEFAULT_CONFIG.theme, true);
    expect(document.documentElement.getAttribute('data-flavour')).toBe(DEFAULT_CONFIG.theme.darkFlavour);

    applyTheme(DEFAULT_CONFIG.theme, false);
    expect(document.documentElement.getAttribute('data-flavour')).toBe(DEFAULT_CONFIG.theme.lightFlavour);
  });
});
