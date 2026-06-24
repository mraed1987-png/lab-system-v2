const CACHE = 'lab-cache-v1';
const STATIC = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/modal.js',
  '/js/supabase.js',
  '/js/auth.js',
  '/js/data.js',
  '/js/archive.js',
  '/js/print.js',
  '/js/settings.js',
  '/js/supplies.js',
  '/js/stats.js',
  '/js/requests.js',
  '/js/weekly.js',
  '/manifest.json',
  '/pwa/icons/icon-192.svg',
  '/pwa/icons/icon-512.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      c.addAll(STATIC);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Supabase API calls — network only
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), { status: 503 })));
    return;
  }
  // CDN scripts — network first, cache fallback
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('cdn.sheetjs.com')) {
    e.respondWith(
      fetch(e.request).then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // App files — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(r => {
      caches.open(CACHE).then(c => c.put(e.request, r.clone()));
      return r;
    }))
  );
});
