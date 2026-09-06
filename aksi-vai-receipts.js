(function(){
  'use strict';
  const PROTOCOL='AKSI-VAI/1';
  const chain=[];
  async function sha256(value){const data=new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value));const buf=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(buf)).map(x=>x.toString(16).padStart(2,'0')).join('')}
  async function create(input){
    const record={protocol:PROTOCOL,created_at:new Date().toISOString(),agent:input.agent||'local-agent',principal:input.principal||'local-user',intent_hash:await sha256(input.intent||''),context_hash:await sha256(input.context||{}),model:input.model||null,actions:input.actions||[],experiments:input.experiments||[],source_refs:input.source_refs||[],result_hash:await sha256(input.result||''),uncertainty:typeof input.uncertainty==='number'?input.uncertainty:null,status:input.status||'OBSERVATION',previous:chain.length?chain[chain.length-1].id:null};
    record.id=await sha256(record);chain.push(record);window.dispatchEvent(new CustomEvent('aksi:vai-receipt',{detail:record}));return record;
  }
  function list(){return chain.slice()}
  async function verify(record,expectedPrevious){if(!record||record.protocol!==PROTOCOL)return {valid:false,reason:'invalid_protocol'};if(expectedPrevious!==undefined&&record.previous!==expectedPrevious)return {valid:false,reason:'broken_chain'};const copy=Object.assign({},record);const id=copy.id;delete copy.id;return {valid:id===await sha256(copy),id}}
  window.AKSIVAI={protocol:PROTOCOL,create,list,verify};
  window.dispatchEvent(new CustomEvent('aksi:vai-ready',{detail:{protocol:PROTOCOL}}));
})();