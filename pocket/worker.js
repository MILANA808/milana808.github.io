let TJS=null;
let pipe=null;
let device='wasm';
const MODEL='onnx-community/Qwen3-0.6B-ONNX';

const post=(type,data={})=>self.postMessage({type,...data});

async function hasGPU(){
  try{
    return !!(self.navigator?.gpu && await self.navigator.gpu.requestAdapter());
  }catch(e){ return false; }
}

self.onmessage=async(e)=>{
  const m=e.data||{};
  if(m.type==='load'){
    if(pipe){post('ready',{device});return;}
    try{
      post('status',{message:'Загружаю Transformers.js…',progress:2});
      TJS=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0');
      const gpu=await hasGPU();
      device=gpu?'webgpu':'wasm';
      post('status',{message:gpu?'WebGPU найден · загружаю Qwen3…':'WebGPU недоступен · пробую WASM…',progress:6,device});
      pipe=await TJS.pipeline('text-generation',MODEL,{
        device,
        dtype:gpu?'q4f16':'q4',
        progress_callback:(x)=>{
          if(x&&typeof x.progress==='number')
            post('progress',{progress:Math.round(8+x.progress*90),file:String(x.file||x.status||'загрузка…').slice(-90)});
        }
      });
      post('ready',{device});
    }catch(err){
      post('error',{message:String(err?.stack||err?.message||err)});
    }
    return;
  }
  if(m.type==='generate'){
    if(!pipe){post('error',{message:'Модель ещё не загружена'});return;}
    try{
      let text='';
      const streamer=new TJS.TextStreamer(pipe.tokenizer,{
        skip_prompt:true,skip_special_tokens:true,
        callback_function:(t)=>{text+=t;post('token',{text:t});}
      });
      const out=await pipe(m.messages,{max_new_tokens:220,do_sample:false,streamer,
        chat_template_kwargs:{enable_thinking:false}});
      post('done',{text,raw:out});
    }catch(err){post('error',{message:String(err?.stack||err?.message||err)});}
  }
};
