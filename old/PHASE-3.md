# Fase 3 — Brief d'implementació: widgets

**Projecte:** `homebase`
**Document pare:** `PRD-startpage.md` v1.2 (§5.5)
**Precedents:** `docs/PHASE-1.md`, `docs/PHASE-2.md`
**Destinatari:** Claude Code
**Estat esperat en acabar:** capçalera i peu poblats amb rellotge, data, temps i
salutació, col·locables en qualsevol dels sis espais, sense degradar el temps de càrrega.

---

## 1. Abast

- Sistema d'espais (*slots*) i registre de widgets.
- Rellotge (multi-instància, multi-zona).
- Data.
- Temps, amb Open-Meteo, cache i degradació.
- Salutació.

**Fora d'abast:** el panell de configuració (fase 4). En aquesta fase els widgets es
col·loquen editant `defaults.ts` o el `localStorage` a mà. El **cercador de ciutats**
del PRD RF-32 és part del panell i, per tant, de la fase 4: aquí la latitud i la
longitud surten de la configuració i prou.

---

## 2. Decisió pendent abans de començar

El PRD no defineix cap sistema d'i18n per a la **interfície** (només exigeix README en
tres idiomes). Aquesta fase és la primera que introdueix text visible generat per codi:
descripcions de l'estat del cel, salutacions, «desactualitzat».

Fins que no es decideixi, aplica aquesta mesura de contenció: **cap cadena de text
literal dins d'un component**. Totes viuen a `src/lib/strings.ts` com a objecte pla
exportat. Si més endavant s'hi vol posar i18n de debò, és substituir un mòdul; si es
deixen escampades pels components, serà una caça.

Per defecte, escriu-les en anglès, coherentment amb la resta del codi.

---

## 3. Passa 1 — Espais i registre

### 3.1 `src/lib/components/layout/WidgetSlot.svelte`

Rep un `slot: WidgetSlot` i renderitza els widgets d'aquell espai amb `enabled: true`,
ordenats per `order` ascendent, amb desempat per `id` per garantir determinisme.

**RF-28 és literal:** un espai sense widgets no ocupa alçada ni deixa marge. Fes-ho amb
`display: contents` o no renderitzant l'element contenidor, no amb `min-height: 0` i
esperança.

### 3.2 Registre

```ts
// src/lib/components/widgets/registry.ts
export const WIDGET_COMPONENTS = {
  clock: Clock,
  date: DateWidget,
  weather: Weather,
  greeting: Greeting,
} as const satisfies Record<Widget['type'], Component>;
```

Renderitza amb `<svelte:component this={WIDGET_COMPONENTS[widget.type]} {widget} />`.
Cap cadena d'`{#if widget.type === …}` als components de layout: el `satisfies` fa que
afegir un tipus de widget nou sense component sigui un error de compilació, que és
exactament el que volem.

### 3.3 Layout

Capçalera i peu, cadascun amb tres espais en una graella de tres columnes on la central
té l'espai sobrant. Amb el peu buit —que és el cas per defecte— no ha de quedar cap
franja visible al final de la pàgina.

---

## 4. Passa 2 — El *ticker* compartit

**Un sol temporitzador per a tota l'aplicació.** No un `setInterval` per widget.

`src/lib/state/ticker.svelte.ts`:

- Exporta un valor reactiu amb la marca de temps actual.
- Dues granularitats: segon i minut. Un widget se subscriu a la que necessita; si cap
  rellotge mostra segons, no hi ha cap temporitzador d'un segon en marxa.
- **Alineació al límit real**, no `setInterval(1000)`. Calcula els mil·lisegons que
  falten fins al segon o minut següent i programa un `setTimeout`, reprogramant cada
  cop. Amb `setInterval` la desviació acumulada fa que el rellotge salti visiblement de
  tant en tant.
- `document.addEventListener('visibilitychange', …)`: atura els temporitzadors amb la
  pestanya oculta i, en tornar, **recalcula immediatament** abans de reprendre'ls. Una
  startpage passa el 99% del temps en segon pla; deixar temporitzadors corrent és
  malbaratar bateria per res.

---

## 5. Passa 3 — Rellotge

`Clock.svelte`. Format amb `Intl.DateTimeFormat`, instanciat **una vegada** per
configuració i memoritzat: crear-lo dins del render a cada tic és car de manera
mesurable.

```ts
new Intl.DateTimeFormat(widget.locale, {
  timeZone: widget.timezone,
  hour: '2-digit',
  minute: '2-digit',
  second: widget.showSeconds ? '2-digit' : undefined,
  hour12: widget.hour12,
});
```

