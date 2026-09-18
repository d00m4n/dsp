# Phase 4 implementation plan — integrated configuration panel

Source spec: `PHASE-4.md`. Cross-refs: `PRD-startpage.md` §5.6-5.7 (RF-26, RF-27,
RF-32, RF-35–RF-39, RF-40–RF-44). Each phase below is self-contained: it names exact
files, exact existing signatures to call, and a verification checklist. Execute phases
in order — later phases depend on earlier ones.

## Phase 0 — Documentation discovery (done, summarized here)

Key facts established by codebase discovery (see full report in session transcript if
needed — do not re-derive, trust this list):

- `src/types/config.ts`: `AppConfig { schemaVersion, theme, search, widgets, tabs, behaviour }`.
  `BackdropConfig` doc comment still says `source` is a path under `/wallpapers` — must be
  updated to describe `idb:{id}` refs too.
- `src/lib/config/parse.ts` exports `parseConfig(input: unknown): { config, errors }`,
  never throws. Has helper validators (`str`, `url` using `isAllowedUrl`, `timezone`,
  `uniqueId`, `clamped`, `oneOf`) and a `validateBackdrop` (lines ~175-193) that does
  **not yet** distinguish `idb:` vs `wallpapers/` prefixes.
- `src/lib/config/storage.ts`: key `'homebase:config'`, functions `readRawConfig()`,
  `writeRawConfig(raw)`, `clearStoredConfig()`, try/catch + in-memory Map fallback. **No
  debounce, no `homebase:config:backup` key exist yet** — both are net-new.
- `src/lib/state/config.svelte.ts`: `class ConfigState { config = $state(...) }`, exported
  singleton `configState`. Components currently mutate via direct assignment to
  `configState.config` — no setter API exists yet.
- `src/lib/state/ui.svelte.ts`: `ModalKind = 'search' | 'help' | null` — needs
  `'settings'` added. `uiState.openModal(kind)` / `closeModal()` / `isModalOpen` (derived).
