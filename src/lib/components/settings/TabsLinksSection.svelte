<script lang="ts">
  import { strings } from '../../strings';
  import { configState } from '../../state/config.svelte';
  import { announce } from '../../state/announcer.svelte';
  import { attachPointerReorder, reorderByPointer } from '../../reorder/pointerReorder';
  import { moveByKeyboard } from '../../reorder/keyboardReorder';
  import { targetIndexForKeyboardMove } from './reorder';
  import { parseName } from '../../mnemonics/parseName';
  import { generateId } from '../../utils/id';
  import TabEditor from './TabEditor.svelte';

  const t = strings.settings.tabsLinks;

  const tabs = $derived(configState.config.tabs);

  let selectedTabId: string | null = $state(configState.config.tabs[0]?.id ?? null);

  // Keeps the selection valid as tabs are added/removed/reordered, without
  // fighting an in-progress user selection.
  $effect(() => {
    if (selectedTabId !== null && tabs.some((tab) => tab.id === selectedTabId)) return;
    selectedTabId = tabs[0]?.id ?? null;
  });

  const selectedTab = $derived(tabs.find((tab) => tab.id === selectedTabId) ?? null);

  function tabDisplayName(tabId: string): string {
    const tab = tabs.find((tb) => tb.id === tabId);
    return (tab ? parseName(tab.name).display : '') || t.untitledTab;
  }

  function addTab(): void {
    const id = generateId();
    configState.update((draft) => {
      draft.tabs.push({ id, name: '', icon: '', groups: [] });
    });
    selectedTabId = id;
  }

  function renameTab(tabId: string, event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    configState.update(
      (draft) => {
        const tab = draft.tabs.find((tb) => tb.id === tabId);
        if (tab) tab.name = value;
      },
      { field: `tab-name-${tabId}` },
    );
  }

  function deleteTab(tabId: string): void {
    configState.update(
      (draft) => {
        draft.tabs = draft.tabs.filter((tab) => tab.id !== tabId);
      },
      { destructive: true },
    );
  }

  function applyTabOrder(nextIds: string[]): void {
    configState.update(
      (draft) => {
        draft.tabs = nextIds.map((id) => draft.tabs.find((tab) => tab.id === id)!);
      },
      { field: 'tabs-order' },
    );
  }

  function handleTabKeydown(tabId: string, event: KeyboardEvent): void {
    const direction = moveByKeyboard(event);
    if (direction !== 'up' && direction !== 'down') return;
    event.preventDefault();
    const ids = tabs.map((tab) => tab.id);
    const targetIndex = targetIndexForKeyboardMove(ids, tabId, direction);
    const next = reorderByPointer(ids, tabId, targetIndex);
    if (next.join('|') === ids.join('|')) return;
    applyTabOrder(next);
    announce(t.moved(tabDisplayName(tabId), next.indexOf(tabId) + 1));
  }

  function handlePointerReorder(nextIds: string[]): void {
    applyTabOrder(nextIds);
  }

  function handlePointerAnnounce(draggedId: string, _fromIndex: number, toIndex: number): void {
    announce(t.moved(tabDisplayName(draggedId), toIndex + 1));
  }

  function attachTabsReorder(node: HTMLElement) {
    return attachPointerReorder(node, {
      items: () => tabs.map((tab) => tab.id),
      handleSelector: '.drag-handle',
      onReorder: handlePointerReorder,
      onAnnounce: handlePointerAnnounce,
    });
  }
</script>

<div class="section">
  <h2>{strings.settings.nav.tabsAndLinks}</h2>

  <h3>{t.tabsHeading}</h3>
  {#if tabs.length === 0}
    <p class="empty">{t.noTabs}</p>
  {:else}
    <ul class="tabs-list" use:attachTabsReorder>
      {#each tabs as tab (tab.id)}
        <li
          class="tab-row"
          class:selected={tab.id === selectedTabId}
          data-reorder-id={tab.id}
        >
          <button
            type="button"
            class="drag-handle"
            aria-label={t.dragHandle}
            onkeydown={(event) => handleTabKeydown(tab.id, event)}
          ></button>
          <label class="visually-hidden" for={`tab-name-${tab.id}`}>{t.tabNameLabel}</label>
          <input
            id={`tab-name-${tab.id}`}
            type="text"
            class="tab-name-input"
            value={tab.name}
            onfocus={() => (selectedTabId = tab.id)}
            oninput={(event) => renameTab(tab.id, event)}
          />
          <button
            type="button"
            class="delete-button"
            onclick={() => deleteTab(tab.id)}
            aria-label={t.deleteTab(tabDisplayName(tab.id))}
          >
            {t.delete}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <button type="button" class="add-button" onclick={addTab}>{t.addTab}</button>

  {#if selectedTab}
    <TabEditor tab={selectedTab} />
  {/if}
</div>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  h2 {
    font-size: 1rem;
  }

  h3 {
    font-size: 0.95em;
  }

  .empty {
    color: var(--text-muted);
    font-size: 0.9em;
  }

  .tabs-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .tab-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius, 12px);
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
  }

  .tab-row.selected {
    border-color: var(--accent);
  }

  .drag-handle {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--radius, 12px);
    background: var(--surface-hover);
    cursor: grab;
  }

  .tab-name-input {
    flex: 1;
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
    font-weight: 600;
  }

  .delete-button {
    flex-shrink: 0;
    color: var(--status-danger);
    background: transparent;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
  }

  .add-button {
    align-self: flex-start;
    background: var(--surface-hover);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-3);
    cursor: pointer;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
</style>
