import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createReadStream,createWriteStream,constants} from 'node:fs';
import {appendFile,copyFile,open,stat,unlink,writeFile} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';

const MAGIC=Buffer.from('PSBAK1'),MAX=250*1024*1024;
export function backupKey(value){const key=Buffer.from(value||'','base64');if(key.length!==32)throw new Error('A base64-encoded 32-byte BACKUP_ENCRYPTION_KEY is required.');return key;}
export async function encryptBackup(input,destination,key,maximum=MAX){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);let count=0;
  await writeFile(destination,Buffer.concat([MAGIC,iv]),{flag:'wx',mode:0o600});
  try{
    const bound=new Transform({transform(chunk,_encoding,done){count+=chunk.length;done(count>maximum?new Error('Backup exceeds the configured size budget.'):null,chunk);}});
    await pipeline(input,bound,cipher,createWriteStream(destination,{flags:'a',mode:0o600}));
    if(!count)throw new Error('The database dump was empty.');
    await appendFile(destination,cipher.getAuthTag());return count;
  }catch(error){await unlink(destination).catch(()=>{});throw error;}
}
export async function decryptBackup(source,destination,key){
  const size=(await stat(source)).size;if(size<34||size>MAX+34)throw new Error('Invalid backup size.');
  const file=await open(source,'r'),header=Buffer.alloc(18),tag=Buffer.alloc(16);
  try{await file.read(header,0,18,0);await file.read(tag,0,16,size-16);}finally{await file.close();}
  if(!header.subarray(0,6).equals(MAGIC))throw new Error('This is not a PlanSaathi encrypted backup.');
  const decipher=createDecipheriv('aes-256-gcm',key,header.subarray(6));decipher.setAuthTag(tag);
  const partial=`${destination}.${randomBytes(6).toString('hex')}.partial`;
  try{
    await pipeline(createReadStream(source,{start:18,end:size-17}),decipher,createWriteStream(partial,{flags:'wx',mode:0o600}));
    // A failed authentication never exposes a completed plaintext file or overwrites an existing one.
    await copyFile(partial,destination,constants.COPYFILE_EXCL);
  }finally{await unlink(partial).catch(()=>{});}
}
async function uploadBackup(path){
  const size=(await stat(path)).size;if(size<34||size>MAX+34)throw new Error('Invalid encrypted backup size.');
  const file=await open(path,'r'),header=Buffer.alloc(6);try{await file.read(header,0,6,0);}finally{await file.close();}
  if(!header.equals(MAGIC))throw new Error('Only encrypted backups can be uploaded.');
  const id=process.env.BACKUP_R2_ACCOUNT_ID,bucket=process.env.BACKUP_R2_BUCKET,accessKeyId=process.env.BACKUP_R2_ACCESS_KEY_ID,secretAccessKey=process.env.BACKUP_R2_SECRET_ACCESS_KEY;
  if(!id||!/^[a-f0-9]{32}$/.test(id)||!bucket||!accessKeyId||!secretAccessKey)throw new Error('Separate backup R2 configuration is required.');
  const client=new S3Client({region:'auto',endpoint:`https://${id}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey},maxAttempts:2});
  const key=`database/${new Date().toISOString().replaceAll(':','-')}-${randomBytes(4).toString('hex')}.aesgcm`;
  await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:createReadStream(path),ContentLength:size,ContentType:'application/octet-stream',CacheControl:'private, no-store',StorageClass:'STANDARD'}),{abortSignal:AbortSignal.timeout(120_000)});
  console.log(JSON.stringify({uploaded:true,key,encryptedBytes:size}));client.destroy();
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [action,input,output]=process.argv.slice(2);
  try{
    if(action==='encrypt'){if(!input)throw new Error('A new encrypted output path is required.');await encryptBackup(process.stdin,input,backupKey(process.env.BACKUP_ENCRYPTION_KEY));console.log('Encrypted backup saved.');}
    else if(action==='decrypt'){if(!input||!output)throw new Error('Encrypted source and new plaintext destination are required.');await decryptBackup(input,output,backupKey(process.env.BACKUP_ENCRYPTION_KEY));console.log('Backup authentication and decryption succeeded.');}
    else if(action==='upload'){if(!input)throw new Error('Encrypted source is required.');await uploadBackup(input);}
    else throw new Error('Use encrypt, decrypt or upload.');
  }catch(error){console.error('Backup operation failed',{type:error instanceof Error?error.name:'UnknownError'});process.exitCode=1;}
}
