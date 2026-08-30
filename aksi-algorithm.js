/**
 * AKSI Metrics & Decision Engine v6.0
 * Observable, deterministic heuristics for product telemetry.
 * These metrics are engineering signals, not scientific proof of truth or consciousness.
 */
(function (G) {
  'use strict';
  var VERSION='6.0.0', LEDGER='aksi_metric_ledger_v6', STATS='aksi_metric_stats_v6';
  function entropy(s){s=String(s||'');if(!s)return 0;var f={},n=s.length,h=0,i,c,p;for(i=0;i<n;i++){c=s.charAt(i);f[c]=(f[c]||0)+1}for(c in f){p=f[c]/n;h-=p*Math.log2(p)}return h}
  function qcli(s){s=String(s||'');if(!s)return 0;var u={},i;for(i=0;i<s.length;i++)u[s.charAt(i)]=1;var a=Math.min(256,Object.keys(u).length),m=Math.log2(Math.max(2,a));return Math.min(1,entropy(s)/m)}
  function heff(s){s=String(s||'').trim();if(!s)return 0;var w=s.split(/\s+/),u={},i;for(i=0;i<w.length;i++)u[w[i].toLowerCase()]=1;return entropy(s)*(Object.keys(u).length/w.length)}
  function tokenize(s){return String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(function(x){return x.length>2})}
  function overlap(q,a){var qv=tokenize(q),av=tokenize(a),set={},hit=0,i;for(i=0;i<av.length;i++)set[av[i]]=1;for(i=0;i<qv.length;i++)if(set[qv[i]])hit++;return qv.length?Math.min(1,hit/qv.length):0}
  function coherence(s){s=String(s||'');if(s.length<8)return .35;var w=s.split(/\s+/).filter(Boolean),sent=s.split(/[.!?]+/).filter(function(x){return x.trim().length>4}),avg=w.length/Math.max(1,sent.length),v=Math.min(1,.45+entropy(s)/8);if(avg>4&&avg<40)v+=.15;if(/(.)\1{6,}/.test(s))v-=.25;return Math.max(.1,Math.min(1,v))}
  function eqs(s,o){o=o||{};var H=entropy(s),R=typeof o.reliability==='number'?o.reliability:.75,C=typeof o.coherence==='number'?o.coherence:coherence(s),T=typeof o.sourceTrust==='number'?o.sourceTrust:.6,M=typeof o.memoryResonance==='number'?o.memoryResonance:overlap(o.query||'',s);return Math.round(Math.max(0,Math.min(1,.22*Math.min(1,H/5)+.24*R+.2*C+.2*T+.14*M))*1000)/10}
  function aksi(eqsValue,structure,n){var A=.85,I=Math.max(.05,Math.min(1,(eqsValue||0)/100)),S=typeof structure==='number'?Math.max(0,Math.min(1,structure)):.8,N=Math.max(0,n||0);return Math.round(A*I*S*(1+.4*Math.sqrt(N))*1000)/1000}
  function resonance(s,aksiValue){var H=entropy(s),D=heff(s)/Math.max(.01,H||1);return Math.round(H*Math.min(1,(aksiValue||1)/3.5)*Math.min(1.2,D+.3)*100)/100}
  function dimax(metrics){var eq=(metrics.EQS||0)/100,q=(metrics.QCLI||0),co=metrics.coherence||0,src=metrics.sourceTrust||0;return Math.round((.35*eq+.2*q+.2*co+.25*src)*1000)/1000}
  function dimaxU5(m){return Math.round((m.DIMAX*.6+m.EQS/100*.4)*1000)/1000}
  function quantum3(seed){var x=String(seed||'');var h=0,i;for(i=0;i<x.length;i++)h=(h*31+x.charCodeAt(i))>>>0;var states=[];for(i=0;i<8;i++){var bit=((h>>>i)&1)^((h>>>(i+3))&1);states.push(bit?1:0)}var ones=states.reduce(function(a,b){return a+b},0);return{qubits:3,states:states,ones:ones,entropy:Math.round((-((ones/8)||1)*Math.log2((ones/8)||1)-(1-(ones/8)||1)*Math.log2(1-(ones/8)||1))*1000)/1000,mode:'deterministic-simulation'} }
  function load(){try{return JSON.parse(localStorage.getItem(LEDGER)||'[]')}catch(e){return[]}}
  function save(a){try{localStorage.setItem(LEDGER,JSON.stringify(a.slice(-500)))}catch(e){}}
  function seal(query,answer,m){var a=load(),prev=a.length?a[a.length-1].hash:'GENESIS',body={i:a.length,ts:Date.now(),q:String(query).slice(0,200),answerHash:hash(String(answer)),metrics:m,prev:prev};body.hash=hash(JSON.stringify(body));a.push(body);save(a);return body}
  function hash(s){var h1=0x811c9dc5,i;for(i=0;i<String(s).length;i++){h1^=String(s).charCodeAt(i);h1=Math.imul(h1,0x01000193)}return ('00000000'+(h1>>>0).toString(16)).slice(-8)}
  function verify(){var a=load(),i,b,h;for(i=0;i<a.length;i++){b=Object.assign({},a[i]);h=b.hash;delete b.hash;if(hash(JSON.stringify(b))!==h)return{ok:false,at:i,length:a.length};if(i&&a[i].prev!==a[i-1].hash)return{ok:false,at:i,length:a.length,reason:'link'}}return{ok:true,length:a.length}}
  function evaluate(query,answer,opts){opts=opts||{};var text=typeof answer==='string'?answer:(answer&&answer.text)||'',source=(answer&&answer.source)||opts.source||'local',trust=typeof opts.sourceTrust==='number'?opts.sourceTrust:.85,m={H:Math.round(entropy(text)*1000)/1000,QCLI:Math.round(qcli(text)*1000)/1000,H_eff:Math.round(heff(text)*1000)/1000,EQS:eqs(text,{query:query,reliability:opts.reliability,coherence:opts.coherence,sourceTrust:trust,memoryResonance:opts.memoryResonance}),coherence:Math.round(coherence(text)*1000)/1000,sourceTrust:trust,source:source,offline:opts.offline!==false};m.AKSI=aksi(m.EQS,opts.structure,m.n||0);m.resonance=resonance(text,m.AKSI);m.DIMAX=dimax(m);m.DIMAX_U5=dimaxU5(m);m.quantum=quantum3(query+'|'+text);m.n=load().length;return{ok:!!text,text:text,metrics:m,seal:opts.seal===false?null:seal(query,text,m),version:VERSION}}
  function status(){var a=load(),v=verify(),s;try{s=JSON.parse(localStorage.getItem(STATS)||'{}')}catch(e){s={}}return{version:VERSION,algorithm:'Observable Metrics & Decision Engine',ledgerOk:v.ok,ledgerLen:v.length,n:a.length,avgEQS:s.avgEQS||null,metrics:['H','QCLI','H_eff','EQS','AKSI','resonance','DIMAX','DIMAX-U v5','3-qubit simulation']}}
  G.AKSI_ALGORITHM={version:VERSION,evaluate,status,verify,quantum3,entropy,qcli,heff,overlap,coherence,seal};
  G.AKSI_METRICS=G.AKSI_ALGORITHM;
})(typeof window!=='undefined'?window:this);
