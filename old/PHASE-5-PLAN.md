# Phase 5 implementation plan — polish & publish gate

Source spec: `PHASE-5.md`. Cross-refs: `PRD-startpage.md` §8 (fase 5), §10.2, §10.3,
Annex A. Order matters per PHASE-5.md §2 — phases below follow that exact dependency
chain. **Scope boundary**: this plan builds every artifact (scripts, workflows, docs,
checklist) needed to publish, but does NOT push commits, make the repo public, register
GitHub secrets/Pages settings, or rewrite git history — those are one-way/external
actions the user performs themselves once the checklist is green.

## Phase 0 — Discovery summary (trust this, don't re-derive)

- `src/styles/flavours.css`: 4× `[data-flavour]` blocks, 24 raw `--p-*` Catppuccin tokens
  each (96 hex values total), verbatim Catppuccin Latte/Frappé/Macchiato/Mocha. Header
  comment (lines 1-19) explicitly says "PROVISIONAL VALUES... MUST be adapted... before
  the repository is made public" — exact text to rewrite is in the discovery report.
  Semantic tokens at `:root` (lines 151-184) already correctly reference `--p-*` — only
  the raw hex values change, never token names.
- `NOTICE`: has a "Maintenance note" (§3, lines 70-81) that **already specifies the exact
  phase-5 edit**: move Catppuccin from §1 to §2, reword as "structure/token-naming
  inspiration", keep the entry (token names like `mauve`/`rosewater` are still borrowed).
  Tabler Icons entry (§1, lines 42-49) is still a stub ("licence text to be appended") —
  Tabler icons are already wired via `@iconify-json/tabler`, so finish this stub too even
  though it's not in PHASE-5.md's explicit checklist; NOTICE accuracy is implied by the
  legal checklist as a whole.
- `package.json`: no OKLCH/color lib, no axe-core, no gzip-size tooling, `dependencies`
  key absent entirely. Current bundle: **~45.9 KB gzip JS** of a 60 KB budget (~14 KB
  headroom), ~4.7 KB gzip CSS of 20 KB (comfortable). **Any OKLCH color-math library
  must be devDependency-only** (used by the Node build script, never imported by
  browser-shipped code) — the JS budget has no room for a runtime color library.
- `playwright.config.ts`: `testDir: tests/e2e`, `baseURL: http://localhost:4173`,
  `webServer` builds+previews, single `chromium` project. Existing specs
  (`search.spec.ts`, `settings.spec.ts`) use docblock-commented, role-based-locator
  style — match this for new a11y specs.
- `vite.config.ts`: `base: './'` already correct for GitHub Pages project-subdirectory
  serving — no change needed there, just verify it in the deploy workflow.
- Repo scaffolding: `LICENSE` (MIT, `Copyright (c) 2026 Dr_D00m4n`) **already correct**,
  skip. `README.md` is a 2-line stub — needs full en/ca/es rewrite. `.github/` doesn't
  exist. `public/wallpapers/README.md` doesn't exist (currently moot, no wallpapers
  present, but still required by checklist). `docs/` doesn't exist.
- `src/lib/config/defaults.ts` vs Annex A: matches except defaults.ts has an **extra
  "Home" tab** (Gmail/Calendar/Drive/Wikipedia/News) not in Annex A. Contains no private
  IPs/hostnames/personal emails — not a data-hygiene violation, but a factual deviation
  from "the Annex A defaults" that screenshots must still be taken *from* (the checklist
  says screenshots use "the default config from Annex A" — since defaults.ts IS the
  live default config and only adds generic public-service bookmarks, this plan treats
  it as an intentional phase-1+ addition and leaves it as-is; screenshots are taken from
  whatever `defaults.ts` actually renders, matching real shipped behavior).
- `:focus-visible` already used correctly in the 2 places focus styling exists
  (`LinkCard.svelte`, `tokens.css`) — no `:focus`-only misuse found. The gap is
  **coverage**, not correctness: audit every interactive element for focus-visible
  styling, not just fix existing ones.
- No service worker registration anywhere; `src/main.ts` is currently just an 8-line
  mount — clean slate for Phase 2 of this plan.
- Git history: single author, `3269713+d00m4n@users.noreply.github.com` — a GitHub
  noreply address, already privacy-safe. No git-history remediation needed unless a
  manual `git log -p` grep (done in the final checklist phase) turns up something new.

