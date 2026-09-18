# Fase 4 — Panell de configuració

**Resultat:** es pot construir una configuració sencera sense tocar cap fitxer, i
exportar-la i reimportar-la la reprodueix idènticament.

**Fora d'abast:** F5. La importació de marcadors del navegador queda per a F6.

## Esmena que aquesta fase introdueix

Una imatge triada per l'usuari no pot anar a `localStorage`: la quota és d'uns 5 MB,
**compartida amb la configuració**, base64 infla un 33% i s'admeten GIF de 2 MB. El
primer wallpaper animat rebenta la quota i s'endú la configuració. Fallada silenciosa i
destructiva que en dev, amb un JPEG petit, no es veu mai.

| `source` | Origen | Emmagatzematge |
| --- | --- | --- |
| `wallpapers/reus.jpg` | Desplegat amb el projecte | Cap |
| `idb:a7f3c2` | Triat per l'usuari | IndexedDB, com a `Blob` |

Al render, `URL.createObjectURL()`; **revoca'l en desmuntar** o hi ha fuita a cada canvi
de wallpaper.

## Passa 1 — Estructura

`SettingsPanel.svelte` sobre el `Modal` de F2, gairebé a pantalla completa, amb navegació
lateral de seccions (a dalt en horitzontal per sota de 720 px):
**Aparença · Cerca · Tabs i enllaços · Widgets · Dades**.

Obre amb `,`, tanca amb `Esc`. Verifica que la guarda `isModalOpen` hi funciona.

## Passa 2 — Edició i desfer

L'edició és **en viu** amb persistència a 300 ms de debounce; no introdueixis mode
esborrany. Però eliminar un tab de vint enllaços s'aplica a l'instant, així que cal xarxa
de seguretat:

- Pila de desfer de la configuració sencera (és JSON petit, copiar-lo és barat), màxim
  20 estats, en memòria.
- `Ctrl+Z` i `Ctrl+Shift+Z`, només amb el panell obert.
- Mutacions del mateix camp dins de 500 ms agrupades en una entrada.
- Accions destructives: entrada pròpia + avís efímer amb acció de desfer.

No substitueix `homebase:config:backup`, que segueix sent la còpia prèvia a migracions i
importacions.

## Passa 3 — Reordenació

Amb ratolí **i** amb teclat; és requisit, no concessió.

- **No facis servir l'API de drag-and-drop d'HTML5**: sense equivalent de teclat i amb
  comportament divergent entre navegadors. Usa esdeveniments de punter amb captura.
- Teclat: `Alt` + fletxes. Per als widgets, verticals canvien l'ordre dins de l'espai i
  horitzontals canvien d'espai.
- `aria-live="polite"` anunciant cada moviment («Rellotge mogut a capçalera dreta,
  posició 2»). Sense això, moure per teclat és moure a cegues.
- `touch-action: none` només mentre s'arrossega. Sense animació amb
  `prefers-reduced-motion`.

## Passa 4 — Tabs i enllaços

Jerarquia tabs → grups → enllaços, amb afegir, editar, eliminar i reordenar a cada nivell.

**Previsualització de mnemònics**, que és el que dóna valor a la secció: recalcula
`assignMnemonics` a cada pulsació, mostra la tecla resultant i el nom amb la lletra
subratllada, marca els conflictes en `--status-danger` indicant quin enllaç s'ha quedat
la tecla, i avisa a la capçalera del tab si `unassigned` no és buit. Ajuda contextual de
la sintaxi `&`.

`assignMnemonics` és pura i barata; cridar-la a cada pulsació no és cap problema.

Validació: llista blanca de protocols amb missatge visible · nom buit permès mentre
s'escriu però marcat · ids amb `crypto.randomUUID()`, no editables.

## Passa 5 — Widgets i ciutats

Activar, moure, editar camps, i **afegir instàncies noves per tipus** (tres rellotges han
de ser possibles des de la UI, no només editant JSON).

