/* AKSI Fly Brain — reference adapter, not a copied connectome. */
(function(global){
  'use strict';
  const VERSION='0.1.0', PROTOCOL='AKSI-FLY/0.1';
  const DATASET={provider:'FlyWire/Codex',release:'FAFB v783',organism:'Drosophila melanogaster',neurons:139255,connections:3732460,source:'https://codex.flywire.ai/'};
  function stable(v){
    if(v===null||typeof v!=='object') return v;
    if(Array.isArray(v)) return v.map(stable);
    return Object.keys(v).sort().reduce((o,k)=>(o[k]=stable(v[k]),o),{});
  }
  async function hash(v){
    if(!global.crypto||!global.crypto.subtle) throw new Error('WebCrypto required');
    const bytes=new TextEncoder().encode(JSON.stringify(stable(v)));
    const d=await global.crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  class FlyBrainStudy{
    constructor(spec={}){
      this.protocol=PROTOCOL; this.version=VERSION; this.dataset={...DATASET,...(spec.dataset||{})};
      this.neurons=new Map(); this.probes=[]; this.experiments=[];
    }
    registerNeuron(neuron){
      if(!neuron||neuron.id==null) throw new Error('neuron.id required');
      this.neurons.set(String(neuron.id),{...neuron}); return this.neurons.get(String(neuron.id));
    }
    addProbe(probe){
      const p={id:'probe-'+(this.probes.length+1),kind:'circuit',...probe}; this.probes.push(p); return p;
    }
    async recordExperiment(input={}){
      const record={protocol:PROTOCOL,dataset:this.dataset,probe_ids:(input.probe_ids||[]),stimulus:input.stimulus||{},model:input.model||{},action:input.action||{},outcome:input.outcome||{},plasticity:input.plasticity||{},assumptions:input.assumptions||[],measured:input.measured||false,timestamp:new Date().toISOString()};
      record.evidence_id=await hash(record); this.experiments.push(record); return record;
    }
    summary(){return {protocol:PROTOCOL,version:VERSION,dataset:this.dataset,registered_neurons:this.neurons.size,probes:this.probes.length,experiments:this.experiments.length};}
  }
  global.AKSIFlyBrain={VERSION,PROTOCOL,DATASET,FlyBrainStudy,hash,stable};
})(typeof globalThis!=='undefined'?globalThis:window);
