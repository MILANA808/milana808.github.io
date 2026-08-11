/** Shared minimal top links injector */
(function () {
  if (document.querySelector("[data-aksi-nav]")) return;
  var bar = document.createElement("div");
  bar.setAttribute("data-aksi-nav", "1");
  bar.style.cssText =
    "position:fixed;bottom:12px;right:12px;z-index:9999;display:flex;gap:6px;flex-wrap:wrap;max-width:90vw;justify-content:flex-end";
  var links = [
    ["/aksi/", "ИИ"],
    ["/hub/", "Hub"],
    ["/about/", "Grok"],
  ];
  links.forEach(function (L) {
    var a = document.createElement("a");
    a.href = L[0];
    a.textContent = L[1];
    a.style.cssText =
      "font:12px system-ui;padding:8px 12px;border-radius:999px;background:rgba(15,10,30,.9);border:1px solid rgba(167,139,250,.4);color:#e9d5ff;text-decoration:none;backdrop-filter:blur(8px)";
    bar.appendChild(a);
  });
  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(bar);
  });
  if (document.readyState !== "loading") document.body.appendChild(bar);
})();
