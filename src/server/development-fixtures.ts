import { randomUUID } from 'node:crypto';
import { HttpError, transaction } from './db';

/** Explicit offline UI fixture. Never mounted as a route and never accepted as provider evidence. */
export async function seedDevelopmentEntitlement(email:string){
  const url=new URL(process.env.DATABASE_URL||'postgres://invalid/invalid');
  if(process.env.NODE_ENV!=='development'||process.env.ALLOW_OFFLINE_BILLING_FIXTURES!=='true'||!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Offline billing fixtures require an explicitly enabled development-only loopback database.');
  return transaction(async client=>{
    const user=await client.query('SELECT id FROM "user" WHERE lower(email)=lower($1) AND "emailVerified"=true',[email]);if(!user.rowCount)throw new HttpError(400,'Verify this development account email before adding an offline fixture.');
    const userId=user.rows[0].id;await client.query('INSERT INTO app_accounts(user_id) VALUES($1) ON CONFLICT DO NOTHING',[userId]);await client.query('SELECT user_id FROM app_accounts WHERE user_id=$1 FOR UPDATE',[userId]);
    const dates=await client.query("SELECT date_trunc('month',now()) AS start,date_trunc('month',now())+interval '1 month' AS finish");
    const source=`offline-development:${userId}:${new Date(dates.rows[0].start).toISOString()}`;
    const existing=await client.query('SELECT id FROM billing_periods WHERE provider_invoice_id=$1',[source]);if(existing.rowCount)return {ok:true,fixture:true,duplicate:true};
    const id=randomUUID();await client.query("INSERT INTO billing_periods(id,user_id,provider_invoice_id,provider_payment_id,period_start,period_end,source) VALUES($1,$2,$3,$3,$4,$5,'offline_development_fixture')",[id,userId,source,dates.rows[0].start,dates.rows[0].finish]);
    await client.query("UPDATE app_accounts SET active_period_id=$1,subscription_status='offline_development_fixture' WHERE user_id=$2",[id,userId]);
    await client.query('INSERT INTO admin_audit(id,actor_id,target_id,action,reason) VALUES($1,$2,$2,$3,$4)',[randomUUID(),userId,'offline_development_fixture','Explicit local offline billing fixture; no payment was made, provider reconciliation was not run.']);
    return {ok:true,fixture:true,duplicate:false};
  });
}
