(function(){"use strict";
var S={entropy:null,bits:null,eqs:null,lastGate:null,did:null,chain:[],T:1.2,mag:null,Cv:null,phase:"—",Tc:2,spins:null,N:16,H_eff:null,energy:null},bus={},_booted=0;
function on(e,f){(bus[e]||(bus[e]=[])).push(f)}
function emit(e,d){S.chain.push({t:Date.now(),ev:e,d:d||0});if(S.chain.length>40)S.chain=S.chain.slice(-40);(bus[e]||[]).forEach(function(f){try{f(d)}catch(x){}});paintTop();paintChain()}
function $(i){return document.getElementById(i)}
function set(i,t){var e=$(i);if(e)e.textContent=t}
function mskNow(){try{return new Date().toLocaleTimeString("ru-RU",{timeZone:"Europe/Moscow",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})+" МСК"}catch(e){var x=new Date(Date.now()+108e5);function p(n){return(n<10?"0":"")+n}return p(x.getUTCHours())+":"+p(x.getUTCMinutes())+":"+p(x.getUTCSeconds())+" МСК"}}
function paintTop(){set("msk",mskNow());set("qEnt","H="+(S.entropy==null?"—":(+S.entropy).toFixed(2)));set("eqsLive","EQS="+(S.eqs==null?"—":S.eqs));set("gateLive","gate="+(S.lastGate||"—"));set("phaseLive","φ="+(S.phase||"—"));var b=$("sharedBox");if(b)b.textContent="T="+S.T.toFixed(2)+" · φ="+S.phase+" · m="+(S.mag==null?"—":(+S.mag).toFixed(3))+" · EQS="+(S.eqs==null?"—":S.eqs)+" · gate="+(S.lastGate||"—")}
function paintChain(){var el=$("chainLog");if(!el)return;el.textContent=S.chain.slice(-8).map(function(c){return c.ev+(c.d&&c.d.note?" · "+c.d.note:"")}).join("\n")||"—"}
function go(n){document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.getAttribute("data-p")===n)});document.querySelectorAll(".bnav button").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-go")===n)});try{history.replaceState(null,"","#"+n)}catch(e){}window.scrollTo(0,0);if(n==="world")requestAnimationFrame(worldFrame);if(n==="phase")try{drawPhaseChart()}catch(e){};if(n==="chat"){var inp=$("chatIn");if(inp)setTimeout(function(){inp.focus()},120)}}
function b64(u){var s="",i;for(i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}
async function ensureDid(){if(S.did&&S._priv)return;try{var kp=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);S._priv=kp.privateKey;var raw=new Uint8Array(await crypto.subtle.exportKey("raw",kp.publicKey));S.did="did:aksi:p256:"+b64(raw).replace(/[^a-zA-Z0-9]/g,"").slice(0,22)}catch(e){S.did="did:aksi:local"}set("didShort",(S.did||"").slice(0,16)+"…");set("didFull",S.did||"—")}
async function signPayload(o){await ensureDid();if(!S._priv)return"unsigned";try{var m=new TextEncoder().encode(JSON.stringify(o));return b64(new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},S._priv,m)))}catch(e){return"err"}}

