/**
 * AKSI ONE fixes (load after one + mind + ux)
 * Safe HTML escape · Route think → MIND · rebind ask
 */
(function (G) {
  "use strict";
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function safeBubble(role, text, meta) {
    var th = document.getElementById("thread");
    if (!th) return;
    var d = document.createElement("div");
    d.className = "msg " + (role === "me" ? "me" : "ai");
    var m = meta != null && String(meta).length ? '<div class="meta">' + esc(meta) + "</div>" : "";
    d.innerHTML = '<div class="bub">' + esc(text) + m + "</div>";
    th.appendChild(d);
    try { th.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" }); } catch (e) {}
  }
  function apply() {
    if (!G.AKSI_ONE) return false;
    if (G.AKSI_ONE._allFixed) return true;
    if (!G.AKSI_ONE._mindRouteFixed && typeof G.AKSI_ONE.think === "function") {
      var origThink = G.AKSI_ONE.think;
      G.AKSI_ONE.think = function (q) {
        q = String(q || "").trim();
        if (!q) return Promise.resolve({ text: "Пустой запрос.", meta: "one" });
        if (G.AKSI_MIND && typeof G.AKSI_MIND.think === "function" && !G.AKSI_ONE.think._viaMind) {
          return G.AKSI_MIND.think(q).then(function (r) {
            if (r && r.text) return r;
            return origThink(q);
          }).catch(function () { return origThink(q); });
        }
        return origThink(q);
      };
      G.AKSI_ONE._mindRouteFixed = true;
    }
    if (typeof G.AKSI_ONE.ask === "function" && !G.AKSI_ONE._askSafe) {
      var busy = false;
      G.AKSI_ONE.ask = function (q) {
        if (busy) return;
        q = String(q || "").trim();
        if (!q) return;
        busy = true;
        safeBubble("me", q);
        var inp = document.getElementById("inp");
        if (inp) inp.value = "";
        var badge = document.getElementById("stBadge");
        if (badge) badge.textContent = "…";
        G.AKSI_ONE.think(q).then(function (res) {
          busy = false;
          var text = (res && res.text) || "…";
          var meta = (res && res.meta) || "one";
          if (res && res.trust && res.trust.trust) meta += " · trust:" + res.trust.trust;
          var qx = res && res.quantum;
          var qv = qx && (qx.QCLI != null ? qx.QCLI : qx.qcli);
          if (qv != null) meta += " · Q" + qv;
          safeBubble("ai", text, meta);
          if (badge) badge.textContent = "готова";
        }).catch(function (e) {
          busy = false;
          safeBubble("ai", "Сбой: " + (e && e.message ? e.message : e), "error");
          if (badge) badge.textContent = "ошибка";
        });
      };
      var send = document.getElementById("send");
      var inp2 = document.getElementById("inp");
      if (send) {
        send.onclick = function (e) {
          e.preventDefault();
          G.AKSI_ONE.ask(inp2 && inp2.value);
        };
      }
      G.AKSI_ONE._askSafe = true;
    }
    G.AKSI_ONE.version = (G.AKSI_ONE.version || "") + "+fix";
    G.AKSI_ONE._allFixed = true;
    return true;
  }
  function run(n) {
    n = n || 0;
    if (!apply() && n < 50) setTimeout(function () { run(n + 1); }, 80);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { run(0); });
  else run(0);
})(window);
