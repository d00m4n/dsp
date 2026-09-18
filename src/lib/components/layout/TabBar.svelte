<script lang="ts">
  import type { Tab } from '../../../types/config';
  import IconGlyph from '../ui/IconGlyph.svelte';

  interface Props {
    tabs: Tab[];
    activeTabId: string;
    onSelect: (tabId: string) => void;
  }

  const { tabs, activeTabId, onSelect }: Props = $props();
</script>

<nav class="tab-bar" aria-label="Tabs">
  {#each tabs as tab, i (tab.id)}
    <button
      type="button"
      class="tab"
      class:active={tab.id === activeTabId}
      aria-current={tab.id === activeTabId ? 'page' : undefined}
      data-tab-index={i + 1}
      onclick={() => onSelect(tab.id)}
    >
      <IconGlyph name={tab.icon} size={16} />
      {tab.name}
    </button>
  {/each}
</nav>

<style>
  .tab-bar {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) 0;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius, 12px);
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid transparent;
    cursor: pointer;
  }

  .tab:hover {
    background: var(--surface-hover);
  }

  .tab.active {
    background: var(--surface-raised);
    color: var(--text-primary);
    border-color: var(--border-subtle);
  }
</style>
