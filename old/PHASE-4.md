# Fase 4 — Brief d'implementació: configuració integrada
**Projecte:** `homebase`
**Document pare:** `PRD-startpage.md` v1.2 (§5.6, §5.7)
**Precedents:** `PHASE-1.md`, `PHASE-2.md`, `PHASE-3.md`
**Destinatari:** Claude Code
**Estat esperat en acabar:** es pot construir una configuració sencera des de zero sense
tocar cap fitxer, i exportar-la i reimportar-la la reprodueix idènticament.
---
## 1. Abast
- Panell de configuració amb cinc seccions.
- Editor de tabs, grups i enllaços, amb previsualització de mnemònics en viu.
- Col·locació de widgets entre espais, per ratolí **i** per teclat.
- Editor de motors de cerca.
- Gestió de wallpapers, inclosos animats.
- Cercador de ciutats per al widget del temps (ajornat de la fase 3).
- Exportació, importació i restabliment.
**Fora d'abast:** service worker, README i adaptació de paleta (fase 5). La importació de
marcadors del navegador (RF-45) queda per a la fase 6.
---
## 2. Esmena al PRD que aquesta fase requereix
El PRD diu que `backdrop.source` és una ruta relativa dins de `/wallpapers`. Això
funciona per a imatges desplegades amb el projecte, però la fase 4 introdueix la
possibilitat que l'usuari triï una imatge pròpia des del panell, i aquí hi ha un
problema real que cal resoldre abans d'escriure codi.
Sense servidor, una imatge triada per l'usuari només pot viure al navegador. Fer-ho com
a data URI dins de `localStorage` **no és viable**: `localStorage` té una quota
d'aproximadament 5 MB, base64 infla les dades un 33%, i el PRD ja preveu GIF de fins a
2 MB. El primer wallpaper animat que hi posis rebentarà la quota i s'endurà la
configuració sencera per davant. És un mode de fallada silenciós i destructiu.
**Solució: dos orígens de wallpaper, distingits per prefix.**
| Valor de `source` | Origen | Emmagatzematge |
| --- | --- | --- |
| `wallpapers/reus.jpg` | Fitxer desplegat amb el projecte | Cap; se serveix estàticament |
| `idb:a7f3c2` | Imatge que l'usuari ha triat des del panell | IndexedDB, com a `Blob` |
IndexedDB emmagatzema binari natiu, no té el sostre dels 5 MB i no comparteix quota amb
la configuració. Al render, el `Blob` es converteix amb `URL.createObjectURL()` i **es
revoca amb `URL.revokeObjectURL()`** en desmuntar; sense això hi ha fuita de memòria
cada cop que es canvia de wallpaper.
Actualitza `PRD-startpage.md` amb aquesta esmena com a part de la fase.
---
## 3. Passa 1 — Estructura del panell
`src/lib/components/settings/SettingsPanel.svelte`, construït sobre el component `Modal`
de la fase 2. És més gran que la cerca: ocupa gairebé tota la finestra, amb una navegació
lateral de seccions i el contingut a la dreta. Per sota de 720 px, la navegació passa a
dalt en horitzontal.
Seccions: **Aparença · Cerca · Tabs i enllaços · Widgets · Dades**.
Obertura amb `,` (ja registrat a `shortcuts.ts`) i tancament amb `Esc`. La guarda
`isModalOpen` de la fase 2 ja evita que els mnemònics es disparin a dins; verifica-ho, no
ho donis per fet.
---
## 4. Passa 2 — Model d'edició i desfer
RF-44 demana previsualització en viu: els canvis s'apliquen a la configuració real i es
persisteixen amb *debounce* de 300 ms. Això és bo per a l'aparença i dolent per a
l'edició destructiva: eliminar un tab de vint enllaços s'aplica immediatament i, sense
xarxa de seguretat, no hi ha manera de tornar enrere.
Implementació demanada:
- L'edició és **en viu**, tal com diu el PRD. No introdueixis un mode esborrany amb botó
  de desar.
- Manté una **pila de desfer** de la configuració sencera: un `AppConfig` és un JSON
  petit, copiar-lo és barat. Màxim 20 estats, en memòria, descartada en tancar la
  pestanya.
- `Ctrl+Z` desfà, `Ctrl+Shift+Z` refà, tots dos només amb el panell obert.
- Les mutacions consecutives del mateix camp dins de 500 ms s'agrupen en una sola
  entrada, perquè escriure un nom no generi vint estats.
- Les accions destructives (eliminar tab, grup o enllaç) sempre generen una entrada
  pròpia i mostren un avís efímer amb acció de desfer.
