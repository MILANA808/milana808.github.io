/**
 * AKSI WEB EVIDENCE v1.0
 * Internet is untrusted input: retrieve -> normalize -> cite -> verify.
 * Browser-safe providers only; no API keys. Sources remain explicit.
 */
(function (G) {
  'use strict';
  var VERSION = '1.0.0-web-evidence';
  var CACHE = 'aksi_web_evidence_v1';
  var MAX = 8;
  function now(){ return Date.now(); }
  function clean(s){ return String(s || '').replace(/\s+/g,' ').trim(); }
  function key(s){ return clean(s).toLowerCase(); }
  function load(){ try{return JSON.parse(localStorage.getItem(CACHE)||'{}')||{};}catch(e){return {};}}
  function save(x){try{localStorage.setItem(CACHE,JSON.stringify(x));}catch(e){}}
  async function json(url){
    var r=await fetch(url,{headers:{'Accept':'application/json'},cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }
  function source(url,title,provider,summary,extra){
    return {url:url,title:clean(title)||url,provider:provider,summary:clean(summary),retrievedAt:new Date().toISOString(),trust:'unverified',kind:(extra&&extra.kind)||'web'};
  }
  async function wikipedia(q,lang){
    lang=lang||(/[а-яё]/i.test(q)?'ru':'en');
    var api='https://'+lang+'.wikipedia.org/w/api.php?action=opensearch&search='+encodeURIComponent(q)+'&limit=4&namespace=0&format=json&origin=*';
    var a=await json(api), out=[];
    var titles=a[1]||[], urls=a[3]||[];
    for(var i=0;i<titles.length;i++){
      var u=urls[i]; if(!u) continue;
      try{
        var page=await json('https://'+lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(titles[i]));
        if(page&&page.extract) out.push(source(u,page.title||titles[i],'wikipedia',page.extract,{kind:'encyclopedia'}));
      }catch(e){}
    }
    return out;
  }
  async function crossref(q){
    var d=await json('https://api.crossref.org/works?query.bibliographic='+encodeURIComponent(q)+'&rows=4');
    var items=(d.message&&d.message.items)||[];
    return items.map(function(x){
      var title=(x.title&&x.title[0])||'Untitled';
      var url=x.URL||('https://doi.org/'+x.DOI);
      var author=(x.author||[]).slice(0,3).map(function(a){return clean((a.given||'')+' '+(a.family||''));}).join(', ');
      return source(url,title,'crossref',(author?author+'. ':'')+(x.publisher||'')+(x.published&&x.published['date-parts']?' · '+x.published['date-parts'][0].join('-'):''),{kind:'research'});
    });
  }
  async function search(q,opts){
    opts=opts||{}; q=clean(q); if(!q) return {ok:false,query:'',sources:[],claims:[],providers:[]};
    var c=load(), ck=key(q), cached=c[ck];
    if(!opts.refresh && cached && now()-cached.ts<15*60*1000) return cached.value;
    var lang=/[а-яё]/i.test(q)?'ru':'en', tasks=[];
    tasks.push(wikipedia(q,lang).catch(function(){return [];}));
    if(opts.research!==false) tasks.push(crossref(q).catch(function(){return [];}));
    var groups=await Promise.all(tasks), sources=[].concat.apply([],groups).slice(0,MAX);
    var unique=[], seen={};
    sources.forEach(function(s){var k=s.url||s.title;if(!seen[k]){seen[k]=1;unique.push(s);}});
    var result={ok:true,version:VERSION,query:q,sources:unique,providers:Array.from(new Set(unique.map(function(s){return s.provider;}))),retrievedAt:new Date().toISOString()};
    c[ck]={ts:now(),value:result};save(c);return result;
  }
  function evidenceText(r){
    return (r.sources||[]).map(function(s,i){return '['+(i+1)+'] '+s.title+' — '+s.url+'\n'+s.summary;}).join('\n\n');
  }
  G.AKSI_WEB_EVIDENCE={version:VERSION,search:search,evidenceText:evidenceText,clear:function(){try{localStorage.removeItem(CACHE);}catch(e){}}};
})(typeof window!=='undefined'?window:globalThis);
