# Fase 0 + 1 — Brief d'implementació

**Projecte:** `homebase`
**Document pare:** `PRD-startpage.md` v1.2
**Destinatari:** Claude Code
**Estat esperat en acabar:** startpage funcional, desplegable, amb un tab de xarxes
socials navegable íntegrament amb el teclat.

---

## 0. Com llegir aquest document

El PRD defineix **què** i **per què**. Aquest document defineix **en quin ordre** i
**amb quins criteris de verificació**. Si hi ha contradicció entre els dos, mana el PRD
i cal avisar-ne.

Regla de treball: **cap passa es dóna per acabada sense el seu criteri de verificació
executat**. No avancis a la passa següent amb la comprovació pendent.

---

## 1. Abast

Entra dins d'aquesta fase:

- Bastida completa del projecte (Vite + Svelte 5 + TypeScript estricte).
- Model de configuració tipat, validació tolerant a errors i persistència.
- Les quatre paletes amb selecció automàtica clar/fosc i aplicació abans del primer
  pintat.
- Barra de tabs i graella d'enllaços.
- **Algorisme de mnemònics complet, amb la seva bateria de tests.**
- Un únic tab amb deu enllaços de xarxes socials.

**No entra dins d'aquesta fase, i no s'ha de començar ni "deixar preparat":**

| Element | Fase |
| --- | --- |
| Diàleg de cerca, bangs, suggeriments | 2 |
| Qualsevol widget (rellotge, data, temps, salutació) | 3 |
| Panell de configuració | 4 |
| Service worker, README, wallpapers | 5 |

La configuració **sí** que ha de declarar i validar els camps de widgets i cerca des
d'ara (el tipus complet del PRD §4), perquè el fitxer de configuració no canviï de
forma entre fases. Simplement no es renderitzen.

---

## 2. Fitxers ja lliurats

Aquests fitxers venen fets i s'han de col·locar tal qual. **No els regeneris ni els
reescriguis.**

| Fitxer | Destí | Nota |
| --- | --- | --- |
| `NOTICE` | arrel | Atribució legal. Cal afegir-hi el text MIT de Tabler quan s'instal·li el set d'icones |
| `src/styles/flavours.css` | tal qual | Generat des de `palette.json` v1.8.0 oficial. Els hex són correctes; no els toquis a mà |
| `src/types/palette.ts` | tal qual | `PALETTE_TOKENS`, `PaletteToken`, `ACCENT_TOKENS` |

`flavours.css` estableix un contracte important: **cap component pot referenciar una
variable `--p-*`**. Els components consumeixen només els tokens semàntics
(`--surface-page`, `--text-muted`, `--accent`…). Això és el que farà que l'adaptació de
paleta de la fase 5 sigui un canvi d'un sol fitxer. Si en algun moment necessites un
color que no té token semàntic, **afegeix el token** al bloc `:root` de `flavours.css`;
no facis servir el `--p-*` directament.

---

## 3. Passa 0 — Bastida

```bash
npm create vite@latest . -- --template svelte-ts
```

Configuració obligatòria:

- **`vite.config.ts`** amb `base: './'` (PRD §3.2). Sense això res funciona en
  subdirectori.
- **`tsconfig.json`** amb `strict: true`, `noUncheckedIndexedAccess: true`,
  `verbatimModuleSyntax: true`.
- **Dependències de runtime: cap.** Tot a `devDependencies`.
- Scripts a `package.json`: `dev`, `build`, `preview`, `check` (`svelte-check`),
  `lint` (ESLint flat config), `format` (Prettier), `test` (Vitest),
  `test:e2e` (Playwright).
- `public/.nojekyll` buit.
- `LICENSE` MIT, `Copyright (c) 2026 d00m4n`.
- `.gitignore` que exclogui `public/config.json` (les configuracions reals no es
  commitegen; només els defaults compilats van al repo).

**Verificació de la passa 0** — no és opcional i és la que més sovint es dóna per
suposada:

```bash
npm run build
cd dist && python3 -m http.server 8000 &
# obrir http://localhost:8000/  -> ha de funcionar
mkdir -p /tmp/sub/deep && cp -r dist/* /tmp/sub/deep/
cd /tmp && python3 -m http.server 8001 &
# obrir http://localhost:8001/sub/deep/  -> ha de funcionar IGUAL
```

Si la segona URL dóna 404 en algun actiu, `base` està mal configurat. Atura't i
arregla-ho abans de continuar.

---

## 4. Passa 1 — Tipus i configuració

### 4.1 `src/types/config.ts`

Transcriu el model del PRD §4 sencer, sense retallar-lo. Inclou-hi els tipus de widgets
i de cerca encara que la fase 1 no els faci servir.

