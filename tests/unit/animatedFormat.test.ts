import { describe, expect, it } from 'vitest';
import { isAnimatedWallpaperFormat } from '../../src/lib/wallpapers/animatedFormat';

describe('isAnimatedWallpaperFormat', () => {
  it.each([
    ['sunset.gif', 'image/gif'],
    ['loop.apng', 'image/apng'],
    ['banner.webp', 'image/webp'],
    ['LOOP.GIF', 'image/gif'],
  ])('treats %s (%s) as animated', (name, type) => {
    expect(isAnimatedWallpaperFormat({ name, type })).toBe(true);
  });

  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.png', 'image/png'],
    ['vector.svg', 'image/svg+xml'],
    ['photo.avif', 'image/avif'],
  ])('treats %s (%s) as static', (name, type) => {
    expect(isAnimatedWallpaperFormat({ name, type })).toBe(false);
  });

  it('detects animation from MIME type alone (no filename, e.g. a StoredWallpaper)', () => {
    expect(isAnimatedWallpaperFormat({ type: 'image/gif' })).toBe(true);
  });

  it('detects animation from filename extension alone (no MIME type)', () => {
    expect(isAnimatedWallpaperFormat({ name: 'party.apng' })).toBe(true);
  });

  it('returns false when neither signal is present', () => {
    expect(isAnimatedWallpaperFormat({})).toBe(false);
  });

  it('is not fooled by an extension-less name or a mismatched mime', () => {
    expect(isAnimatedWallpaperFormat({ name: 'no-extension', type: 'image/jpeg' })).toBe(false);
  });
});
