/** AKSI Kernel — Canonical Action → Mandate → Permit → Execute → Verify → Receipt → Trace. */
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MandateManager } from '../mandate/MandateManager.js';
import { Exocortex } from '../exocortex/Exocortex.js';
import { AksiPermit, offlineVerifyReceipt } from '../permit/AksiPermit.js';
import { createReceipt, ensureKeyPair } from '../receipt/Receipt.js';
import { ResultVerifier } from '../verify/ResultVerifier.js';
import { canonicalAction } from '../action/CanonicalAction.js';
import { TraceRecorder } from '../trace/TraceRecorder.js';
const __dirname=dirname(fileURLToPath(import.meta.url));const RECEIPTS_DIR=join(__dirname,'../receipts');
export class SecurityBlockedError extends Error{constructor(result){super(`AKSI Security BLOCK: ${(result.reasons||[]).join(', ')}`);this.name='SecurityBlockedError';this.result=result;this.gate='BLOCK';this.receipt=result.receipt;}}
export class AksiKernel{
 constructor(opts={}){ensureKeyPair();this.mandate=new MandateManager(opts.manifest);this.exocortex=new Exocortex(opts.sessionId);this.permit=new AksiPermit({policy:this.mandate.getPolicy()});this.resultVerifier=new ResultVerifier();this.receiptLog=[];this.trace=new TraceRecorder(this.exocortex.sessionId);if(!existsSync(RECEIPTS_DIR))mkdirSync(RECEIPTS_DIR,{recursive:true});}
 executeAgentStep(userGoal,proposedToolCall,options={}){
  if(userGoal)this.exocortex.setGoal(userGoal);
  const action=canonicalAction({...proposedToolCall,goal:userGoal,sessionId:this.exocortex.sessionId,authority:this.mandate.getPolicy(),expected:options.expectedResult});
  this.trace.add('intent',{goal:userGoal,action});
  this.exocortex.addThought('propose',{tool:proposedToolCall?.tool,actionFingerprint:action.fingerprint});
  const decision=this.permit.verifyAction(proposedToolCall,this.exocortex,this.mandate);this._storeReceipt(decision.receipt);
  this.trace.add('gate',{gate:decision.gate,tool:proposedToolCall?.tool,reasons:decision.reasons});
  this.exocortex.addThought('gate',{tool:proposedToolCall?.tool,gate:decision.gate,note:(decision.reasons||[]).join('|')});
  if(!decision.allowed)throw new SecurityBlockedError(decision);
  if(options.mode==='real'&&typeof options.executor!=='function')throw new Error('AKSI real execution requires an explicit executor');
  const executor=typeof options.executor==='function'?options.executor:(call)=>this._simulateTool(call);
  this.trace.add('tool',{tool:proposedToolCall?.tool,actionFingerprint:action.fingerprint});
  const result=executor(proposedToolCall);
  if(result&&typeof result.then==='function')return result.then(actual=>this._finishExecution(proposedToolCall,actual,options,decision.receipt,action));
  return this._finishExecution(proposedToolCall,result,options,decision.receipt,action);
 }
 _finishExecution(proposedToolCall,toolResult,options,decisionReceipt,action){
  const verification=options.expectedResult!==undefined?this.resultVerifier.verify(options.expectedResult,toolResult):{status:'NOT_REQUESTED',reason:'no_expected_result'};
  this.trace.add('verify',{status:verification.status,expected:options.expectedResult,actual:toolResult,actionFingerprint:action.fingerprint});
  const executionReceipt=createReceipt({toolRequest:{...proposedToolCall,actionFingerprint:action.fingerprint},contextFingerprint:this.exocortex.contextFingerprint(),gate:'ALLOW',reasons:['execution_complete',verification.status.toLowerCase()],policy:this.mandate.getPolicy(),sessionId:this.exocortex.sessionId,expectedResult:options.expectedResult,actualResult:toolResult,verification});
  this._storeReceipt(executionReceipt);this.exocortex.addThought('execute',{tool:proposedToolCall?.tool,note:JSON.stringify(toolResult).slice(0,160)});
  return{ok:true,gate:'ALLOW',tool:proposedToolCall?.tool,action,toolResult,receipt:decisionReceipt,executionReceipt,verification,trace:this.trace.snapshot(),traceMetrics:this.trace.metrics(),context:this.exocortex.getContextSummary(),verify:offlineVerifyReceipt(executionReceipt)};
 }
 _simulateTool(call){const tool=call?.tool||'unknown',params=call?.params||{};if(tool==='weather.fetch'||tool==='http.get'){const q=params.city||params.q||call?.url||'local';return{simulated:true,tool,data:{location:q,temp_c:18,condition:'clear',source:'offline-sim'}};}if(tool==='memory.write')return{simulated:true,tool,stored:params.value||params.text||true};if(tool==='memory.read')return{simulated:true,tool,value:this.exocortex.getGoal()};if(tool==='search.web')return{simulated:true,tool,hits:[{title:'offline stub',q:params.q}]};if(tool==='file.read')return{simulated:true,tool,path:params.path,content:'[offline simulated read]'};return{simulated:true,tool,params};}
 _storeReceipt(receipt){this.receiptLog.push(receipt);writeFileSync(join(RECEIPTS_DIR,`${receipt.id}.json`),JSON.stringify(receipt,null,2),'utf8');}
 listReceipts(){if(!existsSync(RECEIPTS_DIR))return[];return readdirSync(RECEIPTS_DIR).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(join(RECEIPTS_DIR,f),'utf8')));}
 getPublicKeyPem(){return ensureKeyPair().publicKeyPem;}
 status(){return{agent:this.mandate.manifest.agent_id,policy:this.mandate.getPolicy(),session:this.exocortex.sessionId,goal:this.exocortex.getGoal(),receipts:this.receiptLog.length,trace:this.trace.metrics(),principle:'technology_serves_human'};}
}
export default AksiKernel;