(function(){
  'use strict';
  const adapters=new Map();
  const builtin=[{id:'webllm',kind:'llm',runtime:'WebGPU',local:true,capabilities:['chat','generation'],runtime_loaded:false},{id:'transformers-js',kind:'transformer',runtime:'WASM/WebGPU',local:true,capabilities:['text','embedding','classification','vision','audio'],runtime_loaded:false},{id:'onnx-web',kind:'ml',runtime:'WASM/WebGPU',local:true,capabilities:['inference'],runtime_loaded:false},{id:'bert',kind:'encoder',runtime:'Transformers.js/ONNX',local:true,capabilities:['embedding','classification'],runtime_loaded:false},{id:'gpt-compatible',kind:'llm',runtime:'HTTP gateway',local:false,capabilities:['chat','generation'],runtime_loaded:false},{id:'custom-python',kind:'bridge',runtime:'local HTTP/WebSocket',local:true,capabilities:['custom'],runtime_loaded:false},{id:'custom-rust',kind:'bridge',runtime:'WASM/native bridge',local:true,capabilities:['custom'],runtime_loaded:false}];
  builtin.forEach(x=>adapters.set(x.id,Object.assign({},x)));
  function register(meta,handler){if(!meta||!meta.id)throw new Error('adapter id required');adapters.set(meta.id,Object.assign({},adapters.get(meta.id)||{},meta));if(handler){adapters.get(meta.id).handler=handler;adapters.get(meta.id).runtime_loaded=true}return adapters.get(meta.id)}
  function list(){return Array.from(adapters.values()).map(x=>{const y=Object.assign({},x);delete y.handler;return y})}
  async function infer(id,input,options){const a=adapters.get(id);if(!a)throw new Error('Unknown model adapter: '+id);if(typeof a.handler!=='function')throw new Error('Runtime is not loaded: '+id);return a.handler(input,options||{})}
  function health(){const all=list();return {schema:'AKSI-MODEL-GATEWAY-1',adapters:all,adapter_count:all.length,runtime_count:all.filter(x=>x.runtime_loaded).length,webgpu:!!navigator.gpu,crypto:!!(window.crypto&&crypto.subtle),online:navigator.onLine!==false}}
  function bridge(){const w=window.AKSI_WEBLLM;if(!w)return false;register({id:'webllm',kind:'llm',runtime:'WebLLM/WebGPU',local:true,capabilities:['chat','generation']},(input,options)=>w.complete(input,options));window.dispatchEvent(new CustomEvent('aksi:gateway-bridged',{detail:health()}));return true}
  window.AKSIModeGateway={version:'1.3',register,list,infer,health,bridge};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bridge);else bridge();
  window.addEventListener('aksi:webllm-ready',bridge);
  window.dispatchEvent(new CustomEvent('aksi:model-gateway-ready',{detail:health()}));
})();
