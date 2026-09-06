(function(){
  'use strict';
  const KEY='aksi_platform_v1';
  const state={events:[],models:[],online:navigator.onLine!==false};
  const CATALOG=[
    {id:'gpt',name:'GPT-compatible',family:'Generative / API',mode:'remote-or-gateway',status:'adapter',note:'Provider-neutral adapter; no vendor key is stored in browser.'},
    {id:'bert',name:'BERT / encoder',family:'NLP / embeddings',mode:'local-or-server',status:'adapter',note:'Architecture slot for masked-language and embedding workloads.'},
    {id:'transformers',name:'Transformers.js',family:'NLP / vision / audio',mode:'local-WASM',status:'local',note:'Runs compatible transformer models in-browser when weights are available.'},
    {id:'webllm',name:'WebLLM / WebGPU',family:'LLM',mode:'local-GPU',status:'local',note:'Browser-local LLM runtime; model download is explicit.'},
    {id:'wasm',name:'WASM inference',family:'portable runtime',mode:'local-CPU',status:'local',note:'Fallback path for devices without WebGPU.'},
    {id:'onnx',name:'ONNX Runtime Web',family:'ML runtime',mode:'local-WASM/WebGPU',status:'adapter',note:'Portable execution target for ONNX models.'},
    {id:'custom',name:'AKSI Custom Adapter',family:'any model',mode:'plugin',status:'ready',note:'Uniform request/response contract for future Python, JS, Rust or native runtimes.'}
  ];
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  function log(type,data){state.events.push({t:new Date().toISOString(),type,data});state.events=state.events.slice(-100);try{localStorage.setItem(KEY,JSON.stringify(state.events))}catch(e){};renderMonitor()}
  function load(){try{state.events=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){state.events=[]};state.online=navigator.onLine!==false}
  function modelCard(m){return '<article class="model"><div><b>'+esc(m.name)+'</b><span>'+esc(m.family)+'</span></div><i class="tag '+esc(m.status)+'">'+esc(m.mode)+'</i><p>'+esc(m.note)+'</p></article>'}
  function renderModels(){ $('modelGrid').innerHTML=CATALOG.map(modelCard).join('') }
  function renderMonitor(){
    $('netState').textContent=state.online?'ONLINE / OFFLINE-READY':'OFFLINE / LOCAL PATH';
    $('netDot').textContent=state.online?'●':'●';
    $('eventCount').textContent=state.events.length;
    $('lastEvent').textContent=state.events.length?state.events[state.events.length-1].type:'none';
    $('eventLog').textContent=state.events.slice(-8).map(e=>new Date(e.t).toLocaleTimeString()+'  '+e.type+'  '+JSON.stringify(e.data)).join('\n')||'No runtime events yet.';
  }
  function quantumDemo(kind){
    const q=window.AKSIQuantum;
    if(q&&q.run){ q.run('AKSI quantum '+kind).then(r=>{ $('quantumOut').textContent=JSON.stringify(r,null,2);log('quantum.run',{kind,trace_hash:r.trace_hash,entropy:r.entropy}); }).catch(e=>{ $('quantumOut').textContent='Quantum runtime error: '+e.message;log('quantum.error',{message:e.message}) });return; }
    const examples={bell:{state:'(|00⟩ + |11⟩) / √2',use:'correlation / education'},grover:{state:'marked-state amplitude amplification',use:'search demonstration'},qft:{state:'quantum Fourier transform',use:'phase/frequency demonstration'}};
    $('quantumOut').textContent=JSON.stringify({schema:'AKSI-QUANTUM-DEMO-1',kind,simulator:'not-loaded',example:examples[kind]||examples.bell},null,2);log('quantum.demo',{kind})
  }
  function boot(){
    load();renderModels();renderMonitor();
    $('runHealth').onclick=()=>{const checks={webgpu:!!navigator.gpu,crypto:!!(window.crypto&&crypto.subtle),storage:(()=>{try{localStorage.setItem('_a','1');localStorage.removeItem('_a');return true}catch(e){return false}})(),serviceWorker:'serviceWorker' in navigator,online:navigator.onLine!==false};$('healthOut').textContent=JSON.stringify(checks,null,2);log('health.scan',checks)};
    $('clearLog').onclick=()=>{state.events=[];localStorage.removeItem(KEY);renderMonitor()};
    $('bell').onclick=()=>quantumDemo('bell');$('grover').onclick=()=>quantumDemo('grover');$('qft').onclick=()=>quantumDemo('qft');
    $('exportState').onclick=()=>{const blob=new Blob([JSON.stringify({schema:'AKSI-PLATFORM-STATE-1',events:state.events,models:CATALOG},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aksi-platform-state.json';a.click();URL.revokeObjectURL(a.href);log('state.export',{})};
    addEventListener('online',()=>{state.online=true;log('network.online',{})});addEventListener('offline',()=>{state.online=false;log('network.offline',{})});
    log('platform.boot',{version:'1.0',localFirst:true,models:CATALOG.length});
  }
  window.AKSIPlatform={version:'1.0',catalog:CATALOG,log,quantumDemo};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
