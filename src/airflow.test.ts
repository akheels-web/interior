import {describe,expect,it} from 'vitest';
import {Mesh,Points,Vector3} from 'three';
import {createAirflow,motionIsPlaying,type AirflowEffect} from './airflow';
import {createItem,createProject} from './model';

function release(effect:AirflowEffect){effect.group.traverse(object=>{const mesh=object as Mesh;mesh.geometry?.dispose();if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();});}
describe('illustrative device airflow',()=>{
  it.each([
    ['auto',false,true],['auto',true,false],['play',false,true],['play',true,true],['pause',false,false],['pause',true,false],
  ] as const)('resolves %s with reduced motion %s to playing=%s',(mode,reduced,expected)=>expect(motionIsPlaying(mode,reduced)).toBe(expected));
  it.each(['ac','tower-ac','cassette-ac','ceiling-fan'] as const)('supplies complete finite shader attributes for %s',kind=>{
    const item=createItem(kind,createProject().rooms[0]),effect=createAirflow(item)!;
    try{
      expect(effect).not.toBeNull();const ribbons:Mesh[]=[];let haze:Points|undefined;
      effect.group.traverse(object=>{if(object instanceof Mesh&&object.material===effect.materials[0])ribbons.push(object);if(object instanceof Points)haze=object;});
      expect(ribbons).toHaveLength(kind==='cassette-ac'?36:kind==='ceiling-fan'?12:9);expect(effect.particles).toHaveLength(ribbons.length);
      for(const ribbon of ribbons){const position=ribbon.geometry.getAttribute('position'),phase=ribbon.geometry.getAttribute('aPhase');expect(phase.count).toBe(position.count);expect(Array.from(position.array).every(Number.isFinite)).toBe(true);expect(Array.from(phase.array).every(value=>value>=0&&value<1)).toBe(true);}
      expect(haze).toBeDefined();const geometry=haze!.geometry,count=geometry.getAttribute('position').count;expect(count).toBe(ribbons.length*14);
      for(const name of ['p0','p1','p2','p3','aPhase','aSize']){const attribute=geometry.getAttribute(name);expect(attribute.count).toBe(count);expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);}
      expect(haze!.frustumCulled).toBe(false);
    }finally{release(effect);}
  });
  it('rotates cassette mist into all four outlet directions',()=>{
    const effect=createAirflow(createItem('cassette-ac',createProject().rooms[0]))!;
    try{
      const haze=effect.group.children.find(object=>object instanceof Points) as Points,end=haze.geometry.getAttribute('p3');
      const expected=[[0,4],[4,0],[0,-4],[-4,0]];
      for(let outlet=0;outlet<4;outlet++){const index=(outlet*9+4)*14;expect(end.getX(index)).toBeCloseTo(expected[outlet][0],5);expect(end.getZ(index)).toBeCloseTo(expected[outlet][1],5);}
    }finally{release(effect);}
  });
  it('expands fan downwash at floor level and applies each device’s placement and direction',()=>{
    const item={...createItem('ceiling-fan',createProject().rooms[0]),x:2,z:3,rotation:45,airflowAngle:15},effect=createAirflow(item)!;
    try{
      expect(effect.group.position).toEqual(new Vector3(item.x,item.y,item.z));expect(effect.group.rotation.y).toBeCloseTo(Math.PI/3);
      for(const particle of effect.particles){const start=particle.curve.getPoint(0),end=particle.curve.getPoint(1);expect(end.y+item.y).toBeCloseTo(.18);expect(Math.hypot(end.x,end.z)).toBeGreaterThan(Math.hypot(start.x,start.z));}
    }finally{release(effect);}
  });
  it('responds to AC speed and visual reach instead of reusing global settings',()=>{
    const item=createItem('ac',createProject().rooms[0]),slow=createAirflow({...item,powerLevel:20,airflowRange:2})!,fast=createAirflow({...item,powerLevel:90,airflowRange:8})!;
    try{expect(fast.particles[0].speed).toBeGreaterThan(slow.particles[0].speed);expect(fast.materials[0].uniforms.speed.value).toBeGreaterThan(slow.materials[0].uniforms.speed.value);expect(slow.particles[0].curve.getPoint(1).z).toBeCloseTo(2);expect(fast.particles[0].curve.getPoint(1).z).toBeCloseTo(8);}finally{release(slow);release(fast);}
  });
});
