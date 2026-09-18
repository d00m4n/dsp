<script lang="ts">
  import type { Link, LinkGroup, Tab } from '../../../types/config';
  import { strings } from '../../strings';
  import { configState } from '../../state/config.svelte';
  import { parseName } from '../../mnemonics/parseName';
  import { isAllowedUrl } from '../../search/protocols';
  import { buildMnemonicPreviewTab } from './mnemonicPreview';
  import { assignMnemonics } from '../../mnemonics/assign';
  import { untrack } from 'svelte';

  const t = strings.settings.tabsLinks;

  interface Props {
    tab: Tab;
    group: LinkGroup;
    link: Link;
    onHandleKeydown: (event: KeyboardEvent) => void;
  }

  const { tab, group, link, onHandleKeydown }: Props = $props();

  // This component instance is keyed by `link.id` in the parent `#each`, so
  // capturing only the initial value here (a fresh instance per link) is
  // intentional — later external changes are re-synced via the $effects
  // below, not by re-reading `link` reactively on every render.
  let nameDraft = $state(untrack(() => link.name));
  let lastSyncedName = untrack(() => link.name);
  let urlDraft = $state(untrack(() => link.url));
  let lastSyncedUrl = untrack(() => link.url);
  let showEmptyNameWarning = $state(false);
  let urlError: string | null = $state(null);

  // Re-syncs local drafts when the underlying link changes for a reason
  // other than this component's own commits (e.g. Ctrl+Z restoring an
  // earlier value) — but never overwrites an in-progress, not-yet-committed
  // edit (an emptied name/url that hasn't been persisted).
  $effect(() => {
    if (link.name !== lastSyncedName) {
      lastSyncedName = link.name;
      nameDraft = link.name;
    }
  });
  $effect(() => {
    if (link.url !== lastSyncedUrl) {
      lastSyncedUrl = link.url;
      urlDraft = link.url;
    }
  });

  // $state.snapshot strips the reactive proxy first: structuredClone (used
  // inside buildMnemonicPreviewTab) cannot clone a Svelte $state proxy directly.
  const previewTab = $derived(
    buildMnemonicPreviewTab($state.snapshot(tab), group.id, link.id, nameDraft),
  );
  const previewMap = $derived(assignMnemonics(previewTab));
  const mnemonic = $derived(previewMap.byLink.get(link.id));
  const conflict = $derived(previewMap.conflicts.find((c) => c.linkId === link.id));
  const conflictWinnerName = $derived.by(() => {
    if (!conflict) return null;
    for (const g of previewTab.groups) {
      const winner = g.links.find((l) => l.id === conflict.takenBy);
      if (winner) return parseName(winner.name).display || t.untitledLink;
    }
    return null;
  });

  const displayName = $derived(parseName(nameDraft).display);
  const nameBefore = $derived(
    mnemonic?.displayIndex != null ? displayName.slice(0, mnemonic.displayIndex) : displayName,
  );
  const nameMarked = $derived(
    mnemonic?.displayIndex != null ? displayName[mnemonic.displayIndex] : '',
  );
  const nameAfter = $derived(
    mnemonic?.displayIndex != null ? displayName.slice(mnemonic.displayIndex + 1) : '',
  );

  function commitName(value: string): void {
    configState.update(
      (draft) => {
        const g = draft.tabs.find((tb) => tb.id === tab.id)?.groups.find((gr) => gr.id === group.id);
        const l = g?.links.find((li) => li.id === link.id);
        if (l) l.name = value;
      },
      { field: `link-name-${link.id}` },
    );
    lastSyncedName = value;
  }

  function handleNameInput(event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    nameDraft = value;
    if (value.trim() === '') return;
    showEmptyNameWarning = false;
    commitName(value);
  }

  function handleNameBlur(): void {
    if (nameDraft.trim() === '') {
      showEmptyNameWarning = true;
    }
  }

  function commitUrl(value: string): void {
    configState.update(
      (draft) => {
        const g = draft.tabs.find((tb) => tb.id === tab.id)?.groups.find((gr) => gr.id === group.id);
        const l = g?.links.find((li) => li.id === link.id);
        if (l) l.url = value;
      },
      { field: `link-url-${link.id}` },
    );
    lastSyncedUrl = value;
  }

  function handleUrlInput(event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    urlDraft = value;
    if (value.trim() === '') {
      urlError = null;
      return;
    }
    if (!isAllowedUrl(value)) {
      urlError = t.urlRejected;
      return;
    }
    urlError = null;
    commitUrl(value);
  }

  function handleIconInput(event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    configState.update(
      (draft) => {
        const g = draft.tabs.find((tb) => tb.id === tab.id)?.groups.find((gr) => gr.id === group.id);
        const l = g?.links.find((li) => li.id === link.id);
        if (l) l.icon = value || undefined;
      },
      { field: `link-icon-${link.id}` },
    );
  }

  function handleNewTabChange(event: Event & { currentTarget: HTMLInputElement }): void {
    const checked = event.currentTarget.checked;
    configState.update(
      (draft) => {
        const g = draft.tabs.find((tb) => tb.id === tab.id)?.groups.find((gr) => gr.id === group.id);
        const l = g?.links.find((li) => li.id === link.id);
        if (l) l.newTab = checked;
      },
      { field: `link-newtab-${link.id}` },
    );
  }

  function deleteLink(): void {
    configState.update(
      (draft) => {
        const g = draft.tabs.find((tb) => tb.id === tab.id)?.groups.find((gr) => gr.id === group.id);
        if (g) g.links = g.links.filter((li) => li.id !== link.id);
      },
      { destructive: true },
    );
  }
