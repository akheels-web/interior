import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { Download, FileUp, Hand, MousePointer2, Plus, RotateCcw, Ruler, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { area, bounds, download, id, resizeRoom, round, type Point, type Room, type SourcePlan } from './model';
import { calibratedPoint, isSimplePolygon, type PlanMark as Mark } from './planGeometry';
import { decodePlanRaster, inspectPlanBytes, PlanInputError, validatePlanSize } from './planInput';
import { Hint, HelpHint } from './components/ui/tooltip';
import { Dialog, NumberField, useMeasurements } from './ui';
import './pdfPlanner.css';
export { calibratedPoint, isSimplePolygon } from './planGeometry';

// Keep the latest import's stage timings inspectable without filenames or drawing data.
const importStages=['selected','ui-ready','read','validated','pdf-reader-start','pdf-reader-ready','pdf-parse-start','pdf-parsed','preview-start','raster-decoded','preview-ready','preview-frame','cancelled','failed'] as const;
type ImportStage=typeof importStages[number];
function markImportStage(stage:ImportStage) {
  const name=`forma.plan.${stage}`;performance.clearMarks(name);performance.mark(name);
  if(stage!=='selected'&&performance.getEntriesByName('forma.plan.selected','mark').length){performance.clearMeasures(name);performance.measure(name,'forma.plan.selected',name);}
}
function beginImportTiming(){for(const stage of importStages){performance.clearMarks(`forma.plan.${stage}`);performance.clearMeasures(`forma.plan.${stage}`);}markImportStage('selected');}
// Let React commit the busy state and give the browser a paint opportunity before CPU work.
function paintBeforeWork(){return new Promise<void>(resolve=>{let frame=0;const done=()=>{clearTimeout(timer);cancelAnimationFrame(frame);resolve();};const timer=setTimeout(done,50);frame=requestAnimationFrame(()=>setTimeout(done,0));});}
type Tool = 'scale' | 'rectangle' | 'polygon' | 'pan';
const between = (n:number,min:number,max:number) => Number.isFinite(n) && n>=min && n<=max;
const roomFromPoints = (points:Point[],name:string):Room => ({id:id(),name,points,height:2.9,wallColor:'#ebe9df',floor:'oak',openings:[]});
function readablePdfError(error:unknown) {
  const name=error instanceof Error?error.name:'';
  if(name==='PasswordException')return 'This PDF is password protected. Save an unlocked copy, then try again.';
  if(name==='InvalidPDFException'||name==='FormatError')return 'This PDF could not be read. It may be damaged. Export a fresh PDF and try again.';
  return 'The PDF could not be opened. Try a different PDF or export a fresh copy of this plan.';
}

export default function PdfPlanner({open,onClose,onApply}:{open:boolean;onClose:()=>void;onApply:(rooms:Room[],sourcePlan:SourcePlan)=>void}) {
  const {lengthSymbol,formatLength,formatArea}=useMeasurements();
  const [document,setDocument]=useState<PDFDocumentProxy|null>(null);
  const [fileName,setFileName]=useState('');
  const [sourceKind,setSourceKind]=useState('');
  const [page,setPage]=useState(1);
  const [plan,setPlan]=useState<SourcePlan|null>(null);
  const [busy,setBusy]=useState('');
  const [loadProgress,setLoadProgress]=useState<number|null>(null);
  const [error,setError]=useState('');
  const [tool,setTool]=useState<Tool>('scale');
  const [marks,setMarks]=useState<Mark[]>([]);
  const [calibration,setCalibration]=useState<Mark[]>([]);
  const [distance,setDistance]=useState(4);
  const [scale,setScale]=useState<number|null>(null);
  const [rooms,setRooms]=useState<Room[]>([]);
  const [canUndo,setCanUndo]=useState(false);
  const [numeric,setNumeric]=useState({name:'',width:4,depth:3,height:2.9,x:0,z:0});
  const [confirm,setConfirm]=useState(false);
  const [zoom,setZoom]=useState(1);
  const run=useRef(0),loadingRef=useRef<PDFDocumentLoadingTask|null>(null),renderRef=useRef<RenderTask|null>(null);
  const openRef=useRef(open);openRef.current=open;
  const originalFile=useRef<File|null>(null),roomHistory=useRef<Room[][]>([]),scrollRef=useRef<HTMLDivElement>(null);
  const dragRef=useRef<{x:number;y:number;left:number;top:number;pointer:number}|null>(null),suppressClick=useRef(false);

  function clearTracing() {
    setRooms([]);roomHistory.current=[];setCanUndo(false);setMarks([]);setCalibration([]);setScale(null);setConfirm(false);setTool('scale');setZoom(1);
  }
  function stopPending(){run.current++;renderRef.current?.cancel();renderRef.current=null;const loading=loadingRef.current;loadingRef.current=null;if(loading)void loading.destroy().catch(()=>{});}
  function cancelImport(){if(busy)markImportStage('cancelled');stopPending();originalFile.current=null;setDocument(null);setPlan(null);setFileName('');setSourceKind('');setBusy('');setLoadProgress(null);setError('');setPage(1);clearTracing();}
  function closePlanner(){cancelImport();onClose();}
  const isCurrent=(ticket:number)=>run.current===ticket&&openRef.current;
  useEffect(()=>{if(!open)cancelImport();},[open]);
  useEffect(()=>()=>{stopPending();},[]);
  function commitRooms(next:Room[]) {roomHistory.current=[...roomHistory.current.slice(-19),structuredClone(rooms)];setCanUndo(true);setRooms(next);setConfirm(false);}
  function undoRoomEdit() {const previous=roomHistory.current.pop();if(previous){setRooms(previous);setCanUndo(roomHistory.current.length>0);setConfirm(false);setError('');}}
  function geometryError(points:Point[]):string {
    if(!isSimplePolygon(points))return `Use a simple outline with no crossing edges and at least ${formatArea(.5)} of floor area.`;
    const b=bounds(points);
    if(!between(b.width,.7,50)||!between(b.depth,.7,50))return `Room width and depth must be ${formatLength(.7)}–${formatLength(50)}. Check your scale or corner positions.`;
    if(points.some(p=>!between(p.x,-150,150)||!between(p.z,-150,150)))return `Every corner must stay within ${formatLength(150)} of the page centre on X and Z.`;
    return '';
  }
  function updateRoom(room:Room,update:Partial<Room>) {const next={...room,...update},problem=geometryError(next.points);if(problem)throw new Error(problem);commitRooms(rooms.map(current=>current.id===room.id?next:current));setError('');}
  async function renderPage(doc:PDFDocumentProxy,pageNumber:number,name:string,ticket:number) {
    setBusy(`Rendering page ${pageNumber}…`);setLoadProgress(null);renderRef.current?.cancel();await paintBeforeWork();if(!isCurrent(ticket))return;markImportStage('preview-start');
    const pdfPage=await doc.getPage(pageNumber);if(!isCurrent(ticket)){pdfPage.cleanup();return;}
    let task:RenderTask|undefined;
    try{
      const natural=pdfPage.getViewport({scale:1});if(!Number.isFinite(natural.width)||!Number.isFinite(natural.height)||natural.width<=0||natural.height<=0)throw new Error('Invalid page dimensions');
      const viewport=pdfPage.getViewport({scale:Math.min(2,1600/Math.max(natural.width,natural.height))}),canvas=window.document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));
      task=pdfPage.render({canvas,viewport,background:'rgb(255,255,255)'});renderRef.current=task;await task.promise;if(!isCurrent(ticket))return;
      setBusy('Preparing your reference preview…');await paintBeforeWork();if(!isCurrent(ticket))return;
      const image=canvas.toDataURL('image/jpeg',.86);if(!isCurrent(ticket))return;
      setPlan({name,image,page:pageNumber,width:canvas.width,height:canvas.height});setBusy('');markImportStage('preview-ready');
      requestAnimationFrame(()=>{if(isCurrent(ticket))markImportStage('preview-frame');});
    }finally{if(renderRef.current===task)renderRef.current=null;pdfPage.cleanup();}
  }
  async function upload(file?:File) {
    if(!file)return;setError('');try{validatePlanSize(file.size);}catch(e){setError((e as Error).message);return;}
    stopPending();const ticket=run.current;beginImportTiming();originalFile.current=null;
    setDocument(null);setPlan(null);setFileName('');setSourceKind('');clearTracing();setBusy('Reading your floor plan…');setLoadProgress(null);let isPdf=false;
    try {
      await paintBeforeWork();if(!isCurrent(ticket))return;markImportStage('ui-ready');
      const bytes=new Uint8Array(await file.arrayBuffer());if(!isCurrent(ticket))return;markImportStage('read');const info=inspectPlanBytes(bytes),name=file.name.slice(0,230);isPdf=info.kind==='pdf';originalFile.current=file;setSourceKind(info.kind.toUpperCase());markImportStage('validated');
      if(info.kind==='pdf') {
        setBusy('Loading the PDF reader…');await paintBeforeWork();if(!isCurrent(ticket))return;markImportStage('pdf-reader-start');
        let pdfjs:typeof import('pdfjs-dist');
        try{pdfjs=await import('pdfjs-dist');}catch{throw new PlanInputError('The PDF reader could not load. Check your connection, then choose the PDF again.');}
        if(!isCurrent(ticket))return;pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';markImportStage('pdf-reader-ready');
        setBusy('Reading the PDF pages…');await paintBeforeWork();if(!isCurrent(ticket))return;markImportStage('pdf-parse-start');
        const task=pdfjs.getDocument({data:bytes});loadingRef.current=task;task.onProgress=({loaded,total}:{loaded:number;total:number})=>{if(isCurrent(ticket))setLoadProgress(total>0?Math.min(100,Math.round(loaded/total*100)):null);};
        const doc=await task.promise;if(!isCurrent(ticket)){void task.destroy().catch(()=>{});return;}markImportStage('pdf-parsed');setDocument(doc);setFileName(name);setPage(1);await renderPage(doc,1,name,ticket);
      } else {
        setBusy('Decoding your plan image…');await paintBeforeWork();if(!isCurrent(ticket))return;markImportStage('preview-start');
        const bitmap=await decodePlanRaster(bytes,info,()=>isCurrent(ticket));if(!bitmap)return;markImportStage('raster-decoded');
        try{
          setBusy('Preparing your reference preview…');await paintBeforeWork();if(!isCurrent(ticket))return;
          const canvas=window.document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d');
          if(!context)throw new PlanInputError('Your browser could not open an image canvas. Reload the page, then try again.');
          context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
          const image=canvas.toDataURL('image/jpeg',.86);if(!isCurrent(ticket))return;
          setPlan({name,image,page:1,width:canvas.width,height:canvas.height});setFileName(name);setPage(1);setBusy('');markImportStage('preview-ready');
          requestAnimationFrame(()=>{if(isCurrent(ticket))markImportStage('preview-frame');});
        }finally{bitmap.close();}
      }
      if(isCurrent(ticket))originalFile.current=file;
    }catch(e){if(!isCurrent(ticket))return;markImportStage('failed');setBusy('');setLoadProgress(null);setError(e instanceof PlanInputError?e.message:isPdf?readablePdfError(e):'The plan could not be opened. Export a fresh PDF or image and try again.');}
  }
  async function selectPage(value:number) {if(!document||rooms.length||busy)return;const ticket=++run.current;beginImportTiming();setPage(value);clearTracing();setPlan(null);setError('');try{await renderPage(document,value,fileName,ticket);}catch(e){if(isCurrent(ticket)){markImportStage('failed');setBusy('');setLoadProgress(null);setError(readablePdfError(e));}}}
  function saveRoom(points:Point[]) {const problem=geometryError(points);if(problem){setError(problem);return;}if(rooms.length>=30){setError('A project can contain up to 30 rooms.');return;}commitRooms([...rooms,roomFromPoints(points,`Room ${rooms.length+1}`)]);setMarks([]);setError('');}
  function place(mark:Mark) {
    if(busy||!plan||confirm||tool==='pan')return;setError('');
    if(tool==='scale'){if(rooms.length)return;setCalibration(current=>current.length===2?[mark]:[...current,mark]);setScale(null);setMarks([]);return;}
    if(!scale){setError('Set the plan scale before tracing. You can also add a room by dimensions below.');return;}
    if(tool==='rectangle'&&marks.length===1){const a=calibratedPoint(marks[0],plan.width,plan.height,scale),b=calibratedPoint(mark,plan.width,plan.height,scale);saveRoom([{x:a.x,z:a.z},{x:b.x,z:a.z},{x:b.x,z:b.z},{x:a.x,z:b.z}]);}
    else if(marks.length<32)setMarks(current=>[...current,mark]);else setError('Use at most 32 corners per room. Finish this room or undo a corner.');
  }
  function setPlanScale() {
    if(!plan||calibration.length!==2||!between(distance,.5,100)){setError(`Choose two endpoints and enter a known distance from ${formatLength(.5)} to ${formatLength(100)}.`);return;}
    const pixels=Math.hypot((calibration[1].u-calibration[0].u)*plan.width,(calibration[1].v-calibration[0].v)*plan.height);if(pixels<3){setError('The endpoints are too close. Choose two distinct ends of a longer measurement.');return;}setScale(distance/pixels);setTool('rectangle');setMarks([]);setError('');
  }
  function addNumeric() {
    if(![numeric.width,numeric.depth].every(n=>between(n,.7,50))||!between(numeric.height,1.8,6)||!between(numeric.x,-125,125)||!between(numeric.z,-125,125)){setError(`Use width/depth ${formatLength(.7)}–${formatLength(50)}, height ${formatLength(1.8)}–${formatLength(6)}, and centre coordinates within ${formatLength(125)}.`);return;}
    if(rooms.length>=30){setError('A project can contain up to 30 rooms.');return;}const {x,z,width,depth,height}=numeric,room=roomFromPoints([{x:x-width/2,z:z-depth/2},{x:x+width/2,z:z-depth/2},{x:x+width/2,z:z+depth/2},{x:x-width/2,z:z+depth/2}],numeric.name.trim().slice(0,80)||`Room ${rooms.length+1}`),problem=geometryError(room.points);if(problem){setError(problem);return;}commitRooms([...rooms,{...room,height}]);setError('');setMarks([]);
  }
  function editCorner(room:Room,index:number,axis:'x'|'z',value:number) {updateRoom(room,{points:room.points.map((p,i)=>i===index?{...p,[axis]:value}:p)});}
  function insertCorner(room:Room,index:number) {const a=room.points[index],b=room.points[(index+1)%room.points.length],points=[...room.points.slice(0,index+1),{x:(a.x+b.x)/2,z:(a.z+b.z)/2},...room.points.slice(index+1)],openEdges=(room.openEdges||[]).flatMap(edge=>edge===index?[edge,edge+1]:[edge>index?edge+1:edge]);try{updateRoom(room,{points,openEdges});}catch(e){setError((e as Error).message);}}
  function removeCorner(room:Room,index:number) {try{updateRoom(room,{points:room.points.filter((_,i)=>i!==index),openEdges:[]});}catch(e){setError((e as Error).message);}}
  function changeZoom(next:number) {const el=scrollRef.current,x=el?(el.scrollLeft+el.clientWidth/2)/el.scrollWidth:.5,y=el?(el.scrollTop+el.clientHeight/2)/el.scrollHeight:.5;setZoom(Math.min(4,Math.max(1,next)));requestAnimationFrame(()=>{if(el){el.scrollLeft=x*el.scrollWidth-el.clientWidth/2;el.scrollTop=y*el.scrollHeight-el.clientHeight/2;}});}
  const worldMark=(p:Point)=>plan&&scale?{u:p.x/(plan.width*scale)+.5,v:p.z/(plan.height*scale)+.5}:{u:0,v:0};
  const worldToSvg=(p:Point)=>{const mark=worldMark(p);return `${mark.u*1000},${mark.v*1000}`;};
  const validRooms=rooms.length>0&&rooms.every(room=>room.name.trim()&&!geometryError(room.points)&&between(room.height,1.8,6));

  return <Dialog open={open} onClose={closePlanner} title="Build from a floor plan" className="planner-dialog">
    <p className="planner-intro">Bring in a PDF or image, set a known measurement, then trace editable rooms and open-plan zones. Your original file is processed on this device; the selected reference preview is saved with this private project.</p>
    <div className="planner-steps"><span className={!plan?'active':''}>1 · Choose a plan</span><span className={plan&&!rooms.length?'active':''}>2 · Scale & draw</span><span className={rooms.length?'active':''}>3 · Review rooms</span></div>
    <div className="planner-file-row"><label className="planner-upload"><FileUp size={18}/><span>{fileName?'Choose another plan':'Choose floor-plan file'}</span><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" disabled={!!busy||rooms.length>0} onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}}/></label><span className="planner-small">PDF, PNG, JPEG, WebP · Up to 25 MB</span>{document&&<label className="planner-page">Page <select aria-label="PDF page" value={page} disabled={!!busy||rooms.length>0} onChange={event=>void selectPage(Number(event.target.value))}>{Array.from({length:document.numPages},(_,i)=><option key={i+1} value={i+1}>{i+1} of {document.numPages}</option>)}</select></label>}</div>
    <p className="planner-unit-note">Measurements: {lengthSymbol} · Areas: {formatArea(1).replace(/^[\d.,\s]+/,'')}. Choose display units in the editor header before opening the importer.</p>
    {busy&&<div className="planner-status"><span className="planner-spinner" aria-hidden="true"/><span role="status">{busy}</span><progress aria-label="Floor-plan import progress" max={100} value={loadProgress??undefined}/><button type="button" onClick={cancelImport}>Cancel import</button></div>}
    {error&&<p className="planner-error" role="alert">{error}</p>}
    {!plan&&!busy&&<div className="planner-empty"><FileUp size={32}/><h3>A plan, ready for your ideas.</h3><p>Choose a clear floor-plan page with a known dimension. You choose every room outline and verify its size before replacing the current project.</p>{document&&<button type="button" onClick={()=>void selectPage(page)}>Retry this page</button>}</div>}
    {plan&&<>
      <div className="planner-reference"><FileUp size={14}/><span><strong>{plan.name}</strong> · {sourceKind}{document?` · page ${plan.page}`:''} · reference retained with your project</span><button type="button" disabled={!originalFile.current} onClick={()=>{if(originalFile.current)download(originalFile.current,originalFile.current.name,originalFile.current.type);}}><Download size={13}/>Download original</button></div>
      <div className="planner-layout"><section className="planner-canvas-section" aria-label="Floor plan tracing">
        <div className="planner-toolbar" aria-label="Drawing tools">
          <Hint label="Mark two ends of a known length on the plan so rooms trace at true size." side="bottom"><button type="button" className={tool==='scale'?'active':''} aria-pressed={tool==='scale'} disabled={rooms.length>0} onClick={()=>{setTool('scale');setMarks([]);}}><Ruler size={16}/>Set scale</button></Hint>
          <Hint label="Click two opposite corners to trace a rectangular room. Set the scale first." side="bottom"><button type="button" className={tool==='rectangle'?'active':''} aria-pressed={tool==='rectangle'} disabled={!scale} onClick={()=>{setTool('rectangle');setMarks([]);}}><MousePointer2 size={16}/>Rectangle</button></Hint>
          <Hint label="Click each corner in turn to trace an irregular room. Set the scale first." side="bottom"><button type="button" className={tool==='polygon'?'active':''} aria-pressed={tool==='polygon'} disabled={!scale} onClick={()=>{setTool('polygon');setMarks([]);}}>Polygon</button></Hint>
          <Hint label="Drag the plan to move around it without drawing." side="bottom"><button type="button" className={tool==='pan'?'active':''} aria-pressed={tool==='pan'} onClick={()=>setTool(tool==='pan'?(scale?'polygon':'scale'):'pan')}><Hand size={16}/>Pan</button></Hint>
          <Hint label="Remove the last point you placed." side="bottom"><button type="button" disabled={tool==='scale'?!calibration.length:!marks.length||tool==='pan'} onClick={()=>{if(tool==='scale'){setCalibration(current=>current.slice(0,-1));setScale(null);}else setMarks(current=>current.slice(0,-1));}}><RotateCcw size={16}/>Undo point</button></Hint>
        </div>
        <div className="planner-viewbar"><p className="planner-hint">{tool==='pan'?'Drag to pan. Choose a drawing tool to continue tracing.':tool==='scale'?'Choose two ends of a known measurement, then enter its length.':tool==='rectangle'?'Choose two opposite room corners.':'Choose room corners in order, then Finish room.'}</p><div className="planner-zoom" role="group" aria-label="Plan zoom"><Hint label="Zoom out of the plan."><button type="button" aria-label="Zoom out plan" disabled={zoom<=1} onClick={()=>changeZoom(zoom-.5)}><ZoomOut size={16}/></button></Hint><output aria-live="polite">{Math.round(zoom*100)}%</output><Hint label="Zoom in for more precise clicks."><button type="button" aria-label="Zoom in plan" disabled={zoom>=4} onClick={()=>changeZoom(zoom+.5)}><ZoomIn size={16}/></button></Hint><Hint label="Show the whole plan page."><button type="button" onClick={()=>changeZoom(1)}>Fit</button></Hint></div></div>
        <div ref={scrollRef} className={`planner-scroll ${tool==='pan'?'is-panning':''}`} tabIndex={0} role="region" aria-label="Scrollable floor plan. Zoom for detail; use arrow keys or scrollbars to pan."
          onPointerDown={event=>{if(tool==='pan'||event.button===1||event.shiftKey){const el=event.currentTarget;dragRef.current={x:event.clientX,y:event.clientY,left:el.scrollLeft,top:el.scrollTop,pointer:event.pointerId};suppressClick.current=true;el.setPointerCapture(event.pointerId);event.preventDefault();}else suppressClick.current=false;}}
          onPointerMove={event=>{const drag=dragRef.current;if(drag){event.currentTarget.scrollLeft=drag.left-(event.clientX-drag.x);event.currentTarget.scrollTop=drag.top-(event.clientY-drag.y);}}}
          onPointerUp={event=>{if(dragRef.current){if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);dragRef.current=null;}}} onPointerCancel={()=>{dragRef.current=null;}}>
          <div className="planner-plan" style={{aspectRatio:`${plan.width} / ${plan.height}`,width:`${zoom*100}%`}} onClick={event=>{if(suppressClick.current){suppressClick.current=false;return;}const rect=event.currentTarget.getBoundingClientRect();place({u:Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width)),v:Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height))});}}>
            <img src={plan.image} alt={`${plan.name}${document?`, page ${plan.page}`:''}. Trace rooms or use the dimension form.`} draggable={false}/>
            <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              {scale&&rooms.map((room,i)=><g key={room.id}><polygon className="planner-room-shape" points={room.points.map(worldToSvg).join(' ')}/>{room.points.map((point,index)=>{const a=worldMark(point),b=worldMark(room.points[(index+1)%room.points.length]);return <line key={index} x1={a.u*1000} y1={a.v*1000} x2={b.u*1000} y2={b.v*1000} className={(room.openEdges||[]).includes(index)?'planner-open-edge':'planner-closed-edge'}/>;})}<text x={worldMark({x:bounds(room.points).x,z:bounds(room.points).z}).u*1000} y={worldMark({x:bounds(room.points).x,z:bounds(room.points).z}).v*1000}>{i+1}</text></g>)}
              {tool==='scale'&&calibration.length>0&&<polyline className="planner-scale-line" points={calibration.map(p=>`${p.u*1000},${p.v*1000}`).join(' ')}/>}
              {marks.length>0&&<polyline className="planner-trace-line" points={marks.map(p=>`${p.u*1000},${p.v*1000}`).join(' ')}/>}
              {(tool==='scale'?calibration:marks).map((p,i)=><circle key={i} cx={p.u*1000} cy={p.v*1000} r="5" className="planner-point"/>)}
            </svg>
          </div>
        </div>
        <div className="planner-scale-row">{tool==='scale'&&<><NumberField label="Known distance" value={distance} onChange={setDistance} min={.5} max={100} step={.1}/><Hint label="Use this distance to convert the plan to real-world size."><button type="button" disabled={calibration.length!==2||rooms.length>0} onClick={setPlanScale}>Apply scale</button></Hint></>}{scale&&<span className="planner-scale-set">Scale set · {formatLength(plan.width*scale)} across this page</span>}{tool==='polygon'&&<button type="button" disabled={marks.length<3} onClick={()=>scale&&saveRoom(marks.map(mark=>calibratedPoint(mark,plan.width,plan.height,scale)))}>Finish room ({marks.length} corners)</button>}{tool==='scale'&&<HelpHint label="Scale tells the app how big the drawing is. Pick two points on a wall or dimension you already know." />}</div>
        <p className="planner-small">Zoom and scroll to reach small corners. Hold Shift while dragging to pan. Use the dimension form and corner fields for keyboard entry. Changing the source or PDF page resets calibration; remove all rooms first.</p>
      </section><aside className="planner-sidebar">
        <div className="planner-room-heading"><h3>Rooms <span>{rooms.length}</span></h3><button type="button" disabled={!canUndo} onClick={undoRoomEdit}><RotateCcw size={13}/>Undo edit</button></div>
        {!rooms.length&&<p className="planner-small">Trace several rooms in the same plan, or add them by dimensions. Concave outlines are supported.</p>}
        <div className="planner-rooms">{rooms.map((room,i)=>{const b=bounds(room.points);return <article key={room.id} className="planner-room-card">
          <div className="planner-room-top"><span className="planner-room-number">{i+1}</span><label>Room / zone name<input maxLength={80} value={room.name} onChange={event=>commitRooms(rooms.map(r=>r.id===room.id?{...r,name:event.target.value}:r))}/></label><button type="button" aria-label={`Remove ${room.name||'room'}`} onClick={()=>commitRooms(rooms.filter(r=>r.id!==room.id))}><Trash2 size={16}/></button></div>
          <div className="planner-dimensions"><NumberField label="Width" value={b.width} onChange={v=>updateRoom(room,resizeRoom(room,v,b.depth))} min={.7} max={50} step={.1}/><NumberField label="Depth" value={b.depth} onChange={v=>updateRoom(room,resizeRoom(room,b.width,v))} min={.7} max={50} step={.1}/><NumberField label="Height" value={room.height} onChange={height=>updateRoom(room,{height})} min={1.8} max={6} step={.1}/></div><p className="planner-small">{formatArea(area(room.points))} · Width/depth resize this outline around its centre.</p>
          <details className="planner-corner-editor"><summary>Outline corners ({room.points.length})</summary><p className="planner-small">X / Z use the shared page centre. Removing a corner resets this zone’s open boundaries.</p>{room.points.map((point,index)=><div className="planner-corner" key={index}><span>{index+1}</span><NumberField label={`Corner ${index+1} X`} value={point.x} min={-150} max={150} onChange={v=>editCorner(room,index,'x',v)}/><NumberField label={`Corner ${index+1} Z`} value={point.z} min={-150} max={150} onChange={v=>editCorner(room,index,'z',v)}/><div className="planner-corner-actions"><button type="button" aria-label={`Add corner after corner ${index+1} of ${room.name}`} disabled={room.points.length>=32} onClick={()=>insertCorner(room,index)}><Plus size={12}/></button><button type="button" aria-label={`Remove corner ${index+1} of ${room.name}`} disabled={room.points.length<=3} onClick={()=>removeCorner(room,index)}><Trash2 size={12}/></button></div></div>)}</details>
          <details className="planner-open-edges"><summary>Open-plan boundaries</summary><p className="planner-small">Checked edges stay open, without a wall. Dashed amber edges show open boundaries in the plan.</p>{room.points.map((point,index)=>{const next=room.points[(index+1)%room.points.length],isOpen=(room.openEdges||[]).includes(index);return <label key={index}><input type="checkbox" checked={isOpen} onChange={()=>updateRoom(room,{openEdges:isOpen?(room.openEdges||[]).filter(e=>e!==index):[...(room.openEdges||[]),index]})}/><span>Open edge {index+1}<small>Corner {index+1} → {(index+1)%room.points.length+1} · {formatLength(Math.hypot(next.x-point.x,next.z-point.z))}</small></span></label>;})}</details>
        </article>;})}</div>
        <details className="planner-numeric" open={!rooms.length}><summary><Plus size={16}/>Add room by dimensions</summary><p className="planner-small">Values display in {lengthSymbol}. X / Z locate the room centre relative to the page centre. Calibrate the plan to align its overlay, then edit corners for an irregular shape.</p><label className="planner-name">Room / zone name<input value={numeric.name} maxLength={80} placeholder={`Room ${rooms.length+1}`} onChange={event=>setNumeric(v=>({...v,name:event.target.value}))}/></label><div className="planner-dimensions">{(['width','depth','height','x','z'] as const).map(key=><NumberField key={key} label={key==='x'?'Centre X':key==='z'?'Centre Z':key[0].toUpperCase()+key.slice(1)} value={numeric[key]} onChange={value=>setNumeric(v=>({...v,[key]:value}))} min={key==='x'||key==='z'?-125:key==='height'?1.8:.7} max={key==='x'||key==='z'?125:key==='height'?6:50} step={.1}/>)}</div><button type="button" className="planner-add" onClick={addNumeric}><Plus size={16}/>Add editable room</button></details>
      </aside></div>
      <div className="planner-footer"><div><strong>{rooms.length?`${rooms.length} room${rooms.length===1?'':'s'} · ${formatArea(rooms.reduce((sum,r)=>sum+area(r.points),0))}`:'Make the plan yours'}</strong><p>This replaces the current project’s rooms and furniture. The selected source page remains as a raster reference; the original file is available to download during this import.</p></div>{!confirm?<button type="button" className="planner-primary" disabled={!validRooms||!!busy} onClick={()=>setConfirm(true)}>Review import</button>:<div className="planner-confirm" role="group" aria-label="Confirm replacement"><p>Replace existing rooms and furniture?</p><button type="button" onClick={()=>setConfirm(false)}>Keep editing</button><button type="button" className="planner-primary" disabled={!validRooms} onClick={()=>{if(validRooms&&plan){try{onApply(rooms,plan);onClose();}catch(e){setError(e instanceof Error?e.message:'These rooms could not be applied. Check the dimensions and try again.');setConfirm(false);}}}}>Use these rooms</button></div>}</div>
    </>}
  </Dialog>;
}
