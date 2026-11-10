import {describe,it,expect} from 'vitest';
import {safeNext} from './safe-next';
describe('Internal post-sign-in destination',()=>{it('rejects external and browser-normalized external destinations',()=>{for(const path of ['https://other.invalid','//other.invalid','/\\other.invalid','/\n/other.invalid','javascript:alert(1)'])expect(safeNext(path)).toBe('/dashboard');});it('keeps valid project and query destinations',()=>expect(safeNext('/profile?tab=devices#authenticator')).toBe('/profile?tab=devices#authenticator'));});
