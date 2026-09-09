/**
 * AKSI cache purge boot
 * © AKSI · aksilove@internet.ru
 */
(function () {
  var BUILD = "20260909-v231";
  var KEY = "aksi_build_id";
  var RELOAD = "aksi_purged_" + BUILD;
  function log(m) { try { console.log("[AKSI purge]", m); } catch (e) {} }
  function done() {
    try { window.dispatchEvent(new CustomEvent("aksi-cache-purged", { detail: { build: BUILD } })); } catch (e) {}
  }
  async function purgeAll() {
    try {
      if ("serviceWorker" in navigator) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function (r) {
          try { if (r.active) r.active.postMessage({ type: "PURGE" }); } catch (e) {}
          return r.unregister();
        }));
      }
    } catch (e) {}
    try {
      if (window.caches && caches.keys) {
        var keys = await caches.keys();
        await Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }
    } catch (e) {}
  }
  async function run() {
    var prev = null;
    try { prev = localStorage.getItem(KEY); } catch (e) {}
    if (prev === BUILD) { done(); return; }
    log("build " + prev + " → " + BUILD);
    await purgeAll();
    try { localStorage.setItem(KEY, BUILD); } catch (e) {}
    try {
      if (!sessionStorage.getItem(RELOAD)) {
        sessionStorage.setItem(RELOAD, "1");
        location.reload();
        return;
      }
    } catch (e) { location.reload(); return; }
    done();
  }
  window.AKSI_PURGE = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    return purgeAll().then(function () { location.reload(); });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
