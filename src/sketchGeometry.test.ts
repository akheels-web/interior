import {describe,it,expect} from 'vitest';
import {polygonsOverlap,sketchRoomsError,sketchRoomError} from './sketchGeometry';
import {HOME_TEMPLATES,buildTemplateProject} from './templates';
import type {Point,Room} from './model';
const box=(x=0,z=0,w=4,d=4):Point[]=>[{x,z},{x:x+w,z},{x:x+w,z:z+d},{x,z:z+d}];
const room=(points=box(),id='room'):Room=>({id,name:id,points,height:2.9,wallColor:'#ffffff',floor:'oak',openings:[]});
describe('Direct sketch geometry validation',()=>{
  it('allows adjacent boundaries/corners while rejecting interior overlaps in either order',()=>{
    expect(polygonsOverlap(box(),box(4,0))).toBe(false);expect(polygonsOverlap(box(),box(4,4))).toBe(false);
    for(const p of [box(3,0),box(1,1,1,1),box(),box(0,0,4,2),box(-1,1,6,1)]){expect(polygonsOverlap(box(),p)).toBe(true);expect(polygonsOverlap(p,box())).toBe(true);}
  });
  it('handles concave outlines without treating the missing corner as filled space',()=>{
    const l=[{x:0,z:0},{x:4,z:0},{x:4,z:1},{x:1,z:1},{x:1,z:4},{x:0,z:4}];
    expect(polygonsOverlap(l,box(2,2,1,1))).toBe(false);expect(polygonsOverlap(l,box(.5,.5,1,1))).toBe(true);expect(polygonsOverlap(l,[...l].reverse())).toBe(true);
  });
  it('rejects crossing/degenerate outlines, invalid sizes, duplicate ids and overlaps',()=>{
    expect(sketchRoomError(room([{x:0,z:0},{x:4,z:4},{x:0,z:4},{x:4,z:0}]))).not.toBe('');
    expect(sketchRoomError(room(box(0,0,.1,8)))).not.toBe('');expect(sketchRoomError({...room(),height:NaN})).not.toBe('');
    expect(sketchRoomsError([room(),room(box(4,0))])).toMatch(/own ID/);expect(sketchRoomsError([room(),room(box(3,0),'other')])).toMatch(/overlaps/);expect(sketchRoomsError([])).not.toBe('');
  });
  it('keeps existing opening data when an invalid wall edit is rejected',()=>{
    const r=room();r.openings=[{id:'door',type:'door',edge:0,offset:.5,width:3,height:2.1,sill:0}];
    expect(sketchRoomError(r)).toBe('');const before=structuredClone(r.openings);expect(sketchRoomError({...r,points:box(0,0,1,4)})).toMatch(/Existing doors and windows have been kept/);expect(r.openings).toEqual(before);
  });
  it('accepts every original template for direct sketch editing',()=>{for(const t of HOME_TEMPLATES)expect(sketchRoomsError(buildTemplateProject(t.id).rooms),t.id).toBe('');});
});
