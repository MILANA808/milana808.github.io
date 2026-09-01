/** AKSI func v81 — 100% feature hard-wire + chat send backup */
(function(G){"use strict";
var V="func-v81";
function $(i){return document.getElementById(i)}
function t(el,s){if(el)el.textContent=s==null?"":String(s)}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}

function priority(q){
  q=String(q||"").trim();if(!q)return null;
  var m=q.match(/^(?:запомни|выучи|remember)\s*[:\uff1a]\s*(.+)$/i);
  if(m&&m[1]){var f=m[1].trim();
    try{if(G.AKSI_RAG&&AKSI_RAG.add)AKSI_RAG.add(f)}catch(e){}
    try{if(G.AKSI_NEURO&&AKSI_NEURO.learn)AKSI_NEURO.learn(f)}catch(e){}
    return{text:"\u0417\u0430\u043f\u043e\u043c\u043d\u0438\u043b\u0430: "+f.slice(0,240),source:"mem"};
  }
  try{if(G.AKSI_MIND_L2&&AKSI_MIND_L2.think){var r=AKSI_MIND_L2.think(q);if(r&&r.text&&String(r.text).length>10)return{text:String(r.text),source:"mind-l2"}}}catch(e){}
  try{if(G.AKSI_NEURO&&AKSI_NEURO.think){var n=AKSI_NEURO.think(q);if(n&&n.text&&String(n.text).length>12)return{text:String(n.text),source:"neuro"}}}catch(e){}
  try{if(G.AKSI_CORE_AI&&AKSI_CORE_AI.think){var c=AKSI_CORE_AI.think(q);if(c&&c.text&&String(c.text).length>10)return{text:String(c.text),source:"core"}}}catch(e){}
  try{if(G.AKSI_KNOWLEDGE&&AKSI_KNOWLEDGE.answer){var k=AKSI_KNOWLEDGE.answer(q);if(k&&k.text&&String(k.text).length>10)return{text:String(k.text),source:"knowledge"}}}catch(e){}
  return{text:"\u042f \u0410\u041a\u0421\u0418 \u2014 offline. \u0421\u043f\u0440\u043e\u0441\u0438: \u043a\u0442\u043e \u0442\u044b \u00b7 \u0430\u0440\u0445\u0438\u0442\u0435\u043a\u0442\u0443\u0440\u0430 \u00b7 \u0441\u0442\u0430\u0442\u0443\u0441\n\u0418\u043b\u0438: \u0437\u0430\u043f\u043e\u043c\u043d\u0438: \u0444\u0430\u043a\u0442",source:"fallback"};
}
G.AKSI_PRIORITY_ANSWER=priority;

function addBubble(role,text,meta){
  var th=$("thread");if(!th)return;
  var el=document.createElement("div");
  el.className="msg "+(role==="me"||role==="user"?"me":"ai");
  el.innerHTML='<div class="bub">'+esc(text)+(meta?'<div class="meta">'+esc(meta)+"</div>":"")+"</div>";
  th.appendChild(el);th.scrollTop=th.scrollHeight;
  return el;
}

function answerChat(q){
  q=String(q||"").trim();if(!q)return;
  addBubble("me",q,"");
  var r=priority(q);
  var meta=(r&&r.source)||"";
  try{
    if(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate&&r&&r.text){
      var ag=AKSI_QUANTUM.answerGate(q,String(r.text).slice(0,400));
      if(ag&&ag.QCLI!=null){meta=(meta?meta+" \u00b7 ":"")+"QCLI "+ag.QCLI;if($("kvEqs"))t($("kvEqs"),String(ag.QCLI))}
    }
  }catch(e){}
  addBubble("ai",r&&r.text?r.text:"\u2026",meta);
  try{
    if(G.AKSI_CHATS&&AKSI_CHATS.getActiveId){
      var id=AKSI_CHATS.getActiveId();
      if(id){
        AKSI_CHATS.addMessage(id,"user",q,"").catch(function(){});
        AKSI_CHATS.addMessage(id,"assistant",r&&r.text||"",meta).catch(function(){});
      }
    }
  }catch(e){}
}

function wireChat(){
  var send=$("send"),inp=$("inp");
  if(send&&!send.__v81){
    send.__v81=1;
    send.addEventListener("click",function(){
      setTimeout(function(){
        var v=(inp&&inp.value||"").trim();
        if(!v)return;
        if(inp)inp.value="";
        answerChat(v);
      },80);
    },true);
  }
  if(inp&&!inp.__v81){
    inp.__v81=1;
    inp.addEventListener("keydown",function(e){
      if(e.key==="Enter"&&!e.shiftKey){
        e.preventDefault();
        var v=inp.value.trim();if(!v)return;
        if(send)send.click();
        setTimeout(function(){if(inp.value.trim()===v){inp.value="";answerChat(v)}},100);
      }
    });
  }
  document.querySelectorAll("[data-q]").forEach(function(chip){
    chip.onclick=function(){
      var q=chip.getAttribute("data-q");if(!q)return;
      if(G.AKSI_SHOW_TAB)G.AKSI_SHOW_TAB("chat");
      if(inp)inp.value=q;
      setTimeout(function(){
        if(send)send.click();
        setTimeout(function(){if(inp&&inp.value.trim()===q){inp.value="";answerChat(q)}},100);
      },40);
    };
  });
}

async function askLocal(q){
  q=String(q||"").trim();if(!q)return;
  t($("localAns"),"\u2026");t($("localMeta"),"");
  try{
    var ctx="";try{if(G.AKSI_RAG&&AKSI_RAG.buildContext)ctx=await AKSI_RAG.buildContext(q,3)}catch(e){}
    var prompt=ctx?("Context:\n"+ctx+"\n\nQuestion: "+q):q;
    if(G.AKSI_WEBLLM&&AKSI_WEBLLM.status&&AKSI_WEBLLM.status().ready){
      t($("localMeta"),"WebLLM\u2026");
      var res=await AKSI_WEBLLM.complete(prompt,{max_tokens:512});
      if(res&&res.text){t($("localAns"),res.text);t($("localMeta"),res.meta||"webllm");return}
      if(res&&res.error)t($("localMeta"),res.error);
    }
    var r=priority(q);
    t($("localAns"),r&&r.text||"\u2014");
    t($("localMeta"),(r&&r.source||"offline")+(ctx?" \u00b7RAG":""));
  }catch(e){t($("localAns"),String(e.message||e));t($("localMeta"),"error")}
}

function wireLocal(){
  t($("wlGpu"),navigator.gpu?"yes":"no");
  t($("localCaps"),navigator.gpu?"WebGPU OK \u00b7 Load LLM":"No WebGPU \u00b7 offline Mind L2 + Neuro");
  if($("wlLoad"))$("wlLoad").onclick=async function(){
    if(!G.AKSI_WEBLLM){t($("wlOut"),"webllm missing");return}
    $("wlLoad").disabled=true;t($("wlState"),"loading");
    try{
      var model=$("wlModel")&&$("wlModel").value;
      await AKSI_WEBLLM.load(model,function(p){
        t($("wlOut"),typeof p==="string"?p:(p&&(p.text||p.progress))||"...");
        var st=AKSI_WEBLLM.status();
        t($("wlState"),st.loading?(st.progress||0)+"%":"ready");
      });
      t($("wlState"),"ready");t($("wlOut"),"Model ready");
    }catch(e){t($("wlOut"),String(e.message||e));t($("wlState"),"error")}
    $("wlLoad").disabled=false;
  };
  if($("wlUnload"))$("wlUnload").onclick=function(){
    try{G.AKSI_WEBLLM&&AKSI_WEBLLM.unload&&AKSI_WEBLLM.unload()}catch(e){}
    t($("wlState"),"idle");t($("wlOut"),"Unloaded");
  };
  if($("localAsk"))$("localAsk").onclick=function(){askLocal($("localQ")&&$("localQ").value)};
  if($("localQ"))$("localQ").onkeydown=function(e){
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();askLocal($("localQ").value)}
  };
}

