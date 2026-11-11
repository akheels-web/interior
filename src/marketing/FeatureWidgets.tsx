'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {cn} from '../lib/utils';

/** Counts up to `value` when scrolled into view. Server and reduced-motion output is the final number. */
export function CountUp({value,className}:{value:number;className?:string}){
  const ref=useRef<HTMLSpanElement>(null),[shown,setShown]=useState(value);
  useEffect(()=>{
    const element=ref.current;if(!element||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    if(element.getBoundingClientRect().top<window.innerHeight)return;
    setShown(0);let frame=0;
    const observer=new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting)return;observer.disconnect();const start=performance.now();
      const step=(now:number)=>{const t=Math.min(1,(now-start)/900);setShown(Math.round(value*(1-(1-t)**3)));if(t<1)frame=requestAnimationFrame(step);};
      frame=requestAnimationFrame(step);
    },{threshold:.6});
    observer.observe(element);return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[value]);
  return <span ref={ref} className={cn('tabular-nums',className)}>{shown}</span>;
}

const moods=[
  {name:'Studio day',sky:'#eaf1fb',wall:'#f4f5f9',floor:'#d8b68c',glow:0},
  {name:'Golden hour',sky:'#ffd9a8',wall:'#f8e6cf',floor:'#d9a66f',glow:.55},
  {name:'Evening lounge',sky:'#44506e',wall:'#8d93a8',floor:'#8a6f58',glow:1},
  {name:'Gallery crisp',sky:'#ffffff',wall:'#fbfbfc',floor:'#e0c7a6',glow:.1},
];
/** The four presentation lighting moods, previewed on a tiny room elevation. */
export function MoodPreview(){
  const [mood,setMood]=useState(1);const current=moods[mood];
  return <div style={{'--sky':current.sky,'--wall':current.wall,'--floor':current.floor,'--glow':current.glow} as CSSProperties}>
    <svg viewBox="0 0 320 150" className="block h-auto w-full rounded-lg [&_*]:transition-[fill,opacity] [&_*]:duration-500" role="img" aria-label={`Room preview in the ${current.name} lighting mood`}>
      <rect width="320" height="150" fill="var(--wall)"/>
      <rect x="196" y="22" width="92" height="66" rx="2" fill="var(--sky)" stroke="#fff" strokeWidth="4"/><path d="M242 22v66" stroke="#fff" strokeWidth="3"/>
      <rect y="118" width="320" height="32" fill="var(--floor)"/>
      <rect x="40" y="84" width="118" height="34" rx="6" fill="#5264ba"/><rect x="34" y="70" width="130" height="26" rx="8" fill="#6a7bd0"/>
      <path d="M100 0v34" stroke="#2c2f3a" strokeWidth="1.5"/><ellipse cx="100" cy="38" rx="16" ry="6" fill="#2c2f3a"/>
      <defs><radialGradient id="ps-mood-glow"><stop offset="0" stopColor="#ffd59a" stopOpacity=".9"/><stop offset="1" stopColor="#ffd59a" stopOpacity="0"/></radialGradient></defs><circle cx="100" cy="46" r="70" fill="url(#ps-mood-glow)" opacity="var(--glow)"/>
      <rect width="320" height="150" fill="#1b2140" opacity="calc(var(--glow)*var(--glow)*.28)"/>
    </svg>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Lighting mood">{moods.map((option,index)=><button key={option.name} type="button" aria-pressed={index===mood} onClick={()=>setMood(index)} onPointerEnter={event=>{if(event.pointerType==='mouse')setMood(index);}} className={cn('min-h-9 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200',index===mood?'border-primary bg-primary text-primary-foreground':'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground')}>{option.name}</button>)}</div>
  </div>;
}
