/** AKSI Brain — templates, optimize, chat memory, optional web facts */
(function (global) {
  "use strict";
  var TEMPLATES = {
    bell: { name: "Состояние Белла Φ+", nQ: 2, gates: [{ g: "H", q: 0 }, { g: "CNOT", c: 0, q: 1 }], desc: "Запутанность: равные |00⟩ и |11⟩" },
    ghz: { name: "GHZ", nQ: 3, gates: [{ g: "H", q: 0 }, { g: "CNOT", c: 0, q: 1 }, { g: "CNOT", c: 0, q: 2 }], desc: "Трёхкубитовая запутанность" },
    teleport: { name: "Телепортация (ядро)", nQ: 3, gates: [{ g: "H", q: 1 }, { g: "CNOT", c: 1, q: 2 }, { g: "CNOT", c: 0, q: 1 }, { g: "H", q: 0 }], desc: "Энтанглинг + Белл-измерение (упрощ.)" },
    deutsch: { name: "Дойч (oracle X)", nQ: 2, gates: [{ g: "H", q: 0 }, { g: "H", q: 1 }, { g: "X", q: 1 }, { g: "CNOT", c: 0, q: 1 }, { g: "X", q: 1 }, { g: "H", q: 0 }], desc: "Демо oracle balanced" },
    superpos: { name: "Суперпозиция", nQ: 1, gates: [{ g: "H", q: 0 }], desc: "|+⟩ на одном кубите" },
    swaptest: { name: "SWAP", nQ: 2, gates: [{ g: "H", q: 0 }, { g: "SWAP", c: 0, q: 1 }], desc: "H + SWAP" }
  };
  var MEM_KEY = "aksi_matrix_chat_v2";
  var LEARN_KEY = "aksi_matrix_learn_v2";
  function loadChat() { try { return JSON.parse(localStorage.getItem(MEM_KEY) || "[]"); } catch (e) { return []; } }
  function saveChat(arr) { try { localStorage.setItem(MEM_KEY, JSON.stringify(arr.slice(-40))); } catch (e) {} }
  function loadLearn() { try { return JSON.parse(localStorage.getItem(LEARN_KEY) || "[]"); } catch (e) { return []; } }
  function saveLearn(arr) { try { localStorage.setItem(LEARN_KEY, JSON.stringify(arr.slice(-60))); } catch (e) {} }
  function matchTemplate(text) {
    var low = text.toLowerCase();
    if (/белл|bell|запут/.test(low)) return TEMPLATES.bell;
    if (/ghz|гхз/.test(low)) return TEMPLATES.ghz;
    if (/телепорт/.test(low)) return TEMPLATES.teleport;
    if (/дойч|deutsch/.test(low)) return TEMPLATES.deutsch;
    if (/суперпоз|hadamard|только h/.test(low)) return TEMPLATES.superpos;
    if (/swap|свап/.test(low)) return TEMPLATES.swaptest;
    return null;
  }
  function reply(userText, ctx) {
    ctx = ctx || {};
    var q = String(userText || "").trim();
    var low = q.toLowerCase();
    var chat = loadChat();
    chat.push({ role: "user", text: q, t: Date.now() });
    var out = { text: "", action: null, gates: null, nQ: null };
    if (/оптимиз/.test(low) && ctx.gates) {
      var opt = QuantumCore.optimizeCircuit(ctx.gates);
      out.action = "optimize"; out.gates = opt.gates; out.nQ = ctx.nQ;
      out.text = "Оптимизация: было " + ctx.gates.length + " гейтов → стало " + opt.gates.length + (opt.removed ? " (−" + opt.removed + ")" : "") + ".\n" + (opt.steps.length ? opt.steps.join("\n") : "Эвристики: пары HH, XX, CNOT·CNOT → I.");
    } else if (/qiskit|питон|python/.test(low) && ctx.gates) {
      out.text = "Qiskit:\n" + DSLTranslator.toQiskit(ctx.nQ || 2, ctx.gates);
    } else if (/qasm/.test(low) && ctx.gates) {
      out.text = "OpenQASM 2.0:\n" + DSLTranslator.toQASM(ctx.nQ || 2, ctx.gates);
    } else if (/dsl|язык/.test(low) && ctx.gates) {
      out.text = "DSL:\n" + DSLTranslator.toDSL(ctx.gates);
    } else if (/^(h |x |cnot|toffoli|swap)/i.test(q) || /;/.test(q)) {
      var parsed = DSLTranslator.parseDSL(q, 4);
      if (parsed.errors.length) out.text = "DSL ошибки:\n" + parsed.errors.join("\n");
      else { out.action = "load"; out.gates = parsed.gates; out.nQ = parsed.nQ; out.text = "Схема из DSL: " + parsed.gates.length + " гейтов, " + parsed.nQ + " кубит(ов)."; }
    } else {
      var tpl = matchTemplate(q);
      if (tpl) {
        out.action = "load"; out.gates = tpl.gates.slice(); out.nQ = tpl.nQ;
        out.text = "Собрала шаблон «" + tpl.name + "».\n" + tpl.desc + "\nГейтов: " + tpl.gates.length;
        var learn = loadLearn(); learn.push({ q: q.slice(0, 120), template: tpl.name, t: Date.now() }); saveLearn(learn);
      } else if (/кто ты|акси/.test(low)) {
        out.text = "Я АКСИ MATRIX: симулятор, оптимизатор, DSL, шаблоны, арт. NFT — демо-сертификат. Интернет: Wikipedia («найди …»).";
      } else if (/найди |wiki |что такое /.test(low)) {
        out.action = "web"; out.query = q.replace(/^(найди|wiki|что такое)\s*/i, ""); out.text = "Ищу в Wikipedia…";
      } else if (/науч|выучил|память/.test(low)) {
        var L = loadLearn();
        out.text = L.length ? ("Выученные запросы → шаблоны:\n" + L.slice(-8).map(function (x, i) { return (i + 1) + ". «" + x.q + "» → " + x.template; }).join("\n")) : "Пока пусто. Попросите «сделай Белла».";
      } else {
        out.text = "Могу: «сделай Белла / GHZ / телепортацию», «оптимизируй», «qiskit», «qasm», DSL H 0; CNOT 0 1, «найди квантовая запутанность».";
      }
    }
    chat.push({ role: "assistant", text: out.text, t: Date.now() }); saveChat(chat); out.chat = chat; return out;
  }
  function wikiSearch(query) {
    var url = "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(query.trim().replace(/\s+/g, "_"));
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("нет статьи"); return r.json(); }).then(function (j) {
      return { title: j.title, extract: j.extract || j.description || "Нет краткого текста", url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || "" };
    });
  }
  global.AksiBrain = { reply: reply, TEMPLATES: TEMPLATES, loadChat: loadChat, wikiSearch: wikiSearch, loadLearn: loadLearn };
})(typeof window !== "undefined" ? window : globalThis);
