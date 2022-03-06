var cacheName = 'hugo-nuo-v5';
var filesToCache = [
  '404.html',
  'favicon.png',
  'manifest.json',
  'icons/icon-16x16.png',
  'icons/icon-32x32.png',
  'icons/icon-128x128.png',
  'icons/icon-144x144.png',
  'icons/icon-152x152.png',
  'icons/icon-192x192.png',
  'icons/icon-256x256.png',
  'icons/icon-512x512.png',
  'images/avatar.png',
  'images/grey-prism.svg',
  'images/qrcode.jpg',
  'styles/main-rendered.min.css',
{{ with .Site.Params.customStyle }}'styles/custom.min.css',{{ end }}
  'scripts/index.min.js'
];

// Cache the application assets
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(filesToCache)));
});

// network first
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(cacheName).then(function(cache) {
      return fetch(event.request)
        .then(function(response) {
          if (response.status === 404) return caches.match('404.html');
          cache.put(event.request, response.clone());
          return response;
        })
        .catch(function() {
          return caches.match(event.request);
        });
    }),
  );
});

// cache-first
// If you want to use cache first, you should change cacheName manually

// self.addEventListener('fetch', event => {
//   event.respondWith(
//     caches
//       .match(event.request)
//       .then(response => {
//         if (response) return response;
//         return fetch(event.request);
//       })
//       .then(response => {
//         if (response.status === 404) return caches.match('404.html');
//         return caches.open(cacheName).then(cache => {
//           cache.put(event.request.url, response.clone());
//           return response;
//         });
//       })
//       .catch(error => console.log('Error, ', error)),
//   );
// });

// Delete outdated caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [cacheName];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});
