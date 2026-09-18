import { describe, expect, it } from 'vitest';
import { buildMnemonicPreviewTab } from '../../src/lib/components/settings/mnemonicPreview';
import { assignMnemonics } from '../../src/lib/mnemonics/assign';
import type { Tab } from '../../src/types/config';

function makeTab(): Tab {
  return {
    id: 'tab-1',
    name: 'Tab',
    icon: 'world',
    groups: [
      {
        id: 'group-1',
        name: 'Group',
        links: [
          { id: 'link-1', name: 'Reddit', url: 'https://reddit.com' },
          { id: 'link-2', name: '', url: '' },
        ],
      },
    ],
  };
}

describe('buildMnemonicPreviewTab', () => {
  it('replaces only the in-progress link name, leaving the rest of the tab untouched', () => {
    const tab = makeTab();
    const preview = buildMnemonicPreviewTab(tab, 'group-1', 'link-2', 'Git&Hub');

    expect(preview.groups[0]?.links[1]?.name).toBe('Git&Hub');
    expect(preview.groups[0]?.links[0]?.name).toBe('Reddit');
    // The original tab is not mutated.
    expect(tab.groups[0]?.links[1]?.name).toBe('');
  });

  it('produces a tab that assignMnemonics can resolve, reflecting the candidate name', () => {
    const tab = makeTab();
    const preview = buildMnemonicPreviewTab(tab, 'group-1', 'link-2', 'Git&Hub');
    const map = assignMnemonics(preview);

    expect(map.byLink.get('link-2')?.key).toBe('h');
  });

  it('is a no-op (structurally) when the group or link id is not found', () => {
    const tab = makeTab();
    const preview = buildMnemonicPreviewTab(tab, 'missing-group', 'missing-link', 'New name');

    expect(preview).toEqual(tab);
  });
});
