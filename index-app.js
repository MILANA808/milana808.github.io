/**
 * АКСИ — локальный помощник (index-app.js)
 * Всё в браузере. Ответы на русском. Без выдумок.
 * v2026-08-18
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

  function setStatus(t) { if (STATUS) STATUS.textContent = t; }
  function showProg(t) {
    if (!PROG) return;
    if (!t) { PROG.classList.remove("on"); PROG.textContent = ""; return; }
    PROG.textContent = t; PROG.classList.add("on");
  }

  var DB_NAME = "aksi_v1", STORE = "facts", db = null, memCache = [];

  function openDB() {
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function (e) {
          var d = e.target.result;
          if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        };
        req.onsuccess = function (e) { db = e.target.result; resolve(db); };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }

  function loadFacts() {
    return openDB().then(function () {
      if (!db) {
        try { memCache = JSON.parse(localStorage.getItem("aksi_facts") || "[]"); } catch (e) { memCache = []; }
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
      list.innerHTML = '<p class="muted" style="margin-top:8px">Пока пусто. Напишите «запомни: …» в чате или сохраните ниже.</p>';
      return;
    }
    list.innerHTML = memCache.slice(0, 30).map(function (f, i) {
      return '<div class="fact"><span style="flex:1">' + esc(f.text) + '</span><button type="button" data-del="' + i + '" title="Удалить">×</button></div>';
    }).join("");
    list.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.onclick = function () { deleteFact(+btn.getAttribute("data-del")); };
    });
  }

  var KB = [
    { q: ["кто ты", "что ты", "представься", "как тебя зовут"], a: "Я АКСИ — локальный помощник. Работаю прямо в вашем браузере, без обязательного сервера. Отвечаю по-русски, стараюсь не выдумывать и показывать, откуда взялась информация." },
    { q: ["что умеешь", "возможности", "функции", "что можешь"], a: "Умею:\n• отвечать на вопросы и объяснять простыми словами\n• искать краткие сведения в Википедии\n• считать выражения\n• показывать квантовые примеры (запутанность, суперпозиция)\n• запоминать ваши заметки (на этом устройстве)\n• принимать голосовой ввод\n• создавать локальный DID\nНапишите вопрос или нажмите «Умный ответ»." },
    { q: ["ии", "искусственный интеллект", "что такое ии"], a: "Искусственный интеллект — программы, которые выполняют задачи, обычно требующие человеческого мышления: понимание языка, поиск закономерностей, помощь в решениях. Я — один из таких помощников, но работаю локально и стараюсь отделять факты от догадок." },
    { q: ["запутанность", "запутай", "bell", "белл", "квант"], a: null, special: "quantum-bell" },
    { q: ["суперпозиция", "суперпозиц"], a: null, special: "quantum-super" },
    { q: ["как пользоваться", "помощь", "инструкция"], a: "1. Напишите вопрос в поле внизу.\n2. Или нажмите «Умный ответ» — я сама выберу: поиск, счёт, квант или память.\n3. Меню справа (на телефоне ☰) ведёт по разделам.\n4. Чтобы запомнить: «запомни: ваш текст»." },
    { q: ["память", "заметки", "запомни"], a: "Память хранится только на вашем устройстве (IndexedDB / localStorage). Напишите «запомни: …» — и я сохраню. Список заметок — в разделе «Заметки»." },
    { q: ["did", "идентичность", "подпись"], a: "DID — локальный цифровой идентификатор агента. Он создаётся у вас в браузере и не передаёт личные данные. Раздел «Идентичность» внизу страницы." },
    { q: ["контакт", "почта", "email", "связь"], a: "Публичный контакт проекта: aksilove@internet.ru" },
    { q: ["матрикс", "matrix", "лаб", "глобус"], a: "Другие разделы сайта:\n• /matrix/ — полный квантовый симулятор\n• /lab/ — криптография и опыты\n• /globe/ — карта узлов\n• /hub/ — карта модулей\nМеню справа тоже ведёт туда." }
  ];

  function matchKB(text) {
    var t = (text || "").toLowerCase().replace(/[ё]/g, "е");
    for (var i = 0; i < KB.length; i++) {
      var item = KB[i];
      for (var j = 0; j < item.q.length; j++) {
        if (t.indexOf(item.q[j]) !== -1) return item;
      }
    }
    return null;
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
      if (mode === "bell") {
        txt.innerHTML = "<b>Запутанность (состояние Белла)</b><br>Гейты: H на первый кубит, затем CNOT. Вероятности |00⟩ и |11⟩ по ~50%. Если измерить один кубит и получить 0 — второй тоже 0. Это и есть запутанность.";
      } else {
        txt.innerHTML = "<b>Суперпозиция</b><br>Гейт H на первый кубит. Состояние «и 0, и 1» до измерения. После измерения — 0 или 1 с вероятностью 50%.";
      }
    }
    return mode === "bell"
      ? "Показала запутанность двух кубитов (состояние Белла).\nВероятности: |00⟩ ≈ 50%, |11⟩ ≈ 50%.\nЕсли первый кубит оказался 0, второй тоже 0 — это запутанность.\nСхему и проценты смотрите в разделе «Квант» ниже."
      : "Показала суперпозицию одного кубита (гейт Адамара).\nДо измерения кубит в состоянии «и 0, и 1».\nПосле измерения — 0 или 1 с вероятностью ~50%.\nСмотрите раздел «Квант».";
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
        text: extract.slice(0, 900),
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
      return v;
    } catch (e) { return null; }
  }

  function sha256Hex(str) {
    if (!window.crypto || !crypto.subtle) {
      return Promise.resolve("local-" + Math.abs(hashCode(str)).toString(16));
    }
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
    return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }

  function addMsg(role, text, meta, thought) {
    if (!THREAD) return;
    var div = document.createElement("div");
    div.className = "msg " + (role === "u" ? "u" : "a");
    var html = '<div class="b">' + esc(text) + "</div>";
    if (thought) html += '<div class="thought">💭 Ход мысли: ' + esc(thought) + "</div>";
    if (meta) html += '<div class="meta">' + esc(meta) + "</div>";
    div.innerHTML = html;
    THREAD.appendChild(div);
    THREAD.scrollTop = THREAD.scrollHeight;
  }

  function aksiAnswer(raw) {
    var q = (raw || "").trim();
    if (!q) return Promise.resolve({ text: "Напишите вопрос — я отвечу по-русски.", thought: "пустой ввод" });

    var m = q.match(/^(запомни|запомнить|remember)\s*[:\-]?\s*(.+)$/i);
    if (m && m[2]) {
      return saveFact(m[2]).then(function () {
        renderNotes();
        return { text: "Запомнила: «" + m[2].trim() + "».\nЗаметка сохранена только на этом устройстве.", thought: "команда памяти → IndexedDB/localStorage" };
      });
    }

    if (/^[\d\s+\-*/().^,]+$/.test(q) || /посчитай|вычисли|сколько будет/i.test(q)) {
      var expr = q.replace(/посчитай|вычисли|сколько будет/gi, "").trim() || q;
      var val = safeMath(expr);
      if (val !== null) {
        return Promise.resolve({ text: "Результат: " + val, thought: "безопасный локальный расчёт выражения" });
      }
    }

    var hit = matchKB(q);
    if (hit) {
      if (hit.special === "quantum-bell") {
        return Promise.resolve({ text: showQuantum("bell"), thought: "запрос про запутанность → локальный симулятор 2 кубита" });
      }
      if (hit.special === "quantum-super") {
        return Promise.resolve({ text: showQuantum("super"), thought: "запрос про суперпозицию → гейт H" });
      }
      return Promise.resolve({ text: hit.a, thought: "ответ из локальной базы знаний АКСИ" });
    }

    var low = q.toLowerCase();
    var found = memCache.filter(function (f) {
      return f.text.toLowerCase().indexOf(low) !== -1 || low.split(/\s+/).some(function (w) {
        return w.length > 3 && f.text.toLowerCase().indexOf(w) !== -1;
      });
    });
    if (found.length) {
      return Promise.resolve({
        text: "Из вашей памяти:\n• " + found.slice(0, 5).map(function (f) { return f.text; }).join("\n• "),
        thought: "поиск по локальным заметкам пользователя"
      });
    }

    showProg("Ищу в открытых источниках…");
    return searchWiki(q).then(function (res) {
      showProg(null);
      return {
        text: res.title + "\n\n" + res.text + (res.url ? "\n\nИсточник: " + res.url : "") + "\n\n(Краткий пересказ из Википедии. Проверьте источник при необходимости.)",
        thought: "нет точного совпадения в KB → запрос к ru.wikipedia.org"
      };
    }).catch(function () {
      showProg(null);
      return {
        text: "Точного ответа в локальной базе нет, и быстрый поиск по Википедии тоже не нашёл страницу.\n\nПопробуйте:\n• переформулировать вопрос\n• написать «запомни: …»\n• открыть раздел «Поиск»\n• спросить «что умеешь»",
        thought: "нет совпадения в KB, память пуста, Википедия не ответила"
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
      sha256Hex(res.text + "|" + (res.thought || "") + "|" + Date.now()).then(function (sig) {
        addMsg("a", res.text, "подпись: " + sig.slice(0, 16) + "… · локально", res.thought || "");
        setStatus("готова");
      });
    });
  }

  function superRoute() {
    var text = (INP && INP.value) || "";
    if (!text.trim()) {
      addMsg("a", "Напишите вопрос в поле внизу — я разберу его и выберу нужный инструмент (поиск, счёт, квант или память).");
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
    if (!SR) { addMsg("a", "Голосовой ввод в этом браузере не поддерживается. Можно вводить текстом."); return; }
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

    var sBtn = document.getElementById("sBtn"), sIn = document.getElementById("sIn");
    if (sBtn && sIn) sBtn.onclick = function () {
      var q = sIn.value.trim();
      if (!q) return;
      document.getElementById("sOut").textContent = "Ищу…";
      searchWiki(q).then(function (r) {
        document.getElementById("sOut").textContent = r.title + "\n\n" + r.text + (r.url ? "\n\n" + r.url : "");
      }).catch(function () {
        document.getElementById("sOut").textContent = "Не найдено. Попробуйте другие слова.";
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
      document.getElementById("mOut").textContent = v === null ? "Не удалось посчитать. Пример: (3+2)*4" : "Результат: " + v;
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
          saveFact("[" + file.name + "] " + text.slice(0, 500)).then(function () {
            n++; if (out) out.textContent = "Загружено файлов: " + n; renderNotes();
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
      if (THREAD && !THREAD.children.length) {
        addMsg("a", "Здравствуйте. Я АКСИ — понятный помощник на русском.\nРаботаю локально в браузере.\nНапишите вопрос или нажмите «Умный ответ».", "система · без сервера");
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
