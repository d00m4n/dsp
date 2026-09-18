# Screenshots still needed

This folder is a placeholder. The three top-level READMEs
(`README.md`, `README.ca.md`, `README.es.md`) reference two images here
that don't exist yet:

- `docs/screenshots/light.png` — the app in a light flavour (e.g.
  `dsp-dawn`).
- `docs/screenshots/dark.png` — the app in a dark flavour (e.g.
  `dsp-night` or `dsp-abyss`).

## Why they're missing

Capturing them automatically (e.g. via a Playwright script that runs
`npm run build && npm run preview`, opens a page, toggles
`document.documentElement.dataset.flavour`, and saves a screenshot) was
attempted, but the sandboxed environment this was written in cannot
launch a Chromium browser at all: `chrome-headless-shell` fails to start
with `error while loading shared libraries: libnspr4.so: cannot open
shared object file: No such file or directory`. This is a missing system
library the Playwright browser binary depends on, not a project bug, and
it isn't resolvable without installing packages outside this repository.

## How to capture them (do this once, on a machine with a working browser)

1. `npm run build`
2. `npm run preview` (serves `dist/` on `http://localhost:4173` by
   default)
3. Open the preview URL in a real browser.
4. **Use the default configuration only** — the one that ships in
   `src/lib/config/defaults.ts` (Annex A). Do not take screenshots of a
   personal, customised configuration: no personal bookmarks, no real
   city/location in the weather widget, no personal wallpaper.
5. For the light screenshot: set `data-flavour="dsp-dawn"` on the root
   `<html>` element (e.g. via the in-app settings panel's appearance
   section), then save a screenshot as `docs/screenshots/light.png`.
6. For the dark screenshot: set `data-flavour="dsp-night"` (or
   `dsp-abyss`), then save a screenshot as `docs/screenshots/dark.png`.
7. Optimise both PNGs (e.g. `oxipng`/`pngquant`) before committing —
   keep them reasonably small.
8. Delete this `NOTE.md` once both files are in place (the READMEs
   already reference the final filenames, so nothing else needs to
   change).
