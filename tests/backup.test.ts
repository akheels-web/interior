import {afterEach,describe,expect,it} from 'vitest';
import {randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {encryptBackup,decryptBackup} from '../scripts/backup.mjs';
const folders:string[]=[];
afterEach(async()=>{for(const path of folders.splice(0))await rm(path,{recursive:true,force:true});});
describe('Authenticated encrypted backup envelope',()=>{
  it('round-trips a dump and refuses wrong keys, tampered bytes and overwrite',async()=>{const dir=await mkdtemp(join(tmpdir(),'plansaathi-backup-test-'));folders.push(dir);const data=randomBytes(8192),key=randomBytes(32),cipher=join(dir,'dump.aesgcm'),plain=join(dir,'restored.dump');await encryptBackup(Readable.from(data),cipher,key);expect((await readFile(cipher)).subarray(0,6).toString()).toBe('PSBAK1');await decryptBackup(cipher,plain,key);expect(await readFile(plain)).toEqual(data);await expect(decryptBackup(cipher,plain,key)).rejects.toThrow();await expect(decryptBackup(cipher,join(dir,'wrong.dump'),randomBytes(32))).rejects.toThrow();await expect(stat(join(dir,'wrong.dump'))).rejects.toThrow();const corrupted=await readFile(cipher);corrupted[40]^=1;await writeFile(join(dir,'bad.aesgcm'),corrupted);await expect(decryptBackup(join(dir,'bad.aesgcm'),join(dir,'bad.dump'),key)).rejects.toThrow();await expect(stat(join(dir,'bad.dump'))).rejects.toThrow();});
  it('bounds backup size and removes an incomplete output',async()=>{const dir=await mkdtemp(join(tmpdir(),'plansaathi-backup-test-'));folders.push(dir);const file=join(dir,'large.aesgcm');await expect(encryptBackup(Readable.from(randomBytes(100)),file,randomBytes(32),50)).rejects.toThrow();await expect(stat(file)).rejects.toThrow();});
});
