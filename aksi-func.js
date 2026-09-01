/** AKSI func v110 — Release 1.1 cooler · typing + scorebar */
(function(G){"use strict";
var V="func-v110";
function $(i){return document.getElementById(i)}
function t(el,s){if(el)el.textContent=s==null?"":String(s)}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function showTyping(){
  var th=$("thread");if(!th)return null;
  var el=document.createElement("div");
  el.className="msg ai";el.id="aksiTyping";
  el.innerHTML='<div class="bub"><span class="typing"><i></i><i></i><i></i></span></div>';
  th.appendChild(el);th.scrollTop=th.scrollHeight;return el;
}
function hideTyping(){var el=$("aksiTyping");if(el&&el.parentNode)el.parentNode.removeChild(el)}

function priority(q){
  q=String(q||"").trim();if(!q)return null;
  var m=q.match(/^(?:запомни|выучи|remember)\s*[:\uff1a]\s*(.+)$/i);
  if(m&&m[1]){
    var f=m[1].trim();
    try{if(G.AKSI_RAG&&AKSI_RAG.add)AKSI_RAG.add(f)}catch(e){}
    try{if(G.AKSI_NEURO&&AKSI_NEURO.learn)AKSI_NEURO.learn(f)}catch(e){}
    home();
    return{text:"\u0417\u0430\u043f\u043e\u043c\u043d\u0438\u043b\u0430: "+f.slice(0,240)+"\n\n\u041c\u043e\u0436\u0435\u0442\u0435 \u0441\u043f\u0440\u043e\u0441\u0438\u0442\u044c \u043e\u0431 \u044d\u0442\u043e\u043c \u0432 \u0447\u0430\u0442\u0435.",source:"mem"};
  }
  if(/как польз|how to use|инструкц|с чего начать/i.test(q))
    return{text:"\u041a\u0430\u043a \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c\u0441\u044f:\n1. \u0427\u0430\u0442\n2. \u041f\u0430\u043c\u044f\u0442\u044c \u2192 \u0423\u0447\u0438\u0442\u044c\n3. \u0414\u043e\u0432\u0435\u0440\u0438\u0435 \u2192 \u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u0438\u0435\n4. \u041b\u0430\u0431 \u2192 \u043e\u0446\u0435\u043d\u043a\u0430\n\n\u0412\u0441\u0451 \u043d\u0430 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0435.",source:"guide"};
  if(/кто ты|what are you|что ты такое/i.test(q))
    return{text:"\u042f \u0410\u041a\u0421\u0418 \u2014 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u0418\u0418-\u043d\u0430\u043f\u0430\u0440\u043d\u0438\u043a.\nOffline Mind L2 + Neuro. \u041f\u0430\u043c\u044f\u0442\u044c. AES. \u041b\u0430\u0431-\u043e\u0446\u0435\u043d\u043a\u0430. WebLLM \u043f\u043e \u0436\u0435\u043b\u0430\u043d\u0438\u044e.",source:"identity"};
  if(/что умеешь|capabilities|функци/i.test(q))
    return{text:"\u0423\u043c\u0435\u044e: offline-\u043e\u0442\u0432\u0435\u0442\u044b, \u043f\u0430\u043c\u044f\u0442\u044c, \u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u0438\u0435, \u043e\u0446\u0435\u043d\u043a\u0430 ADIA/QCLI, \u043e\u043f\u0446\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e LLM \u0438 P2P.",source:"caps"};
  if(/архитектур|как устроен|stack/i.test(q))
    return{text:"Mind L2 \u2192 Neuro \u2192 RAG \u2192 WebLLM? \u2192 ADIA 3.0 score \u2192 \u043e\u0442\u0432\u0435\u0442.\n\u041a\u0432\u0430\u043d\u0442 \u0432 \u041b\u0430\u0431 \u2014 \u043a\u043b\u0438\u0435\u043d\u0442\u0441\u043a\u0430\u044f \u0441\u0438\u043c\u0443\u043b\u044f\u0446\u0438\u044f.",source:"arch"};
  if(/квант|quantum|qcli/i.test(q))
    return{text:"\u00ab\u041a\u0432\u0430\u043d\u0442\u00bb \u2014 \u043e\u0446\u0435\u043d\u043a\u0430 \u043d\u0430 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0435 (QCLI), \u043d\u0435 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0438\u0439 QPU. \u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u041b\u0430\u0431.",source:"quantum-human"};
  try{if(G.AKSI_MIND_L2&&AKSI_MIND_L2.think){var r=AKSI_MIND_L2.think(q);if(r&&r.text&&String(r.text).length>10)return{text:String(r.text),source:"mind-l2"}}}catch(e){}
  try{if(G.AKSI_NEURO&&AKSI_NEURO.think){var n=AKSI_NEURO.think(q);if(n&&n.text&&String(n.text).length>12)return{text:String(n.text),source:"neuro"}}}catch(e){}
  try{if(G.AKSI_CORE_AI&&AKSI_CORE_AI.think){var c=AKSI_CORE_AI.think(q);if(c&&c.text&&String(c.text).length>10)return{text:String(c.text),source:"core"}}}catch(e){}
  return{text:"\u042f \u0410\u041a\u0421\u0418. \u0421\u043f\u0440\u043e\u0441\u0438\u0442\u0435 \u00ab\u043a\u0442\u043e \u0442\u044b\u00bb \u0438\u043b\u0438 \u00ab\u043a\u0430\u043a \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c\u0441\u044f\u00bb.",source:"fallback"};
}
G.AKSI_PRIORITY_ANSWER=priority;

function addBubble(role,text,meta){
  var th=$("thread");if(!th)return null;
  var el=document.createElement("div");
  el.className="msg "+(role==="me"||role==="user"?"me":"ai");
  el.innerHTML='<div class="bub">'+esc(text)+(meta?'<div class="meta">'+esc(meta)+"</div>":"")+"</div>";
  th.appendChild(el);th.scrollTop=th.scrollHeight;return el;
}

function answerChat(q){
  q=String(q||"").trim();if(!q)return;
  addBubble("me",q,"");
  showTyping();
  var r=null;
  try{r=priority(q)}catch(e){r={text:String(e.message||e),source:"error"}}
  hideTyping();
  var meta=(r&&r.source)||"";
  try{
    if(G.AKSI_ALGORITHM&&AKSI_ALGORITHM.process&&r&&r.text){
      var pr=AKSI_ALGORITHM.process(q,[{text:String(r.text),source:r.source||"local"}],{policy:"companion",seal:true});
      if(pr&&pr.best&&pr.best.metrics){
        var mm=pr.best.metrics;
        meta=(meta?meta+" \u00b7 ":"")+"EQS "+mm.EQS+" \u00b7 AKSI "+mm.AKSI;
        if($("kvEqs"))t($("kvEqs"),String(mm.EQS));
      }
    } else if(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate&&r&&r.text){
      var ag=AKSI_QUANTUM.answerGate(q,String(r.text).slice(0,400));
      if(ag&&ag.QCLI!=null){
        meta=(meta?meta+" \u00b7 ":"")+"\u043e\u0446\u0435\u043d\u043a\u0430 "+ag.QCLI;
        if($("kvEqs"))t($("kvEqs"),String(ag.QCLI));
      }
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
  if(send&&!send.__v110){
    send.__v110=1;
    send.addEventListener("click",function(){
      setTimeout(function(){
        var v=(inp&&inp.value||"").trim();
        if(!v)return;
        if(inp)inp.value="";
        answerChat(v);
      },90);
    },true);
  }
  if(inp&&!inp.__v110){
    inp.__v110=1;
    inp.addEventListener("keydown",function(e){
      if(e.key==="Enter"&&!e.shiftKey){
        e.preventDefault();
        var v=inp.value.trim();if(!v)return;
        if(send)send.click();
        setTimeout(function(){if(inp.value.trim()===v){inp.value="";answerChat(v)}},110);
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
        setTimeout(function(){if(inp&&inp.value.trim()===q){inp.value="";answerChat(q)}},110);
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
      t($("localMeta"),"LLM\u2026");
      var res=await AKSI_WEBLLM.complete(prompt,{max_tokens:512});
      if(res&&res.text){t($("localAns"),res.text);t($("localMeta"),res.meta||"llm");return}
    }
    var r=priority(q);
    t($("localAns"),r&&r.text||"\u2014");
    t($("localMeta"),(r&&r.source||"offline")+(ctx?" \u00b7mem":""));
  }catch(e){t($("localAns"),String(e.message||e))}
}

function wireLocal(){
  t($("wlGpu"),navigator.gpu?"\u0434\u0430":"\u043d\u0435\u0442");
  t($("localCaps"),navigator.gpu?"WebGPU OK":"Offline-\u044f\u0434\u0440\u043e");
  if($("wlLoad"))$("wlLoad").onclick=async function(){
    if(!G.AKSI_WEBLLM)return;
    $("wlLoad").disabled=true;t($("wlState"),"\u2026");
    try{
      await AKSI_WEBLLM.load($("wlModel")&&$("wlModel").value,function(p){t($("wlOut"),typeof p==="string"?p:(p&&p.text)||"\u2026")});
      t($("wlState"),"ready");t($("wlOut"),"OK");
    }catch(e){t($("wlOut"),String(e.message||e));t($("wlState"),"err")}
    $("wlLoad").disabled=false;
  };
  if($("wlUnload"))$("wlUnload").onclick=function(){try{AKSI_WEBLLM.unload()}catch(e){}t($("wlState"),"idle")};
  if($("localAsk"))$("localAsk").onclick=function(){askLocal($("localQ")&&$("localQ").value)};
}

function wireMem(){
  if($("btnTeach"))$("btnTeach").onclick=async function(){
    var v=(($("teachIn")&&$("teachIn").value)||"").trim();if(!v||!G.AKSI_RAG)return;
    try{
      await AKSI_RAG.add(v);
      try{if(G.AKSI_NEURO&&AKSI_NEURO.learn)AKSI_NEURO.learn(v)}catch(e){}
      if($("teachIn"))$("teachIn").value="";
      if($("memList")){var d=document.createElement("div");d.textContent="\u2713 "+v.slice(0,140);$("memList").insertBefore(d,$("memList").firstChild)}
      home();
    }catch(e){alert(e.message||e)}
  };
  if($("btnWipe"))$("btnWipe").onclick=function(){
    if(!confirm("?"))return;
    try{AKSI_RAG.clear()}catch(e){}
    if($("memList"))$("memList").textContent="";
    home();
  };
}

function wireTrust(){
  if($("pqBoot"))$("pqBoot").onclick=function(){
    t($("pqStatus"),"Trust "+(G.AKSI_TRUST_VAULT?"OK":"?")+" \u00b7 docs "+(G.AKSI_RAG&&AKSI_RAG.status?AKSI_RAG.status().docs:0));
  };
  if($("pqSeal"))$("pqSeal").onclick=async function(){
    try{
      var pw=prompt("password");if(!pw)return;
      var plain=AKSI_RAG.exportPlain();
      var env=await AKSI_TRUST_VAULT.seal(plain,pw);
      if($("pqEnv"))$("pqEnv").value=JSON.stringify(env,null,2);
      t($("pqStatus"),"sealed");
    }catch(e){alert(e.message||e)}
  };
  if($("pqOpen"))$("pqOpen").onclick=async function(){
    try{
      var env=JSON.parse(($("pqEnv")&&$("pqEnv").value)||"");
      var pw=prompt("password");if(pw==null)return;
      var plain=await AKSI_TRUST_VAULT.open(env,pw);
      if(plain&&AKSI_RAG.importPlain)AKSI_RAG.importPlain(plain);
      t($("pqStatus"),"opened");home();
    }catch(e){alert(e.message||e)}
  };
  if($("pqExport"))$("pqExport").onclick=async function(){
    try{var pw=prompt("password");if(!pw)return;await AKSI_TRUST_VAULT.exportEncrypted(pw)}catch(e){alert(e.message||e)}
  };
}

function wireLab(){
  if(!$("btnMetrics"))return;
  $("btnMetrics").onclick=function(){
    try{
      if(G.AKSI_ALGORITHM&&AKSI_ALGORITHM.process){
        var pr=AKSI_ALGORITHM.process("lab",[{text:"AKSI local-first offline agent",source:"lab"}],{policy:"lab",seal:false});
        var m=pr.best&&pr.best.metrics;
        t($("labMetrics"),["ADIA 3.0",m?("EQS "+m.EQS+" \u00b7 AKSI "+m.AKSI+" \u00b7 QCLI "+m.QCLI):"—","",m&&m.quantum?("sim "+m.quantum.mode):""].join("\n"));
        if(m&&$("kvEqs"))t($("kvEqs"),String(m.EQS));
        return;
      }
      if(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate){
        var ag=AKSI_QUANTUM.answerGate("t","aksi");
        t($("labMetrics"),"QCLI "+ag.QCLI);
      }
    }catch(e){t($("labMetrics"),String(e.message||e))}
  };
}

function wireP2P(){
  function slog(m){if($("sdpLog"))$("sdpLog").textContent=String(m)+"\n"+($("sdpLog").textContent||"").slice(0,300)}
  if($("sdpOffer"))$("sdpOffer").onclick=async function(){
    try{var sdp=await AKSI_P2P.createOffer();if($("sdpBox"))$("sdpBox").value=typeof sdp==="string"?sdp:JSON.stringify(sdp);slog("offer")}catch(e){slog(e.message||e)}
  };
  if($("sdpAnswer"))$("sdpAnswer").onclick=async function(){
    try{var out=await AKSI_P2P.acceptRemote(($("sdpBox")&&$("sdpBox").value)||"");if(out&&$("sdpBox"))$("sdpBox").value=typeof out==="string"?out:JSON.stringify(out);slog("ok")}catch(e){slog(e.message||e)}
  };
  if($("statsBox"))t($("statsBox"),"AKSI "+V+"\nWebGPU: "+(navigator.gpu?"yes":"no"));
}

function home(){
  try{
    var items=[["\u0420\u0430\u0437\u0443\u043c",!!G.AKSI_MIND_L2||!!G.AKSI_NEURO],["\u041f\u0430\u043c\u044f\u0442\u044c",!!G.AKSI_RAG],["\u0414\u043e\u0432\u0435\u0440\u0438\u0435",!!G.AKSI_TRUST_VAULT],
      ["ADIA",!!(G.AKSI_ALGORITHM&&AKSI_ALGORITHM.process)],["\u041c\u043e\u0434\u0435\u043b\u044c",!!G.AKSI_WEBLLM],["\u0427\u0430\u0442\u044b",!!G.AKSI_CHATS],
      ["P2P",!!(G.AKSI_P2P&&AKSI_P2P.createOffer)],["SW",!!(navigator.serviceWorker&&navigator.serviceWorker.controller)]];
    var host=$("productChecks");
    if(host){
      host.innerHTML="";host.className="check-row";
      items.forEach(function(it){var s=document.createElement("span");s.textContent=(it[1]?"\u2713 ":"\u00b7 ")+it[0];if(it[1])s.className="ok";host.appendChild(s)});
    }
    var n=items.filter(function(x){return x[1]}).length;
    if($("kvMods"))t($("kvMods"),String(n));
    if($("productReadyLabel"))t($("productReadyLabel"),(n>=5?"\u0413\u043e\u0442\u043e\u0432\u043e":"\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430")+" \u00b7 "+n+"/8");
    if($("kvNeuro"))t($("kvNeuro"),G.AKSI_MIND_L2?"L2":(G.AKSI_NEURO?"on":"\u2014"));
    var docs=0;try{if(G.AKSI_RAG&&AKSI_RAG.status)docs=AKSI_RAG.status().docs||0}catch(e){}
    if($("kvMem"))t($("kvMem"),String(docs));
    var bar=$("scoreBar");
    if(bar){bar.style.width=Math.min(100,Math.round((n/8)*100))+"%"}
    if($("modeText"))t($("modeText"),navigator.onLine?"local":"offline");
  }catch(e){}
}

function firstRun(){
  var th=$("thread");
  if(!th||th.children.length)return;
  var d=document.createElement("div");
  d.className="msg ai";
  d.innerHTML='<div class="bub">'+esc("\u0410\u041a\u0421\u0418 \u00b7 \u0440\u0435\u043b\u0438\u0437 1.1\n\n\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0432\u043e\u043f\u0440\u043e\u0441 \u0438\u043b\u0438 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u0447\u0438\u043f.\n\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435: \u041a\u0442\u043e \u0442\u044b?")+"</div>";
  th.appendChild(d);
}

function wire(){
  wireChat();wireLocal();wireMem();wireTrust();wireLab();wireP2P();home();firstRun();
  if($("modeText"))t($("modeText"),navigator.onLine?"local":"offline");
  else if($("modePill"))t($("modePill"),navigator.onLine?"local":"offline");
  var sub=document.querySelector(".sub");
  if(sub)sub.textContent="\u0440\u0435\u043b\u0438\u0437 1.1 \u00b7 \u0436\u0438\u0432\u043e\u0439 offline-\u0418\u0418";
}

function boot(){wire();setTimeout(wire,300);setTimeout(wire,1000);setTimeout(home,1600)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
G.AKSI_FUNC={version:V,wire:wire,answerChat:answerChat,priority:priority};
G.AKSI_PRODUCT={version:"1.1",release:true};
})(typeof window!=="undefined"?window:globalThis);
