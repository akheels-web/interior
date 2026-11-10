import {createHmac} from 'node:crypto';
import {transaction} from './db';
import nodemailer from 'nodemailer';
export function emailConfigured(){return !!(process.env.SMTP_HOST&&process.env.SMTP_FROM);}
export async function sendAuthEmail(to:string,url:string,kind:'verification'|'reset'){
  if(!emailConfigured())throw new Error('Email delivery is not configured. Contact support.');
  // Reserve before dispatch. Failed/ambiguous SMTP attempts still consume the allowance.
  await transaction(async client=>{
    const day=new Date().toISOString().slice(0,10),month=day.slice(0,7),recipient=createHmac('sha256',process.env.BETTER_AUTH_SECRET||'local-only').update(to.toLowerCase()).digest('hex');
    for(const [key,maximum,seconds] of [[`mail-day:${day}`,Number(process.env.AUTH_EMAIL_DAILY_LIMIT||80),86400],[`mail-month:${month}`,Number(process.env.AUTH_EMAIL_MONTHLY_LIMIT||2200),32*86400],[`mail-to:${recipient}:${Math.floor(Date.now()/900000)}`,3,900]] as const){
      if(!Number.isSafeInteger(maximum)||maximum<1)throw new Error('Invalid email budget configuration.');
      const count=await client.query("INSERT INTO api_rate_limits(bucket,count,expires_at) VALUES($1,1,now()+($2*interval '1 second')) ON CONFLICT(bucket) DO UPDATE SET count=api_rate_limits.count+1 RETURNING count",[key,seconds]);
      if(count.rows[0].count>maximum)throw new Error('Email delivery is temporarily at capacity. Try again later.');
    }
  });
  const host=process.env.SMTP_HOST!,local=['localhost','127.0.0.1','mailpit'].includes(host);
  if(process.env.NODE_ENV==='production'&&!local&&process.env.SMTP_SECURE!=='true'&&!process.env.SMTP_USER)throw new Error('Authenticated SMTP is required.');
  const transport=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',requireTLS:!local&&process.env.SMTP_SECURE!=='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined,connectionTimeout:10_000,socketTimeout:15_000});
  await transport.sendMail({from:process.env.SMTP_FROM,to,subject:kind==='verification'?'Verify your PlanSaathi email':'Reset your PlanSaathi password',text:`${kind==='verification'?'Verify your email address':'Choose a new password'} using this secure link:\n\n${url}\n\nIf you did not request this, you can ignore this message.\nPlanSaathi`});
}
