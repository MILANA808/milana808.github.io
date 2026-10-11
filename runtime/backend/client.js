/* AKSI Runtime backend bridge v2.0 — delegates to the canonical gateway.
 * Task creation is never retried across hosts after an ambiguous POST.
 */
(function(G){
  "use strict";
  var KEY="AKSI_BACKEND_URL";
  var DEFAULTS=["https://aksi-backend.onrender.com","https://milana-backend.replit.app"];
  function base(){
    try{return G.AKSI_UNIFIED?G.AKSI_UNIFIED.base():String(localStorage.getItem(KEY)||DEFAULTS[0]).replace(/\/$/,"")}catch(e){return DEFAULTS[0]}
  }
  function setBase(url){
    var v=String(url||"").trim().replace(/\/$/,"");
    if(!/^https?:\/\//i.test(v)) throw new Error("Backend URL must use http(s)");
    if(G.AKSI_UNIFIED) G.AKSI_UNIFIED.setBase(v);
    try{localStorage.setItem(KEY,v);localStorage.setItem("AKSI_API",v)}catch(e){}
    return v;
  }
  async function request(path,init){
    if(G.AKSI_UNIFIED){
      var data=await G.AKSI_UNIFIED.request(path,Object.assign({cache:"no-store"},init||{}));
      return {ok:true,status:200,json:async function(){return data;}};
    }
    var method=String((init||{}).method||"GET").toUpperCase();
    var candidates=[base()].concat(method==="GET"?DEFAULTS.filter(function(x){return x!==base();}):[]);
    var last=null;
    for(var i=0;i<candidates.length;i++){
      try{
        var r=await fetch(candidates[i]+path,Object.assign({cache:"no-store"},init||{}));
        if(r.ok){try{localStorage.setItem(KEY,candidates[i]);localStorage.setItem("AKSI_API",candidates[i])}catch(e){}return r;}
        last=new Error("HTTP "+r.status+" from "+candidates[i]);
        if(method!=="GET") throw last;
      }catch(e){last=e;if(method!=="GET"||i===candidates.length-1)throw e;}
    }
    throw last||new Error("No backend available");
  }
  async function health(){
    if(G.AKSI_UNIFIED)return G.AKSI_UNIFIED.health();
    var r=await request("/health");var data=await r.json();return {ok:r.ok,base:base(),data:data};
  }
  async function run(goal,opts){
    opts=opts||{};
    if(G.AKSI_UNIFIED)return G.AKSI_UNIFIED.runTask(goal,{permissions:opts.permissions,max_sources:opts.max_sources,timeoutMs:opts.timeout_ms,pollMs:opts.poll_ms,onProgress:opts.onProgress});
    var permissions=Object.assign({internet:true,read_pages:true,browser_actions:false,downloads:false,memory:true,external_actions:false},opts.permissions||{});
    var r=await request("/api/agent/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({goal:String(goal||"").trim(),permissions:permissions,max_sources:opts.max_sources||10})});
    if(!r.ok)throw new Error("create task HTTP "+r.status);
    var created=await r.json(),task=created.task;if(!task||!task.id)throw new Error("backend returned no task id");
    var id=task.id,deadline=Date.now()+(opts.timeout_ms||180000),last=task;
    while(Date.now()<deadline){
      if(opts.onProgress)opts.onProgress(last);
      if(["COMPLETED","FAILED","STOPPED","NEEDS_PERMISSION","RECOVERABLE"].indexOf(last.status)>=0)break;
      await new Promise(function(resolve){setTimeout(resolve,opts.poll_ms||1800)});
      var p=await request("/api/agent/tasks/"+encodeURIComponent(id));if(!p.ok)throw new Error("poll task HTTP "+p.status);
      var body=await p.json();last=body.task||last;
    }
    if(opts.onProgress)opts.onProgress(last);return last;
  }
  G.AKSI_SERVER_RUNTIME={version:"2.0.0",base:base,setBase:setBase,health:health,run:run};
})(typeof window!=="undefined"?window:globalThis);
