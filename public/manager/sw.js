/**
 * GENTLE READERS MANAGER — SERVICE WORKER
 * Network-First for core application code, Cache-First for static vendors & fonts.
 * Provides full offline resilience for Windows laptop and iPhone Safari PWA.
 */

const CACHE_NAME = 'gentle-readers-manager-v20';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manager.css',
  './manager.css?v=20',
  './manager.js',
  './manager.js?v=20',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './vendor/xlsx.full.min.js',
  './vendor/supabase.js',
  '../img/Perfectly made ones right.svg',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching Gentle Readers Manager offline shell (v4)');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[SW] Non-critical asset cache failure:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Never cache Supabase API calls in Service Worker (managed via client IndexedDB)
  if (url.origin.includes('supabase.co')) {
    return;
  }

  // 2. Network-First strategy for core application code (manager.js, index.html, manager.css)
  // Ensures updates in code or Excel parsing logic take effect immediately when online.
  const isAppCode = url.pathname.endsWith('manager.js') || 
                    url.pathname.endsWith('manager.css') || 
                    url.pathname.endsWith('index.html') || 
                    url.pathname.endsWith('/manager/') || 
                    url.pathname.endsWith('/manager');

  if (isAppCode) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('./index.html', { ignoreSearch: true });
        });
      })
    );
    return;
  }

  // 3. Cache-First for static assets, vendors (SheetJS, Supabase SDK), and fonts
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html', { ignoreSearch: true });
        }
      });
    })
  );
});
