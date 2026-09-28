/** AKSI Runtime Contract v2.0 — one public execution contour. */
(function(g){'use strict';
var V='2.0.0',MEM='aksi_runtime_memory_v2',REC='aksi_runtime_receipts_v2';
function read(k,d){try{var x=JSON.parse(localStorage.getItem(k)||'null');return x==null?d:x}catch(e){return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function canonical(v){if(v===undefined)return'null';if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return'['+v.map(canonical).join(',')+']';return'{'+Object.keys(v).filter(function(k){return v[k]!==undefined&&typeof v[k]!=='function'}).sort().map(function(k){return JSON.stringify(k)+':'+canonical(v[k])}).join(',')+'}'}
async function sha256(v){if(!g.crypto||!g.crypto.subtle)throw Error('WebCrypto unavailable');var d=await g.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(v)));return Array.from(new Uint8Array(d)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')}
function memory(){return read(MEM,[])}
function remember(text){var a=memory();var item={id:String(Date.now())+'-'+Math.random().toString(36).slice(2,8),text:String(text||'').slice(0,2000),ts:new Date().toISOString()};a.push(item);write(MEM,a.slice(-200));return item}
function clearMemory(){write(MEM,[])}
function receipts(){return read(REC,[])}
function addReceipt(r){var a=receipts();a.push(r);write(REC,a.slice(-200));return r}
function status(){var w=g.AKSI_WEBLLM&&g.AKSI_WEBLLM.status?g.AKSI_WEBLLM.status():{},a=g.AKSI_ALGORITHM&&g.AKSI_ALGORITHM.status?g.AKSI_ALGORITHM.status():{};return{schema:'AKSI-RUNTIME-2',version:V,mode:'local-first',memory:memory().length,receipts:receipts().length,webllm:w,adia:a,modules:['Knowledge','Neuro','Superpose','WebLLM','ADIA','Bond','Runtime']}}
async function execute(input,opts){opts=opts||{};var q=String(input||'').trim();if(!q)throw Error('Empty input');var started=Date.now(),trace=[];function emit(phase,note){var e={phase:phase,note:note||'',ts:Date.now()};trace.push(e);try{g.dispatchEvent(new CustomEvent('aksi:runtime-trace',{detail:e}))}catch(_){}if(opts.onProgress)try{opts.onProgress(e)}catch(_){}}
emit('input','Задача принята');
var candidates=[];
if(g.AKSI_STACK&&typeof g.AKSI_STACK.collect==='function'){emit('collect','Локальные источники');try{candidates=await g.AKSI_STACK.collect(q,{memory:memory(),useWebLLM:opts.useWebLLM!==false,useBackend:opts.useBackend===true,backendUrl:opts.backendUrl})}catch(e){trace.push({phase:'collect.error',note:String(e.message||e)})}}
if(!Array.isArray(candidates))candidates=[];
if(g.AKSI_KNOWLEDGE&&g.AKSI_KNOWLEDGE.search){try{var k=g.AKSI_KNOWLEDGE.search(q);if(k)candidates.push({text:k.body,source:'knowledge'})}catch(e){}}
memory().slice().reverse().slice(0,8).forEach(function(m){candidates.push({text:m.text,source:'memory'})});
if(g.AKSI_NEURO&&g.AKSI_NEURO.query){try{var n=g.AKSI_NEURO.query(q);if(n&&(n.answer||n.text))candidates.push({text:n.answer||n.text,source:'neuro'})}catch(e){}}
if(g.AKSI_WEBLLM&&g.AKSI_WEBLLM.ready&&g.AKSI_WEBLLM.ready()&&opts.useWebLLM!==false){try{var l=await g.AKSI_WEBLLM.complete(q,{max_tokens:opts.maxTokens||384});if(l&&l.text)candidates.push({text:l.text,source:'webllm'})}catch(e){}}
if(!candidates.length)candidates=[{text:'У АКСИ нет достаточного кандидата для этой задачи.',source:'fallback'}];
emit('evaluate','Оценка и ранжирование');
var result=g.AKSI_ALGORITHM&&g.AKSI_ALGORITHM.process?g.AKSI_ALGORITHM.process(q,candidates,{policy:opts.policy||'companion',seal:true}):{best:candidates[0],gate:{decision:'ALLOW',reason:'fallback'},ranked:candidates};
var answer=String(result.best&&result.best.text||'');
var bond=null;
if(g.AKSI_BOND&&g.AKSI_BOND.createBond){try{bond=await g.AKSI_BOND.createBond({query:q,answer:answer,source:result.best&&result.best.source,gate:result.gate&&result.gate.decision,eqs:result.best&&result.best.metrics&&result.best.metrics.EQS})}catch(e){trace.push({phase:'bond.error',note:String(e.message||e)})}}
emit('gate',(result.gate&&result.gate.decision)||'UNKNOWN');
var receipt={schema:'AKSI-RECEIPT-1',ts:new Date().toISOString(),query:q,source:result.best&&result.best.source||'none',gate:result.gate||null,bond_id:bond&&bond.bond_id||null};
receipt.hash=await sha256(receipt);addReceipt(receipt);
if(opts.save)remember('Задача: '+q+'\nОтвет: '+answer);
emit('complete','Готово');
return{schema:'AKSI-RESULT-1',runtime:V,query:q,answer:answer,source:result.best&&result.best.source||'none',gate:result.gate||null,metrics:result.best&&result.best.metrics||null,ranked:result.ranked||[],seal:result.seal||null,bond:bond,receipt:receipt,trace:trace,ms:Date.now()-started}}
async function selfTest(){var s=status(),h=false;try{h=(await sha256({test:'AKSI',version:V})).length===64}catch(e){}return{ok:h,version:V,status:s,sha256:h}}
g.AKSI_RUNTIME={version:V,status:status,canonical:canonical,sha256:sha256,execute:execute,run:execute,memory:memory,remember:remember,clearMemory:clearMemory,receipts:receipts,selfTest:selfTest}
})(typeof window!=='undefined'?window:globalThis);