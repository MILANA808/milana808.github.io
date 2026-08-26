/**
 * AKSI Core loader v5 — stitches aksi-core-a + aksi-core-b
 */
(function () {
  var vers = "5";
  function load(u) {
    return fetch(u).then(function (r) {
      if (!r.ok) throw new Error(u + " " + r.status);
      return r.text();
    });
  }
  window.__AKSI_CORE_READY__ = load("aksi-core-a.js?v=" + vers)
    .then(function (a) {
      return load("aksi-core-b.js?v=" + vers).then(function (b) {
        var s = document.createElement("script");
        s.text = a + b;
        document.head.appendChild(s);
        return window.AKSI_CORE;
      });
    })
    .catch(function (e) {
      console.error("[АКСИ] core load", e);
      return null;
    });
})();
