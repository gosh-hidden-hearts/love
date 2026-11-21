/**
 * GOSH — Hidden Hearts Progressive Web App Service Worker
 * Designed for GitHub Pages (/love/) and Mobile Standalone Experience
 */

const CACHE_NAME = 'gosh-cache-v1.1';

// Derive scope base path automatically (e.g. '/love' on GitHub Pages or '' on root)
const SCOPE_PATH = self.location.pathname.replace(/\/sw\.js$/, '');
const BASE_URL = SCOPE_PATH === '' ? '/' : SCOPE_PATH + '/';

const CORE_ASSETS = [
  BASE_URL,
  BASE_URL + 'index.html',
  BASE_URL + 'manifest.json',
  BASE_URL + 'icons/icon-192.png',
  BASE_URL + 'icons/icon-512.png',
  BASE_URL + 'icons/apple-touch-icon.png'
];

// Install: Cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[GOSH SW] Pre-caching core assets for scope:', BASE_URL);
      try {
        await cache.addAll(CORE_ASSETS);
      } catch (err) {
        console.warn('[GOSH SW] Pre-caching non-fatal warning:', err);
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate: Prune legacy caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[GOSH SW] Clearing obsolete cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // Bypass API, WebSocket, Firebase Auth, and Supabase endpoints
  const bypassHosts = [
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firebaseinstallations.googleapis.com',
    'fcmregistrations.googleapis.com',
    'supabase.co'
  ];

  if (
    bypassHosts.some(host => url.hostname.includes(host)) ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/socket.io/')
  ) {
    return;
  }

  // Navigation requests (HTML SPA routes): Network-first with cached index.html fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return caches.match(BASE_URL + 'index.html');
        })
    );
    return;
  }

  // Static Assets (Scripts, Styles, Fonts, Images): Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached and update in background if online
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {/* offline, use cache */});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return networkResponse;
      });
    })
  );
});
