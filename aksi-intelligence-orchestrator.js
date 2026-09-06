(function(){
  'use strict';
  const VERSION='1.1';
  const state={mode:'auto',task:null,plan:[],events:[],startedAt:null};
  const emit=(type,data)=>{const e={ts:new Date().toISOString(),type,data:data||{}};state.events.push(e);window.dispatchEvent(new CustomEvent('aksi:intelligence-event',{detail:e}));return e};
  function capabilities(){return window.AKSIModeGateway?window.AKSIModeGateway.list():[]}
  function choose(task){const t=String(task||'').toLowerCase();const has=id=>capabilities().some(x=>x.id===id);let primary='webllm';if(/embedding|семантик|похож|поиск/.test(t)&&has('bert'))primary='bert';if(/класси|classif/.test(t)&&has('transformers-js'))primary='transformers-js';if(/onnx/.test(t)&&has('onnx-web'))primary='onnx-web';if(state.mode==='offline')primary=has('webllm')?'webllm':'transformers-js';const quantum=/квант|quantum|grover|qft|bell/.test(t);const plan=[{stage:'understand',local:true},{stage:'infer',adapter:primary,local:primary!=='gpt-compatible'},{stage:'verify',local:true}];if(quantum)plan.splice(2,0,{stage:'experiment',engine:'aksi-quantum-runtime',local:true});return plan}
  function plan(task){state.task=task;state.plan=choose(task);emit('plan-created',{task,plan:state.plan});return state.plan}
  async function infer(task,options){const w=window.AKSI_WEBLLM;if(!w)throw new Error('AKSI_WEBLLM runtime not loaded');if(!w.ready()){emit('model-load-start',{task});await w.load(options&&options.modelId);emit('model-load-complete',w.status())}const result=await w.complete(task,options||{});emit('inference',{source:result.source,model:result.model,ok:!!result.text});if(!result.text)throw new Error(result.error||'local inference failed');return result}
  async function run(task,runner,options){state.startedAt=Date.now();state.events=[];plan(task);emit('run-start',{task,mode:state.mode});try{let result;if(typeof runner==='function')result=await runner({task,plan:state.plan,mode:state.mode,infer:(q,o)=>infer(q,o||options)});else result=await infer(task,options);emit('run-complete',{ok:true});return {protocol:'AKSI-INTEL/1',version:VERSION,task,plan:state.plan,result,events:state.events.slice()}}catch(error){emit('run-error',{message:String(error&&error.message||error)});throw error}}
  function setMode(mode){if(!['auto','local','offline','hybrid'].includes(mode))throw new Error('invalid mode');state.mode=mode;emit('mode-change',{mode});return mode}
  window.AKSIIntelligence={version:VERSION,state,capabilities,plan,run,infer,setMode};
  window.dispatchEvent(new CustomEvent('aksi:intelligence-ready',{detail:{version:VERSION}}));
})();