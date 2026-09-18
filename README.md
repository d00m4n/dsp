**English** · [Català](README.ca.md) · [Español](README.es.md)

# homebase

## Overview

A fast, keyboard-first, offline-capable start page. No tracking, no
build-time secrets, no server required — open `index.html` (or deploy the
`dist/` folder anywhere) and it works.

![Light theme screenshot](docs/screenshots/light.png)
![Dark theme screenshot](docs/screenshots/dark.png)

*(See [`docs/screenshots/`](docs/screenshots/) — if the images above don't
render yet, real screenshots haven't been captured for this checkout; see
the note in that folder.)*

## Features

- **Tabs, groups and links.** Organise bookmarks into tabs, each tab into
  named groups of link cards. Fully editable from the integrated settings
  panel — no config file editing required, though one is still supported
  (see [Configuration](#configuration)).
- **Mnemonics.** Press a single letter to jump straight to a link, without
  ever touching the mouse. See [Mnemonics](#mnemonics) below.
- **Search with bangs.** A single search box fuzzy-matches your own links
  and tabs first, then falls back to a configurable search engine. Type a
  `!bang` token (e.g. `!ddg`, `!yt`) anywhere in the query to route it to a
  specific engine for that search only. Plain URLs typed into the box are
  detected and navigated to directly instead of being searched.
  Bangs and are just an example — every search engine, including the bangs
  that address them, is user-configurable.
- **Widgets.** An optional clock, date/ISO-week display, a greeting, and a
  weather panel (via Open-Meteo, no API key) can be placed alongside your
  links.
- **Themeable palette.** Four built-in flavours — one light (`dsp-dawn`) and
  three dark (`dsp-dusk`, `dsp-night`, `dsp-abyss`) — generated from an
  original OKLCH colour spec (`tools/palette.ts`), each verified to meet
  WCAG contrast minimums against every text/background pairing it's used
  in.
- **Custom wallpapers.** Upload your own background image (stored locally
  in IndexedDB, never uploaded anywhere) or pick from wallpapers bundled
  with a given deployment.
- **Offline support.** A hand-written service worker precaches the app
  shell and hashed build assets on first visit, so the page keeps working
  with no network connection. `config.json` and navigations are always
  fetched network-first so a live deployment's content updates are never
  masked by a stale cache; a banner appears when a new version has been
  downloaded and is ready to activate.
- **Keyboard-first design.** Every interactive control is reachable and
  operable from the keyboard, with visible focus indicators throughout.
  See the [full shortcuts table](#keyboard-shortcuts) below.
- **Export, import and reset.** Your whole configuration is a single JSON
  document you can export, re-import (with a validated preview before it's
  applied), or reset back to the defaults at any time.
- **No tracking, small footprint.** No analytics, no third-party scripts.
  The production JavaScript and CSS bundles are checked against a strict
  size budget (100 KiB / 20 KiB gzip) on every build. A curated set of
  [Tabler](https://tabler.io/icons) icons is bundled locally and works
  fully offline; any other valid Tabler icon name still works, fetched
  on demand from the [Iconify API](https://api.iconify.design) the first
  time it's used.

## Mnemonics

Mnemonics are homebase's signature feature: press a letter key (with the
grid focused, and no dialog open) to open the matching link instantly, or
`Shift` + letter to open it in a new tab.

Each link's display name can embed an `&` marker to explicitly claim the
key it should respond to. If a name has no `&`, a key is assigned
automatically from its letters. The syntax:

| You type    | Displayed as | Result                                        |
| ----------- | ------------ | ---------------------------------------------- |
| `Reddit`    | Reddit       | no `&` — a key is assigned automatically        |
| `&Reddit`   | Reddit       | claims `r`                                      |
| `Git&Hub`   | GitHub       | claims `h`                                      |
| `R&&D`      | R&D          | `&&` is a literal ampersand — no key claimed    |
| `T&elegram` | Telegram     | claims `e`                                      |
| `&1abc`     | 1abc         | digits aren't valid mnemonic keys — no key claimed |
| `Àl&bums`   | Àlbums       | claims `b` (accents are stripped when matching) |

The first `&`-claimed letter in a name always wins; a trailing, dangling
`&` at the end of a name is silently dropped.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `a`–`z` | Open the mnemonic link in the current tab |
| `Shift` + `a`–`z` | Open the mnemonic link in a new tab |
| `1` … `9` | Jump to tab N |
| `↑` `↓` `←` `→` | Move focus around the grid |
| `/` | Open search |
| `Ctrl` + `K` | Open search |
| `?` | Show this help |
| `,` | Open settings |
| `Esc` | Close the open dialog |

*(This table is generated from `src/lib/keyboard/shortcuts.ts`'s `SHORTCUTS`
array, the single source of truth also used by the in-app `?` help modal —
if shortcuts change, regenerate this table from that file.)*

## Install & development

```sh
npm install
npm run dev          # start the Vite dev server
npm run build         # production build to dist/ (also runs the bundle-budget check)
npm run preview       # serve the production build locally
npm test               # run the vitest unit test suite
npm run test:e2e      # run the Playwright end-to-end suite
npm run lint            # eslint
npm run check            # svelte-check (types)
npm run format             # prettier --write
npm run palette:build       # (re)generate src/styles/flavours.css from tools/palette.ts
npm run palette:check        # verify flavours.css matches the palette spec, without writing
```

## Configuration

homebase needs no configuration to run — it ships with sensible defaults.
Everything is editable through the integrated settings panel, opened with
the `,` keyboard shortcut or its on-screen button.

- **Local overrides.** Any change made in the settings panel is saved to
  `localStorage` in the browser and takes effect immediately, with no
  server involved.
- **`config.json` remote override.** On first load (only when there is no
  existing local override), homebase fetches `config.json` from the same
  directory it's served from. This lets a deployment ship a curated default
  configuration without touching any code — drop a `config.json` file next
  to `index.html`. A missing file (404) is the normal case, not an error,
  and simply falls back to the built-in defaults.
- **Export.** The whole configuration — tabs, groups, links, widgets,
  search engines, appearance — can be exported to a single JSON file at any
  time from the settings panel's Data section. Wallpapers stored locally in
  IndexedDB are *not* included in the export.
- **Import.** A previously exported (or hand-written) JSON file can be
  re-imported; it's validated first and a preview is shown before anything
  is applied.
- **Reset.** The whole configuration can be reset back to the built-in
  defaults at any time, with a confirmation step first.

## Deployment

`vite.config.ts` sets `base: './'`, so the built app uses relative asset
paths and works when served from any subdirectory — a repository root, a
GitHub Pages project path (`https://user.github.io/repo/`), or a subpath
behind a reverse proxy — with no extra configuration.

### GitHub Pages

Build with `npm run build` and publish the contents of `dist/` (for
example via the `actions/deploy-pages` GitHub Action, or by pushing
`dist/` to a `gh-pages` branch). Because of `base: './'`, no `base` or
`homepage` field needs adjusting for a project-page URL.

### Plain nginx static hosting

`dist/` is a static site — any web server that can serve files works.
A minimal `nginx.conf` snippet:

```nginx
server {
    listen 80;
    server_name example.invalid;
    root /var/www/homebase/dist;
    index index.html;

    # config.json and index.html are fetched network-first by the service
    # worker; make sure this server never sends long-lived cache headers
    # for them.
    location = /config.json {
        add_header Cache-Control "no-cache";
    }
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Docker

A minimal illustrative Dockerfile (not committed to the repo — adapt as
needed):

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Subdirectory deployment

Because of `base: './'`, no special configuration is needed to serve
homebase from a subdirectory (e.g. `https://example.invalid/start/`) —
just copy the contents of `dist/` into that subdirectory. Only
`config.json` and any `wallpapers/index.json`-listed files need to live
alongside `index.html` in that same directory.

## Unregistering the service worker / clearing caches

homebase installs a small, hand-written service worker for offline
support. To remove it and clear everything it has cached:

1. Open the browser's DevTools (`F12` or right-click → *Inspect*).
2. Go to the **Application** tab (Chrome/Edge) — in Firefox this is the
   **Storage** panel of DevTools.
3. Under **Service Workers**, find the entry for this site and click
   **Unregister**.
4. Under **Storage** (or **Clear storage**), click **Clear site data** (or
   select the site's caches individually and delete them) to remove the
   cached app shell and assets.
5. Reload the page. It will now load fully from the network and, in
   production builds, register a fresh service worker.

## Acknowledgements

homebase is an independent project, not affiliated with or endorsed by any
of the projects below — but its concept, layout and visual direction are
directly inspired by them, and that debt should be visible:

- [pivoshenko/catppuccin-startpage](https://github.com/pivoshenko/catppuccin-startpage)
- [b-coimbra/dawn](https://github.com/b-coimbra/dawn)
- [catppuccin/palette](https://github.com/catppuccin/palette) — the colour
  values in `src/styles/flavours.css` are an original OKLCH-generated
  palette (see `tools/palette.ts`), not Catppuccin's own hex values, but
  the palette *structure* (four flavours, one light, three dark, 24 tokens
  each) and the token *naming* (`mauve`, `rosewater`, `crust`,
  `overlay0`–`overlay2`, and so on) were inspired by, and are directly
  borrowed from, Catppuccin's vocabulary.

See [`NOTICE`](NOTICE) for the full third-party attribution list.

## License

MIT — see [`LICENSE`](LICENSE).
