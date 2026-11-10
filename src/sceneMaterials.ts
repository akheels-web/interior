import * as T from 'three';
/** Small reusable procedural tiles; tint comes from the project's exact hex colour. */
export function surfaceTexture(style:string):T.CanvasTexture{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!;
  let seed=37;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  c.fillStyle='#f1f0ec';c.fillRect(0,0,256,256);
  if(style==='brick'){
    c.fillStyle='#c6c2b9';c.fillRect(0,0,256,256);
    for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const shade=190+Math.floor(random()*45);c.fillStyle=`rgb(${shade},${shade-3},${shade-7})`;c.fillRect(col*64+(row%2)*32+2,row*32+2,60,28);}
  }else if(style==='wood-panel'){
    for(let i=0;i<16;i++){c.fillStyle=i%2?'#e7e1d5':'#b7ad9a';c.fillRect(i*16,0,14,256);for(let j=0;j<6;j++){c.strokeStyle='#c6beaf';c.beginPath();c.moveTo(i*16+random()*12,0);c.lineTo(i*16+random()*12,256);c.stroke();}}
  }else if(style==='ribbed'){
    for(let x=0;x<256;x+=9){c.fillStyle='#aaa9a3';c.fillRect(x,0,2,256);c.fillStyle='#f8f7f1';c.fillRect(x+3,0,3,256);}
  }else if(style==='woven'){
    for(let x=0;x<256;x+=4)for(let y=0;y<256;y+=4){c.fillStyle=(x+y)%8?'#b8b7b0':'#e8e7de';c.fillRect(x,y,3,2);c.fillStyle='#d1d0c6';c.fillRect(x+1,y+2,2,2);}
  }else if(style==='boucle'){
    for(let i=0;i<3500;i++){c.strokeStyle=random()>.5?'#bcbab1':'#faf8ec';c.lineWidth=.8;c.beginPath();c.arc(random()*256,random()*256,.7+random()*2,0,Math.PI*2);c.stroke();}
  }else{
    for(let i=0;i<12500;i++){const value=style==='limewash'?220+Math.floor(random()*30):185+Math.floor(random()*60);c.fillStyle=`rgba(${value},${value},${value},.35)`;const size=style==='limewash'?8+random()*18:1+random()*2;c.fillRect(random()*256,random()*256,size,size);}
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(style==='brick'||style==='wood-panel'?2:4,style==='brick'||style==='wood-panel'?2:4);texture.anisotropy=4;return texture;
}
