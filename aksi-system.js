(function(){
  'use strict';
  const KEY='AKSI_SYSTEM_DIAGNOSTICS_V1';
  const state={startedAt:new Date().toISOString(),errors:[],online:navigator.onLine,modules:{},version:'1.0.0'};
  function record(type,detail){
    const item={type,detail:String(detail||''),at:new Date().toISOString()};
    state.errors.push(item); state.errors=state.errors.slice(-25);
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
    window.dispatchEvent(new CustomEvent('aksi:system',{detail:item}));
  }
  function scan(){
    const names=['AKSI','AKSIControl','AKSIOrchestrator','AKSIRuntime'];
    names.forEach(n=>{state.modules[n]=typeof window[n]!=='undefined';});
    state.modules.crypto=!!(window.crypto&&crypto.subtle);
    state.modules.storage=(()=>{try{localStorage.setItem('__aksi_probe','1');localStorage.removeItem('__aksi_probe');return true;}catch{return false;}})();
    state.modules.serviceWorker='serviceWorker' in navigator;
    state.online=navigator.onLine;
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
    return {...state,errors:[...state.errors],modules:{...state.modules}};
  }
  function exportDiagnostics(){
    const payload=scan();
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aksi-system-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  window.addEventListener('error',e=>record('runtime-error',e.message||'unknown error'));
  window.addEventListener('unhandledrejection',e=>record('promise-error',e.reason&&e.reason.message||e.reason||'unknown rejection'));
  window.addEventListener('online',()=>{state.online=true;scan();});
  window.addEventListener('offline',()=>{state.online=false;scan();});
  window.AKSISystem={version:state.version,state:scan,diagnostics:scan,export:exportDiagnostics,record};
  document.addEventListener('DOMContentLoaded',()=>{
    const run=()=>{
      const s=scan();
      document.documentElement.dataset.aksiOnline=s.online?'true':'false';
      document.documentElement.dataset.aksiReady='true';
      window.dispatchEvent(new CustomEvent('aksi:system-ready',{detail:s}));
    };
    if('requestIdleCallback' in window) requestIdleCallback(run,{timeout:1200}); else setTimeout(run,0);
  });
})();
