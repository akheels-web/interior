import { HttpError } from './db';

export function configurationErrors(env:Record<string,string|undefined>=process.env){
  const errors:string[]=[];
  if(env.APP_BUILD_ONLY==='1')errors.push('APP_BUILD_ONLY cannot be enabled at runtime.');
  let origin:URL|undefined;try{origin=new URL(env.APP_URL||'');}catch{errors.push('APP_URL must be an absolute HTTPS origin.');}
  if(origin&&(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password))errors.push('APP_URL must be an HTTPS origin without credentials, path or query.');
  if(!env.BETTER_AUTH_URL||env.BETTER_AUTH_URL!==env.APP_URL)errors.push('BETTER_AUTH_URL must equal APP_URL.');
  if(!env.BETTER_AUTH_SECRET||Buffer.byteLength(env.BETTER_AUTH_SECRET)<48)errors.push('BETTER_AUTH_SECRET must contain at least 48 bytes of independently generated randomness.');
  if(env.LOCAL_DEVELOPMENT==='true')errors.push('LOCAL_DEVELOPMENT must be disabled for launch.');
  if(!env.DATABASE_URL)errors.push('DATABASE_URL is required.');
  if(!env.SUPER_ADMIN_EMAIL)errors.push('SUPER_ADMIN_EMAIL is required.');
  if(!env.SMTP_HOST||!env.SMTP_FROM||!env.SMTP_USER||!env.SMTP_PASS)errors.push('Authenticated SMTP sender configuration is required.');
  if(['localhost','127.0.0.1','mailpit'].includes(env.SMTP_HOST||''))errors.push('Mailpit/local SMTP cannot be used for launch.');
  if(!env.OPS_TOKEN||env.OPS_TOKEN.length<48)errors.push('OPS_TOKEN must contain at least 48 random characters.');
  if(env.PLAN_STORAGE!=='r2'||!env.R2_ACCOUNT_ID||!env.R2_BUCKET||!env.R2_ACCESS_KEY_ID||!env.R2_SECRET_ACCESS_KEY)errors.push('Private R2 storage configuration is required.');
  return errors;
}

/** Run at request time: a build must not need live database or payment secrets. */
export function assertRuntimeConfiguration(request:Request){
  if(process.env.NODE_ENV!=='production')return;
  const local=(value:string)=>{try{return ['127.0.0.1','localhost','[::1]'].includes(new URL(value).hostname);}catch{return false;}};
  if(process.env.LOCAL_DEVELOPMENT==='true'&&local(process.env.APP_URL||process.env.BETTER_AUTH_URL||'')&&local(request.url))return;
  const errors=configurationErrors();
  if(errors.length)throw new HttpError(503,'The service is not ready for sign-in. Contact support.','SERVICE_NOT_READY');
}
