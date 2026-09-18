<script lang="ts">
  import type { Flavour, Tab } from '../../../types/config';
  import { strings } from '../../strings';
  import { configState } from '../../state/config.svelte';
  import { announce } from '../../state/announcer.svelte';
  import { attachPointerReorder, reorderByPointer } from '../../reorder/pointerReorder';
  import { moveByKeyboard } from '../../reorder/keyboardReorder';
  import { targetIndexForKeyboardMove } from './reorder';
  import { assignMnemonics } from '../../mnemonics/assign';
  import { parseName } from '../../mnemonics/parseName';
  import { generateId } from '../../utils/id';
  import { ALL_FLAVOURS } from '../../theme/flavourGroups';
  import { untrack } from 'svelte';
  import GroupEditor from './GroupEditor.svelte';
  import IconNameHelp from './IconNameHelp.svelte';

  const t = strings.settings.tabsLinks;

  interface Props {
    tab: Tab;
  }

  const { tab }: Props = $props();

  const mnemonics = $derived(assignMnemonics(tab));

  function findTab(draftTabs: Tab[]): Tab | undefined {
    return draftTabs.find((tb) => tb.id === tab.id);
  }

  function updateIcon(event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    configState.update(
      (draft) => {
        const tb = findTab(draft.tabs);
        if (tb) tb.icon = value;
      },
      { field: `tab-icon-${tab.id}` },
    );
  }

  const hasCustomFlavour = $derived(
    tab.lightFlavour !== undefined ||
      tab.darkFlavour !== undefined ||
      tab.fallbackFlavour !== undefined,
  );

  function setTabFlavour(
    field: 'lightFlavour' | 'darkFlavour' | 'fallbackFlavour',
    value: Flavour,
  ): void {
    configState.update(
      (draft) => {
        const tb = findTab(draft.tabs);
        if (tb) tb[field] = value;
      },
      { field: `tab-${field}-${tab.id}` },
    );
  }

  // Captures only the initial value: this drives which radio is shown, not
  // a live re-derivation, so switching to "auto" and manually setting all
  // three fields to the same flavour doesn't snap the UI back to "fixed".
  let fixedMode = $state(
    untrack(
      () =>
        tab.lightFlavour !== undefined &&
        tab.lightFlavour === tab.darkFlavour &&
        tab.darkFlavour === tab.fallbackFlavour,
    ),
  );

  function setFixedFlavour(value: Flavour): void {
    configState.update(
      (draft) => {
        const tb = findTab(draft.tabs);
        if (!tb) return;
        tb.lightFlavour = value;
        tb.darkFlavour = value;
        tb.fallbackFlavour = value;
      },
      { field: `tab-fixed-flavour-${tab.id}` },
    );
  }

  function setFlavourMode(mode: 'auto' | 'fixed'): void {
    fixedMode = mode === 'fixed';
    if (fixedMode) {
      const current =
        tab.darkFlavour ??
        tab.lightFlavour ??
        tab.fallbackFlavour ??
        configState.config.theme.darkFlavour;
      setFixedFlavour(current);
    }
  }

  function toggleCustomFlavour(enabled: boolean): void {
    const globalTheme = configState.config.theme;
    configState.update(
      (draft) => {
        const tb = findTab(draft.tabs);
        if (!tb) return;
        if (enabled) {
          tb.lightFlavour = globalTheme.lightFlavour;
          tb.darkFlavour = globalTheme.darkFlavour;
          tb.fallbackFlavour = globalTheme.fallbackFlavour;
        } else {
          tb.lightFlavour = undefined;
          tb.darkFlavour = undefined;
          tb.fallbackFlavour = undefined;
        }
      },
      { destructive: true },
    );
  }

  function addGroup(): void {
    const id = generateId();
    configState.update((draft) => {
      const tb = findTab(draft.tabs);
      tb?.groups.push({ id, name: '', links: [] });
    });
  }

  function applyGroupOrder(nextIds: string[]): void {
    configState.update(
      (draft) => {
        const tb = findTab(draft.tabs);
        if (!tb) return;
        tb.groups = nextIds.map((id) => tb.groups.find((gr) => gr.id === id)!);
      },
      { field: `groups-order-${tab.id}` },
    );
  }

  function groupDisplayName(groupId: string): string {
    const group = tab.groups.find((gr) => gr.id === groupId);
    return (group ? parseName(group.name).display : '') || t.untitledGroup;
  }

  const tabDisplayName = $derived(parseName(tab.name).display || t.untitledTab);

  function handleGroupKeydown(groupId: string, event: KeyboardEvent): void {
    const direction = moveByKeyboard(event);
    if (direction !== 'up' && direction !== 'down') return;
    event.preventDefault();
    const ids = tab.groups.map((gr) => gr.id);
    const targetIndex = targetIndexForKeyboardMove(ids, groupId, direction);
    const next = reorderByPointer(ids, groupId, targetIndex);
    if (next.join('|') === ids.join('|')) return;
    applyGroupOrder(next);
    announce(t.moved(groupDisplayName(groupId), next.indexOf(groupId) + 1, tabDisplayName));
  }

  function handlePointerReorder(nextIds: string[]): void {
    applyGroupOrder(nextIds);
  }

  function handlePointerAnnounce(draggedId: string, _fromIndex: number, toIndex: number): void {
    announce(t.moved(groupDisplayName(draggedId), toIndex + 1, tabDisplayName));
  }

  function attachGroupsReorder(node: HTMLElement) {
    return attachPointerReorder(node, {
      items: () => tab.groups.map((gr) => gr.id),
      handleSelector: '.drag-handle',
      onReorder: handlePointerReorder,
      onAnnounce: handlePointerAnnounce,
    });
  }
