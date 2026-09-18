import type { AppConfig } from '../../types/config';

export type ModalKind = 'search' | 'help' | 'settings' | 'theme' | null;

const ACTIVE_TAB_KEY = 'homebase:activeTab';

function readStoredActiveTab(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TAB_KEY);
  } catch {
    return null;
  }
}

function writeStoredActiveTab(id: string): void {
  try {
    localStorage.setItem(ACTIVE_TAB_KEY, id);
  } catch {
    // Private mode / quota exceeded: the tab just won't be remembered.
  }
}

class UiState {
  #activeTabId: string = $state('');
  activeModal: ModalKind = $state(null);
  isModalOpen = $derived(this.activeModal !== null);

  get activeTabId(): string {
    return this.#activeTabId;
  }

  set activeTabId(id: string) {
    this.#activeTabId = id;
    if (id) writeStoredActiveTab(id);
  }

  /** Resolves the initial active tab id: last remembered tab, else per `behaviour.startTab`. */
  initFromConfig(config: AppConfig): void {
    if (this.#activeTabId && config.tabs.some((t) => t.id === this.#activeTabId)) return;

    const stored = readStoredActiveTab();
    if (stored && config.tabs.some((t) => t.id === stored)) {
      this.activeTabId = stored;
      return;
    }

    const { startTab } = config.behaviour;
    if (startTab !== 'first' && startTab !== 'last' && config.tabs.some((t) => t.id === startTab)) {
      this.activeTabId = startTab;
      return;
    }
    const tab = startTab === 'last' ? config.tabs.at(-1) : config.tabs[0];
    this.activeTabId = tab?.id ?? '';
  }

  openModal(kind: Exclude<ModalKind, null>): void {
    this.activeModal = kind;
  }

  closeModal(): void {
    this.activeModal = null;
  }
}

export const uiState = new UiState();
