import {randomBytes} from 'node:crypto';
import {existsSync,writeFileSync,mkdirSync,readFileSync} from 'node:fs';
if(existsSync('.env.local')){
  const existing=readFileSync('.env.local','utf8');
  if(/^LOCAL_DEVELOPMENT=true$/m.test(existing)&&/^APP_URL=http:\/\/127\.0\.0\.1:3000$/m.test(existing)&&!/^OPS_TOKEN=.+$/m.test(existing)){
    const token='OPS_TOKEN='+randomBytes(48).toString('base64url');writeFileSync('.env.local',/^OPS_TOKEN=.*$/m.test(existing)?existing.replace(/^OPS_TOKEN=.*$/m,token):existing.trimEnd()+'\n'+token+'\n',{mode:0o600});console.log('Existing local configuration preserved; added the missing operations token.');
  }else console.log('Existing .env.local retained.');process.exit(0);
}
const password=randomBytes(24).toString('hex'),redis=randomBytes(24).toString('hex');
const env={NODE_ENV:'development',POSTGRES_PASSWORD:password,REDIS_PASSWORD:redis,DATABASE_URL:'postgresql://forma:'+password+'@127.0.0.1:5548/forma',TEST_DATABASE_URL:'postgresql://forma:'+password+'@127.0.0.1:5548/forma_test',REDIS_URL:'redis://:'+redis+'@127.0.0.1:6388/0',BETTER_AUTH_URL:'http://127.0.0.1:3000',BETTER_AUTH_SECRET:randomBytes(48).toString('base64url'),APP_URL:'http://127.0.0.1:3000',SUPER_ADMIN_EMAIL:'grow.lokal1@gmail.com',SMTP_HOST:'127.0.0.1',SMTP_PORT:'1028',SMTP_SECURE:'false',SMTP_FROM:'PlanSaathi Local <studio@forma.local>',LOCAL_DEVELOPMENT:'true',OPS_TOKEN:randomBytes(48).toString('base64url'),PLAN_STORAGE:'local',RAZORPAY_KEY_ID:'',RAZORPAY_KEY_SECRET:'',RAZORPAY_PLAN_ID:'',RAZORPAY_WEBHOOK_SECRET:''};
writeFileSync('.env.local',Object.entries(env).map(([key,value])=>key+'='+value).join('\n')+'\n',{mode:0o600,flag:'wx'});
mkdirSync('.local',{recursive:true});console.log('Created ignored local configuration with random service secrets. No production credentials configured.');

