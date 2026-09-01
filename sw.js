/* AKSI SW v200 — network-first HTML, purge old shells */
var CACHE = "aksi-shell-v200-hub";
var PRE = ["/", "/index.html", "/agent.js", "/sw.js"];
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
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1;
  if (isHTML) {
    e.respondWith(
      fetch(req).then(function (res) {
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
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
