/** AKSI Runtime v1.0 compact for GH Pages. Full copy: engine.full.js in artifacts. Not AGI. aksilove@internet.ru */
(function(G){
'use strict';
var VERSION='1.0.0-runtime';
function uid(p){return(p||'id')+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3)}
function now(){return new Date().toISOString()}
function fnv(s){var h=0x811c9dc5;s=String(s||'');for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return('00000000'+(h>>>0).toString(16)).slice(-8)}
function tok(s){return String(s||'').toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu,' ').split(/\s+/).filter(function(w){return w.length>1})}
var TOOLS={web_search:{name:'web_search',risk_level:0},web_open:{name:'web_open',risk_level:0},github_read:{name:'github_read',risk_level:0},memory_write:{name:'memory_write',risk_level:1},report_write:{name:'report_write',risk_level:1}};
var SESSIONS={};
var LIMITS={MAX_ITERATIONS:20,TIME_LIMIT_MS:90000,ACTION_LIMIT:30,FAILURE_LIMIT:8,MAX_SOURCES:10};
function emit(session,type,data){
  var prev=session.proof.chain.length?session.proof.chain[session.proof.chain.length-1].hash:'genesis';
  var payload={event_id:uid('ev'),timestamp:now(),event_type:type,data:data||{},previous_event_hash:prev};
  payload.hash=fnv(payload.event_id+'|'+payload.timestamp+'|'+type+'|'+JSON.stringify(payload.data).slice(0,400)+'|'+prev);
  session.events.push(payload);
  session.proof.chain.push({hash:payload.hash,prev:prev,type:type,at:payload.timestamp});
  session.live.push({t:payload.timestamp.slice(11,19),type:type,detail:type});
  if(session._onLive)try{session._onLive(session.live[session.live.length-1],session)}catch(e){}
  return payload;
}
function makeTask(p){return Object.assign({id:uid('task'),parent_id:null,description:'',status:'PENDING',priority:5,dependencies:[],required_tools:[],evidence_required:true,risk_level:0,created_at:now(),started_at:null,completed_at:null,result:null,kind:'generic'},p||{})}
function planFromGoal(goal){
  var t1=makeTask({description:'Interpret goal',kind:'interpret',priority:1});
  var t2=makeTask({description:'Web research',kind:'research',priority:2,dependencies:[t1.id],required_tools:['web_search']});
  var t3=makeTask({description:'Extract evidence',kind:'extract',priority:3,dependencies:[t2.id],required_tools:['web_open']});
  var t4=makeTask({description:'Multi-path reasoning',kind:'reason',priority:4,dependencies:[t3.id]});
  var t5=makeTask({description:'Conflict check',kind:'conflict',priority:5,dependencies:[t4.id]});
  var t6=makeTask({description:'Follow-up research',kind:'re_research',priority:6,dependencies:[t5.id]});
  var t7=makeTask({description:'Report + memory + proof',kind:'report',priority:7,dependencies:[t6.id]});
  var tasks=[t1,t2,t3,t4,t5,t6,t7];
  if(/github\.com\/[\w.-]+\/[\w.-]+/i.test(goal))tasks.splice(3,0,makeTask({description:'GitHub API read',kind:'github',priority:3,dependencies:[t2.id],required_tools:['github_read']}));
  return tasks;
}
function topicOf(goal){var m=String(goal).match(/(?:исследуй|research|explore)\s+(.+?)(?:\.|$)/i);return(m?m[1]:goal).trim().slice(0,100)}
async function webSearch(q){
  var results=[],headers={Accept:'application/json','User-Agent':'AKSI-Runtime/1.0 (aksilove@internet.ru)'};
  try{
    var r=await fetch('https://en.wikipedia.org/w/api.php?action=opensearch&limit=5&namespace=0&format=json&origin=*&search='+encodeURIComponent(q),{headers:headers});
    if(r.ok){var d=await r.json();for(var i=0;i<(d[1]||[]).length;i++)results.push({title:d[1][i],snippet:(d[2]||[])[i]||'',url:(d[3]||[])[i],provider:'wikipedia_en'})}
  }catch(e){}
  try{
    var r2=await fetch('https://ru.wikipedia.org/w/api.php?action=opensearch&limit=4&namespace=0&format=json&origin=*&search='+encodeURIComponent(q),{headers:headers});
    if(r2.ok){var d2=await r2.json();for(var j=0;j<(d2[1]||[]).length;j++)results.push({title:d2[1][j],snippet:(d2[2]||[])[j]||'',url:(d2[3]||[])[j],provider:'wikipedia_ru'})}
  }catch(e2){}
  if(!results.length){
    var cands=tok(q).filter(function(w){return w.length>3}).slice(0,3).concat(['WebGPU','Large_language_model','WebLLM']);
    for(var t=0;t<cands.length&&results.length<5;t++){
      try{
        var rs=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(cands[t]),{headers:headers});
        if(rs.ok){var js=await rs.json();if(js.extract)results.push({title:js.title,snippet:js.extract.slice(0,300),url:(js.content_urls&&js.content_urls.desktop&&js.content_urls.desktop.page)||'',provider:'wikipedia_rest'})}
      }catch(ef){}
    }
  }
  return{ok:!!results.length,results:results};
}
async function webOpen(url){
  var headers={Accept:'application/json','User-Agent':'AKSI-Runtime/1.0 (aksilove@internet.ru)'};
  var m=String(url).match(/wikipedia\.org\/wiki\/(.+)$/i);
  if(!m)return{ok:false,error:'CORS/capability_gap for non-Wikipedia URL',capability_gap:true};
  var lang=url.indexOf('ru.wikipedia')>=0?'ru':'en';
  try{
    var r=await fetch('https://'+lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(decodeURIComponent(m[1])),{headers:headers});
    if(!r.ok)return{ok:false,error:'HTTP '+r.status};
    var j=await r.json();
    return{ok:true,title:j.title,extract:j.extract||'',url:url,confidence:0.75};
  }catch(e){return{ok:false,error:String(e.message||e)}}
}
async function githubRead(repo){
  var path=String(repo).replace(/^https?:\/\/github\.com\//,'').replace(/\.git$/,'');
  if(!/^[\w.-]+\/[\w.-]+$/.test(path))return{ok:false,error:'bad repo'};
  try{
    var r=await fetch('https://api.github.com/repos/'+path,{headers:{Accept:'application/vnd.github+json'}});
    if(!r.ok)return{ok:false,error:'HTTP '+r.status};
    var j=await r.json();
    return{ok:true,data:{full_name:j.full_name,description:j.description,stars:j.stargazers_count,language:j.language,open_issues:j.open_issues_count,html_url:j.html_url,updated_at:j.updated_at}};
  }catch(e){return{ok:false,error:String(e.message||e)}}
}
function addEvidence(s,e){var x=Object.assign({id:uid('evd'),kind:'FACT',content:'',url:null,timestamp:now(),confidence:0.5},e);s.evidence.push(x);return x}
function addClaim(s,c){var x=Object.assign({id:uid('clm'),text:'',source_path:null,confidence:0.5,timestamp:now()},c);s.claims.push(x);return x}
function detectConflicts(s){
  var found=[],pairs=[[/\bnot supported\b/i,/\bsupported\b/i],[/\bunavailable\b/i,/\bavailable\b/i]];
  for(var i=0;i<s.claims.length;i++)for(var j=i+1;j<s.claims.length;j++){
    if(s.claims[i].source_path===s.claims[j].source_path)continue;
    var a=s.claims[i].text,b=s.claims[j].text,hit=false;
    for(var p=0;p<pairs.length;p++)if((pairs[p][0].test(a)&&pairs[p][1].test(b))||(pairs[p][1].test(a)&&pairs[p][0].test(b)))hit=true;
    if(hit){var cf={id:uid('cf'),text_a:a.slice(0,160),text_b:b.slice(0,160),resolution_status:'UNRESOLVED',summary:'Polarity conflict'};s.conflicts.push(cf);found.push(cf);emit(s,'CONFLICT_DETECTED',{summary:cf.summary})}
  }
  return found;
}
function reasonPaths(goal,evs){
  var hi=evs.filter(function(e){return e.confidence>=0.6});
  return[
    {path:'A_conservative',summary:'High-confidence extracts: '+hi.length,claims:hi.slice(0,4).map(function(e){return{text:e.content.slice(0,240),source_path:e.url,confidence:e.confidence}})},
    {path:'B_synthesis',summary:'Merged coverage of goal terms',claims:[{text:evs.map(function(e){return e.content}).join(' ').slice(0,500),source_path:'synthesis',confidence:0.55}]},
    {path:'C_skeptical',summary:'Uncertainty: source diversity and CORS gaps',claims:[{text:'Not all claims independently verified; evidence nodes='+evs.length,source_path:'skeptical',confidence:0.5}]},
    {path:'AKSI_internal',summary:'Policy: FACT vs CLAIM separation',claims:[{text:'Internal: address goal with available evidence only. Goal «'+goal.slice(0,60)+'»',source_path:'aksi_internal',confidence:0.7}]}
  ];
}
function buildReport(s){
  var facts=s.evidence.filter(function(e){return e.kind==='FACT'});
  var lines=['# AKSI Runtime Report','','**Session:** '+s.id,'**Goal:** '+s.goal,'**Generated:** '+now(),'','## Executive summary','Collected '+s.evidence.length+' evidence ('+facts.length+' facts), '+s.claims.length+' claims, '+s.conflicts.length+' conflicts. Paths: '+(s.multi_llm.paths||[]).length+'.','','## FACT'];
  facts.slice(0,8).forEach(function(f,i){lines.push((i+1)+'. '+f.content.slice(0,260)+(f.url?' — '+f.url:''))});
  lines.push('','## CLAIM');s.claims.slice(0,8).forEach(function(c,i){lines.push((i+1)+'. '+c.text.slice(0,200))});
  lines.push('','## CONFLICTS');if(!s.conflicts.length)lines.push('None auto-detected.');
  s.conflicts.forEach(function(c){lines.push('- '+c.resolution_status+': '+c.summary)});
  lines.push('','## PROVENANCE','Chain length: '+s.proof.chain.length,'Last hash: '+((s.proof.chain.slice(-1)[0]||{}).hash||'—'),'','## Limitations','- Non-Wikipedia URLs often blocked by browser CORS (capability_gap).','- Multi-path is strategy-based unless external LLM endpoint configured.','- Hash-chain = log integrity, not truth of claims.');
  return{id:uid('rep'),executive_summary:lines[6],markdown:lines.join('\n'),session_id:s.id,at:now()};
}
function tasksReady(s){var done={};s.tasks.forEach(function(t){if(t.status==='COMPLETED')done[t.id]=true});return s.tasks.filter(function(t){return(t.status==='PENDING'||t.status==='WAITING')&&(t.dependencies||[]).every(function(d){return done[d]})})}
async function executeTask(s,task){
  task.status='RUNNING';task.started_at=now();emit(s,'TASK_START',{id:task.id,kind:task.kind});s.actions++;
  try{
    if(task.kind==='interpret'){task.result={topic:topicOf(s.goal)};emit(s,'GOAL_INTERPRETED',task.result)}
    else if(task.kind==='research'){
      var q=topicOf(s.goal);emit(s,'WEB_SEARCH',{query:q});
      var sr=await webSearch(q);
      if(!sr.ok){s.failures++;task.result={error:'TOOL_UNAVAILABLE_OR_EMPTY'};emit(s,'TOOL_UNAVAILABLE',{tool:'web_search'})}
      else{task.result={sources:sr.results.slice(0,LIMITS.MAX_SOURCES)};emit(s,'SOURCES_FOUND',{count:task.result.sources.length});
        task.result.sources.forEach(function(x){addEvidence(s,{kind:'SOURCE',content:(x.title||'')+' — '+(x.snippet||''),url:x.url,source:x.provider,confidence:0.55})})}
    }else if(task.kind==='extract'){
      var res=(s.tasks.find(function(t){return t.kind==='research'&&t.result&&t.result.sources})||{}).result;
      var sources=(res&&res.sources)||[];
      for(var i=0;i<Math.min(4,sources.length);i++){
        var open=await webOpen(sources[i].url);
        if(open.ok&&open.extract){var ev=addEvidence(s,{kind:'FACT',content:open.extract.slice(0,1200),url:sources[i].url,source:open.title,confidence:open.confidence||0.7});addClaim(s,{text:open.extract.slice(0,280),source_path:sources[i].url,confidence:open.confidence||0.7})}
        else{emit(s,'TOOL_UNAVAILABLE',{tool:'web_open',url:sources[i].url,capability_gap:!!open.capability_gap});if(sources[i].snippet)addEvidence(s,{kind:'FACT',content:sources[i].snippet,url:sources[i].url,confidence:0.4})}
      }
      task.result={extracts:s.evidence.filter(function(e){return e.kind==='FACT'}).length};
    }else if(task.kind==='github'){
      var gm=String(s.goal).match(/github\.com\/([\w.-]+\/[\w.-]+)/i);
      if(!gm)task.result={skipped:true};else{var gh=await githubRead(gm[1]);task.result=gh;if(gh.ok)addEvidence(s,{kind:'FACT',content:JSON.stringify(gh.data),url:gh.data.html_url,source:'github_api',confidence:0.85})}
    }else if(task.kind==='reason'){
      var evs=s.evidence.filter(function(e){return e.kind==='FACT'||e.kind==='SOURCE'});
      var paths=reasonPaths(s.goal,evs);s.multi_llm.paths=paths;s.multi_llm.matrix={paths:paths.map(function(p){return p.path})};
      paths.forEach(function(p){(p.claims||[]).forEach(function(c){addClaim(s,{text:c.text,source_path:c.source_path,confidence:c.confidence})})});
      task.result={paths:paths.length};emit(s,'MULTI_LLM_DONE',{paths:paths.length});
    }else if(task.kind==='conflict'){task.result={conflicts:detectConflicts(s).length}}
    else if(task.kind==='re_research'){
      var un=s.conflicts.filter(function(c){return c.resolution_status==='UNRESOLVED'});
      if(!un.length)task.result={skipped:true};else{var sr2=await webSearch(topicOf(s.goal)+' limitations');task.result={followup:sr2.ok?sr2.results.length:0};un.forEach(function(c){c.resolution_status='INVESTIGATED_UNRESOLVED'})}
    }else if(task.kind==='report'){s.report=buildReport(s);try{var key='aksi_runtime_memory_v1';var prev=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(prev))prev=[];prev.push({memory_id:uid('mem'),content:'Goal: '+s.goal.slice(0,120),type:'EPISODIC',timestamp:now(),confidence:0.7});localStorage.setItem(key,JSON.stringify(prev.slice(-100)))}catch(e){}task.result={report_id:s.report.id};emit(s,'REPORT_READY',{id:s.report.id})}
    else task.result={skipped:true};
    task.status='COMPLETED';task.completed_at=now();emit(s,'TASK_COMPLETED',{id:task.id,kind:task.kind});
  }catch(err){s.failures++;task.status='FAILED';task.result={error:String(err.message||err)};emit(s,'TASK_FAILED',{id:task.id,error:task.result.error})}
  return task;
}
async function runSession(s){
  s.status='RUNNING';s.started_at=now();emit(s,'GOAL_RECEIVED',{goal:s.goal});
  s.tasks=planFromGoal(s.goal);emit(s,'PLAN_CREATED',{count:s.tasks.length});
  var t0=Date.now();
  while(true){
    s.iterations++;
    if(s.iterations>LIMITS.MAX_ITERATIONS||Date.now()-t0>LIMITS.TIME_LIMIT_MS||s.actions>=LIMITS.ACTION_LIMIT||s.failures>=LIMITS.FAILURE_LIMIT){emit(s,'LIMIT_HIT',{});break}
    var ready=tasksReady(s);if(!ready.length)break;
    ready.sort(function(a,b){return a.priority-b.priority});
    await executeTask(s,ready[0]);
  }
  if(!s.report){var rt=s.tasks.find(function(t){return t.kind==='report'});if(rt&&rt.status!=='COMPLETED')await executeTask(s,rt);else s.report=buildReport(s)}
  emit(s,'PROOF_SEALED',{length:s.proof.chain.length});s.status='COMPLETED';s.completed_at=now();return s;
}
async function startGoal(goal,opts){
  opts=opts||{};
  var s={id:uid('sess'),goal:String(goal||'').trim(),created_at:now(),status:'PENDING',limits:LIMITS,iterations:0,actions:0,failures:0,events:[],tasks:[],evidence:[],claims:[],conflicts:[],memories:[],world:{known_facts:[],uncertainties:[],observations:[]},multi_llm:{paths:[],matrix:null},report:null,proof:{chain:[],valid:true},live:[],_onLive:opts.onLive||null};
  SESSIONS[s.id]=s;await runSession(s);return s;
}
var DEMOS=[
  {id:'demo1',title:'Research',goal:'Исследуй WebLLM. Найди реализации, проверь источники, подготовь отчёт с evidence.'},
  {id:'demo2',title:'GitHub',goal:'Исследуй github.com/mlc-ai/web-llm: описание, язык, issues — evidence summary.'},
  {id:'demo3',title:'HRR',goal:'Research holographic reduced representations HRR for AI memory. Primary sources and limitations.'},
  {id:'demo4',title:'Plan',goal:'Разбей задачу offline-first agent runtime с audit trail на подзадачи, исследуй аналоги, отчёт.'}
];
G.AKSI_RUNTIME={VERSION:VERSION,startGoal:startGoal,getSession:function(id){return SESSIONS[id]||null},listTools:function(){return TOOLS},DEMOS:DEMOS,TOOLS:TOOLS,_sessions:SESSIONS};
})(typeof window!=='undefined'?window:globalThis);
