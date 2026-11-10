import { describe, expect, it } from 'vitest';
import { calibratedPoint, isSimplePolygon } from './planGeometry';

const points=(pairs:number[][])=>pairs.map(([x,z])=>({x,z}));

describe('editable room geometry',()=>{
  it('accepts clockwise and counterclockwise room outlines',()=>{
    const rectangle=points([[0,0],[4,0],[4,3],[0,3]]);
    expect(isSimplePolygon(rectangle)).toBe(true);
    expect(isSimplePolygon([...rectangle].reverse())).toBe(true);
  });
  it('accepts a concave nonrectangular room',()=>{
    expect(isSimplePolygon(points([[0,0],[4,0],[4,1],[1,1],[1,4],[0,4]]))).toBe(true);
  });
  it('rejects a self-crossing outline even when its signed area is nonzero',()=>{
    expect(isSimplePolygon(points([[0,0],[5,3],[0,4],[4,0]]))).toBe(false);
  });
  it('rejects collinear zero-area outlines and duplicate vertices',()=>{
    expect(isSimplePolygon(points([[0,0],[2,0],[4,0]]))).toBe(false);
    expect(isSimplePolygon(points([[0,0],[4,0],[4,0],[4,3],[0,3]]))).toBe(false);
    expect(isSimplePolygon(points([[0,0],[4,0],[4,3],[0,0],[0,3]]))).toBe(false);
  });
  it('accepts a straight intermediate wall vertex without treating it as a crossing',()=>{
    expect(isSimplePolygon(points([[0,0],[2,0],[4,0],[4,3],[0,3]]))).toBe(true);
  });
  it('rejects an outline that touches or retraces a nonadjacent edge',()=>{
    expect(isSimplePolygon(points([[0,0],[4,0],[2,0],[2,3],[0,3]]))).toBe(false);
    expect(isSimplePolygon(points([[0,0],[4,0],[4,4],[2,0],[0,4]]))).toBe(false);
  });
  it('rejects tiny, nonfinite, incomplete and over-detailed outlines',()=>{
    expect(isSimplePolygon(points([[0,0],[.7,0],[.7,.7],[0,.7]]))).toBe(false);
    expect(isSimplePolygon(points([[0,0],[4,0],[Infinity,3]]))).toBe(false);
    expect(isSimplePolygon(points([[0,0],[4,0]]))).toBe(false);
    expect(isSimplePolygon(Array.from({length:33},(_,i)=>({x:Math.cos(i/33*Math.PI*2),z:Math.sin(i/33*Math.PI*2)})))).toBe(false);
    expect(isSimplePolygon(points([[0,0],[1,0],[1,1],[0,.001]]))).toBe(false);
  });
});

describe('PDF metre calibration',()=>{
  it('anchors the full page centre at the world origin',()=>{
    expect(calibratedPoint({u:.5,v:.5},1600,800,.01)).toEqual({x:0,z:0});
  });
  it('uses page pixel width and height independently for a landscape plan',()=>{
    expect(calibratedPoint({u:0,v:0},1600,800,.01)).toEqual({x:-8,z:-4});
    expect(calibratedPoint({u:1,v:1},1600,800,.01)).toEqual({x:8,z:4});
  });
  it('preserves a known diagonal distance in metres',()=>{
    const a={u:.1,v:.2},b={u:.7,v:.8},width=1200,height=1600;
    const scale=5/Math.hypot((b.u-a.u)*width,(b.v-a.v)*height);
    const p=calibratedPoint(a,width,height,scale),q=calibratedPoint(b,width,height,scale);
    expect(Math.hypot(q.x-p.x,q.z-p.z)).toBeCloseTo(5,3);
  });
  it('preserves the same world geometry at a different raster resolution',()=>{
    const mark={u:.28,v:.73};
    expect(calibratedPoint(mark,800,1200,.02)).toEqual(calibratedPoint(mark,1600,2400,.01));
  });
});
