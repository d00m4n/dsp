import type { Component } from 'svelte';
import type { Widget } from '../../../types/config';
import Clock from './Clock.svelte';
import DateWidget from './DateWidget.svelte';
import Weather from './Weather.svelte';
import Greeting from './Greeting.svelte';
import Phrase from './Phrase.svelte';

/**
 * The single dispatch point from a widget's `type` to its component.
 * `satisfies` makes adding a new Widget variant without a matching entry
 * here a compile error, instead of a silently-blank widget slot.
 */
export const WIDGET_COMPONENTS = {
  clock: Clock,
  date: DateWidget,
  weather: Weather,
  greeting: Greeting,
  phrase: Phrase,
} as const satisfies Record<Widget['type'], Component<{ widget: Widget }>>;
