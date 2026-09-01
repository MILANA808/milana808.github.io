/** AKSI func v90 — human product wiring */
(function(G){"use strict";
var V="func-v90";
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
  if(/как польз|how to use|инструкц|с чего начать|что делать/i.test(q)){
    return{text:"\u041a\u0430\u043a \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c\u0441\u044f \u0410\u041a\u0421\u0418:\n1. \u0427\u0430\u0442 \u2014 \u043d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0432\u043e\u043f\u0440\u043e\u0441\n2. \u041f\u0430\u043c\u044f\u0442\u044c \u2014 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u0435 \u0444\u0430\u043a\u0442 \u043a\u043d\u043e\u043f\u043a\u043e\u0439 \u00ab\u0423\u0447\u0438\u0442\u044c\u00bb\n3. \u0414\u043e\u0432\u0435\u0440\u0438\u0435 \u2014 \u0437\u0430\u0448\u0438\u0444\u0440\u0443\u0439\u0442\u0435 \u043f\u0430\u043c\u044f\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u0435\u043c\n4. \u041c\u043e\u0434\u0435\u043b\u044c \u2014 \u043f\u043e \u0436\u0435\u043b\u0430\u043d\u0438\u044e WebLLM (WebGPU)\n5. \u041b\u0430\u0431 \u2014 \u043e\u0446\u0435\u043d\u043a\u0430 \u043e\u0442\u0432\u0435\u0442\u0430\n\n\u0414\u0430\u043d\u043d\u044b\u0435 \u043d\u0430 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0435.\naksilove@internet.ru",source:"guide"};
  }
  try{if(G.AKSI_MIND_L2&&AKSI_MIND_L2.think){var r=AKSI_MIND_L2.think(q);if(r&&r.text&&String(r.text).length>10)return{text:String(r.text),source:"mind-l2"}}}catch(e){}
  try{if(G.AKSI_NEURO&&AKSI_NEURO.think){var n=AKSI_NEURO.think(q);if(n&&n.text&&String(n.text).length>12)return{text:String(n.text),source:"neuro"}}}catch(e){}
  try{if(G.AKSI_CORE_AI&&AKSI_CORE_AI.think){var c=AKSI_CORE_AI.think(q);if(c&&c.text&&String(c.text).length>10)return{text:String(c.text),source:"core"}}}catch(e){}
  return{text:"\u042f \u0410\u041a\u0421\u0418 \u2014 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u0418\u0418 \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.\n\u0421\u043f\u0440\u043e\u0441\u0438\u0442\u0435: \u043a\u0442\u043e \u0442\u044b \u00b7 \u0447\u0442\u043e \u0443\u043c\u0435\u0435\u0448\u044c \u00b7 \u043a\u0430\u043a \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c\u0441\u044f",source:"fallback"};
}
G.AKSI_PRIORITY_ANSWER=priority;

function addBubble(role,text,meta){
  var th=$("thread");if(!th)return;
  var el=document.createElement("div");
  el.className="msg "+(role==="me"||role==="user"?"me":"ai");
  el.innerHTML='<div class="bub">'+esc(text)+(meta?'<div class="meta">'+esc(meta)+"</div>":"")+"</div>";
  th.appendChild(el);th.scrollTop=th.scrollHeight;
}
function answerChat(q){
  q=String(q||"").trim();if(!q)return;
  addBubble("me",q,"");
  var r=priority(q);var meta=(r&&r.source)||"";
  try{if(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate&&r&&r.text){var ag=AKSI_QUANTUM.answerGate(q,String(r.text).slice(0,400));
    if(ag&&ag.QCLI!=null){meta=(meta?meta+" \u00b7 ":"")+"QCLI "+ag.QCLI;if($("kvEqs"))t($("kvEqs"),String(ag.QCLI))}}}catch(e){}
  addBubble("ai",r&&r.text?r.text:"\u2026",meta);
  try{if(G.AKSI_CHATS&&AKSI_CHATS.getActiveId){var id=AKSI_CHATS.getActiveId();if(id){
    AKSI_CHATS.addMessage(id,"user",q,"").catch(function(){});
    AKSI_CHATS.addMessage(id,"assistant",r&&r.text||"",meta).catch(function(){});}}}catch(e){}
}
function wireChat(){
  var send=$("send"),inp=$("inp");
  if(send&&!send.__v90){send.__v90=1;send.addEventListener("click",function(){setTimeout(function(){var v=(inp&&inp.value||"").trim();if(!v)return;if(inp)inp.value="";answerChat(v)},80)},true)}
  if(inp&&!inp.__v90){inp.__v90=1;inp.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();var v=inp.value.trim();if(!v)return;if(send)send.click();setTimeout(function(){if(inp.value.trim()===v){inp.value="";answerChat(v)}},100)}})}
  document.querySelectorAll("[data-q]").forEach(function(chip){chip.onclick=function(){var q=chip.getAttribute("data-q");if(!q)return;if(G.AKSI_SHOW_TAB)G.AKSI_SHOW_TAB("chat");if(inp)inp.value=q;setTimeout(function(){if(send)send.click();setTimeout(function(){if(inp&&inp.value.trim()===q){inp.value="";answerChat(q)}},100)},40)}});
}
async function askLocal(q){
  q=String(q||"").trim();if(!q)return;t($("localAns"),"\u2026");
  try{var ctx="";try{if(G.AKSI_RAG&&AKSI_RAG.buildContext)ctx=await AKSI_RAG.buildContext(q,3)}catch(e){}
    var prompt=ctx?("Context:\n"+ctx+"\n\nQuestion: "+q):q;
    if(G.AKSI_WEBLLM&&AKSI_WEBLLM.status&&AKSI_WEBLLM.status().ready){var res=await AKSI_WEBLLM.complete(prompt,{max_tokens:512});if(res&&res.text){t($("localAns"),res.text);t($("localMeta"),res.meta||"webllm");return}}
    var r=priority(q);t($("localAns"),r&&r.text||"\u2014");t($("localMeta"),(r&&r.source||"offline")+(ctx?" \u00b7RAG":""));
  }catch(e){t($("localAns"),String(e.message||e))}
}
function wireLocal(){
  t($("wlGpu"),navigator.gpu?"\u0434\u0430":"\u043d\u0435\u0442");
  t($("localCaps"),navigator.gpu?"WebGPU \u0435\u0441\u0442\u044c \u2014 \u043c\u043e\u0436\u043d\u043e \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043c\u043e\u0434\u0435\u043b\u044c":"WebGPU \u043d\u0435\u0442 \u2014 \u0447\u0430\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 offline");
  if($("wlLoad"))$("wlLoad").onclick=async function(){if(!G.AKSI_WEBLLM){t($("wlOut"),"\u043c\u043e\u0434\u0443\u043b\u044c offline");return}$("wlLoad").disabled=true;t($("wlState"),"loading");
    try{await AKSI_WEBLLM.load($("wlModel")&&$("wlModel").value,function(p){t($("wlOut"),typeof p==="string"?p:"...");var st=AKSI_WEBLLM.status();t($("wlState"),st.loading?(st.progress||0)+"%":"ready")});t($("wlState"),"ready");t($("wlOut"),"\u0413\u043e\u0442\u043e\u0432\u043e")}catch(e){t($("wlOut"),String(e.message||e));t($("wlState"),"error")}$("wlLoad").disabled=false};
  if($("wlUnload"))$("wlUnload").onclick=function(){try{AKSI_WEBLLM&&AKSI_WEBLLM.unload&&AKSI_WEBLLM.unload()}catch(e){}t($("wlState"),"idle")};
  if($("localAsk"))$("localAsk").onclick=function(){askLocal($("localQ")&&$("localQ").value)};
}
function wireMem(){
  if($("btnTeach"))$("btnTeach").onclick=async function(){var v=(($("teachIn")&&$("teachIn").value)||"").trim();if(!v||!G.AKSI_RAG)return;
    try{await AKSI_RAG.add(v);try{AKSI_NEURO&&AKSI_NEURO.learn&&AKSI_NEURO.learn(v)}catch(e){}if($("teachIn"))$("teachIn").value="";
      if($("memList")){var d=document.createElement("div");d.textContent="\u2713 "+v.slice(0,140);$("memList").insertBefore(d,$("memList").firstChild)}home()}catch(e){alert(e.message||e)}};
  if($("btnWipe"))$("btnWipe").onclick=function(){if(!confirm("\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u043f\u0430\u043c\u044f\u0442\u044c?"))return;try{AKSI_RAG&&AKSI_RAG.clear&&AKSI_RAG.clear()}catch(e){}if($("memList"))$("memList").textContent="";home()};
}
function wireTrust(){
  if($("pqBoot"))$("pqBoot").onclick=function(){t($("pqStatus"),"\u0428\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u0438\u0435: "+(G.AKSI_TRUST_VAULT?"\u0433\u043e\u0442\u043e\u0432\u043e":"\u043d\u0435\u0442")+" \u00b7 \u0444\u0430\u043a\u0442\u043e\u0432: "+(G.AKSI_RAG&&AKSI_RAG.status?AKSI_RAG.status().docs:0))};
  if($("pqSeal"))$("pqSeal").onclick=async function(){try{var pw=prompt("\u041f\u0430\u0440\u043e\u043b\u044c:");if(!pw)return;var plain=AKSI_RAG.exportPlain();var env=await AKSI_TRUST_VAULT.seal(plain,pw);if($("pqEnv"))$("pqEnv").value=JSON.stringify(env,null,2);t($("pqStatus"),"\u0417\u0430\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u043e")}catch(e){alert(e.message||e)}};
  if($("pqOpen"))$("pqOpen").onclick=async function(){try{var raw=($("pqEnv")&&$("pqEnv").value)||"";if(!raw.trim())throw new Error("\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 JSON");var env=JSON.parse(raw);var pw=prompt("\u041f\u0430\u0440\u043e\u043b\u044c:");if(pw==null)return;var plain=await AKSI_TRUST_VAULT.open(env,pw);if(plain&&AKSI_RAG.importPlain)AKSI_RAG.importPlain(plain);t($("pqStatus"),"\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u043e");home()}catch(e){alert(e.message||e)}};
  if($("pqExport"))$("pqExport").onclick=async function(){try{var pw=prompt("\u041f\u0430\u0440\u043e\u043b\u044c \u0434\u043b\u044f \u0444\u0430\u0439\u043b\u0430:");if(!pw)return;await AKSI_TRUST_VAULT.exportEncrypted(pw);t($("pqStatus"),"\u0421\u043a\u0430\u0447\u0430\u043d .aksi")}catch(e){alert(e.message||e)}};
}
function wireLab(){if(!$("btnMetrics"))return;$("btnMetrics").onclick=function(){try{if(!G.AKSI_QUANTUM||!AKSI_QUANTUM.answerGate){t($("labMetrics"),"offline");return}
  var ag=AKSI_QUANTUM.answerGate("\u0410\u041a\u0421\u0418","local offline agent");
  t($("labMetrics"),["\u041e\u0446\u0435\u043d\u043a\u0430 \u043e\u0442\u0432\u0435\u0442\u0430","QCLI: "+ag.QCLI,"resonance: "+ag.resonance,"entropy: "+ag.entropy].join("\n"));
  if($("kvEqs")&&ag.QCLI!=null)t($("kvEqs"),String(ag.QCLI));
  var canvas=$("hrrGlCanvas");if(canvas&&ag.bloch0){var ctx=canvas.getContext("2d");if(ctx){var w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,r=Math.min(w,h)*0.38;
    ctx.fillStyle="#1a1814";ctx.fillRect(0,0,w,h);ctx.strokeStyle="#8a6544";ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
    var b=ag.bloch0,px=cx+(b.x||0)*r,py=cy-(b.z||0)*r*0.85;ctx.strokeStyle="#c4a574";ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.stroke();
    ctx.fillStyle="#e8d4a8";ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill()}}}catch(e){t($("labMetrics"),String(e.message||e))}};
}
function wireP2P(){function slog(m){if($("sdpLog"))$("sdpLog").textContent=m+"\n"+($("sdpLog").textContent||"").slice(0,300)}
  if($("sdpOffer"))$("sdpOffer").onclick=async function(){try{var sdp=await AKSI_P2P.createOffer();if($("sdpBox"))$("sdpBox").value=typeof sdp==="string"?sdp:JSON.stringify(sdp);slog("Offer OK")}catch(e){slog(String(e.message||e))}};
  if($("sdpAnswer"))$("sdpAnswer").onclick=async function(){try{var raw=($("sdpBox")&&$("sdpBox").value)||"";var out=await AKSI_P2P.acceptRemote(raw);if(out&&$("sdpBox"))$("sdpBox").value=typeof out==="string"?out:JSON.stringify(out);slog("Answer OK")}catch(e){slog(String(e.message||e))}};
  if($("sdpEmbed"))$("sdpEmbed").onclick=function(){try{var x=prompt("text:","AKSI");if(x==null)return;var msg=AKSI_P2P.sendEmbedding(x);if($("sdpBox")&&msg)$("sdpBox").value=JSON.stringify(msg);slog("embed")}catch(e){slog(String(e.message||e))}};
  if($("statsBox"))t($("statsBox"),"AKSI "+V+"\nWebGPU: "+(navigator.gpu?"\u0434\u0430":"\u043d\u0435\u0442"));
}
function home(){try{var items=[["\u0420\u0430\u0437\u0443\u043c",!!G.AKSI_MIND_L2],["Neuro",!!G.AKSI_NEURO],["\u041f\u0430\u043c\u044f\u0442\u044c",!!G.AKSI_RAG],["\u0427\u0430\u0442\u044b",!!G.AKSI_CHATS],["\u041b\u0430\u0431",!!(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate)],["LLM",!!G.AKSI_WEBLLM],["\u0428\u0438\u0444\u0440",!!G.AKSI_TRUST_VAULT],["P2P",!!(G.AKSI_P2P&&AKSI_P2P.createOffer)]];
  var host=$("productChecks");if(host){host.innerHTML="";host.className="check-row";items.forEach(function(it){var s=document.createElement("span");s.textContent=(it[1]?"\u2713 ":"\u00b7 ")+it[0];if(it[1])s.className="ok";host.appendChild(s)})}
  var n=items.filter(function(x){return x[1]}).length;if($("kvMods"))t($("kvMods"),String(n));if($("productReadyLabel"))t($("productReadyLabel"),n>=6?"\u0413\u043e\u0442\u043e\u0432\u043e \u043a \u0440\u0430\u0431\u043e\u0442\u0435 \u00b7 "+n+"/8":"\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u00b7 "+n+"/8");
  if($("kvNeuro"))t($("kvNeuro"),G.AKSI_MIND_L2?"\u0432\u043a\u043b":"\u2014");var docs=0;try{if(G.AKSI_RAG&&AKSI_RAG.status)docs=AKSI_RAG.status().docs||0}catch(e){}if($("kvMem"))t($("kvMem"),String(docs))}catch(e){}}
function wire(){wireChat();wireLocal();wireMem();wireTrust();wireLab();wireP2P();home();
  if($("modePill"))t($("modePill"),navigator.onLine?"local":"offline");
  var sub=document.querySelector(".sub");if(sub)sub.textContent="\u043b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u0418\u0418 \u00b7 \u043d\u0430 \u0432\u0430\u0448\u0435\u043c \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0435";
}
function boot(){wire();setTimeout(wire,300);setTimeout(wire,1000);setTimeout(home,1600)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
G.AKSI_FUNC={version:V,wire:wire,answerChat:answerChat,priority:priority};
})(typeof window!=="undefined"?window:globalThis);
