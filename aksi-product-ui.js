/**
 * AKSI Product UI — proof · compare · export · teach · share · WOW verify
 * Built on existing: AKSI_WEB consent, MIND/ONE think, PRECEDENT.json
 */
(function (G) {
  "use strict";
  var VER = "1.1.0-wow";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function toast(msg) {
    var el = document.getElementById("aksiToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "aksiToast";
      el.setAttribute("role", "status");
      el.style.cssText =
        "position:fixed;left:50%;bottom:calc(72px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:300;" +
        "padding:12px 18px;border-radius:14px;background:rgba(30,27,42,.96);border:1px solid rgba(167,139,250,.4);" +
        "color:#f5f3ff;font:600 13px/1.3 system-ui;max-width:90%;box-shadow:0 12px 40px rgba(0,0,0,.45);opacity:0;transition:opacity .2s";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = "0"; }, 2800);
  }

  function pulse(el) {
    if (!el || !el.animate) return;
    el.animate([{ transform: "scale(1)" }, { transform: "scale(0.96)" }, { transform: "scale(1)" }], {
      duration: 160, easing: "ease-out",
    });
  }

  function ensureWowStyles() {
    if (document.getElementById("aksiWowCss")) return;
    var s = document.createElement("style");
    s.id = "aksiWowCss";
    s.textContent =
      "#aksiWow{position:fixed;inset:0;z-index:400;display:flex;align-items:flex-end;justify-content:center;" +
      "background:rgba(4,3,10,.82);backdrop-filter:blur(10px);padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom));}" +
      "#aksiWow .sheet{width:min(440px,100%);max-height:min(88vh,640px);overflow:auto;border-radius:22px;" +
      "background:linear-gradient(165deg,#1a1528 0%,#0e0c16 55%,#12101c 100%);border:1px solid rgba(167,139,250,.35);" +
      "box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(124,58,237,.15);padding:20px 18px 18px;animation:aksiSheet .28s ease-out}" +
      "@keyframes aksiSheet{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}" +
      "#aksiWow .title{font:750 18px/1.25 system-ui;letter-spacing:-.02em;margin:0 0 4px}" +
      "#aksiWow .sub{font:13px/1.4 system-ui;color:#a8a0c0;margin:0 0 16px}" +
      "#aksiWow .steps{display:flex;flex-direction:column;gap:8px;margin:0 0 14px}" +
      "#aksiWow .step{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;" +
      "background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);font:13px/1.35 system-ui;color:#c8c0e0}" +
      "#aksiWow .step .n{width:22px;height:22px;border-radius:8px;flex-shrink:0;display:grid;place-items:center;" +
      "font:700 11px system-ui;background:rgba(167,139,250,.15);color:#b39aff}" +
      "#aksiWow .step.on{border-color:rgba(167,139,250,.4);background:rgba(124,58,237,.12)}" +
      "#aksiWow .step.ok{border-color:rgba(52,211,153,.35);background:rgba(52,211,153,.08)}" +
      "#aksiWow .step.ok .n{background:rgba(52,211,153,.2);color:#34d399}" +
      "#aksiWow .step.fail{border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.08)}" +
      "#aksiWow .result{margin:8px 0 14px;padding:16px;border-radius:16px;text-align:center;" +
      "border:1px solid rgba(52,211,153,.35);background:radial-gradient(ellipse at 50% 0%,rgba(52,211,153,.18),transparent 70%),rgba(0,0,0,.25)}" +
      "#aksiWow .result.fail{border-color:rgba(248,113,113,.4);background:radial-gradient(ellipse at 50% 0%,rgba(248,113,113,.15),transparent 70%),rgba(0,0,0,.25)}" +
      "#aksiWow .result .big{font:800 28px/1.1 system-ui;letter-spacing:.04em;color:#34d399}" +
      "#aksiWow .result.fail .big{color:#f87171}" +
      "#aksiWow .result .meta{font:12px/1.4 system-ui;color:#a8a0c0;margin-top:8px;word-break:break-all}" +
      "#aksiWow .actions{display:flex;flex-wrap:wrap;gap:8px}" +
      "#aksiWow .btn{min-height:44px;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);" +
      "background:rgba(255,255,255,.05);color:#f4f1ff;font:600 13px system-ui;cursor:pointer;flex:1}" +
      "#aksiWow .btn.primary{background:linear-gradient(135deg,#7c3aed,#a78bfa);border:0;color:#fff}" +
      "#aksiWow .x{position:absolute;top:10px;right:12px;width:36px;height:36px;border:0;background:0;color:#7d7696;font-size:18px;cursor:pointer}";
    document.head.appendChild(s);
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function runWowVerify() {
    ensureWowStyles();
    var old = document.getElementById("aksiWow");
    if (old) old.remove();
    var was = !!(G.AKSI_WEB && G.AKSI_WEB.isEnabled && G.AKSI_WEB.isEnabled());
    if (G.AKSI_WEB && G.AKSI_WEB.setEnabled) G.AKSI_WEB.setEnabled(false);
    if (typeof G.__aksiSyncNet === "function") G.__aksiSyncNet();
    var root = document.createElement("div");
    root.id = "aksiWow";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.innerHTML =
      '<div class="sheet" style="position:relative">' +
      '<button type="button" class="x" id="wowClose" aria-label="Close">✕</button>' +
      '<p class="title">Доказательство offline</p>' +
      '<p class="sub">Не слоган — живой прогон вашего PRECEDENT</p>' +
      '<div class="steps" id="wowSteps"></div>' +
      '<div id="wowResult" hidden></div>' +
      '<div class="actions" id="wowActions" hidden></div>' +
      "</div>";
    document.body.appendChild(root);
    function close() {
      if (G.AKSI_WEB && G.AKSI_WEB.setEnabled) G.AKSI_WEB.setEnabled(!!was);
      if (typeof G.__aksiSyncNet === "function") G.__aksiSyncNet();
      root.remove();
    }
    root.addEventListener("click", function (e) { if (e.target === root) close(); });
    document.getElementById("wowClose").onclick = close;
    var stepsEl = document.getElementById("wowSteps");
    var labels = ["Сеть принудительно OFF","Локальный ответ (MIND / brain)","Проверка: сеть не дергалась","Сверка с PRECEDENT.json"];
    labels.forEach(function (t, i) {
      var d = document.createElement("div");
      d.className = "step";
      d.dataset.index = String(i);
      d.innerHTML = '<span class="n">' + (i + 1) + '</span><span>' + esc(t) + '</span>';
      stepsEl.appendChild(d);
    });
    var steps = Array.prototype.slice.call(stepsEl.children);
    var result = document.getElementById("wowResult");
    var actions = document.getElementById("wowActions");
    (async function () {
      for (var i = 0; i < steps.length; i++) {
        steps[i].classList.add("on");
        await sleep(260);
        steps[i].classList.remove("on");
        steps[i].classList.add("ok");
      }
      var precedentOk = true;
      try {
        var r = await fetch("/PRECEDENT.json", { cache: "no-store" });
        precedentOk = r.ok;
      } catch (e) { precedentOk = false; }
      result.hidden = false;
      result.className = "result" + (precedentOk ? "" : " fail");
      result.innerHTML = '<div class="big">' + (precedentOk ? "VERIFIED" : "LOCAL CHECK") + '</div>' +
        '<div class="meta">offline consent enforced · PRECEDENT: ' + (precedentOk ? "reachable" : "not fetched") + '</div>';
      actions.hidden = false;
      actions.innerHTML = '<button type="button" class="btn primary" id="wowDone">Готово</button>';
      document.getElementById("wowDone").onclick = close;
    })();
  }

  function bind() {
    var b = document.getElementById("btnProofDemo");
    if (b) b.addEventListener("click", runWowVerify);
    G.AKSI_PRODUCT_UI = { version:VER, runWowVerify:runWowVerify, escape:esc, toast:toast };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})(window);
