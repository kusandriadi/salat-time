const CACHE_VERSION = 'v2';
const NETWORK_TIMEOUT_MS = 4000;
const STATIC_CACHE = `sholatku-static-${CACHE_VERSION}`;
const API_CACHE = `sholatku-api-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// URLs that should use network-first (dynamic API data)
const API_ORIGINS = [
  'nominatim.openstreetmap.org',
  'api.aladhan.com',
];

// ─── Install: pre-cache app shell ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ─── Activate: remove old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: routing strategy ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser-extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // API calls → network-first, fall back to cache
  if (API_ORIGINS.some((origin) => url.hostname.includes(origin))) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // HTML / JS / CSS (same-origin) → network-first supaya update langsung sampai ke user,
  // fallback ke cache kalau offline atau jaringan lambat
  const isAppCode =
    url.origin === self.location.origin &&
    (request.mode === 'navigate' || /\.(html|js|css)$/.test(url.pathname));
  if (isAppCode) {
    event.respondWith(networkFirst(request, STATIC_CACHE, NETWORK_TIMEOUT_MS));
    return;
  }

  // Static assets lain (ikon, data jadwal JSON) → cache-first, fall back to network
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ─── Strategies ───────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cached = await caches.match('/index.html');
      if (cached) return cached;
    }
    return new Response('Offline - koneksi tidak tersedia', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

function fetchWithTimeout(request, timeoutMs) {
  if (!timeoutMs) return fetch(request);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function networkFirst(request, cacheName, timeoutMs) {
  try {
    const response = await fetchWithTimeout(request, timeoutMs);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match('/index.html');
      if (shell) return shell;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
