/* House Planner service worker.
   - Navigations (the app page itself): NETWORK-FIRST, so a normal reload always shows
     the newest version; the cache only answers when offline.
   - Assets (catalog models, CDN modules, icons): stale-while-revalidate — instant from
     cache, refreshed in the background. */
const CACHE = 'houseplanner-v2';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin && u.hostname !== 'unpkg.com') return;

  if (e.request.mode === 'navigate' || u.pathname.endsWith('/index.html')) {
    e.respondWith(caches.open(CACHE).then(async c => {
      try {
        const r = await fetch(e.request);
        if (r && r.ok) c.put(e.request, r.clone());
        return r;
      } catch (err) {
        return (await c.match(e.request)) || (await c.match('index.html')) || (await c.match('./'));
      }
    }));
    return;
  }

  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => {
      if (r && r.ok) c.put(e.request, r.clone());
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
