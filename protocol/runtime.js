(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var mode = "normal";
  var sessionLog = [];
  var lastAdia = null;
  var tutorLevel = 1;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function logSession(type, data) {
    sessionLog.push({ t: Date.now(), type: type, data: data });
    if (sessionLog.length > 400) sessionLog.shift();
  }

  var N = 64;
  var fieldRe = new Float32Array(N * N);
  var fieldIm = new Float32Array(N * N);
  var hrrReady = false;

  function hashStr(s) {
    var h = 2166136261 >>> 0;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function encodeTrace(text) {
    var re = new Float32Array(N * N);
    var im = new Float32Array(N * N);
    var tokens = String(text || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (!tokens.length) tokens = ["\u2205"];
    tokens.forEach(function (tok, ti) {
      var h = hashStr(tok);
      var amp = 1 / Math.sqrt(tokens.length);
      for (var k = 0; k < 8; k++) {
        var x = (h + k * 97 + ti * 13) % N;
        var y = (Math.imul(h, 31 + k) + ti * 7) % N;
        var idx = y * N + x;
        var phase = ((h >>> (k % 16)) & 0xff) / 255 * Math.PI * 2;
        re[idx] += amp * Math.cos(phase);
        im[idx] += amp * Math.sin(phase);
      }
    });
    return { re: re, im: im };
  }
  function addToField(text, weight) {
    weight = weight == null ? 1 : weight;
    var t = encodeTrace(text);
    for (var i = 0; i < fieldRe.length; i++) {
      fieldRe[i] += t.re[i] * weight;
      fieldIm[i] += t.im[i] * weight;
    }
    hrrReady = true;
  }
  function resonance(query) {
    var q = encodeTrace(query);
    var num = 0, denQ = 0, denF = 0;
    for (var i = 0; i < fieldRe.length; i++) {
      num += fieldRe[i] * q.re[i] + fieldIm[i] * q.im[i];
      denQ += q.re[i] * q.re[i] + q.im[i] * q.im[i];
      denF += fieldRe[i] * fieldRe[i] + fieldIm[i] * fieldIm[i];
    }
    var denom = Math.sqrt(denQ * denF) || 1e-9;
    var score = Math.max(0, Math.min(1, (num / denom + 1) / 2));
    return { score: score, energy: Math.abs(num), known: score >= 0.42 };
  }
  function drawHRR() {
    var c = $("hrrCanvas"); if (!c) return;
    var ctx = c.getContext("2d");
    var w = c.width, h = c.height;
    ctx.fillStyle = "#090b10";
    ctx.fillRect(0, 0, w, h);
    var cell = Math.max(2, Math.floor(Math.min(w, h) / N));
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var i = y * N + x;
        var mag = Math.sqrt(fieldRe[i] * fieldRe[i] + fieldIm[i] * fieldIm[i]);
        var v = Math.min(255, Math.floor(mag * 90));
        ctx.fillStyle = "rgb(" + (20 + v) + "," + (30 + v * 0.6) + "," + (60 + v) + ")";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }
  function seedHRR() {
    fieldRe.fill(0); fieldIm.fill(0);
    [
      "AKSI local offline runtime Composer Neuro ADIA",
      "pamyat hypergraph facts links IndexedDB",
      "crypto ECDSA AES-GCM post-quantum ML-KEM",
      "resonance hologram knowledge honest refusal",
      "socratic tutor questions learning",
      "WebRTC snapshot privacy",
      "contact aksilove@internet.ru",
      "metrics EQS engineering signals"
    ].forEach(function (s) { addToField(s, 1); });
    Graph.all().forEach(function (n) { addToField(n.text, 0.8); });
    drawHRR();
    if ($("hrrLog")) $("hrrLog").textContent = "field seeded · N=" + N + " · nodes " + Graph.all().length;
    hrrReady = true;
  }

  var Graph = {
    key: "aksi_protocol_graph_v1",
    nodes: [],
    edges: [],
    load: function () {
      try {
        var raw = localStorage.getItem(this.key);
        if (!raw) return;
        var o = JSON.parse(raw);
        this.nodes = o.nodes || [];
        this.edges = o.edges || [];
      } catch (e) {}
    },
    save: function () {
      try {
        localStorage.setItem(this.key, JSON.stringify({ nodes: this.nodes.slice(-500), edges: this.edges.slice(-800) }));
      } catch (e) {}
      if ($("mMem")) $("mMem").textContent = String(this.nodes.length);
      renderMem();
    },
    all: function () { return this.nodes; },
    addFact: function (text, meta) {
      text = String(text || "").trim();
      if (!text) return null;
      var id = "n" + hashStr(text + Date.now()).toString(16);
      var node = { id: id, text: text, ts: Date.now(), emotion: (meta && meta.emotion) || 0, w: 1 };
      this.nodes.push(node);
      if (this.nodes.length > 1) {
        var prev = this.nodes[this.nodes.length - 2];
        this.edges.push({ a: prev.id, b: id, w: 0.5, ts: Date.now() });
      }
      addToField(text, 1);
      this.save();
      return node;
    },
    addLink: function (aText, bText) {
      var a = this.addFact(aText);
      var b = this.addFact(bText);
      if (a && b) this.edges.push({ a: a.id, b: b.id, w: 1, ts: Date.now() });
      this.save();
    },
    search: function (q) {
      q = String(q || "").toLowerCase();
      var words = q.split(/\s+/).filter(function (w) { return w.length > 2; });
      return this.nodes.map(function (n) {
        var t = n.text.toLowerCase();
        var score = 0;
        words.forEach(function (w) { if (t.indexOf(w) !== -1) score += 1; });
        score += resonance(n.text + " " + q).score;
        return { node: n, score: score };
      }).filter(function (x) { return x.score > 0.3; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 8);
    },
    snapshot: function () {
      return {
        v: 1,
        nodes: this.nodes.slice(-40).map(function (n) {
          return { h: hashStr(n.text).toString(16), w: n.w, ts: n.ts };
        }),
        edges: this.edges.slice(-60).map(function (e) {
          return { a: e.a, b: e.b, w: e.w };
        })
      };
    }
  };
  Graph.load();

  function renderMem() {
    var el = $("memList"); if (!el) return;
    if (!Graph.nodes.length) { el.textContent = "memory empty"; return; }
    el.innerHTML = Graph.nodes.slice().reverse().slice(0, 30).map(function (n) {
      return "<div><b>" + esc(n.id.slice(0, 6)) + "</b> · " + esc(n.text) + "</div>";
    }).join("");
  }

  function adiaCritique(query, answer) {
    query = String(query || "");
    answer = String(answer || "");
    var qWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    var aLow = answer.toLowerCase();
    var overlap = qWords.filter(function (w) { return w.length > 2 && aLow.indexOf(w) !== -1; }).length;
    var relevance = qWords.length ? Math.min(1, overlap / Math.min(6, qWords.length)) : 0.5;
    var completeness = Math.min(1, answer.length / 220);
    var logic = /потому|поэтому|если|значит|следовательно|because|therefore/i.test(answer) ? 0.75 : 0.55;
    logic = Math.min(1, logic + (answer.indexOf("\n") !== -1 ? 0.1 : 0));
    var empathy = /понимаю|давай|вместе|можно|помог|feel|sorry|рад/i.test(answer) ? 0.8 : 0.5;
    var originality = answer.length > 40 ? 0.65 : 0.4;
    if (/не знаю|нет данных|резонанс слаб/i.test(answer)) originality = 0.85;
    var eqs = null;
    try {
      if (window.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate) {
        var r = AKSI_ALGORITHM.evaluate(query, answer, { offline: true, source: "protocol", seal: false });
        var m = r.metrics || r;
        eqs = m.EQS != null ? m.EQS : m.eqs;
        if (eqs != null) {
          var e = Number(eqs);
          if (e > 1) e = e / 100;
          logic = Math.min(1, logic * 0.7 + e * 0.3);
        }
      }
    } catch (e) {}
    var axes = {
      logic: +logic.toFixed(3),
      relevance: +relevance.toFixed(3),
      completeness: +completeness.toFixed(3),
      empathy: +empathy.toFixed(3),
      originality: +originality.toFixed(3)
    };
    var score = (axes.logic + axes.relevance + axes.completeness + axes.empathy + axes.originality) / 5;
    return { axes: axes, score: +score.toFixed(3), eqs: eqs, pass: score >= 0.55 };
  }

  function renderAdia(c) {
    lastAdia = c;
    if ($("mAdia")) $("mAdia").textContent = c ? (c.score * 100).toFixed(0) + "%" : "—";
    var box = $("adiaBars"); if (!box || !c) return;
    box.innerHTML = Object.keys(c.axes).map(function (k) {
      var v = c.axes[k];
      return '<div class="metric" style="margin-bottom:8px"><b>' + Math.round(v * 100) + '%</b><span>' + k + '</span><div class="bar"><i style="width:' + (v * 100) + '%"></i></div></div>';
    }).join("");
    if ($("adiaOut")) $("adiaOut").textContent = JSON.stringify(c, null, 2);
  }

  function agentCore(q) {
    var low = q.toLowerCase();
    if (/кто ты|what are you|протокол/i.test(low)) {
      return "Я ядро AKSI Protocol — offline runtime с HRR-резонансом, гиперграф-памятью и ADIA-критиком. Контакт: aksilove@internet.ru";
    }
    var hits = Graph.search(q);
    if (hits.length) {
      return "Из гиперграфа:\n• " + hits.slice(0, 3).map(function (h) { return h.node.text; }).join("\n• ");
    }
    return "Локальное ядро: уточни запрос или добавь факт («запомни: …»). Режим «Только знание» откажет без резонанса.";
  }
  function agentCompose(q) {
    if (window.AKSI_COMPOSE && typeof AKSI_COMPOSE.think === "function") {
      try {
        var r = AKSI_COMPOSE.think(q);
        if (r && r.text) return r.text;
      } catch (e) {}
    }
    return agentCore(q);
  }
  function agentNeuro(q) {
    if (window.AKSI_NEURO && typeof AKSI_NEURO.think === "function") {
      try {
        var r = AKSI_NEURO.think(q);
        if (r && r.text) return r.text;
      } catch (e) {}
    }
    return agentCore(q);
  }
  function runSwarm(q) {
    var agents = [
      { name: "Composer", text: agentCompose(q) },
      { name: "Neuro", text: agentNeuro(q) },
      { name: "Core", text: agentCore(q) }
    ];
    agents.forEach(function (a) { a.adia = adiaCritique(q, a.text); a.rank = a.adia.score; });
    agents.sort(function (a, b) { return b.rank - a.rank; });
    var box = $("swarmBox");
    if (box) {
      box.innerHTML = agents.map(function (a, i) {
        return "<div><b>#" + (i + 1) + " " + esc(a.name) + "</b> · score " + a.rank.toFixed(2) + "<br>" + esc(a.text.slice(0, 280)) + "</div>";
      }).join("");
    }
    return agents[0];
  }

  function socratic(q) {
    var level = tutorLevel;
    var prompts = [
      "Какую часть этого вопроса ты уже можешь ответить сам?",
      "Какие допущения скрыты в формулировке?",
      "Если упростить до одного предложения — что именно неизвестно?",
      "Какой контрпример опроверг бы твою первую гипотезу?",
      "Какой минимальный факт из памяти изменил бы вывод?"
    ];
    var idx = Math.min(prompts.length - 1, level - 1);
    tutorLevel = Math.min(5, tutorLevel + 1);
    if ($("tutorLevel")) $("tutorLevel").textContent = String(tutorLevel);
    return "Тьютор (ур." + level + "):\n" + prompts[idx] + "\n\nТвой запрос: «" + q + "». Не даю готовый ответ — сделай шаг сам.";
  }

  function think(q) {
    q = String(q || "").trim();
    if (!q) return { text: "", meta: "" };

    if (/^запомни[:：\s]/i.test(q)) {
      var fact = q.replace(/^запомни[:：\s]*/i, "").trim();
      Graph.addFact(fact);
      addToField(fact, 1.2);
      drawHRR();
      return { text: "Узел памяти создан: " + fact, meta: "memory · write" };
    }
    if (/^связь[:：\s]/i.test(q)) {
      var parts = q.replace(/^связь[:：\s]*/i, "").split(/->|→/).map(function (s) { return s.trim(); });
      if (parts.length >= 2) {
        Graph.addLink(parts[0], parts[1]);
        return { text: "Связь: " + parts[0] + " → " + parts[1], meta: "memory · edge" };
      }
    }

    if (!hrrReady) seedHRR();
    var res = resonance(q);
    if ($("mRes")) $("mRes").textContent = (res.score * 100).toFixed(0) + "%";

    if (mode === "tutor") {
      var t = socratic(q);
      var ct = adiaCritique(q, t);
      renderAdia(ct);
      return { text: t, meta: "tutor · L" + tutorLevel };
    }

    if (mode === "strict" && !res.known) {
      var unknown = "Резонанс слаб (" + (res.score * 100).toFixed(0) + "%). В поле нет устойчивого следа. Я не знаю — добавь: «запомни: …».";
      renderAdia(adiaCritique(q, unknown));
      return { text: unknown, meta: "hrr · unknown" };
    }

    var best;
    if (mode === "swarm") {
      best = runSwarm(q);
    } else {
      var text = agentCompose(q);
      best = { name: "primary", text: text, adia: adiaCritique(q, text), rank: 0 };
      best.rank = best.adia.score;
    }

    if (!res.known && best.adia.score < 0.5) {
      best.text = "Недостаточно резонанса и опор в памяти. Уточни вопрос или обучи поле.";
      best.adia = adiaCritique(q, best.text);
    }

    if (!best.adia.pass) {
      var refined = best.text + "\n\n[Уточнено ADIA] Добавь конкретику или факт — оценка " + (best.adia.score * 100).toFixed(0) + "% ниже порога.";
      best.text = refined;
      best.adia = adiaCritique(q, refined);
      best.metaExtra = "adia · refined";
    }

    renderAdia(best.adia);
    logSession("think", { q: q, score: best.adia.score, res: res.score, mode: mode });
    return {
      text: best.text,
      meta: (best.name || "agent") + " · ADIA " + (best.adia.score * 100).toFixed(0) + "% · HRR " + (res.score * 100).toFixed(0) + "%" + (best.metaExtra ? " · " + best.metaExtra : "")
    };
  }

  function addMsg(role, text, meta) {
    var th = $("thread"); if (!th) return;
    var d = document.createElement("div");
    d.className = "msg " + (role === "me" ? "me" : "ai");
    d.innerHTML = '<div class="bub">' + esc(text) + (meta ? '<div class="meta">' + esc(meta) + "</div>" : "") + "</div>";
    th.appendChild(d);
    th.scrollTop = th.scrollHeight;
  }
  function send() {
    var v = $("inp").value.trim();
    if (!v) return;
    $("inp").value = "";
    addMsg("me", v);
    var r = think(v);
    addMsg("ai", r.text, r.meta);
  }

  var pc = null;
  var dc = null;
  function rtcLog(s) {
    var el = $("rtcLog");
    if (!el) return;
    el.textContent = (el.textContent ? el.textContent + "\n" : "") + s;
  }
  function ensurePC() {
    if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.onicecandidate = function (e) {
      if (!e.candidate && $("rtcBox")) $("rtcBox").value = JSON.stringify({ sdp: pc.localDescription });
    };
    pc.ondatachannel = function (ev) {
      dc = ev.channel;
      wireDC(dc);
    };
    return pc;
  }
  function wireDC(channel) {
    channel.onopen = function () {
      rtcLog("datachannel open");
      if ($("netPill")) { $("netPill").textContent = "mesh"; $("netPill").classList.add("on"); }
    };
    channel.onmessage = function (ev) {
      try {
        var snap = JSON.parse(ev.data);
        rtcLog("snapshot nodes=" + (snap.nodes && snap.nodes.length));
        (snap.nodes || []).forEach(function (n) { addToField("hash:" + n.h, 0.3); });
        drawHRR();
      } catch (e) { rtcLog("msg: " + String(ev.data).slice(0, 120)); }
    };
  }
  async function rtcCreateOffer() {
    ensurePC();
    dc = pc.createDataChannel("aksi-pulse");
    wireDC(dc);
    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    rtcLog("offer created");
  }
  async function rtcCreateAnswer() {
    ensurePC();
    var data = JSON.parse($("rtcBox").value || "{}");
    await pc.setRemoteDescription(data.sdp);
    var answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    rtcLog("answer created");
  }
  async function rtcAcceptAnswer() {
    var data = JSON.parse($("rtcBox").value || "{}");
    await pc.setRemoteDescription(data.sdp);
    rtcLog("answer accepted");
  }
  function rtcSendSnap() {
    if (!dc || dc.readyState !== "open") return rtcLog("channel closed");
    dc.send(JSON.stringify(Graph.snapshot()));
    rtcLog("snapshot sent");
  }

  async function runOCR() {
    var f = $("ocrFile").files && $("ocrFile").files[0];
    if (!f) return;
    $("ocrOut").textContent = "loading Tesseract…";
    try {
      if (!window.Tesseract) {
        await new Promise(function (resolve, reject) {
          var s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      var res = await Tesseract.recognize(f, "rus+eng");
      var text = (res && res.data && res.data.text) || "";
      $("ocrOut").textContent = text || "(empty)";
      if (text.trim()) {
        Graph.addFact("OCR: " + text.trim().slice(0, 500));
        addToField(text, 0.7);
        drawHRR();
      }
    } catch (e) {
      $("ocrOut").textContent = "OCR error: " + (e.message || e);
    }
  }

  function evolve() {
    var thinks = sessionLog.filter(function (x) { return x.type === "think"; });
    var low = thinks.filter(function (x) { return x.data && x.data.score < 0.55; });
    var weakRes = thinks.filter(function (x) { return x.data && x.data.res < 0.42; });
    var lines = [];
    lines.push("Session events " + sessionLog.length + ", think " + thinks.length);
    lines.push("Weak ADIA: " + low.length);
    lines.push("Weak HRR: " + weakRes.length);
    if (weakRes.length > 2) lines.push("→ Seed field with domain facts via «запомни:»");
    if (Graph.nodes.length < 5) lines.push("→ Expand hypergraph (now " + Graph.nodes.length + ")");
    if (low.length && !weakRes.length) lines.push("→ Try Swarm mode for contested queries");
    if (!thinks.length) lines.push("Chat first to collect signals");
    lines.push("No silent self-rewrite of page code — evolution = recommendations + field/memory training");
    if ($("evolveOut")) $("evolveOut").textContent = lines.join("\n");
  }

  function showView(name) {
    document.querySelectorAll(".view").forEach(function (v) { v.hidden = v.id !== "view-" + name; });
    document.querySelectorAll(".navbtn").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-view") === name);
    });
    if ($("side")) $("side").classList.remove("open");
  }

  function boot() {
    document.querySelectorAll(".navbtn").forEach(function (b) {
      b.onclick = function () { showView(b.getAttribute("data-view")); };
    });
    document.querySelectorAll("[data-mode]").forEach(function (b) {
      b.onclick = function () {
        mode = b.getAttribute("data-mode");
        document.querySelectorAll("[data-mode]").forEach(function (x) { x.classList.toggle("on", x === b); });
      };
    });
    if ($("menuBtn")) $("menuBtn").onclick = function () { $("side").classList.toggle("open"); };
    if ($("send")) $("send").onclick = send;
    if ($("inp")) $("inp").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); send(); }
    });

    if ($("hrrSeed")) $("hrrSeed").onclick = seedHRR;
    if ($("hrrProbe")) $("hrrProbe").onclick = function () {
      var q = $("inp").value || "AKSI memory resonance";
      var r = resonance(q);
      if ($("hrrLog")) $("hrrLog").textContent = "probe → score " + r.score.toFixed(3) + " known=" + r.known;
      if ($("mRes")) $("mRes").textContent = (r.score * 100).toFixed(0) + "%";
    };

    if ($("memAdd")) $("memAdd").onclick = function () {
      var t = $("memFact").value.trim();
      if (!t) return;
      if (/->|→/.test(t)) {
        var p = t.split(/->|→/).map(function (s) { return s.trim(); });
        Graph.addLink(p[0], p[1]);
      } else Graph.addFact(t);
      $("memFact").value = "";
      drawHRR();
    };
    if ($("memSearch")) $("memSearch").onclick = function () {
      var hits = Graph.search($("memFact").value || $("inp").value || "");
      $("memList").innerHTML = hits.map(function (h) {
        return "<div>" + h.score.toFixed(2) + " · " + esc(h.node.text) + "</div>";
      }).join("") || "no hits";
    };
    if ($("memExport")) $("memExport").onclick = function () {
      $("memList").textContent = JSON.stringify(Graph.snapshot(), null, 2);
    };
    if ($("memClear")) $("memClear").onclick = function () {
      if (confirm("Clear hypergraph?")) {
        Graph.nodes = []; Graph.edges = []; Graph.save();
      }
    };

    if ($("rtcOffer")) $("rtcOffer").onclick = function () { rtcCreateOffer().catch(function (e) { rtcLog(e.message || e); }); };
    if ($("rtcAnswer")) $("rtcAnswer").onclick = function () { rtcCreateAnswer().catch(function (e) { rtcLog(e.message || e); }); };
    if ($("rtcAccept")) $("rtcAccept").onclick = function () { rtcAcceptAnswer().catch(function (e) { rtcLog(e.message || e); }); };
    if ($("rtcSend")) $("rtcSend").onclick = rtcSendSnap;

    if ($("ocrRun")) $("ocrRun").onclick = runOCR;
    if ($("evolveRun")) $("evolveRun").onclick = evolve;
    if ($("swReg")) $("swReg").onclick = function () {
      if (!("serviceWorker" in navigator)) return alert("SW unavailable");
      navigator.serviceWorker.register("/sw.js?v=31").then(function () { alert("SW ok"); }).catch(function (e) { alert(e.message || e); });
    };
    if ($("wipeAll")) $("wipeAll").onclick = function () {
      if (!confirm("Wipe graph + session?")) return;
      localStorage.removeItem(Graph.key);
      Graph.nodes = []; Graph.edges = [];
      sessionLog = [];
      renderMem();
    };

    seedHRR();
    renderMem();
    if ($("mMem")) $("mMem").textContent = String(Graph.nodes.length);
    addMsg("ai",
      "Протокол Живого Разума онлайн (локально).\n\nСтолпы: HRR · Рой · Гиперграф · ADIA · WebRTC · Тьютор · OCR · Суверенитет · Эволюция.\nРежимы: Обычный / Рой / Тьютор / Только знание.\nОбучение: «запомни: факт».\n\nЧестно: это не всезнание человечества, а суверенный offline runtime.\nКонтакт: aksilove@internet.ru",
      "protocol · boot"
    );
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
