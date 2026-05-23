const CACHE_NAME = 'betweenle-ru-v3';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'dictionary.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching active assets');
      // Using cache.addAll with individual catch block to prevent crash if icon files are missing initially
      return Promise.all(
        ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[Service Worker] Failed to cache asset: ${asset}`, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Cache First Strategy
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Only cache valid GET responses
        if (
          !networkResponse || 
          networkResponse.status !== 200 || 
          networkResponse.type !== 'basic' ||
          e.request.method !== 'GET'
        ) {
          return networkResponse;
        }
        
        // Clone response to store in cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        
        return networkResponse;
      });
    }).catch(() => {
      // Fallback offline response for HTML request if fetching failed
      if (e.request.headers.get('accept').includes('text/html')) {
        return caches.match('index.html');
      }
    })
  );
});
