<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { strings } from '../../strings';
  import { configState } from '../../state/config.svelte';
  import { debounce } from '../../utils/debounce';
  import { fetchGeocode, type GeocodeResult } from '../../geocoding/openMeteoGeocode';
  import type { WeatherWidget } from '../../../types/config';

  interface Props {
    widget: WeatherWidget;
  }

  const { widget }: Props = $props();

  const t = strings.settings.widgets;

  // This component instance is keyed by `widget.id` in the parent `#each`,
  // so capturing only the initial value here (a fresh instance per widget)
  // is intentional, mirroring `LinkEditor.svelte`'s draft pattern.
  let query = $state(untrack(() => widget.label));
  let results: GeocodeResult[] = $state([]);
  let status: 'idle' | 'loading' | 'error' = $state('idle');
  // Guards against firing further requests right after a result is picked;
  // typing again in the field clears it, per spec (not a permanent lock).
  let selected = $state(false);

  let controller: AbortController | null = null;

  function resultLabel(result: GeocodeResult): string {
    return [result.name, result.admin1, result.country].filter(Boolean).join(', ');
  }

  async function runSearch(q: string): Promise<void> {
    controller?.abort();
    const own = new AbortController();
    controller = own;
    status = 'loading';
    try {
      const found = await fetchGeocode(q, own.signal);
      if (controller !== own) return; // superseded by a newer request
      results = found;
      status = 'idle';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (controller !== own) return;
      status = 'error';
      results = [];
    }
  }

  const debouncedSearch = debounce((q: string) => {
    void runSearch(q);
  }, 400);

  function handleInput(event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    query = value;
    selected = false;
    debouncedSearch.cancel();
    if (value.trim().length < 3) {
      results = [];
      status = 'idle';
      return;
    }
    debouncedSearch(value);
  }

  function selectResult(result: GeocodeResult): void {
    debouncedSearch.cancel();
    controller?.abort();
    controller = null;
    selected = true;
    results = [];
    status = 'idle';
    query = resultLabel(result);
    configState.update((draft) => {
      const w = draft.widgets.find((widget2) => widget2.id === widget.id);
      if (w && w.type === 'weather') {
        w.latitude = result.latitude;
        w.longitude = result.longitude;
        w.label = resultLabel(result);
      }
    });
  }

  function updateManual(field: 'latitude' | 'longitude', value: number): void {
    configState.update(
      (draft) => {
        const w = draft.widgets.find((widget2) => widget2.id === widget.id);
        if (w && w.type === 'weather') w[field] = value;
      },
      { field: `widget-${widget.id}-${field}` },
    );
  }

  onDestroy(() => {
    debouncedSearch.cancel();
    controller?.abort();
  });
</script>

<div class="city-search">
  <label class="field-label" for={`city-search-${widget.id}`}>{t.citySearchLabel}</label>
  <input
    id={`city-search-${widget.id}`}
    type="text"
    placeholder={t.citySearchPlaceholder}
    value={query}
    oninput={handleInput}
  />
  {#if status === 'loading'}
    <p class="status">{t.citySearchSearching}</p>
  {:else if status === 'error'}
    <p class="status error">{t.citySearchError}</p>
  {:else if !selected && query.trim().length >= 3 && results.length === 0}
    <p class="status">{t.citySearchNoResults}</p>
  {/if}
  {#if results.length > 0}
    <ul class="results" aria-label={t.citySearchResultsLabel}>
      {#each results as result (result.id)}
        <li>
          <button type="button" onclick={() => selectResult(result)}>
            {resultLabel(result)}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="manual-coords">
    <label>
      {t.latitudeLabel}
      <input
        type="number"
        step="any"
        min="-90"
        max="90"
        value={widget.latitude}
        onchange={(event) => updateManual('latitude', Number(event.currentTarget.value))}
      />
    </label>
    <label>
      {t.longitudeLabel}
      <input
        type="number"
        step="any"
        min="-180"
        max="180"
        value={widget.longitude}
        onchange={(event) => updateManual('longitude', Number(event.currentTarget.value))}
      />
    </label>
  </div>
</div>

<style>
  .city-search {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field-label {
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  input[type='text'],
  input[type='number'] {
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
  }

  .status {
    font-size: 0.85em;
    color: var(--text-muted);
  }

  .status.error {
    color: var(--status-danger);
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    background: var(--surface-page);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1);
  }

  .results button {
    width: 100%;
    text-align: left;
    background: transparent;
    color: var(--text-primary);
    border: none;
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
    border-radius: var(--radius, 12px);
  }

  .results button:hover {
    background: var(--surface-hover);
  }

  .manual-coords {
    display: flex;
    gap: var(--space-2);
  }

  .manual-coords label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 0.85em;
    color: var(--text-secondary);
  }
</style>
