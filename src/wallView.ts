import * as T from 'three';
import type {Settings} from './model';
export type WallView={group:T.Group;midpoint:T.Vector3;normal:T.Vector3};
export function shellClipEnabled(settings:Settings){
  return settings.wholeHome&&settings.cutaway&&settings.camera!=='walk';
}
export function applyWallView(walls:WallView[],settings:Settings,camera:T.Camera){
  for(const wall of walls){
    const front=camera.position.clone().sub(wall.midpoint).dot(wall.normal)>=0;
    wall.group.visible=settings.showWalls&&settings.camera!=='top'&&(!settings.cutaway||settings.camera==='walk'||!front);
    const ghost=!!settings.ghostWalls&&!settings.cutaway&&settings.camera==='orbit'&&front;
    wall.group.traverse(object=>{
      if(object.userData.wallOutline){object.visible=ghost;return;}
      if(!(object instanceof T.Mesh))return;
      if(object.userData.baseCastShadow===undefined)object.userData.baseCastShadow=object.castShadow;
      object.castShadow=ghost?false:object.userData.baseCastShadow;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        material.userData.wallBase??={opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite};
        const base=material.userData.wallBase;
        const transparent=ghost||base.transparent,depthWrite=ghost?false:base.depthWrite;
        if(material.transparent!==transparent||material.depthWrite!==depthWrite)material.needsUpdate=true;
        material.transparent=transparent;material.depthWrite=depthWrite;material.opacity=ghost?base.opacity*.14:base.opacity;
      }
    });
  }
}
