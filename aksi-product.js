/**
 * AKSI Product FINAL v60 — unified ready product layer
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "product-v60";
  function $(id) { return document.getElementById(id); }

  function injectChatCSS() {
    if (document.getElementById("aksi-chat-css")) return;
    var st = document.createElement("style");
    st.id = "aksi-chat-css";
    st.textContent =
      ".msg{display:flex;margin:6px 0}.msg.me{justify-content:flex-end}.msg.ai{justify-content:flex-start}" +
      ".msg .bub{max-width:88%;padding:10px 12px;border-radius:14px;border:1px solid var(--line,#ddd0bb);" +
      "background:var(--s,#fbf7ef);white-space:pre-wrap;word-break:break-word;line-height:1.45;font-size:14px}" +
      ".msg.me .bub{background:var(--a,#6b4f35);color:#fff;border-color:var(--a,#6b4f35)}" +
      ".msg .meta{margin-top:6px;font-size:10px;opacity:.75;font-weight:600}";
    document.head.appendChild(st);
  }

  function statusBoard() {
    var host = $("productChecks");
    if (!host) return;
    var items = [
      ["Mind L2", !!G.AKSI_MIND_L2],
      ["Neuro", !!G.AKSI_NEURO],
      ["RAG", !!G.AKSI_RAG],
      ["Chats", !!G.AKSI_CHATS],
      ["Quantum", !!G.AKSI_QUANTUM],
      ["WebLLM", !!G.AKSI_WEBLLM],
      ["Trust", !!G.AKSI_TRUST_VAULT],
      ["P2P", !!G.AKSI_P2P],
      ["HRR", !!(G.AKSI_HRR || G.AKSI_HRR_WEBGL)],
      ["SW", !!(navigator.serviceWorker && navigator.serviceWorker.controller)]
    ];
    host.innerHTML = "";
    host.className = "check-row";
    items.forEach(function (it) {
      var s = document.createElement("span");
      s.textContent = (it[1] ? "\u2713 " : "\u00b7 ") + it[0];
      if (it[1]) s.className = "ok";
      host.appendChild(s);
    });
    var n = items.filter(function (x) { return x[1]; }).length;
    if ($("kvMods")) $("kvMods").textContent = String(n);
    if ($("productReadyLabel"))
      $("productReadyLabel").textContent = n >= 7 ? "\u0413\u043e\u0442\u043e\u0432\u044b\u0439 \u043f\u0440\u043e\u0434\u0443\u043a\u0442 \u00b7 " + n + "/10 \u043c\u043e\u0434\u0443\u043b\u0435\u0439" : "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u00b7 " + n + "/10";
  }

  async function searchAllChats(q) {
    q = String(q || "").trim().toLowerCase();
    var box = $("chatSearchOut");
    if (!box) return;
    if (!q || !G.AKSI_CHATS) { box.textContent = q ? "chats offline" : ""; return; }
    box.textContent = "\u2026";
    try {
      var list = await AKSI_CHATS.list();
      var hits = [];
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.archived) continue;
        var msgs = await AKSI_CHATS.getMessages(c.id, 300);
        (msgs || []).forEach(function (m) {
          var t = String(m.text || "");
          if (t.toLowerCase().indexOf(q) !== -1)
            hits.push({ chat: c.title || c.id, role: m.role, text: t.slice(0, 120) });
        });
      }
      box.textContent = hits.length
        ? hits.slice(0, 30).map(function (h) { return "[" + h.chat + "] " + (h.role || "") + ": " + h.text; }).join("\n")
        : "\u041d\u0435\u0442 \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u0439";
    } catch (e) { box.textContent = String(e.message || e); }
  }

  async function exportActiveChat() {
    if (!G.AKSI_CHATS) return alert("Chats module missing");
    try {
      var id = AKSI_CHATS.getActiveId();
      if (!id) await AKSI_CHATS.ensureActive();
      id = AKSI_CHATS.getActiveId();
      var chat = await AKSI_CHATS.get(id);
      var msgs = await AKSI_CHATS.getMessages(id, 500);
      var payload = { aksi: "chat-export", version: VER, exportedAt: new Date().toISOString(), chat: chat, messages: msgs };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "aksi-chat-" + (chat && chat.title ? chat.title : id).replace(/\s+/g, "_") + ".json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    } catch (e) { alert(e.message || e); }
  }

  function wireMemExtras() {
    var box = $("chatList");
    if (!box || box.__v60) return;
    box.__v60 = 1;
    var bar = document.createElement("div");
    bar.id = "chatTools";
    bar.innerHTML =
      '<input class="box" id="chatSearchIn" placeholder="\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0432\u0441\u0435\u043c \u0447\u0430\u0442\u0430\u043c\u2026">' +
      '<div class="row"><button type="button" class="btn" id="btnChatSearch">\u041d\u0430\u0439\u0442\u0438</button>' +
      '<button type="button" class="btn" id="btnChatExport">Export \u0447\u0430\u0442\u0430</button></div>' +
      '<pre id="chatSearchOut" class="muted" style="white-space:pre-wrap;margin-top:6px"></pre>';
    if (box.parentNode) box.parentNode.insertBefore(bar, box);
    var si = $("chatSearchIn");
    if ($("btnChatSearch")) $("btnChatSearch").onclick = function () { searchAllChats(si && si.value); };
    if (si) si.addEventListener("keydown", function (e) { if (e.key === "Enter") searchAllChats(si.value); });
    if ($("btnChatExport")) $("btnChatExport").onclick = exportActiveChat;
  }

  function patchWelcome() {
    var th = $("thread");
    if (!th) return;
    if (th.children.length === 1) {
      var t = th.textContent || "";
      if (/v5[0-7]|Pulse|v35/.test(t) && !/v60/.test(t)) th.innerHTML = "";
    }
    if (th.children.length) return;
    var d = document.createElement("div");
    d.className = "msg ai";
    d.innerHTML =
      '<div class="bub">\u0410\u041a\u0421\u0418 v60 \u2014 \u0433\u043e\u0442\u043e\u0432\u044b\u0439 offline-\u043f\u0440\u043e\u0434\u0443\u043a\u0442\n\n' +
      "\u2713 Chat \u00b7 Mind L2 + Neuro\n\u2713 Mem \u00b7 RAG + multi-chat\n\u2713 Local \u00b7 WebLLM\n" +
      "\u2713 Trust \u00b7 AES vault\n\u2713 Lab \u00b7 Quantum QCLI\n\u2713 Stats \u00b7 P2P\n\naksilove@internet.ru</div>";
    th.appendChild(d);
  }

  function ensurePriority() {
    if (G.AKSI_PRIORITY_ANSWER) return;
    G.AKSI_PRIORITY_ANSWER = function (q) {
      q = String(q || "").trim();
      if (!q) return null;
      try {
        if (G.AKSI_MIND_L2 && AKSI_MIND_L2.think) {
          var r = AKSI_MIND_L2.think(q);
          if (r && r.text && (r.confidence >= 0.85 || (r.intent && r.intent !== "general")))
            return { text: r.text, source: "mind-l2" };
        }
      } catch (e) {}
      try {
        if (G.AKSI_NEURO && AKSI_NEURO.think) {
          var n = AKSI_NEURO.think(q);
          if (n && n.text && n.text.length > 20) return { text: n.text, source: "neuro" };
        }
      } catch (e2) {}
      return null;
    };
  }

  function boot() {
    injectChatCSS();
    ensurePriority();
    patchWelcome();
    wireMemExtras();
    statusBoard();
    setTimeout(statusBoard, 800);
    setTimeout(statusBoard, 2500);
    setTimeout(wireMemExtras, 600);
    var sub = document.querySelector(".sub");
    if (sub) sub.textContent = "v60 \u00b7 \u0433\u043e\u0442\u043e\u0432\u044b\u0439 \u043f\u0440\u043e\u0434\u0443\u043a\u0442";
    if (document.title) document.title = "\u0410\u041a\u0421\u0418 v60 \u00b7 \u0433\u043e\u0442\u043e\u0432\u044b\u0439 \u043f\u0440\u043e\u0434\u0443\u043a\u0442";
    if ($("modePill")) $("modePill").textContent = navigator.onLine ? "online\u00b7local" : "offline";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  G.AKSI_PRODUCT = G.AKSI_PRODUCT || {};
  G.AKSI_PRODUCT.version = VER;
  G.AKSI_PRODUCT.statusBoard = statusBoard;
  G.AKSI_PRODUCT.exportActiveChat = exportActiveChat;
  G.AKSI_PRODUCT.searchAllChats = searchAllChats;
})(typeof window !== "undefined" ? window : globalThis);
