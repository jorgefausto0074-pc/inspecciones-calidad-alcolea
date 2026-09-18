/* Service worker PWA — static assets only; never intercept blob:/data: or downloads */
const CACHE = 'inspecciones-calidad-v1-3-1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/logo-refresco.png',
  './assets/cenefa-ondulada.png',
  './assets/logo-mascotas.png',
  './assets/sello-resuelto.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }

  // Never touch blob:/data: (object URLs used for downloads) or opaque schemes
  if (url.protocol === 'blob:' || url.protocol === 'data:') return;

  // Only handle same-origin static shell assets; network-first
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return;

  const path = url.pathname;
  const isStatic =
    path.endsWith('/') ||
    path.endsWith('/index.html') ||
    path.endsWith('manifest.webmanifest') ||
    /\.(?:js|css|png|jpe?g|svg|webp|woff2?|ico|webmanifest)$/i.test(path);

  if (!isStatic) return; // let browser handle (incl. any download navigations)

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
