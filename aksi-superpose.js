/**
 * AKSI Superpose Engine v2.0
 * Multi-answer orchestration + visible memory + quantum visualization + selectable collapse.
 * Browser quantum layer is a simulation, not a physical quantum computer.
 */
(function (G) {
  "use strict";
  var VER = "2.0.0-superpose";
  var listeners = [];
  var lastSession = null;
  var MEMORY_KEY = "aksi.superpose.memory.v1";
  var MAX_MEMORY = 100;

  function emit(ev, data) {
    var p = { event: ev, t: Date.now(), data: data || {} };
    listeners.slice().forEach(function (fn) { try { fn(p); } catch (e) {} });
    try { window.dispatchEvent(new CustomEvent("aksi-superpose", { detail: p })); } catch (e) {}
    return p;
  }
  function on(fn) {
    if (typeof fn === "function") listeners.push(fn);
    return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
  }
  function clamp01(x) { x = +x; if (isNaN(x)) return 0; return Math.max(0, Math.min(1, x)); }
  function round(x, d) { var p = Math.pow(10, d == null ? 4 : d); return Math.round(+x * p) / p; }
  function fnv(s) { var h=0x811c9dc5; s=String(s); for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);} return ("00000000"+(h>>>0).toString(16)).slice(-8); }
  function tok(s) { return String(s||"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu," ").split(/\s+/).filter(function(w){return w.length>1;}); }
  function overlap(a,b){var s={},n=0,i; for(i=0;i<b.length;i++)s[b[i]]=1; for(i=0;i<a.length;i++)if(s[a[i]])n++; return a.length?n/a.length:0;}

  function readMemory() {
    try { var x=JSON.parse(localStorage.getItem(MEMORY_KEY)||"[]"); return Array.isArray(x)?x:[]; } catch(e){ return []; }
  }
  function writeMemory(list) {
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(list.slice(-MAX_MEMORY))); return true; } catch(e){ return false; }
  }
  function saveMemory(item) {
    item = item || lastSession; if(!item) return {ok:false,error:"nothing"};
    var list=readMemory();
    var record={id:"mem_"+Date.now().toString(36),ts:new Date().toISOString(),query:item.query,answer:item.answer,source:item.source,collapse:item.collapse,scores:item.scores,seal:item.seal};
    list.push(record); writeMemory(list); emit("memory-saved",record); return {ok:true,record:record};
  }
  function removeMemory(id){var list=readMemory().filter(function(x){return x.id!==id;});writeMemory(list);emit("memory-changed",{count:list.length});return list;}
  function clearMemory(){writeMemory([]);emit("memory-changed",{count:0});}

  function scoreCandidate(q,text,hint){
    var conf=hint&&hint.conf!=null?+hint.conf:0.55;
    var o=overlap(tok(q),tok(text)), len=String(text||"").length;
    var structure=clamp01(0.3+Math.min(0.4,len/400));
    var eqs=conf*.55+o*.25+structure*.2, qx=null,qcli=.5;
    try{if(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate){qx=AKSI_QUANTUM.answerGate(q,text);if(qx&&qx.QCLI!=null)qcli=+qx.QCLI;if(qx&&qx.resonance!=null)eqs=clamp01(eqs*.7+(+qx.resonance)*.3);}}catch(e){}
    try{if(G.AKSI_ALGORITHM&&AKSI_ALGORITHM.evaluate){var ev=AKSI_ALGORITHM.evaluate(q,text,{}),e2=ev&&(ev.eqs!=null?ev.eqs:(ev.metrics&&ev.metrics.eqs));if(e2!=null)eqs=clamp01(Number(e2)>1?Number(e2)/100:Number(e2));}}catch(e){}
    var amp=Math.sqrt(clamp01(eqs)*(.35+.65*qcli));
    return {text:text,source:(hint&&hint.source)||"cand",conf:round(conf,3),eqs:round(eqs,4),qcli:round(qcli,4),amp:amp,quantum:qx};
  }
  function normalize(c){var sum=0,i;for(i=0;i<c.length;i++)sum+=c[i].amp*c[i].amp;if(sum<1e-12){for(i=0;i<c.length;i++){c[i].amp=1/Math.sqrt(Math.max(1,c.length));c[i].prob=1/c.length;}return c;}var inv=1/Math.sqrt(sum);for(i=0;i<c.length;i++){c[i].amp*=inv;c[i].prob=c[i].amp*c[i].amp;}return c;}
  function collapse(c,mode){normalize(c);var best=0,bp=-1,i;for(i=0;i<c.length;i++)if(c[i].prob>bp){bp=c[i].prob;best=i;}if(mode==="max")return {index:best,method:"max-amp",picked:c[best]};var r=Math.random(),acc=0,idx=best;for(i=0;i<c.length;i++){acc+=c[i].prob;if(r<=acc){idx=i;break;}}if(c[idx].prob<c[best].prob*.35)idx=best;return {index:idx,method:"born+bias",picked:c[idx]};}

  function localCandidates(q){
    var out=[],seen={};
    function add(text,source,conf){text=String(text||"").trim();if(!text||text.length<8)return;var k=text.slice(0,100);if(seen[k])return;seen[k]=1;out.push({text:text,source:source,conf:conf});}
    try{if(G.AKSI_ZERO&&AKSI_ZERO.think){var z=AKSI_ZERO.think(q);if(z)add(z.answer||z.text,"zero",z.confidence!=null?z.confidence:.65);}}catch(e){}
    try{if(G.AKSI_NEURO&&AKSI_NEURO.think){var n=AKSI_NEURO.think(q);if(n)add(n.text||n.answer,"neuro",n.score!=null?n.score:.55);}}catch(e){}
    try{if(G.AKSI_COMPOSE&&AKSI_COMPOSE.think){var c=AKSI_COMPOSE.think(q);if(c)add(c.text,c.mode||"compose",c.confidence!=null?c.confidence:.6);}}catch(e){}
    try{if(G.AKSI_DECISION&&AKSI_DECISION.decide){var d=AKSI_DECISION.decide(q);if(d&&d.answer)add(d.answer,"decision",.7);}}catch(e){}
    add("АКСИ локальный базис: несколько независимых способов ответа оцениваются по релевантности, структуре и квантовому score.","aksi-local",.55);
    return out;
  }
  function llmCandidates(q,n){
    n=Math.min(4,Math.max(1,n||3));
    if(!G.AKSI_WEBLLM||!AKSI_WEBLLM.ready||!AKSI_WEBLLM.ready())return Promise.resolve([]);
    var temps=[.15,.45,.8,1.05],prompts=[q,"Ответь иначе, строго по фактам:\n"+q,"Дай практический вариант:\n"+q,"Проверь альтернативы и ограничения:\n"+q],jobs=[];
    for(var i=0;i<n;i++)(function(idx){jobs.push(AKSI_WEBLLM.complete(prompts[idx],{temperature:temps[idx],max_tokens:320}).then(function(r){return r&&r.text?{text:r.text,source:"webllm-t"+temps[idx],conf:.82-idx*.04}:null;}).catch(function(){return null;}));})(i);
    return Promise.all(jobs).then(function(a){return a.filter(Boolean);});
  }

  function ask(query,opts){
    opts=opts||{};var q=String(query||"").trim();if(!q)return Promise.resolve({ok:false,error:"empty"});
    var t0=Date.now();emit("start",{query:q});emit("phase",{phase:"memory",note:"читаю локальную память"});
    var memories=readMemory().filter(function(m){return overlap(tok(q),tok(m.query))>.15;}).slice(-5);
    emit("memory-context",{count:memories.length,items:memories});emit("phase",{phase:"basis",note:"собираю независимые кандидаты"});
    var local=opts.includeLocal===false?[]:localCandidates(q);emit("candidates-local",{count:local.length});
    return llmCandidates(q,opts.n||3).then(function(llm){
      emit("candidates-llm",{count:llm.length});var raw=local.concat(llm);
      if(!raw.length)raw=localCandidates(q);
      emit("phase",{phase:"superpose",note:"строю амплитуды и вероятности"});var scored=raw.map(function(c){return scoreCandidate(q,c.text,c);});normalize(scored);
      emit("superposition",{states:scored.map(function(c,i){return {i:i,source:c.source,prob:round(c.prob,4),amp:round(c.amp,4),eqs:c.eqs,qcli:c.qcli,preview:c.text.slice(0,180)};})});
      emit("phase",{phase:"collapse",note:"выберите состояние или выполните измерение"});
      var col=opts.selectedIndex!=null?{index:Math.max(0,Math.min(scored.length-1,+opts.selectedIndex)),method:"user-selection",picked:scored[Math.max(0,Math.min(scored.length-1,+opts.selectedIndex))]}:collapse(scored,opts.mode||"born");
      var picked=col.picked,finalQx=null;
      function finish(){var seal={alg:"FNV-superpose-2",hash:fnv(q+"|"+picked.text+"|"+col.index),did:"did:aksi:local:superpose",ts:Date.now()};var session={ok:true,version:VER,query:q,answer:picked.text,source:picked.source,collapse:{index:col.index,method:col.method,prob:round(picked.prob,4)},scores:{eqs:picked.eqs,qcli:picked.qcli,amp:round(picked.amp,4)},superposition:scored.map(function(c,i){return {i:i,source:c.source,prob:round(c.prob,4),amp:round(c.amp,4),eqs:c.eqs,qcli:c.qcli,text:c.text,selected:i===col.index};}),quantum:finalQx,memoryContext:memories,seal:seal,offline:!(G.AKSI_WEBLLM&&AKSI_WEBLLM.ready&&AKSI_WEBLLM.ready()),ms:Date.now()-t0};lastSession=session;emit("collapsed",session);emit("done",{ms:session.ms,index:col.index});return session;}
      try{if(G.AKSI_QPIPE&&AKSI_QPIPE.processAnswer)return AKSI_QPIPE.processAnswer(q,picked.text,{force:true}).then(function(qp){finalQx=qp&&(qp.quantum||qp);return finish();}).catch(function(){return finish();});if(G.AKSI_QUANTUM&&AKSI_QUANTUM.answerGate)finalQx=AKSI_QUANTUM.answerGate(q,picked.text);}catch(e){}
      return finish();
    });
  }

  function injectUI(){
    if(!document.body||document.getElementById("aksiSuperposePro"))return;
    var style=document.createElement("style");style.id="aksiSuperposeProStyle";style.textContent=`
      #aksiSuperposePro{margin:12px 0;display:grid;gap:12px}.asp-card{background:rgba(12,19,38,.94);border:1px solid rgba(110,168,255,.25);border-radius:16px;padding:14px}.asp-title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.asp-title b{font-size:13px;letter-spacing:.05em;text-transform:uppercase}.asp-muted{color:#8b9bb8;font-size:12px}.asp-actions{display:flex;flex-wrap:wrap;gap:7px}.asp-btn{border:1px solid rgba(110,168,255,.28);background:rgba(255,255,255,.05);color:#e8eefc;border-radius:10px;padding:8px 11px;font-weight:700;cursor:pointer}.asp-btn.primary{background:linear-gradient(135deg,#3b6cff,#7c5cff);border:0}.asp-states{display:grid;gap:8px}.asp-state{border:1px solid rgba(110,168,255,.2);border-radius:12px;padding:10px;cursor:pointer}.asp-state.sel{border-color:#3ddea8;box-shadow:0 0 0 1px rgba(61,222,168,.2)}.asp-state .line{display:flex;justify-content:space-between;font-size:11px;color:#8b9bb8}.asp-bar{height:6px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;margin:7px 0}.asp-bar i{display:block;height:100%;background:linear-gradient(90deg,#3b6cff,#3ddea8)}.asp-text{font-size:13px;line-height:1.45;white-space:pre-wrap}.asp-quantum{height:220px;position:relative;overflow:hidden;border-radius:14px;background:radial-gradient(circle at 50% 50%,rgba(80,120,255,.16),transparent 55%),#080e1e}.asp-quantum canvas{width:100%;height:100%}.asp-memory{max-height:240px;overflow:auto;display:grid;gap:7px}.asp-mem{border:1px solid rgba(110,168,255,.16);border-radius:10px;padding:9px}.asp-mem b{font-size:12px}.asp-mem p{font-size:12px;color:#b8c4da;margin-top:4px}.asp-mem button{float:right}.asp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.asp-stat{padding:10px;border-radius:10px;background:rgba(255,255,255,.035)}.asp-stat strong{display:block;font-size:18px}.asp-stat span{font-size:11px;color:#8b9bb8}@media(max-width:600px){.asp-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
    var root=document.createElement("section");root.id="aksiSuperposePro";root.innerHTML=`
      <div class="asp-card"><div class="asp-title"><b>АКСИ ИИ · единый контур</b><span class="asp-muted" id="aspStatus">готов</span></div><div class="asp-muted">Все кандидаты остаются видимыми. Ты сама выбираешь ответ или запускаешь коллапс. Локальная память хранится в этом браузере.</div><div class="asp-actions" style="margin-top:10px"><button class="asp-btn primary" id="aspSave">💾 Сохранить выбранный ответ</button><button class="asp-btn" id="aspCollapse">⚛️ Коллапс</button><button class="asp-btn" id="aspClearMem">Очистить память</button></div></div>
      <div class="asp-card"><div class="asp-title"><b>Квантовый симулятор</b><span class="asp-muted" id="aspQInfo">0 состояний</span></div><div class="asp-quantum"><canvas id="aspCanvas"></canvas></div><div class="asp-grid" style="margin-top:8px"><div class="asp-stat"><strong id="aspEntropy">—</strong><span>энтропия суперпозиции</span></div><div class="asp-stat"><strong id="aspSelected">—</strong><span>выбранное состояние</span></div></div></div>
      <div class="asp-card"><div class="asp-title"><b>Вся память АКСИ</b><span class="asp-muted" id="aspMemCount">0</span></div><div class="asp-memory" id="aspMemory"></div></div>`;
    var anchor=document.getElementById("boxAns")||document.querySelector(".foot");anchor&&anchor.parentNode.insertBefore(root,anchor.nextSibling);

    var canvas=document.getElementById("aspCanvas"),ctx=canvas.getContext("2d"),states=[],selected=0;
    function resize(){var r=canvas.getBoundingClientRect(),d=window.devicePixelRatio||1;canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);ctx.setTransform(d,0,0,d,0,0);draw();}window.addEventListener("resize",resize);
    function draw(){var w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);var cx=w/2,cy=h/2,R=Math.min(w,h)*.34;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.strokeStyle="rgba(110,168,255,.25)";ctx.stroke();states.forEach(function(s,i){var a=(Math.PI*2*i/Math.max(1,states.length))-(Math.PI/2),rad=R*(.55+.4*Math.sqrt(s.prob||0)),x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.strokeStyle=i===selected?"rgba(61,222,168,.8)":"rgba(110,168,255,.45)";ctx.stroke();ctx.beginPath();ctx.arc(x,y,5+14*Math.sqrt(s.prob||0),0,Math.PI*2);ctx.fillStyle=i===selected?"rgba(61,222,168,.8)":"rgba(110,168,255,.65)";ctx.fill();});ctx.beginPath();ctx.arc(cx,cy,8,0,Math.PI*2);ctx.fillStyle="rgba(124,92,255,.9)";ctx.fill();}
    function renderStates(list){states=list||[];document.getElementById("aspQInfo").textContent=states.length+" состояний";var root=document.getElementById("states"),probs=states.map(function(s){return +s.prob||0;}),ent=0;probs.forEach(function(p){if(p>0)ent-=p*Math.log2(p);});document.getElementById("aspEntropy").textContent=states.length?ent.toFixed(3):"—";document.getElementById("aspSelected").textContent=states[selected]?((states[selected].prob*100).toFixed(1)+"%"):"—";draw();if(root){Array.from(root.children).forEach(function(el,i){el.onclick=function(){selected=i;document.getElementById("aspSelected").textContent=((states[i].prob||0)*100).toFixed(1)+"%";Array.from(root.children).forEach(function(x,j){x.classList.toggle("sel",j===i);});draw();};});}}
    function renderMemory(){var list=readMemory(),r=document.getElementById("aspMemory");document.getElementById("aspMemCount").textContent=list.length+" записей";r.innerHTML="";if(!list.length){r.innerHTML='<div class="asp-muted">Память пуста. Сохрани ответ — он появится здесь.</div>';return;}list.slice().reverse().forEach(function(m){var d=document.createElement("div");d.className="asp-mem";d.innerHTML='<button class="asp-btn" data-id="'+m.id+'">×</button><b>'+new Date(m.ts).toLocaleString()+" · "+(m.source||"aksi")+'</b><p><strong>Q:</strong> '+escapeHtml(m.query)+'</p><p><strong>A:</strong> '+escapeHtml(m.answer).slice(0,700)+'</p>';d.querySelector("button").onclick=function(){removeMemory(m.id);renderMemory();};r.appendChild(d);});}
    function escapeHtml(s){return String(s||"").replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}
    document.getElementById("aspSave").onclick=function(){var s=lastSession;if(!s){document.getElementById("aspStatus").textContent="сначала получи ответ";return;}if(states[selected]){s.answer=states[selected].text;s.source=states[selected].source;s.collapse={index:selected,method:"user-selection",prob:states[selected].prob};}saveMemory(s);renderMemory();document.getElementById("aspStatus").textContent="сохранено ✓";};
    document.getElementById("aspCollapse").onclick=function(){if(!lastSession||!states.length)return;var col=collapse(states.map(function(s){return {amp:Math.sqrt(s.prob||0),prob:s.prob,text:s.text,source:s.source,eqs:s.eqs,qcli:s.qcli};}),"born");selected=col.index;document.getElementById("aspStatus").textContent="коллапс → состояние "+selected;draw();};
    document.getElementById("aspClearMem").onclick=function(){clearMemory();renderMemory();document.getElementById("aspStatus").textContent="память очищена";};
    renderMemory();resize();
    on(function(ev){if(ev.event==="superposition"){renderStates(ev.data.states||[]);}if(ev.event==="collapsed"){lastSession=ev.data;selected=ev.data.collapse.index||0;renderStates(ev.data.superposition||[]);document.getElementById("aspStatus").textContent="ответ готов · можно выбрать и сохранить";}});
  }
  function status(){return {version:VER,webllm:G.AKSI_WEBLLM?G.AKSI_WEBLLM.status():null,quantum:!!(G.AKSI_QUANTUM||G.AKSI_QPIPE),memory:readMemory().length,last:lastSession&&{query:lastSession.query,index:lastSession.collapse&&lastSession.collapse.index,ms:lastSession.ms}};}
  G.AKSI_SUPERPOSE={version:VER,ask:ask,on:on,status:status,last:function(){return lastSession;},memory:function(){return readMemory();},saveMemory:saveMemory,clearMemory:clearMemory,removeMemory:removeMemory};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",injectUI);else injectUI();
})(typeof window!=="undefined"?window:globalThis);
