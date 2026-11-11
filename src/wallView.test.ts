import {describe,expect,it,vi} from 'vitest';
import {BoxGeometry,Box3,DirectionalLight,Group,HemisphereLight,Mesh,MeshPhysicalMaterial,MeshStandardMaterial,PerspectiveCamera,Plane,Vector3} from 'three';
import {applyWallView,shellClipEnabled} from './wallView';
import {createProject,defaultSettings} from './model';
import {StudioScene} from './scene';

describe('full-height and optional see-through walls',()=>{
  function setup(){
    const group=new Group(),solid=new Mesh(new BoxGeometry(4,3,.12),new MeshStandardMaterial()),glass=new Mesh(new BoxGeometry(1,1,.02),new MeshPhysicalMaterial({transparent:true,opacity:.25,depthWrite:true}));
    solid.position.y=1.5;solid.castShadow=true;group.add(solid,glass);const camera=new PerspectiveCamera();camera.position.set(0,2,5);
    return {group,solid,glass,camera,walls:[{group,midpoint:new Vector3(),normal:new Vector3(0,0,1)}]};
  }
  it('keeps foreground walls full height and solid by default',()=>{
    const {group,solid,camera,walls}=setup();applyWallView(walls,defaultSettings,camera);
    expect(defaultSettings.cutaway).toBe(false);expect(group.visible).toBe(true);expect(solid.material.opacity).toBe(1);expect(solid.material.transparent).toBe(false);expect(new Box3().setFromObject(solid).getSize(new Vector3()).y).toBeCloseTo(3);
  });
  it('restores solid opacity, glass transparency, depth writes and shadows after ghosting',()=>{
    const {group,solid,glass,camera,walls}=setup();applyWallView(walls,{...defaultSettings,ghostWalls:true},camera);
    expect(group.visible).toBe(true);expect(solid.material.opacity).toBeLessThan(1);expect(glass.material.opacity).toBeLessThan(.25);expect(solid.material.transparent).toBe(true);expect(solid.material.depthWrite).toBe(false);expect(solid.castShadow).toBe(false);
    camera.position.z=-5;applyWallView(walls,{...defaultSettings,ghostWalls:true},camera);
    expect(solid.material.opacity).toBe(1);expect(solid.material.transparent).toBe(false);expect(solid.material.depthWrite).toBe(true);expect(solid.castShadow).toBe(true);expect(glass.material.opacity).toBe(.25);expect(glass.material.transparent).toBe(true);expect(glass.material.depthWrite).toBe(true);
  });
  it('requires explicit cutaway and restores full-height walls for Walk',()=>{
    const {group,solid,camera,walls}=setup();applyWallView(walls,{...defaultSettings,cutaway:true},camera);expect(group.visible).toBe(false);
    applyWallView(walls,{...defaultSettings,cutaway:true,ghostWalls:true,camera:'walk'},camera);expect(group.visible).toBe(true);expect(solid.material.opacity).toBe(1);
    applyWallView(walls,{...defaultSettings,camera:'top'},camera);expect(group.visible).toBe(false);
    applyWallView(walls,{...defaultSettings,showWalls:false},camera);expect(group.visible).toBe(false);
  });
  it('removes optional whole-home clipping from both walls and doors when Full walls is selected',()=>{
    const {group,solid}=setup(),door=new Group(),leaf=new Mesh(new BoxGeometry(1,2,.04),new MeshStandardMaterial());door.userData.door=true;door.add(leaf);const root=new Group();root.add(group,door);
    const project=createProject(),settings={...defaultSettings,wholeHome:true},context={lastProject:project,settings,dirty:false,root,walls:[{group}],cutawayPlane:new Plane(new Vector3(0,-1,0),1.05),grid:{visible:false},air:{visible:false},electric:{visible:false},sun:new DirectionalLight(),ambient:new HemisphereLight(),lamps:[],fit:vi.fn(),setSelection:vi.fn()};
    Reflect.apply(StudioScene.prototype.update,context,[project,{...settings,cutaway:true},null]);expect(solid.material.clippingPlanes).toHaveLength(1);expect(leaf.material.clippingPlanes).toHaveLength(1);
    Reflect.apply(StudioScene.prototype.update,context,[project,settings,null]);expect(solid.material.clippingPlanes).toBeNull();expect(leaf.material.clippingPlanes).toBeNull();expect(shellClipEnabled(settings)).toBe(false);expect(shellClipEnabled({...settings,cutaway:true,camera:'walk'})).toBe(false);
    context.dirty=false;Reflect.apply(StudioScene.prototype.setCutawayHeight,context,[2.4]);expect(context.cutawayPlane.constant).toBe(2.4);expect(context.dirty).toBe(true);
  });
});
