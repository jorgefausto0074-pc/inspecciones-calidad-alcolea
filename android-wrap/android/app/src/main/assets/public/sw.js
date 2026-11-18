/* Service worker PWA — static assets only; never intercept blob:/data: or downloads */
const CACHE = 'inspecciones-calidad-v1-5-1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  // Informe PPTX/PDF imagen Refresco 2026 (v1.5.0)
  './assets/informe2026/logo-refresco-naranja.png',
  './assets/informe2026/r-naranja.png',
  './assets/informe2026/portada-botellas.jpg',
  './assets/informe2026/seccion-1.jpg',
  './assets/informe2026/seccion-2.jpg',
  './assets/informe2026/seccion-3.jpg',
  './assets/informe2026/seccion-4.jpg',
  './assets/informe2026/seccion-5.jpg',
  './assets/informe2026/seccion-6.jpg',
  './assets/informe2026/seccion-7.jpg',
  // Imagen Refresco 2026 (interfaz v1.4.0)
  './assets/marca2026/refresco-logo-naranja.png',
  './assets/marca2026/refresco-logo-blanco.png',
  './assets/marca2026/refresco-r-naranja.png',
  './assets/marca2026/refresco-r-blanco.png',
  './assets/marca2026/stripe-r-naranja.svg',
  './assets/marca2026/stripe-r-azul.svg',
  './assets/marca2026/circulos-azul.svg',
  './assets/marca2026/foto-burbujas.webp',
  './assets/marca2026/foto-stripe-zumos.webp',
  './assets/marca2026/foto-linea-1.webp',
  './assets/marca2026/foto-linea-2.webp',
  './assets/marca2026/foto-linea-3.webp',
  './assets/marca2026/foto-linea-4.webp',
  './assets/marca2026/foto-linea-5.webp',
  './assets/marca2026/foto-linea-6.webp',
  './assets/marca2026/foto-linea-7.webp',
  './assets/marca2026/favicon-64.png',
  './assets/marca2026/icon-192.png',
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
