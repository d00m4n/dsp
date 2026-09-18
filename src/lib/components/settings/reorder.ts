/**
 * Pure helper for the tab/group/link lists in `TabsLinksSection.svelte` and
 * its sub-components: converts an Alt+Arrow keyboard intent ('up' | 'down')
 * into the raw target index that `reorderByPointer` expects. The result may
 * be out of range (e.g. -1 when moving the first item up); that's fine,
 * `reorderByPointer` clamps it.
 */
export function targetIndexForKeyboardMove(
  ids: string[],
  id: string,
  direction: 'up' | 'down',
): number {
  const index = ids.indexOf(id);
  if (index === -1) return 0;
  return direction === 'up' ? index - 1 : index + 1;
}
