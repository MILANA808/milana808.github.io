/** AKSI MATRIX app v9-mobile — WebLLM · RAG · ECDSA · Quantum · Neuro · © AKSI */
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
    if (b) {
      b.classList.add("hide");
      setTimeout(function () { try { b.style.display = "none"; } catch (e) {} }, 350);
    }
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
  function fromB64(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s), u = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
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
  async function exportPub() { await ensureKeys(); return crypto.subtle.exportKey("jwk", keyPair.publicKey); }
  async function signText(text) {
    await ensureKeys();
    var sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, new TextEncoder().encode(text));
    return { alg: "ECDSA-P256-SHA256", did: DID, sha256: await sha256(text), signature: b64(sig), ts: Date.now() };
  }
  async function verifyText(text, sigB64) {
    await ensureKeys();
    try { return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, keyPair.publicKey, fromB64(sigB64), new TextEncoder().encode(text)); }
    catch (e) { return false; }
  }
  function drawQR(text, size) {
    size = size || 140;
    var canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
    var h = 0, i, j, n = 21, cell = size / n;
    for (i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    function bit(x, y) { return ((h ^ (x * 73856093) ^ (y * 19349663)) >>> (x + y) % 16) & 1; }
    ctx.fillStyle = "#000";
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
      if ((i < 3 && j < 3) || (i < 3 && j > n - 4) || (i > n - 4 && j < 3)) { ctx.fillRect(j * cell, i * cell, cell, cell); continue; }
      if (bit(i, j)) ctx.fillRect(j * cell, i * cell, cell * 0.9, cell * 0.9);
    }
    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(function (p) {
      ctx.fillStyle = "#000"; ctx.fillRect(p[1] * cell, p[0] * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = "#fff"; ctx.fillRect((p[1] + 1) * cell, (p[0] + 1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = "#000"; ctx.fillRect((p[1] + 2) * cell, (p[0] + 2) * cell, 3 * cell, 3 * cell);
    });
    return canvas;
  }
  async function refreshCrypto() {
    await ensureKeys();
    var pub = await exportPub();
    $("didLine").textContent = DID;
    $("pubOut").textContent = JSON.stringify(pub);
    var box = $("qrBox"); box.innerHTML = ""; box.appendChild(drawQR(DID + "|" + (pub.x || "").slice(0, 24)));
    $("kvDid").textContent = "sovereign";
  }
  function tok(s) { return String(s || "").toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ").split(/\s+/).filter(function (t) { return t.length > 2; }); }
  function ragScore(q, text) {
    var qt = tok(q), tt = tok(text), set = {}, i, hit = 0;
    for (i = 0; i < tt.length; i++) set[tt[i]] = 1;
    for (i = 0; i < qt.length; i++) if (set[qt[i]]) hit++;
    return qt.length ? hit / qt.length : 0;
  }
  function ragRetrieve(q, k) {
    k = k || 4;
    return rag.map(function (r) { return { text: r.text, score: ragScore(q, r.text), name: r.name }; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, k).filter(function (x) { return x.score > 0.05; });
  }
  async function loadRag() { try { rag = await idbAll("rag"); } catch (e) { rag = []; } if ($("kvRag")) $("kvRag").textContent = String(rag.length); }
  async function addRagFiles(files) {
    for (var i = 0; i < files.length; i++) {
      var f = files[i], text = await f.text();
      var chunks = text.split(/\n{2,}/).map(function (c) { return c.trim(); }).filter(function (c) { return c.length > 20; });
      if (!chunks.length) chunks = [text.slice(0, 4000)];
      for (var j = 0; j < chunks.length; j++) {
        var item = { text: chunks[j].slice(0, 4000), name: f.name, ts: Date.now() };
        await idbPut("rag", item); rag.push(item);
      }
    }
    await loadRag();
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
      setStatus("Neuro offline · WebGPU нет");
      if ($("kvModel")) $("kvModel").textContent = "Neuro";
      try { bubble("ai", "WebLLM на этом устройстве недоступен (нет WebGPU).\nРаботаю на Neuro offline — спрашивайте.\n\nDID: " + DID, "neuro · local"); } catch (e) {}
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
      bootMsg("Модель готова", 100);
      if ($("kvModel")) $("kvModel").textContent = "WebLLM";
      setStatus("WebLLM · RAG " + rag.length);
      hideBoot();
      try { bubble("ai", "WebLLM загружен. Можно спрашивать сложнее.", "webllm"); } catch (e) {}
      webllmLoading = false;
      return true;
    } catch (e) {
      var msg = String(e && e.message ? e.message : e);
      if (/GPU|WebGPU|adapter/i.test(msg)) msg = "нет совместимого GPU / WebGPU";
      if (msg.length > 90) msg = msg.slice(0, 87) + "…";
      bootMsg("WebLLM недоступен — Neuro", 100);
      if ($("kvModel")) $("kvModel").textContent = "Neuro";
      setStatus("neuro · RAG " + rag.length);
      setTimeout(function () {
        hideBoot();
        try { bubble("ai", "WebLLM недоступен (" + msg + ").\nПродолжаю на Neuro offline.\n\nDID: " + DID, "neuro · fallback"); } catch (e2) {}
      }, 500);
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
    if (skill) { var so = await runSkill(skill); if (so) return { text: so + "\n\n· skill · " + DID, meta: "skill" }; }
    if (/покажи схему|архитектур/i.test(q))
      return { text: "Архитектура:\nПользователь → MATRIX UI → IndexedDB / RAG → WebLLM/Neuro → Quantum → ECDSA\n\nDID: " + DID, meta: "arch" };
    if (/^did$/i.test(q)) return { text: "DID: " + DID + "\nECDSA P-256", meta: "did" };
    if (/^статус$/i.test(q))
      return { text: "Модель: " + (engine ? "WebLLM" : "Neuro") + "\nRAG: " + rag.length + "\nDID: " + DID, meta: "status" };
    var hits = ragRetrieve(q, 3);
    var ctx = hits.length && hits[0].score >= 0.12 ? hits.map(function (h) { return h.text.slice(0, 400); }).join("\n---\n") : "";
    if (engine) {
      var wl = await webllmChat(q, ctx ? "RAG:\n" + ctx : "");
      if (wl) {
        var meta = "webllm";
        if (window.AKSI_QUANTUM && AKSI_QUANTUM.answerGate) { var qx = AKSI_QUANTUM.answerGate(q, wl); if (qx) meta += " · Q" + qx.QCLI; }
        return { text: wl, meta: meta };
      }
    }
    if (ctx) return { text: "По RAG:\n\n" + hits.map(function (h, i) { return (i + 1) + ". [" + h.name + "] " + h.text.slice(0, 280); }).join("\n\n"), meta: "rag" };
    if (window.AKSI_MIND && AKSI_MIND.think) {
      try { var r = await AKSI_MIND.think(q); if (r && r.text) return { text: r.text, meta: r.meta || "mind" }; } catch (e) {}
    }
    if (window.AKSI_NEURO && AKSI_NEURO.think) {
      var n = AKSI_NEURO.think(q);
      if (n && n.text) {
        var meta2 = n.mode || "neuro";
        if (window.AKSI_QUANTUM && AKSI_QUANTUM.answerGate) { var qx2 = AKSI_QUANTUM.answerGate(q, n.text); if (qx2) meta2 += " · Q" + qx2.QCLI; }
        return { text: n.text, meta: meta2 };
      }
    }
    return { text: "Мало данных. «запомни: факт» или RAG-файл.\n\n" + DID, meta: "fallback" };
  }
  async function ask(q) {
    if (busy) return;
    q = String(q || "").trim(); if (!q) return;
    busy = true; bubble("me", q); $("inp").value = ""; setStatus("думаю…");
    try {
      var r = await think(q); var meta = r.meta || "";
      try { lastSig = await signText(r.text); meta += " · sig"; } catch (e) {}
      bubble("ai", r.text, meta);
      setStatus((engine ? "webllm" : "neuro") + " · RAG " + rag.length);
    } catch (e) { bubble("ai", "Сбой: " + (e.message || e), "error"); }
    busy = false;
  }
  function drawBloch(bloch) {
    var canvas = $("bloch"); if (!canvas || !bloch) return;
    var ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(167,139,250,.4)";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
    var px = cx + (bloch.x || 0) * R, py = cy - (bloch.z || 0) * R;
    ctx.strokeStyle = "#c4b5fd"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = "#a78bfa"; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
  }
  function showQ(obj) {
    $("qOut").textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    if (obj && obj.bloch0) drawBloch(obj.bloch0);
  }
  function goTab(t) {
    document.querySelectorAll(".tabs [data-tab]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === t); });
    document.querySelectorAll(".stage .panel").forEach(function (p) { p.classList.toggle("on", p.id === "tab-" + t); });
    if (t === "crypto") refreshCrypto();
    if (t === "bloch" && window.AKSI_QUANTUM) try { showQ(AKSI_QUANTUM.shot("matrix")); } catch (e) {}
    if (t === "ui") {
      if ($("kvModel")) $("kvModel").textContent = engine ? "WebLLM" : (window.AKSI_NEURO ? "Neuro" : "—");
      if ($("kvQ")) $("kvQ").textContent = window.AKSI_QUANTUM ? (AKSI_QUANTUM.version || "on") : "—";
      if ($("kvRag")) $("kvRag").textContent = String(rag.length);
    }
  }
  async function start() {
    try {
      bootMsg("IndexedDB…", 10); try { await idbOpen(); } catch (e) {}
      bootMsg("ECDSA…", 25); try { await ensureKeys(); } catch (e) {}
      bootMsg("RAG…", 45); try { await loadRag(); } catch (e) { rag = []; }
      bootMsg("Neuro offline…", 75);
      if ($("kvModel")) $("kvModel").textContent = window.AKSI_NEURO ? "Neuro" : "—";
      if ($("kvQ")) $("kvQ").textContent = window.AKSI_QUANTUM ? "on" : "—";
      if ($("kvRag")) $("kvRag").textContent = String(rag.length);
      bootMsg("MATRIX online", 100);
      setStatus("neuro · RAG " + rag.length);
    } catch (e) {
      bootMsg("MATRIX · Neuro", 100);
    }
    setTimeout(function () {
      hideBoot();
      try {
        bubble("ai", "Здравствуйте. АКСИ MATRIX online.\n\n• Neuro — сразу offline (без GPU)\n• «Перезагрузить модель» — только при WebGPU\n• RAG · ECDSA · Quantum\n\nDID: " + DID, "matrix · local-first");
      } catch (e2) {}
    }, 300);
    setTimeout(function () { hideBoot(); }, 2200);
  }
  document.querySelectorAll(".tabs [data-tab]").forEach(function (b) {
    b.addEventListener("click", function () { goTab(b.getAttribute("data-tab")); });
  });
  $("send").onclick = function () { ask($("inp").value); };
  $("inp").addEventListener("keydown", function (e) { if (e.key === "Enter") ask($("inp").value); });
  document.querySelectorAll("[data-ask]").forEach(function (c) { c.onclick = function () { ask(c.getAttribute("data-ask")); }; });
  if ($("btnClear")) $("btnClear").onclick = function () { $("thread").innerHTML = ""; };
  if ($("btnModel")) $("btnModel").onclick = function () { loadWebLLM(); };
  if ($("btnRag")) $("btnRag").onclick = function () { $("ragFile").click(); };
  if ($("ragFile")) $("ragFile").onchange = function () {
    if (this.files && this.files.length) addRagFiles(this.files).then(function () {
      bubble("ai", "RAG: " + rag.length + " фрагментов", "rag");
      setStatus((engine ? "webllm" : "neuro") + " · RAG " + rag.length);
    });
  };
  if ($("btnVoice")) $("btnVoice").onclick = function () {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { bubble("ai", "SpeechRecognition недоступен", "voice"); return; }
    var r = new SR(); r.lang = "ru-RU";
    r.onresult = function (ev) { ask(ev.results[0][0].transcript); }; r.start();
  };
  if ($("btnTrust")) $("btnTrust").onclick = function () { goTab("crypto"); };
  if ($("btnPro")) $("btnPro").onclick = function () { goTab("ui"); };
  if ($("btnSign")) $("btnSign").onclick = async function () {
    lastSig = await signText($("signMsg").value || "");
    $("cryptoOut").textContent = JSON.stringify(lastSig, null, 2);
  };
  if ($("btnVerify")) $("btnVerify").onclick = async function () {
    if (!lastSig) { $("cryptoOut").textContent = "Сначала подпишите"; return; }
    var ok = await verifyText($("signMsg").value || "", lastSig.signature);
    $("cryptoOut").textContent = ok ? "✓ Подпись верна\n" + JSON.stringify(lastSig, null, 2) : "✗ Неверна";
  };
  if ($("btnDl")) $("btnDl").onclick = function () {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(lastSig || { did: DID }, null, 2)], { type: "application/json" }));
    a.download = "aksi-proof.json"; a.click();
  };
  document.querySelectorAll("[data-crypto]").forEach(function (b) {
    b.onclick = async function () {
      var k = b.getAttribute("data-crypto"); await ensureKeys();
      if (k === "keys" || k === "did") refreshCrypto();
      else if (k === "json") $("cryptoOut").textContent = JSON.stringify({ did: DID, publicKey: await exportPub() }, null, 2);
      else if (k === "pem") $("cryptoOut").textContent = "JWK P-256:\n" + JSON.stringify(await exportPub(), null, 2);
    };
  });
  if ($("btnBell")) $("btnBell").onclick = function () {
    if (!window.AKSI_QUANTUM) return showQ("Quantum offline");
    var c = AKSI_QUANTUM.bell("phi+");
    var s = c.summary ? c.summary() : AKSI_QUANTUM.shot("bell");
    if (c.bloch) showQ(Object.assign({}, s, { bloch0: c.bloch(0) })); else showQ(s);
  };
  if ($("btnShot")) $("btnShot").onclick = function () { showQ(window.AKSI_QUANTUM ? AKSI_QUANTUM.shot("matrix") : "no Q"); };
  if ($("btnGate")) $("btnGate").onclick = function () {
    if (!window.AKSI_QUANTUM || !AKSI_QUANTUM.answerGate) return showQ("no answerGate");
    showQ(AKSI_QUANTUM.answerGate("Кто ты?", "Я АКСИ MATRIX"));
  };
  if ($("btnChsh")) $("btnChsh").onclick = function () { showQ(window.AKSI_QUANTUM ? AKSI_QUANTUM.chsh(1024) : "no Q"); };
  if ($("btnQ2Bell")) $("btnQ2Bell").onclick = function () {
    if (!window.AKSI_QUANTUM) return;
    var c = AKSI_QUANTUM.bell("phi+");
    $("q2Out").textContent = (c.circuitString ? c.circuitString() + "\n\n" : "") + JSON.stringify(c.summary ? c.summary() : {}, null, 2);
  };
  if ($("btnQ2Sample")) $("btnQ2Sample").onclick = function () {
    if (!window.AKSI_QUANTUM) return;
    $("q2Out").textContent = JSON.stringify(AKSI_QUANTUM.bell("phi+").sample(1024), null, 2);
  };
  start();
})();
