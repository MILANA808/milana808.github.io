/**
 * АКСИ — единое приложение
 * Левые вкладки · offline · по-русски
 */
(function () {
  "use strict";
  if (window.__AKSI_APP__) return;
  window.__AKSI_APP__ = 1;

  var STATUS = document.getElementById("status");
  var THREAD = document.getElementById("thread");
  var PROG = document.getElementById("prog");
  var INP = document.getElementById("inp");
  var SEND = document.getElementById("send");
  var CHAT_KEY = "aksi_chat_v1";
  var titles = {
    chat: ["Чат", "Пишите внизу — ответ сразу, offline"],
    search: ["Поиск", "Кратко из Википедии"],
    notes: ["Заметки", "Только на этом устройстве"],
    quantum: ["Квант", "Учебная симуляция 2 кубитов"],
    tools: ["Счёт", "Простые выражения"],
    voice: ["Голос", "Речь → чат"],
    files: ["Файлы", "Текст в локальную память"],
    id: ["ID", "Локальный идентификатор"],
    llm: ["LLM", "Опционально, на вашем ПК"],
    about: ["О продукте", "Что реально работает"]
  };

  function setStatus(t, ok) {
    if (!STATUS) return;
    STATUS.textContent = t;
    STATUS.classList.toggle("ok", !!ok);
  }
  function showProg(t) {
    if (!PROG) return;
    if (!t) { PROG.classList.remove("on"); PROG.textContent = ""; return; }
    PROG.textContent = t;
    PROG.classList.add("on");
  }

  function openPanel(name) {
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("on"); });
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("on", t.getAttribute("data-panel") === name);
    });
    var panel = document.getElementById("panel-" + name);
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
    var side = document.getElementById("side");
    var ov = document.getElementById("overlay");
    if (side) side.classList.remove("open");
    if (ov) ov.classList.remove("on");
  }
  function openSide() {
    var side = document.getElementById("side");
    var ov = document.getElementById("overlay");
    if (side) side.classList.add("open");
    if (ov) ov.classList.add("on");
  }

  var DB_NAME = "aksi_v1", STORE = "facts", db = null, memCache = [];
  function openDB() {
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function (e) {
          var d = e.target.result;
          if (!d.objectStoreNames.contains(STORE))
            d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        };
        req.onsuccess = function (e) { db = e.target.result; resolve(db); };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }
  function loadFacts() {
    return openDB().then(function () {
      if (!db) {
        try { memCache = JSON.parse(localStorage.getItem("aksi_facts") || "[]"); }
        catch (e) { memCache = []; }
        return memCache;
      }
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, "readonly");
        var r = tx.objectStore(STORE).getAll();
        r.onsuccess = function () { memCache = r.result || []; resolve(memCache); };
        r.onerror = function () { resolve([]); };
      });
    });
  }
  function saveFact(text) {
    text = (text || "").trim();
    if (!text) return Promise.resolve();
    var item = { text: text.slice(0, 2000), ts: Date.now() };
    memCache.unshift(item);
    try { localStorage.setItem("aksi_facts", JSON.stringify(memCache.slice(0, 200))); } catch (e) {}
    if (!db) return Promise.resolve();
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).add(item);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      } catch (e) { resolve(); }
    });
  }
  function deleteFact(idx) {
    if (idx < 0 || idx >= memCache.length) return;
    memCache.splice(idx, 1);
    try { localStorage.setItem("aksi_facts", JSON.stringify(memCache)); } catch (e) {}
    renderNotes();
  }
  function renderNotes() {
    var list = document.getElementById("nList");
    if (!list) return;
    if (!memCache.length) {
      list.innerHTML = '<p class="muted" style="margin-top:8px">Пока пусто. В чате: <b>запомни: текст</b></p>';
      return;
    }
    list.innerHTML = memCache.slice(0, 40).map(function (f, i) {
      return '<div class="fact"><div style="flex:1">' + esc(f.text) + '</div><button type="button" data-del="' + i + '" aria-label="Удалить">×</button></div>';
    }).join("");
    list.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () { deleteFact(+b.getAttribute("data-del")); };
    });
  }
  function esc(s) {
    return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  }

  function addMsg(role, text, meta, thoughts) {
    if (!THREAD) return;
    var div = document.createElement("div");
    div.className = "msg " + (role === "u" ? "u" : "a");
    var html = '<div class="b">' + esc(text) + "</div>";
    if (thoughts && thoughts.length) {
      html += '<div class="thought">Ход: ' + esc(thoughts.join(" → ")) + "</div>";
    }
    if (meta) html += '<div class="meta">' + esc(meta) + "</div>";
    div.innerHTML = html;
    THREAD.appendChild(div);
    THREAD.scrollTop = THREAD.scrollHeight;
    persistChat();
  }
  function persistChat() {
    try {
      var nodes = THREAD ? THREAD.querySelectorAll(".msg") : [];
      var arr = [];
      for (var i = 0; i < nodes.length; i++) {
        var b = nodes[i].querySelector(".b");
        if (!b) continue;
        arr.push({ role: nodes[i].classList.contains("u") ? "u" : "a", text: b.textContent });
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
    addMsg("a", "История очищена. Напишите вопрос.", "система");
  }

  var KB = [
    { q: ["кто ты", "что ты", "ты кто", "представься"], a: "Я АКСИ — локальный помощник в браузере.\n\nОтвечаю offline: база знаний, память, счёт, учебный квант. При сети могу кратко взять Википедию. LLM — только если вы сами подключите на своём компьютере.\n\nДанные по умолчанию остаются на устройстве." },
    { q: ["что умеешь", "возможности", "функции", "что можешь"], a: "Умею:\n• чат offline с ходом мысли и подписью\n• запоминать заметки («запомни: …»)\n• поиск в Википедии (нужен интернет)\n• считать простые выражения\n• учебный квант-демо (Bell, суперпозиция)\n• голос → текст (если браузер умеет)\n• читать .txt/.md в память\n• опционально — локальную LLM (Ollama)\n\nВкладки слева открывают все модули." },
    { q: ["привет", "здравствуй", "добрый день", "hi", "hello"], a: "Здравствуйте. Я АКСИ. Напишите вопрос или откройте вкладку слева." },
    { q: ["помощь", "help", "как пользоваться"], a: "Слева — вкладки: Чат, Поиск, Заметки, Квант, Счёт, Голос, Файлы, ID, LLM.\n\nВ чате:\n• «запомни: текст» — заметка\n• «2+2» — счёт\n• «запутанность» — квант-демо\n• обычный вопрос — ответ из базы или Википедии" },
    { q: ["запутанность", "белл", "bell", "кубит", "квант"], a: "__QUANTUM_BELL__" },
    { q: ["суперпозиция"], a: "__QUANTUM_SUPER__" },
    { q: ["память", "заметки"], a: "Заметки хранятся на этом устройстве. Напишите «запомни: …» или откройте вкладку «Заметки»." },
    { q: ["подпись", "хеш", "sha"], a: "Под каждым ответом — локальная подпись (SHA-256). Это целостность текста на устройстве, не доказательство истинности внешних фактов." },
    { q: ["офлайн", "offline", "без интернета"], a: "Да. База, заметки, счёт и квант работают без сети. Википедия и LLM — только при доступе к сети / backend." },
    { q: ["бэкенд", "backend", "ollama", "llm"], a: "LLM необязательна. Установите Ollama, запустите backend, укажите URL во вкладке LLM. Без этого чат уже отвечает offline." }
  ];

  function matchKB(text) {
    var t = (text || "").toLowerCase().replace(/ё/g, "е");
    var best = null, bestScore = 0;
    for (var i = 0; i < KB.length; i++) {
      var item = KB[i];
      for (var j = 0; j < item.q.length; j++) {
        var key = item.q[j];
        if (t === key) return item;
        if (t.indexOf(key) !== -1 && key.length > bestScore) {
          bestScore = key.length;
          best = item;
        }
      }
    }
    return best;
  }

  function statevector(gates) {
    var s = [1, 0, 0, 0];
    function applyH(q) {
      var ns = [0, 0, 0, 0], inv = 1 / Math.SQRT2;
      if (q === 0) {
        ns[0] = inv * (s[0] + s[2]); ns[1] = inv * (s[1] + s[3]);
        ns[2] = inv * (s[0] - s[2]); ns[3] = inv * (s[1] - s[3]);
      } else {
        ns[0] = inv * (s[0] + s[1]); ns[1] = inv * (s[0] - s[1]);
        ns[2] = inv * (s[2] + s[3]); ns[3] = inv * (s[2] - s[3]);
      }
      s = ns;
    }
    function applyCNOT() {
      var ns = s.slice(); ns[2] = s[3]; ns[3] = s[2]; s = ns;
    }
    gates.forEach(function (g) {
      if (g === "H0") applyH(0);
      else if (g === "H1") applyH(1);
      else if (g === "CNOT") applyCNOT();
    });
    return { probs: s.map(function (a) { return a * a; }) };
  }
  function showQuantum(mode) {
    var gates = mode === "bell" ? ["H0", "CNOT"] : ["H0"];
    var r = statevector(gates);
    var labels = ["|00⟩", "|01⟩", "|10⟩", "|11⟩"];
    var box = document.getElementById("qProbs");
    var txt = document.getElementById("qText");
    if (box) {
      box.innerHTML = labels.map(function (l, i) {
        return "<div><b>" + (r.probs[i] * 100).toFixed(0) + "%</b>" + l + "</div>";
      }).join("");
    }
    if (txt) {
      txt.innerHTML = mode === "bell"
        ? "<b>Запутанность (Белл)</b><br>Гейты: H → CNOT. |00⟩ и |11⟩ ≈ 50%."
        : "<b>Суперпозиция</b><br>Гейт H. После измерения 0 или 1 ≈ 50%.";
    }
    if (mode === "bell") {
      return "Запутанность двух кубитов (Белл).\n\n• |00⟩ ≈ 50%\n• |11⟩ ≈ 50%\n\nЕсли первый кубит 0 — второй тоже 0. Это учебная симуляция в браузере.";
    }
    return "Суперпозиция (гейт Адамара).\n\nДо измерения — «и 0, и 1». После — 0 или 1 примерно поровну.";
  }

  function safeMath(expr) {
    var e = String(expr || "").replace(/,/g, ".").replace(/\s/g, "");
    if (!/^[\d+\-*/().^]+$/.test(e)) return null;
    e = e.replace(/\^/g, "**");
    try {
      var v = Function('"use strict"; return (' + e + ");')();
      return typeof v === "number" && isFinite(v) ? v : null;
    } catch (err) { return null; }
  }

  function searchWiki(query) {
    var url = "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(query);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("wiki");
      return r.json();
    }).then(function (j) {
      if (!j || !j.extract) return null;
      return (j.title ? j.title + ".\n\n" : "") + String(j.extract).slice(0, 900);
    }).catch(function () { return null; });
  }

  function shaLocal(str) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        return Array.from(new Uint8Array(buf)).map(function (b) {
          return b.toString(16).padStart(2, "0");
        }).join("").slice(0, 16);
      });
    }
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return Promise.resolve(("00000000" + (h >>> 0).toString(16)).slice(-8));
  }

  function tryProduct(q) {
    if (window.AksiProduct && typeof AksiProduct.answer === "function") {
      return Promise.resolve(AksiProduct.answer(q)).then(function (r) {
        if (!r) return null;
        if (typeof r === "string") return { text: r, steps: ["product-core"], meta: "AksiProduct" };
        return {
          text: r.text || r.answer || "",
          steps: r.steps || r.thoughts || ["product-core"],
          meta: (r.sig ? "sig:" + String(r.sig).slice(0, 16) : "") || r.source || "AksiProduct"
        };
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  function tryLLM(q) {
    var on = document.getElementById("llmOn");
    var urlEl = document.getElementById("llmUrl");
    if (!on || !on.checked) return Promise.resolve(null);
    var base = (urlEl && urlEl.value || "http://127.0.0.1:8000").replace(/\/$/, "");
    showProg("LLM…");
    return fetch(base + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local",
        messages: [
          { role: "system", content: "Ты АКСИ — краткий полезный помощник на русском. Без выдумок." },
          { role: "user", content: q }
        ],
        temperature: 0.3
      })
    }).then(function (r) {
      if (!r.ok) throw new Error("llm");
      return r.json();
    }).then(function (j) {
      var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      return t ? { text: t, steps: ["llm"], meta: "backend" } : null;
    }).catch(function () { return null; });
  }

  function localAnswer(q) {
    var steps = ["разбор"];
    var m = q.match(/^запомни[:\s]+(.+)/i);
    if (m) {
      steps.push("заметка");
      return saveFact(m[1]).then(function () {
        renderNotes();
        return { text: "Запомнила: «" + m[1].slice(0, 200) + "».", steps: steps, meta: "память" };
      });
    }
    var mathQ = q.replace(/^(сколько будет|посчитай|вычисли)\s+/i, "").trim();
    if (/^[\d+\-*/().^\s,]+$/.test(mathQ) && /[\d]/.test(mathQ)) {
      var v = safeMath(mathQ);
      if (v !== null) {
        steps.push("счёт");
        return Promise.resolve({ text: "Результат: " + v, steps: steps, meta: "math" });
      }
    }
    var kb = matchKB(q);
    if (kb) {
      steps.push("база");
      if (kb.a === "__QUANTUM_BELL__") return Promise.resolve({ text: showQuantum("bell"), steps: steps.concat(["квант"]), meta: "квант" });
      if (kb.a === "__QUANTUM_SUPER__") return Promise.resolve({ text: showQuantum("super"), steps: steps.concat(["квант"]), meta: "квант" });
      return Promise.resolve({ text: kb.a, steps: steps, meta: "KB" });
    }
    var ql = q.toLowerCase();
    for (var i = 0; i < memCache.length; i++) {
      if (memCache[i].text && memCache[i].text.toLowerCase().indexOf(ql.slice(0, 24)) !== -1) {
        steps.push("память");
        return Promise.resolve({ text: "Из ваших заметок:\n" + memCache[i].text.slice(0, 500), steps: steps, meta: "память" });
      }
    }
    if (navigator.onLine) {
      steps.push("вики");
      showProg("Ищу…");
      var query = q.replace(/^(что такое|кто такой|расскажи про|почему)\s+/i, "").trim();
      return searchWiki(query).then(function (w) {
        if (w) return { text: w, steps: steps, meta: "Wikipedia" };
        return { text: "Точного ответа в базе нет. Уточните вопрос или добавьте «запомни: …».", steps: steps, meta: "fallback" };
      });
    }
    return Promise.resolve({
      text: "Офлайн: в локальной базе точного ответа нет. Попробуйте «кто ты», «что умеешь» или «запомни: …».",
      steps: steps.concat(["офлайн"]),
      meta: "offline"
    });
  }

  function sendText(raw) {
    var q = String(raw || "").trim();
    if (!q) return;
    addMsg("u", q);
    if (INP) INP.value = "";
    showProg("Думаю…");
    openPanel("chat");
    var p = tryLLM(q).then(function (r) {
      if (r) return r;
      return tryProduct(q).then(function (r2) {
        if (r2 && r2.text) return r2;
        return localAnswer(q);
      });
    });
    p.then(function (ans) {
      return shaLocal(ans.text + "|" + Date.now()).then(function (h) {
        showProg("");
        addMsg("a", ans.text, (ans.meta || "") + " · " + h, ans.steps);
      });
    }).catch(function () {
      showProg("");
      addMsg("a", "Ошибка ответа. Попробуйте ещё раз.", "error");
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
    } catch (e) {}
  }
  function genUserDID() {
    var name = (document.getElementById("didName") || {}).value || "aksi";
    var seed = name + "|" + Date.now() + "|" + Math.random();
    shaLocal(seed).then(function (h) {
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
    if (!SR) {
      addMsg("a", "Голос не поддерживается в этом браузере.", "голос");
      openPanel("chat");
      return;
    }
    var r = new SR();
    r.lang = "ru-RU";
    r.onresult = function (e) {
      var t = e.results[0][0].transcript;
      sendText(t);
    };
    r.onerror = function () { setStatus("голос: ошибка"); };
    r.start();
    setStatus("слушаю…");
  }

  function bind() {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.onclick = function () { openPanel(t.getAttribute("data-panel")); };
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

    var sBtn = document.getElementById("sBtn"), sIn = document.getElementById("sIn");
    if (sBtn && sIn) sBtn.onclick = function () {
      var q = sIn.value.trim();
      if (!q) return;
      document.getElementById("sOut").textContent = "Ищу…";
      searchWiki(q).then(function (w) {
        document.getElementById("sOut").textContent = w || "Ничего не найдено.";
      });
    };
    var nBtn = document.getElementById("nBtn"), nIn = document.getElementById("nIn");
    if (nBtn && nIn) nBtn.onclick = function () {
      saveFact(nIn.value).then(function () { nIn.value = ""; renderNotes(); });
    };
    var qBell = document.getElementById("qBell"), qSuper = document.getElementById("qSuper");
    if (qBell) qBell.onclick = function () { showQuantum("bell"); };
    if (qSuper) qSuper.onclick = function () { showQuantum("super"); };
    var mBtn = document.getElementById("mBtn"), mIn = document.getElementById("mIn");
    if (mBtn && mIn) mBtn.onclick = function () {
      var v = safeMath(mIn.value);
      document.getElementById("mOut").textContent =
        v === null ? "Не удалось. Пример: (3+2)*4" : "Результат: " + v;
    };
    var fIn = document.getElementById("fIn");
    if (fIn) fIn.onchange = function () {
      var files = fIn.files;
      if (!files || !files.length) return;
      var out = document.getElementById("fOut"), n = 0;
      Array.prototype.forEach.call(files, function (file) {
        var reader = new FileReader();
        reader.onload = function () {
          var text = String(reader.result || "").slice(0, 8000);
          saveFact("[" + file.name + "] " + text.slice(0, 600)).then(function () {
            n++;
            if (out) out.textContent = "Загружено файлов: " + n;
            renderNotes();
          });
        };
        reader.readAsText(file);
      });
    };
    var vBtn = document.getElementById("vBtn");
    if (vBtn) vBtn.onclick = startVoice;
    var didGen = document.getElementById("didGen");
    if (didGen) didGen.onclick = genUserDID;

    try {
      var cfg = JSON.parse(localStorage.getItem("aksi_llm_cfg") || "{}");
      var urlEl = document.getElementById("llmUrl");
      var onEl = document.getElementById("llmOn");
      if (urlEl && cfg.url) urlEl.value = cfg.url;
      if (onEl && cfg.on) onEl.checked = true;
    } catch (e) {}
    var llmSave = document.getElementById("llmSave");
    if (llmSave) llmSave.onclick = function () {
      var urlEl = document.getElementById("llmUrl");
      var onEl = document.getElementById("llmOn");
      var cfg = { url: urlEl && urlEl.value, on: !!(onEl && onEl.checked) };
      try { localStorage.setItem("aksi_llm_cfg", JSON.stringify(cfg)); } catch (e) {}
      document.getElementById("llmOut").textContent = "Сохранено.";
      if (window.AksiProduct && AksiProduct.setConfig) {
        try { AksiProduct.setConfig({ backendUrl: cfg.url, llmEnabled: cfg.on }); } catch (e) {}
      }
    };
    var llmPing = document.getElementById("llmPing");
    if (llmPing) llmPing.onclick = function () {
      var urlEl = document.getElementById("llmUrl");
      var base = (urlEl && urlEl.value || "").replace(/\/$/, "");
      document.getElementById("llmOut").textContent = "Проверка…";
      fetch(base + "/health").then(function (r) {
        document.getElementById("llmOut").textContent = r.ok ? "Backend доступен." : "Ответ " + r.status;
      }).catch(function () {
        document.getElementById("llmOut").textContent = "Недоступен. Запустите Ollama и ./start.sh";
      });
    };
  }

  function boot() {
    setStatus("загрузка…");
    loadFacts().then(function () {
      if (window.AksiProduct && typeof AksiProduct.init === "function") {
        try { AksiProduct.init(); } catch (e) {}
      }
      renderNotes();
      renderDID();
      bind();
      setStatus("готова", true);
      var hash = (location.hash || "").replace("#", "");
      if (titles[hash]) openPanel(hash);
      else openPanel("chat");
      var had = restoreChat();
      if (!had && THREAD) {
        addMsg(
          "a",
          "Здравствуйте. Я АКСИ — локальный помощник.\n\nСлева — все функции. Внизу — чат.\nПопробуйте: «кто ты» или «что умеешь».",
          "система"
        );
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
