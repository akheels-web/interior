import { isProjectTemplate } from '../templates';
import {publicHealth} from './health';
import { enqueueBillingWebhook, billingOperations } from './billing-inbox';
import { operationsTick, readiness } from './operations';
import { assertRuntimeConfiguration } from './runtime-config';
import { principal, assertAdmin, assertMutation, jsonBody, limitedBody, pageQuery, rateLimit, requiredString, UUID } from './access';
import { pool, HttpError, iso, lockAccount, transaction } from './db';
import { billingSummary, listProjects, createTenantProject, getTenantProject, saveTenantProject, archiveTenantProject } from './projects';
import { paymentsConfigured, checkout, verifyCheckout, cancelSubscription } from './billing';
import { emailConfigured } from './email';
import { accountDetail, changeAccount, listAccounts } from './admin';

function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});}
export async function handleApi(request:Request):Promise<Response>{
  try{
    const url=new URL(request.url),path=url.pathname.replace(/\/$/,''),method=request.method;
    if(path==='/api/health'&&method==='GET'){const ok=await publicHealth();return json({ok},ok?200:503);}
    if(path==='/api/billing/webhook'&&method==='POST')return json(await enqueueBillingWebhook(await limitedBody(request,1024*1024),request.headers.get('x-razorpay-signature')||'',request.headers.get('x-razorpay-event-id')||''));
    if(path==='/api/ops/tick'&&method==='POST')return json(await operationsTick(request));
    if(path==='/api/ops/ready'&&method==='GET'){const health=await readiness(request);return json(health,health.ok?200:503);}
    assertRuntimeConfiguration(request);
    if(!['GET','POST','PUT','DELETE'].includes(method))throw new HttpError(405,'This method is not supported.');
    if(method!=='GET')assertMutation(request);
    const user=await principal(request);await rateLimit(user.id,'api');
    if(path==='/api/me'&&method==='GET')return json({user:{id:user.id,name:user.name,email:user.email,role:user.role,mfaEnabled:user.mfaEnabled,mfaVerified:user.mfaVerified},billing:{...await billingSummary(user.id),configured:paymentsConfigured()},setup:{emailConfigured:emailConfigured(),paymentsConfigured:paymentsConfigured()}});
    if(path==='/api/projects'){
      if(method==='GET'){const query=pageQuery(url);return json(await listProjects(user.id,query.search,query.page));}
      if(method==='POST'){
        await rateLimit(user.id,'project-create',30);const body=await jsonBody(request,4096),name=requiredString(body.name,'project name'),key=request.headers.get('idempotency-key')||'';
        if(!UUID.test(key))throw new HttpError(400,'A UUID Idempotency-Key is required.','IDEMPOTENCY_KEY_REQUIRED');
        if(body.template!==undefined&&!isProjectTemplate(body.template))throw new HttpError(400,'Choose an available project template.','INVALID_TEMPLATE');
        if(body.furnished!==undefined&&typeof body.furnished!=='boolean')throw new HttpError(400,'Choose whether to include furniture.','INVALID_TEMPLATE');
        return json(await createTenantProject(user.id,key,name,body.template===undefined?'blank':body.template as string,body.furnished!==false),201);
      }
    }
    const project=path.match(/^\/api\/projects\/([^/]+)(\/archive)?$/);
    if(project){const id=project[1];if(!UUID.test(id))throw new HttpError(404,'This project was not found.');
      if(!project[2]&&method==='GET')return json(await getTenantProject(user.id,id));
      if(!project[2]&&method==='PUT'){const body=await jsonBody(request);if(!Number.isInteger(body.revision)||Number(body.revision)<1)throw new HttpError(400,'A valid project revision is required.');if(body.keepSourceImage!==undefined&&typeof body.keepSourceImage!=='boolean')throw new HttpError(400,'Invalid plan reference option.');return json(await saveTenantProject(user.id,id,body.document,Number(body.revision),body.keepSourceImage===true));}
      if(project[2]&&method==='POST'){const body=await jsonBody(request,1024);if(typeof body.archived!=='boolean')throw new HttpError(400,'Choose whether to archive or restore the project.');return json(await archiveTenantProject(user.id,id,body.archived));}
    }
    if(path==='/api/devices'){
      if(method==='GET'){const result=await pool.query('SELECT id,"userAgent","createdAt","updatedAt","expiresAt" FROM "session" WHERE "userId"=$1 AND "expiresAt">now() ORDER BY "updatedAt" DESC LIMIT 100',[user.id]);return json({devices:result.rows.map(row=>({id:row.id,label:deviceLabel(row.userAgent||''),userAgent:(row.userAgent||'').slice(0,500),createdAt:iso(row.createdAt),lastActiveAt:iso(row.updatedAt),expiresAt:iso(row.expiresAt),current:row.id===user.sessionId}))});}
      if(method==='DELETE'){const body=await jsonBody(request,1024);if(body.others!==true&&(typeof body.id!=='string'||body.id.length>200))throw new HttpError(400,'Choose a device to revoke.');return json(await transaction(async client=>{await lockAccount(client,user.id);if(body.others===true)await client.query('DELETE FROM "session" WHERE "userId"=$1 AND id<>$2',[user.id,user.sessionId]);else await client.query('DELETE FROM "session" WHERE "userId"=$1 AND id=$2',[user.id,body.id]);return {ok:true};}));}
    }
    if(path==='/api/billing/checkout'&&method==='POST'){await rateLimit(user.id,'checkout',8,60);const body=await jsonBody(request,1024);if(body.kind!=='subscription'&&body.kind!=='addon')throw new HttpError(400,'Choose a monthly subscription or extra credits.');const key=request.headers.get('idempotency-key')||'';if(!UUID.test(key))throw new HttpError(400,'A UUID Idempotency-Key is required.','IDEMPOTENCY_KEY_REQUIRED');return json(await checkout(user.id,body.kind,key));}
    if(path==='/api/billing/verify'&&method==='POST'){await rateLimit(user.id,'verify',20,60);return json(await verifyCheckout(user.id,await jsonBody(request,4096)));}
    if(path==='/api/billing/cancel'&&method==='POST'){const body=await jsonBody(request,1024);if(body.atPeriodEnd!==true)throw new HttpError(400,'Cancellation must take effect at the end of the paid period.');return json(await cancelSubscription(user.id));}
    if(path.startsWith('/api/admin/'))assertAdmin(user);
    if(path==='/api/admin/operations'&&method==='GET')return json(await billingOperations());
    if(path==='/api/admin/accounts'&&method==='GET'){const query=pageQuery(url);return json(await listAccounts(user,query.search,query.page));}
    const account=path.match(/^\/api\/admin\/accounts\/([^/]+)$/);
    if(account){if(account[1].length>200)throw new HttpError(404,'This account was not found.');if(method==='GET')return json(await accountDetail(user,account[1]));if(method==='POST'){const body=await jsonBody(request,2048);return json(await changeAccount(user,account[1],requiredString(body.action,'account action',40),requiredString(body.reason,'reason',500),typeof body.credits==='number'?body.credits:undefined));}}
    throw new HttpError(404,'This endpoint was not found.');
  }catch(error){if(error instanceof HttpError){if(error.status>=500)console.error('Service operation needs attention',{status:error.status,code:error.code||'SERVICE_ERROR'});return json({error:error.message,...(error.code?{code:error.code}:{})},error.status);}console.error('PlanSaathi API request failed',{error:error instanceof Error?error.name:'UnknownError'});return json({error:'This request could not be completed. Please try again.',code:'INTERNAL_ERROR'},500);}
}
function deviceLabel(agent:string){const browser=/Edg\//.test(agent)?'Edge':/Firefox\//.test(agent)?'Firefox':/Chrome\//.test(agent)?'Chrome':/Safari\//.test(agent)?'Safari':'Browser';const system=/Windows/.test(agent)?'Windows':/Android/.test(agent)?'Android':/iPhone|iPad/.test(agent)?'iOS':/Macintosh/.test(agent)?'macOS':/Linux/.test(agent)?'Linux':'device';return `${browser} on ${system}`;}
