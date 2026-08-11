/** AKSI boot — SW + soft home banner */
(function () {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  }
  try {
    if (location.pathname === "/" || location.pathname === "/index.html") {
      var once = sessionStorage.getItem("AKSI_BANNER");
      if (!once) {
        sessionStorage.setItem("AKSI_BANNER", "1");
        var el = document.createElement("a");
        el.href = "/aksi/";
        el.textContent = "→ Открыть АКСИ (главный ИИ)";
        el.style.cssText =
          "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:10000;padding:12px 18px;border-radius:999px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;font:600 14px system-ui;text-decoration:none;box-shadow:0 8px 30px rgba(124,58,237,.45)";
        document.addEventListener("DOMContentLoaded", function () {
          document.body.appendChild(el);
        });
        if (document.body) document.body.appendChild(el);
      }
    }
  } catch (e) {}
})();
