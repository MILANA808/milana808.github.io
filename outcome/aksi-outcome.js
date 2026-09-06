/** AKSI Outcome Engine v1 — decision → action → outcome evidence */
(function(G){"use strict";var V="1.0.0",KEY="aksi_outcome_receipts_v1";
function id(p){return(p||"")+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function makeAction(input){input=input||{};return{schema:"aksi.action.request",version:"1.0.0",id:input.id||id("act"),decision_id:input.decision_id||null,action:input.action||null,authorization:input.authorization||{required:true,approved:false},policy:input.policy||null,created_at:input.created_at||new Date().toISOString()}}
function makeOutcome(input){input=input||{};return{schema:"aksi.outcome.receipt",version:V,id:input.id||id("out"),decision_id:input.decision_id||null,action_id:input.action_id||null,status:input.status||"unknown",observed_at:input.observed_at||new Date().toISOString(),result:input.result||null,evidence:input.evidence||[],parent:input.parent||null}}
async function seal(receipt){if(!G.AKSI_CRYPTO||!G.AKSI_CRYPTO.sign)throw Error("AKSI_CRYPTO required");var c=G.AKSI_DECISION_PACKET&&G.AKSI_DECISION_PACKET.canonical?G.AKSI_DECISION_PACKET.canonical(receipt):JSON.stringify(receipt),a=await G.AKSI_CRYPTO.sign(c);return Object.assign({},receipt,{seal:{did:a.did,alg:a.alg,public_key:a.public_key,hash_sha256:G.AKSI_CRYPTO.hex(await G.AKSI_CRYPTO.sha256(c)),signature:a.signature,ts:new Date().toISOString(),suite:G.AKSI_CRYPTO.version}})}
function save(r){var a=JSON.parse(localStorage.getItem(KEY)||"[]");a.push(r);localStorage.setItem(KEY,JSON.stringify(a.slice(-500)));return r}
function list(){return JSON.parse(localStorage.getItem(KEY)||"[]")}
G.AKSI_OUTCOME={version:V,makeAction:makeAction,makeOutcome:makeOutcome,seal:seal,save:save,list:list};})(typeof window!=="undefined"?window:globalThis);
