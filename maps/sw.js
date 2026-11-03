/* AKSI Maps SW - shell + tile cache */
const SHELL = 'aksi-maps-shell-v1';
const TILES = 'aksi-maps-tiles-v1';
const SHELL_URLS = [
  './',
  './index.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_URLS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL && k !== TILES).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isTile(url) {
  return /tile\.openstreetmap\.org|\.tile\./i.test(url);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  if (isTile(url)) {
    e.respondWith(
      caches.open(TILES).then((cache) =>
        cache.match(req).then((hit) => {
          if (hit) return hit;
          return fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => caches.match(req));
        })
      )
    );
    return;
  }

  if (url.includes('/maps/') || url.endsWith('index.html')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match('./index.html') || caches.match('./')))
    );
  }
});

self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'CACHE_TILES' && Array.isArray(e.data.urls)) {
    const urls = e.data.urls.slice(0, 800);
    e.waitUntil(
      caches.open(TILES).then(async (cache) => {
        let ok = 0, fail = 0;
        for (const u of urls) {
          try {
            const res = await fetch(u, { mode: 'cors' });
            if (res.ok) { await cache.put(u, res); ok++; }
            else fail++;
          } catch (_) { fail++; }
        }
        const clients = await self.clients.matchAll();
        clients.forEach((c) => c.postMessage({ type: 'CACHE_DONE', ok, fail, total: urls.length }));
      })
    );
  }
  if (e.data.type === 'CLEAR_TILES') {
    e.waitUntil(caches.delete(TILES).then(() => caches.open(TILES)));
  }
});
