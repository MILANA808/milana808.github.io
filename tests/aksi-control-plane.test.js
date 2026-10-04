const assert=require('assert');const{execFileSync}=require('child_process');const fs=require('fs');const verifierPath='aksi-kernel/verify/ResultVerifier.js';assert.ok(fs.existsSync(verifierPath));assert.ok(fs.existsSync('benchmark/tasks-v1.json'));
const probe=`
import { ResultVerifier } from './aksi-kernel/verify/ResultVerifier.js';
import { AksiKernel, SecurityBlockedError } from './aksi-kernel/kernel/AksiKernel.js';
import { offlineVerifyReceipt } from './aksi-kernel/receipt/Receipt.js';
const v=new ResultVerifier();console.log(JSON.stringify({pass:v.verify({status:'ok'},{status:'ok'}),fail:v.verify({status:'ok'},{status:'error'})}));
`;const out=execFileSync(process.execPath,['--input-type=module','-e',probe],{encoding:'utf8'});const r=JSON.parse(out.trim());assert.equal(r.pass.status,'VERIFIED');assert.equal(r.fail.status,'FAILED');
const kernel=new AksiKernel({manifest:{agent_id:'test-agent',policy:'strict',allowed_tools:['http.get','memory.read'],denied_tools:['file.delete'],allowed_domains:['example.com'],allowed_syscalls:[],limits:{max_spend:0}}});
const allowed=kernel.executeAgentStep('Прочитай страницу',{tool:'http.get',url:'https://example.com',params:{url:'https://example.com'}},{mode:'real',executor:()=>({status:200,path:'/expected'}),expectedResult:{status:200,path:'/expected'}});assert.equal(allowed.verification.status,'VERIFIED');assert.equal(offlineVerifyReceipt(allowed.executionReceipt).ok,true);
let blocked=false;try{kernel.executeAgentStep('Узнай погоду',{tool:'file.delete',params:{path:'/tmp/x'}});}catch(e){blocked=e instanceof SecurityBlockedError;}assert.equal(blocked,true);
const asyncResult=await kernel.executeAgentStep('Прочитай страницу',{tool:'http.get',url:'https://example.com'},{mode:'real',executor:async()=>({status:200}),expectedResult:{status:200}});assert.equal(asyncResult.verification.status,'VERIFIED');
const tasks=JSON.parse(fs.readFileSync('benchmark/tasks-v1.json','utf8'));assert.equal(tasks.length,10);assert.equal(new Set(tasks.map(x=>x.id)).size,10);console.log('AKSI control-plane contract PASS');