Anti-pattern guards for the whole phase:
- No new runtime dependency in `package.json` — OKLCH/contrast-math libraries, if used
  at all, go in `devDependencies` and run only inside Node scripts (`tools/*.ts`), never
  imported by `src/`.
- No hue rotation done in HSL — must be OKLCH.
- No hand-edited hex values in `flavours.css` — only the generator script writes it.
- No GitHub Action referenced by tag (`@v4`) — pin every action by full commit SHA.
- No `skipWaiting()`-triggered silent auto-reload in the service worker.
- No absolute-path service worker registration (`/sw.js`) — must be `./sw.js`.
- Never intercept `api.open-meteo.com` in the service worker.

---

## Phase 1 — Original OKLCH palette + automated contrast verification

**New files:**
- `tools/palette.ts`: reads a versioned `PaletteSpec` (hueRotation, chromaScale,
  lightnessAdjust — per-flavour, since dawn/dusk/night/abyss need different adjustments
  to preserve their light/dark character), converts each of the 4×24 current Catppuccin
  hex values to OKLCH, applies the rotation/scale/adjust, converts back to hex, and
  rewrites the `[data-flavour]` blocks in `src/styles/flavours.css` **in place** —
  preserve every token name, selector, comment structure and the semantic `:root` block
  verbatim; only the 96 hex literals inside the four `[data-flavour]` blocks change.
  - Hand-roll the sRGB↔OKLCH conversion math (it's a well-known, compact set of matrix
    transforms — sRGB→linear→XYZ→OKLab→OKLCH and back) rather than pulling in `culori`
    as a dependency, given the tight JS budget concern from Phase 0 — this keeps the
    color math a `devDependency`-free, zero-new-package Node script. If hand-rolling
    proves too error-prone to get right confidently, a color-math library is acceptable
    but MUST be added to `devDependencies` only, never imported anywhere under `src/`.
  - Neutrals (`base`, `mantle`, `crust`, `surface*`, `overlay*`, `text`, `subtext*` —
    check exact Catppuccin token names present in the file) have low chroma already;
    per spec, still rotate them but be conservative about scaling their chroma (a full
    `chromaScale` multiply can visibly "dirty" near-gray tokens — clamp or dampen the
    scale factor for tokens below a chroma threshold, document the threshold choice in
    a code comment).
  - Generate 2-3 candidate specs (different hueRotation in the 15-30° range suggested by
    the spec), write each to a scratch/preview location or just run the script with
    different specs and visually compare in a browser — this step is explicitly called
    out as an **aesthetic decision**, not a mechanical one. Since a background agent
    can't "look and choose" the way a human does, implement the script to accept the
    spec as a CLI/config argument, pick one reasonable default (e.g. 20° hue rotation,
    chromaScale 1.0, per-flavour lightnessAdjust of 0), apply it, and clearly flag in
    the final report that the aesthetic choice should be reviewed/adjusted by the user
    before publishing — this is explicitly a human judgment call per PHASE-5.md §3.1.
- `tools/contrast.ts`: WCAG 2.1 relative-luminance + contrast-ratio implementation
  (`c/12.92` below 0.03928, `((c+0.055)/1.055)^2.4` above, ratio `(L1+0.05)/(L2+0.05)`)
  operating on hex colors — exported as pure functions so `tools/palette.ts`'s check
  step and a vitest unit test can both call them.
- `tools/checkPalette.ts` (or fold into `palette.ts` as a `--check` mode — pick whichever
  keeps the script simplest): for **each of the four flavours**, resolve the actual
  computed hex values for the pairs in PHASE-5.md §3.2's table (text-primary/surface-
  page, text-primary/surface-raised, text-secondary/surface-page, text-muted/surface-
  page, text-faint/surface-page, accent/surface-page, text-on-accent/accent, focus-
  ring/surface-page, each status-*/surface-page) by reading the semantic `:root` block's
  `var()` aliases against the freshly-generated `--p-*` values per flavour, compute
  contrast via `tools/contrast.ts`, compare against the table's minimums (4.5:1 mostly,
  3:1 for faint/accent/focus-ring), print a table for every pair×flavour always (pass or
  fail), and **exit non-zero if anything fails**.
