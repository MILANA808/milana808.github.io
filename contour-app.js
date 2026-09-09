/**
 * AKSI Contour App v240 FAST
 * Critical path: PI → Organism → API → local KB
 * Contact: aksilove@internet.ru
 */
(function () {
  "use strict";
  var VER = "240";
  var lastDecision = null;
  var tBoot = Date.now();

  function $(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }
  function txt(id, v) {
    var el = $(id);
    if (el) el.textContent = v == null ? "" : String(v);
  }
  function on(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, function (e) {
      try { fn(e); } catch (err) {
        console.error("[Contour]", err);
        var box = $("bootErr") || $("derr");
        if (box) box.textContent = "Ошибка: " + (err && err.message ? err.message : err);
      }
    });
  }

  var KB = [
    { q: ["кто ты", "who are you", "привет", "hello"], a: "Я АКСИ — быстрый offline Contour. Decision · π · Vault. Контакт: aksilove@internet.ru" },
    { q: ["формула", "formula"], a: "AKSI = (A × I × S) × (1 + 0.4√n). π-Contour: query→SHA-256→θ∈[0,2π)→seal." },
    { q: ["контур", "contour"], a: "π-Contour — детерминированный путь ответа. Тот же запрос → тот же θ и seal." },
    { q: ["gate", "гейт"], a: "Gate τ ≈ 0.55. Ниже порога — ответ помечается." },
    { q: ["статус", "status", "что умеешь"], a: "Contour Fast v" + VER + ": Decision, Chat, π, Memory, optional WebLLM." },
    { q: ["vault", "память"], a: "Vault — IndexedDB. «запомни: факт»." }
  ];

  function localDecide(q) {
    var ql = String(q || "").toLowerCase();
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].q.length; j++) {
        if (ql.indexOf(KB[i].q[j]) !== -1) {
          return {
            id: "fb-" + Date.now().toString(36),
            answer: KB[i].a,
            anti: "local-fast",
            source: "fallback",
            scores: { aksi: 0.72, eqs: 72, phi: 0.6, qcli: 0.55 },
            gate: { ok: true, reason: "fallback-pass" },
            seal: { kind: "fnv-local", t: Date.now() },
            ms: 0,
            version: "fast-" + VER
          };
        }
      }
    }
    return {
      id: "fb-" + Date.now().toString(36),
      answer: "АКСИ Contour Fast v" + VER + ". Спросите: π, формула, кто ты. Контакт: aksilove@internet.ru",
      anti: "no-kb-hit",
      source: "fallback",
      scores: { aksi: 0.5, eqs: 50, phi: 0.45, qcli: 0.4 },
      gate: { ok: true, reason: "fallback-generic" },
      seal: { kind: "fnv-local", t: Date.now() },
      ms: 0,
      version: "fast-" + VER
    };
  }

  function showPanel(name) {
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("on", p.id === "p-" + name);
    });
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("on", t.getAttribute("data-p") === name);
    });
  }

  function refreshMods() {
    var bits = [
      ["π", !!(window.AKSI_PI_CONTOUR && AKSI_PI_CONTOUR.process)],
      ["API", !!(window.AKSI && AKSI.decide)],
      ["Org", !!window.AKSI_ORGANISM],
      ["Vault", !!(window.AKSI_VAULT && AKSI_VAULT.learn)],
      ["Zero", !!(window.AKSI_ZERO && AKSI_ZERO.think)],
      ["Neuro", !!(window.AKSI_NEURO && AKSI_NEURO.think)],
      ["Dec", !!(window.AKSI_DECISION && AKSI_DECISION.decide)],
      ["LLM", !!(window.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready())]
    ];
    var root = $("modChecks");
    if (root) {
      root.innerHTML = bits.map(function (b) {
        return "<i class='" + (b[1] ? "on" : "") + "'>" + b[0] + "</i>";
      }).join("");
    }
    var p = $("pill");
    if (p) {
      var ms = Date.now() - tBoot;
      var core = bits[0][1] || bits[1][1];
      p.textContent = core ? ("FAST · " + ms + "ms") : "boot…";
    }
  }

  function showDecision(p) {
    lastDecision = p;
    var dout = $("dout");
    if (dout) dout.hidden = false;
    txt("danswer", p.answer || "");
    txt("danti", p.anti || "");
    txt("vAksi", p.scores && p.scores.aksi != null ? p.scores.aksi : "—");
    txt("vEqs", p.scores && p.scores.eqs != null ? p.scores.eqs : "—");
    txt("vPhi", p.scores && p.scores.phi != null ? p.scores.phi : "—");
    txt("vQcli", p.scores && p.scores.qcli != null ? p.scores.qcli : "—");
    var g = $("dgate");
    if (g) {
      if (p.gate && p.gate.ok) {
        g.className = "gate ok";
        g.textContent = "Gate: ПРИНЯТО — " + (p.gate.reason || "");
      } else {
        g.className = "gate no";
        g.textContent = "Gate: ОТКЛОНЕНО — " + ((p.gate && p.gate.reason) || "");
      }
    }
    txt("dseal", JSON.stringify(p.seal || {}, null, 2));
    txt("dmeta", (p.ms != null ? p.ms + " ms · " : "") + "source " + (p.source || "—") + " · " + (p.version || ""));
  }

  async function runDecision(q) {
    q = (q != null ? q : ($("dq") && $("dq").value) || "").trim();
    if (!q) return;
    txt("derr", "");
    var btn = $("dgo");
    if (btn) btn.disabled = true;
    var t0 = Date.now();
    try {
      var p = null;
      if (window.AKSI_PI_CONTOUR && AKSI_PI_CONTOUR.process && /π|\bpi\b|пи\b|контур|формул/i.test(q)) {
        try {
          var pr = await AKSI_PI_CONTOUR.process(q);
          if (pr && pr.answer) {
            p = {
              id: "pi-" + Date.now().toString(36),
              answer: pr.answer,
              anti: "π · θ=" + ((pr.features && pr.features.theta != null) ? pr.features.theta.toFixed(4) : "?"),
              source: "pi-contour",
              scores: pr.scores || {},
              gate: pr.gate || { ok: true, reason: "pi-pass" },
              seal: pr.seal,
              version: pr.version,
              ms: Date.now() - t0
            };
          }
        } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI && AKSI.decide) {
        try { p = await AKSI.decide(q); if (p) p.ms = Date.now() - t0; } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI_ORGANISM && AKSI_ORGANISM.decide) {
        try { p = await AKSI_ORGANISM.decide(q); if (p) p.ms = Date.now() - t0; } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI_ZERO && AKSI_ZERO.think) {
        try {
          var z = await Promise.resolve(AKSI_ZERO.think(q));
          if (z && (z.answer || z.text)) {
            p = {
              id: "z" + Date.now(),
              answer: z.answer || z.text,
              anti: "zero",
              source: "zero",
              scores: { aksi: 0.65, eqs: 65, phi: 0.5, qcli: 0.5 },
              gate: { ok: true, reason: "zero" },
              seal: z.seal || null,
              ms: Date.now() - t0
            };
          }
        } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI_NEURO && AKSI_NEURO.think) {
        try {
          var n = await Promise.resolve(AKSI_NEURO.think(q));
          if (n && (n.text || n.answer)) {
            p = {
              id: "n" + Date.now(),
              answer: n.text || n.answer,
              anti: "neuro",
              source: "neuro",
              scores: { aksi: n.score || 0.6, eqs: Math.round((n.score || 0.6) * 100), phi: 0.5, qcli: 0.5 },
              gate: { ok: true, reason: "neuro" },
              seal: null,
              ms: Date.now() - t0
            };
          }
        } catch (e) {}
      }
      if (!p || !p.answer) {
        p = localDecide(q);
        p.ms = Date.now() - t0;
      }
      showDecision(p);
    } catch (e) {
      txt("derr", String(e && e.message || e));
      var fb = localDecide(q);
      fb.ms = Date.now() - t0;
      showDecision(fb);
    } finally {
      if (btn) btn.disabled = false;
      refreshMods();
    }
  }

  function renderStates(list) {
    var root = $("sstates");
    var box = $("sbox");
    if (!root) return;
    root.innerHTML = "";
    if (box) box.hidden = false;
    (list || []).forEach(function (s) {
      var d = document.createElement("div");
      d.className = "st" + (s.selected ? " sel" : "");
      var prob = s.prob != null ? s.prob : 0;
      d.innerHTML =
        "<div class='top'><span>|" + (s.i != null ? s.i : "?") + "⟩ · " + (s.source || "") +
        "</span><span>P=" + prob + "</span></div>" +
        "<div class='bar'><i style='width:" + Math.round(prob * 100) + "%'></i></div>" +
        "<div style='font-size:13px;white-space:pre-wrap'></div>";
      d.querySelector("div:last-child").textContent = s.text || "";
      root.appendChild(d);
    });
  }

  async function runSuperpose(q) {
    q = (q != null ? q : ($("sq") && $("sq").value) || "").trim();
    if (!q) return;
    txt("serr", "");
    txt("sphase", "…");
    var sans = $("sansBox");
    if (sans) sans.hidden = true;
    var btn = $("sgo");
    if (btn) btn.disabled = true;
    try {
      var d = null;
      if (window.AKSI && AKSI.decide) d = await AKSI.decide(q);
      if ((!d || !d.answer) && window.AKSI_ORGANISM && AKSI_ORGANISM.decide) d = await AKSI_ORGANISM.decide(q);
      if (!d || !d.answer) d = localDecide(q);
      if (sans) sans.hidden = false;
      txt("sanswer", d.answer);
      txt("smeta", JSON.stringify({ source: d.source, scores: d.scores, seal: d.seal }, null, 2));
      txt("sphase", "готово");
      renderStates([{ i: 0, source: d.source, prob: 1, text: d.answer, selected: true }]);
    } catch (e) {
      txt("serr", String(e && e.message || e));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function runChat(q) {
    q = (q != null ? q : ($("cq") && $("cq").value) || "").trim();
    if (!q) return;
    txt("cerr", "");
    txt("cthread", "…");
    var btn = $("cgo");
    if (btn) btn.disabled = true;
    try {
      var ans = null, src = "";
      if (window.AKSI_ORGANISM && AKSI_ORGANISM.think) {
        try {
          var ot = await AKSI_ORGANISM.think(q);
          if (ot && (ot.text || ot.answer)) { ans = ot.text || ot.answer; src = ot.source || "organism"; }
        } catch (e) {}
      }
      if (!ans && window.AKSI_PI_CONTOUR && /π|\bpi\b|пи\b|контур|формул/i.test(q)) {
        try {
          var pr = await AKSI_PI_CONTOUR.process(q);
          if (pr && pr.answer) { ans = pr.answer; src = "pi-contour"; }
        } catch (e) {}
      }
      if (!ans && window.AKSI && AKSI.think) {
        try {
          var t = await AKSI.think(q);
          if (t && (t.text || t.answer)) { ans = t.text || t.answer; src = t.source || "api"; }
        } catch (e) {}
      }
      if (!ans) { ans = localDecide(q).answer; src = "fallback"; }
      txt("cthread", ans + "\n\n[source: " + src + "]");
    } catch (e) {
      txt("cerr", String(e && e.message || e));
      txt("cthread", localDecide(q).answer);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function setLlmBusy(busy) {
    ["btnLoadLlm", "btnUnloadLlm", "btnWasm", "lgo"].forEach(function (id) {
      var el = $(id);
      if (el) el.disabled = !!busy;
    });
  }

  function updateLlmUi(st) {
    st = st || (window.AKSI_WEBLLM && AKSI_WEBLLM.status ? AKSI_WEBLLM.status() : {});
    var bar = $("llmBar");
    var prog = Number(st.progress || 0);
    if (prog <= 1) prog *= 100;
    if (bar) bar.style.width = Math.round(prog) + "%";
    txt("llmMsg", st.message || (st.ready ? "готово" : "не загружено"));
    txt("llmStatus", JSON.stringify(st, null, 2));
  }

  function runLoad(opts) {
    opts = opts || {};
    txt("llmErr", "");
    if (!window.AKSI_WEBLLM || !AKSI_WEBLLM.load) {
      txt("llmErr", "модуль ещё грузится в фоне — подождите 1–2 с");
      return;
    }
    setLlmBusy(true);
    Promise.resolve(AKSI_WEBLLM.load(opts.model || null, updateLlmUi, { forceWasm: !!opts.forceWasm }))
      .then(function () { updateLlmUi(); })
      .catch(function (e) { txt("llmErr", String(e && e.message || e).slice(0, 200)); })
      .then(function () { setLlmBusy(false); refreshMods(); });
  }

  async function runMem() {
    var q = ($("mq") && $("mq").value || "").trim();
    if (!q) return;
    if (!/^запомни\s*[:：]/i.test(q)) q = "запомни: " + q;
    txt("mmsg", "…");
    try {
      var lr = null;
      if (window.AKSI && AKSI.learn) lr = await AKSI.learn(q);
      else if (window.AKSI_ORGANISM && AKSI_ORGANISM.remember) lr = await AKSI_ORGANISM.remember(q);
      else if (window.AKSI_VAULT && AKSI_VAULT.learn) lr = await AKSI_VAULT.learn(q);
      else {
        var arr = JSON.parse(localStorage.getItem("aksi_fast_mem") || "[]");
        arr.push({ t: Date.now(), text: q });
        localStorage.setItem("aksi_fast_mem", JSON.stringify(arr.slice(-50)));
        lr = { ok: true, source: "local" };
      }
      txt("mmsg", (lr && lr.ok !== false) ? ("OK · " + (lr.source || "")) : "fail");
      txt("mstatus", JSON.stringify(lr, null, 2));
    } catch (e) {
      txt("mmsg", String(e && e.message || e));
    }
  }

  function fullStatus() {
    var o = {
      contour: "v" + VER,
      bootMs: Date.now() - tBoot,
      modules: {
        pi: !!(window.AKSI_PI_CONTOUR && AKSI_PI_CONTOUR.process),
        api: !!(window.AKSI && AKSI.decide),
        organism: !!window.AKSI_ORGANISM,
        vault: !!window.AKSI_VAULT,
        zero: !!window.AKSI_ZERO,
        neuro: !!window.AKSI_NEURO,
        llm: !!(window.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready())
      }
    };
    txt("fullStatus", JSON.stringify(o, null, 2));
  }

  function bindAll() {
    document.querySelectorAll(".tab").forEach(function (t) {
      on(t, "click", function () { showPanel(t.getAttribute("data-p")); });
    });
    on($("dgo"), "click", function () { runDecision(); });
    on($("dex1"), "click", function () { if ($("dq")) $("dq").value = "π"; runDecision("π"); });
    on($("dex2"), "click", function () { if ($("dq")) $("dq").value = "формула"; runDecision("формула"); });
    on($("dex3"), "click", function () { if ($("dq")) $("dq").value = "кто ты"; runDecision("кто ты"); });
    on($("sgo"), "click", function () { runSuperpose(); });
    on($("sex1"), "click", function () { if ($("sq")) $("sq").value = "кто ты"; runSuperpose("кто ты"); });
    on($("sex2"), "click", function () { if ($("sq")) $("sq").value = "π"; runSuperpose("π"); });
    on($("cgo"), "click", function () { runChat(); });
    on($("cex1"), "click", function () { if ($("cq")) $("cq").value = "π"; runChat("π"); });
    on($("cex2"), "click", function () { if ($("cq")) $("cq").value = "формула"; runChat("формула"); });
    on($("btnLoadLlm"), "click", function () { runLoad({}); });
    on($("btnWasm"), "click", function () { runLoad({ forceWasm: true }); });
    on($("btnUnloadLlm"), "click", function () {
      if (window.AKSI_WEBLLM && AKSI_WEBLLM.unload) AKSI_WEBLLM.unload();
      updateLlmUi();
      refreshMods();
    });
    on($("lgo"), "click", async function () {
      var q = ($("lq") && $("lq").value || "").trim();
      if (!q) return;
      txt("lans", "…");
      try {
        if (!window.AKSI_WEBLLM || !AKSI_WEBLLM.ready || !AKSI_WEBLLM.ready()) throw new Error("загрузите модель");
        var r = await AKSI_WEBLLM.complete(q, { temperature: 0.4, max_tokens: 500, system: "Ты АКСИ. Отвечай по-русски полно." });
        txt("lans", (r && r.text) || JSON.stringify(r));
      } catch (e) {
        txt("lans", "Ошибка: " + (e && e.message || e));
      }
    });
    on($("mgo"), "click", function () { runMem(); });
    on($("mrefresh"), "click", function () { runMem(); });
    on($("btnRefresh"), "click", function () { fullStatus(); refreshMods(); });
    on($("btnPurge"), "click", function () {
      if (window.AKSI_PURGE) AKSI_PURGE();
      else location.reload();
    });
    ["dq", "sq", "cq", "lq", "mq"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      on(el, "keydown", function (e) {
        if (e.key !== "Enter") return;
        if (id === "dq") runDecision();
        if (id === "sq") runSuperpose();
        if (id === "cq") runChat();
        if (id === "lq" && $("lgo")) $("lgo").click();
        if (id === "mq") runMem();
      });
    });
    on($("dcopy"), "click", function () {
      if (!lastDecision) return;
      try { navigator.clipboard.writeText(JSON.stringify(lastDecision, null, 2)); txt("dmeta", "copied"); } catch (e) {}
    });
    on($("dproof"), "click", function () {
      if (!lastDecision) return;
      try {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(lastDecision, null, 2)], { type: "application/json" }));
        a.download = "aksi-proof.json";
        a.click();
      } catch (e) {}
    });
    on($("dverify"), "click", function () {
      if (!lastDecision) return;
      txt("dmeta", "seal=" + !!lastDecision.seal + " gate=" + !!(lastDecision.gate && lastDecision.gate.ok));
    });
  }

  function boot() {
    bindAll();
    refreshMods();
    fullStatus();
    window.addEventListener("aksi-modules-ready", function () {
      refreshMods();
      fullStatus();
    });
    setTimeout(refreshMods, 800);
    setTimeout(refreshMods, 2500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
