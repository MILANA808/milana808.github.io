(function () {
  "use strict";
  const DID = "did:aksi:ed25519:sovereign-2026";
  const CONTACT = "aksilove@internet.ru";
  const HIST = "AKSI_APP_CHAT_V2";
  const NOTES = "AKSI_PRO_NOTES_V1";
  const LEDGER = "AKSI_COGNITIVE_LEDGER_V1";
  let lastAnswer = "";
  let lastEvidence = null;

  const KB = [
    { k:["кто ты","что такое акси","aksi","акси"], a:"АКСИ — персональный когнитивный контур: чат, память, Studio, статус, Lab и Trust Console. Её принцип: не просить верить, а показывать проверяемые основания." },
    { k:["studio","студи","vfs"], a:"Studio — производство страниц через внутреннюю файловую систему браузера. Полный экран: /studio/." },
    { k:["pulse","пульс","статус","health"], a:"Status/Pulse выполняет живой HTTP-скан опубликованных модулей и считает score по фактически доступным endpoint'ам." },
    { k:["kernel","ядро","эволюц"], a:"Kernel: observe → propose → critique → human confirm. Автоматическая модификация продакшена без человеческого подтверждения не является целью АКСИ." },
    { k:["lab","крипто","агент"], a:"Lab — экспериментальная зона для криптографии, агентов и квантовых визуализаций." },
    { k:["лиценз","license","apache"], a:"Лицензия: Apache License 2.0 — /LICENSE и /NOTICE." },
    { k:["контакт","email","связ"], a:"Контакт: " + CONTACT },
    { k:["did","идентич"], a:"Публичный software DID: " + DID + ". Это идентичность программного контура, не паспорт человека." },
    { k:["доказ","proof","чест","verify","провер"], a:"Trust Console создаёт локальное evidence: canonical payload, SHA-256 и связь с предыдущим событием. Важно: hash доказывает целостность данных, но сам по себе не доказывает истинность утверждения." },
    { k:["памят","memory"], a:"Публичный интерфейс использует локальное хранилище браузера. Это не означает, что весь backend или будущие модели работают локально — границы доверия должны быть проверяемыми." },
    { k:["квант","кубит","bell","запутан"], a:"Квантовые эксперименты доступны через /quantum/ и Lab." },
    { k:["оффер","пилот","сделк","пакет"], a:"Коммерческий пакет и due diligence: /offer/." },
    { k:["архитектур","как устроен","стек"], a:"UI → local storage → provenance/ledger → optional backend/model. Trust Console отделяет вычисленное от заявленного и не называет непроверенное verified." },
    { k:["помощ","help","умеешь","команд"], a:"Разделы: Обзор, Чат, Studio, Статус, Trust, Lab, Pro. Напишите proof, checklist или задайте вопрос об архитектуре." }
  ];

  function $(id){ return document.getElementById(id); }
  function stable(value){
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k)+":"+stable(value[k])).join(",") + "}";
  }
  async function digest(text){
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  function readLedger(){ try{return JSON.parse(localStorage.getItem(LEDGER)||"[]");}catch{return [];} }
  function writeLedger(v){ localStorage.setItem(LEDGER, JSON.stringify(v)); updateLedgerUI(); }
  function answer(q){
    const s=(q||"").toLowerCase().trim();
    if (/^proof$|доказательств|evidence/i.test(s)) return "Откройте Trust Console → Evidence generator. Введите утверждение, создайте запись и затем проверьте цепочку. Статус новых утверждений — unverified, пока внешняя проверка не выполнена.";
    if (/checklist|чеклист|практик/i.test(s)) return "Чеклист АКСИ:\n1) Status: реальные endpoints\n2) Trust: создать evidence\n3) Verify: проверить ledger\n4) Studio: воспроизводимо создать страницу\n5) Найти одно ложное/неподтверждённое утверждение и исправить его.";
    for(const row of KB) if(row.k.some(x=>s.includes(x))) return row.a;
    return "Не нашла точный шаблон. Спросите про: Trust, provenance, memory, архитектуру, статус, Studio или напишите «proof».";
  }
  function showView(name){
    document.querySelectorAll(".view").forEach(v=>v.classList.toggle("on",v.dataset.view===name));
    document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("on",b.dataset.nav===name));
    if(name==="studio"){const f=$("studioFrame");if(f&&!f.src)f.src="/studio/?embed=1";}
    if(name==="lab"){const f=$("labFrame");if(f&&!f.src)f.src="/lab/";}
    if(name==="trust") updateLedgerUI();
    try{localStorage.setItem("AKSI_LAST_VIEW",name);}catch{}
  }
  function addBubble(role,text,meta){
    const log=$("chatLog"); if(!log)return;
    const d=document.createElement("div"); d.className="bubble "+(role==="user"?"user":"bot"); d.textContent=text;
    if(meta){const m=document.createElement("div");m.className="meta";m.textContent=meta;d.appendChild(m);}
    log.appendChild(d);log.scrollTop=1e9;
  }
  function saveChat(role,text,meta){try{const h=JSON.parse(localStorage.getItem(HIST)||"[]");h.push({role,text,meta});localStorage.setItem(HIST,JSON.stringify(h.slice(-50)));}catch{}}
  function loadChat(){try{JSON.parse(localStorage.getItem(HIST)||"[]").forEach(m=>addBubble(m.role,m.text,m.meta));}catch{}}
  async function createEvidence(statement,source="local-chat",status="unverified"){
    const ledger=readLedger();
    const previous=ledger.length?ledger[ledger.length-1].event_hash:"GENESIS";
    const payload={schema:"AKSI-EVIDENCE-1",subject:statement,source,status,created_at:new Date().toISOString(),did:DID,previous_hash:previous};
    const canonical=stable(payload);
    const eventHash=await digest(canonical);
    const event={...payload,canonical,event_hash:eventHash};
    ledger.push(event); writeLedger(ledger); lastEvidence=event; return event;
  }
  async function sendChat(){
    const inp=$("chatInput"),q=(inp.value||"").trim();if(!q)return;inp.value="";
    addBubble("user",q);saveChat("user",q);
    const a=answer(q);lastAnswer=a;
    const e=await createEvidence(a,"local-chat","unverified");
    const meta="evidence "+e.event_hash.slice(0,20)+"… · status unverified";
    addBubble("bot",a,meta);saveChat("bot",a,meta);
  }
  async function verifyLedger(){
    const ledger=readLedger(); let previous="GENESIS",ok=true;
    for(const e of ledger){
      const payload={schema:e.schema,subject:e.subject,source:e.source,status:e.status,created_at:e.created_at,did:e.did,previous_hash:previous};
      const expected=await digest(stable(payload));
      if(e.previous_hash!==previous||e.event_hash!==expected||e.canonical!==stable(payload)){ok=false;break;}
      previous=e.event_hash;
    }
    const state=$("trustState"); if(state){state.textContent=ok?"VERIFIED CHAIN":"TAMPER DETECTED";state.className=ok?"verified":"danger";}
    return ok;
  }
  function updateLedgerUI(){
    const ledger=readLedger(); if($("ledgerCount"))$("ledgerCount").textContent=ledger.length+" events";
    const list=$("ledgerList"); if(!list)return;
    list.innerHTML="";
    if(!ledger.length){list.innerHTML='<div class="mono">Пока нет событий. Создайте первое evidence.</div>';return;}
    ledger.slice().reverse().forEach(e=>{
      const row=document.createElement("div");row.className="ledger-row";
      row.innerHTML='<div><span class="status-chip">'+e.status+'</span> <b>'+escapeHtml(e.subject.slice(0,110))+'</b></div><code>'+e.event_hash.slice(0,24)+'…</code><small>'+new Date(e.created_at).toLocaleString()+" · "+e.source+'</small>';
      list.appendChild(row);
    });
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async function generateEvidence(){
    const input=$("evidenceInput"),statement=(input.value||"").trim();if(!statement){input.focus();return;}
    const e=await createEvidence(statement,"user-authored","unverified");
    $("evidenceOutput").innerHTML='<div class="hash-label">CANONICAL PAYLOAD</div><code>'+escapeHtml(e.canonical)+'</code><div class="hash-label">SHA-256 EVENT HASH</div><code>'+e.event_hash+'</code><div class="hash-label">PREVIOUS</div><code>'+e.previous_hash+'</code><div class="truth-note">STATUS: unverified — запись целостна, но её содержание не объявляется истинным автоматически.</div>';
  }
  async function proveLast(){
    showView("trust");
    if(!lastAnswer){$("evidenceInput").value="Сначала задайте вопрос АКСИ в Чате.";return;}
    $("evidenceInput").value=lastAnswer;await generateEvidence();
  }
  function exportLedger(){
    const blob=new Blob([JSON.stringify({schema:"AKSI-LEDGER-EXPORT-1",did:DID,exported_at:new Date().toISOString(),events:readLedger()},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aksi-cognitive-ledger.json";a.click();URL.revokeObjectURL(a.href);
  }
  async function runStatus(){
    const paths=["/","/app.js","/app.css","/studio/","/lab/","/pulse/","/kernel/","/proof/","/offer/","/wake/","/ecosystem.json","/LICENSE","/IDENTITY.md"];
    $("stBody").innerHTML='<tr><td colspan="3" class="mono">скан…</td></tr>';
    const t0=performance.now();const rows=await Promise.all(paths.map(async p=>{const t=performance.now();try{const r=await fetch(p,{cache:"no-store"});return{p,ok:r.ok,status:r.status,ms:Math.round(performance.now()-t)};}catch{return{p,ok:false,status:0,ms:Math.round(performance.now()-t)};}}));
    const ok=rows.filter(r=>r.ok).length,score=Math.round(ok/rows.length*100);$("stOk").textContent=ok;$("stBad").textContent=rows.length-ok;$("stScore").textContent=score;$("stScore").className=score>=90?"ok":"bad";
    const dot=document.querySelector(".brand .dot");if(dot)dot.className="dot "+(score>=90?"healthy":"unhealthy");$("stBody").innerHTML="";
    rows.forEach(r=>{const tr=document.createElement("tr");tr.innerHTML='<td>'+r.p+'</td><td class="'+(r.ok?'ok':'bad')+'">'+(r.ok?'OK':'FAIL')+' '+r.status+'</td><td>'+r.ms+'</td>';$("stBody").appendChild(tr);});
    const report=stable({score,rows});$("stSig").textContent="report sha256 "+await digest(report)+" · "+Math.round(performance.now()-t0)+" ms";
  }
  function bind(){
    document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.nav)));
    document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
    $("chatSend")?.addEventListener("click",sendChat);$("chatInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();sendChat();}});
    $("btnProofAnswer")?.addEventListener("click",proveLast);$("btnStatus")?.addEventListener("click",runStatus);$("btnNewEvidence")?.addEventListener("click",generateEvidence);$("btnVerifyLedger")?.addEventListener("click",verifyLedger);$("btnExportProof")?.addEventListener("click",exportLedger);
    $("btnClearLedger")?.addEventListener("click",()=>{if(confirm("Удалить локальный cognitive ledger?")){localStorage.removeItem(LEDGER);updateLedgerUI();}});
    $("btnClearChat")?.addEventListener("click",()=>{localStorage.removeItem(HIST);$("chatLog").innerHTML="";addBubble("bot","История очищена.");});
    $("proNotes")?.addEventListener("input",()=>localStorage.setItem(NOTES,$("proNotes").value));
    $("btnExportState")?.addEventListener("click",()=>{const blob=new Blob([JSON.stringify({did:DID,chat:JSON.parse(localStorage.getItem(HIST)||"[]"),notes:localStorage.getItem(NOTES)||"",ledger:readLedger(),exported:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aksi-state.json";a.click();});
    document.addEventListener("keydown",e=>{const tag=e.target?.tagName||"";if(tag==="INPUT"||tag==="TEXTAREA")return;const map={"1":"home","2":"chat","3":"studio","4":"status","5":"trust","6":"lab","7":"pro"};if(map[e.key])showView(map[e.key]);if(e.key==="/"){e.preventDefault();showView("chat");$("chatInput")?.focus();}if(e.key.toLowerCase()==="s"){showView("status");runStatus();}});
  }
  document.addEventListener("DOMContentLoaded",()=>{bind();loadChat();if($("proNotes"))$("proNotes").value=localStorage.getItem(NOTES)||"";if($("chatLog")&&!$("chatLog").children.length)addBubble("bot","АКСИ online.\n1–7 навигация · / чат · S статус.\nTrust Console — место, где заявления получают проверяемый цифровой след.");let start=localStorage.getItem("AKSI_LAST_VIEW")||"home";showView(start);runStatus();updateLedgerUI();});
})();
