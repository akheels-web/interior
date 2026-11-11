import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {auth} from '../src/server/auth';
import {pool} from '../src/server/db';
import {seedDevelopmentEntitlement} from '../src/server/development-fixtures';
const database=new URL(process.env.DATABASE_URL||'postgres://invalid/invalid');
if(process.env.NODE_ENV!=='development'||process.env.LOCAL_DEVELOPMENT!=='true'||!['127.0.0.1','localhost'].includes(database.hostname)||database.pathname!=='/forma')throw new Error('This helper only creates explicitly marked local development fixtures.');
process.env.ALLOW_OFFLINE_BILLING_FIXTURES='true';
const file='.local/development-accounts.json';
type Fixture={name:string;email:string;password:string;id?:string};let accounts:Fixture[];
try{accounts=JSON.parse(await readFile(file,'utf8'));}catch{accounts=[{name:'Forma administrator',email:process.env.SUPER_ADMIN_EMAIL||'admin@forma.local',password:randomBytes(24).toString('base64url')},{name:'Studio One',email:'studio.one@forma.local',password:randomBytes(24).toString('base64url')},{name:'Studio Two',email:'studio.two@forma.local',password:randomBytes(24).toString('base64url')}];}
try{
  for(const entry of accounts){
    const existing=await pool.query('SELECT id FROM "user" WHERE lower(email)=lower($1)',[entry.email]);
    if(existing.rowCount){if(!entry.id||entry.id!==existing.rows[0].id)throw new Error('An existing account was not created by this fixture helper. Its password and verification were left unchanged.');}
    else{const result=await auth.api.signUpEmail({body:{name:entry.name,email:entry.email,password:entry.password}});entry.id=result.user.id;await pool.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1',[entry.id]);}
    await seedDevelopmentEntitlement(entry.email);
  }
  await mkdir('.local',{recursive:true});await writeFile(file,JSON.stringify(accounts,null,2),{mode:0o600});
  console.log('Prepared 3 local-only development accounts with explicitly marked offline billing periods. No payment was made. Credentials are in the ignored .local/development-accounts.json file.');
}finally{await pool.end();}
