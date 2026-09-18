<script lang="ts">
  import { strings } from '../../strings';
  import { configState } from '../../state/config.svelte';
  import { putWallpaper, getWallpaper, deleteWallpaper, listWallpaperIds } from '../../wallpapers/idbStore';
  import { isAnimatedWallpaperFormat } from '../../wallpapers/animatedFormat';
  import { collectIdbReferences } from '../../wallpapers/idbReferences';
  import { DEFAULT_CONFIG } from '../../config/defaults';
  import { LIGHT_FLAVOURS, DARK_FLAVOURS } from '../../theme/flavourGroups';
  import type { BackdropConfig, ContentWidthConfig, Flavour } from '../../../types/config';

  const t = strings.settings.appearance;

  const theme = $derived(configState.config.theme);
  const behaviour = $derived(configState.config.behaviour);

  function setPageTitle(value: string): void {
    const trimmed = value.trim();
    configState.update(
      (draft) => {
        draft.behaviour.pageTitle = trimmed === '' ? DEFAULT_CONFIG.behaviour.pageTitle : trimmed;
      },
      { field: 'page-title' },
    );
  }

  function setLightFlavour(flavour: Flavour): void {
    configState.update(
      (draft) => {
        draft.theme.lightFlavour = flavour;
      },
      { field: 'light-flavour' },
    );
  }

  function setDarkFlavour(flavour: Flavour): void {
    configState.update(
      (draft) => {
        draft.theme.darkFlavour = flavour;
      },
      { field: 'dark-flavour' },
    );
  }

  function setFallbackFlavour(flavour: Flavour): void {
    configState.update(
      (draft) => {
        draft.theme.fallbackFlavour = flavour;
      },
      { field: 'fallback-flavour' },
    );
  }

  const BACKDROP_KINDS: readonly BackdropConfig['kind'][] = ['none', 'solid', 'image'];
  const BACKDROP_FITS: readonly BackdropConfig['fit'][] = ['cover', 'contain', 'tile'];
  const KIND_LABELS: Record<BackdropConfig['kind'], string> = {
    none: t.kindNone,
    solid: t.kindSolid,
    image: t.kindImage,
  };
  const FIT_LABELS: Record<BackdropConfig['fit'], string> = {
    cover: t.fitCover,
    contain: t.fitContain,
    tile: t.fitTile,
  };

  const CONTENT_WIDTH_MODES: readonly ContentWidthConfig['mode'][] = ['full', 'percent', 'fixed'];
  const CONTENT_WIDTH_MODE_LABELS: Record<ContentWidthConfig['mode'], string> = {
    full: t.contentWidthModeFull,
    percent: t.contentWidthModePercent,
    fixed: t.contentWidthModeFixed,
  };

  const backdrop = $derived(configState.config.theme.backdrop);
  const contentWidth = $derived(configState.config.theme.contentWidth);

  function updateContentWidth(mutator: (draft: ContentWidthConfig) => void): void {
    configState.update(
      (draft) => {
        mutator(draft.theme.contentWidth);
      },
      { field: 'content-width' },
    );
  }

  function setContentWidthMode(mode: ContentWidthConfig['mode']): void {
    updateContentWidth((c) => {
      c.mode = mode;
    });
  }

  function setContentWidthPercent(value: number): void {
    updateContentWidth((c) => {
      c.percent = value;
    });
  }

  function setContentWidthFixedPx(value: number): void {
    updateContentWidth((c) => {
      c.fixedPx = value;
    });
  }

  // Deployed-wallpaper picker: there is no server to list a directory at
  // runtime, so `public/wallpapers/index.json` is a generated/versioned
  // manifest — mirrors the fetch/error-handling shape of
  // `configState`'s `loadRemoteConfig` (fetch, `!response.ok` -> warn and
  // bail, catch -> warn), a 404/empty list is the normal "nothing bundled
  // yet" case, not an error.
  let deployedWallpapers: string[] = $state([]);
  let indexLoadFailed = $state(false);

  $effect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('wallpapers/index.json');
        if (!response.ok) {
          console.warn(`wallpapers/index.json not found (${response.status})`);
          return;
        }
        const json: unknown = await response.json();
        if (cancelled || !Array.isArray(json)) return;
        deployedWallpapers = json.filter((entry): entry is string => typeof entry === 'string');
      } catch (err) {
        if (!cancelled) indexLoadFailed = true;
        console.warn('wallpapers/index.json could not be loaded', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  let sizeWarning: string | null = $state(null);

  // Whether the currently-selected wallpaper looks animated, checked
  // whenever `backdrop.source` changes: for a `wallpapers/` path this is an
  // extension check; for an `idb:` reference it's a MIME-type check against
  // the stored record (the original filename isn't kept in IndexedDB).
  let currentIsAnimated = $state(false);

  $effect(() => {
    const source = backdrop.source;

    if (source === undefined) {
      currentIsAnimated = false;
      return;
    }

    if (source.startsWith('idb:')) {
      const id = source.slice('idb:'.length);
      let cancelled = false;
      getWallpaper(id)
        .then((stored) => {
          if (cancelled) return;
          currentIsAnimated = stored !== null && isAnimatedWallpaperFormat({ type: stored.mimeType });
        })
        .catch(() => {
          if (!cancelled) currentIsAnimated = false;
        });
      return () => {
        cancelled = true;
      };
    }

    currentIsAnimated = isAnimatedWallpaperFormat({ name: source });
    return undefined;
  });

  /**
   * Every mutation that can change which `idb:` ids are referenced
   * (backdrop.source or backdrop.staticFallback) runs this afterwards: it
   * diffs "ids stored in IndexedDB" against "ids referenced anywhere in the
   * config" (not just this one field — see idbReferences.ts) and deletes
   * anything with zero remaining references.
   */
  async function cleanupOrphanedWallpapers(): Promise<void> {
    try {
      const referenced = collectIdbReferences(configState.config);
      const storedIds = await listWallpaperIds();
      await Promise.all(
        storedIds.filter((id) => !referenced.has(id)).map((id) => deleteWallpaper(id)),
      );
    } catch (err) {
      console.warn('orphaned wallpaper cleanup failed', err);
    }
  }

  function updateBackdrop(field: string, mutator: (draft: BackdropConfig) => void): void {
    configState.update(
      (draft) => {
        mutator(draft.theme.backdrop);
      },
      { field },
    );
    void cleanupOrphanedWallpapers();
  }

  function setKind(kind: BackdropConfig['kind']): void {
    updateBackdrop('backdrop-kind', (b) => {
      b.kind = kind;
    });
  }

  function selectDeployedWallpaper(filename: string): void {
    sizeWarning = null;
    updateBackdrop('backdrop-source', (b) => {
      b.source = `wallpapers/${filename}`;
      if (b.kind === 'none') b.kind = 'image';
    });
  }

  function clearWallpaper(): void {
    sizeWarning = null;
    updateBackdrop('backdrop-source', (b) => {
      b.source = undefined;
    });
  }

  async function handleLocalFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    sizeWarning = file.size > 2 * 1024 * 1024 ? t.wallpaperSizeWarning(file.size / (1024 * 1024)) : null;

    const id = await putWallpaper(file);
    updateBackdrop('backdrop-source', (b) => {
      b.source = `idb:${id}`;
      if (b.kind === 'none') b.kind = 'image';
    });

    input.value = '';
  }

  function clearStaticFallback(): void {
    updateBackdrop('backdrop-static-fallback', (b) => {
      b.staticFallback = undefined;
    });
  }

  function setStaticFallbackPath(value: string): void {
    updateBackdrop('backdrop-static-fallback', (b) => {
      b.staticFallback = value.trim() === '' ? undefined : value;
    });
  }

  async function handleStaticFallbackFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const id = await putWallpaper(file);
    updateBackdrop('backdrop-static-fallback', (b) => {
      b.staticFallback = `idb:${id}`;
    });

    input.value = '';
  }

  function setFit(fit: BackdropConfig['fit']): void {
    configState.update(
      (draft) => {
        draft.theme.backdrop.fit = fit;
      },
      { field: 'backdrop-fit' },
    );
  }

  function setBlur(value: number): void {
    configState.update(
      (draft) => {
        draft.theme.backdrop.blur = value;
      },
      { field: 'backdrop-blur' },
    );
  }

  function setOpacity(value: number): void {
    configState.update(
      (draft) => {
        draft.theme.backdrop.opacity = value;
      },
      { field: 'backdrop-opacity' },
    );
  }
