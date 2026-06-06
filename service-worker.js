// Bump CACHE_VERSION whenever shell files change so updates roll cleanly.
const CACHE_VERSION = 'v0.1.0';
const CACHE_NAME = `breathe-shell-${CACHE_VERSION}`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // {cache:'reload'} bypasses the browser HTTP cache so we always precache
      // the freshest shell on install, never a stale copy.
      cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first with cache fallback. Same-origin shell files are fetched with
// {cache:'reload'} so the browser HTTP cache can never serve a stale app.js /
// styles.css — updated code shows up on the next load instead of lingering.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;
  const networkFetch = sameOrigin
    ? fetch(event.request, { cache: 'reload' })
    : fetch(event.request);
  event.respondWith(
    networkFetch
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
  );
});
