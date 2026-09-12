const msgs=document.getElementById("msgs");
function add(role,text,meta=""){
  const d=document.createElement("div");
  d.className="msg "+role;
  d.appendChild(document.createTextNode(text));
  if(meta){const m=document.createElement("div");m.className="meta";m.innerHTML=meta;d.appendChild(m);}
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
}
function pipe(n,st){document.querySelectorAll("#pipe .s").forEach(el=>{if(el.dataset.s===String(n)){el.classList.remove("on","done");el.classList.add(st);}});}
function pipeReset(){document.querySelectorAll("#pipe .s").forEach(el=>el.classList.remove("on","done"));}

function refreshXP(){
  const n=sealedCount();
  document.getElementById("nXP").textContent=String(n);
  const sc=aksiScore(0.9,0.85,0.9,n);
  document.getElementById("aksiScore").textContent=sc;
  document.getElementById("memN").textContent="memory: "+memories.length;
  renderMemPanel();
}

/** Visible memory — last learned / sealed items */
function renderMemPanel(){
  const el=document.getElementById("memList");
  if(!el) return;
  const useful=memories
    .filter(m=>m.kind!=="wrong" && (m.a||"").length>8)
    .slice()
    .sort((a,b)=>(b.ts||0)-(a.ts||0))
    .slice(0,8);
  if(!useful.length){ el.innerHTML='<div class="hint">Пока пусто. «запомни: …» или ALLOWED-ответ.</div>'; return; }
  el.innerHTML=useful.map(m=>{
    const kind=m.kind||"seal";
    const w=+(m.w||1);
    const badge=kind==="teach"?"LEARN":kind==="correct"?"FIX":kind==="seal"?"SEAL":kind;
    const preview=(m.a||"").slice(0,72)+(m.a&&m.a.length>72?"…":"");
    return `<div class="cand" style="border-color:${kind==="teach"||kind==="correct"?"#a78bfa":"#456"}"><span class="badge learn">${badge}</span> w=${w.toFixed(1)}<br>${preview}</div>`;
  }).join("");
}

/** Extract searchable key from a taught fact */
function factKey(text){
  const stop=new Set(["это","для","или","как","что","the","a","an","is","of","to","and","является","называется"]);
  const words=text.toLowerCase().replace(/ё/g,"е").split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2&&!stop.has(w));
  return words.slice(0,6).join(" ")||text.slice(0,40);
}

/* ── recursive learn ops ── */
async function teach(fact){
  const text=fact.trim();
  if(text.length<3){ add("bot","Пустой факт."); return; }
  const key=factKey(text);
  await memAdd({q:key, a:text, engine:"Teach", kind:"teach", w:2.5, ts:Date.now()});
  memories=await memAll();
  refreshXP();
  add("bot","Усвоено локально (teach):\n"+text+"\n\nКлюч поиска: «"+key+"»",
    `<span class="badge learn">LEARN</span>`);
}

async function feedback(ok){
  if(!lastQA){ add("bot","Нет предыдущего ответа для оценки. Сначала задайте вопрос."); return; }
  if(ok){
    const w=(lastQA.w||1)+1.5;
    await memAdd({q:lastQA.q, a:lastQA.a, engine:lastQA.engine||"Feedback", kind:"correct", w, ts:Date.now()});
    // also boost any existing similar teach/seal entries
    for(const m of memories){
      if(m.kind==="wrong") continue;
      if((m.a||"")===lastQA.a || ((m.q||"")===lastQA.q && (m.a||"").slice(0,40)===(lastQA.a||"").slice(0,40))){
        m.w=Math.min(5, +(m.w||1)+1);
        m.kind=m.kind==="teach"?"teach":"correct";
        try{ await memPut(m); }catch(e){}
      }
    }
    memories=await memAll();
    lastQA={...lastQA, w};
    refreshXP();
    add("bot","Принято: ответ усилен (w↑). Похожие вопросы будут приоритетнее брать этот факт.",
      `<span class="badge ok">+LEARN</span>`);
  }else{
    await memAdd({q:lastQA.q, a:lastQA.a, engine:"Feedback", kind:"wrong", w:0.15, ts:Date.now()});
    memories=await memAll();
    refreshXP();
    add("bot","Отмечено как неверно (w↓). Сразу можно: исправь: правильный текст",
      `<span class="badge no">−LEARN</span>`);
  }
}

