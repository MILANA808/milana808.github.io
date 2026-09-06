(function(){
  'use strict';
  const VERSION='1.0';
  const defaults={network:false,filesystem:false,tools:false,memory:true,remoteInference:false,quantum:true};
  const policies=new Map();
  const audit=[];
  const clone=o=>JSON.parse(JSON.stringify(o));
  function define(name,rules){policies.set(name,Object.assign({},defaults,rules||{}));return clone(policies.get(name))}
  function get(name){return clone(policies.get(name)||defaults)}
  function decide(name,capability,context){
    const p=get(name), allowed=p[capability]===true;
    const event={ts:new Date().toISOString(),policy:name,capability,allowed,reason:allowed?'explicitly_allowed':'denied_by_default',context:context||{}};
    audit.push(event);window.dispatchEvent(new CustomEvent('aksi:policy-decision',{detail:event}));return event;
  }
  function exportAudit(){return clone(audit)}
  define('sovereign',{network:false,filesystem:false,tools:false,memory:true,remoteInference:false,quantum:true});
  define('hybrid',{network:true,filesystem:false,tools:true,memory:true,remoteInference:true,quantum:true});
  define('enterprise',{network:true,filesystem:false,tools:true,memory:true,remoteInference:true,quantum:true});
  window.AKSIPolicyFirewall={version:VERSION,define,get,decide,exportAudit};
  window.dispatchEvent(new CustomEvent('aksi:policy-firewall-ready',{detail:{version:VERSION}}));
})();