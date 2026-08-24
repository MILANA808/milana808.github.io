/* AKSI Verifier SDK — dependency-free browser/Node-compatible core. */
(function(root){
  const enc = new TextEncoder();
  const hex = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2,'0')).join('');
  async function sha256(value){
    if (!globalThis.crypto?.subtle) throw new Error('Web Crypto unavailable');
    const data = typeof value === 'string' ? enc.encode(value) : value;
    return hex(await crypto.subtle.digest('SHA-256', data));
  }
  function canonical(value){
    if(value === null || typeof value !== 'object') return JSON.stringify(value);
    if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  }
  async function proof(payload, previousHash='GENESIS'){
    const body={version:'AKSI-PROOF-1',previousHash,payload};
    const hash=await sha256(canonical(body));
    return {...body,hash};
  }
  async function verify(record){
    if(!record || !record.hash) return {valid:false,reason:'missing_hash'};
    const body={version:record.version,previousHash:record.previousHash,payload:record.payload};
    const expected=await sha256(canonical(body));
    return {valid:expected===record.hash,expected,actual:record.hash,truthNotProven:true};
  }
  root.AKSIVerifier={sha256,canonical,proof,verify};
})(typeof globalThis!=='undefined'?globalThis:window);
