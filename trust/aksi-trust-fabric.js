/** AKSI Trust Fabric v0.2 — signed delegation, authorization and revocation primitives. */
(function(G){"use strict";
const STORE="aksi_trust_fabric_v1";
const T=new TextEncoder();
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'{"keys":[],"delegations":[],"revocations":[],"nonces":[]}')}catch(e){return{keys:[],delegations:[],revocations:[],nonces:[]}}}
function save(x){localStorage.setItem(STORE,JSON.stringify(x));return x}
function id(p){return p+"-"+crypto.randomUUID()}
function b64(u){u=u instanceof Uint8Array?u:new Uint8Array(u);let s="";for(const x of u)s+=String.fromCharCode(x);return btoa(s)}
function unb64(s){const x=atob(s),u=new Uint8Array(x.length);for(let i=0;i<x.length;i++)u[i]=x.charCodeAt(i);return u}
async function fingerprint(pub){const h=new Uint8Array(await crypto.subtle.digest("SHA-256",pub));return Array.from(h.slice(0,16)).map(x=>("0"+x.toString(16)).slice(-2)).join("")}
function canonical(x){if(x===null||typeof x!=="object")return JSON.stringify(x);if(Array.isArray(x))return"["+x.map(canonical).join(",")+"]";return"{"+Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+canonical(x[k])).join(",")+"}"}
async function createIdentity(label){const k=await crypto.subtle.generateKey({name:"Ed25519"},true,["sign","verify"]);const pub=new Uint8Array(await crypto.subtle.exportKey("raw",k.publicKey));const rec={key_id:id("key"),label:label||"AKSI identity",algorithm:"Ed25519",did:"did:aksi:ed25519:"+await fingerprint(pub),public_key:b64(pub),created_at:new Date().toISOString(),status:"active"};const st=load();st.keys.push(rec);save(st);return{identity:rec,privateKey:k.privateKey,publicKey:k.publicKey}}
function findKey(st,did){return st.keys.find(k=>k.did===did&&k.status==="active")}
function revoke(key_id,reason){const st=load(),k=st.keys.find(x=>x.key_id===key_id);if(!k)return false;k.status="revoked";st.revocations.push({key_id,reason:reason||"revoked",ts:new Date().toISOString()});save(st);return true}
async function delegateSigned(parent,child_did,scope,expires_at){
  if(!parent||!parent.identity||!parent.privateKey)throw Error("parent identity and private key required");
  const st=load(),pk=findKey(st,parent.identity.did);
  if(!pk)throw Error("parent identity not active");
  const d={schema:"aksi.delegation",version:"1.0",delegation_id:id("del"),parent_did:parent.identity.did,child_did,scope:Array.isArray(scope)?scope:[String(scope||"decision")],issued_at:new Date().toISOString(),expires_at:expires_at||null,nonce:crypto.randomUUID()};
  const bytes=T.encode(canonical(d));
  const sig=new Uint8Array(await crypto.subtle.sign({name:"Ed25519"},parent.privateKey,bytes));
  d.signature={alg:"Ed25519",public_key:parent.identity.public_key,did:parent.identity.did,signature:b64(sig)};
  st.delegations.push(d);save(st);return d;
}
function delegate(parent_did,child_did,scope,expires_at){
  throw Error("delegate() is disabled for unsigned delegation; use delegateSigned(parentIdentity, childDid, scope, expiresAt)");
}
async function verifyDelegation(d){try{if(!d||d.schema!=="aksi.delegation"||!d.signature)return{ok:false,reason:"invalid delegation"};const s=Object.assign({},d);delete s.signature;const pk=unb64(d.signature.public_key);const k=await crypto.subtle.importKey("raw",pk,{name:"Ed25519"},false,["verify"]);const ok=await crypto.subtle.verify({name:"Ed25519"},k,unb64(d.signature.signature),T.encode(canonical(s)));return{ok,delegation:ok?d:null}}catch(e){return{ok:false,reason:String(e&&e.message||e)}}}
async function authorize(did,capability,now,proof){const st=load(),t=now||Date.now(),key=findKey(st,did);if(!key)return{allowed:false,reason:"identity_inactive"};if(proof){const pv=await verifyDelegation(proof);if(!pv.ok)return{allowed:false,reason:"invalid_delegation_signature"};if(proof.child_did!==did||!proof.scope.includes(capability))return{allowed:false,reason:"delegation_scope_denied"};if(proof.expires_at&&Date.parse(proof.expires_at)<t)return{allowed:false,reason:"delegation_expired"};const parent=findKey(st,proof.parent_did);if(!parent)return{allowed:false,reason:"delegating_identity_inactive"};if(proof.signature.public_key!==parent.public_key)return{allowed:false,reason:"delegating_key_mismatch"};}
  const ds=st.delegations.filter(d=>d.child_did===did&&d.status!=="revoked"&&(!d.expires_at||Date.parse(d.expires_at)>=t)&&d.scope.includes(capability));
  return{allowed:true,identity:key,delegations:ds};}
function consumeNonce(nonce,ttlMs){const st=load(),now=Date.now(),cut=now-(ttlMs||86400000);st.nonces=(st.nonces||[]).filter(x=>x.ts>=cut);if(!nonce||st.nonces.some(x=>x.nonce===nonce))return false;st.nonces.push({nonce,ts:now});save(st);return true}
function status(){const st=load();return{version:"0.2.0",keys:st.keys.length,active_keys:st.keys.filter(k=>k.status==="active").length,delegations:st.delegations.length,revocations:st.revocations.length,nonces:(st.nonces||[]).length}}
G.AKSI_TRUST={createIdentity,delegate,delegateSigned,verifyDelegation,authorize,revoke,consumeNonce,status,load,canonical};
})(typeof window!=="undefined"?window:globalThis);
