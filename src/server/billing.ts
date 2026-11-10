import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpError, lockAccount, pool, transaction } from './db';
import { ADDON_PRICE, ADDON_QUANTITY, MONTHLY_PRICE, allowsOfflinePeriods } from './projects';

type Payment={id:string;amount:number;currency:string;status:string;captured:boolean;amount_refunded:number;refund_status:string|null;order_id:string|null;invoice_id:string|null;created_at:number};
type Subscription={id:string;plan_id:string;status:string;quantity:number;current_start:number|null;current_end:number|null};
type Invoice={id:string;subscription_id:string;payment_id:string;status:string;amount:number;amount_paid:number;amount_due:number;currency:string;billing_start:number;billing_end:number};
type Order={id:string;amount:number;currency:string;status:string;amount_paid:number};
type Plan={id:string;period:string;interval:number;item:{amount:number;currency:string}};
type Intent={id:string;user_id:string;kind:'subscription'|'addon';provider_id:string;eligible_period_id:string|null;state:string};
export type ReconciledPayment={paymentId:string;userId:string;intentId:string;kind:'subscription'|'addon';amount:number;orderId:string|null;invoiceId:string|null;subscriptionId:string|null;periodStart:string|null;periodEnd:string|null;createdAt:string;reversed:boolean};
export function providerConfigured(){return !!(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET&&process.env.RAZORPAY_PLAN_ID&&process.env.RAZORPAY_WEBHOOK_SECRET);}
export function paymentsConfigured(){if(process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')&&(process.env.RAZORPAY_LIVE_APPROVED!=='true'||process.env.LAUNCH_POLICIES_APPROVED!=='true'))return false;return providerConfigured();}
function requirePayments(){if(!providerConfigured())throw new HttpError(503,'Checkout is not configured yet. No payment has been taken.','PAYMENTS_UNAVAILABLE');}
export function hmacValid(payload:string|Uint8Array,signature:string,secret:string){
  if(!/^[a-f0-9]{64}$/i.test(signature)||!secret)return false;
  const expected=createHmac('sha256',secret).update(payload).digest(),actual=Buffer.from(signature,'hex');return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
export async function provider<T>(path:string,body?:object):Promise<T>{
  requirePayments();let response:Response;
  try{response=await fetch(`https://api.razorpay.com/v1/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(15_000)});}catch{throw new HttpError(502,'The payment provider did not respond. Check your billing status before retrying.','PROVIDER_UNAVAILABLE');}
  if(!response.ok)throw new HttpError(502,'The payment provider could not complete this request. Your local billing state was not changed.','PROVIDER_REJECTED');
  return response.json() as Promise<T>;
}
let planCache:{key:string;expires:number;plan:Plan}|null=null;
async function checkedPlan(){const key=`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_PLAN_ID}`;if(process.env.NODE_ENV!=='test'&&planCache?.key===key&&planCache.expires>Date.now())return planCache.plan;const plan=await provider<Plan>(`plans/${encodeURIComponent(process.env.RAZORPAY_PLAN_ID!)}`);if(plan.id!==process.env.RAZORPAY_PLAN_ID||plan.period!=='monthly'||plan.interval!==1||plan.item?.amount!==MONTHLY_PRICE||plan.item?.currency!=='INR')throw new HttpError(503,'The configured monthly plan does not match INR 1499 per month. Contact support.','PLAN_MISMATCH');planCache={key,expires:Date.now()+300_000,plan};return plan;}
function checkoutOptions(kind:'subscription'|'addon',providerId:string){return {keyId:process.env.RAZORPAY_KEY_ID!,...(kind==='subscription'?{subscriptionId:providerId}:{orderId:providerId,amount:ADDON_PRICE}),currency:'INR' as const,name:'PlanSaathi' as const,description:kind==='subscription'?'Monthly plan · 10 new projects':'2 extra project credits · unused extras carry forward'};}
export async function checkout(userId:string,kind:'subscription'|'addon',requestKey:string=randomUUID()){
  requirePayments();if(!paymentsConfigured())throw new HttpError(503,'New purchases are temporarily unavailable. Existing payments are still reconciled.','PAYMENTS_UNAVAILABLE');if(kind==='subscription')await checkedPlan();
  const prepared=await transaction(async client=>{
    const account=await lockAccount(client,userId);
    const paid=await client.query("SELECT id FROM billing_periods WHERE user_id=$1 AND status='paid' AND period_start<=now() AND period_end>now() AND ($2::boolean OR source='provider') ORDER BY period_start DESC LIMIT 1",[userId,allowsOfflinePeriods()]);
    if(kind==='addon'&&!paid.rowCount)throw new HttpError(402,'An active paid period is required to buy extra credits.','SUBSCRIPTION_REQUIRED');
    if(kind==='subscription'&&paid.rowCount)throw new HttpError(409,'Your paid period is already active. Manage your current subscription instead.','SUBSCRIPTION_ACTIVE');
    const prior=await client.query<Intent>('SELECT * FROM checkout_intents WHERE user_id=$1 AND request_key=$2',[userId,requestKey]);
    if(prior.rowCount){const intent=prior.rows[0];if(intent.kind!==kind)throw new HttpError(409,'This checkout key was used for a different purchase.','IDEMPOTENCY_CONFLICT');if(intent.state==='failed')throw new HttpError(409,'This checkout is closed. Refresh your plan before starting a new checkout.','CHECKOUT_CLOSED');if(intent.state==='ready'){if(kind==='addon'&&intent.eligible_period_id!==paid.rows[0]?.id)throw new HttpError(409,'This checkout belongs to a previous billing period. Refresh your plan and start a new checkout.','CHECKOUT_CLOSED');return {reuse:intent.provider_id,intentId:intent.id};}throw new HttpError(409,intent.state==='completed'?'This checkout is already completed. Refresh your plan.':'This checkout needs confirmation. Refresh your plan or contact support before another payment.','CHECKOUT_PENDING');}
    const ambiguous=await client.query("SELECT 1 FROM checkout_intents WHERE user_id=$1 AND kind=$2 AND state='creating' LIMIT 1",[userId,kind]);if(ambiguous.rowCount)throw new HttpError(409,'A checkout is still being confirmed. Contact support before starting another payment.','CHECKOUT_PENDING');
    if(kind==='addon'&&!paid.rowCount)throw new HttpError(402,'An active paid period is required to buy extra credits.','SUBSCRIPTION_REQUIRED');
    if(kind==='addon'){
      const pending=await client.query<Intent>("SELECT * FROM checkout_intents WHERE user_id=$1 AND kind='addon' AND state='ready' AND eligible_period_id=$2 ORDER BY created_at DESC LIMIT 1",[userId,paid.rows[0]?.id]);
      if(pending.rowCount)return {reuse:pending.rows[0].provider_id,intentId:pending.rows[0].id};
    }
    if(kind==='subscription'){
      if(paid.rowCount)throw new HttpError(409,'Your paid period is already active. Manage your current subscription instead.','SUBSCRIPTION_ACTIVE');
      const pending=await client.query<Intent>("SELECT * FROM checkout_intents WHERE user_id=$1 AND kind='subscription' AND state IN ('creating','ready') ORDER BY created_at DESC LIMIT 1",[userId]);
      if(pending.rows[0]?.state==='ready')return {reuse:pending.rows[0].provider_id,intentId:pending.rows[0].id};
      if(pending.rowCount)throw new HttpError(409,'A subscription checkout is being prepared. Please wait before trying again.','CHECKOUT_PENDING');
      if(account.subscription_id&&['created','active','authenticated','pending','halted','paused'].includes(account.subscription_status))throw new HttpError(409,'An existing subscription needs attention. Contact support before creating another.','SUBSCRIPTION_EXISTS');
    }
    const intentId=randomUUID();await client.query('INSERT INTO checkout_intents(id,user_id,kind,amount,eligible_period_id,request_key) VALUES($1,$2,$3,$4,$5,$6)',[intentId,userId,kind,kind==='addon'?ADDON_PRICE:MONTHLY_PRICE,paid.rows[0]?.id||null,requestKey]);return {reuse:null,intentId};
  });
  if(prepared.reuse)return checkoutOptions(kind,prepared.reuse);
  try{
    const entity=kind==='subscription'?await provider<Subscription>('subscriptions',{plan_id:process.env.RAZORPAY_PLAN_ID,total_count:120,quantity:1,customer_notify:true,notes:{checkout_intent:prepared.intentId}}):await provider<Order>('orders',{amount:ADDON_PRICE,currency:'INR',receipt:prepared.intentId,notes:{checkout_intent:prepared.intentId}});
    if(!entity.id||!new RegExp(kind==='subscription'?'^sub_[a-zA-Z0-9]+$':'^order_[a-zA-Z0-9]+$').test(entity.id))throw new HttpError(502,'The provider returned an invalid checkout reference.');
    await transaction(async client=>{await lockAccount(client,userId);await client.query("UPDATE checkout_intents SET provider_id=$1,state='ready' WHERE id=$2 AND user_id=$3",[entity.id,prepared.intentId,userId]);if(kind==='subscription')await client.query('UPDATE app_accounts SET subscription_id=$1,subscription_status=$2,cancel_at_period_end=false WHERE user_id=$3',[entity.id,(entity as Subscription).status||'created',userId]);});
    return checkoutOptions(kind,entity.id);
   }catch(error){
    // A timeout can occur after Razorpay created the order/subscription. Keep this intent blocked
    // until a provider lookup resolves it; blindly making another checkout risks a second charge.
    throw error;
  }
}

/** Provider data is re-fetched, independently of callback/webhook notes or client-reported amounts. */
export async function reconcilePayment(paymentId:string,expectedUserId?:string):Promise<ReconciledPayment>{
  if(!/^pay_[a-zA-Z0-9]+$/.test(paymentId))throw new HttpError(400,'The payment reference is invalid.');
  const payment=await provider<Payment>(`payments/${encodeURIComponent(paymentId)}`);
  if(payment.id!==paymentId||payment.currency!=='INR'||!Number.isSafeInteger(payment.amount)||!Number.isSafeInteger(payment.amount_refunded)||payment.amount_refunded<0||payment.amount_refunded>payment.amount||!Number.isSafeInteger(payment.created_at)||payment.created_at<=0||payment.created_at>Date.now()/1000+300)throw new HttpError(409,'The payment details could not be reconciled.','PAYMENT_MISMATCH');
  const reversed=payment.status==='refunded'||payment.amount_refunded>0||payment.refund_status!=null;
  if(!reversed&&(payment.status!=='captured'||payment.captured!==true))throw new HttpError(409,'Payment is awaiting capture. Your credits will update after provider confirmation.','PAYMENT_PENDING');
  let invoice:Invoice|null=null,subscription:Subscription|null=null,providerId=payment.order_id;
  if(payment.invoice_id){invoice=await provider<Invoice>(`invoices/${encodeURIComponent(payment.invoice_id)}`);providerId=invoice.subscription_id;}
  const result=await pool.query<Intent>('SELECT * FROM checkout_intents WHERE provider_id=$1',[providerId]);const intent=result.rows[0];
  if(!intent||expectedUserId&&intent.user_id!==expectedUserId)throw new HttpError(404,'This payment is not linked to your checkout.','UNKNOWN_CHECKOUT');
  const expectedAmount=intent.kind==='addon'?ADDON_PRICE:MONTHLY_PRICE;
  if(payment.amount!==expectedAmount)throw new HttpError(409,'The captured payment amount does not match this checkout.','PAYMENT_MISMATCH');
  if(intent.kind==='subscription'){
    if(!invoice||invoice.id!==payment.invoice_id||invoice.payment_id!==paymentId||invoice.subscription_id!==intent.provider_id||invoice.amount!==MONTHLY_PRICE||invoice.currency!=='INR'||!reversed&&(invoice.status!=='paid'||invoice.amount_paid!==MONTHLY_PRICE||invoice.amount_due!==0))throw new HttpError(409,'The paid subscription invoice could not be verified.','INVOICE_MISMATCH');
    await checkedPlan();subscription=await provider<Subscription>(`subscriptions/${encodeURIComponent(intent.provider_id)}`);
    if(subscription.id!==intent.provider_id||subscription.plan_id!==process.env.RAZORPAY_PLAN_ID||subscription.quantity!==1)throw new HttpError(409,'The subscription does not match the configured monthly plan.','PLAN_MISMATCH');
    if(!Number.isSafeInteger(invoice.billing_start)||!Number.isSafeInteger(invoice.billing_end)||invoice.billing_start<=0||invoice.billing_end<=invoice.billing_start||invoice.billing_end-invoice.billing_start>35*86400)throw new HttpError(409,'The billing period could not be verified.','PERIOD_MISMATCH');
  }else{
    if(!payment.order_id||payment.order_id!==intent.provider_id||invoice)throw new HttpError(409,'This payment does not match the extra-credit order.','ORDER_MISMATCH');
    const order=await provider<Order>(`orders/${encodeURIComponent(intent.provider_id)}`);
    if(order.id!==intent.provider_id||order.amount!==ADDON_PRICE||order.currency!=='INR'||!reversed&&(order.status!=='paid'||order.amount_paid!==ADDON_PRICE))throw new HttpError(409,'The extra-credit order could not be verified.','ORDER_MISMATCH');
  }
  return {paymentId,userId:intent.user_id,intentId:intent.id,kind:intent.kind,amount:payment.amount,orderId:payment.order_id,invoiceId:invoice?.id||null,subscriptionId:subscription?.id||null,periodStart:invoice?new Date(invoice.billing_start*1000).toISOString():null,periodEnd:invoice?new Date(invoice.billing_end*1000).toISOString():null,createdAt:new Date(payment.created_at*1000).toISOString(),reversed};
}

/** Internal transaction boundary. Only reconciled provider facts enter this function in production. */
export async function applyReconciledPayment(fact:ReconciledPayment,event?:{id:string;type:string}){
  return transaction(async client=>{
    // Suspended accounts must still have signed paid/refund events reconciled; authorization is at checkout/API boundaries.
    const accounts=await client.query('SELECT * FROM app_accounts WHERE user_id=$1 FOR UPDATE',[fact.userId]);const account=accounts.rows[0];if(!account)throw new HttpError(404,'Payment account not found.');
    if(event){const inserted=await client.query('INSERT INTO billing_events(provider_event_id,event_type) VALUES($1,$2) ON CONFLICT DO NOTHING',[event.id,event.type]);if(!inserted.rowCount)return {ok:true,duplicate:true};}
    const intents=await client.query<Intent>('SELECT * FROM checkout_intents WHERE id=$1 AND user_id=$2 FOR UPDATE',[fact.intentId,fact.userId]);const intent=intents.rows[0];
    if(!intent||intent.kind!==fact.kind||fact.amount!==(fact.kind==='addon'?ADDON_PRICE:MONTHLY_PRICE))throw new HttpError(409,'The checkout intent does not match the payment.');
    const payments=await client.query('SELECT * FROM billing_payments WHERE provider_payment_id=$1 FOR UPDATE',[fact.paymentId]);
    if(payments.rowCount&&(payments.rows[0].user_id!==fact.userId||payments.rows[0].intent_id!==fact.intentId))throw new HttpError(409,'This payment was linked to another account.');
    if(fact.reversed){
      if(!payments.rowCount)await client.query("INSERT INTO billing_payments(provider_payment_id,user_id,intent_id,kind,provider_order_id,provider_invoice_id,amount,status) VALUES($1,$2,$3,$4,$5,$6,$7,'reversed')",[fact.paymentId,fact.userId,fact.intentId,fact.kind,fact.orderId,fact.invoiceId,fact.amount]);
      else await client.query("UPDATE billing_payments SET status='reversed' WHERE provider_payment_id=$1",[fact.paymentId]);
      const grant=await client.query('SELECT remaining FROM credit_grants WHERE source_key=$1 AND reversed=false FOR UPDATE',[`payment:${fact.paymentId}`]);
      if(grant.rowCount){await client.query('UPDATE app_accounts SET addon_credits=addon_credits-$1 WHERE user_id=$2',[grant.rows[0].remaining,fact.userId]);await client.query('UPDATE credit_grants SET reversed=true,remaining=0 WHERE source_key=$1',[`payment:${fact.paymentId}`]);}
      await client.query("UPDATE billing_periods SET status='reversed' WHERE provider_payment_id=$1",[fact.paymentId]);return {ok:true};
    }
    if(payments.rowCount)return {ok:true,duplicate:true};
    if(fact.kind==='addon'){
      const eligible=await client.query("SELECT 1 FROM billing_periods WHERE id=$1 AND user_id=$2 AND status='paid' AND period_start<=$3 AND period_end>$3 AND ($4::boolean OR source='provider')",[intent.eligible_period_id,fact.userId,fact.createdAt,allowsOfflinePeriods()]);
      if(!eligible.rowCount)throw new HttpError(409,'This extra-credit order is outside an eligible paid period. Contact support.','SUBSCRIPTION_REQUIRED');
      await client.query('INSERT INTO credit_grants(source_key,user_id,quantity,remaining) VALUES($1,$2,$3,$3)',[`payment:${fact.paymentId}`,fact.userId,ADDON_QUANTITY]);
      await client.query('UPDATE app_accounts SET addon_credits=addon_credits+$1 WHERE user_id=$2',[ADDON_QUANTITY,fact.userId]);
    }else{
      if(!fact.periodStart||!fact.periodEnd||!fact.invoiceId||!fact.subscriptionId||fact.subscriptionId!==intent.provider_id)throw new HttpError(409,'A verified subscription period is required.');
      const old=await client.query('SELECT * FROM billing_periods WHERE user_id=$1 AND period_start=$2',[fact.userId,fact.periodStart]);
      if(old.rowCount)throw new HttpError(409,'This billing cycle has already been credited.','PERIOD_DUPLICATE');
      const overlapping=await client.query('SELECT id FROM billing_periods WHERE user_id=$1 AND period_start<$3 AND period_end>$2 LIMIT 1',[fact.userId,fact.periodStart,fact.periodEnd]);
      if(overlapping.rowCount)throw new HttpError(409,'This paid cycle overlaps a period already credited. Contact support for reconciliation.','PERIOD_OVERLAP');
      const periodId=randomUUID();await client.query('INSERT INTO billing_periods(id,user_id,provider_invoice_id,provider_payment_id,period_start,period_end) VALUES($1,$2,$3,$4,$5,$6)',[periodId,fact.userId,fact.invoiceId,fact.paymentId,fact.periodStart,fact.periodEnd]);
      const current=account.active_period_id?(await client.query('SELECT * FROM billing_periods WHERE id=$1',[account.active_period_id])).rows[0]:null;
      // Replayed/out-of-order old cycles are recorded but cannot move the current period backward or reset it.
      if(!current||new Date(fact.periodStart)>=new Date(current.period_end))await client.query("UPDATE app_accounts SET active_period_id=$1,subscription_id=$2,subscription_status='active' WHERE user_id=$3",[periodId,fact.subscriptionId,fact.userId]);
    }
    await client.query("INSERT INTO billing_payments(provider_payment_id,user_id,intent_id,kind,provider_order_id,provider_invoice_id,amount,status) VALUES($1,$2,$3,$4,$5,$6,$7,'captured')",[fact.paymentId,fact.userId,fact.intentId,fact.kind,fact.orderId,fact.invoiceId,fact.amount]);
    await client.query("UPDATE checkout_intents SET state='completed' WHERE id=$1",[fact.intentId]);return {ok:true};
  });
}

export async function verifyCheckout(userId:string,body:Record<string,unknown>){
  requirePayments();const paymentId=typeof body.razorpay_payment_id==='string'?body.razorpay_payment_id:'',providerId=typeof body.razorpay_subscription_id==='string'?body.razorpay_subscription_id:typeof body.razorpay_order_id==='string'?body.razorpay_order_id:'',signature=typeof body.razorpay_signature==='string'?body.razorpay_signature:'';
  const result=await pool.query<Intent>('SELECT * FROM checkout_intents WHERE provider_id=$1 AND user_id=$2',[providerId,userId]);const intent=result.rows[0];if(!intent)throw new HttpError(404,'This checkout was not found.');
  if(!hmacValid(intent.kind==='subscription'?`${paymentId}|${intent.provider_id}`:`${intent.provider_id}|${paymentId}`,signature,process.env.RAZORPAY_KEY_SECRET!))throw new HttpError(400,'Payment verification failed. Your credits have not changed.','INVALID_SIGNATURE');
  if(intent.kind==='subscription'){
    const payment=await provider<Payment>(`payments/${encodeURIComponent(paymentId)}`);
    if(payment.id===paymentId&&payment.currency==='INR'&&!payment.invoice_id&&['authorized','captured'].includes(payment.status))return {ok:true,pending:true};
  }
  return applyReconciledPayment(await reconcilePayment(paymentId,userId));
}
export async function cancelSubscription(userId:string){
  requirePayments();const account=await pool.query('SELECT subscription_id FROM app_accounts WHERE user_id=$1',[userId]);const id=account.rows[0]?.subscription_id;if(!id)throw new HttpError(409,'There is no provider subscription to cancel.');
  const result=await provider<Subscription>(`subscriptions/${encodeURIComponent(id)}/cancel`,{cancel_at_cycle_end:1});if(result.id!==id)throw new HttpError(502,'The cancellation could not be confirmed.');
  await transaction(async client=>{await lockAccount(client,userId);await client.query('UPDATE app_accounts SET cancel_at_period_end=true,subscription_status=$1 WHERE user_id=$2 AND subscription_id=$3',[result.status,userId,id]);});return {ok:true};
}
export type BillingEvent={event:string;payload?:Record<string,{entity?:Record<string,unknown>}>};
export function parseBillingWebhook(raw:Uint8Array,signature:string,eventId:string):BillingEvent{
  requirePayments();if(!hmacValid(raw,signature,process.env.RAZORPAY_WEBHOOK_SECRET!))throw new HttpError(400,'Invalid webhook signature.');
  if(!eventId||eventId.length>200)throw new HttpError(400,'A provider event ID is required.');
  let event:{event:string;payload?:Record<string,{entity?:Record<string,unknown>}>};try{event=JSON.parse(new TextDecoder().decode(raw));}catch{throw new HttpError(400,'Invalid webhook JSON.');}
  if(!event||typeof event!=='object'||typeof event.event!=='string')throw new HttpError(400,'Invalid webhook event.');
  if(event.event.length>120)throw new HttpError(400,'Invalid webhook event.');return event;
}
export async function handleBillingWebhook(raw:Uint8Array,signature:string,eventId:string){return processBillingEvent(parseBillingWebhook(raw,signature,eventId),eventId);}
export async function processBillingEvent(event:BillingEvent,eventId:string){
  const paymentId=event.payload?.payment?.entity?.id||event.payload?.refund?.entity?.payment_id;
  if(['subscription.charged','payment.captured','refund.processed'].includes(event.event)&&typeof paymentId==='string'){
    return applyReconciledPayment(await reconcilePayment(paymentId),{id:eventId,type:event.event});
  }
  const subscriptionId=event.payload?.subscription?.entity?.id;
  if(event.event.startsWith('subscription.')&&typeof subscriptionId==='string'&&/^sub_[a-zA-Z0-9]+$/.test(subscriptionId)){
    const owned=await pool.query('SELECT user_id FROM checkout_intents WHERE provider_id=$1 AND kind=\'subscription\'',[subscriptionId]);
    if(owned.rowCount){
      const subscription=await provider<Subscription>(`subscriptions/${encodeURIComponent(subscriptionId)}`);
      if(subscription.id!==subscriptionId||subscription.plan_id!==process.env.RAZORPAY_PLAN_ID)throw new HttpError(409,'The subscription event did not match the configured plan.');
      await transaction(async client=>{await client.query('SELECT user_id FROM app_accounts WHERE user_id=$1 FOR UPDATE',[owned.rows[0].user_id]);const inserted=await client.query('INSERT INTO billing_events(provider_event_id,event_type) VALUES($1,$2) ON CONFLICT DO NOTHING',[eventId,event.event]);if(inserted.rowCount)await client.query('UPDATE app_accounts SET subscription_status=$1 WHERE user_id=$2 AND subscription_id=$3',[subscription.status,owned.rows[0].user_id,subscriptionId]);});return {ok:true};
    }
  }
  // Authentication/activation events never issue monthly credits. Only captured paid invoices do.
  await pool.query('INSERT INTO billing_events(provider_event_id,event_type) VALUES($1,$2) ON CONFLICT DO NOTHING',[eventId,event.event.slice(0,120)]);return {ok:true,ignored:true};
}
