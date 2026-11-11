import {ArrowRight,ArrowUpRight} from 'lucide-react';
import {Words} from './Words';

// Photographs in public/landing are inspiration imagery (see SOURCES.md), never presented as product renders.
function HeroCopy({decorative=false}:{decorative?:boolean}){
  const Heading=decorative?'p':'h1',tab=decorative?-1:undefined;
  return <div className="hx-copy" aria-hidden={decorative||undefined}>
    <p className="hx-kicker"><span className="ps-signal" aria-hidden="true"/>3D concept studio for interior designers</p>
    <Heading className="hx-title" id={decorative?undefined:'hero-title'}><span className="hx-l1"><Words text="Rooms, before"/></span><em className="hx-l2"><Words text="they exist." start={2}/></em></Heading>
    <p className="hx-lede">PlanSaathi turns a floor plan into a 3D room you can furnish, light and present, so clients see the space before it is built.</p>
    <div className="hx-cta">
      <a className="ps-button" href="/register" data-magnetic tabIndex={tab}>Create your workspace<ArrowRight size={18} aria-hidden="true"/></a>
      <a className="ps-text-link" href="/demo" tabIndex={tab}>Open the demo studio<ArrowUpRight size={16} aria-hidden="true"/></a>
    </div>
    <p className="hx-scroll" aria-hidden="true">Scroll<i/></p>
  </div>;
}

/** Full-bleed photograph that closes into an arched frame as you scroll; the copy is drawn twice so it changes colour exactly at the frame edge. */
export function Hero(){
  return <section className="hx" data-pin aria-labelledby="hero-title">
    <div className="hx-pin">
      <HeroCopy/>
      <div className="hx-clip">
        <img src="/landing/hero.webp" srcSet="/landing/hero-sm.webp 1100w, /landing/hero.webp 2200w" sizes="100vw" width="2200" height="1160" alt="A warm, open living room with timber ceilings, a low sofa and floor-to-ceiling glass." fetchPriority="high"/>
        <div className="hx-shade" aria-hidden="true"/>
        <HeroCopy decorative/>
      </div>
    </div>
  </section>;
}

/** A small arched window that opens to fill the screen. */
export function Portal(){
  return <section className="pt" data-pin aria-labelledby="portal-title">
    <div className="pt-pin">
      <p className="pt-words" aria-hidden="true"><span>Step</span><em>inside.</em></p>
      <div className="pt-clip">
        <img src="/landing/portal.webp" srcSet="/landing/portal-sm.webp 1100w, /landing/portal.webp 2200w" sizes="100vw" width="2200" height="3300" loading="lazy" alt="A double-height living room at dusk, lit by warm lamps."/>
        <div className="pt-shade" aria-hidden="true"/>
      </div>
      <div className="pt-caption">
        <p className="ps-eyebrow">From the drawing to the feeling</p>
        <h2 id="portal-title">A plan tells them the size. <em>A room tells them the truth.</em></h2>
        <p>Keep scrolling. The next room is built live, in PlanSaathi’s own 3D engine.</p>
      </div>
    </div>
  </section>;
}

const looks=[
  ['Soft bohemian','Rattan pendants, layered rugs'],['Blush and cane','Curved chairs, woven wall art'],['Forest-green study','Deep walls, pale timber'],
  ['Sunlit loft','Tan leather, tall windows'],['Herringbone hallway','Timber ceiling, round mirror'],['Collected and layered','Persian rug, wall baskets'],
  ['Mustard accent','One chair, one statement'],['Warm Scandinavian','Arched mirror, patterned rug'],['Brick-wall loft','Mid-century seating, raw brick'],
];
/** Three columns of photographs drifting at different speeds behind a pinned title. */
export function Lookbook(){
  return <section className="gx" data-view aria-labelledby="lookbook-title">
    <div className="gx-title"><h2 id="lookbook-title">Any style. <em>Your signature.</em></h2></div>
    <div className="gx-cols ps-container">{[0,1,2].map(column=><div key={column} className="gx-col">{looks.slice(column*3,column*3+3).map(([name,note],row)=>{
      const index=column*3+row+1;
      return <figure key={name}>
        <div className="gx-frame ps-unveil"><img src={`/landing/look-${index}.webp`} width="1500" height="1000" loading="lazy" alt={`${name} interior: ${note.toLowerCase()}.`}/></div>
        <figcaption><span>{String(index).padStart(2,'0')}</span><strong>{name}</strong>{note}</figcaption>
      </figure>;
    })}</div>)}</div>
    <p className="gx-note ps-container">Photographs shown for inspiration. Rooms you build in PlanSaathi are editable 3D concepts, like the one above.</p>
  </section>;
}
