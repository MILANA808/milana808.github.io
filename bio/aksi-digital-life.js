/* AKSI Digital Life Engine — end-to-end causal digital organism simulation. */
(function(global){
  'use strict';
  const VERSION='0.1.0', PROTOCOL='AKSI-LIFE/0.1';
  function stable(v){
    if(v===null||typeof v!=='object') return JSON.stringify(v);
    if(Array.isArray(v)) return '['+v.map(stable).join(',')+']';
    return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
  }
  async function sha256(v){
    const bytes=new TextEncoder().encode(typeof v==='string'?v:stable(v));
    if(!global.crypto||!global.crypto.subtle) throw new Error('WebCrypto required');
    const d=await global.crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  class RNG{
    constructor(seed){let h=2166136261>>>0; for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)} this.s=h>>>0;}
    next(){let x=this.s;x^=x<<13;x^=x>>>17;x^=x<<5;this.s=x>>>0;return this.s/4294967296;}
  }
  class DigitalLife{
    constructor(spec={}){
      this.seed=String(spec.seed||'aksi-life-001'); this.rng=new RNG(this.seed);
      this.tick=0; this.energy=Number(spec.energy==null?100:spec.energy); this.reward=0;
      this.position=[0,0]; this.memory={food:0,danger:0}; this.fitness=0;
      this.neurons=Array.from({length:spec.neurons||32},(_,i)=>({id:i,v:0,threshold:1,spike:0}));
      this.synapses=[]; const n=this.neurons.length;
      for(let i=0;i<n;i++) for(let j=0;j<n;j++) if(i!==j && this.rng.next()<0.09) this.synapses.push({from:i,to:j,w:(this.rng.next()*2-1)*0.8,plastic:1});
      this.history=[]; this.branches=[]; this._lastHash=null;
    }
    observe(world={}){
      const dx=Number(world.food_x||0)-this.position[0], dy=Number(world.food_y||0)-this.position[1];
      const dd=Math.hypot(dx,dy)||1; const danger=Math.max(0,1-Math.hypot(this.position[0]-(world.danger_x||0),this.position[1]-(world.danger_y||0))/10);
      return {tick:this.tick,energy:this.energy,reward:this.reward,position:this.position.slice(),food_signal:Math.max(-1,Math.min(1,dx/5)),food_vertical:Math.max(-1,Math.min(1,dy/5)),danger_signal:danger,distance:dd,memory:{...this.memory}};
    }
    think(obs){
      const input=(obs.food_signal+obs.food_vertical-obs.danger_signal*1.4);
      this.neurons[0].v+=input;
      for(let i=0;i<this.synapses.length;i++){
        const s=this.synapses[i], src=this.neurons[s.from], dst=this.neurons[s.to];
        if(src.spike) dst.v+=s.w;
      }
      const spikes=[]; for(const neuron of this.neurons){neuron.spike=neuron.v>=neuron.threshold?1:0;if(neuron.spike){spikes.push(neuron.id);neuron.v=0;}else neuron.v*=0.92;}
      const left=spikes.filter(x=>x%3===0).length, right=spikes.filter(x=>x%3===1).length, brake=spikes.filter(x=>x%3===2).length;
      const action={dx:Math.max(-1,Math.min(1,(right-left)*0.25)),dy:Math.max(-1,Math.min(1,(spikes.length%3)-1)*0.35),cost:0.4+spikes.length*0.01,spikes:spikes.length};
      return action;
    }
    learn(outcome){
      const r=Number(outcome.reward||0); this.reward+=r; this.fitness+=r;
      this.memory.food=r>0?Math.min(1,this.memory.food+0.1):this.memory.food*0.995;
      this.memory.danger=r<0?Math.min(1,this.memory.danger+0.12):this.memory.danger*0.99;
      for(const s of this.synapses){const pre=this.neurons[s.from].spike,post=this.neurons[s.to].spike;if(pre&&post)s.w=Math.max(-1,Math.min(1,s.w+0.025*r));}
    }
    async step(world={}){
      const before={tick:this.tick,energy:this.energy,reward:this.reward,position:this.position.slice(),memory:{...this.memory}};
      const obs=this.observe(world), action=this.think(obs);
      this.position=[this.position[0]+action.dx,this.position[1]+action.dy];
      const hitFood=Math.hypot(this.position[0]-(world.food_x||0),this.position[1]-(world.food_y||0))<Number(world.food_radius||1);
      const hitDanger=Math.hypot(this.position[0]-(world.danger_x||0),this.position[1]-(world.danger_y||0))<Number(world.danger_radius||1);
      const outcome={reward:hitFood?5:(hitDanger?-5:-0.05),food:hitFood,danger:hitDanger};
      this.energy=Math.max(0,this.energy-action.cost+(hitFood?4:0)-(hitDanger?6:0)); this.learn(outcome); this.tick++;
      const after={tick:this.tick,energy:this.energy,reward:this.reward,position:this.position.slice(),memory:{...this.memory}};
      const record={protocol:PROTOCOL,seed:this.seed,tick:this.tick,observation:obs,action,outcome,before,after,neuron_spikes:this.neurons.filter(n=>n.spike).map(n=>n.id)};
      record.transition_hash=await sha256({previous:this._lastHash,record}); this._lastHash=record.transition_hash; record.previous=this.history.length?this.history[this.history.length-1].transition_hash:null; this.history.push(record); return record;
    }
    async fork(label='fork'){
      const snapshot={tick:this.tick,energy:this.energy,reward:this.reward,position:this.position.slice(),memory:{...this.memory},fitness:this.fitness,weights:this.synapses.map(s=>s.w)};
      const parent_hash=await sha256(snapshot); const child=new DigitalLife({seed:this.seed+'|'+label,neurons:this.neurons.length,energy:snapshot.energy});
      child.tick=snapshot.tick; child.reward=snapshot.reward; child.position=snapshot.position.slice(); child.memory={...snapshot.memory}; child.fitness=snapshot.fitness; child.synapses.forEach((s,i)=>{if(snapshot.weights[i]!=null)s.w=snapshot.weights[i]});
      this.branches.push({label,parent_hash,snapshot,child}); return {label,parent_hash,child};
    }
    async evidence(){
      const payload={protocol:PROTOCOL,version:VERSION,seed:this.seed,ticks:this.tick,fitness:this.fitness,final_state:{energy:this.energy,reward:this.reward,position:this.position,memory:this.memory},transitions:this.history.map(x=>x.transition_hash)};
      payload.evidence_id=await sha256(payload); return payload;
    }
  }
  global.AKSIDigitalLife={VERSION,PROTOCOL,DigitalLife,sha256,stable};
})(typeof globalThis!=='undefined'?globalThis:window);
