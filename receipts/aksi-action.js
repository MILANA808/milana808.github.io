/** AKSI Action Integrity v0.1 — authorization-bound action request/receipt primitives. */
(function(G){"use strict";
const KEY="aksi_action_receipts_v1";
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:[]}catch(e){return[]}}
function save(x){try{localStorage.setItem(KEY,JSON.stringify(x.slice(-500)))}catch(e){}return x}
function id(p){return p+"_"+crypto.randomUUID()}
function clean(o){const x=Object.assign({},o);delete x.signature;delete x.seal;return x}
async function request(input){
  input=input||{}; if(!G.AKSI_CRYPTO)throw Error("AKSI_CRYPTO required");
  if(!input.decision_id)throw Error("decision_id required");
  if(!input.actor_did)throw Error("actor_did required");
  if(!input.capability)throw Error("capability required");
  const r={schema:"aksi.action.request",version:"0.1",action_id:input.action_id||id("act"),decision_id:String(input.decision_id),actor_did:String(input.actor_did),capability:String(input.capability),target:input.target||null,arguments:input.arguments||null,authorization:input.authorization||null,issued_at:new Date().toISOString(),expires_at:input.expires_at||new Date(Date.now()+60000).toISOString(),nonce:input.nonce||crypto.randomUUID()};
  const c=G.AKSI_TRUST&&G.AKSI_TRUST.canonical?G.AKSI_TRUST.canonical(r):JSON.stringify(r); const a=await G.AKSI_CRYPTO.sign(c);r.signature={alg:a.alg,did:a.did,public_key:a.public_key,signature:a.signature};return r;
}
async function verify(r){try{if(!r||r.schema!=="aksi.action.request"||!r.signature)return{ok:false,reason:"invalid action request"};if(Date.parse(r.expires_at)<Date.now())return{ok:false,reason:"action_expired"};if(G.AKSI_TRUST&&r.nonce&&!G.AKSI_TRUST.consumeNonce(r.nonce))return{ok:false,reason:"replay_detected"};const c=G.AKSI_TRUST&&G.AKSI_TRUST.canonical?G.AKSI_TRUST.canonical(clean(r)):JSON.stringify(clean(r));const ok=await G.AKSI_CRYPTO.verify(c,r.signature);return{ok:!!ok,reason:ok?"verified":"invalid_signature",action_id:r.action_id,decision_id:r.decision_id}}catch(e){return{ok:false,reason:String(e&&e.message||e)}}}
async function record(input){const r=await request(input);const v=await verify(r);if(!v.ok)throw Error(v.reason);const receipt={schema:"aksi.action.receipt",version:"0.1",action_id:r.action_id,decision_id:r.decision_id,actor_did:r.actor_did,capability:r.capability,target:r.target,request_hash:await G.AKSI_CRYPTO.hex(await G.AKSI_CRYPTO.sha256(G.AKSI_TRUST.canonical(clean(r)))),status:input.status||"recorded",result:input.result||null,observed_at:new Date().toISOString(),request_signature:r.signature};const arr=load();arr.push(receipt);save(arr);return{request:r,receipt,verification:v}}
G.AKSI_ACTION={version:"0.1.0",request,verify,record,list:load};
})(typeof window!=="undefined"?window:globalThis);
