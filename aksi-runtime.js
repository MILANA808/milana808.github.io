(function(g){'use strict';
var V='2.2.0',MEM='aksi_runtime_memory_v2',REC='aksi_runtime_receipts_v2';
function read(k,d){try{var x=JSON.parse(g.localStorage.getItem(k)||'null');return x==null?d:x}catch(e){return d}}
function write(k,v){try{g.localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function canonical(v){if(v===undefined)return'null';if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return'['+v.map(canonical).join(',')+']';return'{'+Object.keys(v).filter(function(k){return v[k]!==undefined&&typeof v[k]!=='function'}).sort().map(function(k){return JSON.stringify(k)+':'+canonical(v[k])}).join(',')+'}'}
async function sha256(v){var c=g.crypto&&g.crypto.subtle;if(!c)throw Error('WebCrypto unavailable');var d=await c.digest('SHA-256',new TextEncoder().encode(canonical(v)));return Array.from(new Uint8Array(d)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')}
function memory(){return read(MEM,[])}
function remember(text){var a=memory();var item={id:String(Date.now())+'-'+Math.random().toString(36).slice(2,8),text:String(text||'').slice(0,2000),ts:new Date().toISOString()};a.push(item);write(MEM,a.slice(-200));return item}
function clearMemory(){write(MEM,[])}
function receipts(){return read(REC,[])}
function addReceipt(r){var a=receipts();a.push(r);write(REC,a.slice(-200));return r}
function status(){var w=g.AKSI_WEBLLM&&g.AKSI_WEBLLM.status?g.AKSI_WEBLLM.status():{},a=g.AKSI_ALGORITHM&&g.AKSI_ALGORITHM.status?g.AKSI_ALGORITHM.status():{};return{schema:'AKSI-RUNTIME-2',version:V,mode:'local-first',memory:memory().length,receipts:receipts().length,webllm:w,adia:a,modules:['STACK','Memory','Superpose','WebLLM','ADIA','Bond']}}
async function execute(input,opts){opts=opts||{};var q=String(input||'').trim();if(!q)throw Error('Empty input');var started=Date.now(),trace=[];function emit(phase,note){var e={phase:phase,note:note||'',ts:Date.now()};trace.push(e);try{if(g.dispatchEvent)g.dispatchEvent(new CustomEvent('aksi:runtime-trace',{detail:e}))}catch(_){}try{if(opts.onProgress)opts.onProgress(e)}catch(_){}}
emit('input','Задача принята');
var result=null;
if(g.AKSI_STACK&&typeof g.AKSI_STACK.decide==='function'){emit('collect','STACK собирает кандидатов');result=await g.AKSI_STACK.decide(q,{memory:memory(),policy:opts.policy||'companion',useWebLLM:opts.useWebLLM!==false,useBackend:opts.useBackend===true,backendUrl:opts.backendUrl,evidence:opts.evidence||[],seal:true})}
else{var c=[];if(g.AKSI_KNOWLEDGE&&g.AKSI_KNOWLEDGE.search)try{var k=g.AKSI_KNOWLEDGE.search(q);if(k)c.push({text:k.body,source:'knowledge'})}catch(e){};memory().slice().reverse().slice(0,8).forEach(function(m){c.push({text:m.text,source:'memory'})});if(!c.length)c=[{text:'AKSI STACK не загружен.',source:'fallback'}];var a=g.AKSI_ALGORITHM&&g.AKSI_ALGORITHM.process?g.AKSI_ALGORITHM.process(q,c,{policy:opts.policy||'companion',seal:true}):{best:c[0],gate:{decision:'DEFER'}};result={ok:true,answer:a.best&&a.best.text||'',best:a.best,gate:a.gate,bond:null,candidates:c.length,adia:{version:a.version,seal:a.seal}}}
emit('evaluate','Оценка кандидатов и policy gate');
var answer=String(result.answer||(result.best&&result.best.text)||'');var gate=result.gate||{decision:'UNKNOWN'};var bond=result.bond||null;
var verification=null;try{if(g.AKSI_VERIFIER&&g.AKSI_VERIFIER.verify){verification=g.AKSI_VERIFIER.verify(answer,(result.best&&result.best.evidence)||result.evidence||opts.evidence||[]);}}catch(e){verification={version:g.AKSI_VERIFIER&&g.AKSI_VERIFIER.version||'unknown',error:String(e&&e.message||e).slice(0,160)};}var receipt={schema:'AKSI-RECEIPT-2',ts:new Date().toISOString(),query:q,source:result.best&&result.best.source||'none',gate:gate,bond_id:bond&&bond.bond_id||null,verification:verification};
receipt.hash=await sha256(receipt);addReceipt(receipt);if(opts.save)remember('Задача: '+q+'\nОтвет: '+answer);emit('complete','Готово');
return{schema:'AKSI-RESULT-2',runtime:V,query:q,answer:answer,verification:verification,source:result.best&&result.best.source||'none',gate:gate,metrics:result.best&&result.best.metrics||null,ranked:result.ranked||[],candidates:result.candidates||0,throttle:result.throttle||null,seal:result.adia&&result.adia.seal||null,bond:bond,receipt:receipt,trace:trace,ms:Date.now()-started}}
async function selfTest(){var s=status(),sha=false;try{sha=(await sha256({test:'AKSI',version:V})).length===64}catch(e){}return{ok:sha&&!!(g.AKSI_STACK&&g.AKSI_STACK.decide),version:V,status:s,sha256:sha}}
g.AKSI_RUNTIME={version:V,status:status,canonical:canonical,sha256:sha256,execute:execute,run:execute,memory:memory,remember:remember,clearMemory:clearMemory,receipts:receipts,selfTest:selfTest}
})(typeof window!=='undefined'?window:globalThis);