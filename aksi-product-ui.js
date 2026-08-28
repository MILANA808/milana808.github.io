/**
 * AKSI Product UI — proof demo, export, teach, compare, share, passport
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-product-ui";
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
      el.style.cssText = "position:fixed;left:50%;bottom:calc(72px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:200;padding:12px 18px;border-radius:14px;background:rgba(30,27,42,.95);border:1px solid rgba(167,139,250,.35);color:#f5f3ff;font:600 13px/1.3 system-ui;max-width:90%;box-shadow:0 12px 40px rgba(0,0,0,.4);opacity:0;transition:opacity .2s";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = "0"; }, 2800);
  }
  function pulse(el) {
    if (!el) return;
    el.animate([{ transform: "scale(1)" }, { transform: "scale(0.96)" }, { transform: "scale(1)" }], { duration: 160, easing: "ease-out" });
  }
  function runProofDemo() {
    var box = document.getElementById("proofDemoOut");
    if (box) box.innerHTML = '<div class="skel"></div>';
    var was = G.AKSI_WEB && G.AKSI_WEB.isEnabled && G.AKSI_WEB.isEnabled();
    if (G.AKSI_WEB && G.AKSI_WEB.setEnabled) G.AKSI_WEB.setEnabled(false);
    var q = "Who are you? / Кто ты?";
    var t0 = performance.now();
    var think = (G.AKSI_MIND && G.AKSI_MIND.think) || (G.AKSI_ONE && G.AKSI_ONE.thinkLocal) || function () {
      return Promise.resolve({ text: "AKSI local runtime.", meta: "local", offline: true });
    };
    return Promise.resolve(think.call(G.AKSI_MIND || G.AKSI_ONE, q)).then(function (r) {
      var ms = Math.round(performance.now() - t0);
      var text = (r && r.text) || "…";
      var meta = (r && r.meta) || "local";
      var html =
        '<div class="proof-card">' +
        '<div class="proof-badge">LOCAL · ' + ms + " ms · no network</div>" +
        "<p>" + esc(text.slice(0, 420)) + (text.length > 420 ? "…" : "") + "</p>" +
        '<div class="proof-meta">source: ' + esc(meta) + " · consent: off</div>" +
        "</div>";
      if (box) box.innerHTML = html;
      toast("Proof: ответ без сети");
      if (G.AKSI_WEB && G.AKSI_WEB.setEnabled) G.AKSI_WEB.setEnabled(!!was);
      return { ms: ms, offline: true, text: text };
    }).catch(function (e) {
      if (box) box.innerHTML = '<p class="muted">' + esc(e.message || e) + "</p>";
      if (G.AKSI_WEB && G.AKSI_WEB.setEnabled) G.AKSI_WEB.setEnabled(!!was);
    });
  }
  function compareOfflineOnline() {
    var box = document.getElementById("proofDemoOut");
    var q = (document.getElementById("compareQ") && document.getElementById("compareQ").value) || "what is photosynthesis";
    if (box) box.innerHTML = '<div class="skel"></div><div class="skel" style="margin-top:8px"></div>';
    function one(label, enabled) {
      if (G.AKSI_WEB && G.AKSI_WEB.setEnabled) G.AKSI_WEB.setEnabled(enabled);
      var t0 = performance.now();
      var think = G.AKSI_MIND && G.AKSI_MIND.think ? G.AKSI_MIND.think : G.AKSI_ONE && G.AKSI_ONE.think;
      if (!think) return Promise.resolve({ label: label, text: "—", ms: 0, meta: "" });
      return think.call(G.AKSI_MIND || G.AKSI_ONE, q).then(function (r) {
        return {
          label: label,
          text: (r && r.text) || "…",
          meta: (r && r.meta) || "",
          ms: Math.round(performance.now() - t0),
        };
      });
    }
    return one("OFFLINE", false).then(function (off) {
      return one("ONLINE", true).then(function (on) {
        if (G.AKSI_WEB && G.AKSI_WEB.setEnabled) G.AKSI_WEB.setEnabled(false);
        if (typeof G.__aksiSyncNet === "function") G.__aksiSyncNet();
        if (box) {
          box.innerHTML =
            '<div class="compare-grid">' +
            '<div class="proof-card"><div class="proof-badge">OFFLINE · ' + off.ms + ' ms</div><p>' + esc(off.text.slice(0, 360)) + '</p><div class="proof-meta">' + esc(off.meta) + '</div></div>' +
            '<div class="proof-card"><div class="proof-badge on">ONLINE · ' + on.ms + ' ms</div><p>' + esc(on.text.slice(0, 360)) + '</p><div class="proof-meta">' + esc(on.meta) + '</div></div>' +
            '</div>';
        }
        toast("Сравнение offline vs online");
      });
    });
  }
  function exportProofSession() {
    var ledger = [];
    try { ledger = JSON.parse(localStorage.getItem("aksi_proof_ledger_v1") || "[]"); } catch (e) {}
    var mem = [];
    try { mem = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]"); } catch (e) {}
    var did = "did:aksi:local";
    try { did = localStorage.getItem("aksi_did_v1") || did; } catch (e) {}
    var net = !!(G.AKSI_WEB && G.AKSI_WEB.isEnabled && G.AKSI_WEB.isEnabled());
    var payload = {
      type: "AKSI-SESSION-PROOF",
      version: VER,
      exported_at: new Date().toISOString(),
      did: did,
      network_consent: net,
      precedent: "https://milana808.github.io/PRECEDENT.json",
      memory_count: mem.length,
      ledger_tail: ledger.slice(-20),
      runtime: "https://milana808.github.io/",
      contact: "aksilove@internet.ru",
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aksi-session-proof-" + Date.now() + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast("Session proof exported");
    return payload;
  }
  function sessionPassport() {
    var did = "did:aksi:local";
    try { did = localStorage.getItem("aksi_did_v1") || did; } catch (e) {}
    var net = !!(G.AKSI_WEB && G.AKSI_WEB.isEnabled && G.AKSI_WEB.isEnabled());
    var memN = 0;
    try { memN = (JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]") || []).length; } catch (e) {}
    return { did: did, network: net ? "consent:on" : "consent:off", memory: memN, precedent: "aksi-offline-first-consent-2026-08" };
  }
  function teachFlow(fact) {
    fact = String(fact || "").trim();
    if (!fact) { toast("Введите факт"); return Promise.resolve(null); }
    if (G.AKSI_ONE && G.AKSI_ONE.remember) G.AKSI_ONE.remember(fact, "user");
    if (G.AKSI_BRAIN && G.AKSI_BRAIN.teach) G.AKSI_BRAIN.teach(fact);
    toast("Запомнено");
    return Promise.resolve({ ok: true, fact: fact });
  }
  function shareDemo() {
    var text =
      "АКСИ — local-first ИИ в браузере.\n" +
      "Offline by default · интернет только по согласию.\n" +
      "PRECEDENT: https://milana808.github.io/PRECEDENT.json\n" +
      "Демо: https://milana808.github.io/";
    if (navigator.share) {
      return navigator.share({ title: "AKSI", text: text, url: "https://milana808.github.io/" }).catch(function () {});
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { toast("Скопировано — X / HN"); });
    }
    toast("milana808.github.io");
  }
  function installPWA() {
    if (G.__aksiDeferredPrompt) {
      G.__aksiDeferredPrompt.prompt();
      return G.__aksiDeferredPrompt.userChoice.then(function () { G.__aksiDeferredPrompt = null; });
    }
    toast("В браузере: Добавить на экран");
  }
  function wire() {
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      G.__aksiDeferredPrompt = e;
      var b = document.getElementById("btnInstall");
      if (b) b.hidden = false;
    });
    var map = {
      btnProofDemo: runProofDemo,
      btnCompare: compareOfflineOnline,
      btnExportProof: exportProofSession,
      btnShare: shareDemo,
      btnInstall: installPWA,
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", function () { pulse(el); map[id](); });
    });
    var teachBtn = document.getElementById("btnTeach");
    var teachIn = document.getElementById("teachIn");
    if (teachBtn && teachIn) {
      teachBtn.addEventListener("click", function () {
        pulse(teachBtn);
        teachFlow(teachIn.value).then(function () { teachIn.value = ""; });
      });
    }
    var pass = document.getElementById("passportOut");
    if (pass) {
      var p = sessionPassport();
      pass.textContent = p.did + " · " + p.network + " · mem:" + p.memory;
    }
  }
  G.AKSI_PRODUCT_UI = {
    version: VER,
    runProofDemo: runProofDemo,
    compareOfflineOnline: compareOfflineOnline,
    exportProofSession: exportProofSession,
    sessionPassport: sessionPassport,
    teachFlow: teachFlow,
    shareDemo: shareDemo,
    installPWA: installPWA,
    toast: toast,
    wire: wire,
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})(typeof window !== "undefined" ? window : this);
