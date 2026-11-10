export const MAX_PLAN_BYTES = 25 * 1024 * 1024;
export const MAX_RASTER_PIXELS = 24_000_000;
export const MAX_RASTER_SIDE = 12_000;
export type PlanInput = { kind: 'pdf' } | { kind: 'png' | 'jpeg' | 'webp'; width: number; height: number };
export class PlanInputError extends Error {}

export function validatePlanSize(size: number) {
  if (!Number.isFinite(size) || size < 5) throw new PlanInputError('This file is empty or incomplete. Choose a PDF, PNG, JPEG or WebP floor plan.');
  if (size > MAX_PLAN_BYTES) throw new PlanInputError('Choose a floor plan no larger than 25 MB.');
}

function raster(kind: 'png' | 'jpeg' | 'webp', width: number, height: number): PlanInput {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new PlanInputError('The image header has invalid dimensions. Export a fresh copy of the plan.');
  if (width > MAX_RASTER_SIDE || height > MAX_RASTER_SIDE || width * height > MAX_RASTER_PIXELS) throw new PlanInputError('This image is too large to decode safely. Export a smaller image, up to 24 megapixels and 12,000 pixels per side.');
  return { kind, width, height };
}

/** Inspect actual bytes before the browser decodes an image; filenames and MIME strings are not trusted. */
export function inspectPlanBytes(bytes: Uint8Array): PlanInput {
  validatePlanSize(bytes.length);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (bytes.length >= 24 && bytes[0] === 137 && ascii(1, 3) === 'PNG' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) {
    if (ascii(12, 4) !== 'IHDR' || view.getUint32(8) !== 13) throw new PlanInputError('The PNG image header is damaged. Export a fresh copy.');
    return raster('png', view.getUint32(16), view.getUint32(20));
  }
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let cursor = 2, orientation = 1;
    while (cursor + 3 < bytes.length) {
      if (bytes[cursor++] !== 255) throw new PlanInputError('This JPEG is damaged or incomplete. Export a fresh copy.');
      while (cursor < bytes.length && bytes[cursor] === 255) cursor++;
      const marker = bytes[cursor++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (cursor + 2 > bytes.length) break;
      const length = view.getUint16(cursor);
      if (length < 2 || cursor + length > bytes.length) break;
      if (marker === 225 && length >= 16 && ascii(cursor+2,6) === 'Exif\0\0') {
        const base=cursor+8,end=cursor+length,little=ascii(base,2)==='II';
        if ((little||ascii(base,2)==='MM') && base+8<=end && view.getUint16(base+2,little)===42) {
          const directory=base+view.getUint32(base+4,little);
          if(directory>=base && directory+2<=end) {
            const count=Math.min(view.getUint16(directory,little),256);
            for(let i=0;i<count;i++) {
              const entry=directory+2+i*12;
              if(entry+12>end) break;
              if(view.getUint16(entry,little)===274 && view.getUint16(entry+2,little)===3 && view.getUint32(entry+4,little)===1) orientation=view.getUint16(entry+8,little);
            }
          }
        }
      }
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 8) {
        const width=view.getUint16(cursor+5),height=view.getUint16(cursor+3);
        return orientation>=5&&orientation<=8?raster('jpeg',height,width):raster('jpeg',width,height);
      }
      cursor += length;
    }
    throw new PlanInputError('The JPEG dimensions could not be read. Export a fresh JPEG or PNG copy.');
  }
  if (bytes.length >= 30 && ascii(0,4) === 'RIFF' && ascii(8,4) === 'WEBP') {
    const size = view.getUint32(4, true) + 8;
    if (size > bytes.length || size < 30) throw new PlanInputError('This WebP image is incomplete. Export a fresh copy.');
    const chunk = ascii(12,4);
    const little24 = (offset: number) => bytes[offset] | (bytes[offset+1] << 8) | (bytes[offset+2] << 16);
    if (chunk === 'VP8X') {
      if (bytes[20] & 2) throw new PlanInputError('Use a still floor-plan image. Animated WebP files are not supported.');
      return raster('webp', little24(24)+1, little24(27)+1);
    }
    if (chunk === 'VP8L' && bytes[20] === 47) {
      const bits = view.getUint32(21,true);
      return raster('webp', (bits & 0x3fff)+1, ((bits >>> 14) & 0x3fff)+1);
    }
    if (chunk === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return raster('webp',view.getUint16(26,true)&0x3fff,view.getUint16(28,true)&0x3fff);
    throw new PlanInputError('The WebP image header could not be read. Export a PNG or JPEG copy.');
  }
  if (new TextDecoder().decode(bytes.subarray(0, Math.min(1024, bytes.length))).includes('%PDF-')) return { kind:'pdf' };
  throw new PlanInputError('This file is not a supported plan. Choose a PDF, PNG, JPEG or WebP file; renaming another file does not convert it.');
}

export function boundedRasterSize(width: number, height: number, maxSide = 1600) {
  const factor = Math.min(1, maxSide / Math.max(width,height));
  return { width:Math.max(1,Math.round(width*factor)), height:Math.max(1,Math.round(height*factor)) };
}

/** A cancelled native decode cannot be interrupted; close its result instead of retaining it. */
export async function decodePlanRaster(
  bytes: Uint8Array<ArrayBuffer>,
  info: Extract<PlanInput, { width: number }>,
  isCurrent: () => boolean,
  decode: (blob: Blob, options: ImageBitmapOptions) => Promise<ImageBitmap> = createImageBitmap,
): Promise<ImageBitmap | null> {
  if (!isCurrent()) return null;
  const size = boundedRasterSize(info.width, info.height);
  let bitmap: ImageBitmap;
  try {
    bitmap = await decode(new Blob([bytes], { type: `image/${info.kind}` }), {
      resizeWidth: size.width, resizeHeight: size.height, resizeQuality: 'high', imageOrientation: 'from-image',
    });
  } catch {
    if (!isCurrent()) return null;
    throw new PlanInputError('This image could not be decoded. It may be damaged. Export a fresh PNG, JPEG or WebP copy and try again.');
  }
  if (!isCurrent()) { bitmap.close(); return null; }
  return bitmap;
}
