# Fase 5 — Brief d'implementació: poliment i publicació
**Projecte:** `homebase`
**Document pare:** `PRD-startpage.md` v1.2 (§8 fase 5, §10.2)
**Precedents:** `PHASE-1.md` … `PHASE-4.md`
**Destinatari:** Claude Code
**Estat esperat en acabar:** repositori públic a GitHub, desplegat a Pages, amb paleta
pròpia i atribució completa.
---
## 1. Abast
- Adaptació de la paleta a valors originals, amb verificació de contrast automatitzada.
- Service worker per a ús sense connexió.
- Revisió d'accessibilitat.
- Verificació del pressupost de bundle.
- Els tres README.
- CI i desplegament a GitHub Pages.
- Llista de comprovació prèvia a la publicació.
Aquesta fase és **la porta de sortida**. Res es fa públic fins que la llista del §9
estigui completa.
---
## 2. Ordre de treball
L'ordre importa aquí més que a les fases anteriors, perquè hi ha dependències:
1. Paleta (§3) — afecta captures i accessibilitat, així que va primer.
2. Accessibilitat (§5) — pot obligar a tocar la paleta, per això va just després.
3. Service worker (§4).
4. Pressupost de bundle (§6).
5. README amb captures (§7) — necessita la interfície ja definitiva.
6. CI i Pages (§8).
7. Llista de publicació (§9).
---
## 3. Passa 1 — Paleta pròpia
Compliment de RF-50b, etapa 2. Fins ara `flavours.css` porta els valors de Catppuccin
sense modificar; aquí es converteixen en una paleta original.
### 3.1 Enfoc
Fes-ho amb un **script versionat al repositori**, `tools/palette.ts`, executable amb
`npm run palette:build`, que llegeix una especificació i escriu `flavours.css`. No editis
104 valors hexadecimals a mà: no és reproduïble, no és auditable, i és impossible
verificar-ne el contrast de manera fiable.
Treballa en **OKLCH**, no en HSL. OKLCH és perceptualment uniforme: rotar el to hi manté
la lluminositat percebuda, cosa que HSL no fa, i és precisament el que necessitem perquè
els ràtios de contrast no es moguin.
Especificació suggerida:
```ts
interface PaletteSpec {
  hueRotation: number;        // graus, aplicats a tots els tons cromàtics
  chromaScale: number;        // multiplicador de saturació
  lightnessAdjust: number;    // desplaçament fi per flavour
}
```
Un punt de partida raonable és una rotació d'entre 15 i 30 graus amb `chromaScale`
proper a 1. Menys de 15 graus i el resultat encara sembla el mateix; molt més i les
relacions entre colors deixen de funcionar. Els neutres (`base`, `mantle`, `crust`,
`surface*`, `overlay*`, `text`, `subtext*`) tenen croma molt baix i s'han de tractar amb
compte: rotar-los no els canvia gaire, però escalar-ne el croma els pot embrutar.
**Aquesta és una decisió estètica, no tècnica.** Genera dues o tres variants, mira-les i
tria. No acceptis la primera perquè els números quadrin.
### 3.2 Verificació de contrast
Part obligatòria del mateix script, i el motiu principal pel qual ha de ser un script.
`npm run palette:check` ha de comprovar, per a **cadascuna de les quatre paletes**:
| Parell | Mínim |
| --- | --- |
| `--text-primary` sobre `--surface-page` | 4.5:1 |
| `--text-primary` sobre `--surface-raised` | 4.5:1 |
| `--text-secondary` sobre `--surface-page` | 4.5:1 |
| `--text-muted` sobre `--surface-page` | 4.5:1 |
| `--text-faint` sobre `--surface-page` | 3:1 (text no essencial) |
| `--accent` sobre `--surface-page` | 3:1 (component d'interfície) |
| `--text-on-accent` sobre `--accent` | 4.5:1 |
| `--focus-ring` sobre `--surface-page` | 3:1 |
| Cada `--status-*` sobre `--surface-page` | 4.5:1 |
Càlcul segons WCAG 2.1: lluminància relativa amb la linearització sRGB (`c/12.92` per
sota de 0.03928, `((c+0.055)/1.055)^2.4` per sobre), i ràtio `(L1+0.05)/(L2+0.05)`.
Surt amb codi diferent de zero si algun parell falla, i integra-ho a `npm test`. Així
qualsevol futur retoc de paleta que trenqui el contrast falla al CI en comptes de
passar desapercebut.
Nota: els valors de Catppuccin **no compleixen tots aquests mínims de sortida**, sobretot
els subtext sobre superfícies elevades. Si el teu ajust en falla algun, corregeix-lo; no
copiïs el problema d'origen.
### 3.3 En acabar
- El comentari de capçalera de `flavours.css` (RF-50c) s'ha d'actualitzar: ja no són
  valors provisionals de Catppuccin, sinó valors originals generats per l'script.
- El `NOTICE` s'ha d'actualitzar segons la seva pròpia secció de manteniment: l'entrada
  de Catppuccin passa de la secció 1 a la 2, reescrita com a inspiració d'estructura i
  vocabulari de tokens.
- Els noms de token (`mauve`, `rosewater`, `crust`) segueixen sent manllevats, i per això
  l'entrada no desapareix del tot.
---
## 4. Passa 2 — Service worker
RNF-03. Aquí és molt fàcil fer una cosa pitjor que no fer res: un service worker mal fet
serveix una versió antiga per sempre i és **molt** difícil de diagnosticar quan et passa
a tu mateix amb la teva pàgina d'inici.
### 4.1 Regles
- **Un sol fitxer**, `public/sw.js`, escrit a mà. Res de Workbox ni de plugins de PWA:
  són desenes de kilobytes i mil comportaments implícits per a un cas d'ús que són trenta
  línies.
- Nom de cache amb versió injectada en build (`homebase-v{hash}`). A `activate`,
  **elimina totes les caches que no siguin l'actual**.
- **Cache-first** per als actius amb hash del build (`/assets/*`): el seu nom ja canvia
  a cada canvi, així que no poden quedar obsolets.
- **Network-first amb caiguda a cache** per a `index.html` i, molt especialment, per a
  `config.json`. Si `config.json` es cacheja de manera agressiva, canviar-lo al servidor
  no té cap efecte i sembla que el desplegament no funcioni.
- **No interceptis mai** `api.open-meteo.com`. La cache del temps és responsabilitat del
  seu mòdul, que ja té la seva lògica de caducitat.
- Registra el service worker **només en producció** i amb ruta relativa:
  `navigator.serviceWorker.register('./sw.js')`. Amb ruta absoluta, l'scope trenca en
  desplegaments a subdirectori, que és exactament el cas de GitHub Pages.
- Si el registre falla, no facis res. És una millora, no un requisit.
### 4.2 Actualització
Amb `skipWaiting()` immediat, una pestanya oberta pot quedar amb JS nou i HTML antic.
Amb el patró conservador, l'usuari pot quedar-se amb la versió antiga durant dies sense
saber-ho.
Per a aquest projecte: detecta el worker nou en espera i mostra un avís discret i
descartable («hi ha una versió nova, recarrega»). Sense recàrrega automàtica: recarregar
la pàgina d'inici sota els peus de l'usuari és molest.
### 4.3 Sortida d'emergència
Documenta al README com desregistrar el service worker i buidar les caches des de les
DevTools. Sona excessiu fins al dia que et trobis servint una versió antiga i no sàpigues
per què.
---
## 5. Passa 3 — Accessibilitat
Revisió sobre tot el que s'ha construït:
- **Focus visible** a tots els elements interactius, en les quatre paletes. Fes servir
  `:focus-visible`, no `:focus`, per no marcar els clics de ratolí.
- **Modals:** captura de focus i retorn en tancar (fases 2 i 4). Verifica-ho de debò,
  amb `Tab` fins al final del document.
- **Icones:** `aria-label` a tot botó que només tingui icona; `aria-hidden="true"` als
  SVG decoratius.
- **`aria-live`:** present al recompte de resultats de cerca, als moviments de
  reordenació i als canvis del temps. **Absent** del rellotge.
- **Estructura de capçaleres** coherent, sense saltar nivells.
- **`prefers-reduced-motion`** respectat a tot arreu, inclosa la reordenació.
- **Zoom al 200%** sense pèrdua de contingut ni desplaçament horitzontal.
- **Navegació completa sense ratolí** de tota l'aplicació, panell de configuració
  inclòs.
Passa `axe-core` dins d'un test de Playwright sobre la pàgina principal, el diàleg de
cerca i el panell de configuració, i integra-ho a `npm run test:e2e`. Les eines
automàtiques detecten potser un terç dels problemes reals, però el terç que detecten és
barat de corregir i fàcil de fer reaparèixer.
---
## 6. Passa 4 — Pressupost de bundle
RNF-01: **menys de 60 KB de JS en gzip** i menys de 20 KB de CSS. Els wallpapers en
queden exclosos.
Script `tools/check-budget.mjs`, executat com a part de `npm run build`:
- Comprimeix amb gzip cada actiu de `dist/assets/` i suma per tipus.
- Falla amb codi diferent de zero si se supera el límit.
- Imprimeix la taula sempre, també quan passa, perquè es vegi el marge que queda.
Si el pressupost se supera, les causes probables per ordre: un set d'icones que s'inclou
sencer en comptes d'inlinejar només les usades, alguna dependència que ha acabat a
`dependencies`, o *polyfills* innecessaris pel `target`. Comprova-ho abans de negociar el
límit.
---
## 7. Passa 5 — Documentació
### 7.1 Els tres README
`README.md` (anglès, principal), `README.ca.md`, `README.es.md`. **Complets i
equivalents**, no un complet i dos resums.
Cadascun amb la mateixa línia de selecció d'idioma a dalt de tot:
`English · [Català](README.ca.md) · [Español](README.es.md)`
Contingut:
1. Descripció i captura.
2. Característiques.
3. **Mnemònics** amb la sintaxi `&` i exemples — és la característica distintiva del
   projecte i mereix la seva pròpia secció, no una línia dins d'una taula.
4. Taula completa d'atalls.
5. Instal·lació i desenvolupament.
6. Configuració: `config.json`, panell integrat, import i export.
7. Desplegament: Pages, nginx, Docker, subdirectori.
8. Com desregistrar el service worker (§4.3).
9. Agraïments (§9).
10. Llicència.
### 7.2 Sincronització
Tres fitxers equivalents es desincronitzen sols. Mesura mínima: un test que comprovi que
els tres tenen el mateix nombre de capçaleres de nivell 2 i el mateix nombre de files a
la taula d'atalls. No garanteix que el contingut sigui equivalent, però detecta la
desviació més habitual, que és afegir una secció a l'anglès i oblidar les altres dues.
### 7.3 Captures
- Una per paleta clara i una per fosca, com a mínim.
- **Sense dades personals**: fes-les amb la configuració per defecte de l'Annex A, no amb
  la teva real.
- A `docs/screenshots/`, optimitzades, referenciades amb ruta relativa.
---
## 8. Passa 6 — CI i desplegament
`.github/workflows/ci.yml`:
- Dispara a `push` i `pull_request` sobre `main`.
- `npm ci`, `npm run lint`, `npm run check`, `npm test`, `npm run build` (que ja inclou
  el pressupost), `npm run test:e2e`.
- Node 22, amb cache d'npm.
- **Fixa les accions per SHA de commit**, no per etiqueta. Una etiqueta es pot moure; en
  un repositori públic això és execució de codi arbitrari al teu CI.
`.github/workflows/deploy.yml`:
- Només a `main`, i només si el CI passa.
- `actions/deploy-pages` amb els permisos mínims (`contents: read`, `pages: write`,
  `id-token: write`).
- **Verifica el desplegament en subdirectori.** GitHub Pages de projecte serveix a
  `/homebase/`, que és exactament el cas que `base: './'` ha de cobrir. Si aquí falla
  alguna cosa, és que la verificació de la fase 0 no es va fer de debò.
Afegeix `dependabot.yml` per a `npm` i `github-actions`, mensual.
---
## 9. Llista de comprovació prèvia a la publicació
Del PRD §8 fase 5, ampliada. **Cap punt és opcional. El repositori no es fa públic fins
que tots estiguin marcats.**
### Legal i atribució
- [ ] Valors de `flavours.css` adaptats (§3), generats per script versionat.
- [ ] `npm run palette:check` passa a les quatre paletes.
- [ ] `NOTICE` actualitzat: Catppuccin mogut de la secció 1 a la 2.
- [ ] `NOTICE` amb el text MIT de Tabler Icons (pendent des de la fase 1).
- [ ] Secció d'agraïments als **tres** README, amb enllaç a
      `pivoshenko/catppuccin-startpage`, `b-coimbra/dawn` i `catppuccin/palette`.
- [ ] `LICENSE` MIT, `Copyright (c) 2026 d00m4n`.
- [ ] `public/wallpapers/README.md` amb origen i llicència de cada imatge.
- [ ] Cap wallpaper copiat del repositori original.
- [ ] Ni el nom, ni la descripció, ni els *topics* del repositori suggereixen que sigui
      un projecte oficial de Catppuccin.
### Higiene de dades
- [ ] `defaults.ts` sense dades personals més enllà de l'Annex A.
- [ ] `public/config.json` **ignorat** al git; només `config.example.json` versionat.
- [ ] Captures fetes amb la configuració per defecte.
- [ ] **Historial de commits revisat sencer.** Un `git log -p` buscant rutes internes,
      noms de host del homelab, IP privades o adreces. Un cop públic, reescriure
      l'historial deixa de ser una opció neta.
- [ ] `git log` sense adreces de correu que no vulguis publicar (comprova
      `user.email` local del repositori).
### Tècnica
- [ ] `npm run lint`, `npm run check`, `npm test`, `npm run test:e2e` en net.
- [ ] Pressupost de bundle dins de límit.
- [ ] Desplegament a Pages verificat **en subdirectori**.
- [ ] Service worker: instal·la, actualitza correctament i es pot desregistrar.
- [ ] `config.json` no queda cacheja de manera que ignori els canvis del servidor.
- [ ] Amb `weather.enabled: false`, zero peticions externes en tota la sessió.
- [ ] `grep -rn '\-\-p-' src/ --include='*.svelte'` buit.
- [ ] Cap dependència a `dependencies` del `package.json`.
- [ ] `axe-core` sense violacions a les tres vistes principals.
---
## 10. Punts on és fàcil equivocar-se
1. **Service worker servint una versió antiga per sempre** — el bug més frustrant
   d'aquesta fase, perquè es manifesta com «els meus canvis no fan res».
2. **`config.json` cachejat pel service worker** — mateix símptoma, causa diferent, i
   encara més desconcertant.
3. **Registrar el service worker amb ruta absoluta** — funciona a l'arrel i trenca a
   Pages de projecte.
4. **Adaptar la paleta a mà** — no és reproduïble i el contrast no queda verificat.
5. **Rotar el to en HSL** — la lluminositat percebuda es mou i el contrast es trenca de
   manera desigual.
6. **Donar per bo el contrast d'origen** — la paleta de partida ja incompleix alguns
   mínims; copiar-los seria heretar el problema.
7. **README desincronitzats** — passa a la primera modificació posterior.
8. **Accions de GitHub fixades per etiqueta** — en repositori públic és un risc real de
   subministrament.
9. **Historial de commits amb dades del homelab** — l'única cosa d'aquesta llista que no
   té marxa enrere neta un cop hi ha *forks*.