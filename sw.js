// Service Worker - Demet Toreo PWA
// Cache: app shell (página + Leaflet) para funcionar offline
// Compatible con raíz (/) y subruta (ej. GitHub Pages: /demet_pwa/)

const APP_VERSION = '1.5.0';
const CACHE_NAME = 'demet-toreo-v' + APP_VERSION;
var BASE = self.location.pathname.replace(/[^/]*$/, ''); // '' si en raíz, '/demet_pwa/' si en subruta

function appShellUrls() {
  var origin = self.location.origin;
  return [
    origin + BASE + 'mapa.html',
    origin + BASE + 'styles.css',
    origin + BASE + 'app.js',
    origin + BASE + 'manifest.json',
    origin + BASE + 'datos.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate.js'
  ];
}

// Instalación: cachear app shell
self.addEventListener('install', function (event) {
  var urls = appShellUrls();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urls.map(function (url) {
        return new Request(url, { mode: 'cors' });
      })).catch(function (err) {
        console.warn('SW install: no se pudo cachear algún recurso', err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Responder con la versión cuando la página la pida
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: APP_VERSION });
  }
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

  var base = BASE || '/';
  var isMapa = event.request.mode === 'navigate' && pathname && (pathname === base + 'mapa.html' || pathname.endsWith('/mapa.html'));
  var isLeaflet = url.indexOf('leaflet') >= 0 && (url.endsWith('.css') || url.endsWith('.js'));
  var isManifest = pathname === base + 'manifest.json' || pathname.endsWith('/manifest.json');
  var isDatos = pathname === base + 'datos.json' || pathname.endsWith('/datos.json');
  var isLocalAsset = pathname === base + 'styles.css' || pathname === base + 'app.js'
    || pathname.endsWith('/styles.css') || pathname.endsWith('/app.js');
  var isAppShell = isMapa || isLeaflet || isManifest || isDatos || isLocalAsset;

  if (isAppShell) {
    var cacheKey = event.request;
    if (isMapa) {
      cacheKey = new Request(new URL(event.request.url).origin + base + 'mapa.html');
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
