<script lang="ts">
  import { strings } from '../../strings';
  import { configState } from '../../state/config.svelte';
  import { announce } from '../../state/announcer.svelte';
  import { attachPointerReorder, reorderByPointer } from '../../reorder/pointerReorder';
  import { moveByKeyboard } from '../../reorder/keyboardReorder';
  import { targetIndexForKeyboardMove } from './reorder';
  import { isAllowedUrl } from '../../search/protocols';
  import { generateId } from '../../utils/id';

  const t = strings.settings.search;

  /** The query-substitution token expected by `SearchDialog.svelte` and `bangs.ts`. */
  const QUERY_PLACEHOLDER = '{query}';

  const engines = $derived(configState.config.search.engines);
  const defaultEngineId = $derived(configState.config.search.defaultEngineId);
  const detectUrls = $derived(configState.config.search.detectUrls);
  const suggestFromLinks = $derived(configState.config.search.suggestFromLinks);

  let bangErrors: Record<string, string | null> = $state({});
  let templateErrors: Record<string, string | null> = $state({});

  function engineDisplayName(engineId: string): string {
    const engine = engines.find((e) => e.id === engineId);
    return engine?.name || t.untitledEngine;
  }

  function addEngine(): void {
    const id = generateId().slice(0, 8);
    configState.update((draft) => {
      draft.search.engines.push({ id, name: '', template: '' });
    });
  }

  function deleteEngine(engineId: string): void {
    if (engines.length <= 1) return;
    configState.update(
      (draft) => {
        draft.search.engines = draft.search.engines.filter((e) => e.id !== engineId);
        if (draft.search.defaultEngineId === engineId) {
          draft.search.defaultEngineId = draft.search.engines[0]?.id ?? '';
        }
      },
      { destructive: true },
    );
    delete bangErrors[engineId];
    delete templateErrors[engineId];
  }

  function handleBangInput(engineId: string, event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    if (value.trim() === '') {
      bangErrors[engineId] = t.bangEmptyWarning;
      return;
    }
    const duplicate = engines.some((e) => e.id !== engineId && e.id.toLowerCase() === value.toLowerCase());
    if (duplicate) {
      bangErrors[engineId] = t.bangDuplicateWarning(value);
      return;
    }
    bangErrors[engineId] = null;
    configState.update(
      (draft) => {
        const engine = draft.search.engines.find((e) => e.id === engineId);
        if (!engine) return;
        engine.id = value;
        if (draft.search.defaultEngineId === engineId) draft.search.defaultEngineId = value;
      },
      { field: `search-engine-bang-${engineId}` },
    );
  }

  function handleNameInput(engineId: string, event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    configState.update(
      (draft) => {
        const engine = draft.search.engines.find((e) => e.id === engineId);
        if (engine) engine.name = value;
      },
      { field: `search-engine-name-${engineId}` },
    );
  }

  function handleTemplateInput(
    engineId: string,
    event: Event & { currentTarget: HTMLInputElement },
  ): void {
    const value = event.currentTarget.value;
    if (value.trim() === '') {
      templateErrors[engineId] = null;
      return;
    }
    if (!isAllowedUrl(value)) {
      templateErrors[engineId] = t.templateRejected;
      return;
    }
    if (!value.includes(QUERY_PLACEHOLDER)) {
      templateErrors[engineId] = t.templateMissingPlaceholder;
      return;
    }
    templateErrors[engineId] = null;
    configState.update(
      (draft) => {
        const engine = draft.search.engines.find((e) => e.id === engineId);
        if (engine) engine.template = value;
      },
      { field: `search-engine-template-${engineId}` },
    );
  }

  function handleIconInput(engineId: string, event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    configState.update(
      (draft) => {
        const engine = draft.search.engines.find((e) => e.id === engineId);
        if (engine) engine.icon = value || undefined;
      },
      { field: `search-engine-icon-${engineId}` },
    );
  }

  function setDefaultEngine(engineId: string): void {
    configState.update(
      (draft) => {
        draft.search.defaultEngineId = engineId;
      },
      { field: 'search-default-engine' },
    );
  }

  function applyEngineOrder(nextIds: string[]): void {
    configState.update(
      (draft) => {
        draft.search.engines = nextIds.map((id) => draft.search.engines.find((e) => e.id === id)!);
      },
      { field: 'search-engines-order' },
    );
  }

  function handleEngineKeydown(engineId: string, event: KeyboardEvent): void {
    const direction = moveByKeyboard(event);
    if (direction !== 'up' && direction !== 'down') return;
    event.preventDefault();
    const ids = engines.map((e) => e.id);
    const targetIndex = targetIndexForKeyboardMove(ids, engineId, direction);
    const next = reorderByPointer(ids, engineId, targetIndex);
    if (next.join('|') === ids.join('|')) return;
    applyEngineOrder(next);
    announce(t.moved(engineDisplayName(engineId), next.indexOf(engineId) + 1));
  }

  function handlePointerReorder(nextIds: string[]): void {
    applyEngineOrder(nextIds);
  }

  function handlePointerAnnounce(draggedId: string, _fromIndex: number, toIndex: number): void {
    announce(t.moved(engineDisplayName(draggedId), toIndex + 1));
  }

  function attachEnginesReorder(node: HTMLElement) {
    return attachPointerReorder(node, {
      items: () => engines.map((e) => e.id),
      handleSelector: '.drag-handle',
      onReorder: handlePointerReorder,
      onAnnounce: handlePointerAnnounce,
    });
  }

  function handleDetectUrlsChange(event: Event & { currentTarget: HTMLInputElement }): void {
    const checked = event.currentTarget.checked;
    configState.update((draft) => {
      draft.search.detectUrls = checked;
    });
  }

  function handleSuggestFromLinksChange(event: Event & { currentTarget: HTMLInputElement }): void {
    const checked = event.currentTarget.checked;
    configState.update((draft) => {
      draft.search.suggestFromLinks = checked;
    });
  }
