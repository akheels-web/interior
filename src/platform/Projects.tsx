'use client';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Archive, ArrowDown, ArrowRight, Box, CirclePlus, FileUp, FolderOpen, LayoutTemplate, Layers3, PencilRuler, Plus, Presentation, RotateCcw, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Badge, Card, Progress, Skeleton } from '../components/ui/primitives';
import { HelpHint, Hint } from '../components/ui/tooltip';
import { Dialog } from '../ui';
import { HOME_TEMPLATES } from '../templates';
import { api, ApiError, date, message, type Me, type Notify, type ProjectSummary, type ProjectsResponse, useApi } from './api';
import { Empty, ErrorBox, Field, focusError, Pagination, PlanPreview, SearchField, useSearchQuery } from './shared';
import './templates.css';

type Template = (typeof HOME_TEMPLATES)[number];
type StartIntent = 'sketch'|'import'|'design';
const envelope = (template:Template) => `${template.widthFt} × ${template.depthFt} ft`;
const area = (template:Template) => `${(template.widthFt*template.depthFt).toLocaleString('en-IN')} sq ft`;
const category = (template:Template) => template.category==='room'?'Single room':`${template.bedrooms} BHK`;

function TemplatePlan({template,large=false}:{template:Template;large?:boolean}){
  const svgId=useId();
  const width=360,height=300,padding=36,scale=Math.min((width-padding*2)/template.widthFt,(height-padding*2)/template.depthFt);
  const left=(width-template.widthFt*scale)/2,top=(height-template.depthFt*scale)/2+8;
  return <svg className={`pf-template-plan ${large?'is-large':''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${svgId}-title ${svgId}-desc`}>
    <title id={`${svgId}-title`}>{template.name}, {envelope(template)}</title>
    <desc id={`${svgId}-desc`}>Editable concept layout with {template.rooms.map(room=>room.name).join(', ')}. Overall reference envelope, not a construction drawing.</desc>
    <g className="pf-template-dimension"><path d={`M${left} ${top-20}H${left+template.widthFt*scale}M${left} ${top-25}v10M${left+template.widthFt*scale} ${top-25}v10`}/><text x={width/2} y={top-28} textAnchor="middle">{template.widthFt} ft</text></g>
    {template.rooms.map((room,index)=>{
      const x=left+room.x*scale,y=top+room.z*scale,w=room.width*scale,h=room.depth*scale;
      const words=room.name.split(' '),lines=words.length>2?[words.slice(0,-1).join(' '),words.at(-1)!]:words;
      const narrow=w<54||h<36;
      return <g key={`${room.name}-${index}`} className={`pf-template-room role-${room.role}`}>
        <rect x={x} y={y} width={w} height={h}/>
        {!narrow&&<text x={x+w/2} y={y+h/2-(lines.length>1?6:0)} textAnchor="middle">{lines.map((line,lineIndex)=><tspan key={lineIndex} x={x+w/2} dy={lineIndex?14:0}>{line}</tspan>)}</text>}
      </g>;
    })}
    <rect className="pf-template-envelope" x={left} y={top} width={template.widthFt*scale} height={template.depthFt*scale}/>
    <g className="pf-template-dimension"><text x={left+template.widthFt*scale+20} y={top+template.depthFt*scale/2} textAnchor="middle" transform={`rotate(90 ${left+template.widthFt*scale+20} ${top+template.depthFt*scale/2})`}>{template.depthFt} ft</text></g>
  </svg>;
}

