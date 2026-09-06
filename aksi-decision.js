/**
 * AKSI Decision Runtime v2.0.1 — offline decision + seal
 * Fix: await async Zero.think; pick best of KB/Zero/Neuro
 * Formula: AKSI=(A×I×S)×(1+0.4√n)
 * © AKSI · aksilove@internet.ru
 */
(function(G){
"use strict";
var VER="2.0.1-decision",CHAIN_KEY="aksi_decision_chain_v2",KNOW_KEY="aksi_decision_know_v2",GATE_TAU=0.55,GAMMA=0.4;
function now(){return Date.now()}
function uid(){return "d"+now().toString(36)+Math.random().toString(36).slice(2,6)}
function clamp01(x){x=+x;if(isNaN(x))return 0;return x<0?0:x>1?1:x}
function round(x,d){d=d==null?3:d;var p=Math.pow(10,d);return Math.round(+x*p)/p}
function load(k){try{var a=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(a)?a:[]}catch(e){return[]}}
function save(k,a){try{localStorage.setItem(k,JSON.stringify((a||[]).slice(-200)))}catch(e){}}
function tok(s){return String(s||"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu," ").split(/\s+/).filter(function(w){return w.length>1})}
function overlap(a,b){var s={},i,n=0;for(i=0;i<b.length;i++)s[b[i]]=1;for(i=0;i<a.length;i++)if(s[a[i]])n++;return a.length?n/a.length:0}
function entropy(s){s=String(s||"");if(!s)return 0;var f={},n=s.length,h=0,i,c,p;for(i=0;i<n;i++){c=s.charAt(i);f[c]=(f[c]||0)+1}for(c in f){p=f[c]/n;h-=p*Math.log2(p)}return h}
function qcli(s){s=String(s||"");if(!s)return 0;var u={},i;for(i=0;i<s.length;i++)u[s.charAt(i)]=1;var alphabet=Math.min(256,Object.keys(u).length);return clamp01(entropy(s)/Math.log2(Math.max(2,alphabet)))}
function fnv(s){var h=0x811c9dc5,i;s=String(s);for(i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return("00000000"+(h>>>0).toString(16)).slice(-8)}
function structure(s){s=String(s||"").trim();if(!s)return.2;var lines=s.split(/\n/).filter(Boolean).length,words=s.split(/\s+/).filter(Boolean).length,hasList=/[-•*]|\d\./.test(s)?.1:0;return clamp01(.35+Math.min(.4,words/80)+Math.min(.15,lines/10)+hasList)}
function maybe(v){return v&&typeof v.then==="function"?v:Promise.resolve(v)}

var KB=[
{q:["кто ты","who are you","ты кто","представься"],a:"Я АКСИ Decision Runtime — локальный агент решений. Offline · score · gate · seal. Формула: AKSI=(A×I×S)×(1+0.4√n). Контакт: aksilove@internet.ru"},
{q:["формула","formula","что такое aksi","what is aksi"],a:"Формула: AKSI = (A × I × S) × (1 + 0.4√n). A — агентность, I — качество (EQS), S — структура, n — глубина sealed-истории."},
{q:["gate","гейт","порог"],a:"Gate — порог допуска в официальную память (τ=0.55). Не прошедшее Gate не пишется как факт."},
{q:["печать","seal","verify","подпись"],a:"Печать — FNV-цепь целостности. Verify сверяет hash на устройстве. Ed25519 — при ciphersuite."},
{q:["offline","сервер","llm"],a:"Сервер выключен по умолчанию. LLM опциональна. Zero/Neuro отвечают без сети."},
{q:["superpose","суперпозиция"],a:"Superpose: кандидаты → амплитуды → коллапс (Born). Инженерный UX, не физический QPU."},
{q:["quantum","квант"],a:"Квантовый слой — клиентский state-vector симулятор (answerGate, QCLI), не физический QPU."}
];
function kbMatch(q){var low=String(q||"").toLowerCase(),i,j;for(i=0;i<KB.length;i++)for(j=0;j<KB[i].q.length;j++)if(low.indexOf(KB[i].q[j])!==-1)return{text:KB[i].a,conf:.96,source:"kb"};return null}

function getAnswer(q){
  var cands=[];
  function push(h){if(h&&h.text)cands.push(h)}
  push(kbMatch(q));
  var jobs=[];
  if(G.AKSI_ZERO&&G.AKSI_ZERO.think)jobs.push(maybe(G.AKSI_ZERO.think(q)).then(function(z){if(z&&(z.answer||z.text))push({text:String(z.answer||z.text),source:"zero",conf:z.confidence!=null?+z.confidence:.65})}).catch(function(){}));
  if(G.AKSI_NEURO&&G.AKSI_NEURO.think)jobs.push(maybe(G.AKSI_NEURO.think(q)).then(function(n){if(n&&(n.text||n.answer))push({text:String(n.text||n.answer),source:"neuro",conf:n.score!=null?+n.score:.6})}).catch(function(){}));
  return Promise.all(jobs).then(function(){
    var docs=load(KNOW_KEY).map(function(k){return k&&k.text}).filter(Boolean),qt=tok(q),best=null,bestO=0,i,o;
    for(i=0;i<docs.length;i++){o=overlap(qt,tok(docs[i]));if(o>bestO){bestO=o;best=docs[i]}}
    if(bestO>.12)push({text:best,source:"memory",conf:.55+bestO*.25});
    if(!cands.length)return{text:"Приняла вопрос. Offline Decision. Спросите «кто ты», «формула», или «запомни: …».",source:"fallback",conf:.4};
    cands.sort(function(a,b){var d=(b.conf||0)-(a.conf||0);if(Math.abs(d)<.05){if(a.source==="kb")return -1;if(b.source==="kb")return 1}return d});
    return cands[0];
  });
}
function makeAnti(q,answer){var low=String(q||"").toLowerCase(),h=[];if(answer.length<40)h.push("Ответ короткий.");if(overlap(tok(q),tok(answer))<.08)h.push("Слабая связь с вопросом.");if(!h.length)h.push("Нужна внешняя проверка для критичных решений.");if(/кто ты|what is aksi/.test(low))h=["Продуктовый runtime, не «сознание».","Без LLM глубина ограничена локальной базой."];return h.slice(0,3).join(" ")}
function scoreAnswer(q,answer,conf){var S=structure(answer),I=clamp01((conf!=null?conf:.5)*.7+qcli(answer)*.3),eqs=round(I*100,1),qv=qcli(answer),A=.9,chain=load(CHAIN_KEY),n=chain.length;I=clamp01(eqs/100);var aksi=(A*I*S)*(1+GAMMA*Math.sqrt(n)),evidence=overlap(tok(q),tok(answer)),uncertainty=clamp01(1-I*.6-evidence*.4),phi=I*(1-uncertainty)*(1+GAMMA*Math.sqrt(n/(n+10)));return{A:round(A,3),I:round(I,3),S:round(S,3),n:n,eqs:round(eqs,1),qcli:round(qv,3),aksi:round(aksi,4),phi:round(phi,4),evidence:round(evidence,3),uncertainty:round(uncertainty,3)}}
function gateOf(scores){var ok=scores.aksi>=GATE_TAU;return{ok:!!ok,tau:GATE_TAU,reason:ok?"OK":"Порог не пройден — в память не пишем"}}
function sealPacket(body){var chain=load(CHAIN_KEY),prev=chain.length?chain[chain.length-1].hash:"genesis",payload=JSON.stringify({id:body.id,q:body.query,a:body.answer,aksi:body.scores.aksi,eqs:body.scores.eqs,gate:body.gate.ok,prev:prev});return{alg:"FNV-chain",hash:fnv(prev+"|"+payload),prev:prev,ts:now(),suite:VER,did:"did:aksi:local:decision"}}
function commitChain(r){var chain=load(CHAIN_KEY);chain.push({id:r.id,hash:r.seal.hash,prev:r.seal.prev,aksi:r.scores.aksi,gate:r.gate.ok,ts:r.seal.ts});save(CHAIN_KEY,chain)}

function decide(query){
  var t0=now(),q=String(query||"").trim();
  if(!q)return Promise.resolve({ok:false,error:"empty",answer:"",anti:"",scores:{},gate:{ok:false},seal:null});
  var teach=/^\s*(запомни|выучи|remember|learn)\s*[:：]\s*(.+)$/i.exec(q);
  if(teach){
    var fact=teach[2].trim(),scores=scoreAnswer(fact,fact,.8);scores.evidence=Math.max(scores.evidence,.2);
    var gate=gateOf(scores),id=uid(),packet={ok:true,id:id,version:VER,offline:true,server:false,query:q,answer:"",anti:"",source:"teach",scores:scores,gate:gate,learned:false,trace:["teach","gate","seal"],ms:0};
    if(gate.ok){var know=load(KNOW_KEY);know.push({text:fact,ts:now(),sealed:true});save(KNOW_KEY,know);packet.learned=true;packet.answer="Факт сохранён (Gate OK): «"+fact+"»"}
    else packet.answer="Факт НЕ сохранён — Gate не пройден.";
    packet.anti=makeAnti(q,packet.answer);packet.seal=sealPacket(packet);if(gate.ok)commitChain(packet);packet.ms=now()-t0;packet.proof={schema:"aksi-decision-proof-1",id:packet.id,query:packet.query,answer:packet.answer,scores:packet.scores,gate:packet.gate,seal:packet.seal,ts:packet.seal.ts};return Promise.resolve(packet);
  }
  return getAnswer(q).then(function(ans){
    var scores=scoreAnswer(q,ans.text,ans.conf),anti=makeAnti(q,ans.text),gate=gateOf(scores),id=uid();
    var packet={ok:true,id:id,version:VER,offline:true,server:false,query:q,answer:ans.text,anti:anti,source:ans.source,scores:scores,gate:gate,learned:false,trace:["retrieve:"+ans.source,"score","anti","gate","seal"],ms:0};
    packet.seal=sealPacket(packet);commitChain(packet);packet.ms=now()-t0;
    packet.proof={schema:"aksi-decision-proof-1",id:packet.id,query:packet.query,answer:packet.answer,anti:packet.anti,scores:packet.scores,gate:packet.gate,seal:packet.seal,offline:true,ts:packet.seal.ts};
    return packet;
  });
}
function verify(proof){try{if(typeof proof==="string")proof=JSON.parse(proof);if(!proof||!proof.seal)return{ok:false,reason:"no seal"};var prev=proof.seal.prev||"genesis";var payload=JSON.stringify({id:proof.id,q:proof.query,a:proof.answer,aksi:proof.scores&&proof.scores.aksi,eqs:proof.scores&&proof.scores.eqs,gate:proof.gate&&proof.gate.ok,prev:prev});var expect=fnv(prev+"|"+payload);return{ok:proof.seal.hash===expect,hash_match:proof.seal.hash===expect,expect:expect,got:proof.seal.hash,alg:proof.seal.alg}}catch(e){return{ok:false,reason:String(e&&e.message||e)}}}
function status(){return{version:VER,chain:load(CHAIN_KEY).length,knowledge:load(KNOW_KEY).length,offline:true,server:false,formula:"AKSI=(A×I×S)×(1+0.4√n)",gate_tau:GATE_TAU}}
function exportProof(packet){try{var blob=new Blob([JSON.stringify(packet.proof||packet,null,2)],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aksi-decision-"+(packet.id||"proof")+".json";a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},2000)}catch(e){}}
G.AKSI_DECISION={version:VER,decide:decide,verify:verify,status:status,exportProof:exportProof,gateTau:GATE_TAU};
})(typeof window!=="undefined"?window:globalThis);
