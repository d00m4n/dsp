// Hand-written service worker, no Workbox/PWA plugin. The CACHE_NAME version
// suffix and PRECACHE_URLS manifest below are substituted at build time by
// the `homebase-sw-version` Vite plugin in vite.config.ts (see its
// `writeBundle` hook); this file is otherwise served as-is from `public/`.
const CACHE_NAME = 'homebase-v__CACHE_VERSION__';
const PRECACHE_URLS = ['./', './index.html', ...__PRECACHE_MANIFEST__];

self.addEventListener('install', (event) => {
  // No skipWaiting(): the new worker waits until the user explicitly asks
  // for the update (see the 'message' listener below), so an open tab is
  // never left running new JS against old markup underneath it.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

// Sent by the page once the user clicks "reload" on the update-available
// banner (see src/lib/state/serviceWorker.svelte.ts). This is the only way
// the waiting worker is ever activated early.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isOpenMeteoRequest(url) {
  return url.hostname === 'api.open-meteo.com' || url.hostname === 'geocoding-api.open-meteo.com';
}

function isHashedAsset(url) {
  return url.pathname.includes('/assets/');
}

function isNetworkFirstRequest(url, request) {
  // The root/nav request, index.html itself, and config.json (the one file
  // a deployment relies on actually updating live) must never be served
  // stale from cache while the network is reachable.
  if (request.mode === 'navigate') return true;
  return url.pathname.endsWith('/index.html') || url.pathname.endsWith('/config.json');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept Open-Meteo: its own cache module (src/lib/weather/cache.ts)
  // owns that caching responsibility, and letting the SW touch these
  // requests at all risks masking real network errors behind stale data.
  if (isOpenMeteoRequest(url)) {
    return;
  }

  if (isHashedAsset(url)) {
    // Cache-first: the filename itself changes on content change, so a
    // cache hit is always safe to serve without checking the network.
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ??
          fetch(event.request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  if (isNetworkFirstRequest(url, event.request)) {
    // Network-first, fall back to cache: this is what keeps a deployed
    // config.json (or a new index.html) live instead of stuck behind a
    // stale cache entry forever.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached ?? Promise.reject(new Error('offline, no cache')))),
    );
    return;
  }

  // Everything else: no special handling, let the browser handle it exactly
  // as if no service worker were installed.
});
