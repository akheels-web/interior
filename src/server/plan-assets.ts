import {rateLimit} from './access';
import sharp from 'sharp';
import {inspectPlanBytes} from '../planInput';
import { createHash, randomUUID } from 'node:crypto';
import type { Project, SourcePlan } from '../model';
import { HttpError, pool, transaction } from './db';
import { getPrivateObject, putPrivateObject, deletePrivateObject } from './object-store';

let activeDecodes=0;
export async function preparePlanAsset(owner:string,projectId:string,source:SourcePlan){
  // This check precedes image decoding, quota reservations and any object-store I/O.
  if(!(await pool.query('SELECT 1 FROM projects WHERE id=$1 AND owner_id=$2',[projectId,owner])).rowCount)throw new HttpError(404,'This project was not found.');
  const hash=createHash('sha256').update(source.image).digest('hex');
  const prior=await pool.query('UPDATE plan_assets SET updated_at=now() WHERE project_id=$1 AND owner_id=$2 AND (source_hash=$3 OR stored_hash=$3) AND state=\'ready\' RETURNING id,width,height',[projectId,owner,hash]);
  if(prior.rowCount){if(prior.rows[0].width!==source.width||prior.rows[0].height!==source.height)throw new HttpError(400,'The plan preview dimensions do not match.');return prior.rows[0].id as string;}
  await rateLimit(owner,'plan-upload',20,3600);await rateLimit('all','plan-upload-budget',2000,86400);
  if(source.image.length>4_000_000||!/^data:image\/(png|jpeg);base64,[a-z0-9+/=]+$/i.test(source.image))throw new HttpError(400,'Choose a valid PNG or JPEG plan preview.');
  let bytes:Buffer,width:number,height:number;
  if(activeDecodes>=2)throw new HttpError(429,'Plan previews are being processed. Keep this tab open and retry in a moment.','PLAN_PROCESSING_BUSY');
  activeDecodes++;
  try{
    const raw=Buffer.from(source.image.split(',')[1],'base64'),input=inspectPlanBytes(raw);
    if(input.kind==='pdf'||(input.kind!=='png'&&input.kind!=='jpeg')||input.width*input.height>4_000_000||input.width>2000||input.height>2000)throw new Error('Invalid preview format.');
    const image=await sharp(raw,{limitInputPixels:4_000_000,failOn:'warning'}).rotate().flatten({background:'#ffffff'}).jpeg({quality:90}).toBuffer({resolveWithObject:true});
    bytes=image.data;width=image.info.width;height=image.info.height;
    if(width!==source.width||height!==source.height||bytes.length>4_000_000)throw new Error('Invalid preview dimensions.');
  }catch{throw new HttpError(400,'The plan preview is damaged or too large. Import a fresh plan.','INVALID_PLAN_IMAGE');}finally{activeDecodes--;}
  const asset=await transaction(async client=>{
    await client.query("SELECT pg_advisory_xact_lock(hashtext('plan-storage-budget'))");
    const existing=await client.query('SELECT * FROM plan_assets WHERE project_id=$1 AND owner_id=$2 AND source_hash=$3',[projectId,owner,hash]);
    if(existing.rowCount){if(existing.rows[0].state==='deleting')throw new HttpError(503,'Plan storage is busy. Please retry.');return existing.rows[0] as {id:string;object_key:string};}
    const budget=Number(process.env.PLAN_STORAGE_BUDGET_BYTES||8_000_000_000);
    const used=await client.query('SELECT COALESCE(sum(byte_size),0)::text AS bytes FROM plan_assets');
    if(!Number.isSafeInteger(budget)||budget<1||Number(used.rows[0].bytes)+bytes.length>budget)throw new HttpError(503,'Plan storage is at capacity. Existing saved work is safe; contact support before importing another preview.','STORAGE_CAPACITY');
    const id=randomUUID(),prefix=createHash('sha256').update(owner).digest('hex').slice(0,32),key=`plans/${prefix}/${projectId}/${id}.jpg`;
    await client.query('INSERT INTO plan_assets(id,owner_id,project_id,source_hash,object_key,byte_size,width,height,stored_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,owner,projectId,hash,key,bytes.length,width,height,createHash('sha256').update(`data:image/jpeg;base64,${bytes.toString('base64')}`).digest('hex')]);return {id,object_key:key};
  });
  try{await putPrivateObject(asset.object_key,bytes);await pool.query("UPDATE plan_assets SET state='ready',updated_at=now() WHERE id=$1 AND owner_id=$2 AND state='pending'",[asset.id,owner]);return asset.id;}
  catch{throw new HttpError(503,'The plan preview could not be stored. Your previous saved project is unchanged. Keep this tab open or download a backup, then retry.','STORAGE_UNAVAILABLE');}
}

export async function hydratePlanAsset(owner:string,projectId:string,document:Project,assetId:string|null){
  if(!assetId)return document;
  const result=await pool.query("SELECT a.object_key FROM plan_assets a JOIN projects p ON p.id=a.project_id AND p.owner_id=a.owner_id WHERE a.id=$1 AND a.owner_id=$2 AND a.project_id=$3 AND p.source_asset_id=a.id AND a.state='ready'",[assetId,owner,projectId]);
  if(!result.rowCount)throw new HttpError(503,'The private plan preview is temporarily unavailable. Please retry.','STORAGE_UNAVAILABLE');
  try{const bytes=await getPrivateObject(result.rows[0].object_key);return {...document,sourcePlan:{...document.sourcePlan!,image:`data:image/jpeg;base64,${bytes.toString('base64')}`}};}
  catch{throw new HttpError(503,'The private plan preview could not be loaded. Your project remains saved. Please retry.','STORAGE_UNAVAILABLE');}
}

/** Unreferenced upload/replacement files only; archived projects retain their referenced preview. */
export async function collectOrphanAssets(){
  const candidates=await pool.query("UPDATE plan_assets SET state='deleting' WHERE id IN (SELECT a.id FROM plan_assets a WHERE a.updated_at<now()-interval '7 days' AND NOT EXISTS(SELECT 1 FROM projects p WHERE p.source_asset_id=a.id) ORDER BY a.updated_at LIMIT 10 FOR UPDATE SKIP LOCKED) RETURNING id,object_key");
  let deleted=0;for(const row of candidates.rows){try{await deletePrivateObject(row.object_key);await pool.query("DELETE FROM plan_assets WHERE id=$1 AND state='deleting' AND NOT EXISTS(SELECT 1 FROM projects WHERE source_asset_id=$1)",[row.id]);deleted++;}catch{/* Keep the tombstone and reservation; retry next maintenance run. */}}
  return deleted;
}
