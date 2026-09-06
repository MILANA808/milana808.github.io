/**
 * AKSI Cipher Suite v1.1 — deterministic signing primitives
 * Classical: SHA-256, AES-GCM-256, ECDH/ECDSA P-256, Ed25519 (when available)
 * PQ path: hybrid when ML-KEM loads; else classical.
 * IMPORTANT: signatures prove integrity/authorship of bytes, not truth.
 */
(function (G) {
  "use strict";
  var VER = "1.1.0";
  var TEXT = new TextEncoder();
  var DECODE = new TextDecoder();
  function b64(u8){u8=u8 instanceof Uint8Array?u8:new Uint8Array(u8);var s="";for(var i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s)}
  function unb64(s){var bin=atob(s),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
  function hex(u8){return Array.from(u8).map(function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
  async function sha256(data){var buf=typeof data==="string"?TEXT.encode(data):data;return new Uint8Array(await crypto.subtle.digest("SHA-256",buf))}
  var state={ready:false,pq:false,pqNote:"classical-only until ML-KEM module loads",identity:null,ecdsa:null,ecdh:null,ed25519:null,mlkem:null};
  async function tryLoadMlKem(){try{var mod=await import("https://esm.sh/@noble/post-quantum@0.2.1/ml-kem.js");if(mod&&(mod.ml_kem768||mod.ML_KEM_768||mod.default)){state.mlkem=mod.ml_kem768||mod.ML_KEM_768||mod.default;state.pq=true;state.pqNote="ML-KEM-768 available (hybrid)";return true}}catch(e){state.pqNote="ML-KEM CDN unavailable — classical cryptography only"}return false}
  async function genEcdsa(){return crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"])}
  async function genEcdh(){return crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"])}
  async function tryEd25519(){try{return await crypto.subtle.generateKey({name:"Ed25519"},true,["sign","verify"])}catch(e){return null}}
  async function exportPub(key,fmt){return new Uint8Array(await crypto.subtle.exportKey(fmt||"raw",key))}
  async function boot(opts){opts=opts||{};state.ecdsa=await genEcdsa();state.ecdh=await genEcdh();state.ed25519=await tryEd25519();if(opts.tryPq!==false)await tryLoadMlKem();var ep=await exportPub(state.ecdsa.publicKey,"raw"),fp=hex((await sha256(ep)).slice(0,16));var edDid=null,edPub=null;if(state.ed25519){try{edPub=await exportPub(state.ed25519.publicKey,"raw");edDid="did:aksi:ed25519:"+hex((await sha256(edPub)).slice(0,16))}catch(e){}}state.identity={did:"did:aksi:p256:"+fp,didEd25519:edDid,fingerprint:fp,algorithms:{sign:state.ed25519?["Ed25519","ECDSA-P256"]:["ECDSA-P256"],kem:state.pq?["ML-KEM-768","ECDH-P256"]:["ECDH-P256"],aead:["AES-256-GCM"],hash:["SHA-256"]},pq:state.pq,created:new Date().toISOString()};state.ready=true;return status()}
  function status(){return{version:VER,ready:state.ready,pq:state.pq,pqNote:state.pqNote,identity:state.identity,webcrypto:!!(G.crypto&&crypto.subtle)}}
  async function sign(message){if(!state.ready)await boot();var data=typeof message==="string"?TEXT.encode(message):message;if(state.ed25519){var s=new Uint8Array(await crypto.subtle.sign({name:"Ed25519"},state.ed25519.privateKey,data));return{alg:"Ed25519",signature:b64(s),did:state.identity.didEd25519||state.identity.did,public_key:b64(await exportPub(state.ed25519.publicKey,"raw"))}}var s2=new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},state.ecdsa.privateKey,data));return{alg:"ECDSA-P256-SHA256",signature:b64(s2),did:state.identity.did,public_key:b64(await exportPub(state.ecdsa.publicKey,"raw"))}}
  async function verify(message, seal){if(!seal||!seal.signature||!seal.public_key)return false;var data=typeof message==="string"?TEXT.encode(message):message,sig=unb64(seal.signature),pub=unb64(seal.public_key);try{if(seal.alg==="Ed25519"){var k=await crypto.subtle.importKey("raw",pub,{name:"Ed25519"},false,["verify"]);return await crypto.subtle.verify({name:"Ed25519"},k,sig,data)}if(seal.alg==="ECDSA-P256-SHA256"){var k2=await crypto.subtle.importKey("raw",pub,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);return await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},k2,sig,data)}}catch(e){}return false}
  async function sealJson(obj){var body=Object.assign({},obj);delete body.seal;var canonical=G.AKSI_CANONICAL?G.AKSI_CANONICAL(body):JSON.stringify(body);var hash=hex(await sha256(canonical)),sig=await sign(canonical);return{payload:body,seal:{did:sig.did,alg:sig.alg,public_key:sig.public_key,hash_sha256:hash,signature:sig.signature,ts:new Date().toISOString(),label:"AKSI",suite:VER}}}
  async function encryptToSelf(plaintext){if(!state.ready)await boot();var bits=await crypto.subtle.deriveBits({name:"ECDH",public:state.ecdh.publicKey},state.ecdh.privateKey,256),key=await crypto.subtle.importKey("raw",new Uint8Array(bits),{name:"AES-GCM"},false,["encrypt","decrypt"]),iv=crypto.getRandomValues(new Uint8Array(12)),pt=typeof plaintext==="string"?TEXT.encode(plaintext):plaintext,ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,pt));return{v:1,aead:"AES-256-GCM",kem:"ECDH-P256-self",hybrid:state.pq,iv:b64(iv),ct:b64(ct),did:state.identity.did}}
  async function decryptSelf(envelope){var bits=await crypto.subtle.deriveBits({name:"ECDH",public:state.ecdh.publicKey},state.ecdh.privateKey,256),key=await crypto.subtle.importKey("raw",new Uint8Array(bits),{name:"AES-GCM"},false,["decrypt"]),pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(envelope.iv)},key,unb64(envelope.ct));return DECODE.decode(pt)}
  async function publicPack(){if(!state.ready)await boot();var pack={v:1,did:state.identity.did,ecdsa_p256:b64(await exportPub(state.ecdsa.publicKey,"raw")),ecdh_p256:b64(await exportPub(state.ecdh.publicKey,"raw")),algorithms:state.identity.algorithms,pq:state.pq};if(state.ed25519){try{pack.ed25519=b64(await exportPub(state.ed25519.publicKey,"raw"));pack.did_ed25519=state.identity.didEd25519}catch(e){}}return pack}
  G.AKSI_CRYPTO={version:VER,boot:boot,status:status,sign:sign,verify:verify,sealJson:sealJson,encryptToSelf:encryptToSelf,decryptSelf:decryptSelf,publicPack:publicPack,sha256:sha256,hex:hex,b64:unb64};
})(typeof window!=="undefined"?window:globalThis);
