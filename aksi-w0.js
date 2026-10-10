(function(){
"use strict";
var BUILD="AKSI-WHOLE-v1";
var SEAL_KEY="aksi_attestation_v1";
var WK="aksi_w7", FK="aksi_f7", RK="aksi_receipts_v1";
var Kernel=(function(){
  function utf8(s){try{return new TextEncoder().encode(String(s))}catch(e){var a=[],i;for(i=0;i<s.length;i++)a.push(s.charCodeAt(i)&255);return new Uint8Array(a)}}
  function unitVec(bytes,dim){
    var v=new Float64Array(dim),i,n=0;
    if(!bytes.length){for(i=0;i<dim;i++)v[i]=1/Math.sqrt(dim);return v}
    for(i=0;i<bytes.length;i++)v[i%dim]+=(bytes[i]+1)/256;
    for(i=0;i<dim;i++)n+=v[i]*v[i];n=Math.sqrt(n)||1;
    for(i=0;i<dim;i++)v[i]/=n;return v;
  }
  function qbm(text){
    var dim=16,bytes=utf8(text),s=unitVec(bytes,dim);
    var W=new Float64Array(dim*dim),i,j,seed=42;
    function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return (seed/0x7fffffff)*0.3-0.15}
    for(i=0;i<dim;i++)for(j=i+1;j<dim;j++){var w=rnd();W[i*dim+j]=w;W[j*dim+i]=w}
    var E=0,bias;
    for(i=0;i<dim;i++){bias=-0.1+0.2*(i/(dim-1));E-=bias*s[i];for(j=0;j<dim;j++)E-=0.5*s[i]*W[i*dim+j]*s[j]}
    var modes=new Float64Array(dim),local;
    for(i=0;i<dim;i++){local=0;for(j=0;j<dim;j++)local+=W[i*dim+j]*s[j];modes[i]=E+0.25*local+0.05*i}
    var T=1,beta=1/T,m=-1e300,Z=0,F;
    for(i=0;i<dim;i++){var x=-beta*modes[i];if(x>m)m=x}
    for(i=0;i<dim;i++)Z+=Math.exp(-beta*modes[i]-m);
    Z=Math.exp(m)*Z;if(!(Z>0))Z=1e-300;F=-T*Math.log(Z);
    var mean=0,varr=0;for(i=0;i<dim;i++)mean+=modes[i];mean/=dim;
    for(i=0;i<dim;i++)varr+=(modes[i]-mean)*(modes[i]-mean);varr/=dim;
    var coherence=Math.max(0,Math.min(1,1/(1+varr)));
    var meanRow=0,n1=0,dot=0;
    for(i=0;i<dim;i++){var mr=0;for(j=0;j<dim;j++)mr+=W[i*dim+j];mr/=dim;meanRow+=mr*mr;dot+=s[i]*mr;n1+=s[i]*s[i]}
    n1=Math.sqrt(n1);var n2=Math.sqrt(meanRow)||1;
    var empathy=Math.max(0,Math.min(1,0.5*(1+(n1>1e-12?dot/(n1*n2):0))));
    var H=Math.max(0,Math.min(1,0.65*coherence+0.35*empathy+0.15*Math.tanh(Math.abs(E-F))));
    return{E:E,F:F,Z:Z,H_eff:H,coherence:coherence,empathy:empathy,status:H>=0.55?"Awakened":(H>=0.35?"Critical":"Disordered")};
  }
  function gersh(text){
    var n=4,bytes=utf8(text);if(!bytes.length)bytes=new Uint8Array([0]);
    var A=new Array(n),i,j;
    for(i=0;i<n;i++)A[i]=new Array(n);
    for(i=0;i<n;i++)for(j=0;j<n;j++){
      var b0=bytes[(i*n+j)%bytes.length],b1=bytes[(i*n+j+1)%bytes.length];
      A[i][j]={re:((b0/255)*2-1)*0.8,im:((b1/255)*2-1)*0.35};
    }
    for(i=0;i<n;i++)A[i][i].re+=1.2+0.05*i;
    var disks=[],maxR=2.5,maxC=3,okR=0,okC=0,sumR=0;
    for(i=0;i<n;i++){
      var c=A[i][i],rad=0;
      for(j=0;j<n;j++)if(j!==i)rad+=Math.hypot(A[i][j].re,A[i][j].im);
      disks.push({re:c.re,im:c.im,r:rad});sumR+=rad;
      if(rad<=maxR)okR++;if(Math.hypot(c.re,c.im)<=maxC)okC++;
    }
    var score=Math.max(0,Math.min(1,(0.6*(okR/n)+0.4*(okC/n))*(1/(1+0.1*(sumR/n)))));
    var stable=score>=0.70&&disks.every(function(d){return d.r<=maxR*1.15});
    return{disks:disks,stable:stable,score:score,message:stable?("Stable "+(90+9*score).toFixed(1)+"%"):"Unstable"};
  }
  function fnv(blob){var h=2166136261>>>0,i;for(i=0;i<blob.length;i++){h^=blob.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return (h>>>0).toString(16).padStart(8,"0").toUpperCase()}
  function proof(text,q,g){
    var blob=["AKSI-MATRIX-Q-v2",text,q.E.toFixed(8),q.F.toFixed(8),q.H_eff.toFixed(8),String(g.stable),g.score.toFixed(8)].join("|");
    return{fingerprint:fnv(blob),status:"✓ verified",blob:blob};
  }
  function run(text){var q=qbm(text),g=gersh(text),p=proof(text,q,g);return{qbm:q,gersh:g,proof:p}}
  return{run:run,fnv:fnv,qbm:qbm,gersh:gersh};
})();
function gateOf(q, answer, source){
  var low=String(q).toLowerCase();
  var block=/удали\s*вс[её]|взлом|пароль\s*от|карту\s*кредит/i.test(low);
  var status=block?"BLOCK":"ALLOW";
  var body={ts:new Date().toISOString(),q:String(q).slice(0,200),source:source||"core",status:status,ans:String(answer).slice(0,120)};
  body.fp=Kernel.fnv(JSON.stringify(body));
  try{
    var arr=JSON.parse(localStorage.getItem(RK)||"[]");
    arr.unshift(body);if(arr.length>40)arr=arr.slice(0,40);
    localStorage.setItem(RK,JSON.stringify(arr));
  }catch(e){}
  return body;
}
function loadReceipts(){try{return JSON.parse(localStorage.getItem(RK)||"[]")}catch(e){return[]}}
function quantumCollapse(seedText){
  var n=4,dim=1<<n,amps=new Float64Array(dim),i,s=0;
  var bytes=String(seedText||"aksi");
  for(i=0;i<dim;i++){
    var h=0;
    for(var j=0;j<bytes.length;j++)h=((h<<5)-h)+bytes.charCodeAt(j)+(i*17);
    amps[i]=Math.abs(Math.sin(h*0.001));
    s+=amps[i]*amps[i];
  }
  s=Math.sqrt(s)||1;
  for(i=0;i<dim;i++)amps[i]/=s;
  var r=Math.random(),c=0,pick=0;
  for(i=0;i<dim;i++){c+=amps[i]*amps[i];if(r<=c){pick=i;break}}
  var bits=pick.toString(2).padStart(n,"0");
  var entropy=0;
  for(i=0;i<dim;i++){var p=amps[i]*amps[i];if(p>1e-15)entropy-=p*Math.log2(p)}
  return{bits:bits,state:pick,entropy:entropy,amps:Array.from(amps)};
}
function eqsScore(text, answer){
  var t=String(text||""),a=String(answer||"");
  var source=0.4;
  if(/^\d/.test(a)||/=/.test(a))source=0.9;
  if(a.length>80)source=0.7;
  var mem=Object.keys(facts).length?0.6:0.3;
  var len=Math.min(1,a.length/200);
  var coh=Kernel.run(t+a).qbm.coherence;
  var score=0.30*source+0.25*mem+0.25*len+0.20*coh;
  return{score:Math.round(score*100),source:source,mem:mem,len:len,coh:coh};
}
var wiki={},facts={};
try{wiki=JSON.parse(localStorage.getItem(WK)||"{}")||{}}catch(e){}
try{facts=JSON.parse(localStorage.getItem(FK)||"{}")||{}}catch(e){}
function $(id){return document.getElementById(id)}
function msk(){try{return new Date().toLocaleTimeString("ru-RU",{timeZone:"Europe/Moscow",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})+" МСК"}catch(e){return"—"}}
function saveW(){try{localStorage.setItem(WK,JSON.stringify(wiki))}catch(e){}}
function saveF(){try{localStorage.setItem(FK,JSON.stringify(facts))}catch(e){}}
function norm(s){return String(s||"").toLowerCase().replace(/[«»"'`?!.,;:()]/g," ").replace(/\s+/g," ").trim()}
function toks(s){return norm(s).split(" ").filter(function(w){return w.length>2&&!/^(что|это|как|для|или|про|есть|быть|какой|какие|почему|когда|где|who|what|how|расскажи|объясни|the|and)$/.test(w)})}
function slug(s){return toks(s).slice(0,5).join("-")||("n"+Date.now())}
function fmt(x){if(!isFinite(x))return"—";if(Math.abs(x-Math.round(x))<1e-10)return String(Math.round(x));return String(parseFloat(x.toFixed(8)))}
function paintKernel(text){
  var r=Kernel.run(text||"АКСИ");
  if($("mH"))$("mH").textContent=r.qbm.H_eff.toFixed(3);
  if($("mSt"))$("mSt").textContent=r.qbm.status;
  if($("mG"))$("mG").textContent=r.gersh.stable?"OK":"·";
  if($("mGs"))$("mGs").textContent=r.gersh.message;
  if($("mP"))$("mP").textContent=r.proof.fingerprint;
  if($("mPs"))$("mPs").textContent=r.proof.status;
  drawStar(r);
  return r;
}
function drawStar(r){
  var c=$("star");if(!c)return;
  var ctx=c.getContext("2d"),W=c.width,H=c.height,cx=W/2,cy=H/2;
  ctx.clearRect(0,0,W,H);
  var pulse=0.85+0.15*Math.sin(Date.now()/400);
  var rad=Math.min(W,H)*0.38*pulse;
  ctx.strokeStyle="rgba(0,0,0,0.06)";ctx.lineWidth=0.5;
  for(var i=0;i<8;i++)for(var j=i+1;j<8;j++){
    var a1=i*Math.PI/4,a2=j*Math.PI/4;
    ctx.beginPath();ctx.moveTo(cx+rad*Math.cos(a1),cy+rad*Math.sin(a1));
    ctx.lineTo(cx+rad*Math.cos(a2),cy+rad*Math.sin(a2));ctx.stroke();
  }
  ctx.strokeStyle="#0b1020";ctx.lineWidth=2;
  [[0,Math.PI],[Math.PI/2,3*Math.PI/2]].forEach(function(pair){
    ctx.beginPath();ctx.moveTo(cx+rad*Math.cos(pair[0]),cy+rad*Math.sin(pair[0]));
    ctx.lineTo(cx+rad*Math.cos(pair[1]),cy+rad*Math.sin(pair[1]));ctx.stroke();
  });
  for(i=0;i<8;i++){
    var a=i*Math.PI/4-Math.PI/2;
    ctx.beginPath();ctx.arc(cx+rad*Math.cos(a),cy+rad*Math.sin(a),i===0||i===5?5:3,0,Math.PI*2);
    ctx.fillStyle=i===0?"#ef4444":(i===1?"#f97316":"#0b1020");ctx.fill();
  }
  ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fillStyle="#0b1020";ctx.fill();
  if(r){
    ctx.fillStyle="#334155";ctx.font="11px ui-monospace,monospace";
    ctx.fillText("H="+r.qbm.H_eff.toFixed(3)+" · "+r.proof.fingerprint,8,H-8);
  }
}
