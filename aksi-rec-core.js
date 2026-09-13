/* ── math / crypto ── */
const C=(re=0,im=0)=>({re,im});
const cadd=(a,b)=>C(a.re+b.re,a.im+b.im);
const cmul=(a,b)=>C(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
const cconj=a=>C(a.re,-a.im);
const cabs2=a=>a.re*a.re+a.im*a.im;
const fromPolar=(r,p)=>C(r*Math.cos(p),r*Math.sin(p));
async function sha256(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function toHex(buf){return[...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function fromHex(h){const a=new Uint8Array(h.length/2);for(let i=0;i<a.length;i++)a[i]=parseInt(h.substr(i*2,2),16);return a.buffer;}

/* ── IndexedDB ── */
const DB="aksi-ask-v14";
function idb(fn){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("s"))d.createObjectStore("s");if(!d.objectStoreNames.contains("mem"))d.createObjectStore("mem",{keyPath:"id",autoIncrement:true});};r.onsuccess=()=>fn(r.result,res,rej);r.onerror=()=>rej(r.error);});}
const storeGet=k=>idb((d,res,rej)=>{const q=d.transaction("s").objectStore("s").get(k);q.onsuccess=()=>res(q.result??null);q.onerror=()=>rej(q.error);});
const storeSet=(k,v)=>idb((d,res,rej)=>{const q=d.transaction("s","readwrite").objectStore("s").put(v,k);q.onsuccess=()=>res();q.onerror=()=>rej(q.error);});
const memAdd=e=>idb((d,res,rej)=>{const q=d.transaction("mem","readwrite").objectStore("mem").add(e);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});
const memAll=()=>idb((d,res,rej)=>{const q=d.transaction("mem").objectStore("mem").getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error);});
const memClr=()=>idb((d,res,rej)=>{const q=d.transaction("mem","readwrite").objectStore("mem").clear();q.onsuccess=()=>res();q.onerror=()=>rej(q.error);});
const memPut=e=>idb((d,res,rej)=>{const q=d.transaction("mem","readwrite").objectStore("mem").put(e);q.onsuccess=()=>res();q.onerror=()=>rej(q.error);});

let kp=null,pub="—",prev=null,lastR=null,lastC="",busy=false,memories=[];
let lastQA=null;

async function keys(){
  try{const st=await storeGet("ed");if(st?.p&&st?.s){kp={publicKey:await crypto.subtle.importKey("raw",fromHex(st.p),{name:"Ed25519"},true,["verify"]),privateKey:await crypto.subtle.importKey("pkcs8",fromHex(st.s),{name:"Ed25519"},true,["sign"])};pub=st.p;return;}}catch(e){}
  try{kp=await crypto.subtle.generateKey({name:"Ed25519"},true,["sign","verify"]);pub=toHex(await crypto.subtle.exportKey("raw",kp.publicKey));await storeSet("ed",{p:pub,s:toHex(await crypto.subtle.exportKey("pkcs8",kp.privateKey))});}catch(e){pub="n/a";kp=null;}
}
async function sign(bytes){if(!kp)return"no-key";return toHex(await crypto.subtle.sign({name:"Ed25519"},kp.privateKey,bytes));}
async function verify(hex,bytes){if(!kp||hex==="no-key")return false;try{return await crypto.subtle.verify({name:"Ed25519"},kp.publicKey,fromHex(hex),bytes);}catch(e){return false;}}
function aksiScore(A,I,S,n){return +(A*I*S*(1+0.4*Math.sqrt(Math.max(0,n)))).toFixed(4);}
function sealedCount(){return memories.filter(m=>m.kind==="seal"||m.engine&&m.engine!=="Teach").length;}

