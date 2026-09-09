/**
 * AKSI Contour App v234 — Organism + π-Contour
 * Offline-first. Contact: aksilove@internet.ru
 */
(function () {
  "use strict";
  var VER = "234";
  var lastDecision = null;

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
    { q: ["кто ты", "who are you", "привет"], a: "Я АКСИ — offline-организм с π-контуром, Decision, Vault. Контакт: aksilove@internet.ru" },
    { q: ["формула", "formula", "aksi ="], a: "AKSI = (A × I × S) × (1 + 0.4√n). π-Contour: query→SHA-256→θ∈[0,2π)→sin/cos→seal." },
    { q: ["gate", "гейт"], a: "Gate τ ≈ 0.55. В π-контуре τ_π = 0.55 + 0.05·sinθ." },
    { q: ["контур", "contour", "π-контур"], a: "π-Contour: детерминированный путь ответа через Math.PI. Тот же запрос → тот же угол θ и seal." },
    { q: ["статус", "status", "что умеешь"], a: "Contour v" + VER + ": Decision, Superpose, Chat, WebLLM, Memory/Vault, π-Contour, Status." },
    { q: ["vault", "память"], a: "Vault π — IndexedDB + опциональное PiFractalCrypto. «запомни: факт»." },
    { q: ["adia", "eqs"], a: "ADIA — ranking/scoring engine. EQS + Gate + seal." }
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
      answer: "Я АКСИ Contour v" + VER + ". Спросите: π, формула, контур, кто ты. Контакт: aksilove@internet.ru",
      anti: "Нет точного совпадения.",
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
      ["Vault", !!(window.AKSI_VAULT && AKSI_VAULT.learn)],
      ["Pi", !!(window.PiFractalCrypto || window.AKSI_PI_CRYPTO)],
      ["PiContour", !!(window.AKSI_PI_CONTOUR && AKSI_PI_CONTOUR.process)],
      ["Organism", !!(window.AKSI_ORGANISM)],
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
        ? "Опционально: " + missing.join(", ") + " — ядро Decision/Chat работает"
        : "";
    }
    setPill();
  }

  function setPill() {
    var p = $("pill");
    if (!p) return;
    var st = window.AKSI_WEBLLM && AKSI_WEBLLM.status ? AKSI_WEBLLM.status() : {};
    if (st.ready) p.textContent = "LLM · " + (st.backend || "on");
    else if (st.loading) {
      var pr = Number(st.progress || 0);
      if (pr <= 1) pr *= 100;
      p.textContent = "LLM " + Math.round(pr) + "%";
    } else p.textContent = "π · ORGANISM · v" + VER;
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
      if (window.AKSI_PI_CONTOUR && AKSI_PI_CONTOUR.process && /π|\bpi\b|пи\b|контур|формул/i.test(q)) {
        try {
          var pr = await AKSI_PI_CONTOUR.process(q);
          if (pr && pr.answer) {
            p = {
              id: "pi-" + Date.now().toString(36),
              answer: pr.answer,
              anti: "π-contour · θ=" + ((pr.features && pr.features.theta != null) ? pr.features.theta.toFixed(5) : "?"),
              source: pr.source || "pi-contour",
              scores: pr.scores || {},
              gate: pr.gate || { ok: true, reason: "pi-pass" },
              seal: pr.seal || null,
              ms: 0,
              version: pr.version || "pi-contour"
            };
          }
        } catch (e) { console.warn("[pi]", e); }
      }
      if ((!p || !p.answer) && window.AKSI_ORGANISM && AKSI_ORGANISM.decide) {
        try { p = await AKSI_ORGANISM.decide(q); } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI && typeof AKSI.decide === "function") {
        try { p = await AKSI.decide(q); } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI_DECISION && AKSI_DECISION.decide) {
        try { p = await Promise.resolve(AKSI_DECISION.decide(q)); } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI_ZERO && AKSI_ZERO.think) {
        try {
          var z = await Promise.resolve(AKSI_ZERO.think(q));
          if (z && (z.answer || z.text)) {
            p = {
              id: "z" + Date.now(),
              answer: z.answer || z.text,
              anti: "Zero path",
              source: "zero",
              scores: { aksi: z.confidence || 0.65, eqs: Math.round((z.confidence || 0.65) * 100), phi: 0.55, qcli: 0.5 },
              gate: { ok: true, reason: "zero-pass" },
              seal: z.seal || null,
              ms: 0,
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
              anti: "Neuro path",
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
        "</span><span>P=" + prob + "</span></div>" +
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
      if (window.AKSI && AKSI.superpose) {
        try {
          var apiR = await AKSI.superpose(q);
          if (apiR && apiR.answer) {
            if (sans) sans.hidden = false;
            txt("sanswer", apiR.answer || "");
            txt("smeta", JSON.stringify({ source: apiR.source, scores: apiR.scores, seal: apiR.seal }, null, 2));
            txt("sphase", "готово · API");
            renderStates(apiR.superposition || [{ i: 0, source: apiR.source, prob: 1, text: apiR.answer, selected: true }]);
            return;
          }
        } catch (e) {}
      }
      var d = null;
      if (window.AKSI_ORGANISM && AKSI_ORGANISM.decide) {
        try { d = await AKSI_ORGANISM.decide(q); } catch (e) {}
      }
      if (!d || !d.answer) d = localDecide(q);
      if (sans) sans.hidden = false;
      txt("sanswer", d.answer);
      txt("smeta", JSON.stringify({ source: d.source, scores: d.scores, seal: d.seal }, null, 2));
      txt("sphase", "готово");
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
      if (window.AKSI_ORGANISM && AKSI_ORGANISM.think) {
        try {
          var ot = await AKSI_ORGANISM.think(q);
          if (ot && (ot.text || ot.answer)) {
            ans = ot.text || ot.answer; src = ot.source || "organism"; meta = { scores: ot.scores };
          }
        } catch (e) {}
      }
      if (!ans && window.AKSI_PI_CONTOUR && AKSI_PI_CONTOUR.process && /π|\bpi\b|пи\b|контур|формул/i.test(q)) {
        try {
          var pr = await AKSI_PI_CONTOUR.process(q);
          if (pr && pr.answer) { ans = pr.answer; src = "pi-contour"; meta = { scores: pr.scores }; }
        } catch (e) {}
      }
      if (!ans && window.AKSI && AKSI.think) {
        try {
          var t = await AKSI.think(q);
          if (t && (t.text || t.answer)) { ans = t.text || t.answer; src = t.source || "api"; }
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
    txt("llmErr", "");
    if (!window.AKSI_WEBLLM || typeof AKSI_WEBLLM.load !== "function") {
      txt("llmErr", "aksi-webllm.js не загружен — offline-ядро работает");
      return;
    }
    setLlmBusy(true);
    txt("llmMsg", opts.forceWasm ? "загрузка WASM…" : "загрузка WebLLM…");
    Promise.resolve(AKSI_WEBLLM.load(opts.model || null, updateLlmUi, { forceWasm: !!opts.forceWasm }))
      .then(function (s) {
        var st = s || (AKSI_WEBLLM.status && AKSI_WEBLLM.status()) || {};
        updateLlmUi(st);
        if (st.ready) txt("llmMsg", "готово · " + (st.backend || ""));
        else if (st.error) txt("llmErr", String(st.error).slice(0, 220));
      })
      .catch(function (e) {
        txt("llmErr", "Ошибка: " + String((e && e.message) || e).slice(0, 260));
        txt("llmMsg", "модель недоступна — offline работает");
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
      var lr = null;
      if (window.AKSI_ORGANISM && AKSI_ORGANISM.remember) lr = await AKSI_ORGANISM.remember(q);
      else if (window.AKSI_VAULT && AKSI_VAULT.learn) lr = await AKSI_VAULT.learn(q);
      else if (window.AKSI && AKSI.learn) lr = await AKSI.learn(q);
      else {
        var key = "aksi_contour_mem_v1";
        var arr = JSON.parse(localStorage.getItem(key) || "[]");
        arr.push({ t: Date.now(), text: q });
        localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
        lr = { ok: true, source: "local", n: arr.length };
      }
      txt("mmsg", (lr && lr.ok !== false) ? ("Сохранено · " + (lr.source || "ok")) : "Не удалось");
      var st = { learn: lr };
      try { if (window.AKSI_VAULT && AKSI_VAULT.status) st.vault = await AKSI_VAULT.status(); } catch (e1) {}
      try { if (window.AKSI_ORGANISM && AKSI_ORGANISM.pulse) st.organism = await AKSI_ORGANISM.pulse(); } catch (e2) {}
      if ($("mstatus")) txt("mstatus", JSON.stringify(st, null, 2));
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
        ORGANISM: !!(window.AKSI_ORGANISM),
        PI_CONTOUR: !!(window.AKSI_PI_CONTOUR && AKSI_PI_CONTOUR.process),
        VAULT: !!(window.AKSI_VAULT),
        PI_CRYPTO: !!(window.PiFractalCrypto || window.AKSI_PI_CRYPTO),
        WEBLLM_READY: !!(window.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready())
      },
      api: window.AKSI && AKSI.status ? AKSI.status() : null,
      piContour: window.AKSI_PI_CONTOUR && AKSI_PI_CONTOUR.status ? AKSI_PI_CONTOUR.status() : null
    };
    txt("fullStatus", JSON.stringify(o, null, 2));
    if (window.AKSI_ORGANISM && AKSI_ORGANISM.pulse) {
      AKSI_ORGANISM.pulse().then(function (p) {
        o.organism = p;
        txt("fullStatus", JSON.stringify(o, null, 2));
      }).catch(function () {});
    }
  }

  function bindAll() {
    document.querySelectorAll(".tab").forEach(function (t) {
      on(t, "click", function () { showPanel(t.getAttribute("data-p")); });
    });
    on($("dgo"), "click", function () { runDecision(); });
    on($("dex1"), "click", function () { if ($("dq")) $("dq").value = "π"; runDecision("π"); });
    on($("dex2"), "click", function () { if ($("dq")) $("dq").value = "Формула AKSI"; runDecision("Формула AKSI"); });
    on($("dex3"), "click", function () { if ($("dq")) $("dq").value = "контур"; runDecision("контур"); });
    on($("sgo"), "click", function () { runSuperpose(); });
    on($("sex1"), "click", function () { if ($("sq")) $("sq").value = "Кто ты?"; runSuperpose("Кто ты?"); });
    on($("sex2"), "click", function () { if ($("sq")) $("sq").value = "π"; runSuperpose("π"); });
    on($("sex3"), "click", function () { if ($("sq")) $("sq").value = "АКСИ"; runSuperpose("АКСИ"); });
    on($("cgo"), "click", function () { runChat(); });
    on($("cex1"), "click", function () { if ($("cq")) $("cq").value = "π"; runChat("π"); });
    on($("cex2"), "click", function () { if ($("cq")) $("cq").value = "формула"; runChat("формула"); });
    on($("cex3"), "click", function () { if ($("cq")) $("cq").value = "контур"; runChat("контур"); });
    on($("btnLoadLlm"), "click", function () { runLoad({}); });
    on($("btnWasm"), "click", function () { runLoad({ forceWasm: true }); });
    on($("btnUnloadLlm"), "click", function () {
      if (window.AKSI_WEBLLM && AKSI_WEBLLM.unload) AKSI_WEBLLM.unload();
      txt("llmMsg", "выгружено");
      updateLlmUi();
      refreshMods();
    });
    on($("lgo"), "click", async function () {
      var q = ($("lq") && $("lq").value || "").trim();
      if (!q) return;
      txt("lans", "…");
      try {
        if (!window.AKSI_WEBLLM || !AKSI_WEBLLM.ready || !AKSI_WEBLLM.ready()) {
          throw new Error("сначала загрузите WebLLM / WASM");
        }
        var r = await AKSI_WEBLLM.complete(q, {
          temperature: 0.45,
          max_tokens: 700,
          system: "Ты — АКСИ. Отвечай только на русском, полными предложениями."
        });
        txt("lans", (r && r.text) ? r.text : JSON.stringify(r, null, 2));
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
