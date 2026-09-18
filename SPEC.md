# SPEC — homebase

Font de veritat. Tipus, configuració, contracte de tecles i decisions preses.
Les regles operatives són a `../CLAUDE.md`; els plans d'implementació, a `PHASE-N.md`.

---

## 1. Model de dades

`src/types/config.ts`. Contracte central del projecte; es declara **sencer a la fase 1**
encara que widgets i cerca no s'usin fins més tard, perquè el fitxer de configuració no
canviï de forma entre fases.

```ts
export type Flavour = 'dsp-dawn' | 'dsp-dusk' | 'dsp-night' | 'dsp-abyss';

export interface AppConfig {
  schemaVersion: number;
  theme: ThemeConfig;
  search: SearchConfig;
  widgets: Widget[];
  tabs: Tab[];
  behaviour: BehaviourConfig;
}

export interface ThemeConfig {
  lightFlavour: Flavour;
  darkFlavour: Flavour;
  /** Used when prefers-color-scheme cannot be resolved. Must be dark. */
  fallbackFlavour: Flavour;
  overrides?: Partial<Record<PaletteToken, string>>;
  accent: PaletteToken;
  fontScale: number; // 0.8 – 1.4
  radius: number; // px
  backdrop: BackdropConfig;
}

export interface BackdropConfig {
  kind: 'none' | 'solid' | 'image';
  /** 'wallpapers/x.jpg' (deployed) or 'idb:{id}' (user-picked, IndexedDB). */
  source?: string;
  /** Still frame used under prefers-reduced-motion or on load failure. */
  staticFallback?: string;
  fit: 'cover' | 'contain' | 'tile';
  blur: number; // px
  opacity: number; // 0 – 1
}

export interface SearchConfig {
  defaultEngineId: string;
  engines: SearchEngine[];
  detectUrls: boolean;
  /** Suggestions come only from local links, never from a remote API. */
  suggestFromLinks: boolean;
}

export interface SearchEngine {
  id: string;
  name: string;
  /** '{query}' is replaced with the URL-encoded input. */
  template: string;
  icon?: string;
}

export interface Tab {
  id: string;
  name: string;
  icon: string;
  /** Under /wallpapers. Animated formats allowed. */
  banner?: string;
  bannerStatic?: string;
  groups: LinkGroup[];
}

export interface LinkGroup {
  id: string;
  name: string;
  links: Link[];
}

export interface Link {
  id: string;
  /** '&' marks the mnemonic ('Git&Hub' -> 'h'); '&&' is a literal ampersand. */
  name: string;
  url: string;
  icon?: string;
  newTab?: boolean;
}

export type WidgetSlot =
  | 'header-left' | 'header-center' | 'header-right'
  | 'footer-left' | 'footer-center' | 'footer-right';

interface WidgetBase {
  id: string;
  slot: WidgetSlot;
  order: number;
  enabled: boolean;
}

export interface ClockWidget extends WidgetBase {
  type: 'clock';
  label?: string;
  timezone: string; // IANA
  hour12: boolean;
  showSeconds: boolean;
  locale: string;
}

export interface DateWidget extends WidgetBase {
  type: 'date';
  label?: string;
  timezone: string;
  locale: string;
  style: 'full' | 'long' | 'medium' | 'short';
  /** ca/es render months lowercase; uppercase the first grapheme. */
  capitalise: boolean;
  showWeekNumber: boolean;
}

export interface WeatherWidget extends WidgetBase {
  type: 'weather';
  latitude: number;
  longitude: number;
  label: string;
  units: 'metric' | 'imperial';
  refreshMinutes: number;
}

export interface GreetingWidget extends WidgetBase {
  type: 'greeting';
  name: string;
  /** '{name}' is substituted as text, never as HTML. */
  templates?: Partial<Record<'morning' | 'afternoon' | 'evening' | 'night', string>>;
}

export interface PhraseWidget extends WidgetBase {
  type: 'phrase';
  label?: string;
  /** One entry is picked at random each time the page loads. */
  phrases: string[];
}

export type Widget = ClockWidget | DateWidget | WeatherWidget | GreetingWidget | PhraseWidget;

export interface BehaviourConfig {
  startTab: 'first' | 'last' | string;
  confirmBeforeReset: boolean;
  showMnemonics: boolean;
  pageTitle: string;
  /** Where the footer sits: pinned to the viewport bottom, or right after the content. */
  footerPosition: 'page-end' | 'after-content';
}
```

## 2. Configuració

