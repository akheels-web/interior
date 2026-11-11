'use client';
import {useEffect,useRef} from 'react';

// Progressive enhancement: content stays visible without JS or with reduced motion.
export default function ScrollEffects(){
  const bar=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const root=bar.current?.closest('.ps-landing');
    if(!root||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    // Elements already on screen at hydration skip the entrance so nothing flashes.
    root.querySelectorAll('.ps-reveal').forEach(element=>{if(element.getBoundingClientRect().top<window.innerHeight*.88)element.classList.add('is-visible');});
    root.classList.add('ps-motion');
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{rootMargin:'0px 0px -12% 0px',threshold:.12});
    root.querySelectorAll('.ps-reveal:not(.is-visible)').forEach(element=>observer.observe(element));
    let frame=0;
    const update=()=>{frame=0;const travel=document.documentElement.scrollHeight-window.innerHeight;bar.current?.style.setProperty('transform',`scaleX(${travel>0?Math.min(1,window.scrollY/travel):0})`);};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
    return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);root.classList.remove('ps-motion');};
  },[]);
  return <div className="ps-scroll-progress" ref={bar} aria-hidden="true"/>;
}
