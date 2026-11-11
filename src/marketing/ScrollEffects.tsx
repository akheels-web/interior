'use client';
import {useEffect,useRef} from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import {setSmoothScroller} from './smoothScroll';

const clamp=(n:number,min=0,max=1)=>Math.min(max,Math.max(min,n));

// Progressive enhancement for the landing page. Without JS, or with reduced motion, the page is complete and static.
export default function ScrollEffects(){
  const bar=useRef<HTMLDivElement>(null),cursor=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const root=bar.current?.closest<HTMLElement>('.ps-landing'),ring=cursor.current;if(!root||!ring)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,fine=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const undo:(()=>void)[]=[];
    const listen=(target:EventTarget,type:string,handler:(event:any)=>void,options?:AddEventListenerOptions)=>{target.addEventListener(type,handler,options);undo.push(()=>target.removeEventListener(type,handler,options));};

    let lastY=window.scrollY;
    const header=()=>{
      const y=window.scrollY;root.classList.toggle('is-scrolled',y>24);
      // Hide the bar while reading down the page; bring it back on any upward scroll.
      if(Math.abs(y-lastY)>6){root.classList.toggle('is-nav-hidden',y>lastY&&y>window.innerHeight*.6);lastY=y;}
    };
    if(reduced){header();listen(window,'scroll',header,{passive:true});return()=>{undo.forEach(fn=>fn());root.classList.remove('is-scrolled','is-nav-hidden');};}

    // Reveals. Elements already on screen at hydration skip the entrance so nothing flashes.
    const revealed=root.querySelectorAll('.ps-reveal,.ps-words');
    revealed.forEach(element=>{if(element.getBoundingClientRect().top<window.innerHeight*.88)element.classList.add('is-visible');});
    root.classList.add('ps-motion');
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{rootMargin:'0px 0px -10% 0px',threshold:.15});
    revealed.forEach(element=>{if(!element.classList.contains('is-visible'))observer.observe(element);});
    undo.push(()=>observer.disconnect());

    const lenis=new Lenis({lerp:.1,anchors:true});
    setSmoothScroller(y=>lenis.scrollTo(y,{duration:1.5}));
    undo.push(()=>{setSmoothScroller(null);lenis.destroy();});

    // Pinned horizontal gallery: vertical scroll moves the track sideways on wide screens.
    const gallery=root.querySelector<HTMLElement>('.mg'),track=gallery?.querySelector<HTMLElement>('.mg-track'),count=gallery?.querySelector<HTMLElement>('.mg-count'),cards=track?.children.length??0;
    let travel=0;
    const measure=()=>{
      if(!gallery||!track)return;
      const pinned=window.innerWidth>900;gallery.toggleAttribute('data-pinned',pinned);track.style.transform='';
      travel=pinned?Math.max(0,track.scrollWidth-window.innerWidth):0;gallery.style.setProperty('--mg-travel',`${travel}px`);
    };
    measure();listen(window,'resize',measure);
    void document.fonts?.ready.then(measure);

    const tracked=Array.from(root.querySelectorAll<HTMLElement>('[data-progress]'));
    const pointer={x:-100,y:-100,cx:-100,cy:-100,seen:false};
    let frame=0,velocity=0,previousY=window.scrollY,shownCount='';
    const tick=(time:number)=>{
      frame=requestAnimationFrame(tick);lenis.raf(time);
      const y=window.scrollY;header();
      velocity+=(clamp((y-previousY)/50,-1,1)-velocity)*.12;previousY=y;
      root.style.setProperty('--sy',String(Math.round(y)));root.style.setProperty('--sv',Math.abs(velocity)<.002?'0':velocity.toFixed(3));
      for(const element of tracked){const rect=element.getBoundingClientRect();if(rect.bottom<-200||rect.top>window.innerHeight+200)continue;element.style.setProperty('--wp',clamp((window.innerHeight*.9-rect.top)/(window.innerHeight*.62+rect.height*.5)).toFixed(3));}
      if(gallery&&track&&travel>0){
        const progress=clamp(-gallery.getBoundingClientRect().top/travel);
        track.style.transform=`translate3d(${(-progress*travel).toFixed(1)}px,0,0)`;gallery.style.setProperty('--gp',progress.toFixed(4));
        const label=String(Math.min(cards,Math.round(progress*(cards-1))+1)).padStart(2,'0');if(count&&label!==shownCount){shownCount=label;count.textContent=label;}
      }
      const total=document.documentElement.scrollHeight-window.innerHeight;bar.current?.style.setProperty('transform',`scaleX(${total>0?clamp(y/total):0})`);
      if(pointer.seen){pointer.cx+=(pointer.x-pointer.cx)*.2;pointer.cy+=(pointer.y-pointer.cy)*.2;ring.style.transform=`translate3d(${pointer.cx.toFixed(1)}px,${pointer.cy.toFixed(1)}px,0)`;}
    };
    frame=requestAnimationFrame(tick);undo.push(()=>cancelAnimationFrame(frame));

    if(fine){
      let magnet:HTMLElement|null=null,tilted:HTMLElement|null=null;
      const label=ring.firstElementChild as HTMLElement;
      listen(window,'pointermove',(event:PointerEvent)=>{
        if(event.pointerType!=='mouse')return;
        if(!pointer.seen){pointer.seen=true;pointer.cx=event.clientX;pointer.cy=event.clientY;ring.classList.add('is-on');}
        pointer.x=event.clientX;pointer.y=event.clientY;
        const target=event.target instanceof Element?event.target:null;
        const named=target?.closest<HTMLElement>('[data-cursor]'),link=target?.closest('a,button,summary');
        const mode=named?.dataset.cursor?'label':link?'link':'';
        if(ring.dataset.mode!==mode)ring.dataset.mode=mode;
        const text=named?.dataset.cursor??'';if(label.textContent!==text)label.textContent=text;
        // Magnetic controls lean towards the pointer.
        const nextMagnet=target?.closest<HTMLElement>('[data-magnetic]')??null;
        if(magnet&&magnet!==nextMagnet)magnet.style.transform='';
        magnet=nextMagnet;
        if(magnet){const rect=magnet.getBoundingClientRect();magnet.style.transform=`translate(${((event.clientX-rect.left-rect.width/2)*.28).toFixed(1)}px,${((event.clientY-rect.top-rect.height/2)*.38).toFixed(1)}px)`;}
        // Cards and panels read the pointer position as --px/--py (0–1) for tilt and spotlight.
        const nextTilt=target?.closest<HTMLElement>('[data-tilt],[data-spot]')??null;
        if(tilted&&tilted!==nextTilt){tilted.style.removeProperty('--px');tilted.style.removeProperty('--py');}
        tilted=nextTilt;
        if(tilted){const rect=tilted.getBoundingClientRect();tilted.style.setProperty('--px',((event.clientX-rect.left)/rect.width).toFixed(3));tilted.style.setProperty('--py',((event.clientY-rect.top)/rect.height).toFixed(3));}
      },{passive:true});
      listen(document.documentElement,'pointerleave',()=>{ring.classList.remove('is-on');pointer.seen=false;if(magnet)magnet.style.transform='';});
    }
    return()=>{undo.forEach(fn=>fn());root.classList.remove('ps-motion','is-scrolled','is-nav-hidden');};
  },[]);
  return <>
    <div className="ps-scroll-progress" ref={bar} aria-hidden="true"/>
    <div className="ps-cursor" ref={cursor} aria-hidden="true"><span/></div>
  </>;
}
