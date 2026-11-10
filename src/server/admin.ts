import { randomUUID } from 'node:crypto';
import { HttpError, iso, pool, transaction } from './db';
import { assertAdmin, type Principal } from './access';
import { allowsOfflinePeriods } from './projects';

const accountSelect=`SELECT u.id,u.name,u.email,u."createdAt" AS created_at,a.role,a.status,a.addon_credits,a.subscription_status,
  COALESCE(p.monthly_used,0) AS monthly_used,(SELECT count(*)::integer FROM projects j WHERE j.owner_id=u.id) AS project_count
  FROM "user" u JOIN app_accounts a ON a.user_id=u.id LEFT JOIN LATERAL (SELECT * FROM billing_periods b WHERE b.user_id=a.user_id ORDER BY CASE WHEN b.status='paid' AND b.period_start<=now() AND b.period_end>now() THEN 0 ELSE 1 END,b.period_start DESC LIMIT 1) p ON true`;
function present(row:Record<string,unknown>){return {id:row.id,name:row.name,email:row.email,role:row.role,status:row.status,projectCount:row.project_count,monthlyUsed:row.monthly_used,addonCredits:row.addon_credits,subscriptionStatus:row.subscription_status,createdAt:iso(row.created_at as Date)};}
export async function listAccounts(user:Principal,search:string,page:number){
  assertAdmin(user);const term=`%${search.replace(/[\\%_]/g,'\\$&')}%`,where=" WHERE ($1='' OR u.name ILIKE $2 OR u.email ILIKE $2)";
  const count=await pool.query(`SELECT count(*)::integer AS total FROM "user" u JOIN app_accounts a ON a.user_id=u.id${where}`,[search,term]);
  const result=await pool.query(`${accountSelect}${where} ORDER BY u."createdAt" DESC,u.id LIMIT 20 OFFSET $3`,[search,term,(page-1)*20]);
  const stats=await pool.query(`SELECT (SELECT count(*)::integer FROM app_accounts) AS accounts,(SELECT count(*)::integer FROM app_accounts a WHERE a.status='active' AND EXISTS(SELECT 1 FROM billing_periods p WHERE p.user_id=a.user_id AND p.status='paid' AND p.period_start<=now() AND p.period_end>now() AND ($1::boolean OR p.source='provider'))) AS active_subscriptions,(SELECT count(*)::integer FROM projects) AS projects`,[allowsOfflinePeriods()]);
  return {accounts:result.rows.map(present),page,pages:Math.max(1,Math.ceil(count.rows[0].total/20)),total:count.rows[0].total,stats:{accounts:stats.rows[0].accounts,activeSubscriptions:stats.rows[0].active_subscriptions,projects:stats.rows[0].projects}};
}
export async function accountDetail(user:Principal,id:string){assertAdmin(user);const result=await pool.query(`${accountSelect} WHERE u.id=$1`,[id]);if(!result.rowCount)throw new HttpError(404,'This account was not found.');const audit=await pool.query('SELECT id,actor_id,action,reason,credits,created_at FROM admin_audit WHERE target_id=$1 ORDER BY created_at DESC LIMIT 100',[id]);return {account:present(result.rows[0]),audit:audit.rows.map(row=>({id:row.id,actorId:row.actor_id,action:row.action,reason:row.reason,credits:row.credits,createdAt:iso(row.created_at)}))};}
export async function changeAccount(user:Principal,id:string,action:string,reason:string,credits?:number){
  assertAdmin(user);if(!['suspend','restore','revoke_sessions','grant_credits'].includes(action))throw new HttpError(400,'Choose a supported account action.');
  if(reason.trim().length<10||reason.length>500)throw new HttpError(400,'Enter a reason between 10 and 500 characters.');
  if(action==='grant_credits'&&(!Number.isInteger(credits)||credits!<1||credits!>10000))throw new HttpError(400,'Grant from 1 to 10,000 credits.');
  return transaction(async client=>{
    await client.query("SELECT pg_advisory_xact_lock(hashtext('forma-admin-management'))");
    const actor=await client.query('SELECT role,status FROM app_accounts WHERE user_id=$1',[user.id]);if(actor.rows[0]?.role!=='super_admin'||actor.rows[0]?.status!=='active')throw new HttpError(403,'Administrator access is required.');
    const target=await client.query('SELECT * FROM app_accounts WHERE user_id=$1 FOR UPDATE',[id]);if(!target.rowCount)throw new HttpError(404,'This account was not found.');
    if(action==='suspend'&&target.rows[0].role==='super_admin'){
      const count=await client.query("SELECT count(*)::integer AS total FROM app_accounts WHERE role='super_admin' AND status='active'");
      if(count.rows[0].total<=1)throw new HttpError(409,'The last active super-admin cannot be suspended.','LAST_ADMIN');
      if(id===user.id)throw new HttpError(409,'Ask another super-admin to suspend your account.');
    }
    if(action==='suspend')await client.query("UPDATE app_accounts SET status='suspended' WHERE user_id=$1",[id]);
    if(action==='restore')await client.query("UPDATE app_accounts SET status='active' WHERE user_id=$1",[id]);
    if(action==='suspend'||action==='revoke_sessions')await client.query('DELETE FROM "session" WHERE "userId"=$1',[id]);
    const auditId=randomUUID();
    if(action==='grant_credits'){
      await client.query('INSERT INTO credit_grants(source_key,user_id,quantity,remaining) VALUES($1,$2,$3,$3)',[`admin:${auditId}`,id,credits]);
      await client.query('UPDATE app_accounts SET addon_credits=addon_credits+$1 WHERE user_id=$2',[credits,id]);
    }
    await client.query('INSERT INTO admin_audit(id,actor_id,target_id,action,reason,credits) VALUES($1,$2,$3,$4,$5,$6)',[auditId,user.id,id,action,reason.trim(),action==='grant_credits'?credits:null]);return {ok:true};
  });
}
