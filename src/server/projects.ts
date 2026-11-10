import { hydratePlanAsset, preparePlanAsset } from './plan-assets';
import { createHash, randomUUID } from 'node:crypto';
import { validateProject, type Project } from '../model';
import { buildTemplateProject, isProjectTemplate } from '../templates';
import { HttpError, iso, lockAccount, pool, transaction } from './db';

export const MONTHLY_LIMIT=10,MONTHLY_PRICE=149900,ADDON_PRICE=29900,ADDON_QUANTITY=2;
export function allowsOfflinePeriods(){return process.env.NODE_ENV==='development'||process.env.NODE_ENV==='test';}
export async function billingSummary(userId:string){
  const result=await pool.query(`SELECT a.*,p.period_start,p.period_end,p.monthly_used,p.status AS period_status,
    (p.status='paid' AND p.period_start<=now() AND p.period_end>now() AND ($2::boolean OR p.source='provider')) AS active FROM app_accounts a LEFT JOIN LATERAL (SELECT * FROM billing_periods b WHERE b.user_id=a.user_id ORDER BY CASE WHEN b.status='paid' AND b.period_start<=now() AND b.period_end>now() AND ($2::boolean OR b.source='provider') THEN 0 ELSE 1 END,b.period_start DESC LIMIT 1) p ON true WHERE a.user_id=$1`,[userId,allowsOfflinePeriods()]);
  const row=result.rows[0];if(!row)throw new HttpError(401,'Please sign in again.');
  const active=row.active===true,used=row.monthly_used||0;
  return {status:active?(row.subscription_status==='offline_development_fixture'?'offline_development_fixture':row.cancel_at_period_end?'cancel_at_period_end':'active'):(row.period_end?'expired':row.subscription_status||'none'),periodStart:iso(row.period_start),periodEnd:iso(row.period_end),monthlyLimit:MONTHLY_LIMIT,monthlyUsed:used,monthlyRemaining:active?Math.max(0,MONTHLY_LIMIT-used):0,addonCredits:row.addon_credits,canCreate:row.status==='active'&&active&&(used<MONTHLY_LIMIT||row.addon_credits>0),price:MONTHLY_PRICE,addonPrice:ADDON_PRICE,addonQuantity:ADDON_QUANTITY};
}
export async function listProjects(userId:string,search:string,page:number){
  const where='owner_id=$1 AND ($2=\'\' OR name ILIKE $3 OR client ILIKE $3)',params=[userId,search,`%${search.replace(/[\\%_]/g,'\\$&')}%`];
  const count=await pool.query(`SELECT count(*)::integer AS total FROM projects WHERE ${where}`,params),total=count.rows[0].total;
  const result=await pool.query(`SELECT id,name,client,updated_at,revision,archived,jsonb_array_length(document->'rooms') AS room_count,jsonb_array_length(document->'items') AS item_count,document->'rooms'->0->'points' AS preview FROM projects WHERE ${where} ORDER BY updated_at DESC,id LIMIT 12 OFFSET $4`,[...params,(page-1)*12]);
  return {projects:result.rows.map(row=>({id:row.id,name:row.name,client:row.client,updatedAt:iso(row.updated_at),revision:row.revision,roomCount:row.room_count,itemCount:row.item_count,archived:row.archived,preview:row.preview||[]})),page,pages:Math.max(1,Math.ceil(total/12)),total};
}
export async function createTenantProject(userId:string,key:string,name:string,template:string,furnished=true){
  if(!isProjectTemplate(template)||typeof furnished!=='boolean')throw new HttpError(400,'Choose an available project template and furnishing option.','INVALID_TEMPLATE');
  const blueprint=buildTemplateProject(template,furnished);
  const requestHash=createHash('sha256').update(JSON.stringify({name,template,...(!furnished?{furnished:false}:{})})).digest('hex');
  return transaction(async client=>{
    const account=await lockAccount(client,userId);
    const existing=await client.query('SELECT r.request_hash,p.id,p.document,p.revision,p.source_asset_id FROM creation_requests r JOIN projects p ON p.id=r.project_id WHERE r.user_id=$1 AND r.idempotency_key=$2',[userId,key]);
    if(existing.rowCount){if(existing.rows[0].request_hash!==requestHash)throw new HttpError(409,'This request key was already used for a different project.','IDEMPOTENCY_CONFLICT');const p=existing.rows[0];return {id:p.id,document:await hydratePlanAsset(userId,p.id,p.document as Project,p.source_asset_id),revision:p.revision};}
    const period=await client.query("SELECT * FROM billing_periods WHERE user_id=$1 AND status='paid' AND period_start<=now() AND period_end>now() AND ($2::boolean OR source='provider') ORDER BY period_start DESC LIMIT 1 FOR UPDATE",[userId,allowsOfflinePeriods()]);
    if(!period.rowCount)throw new HttpError(402,'An active paid billing period is required to create a project. Existing projects remain editable.','SUBSCRIPTION_REQUIRED');
    const monthly=period.rows[0].monthly_used<MONTHLY_LIMIT;
    if(monthly)await client.query('UPDATE billing_periods SET monthly_used=monthly_used+1 WHERE id=$1',[period.rows[0].id]);
    else {
      if(account.addon_credits<1)throw new HttpError(402,'This period’s 10 project credits are used. Buy 2 extra credits or wait for your next paid period.','QUOTA_EXHAUSTED');
      const grant=await client.query('SELECT source_key FROM credit_grants WHERE user_id=$1 AND remaining>0 AND reversed=false ORDER BY created_at,source_key LIMIT 1 FOR UPDATE',[userId]);
      if(!grant.rowCount)throw new HttpError(409,'Your extra-credit balance needs reconciliation. Contact support.','CREDIT_BALANCE_CONFLICT');
      await client.query('UPDATE credit_grants SET remaining=remaining-1 WHERE source_key=$1',[grant.rows[0].source_key]);
      await client.query('UPDATE app_accounts SET addon_credits=addon_credits-1 WHERE user_id=$1',[userId]);
    }
    const project=blueprint;project.id=randomUUID();project.name=name;project.client='';project.updatedAt=new Date().toISOString();
    await client.query('INSERT INTO projects(id,owner_id,name,client,document) VALUES($1,$2,$3,$4,$5)',[project.id,userId,project.name,project.client,JSON.stringify(project)]);
    await client.query('INSERT INTO creation_requests(user_id,idempotency_key,request_hash,project_id,credit_source,period_id) VALUES($1,$2,$3,$4,$5,$6)',[userId,key,requestHash,project.id,monthly?'monthly':'extra',period.rows[0].id]);
    return {id:project.id,document:project,revision:1};
  });
}
export async function getTenantProject(userId:string,id:string){const result=await pool.query('SELECT id,document,revision,source_asset_id FROM projects WHERE id=$1 AND owner_id=$2',[id,userId]);if(!result.rowCount)throw new HttpError(404,'This project was not found.');const row=result.rows[0];return {id:row.id,document:await hydratePlanAsset(userId,id,row.document,row.source_asset_id),revision:row.revision};}
export async function saveTenantProject(userId:string,id:string,input:unknown,revision:number,keepSourceImage=false){
  const found=await pool.query('SELECT revision,document,source_asset_id FROM projects WHERE id=$1 AND owner_id=$2',[id,userId]);const owned=found.rows[0];
  if(!owned)throw new HttpError(404,'This project was not found.');if(owned.revision!==revision)throw new HttpError(409,'This project changed in another tab. Download your work and reload the latest saved version.','REVISION_CONFLICT');
  let incoming=input;
  if(keepSourceImage){
    const source=(input as Project)?.sourcePlan,stored=owned.document.sourcePlan;
    if(!source||!stored||['name','width','height','page'].some(key=>source[key as keyof typeof source]!==stored[key]))throw new HttpError(400,'The saved plan reference changed. Send the complete preview or reload this project.','PLAN_REFERENCE_CHANGED');
    incoming={...input as object,sourcePlan:{...source,image:stored.image||'data:image/png;base64,aW50ZXJuYWwtc3RvcmVkLXJlZmVyZW5jZQ=='}};
  }
  let document:Project;
  try{document=validateProject({...incoming as object,id});}catch{throw new HttpError(400,'The project contains invalid room, object or source-plan data.','INVALID_PROJECT');}
  document.updatedAt=new Date().toISOString();
  const assetId=keepSourceImage&&owned.source_asset_id?owned.source_asset_id:document.sourcePlan?await preparePlanAsset(userId,id,document.sourcePlan):null;
  const stored={...document,...(document.sourcePlan?{sourcePlan:{...document.sourcePlan,image:''}}:{})};
  return transaction(async client=>{await lockAccount(client,userId);if(assetId){const asset=await client.query("SELECT id FROM plan_assets WHERE id=$1 AND owner_id=$2 AND project_id=$3 AND state='ready' FOR SHARE",[assetId,userId,id]);if(!asset.rowCount)throw new HttpError(503,'The plan preview is not ready. Please retry.','STORAGE_UNAVAILABLE');}const result=await client.query('UPDATE projects SET document=$1,name=$2,client=$3,revision=revision+1,updated_at=now(),source_asset_id=$7 WHERE id=$4 AND owner_id=$5 AND revision=$6 RETURNING revision,updated_at',[JSON.stringify(stored),document.name,document.client,id,userId,revision,assetId]);
    if(!result.rowCount){const exists=await client.query('SELECT 1 FROM projects WHERE id=$1 AND owner_id=$2',[id,userId]);if(!exists.rowCount)throw new HttpError(404,'This project was not found.');throw new HttpError(409,'This project changed in another tab. Download your work and reload the latest saved version.','REVISION_CONFLICT');}
    return {revision:result.rows[0].revision,updatedAt:iso(result.rows[0].updated_at)};
  });
}
export async function archiveTenantProject(userId:string,id:string,archived:boolean){return transaction(async client=>{await lockAccount(client,userId);const result=await client.query('UPDATE projects SET archived=$1,updated_at=now() WHERE id=$2 AND owner_id=$3',[archived,id,userId]);if(!result.rowCount)throw new HttpError(404,'This project was not found.');return {ok:true};});}
