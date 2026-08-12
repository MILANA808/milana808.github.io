/** Injected on MATRIX home — primary CTA to /aksi + SW */
(function () {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  }
  function inject() {
    if (document.getElementById("aksi-primary-cta")) return;
    var hero = document.querySelector(".hero-cta");
    if (hero) {
      var a = document.createElement("a");
      a.id = "aksi-primary-cta";
      a.className = "btn btn-primary";
      a.href = "/aksi/";
      a.textContent = "✦ АКСИ · говорить";
      a.style.order = "-1";
      hero.insertBefore(a, hero.firstChild);
    }
    var nav = document.querySelector(".nav-links");
    if (nav && !nav.querySelector('[data-aksi-link]')) {
      var l = document.createElement("a");
      l.href = "/aksi/";
      l.setAttribute("data-aksi-link", "1");
      l.textContent = "АКСИ";
      l.style.color = "var(--teal,#76e4f7)";
      nav.insertBefore(l, nav.firstChild);
    }
    var foot = document.querySelector("footer");
    if (foot) {
      foot.textContent = "АКСИ · aksilove@internet.ru";
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();
})();
