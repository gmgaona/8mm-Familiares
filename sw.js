// Service Worker para la aplicación de Recuerdos Familia
const CACHE_NAME = 'recuerdos-familia-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/styles.css',
  '/manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar solicitudes
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Devolver desde cache si está disponible
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Actualizar Service Worker
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

