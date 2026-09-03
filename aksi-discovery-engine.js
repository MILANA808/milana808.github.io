/**
 * AKSI Discovery Engine v1.0
 * A bounded research loop for local-first AI.
 *
 * It does NOT claim quantum advantage or autonomous scientific discovery.
 * The quantum hook is an optional evaluator; knowledge promotion requires
 * explicit evidence, consistency and confidence thresholds.
 */
(function(g){'use strict';
const VERSION='ADE-1.0';
const STORE='aksi_discovery_records_v1';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const words=s=>new Set(String(s||'').toLowerCase().split(/[^\\p{L}\\p{N}]+/u).filter(x=>x.length>2));
const overlap=(a,b)=>{const A=words(a),B=words(b);if(!A.size||!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return n/Math.max(A.size,B.size)};
const stable=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
async function digest(v){if(!g.crypto?.subtle)throw Error('WebCrypto unavailable');const d=await g.crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable(v)));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function trace(events,stage,data={}){const e={stage,at:Date.now(),...data};events.push(e);try{g.dispatchEvent(new CustomEvent('aksi:discovery-trace',{detail:e}))}catch(_){} }
function load(){try{return JSON.parse(g.localStorage.getItem(STORE)||'[]')}catch(_){return[]}}
function save(a){try{g.localStorage.setItem(STORE,JSON.stringify(a.slice(-500)))}catch(_){} }
async function evaluate(query,c,context){
 const evidence=Array.isArray(c.evidence)?c.evidence.filter(Boolean).slice(0,20):[];
 const evidenceScore=clamp(evidence.length/3);
 const contextScore=context?Math.max(0,...evidence.map(e=>overlap(context,e))):0;
 const relevance=overlap(query,c.claim);
 let quantum={available:false,score:0};
 if(g.AKSIQuantum?.run){try{const r=await g.AKSIQuantum.run(query+'\\n'+c.claim);const p=Number(r?.top_states?.[0]?.probability||0);const h=Number(r?.entropy||0);quantum={available:true,score:Number(clamp(.65*p+.35*clamp(1-h/3)).toFixed(6))}}catch(_){} }
 const confidence=clamp(1-Number(c.uncertainty??.8));
 const score=clamp(.30*confidence+.25*evidenceScore+.20*contextScore+.15*relevance+.10*quantum.score);
 return {...c,evidence,confidence:Number(confidence.toFixed(6)),evidenceScore:Number(evidenceScore.toFixed(6)),contextScore:Number(contextScore.toFixed(6)),relevance:Number(relevance.toFixed(6)),quantum,score:Number(score.toFixed(6))};
}
async function generate(query,context,opts,events){
 const E=g.AKSI_LOCAL_ENGINE||g.AKSILocalEngine;
 if(!E?.generate)return {ok:false,reason:'local-model-unavailable'};
 trace(events,'model.request');
 const r=await E.generate([{role:'system',content:'AKSI Discovery Engine. Generate 3-6 competing hypotheses. Separate FACT, HYPOTHESIS and UNKNOWN. Never invent sources. Evidence must be copied only from CONTEXT. Return JSON: {"answer":"","candidates":[{"claim":"","evidence":[],"uncertainty":0.0}]}.'},{role:'user',content:'QUERY:\n'+query+'\nCONTEXT:\n'+(context||'(none)')}],{temperature:.2,max_tokens:1600,...opts});
 if(!r?.ok)return r;
 let p;try{p=JSON.parse(String(r.text).replace(/^```(?:json)?/i,'').replace(/```$/i,'').trim())}catch(_){return{ok:true,answer:String(r.text),candidates:[{claim:String(r.text),evidence:[],uncertainty:.95}]}};
 return {ok:true,answer:String(p.answer||''),candidates:(Array.isArray(p.candidates)?p.candidates:[]).filter(x=>x?.claim).slice(0,8),model:r.model};
}
async function run(query,opts={}){
 const q=String(query||'').trim();if(!q)throw Error('Empty input');const context=String(opts.context||'').trim(),events=[];trace(events,'input',{chars:q.length});
 const generated=await generate(q,context,opts,events);if(!generated.ok)return{schema:'AKSI-DISCOVERY-1',version:VERSION,ok:false,reason:generated.reason,trace:events};
 trace(events,'hypotheses.generated',{count:generated.candidates.length});
 const ranked=[];for(const c of generated.candidates){const x=await evaluate(q,c,context);ranked.push(x);trace(events,'candidate.evaluated',{score:x.score,confidence:x.confidence,quantum:x.quantum.available?x.quantum.score:null,evidence:x.evidence.length})}
 ranked.sort((a,b)=>b.score-a.score||b.confidence-a.confidence);const best=ranked[0];
 const promoted=!!best&&best.evidence.length>0&&best.confidence>=.65&&best.score>=.60;
 const record={schema:'AKSI-DISCOVERY-RECORD-1',version:VERSION,query:q,context_digest:context?await digest(context):null,answer:generated.answer||best?.claim||'',selected:best||null,candidates:ranked,knowledge_status:promoted?'promoted':'hypothesis',created_at:new Date().toISOString()};
 record.hash=await digest(record);
 if(promoted){const a=load();a.push({id:record.hash,claim:best.claim,evidence:best.evidence,confidence:best.confidence,score:best.score,record_hash:record.hash,created_at:record.created_at});save(a);trace(events,'knowledge.promoted',{id:record.hash})}else trace(events,'knowledge.held',{reason:'insufficient evidence or confidence'});
 if(g.AKSIProof?.add){try{record.proof=await g.AKSIProof.add('DISCOVERY_RUN',record);trace(events,'proof.committed')}catch(e){trace(events,'proof.error',{message:e.message})}}
 record.trace=events;record.verifiable={content_hash:record.hash,knowledge_promotion_rule:'evidence>0 && confidence>=0.65 && score>=0.60'};return record;
}
g.AKSIDiscovery={version:VERSION,run,knowledge:load,clear:()=>save([])};
try{g.dispatchEvent(new CustomEvent('aksi:discovery-ready',{detail:{version:VERSION}}))}catch(_){}
})(typeof window!=='undefined'?window:globalThis);
