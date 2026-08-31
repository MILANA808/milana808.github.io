/**
 * AKSI Product Ready v56 patch — HRR · multi-chat · SW banner
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "product-v56";
  function $(id) { return document.getElementById(id); }

  var prevPri = G.AKSI_PRIORITY_ANSWER;
  G.AKSI_PRIORITY_ANSWER = function (q) {
    q = String(q || "").trim();
    var teach = q.match(/^(?:запомни|выучи|remember)\s*[:\uff1a]\s*(.+)$/i);
    if (teach && teach[1]) {
      var fact = teach[1].trim();
      try { if (G.AKSI_RAG && AKSI_RAG.add) AKSI_RAG.add(fact); } catch (e) {}
      try { if (G.AKSI_NEURO && AKSI_NEURO.learn) AKSI_NEURO.learn(fact); } catch (e2) {}
      try {
        var h = (G.AKSI_HRR_WEBGL && AKSI_HRR_WEBGL.get && AKSI_HRR_WEBGL.get()) ||
                (G.AKSI_HRR && AKSI_HRR.get && AKSI_HRR.get());
        if (h && h.add) h.add(fact, 1);
      } catch (e3) {}
      return { text: "Запомнила (Mem+Neuro+HRR): " + fact.slice(0, 180), source: "mem\u00b7hrr" };
    }
    return prevPri ? prevPri(q) : null;
  };

  function renderHRR() {
    var canvas = $("hrrGlCanvas");
    if (!canvas) return;
    try {
      if (G.AKSI_HRR && AKSI_HRR.renderHologram) return AKSI_HRR.renderHologram(canvas);
      if (G.AKSI_HRR_WEBGL && AKSI_HRR_WEBGL.get) {
        var h = AKSI_HRR_WEBGL.get();
        if (h.add) h.add("AKSI field", 1);
        if (h.render) return h.render(canvas);
      }
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      var w = canvas.width, ht = canvas.height, img = ctx.createImageData(w, ht);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = (Math.sin(i * 0.011) * 0.5 + 0.5) * 160 + 50;
        img.data[i] = v * 0.45; img.data[i+1] = v * 0.35; img.data[i+2] = v * 0.22; img.data[i+3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    } catch (e) { console.warn(e); }
  }

  async function renderChats() {
    var box = $("chatList");
    if (!box || !G.AKSI_CHATS) return;
    try {
      await AKSI_CHATS.ensureActive();
      var list = await AKSI_CHATS.list();
      box.innerHTML = "";
      var bNew = document.createElement("button");
      bNew.type = "button"; bNew.className = "btn p"; bNew.textContent = "+ чат";
      bNew.onclick = async function () {
        var t = prompt("Название:", "Диалог");
        if (t) { await AKSI_CHATS.create(t); renderChats(); }
      };
      box.appendChild(bNew);
      list.forEach(function (c) {
        if (c.archived) return;
        var row = document.createElement("div");
        row.style.cssText = "display:flex;gap:6px;margin:4px 0;flex-wrap:wrap;align-items:center";
        var lab = document.createElement("button");
        lab.type = "button";
        lab.className = "btn" + (c.id === AKSI_CHATS.getActiveId() ? " p" : "");
        lab.textContent = (c.title || "чат").slice(0, 24);
        lab.onclick = function () { AKSI_CHATS.setActiveId(c.id); renderChats(); };
        var ren = document.createElement("button");
        ren.type = "button"; ren.className = "btn"; ren.textContent = "\u270e";
        ren.onclick = async function () {
          var t = prompt("\u0418\u043c\u044f:", c.title || "");
          if (t) { await AKSI_CHATS.rename(c.id, t); renderChats(); }
        };
        var del = document.createElement("button");
        del.type = "button"; del.className = "btn"; del.textContent = "\u00d7";
        del.onclick = async function () {
          if (confirm("\u0423\u0434\u0430\u043b\u0438\u0442\u044c?")) { await AKSI_CHATS.remove(c.id); renderChats(); }
        };
        row.appendChild(lab); row.appendChild(ren); row.appendChild(del);
        box.appendChild(row);
      });
    } catch (e) { box.textContent = String(e.message || e); }
  }

  function showUpdateBanner(reg) {
    if (document.getElementById("aksiSwBanner")) return;
    var b = document.createElement("div");
    b.id = "aksiSwBanner";
    b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:200;background:#6b4f35;color:#fff;padding:10px;text-align:center;font-weight:700;font-size:13px";
    b.innerHTML = '\u041d\u043e\u0432\u0430\u044f \u0432\u0435\u0440\u0441\u0438\u044f \u0410\u041a\u0421\u0418 <button type="button" style="margin-left:8px;padding:6px 12px;border:0;border-radius:8px;font-weight:800;cursor:pointer">\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c</button>';
    b.querySelector("button").onclick = function () {
      if (reg && reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      location.reload();
    };
    document.body.appendChild(b);
  }

  function wireSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return;
      if (reg.waiting) showUpdateBanner(reg);
      reg.addEventListener("updatefound", function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", function () {
          if (nw.state === "installed" && navigator.serviceWorker.controller) showUpdateBanner(reg);
        });
      });
      try { reg.update(); } catch (e) {}
    });
  }

  var prevShow = G.AKSI_SHOW_TAB;
  if (typeof prevShow === "function" && !prevShow.__aksi56) {
    var w = function (t) {
      prevShow(t);
      if (t === "lab") renderHRR();
      if (t === "mem" || t === "chat") renderChats();
    };
    w.__aksi56 = 1;
    G.AKSI_SHOW_TAB = w;
    G.AKSI_NAV_GO = w;
  }

  function boot() {
    wireSW();
    setTimeout(renderHRR, 300);
    setTimeout(renderChats, 400);
    var sub = document.querySelector(".sub");
    if (sub) sub.textContent = "v56 \u00b7 HRR \u00b7 multi-chat \u00b7 SW";
    if (document.title) document.title = "\u0410\u041a\u0421\u0418 v56";
    var btn = $("btnMetrics");
    if (btn && !btn.__hrr56) {
      btn.__hrr56 = 1;
      btn.addEventListener("click", function () { setTimeout(renderHRR, 50); });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  G.AKSI_PRODUCT = G.AKSI_PRODUCT || {};
  G.AKSI_PRODUCT.version = VER;
  G.AKSI_PRODUCT.renderHRR = renderHRR;
  G.AKSI_PRODUCT.renderChats = renderChats;
})(typeof window !== "undefined" ? window : globalThis);
