<script lang="ts">
  import type { WeatherWidget, Widget } from '../../../types/config';
  import { fetchWeather, type WeatherSnapshot } from '../../weather/openMeteo';
  import { readWeatherCache, writeWeatherCache } from '../../weather/cache';
  import { resolveCondition } from '../../weather/wmoCodes';
  import { strings } from '../../strings';

  interface Props {
    widget: Widget;
  }

  const { widget: raw }: Props = $props();
  // Dispatched here only for widgets of type 'weather' (see registry.ts).
  const widget = $derived(raw as WeatherWidget);

  type Status = 'loading' | 'ready' | 'stale' | 'unavailable';

  let status = $state<Status>('loading');
  let snapshot = $state<WeatherSnapshot | null>(null);
  let fetchedAt = $state<number | null>(null);
  let fetchInFlight = false;

  function isExpired(at: number | null): boolean {
    if (at === null) return true;
    return Date.now() - at >= widget.refreshMinutes * 60_000;
  }

  function handleFailure(): void {
    status = snapshot ? 'stale' : 'unavailable';
  }

  async function refresh(): Promise<void> {
    if (fetchInFlight) return;
    fetchInFlight = true;
    try {
      if (!navigator.onLine) {
        handleFailure();
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const result = await fetchWeather({
          latitude: widget.latitude,
          longitude: widget.longitude,
          units: widget.units,
          signal: controller.signal,
        });
        if (result) {
          snapshot = result;
          fetchedAt = Date.now();
          status = 'ready';
          writeWeatherCache(widget.latitude, widget.longitude, widget.units, result);
        } else {
          handleFailure();
        }
      } catch {
        handleFailure();
      } finally {
        clearTimeout(timeout);
      }
    } finally {
      fetchInFlight = false;
    }
  }

  $effect(() => {
    if (!widget.enabled) return; // zero requests, not even a warm-up ping

    const cached = readWeatherCache(widget.latitude, widget.longitude, widget.units);
    if (cached) {
      snapshot = cached.snapshot;
      fetchedAt = cached.fetchedAt;
      status = 'ready';
      if (isExpired(fetchedAt)) void refresh();
    } else {
      status = 'loading';
      void refresh();
    }

    function handleVisibility(): void {
      if (document.hidden) return;
      if (isExpired(fetchedAt)) void refresh();
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  });

  const condition = $derived(
    snapshot ? resolveCondition(snapshot.weatherCode, snapshot.isDay) : null,
  );

  const ariaLabel = $derived(
    snapshot && condition
      ? strings.weather.label(widget.label, snapshot.temperature, condition.label)
      : strings.weather.unavailable,
  );
</script>

<div class="weather" class:loading={status === 'loading'}>
  {#if snapshot && condition}
    <span class="content" aria-label={ariaLabel} aria-live="polite">
      <span class="symbol" aria-hidden="true">{condition.symbol}</span>
      <span class="temperature">{Math.round(snapshot.temperature)}°</span>
      <span class="place">{widget.label}</span>
      {#if status === 'stale'}
        <span class="stale">{strings.weather.stale}</span>
      {/if}
    </span>
  {:else}
    <span class="content" aria-label={ariaLabel}></span>
  {/if}
</div>

<style>
  .weather {
    display: inline-flex;
    align-items: center;
    /* Reserved height keeps the header stable before the first response
       arrives, so it never jumps once the data does (PRD RF-05). */
    min-height: 1.5em;
    min-width: 4em;
  }

  .content {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .place {
    color: var(--text-muted);
  }

  .stale {
    color: var(--text-faint);
    font-size: 0.8em;
  }
</style>