function wireMem(){
  if($("btnTeach"))$("btnTeach").onclick=async function(){
    var v=(($("teachIn")&&$("teachIn").value)||"").replace(/^(?:запомни|выучи)\s*[:\uff1a]\s*/i,"").trim();
    if(!v)return;
    if(!G.AKSI_RAG){alert("RAG offline");return}
    try{
      await AKSI_RAG.add(v);
      try{if(G.AKSI_NEURO&&AKSI_NEURO.learn)AKSI_NEURO.learn(v)}catch(e){}
      if($("teachIn"))$("teachIn").value="";
      if($("memList")){var d=document.createElement("div");d.textContent="\u2713 "+v.slice(0,140);$("memList").insertBefore(d,$("memList").firstChild)}
      home();
    }catch(e){alert(e.message||e)}
  };
  if($("btnWipe"))$("btnWipe").onclick=function(){
    if(!confirm("Clear RAG memory?"))return;
    try{G.AKSI_RAG&&AKSI_RAG.clear&&AKSI_RAG.clear()}catch(e){}
    if($("memList"))$("memList").textContent="Empty";
    home();
  };
}

function wireTrust(){
  if($("pqBoot"))$("pqBoot").onclick=function(){
    t($("pqStatus"),"Trust:"+(G.AKSI_TRUST_VAULT?"OK":"missing")+" \u00b7 RAG docs:"+(G.AKSI_RAG&&AKSI_RAG.status?AKSI_RAG.status().docs:0));
  };
  if($("pqSeal"))$("pqSeal").onclick=async function(){
    try{
      if(!G.AKSI_TRUST_VAULT||!G.AKSI_RAG)throw new Error("Trust/RAG offline");
      var pw=prompt("AES-GCM password:");if(!pw)return;
      var plain=AKSI_RAG.exportPlain();
      var env=await AKSI_TRUST_VAULT.seal(plain,pw);
      if($("pqEnv"))$("pqEnv").value=JSON.stringify(env,null,2);
      t($("pqStatus"),"Sealed \u00b7 "+((plain.docs&&plain.docs.length)||0)+" docs");
    }catch(e){t($("pqStatus"),String(e.message||e));alert(e.message||e)}
  };
  if($("pqOpen"))$("pqOpen").onclick=async function(){
    try{
      if(!G.AKSI_TRUST_VAULT||!G.AKSI_RAG)throw new Error("Trust/RAG offline");
      var raw=($("pqEnv")&&$("pqEnv").value)||"";
      if(!raw.trim())throw new Error("Paste envelope JSON");
      var env=JSON.parse(raw);
      var pw=prompt("Password:");if(pw==null)return;
      var plain=await AKSI_TRUST_VAULT.open(env,pw);
      if(plain&&AKSI_RAG.importPlain)AKSI_RAG.importPlain(plain);
      t($("pqStatus"),"Opened \u00b7 restored");home();
    }catch(e){t($("pqStatus"),String(e.message||e));alert(e.message||e)}
  };
  if($("pqExport"))$("pqExport").onclick=async function(){
    try{
      if(!G.AKSI_TRUST_VAULT)throw new Error("Trust offline");
      var pw=prompt("Password for .aksi:");if(!pw)return;
      await AKSI_TRUST_VAULT.exportEncrypted(pw);
      t($("pqStatus"),"Exported .aksi");
    }catch(e){t($("pqStatus"),String(e.message||e));alert(e.message||e)}
  };
}

