// Service worker ANIMEDEX — mise en cache de l'app shell pour un accès hors-ligne.
// Comme tout le contenu (images, données) est intégré directement dans index.html,
// mettre index.html en cache suffit à rendre tout le catalogue consultable hors-ligne.

const CACHE_NAME = 'animedex-cache-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192-v2.png',
  '/icon-512-v2.png'
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
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // pas de cache pour les envois et l'API

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

// Notification quotidienne « Le défi du jour est dispo » (envoyée par /api/push?a=cron)
self.addEventListener('push', (event) => {
  event.waitUntil(self.registration.showNotification('🎯 Le défi du jour est dispo !', {
    body: '5 nouvelles questions t\u2019attendent sur ANIMEDEX. Garde ta série 🔥',
    icon: '/icon-192-v2.png',
    badge: '/icon-192-v2.png',
    tag: 'animedex-daily',
    data: { url: '/?daily=1' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (c.url.startsWith(self.location.origin) && 'focus' in c) { c.navigate(target); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
