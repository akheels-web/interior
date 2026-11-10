import { describe, expect, it, vi } from 'vitest';
import { boundedRasterSize, decodePlanRaster, inspectPlanBytes, MAX_PLAN_BYTES, validatePlanSize } from './planInput';

function png(width:number,height:number) {
  const bytes=new Uint8Array(33),view=new DataView(bytes.buffer);
  bytes.set([137,80,78,71,13,10,26,10]);view.setUint32(8,13);bytes.set([73,72,68,82],12);view.setUint32(16,width);view.setUint32(20,height);return bytes;
}
function webp(chunk:string,width:number,height:number) {
  const bytes=new Uint8Array(30),view=new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode('RIFF'));view.setUint32(4,22,true);bytes.set(new TextEncoder().encode('WEBP'+chunk),8);
  if(chunk==='VP8X'){bytes[24]=(width-1)&255;bytes[25]=((width-1)>>8)&255;bytes[26]=((width-1)>>16)&255;bytes[27]=(height-1)&255;bytes[28]=((height-1)>>8)&255;bytes[29]=((height-1)>>16)&255;}
  if(chunk==='VP8L'){bytes[20]=47;view.setUint32(21,((height-1)<<14)|(width-1),true);}
  if(chunk==='VP8 '){bytes.set([157,1,42],23);view.setUint16(26,width,true);view.setUint16(28,height,true);}
  return bytes;
}

describe('local floor-plan byte validation',()=>{
  it('accepts an actual PDF header without relying on file extension',()=>expect(inspectPlanBytes(new TextEncoder().encode('%PDF-1.7\n'))).toEqual({kind:'pdf'}));
  it('rejects empty, oversized and renamed unrelated files',()=>{
    expect(()=>validatePlanSize(0)).toThrow(/empty/);
    expect(()=>validatePlanSize(MAX_PLAN_BYTES+1)).toThrow(/25 MB/);
    expect(()=>inspectPlanBytes(new TextEncoder().encode('<html>not an image</html>'))).toThrow(/not a supported plan/);
  });
  it('reads PNG dimensions and rejects malformed or decompression-sized headers',()=>{
    expect(inspectPlanBytes(png(1200,800))).toEqual({kind:'png',width:1200,height:800});
    expect(()=>inspectPlanBytes(png(10000,10000))).toThrow(/24 megapixels/);
    expect(()=>inspectPlanBytes(png(0,800))).toThrow(/invalid dimensions/);
    const malformed=png(1200,800);malformed[12]=0;expect(()=>inspectPlanBytes(malformed)).toThrow(/header is damaged/);
  });
  it('reads JPEG dimensions after metadata and rejects truncated segments',()=>{
    const jpeg=new Uint8Array([255,216,255,224,0,4,0,0,255,192,0,8,8,3,32,4,176,3]);
    expect(inspectPlanBytes(jpeg)).toEqual({kind:'jpeg',width:1200,height:800});
    expect(()=>inspectPlanBytes(jpeg.subarray(0,14))).toThrow(/dimensions could not be read/);
  });
  it('accounts for a rotated JPEG orientation before requesting a bounded bitmap',()=>{
    const bytes=new Uint8Array(48),view=new DataView(bytes.buffer);
    bytes.set([255,216,255,225,0,34]);bytes.set(new TextEncoder().encode('Exif\0\0II'),6);
    view.setUint16(14,42,true);view.setUint32(16,8,true);view.setUint16(20,1,true);
    view.setUint16(22,274,true);view.setUint16(24,3,true);view.setUint32(26,1,true);view.setUint16(30,6,true);
    bytes.set([255,192,0,8,8,3,32,4,176,3],38);
    expect(inspectPlanBytes(bytes)).toEqual({kind:'jpeg',width:800,height:1200});
  });
  it.each(['VP8X','VP8L','VP8 '])('reads %s WebP image dimensions',chunk=>expect(inspectPlanBytes(webp(chunk,1200,800))).toEqual({kind:'webp',width:1200,height:800}));
  it('rejects animated and truncated WebP plans',()=>{
    const animated=webp('VP8X',1200,800);animated[20]=2;expect(()=>inspectPlanBytes(animated)).toThrow(/Animated/);
    const truncated=webp('VP8X',1200,800);new DataView(truncated.buffer).setUint32(4,100,true);expect(()=>inspectPlanBytes(truncated)).toThrow(/incomplete/);
  });
  it('bounds render memory while preserving aspect ratio and small images',()=>{
    expect(boundedRasterSize(12000,4000)).toEqual({width:1600,height:533});
    expect(boundedRasterSize(800,1200)).toEqual({width:800,height:1200});
    expect(boundedRasterSize(100,12000)).toEqual({width:13,height:1600});
  });
  it('requests a bounded bitmap independently of the PDF reader',async()=>{
    const bitmap={close:vi.fn()} as unknown as ImageBitmap;
    const decode=vi.fn(async()=>bitmap);
    expect(await decodePlanRaster(png(8000,3000),{kind:'png',width:8000,height:3000},()=>true,decode)).toBe(bitmap);
    expect(decode).toHaveBeenCalledWith(expect.any(Blob),{resizeWidth:1600,resizeHeight:600,resizeQuality:'high',imageOrientation:'from-image'});
    expect(bitmap.close).not.toHaveBeenCalled();
  });
  it('releases a bitmap when the importer closes while decoding',async()=>{
    let current=true,finish!:(bitmap:ImageBitmap)=>void;
    const bitmap={close:vi.fn()} as unknown as ImageBitmap;
    const pending=decodePlanRaster(png(1200,800),{kind:'png',width:1200,height:800},()=>current,()=>new Promise(resolve=>{finish=resolve;}));
    current=false;finish(bitmap);
    expect(await pending).toBeNull();expect(bitmap.close).toHaveBeenCalledOnce();
  });
  it('does not start stale decodes or surface their later failures',async()=>{
    const never=vi.fn();
    expect(await decodePlanRaster(png(1200,800),{kind:'png',width:1200,height:800},()=>false,never)).toBeNull();
    expect(never).not.toHaveBeenCalled();
    let current=true,reject!:(error:Error)=>void;
    const pending=decodePlanRaster(png(1200,800),{kind:'png',width:1200,height:800},()=>current,()=>new Promise((_,fail)=>{reject=fail;}));
    current=false;reject(new Error('cancelled decode'));
    expect(await pending).toBeNull();
  });
});
