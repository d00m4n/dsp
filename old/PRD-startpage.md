# PRD — Startpage personal (nom en codi: `homebase`)

**Autor:** d00m4n
**Data:** 2026-07-23
**Versió del document:** 1.2
**Destinatari:** Claude Code (implementació des de zero)

> **Canvis respecte a la v1.0:** mnemònics per lletra en comptes de navegació vi ·
> paletes renombrades amb prefix `dsp` · widget de data · widgets reposicionables ·
> wallpapers animats · README trilingüe · decisions de §10 tancades.
>
> **Canvis respecte a la v1.1:** estratègia de paleta en dues etapes (valors upstream a
> la fase 1, adaptació abans de publicar) · atribució a Catppuccin com a requisit
> bloquejant de publicació · paleta fosca per defecte `dsp-abyss`.

---

## 1. Resum executiu

Construir una **startpage / new tab page** personal, estàticament servible, inspirada
conceptualment en [`catppuccin-startpage`](https://github.com/pivoshenko/catppuccin-startpage)
però amb **codi 100% nou**, escrita en **Svelte 5 + TypeScript**.

L'objectiu no és clonar el projecte original sinó resoldre els seus punts febles:

| Problema de l'original | Solució en aquest projecte |
| --- | --- |
| La configuració és un fitxer JS que obliga a redesplegar | `config.json` + `localStorage` + editor integrat a la pàgina |
| Dependències de CDN (Google Fonts, font d'icones remota) | Tot autoallotjat i inlinejat en temps de build |
| JS vanilla amb estat global i manipulació directa del DOM | Svelte 5 amb runes, estat tipat i components aïllats |
| Navegació per graella amb tecles vi (lenta, dos passos) | Mnemònics: una sola tecla obre l'enllaç |
| Widgets en posicions fixes | Sistema d'espais (*slots*) reordenables per l'usuari |

**Restricció dura del projecte:** el resultat ha de ser una carpeta `dist/` d'actius
estàtics que funcioni en qualsevol hosting bàsic (GitHub Pages, Forgejo Pages, nginx,
Caddy, un bucket S3, o fins i tot un subdirectori arbitrari) **sense cap procés de
servidor, sense regles de reescriptura d'URL i sense variables d'entorn en runtime**.

---

## 2. Objectius i no-objectius

### 2.1 Objectius

- **O1** — Pàgina d'inici que carrega i és interactiva en < 100 ms en local, sense
  petició de xarxa bloquejant.
- **O2** — Arribar a qualsevol enllaç amb **una sola pulsació de tecla**.
- **O3** — Configuració editable des de la pròpia interfície, persistent al navegador,
  exportable i importable com un únic fitxer JSON.
- **O4** — Sistema de temes amb quatre paletes pròpies i commutació automàtica
  clar/fosc segons el sistema.
- **O5** — Desplegament trivial: `npm run build` → copiar `dist/` → funciona.
- **O6** — Zero telemetria, zero peticions a tercers per defecte (excepte el widget de
  temps, que és opcional i desactivable).
- **O7** — Projecte públic i comprensible: README en anglès, català i castellà.

### 2.2 No-objectius (fora d'abast v1)

- Sincronització entre dispositius mitjançant servidor propi.
- Compte d'usuari, autenticació o multi-usuari.
- Extensió de navegador empaquetada (es farà servir una extensió genèrica de "custom
  new tab URL").
- Lector RSS integrat (requereix proxy CORS → trenca la restricció de zero servidor).
- Monitoratge de serveis del homelab. Té el mateix problema de CORS i contingut mixt,
  i a més **aquest projecte conviurà amb una instància de Homepage**, que ja cobreix
  aquest cas d'ús. `homebase` és el punt de partida del navegador; Homepage és el
  quadre de comandament dels serveis. No s'han de solapar.
- Editor visual de temes amb selector de color per a cada token individual.

---

## 3. Stack tècnic

### 3.1 Recomanació principal

| Capa | Elecció | Justificació |
| --- | --- | --- |
| Framework | **Svelte 5** (runes: `$state`, `$derived`, `$effect`) | Sense runtime pesat; el bundle final és mínim |
| Build | **Vite 7** (plantilla `svelte-ts`) | Sortida estàtica pura, sense router ni SSR |
| Llenguatge | **TypeScript** en mode `strict` | Model de configuració tipat i validat |
| Estils | **CSS natiu amb custom properties** + `@layer` | Els temes són només reassignació de variables CSS |
| Icones | **`unplugin-icons`** amb el set `@iconify-json/tabler` | Els SVG s'inlinejen en build; cap petició externa |
| Tests unitaris | **Vitest** | Assignació de mnemònics, parsing de bangs, migracions |
| Tests E2E | **Playwright** | Fluxos de teclat i persistència |
| Qualitat | ESLint (flat config) + Prettier + `svelte-check` | |

**Dependències de runtime: cap.** Tot el que arriba al navegador ha de ser codi propi
o inlinejat en build. Si Claude Code considera que cal afegir alguna dependència de
runtime, ho ha de justificar explícitament abans d'instal·lar-la.

### 3.2 Configuració crítica de Vite

```ts
// vite.config.ts
export default defineConfig({
  base: './', // OBLIGATORI: rutes relatives → funciona a qualsevol subdirectori
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
  },
});
```

`base: './'` és un requisit no negociable: sense això la pàgina es trenca quan
s'allotja a `https://exemple.com/startpage/` en comptes de l'arrel del domini.

### 3.3 Alternativa descartada (documentada per si es reconsidera)

SvelteKit amb `adapter-static`, `prerender = true` i `paths.relative = true`.
Funciona, però afegeix router, capa de `load` i configuració de `base` per a un
projecte que té exactament una pàgina. **No s'ha de fer servir tret que es demani
explícitament.**

---

## 4. Model de dades

Tota la configuració viu en un únic objecte serialitzable. Aquest és el contracte
central del projecte i s'ha de definir a `src/types/config.ts`.

```ts
/** Palette identifiers. Deliberately not named after any upstream project. */
export type Flavour = 'dsp-dawn' | 'dsp-dusk' | 'dsp-night' | 'dsp-abyss';

export interface AppConfig {
  /** Schema version, used by the migration pipeline. */
  schemaVersion: number;
  theme: ThemeConfig;
  search: SearchConfig;
  widgets: Widget[];
  tabs: Tab[];
  behaviour: BehaviourConfig;
}

export interface ThemeConfig {
  /** Always follows prefers-color-scheme; there is no manual override. */
  lightFlavour: Flavour;
  darkFlavour: Flavour;
  /** Palette used when the media query cannot be resolved. Must be a dark one. */
  fallbackFlavour: Flavour;
  /** Optional overrides for individual palette tokens. */
  overrides?: Partial<Record<PaletteToken, string>>;
  accent: PaletteToken;
  fontScale: number; // 0.8 – 1.4
  radius: number; // px
  backdrop: BackdropConfig;
}

export interface BackdropConfig {
  kind: 'none' | 'solid' | 'image';
  /**
   * Where the backdrop image comes from. Either:
   * - `wallpapers/{file}`: a relative path under the deployed `/wallpapers`
   *   directory (static, bundled with the app). Animated formats are allowed.
   * - `idb:{id}`: a reference to a user-picked image stored in IndexedDB as a
   *   `Blob` (see §5.6 amendment below); `{id}` is the wallpaper's id.
   */
  source?: string;
  /**
   * Still image shown instead of `source` when the user prefers reduced motion,
   * or when `source` fails to load. Strongly recommended for animated backdrops.
   */
  staticFallback?: string;
  fit: 'cover' | 'contain' | 'tile';
  blur: number; // px
  opacity: number; // 0 – 1
}

export interface SearchConfig {
  defaultEngineId: string;
  engines: SearchEngine[];
  /** Treat input that parses as a URL as a direct navigation. */
  detectUrls: boolean;
  /** Suggestions come only from local links; never from a remote API. */
  suggestFromLinks: boolean;
}

export interface SearchEngine {
  id: string; // e.g. 'd'
  name: string; // e.g. 'DuckDuckGo'
  /** Query template; '{query}' is replaced with the URL-encoded input. */
  template: string; // 'https://duckduckgo.com/?q={query}'
  icon?: string;
}

export interface Tab {
  id: string;
  name: string;
  icon: string; // tabler icon name
  /** Relative path under /wallpapers. Animated formats are allowed. */
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
  /**
   * Display name. An '&' marks the following character as the mnemonic key
   * ('Git&Hub' -> 'h'). Use '&&' for a literal ampersand. When no '&' is present
   * the mnemonic is resolved automatically (see the mnemonic algorithm).
   */
  name: string;
  url: string;
  icon?: string;
  /** Open in a new tab instead of the current one. */
  newTab?: boolean;
}

/* ---------- Widgets ---------- */

export type WidgetSlot =
  | 'header-left'
  | 'header-center'
  | 'header-right'
  | 'footer-left'
  | 'footer-center'
  | 'footer-right';

interface WidgetBase {
  id: string;
  slot: WidgetSlot;
  /** Position within the slot, ascending. */
  order: number;
  enabled: boolean;
}

export interface ClockWidget extends WidgetBase {
  type: 'clock';
  label?: string;
  timezone: string; // IANA, e.g. 'Europe/Madrid'
  hour12: boolean;
  showSeconds: boolean;
  locale: string; // e.g. 'ca-ES'
}

export interface DateWidget extends WidgetBase {
  type: 'date';
  label?: string;
  timezone: string;
  locale: string;
  style: 'full' | 'long' | 'medium' | 'short';
  /** Uppercase the first letter (Catalan and Spanish render months lowercase). */
  capitalise: boolean;
  showWeekNumber: boolean;
}

export interface WeatherWidget extends WidgetBase {
  type: 'weather';
  latitude: number;
  longitude: number;
  label: string;
  units: 'metric' | 'imperial';
  /** Cache lifetime in minutes. */
  refreshMinutes: number;
}

export interface GreetingWidget extends WidgetBase {
  type: 'greeting';
  name: string;
  /** Message templates keyed by part of day. '{name}' is substituted. */
  templates?: Partial<Record<'morning' | 'afternoon' | 'evening' | 'night', string>>;
}

export type Widget = ClockWidget | DateWidget | WeatherWidget | GreetingWidget;

export interface BehaviourConfig {
  /** Which tab is active on load; 'last' restores the previous session. */
  startTab: 'first' | 'last' | string;
  confirmBeforeReset: boolean;
  /** Show the mnemonic letter underlined on every link card. */
  showMnemonics: boolean;
}
```

### 4.1 Precedència de la configuració

En arrencar, l'aplicació resol la configuració en aquest ordre (cada capa sobreescriu
l'anterior):

1. **Defaults compilats** (`src/lib/config/defaults.ts`) — sempre presents, garanteixen
   que l'app funciona sense cap altra cosa.
2. **`config.json`** carregat des de l'arrel del desplegament, si existeix. Si retorna
   404 o JSON invàlid, s'ignora en silenci (només un `console.warn`).
3. **`localStorage`** sota la clau `homebase:config` — el que l'usuari ha editat des de
   la interfície. Té la darrera paraula.

### 4.2 Validació i migracions

- Tota configuració provinent de `config.json`, `localStorage` o d'una importació ha de
  passar per un **validador escrit a mà** (`parseConfig()`) que retorni
  `{ ok: true, config }` o `{ ok: false, errors }`. No s'ha d'afegir Zod ni cap altra
  llibreria de validació per mantenir zero dependències de runtime.
- Els camps invàlids es descarten i es reemplacen pel default, **mai** es llença un
  error que deixi la pàgina en blanc. Una startpage que no carrega és un fracàs total.
- `schemaVersion` habilita un pipeline de migracions (`migrations/001-to-002.ts`, …)
  que s'aplica seqüencialment.
- Abans de qualsevol migració es desa una còpia a `homebase:config:backup`.

---

## 5. Requisits funcionals

### 5.1 Pantalla principal

- **RF-01** — Layout: capçalera i peu amb tres espais de widgets cadascun, barra de
  tabs, i graella de grups d'enllaços del tab actiu.
- **RF-02** — La graella és responsiva: columnes automàtiques amb
  `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`. Ha de ser usable des de
  360 px d'amplada fins a ultrawide.
- **RF-03** — Cada tab pot tenir un *banner* opcional; si no en té, es mostra només el
  fons del tema.
- **RF-04** — Cada enllaç mostra icona, nom i, si `showMnemonics` està actiu, la lletra
  mnemònica subratllada dins del nom.
- **RF-05** — Cap salt visual (layout shift) durant la càrrega. El tema s'ha d'aplicar
  abans del primer pintat mitjançant un script inline al `<head>` que resol la paleta i
  posa l'atribut `data-flavour` a `<html>`.

### 5.2 Mnemònics d'enllaç (substitueix la navegació vi)

Aquest és el mecanisme d'interacció principal del projecte i la diferència més gran
respecte al projecte que l'inspira.

- **RF-06** — Amb el focus a la pàgina (fora de qualsevol camp de text), **prémer una
  lletra obre directament l'enllaç del tab actiu que hi té assignat el mnemònic**. Sense
  moure el focus, sense confirmació.
- **RF-07** — `Shift` + lletra obre el mateix enllaç en una pestanya nova.
- **RF-08** — Els mnemònics tenen àmbit **de tab**: cada tab té el seu propi mapa, de
  manera que la mateixa lletra pot apuntar a enllaços diferents segons el tab actiu.
- **RF-09** — Sintaxi `&` al nom de l'enllaç:
  - `&Reddit` → mnemònic `r`
  - `Git&Hub` → mnemònic `h`
  - `R&&D` → nom mostrat `R&D`, sense mnemònic explícit
  - El `&` **mai** es mostra a la interfície.

#### Algorisme d'assignació (`src/lib/mnemonics/assign.ts`)

L'assignació és **determinista** i es recalcula cada cop que canvia la configuració:

1. **Normalització** — el nom es passa per `normalize('NFD')` i s'eliminen els
   diacrítics, de manera que `Àlbums` pugui reclamar la `a`. Només es consideren
   caràcters `a–z`. Els dígits queden reservats per als tabs i mai s'assignen.
2. **Primera passada — reclamacions explícites.** Els enllaços amb `&` reclamen la seva
   lletra. Si dos enllaços del mateix tab reclamen la mateixa, guanya el primer segons
   l'ordre de grup i posició; el segon queda sense reclamació explícita i passa a la
   segona passada, i **es registra un conflicte visible al panell de configuració**.
3. **Segona passada — automàtica.** Cada enllaç restant pren la primera lletra lliure
   del seu nom, recorregut d'esquerra a dreta.
4. **Tercera passada — residual.** Si cap lletra del nom és lliure, es pren la primera
   lletra lliure de l'alfabet.
5. **Sense mnemònic.** Si s'esgoten les 26 lletres, l'enllaç queda sense mnemònic; segueix
   sent accessible amb fletxes i des de la cerca. El panell de configuració avisa que el
   tab està saturat.

- **RF-09b** — L'algorisme ha de tenir cobertura de tests unitaris exhaustiva: casos de
  col·lisió explícita, col·lisió implícita, accents, noms buits, noms només numèrics,
  tab saturat i estabilitat (la mateixa configuració ha de produir sempre el mateix mapa).

#### Conseqüència de disseny

Com que **totes** les lletres pertanyen als mnemònics, els atalls globals no poden ser
lletres. Per això:

- La cerca **ja no s'obre amb `s`**; s'obre amb `/` o `Ctrl+K`.
- L'opció `openSearchOnType` de la v1.0 queda **eliminada**: és incompatible amb aquest
  model.
- Els atalls globals es limiten a tecles no alfabètiques: dígits, `/`, `,`, `?`, `Esc`,
  fletxes i combinacions amb `Ctrl`.

### 5.3 Cerca

- **RF-10** — Diàleg de cerca modal invocable amb `/` o `Ctrl+K`.
- **RF-11** — Suport de *bangs*: un prefix `!<id>` selecciona el motor
  (`!g consulta` → Google). El prefix es reconeix tant al principi com al final de la
  cadena.
- **RF-12** — Si l'entrada és una URL vàlida o un domini reconeixible (`exemple.com`),
  s'hi navega directament en comptes de cercar. Configurable via `search.detectUrls`.
- **RF-13** — Suggeriments: mentre s'escriu, es filtren els enllaços configurats **de
  tots els tabs** (coincidència difusa sobre nom i URL) i es mostren per damunt de
  l'opció de cerca web. Navegables amb fletxes i `Tab`. **Cap crida a APIs de
  suggeriments externes.**
- **RF-14** — `Enter` executa; `Shift+Enter` obre en pestanya nova; `Esc` tanca.

### 5.4 Navegació per teclat

| Tecla | Acció |
| --- | --- |
| lletra | Obre l'enllaç amb aquest mnemònic al tab actiu |
| `Shift` + lletra | El mateix, en pestanya nova |
| `/` o `Ctrl+K` | Obre la cerca |
| `1`…`9` | Salta al tab N |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Tab següent / anterior |
| Fletxes | Mou el focus per la graella (accessibilitat i ratolí-less sense mnemònics) |
| `Tab` / `Shift+Tab` | Ordre de focus natural del document |
| `Enter` | Obre l'enllaç enfocat |
| `,` | Obre la configuració |
| `?` | Mostra l'ajuda de tecles |
| `Esc` | Tanca qualsevol capa modal |

- **RF-20** — Cap atall s'ha de disparar mentre el focus és dins d'un `input`,
  `textarea` o element `contenteditable`, excepte `Esc`.
- **RF-21** — Prémer una lletra sense mnemònic assignat no ha de fer res perceptible més
  enllà, com a molt, d'una animació subtil de rebuig. Mai un so ni un missatge d'error.

### 5.5 Widgets

#### Sistema de posicionament

- **RF-25** — Hi ha sis espais: `header-left`, `header-center`, `header-right`,
  `footer-left`, `footer-center`, `footer-right`. Cada widget declara `slot` i `order`.
- **RF-26** — Es poden tenir **múltiples instàncies del mateix tipus** de widget (per
  exemple tres rellotges de zones diferents, o data curta a la capçalera i completa al
  peu).
- **RF-27** — Al panell de configuració, els widgets es poden moure entre espais
  arrossegant-los **i** amb teclat (`Alt` + fletxes sobre el widget enfocat). Cap
  funcionalitat de reordenació pot ser exclusiva del ratolí.
- **RF-28** — Un espai buit no ocupa alçada ni deixa forat visual.

#### Tipus de widget

- **RF-30 (Rellotge)** — Zona horària IANA, format 12/24 h, segons opcionals, locale
  configurable. Implementat amb `Intl.DateTimeFormat`. L'interval s'ha d'aturar quan la
  pestanya passa a `visibilitychange: hidden`.
- **RF-31 (Data)** — Data formatada amb `Intl.DateTimeFormat` segons `style`, `locale` i
  `timezone`. Opció `capitalise` perquè en català i castellà els mesos i dies es
  renderitzen en minúscula i sovint es vol majúscula inicial. Opció de número de setmana
  ISO-8601. Es refresca al canvi de dia, no cada segon.
- **RF-32 (Temps)** — Consumeix l'API **Open-Meteo** (`https://api.open-meteo.com`), que
  no requereix clau ni registre i té CORS obert.
  - Resposta cachejada a `localStorage` amb marca de temps; no es torna a demanar fins
    que expira `refreshMinutes` (default: 30).
  - Si la petició falla, es mostra l'últim valor cachejat amb indicador de
    "desactualitzat"; mai bloqueja ni trenca la pàgina.
  - Amb `enabled: false` **no s'emet cap petició**.
  - Al panell de configuració, un cercador de ciutats fa servir l'API de geocoding
    d'Open-Meteo per omplir latitud/longitud, només mentre l'usuari escriu activament.
- **RF-33 (Salutació)** — Text segons franja horària, amb plantilles personalitzables.

### 5.6 Fons i wallpapers

- **RF-35** — Formats admesos per a `backdrop.source` i `Tab.banner`: `png`, `jpg`,
  `webp`, `avif`, `svg` i **animats: `gif`, `apng` i `webp` animat**.
- **RF-36** — Amb `prefers-reduced-motion: reduce`, si hi ha `staticFallback` es fa
  servir aquest; si no n'hi ha, l'animat es continua mostrant però el panell de
  configuració avisa que falta el fotograma estàtic.
- **RF-37** — El panell de configuració avisa si una imatge supera **2 MB**, ja que un
  GIF gran arruïna l'objectiu O1 de càrrega instantània. És un avís, no un bloqueig.
- **RF-38** — Els wallpapers viuen a `public/wallpapers/` i **no compten dins del
  pressupost de bundle** de RNF-01, però sí que s'han de carregar de manera que no
  bloquegin el primer pintat (`decoding="async"`, capa de fons independent).
- **RF-39** — Si la imatge no carrega, es cau al fons sòlid del tema sense forats visuals.

#### Esmena — dos orígens de wallpaper (fase 4)

El panell de configuració integrada (fase 4) introdueix la possibilitat que l'usuari
triï una imatge pròpia des del navegador, sense servidor. Emmagatzemar-la com a data
URI dins de `localStorage` no és viable: `localStorage` té una quota d'uns 5 MB, base64
infla les dades un 33%, i un GIF de fins a 2 MB (RF-37) rebentaria la quota i s'enduria
la configuració sencera per davant — un mode de fallada silenciós i destructiu.

**Solució: dos orígens de wallpaper, distingits per prefix del valor de `source`.**

| Valor de `source` | Origen | Emmagatzematge |
| --- | --- | --- |
| `wallpapers/reus.jpg` | Fitxer desplegat amb el projecte | Cap; se serveix estàticament |
| `idb:a7f3c2` | Imatge que l'usuari ha triat des del panell | IndexedDB, com a `Blob` |

IndexedDB emmagatzema binari natiu, no té el sostre dels 5 MB i no comparteix quota amb
la configuració. Al render, el `Blob` es converteix amb `URL.createObjectURL()` i
**es revoca amb `URL.revokeObjectURL()`** en desmuntar o canviar de wallpaper; sense
això hi ha fuita de memòria cada cop que es canvia de wallpaper. `backdrop.staticFallback`
pot fer servir el mateix esquema de prefixos (un `idb:{id}` també és vàlid).

Nota d'implementació: com que no hi ha servidor, la llista de wallpapers desplegats a
`public/wallpapers/` no es pot obtenir llistant el directori en temps d'execució.
S'ha triat mantenir un `public/wallpapers/index.json` generat i versionat amb el
projecte (un `string[]` amb els noms de fitxer) — és l'opció escollida entre les dues
proposades a la fase 4 (l'alternativa descartada era un simple camp de text lliure per
a la ruta).

### 5.7 Configuració integrada

- **RF-40** — Panell accessible amb `,` o des d'un botó discret.
- **RF-41** — Seccions: Aparença, Cerca, Tabs i enllaços, Widgets, Dades.
- **RF-42** — Editor de tabs i enllaços amb afegir, editar, eliminar i reordenar
  (ratolí **i** teclat). Cada enllaç mostra el mnemònic resultant en viu mentre s'edita
  el nom, i marca en vermell els conflictes de reclamació explícita.
- **RF-43** — Secció "Dades": exportar la configuració a un fitxer `.json`, importar-la,
  i restablir als defaults amb confirmació.
- **RF-44** — Els canvis s'apliquen immediatament (previsualització en viu) i es
  persisteixen amb *debounce* de 300 ms.
- **RF-45** — Importació d'un fitxer HTML de marcadors exportat des del navegador
  (format Netscape Bookmark File), mapejant carpetes a grups. *Prioritat baixa; fase 6.*

### 5.8 Temes

- **RF-50** — Quatre paletes definides com a conjunts de custom properties CSS a
  `src/styles/flavours.css`, seleccionades amb `[data-flavour="dsp-abyss"]` sobre
  `<html>`:

  | Identificador | Rol | Valors a la fase 1 |
  | --- | --- | --- |
  | `dsp-dawn` | Clara (default clar) | Catppuccin Latte |
  | `dsp-dusk` | Fosca suau | Catppuccin Frappé |
  | `dsp-night` | Fosca mitjana | Catppuccin Macchiato |
  | `dsp-abyss` | Fosca profunda (default fosc) | Catppuccin Mocha |

- **RF-50b (estratègia en dues etapes)** — La paleta es desenvolupa en dos moments
  diferenciats i aquesta separació és deliberada:

  1. **Fase 1 fins a fase 4:** `flavours.css` conté **els valors de Catppuccin tal
     qual**, sense modificar. Permet avançar amb una paleta ja provada, coherent i amb
     contrast verificat, sense perdre temps en teoria del color mentre encara canvia
     l'arquitectura.
  2. **Abans de publicar (fase 5):** els valors s'adapten perquè la paleta sigui pròpia
     (vegeu §10.2). **Cap identificador, nom de token ni selector CSS canvia**: només
     canvien els valors hex dins de `flavours.css`.

  Per això els identificadors són `dsp-*` des del primer commit i mai `latte`, `mocha`
  ni cap altre nom upstream. L'adaptació ha de ser un canvi d'un sol fitxer, no un
  refactor que toqui components.

- **RF-50c** — El fitxer `flavours.css` ha de portar a dalt un comentari que indiqui
  l'origen dels valors, la llicència MIT de Catppuccin i que aquests valors són
  provisionals fins a la fase 5. Els tokens de paleta han de tenir noms **semàntics**
  propis (`--surface-raised`, `--text-muted`, `--accent`) amb una capa de mapatge cap
  als noms de la paleta, de manera que substituir els valors no obligui a tocar cap
  component.

- **RF-51** — **No hi ha mode manual clar/fosc.** El tema sempre segueix
  `matchMedia('(prefers-color-scheme: dark)')` i reacciona als canvis en viu. Si la
  consulta no es pot resoldre, s'aplica `fallbackFlavour`, que ha de ser una paleta
  fosca (default: `dsp-abyss`). L'usuari només tria quina paleta correspon a cada mode.
- **RF-52** — Color d'accent seleccionable entre els tokens de la paleta.
- **RF-53** — Fons configurable segons §5.6.
- **RF-54** — Respectar `prefers-reduced-motion`: totes les transicions es redueixen a
  canvis instantanis.

---

## 6. Requisits no funcionals

- **RNF-01 (Pes)** — Pressupost: **< 60 KB de JS comprimit amb gzip** i < 20 KB de CSS.
  Els wallpapers en queden exclosos. Si es supera, cal justificar-ho.
- **RNF-02 (Xarxa)** — Zero peticions a domini extern en la càrrega inicial. L'única
  petició externa possible en tota la vida de l'app és Open-Meteo.
- **RNF-03 (Offline)** — La pàgina ha de funcionar sense connexió (excepte el temps).
  Service worker opcional a la fase 5, amb estratègia *cache-first* per als actius i
  purga per versió.
- **RNF-04 (Privadesa)** — Cap analítica, cap cookie, cap identificador. Totes les dades
  a `localStorage` del navegador.
- **RNF-05 (Accessibilitat)** — Contrast AA sobre les quatre paletes, focus visible en
  tots els elements interactius, `aria-label` en botons d'icona, modals amb *focus trap*
  i retorn del focus en tancar. Els mnemònics són un accelerador, **no** l'únic camí:
  tot ha de ser assolible amb `Tab` i fletxes.
- **RNF-06 (Navegadors)** — Dues darreres versions de Firefox i Chromium.
- **RNF-07 (Robustesa)** — Un `localStorage` corrupte, ple o inaccessible (mode privat
  amb quota zero) **no pot impedir que la pàgina es renderitzi**. Tot accés va dins de
  `try/catch` amb fallback a memòria.
- **RNF-08 (Distribucions de teclat)** — L'assignació de mnemònics ha de fer servir
  `KeyboardEvent.key` (el caràcter produït), no `code`, perquè funcioni igual amb
  distribucions ES, CAT i US.

---

## 7. Estructura de fitxers proposada

```
homebase/
├── public/
│   ├── config.json              # configuració inicial opcional del desplegament
│   ├── wallpapers/              # imatges pròpies dels tabs (estàtiques i animades)
│   │   └── README.md            # origen i llicència de cada imatge
│   ├── fonts/                   # woff2 autoallotjades
│   └── favicon.svg
├── src/
│   ├── main.ts
│   ├── App.svelte
│   ├── lib/
│   │   ├── components/
│   │   │   ├── layout/          # Header, Footer, WidgetSlot, TabBar, LinkGrid, LinkCard
│   │   │   ├── search/          # SearchDialog, SearchResults
│   │   │   ├── widgets/         # Clock, DateWidget, Weather, Greeting
│   │   │   ├── settings/        # SettingsPanel i seccions
│   │   │   └── ui/              # Modal, Button, Field, Toggle
│   │   ├── state/
│   │   │   ├── config.svelte.ts
│   │   │   ├── ui.svelte.ts
│   │   │   └── weather.svelte.ts
│   │   ├── config/
│   │   │   ├── defaults.ts
│   │   │   ├── parse.ts
│   │   │   ├── storage.ts
│   │   │   └── migrations/
│   │   ├── mnemonics/
│   │   │   ├── assign.ts        # algorisme determinista
│   │   │   └── parseName.ts     # gestió de '&' i '&&'
│   │   ├── search/
│   │   │   ├── bangs.ts
│   │   │   ├── urlDetect.ts
│   │   │   └── fuzzy.ts
│   │   ├── keyboard/
│   │   │   └── shortcuts.ts
│   │   └── utils/
│   ├── styles/
│   │   ├── reset.css
│   │   ├── tokens.css
│   │   └── flavours.css
│   └── types/
│       └── config.ts
├── tests/
│   ├── unit/
│   └── e2e/
├── index.html
├── vite.config.ts
├── LICENSE                      # MIT
├── NOTICE                       # atribucions de tercers
├── README.md                    # anglès (per defecte)
├── README.ca.md                 # català
└── README.es.md                 # castellà
```

**Convencions de codi:** tot el codi, noms de variables, funcions, comentaris i
missatges de commit en **anglès**, seguint les convencions idiomàtiques de
TypeScript/Svelte.

**Documentació:** tres README complets i equivalents (no resums), en anglès, català i
castellà. El `README.md` en anglès és el principal i porta a dalt de tot una línia de
selecció d'idioma amb enllaços als altres dos; els altres dos porten la mateixa línia.
Els tres han de contenir: descripció, captures, instal·lació, configuració, taula
completa d'atalls, explicació dels mnemònics amb la sintaxi `&`, desplegament,
llicència i **secció d'agraïments i inspiració** (§10.2). Qualsevol canvi que afecti la
documentació s'ha d'aplicar als tres.

---

## 8. Fases d'implementació

Cada fase ha de deixar l'aplicació en estat funcional i desplegable.

### Fase 0 — Bastida
Projecte Vite + Svelte 5 + TS, ESLint, Prettier, `svelte-check`, Vitest, Playwright.
Reset CSS i tokens. `base: './'` verificat servint el build des d'un subdirectori.

**Criteri d'acceptació:** `npm run build` genera `dist/` que funciona servit des de
`/qualsevol/ruta/`.

### Fase 1 — Nucli
Model de configuració, defaults, càrrega de `config.json`, persistència a
`localStorage`, les quatre paletes amb selecció automàtica i fallback fosc, barra de
tabs, graella d'enllaços, i **algorisme de mnemònics complet amb els seus tests**.

Contingut inicial: **un sol tab** amb les principals xarxes socials (vegeu Annex A).

**Criteri d'acceptació:**
- Amb `localStorage` buit la pàgina renderitza el tab de xarxes socials.
- Prémer la lletra mnemònica de cada enllaç hi navega.
- Els tests d'assignació de mnemònics passen, inclosos els casos de col·lisió.
- Forçant `prefers-color-scheme: dark` i `light` la paleta canvia sense recarregar.

### Fase 2 — Cerca
Diàleg de cerca, bangs, detecció d'URL, suggeriments locals difusos, modal d'ajuda `?`.

**Criteri d'acceptació:** test E2E que va de la càrrega inicial a obrir un enllaç i a
fer una cerca sense tocar el ratolí ni una sola vegada.

### Fase 3 — Widgets
Sistema d'espais, rellotges multi-zona, **widget de data**, salutació, temps amb
Open-Meteo, cache i degradació elegant.

**Criteri d'acceptació:** amb la xarxa tallada la pàgina carrega igual de ràpid, el
widget de temps mostra l'estat cachejat o un buit discret, i moure un widget d'espai a
la configuració es reflecteix immediatament.

### Fase 4 — Configuració integrada
Panell complet, editor de tabs/enllaços amb previsualització de mnemònics i detecció de
conflictes, reordenació de widgets per ratolí i teclat, gestió de wallpapers (inclosos
animats amb `staticFallback`), import, export, reset.

**Criteri d'acceptació:** es pot construir una configuració sencera des de zero sense
tocar cap fitxer; exportar i reimportar la reprodueix idènticament.

### Fase 5 — Poliment i publicació
Service worker offline, revisió d'accessibilitat, `prefers-reduced-motion`, animacions,
pressupost de bundle verificat, els **tres README** amb captures, workflow de GitHub
Actions amb desplegament a GitHub Pages.

**Llista de comprovació bloquejant abans del primer push públic** — cap d'aquests punts
és opcional, i el repositori no es fa públic fins que tots estiguin fets:

- [ ] Valors de `flavours.css` adaptats segons §10.2, amb el contrast AA reverificat a
      les quatre paletes.
- [ ] `NOTICE` amb l'avís de copyright i el text MIT de Catppuccin.
- [ ] Secció d'agraïments als tres README, esmentant explícitament Catppuccin,
      `pivoshenko/catppuccin-startpage` i `b-coimbra/dawn`.
- [ ] `LICENSE` propi (MIT) amb l'any i l'autor correctes.
- [ ] `public/wallpapers/README.md` amb l'origen i la llicència de cada imatge.
- [ ] Cap dada personal als defaults ni a l'històric de commits.
- [ ] Comentari provisional de `flavours.css` (RF-50c) actualitzat o eliminat.

**Criteri d'acceptació:** la llista de dalt completa i el desplegament a Pages verd.

### Fase 6 — Opcionals
Importació de marcadors del navegador, cerca a través dels tabs no actius, tema
personalitzat token a token, mnemònics de dues lletres per a tabs molt saturats.

---

## 9. Desplegament i repositori

- **Visibilitat:** repositori **públic a GitHub**, llicència **MIT**.
- **Sortida:** `dist/` estàtic. Copiar i servir. Cap altra passa.
- **GitHub Pages:** incloure `.nojekyll` a `public/`. Workflow d'Actions que faci lint,
  `svelte-check`, tests, build i desplegament a Pages en cada push a `main`.
- **nginx / Caddy:** cap regla especial; no hi ha rutes client.
- **Docker (opcional):** imatge multi-etapa amb `node:22-alpine` per al build i
  `nginxinc/nginx-unprivileged:alpine` per servir. Cap `USER root`, port 8080.
- **Higiene de repo públic:** cap dada personal als defaults ni a `config.json`
  d'exemple més enllà del que hi hagi a l'Annex A; les configuracions reals viuen al
  `localStorage` del navegador o en un `config.json` que no es commiteja.

---

## 10. Riscos i decisions

### 10.1 Riscos oberts

| Risc | Mitigació |
| --- | --- |
| Deriva d'abast: la startpage acaba sent un dashboard | El PRD fixa els no-objectius; RSS i monitoratge queden fora de v1 |
| Pèrdua de configuració per neteja de `localStorage` | Export manual a JSON + recordatori a la UI; `config.json` com a base recuperable |
| Open-Meteo canvia de condicions o cau | El widget és opcional i degrada; el contracte de l'API queda aïllat en un sol mòdul |
| Un GIF de fons gran arruïna el temps de càrrega | Avís a partir de 2 MB, càrrega no bloquejant, `staticFallback` recomanat |
| Un tab amb més de 26 enllaços esgota els mnemònics | Avís al panell; la cerca segueix cobrint tots els enllaços; fase 6 preveu mnemònics de dues lletres |
| Drets d'imatge dels wallpapers | **No copiar els banners del repo original.** Fer servir imatges pròpies o de domini públic; documentar-ne l'origen a `public/wallpapers/README.md` |

### 10.2 Paleta, inspiració i atribució

Aquest projecte està **fortament inspirat** en
[`pivoshenko/catppuccin-startpage`](https://github.com/pivoshenko/catppuccin-startpage)
i, a través seu, en [`b-coimbra/dawn`](https://github.com/b-coimbra/dawn). El codi és
nou i el model d'interacció és diferent, però el concepte, la disposició general i
l'estètica en provenen directament. Això s'ha de dir explícitament i de manera visible,
no enterrat en un peu de pàgina.

**Pla de paleta en dues etapes** (vegeu RF-50b):

| Etapa | Valors | Situació |
| --- | --- | --- |
| Fases 1–4 | Catppuccin Latte / Frappé / Macchiato / Mocha, sense modificar | Desenvolupament local, repositori encara privat |
| Fase 5 | Valors adaptats: rotació de to, ajust de saturació i lluminositat mantenint els ràtios de contrast | Requisit bloquejant abans de fer el repo públic |

Un aclariment que convé tenir present: **renombrar els identificadors a `dsp-*` elimina
la confusió de marca, però no canvia res dels colors**. Mentre els hex siguin els de
Catppuccin, la paleta és derivada, es digui com es digui la variable. Per això
l'adaptació de valors de la fase 5 és la part que realment fa la paleta pròpia, i el
renombrament només evita haver de tocar codi quan arribi aquell moment.

Fer servir la paleta és, en tot cas, **perfectament legítim**: Catppuccin es distribueix
sota MIT. El que no és opcional és complir-ne la llicència. Requisits d'atribució:

1. **`NOTICE`** a l'arrel amb l'avís de copyright i el text íntegre de la llicència MIT
   de Catppuccin, indicant quins fitxers en deriven.
2. **Secció "Acknowledgements / Agraïments / Agradecimientos"** als tres README, amb
   enllaç als tres projectes esmentats a dalt i una frase clara del tipus "la disposició
   i l'estètica d'aquest projecte estan inspirades en …".
3. **Comentari de capçalera a `flavours.css`** amb l'origen dels valors.
4. Res a la descripció del repositori, al nom ni als *topics* de GitHub no ha de suggerir
   que es tracta d'un projecte oficial de Catppuccin ni d'un port seu.

### 10.3 Decisions preses

| Tema | Decisió |
| --- | --- |
| Contingut inicial | Un sol tab amb xarxes socials (Annex A) |
| Ubicació del temps | Reus (Camp de Tarragona) |
| Mode clar/fosc | Sempre automàtic; fallback a paleta fosca (`dsp-abyss`) |
| Paleta | Valors de Catppuccin sense modificar a les fases 1–4; adaptats a la fase 5 abans de publicar. Identificadors `dsp-*` des del primer commit |
| Atribució | Inspiració en Catppuccin declarada als tres README i al `NOTICE`, com a requisit bloquejant de publicació |
| Visibilitat | Públic a GitHub, MIT (només després de completar la llista de la fase 5) |
| Idiomes de la documentació | Anglès, català i castellà |
| Àmbit funcional | Sense monitoratge de serveis: conviu amb Homepage, que ja ho cobreix |

---

## 11. Definició de "fet" (v1)

- Les fases 0 a 5 completes amb els seus criteris d'acceptació verificats.
- `npm run lint`, `npm run check` i `npm test` passen en net.
- Bundle dins del pressupost de RNF-01.
- Els tres README complets i sincronitzats entre si, amb la secció d'agraïments.
- `LICENSE` i `NOTICE` presents i correctes.
- Llista de comprovació prèvia a la publicació (fase 5) completa, incloent-hi
  l'adaptació de valors de paleta i la reverificació de contrast AA.
- Desplegat a GitHub Pages i funcionant com a pàgina d'inici real durant una setmana
  sense trobar cap bloqueig.

---

## Annex A — Configuració inicial de la fase 1

Un sol tab. Els noms inclouen `&` només on cal desfer una col·lisió: `Twitch` es queda
la `t`, així que `Telegram` es marca explícitament, i `Instagram` i `Mastodon` no
xoquen amb ningú. Aquest conjunt serveix alhora de configuració real i de cas de prova
de l'algorisme.

```jsonc
{
  "schemaVersion": 1,
  "theme": {
    "lightFlavour": "dsp-dawn",
    "darkFlavour": "dsp-abyss",
    "fallbackFlavour": "dsp-abyss",
    "accent": "mauve",
    "fontScale": 1,
    "radius": 12,
    "backdrop": { "kind": "solid", "fit": "cover", "blur": 0, "opacity": 1 }
  },
  "search": {
    "defaultEngineId": "d",
    "detectUrls": true,
    "suggestFromLinks": true,
    "engines": [
      { "id": "d", "name": "DuckDuckGo", "template": "https://duckduckgo.com/?q={query}" },
      { "id": "g", "name": "Google", "template": "https://www.google.com/search?q={query}" },
      { "id": "w", "name": "Wikipedia (ca)", "template": "https://ca.wikipedia.org/w/index.php?search={query}" }
    ]
  },
  "widgets": [
    {
      "id": "clock-local",
      "type": "clock",
      "slot": "header-left",
      "order": 0,
      "enabled": true,
      "timezone": "Europe/Madrid",
      "hour12": false,
      "showSeconds": false,
      "locale": "ca-ES"
    },
    {
      "id": "date-local",
      "type": "date",
      "slot": "header-left",
      "order": 1,
      "enabled": true,
      "timezone": "Europe/Madrid",
      "locale": "ca-ES",
      "style": "full",
      "capitalise": true,
      "showWeekNumber": false
    },
    {
      "id": "weather-reus",
      "type": "weather",
      "slot": "header-right",
      "order": 0,
      "enabled": true,
      "label": "Reus",
      "latitude": 41.155,
      "longitude": 1.1075,
      "units": "metric",
      "refreshMinutes": 30
    },
    {
      "id": "greeting-main",
      "type": "greeting",
      "slot": "header-center",
      "order": 0,
      "enabled": true,
      "name": "d00m4n"
    }
  ],
  "tabs": [
    {
      "id": "social",
      "name": "Social",
      "icon": "world",
      "groups": [
        {
          "id": "networks",
          "name": "Xarxes",
          "links": [
            { "id": "mastodon",  "name": "Mastodon",   "url": "https://mastodon.social",  "icon": "brand-mastodon" },
            { "id": "bluesky",   "name": "Bluesky",    "url": "https://bsky.app",         "icon": "brand-bluesky" },
            { "id": "reddit",    "name": "Reddit",     "url": "https://www.reddit.com",   "icon": "brand-reddit" },
            { "id": "youtube",   "name": "YouTube",    "url": "https://www.youtube.com",  "icon": "brand-youtube" },
            { "id": "instagram", "name": "Instagram",  "url": "https://www.instagram.com","icon": "brand-instagram" },
            { "id": "linkedin",  "name": "LinkedIn",   "url": "https://www.linkedin.com", "icon": "brand-linkedin" },
            { "id": "twitch",    "name": "Twitch",     "url": "https://www.twitch.tv",    "icon": "brand-twitch" },
            { "id": "telegram",  "name": "T&elegram",  "url": "https://web.telegram.org", "icon": "brand-telegram" },
            { "id": "discord",   "name": "Discord",    "url": "https://discord.com/app",  "icon": "brand-discord" },
            { "id": "github",    "name": "Git&Hub",    "url": "https://github.com",       "icon": "brand-github" }
          ]
        }
      ]
    }
  ],
  "behaviour": {
    "startTab": "first",
    "confirmBeforeReset": true,
    "showMnemonics": true
  }
}
```

Mnemònics resultants esperats (útil com a *fixture* de test):

| Enllaç | Tecla | Motiu |
| --- | --- | --- |
| Telegram | `e` | reclamació explícita `T&elegram` |
| GitHub | `h` | reclamació explícita `Git&Hub` |
| Mastodon | `m` | primera lliure |
| Bluesky | `b` | primera lliure |
| Reddit | `r` | primera lliure |
| YouTube | `y` | primera lliure |
| Instagram | `i` | primera lliure |
| LinkedIn | `l` | primera lliure |
| Twitch | `t` | primera lliure |
| Discord | `d` | primera lliure |
