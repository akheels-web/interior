'use client';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Archive, ArrowRight, Box, FilePlus2, FileUp, FolderOpen, Layers3, PencilRuler, Plus, RotateCcw, Search, X } from 'lucide-react';
import { Dialog } from '../ui';
import { HOME_TEMPLATES } from '../templates';
import { api, ApiError, date, message, type Me, type Notify, type ProjectSummary, type ProjectsResponse, useApi } from './api';
import { Empty, ErrorBox, Field, focusError, Pagination, PlanPreview, SearchField, Spinner, useSearchQuery } from './shared';
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
  const frozen=creating||locked;
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
    <header className="pf-page-heading"><div><span className="pf-eyebrow">THE DESIGN WORKSPACE</span><h1>Your project library<span>.</span></h1><p>A private collection of spaces, plans and possibilities.</p></div><button className="pf-button primary" onClick={()=>openCreate('blank','sketch')} disabled={(!me.billing.canCreate&&!locked)||creating}><Plus size={18}/>New project</button></header>
    <section className="pf-credit-strip" aria-label="Project creation credits"><span className="pf-credit-icon"><Layers3 size={23}/></span><div><strong>{me.billing.monthlyRemaining} <span>of {me.billing.monthlyLimit} monthly projects remaining</span></strong><p>{me.billing.periodEnd?<>Current paid period ends {date(me.billing.periodEnd)}.</>:'A paid subscription is required to create projects.'} Existing projects remain editable.</p></div><div className="pf-extra-credit"><strong>{me.billing.addonCredits}</strong><span>extra credits</span></div><a href="/billing" className="pf-button secondary">{me.billing.canCreate?'Manage plan':'View plans'}<ArrowRight size={16}/></a></section>

    <section className="pf-start-section" aria-labelledby="start-title">
      <div className="pf-section-toolbar"><div><h2 id="start-title">Make room for your next idea</h2><p>Draw it yourself, bring a plan or start with a ready layout.</p></div>{locked&&<button className="pf-button secondary" onClick={()=>openCreate()}>Review pending creation<ArrowRight size={16}/></button>}</div>
      <div className="pf-start-options">
        <button className="pf-start-option" onClick={()=>openCreate('blank','sketch')} disabled={creating||(!me.billing.canCreate&&!locked)}><span className="pf-start-symbol"><PencilRuler size={24}/></span><span><strong>Sketch from scratch</strong><small>Draw rooms directly. No uploaded file needed.</small></span><ArrowRight size={18}/></button>
        <button className="pf-start-option" onClick={()=>openCreate('blank','import')} disabled={creating||(!me.billing.canCreate&&!locked)}><span className="pf-start-symbol"><FileUp size={24}/></span><span><strong>Bring your floor plan</strong><small>Import a PDF or image and trace your layout.</small></span><ArrowRight size={18}/></button>
      </div>
    </section>

    <section className="pf-template-library" aria-labelledby="template-title">
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

    <section className="pf-projects-section"><div className="pf-section-toolbar"><div><h2>Design collection {result.data&&<span>{result.data.total}</span>}</h2><p>{search.query?'Search results':'Your private design collection'}</p></div><SearchField state={search} label="Search projects" placeholder="Search projects…"/></div>{result.error&&<ErrorBox error={result.error} retry={result.refresh}/>} {result.loading&&!result.data?<Spinner label="Loading your projects…"/>:result.data?.projects.length?<><div className={`pf-project-grid ${result.loading?'is-updating':''}`} aria-busy={result.loading}>{result.data.projects.map(project=><article className="pf-project-card" key={project.id}><a className="pf-project-preview-link" href={`/studio/${encodeURIComponent(project.id)}`} aria-label={`Open ${project.name}`}><PlanPreview project={project}/></a><div className="pf-project-body"><div className="pf-project-title"><a href={`/studio/${encodeURIComponent(project.id)}`}><h3>{project.name}</h3></a><button type="button" className="pf-icon-button" aria-label={`${project.archived?'Restore':'Archive'} ${project.name}`} title={project.archived?'Restore project':'Archive project'} onClick={()=>{setArchiveError('');setArchive(project);}}>{project.archived?<RotateCcw size={17}/>:<Archive size={17}/>}</button></div><p className="pf-project-client">{project.client||'No client specified'}</p><div className="pf-project-metadata"><span><Layers3 size={13}/>{project.roomCount} {project.roomCount===1?'room':'rooms'}</span><span><Box size={13}/>{project.itemCount} objects</span></div><div className="pf-project-bottom"><span>Updated {date(project.updatedAt)}</span><a href={`/studio/${encodeURIComponent(project.id)}`} aria-label={`Open ${project.name}`}><span>Open studio</span><ArrowRight size={17}/></a></div></div></article>)}</div><Pagination page={result.data.page} pages={result.data.pages} total={result.data.total} loading={result.loading} onPage={search.setPage}/></>:!result.error&&!result.loading?<Empty icon={search.query?<FolderOpen size={30}/>:<FilePlus2 size={30}/>} title={search.query?'No matching projects':'Your first space is waiting.'} action={search.query?<button className="pf-button secondary" onClick={search.clear}>Clear search</button>:me.billing.canCreate?<button className="pf-button primary" onClick={()=>openCreate('blank','sketch')}><Plus size={17}/>Create your first project</button>:<a className="pf-button primary" href="/billing">Choose a plan<ArrowRight size={17}/></a>}>{search.query?'Try a different project or client name.':'Choose a starter layout above, sketch directly or import your own plan.'}</Empty>:null}</section>

    <Dialog open={!!preview} onClose={()=>setPreview(null)} title={preview?.name??'Layout preview'} className="pf-layout-preview-dialog">
      {preview&&<><div className="pf-layout-preview-grid"><div className="pf-layout-preview-art"><TemplatePlan template={preview} large/></div><div className="pf-layout-preview-details"><span className="pf-eyebrow">{category(preview)} · EDITABLE CONCEPT</span><p>{preview.description}</p><dl><div><dt>Overall envelope</dt><dd>{envelope(preview)}</dd></div><div><dt>Reference area</dt><dd>{area(preview)}</dd></div><div><dt>Metric equivalent</dt><dd>{(preview.widthFt*.3048).toFixed(2)} × {(preview.depthFt*.3048).toFixed(2)} m</dd></div></dl><h3>Inside this layout</h3><ul>{preview.rooms.map((room,index)=><li key={`${room.name}-${index}`}><span>{room.name}</span><span>{room.width} × {room.depth} ft</span></li>)}</ul></div></div><p className="pf-template-caveat">Original concept, not a sanctioned building plan. All rooms, openings, finishes and furniture can be edited in your private project. Choose whether to include furniture in the next step.</p>{!me.billing.canCreate&&!locked&&<p className="pf-template-quota-note">You can browse every layout. Visit billing to enable project creation; existing projects remain editable.</p>}<div className="dialog-actions pf-template-dialog-actions"><button className="pf-button secondary" type="button" onClick={()=>setPreview(null)}>Keep browsing</button>{me.billing.canCreate||locked?<button className="pf-button primary" type="button" disabled={creating} onClick={()=>{const chosen=preview.id;setPreview(null);openCreate(chosen,'design');}}>{locked?'Review pending creation':'Use this template'}<ArrowRight size={16}/></button>:<a className="pf-button primary" href="/billing">View plans<ArrowRight size={16}/></a>}</div></>}
    </Dialog>

    <Dialog open={createOpen} onClose={closeCreate} title={locked?'Finish project creation':'A new space'} className="pf-create-template-dialog"><form noValidate ref={form} onSubmit={create}>
      <p className="pf-dialog-copy">Creating a project uses one creation credit. You can edit it anytime, even after your credits run out.</p>
      <Field label="Project name" value={name} onChange={setName} maxLength={120} placeholder="e.g. The Courtyard Residence" error={nameError} disabled={frozen} required/>
      <div className="pf-field"><label htmlFor="create-start-layout">Start with</label><select className="pf-template-select" id="create-start-layout" value={template} disabled={frozen} onChange={event=>{const next=event.target.value;setTemplate(next);setIntent(next==='blank'?'sketch':'design');setFurnished(next!=='blank');}}><option value="blank">Sketch / import an empty room</option><option value="sample">Furnished living room example</option>{HOME_TEMPLATES.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.name} · {envelope(candidate)}</option>)}</select></div>
      {selectedTemplate&&<div className="pf-selected-template"><TemplatePlan template={selectedTemplate}/><div><strong>{selectedTemplate.name}</strong><span>{envelope(selectedTemplate)} · {area(selectedTemplate)}</span><small>Editable concept envelope</small></div></div>}
      {template==='blank'?<fieldset className="pf-create-intent"><legend>Open the new project in</legend><label><input type="radio" name="start-intent" checked={intent==='sketch'} onChange={()=>setIntent('sketch')} disabled={frozen}/><PencilRuler size={18}/><span>Direct sketch</span></label><label><input type="radio" name="start-intent" checked={intent==='import'} onChange={()=>setIntent('import')} disabled={frozen}/><FileUp size={18}/><span>Plan import</span></label><label><input type="radio" name="start-intent" checked={intent==='design'} onChange={()=>setIntent('design')} disabled={frozen}/><Box size={18}/><span>3D studio</span></label></fieldset>:<label className="pf-template-furnishing"><input type="checkbox" checked={furnished} onChange={event=>setFurnished(event.target.checked)} disabled={frozen}/><span><strong>Include starter furniture</strong><small>Everything stays movable, replaceable and editable.</small></span></label>}
      {template==='blank'&&<p className="pf-help">Start with one empty room. Resize it or draw your own rooms in the sketch editor.</p>}
      {createError&&<ErrorBox error={createError}/>} {locked&&<p className="pf-help">The last request may have reached the server. These details are locked so retrying cannot create a second project.</p>}
      <div className="dialog-actions pf-template-dialog-actions"><button className="pf-button secondary" type="button" onClick={closeCreate}>Close</button><button className="pf-button primary" type="submit" disabled={creating||(!me.billing.canCreate&&!locked)} aria-busy={creating}>{creating?'Creating…':locked?'Retry creation':'Create project · 1 credit'}<ArrowRight size={17}/></button></div>
    </form></Dialog>
    <Dialog open={!!archive} onClose={()=>{if(!archiveBusy)setArchive(null);}} title={archive?.archived?'Restore this project?':'Archive this project?'}><p className="pf-dialog-copy">{archive?.archived?<>Restore <strong>{archive?.name}</strong> to your active collection. No creation credit is used.</>:<>Archive <strong>{archive?.name}</strong>? Its design document stays in your account. Archiving does not return a creation credit.</>}</p>{archiveError&&<ErrorBox error={archiveError}/>}<div className="dialog-actions"><button className="pf-button secondary" autoFocus disabled={archiveBusy} onClick={()=>setArchive(null)}>Keep as is</button><button className="pf-button primary" disabled={archiveBusy} aria-busy={archiveBusy} onClick={archiveProject}>{archiveBusy?'Saving…':archive?.archived?'Restore project':'Archive project'}</button></div></Dialog>
  </>;
}
