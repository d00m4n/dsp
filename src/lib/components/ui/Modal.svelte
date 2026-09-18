<script lang="ts">
  import type { Snippet } from 'svelte';
  import { strings } from '../../strings';

  interface Props {
    label: string;
    open: boolean;
    onClose: () => void;
    children: Snippet;
    class?: string;
    /** CSS selector (relative to the dialog) focused instead of the browser's
     * default (the first focusable element — typically the close button). */
    initialFocus?: string;
  }

  const { label, open, onClose, children, class: className, initialFocus }: Props = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();
  let previouslyFocused: HTMLElement | null = null;

  $effect(() => {
    if (!dialogEl) return;
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      if (!dialogEl.open) {
        dialogEl.showModal();
        if (initialFocus) {
          dialogEl.querySelector<HTMLElement>(initialFocus)?.focus();
        }
      }
    } else if (dialogEl.open) {
      dialogEl.close();
    }
  });

  // The dialog routes its own closing through onClose -> the `open` prop,
  // rather than letting the browser close it unprompted on Escape.
  function handleCancel(event: Event): void {
    event.preventDefault();
    onClose();
  }

  function handleClose(): void {
    previouslyFocused?.focus();
    previouslyFocused = null;
  }
</script>

<dialog
  bind:this={dialogEl}
  aria-label={label}
  onclose={handleClose}
  oncancel={handleCancel}
  class={className}
>
  <button type="button" class="close-button" aria-label={strings.settings.close} onclick={onClose}>
    ×
  </button>
  {@render children()}
</dialog>

<style>
  dialog {
    position: relative;
    background: var(--surface-raised);
    color: var(--text-primary);
    border: none;
    border-radius: var(--radius, 12px);
    padding: var(--space-4);
    max-width: min(90vw, 640px);
    width: 100%;
    margin: auto;
  }

  .close-button {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: var(--radius, 12px);
    background: transparent;
    color: var(--text-secondary);
    font-size: 1.3rem;
    line-height: 1;
    cursor: pointer;
  }

  .close-button:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  dialog::backdrop {
    background: var(--surface-sunken);
    opacity: 0.7;
  }

  @media (prefers-reduced-motion: no-preference) {
    dialog[open] {
      animation: modal-in 0.15s ease;
    }
  }

  @keyframes modal-in {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
