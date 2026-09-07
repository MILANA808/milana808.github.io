/* AKSI SW v221 — network-first HTML/JS, never sticky-cache product modules */
var CACHE = "aksi-shell-v221";
var PRE = ["/", "/index.html", "/sw.js"];
var NO_CACHE = [
  /aksi-webllm\.js/,
  /aksi-superpose\.js/,
  /aksi-decision\.js/,
  /aksi-api\.js/,
  /aksi-algorithm\.js/,
  /aksi-integrity-bridge\.js/,
  /matrix\/app\.js/,
  /aksi-qpipe\.js/,
  /aksi-quantum\.js/,
  /\/superpose\//,
  /\/decision\//,
  /\/contour\//,
  /\/api\//,
  /contour-app\.js/,
  /\/matrix\//
];
function shouldBypass(url) {
  var p = url.pathname + url.search;
  for (var i = 0; i < NO_CACHE.length; i++) if (NO_CACHE[i].test(p)) return true;
  return false;
}
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(PRE.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "PURGE") {
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    });
  }
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypass(url)) {
    e.respondWith(fetch(req).catch(function () { return caches.match(req); }));
    return;
  }
  // network-first for HTML
  if (url.pathname.endsWith(".html") || url.pathname === "/" || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(req).then(function (res) {
        var c = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, c); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }
  // cache-first for static
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        var c = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, c); });
        return res;
      });
    })
  );
});
