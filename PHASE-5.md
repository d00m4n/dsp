# Fase 5 — Poliment i publicació

**Resultat:** repositori públic a GitHub, desplegat a Pages, amb paleta pròpia i
atribució completa. És **la porta de sortida**: res es fa públic fins que la llista del
§7 estigui completa.

**Ordre:** paleta → accessibilitat (pot obligar a retocar la paleta) → service worker →
pressupost → README amb captures → CI i Pages → llista de publicació.

## 1. Paleta pròpia

Fins ara `flavours.css` porta els valors de Catppuccin sense modificar. Aquí es
converteixen en originals.

**Script versionat**, `tools/palette.ts`, executable amb `npm run palette:build`. No
editis 104 hex a mà: no és reproduïble ni auditable, i el contrast no queda verificat.

Treballa en **OKLCH**, no HSL. OKLCH és perceptualment uniforme: rotar el to hi manté la
lluminositat percebuda, que és exactament el que cal perquè el contrast no es mogui.
`palette.json` ja porta els valors OKLCH.

```ts
interface PaletteSpec {
  hueRotation: number;     // graus
  chromaScale: number;     // multiplicador de saturació
  lightnessAdjust: number; // ajust fi per flavour
}
```

Punt de partida raonable: rotació de 15–30 graus, `chromaScale` proper a 1. Menys de 15
i encara sembla el mateix; molt més i les relacions entre colors es trenquen. Els neutres
(`base`, `mantle`, `crust`, `surface*`, `overlay*`, `text`, `subtext*`) tenen croma molt
baix: rotar-los no fa gaire, però escalar-los el croma els embruta.

**És una decisió estètica.** Genera dues o tres variants, mira-les i tria. No acceptis la
primera perquè els números quadrin.

### Verificació de contrast

`npm run palette:check`, dins de `npm test`, per a les quatre paletes:

| Parell | Mínim |
| --- | --- |
| `--text-primary` sobre `--surface-page` i sobre `--surface-raised` | 4.5:1 |
| `--text-secondary` i `--text-muted` sobre `--surface-page` | 4.5:1 |
| `--text-faint` sobre `--surface-page` | 3:1 |
| `--accent` i `--focus-ring` sobre `--surface-page` | 3:1 |
| `--text-on-accent` sobre `--accent` | 4.5:1 |
| Cada `--status-*` sobre `--surface-page` | 4.5:1 |

WCAG 2.1: lluminància amb linearització sRGB (`c/12.92` sota 0.03928,
`((c+0.055)/1.055)^2.4` sobre), ràtio `(L1+0.05)/(L2+0.05)`. Surt amb codi ≠ 0 si falla.

**Els valors de Catppuccin no compleixen tots aquests mínims**, sobretot els subtext
sobre superfícies elevades. Si el teu ajust en falla algun, corregeix-lo; no heretis el
problema.

En acabar: actualitza el comentari de capçalera de `flavours.css` (ja no són
provisionals) i mou l'entrada de Catppuccin del `NOTICE` de la secció 1 a la 2, reescrita
com a inspiració d'estructura i vocabulari. Els noms de token (`mauve`, `crust`) segueixen
sent manllevats, així que l'entrada no desapareix.

## 2. Service worker

Molt fàcil fer una cosa **pitjor que no fer res**: un SW mal fet serveix una versió antiga
per sempre i és difícil de diagnosticar quan et passa amb la teva pròpia pàgina d'inici.

- **Un sol fitxer**, `public/sw.js`, escrit a mà. Res de Workbox: desenes de KB i mil
  comportaments implícits per a trenta línies de necessitat.
- Cache amb versió del build; a `activate`, elimina totes les altres.
- **Cache-first** per a `/assets/*` (ja porten hash).
- **Network-first amb caiguda a cache** per a `index.html` i, sobretot, `config.json`.
  Si `config.json` es cacheja agressivament, canviar-lo al servidor no fa res i sembla
  que el desplegament estigui trencat.
- **No interceptis** `api.open-meteo.com`: la cache del temps ja té la seva lògica.
- Registre només en producció i amb **ruta relativa** (`./sw.js`). Amb ruta absoluta,
  l'scope trenca en desplegaments a subdirectori, que és el cas de Pages de projecte.
- Si el registre falla, no facis res: és una millora, no un requisit.
- Versió nova: avís discret i descartable, **sense recàrrega automàtica**.
- Documenta al README com desregistrar-lo i buidar caches.

## 3. Accessibilitat

`:focus-visible` en les quatre paletes · captura i retorn de focus als modals, verificat
amb `Tab` fins al final · `aria-label` a tot botó d'icona i `aria-hidden` als SVG
decoratius · `aria-live` present al recompte de cerca, als moviments de reordenació i als
canvis del temps, **absent** del rellotge · capçaleres sense saltar nivells ·
`prefers-reduced-motion` a tot arreu · zoom al 200% sense desplaçament horitzontal ·
navegació completa sense ratolí, panell inclòs.

