'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Project} from './model';
type State='saved'|'saving'|'error'|'conflict';
export function useCloudSave(project:Project,initialRevision:number){
  const [state,setState]=useState<State>('saved'),[error,setError]=useState('');
  const revision=useRef(initialRevision),latest=useRef(project),persisted=useRef(project),pending=useRef<Project|null>(null),inFlight=useRef(false),blocked=useRef(false),alive=useRef(true),timer=useRef<ReturnType<typeof setTimeout>|null>(null),abort=useRef<AbortController|null>(null);
  const fullSourceRequired=useRef(false);
  latest.current=project;
  const flush=useCallback(async()=>{
    if(inFlight.current||blocked.current||!pending.current)return;
    inFlight.current=true;const next=pending.current;pending.current=null;abort.current=new AbortController();
    try{
      const source=next.sourcePlan,savedSource=persisted.current.sourcePlan;
      const keepSourceImage=!!source&&!!savedSource&&!fullSourceRequired.current&&(['image','name','page','width','height'] as const).every(key=>source[key]===savedSource[key]);
      const outgoing=keepSourceImage?{...next,sourcePlan:{...next.sourcePlan!,image:''}}:next;
      const response=await fetch(`/api/projects/${encodeURIComponent(next.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:outgoing,revision:revision.current,keepSourceImage}),signal:AbortSignal.any([abort.current.signal,AbortSignal.timeout(30_000)])});
      const result=await response.json();
      if(!response.ok){pending.current=latest.current;blocked.current=true;if(alive.current){setState(response.status===409?'conflict':'error');setError(result.error??'The project could not be saved. Download a backup and retry.');}return;}
      if(!Number.isInteger(result.revision))throw new Error('The server did not confirm the saved revision.');
      revision.current=result.revision;persisted.current=next;fullSourceRequired.current=false;
      if(alive.current){setError('');setState(pending.current?'saving':'saved');}
    }catch(e){if(alive.current){pending.current=latest.current;blocked.current=true;setState('error');setError(e instanceof Error&&e.name!=='AbortError'?e.message:'The save was interrupted. Download a backup, then retry.');}}
    finally{inFlight.current=false;if(alive.current&&pending.current&&!blocked.current)void flush();}
  },[]);
  useEffect(()=>{if(persisted.current===project&&!inFlight.current){pending.current=null;if(timer.current)clearTimeout(timer.current);if(!blocked.current)setState('saved');return;}pending.current=project;if(blocked.current)return;setState('saving');if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>void flush(),900);return()=>{if(timer.current)clearTimeout(timer.current);};},[project,flush]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);abort.current?.abort();};},[]);
  const saveNow=useCallback(async(overwrite=false)=>{if(inFlight.current)return;if(overwrite){fullSourceRequired.current=true;try{const response=await fetch(`/api/projects/${encodeURIComponent(latest.current.id)}`,{cache:'no-store',signal:AbortSignal.timeout(30_000)});const result=await response.json();if(!response.ok)throw new Error(result.error??'The current server revision could not be read.');revision.current=result.revision;}catch(e){setError(e instanceof Error?e.message:'Could not check the current project.');return;}}blocked.current=false;pending.current=latest.current;setState('saving');await flush();},[flush]);
  const loadRemote=useCallback(async()=>{const response=await fetch(`/api/projects/${encodeURIComponent(latest.current.id)}`,{cache:'no-store',signal:AbortSignal.timeout(30_000)});const result=await response.json();if(!response.ok)throw new Error(result.error??'The latest project could not be loaded.');revision.current=result.revision;pending.current=null;persisted.current=result.document;blocked.current=false;setError('');setState('saved');return result.document as Project;},[]);
  return {state,error,saveNow,loadRemote};
}
