/**
 * Pure list-reordering helper plus a pointer-driven drag action. No HTML5
 * Drag and Drop API is used anywhere here — reordering is implemented with
 * `pointerdown`/`pointermove`/`pointerup` and `setPointerCapture`, which
 * works uniformly across mouse, touch, and pen without the DnD API's
 * well-known accessibility and styling pitfalls.
 */

/**
 * Returns a new array with `draggedId` moved to `targetIndex`. `targetIndex`
 * is clamped to the valid range `[0, list.length - 1]`. Moving an item to
 * its current index is a no-op (the returned array has the same order).
 */
export function reorderByPointer(list: string[], draggedId: string, targetIndex: number): string[] {
  const currentIndex = list.indexOf(draggedId);
  if (currentIndex === -1) return list.slice();

  const clampedTarget = Math.max(0, Math.min(targetIndex, list.length - 1));
  if (clampedTarget === currentIndex) return list.slice();

  const next = list.slice();
  next.splice(currentIndex, 1);
  next.splice(clampedTarget, 0, draggedId);
  return next;
}

export interface ItemRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Returns the index the dragged item should take among its siblings (the
 * dragged item itself must not be in `siblings`): the number of siblings
 * whose midpoint the pointer has passed. The ordering axis is a property of
 * the whole list, not of each item: siblings laid out on a single row are
 * horizontal, anything else is vertical. Deciding per item by aspect ratio
 * made wide rows read as horizontal, so a pointer on a left-hand handle
 * always resolved to index 0.
 */
export function insertionIndex(siblings: ItemRect[], clientX: number, clientY: number): number {
  const first = siblings[0];
  if (!first) return 0;
  const horizontal =
    siblings.length > 1 && siblings.every((r) => Math.abs(r.top - first.top) < 4);
  return siblings.filter((r) =>
    horizontal ? clientX > (r.left + r.right) / 2 : clientY > (r.top + r.bottom) / 2,
  ).length;
}

export interface PointerReorderOptions {
  /** Ids of the items in their current order, parallel to the DOM children. */
  items: () => string[];
  /**
   * Optional selector for the drag "handle" within each item element.
   * When omitted, the whole item element is the handle.
   */
  handleSelector?: string;
  /** CSS class toggled on `node` for the duration of a drag. */
  draggingClass?: string;
  /** Called with the reordered id list once a drag ends with a real move. */
  onReorder: (nextOrder: string[]) => void;
  /** Called with the moved item's id when a drag ends with a real move. */
  onAnnounce?: (draggedId: string, fromIndex: number, toIndex: number) => void;
}

/**
 * Action-style helper: attaches pointer-based drag reordering to `node`'s
 * direct children (each child's `data-reorder-id` attribute identifies it).
 * Usage mirrors a Svelte action: `attachPointerReorder(node, opts)` returns
 * `{ destroy() }` to remove all listeners.
 */
