/* AKSI Enhancements — browser-native cognitive control plane. No secrets, no third-party SDKs. */
(function () {
  'use strict';
  const NS='AKSI_ENHANCED_V1', MEM='AKSI_LOCAL_MEMORY_V1', SETTINGS='AKSI_SETTINGS_V1', KEY='AKSI_IDENTITY_JWK_V1';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const safe=(fn,fallback)=>{try{return fn()}catch{return fallback}};
  const load=(k,d)=>safe(()=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),d);
  const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const esc=s=>String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const settings=()=>load(SETTINGS,{backend:'',language:navigator.language||'ru-RU',telemetry:false});
  const memory=()=>load(MEM,[]);
  const stable=v=>{if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(stable).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'};
  async function sha(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  async function identity(){
    const cached=safe(()=>JSON.parse(localStorage.getItem(KEY)||'null'),null); if(cached)return cached;
    if(!crypto.subtle?.generateKey)return null;
    try{
      const kp=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
      const pub=await crypto.subtle.exportKey('jwk',kp.publicKey),priv=await crypto.subtle.exportKey('jwk',kp.privateKey);
      const id={algorithm:'Ed25519',publicKey:pub,privateKey:priv,createdAt:new Date().toISOString()};save(KEY,id);return id;
    }catch{return null}
  }
  async function sign(text){const id=await identity();if(!id)return null;try{const key=await crypto.subtle.importKey('jwk',id.privateKey,{name:'Ed25519'},false,['sign']);const sig=await crypto.subtle.sign('Ed25519',key,new TextEncoder().encode(text));return btoa(String.fromCharCode(...new Uint8Array(sig)));}catch{return null}}
  async function publicFingerprint(){const id=await identity();if(!id)return 'unavailable';return (await sha(stable(id.publicKey))).slice(0,32)}
  function remember(text,kind='note',source='user'){
    const v=memory();const item={id:crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random(),text:String(text).trim(),kind,source,createdAt:new Date().toISOString()};if(!item.text)return null;v.push(item);save(MEM,v.slice(-500));return item;
  }
  function searchMemory(q){const s=String(q).toLowerCase().trim();return memory().filter(x=>x.text.toLowerCase().includes(s)).slice(-20).reverse()}
  function download(name,data,type='application/json'){const a=document.createElement('a');const u=URL.createObjectURL(new Blob([data],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
  function panel(){
    if($('#aksiControlPlane'))return;
    const el=document.createElement('section');el.id='aksiControlPlane';el.innerHTML=`
      <div class="aksi-cp-head"><div><span class="aksi-cp-kicker">AKSI CONTROL PLANE</span><b>Личный контур</b></div><button id="aksiCpClose" aria-label="Закрыть">×</button></div>
      <div class="aksi-cp-tabs"><button data-cpt="brain">Мозг</button><button data-cpt="memory">Память</button><button data-cpt="trust">Идентичность</button><button data-cpt="network">Сеть</button></div>
      <div class="aksi-cp-body">
        <div data-cpv="brain"><div class="aksi-cp-card"><b>Локальный когнитивный цикл</b><p>Запрос → память → локальный ответ → evidence. Внешняя модель подключается только явно.</p><textarea id="aksiBrainInput" placeholder="Напишите задачу…"></textarea><button class="aksi-cp-primary" id="aksiBrainRun">Запустить локальный цикл</button><pre id="aksiBrainOut"></pre></div></div>
        <div data-cpv="memory" hidden><div class="aksi-cp-card"><b>Локальная память</b><p>Записи хранятся в localStorage этого браузера.</p><input id="aksiMemInput" placeholder="Что запомнить?"><button id="aksiMemSave">Запомнить</button><input id="aksiMemSearch" placeholder="Поиск по памяти"><div id="aksiMemList"></div><button id="aksiMemExport">Экспорт памяти</button><button id="aksiMemClear">Очистить память</button></div></div>
        <div data-cpv="trust" hidden><div class="aksi-cp-card"><b>Суверенная идентичность</b><p>Ключ генерируется на устройстве. Никаких серверных секретов.</p><dl><dt>Алгоритм</dt><dd id="aksiIdAlg">…</dd><dt>Fingerprint</dt><dd id="aksiIdFp">…</dd></dl><button id="aksiIdRefresh">Проверить identity</button><button id="aksiIdExport">Экспорт публичного ключа</button></div></div>
        <div data-cpv="network" hidden><div class="aksi-cp-card"><b>Граница доверия</b><p>По умолчанию сеть выключена. Укажите backend только если сознательно хотите его использовать.</p><input id="aksiBackend" placeholder="https://…"><label><input type="checkbox" id="aksiTelemetry"> Разрешить telemetry</label><button id="aksiNetSave">Сохранить</button><button id="aksiNetTest">Проверить backend</button><pre id="aksiNetOut"></pre></div></div>
      </div>`;
    document.body.appendChild(el);
    const css=document.createElement('style');css.textContent=`#aksiControlPlane{position:fixed;inset:auto 16px 16px auto;width:min(520px,calc(100vw - 32px));max-height:min(760px,calc(100vh - 32px));z-index:99999;background:#0b101a;color:#e9edf7;border:1px solid #293448;border-radius:20px;box-shadow:0 24px 80px #000b;font:14px system-ui;overflow:hidden}#aksiControlPlane button{background:#111a29;color:#e9edf7;border:1px solid #2a3950;border-radius:10px;padding:9px 12px;cursor:pointer}#aksiControlPlane button:hover{border-color:#6c8cff}.aksi-cp-head{display:flex;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #222d3d}.aksi-cp-head b{display:block;font-size:16px}.aksi-cp-kicker{font-size:10px;letter-spacing:.16em;color:#8aa0ff}.aksi-cp-tabs{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid #222d3d;overflow:auto}.aksi-cp-tabs button{white-space:nowrap}.aksi-cp-body{padding:14px;overflow:auto;max-height:calc(100vh - 170px)}.aksi-cp-card{background:#0f1724;border:1px solid #253247;border-radius:15px;padding:15px}.aksi-cp-card p{color:#9aa8bd;line-height:1.5}.aksi-cp-card textarea,.aksi-cp-card input{width:100%;box-sizing:border-box;background:#080d15;color:#eef3ff;border:1px solid #2a3850;border-radius:10px;padding:11px;margin:6px 0}.aksi-cp-primary{margin-top:6px}.aksi-cp-card pre{white-space:pre-wrap;word-break:break-word;color:#a9e5c0;background:#080d15;padding:10px;border-radius:10px;min-height:20px}.aksi-cp-card dl{display:grid;grid-template-columns:110px 1fr;gap:8px}.aksi-cp-card dd{margin:0;word-break:break-all}.aksi-cp-card button{margin:6px 6px 0 0}.aksi-mem-row{padding:9px 0;border-bottom:1px solid #202b3b}.aksi-mem-row small{display:block;color:#74839a;margin-top:3px}`;document.head.appendChild(css);
    const setTab=t=>{$$('[data-cpv]',el).forEach(x=>x.hidden=x.dataset.cpv!==t);$$('[data-cpt]',el).forEach(x=>x.classList.toggle('aksi-active',x.dataset.cpt===t))};
    $$('[data-cpt]',el).forEach(b=>b.onclick=()=>setTab(b.dataset.cpt));$('#aksiCpClose').onclick=()=>el.remove();
    const renderMem=()=>{const q=$('#aksiMemSearch').value||'';const list=searchMemory(q);$('#aksiMemList').innerHTML=list.length?list.map(x=>`<div class="aksi-mem-row"><b>${esc(x.text)}</b><small>${esc(x.kind)} · ${new Date(x.createdAt).toLocaleString()}</small></div>`).join(''):'<p>Память пуста.</p>'};
    $('#aksiMemSave').onclick=()=>{const i=$('#aksiMemInput');if(i.value.trim()){remember(i.value);i.value='';renderMem()}};$('#aksiMemSearch').oninput=renderMem;$('#aksiMemClear').onclick=()=>{if(confirm('Очистить локальную память АКСИ?')){localStorage.removeItem(MEM);renderMem()}};$('#aksiMemExport').onclick=()=>download('aksi-memory.json',JSON.stringify({schema:'AKSI-MEMORY-1',exportedAt:new Date().toISOString(),items:memory()},null,2));
    $('#aksiIdRefresh').onclick=async()=>{$('#aksiIdAlg').textContent=(await identity())?.algorithm||'unavailable';$('#aksiIdFp').textContent=await publicFingerprint()};$('#aksiIdExport').onclick=async()=>{const id=await identity();if(id)download('aksi-public-key.json',JSON.stringify({algorithm:id.algorithm,publicKey:id.publicKey,createdAt:id.createdAt},null,2))};
    $('#aksiNetSave').onclick=()=>{const s=settings();s.backend=$('#aksiBackend').value.trim().replace(/\/$/,'');s.telemetry=$('#aksiTelemetry').checked;save(SETTINGS,s);$('#aksiNetOut').textContent='Настройки сохранены локально.'};$('#aksiNetTest').onclick=async()=>{const u=$('#aksiBackend').value.trim();if(!u){$('#aksiNetOut').textContent='Backend не указан.';return}const t=performance.now();try{const r=await fetch(u,{method:'GET',cache:'no-store'});$('#aksiNetOut').textContent=`HTTP ${r.status} · ${Math.round(performance.now()-t)} ms`;}catch(e){$('#aksiNetOut').textContent='Сеть недоступна: '+e.message}};
    $('#aksiBrainRun').onclick=async()=>{const q=$('#aksiBrainInput').value.trim();if(!q)return;const hits=searchMemory(q);const local=`LOCAL COGNITIVE RESULT\n\nЗапрос: ${q}\n\nПамять: ${hits.length ? hits.map(x=>'• '+x.text).join('\n') : 'нет совпадений'}\n\nСтатус: computed locally\nВнешняя истина: не проверялась.`;$('#aksiBrainOut').textContent=local;remember(q,'query','local-brain');};
    const s=settings();$('#aksiBackend').value=s.backend;$('#aksiTelemetry').checked=!!s.telemetry;$('#aksiIdRefresh').click();renderMem();setTab('brain');
  }
  function mount(){
    const trigger=document.createElement('button');trigger.id='aksiControlTrigger';trigger.type='button';trigger.textContent='АКСИ CORE';trigger.title='Открыть личный контур';Object.assign(trigger.style,{position:'fixed',right:'16px',bottom:'76px',zIndex:9998,padding:'9px 12px',borderRadius:'999px',border:'1px solid #40547a',background:'#0c1422',color:'#dce6ff',font:'600 12px system-ui',cursor:'pointer',boxShadow:'0 8px 28px #0006'});trigger.onclick=panel;document.body.appendChild(trigger);
    const last=safe(()=>localStorage.getItem('AKSI_LAST_VIEW'),null);if(last&&typeof window.showView==='function')window.showView(last);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
