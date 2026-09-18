<script lang="ts">
  import { SHORTCUTS, type ShortcutMeta } from '../../keyboard/shortcuts';
  import Modal from './Modal.svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  const { open, onClose }: Props = $props();

  const groups: Array<{ name: string; items: ShortcutMeta[] }> = [
    { name: 'Navigation', items: SHORTCUTS.filter((s) => s.group === 'navigation') },
    { name: 'Search', items: SHORTCUTS.filter((s) => s.group === 'search') },
    { name: 'General', items: SHORTCUTS.filter((s) => s.group === 'general') },
  ];
</script>

<Modal label="Keyboard shortcuts" {open} {onClose}>
  <div class="help">
    <h1>Keyboard shortcuts</h1>
    {#each groups as group (group.name)}
      <section>
        <h2>{group.name}</h2>
        <dl>
          {#each group.items as shortcut (shortcut.descriptionKey + shortcut.keys.join())}
            <div class="row">
              <dt>
                {#each shortcut.keys as key, i (key + i)}
                  <kbd>{key}</kbd>
                {/each}
              </dt>
              <dd>{shortcut.descriptionKey}</dd>
            </div>
          {/each}
        </dl>
      </section>
    {/each}
  </div>
</Modal>

<style>
  .help {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  h1 {
    font-size: 1.1rem;
  }

  h2 {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    margin-bottom: var(--space-2);
  }

  dl {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }

  dt {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  dd {
    margin: 0;
    color: var(--text-secondary);
    text-align: right;
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5em;
    padding: 0.1em 0.4em;
    border-radius: 6px;
    background: var(--surface-overlay);
    color: var(--text-primary);
    font-size: 0.8em;
    font-family: inherit;
  }
</style>
