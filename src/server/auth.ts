import { betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import { hash, verify } from '@node-rs/argon2';
import { pool } from './db';
import { sendAuthEmail } from './email';

export function appOrigin(){return new URL(process.env.BETTER_AUTH_URL||process.env.APP_URL||'http://localhost:3000').origin;}
export const auth=betterAuth({
  appName:'PlanSaathi',database:pool,baseURL:appOrigin(),secret:process.env.BETTER_AUTH_SECRET,
  trustedOrigins:[appOrigin()],
  plugins:[twoFactor({issuer:'PlanSaathi'})],
  emailAndPassword:{enabled:true,requireEmailVerification:true,minPasswordLength:15,maxPasswordLength:128,autoSignIn:false,revokeSessionsOnPasswordReset:true,
    // @node-rs/argon2's Argon2id value is 2; avoid its ambient const enum under Next isolatedModules.
    password:{hash:(password)=>hash(password,{algorithm:2,memoryCost:19456,timeCost:2,parallelism:1,outputLen:32}),verify:({password,hash:stored})=>verify(stored,password)},
    sendResetPassword:async({user,url})=>{await sendAuthEmail(user.email,url,'reset');},
  },
  emailVerification:{sendOnSignUp:true,sendOnSignIn:true,autoSignInAfterVerification:false,expiresIn:3600,sendVerificationEmail:async({user,url})=>{await sendAuthEmail(user.email,url,'verification');}},
  user:{changeEmail:{enabled:false},deleteUser:{enabled:false}},
  session:{expiresIn:60*60*24*14,updateAge:60*10,cookieCache:{enabled:false}},
  advanced:{ipAddress:{ipAddressHeaders:['x-real-ip']},useSecureCookies:process.env.NODE_ENV==='production',defaultCookieAttributes:{httpOnly:true,sameSite:'lax'},database:{validateSchema:process.env.APP_BUILD_ONLY!=='1',generateId:()=>crypto.randomUUID()}},
  rateLimit:{enabled:true,window:60,max:60,storage:'database',customRules:{'/sign-in/email':{window:60,max:6},'/sign-up/email':{window:60,max:4},'/request-password-reset':{window:60,max:4},'/send-verification-email':{window:60,max:4}}},
  databaseHooks:{
    user:{create:{after:async(user)=>{await pool.query('INSERT INTO app_accounts(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);}}},
    session:{create:{before:async(session)=>{const result=await pool.query('SELECT status FROM app_accounts WHERE user_id=$1',[session.userId]);if(result.rows[0]?.status==='suspended')throw new APIError('FORBIDDEN',{message:'This account is suspended. Contact support.'});return {data:session};}}},
  },
});
