import {Armchair,FileText,Lightbulb,Ruler,SwatchBook} from 'lucide-react';
import {CATALOG,CEILING_STYLES,FABRIC_STYLES,FLOOR_FINISHES,SOFA_SHAPES,WALL_TEXTURES} from '../model';
import {HOME_TEMPLATES} from '../templates';
import {CountUp,MoodPreview} from './FeatureWidgets';

// Counts and names come from the studio's own catalogue, so this section cannot drift from the product.
const categories=Array.from(new Set(CATALOG.map(item=>item.category)));
const floorColors:Record<string,string>={oak:'#d2a777',walnut:'#6b4a35',stone:'#d9d2c3',concrete:'#b9b8b3',marble:'#f1f0ee',terrazzo:'#e3d6c8',ceramic:'#efe9dc',herringbone:'#c69a6a',slate:'#4a4d52',terracotta:'#c0724e',carpet:'#b7b0a6'};
const card='group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-7 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_#171a2b12] motion-reduce:hover:translate-y-0 max-sm:p-5';
const label='flex items-center gap-2 text-xs font-semibold tracking-[.4px] text-primary';
const title='mt-4 text-2xl leading-[1.25] tracking-[-.8px]';
const copy='mt-2 text-base text-muted-foreground';
const figure='font-display text-5xl leading-none font-medium tracking-[-2.5px] text-foreground';

export default function Features(){
  return <section className="ps-container py-[100px] max-sm:py-14" id="features" aria-labelledby="features-title">
    <div className="ps-section-heading ps-reveal">
      <div><p className="ps-eyebrow">Everything a concept needs</p><h2 id="features-title">One studio.{' '}<br/>Every detail.</h2></div>
      <p>The catalogue, finishes and lighting your clients ask about are already in the room, ready to change in front of them.</p>
    </div>
    <div className="ps-reveal grid grid-cols-6 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
      <article className={`${card} col-span-3 max-lg:col-span-2 max-sm:col-span-1`}>
        <p className={label}><Armchair size={16} aria-hidden="true"/>Catalogue</p>
        <p className="mt-5 flex items-end gap-3"><CountUp value={CATALOG.length} className={figure}/><span className="pb-1 text-base text-muted-foreground">pieces across {categories.length} categories</span></p>
        <h3 className={title}>Furniture with real dimensions.</h3>
        <p className={copy}>Place sofas, tables, storage, lighting, appliances and fixtures at true scale, then set the brand, model and unit price for your schedule.</p>
        <ul className="m-0 mt-auto flex list-none flex-wrap gap-2 p-0 pt-6">{categories.map(name=><li key={name} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors duration-300 group-hover:border-primary/30 group-hover:text-foreground">{name}</li>)}</ul>
      </article>
      <article className={`${card} col-span-3 max-lg:col-span-2 max-sm:col-span-1`}>
        <p className={label}><Lightbulb size={16} aria-hidden="true"/>Presentation lighting</p>
        <h3 className={title}>Change the mood in one tap.</h3>
        <p className={`${copy} mb-5`}>Show the same room by day, at golden hour or in the evening while your client is watching.</p>
        <MoodPreview/>
      </article>
      <article className={`${card} col-span-2 max-lg:col-span-1`}>
        <p className={label}><SwatchBook size={16} aria-hidden="true"/>Finishes</p>
        <p className="mt-5 flex items-end gap-3"><CountUp value={FLOOR_FINISHES.length} className={figure}/><span className="pb-1 text-base text-muted-foreground">floor finishes</span></p>
        <ul className="m-0 mt-5 flex list-none flex-wrap gap-1.5 p-0" aria-label="Floor finishes">{FLOOR_FINISHES.map((finish,index)=><li key={finish.id} title={finish.name} style={{backgroundColor:floorColors[finish.id]??'#d8b68c',transitionDelay:`${index*25}ms`}} className="size-7 rounded-md border border-black/10 transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:group-hover:translate-y-0"><span className="sr-only">{finish.name}</span></li>)}</ul>
        <p className={`${copy} mt-auto pt-5`}>Plus {WALL_TEXTURES.length} wall textures and {CEILING_STYLES.length} ceiling styles, from limewash to a lit cove.</p>
      </article>
      <article className={`${card} col-span-2 max-lg:col-span-1`}>
        <p className={label}><Armchair size={16} aria-hidden="true"/>Seating</p>
        <p className="mt-5 flex items-end gap-3"><span className={figure}><CountUp value={SOFA_SHAPES.length}/><span className="mx-2 text-3xl text-muted-foreground">×</span><CountUp value={FABRIC_STYLES.length}/></span></p>
        <h3 className={title}>Sofa shapes and weaves.</h3>
        <p className={copy}>Switch between sectionals, curves and daybeds, then try bouclé, tufted or cane upholstery in any colour.</p>
      </article>
      <article className={`${card} col-span-2 max-lg:col-span-2 max-sm:col-span-1 border-primary bg-primary text-primary-foreground`}>
        <p className="flex items-center gap-2 text-xs font-semibold tracking-[.4px]"><FileText size={16} aria-hidden="true"/>Client handover</p>
        <h3 className={title}>A presentation PDF with the schedule attached.</h3>
        <p className="mt-2 text-base opacity-90">Export room views with an itemised material and furniture list, priced in ₹ from the unit prices you enter.</p>
        <p className="mt-auto flex items-center gap-2 pt-6 text-xs opacity-90"><Ruler size={15} aria-hidden="true"/>Metric and imperial units · {HOME_TEMPLATES.length} starter layouts</p>
      </article>
    </div>
  </section>;
}
