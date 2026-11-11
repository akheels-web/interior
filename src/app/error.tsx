'use client';
import {useEffect} from 'react';

export default function Error({error,retry}:{error:unknown;retry:()=>void}){
  useEffect(()=>{console.error(error);},[error]);
  return <main className="studio-loading"><h1>Something went wrong.</h1><p>Your saved projects are safe. Try again, or return to your workspace.</p><button className="button primary" type="button" onClick={()=>retry()}>Try again</button><a href="/dashboard">Back to projects</a></main>;
}
