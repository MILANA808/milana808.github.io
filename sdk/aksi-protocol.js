/* AKSI Protocol v1 — portable envelope helpers. */
(function(root){
  const enc=new TextEncoder();
  const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
  const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  async function hash(v){return hex(await crypto.subtle.digest('SHA-256',enc.encode(typeof v==='string'?v:canonical(v))))}
  async function create(input={}){
    const envelope={protocol:'AKSI/1',run:input.run||{id:crypto.randomUUID(),startedAt:new Date().toISOString()},request:input.request||{},agent:input.agent||{},policy:input.policy||{network:false,tools:[]},provenance:input.provenance||[],memory:input.memory||[],result:input.result||{},actions:input.actions||[]};
    envelope.proof={algorithm:'SHA-256',previousHash:input.previousHash||'GENESIS',hash:await hash(envelope)};
    return envelope;
  }
  async function verify(e){if(!e?.proof?.hash)return {valid:false,reason:'missing_proof'};const copy={...e};delete copy.proof;const expected=await hash(copy);return {valid:expected===e.proof.hash,expected,actual:e.proof.hash,truthNotProven:true}}
  root.AKSIProtocol={canonical,hash,create,verify};
})(globalThis);
