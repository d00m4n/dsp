import type { AppConfig } from '../../types/config';

export interface ConfigCounts {
  tabs: number;
  links: number;
}

/**
 * Counts tabs and the total number of links across every group in every
 * tab. Structural/duck-typed on purpose: used both on a fully-typed
 * `AppConfig` (reset) and on a freshly-`parseConfig`'d candidate that may
 * still be partially defaulted (import preview).
 */
export function countTabsAndLinks(config: Pick<AppConfig, 'tabs'>): ConfigCounts {
  let links = 0;
  for (const tab of config.tabs) {
    for (const group of tab.groups) {
      links += group.links.length;
    }
  }
  return { tabs: config.tabs.length, links };
}

/**
 * Builds the `homebase-config-YYYY-MM-DD.json` export filename from a
 * given date (local time, manually formatted — no date library).
 */
export function buildExportFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `homebase-config-${year}-${month}-${day}.json`;
}
