'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {CATALOG,FABRIC_STYLES,FLOOR_FINISHES,SOFA_SHAPES,WALL_TEXTURES} from '../model';
import {Words} from './Words';

// The gallery shows the studio's own procedural textures; the flat colours are only the pre-paint placeholder.
const floorBase:Record<string,string>={oak:'#d2a777',walnut:'#6b4a35',stone:'#d9d2c3',concrete:'#b9b8b3',marble:'#f1f0ee',terrazzo:'#e3d6c8',ceramic:'#efe9dc',herringbone:'#c69a6a',slate:'#4a4d52',terracotta:'#c0724e',carpet:'#b7b0a6'};
const wallTint:Record<string,string>={paint:'#e9dfd0',limewash:'#ddd2c2',brick:'#cf9a7e',concrete:'#d4d4d0',['wood-panel']:'#dcb890',wainscoting:'#dfe4e6',['marble-cladding']:'#f3f1ee',wallpaper:'#cbd5c5'};
const tiles=[...FLOOR_FINISHES.map(finish=>({key:`floor-${finish.id}`,kind:'floor' as const,id:finish.id as string,name:finish.name,note:finish.note,color:floorBase[finish.id]??'#d8b68c'})),...WALL_TEXTURES.map(texture=>({key:`wall-${texture.value}`,kind:'wall' as const,id:texture.value as string,name:texture.name,note:texture.note,color:wallTint[texture.value]??'#e6e3dc'}))]
  // Interleave floors and walls so the row reads as one mixed sample tray.
  .map((tile,index,all)=>all[(index*7)%all.length]);
const categories=new Set(CATALOG.map(item=>item.category)).size;
const figures=[
  {value:CATALOG.length,label:'furniture pieces and fixtures',detail:`Across ${categories} categories, all at real dimensions.`},
  {value:tiles.length,label:'floor and wall finishes',detail:'The samples in this gallery, ready to apply.'},
  {value:SOFA_SHAPES.length*FABRIC_STYLES.length,label:'sofa combinations',detail:`${SOFA_SHAPES.length} shapes in ${FABRIC_STYLES.length} upholstery weaves, in any colour.`},
];

function CountUp({value}:{value:number}){
  const ref=useRef<HTMLSpanElement>(null),[shown,setShown]=useState(value);
  useEffect(()=>{
    const element=ref.current;if(!element||window.matchMedia('(prefers-reduced-motion: reduce)').matches||element.getBoundingClientRect().top<window.innerHeight)return;
    setShown(0);let frame=0;
    const observer=new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting)return;observer.disconnect();const start=performance.now();
      const step=(now:number)=>{const t=Math.min(1,(now-start)/1400);setShown(Math.round(value*(1-(1-t)**4)));if(t<1)frame=requestAnimationFrame(step);};
      frame=requestAnimationFrame(step);
    },{threshold:.5});
    observer.observe(element);return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[value]);
  return <span ref={ref}>{shown}</span>;
}

export default function MaterialBoard(){
  const section=useRef<HTMLElement>(null),[painted,setPainted]=useState(false);
  useEffect(()=>{
    const element=section.current;if(!element)return;let cancelled=false;
    const observer=new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting)return;observer.disconnect();
      Promise.all([import('../scene'),import('../sceneMaterials')]).then(([scene,materials])=>{
        if(cancelled)return;
        for(const tile of tiles){
          const slot=element.querySelector<HTMLElement>(`[data-tile="${tile.key}"]`);if(!slot)continue;
          const texture=tile.kind==='floor'?scene.floorTexture(tile.id):materials.surfaceTexture(tile.id),source=texture.image as HTMLCanvasElement;
          const canvas=document.createElement('canvas');canvas.width=canvas.height=768;const context=canvas.getContext('2d');
          if(context){
            // Tile the engine's repeating texture so it stays sharp at card size.
            for(let x=0;x<3;x++)for(let y=0;y<3;y++)context.drawImage(source,x*256,y*256,256,256);
            if(tile.kind==='wall'){context.globalCompositeOperation='multiply';context.fillStyle=tile.color;context.fillRect(0,0,768,768);}
            slot.replaceChildren(canvas);
          }
          texture.dispose();
        }
        setPainted(true);
      }).catch(()=>{});
    },{rootMargin:'800px'});
    observer.observe(element);return()=>{cancelled=true;observer.disconnect();};
  },[]);
  return <>
    <section ref={section} className={`mg${painted?' is-painted':''}`} id="features" aria-labelledby="features-title">
      <div className="mg-pin">
        <div className="mg-head ps-container">
          <div><p className="ps-eyebrow">The material library</p><h2 id="features-title" className="ps-words"><Words text="Every finish,"/> <em><Words text="already on the table." start={2}/></em></h2></div>
          <p>The studio’s own floors and wall finishes, drawn by the same engine that renders your rooms. Pick one and the whole space responds.</p>
        </div>
        <ul className="mg-track">{tiles.map((tile,index)=><li key={tile.key} className="mg-card">
          <div className="mg-sample" data-tile={tile.key} data-tilt style={{'--tone':tile.color} as CSSProperties}/>
          <div className="mg-meta"><span>{String(index+1).padStart(2,'0')}</span><h3>{tile.name}</h3><p>{tile.kind==='floor'?'Floor':'Wall'} · {tile.note}</p></div>
        </li>)}</ul>
        <p className="mg-foot ps-container" aria-hidden="true"><b className="mg-count">01</b><i/><span>{String(tiles.length).padStart(2,'0')} finishes</span></p>
      </div>
    </section>
    <div className="ps-figures-wrap"><div className="ps-container">
      <dl className="ps-figures">{figures.map(figure=><div key={figure.label} className="ps-reveal"><dt><CountUp value={figure.value}/></dt><dd><strong>{figure.label}</strong>{figure.detail}</dd></div>)}</dl>
    </div></div>
  </>;
}
