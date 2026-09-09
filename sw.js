/* AKSI SW v311 — safe cache/update policy */
var CACHE="aksi-shell-v311";
var PRE=["/","/index.html","/aksi.html","/platform.html","/sw.js","/contour/","/contour/index.html","/sovereign/","/sovereign/index.html","/reality/","/aksi-brain-ru.js","/aksi-mind.js","/aksi-api.js","/aksi-crystal.js","/aksi-neuro.js","/aksi-reality.js","/aksi-swarm.js","/aksi-organism.js","/aksi-pi-contour.js","/aksi-zero.js","/aksi-decision.js","/aksi-product-core.js","/adia-ref.js"];
var NET_FIRST=[/\/aksi\.html$/, /\/platform\.html$/, /\/contour\//, /\/sovereign\//, /\/reality\//, /\/index\.html$/];
function isNetFirst(url){var p=url.pathname;for(var i=0;i<NET_FIRST.length;i++)if(NET_FIRST[i].test(p))return true;return false;}
self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE).then(function(c){return Promise.all(PRE.map(function(u){return c.add(u).catch(function(){});}));}).then(function(){return self.skipWaiting();}));});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){return k!==CACHE?caches.delete(k):null;}));}).then(function(){return self.clients.claim();}));});
self.addEventListener("fetch",function(e){var req=e.request;if(req.method!=="GET")return;var url;try{url=new URL(req.url);}catch(err){return;}if(url.origin!==self.location.origin)return;
 if(isNetFirst(url)){e.respondWith(fetch(req).then(function(res){if(res&&res.ok)caches.open(CACHE).then(function(c){c.put(req,res.clone());});return res;}).catch(function(){return caches.match(req).then(function(c){return c||caches.match("/aksi.html");});}));return;}
 e.respondWith(caches.match(req).then(function(c){return c||fetch(req).then(function(res){if(res&&res.ok)caches.open(CACHE).then(function(cache){cache.put(req,res.clone());});return res;}).catch(function(){return caches.match("/aksi.html");});}));
});