**Precedència:** defaults compilats → `config.json` de l'arrel del desplegament (404 és
el cas normal) → `localStorage` a `homebase:config`, que mana.

**Validació:** `parseConfig(input: unknown): { config, errors }`, escrita a mà, sense
llibreries. No llença mai. Camp invàlid → default + entrada a `errors` amb la ruta
(`tabs[0].links[3].url`) i el motiu. Valida: URL amb `new URL()` i llista blanca de
protocols, ids únics, `fontScale` acotat, `flavour` i `slot` dins dels valors permesos.

**Migracions:** `schemaVersion` encadena `migrations/00N-to-00M.ts`. Còpia prèvia a
`homebase:config:backup`.

## 3. Mnemònics

Cada tab té el seu propi mapa; la mateixa lletra pot apuntar a enllaços diferents segons
el tab actiu. Els dígits queden reservats per als tabs i mai s'assignen.

**Sintaxi:** `&Reddit` → `r` · `Git&Hub` → `h` · `R&&D` → mostra `R&D`, sense reclamació.
El `&` mai es mostra. Només la primera reclamació d'un nom compta.

**Assignació**, determinista, en tres passades sobre l'ordre grup → posició:

1. Reclamacions explícites. Si la lletra està ocupada, va a `conflicts` i baixa a la 2.
2. Primera lletra lliure del nom mostrat, d'esquerra a dreta.
3. Primera lletra lliure de l'alfabet, amb `displayIndex` nul.

Sense lletres disponibles → `unassigned`; l'enllaç segueix accessible per fletxes i
cerca. Normalització amb `NFD` + supressió de diacrítics, de manera que `Àlbums` reclama
la `a`.

## 4. Contracte de tecles

| Tecla | Acció |
| --- | --- |
| lletra | Obre l'enllaç amb aquest mnemònic al tab actiu |
| `Shift` + lletra | El mateix, en pestanya nova |
| `/` o `Ctrl+K` | Cerca |
| `1`…`9` | Salta al tab N |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Tab següent / anterior |
| Fletxes | Mou el focus per la graella |
| `,` | Configuració |
| `?` | Ajuda de tecles |
| `Esc` | Tanca modals |

Cap atall es dispara dins d'`input`, `textarea` o `contenteditable`, excepte `Esc`.
Tampoc amb `event.isComposing` (IME actiu). `preventDefault()` només quan s'ha gestionat
realment la tecla.

L'ajuda de `?` es genera des de les metadades de `shortcuts.ts`, mai d'una taula escrita
a mà.

## 5. Temes

Quatre paletes com a custom properties, seleccionades amb `[data-flavour]` sobre `<html>`:

| Id | Rol | Valors fins a la fase 5 |
| --- | --- | --- |
| `dsp-dawn` | Clara | Catppuccin Latte |
| `dsp-dusk` | Fosca suau | Catppuccin Frappé |
| `dsp-night` | Fosca mitjana | Catppuccin Macchiato |
| `dsp-abyss` | Fosca profunda (default) | Catppuccin Mocha |

**Sense mode manual.** Sempre `prefers-color-scheme`; si no es pot resoldre, la paleta
fosca de `fallbackFlavour`. L'usuari només tria quina paleta correspon a cada mode.

El tema s'aplica **abans del primer pintat** amb un script inline al `<head>`, abans de
qualsevol full d'estil.

L'adaptació de valors de la fase 5 no toca cap identificador ni selector: només els hex.
Per això existeix la capa de tokens semàntics.

## 6. Fons

Formats: `png`, `jpg`, `webp`, `avif`, `svg` i animats `gif`, `apng`, `webp` animat.
Amb `prefers-reduced-motion`, s'usa `staticFallback` si n'hi ha. Avís a partir de 2 MB,
que és avís i no bloqueig. Si la imatge no carrega, es cau al fons sòlid sense forats.

## 7. Decisions preses

| Tema | Decisió |
| --- | --- |
| Framework | Svelte 5 + Vite pelat. **No SvelteKit**: una sola pàgina, sense router ni servidor |
| Mode clar/fosc | Sempre automàtic, fallback fosc |
| Paleta | Valors upstream fins a la fase 4; adaptats a la 5. Ids `dsp-*` des del primer commit |
| Atribució | Catppuccin al `NOTICE` i als tres README. Bloquejant per publicar |
| Cerca | `s` **no** obre la cerca: les lletres pertanyen als mnemònics |
| Wallpapers d'usuari | IndexedDB, no `localStorage` (quota de 5 MB compartida amb la config) |
| Àmbit | Sense monitoratge de serveis: conviu amb Homepage |
| Visibilitat | Públic a GitHub, MIT |
| Documentació | README en anglès, català i castellà |