- Se subscriu a la granularitat de segon només si `showSeconds` és cert.
- Marcatge `<time datetime="...">` amb l'ISO complet.
- **No** posis `aria-live` a un rellotge. Un lector de pantalla anunciant l'hora cada
  segon fa la pàgina inutilitzable.
- Zona horària invàlida a la configuració: `Intl` llença. Captura-ho i cau a
  `Intl.DateTimeFormat().resolvedOptions().timeZone`, i registra l'error via
  `parseConfig`.

---

## 6. Passa 4 — Data

`DateWidget.svelte`.

- Se subscriu a la granularitat de **minut**, no de segon, i formata la data a cada tic.
  Podries calcular la mitjanit següent de la zona horària del widget, però amb els canvis
  d'horari d'estiu i les zones amb desplaçaments de mitja hora és una font de bugs
  gratuïta. Formatar un cop per minut i comparar la cadena resultant és barat i no falla
  mai.
- Només actualitza el DOM si la cadena ha canviat.

### 6.1 `capitalise`

En català i castellà, `dateStyle: 'full'` retorna la primera lletra en minúscula
(`divendres, 24 de juliol de 2026`). Amb l'opció activa:

- Fes servir `toLocaleUpperCase(widget.locale)`, no `toUpperCase()`.
- Fes-ho sobre el **primer grafema**, no el primer element de la cadena: hi ha locales on
  no coincideixen.
- Si el primer caràcter no és una lletra (formats que comencen per dígit), deixa-ho
  estar.

### 6.2 Número de setmana ISO-8601

Implementació pròpia, sense llibreria de dates. Casos que **han** de tenir test, perquè
és on falla sempre:

| Data | Setmana esperada |
| --- | --- |
| 2026-01-01 (dijous) | 1 |
| 2027-01-01 (divendres) | 53 (de 2026) |
| 2021-01-01 (divendres) | 53 (de 2020) |
| 2026-12-31 | 53 |
| 2024-02-29 | 9 |

Recorda que la setmana ISO pertany a l'any de la seva quinta feria, cosa que fa que l'1
de gener pugui ser de la setmana 52 o 53 de l'any anterior.

---

## 7. Passa 5 — Temps

El component amb més superfície de fallada de tot el projecte. La regla que mana per
sobre de tot: **el widget del temps no pot degradar mai l'experiència de la pàgina.**

### 7.1 Endpoint

```
https://api.open-meteo.com/v1/forecast
  ?latitude=41.155&longitude=1.1075
  &current=temperature_2m,apparent_temperature,weather_code,is_day
  &daily=temperature_2m_max,temperature_2m_min
  &timezone=auto
  &forecast_days=1
  &temperature_unit=celsius        (o fahrenheit)
  &wind_speed_unit=kmh             (o mph)
```

Sense clau, sense registre, CORS obert. Encapsula la construcció de la URL i el
*parsing* de la resposta en **un sol mòdul**, `src/lib/weather/openMeteo.ts`, de manera
que canviar de proveïdor sigui tocar un fitxer.

### 7.2 Regles de petició

- `enabled: false` → **zero peticions**. Ni una de sondeig, ni una per «escalfar la
  cache». Verifica-ho a la pestanya de xarxa.
- `AbortController` amb temps màxim de 8 segons.
- Cache a `localStorage`, clau `homebase:weather:{lat},{lon},{units}`, amb la resposta i
  la marca de temps. No es torna a demanar fins que passin `refreshMinutes`.
- En tornar la pestanya a primer pla, si la cache està caducada, es refresca. Si no, no.
- Comprova `navigator.onLine` abans de demanar; si és fals, ni ho intentis.
- Una petició en vol no en dispara una altra.

### 7.3 Degradació

| Situació | Comportament |
| --- | --- |
| Cache vàlida | Es mostra, sense petició |
| Cache caducada, petició correcta | S'actualitza |
| Cache caducada, petició fallida | Es mostra la cache antiga amb indicador discret de «desactualitzat» |
| Sense cache, petició fallida | Espai buit amb l'alçada reservada. **Cap missatge d'error cridaner** |
| Resposta amb forma inesperada | Es tracta com una fallada; no confiïs que els camps hi siguin |

Sense cache i abans de la primera resposta, reserva l'alçada final del widget amb un
esquelet. Si no, la capçalera fa un salt quan arriba la resposta i s'incompleix RF-05.

### 7.4 Codis WMO

