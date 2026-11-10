import type {Settings} from './model';
type ViewPreferences=Pick<Settings,'motion'|'cutaway'|'ghostWalls'>;
const key='forma.studio.view.v1';
/** Device preferences only: never client plans, identities, sessions or credentials. */
export function readViewPreferences():Partial<ViewPreferences>{
  if(typeof window==='undefined')return {};
  try{const value=JSON.parse(window.localStorage.getItem(key)||'{}');return {
    ...(['auto','play','pause'].includes(value.motion)?{motion:value.motion}:{}),
    ...(typeof value.cutaway==='boolean'?{cutaway:value.cutaway}:{}),
    ...(typeof value.ghostWalls==='boolean'?{ghostWalls:value.ghostWalls}:{})
  };}catch{return {};}
}
export function writeViewPreferences(settings:ViewPreferences){
  try{window.localStorage.setItem(key,JSON.stringify({motion:settings.motion,cutaway:settings.cutaway,ghostWalls:settings.ghostWalls}));}catch{/* The in-session controls still work when device storage is blocked. */}
}
