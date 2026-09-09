/**
 * AKSI Contour App v250 — full working buttons, no recursion
 * Event delegation · offline-first · aksilove@internet.ru
 */
(function () {
  "use strict";
  var VER = "250";
  var lastDecision = null;
  var tBoot = Date.now();

  function $(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }
  function txt(id, v) {
    var el = $(id);
    if (el) el.textContent = v == null ? "" : String(v);
  }

  var KB = [
    { q: ["кто ты", "who are you", "привет", "hello"], a: "Я АКСИ — Contour v" + VER + ". Decision · π · Vault · Chat. Контакт: aksilove@internet.ru" },
    { q: ["формула", "formula"], a: "AKSI = (A × I × S) × (1 + 0.4√n). π-Contour: query→SHA-256→θ→seal." },
    { q: ["контур", "contour"], a: "π-Contour — детерминированный путь. Тот же запрос → тот же θ и seal." },
    { q: ["gate", "гейт"], a: "Gate τ ≈ 0.55 — порог принятия." },
    { q: ["статус", "status", "что умеешь"], a: "Contour v" + VER + ": Decision, Superpose, Chat, Memory, WebLLM (опц.), Status." },
    { q: ["vault", "память"], a: "Vault: IndexedDB. Команда «запомни: факт»." }
  ];

  function localDecide(q) {
    var ql = String(q || "").toLowerCase();
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].q.length; j++) {
        if (ql.indexOf(KB[i].q[j]) !== -1) {
          return {
            id: "fb-" + Date.now().toString(36),
            answer: KB[i].a,
            anti: "local",
            source: "fallback",
            scores: { aksi: 0.72, eqs: 72, phi: 0.6, qcli: 0.55 },
            gate: { ok: true, reason: "fallback" },
            seal: { kind: "local", t: Date.now() },
            ms: 0,
            version: "fb-" + VER
          };
        }
      }
    }
    return {
      id: "fb-" + Date.now().toString(36),
      answer: "АКСИ Contour v" + VER + ". Спросите: кто ты, π, формула, контур. aksilove@internet.ru",
      anti: "no-hit",
      source: "fallback",
      scores: { aksi: 0.5, eqs: 50, phi: 0.4, qcli: 0.4 },
      gate: { ok: true, reason: "generic" },
      seal: { kind: "local", t: Date.now() },
      ms: 0,
      version: "fb-" + VER
    };
  }

  function showPanel(name) {
    if (!name) return;
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
      ["Dec", !!(window.AKSI_DECISION && AKSI_DECISION.decide)],
      ["Zero", !!(window.AKSI_ZERO && AKSI_ZERO.think)],
      ["Neuro", !!(window.AKSI_NEURO && AKSI_NEURO.think)],
      ["Vault", !!(window.AKSI_VAULT && AKSI_VAULT.learn)],
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
      var n = bits.filter(function (b) { return b[1]; }).length;
      p.textContent = "v" + VER + " · " + n + "/" + bits.length + " · " + (Date.now() - tBoot) + "ms";
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
    txt("dmeta", (p.ms != null ? p.ms + " ms · " : "") + (p.source || "") + " · " + (p.version || ""));
  }

  async function runDecision(q) {
    q = (q != null ? q : ($("dq") && $("dq").value) || "").trim();
    if (!q) { txt("derr", "Введите вопрос"); return; }
    txt("derr", "");
    var btn = $("dgo");
    if (btn) btn.disabled = true;
    var t0 = Date.now();
    try {
      var p = null;
      if (window.AKSI && typeof AKSI.decide === "function") {
        try { p = await AKSI.decide(q); } catch (e) { console.warn("AKSI.decide", e); }
      }
      if ((!p || !p.answer) && window.AKSI_ORGANISM && AKSI_ORGANISM.decide) {
        try { p = await AKSI_ORGANISM.decide(q); } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI_DECISION && AKSI_DECISION.decide) {
        try { p = await Promise.resolve(AKSI_DECISION.decide(q)); } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI_PI_CONTOUR && AKSI_PI_CONTOUR.process && /π|\bpi\b|пи\b|контур|формул/i.test(q)) {
        try {
          var pr = await AKSI_PI_CONTOUR.process(q);
          if (pr && pr.answer) {
            p = { answer: pr.answer, anti: "π", source: "pi-contour", scores: pr.scores || {}, gate: pr.gate || { ok: true, reason: "pi" }, seal: pr.seal, version: "pi" };
          }
        } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI_ZERO && AKSI_ZERO.think) {
        try {
          var z = await Promise.resolve(AKSI_ZERO.think(q));
          if (z && (z.answer || z.text)) {
            p = { answer: z.answer || z.text, anti: "zero", source: "zero", scores: { aksi: 0.65, eqs: 65, phi: 0.5, qcli: 0.5 }, gate: { ok: true, reason: "zero" }, seal: z.seal || null };
          }
        } catch (e) {}
      }
      if ((!p || !p.answer) && window.AKSI_NEURO && AKSI_NEURO.think) {
        try {
          var n = await Promise.resolve(AKSI_NEURO.think(q));
          if (n && (n.text || n.answer)) {
            p = { answer: n.text || n.answer, anti: "neuro", source: "neuro", scores: { aksi: 0.6, eqs: 60, phi: 0.5, qcli: 0.5 }, gate: { ok: true, reason: "neuro" } };
          }
        } catch (e) {}
      }
      if (!p || !p.answer) p = localDecide(q);
      p.ms = Date.now() - t0;
      showDecision(p);
    } catch (e) {
      txt("derr", String(e && e.message || e));
      var fb = localDecide(q); fb.ms = Date.now() - t0; showDecision(fb);
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
      d.innerHTML = "<div class='top'><span>" + (s.source || "") + "</span><span>P=" + prob + "</span></div>" +
        "<div class='bar'><i style='width:" + Math.round(prob * 100) + "%'></i></div>" +
        "<div style='font-size:13px;white-space:pre-wrap'></div>";
      d.querySelector("div:last-child").textContent = s.text || "";
      root.appendChild(d);
    });
  }

  async function runSuperpose(q) {
    q = (q != null ? q : ($("sq") && $("sq").value) || "").trim();
    if (!q) return;
    txt("serr", ""); txt("sphase", "…");
    var sans = $("sansBox"); if (sans) sans.hidden = true;
    var btn = $("sgo"); if (btn) btn.disabled = true;
    try {
      var d = null;
      if (window.AKSI_SUPERPOSE && AKSI_SUPERPOSE.ask) {
        try { var sp = await AKSI_SUPERPOSE.ask(q, { n: 2 }); if (sp && sp.answer) d = sp; } catch (e) {}
      }
      if ((!d || !d.answer) && window.AKSI && AKSI.decide) { try { d = await AKSI.decide(q); } catch (e) {} }
      if ((!d || !d.answer) && window.AKSI_ORGANISM && AKSI_ORGANISM.decide) { try { d = await AKSI_ORGANISM.decide(q); } catch (e) {} }
      if (!d || !d.answer) d = localDecide(q);
      if (sans) sans.hidden = false;
      txt("sanswer", d.answer);
      txt("smeta", JSON.stringify({ source: d.source, scores: d.scores, seal: d.seal }, null, 2));
      txt("sphase", "готово");
      renderStates(d.superposition || [{ i: 0, source: d.source, prob: 1, text: d.answer, selected: true }]);
    } catch (e) {
      txt("serr", String(e && e.message || e));
      var fb = localDecide(q); if (sans) sans.hidden = false; txt("sanswer", fb.answer); txt("sphase", "fallback");
    } finally {
      if (btn) btn.disabled = false; refreshMods();
    }
  }

  async function runChat(q) {
    q = (q != null ? q : ($("cq") && $("cq").value) || "").trim();
    if (!q) return;
    txt("cerr", ""); txt("cthread", "…");
    var btn = $("cgo"); if (btn) btn.disabled = true;
    try {
      var ans = null, src = "";
      if (window.AKSI && AKSI.think) {
        try { var t = await AKSI.think(q); if (t && (t.text || t.answer)) { ans = t.text || t.answer; src = t.source || "api"; } } catch (e) {}
      }
      if (!ans && window.AKSI_ORGANISM && AKSI_ORGANISM.think) {
        try { var ot = await AKSI_ORGANISM.think(q); if (ot && (ot.text || ot.answer)) { ans = ot.text || ot.answer; src = ot.source || "organism"; } } catch (e) {}
      }
      if (!ans) { var fb = localDecide(q); ans = fb.answer; src = "fallback"; }
      txt("cthread", ans + "\n\n[source: " + src + "]");
    } catch (e) {
      txt("cerr", String(e && e.message || e));
      txt("cthread", localDecide(q).answer);
    } finally {
      if (btn) btn.disabled = false; refreshMods();
    }
  }

  function updateLlmUi(st) {
    st = st || (window.AKSI_WEBLLM && AKSI_WEBLLM.status ? AKSI_WEBLLM.status() : {});
    var bar = $("llmBar");
    var prog = Number(st.progress || 0);
    if (prog <= 1) prog *= 100;
    if (bar) bar.style.width = Math.round(prog) + "%";
    txt("llmMsg", st.message || (st.ready ? "модель готова" : "не загружено"));
    txt("llmStatus", JSON.stringify(st, null, 2));
  }

  function runLoad(opts) {
    opts = opts || {};
    txt("llmErr", "");
    if (!window.AKSI_WEBLLM || typeof AKSI_WEBLLM.load !== "function") {
      txt("llmErr", "aksi-webllm.js не загружен"); return;
    }
    txt("llmMsg", opts.forceWasm ? "WASM…" : "загрузка…");
    Promise.resolve(AKSI_WEBLLM.load(opts.model || null, updateLlmUi, { forceWasm: !!opts.forceWasm }))
      .then(function () { updateLlmUi(); refreshMods(); })
      .catch(function (e) {
        txt("llmErr", String(e && e.message || e).slice(0, 220));
        txt("llmMsg", "ошибка — offline работает");
      });
  }

  async function runMem() {
    var q = ($("mq") && $("mq").value || "").trim();
    if (!q) { txt("mmsg", "Введите текст"); return; }
    if (!/^запомни\s*[:：]/i.test(q) && !/^remember\s*[:：]/i.test(q)) q = "запомни: " + q;
    txt("mmsg", "…");
    try {
      var lr = null;
      if (window.AKSI && AKSI.learn) lr = await AKSI.learn(q);
      else if (window.AKSI_ORGANISM && AKSI_ORGANISM.remember) lr = await AKSI_ORGANISM.remember(q);
      else if (window.AKSI_VAULT && AKSI_VAULT.learn) lr = await AKSI_VAULT.learn(q);
      else {
        var arr = JSON.parse(localStorage.getItem("aksi_contour_mem") || "[]");
        arr.push({ t: Date.now(), text: q });
        localStorage.setItem("aksi_contour_mem", JSON.stringify(arr.slice(-100)));
        lr = { ok: true, source: "localStorage", n: arr.length };
      }
      txt("mmsg", (lr && lr.ok !== false) ? ("Сохранено · " + (lr.source || "ok")) : "Не удалось");
      txt("mstatus", JSON.stringify(lr, null, 2));
    } catch (e) {
      txt("mmsg", "Ошибка: " + (e && e.message || e));
    }
  }

  function fullStatus() {
    var o = {
      contour: "v" + VER,
      bootMs: Date.now() - tBoot,
      modules: {
        AKSI: !!(window.AKSI && AKSI.decide),
        ORGANISM: !!window.AKSI_ORGANISM,
        PI: !!(window.AKSI_PI_CONTOUR && AKSI_PI_CONTOUR.process),
        DECISION: !!(window.AKSI_DECISION && AKSI_DECISION.decide),
        ZERO: !!(window.AKSI_ZERO && AKSI_ZERO.think),
        NEURO: !!(window.AKSI_NEURO && AKSI_NEURO.think),
        VAULT: !!window.AKSI_VAULT,
        WEBLLM: !!(window.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready())
      },
      api: window.AKSI && AKSI.status ? AKSI.status() : null
    };
    txt("fullStatus", JSON.stringify(o, null, 2));
  }

  function onClick(e) {
    var t = e.target;
    if (!t) return;
    while (t && t !== document.body && t.tagName !== "BUTTON" && !(t.classList && t.classList.contains("tab"))) {
      t = t.parentElement;
    }
    if (!t || t === document.body) return;
    var id = t.id;
    var dp = t.getAttribute("data-p");
    if (dp) { e.preventDefault(); showPanel(dp); return; }
    try {
      if (id === "dgo") { e.preventDefault(); runDecision(); }
      else if (id === "dex1") { e.preventDefault(); if ($("dq")) $("dq").value = "π"; runDecision("π"); }
      else if (id === "dex2") { e.preventDefault(); if ($("dq")) $("dq").value = "формула"; runDecision("формула"); }
      else if (id === "dex3") { e.preventDefault(); if ($("dq")) $("dq").value = "кто ты"; runDecision("кто ты"); }
      else if (id === "sgo") { e.preventDefault(); runSuperpose(); }
      else if (id === "sex1") { e.preventDefault(); if ($("sq")) $("sq").value = "кто ты"; runSuperpose("кто ты"); }
      else if (id === "sex2") { e.preventDefault(); if ($("sq")) $("sq").value = "π"; runSuperpose("π"); }
      else if (id === "cgo") { e.preventDefault(); runChat(); }
      else if (id === "cex1") { e.preventDefault(); if ($("cq")) $("cq").value = "π"; runChat("π"); }
      else if (id === "cex2") { e.preventDefault(); if ($("cq")) $("cq").value = "формула"; runChat("формула"); }
      else if (id === "btnLoadLlm") { e.preventDefault(); runLoad({}); }
      else if (id === "btnWasm") { e.preventDefault(); runLoad({ forceWasm: true }); }
      else if (id === "btnUnloadLlm") {
        e.preventDefault();
        if (window.AKSI_WEBLLM && AKSI_WEBLLM.unload) AKSI_WEBLLM.unload();
        updateLlmUi(); refreshMods();
      } else if (id === "lgo") {
        e.preventDefault();
        (async function () {
          var q = ($("lq") && $("lq").value || "").trim();
          if (!q) return;
          txt("lans", "…");
          try {
            if (!window.AKSI_WEBLLM || !AKSI_WEBLLM.ready || !AKSI_WEBLLM.ready()) throw new Error("Сначала «Загрузить»");
            var r = await AKSI_WEBLLM.complete(q, { temperature: 0.4, max_tokens: 500, system: "Ты АКСИ. Отвечай по-русски полными предложениями." });
            txt("lans", (r && r.text) || JSON.stringify(r));
          } catch (err) {
            txt("lans", "Ошибка: " + (err && err.message || err));
          }
        })();
      } else if (id === "mgo" || id === "mrefresh") { e.preventDefault(); runMem(); }
      else if (id === "btnRefresh") { e.preventDefault(); fullStatus(); refreshMods(); }
      else if (id === "btnPurge") {
        e.preventDefault();
        if (window.AKSI_PURGE) AKSI_PURGE(); else location.reload();
      } else if (id === "dcopy") {
        e.preventDefault();
        if (lastDecision) {
          try { navigator.clipboard.writeText(JSON.stringify(lastDecision, null, 2)); txt("dmeta", "скопировано"); } catch (err) {}
        }
      } else if (id === "dproof") {
        e.preventDefault();
        if (lastDecision) {
          try {
            var a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([JSON.stringify(lastDecision, null, 2)], { type: "application/json" }));
            a.download = "aksi-proof.json"; a.click();
          } catch (err) {}
        }
      } else if (id === "dverify") {
        e.preventDefault();
        if (lastDecision) txt("dmeta", "seal=" + !!lastDecision.seal + " · gate=" + !!(lastDecision.gate && lastDecision.gate.ok));
      }
    } catch (err) {
      console.error("[Contour click]", err);
      txt("bootErr", "Ошибка: " + (err && err.message || err));
    }
  }

  function onKey(e) {
    if (e.key !== "Enter") return;
    var id = e.target && e.target.id;
    if (id === "dq") runDecision();
    else if (id === "sq") runSuperpose();
    else if (id === "cq") runChat();
    else if (id === "lq") { var b = $("lgo"); if (b) b.click(); }
    else if (id === "mq") runMem();
  }

  function boot() {
    document.addEventListener("click", onClick, false);
    document.addEventListener("keydown", onKey, false);
    refreshMods();
    fullStatus();
    setTimeout(refreshMods, 500);
    setTimeout(refreshMods, 1500);
    setTimeout(refreshMods, 4000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
