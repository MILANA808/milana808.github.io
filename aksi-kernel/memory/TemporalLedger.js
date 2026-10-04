export class TemporalLedger{
 constructor(seed=[]){this.events=[...seed];}
 append(fact,{validFrom=new Date().toISOString(),validTo=null,observedAt=new Date().toISOString(),source=null,evidence=[]}={}){const event={id:'t_'+(this.events.length+1).toString(36),fact,validFrom,validTo,observedAt,source,evidence:[...evidence]};this.events.push(event);return event;}
 activeAt(query,time=new Date().toISOString()){const t=Date.parse(time);return this.events.filter(e=>Date.parse(e.validFrom)<=t&&(e.validTo===null||t<Date.parse(e.validTo))).filter(e=>JSON.stringify(e.fact).toLowerCase().includes(String(query).toLowerCase()));}
 history(){return this.events.map(e=>({...e}));}
}
