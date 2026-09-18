/**
 * Pure key-to-intent mapper for keyboard-driven reordering. Only fires when
 * Alt is held together with an arrow key, so plain arrow keys are always
 * left free for normal text-field caret movement.
 */
export function moveByKeyboard(event: KeyboardEvent): 'up' | 'down' | 'left' | 'right' | null {
  if (!event.altKey) return null;

  switch (event.key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}
