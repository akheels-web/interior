import type { Project } from './model';
export type LengthUnit = 'm'|'cm'|'mm'|'ft'|'in';
export type AreaUnit = 'm2'|'cm2'|'ft2'|'yd2';
export type UnitsConfig = { length: LengthUnit; area: AreaUnit };
export const defaultUnits:UnitsConfig={length:'m',area:'m2'};
export const lengthUnits:{id:LengthUnit;label:string;symbol:string}[]=[{id:'m',label:'Metres',symbol:'m'},{id:'cm',label:'Centimetres',symbol:'cm'},{id:'mm',label:'Millimetres',symbol:'mm'},{id:'ft',label:'Feet',symbol:'ft'},{id:'in',label:'Inches',symbol:'in'}];
export const areaUnits:{id:AreaUnit;label:string;symbol:string}[]=[{id:'m2',label:'Square metres',symbol:'m²'},{id:'cm2',label:'Square centimetres',symbol:'cm²'},{id:'ft2',label:'Square feet',symbol:'sq ft'},{id:'yd2',label:'Square yards',symbol:'sq yd'}];
const metres:Record<LengthUnit,number>={m:1,cm:.01,mm:.001,ft:.3048,in:.0254};
const squareMetres:Record<AreaUnit,number>={m2:1,cm2:.0001,ft2:.09290304,yd2:.83612736};
export function toDisplayLength(value:number,unit:LengthUnit){return value/metres[unit];}
export function fromDisplayLength(value:number,unit:LengthUnit){return value*metres[unit];}
export function formatLength(value:number,unit:LengthUnit,digits=2){return `${toDisplayLength(value,unit).toLocaleString('en-IN',{maximumFractionDigits:digits})} ${unit}`;}
export function formatArea(value:number,unit:AreaUnit,digits=1){return `${(value/squareMetres[unit]).toLocaleString('en-IN',{maximumFractionDigits:digits})} ${areaUnits.find(u=>u.id===unit)!.symbol}`;}
export function getUnits(project:Pick<Project,'units'>):UnitsConfig{return project.units??defaultUnits;}
