(function(){
  'use strict';
  const PROTOCOL='AKSI-VAI/1';
  const chain=[];
  let keyPair=null;
  let publicJwk=null;

  function canonical(value){
    if(value===null||typeof value!=='object') return JSON.stringify(value);
    if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
    return '{'+Object.keys(value).sort().map(function(key){return JSON.stringify(key)+':'+canonical(value[key]);}).join(',')+'}';
  }

  async function sha256(value){
    const text=typeof value==='string'?value:canonical(value);
    const data=new TextEncoder().encode(text);
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(function(x){return x.toString(16).padStart(2,'0');}).join('');
  }

  function toBase64(bytes){
    if(typeof btoa==='function') return btoa(String.fromCharCode.apply(null,Array.from(bytes)));
    if(typeof Buffer!=='undefined') return Buffer.from(bytes).toString('base64');
    throw new Error('base64 encoder unavailable');
  }

  function fromBase64(value){
    if(typeof atob==='function') return Uint8Array.from(atob(value),function(c){return c.charCodeAt(0);});
    if(typeof Buffer!=='undefined') return new Uint8Array(Buffer.from(value,'base64'));
    throw new Error('base64 decoder unavailable');
  }

  async function ensureSigner(){
    if(keyPair) return true;
    try{
      keyPair=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
      publicJwk=await crypto.subtle.exportKey('jwk',keyPair.publicKey);
      return true;
    }catch(error){
      keyPair=null;
      publicJwk=null;
      return false;
    }
  }

  async function signId(id){
    if(!(await ensureSigner())) return null;
    try{
      const sig=await crypto.subtle.sign({name:'Ed25519'},keyPair.privateKey,new TextEncoder().encode(id));
      return toBase64(new Uint8Array(sig));
    }catch(error){ return null; }
  }

  async function create(input){
    input=input||{};
    const record={
      protocol:PROTOCOL,
      created_at:new Date().toISOString(),
      agent:input.agent||'local-agent',
      principal:input.principal||'local-user',
      intent_hash:await sha256(input.intent||''),
      context_hash:await sha256(input.context||{}),
      model:input.model||null,
      runtime:input.runtime||null,
      actions:Array.isArray(input.actions)?input.actions:[],
      experiments:Array.isArray(input.experiments)?input.experiments:[],
      source_refs:Array.isArray(input.source_refs)?input.source_refs:[],
      result_hash:await sha256(input.result||''),
      uncertainty:typeof input.uncertainty==='number'?Math.max(0,Math.min(1,input.uncertainty)):null,
      status:input.status||'OBSERVATION',
      previous:chain.length?chain[chain.length-1].id:null
    };
    record.id=await sha256(record);
    const signature=await signId(record.id);
    record.signature=signature?{algorithm:'Ed25519',encoding:'base64',public_key_jwk:publicJwk,value:signature,status:'signed'}:{algorithm:'Ed25519',status:'unavailable'};
    chain.push(record);
    window.dispatchEvent(new CustomEvent('aksi:vai-receipt',{detail:record}));
    return record;
  }

  function list(){return chain.slice();}

  async function verify(record,expectedPrevious){
    if(!record||record.protocol!==PROTOCOL) return {valid:false,reason:'invalid_protocol',hash_valid:false,signature_valid:false};
    if(expectedPrevious!==undefined&&record.previous!==expectedPrevious) return {valid:false,reason:'broken_chain',hash_valid:false,signature_valid:false,id:record.id};
    const copy=Object.assign({},record);
    const id=copy.id;
    const signature=copy.signature;
    delete copy.id;
    delete copy.signature;
    const hashValid=id===await sha256(copy);
    let signatureValid=null;
    if(signature&&signature.status==='signed'&&signature.public_key_jwk&&signature.value){
      try{
        const key=await crypto.subtle.importKey('jwk',signature.public_key_jwk,{name:'Ed25519'},false,['verify']);
        signatureValid=await crypto.subtle.verify({name:'Ed25519'},key,fromBase64(signature.value),new TextEncoder().encode(id));
      }catch(error){ signatureValid=false; }
    }else if(signature&&signature.status==='unavailable'){
      signatureValid=false;
    }
    return {
      valid:hashValid&&signatureValid===true,
      hash_valid:hashValid,
      signature_valid:signatureValid,
      id:id
    };
  }

  async function verifyChain(){
    let previous=null;
    const results=[];
    for(const record of chain){
      const result=await verify(record,previous);
      results.push(result);
      previous=record.id;
    }
    return {valid:results.length>0&&results.every(function(x){return x.valid;}),count:results.length,results};
  }

  window.AKSIVAI={
    protocol:PROTOCOL,
    create:create,
    list:list,
    verify:verify,
    verifyChain:verifyChain,
    canonical:canonical,
    signer:function(){return {algorithm:'Ed25519',public_key_jwk:publicJwk,status:keyPair?'ready':'lazy'}}
  };
  window.dispatchEvent(new CustomEvent('aksi:vai-ready',{detail:{protocol:PROTOCOL}}));
})();
