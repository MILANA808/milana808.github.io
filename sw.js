/* AKSI SW v211 — network-first HTML/JS, never sticky-cache LLM modules */
var CACHE = "aksi-shell-v211";
var PRE = ["/", "/index.html", "/sw.js"];
var NO_CACHE = [
  /aksi-webllm\.js/,
  /aksi-superpose\.js/,
  /aksi-decision\.js/,
  /matrix\/app\.js/,
  /aksi-qpipe\.js/,
  /aksi-quantum\.js/,
  /\/superpose\//,
  /\/decision\//,
  /\/contour\//,
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
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (shouldBypass(url)) {
    e.respondWith(
      fetch(req, { cache: "no-store" }).catch(function () {
        return caches.match(req);
      })
    );
    return;
  }

  var isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1;
  if (isHTML) {
    e.respondWith(
      fetch(req, { cache: "no-store" }).then(function (res) {
        var c = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, c); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match("/index.html"); });
      })
    );
    return;
  }

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var c = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, c); });
      }
      return res;
    }).catch(function () { return caches.match(req); })
  );
});
self.addEventListener("message", function (e) {
  if (!e.data) return;
  if (e.data.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data.type === "PURGE") {
    e.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }).then(function () { return self.skipWaiting(); })
    );
  }
});
