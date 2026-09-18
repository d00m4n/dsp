<script lang="ts">
  import type { AppConfig, Link, Tab } from '../../../types/config';
  import { extractBang } from '../../search/bangs';
  import { detectUrl } from '../../search/urlDetect';
  import { fuzzyMatch, type Candidate, type Match } from '../../search/fuzzy';
  import { isAllowedUrl } from '../../search/protocols';
  import { parseName } from '../../mnemonics/parseName';
  import { strings } from '../../strings';
  import Modal from '../ui/Modal.svelte';

  interface Props {
    open: boolean;
    config: AppConfig;
    onClose: () => void;
    onOpenTheme: () => void;
  }

  const { open, config, onClose, onOpenTheme }: Props = $props();

  let query = $state('');
  let selectedIndex = $state(0);
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (open) {
      query = '';
      selectedIndex = 0;
      // Focus after the dialog has actually opened (see Modal's $effect order).
      queueMicrotask(() => inputEl?.focus());
    }
  });

  function hostOf(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  const candidates = $derived.by(() => {
    const list: Candidate[] = [];
    config.tabs.forEach((tab, tabIndex) => {
      tab.groups.forEach((group, groupIndex) => {
        group.links.forEach((link, positionInGroup) => {
          list.push({
            linkId: link.id,
            tabId: tab.id,
            tabIndex,
            groupIndex,
            positionInGroup,
            name: parseName(link.name).display,
            host: hostOf(link.url),
          });
        });
      });
    });
    return list;
  });

  function findTabAndLink(tabId: string, linkId: string): { tab: Tab; link: Link } | null {
    const tab = config.tabs.find((t) => t.id === tabId);
    if (!tab) return null;
    for (const group of tab.groups) {
      const link = group.links.find((l) => l.id === linkId);
      if (link) return { tab, link };
    }
    return null;
  }

  const bang = $derived(extractBang(query, config.search.engines));
  const engine = $derived(
    config.search.engines.find((e) => e.id === (bang.engineId ?? config.search.defaultEngineId)) ??
      config.search.engines[0],
  );
  const trimmedRaw = $derived(query.trim());
  const bangQuery = $derived(bang.query.trim());

  const directNavUrl = $derived(
    config.search.detectUrls && trimmedRaw !== '' ? detectUrl(trimmedRaw) : null,
  );

  const linkMatches = $derived<Match[]>(
    bangQuery === '' ? [] : fuzzyMatch(bangQuery, candidates).slice(0, 8),
  );

  function engineHomepage(template: string): string | null {
    try {
      return new URL(template).origin + '/';
    } catch {
      return null;
    }
  }

  interface ResultItem {
    kind: 'nav' | 'link' | 'web' | 'command';
    url: string;
    label: string;
    sublabel?: string;
    positions?: number[];
    disabled?: boolean;
    action?: () => void;
  }

  // Reserved command bang, checked before the usual bang/search-engine flow:
  // typed alone (not a real search engine id, so it would otherwise just be
  // searched as literal text), it opens the theme customizer instead.
  const isThemeCommand = $derived(trimmedRaw.toLowerCase() === '!theme');

  const results = $derived.by<ResultItem[]>(() => {
    if (isThemeCommand) {
      return [
        {
          kind: 'command',
          url: '',
          label: strings.themeEditor.commandLabel,
          action: onOpenTheme,
        },
      ];
    }

    const items: ResultItem[] = [];

    if (directNavUrl) {
      items.push({ kind: 'nav', url: directNavUrl, label: directNavUrl });
    }

    for (const match of linkMatches) {
      const found = findTabAndLink(match.tabId, match.linkId);
      if (!found) continue;
      items.push({
        kind: 'link',
        url: found.link.url,
        label: parseName(found.link.name).display,
        sublabel: found.tab.name,
        positions: match.positions,
      });
    }

    if (engine) {
      if (trimmedRaw === '') {
        items.push({ kind: 'web', url: '', label: `Search ${engine.name}`, disabled: true });
      } else {
        const url =
          bangQuery === ''
            ? engineHomepage(engine.template)
            : engine.template.replace('{query}', encodeURIComponent(bangQuery));
        if (url) {
          items.push({ kind: 'web', url, label: `Search ${engine.name} for "${bangQuery}"` });
        }
      }
    }

    return items;
  });

  $effect(() => {
    void results;
    selectedIndex = 0;
  });

  let liveCount = $state(0);
  $effect(() => {
    const count = results.filter((r) => !r.disabled).length;
    const timer = setTimeout(() => {
      liveCount = count;
    }, 200);
    return () => clearTimeout(timer);
  });

  function moveSelection(delta: number): void {
    if (results.length === 0) return;
    selectedIndex = (selectedIndex + delta + results.length) % results.length;
  }

  function navigate(url: string, newTab: boolean): void {
    if (!isAllowedUrl(url)) return;
    onClose();
    if (newTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  function execute(newTab: boolean): void {
    const item = results[selectedIndex];
    if (!item || item.disabled) return;
    if (item.kind === 'command') {
      onClose();
      item.action?.();
      return;
    }
    if (!item.url) return;
    navigate(item.url, newTab);
  }

  function handleInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
      event.preventDefault();
      moveSelection(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      execute(event.shiftKey);
      return;
    }
    // Escape is not handled here: it bubbles to the native <dialog> cancel
    // behaviour, which Modal.svelte routes back through onClose.
  }
</script>

<Modal label="Search" {open} {onClose}>
  <div class="search-dialog" role="search">
    <h1 class="sr-only">Search</h1>
    <input
      bind:this={inputEl}
      bind:value={query}
      onkeydown={handleInputKeydown}
      type="text"
      role="combobox"
      aria-expanded={results.length > 0}
      aria-controls="search-results"
      aria-activedescendant={results[selectedIndex] ? `search-option-${selectedIndex}` : undefined}
      autocomplete="off"
      spellcheck="false"
      placeholder="Search links, or type a URL, or !bang a query…"
    />
    <p class="sr-only" aria-live="polite">{liveCount} results</p>
    <ul id="search-results" role="listbox" class="results">
      {#each results as item, i (item.kind + item.url + item.label)}
        <li
          id={`search-option-${i}`}
          role="option"
          aria-selected={i === selectedIndex}
          aria-disabled={item.disabled}
          class:selected={i === selectedIndex}
          class:disabled={item.disabled}
        >
          <span class="label">{item.label}</span>
          {#if item.sublabel}
            <span class="sublabel">{item.sublabel}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</Modal>

<style>
  .search-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  input {
    width: 100%;
    padding: var(--space-3);
    border-radius: var(--radius, 12px);
    border: 1px solid var(--border-subtle);
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .results {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    max-height: 50vh;
    overflow-y: auto;
  }

  .results li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius, 12px);
    color: var(--text-secondary);
  }

  .results li.selected {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .results li.disabled {
    opacity: 0.5;
  }

  .sublabel {
    color: var(--text-muted);
    font-size: 0.85em;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
</style>
