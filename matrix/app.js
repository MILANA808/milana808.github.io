/** AKSI MATRIX app v10-compose — Resonance Composer first · mobile-safe · © AKSI */
(function () {
  "use strict";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var DB = "aksi_matrix_v7";
  var MODEL = "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC";
  var rag = [], keyPair = null, lastSig = null, engine = null, busy = false, webllmLoading = false;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">"); }
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
  function tok(s) { return String(s || "").toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ").split(/\s+/).filter(function (t) { return t.length > 2; }); }
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
    if (skill.name === "now") return "Время: " + new Date().toLocaleString();
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
      setStatus("Composer · WebGPU нет");
      if ($("kvModel")) $("kvModel").textContent = "Composer";
      try { bubble("ai", "WebLLM недоступен (нет WebGPU).\nРаботаю через Resonance Composer offline.", "compose"); } catch (e) {}
      hideBoot();
      return false;
    }
    webllmLoading = true;
    bootMsg("Подключаю WebLLM…", 5);
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
      if ($("kvModel")) $("kvModel").textContent = "WebLLM";
      hideBoot();
      bubble("ai", "WebLLM загружен — нейросетевая генерация активна.", "webllm");
      webllmLoading = false;
      return true;
    } catch (e) {
      bootMsg("WebLLM недоступен — Composer", 100);
      setTimeout(function () { hideBoot(); bubble("ai", "WebLLM недоступен. Composer offline.", "compose"); }, 500);
      webllmLoading = false;
      return false;
    }
  }
  async function webllmChat(q, context) {
    if (!engine) return null;
    try {
      var messages = [
        { role: "system", content: "Ты АКСИ MATRIX. Кратко по-русски. DID: " + DID },
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
  async function think(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Пустой запрос.", meta: "matrix" };
    var skill = detectSkill(q);
    if (skill) { var so = await runSkill(skill); if (so) return { text: so, meta: "skill" }; }
    if (/^статус$/i.test(q)) {
      return { text: "Модель: " + (engine ? "WebLLM" : (window.AKSI_COMPOSE ? "Composer" : "Neuro")) + "\nRAG: " + rag.length + "\nDID: " + DID, meta: "status" };
    }
    if (/^did$/i.test(q)) return { text: "DID: " + DID, meta: "did" };
    var hits = ragRetrieve(q, 3);
    var ctx = hits.length && hits[0].score >= 0.12 ? hits.map(function (h) { return h.text.slice(0, 400); }).join("\n---\n") : "";
    if (engine) {
      var wl = await webllmChat(q, ctx ? "RAG:\n" + ctx : "");
      if (wl) return { text: wl, meta: "webllm" };
    }
    if (ctx && hits[0].score >= 0.25) {
      return { text: "По RAG:\n\n" + hits.map(function (h, i) { return (i + 1) + ". [" + h.name + "] " + h.text.slice(0, 280); }).join("\n\n"), meta: "rag" };
    }
    if (window.AKSI_COMPOSE && AKSI_COMPOSE.think) {
      try {
        var comp = AKSI_COMPOSE.think(q);
        if (comp && comp.text) {
          var metaC = (comp.mode || "compose") + " · " + Math.round((comp.confidence || 0) * 100) + "%";
          try {
            if (window.AKSI_QUANTUM && AKSI_QUANTUM.answerGate) {
              var qx = AKSI_QUANTUM.answerGate(q, comp.text);
              if (qx && qx.QCLI != null) metaC += " · Q" + qx.QCLI;
            }
          } catch (e) {}
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
      if (n && n.text) return { text: n.text, meta: n.mode || "neuro" };
    }
    return { text: "Мало локальных данных. «запомни: факт» или RAG.\n\n" + DID, meta: "fallback" };
  }
  async function ask(q) {
    if (busy) return;
    q = String(q || "").trim(); if (!q) return;
    busy = true; bubble("me", q); if ($("inp")) $("inp").value = ""; setStatus("думаю…");
    try {
      var r = await think(q); var meta = r.meta || "";
      try { lastSig = await signText(r.text); meta += " · sig"; } catch (e) {}
      bubble("ai", r.text, meta);
      setStatus((engine ? "webllm" : "compose") + " · RAG " + rag.length);
    } catch (e) { bubble("ai", "Сбой: " + (e.message || e), "error"); }
    busy = false;
  }
  function goTab(t) {
    document.querySelectorAll(".tabs [data-tab]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === t); });
    document.querySelectorAll(".stage .panel").forEach(function (p) { p.classList.toggle("on", p.id === "tab-" + t); });
    if (t === "ui") {
      if ($("kvModel")) $("kvModel").textContent = engine ? "WebLLM" : (window.AKSI_COMPOSE ? "Composer" : "Neuro");
      if ($("kvQ")) $("kvQ").textContent = window.AKSI_QUANTUM ? "on" : "—";
      if ($("kvRag")) $("kvRag").textContent = String(rag.length);
    }
  }
  async function start() {
    try {
      bootMsg("IndexedDB…", 15); try { await idbOpen(); } catch (e) {}
      bootMsg("Ключи…", 35); try { await ensureKeys(); } catch (e) {}
      bootMsg("RAG…", 55); try { await loadRag(); } catch (e) { rag = []; }
      bootMsg("Composer…", 80);
      if ($("kvModel")) $("kvModel").textContent = window.AKSI_COMPOSE ? "Composer" : (window.AKSI_NEURO ? "Neuro" : "—");
      if ($("kvQ")) $("kvQ").textContent = window.AKSI_QUANTUM ? "on" : "—";
      bootMsg("MATRIX online", 100);
      setStatus("compose · RAG " + rag.length);
    } catch (e) { bootMsg("MATRIX", 100); }
    setTimeout(function () {
      hideBoot();
      bubble("ai", "Здравствуйте. АКСИ MATRIX.\n\n• Resonance Composer — собирает ответ из локальных доказательств\n• WebLLM — на ПК с WebGPU\n• ADIA · Quantum · DID\n\nDID: " + DID, "composer · local-first");
    }, 280);
    setTimeout(hideBoot, 2000);
  }
  document.querySelectorAll(".tabs [data-tab]").forEach(function (b) {
    b.addEventListener("click", function () { goTab(b.getAttribute("data-tab")); });
  });
  if ($("send")) $("send").onclick = function () { ask($("inp").value); };
  if ($("inp")) $("inp").addEventListener("keydown", function (e) { if (e.key === "Enter") ask($("inp").value); });
  document.querySelectorAll("[data-ask]").forEach(function (c) { c.onclick = function () { ask(c.getAttribute("data-ask")); }; });
  if ($("btnClear")) $("btnClear").onclick = function () { if ($("thread")) $("thread").innerHTML = ""; };
  if ($("btnModel")) $("btnModel").onclick = function () { loadWebLLM(); };
  if ($("btnRag")) $("btnRag").onclick = function () { if ($("ragFile")) $("ragFile").click(); };
  if ($("btnVoice")) $("btnVoice").onclick = function () {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    var r = new SR(); r.lang = "ru-RU";
    r.onresult = function (ev) { ask(ev.results[0][0].transcript); }; r.start();
  };
  if ($("btnTrust")) $("btnTrust").onclick = function () { goTab("crypto"); };
  if ($("btnPro")) $("btnPro").onclick = function () { goTab("ui"); };
  start();
})();