const KB=[
  {k:["что такое акси","кто ты","что ты","я акси"],a:"АКСИ — полезный локальный интеллект: отвечает, может отказать (DEFERRED), учится у вас («запомни», «верно/неверно»), выдаёт Decision Receipt для offline-проверки. Не AGI. Данные на вашем устройстве. aksilove@internet.ru"},
  {k:["акси"],a:"АКСИ — browser-first слой решения: gate → seal → память. Без обязательного сервера. aksilove@internet.ru"},
  {k:["доверие к ии","доверие"],a:"Доверие к ИИ — не «красивый текст», а проверяемость: источник, правило, право отказать, receipt. Fluency ≠ evidence."},
  {k:["привет","здравств","hello","добрый"],a:"Здравствуйте. Я АКСИ — локальный помощник. Спросите факт или совет по структуре; «запомни: …» сохранит у вас; после ответа — «верно» / «неверно». Важные решения сверяйте с специалистом."},
  {k:["помощ","как пользоват","что умееш","инструкц"],a:"Как пользоваться АКСИ:\n1) Задайте вопрос.\n2) Если ответ верен — «верно»; если нет — «неверно» или «исправь: правильный текст».\n3) «запомни: факт» — сохранится локально.\n4) Receipt — скачать доказательство решения.\n5) /verify.html — проверить receipt offline."},
  {k:["войн","толст","войну и мир","война и мир"],a:"Роман «Война и мир» написал Лев Николаевич Толстой (1863–1869)."},
  {k:["планет","солнечн"],a:"В Солнечной системе 8 планет: Меркурий, Венера, Земля, Марс, Юпитер, Сатурн, Уран, Нептун. Плутон с 2006 — карликовая планета."},
  {k:["небо","голуб","рэлея"],a:"Небо кажется голубым из‑за рассеяния Рэлея: короткие (синие) волны рассеиваются сильнее. На закате путь света длиннее — преобладает красный."},
  {k:["блокчейн","blockchain"],a:"Блокчейн — цепочка блоков, связанных криптографическими хешами. Чтобы переписать историю, нужно пересчитать последующие блоки."},
  {k:["нейронн","нейросет"],a:"Нейросеть — слои связанных узлов с весами. LLM предсказывают следующий токен по статистике текста; это не сознание и не гарантия истины."},
  {k:["борщ"],a:"Борщ: свёкла, капуста, картофель, морковь, лук, томат/паста, бульон, чеснок, зелень. Часто со сметаной. Рецепты различаются по регионам."},
  {k:["искусственн интеллект","что такое ии"],a:"ИИ — системы, решающие задачи, обычно требующие интеллекта. Современные чат-модели — статистика языка. Их стоит проверять на фактах и не подставлять под ответственность без человека."},
  {k:["борн","суперпозиц"],a:"Правило Борна: вероятность ∝ |амплитуда|². В АКСИ — способ калибровать выбор кандидатов, не квантовый компьютер."},
  {k:["оффлайн","offline"],a:"Ядро АКСИ работает offline. Сеть нужна только если тянуть внешние справки (например Wikipedia). Память и receipt — локально."},
  {k:["памят","запомни","обуч"],a:"Память АКСИ: «запомни: факт», ALLOWED-ответы, «верно»/«неверно»/«исправь:». Всё в IndexedDB на вашем устройстве — не на чужом сервере."},
  {k:["подпись","ed25519","receipt","квитанц"],a:"Decision Receipt — JSON с Ed25519-подписью: вопрос, ALLOWED/DEFERRED, ответ, источники, цепочка. Проверка на /verify.html без сервера АКСИ."},
  {k:["земл"],a:"Земля — третья планета от Солнца; год ≈ 365,25 суток, сутки ≈ 24 часа."},
  {k:["формул","рекурс"],a:"AKSI = (A×I×S)×(1+0.4√n). n растёт с sealed/усвоенными ответами. Это инженерный сигнал качества цикла, не «магия»."},
  {k:["самообуч","self.?learn"],a:"Ограниченное самообучение: ALLOWED → память; «верно» ↑ вес; «неверно» ↓; «исправь:» замена. Веса нейросети модели не трогаются — только ваш локальный журнал."},
  {k:["парол","безопасн парол"],a:"Надёжный пароль: длинный (12+), уникальный для каждого сервиса, менеджер паролей, без повторов имени/даты. Включите 2FA где можно."},
  {k:["фишинг","мошенни"],a:"Фишинг: не переходите по срочным ссылкам из почты/мессенджера, не вводите пароль на подозрительных доменах, сверяйте адрес сайта. Банк не просит пароль в чате."},
  {k:["152-фз","персональн данн","пдн"],a:"152-ФЗ: персональные данные граждан РФ. При сборе/хранении важны законное основание, меры защиты, локализация первичных баз в РФ. За юридической оценкой — к специалисту."},
  {k:["первая помощ","неотложн"],a:"При угрозе жизни — 103 (скорая) / 112. Кровотечение: прямое давление на рану. Сознание потеряно: проверьте дыхание, при необходимости реанимация по актуальным протоколам. Это не замена обучению первой помощи."},
  {k:["вода","пить вод"],a:"Ориентир для многих взрослых: пить по жажде, обычно порядка 1,5–2 л жидкости в сутки с учётом еды и климата. При болезни/нагрузке — индивидуально; при ограничениях врача — слушайте врача."},
  {k:["сон","высыпа"],a:"Взрослым часто нужно 7–9 часов сна. Регулярный режим, меньше экрана перед сном, тёмная прохладная комната помогают. Хроническая бессонница — повод к врачу, не только к советам из чата."},
  {k:["налог","ндфл","вычет"],a:"В РФ базовый НДФЛ для резидентов часто 13% (с нюансами прогрессии и исключений). Вычеты (обучение, лечение, ипотека и др.) — по правилам ФНС. Для вашей ситуации — бухгалтер или личный кабинет nalog.ru."},
  {k:["резюме","собеседован"],a:"Резюме: 1 страница (или 2 при опыте), конкретика «задача → действие → результат», цифры где можно, без воды. На собеседовании готовьте 2–3 примера по STAR. Не приукрашивайте проверяемое."},
  {k:["английск","учить язык"],a:"Язык: каждый день понемногу лучше, чем редко помногу. Активный ввод (говорить/писать) + понятный вход (слушать/читать чуть выше уровня). Приложение не заменяет живую практику."},
  {k:["критическ мышлен","провер факт"],a:"Проверка факта: первичный источник, дата, кто выигрывает от утверждения, альтернативные версии. ИИ может ошибаться уверенно — сверяйте важное."},
  {k:["отказать","deferred","не знаю"],a:"АКСИ может ответить DEFERRED: данных мало или есть конфликт. Отказ — нормальная часть полезного интеллекта, не баг. Лучше честный отказ, чем красивая выдумка."},
  {k:["полезн интеллект","зачем акси"],a:"Полезный интеллект для людей: (1) ясный ответ или честный отказ, (2) память, которой вы управляете, (3) след решения (receipt), (4) без обязательной отправки ваших данных в облако."}
];

