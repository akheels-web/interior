'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StudioScene } from './scene';
import type { Project, Settings } from './model';
import './scene.css';
export interface ViewportHandle { capture:()=>string; fit:()=>void; zoom:(delta:number)=>void }
interface Props { project:Project;settings:Settings;selectedId:string|null;onSelect:(id:string|null)=>void;onMove:(id:string,x:number,z:number)=>void }
const Viewport=forwardRef<ViewportHandle,Props>(function Viewport(props,ref){const host=useRef<HTMLDivElement>(null);const engine=useRef<StudioScene|null>(null);const latest=useRef(props);latest.current=props;const [error,setError]=useState('');
  useEffect(()=>{if(!host.current)return;try{engine.current=new StudioScene(host.current,{onSelect:id=>latest.current.onSelect(id),onMove:(id,x,z)=>latest.current.onMove(id,x,z),onError:setError});engine.current.update(latest.current.project,latest.current.settings,latest.current.selectedId);}catch{setError('3D rendering is unavailable in this browser. Enable hardware acceleration or use a browser with WebGL 2 support. You can still edit your project using the properties panels.');}return()=>{engine.current?.dispose();engine.current=null;};},[]);
  useEffect(()=>{if(process.env.NODE_ENV!=='development')return;const timer=setInterval(()=>{if(host.current&&engine.current)host.current.dataset.renderDiagnostics=JSON.stringify(engine.current.diagnostics());},1500);return()=>clearInterval(timer);},[]);
  useEffect(()=>{engine.current?.update(props.project,props.settings,props.selectedId);},[props.project,props.settings,props.selectedId]);
  useImperativeHandle(ref,()=>({capture:()=>{if(!engine.current||error)throw new Error('The 3D view is not available for capture.');return engine.current.capture();},fit:()=>engine.current?.fit(),zoom:delta=>engine.current?.zoom(delta)}),[error]);
  return <div ref={host} className="scene-host" style={{position:'relative',width:'100%',height:'100%',overflow:'hidden'}}>{error&&<div className="scene-error" role="alert" style={{position:'absolute',inset:'20%',zIndex:2,padding:24,background:'var(--surface,white)',borderRadius:12}}><strong>3D view needs attention</strong><p>{error}</p></div>}</div>;
});
export default Viewport;
