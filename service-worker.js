'use strict';

// Update cache names any time any of the cached files change.
const CACHE_NAME = 'static-cache-v0';

const FILES_TO_CACHE = [
	'index.html',
	'manifest.json',
	'css/styles.css',
	'scripts/app.js',
	'scripts/service-worker.js',
	'images/icons/icon-32x32.png',
	'images/icons/icon-128x128.png',
	'images/icons/icon-144x144.png',
	'images/icons/icon-152x152.png',
	'images/icons/icon-192x192.png',
	'images/icons/icon-256x256.png',
	'images/icons/icon-512x512.png',
];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  // Precache static resources here
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      //return cache.addAll(FILES_TO_CACHE);
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
  console.log('[ServiceWorker] Fetch', evt.request.url);
  // CODELAB: Add fetch event handler here.

});