</script>

<li class="link-row" data-reorder-id={link.id}>
  <button
    type="button"
    class="drag-handle"
    aria-label={t.dragHandle}
    onkeydown={onHandleKeydown}
  ></button>

  <div class="link-fields">
    <div class="name-field">
      <label class="visually-hidden" for={`link-name-${link.id}`}>{t.linkNameLabel}</label>
      <input
        id={`link-name-${link.id}`}
        type="text"
        class="name-input"
        class:incomplete={nameDraft.trim() === ''}
        value={nameDraft}
        oninput={handleNameInput}
        onblur={handleNameBlur}
      />
      <span class="name-preview" class:conflicted={!!conflict}>
        {#if mnemonic?.displayIndex != null}
          {nameBefore}<span class="mnemonic">{nameMarked}</span>{nameAfter}
        {:else}
          {displayName || t.untitledLink}
        {/if}
        {#if mnemonic && mnemonic.displayIndex == null}
          <span class="badge">{mnemonic.key}</span>
        {/if}
      </span>
    </div>

    {#if showEmptyNameWarning && nameDraft.trim() === ''}
      <p class="warning">{t.emptyNameWarning}</p>
    {/if}

    {#if conflict && conflictWinnerName}
      <p class="conflict-message">{t.mnemonicConflict(conflictWinnerName)}</p>
    {/if}

    <div class="url-field">
      <label class="visually-hidden" for={`link-url-${link.id}`}>{t.linkUrlLabel}</label>
      <input
        id={`link-url-${link.id}`}
        type="text"
        class:incomplete={urlDraft.trim() === ''}
        placeholder={t.linkUrlLabel}
        value={urlDraft}
        oninput={handleUrlInput}
      />
      {#if urlError}
        <p class="warning">{urlError}</p>
      {/if}
    </div>

    <div class="meta-fields">
      <label class="icon-field">
        <span class="visually-hidden">{t.linkIconLabel}</span>
        <input
          type="text"
          placeholder={t.linkIconLabel}
          value={link.icon ?? ''}
          oninput={handleIconInput}
        />
      </label>
      <label class="new-tab-field">
        <input type="checkbox" checked={link.newTab ?? false} onchange={handleNewTabChange} />
        {t.linkNewTab}
      </label>
    </div>
  </div>

  <button type="button" class="delete-button" onclick={deleteLink} aria-label={t.deleteLink(displayName || t.untitledLink)}>
    {t.delete}
  </button>
</li>

<style>
  .link-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius, 12px);
    background: var(--surface-overlay);
  }

  .drag-handle {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    margin-top: var(--space-1);
    border-radius: var(--radius, 12px);
    background: var(--surface-hover);
    cursor: grab;
    background-image: linear-gradient(
      to bottom,
      var(--text-faint) 0,
      var(--text-faint) 2px,
      transparent 2px,
      transparent 5px,
      var(--text-faint) 5px,
      var(--text-faint) 7px,
      transparent 7px,
      transparent 10px,
      var(--text-faint) 10px,
      var(--text-faint) 12px
    );
    background-repeat: no-repeat;
    background-position: center;
    background-size: 0.75rem 0.75rem;
  }

  .link-fields {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .name-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  input[type='text'] {
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
  }

  input.incomplete {
    border-style: dashed;
    border-color: var(--border-strong);
  }

  .name-preview {
    color: var(--text-secondary);
    font-size: 0.85em;
  }

  .name-preview.conflicted {
    color: var(--status-danger);
  }

  .mnemonic {
    color: var(--mnemonic);
    font-weight: 700;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25em;
    padding: 0 0.35em;
    margin-left: var(--space-1);
    border-radius: 999px;
    background: var(--surface-overlay);
    color: var(--text-muted);
    font-size: 0.75em;
    text-transform: uppercase;
  }

  .warning {
    color: var(--status-warning);
    font-size: 0.85em;
  }

  .conflict-message {
    color: var(--status-danger);
    font-size: 0.85em;
  }

  .url-field input {
    width: 100%;
  }

  .meta-fields {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .icon-field input {
    width: 10rem;
  }

  .new-tab-field {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-secondary);
    font-size: 0.9em;
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

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
</style>
