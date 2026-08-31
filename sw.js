/* AKSI Service Worker v36 */
var CACHE = "aksi-shell-v36";
var VERSION = "36";
var PRE = ["/","/index.html","/manifest.json","/aksi-algorithm.js","/aksi-compose.js","/aksi-neuro.js","/aksi-quantum.js","/aksi-pq.js","/aksi-knowledge.js","/aksi-self-arch.js","/aksi-secure-mem.js","/aksi-adia-assess.js","/aksi-swarm.js","/aksi-hrr.js","/aksi-hrr-webgl.js","/aksi-sentiment.js","/aksi-chats.js","/aksi-stats.js","/aksi-pulse.js","/aksi-skills.js","/aksi-nav-fix.js","/aksi-mvp-boot.js","/app-runtime.js","/local-ai/engine.js","/sw.js"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE).then(function(c){return Promise.all(PRE.map(function(u){return c.add(u).catch(function(){})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
function isCDN(url){return /cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|esm\.sh|huggingface\.co/i.test(url)}
function isStatic(url){return /\.(js|css|woff2?|png|svg|json|wasm)(\?|$)/i.test(url)||/\/aksi-|\/app-runtime|\/local-ai\//i.test(url)}
self.addEventListener("fetch",function(e){var req=e.request;if(req.method!=="GET")return;var url;try{url=new URL(req.url)}catch(err){return}
if(url.origin===self.location.origin&&url.pathname==="/aksi-version.json"){e.respondWith(new Response(JSON.stringify({version:VERSION,cache:CACHE}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}}));return}
if(isCDN(url.href)||(url.origin===self.location.origin&&isStatic(url.pathname))){e.respondWith(caches.match(req).then(function(hit){if(hit)return hit;return fetch(req).then(function(res){if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy)})}return res}).catch(function(){return hit||new Response("offline",{status:503})})}));return}
if(url.origin===self.location.origin&&(url.pathname==="/"||/\.html?$/.test(url.pathname)||url.pathname.endsWith("/"))){e.respondWith(fetch(req).then(function(res){if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy)})}return res}).catch(function(){return caches.match(req).then(function(hit){return hit||caches.match("/index.html")})}))}});
self.addEventListener("message",function(e){if(!e.data)return;if(e.data.type==="SKIP_WAITING")self.skipWaiting();if(e.data.type==="GET_VERSION"&&e.source)e.source.postMessage({type:"VERSION",version:VERSION})});