async function correct(text){
  if(!lastQA){ add("bot","Нет ответа для исправления."); return; }
  const t=text.trim();
  if(t.length<3){ add("bot","Пустое исправление."); return; }
  await memAdd({q:lastQA.q, a:t, engine:"Correct", kind:"correct", w:3.5, ts:Date.now()});
  await memAdd({q:lastQA.q, a:lastQA.a, engine:"Superseded", kind:"wrong", w:0.1, ts:Date.now()});
  memories=await memAll();
  lastQA={q:lastQA.q, a:t, engine:"Correct", w:3.5};
  refreshXP();
  add("bot","Исправление записано. Рекурсия: этот ответ будет сильнее при похожих вопросах.\n\n"+t,
    `<span class="badge learn">CORRECT</span>`);
}

let abort=null;

async function ask(){
  if(busy) return;
  const raw=document.getElementById("q").value.trim();
  if(!raw) return;

  const teachM=raw.match(/^\s*запомни\s*:\s*(.+)$/i);
  const corrM=raw.match(/^\s*исправь\s*:\s*(.+)$/i);
  const okM=/^\s*(верно|правильно|ок|ok|\+1|👍)\s*$/i.test(raw);
  const badM=/^\s*(неверно|неправильно|ошибка|\-1|👎)\s*$/i.test(raw);

  document.getElementById("q").value="";
  add("user",raw);

  if(teachM){ await teach(teachM[1]); return; }
  if(corrM){ await correct(corrM[1]); return; }
  if(okM){ await feedback(true); return; }
  if(badM){ await feedback(false); return; }

  busy=true;
  document.getElementById("send").disabled=true;
  pipeReset();
  if(abort) abort.abort();
  abort=new AbortController();
  const signal=abort.signal;
  const q=raw;

  try{
    pipe(1,"on");
    document.getElementById("mode").textContent="источники + memory…";
    const loc=localAnswer(q);
    const mems=memHits(q,5);
    let wiki=[];
    const isSelf=/акси|aksi|кто ты|что ты/.test(q.toLowerCase());
    if(navigator.onLine!==false && !isSelf){
      wiki=await fetchWikiMulti(q, signal);
    }
    pipe(1,"done"); pipe(2,"on");
    document.getElementById("mode").textContent="синтез…";

    const parts=[];
    if(loc) parts.push({engine:"Local KB", text:loc.text, score:loc.score, src:0.96, mem:0.9, spe:0.9});
    for(const m of mems) parts.push({engine:"Memory", text:m.text, score:m.score, w:m.w, src:0.78, mem:0.98, spe:0.85});
    for(const w of wiki) parts.push({engine:w.engine, text:w.text, score:0.5+w.rel*0.4, rel:w.rel, src:0.88, mem:0.4, spe:0.75});

    const syn=synthesize(q, parts.map(p=>({...p, rel:p.rel||relevance(p.text,q)})));
    let cands=[{engine:syn.engine, text:syn.text, src:0.9, mem:0.75, spe:0.85, eqs:syn.eqs}];
    if(loc && loc.text!==syn.text) cands.push({engine:"Local KB", text:loc.text, src:0.96, mem:0.9, spe:0.9});
    if(mems[0] && mems[0].text!==syn.text) cands.push({engine:"Memory", text:mems[0].text, src:0.82, mem:0.98, spe:0.88});
    else if(wiki[0] && wiki[0].text!==syn.text) cands.push({engine:wiki[0].engine, text:wiki[0].text, src:0.88, mem:0.4, spe:0.75});
    while(cands.length<3) cands.push({engine:"Conservative", text:"При слабых данных АКСИ не выдаёт непроверяемое за факт (DEFERRED).", src:0.4, mem:0.3, spe:0.35});
    cands=cands.slice(0,3).map(c=>adia(c,q));

    document.getElementById("cands").innerHTML=cands.map((c,i)=>`<div class="cand" style="border-color:${['#2d6dff','#4ade80','#fb923c'][i]}"><b>${c.engine}</b> EQS ${c.eqs.toFixed(2)}<br>${c.text.slice(0,100)}…</div>`).join("");
    const mode=parts.some(p=>String(p.engine).startsWith("Wikipedia"))?"hybrid":(mems.length?"memory-first":"local");
    document.getElementById("mode").textContent=mode+(navigator.onLine!==false?" · online":" · offline");

    pipe(2,"done"); pipe(3,"on");
    const cal=calibrate(cands,q);
    let choice=cal.best;
    const synIdx=cal.prep.findIndex(p=>/Synthesis|Local KB|Memory/.test(p.c.engine));
    if(synIdx>=0 && cal.prep[synIdx].eqs>=0.65) choice=synIdx;
    // Prefer strong Memory hit if score is high
    const memIdx=cal.prep.findIndex(p=>p.c.engine==="Memory");
    if(memIdx>=0 && mems[0] && mems[0].score>=3.2 && cal.prep[memIdx].eqs>=0.7) choice=memIdx;
    pipe(3,"done"); pipe(4,"on");

    const chosen=cal.prep[choice];
    const pq=cal.pQ[choice];
    const decision=(pq>=0.34||(chosen.Pc>=0.4&&chosen.eqs>=0.68))?"ALLOWED":"DEFERRED";
    document.getElementById("dec").textContent=decision+" · "+pq.toFixed(3);
    document.getElementById("dec").style.color=decision==="ALLOWED"?"var(--green)":"var(--red)";

    const n=sealedCount();
    const body={
      query:q, decision, final_answer:chosen.c.text, confidence:+pq.toFixed(6),
      engine:chosen.c.engine, eqs:chosen.eqs, mode, n,
      aksi:aksiScore(0.9, chosen.eqs, 0.9, n),
      sources:syn.sources||[chosen.c.engine],
      prev_receipt_hash:prev, public_key:pub, timestamp:new Date().toISOString()
    };
    lastC=JSON.stringify(body);
    body.signature=await sign(new TextEncoder().encode(lastC));
    lastR=body;
    prev=await sha256(JSON.stringify(body));
    document.getElementById("sig").textContent=(body.signature||"").slice(0,40)+"…";
    document.getElementById("aksiScore").textContent=body.aksi;

    lastQA={q, a:chosen.c.text, engine:chosen.c.engine, w:1};

    if(decision==="ALLOWED"){
      await memAdd({q, a:chosen.c.text, engine:chosen.c.engine, kind:"seal", w:1, ts:Date.now()});
      memories=await memAll();
      refreshXP();
    }
    pipe(4,"done");
    const meta=`<span class="badge ${decision==="ALLOWED"?"ok":"no"}">${decision}</span><span class="badge">${chosen.c.engine}</span>P_q ${pq.toFixed(3)} · n=${n}`;
    add("bot",chosen.c.text,meta);
  }catch(e){
    if(e.name!=="AbortError") add("bot","Ошибка: "+(e.message||e));
  }
  busy=false;
  document.getElementById("send").disabled=false;
  document.getElementById("q").focus();
}

