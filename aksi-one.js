/**
 * AKSI ONE v1.7.0 — max chat runtime
 * Routes think() → LIVE when present. /demo · whoami · QCLI+R meta.
 * © AKSI · aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var VER = "1.7.0";
  var MEM_KEY = "aksi_whole_mem_v3";
  var LEDGER_KEY = "aksi_proof_ledger_v1";
  var LLM_KEY = "aksi_llm_cfg_v1";
  var busy = false;
  var history = [];
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  }
  function loadMem() {
    try { var a = JSON.parse(localStorage.getItem(MEM_KEY) || "[]"); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function saveMem(arr) {
    try { localStorage.setItem(MEM_KEY, JSON.stringify((arr || []).slice(-120))); } catch (e) {}
    var n = $("memN"); if (n) n.textContent = String((arr || []).length);
  }
  function remember(text, src) {
    var m = loadMem();
    m.push({ t: String(text).slice(0, 500), src: src || "user", ts: Date.now() });
    saveMem(m); appendLedger("memory", text); return m;
  }
  function loadLedger() {
    try { var a = JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]"); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function simpleHash(s) {
    var h = 0x811c9dc5, i; s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function appendLedger(kind, payload) {
    var chain = loadLedger();
    var prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
    var body = { i: chain.length, ts: Date.now(), kind: kind, payload: String(payload).slice(0, 400), prev: prev };
    body.hash = simpleHash(JSON.stringify(body));
    chain.push(body);
    try { localStorage.setItem(LEDGER_KEY, JSON.stringify(chain.slice(-200))); } catch (e) {}
    return body;
  }
  function verifyLedger() {
    var chain = loadLedger(), i;
    for (i = 0; i < chain.length; i++) {
      var b = Object.assign({}, chain[i]); var h = b.hash; delete b.hash;
      if (simpleHash(JSON.stringify(b)) !== h) return { ok: false, at: i, length: chain.length };
      if (i && chain[i].prev !== chain[i - 1].hash) return { ok: false, at: i, length: chain.length };
    }
    return { ok: true, length: chain.length };
  }
  function shannonH(text) {
    text = String(text || ""); if (!text.length) return 0;
    var freq = {}, n = text.length, h = 0, c, p, i;
    for (i = 0; i < n; i++) { c = text.charAt(i); freq[c] = (freq[c] || 0) + 1; }
    for (c in freq) { p = freq[c] / n; h -= p * Math.log2(p); }
    return Math.round(h * 1000) / 1000;
  }
  function eqsOf(text) {
    var H = shannonH(text);
    var EQS = Math.min(99, Math.round(40 + H * 8 + Math.min(20, String(text).length / 40)));
    return { H: H, EQS: EQS };
  }
  function setBadge(t) { var el = $("stBadge"); if (el) el.textContent = t; }
  function bubble(role, text, meta) {
    var th = $("thread"); if (!th) return;
    var d = document.createElement("div");
    d.className = "msg " + (role === "me" ? "me" : "ai");
    var m = meta != null && String(meta).length ? '<div class="meta">' + esc(meta) + "</div>" : "";
    d.innerHTML = '<div class="bub">' + esc(text) + m + "</div>";
    th.appendChild(d);
    try { th.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" }); } catch (e) {}
  }
  function llmCfg() {
    try {
      var j = JSON.parse(localStorage.getItem(LLM_KEY) || "null");
      if (!j) return { on: true, base: "http://127.0.0.1:11434", model: "llama3.2" };
      return { on: j.on !== false, base: String(j.base || "http://127.0.0.1:11434").replace(/\/$/, ""), model: j.model || "llama3.2" };
    } catch (e) { return { on: true, base: "http://127.0.0.1:11434", model: "llama3.2" }; }
  }
  function localAnswer(q) {
    var low = String(q || "").toLowerCase().trim();
    if (/^(привет|здравств|добрый|hello|hi)\b/.test(low))
      return "Привет. Я АКСИ — local-first runtime (Quantum · Trust · Overlay · DKV). Спросите «кто ты» или /demo.";
    if (/кто ты|что ты такое|what are you/.test(low))
      return "АКСИ — суверенный Decision Integrity Runtime: offline Brain, proof-ledger, Quantum, Trust, Overlay AOP/1. Контакт: aksilove@internet.ru";
    if (/что умеешь|помощь|help|функци/.test(low))
      return "Чат · Net · Quantum · DKV · Trust · Brain · P2P · Lang · Память · Цепочка. Команда /demo.";
    if (/контакт|почта|email/.test(low)) return "aksilove@internet.ru · X @AKSILOVE";
    if (/matrix/.test(low)) return "MATRIX: https://milana808.github.io/aksi-matrix/";
    if (/время|который час|time/.test(low)) {
      try {
        return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", dateStyle: "medium", timeStyle: "medium" }).format(new Date()) + " (MSK)";
      } catch (e) { return new Date().toISOString(); }
    }
    return null;
  }
  function matchMem(q) {
    var m = loadMem(), best = null, score = 0, i, words, hit;
    words = q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 2; });
    if (!words.length) return null;
    for (i = 0; i < m.length; i++) {
      hit = 0;
      words.forEach(function (w) { if (String(m[i].t || "").toLowerCase().indexOf(w) !== -1) hit++; });
      var s = hit / words.length;
      if (s > score && s >= 0.4) { score = s; best = m[i].t; }
    }
    return best;
  }
  function tryBrain(q) {
    if (global.AKSI_BRAIN && typeof global.AKSI_BRAIN.complete === "function") {
      try { var r = global.AKSI_BRAIN.complete(q); if (r && r.text) return Promise.resolve(r); } catch (e) {}
    }
    return Promise.resolve(null);
  }
  function tryOllama(q) {
    var cfg = llmCfg();
    if (!cfg.on) return Promise.resolve(null);
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e) {} }, 10000);
    return fetch(cfg.base + "/api/generate", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl && ctrl.signal,
      body: JSON.stringify({ model: cfg.model, stream: false, prompt: "Ты АКСИ. Кратко по-русски.\nВопрос: " + q, options: { temperature: 0.7 } })
    }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json();
    }).then(function (j) { return j && j.response ? String(j.response).trim() : null;
    }).catch(function () { clearTimeout(t); return null; });
  }
  function tryLLM(q) {
    var race = function (p) {
      return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, 8000); })]);
    };
    if (global.AKSI_LLM && typeof global.AKSI_LLM.complete === "function") {
      return race(global.AKSI_LLM.complete(q).then(function (r) { return r && r.text ? r : null; }).catch(function () { return null; }));
    }
    return race(tryOllama(q).then(function (t) { return t ? { text: t, providerId: "ollama" } : null; }));
  }
  function tryCore(q) {
    var c = global.AKSI_CORE || global.AksiCore;
    if (!c || typeof c.query !== "function") return Promise.resolve(null);
    return Promise.race([c.query(q), new Promise(function (r) { setTimeout(function () { r(null); }, 9000); })])
      .then(function (res) {
        if (res && res.ok && res.text) return { text: res.text, meta: res.local ? "core · local" : "core · net" };
        if (res && res.text) return { text: String(res.text), meta: "core" };
        return null;
      }).catch(function () { return null; });
  }
  function thinkLocal(q) {
    q = String(q || "").trim();
    if (!q) return Promise.resolve({ text: "Пустой запрос.", meta: "one" });
    if (global.AKSI_TRUST && global.AKSI_TRUST.state && global.AKSI_TRUST.state().safeMode) {
      return Promise.resolve({ text: "Safe-mode: Trust Compiler. Сброс во вкладке Trust.", meta: "trust·safe" });
    }
    if (/^\/demo\b/i.test(q) || /^demo$/i.test(q)) {
      return Promise.resolve({
        text: "AKSI demo:\n· whoami — DID\n· /demo — этот список\n· вкладки: Quantum · Net · Trust · DKV · Whole\n· запомни: факт\n· 2+2 — math Brain",
        meta: "demo",
      });
    }
    if (/^whoami$/i.test(q)) {
      var did = "—";
      try { did = localStorage.getItem("aksi_did_v1") || "did:aksi:local"; } catch (e) {}
      return Promise.resolve({ text: "DID: " + did + "\nПриватный ключ не покидает браузер (local-first).", meta: "identity" });
    }
    var memCmd = q.match(/^(запомни|выучи)\s*[:\s]+(.+)/i);
    if (memCmd) {
      remember(memCmd[2].trim(), "user");
      if (global.AKSI_BRAIN && global.AKSI_BRAIN.teach) global.AKSI_BRAIN.teach(memCmd[2].trim());
      renderMemList();
      return Promise.resolve({ text: "Запомнила:\n«" + memCmd[2].trim() + "»", meta: "memory" });
    }
    if (/что ты помнишь|что ты знаешь/i.test(q)) {
      var m = loadMem();
      if (!m.length) return Promise.resolve({ text: "Память пуста.", meta: "memory" });
      return Promise.resolve({ text: m.slice(-15).map(function (x, i) { return (i + 1) + ". " + x.t; }).join("\n"), meta: "memory" });
    }
    if (/забудь всё/i.test(q)) {
      saveMem([]); renderMemList();
      return Promise.resolve({ text: "Память очищена.", meta: "memory" });
    }
    var loc = localAnswer(q);
    var fromMem = matchMem(q);
    if (loc) return Promise.resolve({ text: loc, meta: "local" });
    if (fromMem) return Promise.resolve({ text: fromMem, meta: "memory" });
    setBadge("brain…");
    return tryBrain(q).then(function (br) {
      if (br && br.text && String(br.meta || "").indexOf("fallback") === -1) {
        setBadge("ONE " + VER);
        return { text: br.text, meta: br.meta || "brain" };
      }
      setBadge("search…");
      return tryCore(q).then(function (coreRes) {
        if (coreRes && coreRes.text) { setBadge("Core"); return coreRes; }
        setBadge("llm…");
        return tryLLM(q).then(function (llm) {
          setBadge("ONE " + VER);
          if (llm && llm.text) return { text: llm.text, meta: llm.providerId || "llm" };
          if (br && br.text) return { text: br.text, meta: br.meta || "brain" };
          return { text: "Пока нет сильного факта в офлайн-базе.\n· «запомни: …»\n· вкладки Brain / Trust / Whole", meta: "fallback" };
        });
      });
    });
  }
  function think(q) {
    q = String(q || "").trim();
    if (!q) return Promise.resolve({ text: "Пустой запрос.", meta: "one" });
    if (global.AKSI_LIVE && typeof global.AKSI_LIVE.think === "function" && !think._viaLive) {
      try {
        return global.AKSI_LIVE.think(q).then(function (r) {
          if (r && r.text) return r;
          return thinkLocal(q);
        }).catch(function () { return thinkLocal(q); });
      } catch (e) { return thinkLocal(q); }
    }
    return thinkLocal(q);
  }
  function ask(q) {
    if (busy) return;
    q = String(q || "").trim(); if (!q) return;
    busy = true; bubble("me", q);
    var inp = $("inp"); if (inp) inp.value = "";
    history.push({ role: "user", content: q });
    setBadge("…");
    think(q).then(function (res) {
      busy = false;
      var text = (res && res.text) || "…";
      var meta = (res && res.meta) || "one";
      function finish(extra) {
        var mtag = meta;
        if (extra && mtag.indexOf(extra) === -1) mtag = mtag + (mtag ? " · " : "") + extra;
        var qx = res && res.quantum;
        var qv = qx && (qx.QCLI != null ? qx.QCLI : qx.qcli);
        if (qv != null) mtag += " · Q" + qv;
        if (qx && qx.resonance != null) mtag += " · R" + qx.resonance;
        bubble("ai", text, mtag);
        history.push({ role: "assistant", content: text });
        appendLedger("chat", "Q:" + q.slice(0, 80));
        var m = eqsOf(text);
        if ($("stEqs")) $("stEqs").textContent = String(m.EQS);
        setBadge("ONE " + VER);
      }
      if (res && res.trust && res.trust.trust) {
        if (res.trust.safeMode) {
          text = "Safe-mode АКСИ: trust compiler.\n" + (res.trust.reason || "anomaly");
          finish("trust·safe"); return;
        }
        finish("trust:" + res.trust.trust + (res.trust.score != null ? " " + res.trust.score : ""));
        return;
      }
      if (String(meta).indexOf("trust:") !== -1) { finish(null); return; }
      if (global.AKSI_TRUST && typeof global.AKSI_TRUST.verifyResponse === "function") {
        var scoreText = text.split("\n——\n")[0];
        global.AKSI_TRUST.verifyResponse(q, scoreText, { source: "one" }).then(function (tr) {
          if (tr.safeMode) {
            text = "Safe-mode АКСИ: trust compiler.\n" + (tr.reason || "anomaly");
            finish("trust·safe"); return;
          }
          finish("trust:" + tr.trust + (tr.score != null ? " " + tr.score : ""));
        }).catch(function () { finish(null); });
      } else finish(null);
    }).catch(function (e) {
      busy = false; bubble("ai", "Сбой: " + (e && e.message || e), "error"); setBadge("error");
    });
  }
  function renderMemList() {
    var box = $("memList"); if (!box) return;
    var m = loadMem();
    if ($("memN")) $("memN").textContent = String(m.length);
    if (!m.length) { box.innerHTML = '<p class="muted">Пусто</p>'; return; }
    box.innerHTML = m.slice(-20).map(function (x) {
      return '<div class="card" style="padding:10px;margin:6px 0">' + esc(x.t) + "</div>";
    }).join("");
  }
  function wire() {
    var send = $("send"); var inp = $("inp");
    if (send) {
      send.onclick = null;
      send.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation(); ask(inp && inp.value);
      }, true);
    }
    if (inp) {
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); ask(inp.value); }
      }, true);
    }
    document.addEventListener("click", function (e) {
      var chip = e.target.closest && e.target.closest("[data-ask]");
      if (chip) { e.preventDefault(); e.stopPropagation(); ask(chip.getAttribute("data-ask")); }
    }, true);
    var btnProof = $("btnProof");
    if (btnProof) btnProof.onclick = function () {
      var v = verifyLedger(); var out = $("pOut");
      if (out) out.textContent = v.ok ? "Цепочка цела · " + v.length : "Разрыв · at " + v.at;
    };
    var btnProofClear = $("btnProofClear");
    if (btnProofClear) btnProofClear.onclick = function () {
      localStorage.setItem(LEDGER_KEY, "[]"); if ($("pOut")) $("pOut").textContent = "Очищено";
    };
    var btnWipe = $("btnWipe");
    if (btnWipe) btnWipe.onclick = function () { saveMem([]); renderMemList(); };
    function didStr() {
      try {
        var d = localStorage.getItem("aksi_did_v1"); if (d) return d;
        var id = "did:aksi:" + simpleHash(String(Date.now()) + Math.random()).slice(0, 12);
        localStorage.setItem("aksi_did_v1", id); return id;
      } catch (e) { return "did:aksi:local"; }
    }
    if ($("didVal")) $("didVal").textContent = didStr();
    renderMemList(); appendLedger("session", "AKSI ONE " + VER); setBadge("ONE " + VER);
  }
  function boot() {
    wire();
    global.AKSI_ONE = {
      version: VER, ask: ask, think: think, thinkLocal: thinkLocal, remember: remember,
      verifyLedger: verifyLedger, eqsOf: eqsOf,
      trust: function () { return global.AKSI_TRUST; },
    };
    global.AKSI_ANSWER = function (q) { return think(q).then(function (r) { return r && r.text; }); };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : this);
