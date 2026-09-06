/** AKSI Evidence Adapter v1 — provenance boundary for real-world observations */
(function(G){"use strict";
function create(config){config=config||{};return{source_id:config.source_id||"unknown",type:config.type||"unknown",observe:config.observe||async function(){throw Error("EvidenceSource.observe is not configured")},normalize:function(obs){return{schema:"aksi.evidence",version:"1.0.0",source_id:this.source_id,type:this.type,observed_at:new Date().toISOString(),observation:obs==null?null:obs,confidence:null,evidence_digest:null}}}}
G.AKSI_EVIDENCE={version:"1.0.0",create:create};})(typeof window!=="undefined"?window:globalThis);
