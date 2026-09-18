import { ASSETS } from './brand.js';

async function loadFromNodeFs(relPath) {
  const fsNs = 'node:fs/promises';
  const pathNs = 'node:path';
  const urlNs = 'node:url';
  const fs = await import(fsNs);
  const pathMod = await import(pathNs);
  const url = await import(urlNs);
  const here = pathMod.dirname(url.fileURLToPath(import.meta.url));
  const rel = String(relPath).replace(/^\.\//, '');
  const filePath = pathMod.resolve(here, '../public', rel);
  const buf = await fs.readFile(filePath);
  const mime = /\.jpe?g$/i.test(filePath) ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export async function loadAsDataUrl(path) {
  const isNode = typeof process !== 'undefined' && !!process.versions?.node;
  if (isNode) {
    return loadFromNodeFs(path);
  }

  const res = await fetch(path);
  if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function loadBrandAssets() {
  const [logo, cenefa, mascots] = await Promise.all([
    loadAsDataUrl(ASSETS.logo),
    loadAsDataUrl(ASSETS.cenefa),
    loadAsDataUrl(ASSETS.mascots),
  ]);
  return { logo, cenefa, mascots };
}

export function dataUrlDimensions(dataUrl) {
  const b64 = String(dataUrl || '').split(',')[1];
  if (!b64) return null;
  const binary = typeof atob === 'function'
    ? atob(b64)
    : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    return { w, h };
  }
  let i = 2;
  while (i < bytes.length - 8) {
    if (bytes[i] !== 0xFF) break;
    const marker = bytes[i + 1];
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      const h = (bytes[i + 5] << 8) | bytes[i + 6];
      const w = (bytes[i + 7] << 8) | bytes[i + 8];
      return { w, h };
    }
    i += 2 + len;
  }
  return null;
}

export function containRect(imgW, imgH, box) {
  if (!imgW || !imgH) return { x: box.x, y: box.y, w: box.w, h: box.h };
  const ir = imgW / imgH;
  const br = box.w / box.h;
  let dw = box.w;
  let dh = box.h;
  let dx = box.x;
  let dy = box.y;
  if (ir > br) {
    dh = box.w / ir;
    dy = box.y + (box.h - dh) / 2;
  } else {
    dw = box.h * ir;
    dx = box.x + (box.w - dw) / 2;
  }
  return { x: dx, y: dy, w: dw, h: dh };
}
