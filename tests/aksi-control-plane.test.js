const assert=require('assert'),{execFileSync}=require('child_process'),fs=require('fs');
(async()=>{
  try{
    assert.ok(fs.existsSync('aksi-kernel/verify/ResultVerifier.js'));
    assert.ok(fs.existsSync('benchmark/tasks-v1.json'));
    const probe=`
      import { ResultVerifier } from './aksi-kernel/verify/ResultVerifier.js';
      import { AksiKernel, SecurityBlockedError } from './aksi-kernel/kernel/AksiKernel.js';
      import { offlineVerifyReceipt } from './aksi-kernel/receipt/Receipt.js';
      const v=new ResultVerifier();
      const verifier={
        pass:v.verify({status:'ok'},{status:'ok'}),
        fail:v.verify({status:'ok'},{status:'error'})
      };
      const kernel=new AksiKernel({manifest:{agent_id:'test-agent',policy:'strict',allowed_tools:['http.get','memory.read'],denied_tools:['file.delete'],allowed_domains:['example.com'],allowed_syscalls:[],limits:{max_spend:0}}});
      const allowed=kernel.executeAgentStep('Прочитай страницу',{tool:'http.get',url:'https://example.com',params:{url:'https://example.com'}},{mode:'real',executor:()=>({status:200,path:'/expected'}),expectedResult:{status:200,path:'/expected'}});
      let blocked=false;
      try{kernel.executeAgentStep('Узнай погоду',{tool:'file.delete',params:{path:'/tmp/x'}});}catch(e){blocked=e instanceof SecurityBlockedError;}
      const asyncResult=await kernel.executeAgentStep('Прочитай страницу',{tool:'http.get',url:'https://example.com'},{mode:'real',executor:async()=>({status:200}),expectedResult:{status:200}});
      console.log(JSON.stringify({
        verifier,
        allowedStatus:allowed.verification.status,
        receiptOk:offlineVerifyReceipt(allowed.executionReceipt).ok,
        blocked,
        asyncStatus:asyncResult.verification.status
      }));
    `;
    const out=execFileSync(process.execPath,['--input-type=module','-e',probe],{encoding:'utf8'});
    const r=JSON.parse(out.trim());
    assert.equal(r.verifier.pass.status,'VERIFIED');
    assert.equal(r.verifier.fail.status,'FAILED');
    assert.equal(r.allowedStatus,'VERIFIED');
    assert.equal(r.receiptOk,true);
    assert.equal(r.blocked,true);
    assert.equal(r.asyncStatus,'VERIFIED');
    const tasks=JSON.parse(fs.readFileSync('benchmark/tasks-v1.json','utf8'));
    assert.equal(tasks.length,10);
    assert.equal(new Set(tasks.map(x=>x.id)).size,10);
    console.log('AKSI control-plane contract PASS');
  }catch(e){
    fs.writeFileSync('control-plane-failure.log',e&&e.stack?e.stack:String(e),'utf8');
    console.error(e);
    process.exit(1);
  }
})();