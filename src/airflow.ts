import * as T from 'three';
import type {Item,Settings} from './model';

export function motionIsPlaying(mode:Settings['motion'],reduced:boolean){
  return mode==='play'||(mode!=='pause'&&!reduced);
}
export type WindParticle={mesh:T.Mesh;curve:T.CatmullRomCurve3;phase:number;speed:number};
export type AirflowEffect={group:T.Group;materials:T.ShaderMaterial[];particles:WindParticle[]};

/** A presentation effect: traveling streaks, light mist and fan downwash, not a fluid solver. */
export function createAirflow(item:Item):AirflowEffect|null{
  if(!['ac','tower-ac','cassette-ac','ceiling-fan'].includes(item.kind)||!item.enabled||(item.powerLevel??60)<=0)return null;
  const fan=item.kind==='ceiling-fan',speed=(item.powerLevel??60)/100,reach=item.airflowRange??4;
  const group=new T.Group();group.position.set(item.x,item.y,item.z);
  group.rotation.y=(item.rotation+(item.airflowAngle??0))*Math.PI/180;
  const tint=new T.Color(fan?'#8acdd7':'#5ab8d1');
  const streak=new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,
    uniforms:{time:{value:0},speed:{value:.32+speed*.5},tint:{value:tint}},
    vertexShader:`
      attribute float aPhase;
      varying vec2 vUv; varying float vPhase;
      uniform float time;
      void main(){
        vUv=uv; vPhase=aPhase;
        vec3 p=position;
        float drift=sin(uv.x*3.14159265);
        p.x+=sin(uv.x*10.0-time*2.7+aPhase*6.28)*0.045*drift;
        p.y+=cos(uv.x*8.0-time*2.1+aPhase*6.28)*0.025*drift;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader:`
      varying vec2 vUv; varying float vPhase;
      uniform float time; uniform float speed; uniform vec3 tint;
      void main(){
        float travel=fract(vUv.x*2.2-time*speed+vPhase);
        float pulse=smoothstep(0.0,0.045,travel)*(1.0-smoothstep(0.12,0.38,travel));
        float fade=smoothstep(0.0,0.08,vUv.x)*(1.0-smoothstep(0.72,1.0,vUv.x));
        float alpha=pulse*fade*0.76;
        if(alpha<0.015)discard;
        gl_FragColor=vec4(mix(tint,vec3(0.94,1.0,1.0),pulse*0.35),alpha);
      }`
  });
  const particles:WindParticle[]=[],mist:{points:T.Vector3[];phase:number;size:number}[]=[];
  const emit=(outlet:T.Group,points:T.Vector3[],index:number)=>{
    const curve=new T.CatmullRomCurve3(points),geometry=new T.TubeGeometry(curve,56,fan?.022:.018,5,false);
    geometry.setAttribute('aPhase',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count).fill((index*.137)%1),1));
    const ribbon=new T.Mesh(geometry,streak);ribbon.castShadow=false;outlet.add(ribbon);
    const head=new T.Mesh(new T.SphereGeometry(.026,6,4),new T.MeshBasicMaterial({color:'#dbf8ff',transparent:true,opacity:.8,depthWrite:false}));
    head.scale.set(.7,.7,4);head.castShadow=false;outlet.add(head);
    particles.push({mesh:head,curve,phase:(index*.137)%1,speed:.22+speed*.22});
    for(let j=0;j<14;j++)mist.push({points:points.map(p=>outlet===group?p.clone():p.clone().applyMatrix4(outlet.matrix)),phase:(j/14+index*.137)%1,size:.65+(j%5)*.12});
  };
  if(fan){
    const drop=Math.max(.4,item.y-.18);
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6,r=.22+(i%3)*.1;
      emit(group,[new T.Vector3(Math.cos(angle)*r,0,Math.sin(angle)*r),
        new T.Vector3(Math.cos(angle+.35)*.5,-drop*.3,Math.sin(angle+.35)*.5),
        new T.Vector3(Math.cos(angle+.85)*.85,-drop*.8,Math.sin(angle+.85)*.85),
        new T.Vector3(Math.cos(angle+1.2)*1.55,-drop,Math.sin(angle+1.2)*1.55)],i);
    }
  }else{
    const directions=item.kind==='cassette-ac'?4:1;
    for(let d=0;d<directions;d++){
      const outlet=new T.Group();outlet.rotation.y=d*Math.PI/2;outlet.updateMatrix();group.add(outlet);
      for(let i=0;i<9;i++){
        const spread=(i-4)*.105,baseY=item.kind==='tower-ac'?item.height*.7:item.kind==='cassette-ac'?0:.04;
        const down=Math.min(item.y+baseY-.25,reach*.4);
        emit(outlet,[new T.Vector3(spread*.6,baseY,item.depth*.55),
          new T.Vector3(spread,baseY-down*.15,reach*.27),
          new T.Vector3(spread*2,baseY-down*.75,reach*.68),
          new T.Vector3(spread*3.2,Math.max(-item.y+.18,baseY-down),reach)],i+d*9);
      }
    }
  }
  // One GPU draw for all mist specks; no per-speck JavaScript updates.
  const geometry=new T.BufferGeometry(),count=mist.length;
  geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(count*3),3));
  for(let k=0;k<4;k++)geometry.setAttribute('p'+k,new T.Float32BufferAttribute(mist.flatMap(m=>m.points[k].toArray()),3));
  geometry.setAttribute('aPhase',new T.Float32BufferAttribute(mist.map(m=>m.phase),1));
  geometry.setAttribute('aSize',new T.Float32BufferAttribute(mist.map(m=>m.size),1));
  const mistMaterial=new T.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{time:{value:0},speed:{value:.22+speed*.22},tint:{value:new T.Color('#c4edf2')}},
    vertexShader:`
      attribute vec3 p0; attribute vec3 p1; attribute vec3 p2; attribute vec3 p3;
      attribute float aPhase; attribute float aSize;
      uniform float time; uniform float speed; varying float vFade;
      void main(){
        float t=fract(time*speed+aPhase),u=1.0-t;
        vec3 p=u*u*u*p0+3.0*u*u*t*p1+3.0*u*t*t*p2+t*t*t*p3;
        p.x+=sin(t*15.0+aPhase*31.0+time)*0.13*t;
        p.z+=cos(t*11.0+aPhase*21.0+time)*0.08*t;
        vFade=sin(t*3.14159265);
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_PointSize=clamp(110.0*aSize/max(0.2,-mv.z),2.0,22.0);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      varying float vFade; uniform vec3 tint;
      void main(){vec2 p=gl_PointCoord-0.5;float soft=exp(-dot(p,p)*18.0);
        gl_FragColor=vec4(tint,soft*vFade*0.16);}
    `
  });
  const haze=new T.Points(geometry,mistMaterial);haze.frustumCulled=false;group.add(haze);
  return {group,materials:[streak,mistMaterial],particles};
}
