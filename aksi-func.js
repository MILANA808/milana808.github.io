/** AKSI func v120 — every answer through quantum pipeline */
(function(G){"use strict";
var V="func-v120";
function $(i){return document.getElementById(i)}
function t(el,s){if(el)el.textContent=s==null?"":String(s)}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function showTyping(){var th=$("thread");if(!th)return;var el=document.createElement("div");el.className="msg ai";el.id="aksiTyping";el.innerHTML='<div class="bub"><span class="typing"><i></i><i></i><i></i></span></div>';th.appendChild(el);th.scrollTop=th.scrollHeight}
function hideTyping(){var el=$("aksiTyping");if(el&&el.parentNode)el.parentNode.removeChild(el)}

function priority(q){
  q=String(q||"").trim();if(!q)return null;
  var m=q.match(/^(?:запомни|выучи|remember)\s*[:\uff1a]\s*(.+)$/i);
  if(m&&m[1]){
    var f=m[1].trim();
    try{if(G.AKSI_RAG&&AKSI_RAG.add)AKSI_RAG.add(f)}catch(e){}
    try{if(G.AKSI_NEURO&&AKSI_NEURO.learn)AKSI_NEURO.learn(f)}catch(e){}
    home();
    return{text:"\u0417\u0430\u043f\u043e\u043c\u043d\u0438\u043b\u0430: "+f.slice(0,240),source:"mem"};
  }
  if(/как польз|how to use|инструкц/i.test(q))
    return{text:"1. \u0427\u0430\u0442 \u2014 \u0432\u043e\u043f\u0440\u043e\u0441\n2. \u041f\u0430\u043c\u044f\u0442\u044c \u2014 \u0423\u0447\u0438\u0442\u044c\n3. \u0414\u043e\u0432\u0435\u0440\u0438\u0435 \u2014 AES\n4. \u041b\u0430\u0431 \u2014 quantum pipeline\n\n\u041a\u0430\u0436\u0434\u044b\u0439 \u043e\u0442\u0432\u0435\u0442 \u043f\u0440\u043e\u0445\u043e\u0434\u0438\u0442 state-vector \u0441\u0438\u043c\u0443\u043b\u044f\u0442\u043e\u0440.",source:"guide"};
  if(/кто ты|what are you/i.test(q))
    return{text:"\u042f \u0410\u041a\u0421\u0418 \u2014 local-first \u0418\u0418.\n\u041e\u0442\u0432\u0435\u0442\u044b \u043f\u0440\u043e\u0445\u043e\u0434\u044f\u0442 quantum pipeline (local-sv).\n\u041e\u043f\u0446\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e IBM Quantum по токену.",source:"identity"};
  if(/квант|quantum|pipeline|qcli/i.test(q))
    return{text:"Quantum Pipeline:\n• local-sv — state-vector симулятор на устройстве (always)\n• ibm-runtime — облачный QPU при токене\nКаждый ответ чата → answerGate → QCLI + Bloch.",source:"quantum-human"};
  try{if(G.AKSI_MIND_L2&&AKSI_MIND_L2.think){var r=AKSI_MIND_L2.think(q);if(r&&r.text&&String(r.text).length>10)return{text:String(r.text),source:"mind-l2"}}}catch(e){}
  try{if(G.AKSI_NEURO&&AKSI_NEURO.think){var n=AKSI_NEURO.think(q);if(n&&n.text&&String(n.text).length>12)return{text:String(n.text),source:"neuro"}}}catch(e){}
  return{text:"\u042f \u0410\u041a\u0421\u0418. \u0421\u043f\u0440\u043e\u0441\u0438\u0442\u0435 \u00ab\u043a\u0442\u043e \u0442\u044b\u00bb \u0438\u043b\u0438 \u00abquantum\u00bb.",source:"fallback"};
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
  var text=r&&r.text?r.text:"\u2026";
  var meta=(r&&r.source)||"";
  function afterQ(qxMeta){
    if(qxMeta) meta=(meta?meta+" \u00b7 ":"")+qxMeta;
    addBubble("ai",text,meta);
    try{
      if(G.AKSI_CHATS&&AKSI_CHATS.getActiveId){
        var id=AKSI_CHATS.getActiveId();
        if(id){
          AKSI_CHATS.addMessage(id,"user",q,"").catch(function(){});
          AKSI_CHATS.addMessage(id,"assistant",text,meta).catch(function(){});
        }
      }
    }catch(e){}
  }
  if(G.AKSI_QPIPE&&AKSI_QPIPE.processAnswer){
    AKSI_QPIPE.processAnswer(q,text,{}).then(function(res){
      afterQ(res&&res.meta);
    }).catch(function(){afterQ(null)});
  } else if(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate){
    try{
      var ag=AKSI_QUANTUM.answerGate(q,text);
      meta=(meta?meta+" \u00b7 ":"")+"QCLI "+ag.QCLI+" \u00b7 local-sv";
      if($("kvEqs"))t($("kvEqs"),String(ag.QCLI));
    }catch(e){}
    afterQ(null);
  } else afterQ(null);
}

function wireChat(){
  var send=$("send"),inp=$("inp");
  if(send&&!send.__v120){
    send.__v120=1;
    send.addEventListener("click",function(){
      setTimeout(function(){
        var v=(inp&&inp.value||"").trim();if(!v)return;
        if(inp)inp.value="";answerChat(v);
      },80);
    },true);
  }
  if(inp&&!inp.__v120){
    inp.__v120=1;
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

function wireLocal(){
  t($("wlGpu"),navigator.gpu?"\u0434\u0430":"\u043d\u0435\u0442");
  if($("wlLoad"))$("wlLoad").onclick=async function(){
    if(!G.AKSI_WEBLLM)return;
    try{
      $("wlLoad").disabled=true;
      await AKSI_WEBLLM.load($("wlModel")&&$("wlModel").value,function(p){t($("wlOut"),typeof p==="string"?p:"\u2026")});
      t($("wlState"),"ready");
    }catch(e){t($("wlOut"),String(e.message||e))}
    $("wlLoad").disabled=false;
  };
  if($("localAsk"))$("localAsk").onclick=function(){
    var q=$("localQ")&&$("localQ").value;if(!q)return;
    var r=priority(q);t($("localAns"),r&&r.text||"\u2014");
    if(G.AKSI_QPIPE)AKSI_QPIPE.processAnswer(q,r&&r.text||"",{});
  };
}

function wireMem(){
  if($("btnTeach"))$("btnTeach").onclick=async function(){
    var v=(($("teachIn")&&$("teachIn").value)||"").trim();if(!v||!G.AKSI_RAG)return;
    try{await AKSI_RAG.add(v);if($("teachIn"))$("teachIn").value="";
      if($("memList")){var d=document.createElement("div");d.textContent="\u2713 "+v.slice(0,120);$("memList").insertBefore(d,$("memList").firstChild)}
      home()}catch(e){alert(e.message||e)}
  };
  if($("btnWipe"))$("btnWipe").onclick=function(){if(confirm("?")){try{AKSI_RAG.clear()}catch(e){}home()}};
}

function wireTrust(){
  if($("pqSeal"))$("pqSeal").onclick=async function(){
    try{var pw=prompt("password");if(!pw)return;
      var env=await AKSI_TRUST_VAULT.seal(AKSI_RAG.exportPlain(),pw);
      if($("pqEnv"))$("pqEnv").value=JSON.stringify(env,null,2)}catch(e){alert(e.message||e)}
  };
  if($("pqOpen"))$("pqOpen").onclick=async function(){
    try{var env=JSON.parse(($("pqEnv")&&$("pqEnv").value)||"");var pw=prompt("password");
      var plain=await AKSI_TRUST_VAULT.open(env,pw);if(plain)AKSI_RAG.importPlain(plain);home()}catch(e){alert(e.message||e)}
  };
  if($("pqExport"))$("pqExport").onclick=async function(){
    try{var pw=prompt("password");if(pw)await AKSI_TRUST_VAULT.exportEncrypted(pw)}catch(e){alert(e.message||e)}
  };
}

function wireLab(){
  if($("btnMetrics")&&!G.AKSI_QPIPE)$("btnMetrics").onclick=function(){
    if(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate){
      var ag=AKSI_QUANTUM.answerGate("lab","aksi");
      t($("labMetrics"),"QCLI "+ag.QCLI);
    }
  };
}

function wireP2P(){
  if($("sdpOffer"))$("sdpOffer").onclick=async function(){
    try{var s=await AKSI_P2P.createOffer();if($("sdpBox"))$("sdpBox").value=typeof s==="string"?s:JSON.stringify(s)}catch(e){}
  };
  if($("statsBox"))t($("statsBox"),"AKSI "+V+"\nQPIPE: "+(G.AKSI_QPIPE?AKSI_QPIPE.version:"off"));
}

function home(){
  try{
    var items=[["Mind",!!G.AKSI_MIND_L2||!!G.AKSI_NEURO],["RAG",!!G.AKSI_RAG],["Trust",!!G.AKSI_TRUST_VAULT],
      ["Quantum",!!(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate)],["QPIPE",!!G.AKSI_QPIPE],
      ["ADIA",!!(G.AKSI_ALGORITHM&&AKSI_ALGORITHM.process)],["WebLLM",!!G.AKSI_WEBLLM],["P2P",!!(G.AKSI_P2P&&AKSI_P2P.createOffer)]];
    var host=$("productChecks");
    if(host){host.innerHTML="";items.forEach(function(it){var s=document.createElement("span");s.textContent=(it[1]?"\u2713 ":"\u00b7 ")+it[0];if(it[1])s.className="ok";host.appendChild(s)})}
    var n=items.filter(function(x){return x[1]}).length;
    if($("kvMods"))t($("kvMods"),String(n));
    if($("productReadyLabel"))t($("productReadyLabel"),"R1.2 quantum \u00b7 "+n+"/8");
    if($("kvNeuro"))t($("kvNeuro"),G.AKSI_MIND_L2?"L2":"\u2014");
    var docs=0;try{docs=AKSI_RAG.status().docs||0}catch(e){}
    if($("kvMem"))t($("kvMem"),String(docs));
    var bar=$("scoreBar");if(bar)bar.style.width=Math.min(100,Math.round(n/8*100))+"%";
    if($("modeText"))t($("modeText"),navigator.onLine?"local":"offline");
  }catch(e){}
}

function firstRun(){
  var th=$("thread");if(!th||th.children.length)return;
  var d=document.createElement("div");d.className="msg ai";
  d.innerHTML='<div class="bub">'+esc("\u0410\u041a\u0421\u0418 \u00b7 quantum pipeline\n\n\u041a\u0430\u0436\u0434\u044b\u0439 \u043e\u0442\u0432\u0435\u0442 \u2192 state-vector \u0441\u0438\u043c\u0443\u043b\u044f\u0442\u043e\u0440.\n\u0421\u043f\u0440\u043e\u0441\u0438\u0442\u0435 \u00ab\u043a\u0442\u043e \u0442\u044b\u00bb \u0438\u043b\u0438 \u00abquantum\u00bb.")+"</div>";
  th.appendChild(d);
}

function wire(){
  wireChat();wireLocal();wireMem();wireTrust();wireLab();wireP2P();home();firstRun();
  var sub=document.querySelector(".sub");if(sub)sub.textContent="\u0440\u0435\u043b\u0438\u0437 1.2 \u00b7 quantum pipeline";
}
function boot(){wire();setTimeout(wire,400);setTimeout(home,1200)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
G.AKSI_FUNC={version:V,wire:wire,answerChat:answerChat,priority:priority};
G.AKSI_PRODUCT={version:"1.2",quantum:true};
})(typeof window!=="undefined"?window:globalThis);