`Flavour` ha de ser `'dsp-dawn' | 'dsp-dusk' | 'dsp-night' | 'dsp-abyss'` i
`PaletteToken` s'importa de `./palette`.

### 4.2 `src/lib/config/defaults.ts`

Els valors de l'Annex A del PRD, com a objecte `AppConfig` tipat i congelat.
Recorda: `darkFlavour` i `fallbackFlavour` són `dsp-abyss`.

### 4.3 `src/lib/config/parse.ts`

Validador escrit a mà, sense llibreries. Signatura:

```ts
export interface ParseResult {
  config: AppConfig;
  errors: ConfigError[];
}

export function parseConfig(input: unknown): ParseResult;
```

Comportament innegociable: **`parseConfig` no llença mai**. Cada camp invàlid es
substitueix pel default corresponent i s'afegeix una entrada a `errors` amb la ruta
(`tabs[0].links[3].url`) i el motiu. Un `input` que sigui `null`, una cadena, un array o
JSON escombraria ha de retornar els defaults sencers i una llista d'errors. La pàgina ha
de renderitzar sempre.

Validacions mínimes: `url` ha de passar per `new URL()` dins d'un `try`; els `id` han de
ser únics dins del seu àmbit i es regeneren si no ho són; `fontScale` es limita a
`[0.8, 1.4]`; `flavour` ha de ser un dels quatre valors; `slot` un dels sis.

### 4.4 `src/lib/config/storage.ts`

Accés a `localStorage` amb clau `homebase:config`. **Tot dins de `try/catch`**, amb
fallback a un `Map` en memòria quan `localStorage` no és accessible (mode privat amb
quota zero, o desactivat per política). Una excepció d'emmagatzematge no pot arribar mai
a la capa de renderitzat.

### 4.5 `src/lib/state/config.svelte.ts`

Estat reactiu amb runes. Resolució en tres capes segons PRD §4.1:
defaults → `fetch('config.json')` → `localStorage`.

La càrrega de `config.json` és **no bloquejant**: la pàgina pinta amb defaults +
`localStorage` immediatament i, si arriba un `config.json` vàlid i no hi ha res a
`localStorage`, s'aplica després. Un 404 és el cas normal, no un error: `console.warn` i
prou, sense soroll a la consola de l'usuari.

**Verificació:** tests unitaris de `parseConfig` amb entrades escombraria (`null`,
`42`, `"[]"`, `{}`, un objecte amb `tabs` que és un número, una URL invàlida, ids
duplicats). Cap ha de llençar; totes han de retornar un `AppConfig` utilitzable.

---

## 5. Passa 2 — Tema

### 5.1 Script d'arrencada a `index.html`

Inline al `<head>`, **abans** de qualsevol full d'estil, per evitar el flaix de tema
incorrecte:

```html
<script>
  (function () {
    var FALLBACK = 'dsp-abyss';
    var flavour = FALLBACK;
    try {
      var raw = localStorage.getItem('homebase:config');
      var theme = raw ? (JSON.parse(raw).theme || {}) : {};
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var dark = mq.media !== 'not all' ? mq.matches : true;
      flavour = (dark ? theme.darkFlavour : theme.lightFlavour) || FALLBACK;
    } catch (e) {
      /* corrupt storage or no matchMedia: keep the fallback */
    }
    document.documentElement.setAttribute('data-flavour', flavour);
  })();
</script>
```

Nota sobre `mq.media !== 'not all'`: és la manera de detectar que el navegador **no
entén** la consulta. En aquest cas es considera fosc, segons la decisió del PRD (fallback
sempre a paleta fosca).

### 5.2 Reactivitat en viu

Un `$effect` que escolti `matchMedia('(prefers-color-scheme: dark)')` amb
`addEventListener('change', …)` i actualitzi `data-flavour`. **No hi ha commutador
manual**; l'usuari només tria quina paleta correspon a cada mode.

L'accent s'aplica posant `style="--accent: var(--p-mauve)"` (o el token triat) sobre
`<html>`.

**Verificació:** amb les DevTools, forçar `prefers-color-scheme` a `light` i a `dark` ha
de canviar tota la interfície sense recarregar i sense cap salt visual. Amb
`localStorage` esborrat i recàrrega dura, no s'ha de veure cap fotograma en blanc ni cap
fotograma amb la paleta clara abans de la fosca.

---

## 6. Passa 3 — Mnemònics (nucli del projecte)

Aquesta és la peça amb més probabilitat de sortir subtilment malament. Implementa-la
**abans** que els components i amb els tests escrits en paral·lel.

### 6.1 `src/lib/mnemonics/parseName.ts`

