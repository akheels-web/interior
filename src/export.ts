import { area, bounds, getBrandsForKind, getItemPrice, wallOpenings, type Project } from './model';
import { formatLength, formatArea, getUnits } from './units';

/** Built-in PDF fonts use WinAnsi; keep user text legible rather than emitting broken glyphs. */
export function pdfText(value: string): string {
  return value.replace(/[²]/g,'2').replace(/[³]/g,'3').replace(/[×]/g,' x ').replace(/[–—−]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[…]/g,'...').replace(/₹/g,'INR ').replace(/·/g,' | ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E\n]/g,'?');
}

export async function exportPresentation(project: Project, screenshot: string): Promise<void> {
  if (!/^data:image\/(png|jpeg);base64,/.test(screenshot)) throw new Error('The room image could not be captured. Return to the studio and try exporting again.');
  if (!project.rooms.length) throw new Error('Add a room before exporting a presentation.');
  const units=getUnits(project),length=(v:number)=>formatLength(v,units.length),surface=(v:number)=>formatArea(v,units.area);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4', compress:true });
  pdf.setProperties({ title:pdfText(project.name), subject:'Interior concept presentation', author:'PlanSaathi', creator:'PlanSaathi Interior Studio' });
  const W=297, H=210, M=18, contentW=W-M*2, bottom=H-22;
  const forest:[number,number,number]=[38,79,69], ink:[number,number,number]=[36,51,45], muted:[number,number,number]=[100,115,108];
  let cursor=0;
  const text=(value:string,x:number,y:number,size=10,color: [number,number,number]=ink,style:'normal'|'bold'='normal')=>{pdf.setFont('helvetica',style);pdf.setFontSize(size);pdf.setTextColor(...color);pdf.text(pdfText(value),x,y);};
  const line=(y:number)=>{pdf.setDrawColor(223,229,223);pdf.setLineWidth(.3);pdf.line(M,y,W-M,y);};
  function pageHeader(section:string) {
    text('PLANSAATHI / INTERIOR STUDIO',M,15,8,forest,'bold');
    text(pdfText(project.name).slice(0,80),M,27,17,ink,'bold');
    text(section,M,37,10,muted);line(43);cursor=53;
  }
  function newPage(section:string) { pdf.addPage();pageHeader(section); }
  function ensure(height:number,section:string) { if(cursor+height>bottom)newPage(section); }
  function paragraph(value:string,width=contentW,size=10,section='Project notes') {
    pdf.setFont('helvetica','normal');pdf.setFontSize(size);
    const lines=pdf.splitTextToSize(pdfText(value),width) as string[];
    for(const row of lines) { ensure(5,section);text(row,M,cursor,size,muted);cursor+=5; }
    cursor+=3;
  }
  function imageFit(data:string,x:number,y:number,width:number,height:number) {
    const info=pdf.getImageProperties(data);
    const fit=Math.min(width/info.width,height/info.height);
    const w=info.width*fit,h=info.height*fit;
    pdf.addImage(data,info.fileType,x+(width-w)/2,y+(height-h)/2,w,h,undefined,'FAST');
  }

  text('PLANSAATHI',M,19,12,forest,'bold');
  text('SPACES, CONSIDERED.',W-75,19,8,muted);
  const titleLines=pdf.splitTextToSize(pdfText(project.name),contentW) as string[];
  titleLines.slice(0,2).forEach((row,i)=>text(row,M,33+i*9,24,ink,'bold'));
  const coverTop=titleLines.length>1?54:45;
  const date=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const clientLines=pdf.splitTextToSize(pdfText(`${project.client || 'Interior concept'} | ${date}`),contentW) as string[];
  clientLines.slice(0,2).forEach((row,i)=>text(row,M,coverTop+i*5,9,muted));
  const captureY=coverTop+(clientLines.length>1?12:7), captureH=H-captureY-39;
  pdf.setFillColor(244,246,245);pdf.roundedRect(M,captureY,contentW,captureH,2,2,'F');
  imageFit(screenshot,M+1,captureY+1,contentW-2,captureH-2);
  const totalArea=project.rooms.reduce((sum,r)=>sum+area(r.points),0);
  const totalBudget=project.items.reduce((sum,i)=>sum+getItemPrice(i),0);
  text(`${project.rooms.length} ROOMS`,M,H-23,9,forest,'bold');
  text(`${surface(totalArea)} TOTAL FLOOR AREA`,M+45,H-23,9,forest,'bold');
  text(`${project.items.length} OBJECTS`,M+126,H-23,9,forest,'bold');
  text(`EST. BOQ INR ${totalBudget.toLocaleString('en-IN')}`,M+175,H-23,9,forest,'bold');

  newPage('Spatial plan / editable room geometry');
  const allPoints=project.rooms.flatMap(r=>r.points), whole=bounds(allPoints);
  const hasSource=!!project.sourcePlan;
  const planBox={x:M,y:53,width:hasSource?157:contentW,height:115};
  pdf.setFillColor(244,246,245);pdf.roundedRect(planBox.x,planBox.y,planBox.width,planBox.height,2,2,'F');
  const metresToMm=Math.min((planBox.width-24)/Math.max(whole.width,1),(planBox.height-24)/Math.max(whole.depth,1));
  const px=(x:number)=>planBox.x+planBox.width/2+(x-whole.x)*metresToMm;
  const pz=(z:number)=>planBox.y+planBox.height/2+(z-whole.z)*metresToMm;
  project.rooms.forEach((room,index)=>{
    pdf.setFillColor(229,237,230);pdf.setDrawColor(...forest);pdf.setLineWidth(.45);
    const first=room.points[0];
    const deltas=room.points.slice(1).map((p,i)=>[(p.x-room.points[i].x)*metresToMm,(p.z-room.points[i].z)*metresToMm]);
    deltas.push([(first.x-room.points[room.points.length-1].x)*metresToMm,(first.z-room.points[room.points.length-1].z)*metresToMm]);
    pdf.lines(deltas,px(first.x),pz(first.z),[1,1],'F',true);
    for(let edge=0;edge<room.points.length;edge++){
      if(room.openEdges?.includes(edge))continue;
      const a=room.points[edge],b=room.points[(edge+1)%room.points.length],len=Math.hypot(b.x-a.x,b.z-a.z);
      const openings=wallOpenings(room,edge,project.rooms);let cursor=0;
      const segment=(start:number,end:number)=>{if(end>start){pdf.setDrawColor(...forest);pdf.setLineWidth(.7);pdf.line(px(a.x+(b.x-a.x)*start/len),pz(a.z+(b.z-a.z)*start/len),px(a.x+(b.x-a.x)*end/len),pz(a.z+(b.z-a.z)*end/len));}};
      for(const o of openings){const {start,end}=o;segment(cursor,start);if(o.type==='window'){pdf.setDrawColor(114,164,168);pdf.setLineWidth(.25);pdf.line(px(a.x+(b.x-a.x)*start/len),pz(a.z+(b.z-a.z)*start/len),px(a.x+(b.x-a.x)*end/len),pz(a.z+(b.z-a.z)*end/len));}cursor=Math.max(cursor,end);}segment(cursor,len);
    }
    const b=bounds(room.points);
    text(String(index+1),px(b.x)-1,pz(b.z),9,forest,'bold');
  });
  text(`Overall extents ${length(whole.width)} x ${length(whole.depth)}`,planBox.x+6,planBox.y+planBox.height-5,8,muted);
  if (project.sourcePlan) {
    const source=project.sourcePlan;
    text('REFERENCE PLAN',M+167,54,8,forest,'bold');
    imageFit(source.image,M+167,60,contentW-167,96);
    const sourceLines=pdf.splitTextToSize(pdfText(`${source.name} / page ${source.page}`),contentW-167) as string[];
    sourceLines.slice(0,2).forEach((row,i)=>text(row,M+167,162+i*4,7,muted));
  }
  cursor=178;
  paragraph('Plan dimensions use the project length unit; floor areas use the selected area unit. Room numbers refer to the room schedule. Traced plans and edited dimensions should be verified against site measurements before procurement or construction.',contentW,8,'Spatial plan / notes');

  newPage('Room schedule / dimensions and finishes');
  project.rooms.forEach((room,index)=>{
    const b=bounds(room.points);
    pdf.setFontSize(12);
    const roomTitle=pdf.splitTextToSize(pdfText(`${String(index+1).padStart(2,'0')}  ${room.name}`),contentW-12) as string[];
    const rowHeight=roomTitle.length*5+23;
    const openingNote=room.openings.map(o=>`${o.type}: wall ${o.edge+1}, ${length(o.width)} wide x ${length(o.height)} high, sill ${length(o.sill)}`).join('; ');pdf.setFontSize(8);const openingHeight=openingNote?Math.min(40,(pdf.splitTextToSize(pdfText(openingNote),contentW) as string[]).length*5+3):0;
    ensure(rowHeight+openingHeight,'Room schedule / continued');
    pdf.setFillColor(244,246,245);pdf.roundedRect(M,cursor-5,contentW,rowHeight-3,2,2,'F');
    roomTitle.forEach((row,i)=>text(row,M+5,cursor+i*5,12,forest,'bold'));
    const infoY=cursor+roomTitle.length*5+3;
    text(`${length(b.width)} x ${length(b.depth)} | height ${length(room.height)} | area ${surface(area(room.points))} | ceiling ${room.ceilingStyle||'flat'}`,M+5,infoY,9,ink);
    const accentInfo=room.accentWallEdge!==null&&room.accentWallEdge!==undefined?` | Feature Wall ${room.accentWallEdge+1}: ${room.accentWallColor}`:'';
    text(`Floor: ${room.floor} | Walls: ${room.wallColor} (${room.wallTexture||'paint'}${room.wallBrand?` - ${room.wallBrand}`:''})${accentInfo} | ${room.openings.length} opening${room.openings.length===1?'':'s'}`,M+5,infoY+6,9,muted);
    cursor+=rowHeight+5;
    if(openingNote) paragraph(openingNote,contentW,8,'Room schedule / openings');
  });

  newPage('Furniture and systems / specification & BOQ schedule');
  paragraph(`Estimated project furniture & systems BOQ total: INR ${totalBudget.toLocaleString('en-IN')}. Positions are room-plan coordinates (X / Z), with height above floor (Y). Dimensions are width x depth x height, using the selected project length unit.`,contentW,9,'Furniture and systems / continued');
  if (!project.items.length) paragraph('No furniture or systems have been placed in this project.');
  const roomNames=new Map(project.rooms.map(room=>[room.id,room.name]));
  project.items.forEach((item,index)=>{
    const brandName=item.brand??getBrandsForKind(item.kind)[0]?.brand??'Custom';
    const modelName=item.modelCode??getBrandsForKind(item.kind)[0]?.series[0]??'Standard';
    const price=getItemPrice(item);
    const heading=`${String(index+1).padStart(2,'0')}  ${item.name}  —  ${brandName} (${modelName})  |  INR ${price.toLocaleString('en-IN')}${item.enabled?'':' [OFF]'}${item.locked?' [LOCKED]':''}`;
    pdf.setFontSize(11);
    const headings=pdf.splitTextToSize(pdfText(heading),contentW-12) as string[];
    const customSpecs=[
      item.kind==='sofa'?`Sofa shape: ${item.sofaType||'three-seater'}, Arm: ${item.armStyle||'track'}, Legs: ${item.legStyle||'tapered-wood'}, Cushions: ${item.cushionCount||3}`:null,
      ['sofa','armchair','bed','single-bed','dining-chair'].includes(item.kind)?`Cloth weave: ${item.fabric||'plain'}`:null,
      item.kind==='socket'?`Switch module: ${item.switchGang||'4M'}, Plate finish: ${item.switchPlate||'matte'}`:null,
      item.frontStyle?`Shutter profile: ${item.frontStyle}`:null,
      item.topShape?`Tabletop: ${item.topShape}`:null,
      item.lightTemp?`Kelvin: ${item.lightTemp}`:null,
      item.accentColor?`Accent/Hardware: ${item.accentColor}`:null,
      item.specNote?`Note: ${item.specNote}`:null,
    ].filter(Boolean).join(' | ');
    const details=[
      `Room: ${roomNames.get(item.roomId)||'Unassigned'} | Type: ${item.kind}`,
      `Size: ${length(item.width)} x ${length(item.depth)} x ${length(item.height)} | Material: ${item.material} | Primary Colour: ${item.color}`,
      ...(customSpecs?[customSpecs]:[]),
      `Position X ${length(item.x)}, Z ${length(item.z)}, Y ${length(item.y)} | Rotation ${item.rotation.toFixed(0)} deg | Style ${item.variant+1}`,
    ];
    pdf.setFontSize(9);
    const rows=details.flatMap(detail=>pdf.splitTextToSize(pdfText(detail),contentW-12) as string[]);
    const rowHeight=headings.length*5+rows.length*5+10;
    ensure(rowHeight,'Furniture and systems / continued');
    headings.forEach(row=>{text(row,M+5,cursor,11,forest,'bold');cursor+=5;});
    cursor+=2;
    rows.forEach(row=>{text(row,M+5,cursor,9,muted);cursor+=5;});
    cursor+=4;line(cursor);cursor+=7;
  });

  newPage('Design notes / scope of this presentation');
  [
    'This presentation records the room geometry, finishes, brands, and customized specifications saved in this PlanSaathi project. The perspective image reflects the current studio view and visual settings at export time.',
    'This is an interior design concept, not a construction drawing. Verify dimensions, clearances, openings, materials, brand SKUs, and all site conditions with the relevant qualified professionals before ordering or building.',
    'AC airflow is an illustrative visual aid, not computational fluid dynamics (CFD), a cooling-load calculation or evidence of ventilation performance.',
    'Electrical outlets, switches, lights, ceiling fans and AC placements are design suggestions, not an electrical or mechanical engineering design. Qualified installers must verify circuit capacity, earthing, safety zones, mounting and applicable regulations.',
    'The reference plan remains a visual underlay. Assisted room tracing does not automatically detect walls, doors or structure. Numeric edits may change the relationship between the reconstructed room and that underlay.',
    'User text is converted to the character set supported by the PDF font. Unsupported characters appear as question marks; the editable PlanSaathi project retains the original text.',
  ].forEach(note=>paragraph(note,contentW,10,'Design notes / continued'));

  const pages=pdf.getNumberOfPages();
  for(let p=1;p<=pages;p++) {
    pdf.setPage(p);line(H-15);
    text('PLANSAATHI | INTERIOR CONCEPT & BOQ',M,H-9,7,muted);
    text(`${date} / ${p} of ${pages}`,W-M-42,H-9,7,muted);
  }
  const safeName=pdfText(project.name).replace(/[^a-zA-Z0-9 _-]/g,'').trim().replace(/\s+/g,'-').slice(0,80)||'PlanSaathi-project';
  pdf.save(`${safeName}-presentation.pdf`);
}
