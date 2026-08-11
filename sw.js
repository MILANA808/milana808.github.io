/* AKSI minimal service worker — shell cache */
var CACHE = "aksi-shell-v1";
var ASSETS = ["/", "/aksi/", "/styles.css", "/aksi-brain.js", "/codex.js", "/aksi-math.js", "/i18n.js", "/search-world.js", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS.map(function (u) {
        return new Request(u, { cache: "reload" });
      })).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          if (k !== CACHE) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return (
        hit ||
        fetch(e.request)
          .then(function (res) {
            return res;
          })
          .catch(function () {
            return caches.match("/aksi/");
          })
      );
    })
  );
});
