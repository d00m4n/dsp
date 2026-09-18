import { describe, it, expect } from 'vitest';
import { resolveFlavour } from '../../src/lib/theme/resolveFlavour';
import { DEFAULT_CONFIG } from '../../src/lib/config/defaults';

describe('resolveFlavour', () => {
  it('uses the global theme when there is no tab override', () => {
    expect(resolveFlavour(DEFAULT_CONFIG.theme, true)).toBe(DEFAULT_CONFIG.theme.darkFlavour);
    expect(resolveFlavour(DEFAULT_CONFIG.theme, false)).toBe(DEFAULT_CONFIG.theme.lightFlavour);
  });

  it("prefers the tab override's matching field over the global theme", () => {
    const flavour = resolveFlavour(DEFAULT_CONFIG.theme, true, { darkFlavour: 'dsp-night' });
    expect(flavour).toBe('dsp-night');
  });

  it('falls back to the global theme for fields the tab override leaves unset', () => {
    const flavour = resolveFlavour(DEFAULT_CONFIG.theme, false, { darkFlavour: 'dsp-night' });
    expect(flavour).toBe(DEFAULT_CONFIG.theme.lightFlavour);
  });

  it("uses the tab's own fallback flavour when neither light nor dark resolves", () => {
    const theme = { ...DEFAULT_CONFIG.theme, lightFlavour: '' as never, darkFlavour: '' as never };
    const flavour = resolveFlavour(theme, false, { fallbackFlavour: 'dsp-night' });
    expect(flavour).toBe('dsp-night');
  });
});
