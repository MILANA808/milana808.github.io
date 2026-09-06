(function(){
  'use strict';
  const adapters=new Map();
  const builtin=[
    {id:'webllm',kind:'llm',runtime:'WebGPU',local:true,capabilities:['chat','generation']},
    {id:'transformers-js',kind:'transformer',runtime:'WASM/WebGPU',local:true,capabilities:['text','embedding','classification','vision','audio']},
    {id:'onnx-web',kind:'ml',runtime:'WASM/WebGPU',local:true,capabilities:['inference']},
    {id:'bert',kind:'encoder',runtime:'Transformers.js/ONNX',local:true,capabilities:['embedding','classification']},
    {id:'gpt-compatible',kind:'llm',runtime:'HTTP gateway',local:false,capabilities:['chat','generation']},
    {id:'custom-python',kind:'bridge',runtime:'local HTTP/WebSocket',local:true,capabilities:['custom']},
    {id:'custom-rust',kind:'bridge',runtime:'WASM/native bridge',local:true,capabilities:['custom']}
  ];
  builtin.forEach(x=>adapters.set(x.id,Object.assign({},x)));
  function register(meta,handler){if(!meta||!meta.id)throw new Error('adapter id required');adapters.set(meta.id,Object.assign({},meta));if(handler)adapters.get(meta.id).handler=handler;return adapters.get(meta.id)}
  function list(){return Array.from(adapters.values()).map(x=>{const y=Object.assign({},x);delete y.handler;return y})}
  async function infer(id,input,options){const a=adapters.get(id);if(!a)throw new Error('Unknown model adapter: '+id);if(typeof a.handler!=='function')throw new Error('Adapter registered but runtime is not loaded: '+id);return a.handler(input,options||{})}
  function health(){return {schema:'AKSI-MODEL-GATEWAY-1',adapters:list(),webgpu:!!navigator.gpu,crypto:!!(window.crypto&&crypto.subtle),online:navigator.onLine!==false}}
  window.AKSIModeGateway={version:'1.0',register,list,infer,health};
  window.dispatchEvent(new CustomEvent('aksi:model-gateway-ready',{detail:health()}));
})();
