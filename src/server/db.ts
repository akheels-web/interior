import { Pool, type PoolClient } from 'pg';

const globals=globalThis as unknown as {formaPool?:Pool};
export const pool=globals.formaPool??new Pool({connectionString:process.env.DATABASE_URL,max:12,idleTimeoutMillis:30_000,connectionTimeoutMillis:5_000,statement_timeout:15_000,idle_in_transaction_session_timeout:20_000,application_name:'forma-studio',ssl:process.env.DATABASE_SSL==='require'?{rejectUnauthorized:true,...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')}:{})}:undefined});
globals.formaPool=pool;
export async function transaction<T>(work:(client:PoolClient)=>Promise<T>):Promise<T>{
  const client=await pool.connect();
  try{await client.query('BEGIN');const result=await work(client);await client.query('COMMIT');return result;}
  catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
export class HttpError extends Error{constructor(public status:number,message:string,public code?:string){super(message);}}
export type AccountRow={user_id:string;role:'user'|'super_admin';status:'active'|'suspended';addon_credits:number;active_period_id:string|null;subscription_id:string|null;subscription_status:string;cancel_at_period_end:boolean;mfa_since:Date|string|null;mfa_verified?:boolean};
export async function lockAccount(client:PoolClient,userId:string):Promise<AccountRow>{
  const result=await client.query<AccountRow>('SELECT * FROM app_accounts WHERE user_id=$1 FOR UPDATE',[userId]);
  const account=result.rows[0];if(!account)throw new HttpError(401,'Please sign in again.','UNAUTHENTICATED');
  if(account.status!=='active')throw new HttpError(403,'This account is suspended. Contact support.','ACCOUNT_SUSPENDED');return account;
}
export const iso=(value:Date|string|null|undefined)=>value?new Date(value).toISOString():null;
