/**
 * AKSI cache purge boot — force clear SW + Cache Storage on build change
 * © AKSI · aksilove@internet.ru
 */
(function () {
  var BUILD = "20260907-v214";
  var KEY = "aksi_build_id";
  var RELOAD = "aksi_purged_" + BUILD;
  function log(m) {
    try { console.log("[AKSI purge]", m); } catch (e) {}
  }
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
        log("SW unregistered: " + regs.length);
      }
    } catch (e) { log("SW err " + e); }
    try {
      if (window.caches && caches.keys) {
        var keys = await caches.keys();
        await Promise.all(keys.map(function (k) { return caches.delete(k); }));
        log("caches deleted: " + keys.join(","));
      }
    } catch (e) { log("cache err " + e); }
    try { localStorage.removeItem("aksi_webllm_skip"); } catch (e) {}
  }
  async function run() {
    var prev = null;
    try { prev = localStorage.getItem(KEY); } catch (e) {}
    if (prev === BUILD) { done(); return; }
    log("build change " + prev + " → " + BUILD);
    await purgeAll();
    try { localStorage.setItem(KEY, BUILD); } catch (e) {}
    try {
      if (!sessionStorage.getItem(RELOAD)) {
        sessionStorage.setItem(RELOAD, "1");
        log("reload");
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
