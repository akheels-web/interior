import { describe, expect, it } from 'vitest';
import { clientIpKey } from './client-ip';
describe('clientIpKey',()=>{
  it('hashes the proxy-set X-Real-IP and never exposes the raw address',()=>{const key=clientIpKey(new Headers({'x-real-ip':'203.0.113.9'}));expect(key).toMatch(/^[0-9a-f]{64}$/);expect(key).not.toContain('203');expect(clientIpKey(new Headers({'x-real-ip':'203.0.113.10'}))).not.toBe(key);});
  it('ignores X-Forwarded-For and malformed values',()=>{expect(clientIpKey(new Headers({'x-forwarded-for':'1.2.3.4'}))).toBeNull();expect(clientIpKey(new Headers({'x-real-ip':'1.2.3.4, evil'}))).toBeNull();expect(clientIpKey(new Headers())).toBeNull();});
  it('accepts IPv6',()=>{expect(clientIpKey(new Headers({'x-real-ip':'2001:db8::1'}))).not.toBeNull();});
});
