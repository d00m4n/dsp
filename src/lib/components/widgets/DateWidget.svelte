<script lang="ts">
  import type { DateWidget as DateWidgetConfig, Widget } from '../../../types/config';
  import { ticker } from '../../state/ticker.svelte';
  import { getIsoWeek } from '../../widgets/isoWeek';
  import { strings } from '../../strings';
  import IconGlyph from '../ui/IconGlyph.svelte';

  interface Props {
    widget: Widget;
  }

  const { widget: raw }: Props = $props();
  // Dispatched here only for widgets of type 'date' (see registry.ts).
  const widget = $derived(raw as DateWidgetConfig);

  $effect(() => ticker.subscribeMinute());

  const formatter = $derived(
    new Intl.DateTimeFormat(widget.locale, {
      dateStyle: widget.style,
      timeZone: widget.timezone,
    }),
  );

  /** Capitalises the first grapheme, not the first UTF-16 code unit. */
  function capitaliseFirst(text: string, locale: string): string {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
    const first = segmenter.segment(text)[Symbol.iterator]().next();
    if (first.done) return text;
    const segment = first.value.segment;
    if (!/\p{L}/u.test(segment)) return text;
    return segment.toLocaleUpperCase(locale) + text.slice(segment.length);
  }

  /** Reads the date in the widget's timezone, independent of the machine's own. */
  function dateInTimezone(epochMs: number, timeZone: string): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(epochMs);
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    return new Date(year, month - 1, day);
  }

  const now = $derived(ticker.now);
  const rawFormatted = $derived(formatter.format(now));
  const formatted = $derived(
    widget.capitalise ? capitaliseFirst(rawFormatted, widget.locale) : rawFormatted,
  );
  const weekNumber = $derived(
    widget.showWeekNumber ? getIsoWeek(dateInTimezone(now, widget.timezone)) : null,
  );
  const iso = $derived(new Date(now).toISOString());
</script>

<time class="date-widget" datetime={iso}>
  <IconGlyph name="calendar" size={16} />
  {#if widget.label}<span class="label">{widget.label}</span>{/if}
  {formatted}
  {#if weekNumber !== null}<span class="week">{strings.date.week(weekNumber)}</span>{/if}
</time>

<style>
  .date-widget {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .label {
    color: var(--text-muted);
    font-size: 0.8em;
  }

  .week {
    color: var(--text-faint);
    font-size: 0.8em;
  }
</style>
