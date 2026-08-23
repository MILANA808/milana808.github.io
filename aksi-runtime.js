/* AKSI Runtime v5 — one browser runtime. Local-first; proof is integrity, not truth. */
(function(g){'use strict';
const VERSION='5.0.0', enc=new TextEncoder();
const stable=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
const sha256=async v=>{const b=await crypto.subtle.digest('SHA-256',enc.encode(typeof v==='string'?v:stable(v)));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')};
function loadScript(src){return new Promise(resolve=>{if(document.querySelector('script[src="'+src+'"]'))return resolve(true);const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s)})}
const events=[];function emit(type,data){const e={type,data:data||null,t:new Date().toISOString()};events.push(e);g.dispatchEvent(new CustomEvent('aksi:event',{detail:e}));return e}
async function boot(){
 if(g.AKSI&&g.AKSI.runtimeVersion===VERSION)return g.AKSI;
 await loadScript('/aksi-core.js');
 const core=g.AksiCore||null;
 const runtime={runtimeVersion:VERSION,core,events,localFirst:true,
   async ask(input){const q=String(input||'').trim();if(!q)return{schema:'AKSI-RESULT-1',status:'error',error:'empty-input'};emit('request',{input:q});let r;if(core&&typeof core.reply==='function'){try{r=await core.reply(q)}catch(e){r={text:'АКСИ не смогла выполнить запрос.',source:'runtime',status:'error',error:String(e.message||e)}}}else r={text:'AKSI Core недоступен. Внешний ответ не имитируется.',source:null,status:'unverified'};const out={schema:'AKSI-RESULT-1',id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(36),input:q,answer:String(r.text||''),source:r.source||null,status:r.status||'unverified',proof:r.event?{hash:r.event.event_hash,previousHash:r.event.previous_hash,type:r.event.type}:null,timestamp:new Date().toISOString()};emit('answer',out);return out},
   async status(){let self=null;try{self=core&&core.selfTest?await core.selfTest():null}catch(e){self={ok:false,error:String(e.message||e)}}return{runtime:VERSION,online:navigator.onLine,localFirst:true,modules:{core:!!core,crypto:!!g.crypto?.subtle,indexedDB:!!g.indexedDB,webAssembly:!!g.WebAssembly},selfTest:self,eventCount:events.length}},
   memory:()=>core&&core.memory?core.memory():[],
   verify:()=>core&&core.verify?core.verify():Promise.resolve({ok:false,reason:'core-unavailable'}),
   prove:(subject,source,status,extra)=>core&&core.append?core.append('evidence',subject,source,status,extra):Promise.resolve(null),
   identity:()=>core&&core.identity?core.identity():Promise.resolve({available:false,reason:'core-unavailable'}),
   hash:v=>core&&core.sha?core.sha(v):sha256(v),
   learn:(text,meta)=>core&&core.saveMem?core.saveMem('lesson',text,meta):false
 };
 g.AKSI=runtime;emit('ready',{version:VERSION,core:!!core});return runtime;
}
g.AKSI_BOOT=boot();
})(window);
