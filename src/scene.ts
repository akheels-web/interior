import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FLOOR_FINISHES, LIGHT_TEMPS, wallOpenings, wallSolids, bounds, clamp, round, type Item, type Project, type Room, type Settings } from './model';
import { formatLength, getUnits } from './units';
import { surfaceTexture } from './sceneMaterials';
import { createAirflow, motionIsPlaying } from './airflow';
import { applyWallView, shellClipEnabled } from './wallView';

type Callbacks = { onSelect:(id:string|null)=>void; onMove:(id:string,x:number,z:number)=>void; onError:(message:string)=>void };
type Label = { element:HTMLDivElement; position:T.Vector3; roomId?:string };
type Wall = { group:T.Group; midpoint:T.Vector3; normal:T.Vector3 };
const rad = T.MathUtils.degToRad;
const mat = (color:string, roughness=.7, metalness=0) => new T.MeshStandardMaterial({color,roughness,metalness});
function box(g:T.Group,w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material, radius=.025) { const mesh=new T.Mesh(radius?new RoundedBoxGeometry(Math.max(.005,w),Math.max(.005,h),Math.max(.005,d),2,Math.min(radius,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh; }
function cylinder(g:T.Group,rt:number,rb:number,h:number,x:number,y:number,z:number,m:T.Material,segments=32) { const mesh=new T.Mesh(new T.CylinderGeometry(rt,rb,h,segments),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh; }
function sphere(g:T.Group,r:number,x:number,y:number,z:number,m:T.Material,sx=1,sy=1,sz=1) { const mesh=new T.Mesh(new T.SphereGeometry(r,18,12),m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;g.add(mesh);return mesh; }
function line(g:T.Group,points:T.Vector3[],color:string,opacity=1,dashed=false) { const geo=new T.BufferGeometry().setFromPoints(points); const material=dashed?new T.LineDashedMaterial({color,transparent:true,opacity,dashSize:.12,gapSize:.08}):new T.LineBasicMaterial({color,transparent:true,opacity});const l=new T.Line(geo,material);l.computeLineDistances();g.add(l);return l; }
function disposeTree(g:T.Object3D) { const materials=new Set<T.Material>();g.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>materials.add(x));});materials.forEach(m=>m.dispose()); }
export function fitFurnitureDimensions(group:T.Group,dimensions:{width:number;height:number;depth:number}) { group.updateMatrixWorld(true);const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());if(size.x<=0||size.y<=0||size.z<=0)return;const content=new T.Group();for(const child of [...group.children])content.add(child);content.position.set(-center.x,-box.min.y,-center.z);group.add(content);group.scale.set(dimensions.width/size.x,dimensions.height/size.y,dimensions.depth/size.z);group.updateMatrixWorld(true); }

function floorTexture(kind:string) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d')!;
  let seed=23;const rng=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
  const palette:Record<string,string>={stone:'#d5d0c5',concrete:'#b9bcb7',marble:'#e8e7e1',terrazzo:'#d5cabc',ceramic:'#ded8ca',slate:'#656f70',terracotta:'#b77453',carpet:'#b9b1a1',herringbone:'#b28d61'};
  c.fillStyle=palette[kind]??'#b8986a';c.fillRect(0,0,512,512);
  if(kind==='oak'||kind==='walnut'){
    const base=kind==='oak'?[183,148,108]:[105,77,53];
    for(let i=0;i<8;i++){const variation=Math.floor(rng()*22-11);c.fillStyle=`rgb(${base[0]+variation},${base[1]+variation},${base[2]+variation})`;c.fillRect(i*64,0,64,512);for(let n=0;n<65;n++){c.strokeStyle=`rgba(50,32,18,${rng()*.1})`;c.beginPath();const x=i*64+rng()*62;c.moveTo(x,0);c.bezierCurveTo(x+rng()*3,130,x-rng()*3,330,x+1,512);c.stroke();}c.fillStyle='rgba(60,42,26,.15)';c.fillRect(i*64,0,1,512);c.fillRect(i*64,(i%3)*140,64,1);}
  }else if(kind==='herringbone'){
    c.save();c.translate(256,256);c.rotate(Math.PI/4);for(let y=-512;y<512;y+=64)for(let x=-512;x<512;x+=128){c.fillStyle=['#ac865b','#c09c70','#b28b61','#c7a77e'][Math.floor(rng()*4)];c.fillRect(x+(y%128?64:0),y,126,62);c.strokeStyle='#8f704e';c.strokeRect(x+(y%128?64:0),y,126,62);}c.restore();
  }else{
    for(let i=0;i<9000;i++){c.fillStyle=`rgba(50,50,45,${rng()*(kind==='carpet'?.22:.07)})`;c.fillRect(rng()*512,rng()*512,rng()*2+.2,rng()*2+.2);}
    if(kind==='marble'){for(let i=0;i<7;i++){c.strokeStyle='rgba(110,119,117,.22)';c.lineWidth=.5+rng()*2;c.beginPath();c.moveTo(rng()*512,0);c.bezierCurveTo(rng()*512,140,rng()*512,300,rng()*512,512);c.stroke();}}
    if(kind==='terrazzo')for(let i=0;i<650;i++){c.fillStyle=['#efe7da','#7e8d80','#a6806b','#c0ad93'][i%4];c.beginPath();const x=rng()*512,y=rng()*512;c.moveTo(x,y);c.lineTo(x+rng()*10,y+3);c.lineTo(x+3,y+rng()*9);c.fill();}
    if(['ceramic','slate','terracotta','stone'].includes(kind)){c.strokeStyle=kind==='slate'?'#3f4947':'#aaa79a';c.lineWidth=2;for(let i=0;i<=512;i+=128){c.beginPath();c.moveTo(i,0);c.lineTo(i,512);c.moveTo(0,i);c.lineTo(512,i);c.stroke();}}
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(.65,.65);texture.anisotropy=8;return texture;
}

export class StudioScene {
  renderer:T.WebGLRenderer;scene=new T.Scene();camera:T.PerspectiveCamera|T.OrthographicCamera=new T.PerspectiveCamera(37,1,.05,500);controls:OrbitControls;private orthoSpan=10;private cutawayPlane=new T.Plane(new T.Vector3(0,-1,0),1.05);
  root=new T.Group();grid=new T.GridHelper(100,100,'#bac4b9','#dce1da');sun=new T.DirectionalLight('#fff3df',3);ambient=new T.HemisphereLight('#f9fcfa','#a3a793',2);
  private element:HTMLElement;private callbacks:Callbacks;private labels:Label[]=[];private walls:Wall[]=[];private groups=new Map<string,T.Group>();private fans:{group:T.Group;enabled:boolean;speed:number}[]=[];private lamps:T.PointLight[]=[];private airParticles:{mesh:T.Mesh;curve:T.CatmullRomCurve3;phase:number;speed:number}[]=[];private windMaterials:T.ShaderMaterial[]=[];private air=new T.Group();private electric=new T.Group();private textures:Record<string,T.CanvasTexture>;private selected:T.BoxHelper|null=null;private frame=0;private resizeObserver:ResizeObserver;private ray=new T.Raycaster();private pointer=new T.Vector2();private plane=new T.Plane();private drag:{item:Item;group:T.Group;offset:T.Vector3;startX:number;startY:number;moved:boolean}|null=null;private pointerStart={x:0,y:0};private keys=new Set<string>();private lastTime=0;private animationTime=0;private reduced=window.matchMedia('(prefers-reduced-motion: reduce)');private disposed=false;private dirty=true;private labelMatrix=new T.Matrix4();private frameCount=0;private roomBuilds=0;private objectBuilds=0;private lastLabelOptions='';private selectionId:string|null=null;private lastProject:Project|null=null;private settings:Settings|null=null;
  constructor(element:HTMLElement,callbacks:Callbacks) { this.element=element;this.callbacks=callbacks;this.renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false});this.renderer.localClippingEnabled=true;this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;this.renderer.setClearColor('#edf0eb');this.renderer.domElement.tabIndex=0;this.renderer.domElement.setAttribute('aria-label','Interactive 3D room. Drag furniture to move it. Use the properties panel to edit with a keyboard. In Walk view use W A S D to move.');this.renderer.domElement.setAttribute('role','img');element.appendChild(this.renderer.domElement);this.textures=Object.fromEntries([...FLOOR_FINISHES.map(f=>[f.id,floorTexture(f.id)]),...['plain','woven','boucle','ribbed','tufted','suede','cane','limewash','brick','wood-panel','wall-concrete','wainscoting','marble-cladding','wallpaper'].map(style=>[style,surfaceTexture(style)])]);
    this.scene.background=new T.Color('#edf0eb');this.scene.fog=new T.Fog('#edf0eb',35,100);this.scene.add(this.root,this.grid,this.sun,this.ambient);this.sun.position.set(-3,10,5);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:.5,far:50});this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.035;this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.addEventListener('change',this.markDirty);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.minDistance=.8;this.controls.maxDistance=100;this.controls.maxPolarAngle=Math.PI*.49;this.controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.PAN};this.controls.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(element);this.resize();
    this.renderer.domElement.addEventListener('pointerdown',this.pointerDown);this.renderer.domElement.addEventListener('pointermove',this.pointerMove);this.renderer.domElement.addEventListener('pointerup',this.pointerUp);this.renderer.domElement.addEventListener('pointercancel',this.pointerCancel);this.renderer.domElement.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);this.frame=requestAnimationFrame(this.tick);
  }
  private markDirty=()=>{this.dirty=true;};
  private contextLost=(e:Event)=>{e.preventDefault();this.callbacks.onError('The 3D graphics context was interrupted. Your project remains open. Download a project JSON backup and check account save status before reloading the view.');};
  private resize(){this.dirty=true;const w=this.element.clientWidth,h=this.element.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);if(this.camera instanceof T.PerspectiveCamera)this.camera.aspect=w/h;else{this.camera.left=-this.orthoSpan*w/h/2;this.camera.right=this.orthoSpan*w/h/2;this.camera.top=this.orthoSpan/2;this.camera.bottom=-this.orthoSpan/2;}this.camera.updateProjectionMatrix();if(this.lastProject)this.fit();}
  update(project:Project,settings:Settings,selectedId:string|null){const changed=this.lastProject!==project;const previousCamera=this.settings?.camera;const previousRoom=this.settings?.roomId;const previousWhole=this.settings?.wholeHome;this.settings=settings;this.dirty=true;if(changed){this.syncProject(project);this.lastProject=project;this.dirty=true;}const clipped=shellClipEnabled(settings);for(const child of this.root.children){if(!child.userData.door&&!this.walls.some(w=>w.group===child))continue;child.traverse(object=>{const material=(object as T.Mesh).material;if(!material)return;for(const m of Array.isArray(material)?material:[material]){if(!!m.clippingPlanes?.length!==clipped){m.clippingPlanes=clipped?[this.cutawayPlane]:null;m.clipShadows=true;m.needsUpdate=true;}}});}this.grid.visible=settings.showGrid;this.air.visible=settings.airflow;this.electric.visible=settings.electrical;
    const mood=settings.mood??'studio';
    if(mood==='golden'){this.sun.color.set('#ffd29d');this.ambient.color.set('#ffeacc');this.sun.position.set(-8,6,7);this.sun.intensity=.5+settings.daylight/100*3.4;this.ambient.intensity=.75+settings.daylight/100*.7;}
    else if(mood==='evening'){this.sun.color.set('#9ab4d8');this.ambient.color.set('#c4cfe0');this.sun.position.set(-4,8,4);this.sun.intensity=.2+settings.daylight/100*1.2;this.ambient.intensity=.45+settings.daylight/100*.5;}
    else if(mood==='gallery'){this.sun.color.set('#ffffff');this.ambient.color.set('#ffffff');this.sun.position.set(-2,12,4);this.sun.intensity=.8+settings.daylight/100*3.5;this.ambient.intensity=1.0+settings.daylight/100*.9;}
    else{this.sun.color.set('#fff3df');this.ambient.color.set('#f9fcfa');this.sun.position.set(-3,10,5);this.sun.intensity=.4+settings.daylight/100*3.2;this.ambient.intensity=.8+settings.daylight/100*.8;}
    this.lamps.forEach(l=>l.visible=settings.lights);if(previousCamera!==settings.camera||previousRoom!==settings.roomId||previousWhole!==settings.wholeHome||!previousCamera)this.fit();this.setSelection(settings.presenting?null:selectedId);}
  private addLabel(text:string,position:T.Vector3,dimension=false,roomId?:string){const element=document.createElement('div');element.className=dimension?'scene-dimension':'scene-room-label';element.textContent=text;element.style.position='absolute';element.style.left='0';element.style.top='0';element.style.pointerEvents='none';this.element.appendChild(element);this.labels.push({element,position,roomId});}
  private syncProject(project:Project){
    const previous=this.lastProject;
    if(!previous||previous.id!==project.id||previous.rooms.length!==project.rooms.length||previous.rooms.some((r,i)=>r!==project.rooms[i])||previous.units!==project.units){this.rebuild(project);return;}
    const old=new Map(previous.items.map(item=>[item.id,item])),nextIds=new Set(project.items.map(item=>item.id));let systemsChanged=false;
    const remove=(itemId:string)=>{if(this.selectionId===itemId&&this.selected){this.scene.remove(this.selected);this.selected.dispose();this.selected=null;this.selectionId=null;}const group=this.groups.get(itemId);if(!group)return;group.traverse(o=>{this.fans=this.fans.filter(f=>f.group!==o);this.lamps=this.lamps.filter(l=>l!==o);});this.root.remove(group);disposeTree(group);this.groups.delete(itemId);};
    for(const item of previous.items)if(!nextIds.has(item.id)){remove(item.id);systemsChanged=true;}
    for(const item of project.items){const before=old.get(item.id);if(before===item)continue;
      const transformOnly=before&&['kind','width','height','depth','color','material','variant','enabled','sofaType','fabric','armStyle','legStyle','cushionCount','accentColor','switchGang','switchPlate','lightTemp','frontStyle','topShape'].every(key=>before[key as keyof Item]===item[key as keyof Item]);
      if(!transformOnly)remove(item.id);
      let group=this.groups.get(item.id);
      if(!group){group=this.makeItem(item);group.userData.itemId=item.id;group.traverse(o=>o.userData.itemId=item.id);this.root.add(group);this.groups.set(item.id,group);}
      group.position.set(item.x,item.y,item.z);group.rotation.y=rad(item.rotation);
      if(item.kind==='ceiling-fan')group.traverse(o=>{const fan=this.fans.find(f=>f.group===o);if(fan){fan.speed=item.powerLevel??60;fan.enabled=item.enabled;}});
      if(['ac','tower-ac','cassette-ac','ceiling-fan','socket','floor-lamp','tv-unit','computer','desk','fridge','washing-machine','chimney','hob','microwave','ups','inverter'].some(kind=>kind===item.kind||kind===before?.kind))systemsChanged=true;
    }
    if(systemsChanged){disposeTree(this.air);disposeTree(this.electric);this.root.remove(this.air,this.electric);this.air=new T.Group();this.electric=new T.Group();this.root.add(this.air,this.electric);this.airParticles=[];this.windMaterials=[];for(const item of project.items)if(['ac','tower-ac','cassette-ac','ceiling-fan'].includes(item.kind))this.makeAirflow(item);this.makeElectrical(project);}
    this.selected?.update();
  }
  private rebuild(project:Project){this.selectionId=null;this.drag=null;this.controls.enabled=true;if(this.selected){this.scene.remove(this.selected);this.selected.dispose();this.selected=null;}disposeTree(this.root);this.root.clear();this.labels.forEach(l=>l.element.remove());this.labels=[];this.walls=[];this.groups.clear();this.fans=[];this.lamps=[];this.airParticles=[];this.windMaterials=[];this.air=new T.Group();this.electric=new T.Group();this.root.add(this.air,this.electric);
    const overall=bounds(project.rooms.flatMap(r=>r.points));const ground=new T.Mesh(new T.PlaneGeometry(Math.max(100,overall.width*3),Math.max(100,overall.depth*3)),new T.ShadowMaterial({opacity:.1}));ground.rotation.x=-Math.PI/2;ground.position.set(overall.x,-.19,overall.z);ground.receiveShadow=true;this.root.add(ground);this.grid.position.y=-.16;
    for(const room of project.rooms)this.makeRoom(room,project);for(const item of project.items){const group=this.makeItem(item);group.userData.itemId=item.id;group.traverse(o=>o.userData.itemId=item.id);group.position.set(item.x,item.y,item.z);group.rotation.y=rad(item.rotation);this.root.add(group);this.groups.set(item.id,group);if(['ac','tower-ac','cassette-ac','ceiling-fan'].includes(item.kind))this.makeAirflow(item);}
    this.makeElectrical(project);}
  private makeRoom(room:Room,project:Project){this.roomBuilds=(this.roomBuilds??0)+1;
    const shape=new T.Shape(room.points.map(p=>new T.Vector2(p.x,-p.z)));
    const floor=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:false}),new T.MeshStandardMaterial({map:this.textures?.[room.floor]??null,color:'#ffffff',roughness:.65}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-.13;floor.receiveShadow=true;this.root.add(floor);
    const b=bounds(room.points),units=getUnits(project);
    this.addLabel(room.name,new T.Vector3(b.x,.02,b.z),false,room.id);
    this.addLabel(formatLength(b.width,units.length),new T.Vector3(b.x,.01,b.maxZ+.25),true,room.id);
    this.addLabel(formatLength(b.depth,units.length),new T.Vector3(b.maxX+.35,.01,b.z),true,room.id);
    const dimensionGroup=new T.Group();
    for(const [a,c] of [[new T.Vector3(b.minX,.01,b.maxZ+.18),new T.Vector3(b.maxX,.01,b.maxZ+.18)],[new T.Vector3(b.maxX+.18,.01,b.minZ),new T.Vector3(b.maxX+.18,.01,b.maxZ)]] as [T.Vector3,T.Vector3][]){line(dimensionGroup,[a,c],'#89958c',.6);for(const p of [a,c])line(dimensionGroup,[p.clone().add(new T.Vector3(-.06,0,-.06)),p.clone().add(new T.Vector3(.06,0,.06))],'#89958c',.7);}
    dimensionGroup.userData.dimensions=true;dimensionGroup.userData.roomId=room.id;this.root.add(dimensionGroup);
    if(room.ceilingStyle&&room.ceilingStyle!=='flat'){
      const cg=new T.Group();cg.position.set(b.x,room.height-.04,b.z);
      if(room.ceilingStyle==='cove'){
        const glow=new T.MeshStandardMaterial({color:'#fff4db',emissive:'#ffcf87',emissiveIntensity:1.1,roughness:.3});
        const trim=mat('#f5f1e8',.8);
        box(cg,Math.max(.4,b.width-.35),.035,Math.max(.4,b.depth-.35),0,-.02,0,trim,.01);
        box(cg,Math.max(.5,b.width-.22),.015,Math.max(.5,b.depth-.22),0,0,0,glow,.005);
      }else if(room.ceilingStyle==='coffered'){
        const beam=mat('#ebe5d9',.75);
        for(const z of [-b.depth*.25,0,b.depth*.25])box(cg,b.width*.94,.06,.08,0,-.01,z,beam,.005);
        for(const x of [-b.width*.25,0,b.width*.25])box(cg,.08,.06,b.depth*.94,x,-.01,0,beam,.005);
      }else if(room.ceilingStyle==='rafters'){
        const wood=mat('#8b6849',.55);
        const count=Math.max(3,Math.min(9,Math.round(b.width/.75)));
        for(let r=0;r<count;r++){const rx=-b.width*.42+r*(b.width*.84/Math.max(1,count-1));box(cg,.07,.09,b.depth*.94,rx,-.02,0,wood,.006);}
      }
      this.root.add(cg);
    }
    const signed=room.points.reduce((v,p,i)=>{const n=room.points[(i+1)%room.points.length];return v+p.x*n.z-n.x*p.z;},0);
    for(let i=0;i<room.points.length;i++){
      const a=room.points[i],c=room.points[(i+1)%room.points.length],dx=c.x-a.x,dz=c.z-a.z,len=Math.hypot(dx,dz);
      if(len<.01||room.openEdges?.includes(i))continue;
      const g=new T.Group();g.position.set((a.x+c.x)/2,0,(a.z+c.z)/2);g.rotation.y=-Math.atan2(dz,dx);
      const plan=new T.Group();plan.position.copy(g.position);plan.rotation.copy(g.rotation);plan.userData.planOutline=true;this.root.add(plan);
      const isAccent=room.accentWallEdge===i&&!!room.accentWallColor;
      const wallCol=isAccent?room.accentWallColor!:room.wallColor;
      const texKey=room.wallTexture&&room.wallTexture!=='paint'?(room.wallTexture==='concrete'?'wall-concrete':room.wallTexture):null;
      const wallTex=texKey?(this.textures?.[texKey]??null):null;
      const m=new T.MeshStandardMaterial({color:wallCol,roughness:room.wallTexture==='marble-cladding'?.35:.9,map:wallTex,bumpMap:wallTex,bumpScale:room.wallTexture==='brick'?.035:room.wallTexture==='wood-panel'||room.wallTexture==='wainscoting'?.02:.008});
      const skirting=mat(room.skirtingColor??'#e8e3d9',.6);
      const defaultFrame=mat('#a9957a',.6);
      const segment=(start:number,end:number,bottom=0,height=room.height)=>{if(end-start>.015&&height>.015){box(g,end-start,height,.12,(start+end)/2-len/2,bottom+height/2,0,m,.005);if(bottom===0){box(g,end-start,.075,.15,(start+end)/2-len/2,.04,-.005,skirting,.005);line(plan,[new T.Vector3(start-len/2,.025,0),new T.Vector3(end-len/2,.025,0)],'#4b5e52');}}};
      const openings=wallOpenings(room,i,project.rooms);for(const solid of wallSolids(room,i,project.rooms))segment(solid.start,solid.end,solid.bottom,solid.top-solid.bottom);
      for(const o of openings){if(o.derived)continue;const width=o.end-o.start,top=Math.min(room.height,o.sill+o.height),center=(o.start+o.end)/2-len/2;
        const frame=o.frameColor?mat(o.frameColor,.55):defaultFrame;
        if(!o.derived){for(const x of [o.start-len/2,o.end-len/2])box(g,.045,top-o.sill,.15,x,(top+o.sill)/2,0,frame,.003);box(g,width+.05,.045,.15,center,top,0,frame,.003);}
        if(o.type==='window'&&!o.derived){box(g,width,.045,.22,center,o.sill,0,frame,.003);const glass=new T.MeshPhysicalMaterial({color:'#bad4d4',transparent:true,opacity:.25,roughness:.12,metalness:.1,side:T.DoubleSide});box(g,width,top-o.sill,.015,center,(top+o.sill)/2,0,glass,0);box(g,.035,top-o.sill,.035,center,(top+o.sill)/2,0,frame,0);line(plan,[new T.Vector3(o.start-len/2,.025,0),new T.Vector3(o.end-len/2,.025,0)],'#72a4a8');}
        else if(!o.derived&&o.doorStyle!=='opening'){
          const door=new T.Group();door.position.copy(g.position);door.rotation.copy(g.rotation);door.userData.door=true;this.root.add(door);
          const right=o.hinge==='right',hingeX=(right?o.end:o.start)-len/2,dir=right?-1:1,angle=rad(o.swing??70),leaf=new T.Group();leaf.position.x=hingeX;leaf.rotation.y=-dir*angle*(signed>=0?1:-1);
          const dm=o.doorStyle==='glass'?new T.MeshPhysicalMaterial({color:'#b2d5d3',transparent:true,opacity:.4,roughness:.08,side:T.DoubleSide}):mat(o.frameColor||(o.doorStyle==='main'?'#79583f':'#bb9e79'),.5);
          if(o.doorStyle==='sliding'){leaf.rotation.y=0;leaf.position.x+=dir*width*(o.swing??70)/110;}
          box(leaf,width-.04,top-.05,.045,dir*width/2,(top-.05)/2,0,dm,.008);box(leaf,.035,.1,.065,dir*(width-.13),top*.46,.045,mat('#b9a070',.25,.8),.006);
          if(o.doorStyle==='main')for(const y of [top*.3,top*.7])box(leaf,width*.7,top*.3,.015,dir*width/2,y,.03,mat('#8d6949'),.005);
          door.add(leaf);
          if(o.doorStyle!=='sliding'){const arc=Array.from({length:29},(_,j)=>{const t=j/28*angle;return new T.Vector3(hingeX+dir*Math.cos(t)*width,.035,Math.sin(t)*width*(signed>=0?1:-1));});line(plan,arc,'#9b886b',.8,true);line(plan,[new T.Vector3(hingeX,.035,0),arc[arc.length-1]],'#9b886b',.8);}
        }
      }
      const outline=line(g,[new T.Vector3(-len/2,0,0),new T.Vector3(-len/2,room.height,0),new T.Vector3(len/2,room.height,0),new T.Vector3(len/2,0,0)],'#80959c',.5);outline.userData.wallOutline=true;outline.visible=false;
      const normal=new T.Vector3(dz,0,-dx).normalize().multiplyScalar(signed>=0?1:-1);this.walls.push({group:g,midpoint:g.position.clone(),normal});this.root.add(g);
    }
  }
  private makeItem(item:Item){this.objectBuilds=(this.objectBuilds??0)+1;const g=new T.Group();const w=item.width,d=item.depth,h=item.height;
    const texMap=item.material==='wood'?(this.textures?.oak??null):item.material==='stone'?(this.textures?.stone??null):['linen','velvet','leather'].includes(item.material)?(this.textures?.[item.fabric??'plain']??null):null;
    const bumpTex=['linen','velvet','leather'].includes(item.material)?(this.textures?.[item.fabric??'plain']??null):null;
    const fabric=new T.MeshPhysicalMaterial({color:item.color,roughness:item.material==='leather'?.35:item.material==='metal'?.28:item.material==='wood'?.55:item.fabric==='suede'?.82:.9,metalness:item.material==='metal'?.75:0,sheen:item.material==='velvet'||item.fabric==='suede'?.85:0,sheenColor:item.color,transparent:item.material==='glass',opacity:item.material==='glass'?.45:1,side:T.DoubleSide,map:texMap,bumpMap:bumpTex,bumpScale:item.fabric==='boucle'||item.fabric==='tufted'?.028:.008});
    const dark=mat('#343a35',.6);const wood=mat('#947051',.6);const cream=mat('#e5dfd0',.95);
    const accentMat=mat(item.accentColor??'#c5a059',.35,.55);
    const cushionAccent=mat(item.accentColor??(item.kind==='sofa'?'#cbbda4':'#76816d'),.9);
    const legs=(y=.12)=>{
      const style=item.legStyle??'tapered-wood';
      if(style==='floating'){box(g,w*.68,y,d*.62,0,y/2,0,dark,.01);return;}
      if(style==='plinth'){box(g,w*.94,y,d*.9,0,y/2,0,item.accentColor?accentMat:wood,.015);return;}
      if(style==='matte-black-sled'){
        for(const x of [-w*.38,w*.38]){box(g,.022,y,d*.74,x,y/2,0,dark,.005);}
        return;
      }
      const legMat=style==='brass-stiletto'?mat(item.accentColor??'#c5a059',.25,.85):wood;
      const topR=style==='brass-stiletto'?.016:.022;
      const botR=style==='brass-stiletto'?.009:.015;
      for(const x of [-w*.38,w*.38])for(const z of [-d*.34,d*.34])cylinder(g,topR,botR,y,x,y/2,z,legMat,12);
    };
    if(item.kind==='sofa'&&(item.sofaType==='l-left'||item.sofaType==='l-right')){
      const left=item.sofaType==='l-left'?-1:1;
      const cCount=item.cushionCount??3;
      box(g,w,h*.25,d*.53,0,h*.25,-d*.23,fabric,.07);
      box(g,w,h*.48,d*.14,0,h*.74,-d*.43,fabric,.07);
      for(let i=0;i<cCount;i++){const cw=(w*.86)/cCount;box(g,cw*.92,h*.2,d*.4,-w*.43+cw*(i+.5),h*.48,-d*.2,fabric,.06);}
      box(g,w*.34,h*.31,d*.85,left*w*.32,h*.3,d*.07,fabric,.07);
      box(g,w*.32,h*.16,d*.75,left*w*.32,h*.52,d*.09,fabric,.07);
      const armRad=item.armStyle==='rolled'?.11:item.armStyle==='pillow'?.13:.05;
      for(const x of [-w*.46,w*.46])box(g,w*.07,h*.38,d*.48,x,h*.46,-d*.22,fabric,armRad);
      for(const x of [-w*.34,w*.34]){const p=box(g,w*.14,h*.32,.12,x,h*.64,-d*.28,cushionAccent,.05);p.rotation.z=x>0?-.1:.12;}
      legs(h*.13);
    }
    else if(item.kind==='sofa'&&item.sofaType==='u-shape'){
      legs(h*.13);
      box(g,w,h*.24,d*.46,0,h*.24,-d*.25,fabric,.07);
      box(g,w,h*.48,d*.13,0,h*.72,-d*.43,fabric,.07);
      for(const side of [-1,1]){
        box(g,w*.28,h*.28,d*.88,side*w*.36,h*.27,d*.06,fabric,.07);
        box(g,w*.26,h*.16,d*.78,side*w*.36,h*.49,d*.08,fabric,.06);
        const p=box(g,w*.13,h*.32,.12,side*w*.34,h*.65,-d*.26,cushionAccent,.05);p.rotation.z=side*-.1;
      }
      const cCount=item.cushionCount??4;
      for(let i=0;i<cCount;i++){const cw=(w*.88)/cCount;box(g,cw*.92,h*.18,d*.38,-w*.44+cw*(i+.5),h*.46,-d*.22,fabric,.06);}
    }
    else if(item.kind==='sofa'&&item.sofaType==='curved'){
      legs(h*.13);
      const segs=7;
      for(let i=0;i<segs;i++){
        const t=(i/(segs-1))*2-1;
        const sx=t*w*.4;
        const sz=Math.pow(t,2)*d*.18-d*.08;
        const seat=box(g,w*.22,h*.28,d*.62,sx,h*.28,sz,fabric,.09);
        seat.rotation.y=-t*.28;
        const back=box(g,w*.23,h*.48,d*.16,sx*1.03,h*.64,sz-d*.26,fabric,.09);
        back.rotation.y=-t*.28;
      }
      for(const x of [-w*.26,w*.26])sphere(g,Math.min(w,h)*.14,x,h*.56,-d*.1,cushionAccent,1,.85,.7);
    }
    else if(item.kind==='sofa'&&item.sofaType==='island'){
      legs(h*.13);
      box(g,w,h*.32,d,0,h*.28,0,fabric,.09);
      const cCount=item.cushionCount??3;
      for(let i=0;i<cCount;i++){const cw=(w*.9)/cCount;box(g,cw*.92,h*.14,d*.88,-w*.45+cw*(i+.5),h*.48,0,fabric,.07);}
      box(g,w*.68,h*.36,d*.22,0,h*.68,0,fabric,.09);
      for(const z of [-d*.2,d*.2])for(const x of [-w*.2,w*.2])box(g,w*.16,h*.26,.11,x,h*.63,z,cushionAccent,.05);
    }
    else if(item.kind==='sofa'||item.kind==='armchair'){
      const armStyle=item.armStyle??'track';
      const arm=item.kind==='sofa'?(armStyle==='rolled'||armStyle==='pillow'?.15:.13):.09;
      legs(h*.14);
      box(g,w,.2,d,0,h*.25,0,fabric,.07);
      const count=item.cushionCount??(item.kind==='armchair'?1:item.sofaType==='two-seater'?2:item.sofaType==='four-seater'?4:item.sofaType==='three-seater'?3:item.variant===1?2:3);
      for(let i=0;i<count;i++){const cw=(w-arm*2-.045*(count-1))/count;box(g,cw,h*.19,d*.74,-w/2+arm+cw/2+i*(cw+.045),h*.48,d*.05,fabric,.09);}
      const backH=armStyle==='tuxedo'?h*.58:h*.53;
      box(g,w-arm*.7,backH,d*.18,0,h*.68,-d*.4,fabric,item.variant===2||armStyle==='pillow'?.14:.07);
      const armH=armStyle==='tuxedo'?h*.56:armStyle==='pillow'?h*.34:h*.38;
      const armRad=armStyle==='rolled'?.12:armStyle==='pillow'?.14:.065;
      for(const x of [-w/2+arm/2,w/2-arm/2]){
        const aMesh=box(g,arm,armH,d*.92,x,h*.49+(armStyle==='tuxedo'?h*.08:0),0,fabric,armRad);
        if(armStyle==='pillow')aMesh.rotation.z=x<0?.12:-.12;
      }
      if(armStyle==='fluted'||item.variant===2){
        for(let f=-3;f<=3;f++)box(g,.016,h*.46,.016,f*(w*.11),h*.7,-d*.3,item.accentColor?accentMat:wood,.004);
      }
      for(const x of item.kind==='sofa'?[-w*.29,w*.29]:[0]){const p=box(g,w*.18,h*.4,.14,x,h*.68,-d*.18,cushionAccent,.055);p.rotation.z=x>0?-.1:.12;}
    }
    else if(['coffee-table','dining-table','desk','side-table'].includes(item.kind)){
      const topHeight=Math.min(h*.2,.09);
      const shape=item.topShape??(item.variant===1||item.kind==='side-table'?'oval':'rectangular');
      const baseMat=item.accentColor?accentMat:fabric;
      if(shape==='oval'||shape==='round'||shape==='pebble'){
        const top=cylinder(g,w/2,w/2,topHeight,0,h-topHeight/2,0,fabric,40);
        top.scale.z=shape==='round'?1:d/w;
        if(shape==='pebble')top.rotation.y=.25;
        cylinder(g,Math.min(w,d)*.19,Math.min(w,d)*.24,h-topHeight,0,(h-topHeight)/2,0,baseMat,28);
      }else{
        box(g,w,topHeight,d,0,h-topHeight/2,0,fabric,.07);
        if(item.kind==='coffee-table'){for(const x of [-w*.29,w*.29])cylinder(g,.13,.15,h-topHeight,x,(h-topHeight)/2,0,baseMat,24);}
        else legs(h-topHeight);
      }
      if(item.kind==='coffee-table'){const book=mat('#ded6c5');box(g,.27,.03,.2,-w*.2,h+.015,0,book,.005);box(g,.23,.025,.17,-w*.2,h+.04,.01,mat('#667766'),.005);cylinder(g,.08,.07,.035,w*.2,h+.017,0,item.accentColor?accentMat:mat('#59584e'));sphere(g,.09,w*.2,h+.08,0,cream,1,.6,1);}
    }
    else if(item.kind==='tv-unit'){
      box(g,w,.4,d,0,.24,0,fabric,.025);
      const doorMat=item.frontStyle==='fluted-glass'?new T.MeshPhysicalMaterial({color:'#c9d8d6',roughness:.22,transmission:.4,transparent:true,opacity:.75}):wood;
      const handleMat=item.accentColor?accentMat:dark;
      for(const x of [-w*.25,w*.25]){
        box(g,w*.46,.33,.015,x,.24,d/2+.008,doorMat,.01);
        if(item.frontStyle==='louvered')for(let l=-2;l<=2;l++)box(g,w*.42,.015,.02,x,.24+l*.05,d/2+.016,wood,.002);
        if(item.frontStyle!=='sleek-handleless')box(g,.19,.014,.02,x,.34,d/2+.02,handleMat,.003);
      }
      box(g,.08,.3,.08,0,.56,-.02,dark,.005);box(g,w*.78,.012,.2,0,.43,0,dark,.003);
      const screenWidth=w*.82,screenHeight=Math.min(h-.6,screenWidth*.565);
      box(g,screenWidth,screenHeight,.055,0,.7+screenHeight/2,-.025,dark,.02);
      const screen=new T.MeshStandardMaterial({color:'#19272a',roughness:.12,metalness:.2,emissive:'#243b39',emissiveIntensity:.25});
      box(g,screenWidth-.035,screenHeight-.035,.008,0,.7+screenHeight/2,.008,screen,.005);
    }
    else if(item.kind==='rug'||item.kind==='doormat'){box(g,w,h,d,0,h/2+.007,0,fabric,.025);const border=mat(item.accentColor??new T.Color(item.color).multiplyScalar(.82).getStyle(),1);for(const z of [-d*.43,d*.43])box(g,w*.92,.003,.02,0,h+.01,z,border,0);for(let n=0;n<18;n++){const x=-w/2+(n+.5)*w/18;box(g,.008,.005,.07,x,h*.6,d/2+.025,cream,0);box(g,.008,.005,.07,x,h*.6,-d/2-.025,cream,0);}}
    else if(item.kind==='plant'){cylinder(g,w*.24,w*.2,h*.25,0,h*.125,0,mat(item.accentColor??'#b9aa91',.85));cylinder(g,w*.21,w*.21,.018,0,h*.25,0,mat('#4d4030'));cylinder(g,.018,.025,h*.65,0,h*.52,0,wood,10);for(let i=0;i<10;i++){const angle=i*2.4;const y=h*(.4+i*.055);const leaf=sphere(g,w*.27,Math.cos(angle)*w*.25,y,Math.sin(angle)*d*.25,fabric,1,.15,.52);leaf.rotation.set(Math.sin(angle)*.3,angle,.35);}}
    else if(item.kind==='floor-lamp'||item.kind==='pendant'){
      const metal=mat(item.accentColor??item.color,.3,.6);
      const tempSpec=LIGHT_TEMPS.find(t=>t.id===(item.lightTemp??'3000K'))??LIGHT_TEMPS[1];
      if(item.kind==='floor-lamp'){cylinder(g,w*.25,w*.28,.04,0,.02,0,dark);cylinder(g,.018,.018,h-.2,0,(h-.2)/2,0,metal,12);const shade=new T.Mesh(new T.ConeGeometry(w*.5,h*.21,32,1,true),new T.MeshStandardMaterial({color:item.color,side:T.DoubleSide,roughness:.9}));shade.position.y=h-h*.1;g.add(shade);}
      else{cylinder(g,.008,.008,.35,0,h+.15,0,dark,10);const shade=new T.Mesh(new T.SphereGeometry(w/2,32,16,0,Math.PI*2,0,Math.PI*.58),new T.MeshStandardMaterial({color:item.color,side:T.DoubleSide,roughness:.75}));shade.position.y=h*.5;shade.scale.y=h/w;g.add(shade);}
      if(item.enabled){const glow=new T.PointLight(tempSpec.hex,item.kind==='floor-lamp'?8:12,5,2);glow.position.set(0,item.kind==='floor-lamp'?h-.25:.15,0);g.add(glow);this.lamps.push(glow);sphere(g,.025,0,glow.position.y,0,new T.MeshStandardMaterial({color:'#ffffff',emissive:tempSpec.hex,emissiveIntensity:3}));}
    }
    else if(item.kind==='ceiling-fan'){cylinder(g,.055,.045,h,0,h/2,0,item.accentColor?accentMat:dark);const rotor=new T.Group();cylinder(rotor,.095,.1,.08,0,.035,0,item.accentColor?accentMat:fabric);for(let i=0;i<(item.variant===1?4:3);i++){const blade=new T.Group();blade.rotation.y=i*Math.PI*2/(item.variant===1?4:3);box(blade,w*.43,.025,w*.12,w*.27,.035,0,fabric,.035);rotor.add(blade);}g.add(rotor);this.fans.push({group:rotor,enabled:item.enabled,speed:item.powerLevel??60});}
    else if(item.kind==='ac'){box(g,w,h,d,0,h/2,0,fabric,.045);box(g,w*.84,.025,.02,0,h*.22,d*.51,item.accentColor?accentMat:dark,.005);for(let i=0;i<3;i++)box(g,w*.82,.008,.025,0,h*.2+i*.014,d*.52,mat('#a8b7b2'),.002);sphere(g,.012,w*.35,h*.6,d*.51,new T.MeshStandardMaterial({color:item.enabled?'#73c8a3':'#8c9791',emissive:item.enabled?'#439679':'#000000',emissiveIntensity:.7}));}
    else if(item.kind==='socket'){
      const plateStyle=item.switchPlate??'matte';
      const plateMat=plateStyle==='glass'?new T.MeshPhysicalMaterial({color:item.color,roughness:.08,metalness:.1,clearcoat:1}):plateStyle==='metal'?new T.MeshStandardMaterial({color:item.color,roughness:.25,metalness:.85}):plateStyle==='wood-veneer'?new T.MeshStandardMaterial({color:item.color,roughness:.55,map:this.textures?.oak??null}):fabric;
      const gang=item.switchGang??'4M';
      const rockerMat=mat(item.accentColor??item.color,plateStyle==='glass'?.15:.4,plateStyle==='metal'?.7:.1);
      const bezelMat=mat(item.accentColor??'#b89b5e',.3,.7);
      // Outer faceplate
      box(g,w,h,d*.65,0,h/2,0,plateMat,plateStyle==='frameless'?.003:.008);
      // Inner trim frame
      if(plateStyle!=='frameless')box(g,w*.88,h*.82,d*.2,0,h/2,d*.3,bezelMat,.004);
      if(gang==='touch'){
        const count=4;
        for(let i=0;i<count;i++){
          const rx=-w*.28+i*(w*.56/(count-1));
          const ring=new T.Mesh(new T.RingGeometry(Math.min(w,h)*.06,Math.min(w,h)*.085,24),new T.MeshBasicMaterial({color:item.enabled?(item.accentColor??'#66d4ff'):'#6b7874',side:T.DoubleSide}));
          ring.position.set(rx,h*.5,d*.43);g.add(ring);
        }
      }else{
        const modules=gang==='1M'?1:gang==='2M'?2:gang==='6M'?6:gang==='8M'?8:gang==='12M'?6:4;
        const rows=gang==='12M'?2:1;
        for(let r=0;r<rows;r++){
          const ry=rows===1?h*.5:h*(r===0?.66:.34);
          for(let m=0;m<modules;m++){
            const mw=(w*.76)/modules;
            const mx=-w*.38+mw*(m+.5);
            box(g,mw*.82,h*(rows===1?.56:.26),d*.35,mx,ry,d*.35,rockerMat,.003);
            // Indicator pip
            if(item.enabled)box(g,mw*.35,.004,d*.38,mx,ry+h*.12,d*.37,new T.MeshBasicMaterial({color:'#f5a623'}),0);
          }
        }
      }
    }
    else if(item.kind==='bed'||item.kind==='single-bed'){legs(.1);box(g,w,.22,d,0,.2,0,wood,.04);box(g,w*.98,.24,d*.94,0,.4,0,cream,.07);box(g,w,.75,.12,0,.48,-d/2,fabric,.05);box(g,w*.98,.04,d*.58,0,.55,d*.15,item.accentColor?cushionAccent:fabric,.035);for(const x of [-w*.25,w*.25])box(g,w*.4,.12,.48,x,.58,-d*.28,cream,.075);}
    else if(item.kind==='wardrobe'){
      box(g,w,h,d,0,h/2,0,fabric,.015);
      const front=item.frontStyle??'sleek-handleless';
      const doorMat=front==='fluted-glass'?new T.MeshPhysicalMaterial({color:'#c9d8d6',roughness:.2,transmission:.45,transparent:true,opacity:.75}):front==='cane-insert'?new T.MeshStandardMaterial({color:item.color,roughness:.8,map:this.textures?.cane??null}):fabric;
      const handleMat=item.accentColor?accentMat:dark;
      for(const x of [-w*.25,w*.25]){
        box(g,w*.49,h*.96,.015,x,h*.5,d/2+.01,doorMat,.006);
        if(front==='shaker')box(g,w*.42,h*.86,.008,x,h*.5,d/2+.018,fabric,.004);
        if(front==='louvered')for(let l=-6;l<=6;l++)box(g,w*.44,.016,.018,x,h*(.5+l*.06),d/2+.018,wood,.002);
        box(g,.016,.32,.03,x+(x>0?-w*.19:w*.19),h*.48,d/2+.03,handleMat,.005);
      }
    }
    else if(item.kind==='dining-chair'){legs(h*.5);box(g,w,.06,d,0,h*.52,0,fabric,.035);box(g,w,h*.44,.07,0,h*.78,-d*.43,item.accentColor?cushionAccent:fabric,.04);}
    else if(item.kind==='tower-ac'){box(g,w,h,d,0,h/2,0,fabric,.04);box(g,w*.8,h*.5,.018,0,h*.66,d*.51,dark,.02);for(let n=0;n<14;n++)box(g,w*.75,.012,.03,0,h*(.42+n*.033),d*.52,cream,.002);box(g,w*.3,.07,.018,0,h*.24,d*.52,dark,.01);}
    else if(item.kind==='cassette-ac'){box(g,w,h,d,0,h/2,0,fabric,.025);box(g,w*.55,.015,d*.55,0,.005,0,dark,.01);for(const z of [-d*.38,d*.38])for(let n=0;n<4;n++)box(g,w*.72,.012,.018,0,.01,z+n*.018,cream,.003);for(const x of [-w*.38,w*.38])box(g,.04,.012,d*.7,x,.01,0,dark,.005);}
    else if(item.kind==='fridge'){box(g,w,h,d,0,h/2,0,fabric,.035);const handleMat=item.accentColor?accentMat:dark;for(const x of [-w*.25,w*.25]){box(g,w*.485,h*.97,.035,x,h*.5,d*.51,fabric,.018);box(g,.022,h*.32,.045,x+(x>0?-w*.19:w*.19),h*.6,d*.55,handleMat,.008);}if(item.variant===1)box(g,w*.25,h*.23,.02,-w*.24,h*.58,d*.54,dark,.01);}
    else if(item.kind==='washing-machine'){box(g,w,h,d,0,h/2,0,fabric,.025);box(g,w*.92,h*.15,.02,0,h*.88,d*.51,cream,.01);for(const x of [-w*.3,0,w*.3])cylinder(g,.025,.025,.015,x,h*.89,d*.53,dark,16).rotation.x=Math.PI/2;const ring=cylinder(g,w*.31,w*.31,.035,0,h*.43,d*.52,item.accentColor?accentMat:dark,48);ring.rotation.x=Math.PI/2;const glass=cylinder(g,w*.245,w*.245,.04,0,h*.43,d*.55,mat('#637d80',.12,.6),48);glass.rotation.x=Math.PI/2;}
    else if(item.kind==='kitchen-cabinet'||item.kind==='kitchen-sink'||item.kind==='vanity'){
      box(g,w,h*.89,d,0,h*.445,0,fabric,.012);
      const top=mat(item.accentColor??'#dedbd1',.3);
      box(g,w,h*.06,d,0,h*.92,0,top,.008);
      for(const x of [-w*.25,w*.25]){
        box(g,w*.48,h*.79,.015,x,h*.44,d*.51,fabric,.006);
        if(item.frontStyle==='shaker')box(g,w*.4,h*.68,.008,x,h*.44,d*.518,fabric,.004);
        if(item.frontStyle!=='sleek-handleless')box(g,w*.23,.018,.035,x,h*.77,d*.54,dark,.005);
      }
      if(item.kind!=='kitchen-cabinet'){const basin=mat(item.accentColor??'#7f9292',.22,.6);box(g,w*.48,.015,d*.58,0,h*.955,0,basin,.045);box(g,w*.4,.01,d*.46,0,h*.966,0,mat('#405653',.3),.05);cylinder(g,.018,.018,.24,w*.2,h+.1,-d*.27,basin,12);box(g,w*.2,.035,.04,w*.1,h+.22,-d*.27,basin,.01);cylinder(g,.02,.02,.07,0,h+.185,-d*.27,basin,12);}
    }
    else if(item.kind==='chimney'){box(g,w,h*.18,d,0,h*.12,0,fabric,.015);box(g,w*.4,h*.8,d*.5,0,h*.58,-d*.2,fabric,.012);box(g,w*.75,.018,d*.7,0,.015,0,dark,.008);for(const x of [-w*.35,w*.35])sphere(g,.025,x,h*.04,d*.3,item.enabled?new T.MeshBasicMaterial({color:'#ffe6a6'}):cream);}
    else if(item.kind==='hob'){box(g,w,h,d,0,h/2,0,fabric,.015);for(const x of [-w*.25,w*.25])for(const z of [-d*.24,d*.24]){const ring=new T.Mesh(new T.RingGeometry(Math.min(w,d)*.13,Math.min(w,d)*.14,32),new T.MeshBasicMaterial({color:item.enabled?'#bd6b43':'#858e87',side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,h+.001,z);g.add(ring);}}
    else if(item.kind==='microwave'){box(g,w,h,d,0,h/2,0,fabric,.018);box(g,w*.72,h*.75,.018,-w*.08,h*.5,d*.51,dark,.01);box(g,.015,h*.5,.03,w*.25,h*.5,d*.55,item.accentColor?accentMat:cream,.003);for(const y of [.35,.6,.8])sphere(g,.015,w*.41,h*y,d*.52,cream);}
    else if(item.kind==='mirror'){box(g,w,h,d,0,h/2,0,item.accentColor?accentMat:wood,.018);const glass=new T.MeshPhysicalMaterial({color:'#b6d2d2',roughness:.06,metalness:.85,clearcoat:1});box(g,w*.92,h*.94,.015,0,h/2,d*.52,glass,.015);line(g,[new T.Vector3(-w*.35,h*.62,d*.55),new T.Vector3(w*.12,h*.9,d*.55)],'#e5f1ef',.6);}
    else if(['wall-light','ceiling-light','spotlight','tube-light','cfl'].includes(item.kind)){
      const tempSpec=LIGHT_TEMPS.find(t=>t.id===(item.lightTemp??'3000K'))??LIGHT_TEMPS[1];
      if(item.kind==='tube-light'){box(g,w,h*.35,d,0,h*.8,0,dark,.008);const tube=cylinder(g,h*.25,h*.25,w,0,h*.4,d*.15,item.enabled?new T.MeshStandardMaterial({color:'#ffffff',emissive:tempSpec.hex,emissiveIntensity:2}):fabric,16);tube.rotation.z=Math.PI/2;}
      else if(item.kind==='cfl'){cylinder(g,w*.23,w*.23,h*.25,0,h*.85,0,dark,16);for(let i=0;i<3;i++){const tube=cylinder(g,w*.13,w*.13,h*.65,(i-1)*w*.25,h*.42,0,item.enabled?new T.MeshStandardMaterial({color:'#ffffff',emissive:tempSpec.hex,emissiveIntensity:2}):fabric,12);void tube;}}
      else if(item.kind==='wall-light'){box(g,w*.5,h,.03,0,h/2,-d*.4,item.accentColor?accentMat:dark,.01);cylinder(g,w*.45,w*.45,h*.6,0,h*.55,0,fabric,24);}
      else if(item.kind==='ceiling-light'){cylinder(g,w/2,w/2,h,0,h/2,0,fabric,40);}
      else{box(g,w*.3,.025,d,0,h-.01,0,dark,.005);const lamp=cylinder(g,w/2,w/2,h*.7,0,h*.4,0,fabric,24);lamp.rotation.x=-.35;}
      if(item.enabled){const light=new T.PointLight(tempSpec.hex,8,5,2);light.position.set(0,.01,d*.5);g.add(light);this.lamps.push(light);sphere(g,Math.min(w,d)*.2,0,.015,d*.4,new T.MeshStandardMaterial({color:'#ffffff',emissive:tempSpec.hex,emissiveIntensity:2}));}
    }
    else if(item.kind==='computer'){box(g,w*.8,h*.7,.035,-w*.08,h*.65,-d*.2,dark,.01);box(g,w*.74,h*.6,.012,-w*.08,h*.65,-d*.17,new T.MeshStandardMaterial({color:item.enabled?'#6d9d99':'#1e2c2d',emissive:item.enabled?'#315d65':'#000000',emissiveIntensity:.4}),.008);box(g,.06,h*.2,.05,-w*.08,h*.21,-d*.2,fabric,.005);box(g,w*.35,.015,d*.3,-w*.08,h*.1,-d*.2,fabric,.008);box(g,w*.65,.035,d*.25,-w*.1,.035,d*.25,dark,.01);box(g,w*.18,h*.75,d*.65,w*.41,h*.375,-d*.06,fabric,.01);sphere(g,.009,w*.42,h*.68,d*.28,mat(item.enabled?'#71b58b':'#424b45'));}
    else if(item.kind==='ups'||item.kind==='inverter'){box(g,w,h,d,0,h/2,0,fabric,.018);box(g,w*.75,h*.22,.012,0,h*.7,d*.51,dark,.008);for(let n=0;n<7;n++)box(g,w*.6,.012,.012,0,h*(.15+n*.04),d*.52,dark,.002);sphere(g,.012,w*.28,h*.7,d*.53,mat(item.enabled?'#6fc991':'#555e58'));if(item.kind==='inverter'){box(g,w*.94,h*.26,d*.95,0,h*.15,0,mat('#727c72'),.015);for(const x of [-w*.2,w*.2])cylinder(g,.025,.025,.035,x,h*.3,d*.25,mat(x>0?'#bd5b4c':'#303632'),12);}}
    else if(item.kind==='bookshelf'){for(const x of [-w*.48,w*.48])box(g,w*.04,h,d,x,h/2,0,fabric,.005);for(let n=0;n<6;n++){const y=n*h/5;box(g,w,.035,d,0,y,0,fabric,.005);if(n<5)for(let b=0;b<5;b++){const bh=h*.12+(b%3)*.025;box(g,w*.1,bh,d*.7,-w*.34+b*w*.14,y+.02+bh/2,0,mat(['#c8b18d','#778e7d','#b57964','#e0d6c5','#647b83'][b]),.003);}}}
    else if(item.kind==='toilet'){box(g,w*.8,h*.6,d*.22,0,h*.65,-d*.36,fabric,.04);cylinder(g,w*.3,w*.23,h*.45,0,h*.225,d*.1,fabric);const bowl=sphere(g,w*.5,0,h*.43,d*.06,fabric,1,.4,d/w);const seat=cylinder(g,w*.43,w*.43,.03,0,h*.53,d*.1,item.accentColor?accentMat:cream,40);seat.scale.z=d/w*.75;void bowl;}
    else if(item.kind==='bathtub'){const outer=new T.Mesh(new T.BoxGeometry(w,h,d),fabric);outer.position.y=h/2;g.add(outer);box(g,w*.84,.02,d*.85,0,h+.005,0,mat('#bacac6',.15),.1);for(const x of [-w*.46,w*.46])box(g,w*.08,.045,d, x,h+.02,0,fabric,.03);for(const z of [-d*.46,d*.46])box(g,w,.045,d*.08,0,h+.02,z,fabric,.03);}
    else if(item.kind==='curtains'){box(g,w,.025,d*.4,0,h,0,item.accentColor?accentMat:dark,.005);for(let n=0;n<22;n++){const x=-w/2+(n+.5)*w/22;cylinder(g,w/44,w/44,h,x,h/2,Math.sin(n)*d*.2,fabric,10);}}
    else if(item.kind==='wall-art'){box(g,w,h,d,0,h/2,0,item.accentColor?accentMat:wood,.008);box(g,w*.92,h*.9,.012,0,h/2,d*.55,cream,.005);const ink=mat(item.color),sage=mat(item.accentColor??'#829485');const disk=cylinder(g,w*.2,w*.2,.008,-w*.18,h*.64,d*.59,ink,40);disk.rotation.x=Math.PI/2;box(g,w*.22,h*.5,.008,w*.19,h*.43,d*.6,sage,.05);line(g,[new T.Vector3(-w*.3,h*.24,d*.61),new T.Vector3(w*.3,h*.7,d*.61)],'#8f7560');}
    fitFurnitureDimensions(g,item);return g;
  }
  private makeAirflow(item:Item){
    const effect=createAirflow(item);if(!effect)return;
    this.air.add(effect.group);this.windMaterials.push(...effect.materials);this.airParticles.push(...effect.particles);
  }
  private makeElectrical(project:Project){const sockets=project.items.filter(i=>i.kind==='socket'&&i.enabled);for(const socket of sockets){const ring=new T.Mesh(new T.RingGeometry(.13,.16,28),new T.MeshBasicMaterial({color:'#c99b4e',side:T.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.set(socket.x,.025,socket.z);this.electric.add(ring);}for(const appliance of project.items.filter(i=>['tv-unit','floor-lamp','ac','tower-ac','cassette-ac','desk','computer','fridge','washing-machine','chimney','hob','microwave','ups','inverter'].includes(i.kind)&&i.enabled)){const candidates=sockets.filter(s=>s.roomId===appliance.roomId);if(!candidates.length)continue;const nearest=candidates.reduce((a,b)=>Math.hypot(a.x-appliance.x,a.z-appliance.z)<Math.hypot(b.x-appliance.x,b.z-appliance.z)?a:b);line(this.electric,[new T.Vector3(nearest.x,.035,nearest.z),new T.Vector3(appliance.x,.035,nearest.z),new T.Vector3(appliance.x,.035,appliance.z)],'#bd8f40',.8,true);}}
  private setSelection(id:string|null){if(this.selectionId===id&&this.selected){this.selected.update();return;}this.selectionId=id;if(this.selected){this.scene.remove(this.selected);this.selected.dispose();this.selected=null;}const group=id?this.groups.get(id):undefined;if(group){this.selected=new T.BoxHelper(group,'#52795b');this.scene.add(this.selected);}}
  fit(){this.dirty=true;if(!this.lastProject||!this.settings)return;const room=this.settings.wholeHome?undefined:this.lastProject.rooms.find(r=>r.id===this.settings!.roomId);const b=bounds(room?.points??this.lastProject.rooms.flatMap(r=>r.points));const span=Math.max(b.width,b.depth,3),aspect=Math.max(.2,this.element.clientWidth/this.element.clientHeight);if(this.settings.camera==='top'){this.orthoSpan=Math.max(b.depth,b.width/aspect)*1.35;this.camera=new T.OrthographicCamera(-this.orthoSpan*aspect/2,this.orthoSpan*aspect/2,this.orthoSpan/2,-this.orthoSpan/2,.05,500);}else if(this.camera instanceof T.OrthographicCamera)this.camera=new T.PerspectiveCamera(37,aspect,.05,500);this.controls.object=this.camera;this.camera.up.set(0,1,0);this.controls.target.set(b.x,.65,b.z);this.controls.enableRotate=this.settings.camera!=='top';if(this.settings.camera==='top'){this.camera.up.set(0,0,-1);this.camera.position.set(b.x,span*2,b.z+.001);this.controls.target.set(b.x,0,b.z);}else if(this.settings.camera==='walk'){this.camera.position.set(b.x,1.6,b.maxZ-.5);this.controls.target.set(b.x,1.45,b.minZ+.4);}else{this.camera.position.set(b.x+span*1.14,span*1.08,b.z+span*1.3);}this.camera.lookAt(this.controls.target);this.camera.updateProjectionMatrix();this.controls.update();}
  zoom(delta:number){this.dirty=true;if(this.camera instanceof T.OrthographicCamera){this.camera.zoom=clamp(this.camera.zoom*(delta>0?1.15:.87),.2,8);this.camera.updateProjectionMatrix();}else{const direction=this.camera.position.clone().sub(this.controls.target);direction.multiplyScalar(delta>0?.85:1.17);this.camera.position.copy(this.controls.target).add(direction);}this.controls.update();}
  capture(){const helper=this.selected;if(helper)helper.visible=false;try{this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}finally{if(helper)helper.visible=true;}}
  private pointerRay(event:PointerEvent){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);}
  private pointerDown=(e:PointerEvent)=>{this.pointerStart={x:e.clientX,y:e.clientY};if(e.button!==0||!this.lastProject)return;this.pointerRay(e);const hits=this.ray.intersectObjects([...this.groups.values()],true);const hit=hits.find(h=>h.object.userData.itemId);if(!hit)return;const item=this.lastProject.items.find(i=>i.id===hit.object.userData.itemId);if(!item)return;this.callbacks.onSelect(item.id);if(item.locked||this.settings?.presenting)return;const group=this.groups.get(item.id)!;this.plane.setFromNormalAndCoplanarPoint(new T.Vector3(0,1,0),new T.Vector3(0,item.y,0));const p=new T.Vector3();if(!this.ray.ray.intersectPlane(this.plane,p))return;this.drag={item,group,offset:p.sub(group.position),startX:e.clientX,startY:e.clientY,moved:false};this.controls.enabled=false;this.renderer.domElement.setPointerCapture(e.pointerId);this.dirty=true;this.renderer.domElement.style.cursor='grabbing';};
  private pointerMove=(e:PointerEvent)=>{if(!this.drag)return;this.pointerRay(e);const p=new T.Vector3();if(!this.ray.ray.intersectPlane(this.plane,p))return;p.sub(this.drag.offset);if(this.settings?.snap){p.x=Math.round(p.x*10)/10;p.z=Math.round(p.z*10)/10;}if(this.lastProject){const b=bounds(this.lastProject.rooms.flatMap(r=>r.points));p.x=clamp(p.x,b.minX,b.maxX);p.z=clamp(p.z,b.minZ,b.maxZ);}this.dirty=true;this.drag.group.position.x=p.x;this.drag.group.position.z=p.z;this.drag.moved ||= Math.hypot(e.clientX-this.drag.startX,e.clientY-this.drag.startY)>3;this.selected?.update();};
  private pointerUp=(e:PointerEvent)=>{if(this.drag){const d=this.drag;this.drag=null;this.controls.enabled=true;this.renderer.domElement.style.cursor='';if(this.renderer.domElement.hasPointerCapture(e.pointerId))this.renderer.domElement.releasePointerCapture(e.pointerId);if(d.moved)this.callbacks.onMove(d.item.id,round(d.group.position.x),round(d.group.position.z));return;}if(e.button===0&&Math.hypot(e.clientX-this.pointerStart.x,e.clientY-this.pointerStart.y)<3){this.pointerRay(e);if(!this.ray.intersectObjects([...this.groups.values()],true).length)this.callbacks.onSelect(null);}};
  private pointerCancel=(e:PointerEvent)=>{if(this.drag){this.drag.group.position.set(this.drag.item.x,this.drag.item.y,this.drag.item.z);this.drag=null;this.controls.enabled=true;this.renderer.domElement.style.cursor='';if(this.renderer.domElement.hasPointerCapture(e.pointerId))this.renderer.domElement.releasePointerCapture(e.pointerId);}};
  private keyDown=(e:KeyboardEvent)=>{if(this.settings?.camera==='walk'&&['w','a','s','d'].includes(e.key.toLowerCase())){e.preventDefault();this.keys.add(e.key.toLowerCase());}};
  private keyUp=(e:KeyboardEvent)=>{this.keys.delete(e.key.toLowerCase());};
  private tick=(time:number)=>this.renderFrame(time);
  private renderFrame(time:number){
    if(this.disposed)return;this.frame=requestAnimationFrame(this.tick);
    const delta=Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;
    if(document.hidden||!this.settings)return;const settings=this.settings;
    if(settings.camera==='walk'&&this.keys.size){const forward=this.camera.getWorldDirection(new T.Vector3());forward.y=0;forward.normalize();const right=new T.Vector3().crossVectors(forward,new T.Vector3(0,1,0)),step=new T.Vector3();if(this.keys.has('w'))step.add(forward);if(this.keys.has('s'))step.sub(forward);if(this.keys.has('d'))step.add(right);if(this.keys.has('a'))step.sub(right);step.normalize().multiplyScalar(delta*2);this.camera.position.add(step);this.controls.target.add(step);this.dirty=true;}
    const moving=motionIsPlaying(settings.motion,this.reduced.matches);const controlsChanged=this.controls.update(),animated=moving&&(this.fans.some(f=>f.enabled&&f.speed>0)||(settings.airflow&&this.windMaterials.length>0));
    if(!this.dirty&&!controlsChanged&&!animated)return;
    if(moving)this.animationTime=(this.animationTime??0)+delta;const windTime=this.animationTime??0;
    const options=`${settings.showDimensions}:${settings.presenting}:${settings.showWalls}:${settings.camera}:${settings.wholeHome}:${settings.roomId}`;
    const viewChanged=this.dirty||!this.labelMatrix.equals(this.camera.matrixWorldInverse)||this.lastLabelOptions!==options;
    if(viewChanged){applyWallView(this.walls,settings,this.camera);this.root.children.forEach(c=>{if(c.userData.dimensions)c.visible=settings.showDimensions&&(settings.wholeHome||c.userData.roomId===settings.roomId);if(c.userData.planOutline)c.visible=settings.camera==='top'&&settings.showWalls;if(c.userData.door)c.visible=settings.showWalls;});for(const label of this.labels){const point=label.position.clone().project(this.camera);label.element.style.transform=`translate(-50%,-50%) translate(${(point.x*.5+.5)*this.element.clientWidth}px,${(-point.y*.5+.5)*this.element.clientHeight}px)`;label.element.style.display=settings.showDimensions&&point.z<1&&point.z>-1&&!settings.presenting&&(settings.wholeHome||label.roomId===settings.roomId)?'':'none';}this.labelMatrix.copy(this.camera.matrixWorldInverse);this.lastLabelOptions=options;}
    for(const material of this.windMaterials)material.uniforms.time.value=windTime;
    if(moving)for(const fan of this.fans)if(fan.enabled)fan.group.rotation.y+=delta*fan.speed*.13;
    if(settings.airflow)for(const particle of this.airParticles){const t=(windTime*particle.speed+particle.phase)%1;particle.mesh.position.copy(particle.curve.getPoint(t));particle.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),particle.curve.getTangent(t).normalize());}
    this.renderer.render(this.scene,this.camera);this.dirty=false;this.frameCount++;
  }
  diagnostics(){return {roomBuilds:this.roomBuilds,objectBuilds:this.objectBuilds,renders:this.frameCount,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,reducedMotion:this.reduced.matches,motion:this.settings?.motion,animationTime:this.animationTime,visibility:document.visibilityState,windStreams:this.airParticles.length};}
  dispose(){this.disposed=true;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.controls.removeEventListener('change',this.markDirty);this.controls.dispose();this.renderer.domElement.removeEventListener('pointerdown',this.pointerDown);this.renderer.domElement.removeEventListener('pointermove',this.pointerMove);this.renderer.domElement.removeEventListener('pointerup',this.pointerUp);this.renderer.domElement.removeEventListener('pointercancel',this.pointerCancel);this.renderer.domElement.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);disposeTree(this.root);this.grid.geometry.dispose();(this.grid.material as T.Material).dispose();this.selected?.dispose();Object.values(this.textures).forEach(t=>t.dispose());this.renderer.dispose();this.renderer.domElement.remove();this.labels.forEach(l=>l.element.remove());}
}