const startCard='group flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-5 text-left text-foreground no-underline transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_12px_28px_#171a2b12] disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0';
const startIcon='flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-disabled:group-hover:bg-secondary group-disabled:group-hover:text-primary';
const startArrow='shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none';
const firstSteps=[
  {icon:PencilRuler,title:'Set out the space',text:'Sketch rooms, trace an uploaded plan or open a ready layout.'},
  {icon:Box,title:'Design it in 3D',text:'Place furniture, then try floors, wall finishes, lighting and colours.'},
  {icon:Presentation,title:'Present and export',text:'Walk clients through the room and export a PDF with the material schedule.'},
];
function FirstRun({canCreate,onCreate}:{canCreate:boolean;onCreate:()=>void}){
  return <Card className="p-8 max-sm:p-5">
    <h3 className="text-2xl font-medium tracking-[-.8px]">Your first space is waiting.</h3>
    <p className="mt-2 max-w-[520px] text-base text-muted-foreground">Three steps take you from a plan to a concept your client can see.</p>
    <ol className="m-0 mt-6 grid list-none grid-cols-3 gap-4 p-0 max-lg:grid-cols-1">{firstSteps.map((step,index)=><li key={step.title} className="flex gap-4 rounded-lg bg-muted p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-[0_1px_2px_#171a2b14]"><step.icon size={19}/></span><span><strong className="block text-base font-semibold"><span className="mr-2 text-xs font-medium text-muted-foreground tabular-nums">0{index+1}</span>{step.title}</strong><span className="mt-1 block text-sm text-muted-foreground">{step.text}</span></span></li>)}</ol>
    <div className="mt-6 flex flex-wrap items-center gap-3">{canCreate?<button className="pf-button primary" onClick={onCreate}><Plus size={17}/>Create your first project</button>:<a className="pf-button primary" href="/billing">Choose a plan<ArrowRight size={17}/></a>}<a className="pf-button secondary" href="/demo"><Sparkles size={17}/>Try the demo first</a></div>
  </Card>;
}

