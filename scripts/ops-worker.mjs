// Run one copy beside the app. Only an internal HTTP token is needed; no database/payment secrets.
const origin=process.env.WORKER_APP_URL||'http://127.0.0.1:3000';
if(!process.env.OPS_TOKEN||process.env.OPS_TOKEN.length<48)throw new Error('OPS_TOKEN (at least 48 characters) is required.');
let stopping=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;});
while(!stopping){
  try{
    const response=await fetch(new URL('/api/ops/tick',origin),{method:'POST',headers:{Authorization:`Bearer ${process.env.OPS_TOKEN}`},signal:AbortSignal.timeout(240_000)});
    if(!response.ok)console.error('Operations tick failed',{status:response.status});
    else{const result=await response.json();if(result.failed)console.error('Billing jobs need retry',{failed:result.failed});}
  }catch{console.error('Operations tick unavailable');}
  if(!stopping)await new Promise(resolve=>setTimeout(resolve,10_000));
}
