'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowDown,ArrowRight,ArrowUpRight,MousePointer2} from 'lucide-react';
import type {StudioScene} from '../scene';
import type {Finish,Item,Kind,Project,Room,Settings,WallTexture} from '../model';
import '../scene.css';
import './film.css';

// The landing "film": the studio's own renderer, driven by scroll position instead of the editor UI.
const chapters=[
  {at:0,name:'Welcome',number:'',title:'',text:''},
  {at:.10,name:'Plan',number:'01',title:'Every room starts as a plan.',text:'Upload a PDF or image, set the scale and trace your rooms. Or sketch them wall by wall, in metres or feet.'},
  {at:.28,name:'Walls',number:'02',title:'Then the walls go up.',text:'Outlines become an editable 3D room, with doors and windows exactly where your plan puts them.'},
  {at:.44,name:'Finishes',number:'03',title:'Lay the finishes.',text:'Floors, wall textures and accent walls change in a tap. Try an idea, keep it or move on.'},
  {at:.60,name:'Furniture',number:'04',title:'Furnish it to scale.',text:'Place furniture at its real dimensions, then set the shape, fabric, brand and price of each piece.'},
  {at:.78,name:'Light',number:'05',title:'Set the mood. Present.',text:'Take the room from daylight to evening while your client watches, then export the concept as a PDF.'},
  {at:.92,name:'Yours',number:'06',title:'Now it’s yours.',text:'This is the real studio renderer, not a video. Change it.'},
];
const sofas=[{name:'Cobalt',color:'#5264ba'},{name:'Caramel',color:'#b9825a'},{name:'Olive',color:'#71794f'}];
const floors:{id:Finish;name:string;swatch:string}[]=[{id:'herringbone',name:'Herringbone wood',swatch:'#b28d61'},{id:'marble',name:'White marble',swatch:'#eeedea'},{id:'terrazzo',name:'Terrazzo',swatch:'#dccfc0'},{id:'walnut',name:'Smoked walnut',swatch:'#6b4a35'}];
const moods=['Studio day','Golden hour','Evening lounge'];
type Look={floor:Finish;wallTexture:WallTexture;wallColor:string;accent:string|null;sofa:string};
type Override={floor?:Finish;sofa?:string;mood?:number};

const clamp01=(n:number)=>Math.min(1,Math.max(0,n)),lerp=(a:number,b:number,t:number)=>a+(b-a)*t,smooth=(t:number)=>t*t*(3-2*t);
const overshoot=(t:number)=>1+2.2*(t-1)**3+1.2*(t-1)**2;
/** Piecewise interpolation through [progress,value] keys with eased segments. */
function track(keys:[number,number][],p:number){
  if(p<=keys[0][0])return keys[0][1];
  for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){const [p0,v0]=keys[i-1],[p1,v1]=keys[i];return lerp(v0,v1,smooth((p-p0)/(p1-p0)));}
  return keys[keys.length-1][1];
}
const azimuth:[number,number][]=[[0,38],[.09,30],[.21,0],[.29,0],[.42,-34],[.60,-8],[.78,40],[.92,24],[1,34]];
const elevation:[number,number][]=[[0,21],[.09,24],[.21,89.4],[.29,89.4],[.42,33],[.60,41],[.78,25],[.92,12],[1,18]];
const distance:[number,number][]=[[0,12.9],[.09,13.4],[.42,15.6],[.60,15],[.78,13.4],[.92,10.9],[1,12.4]];
// 1 while the camera looks straight down at the plan.
const planView:[number,number][]=[[.09,0],[.21,1],[.29,1],[.42,0]];
const targetY:[number,number][]=[[0,.9],[.09,.9],[.21,0],[.29,0],[.42,.8],[.60,.3],[.78,.8],[.92,1.05],[1,.95]];
const wallHeight:[number,number][]=[[0,3.4],[.10,3.4],[.205,-.02],[.29,-.02],[.425,3.4],[1,3.4]];
const light:[number,number][]=[[0,1],[.10,1],[.20,0],[.78,0],[.845,1],[.915,2],[1,2]];

function lookAt(p:number):Look{
  const sofa=p<.4?sofas[0].color:sofas[1].color;
  if(p<.47)return {floor:'herringbone',wallTexture:'paint',wallColor:'#f4f2f0',accent:null,sofa};
  if(p<.51)return {floor:'marble',wallTexture:'paint',wallColor:'#f4f2f0',accent:null,sofa};
  if(p<.555)return {floor:'terrazzo',wallTexture:'limewash',wallColor:'#ebe3d6',accent:null,sofa};
  return {floor:'walnut',wallTexture:'limewash',wallColor:'#ebe3d6',accent:'#2f4a4e',sofa};
}

