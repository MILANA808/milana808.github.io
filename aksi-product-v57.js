/**
 * AKSI Product v57 — chat↔IDB binding · Quantum Live Lab · UX
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "product-v57";
  var loadingHist = false;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;";
    });
  }

  function observeThread() {
    var th = $("thread");
    if (!th || th.__aksi57obs) return;
    th.__aksi57obs = 1;
    var obs = new MutationObserver(function (muts) {
      if (loadingHist || !G.AKSI_CHATS) return;
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (!node || node.nodeType !== 1 || !node.classList || !node.classList.contains("msg")) return;
          if (node.__aksiSaved) return;
          node.__aksiSaved = 1;
          var role = node.classList.contains("me") ? "user" : "assistant";
          var bub = node.querySelector(".bub");
          var text = bub ? (bub.childNodes[0] ? bub.childNodes[0].textContent : bub.textContent) : node.textContent;
          text = String(text || "").replace(/\s*думаю\s*$/i, "").trim();
          if (!text || text === "\u2026") return;
          var metaEl = node.querySelector(".meta");
          var meta = metaEl ? metaEl.textContent : "";
          var cid = AKSI_CHATS.getActiveId && AKSI_CHATS.getActiveId();
          if (!cid) return;
          AKSI_CHATS.addMessage(cid, role, text, meta).catch(function () {});
        });
      });
    });
    obs.observe(th, { childList: true });
  }

  async function loadChatHistory(chatId) {
    var th = $("thread");
    if (!th || !G.AKSI_CHATS) return;
    loadingHist = true;
    try {
      var msgs = await AKSI_CHATS.getMessages(chatId, 200);
      th.innerHTML = "";
      if (!msgs || !msgs.length) {
        var d = document.createElement("div");
        d.className = "msg ai";
        d.innerHTML = '<div class="bub">Новый чат. Спроси что угодно offline.</div>';
        th.appendChild(d);
      } else {
        msgs.forEach(function (m) {
          var role = m.role === "user" || m.role === "me" ? "me" : "ai";
          var el = document.createElement("div");
          el.className = "msg " + role;
          el.__aksiSaved = 1;
          el.innerHTML = '<div class="bub">' + esc(m.text || "") +
            (m.meta ? '<div class="meta">' + esc(m.meta) + "</div>" : "") + "</div>";
          th.appendChild(el);
        });
      }
      th.scrollTop = th.scrollHeight;
    } catch (e) { console.warn("loadChat", e); }
    loadingHist = false;
  }

  async function renderChats() {
    var box = $("chatList");
    if (!box || !G.AKSI_CHATS) return;
    try {
      await AKSI_CHATS.ensureActive();
      var list = await AKSI_CHATS.list();
      box.innerHTML = "";
      var title = document.createElement("div");
      title.className = "muted"; title.style.marginBottom = "6px"; title.textContent = "Диалоги";
      box.appendChild(title);
      var bNew = document.createElement("button");
      bNew.type = "button"; bNew.className = "btn p"; bNew.textContent = "+ чат";
      bNew.onclick = async function () {
        var t = prompt("Название:", "Диалог");
        if (!t) return;
        var c = await AKSI_CHATS.create(t);
        await renderChats();
        if (c && c.id) await loadChatHistory(c.id);
      };
      box.appendChild(bNew);
      (list || []).forEach(function (c) {
        if (c.archived) return;
        var row = document.createElement("div");
        row.style.cssText = "display:flex;gap:6px;margin:4px 0;flex-wrap:wrap;align-items:center";
        var lab = document.createElement("button");
        lab.type = "button";
        lab.className = "btn" + (c.id === AKSI_CHATS.getActiveId() ? " p" : "");
        lab.textContent = (c.title || "чат").slice(0, 22);
        lab.onclick = async function () {
          AKSI_CHATS.setActiveId(c.id);
          await renderChats();
          await loadChatHistory(c.id);
          if (typeof G.AKSI_SHOW_TAB === "function") G.AKSI_SHOW_TAB("chat");
        };
        var ren = document.createElement("button");
        ren.type = "button"; ren.className = "btn"; ren.textContent = "\u270e";
        ren.onclick = async function () {
          var t = prompt("\u0418\u043c\u044f:", c.title || "");
          if (t) { await AKSI_CHATS.rename(c.id, t); renderChats(); }
        };
        var del = document.createElement("button");
        del.type = "button"; del.className = "btn"; del.textContent = "\u00d7";
        del.onclick = async function () {
          if (!confirm("\u0423\u0434\u0430\u043b\u0438\u0442\u044c чат?")) return;
          await AKSI_CHATS.remove(c.id);
          await renderChats();
          var id = AKSI_CHATS.getActiveId();
          if (id) await loadChatHistory(id);
        };
        row.appendChild(lab); row.appendChild(ren); row.appendChild(del);
        box.appendChild(row);
      });
    } catch (e) { box.textContent = String(e.message || e); }
  }

  function drawBlochSimple(canvas, b) {
    var ctx = canvas.getContext("2d");
    if (!ctx || !b) return;
    var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.38;
    ctx.fillStyle = "#1a1814"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#8a6544"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#5a4a3a"; ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
    var x = (b.x || 0) * r, y = -(b.y || 0) * r, z = (b.z || 0) * r;
    var px = cx + x, py = cy - z * 0.85 - y * 0.2;
    ctx.strokeStyle = "#c4a574"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = "#e8d4a8"; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9a8a7a"; ctx.font = "11px system-ui"; ctx.fillText("QCLI Bloch", 8, 16);
  }

  function runQuantumLive(query, answer) {
    var out = $("labMetrics");
    var canvas = $("hrrGlCanvas");
    if (!G.AKSI_QUANTUM || !AKSI_QUANTUM.answerGate) {
      if (out) out.textContent = "quantum module not loaded";
      return null;
    }
    try {
      var ag = AKSI_QUANTUM.answerGate(query || "АКСИ", answer || "local-first offline");
      if (out) {
        out.textContent = "Quantum Live \u00b7 answerGate\nQCLI: " + ag.QCLI + "\nresonance: " + ag.resonance +
          "\nentropy: " + ag.entropy + "\npurity: " + ag.purity + "\nbits: " + (ag.bits || "\u2014") +
          "\nops: " + (ag.ops || "\u2014") + "\n" + (ag.circuit || "");
      }
      if (canvas && ag.bloch0) drawBlochSimple(canvas, ag.bloch0);
      if ($("kvEqs") && ag.QCLI != null) $("kvEqs").textContent = String(ag.QCLI);
      return ag;
    } catch (e) {
      if (out) out.textContent = String(e.message || e);
      return null;
    }
  }

  function wireLabQuantum() {
    var btn = $("btnMetrics");
    if (!btn || btn.__q57) return;
    btn.__q57 = 1;
    btn.addEventListener("click", function () {
      runQuantumLive("что такое АКСИ", "АКСИ local-first Mind L2 Neuro offline agent");
      try { if (G.AKSI_PRODUCT && AKSI_PRODUCT.renderHRR) AKSI_PRODUCT.renderHRR(); } catch (e) {}
    });
  }

  function observeQuantumSeal() {
    var th = $("thread");
    if (!th || th.__aksi57q) return;
    th.__aksi57q = 1;
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (!node || !node.classList || !node.classList.contains("msg") || !node.classList.contains("ai")) return;
          if (node.__qSealed) return;
          var bub = node.querySelector(".bub");
          var text = bub && bub.childNodes[0] ? bub.childNodes[0].textContent : "";
          if (!text || text === "\u2026" || text.length < 8) return;
          node.__qSealed = 1;
          if (!G.AKSI_QUANTUM || !AKSI_QUANTUM.answerGate) return;
          try {
            var ag = AKSI_QUANTUM.answerGate("chat", text.slice(0, 400));
            var meta = node.querySelector(".meta");
            if (meta && ag && ag.QCLI != null)
              meta.textContent = (meta.textContent ? meta.textContent + " \u00b7 " : "") + "QCLI " + ag.QCLI;
          } catch (e) {}
        });
      });
    });
    obs.observe(th, { childList: true });
  }

  function hookTabs() {
    var prev = G.AKSI_SHOW_TAB;
    if (typeof prev !== "function" || prev.__aksi57) return;
    var w = function (t) {
      prev(t);
      if (t === "mem") renderChats();
      if (t === "lab") setTimeout(function () { runQuantumLive("lab", "AKSI quantum live"); }, 80);
      if (t === "chat") {
        var id = G.AKSI_CHATS && AKSI_CHATS.getActiveId && AKSI_CHATS.getActiveId();
        if (id) loadChatHistory(id);
      }
    };
    w.__aksi57 = 1; G.AKSI_SHOW_TAB = w; G.AKSI_NAV_GO = w;
  }

  function boot() {
    observeThread(); observeQuantumSeal(); wireLabQuantum(); hookTabs(); renderChats();
    setTimeout(hookTabs, 120); setTimeout(renderChats, 500);
    var sub = document.querySelector(".sub");
    if (sub) sub.textContent = "v57 \u00b7 chat IDB \u00b7 Quantum Live";
    if (document.title) document.title = "\u0410\u041a\u0421\u0418 v57";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  G.AKSI_PRODUCT = G.AKSI_PRODUCT || {};
  G.AKSI_PRODUCT.version = VER;
  G.AKSI_PRODUCT.loadChatHistory = loadChatHistory;
  G.AKSI_PRODUCT.renderChats = renderChats;
  G.AKSI_PRODUCT.runQuantumLive = runQuantumLive;
})(typeof window !== "undefined" ? window : globalThis);
