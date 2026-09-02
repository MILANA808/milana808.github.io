/**
 * AKSI Cognitive Runtime v1.0
 * Local-first hypothesis -> evaluate -> answer -> knowledge pipeline.
 * The quantum component is a classical state-vector simulator, not quantum hardware.
 * Knowledge is promoted only with explicit evidence/provenance and bounded checks.
 */
(function (G) {
  'use strict';
  const VERSION = 'ACR-1.0', STORE = 'aksi_cognitive_knowledge_v1';
  function trace(events, stage, data) {
    const e = Object.assign({ stage, at: Date.now() }, data || {}); events.push(e);
    try { G.dispatchEvent(new CustomEvent('aksi:cognitive-trace', { detail: e })); } catch (_) {}
  }
  function readKnowledge() { try { return JSON.parse(G.localStorage.getItem(STORE) || '[]'); } catch (_) { return []; } }
  function writeKnowledge(items) { try { G.localStorage.setItem(STORE, JSON.stringify(items.slice(-500))); } catch (_) {} }
  function candidate(x) {
    x = typeof x === 'string' ? { claim: x } : (x || {});
    return { claim: String(x.claim || x.statement || '').trim(), evidence: Array.isArray(x.evidence) ? x.evidence.map(String).slice(0,20) : [], uncertainty: Math.max(0, Math.min(1, Number.isFinite(Number(x.uncertainty)) ? Number(x.uncertainty) : .7)), reasoning: String(x.reasoning || '').trim() };
  }
  async function hash(value) {
    const stable = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(stable).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable(value)));
    return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2,'0')).join('');
  }
  async function quantumScore(query, c) {
    if (!G.AKSIQuantum || typeof G.AKSIQuantum.run !== 'function') return { score:0, available:false };
    const q = await G.AKSIQuantum.run(query + '\n' + c.claim), peak = q.top_states && q.top_states[0] ? q.top_states[0].probability : 0, entropy = Number(q.entropy || 0);
    const score = Math.max(0, Math.min(1, .55 * peak + .25 * (1-c.uncertainty) + .20 * Math.max(0, 1-entropy/3)));
    return { score:Number(score.toFixed(6)), available:true, trace:q };
  }
  async function model(messages, options) { const E=G.AKSI_LOCAL_ENGINE || G.AKSILocalEngine; return E && typeof E.generate==='function' ? E.generate(messages, options||{}) : {ok:false,reason:'local-model-unavailable'}; }
  async function generateCandidates(query, options, events) {
    trace(events,'hypothesis.start');
    const r=await model([{role:'system',content:'You are AKSI Cognitive Runtime. Separate facts, hypotheses and unknowns. Never invent sources. Return JSON only: {"answer":"...","candidates":[{"claim":"...","evidence":[],"uncertainty":0.0}]}. Evidence may contain only information explicitly available in the user prompt/context.'},{role:'user',content:query}],Object.assign({temperature:.2,max_tokens:900},options||{}));
    if(!r.ok)return r; let p;
    try{p=JSON.parse(String(r.text).replace(/^```(?:json)?/i,'').replace(/```$/i,'').trim());}catch(_){return {ok:true,text:r.text,candidates:[candidate({claim:r.text,uncertainty:.9})],model:r.model,usage:r.usage};}
    return {ok:true,text:String(p.answer||''),candidates:(Array.isArray(p.candidates)?p.candidates:[]).map(candidate).filter(x=>x.claim).slice(0,8),model:r.model,usage:r.usage};
  }
  async function run(query, options) {
    options=options||{}; const started=performance.now(),events=[],input=String(query||'').trim(); if(!input)throw Error('Empty input');
    trace(events,'input.received',{chars:input.length}); const generated=await generateCandidates(input,options,events);
    if(!generated.ok){trace(events,'model.unavailable',{reason:generated.reason});return {schema:'AKSI-COGNITIVE-1',runtime:VERSION,ok:false,reason:generated.reason,trace:events};}
    trace(events,'hypothesis.generated',{count:generated.candidates.length}); const ranked=[];
    for(const c of generated.candidates){const q=await quantumScore(input,c);ranked.push(Object.assign({},c,{quantum:q.score,quantum_available:q.available}));trace(events,'candidate.evaluated',{quantum:q.score,uncertainty:c.uncertainty});}
    ranked.sort((a,b)=>(b.quantum-a.quantum)||(a.uncertainty-b.uncertainty)); const best=ranked[0]||candidate({claim:generated.text,uncertainty:.9});
    const eligible=!!best.claim&&best.evidence.length>0&&best.uncertainty<=.35&&best.quantum>=.25;
    const record={schema:'aksi-cognitive-record-1',runtime:VERSION,query:input,answer:generated.text||best.claim,selected:best,candidates:ranked.slice(0,8),knowledge_eligible:eligible,generated_at:new Date().toISOString()}; record.hash=await hash(record);
    if(eligible){const k=readKnowledge();k.push({id:record.hash,claim:best.claim,evidence:best.evidence,uncertainty:best.uncertainty,quantum_score:best.quantum,source_record:record.hash,created_at:record.generated_at});writeKnowledge(k);trace(events,'knowledge.committed',{id:record.hash});}else trace(events,'knowledge.rejected',{reason:'insufficient-evidence-or-confidence'});
    if(G.AKSIProof&&typeof G.AKSIProof.add==='function'){try{record.proof=await G.AKSIProof.add('COGNITIVE_RUN',record);trace(events,'proof.committed',{hash:record.hash});}catch(e){trace(events,'proof.error',{message:e.message});}}
    record.trace=events;record.latency_ms=Number((performance.now()-started).toFixed(3));return record;
  }
  G.AKSICognitive={version:VERSION,run,knowledge:readKnowledge,clearKnowledge:()=>writeKnowledge([]),quantumScore};
  G.dispatchEvent(new CustomEvent('aksi:cognitive-ready',{detail:{version:VERSION}}));
})(window);