</script>

<div class="section">
  <h2>{strings.settings.nav.search}</h2>

  <h3>{t.heading}</h3>
  {#if engines.length === 0}
    <p class="empty">{t.noEngines}</p>
  {:else}
    <ul class="engines-list" use:attachEnginesReorder>
      {#each engines as engine (engine.id)}
        <li class="engine-row" data-reorder-id={engine.id}>
          <button
            type="button"
            class="drag-handle"
            aria-label={t.dragHandle}
            onkeydown={(event) => handleEngineKeydown(engine.id, event)}
          ></button>

          <div class="engine-fields">
            <div class="field-row">
              <label class="field">
                <span class="field-label">{t.bangLabel}</span>
                <input
                  type="text"
                  class="bang-input"
                  value={engine.id}
                  oninput={(event) => handleBangInput(engine.id, event)}
                />
              </label>

              <label class="field name-field">
                <span class="field-label">{t.nameLabel}</span>
                <input
                  type="text"
                  value={engine.name}
                  oninput={(event) => handleNameInput(engine.id, event)}
                />
              </label>

              <label class="default-field">
                <input
                  type="radio"
                  name="default-engine"
                  checked={engine.id === defaultEngineId}
                  onchange={() => setDefaultEngine(engine.id)}
                />
                {t.defaultEngineLabel}
              </label>
            </div>

            {#if bangErrors[engine.id]}
              <p class="warning">{bangErrors[engine.id]}</p>
            {/if}

            <label class="field">
              <span class="field-label">{t.templateLabel}</span>
              <input
                type="text"
                placeholder={t.templatePlaceholder}
                value={engine.template}
                oninput={(event) => handleTemplateInput(engine.id, event)}
              />
            </label>
            <p class="hint">{t.templateHint}</p>
            {#if templateErrors[engine.id]}
              <p class="warning">{templateErrors[engine.id]}</p>
            {/if}

            <label class="field">
              <span class="field-label">{t.iconLabel}</span>
              <input
                type="text"
                value={engine.icon ?? ''}
                oninput={(event) => handleIconInput(engine.id, event)}
              />
            </label>
          </div>

          <button
            type="button"
            class="delete-button"
            disabled={engines.length <= 1}
            onclick={() => deleteEngine(engine.id)}
            aria-label={t.deleteEngine(engine.name || t.untitledEngine)}
          >
            {t.delete}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  {#if engines.length <= 1}
    <p class="hint">{t.cannotDeleteLastEngine}</p>
  {/if}
  <p class="hint">{t.defaultEngineHint}</p>

  <button type="button" class="add-button" onclick={addEngine}>{t.addEngine}</button>

  <h3>{t.behaviourHeading}</h3>
  <label class="toggle-field">
    <input type="checkbox" checked={detectUrls} onchange={handleDetectUrlsChange} />
    {t.detectUrlsLabel}
  </label>
  <p class="hint">{t.detectUrlsHint}</p>

  <label class="toggle-field">
    <input type="checkbox" checked={suggestFromLinks} onchange={handleSuggestFromLinksChange} />
    {t.suggestFromLinksLabel}
  </label>
  <p class="hint">{t.suggestFromLinksHint}</p>
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

  .engines-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .engine-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius, 12px);
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
  }

  .drag-handle {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    margin-top: var(--space-1);
    border-radius: var(--radius, 12px);
    background: var(--surface-hover);
    cursor: grab;
  }

  .engine-fields {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field-row {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  .name-field {
    flex: 1;
  }

  .field-label {
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  input[type='text'] {
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
  }

  .bang-input {
    width: 5rem;
  }

  .default-field {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-shrink: 0;
    color: var(--text-secondary);
    font-size: 0.85em;
    padding-bottom: var(--space-1);
  }

  .warning {
    color: var(--status-warning);
    font-size: 0.85em;
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.8em;
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

  .delete-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .toggle-field {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-primary);
  }
</style>
