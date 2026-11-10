import {billingOperations} from './billing-inbox';
import {configurationErrors} from './runtime-config';
let cached:{ok:boolean;until:number}|null=null,checking:Promise<boolean>|null=null;
/** Public uptime probe reveals one boolean. Coalesce/cache probes to avoid a public DB amplifier. */
export async function publicHealth(){
  if(cached&&cached.until>Date.now())return cached.ok;
  if(!checking)checking=(async()=>{
    try{
      const state=await billingOperations(),configuration=process.env.NODE_ENV==='production'&&process.env.LOCAL_DEVELOPMENT!=='true'?configurationErrors():[];
      const fresh=!!state.heartbeat&&Date.now()-new Date(state.heartbeat.completed_at).getTime()<300_000;
      return !configuration.length&&fresh&&!state.queue.review&&!state.ambiguousCheckouts&&!state.pollErrors;
    }catch{return false;}
  })();
  try{const ok=await checking;cached={ok,until:Date.now()+5000};return ok;}finally{checking=null;}
}
