<script lang="ts">
  import { strings } from '../../strings';
  import { ICON_NAMES } from '../../icons/registry';

  const t = strings.settings.tabsLinks;
</script>

<details class="icon-help">
  <summary>{t.iconHelpSummary}</summary>
  <p>
    {t.iconHelpIntro}
    <a href="https://tabler.io/icons" target="_blank" rel="noopener noreferrer">tabler.io/icons</a>.
    {t.iconHelpAvailable}
  </p>
  <ul class="icon-name-list">
    {#each ICON_NAMES as name (name)}
      <li><code>{name}</code></li>
    {/each}
  </ul>
</details>

<style>
  .icon-help {
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  summary {
    cursor: pointer;
    color: var(--text-primary);
  }

  p {
    margin: var(--space-2) 0;
  }

  a {
    text-decoration: underline;
  }

  .icon-name-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-2);
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 8rem;
    overflow-y: auto;
  }

  .icon-name-list code {
    background: var(--surface-overlay);
    border-radius: 4px;
    padding: 0 0.35em;
  }
</style>
