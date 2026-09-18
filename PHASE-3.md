# Fase 3 — Widgets

**Resultat:** capçalera i peu poblats amb rellotge, data, temps i salutació, col·locables
en qualsevol dels sis espais, sense degradar el temps de càrrega.

**Fora d'abast:** panell de configuració (F4). Aquí els widgets es col·loquen editant
`defaults.ts` o el `localStorage`. El **cercador de ciutats** és part del panell → F4;
aquí latitud i longitud surten de la configuració.

## Contenció d'i18n

Aquesta és la primera fase amb text generat per codi (estats del cel, salutacions,
«desactualitzat»). La decisió d'i18n de la interfície està pendent, així que: **cap
cadena literal dins d'un component**, totes a `src/lib/strings.ts`, en anglès. Si més
endavant es vol i18n, és substituir un mòdul en comptes d'una caça.

## Passa 1 — Espais i registre

`WidgetSlot.svelte` rep un espai i renderitza els widgets actius ordenats per `order`,
amb desempat per `id`. **Un espai buit no ocupa alçada ni marge**: no renderitzis el
contenidor, no confiïs en `min-height: 0`.

```ts
export const WIDGET_COMPONENTS = {
  clock: Clock, date: DateWidget, weather: Weather, greeting: Greeting,
} as const satisfies Record<Widget['type'], Component>;
```

Cap cadena d'`{#if widget.type === …}`: el `satisfies` fa que afegir un tipus sense
component sigui error de compilació.

Capçalera i peu en graella de tres columnes amb la central expansiva. Amb el peu buit
—cas per defecte— no ha de quedar cap franja al final de la pàgina.

## Passa 2 — Ticker compartit

**Un sol temporitzador per a tota l'aplicació.**

- `state/ticker.svelte.ts` amb dues granularitats, segon i minut. Si cap rellotge mostra
  segons, no existeix cap temporitzador d'un segon.
- **Alineat al límit real:** calcula els ms fins al segon/minut següent i programa un
  `setTimeout`, reprogramant. Amb `setInterval(1000)` la desviació fa saltar el segon.
- `visibilitychange`: atura amb la pestanya oculta i **recalcula abans** de reprendre.
  Una startpage passa el 99% del temps en segon pla.

## Passa 3 — Rellotge

`Intl.DateTimeFormat` **memoritzat**, no instanciat a cada tic. Subscripció a segons
només si `showSeconds`. Marcatge `<time datetime>`. Zona horària invàlida → captura i cau
a la resolta pel sistema.

**Cap `aria-live` en un rellotge.** Un lector anunciant l'hora cada segon fa la pàgina
inutilitzable.

## Passa 4 — Data

Subscripció a **minut**; formata i només toca el DOM si la cadena ha canviat. No
calculis la mitjanit de la zona horària del widget: amb canvi d'horari i zones de mitja
hora és un pou de bugs, i comparar la cadena formatada és barat i infal·lible.

`capitalise`: `toLocaleUpperCase(widget.locale)` sobre el **primer grafema**. Si el
primer caràcter no és lletra (formats que comencen per dígit), no facis res.

Número de setmana ISO-8601 propi, sense llibreria. La setmana pertany a l'any de la seva
quinta feria, cosa que fa que l'1 de gener pugui ser de la 52 o 53 de l'any anterior.

| Data | Setmana |
| --- | --- |
| 2026-01-01 | 1 |
| 2027-01-01 | 53 (de 2026) |
| 2021-01-01 | 53 (de 2020) |
| 2026-12-31 | 53 |
| 2024-02-29 | 9 |

## Passa 5 — Temps

**El widget del temps no pot degradar mai l'experiència de la pàgina.**

```
https://api.open-meteo.com/v1/forecast
  ?latitude=..&longitude=..
  &current=temperature_2m,apparent_temperature,weather_code,is_day
  &daily=temperature_2m_max,temperature_2m_min
  &timezone=auto&forecast_days=1
  &temperature_unit=celsius|fahrenheit&wind_speed_unit=kmh|mph
```

Sense clau, CORS obert. Tot el contacte amb l'API en **un sol mòdul**,
`weather/openMeteo.ts`.

Regles: `enabled: false` → **zero peticions**, ni de sondeig · `AbortController` a 8 s ·
cache a `localStorage` amb clau `homebase:weather:{lat},{lon},{units}` i marca de temps ·
en tornar a primer pla, refresca només si ha caducat · comprova `navigator.onLine` ·
mai dues peticions alhora.

| Situació | Comportament |
| --- | --- |
| Cache vàlida | Es mostra, sense petició |
| Caducada, petició OK | S'actualitza |
| Caducada, petició falla | Cache antiga amb indicador discret de desactualitzat |
| Sense cache, falla | Espai buit amb **l'alçada reservada**, sense missatge cridaner |
| Resposta amb forma inesperada | Es tracta com a fallada |

Abans de la primera resposta, esquelet amb l'alçada final: si no, la capçalera salta.

Codis WMO: 0 serè · 1-3 poc/parcialment ennuvolat/cobert · 45,48 boira · 51,53,55 plugim
· 56,57 plugim gelant · 61,63,65 pluja · 66,67 pluja gelant · 71,73,75 neu · 77 grans de
neu · 80,81,82 ruixats · 85,86 ruixats de neu · 95 tempesta · 96,99 tempesta amb
calamarsa. **Contrasta-ho amb la documentació d'Open-Meteo**: la taula és de memòria.
Codi desconegut → icona genèrica, mai error. `is_day` tria variant diürna o nocturna.

`aria-label` amb el text complet; `aria-live="polite"` només al canvi de dades.

## Passa 6 — Salutació

Matí 05:00–11:59 · tarda 12:00–19:59 · vespre 20:00–22:59 · nit 23:00–04:59.
`{name}` substituït com a **text**, mai com a HTML. Amb `name` buit, la plantilla ha de
funcionar sense espais dobles ni comes penjades. Granularitat de minut.

## Acceptació

- [ ] Els quatre widgets renderitzen a l'espai i l'ordre configurats
- [ ] Un espai buit no ocupa alçada; amb el peu buit no hi ha franja final
- [ ] Tres rellotges de zones diferents funcionen alhora
- [ ] Amb la pestanya en segon pla, **cap** temporitzador actiu
- [ ] Sense rellotges amb segons, cap temporitzador d'un segon
- [ ] Tests de setmana ISO passen, inclòs 2027-01-01
- [ ] Amb `weather.enabled: false`, cap petició a `api.open-meteo.com`
- [ ] Amb la xarxa tallada, la pàgina carrega igual i el temps no fa soroll visual
- [ ] Amb xarxa tallada i cache prèvia, dades antigues amb indicador
- [ ] Cap salt de layout en arribar la resposta
- [ ] Cap llibreria de dates; cap literal fora de `strings.ts`; cap `--p-`

## Paranys

1. Un `setInterval` per widget: rellotge i data canvien en moments diferents i es veu.
2. `setInterval(1000)`: acumula desviació, el segon salta.
3. Temporitzadors en segon pla: invisible en dev, notable a la bateria.
4. Instanciar `Intl.DateTimeFormat` a cada tic.
5. Calcular la mitjanit per a la data: horari d'estiu i zones de mitja hora.
6. `toUpperCase()` en comptes de `toLocaleUpperCase(locale)`.
7. El temps fent saltar el layout en una pàgina que s'obre cinquanta cops al dia.
8. `aria-live` en un rellotge amb segons.
9. Confiar en la forma de la resposta de l'API.
