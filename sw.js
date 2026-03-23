// ── Meal Planner Service Worker ──────────────────────────────────────────────
// Caches the app shell on install so it works fully offline.
// Strategy: Cache-first for app shell assets; network-first is not needed
// because all data is stored in localStorage.

// !! INCREMENT THIS VERSION NUMBER ON EVERY DEPLOY so users get the latest app !!
const CACHE_NAME = 'meal-planner-20260323-1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── Install: pre-cache all shell assets ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first strategy ──────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin resources
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache the response
      return fetch(event.request).then(response => {
        // Don't cache non-ok or opaque responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return response;
      }).catch(() => {
        // Network failed and not in cache — return offline fallback
        return caches.match('./index.html');
      });
    })
  );
});
