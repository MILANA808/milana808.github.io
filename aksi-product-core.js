/**
 * AKSI Product Core v1.2 — offline-first + optional local LLM
 * После aksi-core.js: <script src="/aksi-product-core.js"></script>
 */
(function (global) {
  "use strict";
  if (global.AksiProduct) return;
  var VERSION = "1.2.0";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var FACTS_KEY = "aksi_product_facts_v12";
  var CFG_KEY = "aksi_product_cfg_v12";
  var facts = [];
  var session = [];
  var cfg = { backendUrl: "", llmEnabled: false, offlineOnly: false };

  function esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function loadCfg() {
    try { var s = JSON.parse(localStorage.getItem(CFG_KEY)||"{}"); Object.assign(cfg, s); } catch(e){}
  }
  function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch(e){}
  }
  function loadFacts() {
    try { facts = JSON.parse(localStorage.getItem(FACTS_KEY)||"[]"); } catch(e){ facts=[]; }
    return Promise.resolve();
  }
  function saveFact(t) {
    facts.unshift({ text: String(t).slice(0,500), ts: Date.now() });
    facts = facts.slice(0,120);
    try { localStorage.setItem(FACTS_KEY, JSON.stringify(facts)); } catch(e){}
  }
  function sha256Hex(str) {
    if (!global.crypto || !crypto.subtle) {
      var h = 0x811c9dc5;
      for (var i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,0x01000193); }
      return Promise.resolve(("00000000"+(h>>>0).toString(16)).slice(-8));
    }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(str))).then(function(buf){
      return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,"0");}).join("");
    });
  }
  function signPayload(text, steps) {
    var payload = String(text)+"|"+(steps||[]).join(";")+"|"+Date.now();
    var core = global.AksiCore;
    if (core && typeof core.sign === "function") {
      return core.sign(payload).then(function(sig){
        return { sig: sig, algo: "Ed25519", did: DID, realCrypto: true };
      }).catch(function(){
        return sha256Hex(payload).then(function(h){ return { sig: h.slice(0,32), algo: "SHA-256", did: DID, realCrypto: false }; });
      });
    }
    return sha256Hex(payload).then(function(h){ return { sig: h.slice(0,32), algo: "SHA-256", did: DID, realCrypto: false }; });
  }

  var KB = [
    {k:["кто ты","что ты","идентичность"],a:"Я АКСИ — суверенный локальный помощник. DID: "+DID+". Данные по умолчанию остаются на устройстве. Контакт: aksilove@internet.ru"},
    {k:["что умеешь","возможности","функции"],a:"Offline-ответы, память («запомни: …»), математика, запутанность (Bell), Wikipedia при сети, опциональный LLM через backend (Ollama). Подпись Ed25519 через aksi-core.js."},
    {k:["помощь","help","команды"],a:"Команды: запомни: … · очисти память · очисти чат · формулы (2+2*3) · покажи запутанность. LLM: Настройки → Backend URL http://127.0.0.1:8000"},
    {k:["кодекс","этика"],a:"Кодекс АКСИ: не выдумывать факты, указывать неуверенность, показывать ход мысли, отказ от вреда. Identity — ответственность."}
  ];

  function localAnswer(q) {
    var low = q.toLowerCase();
    if (/^запомни[:\s]/i.test(q)) {
      var fact = q.replace(/^запомни[:\s]*/i,"").trim();
      if (fact) { saveFact(fact); return { text: "Запомнила: «"+fact+"»", step: "memory → save" }; }
    }
    if (/очисти\s*память/i.test(q)) {
      facts = []; try { localStorage.removeItem(FACTS_KEY); } catch(e){}
      return { text: "Долгосрочная память очищена.", step: "memory → clear" };
    }
    if (/очисти\s*чат/i.test(q)) {
      session = [];
      return { text: "Чат очищен.", step: "session → clear", clearChat: true };
    }
    if (/запутанн|bell|белл/i.test(q)) {
      return { text: "Запутанность (Bell, 2 кубита):\n• H на первом → CNOT\n• |00⟩ ≈ 50%, |11⟩ ≈ 50%\n• измерение первого как 0 ⇒ второй тоже 0\n\nУчебная симуляция statevector, не физический квантовый компьютер.", step: "quantum → Bell" };
    }
    var m = q.match(/^[\d\s+\-*/().^]+$/);
    if (m) {
      try {
        var expr = q.replace(/\^/g,"**").replace(/[^0-9+\-*/().\s]/g,"");
        var val = Function('"use strict";return ('+expr+')')();
        if (typeof val === "number" && isFinite(val)) return { text: String(val), step: "math" };
      } catch(e){}
    }
    for (var i=0;i<KB.length;i++){
      for (var j=0;j<KB[i].k.length;j++){
        if (low.indexOf(KB[i].k[j]) >= 0) return { text: KB[i].a, step: "kb" };
      }
    }
    if (facts.length) {
      var hits = facts.filter(function(f){ return low.split(/\s+/).some(function(w){ return w.length>2 && f.text.toLowerCase().indexOf(w)>=0; }); }).slice(0,3);
      if (hits.length) return { text: "Из памяти:\n• "+hits.map(function(h){return h.text;}).join("\n• "), step: "memory → recall" };
    }
    return null;
  }

  function searchWiki(query) {
    if (cfg.offlineOnly || (typeof navigator!=="undefined" && navigator.onLine===false)) return Promise.reject(new Error("offline"));
    var q = String(query||"").replace(/^(что такое|кто такой|кто такая|расскажи про|объясни)\s+/i,"").trim();
    if (q.length < 2) return Promise.reject(new Error("short"));
    return fetch("https://ru.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(q)).then(function(r){
      if (!r.ok) throw new Error("nf");
      return r.json();
    }).then(function(j){
      var extract = (j.extract||"").trim();
      if (!extract || j.type==="disambiguation") throw new Error("empty");
      return { text: (j.title||q)+". "+extract.slice(0,1100), url: (j.content_urls&&j.content_urls.desktop&&j.content_urls.desktop.page)||"" };
    });
  }

  function callBackend(messages) {
    if (!cfg.backendUrl || !cfg.llmEnabled) return Promise.reject(new Error("no backend"));
    var url = cfg.backendUrl.replace(/\/$/,"")+"/v1/chat/completions";
    return fetch(url,{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ model:"local", messages: messages, temperature:0.4, stream:false }) })
      .then(function(r){ if(!r.ok) throw new Error("backend "+r.status); return r.json(); })
      .then(function(j){
        var c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if (!c) throw new Error("empty llm");
        return String(c);
      });
  }

  function probeBackend(url) {
    var base = String(url||cfg.backendUrl||"http://127.0.0.1:8000").replace(/\/$/,"");
    return fetch(base+"/health").then(function(r){ if(!r.ok) throw new Error("bad"); return r.json(); })
      .then(function(j){ return { ok:!!(j&&(j.ok||j.status==="healthy")), url:base, ollama:!!(j&&j.ollama), model:(j&&j.model)||"", version:(j&&j.version)||"" }; })
      .catch(function(){ return { ok:false, url:base }; });
  }

  function autoConnectLocal() {
    if (cfg.offlineOnly) return Promise.resolve({ ok:false, skipped:true });
    return probeBackend(cfg.backendUrl||"http://127.0.0.1:8000").then(function(info){
      if (info.ok) { cfg.backendUrl = info.url; cfg.llmEnabled = true; saveCfg(); }
      return info;
    });
  }

  function answer(raw) {
    var q = String(raw||"").trim();
    var steps = [];
    function finish(text, source, extra) {
      session.push({ role:"user", content:q, ts:Date.now() });
      session.push({ role:"assistant", content:text, ts:Date.now() });
      if (session.length > 40) session = session.slice(-40);
      return signPayload(text, steps).then(function(sig){
        var out = { text:text, steps:steps, source:source||"local", signature:sig, version:VERSION };
        if (extra && extra.clearChat) out.clearChat = true;
        return out;
      });
    }
    if (!q) return finish("Напишите вопрос.", "empty");

    steps.push("вход");
    var loc = localAnswer(q);
    if (loc) {
      steps.push(loc.step||"local");
      return finish(loc.text, "local", loc);
    }

    steps.push("маршрут");
    var chain = Promise.resolve(null);

    if (cfg.llmEnabled && cfg.backendUrl && !cfg.offlineOnly) {
      steps.push("llm");
      var msgs = [{ role:"system", content:"Ты АКСИ — суверенный помощник. Отвечай по-русски, честно, кратко." }];
      session.slice(-8).forEach(function(m){ msgs.push({ role: m.role==="assistant"?"assistant":"user", content: m.content }); });
      msgs.push({ role:"user", content:q });
      chain = callBackend(msgs).then(function(t){ return { text:t, source:"llm" }; }).catch(function(){ return null; });
    }

    return chain.then(function(llm){
      if (llm) { steps.push("llm-ok"); return finish(llm.text, "llm"); }
      steps.push("wiki?");
      return searchWiki(q).then(function(w){
        steps.push("wiki");
        return finish(w.text+(w.url?"\n\nИсточник: "+w.url:""), "wiki");
      }).catch(function(){
        steps.push("fallback");
        var hint = facts.length ? "\nВ памяти "+facts.length+" факт(ов)." : "";
        return finish("Пока нет точного ответа в offline-базе."+hint+"\nПопробуйте: «кто ты», «запомни: …», «2+2», «запутанность».\nДля LLM: backend на :8000 + ☑ LLM в настройках.", "fallback");
      });
    });
  }

  var api = {
    VERSION: VERSION,
    init: function(opts){
      opts = opts||{};
      loadCfg();
      if (opts.backendUrl) cfg.backendUrl = opts.backendUrl;
      if (typeof opts.llmEnabled==="boolean") cfg.llmEnabled = opts.llmEnabled;
      if (typeof opts.offlineOnly==="boolean") cfg.offlineOnly = opts.offlineOnly;
      return loadFacts().then(function(){
        return { ok:true, version:VERSION, facts:facts.length, ed25519:!!(global.AksiCore && typeof global.AksiCore.sign==="function") };
      });
    },
    setConfig: function(c){
      c=c||{};
      if (c.backendUrl!==undefined) cfg.backendUrl=String(c.backendUrl||"");
      if (c.llmEnabled!==undefined) cfg.llmEnabled=!!c.llmEnabled;
      if (c.offlineOnly!==undefined) cfg.offlineOnly=!!c.offlineOnly;
      saveCfg();
    },
    getConfig: function(){ return { backendUrl:cfg.backendUrl, llmEnabled:cfg.llmEnabled, offlineOnly:cfg.offlineOnly }; },
    answer: answer,
    saveFact: saveFact,
    getFacts: function(){ return facts.slice(); },
    clearSession: function(){ session=[]; },
    getSession: function(){ return session.slice(); },
    probeBackend: probeBackend,
    autoConnectLocal: autoConnectLocal,
    exportAll: function(){
      return { schema:"AKSI-PRODUCT-1", version:VERSION, exportedAt:new Date().toISOString(), facts:facts, session:session, config:api.getConfig() };
    },
    importAll: function(data){
      if (!data||typeof data!=="object") return Promise.resolve(false);
      if (Array.isArray(data.facts)) { facts=data.facts; try{ localStorage.setItem(FACTS_KEY, JSON.stringify(facts.slice(0,120))); }catch(e){} }
      if (data.config) api.setConfig(data.config);
      return Promise.resolve(true);
    },
    esc: esc
  };
  loadCfg();
  global.AksiProduct = api;
  if (!global.AksiProductCore) global.AksiProductCore = api;
})(typeof window !== "undefined" ? window : self);
