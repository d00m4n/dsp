<script lang="ts">
  import type { Widget, WidgetSlot as WidgetSlotName } from '../../../types/config';
  import { WIDGET_COMPONENTS } from '../widgets/registry';

  interface Props {
    slot: WidgetSlotName;
    widgets: Widget[];
    /** Column within the 3-column header/footer grid this slot occupies. */
    position: 'left' | 'center' | 'right';
  }

  const { slot, widgets, position }: Props = $props();

  const items = $derived(
    widgets
      .filter((w) => w.slot === slot && w.enabled)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
  );

  const column = $derived(position === 'left' ? 1 : position === 'center' ? 2 : 3);
  const justify = $derived(
    position === 'left' ? 'flex-start' : position === 'center' ? 'center' : 'flex-end',
  );
</script>

{#if items.length > 0}
  <div
    class="widget-slot"
    data-slot={slot}
    style:grid-column={column}
    style:justify-content={justify}
  >
    {#each items as widget (widget.id)}
      {@const WidgetComponent = WIDGET_COMPONENTS[widget.type]}
      <WidgetComponent {widget} />
    {/each}
  </div>
{/if}

<style>
  /* No container is rendered at all when empty, so an empty slot never
     takes up height or leaves a gap (PRD RF-28). Populated slots pin
     themselves to their intended grid column explicitly, since an empty
     sibling slot renders nothing and would otherwise shift auto-placement. */
  .widget-slot {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
</style>
