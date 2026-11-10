import {configurationErrors} from './runtime-config';
import {pollBillingProvider} from './billing-poll';
import { collectOrphanAssets } from './plan-assets';
import { timingSafeEqual } from 'node:crypto';
import { pool, HttpError } from './db';
import { drainBillingInbox, billingOperations } from './billing-inbox';

export function authorizeOperations(request:Request){
  const secret=process.env.OPS_TOKEN||'',provided=request.headers.get('authorization')||'';
  const expected=Buffer.from(`Bearer ${secret}`),actual=Buffer.from(provided);
  if(secret.length<48||expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new HttpError(401,'Operations authentication is required.');
}
export async function operationsTick(request:Request){
  authorizeOperations(request);const polling=await pollBillingProvider();const billing=await drainBillingInbox(3);
  // At most one small cleanup batch per hour. Multiple workers use the same atomic claim.
  const claimed=await pool.query("INSERT INTO operation_heartbeats(name,completed_at) VALUES('assets',now()) ON CONFLICT(name) DO UPDATE SET completed_at=now() WHERE operation_heartbeats.completed_at<now()-interval '1 hour' RETURNING name");
  if(claimed.rowCount)await collectOrphanAssets();return {...billing,failed:billing.failed+polling.failed};
}
export async function readiness(request:Request){
  authorizeOperations(request);await pool.query('SELECT 1');
  const billing=await billingOperations();
  const configuration=process.env.NODE_ENV==='production'&&process.env.LOCAL_DEVELOPMENT!=='true'?configurationErrors():[];
  const fresh=!!billing.heartbeat&&Date.now()-new Date(billing.heartbeat.completed_at).getTime()<300_000;return {ok:!configuration.length&&fresh&&!billing.queue.review&&!billing.ambiguousCheckouts&&!billing.pollErrors,billing,configuration};
}
