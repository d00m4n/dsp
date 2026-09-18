/**
 * Singleton state backing the "update available" banner in `App.svelte`,
 * mirroring the shape of `configState.persistFailed` (a plain reactive
 * flag read by the banner's `{#if}`) rather than inventing a new pattern.
 *
 * Registration itself happens in `main.ts` (production-only); this module
 * only tracks whether a new worker is waiting and offers the one action the
 * banner exposes: reload now.
 */
class ServiceWorkerState {
  updateAvailable = $state(false);

  private registration: ServiceWorkerRegistration | null = null;

  /** Wires up waiting/updatefound detection for an already-registered SW. */
  watch(registration: ServiceWorkerRegistration): void {
    this.registration = registration;

    if (registration.waiting) {
      this.updateAvailable = true;
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      installing.addEventListener('statechange', () => {
        // 'installed' while a controller already exists is the standard
        // signal for "a new version is ready, distinct from the very first
        // install" (which also reaches 'installed' but has no controller
        // yet, and shouldn't show an update notice).
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          this.updateAvailable = true;
        }
      });
    });
  }

  /** User clicked reload on the banner: tell the waiting worker to take over, then reload. */
  reload(): void {
    this.registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    location.reload();
  }

  dismiss(): void {
    this.updateAvailable = false;
  }
}

export const serviceWorkerState = new ServiceWorkerState();
