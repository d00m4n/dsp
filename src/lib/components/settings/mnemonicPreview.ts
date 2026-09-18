import type { Tab } from '../../../types/config';

/**
 * Builds a candidate `Tab` for the live mnemonic preview shown while editing
 * a link's name in the settings panel: a clone of `tab` with the
 * in-progress link's `name` replaced by whatever the user has typed so far
 * (which may not be committed to config yet, e.g. while it's empty).
 * `assignMnemonics` can be called directly on the result — it's pure and
 * cheap, no memoization needed.
 */
export function buildMnemonicPreviewTab(
  tab: Tab,
  groupId: string,
  linkId: string,
  candidateName: string,
): Tab {
  const clone = structuredClone(tab);
  const group = clone.groups.find((g) => g.id === groupId);
  const link = group?.links.find((l) => l.id === linkId);
  if (link) link.name = candidateName;
  return clone;
}
