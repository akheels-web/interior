import {afterEach,describe,it,expect,vi} from 'vitest';
import {BoxHelper,CatmullRomCurve3,Group,Matrix4,Object3D,PerspectiveCamera,Vector3} from 'three';
import {createProject,createItem,defaultSettings,type Item} from './model';
import {StudioScene} from './scene';
describe('incremental spatial updates',()=>{
  function setup(){const project=createProject();project.items=[createItem('sofa',project.rooms[0]),createItem('armchair',project.rooms[0])];const groups=new Map(project.items.map(item=>[item.id,new Group()]));const context={lastProject:project,groups,root:new Group(),fans:[],lamps:[],air:new Group(),electric:new Group(),selected:null,rebuild:vi.fn(),makeItem:vi.fn(()=>new Group()),makeAirflow:vi.fn(),makeElectrical:vi.fn()};return {project,context,update:(next:typeof project)=>Reflect.apply((StudioScene.prototype as any).syncProject,context,[next])};}
  it('moves an object without rebuilding rooms or any furniture geometry',()=>{const {project,context,update}=setup(),first=context.groups.get(project.items[0].id),second=context.groups.get(project.items[1].id);update({...project,items:[{...project.items[0],x:2.3,z:1.1},project.items[1]]});expect(context.rebuild).not.toHaveBeenCalled();expect(context.makeItem).not.toHaveBeenCalled();expect(context.groups.get(project.items[0].id)).toBe(first);expect(first?.position.x).toBe(2.3);expect(context.groups.get(project.items[1].id)).toBe(second);});
  it('rebuilds only the resized furnishing',()=>{const {project,context,update}=setup(),second=context.groups.get(project.items[1].id);update({...project,items:[{...project.items[0],width:2},project.items[1]]});expect(context.rebuild).not.toHaveBeenCalled();expect(context.makeItem).toHaveBeenCalledTimes(1);expect(context.groups.get(project.items[1].id)).toBe(second);});
  it('removes a former AC airflow guide when swapped to furniture',()=>{const {project,context,update}=setup();project.items[0].kind='ac';update({...project,items:[{...project.items[0],kind:'sofa'},project.items[1]]});expect(context.makeElectrical).toHaveBeenCalledTimes(1);expect(context.makeAirflow).not.toHaveBeenCalled();});
  it('rebinds selection when selected geometry is replaced',()=>{const {project,context,update}=setup();const ctx=context as any;ctx.scene=new Group();ctx.selectionId=project.items[0].id;const old=new BoxHelper(ctx.groups.get(project.items[0].id));ctx.selected=old;ctx.scene.add(old);update({...project,items:[{...project.items[0],width:2},project.items[1]]});Reflect.apply((StudioScene.prototype as any).setSelection,ctx,[project.items[0].id]);expect(ctx.selected).not.toBe(old);expect(ctx.selected.object).toBe(ctx.groups.get(project.items[0].id));});
  it('retains full reconstruction for room outline changes',()=>{const {project,context,update}=setup();update({...project,rooms:[{...project.rooms[0],wallColor:'#223344'}]});expect(context.rebuild).toHaveBeenCalledTimes(1);});
});

