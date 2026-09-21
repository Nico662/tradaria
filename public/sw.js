const CACHE_NAME = 'tradiko-v5';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// Instalar — cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activar — limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback a cache
self.addEventListener('fetch', (event) => {
  // Solo interceptar GET
  if (event.request.method !== 'GET') return;

  // No interceptar llamadas al servidor de Tradiko ni a APIs externas
  const url = new URL(event.request.url);
  if (
    url.hostname === 'tradaria-production.up.railway.app' ||
    url.hostname === 'api.binance.com' ||
    url.hostname === 'glad-teal-76856.upstash.io'
  ) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear la respuesta si es válida
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => {
        // Sin conexión — devolver desde cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Si es navegación, devolver index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
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