# CLAUDE.md

Startpage personal. **Svelte 5 + TypeScript + Vite**, build estàtic, sense servidor i
sense dependències de runtime. Ha de funcionar en qualsevol hosting, inclòs un
subdirectori arbitrari.

Característica distintiva: **mnemònics**. Prémer una lletra obre l'enllaç corresponent.

## Comunicació

Amb l'usuari, **català**. Codi, comentaris i commits, **anglès**. Usuari d'exemple:
`d00m4n`.

## Documentació

| Fitxer | Quan llegir-lo |
| --- | --- |
| `docs/SPEC.md` | Font de veritat: tipus, configuració, tecles, decisions |
| `docs/PHASE-N.md` | Només la fase en curs |

Contradicció entre els dos → mana `SPEC.md`, i avisa'n.

## Estat

| Fase | Contingut | Estat |
| --- | --- | --- |
| 0 | Bastida | Pendent |
| 1 | Config, temes, tabs, mnemònics | Pendent |
| 2 | Cerca | Pendent |
| 3 | Widgets | Pendent |
| 4 | Panell de configuració | Pendent |
| 5 | Poliment i publicació | Pendent |

Repositori privat fins que la llista de `PHASE-5.md` estigui completa.
Actualitza aquesta taula en tancar cada fase.

## Generats — no editar a mà

`src/styles/flavours.css` i `src/types/palette.ts`, produïts des de la paleta oficial.
Es regeneren a la fase 5 amb `tools/palette.ts`.

## Regles

Cadascuna té un criteri d'acceptació que la verifica. Trencar-ne una trenca el projecte.

**Build**
1. `base: './'` a `vite.config.ts`. Verifica servint `dist/` des de `/sub/deep/`.
2. `dependencies` buit. Cap llibreria de dates: `Intl` ho cobreix tot.
3. Pressupost: < 60 KB JS gzip, < 20 KB CSS.

**Estils**
4. Cap `--p-*` als components; només tokens semàntics. Si en falta un, afegeix-lo a
   `flavours.css`. `grep -rn '\-\-p-' src/ --include='*.svelte'` ha de sortir buit.
5. `:focus-visible`, no `:focus`. `prefers-reduced-motion` des del primer dia.

**Robustesa**
6. `parseConfig` no llença mai. Camp invàlid → default + error registrat.
7. `localStorage` sempre dins de `try/catch` amb fallback a memòria.
   `QuotaExceededError` capturat sense perdre l'estat en pantalla.
8. Llista blanca de protocols (`http:`, `https:`, `mailto:`) abans de navegar i en
   validar.
9. Wallpapers de l'usuari a **IndexedDB** com a `Blob`, referenciats `idb:{id}`. Mai a
   `localStorage`. Revoca sempre els object URLs.

**Interacció**
10. `event.key`, mai `event.code`.
11. `assignMnemonics` pura i determinista. Itera arrays, no objectes.
12. Cap atall global pot ser una lletra. La cerca s'obre amb `/` i `Ctrl+K`.
13. Amb un modal obert, els mnemònics no es disparen.
14. Un sol temporitzador per a tota l'app, alineat al límit i aturat en segon pla.
15. `LinkCard` és un `<a href>` real, mai un `div` amb `onclick`.
16. Tota reordenació funciona amb ratolí **i** amb teclat. Res de drag-and-drop HTML5.

**Xarxa i privadesa**
17. Zero peticions a la càrrega. L'única possible és Open-Meteo, i cap si
    `weather.enabled` és fals.
18. Geocodificació només mentre l'usuari escriu, mínim 3 caràcters, amb debounce.
19. Cap analítica, cap cookie, cap identificador.

**Text**
20. Cap cadena literal dins d'un component. Totes a `src/lib/strings.ts`.

## Comandes

```bash
npm run dev / build / preview
npm run check / lint / format
npm test / test:e2e
npm run palette:build / palette:check   # fase 5
```

## Estructura

```
src/lib/  components/{layout,search,widgets,settings,ui}
          state/{config,ui,ticker,weather}  config/{defaults,parse,storage,migrations}
          mnemonics/  search/  keyboard/  weather/  strings.ts
src/styles/  src/types/
```

## Mètode

- Cap passa acabada sense executar el seu criteri de verificació.
- Mòduls purs (mnemònics, bangs, URL, fuzzy, setmana ISO) amb tests **abans** de la UI.
- No implementis res de fases futures. Els tipus de configuració sí que es declaren
  sencers des de la fase 1; els components, no.
- Cap optimització preventiva.
- Si trobes una contradicció o un error a l'especificació, **digues-ho** en comptes de
  resoldre'l pel teu compte.