export function attachPointerReorder(
  node: HTMLElement,
  opts: PointerReorderOptions,
): { destroy(): void } {
  const draggingClass = opts.draggingClass ?? 'is-dragging';

  let draggedId: string | null = null;
  let draggedEl: HTMLElement | null = null;
  let startIndex = -1;
  let activePointerId: number | null = null;

  function childElements(): HTMLElement[] {
    return Array.from(node.children) as HTMLElement[];
  }

  function idOf(el: Element): string | null {
    return el.getAttribute('data-reorder-id');
  }

  function findHandleTarget(event: PointerEvent): HTMLElement | null {
    const target = event.target as Element | null;
    if (!target) return null;
    const handle = opts.handleSelector ? target.closest(opts.handleSelector) : target;
    if (!handle) return null;
    const item = handle.closest('[data-reorder-id]');
    return item as HTMLElement | null;
  }

  // Records each sibling's current position so that, after `draggedEl` is
  // moved to a new spot in the DOM, the siblings that shifted can be
  // animated from their old position to their new one (a FLIP animation)
  // instead of silently snapping.
  function recordRects(): Map<HTMLElement, DOMRect> {
    const rects = new Map<HTMLElement, DOMRect>();
    for (const child of childElements()) {
      if (child !== draggedEl) rects.set(child, child.getBoundingClientRect());
    }
    return rects;
  }

  function playFlip(before: Map<HTMLElement, DOMRect>): void {
    for (const [child, prevRect] of before) {
      const nextRect = child.getBoundingClientRect();
      const dx = prevRect.left - nextRect.left;
      const dy = prevRect.top - nextRect.top;
      if (!dx && !dy) continue;
      child.style.transition = 'none';
      child.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        child.style.transition = 'transform 0.15s ease';
        child.style.transform = '';
      });
    }
  }

  function onPointerDown(event: PointerEvent): void {
    if (!event.isPrimary) return;
    const item = findHandleTarget(event);
    if (!item) return;

    const id = idOf(item);
    if (id === null) return;

    // Nested reorderable lists (e.g. links within a group, itself within a
    // list of groups) share the same handle selector and `data-reorder-id`
    // attribute. Without stopping propagation here, this pointerdown would
    // also reach an ancestor list's listener, which would then steal pointer
    // capture out from under this list mid-drag.
    event.stopPropagation();

    draggedId = id;
    draggedEl = item;
    startIndex = opts.items().indexOf(id);
    activePointerId = event.pointerId;

    node.classList.add(draggingClass);
    draggedEl.style.touchAction = 'none';
    draggedEl.style.pointerEvents = 'none';
    draggedEl.style.position = 'relative';
    draggedEl.style.zIndex = '2';
    draggedEl.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.25)';
    draggedEl.style.transform = 'scale(1.02)';
    draggedEl.style.transition = 'box-shadow 0.15s ease, transform 0.15s ease';
    document.body.style.cursor = 'grabbing';
    node.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    if (draggedId === null || activePointerId !== event.pointerId || !draggedEl) return;
    event.preventDefault();

    const children = childElements();
    const siblings = children.filter((child) => child !== draggedEl);
    const targetIndex = insertionIndex(
      siblings.map((child) => child.getBoundingClientRect()),
      event.clientX,
      event.clientY,
    );
    if (targetIndex === children.indexOf(draggedEl)) return;

    const before = recordRects();
    node.insertBefore(draggedEl, siblings[targetIndex] ?? null);
    playFlip(before);
  }

  function endDrag(event: PointerEvent): void {
    if (draggedId === null || activePointerId !== event.pointerId) return;

    const originalOrder = opts.items();
    const fromIndex = startIndex;
    const id = draggedId;
    // The DOM already reflects the live-reordered position from
    // `onPointerMove`, so the final order is read straight off it.
    const finalOrder = childElements()
      .map((el) => idOf(el))
      .filter((v): v is string => v !== null);

    if (node.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }
    node.classList.remove(draggingClass);
    document.body.style.cursor = '';
    if (draggedEl) {
      draggedEl.style.touchAction = '';
      draggedEl.style.pointerEvents = '';
      draggedEl.style.position = '';
      draggedEl.style.zIndex = '';
      draggedEl.style.boxShadow = '';
      draggedEl.style.transform = '';
      draggedEl.style.transition = '';
    }

    draggedId = null;
    draggedEl = null;
    activePointerId = null;
    startIndex = -1;

    const moved = finalOrder.some((entry, i) => entry !== originalOrder[i]);
    if (moved) {
      opts.onReorder(finalOrder);
      opts.onAnnounce?.(id, fromIndex, finalOrder.indexOf(id));
    }
  }

  function onPointerUp(event: PointerEvent): void {
    endDrag(event);
  }

  function onPointerCancel(event: PointerEvent): void {
    endDrag(event);
  }

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointermove', onPointerMove);
  node.addEventListener('pointerup', onPointerUp);
  node.addEventListener('pointercancel', onPointerCancel);

  return {
    destroy(): void {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerCancel);
      node.classList.remove(draggingClass);
      if (draggedId !== null) document.body.style.cursor = '';
    },
  };
}