Aquesta pila **no** substitueix `homebase:config:backup`, que segueix sent la còpia
prèvia a migracions i importacions.
---
## 5. Passa 3 — Reordenació
RF-27 i RF-42: tota reordenació ha de funcionar amb ratolí **i** amb teclat. No és una
concessió d'accessibilitat opcional; és un requisit del projecte.
- **No facis servir l'API de *drag and drop* d'HTML5.** És incòmoda, no té equivalent de
  teclat i el seu comportament varia entre navegadors. Implementa-ho amb esdeveniments
  de punter (`pointerdown` / `pointermove` / `pointerup`) i captura de punter.
- Equivalent de teclat: amb l'element enfocat, `Alt` + fletxes el mou. Per als widgets,
  les fletxes verticals canvien l'ordre dins de l'espai i les horitzontals canvien
  d'espai.
- Regió `aria-live="polite"` que anunciï el resultat de cada moviment («Rellotge mogut a
  capçalera dreta, posició 2»). Sense això, moure per teclat és moure a cegues.
- `pointer-events` i `touch-action: none` només mentre s'arrossega.
- Respecta `prefers-reduced-motion`: sense animació de reordenació.
---
## 6. Passa 4 — Editor de tabs i enllaços
La secció més gran. Jerarquia: tabs → grups → enllaços, amb afegir, editar, eliminar i
reordenar a cada nivell.
### 6.1 Previsualització de mnemònics
Aquesta és la part que dóna valor a la secció. A cada enllaç, mentre s'edita el nom:
- Mostra la tecla resultant, recalculada amb `assignMnemonics` a cada pulsació.
- El nom es mostra amb la lletra assignada subratllada, igual que a la graella.
- **Conflicte de reclamació explícita** (dos `&` a la mateixa lletra): l'enllaç perdedor
  es marca en `--status-danger` amb el text que indica quin enllaç s'ha quedat la tecla.
- **Tab saturat** (`unassigned` no buit): avís a la capçalera del tab amb el recompte
  d'enllaços sense mnemònic.
- Ajuda contextual de la sintaxi `&`, amb els exemples de `PHASE-1.md` §6.1.
`assignMnemonics` és pura i barata; cridar-la a cada pulsació sobre un tab de vint
enllaços no és cap problema. No l'optimitzis preventivament.
### 6.2 Validació
- URL: la mateixa llista blanca de protocols de la fase 2 (§4.4). Un `javascript:`
  escrit al panell s'ha de rebutjar a la cara, amb missatge, no silenciosament.
- Nom buit: permès mentre s'escriu, marcat com a incomplet, mai desat com a `""` final
  sense avís.
- Els `id` es generen amb `crypto.randomUUID()` i no són editables.
---
## 7. Passa 5 — Widgets i cercador de ciutats
Per a cada widget: activar/desactivar, moure d'espai, i els seus camps propis. Afegir
instàncies noves des d'un menú per tipus (RF-26: múltiples instàncies del mateix tipus
han de ser possibles des de la interfície, no només editant JSON).
- **Zona horària:** selector poblat amb `Intl.supportedValuesOf('timeZone')`. Si el
  navegador no ho suporta, camp de text lliure validat provant d'instanciar
  `Intl.DateTimeFormat` dins d'un `try`.
- **Locale:** camp de text amb validació equivalent.
### 7.1 Cercador de ciutats (RF-32, ajornat de la fase 3)
```
https://geocoding-api.open-meteo.com/v1/search?name={query}&count=5&language=ca
```
Regles innegociables, perquè aquesta és l'única part de l'aplicació que envia text de
l'usuari a un tercer:
- Només dispara **mentre l'usuari escriu activament** en aquest camp concret.
- Mínim 3 caràcters, *debounce* de 400 ms, `AbortController` que cancel·la la petició
  anterior.
- Seleccionar un resultat omple `latitude`, `longitude` i `label`, i **a partir d'aquí no
  es fa cap més petició de geocodificació**.
- Si falla, camps manuals de latitud i longitud com a alternativa sempre visible.
- Amb el panell tancat, zero peticions.
---
## 8. Passa 6 — Wallpapers
Interfície per a la secció Aparença:
- Llista dels fitxers desplegats a `public/wallpapers/`. Com que no hi ha servidor no es
  pot llistar un directori: manté un `wallpapers/index.json` generat i versionat amb el
  projecte, o simplement un camp de text per a la ruta. Tria la primera i documenta-ho.
- Botó per triar un fitxer local → es desa a IndexedDB segons §2 i s'hi referencia amb
  `idb:{id}`.
- **Avís a partir de 2 MB** (RF-37), amb la mida real mostrada. És un avís, no un
  bloqueig.
- Per a formats animats (`gif`, `apng`, `webp` animat), camp `staticFallback` amb avís
  visible si és buit (RF-36).
