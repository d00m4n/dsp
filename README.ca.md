English · **Català** · [Español](README.es.md)

# homebase

## Visió general

Una pàgina d'inici ràpida, pensada per fer-se servir amb el teclat i que
funciona sense connexió. Sense seguiment, sense secrets de compilació,
sense servidor necessari — obre `index.html` (o desplega la carpeta
`dist/` a qualsevol lloc) i funciona.

![Captura del tema clar](docs/screenshots/light.png)
![Captura del tema fosc](docs/screenshots/dark.png)

*(Vegeu [`docs/screenshots/`](docs/screenshots/) — si les imatges de dalt
encara no es mostren, aquesta còpia del repositori encara no té captures
reals; vegeu la nota d'aquesta carpeta.)*

## Característiques

- **Pestanyes, grups i enllaços.** Organitza els teus marcadors en
  pestanyes, i cada pestanya en grups amb nom de targetes d'enllaç.
  Completament editable des del panell de configuració integrat — no cal
  editar cap fitxer de configuració a mà, tot i que també és compatible
  (vegeu [Configuració](#configuració)).
- **Mnemònics.** Prem una sola lletra per anar directament a un enllaç,
  sense tocar el ratolí. Vegeu [Mnemònics](#mnemònics) més avall.
- **Cerca amb bangs.** Un únic quadre de cerca compara primer amb els teus
  propis enllaços i pestanyes (cerca difusa), i si no en troba cap, recorre
  a un motor de cerca configurable. Escriu un token `!bang` (per exemple
  `!ddg`, `!yt`) en qualsevol punt de la consulta per encaminar-la a un
  motor concret només per a aquesta cerca. Els URL escrits directament al
  quadre es detecten i s'obren directament, sense cercar-los.
  Els bangs són només un exemple — cada motor de cerca, i el bang que
  l'invoca, es configura per l'usuari.
- **Widgets.** Es poden col·locar, opcionalment, un rellotge, una data amb
  setmana ISO, una salutació i un panell del temps (via Open-Meteo, sense
  clau d'API) al costat dels teus enllaços.
- **Paleta amb temes.** Quatre variants integrades — una clara (`dsp-dawn`)
  i tres fosques (`dsp-dusk`, `dsp-night`, `dsp-abyss`) — generades a
  partir d'una especificació de color OKLCH original (`tools/palette.ts`),
  cadascuna verificada per complir els mínims de contrast WCAG en cada
  combinació de text i fons on s'utilitza.
- **Fons de pantalla personalitzats.** Puja la teva pròpia imatge de fons
  (desada localment a IndexedDB, mai enviada enlloc) o tria'n una de les
  incloses en un desplegament concret.
- **Suport sense connexió.** Un service worker escrit a mà precarrega
  l'aplicació i els fitxers de la compilació a la primera visita, de
  manera que la pàgina segueix funcionant sense xarxa. `config.json` i les
  navegacions es demanen sempre primer a la xarxa perquè els canvis d'un
  desplegament en directe mai quedin amagats darrere d'una memòria cau
  obsoleta; apareix un avís quan hi ha una nova versió descarregada i a
  punt per activar-se.
- **Disseny pensat per al teclat.** Tots els controls interactius es poden
  arribar i fer servir amb el teclat, amb indicadors de focus visibles a
  tot arreu. Vegeu la [taula completa d'atalls](#atalls-de-teclat) més
  avall.
- **Exportació, importació i restabliment.** Tota la teva configuració és
  un únic document JSON que pots exportar, tornar a importar (amb una
  vista prèvia validada abans d'aplicar-se) o restablir als valors per
  defecte en qualsevol moment.
- **Sense seguiment, empremta petita.** Sense analítica, sense scripts de
  tercers. Els paquets JavaScript i CSS de producció es comproven contra un
  pressupost de mida estricte (100 KiB / 20 KiB gzip) a cada compilació. Un
  conjunt curat d'icones [Tabler](https://tabler.io/icons) va empaquetat
  localment i funciona sense connexió; qualsevol altre nom d'icona vàlid de
  Tabler també funciona, obtingut sota demanda des de l'
  [API d'Iconify](https://api.iconify.design) la primera vegada que s'usa.

## Mnemònics

Els mnemònics són la característica distintiva de homebase: prem una
tecla de lletra (amb la graella enfocada, i sense cap diàleg obert) per
obrir l'enllaç corresponent a l'instant, o `Shift` + lletra per obrir-lo en
una pestanya nova.

El nom de cada enllaç pot incloure un marcador `&` per reclamar
explícitament la tecla a la qual ha de respondre. Si un nom no té `&`,
s'assigna una tecla automàticament a partir de les seves lletres. La
sintaxi:

| Escrius     | Es mostra com | Resultat                                          |
| ----------- | -------------- | -------------------------------------------------- |
| `Reddit`    | Reddit         | sense `&` — s'assigna una tecla automàticament     |
| `&Reddit`   | Reddit         | reclama `r`                                         |
| `Git&Hub`   | GitHub         | reclama `h`                                         |
| `R&&D`      | R&D            | `&&` és un caràcter `&` literal — no reclama tecla |
| `T&elegram` | Telegram       | reclama `e`                                         |
| `&1abc`     | 1abc           | els dígits no són tecles vàlides — no reclama tecla |
| `Àl&bums`   | Àlbums         | reclama `b` (els accents s'ignoren en comparar)    |

La primera lletra reclamada amb `&` en un nom sempre guanya; un `&` final
i penjat al final d'un nom es descarta silenciosament.

## Atalls de teclat

| Tecles | Acció |
| --- | --- |
| `a`–`z` | Obre l'enllaç mnemònic a la pestanya actual |
| `Shift` + `a`–`z` | Obre l'enllaç mnemònic en una pestanya nova |
| `1` … `9` | Salta a la pestanya N |
| `↑` `↓` `←` `→` | Mou el focus per la graella |
| `/` | Obre la cerca |
| `Ctrl` + `K` | Obre la cerca |
| `?` | Mostra aquesta ajuda |
| `,` | Obre la configuració |
| `Esc` | Tanca el diàleg obert |

*(Aquesta taula es genera a partir de l'array `SHORTCUTS` de
`src/lib/keyboard/shortcuts.ts`, la font de veritat única que també fa
servir el modal d'ajuda `?` de l'aplicació — si els atalls canvien, cal
regenerar aquesta taula a partir d'aquell fitxer.)*

## Instal·lació i desenvolupament

```sh
npm install
npm run dev          # inicia el servidor de desenvolupament de Vite
npm run build         # compilació de producció a dist/ (també executa la comprovació de pressupost)
npm run preview       # serveix la compilació de producció en local
npm test               # executa el conjunt de proves unitàries de vitest
npm run test:e2e      # executa el conjunt de proves de cap a cap de Playwright
npm run lint            # eslint
npm run check            # svelte-check (tipus)
npm run format             # prettier --write
npm run palette:build       # (re)genera src/styles/flavours.css a partir de tools/palette.ts
npm run palette:check        # verifica que flavours.css coincideix amb l'especificació, sense escriure
```

## Configuració

homebase no necessita cap configuració per funcionar — ve amb valors per
defecte raonables. Tot és editable des del panell de configuració
integrat, que s'obre amb la drecera de teclat `,` o amb el seu botó a la
pantalla.

- **Canvis locals.** Qualsevol canvi fet al panell de configuració es desa
  a `localStorage` del navegador i té efecte immediatament, sense cap
  servidor implicat.
- **Substitució remota amb `config.json`.** A la primera càrrega (només
  quan no hi ha cap canvi local existent), homebase demana `config.json` al
  mateix directori des d'on es serveix. Això permet que un desplegament
  ofereixi una configuració per defecte curada sense tocar cap codi —
  només cal deixar un fitxer `config.json` al costat de `index.html`. Un
  fitxer absent (404) és el cas normal, no un error, i simplement es recorre
  als valors per defecte integrats.
- **Exportació.** Tota la configuració — pestanyes, grups, enllaços,
  widgets, motors de cerca, aparença — es pot exportar a un únic fitxer
  JSON en qualsevol moment des de la secció Dades del panell de
  configuració. Els fons de pantalla desats localment a IndexedDB *no*
  s'inclouen a l'exportació.
- **Importació.** Es pot tornar a importar un fitxer JSON exportat prèviament
  (o escrit a mà); primer es valida i se'n mostra una vista prèvia abans
  d'aplicar res.
- **Restabliment.** Tota la configuració es pot restablir als valors per
  defecte integrats en qualsevol moment, amb un pas de confirmació previ.

## Desplegament

`vite.config.ts` fixa `base: './'`, de manera que l'aplicació compilada fa
servir camins relatius als recursos i funciona quan es serveix des de
qualsevol subdirectori — l'arrel d'un repositori, un camí de projecte de
GitHub Pages (`https://usuari.github.io/repo/`), o un subcamí darrere d'un
proxy invers — sense cap configuració addicional.

### GitHub Pages

Compila amb `npm run build` i publica el contingut de `dist/` (per
exemple amb l'acció de GitHub `actions/deploy-pages`, o enviant `dist/` a
una branca `gh-pages`). Gràcies a `base: './'`, no cal ajustar cap camp
`base` ni `homepage` per a un URL de pàgina de projecte.

### Servei estàtic amb nginx

`dist/` és un lloc estàtic — qualsevol servidor web que pugui servir
fitxers funciona. Un fragment mínim de `nginx.conf`:

```nginx
server {
    listen 80;
    server_name example.invalid;
    root /var/www/homebase/dist;
    index index.html;

    # El service worker demana config.json i index.html sempre primer a la
    # xarxa; assegura't que aquest servidor mai envia capçaleres de cau de
    # llarga durada per a aquests fitxers.
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

Un Dockerfile mínim i il·lustratiu (no inclòs al repositori — adapta'l
segons calgui):

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Desplegament en subdirectori

Gràcies a `base: './'`, no cal cap configuració especial per servir
homebase des d'un subdirectori (p. ex. `https://example.invalid/start/`) —
només cal copiar el contingut de `dist/` a aquell subdirectori. Només
`config.json` i qualsevol fitxer llistat a `wallpapers/index.json` han
d'estar al costat de `index.html`, en aquell mateix directori.

## Desregistrar el service worker / esborrar la memòria cau

homebase instal·la un petit service worker escrit a mà per al suport
sense connexió. Per eliminar-lo i esborrar tot el que ha desat a la
memòria cau:

1. Obre les eines de desenvolupament del navegador (`F12` o clic dret →
   *Inspecciona*).
2. Vés a la pestanya **Application** (Chrome/Edge) — a Firefox és el
   panell **Storage** de les eines de desenvolupament.
3. A **Service Workers**, busca l'entrada d'aquest lloc i clica
   **Unregister**.
4. A **Storage** (o **Clear storage**), clica **Clear site data** (o
   selecciona i esborra individualment les memòries cau del lloc) per
   eliminar l'aplicació i els recursos desats a la cau.
5. Recarrega la pàgina. Ara es carregarà completament des de la xarxa i,
   en compilacions de producció, registrarà un service worker nou.

## Agraïments

homebase és un projecte independent, no afiliat ni avalat per cap dels
projectes següents — però el seu concepte, disseny i direcció visual hi
estan directament inspirats, i aquest deute ha de ser visible:

- [pivoshenko/catppuccin-startpage](https://github.com/pivoshenko/catppuccin-startpage)
- [b-coimbra/dawn](https://github.com/b-coimbra/dawn)
- [catppuccin/palette](https://github.com/catppuccin/palette) — els valors
  de color a `src/styles/flavours.css` són una paleta original generada en
  OKLCH (vegeu `tools/palette.ts`), no els valors hexadecimals propis de
  Catppuccin, però l'*estructura* de la paleta (quatre variants, una clara,
  tres fosques, 24 tokens cadascuna) i la *nomenclatura* dels tokens
  (`mauve`, `rosewater`, `crust`, `overlay0`–`overlay2`, etc.) es van
  inspirar en el vocabulari de Catppuccin, i en són manllevades
  directament.

Vegeu [`NOTICE`](NOTICE) per a la llista completa d'atribucions de
tercers.

## Llicència

MIT — vegeu [`LICENSE`](LICENSE).
