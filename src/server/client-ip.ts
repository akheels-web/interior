import { createHmac } from 'node:crypto';
// Behind deploy/Caddyfile, `header_up X-Real-IP {remote_host}` overwrites any client-supplied value, so it is trusted; X-Forwarded-For is never read. Without it (local dev) there is no IP bucket.
export function clientIpKey(headers:Headers):string|null{
  const raw=(headers.get('x-real-ip')||'').trim();
  if(!raw||raw.length>45||!/^[0-9a-f:.]+$/i.test(raw))return null;
  return createHmac('sha256',process.env.BETTER_AUTH_SECRET||'local-only').update('ip:'+raw.toLowerCase()).digest('hex');
}
