/* disabled aggressive cache — always prefer network for HTML */
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function(e){
  // network only for navigations
  if(e.request.mode === 'navigate'){
    e.respondWith(fetch(e.request).catch(function(){ return caches.match('/'); }));
    return;
  }
});
