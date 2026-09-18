<script lang="ts">
  import IconGlyph from '../ui/IconGlyph.svelte';
  import { strings } from '../../strings';

  interface Props {
    onSearch: () => void;
    onHelp: () => void;
    onSettings: () => void;
  }

  const { onSearch, onHelp, onSettings }: Props = $props();
</script>

<!--
  Typing '/', '?' or ',' requires switching to a symbol keyboard on most
  phones, so this bar gives touch users a tap-based way to reach the same
  three actions. Hidden on pointer:fine devices via CSS, not JS, so it never
  shows on desktop even in a narrow window.
-->
<div class="mobile-action-bar">
  <button type="button" onclick={onSearch} aria-label={strings.mobileActions.search}>
    <IconGlyph name="search" />
  </button>
  <button type="button" onclick={onHelp} aria-label={strings.mobileActions.help}>
    <IconGlyph name="help" />
  </button>
  <button type="button" onclick={onSettings} aria-label={strings.mobileActions.settings}>
    <IconGlyph name="settings" />
  </button>
</div>

<style>
  .mobile-action-bar {
    display: none;
    position: fixed;
    right: var(--space-3);
    bottom: var(--space-3);
    z-index: 50;
    flex-direction: column;
    gap: var(--space-2);
  }

  @media (hover: none) and (pointer: coarse) {
    .mobile-action-bar {
      display: flex;
    }
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    border: 1px solid var(--border-subtle);
    background: var(--surface-overlay);
    color: var(--icon);
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
  }

  button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: no-preference) {
    button {
      transition: transform 0.15s ease;
    }

    button:active {
      transform: scale(0.92);
    }
  }
</style>