function localAnswer(q){
  const s=q.toLowerCase().replace(/ё/g,"е");
  let best=null,score=0;
  for(const row of KB){
    let sc=0;
    for(const k of row.k){ if(s.includes(k)) sc+=k.length*(k.includes(" ")?2.5:1.3); }
    if(/акси/.test(s)&&row.k.some(k=>/акси/.test(k))) sc+=25;
    if(sc>score){score=sc;best=row;}
  }
  if(best&&score>=4) return {text:best.a,score:Math.min(0.98,0.65+score/45)};
  return null;
}

function memHits(q, limit=5){
  const s=q.toLowerCase().replace(/ё/g,"е");
  const words=s.split(/\s+/).filter(w=>w.length>2);
  if(!words.length) return [];
  const scored=[];
  for(const m of memories){
    if(!(m.a||"").length>8) continue;
    const tq=((m.q||"")).toLowerCase();
    const ta=((m.a||"")).toLowerCase();
    const t=tq+" "+ta;
    let h=0;
    for(const w of words) if(t.includes(w)) h++;
    let bodyHit=0;
    if(m.kind==="teach"||m.kind==="correct"){
      for(const w of words) if(ta.includes(w)) bodyHit++;
    }
    if(h<1 && bodyHit<1) continue;
    const wgt=+(m.w||1);
    const boost=m.kind==="teach"?1.55:m.kind==="correct"?1.7:m.kind==="seal"?1.2:1;
    const penalty=m.kind==="wrong"?0.3:1;
    const score=(h+bodyHit*0.8+0.55*Math.min(4,wgt))*boost*penalty;
    scored.push({text:m.a, score, q:m.q, w:wgt, kind:m.kind||"seal", id:m.id});
  }
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0,limit);
}

function relevance(text,q){
  const stop=new Set(["что","такое","это","как","для","или","the","a","an","is","of","to","and","кто","почему","зачем"]);
  const words=q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2&&!stop.has(w));
  if(!words.length) return 0.4;
  const t=text.toLowerCase();
  let hit=0; for(const w of words) if(t.includes(w)) hit++;
  let r=hit/words.length;
  if(/акси/.test(q.toLowerCase())&&/аксиом/.test(t)&&!/runtime|offline|подпис|рекурс/.test(t)) r*=0.08;
  return r;
}

function searchSeed(q){
  let s=q.replace(/[?!.]+$/g,"").trim();
  s=s.replace(/^(что такое|что значит|кто такой|кто написал|объясни|расскажи про|расскажи о|почему|зачем|как|сколько|what is|who)\s+/i,"");
  return s.slice(0,80)||q.slice(0,60);
}

async function fetchWikiMulti(q, signal){
  const seed=searchSeed(q);
  const out=[];
  for(const lang of ["ru","en"]){
    try{
      const os=`https://${lang}.wikipedia.org/w/api.php?action=opensearch&limit=4&namespace=0&format=json&origin=*&search=${encodeURIComponent(seed)}`;
      const r=await fetch(os,{signal});
      if(!r.ok) continue;
      const data=await r.json();
      for(const title of (data?.[1]||[]).slice(0,4)){
        try{
          const sr=await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,{signal});
          if(!sr.ok) continue;
          const j=await sr.json();
          if(!j.extract) continue;
          const rel=relevance(j.extract+" "+title,q);
          if(rel>=0.25) out.push({text:j.extract.slice(0,420), title, lang, rel, engine:"Wikipedia/"+lang});
        }catch(e){if(e.name==="AbortError") throw e;}
      }
    }catch(e){if(e.name==="AbortError") throw e;}
  }
  out.sort((a,b)=>b.rel-a.rel);
  const uniq=[];
  for(const x of out){
    if(uniq.some(u=>u.text.slice(0,60)===x.text.slice(0,60))) continue;
    uniq.push(x);
    if(uniq.length>=4) break;
  }
  return uniq;
}

