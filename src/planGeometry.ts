import type { Point } from './model';

export type PlanMark = { u: number; v: number };

/** Editable room outlines must have distinct edges, no self-intersections and >=0.5 m2 area. */
export function isSimplePolygon(points: Point[]): boolean {
  if (points.length < 3 || points.length > 32 || !points.every(p => Number.isFinite(p.x) && Number.isFinite(p.z))) return false;
  const cross = (a: Point, b: Point, c: Point) => (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  const on = (a: Point, b: Point, p: Point) => Math.abs(cross(a,b,p))<1e-8 && p.x>=Math.min(a.x,b.x)-1e-8 && p.x<=Math.max(a.x,b.x)+1e-8 && p.z>=Math.min(a.z,b.z)-1e-8 && p.z<=Math.max(a.z,b.z)+1e-8;
  for (let i=0; i<points.length; i++) {
    const a=points[i], b=points[(i+1)%points.length];
    if (Math.hypot(a.x-b.x,a.z-b.z)<.01) return false;
    for (let j=i+1; j<points.length; j++) {
      if (j===i+1 || (i===0 && j===points.length-1)) continue;
      const c=points[j], d=points[(j+1)%points.length];
      if ((cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) || on(a,b,c) || on(a,b,d) || on(c,d,a) || on(c,d,b)) return false;
    }
  }
  const signedTwiceArea=points.reduce((sum,p,i)=>{const n=points[(i+1)%points.length];return sum+p.x*n.z-n.x*p.z;},0);
  return Math.abs(signedTwiceArea)/2>=.5;
}

/** Convert page-normalized coordinates into metres, centred on the full PDF page. */
export function calibratedPoint(mark: PlanMark, width: number, height: number, metresPerPixel: number): Point {
  return { x:Number(((mark.u-.5)*width*metresPerPixel).toFixed(4)), z:Number(((mark.v-.5)*height*metresPerPixel).toFixed(4)) };
}
