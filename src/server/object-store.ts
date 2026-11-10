import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile, stat, unlink, rename } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { HttpError } from './db';

const MAX_BYTES=4_000_000;
function mode(){const value=process.env.PLAN_STORAGE||'local';if(value==='local'&&(process.env.NODE_ENV!=='production'||process.env.LOCAL_DEVELOPMENT==='true'))return value;if(value==='r2')return value;throw new HttpError(503,'Private plan storage is not configured.','STORAGE_UNAVAILABLE');}
function checkKey(key:string){if(!/^plans\/[a-f0-9]{32}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/.test(key))throw new Error('Invalid internal object key.');}
function localPath(key:string){checkKey(key);const root=resolve(/* turbopackIgnore: true */ process.env.PLAN_STORAGE_DIRECTORY||'.local/plan-assets'),target=resolve(root,key);if(!target.startsWith(root+sep))throw new Error('Invalid storage path.');const publicRoot=resolve('public');if(root===publicRoot||root.startsWith(publicRoot+sep))throw new Error('Private storage cannot be inside public.');return target;}
let client:S3Client|undefined;
function r2(){
  const id=process.env.R2_ACCOUNT_ID;
  if(!id||!/^[a-f0-9]{32}$/.test(id)||!process.env.R2_ACCESS_KEY_ID||!process.env.R2_SECRET_ACCESS_KEY||!process.env.R2_BUCKET)throw new HttpError(503,'Private plan storage is not configured.','STORAGE_UNAVAILABLE');
  return client??=new S3Client({region:'auto',endpoint:`https://${id}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},maxAttempts:2});
}
export async function putPrivateObject(key:string,bytes:Buffer){
  checkKey(key);if(bytes.length>MAX_BYTES)throw new HttpError(413,'The plan preview is too large.');
  if(mode()==='local'){const path=localPath(key);await mkdir(dirname(path),{recursive:true});const temporary=`${path}.${crypto.randomUUID()}.tmp`;await writeFile(temporary,bytes,{mode:0o600});try{await rename(temporary,path);}finally{await unlink(temporary).catch(()=>{});}return;}
  await r2().send(new PutObjectCommand({Bucket:process.env.R2_BUCKET,Key:key,Body:bytes,ContentType:'image/jpeg',CacheControl:'private, no-store',StorageClass:'STANDARD'}),{abortSignal:AbortSignal.timeout(20_000)});
}
export async function getPrivateObject(key:string){
  checkKey(key);
  if(mode()==='local'){const path=localPath(key);if((await stat(/* turbopackIgnore: true */ path)).size>MAX_BYTES)throw new Error('Stored plan exceeds limit.');return readFile(/* turbopackIgnore: true */ path);}
  const result=await r2().send(new GetObjectCommand({Bucket:process.env.R2_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(20_000)});
  if(!result.Body||Number(result.ContentLength)>MAX_BYTES)throw new Error('Stored plan exceeds limit.');
  let size=0;const parts:Buffer[]=[];for await(const chunk of result.Body as AsyncIterable<Uint8Array>){size+=chunk.length;if(size>MAX_BYTES)throw new Error('Stored plan exceeds limit.');parts.push(Buffer.from(chunk));}return Buffer.concat(parts);
}
export async function deletePrivateObject(key:string){
  checkKey(key);if(mode()==='local'){await unlink(localPath(key)).catch(error=>{if(error.code!=='ENOENT')throw error;});return;}
  await r2().send(new DeleteObjectCommand({Bucket:process.env.R2_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(20_000)});
}
