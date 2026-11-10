import { describe,it,expect } from 'vitest';
import { Box3,Group,Vector3 } from 'three';
import { CATALOG,createItem,createProject,type Item } from './model';
import { StudioScene } from './scene';
describe('catalog dimensions are shared between the viewport and schedules',()=>{
  for(const entry of CATALOG)it(`applies all three editable dimensions to ${entry.kind}`,()=>{const item={...createItem(entry.kind,createProject().rooms[0]),width:2.3,depth:1.1,height:1.4};const factory=(StudioScene.prototype as unknown as {makeItem:(item:Item)=>Group}).makeItem;const group=Reflect.apply(factory,{textures:{},fans:[],lamps:[]},[item]) as Group;const box=new Box3().setFromObject(group),size=box.getSize(new Vector3());expect(size.x).toBeCloseTo(item.width,5);expect(size.y).toBeCloseTo(item.height,5);expect(size.z).toBeCloseTo(item.depth,5);expect(box.min.y).toBeCloseTo(0,5);});
});
