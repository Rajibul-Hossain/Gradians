self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('gradians-ai-cache').then((cache) => {
      return cache.addAll([
        '/Gradians_AI',
        '/index.html',
        '/stylesheets/styles.css',
        '/scripts/firebase.js',
        '/logo.svg',
        '/offline.html',
      ]);
    }).catch((error) => {
      console.error('Failed to cache resources:', error);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }).catch(() => {
      return caches.match('/offline.html');
    })
  );
});
