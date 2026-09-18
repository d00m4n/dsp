import type { AppConfig } from '../../types/config';
import { DEFAULT_CONFIG } from '../config/defaults';
import { parseConfig, type ConfigError } from '../config/parse';
import { readRawConfig, writeRawConfig } from '../config/storage';
import { debounce } from '../utils/debounce';
import { strings } from '../strings';

const UNDO_STACK_LIMIT = 20;
const COALESCE_WINDOW_MS = 500;

function loadFromStorage(): AppConfig | null {
  const raw = readRawConfig();
  if (raw === null) return null;
  try {
    const { config } = parseConfig(JSON.parse(raw));
    return config;
  } catch {
    // Corrupt JSON in storage: fall back to defaults, page still renders.
    return null;
  }
}

class ConfigState {
  // DEFAULT_CONFIG is frozen (see defaults.ts) so it can be safely reused as
  // a fallback all over parse.ts; cloned here because this becomes live,
  // mutated-in-place state — reassigning a root property (e.g. `draft.tabs
  // = ...`, as tab/widget deletion and reordering do) on the frozen object
  // itself throws a proxy invariant TypeError.
  config: AppConfig = $state(loadFromStorage() ?? structuredClone(DEFAULT_CONFIG));
  lastErrors: ConfigError[] = $state([]);

  private undoStack: AppConfig[] = $state([]);
  private redoStack: AppConfig[] = $state([]);
  private lastMutationKey: string | null = null;
  private lastMutationAt = 0;

  persistFailed = $state(false);
  lastPersistError: string | null = $state(null);

  private debouncedPersist = debounce(() => {
    this.persistNow();
  }, 300);

  constructor() {
    void this.loadRemoteConfig();
  }

  /**
   * Fetches config.json in the background. Non-blocking: the page has
   * already painted with defaults + localStorage. A 404 is the normal
   * case, not an error, so it's only console.warn'd.
   */
  private async loadRemoteConfig(): Promise<void> {
    const hasLocalOverride = readRawConfig() !== null;
    if (hasLocalOverride) return;

    try {
      const response = await fetch('config.json');
      if (!response.ok) {
        console.warn(`config.json not found (${response.status}); using defaults`);
        return;
      }
      const json: unknown = await response.json();
      const { config, errors } = parseConfig(json);
      this.config = config;
      this.lastErrors = errors;
    } catch (err) {
      console.warn('config.json could not be loaded; using defaults', err);
    }
  }

  private persistNow(): void {
    try {
      writeRawConfig(JSON.stringify(this.config));
      this.persistFailed = false;
      this.lastPersistError = null;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        this.persistFailed = true;
        this.lastPersistError = strings.settings.persistFailed;
      } else {
        throw e;
      }
    }
  }

  update(mutator: (draft: AppConfig) => void, opts?: { field?: string; destructive?: boolean }): void {
    const field = opts?.field ?? null;
    const destructive = opts?.destructive ?? false;
    const now = Date.now();

    const shouldCoalesce =
      !destructive &&
      field !== null &&
      field === this.lastMutationKey &&
      now - this.lastMutationAt < COALESCE_WINDOW_MS;

    if (!shouldCoalesce) {
      // $state.snapshot strips the reactive proxy first: structuredClone
      // cannot clone a Svelte $state proxy directly.
      const snapshot = structuredClone($state.snapshot(this.config));
      this.undoStack.push(snapshot);
      if (this.undoStack.length > UNDO_STACK_LIMIT) {
        this.undoStack.shift();
      }
    }

    this.redoStack = [];
    this.lastMutationKey = destructive ? null : field;
    this.lastMutationAt = now;

    mutator(this.config);

    this.debouncedPersist();
  }

  undo(): void {
    const previous = this.undoStack.pop();
    if (previous === undefined) return;
    const current = structuredClone($state.snapshot(this.config));
    this.redoStack.push(current);
    this.config = previous;
    this.lastMutationKey = null;
    this.lastMutationAt = 0;
    this.persistNow();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (next === undefined) return;
    const current = structuredClone($state.snapshot(this.config));
    this.undoStack.push(current);
    this.config = next;
    this.lastMutationKey = null;
    this.lastMutationAt = 0;
    this.persistNow();
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

export const configState = new ConfigState();
