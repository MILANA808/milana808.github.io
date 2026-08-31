/**
 * AKSI Client Boot — Local LLM stream + RAG + Trust vault + Perf
 * After: aksi-webllm, aksi-rag, aksi-trust-vault, aksi-perf
 */
(function (G) {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    if (G.AKSI_SECURITY && AKSI_SECURITY.esc) return AKSI_SECURITY.esc(s);
    return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function set(el, t) { if (el) el.textContent = t == null ? "" : String(t); }

  function refreshMemList() {
    var list = $("memList"), n = $("memN");
    if (!G.AKSI_RAG) { if (list) list.innerHTML = '<p class="muted">RAG missing</p>'; return; }
    var items = AKSI_RAG.list();
    if (n) n.textContent = String(items.length);
    if (!list) return;
    if (!items.length) { list.innerHTML = '<p class="muted">Пусто. «Учить» добавит факт в векторную память.</p>'; return; }
    list.innerHTML = items.slice().reverse().slice(0, 40).map(function (d) {
      return '<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div style="font-size:13px">' +
        esc(d.text.slice(0, 220)) + (d.text.length > 220 ? "…" : "") +
        '</div><div class="muted" style="font-size:11px">' + new Date(d.ts).toLocaleString() +
        ' <button type="button" data-rag-del="' + esc(d.id) + '" class="btn" style="min-height:28px;padding:4px 8px">×</button></div></div>';
    }).join("");
    list.querySelectorAll("[data-rag-del]").forEach(function (btn) {
      btn.onclick = function () { AKSI_RAG.remove(btn.getAttribute("data-rag-del")); refreshMemList(); };
    });
  }

  async function askLocal(q) {
    q = String(q || "").trim();
    if (!q) return;
    var ans = $("localAns"), meta = $("localMeta");
    if (ans) { ans.style.display = "block"; ans.textContent = "…"; }
    var ctx = "", hitsN = 0;
    try {
      if (G.AKSI_RAG) {
        var b = await AKSI_RAG.buildContext(q, 4);
        ctx = b.context || ""; hitsN = (b.hits && b.hits.length) || 0;
      }
    } catch (e) {}
    set(meta, hitsN ? "RAG " + hitsN + " · generate…" : "generate…");
    var st = G.AKSI_WEBLLM && AKSI_WEBLLM.status && AKSI_WEBLLM.status();
    if (st && st.ready && AKSI_WEBLLM.completeStream) {
      try {
        if (ans) ans.textContent = "";
        var result = await AKSI_WEBLLM.completeStream(q, {
          context: ctx,
          onDelta: function (full) { if (ans) ans.textContent = full; },
          max_tokens: 600
        });
        set(meta, (result.meta || "webllm") + (result.tps != null ? " · " + result.tps + " tok/s" : "") + (hitsN ? " · RAG " + hitsN : ""));
        refreshStats();
        return;
      } catch (e) { set(meta, "LLM: " + (e.message || e)); }
    }
    var text = ctx ? "Из памяти:\n" + ctx + "\n\n" : "";
    try {
      if (G.AKSI_CORE_AI && AKSI_CORE_AI.think) {
        var r = AKSI_CORE_AI.think(q); text += (r && r.text) || ""; set(meta, (r && r.meta) || "core");
      } else if (G.AKSI_NEURO && AKSI_NEURO.think) {
        var r2 = AKSI_NEURO.think(q); text += (r2 && r2.text) || ""; set(meta, "neuro");
      } else text += "Загрузите LLM на вкладке Local.";
    } catch (e2) { text += String(e2.message || e2); }
    if (ans) ans.textContent = text || "—";
  }

  function wireLocal() {
    if (navigator.gpu) {
      navigator.gpu.requestAdapter().then(function (a) {
        set($("wlGpu"), a ? "да" : "нет");
        set($("localCaps"), a ? "WebGPU OK · можно грузить WebLLM" : "Нет WebGPU · fallback Neuro");
      }).catch(function () { set($("wlGpu"), "нет"); });
    } else { set($("wlGpu"), "нет"); set($("localCaps"), "WebGPU недоступен"); }

    var loadBtn = $("wlLoad");
    if (loadBtn) loadBtn.onclick = async function () {
      if (!G.AKSI_WEBLLM) { set($("wlOut"), "webllm missing"); return; }
      var model = ($("wlModel") && $("wlModel").value) || "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
      loadBtn.disabled = true; set($("wlState"), "loading"); set($("wlOut"), "Loading " + model);
      try {
        await AKSI_WEBLLM.loadModel(model, function () {
          var st = AKSI_WEBLLM.status();
          set($("wlState"), st.loading ? st.progress + "%" : "ready");
          set($("wlOut"), (st.message || "") + "\n" + (st.model || model));
          if (G.AKSI_PERF) AKSI_PERF.setLoadProgress(st.progress || 0, st.message);
          refreshStats();
        });
        set($("wlState"), "READY"); set($("wlOut"), "Модель готова");
      } catch (e) { set($("wlOut"), String(e.message || e)); set($("wlState"), "error"); }
      loadBtn.disabled = false;
    };
    if ($("wlUnload")) $("wlUnload").onclick = function () {
      if (G.AKSI_WEBLLM && AKSI_WEBLLM.unload) AKSI_WEBLLM.unload();
      set($("wlState"), "idle"); set($("wlOut"), "unloaded");
    };
    if ($("localAsk")) $("localAsk").onclick = function () { askLocal($("localQ") && $("localQ").value); };
    if ($("localQ")) $("localQ").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askLocal($("localQ").value); }
    });
    G.AKSI_CLIENT_ASK = askLocal;
  }

  function wireMem() {
    if ($("btnTeach")) $("btnTeach").onclick = async function () {
      var v = (($("teachIn") && $("teachIn").value) || "").replace(/^(?:запомни|выучи)\s*[:：]\s*/i, "").trim();
      if (!v || !G.AKSI_RAG) return;
      $("btnTeach").disabled = true;
      try {
        await AKSI_RAG.add(v);
        if ($("teachIn")) $("teachIn").value = "";
        refreshMemList();
        try { if (G.AKSI_SECURE_MEM && AKSI_SECURE_MEM.addFact) await AKSI_SECURE_MEM.addFact(v); } catch (e) {}
      } catch (e) { alert(e.message || e); }
      $("btnTeach").disabled = false;
    };
    if ($("btnWipe")) $("btnWipe").onclick = function () {
      if (confirm("Очистить векторную память?") && G.AKSI_RAG) { AKSI_RAG.clear(); refreshMemList(); }
    };
    refreshMemList();
  }

  function wireTrust() {
    function status(m) { set($("pqStatus"), m); }
    if ($("pqExport")) $("pqExport").onclick = async function () {
      try {
        var pw = prompt("Пароль для .aksi экспорта:", "");
        if (pw == null) return;
        status("encrypt…");
        var r = await AKSI_TRUST_VAULT.exportEncrypted(pw);
        status("Export OK · " + r.docs + " docs");
      } catch (e) { status(String(e.message || e)); alert(e.message || e); }
    };
    if ($("pqSeal")) $("pqSeal").onclick = async function () {
      try {
        var pw = prompt("Пароль AES-GCM:", "");
        if (pw == null) return;
        var plain = AKSI_RAG.exportPlain();
        var env = await AKSI_TRUST_VAULT.seal(plain, pw);
        if ($("pqEnv")) $("pqEnv").value = JSON.stringify(env, null, 2);
        status("Sealed · " + (plain.docs && plain.docs.length) + " docs");
      } catch (e) { status(String(e.message || e)); alert(e.message || e); }
    };
    if ($("pqOpen")) $("pqOpen").onclick = async function () {
      try {
        var envRaw = ($("pqEnv") && $("pqEnv").value) || "", env;
        if (envRaw.trim()) env = JSON.parse(envRaw);
        else {
          var input = document.createElement("input"); input.type = "file"; input.accept = ".aksi,.json";
          env = await new Promise(function (res, rej) {
            input.onchange = function () {
              var f = input.files && input.files[0];
              if (!f) return rej(new Error("no file"));
              AKSI_TRUST_VAULT.readFileAsJson(f).then(res, rej);
            };
            input.click();
          });
        }
        var pw = prompt("Пароль:", "");
        if (pw == null) return;
        var r = await AKSI_TRUST_VAULT.importEncrypted(env, pw);
        refreshMemList(); status("Import OK · " + r.docs);
      } catch (e) { status(String(e.message || e)); alert(e.message || e); }
    };
    if ($("pqBoot")) $("pqBoot").onclick = function () {
      status(JSON.stringify({
        rag: G.AKSI_RAG && AKSI_RAG.status(),
        vault: !!G.AKSI_TRUST_VAULT,
        webllm: G.AKSI_WEBLLM && AKSI_WEBLLM.status(),
        crypto: !!(crypto && crypto.subtle)
      }, null, 2));
    };
  }

  function refreshStats() {
    var box = $("statsBox");
    if (box && G.AKSI_PERF) AKSI_PERF.renderInto(box);
  }
  function wireStats() {
    refreshStats();
    document.addEventListener("aksi-perf", refreshStats);
  }

  function wireChatBridge() {
    if (!G.AKSI_ORGANISM || G.AKSI_ORGANISM.__clientPatched) return;
    var orig = G.AKSI_ORGANISM.think;
    if (typeof orig !== "function") return;
    G.AKSI_ORGANISM.__clientPatched = true;
    G.AKSI_ORGANISM.think = async function (query) {
      var q = String(query || "").trim();
      var st = G.AKSI_WEBLLM && AKSI_WEBLLM.status && AKSI_WEBLLM.status();
      if (st && st.ready && AKSI_WEBLLM.completeStream) {
        try {
          var ctx = "";
          if (G.AKSI_RAG) { var b = await AKSI_RAG.buildContext(q, 4); ctx = b.context || ""; }
          var result = await AKSI_WEBLLM.completeStream(q, { context: ctx, max_tokens: 600 });
          return { text: result.text, meta: (result.meta || "webllm") + (result.tps ? " · " + result.tps + " tok/s" : ""), source: "webllm" };
        } catch (e) { console.warn(e); }
      }
      return orig.call(G.AKSI_ORGANISM, query);
    };
  }

  function boot() {
    try { wireLocal(); } catch (e) { console.warn(e); }
    try { wireMem(); } catch (e) { console.warn(e); }
    try { wireTrust(); } catch (e) { console.warn(e); }
    try { wireStats(); } catch (e) { console.warn(e); }
    try { wireChatBridge(); } catch (e) { console.warn(e); }
    setTimeout(wireChatBridge, 600);
    setTimeout(refreshMemList, 200);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  G.AKSI_CLIENT = { refreshMemList: refreshMemList, refreshStats: refreshStats, boot: boot };
})(typeof window !== "undefined" ? window : globalThis);
