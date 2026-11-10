'use client';
import { useRef, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import { ErrorBox, Field, focusError } from './shared';
import { message, type Me, type Notify } from './api';

export default function MfaSettings({me,onRefresh,notify}:{me:Me;onRefresh:()=>void;notify:Notify}){
  const [password,setPassword]=useState(''),[code,setCode]=useState(''),[secret,setSecret]=useState(''),[codes,setCodes]=useState<string[]>([]),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[disable,setDisable]=useState(false);
  const form=useRef<HTMLFormElement>(null);const [errors,setErrors]=useState<Record<string,string>>({});
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return;const invalid:Record<string,string>={};if(secret&&!/^\d{6}$/.test(code.trim()))invalid.code='Enter the current six-digit authenticator code.';if(!secret&&!password)invalid.password='Enter your current password.';setErrors(invalid);if(Object.keys(invalid).length){focusError(form.current);return;}setBusy(true);setError('');
    try{
      if(secret){
        if(!saved)throw new Error('Save your recovery codes before continuing.');
        const result=await authClient.twoFactor.verifyTotp({code:code.trim()});if(result.error)throw new Error(result.error.message||'The code could not be verified.');
        setSecret('');setCodes([]);setCode('');onRefresh();notify('Authenticator enabled. Keep your recovery codes in a safe place.');
      }else if(disable){
        const result=await authClient.twoFactor.disable({password});if(result.error)throw new Error(result.error.message||'The authenticator could not be disabled.');
        setDisable(false);setPassword('');onRefresh();notify('Authenticator disabled. Administrator access requires it to be enabled again.');
      }else{
        const result=await authClient.twoFactor.enable({password});if(result.error)throw new Error(result.error.message||'Authenticator setup could not be started.');
        const data=result.data;if(!data||!('totpURI' in data)||!data.totpURI||!data.backupCodes)throw new Error('Authenticator setup was incomplete. Try again.');
        setSecret(new URL(data.totpURI).searchParams.get('secret')||'');setCodes(data.backupCodes);setPassword('');setSaved(false);
      }
    }catch(reason){setError(message(reason));}finally{setBusy(false);}
  }
  const enabled=me.user.mfaEnabled;
  return <section className="pf-surface pf-mfa" id="authenticator"><div className="pf-panel-heading"><ShieldCheck size={21}/><div><h2>Authenticator protection</h2><p>{enabled?'Your sign-in requires a password and a second factor.':me.user.role==='super_admin'?'Required before you can manage customer accounts.':'Add a second factor to protect your private projects.'}</p></div></div>
    {enabled&&!disable?<><p className="pf-status-badge positive">Authenticator enabled</p><p>Keep your recovery codes outside this account. Each code can be used once if you lose your authenticator.</p><button className="pf-button secondary" onClick={()=>{setDisable(true);setError('');}}>Disable authenticator…</button></>:<form noValidate ref={form} onSubmit={submit}>
      {secret?<><p>In your authenticator app, add an account with a setup key. Choose <strong>time based</strong>, and use this key:</p><code className="pf-mfa-secret">{secret}</code><h3>Save your recovery codes</h3><p>These codes are shown during setup only. Store them in your password manager or another safe place.</p><pre className="pf-recovery-codes">{codes.join('\n')}</pre><label className="pf-mfa-check"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I have saved my recovery codes.</label><Field label="Authenticator code" value={code} onChange={setCode} autoComplete="one-time-code" maxLength={6} error={errors.code} help="Enter the current six-digit code to finish setup." required/></>:<><p>{disable?'Disabling removes this extra sign-in protection. Administrator access will be locked until you enable it again.':'Use a time-based authenticator such as Google Authenticator, Microsoft Authenticator or a compatible password manager.'}</p><Field label="Current password" type="password" value={password} onChange={setPassword} autoComplete="current-password" maxLength={128} error={errors.password} required/></>}
      {error&&<ErrorBox error={error}/>}<div className="pf-mfa-actions"><button className={`pf-button ${disable?'danger':'primary'}`} disabled={busy||(!!secret&&!saved)} aria-busy={busy}>{busy?'Please wait…':secret?'Verify and enable':disable?'Disable authenticator':'Set up authenticator'}</button>{disable&&<button className="pf-button secondary" type="button" disabled={busy} onClick={()=>{setDisable(false);setPassword('');setError('');}}>Keep enabled</button>}</div>
    </form>}
  </section>;
}
