# Fase 2 — Cerca

**Resultat:** es pot arribar a qualsevol enllaç i llançar qualsevol cerca sense ratolí.

**Fora d'abast:** widgets (F3), panell (F4). Els motors de cerca ja són a la
configuració des de F1: aquí es consumeixen, no s'editen.

## Passa 1 — `Modal`

`components/ui/Modal.svelte` sobre l'element natiu **`<dialog>`** amb `showModal()`. No
un `div` fix: el natiu ja dóna captura de focus, capa superior, `::backdrop` i `Esc`.

- Intercepta l'esdeveniment `cancel` per encaminar el tancament pel teu estat.
- **Retorn del focus** explícit a l'element previ; no confiïs que el natiu ho faci bé.
- `::backdrop` amb `--surface-sunken`. `label` obligatori → `aria-label`.

Afegeix a `uiState` un derivat `isModalOpen`; el listener global surt quan és cert. És
**a més** del filtre d'`input` de F1, no en comptes de. Sense això, escriure «reddit»
dispara deu mnemònics.

## Passa 2 — Anàlisi de l'entrada

Tres mòduls purs, amb tests, abans de la UI.

### `search/bangs.ts` → `{ engineId, query }`

Token complet delimitat per espais, només primer o últim, sense distingir majúscules.
Si el primer i l'últim són vàlids, guanya el primer. Un `!xx` desconegut és **text
literal**, no un motor semblant.

| Entrada | engineId | query |
| --- | --- | --- |
| `!g svelte runes` | `g` | `svelte runes` |
| `svelte runes !g` | `g` | `svelte runes` |
| `!g svelte !d` | `g` | `svelte !d` |
| `!zz svelte` | `null` | `!zz svelte` |
| `hola!g` | `null` | `hola!g` |
| `!g` | `g` | `` |
| `!` | `null` | `!` |
| `  !G  Svelte  ` | `g` | `Svelte` |

Amb `query` buit i motor triat, obre l'arrel del motor, no una cerca buida.

### `search/urlDetect.ts` → `string | null`

Font inesgotable de falsos positius: sigues conservador.

Accepta: esquema `http(s)` que passi per `new URL()` · sense esquema amb cap espai, un
punt i TLD de 2+ lletres · `localhost` amb port i camí · IPv4 amb port i camí.

Rebutja: qualsevol cosa amb espais · extensions comunes (`js ts md txt json py go css
html`) — `example.io` és domini i `main.go` no, i sense llista no es distingeixen ·
esquemes fora de la llista blanca.

Tests: els casos de dalt més `github.com/d00m4n`, `https://reus.cat`, `localhost:5173`,
`192.168.1.1:8006`, `com`, `.com`, `a.b`, `node.js`, `3.14`, `v1.2.3`, `hola món .com`.

### `search/fuzzy.ts` → `Match[]`

Subseqüència amb puntuació, escrita a mà. Cerca sobre nom i amfitrió, normalitzada amb
la `normaliseLetter` de F1. Ordre: prefix exacte → prefix de paraula → subseqüència al
nom → amfitrió. **Desempat determinista** per tab, grup, posició. Query buida → buit.
`positions` per ressaltar. Test d'estabilitat: deu crides, deu ordenacions idèntiques.

### Llista blanca de protocols

`http:`, `https:`, `mailto:`, comprovada tant a `parseConfig` com en navegar. Els
`_blank` sempre amb `rel="noopener noreferrer"`.

## Passa 3 — `SearchDialog`

Llista de resultats, en aquest ordre: navegació directa (si n'hi ha) → fins a 8 enllaços
coincidents de **tots els tabs** → cerca web, sempre última i sempre present, amb el
motor resolt visible. Selecció inicial al primer element. Entrada buida → només la
cerca web, desactivada; no mostris els enllaços sense filtrar.

Teclat: escriure filtra · `↓↑` i `Tab`/`Shift+Tab` mouen amb rebot · `Enter` executa ·
`Shift+Enter` en pestanya nova · `Esc` tanca.

Accessibilitat: patró combobox + listbox amb `aria-expanded`, `role="option"`,
`aria-selected` i `aria-activedescendant`. Regió `aria-live="polite"` amb el recompte,
amb debounce.

Amb desenes d'enllaços, filtra a cada pulsació. Cap debounce, cap optimització.

## Passa 4 — Ajuda (`?`)

`ShortcutsHelp.svelte`. La taula **es genera des de les metadades** de `shortcuts.ts`
(`{ keys, descriptionKey, group }`), que serveixen alhora per registrar el comportament.
Una taula escrita a mà queda desactualitzada al primer canvi de tecla.

`?` es detecta per `event.key === '?'`, no per combinació.

## Acceptació

- [ ] `/` i `Ctrl+K` obren; `Esc` tanca i el focus torna on era
- [ ] Amb el diàleg obert, escriure **no** dispara mnemònics
- [ ] Les taules de bangs i d'URL passen senceres
- [ ] Test d'estabilitat de `fuzzyMatch` passa
- [ ] Bang desconegut es tracta com a text
- [ ] `github.com` navega; `node.js` cerca
- [ ] Una URL `javascript:` no navega mai i queda com a error de validació
- [ ] `?` obre l'ajuda generada des de metadades
- [ ] **E2E sense un sol esdeveniment de ratolí:** `Ctrl+K` → `mast` → fletxes →
      `Enter`; tornar; `/` → `!d svelte` → `Enter`; tornar; `?` → `Esc`
- [ ] `lint`, `check`, `test` en net; cap `--p-`; cap dependència nova

## Paranys

1. Mnemònics disparant-se mentre s'escriu (falta la guarda `isModalOpen`).
2. `detectUrl` massa agressiu: el dia que `main.go` obri un domini, deixaràs d'usar-ho.
3. Ordenació de suggeriments no determinista: resultats que ballen.
4. Focus que va al `<body>` en tancar: la navegació per teclat es mor.
5. `javascript:` a una URL de configuració — a F4 hi haurà importació de JSON.
6. Ajuda escrita a mà: mentirà abans de F5.
