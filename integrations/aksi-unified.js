/* AKSI Unified Integration Layer */
(function(){
  'use strict';
  const REGISTRY='/integrations/repository-registry.json', API_KEY='AKSI_API_ENDPOINT_V1';
  const MODULES=[
    ['AKSI','/aksi/'],['Apps · 21+','/apps/'],['Chat','/#chat'],['Studio','/studio/'],['Kernel','/kernel/'],['Trust / Proof','/proof/'],
    ['Lab','/lab/'],['Quantum','/quantum/'],['AKSII Matrix','/aksii-matrix/'],['Globe','/globe/'],['Earth 3D','/earth3d/'],
    ['Dream Journal','/dreams/'],['Sovereign','/sovereign/'],['Contour','/contour/'],['Search','/search/'],['Pulse','/pulse/'],
    ['Network','/network/'],['Offer','/offer/'],['Wake','/wake/'],['Ecosystem','/ecosystem.json']
  ];
  const esc=s=>String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const getApi=()=>{try{return localStorage.getItem(API_KEY)||''}catch(_){return ''}};
  const setApi=v=>{try{localStorage.setItem(API_KEY,v.trim().replace(/\/$/,''))}catch(_){} };
  async function api(path,opts={}){const base=getApi();if(!base)throw new Error('Backend endpoint is not configured. AKSI remains local-first.');const r=await fetch(base+path,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={raw:text}}if(!r.ok)throw new Error(data.detail||data.message||r.statusText||'Backend request failed');return data;}
  async function loadRegistry(){const r=await fetch(REGISTRY,{cache:'no-store'});if(!r.ok)throw new Error('Registry unavailable');return r.json()}
  function panel(){
    if(document.getElementById('aksi-unified-panel'))return;
    const b=document.createElement('button');b.type='button';b.className='pill';b.id='aksi-unified-open';b.textContent='Ecosystem';
    const host=document.querySelector('.top-actions');if(host)host.appendChild(b);else document.body.appendChild(b);
    const shade=document.createElement('div');shade.id='aksi-unified-panel';shade.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9999;display:none;padding:20px;overflow:auto';
    shade.innerHTML='<div style="max-width:1040px;margin:auto;background:#0b101a;border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:22px;color:#eef3fb;font:14px system-ui"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><b style="font-size:20px">AKSI Unified Ecosystem</b><div style="opacity:.7;margin-top:4px">Один канонический сайт · все доступные модули · сеть только по разрешению</div></div><button id="aksi-unified-close" type="button">Закрыть</button></div><h3 style="margin:22px 0 8px">Модули сайта</h3><div id="aksi-module-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px"></div><div style="margin:22px 0;padding:14px;border:1px solid rgba(255,255,255,.1);border-radius:14px"><b>Backend capability — OFF по умолчанию</b><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><input id="aksi-api-endpoint" placeholder="https://your-aksi-api.example" style="flex:1;min-width:240px;padding:10px;border-radius:10px;background:#111927;color:#fff;border:1px solid #27354a"><button id="aksi-api-save" type="button">Сохранить</button><button id="aksi-api-test" type="button">Health</button></div><div id="aksi-api-result" style="margin-top:8px;opacity:.75"></div></div><h3 style="margin:22px 0 8px">Репозитории-источники</h3><div id="aksi-unified-list">Загрузка реестра…</div></div>';
    document.body.appendChild(shade);
    document.getElementById('aksi-module-grid').innerHTML=MODULES.map(x=>'<a href="'+esc(x[1])+'" style="display:block;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:11px;color:#eef3fb;text-decoration:none">'+esc(x[0])+'</a>').join('');
    b.addEventListener('click',()=>{shade.style.display='block';const i=document.getElementById('aksi-api-endpoint');if(i)i.value=getApi();loadRegistry().then(r=>{document.getElementById('aksi-unified-list').innerHTML=r.repositories.map(x=>'<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07)"><span><b>'+esc(x.name)+'</b><small style="display:block;opacity:.6">'+esc(x.role)+'</small></span><span style="opacity:.7">'+esc(x.action)+'</span></div>').join('')}).catch(e=>{document.getElementById('aksi-unified-list').textContent=e.message})});
    document.getElementById('aksi-unified-close').addEventListener('click',()=>shade.style.display='none');
    document.getElementById('aksi-api-save').addEventListener('click',()=>{setApi(document.getElementById('aksi-api-endpoint').value);document.getElementById('aksi-api-result').textContent=getApi()?'Endpoint сохранён. Сеть остаётся opt-in.':'Endpoint очищен; АКСИ снова полностью локальна.'});
    document.getElementById('aksi-api-test').addEventListener('click',async()=>{const out=document.getElementById('aksi-api-result');out.textContent='Проверка…';try{const r=await api('/health');out.textContent='Backend OK · '+JSON.stringify(r)}catch(e){out.textContent='Backend: '+e.message}});
  }
  window.AKSIUnified={version:'1.1.0',modules:MODULES,registry:loadRegistry,api,endpoint:getApi,setEndpoint:setApi};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',panel);else panel();
})();