```ts
export interface ParsedName {
  /** Text to render. Never contains a marker '&'. */
  display: string;
  /** Lowercase a–z letter claimed with '&', if any. */
  explicit: string | null;
  /** Index within `display` of the claimed character. */
  explicitIndex: number | null;
}

export function parseName(raw: string): ParsedName;
```

Regles:

| Entrada | `display` | `explicit` |
| --- | --- | --- |
| `Reddit` | `Reddit` | `null` |
| `&Reddit` | `Reddit` | `r` |
| `Git&Hub` | `GitHub` | `h` |
| `R&&D` | `R&D` | `null` |
| `T&elegram` | `Telegram` | `e` |
| `&` (final de cadena) | `` (buit) | `null` |
| `&1abc` | `1abc` | `null` (els dígits no són mnemònics) |
| `Àl&bums` | `Àlbums` | `b` |

Només la **primera** reclamació vàlida compta; un segon `&` al mateix nom es tracta com
a text normal.

### 6.2 Normalització

```ts
function normaliseLetter(ch: string): string | null {
  const n = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /^[a-z]$/.test(n) ? n : null;
}
```

Així `Àlbums` pot reclamar la `a` i `Ñ` la `n`. Dígits, espais i signes retornen `null`.

### 6.3 `src/lib/mnemonics/assign.ts`

```ts
export interface Mnemonic {
  key: string;
  /** Index in the display name to underline, or null if the letter is not in the name. */
  displayIndex: number | null;
}

export interface MnemonicConflict {
  linkId: string;
  requested: string;
  /** Id of the link that got the letter first. */
  takenBy: string;
}

export interface MnemonicMap {
  byLink: Map<string, Mnemonic>;
  byKey: Map<string, string>; // key -> linkId
  conflicts: MnemonicConflict[];
  /** Links left with no mnemonic because the alphabet ran out. */
  unassigned: string[];
}

export function assignMnemonics(tab: Tab): MnemonicMap;
```

Algorisme, en tres passades sobre l'ordre **grup → posició dins del grup**:

1. **Reclamacions explícites.** Si la lletra és lliure, s'assigna amb
   `displayIndex = explicitIndex`. Si ja està ocupada, s'anota a `conflicts` i l'enllaç
   baixa a la passada 2.
2. **Automàtica pel nom.** Primera lletra lliure del `display`, recorregut d'esquerra a
   dreta, amb `displayIndex` a la posició d'aquesta lletra.
3. **Residual per alfabet.** Primera lletra lliure de `a`…`z`, amb `displayIndex = null`.

Els que quedin sense lletra van a `unassigned`. **Mai** es llença una excepció.

L'algorisme ha de ser **pur i determinista**: la mateixa entrada dóna sempre exactament
la mateixa sortida, sense dependre de l'ordre d'iteració d'objectes ni de l'hora.

### 6.4 Tests obligatoris (`tests/unit/mnemonics.test.ts`)

El tab de l'Annex A serveix de *fixture* principal. Resultat esperat:

| Enllaç | Tecla | `displayIndex` | Passada |
| --- | --- | --- | --- |
| Telegram | `e` | 1 | explícita |
| GitHub | `h` | 3 | explícita |
| Mastodon | `m` | 0 | automàtica |
| Bluesky | `b` | 0 | automàtica |
| Reddit | `r` | 0 | automàtica |
| YouTube | `y` | 0 | automàtica |
| Instagram | `i` | 0 | automàtica |
| LinkedIn | `l` | 0 | automàtica |
| Twitch | `t` | 0 | automàtica |
| Discord | `d` | 0 | automàtica |

Casos addicionals que han de tenir test propi:

- Dos enllaços reclamant `&A`: el primer guanya, el segon apareix a `conflicts` i acaba
  amb una lletra assignada per una altra passada.
- Un enllaç anomenat `Twitter` i un altre `Twitch`: el segon ha d'agafar la `w`, no
  fallar.
- Nom buit, nom només amb dígits, nom només amb emoji → passada 3, `displayIndex` nul.
- Tab amb 30 enllaços → 26 assignats, 4 a `unassigned`, sense excepcions.
- Estabilitat: cridar `assignMnemonics` deu cops sobre el mateix tab dóna deu resultats
  idèntics.
- Accents: `Àlbums` reclama `a`; `Ñam` reclama `n`.

---

## 7. Passa 4 — Components

Ordre suggerit: `LinkCard` → `LinkGrid` → `TabBar` → `App`.

