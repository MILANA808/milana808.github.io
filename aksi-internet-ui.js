/* AKSI Internet UI v1.1 — backend if up, else browser-native Wikipedia research */
(function (G) {
  "use strict";
  if (G.AKSI_INTERNET_UI && G.AKSI_INTERNET_UI.version === "1.1.0") return;
  var VERSION = "1.1.0";
  var API = (localStorage.getItem("AKSI_API_URL") || localStorage.getItem("AKSI_API") || "https://milana-backend.onrender.com").replace(/\/$/, "");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function ensureInternetModule() {
    return new Promise(function (res) {
      if (G.AKSI_INTERNET && G.AKSI_INTERNET.research) return res(true);
      var s = document.createElement("script");
      s.src = "/aksi-internet.js?v=320";
      s.onload = function () { res(!!G.AKSI_INTERNET); };
      s.onerror = function () { res(false); };
      document.head.appendChild(s);
    });
  }

  function css() {
    if (document.getElementById("aksi-web-css")) return;
    var s = document.createElement("style");
    s.id = "aksi-web-css";
    s.textContent =
      ".aksi-web-fab{position:fixed;right:14px;bottom:14px;z-index:9999;border:1px solid rgba(180,150,255,.35);border-radius:999px;padding:11px 15px;background:#a978ff;color:#fff;font:800 13px system-ui;box-shadow:0 8px 30px rgba(0,0,0,.35);cursor:pointer}" +
      ".aksi-web-panel{position:fixed;right:12px;bottom:64px;width:min(560px,calc(100vw - 24px));max-height:78vh;z-index:9998;background:#100c19;color:#f4f0ff;border:1px solid rgba(180,150,255,.28);border-radius:16px;padding:12px;box-shadow:0 18px 60px rgba(0,0,0,.5);font:13px/1.45 system-ui;display:none}" +
      ".aksi-web-panel.on{display:block}.aksi-web-head{display:flex;align-items:center;gap:8px}.aksi-web-head b{font-size:15px}" +
      ".aksi-web-close{margin-left:auto;background:transparent!important;border:1px solid rgba(180,150,255,.25)!important;color:#fff!important}" +
      ".aksi-web-row{display:flex;gap:7px;margin-top:9px}.aksi-web-row input{flex:1;min-width:0;padding:10px;border-radius:10px;border:1px solid rgba(180,150,255,.25);background:#0b0910;color:#fff}" +
      ".aksi-web-btn{padding:10px 12px;border:0;border-radius:10px;background:#a978ff;color:#fff;font-weight:800;cursor:pointer}" +
      ".aksi-web-out{margin-top:9px;max-height:46vh;overflow:auto;padding:10px;border-radius:10px;background:#0b0910;border:1px solid rgba(180,150,255,.18);white-space:pre-wrap;word-break:break-word}" +
      ".aksi-web-status{color:#67e8f9;font-size:11px;margin-top:7px}.aksi-web-source{padding:8px 0;border-top:1px solid rgba(180,150,255,.12)}.aksi-web-source a{color:#67e8f9}.aksi-web-small{color:#a89bb8;font-size:11px}";
    document.head.appendChild(s);
  }

  async function researchBrowser(text) {
    await ensureInternetModule();
    if (!G.AKSI_INTERNET) throw new Error("browser internet module missing");
    return G.AKSI_INTERNET.deep(text);
  }

  async function researchBackend(text) {
    var r = await fetch(API + "/api/internet/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, limit: 6 })
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(d.detail || "HTTP " + r.status);
    return d;
  }

  function renderBrowser(out, d) {
    var html = "<b>Глубинный обзор (browser)</b><div class=\"aksi-web-small\">" + esc(d.source || "") + " · evidence " + ((d.evidence || []).length) + "</div>";
    html += "<div style=\"margin-top:8px;white-space:pre-wrap\">" + esc(d.answer || d.text || "") + "</div>";
    (d.evidence || []).forEach(function (x) {
      if (!x.url) return;
      html +=
        '<div class="aksi-web-source"><a href="' +
        esc(x.url) +
        '" target="_blank" rel="noopener">' +
        esc(x.title || x.url) +
        "</a></div>";
    });
    out.innerHTML = html;
  }

  function mount() {
    if (!document.body || document.getElementById("aksi-web-fab")) return;
    css();
    var fab = document.createElement("button");
    fab.id = "aksi-web-fab";
    fab.className = "aksi-web-fab";
    fab.type = "button";
    fab.textContent = "🌐 Internet";
    document.body.appendChild(fab);
    var p = document.createElement("div");
    p.id = "aksi-web-panel";
    p.className = "aksi-web-panel";
    p.innerHTML =
      '<div class="aksi-web-head"><b>🌐 AKSI Internet</b><span class="aksi-web-small">deep research</span><button class="aksi-web-btn aksi-web-close" type="button">×</button></div>' +
      '<div class="aksi-web-row"><input id="aksi-web-q" placeholder="Что исследовать?"><button class="aksi-web-btn" id="aksi-web-go" type="button">Глубоко</button></div>' +
      '<div class="aksi-web-status" id="aksi-web-status">Browser Wikipedia · backend optional</div>' +
      '<div class="aksi-web-out" id="aksi-web-out">Введите вопрос. Сначала browser-источники; backend — если доступен.</div>';
    document.body.appendChild(p);
    var q = document.getElementById("aksi-web-q");
    var go = document.getElementById("aksi-web-go");
    var st = document.getElementById("aksi-web-status");
    var out = document.getElementById("aksi-web-out");
    fab.onclick = function () {
      p.classList.toggle("on");
      if (p.classList.contains("on")) setTimeout(function () { q.focus(); }, 30);
    };
    p.querySelector(".aksi-web-close").onclick = function () {
      p.classList.remove("on");
    };

    async function research() {
      var text = q.value.trim();
      if (!text) return;
      go.disabled = true;
      st.textContent = "Исследую…";
      out.textContent = "Поиск…";
      try {
        var br = await researchBrowser(text);
        renderBrowser(out, br);
        st.textContent = "browser · " + new Date().toLocaleTimeString();
        try {
          var be = await researchBackend(text);
          if (be && be.evidence && be.evidence.length) {
            st.textContent = "browser + backend · " + new Date().toLocaleTimeString();
          }
        } catch (ignore) {}
      } catch (e) {
        out.textContent = "Ошибка: " + (e.message || e);
        st.textContent = "ошибка";
      } finally {
        go.disabled = false;
      }
    }
    go.onclick = research;
    q.addEventListener("keydown", function (e) {
      if (e.key === "Enter") research();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  G.AKSI_INTERNET_UI = {
    version: VERSION,
    mount: mount,
    api: function () {
      return API;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
