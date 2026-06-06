// Bump CACHE_VERSION whenever shell files change so updates roll cleanly.
const CACHE_VERSION = 'v0.3.0';
const CACHE_NAME = `breathe-shell-${CACHE_VERSION}`;

// Google Fonts stylesheet for Cormorant Garamond. The woff2 files it references
// are cached on first use by the fetch handler below (they're CORS-enabled).
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,300;1,400;1,500&display=swap';

const LOCAL_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // {cache:'reload'} bypasses the browser HTTP cache so we precache the
    // freshest shell on install, never a stale copy.
    await cache.addAll(LOCAL_SHELL.map((url) => new Request(url, { cache: 'reload' })));
    // Best-effort: don't fail the install if the font fetch is unavailable.
    await Promise.allSettled([cache.add(new Request(FONT_CSS, { cache: 'reload' }))]);
  })());
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
// styles.css. Any successful GET (including the Google Fonts CSS + woff2) is
// cached, so the app — and its fonts — work offline after the first load.
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
