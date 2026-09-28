<script lang="ts">
  import { PALETTE_TOKENS, type PaletteToken } from '../../../types/palette';
  import type { Flavour } from '../../../types/config';
  import { configState } from '../../state/config.svelte';
  import { resolveFlavour } from '../../theme/resolveFlavour';
  import { ALL_FLAVOURS } from '../../theme/flavourGroups';
  import { SEMANTIC_OVERRIDES } from '../../theme/applyTheme';
  import { strings } from '../../strings';
  import { generateId } from '../../utils/id';
  import Modal from '../ui/Modal.svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  const { open, onClose }: Props = $props();

  // PALETTE_TOKENS carries the full 26-token Catppuccin structure so
  // flavours.css and the accent picker can draw from it, but only some of
  // those tokens actually reach the page: overlay0, overlay2 and mantle are
  // never referenced by a semantic token in flavours.css and aren't offered
  // as an accent choice either, so overriding them here would be a swatch
  // with no visible effect. Filtered here rather than in the generated
  // palette module.
  type HiddenToken = 'overlay0' | 'overlay2' | 'mantle';
  const HIDDEN_TOKENS: readonly HiddenToken[] = ['overlay0', 'overlay2', 'mantle'];
  const EDITABLE_TOKENS = PALETTE_TOKENS.filter(
    (token): token is Exclude<PaletteToken, HiddenToken> =>
      !HIDDEN_TOKENS.includes(token as HiddenToken),
  );

  const t = strings.themeEditor;

  const theme = $derived(configState.config.theme);

  let prefersDark = $state(false);

  $effect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function apply(): void {
      prefersDark = mediaQuery.media !== 'not all' ? mediaQuery.matches : true;
    }

    apply();
    mediaQuery.addEventListener('change', apply);
    return () => mediaQuery.removeEventListener('change', apply);
  });

  const flavour = $derived(resolveFlavour(theme, prefersDark));

  // The un-overridden hex per token for the active flavour, read from the
  // CSS custom properties flavours.css defines. Refreshed when the modal
  // opens or the active flavour changes — NOT on every override edit,
  // which would just read back what was just written.
  let baseColours: Partial<Record<PaletteToken, string>> = $state({});
  let baseIconColour = $state('#000000');

  $effect(() => {
    if (!open) return;
    const currentFlavour = flavour;
    void currentFlavour;
    const styles = getComputedStyle(document.documentElement);
    const next: Partial<Record<PaletteToken, string>> = {};
    for (const token of PALETTE_TOKENS) {
      next[token] = styles.getPropertyValue(cssVarFor(token)).trim();
    }
    baseColours = next;
    baseIconColour = styles.getPropertyValue('--icon').trim() || '#000000';
  });

  // Tokens in SEMANTIC_OVERRIDES drive their semantic token directly (see
  // applyTheme.ts); every other token sets its own --p-{token} variable.
  function cssVarFor(token: PaletteToken): string {
    return SEMANTIC_OVERRIDES[token] ?? `--p-${token}`;
  }

  function displayColour(token: PaletteToken): string {
    return theme.overrides?.[token] ?? baseColours[token] ?? '#000000';
  }

  const displayIconColour = $derived(theme.iconColor ?? baseIconColour);

  function setIconColor(value: string): void {
    configState.update(
      (draft) => {
        draft.theme.iconColor = value;
      },
      { field: 'theme-icon-color' },
    );
  }

  function clearIconColor(): void {
    configState.update(
      (draft) => {
        draft.theme.iconColor = undefined;
      },
      { destructive: true },
    );
  }

  function setOverride(token: PaletteToken, value: string): void {
    configState.update(
      (draft) => {
        draft.theme.overrides ??= {};
        draft.theme.overrides[token] = value;
      },
      { field: `theme-override-${token}` },
    );
  }

  function clearOverride(token: PaletteToken): void {
    configState.update(
      (draft) => {
        delete draft.theme.overrides?.[token];
      },
      { destructive: true },
    );
  }

  function clearAllOverrides(): void {
    configState.update(
      (draft) => {
        draft.theme.overrides = {};
      },
      { destructive: true },
    );
  }

  function downloadTheme(): void {
    const payload = { flavour, overrides: theme.overrides ?? {}, iconColor: theme.iconColor };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `homebase-theme-${flavour}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------- Import (file or pasted JSON) ---------- */

  type ImportStage =
    | { kind: 'idle' }
    | { kind: 'error'; message: string }
    | {
        kind: 'preview';
        overrides: Partial<Record<PaletteToken, string>>;
        iconColor?: string;
        unknownKeys: string[];
        suggestedName: string;
        baseFlavour: Flavour;
      };

  let importStage: ImportStage = $state({ kind: 'idle' });
  let pastedJson = $state('');
  let importName = $state('');

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Accepts either the exact `{ flavour, overrides, iconColor }` shape
   * downloadTheme() produces, or a bare token->colour map (e.g. someone
   * pasting just the `overrides` object they found in another browser's
   * saved config) — an `icon` key in that map is read as the icon colour.
   */
  function parseThemePayload(parsed: unknown): ImportStage {
    if (!isRecord(parsed)) return { kind: 'error', message: t.importInvalid };

    const candidate = isRecord(parsed.overrides) ? parsed.overrides : parsed;
    const overrides: Partial<Record<PaletteToken, string>> = {};
    const unknownKeys: string[] = [];
    let iconColor: string | undefined;

    for (const [key, value] of Object.entries(candidate)) {
      if (key === 'icon') {
        if (typeof value === 'string' && value.trim() !== '') iconColor = value;
        continue;
      }
      if (!PALETTE_TOKENS.includes(key as PaletteToken)) {
        unknownKeys.push(key);
        continue;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        overrides[key as PaletteToken] = value;
      }
    }

    if (typeof parsed.iconColor === 'string' && parsed.iconColor.trim() !== '') {
      iconColor = parsed.iconColor;
    }

    if (Object.keys(overrides).length === 0 && !iconColor) {
      return { kind: 'error', message: t.importInvalid };
    }
    // The base flavour the overrides were designed against, from the
    // `flavour` field downloadTheme() writes; falls back to whichever
    // flavour is active right now if missing/unrecognised.
    const baseFlavour = (ALL_FLAVOURS as readonly string[]).includes(parsed.flavour as string)
      ? (parsed.flavour as Flavour)
      : flavour;
    return {
      kind: 'preview',
      overrides,
      iconColor,
      unknownKeys,
      suggestedName: t.importDefaultName,
      baseFlavour,
    };
  }

  async function handleImportFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      importStage = { kind: 'error', message: t.importInvalid };
      return;
    }
    importStage = parseThemePayload(parsed);
    if (importStage.kind === 'preview') importName = importStage.suggestedName;
  }

  function applyPastedJson(): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(pastedJson);
    } catch {
      importStage = { kind: 'error', message: t.importInvalid };
      return;
    }
    importStage = parseThemePayload(parsed);
    if (importStage.kind === 'preview') importName = importStage.suggestedName;
  }

  function confirmImport(): void {
    if (importStage.kind !== 'preview') return;
    const { overrides, iconColor, baseFlavour } = importStage;
    const name = importName.trim() !== '' ? importName.trim() : importStage.suggestedName;

    configState.update((draft) => {
      draft.theme.savedThemes ??= [];
      draft.theme.savedThemes.push({ id: generateId(), name, baseFlavour, overrides, iconColor });
    });

    importStage = { kind: 'idle' };
    pastedJson = '';
    importName = '';
  }

  function cancelImport(): void {
    importStage = { kind: 'idle' };
    importName = '';
  }

  // Only removes the saved theme itself; a tab or the global default that
  // picked it (as `theme:{id}`) reverts to the built-in fallback flavour
  // the next time the config is (re)parsed — see resolveFlavour.ts.
  function deleteSavedTheme(id: string): void {
    configState.update(
      (draft) => {
        draft.theme.savedThemes = (draft.theme.savedThemes ?? []).filter(
          (savedTheme) => savedTheme.id !== id,
        );
      },
      { destructive: true },
    );
  }
</script>

<Modal label={t.title} {open} {onClose}>
  <div class="theme-editor">
    <h1>{t.title}</h1>
    <p class="hint">{t.editingFlavour(flavour)}</p>
    <p class="hint">{t.hint}</p>

    <label class="token-row icon-row">
      <input
        type="color"
        value={displayIconColour}
        onchange={(event) => setIconColor(event.currentTarget.value)}
      />
      <span class="token-name">{t.iconLabel}</span>
      {#if theme.iconColor}
        <button type="button" class="reset-button" onclick={clearIconColor}>
          {t.resetToken}
        </button>
      {/if}
    </label>

    <div class="token-grid">
      {#each EDITABLE_TOKENS as token (token)}
        <label class="token-row" title={cssVarFor(token)}>
          <input
            type="color"
            value={displayColour(token)}
            onchange={(event) => setOverride(token, event.currentTarget.value)}
          />
          <span class="token-name">{t.tokenNames[token]}</span>
          {#if theme.overrides?.[token]}
            <button type="button" class="reset-button" onclick={() => clearOverride(token)}>
              {t.resetToken}
            </button>
          {/if}
        </label>
      {/each}
    </div>

    {#if theme.overrides && Object.keys(theme.overrides).length > 0}
      <button type="button" class="secondary" onclick={clearAllOverrides}>{t.resetAll}</button>
    {/if}

    <section class="field-group">
      <button type="button" onclick={downloadTheme}>{t.downloadButton}</button>
      <p class="hint">{t.downloadHint}</p>
    </section>

    <section class="field-group">
      <label class="field">
        {t.importFileLabel}
        <input type="file" accept="application/json" onchange={handleImportFile} />
      </label>

      <label class="field">
        {t.importPasteHeading}
        <textarea
          bind:value={pastedJson}
          placeholder={t.importPastePlaceholder}
          rows="4"
        ></textarea>
      </label>
      <p class="hint">{t.importPasteHint}</p>
      <button type="button" onclick={applyPastedJson} disabled={pastedJson.trim() === ''}>
        {t.importApply}
      </button>

      {#if importStage.kind === 'error'}
        <p class="warning">{importStage.message}</p>
      {/if}

      {#if importStage.kind === 'preview'}
        <div class="preview">
          <p>
            {t.importPreview(
              Object.keys(importStage.overrides).length + (importStage.iconColor ? 1 : 0),
            )}
          </p>
          {#if importStage.unknownKeys.length > 0}
            <p class="warning">{t.importUnknownKeys(importStage.unknownKeys)}</p>
          {/if}
          <label class="field">
            {t.importNameLabel}
            <input type="text" bind:value={importName} placeholder={importStage.suggestedName} />
          </label>
          <div class="button-row">
            <button type="button" onclick={confirmImport}>{t.importSave}</button>
            <button type="button" class="secondary" onclick={cancelImport}>{t.importCancel}</button>
          </div>
        </div>
      {/if}
    </section>

    {#if theme.savedThemes && theme.savedThemes.length > 0}
      <section class="field-group">
        <h2 class="subheading">{t.savedThemesHeading}</h2>
        <p class="hint">{t.savedThemesHint}</p>
        <ul class="saved-theme-list">
          {#each theme.savedThemes as saved (saved.id)}
            <li class="saved-theme-row">
              <span class="saved-theme-name">{saved.name}</span>
              <button
                type="button"
                class="secondary"
                onclick={() => deleteSavedTheme(saved.id)}
              >
                {t.deleteTheme}
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</Modal>

<style>
  .theme-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-height: 75vh;
    overflow-y: auto;
  }

  h1 {
    font-size: 1.1rem;
  }

  .hint {
    font-size: 0.85em;
    color: var(--text-muted);
  }

  .token-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--space-2);
  }

  .token-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius, 12px);
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
    font-size: 0.85em;
  }

  .token-row input[type='color'] {
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
  }

  .token-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
  }

  .reset-button {
    flex-shrink: 0;
    font-size: 0.8em;
    background: transparent;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: 0.1em 0.5em;
    color: var(--text-muted);
    cursor: pointer;
  }

  .secondary {
    align-self: flex-start;
    background: transparent;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-3);
    cursor: pointer;
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

  textarea {
    font-family: monospace;
    font-size: 0.85em;
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
    resize: vertical;
  }

  .field input[type='text'] {
    font-size: 0.9em;
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
  }

  .warning {
    font-size: 0.85em;
    color: var(--status-warning);
  }

  .subheading {
    font-size: 0.95em;
  }

  .saved-theme-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .saved-theme-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius, 12px);
    background: var(--surface-page);
    border: 1px solid var(--border-subtle);
  }

  .saved-theme-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
</style>
