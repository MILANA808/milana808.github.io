/* AKSI SW v305 — network-first, purge v304 */
var CACHE = "aksi-shell-v305";
var PRE = [
  "/",
  "/index.html",
  "/sw.js"
];
var NET_FIRST = [
  /\/$/,
  /index\.html$/,
  /\/ask\.html/,
  /\/aksi\.html/,
  /\/platform\.html/,
  /\/contour\//,
  /\/sovereign\//,
  /\/reality\//,
  /aksi-.*\.js$/,
  /sw\.js$/
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
          return c || caches.match("/index.html");
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
      }).catch(function () { return caches.match("/index.html"); });
    })
  );
});
