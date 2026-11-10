'use client';
import {useEffect,useState} from 'react';
import {Pause,Play,Wind} from 'lucide-react';
import type {Settings} from './model';
import {motionIsPlaying} from './airflow';

export default function AirflowControls({mode,windVisible,onChange}:{mode:Settings['motion'];windVisible:boolean;onChange:(mode:Settings['motion'])=>void}){
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{const preference=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(preference.matches);update();preference.addEventListener('change',update);return()=>preference.removeEventListener('change',update);},[]);
  const playing=motionIsPlaying(mode,reduced);
  return <div className="airflow-transport" role="group" aria-label="Airflow animation">
    <div className="airflow-transport-copy"><Wind size={19}/><div><strong>Wind & fan preview</strong><small role="status">{playing?(windVisible?'Live · illustrative airflow':'Fan motion · wind overlay hidden'):mode==='auto'&&reduced?'Reduced motion · choose Play to animate':'Paused · wind and fan motion stopped'}</small></div></div>
    <div className="airflow-transport-actions">
      <button type="button" aria-pressed={mode==='play'} onClick={()=>onChange('play')}><Play size={15}/>Play wind</button>
      <button type="button" aria-pressed={mode==='pause'} onClick={()=>onChange('pause')}><Pause size={15}/>Pause wind</button>
      <button type="button" title="Follow this device’s motion preference" aria-label="Use device motion setting" aria-pressed={mode==='auto'} onClick={()=>onChange('auto')}>Auto</button>
    </div>
  </div>;
}
