'use strict';

// Update cache names any time any of the cached files change.
const CACHE_NAME = 'static-cache-v1';

const FILES_TO_CACHE = [
	'index.html',
	'manifest.json',
	'service-worker.js',
	'css/styles.css',
	'scripts/app.js',
	'scripts/messages.js',
	'images/icons/icon-32x32.png',
	'images/icons/icon-128x128.png',
	'images/icons/icon-144x144.png',
	'images/icons/icon-152x152.png',
	'images/icons/icon-192x192.png',
	'images/icons/icon-256x256.png',
	'images/icons/icon-512x512.png',
	'images/icons/icon-bluetooth.png',
	'images/icons/icon-bluetooth-connected.png',
	'images/icons/icon-share.png',
	'images/icons/icon-stop.png',
	'images/icons/icon-battery-level.png',
];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  // Precache static resources here
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  // Remove previous cached data from disk
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(evt.request).then(
        (cached) => {
          if (cached) {
            console.log('[ServiceWorker] Fetch cached', evt.request.url);
            fetch(evt.request).then((networkResponse) => {
              console.log('[ServiceWorker] Updating', evt.request.url);
              cache.put(evt.request, networkResponse);
            });
            return cached;
          } else {
            console.log('[ServiceWorker] Fetch remote', evt.request.url);
            return fetch(evt.request);
          }
        }
      );
    })
  );
});
