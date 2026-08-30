const CACHE='aksi-local-ai-v2';
const CORE=['/local-ai/','/local-ai/index.html','/local-ai/engine.js','/local-ai/manifest.json','/aksi-webllm.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);
  if(event.request.method!=='GET') return;
  if(u.origin===location.origin || /cdn\.jsdelivr\.net|esm\.run/.test(u.hostname)){
    event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return r}).catch(()=>caches.match('/local-ai/index.html'))));
  }
});
