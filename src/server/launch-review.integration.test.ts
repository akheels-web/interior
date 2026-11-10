import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
const database=process.env.TEST_DATABASE_URL;
describe.skipIf(!database)('Launch review payment regression',()=>{
  let db:typeof import('./db'),billing:typeof import('./billing');const users:string[]=[];
  beforeAll(async()=>{const target=new URL(database!);if(!/forma_test$/.test(target.pathname)||!['localhost','127.0.0.1'].includes(target.hostname))throw new Error('Use only the isolated loopback forma_test database.');process.env.DATABASE_URL=database;process.env.BETTER_AUTH_URL='http://127.0.0.1:3000';process.env.BETTER_AUTH_SECRET||=randomUUID()+randomUUID();db=await import('./db');await(await import('../../migrations/runner')).migrate();billing=await import('./billing');},60000);
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
  afterAll(async()=>{if(!db)return;for(const id of users){await db.pool.query('DELETE FROM checkout_intents WHERE user_id=$1',[id]);await db.pool.query('DELETE FROM app_accounts WHERE user_id=$1',[id]);await db.pool.query('DELETE FROM "user" WHERE id=$1',[id]);}await db.pool.end();});
  it('does not create another subscription merely because an unpaid ready checkout is over 24 hours old',async()=>{
    const id=randomUUID();users.push(id);await db.pool.query('INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,now(),now())',[id,'Launch review',`${id}@example.test`]);await db.pool.query('INSERT INTO app_accounts(user_id) VALUES($1)',[id]);
    for(const [key,value] of Object.entries({RAZORPAY_KEY_ID:'rzp_test_synthetic',RAZORPAY_KEY_SECRET:'synthetic-key',RAZORPAY_PLAN_ID:'plan_synthetic',RAZORPAY_WEBHOOK_SECRET:'synthetic-webhook'}))vi.stubEnv(key,value);
    let created=0;vi.spyOn(globalThis,'fetch').mockImplementation(async(input,options)=>{if(String(input).includes('/plans/'))return Response.json({id:'plan_synthetic',period:'monthly',interval:1,item:{amount:149900,currency:'INR'}});if(String(input).endsWith('/subscriptions')&&options?.method==='POST'){created++;return Response.json({id:`sub_synthetic${created}`,status:'created'});}throw new Error('Unexpected synthetic provider route');});
    const first=await billing.checkout(id,'subscription',randomUUID());await db.pool.query("UPDATE checkout_intents SET created_at=now()-interval '25 hours' WHERE user_id=$1",[id]);
    const second=await billing.checkout(id,'subscription',randomUUID()).catch(error=>{expect(['CHECKOUT_PENDING','SUBSCRIPTION_EXISTS']).toContain((error as {code?:string}).code);return null;});if(second)expect(second).toEqual(first);
    expect(created).toBe(1);
  });
});