function synthesize(q, parts){
  if(!parts.length){
    return {text:"По запросу «"+q.slice(0,90)+"» нет надёжных фрагментов. Добавьте факт: запомни: …", engine:"Guide", eqs:0.35};
  }
  const local=parts.find(p=>p.engine==="Local KB");
  const web=parts.filter(p=>String(p.engine).startsWith("Wikipedia"));
  const mem=parts.filter(p=>p.engine==="Memory");
  const strongMem=mem.find(m=>m.score>=2.2 || (m.w||0)>=2);
  if(strongMem && strongMem.score>=2.0){
    return {text:strongMem.text, engine:"Memory+", eqs:Math.min(0.97,0.72+0.06*Math.min(4,strongMem.w||1)), sources:["Memory"]};
  }
  if(local && local.score>=0.75 && (!web.length || (web[0].rel||0)<0.55)){
    return {text:local.text, engine:"Local KB", eqs:local.score||0.9, sources:["Local KB"]};
  }
  const chunks=[], sources=[];
  if(local){ chunks.push(local.text); sources.push("Local KB"); }
  for(const m of mem.slice(0,2)){
    if(!chunks.some(c=>c.includes(m.text.slice(0,40)))){ chunks.push(m.text); sources.push("Memory"); }
  }
  for(const w of web.slice(0,2)){
    const t=w.text.replace(/\s+/g," ").trim();
    if(t.length<40) continue;
    if(chunks.some(c=>c.slice(0,50)===t.slice(0,50))) continue;
    chunks.push(t); sources.push(w.engine);
  }
  if(!chunks.length) chunks.push(parts[0].text);
  let text=chunks[0];
  if(chunks[1] && chunks[1].length>40 && !text.includes(chunks[1].slice(0,30))) text+="\n\n"+chunks[1];
  if(chunks[2] && chunks[2].length>40 && text.length<500 && !text.includes(chunks[2].slice(0,30))) text+="\n\n"+chunks[2];
  text=text.slice(0,900);
  const eqs=Math.min(0.95, 0.45 + 0.15*Math.min(chunks.length,3) + 0.2*(local?1:0) + 0.12*(mem.length?1:0) + 0.1*(web[0]?.rel||0));
  return {text, engine:sources.length>1?"Synthesis":(sources[0]||"Guide"), eqs, sources};
}

function adia(c,q){
  const rel=relevance(c.text,q);
  const src=c.src||0.5;
  const coh=Math.min(1,c.text.length/180);
  const memB=c.mem||0.4;
  return {...c, eqs:Math.min(0.98,0.36*rel+0.26*src+0.18*coh+0.20*memB), rel, coh};
}

function calibrate(cands,q){
  const lambda=0.35,cfW=0.12;
  const seed=Array.from(q).reduce((h,c)=>((h*31+c.charCodeAt(0))>>>0),0)%1000/1000;
  const prep=cands.map((c,i)=>{
    const align=((c.mem||0.5)+(c.src||0.5)+(c.coh||0.5)+(c.spe||0.6))/4;
    const P=Math.max(1e-12,c.eqs);
    const phi=Math.PI*(1-align)*lambda+Math.PI*seed*0.05*lambda;
    const a=cadd(fromPolar(Math.sqrt(P),phi),fromPolar(Math.sqrt(P*cfW*(0.4+0.6*(1-align))),phi+Math.PI/2));
    return {i,c,eqs:c.eqs,P,phi,a};
  });
  const sumP=prep.reduce((s,x)=>s+x.P,0);
  prep.forEach(x=>x.Pc=x.P/sumP);
  const raw=prep.map(xi=>{
    let s=cabs2(xi.a);
    for(const xj of prep) if(xj.i!==xi.i) s+=lambda*2*cmul(xi.a,cconj(xj.a)).re;
    return Math.max(1e-12,s);
  });
  const S=raw.reduce((a,b)=>a+b,0);
  const pQ=raw.map(v=>v/S);
  let best=0; for(let i=1;i<pQ.length;i++) if(pQ[i]>pQ[best]) best=i;
  return {prep,pQ,best};
}
