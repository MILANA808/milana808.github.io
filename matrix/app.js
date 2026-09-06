/** AKSI MATRIX v14 — unified: local AI → quantum → ADIA → ECDSA seal · © AKSI */
(function () {
  "use strict";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var DB = "aksi_matrix_v7";
  var MODEL = "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC";
  var rag = [], keyPair = null, lastSig = null, engine = null, busy = false, webllmLoading = false, lastQx = null;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  }
  function bootMsg(t, pct) {
    var m = $("bootMsg"); if (m) m.textContent = t || "";
    var b = $("bootBar"); if (b && pct != null) b.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }
  function setStatus(t) { var s = $("statusLine"); if (s) s.textContent = t; }
  function hideBoot() {
    var b = $("boot"), a = $("app");
    if (a) a.hidden = false;
    if (b) { b.classList.add("hide"); setTimeout(function () { try { b.style.display = "none"; } catch (e) {} }, 350); }
  }
  function idbOpen() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains("rag")) d.createObjectStore("rag", { keyPath: "id", autoIncrement: true });
        if (!d.objectStoreNames.contains("keys")) d.createObjectStore("keys");
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbPut(store, val, key) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var os = db.transaction(store, "readwrite").objectStore(store);
        var req = key != null ? os.put(val, key) : os.put(val);
        req.onsuccess = function () { res(req.result); };
        req.onerror = function () { rej(req.error); };
      });
    });
  }
  function idbGet(store, key) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var req = db.transaction(store, "readonly").objectStore(store).get(key);
        req.onsuccess = function () { res(req.result); };
        req.onerror = function () { rej(req.error); };
      });
    });
  }
  function idbAll(store) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var req = db.transaction(store, "readonly").objectStore(store).getAll();
        req.onsuccess = function () { res(req.result || []); };
        req.onerror = function () { rej(req.error); };
      });
    });
  }
  function b64(buf) {
    var u = new Uint8Array(buf), s = "", i;
    for (i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  async function sha256(text) {
    var h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(h)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
  }
  async function ensureKeys() {
    if (keyPair) return keyPair;
    try {
      var stored = await idbGet("keys", "ecdsa");
      if (stored && stored.privateKey) {
        keyPair = {
          privateKey: await crypto.subtle.importKey("jwk", stored.privateKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]),
          publicKey: await crypto.subtle.importKey("jwk", stored.publicKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"])
        };
        return keyPair;
      }
    } catch (e) {}
    keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    await idbPut("keys", {
      privateKey: await crypto.subtle.exportKey("jwk", keyPair.privateKey),
      publicKey: await crypto.subtle.exportKey("jwk", keyPair.publicKey)
    }, "ecdsa");
    return keyPair;
  }
  async function signText(text) {
    await ensureKeys();
    var sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, new TextEncoder().encode(text));
    return { alg: "ECDSA-P256-SHA256", did: DID, sha256: await sha256(text), signature: b64(sig), ts: Date.now() };
  }
  async function loadRag() {
    try { rag = await idbAll("rag"); } catch (e) { rag = []; }
    if ($("kvRag")) $("kvRag").textContent = String(rag.length);
  }
  function tok(s) {
    return String(s || "").toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ").split(/\s+/).filter(function (t) { return t.length > 2; });
  }
  function ragRetrieve(q, k) {
    k = k || 3;
    return rag.map(function (r) {
      var qt = tok(q), tt = tok(r.text), set = {}, i, hit = 0;
      for (i = 0; i < tt.length; i++) set[tt[i]] = 1;
      for (i = 0; i < qt.length; i++) if (set[qt[i]]) hit++;
      return { text: r.text, score: qt.length ? hit / qt.length : 0, name: r.name };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, k).filter(function (x) { return x.score > 0.05; });
  }
  function detectSkill(userText) {
    var low = userText.toLowerCase().trim();
    var hashM = low.match(/(?:hash|хеш|sha256)\s+(.+)/i);
    if (hashM) return { name: "hash", arg: hashM[1].trim() };
    if (/(uuid|guid)/i.test(low)) return { name: "uuid" };
    if (/(который час|сколько времени)/i.test(low)) return { name: "now" };
    var calcM = low.match(/(?:посчитай|вычисли|calc)\s+(.+)/i);
    if (calcM) return { name: "calc", arg: calcM[1].trim() };
    return null;
  }
  async function runSkill(skill) {
    if (skill.name === "hash") return "SHA-256: " + await sha256(skill.arg || "");
    if (skill.name === "uuid") return "UUID: " + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
    if (skill.name === "now") return "Время: " + new Date().toLocaleString("ru-RU");
    if (skill.name === "calc") {
      try {
        var safe = (skill.arg || "").replace(/[^0-9+\-*/().%\s]/g, "");
        var v = Function('"use strict";return (' + safe + ")")();
        if (typeof v === "number" && isFinite(v)) return "Результат: " + v;
      } catch (e) {}
      return "Не удалось вычислить.";
    }
    return null;
  }
  async function loadWebLLM() {
    if (webllmLoading) return false;
    var hasGPU = false;
    try { hasGPU = !!(navigator.gpu && typeof navigator.gpu.requestAdapter === "function"); } catch (e) {}
    if (!hasGPU) {
      setStatus("ядро · без WebGPU");
      if ($("kvModel")) $("kvModel").textContent = "Ядро";
      hideBoot(); return false;
    }
    webllmLoading = true;
    bootMsg("Подключаю нейросеть…", 5);
    var boot = $("boot");
    if (boot) { boot.style.display = "flex"; boot.classList.remove("hide"); }
    try {
      var mod = await import("https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm").catch(function () {
        return import("https://esm.sh/@mlc-ai/web-llm@0.2.79");
      });
      var CreateMLCEngine = mod.CreateMLCEngine || (mod.default && mod.default.CreateMLCEngine);
      if (!CreateMLCEngine) throw new Error("движок не найден");
      engine = await CreateMLCEngine(MODEL, {
        initProgressCallback: function (r) {
          var p = Math.round((r.progress || 0) * 100);
          bootMsg((r.text || "Загрузка") + " · " + p + "%", Math.min(99, p));
        }
      });
      if ($("kvModel")) $("kvModel").textContent = "нейросеть";
      hideBoot();
      bubble("ai", "Нейросеть загружена. Ответ → квант → ADIA → ECDSA.", "webllm");
      webllmLoading = false; return true;
    } catch (e) {
      bootMsg("Ядро offline", 100);
      setTimeout(function () { hideBoot(); }, 400);
      webllmLoading = false; return false;
    }
  }
  async function webllmChat(q, context) {
    if (!engine) return null;
    try {
      var messages = [
        { role: "system", content: "Ты АКСИ — локальный ИИ. Отвечай по-русски, кратко. DID: " + DID },
        { role: "user", content: (context ? context + "\n\n" : "") + q }
      ];
      var out = await engine.chat.completions.create({ messages: messages, max_tokens: 400, temperature: 0.7 });
      var text = out && out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content;
      return text ? String(text).trim() : null;
    } catch (e) { return null; }
  }
  function bubble(role, text, meta) {
    var th = $("thread"); if (!th) return;
    var d = document.createElement("div");
    d.className = "bub" + (role === "me" ? " me" : "");
    d.textContent = text || "";
    if (meta) { var s = document.createElement("div"); s.className = "m"; s.textContent = meta; d.appendChild(s); }
    th.appendChild(d);
    try { d.scrollIntoView({ block: "end" }); } catch (e) {}
  }
  function quantumSeal(q, text) {
    if (!window.AKSI_QUANTUM || !AKSI_QUANTUM.answerGate) return { meta: "", qx: null };
    try {
      var qx = AKSI_QUANTUM.answerGate(q, text);
      lastQx = qx;
      var band = qx.band === "high" ? "высокая" : qx.band === "mid" ? "средняя" : "низкая";
      var meta = "Q" + qx.QCLI + " · R" + qx.resonance + " · " + (qx.bits || "") + " · " + band;
      try { if (qx.bloch0 && $("bloch")) drawBlochCanvas($("bloch"), qx.bloch0); } catch (e) {}
      return { meta: meta, qx: qx };
    } catch (e) { return { meta: "", qx: null }; }
  }
  function drawBlochCanvas(canvas, bloch) {
    if (!canvas || !bloch) return;
    var ctx = canvas.getContext("2d"); if (!ctx) return;
    var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.38;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(167,139,250,0.45)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
    var theta = bloch.theta != null ? bloch.theta : Math.acos(Math.max(-1, Math.min(1, bloch.z || 0)));
    var phi = bloch.phi != null ? bloch.phi : Math.atan2(bloch.y || 0, bloch.x || 0);
    var x = r * Math.sin(theta) * Math.cos(phi), y = -r * Math.cos(theta);
    ctx.fillStyle = "#a78bfa";
    ctx.beginPath(); ctx.arc(cx + x, cy + y, 6, 0, Math.PI * 2); ctx.fill();
  }
  async function integrityPipeline(q, text, source) {
    var pipe = { source: source || "matrix", quantum: null, qcli: null, eqs: null, aksi: null, gate: null, seal: null, meta: [] };
    pipe.meta.push(source || "local");
    try {
      if (window.AKSI_QPIPE && typeof AKSI_QPIPE.processAnswer === "function") {
        var qp = await AKSI_QPIPE.processAnswer(q, text, { force: true });
        pipe.quantum = qp && (qp.quantum || qp);
        pipe.qcli = qp && (qp.QCLI != null ? qp.QCLI : (qp.quantum && qp.quantum.QCLI));
        if (pipe.qcli != null) pipe.meta.push("Q" + pipe.qcli);
        if (qp && qp.quantum) {
          lastQx = qp.quantum;
          try { if (qp.quantum.bloch0 && $("bloch")) drawBlochCanvas($("bloch"), qp.quantum.bloch0); } catch (e) {}
        }
      } else {
        var qs = quantumSeal(q, text);
        pipe.quantum = qs.qx;
        if (qs.meta) pipe.meta.push(qs.meta);
        if (qs.qx && qs.qx.QCLI != null) pipe.qcli = qs.qx.QCLI;
      }
    } catch (e) { pipe.meta.push("q-err"); }
    try {
      if (window.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate) {
        var ev = AKSI_ALGORITHM.evaluate(q, text, { seal: true });
        var eqs = ev && (ev.eqs != null ? ev.eqs : (ev.metrics && ev.metrics.eqs));
        if (eqs != null) { pipe.eqs = Number(eqs); pipe.meta.push("EQS" + pipe.eqs.toFixed(2)); }
      } else if (window.AKSI_DECISION && AKSI_DECISION.decide) {
        var d = AKSI_DECISION.decide(q);
        if (d && d.scores) {
          pipe.eqs = d.scores.eqs; pipe.aksi = d.scores.aksi; pipe.gate = d.gate;
          if (d.scores.aksi != null) pipe.meta.push("AKSI" + d.scores.aksi);
          if (d.scores.eqs != null) pipe.meta.push("EQS" + d.scores.eqs);
        }
      }
    } catch (e) {}
    try {
      var body = JSON.stringify({ q: q, a: text, qcli: pipe.qcli, eqs: pipe.eqs, src: source, t: Date.now() });
      lastSig = await signText(body);
      pipe.seal = lastSig;
      pipe.meta.push("ECDSA");
      if (lastSig && lastSig.sha256) pipe.meta.push(String(lastSig.sha256).slice(0, 8));
    } catch (e) {
      try {
        var h = 0x811c9dc5, i, s = q + "|" + text;
        for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
        pipe.seal = { alg: "FNV-1a", hash: ("00000000" + (h >>> 0).toString(16)).slice(-8), did: DID };
        pipe.meta.push("FNV");
      } catch (e2) {}
    }
    return pipe;
  }
  async function think(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Пустой запрос.", meta: "matrix", pipe: null };
    var skill = detectSkill(q);
    if (skill) {
      var so = await runSkill(skill);
      if (so) { var p0 = await integrityPipeline(q, so, "навык"); return { text: so, meta: p0.meta.join(" · "), pipe: p0 }; }
    }
    if (/^статус$/i.test(q)) {
      var gs = (window.AKSI_COMPOSE && AKSI_COMPOSE.status) ? AKSI_COMPOSE.status() : {};
      var qv = window.AKSI_QUANTUM ? (AKSI_QUANTUM.version || "on") : "—";
      var qp = window.AKSI_QPIPE ? AKSI_QPIPE.version : "—";
      var text = "MATRIX v14 · unified pipeline\nМодель: " + (engine ? "WebLLM" : (window.AKSI_ZERO ? "Zero" : (window.AKSI_COMPOSE ? "Compose" : "Neuro"))) +
        "\nКвант: " + qv + " · QPIPE " + qp +
        "\nФайлы RAG: " + rag.length + "\nDID: " + DID +
        "\nКонтур: AI → quantum → ADIA → ECDSA";
      return { text: text, meta: "статус", pipe: null };
    }
    if (/^did$/i.test(q)) return { text: "DID: " + DID, meta: "did", pipe: null };
    var hits = ragRetrieve(q, 3);
    var ctx = hits.length && hits[0].score >= 0.12 ? hits.map(function (h) { return h.text.slice(0, 400); }).join("\n---\n") : "";
    var answer = null, source = "local";
    if (engine) {
      var wl = await webllmChat(q, ctx ? "Контекст файлов:\n" + ctx : "");
      if (wl) { answer = wl; source = "webllm"; }
    }
    if (!answer && window.AKSI_ZERO && typeof AKSI_ZERO.think === "function") {
      try {
        var z = AKSI_ZERO.think(q);
        if (z && (z.answer || z.text)) { answer = String(z.answer || z.text); source = "zero"; }
      } catch (e) {}
    }
    if (!answer && ctx && hits[0].score >= 0.25) {
      answer = "По вашим файлам:\n\n" + hits.map(function (h, i) { return (i + 1) + ". [" + h.name + "] " + h.text.slice(0, 280); }).join("\n\n");
      source = "rag";
    }
    if (!answer && window.AKSI_COMPOSE && AKSI_COMPOSE.think) {
      try {
        var comp = AKSI_COMPOSE.think(q);
        if (comp && comp.text) { answer = comp.text; source = comp.mode || "compose"; }
      } catch (e) {}
    }
    if (!answer && window.AKSI_NEURO && AKSI_NEURO.think) {
      try {
        var n = AKSI_NEURO.think(q);
        if (n && n.text) { answer = n.text; source = n.mode || "neuro"; }
      } catch (e) {}
    }
    if (!answer) {
      answer = "Мало локальных данных. «запомни: факт» или файл RAG.\n\nКонтур: локальный ИИ → квантовый симулятор → ADIA → ECDSA.\nDID: " + DID;
      source = "fallback";
    }
    var pipe = await integrityPipeline(q, answer, source);
    return { text: answer, meta: pipe.meta.join(" · "), pipe: pipe };
  }
  async function ask(q) {
    if (busy) return;
    q = String(q || "").trim(); if (!q) return;
    busy = true; bubble("me", q); if ($("inp")) $("inp").value = ""; setStatus("AI → quantum → seal…");
    try {
      var r = await think(q);
      bubble("ai", r.text, r.meta || "");
      if (r.pipe && r.pipe.seal) {
        try { var pre = $("cryptoOut"); if (pre) pre.textContent = JSON.stringify(r.pipe.seal, null, 2); } catch (e) {}
      }
      if (r.pipe && r.pipe.quantum) {
        try { showQ(r.pipe.quantum, "ответ → симулятор"); } catch (e) {}
      }
      setStatus((engine ? "WebLLM" : "local") + " · Q" + (r.pipe && r.pipe.qcli != null ? r.pipe.qcli : "—") + " · sealed · RAG " + rag.length);
      if ($("kvQ") && r.pipe && r.pipe.qcli != null) $("kvQ").textContent = String(r.pipe.qcli);
    } catch (e) { bubble("ai", "Сбой: " + (e.message || e), "ошибка"); }
    busy = false;
  }
  function showQ(obj, title) {
    var out = $("qOut"); if (!out) return;
    var lines = [];
    if (title) lines.push("—— " + title + " ——");
    if (typeof obj === "string") lines.push(obj);
    else if (obj) {
      try {
        if (obj.QCLI != null) lines.push("QCLI: " + obj.QCLI);
        if (obj.resonance != null) lines.push("Резонанс: " + obj.resonance);
        if (obj.entropy != null) lines.push("Энтропия: " + obj.entropy);
        if (obj.purity != null) lines.push("Чистота: " + obj.purity);
        if (obj.bits != null) lines.push("Измерение: " + obj.bits);
        if (obj.S != null) lines.push("CHSH S: " + obj.S + (obj.S > 2 ? " (Белл)" : ""));
        if (obj.circuit) lines.push("Схема: " + obj.circuit);
        if (obj.band) lines.push("Полоса: " + obj.band);
        if (lines.length < 3) lines.push(JSON.stringify(obj, null, 2));
      } catch (e) { lines.push(String(obj)); }
    }
    out.textContent = lines.join("\n");
  }
  function runQuantumDemo(kind) {
    if (!window.AKSI_QUANTUM) { showQ("Квантовый модуль не загружен", "ошибка"); return; }
    var Q = AKSI_QUANTUM;
    try {
      if (kind === "bell") {
        var c = Q.bell("phi+");
        var sum = typeof c.summary === "function" ? c.summary() : c;
        showQ(sum, "Белл Φ+");
        if (c.bloch && $("bloch")) drawBlochCanvas($("bloch"), c.bloch(0));
        else if (sum && sum.bloch0 && $("bloch")) drawBlochCanvas($("bloch"), sum.bloch0);
      } else if (kind === "shot") {
        var s = Q.shot("matrix·aksi");
        showQ(s, "Измерение");
        if (s.bloch0 && $("bloch")) drawBlochCanvas($("bloch"), s.bloch0);
      } else if (kind === "chsh") {
        showQ(Q.chsh(2048), "CHSH");
      } else if (kind === "gate") {
        var ag = Q.answerGate("Кто ты?", "Я АКСИ — локальный ИИ с квантовым симулятором");
        showQ(ag, "answerGate");
        if (ag.bloch0 && $("bloch")) drawBlochCanvas($("bloch"), ag.bloch0);
      } else if (kind === "last" && lastQx) {
        showQ(lastQx, "Последняя печать");
        if (lastQx.bloch0 && $("bloch")) drawBlochCanvas($("bloch"), lastQx.bloch0);
      }
    } catch (e) { showQ(String(e.message || e), "ошибка"); }
  }
  function goTab(t) {
    document.querySelectorAll(".tabs [data-tab]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === t); });
    document.querySelectorAll(".main .panel, .stage .panel").forEach(function (p) { p.classList.toggle("on", p.id === "tab-" + t); });
    if (t === "ui") {
      if ($("kvModel")) $("kvModel").textContent = engine ? "нейросеть" : (window.AKSI_ZERO ? "Zero" : "Neuro");
      if ($("kvQ")) $("kvQ").textContent = window.AKSI_QUANTUM ? "on" : "—";
      if ($("kvRag")) $("kvRag").textContent = String(rag.length);
    }
    if (t === "bloch") runQuantumDemo(lastQx ? "last" : "bell");
  }
  async function onRagFiles(files) {
    if (!files || !files.length) return;
    var i, f, text;
    for (i = 0; i < files.length; i++) {
      f = files[i];
      try { text = await f.text(); await idbPut("rag", { name: f.name, text: text.slice(0, 120000), ts: Date.now() }); } catch (e) {}
    }
    await loadRag();
    bubble("ai", "RAG: +" + files.length + " · всего " + rag.length, "файлы");
  }
  async function start() {
    try {
      bootMsg("IndexedDB…", 15); try { await idbOpen(); } catch (e) {}
      bootMsg("Ключи ECDSA…", 30); try { await ensureKeys(); } catch (e) {}
      bootMsg("RAG…", 45); try { await loadRag(); } catch (e) { rag = []; }
      bootMsg("Контур ready", 80);
      if ($("kvModel")) $("kvModel").textContent = "local";
      if ($("kvDid")) $("kvDid").textContent = "P-256";
      hideBoot();
      setStatus("v14 · AI→Q→seal");
      bubble("ai", "MATRIX v14. Каждый ответ: локальный ИИ → квантовый симулятор → ADIA → ECDSA.\nWebLLM опционален (кнопка).", "pipeline");
      setTimeout(function () { loadWebLLM(); }, 600);
    } catch (e) {
      hideBoot();
      bubble("ai", "Старт с ошибкой: " + (e.message || e), "ошибка");
    }
  }
  document.querySelectorAll(".tabs [data-tab]").forEach(function (btn) {
    btn.addEventListener("click", function () { goTab(btn.getAttribute("data-tab")); });
  });
  document.querySelectorAll(".chip[data-ask]").forEach(function (btn) {
    btn.addEventListener("click", function () { ask(btn.getAttribute("data-ask")); });
  });
  if ($("send")) $("send").onclick = function () { ask(($("inp") || {}).value); };
  if ($("inp")) $("inp").addEventListener("keydown", function (e) { if (e.key === "Enter") ask($("inp").value); });
  if ($("btnClear")) $("btnClear").onclick = function () { if ($("thread")) $("thread").innerHTML = ""; };
  if ($("btnModel")) $("btnModel").onclick = function () { loadWebLLM(); };
  if ($("btnRag")) $("btnRag").onclick = function () { if ($("ragFile")) $("ragFile").click(); };
  if ($("ragFile")) $("ragFile").addEventListener("change", function () { onRagFiles($("ragFile").files); $("ragFile").value = ""; });
  if ($("btnVoice")) $("btnVoice").onclick = function () {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { bubble("ai", "Голос недоступен", "голос"); return; }
    var r = new SR(); r.lang = "ru-RU";
    r.onresult = function (ev) { ask(ev.results[0][0].transcript); }; r.start();
  };
  if ($("btnTrust")) $("btnTrust").onclick = function () { goTab("crypto"); };
  if ($("btnPro")) $("btnPro").onclick = function () { goTab("ui"); };
  if ($("btnBell")) $("btnBell").onclick = function () { runQuantumDemo("bell"); };
  if ($("btnShot")) $("btnShot").onclick = function () { runQuantumDemo("shot"); };
  if ($("btnChsh")) $("btnChsh").onclick = function () { runQuantumDemo("chsh"); };
  if ($("btnGate")) $("btnGate").onclick = function () { runQuantumDemo("gate"); };
  if ($("btnQ2Bell")) $("btnQ2Bell").onclick = function () { runQuantumDemo("bell"); };
  if ($("btnQ2Sample")) $("btnQ2Sample").onclick = function () {
    if (window.AKSI_QUANTUM) showQ(AKSI_QUANTUM.chsh(1024), "1024 shots");
  };
  if ($("btnSign")) $("btnSign").onclick = async function () {
    try {
      var msg = ($("signMsg") || {}).value || "";
      lastSig = await signText(msg);
      if ($("cryptoOut")) $("cryptoOut").textContent = JSON.stringify(lastSig, null, 2);
    } catch (e) { if ($("cryptoOut")) $("cryptoOut").textContent = String(e); }
  };
  start();
})();
