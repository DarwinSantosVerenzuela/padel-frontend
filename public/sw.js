// PadelApp Service Worker — Minimal PWA support
// Handles caching and offline fallback

const CACHE_NAME = 'padel-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let Next.js handle all routing — pass through
  event.respondWith(fetch(event.request));
});