- `src/lib/keyboard/shortcuts.ts`: `createKeyboardHandler(deps: KeyboardDeps)`. **The `,`
  key is NOT registered** (PHASE-4.md's claim that it already is registered is false —
  verify, don't trust). Guard order: `isModalOpen()` bail-out first, then IME, then
  input-field (only `Escape` passes), then Ctrl/Cmd+K, then Ctrl/Meta/Alt bail-out. No
  `Ctrl+Z`/`Ctrl+Shift+Z` handling exists.
- `src/lib/mnemonics/assign.ts`: `assignMnemonics(tab: Tab): MnemonicMap` where
  `MnemonicMap = { byLink: Map<id,Mnemonic>, byKey: Map<key,id>, conflicts:
  MnemonicConflict[], unassigned: string[] }`. Pure, cheap, operates on a whole `Tab` —
  call it with a synthesized/patched `Tab` object while editing.
- `src/lib/search/protocols.ts`: `ALLOWED_PROTOCOLS = new Set(['http:','https:','mailto:'])`,
  `isAllowedUrl(value: string): boolean`. Reuse directly for link URL validation.
- `src/lib/components/ui/Modal.svelte`: `{ label, open, onClose, children }` props, native
  `<dialog>` + `showModal()`, `max-width: min(90vw, 640px)` by default — settings panel
  needs a wider/taller override.
- `src/lib/components/search/SearchDialog.svelte`: worked example of `$derived.by`,
  combobox a11y pattern, and a debounced `aria-live` region via `setTimeout` inside an
  `$effect` cleanup (lines ~143-150) — reuse this exact pattern for the reorder
  announcer.
- `src/lib/weather/openMeteo.ts`: `fetchWeather(options: { ..., signal?: AbortSignal })`
  and a pure `buildForecastUrl`/`parseForecastResponse` pair — mirror this shape (build
  URL / parse response / fetch-with-signal, as separate pure-testable functions) for the
  city geocoding lookup. Do NOT cache geocoding results (unlike weather).
- `src/lib/components/widgets/registry.ts`: `WIDGET_COMPONENTS` is a `satisfies
  Record<Widget['type'], Component<...>>` map — iterate its keys for the "add widget by
  type" menu.
- `src/App.svelte`: modals instantiated at root keyed off `uiState.activeModal`, keyboard
  handler wired via `$effect` with `{ capture: true }`.
- `package.json`: devDependencies only, no runtime deps. No IndexedDB helper exists —
  hand-write it.
- Tests: flat `tests/unit/*.test.ts`, named after the module, `describe`/`it.each` style,
  `vitest.config.ts` uses `jsdom` environment.
- CSS: components may reference **only** semantic tokens defined once in the bare
  `:root` block of `src/styles/flavours.css` (`--surface-*`, `--text-*`, `--border-*`,
  `--accent*`, `--status-*`, `--mnemonic`, plus structural tokens in `tokens.css`).
  Raw `--p-*` palette vars must never appear in a `.svelte` file. Verify with
  `grep -r '\-\-p-' src --include='*.svelte'` (must be empty).

Anti-pattern guards for the whole phase:
- No new runtime dependency in `package.json`.
- No literal user-facing text inside a `.svelte` file — everything through `strings.ts`.
- No HTML5 Drag and Drop API (`draggable`, `dragstart`, etc.) anywhere.
- No direct `--p-*` references in new components.
- `parseConfig` must never throw; every new validation path returns a `ConfigError`.

---

## Phase 1 — Types, storage primitives, IndexedDB wallpaper store

**Files to change/create:**
- `src/types/config.ts`: update `BackdropConfig.source` doc comment to describe both
  `wallpapers/{file}` (static, deployed) and `idb:{id}` (user-picked, IndexedDB) forms.
  No structural change needed — `source` stays `string`.
- `src/lib/config/parse.ts`: extend `validateBackdrop` to accept `source` values matching
  either `^wallpapers/` or `^idb:[a-zA-Z0-9_-]+$`; anything else is a `ConfigError` on
  path `backdrop.source`. Do not validate that an `idb:` id actually exists in the store
  — that's a runtime concern, not a parse concern.
- `src/lib/config/storage.ts`: add
  - `BACKUP_KEY = 'homebase:config:backup'`, `writeConfigBackup(raw: string)`,
    `readConfigBackup(): string | null` — same try/catch + in-memory-Map fallback
    pattern as the existing functions in this file (copy the `hasLocalStorage()` guard
    style, lines 6-15).
  - A `debounce<T extends (...a: any[]) => void>(fn: T, ms: number): T` utility (new
    file `src/lib/utils/debounce.ts` — trailing-edge debounce, cancellable). This is
    generic enough to also serve the mnemonic-preview and city-search debounces later,
    so put it in `src/lib/utils/`, not inline in `storage.ts`.
  - Wrap the existing `writeRawConfig` call site (in `config.svelte.ts`, phase 2) with
    `try { ... } catch (e) { if (e instanceof DOMException && e.name ===
    'QuotaExceededError') { ... } }` — implement the catch logic in phase 2 where the
    persistence effect lives; `storage.ts` itself should just let the exception surface
    (don't swallow `QuotaExceededError` here, the caller needs to react to it).
- New file `src/lib/wallpapers/idbStore.ts`: hand-written IndexedDB wrapper, promisified,
  no library. Required API:
  ```ts
  export interface StoredWallpaper { id: string; blob: Blob; mimeType: string; sizeBytes: number; }
  export async function putWallpaper(blob: Blob): Promise<string>; // returns `id` (crypto.randomUUID())
  export async function getWallpaper(id: string): Promise<StoredWallpaper | null>;
  export async function deleteWallpaper(id: string): Promise<void>;
  export async function listWallpaperIds(): Promise<string[]>;
  ```
  DB name `homebase-wallpapers`, one object store `wallpapers` keyed by `id`. Open with
  `indexedDB.open(name, 1)`, create store in `onupgradeneeded`. Every exported function
  opens the DB, does one transaction, resolves/rejects a `Promise` — no connection kept
  open across calls (simplicity over micro-perf, matches the project's small scale).
- New file `src/lib/wallpapers/objectUrl.ts`: tiny helper
  ```ts
  export function createManagedObjectUrl(blob: Blob): { url: string; revoke: () => void };
  ```
  so every call site that needs `URL.createObjectURL` also gets a paired `revoke` it
  can call from a Svelte `$effect` cleanup — this is the fix for the memory-leak pitfall
  called out in PHASE-4.md §11.2.

**Verification:**
- `tests/unit/idbStore.test.ts`: use `fake-indexeddb` — **check `package.json` first**;
  if not present, do NOT add it as a new dependency. Instead test `idbStore.ts` only
  through logic that doesn't require a real IndexedDB (e.g. skip DB-integration tests
  here and cover `idbStore` behavior via the Playwright e2e test in a later phase, where
  a real browser IndexedDB is available). Document this decision in a one-line comment
  in the test file if a unit test is infeasible without a new dep.
- `tests/unit/parseConfig.test.ts`: add cases for `backdrop.source` = `'idb:abc123'`
  (valid), `'wallpapers/x.jpg'` (valid), `'not-a-thing'` (invalid → `ConfigError`).
- `tests/unit/debounce.test.ts`: fake timers, verify trailing-edge behavior and that
  rapid calls collapse to one invocation.
- `npm run check` and `npm run lint` clean.
- No new runtime dependency added.

---

## Phase 2 — Live-edit config API + undo/redo stack

**Files to change:**
- `src/lib/state/config.svelte.ts`: replace direct-assignment mutation with an explicit
  mutation entry point while keeping `configState.config` as the reactive read surface
  (don't break existing readers in `App.svelte`/widgets). Add:
  ```ts
  class ConfigState {
    config: AppConfig = $state(...);
    private undoStack: AppConfig[] = $state([]);
    private redoStack: AppConfig[] = $state([]);
    private lastMutationKey: string | null = null;
    private lastMutationAt = 0;

    update(mutator: (draft: AppConfig) => void, opts?: { field?: string; destructive?: boolean }): void;
    undo(): void;
    redo(): void;
    get canUndo(): boolean;
    get canRedo(): boolean;
  }
  ```
  `update()` semantics (implements PHASE-4.md §4):
  - Deep-clone current `config` via `structuredClone` (no new dep needed, it's a global)
    into the undo stack **before** mutating, UNLESS `opts.field` matches
    `lastMutationKey` and `Date.now() - lastMutationAt < 500` and `!opts.destructive` —
    in that case, coalesce (don't push a new undo entry, just overwrite the current top
    entry's "since" pointer — simplest correct implementation: only push when the field
    changed or 500ms elapsed or the mutation is destructive).
  - Cap `undoStack` at 20 entries (drop oldest).
  - Any `update()` call clears `redoStack`.
  - After mutating, call the debounced persist (see below) — persistence is separate
    from undo/redo, they are two different stacks/timers as specified in §4.
  - `opts.destructive` (tab/group/link delete) always pushes its own entry, never
    coalesces.
  - Persist-to-localStorage stays debounced 300 ms via the `debounce()` util from phase
    1, wrapping a call to `writeRawConfig(JSON.stringify(this.config))` inside a
    try/catch that specifically checks `e.name === 'QuotaExceededError'` and, on catch,
    sets a new `$state` flag `persistFailed: boolean = $state(false)` (message surfaced
    in phase 8's Data section / a lightweight toast — do not implement the toast UI
    here, just the state flag and a `lastPersistError` string).
  - Undo/redo stacks are **not** persisted anywhere (in-memory only, per spec).
- All existing call sites that currently do `configState.config.xyz = ...` (grep for
  them) must be migrated to `configState.update(draft => { draft.xyz = ... })`. Find
  every such call site first with `grep -rn "configState.config\." src` before editing.

**Verification:**
- `tests/unit/configState.test.ts` (new): coalescing within 500ms for same field,
  separate entries for different fields, destructive always separate, 20-entry cap,
  redo cleared on new update, undo/redo round-trip restores exact deep-equal state.
- `npm test`, `npm run check` clean.
- Grep confirms no remaining direct `configState.config.foo =` mutations outside the
  `ConfigState` class itself.

---

## Phase 3 — Reordering primitive (pointer + keyboard, aria-live)

**New file:** `src/lib/components/settings/Reorderable.svelte` (or a plain function
module `src/lib/reorder/pointerReorder.ts` + a thin Svelte wrapper — prefer the module
split so the pointer logic is unit-testable without mounting Svelte).

**Design:**
- `src/lib/reorder/pointerReorder.ts`: exports a pure function
  ```ts
  export function reorderByPointer(list: string[], draggedId: string, targetIndex: number): string[];
  ```
  plus an `attachPointerReorder(node: HTMLElement, opts): { destroy(): void }` action-style
  helper using `pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`, computing
  target index from midpoints of sibling elements. Sets `touch-action: none` and
  `pointer-events` tweaks only for the duration of the drag (add/remove classes on
  `pointerdown`/`pointerup`, never permanently).
- Keyboard equivalent lives directly in the consuming components (link/group/tab lists
  use vertical Alt+Arrow reorder-within-list; the widget slot editor in phase 6 uses
  Alt+Up/Down for within-slot order and Alt+Left/Right for changing slot) — implement as
  a shared handler `src/lib/reorder/keyboardReorder.ts`:
  ```ts
  export function moveByKeyboard(event: KeyboardEvent): 'up' | 'down' | 'left' | 'right' | null;
  ```
  pure key-to-intent mapper (checks `event.altKey` and arrow keys), so each consumer
  just calls this and applies the intent to its own data via `configState.update`.
- `src/lib/state/announcer.svelte.ts` (new): tiny singleton exposing
  `announce(message: string): void` backed by a `$state` string plus the debounced-clear
  `setTimeout` pattern copied from `SearchDialog.svelte`'s live-region effect. One
  `<div aria-live="polite" class="sr-only">` rendered once in `App.svelte`, reused by
  every reorderable list (tabs, groups, links, widgets) — don't create one live region
  per list.
- Respect `prefers-reduced-motion`: reuse whatever media-query check `Modal.svelte`
  already uses (grep it) for suppressing reorder transition animations; no new
  detection utility if one already exists.

**Verification:**
- `tests/unit/pointerReorder.test.ts`: `reorderByPointer` pure-function cases (move up,
  move down, move to same index is no-op, move to start/end).
- `tests/unit/keyboardReorder.test.ts`: every `Alt`+arrow combination maps correctly;
  non-Alt arrows return `null` (so keyboard reorder never fires without Alt, which would
  otherwise conflict with normal text-field caret movement in the editor).
- `npm test`, `npm run check`, `npm run lint` clean.
- No HTML5 drag-and-drop attributes/events anywhere (`grep -rn "draggable\|dragstart\|dragover\|ondrop" src` empty).

---

## Phase 4 — SettingsPanel shell, navigation, wiring

**Files:**
- `src/lib/state/ui.svelte.ts`: extend `ModalKind` to `'search' | 'help' | 'settings' |
  null`.
- `src/lib/keyboard/shortcuts.ts`: add `,` to open settings (new `KeyboardDeps.openSettings:
  () => void` field, dispatched alongside the existing `openSearch`/`openHelp`, subject
  to the same guard ordering already in place — read the guard chain again before
  inserting to make sure `,` isn't accidentally caught by an earlier branch e.g. the
  input-field check). Add it to `SHORTCUTS` metadata array too so `ShortcutsHelp` picks
  it up automatically (it's the single source of truth per PHASE-2 already built).
- `src/lib/strings.ts`: add a `settings` top-level key with nav-section labels
  (`appearance`, `search`, `tabsAndLinks`, `widgets`, `data`), generic strings (`close`,
  `undo`, `redo`, `confirm`, `cancel`, etc.) — actual per-section strings get added in
  their own phases, but stub the section-nav labels now since Phase 4 needs them.
- New `src/lib/components/settings/SettingsPanel.svelte`: wraps `Modal.svelte` (props:
  `open`, `onClose`) with its own wider layout — check whether `Modal` accepts a
  size/class override prop; if not, add an optional `class?: string` prop to
  `Modal.svelte` (minimal change, keep default behavior identical) so `SettingsPanel`
  can apply a `settings-modal` class that overrides `max-width`/`max-height`. Layout:
  side nav (five sections) + content area; side nav moves above content in a horizontal
  scroller below 720px (CSS container query or plain media query — match whatever
  breakpoint technique `TabBar.svelte` already uses, check it first for consistency).
  Content area for phase 4 renders placeholder section components (empty divs with a
  heading) — the five section components (`AppearanceSection.svelte`,
  `SearchSection.svelte`, `TabsLinksSection.svelte`, `WidgetsSection.svelte`,
  `DataSection.svelte`) are created here as skeletons and filled in phases 5-9.
- `src/App.svelte`: instantiate `<SettingsPanel open={uiState.activeModal === 'settings'}
  onClose={() => uiState.closeModal()} />` next to the existing two modals; thread
  `openSettings: () => uiState.openModal('settings')` into the `KeyboardDeps` object
  built in the existing `$effect`.
- Wire `Ctrl+Z` / `Ctrl+Shift+Z` **inside `SettingsPanel.svelte`** (local `keydown`
  listener on the panel's root element, only active while `open`), calling
  `configState.undo()` / `configState.redo()` — per the discovery notes, the *global*
  handler explicitly bails out on `event.ctrlKey`, so this must not go through
  `shortcuts.ts`; keep it local to the modal, matching the note in PHASE-4.md §4 that
  these keys work "only amb el panell obert" (only with the panel open).

**Verification:**
- Manual: `,` opens the panel, `Esc` closes it, opening the panel while
  `SearchDialog`/`ShortcutsHelp` is open is impossible and vice versa (mutual exclusion
  already implied by `ModalKind` being a single value).
- `isModalOpen` guard confirmed effective: while settings is open, mnemonic letter keys
  typed in the app background do nothing (existing guard, just verify it still covers
  the new modal kind — it should, since it checks `activeModal !== null` generically).
- `npm run check`, `npm run lint`, `npm test` clean.
- `grep -r '\-\-p-' src --include='*.svelte'` empty.

---

## Phase 5 — Tabs & Links editor section (mnemonic preview, validation)

**File:** `src/lib/components/settings/TabsLinksSection.svelte`, plus small
sub-components if the file grows unwieldy: `TabEditor.svelte`, `GroupEditor.svelte`,
`LinkEditor.svelte` under the same `settings/` directory — split only if a single file
would exceed ~300 lines, otherwise keep it together (don't over-fragment prematurely).

**Behavior to implement (PHASE-4.md §6):**
- CRUD at all three levels (tab/group/link), using `configState.update()` from phase 2;
  deletes pass `{ destructive: true }`.
- Reordering at all three levels via the phase-3 primitives (pointer + Alt+Arrow keyboard),
  announcing each move through `announcer.announce(...)` with the exact message shape
  described in PHASE-4.md §5 ("Rellotge mogut a ...", adapted here to tab/group/link
  wording, added to `strings.settings`).
- **Live mnemonic preview**: on every keystroke in a link-name field, construct a
  candidate `Tab` (clone the tab being edited, replace the in-progress link's `name`
  with the current input value) and call `assignMnemonics(candidateTab)` directly — it's
  documented as pure and cheap, PHASE-4.md explicitly says not to optimize this
  preemptively, so no memoization/debounce on this specific call.
  - Render the resolved letter underlined in the name display (reuse whatever
    underline-rendering logic `LinkCard.svelte`/`TabBar.svelte` already has for the grid
    — check `parseName`/`assignMnemonics` consumers there first, don't reinvent).
  - Explicit-claim conflict (`MnemonicMap.conflicts` non-empty for this link): apply
    `color: var(--status-danger)` and show which link kept the key, via a new
    `strings.settings.mnemonicConflict(winnerName: string)` template string.
  - Tab saturation (`MnemonicMap.unassigned.length > 0`): header-level warning with the
    count, via `strings.settings.unassignedCount(n: number)`.
  - Contextual `&` syntax help: static text block with the exact examples from
    PHASE-1.md §6.1 — copy those examples verbatim into `strings.settings`, don't
    paraphrase them.
- **Validation** (§6.2): URL field uses `isAllowedUrl` from `src/lib/search/protocols.ts`
  directly; a rejected `javascript:` URL shows an inline error via a new
  `strings.settings.urlRejected` string, entered value is not saved to config until
  fixed. Empty name allowed while typing, marked "incomplete" (a light visual state, not
  a blocking error), never persisted as `""` without a final confirmation — i.e. on
  blur/save, if name is empty, don't call `configState.update()` for that field; leave
  the previous/placeholder value and show a persistent (not transient) inline warning
  until it's fixed.
- `id` fields: never rendered as editable inputs; new links/groups/tabs get
  `crypto.randomUUID()` at creation time in the "add" handler, not later.

**Verification:**
- Manual: build 3 tabs, several groups, 20+ links from empty config (matches acceptance
  criterion #1).
- Manual: 30-link tab shows saturation warning with correct count.
- Manual: two links both claiming the same letter — loser marked in
  `--status-danger`, winner named correctly.
- Manual: `javascript:alert(1)` typed into a URL field is rejected with a visible
  message.
- Manual: delete a tab, `Ctrl+Z` restores it fully (exercises phase 2 + phase 4 wiring
  together).
- `npm run check`, `npm run lint`, `npm test` clean. No new literal strings outside
  `strings.ts` (`grep` spot-check the new files for quoted user-facing text).

---

## Phase 6 — Widgets section + city geocoding search

**File:** `src/lib/components/settings/WidgetsSection.svelte`.

**Behavior (§7):**
- Per-widget: enable/disable toggle, move-between-slots (reuse phase-3 keyboard/pointer
  reorder — horizontal arrows change slot per PHASE-4.md §5), and type-specific fields
  rendered conditionally on `widget.type`.
- "Add widget" menu: iterate `Object.keys(WIDGET_COMPONENTS)` from
  `src/lib/components/widgets/registry.ts` to list addable types; creates a new widget
  object with `crypto.randomUUID()` id and sensible per-type defaults (mirror the shape
  used in `src/lib/config/defaults.ts` for each widget type), appended via
  `configState.update()`. Confirms RF-26 (multiple instances) by not deduplicating by
  type.
- **Timezone field**: populate a `<select>` from `Intl.supportedValuesOf('timeZone')`
  wrapped in a feature-detect (`typeof Intl.supportedValuesOf === 'function'`); fallback
  to a free-text input validated by attempting `new Intl.DateTimeFormat(undefined, {
  timeZone: value })` inside a try/catch (mirror the exact pattern already in
  `src/lib/config/parse.ts`'s `timezone` validator — reuse that validator function
  directly rather than re-implementing it, if it's exported; export it if it isn't).
- **Locale field**: same try/catch validation shape using `Intl.DateTimeFormat` locale
  arg.
- **City search** (§7.1) — new module `src/lib/geocoding/openMeteoGeocode.ts` mirroring
  `src/lib/weather/openMeteo.ts`'s shape:
  ```ts
  export function buildGeocodeUrl(query: string): string; // .../v1/search?name={query}&count=5&language=ca
  export function parseGeocodeResponse(json: unknown): GeocodeResult[]; // never trusts shape, same defensive style as parseForecastResponse
  export async function fetchGeocode(query: string, signal: AbortSignal): Promise<GeocodeResult[]>;
  ```
  No caching module (unlike weather) — results are used once.
  In `WidgetsSection.svelte`'s weather-widget sub-form: an input wired to the
  `debounce()` util (400 ms) that only fires while the field has focus and the user is
  actively typing (track via the input's own `input` event, not a generic watcher), with
  a `minlength`-style guard (`query.length >= 3`) before dispatching, and an
  `AbortController` created per keystroke-triggered fetch, aborting the previous one
  first (mirror how `fetchWeather` already accepts `signal` — same call shape here).
  Selecting a result sets `latitude`/`longitude`/`label` via `configState.update()` and
  clears/disables the search input's further firing (a local `selected` boolean guard).
  On fetch failure: show the always-visible manual lat/lon fields (per spec they're
  "always visible" as a fallback — so actually render them unconditionally alongside the
  search box, not only on error, simplifying the implementation and matching "camps
  manuals ... com a alternativa sempre visible" literally).
- Zero requests: with the panel closed, this component isn't mounted at all (SettingsPanel
  content is inside the modal's `{#if open}`-gated slot — verify `Modal.svelte` actually
  unmounts children when closed, not just hides via CSS; if it hides via CSS, change
  `SettingsPanel` to conditionally render section content only when open).

**Verification:**
- `tests/unit/openMeteoGeocode.test.ts`: `buildGeocodeUrl` produces the documented URL
  shape with the query URL-encoded; `parseGeocodeResponse` handles malformed/empty JSON
  without throwing (table-driven like the existing weather tests).
- Manual: create three clock widgets from the UI (acceptance criterion).
- Manual: type 2 chars in city search → no network call (check devtools); type 3rd char →
  one call after 400ms; select a result → no further calls on subsequent typing in other
  fields; close panel → confirm no pending timers/requests (check no console errors from
  aborted-but-unhandled promises — the abort handling must swallow `AbortError`
  specifically, not let it surface as unhandled rejection).
- `npm run check`, `npm run lint`, `npm test` clean.

---

## Phase 7 — Appearance section + wallpaper management

**File:** `src/lib/components/settings/AppearanceSection.svelte`.

**Behavior (§8, uses phase-1 `idbStore.ts`/`objectUrl.ts`):**
- Deployed-wallpaper list: create `public/wallpapers/index.json` (a simple
  `string[]` of filenames) — generate it now by listing whatever's actually in
  `public/wallpapers/` (check the directory; if empty, this becomes a documented empty
  array and the picker degrades to "no bundled wallpapers yet, choose a file"). Add a
  one-line note in `PRD-startpage.md`'s §5.6 amendment (see Phase 9 below) recording
  this as the chosen approach (PHASE-4.md §8 explicitly says "Tria la primera i
  documenta-ho" — pick the index.json approach and document the choice there, not just
  in this plan).
- "Choose local file" button (`<input type="file" accept="image/*">`): on selection,
  read `file.size`; if `> 2 * 1024 * 1024`, show the non-blocking size warning
  (`strings.settings.wallpaperSizeWarning(mb: number)`) but still proceed. Call
  `putWallpaper(file)` (file is already a `Blob`) from `idbStore.ts`, get back an `id`,
  set `backdrop.source = 'idb:' + id` via `configState.update()`.
- Animated-format detection: check `file.type` / filename extension against
  `gif|apng|webp` (webp animation can't be distinguished from static webp by
  extension/MIME alone — per spec, extension+MIME check is sufficient, don't
  frame-analyze). If animated, show the `staticFallback` field with a visible warning
  (`strings.settings.staticFallbackMissing`) when empty.
- `fit`/`blur`/`opacity` controls bound directly through `configState.update()` with
  live preview (this section IS the live-preview target, no extra plumbing needed since
  `configState.config` is already reactive and consumed wherever the backdrop renders —
  find that render site, likely `App.svelte`, and confirm it already reacts to
  `backdrop` changes; it should, since it's driven by the same `$state`).
- Rendering the actual backdrop image when `source` starts with `idb:`: wherever the
  backdrop `<img>`/CSS background is rendered (find via `grep -rn "backdrop" src`), add
  an `$effect` that on `source` change: if `idb:` prefixed, `getWallpaper(id)` then
  `createManagedObjectUrl(blob)` from phase 1, storing `{url, revoke}`; the effect's
  cleanup function calls `revoke()`. This is the single place object-URL lifecycle needs
  to be correct — get this one effect right rather than duplicating the logic.
- Delete-orphaned-wallpaper: when a wallpaper's `idb:` source is changed away from or a
  wallpaper entry is removed from the picker, check `listWallpaperIds()` against every
  `idb:` reference still present in `configState.config` (currently only
  `backdrop.source`, but write this as "scan all backdrop-shaped fields" so it doesn't
  silently miss a future second reference point) and call `deleteWallpaper(id)` for any
  id with zero references.

**Verification:**
- Manual: pick a 3MB GIF, warning shown with real size, backdrop displays, reload app —
  config still loads and the wallpaper still renders (proves it went to IndexedDB, not
  localStorage — check `localStorage.getItem('homebase:config')` in devtools and confirm
  it contains `idb:...` as a short string reference, not embedded binary).
- Manual: switch wallpaper 5+ times, watch `about:memory`/devtools memory panel for
  detached `blob:` URLs — none should accumulate (acceptance criterion).
- Manual: GIF with no `staticFallback` set + OS-level reduced-motion on → confirm
  fallback behavior per RF-36 (this may already partly exist from phase 3's
  backdrop-rendering site; verify, extend if the `idb:` path bypassed it).
- `npm run check`, `npm run lint`, `npm test` clean.

---

## Phase 8 — Data section: export / import / reset / quota

**File:** `src/lib/components/settings/DataSection.svelte`.

**Export (§9.1):**
- Build filename `homebase-config-YYYY-MM-DD.json` from the current date.
- `JSON.stringify(configState.config, null, 2)` (2-space indent, per spec).
- If any `backdrop.source` (or future idb-referencing field) starts with `idb:`, show a
  visible inline notice before/along the download button explaining those wallpapers
  won't survive export/import to another browser.
- Create `Blob` → `URL.createObjectURL` → temporary `<a download>` → click → **revoke
  the object URL** right after (use `objectUrl.ts` helper from phase 1 or just inline
  `URL.revokeObjectURL` in a `finally`/immediately-after-click since this one is
  synchronous and short-lived, not tied to a component lifecycle).

**Import (§9.2, strict order):**
1. `<input type="file" accept="application/json">` → `file.text()`.
2. `JSON.parse` in a try/catch — a non-JSON file must produce a readable
   `strings.settings.importNotJson` message, not an uncaught exception (per spec, this
   is explicitly called out as a common mistake to avoid).
3. Pass parsed value to `parseConfig()` from `src/lib/config/parse.ts`.
4. **Preview before applying**: render tab count, link count (sum across all
   tabs/groups), and the full `ConfigError[]` list if non-empty — do not apply yet.
5. Explicit confirm button (only enabled/shown after step 4's preview is displayed).
6. On confirm: `writeConfigBackup(readRawConfig())` (back up what's about to be
   replaced) using phase-1's `storage.ts` additions, then apply via
   `configState.update(draft => Object.assign(draft, result.config), { destructive:
   true })` (destructive: true so it's its own undo entry too, since it's as
   consequential as a delete).

**Reset (§9.3):**
- Respect `behaviour.confirmBeforeReset`; confirmation text states **exact counts**
  ("This will remove N tabs and M links") via a new `strings.settings.resetConfirm(tabs:
  number, links: number)` — not a generic "are you sure?" (spec explicitly forbids the
  generic phrasing).
- Backup current config to `homebase:config:backup` before applying
  `DEFAULT_CONFIG` (from `src/lib/config/defaults.ts`).

**Quota handling (§9.4):**
- This was partly built in phase 2 (`persistFailed`/`lastPersistError` state on
  `ConfigState`). `DataSection.svelte` (or a small always-mounted toast, decide based on
  whether the spec implies it should be visible even when the Data section isn't open —
  re-read §9.4: "avisa que el canvi no s'ha pogut persistir" implies immediate, not only
  when the user happens to open Data section, so render this as a lightweight global
  notice, e.g. a small fixed-position banner in `App.svelte` gated on
  `configState.persistFailed`, not buried inside the settings panel) surfaces the
  specific message and suggests exporting (link/button that opens Settings → Data,
  pre-scrolled to export — a simple `uiState.openModal('settings')` call plus a shared
  "requested section" hint is enough, don't over-engineer deep-linking).
- Confirm in-memory `configState.config` is untouched on quota failure (the whole point
  of catching `QuotaExceededError` specifically rather than letting it bubble).

**Verification:**
- Manual: export then re-import the same file → resulting JSON is byte-identical after
  a `diff` of the two exported files (export twice, diff) — this is acceptance criterion
  #2 exactly.
- Manual: feed a `.txt` file with garbage content to import → readable error, no console
  exception.
- Manual: fill `localStorage` to quota (devtools or a small script), attempt a config
  edit → banner appears, on-screen state (open tabs, unsaved edits) is untouched.
- Manual: reset with `confirmBeforeReset` true → dialog shows real tab/link counts, not
  generic text.
- `npm run check`, `npm run lint`, `npm test` clean.

---

## Phase 9 — Search-engine editor section + PRD amendment + final pass

**Files:**
- `src/lib/components/settings/SearchSection.svelte`: CRUD over `config.search.engines`
  (bang, label, URL template) — same validation approach as link URLs (`isAllowedUrl`,
  plus checking the URL template contains the expected placeholder token; check
  `src/lib/search/bangs.ts`/`urlDetect.ts` for the exact placeholder syntax already used
  by the app, e.g. `%s` or `{query}`, and validate against that same token, don't invent
  a new one).
- `PRD-startpage.md`: apply the §2 amendment from PHASE-4.md verbatim — add the
  two-origin wallpaper table (`wallpapers/...` vs `idb:...`) and the object-URL
  revoke requirement to wherever `backdrop.source` is currently documented in the PRD.
  Also record the `public/wallpapers/index.json` decision from phase 7 here.
- Full acceptance-criteria sweep against `PHASE-4.md` §10 — walk every checkbox
  manually, including the two memory/perf ones (object URL accumulation, quota-fill
  test) which need devtools, not just automated tests.
- Add/verify a Playwright e2e test (`tests/e2e/`, matching however phase 2's e2e test is
  named/located) covering at minimum: open settings with `,`, add a tab+link, verify it
  appears in the grid after closing, delete it, undo, verify it's back.

**Verification:**
- `npm run lint`, `npm run check`, `npm test`, `npm run build` all clean (final gate,
  matches every prior phase's closing criterion).
- `npm run test:e2e` passes.
- `grep -r '\-\-p-' src --include='*.svelte'` empty.
- `grep -rn "draggable\|ondrop" src` empty.
- Manual full pass through PHASE-4.md §10's checklist, checked off one by one.
