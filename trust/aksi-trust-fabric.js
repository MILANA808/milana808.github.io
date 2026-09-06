/** AKSI Trust Fabric v0.1 — identity, delegation, authorization and revocation primitives. */
(function(G){"use strict";
const STORE="aksi_trust_fabric_v1";
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'{"keys":[],"delegations":[],"revocations":[]}')}catch(e){return{keys:[],delegations:[],revocations:[]}}}
function save(x){localStorage.setItem(STORE,JSON.stringify(x));return x}
function id(p){return p+"-"+crypto.randomUUID()}
async function fingerprint(pub){const h=new Uint8Array(await crypto.subtle.digest("SHA-256",pub));return Array.from(h.slice(0,16)).map(x=>("0"+x.toString(16)).slice(-2)).join("")}
async function createIdentity(label){const k=await crypto.subtle.generateKey({name:"Ed25519"},true,["sign","verify"]);const pub=new Uint8Array(await crypto.subtle.exportKey("raw",k.publicKey));const rec={key_id:id("key"),label:label||"AKSI identity",algorithm:"Ed25519",did:"did:aksi:ed25519:"+await fingerprint(pub),public_key:btoa(String.fromCharCode(...pub)),created_at:new Date().toISOString(),status:"active",private_key:k.privateKey};const st=load();st.keys.push({key_id:rec.key_id,label:rec.label,algorithm:rec.algorithm,did:rec.did,public_key:rec.public_key,created_at:rec.created_at,status:rec.status});save(st);return{identity:rec,privateKey:k.privateKey}}
function revoke(key_id,reason){const st=load(),k=st.keys.find(x=>x.key_id===key_id);if(!k)return false;k.status="revoked";st.revocations.push({key_id,reason:reason||"revoked",ts:new Date().toISOString()});save(st);return true}
function delegate(parent_did,child_did,scope,expires_at){const st=load(),d={delegation_id:id("del"),parent_did,child_did,scope:Array.isArray(scope)?scope:[String(scope||"decision")],issued_at:new Date().toISOString(),expires_at:expires_at||null,status:"active"};st.delegations.push(d);save(st);return d}
function authorize(did,capability,now){const st=load(),t=now||Date.now(),key=st.keys.find(k=>k.did===did&&k.status==="active");if(!key)return{allowed:false,reason:"identity_inactive"};const ds=st.delegations.filter(d=>d.child_did===did&&d.status==="active"&&(!d.expires_at||Date.parse(d.expires_at)>=t)&&d.scope.includes(capability));return{allowed:true,identity:key,delegations:ds};}
function status(){const st=load();return{version:"0.1.0",keys:st.keys.length,active_keys:st.keys.filter(k=>k.status==="active").length,delegations:st.delegations.length,revocations:st.revocations.length}}
G.AKSI_TRUST={createIdentity,delegate,authorize,revoke,status,load};
})(typeof window!=="undefined"?window:globalThis);
