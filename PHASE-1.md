# Fase 0 + 1 — Bastida, configuració, temes, mnemònics

**Resultat:** startpage desplegable amb un tab de xarxes socials navegable amb teclat.

**Fora d'abast:** cerca (F2), widgets (F3), panell de configuració (F4). Els **tipus** de
widgets i cerca sí que es declaren i es validen des d'ara; simplement no es renderitzen.

## Ja lliurat — col·loca i no toquis

`NOTICE` (arrel) · `src/styles/flavours.css` · `src/types/palette.ts`.
Al `NOTICE` hi falta el text MIT de Tabler Icons; afegeix-l'hi en instal·lar el set.

## Passa 0 — Bastida

`npm create vite@latest . -- --template svelte-ts`

- `vite.config.ts` amb `base: './'`.
- `tsconfig`: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.
- Scripts: `dev build preview check lint format test test:e2e`.
- `public/.nojekyll`, `LICENSE` MIT `Copyright (c) 2026 d00m4n`.
- `.gitignore` amb `public/config.json` (només es versiona `config.example.json`).

**Verificació:** `npm run build`, servir `dist/` des de l'arrel **i** des de
`/sub/deep/`. Si algun actiu fa 404 al segon cas, `base` està malament. Atura't aquí.

## Passa 1 — Configuració

`types/config.ts` (SPEC §1 sencer) · `config/defaults.ts` (SPEC Annex A) ·
`config/parse.ts` · `config/storage.ts` · `state/config.svelte.ts`.

La càrrega de `config.json` és **no bloquejant**: es pinta amb defaults +
`localStorage` immediatament. Un 404 és el cas normal: `console.warn` i prou.

**Tests:** `parseConfig` amb `null`, `42`, `"[]"`, `{}`, `tabs` sent un número, URL
invàlida, ids duplicats, `javascript:` a una URL. Cap ha de llençar; totes han de
retornar un `AppConfig` utilitzable.

## Passa 2 — Tema

Script inline al `<head>`, **abans de qualsevol CSS**:

```html
<script>
  (function () {
    var FALLBACK = 'dsp-abyss', flavour = FALLBACK;
    try {
      var raw = localStorage.getItem('homebase:config');
      var theme = raw ? (JSON.parse(raw).theme || {}) : {};
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var dark = mq.media !== 'not all' ? mq.matches : true;
      flavour = (dark ? theme.darkFlavour : theme.lightFlavour) || FALLBACK;
    } catch (e) { /* corrupt storage or no matchMedia */ }
    document.documentElement.setAttribute('data-flavour', flavour);
  })();
</script>
```

`mq.media !== 'not all'` detecta que el navegador no entén la consulta → es considera
fosc. Un `$effect` escolta `change` i actualitza en viu. L'accent s'aplica amb
`style="--accent: var(--p-mauve)"` sobre `<html>` (únic lloc on `--p-*` és legítim).

## Passa 3 — Mnemònics

Regles a SPEC §3. Implementa'ls **abans** dels components.

`parseName(raw): { display, explicit, explicitIndex }`

| Entrada | display | explicit |
| --- | --- | --- |
| `Reddit` | `Reddit` | `null` |
| `&Reddit` | `Reddit` | `r` |
| `Git&Hub` | `GitHub` | `h` |
| `R&&D` | `R&D` | `null` |
| `&` | `` | `null` |
| `&1abc` | `1abc` | `null` |
| `Àl&bums` | `Àlbums` | `b` |

```ts
function normaliseLetter(ch: string): string | null {
  const n = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /^[a-z]$/.test(n) ? n : null;
}
```

`assignMnemonics(tab): { byLink, byKey, conflicts, unassigned }`, on cada assignació és
`{ key, displayIndex }`. `displayIndex` és sobre el **text mostrat**, no el cru.
A la passada 3 és `null` i la UI mostra la lletra en una insígnia en comptes de
subratllar-la.

**Tests obligatoris:** el *fixture* de SPEC Annex A amb els seus deu resultats, més:
dos `&` a la mateixa lletra (el primer guanya, el segon a `conflicts`) · `Twitter` i
`Twitch` (el segon agafa la `w`) · nom buit, només dígits, només emoji · tab de 30
enllaços (26 assignats, 4 a `unassigned`) · deu crides seguides amb resultat idèntic ·
`Àlbums` reclama `a`.

## Passa 4 — Components

`LinkCard` → `LinkGrid` → `TabBar` → `App`.

- `LinkCard`: `<a href>` real, amb el mnemònic subratllat a `displayIndex`.
- `LinkGrid`: `repeat(auto-fit, minmax(220px, 1fr))`.
- `TabBar`: un sol tab ara, però preparat per a N i amb les tecles `1`…`9`.
- `App`: capçalera i peu amb els sis espais **buits i sense alçada**, llestos per a F3.

## Passa 5 — Teclat

`keyboard/shortcuts.ts`, un únic listener en captura. Ordre de sortida anticipada:
`isComposing` → dins d'`input`/`textarea`/`contenteditable` → modificadors fora dels
combos definits. Després, contracte de SPEC §4.

Lletra sense mnemònic: res perceptible més enllà d'una animació subtil. Ni so, ni
missatge, ni consola.

## Acceptació

- [ ] `dist/` funciona des de l'arrel i des de `/sub/deep/`
- [ ] `lint`, `check` i `test` en net
- [ ] Amb `localStorage` buit, renderitza el tab de xarxes socials
- [ ] `m b r y i l t d e h` obren l'enllaç correcte; amb `Shift`, en pestanya nova
- [ ] Tots els tests de mnemònics passen
- [ ] Forçant `prefers-color-scheme`, la paleta canvia en viu, sense recàrrega
- [ ] Amb `homebase:config = "{{{"`, la pàgina carrega amb defaults
- [ ] Amb `localStorage` desactivat, la pàgina carrega
- [ ] `grep -rn '\-\-p-' src/ --include='*.svelte'` buit
- [ ] `dependencies` buit

## Paranys

1. `base: './'` — es descobreix tard, ja desplegat.
2. Script de tema després del CSS → flaix de paleta clara.
3. `event.code` → funciona al teu teclat i falla a la resta.
4. Mnemònics no deterministes → les tecles ballen entre càrregues.
5. `displayIndex` calculat sobre el text cru quan hi ha `&`.
6. `LinkCard` com a `div` → trenca clic mitjà, arrossegament i accessibilitat.
7. `parseConfig` llençant → pàgina en blanc, el pitjor resultat possible.
