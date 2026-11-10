import { bounds, openingError, type Point, type Room } from './model';
import { isSimplePolygon } from './planGeometry';

const EPS=1e-7;
const cross=(a:Point,b:Point,p:Point)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
function onEdge(p:Point,a:Point,b:Point){return Math.abs(cross(a,b,p))<EPS&&p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.z>=Math.min(a.z,b.z)-EPS&&p.z<=Math.max(a.z,b.z)+EPS;}
/** Boundary points are excluded: adjoining rooms may share a wall or a corner. */
export function strictlyInside(p:Point,polygon:Point[]){
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[j],b=polygon[i];if(onEdge(p,a,b))return false;
    if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)result=!result;
  }
  return result;
}
/** Handles simple concave outlines and coincident edges, without treating shared walls as overlaps. */
export function polygonsOverlap(a:Point[],b:Point[]){
  const x=bounds(a),y=bounds(b);
  if(x.maxX<=y.minX+EPS||y.maxX<=x.minX+EPS||x.maxZ<=y.minZ+EPS||y.maxZ<=x.minZ+EPS)return false;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
    const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];
    const c1=cross(p,q,r),c2=cross(p,q,s),c3=cross(r,s,p),c4=cross(r,s,q);
    if(((c1>EPS&&c2< -EPS)||(c1< -EPS&&c2>EPS))&&((c3>EPS&&c4< -EPS)||(c3< -EPS&&c4>EPS)))return true;
  }
  if(a.some(p=>strictlyInside(p,b))||b.some(p=>strictlyInside(p,a)))return true;
  // Covers coincident polygons and strips whose vertices all lie on shared boundary lines.
  for(const [p,q] of [[a,b],[b,a]]){
    const signed=p.reduce((sum,v,i)=>{const n=p[(i+1)%p.length];return sum+v.x*n.z-n.x*v.z;},0);
    for(let i=0;i<p.length;i++){
      const start=p[i],end=p[(i+1)%p.length],dx=end.x-start.x,dz=end.z-start.z,len=Math.hypot(dx,dz),step=Math.min(1e-5,len*.001),direction=signed>0?1:-1;
      const sample={x:(start.x+end.x)/2-direction*dz/len*step,z:(start.z+end.z)/2+direction*dx/len*step};
      if(strictlyInside(sample,p)&&strictlyInside(sample,q))return true;
    }
  }
  return false;
}
export function sketchRoomError(room:Room):string{
  if(!room.name.trim()||room.name.length>120)return 'Enter a room name with 1–120 characters.';
  if(!isSimplePolygon(room.points))return 'Keep at least three distinct corners, no crossing walls and at least 0.5 m² of floor area.';
  const b=bounds(room.points);
  if(b.width<.7||b.depth<.7||b.width>50||b.depth>50||room.points.some(p=>Math.abs(p.x)>150||Math.abs(p.z)>150))return 'Room width and depth must be 0.7–50 m, with every corner within 150 m of the origin.';
  if(!Number.isFinite(room.height)||room.height<1.8||room.height>6)return 'Ceiling height must be 1.8–6 m.';
  const opening=openingError(room);return opening?`${opening} Existing doors and windows have been kept.`:'';
}
export function sketchRoomsError(rooms:Room[]):string{
  if(rooms.length<1||rooms.length>30)return 'Keep between 1 and 30 rooms in this project.';
  const ids=new Set<string>();
  for(let i=0;i<rooms.length;i++){
    const room=rooms[i];if(ids.has(room.id))return 'Each room must have its own ID.';ids.add(room.id);
    const error=sketchRoomError(room);if(error)return `${room.name}: ${error}`;
    for(let j=0;j<i;j++)if(polygonsOverlap(room.points,rooms[j].points))return `${room.name} overlaps ${rooms[j].name}. Rooms may share walls, but their floor areas must not overlap.`;
  }
  return '';
}