export default function Projects({me,onRefresh,notify}:{me:Me;onRefresh:()=>void;notify:Notify}){
  const search=useSearchQuery();
  const result=useApi<ProjectsResponse>(search.ready?`/api/projects?search=${encodeURIComponent(search.query)}&page=${search.page}`:null);
  const [creating,setCreating]=useState(false),[createOpen,setCreateOpen]=useState(false),[name,setName]=useState('');
  const [template,setTemplate]=useState('blank'),[furnished,setFurnished]=useState(true),[intent,setIntent]=useState<StartIntent>('sketch');
  const [createError,setCreateError]=useState(''),[nameError,setNameError]=useState(''),[locked,setLocked]=useState(false);
  const requestKey=useRef(''),form=useRef<HTMLFormElement>(null),createVisible=useRef(false);
  const [archive,setArchive]=useState<ProjectSummary|null>(null),[archiveBusy,setArchiveBusy]=useState(false),[archiveError,setArchiveError]=useState('');
  const [preview,setPreview]=useState<Template|null>(null),[templateSearch,setTemplateSearch]=useState(''),[kind,setKind]=useState('home'),[bedrooms,setBedrooms]=useState('all'),[size,setSize]=useState('all');
  const selectedTemplate=HOME_TEMPLATES.find(candidate=>candidate.id===template);
  const frozen=creating||locked,blocked=!me.billing.canCreate&&!locked;
  const hour=new Date().getHours(),greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening',firstName=me.user.name.trim().split(/\s+/)[0]||'there';
  const shownTemplates=useMemo(()=>HOME_TEMPLATES.filter(candidate=>{
    const searchable=`${candidate.name} ${candidate.description} ${candidate.widthFt}x${candidate.depthFt} ${candidate.widthFt} ${candidate.depthFt} ${category(candidate)}`.toLowerCase();
    return (kind==='all'||candidate.category===kind)&&(bedrooms==='all'||(candidate.category==='home'&&String(candidate.bedrooms)===bedrooms))&&(size==='all'||`${candidate.widthFt}x${candidate.depthFt}`===size)&&searchable.includes(templateSearch.trim().toLowerCase().replace(/×/g,'x'));
  }),[templateSearch,kind,bedrooms,size]);
  useEffect(()=>{if(result.data&&search.page>Math.max(1,result.data.pages))search.setPage(Math.max(1,result.data.pages));},[result.data,search.page]);
  useEffect(()=>{
    const url=new URL(window.location.href);
    if(url.searchParams.get('create')==='1'&&me.billing.canCreate){openCreate('blank','sketch');url.searchParams.delete('create');window.history.replaceState(null,'',url);}
  },[]);
  function openCreate(nextTemplate=template,nextIntent:StartIntent=intent){
    if(!frozen){
      requestKey.current=crypto.randomUUID();setTemplate(nextTemplate);setIntent(nextTemplate==='blank'?nextIntent:'design');
      setFurnished(nextTemplate!=='blank');setName(HOME_TEMPLATES.find(candidate=>candidate.id===nextTemplate)?.name??'');setCreateError('');
    }
    if(!requestKey.current)requestKey.current=crypto.randomUUID();
    createVisible.current=true;setCreateOpen(true);setNameError('');
  }
  function closeCreate(){createVisible.current=false;setCreateOpen(false);}
  async function create(event:FormEvent){
    event.preventDefault();if(creating)return;setCreateError('');
    if(!name.trim()){setNameError('Enter a project name.');focusError(form.current);return;}
    setNameError('');setCreating(true);
    const destination=intent;
    try{
      const next=await api<{id:string}>('/api/projects',{method:'POST',headers:{'Idempotency-Key':requestKey.current},body:JSON.stringify({name:name.trim(),template,furnished:template==='blank'?false:furnished})});
      requestKey.current='';setLocked(false);setCreateOpen(false);setName('');onRefresh();result.refresh();
      if(createVisible.current)window.location.assign(`/studio/${encodeURIComponent(next.id)}${destination==='design'?'':`?${destination}=1`}`);
      else notify('Project created. It is ready in your project list.');
    }catch(error){
      setCreateError(message(error));if(!(error instanceof ApiError)||error.status===0||error.status>=500)setLocked(true);
      onRefresh();result.refresh();
    }finally{setCreating(false);}
  }
  async function archiveProject(){
    if(!archive||archiveBusy)return;setArchiveBusy(true);setArchiveError('');
    try{await api(`/api/projects/${encodeURIComponent(archive.id)}/archive`,{method:'POST',body:JSON.stringify({archived:!archive.archived})});notify(archive.archived?'Project restored.':'Project archived. Its document is preserved.');setArchive(null);result.refresh();onRefresh();}
    catch(error){setArchiveError(message(error));}finally{setArchiveBusy(false);}
  }
  function clearTemplateFilters(){setTemplateSearch('');setKind('all');setBedrooms('all');setSize('all');}
  return <>
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="min-w-0">
        <span className="pf-eyebrow">YOUR DESIGN WORKSPACE</span>
        <h1 className="mt-3 text-[34px] leading-[1.15] font-medium tracking-[-1.4px] max-sm:text-[28px]">{greeting}, {firstName}<span className="text-primary">.</span></h1>
        <p className="mt-2 text-base text-muted-foreground">{me.billing.canCreate?'Pick up a project, or make room for a new idea.':'Your saved projects stay editable. Choose a plan to start new ones.'}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Hint label="Explore every studio tool in a sample room. Nothing is saved and no credit is used." side="bottom"><a className="pf-button secondary" href="/demo"><Sparkles size={17}/>Try the demo studio</a></Hint>
        <Hint label={blocked?'New projects need an active plan and one creation credit. Open Plan & billing to continue.':undefined} side="bottom"><span className="inline-flex" tabIndex={blocked?0:undefined}><button className="pf-button primary" onClick={()=>openCreate('blank','sketch')} disabled={blocked||creating}><Plus size={18}/>New project</button></span></Hint>
      </div>
    </header>

    <section aria-label="Plan overview" className="mb-10 grid grid-cols-3 gap-4 max-lg:grid-cols-1">
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-2"><Layers3 size={16} className="text-primary"/>Monthly projects</span><HelpHint title="About monthly projects" label="One credit creates one new project. Editing, presenting and exporting existing projects never uses a credit."/></div>
        <p className="font-display text-3xl font-medium tracking-[-1px] tabular-nums">{me.billing.monthlyRemaining}<span className="ml-1.5 font-sans text-sm font-normal tracking-normal text-muted-foreground">of {me.billing.monthlyLimit} left this cycle</span></p>
        <Progress value={me.billing.monthlyRemaining} max={Math.max(1,me.billing.monthlyLimit)} aria-label={`${me.billing.monthlyRemaining} of ${me.billing.monthlyLimit} monthly projects remaining`}/>
        <p className="text-xs text-muted-foreground">{me.billing.periodEnd?<>Current paid period ends {date(me.billing.periodEnd)}.</>:'A paid subscription is required to create projects.'}</p>
      </Card>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-2"><CirclePlus size={16} className="text-primary"/>Extra credits</span><HelpHint title="About extra credits" label="Top-up credits are used after your monthly allowance runs out. Unused extra credits carry forward."/></div>
        <p className="font-display text-3xl font-medium tracking-[-1px] tabular-nums">{me.billing.addonCredits}<span className="ml-1.5 font-sans text-sm font-normal tracking-normal text-muted-foreground">available</span></p>
        <p className="mt-auto text-xs text-muted-foreground">For busy months. Add more from Plan &amp; billing.</p>
      </Card>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-2"><ShieldCheck size={16} className="text-primary"/>Your plan</span><Badge variant={me.billing.canCreate?'default':'warning'}>{me.billing.canCreate?'Ready to create':'Creation paused'}</Badge></div>
        <p className="text-sm leading-[1.6] text-muted-foreground">Existing projects always stay editable, even when credits run out.</p>
        <a href="/billing" className="pf-button secondary mt-auto self-start">{me.billing.canCreate?'Manage plan':'View plans'}<ArrowRight size={16}/></a>
      </Card>
    </section>

    <section className="mb-12" aria-labelledby="start-title">
      <div className="pf-section-toolbar"><div><h2 id="start-title">Start something new</h2><p>Each new project uses one creation credit. Pick the way that suits your brief.</p></div>{locked&&<button className="pf-button secondary" onClick={()=>openCreate()}>Review pending creation<ArrowRight size={16}/></button>}</div>
      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        <Hint label="Draw rooms wall by wall with exact dimensions. Best when you have measurements but no drawing." side="bottom"><button type="button" className={startCard} onClick={()=>openCreate('blank','sketch')} disabled={creating||blocked}><span className={startIcon}><PencilRuler size={22}/></span><span className="min-w-0 flex-1"><strong className="block text-base font-semibold">Sketch from scratch</strong><small className="mt-1 block text-sm text-muted-foreground">Draw rooms directly. No file needed.</small></span><ArrowRight size={18} className={startArrow}/></button></Hint>
        <Hint label="Upload a PDF, PNG, JPEG or WebP, set the scale, then trace rooms over your plan." side="bottom"><button type="button" className={startCard} onClick={()=>openCreate('blank','import')} disabled={creating||blocked}><span className={startIcon}><FileUp size={22}/></span><span className="min-w-0 flex-1"><strong className="block text-base font-semibold">Bring your floor plan</strong><small className="mt-1 block text-sm text-muted-foreground">Import a PDF or image and trace it.</small></span><ArrowRight size={18} className={startArrow}/></button></Hint>
        <Hint label="Browse ready 1–3 BHK and single-room layouts. Previewing is free; every room stays editable." side="bottom"><a className={startCard} href="#layouts"><span className={startIcon}><LayoutTemplate size={22}/></span><span className="min-w-0 flex-1"><strong className="block text-base font-semibold">Start from a layout</strong><small className="mt-1 block text-sm text-muted-foreground">{HOME_TEMPLATES.length} editable starter layouts.</small></span><ArrowDown size={18} className={startArrow}/></a></Hint>
      </div>
    </section>

    <section className="pf-projects-section mb-14"><div className="pf-section-toolbar"><div><h2>Design collection {result.data&&<span>{result.data.total}</span>}</h2><p>{search.query?'Search results':'Your private design collection'}</p></div><SearchField state={search} label="Search projects" placeholder="Search projects…"/></div>{result.error&&<ErrorBox error={result.error} retry={result.refresh}/>} {result.loading&&!result.data?<div className="pf-project-grid" role="status" aria-label="Loading your projects…">{[0,1,2].map(index=><div key={index} className="overflow-hidden rounded-xl border border-border bg-card"><Skeleton className="h-[190px] rounded-none"/><div className="flex flex-col gap-3 p-5"><Skeleton className="h-5 w-3/5"/><Skeleton className="h-3 w-2/5"/><Skeleton className="mt-3 h-3 w-4/5"/></div></div>)}</div>:result.data?.projects.length?<><div className={`pf-project-grid ${result.loading?'is-updating':''}`} aria-busy={result.loading}>{result.data.projects.map(project=><article className="pf-project-card" key={project.id}><a className="pf-project-preview-link" href={`/studio/${encodeURIComponent(project.id)}`} aria-label={`Open ${project.name}`}><PlanPreview project={project}/></a><div className="pf-project-body"><div className="pf-project-title"><a href={`/studio/${encodeURIComponent(project.id)}`}><h3>{project.name}</h3></a><Hint label={project.archived?'Restore this project to your active collection. No credit is used.':'Archive: keeps the design safe but marks it inactive. No credit is returned.'}><button type="button" className="pf-icon-button" aria-label={`${project.archived?'Restore':'Archive'} ${project.name}`} onClick={()=>{setArchiveError('');setArchive(project);}}>{project.archived?<RotateCcw size={17}/>:<Archive size={17}/>}</button></Hint></div><p className="pf-project-client">{project.client||'No client specified'}</p><div className="pf-project-metadata"><span><Layers3 size={13}/>{project.roomCount} {project.roomCount===1?'room':'rooms'}</span><span><Box size={13}/>{project.itemCount} objects</span>{project.archived&&<Badge variant="outline">Archived</Badge>}</div><div className="pf-project-bottom"><span>Updated {date(project.updatedAt)}</span><a href={`/studio/${encodeURIComponent(project.id)}`} aria-label={`Open ${project.name}`}><span>Open studio</span><ArrowRight size={17}/></a></div></div></article>)}</div><Pagination page={result.data.page} pages={result.data.pages} total={result.data.total} loading={result.loading} onPage={search.setPage}/></>:!result.error&&!result.loading?search.query?<Empty icon={<FolderOpen size={30}/>} title="No matching projects" action={<button className="pf-button secondary" onClick={search.clear}>Clear search</button>}>Try a different project or client name.</Empty>:<FirstRun canCreate={me.billing.canCreate} onCreate={()=>openCreate('blank','sketch')}/>:null}</section>

    <section className="pf-template-library scroll-mt-6" id="layouts" aria-labelledby="template-title">
      <div className="pf-section-toolbar"><div><span className="pf-eyebrow">A HEAD START</span><h2 id="template-title">Find a layout. Make it yours.</h2><p>Original, editable concepts in familiar Indian home sizes.</p></div><span className="pf-template-browse-note">Free to preview · 1 credit to create</span></div>
      <div className="pf-template-filters">
        <div className="pf-template-search"><Search size={17}/><label className="sr-only" htmlFor="template-search">Search starter layouts</label><input id="template-search" placeholder="Search layouts or dimensions" value={templateSearch} onChange={event=>setTemplateSearch(event.target.value)}/>{templateSearch&&<button type="button" aria-label="Clear layout search" onClick={()=>setTemplateSearch('')}><X size={16}/></button>}</div>
        <label><span>Layout</span><select value={kind} onChange={event=>{setKind(event.target.value);setBedrooms('all');setSize('all');}}><option value="all">All layouts</option><option value="home">Whole homes</option><option value="room">Single rooms</option></select></label>
        <label><span>Bedrooms</span><select value={bedrooms} onChange={event=>setBedrooms(event.target.value)} disabled={kind==='room'}><option value="all">Any BHK</option>{Array.from(new Set(HOME_TEMPLATES.filter(candidate=>candidate.category==='home').map(candidate=>candidate.bedrooms))).sort().map(count=><option key={count} value={count}>{count} BHK</option>)}</select></label>
        <label><span>Size in feet</span><select value={size} onChange={event=>setSize(event.target.value)}><option value="all">Any size</option>{Array.from(new Set(HOME_TEMPLATES.filter(candidate=>kind==='all'||candidate.category===kind).map(candidate=>`${candidate.widthFt}x${candidate.depthFt}`))).map(value=><option key={value} value={value}>{value.replace('x',' × ')} ft</option>)}</select></label>
      </div>
      <p className="pf-template-result-count" role="status">{shownTemplates.length} {shownTemplates.length===1?'layout':'layouts'}{templateSearch?' matching your search':''}</p>
      {shownTemplates.length?<div className="pf-template-grid">{shownTemplates.map(candidate=><article className="pf-template-card" key={candidate.id}>
        <button className="pf-template-image" type="button" onClick={()=>setPreview(candidate)} aria-label={`Preview ${candidate.name}, ${envelope(candidate)}`}><span className="pf-template-category">{category(candidate)}</span><TemplatePlan template={candidate}/><span className="pf-template-preview-label">Explore layout<ArrowRight size={16}/></span></button>
        <div className="pf-template-card-body"><div className="pf-template-card-title"><h3>{candidate.name}</h3><span>{envelope(candidate)}</span></div><p>{candidate.description}</p><div className="pf-template-card-footer"><span>{area(candidate)} envelope</span><button className="pf-button secondary" type="button" onClick={()=>setPreview(candidate)} aria-label={`View ${candidate.name}`}>View layout<ArrowRight size={16}/></button></div></div>
      </article>)}</div>:<Empty icon={<Search size={28}/>} title="No layouts match yet" action={<button className="pf-button secondary" onClick={clearTemplateFilters}>Clear layout filters</button>}>Try another size or bedroom count. You can always sketch your exact layout.</Empty>}
      <p className="pf-template-caveat">Dimensions describe the overall concept envelope. Edit to suit your space; setbacks, structure, ventilation and local approvals need a qualified professional’s review.</p>
    </section>

    <Dialog open={!!preview} onClose={()=>setPreview(null)} title={preview?.name??'Layout preview'} className="pf-layout-preview-dialog">
      {preview&&<><div className="pf-layout-preview-grid"><div className="pf-layout-preview-art"><TemplatePlan template={preview} large/></div><div className="pf-layout-preview-details"><span className="pf-eyebrow">{category(preview)} · EDITABLE CONCEPT</span><p>{preview.description}</p><dl><div><dt>Overall envelope</dt><dd>{envelope(preview)}</dd></div><div><dt>Reference area</dt><dd>{area(preview)}</dd></div><div><dt>Metric equivalent</dt><dd>{(preview.widthFt*.3048).toFixed(2)} × {(preview.depthFt*.3048).toFixed(2)} m</dd></div></dl><h3>Inside this layout</h3><ul>{preview.rooms.map((room,index)=><li key={`${room.name}-${index}`}><span>{room.name}</span><span>{room.width} × {room.depth} ft</span></li>)}</ul></div></div><p className="pf-template-caveat">Original concept, not a sanctioned building plan. All rooms, openings, finishes and furniture can be edited in your private project. Choose whether to include furniture in the next step.</p>{!me.billing.canCreate&&!locked&&<p className="pf-template-quota-note">You can browse every layout. Visit billing to enable project creation; existing projects remain editable.</p>}<div className="dialog-actions pf-template-dialog-actions"><button className="pf-button secondary" type="button" onClick={()=>setPreview(null)}>Keep browsing</button>{me.billing.canCreate||locked?<button className="pf-button primary" type="button" disabled={creating} onClick={()=>{const chosen=preview.id;setPreview(null);openCreate(chosen,'design');}}>{locked?'Review pending creation':'Use this template'}<ArrowRight size={16}/></button>:<a className="pf-button primary" href="/billing">View plans<ArrowRight size={16}/></a>}</div></>}
    </Dialog>

    <Dialog open={createOpen} onClose={closeCreate} title={locked?'Finish project creation':'A new space'} className="pf-create-template-dialog"><form noValidate ref={form} onSubmit={create}>
      <p className="pf-dialog-copy">Creating a project uses one creation credit. You can edit it anytime, even after your credits run out.</p>
      <Field label="Project name" value={name} onChange={setName} maxLength={120} placeholder="e.g. The Courtyard Residence" error={nameError} disabled={frozen} required/>
      <div className="pf-field"><label htmlFor="create-start-layout">Start with</label><select className="pf-template-select" id="create-start-layout" value={template} disabled={frozen} onChange={event=>{const next=event.target.value;setTemplate(next);setIntent(next==='blank'?'sketch':'design');setFurnished(next!=='blank');}}><option value="blank">Sketch / import an empty room</option><option value="sample">Furnished living room example</option>{HOME_TEMPLATES.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.name} · {envelope(candidate)}</option>)}</select></div>
      {selectedTemplate&&<div className="pf-selected-template"><TemplatePlan template={selectedTemplate}/><div><strong>{selectedTemplate.name}</strong><span>{envelope(selectedTemplate)} · {area(selectedTemplate)}</span><small>Editable concept envelope</small></div></div>}
      {template==='blank'?<fieldset className="pf-create-intent"><legend>Open the new project in</legend><Hint label="Opens the sketch editor so you can draw rooms wall by wall."><label><input type="radio" name="start-intent" checked={intent==='sketch'} onChange={()=>setIntent('sketch')} disabled={frozen}/><PencilRuler size={18}/><span>Direct sketch</span></label></Hint><Hint label="Opens plan import: upload a PDF or image, set its scale and trace your rooms."><label><input type="radio" name="start-intent" checked={intent==='import'} onChange={()=>setIntent('import')} disabled={frozen}/><FileUp size={18}/><span>Plan import</span></label></Hint><Hint label="Opens the 3D studio with one empty room, ready to resize and furnish."><label><input type="radio" name="start-intent" checked={intent==='design'} onChange={()=>setIntent('design')} disabled={frozen}/><Box size={18}/><span>3D studio</span></label></Hint></fieldset>:<label className="pf-template-furnishing"><input type="checkbox" checked={furnished} onChange={event=>setFurnished(event.target.checked)} disabled={frozen}/><span><strong>Include starter furniture</strong><small>Everything stays movable, replaceable and editable.</small></span></label>}
      {template==='blank'&&<p className="pf-help">Start with one empty room. Resize it or draw your own rooms in the sketch editor.</p>}
      {createError&&<ErrorBox error={createError}/>} {locked&&<p className="pf-help">The last request may have reached the server. These details are locked so retrying cannot create a second project.</p>}
      <div className="dialog-actions pf-template-dialog-actions"><button className="pf-button secondary" type="button" onClick={closeCreate}>Close</button><button className="pf-button primary" type="submit" disabled={creating||(!me.billing.canCreate&&!locked)} aria-busy={creating}>{creating?'Creating…':locked?'Retry creation':'Create project · 1 credit'}<ArrowRight size={17}/></button></div>
    </form></Dialog>
    <Dialog open={!!archive} onClose={()=>{if(!archiveBusy)setArchive(null);}} title={archive?.archived?'Restore this project?':'Archive this project?'}><p className="pf-dialog-copy">{archive?.archived?<>Restore <strong>{archive?.name}</strong> to your active collection. No creation credit is used.</>:<>Archive <strong>{archive?.name}</strong>? Its design document stays in your account. Archiving does not return a creation credit.</>}</p>{archiveError&&<ErrorBox error={archiveError}/>}<div className="dialog-actions"><button className="pf-button secondary" autoFocus disabled={archiveBusy} onClick={()=>setArchive(null)}>Keep as is</button><button className="pf-button primary" disabled={archiveBusy} aria-busy={archiveBusy} onClick={archiveProject}>{archiveBusy?'Saving…':archive?.archived?'Restore project':'Archive project'}</button></div></Dialog>
  </>;
}
