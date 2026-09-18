<script lang="ts">
  import type { ClockWidget, Widget } from '../../../types/config';
  import { ticker } from '../../state/ticker.svelte';
  import IconGlyph from '../ui/IconGlyph.svelte';

  interface Props {
    widget: Widget;
  }

  const { widget: raw }: Props = $props();
  // Dispatched here only for widgets of type 'clock' (see registry.ts).
  const widget = $derived(raw as ClockWidget);

  const formatter = $derived(
    new Intl.DateTimeFormat(widget.locale, {
      timeZone: widget.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: widget.showSeconds ? '2-digit' : undefined,
      hour12: widget.hour12,
    }),
  );

  $effect(() => {
    if (!widget.showSeconds) return;
    return ticker.subscribeSecond();
  });

  $effect(() => {
    if (widget.showSeconds) return;
    return ticker.subscribeMinute();
  });

  const now = $derived(ticker.now);
  const formatted = $derived(formatter.format(now));
  const iso = $derived(new Date(now).toISOString());
</script>

<time class="clock" datetime={iso}>
  <IconGlyph name="clock" size={16} />
  {#if widget.label}<span class="label">{widget.label}</span>{/if}
  {formatted}
</time>

<style>
  .clock {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-variant-numeric: tabular-nums;
  }

  .label {
    color: var(--text-muted);
    font-size: 0.8em;
  }
</style>
