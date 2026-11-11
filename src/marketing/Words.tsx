import {Fragment,type CSSProperties} from 'react';

/** Splits text into masked words so CSS can slide each one up in sequence (--i is its order). */
export function Words({text,start=0}:{text:string;start?:number}){
  return <>{text.split(' ').map((word,index)=><Fragment key={index}><span className="ps-w" style={{'--i':start+index} as CSSProperties}><span>{word}</span></span>{' '}</Fragment>)}</>;
}
