/* AKSI Orchestrator — one control plane for the public site. */
(function(){
  "use strict";
  var KEY="AKSI_ORCHESTRATOR_V1";
  function state(){try{return JSON.parse(localStorage.getItem(KEY)||"null")||{sessions:0,last:null,events:0};}catch(e){return {sessions:0,last:null,events:0};}}
  function save(s){try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){}}
  function emit(type,payload){var s=state();s.events++;s.last={type:type,payload:payload||{},at:new Date().toISOString()};save(s);window.dispatchEvent(new CustomEvent("aksi:orchestrator",{detail:s.last}));}
  async function run(text){
    var q=String(text||"").trim(); if(!q) return null;
    emit("input",{text:q});
    if(window.AksiCore&&AksiCore.reply){
      var r=await AksiCore.reply(q); emit("response",{status:r.status||"unverified",source:r.source||"local"}); return r;
    }
    return {text:"AKSI Core недоступен в этом контексте.",status:"unverified",source:"orchestrator"};
  }
  function install(){
    var s=state();s.sessions++;s.last={type:"boot",at:new Date().toISOString()};save(s);
    window.AKSI={version:"4.0.0",mode:"local-first",run:run,state:state,emit:emit,core:function(){return window.AksiCore||null;}};
    window.dispatchEvent(new CustomEvent("aksi:ready",{detail:window.AKSI}));
  }
  install();
})();
