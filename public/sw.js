// Replaced with 'tradiko-<timestamp>' by the Vite build plugin on every build.
// In dev the placeholder is used as-is — intentional.
const CACHE_NAME = '__SW_CACHE_VERSION__';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// Hostnames that must NEVER be intercepted (backend API servers).
// Any request to these passes straight through to the network.
const API_HOSTNAMES = new Set([
  'tradara-production.up.railway.app',
  'tradaria-production.up.railway.app', // legacy spelling kept for safety
  'api.binance.com',
  'glad-teal-76856.upstash.io',
]);

function isApiRequest(url) {
  // Skip any request to known API hostnames
  if (API_HOSTNAMES.has(url.hostname)) return true;
  // Skip localhost dev backend
  if (url.hostname === 'localhost' && url.port === '3001') return true;
  // Skip any path that looks like an API call, regardless of host
  if (url.pathname.includes('/api/')) return true;
  return false;
}

// Instalar — cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activar — limpiar caches antiguos y tomar control inmediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Fetch — network first, fallback a cache
self.addEventListener('fetch', (event) => {
  // Solo interceptar GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept API requests — let them go straight to the network.
  // Returning without calling respondWith means the browser handles it normally.
  if (isApiRequest(url)) return;

  // Assets with a content hash in the path (e.g. /assets/index-abc123.js).
  // These are immutable when they exist, but must NOT fall back to index.html
  // when missing (that causes "Unexpected token '<'" errors).
  const isHashedAsset = url.pathname.startsWith('/assets/') &&
    /\.[a-f0-9]{8,}\.(js|css|woff2?|png|jpg|svg)$/.test(url.pathname);

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache valid responses for non-API requests
        if (response && response.status === 200 && !isHashedAsset) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        // Hashed assets are immutable — cache them too so they survive offline
        if (response && response.status === 200 && isHashedAsset) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache first
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;

          // Hashed asset not in cache → 404, never serve index.html for these
          if (isHashedAsset) {
            return new Response('Not found', { status: 404 });
          }

          // Navigation request → serve shell (index.html) for SPA routing
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then((shell) => {
              return shell ?? new Response('Offline', { status: 503 });
            });
          }

          // Any other GET (fonts, images, icons) not in cache → 503
          return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '⚡ Tradiko';
  const options = {
    body: data.body || "Today's challenge is ready.",
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || 'https://tradiko.dev' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
