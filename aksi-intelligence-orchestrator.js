(function(){
  'use strict';
  const VERSION='1.0';
  const state={mode:'auto',task:null,plan:[],events:[],startedAt:null};
  const emit=(type,data)=>{const e={ts:new Date().toISOString(),type,data:data||{}};state.events.push(e);window.dispatchEvent(new CustomEvent('aksi:intelligence-event',{detail:e}));return e};
  function capabilities(){
    const g=window.AKSIModeGateway;
    return g?g.list():[];
  }
  function choose(task){
    const t=String(task||'').toLowerCase();
    const has=id=>capabilities().some(x=>x.id===id);
    let primary='webllm';
    if(/embedding|семантик|похож|поиск/.test(t)&&has('bert')) primary='bert';
    if(/класси|classif/.test(t)&&has('transformers-js')) primary='transformers-js';
    if(/onnx/.test(t)&&has('onnx-web')) primary='onnx-web';
    const quantum=/квант|quantum|grover|qft|bell/.test(t);
    const plan=[{stage:'understand',local:true},{stage:'infer',adapter:primary,local:primary!=='gpt-compatible'},{stage:'verify',local:true}];
    if(quantum) plan.splice(2,0,{stage:'experiment',engine:'aksi-quantum-runtime',local:true});
    return plan;
  }
  function plan(task){state.task=task;state.plan=choose(task);emit('plan-created',{task,plan:state.plan});return state.plan}
  async function run(task,runner){
    state.startedAt=Date.now();plan(task);emit('run-start',{task,mode:state.mode});
    let result;
    try{result=typeof runner==='function'?await runner({task,plan:state.plan,mode:state.mode}):null;emit('run-complete',{ok:true});return {protocol:'AKSI-INTEL/1',version:VERSION,task,plan:state.plan,result,events:state.events.slice()};}
    catch(error){emit('run-error',{message:String(error&&error.message||error)});throw error;}
  }
  function setMode(mode){if(!['auto','local','offline','hybrid'].includes(mode))throw new Error('invalid mode');state.mode=mode;emit('mode-change',{mode});return mode}
  window.AKSIIntelligence={version:VERSION,state,capabilities,plan,run,setMode};
  window.dispatchEvent(new CustomEvent('aksi:intelligence-ready',{detail:{version:VERSION}}));
})();