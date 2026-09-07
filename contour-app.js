/**
 * AKSI Contour App v221 — Product Runtime
 * Unified path: Product API (AKSI.*) → Decision / Superpose / Zero / Neuro / fallback
 * Offline-first. All algorithms wired. Contact: aksilove@internet.ru
 */
(function () {
  "use strict";

  var VER = "221";

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
        console.error("[AKSI Contour]", err);
        var box = $("bootErr") || $("derr") || $("cerr");
        if (box) box.textContent = "Ошибка: " + (err && err.message ? err.message : err);
      }
    });
  }

  var lastDecision = null;
  var preferLocal = false;

  /* ——— FALLBACK KB (always works offline) ——— */
  var FALLBACK_KB = [
    { q: ["кто ты", "who are you", "привет", "hello"], a: "Я АКСИ — суверенный offline-first цифровой напарник. Decision · Superpose · Neuro · Zero · WebLLM · Product API. Контакт: aksilove@internet.ru" },
    { q: ["формула", "formula", "aksi ="], a: "AKSI = (A × I × S) × (1 + 0.4√n), где A — agency, I — integrity (EQS), S — sovereignty/structure, n — опыт (sealed history)." },
    { q: ["gate", "гейт"], a: "Gate — порог принятия (τ ≈ 0.55). Если score ниже — ответ отклоняется или помечается, в официальную память не пишется." },
    { q: ["adia", "адиа", "eqs"], a: "ADIA 3.0 — Unified Resonance Decision Engine. 5-осевой EQS, rank, FNV-seal, policy companion/lab/strict." },
    { q: ["quantum", "квант"], a: "Локальный quantum-симулятор АКСИ (state-vector) + QCLI meta. Прозрачность, не «магия»." },
    { q: ["superpose", "суперпоз"], a: "Superpose: кандидаты от движков → амплитуды → Born-коллапс → печать." },
    { q: ["api", "продукт"], a: "Product API: AKSI.decide / think / evaluate / superpose / learn / status. Документация: /api/" },
    { q: ["статус", "status", "что умеешь"], a: "Contour v" + VER + ": Decision, Superpose, Chat, WebLLM, Memory, Status. Offline-ядро всегда доступно." }
  ];

  function localDecide(q) {
    q = String(q || "").toLowerCase();
    var i, j, hit;
    for (i = 0; i < FALLBACK_KB.length; i++) {
      hit = FALLBACK_KB[i];
      for (j = 0; j < hit.q.length; j++) {
        if (q.indexOf(hit.q[j]) !== -1) {
          return {
            id: "fb-" + Date.now().toString(36),
            answer: hit.a,
            anti: "Локальный fallback Contour (модули подгружаются отдельно).",
            source: "fallback",
            scores: { aksi: 0.72, eqs: 72, phi: 0.6, qcli: 0.55 },
            gate: { ok: true, reason: "fallback-pass" },
            seal: { kind: "fnv-local", t: Date.now() },
            ms: 1,
            version: "contour-fallback-v" + VER
          };
        }
      }
    }
    return {
      id: "fb-" + Date.now().toString(36),
      answer: "Я АКСИ Contour v" + VER + ". Спросите: кто ты, формула, Gate, ADIA, API, Quantum. Или «запомни: факт». Контакт: aksilove@internet.ru",
      anti: "Нет точного совпадения в fallback KB.",
      source: "fallback",
      scores: { aksi: 0.45, eqs: 45, phi: 0.4, qcli: 0.4 },
      gate: { ok: true, reason: "fallback-generic" },
      seal: { kind: "fnv-local", t: Date.now() },
      ms: 1,
      version: "contour-fallback-v" + VER
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
      ["API", !!(window.AKSI && AKSI.decide)],
      ["Decision", !!(window.AKSI_DECISION && AKSI_DECISION.decide)],
      ["Superpose", !!(window.AKSI_SUPERPOSE && AKSI_SUPERPOSE.ask)],
      ["Zero", !!(window.AKSI_ZERO && AKSI_ZERO.think)],
      ["Neuro", !!(window.AKSI_NEURO && AKSI_NEURO.think)],
      ["ADIA", !!(window.AKSI_ALGORITHM || window.ADIA)],
      ["WebLLM", !!(window.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready())],
      ["Quantum", !!(window.AKSI_QUANTUM || window.AKSI_QPIPE)],
      ["Compose", !!(window.AKSI_COMPOSE && AKSI_COMPOSE.think)]
    ];
    var root = $("modChecks");
    if (root) {
      root.innerHTML = bits.map(function (b) {
        return "<i class='" + (b[1] ? "on" : "") + "'>" + b[0] + "</i>";
      }).join("");
    }
    var missing = bits.filter(function (b) { return !b[1]; }).map(function (b) { return b[0]; });
    var be = $("bootErr");
    if (be) {
      be.textContent = missing.length
        ? "Ожидают: " + missing.join(", ") + " — кнопки работают через Product API / fallback"
        : "";
    }
    setPill();
  }

  function setPill() {
    var p = $("pill");
    if (!p) return;
    var st = window.AKSI_WEBLLM && AKSI_WEBLLM.status ? AKSI_WEBLLM.status() : {};
    if (st.ready) {
      p.textContent = "LLM · " + (st.backend || "on");
      p.className = "pill";
    } else if (st.loading) {
      var pr = Number(st.progress || 0);
      if (pr <= 1) pr *= 100;
      p.textContent = "LLM " + Math.round(pr) + "%";
      p.className = "pill warn";
    } else {
      p.textContent = "OFFLINE READY · v" + VER;
      p.className = "pill";
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
    txt("dmeta", "id " + (p.id || "—") + " · " + (p.ms || 0) + " ms · source " + (p.source || "—") + " · " + (p.version || ""));
  }

  async function runDecision(q) {
    q = (q != null ? q : ($("dq") && $("dq").value) || "").trim();
    if (!q) return;
    txt("derr", "");
    var btn = $("dgo");
    if (btn) btn.disabled = true;
    try {
      var p = null;
      if (window.AKSI && typeof AKSI.decide === "function") {
        try { p = await AKSI.decide(q); } catch (e) { console.warn("[Contour] AKSI.decide", e); }
      }
      if ((!p || !p.answer) && window.AKSI_DECISION && typeof AKSI_DECISION.decide === "function") {
        try { p = await Promise.resolve(AKSI_DECISION.decide(q)); } catch (e) { console.warn("[Contour] DECISION", e); }
      }
      if ((!p || !p.answer) && window.AKSI_ZERO && AKSI_ZERO.think) {
        try {
          var z = await Promise.resolve(AKSI_ZERO.think(q));
          if (z && (z.answer || z.text)) {
            p = {
              id: z.id || ("z" + Date.now()),
              answer: z.answer || z.text,
              anti: "Путь Zero.",
              source: z.source || "zero",
              scores: { aksi: z.confidence || 0.65, eqs: Math.round((z.confidence || 0.65) * 100), phi: 0.55, qcli: 0.5 },
              gate: { ok: true, reason: "zero-pass" },
              seal: z.seal || null,
              ms: z.ms || 0,
              version: "zero-bridge"
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
              anti: "Путь Neuro.",
              source: "neuro",
              scores: { aksi: n.score || 0.6, eqs: Math.round((n.score || 0.6) * 100), phi: 0.5, qcli: 0.5 },
              gate: { ok: true, reason: "neuro-pass" },
              seal: null,
              ms: 0,
              version: "neuro-bridge"
            };
          }
        } catch (e) {}
      }
      if (!p || !p.answer) p = localDecide(q);
      showDecision(p);
    } catch (e) {
      txt("derr", "Decision: " + (e && e.message || e));
      showDecision(localDecide(q));
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
        "</span><span>P=" + prob + (s.eqs != null ? " · EQS " + s.eqs : "") + "</span></div>" +
        "<div class='bar'><i style='width:" + Math.round(prob * 100) + "%'></i></div>" +
        "<div style='font-size:13px;white-space:pre-wrap'></div>";
      d.querySelector("div:last-child").textContent = s.text || s.preview || "";
      root.appendChild(d);
    });
  }

  async function runSuperpose(q) {
    q = (q != null ? q : ($("sq") && $("sq").value) || "").trim();
    if (!q) return;
    txt("serr", "");
    var sans = $("sansBox");
    if (sans) sans.hidden = true;
    txt("sphase", "старт…");
    var btn = $("sgo");
    if (btn) btn.disabled = true;
    try {
      if (window.AKSI && typeof AKSI.superpose === "function" && !window.AKSI_SUPERPOSE) {
        var apiR = await AKSI.superpose(q);
        if (sans) sans.hidden = false;
        txt("sanswer", apiR.answer || "");
        txt("smeta", JSON.stringify({ source: apiR.source, scores: apiR.scores, seal: apiR.seal }, null, 2));
        txt("sphase", "готово · Product API");
        renderStates(apiR.superposition || [{ i: 0, source: apiR.source, prob: 1, text: apiR.answer, selected: true }]);
        return;
      }
      if (window.AKSI_SUPERPOSE && typeof AKSI_SUPERPOSE.ask === "function") {
        var unsub = AKSI_SUPERPOSE.on(function (ev) {
          if (ev.event === "phase") txt("sphase", (ev.data.phase || "") + " — " + (ev.data.note || ""));
          if (ev.event === "superposition") renderStates(ev.data.states);
          if (ev.event === "collapsed") {
            renderStates(ev.data.superposition);
            if (sans) sans.hidden = false;
            txt("sanswer", ev.data.answer || "");
            txt("smeta", JSON.stringify({
              collapse: ev.data.collapse, scores: ev.data.scores,
              seal: ev.data.seal, ms: ev.data.ms, source: ev.data.source
            }, null, 2));
            txt("sphase", "готово · " + (ev.data.ms || 0) + " ms");
          }
        });
        await AKSI_SUPERPOSE.ask(q, { n: preferLocal ? 0 : 3, includeLocal: true, mode: "born" });
        if (typeof unsub === "function") unsub();
      } else {
        var d = await runDecisionPath(q);
        if (sans) sans.hidden = false;
        txt("sanswer", d.answer);
        txt("smeta", JSON.stringify({ source: d.source, scores: d.scores }, null, 2));
        txt("sphase", "готово · decision-path");
        renderStates([{ i: 0, source: d.source, prob: 1, text: d.answer, selected: true }]);
      }
    } catch (e) {
      txt("serr", "Superpose: " + (e && e.message || e));
      var fb = localDecide(q);
      if (sans) sans.hidden = false;
      txt("sanswer", fb.answer);
      txt("sphase", "fallback");
    } finally {
      if (btn) btn.disabled = false;
      refreshMods();
    }
  }

  async function runDecisionPath(q) {
    if (window.AKSI && AKSI.decide) {
      var r = await AKSI.decide(q);
      if (r && r.answer) return r;
    }
    if (window.AKSI_DECISION && AKSI_DECISION.decide) {
      var p = await Promise.resolve(AKSI_DECISION.decide(q));
      if (p && p.answer) return p;
    }
    return localDecide(q);
  }

  async function runChat(q) {
    q = (q != null ? q : ($("cq") && $("cq").value) || "").trim();
    if (!q) return;
    txt("cerr", "");
    txt("cthread", "думаю…");
    var btn = $("cgo");
    if (btn) btn.disabled = true;
    try {
      var ans = null, src = "", meta = {};
      if (window.AKSI && typeof AKSI.think === "function") {
        try {
          var t = await AKSI.think(q);
          if (t && (t.text || t.answer)) {
            ans = t.text || t.answer;
            src = t.source || "api";
            meta = { scores: t.score || t.scores };
          }
        } catch (e) {}
      }
      if (!ans && window.AKSI_SUPERPOSE && AKSI_SUPERPOSE.ask) {
        try {
          var r = await AKSI_SUPERPOSE.ask(q, { n: preferLocal ? 0 : 2, includeLocal: true, mode: "max" });
          if (r && r.answer) { ans = r.answer; src = r.source || "superpose"; meta = { scores: r.scores }; }
        } catch (e) {}
      }
      if (!ans && window.AKSI_DECISION) {
        try {
          var d = await Promise.resolve(AKSI_DECISION.decide(q));
          if (d && d.answer) { ans = d.answer; src = d.source || "decision"; meta = { scores: d.scores }; }
        } catch (e) {}
      }
      if (!ans && window.AKSI_ZERO && AKSI_ZERO.think) {
        try {
          var z = await Promise.resolve(AKSI_ZERO.think(q));
          if (z && (z.answer || z.text)) { ans = z.answer || z.text; src = "zero"; }
        } catch (e) {}
      }
      if (!ans && window.AKSI_NEURO && AKSI_NEURO.think) {
        try {
          var n = await Promise.resolve(AKSI_NEURO.think(q));
          if (n && (n.text || n.answer)) { ans = n.text || n.answer; src = "neuro"; }
        } catch (e) {}
      }
      if (!ans && window.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready() && AKSI_WEBLLM.complete) {
        try {
          var w = await AKSI_WEBLLM.complete(q, { temperature: 0.4, max_tokens: 280 });
          if (w && w.text) { ans = w.text; src = "webllm"; }
        } catch (e) {}
      }
      if (!ans) {
        var fb = localDecide(q);
        ans = fb.answer; src = "fallback";
      }
      txt("cthread", ans + "\n\n[source: " + src + "]" + (meta.scores ? "\n[scores: " + JSON.stringify(meta.scores) + "]" : ""));
    } catch (e) {
      txt("cerr", "Chat: " + (e && e.message || e));
      txt("cthread", localDecide(q).answer);
    } finally {
      if (btn) btn.disabled = false;
      refreshMods();
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
    txt("llmMsg", st.message || (st.ready ? "модель готова" : "не загружено"));
    txt("llmStatus", JSON.stringify(st, null, 2));
    setPill();
  }

  function runLoad(opts) {
    opts = opts || {};
    preferLocal = false;
    txt("llmErr", "");
    if (!window.AKSI_WEBLLM || typeof AKSI_WEBLLM.load !== "function") {
      txt("llmErr", "Модуль aksi-webllm.js не загружен — offline-ядро работает");
      return;
    }
    setLlmBusy(true);
    txt("llmMsg", opts.forceWasm ? "загрузка WASM…" : "загрузка модели…");
    updateLlmUi(AKSI_WEBLLM.status());
    Promise.resolve(AKSI_WEBLLM.load(opts.model || null, updateLlmUi, { forceWasm: !!opts.forceWasm }))
      .then(function (s) {
        updateLlmUi(s || AKSI_WEBLLM.status());
        var st = s || AKSI_WEBLLM.status();
        txt("llmMsg", (st.ready ? "готово · " : "статус · ") + (st.backend || "") + " · " + (st.model || ""));
        txt("llmErr", "");
      })
      .catch(function (e) {
        txt("llmErr", "WebLLM: " + (e && e.message || e));
        txt("llmMsg", "модель недоступна — offline-ядро работает");
        updateLlmUi();
      })
      .then(function () {
        setLlmBusy(false);
        refreshMods();
      });
  }

  async function runMem() {
    var q = ($("mq") && $("mq").value || "").trim();
    if (!q) return;
    if (!/^запомни\s*[:：]/i.test(q) && !/^remember\s*[:：]/i.test(q)) q = "запомни: " + q;
    txt("mmsg", "…");
    try {
      if (window.AKSI && typeof AKSI.learn === "function") {
        var lr = await AKSI.learn(q);
        txt("mmsg", (lr && lr.ok !== false) ? ("Сохранено · " + (lr.source || "api")) : "Не удалось");
      } else if (window.AKSI_DECISION && AKSI_DECISION.decide) {
        var p = await Promise.resolve(AKSI_DECISION.decide(q));
        txt("mmsg", p.answer || "—");
        txt("mstatus", JSON.stringify(AKSI_DECISION.status ? AKSI_DECISION.status() : {}, null, 2));
      } else if (window.AKSI_NEURO && AKSI_NEURO.learn) {
        AKSI_NEURO.learn(q.replace(/^запомни\s*[:：]\s*/i, ""));
        txt("mmsg", "Сохранено в Neuro localStorage");
      } else {
        try {
          var key = "aksi_contour_mem_v1";
          var arr = JSON.parse(localStorage.getItem(key) || "[]");
          arr.push({ t: Date.now(), text: q });
          localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
          txt("mmsg", "Сохранено локально (" + arr.length + ")");
        } catch (e) {
          txt("mmsg", "Не удалось сохранить: " + e.message);
        }
      }
    } catch (e) {
      txt("mmsg", "Ошибка: " + (e && e.message || e));
    }
    refreshMods();
  }

  function fullStatus() {
    var o = {
      contour: "v" + VER,
      productApi: window.AKSI ? (AKSI.status ? AKSI.status() : { version: AKSI.version }) : null,
      decision: window.AKSI_DECISION && AKSI_DECISION.status ? AKSI_DECISION.status() : !!window.AKSI_DECISION,
      superpose: window.AKSI_SUPERPOSE && AKSI_SUPERPOSE.status ? AKSI_SUPERPOSE.status() : !!window.AKSI_SUPERPOSE,
      webllm: window.AKSI_WEBLLM && AKSI_WEBLLM.status ? AKSI_WEBLLM.status() : null,
      zero: window.AKSI_ZERO && AKSI_ZERO.status ? AKSI_ZERO.status() : !!window.AKSI_ZERO,
      neuro: !!(window.AKSI_NEURO && AKSI_NEURO.think),
      algorithm: !!(window.AKSI_ALGORITHM || window.ADIA),
      quantum: !!(window.AKSI_QUANTUM || window.AKSI_QPIPE),
      compose: !!(window.AKSI_COMPOSE && AKSI_COMPOSE.think),
      integrity: !!window.AKSI_INTEGRITY,
      knowledge: !!window.AKSI_KNOWLEDGE,
      formula: "AKSI=(A×I×S)×(1+0.4√n)",
      contact: "aksilove@internet.ru"
    };
    txt("fullStatus", JSON.stringify(o, null, 2));
  }

  function bindAll() {
    document.querySelectorAll(".tab").forEach(function (t) {
      on(t, "click", function () { showPanel(t.getAttribute("data-p")); });
    });
    on($("dgo"), "click", function () { runDecision(); });
    on($("dq"), "keydown", function (e) { if (e.key === "Enter") runDecision(); });
    on($("dex1"), "click", function () { if ($("dq")) $("dq").value = "Кто ты?"; runDecision("Кто ты?"); });
    on($("dex2"), "click", function () { if ($("dq")) $("dq").value = "Какая формула AKSI?"; runDecision("Какая формула AKSI?"); });
    on($("dex3"), "click", function () { if ($("dq")) $("dq").value = "Что такое Gate?"; runDecision("Что такое Gate?"); });
    on($("dproof"), "click", function () {
      if (!lastDecision) return;
      var blob = new Blob([JSON.stringify(lastDecision, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "aksi-decision-proof.json";
      a.click();
    });
    on($("dverify"), "click", function () {
      if (!lastDecision) return;
      alert("Seal: " + JSON.stringify(lastDecision.seal || lastDecision.gate || {}, null, 2).slice(0, 400));
    });
    on($("dcopy"), "click", function () {
      if (!lastDecision) return;
      var t = JSON.stringify(lastDecision, null, 2);
      if (navigator.clipboard) navigator.clipboard.writeText(t);
    });
    on($("sgo"), "click", function () { runSuperpose(); });
    on($("sq"), "keydown", function (e) { if (e.key === "Enter") runSuperpose(); });
    on($("sex1"), "click", function () { if ($("sq")) $("sq").value = "Кто ты?"; runSuperpose("Кто ты?"); });
    on($("sex2"), "click", function () { if ($("sq")) $("sq").value = "Как работает суперпозиция?"; runSuperpose("Как работает суперпозиция?"); });
    on($("sex3"), "click", function () { if ($("sq")) $("sq").value = "Что такое АКСИ?"; runSuperpose("Что такое АКСИ?"); });
    on($("cgo"), "click", function () { runChat(); });
    on($("cq"), "keydown", function (e) { if (e.key === "Enter") runChat(); });
    on($("cex1"), "click", function () { if ($("cq")) $("cq").value = "Кто ты?"; runChat("Кто ты?"); });
    on($("cex2"), "click", function () { if ($("cq")) $("cq").value = "статус"; runChat("статус"); });
    on($("cex3"), "click", function () { if ($("cq")) $("cq").value = "что умеешь"; runChat("что умеешь"); });
    on($("btnLoadLlm"), "click", function () { runLoad({}); });
    on($("btnWasm"), "click", function () { runLoad({ forceWasm: true, model: "Xenova/LaMini-Flan-T5-248M" }); });
    on($("btnUnloadLlm"), "click", function () {
      if (window.AKSI_WEBLLM && AKSI_WEBLLM.unload) AKSI_WEBLLM.unload();
      preferLocal = true;
      txt("llmErr", "");
      updateLlmUi();
      txt("llmMsg", "выгружено · offline");
      refreshMods();
    });
    on($("lgo"), "click", async function () {
      var q = ($("lq") && $("lq").value || "").trim();
      if (!q) return;
      txt("lans", "…");
      try {
        if (!window.AKSI_WEBLLM || !AKSI_WEBLLM.ready || !AKSI_WEBLLM.ready()) {
          throw new Error("сначала «Загрузить WebLLM» или «Только WASM»");
        }
        var r = await AKSI_WEBLLM.complete(q, { temperature: 0.5, max_tokens: 300 });
        if (r && r.error && !r.text) throw new Error(r.error);
        txt("lans", (r && r.text) ? r.text : JSON.stringify(r, null, 2));
      } catch (e) {
        txt("lans", "Ошибка: " + (e && e.message || e));
      }
    });
    on($("lq"), "keydown", function (e) { if (e.key === "Enter" && $("lgo")) $("lgo").click(); });
    on($("mgo"), "click", runMem);
    on($("mq"), "keydown", function (e) { if (e.key === "Enter") runMem(); });
    on($("mrefresh"), "click", function () {
      txt("mstatus", JSON.stringify({
        decision: window.AKSI_DECISION && AKSI_DECISION.status ? AKSI_DECISION.status() : null,
        zero: window.AKSI_ZERO && AKSI_ZERO.status ? AKSI_ZERO.status() : null,
        api: window.AKSI && AKSI.status ? AKSI.status() : null
      }, null, 2));
    });
    on($("btnRefresh"), "click", function () { fullStatus(); refreshMods(); });
    on($("btnPurge"), "click", function () {
      if (window.AKSI_PURGE) AKSI_PURGE();
      else {
        try { localStorage.removeItem("aksi_build_id"); } catch (e) {}
        location.reload();
      }
    });
  }

  function boot() {
    try { bindAll(); } catch (e) { console.error("[bind]", e); }
    try { refreshMods(); } catch (e) {}
    try { fullStatus(); } catch (e) {}
    try { updateLlmUi(); } catch (e) {}
    if (window.AKSI_WEBLLM) {
      window.addEventListener("aksi-webllm-progress", function (e) {
        try { updateLlmUi(e.detail); } catch (err) {}
      });
    }
    [200, 600, 1200, 2500, 5000].forEach(function (ms) {
      setTimeout(function () { try { refreshMods(); fullStatus(); setPill(); } catch (e) {} }, ms);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
