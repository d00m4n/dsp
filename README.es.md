[English](README.md) · [Català](README.ca.md) · **Español**

# homebase

## Visión general

Una página de inicio rápida, pensada para usarse con el teclado y que
funciona sin conexión. Sin seguimiento, sin secretos de compilación, sin
servidor necesario — abre `index.html` (o despliega la carpeta `dist/` en
cualquier sitio) y funciona.

![Captura del tema claro](docs/screenshots/light.png)
![Captura del tema oscuro](docs/screenshots/dark.png)

*(Consulta [`docs/screenshots/`](docs/screenshots/) — si las imágenes de
arriba todavía no se muestran, esta copia del repositorio aún no tiene
capturas reales; consulta la nota de esa carpeta.)*

## Características

- **Pestañas, grupos y enlaces.** Organiza tus marcadores en pestañas, y
  cada pestaña en grupos con nombre de tarjetas de enlace. Totalmente
  editable desde el panel de configuración integrado — no hace falta
  editar ningún archivo de configuración a mano, aunque también es
  compatible (ver [Configuración](#configuración)).
- **Mnemónicos.** Pulsa una sola letra para ir directamente a un enlace,
  sin tocar el ratón. Ver [Mnemónicos](#mnemónicos) más abajo.
- **Búsqueda con bangs.** Un único cuadro de búsqueda compara primero con
  tus propios enlaces y pestañas (búsqueda difusa) y, si no encuentra
  ninguno, recurre a un motor de búsqueda configurable. Escribe un token
  `!bang` (por ejemplo `!ddg`, `!yt`) en cualquier punto de la consulta
  para dirigirla a un motor concreto solo para esa búsqueda. Las URL
  escritas directamente en el cuadro se detectan y se abren directamente,
  sin buscarlas.
  Los bangs son solo un ejemplo — cada motor de búsqueda, y el bang que lo
  invoca, es configurable por el usuario.
- **Widgets.** Se pueden colocar, de forma opcional, un reloj, una fecha
  con semana ISO, un saludo y un panel del tiempo (vía Open-Meteo, sin
  clave de API) junto a tus enlaces.
- **Paleta con temas.** Cuatro variantes integradas — una clara
  (`dsp-dawn`) y tres oscuras (`dsp-dusk`, `dsp-night`, `dsp-abyss`) —
  generadas a partir de una especificación de color OKLCH original
  (`tools/palette.ts`), cada una verificada para cumplir los mínimos de
  contraste WCAG en cada combinación de texto y fondo en la que se usa.
- **Fondos de pantalla personalizados.** Sube tu propia imagen de fondo
  (guardada localmente en IndexedDB, nunca enviada a ningún sitio) o elige
  una de las incluidas en un despliegue concreto.
- **Soporte sin conexión.** Un service worker escrito a mano precarga la
  aplicación y los archivos de la compilación en la primera visita, de
  forma que la página sigue funcionando sin red. `config.json` y las
  navegaciones se piden siempre primero a la red, para que los cambios de
  un despliegue en vivo nunca queden ocultos tras una caché obsoleta;
  aparece un aviso cuando hay una nueva versión descargada y lista para
  activarse.
- **Diseño pensado para el teclado.** Todos los controles interactivos se
  pueden alcanzar y usar con el teclado, con indicadores de foco visibles
  en todas partes. Ver la [tabla completa de atajos](#atajos-de-teclado)
  más abajo.
- **Exportación, importación y restablecimiento.** Toda tu configuración
  es un único documento JSON que puedes exportar, volver a importar (con
  una vista previa validada antes de aplicarse) o restablecer a los
  valores por defecto en cualquier momento.
- **Sin seguimiento, huella pequeña.** Sin analítica, sin scripts de
  terceros. Los paquetes JavaScript y CSS de producción se comprueban
  contra un presupuesto de tamaño estricto (100 KiB / 20 KiB gzip) en cada
  compilación. Un conjunto curado de iconos
  [Tabler](https://tabler.io/icons) va empaquetado localmente y funciona
  sin conexión; cualquier otro nombre de icono válido de Tabler también
  funciona, obtenido bajo demanda desde la
  [API de Iconify](https://api.iconify.design) la primera vez que se usa.

## Mnemónicos

Los mnemónicos son la característica distintiva de homebase: pulsa una
tecla de letra (con la rejilla enfocada, y sin ningún diálogo abierto)
para abrir el enlace correspondiente al instante, o `Shift` + letra para
abrirlo en una pestaña nueva.

El nombre de cada enlace puede incluir un marcador `&` para reclamar
explícitamente la tecla a la que debe responder. Si un nombre no tiene
`&`, se asigna una tecla automáticamente a partir de sus letras. La
sintaxis:

| Escribes    | Se muestra como | Resultado                                          |
| ----------- | ---------------- | ---------------------------------------------------- |
| `Reddit`    | Reddit            | sin `&` — se asigna una tecla automáticamente        |
| `&Reddit`   | Reddit            | reclama `r`                                            |
| `Git&Hub`   | GitHub            | reclama `h`                                            |
| `R&&D`      | R&D               | `&&` es un carácter `&` literal — no reclama tecla    |
| `T&elegram` | Telegram          | reclama `e`                                            |
| `&1abc`     | 1abc              | los dígitos no son teclas válidas — no reclama tecla  |
| `Àl&bums`   | Àlbums            | reclama `b` (los acentos se ignoran al comparar)      |

La primera letra reclamada con `&` en un nombre siempre gana; un `&` final
y colgante al final de un nombre se descarta silenciosamente.

## Atajos de teclado

| Teclas | Acción |
| --- | --- |
| `a`–`z` | Abre el enlace mnemónico en la pestaña actual |
| `Shift` + `a`–`z` | Abre el enlace mnemónico en una pestaña nueva |
| `1` … `9` | Salta a la pestaña N |
| `↑` `↓` `←` `→` | Mueve el foco por la rejilla |
| `/` | Abre la búsqueda |
| `Ctrl` + `K` | Abre la búsqueda |
| `?` | Muestra esta ayuda |
| `,` | Abre la configuración |
| `Esc` | Cierra el diálogo abierto |

*(Esta tabla se genera a partir del array `SHORTCUTS` de
`src/lib/keyboard/shortcuts.ts`, la fuente de verdad única que también usa
el modal de ayuda `?` de la aplicación — si los atajos cambian, hay que
regenerar esta tabla a partir de ese archivo.)*

## Instalación y desarrollo

```sh
npm install
npm run dev          # inicia el servidor de desarrollo de Vite
npm run build         # compilación de producción a dist/ (también ejecuta la comprobación de presupuesto)
npm run preview       # sirve la compilación de producción en local
npm test               # ejecuta el conjunto de pruebas unitarias de vitest
npm run test:e2e      # ejecuta el conjunto de pruebas de extremo a extremo de Playwright
npm run lint            # eslint
npm run check            # svelte-check (tipos)
npm run format             # prettier --write
npm run palette:build       # (re)genera src/styles/flavours.css a partir de tools/palette.ts
npm run palette:check        # verifica que flavours.css coincide con la especificación, sin escribir
```

## Configuración

homebase no necesita ninguna configuración para funcionar — viene con
valores por defecto razonables. Todo es editable desde el panel de
configuración integrado, que se abre con el atajo de teclado `,` o con su
botón en pantalla.

- **Cambios locales.** Cualquier cambio hecho en el panel de configuración
  se guarda en el `localStorage` del navegador y tiene efecto
  inmediatamente, sin ningún servidor involucrado.
- **Sustitución remota con `config.json`.** En la primera carga (solo
  cuando no existe ningún cambio local previo), homebase pide
  `config.json` al mismo directorio desde el que se sirve. Esto permite
  que un despliegue ofrezca una configuración por defecto curada sin
  tocar ningún código — basta con dejar un archivo `config.json` junto a
  `index.html`. Un archivo ausente (404) es el caso normal, no un error, y
  simplemente recurre a los valores por defecto integrados.
- **Exportación.** Toda la configuración — pestañas, grupos, enlaces,
  widgets, motores de búsqueda, apariencia — se puede exportar a un único
  archivo JSON en cualquier momento desde la sección Datos del panel de
  configuración. Los fondos de pantalla guardados localmente en IndexedDB
  *no* se incluyen en la exportación.
- **Importación.** Se puede volver a importar un archivo JSON exportado
  previamente (o escrito a mano); primero se valida y se muestra una
  vista previa antes de aplicar nada.
- **Restablecimiento.** Toda la configuración se puede restablecer a los
  valores por defecto integrados en cualquier momento, con un paso de
  confirmación previo.

## Despliegue

`vite.config.ts` fija `base: './'`, de forma que la aplicación compilada
usa rutas relativas a los recursos y funciona cuando se sirve desde
cualquier subdirectorio — la raíz de un repositorio, una ruta de proyecto
de GitHub Pages (`https://usuario.github.io/repo/`), o una subruta detrás
de un proxy inverso — sin ninguna configuración adicional.

### GitHub Pages

Compila con `npm run build` y publica el contenido de `dist/` (por
ejemplo con la acción de GitHub `actions/deploy-pages`, o enviando
`dist/` a una rama `gh-pages`). Gracias a `base: './'`, no hace falta
ajustar ningún campo `base` ni `homepage` para una URL de página de
proyecto.

### Servicio estático con nginx

`dist/` es un sitio estático — cualquier servidor web que pueda servir
archivos funciona. Un fragmento mínimo de `nginx.conf`:

```nginx
server {
    listen 80;
    server_name example.invalid;
    root /var/www/homebase/dist;
    index index.html;

    # El service worker pide config.json e index.html siempre primero a la
    # red; asegúrate de que este servidor nunca envía cabeceras de caché
    # de larga duración para estos archivos.
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

Un Dockerfile mínimo e ilustrativo (no incluido en el repositorio —
adáptalo según haga falta):

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Despliegue en subdirectorio

Gracias a `base: './'`, no hace falta ninguna configuración especial para
servir homebase desde un subdirectorio (p. ej.
`https://example.invalid/start/`) — basta con copiar el contenido de
`dist/` en ese subdirectorio. Solo `config.json` y cualquier archivo
listado en `wallpapers/index.json` deben estar junto a `index.html`, en
ese mismo directorio.

## Desregistrar el service worker / borrar la caché

homebase instala un pequeño service worker escrito a mano para el soporte
sin conexión. Para eliminarlo y borrar todo lo que ha guardado en caché:

1. Abre las herramientas de desarrollo del navegador (`F12` o clic derecho
   → *Inspeccionar*).
2. Ve a la pestaña **Application** (Chrome/Edge) — en Firefox es el panel
   **Storage** de las herramientas de desarrollo.
3. En **Service Workers**, busca la entrada de este sitio y haz clic en
   **Unregister**.
4. En **Storage** (o **Clear storage**), haz clic en **Clear site data**
   (o selecciona y elimina individualmente las cachés del sitio) para
   eliminar la aplicación y los recursos guardados en caché.
5. Recarga la página. Ahora se cargará completamente desde la red y, en
   compilaciones de producción, registrará un service worker nuevo.

## Agradecimientos

homebase es un proyecto independiente, no afiliado ni respaldado por
ninguno de los siguientes proyectos — pero su concepto, diseño y
dirección visual están directamente inspirados en ellos, y esa deuda debe
ser visible:

- [pivoshenko/catppuccin-startpage](https://github.com/pivoshenko/catppuccin-startpage)
- [b-coimbra/dawn](https://github.com/b-coimbra/dawn)
- [catppuccin/palette](https://github.com/catppuccin/palette) — los
  valores de color en `src/styles/flavours.css` son una paleta original
  generada en OKLCH (ver `tools/palette.ts`), no los valores hexadecimales
  propios de Catppuccin, pero la *estructura* de la paleta (cuatro
  variantes, una clara, tres oscuras, 24 tokens cada una) y la
  *nomenclatura* de los tokens (`mauve`, `rosewater`, `crust`,
  `overlay0`–`overlay2`, etc.) se inspiraron en el vocabulario de
  Catppuccin, y están directamente tomadas de él.

Ver [`NOTICE`](NOTICE) para la lista completa de atribuciones de
terceros.

## Licencia

MIT — ver [`LICENSE`](LICENSE).