## 8. Fora d'abast

Sincronització amb servidor, comptes d'usuari, extensió de navegador empaquetada, lector
RSS, monitoratge de serveis, editor de temes token a token.

## 9. Pendent de decidir

- **i18n de la interfície.** L'especificació només cobreix els README. Mesura de
  contenció: cap literal als components, tot a `strings.ts`. Cal resoldre-ho abans de la
  fase 5.
- **Paràmetres d'adaptació de paleta** (rotació de to, escala de croma). Decisió
  estètica: generar variants i triar-ne una de visu.

---

## Annex A — Configuració inicial

Un sol tab. Els `&` desfan col·lisions: `Twitch` es queda la `t`, així que `Telegram`
la marca explícitament. Serveix alhora de configuració real i de *fixture* de test.

```jsonc
{
  "schemaVersion": 1,
  "theme": {
    "lightFlavour": "dsp-dawn", "darkFlavour": "dsp-abyss",
    "fallbackFlavour": "dsp-abyss", "accent": "mauve",
    "fontScale": 1, "radius": 12,
    "backdrop": { "kind": "solid", "fit": "cover", "blur": 0, "opacity": 1 }
  },
  "search": {
    "defaultEngineId": "d", "detectUrls": true, "suggestFromLinks": true,
    "engines": [
      { "id": "d", "name": "DuckDuckGo", "template": "https://duckduckgo.com/?q={query}" },
      { "id": "g", "name": "Google", "template": "https://www.google.com/search?q={query}" },
      { "id": "w", "name": "Wikipedia (ca)", "template": "https://ca.wikipedia.org/w/index.php?search={query}" }
    ]
  },
  "widgets": [
    { "id": "clock-local", "type": "clock", "slot": "header-left", "order": 0,
      "enabled": true, "timezone": "Europe/Madrid", "hour12": false,
      "showSeconds": false, "locale": "ca-ES" },
    { "id": "date-local", "type": "date", "slot": "header-left", "order": 1,
      "enabled": true, "timezone": "Europe/Madrid", "locale": "ca-ES",
      "style": "full", "capitalise": true, "showWeekNumber": false },
    { "id": "weather-reus", "type": "weather", "slot": "header-right", "order": 0,
      "enabled": true, "label": "Reus", "latitude": 41.155, "longitude": 1.1075,
      "units": "metric", "refreshMinutes": 30 },
    { "id": "greeting-main", "type": "greeting", "slot": "header-center", "order": 0,
      "enabled": true, "name": "d00m4n" }
  ],
  "tabs": [
    { "id": "social", "name": "Social", "icon": "world", "groups": [
      { "id": "networks", "name": "Xarxes", "links": [
        { "id": "mastodon",  "name": "Mastodon",  "url": "https://mastodon.social",   "icon": "brand-mastodon" },
        { "id": "bluesky",   "name": "Bluesky",   "url": "https://bsky.app",          "icon": "brand-bluesky" },
        { "id": "reddit",    "name": "Reddit",    "url": "https://www.reddit.com",    "icon": "brand-reddit" },
        { "id": "youtube",   "name": "YouTube",   "url": "https://www.youtube.com",   "icon": "brand-youtube" },
        { "id": "instagram", "name": "Instagram", "url": "https://www.instagram.com", "icon": "brand-instagram" },
        { "id": "linkedin",  "name": "LinkedIn",  "url": "https://www.linkedin.com",  "icon": "brand-linkedin" },
        { "id": "twitch",    "name": "Twitch",    "url": "https://www.twitch.tv",     "icon": "brand-twitch" },
        { "id": "telegram",  "name": "T&elegram", "url": "https://web.telegram.org",  "icon": "brand-telegram" },
        { "id": "discord",   "name": "Discord",   "url": "https://discord.com/app",   "icon": "brand-discord" },
        { "id": "github",    "name": "Git&Hub",   "url": "https://github.com",        "icon": "brand-github" }
      ]}
    ]}
  ],
  "behaviour": { "startTab": "first", "confirmBeforeReset": true, "showMnemonics": true }
}
```

Mnemònics esperats: Telegram `e` (explícit, índex 1) · GitHub `h` (explícit, índex 3) ·
Mastodon `m` · Bluesky `b` · Reddit `r` · YouTube `y` · Instagram `i` · LinkedIn `l` ·
Twitch `t` · Discord `d`, tots a l'índex 0.
