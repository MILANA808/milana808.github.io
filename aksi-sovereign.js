/* AKSI Sovereign Orchestrator v1.0
 * Browser-first control plane: encrypted local vault, event bus, provenance,
 * capability gates, model adapters, and reproducible state export.
 * No network access is performed unless an adapter is explicitly registered.
 */
(function () {
  'use strict';
  const NS = 'AKSI_SOVEREIGN_V1';
  const DB = 'aksi-sovereign-db';
  const STORE = 'vault';
  const META = 'aksi-sovereign-meta';
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const memory = new Map();
  const adapters = new Map();
  const listeners = new Map();
  const caps = new Set(['memory:read','memory:write','ledger:append','export:state']);

  function stable(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  async function hash(value) {
    const bytes = await crypto.subtle.digest('SHA-256', enc.encode(typeof value === 'string' ? value : stable(value)));
    return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2,'0')).join('');
  }
  function requireCap(cap) { if (!caps.has(cap)) throw new Error('Capability denied: ' + cap); }
  function emit(type, data) { (listeners.get(type) || []).forEach(fn => { try { fn(data); } catch (_) {} }); }
  function on(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); return () => listeners.get(type)?.delete(fn); }

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error || new Error('IndexedDB error'));
    });
  }
  async function dbPut(key, value) { const db = await openDB(); return new Promise((resolve,reject)=>{ const t=db.transaction(STORE,'readwrite'); t.objectStore(STORE).put(value,key); t.oncomplete=()=>resolve(); t.onerror=()=>reject(t.error); }); }
  async function dbGet(key) { const db = await openDB(); return new Promise((resolve,reject)=>{ const t=db.transaction(STORE,'readonly'); const r=t.objectStore(STORE).get(key); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); }); }

  async function getOrCreateVaultKey() {
    let key = await dbGet('master-key');
    if (key) return key;
    key = await crypto.subtle.generateKey({name:'AES-GCM',length:256}, true, ['encrypt','decrypt']);
    await dbPut('master-key', key);
    return key;
  }
  async function encrypt(value) {
    const key = await getOrCreateVaultKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, enc.encode(JSON.stringify(value)));
    return { iv:[...iv], data:[...new Uint8Array(data)] };
  }
  async function decrypt(blob) {
    const key = await getOrCreateVaultKey();
    const data = await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(blob.iv)}, key, new Uint8Array(blob.data));
    return JSON.parse(dec.decode(data));
  }

  async function memoryWrite(key, value, tags=[]) {
    requireCap('memory:write');
    const record = { schema:'AKSI-MEMORY-1', key:String(key), value, tags:[...tags].map(String), updatedAt:new Date().toISOString() };
    record.hash = await hash(record);
    await dbPut('memory:'+record.key, await encrypt(record));
    memory.set(record.key, record);
    emit('memory:write', record);
    return record;
  }
  async function memoryRead(key) {
    requireCap('memory:read');
    if (memory.has(String(key))) return memory.get(String(key));
    const blob = await dbGet('memory:'+String(key));
    if (!blob) return null;
    const record = await decrypt(blob);
    memory.set(record.key, record);
    return record;
  }
  async function memorySearch(term='') {
    requireCap('memory:read');
    const q = String(term).toLowerCase();
    const all = [...memory.values()].filter(r => !q || JSON.stringify(r).toLowerCase().includes(q));
    return all;
  }

  async function appendEvent(type, payload, status='computed') {
    requireCap('ledger:append');
    const previous = await memoryRead('__ledger_head__');
    const event = { schema:'AKSI-EVENT-1', id:crypto.randomUUID(), type:String(type), payload, status, createdAt:new Date().toISOString(), previousHash:previous?.value || 'GENESIS' };
    event.hash = await hash(event);
    await memoryWrite('__ledger_head__', event.hash, ['system','ledger']);
    await memoryWrite('__event__'+event.id, event, ['ledger',type]);
    emit('ledger:append', event);
    return event;
  }
  async function ledgerList() { const all=await memorySearch('__event__'); return all.map(x=>x.value).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)); }
  async function verify() {
    const events=await ledgerList(); let prev='GENESIS';
    for(let i=0;i<events.length;i++){ const e=events[i]; const expected=await hash({schema:e.schema,id:e.id,type:e.type,payload:e.payload,status:e.status,createdAt:e.createdAt,previousHash:prev}); if(e.previousHash!==prev||e.hash!==expected) return {ok:false,index:i,count:events.length}; prev=e.hash; }
    return {ok:true,count:events.length,head:prev};
  }

  function registerAdapter(name, adapter) { if (!adapter || typeof adapter.run!=='function') throw new TypeError('Adapter must expose run(input)'); adapters.set(name,{...adapter,name}); emit('adapter:registered',{name}); }
  function removeAdapter(name) { adapters.delete(name); }
  async function think(input,{adapter='local'}={}) {
    const request={text:String(input||''),createdAt:new Date().toISOString(),source:'user'};
    if(adapter!=='local' && !caps.has('network:use')) throw new Error('Network/model capability is not granted');
    let result;
    const impl=adapters.get(adapter);
    if(impl) result=await impl.run(request);
    else result={text:'Локальный когнитивный режим: запрос принят. Внешняя модель не подключена.',status:'computed',confidence:0.2,source:'local-runtime'};
    const evidence=await appendEvent('cognition', {request,result}, result.status||'unverified');
    return {...result,evidenceId:evidence.id,evidenceHash:evidence.hash};
  }
  function grant(cap) { caps.add(cap); emit('capability',{cap,granted:true}); }
  function revoke(cap) { if(cap!=='memory:read') caps.delete(cap); emit('capability',{cap,granted:false}); }
  function capabilities(){ return [...caps].sort(); }

  async function exportState() {
    requireCap('export:state');
    const events=await ledgerList();
    const result={schema:'AKSI-STATE-1',exportedAt:new Date().toISOString(),capabilities:capabilities(),adapters:[...adapters.keys()],ledger:events,integrity:await verify()};
    result.stateHash=await hash(result);
    return result;
  }
  async function selfTest(){
    const out=[];
    try { out.push(['crypto',!!crypto.subtle]); const h=await hash('AKSI'); out.push(['hash',h.length===64]); } catch(_){out.push(['crypto',false]);}
    try { await memoryWrite('__selftest__',{ok:true}); out.push(['encrypted-vault',!!(await memoryRead('__selftest__'))]); } catch(_){out.push(['encrypted-vault',false]);}
    try { await appendEvent('self-test',{ok:true}); const v=await verify(); out.push(['ledger',v.ok]); } catch(_){out.push(['ledger',false]);}
    return {ok:out.every(x=>x[1]),tests:out};
  }

  window.AKSI = Object.assign(window.AKSI||{}, { sovereign:{version:'1.0.0',localFirst:true,stable,hash,on,emit,memory:{write:memoryWrite,read:memoryRead,search:memorySearch},ledger:{append:appendEvent,list:ledgerList,verify},think,adapters:{register:registerAdapter,remove:removeAdapter,list:()=>[...adapters.keys()]},capabilities:{grant,revoke,list:capabilities},exportState,selfTest} });
  document.addEventListener('DOMContentLoaded', async ()=>{ try { const r=await selfTest(); document.documentElement.dataset.aksiSovereign=r.ok?'ready':'degraded'; emit('ready',r); } catch(e){ document.documentElement.dataset.aksiSovereign='unavailable'; } });
})();
