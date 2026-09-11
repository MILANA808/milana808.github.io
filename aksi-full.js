/** AKSI Full System v6 · aksilove@internet.ru */
(function(){
"use strict";
var VER="6.0.0-full";
function $(id){return document.getElementById(id)}
function status(m){var e=$("status");if(e)e.textContent=m||""}
function setPipe(n){
  try{document.querySelectorAll("#pipe div").forEach(function(el){
    el.classList.toggle("on",Number(el.getAttribute("data-s"))<=n);
  })}catch(e){}
}
function fnv1a(s){var h=2166136261>>>0;s=String(s||"");for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return("00000000"+h.toString(16)).slice(-8)}
function norm(s){return String(s||"").toLowerCase().replace(/ё/g,"е").replace(/[^a-zа-я0-9\s]/gi," ").replace(/\s+/g," ").trim()}

var SEED=[
{k:["кто ты","что ты","представься","привет","здравствуй"],a:"Я АКСИ — полноценная Decision Integrity система в браузере.\n\nКонтур ответа:\n1) Найти — ядро, память, Wikipedia\n2) Понять — собрать факты в связный ответ\n3) Кандидаты — несколько вариантов\n4) Коллапс — выбор одного\n5) Seal — отпечаток решения\n\nКора WebLLM — опциональный нейросинтез.\nЛаборатория: /aksi.html\nКонтакт: aksilove@internet.ru"},
{k:["формул","aksi =","формула aksi"],a:"AKSI = (A × I × S) × (1 + 0.4√n)\n\nA — agency\nI — integrity\nS — structure / sovereignty\nn — sealed history\n\nИнженерная формула продукта."},
{k:["квантовый компьютер","квантовые компьютер","кубит"],a:"Квантовый компьютер обрабатывает информацию в кубитах. Кубит может быть в суперпозиции 0 и 1.\n\nСуперпозиция, интерференция и запутанность дают преимущество (Шора, Гровера).\n\nСейчас — прототипы и облачные процессоры; универсальный отказоустойчивый компьютер большой мощности ещё в разработке.\n\nВ АКСИ «коллапс» — выбор ответа среди кандидатов, не физический квантовый компьютер."},
{k:["искусственный интеллект","что такое ии","нейросет","машинное обучение"],a:"ИИ — системы восприятия, вывода, обучения и генерации.\n\nСовременные чат-ИИ — крупные языковые модели на данных.\n\nАКСИ — явный контур: найти → понять → кандидаты → коллапс → seal, с опциональной локальной нейросетью (WebLLM)."},
{k:["фотосинтез"],a:"Фотосинтез: свет + CO₂ + вода → сахара + O₂.\n6CO₂ + 6H₂O + свет → C₆H₁₂O₆ + 6O₂.\nХлоропласты, хлорофилл."},
{k:["днк","ген ","хромосом"],a:"ДНК — двойная спираль (A,T,G,C). Ген — участок ДНК. Хромосома — упаковка ДНК."},
{k:["блокчейн","биткоин","bitcoin"],a:"Блокчейн — журнал блоков с хешами. Биткоин (2009) — криптовалюта без банка."},
{k:["коллапс","суперпозиц","как работает"],a:"Кандидаты → веса → коллапс выбирает один → seal. Прозрачная модель выбора."},
{k:["миссия","зачем","польза","что умеешь"],a:"Миссия — ясный проверяемый ответ в браузере.\nЧат, веб, память, seal, WebLLM.\naksilove@internet.ru"},
{k:["офлайн","без интернет","автоном"],a:"Offline-first: ядро и память без сети. Веб и кора — усиления."}
];

function seedMatch(q){
  var nq=norm(q),best=null,score=0;
  for(var i=0;i<SEED.length;i++){
    var s=0;
    for(var j=0;j<SEED[i].k.length;j++){
      var k=norm(SEED[i].k[j]);
      if(k&&nq.indexOf(k)!==-1)s+=10+k.length;
    }
    if(s>score){score=s;best=SEED[i]}
  }
  if(score>=6)return{text:best.a,conf:Math.min(0.97,0.78+score/50),source:"ядро"};
  return null;
}

function memAll(){try{return JSON.parse(localStorage.getItem("aksi_full_mem")||"[]")}catch(e){return[]}}
function memWrite(a){try{localStorage.setItem("aksi_full_mem",JSON.stringify(a.slice(-400)))}catch(e){}}
function memAdd(t){var a=memAll();a.push({t:Date.now(),text:String(t).slice(0,500)});memWrite(a)}
function memSearch(q){
  var words=norm(q).split(" ").filter(function(w){return w.length>3});
  var hits=[],list=memAll();
  for(var i=list.length-1;i>=0&&hits.length<3;i--){
    var t=norm(list[i].text);
    for(var w=0;w<words.length;w++)if(t.indexOf(words[w])!==-1){hits.push(list[i].text);break}
  }
  return hits.length?{text:"Из памяти:\n• "+hits.join("\n• "),conf:0.72,source:"память"}:null;
}
function sealsAll(){try{return JSON.parse(localStorage.getItem("aksi_full_seals")||"[]")}catch(e){return[]}}
function sealPush(q,a,src,p){
  var h=fnv1a(q+"|"+a+"|"+src+"|"+p);
  var list=sealsAll();
  list.push({t:Date.now(),q:String(q).slice(0,100),h:h,src:src,p:p});
  try{localStorage.setItem("aksi_full_seals",JSON.stringify(list.slice(-50)))}catch(e){}
  return h;
}

function withTimeout(p,ms){
  return new Promise(function(resolve){
    var done=false;
    var t=setTimeout(function(){if(!done){done=true;resolve(null)}},ms);
    p.then(function(v){if(!done){done=true;clearTimeout(t);resolve(v)}}).catch(function(){if(!done){done=true;clearTimeout(t);resolve(null)}});
  });
}

async function fetchWiki(q){
  var topic=String(q).replace(/^(что такое|кто такой|кто такая|what is|who is)\s+/i,"").replace(/\?+$/g,"").trim()||q;
  try{
    var url="https://ru.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(topic.replace(/\s+/g,"_"));
    var r=await withTimeout(fetch(url,{mode:"cors"}).then(function(res){if(!res.ok)throw new Error("x");return res.json()}),3500);
    if(r&&r.extract&&r.type!=="disambiguation")return{title:r.title,text:r.extract,url:(r.content_urls&&r.content_urls.desktop&&r.content_urls.desktop.page)||"",source:"wikipedia",conf:0.9};
  }catch(e){}
  try{
    var sUrl="https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch="+encodeURIComponent(topic)+"&srlimit=1&format=json&origin=*";
    var s=await withTimeout(fetch(sUrl,{mode:"cors"}).then(function(res){return res.json()}),3500);
    var hit=s&&s.query&&s.query.search&&s.query.search[0];
    if(!hit)return null;
    var url2="https://ru.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(hit.title.replace(/ /g,"_"));
    var r2=await withTimeout(fetch(url2,{mode:"cors"}).then(function(res){if(!res.ok)throw new Error("x");return res.json()}),3500);
    if(r2&&r2.extract)return{title:r2.title,text:r2.extract,url:(r2.content_urls&&r2.content_urls.desktop&&r2.content_urls.desktop.page)||"",source:"wikipedia",conf:0.88};
  }catch(e){}
  return null;
}

function comprehend(q, facts){
  if(!facts||!facts.length)return null;
  var f=facts[0];
  var body=String(f.text||"").trim();
  if(body.length>850)body=body.slice(0,847)+"…";
  var out="По сути вопроса «"+q+"»:\n\n"+body;
  if(f.url)out+="\n\n→ "+f.url;
  out+="\n\nИсточник: "+(f.source||"web")+(f.title?" · "+f.title:"");
  return{text:out,conf:Math.min(0.92,(f.conf||0.8)+0.05),source:"синтез"};
}

function cortexReady(){try{return!!(window.AKSI_WEBLLM&&AKSI_WEBLLM.status&&AKSI_WEBLLM.status().ready)}catch(e){return false}}

async function cortexSynth(q,facts){
  if(!cortexReady())return null;
  var ctx=(facts||[]).slice(0,3).map(function(f,i){return(i+1)+") "+String(f.text||"").slice(0,400)}).join("\n");
  try{
    var r=await AKSI_WEBLLM.complete(
      "Вопрос: "+q+"\n\nФакты:\n"+(ctx||"(мало)")+"\n\nДай лучший ответ по-русски.",
      {system:"Ты кора АКСИ. Только русский. 4–10 предложений. Сначала прямой ответ. Опирайся на факты.",temperature:0.35,max_tokens:480}
    );
    var t=String((r&&(r.text||r.answer))||"").trim();
    if(t.length<40||!/[а-яёА-ЯЁ]/.test(t))return null;
    return{text:t,conf:0.94,source:"кора"};
  }catch(e){return null}
}

function normalize(ws){var s=0;for(var i=0;i<ws.length;i++)s+=Math.max(0.001,ws[i]);return ws.map(function(w){return Math.max(0.001,w)/s})}
function collapse(amps){var r=Math.random(),acc=0;for(var i=0;i<amps.length;i++){acc+=amps[i];if(r<=acc)return i}return amps.length-1}

async function fullThink(query,opts){
  opts=opts||{};
  query=String(query||"").trim();
  if(!query)return{ok:false,answer:""};

  if(/^запомни\s*[:：]/i.test(query)){
    var fact=query.replace(/^запомни\s*[:：]\s*/i,"").trim();
    memAdd(fact);renderMem();
    return{ok:true,answer:"Запомнила: «"+fact.slice(0,220)+"».",source:"память",probability:1,superposition:[],seal:sealPush(query,fact,"память",1),version:VER};
  }

  setPipe(1);
  var facts=[],cands=[];
  function push(c){
    if(!c||!c.text||c.text.length<8)return;
    for(var i=0;i<cands.length;i++)if(cands[i].text.slice(0,50)===c.text.slice(0,50))return;
    cands.push(c);
  }

  var seed=seedMatch(query);if(seed){facts.push(seed);push(seed)}
  var mem=memSearch(query);if(mem)push(mem);

  if(opts.web!==false){
    status("1 · Ищу факты…");
    var wiki=await fetchWiki(query);
    if(wiki)facts.push(wiki);
  }

  setPipe(2);
  status("2 · Осмысливаю…");
  var wikiFacts=facts.filter(function(f){return f.source&&String(f.source).indexOf("wiki")===0});
  var synth=comprehend(query,wikiFacts.length?wikiFacts:facts);
  if(synth)push(synth);
  for(var fi=0;fi<facts.length;fi++){
    if(facts[fi].source&&String(facts[fi].source).indexOf("wiki")===0){
      var raw=facts[fi].text;
      if(raw.length>900)raw=raw.slice(0,897)+"…";
      push({text:raw+(facts[fi].url?"\n\n→ "+facts[fi].url:""),conf:facts[fi].conf||0.85,source:facts[fi].source});
    }
  }

  setPipe(3);
  if(opts.cortex!==false&&cortexReady()){
    status("3 · Кора…");
    var neural=await cortexSynth(query,facts);
    if(neural)push(neural);
  }

  if(!cands.length){
    push({text:"По «"+query+"» нет факта в ядре"+(opts.web!==false?" и вебе":"")+".\n\n«что такое X», Веб, или «запомни: …».\naksilove@internet.ru",conf:0.25,source:"пробел"});
  }

  var weights=cands.map(function(c){
    var w=c.conf||0.5;
    if(c.source==="кора")w+=0.3;
    if(c.source==="синтез")w+=0.2;
    if(c.source==="ядро")w+=0.18;
    if(String(c.source).indexOf("wiki")===0)w+=0.15;
    if(c.source==="пробел")w*=0.4;
    return w;
  });
  var amps=normalize(weights);
  setPipe(4);
  status("4 · Коллапс…");
  var maxI=0;for(var i=1;i<amps.length;i++)if(amps[i]>amps[maxI])maxI=i;
  var idx=amps[maxI]>=0.33?maxI:collapse(amps);
  var chosen=cands[idx];

  setPipe(5);
  status("");
  var h=sealPush(query,chosen.text,chosen.source,amps[idx]);
  return{
    ok:true,
    answer:chosen.text,
    source:chosen.source,
    probability:+amps[idx].toFixed(4),
    superposition:cands.map(function(c,i){return{source:c.source,probability:+amps[i].toFixed(4),preview:c.text.slice(0,140),selected:i===idx}}),
    seal:h,
    cortex:cortexReady(),
    version:VER
  };
}

async function ask(raw){
  var q=String(raw!=null?raw:($("q")&&$("q").value)||"").trim();
  if(!q)return;
  if($("q"))$("q").value=q;
  if($("go"))$("go").disabled=true;
  if($("out"))$("out").textContent="…";
  if($("meta"))$("meta").textContent="";
  try{
    var r=await fullThink(q,{web:!!($("useWeb")&&$("useWeb").checked),cortex:true});
    if($("out"))$("out").textContent=r.answer||"—";
    if($("meta"))$("meta").textContent=(r.source||"")+" · P="+((r.probability||0)*100).toFixed(0)+"% · seal "+(r.seal||"")+" · "+(r.cortex?"кораON":"кораOFF")+" · "+VER;
    lastSup=r.superposition||[];
    renderSup();renderSeals();
  }catch(e){
    if($("out"))$("out").textContent="Ошибка: "+(e.message||e);
  }finally{
    if($("go"))$("go").disabled=false;
    status("");
  }
}

var lastSup=[];
function renderSup(){
  var el=$("supList");if(!el)return;
  if(!lastSup.length){el.innerHTML='<li class="meta">Нет данных</li>';return}
  el.innerHTML=lastSup.map(function(s){
    return '<li class="'+(s.selected?"sel":"")+'"><span class="p">'+(s.probability*100).toFixed(0)+'%</span> · <b>'+s.source+'</b>'+(s.selected?" ← коллапс":"")+"<br>"+String(s.preview).replace(/</g,"<")+"</li>";
  }).join("");
}
function renderMem(){
  var list=memAll().slice().reverse(),el=$("memList");if(!el)return;
  if(!list.length){el.innerHTML='<li class="meta">Пусто</li>';return}
  el.innerHTML=list.slice(0,40).map(function(m){return"<li>"+String(m.text).replace(/</g,"<")+'<div class="meta">'+new Date(m.t).toLocaleString()+"</div></li>"}).join("");
}
function renderSeals(){
  var list=sealsAll().slice().reverse(),el=$("sealList");if(!el)return;
  if(!list.length){el.innerHTML='<li class="meta">Пусто</li>';return}
  el.innerHTML=list.slice(0,25).map(function(s){return'<li><span class="trail">'+s.h+"</span> · "+(s.src||"")+" · P="+((s.p||0)*100).toFixed(0)+"%<br>"+String(s.q||"").replace(/</g,"<")+'<div class="meta">'+new Date(s.t).toLocaleString()+"</div></li>"}).join("");
}
function renderSys(){
  var el=$("sysOut");if(!el)return;
  el.textContent="Версия: "+VER+"\nЯдро: ON\nПамять: "+memAll().length+"\nSeal: "+sealsAll().length+"\nWebLLM: "+(cortexReady()?"ON":"OFF")+"\nКонтур: найти→понять→кандидаты→коллапс→seal\naksilove@internet.ru";
}

function showTab(name){
  document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="p-"+name)});
  document.querySelectorAll(".tab[data-tab], .bnav button[data-tab]").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-tab")===name)});
  if(name==="sup")renderSup();
  if(name==="mem")renderMem();
  if(name==="seal")renderSeals();
  if(name==="sys")renderSys();
}

