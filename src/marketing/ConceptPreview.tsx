'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Box,Check,LoaderCircle,RotateCcw,X} from 'lucide-react';
import type {StudioScene} from '../scene';
import type {Project,Settings} from '../model';

const palettes=[{name:'Cobalt',color:'#5264ba'},{name:'Olive',color:'#71794f'},{name:'Clay',color:'#bb775d'}];
export default function ConceptPreview(){
  const host=useRef<HTMLDivElement>(null),scene=useRef<StudioScene|null>(null),project=useRef<Project|null>(null),settings=useRef<Settings|null>(null);
  const [active,setActive]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[palette,setPalette]=useState(0),[view,setView]=useState<'orbit'|'top'>('orbit');
  const [visible,setVisible]=useState(true);
  useEffect(()=>{if(!host.current)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'80px'});observer.observe(host.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{
    if(!active||!visible||!host.current){setReady(false);return;}
    let cancelled=false;let instance:StudioScene|null=null;
    setError('');setReady(false);
    const deadline=setTimeout(()=>{cancelled=true;setError('The preview took too long to open. Return to the preview and try again.');},15_000);
    Promise.all([import('../scene'),import('../model')]).then(([renderer,model])=>{
      if(cancelled||!host.current)return;
      try{
        const demo=model.createProject();demo.name='The living edit';demo.client='';
        demo.rooms[0]={...demo.rooms[0],wallColor:'#f4f2f0',floor:'herringbone',wallTexture:'paint'};
        demo.items=demo.items.filter(item=>!['ceiling-fan','pendant','ac','socket'].includes(item.kind)).map(item=>({...item,locked:true,...(item.kind==='sofa'?{color:palettes[0].color,fabric:'boucle' as const,sofaType:'l-right' as const}:{}),...(item.kind==='rug'?{color:'#e2ded5'}:{}),...(item.kind==='armchair'?{color:'#c99473'}:{})}));
        const art=model.createItem('wall-art',demo.rooms[0]);demo.items.push({...art,x:.1,z:-2.82,y:1.3,locked:true,width:1.5,height:1});
        project.current=demo;settings.current={...model.defaultSettings,showDimensions:false,showGrid:false,airflow:false,presenting:true,ghostWalls:true,motion:'pause'};
        instance=new renderer.StudioScene(host.current,{onSelect:()=>{},onMove:()=>{},onError:()=>setError('The 3D preview is unavailable on this device. You can still explore the workflow below.')});
        instance.scene.background=null;instance.renderer.setClearColor('#eef0f8');instance.renderer.domElement.setAttribute('aria-label','Example 3D living room. Drag to orbit; use the Plan, 3D and material buttons for keyboard control.');
        scene.current=instance;instance.update(demo,settings.current,null);instance.zoom(1);setReady(true);
      }catch{instance?.dispose();instance=null;scene.current=null;setError('The 3D preview is unavailable on this device. You can still explore the workflow below.');}finally{clearTimeout(deadline);}
    }).catch(()=>{clearTimeout(deadline);if(!cancelled)setError('The preview could not load. Try again when your connection is stable.');});
    return()=>{cancelled=true;clearTimeout(deadline);instance?.dispose();scene.current=null;project.current=null;settings.current=null;};
  },[active,visible]);
  useEffect(()=>{if(!ready||!scene.current||!project.current||!settings.current)return;project.current={...project.current,items:project.current.items.map(item=>item.kind==='sofa'?{...item,color:palettes[palette].color}:item)};settings.current={...settings.current,camera:view};scene.current.update(project.current,settings.current,null);},[palette,view,ready]);
  const start=()=>{if(error){setActive(false);setError('');}else setActive(true);};
  return <section className="ps-preview" id="demo" aria-label="Explore an example interior concept">
    <div className="ps-preview-bar"><span className="ps-preview-title"><Box size={16}/>The living edit<span className="ps-preview-tag">Example project</span></span><a href="/register">Create your own<ArrowUpRight size={16}/></a></div>
    <div className="ps-preview-stage">
      {!active&&<img className="ps-demo-poster" src="/brand/concept-preview.png" width="1120" height="500" alt="A living-room concept rendered in PlanSaathi with a cobalt sectional sofa, timber floor, lounge chair and wall art" fetchPriority="high"/>}
      <div className="ps-demo-canvas" ref={host}/>
      {!active&&<button className="ps-demo-start" onClick={start}><Box size={18}/>Explore in 3D<ArrowUpRight size={16}/></button>}
      {active&&!ready&&!error&&<div className="ps-preview-hint" role="status"><LoaderCircle size={18} className="pf-spinner"/>Opening the 3D example…</div>}
      {error&&<div className="ps-preview-hint" role="alert"><p>{error}</p><button onClick={()=>{setActive(false);setError('');}}>Back to preview</button></div>}
      {ready&&!error&&<span className="ps-preview-hint">Drag to look around</span>}
    </div>
    <div className="ps-preview-controls"><div className="ps-preview-views" role="group" aria-label="Example view"><button aria-pressed={view==='top'} disabled={!!error} onClick={()=>{setActive(true);setView('top');}}>Plan</button><button aria-pressed={view==='orbit'} disabled={!!error} onClick={()=>{setActive(true);setView('orbit');}}>3D</button></div><fieldset className="ps-preview-swatches"><legend>Sofa finish</legend>{palettes.map((option,index)=><button key={option.name} type="button" aria-label={`${option.name} sofa`} aria-pressed={index===palette} disabled={!!error} style={{backgroundColor:option.color}} onClick={()=>{setActive(true);setPalette(index);}}>{index===palette&&<Check size={14}/>}</button>)}</fieldset><button className="ps-preview-reset" aria-label="Reset example view" disabled={!ready||!!error} onClick={()=>{setPalette(0);setView('orbit');scene.current?.fit();}}><RotateCcw size={17}/></button>{active&&<button className="ps-preview-reset" aria-label="Close 3D preview" onClick={()=>{setActive(false);setPalette(0);setView('orbit');}}><X size={18}/></button>}</div>
    <p className="ps-preview-caption">A real PlanSaathi concept preview. Your original plan stays yours.</p>
  </section>;
}
