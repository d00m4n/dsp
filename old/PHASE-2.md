# Fase 2 — Brief d'implementació: cerca
**Projecte:** `homebase`
**Document pare:** `PRD-startpage.md` v1.2 (§5.3)
**Precedent:** `docs/PHASE-1.md`
**Destinatari:** Claude Code
**Estat esperat en acabar:** es pot arribar a qualsevol enllaç i llançar qualsevol cerca
sense tocar el ratolí ni una sola vegada.
---
## 1. Abast
- Diàleg de cerca modal (`/` i `Ctrl+K`).
- Motors de cerca amb *bangs* (`!g`, `!d`, `!w`).
- Detecció d'URL i navegació directa.
- Suggeriments locals difusos sobre **tots** els enllaços de **tots** els tabs.
- Modal d'ajuda de teclat (`?`).
- Component `Modal` reutilitzable, que la fase 4 heretarà per al panell de configuració.
**Fora d'abast:** widgets (fase 3), panell de configuració (fase 4), service worker i
README (fase 5). Els motors de cerca ja són a la configuració des de la fase 1: aquí es
consumeixen, no s'editen.
---
## 2. Precondició
La fase 1 ha d'estar acceptada. En concret, aquesta fase depèn de:
- `uiState` amb el tab actiu.
- El listener global de teclat de `src/lib/keyboard/shortcuts.ts`.
- `SearchConfig` ja validat per `parseConfig`.
---
## 3. Passa 1 — Component `Modal`
`src/lib/components/ui/Modal.svelte`, construït sobre l'element natiu **`<dialog>`** amb
`showModal()`. Fes-lo servir de debò, no un `div` amb `position: fixed`: el natiu ja
et dóna captura de focus, capa superior, `::backdrop` i tancament amb `Esc` sense codi.
Requisits:
- `showModal()` en obrir, `close()` en tancar.
- Intercepta l'esdeveniment `cancel` per encaminar el tancament pel teu estat en comptes
  de deixar que el navegador tanqui pel seu compte.
- **Retorn del focus** a l'element que tenia el focus abans d'obrir (RNF-05). El natiu no
  sempre ho fa bé entre navegadors; desa't la referència i restaura-la explícitament.
- `::backdrop` amb `--surface-sunken` i transparència; res de negre cru.
- Amb `prefers-reduced-motion: reduce`, sense animació d'entrada.
- Propietat `label` obligatòria → `aria-label` al `<dialog>`.
### 3.1 Guarda global
Afegeix a `uiState` un derivat `isModalOpen`. El listener de teclat global ha de sortir
immediatament quan sigui cert, **excepte** per a les tecles que el propi modal gestiona.
Sense això, escriure «reddit» a la cerca dispararia deu mnemònics.
Aquesta guarda i el filtre d'`input`/`textarea` de la fase 1 són coses diferents i
totes dues són necessàries.
---
## 4. Passa 2 — Anàlisi de l'entrada
Tres mòduls purs, sense DOM, cadascun amb els seus tests. Escriu-los abans de la
interfície.
### 4.1 `src/lib/search/bangs.ts`
```ts
export interface BangResult {
  /** Engine id claimed by a bang, or null. */
  engineId: string | null;
  /** Input with the bang token removed and trimmed. */
  query: string;
}
export function extractBang(input: string, engines: SearchEngine[]): BangResult;
```
Regles:
- Un *bang* és un token complet delimitat per espais: `!` seguit de l'id d'un motor.
- Es reconeix **només** com a primer o últim token de la cadena.
- Comparació sense distingir majúscules.
- Si el primer i l'últim token són tots dos *bangs* vàlids, **guanya el primer**.
- Si el token comença per `!` però l'id no correspon a cap motor, **es tracta com a text
  literal** i `engineId` és `null`. No triïs un motor «semblant»: buscar `!gh algo` a
  Google en comptes d'avisar és pitjor que no fer res.
