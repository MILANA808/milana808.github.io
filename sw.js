/* AKSI service worker — offline tiles + shell */
var CACHE="aksi-v3";
var SHELL=["/","/drive/","/aksi/","/net/","/backup/","/assets/aksi.css","/aksi-knowledge.js","/aksi-backup.js","/nav.js","/icon.svg"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL).catch(function(){});}).then(function(){return self.skipWaiting();}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(e){
  var u=e.request.url;
  // cache OSM tiles for offline map
  if(/tile\.openstreetmap\.org/.test(u)){
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return c.match(e.request).then(function(hit){
          if(hit)return hit;
          return fetch(e.request).then(function(res){
            if(res&&res.ok)c.put(e.request,res.clone());
            return res;
          }).catch(function(){return hit||Response.error();});
        });
      })
    );
    return;
  }
  if(e.request.method!=="GET")return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      return hit||fetch(e.request).then(function(res){
        if(res&&res.ok&&/milana808\.github\.io/.test(u)){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){c.put(e.request,copy);});
        }
        return res;
      }).catch(function(){return hit||caches.match("/");});
    })
  );
});