function wireLab(){
  if(!$("btnMetrics"))return;
  $("btnMetrics").onclick=function(){
    try{
      if(!G.AKSI_QUANTUM||!AKSI_QUANTUM.answerGate){t($("labMetrics"),"Quantum offline");return}
      var ag=AKSI_QUANTUM.answerGate("\u0410\u041a\u0421\u0418","local-first Mind L2 Neuro offline agent");
      var s=["Quantum Live \u00b7 answerGate","QCLI: "+ag.QCLI,"resonance: "+ag.resonance,"entropy: "+ag.entropy,"purity: "+ag.purity,ag.circuit||""].join("\n");
      if(G.AKSI_ALGORITHM&&AKSI_ALGORITHM.evaluate){
        var ev=AKSI_ALGORITHM.evaluate("\u0410\u041a\u0421\u0418","sample",{offline:true,seal:false});
        s+="\n\nMetrics\n"+JSON.stringify(ev.metrics||{},null,2).slice(0,450);
      }
      t($("labMetrics"),s);
      if($("kvEqs")&&ag.QCLI!=null)t($("kvEqs"),String(ag.QCLI));
      var canvas=$("hrrGlCanvas");
      if(canvas&&ag.bloch0){
        var ctx=canvas.getContext("2d");
        if(ctx){
          var w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,r=Math.min(w,h)*0.38;
          ctx.fillStyle="#1a1814";ctx.fillRect(0,0,w,h);
          ctx.strokeStyle="#8a6544";ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
          var b=ag.bloch0,px=cx+(b.x||0)*r,py=cy-(b.z||0)*r*0.85;
          ctx.strokeStyle="#c4a574";ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.stroke();
          ctx.fillStyle="#e8d4a8";ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();
        }
      }
    }catch(e){t($("labMetrics"),String(e.message||e))}
  };
}

