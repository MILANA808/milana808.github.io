/* AKSI service worker — cache shell + recent map tiles for offline drive */
const CACHE = "aksi-v1";
const SHELL = ["/", "/drive/", "/nav.js", "/icon.svg", "/route/", "/map/", "/solar/", "/earth3d/", "/aksi/"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (e) => {
  const u = e.request.url;
  // cache OSM tiles & app pages
  if (u.includes("tile.openstreetmap.org") || u.includes("milana808.github.io")) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        try {
          const res = await fetch(e.request);
          if (res && res.ok && e.request.method === "GET") cache.put(e.request, res.clone());
          return res;
        } catch {
          return hit || new Response("offline", { status: 503 });
        }
      })
    );
    return;
  }
});
