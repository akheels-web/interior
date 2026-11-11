'use client';
import {useEffect,useRef} from 'react';

// Progressive enhancement: content stays visible without JS or with reduced motion.
export default function ScrollEffects(){
  const bar=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const root=bar.current?.closest<HTMLElement>('.ps-landing');if(!root)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let observer:IntersectionObserver|null=null;
    if(!reduced){
      // Elements already on screen at hydration skip the entrance so nothing flashes.
      root.querySelectorAll('.ps-reveal').forEach(element=>{if(element.getBoundingClientRect().top<window.innerHeight*.88)element.classList.add('is-visible');});
      root.classList.add('ps-motion');
      observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer?.unobserve(entry.target);}},{rootMargin:'0px 0px -12% 0px',threshold:.12});
      root.querySelectorAll('.ps-reveal:not(.is-visible)').forEach(element=>observer?.observe(element));
    }
    const dark=Array.from(root.querySelectorAll('.ps-band')),tracked=reduced?[]:Array.from(root.querySelectorAll<HTMLElement>('[data-progress]'));
    let frame=0;
    const update=()=>{
      frame=0;
      // Header state is not motion, so it also applies with reduced motion.
      root.classList.toggle('is-scrolled',window.scrollY>24);
      root.classList.toggle('is-over-dark',dark.some(element=>{const rect=element.getBoundingClientRect();return rect.top<=40&&rect.bottom>40;}));
      if(reduced)return;
      root.style.setProperty('--sy',String(Math.round(window.scrollY)));
      for(const element of tracked){const rect=element.getBoundingClientRect();if(rect.bottom<-200||rect.top>window.innerHeight+200)continue;element.style.setProperty('--wp',Math.min(1,Math.max(0,(window.innerHeight*.9-rect.top)/(window.innerHeight*.62+rect.height*.5))).toFixed(3));}
      const travel=document.documentElement.scrollHeight-window.innerHeight;bar.current?.style.setProperty('transform','scaleX('+(travel>0?Math.min(1,window.scrollY/travel):0)+')');
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
    return()=>{observer?.disconnect();cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);root.classList.remove('ps-motion','is-scrolled','is-over-dark');};
  },[]);
  return <div className="ps-scroll-progress" ref={bar} aria-hidden="true"/>;
}
