<script lang="ts">
  import type { BitcoinWidget, Widget } from '../../../types/config';
  import { fetchBitcoinPrice, type BitcoinSnapshot } from '../../bitcoin/coingecko';
  import { readBitcoinCache, writeBitcoinCache } from '../../bitcoin/cache';
  import { ticker } from '../../state/ticker.svelte';
  import { strings } from '../../strings';

  interface Props {
    widget: Widget;
  }

  const { widget: raw }: Props = $props();
  // Dispatched here only for widgets of type 'bitcoin' (see registry.ts).
  const widget = $derived(raw as BitcoinWidget);

  type Status = 'loading' | 'ready' | 'stale' | 'unavailable';

  let status = $state<Status>('loading');
  let snapshot = $state<BitcoinSnapshot | null>(null);
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
        const result = await fetchBitcoinPrice({
          currency: widget.currency,
          signal: controller.signal,
        });
        if (result) {
          snapshot = result;
          fetchedAt = Date.now();
          status = 'ready';
          writeBitcoinCache(widget.currency, result);
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

    const cached = readBitcoinCache(widget.currency);
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

  // Rides the single app-wide minute ticker (see ticker.svelte.ts) instead of
  // its own timer, per the one-timer rule: while the tab is open and visible,
  // each minute boundary is a cheap chance to notice the cache has expired.
  $effect(() => {
    if (!widget.enabled) return;
    return ticker.subscribeMinute();
  });

  $effect(() => {
    void ticker.now;
    if (!widget.enabled) return;
    if (isExpired(fetchedAt)) void refresh();
  });

  const priceLabel = $derived(
    snapshot ? strings.bitcoin.formatPrice(snapshot.price, widget.currency) : null,
  );
  const changeLabel = $derived(
    snapshot && snapshot.change24h !== null ? strings.bitcoin.formatChange(snapshot.change24h) : null,
  );

  const ariaLabel = $derived(
    priceLabel ? strings.bitcoin.label(priceLabel, changeLabel) : strings.bitcoin.unavailable,
  );
</script>

<div class="bitcoin" class:loading={status === 'loading'}>
  {#if snapshot && priceLabel}
    <span class="content" aria-label={ariaLabel} aria-live="polite">
      <span class="symbol" aria-hidden="true">{strings.bitcoin.symbol}</span>
      {#if widget.label}<span class="label">{widget.label}</span>{/if}
      <span class="price">{priceLabel}</span>
      {#if changeLabel}
        <span class="change" class:negative={(snapshot.change24h ?? 0) < 0}>{changeLabel}</span>
      {/if}
      {#if status === 'stale'}
        <span class="stale">{strings.bitcoin.stale}</span>
      {/if}
    </span>
  {:else}
    <span class="content" aria-label={ariaLabel}></span>
  {/if}
</div>

<style>
  .bitcoin {
    display: inline-flex;
    align-items: center;
    /* Reserved height keeps the header stable before the first response
       arrives, so it never jumps once the data does. */
    min-height: 1.5em;
    min-width: 4em;
    color: var(--text-widget);
  }

  .content {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .label {
    color: var(--text-muted);
    font-size: 0.8em;
  }

  .change {
    color: var(--status-success);
    font-size: 0.8em;
  }

  .change.negative {
    color: var(--status-danger);
  }

  .stale {
    color: var(--text-faint);
    font-size: 0.8em;
  }
</style>
