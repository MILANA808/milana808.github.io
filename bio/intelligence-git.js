/* AKSI Intelligence Git — causal branches for digital agents. */
(function(global){
  'use strict';
  const VERSION='0.1.1', PROTOCOL='AKSI-IGIT/0.1';
  function stable(v){
    if(v===null||typeof v!=='object') return v;
    if(Array.isArray(v)) return v.map(stable);
    return Object.keys(v).sort().reduce((o,k)=>(o[k]=stable(v[k]),o),{});
  }
  function text(v){ return JSON.stringify(stable(v)); }
  async function sha256(v){
    const bytes=new TextEncoder().encode(typeof v==='string'?v:text(v));
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  class IntelligenceGit{
    constructor({agent_id='agent',agent_version='0.1',world_seed='default',parent_state_hash=null}={}){
      this.agent_id=agent_id; this.agent_version=agent_version; this.world_seed=world_seed;
      this.parent_state_hash=parent_state_hash; this.branches=[]; this.current=null;
    }
    async init(initial_state={}){
      const state_hash=await sha256({world_seed:this.world_seed,state:initial_state});
      this.current={branch:'main',parent_state_hash:this.parent_state_hash,state_hash,initial_state,events:[]};
      this.branches=[this.current]; return this.current;
    }
    async record(event={}){
      if(!this.current) await this.init();
      const previous=this.current.events.length?this.current.events[this.current.events.length-1].transition_hash:this.current.state_hash;
      const transition_hash=await sha256({protocol:PROTOCOL,previous,event});
      const item={index:this.current.events.length,timestamp:new Date().toISOString(),...event,previous,transition_hash};
      this.current.events.push(item); this.current.state_hash=await sha256({previous_state:this.current.state_hash,transition_hash});
      return item;
    }
    async fork(label='fork'){
      if(!this.current) await this.init();
      const parent=this.current;
      const branch_id=await sha256({protocol:PROTOCOL,label,parent_state_hash:parent.state_hash,agent_id:this.agent_id});
      const child={branch:label+'-'+branch_id.slice(0,8),parent_branch:parent.branch,parent_state_hash:parent.state_hash,state_hash:parent.state_hash,initial_state:parent.initial_state,events:[]};
      this.branches.push(child); this.current=child; return child;
    }
    compare(a,b){
      const left=this.branches.find(x=>x.branch===a)||a, right=this.branches.find(x=>x.branch===b)||b;
      if(!left||!right) return null;
      const n=Math.min(left.events.length,right.events.length); let divergence=-1;
      for(let i=0;i<n;i++) if(left.events[i].transition_hash!==right.events[i].transition_hash){divergence=i;break;}
      if(divergence<0 && left.events.length!==right.events.length) divergence=n;
      const ancestry = left.parent_state_hash===right.parent_state_hash ||
        left.parent_state_hash===right.state_hash || right.parent_state_hash===left.state_hash ||
        (left.parent_state_hash && right.parent_state_hash && left.parent_state_hash===right.parent_state_hash);
      return {protocol:PROTOCOL,left:left.branch,right:right.branch,common_parent:Boolean(ancestry),divergence_index:divergence,left_events:left.events.length,right_events:right.events.length,left_state_hash:left.state_hash,right_state_hash:right.state_hash};
    }
    async export(){
      return {protocol:PROTOCOL,version:VERSION,agent:{id:this.agent_id,version:this.agent_version},world_seed:this.world_seed,branches:this.branches};
    }
  }
  global.AKSIIntelligenceGit={VERSION,PROTOCOL,IntelligenceGit,sha256};
})(globalThis);
