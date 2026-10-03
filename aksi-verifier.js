/**
 * AKSI Independent Verification Engine v0.1
 * Separate from ADIA scoring: verifies claim/evidence linkage.
 *
 * This module does NOT decide whether a claim is true in the world.
 * It checks whether supplied evidence text actually supports the
 * claim at a deterministic lexical level and reports coverage.
 */
(function(G){"use strict";
var VERSION="0.1.0";
function norm(s){return String(s||"").toLowerCase().normalize("NFKC").replace(/https?:\/\/[^\s]+/g," ").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim()}
function tokens(s){return norm(s).split(/\s+/).filter(function(x){return x.length>2})}
function set(a){var o={};for(var i=0;i<a.length;i++)o[a[i]]=1;return o}
function overlap(a,b){var A=tokens(a),B=set(tokens(b)),hit=0;for(var i=0;i<A.length;i++)if(B[A[i]])hit++;return A.length?hit/A.length:0}
function claims(text){return String(text||"").split(/(?<=[.!?…])\s+|\n+/).map(function(x){return x.trim()}).filter(function(x){return x.length>=12})}
function verifyClaim(claim,evidence){
 evidence=Array.isArray(evidence)?evidence:[];
 var best=0,bestIndex=-1;
 for(var i=0;i<evidence.length;i++){
  var e=typeof evidence[i]==="string"?{text:evidence[i]}:evidence[i]||{};
  var v=overlap(claim,[e.title,e.text,e.snippet].filter(Boolean).join(" "));
  if(v>best){best=v;bestIndex=i}
 }
 var status=best>=0.55?"SUPPORTED":best>=0.28?"PARTIAL":"UNSUPPORTED";
 return {claim:claim,status:status,support:Math.round(best*1000)/1000,evidence_index:bestIndex};
}
function verify(answer,evidence){
 var cs=claims(answer),out=[],i;
 for(i=0;i<cs.length;i++)out.push(verifyClaim(cs[i],evidence));
 var supported=out.filter(function(x){return x.status==="SUPPORTED"}).length;
 var partial=out.filter(function(x){return x.status==="PARTIAL"}).length;
 var unsupported=out.filter(function(x){return x.status==="UNSUPPORTED"}).length;
 return {version:VERSION,claim_count:out.length,supported:supported,partial:partial,unsupported:unsupported,
  coverage:out.length?Math.round(((supported+0.5*partial)/out.length)*1000)/1000:0,claims:out};
}
G.AKSI_VERIFIER={version:VERSION,verify:verify,verifyClaim:verifyClaim};
})(typeof window!=="undefined"?window:globalThis);
