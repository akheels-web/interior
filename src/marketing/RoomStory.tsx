'use client';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {ArrowRight} from 'lucide-react';

// Isometric projection of room coordinates (metres; y is up) into the 720×500 SVG stage.
const K=52,CX=360,CY=176,W=6,D=5,H=2.8;
type Point=[number,number,number];
const project=([x,y,z]:Point)=>[CX+(x-z)*K*.866,CY+(x+z)*K*.5-y*K];
const pts=(...points:Point[])=>points.map(point=>project(point).map(n=>n.toFixed(1)).join(',')).join(' ');
const line=(a:Point,b:Point)=>`M${project(a).map(n=>n.toFixed(1)).join(' ')}L${project(b).map(n=>n.toFixed(1)).join(' ')}`;

function Box({x,z,w,d,h,y=0,className}:{x:number;z:number;w:number;d:number;h:number;y?:number;className?:string}){
  return <g className={className}>
    <polygon className="ps-face-x" points={pts([x+w,y,z],[x+w,y,z+d],[x+w,y+h,z+d],[x+w,y+h,z])}/>
    <polygon className="ps-face-z" points={pts([x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d])}/>
    <polygon className="ps-face-top" points={pts([x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d])}/>
  </g>;
}

function Item({index,children,label}:{index:number;children:ReactNode;label:string}){
  return <g className="ps-story-item" style={{'--i':index} as CSSProperties} data-label={label}>{children}</g>;
}

const chapters=[
  {title:'Start with the plan',text:'Upload a PDF or image, set the scale and trace the rooms. Dimensions stay in the units you work in.'},
  {title:'Raise the walls',text:'Room outlines become editable 3D spaces, with doors and windows where your plan puts them.'},
  {title:'Lay the finishes',text:'Try herringbone oak, limewash or microcement. Swap a finish and the whole room responds.'},
  {title:'Furnish and style',text:'Place sofas, tables, lighting and decor with real dimensions, brands and specification notes.'},
  {title:'Set the mood',text:'Move to golden hour, warm the lamps and present the concept with confidence.'},
];
const palettes=[
  {name:'Cobalt',sofa:'#5264ba',accent:'#3c49eb',rug:'#e2ded5'},
  {name:'Olive',sofa:'#71794f',accent:'#a0613d',rug:'#e8e0cc'},
  {name:'Clay',sofa:'#bb775d',accent:'#2f5d62',rug:'#efe3d6'},
];
const planks=Array.from({length:13},(_,i)=>.38*(i+1)).filter(z=>z<D);

