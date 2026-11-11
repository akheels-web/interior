'use client';
import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import {PLAN,estimateMonth,rupees} from './estimate';

const MAX=30;

/** Eases the shown amount towards `value`; jumps straight there under reduced motion. */
function useTween(value:number){
  const [shown,setShown]=useState(value),from=useRef(value);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){from.current=value;setShown(value);return;}
    const start=performance.now(),origin=from.current;let frame=0;
    const step=(now:number)=>{const t=Math.min(1,(now-start)/420),next=origin+(value-origin)*(1-(1-t)**3);from.current=next;setShown(next);if(t<1)frame=requestAnimationFrame(step);};
    frame=requestAnimationFrame(step);return()=>cancelAnimationFrame(frame);
  },[value]);
  return shown;
}

export default function PricingEstimator(){
  const id=useId(),[projects,setProjects]=useState(PLAN.included),month=estimateMonth(projects),total=useTween(month.total);
  const credits=PLAN.included+month.packs*PLAN.addonQuantity,plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
  return <div className="ps-estimate" style={{'--fill':`${(projects-1)/(MAX-1)*100}%`} as CSSProperties}>
    <div className="ps-estimate-head">
      <label htmlFor={id}>Busy month? New projects</label>
      <output htmlFor={id}>{projects}</output>
    </div>
    <input id={id} type="range" min={1} max={MAX} value={projects} onChange={event=>setProjects(Number(event.target.value))} aria-valuetext={`${plural(projects,'project')}, ${rupees(month.total)} this month`}/>
    <ol className="ps-credits" aria-hidden="true">{Array.from({length:credits},(_,index)=>
      <li key={index} data-extra={index>=PLAN.included||undefined} data-used={index<projects||undefined} style={{'--i':index-PLAN.included} as CSSProperties}/>)}
    </ol>
    <dl className="ps-estimate-lines">
      <div><dt>Studio plan, {PLAN.included} projects</dt><dd>{rupees(PLAN.monthlyPrice)}</dd></div>
      <div data-off={month.packs===0||undefined}><dt>{month.packs} × extra pack of {PLAN.addonQuantity}</dt><dd>{rupees(month.packs*PLAN.addonPrice)}</dd></div>
      <div className="ps-estimate-total"><dt>This month</dt><dd>{rupees(total)}</dd></div>
    </dl>
    <p className="ps-estimate-note">≈ {rupees(month.perProject)} per project{month.carried>0&&<> · {plural(month.carried,'unused extra credit')} carries forward</>}</p>
  </div>;
}
