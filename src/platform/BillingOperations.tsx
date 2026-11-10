'use client';
import {ShieldCheck} from 'lucide-react';
import {date,useApi} from './api';
import {ErrorBox,Spinner} from './shared';
type Operations={queue:Record<string,number>;pollErrors:number;ambiguousCheckouts:number;heartbeat:{completed_at:string}|null};
export default function BillingOperations(){
  const state=useApi<Operations>('/api/admin/operations'),data=state.data;
  const fresh=!!data?.heartbeat&&Date.now()-new Date(data.heartbeat.completed_at).getTime()<300_000;
  const attention=!!data&&(!fresh||!!data.queue.review||!!data.pollErrors||!!data.ambiguousCheckouts);
  return <section className="pf-surface pf-operations"><div className="pf-section-toolbar"><div><h2>Billing operations</h2><p>Check payment recovery before accepting new customers.</p></div><button className="pf-button secondary" disabled={state.loading} onClick={state.refresh}>Refresh status</button></div>{state.error&&<ErrorBox error={state.error} retry={state.refresh}/>} {state.loading&&!data?<Spinner label="Checking payment recovery…"/>:data?<><p className={`pf-status-badge ${attention?'':'positive'}`}><ShieldCheck size={14}/>{attention?'Needs attention':'Worker responding'}</p><dl className="pf-operations-grid"><div><dt>Waiting / processing</dt><dd>{(data.queue.pending||0)+(data.queue.processing||0)}</dd></div><div><dt>Events needing review</dt><dd>{data.queue.review||0}</dd></div><div><dt>Unconfirmed checkouts</dt><dd>{data.ambiguousCheckouts}</dd></div><div><dt>Provider check failures</dt><dd>{data.pollErrors}</dd></div></dl><p className="pf-help">Last worker check: {date(data.heartbeat?.completed_at,true)}. Review unresolved payments in the payment provider before changing any checkout state or issuing credits.</p></>:null}</section>;
}
