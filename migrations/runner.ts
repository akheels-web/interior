import { readFile } from 'node:fs/promises';
import { getMigrations } from 'better-auth/db/migration';
import { auth } from '../src/server/auth';
import { pool } from '../src/server/db';

export async function migrate(){
  const client=await pool.connect();
  try{
    await client.query("SELECT pg_advisory_lock(hashtext('forma-migrations-v1'))");
    const generated=await getMigrations(auth.options);await generated.runMigrations();
    await client.query('CREATE TABLE IF NOT EXISTS forma_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for(const name of ['001_platform','002_fixture_provenance','003_mfa_security','004_billing_inbox','005_session_assurance','006_private_assets','007_factor_precision','008_billing_poll']){
      const exists=await client.query('SELECT 1 FROM forma_migrations WHERE name=$1',[name]);
      if(!exists.rowCount){const sql=await readFile(new URL(`./${name}.sql`,import.meta.url),'utf8');await client.query('BEGIN');try{await client.query(sql);await client.query('INSERT INTO forma_migrations(name) VALUES($1)',[name]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}}
    }
  }finally{await client.query("SELECT pg_advisory_unlock(hashtext('forma-migrations-v1'))");client.release();}
}
if(process.argv[1]?.replace(/\\/g,'/').endsWith('/migrations/runner.ts'))migrate().then(()=>pool.end()).catch(error=>{console.error('Migration failed:',error instanceof Error?error.message:'Unknown error');process.exitCode=1;void pool.end();});
