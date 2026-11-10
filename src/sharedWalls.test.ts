import {describe,it,expect} from 'vitest';
import {createProject,wallOpenings,wallSolids,type Room} from './model';
describe('one physical doorway through adjacent room walls',()=>{
  const pair=()=>{const base=createProject().rooms[0];const a:Room={...base,id:'a',points:[{x:0,z:0},{x:4,z:0},{x:4,z:4},{x:0,z:4}],openings:[{id:'door',edge:1,offset:.4,width:.9,height:2.1,sill:0,type:'door',doorStyle:'interior',swing:70}]};const b:Room={...base,id:'b',points:[{x:4,z:0},{x:8,z:0},{x:8,z:4},{x:4,z:4}],openings:[]};return [a,b];};
  it('inherits a reversed wall void while retaining a single authored leaf',()=>{const [a,b]=pair();const own=wallOpenings(a,1,[a,b]),other=wallOpenings(b,3,[a,b]);expect(own).toHaveLength(1);expect(other).toHaveLength(1);expect(own[0].derived).toBe(false);expect(other[0].derived).toBe(true);expect(other[0].start).toBeCloseTo(4-own[0].end);expect(other[0].end).toBeCloseTo(4-own[0].start);});
  it('cuts each section when a collinear corner splits the neighbouring doorway',()=>{const [a,b]=pair();b.points.push({x:4,z:1.6});const first=wallOpenings(b,3,[a,b]),second=wallOpenings(b,4,[a,b]);expect(first[0].end-first[0].start).toBeCloseTo(.45);expect(second[0].end-second[0].start).toBeCloseTo(.45);expect([...first,...second].every(o=>o.derived)).toBe(true);});
  it('opens both sides of a zone boundary with one toggle',()=>{const [a,b]=pair();a.openings=[];a.openEdges=[1];expect(wallSolids(b,3,[a,b])).toHaveLength(0);});
  it('unions overlapping cutouts without producing a blocking wall',()=>{const [a,b]=pair();b.openEdges=[3];expect(wallSolids(a,1,[a,b])).toHaveLength(0);});
  it('does not cut a parallel wall in a different location',()=>{const [a,b]=pair();b.points=b.points.map(p=>({...p,x:p.x+1}));expect(wallOpenings(b,3,[a,b])).toHaveLength(0);});
  it('clips projected void height to the adjoining room ceiling',()=>{const [a,b]=pair();b.height=1.8;expect(wallOpenings(b,3,[a,b])[0].height).toBe(1.8);a.openings[0]={...a.openings[0],type:'window',sill:2,height:1};expect(wallOpenings(b,3,[a,b])).toHaveLength(0);});
});
