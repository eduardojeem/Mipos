const CACHE_NAME = 'sw-cache-v2';
const NETWORK_TIMEOUT_MS = 8000;

const ttlByPath = {
  '/api/users': 30,
  '/api/products': 15,
};

// Paths that should NEVER be cached by the service worker
const BYPASS_PATTERNS = [
  '/api/admin',
  '/api/auth',
  '/api/superadmin',
  '/admin',
  '/auth',
  '/_next/', // Next.js assets change on every deploy
  '/dashboard', // Navigation requests - let the browser handle them
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches on activation (new deploy)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip navigation requests (HTML pages) - let the browser handle them normally
  if (req.mode === 'navigate') return;

  // Skip requests matching bypass patterns
  if (BYPASS_PATTERNS.some((pattern) => url.pathname.startsWith(pattern))) return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

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
      // If network fails and we have a cached version, return it
      // Otherwise return null (will be handled below)
      return null;
    }
  })();

  // If we have a fresh cached response, return it immediately
  if (cached) {
    const cachedAt = Number(cached.headers.get('x-sw-cached-at') ?? '0');
    const ageSec = (Date.now() - cachedAt) / 1000;
    if (ageSec < ttlSec) {
      // Still revalidate in background
      networkPromise.catch(() => {});
      return cached;
    }
  }

  // Wait for network response
  const response = await networkPromise;

  // If network succeeded, return it
  if (response) return response;

  // If network failed but we have stale cache, return it
  if (cached) return cached;

  // No network, no cache - let the browser handle the error naturally
  // instead of returning a fake "Offline" response
  return fetch(request);
}
