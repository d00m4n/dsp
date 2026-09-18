<script lang="ts">
  import { strings } from '../../strings';
  import { configState } from '../../state/config.svelte';
  import { announcedMessage } from '../../state/announcer.svelte';
  import Modal from '../ui/Modal.svelte';
  import AppearanceSection from './AppearanceSection.svelte';
  import SearchSection from './SearchSection.svelte';
  import TabsLinksSection from './TabsLinksSection.svelte';
  import WidgetsSection from './WidgetsSection.svelte';
  import DataSection from './DataSection.svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  const { open, onClose }: Props = $props();

  type SectionId = 'appearance' | 'search' | 'tabsAndLinks' | 'widgets' | 'data';

  const sections: Array<{ id: SectionId; label: string }> = [
    { id: 'appearance', label: strings.settings.nav.appearance },
    { id: 'search', label: strings.settings.nav.search },
    { id: 'tabsAndLinks', label: strings.settings.nav.tabsAndLinks },
    { id: 'widgets', label: strings.settings.nav.widgets },
    { id: 'data', label: strings.settings.nav.data },
  ];

  let activeSection: SectionId = $state('appearance');

  // Roving-tabindex arrow-key navigation between nav items (Home/End jump
  // to the first/last): Up/Left and Down/Right both work since the nav is
  // a horizontal row on narrow viewports (see the max-width: 720px rule
  // below) but a vertical column otherwise.
  function handleNavKeydown(event: KeyboardEvent): void {
    let delta: number;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') delta = -1;
    else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') delta = 1;
    else if (event.key === 'Home') delta = -Infinity;
    else if (event.key === 'End') delta = Infinity;
    else return;

    event.preventDefault();
    const currentIndex = sections.findIndex((s) => s.id === activeSection);
    const lastIndex = sections.length - 1;
    const nextIndex = Math.max(0, Math.min(lastIndex, currentIndex + delta));
    const next = sections[nextIndex];
    if (!next) return;
    activeSection = next.id;

    const nav = event.currentTarget as HTMLElement;
    const button = nav.querySelectorAll<HTMLButtonElement>('.nav-item')[nextIndex];
    button?.focus();
  }

  // Ctrl+Z / Ctrl+Shift+Z only act while the settings panel is open. This is
  // intentionally local rather than routed through shortcuts.ts, which
  // explicitly bails out on event.ctrlKey for the whole rest of the app.
  $effect(() => {
    if (!open) return;

    function handleKeydown(event: KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) {
        configState.redo();
      } else {
        configState.undo();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<Modal
  label={strings.settings.title}
  {open}
  {onClose}
  class="settings-modal"
  initialFocus=".nav-item.active"
>
  <div class="settings-panel">
    <h1 class="sr-only">{strings.settings.title}</h1>
    <div
      class="settings-nav"
      role="tablist"
      tabindex="-1"
      aria-label={strings.settings.title}
      onkeydown={handleNavKeydown}
    >
      {#each sections as section (section.id)}
        <button
          type="button"
          id={`settings-tab-${section.id}`}
          class="nav-item"
          class:active={section.id === activeSection}
          role="tab"
          aria-selected={section.id === activeSection}
          aria-controls="settings-tabpanel"
          tabindex={section.id === activeSection ? 0 : -1}
          onclick={() => (activeSection = section.id)}
        >
          {section.label}
        </button>
      {/each}
    </div>

    <div
      class="settings-content"
      id="settings-tabpanel"
      role="tabpanel"
      aria-labelledby={`settings-tab-${activeSection}`}
      tabindex="-1"
    >
      {#if open}
        {#if activeSection === 'appearance'}
          <AppearanceSection />
        {:else if activeSection === 'search'}
          <SearchSection />
        {:else if activeSection === 'tabsAndLinks'}
          <TabsLinksSection />
        {:else if activeSection === 'widgets'}
          <WidgetsSection />
        {:else if activeSection === 'data'}
          <DataSection />
        {/if}
      {/if}
    </div>
  </div>

  <div class="sr-only" aria-live="polite">{announcedMessage()}</div>
</Modal>

<style>
  .settings-panel {
    display: flex;
    gap: var(--space-4);
    min-height: 50vh;
    /* Clears the close button (Modal.svelte), pinned to the dialog's top-right corner. */
    padding-right: 2rem;
  }

  .settings-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex-shrink: 0;
    width: 180px;
  }

  .nav-item {
    text-align: left;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius, 12px);
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid transparent;
    cursor: pointer;
  }

  .nav-item:hover {
    background: var(--surface-hover);
  }

  .nav-item.active {
    background: var(--surface-raised);
    color: var(--text-primary);
    border-color: var(--border-subtle);
  }

  .settings-content {
    flex: 1;
    min-width: 0;
    max-height: 70vh;
    overflow-y: auto;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  @media (max-width: 720px) {
    .settings-panel {
      flex-direction: column;
    }

    .settings-nav {
      flex-direction: row;
      width: 100%;
      overflow-x: auto;
    }

    .nav-item {
      flex-shrink: 0;
    }
  }

  /* Overrides Modal.svelte's default max-width: min(90vw, 640px) so the
     side nav + content layout has room to breathe. Global because the
     .settings-modal class is applied to the <dialog> element that Modal.svelte
     owns, outside this component's scoping. */
  :global(dialog.settings-modal) {
    max-width: min(95vw, 960px);
    max-height: 85vh;
  }
</style>
