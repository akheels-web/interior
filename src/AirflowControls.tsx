'use client';
import { Hint, HelpHint } from './components/ui/tooltip';
import {useEffect,useState} from 'react';
import {Pause,Play,Wind} from 'lucide-react';
import type {Settings} from './model';
import {motionIsPlaying} from './airflow';

export default function AirflowControls({mode,windVisible,onChange}:{mode:Settings['motion'];windVisible:boolean;onChange:(mode:Settings['motion'])=>void}){
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{const preference=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(preference.matches);update();preference.addEventListener('change',update);return()=>preference.removeEventListener('change',update);},[]);
  const playing=motionIsPlaying(mode,reduced);
  return <div className="airflow-transport" role="group" aria-label="Airflow animation">
    <div className="airflow-transport-copy"><Wind size={19}/><div><strong>Wind & fan preview</strong><small role="status">{playing?(windVisible?'Live · illustrative airflow':'Fan motion · wind overlay hidden'):mode==='auto'&&reduced?'Reduced motion · choose Play to animate':'Paused · wind and fan motion stopped'}</small></div><HelpHint label="An illustration for layout discussion only. It does not calculate cooling or real airflow."/></div>
    <div className="airflow-transport-actions">
      <Hint label="Animate the wind overlay and fan motion." side="bottom"><button type="button" aria-pressed={mode==='play'} onClick={()=>onChange('play')}><Play size={15}/>Play wind</button></Hint>
      <Hint label="Freeze all wind and fan motion." side="bottom"><button type="button" aria-pressed={mode==='pause'} onClick={()=>onChange('pause')}><Pause size={15}/>Pause wind</button></Hint>
      <Hint label="Follow this device’s reduced-motion setting." side="bottom"><button type="button" aria-label="Use device motion setting" aria-pressed={mode==='auto'} onClick={()=>onChange('auto')}>Auto</button></Hint>
    </div>
  </div>;
}
