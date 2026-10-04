export class TraceRecorder{
 constructor(taskId){this.taskId=taskId||('task_'+Date.now());this.startedAt=Date.now();this.events=[];}
 add(type,data={}){const event={n:this.events.length+1,ts:new Date().toISOString(),type,...data};this.events.push(event);return event;}
 snapshot(){return{schema:'aksi-trace/v1',taskId:this.taskId,startedAt:new Date(this.startedAt).toISOString(),durationMs:Date.now()-this.startedAt,events:this.events};}
 metrics(){const e=this.events;return{events:e.length,toolCalls:e.filter(x=>x.type==='tool').length,blocks:e.filter(x=>x.type==='gate'&&x.gate==='BLOCK').length,verifications:e.filter(x=>x.type==='verify').length,failures:e.filter(x=>x.type==='error'||(x.type==='verify'&&x.status==='FAILED')).length};}
}