</script>

<div class="tab-editor">
  <div class="tab-fields">
    <label>
      <span>{t.tabIconLabel}</span>
      <input type="text" value={tab.icon} oninput={updateIcon} />
    </label>
  </div>

  <IconNameHelp />

  <div class="field-group">
    <label class="checkbox-field">
      <input
        type="checkbox"
        checked={hasCustomFlavour}
        onchange={(event) => toggleCustomFlavour(event.currentTarget.checked)}
      />
      {t.customFlavourLabel}
    </label>
    <p class="hint">{t.customFlavourHint}</p>

    {#if hasCustomFlavour}
      <div class="flavour-mode-field" role="radiogroup">
        <label class="radio-field">
          <input
            type="radio"
            name={`flavour-mode-${tab.id}`}
            checked={!fixedMode}
            onchange={() => setFlavourMode('auto')}
          />
          {t.flavourModeAutoLabel}
        </label>
        <label class="radio-field">
          <input
            type="radio"
            name={`flavour-mode-${tab.id}`}
            checked={fixedMode}
            onchange={() => setFlavourMode('fixed')}
          />
          {t.flavourModeFixedLabel}
        </label>
      </div>

      {#if fixedMode}
        <label>
          <span>{t.fixedFlavourLabel}</span>
          <select
            value={tab.darkFlavour ?? tab.lightFlavour ?? configState.config.theme.darkFlavour}
            onchange={(event) => setFixedFlavour(event.currentTarget.value as Flavour)}
          >
            {#each ALL_FLAVOURS as flavour (flavour)}
              <option value={flavour}>{strings.settings.appearance.flavourNames[flavour]}</option>
            {/each}
          </select>
        </label>
      {:else}
        <label>
          <span>{strings.settings.appearance.lightFlavourLabel}</span>
          <select
            value={tab.lightFlavour ?? configState.config.theme.lightFlavour}
            onchange={(event) => setTabFlavour('lightFlavour', event.currentTarget.value as Flavour)}
          >
            {#each ALL_FLAVOURS as flavour (flavour)}
              <option value={flavour}>{strings.settings.appearance.flavourNames[flavour]}</option>
            {/each}
          </select>
        </label>

        <label>
          <span>{strings.settings.appearance.darkFlavourLabel}</span>
          <select
            value={tab.darkFlavour ?? configState.config.theme.darkFlavour}
            onchange={(event) => setTabFlavour('darkFlavour', event.currentTarget.value as Flavour)}
          >
            {#each ALL_FLAVOURS as flavour (flavour)}
              <option value={flavour}>{strings.settings.appearance.flavourNames[flavour]}</option>
            {/each}
          </select>
        </label>

        <label>
          <span>{strings.settings.appearance.fallbackFlavourLabel}</span>
          <select
            value={tab.fallbackFlavour ?? configState.config.theme.fallbackFlavour}
            onchange={(event) =>
              setTabFlavour('fallbackFlavour', event.currentTarget.value as Flavour)}
          >
            {#each ALL_FLAVOURS as flavour (flavour)}
              <option value={flavour}>{strings.settings.appearance.flavourNames[flavour]}</option>
            {/each}
          </select>
        </label>
      {/if}
    {/if}
  </div>

  {#if mnemonics.unassigned.length > 0}
    <p class="saturation-warning">{t.unassignedCount(mnemonics.unassigned.length)}</p>
  {/if}

  <div class="help-block">
    <h3>{t.helpTitle}</h3>
    <p>{t.helpIntro}</p>
    <ul>
      {#each t.helpExamples as example (example.input)}
        <li><code>{example.input}</code> — {example.description}</li>
      {/each}
    </ul>
  </div>

  <h3>{t.groupsHeading}</h3>
  {#if tab.groups.length === 0}
    <p class="empty">{t.noGroups}</p>
  {:else}
    <ul class="groups-list" use:attachGroupsReorder>
      {#each tab.groups as group (group.id)}
        <GroupEditor
          {tab}
          {group}
          onHandleKeydown={(event) => handleGroupKeydown(group.id, event)}
        />
      {/each}
    </ul>
  {/if}
  <button type="button" class="add-button" onclick={addGroup}>{t.addGroup}</button>
</div>

<style>
  .tab-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius, 12px);
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
    max-width: 16rem;
  }

  .field-group label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  .field-group select {
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
  }

  .field-group label.checkbox-field {
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);
  }

  .flavour-mode-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .flavour-mode-field .radio-field {
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);
  }

  .hint {
    font-size: 0.8em;
    color: var(--text-muted);
  }

  .tab-fields label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 0.85em;
    color: var(--text-secondary);
    max-width: 16rem;
  }

  .tab-fields input {
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
  }

  .saturation-warning {
    color: var(--status-warning);
    background: var(--surface-overlay);
    border-radius: var(--radius, 12px);
    padding: var(--space-2) var(--space-3);
  }

  .help-block {
    background: var(--surface-overlay);
    border-radius: var(--radius, 12px);
    padding: var(--space-3);
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  .help-block h3 {
    color: var(--text-primary);
    margin-bottom: var(--space-1);
  }

  .help-block ul {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }

  .help-block code {
    color: var(--text-primary);
    background: var(--surface-raised);
    border-radius: 4px;
    padding: 0 0.35em;
  }

  h3 {
    font-size: 0.95em;
  }

  .empty {
    color: var(--text-muted);
    font-size: 0.9em;
  }

  .groups-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
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
</style>
