/**
 * AKSI Bot Runtime Bridge v1 — historic Bot -> AKSI Infinity.
 * Permissioned backend task -> report -> receipt.
 */
(function (G) {
  "use strict";
  if (G.AKSI_AGENT_RUNTIME) return;
  var API = (G.AKSI_API_BASE || (typeof localStorage !== "undefined" && localStorage.getItem("aksi_api")) || "https://milana-backend.onrender.com").replace(/\/$/, "");
  var TERMINAL = { COMPLETED:1, FAILED:1, STOPPED:1, NEEDS_PERMISSION:1 };
  function setApi(url) { API=String(url||"").replace(/\/$/,""); try{localStorage.setItem("aksi_api",API);}catch(e){} return API; }
  async function health() {
    try { var r=await fetch(API+"/health",{signal:AbortSignal.timeout(8000)}); return {ok:r.ok,api:API,data:await r.json()}; }
    catch(e){ return {ok:false,api:API,error:String(e.message||e)}; }
  }
  async function run(goal,opts) {
    opts=opts||{}; goal=String(goal||"").trim(); if(!goal) throw new Error("Пустая задача");
    var permissions=Object.assign({internet:true,read_pages:true,browser_actions:false,downloads:false,memory:true,external_actions:false},opts.permissions||{});
    var r=await fetch(API+"/api/agent/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({goal:goal,permissions:permissions,max_sources:opts.max_sources||10}),signal:AbortSignal.timeout(12000)});
    if(!r.ok) throw new Error("agent create HTTP "+r.status);
    var created=await r.json(), id=(created.task||{}).id; if(!id) throw new Error("backend did not return task id");
    var deadline=Date.now()+(opts.timeout_ms||120000), last=created.task||{};
    while(Date.now()<deadline){
      await new Promise(function(resolve){setTimeout(resolve,opts.poll_ms||1800);});
      var p=await fetch(API+"/api/agent/tasks/"+encodeURIComponent(id),{signal:AbortSignal.timeout(10000)});
      if(!p.ok) throw new Error("agent poll HTTP "+p.status);
      var data=await p.json(); last=data.task||last; if(TERMINAL[last.status]) break;
    }
    return {id:id,status:last.status,report:last.report||null,receipt:last.receipt||null,verification:last.verification||null,sources:last.sources||[],journal:last.journal||[],timed_out:!TERMINAL[last.status]};
  }
  G.AKSI_AGENT_RUNTIME={version:"1.0.0",get api(){return API;},setApi:setApi,health:health,run:run};
})(typeof window!=="undefined"?window:globalThis);
