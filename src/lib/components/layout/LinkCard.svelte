<script lang="ts">
  import type { Link } from '../../../types/config';
  import type { Mnemonic } from '../../mnemonics/assign';
  import { parseName } from '../../mnemonics/parseName';
  import IconGlyph from '../ui/IconGlyph.svelte';

  interface Props {
    link: Link;
    mnemonic: Mnemonic | undefined;
    showMnemonics: boolean;
  }

  const { link, mnemonic, showMnemonics }: Props = $props();

  const displayName = $derived(parseName(link.name).display);
  const before = $derived(
    mnemonic?.displayIndex != null ? displayName.slice(0, mnemonic.displayIndex) : displayName,
  );
  const marked = $derived(
    mnemonic?.displayIndex != null ? displayName[mnemonic.displayIndex] : '',
  );
  const after = $derived(
    mnemonic?.displayIndex != null ? displayName.slice(mnemonic.displayIndex + 1) : '',
  );
</script>

<a
  class="link-card"
  href={link.url}
  target={link.newTab ? '_blank' : undefined}
  rel={link.newTab ? 'noopener noreferrer' : undefined}
  data-link-id={link.id}
>
  <span class="name">
    <IconGlyph name={link.icon} />
    <span class="label">
      {#if showMnemonics && mnemonic?.displayIndex != null}
        {before}<span class="mnemonic">{marked}</span>{after}
      {:else}
        {displayName}
      {/if}
    </span>
  </span>
  {#if showMnemonics && mnemonic && mnemonic.displayIndex == null}
    <span class="badge">{mnemonic.key}</span>
  {/if}
</a>

<style>
  .name {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .link-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-3);
    border-radius: var(--radius, 12px);
    background: var(--surface-raised);
    color: var(--text-primary);
    transition: background-color 0.15s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .link-card {
      transition: none;
    }
  }

  .link-card:hover,
  .link-card:focus-visible {
    background: var(--surface-hover);
  }

  .mnemonic {
    color: var(--mnemonic);
    font-weight: 700;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25em;
    padding: 0 0.35em;
    border-radius: 999px;
    background: var(--surface-overlay);
    color: var(--text-muted);
    font-size: 0.75em;
    text-transform: uppercase;
  }
</style>
