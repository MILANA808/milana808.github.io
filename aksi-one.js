/**
 * AKSI ONE — единый runtime v1.2
 * Exclusive chat handler (stopPropagation) — no app/llm race
 * Contact: aksilove@internet.ru · @AKSILOVE
 */
(function (global) {
  "use strict";
  var VER = "1.2.0";
  var MEM_KEY = "aksi_whole_mem_v3";
  var LEDGER_KEY = "aksi_proof_ledger_v1";
  var LLM_KEY = "aksi_llm_cfg_v1";
  var busy = false;
  var history = [];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function loadMem() {
    try {
      var a = JSON.parse(localStorage.getItem(MEM_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function saveMem(arr) {
    localStorage.setItem(MEM_KEY, JSON.stringify((arr || []).slice(-120)));
    var n = $("memN"); if (n) n.textContent = String((arr || []).length);
  }
  function remember(text, src) {
    var m = loadMem();
    m.push({ t: String(text).slice(0, 500), src: src || "user", ts: Date.now() });
    saveMem(m);
    appendLedger("memory", text);
    return m;
  }

  function loadLedger() {
    try {
      var a = JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
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
    localStorage.setItem(LEDGER_KEY, JSON.stringify(chain.slice(-200)));
    return body;
  }
  function verifyLedger() {
    var chain = loadLedger(), i;
    for (i = 0; i < chain.length; i++) {
      var b = Object.assign({}, chain[i]);
      var h = b.hash; delete b.hash;
      if (simpleHash(JSON.stringify(b)) !== h) return { ok: false, at: i, length: chain.length };
      if (i && chain[i].prev !== chain[i - 1].hash) return { ok: false, at: i, length: chain.length };
    }
    return { ok: true, length: chain.length };
  }

  function shannonH(text) {
    text = String(text || "");
    if (!text.length) return 0;
    var freq = {}, n = text.length, h = 0, c, p, i;
    for (i = 0; i < n; i++) { c = text.charAt(i); freq[c] = (freq[c] || 0) + 1; }
    for (c in freq) { p = freq[c] / n; h -= p * Math.log(p) / Math.LN2; }
    return Math.round(h * 10000) / 10000;
  }
  function eqsOf(text) {
    var h = shannonH(text);
    var words = String(text).trim().split(/\s+/).filter(Boolean);
    var uniq = {};
    words.forEach(function (w) { uniq[w.toLowerCase()] = 1; });
    var rel = words.length ? Object.keys(uniq).length / words.length : 0;
    var coh = Math.min(1, words.length / 40);
    var eqs = 0.30 * Math.min(1, h / 5) + 0.35 * rel + 0.25 * coh + 0.10 * 0.55;
    return { H: h, QCLI: Math.min(1, h / 5), H_eff: Math.round(h * rel * 10000) / 10000, EQS: Math.round(eqs * 1000) / 1000 };
  }

  function mskNow() {
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow", weekday: "long", day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit"
      }).format(new Date()) + " (MSK)";
    } catch (e) { return new Date().toLocaleString("ru-RU"); }
  }
  function localAnswer(q) {
    var low = String(q || "").toLowerCase().trim();
    if (!low) return null;
    if (/^(привет|здравств|добрый|hello|hi)\b/.test(low))
      return "Привет. Я АКСИ ONE. Чат работает. Спроси по делу или открой Нейро / WebLLM.";
    if (/кто ты|что ты такое|who are you/.test(low))
      return "Я АКСИ — суверенный напарник. Core + память + proof на устройстве.\nКонтакт: aksilove@internet.ru";
    if (/что умеешь|что можешь|помощь|help|команды/.test(low))
      return "• чат (всегда ответ)\n• запомни: факт\n• Нейро RWKV · WebLLM Ollama\n• EQS / цепочка / протокол / Edge\n• MATRIX";
    if (/время|который час|дата|сегодня/.test(low)) return "Сейчас: " + mskNow() + ".";
    if (/контакт|почта|email/.test(low)) return "aksilove@internet.ru · @AKSILOVE";
    if (/нейро|rwkv/.test(low)) return "Вкладка «Нейро» — RWKV на CPU. Обучи ядро → Спросить.";
    if (/ollama|llm|webllm/.test(low))
      return "Вкладка WebLLM: ollama run llama3.2 → Сохранить → Тест.";
    if (/формул|aksi\s*=/.test(low))
      return "AKSI = (A × I × S) × (1 + 0.4√n)\nEQS = 0.30·H + 0.35·rel + 0.25·coh + 0.10·age";
    if (/matrix/.test(low))
      return "MATRIX: https://milana808.github.io/aksi-matrix/";
    if (/что такое ии\b|искусственный интеллект/.test(low) && low.length < 48)
      return "ИИ — системы, которые делают то, что раньше требовало человеческого ума. Я — локальный агент: данные у тебя.";
    return null;
  }

  function matchMem(q) {
    var m = loadMem(), best = null, score = 0, i, words, hit;
    words = q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 2; });
    if (!words.length) return null;
    for (i = 0; i < m.length; i++) {
      hit = 0;
      words.forEach(function (w) {
        if (String(m[i].t || "").toLowerCase().indexOf(w) !== -1) hit++;
      });
      var s = hit / words.length;
      if (s > score) { score = s; best = m[i]; }
    }
    if (best && score >= 0.35) return "Из памяти:\n" + best.t;
    return null;
  }

  function bubble(role, text, meta) {
    var th = $("thread");
    if (!th) return;
    var d = document.createElement("div");
    d.className = "msg " + (role === "user" || role === "me" ? "me" : "ai");
    var b = document.createElement("div");
    b.className = "bub";
    b.textContent = text;
    if (meta) {
      var m = document.createElement("div");
      m.className = "meta";
      m.textContent = meta;
      b.appendChild(m);
    }
    d.appendChild(b);
    th.appendChild(d);
    th.scrollTop = th.scrollHeight;
  }

  function setBadge(t) {
    var el = $("stBadge");
    if (el) el.textContent = t;
  }

  function llmCfg() {
    try {
      var j = JSON.parse(localStorage.getItem(LLM_KEY) || "null");
      if (!j) return { on: true, base: "http://127.0.0.1:11434", model: "llama3.2" };
      return { on: j.on !== false, base: String(j.base || "http://127.0.0.1:11434").replace(/\/$/, ""), model: j.model || "llama3.2" };
    } catch (e) {
      return { on: true, base: "http://127.0.0.1:11434", model: "llama3.2" };
    }
  }
  function tryOllama(q) {
    var cfg = llmCfg();
    if (!cfg.on) return Promise.resolve(null);
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e) {} }, 12000);
    return fetch(cfg.base + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl && ctrl.signal,
      body: JSON.stringify({
        model: cfg.model, stream: false,
        prompt: "Ты АКСИ, суверенный напарник. Ответь по-русски кратко и по делу.\nВопрос: " + q,
        options: { temperature: 0.7 }
      })
    }).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (j) {
      return j && j.response ? String(j.response).trim() : null;
    }).catch(function () { clearTimeout(t); return null; });
  }

  function tryCore(q) {
    var c = global.AKSI_CORE || global.AksiCore;
    if (!c || typeof c.query !== "function") return Promise.resolve(null);
    return Promise.race([
      c.query(q),
      new Promise(function (r) { setTimeout(function () { r(null); }, 9000); })
    ]).then(function (res) {
      if (res && res.ok && res.text) return { text: res.text, meta: res.local ? "core · local" : "core · net" };
      return null;
    }).catch(function () { return null; });
  }

  function think(q) {
    q = String(q || "").trim();
    if (!q) return Promise.resolve({ text: "Пустой запрос.", meta: "one" });
    var memCmd = q.match(/^(запомни|выучи)\s*[:\s]+(.+)/i);
    if (memCmd) {
      remember(memCmd[2].trim(), "user");
      renderMemList();
      return Promise.resolve({ text: "Запомнила:\n«" + memCmd[2].trim() + "»", meta: "memory" });
    }
    if (/что ты помнишь|что ты знаешь/i.test(q)) {
      var m = loadMem();
      if (!m.length) return Promise.resolve({ text: "Память пуста. Напиши: запомни: …", meta: "memory" });
      return Promise.resolve({
        text: m.slice(-15).map(function (x, i) { return (i + 1) + ". " + x.t; }).join("\n"),
        meta: "memory"
      });
    }
    if (/забудь всё/i.test(q)) {
      saveMem([]);
      renderMemList();
      return Promise.resolve({ text: "Память очищена.", meta: "memory" });
    }
    var loc = localAnswer(q);
    var needNet = false;
    var c = global.AKSI_CORE || global.AksiCore;
    if (c && typeof c.needsNet === "function") {
      try { needNet = c.needsNet(q); } catch (e) {}
    } else {
      needNet = /\?$/.test(q) || /^(что такое|кто такой|найди|поиск|расскажи)/i.test(q) || q.split(/\s+/).length >= 5;
    }
    if (loc && !needNet) return Promise.resolve({ text: loc, meta: "local" });
    var fromMem = matchMem(q);
    if (fromMem && !needNet) return Promise.resolve({ text: fromMem, meta: "memory" });
    setBadge("search…");
    return tryCore(q).then(function (coreRes) {
      if (coreRes && coreRes.text) { setBadge("Core"); return coreRes; }
      setBadge("llm…");
      return tryOllama(q).then(function (ollama) {
        setBadge("ONE " + VER);
        if (ollama) return { text: ollama, meta: "ollama" };
        if (loc) return { text: loc, meta: "local" };
        if (fromMem) return { text: fromMem, meta: "memory" };
        return {
          text: "Пока нет уверенного ответа.\n\n• «привет» / «кто ты»\n• запомни: факт\n• вкладка Нейро\n• ollama run llama3.2\n• /aksi-matrix/",
          meta: "fallback"
        };
      });
    });
  }

  function ask(q) {
    if (busy) return;
    q = String(q || "").trim();
    if (!q) return;
    busy = true;
    bubble("me", q);
    var inp = $("inp");
    if (inp) inp.value = "";
    history.push({ role: "user", content: q });
    think(q).then(function (res) {
      busy = false;
      var text = (res && res.text) || "…";
      var meta = (res && res.meta) || "one";
      bubble("ai", text, meta);
      history.push({ role: "assistant", content: text });
      appendLedger("chat", "Q:" + q.slice(0, 80));
      var m = eqsOf(text);
      if ($("stEqs")) $("stEqs").textContent = String(m.EQS);
      if ($("stQ")) $("stQ").textContent = String(Math.round(m.QCLI * 100) / 100);
    }).catch(function (e) {
      busy = false;
      bubble("ai", "Сбой: " + (e && e.message || e), "error");
    });
  }

  function renderMemList() {
    var box = $("memList");
    if (!box) return;
    var m = loadMem();
    if ($("memN")) $("memN").textContent = String(m.length);
    if (!m.length) { box.innerHTML = "<p class=\"muted\">Пусто</p>"; return; }
    box.innerHTML = m.slice(-20).map(function (x) {
      return "<div class=\"card\" style=\"padding:10px;margin:6px 0\">" + esc(x.t) + "</div>";
    }).join("");
  }

  function wire() {
    var send = $("send");
    var inp = $("inp");
    if (send) {
      send.onclick = null;
      send.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        ask(inp && inp.value);
      }, true);
    }
    if (inp) {
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          ask(inp.value);
        }
      }, true);
    }
    document.addEventListener("click", function (e) {
      var chip = e.target.closest && e.target.closest("[data-ask]");
      if (chip) {
        e.preventDefault();
        e.stopPropagation();
        ask(chip.getAttribute("data-ask"));
      }
    }, true);
    var teach = $("btnTeach");
    if (teach) teach.onclick = function () {
      var t = ($("teachBox") && $("teachBox").value || "").trim();
      if (!t) return;
      remember(t, "teach");
      $("teachBox").value = "";
      renderMemList();
      bubble("ai", "Запомнила:\n«" + t + "»", "memory");
    };
    var btnMet = $("btnMet");
    if (btnMet) btnMet.onclick = function () {
      var t = ($("mIn") && $("mIn").value) || "";
      var m = eqsOf(t);
      if ($("mEqs")) $("mEqs").textContent = String(m.EQS);
      if ($("mQcli")) $("mQcli").textContent = String(m.QCLI);
      if ($("mH")) $("mH").textContent = String(m.H);
      if ($("mHeff")) $("mHeff").textContent = String(m.H_eff);
    };
    var btnProof = $("btnProof");
    if (btnProof) btnProof.onclick = function () {
      var v = verifyLedger();
      var out = $("pOut");
      if (out) out.textContent = v.ok ? "Цепочка цела · " + v.length + " записей" : "Разрыв · at " + v.at;
    };
    var btnProofClear = $("btnProofClear");
    if (btnProofClear) btnProofClear.onclick = function () {
      localStorage.setItem(LEDGER_KEY, "[]");
      if ($("pOut")) $("pOut").textContent = "Очищено";
    };
    var btnWipe = $("btnWipe");
    if (btnWipe) btnWipe.onclick = function () { saveMem([]); renderMemList(); };
    var btnBell = $("btnBell");
    if (btnBell) btnBell.onclick = function () {
      var out = $("qOut");
      if (out) out.textContent = "Bell |Φ+⟩ sim\n00: " + (0.5 + Math.random() * 0.02).toFixed(3) +
        "\n11: " + (0.5 - Math.random() * 0.02).toFixed(3) + "\n(локальный RNG)";
    };
    var btnSuper = $("btnSuper");
    if (btnSuper) btnSuper.onclick = function () {
      var out = $("qOut");
      if (out) out.textContent = "|+⟩ = (|0⟩+|1⟩)/√2\np0≈" + (0.5 + (Math.random() - 0.5) * 0.1).toFixed(3);
    };
    var btnLlmSave = $("btnLlmSave");
    if (btnLlmSave) btnLlmSave.onclick = function () {
      var cfg = {
        on: $("llmOn") ? $("llmOn").checked : true,
        base: ($("llmBase") && $("llmBase").value) || "http://127.0.0.1:11434",
        model: ($("llmModel") && $("llmModel").value) || "llama3.2"
      };
      localStorage.setItem(LLM_KEY, JSON.stringify(cfg));
      if ($("llmStatus")) $("llmStatus").textContent = "Сохранено · offline-first UI";
    };
    var btnLlmTest = $("btnLlmTest");
    if (btnLlmTest) btnLlmTest.onclick = function () {
      if ($("llmStatus")) $("llmStatus").textContent = "Тест…";
      tryOllama("скажи ок").then(function (t) {
        if ($("llmStatus")) $("llmStatus").textContent = t ? "OK: " + t.slice(0, 80) : "Нет ответа (запусти: ollama run llama3.2)";
      });
    };
    var btnFullExp = $("btnFullExp");
    if (btnFullExp) btnFullExp.onclick = function () {
      var blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), mem: loadMem(), ledger: loadLedger() }, null, 2)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "aksi-backup.json"; a.click();
    };

    function didStr() {
      try {
        var d = localStorage.getItem("aksi_did_v1");
        if (d) return d;
        var id = "did:aksi:" + simpleHash(String(Date.now()) + Math.random()).slice(0, 12);
        localStorage.setItem("aksi_did_v1", id);
        return id;
      } catch (e) { return "did:aksi:local"; }
    }
    if ($("didVal")) $("didVal").textContent = didStr();
    if ($("prDid")) $("prDid").textContent = didStr().replace("did:aksi:", "").slice(0, 10) + "…";
    var btnHs = $("btnHandshake");
    if (btnHs) btnHs.onclick = function () {
      var env = { type: "handshake", protocol: "AKSI-Agent-v1", did: didStr(), ts: Date.now() };
      appendLedger("handshake", JSON.stringify(env));
      if ($("prMsg")) $("prMsg").textContent = String(loadLedger().filter(function (x) { return x.kind === "handshake" || x.kind === "envelope"; }).length);
      if ($("prOut")) $("prOut").textContent = JSON.stringify(env, null, 2);
    };
    var btnEnv = $("btnEnvelope");
    if (btnEnv) btnEnv.onclick = function () {
      var payload = { type: "envelope", did: didStr(), body: "ping", ts: Date.now() };
      payload.fingerprint = simpleHash(JSON.stringify(payload));
      appendLedger("envelope", payload.fingerprint);
      if ($("prOut")) $("prOut").textContent = JSON.stringify(payload, null, 2);
    };
    var btnEdge = $("btnEdge");
    if (btnEdge) btnEdge.onclick = function () {
      var q = ($("eQuery") && $("eQuery").value) || "что умеешь";
      var t0 = Date.now();
      think(q).then(function (res) {
        var ms = Date.now() - t0;
        if ($("eMs")) $("eMs").textContent = String(ms);
        if ($("eHits")) $("eHits").textContent = String((Number($("eHits").textContent) || 0) + 1);
        if ($("eOut")) $("eOut").textContent = (res && res.text) || "—";
        if ($("eMode")) $("eMode").textContent = (res && res.meta) || "cpu";
      });
    };
    var btnEdgeClear = $("btnEdgeClear");
    if (btnEdgeClear) btnEdgeClear.onclick = function () {
      if ($("eOut")) $("eOut").textContent = "—";
      if ($("eMs")) $("eMs").textContent = "—";
    };
    if (global.AKSI_DKV && !global.DKV) global.DKV = global.AKSI_DKV;

    renderMemList();
    appendLedger("session", "AKSI ONE " + VER);
    setBadge("ONE " + VER);
  }

  function boot() {
    wire();
    global.AKSI_ONE = {
      version: VER, ask: ask, think: think, remember: remember,
      verifyLedger: verifyLedger, eqsOf: eqsOf
    };
    global.AKSI_ANSWER = function (q) { return think(q).then(function (r) { return r && r.text; }); };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : this);
