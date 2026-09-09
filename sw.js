/* AKSI SW v270 — offline-first shell for Contour + Sovereign Crystal + Swarm */
var CACHE = "aksi-shell-v270";
var PRE = [
  "/",
  "/index.html",
  "/sw.js",
  "/contour/",
  "/contour/index.html",
  "/sovereign/",
  "/sovereign/index.html",
  "/aksi-purge.js",
  "/aksi-neuro.js",
  "/aksi-knowledge.js",
  "/aksi-hrr.js",
  "/aksi-crystal.js",
  "/aksi-swarm.js",
  "/aksi-p2p-sdp.js",
  "/aksi-organism.js",
  "/aksi-api.js",
  "/aksi-pi-contour.js",
  "/aksi-zero.js"
];
var NET_FIRST = [/\/contour\//, /\/sovereign\//, /index\.html$/, /aksi-purge\.js/, /contour-app\.js/];
function isNetFirst(url) {
  var p = url.pathname;
  for (var i = 0; i < NET_FIRST.length; i++) if (NET_FIRST[i].test(p)) return true;
  return false;
}
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(PRE.map(function (u) {
        return c.add(u).catch(function () {});
      }));
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
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isNetFirst(url)) {
    e.respondWith(
      fetch(req).then(function (res) {
        return res;
      }).catch(function () {
        return caches.match(req).then(function (c) {
          return c || caches.match("/contour/") || caches.match("/");
        });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () {
        return caches.match("/") || new Response("АКСИ offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      });
    })
  );
});
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "PURGE") {
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    });
  }
});
