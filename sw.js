/**
 * GOSH SERVICE WORKER (OFFLINE-FIRST PWA ENGINE)
 * Caches core shell assets for instant loading and 100% offline availability.
 */

const CACHE_NAME = 'gosh-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/state.js',
  './js/router.js',
  './js/components/icons.js',
  './js/components/modal.js',
  './js/components/toast.js',
  './js/config/firebase.config.js',
  './js/config/supabase.config.js',
  './js/config/mega.config.js',
  './js/services/auth.service.js',
  './js/services/db.service.js',
  './js/services/crypto.service.js',
  './js/services/mega.service.js',
  './js/services/vault.service.js',
  './js/services/webrtc.service.js',
  './js/services/recovery.service.js',
  './js/modules/views.js',
  './js/modules/auth/auth.view.js',
  './js/modules/dashboard/dashboard.module.js',
  './js/modules/connect/connect.module.js',
  './js/modules/cloud/cloud.module.js',
  './js/modules/vault/vault.module.js',
  './js/modules/documents/documents.module.js',
  './js/modules/calls/calls.module.js',
  './js/modules/memories/memories.module.js',
  './js/modules/diary/diary.module.js',
  './js/modules/together/together.module.js',
  './js/modules/music/music.module.js',
  './js/modules/search/search.module.js',
  './js/modules/devices/devices.module.js',
  './js/modules/recovery/recovery.module.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[GOSH SW] Pre-caching core application shell');
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[GOSH SW] Pre-cache non-blocking notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Stale-while-revalidate or Network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to offline cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
