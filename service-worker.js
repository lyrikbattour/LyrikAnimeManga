// Service worker ANIMEDEX — mise en cache de l'app shell pour un accès hors-ligne.
// Comme tout le contenu (images, données) est intégré directement dans index.html,
// mettre index.html en cache suffit à rendre tout le catalogue consultable hors-ligne.

const CACHE_NAME = 'animedex-cache-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Stratégie : réseau d'abord (pour avoir la dernière version + Firebase en ligne),
// secours sur le cache si hors-ligne. Les appels vers des domaines externes
// (Google, Firebase, Spotify, YouTube) ne sont volontairement pas mis en cache
// puisqu'ils nécessitent une vraie connexion de toute façon.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // laisse passer les requêtes externes normalement

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
  );
});