</script>

<div class="section">
  <h2>{strings.settings.nav.appearance}</h2>

  <div class="field-group">
    <label class="field">
      {t.pageTitleLabel}
      <input
        type="text"
        value={behaviour.pageTitle}
        onchange={(event) => setPageTitle(event.currentTarget.value)}
      />
    </label>
    <p class="hint">{t.pageTitleHint}</p>
  </div>

  <fieldset class="field-group">
    <legend>{t.flavourHeading}</legend>
    <p class="hint">{t.flavourIntro}</p>

    <label class="field">
      {t.lightFlavourLabel}
      <select
        value={theme.lightFlavour}
        onchange={(event) => setLightFlavour(event.currentTarget.value as Flavour)}
      >
        {#each LIGHT_FLAVOURS as flavour (flavour)}
          <option value={flavour}>{t.flavourNames[flavour]}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      {t.darkFlavourLabel}
      <select
        value={theme.darkFlavour}
        onchange={(event) => setDarkFlavour(event.currentTarget.value as Flavour)}
      >
        {#each DARK_FLAVOURS as flavour (flavour)}
          <option value={flavour}>{t.flavourNames[flavour]}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      {t.fallbackFlavourLabel}
      <select
        value={theme.fallbackFlavour}
        onchange={(event) => setFallbackFlavour(event.currentTarget.value as Flavour)}
      >
        {#each DARK_FLAVOURS as flavour (flavour)}
          <option value={flavour}>{t.flavourNames[flavour]}</option>
        {/each}
      </select>
    </label>
    <p class="hint">{t.fallbackFlavourHint}</p>
  </fieldset>

  <fieldset class="field-group">
    <legend>{t.kindLabel}</legend>
    <div class="kind-options">
      {#each BACKDROP_KINDS as kind (kind)}
        <label class="radio-field">
          <input
            type="radio"
            name="backdrop-kind"
            value={kind}
            checked={backdrop.kind === kind}
            onchange={() => setKind(kind)}
          />
          {KIND_LABELS[kind]}
        </label>
      {/each}
    </div>
  </fieldset>

  <fieldset class="field-group">
    <legend>{t.contentWidthLabel}</legend>
    <div class="kind-options">
      {#each CONTENT_WIDTH_MODES as mode (mode)}
        <label class="radio-field">
          <input
            type="radio"
            name="content-width-mode"
            value={mode}
            checked={contentWidth.mode === mode}
            onchange={() => setContentWidthMode(mode)}
          />
          {CONTENT_WIDTH_MODE_LABELS[mode]}
        </label>
      {/each}
    </div>

    {#if contentWidth.mode === 'percent'}
      <label class="field">
        {t.contentWidthPercentLabel}
        <input
          type="number"
          min="10"
          max="100"
          value={contentWidth.percent}
          onchange={(event) => setContentWidthPercent(Number(event.currentTarget.value))}
        />
      </label>
    {:else if contentWidth.mode === 'fixed'}
      <label class="field">
        {t.contentWidthFixedLabel}
        <input
          type="number"
          min="320"
          max="3000"
          value={contentWidth.fixedPx}
          onchange={(event) => setContentWidthFixedPx(Number(event.currentTarget.value))}
        />
      </label>
    {/if}
  </fieldset>

  {#if backdrop.kind === 'image'}
    <section class="field-group">
      <h3>{t.deployedHeading}</h3>
      {#if indexLoadFailed}
        <p class="warning">{t.indexLoadFailed}</p>
      {/if}
      {#if deployedWallpapers.length === 0}
        <p class="empty">{t.deployedEmpty}</p>
      {:else}
        <ul class="wallpaper-list" aria-label={t.deployedListLabel}>
          {#each deployedWallpapers as filename (filename)}
            <li>
              <label class="radio-field">
                <input
                  type="radio"
                  name="deployed-wallpaper"
                  checked={backdrop.source === `wallpapers/${filename}`}
                  onchange={() => selectDeployedWallpaper(filename)}
                />
                {filename}
              </label>
            </li>
          {/each}
        </ul>
      {/if}

      <label class="field">
        {t.chooseFile}
        <input type="file" accept="image/*" onchange={handleLocalFile} />
      </label>
      <p class="hint">{t.chooseFileHint}</p>

      {#if sizeWarning}
        <p class="warning">{sizeWarning}</p>
      {/if}

      <p class="field-label-static">
        {t.currentSourceLabel}: {backdrop.source ?? t.currentSourceNone}
      </p>
      {#if backdrop.source}
        <button type="button" class="delete-button" onclick={clearWallpaper}>
          {t.clearWallpaper}
        </button>
      {/if}
    </section>

    <section class="field-group">
      <h3>{t.staticFallbackLabel}</h3>
      <p class="hint">{t.staticFallbackHint}</p>

      {#if currentIsAnimated && !backdrop.staticFallback}
        <p class="warning">{t.staticFallbackMissing}</p>
      {/if}

      <label class="field">
        {t.staticFallbackLabel}
        <input
          type="text"
          placeholder={t.staticFallbackPathPlaceholder}
          value={backdrop.staticFallback ?? ''}
          onchange={(event) => setStaticFallbackPath(event.currentTarget.value)}
        />
      </label>

      <label class="field">
        {t.staticFallbackChooseFile}
        <input type="file" accept="image/*" onchange={handleStaticFallbackFile} />
      </label>

      {#if backdrop.staticFallback}
        <button type="button" class="delete-button" onclick={clearStaticFallback}>
          {t.staticFallbackClear}
        </button>
      {/if}
    </section>

    <section class="field-group">
      <label class="field">
        {t.fitLabel}
        <select value={backdrop.fit} onchange={(event) => setFit(event.currentTarget.value as BackdropConfig['fit'])}>
          {#each BACKDROP_FITS as fit (fit)}
            <option value={fit}>{FIT_LABELS[fit]}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        {t.blurLabel}
        <input
          type="number"
          min="0"
          max="100"
          value={backdrop.blur}
          onchange={(event) => setBlur(Number(event.currentTarget.value))}
        />
      </label>

      <label class="field">
        {t.opacityLabel}
        <input
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={backdrop.opacity}
          onchange={(event) => setOpacity(Number(event.currentTarget.value))}
        />
      </label>
    </section>
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

  fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }

  legend {
    font-size: 0.95em;
    padding: 0;
    color: var(--text-secondary);
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

  .kind-options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .radio-field {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: 0.9em;
  }

  .wallpaper-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  .field-label-static {
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  .hint {
    font-size: 0.8em;
    color: var(--text-muted);
  }

  .warning {
    font-size: 0.85em;
    color: var(--status-warning);
  }

  .empty {
    color: var(--text-muted);
    font-size: 0.9em;
  }

  input[type='text'],
  input[type='number'],
  select {
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
  }

  .delete-button {
    align-self: flex-start;
    color: var(--status-danger);
    background: transparent;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
  }
</style>
