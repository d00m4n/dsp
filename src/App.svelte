<script lang="ts">
  import { configState } from './lib/state/config.svelte';
  import { uiState } from './lib/state/ui.svelte';
  import { serviceWorkerState } from './lib/state/serviceWorker.svelte';
  import { strings } from './lib/strings';
  import { assignMnemonics, type MnemonicMap } from './lib/mnemonics/assign';
  import { applyTheme } from './lib/theme/applyTheme';
  import { createKeyboardHandler } from './lib/keyboard/shortcuts';
  import { getWallpaper } from './lib/wallpapers/idbStore';
  import { createManagedObjectUrl } from './lib/wallpapers/objectUrl';
  import TabBar from './lib/components/layout/TabBar.svelte';
  import LinkGrid from './lib/components/layout/LinkGrid.svelte';
  import WidgetSlot from './lib/components/layout/WidgetSlot.svelte';
  import MobileActionBar from './lib/components/layout/MobileActionBar.svelte';
  import SearchDialog from './lib/components/search/SearchDialog.svelte';
  import ShortcutsHelp from './lib/components/ui/ShortcutsHelp.svelte';
  import SettingsPanel from './lib/components/settings/SettingsPanel.svelte';
  import ThemeEditor from './lib/components/theme/ThemeEditor.svelte';

  const config = $derived(configState.config);

  $effect(() => {
    uiState.initFromConfig(config);
  });

  const activeTab = $derived(config.tabs.find((t) => t.id === uiState.activeTabId));

  const contentMaxWidth = $derived.by(() => {
    const { mode, percent, fixedPx } = config.theme.contentWidth;
    if (mode === 'percent') return `${percent}%`;
    if (mode === 'fixed') return `${fixedPx}px`;
    return '100%';
  });

  const hasHeaderWidgets = $derived(
    config.widgets.some((w) => w.enabled && w.slot.startsWith('header')),
  );
  const hasFooterWidgets = $derived(
    config.widgets.some((w) => w.enabled && w.slot.startsWith('footer')),
  );

  const mnemonicsByTab = $derived.by(() => {
    // Rebuilt wholesale on every recompute, never mutated afterwards: a plain
    // Map is correct here, no need for Svelte's reactive Map wrapper.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const map = new Map<string, MnemonicMap>();
    for (const tab of config.tabs) {
      map.set(tab.id, assignMnemonics(tab));
    }
    return map;
  });

  $effect(() => {
    document.title = config.behaviour.pageTitle;
  });

  // Theme: applied before first paint by the inline script in index.html;
  // this effect keeps it in sync with live prefers-color-scheme changes,
  // edits to theme config, and switching to a tab with its own flavour
  // override, without a manual light/dark switch.
  $effect(() => {
    const theme = config.theme;
    const tabOverride = activeTab && {
      lightFlavour: activeTab.lightFlavour,
      darkFlavour: activeTab.darkFlavour,
      fallbackFlavour: activeTab.fallbackFlavour,
    };
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function apply(): void {
      const prefersDark = mediaQuery.media !== 'not all' ? mediaQuery.matches : true;
      applyTheme(theme, prefersDark, tabOverride);
    }

    apply();
    mediaQuery.addEventListener('change', apply);
    return () => mediaQuery.removeEventListener('change', apply);
  });

  // Backdrop: RF-36/RF-38/RF-39. The image layer is independent from
  // `.app` (fixed, behind everything) so it never blocks first paint of
  // the actual content; `decoding="async"` on the probe `<img>` below
  // keeps decode off the main thread. `body`'s solid `--surface-page`
  // background (see tokens.css) is always underneath, so "no image" or a
  // failed load both fall back to a solid background with no visible
  // holes (RF-39) without any extra code here.
  let reducedMotion = $state(false);

  $effect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function apply(): void {
      reducedMotion = mediaQuery.matches;
    }

    apply();
    mediaQuery.addEventListener('change', apply);
    return () => mediaQuery.removeEventListener('change', apply);
  });

  // With reduced motion preferred, RF-36 says: use `staticFallback` when
  // one is set, otherwise keep showing the (possibly animated) `source`.
  const effectiveBackdropSource = $derived.by(() => {
    const backdrop = config.theme.backdrop;
    if (backdrop.kind !== 'image') return undefined;
    if (reducedMotion && backdrop.staticFallback) return backdrop.staticFallback;
    return backdrop.source;
  });

  let backdropImageUrl: string | null = $state(null);
  let backdropLoadFailed = $state(false);

  // The one place object-URL lifecycle must be handled correctly: on every
  // change of the effective source, resolve it (from IndexedDB when
  // `idb:`-prefixed, otherwise treated as a static path used as-is), and
  // the effect's cleanup revokes the previous blob URL so switching
  // wallpapers or unmounting never leaks one.
  $effect(() => {
    const source = effectiveBackdropSource;
    backdropLoadFailed = false;

    if (source === undefined) {
      backdropImageUrl = null;
      return undefined;
    }

    if (source.startsWith('idb:')) {
      const id = source.slice('idb:'.length);
      let cancelled = false;
      let managed: { url: string; revoke: () => void } | null = null;

      getWallpaper(id)
        .then((stored) => {
          if (cancelled) return;
          if (stored === null) {
            // Deleted/missing from IndexedDB: fall back to the solid
            // background per RF-39.
            backdropImageUrl = null;
            backdropLoadFailed = true;
            return;
          }
          managed = createManagedObjectUrl(stored.blob);
          backdropImageUrl = managed.url;
        })
        .catch(() => {
          if (!cancelled) {
            backdropImageUrl = null;
            backdropLoadFailed = true;
          }
        });

      return () => {
        cancelled = true;
        managed?.revoke();
      };
    }

    // A `wallpapers/...` static path (or anything else already-served):
    // used as-is, no object URL involved.
    backdropImageUrl = source;
    return undefined;
  });

  $effect(() => {
    const handler = createKeyboardHandler({
      getActiveTab: () => activeTab,
      getMnemonics: (tabId) => mnemonicsByTab.get(tabId),
      getTabs: () => config.tabs,
      setActiveTabId: (id) => {
        uiState.activeTabId = id;
      },
      isModalOpen: () => uiState.isModalOpen,
      openSearch: () => uiState.openModal('search'),
      openHelp: () => uiState.openModal('help'),
      openSettings: () => uiState.openModal('settings'),
    });
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  });
</script>