async function ensureCortex(){
  status("Загрузка WebLLM…");
  if(!window.AKSI_WEBLLM){
    await new Promise(function(res,rej){
      var s=document.createElement("script");
      s.src="/aksi-webllm.js?v=6";
      s.onload=res;s.onerror=function(){rej(new Error("скрипт WebLLM"))};
      document.head.appendChild(s);
    });
  }
  if(!window.AKSI_WEBLLM)throw new Error("WebLLM не загрузился");
  if(AKSI_WEBLLM.autoLoad)await AKSI_WEBLLM.autoLoad(function(info){
    status(typeof info==="string"?info:(info&&(info.text||info.progress))||"загрузка…");
  });
  else if(AKSI_WEBLLM.load)await AKSI_WEBLLM.load(null,function(){});
  status(cortexReady()?"Кора готова":"Кора не поднялась (WebGPU?)");
  return cortexReady();
}

function boot(){
  if(!$("go"))return;
  if($("ver"))$("ver").textContent="АКСИ "+VER;
  $("go").onclick=function(){ask()};
  if($("q"))$("q").addEventListener("keydown",function(e){if(e.key==="Enter")ask()});
  document.querySelectorAll("[data-q]").forEach(function(b){b.onclick=function(){ask(b.getAttribute("data-q"))}});
  document.querySelectorAll(".tab[data-tab], .bnav button[data-tab]").forEach(function(t){
    t.onclick=function(){showTab(t.getAttribute("data-tab"))};
  });
  if($("memSave"))$("memSave").onclick=function(){
    var v=($("memIn")&&$("memIn").value||"").trim();if(!v)return;
    ask(/^запомни/i.test(v)?v:"запомни: "+v);
    if($("memIn"))$("memIn").value="";
    showTab("mem");
  };
  if($("memClear"))$("memClear").onclick=function(){
    if(confirm("Очистить память?")){memWrite([]);renderMem()}
  };
  if($("cortexBtn"))$("cortexBtn").onclick=async function(){
    var btn=$("cortexBtn");btn.disabled=true;
    try{
      var ok=await ensureCortex();
      btn.textContent=ok?"Кора ON":"Кора сбой";
    }catch(e){status("Кора: "+(e.message||e));btn.textContent="Кора сбой"}
    finally{btn.disabled=false;renderSys()}
  };
}
if(typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
}
if(typeof window!=="undefined")window.AKSI={version:VER,think:fullThink,ask:ask};
})();