`weather_code` és un enter segons la taula WMO. Mapatge a icona i etiqueta:

| Codis | Significat |
| --- | --- |
| 0 | Cel serè |
| 1, 2, 3 | Poc ennuvolat / parcialment ennuvolat / cobert |
| 45, 48 | Boira i boira gebradora |
| 51, 53, 55 | Plugim feble / moderat / fort |
| 56, 57 | Plugim gelant |
| 61, 63, 65 | Pluja feble / moderada / forta |
| 66, 67 | Pluja gelant |
| 71, 73, 75 | Nevada feble / moderada / forta |
| 77 | Grans de neu |
| 80, 81, 82 | Ruixats febles / moderats / forts |
| 85, 86 | Ruixats de neu |
| 95 | Tempesta |
| 96, 99 | Tempesta amb calamarsa |

**Contrasta aquesta taula amb la documentació d'Open-Meteo abans d'implementar-la**; és
de memòria i el mapatge pot tenir matisos. Qualsevol codi no reconegut cau a una icona
genèrica; mai a un error.

`is_day` tria entre la variant diürna i nocturna de la icona.

### 7.5 Accessibilitat

`aria-label` amb el text complet («18 graus, cel serè, Reus»), mentre que la
representació visual pot ser icona i xifra. `aria-live="polite"` **només** al canvi de
dades, que passa cada mitja hora, no a cada re-render.

---

## 8. Passa 6 — Salutació

`Greeting.svelte`. Franges: matí 05:00–11:59, tarda 12:00–19:59, vespre 20:00–22:59,
nit 23:00–04:59. Plantilles amb `{name}`, amb la substitució feta com a **text**, mai
com a HTML. Se subscriu a la granularitat de minut.

Si `name` és buit, la plantilla ha de funcionar igual, sense deixar un espai doble ni una
coma penjada.

---

## 9. Criteris d'acceptació

- [ ] Els quatre widgets renderitzen a l'espai i l'ordre configurats.
- [ ] Canviar `slot` al `localStorage` i recarregar mou el widget.
- [ ] Un espai buit no ocupa cap alçada; amb el peu buit no hi ha franja al final.
- [ ] Es poden tenir **tres rellotges** de zones diferents alhora, i funcionen.
- [ ] Amb la pestanya en segon pla no hi ha cap temporitzador actiu (verificable amb el
      *performance profiler*).
- [ ] Amb tots els rellotges sense segons, no existeix cap temporitzador d'un segon.
- [ ] Els tests de número de setmana ISO passen, inclòs 2027-01-01.
- [ ] Amb `weather.enabled: false`, la pestanya de xarxa no mostra **cap** petició a
      `api.open-meteo.com`.
- [ ] Amb la xarxa tallada des del principi, la pàgina carrega igual de ràpid i el
      widget del temps no fa cap soroll visual.
- [ ] Amb la xarxa tallada i cache prèvia, es mostren les dades antigues amb indicador.
- [ ] Cap salt de layout en arribar la resposta del temps.
- [ ] `npm run lint`, `npm run check` i `npm test` en net.
- [ ] Cap dependència de runtime nova. **Cap llibreria de dates.**
- [ ] Cap cadena de text literal dins d'un component; totes a `strings.ts`.
- [ ] Cap `--p-` als components nous.

---

## 10. Punts on és fàcil equivocar-se

1. **Un `setInterval` per widget** — amb quatre widgets són quatre temporitzadors
   desalineats i el rellotge i la data canvien en moments diferents, cosa que es veu.
2. **`setInterval(1000)` per al rellotge** — acumula desviació i el segon salta.
3. **Temporitzadors corrents en segon pla** — invisible en desenvolupament, notable a la
   bateria d'un portàtil amb la startpage oberta tot el dia.
4. **Instanciar `Intl.DateTimeFormat` a cada tic** — cost real i evitable.
5. **Calcular la mitjanit per al widget de data** — l'horari d'estiu i les zones de
   mitja hora ho converteixen en un pou. Compara la cadena formatada.
6. **`toUpperCase()` en comptes de `toLocaleUpperCase(locale)`** — el cas clàssic és el
   turc, però és gratuït fer-ho bé.
7. **El widget del temps fent saltar el layout** — incompleix RF-05 i és de les coses
   que més es noten en una pàgina que s'obre cinquanta vegades al dia.
8. **`aria-live` a un rellotge amb segons** — fa la pàgina inutilitzable amb lector de
   pantalla.
9. **Confiar en la forma de la resposta de l'API** — un camp absent no pot tombar la
   capçalera sencera.