- Controls de `fit`, `blur` i `opacity` amb previsualització immediata.
- Eliminar un wallpaper d'IndexedDB si cap configuració hi fa referència.
Detecció d'animació: n'hi ha prou amb comprovar l'extensió i el tipus MIME. No cal
analitzar els fotogrames del fitxer.
---
## 9. Passa 7 — Secció Dades
### 9.1 Exportació
- Fitxer `homebase-config-YYYY-MM-DD.json`, generat amb `Blob` i un `<a download>`.
- **Revoca l'object URL** després de la descàrrega.
- L'exportació conté **només la configuració**, no els binaris d'IndexedDB. Si la
  configuració referencia wallpapers `idb:`, l'avís ho ha de dir clarament: en importar
  en un altre navegador, aquests wallpapers no hi seran i es caurà al fons sòlid.
- JSON amb sagnat de 2 espais: està pensat per ser llegit i versionat.
### 9.2 Importació
Ordre estricte:
1. Llegir el fitxer.
2. Passar-lo per `parseConfig`.
3. **Mostrar el resultat abans d'aplicar res**: quants tabs, quants enllaços, i la llista
   completa d'errors de validació si n'hi ha.
4. Demanar confirmació explícita.
5. Desar la configuració actual a `homebase:config:backup`.
6. Aplicar.
Un fitxer que no és ni JSON ha de donar un missatge clar, no una excepció a la consola.
### 9.3 Restabliment
Amb `confirmBeforeReset`, confirmació que digui **què** es perdrà (recompte de tabs i
enllaços), no un «segur?» genèric. Còpia a `homebase:config:backup` abans.
### 9.4 Quota
Embolica el desat en `try/catch` i captura `QuotaExceededError` de manera específica. En
aquest cas: manté l'estat en memòria intacte, avisa que el canvi no s'ha pogut
persistir i suggereix exportar. **Perdre la configuració en memòria perquè no ha cabut
al disc seria el pitjor resultat possible d'aquesta fase.**
---
## 10. Criteris d'acceptació
- [ ] Es pot construir des de zero, sense tocar cap fitxer, una configuració amb 3 tabs,
      diversos grups i 20+ enllaços.
- [ ] Exportar i reimportar aquesta configuració la reprodueix **idènticament**
      (compara't els dos JSON amb `diff`).
- [ ] Els mnemònics es previsualitzen a cada pulsació i els conflictes es marquen.
- [ ] Un tab amb 30 enllaços mostra l'avís de saturació amb el recompte correcte.
- [ ] Cada widget es pot moure entre els sis espais **només amb el teclat**, i cada
      moviment s'anuncia per `aria-live`.
- [ ] Es poden crear tres rellotges des de la interfície.
- [ ] El cercador de ciutats no emet cap petició amb el panell tancat, ni amb menys de 3
      caràcters, ni després d'haver seleccionat un resultat.
- [ ] Un GIF de 3 MB es pot posar de fons, mostra l'avís de mida, i **la configuració
      segueix desant-se correctament** després (verifica que no ha anat a `localStorage`).
- [ ] Canviar de wallpaper diverses vegades no acumula object URLs (comprovable al
      *memory profiler*).
- [ ] Eliminar un tab i prémer `Ctrl+Z` el recupera sencer.
- [ ] Omplir `localStorage` fins a la quota i intentar desar mostra l'avís sense perdre
      l'estat en pantalla.
- [ ] Importar un fitxer que no és JSON dóna un missatge llegible.
- [ ] Una URL `javascript:` escrita al panell es rebutja amb missatge.
- [ ] `npm run lint`, `npm run check` i `npm test` en net.
- [ ] Cap dependència de runtime nova; cap `--p-` als components nous; cap text literal
      fora de `strings.ts`.
---
## 11. Punts on és fàcil equivocar-se
1. **Wallpapers a `localStorage`** — el problema del §2. Funciona amb un JPEG petit a
   desenvolupament i rebenta amb el primer GIF de debò, emportant-se la configuració.
2. **Object URLs sense revocar** — fuita de memòria que només es nota després d'una
   sessió llarga, que és precisament com s'usa una startpage.
3. **Edició en viu sense desfer** — un clic d'eliminar sobre un tab ple i no hi ha
   tornada enrere.
4. **API de *drag and drop* d'HTML5** — sense equivalent de teclat, incompleix RF-27.
5. **Reordenació sense anunci** — moure per teclat sense retroalimentació és moure a
   cegues.
6. **`QuotaExceededError` no capturat** — l'excepció puja i es perd l'estat de la
   sessió.
7. **Importar sense previsualitzar** — un JSON dolent substitueix una configuració bona
   sense que ningú hagi pogut aturar-ho.
8. **El cercador de ciutats disparant a cada pulsació** — és l'única fuita de text de
   l'usuari cap a fora de tot el projecte; ha de ser deliberada i mínima.