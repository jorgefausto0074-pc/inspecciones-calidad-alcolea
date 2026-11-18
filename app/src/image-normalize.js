/**
 * Fotos para PowerPoint/PDF: solo JPEG o PNG reales, máx. 1600 px de lado.
 * WebP, HEIC, AVIF, GIF, BMP… (galería de Windows/iPhone) se convierten a JPEG en el navegador;
 * si el navegador no puede decodificarlas, se devuelve null (la ficha queda con el hueco gris).
 */
const MAX_SIDE = 1600;

function mimeOf(dataUrl) {
  const m = /^data:([^;,]+)/i.exec(String(dataUrl || ''));
  return m ? m[1].toLowerCase() : '';
}

function bytesHead(dataUrl, n = 12) {
  const b64 = String(dataUrl).split(',')[1] || '';
  const bin = typeof atob === 'function' ? atob(b64.slice(0, 24)) : Buffer.from(b64.slice(0, 24), 'base64').toString('binary');
  return Array.from(bin.slice(0, n), (c) => c.charCodeAt(0));
}

export function realImageKind(dataUrl) {
  try {
    const b = bytesHead(dataUrl);
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpeg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'png';
  } catch { /* ignore */ }
  return null;
}

function hasCanvas() {
  return typeof document !== 'undefined' && typeof Image !== 'undefined';
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = src;
  });
}

/** Devuelve un data URL JPEG/PNG apto para PowerPoint, o null si no se puede convertir. */
export async function normalizePhoto(dataUrl) {
  if (!dataUrl) return null;
  const kind = realImageKind(dataUrl);
  if (!hasCanvas()) {
    // Node (scripts de prueba): solo se aceptan JPEG/PNG reales con la cabecera correcta
    if (!kind) return null;
    return `data:image/${kind};base64,${String(dataUrl).split(',')[1]}`;
  }
  let img;
  try {
    img = await loadImage(dataUrl);
  } catch {
    return null;
  }
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;
  const okType = kind && mimeOf(dataUrl) === `image/${kind}`;
  if (okType && Math.max(w, h) <= MAX_SIDE) return dataUrl;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.88);
}

/** Copia de la sesión con todas las fotos normalizadas (no modifica la original). */
export async function sessionWithNormalizedPhotos(session) {
  const photos = [];
  let skipped = 0;
  for (const p of session.photos || []) {
    const dataUrl = await normalizePhoto(p.dataUrl);
    if (!dataUrl && p.dataUrl) skipped += 1;
    photos.push({ ...p, dataUrl });
  }
  return { session: { ...session, photos }, skipped };
}
