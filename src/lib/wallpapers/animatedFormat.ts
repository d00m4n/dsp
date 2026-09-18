/**
 * Detects whether a wallpaper file is (or is likely to be) an animated
 * image, purely from its filename extension and/or MIME type. Per the
 * spec (PHASE-4.md §8): extension + MIME is sufficient, frame analysis is
 * explicitly out of scope (a static `webp` can't be told apart from an
 * animated one this way — that's an accepted false positive, not a bug).
 *
 * Either signal alone is enough to call it animated, since callers may only
 * have one available: a freshly-picked `File` has both a name and a MIME
 * type, but a `StoredWallpaper` read back from IndexedDB only has the MIME
 * type (the original filename isn't kept).
 */
const ANIMATED_EXTENSIONS = new Set(['gif', 'apng', 'webp']);
const ANIMATED_MIME_TYPES = new Set(['image/gif', 'image/apng', 'image/webp']);

export interface AnimatedFormatInput {
  name?: string;
  type?: string;
}

export function isAnimatedWallpaperFormat(input: AnimatedFormatInput): boolean {
  const ext = input.name?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (ext !== undefined && ANIMATED_EXTENSIONS.has(ext)) return true;

  const mime = input.type?.toLowerCase();
  if (mime !== undefined && ANIMATED_MIME_TYPES.has(mime)) return true;

  return false;
}
