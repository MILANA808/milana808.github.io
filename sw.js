/* AKSI SW v303 — network-first product surface */
var CACHE = "aksi-shell-v303";
var PRE = [
  "/",
  "/index.html",
  "/ask.html",
  "/aksi.html",
  "/platform.html",
  "/sw.js",
  "/contour/",
  "/contour/index.html",
  "/sovereign/",
  "/sovereign/index.html",
  "/reality/",
  "/aksi-full.js",
  "/aksi-neuro.js",
  "/aksi-knowledge.js",
  "/aksi-brain-ru.js",
  "/aksi-mind.js",
  "/aksi-api.js",
  "/aksi-crystal.js",
  "/aksi-reality.js",
  "/aksi-swarm.js",
  "/aksi-organism.js",
  "/aksi-pi-contour.js",
  "/aksi-zero.js",
  "/aksi-decision.js"
];
var NET_FIRST = [
  /\/ask\.html/,
  /\/aksi\.html/,
  /\/platform\.html/,
  /\/contour\//,
  /\/sovereign\//,
  /\/reality\//,
  /index\.html$/,
  /aksi-full\.js/,
  /aksi-webllm\.js/,
  /aksi-boost\.js/,
  /aksi-knowledge\.js/,
  /aksi-neuro\.js/,
  /aksi-brain-ru\.js/,
  /aksi-api\.js/,
  /aksi-mind\.js/,
  /sw\.js/
];
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
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  if (isNetFirst(url)) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (c) {
          return c || caches.match("/ask.html") || caches.match("/aksi.html");
        });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (c) {
      return c || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () { return caches.match("/ask.html"); });
    })
  );
});
