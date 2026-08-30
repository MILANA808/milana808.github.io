(function(){
"use strict";
var DID_FIXED = "did:aksi:ed25519:sovereign-2026";
var DB = "aksi_matrix_v6";
var rag = [];
var keyPair = null;
var lastSig = null;
var busy = false;
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function bootProgress(p, msg){
  var b = $("bootBar"); if(b) b.style.width = Math.min(100, p) + "%";
  var m = $("bootMsg"); if(m) m.textContent = msg || "";
}
function idbOpen(){
  return new Promise(function(res,rej){
    var r = indexedDB.open(DB, 1);
    r.onupgradeneeded = function(){
      var d = r.result;
      if(!d.objectStoreNames.contains("rag")) d.createObjectStore("rag", {keyPath:"id", autoIncrement:true});
      if(!d.objectStoreNames.contains("keys")) d.createObjectStore("keys");
    };
    r.onsuccess = function(){ res(r.result); };
    r.onerror = function(){ rej(r.error); };
  });
}
function idbPut(store, val, key){
  return idbOpen().then(function(db){
    return new Promise(function(res,rej){
      var tx = db.transaction(store,"readwrite");
      var os = tx.objectStore(store);
      var req = key != null ? os.put(val, key) : os.put(val);
      req.onsuccess = function(){ res(req.result); };
      req.onerror = function(){ rej(req.error); };
    });
  });
}
function idbGet(store, key){
  return idbOpen().then(function(db){
    return new Promise(function(res,rej){
      var req = db.transaction(store,"readonly").objectStore(store).get(key);
      req.onsuccess = function(){ res(req.result); };
      req.onerror = function(){ rej(req.error); };
    });
  });
}
function idbAll(store){
  return idbOpen().then(function(db){
    return new Promise(function(res,rej){
      var req = db.transaction(store,"readonly").objectStore(store).getAll();
      req.onsuccess = function(){ res(req.result||[]); };
      req.onerror = function(){ rej(req.error); };
    });
  });
}
function b64(buf){
  var u = new Uint8Array(buf), s="", i;
  for(i=0;i<u.length;i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function fromB64(s){
  s = s.replace(/-/g,"+").replace(/_/g,"/");
  while(s.length % 4) s += "=";
  var bin = atob(s), u = new Uint8Array(bin.length), i;
  for(i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i);
  return u;
}
async function sha256(text){
  var h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(h)).map(function(x){return x.toString(16).padStart(2,"0");}).join("");
}
async function ensureKeys(){
  if(keyPair) return keyPair;
  try{
    var stored = await idbGet("keys","ecdsa");
    if(stored && stored.privateKey){
      keyPair = {
        privateKey: await crypto.subtle.importKey("jwk", stored.privateKey, {name:"ECDSA", namedCurve:"P-256"}, true, ["sign"]),
        publicKey: await crypto.subtle.importKey("jwk", stored.publicKey, {name:"ECDSA", namedCurve:"P-256"}, true, ["verify"])
      };
      return keyPair;
    }
  }catch(e){}
  keyPair = await crypto.subtle.generateKey({name:"ECDSA", namedCurve:"P-256"}, true, ["sign","verify"]);
  await idbPut("keys", {
    privateKey: await crypto.subtle.exportKey("jwk", keyPair.privateKey),
    publicKey: await crypto.subtle.exportKey("jwk", keyPair.publicKey)
  }, "ecdsa");
  return keyPair;
}
async function exportPubJwk(){
  await ensureKeys();
  return crypto.subtle.exportKey("jwk", keyPair.publicKey);
}
async function signText(text){
  await ensureKeys();
  var sig = await crypto.subtle.sign({name:"ECDSA", hash:"SHA-256"}, keyPair.privateKey, new TextEncoder().encode(text));
  return { alg:"ECDSA-P256-SHA256", did: DID_FIXED, sha256: await sha256(text), signature: b64(sig), ts: Date.now() };
}
async function verifyText(text, sigB64){
  await ensureKeys();
  try{
    return await crypto.subtle.verify({name:"ECDSA", hash:"SHA-256"}, keyPair.publicKey, fromB64(sigB64), new TextEncoder().encode(text));
  }catch(e){ return false; }
}
function drawQR(text, size){
  size = size || 140;
  var canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0,0,size,size);
  var h = 0, i, j, n = 21, cell = size/n;
  for(i=0;i<text.length;i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  function bit(x,y){ return ((h ^ (x*73856093) ^ (y*19349663)) >>> (x+y)%16) & 1; }
  ctx.fillStyle = "#000";
  for(i=0;i<n;i++) for(j=0;j<n;j++){
    if(i<3&&j<3 || i<3&&j>n-4 || i>n-4&&j<3) { ctx.fillRect(j*cell,i*cell,cell,cell); continue; }
    if(bit(i,j)) ctx.fillRect(j*cell, i*cell, cell*0.9, cell*0.9);
  }
  [[0,0],[0,n-7],[n-7,0]].forEach(function(p){
    ctx.fillStyle="#000"; ctx.fillRect(p[1]*cell,p[0]*cell,7*cell,7*cell);
    ctx.fillStyle="#fff"; ctx.fillRect((p[1]+1)*cell,(p[0]+1)*cell,5*cell,5*cell);
    ctx.fillStyle="#000"; ctx.fillRect((p[1]+2)*cell,(p[0]+2)*cell,3*cell,3*cell);
  });
  return canvas;
}
async function refreshCryptoUI(){
  await ensureKeys();
  var pub = await exportPubJwk();
  $("didLine").textContent = DID_FIXED;
  $("pubOut").textContent = JSON.stringify(pub);
  var box = $("qrBox"); box.innerHTML = "";
  box.appendChild(drawQR(DID_FIXED + "|" + (pub.x||"").slice(0,24)));
  $("kvDid").textContent = "sovereign";
}
function tokenize(s){ return String(s||"").toLowerCase().replace(/[^a-zа-яё0-9\s]/gi," ").split(/\s+/).filter(function(t){return t.length>2;}); }
function ragScore(q, text){
  var qt = tokenize(q), tt = tokenize(text), set={}, i, hit=0;
  for(i=0;i<tt.length;i++) set[tt[i]]=1;
  for(i=0;i<qt.length;i++) if(set[qt[i]]) hit++;
  return qt.length ? hit/qt.length : 0;
}
function ragRetrieve(q, k){
  k = k||4;
  return rag.map(function(r){ return {text:r.text, score:ragScore(q,r.text), name:r.name}; })
    .sort(function(a,b){return b.score-a.score;}).slice(0,k).filter(function(x){return x.score>0.05;});
}
async function loadRag(){
  try{ rag = await idbAll("rag"); }catch(e){ rag=[]; }
  $("ragStat").textContent = "RAG " + rag.length;
  $("kvRag").textContent = String(rag.length);
}
async function addRagFiles(files){
  var i, f, text;
  for(i=0;i<files.length;i++){
    f = files[i];
    text = await f.text();
    var chunks = text.split(/\n{2,}/).map(function(c){return c.trim();}).filter(function(c){return c.length>20;});
    if(!chunks.length) chunks = [text.slice(0,4000)];
    for(var j=0;j<chunks.length;j++){
      var item = {text: chunks[j].slice(0,4000), name: f.name, ts: Date.now()};
      await idbPut("rag", item);
      rag.push(item);
    }
  }
  await loadRag();
}
function bubble(role, text, meta){
  var th = $("thread"); if(!th) return;
  var d = document.createElement("div");
  d.className = "msg " + (role==="me"?"me":"ai");
  d.innerHTML = '<div class="bub">'+esc(text)+(meta?'<div class="meta">'+esc(meta)+'</div>':'')+'</div>';
  th.appendChild(d);
  try{ th.lastElementChild.scrollIntoView({block:"end"}); }catch(e){}
}
async function think(q){
  q = String(q||"").trim();
  if(!q) return {text:"Пустой запрос.", meta:"matrix"};
  if(/покажи схему|архитектур/i.test(q)){
    return { text: "Архитектура АКСИ MATRIX:\n\nПользователь → MATRIX UI\n  → IndexedDB\n  → RAG файлы\n  → Neuro / WebLLM\n  → Quantum answerGate\n  → ECDSA Trust\n\nDID: "+DID_FIXED, meta: "arch · matrix" };
  }
  if(/^did$/i.test(q) || /что такое did/i.test(q)){
    return { text: "DID: "+DID_FIXED+"\nECDSA P-256 (WebCrypto)\nКлючи в IndexedDB.", meta: "did" };
  }
  var hits = ragRetrieve(q, 3);
  if(hits.length && hits[0].score >= 0.15){
    var body = hits.map(function(h,i){ return (i+1)+". ["+h.name+"] "+h.text.slice(0,280); }).join("\n\n");
    return { text: "По RAG:\n\n"+body, meta: "rag · "+hits.length };
  }
  if(window.AKSI_MIND && typeof AKSI_MIND.think === "function"){
    try{
      var r = await AKSI_MIND.think(q);
      if(r && r.text) return { text: r.text, meta: r.meta || "mind", quantum: r.quantum };
    }catch(e){}
  }
  if(window.AKSI_NEURO && typeof AKSI_NEURO.think === "function"){
    var n = AKSI_NEURO.think(q);
    if(n && n.text){
      var meta = n.mode || "neuro";
      if(window.AKSI_QUANTUM && AKSI_QUANTUM.answerGate){
        var qx = AKSI_QUANTUM.answerGate(q, n.text);
        if(qx) meta += " · Q" + qx.QCLI;
      }
      return { text: n.text, meta: meta };
    }
  }
  return { text: "Мало данных. Загрузите файл в RAG.\n\n"+DID_FIXED, meta: "fallback" };
}
async function ask(q){
  if(busy) return;
  q = String(q||"").trim(); if(!q) return;
  busy = true;
  bubble("me", q);
  $("inp").value = "";
  try{
    var r = await think(q);
    var meta = r.meta || "";
    try{ lastSig = await signText(r.text); meta += " · sig"; }catch(e){}
    bubble("ai", r.text, meta);
  }catch(e){
    bubble("ai", "Сбой: "+(e.message||e), "error");
  }
  busy = false;
}
function drawBlochCanvas(bloch){
  var canvas = $("bloch"); if(!canvas||!bloch) return;
  var ctx = canvas.getContext("2d"), w=canvas.width, h=canvas.height, cx=w/2, cy=h/2, R=Math.min(w,h)*0.38;
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle="rgba(167,139,250,.4)";
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx,cy,R,R*0.35,0,0,Math.PI*2); ctx.stroke();
  var px=cx+(bloch.x||0)*R, py=cy-(bloch.z||0)*R;
  ctx.strokeStyle="#c4b5fd"; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(px,py); ctx.stroke();
  ctx.fillStyle="#a78bfa"; ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fill();
}
function showQ(obj){
  $("qOut").textContent = typeof obj==="string"?obj:JSON.stringify(obj,null,2);
  if(obj && obj.bloch0) drawBlochCanvas(obj.bloch0);
}
function goTab(t){
  document.querySelectorAll(".tabs [data-tab]").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-tab")===t); });
  document.querySelectorAll(".stage .panel").forEach(function(p){ p.classList.toggle("on", p.id==="tab-"+t); });
  if(t==="crypto") refreshCryptoUI();
  if(t==="bloch" && window.AKSI_QUANTUM){ try{ showQ(AKSI_QUANTUM.shot("matrix")); }catch(e){} }
  if(t==="ui") refreshStatus();
}
function refreshStatus(){
  $("kvNeuro").textContent = window.AKSI_NEURO ? "ready" : "—";
  $("kvQ").textContent = window.AKSI_QUANTUM ? (AKSI_QUANTUM.version||"on") : "—";
  $("kvRag").textContent = String(rag.length);
}
async function start(){
  bootProgress(15, "IndexedDB…");
  try{ await idbOpen(); }catch(e){}
  bootProgress(35, "ECDSA…");
  try{ await ensureKeys(); }catch(e){}
  bootProgress(55, "RAG…");
  await loadRag();
  bootProgress(75, "Neuro / Quantum…");
  refreshStatus();
  bootProgress(90, "Крипто…");
  try{ await refreshCryptoUI(); }catch(e){}
  bootProgress(100, "MATRIX online");
  setTimeout(function(){
    $("boot").style.display="none";
    $("app").hidden=false;
    bubble("ai", "Здравствуйте. АКСИ MATRIX online.\n\nNeuro · Quantum · ECDSA · RAG.\nСпросите или «покажи схему».", "matrix · "+DID_FIXED);
  }, 350);
}
document.querySelectorAll(".tabs [data-tab]").forEach(function(b){
  b.addEventListener("click", function(){ goTab(b.getAttribute("data-tab")); });
});
$("send").onclick = function(){ ask($("inp").value); };
$("inp").addEventListener("keydown", function(e){ if(e.key==="Enter") ask($("inp").value); });
document.querySelectorAll("[data-ask]").forEach(function(c){
  c.onclick = function(){ ask(c.getAttribute("data-ask")); };
});
$("btnClear").onclick = function(){ $("thread").innerHTML=""; };
$("btnReload").onclick = function(){ location.reload(); };
$("btnRag").onclick = function(){ $("ragFile").click(); };
$("ragFile").onchange = function(){
  if(this.files && this.files.length) addRagFiles(this.files).then(function(){ bubble("ai","RAG: "+rag.length+" фрагментов","rag"); });
};
$("btnVoice").onclick = function(){
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ bubble("ai","SpeechRecognition недоступен","voice"); return; }
  var r = new SR(); r.lang="ru-RU";
  r.onresult = function(ev){ ask(ev.results[0][0].transcript); };
  r.start();
};
$("btnTrust").onclick = function(){ goTab("crypto"); };
$("btnPro").onclick = function(){ goTab("ui"); };
$("btnSign").onclick = async function(){
  lastSig = await signText($("signMsg").value || "");
  $("cryptoOut").textContent = JSON.stringify(lastSig, null, 2);
};
$("btnVerify").onclick = async function(){
  if(!lastSig){ $("cryptoOut").textContent="Сначала подпишите"; return; }
  var ok = await verifyText($("signMsg").value || "", lastSig.signature);
  $("cryptoOut").textContent = ok ? "✓ Подпись верна\n"+JSON.stringify(lastSig,null,2) : "✗ Неверна";
};
$("btnDlJson").onclick = function(){
  var data = lastSig || {did:DID_FIXED};
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  a.download = "aksi-proof.json"; a.click();
};
document.querySelectorAll("[data-crypto]").forEach(function(b){
  b.onclick = async function(){
    var k = b.getAttribute("data-crypto");
    await ensureKeys();
    if(k==="keys"||k==="did") refreshCryptoUI();
    else if(k==="json"){ $("cryptoOut").textContent=JSON.stringify({did:DID_FIXED,publicKey:await exportPubJwk()},null,2); }
    else if(k==="pem"){ $("cryptoOut").textContent="JWK P-256:\n"+JSON.stringify(await exportPubJwk(),null,2); }
    else if(k==="import"){ $("cryptoOut").textContent="Ключи в IndexedDB на устройстве."; }
  };
});
$("btnBell").onclick = function(){
  if(!window.AKSI_QUANTUM) return showQ("no Quantum");
  var c = AKSI_QUANTUM.bell("phi+");
  var s = c.summary ? c.summary() : AKSI_QUANTUM.shot("bell");
  if(c.bloch) showQ(Object.assign({}, s, {bloch0: c.bloch(0)})); else showQ(s);
};
$("btnShot").onclick = function(){ showQ(window.AKSI_QUANTUM ? AKSI_QUANTUM.shot("matrix") : "no Q"); };
$("btnGate").onclick = function(){
  if(!window.AKSI_QUANTUM||!AKSI_QUANTUM.answerGate) return showQ("no answerGate");
  showQ(AKSI_QUANTUM.answerGate("Кто ты?","Я АКСИ MATRIX"));
};
$("btnChsh").onclick = function(){ showQ(window.AKSI_QUANTUM ? AKSI_QUANTUM.chsh(1024) : "no Q"); };
$("btnQ2Bell").onclick = function(){
  if(!window.AKSI_QUANTUM) return;
  var c = AKSI_QUANTUM.bell("phi+");
  $("q2Out").textContent = c.circuitString ? c.circuitString()+"\n\n"+JSON.stringify(c.summary(),null,2) : JSON.stringify(AKSI_QUANTUM.shot("bell"),null,2);
};
$("btnQ2Sample").onclick = function(){
  if(!window.AKSI_QUANTUM) return;
  $("q2Out").textContent = JSON.stringify(AKSI_QUANTUM.bell("phi+").sample(1024), null, 2);
};
start();
})();
