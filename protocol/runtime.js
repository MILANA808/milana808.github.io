/* AKSI Protocol Living Mind — full orchestrator */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var mode = "normal";
  var sessionLog = [];
  var tutorLevel = 1;
  var hrrWorker = null;
  var hrrPending = {};
  var hrrSeq = 1;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function logSession(type, data) {
    sessionLog.push({ t: Date.now(), type: type, data: data });
    if (sessionLog.length > 500) sessionLog.shift();
  }

  function initHRR() {
    try {
      hrrWorker = new Worker("/protocol/hrr-worker.js?v=2");
      hrrWorker.onmessage = function (ev) {
        var msg = ev.data || {};
        if (msg.type === "resonance" && msg.id && hrrPending[msg.id]) {
          hrrPending[msg.id](msg.result);
          delete hrrPending[msg.id];
        } else if (msg.type === "snapshot") {
          drawHRRFromMags(msg.data);
        } else if (msg.type === "ready" || msg.type === "seeded" || msg.type === "added") {
          hrrWorker.postMessage({ type: "snapshot" });
        }
      };
      hrrWorker.postMessage({ type: "init", n: 64 });
    } catch (e) {
      console.warn("HRR worker failed", e);
      hrrWorker = null;
    }
  }

  function hrrSeed(texts) {
    if (hrrWorker) hrrWorker.postMessage({ type: "seed", texts: texts || defaultSeed() });
  }
  function hrrAdd(text, w) {
    if (hrrWorker) hrrWorker.postMessage({ type: "add", text: text, weight: w == null ? 1 : w });
  }
  function hrrResonance(query) {
    return new Promise(function (resolve) {
      if (!hrrWorker) {
        resolve({ score: 0.3, known: false, spatial: 0.3, spectral: 0.3 });
        return;
      }
      var id = hrrSeq++;
      hrrPending[id] = resolve;
      hrrWorker.postMessage({ type: "resonance", query: query, id: id });
      setTimeout(function () {
        if (hrrPending[id]) {
          delete hrrPending[id];
          resolve({ score: 0.25, known: false, timeout: true });
        }
      }, 8000);
    });
  }

  function defaultSeed() {
    return [
      "АКСИ локальный offline runtime Composer Neuro ADIA Protocol",
      "голографический резонанс HRR знание честный отказ не знаю",
      "гиперграф память факты связи IndexedDB шифрование AES-GCM",
      "криптография ECDSA post-quantum ML-KEM суверенитет данных",
      "сократический тьютор вопросы обучение прогресс",
      "WebRTC обмен слепками приватность децентрализация",
      "рой агентов голосование ADIA оценка логичность релевантность",
      "контакт aksilove@internet.ru",
      "метрики EQS инженерные сигналы продукта",
      "OCR зрение Tesseract распознавание текста offline"
    ];
  }

  function drawHRRFromMags(data) {
    var c = $("hrrCanvas"); if (!c || !data) return;
    var ctx = c.getContext("2d");
    var n = data.n || 64;
    var mags = data.mags || [];
    var w = c.width, h = c.height;
    ctx.fillStyle = "#090b10";
    ctx.fillRect(0, 0, w, h);
    var cell = Math.max(2, Math.floor(Math.min(w, h) / n));
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var v = Math.min(255, Math.floor((mags[y * n + x] || 0) * 100));
        ctx.fillStyle = "rgb(" + (16 + v) + "," + (28 + v * 0.55) + "," + (55 + v) + ")";
        ctx.fillRect(x * cell, y * cell, cell - 0.5, cell - 0.5);
      }
    }
  }

  function Graph() { return window.AKSI_GRAPH; }

  async function refreshMemUI() {
    var g = Graph(); if (!g) return;
    if ($("mMem")) $("mMem").textContent = String(g.nodes.length);
    var el = $("memList"); if (!el) return;
    if (!g.nodes.length) { el.textContent = "память пуста"; return; }
    el.innerHTML = g.nodes.slice().reverse().slice(0, 40).map(function (n) {
      return "<div><b>" + esc(n.id.slice(0, 8)) + "</b> · " + esc(n.text) + (n.anon ? " <i class='muted'>anon</i>" : "") + "</div>";
    }).join("");
  }

  function adiaCritique(query, answer) {
    query = String(query || "");
    answer = String(answer || "");
    var qWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    var aLow = answer.toLowerCase();
    var overlap = qWords.filter(function (w) { return w.length > 2 && aLow.indexOf(w) !== -1; }).length;
    var relevance = qWords.length ? Math.min(1, overlap / Math.min(8, qWords.length)) : 0.45;
    var completeness = Math.min(1, answer.length / 260);
    var logic = /потому|поэтому|если|значит|следовательно|because|therefore|из-за/i.test(answer) ? 0.78 : 0.52;
    if (answer.indexOf("\n") !== -1) logic = Math.min(1, logic + 0.08);
    var empathy = /понимаю|давай|вместе|можно|помог|рад|важно|осторожн/i.test(answer) ? 0.82 : 0.48;
    var originality = answer.length > 50 ? 0.62 : 0.38;
    if (/не знаю|нет данных|резонанс слаб|отказываюсь выдумывать/i.test(answer)) {
      originality = 0.9;
      logic = Math.max(logic, 0.8);
    }
    var eqs = null;
    try {
      if (window.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate) {
        var r = AKSI_ALGORITHM.evaluate(query, answer, { offline: true, source: "protocol", seal: false });
        var m = r.metrics || r;
        eqs = m.EQS != null ? m.EQS : m.eqs;
        if (eqs != null) {
          var e = Number(eqs);
          if (e > 1) e = e / 100;
          logic = Math.min(1, logic * 0.65 + e * 0.35);
          relevance = Math.min(1, relevance * 0.75 + e * 0.25);
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
    return { axes: axes, score: +score.toFixed(3), eqs: eqs, pass: score >= 0.58 };
  }

  function renderAdia(c) {
    if ($("mAdia")) $("mAdia").textContent = c ? Math.round(c.score * 100) + "%" : "—";
    var box = $("adiaBars"); if (!box || !c) return;
    box.innerHTML = Object.keys(c.axes).map(function (k) {
      var v = c.axes[k];
      return '<div class="metric" style="margin-bottom:8px"><b>' + Math.round(v * 100) + '%</b><span>' + k + '</span><div class="bar"><i style="width:' + (v * 100) + '%"></i></div></div>';
    }).join("");
    if ($("adiaOut")) $("adiaOut").textContent = JSON.stringify(c, null, 2);
  }

  function agentCore(q) {
    var low = q.toLowerCase();
    if (/кто ты|what are you|протокол|живой разум/i.test(low)) {
      return "Я AKSI Protocol — локальный Живой Разум: HRR-поле, гиперграф, рой, ADIA, WebRTC, тьютор. Контакт: aksilove@internet.ru";
    }
    if (/что (ты )?умеешь|возможности/i.test(low)) {
      return "HRR-резонанс, «запомни:», рой Composer/Neuro/Core/Reason, ADIA, тьютор, OCR, WebRTC-слепки, эволюция.";
    }
    var g = Graph();
    if (g) {
      var hits = g.search(q, 5);
      if (hits.length) {
        return "Из гиперграфа:\n• " + hits.map(function (h) { return h.node.text; }).join("\n• ");
      }
    }
    return "Локальное ядро: опор мало. Добавь «запомни: …» или включи Рой.";
  }
  function agentCompose(q) {
    if (window.AKSI_COMPOSE && typeof AKSI_COMPOSE.think === "function") {
      try { var r = AKSI_COMPOSE.think(q); if (r && r.text) return r.text; } catch (e) {}
    }
    return agentCore(q);
  }
  function agentNeuro(q) {
    if (window.AKSI_NEURO && typeof AKSI_NEURO.think === "function") {
      try { var r = AKSI_NEURO.think(q); if (r && r.text) return r.text; } catch (e) {}
    }
    return agentCore(q);
  }
  function agentReason(q, res) {
    var parts = [];
    if (res && res.known) parts.push("HRR " + Math.round(res.score * 100) + "% поддерживает ответ.");
    else parts.push("HRR слаб — только явная память.");
    var g = Graph();
    if (g) {
      var hits = g.search(q, 3);
      if (hits.length) parts.push("Память: " + hits.map(function (h) { return h.node.text; }).join("; "));
    }
    parts.push(agentCore(q));
    return parts.join("\n");
  }

  function runSwarm(q, res) {
    var agents = [
      { name: "Composer", text: agentCompose(q) },
      { name: "Neuro", text: agentNeuro(q) },
      { name: "Core", text: agentCore(q) },
      { name: "Reason", text: agentReason(q, res) }
    ];
    agents.forEach(function (a) {
      a.adia = adiaCritique(q, a.text);
      a.rank = a.adia.score + (res && res.known ? 0.03 : 0);
    });
    agents.sort(function (a, b) { return b.rank - a.rank; });
    var box = $("swarmBox");
    if (box) {
      box.innerHTML = agents.map(function (a, i) {
        return "<div><b>#" + (i + 1) + " " + esc(a.name) + "</b> · " + a.adia.score.toFixed(2) +
          "<br>" + esc(String(a.text).slice(0, 320)) + "</div>";
      }).join("");
    }
    if ($("mAgents")) $("mAgents").textContent = String(agents.length);
    return agents[0];
  }

  function socratic(q) {
    var prompts = [
      "Какую часть вопроса ты уже можешь сформулировать как утверждение?",
      "Какие скрытые допущения есть в формулировке?",
      "Что будет минимальным фактом, который изменит ответ?",
      "Какой контрпример опроверг бы первую гипотезу?",
      "Как проверить вывод на устройстве без внешней истины?"
    ];
    var idx = Math.min(prompts.length - 1, tutorLevel - 1);
    tutorLevel = Math.min(5, tutorLevel + 1);
    if ($("tutorLevel")) $("tutorLevel").textContent = String(tutorLevel);
    return "Тьютор (уровень " + (idx + 1) + "):\n" + prompts[idx] + "\n\nЗапрос: «" + q + "».\nГотовый ответ не даю.";
  }

  async function think(q) {
    q = String(q || "").trim();
    if (!q) return { text: "", meta: "" };
    var g = Graph();

    if (/^запомни[:：\s]/i.test(q)) {
      var fact = q.replace(/^запомни[:：\s]*/i, "").trim();
      if (g) await g.addFact(fact);
      hrrAdd(fact, 1.3);
      if (window.AKSI_NEURO && AKSI_NEURO.learn) try { AKSI_NEURO.learn(fact); } catch (e) {}
      await refreshMemUI();
      return { text: "Узел гиперграфа + HRR:\n" + fact, meta: "memory · teach" };
    }
    if (/^связь[:：\s]/i.test(q)) {
      var parts = q.replace(/^связь[:：\s]*/i, "").split(/->|→/).map(function (s) { return s.trim(); });
      if (parts.length >= 2 && g) {
        await g.addLink(parts[0], parts[1]);
        hrrAdd(parts[0] + " " + parts[1], 1);
        await refreshMemUI();
        return { text: "Связь: " + parts[0] + " → " + parts[1], meta: "memory · edge" };
      }
    }

    var res = await hrrResonance(q);
    if ($("mRes")) $("mRes").textContent = Math.round(res.score * 100) + "%";

    if (mode === "tutor") {
      var t = socratic(q);
      renderAdia(adiaCritique(q, t));
      return { text: t, meta: "tutor · L" + tutorLevel };
    }

    if (mode === "strict" && !res.known) {
      var unknown = "HRR " + Math.round(res.score * 100) + "% (spatial " +
        Math.round((res.spatial || 0) * 100) + "% / spectral " + Math.round((res.spectral || 0) * 100) +
        "%). Следа нет.\n\nЯ не знаю. Добавь: «запомни: …».";
      renderAdia(adiaCritique(q, unknown));
      logSession("think", { q: q, score: 0, res: res.score, mode: mode, unknown: true });
      return { text: unknown, meta: "hrr · unknown" };
    }

    var best;
    if (mode === "swarm") best = runSwarm(q, res);
    else {
      var text = agentCompose(q);
      best = { name: "primary", text: text, adia: adiaCritique(q, text) };
      best.rank = best.adia.score;
    }

    if (!res.known && best.adia.score < 0.55) {
      best.text = "Резонанс и опоры слабы. Не утверждаю лишнего.\n\nМогу: «запомни:», поиск в гиперграфе, Рой.";
      best.adia = adiaCritique(q, best.text);
    }

    if (!best.adia.pass) {
      best.text = best.text + "\n\n[Уточнено ADIA · " + Math.round(best.adia.score * 100) +
        "%] Ниже порога. Уточни вопрос или обучи память.";
      best.adia = adiaCritique(q, best.text);
      best.metaExtra = "adia · refined";
    }

    renderAdia(best.adia);
    logSession("think", { q: q, score: best.adia.score, res: res.score, mode: mode });
    return {
      text: best.text,
      meta: (best.name || "agent") + " · ADIA " + Math.round(best.adia.score * 100) +
        "% · HRR " + Math.round(res.score * 100) + "%" + (best.metaExtra ? " · " + best.metaExtra : "")
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

  async function send() {
    var v = $("inp").value.trim();
    if (!v) return;
    $("inp").value = "";
    addMsg("me", v);
    addMsg("ai", "…", "думаю");
    var thinking = $("thread").lastChild;
    try {
      var r = await think(v);
      if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
      addMsg("ai", r.text, r.meta);
    } catch (e) {
      if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
      addMsg("ai", "Ошибка: " + (e.message || e), "error");
    }
  }

  var pc = null, dc = null;
  function rtcLog(s) {
    var el = $("rtcLog"); if (!el) return;
    el.textContent = (el.textContent ? el.textContent + "\n" : "") + s;
  }
  function ensurePC() {
    if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.onicecandidate = function (e) {
      if (!e.candidate && $("rtcBox")) $("rtcBox").value = JSON.stringify({ sdp: pc.localDescription });
    };
    pc.onconnectionstatechange = function () {
      rtcLog("state: " + pc.connectionState);
      if (pc.connectionState === "connected" && $("netPill")) {
        $("netPill").textContent = "mesh";
        $("netPill").classList.add("on");
      }
    };
    pc.ondatachannel = function (ev) { dc = ev.channel; wireDC(dc); };
    return pc;
  }
  function wireDC(channel) {
    channel.onopen = function () { rtcLog("datachannel open"); };
    channel.onmessage = async function (ev) {
      try {
        var snap = JSON.parse(ev.data);
        rtcLog("слепок nodes=" + ((snap.nodes || []).length));
        if (Graph()) await Graph().absorbSnapshot(snap, 0.3);
        (snap.nodes || []).forEach(function (n) { hrrAdd("hash:" + n.h, 0.25); });
        await refreshMemUI();
      } catch (e) { rtcLog("msg " + String(ev.data).slice(0, 100)); }
    };
  }
  async function rtcOffer() {
    ensurePC();
    dc = pc.createDataChannel("aksi-pulse");
    wireDC(dc);
    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    rtcLog("offer создан");
  }
  async function rtcAnswer() {
    ensurePC();
    var data = JSON.parse($("rtcBox").value || "{}");
    await pc.setRemoteDescription(data.sdp);
    var answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    rtcLog("answer готов");
  }
  async function rtcAccept() {
    var data = JSON.parse($("rtcBox").value || "{}");
    await pc.setRemoteDescription(data.sdp);
    rtcLog("answer принят");
  }
  function rtcSend() {
    if (!dc || dc.readyState !== "open") return rtcLog("канал закрыт");
    dc.send(JSON.stringify(Graph() ? Graph().snapshot() : { v: 2, nodes: [], edges: [] }));
    rtcLog("слепок отправлен");
  }

  async function runOCR() {
    var f = $("ocrFile").files && $("ocrFile").files[0];
    if (!f) return;
    $("ocrOut").textContent = "Tesseract…";
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
      $("ocrOut").textContent = text || "(пусто)";
      if (text.trim() && Graph()) {
        await Graph().addFact("OCR: " + text.trim().slice(0, 600));
        hrrAdd(text, 0.7);
        await refreshMemUI();
      }
    } catch (e) {
      $("ocrOut").textContent = "OCR: " + (e.message || e);
    }
  }

  function evolve() {
    var thinks = sessionLog.filter(function (x) { return x.type === "think"; });
    var low = thinks.filter(function (x) { return x.data && x.data.score < 0.58; });
    var weak = thinks.filter(function (x) { return x.data && x.data.res < 0.4; });
    var lines = [
      "Событий: " + sessionLog.length,
      "think: " + thinks.length + " · слабый ADIA: " + low.length + " · слабый HRR: " + weak.length,
      "узлов: " + (Graph() ? Graph().nodes.length : 0)
    ];
    if (weak.length > 2) lines.push("→ Досей HRR через «запомни:»");
    if (Graph() && Graph().nodes.length < 8) lines.push("→ Расширь гиперграф");
    if (low.length > weak.length) lines.push("→ Режим Рой для спорных запросов");
    lines.push("Эволюция = рекомендации + обучение поля/памяти.");
    if ($("evolveOut")) $("evolveOut").textContent = lines.join("\n");
  }

  function showView(name) {
    document.querySelectorAll(".view").forEach(function (v) { v.hidden = v.id !== "view-" + name; });
    document.querySelectorAll(".navbtn").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-view") === name);
    });
    if ($("side")) $("side").classList.remove("open");
  }

  async function boot() {
    initHRR();
    if (window.AKSI_GRAPH) {
      try { await AKSI_GRAPH.load(); } catch (e) { console.warn(e); }
      setTimeout(function () {
        var texts = defaultSeed().concat((AKSI_GRAPH.nodes || []).map(function (n) { return n.text; }).slice(0, 80));
        hrrSeed(texts);
      }, 200);
    } else hrrSeed(defaultSeed());
    await refreshMemUI();

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
    if ($("send")) $("send").onclick = function () { send(); };
    if ($("inp")) $("inp").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); send(); }
    });

    if ($("hrrSeed")) $("hrrSeed").onclick = function () {
      var texts = defaultSeed().concat(Graph() ? Graph().nodes.map(function (n) { return n.text; }) : []);
      hrrSeed(texts);
      if ($("hrrLog")) $("hrrLog").textContent = "перезасеяно · " + texts.length;
    };
    if ($("hrrProbe")) $("hrrProbe").onclick = async function () {
      var q = ($("inp") && $("inp").value) || "АКСИ память резонанс";
      var r = await hrrResonance(q);
      if ($("hrrLog")) $("hrrLog").textContent = JSON.stringify(r, null, 2);
      if ($("mRes")) $("mRes").textContent = Math.round(r.score * 100) + "%";
    };

    if ($("memPassSet")) $("memPassSet").onclick = async function () {
      if (!Graph()) return;
      Graph().setPassword(($("memPass") && $("memPass").value) || "");
      try { await Graph().save(); alert("AES-GCM пароль применён"); } catch (e) { alert(e.message || e); }
    };
    if ($("memAdd")) $("memAdd").onclick = async function () {
      var t = ($("memFact") && $("memFact").value || "").trim();
      if (!t || !Graph()) return;
      if (/->|→/.test(t)) {
        var p = t.split(/->|→/).map(function (s) { return s.trim(); });
        await Graph().addLink(p[0], p[1]);
      } else await Graph().addFact(t);
      hrrAdd(t, 1);
      $("memFact").value = "";
      await refreshMemUI();
    };
    if ($("memSearch")) $("memSearch").onclick = function () {
      if (!Graph()) return;
      var hits = Graph().search(($("memFact") && $("memFact").value) || ($("inp") && $("inp").value) || "");
      $("memList").innerHTML = hits.map(function (h) {
        return "<div>" + h.score.toFixed(2) + " · " + esc(h.node.text) + "</div>";
      }).join("") || "нет совпадений";
    };
    if ($("memExport")) $("memExport").onclick = function () {
      if (!Graph()) return;
      $("memList").textContent = JSON.stringify(Graph().snapshot(), null, 2);
    };
    if ($("memClear")) $("memClear").onclick = async function () {
      if (!Graph() || !confirm("Очистить гиперграф?")) return;
      await Graph().clear();
      await refreshMemUI();
    };

    if ($("rtcOffer")) $("rtcOffer").onclick = function () { rtcOffer().catch(function (e) { rtcLog(e.message || e); }); };
    if ($("rtcAnswer")) $("rtcAnswer").onclick = function () { rtcAnswer().catch(function (e) { rtcLog(e.message || e); }); };
    if ($("rtcAccept")) $("rtcAccept").onclick = function () { rtcAccept().catch(function (e) { rtcLog(e.message || e); }); };
    if ($("rtcSend")) $("rtcSend").onclick = rtcSend;
    if ($("ocrRun")) $("ocrRun").onclick = runOCR;
    if ($("evolveRun")) $("evolveRun").onclick = evolve;
    if ($("swReg")) $("swReg").onclick = function () {
      if (!("serviceWorker" in navigator)) return alert("SW недоступен");
      navigator.serviceWorker.register("/sw.js?v=31").then(function () { alert("SW ok"); }).catch(function (e) { alert(e.message || e); });
    };
    if ($("wipeAll")) $("wipeAll").onclick = async function () {
      if (!confirm("Стереть graph + session?")) return;
      if (Graph()) await Graph().clear();
      sessionLog = [];
      await refreshMemUI();
    };

    addMsg("ai",
      "AKSI Protocol · Живой Разум\n\nHRR-worker · Рой · IndexedDB+AES · ADIA · WebRTC · Тьютор · OCR · Evolution\n\nРежимы: Обычный / Рой / Тьютор / Только знание\nОбучение: запомни: факт\n\nСуверенный offline runtime — не всезнание человечества.\nКонтакт: aksilove@internet.ru",
      "protocol · boot");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