export default function LiveFilm(){
  const section=useRef<HTMLElement>(null),host=useRef<HTMLDivElement>(null),override=useRef<Override>({});
  const [mode,setMode]=useState<'pending'|'live'|'static'>('pending'),[chapter,setChapter]=useState(0),[finish,setFinish]=useState(''),[picked,setPicked]=useState<Override>({}),[canOrbit,setCanOrbit]=useState(false);
  useEffect(()=>{
    const element=section.current,stage=host.current;
    if(!element||!stage)return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setMode('static');return;}
    let disposed=false,instance:StudioScene|null=null,frame=0,inView=true;
    const pointer={x:0,y:0,sx:0,sy:0};
    const move=(event:PointerEvent)=>{if(event.pointerType!=='mouse')return;pointer.x=event.clientX/window.innerWidth-.5;pointer.y=event.clientY/window.innerHeight-.5;};
    const observer=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;},{rootMargin:'120px'});observer.observe(element);
    window.addEventListener('pointermove',move,{passive:true});
    const fine=window.matchMedia('(pointer: fine)').matches;setCanOrbit(fine);
    Promise.all([import('../scene'),import('../model'),import('three')]).then(([renderer,model,T])=>{
      if(disposed)return;
      const base=model.createProject(),room:Room=base.rooms[0];
      const place=(kind:Kind,x:number,z:number,rotation=0,extra:Partial<Item>={}):Item=>({...model.createItem(kind,room),x,z,rotation,locked:true,...extra});
      const items:Item[]=[
        place('rug',.95,.35,0,{color:'#e2ded5'}),
        place('dining-table',-2.45,-.1,90),
        place('dining-chair',-3.15,-.55,90),place('dining-chair',-3.15,.35,90),place('dining-chair',-1.75,-.55,-90),place('dining-chair',-1.75,.35,-90),
        place('sofa',.95,1.95,180,{color:sofas[0].color,fabric:'boucle',sofaType:'l-right'}),
        place('coffee-table',.9,.2),
        place('armchair',2.95,-.35,-65,{color:'#c99473'}),
        place('side-table',2.9,1.85),
        place('tv-unit',1.7,-2.62),
        place('plant',-.2,-2.35),
        place('floor-lamp',-.95,2.1),
        place('pendant',-2.45,-.1),
      ];
      const order=new Map(items.map((item,index)=>[item.id,{index,y:item.y}]));
      const makeProject=(look:Look):Project=>({...base,name:'The living edit',client:'',rooms:[{...room,floor:look.floor,wallTexture:look.wallTexture,wallColor:look.wallColor,accentWallEdge:look.accent?0:null,accentWallColor:look.accent??undefined}],items:items.map(item=>item.kind==='sofa'?{...item,color:look.sofa}:item)});
      const settingsFor=(dimensions:boolean,lights:boolean):Settings=>({...model.defaultSettings,showDimensions:dimensions,showGrid:dimensions,airflow:false,electrical:false,lights,presenting:!dimensions,wholeHome:true,cutaway:true,motion:'pause',daylight:75,mood:'studio'});
      try{
        instance=new renderer.StudioScene(stage,{onSelect:()=>{},onMove:()=>{},onError:()=>setMode('static')});
      }catch{setMode('static');return;}
      const scene=instance;scene.scene.background=null;scene.scene.fog=null;
      const canvas=scene.renderer.domElement;canvas.tabIndex=-1;canvas.setAttribute('aria-hidden','true');
      scene.controls.enableZoom=false;scene.controls.enablePan=false;
      let userOrbit=false;scene.controls.addEventListener('start',()=>{userOrbit=true;});
      const looks=[
        {sun:new T.Color('#fff3df'),ambient:new T.Color('#f9fcfa'),position:new T.Vector3(-3,10,5),sunPower:2.8,ambientPower:1.4,background:new T.Color('#eef0f8')},
        {sun:new T.Color('#ffd29d'),ambient:new T.Color('#ffeacc'),position:new T.Vector3(-8,6,7),sunPower:3.05,ambientPower:1.25,background:new T.Color('#f6eee3')},
        {sun:new T.Color('#8fa9d6'),ambient:new T.Color('#b9c4dc'),position:new T.Vector3(-4,8,4),sunPower:.6,ambientPower:.66,background:new T.Color('#12152b')},
      ];
      const background=new T.Color(),offset=new T.Vector3();
      let lookKey='',project=makeProject(lookAt(0)),settingsKey='',settings=settingsFor(false,false);
      let progress=-1,lighting=1,last=performance.now(),size='',currentChapter=-1,currentFinish='',night=false;
      const root=element.closest('.ps-landing');
      const tick=(now:number)=>{
        if(disposed)return;frame=requestAnimationFrame(tick);
        const dt=Math.min(.05,(now-last)/1000);last=now;
        if(!inView||document.hidden)return;
        const rect=element.getBoundingClientRect(),travel=rect.height-window.innerHeight,raw=travel>0?clamp01(-rect.top/travel):0;
        progress=progress<0?raw:progress+(raw-progress)*(1-Math.exp(-dt*7));
        const p=progress,ending=p>=.9,chosen=ending?override.current:{};
        if(!ending)userOrbit=false;

        const look={...lookAt(p),...(chosen.floor?{floor:chosen.floor}:{}),...(chosen.sofa?{sofa:chosen.sofa}:{})};
        const nextLook=Object.values(look).join('|');
        if(nextLook!==lookKey){lookKey=nextLook;project=makeProject(look);}
        lighting+=((chosen.mood??track(light,p))-lighting)*(1-Math.exp(-dt*(chosen.mood===undefined?30:4)));
        const dimensions=p>.165&&p<.335,lamps=lighting>1.42,nextSettings=`${dimensions}${lamps}`;
        if(nextSettings!==settingsKey){settingsKey=nextSettings;settings=settingsFor(dimensions,lamps);}
        scene.update(project,settings,null);
        scene.setCutawayHeight(track(wallHeight,p));

        // update() resets the lights to a preset mood; blend between presets here for a continuous dusk.
        const from=looks[Math.min(1,Math.floor(lighting))],to=looks[Math.min(2,Math.floor(lighting)+1)],mix=clamp01(lighting-Math.min(1,Math.floor(lighting)));
        scene.sun.color.lerpColors(from.sun,to.sun,mix);scene.ambient.color.lerpColors(from.ambient,to.ambient,mix);
        scene.sun.position.lerpVectors(from.position,to.position,mix);scene.sun.intensity=lerp(from.sunPower,to.sunPower,mix);scene.ambient.intensity=lerp(from.ambientPower,to.ambientPower,mix);
        background.lerpColors(from.background,to.background,mix);scene.renderer.setClearColor(background);
        element.style.setProperty('--film-bg',`#${background.getHexString()}`);element.style.setProperty('--night',clamp01(lighting-1).toFixed(3));
        const nowNight=lighting>1.5&&rect.bottom>120;if(nowNight!==night){night=nowNight;root?.classList.toggle('is-night',night);}

        for(const group of scene.root.children){
          const entry=order.get(group.userData.itemId);if(!entry)continue;
          const amount=p<.4?1-clamp01((p-.10-entry.index*.005)/.04):clamp01((p-.612-entry.index*.0108)/.036);
          group.visible=amount>.002;group.scale.setScalar(amount>=1?1:Math.max(.001,overshoot(amount)));group.position.y=entry.y+(1-amount)**2*1.5;
        }

        const width=stage.clientWidth,height=stage.clientHeight,aspect=width/Math.max(1,height),portrait=aspect<1,camera=scene.camera;
        if(camera instanceof T.PerspectiveCamera){
          const nextSize=`${width}x${height}`;
          if(nextSize!==size){size=nextSize;if(portrait)camera.setViewOffset(width,height,0,Math.round(height*.17),width,height);else camera.setViewOffset(width,height,-Math.round(width*.14),-Math.round(height*.02),width,height);}
        }
        scene.controls.enabled=ending&&fine;canvas.style.pointerEvents=ending&&fine?'auto':'none';
        if(!userOrbit){
          pointer.sx+=(pointer.x-pointer.sx)*(1-Math.exp(-dt*4));pointer.sy+=(pointer.y-pointer.sy)*(1-Math.exp(-dt*4));
          const planDistance=portrait?Math.max(14,7.9/(.669*aspect)):Math.max(14,11.4/(.669*aspect)),fit=Math.max(1,1.08/aspect);
          const top=track(planView,p);
          const reach=lerp(track(distance,p)*fit,planDistance,top);
          const sway=Math.sin(now/2600)*2.2*(1-top);
          const theta=(track(azimuth,p)+(portrait?top*90:0)+sway+pointer.sx*7*(1-top))*Math.PI/180,phi=Math.min(89.4,track(elevation,p)-pointer.sy*4*(1-top))*Math.PI/180;
          scene.controls.target.set(0,track(targetY,p),0);
          offset.set(Math.sin(theta)*Math.cos(phi),Math.sin(phi),Math.cos(theta)*Math.cos(phi)).multiplyScalar(reach);
          camera.position.copy(scene.controls.target).add(offset);camera.lookAt(scene.controls.target);
        }

        let index=0;for(let i=0;i<chapters.length;i++)if(p>=chapters[i].at-.012)index=i;
        if(index!==currentChapter){currentChapter=index;setChapter(index);}
        const label=p>.44&&p<.62?floors.find(option=>option.id===look.floor)?.name??'':'';
        if(label!==currentFinish){currentFinish=label;setFinish(label);}
      };
      frame=requestAnimationFrame(tick);setMode('live');
    }).catch(()=>setMode('static'));
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('pointermove',move);section.current?.closest('.ps-landing')?.classList.remove('is-night');instance?.dispose();};
  },[]);
  const choose=(next:Override)=>{override.current={...override.current,...next};setPicked(override.current);};
  const jump=(index:number)=>{
    const element=section.current;if(!element)return;
    const top=element.getBoundingClientRect().top+window.scrollY,travel=element.offsetHeight-window.innerHeight,next=chapters[index+1]?.at??1;
    window.scrollTo({top:top+travel*(index===0?0:lerp(chapters[index].at,next,.72)),behavior:'smooth'});
  };
  const live=mode==='live',active=chapters[chapter];
  return <section ref={section} className={`lf is-${mode}`} id="story" aria-labelledby="hero-title" data-chapter={chapter} style={{'--film-bg':'#f6eee3','--night':0} as CSSProperties}>
    <noscript><style>{'.lf.is-pending{height:100svh}'}</style></noscript>
    <div className="lf-sticky">
      <div className="lf-stage">
        <picture><source media="(max-width: 800px)" srcSet="/brand/landing-hero-portrait.jpg"/><img className="lf-poster" src="/brand/landing-hero.jpg" width="1600" height="1000" decoding="async" alt="A living and dining room designed in PlanSaathi: cobalt sectional sofa, herringbone floor, dining table and pendant light, in warm evening sun." fetchPriority="high"/></picture>
        <div className="lf-canvas" ref={host}/>
        <div className="lf-scrim" aria-hidden="true"/>
      </div>
      <div className="lf-overlay ps-container">
        <div className="lf-hero" data-active={chapter===0}>
          <p className="ps-eyebrow"><span className="ps-signal" aria-hidden="true"/>3D concept studio for interior designers</p>
          <h1 id="hero-title">From floor plan <span>to a room they can feel.</span></h1>
          <p className="lf-lede">Shape editable 3D rooms, explore materials and light, and help clients see what you see.</p>
          <div className="lf-actions">
            <a className="ps-button" href="/register">Create your workspace<ArrowRight size={18} aria-hidden="true"/></a>
            <a className="ps-text-link" href="/demo">Open the demo studio<ArrowUpRight size={16} aria-hidden="true"/></a>
          </div>
        </div>
        <div className="lf-chapters">{chapters.slice(1).map((item,offset)=>{
          const index=offset+1,last=index===chapters.length-1;
          return <div key={item.number} className="lf-chapter" data-active={live&&chapter===index} aria-hidden={live&&chapter!==index?true:undefined}>
            <p className="lf-count"><span>{item.number}</span> / 0{chapters.length-1}</p>
            <h2>{item.title}</h2>
            <p className="lf-lede">{item.text}</p>
            {index===3&&<p className="lf-finish" aria-live="polite">{finish&&<><span aria-hidden="true"/>Floor: {finish}</>}</p>}
            {last&&<div className="lf-explore">
              <fieldset><legend>Sofa</legend>{sofas.map((option,i)=><button key={option.name} type="button" className="lf-swatch" aria-label={`${option.name} sofa`} aria-pressed={(picked.sofa??sofas[1].color)===option.color} style={{backgroundColor:option.color}} tabIndex={chapter===index?0:-1} onClick={()=>choose({sofa:sofas[i].color})}/>)}</fieldset>
              <fieldset><legend>Floor</legend>{floors.map(option=><button key={option.id} type="button" className="lf-swatch" aria-label={option.name} title={option.name} aria-pressed={(picked.floor??'walnut')===option.id} style={{backgroundColor:option.swatch}} tabIndex={chapter===index?0:-1} onClick={()=>choose({floor:option.id})}/>)}</fieldset>
              <fieldset><legend>Light</legend>{moods.map((name,i)=><button key={name} type="button" className="lf-chip" aria-pressed={(picked.mood??2)===i} tabIndex={chapter===index?0:-1} onClick={()=>choose({mood:i})}>{name}</button>)}</fieldset>
              {canOrbit&&<p className="lf-drag"><MousePointer2 size={14} aria-hidden="true"/>Drag the room to look around</p>}
              <div className="lf-actions"><a className="ps-button" href="/register" tabIndex={chapter===index?0:-1}>Start your first room<ArrowRight size={18} aria-hidden="true"/></a></div>
            </div>}
          </div>;
        })}</div>
      </div>
      <nav className="lf-rail" aria-label="Tour chapters">{chapters.map((item,index)=><button key={item.name} type="button" aria-current={chapter===index?'step':undefined} onClick={()=>jump(index)}><span>{item.name}</span><i aria-hidden="true"/></button>)}</nav>
      <p className="lf-cue" data-active={chapter===0} aria-hidden="true">Scroll to build the room<ArrowDown size={15}/></p>
      <span className="sr-only" role="status">{live&&active.title}</span>
    </div>
  </section>;
}
