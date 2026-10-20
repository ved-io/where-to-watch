/**
 * Service Worker for "Where to Watch" (WTW) PWA
 * Provides offline caching, app shell pre-caching, and TMDB image/API caching.
 */

const CACHE_NAME = 'wtw-shell-v11';
const DATA_CACHE_NAME = 'wtw-data-v11';
const IMAGE_CACHE_NAME = 'wtw-images-v11';

// Core assets to pre-cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './css/fonts.css',
  './css/tabler-icons.min.css',
  './css/tailwind.min.css',
  './css/style.css',
  './js/config.js',
  './js/config.example.js',
  './js/app.js',
  './manifest.webmanifest',
  './favicon.ico',
  './assets/wtw-logo-on-dark.png',
  './assets/wtw-logo-on-light.png',
  './assets/wtw-mark-on-dark.png',
  './assets/wtw-mark-on-light.png',
  './assets/wtw-mark.svg',
  './assets/icons/favicon.ico',
  './assets/icons/favicon.svg',
  './assets/icons/favicon-16x16.png',
  './assets/icons/favicon-32x32.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  './assets/icons/icon-maskable-192x192.png',
  './assets/icons/icon-maskable-512x512.png'
];

// Install: pre-cache app shell resiliently
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Precache skipped for:', url, err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up outdated caches & claim clients
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, DATA_CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!currentCaches.includes(name)) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: smart caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // 1. TMDB Images (image.tmdb.org): Cache-first with network fallback
  if (url.hostname === 'image.tmdb.org') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return empty or fallback if completely offline
            return new Response('', { status: 408, statusText: 'Offline Image Unavailable' });
          });
        });
      })
    );
    return;
  }

  // 2. TMDB API calls (api.themoviedb.org): Network-first with cache fallback
  if (url.hostname === 'api.themoviedb.org') {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          return cache.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ results: [], error: 'offline' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      })
    );
    return;
  }



  // 4. Same-origin app shell files: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for HTML navigation requests
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return cached;
      });
      return cached || fetchPromise;
    })
  );
});
