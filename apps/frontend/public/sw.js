const CACHE_NAME = 'sw-cache-v1';
const NETWORK_TIMEOUT_MS = 5000;

const ttlByPath = {
  '/api/users': 30,
  '/api/products': 15,
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Evitar cachear rutas sensibles de admin y auth
  if (url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/auth')) {
    event.respondWith(fetch(req));
    return;
  }
  const ttl = ttlByPath[url.pathname] ?? 20;

  event.respondWith(staleWhileRevalidate(req, ttl));
});

async function staleWhileRevalidate(request, ttlSec) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = (async () => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
      const response = await fetch(request, { signal: controller.signal });
      clearTimeout(id);
      if (response && response.ok) {
        const clone = response.clone();
        const headers = new Headers(clone.headers);
        headers.set('x-sw-cached-at', Date.now().toString());
        const body = await clone.blob();
        const cachedResponse = new Response(body, { status: clone.status, statusText: clone.statusText, headers });
        await cache.put(request, cachedResponse);
      }
      return response;
    } catch {
      return cached ?? new Response('Offline', { status: 503 });
    }
  })();

  if (cached) {
    const cachedAt = Number(cached.headers.get('x-sw-cached-at') ?? '0');
    const ageSec = (Date.now() - cachedAt) / 1000;
    if (ageSec < ttlSec) {
      return cached;
    }
  }

  const response = await networkPromise;
  return response ?? cached ?? new Response('No cache', { status: 504 });
}