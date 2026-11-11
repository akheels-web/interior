import { auth, appOrigin } from './auth';
import { pool, transaction, HttpError, type AccountRow } from './db';
import { randomUUID } from 'node:crypto';
import { cachedRateCount } from './rate-limit';

export type Principal={id:string;name:string;email:string;role:'user'|'super_admin';sessionId:string;mfaEnabled?:boolean;mfaVerified?:boolean};
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function principal(request:Request):Promise<Principal>{
  const session=await auth.api.getSession({headers:request.headers,query:{disableCookieCache:true}});
  if(!session?.user||!session.user.emailVerified)throw new HttpError(401,'Sign in with a verified email to continue.','UNAUTHENTICATED');
  const account=await transaction(async client=>{
    await client.query('INSERT INTO app_accounts(user_id) VALUES($1) ON CONFLICT DO NOTHING',[session.user.id]);
    const result=await client.query<AccountRow>('SELECT a.*,EXISTS(SELECT 1 FROM session_mfa m WHERE m.session_id=$2 AND m.user_id=a.user_id AND m.verified_at>=a.mfa_since) AS mfa_verified FROM app_accounts a WHERE user_id=$1 FOR UPDATE OF a',[session.user.id,session.session.id]);let row=result.rows[0];
    if(row.status!=='active')throw new HttpError(403,'This account is suspended. Contact support.','ACCOUNT_SUSPENDED');
    const bootstrapEmail=process.env.SUPER_ADMIN_EMAIL||'';
    if(bootstrapEmail&&session.user.email.toLowerCase()===bootstrapEmail.toLowerCase()&&row.role!=='super_admin'){
      await client.query("UPDATE app_accounts SET role='super_admin' WHERE user_id=$1",[session.user.id]);
      await client.query('INSERT INTO admin_audit(id,actor_id,target_id,action,reason) VALUES($1,$2,$2,$3,$4)',[randomUUID(),session.user.id,'bootstrap_super_admin','Verified server-authorized bootstrap email authenticated.']);row={...row,role:'super_admin'};
    }
    return row;
  });
  return {id:session.user.id,name:session.user.name,email:session.user.email,role:account.role,sessionId:session.session.id,mfaEnabled:session.user.twoFactorEnabled===true,mfaVerified:session.user.twoFactorEnabled===true&&account.mfa_verified===true};
}
export function assertAdmin(user:Principal){if(user.role!=='super_admin')throw new HttpError(403,'Administrator access is required.','FORBIDDEN');if(!user.mfaVerified)throw new HttpError(403,'Set up an authenticator in Profile & security, then sign in again to open administration.','ADMIN_MFA_REQUIRED');}
export function assertMutation(request:Request){
  if(request.headers.get('origin')!==appOrigin())throw new HttpError(403,'Your session origin could not be verified. Reload this page and try again.','INVALID_ORIGIN');
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw new HttpError(415,'Send this request as JSON.','INVALID_CONTENT_TYPE');
}
export async function limitedBody(request:Request,max=10*1024*1024):Promise<Uint8Array>{
  if(Number(request.headers.get('content-length')||0)>max)throw new HttpError(413,'This request is too large.');
  const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>max){await reader.cancel();throw new HttpError(413,'This request is too large.');}chunks.push(next.value);}}finally{reader.releaseLock();}
  const data=new Uint8Array(size);let at=0;for(const chunk of chunks){data.set(chunk,at);at+=chunk.length;}return data;
}
export async function jsonBody(request:Request,max?:number):Promise<Record<string,unknown>>{
  let value:unknown;try{value=JSON.parse(new TextDecoder().decode(await limitedBody(request,max)));}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'This request contains invalid JSON.');}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(400,'Send a JSON object.');return value as Record<string,unknown>;
}
export function requiredString(value:unknown,label:string,max=120){if(typeof value!=='string'||!value.trim()||value.length>max)throw new HttpError(400,`Enter a valid ${label}, up to ${max} characters.`);return value.trim();}
export function pageQuery(url:URL){const raw=Number(url.searchParams.get('page')||1);if(!Number.isInteger(raw)||raw<1||raw>100000)throw new HttpError(400,'Choose a valid page.');return {page:raw,search:(url.searchParams.get('search')||'').trim().slice(0,120)};}
export async function rateLimit(userId:string,action:string,max=120,window=60){
  const bucket=`${action}:${userId}:${Math.floor(Date.now()/1000/window)}`;
  const cached=await cachedRateCount(bucket,window);if(cached!==null){if(cached>max)throw new HttpError(429,'Too many requests. Please wait a moment and try again.','RATE_LIMITED');return;}
  const result=await pool.query('INSERT INTO api_rate_limits(bucket,count,expires_at) VALUES($1,1,now()+($2*interval \'1 second\')) ON CONFLICT(bucket) DO UPDATE SET count=api_rate_limits.count+1 RETURNING count',[bucket,window]);
  if(result.rows[0].count>max)throw new HttpError(429,'Too many requests. Please wait a moment and try again.','RATE_LIMITED');
  if(Math.random()<.01)void pool.query('DELETE FROM api_rate_limits WHERE expires_at<now()').catch(()=>{});
}
