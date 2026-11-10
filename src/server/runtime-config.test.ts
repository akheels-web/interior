import {describe,expect,it} from 'vitest';
import {configurationErrors} from './runtime-config';
describe('Production configuration fails closed',()=>{
  const valid={APP_URL:'https://plansaathi.example',BETTER_AUTH_URL:'https://plansaathi.example',BETTER_AUTH_SECRET:'x'.repeat(64),DATABASE_URL:'postgresql://configured',SUPER_ADMIN_EMAIL:'admin@example.test',SMTP_HOST:'smtp.example.test',SMTP_FROM:'hello@example.test',SMTP_USER:'configured',SMTP_PASS:'configured',OPS_TOKEN:'x'.repeat(64),PLAN_STORAGE:'r2',R2_ACCOUNT_ID:'a'.repeat(32),R2_BUCKET:'private',R2_ACCESS_KEY_ID:'configured',R2_SECRET_ACCESS_KEY:'configured'};
  it('accepts a complete configuration without requiring a build-time provider connection',()=>expect(configurationErrors(valid)).toEqual([]));
  it('rejects unsafe origins, short secrets and local/build flags',()=>{for(const changes of [{APP_URL:'http://plansaathi.example'},{BETTER_AUTH_URL:'https://other.example'},{BETTER_AUTH_SECRET:'short'},{OPS_TOKEN:'short'},{LOCAL_DEVELOPMENT:'true'},{APP_BUILD_ONLY:'1'},{SMTP_HOST:'mailpit'},{PLAN_STORAGE:'local'}])expect(configurationErrors({...valid,...changes}).length).toBeGreaterThan(0);});
});
