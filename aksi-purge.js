(function () {
  var BUILD = "20260909-v270";
  var KEY = "aksi_build_id";
  async function purgeAll() {
    try {
      if ("serviceWorker" in navigator) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function (r) { return r.unregister(); }));
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
    if (prev === BUILD) return;
    await purgeAll();
    try { localStorage.setItem(KEY, BUILD); } catch (e) {}
    try {
      if (!sessionStorage.getItem("aksi_purged_" + BUILD)) {
        sessionStorage.setItem("aksi_purged_" + BUILD, "1");
        location.reload();
      }
    } catch (e) {}
  }
  window.AKSI_PURGE = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    return purgeAll().then(function () { location.href = location.pathname + "?t=" + Date.now(); });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
