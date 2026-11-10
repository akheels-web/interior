'use client';
import dynamic from 'next/dynamic';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {Project} from './model';
const Editor=dynamic(()=>import('./App'),{ssr:false,loading:()=> <div className="studio-loading" role="status">Opening your design studio…</div>});
export default function EditorPage({id}:{id:string}){
  const router=useRouter(),[data,setData]=useState<{document:Project;revision:number}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{const controller=new AbortController();setError('');setData(null);void fetch(`/api/projects/${encodeURIComponent(id)}`,{cache:'no-store',signal:controller.signal}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error??'This project could not be opened.');if(body.document?.id!==id)throw new Error('The returned project does not match this page.');if(!controller.signal.aborted)setData(body);}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'This project could not be opened.');});return()=>controller.abort();},[id,retry]);
  if(error)return <main className="studio-loading"><h1>This project needs attention.</h1><p role="alert">{error}</p><button className="button primary" onClick={()=>setRetry(n=>n+1)}>Try again</button><a href="/dashboard">Back to projects</a><a href="/login">Sign in again</a></main>;
  if(!data||data.document.id!==id)return <div className="studio-loading" role="status">Opening your private project…</div>;
  return <Editor key={id} initialProject={data.document} initialRevision={data.revision} onBack={()=>router.push('/dashboard')} onCreateProject={()=>router.push('/dashboard?create=1')}/>;
}
