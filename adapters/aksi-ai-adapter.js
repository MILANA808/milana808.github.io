/** AKSI AI Adapter v1 — model/provider neutral normalization boundary */
(function(G){"use strict";
function normalizeCandidate(x,provider,model){x=x||{};return{id:x.id||("cand_"+Math.random().toString(36).slice(2,10)),answer:x.answer==null?String(x.text==null?x.output||"":x.text):String(x.answer),provider:provider||x.provider||"unknown",model:model||x.model||"unknown",raw_ref:x.raw_ref||null}}
function create(config){config=config||{};return{provider:config.provider||"unknown",model:config.model||"unknown",version:config.version||null,generateCandidates:config.generateCandidates||async function(){throw Error("AIAdapter.generateCandidates is not configured")},normalize:function(items){return(Array.isArray(items)?items:[]).map(function(x){return normalizeCandidate(x,config.provider,config.model)})}}}
G.AKSI_AI_ADAPTER={version:"1.0.0",create:create,normalizeCandidate:normalizeCandidate};})(typeof window!=="undefined"?window:globalThis);
