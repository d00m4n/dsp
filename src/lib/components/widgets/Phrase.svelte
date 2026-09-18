<script lang="ts">
  import { untrack } from 'svelte';
  import type { PhraseWidget, Widget } from '../../../types/config';
  import { pickRandomPhrase } from '../../widgets/phrases';

  interface Props {
    widget: Widget;
  }

  const { widget: raw }: Props = $props();
  // Dispatched here only for widgets of type 'phrase' (see registry.ts).
  const widget = $derived(raw as PhraseWidget);

  // Picked once when the widget mounts, so it stays the same phrase for the
  // rest of the session and only changes on the next page load.
  const text = untrack(() => pickRandomPhrase(widget.phrases));
</script>

{#if text}
  <p class="phrase">
    {#if widget.label}<span class="label">{widget.label}</span>{/if}
    {text}
  </p>
{/if}

<style>
  .phrase {
    margin: 0;
  }

  .label {
    color: var(--text-muted);
    font-size: 0.8em;
    margin-inline-end: var(--space-1);
  }
</style>