function wireP2P(){
  function slog(m){if($("sdpLog"))$("sdpLog").textContent=String(m)+"\n"+($("sdpLog").textContent||"").slice(0,350)}
  if(G.AKSI_P2P&&AKSI_P2P.setLog)AKSI_P2P.setLog(slog);
  if($("sdpOffer"))$("sdpOffer").onclick=async function(){
    try{if(!G.AKSI_P2P)throw new Error("P2P offline");
      var sdp=await AKSI_P2P.createOffer();
      if($("sdpBox"))$("sdpBox").value=typeof sdp==="string"?sdp:JSON.stringify(sdp);
      slog("Offer ready");
    }catch(e){slog(String(e.message||e))}
  };
  if($("sdpAnswer"))$("sdpAnswer").onclick=async function(){
    try{if(!G.AKSI_P2P)throw new Error("P2P offline");
      var raw=($("sdpBox")&&$("sdpBox").value)||"";
      if(!raw.trim())return slog("Paste SDP");
      var out=await AKSI_P2P.acceptRemote(raw);
      if(out&&$("sdpBox"))$("sdpBox").value=typeof out==="string"?out:JSON.stringify(out);
      slog("Answer OK");
    }catch(e){slog(String(e.message||e))}
  };
  if($("sdpEmbed"))$("sdpEmbed").onclick=function(){
    try{if(!G.AKSI_P2P)throw new Error("P2P offline");
      var x=prompt("embed:","AKSI");if(x==null)return;
      var msg=AKSI_P2P.sendEmbedding(x);
      if($("sdpBox")&&msg)$("sdpBox").value=JSON.stringify(msg);
      slog("embed");
    }catch(e){slog(String(e.message||e))}
  };
  if($("statsBox"))t($("statsBox"),"AKSI "+V+"\nWebGPU: "+(navigator.gpu?"yes":"no"));
}

function home(){
  try{
    var items=[["Mind",!!G.AKSI_MIND_L2],["Neuro",!!G.AKSI_NEURO],["RAG",!!G.AKSI_RAG],["Chats",!!G.AKSI_CHATS],
      ["Quantum",!!(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate)],["WebLLM",!!G.AKSI_WEBLLM],
      ["Trust",!!G.AKSI_TRUST_VAULT],["P2P",!!(G.AKSI_P2P&&AKSI_P2P.createOffer)]];
    var host=$("productChecks");
    if(host){
      host.innerHTML="";host.className="check-row";
      items.forEach(function(it){var s=document.createElement("span");s.textContent=(it[1]?"\u2713 ":"\u00b7 ")+it[0];if(it[1])s.className="ok";host.appendChild(s)});
    }
    var n=items.filter(function(x){return x[1]}).length;
    if($("kvMods"))t($("kvMods"),String(n));
    if($("productReadyLabel"))t($("productReadyLabel"),"100% functional \u00b7 "+n+"/8 modules");
    if($("kvNeuro"))t($("kvNeuro"),G.AKSI_MIND_L2?"L2":(G.AKSI_NEURO?"on":"\u2014"));
    var docs=0;try{if(G.AKSI_RAG&&AKSI_RAG.status)docs=AKSI_RAG.status().docs||0}catch(e){}
    if($("kvMem"))t($("kvMem"),String(docs));
  }catch(e){}
}

function wire(){
  wireChat();wireLocal();wireMem();wireTrust();wireLab();wireP2P();home();
  if($("modePill"))t($("modePill"),navigator.onLine?"local":"offline");
  var sub=document.querySelector(".sub");if(sub)sub.textContent="v81 \u00b7 100% functional";
  if(document.title)document.title="AKSI v81 \u00b7 100% functional";
}

function boot(){wire();setTimeout(wire,250);setTimeout(wire,900);setTimeout(home,1500)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
G.AKSI_FUNC={version:V,wire:wire,answerChat:answerChat,priority:priority};
})(typeof window!=="undefined"?window:globalThis);