Zona horària: `Intl.supportedValuesOf('timeZone')`; si no hi és, text lliure validat
provant d'instanciar `Intl.DateTimeFormat` dins d'un `try`.

**Cercador de ciutats:**
`https://geocoding-api.open-meteo.com/v1/search?name={q}&count=5&language=ca`

És l'única part de l'app que envia text de l'usuari a un tercer, així que: només mentre
s'escriu en aquest camp · mínim 3 caràcters · debounce de 400 ms · `AbortController` que
cancel·la l'anterior · en seleccionar un resultat, cap petició més · camps manuals de
lat/lon sempre visibles com a alternativa · amb el panell tancat, zero peticions.

## Passa 6 — Wallpapers

Llista dels fitxers desplegats via `wallpapers/index.json` versionat (sense servidor no
es pot llistar un directori). Botó per triar un fitxer local → IndexedDB. Avís a partir
de 2 MB amb la mida real, que és avís i no bloqueig. Per a formats animats, camp
`staticFallback` amb avís si és buit. `fit`, `blur` i `opacity` amb previsualització.
Elimina d'IndexedDB els wallpapers que ja no referencia ninguna configuració.

Detecció d'animació per extensió i tipus MIME; no analitzis fotogrames.

## Passa 7 — Dades

**Exportació:** `homebase-config-YYYY-MM-DD.json`, `Blob` + `<a download>`, object URL
revocat, sagnat de 2 espais. Conté **només la configuració**, no els binaris. Si
referencia wallpapers `idb:`, avisa que en un altre navegador no hi seran.

**Importació**, en aquest ordre: llegir → `parseConfig` → **mostrar el resultat abans
d'aplicar res** (quants tabs, quants enllaços, errors de validació) → confirmació
explícita → còpia a `homebase:config:backup` → aplicar. Un fitxer que no és JSON dóna
missatge clar, no una excepció a la consola.

**Restabliment:** confirmació que digui **què** es perdrà, amb recomptes, no un «segur?».

**Quota:** captura `QuotaExceededError` específicament. Manté l'estat en memòria intacte,
avisa que no s'ha pogut persistir i suggereix exportar. Perdre l'estat en pantalla perquè
no ha cabut al disc seria el pitjor resultat d'aquesta fase.

## Acceptació

- [ ] Es construeix des de zero una config de 3 tabs i 20+ enllaços sense tocar fitxers
- [ ] Exportar i reimportar la reprodueix idènticament (`diff` dels dos JSON)
- [ ] Els mnemònics es previsualitzen a cada pulsació i els conflictes es marquen
- [ ] Un tab de 30 enllaços mostra l'avís de saturació amb el recompte correcte
- [ ] Cada widget es mou entre els sis espais **només amb teclat**, amb anunci
- [ ] Es creen tres rellotges des de la interfície
- [ ] El cercador de ciutats no dispara amb el panell tancat, ni amb menys de 3
      caràcters, ni després de seleccionar
- [ ] Un GIF de 3 MB es posa de fons, avisa de la mida, i **la config segueix desant-se**
- [ ] Canviar de wallpaper diverses vegades no acumula object URLs
- [ ] Eliminar un tab i `Ctrl+Z` el recupera sencer
- [ ] Amb la quota plena, avís sense perdre l'estat en pantalla
- [ ] Importar un fitxer no-JSON dóna missatge llegible
- [ ] Una URL `javascript:` escrita al panell es rebutja amb missatge

## Paranys

1. Wallpapers a `localStorage`: funciona en dev i rebenta amb el primer GIF real.
2. Object URLs sense revocar: fuita que només es nota en sessions llargues.
3. Edició en viu sense desfer: un clic i no hi ha tornada.
4. Drag-and-drop d'HTML5: sense equivalent de teclat.
5. Reordenació sense anunci: moure a cegues.
6. `QuotaExceededError` no capturat: es perd l'estat de la sessió.
7. Importar sense previsualitzar: un JSON dolent substitueix un de bo.
8. El cercador de ciutats disparant a cada pulsació.
