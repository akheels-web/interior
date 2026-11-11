import type {CSSProperties} from 'react';
import {FileUp,LockKeyhole,Presentation,Ruler} from 'lucide-react';
import {FABRIC_STYLES,FLOOR_FINISHES,SOFA_SHAPES,WALL_TEXTURES} from '../model';

// Every word in the moving rows is a real option from the studio catalogue.
const rows=[FLOOR_FINISHES.map(finish=>finish.name),[...WALL_TEXTURES.map(texture=>texture.name),...FABRIC_STYLES.map(fabric=>`${fabric.label} weave`)],SOFA_SHAPES.map(shape=>shape.label)];
const statement='Clients don’t read floor plans. They read rooms: the light at six in the evening, the grain of the floor, the sofa in exactly the right blue.'.split(' ');
const capabilities=[[FileUp,'PDF & image import'],[Ruler,'Metric & imperial units'],[LockKeyhole,'Private projects'],[Presentation,'Presentation exports']] as const;

export default function MaterialBand(){
  return <section className="ps-band" aria-labelledby="band-title">
    <div className="ps-marquee" aria-hidden="true">{rows.map((names,row)=><div key={row} className="ps-marquee-row" data-reverse={row%2===1||undefined}><div>{[0,1].map(copy=><span key={copy}>{names.map((name,index)=><span key={name} data-fill={index%3===row%3||undefined}>{name}</span>)}</span>)}</div></div>)}</div>
    <div className="ps-container">
      <h2 id="band-title" className="ps-statement" data-progress aria-label={statement.join(' ')}>{statement.map((word,index)=><span key={index} aria-hidden="true" style={{'--i':index} as CSSProperties}>{word} </span>)}</h2>
      <ul className="ps-band-list">{capabilities.map(([Icon,label])=><li key={label}><Icon size={20} aria-hidden="true"/>{label}</li>)}</ul>
    </div>
  </section>;
}
