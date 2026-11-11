'use client';
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { Check, MousePointer2, Pentagon, Plus, Redo2, Scan, Square, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { area, bounds, id, resizeRoom, round, type Point, type Project, type Room } from './model';
import { Dialog, MeasurementProvider, NumberField } from './ui';
import { Hint, HelpHint } from './components/ui/tooltip';
import { formatArea, formatLength, lengthUnits, type AreaUnit, type LengthUnit, type UnitsConfig } from './units';
import { sketchRoomsError } from './sketchGeometry';
import './sketchPlanner.css';

type Tool='select'|'rectangle'|'polygon';
type History={past:Room[][];rooms:Room[];future:Room[][]};
const freshRoom=(points:Point[],name:string,height=2.9):Room=>({id:id(),name,points,height,wallColor:'#f7f6f0',wallTexture:'paint',floor:'oak',openings:[]});
const rectangle=(x:number,z:number,width:number,depth:number):Point[]=>[{x,z},{x:x+width,z},{x:x+width,z:z+depth},{x,z:z+depth}];

export default function SketchPlanner({project,onClose,onApply,startEmpty=false}:{project:Project;onClose:()=>void;onApply:(rooms:Room[],units:UnitsConfig)=>void;startEmpty?:boolean}){
  const [initial]=useState(()=>structuredClone(project.rooms));
  const [history,setHistory]=useState<History>(()=>({past:[],rooms:startEmpty?[]:initial,future:[]}));
  const rooms=history.rooms;
  const [selectedId,setSelectedId]=useState<string|null>(startEmpty?null:initial[0]?.id??null);
  const [tool,setTool]=useState<Tool>('select');
  const [points,setPoints]=useState<Point[]>([]),[hover,setHover]=useState<Point|null>(null);
  const [snap,setSnap]=useState(true),[unit,setUnit]=useState<LengthUnit>(project.units?.length??'m');
  const [areaUnit,setAreaUnit]=useState<AreaUnit>(project.units?.area??'m2');
  const [draftCorner,setDraftCorner]=useState<Point>({x:0,z:0});
  const [error,setError]=useState(''),[notice,setNotice]=useState('');
  const [review,setReview]=useState(false),[discard,setDiscard]=useState(false),[deleteId,setDeleteId]=useState<string|null>(null);
  const [zoom,setZoom]=useState(1);
  const [numeric,setNumeric]=useState({name:'',x:!startEmpty&&initial.length?bounds(initial.flatMap(r=>r.points)).maxX:0,z:0,width:3.6576,depth:3.6576,height:2.9});
  const [dragPoint,setDragPoint]=useState<{roomId:string;index:number;point:Point}|null>(null);
  const dragRef=useRef<{roomId:string;index:number;pointerId:number}|null>(null),svgRef=useRef<SVGSVGElement>(null);
  const [canvasSize,setCanvasSize]=useState({width:600,height:440});
  useEffect(()=>{const svg=svgRef.current;if(!svg)return;const measure=()=>{const rect=svg.getBoundingClientRect();if(rect.width&&rect.height)setCanvasSize({width:rect.width,height:rect.height});};measure();const observer=new ResizeObserver(measure);observer.observe(svg);return()=>observer.disconnect();},[]);
  const patternId=useId().replaceAll(':','');
  const selected=rooms.find(r=>r.id===selectedId);
  const [nameDraft,setNameDraft]=useState(selected?.name??'');
  useEffect(()=>{setNameDraft(selected?.name??'');},[selected?.id,selected?.name]);
  const units:UnitsConfig={length:unit,area:areaUnit};
  const dirty=JSON.stringify(rooms)!==JSON.stringify(initial)||unit!==(project.units?.length??'m')||areaUnit!==(project.units?.area??'m2')||points.length>0;
  const draftError=sketchRoomsError(rooms);
  const removed=project.items.filter(item=>!rooms.some(room=>room.id===item.roomId)).length;
  const deletedRooms=project.rooms.filter(room=>!rooms.some(r=>r.id===room.id)).length;
  const allPoints=rooms.flatMap(r=>r.points);
  const b=bounds(allPoints.length?allPoints:[{x:0,z:0},{x:12,z:10}]);
  const span=Math.max(b.width,b.depth,10),pad=span*.16;
  const base={x:b.x,z:b.z,width:Math.max(12,b.width+pad*2),depth:Math.max(10,b.depth+pad*2)};
  const canvas={x:base.x-base.width/zoom/2,z:base.z-base.depth/zoom/2,width:base.width/zoom,depth:base.depth/zoom};
  const grid=unit==='ft'||unit==='in'?.3048:unit==='cm'||unit==='mm'?.1:.25;
  // SVG meet scales by the smaller axis; account for letterboxing on every screen.
  const pixelsPerMetre=Math.max(.01,Math.min(canvasSize.width/canvas.width,canvasSize.height/canvas.depth));
  const labelSize=12/pixelsPerMetre,handleHitRadius=22/pixelsPerMetre;
  function commit(next:Room[]){
    const problem=next.length?sketchRoomsError(next):'';if(problem)throw new Error(problem);
    setHistory(current=>({past:[...current.past,current.rooms].slice(-40),rooms:next,future:[]}));
    setError('');setReview(false);setNotice('Draft updated. Apply it when you are ready.');
  }
  function attempt(action:()=>void){try{action();}catch(e){setError(e instanceof Error?e.message:'This change could not be applied. Your previous outline has been kept.');}}
  function undo(){setHistory(current=>current.past.length?{past:current.past.slice(0,-1),rooms:current.past[current.past.length-1],future:[current.rooms,...current.future].slice(0,40)}:current);setPoints([]);setError('');setReview(false);}
  function redo(){setHistory(current=>current.future.length?{past:[...current.past,current.rooms].slice(-40),rooms:current.future[0],future:current.future.slice(1)}:current);setPoints([]);setError('');setReview(false);}
  function chooseTool(next:Tool){setTool(next);setPoints([]);setHover(null);setReview(false);setError('');}
  function canvasPoint(event:PointerEvent<SVGSVGElement>):Point{
    const svg=svgRef.current!,matrix=svg.getScreenCTM();if(!matrix)return {x:0,z:0};
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    const step=snap?grid:0;return {x:round(step?Math.round(p.x/step)*step:p.x,5),z:round(step?Math.round(p.y/step)*step:p.y,5)};
  }
  function addRoom(nextPoints:Point[]){
    if(rooms.length>=30)throw new Error('This project already has 30 rooms. Remove a room before adding another.');
    const room=freshRoom(nextPoints,numeric.name.trim()||`Room ${rooms.length+1}`,numeric.height);
    commit([...rooms,room]);setSelectedId(room.id);setPoints([]);setHover(null);setTool('select');
  }
  function place(event:PointerEvent<SVGSVGElement>){
    if(event.button!==0||dragRef.current)return;
    if(tool==='select')return;
    setError('');const p=canvasPoint(event);
    if(Math.abs(p.x)>150||Math.abs(p.z)>150){setError('Stay within 150 m of the origin.');return;}
    if(tool==='rectangle'&&points.length===1){const first=points[0];attempt(()=>addRoom(rectangle(Math.min(first.x,p.x),Math.min(first.z,p.z),Math.abs(first.x-p.x),Math.abs(first.z-p.z))));}
    else if(points.length>=32)setError('A room can have up to 32 corners. Finish this outline first.');
    else setPoints(current=>[...current,p]);
  }
  function changeRoom(next:Room){commit(rooms.map(r=>r.id===next.id?next:r));}
  function corner(room:Room,index:number,point:Point){changeRoom({...room,points:room.points.map((p,i)=>i===index?point:p)});}
  function startDrag(event:PointerEvent<SVGCircleElement>,room:Room,index:number){
    if(tool!=='select')return;event.stopPropagation();event.preventDefault();
    dragRef.current={roomId:room.id,index,pointerId:event.pointerId};setDragPoint({roomId:room.id,index,point:room.points[index]});svgRef.current?.setPointerCapture(event.pointerId);setReview(false);
  }
  function move(event:PointerEvent<SVGSVGElement>){const point=canvasPoint(event);if(dragRef.current)setDragPoint({...dragRef.current,point});else if(tool!=='select')setHover(point);}
  function finishDrag(event:PointerEvent<SVGSVGElement>){
    const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;dragRef.current=null;
    if(svgRef.current?.hasPointerCapture(event.pointerId))svgRef.current.releasePointerCapture(event.pointerId);
    const target=rooms.find(r=>r.id===drag.roomId);if(target){const point=canvasPoint(event);if(point.x!==target.points[drag.index].x||point.z!==target.points[drag.index].z)attempt(()=>corner(target,drag.index,point));}setDragPoint(null);
  }
  function close(){if(dirty)setDiscard(true);else onClose();}
  function apply(){if(draftError){setError(draftError);return;}attempt(()=>{onApply(structuredClone(rooms),units);onClose();});}
  const ghost=tool==='rectangle'&&points.length===1&&hover?rectangle(Math.min(points[0].x,hover.x),Math.min(points[0].z,hover.z),Math.abs(points[0].x-hover.x),Math.abs(points[0].z-hover.z)):[...points,...(hover?[hover]:[])];
  return <MeasurementProvider units={units}><Dialog open onClose={close} title="Sketch your floor plan" className="sketch-dialog">
    <p className="sketch-intro">{startEmpty?'Start on an empty drawing sheet. Applying this sketch replaces the project’s starter room. ':'Draw rooms directly or enter exact dimensions. '}Nothing changes in your saved project until you apply this draft.</p>
    <div className="sketch-toolbar">
      <div role="group" aria-label="Sketch tools">{([{id:'select',name:'Select',icon:<MousePointer2 size={16}/>},{id:'rectangle',name:'Rectangle',icon:<Square size={16}/>},{id:'polygon',name:'Polygon',icon:<Pentagon size={16}/>} ] as const).map(t=><Hint key={t.id} label={{select:'Pick a room to move its corners or edit its details.',rectangle:'Click two opposite corners to draw a rectangular room.',polygon:'Click each corner in order to draw an L-shaped or irregular room.'}[t.id]} side="bottom"><button type="button" aria-pressed={tool===t.id} className={tool===t.id?'is-selected':''} onClick={()=>chooseTool(t.id)}>{t.icon}{t.name}</button></Hint>)}</div>
      <div role="group" aria-label="Sketch history"><Hint label="Undo the last sketch change." side="bottom"><button type="button" aria-label="Undo sketch edit" disabled={!history.past.length} onClick={undo}><Undo2 size={17}/></button></Hint><Hint label="Redo the change you just undid." side="bottom"><button type="button" aria-label="Redo sketch edit" disabled={!history.future.length} onClick={redo}><Redo2 size={17}/></button></Hint></div>
      <label className="sketch-unit">Units<select value={unit} onChange={e=>{const next=e.target.value as LengthUnit;setUnit(next);setAreaUnit(next==='ft'||next==='in'?'ft2':'m2');setReview(false);}}>{lengthUnits.map(u=><option value={u.id} key={u.id}>{u.label}</option>)}</select></label>
      <label className="sketch-snap"><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>Snap <span>{formatLength(grid,unit)}</span></label><HelpHint label="Snap rounds corners to the grid step shown, so walls line up neatly." />
    </div>
    {error&&<p className="sketch-error" role="alert">{error}</p>}
    <div className="sketch-layout"><section className="sketch-canvas-section" aria-label="Floor-plan drawing">
      <div className="sketch-canvas-caption"><p id={`${patternId}-help`}>{tool==='select'?'Select a room. Drag a corner, or edit its coordinates below.':tool==='rectangle'?'Click two opposite corners to create a room.':`Click the room’s corners in order, then choose Finish polygon. ${points.length} corners placed.`}</p><div role="group" aria-label="Drawing zoom"><Hint label="Zoom out of the drawing."><button type="button" aria-label="Zoom out drawing" disabled={zoom<=.5} onClick={()=>setZoom(v=>Math.max(.5,v-.25))}><ZoomOut size={17}/></button></Hint><Hint label="Reset the drawing to fit the window."><button type="button" onClick={()=>setZoom(1)}><Scan size={16}/>Fit</button></Hint><Hint label="Zoom in on the drawing."><button type="button" aria-label="Zoom in drawing" disabled={zoom>=3} onClick={()=>setZoom(v=>Math.min(3,v+.25))}><ZoomIn size={17}/></button></Hint></div></div>
      <svg className={`sketch-canvas tool-${tool}`} ref={svgRef} viewBox={`${canvas.x} ${canvas.z} ${canvas.width} ${canvas.depth}`} role="img" aria-label="Editable floor-plan drawing" aria-describedby={`${patternId}-help`} onPointerDown={place} onPointerMove={move} onPointerUp={finishDrag} onPointerCancel={()=>{dragRef.current=null;setDragPoint(null);}}>
        <defs><pattern id={patternId} width={grid} height={grid} patternUnits="userSpaceOnUse"><path d={`M ${grid} 0 H 0 V ${grid}`} fill="none" className="sketch-grid-line"/></pattern></defs>
        <rect x={canvas.x} y={canvas.z} width={canvas.width} height={canvas.depth} fill={`url(#${patternId})`}/>
        {rooms.map(r=>{const roomPoints=r.points.map((p,index)=>dragPoint?.roomId===r.id&&dragPoint.index===index?dragPoint.point:p),rb=bounds(roomPoints);return <g key={r.id} className={selectedId===r.id?'sketch-room is-selected':'sketch-room'} onPointerDown={e=>{if(tool==='select'){e.stopPropagation();setSelectedId(r.id);setReview(false);}}}>
          <polygon points={roomPoints.map(p=>`${p.x},${p.z}`).join(' ')} className="sketch-room-shape"/>
          {r.openings.map(o=>{const a=roomPoints[o.edge],b=roomPoints[(o.edge+1)%roomPoints.length],length=Math.hypot(b.x-a.x,b.z-a.z),half=o.width/length/2;return <line key={o.id} x1={a.x+(b.x-a.x)*(o.offset-half)} y1={a.z+(b.z-a.z)*(o.offset-half)} x2={a.x+(b.x-a.x)*(o.offset+half)} y2={a.z+(b.z-a.z)*(o.offset+half)} className={o.type==='door'?'sketch-door':'sketch-window'}/>;})}
          <title>{r.name}: {formatLength(rb.width,unit)} × {formatLength(rb.depth,unit)}</title>
          <text x={rb.x} y={rb.z-labelSize*.3} fontSize={labelSize}>{r.name.length>Math.max(8,Math.floor(rb.width*pixelsPerMetre/7))?r.name.slice(0,Math.max(6,Math.floor(rb.width*pixelsPerMetre/7)-2))+'…':r.name}<tspan x={rb.x} dy={labelSize*1.5} className="sketch-room-size">{formatLength(rb.width,unit,1)} × {formatLength(rb.depth,unit,1)}</tspan></text>
          {tool==='select'&&selectedId===r.id&&roomPoints.map((p,index)=><g key={index}><circle cx={p.x} cy={p.z} r={handleHitRadius} className="sketch-handle-hit" onPointerDown={e=>startDrag(e,r,index)}/><circle cx={p.x} cy={p.z} r={5/pixelsPerMetre} className="sketch-handle" pointerEvents="none"/></g>)}
        </g>;})}
        {ghost.length>0&&<polyline className="sketch-ghost" points={ghost.map(p=>`${p.x},${p.z}`).join(' ')}/>}
        {points.map((p,index)=><circle key={index} cx={p.x} cy={p.z} r={canvas.width*.005} className="sketch-mark"/>)}
      </svg>
      {points.length>0&&<div className="sketch-drawing-actions"><span>{points.length} corner{points.length===1?'':'s'}</span><button type="button" onClick={()=>setPoints(p=>p.slice(0,-1))}>Remove last corner</button><button type="button" onClick={()=>{setPoints([]);setHover(null);}}>Cancel outline</button>{tool==='polygon'&&<Hint label="Close the outline and create the room (needs at least 3 corners)."><button type="button" className="is-primary" disabled={points.length<3} onClick={()=>attempt(()=>addRoom(points))}><Check size={16}/>Finish polygon</button></Hint>}</div>}
      {tool==='polygon'&&<div className="sketch-polygon-numeric"><p className="sketch-note">Or add polygon corners with the keyboard, in order.</p><div className="sketch-fields"><NumberField label="Polygon corner X" value={draftCorner.x} onChange={x=>setDraftCorner(p=>({...p,x}))}/><NumberField label="Polygon corner Z" value={draftCorner.z} onChange={z=>setDraftCorner(p=>({...p,z}))}/></div><button type="button" disabled={points.length>=32} onClick={()=>{setPoints(p=>[...p,{...draftCorner}]);setReview(false);setError('');}}><Plus size={16}/>Add polygon corner</button></div>}
      <p className="sketch-note">Room outlines share the same scale. Doors are cobalt and windows are amber. Touching walls are allowed; overlapping room floors are blocked. Room sizes shown are bounding dimensions.</p>
      <details className="sketch-numeric" open><summary>Add a room by dimensions</summary><p>Use this form for precise or keyboard-only drawing. X and Z place the top-left corner on the plan.</p><label className="sketch-field">New room name<input value={numeric.name} maxLength={120} placeholder={`Room ${rooms.length+1}`} onChange={e=>setNumeric(v=>({...v,name:e.target.value}))}/></label><div className="sketch-fields"><NumberField label="New room width" value={numeric.width} min={.7} max={50} onChange={width=>setNumeric(v=>({...v,width}))}/><NumberField label="New room depth" value={numeric.depth} min={.7} max={50} onChange={depth=>setNumeric(v=>({...v,depth}))}/><NumberField label="New room height" value={numeric.height} min={1.8} max={6} onChange={height=>setNumeric(v=>({...v,height}))}/><NumberField label="New room X" value={numeric.x} onChange={x=>setNumeric(v=>({...v,x}))}/><NumberField label="New room Z" value={numeric.z} onChange={z=>setNumeric(v=>({...v,z}))}/></div><button type="button" onClick={()=>attempt(()=>addRoom(rectangle(numeric.x,numeric.z,numeric.width,numeric.depth)))} disabled={rooms.length>=30}><Plus size={16}/>Add dimensioned room</button></details>
    </section><aside className="sketch-sidebar" aria-label="Sketch room properties"><h3>Rooms <span>{rooms.length}/30</span></h3><div className="sketch-room-list">{rooms.map((r,index)=><button type="button" key={r.id} className={r.id===selectedId?'is-selected':''} aria-pressed={r.id===selectedId} onClick={()=>{setSelectedId(r.id);setTool('select');setPoints([]);setReview(false);}}><span>{String(index+1).padStart(2,'0')}</span><strong>{r.name}</strong><small>{formatArea(area(r.points),units.area)}</small></button>)}</div>
      {selected&&<div className="sketch-properties"><label className="sketch-field">Selected room name<input value={nameDraft} onChange={e=>setNameDraft(e.target.value)} maxLength={120} onBlur={()=>{const next=nameDraft.trim();if(next!==selected.name){try{changeRoom({...selected,name:next});setNameDraft(next);}catch(error){setError(error instanceof Error?error.message:'Enter a valid room name.');setNameDraft(selected.name);}}}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label><div className="sketch-fields"><NumberField label="Selected width" value={bounds(selected.points).width} min={.7} max={50} onChange={width=>changeRoom(resizeRoom(selected,width,bounds(selected.points).depth))}/><NumberField label="Selected depth" value={bounds(selected.points).depth} min={.7} max={50} onChange={depth=>changeRoom(resizeRoom(selected,bounds(selected.points).width,depth))}/><NumberField label="Selected ceiling" value={selected.height} min={1.8} max={6} onChange={height=>changeRoom({...selected,height})}/></div><p className="sketch-note">{selected.openings.length} door/window openings retained. Changing an outline must leave every opening valid. Edit door and window details in the studio inspector.</p><details className="sketch-corners"><summary>Edit corner coordinates</summary>{selected.points.map((p,index)=><div className="sketch-corner" key={`${selected.id}-${index}`}><span>{index+1}</span><NumberField label={`Corner ${index+1} X`} value={p.x} onChange={x=>corner(selected,index,{...p,x})}/><NumberField label={`Corner ${index+1} Z`} value={p.z} onChange={z=>corner(selected,index,{...p,z})}/></div>)}</details><button type="button" className="sketch-delete" onClick={()=>setDeleteId(selected.id)}><Trash2 size={16}/>Remove selected room</button></div>}
    </aside></div>
    <footer className="sketch-footer"><div><strong>{rooms.length} room{rooms.length===1?'':'s'} · {formatArea(rooms.reduce((sum,r)=>sum+area(r.points),0),units.area)}</strong><p>Existing furniture positions and the source-plan reference stay unchanged for retained rooms. Check furniture clearances after moving walls. No project credit is used.</p><span className="sketch-status" role="status">{notice}</span></div><button type="button" className="is-primary" disabled={!rooms.length||!!draftError||points.length>0} onClick={()=>setReview(true)}>Review changes<Check size={16}/></button></footer>
    {draftError&&!error&&<p className="sketch-error" role="alert">{draftError}</p>}
  </Dialog>
  <Dialog open={review} onClose={()=>setReview(false)} title="Apply this floor plan?"><p className="dialog-copy">Apply {rooms.length} room{rooms.length===1?'':'s'} to <strong>{project.name}</strong>. {deletedRooms>0?`${deletedRooms} existing room${deletedRooms===1?' will':'s will'} be removed. `:''}{removed>0?`${removed} furniture object${removed===1?' belonging':'s belonging'} to removed rooms will also be removed. `:'Furniture is kept in its current position. '}Your original plan reference is kept. You can undo this change in the studio.</p><div className="dialog-actions"><button type="button" className="button secondary" autoFocus onClick={()=>setReview(false)}>Keep sketching</button><button type="button" className="button primary" onClick={apply}>Apply floor plan</button></div></Dialog>
  <Dialog open={discard} onClose={()=>setDiscard(false)} title="Discard this sketch draft?"><p className="dialog-copy">These room changes have not been applied to your project. Your saved project will stay as it was.</p><div className="dialog-actions"><button type="button" className="button secondary" autoFocus onClick={()=>setDiscard(false)}>Keep sketching</button><button type="button" className="button primary" onClick={onClose}>Discard draft</button></div></Dialog>
  <Dialog open={!!deleteId} onClose={()=>setDeleteId(null)} title="Remove this room from the draft?"><p className="dialog-copy">Remove <strong>{rooms.find(r=>r.id===deleteId)?.name}</strong>? Its furniture will be removed only if you apply this draft. Sketch undo can restore the room.</p><div className="dialog-actions"><button type="button" className="button secondary" autoFocus onClick={()=>setDeleteId(null)}>Keep room</button><button type="button" className="button primary" onClick={()=>{attempt(()=>commit(rooms.filter(r=>r.id!==deleteId)));if(selectedId===deleteId)setSelectedId(rooms.find(r=>r.id!==deleteId)?.id??null);setDeleteId(null);}}>Remove room</button></div></Dialog>
  </MeasurementProvider>;
}
