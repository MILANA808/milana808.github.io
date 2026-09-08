/**
 * AKSI Contour App v225 — Product Runtime (mass-ready offline core)
 * Product API → Decision / Superpose / Zero / Neuro / fallback
 * WebLLM optional. Contact: aksilove@internet.ru
 */
(function () {
  "use strict";
  var VER = "225";
  var lastDecision = null;
  var preferLocal = true;

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

  var FALLBACK_KB = [
    { q: ["кто ты", "who are you", "привет", "hello"], a: "Я АКСИ — суверенный offline-first цифровой напарник. Decision · Superpose · Neuro · Zero · WebLLM · Product API. Контакт: aksilove@internet.ru" },
    { q: ["формула", "formula", "aksi ="], a: "AKSI = (A × I × S) × (1 + 0.4√n), где A — agency, I — integrity (EQS), S — sovereignty/structure, n — опыт (sealed history)." },
    { q: ["gate", "гейт"], a: "Gate — порог принятия (τ ≈ 0.55). Если score ниже — ответ отклоняется или помечается, в официальную память не пишется." },
    { q: ["adia", "адиа", "eqs"], a: "ADIA — Unified Resonance Decision Engine. Многоосевой EQS, rank, печать, policy companion/lab/strict." },
    { q: ["quantum", "квант"], a: "Локальный quantum-симулятор АКСИ (state-vector) + QCLI meta. Прозрачность, не «магия»." },
    { q: ["superpose", "суперпоз"], a: "Superpose: кандидаты от движков → амплитуды → Born-коллапс → печать." },
    { q: ["api", "продукт"], a: "Product API: AKSI.decide / think / evaluate / superpose / learn / status. Документация: /api/" },
    { q: ["статус", "status", "что умеешь"], a: "Contour v" + VER + ": Decision, Superpose, Chat, WebLLM, Memory, Status. Offline-ядро всегда доступно." },
    { q: ["webllm", "llm", "модель"], a: "WebLLM — опциональная локальная модель (WebGPU или WASM). Без неё работают Decision, Neuro и Zero. Кнопка «Только WASM» не требует WebGPU." }
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
            anti: "Локальный fallback Contour.",
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
      ["Quantum", !!(window.AKSI_QUANTUM || window.AKSI_QPIPE)]
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
        ? "Опционально не готово: " + missing.join(", ") + " — Decision/Chat работают через fallback"
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

  async function runDecisionPath(q) {
    if (window.AKSI && AKSI.decide) {
      try {
        var r = await AKSI.decide(q);
        if (r && r.answer) return r;
      } catch (e) {}
    }
    if (window.AKSI_DECISION && AKSI_DECISION.decide) {
      try {
        var p = await Promise.resolve(AKSI_DECISION.decide(q));
        if (p && p.answer) return p;
      } catch (e) {}
    }
    return localDecide(q);
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
      if (window.AKSI && typeof AKSI.superpose === "function") {
        try {
          var apiR = await AKSI.superpose(q);
          if (apiR && apiR.answer) {
            if (sans) sans.hidden = false;
            txt("sanswer", apiR.answer || "");
            txt("smeta", JSON.stringify({ source: apiR.source, scores: apiR.scores, seal: apiR.seal }, null, 2));
            txt("sphase", "готово · Product API");
            renderStates(apiR.superposition || [{ i: 0, source: apiR.source, prob: 1, text: apiR.answer, selected: true }]);
            return;
          }
        } catch (e) { console.warn(e); }
      }
      if (window.AKSI_SUPERPOSE && typeof AKSI_SUPERPOSE.ask === "function") {
        var unsub = null;
        try {
          if (AKSI_SUPERPOSE.on) {
            unsub = AKSI_SUPERPOSE.on(function (ev) {
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
          }
          await AKSI_SUPERPOSE.ask(q, { n: 2, includeLocal: true, mode: "born" });
          if (typeof unsub === "function") unsub();
          return;
        } catch (e) {
          if (typeof unsub === "function") unsub();
        }
      }
      var d = await runDecisionPath(q);
      if (sans) sans.hidden = false;
      txt("sanswer", d.answer);
      txt("smeta", JSON.stringify({ source: d.source, scores: d.scores }, null, 2));
      txt("sphase", "готово · decision-path");
      renderStates([{ i: 0, source: d.source, prob: 1, text: d.answer, selected: true }]);
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
          var w = await AKSI_WEBLLM.complete(q, {
            temperature: 0.45,
            max_tokens: 600,
            system: "Ты — АКСИ. Отвечай полностью на русском языке, ясно и по существу."
          });
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
    preferLocal = !!opts.forceWasm;
    txt("llmErr", "");
    if (!window.AKSI_WEBLLM || typeof AKSI_WEBLLM.load !== "function") {
      txt("llmErr", "Модуль aksi-webllm.js не загружен — offline Neuro/Zero работают. Decision и Chat доступны.");
      return;
    }
    setLlmBusy(true);
    txt("llmMsg", opts.forceWasm ? "загрузка WASM (без WebGPU)…" : "загрузка WebLLM / fallback…");
    try { updateLlmUi(AKSI_WEBLLM.status()); } catch (e0) {}
    Promise.resolve(AKSI_WEBLLM.load(opts.model || null, updateLlmUi, { forceWasm: !!opts.forceWasm }))
      .then(function (s) {
        var st = s || (AKSI_WEBLLM.status && AKSI_WEBLLM.status()) || {};
        updateLlmUi(st);
        if (st.ready) {
          txt("llmMsg", "готово · " + (st.backend || "") + " · " + (st.model || ""));
          txt("llmErr", "");
        } else {
          txt("llmMsg", (st.message || "статус") + " · " + (st.backend || ""));
          if (st.error) txt("llmErr", String(st.error).slice(0, 220));
        }
      })
      .catch(function (e) {
        var msg = String((e && e.message) || e).slice(0, 260);
        txt("llmErr", "Ошибка: " + msg + " — Decision/Chat работают без модели. Проверьте сеть или блокировщик.");
        txt("llmMsg", "модель недоступна — offline-ядро работает");
        try { updateLlmUi(AKSI_WEBLLM.status && AKSI_WEBLLM.status()); } catch (e1) {}
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
      } else if (window.AKSI_NEURO && AKSI_NEURO.learn) {
        AKSI_NEURO.learn(q.replace(/^запомни\s*[:：]\s*/i, ""));
        txt("mmsg", "Сохранено в Neuro");
      } else {
        var key = "aksi_contour_mem_v1";
        var arr = JSON.parse(localStorage.getItem(key) || "[]");
        arr.push({ t: Date.now(), text: q });
        localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
        txt("mmsg", "Сохранено локально (" + arr.length + ")");
      }
      if ($("mstatus")) {
        txt("mstatus", JSON.stringify({
          local: (JSON.parse(localStorage.getItem("aksi_contour_mem_v1") || "[]")).length,
          neuro: window.AKSI_NEURO && AKSI_NEURO.status ? AKSI_NEURO.status() : null
        }, null, 2));
      }
    } catch (e) {
      txt("mmsg", "Ошибка: " + (e && e.message || e));
    }
  }

  function fullStatus() {
    var o = {
      contour: "v" + VER,
      time: new Date().toISOString(),
      modules: {
        AKSI: !!(window.AKSI && AKSI.decide),
        DECISION: !!(window.AKSI_DECISION && AKSI_DECISION.decide),
        SUPERPOSE: !!(window.AKSI_SUPERPOSE && AKSI_SUPERPOSE.ask),
        ZERO: !!(window.AKSI_ZERO && AKSI_ZERO.think),
        NEURO: !!(window.AKSI_NEURO && AKSI_NEURO.think),
        WEBLLM: !!(window.AKSI_WEBLLM),
        WEBLLM_READY: !!(window.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready())
      },
      webllm: window.AKSI_WEBLLM && AKSI_WEBLLM.status ? AKSI_WEBLLM.status() : null,
      api: window.AKSI && AKSI.status ? AKSI.status() : null
    };
    txt("fullStatus", JSON.stringify(o, null, 2));
  }

  function bindAll() {
    document.querySelectorAll(".tab").forEach(function (t) {
      on(t, "click", function () { showPanel(t.getAttribute("data-p")); });
    });
    on($("dgo"), "click", function () { runDecision(); });
    on($("dex1"), "click", function () { if ($("dq")) $("dq").value = "Кто ты?"; runDecision("Кто ты?"); });
    on($("dex2"), "click", function () { if ($("dq")) $("dq").value = "Формула AKSI"; runDecision("Формула AKSI"); });
    on($("dex3"), "click", function () { if ($("dq")) $("dq").value = "Gate"; runDecision("Gate"); });
    on($("sgo"), "click", function () { runSuperpose(); });
    on($("sex1"), "click", function () { if ($("sq")) $("sq").value = "Кто ты?"; runSuperpose("Кто ты?"); });
    on($("sex2"), "click", function () { if ($("sq")) $("sq").value = "Суперпозиция"; runSuperpose("Суперпозиция"); });
    on($("sex3"), "click", function () { if ($("sq")) $("sq").value = "Что такое АКСИ?"; runSuperpose("Что такое АКСИ?"); });
    on($("cgo"), "click", function () { runChat(); });
    on($("cex1"), "click", function () { if ($("cq")) $("cq").value = "Кто ты?"; runChat("Кто ты?"); });
    on($("cex2"), "click", function () { if ($("cq")) $("cq").value = "статус"; runChat("статус"); });
    on($("cex3"), "click", function () { if ($("cq")) $("cq").value = "что умеешь"; runChat("что умеешь"); });
    on($("btnLoadLlm"), "click", function () { runLoad({}); });
    on($("btnWasm"), "click", function () { runLoad({ forceWasm: true, model: "Xenova/LaMini-Flan-T5-248M" }); });
    on($("btnUnloadLlm"), "click", function () {
      if (window.AKSI_WEBLLM && AKSI_WEBLLM.unload) AKSI_WEBLLM.unload();
      txt("llmMsg", "выгружено · offline");
      updateLlmUi();
      refreshMods();
    });
    on($("lgo"), "click", async function () {
      var q = ($("lq") && $("lq").value || "").trim();
      if (!q) return;
      txt("lans", "…");
      txt("llmErr", "");
      try {
        if (!window.AKSI_WEBLLM || !AKSI_WEBLLM.ready || !AKSI_WEBLLM.ready()) {
          throw new Error("сначала «Только WASM» или «Загрузить WebLLM»");
        }
        var r = await AKSI_WEBLLM.complete(q, {
          temperature: 0.45,
          max_tokens: 700,
          system: "Ты — АКСИ, локальный ИИ. Отвечай только на русском, полными предложениями. Не смешивай языки."
        });
        txt("lans", (r && r.text) ? r.text : (r && r.error ? ("Ошибка модели: " + r.error) : JSON.stringify(r, null, 2)));
      } catch (e) {
        txt("lans", "Ошибка: " + (e && e.message || e));
      }
    });
    on($("mgo"), "click", function () { runMem(); });
    on($("mrefresh"), "click", function () { runMem(); });
    on($("btnRefresh"), "click", function () { fullStatus(); refreshMods(); });
    on($("btnPurge"), "click", function () {
      if (window.AKSI_PURGE) window.AKSI_PURGE();
      else location.reload();
    });
    ["dq", "sq", "cq", "lq", "mq"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      on(el, "keydown", function (e) {
        if (e.key === "Enter") {
          if (id === "dq") runDecision();
          if (id === "sq") runSuperpose();
          if (id === "cq") runChat();
          if (id === "lq") { var b = $("lgo"); if (b) b.click(); }
          if (id === "mq") runMem();
        }
      });
    });
    on($("dcopy"), "click", function () {
      if (!lastDecision) return;
      try {
        navigator.clipboard.writeText(JSON.stringify(lastDecision, null, 2));
        txt("dmeta", "скопировано");
      } catch (e) {}
    });
    on($("dproof"), "click", function () {
      if (!lastDecision) return;
      try {
        var blob = new Blob([JSON.stringify(lastDecision, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "aksi-proof-" + (lastDecision.id || "x") + ".json";
        a.click();
      } catch (e) {}
    });
    on($("dverify"), "click", function () {
      if (!lastDecision) return;
      txt("dmeta", "verify local: seal=" + !!(lastDecision.seal) + " · gate=" + !!(lastDecision.gate && lastDecision.gate.ok));
    });
  }

  function boot() {
    try { bindAll(); } catch (e) { console.error("[bind]", e); }
    refreshMods();
    fullStatus();
    setTimeout(refreshMods, 400);
    setTimeout(refreshMods, 1200);
    setTimeout(refreshMods, 3000);
    try {
      window.addEventListener("aksi-webllm-progress", function () { updateLlmUi(); refreshMods(); });
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
