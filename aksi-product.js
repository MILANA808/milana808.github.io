/**
 * AKSI Product World-Class v70 — single unified product layer
 */
(function (G) {
  "use strict";
  var VER = "product-v70";
  var loadingHist = false;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function injectCSS() {
    if (document.getElementById("aksi-wc-css")) return;
    var st = document.createElement("style");
    st.id = "aksi-wc-css";
    st.textContent =
      ".msg{display:flex;margin:6px 0}.msg.me{justify-content:flex-end}.msg.ai{justify-content:flex-start}" +
      ".msg .bub{max-width:88%;padding:10px 12px;border-radius:14px;border:1px solid var(--line,#ddd0bb);" +
      "background:var(--s,#fbf7ef);white-space:pre-wrap;word-break:break-word;line-height:1.45;font-size:14px}" +
      ".msg.me .bub{background:var(--a,#6b4f35);color:#fff;border-color:var(--a,#6b4f35)}" +
      ".msg .meta{margin-top:6px;font-size:10px;opacity:.75;font-weight:600}" +
      ".check-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}" +
      ".check-row span{font-size:11px;padding:4px 8px;border-radius:999px;border:1px solid var(--line);background:var(--s2)}" +
      ".check-row span.ok{border-color:#b7d4c2;background:#e8f2ea;color:#2f6b48}";
    document.head.appendChild(st);
  }

  G.AKSI_PRIORITY_ANSWER = function (q) {
    q = String(q || "").trim();
    if (!q) return null;
    var teach = q.match(/^(?:запомни|выучи|remember)\s*[:\uff1a]\s*(.+)$/i);
    if (teach && teach[1]) {
      var fact = teach[1].trim();
      try { if (G.AKSI_RAG && AKSI_RAG.add) AKSI_RAG.add(fact); } catch (e) {}
      try { if (G.AKSI_NEURO && AKSI_NEURO.learn) AKSI_NEURO.learn(fact); } catch (e2) {}
      try {
        var h = (G.AKSI_HRR_WEBGL && AKSI_HRR_WEBGL.get && AKSI_HRR_WEBGL.get()) ||
                (G.AKSI_HRR && AKSI_HRR.get && AKSI_HRR.get());
        if (h && h.add) h.add(fact, 1.2);
      } catch (e3) {}
      return { text: "\u0417\u0430\u043f\u043e\u043c\u043d\u0438\u043b\u0430: " + fact.slice(0, 220), source: "mem\u00b7teach" };
    }
    try {
      if (G.AKSI_MIND_L2 && typeof AKSI_MIND_L2.think === "function") {
        var r = AKSI_MIND_L2.think(q);
        if (r && r.text && String(r.text).length > 12) {
          if (r.confidence >= 0.72 || (r.intent && r.intent !== "general") || String(r.text).length > 40)
            return { text: String(r.text), source: r.meta || "mind-l2" };
        }
      }
    } catch (e) {}
    try {
      if (G.AKSI_NEURO && typeof AKSI_NEURO.think === "function") {
        var n = AKSI_NEURO.think(q);
        if (n && n.text && String(n.text).length > 16)
          return { text: String(n.text), source: "neuro \u00b7 " + (n.mode || "v5") };
      }
    } catch (e2) {}
    try {
      if (G.AKSI_CORE_AI && typeof AKSI_CORE_AI.think === "function") {
        var c = AKSI_CORE_AI.think(q);
        if (c && c.text && String(c.text).length > 12)
          return { text: String(c.text), source: c.meta || "core" };
      }
    } catch (e3) {}
    try {
      if (G.AKSI_KNOWLEDGE && AKSI_KNOWLEDGE.answer) {
        var k = AKSI_KNOWLEDGE.answer(q);
        if (k && k.text && String(k.text).length > 12)
          return { text: String(k.text), source: "knowledge" };
      }
    } catch (e4) {}
    return {
      text: "\u042f \u0410\u041a\u0421\u0418 \u2014 local-first \u043d\u0430\u043f\u0430\u0440\u043d\u0438\u043a \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.\n" +
        "\u0421\u0435\u0439\u0447\u0430\u0441 offline (Mind L2 + Neuro).\n" +
        "\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439: \u00ab\u043a\u0442\u043e \u0442\u044b\u00bb, \u00ab\u0430\u0440\u0445\u0438\u0442\u0435\u043a\u0442\u0443\u0440\u0430\u00bb, \u00ab\u0441\u0442\u0430\u0442\u0443\u0441\u00bb \u0438\u043b\u0438 \u00ab\u0437\u0430\u043f\u043e\u043c\u043d\u0438: \u0444\u0430\u043a\u0442\u00bb.\n" +
        "Local LLM \u2014 \u0432\u043a\u043b\u0430\u0434\u043a\u0430 Local (WebGPU).",
      source: "fallback"
    };
  };

  function refreshHome() {
    try {
      var items = [
        ["Mind L2", !!G.AKSI_MIND_L2], ["Neuro", !!G.AKSI_NEURO], ["RAG", !!G.AKSI_RAG],
        ["Chats", !!G.AKSI_CHATS], ["Quantum", !!G.AKSI_QUANTUM], ["WebLLM", !!G.AKSI_WEBLLM],
        ["Trust", !!G.AKSI_TRUST_VAULT], ["P2P", !!G.AKSI_P2P],
        ["HRR", !!(G.AKSI_HRR || G.AKSI_HRR_WEBGL)],
        ["SW", !!(navigator.serviceWorker && navigator.serviceWorker.controller)]
      ];
      var host = $("productChecks");
      if (host) {
        host.innerHTML = ""; host.className = "check-row";
        items.forEach(function (it) {
          var s = document.createElement("span");
          s.textContent = (it[1] ? "\u2713 " : "\u00b7 ") + it[0];
          if (it[1]) s.className = "ok";
          host.appendChild(s);
        });
      }
      var n = items.filter(function (x) { return x[1]; }).length;
      if ($("kvMods")) $("kvMods").textContent = String(n);
      if ($("productReadyLabel"))
        $("productReadyLabel").textContent = n >= 8 ? "World-class \u00b7 " + n + "/10" : "Loading \u00b7 " + n + "/10";
      if ($("kvNeuro")) $("kvNeuro").textContent = G.AKSI_MIND_L2 ? "L2" : (G.AKSI_NEURO ? "on" : "\u2014");
      var docs = 0;
      try { if (G.AKSI_RAG && AKSI_RAG.status) docs = AKSI_RAG.status().docs || 0; } catch (e) {}
      if ($("kvMem")) $("kvMem").textContent = String(docs);
      if ($("memN")) $("memN").textContent = String(docs);
    } catch (e) {}
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
        d.innerHTML = '<div class="bub">\u041d\u043e\u0432\u044b\u0439 \u0434\u0438\u0430\u043b\u043e\u0433. \u0421\u043f\u0440\u043e\u0441\u0438 \u0447\u0442\u043e \u0443\u0433\u043e\u0434\u043d\u043e \u2014 \u044f offline.</div>';
        th.appendChild(d);
      } else {
        msgs.forEach(function (m) {
          var role = (m.role === "user" || m.role === "me") ? "me" : "ai";
          var el = document.createElement("div");
          el.className = "msg " + role; el.__aksiSaved = 1;
          el.innerHTML = '<div class="bub">' + esc(m.text || "") +
            (m.meta ? '<div class="meta">' + esc(m.meta) + "</div>" : "") + "</div>";
          th.appendChild(el);
        });
      }
      th.scrollTop = th.scrollHeight;
    } catch (e) { console.warn(e); }
    loadingHist = false;
  }

  async function renderChats() {
    var box = $("chatList");
    if (!box || !G.AKSI_CHATS) return;
    try {
      await AKSI_CHATS.ensureActive();
      var list = await AKSI_CHATS.list();
      box.innerHTML = "";
      var bNew = document.createElement("button");
      bNew.type = "button"; bNew.className = "btn p"; bNew.textContent = "+ \u0447\u0430\u0442";
      bNew.onclick = async function () {
        var t = prompt("\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435:", "\u0414\u0438\u0430\u043b\u043e\u0433");
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
        lab.textContent = (c.title || "\u0447\u0430\u0442").slice(0, 22);
        lab.onclick = async function () {
          AKSI_CHATS.setActiveId(c.id);
          await renderChats(); await loadChatHistory(c.id);
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
          if (!confirm("\u0423\u0434\u0430\u043b\u0438\u0442\u044c?")) return;
          await AKSI_CHATS.remove(c.id); await renderChats();
          var id = AKSI_CHATS.getActiveId();
          if (id) await loadChatHistory(id);
        };
        row.appendChild(lab); row.appendChild(ren); row.appendChild(del);
        box.appendChild(row);
      });
    } catch (e) { box.textContent = String(e.message || e); }
  }

  function observeThread() {
    var th = $("thread");
    if (!th || th.__wcObs) return;
    th.__wcObs = 1;
    new MutationObserver(function (muts) {
      if (loadingHist || !G.AKSI_CHATS) return;
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (!node || node.nodeType !== 1 || !node.classList || !node.classList.contains("msg")) return;
          if (node.__aksiSaved) return;
          node.__aksiSaved = 1;
          var role = node.classList.contains("me") ? "user" : "assistant";
          var bub = node.querySelector(".bub");
          var text = bub ? (bub.childNodes[0] ? bub.childNodes[0].textContent : bub.textContent) : "";
          text = String(text || "").replace(/\s*\u0434\u0443\u043c\u0430\u044e\s*$/i, "").trim();
          if (!text || text === "\u2026") return;
          var metaEl = node.querySelector(".meta");
          var meta = metaEl ? metaEl.textContent : "";
          var cid = AKSI_CHATS.getActiveId && AKSI_CHATS.getActiveId();
          if (cid) AKSI_CHATS.addMessage(cid, role, text, meta).catch(function () {});
          if (role === "assistant" && G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate && !node.__qSealed) {
            node.__qSealed = 1;
            try {
              var ag = AKSI_QUANTUM.answerGate("chat", text.slice(0, 400));
              if (metaEl && ag && ag.QCLI != null)
                metaEl.textContent = (metaEl.textContent ? metaEl.textContent + " \u00b7 " : "") + "QCLI " + ag.QCLI;
              if ($("kvEqs") && ag.QCLI != null) $("kvEqs").textContent = String(ag.QCLI);
            } catch (e) {}
          }
        });
      });
    }).observe(th, { childList: true });
  }

  function wireTeach() {
    var btn = $("btnTeach");
    if (!btn || btn.__wc) return;
    btn.__wc = 1;
    btn.onclick = async function () {
      var v = (($("teachIn") && $("teachIn").value) || "").replace(/^(?:\u0437\u0430\u043f\u043e\u043c\u043d\u0438|\u0432\u044b\u0443\u0447\u0438)\s*[:\uff1a]\s*/i, "").trim();
      if (!v) return;
      btn.disabled = true;
      try {
        if (G.AKSI_RAG && AKSI_RAG.add) await AKSI_RAG.add(v);
        if (G.AKSI_NEURO && AKSI_NEURO.learn) AKSI_NEURO.learn(v);
        if ($("teachIn")) $("teachIn").value = "";
        refreshHome();
        var list = $("memList");
        if (list) { var line = document.createElement("div"); line.textContent = "\u2713 " + v.slice(0, 120); list.insertBefore(line, list.firstChild); }
      } catch (e) { alert(e.message || e); }
      btn.disabled = false;
    };
  }

  function wireLab() {
    var btn = $("btnMetrics");
    if (!btn || btn.__wc) return;
    btn.__wc = 1;
    btn.addEventListener("click", function () {
      var out = $("labMetrics");
      var canvas = $("hrrGlCanvas");
      try {
        if (G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate) {
          var ag = AKSI_QUANTUM.answerGate("\u0410\u041a\u0421\u0418", "local-first Mind L2 Neuro offline");
          if (out) out.textContent = "Quantum Live\nQCLI: " + ag.QCLI + "\nresonance: " + ag.resonance + "\n" + (ag.circuit || "");
          if (canvas && ag.bloch0) {
            var ctx = canvas.getContext("2d");
            if (ctx) {
              var w = canvas.width, h = canvas.height, cx = w/2, cy = h/2, r = Math.min(w,h)*0.38;
              ctx.fillStyle = "#1a1814"; ctx.fillRect(0,0,w,h);
              ctx.strokeStyle = "#8a6544"; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
              var b = ag.bloch0, px = cx+(b.x||0)*r, py = cy-(b.z||0)*r*0.85;
              ctx.strokeStyle = "#c4a574"; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(px,py); ctx.stroke();
              ctx.fillStyle = "#e8d4a8"; ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fill();
            }
          }
          if ($("kvEqs") && ag.QCLI != null) $("kvEqs").textContent = String(ag.QCLI);
        }
      } catch (e) { if (out) out.textContent = String(e.message || e); }
    });
  }

  function wireP2P() {
    if (!G.AKSI_P2P) return;
    var logEl = $("sdpLog");
    function slog(m) { if (logEl) logEl.textContent = String(m) + "\n" + (logEl.textContent || "").slice(0, 300); }
    if (G.AKSI_P2P.setLog) G.AKSI_P2P.setLog(slog);
    if ($("sdpOffer") && !$("sdpOffer").__wc) {
      $("sdpOffer").__wc = 1;
      $("sdpOffer").onclick = async function () {
        try { var sdp = await AKSI_P2P.createOffer(); if ($("sdpBox")) $("sdpBox").value = sdp; slog("Offer OK"); }
        catch (e) { slog(String(e.message || e)); }
      };
    }
    if ($("sdpAnswer") && !$("sdpAnswer").__wc) {
      $("sdpAnswer").__wc = 1;
      $("sdpAnswer").onclick = async function () {
        try {
          var raw = ($("sdpBox") && $("sdpBox").value) || "";
          if (!raw.trim()) return slog("SDP empty");
          var out = await AKSI_P2P.acceptRemote(raw);
          if (out && $("sdpBox")) $("sdpBox").value = typeof out === "string" ? out : JSON.stringify(out);
          slog("Answer OK");
        } catch (e) { slog(String(e.message || e)); }
      };
    }
    if ($("sdpEmbed") && !$("sdpEmbed").__wc) {
      $("sdpEmbed").__wc = 1;
      $("sdpEmbed").onclick = function () {
        try {
          var t = prompt("embed:", "AKSI"); if (t == null) return;
          var msg = AKSI_P2P.sendEmbedding(t);
          if ($("sdpBox") && msg) $("sdpBox").value = JSON.stringify(msg);
          slog("embed");
        } catch (e) { slog(String(e.message || e)); }
      };
    }
  }

  function wireChips() {
    document.querySelectorAll("[data-q]").forEach(function (chip) {
      if (chip.__wc) return; chip.__wc = 1;
      chip.addEventListener("click", function () {
        var q = chip.getAttribute("data-q"); if (!q) return;
        if (typeof G.AKSI_SHOW_TAB === "function") G.AKSI_SHOW_TAB("chat");
        if ($("inp")) $("inp").value = q;
        setTimeout(function () { if ($("send")) $("send").click(); }, 50);
      });
    });
  }

  function hookTabs() {
    var prev = G.AKSI_SHOW_TAB;
    if (typeof prev !== "function" || prev.__wc70) return;
    var w = function (t) {
      prev(t);
      if (t === "home" || t === "mem") refreshHome();
      if (t === "mem") renderChats();
      if (t === "chat") {
        var id = G.AKSI_CHATS && AKSI_CHATS.getActiveId && AKSI_CHATS.getActiveId();
        if (id) loadChatHistory(id);
      }
    };
    w.__wc70 = 1; G.AKSI_SHOW_TAB = w; G.AKSI_NAV_GO = w;
  }

  function patchWelcome() {
    var th = $("thread");
    if (!th) return;
    if (th.children.length === 1) {
      var t = th.textContent || "";
      if (/v5[0-9]|v60|Pulse/.test(t) && !/v70/.test(t)) th.innerHTML = "";
    }
    if (th.children.length) return;
    var d = document.createElement("div");
    d.className = "msg ai";
    d.innerHTML = '<div class="bub">\u0410\u041a\u0421\u0418 v70 \u2014 world-class offline product\n\u2022 Chat: Mind L2 + Neuro\n\u2022 Mem: multi-chat + teach\n\u2022 Local / Trust / Lab / Stats\n\n\u041d\u0430\u043f\u0438\u0448\u0438 \u0432\u043e\u043f\u0440\u043e\u0441.</div>';
    th.appendChild(d);
  }

  function boot() {
    injectCSS(); observeThread(); wireTeach(); wireLab(); wireP2P(); wireChips();
    hookTabs(); patchWelcome(); refreshHome(); renderChats();
    if ($("wlGpu")) $("wlGpu").textContent = navigator.gpu ? "yes" : "no";
    if ($("localCaps")) $("localCaps").textContent = navigator.gpu ? "WebGPU OK" : "WebGPU no \u00b7 Chat offline OK";
    if ($("modePill")) $("modePill").textContent = navigator.onLine ? "local" : "offline";
    var sub = document.querySelector(".sub");
    if (sub) sub.textContent = "v70 \u00b7 world-class product";
    if (document.title) document.title = "\u0410\u041a\u0421\u0418 v70 \u00b7 world-class";
    setTimeout(refreshHome, 600); setTimeout(refreshHome, 2000); setTimeout(hookTabs, 100); setTimeout(wireChips, 400);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  G.AKSI_PRODUCT = { version: VER, refreshHome: refreshHome, renderChats: renderChats, loadChatHistory: loadChatHistory };
})(typeof window !== "undefined" ? window : globalThis);
