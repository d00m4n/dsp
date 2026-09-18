<script lang="ts">
  import type { Tab } from '../../../types/config';
  import type { MnemonicMap } from '../../mnemonics/assign';
  import LinkCard from './LinkCard.svelte';
  import IconGlyph from '../ui/IconGlyph.svelte';

  interface Props {
    tab: Tab;
    mnemonics: MnemonicMap;
    showMnemonics: boolean;
  }

  const { tab, mnemonics, showMnemonics }: Props = $props();
</script>

<div class="link-grid">
  {#each tab.groups as group (group.id)}
    <section class="group" aria-label={group.name}>
      <h2><IconGlyph name={group.icon} size={16} />{group.name}</h2>
      <div class="grid">
        {#each group.links as link (link.id)}
          <LinkCard {link} mnemonic={mnemonics.byLink.get(link.id)} {showMnemonics} />
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .link-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .group h2 {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-3);
  }
</style>
