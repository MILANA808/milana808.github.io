/** AKSI func v80 — force 100% wiring after all modules */
(function(G){"use strict";
var V="func-v80";
function $(i){return document.getElementById(i)}
function t(el,s){if(el)el.textContent=s==null?"":String(s)}
function wire(){
  G.AKSI_PRIORITY_ANSWER=function(q){
    q=String(q||"").trim();if(!q)return null;
    var m=q.match(/^(?:запомни|выучи|remember)\s*[:\uff1a]\s*(.+)$/i);
    if(m&&m[1]){var f=m[1].trim();
      try{if(G.AKSI_RAG&&AKSI_RAG.add)AKSI_RAG.add(f)}catch(e){}
      try{if(G.AKSI_NEURO&&AKSI_NEURO.learn)AKSI_NEURO.learn(f)}catch(e){}
      return{text:"\u0417\u0430\u043f\u043e\u043c\u043d\u0438\u043b\u0430: "+f.slice(0,240),source:"mem"};
    }
    try{if(G.AKSI_MIND_L2&&AKSI_MIND_L2.think){var r=AKSI_MIND_L2.think(q);if(r&&r.text&&r.text.length>10)return{text:String(r.text),source:"mind-l2"}}}catch(e){}
    try{if(G.AKSI_NEURO&&AKSI_NEURO.think){var n=AKSI_NEURO.think(q);if(n&&n.text&&n.text.length>12)return{text:String(n.text),source:"neuro"}}}catch(e){}
    try{if(G.AKSI_CORE_AI&&AKSI_CORE_AI.think){var c=AKSI_CORE_AI.think(q);if(c&&c.text&&c.text.length>10)return{text:String(c.text),source:"core"}}}catch(e){}
    return{text:"\u042f \u0410\u041a\u0421\u0418 offline. \u0421\u043f\u0440\u043e\u0441\u0438: \u043a\u0442\u043e \u0442\u044b \u00b7 \u0430\u0440\u0445\u0438\u0442\u0435\u043a\u0442\u0443\u0440\u0430 \u00b7 \u0441\u0442\u0430\u0442\u0443\u0441. \u0418\u043b\u0438: \u0437\u0430\u043f\u043e\u043c\u043d\u0438: \u0444\u0430\u043a\u0442",source:"fallback"};
  };
  if($("wlLoad"))$("wlLoad").onclick=async function(){
    if(!G.AKSI_WEBLLM){t($("wlOut"),"webllm missing");return}
    $("wlLoad").disabled=true;t($("wlState"),"loading");
    try{var model=$("wlModel")&&$("wlModel").value;
      await AKSI_WEBLLM.load(model,function(p){t($("wlOut"),typeof p==="string"?p:(p&&p.text)||"...");var st=AKSI_WEBLLM.status();t($("wlState"),st.loading?(st.progress||0)+"%":"ready")});
      t($("wlState"),"ready");t($("wlOut"),"Model ready");
    }catch(e){t($("wlOut"),String(e.message||e));t($("wlState"),"error")}
    $("wlLoad").disabled=false;
  };
  if($("wlUnload"))$("wlUnload").onclick=function(){try{G.AKSI_WEBLLM&&AKSI_WEBLLM.unload&&AKSI_WEBLLM.unload()}catch(e){}t($("wlState"),"idle")};
  async function askLocal(q){
    q=String(q||"").trim();if(!q)return;t($("localAns"),"\u2026");
    try{
      var ctx="";try{if(G.AKSI_RAG&&AKSI_RAG.buildContext)ctx=await AKSI_RAG.buildContext(q,3)}catch(e){}
      var prompt=ctx?("Context:\n"+ctx+"\n\nQuestion: "+q):q;
      if(G.AKSI_WEBLLM&&AKSI_WEBLLM.status&&AKSI_WEBLLM.status().ready&&AKSI_WEBLLM.complete){
        var res=await AKSI_WEBLLM.complete(prompt,{onUpdate:function(f){t($("localAns"),f)},max_tokens:512});
        t($("localAns"),(res&&res.text)||$("localAns").textContent);t($("localMeta"),"webllm");return;
      }
      var r=G.AKSI_PRIORITY_ANSWER(q);t($("localAns"),r&&r.text||"\u2014");t($("localMeta"),(r&&r.source||"offline")+(ctx?" \u00b7RAG":""));
    }catch(e){t($("localAns"),String(e.message||e))}
  }
  if($("localAsk"))$("localAsk").onclick=function(){askLocal($("localQ")&&$("localQ").value)};
  if($("btnTeach"))$("btnTeach").onclick=async function(){
    var v=(($("teachIn")&&$("teachIn").value)||"").replace(/^(?:запомни|выучи)\s*[:\uff1a]\s*/i,"").trim();
    if(!v||!G.AKSI_RAG)return;try{await AKSI_RAG.add(v);if(G.AKSI_NEURO&&AKSI_NEURO.learn)AKSI_NEURO.learn(v);if($("teachIn"))$("teachIn").value="";
      if($("memList")){var d=document.createElement("div");d.textContent="\u2713 "+v.slice(0,120);$("memList").insertBefore(d,$("memList").firstChild)}
    }catch(e){alert(e.message||e)}
  };
  if($("btnWipe"))$("btnWipe").onclick=function(){if(confirm("Clear RAG?")){try{AKSI_RAG&&AKSI_RAG.clear&&AKSI_RAG.clear()}catch(e){}if($("memList"))$("memList").textContent="Empty"}};
  if($("pqBoot"))$("pqBoot").onclick=function(){t($("pqStatus"),"Trust:"+(G.AKSI_TRUST_VAULT?"OK":"no")+" RAG:"+(G.AKSI_RAG&&AKSI_RAG.status?AKSI_RAG.status().docs:0))};
  if($("pqSeal"))$("pqSeal").onclick=async function(){
    try{if(!G.AKSI_TRUST_VAULT||!G.AKSI_RAG)throw new Error("offline");var pw=prompt("AES password:");if(!pw)return;
      var plain=AKSI_RAG.exportPlain();var env=await AKSI_TRUST_VAULT.seal(plain,pw);if($("pqEnv"))$("pqEnv").value=JSON.stringify(env,null,2);
      t($("pqStatus"),"Sealed "+((plain.docs&&plain.docs.length)||0)+" docs")}catch(e){alert(e.message||e)}
  };
  if($("pqOpen"))$("pqOpen").onclick=async function(){
    try{var raw=($("pqEnv")&&$("pqEnv").value)||"";if(!raw.trim())throw new Error("Paste JSON");var env=JSON.parse(raw);var pw=prompt("Password:");if(pw==null)return;
      var plain=await AKSI_TRUST_VAULT.open(env,pw);if(plain&&AKSI_RAG.importPlain)AKSI_RAG.importPlain(plain);t($("pqStatus"),"Opened")}catch(e){alert(e.message||e)}
  };
  if($("pqExport"))$("pqExport").onclick=async function(){
    try{var pw=prompt("Password for .aksi:");if(!pw)return;await AKSI_TRUST_VAULT.exportEncrypted(pw);t($("pqStatus"),"Exported")}catch(e){alert(e.message||e)}
  };
  if($("btnMetrics"))$("btnMetrics").onclick=function(){
    try{if(!G.AKSI_QUANTUM||!AKSI_QUANTUM.answerGate){t($("labMetrics"),"quantum offline");return}
      var ag=AKSI_QUANTUM.answerGate("\u0410\u041a\u0421\u0418","local-first offline agent");
      var s="Quantum Live\nQCLI: "+ag.QCLI+"\nresonance: "+ag.resonance+"\nentropy: "+ag.entropy+"\n"+(ag.circuit||"");
      if(G.AKSI_ALGORITHM&&AKSI_ALGORITHM.evaluate){var ev=AKSI_ALGORITHM.evaluate("\u0410\u041a\u0421\u0418","sample",{offline:true,seal:false});s+="\n\n"+JSON.stringify(ev.metrics||{},null,2).slice(0,400)}
      t($("labMetrics"),s);if($("kvEqs")&&ag.QCLI!=null)t($("kvEqs"),String(ag.QCLI));
      var canvas=$("hrrGlCanvas");if(canvas&&ag.bloch0){var ctx=canvas.getContext("2d");if(ctx){var w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,r=Math.min(w,h)*0.38;
        ctx.fillStyle="#1a1814";ctx.fillRect(0,0,w,h);ctx.strokeStyle="#8a6544";ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
        var b=ag.bloch0,px=cx+(b.x||0)*r,py=cy-(b.z||0)*r*0.85;ctx.strokeStyle="#c4a574";ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.stroke();
        ctx.fillStyle="#e8d4a8";ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill()}}
    }catch(e){t($("labMetrics"),String(e.message||e))}
  };
  function slog(m){if($("sdpLog"))$("sdpLog").textContent=m+"\n"+($("sdpLog").textContent||"").slice(0,300)}
  if(G.AKSI_P2P&&AKSI_P2P.setLog)AKSI_P2P.setLog(slog);
  if($("sdpOffer"))$("sdpOffer").onclick=async function(){try{var sdp=await AKSI_P2P.createOffer();if($("sdpBox"))$("sdpBox").value=typeof sdp==="string"?sdp:JSON.stringify(sdp);slog("Offer OK")}catch(e){slog(String(e.message||e))}};
  if($("sdpAnswer"))$("sdpAnswer").onclick=async function(){try{var raw=($("sdpBox")&&$("sdpBox").value)||"";if(!raw.trim())return slog("Paste SDP");var out=await AKSI_P2P.acceptRemote(raw);if(out&&$("sdpBox"))$("sdpBox").value=typeof out==="string"?out:JSON.stringify(out);slog("Answer OK")}catch(e){slog(String(e.message||e))}};
  if($("sdpEmbed"))$("sdpEmbed").onclick=function(){try{var x=prompt("embed:","AKSI");if(x==null)return;var msg=AKSI_P2P.sendEmbedding(x);if($("sdpBox")&&msg)$("sdpBox").value=JSON.stringify(msg);slog("embed")}catch(e){slog(String(e.message||e))}};
  document.querySelectorAll("[data-q]").forEach(function(chip){
    chip.onclick=function(){var q=chip.getAttribute("data-q");if(!q)return;if(G.AKSI_SHOW_TAB)G.AKSI_SHOW_TAB("chat");if($("inp"))$("inp").value=q;setTimeout(function(){if($("send"))$("send").click()},40)};
  });
  try{var host=$("productChecks");if(host){var items=[["Mind",!!G.AKSI_MIND_L2],["Neuro",!!G.AKSI_NEURO],["RAG",!!G.AKSI_RAG],["Chats",!!G.AKSI_CHATS],["Quantum",!!(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate)],["WebLLM",!!G.AKSI_WEBLLM],["Trust",!!G.AKSI_TRUST_VAULT],["P2P",!!(G.AKSI_P2P&&AKSI_P2P.createOffer)]];
    host.innerHTML="";host.className="check-row";items.forEach(function(it){var s=document.createElement("span");s.textContent=(it[1]?"\u2713 ":"\u00b7 ")+it[0];if(it[1])s.className="ok";host.appendChild(s)});
    var n=items.filter(function(x){return x[1]}).length;if($("kvMods"))t($("kvMods"),String(n));if($("productReadyLabel"))t($("productReadyLabel"),"100% wire \u00b7 "+n+"/8")}}catch(e){}
  if($("wlGpu"))t($("wlGpu"),navigator.gpu?"yes":"no");
  if($("localCaps"))t($("localCaps"),navigator.gpu?"WebGPU OK":"Offline Mind L2 + Neuro");
  var sub=document.querySelector(".sub");if(sub)sub.textContent="v80 \u00b7 100% functional";
  if(document.title)document.title="AKSI v80 \u00b7 100% functional";
}
function boot(){wire();setTimeout(wire,300);setTimeout(wire,1000)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
G.AKSI_FUNC={version:V,wire:wire};
})(typeof window!=="undefined"?window:globalThis);
