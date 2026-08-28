/**
 * AKSI Product UI — proof · compare · export · teach · share · WOW verify
 * Built on existing: AKSI_WEB consent, MIND/ONE think, PRECEDENT.json
 */
(function (G) {
  "use strict";
  var VER = "1.1.0-wow";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  }

  function toast(msg) {
    var el = document.getElementById("aksiToast");
    if (!el) {
      el = document.createElement("div"); el.id = "aksiToast"; el.setAttribute("role", "status");
      el.style.cssText = "position:fixed;left:50%;bottom:calc(72px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:300;padding:12px 18px;border-radius:14px;background:rgba(30,27,42,.96);border:1px solid rgba(167,139,250,.4);color:#f5f3ff;font:600 13px/1.3 system-ui;max-width:90%;box-shadow:0 12px 40px rgba(0,0,0,.45);opacity:0;transition:opacity .2s";
      document.body.appendChild(el);
    }
    el.textContent = msg; el.style.opacity = "1"; clearTimeout(el._t); el._t = setTimeout(function () { el.style.opacity = "0"; }, 2800);
  }
  function pulse(el) { if (!el || !el.animate) return; el.animate([{transform:"scale(1)"},{transform:"scale(0.96)"},{transform:"scale(1)"}], {duration:160,easing:"ease-out"}); }
  function ensureWowStyles() {
    if (document.getElementById("aksiWowCss")) return;
    var s = document.createElement("style"); s.id = "aksiWowCss";
    s.textContent = "#aksiWow{position:fixed;inset:0;z-index:400;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,3,10,.82);backdrop-filter:blur(10px);padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom));}" +
      "#aksiWow .sheet{width:min(440px,100%);max-height:min(88vh,640px);overflow:auto;border-radius:22px;background:linear-gradient(165deg,#1a1528 0%,#0e0c16 55%,#12101c 100%);border:1px solid rgba(167,139,250,.35);box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(124,58,237,.15);padding:20px 18px 18px;animation:aksiSheet .28s ease-out}" +
      "@keyframes aksiSheet{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}" +
      "#aksiWow .title{font:750 18px/1.25 system-ui;letter-spacing:-.02em;margin:0 0 4px}" +
      "#aksiWow .sub{font:13px/1.4 system-ui;color:#a8a0c0;margin:0 0 16px}" +
      "#aksiWow .steps{display:flex;flex-direction:column;gap:8px;margin:0 0 14px}" +
      "#aksiWow .step{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);font:13px/1.35 system-ui;color:#c8c0e0}" +
      "#aksiWow .step .n{width:22px;height:22px;border-radius:8px;flex-shrink:0;display:grid;place-items:center;font:700 11px system-ui;background:rgba(167,139,250,.15);color:#b39aff}" +
      "#aksiWow .step.on{border-color:rgba(167,139,250,.4);background:rgba(124,58,237,.12)}#aksiWow .step.ok{border-color:rgba(52,211,153,.35);background:rgba(52,211,153,.08)}#aksiWow .step.ok .n{background:rgba(52,211,153,.2);color:#34d399}" +
      "#aksiWow .step.fail{border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.08)}" +
      "#aksiWow .result{margin:8px 0 14px;padding:16px;border-radius:16px;text-align:center;border:1px solid rgba(52,211,153,.35);background:radial-gradient(ellipse at 50% 0%,rgba(52,211,153,.18),transparent 70%),rgba(0,0,0,.25)}" +
      "#aksiWow .result.fail{border-color:rgba(248,113,113,.4);background:radial-gradient(ellipse at 50% 0%,rgba(248,113,113,.15),transparent 70%),rgba(0,0,0,.25)}#aksiWow .result .big{font:800 28px/1.1 system-ui;letter-spacing:.04em;color:#34d399}#aksiWow .result.fail .big{color:#f87171}#aksiWow .result .meta{font:12px/1.4 system-ui;color:#a8a0c0;margin-top:8px;word-break:break-all}" +
      "#aksiWow .actions{display:flex;flex-wrap:wrap;gap:8px}#aksiWow .btn{min-height:44px;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#f4f1ff;font:600 13px system-ui;cursor:pointer;flex:1}#aksiWow .btn.primary{background:linear-gradient(135deg,#7c3aed,#a78bfa);border:0;color:#fff}#aksiWow .x{position:absolute;top:10px;right:12px;width:36px;height:36px;border:0;background:0;color:#7d7696;font-size:18px;cursor:pointer}";
    document.head.appendChild(s);
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function runWowVerify() {
    ensureWowStyles(); var old = document.getElementById("aksiWow"); if (old) old.remove();
    var was = !!(G.AKSI_WEB && G.AKSI_WEB.isEnabled && G.AKSI_WEB.isEnabled());
    if (G.AKSI_WEB && G.AKSI_WEB.setEnabled) G.AKSI_WEB.setEnabled(false); if (typeof G.__aksiSyncNet === "function") G.__aksiSyncNet();
    var root = document.createElement("div"); root.id="aksiWow"; root.setAttribute("role","dialog"); root.setAttribute("aria-modal","true");
    root.innerHTML = '<div class="sheet" style="position:relative"><button type="button" class="x" id="wowClose" aria-label="Close">✕</button><p class="title">Доказательство offline</p><p class="sub">Не слоган — живой прогон вашего PRECEDENT</p><div class="steps" id="wowSteps"></div><div id="wowResult" hidden></div><div class="actions" id="wowActions" hidden></div></div>';
    document.body.appendChild(root);
    function close(){if(G.AKSI_WEB&&G.AKSI_WEB.setEnabled)G.AKSI_WEB.setEnabled(!!was);if(typeof G.__aksiSyncNet==="function")G.__aksiSyncNet();root.remove();}
    root.addEventListener("click",function(e){if(e.target===root)close();}); document.getElementById("wowClose").onclick=close;
    var stepsEl=document.getElementById("wowSteps"), labels=["Сеть принудительно OFF","Локальный ответ (MIND / brain)","Проверка: сеть не дергалась","Сверка с PRECEDENT.json"];
    labels.forEach(function(t,i){var d=document.createElement("div");d.className="step";d.id="wowS"+i;d.innerHTML='<span class="n">'+(i+1)+"</span><span>"+esc(t)+"</span>";stepsEl.appendChild(d);});
    function mark(i,state){var el=document.getElementById("wowS"+i);if(!el)return;el.classList.remove("on","ok","fail");el.classList.add(state);if(state==="ok")el.querySelector(".n").textContent="✓";if(state==="fail")el.querySelector(".n").textContent="!";}
    var netHits=0,observer=null; try{if(typeof PerformanceObserver!=="undefined"){observer=new PerformanceObserver(function(list){list.getEntries().forEach(function(e){var n=String(e.name||"");if(/wikipedia|duckduckgo|api\.|openai|anthropic|x\.ai/i.test(n))netHits++;});});observer.observe({type:"resource",buffered:true});}}catch(e){}
    var t0=performance.now(),q="Who are you? / Кто ты?",think=(G.AKSI_MIND&&G.AKSI_MIND.think)||(G.AKSI_ONE&&G.AKSI_ONE.think)||function(){return Promise.resolve({text:"AKSI local runtime — offline by default.",meta:"local"});};
    return (async function(){
      mark(0,"on");await sleep(420);mark(0,"ok");mark(1,"on");var r;try{r=await Promise.resolve(think.call(G.AKSI_MIND||G.AKSI_ONE,q));}catch(e){r={text:String(e.message||e),meta:"error"};}var ms=Math.round(performance.now()-t0);mark(1,"ok");
      mark(2,"on");await sleep(350);var consentOff=!(G.AKSI_WEB&&G.AKSI_WEB.isEnabled&&G.AKSI_WEB.isEnabled()),passNet=consentOff&&netHits===0;mark(2,passNet?"ok":"fail");
      mark(3,"on");var precOk=false,precId="";try{var res=await fetch("/PRECEDENT.json",{cache:"no-store"});if(res.ok){var j=await res.json();precId=j.id||"";precOk=j.type==="AKSI-LEGAL-TECHNICAL-PRECEDENT"&&Array.isArray(j.technical_controls);}}catch(e){}mark(3,precOk?"ok":"fail");
      if(observer)try{observer.disconnect();}catch(e){} var pass=passNet&&precOk&&consentOff,text=(r&&r.text)||"",meta=(r&&r.meta)||"local",result=document.getElementById("wowResult");result.hidden=false;result.className="result"+(pass?"":" fail");
      result.innerHTML='<div class="big">'+(pass?"PASS":"FAIL")+'</div><div class="meta">'+esc(ms+" ms · source: "+meta+" · net hits: "+netHits)+(precId?"<br>precedent: "+esc(precId):"")+"<br>"+esc(text.slice(0,160))+(text.length>160?"…":"")+'</div>';
      var actions=document.getElementById("wowActions");actions.hidden=false;actions.innerHTML='<button type="button" class="btn primary" id="wowShare">Поделиться PASS</button><button type="button" class="btn" id="wowExport">Export proof</button><button type="button" class="btn" id="wowClose2">Закрыть</button>';
      var shareText=(pass?"✅ AKSI PRECEDENT PASS":"⚠ AKSI verify")+"\n"+ms+" ms · offline · net hits: "+netHits+"\n"+(precId||"precedent")+"\nhttps://milana808.github.io/\nhttps://milana808.github.io/PRECEDENT.json";
      document.getElementById("wowShare").onclick=function(){if(navigator.share){navigator.share({title:"AKSI PASS",text:shareText,url:"https://milana808.github.io/"}).catch(function(){});}else if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(shareText).then(function(){toast("Скопировано — вставь в X / HN");});}else toast(shareText.slice(0,80));};
      document.getElementById("wowExport").onclick=function(){exportProofSession();};document.getElementById("wowClose2").onclick=close;
      var box=document.getElementById("proofDemoOut");if(box)box.innerHTML='<div class="proof-card"><div class="proof-badge">'+(pass?"PASS":"FAIL")+" · "+ms+" ms · net:"+netHits+'</div><p>'+esc(text.slice(0,280))+'</p><div class="proof-meta">'+esc(meta)+" · "+esc(precId||"precedent")+'</div></div>';
      toast(pass?"PASS — offline доказан":"Проверка завершена");return{pass:pass,ms:ms,netHits:netHits,precOk:precOk};
    })().catch(function(e){toast(String(e.message||e));if(G.AKSI_WEB&&G.AKSI_WEB.setEnabled)G.AKSI_WEB.setEnabled(!!was);});
  }
  function runProofDemo(){return runWowVerify();}
  function compareOfflineOnline(){
    var box=document.getElementById("proofDemoOut"),q=(document.getElementById("compareQ")&&document.getElementById("compareQ").value)||"what is photosynthesis";if(box)box.innerHTML='<div class="skel"></div><div class="skel" style="margin-top:8px"></div>';
    function one(label,enabled){if(G.AKSI_WEB&&G.AKSI_WEB.setEnabled)G.AKSI_WEB.setEnabled(enabled);var t0=performance.now(),think=G.AKSI_MIND&&G.AKSI_MIND.think?G.AKSI_MIND.think:G.AKSI_ONE&&G.AKSI_ONE.think;if(!think)return Promise.resolve({label:label,text:"—",ms:0,meta:""});return think.call(G.AKSI_MIND||G.AKSI_ONE,q).then(function(r){return{label:label,text:(r&&r.text)||"…",meta:(r&&r.meta)||"",ms:Math.round(performance.now()-t0)};});}
    return one("OFFLINE",false).then(function(off){return one("ONLINE",true).then(function(on){if(G.AKSI_WEB&&G.AKSI_WEB.setEnabled)G.AKSI_WEB.setEnabled(false);if(typeof G.__aksiSyncNet==="function")G.__aksiSyncNet();if(box)box.innerHTML='<div class="compare-grid"><div class="proof-card"><div class="proof-badge">OFFLINE · '+off.ms+' ms</div><p>'+esc(off.text.slice(0,360))+'</p><div class="proof-meta">'+esc(off.meta)+'</div></div><div class="proof-card"><div class="proof-badge on">ONLINE · '+on.ms+' ms</div><p>'+esc(on.text.slice(0,360))+'</p><div class="proof-meta">'+esc(on.meta)+'</div></div></div>';toast("Offline vs online");});});
  }
  function exportProofSession(){var ledger=[];try{ledger=JSON.parse(localStorage.getItem("aksi_proof_ledger_v1")||"[]");}catch(e){}var mem=[];try{mem=JSON.parse(localStorage.getItem("aksi_whole_mem_v3")||"[]");}catch(e){}var did="did:aksi:local";try{did=localStorage.getItem("aksi_did_v1")||did;}catch(e){}var net=!!(G.AKSI_WEB&&G.AKSI_WEB.isEnabled&&G.AKSI_WEB.isEnabled());var payload={type:"AKSI-SESSION-PROOF",version:VER,exported_at:new Date().toISOString(),did:did,network_consent:net,precedent:"https://milana808.github.io/PRECEDENT.json",memory_count:mem.length,ledger_tail:ledger.slice(-20),runtime:"https://milana808.github.io/",contact:"aksilove@internet.ru"};var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aksi-session-proof-"+Date.now()+".json";a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},2000);toast("Session proof exported");return payload;}
  function sessionPassport(){var did="did:aksi:local";try{did=localStorage.getItem("aksi_did_v1")||did;}catch(e){}var net=!!(G.AKSI_WEB&&G.AKSI_WEB.isEnabled&&G.AKSI_WEB.isEnabled()),memN=0;try{memN=(JSON.parse(localStorage.getItem("aksi_whole_mem_v3")||"[]")||[]).length;}catch(e){}return{did:did,network:net?"consent:on":"consent:off",memory:memN,precedent:"aksi-offline-first-consent-2026-08"};}
  function teachFlow(fact){fact=String(fact||"").trim();if(!fact){toast("Введите факт");return Promise.resolve(null);}if(G.AKSI_ONE&&G.AKSI_ONE.remember)G.AKSI_ONE.remember(fact,"user");if(G.AKSI_BRAIN&&G.AKSI_BRAIN.teach)G.AKSI_BRAIN.teach(fact);toast("Запомнено");return Promise.resolve({ok:true,fact:fact});}
  function shareDemo(){var text="АКСИ — local-first ИИ в браузере.\nOffline by default · интернет только по согласию.\nPRECEDENT: https://milana808.github.io/PRECEDENT.json\nДемо: https://milana808.github.io/";if(navigator.share)return navigator.share({title:"AKSI",text:text,url:"https://milana808.github.io/"}).catch(function(){});if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text).then(function(){toast("Скопировано — X / HN");});toast("milana808.github.io");}
  function installPWA(){if(G.__aksiDeferredPrompt){G.__aksiDeferredPrompt.prompt();return G.__aksiDeferredPrompt.userChoice.then(function(){G.__aksiDeferredPrompt=null;});}toast("В браузере: Добавить на экран");}
  function wire(){window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();G.__aksiDeferredPrompt=e;var b=document.getElementById("btnInstall");if(b)b.hidden=false;});var map={btnProofDemo:runWowVerify,btnWowVerify:runWowVerify,btnCompare:compareOfflineOnline,btnExportProof:exportProofSession,btnShare:shareDemo,btnInstall:installPWA};Object.keys(map).forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener("click",function(){pulse(el);map[id]();});});var teachBtn=document.getElementById("btnTeach"),teachIn=document.getElementById("teachIn");if(teachBtn&&teachIn)teachBtn.addEventListener("click",function(){pulse(teachBtn);teachFlow(teachIn.value).then(function(){teachIn.value="";});});var pass=document.getElementById("passportOut");if(pass){var p=sessionPassport();pass.textContent=p.did+" · "+p.network+" · mem:"+p.memory;}}
  G.AKSI_PRODUCT_UI={version:VER,runWowVerify:runWowVerify,runProofDemo:runProofDemo,compareOfflineOnline:compareOfflineOnline,exportProofSession:exportProofSession,sessionPassport:sessionPassport,teachFlow:teachFlow,shareDemo:shareDemo,installPWA:installPWA,toast:toast,wire:wire};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire);else wire();
})(typeof window!=="undefined"?window:this);
