/**
 * Finds every `idb:{id}` wallpaper reference anywhere in a config object, so
 * orphaned-wallpaper cleanup can compare "ids stored in IndexedDB" against
 * "ids still referenced" without hard-coding a single field path.
 *
 * Deliberately untyped/structural: it serialises the whole value and scans
 * the JSON text for the `idb:` pattern, rather than walking known fields
 * (`backdrop.source` today, but `backdrop.staticFallback` or a future
 * `Tab.banner`/`bannerStatic` reference should be caught too, without this
 * function needing to know those paths exist).
 */
const IDB_REFERENCE_PATTERN = /idb:([a-zA-Z0-9_-]+)/g;

export function collectIdbReferences(config: unknown): Set<string> {
  const ids = new Set<string>();
  const json = JSON.stringify(config);
  if (json === undefined) return ids;

  for (const match of json.matchAll(IDB_REFERENCE_PATTERN)) {
    const id = match[1];
    if (id !== undefined) ids.add(id);
  }
  return ids;
}
