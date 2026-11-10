import {ImageResponse} from 'next/og';
import {BRAND_PATHS} from '../brand/BrandMark';
import {brandPalette as b} from '../brand/palette';
import {WORDMARK_PATHS,WORDMARK_WIDTH} from '../brand/wordmark';
export const alt='PlanSaathi — From floor plan to a clear vision';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:b.tint,color:b.ink,padding:72,flexDirection:'column',justifyContent:'space-between',fontFamily:'sans-serif'}}><svg width={WORDMARK_WIDTH} height="48" viewBox={`0 0 ${WORDMARK_WIDTH} 48`}><g fill={b.primary}>{BRAND_PATHS.map(path=><path d={path} key={path}/>)}</g><g fill={b.ink}>{WORDMARK_PATHS.map(path=><path d={path} key={path}/>)}</g></svg><div style={{display:'flex',flexDirection:'column',fontSize:80,letterSpacing:-4,lineHeight:1.07,fontWeight:700}}><span>From floor plan</span><span style={{color:b.primary}}>to a clear vision.</span></div><div style={{display:'flex',fontSize:24,color:b.muted}}>Editable 3D interiors. Designed around your ideas.</div></div>,size);}