/* ── Math Engine (no templates: parse → compute → report) ── */
function toks(s){
  s=String(s).toLowerCase().replace(/,/g,".").replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/\^/g,"**");
  s=s.replace(/π/g," pi ").replace(/\bpi\b/g," pi ").replace(/\be\b/g," E ");
  s=s.replace(/√\s*\(/g,"sqrt(").replace(/√\s*(\d+(?:\.\d+)?)/g,"sqrt($1)");
  s=s.replace(/корень(?:\s*из)?\s*\(?\s*([\d.]+)\s*\)?/g,"sqrt($1)");
  s=s.replace(/sin|cos|tan|log|ln|sqrt|abs/g,function(m){return m});
  var out=[],i=0,n=s.length;
  while(i<n){
    var c=s[i];
    if(c===" "||c==="\t"){i++;continue}
    if(/[0-9.]/.test(c)){var j=i;while(j<n&&/[0-9.]/.test(s[j]))j++;out.push({t:"n",v:parseFloat(s.slice(i,j))});i=j;continue}
    if(/[a-zа-я]/i.test(c)){var k=i;while(k<n&&/[a-zа-я0-9_]/i.test(s[k]))k++;var w=s.slice(i,k);if(w==="pi"||w==="PI")out.push({t:"n",v:Math.PI});else if(w==="e"||w==="E")out.push({t:"n",v:Math.E});else out.push({t:"f",v:w});i=k;continue}
    if(c==="*"&&s[i+1]==="*"){out.push({t:"o",v:"**"});i+=2;continue}
    if("+-*/()^".indexOf(c)>=0){out.push({t:"o",v:c==="^"?"**":c});i++;continue}
    i++;
  }
  return out;
}
function toRPN(tokens){
  var prec={"**":4,"*":3,"/":3,"+":2,"-":2},right={"**":1};
  var out=[],st=[],i,tk;
  for(i=0;i<tokens.length;i++){
    tk=tokens[i];
    if(tk.t==="n")out.push(tk);
    else if(tk.t==="f")st.push(tk);
    else if(tk.v==="(")st.push(tk);
    else if(tk.v===")"){
      while(st.length&&st[st.length-1].v!=="(")out.push(st.pop());
      if(st.length&&st[st.length-1].v==="(")st.pop();
      if(st.length&&st[st.length-1].t==="f")out.push(st.pop());
    }else if(tk.t==="o"){
      if(tk.v==="-"&&(i===0||(tokens[i-1].t==="o"&&tokens[i-1].v!==")"))){out.push({t:"n",v:0});}
      while(st.length&&st[st.length-1].t==="o"){
        var top=st[st.length-1].v,pr=prec[tk.v]||0,pt=prec[top]||0;
        if((right[tk.v]?pr<pt:pr<=pt))out.push(st.pop());else break;
      }
      st.push(tk);
    }
  }
  while(st.length)out.push(st.pop());
  return out;
}
function evalRPN(rpn){
  var st=[],i,tk,a,b,fn;
  for(i=0;i<rpn.length;i++){
    tk=rpn[i];
    if(tk.t==="n")st.push(tk.v);
    else if(tk.t==="f"){
      a=st.pop();if(a==null)throw new Error("fn");
      fn=tk.v;
      if(fn==="sqrt")st.push(Math.sqrt(a));
      else if(fn==="sin")st.push(Math.sin(a));
      else if(fn==="cos")st.push(Math.cos(a));
      else if(fn==="tan")st.push(Math.tan(a));
      else if(fn==="log")st.push(Math.log10?Math.log10(a):Math.log(a)/Math.LN10);
      else if(fn==="ln")st.push(Math.log(a));
      else if(fn==="abs")st.push(Math.abs(a));
      else throw new Error("unknown fn "+fn);
    }else if(tk.t==="o"){
      b=st.pop();a=st.pop();if(a==null||b==null)throw new Error("op");
      if(tk.v==="+")st.push(a+b);
      else if(tk.v==="-")st.push(a-b);
      else if(tk.v==="*")st.push(a*b);
      else if(tk.v==="/"){if(b===0)throw new Error("div0");st.push(a/b)}
      else if(tk.v==="**")st.push(Math.pow(a,b));
      else throw new Error("op");
    }
  }
  if(st.length!==1)throw new Error("expr");
  return st[0];
}
function evalExpr(s){
  try{return evalRPN(toRPN(toks(s)))}catch(e){return null}
}
function fmtNum(x){
  if(x==null||!isFinite(x))return "—";
  if(Math.abs(x-Math.round(x))<1e-10)return String(Math.round(x));
  var t=Math.abs(x);
  if(t>=1e6||(t>0&&t<1e-4))return x.toExponential(6);
  return String(parseFloat(x.toFixed(10)));
}
function solveLinear(a,b){if(Math.abs(a)<1e-12)return null;return -b/a}
function solveQuad(a,b,c){
  if(Math.abs(a)<1e-12){var x=solveLinear(b,c);return x==null?[]:[x]}
  var d=b*b-4*a*c;
  if(d<-1e-12)return [];
  if(Math.abs(d)<1e-12)return [-b/(2*a)];
  var s=Math.sqrt(d);return [(-b+s)/(2*a),(-b-s)/(2*a)];
}
