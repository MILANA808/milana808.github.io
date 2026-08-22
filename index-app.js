/**
 * АКСИ v19 — единый рабочий клиент
 */
(function () {
  "use strict";
  if (window.__AKSI_APP__) return;
  window.__AKSI_APP__ = 1;

  var STATUS = document.getElementById("sideStatus");
  var THREAD = document.getElementById("thread");
  var PROG = document.getElementById("prog");
  var INP = document.getElementById("inp");
  var SEND = document.getElementById("send");
  var CHAT_KEY = "aksi_chat_v1";
  var voiceOn = true;
  var emotion = "neutral";
  var titles = {
    home: ["Главная", "Все модули"],
    chat: ["Чат", "Аватар · голос · ход мысли"],
    apps: ["Приложения", "Запуск модулей"],
    quantum: ["Квант", "Симуляция 2 кубитов"],
    net: ["Сеть", "Погода"],
    metrics: ["Метрики", "EQS · QCLI · H"],
    protocol: ["Протокол", "AKSI-Agent-v1"],
    search: ["Поиск", "Википедия"],
    notes: ["Заметки", "Память устройства"],
    voice: ["Голос", "Микрофон → чат"],
    files: ["Файлы", ".txt / .md"],
    id: ["ID", "Локальный идентификатор"],
    llm: ["LLM", "Ollama (опционально)"],
    about: ["О продукте", "Что работает"]
  };

  function setStatus(t, ok) {
    if (!STATUS) return;
    STATUS.textContent = t;
    STATUS.classList.toggle("ok", !!ok);
  }
  function showProg(t) {
    if (!PROG) return;
    if (!t) { PROG.classList.remove("on"); PROG.textContent = ""; return; }
    PROG.textContent = t; PROG.classList.add("on");
  }
  function esc(s) {
    return String(s).replace(/&/g,"&").replace(/</g,"<").replace(/>/g,">");
  }

  function openPanel(name) {
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("on"); });
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("on", t.getAttribute("data-p") === name);
    });
    var panel = document.getElementById("p-" + name);
    if (panel) panel.classList.add("on");
    var meta = titles[name] || [name, ""];
    var th = document.getElementById("title");
    var st = document.getElementById("subtitle");
    if (th) th.textContent = meta[0];
    if (st) st.textContent = meta[1];
    var composer = document.getElementById("composer");
    if (composer) composer.style.display = (name === "chat" || name === "voice") ? "flex" : "none";
    try { history.replaceState(null, "", "#" + name); } catch (e) {}
    closeSide();
  }
  function closeSide() {
    var s = document.getElementById("side"), o = document.getElementById("overlay");
    if (s) s.classList.remove("open");
    if (o) o.classList.remove("on");
  }
  function openSide() {
    var s = document.getElementById("side"), o = document.getElementById("overlay");
    if (s) s.classList.add("open");
    if (o) o.classList.add("on");
  }

  function tickMSK() {
    try {
      document.getElementById("mskTime").textContent =
        new Date().toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " МСК";
    } catch (e) {}
  }
  function updateLiveExtra() {
    var id = localStorage.getItem("aksi_local_id") || "ещё не создан";
    var name = localStorage.getItem("aksi_local_name") || "АКСИ";
    var el = document.getElementById("liveExtra");
    if (!el) return;
    el.innerHTML =
      "<div><b>Имя:</b> " + esc(name) + "</div>" +
      "<div style='margin-top:6px'><b>Локальный ID</b><code>" + esc(id) + "</code></div>" +
      "<div style='margin-top:8px;color:#94a3b8'>offline-first · SHA-256</div>";
  }

  var COLORS = {
    neutral: { p: "#a855f7", i: "#7c3aed" },
    happy: { p: "#22c55e", i: "#16a34a" },
    thinking: { p: "#3b82f6", i: "#1d4ed8" },
    excited: { p: "#f59e0b", i: "#d97706" },
    sad: { p: "#64748b", i: "#475569" },
    confident: { p: "#ec4899", i: "#be185d" }
  };
  function detectEmotion(text) {
    var t = (text || "").toLowerCase();
    if (/рад|отлично|прекрасно|здорово/.test(t)) return "happy";
    if (/думаю|анализ|вычисл|расчёт/.test(t)) return "thinking";
    if (/жаль|сожалею|к сожалению/.test(t)) return "sad";
    if (/квант|энерг|резонанс|запутан|погода/.test(t)) return "confident";
    if (t.indexOf("!") !== -1 && t.length < 80) return "excited";
    return "neutral";
  }
  function drawAvatar(emo, speaking) {
    emotion = emo || "neutral";
    var c = COLORS[emotion] || COLORS.neutral;
    var svg = document.getElementById("avatarSvg");
    if (!svg) return;
    var mouth = emotion === "happy" || emotion === "excited"
      ? "M 30 52 Q 44 64 58 52"
      : emotion === "sad"
      ? "M 30 58 Q 44 50 58 58"
      : "M 32 54 Q 44 58 56 54";
    var open = speaking ? '<ellipse cx="44" cy="56" rx="6" ry="4" fill="' + c.p + '" opacity="0.6"/>' : "";
    svg.innerHTML =
      '<circle cx="44" cy="44" r="34" fill="#0d0820" stroke="' + c.p + '" stroke-width="2"/>' +
      '<circle cx="32" cy="38" r="5" fill="' + c.i + '"/><circle cx="56" cy="38" r="5" fill="' + c.i + '"/>' +
      '<circle cx="33.5" cy="36.5" r="1.6" fill="#fff" opacity="0.8"/><circle cx="57.5" cy="36.5" r="1.6" fill="#fff" opacity="0.8"/>' +
      '<path d="' + mouth + '" fill="none" stroke="' + c.p + '" stroke-width="2.2" stroke-linecap="round"/>' + open;
    var lab = document.getElementById("emoLabel");
    if (lab) lab.textContent = emotion === "thinking" ? "Думаю…" : emotion === "happy" ? "Рада помочь" : emotion === "excited" ? "Интересно!" : "АКСИ";
  }
  function speak(text) {
    if (!voiceOn || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text).slice(0, 280));
      u.lang = "ru-RU";
      u.rate = emotion === "excited" ? 1.12 : emotion === "thinking" ? 0.92 : 1;
      u.onstart = function () { drawAvatar(emotion, true); };
      u.onend = function () { drawAvatar(emotion, false); };
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  var memCache = [];
  function loadFacts() {
    try { memCache = JSON.parse(localStorage.getItem("aksi_facts") || "[]"); } catch (e) { memCache = []; }
    return Promise.resolve(memCache);
  }
  function saveFact(text) {
    text = (text || "").trim();
    if (!text) return Promise.resolve();
    memCache.unshift({ text: text.slice(0, 2000), ts: Date.now() });
    memCache = memCache.slice(0, 200);
    try { localStorage.setItem("aksi_facts", JSON.stringify(memCache)); } catch (e) {}
    return Promise.resolve();
  }
  function deleteFact(i) {
    memCache.splice(i, 1);
    try { localStorage.setItem("aksi_facts", JSON.stringify(memCache)); } catch (e) {}
    renderNotes();
  }
  function renderNotes() {
    var list = document.getElementById("nList");
    if (!list) return;
    if (!memCache.length) {
      list.innerHTML = '<p class="muted" style="margin-top:8px">Пусто. «запомни: текст»</p>';
      return;
    }
    list.innerHTML = memCache.slice(0, 40).map(function (f, i) {
      return '<div class="fact"><div style="flex:1">' + esc(f.text) + '</div><button type="button" data-del="' + i + '">×</button></div>';
    }).join("");
    list.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () { deleteFact(+b.getAttribute("data-del")); };
    });
  }

  function addMsg(role, text, meta, thoughts) {
    if (!THREAD) return;
    var div = document.createElement("div");
    div.className = "msg " + (role === "u" ? "u" : "a");
    var html = '<div class="b">' + esc(text) + "</div>";
    if (thoughts && thoughts.length) html += '<div class="thought">Ход: ' + esc(thoughts.join(" → ")) + "</div>";
    if (meta) html += '<div class="meta">' + esc(meta) + "</div>";
    div.innerHTML = html;
    THREAD.appendChild(div);
    THREAD.scrollTop = THREAD.scrollHeight;
    persistChat();
  }
  function persistChat() {
    try {
      var nodes = THREAD.querySelectorAll(".msg"), arr = [];
      for (var i = 0; i < nodes.length; i++) {
        var b = nodes[i].querySelector(".b");
        if (b) arr.push({ role: nodes[i].classList.contains("u") ? "u" : "a", text: b.textContent });
      }
      localStorage.setItem(CHAT_KEY, JSON.stringify(arr.slice(-40)));
    } catch (e) {}
  }
  function restoreChat() {
    try {
      var arr = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
      if (!arr.length) return false;
      arr.forEach(function (m) { addMsg(m.role, m.text); });
      return true;
    } catch (e) { return false; }
  }
  function clearChat() {
    if (THREAD) THREAD.innerHTML = "";
    try { localStorage.removeItem(CHAT_KEY); } catch (e) {}
    addMsg("a", "История очищена.", "система");
  }

  var KB = [
    { q: ["кто ты", "что ты", "представься"], a: "Я АКСИ — локальный помощник в браузере.\n\nЧат, заметки, поиск, квант, метрики EQS/QCLI, погода, протокол агентов. LLM — по желанию на вашем ПК." },
    { q: ["что умеешь", "возможности", "функции"], a: "• Чат offline + ход мысли\n• Погода («погода Москва»)\n• Метрики EQS / QCLI\n• Квант Bell\n• Протокол Agent-v1\n• Поиск, заметки, голос, ID\n• Опционально LLM" },
    { q: ["привет", "здравствуй", "добрый"], a: "Здравствуйте. Слева — модули." },
    { q: ["помощь", "help"], a: "Вкладки: Чат, Сеть, Метрики, Протокол, Квант…\nВ чате: «погода Москва», «запомни: …», «запутанность»" },
    { q: ["запутанность", "белл", "bell", "кубит", "квант"], a: "__QB__" },
    { q: ["суперпозиция"], a: "__QS__" },
    { q: ["офлайн", "offline"], a: "База, заметки, счёт и квант работают без сети." }
  ];
  function matchKB(text) {
    var t = (text || "").toLowerCase().replace(/ё/g, "е");
    var best = null, sc = 0;
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].q.length; j++) {
        var k = KB[i].q[j];
        if (t === k) return KB[i];
        if (t.indexOf(k) !== -1 && k.length > sc) { sc = k.length; best = KB[i]; }
      }
    }
    return best;
  }

  function statevector(gates) {
    var s = [1, 0, 0, 0];
    function H(q) {
      var n = [0, 0, 0, 0], inv = 1 / Math.SQRT2;
      if (q === 0) {
        n[0] = inv * (s[0] + s[2]); n[1] = inv * (s[1] + s[3]);
        n[2] = inv * (s[0] - s[2]); n[3] = inv * (s[1] - s[3]);
      } else {
        n[0] = inv * (s[0] + s[1]); n[1] = inv * (s[0] - s[1]);
        n[2] = inv * (s[2] + s[3]); n[3] = inv * (s[2] - s[3]);
      }
      s = n;
    }
    function CNOT() { var n = s.slice(); n[2] = s[3]; n[3] = s[2]; s = n; }
    gates.forEach(function (g) { if (g === "H0") H(0); else if (g === "CNOT") CNOT(); });
    return s.map(function (a) { return a * a; });
  }
  function showQuantum(mode) {
    var gates = mode === "bell" ? ["H0", "CNOT"] : ["H0"];
    var p = statevector(gates);
    var labels = ["|00⟩", "|01⟩", "|10⟩", "|11⟩"];
    var box = document.getElementById("qProbs");
    var txt = document.getElementById("qText");
    if (box) box.innerHTML = labels.map(function (l, i) {
      return "<div><b>" + (p[i] * 100).toFixed(0) + "%</b>" + l + "</div>";
    }).join("");
    if (txt) txt.innerHTML = mode === "bell"
      ? "<b>Bell</b> — H + CNOT. |00⟩ и |11⟩ ≈ 50%."
      : "<b>Суперпозиция</b> — H.";
    return mode === "bell"
      ? "Запутанность (Bell):\n• |00⟩ ≈ 50%\n• |11⟩ ≈ 50%\nУчебная симуляция."
      : "Суперпозиция (H): после измерения 0 или 1 ≈ поровну.";
  }
  function safeMath(expr) {
    var e = String(expr || "").replace(/,/g, ".").replace(/\s/g, "");
    if (!/^[\d+\-*/().^]+$/.test(e)) return null;
    e = e.replace(/\^/g, "**");
    try {
      var v = Function('"use strict";return (' + e + ')')();
      return typeof v === "number" && isFinite(v) ? v : null;
    } catch (err) { return null; }
  }
  function searchWiki(q) {
    return fetch("https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(q))
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { return j && j.extract ? ((j.title || "") + ".\n\n" + String(j.extract).slice(0, 900)) : null; })
      .catch(function () { return null; });
  }
  function shaLocal(str) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("").slice(0, 16);
      });
    }
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return Promise.resolve(("00000000" + (h >>> 0).toString(16)).slice(-8));
  }

  function tryLLM(q) {
    var on = document.getElementById("llmOn");
    var urlEl = document.getElementById("llmUrl");
    if (!on || !on.checked) return Promise.resolve(null);
    var base = (urlEl && urlEl.value || "").replace(/\/$/, "");
    showProg("LLM…");
    return fetch(base + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local",
        messages: [
          { role: "system", content: "Ты АКСИ — краткий помощник на русском." },
          { role: "user", content: q }
        ],
        temperature: 0.3
      })
    }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) {
        var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        return t ? { text: t, steps: ["llm"], meta: "backend" } : null;
      }).catch(function () { return null; });
  }
  function tryProduct(q) {
    if (window.AksiProduct && typeof AksiProduct.answer === "function") {
      return Promise.resolve(AksiProduct.answer(q)).then(function (r) {
        if (!r) return null;
        if (typeof r === "string") return { text: r, steps: ["core"], meta: "product" };
        return { text: r.text || r.answer || "", steps: r.steps || ["core"], meta: r.source || "product" };
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }
  function localAnswer(q) {
    var steps = ["разбор"];
    var m = q.match(/^запомни[:\s]+(.+)/i);
    if (m) {
      return saveFact(m[1]).then(function () {
        renderNotes();
        return { text: "Запомнила: «" + m[1].slice(0, 200) + "».", steps: steps.concat(["память"]), meta: "память" };
      });
    }
    var wm = q.match(/погода\s+(.+)/i) || (/^погода$/i.test(q.trim()) ? ["", "Moscow"] : null);
    if (wm && window.AksiEngine && AksiEngine.getWeather) {
      steps.push("погода");
      showProg("Погода…");
      var city = (wm[1] || "Moscow").trim();
      return AksiEngine.getWeather(city).then(function (w) {
        if (w.temp_c === null) return { text: "Погода недоступна.", steps: steps, meta: "net" };
        var text = "Погода в " + w.city + ":\n" + w.temp_c + "°C, " + w.condition +
          "\nВлажность " + w.humidity + "% · ветер " + w.wind_kph + " км/ч · ощущается " + w.feelslike_c + "°C";
        if (AksiEngine.createAgentMessage) AksiEngine.createAgentMessage("user", "response", text);
        return { text: text, steps: steps, meta: "wttr.in" };
      });
    }
    var mq = q.replace(/^(сколько будет|посчитай|вычисли)\s+/i, "").trim();
    if (/^[\d+\-*/().^\s,]+$/.test(mq) && /\d/.test(mq)) {
      var v = safeMath(mq);
      if (v !== null) return Promise.resolve({ text: "Результат: " + v, steps: steps.concat(["счёт"]), meta: "math" });
    }
    var kb = matchKB(q);
    if (kb) {
      if (kb.a === "__QB__") return Promise.resolve({ text: showQuantum("bell"), steps: steps.concat(["квант"]), meta: "квант" });
      if (kb.a === "__QS__") return Promise.resolve({ text: showQuantum("super"), steps: steps.concat(["квант"]), meta: "квант" });
      return Promise.resolve({ text: kb.a, steps: steps.concat(["база"]), meta: "KB" });
    }
    var ql = q.toLowerCase();
    for (var i = 0; i < memCache.length; i++) {
      if (memCache[i].text && memCache[i].text.toLowerCase().indexOf(ql.slice(0, 20)) !== -1) {
        return Promise.resolve({ text: "Из заметок:\n" + memCache[i].text.slice(0, 500), steps: steps.concat(["память"]), meta: "память" });
      }
    }
    if (navigator.onLine) {
      showProg("Ищу…");
      var query = q.replace(/^(что такое|кто такой|расскажи про)\s+/i, "").trim();
      return searchWiki(query).then(function (w) {
        if (w) return { text: w, steps: steps.concat(["вики"]), meta: "Wikipedia" };
        return { text: "Точного ответа нет. Уточните или «запомни: …».", steps: steps, meta: "fallback" };
      });
    }
    return Promise.resolve({ text: "Офлайн: попробуйте «кто ты» или «что умеешь».", steps: steps.concat(["офлайн"]), meta: "offline" });
  }

  function sendText(raw) {
    var q = String(raw || "").trim();
    if (!q) return;
    addMsg("u", q);
    if (INP) INP.value = "";
    showProg("Думаю…");
    drawAvatar("thinking", false);
    openPanel("chat");
    tryLLM(q).then(function (r) {
      if (r) return r;
      return tryProduct(q).then(function (r2) {
        if (r2 && r2.text) return r2;
        return localAnswer(q);
      });
    }).then(function (ans) {
      return shaLocal(ans.text + "|" + Date.now()).then(function (h) {
        showProg("");
        var emo = detectEmotion(ans.text);
        drawAvatar(emo, false);
        var meta = (ans.meta || "") + " · " + h;
        if (window.AksiEngine && AksiEngine.computeQCLI) {
          meta += " · QCLI " + AksiEngine.computeQCLI(ans.text);
        }
        if (window.AksiEngine && AksiEngine.createAgentMessage) {
          try { AksiEngine.createAgentMessage("user", "response", ans.text); } catch (e) {}
        }
        addMsg("a", ans.text, meta, ans.steps);
        speak(ans.text);
      });
    }).catch(function () {
      showProg("");
      addMsg("a", "Ошибка. Попробуйте ещё раз.", "error");
    });
  }

  function renderDID() {
    var el = document.getElementById("didFull");
    var u = document.getElementById("didUser");
    try {
      var id = localStorage.getItem("aksi_local_id") || "—";
      var name = localStorage.getItem("aksi_local_name") || "";
      if (el) el.textContent = id;
      if (u) u.textContent = name ? "Имя: " + name : "";
      var lh = document.getElementById("liveHash");
      if (lh && id !== "—") lh.textContent = id.slice(-8).toUpperCase();
      updateLiveExtra();
    } catch (e) {}
  }
  function genUserDID() {
    var name = (document.getElementById("didName") || {}).value || "aksi";
    shaLocal(name + "|" + Date.now() + "|" + Math.random()).then(function (h) {
      var id = "local:" + h + h.slice(0, 8);
      try {
        localStorage.setItem("aksi_local_id", id);
        localStorage.setItem("aksi_local_name", name);
      } catch (e) {}
      renderDID();
    });
  }
  function startVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { addMsg("a", "Голос не поддерживается.", "голос"); openPanel("chat"); return; }
    var r = new SR();
    r.lang = "ru-RU";
    r.onresult = function (e) { sendText(e.results[0][0].transcript); };
    r.onerror = function () { setStatus("голос: ошибка"); };
    r.start();
    setStatus("слушаю…");
  }

  function bind() {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.onclick = function () { openPanel(t.getAttribute("data-p")); };
    });
    document.querySelectorAll("[data-go]").forEach(function (b) {
      b.onclick = function () { openPanel(b.getAttribute("data-go")); };
    });
    var burger = document.getElementById("burger");
    var overlay = document.getElementById("overlay");
    if (burger) burger.onclick = openSide;
    if (overlay) overlay.onclick = closeSide;
    if (SEND) SEND.onclick = function () { sendText(INP && INP.value); };
    if (INP) INP.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); sendText(INP.value); }
    });
    document.querySelectorAll("[data-q]").forEach(function (b) {
      b.onclick = function () { sendText(b.getAttribute("data-q")); };
    });
    var cc = document.getElementById("clearChat");
    if (cc) cc.onclick = clearChat;
    var vt = document.getElementById("voiceToggle");
    if (vt) vt.onclick = function () {
      voiceOn = !voiceOn;
      vt.textContent = voiceOn ? "🔊" : "🔇";
      if (!voiceOn && window.speechSynthesis) window.speechSynthesis.cancel();
    };
    var sBtn = document.getElementById("sBtn"), sIn = document.getElementById("sIn");
    if (sBtn && sIn) sBtn.onclick = function () {
      var q = sIn.value.trim(); if (!q) return;
      document.getElementById("sOut").textContent = "Ищу…";
      searchWiki(q).then(function (w) { document.getElementById("sOut").textContent = w || "Ничего не найдено."; });
    };
    var nBtn = document.getElementById("nBtn"), nIn = document.getElementById("nIn");
    if (nBtn && nIn) nBtn.onclick = function () {
      saveFact(nIn.value).then(function () { nIn.value = ""; renderNotes(); });
    };
    var qBell = document.getElementById("qBell"), qSuper = document.getElementById("qSuper");
    if (qBell) qBell.onclick = function () { showQuantum("bell"); };
    if (qSuper) qSuper.onclick = function () { showQuantum("super"); };
    var fIn = document.getElementById("fIn");
    if (fIn) fIn.onchange = function () {
      var files = fIn.files, out = document.getElementById("fOut"), n = 0;
      if (!files) return;
      Array.prototype.forEach.call(files, function (file) {
        var reader = new FileReader();
        reader.onload = function () {
          saveFact("[" + file.name + "] " + String(reader.result || "").slice(0, 600)).then(function () {
            n++; if (out) out.textContent = "Загружено: " + n; renderNotes();
          });
        };
        reader.readAsText(file);
      });
    };
    var vBtn = document.getElementById("vBtn"), micBtn = document.getElementById("micBtn");
    if (vBtn) vBtn.onclick = startVoice;
    if (micBtn) micBtn.onclick = startVoice;
    var didGen = document.getElementById("didGen");
    if (didGen) didGen.onclick = genUserDID;
    var livePill = document.getElementById("livePill");
    var liveExtra = document.getElementById("liveExtra");
    if (livePill && liveExtra) livePill.onclick = function () {
      liveExtra.classList.toggle("on");
      updateLiveExtra();
    };
    try {
      var cfg = JSON.parse(localStorage.getItem("aksi_llm_cfg") || "{}");
      var urlEl = document.getElementById("llmUrl"), onEl = document.getElementById("llmOn");
      if (urlEl && cfg.url) urlEl.value = cfg.url;
      if (onEl && cfg.on) onEl.checked = true;
    } catch (e) {}
    var llmSave = document.getElementById("llmSave");
    if (llmSave) llmSave.onclick = function () {
      var urlEl = document.getElementById("llmUrl"), onEl = document.getElementById("llmOn");
      var cfg = { url: urlEl && urlEl.value, on: !!(onEl && onEl.checked) };
      try { localStorage.setItem("aksi_llm_cfg", JSON.stringify(cfg)); } catch (e) {}
      document.getElementById("llmOut").textContent = "Сохранено.";
    };
    var llmPing = document.getElementById("llmPing");
    if (llmPing) llmPing.onclick = function () {
      var base = (document.getElementById("llmUrl").value || "").replace(/\/$/, "");
      document.getElementById("llmOut").textContent = "Проверка…";
      fetch(base + "/health").then(function (r) {
        document.getElementById("llmOut").textContent = r.ok ? "Backend доступен." : "Код " + r.status;
      }).catch(function () {
        document.getElementById("llmOut").textContent = "Недоступен.";
      });
    };
  }

  function boot() {
    setStatus("загрузка…");
    loadFacts().then(function () {
      if (window.AksiProduct && AksiProduct.init) try { AksiProduct.init(); } catch (e) {}
      drawAvatar("neutral", false);
      renderNotes();
      renderDID();
      bind();
      tickMSK();
      setInterval(tickMSK, 1000);
      setStatus("готова", true);
      var hash = (location.hash || "").replace("#", "");
      if (titles[hash]) openPanel(hash); else openPanel("home");
      if (!restoreChat() && THREAD) {
        addMsg("a", "Здравствуйте. Я АКСИ.\n\nСлева: Сеть, Метрики, Протокол, Чат, Квант.\nПопробуйте «погода Москва».", "система");
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
