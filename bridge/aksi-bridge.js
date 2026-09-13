/* AKSI Bridge SDK 1.0 — model-neutral provenance wrapper. */
(function(root){
  'use strict';
  var VERSION='1.0.0', PROTOCOL='AKSI-VAI/1';
  function stable(v){
    if(v===null || typeof v!=='object') return JSON.stringify(v);
    if(Array.isArray(v)) return '['+v.map(stable).join(',')+']';
    return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+stable(v[k]);}).join(',')+'}';
  }
  async function hash(v){
    var text=typeof v==='string'?v:stable(v);
    var bytes=new TextEncoder().encode(text);
    var buf=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(buf)).map(function(x){return x.toString(16).padStart(2,'0');}).join('');
  }
  async function evidence(input){
    input=input||{};
    var result=input.result==null?'':String(input.result);
    return {
      protocol:PROTOCOL,
      bridge_version:VERSION,
      created_at:new Date().toISOString(),
      agent:input.agent||'aksi-bridge',
      model:input.model||null,
      intent_hash:await hash(input.intent||''),
      context_hash:await hash(input.context||{}),
      source_refs:Array.isArray(input.source_refs)?input.source_refs:[],
      actions:Array.isArray(input.actions)?input.actions:[],
      experiments:Array.isArray(input.experiments)?input.experiments:[],
      result_hash:await hash(result),
      uncertainty:typeof input.uncertainty==='number'?Math.max(0,Math.min(1,input.uncertainty)):null,
      status:input.status||'OBSERVATION',
      transport:input.transport||'local'
    };
  }
  async function wrap(request, executor, meta){
    if(typeof executor!=='function') throw new TypeError('executor must be a function');
    var started=Date.now(), output, error=null;
    try{ output=await executor(request); }
    catch(e){ error=e; }
    var rec=await evidence(Object.assign({},meta||{}, {result:error?String(error.message||error):output, actions:error?[{type:'error',message:String(error.message||error)}]:[]}));
    rec.duration_ms=Date.now()-started;
    rec.outcome=error?'ERROR':'SUCCESS';
    if(error) rec.error=String(error.message||error);
    return {output:output, error:error, evidence:rec};
  }
  function manifest(){return {
    protocol:PROTOCOL, version:VERSION,
    targets:['openai-compatible','mcp','http','browser-local','self-hosted'],
    guarantees:['hash-integrity','provenance-envelope'],
    optional:['ed25519-signature'],
    authority:'policy-and-action-gateway',
    truth:'verification is separate from integrity'
  };}
  root.AKSIBridge={version:VERSION,protocol:PROTOCOL,evidence:evidence,wrap:wrap,manifest:manifest};
})(typeof window!=='undefined'?window:globalThis);
