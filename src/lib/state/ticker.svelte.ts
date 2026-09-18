function msUntilNextSecond(): number {
  return 1000 - (Date.now() % 1000);
}

function msUntilNextMinute(): number {
  const now = new Date();
  return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
}

/**
 * One shared timer for the whole app, not one setInterval per widget.
 * Widgets subscribe to the granularity they need (second or minute); a
 * granularity with zero subscribers has no timer running at all. Timers are
 * aligned to the real second/minute boundary via reschedule-on-fire
 * setTimeout, not setInterval, so they never drift. Both stop while the tab
 * is hidden and recompute `now` immediately when it becomes visible again.
 */
class Ticker {
  now: number = $state(Date.now());

  #secondSubscribers = 0;
  #minuteSubscribers = 0;
  #secondTimer: ReturnType<typeof setTimeout> | null = null;
  #minuteTimer: ReturnType<typeof setTimeout> | null = null;
  #visible = true;

  constructor() {
    if (typeof document !== 'undefined') {
      this.#visible = !document.hidden;
      document.addEventListener('visibilitychange', () => this.#handleVisibilityChange());
    }
  }

  /** Returns an unsubscribe function. */
  subscribeSecond(): () => void {
    this.#secondSubscribers += 1;
    this.#ensureSecondTimer();
    return () => {
      this.#secondSubscribers = Math.max(0, this.#secondSubscribers - 1);
      if (this.#secondSubscribers === 0) this.#clearSecondTimer();
    };
  }

  /** Returns an unsubscribe function. */
  subscribeMinute(): () => void {
    this.#minuteSubscribers += 1;
    this.#ensureMinuteTimer();
    return () => {
      this.#minuteSubscribers = Math.max(0, this.#minuteSubscribers - 1);
      if (this.#minuteSubscribers === 0) this.#clearMinuteTimer();
    };
  }

  #ensureSecondTimer(): void {
    if (this.#secondTimer !== null || !this.#visible || this.#secondSubscribers === 0) return;
    this.#secondTimer = setTimeout(() => {
      this.#secondTimer = null;
      this.now = Date.now();
      this.#ensureSecondTimer();
    }, msUntilNextSecond());
  }

  #ensureMinuteTimer(): void {
    if (this.#minuteTimer !== null || !this.#visible || this.#minuteSubscribers === 0) return;
    this.#minuteTimer = setTimeout(() => {
      this.#minuteTimer = null;
      this.now = Date.now();
      this.#ensureMinuteTimer();
    }, msUntilNextMinute());
  }

  #clearSecondTimer(): void {
    if (this.#secondTimer !== null) {
      clearTimeout(this.#secondTimer);
      this.#secondTimer = null;
    }
  }

  #clearMinuteTimer(): void {
    if (this.#minuteTimer !== null) {
      clearTimeout(this.#minuteTimer);
      this.#minuteTimer = null;
    }
  }

  #handleVisibilityChange(): void {
    if (document.hidden) {
      this.#visible = false;
      this.#clearSecondTimer();
      this.#clearMinuteTimer();
    } else {
      this.#visible = true;
      this.now = Date.now();
      this.#ensureSecondTimer();
      this.#ensureMinuteTimer();
    }
  }
}

export const ticker = new Ticker();
