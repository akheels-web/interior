import { createHmac } from 'node:crypto';
import { auth } from './auth';
import { assertRuntimeConfiguration } from './runtime-config';
import { assertMutation, jsonBody, rateLimit } from './access';
import { HttpError, pool, transaction } from './db';
import { clientIpKey } from './client-ip';

let activeAuth=0;
export async function handleAuth(request:Request){
  let reserved=false;
  try{
    assertRuntimeConfiguration(request);
    const path=new URL(request.url).pathname;
    let preserveAssurance:Date|string|null=null;
    let factorStartedAt:string|null=null,enrollmentProof:{userId:string;secret:string}|null=null;
    if(request.method==='POST'){
      assertMutation(request);
      const body=await jsonBody(request,16*1024);
      if(body.trustDevice===true)throw new HttpError(400,'Remembering an authenticator device is not supported.');
      const managesFactor=path.includes('/two-factor/')&&!path.endsWith('/verify-totp')&&!path.endsWith('/verify-backup-code');
      if(path.endsWith('/change-password')||managesFactor){
        const old=await auth.api.getSession({headers:request.headers,query:{disableCookieCache:true}});
        if(old?.user.twoFactorEnabled){const assurance=await pool.query('SELECT m.verified_at::text AS verified_at FROM session_mfa m JOIN app_accounts a ON a.user_id=m.user_id WHERE m.session_id=$1 AND m.user_id=$2 AND m.verified_at>=a.mfa_since',[old.session.id,old.user.id]);preserveAssurance=assurance.rows[0]?.verified_at||null;if(managesFactor&&!preserveAssurance)throw new HttpError(403,'Sign in again with your authenticator before changing its protection.','MFA_REQUIRED');}
      }
      if(path.endsWith('/two-factor/verify-totp')||path.endsWith('/two-factor/verify-backup-code')){
        factorStartedAt=(await pool.query('SELECT clock_timestamp()::text AS started_at')).rows[0].started_at;
        const old=await auth.api.getSession({headers:request.headers,query:{disableCookieCache:true}});
        if(old&&!old.user.twoFactorEnabled){const factor=await pool.query('SELECT secret FROM "twoFactor" WHERE "userId"=$1',[old.user.id]);if(factor.rows[0])enrollmentProof={userId:old.user.id,secret:factor.rows[0].secret};}
      }
      const ip=clientIpKey(request.headers);if(ip)await rateLimit(ip,'auth-ip',120,300);
      if(typeof body.email==='string'&&['/sign-in/email','/request-password-reset','/send-verification-email','/sign-up/email'].some(p=>path.endsWith(p))){
        const key=createHmac('sha256',process.env.BETTER_AUTH_SECRET||'local-only').update(body.email.trim().toLowerCase()).digest('hex');
        await rateLimit(key,'auth-email',12,300);
      }
      const headers=new Headers(request.headers);headers.delete('content-length');
      request=new Request(request,{headers,body:JSON.stringify(body)});
    }
    if(request.method==='POST'){if(activeAuth>=32)throw new HttpError(429,'Sign-in is busy. Please try again in a moment.','AUTH_BUSY');activeAuth++;reserved=true;}
    const response=await auth.handler(request);
    if(response.ok&&request.method==='POST'&&(preserveAssurance||path.endsWith('/two-factor/verify-totp')||path.endsWith('/two-factor/verify-backup-code'))){
      // Only successful factor verification can establish assurance. Session creation time is
      // insufficient: password changes also rotate sessions without proving a second factor.
      const cookies=new Map((request.headers.get('cookie')||'').split(';').map(value=>{const at=value.indexOf('=');return [value.slice(0,at).trim(),value.slice(at+1)] as const;}));
      for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
      const headers=new Headers(request.headers);headers.set('cookie',[...cookies].map(([key,value])=>`${key}=${value}`).join('; '));
      const verified=await auth.api.getSession({headers,query:{disableCookieCache:true}});
      if(verified?.user.twoFactorEnabled)await transaction(async client=>{
        const factor=await client.query('SELECT secret FROM "twoFactor" WHERE "userId"=$1 FOR SHARE',[verified.user.id]);
        const enrolled=enrollmentProof?.userId===verified.user.id&&enrollmentProof.secret===factor.rows[0]?.secret;
        // A factor changed while this request was in flight must invalidate this proof too.
        // Initial enrollment is assured only while holding the unchanged factor row's lock.
        await client.query('INSERT INTO session_mfa(session_id,user_id,verified_at) VALUES($1,$2,CASE WHEN $4::boolean THEN clock_timestamp() ELSE $3::timestamptz END) ON CONFLICT(session_id) DO UPDATE SET verified_at=EXCLUDED.verified_at',[verified.session.id,verified.user.id,preserveAssurance||factorStartedAt,enrolled]);
      });
    }
    response.headers.set('Cache-Control','no-store');response.headers.set('X-Robots-Tag','noindex, nofollow');
    return response;
  }catch(error){
    const known=error instanceof HttpError;
    return Response.json({message:known?error.message:'Sign-in could not be completed. Please try again.',code:known?error.code:'AUTH_UNAVAILABLE'},{status:known?error.status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  }finally{if(reserved)activeAuth--;}
}