- `package.json`: add scripts `"palette:build": "tsx tools/palette.ts"` (or `node
  --experimental-strip-types` / whatever TS-execution approach the project already uses
  for `.ts` tooling — check if `tsx`/`ts-node` exists as a devDependency first; if not,
  see if plain Node can run it via Vite's own toolchain, or add `tsx` as a new
  devDependency since there's currently no way to run standalone `.ts` files — this is
  an acceptable new devDependency, it's a build tool, not shipped code) and
  `"palette:check": "tsx tools/palette.ts --check"` (or separate script, your call).
  Wire `palette:check` into the `test` script (e.g. `"test": "vitest run && npm run
  palette:check"`) OR add a small `tests/unit/paletteContrast.test.ts` that imports
  `tools/contrast.ts`'s pure functions plus the current `flavours.css` values and
  asserts the same minimums — prefer the vitest-integrated approach since PHASE-5.md
  explicitly says "integra-ho a `npm test`" (integrate into `npm test`), so a proper
  vitest test file is the more idiomatic match for this codebase's conventions (it
  already runs `vitest run` for `npm test`) rather than a separate shell step.
- Run `npm run palette:build` (or equivalent) to actually regenerate `flavours.css`.
  Run the contrast check and fix the spec (e.g. adjust `lightnessAdjust` per flavour or
  dampen chroma clamping) until **all four flavours pass every pair** — do not leave a
  failing pair "for later", per spec's explicit warning that Catppuccin's own values
  fail some of these and must not be inherited.
- Update `flavours.css`'s header comment per RF-50c: remove "PROVISIONAL VALUES" /
  "MUST be adapted" language, replace with a factual note that these are originally-
  generated values (via `tools/palette.ts`, spec documented in the script/a comment),
  still keep the Catppuccin token-naming/structure attribution pointer to NOTICE.
- Update `NOTICE` exactly as its own §3 maintenance note instructs: move the Catppuccin
  entry from §1 to §2, reword as "palette structure and token naming were inspired by
  Catppuccin", keep the MIT copyright line since the *vocabulary* is still borrowed even
  though no original hex values remain. Also finish the Tabler Icons §1 stub with the
  actual Tabler Icons MIT license text (Tabler Icons is MIT-licensed — verify by
  checking the installed `@iconify-json/tabler` package's own LICENSE file locally
  under `node_modules/@iconify-json/tabler/` rather than fetching anything externally).

**Verification:**
- `npm test` (with palette check integrated) passes for all four flavours.
- Manually diff `flavours.css` before/after: only hex values inside `[data-flavour]`
  blocks changed, token names/selectors/semantic block untouched.
- `npm run build` bundle size check (informal at this stage, formal budget script comes
  in Phase 4) — confirm the palette script itself added zero bytes to `dist/assets/*`
  (it's a devDependency-only Node script, shouldn't be bundled at all — grep
  `dist/assets/*.js` for `tools/` or the color-math function names to confirm tree-
  shaken out / never imported by browser code in the first place).
- `npm run lint`, `npm run check` clean.

---

## Phase 2 — Service worker

**New file:** `public/sw.js` — hand-written, single file, no Workbox/PWA plugin.

Requirements (implement literally, PHASE-5.md §4.1-4.3):
- Cache name includes a build-injected version/hash: `homebase-v{hash}`. Since
  `public/sw.js` is a static file Vite copies verbatim (not processed for hashing),
  inject the version by templating it at build time — add a small pre-build or
  post-build step (a Node script, or a Vite plugin `transform`/`writeBundle` hook) that
  substitutes a placeholder (`__CACHE_VERSION__`) in `public/sw.js` with a short hash of
  the current build (e.g. derived from `Date.now()` or a content hash of `dist/assets/`)
  before/after copying it into `dist/`. Check how `vite.config.ts` is structured to
  decide the cleanest hook point; a small custom Vite plugin in `vite.config.ts` is
  probably the cleanest single place to do this in an existing-conventions-respecting
  way — read `vite.config.ts` again before choosing the mechanism.
- `install`: precache the built asset list (can be enumerated at runtime via a
  manifest the same build step writes, e.g. `dist/sw-manifest.json` listing
  `/assets/*` paths, since Vite's hashed filenames aren't known until build time) plus
  `index.html`.