- Amb `engineId` a `null`, qui crida farà servir `defaultEngineId`.
Taula de tests:
| Entrada | `engineId` | `query` |
| --- | --- | --- |
| `!g svelte runes` | `g` | `svelte runes` |
| `svelte runes !g` | `g` | `svelte runes` |
| `!g svelte !d` | `g` | `svelte !d` |
| `!zz svelte` | `null` | `!zz svelte` |
| `hola!g` | `null` | `hola!g` |
| `!g` | `g` | `` (buit) |
| `!` | `null` | `!` |
| `  !G  Svelte  ` | `g` | `Svelte` |
Amb `query` buit i motor triat, obre la pàgina d'inici del motor (arrel de la URL de la
plantilla), no una cerca buida.
### 4.2 `src/lib/search/urlDetect.ts`
```ts
export function detectUrl(input: string): string | null;
```
Retorna la URL a la qual navegar, o `null` si no ho sembla. Aquesta funció és una **font
inesgotable de falsos positius**; sigues conservador i deixa que la resta vagi a cerca.
Accepta:
1. Esquema explícit `http://` o `https://` que passi per `new URL()`.
2. Sense esquema: cap espai, almenys un punt, i un TLD final de 2 o més lletres
   (`[a-z]{2,}`) → afegeix-hi `https://`.
3. `localhost`, opcionalment amb port i camí.
4. IPv4, opcionalment amb port i camí.
Rebutja explícitament (van a cerca):
- Qualsevol cosa amb espais.
- `node.js`, `3.14`, `v1.2.3`, `fitxer.txt`, `README.md` — patrons amb punt però amb TLD
  que no ho és. Mantén una llista curta d'extensions comunes a excloure (`js`, `ts`,
  `md`, `txt`, `json`, `py`, `go`, `css`, `html`) i documenta que és heurística
  imperfecta. `example.io` és un domini i `main.go` no; sense una llista no hi ha manera
  de distingir-los.
- Esquemes que no siguin `http`/`https` (vegeu §4.4).
Taula de tests obligatòria, amb el resultat esperat per a cadascun dels casos de dalt
més: `github.com/d00m4n`, `https://reus.cat`, `localhost:5173`, `192.168.1.1:8006`,
`com`, `.com`, `a.b`, `hola món .com`.
### 4.3 `src/lib/search/fuzzy.ts`
```ts
export interface Match {
  linkId: string;
  tabId: string;
  score: number;
  /** Indices in the display name to highlight. */
  positions: number[];
}
export function fuzzyMatch(query: string, candidates: Candidate[]): Match[];
```
- Algorisme de **subseqüència** amb puntuació, escrit a mà. Sense llibreries.
- Es cerca sobre el nom mostrat i sobre l'amfitrió de la URL.
- Text normalitzat amb la mateixa `normaliseLetter` de la fase 1, perquè `alb` trobi
  `Àlbums`.
- Ordre de puntuació, de més a menys: prefix exacte del nom → prefix d'una paraula del
  nom → subseqüència al nom → coincidència a l'amfitrió.
- **Desempat determinista** per ordre de tab, després grup, després posició. Mai per
  ordre d'iteració d'un objecte.
- `positions` permet ressaltar els caràcters coincidents a la interfície.
- Query buida → array buit, no tots els enllaços.
Test d'estabilitat: la mateixa consulta deu vegades dóna deu ordenacions idèntiques.
### 4.4 Llista blanca de protocols
Abans de navegar enlloc, **sempre**:
```ts
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
```
Una URL de configuració amb `javascript:` seria execució de codi arbitrari en el moment
en què algú importés un JSON de tercers. Valida-ho tant a `parseConfig` (fase 1, afegeix
la comprovació ara si no hi és) com al moment de navegar. Els enllaços a `_blank` porten
sempre `rel="noopener noreferrer"`.
---
## 5. Passa 3 — `SearchDialog`
`src/lib/components/search/SearchDialog.svelte`.
### 5.1 Composició de la llista
Amb l'entrada actual, la llista de resultats és, en aquest ordre:
1. **Navegació directa**, si `detectUrl` retorna alguna cosa i `search.detectUrls` és
   cert. Sempre a dalt de tot.
2. **Enllaços coincidents**, de `fuzzyMatch`, màxim 8.
3. **Cerca web**, sempre l'última i sempre present, amb el motor resolt (per *bang* o
   pel defecte) mostrat a l'etiqueta.
