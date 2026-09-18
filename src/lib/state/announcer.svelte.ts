/**
 * Singleton `aria-live="polite"` announcer, meant to back a single
 * `<div aria-live="polite">` mounted once in `App.svelte` and reused by
 * every reorderable list (tabs, groups, links, widgets).
 *
 * The debounced-clear `setTimeout` here mirrors the pattern used by
 * `SearchDialog.svelte`'s live-region effect: the message is applied after
 * a short delay rather than synchronously, and a pending update is
 * cancelled if another announcement supersedes it before it lands.
 */
const ANNOUNCE_DELAY_MS = 200;

class AnnouncerState {
  message = $state('');

  private timer: ReturnType<typeof setTimeout> | undefined;

  announce(message: string): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.message = message;
    }, ANNOUNCE_DELAY_MS);
  }
}

const announcerState = new AnnouncerState();

/** Queues `message` for the shared `aria-live` region, debounced. */
export function announce(message: string): void {
  announcerState.announce(message);
}

/** Reactive getter for the current live-region text; read it in a template. */
export function announcedMessage(): string {
  return announcerState.message;
}