- `activate`: delete every cache key that isn't the current `homebase-v{hash}` name.
- Fetch strategy:
  - `/assets/*` (hashed build assets): **cache-first** (safe because the filename
    itself changes on content change).
  - `index.html` and `config.json` specifically: **network-first, fall back to cache**
    on network failure. This is called out as the single easiest thing to get wrong in
    the whole phase (§10 pitfall #1/#2) — get this exactly right, test it explicitly.
  - `api.open-meteo.com` requests: **never intercepted** — the fetch handler must
    `return` / not call `event.respondWith(...)` at all for any request whose URL host
    matches Open-Meteo, letting it pass through to the network exactly as if no SW were
    installed. Weather's own caching module (`src/lib/weather/cache.ts`, phase 3)
    already owns that caching responsibility.
- Update UX: no `skipWaiting()` on install. Detect a waiting worker (`registration.
  waiting`, `updatefound`/`statechange` events) and surface a small dismissible in-app
  notice ("a new version is available, reload") — implement as a tiny new Svelte
  component or a simple state flag consumed by an existing lightweight banner pattern
  (reuse whatever pattern Phase 4's `configState.persistFailed` global banner in
  `App.svelte` already established, for visual/behavioral consistency) — no automatic
  reload.
- Registration: in `src/main.ts`, register **only in production** (`import.meta.env.
  PROD` — check Vite's exact env flag name/convention already used elsewhere in the
  codebase, if any) with `navigator.serviceWorker.register('./sw.js')` (relative path,
  not absolute — this is explicitly called out as pitfall #3). Wrap registration in a
  `.catch(() => {})` — a failed registration is silently a no-op, never surfaced as an
  error, since it's a progressive enhancement not a requirement.
- README (Phase 5 of this plan) documents the DevTools unregister/cache-clear procedure
  per §4.3 — write that content now or note it to fold into Phase 5 below (don't
  duplicate effort — put it in the README section, referenced here).

**Verification:**
- `npm run build && npm run preview`, load the app, confirm `sw.js` registers (DevTools
  Application tab), confirm `/assets/*` requests are cache-first, `index.html` and any
  `config.json` fetch are network-first (throttle/offline-simulate in devtools to
  confirm cache fallback), and that a network request to Open-Meteo is untouched by the
  SW (visible in Network tab as a normal request, not "(ServiceWorker)").
- Bump the build (rebuild) and confirm the old cache is deleted on `activate` and the
  update-available notice appears without an automatic reload.
- `npm run lint`, `npm run check`, `npm test` still clean (SW file itself is plain JS
  outside the TS/Svelte toolchain, not linted/type-checked the same way — confirm it's
  either excluded cleanly from `svelte-check`/eslint scope or passes eslint's plain-JS
  rules if included).

---

## Phase 3 — Accessibility pass

**Scope:** an audit-and-fix pass across existing components (Phases 1-4), plus new
automated a11y tests.

1. **Focus-visible audit**: grep every interactive element (`<button`, `<a `, `<input`,
   `<select`, `role="option"`/`"tab"`/`"combobox"` custom controls) across `src/lib/
   components/**/*.svelte` and confirm each has a visible `:focus-visible` treatment —
   either inherited from a global rule in `tokens.css`/`reset.css` or a component-local
   one. Where missing, add a `:focus-visible` style using the existing `--focus-ring`
   semantic token (never a new raw color) — check `tokens.css:25`'s existing global
   `:focus-visible` rule first; it may already cover most cases via inheritance, in
   which case this step is mostly a verification pass, not a rewrite (confirm via
   manual Tab-through before assuming widespread gaps).
2. **Modal focus trap + return**: verify (don't just assume) that `Modal.svelte`
   (used by SearchDialog, ShortcutsHelp, SettingsPanel) actually traps focus inside the
   native `<dialog>` (native `showModal()` mostly handles this, but confirm Tab doesn't
   escape to background content) and returns focus to the triggering element on close
   (Phase 4's discovery already found `Modal.svelte` restores previously-focused element
   on its `close` event — confirm this still holds for `SettingsPanel` specifically,
   including after nested state like the import/export or wallpaper file-picker flows).
3. **Icon-only buttons**: grep for icon-only buttons (buttons whose only content is an
   icon component, no visible text) across `src/lib/components/**` and confirm each has
   `aria-label` sourced from `strings.ts`; confirm decorative SVG icons have
   `aria-hidden="true"`.
4. **`aria-live` audit**: confirm present on search result count (Phase 2), reorder
   announcements (Phase 4's `announcer.svelte.ts`), and weather-widget update
   announcements if any exist (check `Weather.svelte`) — and confirm **absent** on the
   Clock widget (a ticking `aria-live` region would be read out constantly, explicitly
   called out as wrong in the spec — verify `Clock.svelte` has no `aria-live`
   attribute anywhere).
5. **Heading structure**: walk the rendered DOM's heading levels (main page, inside each
   modal) and confirm no level is skipped (e.g. no jump from `h1` to `h3`). Fix any
   found by adjusting heading levels, not by hiding/relabeling — check `SettingsPanel`
   and its five section components especially, since those were built fastest across
   Phase 4's sub-agents and are the most likely to have inconsistent heading levels
   between sections.
6. **`prefers-reduced-motion`**: confirm coverage everywhere animation exists — Modal
   entrance (already handled per Phase 4 discovery), reorder transitions (Phase 4's
   `pointerReorder`/`keyboardReorder` — confirm the "no reorder animation" respect is
   actually wired to a `matchMedia('(prefers-reduced-motion: reduce)')` check, not just
   asserted in a comment), and any CSS `transition`/`animation` declared elsewhere
   (`grep -rn "transition\|animation" src/styles src/lib/components`) — wrap each in a
   `@media (prefers-reduced-motion: no-preference)` guard or an equivalent JS check,
   whichever the existing pattern already uses (match it, don't introduce a second
   technique).
7. **200% zoom**: this needs manual/visual verification (zoom the browser to 200%,
   confirm no horizontal scroll, no clipped content, in each of the 3 main views) — call
   this out in the final report as a manual check performed (or flagged as needing
   manual confirmation if the environment can't drive a real browser at zoom).
8. **Full keyboard navigation**: manual/e2e-verified — the existing Playwright specs
   already exercise keyboard-only flows for search and settings; extend coverage if any
   gap is found (e.g. wallpaper file picker, city search result selection) during this
   audit.

**New file:** `tests/e2e/a11y.spec.ts` — add `@axe-core/playwright` as a new
devDependency, write a spec (matching the existing docblock+role-locator style) that
runs `AxeBuilder` against: the main page (default state), the search dialog open, and
the settings panel open (at least the default/first section — optionally cycle through
a couple of sections for broader coverage without making the spec unwieldy). Assert
zero violations; if any surface, fix the underlying component rather than suppressing
the rule, unless a finding is a known axe-core false positive specific to native
`<dialog>` semantics (document any such suppression explicitly with a comment citing
the reason).

**Verification:**
- `npm run test:e2e` passes including the new a11y spec, zero axe violations reported.
- `npm run lint`, `npm run check`, `npm test` clean.
- Manual Tab-through of the full app + settings panel (or as thorough an automated
  proxy as the environment allows) confirms no keyboard trap and no invisible-focus
  dead zones.

---

## Phase 4 — Bundle budget script

**New file:** `tools/checkBudget.mjs` (plain `.mjs`, no TS-execution tooling needed
since it just reads `dist/` and gzips — keep it dependency-free using Node's built-in
`zlib.gzipSync`, no new package required):
- Reads every file under `dist/assets/`, buckets by extension (`.js` vs `.css`, ignore
  everything else — wallpapers explicitly excluded per spec, and none currently live
  under `dist/assets/` anyway since they're IndexedDB-sourced or a currently-empty
  `public/wallpapers/`).
- gzips each with `zlib.gzipSync(buffer, { level: 9 })`, sums bytes per bucket.
- Always prints a table (asset → raw size → gzip size, plus bucket totals vs budget)
  **even when under budget** — per spec, so the remaining margin is visible on every
  build.
- Exits with a non-zero code if JS gzip total > 60 KB or CSS gzip total > 20 KB (use
  clean KB definitions — confirm whether the spec means 60×1024 or 60×1000 bytes; 1024-
  based KiB is the safer/stricter interpretation given no explicit clarification, use
  that consistently in both the script and its printed table labels).
- Wire into `package.json`'s `build` script so it runs automatically: `"build": "vite
  build && node tools/checkBudget.mjs"`.

**Verification:**
- `npm run build` runs the budget check automatically, table prints, exits 0 (given the
  ~46 KB/~4.7 KB baseline from Phase 0 discovery, plus whatever Phases 1-3 of this plan
  added — if Phase 2's SW-registration code or Phase 3's new a11y-related code pushed JS
  over budget, address it now per PHASE-5.md §6's suggested causes-in-order: check for
  a fully-included icon set, a dependency that leaked into `dependencies`, or
  unnecessary polyfills from the `target` — in that order — before considering any
  scope cut).
- Deliberately test the failure path once (e.g. temporarily lower the threshold in a
  scratch copy, confirm non-zero exit) — don't leave the threshold altered, just confirm
  the failure path works, then restore real thresholds.

---

## Phase 5 — Documentation: three READMEs + wallpapers README + screenshots

**New/rewritten files:**
- `README.md` (English, primary — replaces the current 2-line stub), `README.ca.md`,
  `README.es.md` — all three **complete and equivalent**, each starting with the exact
  language-switcher line specified: `English · [Català](README.ca.md) · [Español]
  (README.es.md)` (adjust bold/current-language styling per file, e.g. the Catalan file
  bolds "Català" instead of linking it — a small, tasteful convention, your call, just
  keep it consistent across all three).
  Sections (per PHASE-5.md §7.1, all ten, in this order): description+screenshot,
  features, **Mnemonics** (its own full section covering the `&` syntax with examples —
  copy the same canonical examples used elsewhere in the codebase's strings/tests for
  consistency, e.g. `Git&Hub`, `R&&D`, trailing-`&` handling), full keyboard-shortcuts
  table (source it from `src/lib/keyboard/shortcuts.ts`'s `SHORTCUTS` array so the
  table can't silently drift from the real bindings — either generate the markdown table
  from that array via a small script, or transcribe it carefully and note it should be
  regenerated if shortcuts change), install/dev instructions (`npm install`, `npm run
  dev`, etc. — pull exact commands from `package.json` scripts), configuration section
  (`config.json`, the integrated settings panel, export/import), deployment section
  (GitHub Pages, plain nginx static-file serving, Docker — a minimal illustrative
  Dockerfile/nginx.conf snippet is fine, doesn't need a new committed Dockerfile unless
  you judge it valuable; a documented example is the actual requirement), the SW
  unregister/cache-clear DevTools walkthrough from Phase 2, an **Acknowledgements**
  section linking `pivoshenko/catppuccin-startpage`, `b-coimbra/dawn`, and
  `catppuccin/palette` (exact repo slugs, per both PHASE-5.md's checklist and the
  NOTICE file's own acknowledgements section — keep wording consistent with NOTICE),
  and a License section (MIT, point at `LICENSE`).
- `public/wallpapers/README.md`: documents origin+license per image currently present.
  Since `public/wallpapers/` currently only has `index.json` with `[]` (no actual images
  shipped yet per Phase 0 discovery), write this as a template/policy document instead
  ("no wallpapers are bundled with this repository yet; when adding one, record its
  source URL, author, and license here before referencing it from `index.json`") rather
  than fabricating fictitious image entries — note this explicitly in your report so
  it's clear the file's *emptiness* is accurate, not a shortcut taken.
- `docs/screenshots/`: capturing real screenshots requires a running browser session
  this plan's execution may not have interactively — if a headed/headless browser
  screenshot flow is feasible (e.g. via a quick Playwright script hitting `npm run
  preview`, toggling `data-flavour` to a light and a dark value, and saving PNGs), do
  that and reference the real files with relative paths from the READMEs. If truly
  infeasible in the execution environment, create the `docs/screenshots/` directory
  with a `.gitkeep` or short `NOTE.md` explaining screenshots still need to be captured
  manually (using the default Annex A config, never personal data, per the spec), and
  leave the README image references as relative paths pointing at the expected
  filenames so they're a one-step fix once real screenshots are dropped in — be
  explicit about which of these two outcomes actually happened in your report.

**New test:** a lightweight sync-check — per PHASE-5.md §7.2, a test (vitest, plain
Node `fs` reads of the three README files, no DOM needed — `tests/unit/
readmeSync.test.ts`) asserting all three READMEs have the same count of `## ` (level-2)
headings and the same number of rows in the keyboard-shortcuts table. This is a real
automated regression guard per the spec ("mesura mínima" / minimum measure), not
optional polish.

**Verification:**
- `npm test` includes and passes the new README sync-check.
- Manually diff heading counts across all three files once more by eye as a sanity
  check beyond the automated test.
- Confirm no personal data appears in any README (no real names beyond already-
  sanctioned `d00m4n`, no private paths/hosts).

---

## Phase 6 — CI, deploy, dependabot

**New files:**
- `.github/workflows/ci.yml`: triggers on `push` and `pull_request` targeting `main`.
  Steps: checkout, setup-node (Node 22, `cache: npm`), `npm ci`, `npm run lint`, `npm
  run check`, `npm test`, `npm run build` (already runs the Phase 4 budget check as part
  of the `build` script), `npm run test:e2e`. **Every action reference pinned to a full
  commit SHA**, not a version tag (e.g. `actions/checkout@<40-char-sha>` with the tag
  version as a trailing comment for readability, e.g. `# v4.x.x`) — look up each
  action's current stable release commit SHA (checkout, setup-node, and whatever
  Playwright-browser-install action or manual `npx playwright install --with-deps
  chromium` step is needed for `test:e2e` to run headless in CI) and pin all of them;
  do not leave any `@main` or `@v4`-style tag reference anywhere in this file.
- `.github/workflows/deploy.yml`: triggers only on push to `main`, gated on the CI
  workflow succeeding (`workflow_run` trigger keyed to the CI workflow, or a `needs:`
  dependency if using a single combined workflow — pick whichever is the more standard/
  simpler GitHub Actions pattern, your call, just ensure deploy genuinely cannot run
  before CI passes). Uses `actions/configure-pages`, `actions/upload-pages-artifact`,
  `actions/deploy-pages` (all pinned by SHA), minimal permissions block (`contents:
  read`, `pages: write`, `id-token: write`), builds via the same `npm ci && npm run
  build` steps, uploads `dist/`.
- `.github/dependabot.yml`: two `package-ecosystem` entries (`npm`, `github-actions`),
  both `interval: monthly`, targeting `/` directory.

**Verification (cannot fully verify without an actual GitHub Pages deploy — be honest
about this in the report):**
- YAML syntax valid (`npx js-yaml` or similar quick parse check, or just careful manual
  review — no new dependency needed just for this, a Python/Node YAML parser already
  available via devDependencies' toolchain transitively, or trust careful authoring).
- Confirm every `uses:` line references a full SHA, not a tag, via
  `grep -n "uses:" .github/workflows/*.yml` and eyeball each value's length/format.
  self-check.
- Confirm `vite.config.ts`'s `base: './'` is what actually gets built and uploaded
  (already true per Phase 0 discovery, no change needed, just note it in the report
  since PHASE-5.md explicitly calls this the verification point most likely to have
  been skipped in "phase 0").
- Actual GitHub Pages deployment, subdirectory-serving confirmation, and Actions run
  success can only be confirmed once the user pushes and enables Pages — explicitly
  flag this as outside what this plan's execution can verify.

---

## Phase 7 — Final pre-publish checklist walkthrough

Not a coding phase — a verification sweep against PHASE-5.md §9's full checklist,
item by item, marking each verified/unverified/needs-human with a one-line reason,
same honesty standard as Phase 4's plan closeout in PHASE-4-PLAN.md. Explicitly flag
which items are structurally impossible for an agent to close out alone (git history
review is a human judgment call about what counts as "sensitive"; actually flipping
the repo to public and verifying the live Pages URL under a real subdirectory requires
the user's GitHub account).

Run and report exact output of: `npm run lint`, `npm run check`, `npm test`, `npm run
build` (includes budget check), `npm run test:e2e` (includes axe a11y spec),
`grep -rn '\-\-p-' src --include='*.svelte'` (must be empty), confirm `dependencies`
key absent/empty in `package.json`, `git log --format='%ae' | sort -u'` (report, don't
modify — flag if it now shows anything unexpected the palette/SW/README commits might
have introduced, e.g. an editor-inserted email).

Close the report with a clear statement of what remains for the user to do by hand
before actually making the repository public (the aesthetic palette review flagged in
Phase 1, real screenshot capture if Phase 5 couldn't do it headlessly, actually
enabling GitHub Pages + verifying the live subdirectory deployment, and the git-history
sensitivity read-through).
