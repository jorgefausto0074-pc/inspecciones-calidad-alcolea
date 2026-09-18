/**
 * Genera PPTX + PDF de demostración con el diseño v3 (fotos placeholder EJEMPLO).
 * No usa datos reales de planta.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { exportPptx } from '../src/export-pptx.js';
import { exportPdf } from '../src/export-pdf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, '..', 'samples');
mkdirSync(outDir, { recursive: true });

function parseHex(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function makePng(w, h, bg) {
  const [r, g, b] = parseHex(bg);
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 3;
      const border = x < 10 || y < 10 || x >= w - 10 || y >= h - 10;
      const band = y > h / 2 - 40 && y < h / 2 + 40;
      if (border) {
        raw[i] = 255; raw[i + 1] = 192; raw[i + 2] = 0;
      } else if (band) {
        raw[i] = 255; raw[i + 1] = 255; raw[i + 2] = 220;
      } else {
        raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
      }
    }
  }
  const compressed = zlib.deflateSync(raw);
  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function pngDataUrl(w, h, bg) {
  return `data:image/png;base64,${makePng(w, h, bg).toString('base64')}`;
}

const session = {
  coverTitle: 'INSPECCION INCIDENCIAS CALIDAD',
  coverSubtitle: 'REFRESCO IBERIA PLANTA ALCOLEA',
  slideTitle: 'INSPECCIÓN SEPTIEMBRE 2026',
  photos: [
    {
      id: 'ph_j1',
      code: 'J-',
      ubicacion: 'CALLE FC-43',
      comentario: 'REPARAR ESTANTERIA JUNTO CALLE FC-43',
      status: 'pending',
      displayName: 'J--CALLE-FC-43-EJEMPLO',
      dataUrl: pngDataUrl(640, 480, '#D5E6DB'),
    },
    {
      id: 'ph_ex1',
      code: 'EX',
      ubicacion: 'ZONA A',
      comentario: 'EJEMPLO — LIMPIEZA PENDIENTE — ZONA A',
      status: 'pending',
      displayName: 'EX-ZONA-A-EJEMPLO',
      dataUrl: pngDataUrl(640, 480, '#70AD47'),
    },
    {
      id: 'ph_j2',
      code: 'J-',
      ubicacion: 'EB-06',
      comentario: 'REPARAR ESTANTERIA EB-06',
      status: 'resolved',
      displayName: 'J--EB-06-EJEMPLO',
      dataUrl: pngDataUrl(640, 480, '#C8E6D0'),
    },
  ],
};

const pptx = await exportPptx(session);
const pptxBuf = Buffer.from(await pptx.blob.arrayBuffer());
const pptxPath = join(outDir, 'informe-ejemplo-alcolea.pptx');
writeFileSync(pptxPath, pptxBuf);

const pdf = await exportPdf(session);
const pdfBuf = Buffer.from(await pdf.blob.arrayBuffer());
const pdfPath = join(outDir, 'informe-ejemplo-alcolea.pdf');
writeFileSync(pdfPath, pdfBuf);

console.log('OK sample PPTX:', pptxPath, pptxBuf.length, 'bytes');
console.log('OK sample PDF:', pdfPath, pdfBuf.length, 'bytes');
