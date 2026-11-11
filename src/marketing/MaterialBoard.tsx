'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {CATALOG,FABRIC_STYLES,FLOOR_FINISHES,SOFA_SHAPES,WALL_TEXTURES} from '../model';

// The board shows the studio's own procedural textures; the flat colours are only the pre-paint placeholder.
const floorBase:Record<string,string>={oak:'#d2a777',walnut:'#6b4a35',stone:'#d9d2c3',concrete:'#b9b8b3',marble:'#f1f0ee',terrazzo:'#e3d6c8',ceramic:'#efe9dc',herringbone:'#c69a6a',slate:'#4a4d52',terracotta:'#c0724e',carpet:'#b7b0a6'};
const wallTint:Record<string,string>={paint:'#e9dfd0',limewash:'#ddd2c2',brick:'#cf9a7e',concrete:'#d4d4d0',['wood-panel']:'#dcb890',wainscoting:'#dfe4e6',['marble-cladding']:'#f3f1ee',wallpaper:'#cbd5c5'};
const ratios=['1 / 1','4 / 5','5 / 4','3 / 4'];
const tiles=[...FLOOR_FINISHES.map(finish=>({key:`floor-${finish.id}`,kind:'floor' as const,id:finish.id as string,name:finish.name,note:finish.note,color:floorBase[finish.id]??'#d8b68c'})),...WALL_TEXTURES.map(texture=>({key:`wall-${texture.value}`,kind:'wall' as const,id:texture.value as string,name:texture.name,note:texture.note,color:wallTint[texture.value]??'#e6e3dc'}))]
  // Interleave floors and walls so the board reads as one mixed sample tray.
  .map((tile,index,all)=>all[(index*7)%all.length]);
const categories=new Set(CATALOG.map(item=>item.category)).size;
const figures=[
  {value:CATALOG.length,label:'furniture pieces and fixtures',detail:`across ${categories} categories, all at real dimensions`},
  {value:tiles.length,label:'floor and wall finishes',detail:'the samples on this board, ready to apply'},
  {value:SOFA_SHAPES.length*FABRIC_STYLES.length,label:'sofa combinations',detail:`${SOFA_SHAPES.length} shapes in ${FABRIC_STYLES.length} upholstery weaves, any colour`},
];

function CountUp({value}:{value:number}){
  const ref=useRef<HTMLSpanElement>(null),[shown,setShown]=useState(value);
  useEffect(()=>{
    const element=ref.current;if(!element||window.matchMedia('(prefers-reduced-motion: reduce)').matches||element.getBoundingClientRect().top<window.innerHeight)return;
    setShown(0);let frame=0;
    const observer=new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting)return;observer.disconnect();const start=performance.now();
      const step=(now:number)=>{const t=Math.min(1,(now-start)/1100);setShown(Math.round(value*(1-(1-t)**3)));if(t<1)frame=requestAnimationFrame(step);};
      frame=requestAnimationFrame(step);
    },{threshold:.6});
    observer.observe(element);return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[value]);
  return <span ref={ref}>{shown}</span>;
}

export default function MaterialBoard(){
  const board=useRef<HTMLUListElement>(null),[painted,setPainted]=useState(false);
  useEffect(()=>{
    const element=board.current;if(!element)return;let cancelled=false;
    const observer=new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting)return;observer.disconnect();
      Promise.all([import('../scene'),import('../sceneMaterials')]).then(([scene,materials])=>{
        if(cancelled)return;
        for(const tile of tiles){
          const slot=element.querySelector<HTMLElement>(`[data-tile="${tile.key}"]`);if(!slot)continue;
          const texture=tile.kind==='floor'?scene.floorTexture(tile.id):materials.surfaceTexture(tile.id),source=texture.image as HTMLCanvasElement;
          const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const context=canvas.getContext('2d');
          if(context){
            context.drawImage(source,0,0,512,512);
            if(tile.kind==='wall'){context.globalCompositeOperation='multiply';context.fillStyle=tile.color;context.fillRect(0,0,512,512);}
            slot.replaceChildren(canvas);
          }
          texture.dispose();
        }
        setPainted(true);
      }).catch(()=>{});
    },{rootMargin:'600px'});
    observer.observe(element);return()=>{cancelled=true;observer.disconnect();};
  },[]);
  return <section className="mb ps-container" id="features" aria-labelledby="features-title">
    <div className="ps-section-heading ps-reveal">
      <div><p className="ps-eyebrow">The material board, built in</p><h2 id="features-title">Every finish,{' '}<br/>already on the table.</h2></div>
      <p>These are the studio’s own floor and wall finishes, drawn by the same engine that renders your rooms. Pick one and the whole space responds.</p>
    </div>
    <ul className={`mb-board${painted?' is-painted':''}`} ref={board}>{tiles.map((tile,index)=><li key={tile.key} className="ps-reveal" style={{transitionDelay:`${(index%5)*70}ms`}}>
      <div className="mb-sample" data-tile={tile.key} style={{backgroundColor:tile.color,aspectRatio:ratios[index%ratios.length]}}/>
      <p><strong>{tile.name}</strong><span>{tile.kind==='floor'?'Floor':'Wall'} · {tile.note}</span></p>
    </li>)}</ul>
    <dl className="mb-figures">{figures.map(figure=><div key={figure.label} className="ps-reveal"><dt><CountUp value={figure.value}/></dt><dd><strong>{figure.label}</strong>{figure.detail}</dd></div>)}</dl>
    <p className="mb-handover ps-reveal"><span>When the room is right, export a presentation PDF with an itemised material and furniture schedule, priced in ₹ from the unit prices you enter.</span><a className="ps-text-link" href="/demo">Try it in the demo studio<ArrowUpRight size={16} aria-hidden="true"/></a></p>
  </section>;
}
