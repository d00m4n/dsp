<script lang="ts">
  import type { GreetingWidget, Widget } from '../../../types/config';
  import { ticker } from '../../state/ticker.svelte';
  import { fillGreetingTemplate, partOfDay } from '../../widgets/greeting';
  import { strings } from '../../strings';

  interface Props {
    widget: Widget;
  }

  const { widget: raw }: Props = $props();
  // Dispatched here only for widgets of type 'greeting' (see registry.ts).
  const widget = $derived(raw as GreetingWidget);

  $effect(() => ticker.subscribeMinute());

  const now = $derived(ticker.now);
  const part = $derived(partOfDay(new Date(now).getHours()));
  const template = $derived(widget.templates?.[part] ?? strings.greeting[part]);
  const text = $derived(fillGreetingTemplate(template, widget.name));
</script>

<p class="greeting">{text}</p>

<style>
  .greeting {
    margin: 0;
  }
</style>
