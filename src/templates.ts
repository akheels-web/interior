import { bounds, createItem, createProject, id, openingError, round, validateProject, type Item, type Kind, type Project, type Room } from './model';

export type TemplateRoom = { name:string; x:number; z:number; width:number; depth:number; role:'living'|'bedroom'|'kitchen'|'bath'|'hall'|'utility' };
export type HomeTemplate = { id:string; name:string; category:'home'|'room'; bedrooms:number; widthFt:number; depthFt:number; description:string; rooms:readonly TemplateRoom[] };
const room=(name:string,role:TemplateRoom['role'],x:number,z:number,width:number,depth:number):TemplateRoom=>({name,role,x,z,width,depth});
function twoBedroom(width:number,depth:number):TemplateRoom[]{const side=(width-4)/2,front=12,middle=depth-26;return [room('Living & dining','living',0,0,width,front),room('Passage','hall',side,front,4,depth-front),room('Kitchen','kitchen',0,front,side,middle),room('Bathroom','bath',side+4,front,side,middle/2),room('Utility','utility',side+4,front+middle/2,side,middle/2),room('Bedroom 1','bedroom',0,front+middle,side,14),room('Bedroom 2','bedroom',side+4,front+middle,side,14)];}
export const HOME_TEMPLATES:readonly HomeTemplate[]=[
  {id:'compact-20-30',name:'The compact one',category:'home',bedrooms:1,widthFt:20,depthFt:30,description:'A compact 1 BHK with a central passage, separate kitchen and bathroom.',rooms:[room('Living & dining','living',0,0,20,12),room('Passage','hall',8,12,4,18),room('Kitchen','kitchen',0,12,8,10),room('Bathroom','bath',0,22,8,8),room('Bedroom','bedroom',12,12,8,18)]},
  {id:'compact-20-40',name:'The narrow home',category:'home',bedrooms:2,widthFt:20,depthFt:40,description:'Two compact bedrooms and a connected living zone for a narrow envelope.',rooms:twoBedroom(20,40)},
  {id:'family-25-40',name:'The everyday home',category:'home',bedrooms:2,widthFt:25,depthFt:40,description:'A 2 BHK starting point with a kitchen, utility and central circulation.',rooms:twoBedroom(25,40)},
  {id:'family-30-40',name:'The family edit',category:'home',bedrooms:2,widthFt:30,depthFt:40,description:'A wider 2 BHK concept with generous living space and two rear bedrooms.',rooms:twoBedroom(30,40)},
  {id:'family-30-50',name:'Room for everyone',category:'home',bedrooms:3,widthFt:30,depthFt:50,description:'Three bedrooms, a separate dining zone and a central passage.',rooms:[room('Living room','living',0,0,30,14),room('Passage','hall',13,14,4,36),room('Kitchen','kitchen',0,14,13,12),room('Dining room','living',0,26,13,10),room('Bedroom 1','bedroom',0,36,13,14),room('Bedroom 2','bedroom',17,14,13,14),room('Bathroom','bath',17,28,13,8),room('Bedroom 3','bedroom',17,36,13,14)]},
  {id:'family-30-60',name:'The spacious home',category:'home',bedrooms:3,widthFt:30,depthFt:60,description:'A larger 3 BHK canvas with separate dining and room to refine your brief.',rooms:[room('Living room','living',0,0,30,16),room('Passage','hall',13,16,4,44),room('Kitchen','kitchen',0,16,13,12),room('Dining room','living',0,28,13,12),room('Bedroom 1','bedroom',0,40,13,20),room('Bedroom 2','bedroom',17,16,13,16),room('Bathroom','bath',17,32,13,8),room('Bedroom 3','bedroom',17,40,13,20)]},
  {id:'living-12-16',name:'The living room',category:'room',bedrooms:0,widthFt:12,depthFt:16,description:'A single-room concept for trying seating, materials and lighting.',rooms:[room('Living room','living',0,0,12,16)]},
  {id:'bedroom-12-12',name:'The restful room',category:'room',bedrooms:1,widthFt:12,depthFt:12,description:'A bedroom starter with an editable bed, wardrobe and lighting.',rooms:[room('Bedroom','bedroom',0,0,12,12)]},
];
export const TEMPLATE_NOTE='Original editable concepts. Envelope dimensions exclude any allowance for setbacks or wall thickness; confirm your actual space. Not construction, approval or Vastu-certified drawings.';
export function getTemplate(value:string){return HOME_TEMPLATES.find(template=>template.id===value);}
export function isProjectTemplate(value:unknown):value is string{return typeof value==='string'&&(value==='blank'||value==='sample'||!!getTemplate(value));}
const FT=.3048;
/** Original layouts. References document common size formats, never supply copied drawings. */
export function buildTemplateProject(templateId:string,furnished=true):Project{
  if(!isProjectTemplate(templateId))throw new Error('Choose an available project template.');
  if(templateId==='blank'||templateId==='sample'){const project=createProject();project.client='';if(templateId==='blank'||!furnished)project.items=[];return project;}
  const template=getTemplate(templateId)!;
  const rooms:Room[]=template.rooms.map(spec=>({id:id(),name:spec.name,points:[{x:spec.x,z:spec.z},{x:spec.x+spec.width,z:spec.z},{x:spec.x+spec.width,z:spec.z+spec.depth},{x:spec.x,z:spec.z+spec.depth}].map(p=>({x:round((p.x-template.widthFt/2)*FT,6),z:round((p.z-template.depthFt/2)*FT,6)})),height:2.9,wallColor:spec.role==='bath'?'#e8edf0':'#f3f0e9',floor:spec.role==='bath'||spec.role==='utility'?'ceramic':spec.role==='kitchen'?'terrazzo':'oak',openings:[]}));
  const hall=template.rooms.findIndex(r=>r.role==='hall');
  function addDoor(target:Room,edge:number,offset:number,width=.82,main=false){target.openings.push({id:id(),edge,offset:round(offset,6),width,height:2.1,sill:0,type:'door',doorStyle:main?'main':'interior',hinge:'left',swing:75});}
  if(hall>=0){const h=bounds(rooms[hall].points);rooms.forEach((r,index)=>{if(index===hall)return;const b=bounds(r.points);let edge=-1,start=0,end=0;
    if(Math.abs(b.maxX-h.minX)<1e-5){edge=1;start=Math.max(b.minZ,h.minZ);end=Math.min(b.maxZ,h.maxZ);}
    else if(Math.abs(b.minX-h.maxX)<1e-5){edge=3;start=Math.max(b.minZ,h.minZ);end=Math.min(b.maxZ,h.maxZ);}
    else if(Math.abs(b.maxZ-h.minZ)<1e-5){edge=2;start=Math.max(b.minX,h.minX);end=Math.min(b.maxX,h.maxX);}
    else if(Math.abs(b.minZ-h.maxZ)<1e-5){edge=0;start=Math.max(b.minX,h.minX);end=Math.min(b.maxX,h.maxX);}
    if(edge<0||end-start<.92)throw new Error('This template needs a connected passage.');
    const centre=(start+end)/2,offset=edge===1?(centre-b.minZ)/b.depth:edge===3?(b.maxZ-centre)/b.depth:edge===2?(b.maxX-centre)/b.width:(centre-b.minX)/b.width;addDoor(r,edge,offset);
  });}
  addDoor(rooms[0],0,.5,1,true);
  rooms.forEach((r,index)=>{if(template.rooms[index].role==='hall')return;const b=bounds(r.points),outerW=template.widthFt*FT/2,outerD=template.depthFt*FT/2;
    const edges=[{edge:3,outer:Math.abs(b.minX+outerW)<1e-5,length:b.depth},{edge:1,outer:Math.abs(b.maxX-outerW)<1e-5,length:b.depth},{edge:2,outer:Math.abs(b.maxZ-outerD)<1e-5,length:b.width},{edge:0,outer:Math.abs(b.minZ+outerD)<1e-5,length:b.width}];
    const wall=edges.find(e=>e.outer&&!r.openings.some(o=>o.edge===e.edge));if(!wall)return;
    const small=['bath','utility'].includes(template.rooms[index].role);r.openings.push({id:id(),edge:wall.edge,offset:.5,width:Math.min(small?.6:1.35,wall.length-.3),height:small?.6:1.25,sill:small?1.65:.85,type:'window'});
    if(openingError(r))throw new Error('Template openings must fit their walls.');
  });
  const items:Item[]=[];
  if(furnished)rooms.forEach((r,index)=>{const b=bounds(r.points),role=template.rooms[index].role;
    function place(kind:Kind,x:number,z:number,patch:Partial<Item>={}){items.push({...createItem(kind,r),x:round(x,5),z:round(z,5),...patch});}
    if(role==='bedroom'){place('bed',b.x,b.minZ+1.3,{width:Math.min(1.6,b.width-.7),depth:2.1});place('wardrobe',b.x,b.maxZ-.35,{width:Math.min(1.5,b.width-.6),depth:.55});place('ceiling-light',b.x,b.z,{enabled:false});}
    if(role==='living'&&r.name!=='Dining room'){place('sofa',b.x,b.maxZ-.7,{width:Math.min(2.4,b.width-1),depth:.9,sofaType:'three-seater',fabric:'woven',color:'#737f9d'});place('tv-unit',b.x,b.minZ+.3,{width:Math.min(1.6,b.width-.8),depth:.35});place('coffee-table',b.x,b.z,{width:1.0,depth:.55});place('ceiling-fan',b.x,b.z,{enabled:false});}
    if(r.name==='Dining room')place('dining-table',b.x,b.z,{width:1.5,depth:.85});
    if(role==='kitchen'){place('kitchen-sink',b.x,b.minZ+.4,{width:1.1});place('fridge',b.maxX-.45,b.maxZ-.5,{width:.65,depth:.65,enabled:false});}
    if(role==='bath'){place('toilet',b.minX+.5,b.minZ+.55);place('vanity',b.maxX-.55,b.maxZ-.35,{width:.65,depth:.45});}
    if(role==='utility')place('washing-machine',b.x,b.z,{enabled:false});
  });
  return validateProject({version:1,id:id(),name:template.name,client:'',rooms,items,units:{length:'ft',area:'ft2'},updatedAt:new Date().toISOString()});
}
