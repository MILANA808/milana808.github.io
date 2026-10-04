/* AKSI Runtime backend bridge v1.0
 * Server execution is explicit and permission-bounded.
 */
(function(G){
  "use strict";
  var KEY="AKSI_BACKEND_URL";
  var DEFAULTS=["https://milana-backend.replit.app","https://milana-backend.onrender.com"];
  function base(){
    try{return String(localStorage.getItem(KEY)||DEFAULTS[0]).replace(/\/$/,"")}catch(e){return DEFAULTS[0]}
  }
  async function request(path,init){
    var saved=null; try{saved=localStorage.getItem(KEY)}catch(e){}
    var candidates=saved?[saved].concat(DEFAULTS.filter(function(x){return x!==saved})):DEFAULTS.slice();
    var last=null;
    for(var i=0;i<candidates.length;i++){
      var b=String(candidates[i]).replace(/\/$/,"");
      try{
        var r=await fetch(b+path,Object.assign({cache:"no-store"},init||{}));
        if(r.ok){try{localStorage.setItem(KEY,b)}catch(e){} return r;}
        last=new Error("HTTP "+r.status+" from "+b);
      }catch(e){last=e;}
    }
    throw last||new Error("No backend available");
  }
  function setBase(url){
    var v=String(url||"").trim().replace(/\/$/,"");
    if(!/^https:\/\//i.test(v)) throw new Error("Backend URL must use HTTPS");
    localStorage.setItem(KEY,v); return v;
  }
  async function health(){
    var r=await request("/health");
    var data=await r.json();
    return {ok:r.ok,base:base(),data:data};
  }
  async function run(goal,opts){
    opts=opts||{};
    var permissions=Object.assign({
      internet:true,read_pages:true,browser_actions:false,
      downloads:false,memory:true,external_actions:false
    },opts.permissions||{});
    var r=await request("/api/agent/tasks",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({goal:String(goal||"").trim(),permissions:permissions,max_sources:opts.max_sources||10})
    });
    if(!r.ok) throw new Error("create task HTTP "+r.status);
    var created=await r.json(), task=created.task;
    if(!task||!task.id) throw new Error("backend returned no task id");
    var id=task.id, deadline=Date.now()+(opts.timeout_ms||180000), last=task;
    while(Date.now()<deadline){
      if(opts.onProgress) opts.onProgress(last);
      if(["COMPLETED","FAILED","STOPPED","NEEDS_PERMISSION"].indexOf(last.status)>=0) break;
      await new Promise(function(resolve){setTimeout(resolve,opts.poll_ms||1800)});
      var p=await request("/api/agent/tasks/"+encodeURIComponent(id));
      if(!p.ok) throw new Error("poll task HTTP "+p.status);
      var body=await p.json(); last=body.task||last;
    }
    if(opts.onProgress) opts.onProgress(last);
    return last;
  }
  G.AKSI_SERVER_RUNTIME={version:"1.0.0",base:base,setBase:setBase,health:health,run:run};
})(typeof window!=="undefined"?window:globalThis);
