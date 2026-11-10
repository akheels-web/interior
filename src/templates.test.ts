import {describe,it,expect} from 'vitest';
import {HOME_TEMPLATES,buildTemplateProject,isProjectTemplate} from './templates';
import {area,bounds,inside,validateProject,wallOpenings} from './model';

describe('Original owner workspace templates',()=>{
  it.each(HOME_TEMPLATES)('$id produces a valid, connected editable concept at its advertised size',template=>{
    const p=buildTemplateProject(template.id),b=bounds(p.rooms.flatMap(r=>r.points));
    expect(()=>validateProject(p)).not.toThrow();expect(p.units).toEqual({length:'ft',area:'ft2'});
    expect(b.width/.3048).toBeCloseTo(template.widthFt,4);expect(b.depth/.3048).toBeCloseTo(template.depthFt,4);
    expect(p.rooms.reduce((sum,r)=>sum+area(r.points),0)/(.3048**2)).toBeCloseTo(template.widthFt*template.depthFt,3);
    expect(p.rooms).toHaveLength(template.rooms.length);
    expect(p.items.every(i=>inside(i,p.rooms.find(r=>r.id===i.roomId)!.points))).toBe(true);
    expect(p.rooms[0].openings.some(o=>o.type==='door'&&o.doorStyle==='main')).toBe(true);
    const hall=p.rooms.find(r=>r.name==='Passage');
    if(hall){const doors=hall.points.flatMap((_,edge)=>wallOpenings(hall,edge,p.rooms)).filter(o=>o.type==='door');expect(doors).toHaveLength(p.rooms.length-1);}
    for(let a=0;a<p.rooms.length;a++)for(let c=a+1;c<p.rooms.length;c++){const first=bounds(p.rooms[a].points),second=bounds(p.rooms[c].points);expect(Math.min(first.maxX,second.maxX)-Math.max(first.minX,second.minX)>1e-5&&Math.min(first.maxZ,second.maxZ)-Math.max(first.minZ,second.minZ)>1e-5).toBe(false);}
  });
  it('returns independent rooms, openings and furniture on every selection',()=>{
    const a=buildTemplateProject('family-30-40'),b=buildTemplateProject('family-30-40');
    const ids=(p:typeof a)=>[p.id,...p.rooms.flatMap(r=>[r.id,...r.openings.map(o=>o.id)]),...p.items.map(i=>i.id)];
    expect(ids(a).filter(id=>ids(b).includes(id))).toEqual([]);
    a.rooms[0].points[0].x=99;expect(b.rooms[0].points[0].x).not.toBe(99);expect(HOME_TEMPLATES[3].rooms[0].x).toBe(0);
  });
  it('offers unfurnished templates without removing rooms or openings',()=>{for(const t of HOME_TEMPLATES){const p=buildTemplateProject(t.id,false);expect(p.items).toEqual([]);expect(p.rooms).toHaveLength(t.rooms.length);expect(p.rooms[0].openings.length).toBeGreaterThan(0);}});
  it('keeps legacy sample and empty room creation available',()=>{expect(buildTemplateProject('sample').items.length).toBeGreaterThan(0);expect(buildTemplateProject('blank').items).toEqual([]);expect(buildTemplateProject('sample',false).items).toEqual([]);});
  it('rejects unknown and non-string selections',()=>{for(const invalid of ['__proto__','family-99-99','',{},null,3])expect(isProjectTemplate(invalid)).toBe(false);expect(()=>buildTemplateProject('unknown')).toThrow();});
});
