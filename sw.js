var CACHE = "aksi-shell-v29";
var PRE = ["/", "/index.html", "/manifest.json", "/aksi-core.js?v=51", "/aksi-brain.js?v=4", "/aksi-web.js?v=2", "/aksi-i18n.js?v=1", "/aksi-mind.js?v=5", "/aksi-one.js?v=15", "/aksi-one-fix.js?v=1", "/aksi-ux.js?v=2", "/aksi-product-ui.js?v=1"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRE).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && res.ok && url.pathname.match(/\.(js|css|html|json|svg|png|woff2?)$/)) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () { return hit || caches.match("/index.html"); });
    return hit || net;
  }));
});
