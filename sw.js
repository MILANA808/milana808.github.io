self.addEventListener("install",function(e){self.skipWaiting();});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(e){
  if(e.request.mode==="navigate"){
    e.respondWith(fetch(e.request).catch(function(){return new Response("Офлайн. Откройте /app/",{headers:{"Content-Type":"text/plain; charset=utf-8"}});}));
  }
});
