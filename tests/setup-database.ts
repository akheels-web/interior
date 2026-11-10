import {spawnSync} from 'node:child_process';

/** Migrate before workers import auth: its schema validation is cached per instance. */
export default function setupDatabase(){
  const target=process.env.TEST_DATABASE_URL;
  if(!target)return;
  const url=new URL(target);
  if(url.pathname!=='/forma_test'||!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Tests require the dedicated loopback forma_test database.');
  const result=spawnSync(process.execPath,['--import','tsx','migrations/runner.ts'],{
    env:{...process.env,DATABASE_URL:target},encoding:'utf8',timeout:60_000,maxBuffer:1024*1024,windowsHide:true,
  });
  if(result.status!==0)throw new Error('Test database bootstrap failed. Verify the isolated database and migration configuration.');
}
