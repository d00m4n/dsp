/**
 * Fallback for icon names not in the local curated registry (registry.ts):
 * fetches the same Tabler icon data from Iconify's public API instead of
 * bundling the full ~340 KiB icon set. This is the one place the app makes
 * a network request purely for its own UI (alongside the weather widget's
 * Open-Meteo calls) — a deliberate, documented exception to "fully
 * offline"; see README's Features section.
 */

export interface IconGlyphData {
  body: string;
  width: number;
  height: number;
}

interface IconifyApiResponse {
  icons: Record<string, { body: string; width?: number; height?: number }>;
  width?: number;
  height?: number;
  not_found?: string[];
}

// Successes and misses are both cached, so a name that doesn't exist is
// only ever requested once per page load.
const cache = new Map<string, Promise<IconGlyphData | null>>();

async function fetchRemoteIcon(name: string): Promise<IconGlyphData | null> {
  try {
    const url = `https://api.iconify.design/tabler.json?icons=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as IconifyApiResponse;
    const icon = data.icons[name];
    if (!icon) return null;

    return {
      body: icon.body,
      width: icon.width ?? data.width ?? 24,
      height: icon.height ?? data.height ?? 24,
    };
  } catch {
    // Offline, blocked, or the API is unreachable: no icon, no crash.
    return null;
  }
}

export function getRemoteTablerIcon(name: string): Promise<IconGlyphData | null> {
  let pending = cache.get(name);
  if (!pending) {
    pending = fetchRemoteIcon(name);
    cache.set(name, pending);
  }
  return pending;
}
