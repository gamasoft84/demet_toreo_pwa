// Service Worker - Demet Toreo PWA
// Cache: app shell (página + Leaflet) para funcionar offline

const CACHE_NAME = 'demet-toreo-v1';
const APP_SHELL = [
  '/mapa.html',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Instalación: cachear app shell
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL.map(function (url) {
        return new Request(url, { mode: 'cors' });
      })).catch(function (err) {
        console.warn('SW install: no se pudo cachear algún recurso', err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activación: tomar control y limpiar caches antiguos
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch: app shell desde cache (offline-first), tiles y resto red-first
self.addEventListener('fetch', function (event) {
  var url = event.request.url;
  var pathname = '';
  try { pathname = new URL(url).pathname; } catch (e) {}

  // Navegación a mapa.html (con o sin query) → usar misma clave de cache
  var isMapa = event.request.mode === 'navigate' && pathname && (pathname === '/mapa.html' || pathname.endsWith('/mapa.html'));
  var isLeaflet = url.indexOf('leaflet') >= 0 && (url.endsWith('.css') || url.endsWith('.js'));
  var isManifest = pathname === '/manifest.json' || pathname.endsWith('/manifest.json');
  var isAppShell = isMapa || isLeaflet || isManifest;

  if (isAppShell) {
    var cacheKey = event.request;
    if (isMapa) {
      cacheKey = new Request(new URL(event.request.url).origin + '/mapa.html');
    }
    event.respondWith(
      caches.match(cacheKey).then(function (cached) {
        return cached || fetch(event.request).then(function (res) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(cacheKey, clone);
          });
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(fetch(event.request));
});