- **`LinkCard.svelte`** — icona, nom i subratllat del mnemònic a `displayIndex`. Quan
  `displayIndex` és `null`, la lletra es mostra en una insígnia petita al costat en
  comptes de subratllar-se. És un `<a href>` real: ha de funcionar amb clic mitjà,
  «obre en pestanya nova» del menú contextual i arrossegament a la barra de marcadors.
  Si mai el fas un `<div>` amb `onclick`, has trencat el component.
- **`LinkGrid.svelte`** — `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`,
  agrupació per `LinkGroup`.
- **`TabBar.svelte`** — a la fase 1 hi ha un sol tab, però el component ha d'estar
  preparat per a N i ja ha de gestionar les tecles `1`…`9`.
- **`App.svelte`** — regions de capçalera i peu amb els sis espais de widgets
  **buits i sense alçada** (PRD RF-28), llestos per a la fase 3.

Estils: només tokens semàntics. Focus visible a tot arreu. Respecta
`prefers-reduced-motion` des del primer dia; és molt més barat que afegir-lo després.

---

## 8. Passa 5 — Teclat

`src/lib/keyboard/shortcuts.ts`, un únic listener a `window` en fase de captura.

Ordre de comprovacions abans de fer res:

```ts
if (event.isComposing || event.keyCode === 229) return; // IME actiu
const target = event.target as HTMLElement | null;
if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
  return; // només Esc travessa aquest filtre
}
if (event.ctrlKey || event.metaKey || event.altKey) return; // fora dels combos definits
```

Després:

| Condició | Acció |
| --- | --- |
| `event.key` és una lletra (via `normaliseLetter`) | Obre l'enllaç del mnemònic al tab actiu |
| El mateix amb `event.shiftKey` | El mateix, a `_blank` amb `noopener,noreferrer` |
| `event.key` entre `1` i `9` | Salta al tab N si existeix |
| Fletxes | Mou el focus per la graella |
| `Enter` sobre element enfocat | Comportament natiu, no l'interceptis |

**Fes servir `event.key`, mai `event.code`** (PRD RNF-08). Amb `code`, la `z` d'un
teclat AZERTY obriria l'enllaç equivocat.

Si la lletra premuda no té mnemònic assignat, no facis res perceptible més enllà, com a
molt, d'una animació subtil. Ni so, ni missatge d'error, ni entrada a la consola.

**`preventDefault()` només quan realment s'ha gestionat la tecla.** Si el teclat es
menja les tecles del navegador, la startpage és pitjor que no tenir-ne.

---

## 9. Criteris d'acceptació de la fase

Marca'ls un per un; cap és opcional.

- [ ] `npm run build` genera `dist/` que funciona des de l'arrel **i** des de
      `/sub/deep/`.
- [ ] `npm run lint`, `npm run check` i `npm test` passen en net.
- [ ] Amb `localStorage` buit, la pàgina renderitza el tab de xarxes socials.
- [ ] Prémer `m`, `b`, `r`, `y`, `i`, `l`, `t`, `d`, `e` i `h` obre l'enllaç correcte.
- [ ] `Shift` + qualsevol d'aquestes obre en pestanya nova.
- [ ] Tots els tests de mnemònics de §6.4 passen, inclosos els casos límit.
- [ ] Forçant `prefers-color-scheme` a `light` i `dark`, la paleta canvia en viu.
- [ ] Amb `localStorage` corromput a mà (`homebase:config = "{{{"`), la pàgina carrega
      igualment amb els defaults.
- [ ] Amb `localStorage` desactivat al navegador, la pàgina carrega igualment.
- [ ] Cap component conté la cadena `--p-` (`grep -r '\-\-p-' src/ --include='*.svelte'`
      ha de sortir buit).
- [ ] Cap dependència a `dependencies` del `package.json`.
- [ ] `NOTICE` i `LICENSE` al seu lloc.

---

## 10. Punts on és fàcil equivocar-se

Recollits perquè són els que costen més de detectar quan ja hi ha codi a sobre:

1. **`base: './'`** — es descobreix tard, quan ja s'ha desplegat.
2. **El flaix de tema** — si l'script d'arrencada va després del CSS, es veu un
   fotograma clar abans del fosc.
3. **`event.code` en comptes de `event.key`** — funciona perfectament al teu teclat i
   falla al de qualsevol altre.
4. **Mnemònics no deterministes** — si l'ordre depèn d'iterar un objecte en comptes d'un
   array, les tecles ballen entre càrregues i és desconcertant d'usar.
5. **`displayIndex` mal calculat quan el nom porta `&`** — l'índex és sobre el text
   mostrat, no sobre el text cru.
6. **`LinkCard` com a `div`** — trenca el clic mitjà i l'arrossegament, i no és
   accessible.
7. **`parseConfig` llençant** — una startpage en blanc és el pitjor resultat possible
   del projecte.
