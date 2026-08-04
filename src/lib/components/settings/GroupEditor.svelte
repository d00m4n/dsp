<script lang="ts">
  import type { LinkGroup, Tab } from '../../../types/config';
  import { strings } from '../../strings';
  import { configState } from '../../state/config.svelte';
  import { announce } from '../../state/announcer.svelte';
  import { attachPointerReorder, reorderByPointer } from '../../reorder/pointerReorder';
  import { moveByKeyboard } from '../../reorder/keyboardReorder';
  import { targetIndexForKeyboardMove } from './reorder';
  import { parseName } from '../../mnemonics/parseName';
  import { generateId } from '../../utils/id';
  import LinkEditor from './LinkEditor.svelte';
  import IconGlyph from '../ui/IconGlyph.svelte';

  const t = strings.settings.tabsLinks;

  interface Props {
    tab: Tab;
    group: LinkGroup;
    onHandleKeydown: (event: KeyboardEvent) => void;
  }

  const { tab, group, onHandleKeydown }: Props = $props();

  let expanded = $state(false);

  function toggleExpanded(): void {
    expanded = !expanded;
  }

  function findGroup(draft: Tab[]): LinkGroup | undefined {
    return draft.find((tb) => tb.id === tab.id)?.groups.find((gr) => gr.id === group.id);
  }

  function renameGroup(event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    configState.update(
      (draft) => {
        const g = findGroup(draft.tabs);
        if (g) g.name = value;
      },
      { field: `group-name-${group.id}` },
    );
  }

  function updateGroupIcon(event: Event & { currentTarget: HTMLInputElement }): void {
    const value = event.currentTarget.value;
    configState.update(
      (draft) => {
        const g = findGroup(draft.tabs);
        if (g) g.icon = value || undefined;
      },
      { field: `group-icon-${group.id}` },
    );
  }

  function deleteGroup(): void {
    configState.update(
      (draft) => {
        const tb = draft.tabs.find((t2) => t2.id === tab.id);
        if (tb) tb.groups = tb.groups.filter((gr) => gr.id !== group.id);
      },
      { destructive: true },
    );
  }

  function addLink(): void {
    const id = generateId();
    configState.update((draft) => {
      const g = findGroup(draft.tabs);
      g?.links.push({ id, name: '', url: '' });
    });
  }

  function applyLinkOrder(nextIds: string[]): void {
    configState.update(
      (draft) => {
        const g = findGroup(draft.tabs);
        if (!g) return;
        g.links = nextIds.map((id) => g.links.find((li) => li.id === id)!);
      },
      { field: `links-order-${group.id}` },
    );
  }

  function linkDisplayName(linkId: string): string {
    const link = group.links.find((li) => li.id === linkId);
    return (link ? parseName(link.name).display : '') || t.untitledLink;
  }

  function handleLinkKeydown(linkId: string, event: KeyboardEvent): void {
    const direction = moveByKeyboard(event);
    if (direction !== 'up' && direction !== 'down') return;
    event.preventDefault();
    const ids = group.links.map((li) => li.id);
    const targetIndex = targetIndexForKeyboardMove(ids, linkId, direction);
    const next = reorderByPointer(ids, linkId, targetIndex);
    if (next.join('|') === ids.join('|')) return;
    applyLinkOrder(next);
    const groupName = parseName(group.name).display || t.untitledGroup;
    announce(t.moved(linkDisplayName(linkId), next.indexOf(linkId) + 1, groupName));
  }

  function handlePointerReorder(nextIds: string[]): void {
    applyLinkOrder(nextIds);
  }

  function handlePointerAnnounce(draggedId: string, _fromIndex: number, toIndex: number): void {
    const groupName = parseName(group.name).display || t.untitledGroup;
    announce(t.moved(linkDisplayName(draggedId), toIndex + 1, groupName));
  }

  function attachLinksReorder(node: HTMLElement) {
    return attachPointerReorder(node, {
      items: () => group.links.map((li) => li.id),
      handleSelector: '.drag-handle',
      onReorder: handlePointerReorder,
      onAnnounce: handlePointerAnnounce,
    });
  }
</script>

<li class="group-row" data-reorder-id={group.id}>
  <div class="group-header">
    <button type="button" class="drag-handle" aria-label={t.dragHandle} onkeydown={onHandleKeydown}
    ></button>
    <button
      type="button"
      class="expand-toggle"
      class:expanded
      onclick={toggleExpanded}
      aria-expanded={expanded}
      aria-label={expanded
        ? t.collapseGroup(parseName(group.name).display || t.untitledGroup)
        : t.expandGroup(parseName(group.name).display || t.untitledGroup)}
    ></button>
    <label class="visually-hidden" for={`group-name-${group.id}`}>{t.groupNameLabel}</label>
    <input
      id={`group-name-${group.id}`}
      type="text"
      class="group-name-input"
      value={group.name}
      oninput={renameGroup}
    />
    <label class="icon-field">
      <span class="visually-hidden">{t.groupIconLabel}</span>
      <IconGlyph name={group.icon} size={16} />
      <input
        type="text"
        placeholder={t.groupIconLabel}
        value={group.icon ?? ''}
        oninput={updateGroupIcon}
      />
    </label>
    <button
      type="button"
      class="delete-button"
      onclick={deleteGroup}
      aria-label={t.deleteGroup(parseName(group.name).display || t.untitledGroup)}
    >
      {t.delete}
    </button>
  </div>

  {#if expanded}
    <div class="links-block">
      <h4>{t.linksHeading}</h4>
      {#if group.links.length === 0}
        <p class="empty">{t.noLinks}</p>
      {:else}
        <ul class="links-list" use:attachLinksReorder>
          {#each group.links as link (link.id)}
            <LinkEditor
              {tab}
              {group}
              {link}
              onHandleKeydown={(event) => handleLinkKeydown(link.id, event)}
            />
          {/each}
        </ul>
      {/if}
      <button type="button" class="add-button" onclick={addLink}>{t.addLink}</button>
    </div>
  {/if}
</li>

<style>
  .group-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius, 12px);
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
  }

  .group-header {
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

  .expand-toggle {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
  }

  .expand-toggle::before {
    content: '';
    width: 0.5rem;
    height: 0.5rem;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 0.15s ease;
  }

  .expand-toggle.expanded::before {
    transform: rotate(45deg);
  }

  .group-name-input {
    flex: 1;
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
    font-weight: 600;
  }

  .icon-field {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .icon-field input {
    width: 8rem;
    background: var(--surface-page);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-2);
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

  .links-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-left: var(--space-4);
  }

  h4 {
    font-size: 0.85em;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .empty {
    color: var(--text-muted);
    font-size: 0.9em;
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .add-button {
    align-self: flex-start;
    background: var(--surface-hover);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius, 12px);
    padding: var(--space-1) var(--space-3);
    cursor: pointer;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
</style>