export default function RoomStory(){
  const section=useRef<HTMLElement>(null);
  const [chapter,setChapter]=useState(chapters.length-1),[palette,setPalette]=useState(0),[animated,setAnimated]=useState(false);
  useEffect(()=>{
    const element=section.current;if(!element)return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){element.style.setProperty('--p','1');return;}
    setAnimated(true);
    let frame=0;
    const measure=()=>{
      frame=0;const rect=element.getBoundingClientRect(),travel=rect.height-window.innerHeight;
      const progress=travel>0?Math.min(1,Math.max(0,-rect.top/travel)):1;
      element.style.setProperty('--p',progress.toFixed(4));
      setChapter(Math.min(chapters.length-1,Math.floor(progress*chapters.length)));
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    measure();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
  },[]);
  const jump=(index:number)=>{
    const element=section.current;if(!element)return;
    if(!animated){setChapter(index);return;}
    const top=element.getBoundingClientRect().top+window.scrollY,travel=element.offsetHeight-window.innerHeight;
    window.scrollTo({top:top+travel*(index+.6)/chapters.length,behavior:'smooth'});
  };
  const tilt=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(event.pointerType!=='mouse')return;
    const rect=event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--mx',((event.clientX-rect.left)/rect.width-.5).toFixed(3));
    event.currentTarget.style.setProperty('--my',((event.clientY-rect.top)/rect.height-.5).toFixed(3));
  };
  const resetTilt=(event:React.PointerEvent<HTMLDivElement>)=>{event.currentTarget.style.setProperty('--mx','0');event.currentTarget.style.setProperty('--my','0');};
  const colors=palettes[palette];
  return <section ref={section} className={`ps-story${animated?' is-animated':''}`} id="story" aria-labelledby="story-title" style={{'--sofa':colors.sofa,'--accent':colors.accent,'--rug':colors.rug} as CSSProperties}>
    <div className="ps-story-sticky">
      <div className="ps-story-inner ps-container">
        <div className="ps-story-copy">
          <p className="ps-eyebrow">Scroll to build a room</p>
          <h2 id="story-title">Watch an idea{' '}<br/>become a space.</h2>
          <ol className="ps-story-chapters">
            {chapters.map((item,index)=><li key={item.title} aria-current={index===chapter?'step':undefined}>
              <button type="button" onClick={()=>jump(index)}><span className="ps-story-index">0{index+1}</span>{item.title}</button>
              <p>{item.text}</p>
            </li>)}
          </ol>
          <a className="ps-button ps-story-cta" href="/register">Start your first room<ArrowRight size={18} aria-hidden="true"/></a>
        </div>
        <div className="ps-story-stage" onPointerMove={tilt} onPointerLeave={resetTilt}>
          <svg className="ps-story-room" viewBox="0 0 720 500" role="img" aria-label="Illustration of a living room assembling in stages: floor plan, walls, oak floor and limewash walls, furniture, then warm evening light.">
            <defs>
              <clipPath id="ps-story-above-floor"><polygon points={`0,0 720,0 720,${project([W,0,0])[1].toFixed(1)} ${pts([W,0,0],[0,0,0],[0,0,D])} 0,${project([0,0,D])[1].toFixed(1)}`}/></clipPath>
              <linearGradient id="ps-story-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfe0f5"/><stop offset="1" stopColor="#f6e7cf"/></linearGradient>
              <radialGradient id="ps-story-glow"><stop offset="0" stopColor="#ffd59a" stopOpacity=".85"/><stop offset="1" stopColor="#ffd59a" stopOpacity="0"/></radialGradient>
            </defs>

            <g className="ps-story-floor">
              <polygon className="ps-floor-slab" points={pts([0,0,D],[W,0,D],[W,-.16,D],[0,-.16,D])}/>
              <polygon className="ps-floor-slab ps-floor-slab-side" points={pts([W,0,0],[W,0,D],[W,-.16,D],[W,-.16,0])}/>
              <polygon className="ps-floor-base" points={pts([0,0,0],[W,0,0],[W,0,D],[0,0,D])}/>
              <g className="ps-floor-finish">
                <polygon points={pts([0,0,0],[W,0,0],[W,0,D],[0,0,D])}/>
                {planks.map((z,row)=><path key={z} d={`${line([0,0,z],[W,0,z])}${Array.from({length:4},(_,j)=>{const x=(j*1.6+(row%2)*.8)%W;return line([x,0,z-.38],[x,0,z]);}).join('')}`}/>)}
              </g>
              <g className="ps-plan-lines" fill="none">
                <path pathLength={1} d={`${line([0,0,0],[W,0,0])}${line([W,0,0],[W,0,D])}${line([W,0,D],[0,0,D])}${line([0,0,D],[0,0,0])}`}/>
                <path pathLength={1} className="ps-plan-dim" d={`${line([0,0,D+.45],[W,0,D+.45])}${line([0,0,D+.3],[0,0,D+.6])}${line([W,0,D+.3],[W,0,D+.6])}${line([W+.45,0,0],[W+.45,0,D])}${line([W+.3,0,0],[W+.6,0,0])}`}/>
              </g>
              <text className="ps-plan-label" transform={`translate(${project([W/2,0,D+.8]).join(',')}) rotate(30)`} textAnchor="middle">6.00 m</text>
              <text className="ps-plan-label" transform={`translate(${project([W+.8,0,D/2]).join(',')}) rotate(-30)`} textAnchor="middle">5.00 m</text>
            </g>

            <g clipPath="url(#ps-story-above-floor)">
              <g className="ps-story-walls">
                <polygon className="ps-wall ps-wall-left" points={pts([0,0,0],[0,0,D],[0,H,D],[0,H,0])}/>
                <polygon className="ps-wall ps-wall-back" points={pts([0,0,0],[W,0,0],[W,H,0],[0,H,0])}/>
                <g className="ps-wall-finish">
                  <polygon className="ps-wall-left" points={pts([0,0,0],[0,0,D],[0,H,D],[0,H,0])}/>
                  <polygon className="ps-wall-back" points={pts([0,0,0],[W,0,0],[W,H,0],[0,H,0])}/>
                </g>
                <polygon className="ps-wall-cap" points={pts([-.14,H,-.14],[W,H,-.14],[W,H,0],[0,H,0],[0,H,D],[-.14,H,D])}/>
                <polygon className="ps-wall-end" points={pts([W,0,-.14],[W,0,0],[W,H,0],[W,H,-.14])}/>
                <polygon className="ps-wall-end" points={pts([-.14,0,D],[0,0,D],[0,H,D],[-.14,H,D])}/>
                <polygon className="ps-window-glass" points={pts([3.2,.9,.01],[5.4,.9,.01],[5.4,2.25,.01],[3.2,2.25,.01])}/>
                <path className="ps-window-frame" d={`${line([3.2,.9,.01],[5.4,.9,.01])}${line([5.4,.9,.01],[5.4,2.25,.01])}${line([5.4,2.25,.01],[3.2,2.25,.01])}${line([3.2,2.25,.01],[3.2,.9,.01])}${line([4.3,.9,.01],[4.3,2.25,.01])}`}/>
                <polygon className="ps-door" points={pts([.01,0,3.5],[.01,0,4.4],[.01,2.1,4.4],[.01,2.1,3.5])}/>
                <circle className="ps-door-handle" cx={project([.01,1,3.62])[0]} cy={project([.01,1,3.62])[1]} r="2.4"/>
              </g>
            </g>

            <polygon className="ps-sunbeam" points={pts([2.7,0,.7],[4.9,0,.7],[3.9,0,2.9],[1.7,0,2.9])}/>

            <g className="ps-story-items">
              <Item index={0} label="rug"><polygon className="ps-rug" points={pts([1.4,.01,1.5],[4.5,.01,1.5],[4.5,.01,3.7],[1.4,.01,3.7])}/></Item>
              <Item index={1} label="sideboard"><Box className="ps-wood" x={0} z={1.1} w={.45} d={1.6} h={.7}/></Item>
              <Item index={2} label="art">
                <polygon className="ps-art-frame" points={pts([.02,1.2,1.25],[.02,1.2,2.55],[.02,2.15,2.55],[.02,2.15,1.25])}/>
                <polygon className="ps-art-block" points={pts([.03,1.32,1.4],[.03,1.32,1.95],[.03,2.03,1.95],[.03,2.03,1.4])}/>
                <circle className="ps-art-sun" cx={project([.03,1.7,2.22])[0]} cy={project([.03,1.7,2.22])[1]} r="10"/>
              </Item>
              <Item index={3} label="lamp">
                <Box className="ps-metal" x={.5} z={.5} w={.06} d={.06} h={1.48}/>
                <Box className="ps-shade" x={.3} z={.3} w={.46} d={.46} h={.32} y={1.45}/>
              </Item>
              <Item index={4} label="sofa">
                <g className="ps-sofa">
                  <Box x={1.55} z={.15} w={2.6} d={.28} h={.86}/>
                  <Box x={1.55} z={.15} w={.26} d={.92} h={.6}/>
                  <Box x={1.81} z={.43} w={2.08} d={.64} h={.44}/>
                  <Box className="ps-cushion" x={1.85} z={.45} w={1.0} d={.6} h={.06} y={.44}/>
                  <Box className="ps-cushion" x={2.87} z={.45} w={1.0} d={.6} h={.06} y={.44}/>
                  <Box x={3.89} z={.15} w={.26} d={.92} h={.6}/>
                </g>
              </Item>
              <Item index={5} label="plant">
                <Box className="ps-pot" x={5.25} z={.3} w={.42} d={.42} h={.48}/>
                {[[-.2,.95,-.05,26],[.18,1.05,.1,24],[0,1.3,0,28],[-.05,.85,.25,20]].map(([dx,y,dz,r])=>{const [cx,cy]=project([5.46+dx,y,.51+dz]);return <circle key={`${dx}${y}`} className="ps-leaf" cx={cx} cy={cy} r={r}/>;})}
              </Item>
              <Item index={6} label="table">
                <Box className="ps-wood" x={2.4} z={2.1} w={1.0} d={.55} h={.34}/>
                <Box className="ps-stone" x={2.25} z={2.0} w={1.3} d={.75} h={.06} y={.34}/>
              </Item>
              <Item index={7} label="armchair">
                <g className="ps-chair">
                  <Box x={4.65} z={2.0} w={.8} d={.8} h={.42}/>
                  <Box x={5.2} z={2.0} w={.25} d={.8} h={.85}/>
                </g>
              </Item>
              <Item index={8} label="pendant">
                <path className="ps-cord" d={line([2.9,H+.6,2.35],[2.9,1.95,2.35])}/>
                <ellipse className="ps-pendant" cx={project([2.9,1.9,2.35])[0]} cy={project([2.9,1.9,2.35])[1]} rx="22" ry="9"/>
              </Item>
            </g>

            <g className="ps-story-light" aria-hidden="true">
              <circle cx={project([.53,1.5,.53])[0]} cy={project([.53,1.5,.53])[1]} r="90" fill="url(#ps-story-glow)"/>
              <circle cx={project([2.9,1.75,2.35])[0]} cy={project([2.9,1.75,2.35])[1]} r="110" fill="url(#ps-story-glow)"/>
            </g>
          </svg>
          <fieldset className="ps-story-palette">
            <legend>Try a palette</legend>
            {palettes.map((option,index)=><button key={option.name} type="button" aria-pressed={index===palette} aria-label={`${option.name} palette`} style={{backgroundColor:option.sofa}} onClick={()=>setPalette(index)}/>)}
          </fieldset>
          <div className="ps-story-progress" aria-hidden="true"><span/></div>
        </div>
      </div>
    </div>
  </section>;
}
