<script lang="ts">
  import { strings } from '../../strings';
  import { configState } from '../../state/config.svelte';
  import { announce } from '../../state/announcer.svelte';
  import { attachPointerReorder, reorderByPointer } from '../../reorder/pointerReorder';
  import { moveByKeyboard } from '../../reorder/keyboardReorder';
  import { targetIndexForKeyboardMove } from './reorder';
  import { timezone as validateTimezone, locale as validateLocale } from '../../config/parse';
  import { WIDGET_COMPONENTS } from '../widgets/registry';
  import { generateId } from '../../utils/id';
  import CitySearch from './CitySearch.svelte';
  import type {
    BehaviourConfig,
    ClockWidget,
    DateWidget,
    GreetingWidget,
    PhraseWidget,
    Widget,
    WidgetSlot,
    WeatherWidget,
  } from '../../../types/config';

  const t = strings.settings.widgets;

  const SLOTS: readonly WidgetSlot[] = [
    'header-left',
    'header-center',
    'header-right',
    'footer-left',
    'footer-center',
    'footer-right',
  ];

  const DATE_STYLES = ['full', 'long', 'medium', 'short'] as const;
  const WIDGET_TYPES = Object.keys(WIDGET_COMPONENTS) as Widget['type'][];

  const SUPPORTS_TIMEZONE_LIST = typeof Intl.supportedValuesOf === 'function';
  const TIMEZONES: readonly string[] = SUPPORTS_TIMEZONE_LIST ? Intl.supportedValuesOf('timeZone') : [];

  const widgets = $derived(configState.config.widgets);
  const footerPosition = $derived(configState.config.behaviour.footerPosition);

  const FOOTER_POSITIONS: readonly BehaviourConfig['footerPosition'][] = [
    'page-end',
    'after-content',
  ];
  const FOOTER_POSITION_LABELS: Record<BehaviourConfig['footerPosition'], string> = {
    'page-end': t.footerPositionPageEnd,
    'after-content': t.footerPositionAfterContent,
  };

  function setFooterPosition(position: BehaviourConfig['footerPosition']): void {
    configState.update(
      (draft) => {
        draft.behaviour.footerPosition = position;
      },
      { field: 'footer-position' },
    );
  }

  function widgetsInSlot(slot: WidgetSlot): Widget[] {
    return widgets.filter((w) => w.slot === slot).sort((a, b) => a.order - b.order);
  }

  function widgetName(widget: Widget): string {
    const typeLabel = t.typeLabels[widget.type];
    switch (widget.type) {
      case 'clock':
      case 'date':
        return widget.label ? `${typeLabel} — ${widget.label}` : typeLabel;
      case 'weather':
        return widget.label ? `${typeLabel} — ${widget.label}` : typeLabel;
      case 'greeting':
        return widget.name ? `${typeLabel} — ${widget.name}` : typeLabel;
      case 'phrase':
        return widget.label ? `${typeLabel} — ${widget.label}` : typeLabel;
    }
  }

  function findWidget(widgetId: string): Widget | undefined {
    return configState.config.widgets.find((w) => w.id === widgetId);
  }

  function toggleEnabled(widgetId: string): void {
    configState.update((draft) => {
      const w = draft.widgets.find((widget) => widget.id === widgetId);
      if (w) w.enabled = !w.enabled;
    });
  }

  function deleteWidget(widgetId: string): void {
    configState.update(
      (draft) => {
        draft.widgets = draft.widgets.filter((widget) => widget.id !== widgetId);
      },
      { destructive: true },
    );
  }

  function newWidgetFields(type: Widget['type']): Widget {
    const id = generateId();
    const slot: WidgetSlot = 'header-left';
    const order = widgetsInSlot(slot).length;
    const base = { id, slot, order, enabled: true };
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    switch (type) {
      case 'clock':
        return {
          ...base,
          type: 'clock',
          timezone: systemTimezone,
          hour12: false,
          showSeconds: false,
          locale: 'en-GB',
        };
      case 'date':
        return {
          ...base,
          type: 'date',
          timezone: systemTimezone,
          locale: 'en-GB',
          style: 'full',
          capitalise: false,
          showWeekNumber: false,
        };
      case 'weather':
        return {
          ...base,
          type: 'weather',
          latitude: 0,
          longitude: 0,
          label: 'Weather',
          units: 'metric',
          refreshMinutes: 30,
        };
      case 'greeting':
        return { ...base, type: 'greeting', name: '' };
      case 'phrase':
        return { ...base, type: 'phrase', phrases: [] };
    }
  }

  function addWidget(type: Widget['type']): void {
    const widget = newWidgetFields(type);
    configState.update((draft) => {
      draft.widgets.push(widget);
    });
  }

  function applySlotOrder(slot: WidgetSlot, nextIds: string[]): void {
    configState.update(
      (draft) => {
        nextIds.forEach((id, index) => {
          const w = draft.widgets.find((widget) => widget.id === id);
          if (w) w.order = index;
        });
      },
      { field: `widget-order-${slot}` },
    );
  }

  function moveWithinSlot(widgetId: string, slot: WidgetSlot, direction: 'up' | 'down'): void {
    const ids = widgetsInSlot(slot).map((w) => w.id);
    const targetIndex = targetIndexForKeyboardMove(ids, widgetId, direction);
    const next = reorderByPointer(ids, widgetId, targetIndex);
    if (next.join('|') === ids.join('|')) return;
    applySlotOrder(slot, next);
    announce(t.moved(widgetName(findWidget(widgetId)!), t.slotLabels[slot], next.indexOf(widgetId) + 1));
  }

  function setWidgetSlot(widgetId: string, fromSlot: WidgetSlot, toSlot: WidgetSlot): void {
    if (toSlot === fromSlot) return;
    const name = widgetName(findWidget(widgetId)!);
    let newPosition = 1;

    configState.update(
      (draft) => {
        const remaining = draft.widgets
          .filter((w) => w.slot === fromSlot && w.id !== widgetId)
          .sort((a, b) => a.order - b.order);
        remaining.forEach((w, index) => {
          w.order = index;
        });
        const moved = draft.widgets.find((w) => w.id === widgetId);
        if (!moved) return;
        const destination = draft.widgets
          .filter((w) => w.slot === toSlot)
          .sort((a, b) => a.order - b.order);
        moved.slot = toSlot;
        moved.order = destination.length;
        newPosition = destination.length + 1;
      },
      { field: `widget-${widgetId}-slot` },
    );

    announce(t.moved(name, t.slotLabels[toSlot], newPosition));
  }

  function moveToSlot(widgetId: string, fromSlot: WidgetSlot, direction: 'left' | 'right'): void {
    const currentIndex = SLOTS.indexOf(fromSlot);
    const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= SLOTS.length) return;
    setWidgetSlot(widgetId, fromSlot, SLOTS[nextIndex]!);
  }

  function handleKeydown(widgetId: string, slot: WidgetSlot, event: KeyboardEvent): void {
    const direction = moveByKeyboard(event);
    if (direction === null) return;
    event.preventDefault();
    if (direction === 'up' || direction === 'down') {
      moveWithinSlot(widgetId, slot, direction);
    } else {
      moveToSlot(widgetId, slot, direction);
    }
  }

  function attachSlotReorder(node: HTMLElement, slot: WidgetSlot) {
    return attachPointerReorder(node, {
      items: () => widgetsInSlot(slot).map((w) => w.id),
      handleSelector: '.drag-handle',
      onReorder: (nextIds) => applySlotOrder(slot, nextIds),
      onAnnounce: (draggedId, _from, toIndex) => {
        announce(t.moved(widgetName(findWidget(draggedId)!), t.slotLabels[slot], toIndex + 1));
      },
    });
  }

  function updateTimezone(widgetId: string, value: string): void {
    const errors: { path: string; reason: string }[] = [];
    const validated = validateTimezone(value, 'timezone', value, errors);
    if (errors.length > 0) return;
    configState.update(
      (draft) => {
        const w = draft.widgets.find((widget) => widget.id === widgetId);
        if (w && (w.type === 'clock' || w.type === 'date')) w.timezone = validated;
      },
      { field: `widget-${widgetId}-timezone` },
    );
  }

  function updateLocale(widgetId: string, value: string): void {
    const errors: { path: string; reason: string }[] = [];
    const validated = validateLocale(value, 'locale', value, errors);
    if (errors.length > 0) return;
    configState.update(
      (draft) => {
        const w = draft.widgets.find((widget) => widget.id === widgetId);
        if (w && (w.type === 'clock' || w.type === 'date')) w.locale = validated;
      },
      { field: `widget-${widgetId}-locale` },
    );
  }

  function isTimezoneValid(value: string): boolean {
    const errors: { path: string; reason: string }[] = [];
    validateTimezone(value, 'timezone', value, errors);
    return errors.length === 0;
  }

  function isLocaleValid(value: string): boolean {
    const errors: { path: string; reason: string }[] = [];
    validateLocale(value, 'locale', value, errors);
    return errors.length === 0;
  }

  function updateClockDateField(
    widgetId: string,
    fieldName: string,
    mutate: (w: ClockWidget | DateWidget) => void,
  ): void {
    configState.update(
      (draft) => {
        const w = draft.widgets.find((widget) => widget.id === widgetId);
        if (w && (w.type === 'clock' || w.type === 'date')) mutate(w);
      },
      { field: `widget-${widgetId}-${fieldName}` },
    );
  }

  function updateWeatherField<K extends keyof WeatherWidget>(
    widgetId: string,
    field: K,
    value: WeatherWidget[K],
  ): void {
    configState.update(
      (draft) => {
        const w = draft.widgets.find((widget) => widget.id === widgetId);
        if (w && w.type === 'weather') w[field] = value;
      },
      { field: `widget-${widgetId}-${String(field)}` },
    );
  }

  function updateGreetingField<K extends keyof GreetingWidget>(
    widgetId: string,
    field: K,
    value: GreetingWidget[K],
  ): void {
    configState.update(
      (draft) => {
        const w = draft.widgets.find((widget) => widget.id === widgetId);
        if (w && w.type === 'greeting') w[field] = value;
      },
      { field: `widget-${widgetId}-${String(field)}` },
    );
  }

  function updatePhraseField<K extends keyof PhraseWidget>(
    widgetId: string,
    field: K,
    value: PhraseWidget[K],
  ): void {
    configState.update(
      (draft) => {
        const w = draft.widgets.find((widget) => widget.id === widgetId);
        if (w && w.type === 'phrase') w[field] = value;
      },
      { field: `widget-${widgetId}-${String(field)}` },
    );
  }

  /** Textarea holds one phrase per line; blank lines are dropped on save. */
  function phrasesToText(phrases: string[]): string {
    return phrases.join('\n');
  }

  function textToPhrases(value: string): string[] {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');
  }