describe('device animation and idle rendering',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  function setup(reduced=false){
    vi.stubGlobal('document',{hidden:false,visibilityState:'visible'});
    vi.stubGlobal('requestAnimationFrame',vi.fn(()=>17));
    const camera=new PerspectiveCamera(37,1,.05,500);camera.position.set(0,3,6);camera.updateMatrixWorld(true);
    const rotor=new Group(),particle=new Object3D(),curve=new CatmullRomCurve3([new Vector3(0,0,0),new Vector3(1,-.5,2),new Vector3(2,-1,4)]);
    const context={disposed:false,frame:0,tick:vi.fn(),lastTime:0,animationTime:0,dirty:true,settings:{...defaultSettings,airflow:true},reduced:{matches:reduced},camera,controls:{update:vi.fn(()=>false),target:new Vector3()},fans:[{group:rotor,enabled:true,speed:60}],windMaterials:[{uniforms:{time:{value:0}}}],airParticles:[{mesh:particle,curve,phase:.1,speed:.2}],keys:new Set<string>(),walls:[],root:new Group(),labels:[],labelMatrix:new Matrix4(),lastLabelOptions:'',element:{clientWidth:800,clientHeight:600},renderer:{render:vi.fn()},scene:new Group(),frameCount:0};
    return {context,rotor,particle,run:(time:number)=>Reflect.apply((StudioScene.prototype as any).renderFrame,context,[time])};
  }
  it('advances enabled fan rotation, wind time and particles across visible frames',()=>{
    const {context,rotor,particle,run}=setup();run(1000);const rotation=rotor.rotation.y,position=particle.position.clone();
    expect(rotation).toBeGreaterThan(0);expect(context.windMaterials[0].uniforms.time.value).toBeCloseTo(.05);expect(position.length()).toBeGreaterThan(0);
    run(1500);expect(rotor.rotation.y).toBeGreaterThan(rotation);expect(context.windMaterials[0].uniforms.time.value).toBeCloseTo(.1);expect(particle.position.equals(position)).toBe(false);expect(context.renderer.render).toHaveBeenCalledTimes(2);
  });
  it('keeps reduced-motion devices static while still drawing explicit scene changes',()=>{
    const {context,rotor,particle,run}=setup(true);run(1000);const position=particle.position.clone();run(2000);
    expect(context.renderer.render).toHaveBeenCalledTimes(1);context.dirty=true;run(3000);
    expect(rotor.rotation.y).toBe(0);expect(context.windMaterials[0].uniforms.time.value).toBe(0);expect(particle.position.equals(position)).toBe(true);expect(context.renderer.render).toHaveBeenCalledTimes(2);
  });
  it('lets explicit Play override reduced motion and resumes Pause without jumping to wall-clock time',()=>{
    const {context,rotor,particle,run}=setup(true);context.settings.motion='play';run(16);const firstTime=context.animationTime;
    expect(firstTime).toBeCloseTo(.016);expect(rotor.rotation.y).toBeGreaterThan(0);
    context.settings.motion='pause';context.dirty=true;run(32);const rotation=rotor.rotation.y,position=particle.position.clone();run(10032);
    expect(context.animationTime).toBe(firstTime);expect(rotor.rotation.y).toBe(rotation);expect(particle.position.equals(position)).toBe(true);
    context.settings.motion='play';context.dirty=true;run(10048);
    expect(context.animationTime).toBeCloseTo(firstTime+.016);expect(context.windMaterials[0].uniforms.time.value).toBeCloseTo(context.animationTime);expect(rotor.rotation.y).toBeGreaterThan(rotation);
  });
  it('keeps fan motion controllable while the wind overlay is hidden',()=>{
    const {context,rotor,run}=setup(true);context.settings.airflow=false;context.settings.motion='play';run(16);const rotation=rotor.rotation.y;expect(rotation).toBeGreaterThan(0);
    context.settings.motion='pause';context.dirty=true;run(32);run(48);expect(rotor.rotation.y).toBe(rotation);
  });
  it.each(['ac','tower-ac','cassette-ac','ceiling-fan'] as const)('creates no moving wind for %s with power off or speed zero',kind=>{
    const room=createProject().rooms[0];
    for(const patch of [{enabled:false},{powerLevel:0}]){
      const context={air:new Group(),windMaterials:[],airParticles:[]};Reflect.apply((StudioScene.prototype as any).makeAirflow,context,[{...createItem(kind,room),...patch}]);
      expect(context.air.children).toHaveLength(0);expect(context.windMaterials).toHaveLength(0);expect(context.airParticles).toHaveLength(0);
    }
  });
  it('skips static frames and redraws button zoom even without a controls-change result',()=>{
    const {context,run}=setup();context.fans=[];context.windMaterials=[];context.airParticles=[];run(1000);run(2000);expect(context.renderer.render).toHaveBeenCalledTimes(1);
    const distance=context.camera.position.distanceTo(context.controls.target);Reflect.apply(StudioScene.prototype.zoom,context,[1]);expect(context.camera.position.distanceTo(context.controls.target)).toBeLessThan(distance);run(3000);expect(context.renderer.render).toHaveBeenCalledTimes(2);
  });
  it('does no renderer or device work while the document is hidden',()=>{
    const {context,rotor,particle,run}=setup();vi.stubGlobal('document',{hidden:true,visibilityState:'hidden'});run(10000);
    expect(context.renderer.render).not.toHaveBeenCalled();expect(context.controls.update).not.toHaveBeenCalled();expect(rotor.rotation.y).toBe(0);expect(particle.position.length()).toBe(0);expect(context.windMaterials[0].uniforms.time.value).toBe(0);
    vi.stubGlobal('document',{hidden:false,visibilityState:'visible'});run(10010);expect(context.renderer.render).toHaveBeenCalledOnce();expect(rotor.rotation.y).toBeGreaterThan(0);expect(rotor.rotation.y).toBeLessThan(.2);
  });
});
