(function(){
  'use strict';
  const PROTOCOL='AKSI-VAI/1';
  const chain=[];
  let keyPair=null;
  let publicJwk=null;
  const canonical=o=>JSON.stringify(o);
  async function sha256(value){const data=new TextEncoder().encode(typeof value==='string'?value:canonical(value));const buf=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(buf)).map(x=>x.toString(16).padStart(2,'0')).join('')}
  async function ensureSigner(){
    if(keyPair)return true;
    try{
      keyPair=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
      publicJwk=await crypto.subtle.exportKey('jwk',keyPair.publicKey);
      return true;
    }catch(error){keyPair=null;publicJwk=null;return false}
  }
  async function signId(id){
    if(!(await ensureSigner()))return null;
    try{const sig=await crypto.subtle.sign({name:'Ed25519'},keyPair.privateKey,new TextEncoder().encode(id));return btoa(String.fromCharCode(...new Uint8Array(sig)))}catch(error){return null}
  }
  async function create(input){
    const record={protocol:PROTOCOL,created_at:new Date().toISOString(),agent:input.agent||'local-agent',principal:input.principal||'local-user',intent_hash:await sha256(input.intent||''),context_hash:await sha256(input.context||{}),model:input.model||null,runtime:input.runtime||null,actions:input.actions||[],experiments:input.experiments||[],source_refs:input.source_refs||[],result_hash:await sha256(input.result||''),uncertainty:typeof input.uncertainty==='number'?Math.max(0,Math.min(1,input.uncertainty)):null,status:input.status||'OBSERVATION',previous:chain.length?chain[chain.length-1].id:null};
    record.id=await sha256(record);
    const signature=await signId(record.id);
    record.signature=signature?{algorithm:'Ed25519',encoding:'base64',public_key_jwk:publicJwk,value:signature,status:'signed'}:{algorithm:'Ed25519',status:'unavailable'};
    chain.push(record);window.dispatchEvent(new CustomEvent('aksi:vai-receipt',{detail:record}));return record;
  }
  function list(){return chain.slice()}
  async function verify(record,expectedPrevious){
    if(!record||record.protocol!==PROTOCOL)return {valid:false,reason:'invalid_protocol'};
    if(expectedPrevious!==undefined&&record.previous!==expectedPrevious)return {valid:false,reason:'broken_chain'};
    const copy=Object.assign({},record);const id=copy.id;const signature=copy.signature;delete copy.id;delete copy.signature;
    const hashValid=id===await sha256(copy);let signatureValid=null;
    if(signature&&signature.status==='signed'&&signature.public_key_jwk&&signature.value){try{const key=await crypto.subtle.importKey('jwk',signature.public_key_jwk,{name:'Ed25519'},false,['verify']);const bytes=Uint8Array.from(atob(signature.value),c=>c.charCodeAt(0));signatureValid=await crypto.subtle.verify({name:'Ed25519'},key,bytes,new TextEncoder().encode(id))}catch(e){signatureValid=false}}
    return {valid:hashValid&&(signatureValid===null||signatureValid),hash_valid:hashValid,signature_valid:signatureValid,id};
  }
  async function verifyChain(){let previous=null;const results=[];for(const record of chain){results.push(await verify(record,previous));previous=record.id}return {valid:results.every(x=>x.valid),count:results.length,results}}
  window.AKSIVAI={protocol:PROTOCOL,create,list,verify,verifyChain,canonical,signer:()=>({algorithm:'Ed25519',public_key_jwk:publicJwk,status:keyPair?'ready':'lazy'})};
  window.dispatchEvent(new CustomEvent('aksi:vai-ready',{detail:{protocol:PROTOCOL}}));
})();