La selecció inicial és el primer element de la llista. Amb l'entrada buida, l'única
opció és la cerca web desactivada; no mostris els enllaços sense filtrar.
### 5.2 Teclat dins del diàleg
| Tecla | Acció |
| --- | --- |
| Escriure | Filtra en viu |
| `↓` / `↑` | Mou la selecció, amb rebot als extrems |
| `Tab` / `Shift+Tab` | El mateix que les fletxes |
| `Enter` | Executa la selecció |
| `Shift+Enter` | Executa en pestanya nova |
| `Esc` | Tanca i restaura el focus |
Res de `preventDefault()` sobre tecles que no gestiones.
### 5.3 Accessibilitat
Patró *combobox* amb `listbox`: `role="combobox"` i `aria-expanded` a l'input,
`role="listbox"` a la llista, `role="option"` i `aria-selected` als elements, i
`aria-activedescendant` apuntant a l'opció seleccionada. Regió `aria-live="polite"` amb
el recompte de resultats, actualitzada amb *debounce* per no ser xerraire.
### 5.4 Rendiment
Amb els volums d'aquest projecte (desenes d'enllaços) no cal *debounce* del filtratge:
filtra a cada pulsació. Si algun dia hi ha centenars, ja es mesurarà. **No afegeixis
optimització preventiva.**
---
## 6. Passa 4 — Modal d'ajuda (`?`)
`src/lib/components/ui/ShortcutsHelp.svelte`.
Requisit important: la taula d'atalls **es genera des d'una única font de veritat**. Vol
dir exportar de `shortcuts.ts` una estructura de metadades:
```ts
export interface ShortcutMeta {
  keys: string[]; // ['Ctrl', 'K']
  descriptionKey: string;
  group: 'navigation' | 'search' | 'general';
}
```
...que serveixi alhora per registrar el comportament i per pintar l'ajuda. Si l'ajuda és
una taula escrita a mà, quedarà desactualitzada la primera vegada que canviï una tecla,
i és exactament la mena de detall que ningú revisa.
`?` s'obté amb `Shift` en distribucions ES i CAT: detecta'l per `event.key === '?'`, no
per combinació de tecles.
---
## 7. Criteris d'acceptació
- [ ] `/` i `Ctrl+K` obren la cerca; `Esc` la tanca i el focus torna on era.
- [ ] Amb el diàleg obert, escriure lletres **no** dispara mnemònics.
- [ ] Totes les taules de tests de §4.1 i §4.2 passen.
- [ ] Test d'estabilitat de `fuzzyMatch` passa.
- [ ] `!g`, `!d` i `!w` fan servir el motor correcte; un *bang* desconegut es tracta com
      a text.
- [ ] `github.com` navega directament; `node.js` fa una cerca.
- [ ] Una URL amb protocol `javascript:` a la configuració no navega mai i queda
      registrada com a error de validació.
- [ ] `?` obre l'ajuda i la taula surt de les metadades, no d'HTML escrit a mà.
- [ ] **Test E2E de Playwright, requisit central de la fase:** des de la càrrega
      inicial, sense un sol esdeveniment de ratolí — obrir la cerca amb `Ctrl+K`,
      escriure `mast`, seleccionar amb fletxes, obrir amb `Enter`; tornar, obrir amb `/`,
      escriure `!d svelte`, `Enter`; tornar, prémer `?` i tancar amb `Esc`.
- [ ] `npm run lint`, `npm run check` i `npm test` en net.
- [ ] Cap `--p-` als components nous; cap dependència de runtime nova.
---
## 8. Punts on és fàcil equivocar-se
1. **Els mnemònics disparant-se mentre s'escriu** — és el primer que passa si falta la
   guarda `isModalOpen`, i fa que la cerca sembli trencada de mala manera.
2. **`detectUrl` massa agressiu** — el dia que `main.go` t'intenti obrir un domini,
   deixaràs de fer servir la cerca.
3. **Ordenació de suggeriments no determinista** — resultats que ballen entre
   pulsacions són desconcertants tot i ser tècnicament correctes.
4. **Retorn del focus** — si en tancar el diàleg el focus va al `<body>`, la navegació
   per teclat es mor i cal fer `Tab` a cegues per recuperar-la.
5. **`javascript:` a una URL de configuració** — poc probable en ús propi, però la fase 4
   afegirà importació de JSON i llavors deixa de ser hipotètic.
6. **L'ajuda escrita a mà** — quedarà mentint abans de la fase 5.