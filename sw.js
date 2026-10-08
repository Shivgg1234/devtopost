/**
 * Acoustic Atlas - Offline-First Service Worker
 * Precaches app shell, vendored tf.js, YAMNet model weights, and class map CSV.
 */

const CACHE_NAME = 'acoustic-atlas-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './lib/tf.min.js',
  './config/classes.json',
  './data/yamnet_class_map.csv',
  './js/app.js',
  './js/audio-processor.js',
  './js/classifier.js',
  './js/scorer.js',
  './js/spot-grouper.js',
  './js/db.js',
  './js/demo-data.js',
  './js/ui.js',
  './js/map.js',
  './models/yamnet/model.json',
  './models/yamnet/group1-shard1of4.bin',
  './models/yamnet/group1-shard2of4.bin',
  './models/yamnet/group1-shard3of4.bin',
  './models/yamnet/group1-shard4of4.bin'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching app shell & model files...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[ServiceWorker] Precache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for local static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback response if offline and not in cache
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