</script>

<div class="section">
  <h2>{strings.settings.nav.widgets}</h2>

  <div class="add-widget">
    {#each WIDGET_TYPES as type (type)}
      <button type="button" onclick={() => addWidget(type)}>
        {t.addWidgetLabel(t.typeLabels[type])}
      </button>
    {/each}
  </div>

  <fieldset class="slot">
    <legend>{t.footerPositionLabel}</legend>
    <div class="footer-position-options">
      {#each FOOTER_POSITIONS as position (position)}
        <label class="radio-field">
          <input
            type="radio"
            name="footer-position"
            value={position}
            checked={footerPosition === position}
            onchange={() => setFooterPosition(position)}
          />
          {FOOTER_POSITION_LABELS[position]}
        </label>
      {/each}
    </div>
  </fieldset>

  {#each SLOTS as slot (slot)}
    {@const slotWidgets = widgetsInSlot(slot)}
    <section class="slot">
      <h3>{t.slotLabels[slot]}</h3>
      {#if slotWidgets.length === 0}
        <p class="empty">{t.emptySlot}</p>
      {:else}
        <ul class="widget-list" use:attachSlotReorder={slot}>
          {#each slotWidgets as widget (widget.id)}
            <li class="widget-row" data-reorder-id={widget.id}>
              <div class="widget-header">
                <button
                  type="button"
                  class="drag-handle"
                  aria-label={t.dragHandle}
                  onkeydown={(event) => handleKeydown(widget.id, slot, event)}
                ></button>
                <label class="slot-select-field">
                  <span class="visually-hidden">{t.slotSelectLabel(widgetName(widget))}</span>
                  <select
                    value={slot}
                    onchange={(event) =>
                      setWidgetSlot(widget.id, slot, event.currentTarget.value as WidgetSlot)}
                  >
                    {#each SLOTS as targetSlot (targetSlot)}
                      <option value={targetSlot}>{t.slotLabels[targetSlot]}</option>
                    {/each}
                  </select>
                </label>
                <label class="enable-toggle">
                  <input
                    type="checkbox"
                    checked={widget.enabled}
                    aria-label={t.enableWidget(widgetName(widget))}
                    onchange={() => toggleEnabled(widget.id)}
                  />
                  {widgetName(widget)}
                </label>
                <button
                  type="button"
                  class="delete-button"
                  onclick={() => deleteWidget(widget.id)}
                  aria-label={t.deleteWidget(widgetName(widget))}
                >
                  {t.delete}
                </button>
              </div>

              <div class="widget-fields">
                {#if widget.type === 'clock' || widget.type === 'date'}
                  <label class="field">
                    {t.timezoneLabel}
                    {#if SUPPORTS_TIMEZONE_LIST}
                      <select
                        value={widget.timezone}
                        onchange={(event) => updateTimezone(widget.id, event.currentTarget.value)}
                      >
                        {#each TIMEZONES as tz (tz)}
                          <option value={tz}>{tz}</option>
                        {/each}
                      </select>
                    {:else}
                      <input
                        type="text"
                        value={widget.timezone}
                        onchange={(event) => updateTimezone(widget.id, event.currentTarget.value)}
                      />
                      {#if !isTimezoneValid(widget.timezone)}
                        <span class="field-error">{t.timezoneInvalid(widget.timezone)}</span>
                      {/if}
                    {/if}
                  </label>

                  <label class="field">
                    {t.localeLabel}
                    <input
                      type="text"
                      value={widget.locale}
                      onchange={(event) => updateLocale(widget.id, event.currentTarget.value)}
                    />
                    {#if !isLocaleValid(widget.locale)}
                      <span class="field-error">{t.localeInvalid(widget.locale)}</span>
                    {/if}
                  </label>
                {/if}

                {#if widget.type === 'clock'}
                  <label class="checkbox-field">
                    <input
                      type="checkbox"
                      checked={widget.hour12}
                      onchange={(event) => {
                        const checked = event.currentTarget.checked;
                        updateClockDateField(widget.id, 'hour12', (w) => {
                          if (w.type === 'clock') w.hour12 = checked;
                        });
                      }}
                    />
                    {t.hour12Label}
                  </label>
                  <label class="checkbox-field">
                    <input
                      type="checkbox"
                      checked={widget.showSeconds}
                      onchange={(event) => {
                        const checked = event.currentTarget.checked;
                        updateClockDateField(widget.id, 'showSeconds', (w) => {
                          if (w.type === 'clock') w.showSeconds = checked;
                        });
                      }}
                    />
                    {t.showSecondsLabel}
                  </label>
                {/if}

                {#if widget.type === 'date'}
                  <label class="field">
                    {t.dateStyleLabel}
                    <select
                      value={widget.style}
                      onchange={(event) => {
                        const style = event.currentTarget.value as DateWidget['style'];
                        updateClockDateField(widget.id, 'style', (w) => {
                          if (w.type === 'date') w.style = style;
                        });
                      }}
                    >
                      {#each DATE_STYLES as style (style)}
                        <option value={style}>{style}</option>
                      {/each}
                    </select>
                  </label>
                  <label class="checkbox-field">
                    <input
                      type="checkbox"
                      checked={widget.capitalise}
                      onchange={(event) => {
                        const checked = event.currentTarget.checked;
                        updateClockDateField(widget.id, 'capitalise', (w) => {
                          if (w.type === 'date') w.capitalise = checked;
                        });
                      }}
                    />
                    {t.capitaliseLabel}
                  </label>
                  <label class="checkbox-field">
                    <input
                      type="checkbox"
                      checked={widget.showWeekNumber}
                      onchange={(event) => {
                        const checked = event.currentTarget.checked;
                        updateClockDateField(widget.id, 'showWeekNumber', (w) => {
                          if (w.type === 'date') w.showWeekNumber = checked;
                        });
                      }}
                    />
                    {t.showWeekNumberLabel}
                  </label>
                {/if}

                {#if widget.type === 'weather'}
                  <label class="field">
                    {t.labelFieldLabel}
                    <input
                      type="text"
                      value={widget.label}
                      onchange={(event) =>
                        updateWeatherField(widget.id, 'label', event.currentTarget.value)}
                    />
                  </label>
                  <label class="field">
                    {t.unitsLabel}
                    <select
                      value={widget.units}
                      onchange={(event) =>
                        updateWeatherField(
                          widget.id,
                          'units',
                          event.currentTarget.value as WeatherWidget['units'],
                        )}
                    >
                      <option value="metric">{t.unitsMetric}</option>
                      <option value="imperial">{t.unitsImperial}</option>
                    </select>
                  </label>
                  <label class="field">
                    {t.refreshMinutesLabel}
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={widget.refreshMinutes}
                      onchange={(event) =>
                        updateWeatherField(
                          widget.id,
                          'refreshMinutes',
                          Number(event.currentTarget.value),
                        )}
                    />
                  </label>
                  <div class="field">
                    <span class="field-label-static">{t.locationHeading}</span>
                    <CitySearch widget={widget} />
                  </div>
                {/if}

                {#if widget.type === 'greeting'}
                  <label class="field">
                    {t.nameFieldLabel}
                    <input
                      type="text"
                      value={widget.name}
                      onchange={(event) =>
                        updateGreetingField(widget.id, 'name', event.currentTarget.value)}
                    />
                  </label>
                {/if}

                {#if widget.type === 'phrase'}
                  <label class="field">
                    {t.labelFieldLabel}
                    <input
                      type="text"
                      value={widget.label ?? ''}
                      onchange={(event) =>
                        updatePhraseField(
                          widget.id,
                          'label',
                          event.currentTarget.value.trim() === ''
                            ? undefined
                            : event.currentTarget.value,
                        )}
                    />
                  </label>
                  <label class="field phrases-field">
                    {t.phrasesLabel}
                    <textarea
                      rows="4"
                      value={phrasesToText(widget.phrases)}
                      onchange={(event) =>
                        updatePhraseField(widget.id, 'phrases', textToPhrases(event.currentTarget.value))}
                    ></textarea>
                    <span class="hint">{t.phrasesHint}</span>
                  </label>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/each}
</div>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  h2 {
    font-size: 1rem;
  }

  h3 {
    font-size: 0.95em;
  }

  .add-widget {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .add-widget button {
    background: var(--surface-hover);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-3);
    cursor: pointer;
  }

  .slot {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  fieldset.slot {
    border: none;
    padding: 0;
    margin: 0;
  }

  fieldset.slot legend {
    font-size: 0.95em;
    padding: 0;
    color: var(--text-secondary);
  }

  .footer-position-options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .radio-field {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: 0.9em;
  }

  .empty {
    color: var(--text-muted);
    font-size: 0.9em;
  }

  .widget-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .widget-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius, 12px);
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
  }

  .widget-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .drag-handle {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--radius, 12px);
    background: var(--surface-hover);
    cursor: grab;
  }

  .slot-select-field select {
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
    font-size: 0.85em;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .enable-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 600;
  }

  .delete-button {
    flex-shrink: 0;
    color: var(--status-danger);
    background: transparent;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
  }

  .widget-fields {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 0.85em;
    color: var(--text-secondary);
    min-width: 10rem;
  }

  .field-label-static {
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  .checkbox-field {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  input[type='text'],
  input[type='number'],
  select,
  textarea {
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
    font-family: inherit;
  }

  .phrases-field {
    min-width: 16rem;
    flex: 1 1 100%;
  }

  .phrases-field textarea {
    resize: vertical;
  }

  .hint {
    font-size: 0.8em;
    color: var(--text-muted);
  }

  .field-error {
    color: var(--status-danger);
    font-size: 0.85em;
  }
</style>
