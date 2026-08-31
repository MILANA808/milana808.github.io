/* AKSI SW v47 */
var CACHE = "aksi-shell-v47";
var VERSION = "47";
var PRE = ["/", "/index.html", "/manifest.json", "/sw.js", "/app-runtime.js", "/aksi-nav-fix.js", "/aksi-organism.js", "/aksi-core-ai.js", "/aksi-web.js", "/aksi-webllm.js", "/aksi-llm-boot.js", "/aksi-algorithm.js", "/aksi-neuro.js", "/aksi-knowledge.js"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(PRE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/" || /\.html$/i.test(url.pathname)) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return caches.match(req).then(function (h) { return h || caches.match("/index.html"); }); }));
    return;
  }
  if (/\.(js|json|css)(\?|$)/i.test(url.pathname) || /aksi-/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      }).catch(function () { return hit || new Response("offline", { status: 503 }); });
      return hit || net;
    }));
  }
});
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
