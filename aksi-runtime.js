/* AKSI Runtime v7 — one browser runtime. Local-first; network is explicit opt-in; every result carries provenance and an integrity proof. */
(function(g){'use strict';
const VERSION='7.0.0', SCHEMA='AKSI-RESULT-2', enc=new TextEncoder();
const stable=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
const sha256=async v=>{const b=await crypto.subtle.digest('SHA-256',enc.encode(typeof v==='string'?v:stable(v)));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')};
function loadScript(src){return new Promise(resolve=>{if(document.querySelector('script[src="'+src+'"]'))return resolve(true);const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s)})}
const events=[];function emit(type,data){const e={type,data:data||null,t:new Date().toISOString()};events.push(e);try{g.dispatchEvent(new CustomEvent('aksi:event',{detail:e}))}catch(_){}return e}
async function boot(){
 if(g.AKSI&&g.AKSI.runtimeVersion===VERSION)return g.AKSI;
 const loaded=await loadScript('/aksi-core.js'),core=g.AksiCore||null;
 const runtime={runtimeVersion:VERSION,schema:SCHEMA,core,events,localFirst:true,
   async ask(input){const q=String(input||'').trim();if(!q)return{schema:SCHEMA,status:'error',error:'empty-input'};emit('request',{input:q});let r;if(core&&typeof core.reply==='function'){try{r=await core.reply(q)}catch(e){r={text:'АКСИ не смогла выполнить запрос.',source:'runtime',status:'error',error:String(e.message||e)}}}else r={text:'AKSI Core недоступен. Внешний ответ не имитируется.',source:null,status:'unverified'};
     const proof=r.event?{hash:r.event.event_hash,previousHash:r.event.previous_hash,schema:r.event.schema,type:r.event.type}:null;
     const out={schema:SCHEMA,id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(36),input:q,answer:String(r.text||''),provenance:{source:r.source||null,status:r.status||'unverified',networkEnabled:!!core?.webEnabled?.(),online:navigator.onLine,memoryUsed:true},uncertainty:r.status==='unverified'?'unknown':'not-calibrated',proof,timestamp:new Date().toISOString()};
     emit('answer',out);return out},
   async verifyResult(result){if(!result||result.schema!==SCHEMA)return{ok:false,reason:'invalid-result'};const chain=core&&core.verify?await core.verify():{ok:false,reason:'core-unavailable'};return{ok:!!chain.ok,ledger:chain,proofPresent:!!result.proof,warning:'Целостность Proof не доказывает истинность утверждения.'}},
   async status(){let self=null;try{self=core&&core.selfTest?await core.selfTest():null}catch(e){self={ok:false,error:String(e.message||e)}}const identity=self&&self.identity&&self.identity!=='unavailable';return{runtime:VERSION,schema:SCHEMA,loadedCore:loaded,online:navigator.onLine,localFirst:true,webEnabled:!!core?.webEnabled?.(),modules:{core:!!core,crypto:!!g.crypto?.subtle,indexedDB:!!g.indexedDB,webAssembly:!!g.WebAssembly,proof:!!core?.verify,memory:!!core?.memory,identity:identity},selfTest:self,eventCount:events.length}},
   memory:q=>core&&core.memory?core.memory(q):[],
   verify:()=>core&&core.verify?core.verify():Promise.resolve({ok:false,reason:'core-unavailable'}),
   prove:(subject,source,status,extra)=>core&&core.append?core.append('evidence',subject,source,status,extra):Promise.resolve(null),
   identity:()=>core&&core.identity?core.identity():Promise.resolve({available:false,reason:'core-unavailable'}),
   hash:v=>core&&core.sha?core.sha(v):sha256(v),
   learn:async(text,meta)=>{if(!core)return false;core.saveMem('lesson',text,Object.assign({approved:false},meta||{}));await core.append('learning',text,'user',meta&&meta.approved?'approved':'pending',meta||{});return true},
   web:{enabled:()=>!!core?.webEnabled?.(),setEnabled:v=>core&&core.setWebEnabled?core.setWebEnabled(v):false},
   export:()=>core&&core.exportState?core.exportState():null
 };
 g.AKSI=runtime;emit('ready',{version:VERSION,core:!!core});return runtime;
}
g.AKSI_BOOT=boot();
})(window);
