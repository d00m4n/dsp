<script lang="ts">
  import { ICON_REGISTRY } from '../../icons/registry';
  import { getRemoteTablerIcon, type IconGlyphData } from '../../icons/iconifyFallback';

  interface Props {
    name: string | undefined;
    size?: number;
  }

  const { name, size = 20 }: Props = $props();

  const Glyph = $derived(name ? ICON_REGISTRY[name] : undefined);

  // Only reached for names outside the local registry: fetched from
  // Iconify's public API (see iconifyFallback.ts) and cached there, so
  // this effect re-runs per name change but never re-fetches a repeat.
  let remoteGlyph: IconGlyphData | null = $state(null);

  $effect(() => {
    if (!name || Glyph) {
      remoteGlyph = null;
      return;
    }
    let cancelled = false;
    getRemoteTablerIcon(name).then((data) => {
      if (!cancelled) remoteGlyph = data;
    });
    return () => {
      cancelled = true;
    };
  });
</script>

{#if Glyph}
  <Glyph width={size} height={size} class="icon-glyph" aria-hidden="true" focusable="false" />
{:else if remoteGlyph}
  <svg
    class="icon-glyph"
    viewBox="0 0 {remoteGlyph.width} {remoteGlyph.height}"
    width={size}
    height={size}
    aria-hidden="true"
    focusable="false"
  >
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG body from Iconify's API (see iconifyFallback.ts) -->
    {@html remoteGlyph.body}
  </svg>
{/if}

<style>
  :global(.icon-glyph) {
    flex-shrink: 0;
    color: var(--icon);
  }
</style>
