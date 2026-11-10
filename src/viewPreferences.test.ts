import {afterEach,describe,expect,it,vi} from 'vitest';
import {defaultSettings} from './model';
import {readViewPreferences,writeViewPreferences} from './viewPreferences';

afterEach(()=>vi.unstubAllGlobals());
describe('device-only view preferences',()=>{
  function storage(value:string|null=null){const values=new Map(value?[['forma.studio.view.v1',value]]:[]);vi.stubGlobal('window',{localStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,next:string)=>values.set(key,next)}});return values;}
  it('reads only supported motion and boolean wall preferences',()=>{
    storage(JSON.stringify({motion:'pause',cutaway:false,ghostWalls:true,project:{id:'private-project'},session:'private-session',roomId:'private-room'}));
    expect(readViewPreferences()).toEqual({motion:'pause',cutaway:false,ghostWalls:true});
    storage(JSON.stringify({motion:'unexpected',cutaway:'false',ghostWalls:1}));expect(readViewPreferences()).toEqual({});
  });
  it('never serializes project data or identity passed alongside settings',()=>{
    const values=storage();writeViewPreferences({...defaultSettings,motion:'play',cutaway:true,ghostWalls:true,project:{name:'private-client-plan'},identity:'private-user'} as typeof defaultSettings);
    expect(JSON.parse(values.get('forma.studio.view.v1')!)).toEqual({motion:'play',cutaway:true,ghostWalls:true});expect(values.size).toBe(1);
  });
  it('keeps in-session controls usable when storage is blocked or malformed',()=>{
    storage('null');expect(readViewPreferences()).toEqual({});storage('{');expect(readViewPreferences()).toEqual({});
    vi.stubGlobal('window',{localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('quota');}}});expect(readViewPreferences()).toEqual({});expect(()=>writeViewPreferences(defaultSettings)).not.toThrow();
    vi.stubGlobal('window',undefined);expect(readViewPreferences()).toEqual({});
  });
});
