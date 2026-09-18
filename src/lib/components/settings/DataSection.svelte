<script lang="ts">
  import { strings } from '../../strings';
  import { configState } from '../../state/config.svelte';
  import { parseConfig, type ConfigError } from '../../config/parse';
  import { readRawConfig, writeConfigBackup } from '../../config/storage';
  import { DEFAULT_CONFIG } from '../../config/defaults';
  import { collectIdbReferences } from '../../wallpapers/idbReferences';
  import { buildExportFilename, countTabsAndLinks } from '../../config/summary';

  const t = strings.settings.data;

  const hasIdbReferences = $derived(collectIdbReferences(configState.config).size > 0);

  /* ---------- Export ---------- */

  function exportConfig(): void {
    const json = JSON.stringify(configState.config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildExportFilename(new Date());
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------- Import ---------- */

  type ImportStage =
    | { kind: 'idle' }
    | { kind: 'error'; message: string }
    | { kind: 'preview'; config: ReturnType<typeof parseConfig>['config']; errors: ConfigError[] }
    | { kind: 'done' };

  let importStage: ImportStage = $state({ kind: 'idle' });

  /**
   * Backs up what's about to be replaced. Prefers the persisted raw config
   * (matches the plan's `writeConfigBackup(readRawConfig())`); falls back to
   * serialising the live in-memory config for the rare case nothing has been
   * persisted yet (e.g. `persistFailed`, or before the first debounced
   * write lands), so a backup is never silently skipped.
   */
  function backupCurrentConfig(): void {
    const raw = readRawConfig() ?? JSON.stringify(configState.config);
    writeConfigBackup(raw);
  }

  const importCounts = $derived.by(() => {
    const stage = importStage;
    return stage.kind === 'preview' ? countTabsAndLinks(stage.config) : null;
  });

  async function handleImportFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const text = await file.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      importStage = { kind: 'error', message: t.importNotJson };
      return;
    }

    const { config, errors } = parseConfig(parsed);
    importStage = { kind: 'preview', config, errors };
  }

  function confirmImport(): void {
    if (importStage.kind !== 'preview') return;
    const candidate = importStage.config;

    backupCurrentConfig();

    configState.update((draft) => Object.assign(draft, candidate), { destructive: true });
    importStage = { kind: 'done' };
  }

  function cancelImport(): void {
    importStage = { kind: 'idle' };
  }

  /* ---------- Reset ---------- */

  let resetConfirmVisible = $state(false);
  const resetCounts = $derived(countTabsAndLinks(configState.config));

  function requestReset(): void {
    if (configState.config.behaviour.confirmBeforeReset) {
      resetConfirmVisible = true;
      return;
    }
    performReset();
  }

  function performReset(): void {
    backupCurrentConfig();
    // Cloned: DEFAULT_CONFIG's nested objects (tabs, widgets, ...) aren't
    // deep-frozen, so assigning them by reference would let a later edit
    // (e.g. renaming a tab) mutate the shared canonical defaults in place.
    configState.update((draft) => Object.assign(draft, structuredClone(DEFAULT_CONFIG)), {
      destructive: true,
    });
    resetConfirmVisible = false;
  }

  function cancelReset(): void {
    resetConfirmVisible = false;
  }
</script>

<div class="section">
  <h2>{strings.settings.nav.data}</h2>

  <section class="field-group">
    <h3>{t.exportHeading}</h3>
    {#if hasIdbReferences}
      <p class="warning">{t.idbWallpaperExportWarning}</p>
    {/if}
    <button type="button" onclick={exportConfig}>{t.exportButton}</button>
  </section>

  <section class="field-group">
    <h3>{t.importHeading}</h3>
    <label class="field">
      {t.importButton}
      <input type="file" accept="application/json" onchange={handleImportFile} />
    </label>

    {#if importStage.kind === 'error'}
      <p class="warning">{importStage.message}</p>
    {/if}

    {#if importStage.kind === 'preview' && importCounts}
      <div class="preview">
        <h4>{t.importPreviewHeading}</h4>
        <p>{t.importPreviewSummary(importCounts.tabs, importCounts.links)}</p>

        {#if importStage.errors.length > 0}
          <div class="warning">
            <p>{t.importPreviewErrorsHeading}</p>
            <ul>
              {#each importStage.errors as error (error.path)}
                <li>{error.path}: {error.reason}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="button-row">
          <button type="button" onclick={confirmImport}>{t.importConfirm}</button>
          <button type="button" class="secondary" onclick={cancelImport}>{t.importCancel}</button>
        </div>
      </div>
    {/if}

    {#if importStage.kind === 'done'}
      <p class="success">{t.importSuccess}</p>
    {/if}
  </section>

  <section class="field-group">
    <h3>{t.resetHeading}</h3>

    {#if !resetConfirmVisible}
      <button type="button" class="delete-button" onclick={requestReset}>{t.resetButton}</button>
    {:else}
      <p class="warning">{t.resetConfirm(resetCounts.tabs, resetCounts.links)}</p>
      <div class="button-row">
        <button type="button" class="delete-button" onclick={performReset}>
          {t.resetConfirmButton}
        </button>
        <button type="button" class="secondary" onclick={cancelReset}>{t.resetCancel}</button>
      </div>
    {/if}
  </section>
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

  h4 {
    font-size: 0.9em;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius, 12px);
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  .warning {
    font-size: 0.85em;
    color: var(--status-warning);
  }

  .warning ul {
    margin: var(--space-1) 0 0;
    padding-left: 1.2em;
  }

  .success {
    font-size: 0.85em;
    color: var(--status-success);
  }

  .preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius, 12px);
    background: var(--surface-overlay);
    border: 1px solid var(--border-subtle);
  }

  .button-row {
    display: flex;
    gap: var(--space-2);
  }

  .delete-button {
    color: var(--status-danger);
    border-color: var(--status-danger);
    background: transparent;
    align-self: flex-start;
  }

  .secondary {
    background: transparent;
  }
</style>
