import { createHash, randomUUID } from 'node:crypto';
import { HttpError, pool } from './db';
import { parseBillingWebhook, processBillingEvent } from './billing';

/** Store only provider references. Customer addresses, emails and payment instruments are discarded. */
export async function enqueueBillingWebhook(raw:Uint8Array,signature:string,eventId:string){
  const event=parseBillingWebhook(raw,signature,eventId),payment=event.payload?.payment?.entity?.id||event.payload?.refund?.entity?.payment_id,subscription=event.payload?.subscription?.entity?.id;
  const paymentId=typeof payment==='string'&&/^pay_[a-zA-Z0-9]+$/.test(payment)?payment:null;
  const subscriptionId=typeof subscription==='string'&&/^sub_[a-zA-Z0-9]+$/.test(subscription)?subscription:null;
  if(['payment.captured','subscription.charged','refund.processed'].includes(event.event)&&!paymentId)throw new HttpError(400,'The webhook is missing a payment reference.');
  const digest=createHash('sha256').update(raw).digest('hex');
  const result=await pool.query('INSERT INTO billing_inbox(event_id,payload_hash,event_type,payment_id,subscription_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id) DO UPDATE SET event_id=EXCLUDED.event_id RETURNING payload_hash',[eventId,digest,event.event,paymentId,subscriptionId]);
  if(result.rows[0].payload_hash!==digest)throw new HttpError(409,'This event ID was already received with different content.');
  return {ok:true,queued:true};
}

export async function drainBillingInbox(limit=3){
  let done=0,failed=0;
  for(let i=0;i<Math.max(1,Math.min(limit,10));i++){
    const lease=randomUUID();
    const result=await pool.query(`UPDATE billing_inbox SET state='processing',attempts=attempts+1,lease_token=$1,lease_until=now()+interval '10 minutes' WHERE event_id=(SELECT event_id FROM billing_inbox WHERE (state='pending' AND available_at<=now()) OR (state='processing' AND lease_until<now()) ORDER BY available_at,received_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,[lease]);
    const job=result.rows[0];if(!job)break;
    try{
      const event={event:job.event_type,payload:{...(job.payment_id?{payment:{entity:{id:job.payment_id}}}:{}),...(job.subscription_id?{subscription:{entity:{id:job.subscription_id}}}:{})}};
      await processBillingEvent(event,job.event_id);
      await pool.query("UPDATE billing_inbox SET state='done',processed_at=now(),lease_until=NULL,lease_token=NULL,last_error_code=NULL WHERE event_id=$1 AND lease_token=$2",[job.event_id,lease]);done++;
    }catch(error){
      const code=error instanceof HttpError?error.code||`HTTP_${error.status}`:'PROCESSING_ERROR';
      await pool.query("UPDATE billing_inbox SET state=$1,available_at=now()+($2*interval '1 second'),last_error_code=$3,lease_until=NULL,lease_token=NULL WHERE event_id=$4 AND lease_token=$5",[job.attempts>=12?'review':'pending',Math.min(3600,5*2**Math.min(job.attempts,10)),code.slice(0,80),job.event_id,lease]);failed++;
    }
  }
  const summary={done,failed};await pool.query("INSERT INTO operation_heartbeats(name,completed_at,details) VALUES('billing',now(),$1) ON CONFLICT(name) DO UPDATE SET completed_at=now(),details=EXCLUDED.details",[JSON.stringify(summary)]);return summary;
}

export async function billingOperations(){
  const counts=await pool.query("SELECT state,count(*)::integer AS count FROM billing_inbox GROUP BY state"),heartbeat=await pool.query("SELECT completed_at,details FROM operation_heartbeats WHERE name='billing'"),ambiguous=await pool.query("SELECT count(*)::integer AS count FROM checkout_intents WHERE state='creating' AND created_at<now()-interval '5 minutes'");
  const polling=await pool.query('SELECT count(*)::integer AS count FROM checkout_intents WHERE provider_check_error IS NOT NULL');
  return {pollErrors:polling.rows[0].count,queue:Object.fromEntries(counts.rows.map(row=>[row.state,row.count])),heartbeat:heartbeat.rows[0]||null,ambiguousCheckouts:ambiguous.rows[0].count};
}
