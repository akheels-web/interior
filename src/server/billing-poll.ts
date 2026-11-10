import {createHash} from 'node:crypto';
import {HttpError,pool} from './db';
import {providerConfigured,provider} from './billing';

/** Webhooks remain primary. One bounded owned-intent check catches recent missed deliveries. */
export async function pollBillingProvider(onlyUser?:string){
  if(!providerConfigured())return {checked:0,failed:0};
  const claimed=await pool.query(`UPDATE checkout_intents SET provider_checked_at=now() WHERE id=(
    SELECT i.id FROM checkout_intents i JOIN app_accounts a ON a.user_id=i.user_id
    WHERE ($1::text IS NULL OR i.user_id=$1) AND i.provider_id IS NOT NULL AND (i.provider_checked_at IS NULL OR i.provider_checked_at<now()-interval '15 minutes')
    AND ((i.kind='addon' AND i.state='ready') OR (i.kind='subscription' AND i.state IN ('ready','completed') AND (a.subscription_id=i.provider_id OR i.created_at>now()-interval '45 days')))
    ORDER BY i.provider_checked_at NULLS FIRST,i.created_at LIMIT 1 FOR UPDATE OF i SKIP LOCKED
  ) RETURNING *`,[onlyUser||null]);
  const intent=claimed.rows[0];if(!intent)return {checked:0,failed:0};
  try{
    let ids:string[]=[];
    if(intent.kind==='subscription'){
      const subscription=await provider<{id:string;plan_id:string;status:string}>(`subscriptions/${encodeURIComponent(intent.provider_id)}`);
      if(subscription.id!==intent.provider_id||subscription.plan_id!==process.env.RAZORPAY_PLAN_ID)throw new HttpError(409,'Subscription polling mismatch.','PLAN_MISMATCH');
      await pool.query('UPDATE app_accounts SET subscription_status=$1 WHERE user_id=$2 AND subscription_id=$3',[subscription.status,intent.user_id,intent.provider_id]);
      const from=Math.floor(Date.now()/1000)-35*86400;
      const invoices=await provider<{items?:{subscription_id:string;payment_id:string;status:string}[]}>(`invoices?subscription_id=${encodeURIComponent(intent.provider_id)}&from=${from}&count=100`);
      ids=(invoices.items||[]).filter(row=>row.subscription_id===intent.provider_id&&row.status==='paid').map(row=>row.payment_id);
    }else{
      const payments=await provider<{items?:{id:string;order_id:string;status:string}[]}>(`orders/${encodeURIComponent(intent.provider_id)}/payments`);
      ids=(payments.items||[]).filter(row=>row.order_id===intent.provider_id&&['captured','refunded'].includes(row.status)).map(row=>row.id);
    }
    for(const id of ids.slice(0,10))if(/^pay_[a-zA-Z0-9]+$/.test(id)){
      const eventId=`poll:${new Date().toISOString().slice(0,10)}:${id}`,digest=createHash('sha256').update(eventId).digest('hex');
      await pool.query("INSERT INTO billing_inbox(event_id,payload_hash,event_type,payment_id) VALUES($1,$2,'payment.captured',$3) ON CONFLICT DO NOTHING",[eventId,digest,id]);
    }
    await pool.query('UPDATE checkout_intents SET provider_check_error=NULL WHERE id=$1',[intent.id]);return {checked:1,failed:0};
  }catch(error){await pool.query('UPDATE checkout_intents SET provider_check_error=$1 WHERE id=$2',[error instanceof HttpError?error.code||`HTTP_${error.status}`:'POLL_ERROR',intent.id]);return {checked:1,failed:1};}
}
