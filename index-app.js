/**
 * АКСИ — локальный помощник
 * v2026-08-18.5 · понятно · по-русски · локально
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
  var SUPER = document.getElementById("superBtn");
  var CHAT_KEY = "aksi_chat_v1";

  function setStatus(t) { if (STATUS) STATUS.textContent = t; }
  function showProg(t) {
    if (!PROG) return;
    if (!t) { PROG.classList.remove("on"); PROG.textContent = ""; return; }
    PROG.textContent = t;
    PROG.classList.add("on");
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
    var item = { text: text, ts: Date.now() };
    memCache.unshift(item);
    if (memCache.length > 200) memCache = memCache.slice(0, 200);
    try { localStorage.setItem("aksi_facts", JSON.stringify(memCache)); } catch (e) {}
    if (!db) return Promise.resolve();
    return new Promise(function (resolve) {
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add(item);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { resolve(); };
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
      list.innerHTML = '<p class="muted" style="margin-top:8px">Пока пусто. В чате: <b>запомни: ваш текст</b></p>';
      return;
    }
    list.innerHTML = memCache.slice(0, 40).map(function (f, i) {
      return '<div class="fact"><span style="flex:1">' + esc(f.text) +
        '</span><button type="button" data-del="' + i + '" title="Удалить">×</button></div>';
    }).join("");
    list.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.onclick = function () { deleteFact(+btn.getAttribute("data-del")); };
    });
  }

  var KB = [
    { q: ["кто ты", "что ты", "представься", "как тебя зовут", "ты кто"], a: "Я АКСИ — понятный помощник на русском.\n\nРаботаю прямо в браузере, без обязательного сервера. Стараюсь не выдумывать: если не знаю — говорю. Под ответом виден ход мысли и короткая подпись." },
    { q: ["что умеешь", "возможности", "функции", "что можешь", "навыки"], a: "Сейчас умею:\n\n• отвечать и объяснять простыми словами\n• искать кратко в Википедии\n• считать выражения, например (3+2)^2\n• показывать запутанность и суперпозицию кубитов\n• запоминать заметки на вашем устройстве\n• принимать голос\n• создавать локальный DID\n\nНапишите вопрос или нажмите «Умный ответ»." },
    { q: ["что такое ии", "искусственный интеллект", "объясни ии"], a: "Искусственный интеллект — программы, которые помогают с задачами, обычно требующими мышления: понимать текст, искать закономерности, подсказывать решения.\n\nЯ один из таких помощников. Отличие: работаю локально и стараюсь отделять факты от догадок." },
    { q: ["запутанность", "запутай", "bell", "белл", "состояние белла", "покажи запутанность"], a: null, special: "quantum-bell" },
    { q: ["суперпозиция", "суперпозиц", "адамар"], a: null, special: "quantum-super" },
    { q: ["как пользоваться", "помощь", "инструкция", "справка", "что делать"], a: "Как пользоваться:\n\n1. Напишите вопрос в поле внизу и нажмите ➤\n2. Или нажмите «Умный ответ» — выберу нужный инструмент\n3. Меню справа (на телефоне ☰) — разделы сайта\n4. «запомни: текст» — сохранить заметку\n5. Раздел «Квант» — наглядные примеры" },
    { q: ["память", "заметки", "что запомнила"], a: "Память хранится только на вашем устройстве.\n\nСохранить: «запомни: ваш текст».\nСписок — в разделе «Заметки» на этой странице." },
    { q: ["did", "идентичность", "подпись", "цифровой след"], a: "DID — локальный цифровой идентификатор. Создаётся в браузере, личные данные не передаёт.\n\nСмотрите раздел «Идентичность» внизу." },
    { q: ["привет", "здравствуй", "добрый день", "доброе утро", "добрый вечер", "hello", "hi"], a: "Здравствуйте. Я АКСИ.\n\nМожете спросить что угодно по-русски: объяснить понятие, посчитать, показать запутанность или запомнить заметку." },
    { q: ["спасибо", "благодарю", "thanks"], a: "Пожалуйста. Если понадобится ещё — напишите." },
    { q: ["контакт", "почта", "email", "связь", "написать"], a: "Публичный контакт: aksilove@internet.ru" },
    { q: ["матрикс", "matrix", "лаб", "глобус", "хаб", "hub"], a: "Другие разделы:\n\n• /matrix/ — полный квантовый симулятор\n• /lab/ — криптография и опыты\n• /globe/ — карта узлов\n• /hub/ — карта модулей\n\nМеню справа тоже ведёт туда." },
    { q: ["правда", "врёшь", "достоверн", "галлюцинац", "проверь"], a: "Я стараюсь не выдумывать.\n\n• Из базы знаний — так и пишу\n• Из Википедии — указываю источник\n• Если не знаю — говорю прямо\n• Под ответом — ход мысли и подпись\n\nЭто не абсолютная истина, но прозрачность: видно, откуда взялось утверждение." },
    { q: ["офлайн", "без интернета", "локально"], a: "Базовые ответы, память, счёт и квант работают без интернета.\n\nДля поиска в Википедии нужен интернет." }
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
        ? "<b>Запутанность (Белл)</b><br>Гейты: H → CNOT. |00⟩ и |11⟩ ≈ 50%. Если первый кубит 0 — второй тоже 0."
        : "<b>Суперпозиция</b><br>Гейт H. До измерения — «и 0, и 1». После — 0 или 1 ≈ 50%.";
    }
    if (mode === "bell") {
      return "Показала запутанность двух кубитов (состояние Белла).\n\n• |00⟩ ≈ 50%\n• |11⟩ ≈ 50%\n\nЕсли измерить первый кубит и получить 0, второй тоже будет 0 — это и есть запутанность.\n\nСхему смотрите в разделе «Квант» ниже.";
    }
    return "Показала суперпозицию (гейт Адамара).\n\nДо измерения кубит в состоянии «и 0, и 1». После измерения — 0 или 1 примерно поровну.\n\nСмотрите раздел «Квант».";
  }

  function searchWiki(query) {
    var url = "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(query.trim());
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("not found");
      return r.json();
    }).then(function (j) {
      var extract = (j.extract || "").trim();
      if (!extract) throw new Error("empty");
      return {
        title: j.title || query,
        text: extract.slice(0, 1000),
        url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ""
      };
    });
  }

  function safeMath(expr) {
    var s = (expr || "").replace(/,/g, ".").replace(/\s+/g, "");
    if (!/^[\d+\-*/().^%]+$/.test(s)) return null;
    s = s.replace(/\^/g, "**");
    try {
      var v = new Function("return (" + s + ")")();
      if (typeof v !== "number" || !isFinite(v)) return null;
      return Math.round(v * 1e12) / 1e12;
    } catch (e) { return null; }
  }

  function sha256Hex(str) {
    if (!window.crypto || !crypto.subtle)
      return Promise.resolve("local-" + Math.abs(hashCode(str)).toString(16));
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    });
  }
  function hashCode(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }

  function esc(s) {
    var a = String.fromCharCode(38);
    return String(s)
      .replace(/&/g, a + "amp;")
      .replace(/</g, a + "lt;")
      .replace(/>/g, a + "gt;")
      .replace(/"/g, a + "quot;");
  }

  function addMsg(role, text, meta, thought) {
    if (!THREAD) return;
    var div = document.createElement("div");
    div.className = "msg " + (role === "u" ? "u" : "a");
    var html = '<div class="b">' + esc(text) + "</div>";
    if (thought) html += '<div class="thought">💭 ' + esc(thought) + "</div>";
    if (meta) html += '<div class="meta">' + esc(meta) + "</div>";
    div.innerHTML = html;
    THREAD.appendChild(div);
    THREAD.scrollTop = THREAD.scrollHeight;
    persistChat();
  }

  function persistChat() {
    try {
      if (!THREAD) return;
      var items = [];
      THREAD.querySelectorAll(".msg").forEach(function (m) {
        var b = m.querySelector(".b");
        if (!b) return;
        items.push({ role: m.classList.contains("u") ? "u" : "a", text: b.textContent });
      });
      if (items.length > 50) items = items.slice(-50);
      localStorage.setItem(CHAT_KEY, JSON.stringify(items));
    } catch (e) {}
  }

  function restoreChat() {
    try {
      var raw = localStorage.getItem(CHAT_KEY);
      if (!raw || !THREAD) return false;
      var items = JSON.parse(raw);
      if (!items || !items.length) return false;
      items.forEach(function (it) {
        var div = document.createElement("div");
        div.className = "msg " + (it.role === "u" ? "u" : "a");
        div.innerHTML = '<div class="b">' + esc(it.text) + "</div>";
        THREAD.appendChild(div);
      });
      THREAD.scrollTop = THREAD.scrollHeight;
      return true;
    } catch (e) { return false; }
  }

  function clearChat() {
    if (THREAD) THREAD.innerHTML = "";
    try { localStorage.removeItem(CHAT_KEY); } catch (e) {}
    addMsg("a", "Чат очищен. Напишите новый вопрос.", "система");
  }

  function aksiAnswer(raw) {
    var q = (raw || "").trim();
    if (!q) return Promise.resolve({ text: "Напишите вопрос — отвечу по-русски.", thought: "пустой ввод" });

    if (/^(очисти|очистить)\s*(чат)?$/i.test(q)) {
      clearChat();
      return Promise.resolve({ text: "Готово.", thought: "очистка чата" });
    }

    var m = q.match(/^(запомни|запомнить|remember)\s*[:\-]?\s*(.+)$/i);
    if (m && m[2]) {
      return saveFact(m[2]).then(function () {
        renderNotes();
        return {
          text: "Запомнила:\n«" + m[2].trim() + "»\n\nТолько на этом устройстве.",
          thought: "память → локально"
        };
      });
    }

    if (/^[\d\s+\-*/().^,]+$/.test(q) || /посчитай|вычисли|сколько будет|чему равно/i.test(q)) {
      var expr = q.replace(/посчитай|вычисли|сколько будет|чему равно/gi, "").trim() || q;
      var val = safeMath(expr);
      if (val !== null) {
        return Promise.resolve({ text: "Результат: " + val, thought: "локальный расчёт" });
      }
    }

    var hit = matchKB(q);
    if (hit) {
      if (hit.special === "quantum-bell")
        return Promise.resolve({ text: showQuantum("bell"), thought: "запутанность → симулятор 2 кубитов" });
      if (hit.special === "quantum-super")
        return Promise.resolve({ text: showQuantum("super"), thought: "суперпозиция → гейт H" });
      return Promise.resolve({ text: hit.a, thought: "локальная база знаний АКСИ" });
    }

    var low = q.toLowerCase();
    var words = low.split(/\s+/).filter(function (w) { return w.length > 3; });
    var found = memCache.filter(function (f) {
      var ft = f.text.toLowerCase();
      if (ft.indexOf(low) !== -1) return true;
      return words.some(function (w) { return ft.indexOf(w) !== -1; });
    });
    if (found.length) {
      return Promise.resolve({
        text: "Из вашей памяти:\n• " + found.slice(0, 5).map(function (f) { return f.text; }).join("\n• "),
        thought: "поиск по заметкам"
      });
    }

    showProg("Ищу в открытых источниках…");
    return searchWiki(q).then(function (res) {
      showProg(null);
      return {
        text: res.title + "\n\n" + res.text +
          (res.url ? "\n\nИсточник: " + res.url : "") +
          "\n\n— Кратко из Википедии. При необходимости проверьте.",
        thought: "открытый поиск → ru.wikipedia.org"
      };
    }).catch(function () {
      showProg(null);
      return {
        text: "Точного ответа пока нет.\n\nМожно:\n• переформулировать вопрос\n• написать «запомни: …»\n• открыть раздел «Поиск» выше\n• спросить «что умеешь»",
        thought: "нет совпадения в базе и поиске"
      };
    });
  }

  function sendText(text) {
    text = (text || (INP && INP.value) || "").trim();
    if (!text) return;
    if (INP) INP.value = "";
    addMsg("u", text);
    showProg("Думаю…");
    setStatus("думаю…");
    aksiAnswer(text).then(function (res) {
      showProg(null);
      if (res.text === "Готово." && res.thought === "очистка чата") {
        setStatus("готова");
        return;
      }
      sha256Hex(res.text + "|" + (res.thought || "") + "|" + Date.now()).then(function (sig) {
        addMsg("a", res.text, "подпись " + sig.slice(0, 12) + "… · локально", res.thought || "");
        setStatus("готова");
      });
    });
  }

  function superRoute() {
    var text = (INP && INP.value) || "";
    if (!text.trim()) {
      addMsg("a", "Напишите вопрос внизу — разберу и выберу: поиск, счёт, квант или память.");
      return;
    }
    sendText(text);
  }

  function renderDID() {
    var el = document.getElementById("didFull");
    if (!el) return;
    el.textContent = localStorage.getItem("aksi_did") || "did:aksi:ed25519:sovereign-2026";
    var user = localStorage.getItem("aksi_user_did");
    var box = document.getElementById("didUser");
    if (box && user) box.innerHTML = '<div class="mono" style="margin-top:8px">Ваш: ' + esc(user) + "</div>";
  }

  function genUserDID() {
    var name = (document.getElementById("didName") && document.getElementById("didName").value) || "agent";
    name = name.trim().toLowerCase().replace(/[^a-z0-9а-яё\-]+/gi, "-").slice(0, 24) || "agent";
    var did = "did:aksi:local:" + name + "-" + Math.random().toString(16).slice(2, 10);
    localStorage.setItem("aksi_user_did", did);
    renderDID();
  }

  function startVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addMsg("a", "Голосовой ввод в этом браузере недоступен. Можно писать текстом.");
      return;
    }
    var rec = new SR();
    rec.lang = "ru-RU";
    rec.interimResults = false;
    rec.onresult = function (e) {
      var t = e.results[0][0].transcript;
      if (INP) INP.value = t;
      sendText(t);
    };
    rec.onerror = function () { setStatus("голос: ошибка"); };
    rec.start();
    setStatus("слушаю…");
  }

  function bind() {
    if (SEND) SEND.onclick = function () { sendText(); };
    if (INP) INP.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
    });
    if (SUPER) SUPER.onclick = superRoute;

    document.querySelectorAll("[data-q]").forEach(function (b) {
      b.onclick = function () {
        var q = b.getAttribute("data-q");
        if (INP) INP.value = q;
        sendText(q);
      };
    });

    var clearBtn = document.getElementById("clearChat");
    if (clearBtn) clearBtn.onclick = clearChat;

    var sBtn = document.getElementById("sBtn"), sIn = document.getElementById("sIn");
    if (sBtn && sIn) sBtn.onclick = function () {
      var q = sIn.value.trim();
      if (!q) return;
      var out = document.getElementById("sOut");
      out.textContent = "Ищу…";
      searchWiki(q).then(function (r) {
        out.textContent = r.title + "\n\n" + r.text + (r.url ? "\n\n" + r.url : "");
      }).catch(function () {
        out.textContent = "Не найдено. Попробуйте другие слова.";
      });
    };

    var nBtn = document.getElementById("nBtn"), nIn = document.getElementById("nIn");
    if (nBtn && nIn) nBtn.onclick = function () {
      var t = nIn.value.trim();
      if (!t) return;
      saveFact(t).then(function () { nIn.value = ""; renderNotes(); });
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
  }

  function boot() {
    setStatus("загрузка…");
    loadFacts().then(function () {
      renderNotes();
      renderDID();
      bind();
      setStatus("готова");
      var had = restoreChat();
      if (!had && THREAD) {
        addMsg(
          "a",
          "Здравствуйте. Я АКСИ — понятный помощник на русском.\n\nРаботаю локально в браузере.\nНапишите вопрос или нажмите «Умный ответ».",
          "система · без сервера"
        );
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