`axe-core` dins d'un test de Playwright sobre pàgina principal, cerca i panell. Detecta
potser un terç dels problemes reals, però és el terç barat de corregir i fàcil de fer
reaparèixer.

## 4. Pressupost

`tools/check-budget.mjs` com a part de `npm run build`: gzip de cada actiu, suma per
tipus, falla si supera 60 KB de JS o 20 KB de CSS. Imprimeix la taula sempre, també quan
passa, perquè es vegi el marge.

Si se supera, mira per aquest ordre: set d'icones inclòs sencer en comptes d'inlinejar
les usades, alguna dependència que ha acabat a `dependencies`, polyfills innecessaris pel
`target`.

## 5. README

`README.md` (anglès, principal), `README.ca.md`, `README.es.md`, **complets i
equivalents**, no un complet i dos resums. Línia de selecció d'idioma idèntica a dalt de
tots tres.

Contingut: descripció i captura · característiques · **mnemònics amb la sintaxi `&`**,
amb secció pròpia, que és el que distingeix el projecte · taula d'atalls · instal·lació ·
configuració · desplegament (Pages, nginx, Docker, subdirectori) · com desregistrar el SW
· agraïments · llicència.

Test de sincronització: mateix nombre de capçaleres de nivell 2 i mateix nombre de files
a la taula d'atalls als tres. No garanteix equivalència, però detecta la desviació
habitual, que és afegir una secció a l'anglès i oblidar les altres.

Captures: una per paleta clara i una per fosca, **amb la configuració per defecte**, no
amb la teva real. A `docs/screenshots/`.

## 6. CI i Pages

`ci.yml` a push i PR sobre `main`: `npm ci`, `lint`, `check`, `test`, `build` (que ja
inclou el pressupost), `test:e2e`. Node 22 amb cache.
**Fixa les accions per SHA, no per etiqueta**: una etiqueta es pot moure i en repo públic
això és execució de codi arbitrari al teu CI.

`deploy.yml` només a `main` i només si el CI passa, amb `actions/deploy-pages` i permisos
mínims (`contents: read`, `pages: write`, `id-token: write`).

**Verifica el desplegament en subdirectori**: Pages de projecte serveix a `/homebase/`,
que és el cas que `base: './'` ha de cobrir.

`dependabot.yml` per a `npm` i `github-actions`, mensual.

## 7. Llista de publicació

Cap punt és opcional. El repositori no es fa públic fins que tots estiguin marcats.

**Legal**
- [ ] `flavours.css` adaptat, generat per script versionat
- [ ] `npm run palette:check` passa a les quatre paletes
- [ ] `NOTICE`: Catppuccin mogut de la secció 1 a la 2
- [ ] `NOTICE`: text MIT de Tabler Icons (pendent des de F1)
- [ ] Agraïments als **tres** README, amb enllaç a `pivoshenko/catppuccin-startpage`,
      `b-coimbra/dawn` i `catppuccin/palette`
- [ ] `LICENSE` MIT `Copyright (c) 2026 d00m4n`
- [ ] `public/wallpapers/README.md` amb origen i llicència de cada imatge
- [ ] Cap wallpaper copiat del repositori original
- [ ] Ni nom, ni descripció, ni topics suggereixen projecte oficial de Catppuccin

**Dades**
- [ ] `defaults.ts` sense dades personals més enllà de l'Annex A
- [ ] `public/config.json` ignorat; només `config.example.json` versionat
- [ ] Captures amb la configuració per defecte
- [ ] **Historial de commits revisat sencer** (`git log -p`) buscant rutes internes,
      hostnames del homelab, IP privades i adreces. És l'únic punt sense marxa enrere
      neta un cop hi ha forks
- [ ] `user.email` local del repositori comprovat

**Tècnica**
- [ ] `lint`, `check`, `test`, `test:e2e` en net
- [ ] Pressupost dins de límit
- [ ] Desplegament a Pages verificat **en subdirectori**
- [ ] SW instal·la, actualitza i es pot desregistrar
- [ ] `config.json` no queda cachejat ignorant els canvis del servidor
- [ ] Amb `weather.enabled: false`, zero peticions externes
- [ ] `grep -rn '\-\-p-' src/ --include='*.svelte'` buit
- [ ] `dependencies` buit
- [ ] `axe-core` sense violacions

## Paranys

1. SW servint una versió antiga per sempre: es manifesta com «els meus canvis no fan res».
2. `config.json` cachejat pel SW: mateix símptoma, causa diferent, més desconcertant.
3. Registrar el SW amb ruta absoluta: funciona a l'arrel, trenca a Pages de projecte.
4. Adaptar la paleta a mà: no reproduïble, contrast no verificat.
5. Rotar el to en HSL: la lluminositat percebuda es mou i el contrast es trenca desigual.
6. Donar per bo el contrast d'origen: la paleta de partida ja incompleix alguns mínims.
7. README desincronitzats a la primera modificació posterior.
8. Accions fixades per etiqueta en repositori públic.
9. Historial de commits amb dades del homelab.