document.getElementById("send").onclick=ask;
document.getElementById("q").addEventListener("keydown",e=>{if(e.key==="Enter")ask();});
document.querySelectorAll("#presets [data-q]").forEach(b=>b.onclick=()=>{document.getElementById("q").value=b.getAttribute("data-q");ask();});
document.getElementById("btnV").onclick=async()=>{if(!lastR||!lastC)return alert("Нет receipt");alert((await verify(lastR.signature,new TextEncoder().encode(lastC)))?"VALID ✓":"INVALID");};
document.getElementById("btnD").onclick=()=>{if(!lastR)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(lastR,null,2)],{type:"application/json"}));a.download="aksi-receipt.json";a.click();};
document.getElementById("btnM").onclick=async()=>{if(confirm("Очистить память?")){await memClr();memories=[];lastQA=null;refreshXP();}};

(async()=>{
  await keys();
  memories=await memAll();
  refreshXP();
  add("bot","АКСИ Recursive v1.5\n\nЦикл:\nвопрос → источники+память → синтез → ADIA → seal\n→ (ALLOWED) память\n→ «верно»/«неверно»/«исправь:» усиливают или правят\n→ следующие ответы используют усиленное\n\nПанель «Память» справа показывает усвоенное.\nФормула: AKSI=(A×I×S)×(1+0.4√n)\nНе AGI — проверяемый bounded self-learning.\naksilove@internet.ru");
})();
