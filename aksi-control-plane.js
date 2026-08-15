/* AKSI Control Plane — one auditable runtime for the canonical site and its ecosystem. */
(function(){
  "use strict";
  var KEY="AKSI_CONTROL_PLANE_V2";
  var CAP="AKSI_CAPABILITIES_V2";
  function load(k,fb){try{var v=JSON.parse(localStorage.getItem(k)||"null");return v==null?fb:v;}catch(e){return fb;}}
  function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function snapshot(){return load(KEY,{version:2,startedAt:null,actions:0,lastAction:null,views:{},capabilities:load(CAP,{memory:true,ledger:true,export:true,network:false,model:false})});}
  function record(type,data){var s=snapshot();s.actions++;s.lastAction={type:type,data:data||{},at:new Date().toISOString()};s.views[data&&data.view||"unknown"]=(s.views[data&&data.view||"unknown"]||0)+1;save(KEY,s);if(window.AKSI&&AKSI.emit)AKSI.emit("ui:"+type,data||{});window.dispatchEvent(new CustomEvent("aksi:control",{detail:s.lastAction}));return s;}
  function injectUnified(){
    if(document.querySelector('script[data-aksi-unified]'))return;
    var s=document.createElement('script');s.src='/integrations/aksi-unified.js';s.async=false;s.dataset.aksiUnified='1';document.head.appendChild(s);
  }
  function install(){
    var s=snapshot();s.startedAt=s.startedAt||new Date().toISOString();save(KEY,s);injectUnified();
    document.addEventListener("click",function(e){
      var nav=e.target.closest&&e.target.closest("[data-nav]");
      if(nav)record("navigate",{view:nav.dataset.nav});
      var go=e.target.closest&&e.target.closest("[data-go]");
      if(go)record("navigate",{view:go.dataset.go});
    },true);
    document.addEventListener("submit",function(){record("submit",{});},true);
    window.addEventListener("aksi:orchestrator",function(e){var d=e.detail||{};if(d.type)record("orchestrator",{event:d.type});});
    window.AKSIControl={
      version:"2.0.0",
      state:snapshot,
      capabilities:function(){return load(CAP,{});},
      grant:function(name){var c=load(CAP,{});if(!(name in c))return false;c[name]=true;save(CAP,c);record("capability-granted",{name:name});return true;},
      revoke:function(name){var c=load(CAP,{});if(!(name in c))return false;c[name]=false;save(CAP,c);record("capability-revoked",{name:name});return true;},
      ecosystem:function(){return window.AKSIUnified&&window.AKSIUnified.registry?window.AKSIUnified.registry():Promise.reject(new Error('Unified registry not ready'));},
      backend:function(path,opts){if(!window.AKSIUnified)throw new Error('Unified adapter not ready');return window.AKSIUnified.api(path,opts);},
      export:function(){var payload={schema:"AKSI-CONTROL-EXPORT-2",control:snapshot(),capabilities:load(CAP,{}),core:window.AksiCore&&AksiCore.exportState?AksiCore.exportState():null,endpoint:window.AKSIUnified&&window.AKSIUnified.endpoint?window.AKSIUnified.endpoint():"",exportedAt:new Date().toISOString()};var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aksi-control-plane.json";a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);return payload;}
    };
    window.dispatchEvent(new CustomEvent("aksi:control-ready",{detail:window.AKSIControl}));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