<div
  class="backdrop-layer fit-{config.theme.backdrop.fit}"
  aria-hidden="true"
  style="background-image: {backdropImageUrl && !backdropLoadFailed
    ? `url(${JSON.stringify(backdropImageUrl)})`
    : 'none'}; --backdrop-blur: {config.theme.backdrop.blur}px; --backdrop-opacity: {config.theme.backdrop.opacity};"
>
  {#if backdropImageUrl}
    <img
      src={backdropImageUrl}
      alt=""
      decoding="async"
      class="backdrop-probe"
      onload={() => (backdropLoadFailed = false)}
      onerror={() => (backdropLoadFailed = true)}
    />
  {/if}
</div>

<div
  class="app"
  class:footer-after-content={config.behaviour.footerPosition === 'after-content'}
  style="--content-max-width: {contentMaxWidth};"
>
  <h1 class="visually-hidden">Homebase</h1>
  {#if hasHeaderWidgets}
    <header class="widget-row">
      <WidgetSlot slot="header-left" widgets={config.widgets} position="left" />
      <WidgetSlot slot="header-center" widgets={config.widgets} position="center" />
      <WidgetSlot slot="header-right" widgets={config.widgets} position="right" />
    </header>
  {/if}

  <main>
    <TabBar
      tabs={config.tabs}
      activeTabId={uiState.activeTabId}
      onSelect={(id) => (uiState.activeTabId = id)}
    />
    {#if activeTab}
      <LinkGrid
        tab={activeTab}
        mnemonics={mnemonicsByTab.get(activeTab.id)!}
        showMnemonics={config.behaviour.showMnemonics}
      />
    {/if}
  </main>

  {#if hasFooterWidgets}
    <footer class="widget-row">
      <WidgetSlot slot="footer-left" widgets={config.widgets} position="left" />
      <WidgetSlot slot="footer-center" widgets={config.widgets} position="center" />
      <WidgetSlot slot="footer-right" widgets={config.widgets} position="right" />
    </footer>
  {/if}
</div>

{#if !uiState.isModalOpen}
  <MobileActionBar
    onSearch={() => uiState.openModal('search')}
    onHelp={() => uiState.openModal('help')}
    onSettings={() => uiState.openModal('settings')}
  />
{/if}

{#if configState.persistFailed}
  <div class="persist-banner" role="alert">
    <span>{configState.lastPersistError}</span>
    <button type="button" onclick={() => uiState.openModal('settings')}>
      {strings.settings.persistFailedBannerCta}
    </button>
  </div>
{/if}

{#if serviceWorkerState.updateAvailable}
  <div class="persist-banner" role="alert">
    <span>{strings.serviceWorker.updateAvailable}</span>
    <button type="button" onclick={() => serviceWorkerState.reload()}>
      {strings.serviceWorker.reload}
    </button>
    <button
      type="button"
      class="dismiss-button"
      aria-label={strings.serviceWorker.dismiss}
      onclick={() => serviceWorkerState.dismiss()}
    >
      ×
    </button>
  </div>
{/if}

<SearchDialog
  open={uiState.activeModal === 'search'}
  {config}
  onClose={() => uiState.closeModal()}
  onOpenTheme={() => uiState.openModal('theme')}
/>
<ShortcutsHelp open={uiState.activeModal === 'help'} onClose={() => uiState.closeModal()} />
<SettingsPanel open={uiState.activeModal === 'settings'} onClose={() => uiState.closeModal()} />
<ThemeEditor open={uiState.activeModal === 'theme'} onClose={() => uiState.closeModal()} />

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: var(--space-4);
    gap: var(--space-4);
    max-width: var(--content-max-width, 100%);
    width: 100%;
    margin-inline: auto;
  }

  main {
    flex: 1;
  }

  .app.footer-after-content main {
    flex: none;
  }

  .widget-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-3);
  }

  .backdrop-layer {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background-position: center;
    background-repeat: no-repeat;
    filter: blur(var(--backdrop-blur, 0px));
    opacity: var(--backdrop-opacity, 1);
  }

  .backdrop-layer.fit-cover {
    background-size: cover;
  }

  .backdrop-layer.fit-contain {
    background-size: contain;
  }

  .backdrop-layer.fit-tile {
    background-size: auto;
    background-repeat: repeat;
  }

  .backdrop-probe {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .persist-banner {
    position: fixed;
    bottom: var(--space-3);
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    max-width: min(90vw, 480px);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius, 12px);
    background: var(--surface-overlay);
    border: 1px solid var(--status-warning);
    color: var(--text-primary);
    font-size: 0.85em;
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
  }

  .dismiss-button {
    padding: 0 var(--space-2);
    line-height: 1;
    font-size: 1.1em;
  }
</style>
