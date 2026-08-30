/** AKSI MATRIX v13 — локальный ИИ + квантовый симулятор · © AKSI */
(function () {
  "use strict";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var DB = "aksi_matrix_v7";
  var MODEL = "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC";
  var rag = [], keyPair = null, lastSig = null, engine = null, busy = false, webllmLoading = false, lastQx = null;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
        var v = Function('"use strict";return(' + safe + ")")();
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
      try { bubble("ai", "Нейросеть недоступна (нет WebGPU).\nРаботает локальное ядро + квантовый симулятор.", "ядро"); } catch (e) {}
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
      bubble("ai", "Нейросеть загружена. Каждый ответ проходит квантовый симулятор.", "нейросеть");
      webllmLoading = false; return true;
    } catch (e) {
      bootMsg("Нейросеть недоступна — ядро", 100);
      setTimeout(function () { hideBoot(); bubble("ai", "Нейросеть недоступна. Работает локальное ядро + квант.", "ядро"); }, 500);
      webllmLoading = false; return false;
    }
  }
  async function webllmChat(q, context) {
    if (!engine) return null;
    try {
      var messages = [
        { role: "system", content: "Ты АКСИ — локальный ИИ. Отвечай только по-русски, кратко и по делу. DID: " + DID },
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
    d.className = "msg " + (role === "me" ? "me" : "ai");
    d.innerHTML = '<div class="bub">' + esc(text) + (meta ? '<div class="meta">' + esc(meta) + "</div>" : "") + "</div>";
    th.appendChild(d);
    try { th.lastElementChild.scrollIntoView({ block: "end" }); } catch (e) {}
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
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
    var x = bloch.x || 0, z = bloch.z || 0;
    var px = cx + x * r, py = cy - z * r;
    ctx.strokeStyle = "#22d3ee"; ctx.fillStyle = "#a78bfa"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9b93b0"; ctx.font = "11px system-ui";
    ctx.fillText("|0⟩", cx - 8, cy - r - 6);
    ctx.fillText("|1⟩", cx - 8, cy + r + 14);
  }
  async function think(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Пустой запрос.", meta: "matrix" };
    var skill = detectSkill(q);
    if (skill) { var so = await runSkill(skill); if (so) return { text: so, meta: "навык" }; }
    if (/^статус$/i.test(q)) {
      var gs = (window.AKSI_COMPOSE && AKSI_COMPOSE.status) ? AKSI_COMPOSE.status() : {};
      var qv = window.AKSI_QUANTUM ? (AKSI_QUANTUM.version || "on") : "—";
      return { text: "Модель: " + (engine ? "нейросеть" : (window.AKSI_COMPOSE ? "ядро v2" : "Neuro")) +
        "\nКвант: " + qv + "\nРост ядра: " + (gs.growth != null ? gs.growth : "—") +
        "\nГенераций: " + (gs.generations != null ? gs.generations : "—") +
        "\nФайлы: " + rag.length + "\nDID: " + DID, meta: "статус" };
    }
    if (/^did$/i.test(q)) return { text: "DID: " + DID, meta: "did" };
    var hits = ragRetrieve(q, 3);
    var ctx = hits.length && hits[0].score >= 0.12 ? hits.map(function (h) { return h.text.slice(0, 400); }).join("\n---\n") : "";
    if (engine) {
      var wl = await webllmChat(q, ctx ? "Контекст файлов:\n" + ctx : "");
      if (wl) { var qs = quantumSeal(q, wl); return { text: wl, meta: "нейросеть · " + (qs.meta || "квант") }; }
    }
    if (ctx && hits[0].score >= 0.25) {
      var ragText = "По вашим файлам:\n\n" + hits.map(function (h, i) { return (i + 1) + ". [" + h.name + "] " + h.text.slice(0, 280); }).join("\n\n");
      var qsR = quantumSeal(q, ragText);
      return { text: ragText, meta: "файлы · " + (qsR.meta || "") };
    }
    if (window.AKSI_COMPOSE && AKSI_COMPOSE.think) {
      try {
        var comp = AKSI_COMPOSE.think(q);
        if (comp && comp.text) {
          var metaC = (comp.mode || "ядро") + " · " + Math.round((comp.confidence || 0) * 100) + "%";
          var qsC = quantumSeal(q, comp.text);
          if (qsC.meta) metaC += " · " + qsC.meta;
          try {
            if (window.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate) {
              var ev = AKSI_ALGORITHM.evaluate(q, comp.text, { seal: true });
              var eqs = ev && (ev.eqs != null ? ev.eqs : (ev.metrics && ev.metrics.eqs));
              if (eqs != null) metaC += " · EQS" + Number(eqs).toFixed(2);
            }
          } catch (e) {}
          return { text: comp.text, meta: metaC };
        }
      } catch (e) {}
    }
    if (window.AKSI_NEURO && AKSI_NEURO.think) {
      var n = AKSI_NEURO.think(q);
      if (n && n.text) {
        var qsN = quantumSeal(q, n.text);
        return { text: n.text, meta: (n.mode || "neuro") + (qsN.meta ? " · " + qsN.meta : "") };
      }
    }
    return { text: "Мало локальных данных. Напишите «запомни: факт» или загрузите файл.\n\nDID: " + DID, meta: "запасной" };
  }
  async function ask(q) {
    if (busy) return;
    q = String(q || "").trim(); if (!q) return;
    busy = true; bubble("me", q); if ($("inp")) $("inp").value = ""; setStatus("думаю…");
    try {
      var r = await think(q); var meta = r.meta || "";
      try { lastSig = await signText(r.text); meta += " · подпись"; } catch (e) {}
      bubble("ai", r.text, meta);
      setStatus((engine ? "нейросеть" : "ядро") + " · квант · файлы " + rag.length);
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
        if (obj.S != null) lines.push("CHSH S: " + obj.S + (obj.S > 2 ? " (нарушение неравенства Белла)" : ""));
        if (obj.circuit) lines.push("Схема: " + obj.circuit);
        if (obj.backend) lines.push("Бэкенд: " + obj.backend);
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
        showQ(sum, "Состояние Белла Φ+");
        if (c.bloch && $("bloch")) drawBlochCanvas($("bloch"), c.bloch(0));
        else if (sum && sum.bloch0 && $("bloch")) drawBlochCanvas($("bloch"), sum.bloch0);
      } else if (kind === "shot") {
        var s = Q.shot("matrix·aksi");
        showQ(s, "Измерение (shot)");
        if (s.bloch0 && $("bloch")) drawBlochCanvas($("bloch"), s.bloch0);
      } else if (kind === "chsh") {
        showQ(Q.chsh(2048), "Тест CHSH (Белл)");
      } else if (kind === "gate") {
        var ag = Q.answerGate("Кто ты?", "Я АКСИ — локальный ИИ с квантовым симулятором");
        showQ(ag, "answerGate · печать ответа");
        if (ag.bloch0 && $("bloch")) drawBlochCanvas($("bloch"), ag.bloch0);
      } else if (kind === "last" && lastQx) {
        showQ(lastQx, "Последняя квантовая печать");
        if (lastQx.bloch0 && $("bloch")) drawBlochCanvas($("bloch"), lastQx.bloch0);
      }
    } catch (e) { showQ(String(e.message || e), "ошибка"); }
  }
  function goTab(t) {
    document.querySelectorAll(".tabs [data-tab]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === t); });
    document.querySelectorAll(".stage .panel").forEach(function (p) { p.classList.toggle("on", p.id === "tab-" + t); });
    if (t === "ui") {
      if ($("kvModel")) $("kvModel").textContent = engine ? "нейросеть" : (window.AKSI_COMPOSE ? "Ядро" : "Neuro");
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
    bubble("ai", "Загружено файлов в RAG: " + files.length + ". Всего: " + rag.length, "файлы");
  }
  async function start() {
    try {
      bootMsg("IndexedDB…", 15); try { await idbOpen(); } catch (e) {}
      bootMsg("Ключи DID…", 30); try { await ensureKeys(); } catch (e) {}
      bootMsg("Файлы…", 45); try { await loadRag(); } catch (e) { rag = []; }
      bootMsg("Ядро…", 65);
      if ($("kvModel")) $("kvModel").textContent = window.AKSI_COMPOSE ? "Ядро" : (window.AKSI_NEURO ? "Neuro" : "—");
      bootMsg("Квантовый симулятор…", 85);
      if ($("kvQ")) $("kvQ").textContent = window.AKSI_QUANTUM ? "on" : "—";
      bootMsg("MATRIX готов", 100);
      setStatus("ядро · квант · файлы " + rag.length);
    } catch (e) { bootMsg("MATRIX", 100); }
    setTimeout(function () {
      hideBoot();
      bubble("ai",
        "Здравствуйте. Я АКСИ — локальный ИИ на этом устройстве.\n\n" +
        "• Ядро генерирует ответ без облака\n" +
        "• Каждый ответ проходит квантовый симулятор (answerGate)\n" +
        "• Вкладка Bloch — Белл, CHSH, измерение\n" +
        "• «запомни:» обучает ядро · WebGPU — нейросеть\n\n" +
        "DID: " + DID,
        "ядро · квант · без сети");
    }, 280);
    setTimeout(hideBoot, 2200);
  }
  document.querySelectorAll(".tabs [data-tab]").forEach(function (b) {
    b.addEventListener("click", function () { goTab(b.getAttribute("data-tab")); });
  });
  if ($("send")) $("send").onclick = function () { ask($("inp") && $("inp").value); };
  if ($("inp")) $("inp").addEventListener("keydown", function (e) { if (e.key === "Enter") ask($("inp").value); });
  document.querySelectorAll("[data-ask]").forEach(function (c) { c.onclick = function () { ask(c.getAttribute("data-ask")); }; });
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
    if (window.AKSI_QUANTUM) showQ(AKSI_QUANTUM.chsh(1024), "1024 shots · CHSH");
  };
  start();
})();
