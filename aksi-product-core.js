/**
 * AKSI Product Core v1.2.1 — hardened
 * Offline-first + optional local LLM. Cryptographic labels are honest:
 * SHA-256 integrity is never presented as an Ed25519 signature.
 */
(function (global) {
  "use strict";
  if (global.AksiProduct) return;
  var VERSION = "1.2.1";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var FACTS_KEY = "aksi_product_facts_v12";
  var CFG_KEY = "aksi_product_cfg_v12";
  var facts = [];
  var session = [];
  var cfg = { backendUrl: "", llmEnabled: false, offlineOnly: false };

  function esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function loadCfg() {
    try { var s = JSON.parse(localStorage.getItem(CFG_KEY)||"{}"); if (s && typeof s === "object") Object.assign(cfg, s); } catch(e){}
  }
  function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch(e){} }
  function loadFacts() {
    try {
      var v = JSON.parse(localStorage.getItem(FACTS_KEY)||"[]");
      facts = Array.isArray(v) ? v.slice(0,120) : [];
    } catch(e){ facts=[]; }
    return Promise.resolve();
  }
  function saveFact(t) {
    facts.unshift({ text: String(t).slice(0,500), ts: Date.now() });
    facts = facts.slice(0,120);
    try { localStorage.setItem(FACTS_KEY, JSON.stringify(facts)); } catch(e){}
  }
  function sha256Hex(str) {
    if (!global.crypto || !crypto.subtle || typeof TextEncoder === "undefined") {
      return Promise.reject(new Error("SHA-256 Web Crypto unavailable; refusing weak fallback"));
    }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(str))).then(function(buf){
      return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,"0");}).join("");
    });
  }
  function signPayload(text, steps) {
    var payload = String(text)+"|"+(steps||[]).join(";")+"|"+Date.now();
    var core = global.AksiCore;
    if (core && typeof core.sign === "function") {
      return Promise.resolve(core.sign(payload)).then(function(sig){
        return { sig: sig, algo: "Ed25519", did: DID, realCrypto: true };
      }).catch(function(){
        return sha256Hex(payload).then(function(h){ return { sig: h, algo: "SHA-256-integrity", did: null, realCrypto: false }; });
      });
    }
    return sha256Hex(payload).then(function(h){ return { sig: h, algo: "SHA-256-integrity", did: null, realCrypto: false }; });
  }

  var KB = [
    {k:["кто ты","что ты","идентичность"],a:"Я АКСИ — суверенный локальный помощник. DID: "+DID+". Данные по умолчанию остаются на устройстве. Контакт: aksilove@internet.ru"},
    {k:["что умеешь","возможности","функции"],a:"Offline-ответы, память, математика, учебная Bell-симуляция, Wikipedia при сети, опциональный LLM через backend. Криптографическая подпись Ed25519 доступна только при наличии AKSI Core."},
    {k:["помощь","help","команды"],a:"Команды: запомни: … · очисти память · очисти чат · формулы (2+2*3) · покажи запутанность."},
    {k:["кодекс","этика"],a:"Кодекс АКСИ: не выдумывать факты, указывать неуверенность и не выдавать целостность записи за доказательство истины."}
  ];

  function safeMath(expr) {
    var s = String(expr||"").trim().replace(/,/g,".");
    if (!/^[0-9+\-*/().%\s]+$/.test(s) || !/[0-9]/.test(s) || s.length > 200) return null;
    var tokens=[], i=0;
    while(i<s.length){
      if (/\s/.test(s[i])) { i++; continue; }
      var m=s.slice(i).match(/^\d+(?:\.\d+)?/);
      if(m){ tokens.push({t:"n",v:Number(m[0])}); i+=m[0].length; continue; }
      if("+-*/%()".indexOf(s[i])>=0){ tokens.push({t:s[i],v:s[i]}); i++; continue; }
      return null;
    }
    var pos=0;
    function primary(){
      if(tokens[pos] && tokens[pos].t==="-"){pos++; return -primary();}
      if(tokens[pos] && tokens[pos].t==="("){pos++; var v=add(); if(!tokens[pos]||tokens[pos].t!==")") throw Error("paren"); pos++; return v;}
      if(tokens[pos]&&tokens[pos].t==="n") return tokens[pos++].v;
      throw Error("number");
    }
    function mul(){
      var v=primary();
      while(tokens[pos]&&/[*/%]/.test(tokens[pos].t)){var op=tokens[pos++].t,b=primary(); if((op==="/"||op==="%")&&b===0) throw Error("zero"); v=op==="*"?v*b:op==="/"?v/b:v%b;}
      return v;
    }
    function add(){
      var v=mul();
      while(tokens[pos]&&(tokens[pos].t==="+"||tokens[pos].t==="-")){var op=tokens[pos++].t,b=mul(); v=op==="+"?v+b:v-b;}
      return v;
    }
    var out=add();
    if(pos!==tokens.length||!Number.isFinite(out)) return null;
    return out;
  }

  function localAnswer(q) {
    var low=q.toLowerCase();
    if (/^запомни[:\s]/i.test(q)) { var fact=q.replace(/^запомни[:\s]*/i,"").trim(); if(fact){saveFact(fact);return{text:"Запомнила: «"+fact+"»",step:"memory → save"};} }
    if (/очисти\s*память/i.test(q)) { facts=[];try{localStorage.removeItem(FACTS_KEY);}catch(e){}return{text:"Долгосрочная память очищена.",step:"memory → clear"}; }
    if (/очисти\s*чат/i.test(q)) { session=[];return{text:"Чат очищен.",step:"session → clear",clearChat:true}; }
    if (/запутанн|bell|белл/i.test(q)) return {text:"Запутанность (Bell, 2 кубита): H → CNOT; идеальная модель даёт 00 и 11 примерно по 50%. Учебная симуляция, не физический QPU.",step:"quantum → Bell"};
    if (/^[\d\s+\-*/().%,]+$/.test(q)) { var val=safeMath(q); if(val!==null)return{text:String(val),step:"math"}; }
    for(var i=0;i<KB.length;i++) for(var j=0;j<KB[i].k.length;j++) if(low.indexOf(KB[i].k[j])>=0)return{text:KB[i].a,step:"kb"};
    if(facts.length){var hits=facts.filter(function(f){return f&&f.text&&low.split(/\s+/).some(function(w){return w.length>2&&String(f.text).toLowerCase().indexOf(w)>=0;});}).slice(0,3);if(hits.length)return{text:"Из памяти:\n• "+hits.map(function(h){return h.text;}).join("\n• "),step:"memory → recall"};}
    return null;
  }

  function searchWiki(query) {
    if(cfg.offlineOnly||(typeof navigator!=="undefined"&&navigator.onLine===false))return Promise.reject(Error("offline"));
    var q=String(query||"").replace(/^(что такое|кто такой|кто такая|расскажи про|объясни)\s+/i,"").trim();
    if(q.length<2)return Promise.reject(Error("short"));
    return fetch("https://ru.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(q)).then(function(r){if(!r.ok)throw Error("nf");return r.json();}).then(function(j){var extract=String(j.extract||"").trim();if(!extract||j.type==="disambiguation")throw Error("empty");return{text:(j.title||q)+". "+extract.slice(0,1100),url:j.content_urls&&j.content_urls.desktop&&j.content_urls.desktop.page||""};});
  }
  function callBackend(messages){
    if(!cfg.backendUrl||!cfg.llmEnabled)return Promise.reject(Error("no backend"));
    var url=cfg.backendUrl.replace(/\/$/,"")+"/v1/chat/completions";
    return fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"local",messages:messages,temperature:0.4,stream:false})}).then(function(r){if(!r.ok)throw Error("backend "+r.status);return r.json();}).then(function(j){var c=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;if(!c)throw Error("empty llm");return String(c);});
  }
  function probeBackend(url){
    var base=String(url||cfg.backendUrl||"http://127.0.0.1:8000").replace(/\/$/,"");
    return fetch(base+"/health",{signal:(global.AbortSignal&&AbortSignal.timeout)?AbortSignal.timeout(2500):undefined}).then(function(r){if(!r.ok)throw Error("bad");return r.json();}).then(function(j){return{ok:!!(j&&(j.ok||j.status==="healthy")),url:base,ollama:!!j.ollama,model:j.model||"",version:j.version||""};}).catch(function(){return{ok:false,url:base};});
  }
  function autoConnectLocal(){if(cfg.offlineOnly)return Promise.resolve({ok:false,skipped:true});return probeBackend(cfg.backendUrl||"http://127.0.0.1:8000").then(function(info){if(info.ok){cfg.backendUrl=info.url;cfg.llmEnabled=true;saveCfg();}return info;});}
  function answer(raw){
    var q=String(raw||"").trim(),steps=[];
    function finish(text,source,extra){session.push({role:"user",content:q,ts:Date.now()});session.push({role:"assistant",content:text,ts:Date.now()});if(session.length>40)session=session.slice(-40);return signPayload(text,steps).then(function(sig){var out={text:text,steps:steps,source:source||"local",signature:sig,version:VERSION};if(extra&&extra.clearChat)out.clearChat=true;return out;});}
    if(!q)return finish("Напишите вопрос.","empty");
    steps.push("вход");var loc=localAnswer(q);if(loc){steps.push(loc.step||"local");return finish(loc.text,"local",loc);}
    steps.push("маршрут");var chain=Promise.resolve(null);
    if(cfg.llmEnabled&&cfg.backendUrl&&!cfg.offlineOnly){steps.push("llm");var msgs=[{role:"system",content:"Ты АКСИ — помощник. Отвечай по-русски, честно и кратко."}];session.slice(-8).forEach(function(m){msgs.push({role:m.role==="assistant"?"assistant":"user",content:m.content});});msgs.push({role:"user",content:q});chain=callBackend(msgs).then(function(t){return{text:t,source:"llm"};}).catch(function(){return null;});}
    return chain.then(function(llm){if(llm){steps.push("llm-ok");return finish(llm.text,"llm");}steps.push("wiki?");return searchWiki(q).then(function(w){steps.push("wiki");return finish(w.text+(w.url?"\n\nИсточник: "+w.url:""),"wiki");}).catch(function(){steps.push("fallback");return finish("Пока нет точного ответа в offline-базе."+(facts.length?"\nВ памяти "+facts.length+" факт(ов).":""),"fallback");});});
  }
  var api={
    VERSION:VERSION,
    init:function(opts){opts=opts||{};loadCfg();if(opts.backendUrl)cfg.backendUrl=String(opts.backendUrl);if(typeof opts.llmEnabled==="boolean")cfg.llmEnabled=opts.llmEnabled;if(typeof opts.offlineOnly==="boolean")cfg.offlineOnly=opts.offlineOnly;return loadFacts().then(function(){return{ok:true,version:VERSION,facts:facts.length,ed25519:!!(global.AksiCore&&typeof global.AksiCore.sign==="function")};});},
    setConfig:function(c){c=c||{};if(c.backendUrl!==undefined)cfg.backendUrl=String(c.backendUrl||"");if(c.llmEnabled!==undefined)cfg.llmEnabled=!!c.llmEnabled;if(c.offlineOnly!==undefined)cfg.offlineOnly=!!c.offlineOnly;saveCfg();},
    getConfig:function(){return{backendUrl:cfg.backendUrl,llmEnabled:cfg.llmEnabled,offlineOnly:cfg.offlineOnly};},answer:answer,saveFact:saveFact,getFacts:function(){return facts.slice();},clearSession:function(){session=[];},getSession:function(){return session.slice();},probeBackend:probeBackend,autoConnectLocal:autoConnectLocal,
    exportAll:function(){return{schema:"AKSI-PRODUCT-1",version:VERSION,exportedAt:new Date().toISOString(),facts:facts,session:session,config:api.getConfig()};},
    importAll:function(data){if(!data||typeof data!=="object")return Promise.resolve(false);if(Array.isArray(data.facts)){facts=data.facts.filter(function(x){return x&&typeof x.text==="string";}).slice(0,120);try{localStorage.setItem(FACTS_KEY,JSON.stringify(facts));}catch(e){}}if(data.config)api.setConfig(data.config);return Promise.resolve(true);},esc:esc
  };
  loadCfg();global.AksiProduct=api;if(!global.AksiProductCore)global.AksiProductCore=api;
})(typeof window!=="undefined"?window:self);
