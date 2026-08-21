/**
 * aksi-home-bridge v14 — на главной ответы через AksiProduct + Ed25519
 */
(function () {
  "use strict";
  if (window.__AKSI_HOME_BRIDGE_V14__) return;
  window.__AKSI_HOME_BRIDGE_V14__ = 1;

  function ready(fn) {
    if (document.readyState === "complete") fn();
    else window.addEventListener("load", fn);
  }

  ready(function () {
    var tries = 0;
    (function wait() {
      tries++;
      if (!window.AksiProduct || typeof AksiProduct.answer !== "function") {
        if (tries < 40) return setTimeout(wait, 50);
        return;
      }
      var SEND = document.getElementById("send");
      var INP = document.getElementById("inp");
      var THREAD = document.getElementById("thread");
      var PROG = document.getElementById("prog");
      var STATUS = document.getElementById("status");
      if (!SEND || !INP || !THREAD) return;

      function esc(s) {
        return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      }
      function addMsg(role, text, meta, thought) {
        var div = document.createElement("div");
        div.className = "msg " + (role === "u" ? "u" : "a");
        var html = '<div class="b">' + esc(text) + "</div>";
        if (thought) html += '<div class="thought">💭 ' + esc(thought) + "</div>";
        if (meta) html += '<div class="meta">' + esc(meta) + "</div>";
        div.innerHTML = html;
        THREAD.appendChild(div);
        THREAD.scrollTop = THREAD.scrollHeight;
      }
      function showProg(t) {
        if (!PROG) return;
        if (!t) { PROG.classList.remove("on"); PROG.textContent = ""; return; }
        PROG.textContent = t; PROG.classList.add("on");
      }

      function sendProduct(text) {
        text = (text || INP.value || "").trim();
        if (!text) return;
        INP.value = "";
        addMsg("u", text);
        showProg("Думаю…");
        if (STATUS) STATUS.textContent = "думаю…";
        AksiProduct.answer(text).then(function (res) {
          showProg(null);
          var sig = res.signature || {};
          var meta = (sig.algo || "?") + " " + String(sig.sig || "").slice(0, 16) + "… · " + (sig.realCrypto ? "Ed25519" : "local");
          var thought = (res.steps && res.steps.join(" → ")) || res.source || "";
          addMsg("a", res.text, meta, thought);
          if (STATUS) STATUS.textContent = "готова";
        }).catch(function () {
          showProg(null);
          if (STATUS) STATUS.textContent = "ошибка";
        });
      }

      SEND.onclick = function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        sendProduct();
      };
      INP.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.stopImmediatePropagation();
          sendProduct();
        }
      }, true);

      document.querySelectorAll("[data-q]").forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          sendProduct(b.getAttribute("data-q"));
        }, true);
      });

      if (STATUS) STATUS.textContent = "готова · ядро";
      AksiProduct.init().then(function (info) {
        if (STATUS) STATUS.textContent = "готова" + (info.ed25519 ? " · Ed25519" : "");
      });
    })();
  });
})();
