/**
 * Genera un PPTX de demostración con imágenes placeholder marcadas EJEMPLO.
 * No usa datos reales de planta.
 */
import PptxGenJS from 'pptxgenjs';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

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
      // yellow band for "EJEMPLO" visual cue
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

const W = 13.333;
const H = 7.5;
const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'WIDE16x9', width: W, height: H });
pptx.layout = 'WIDE16x9';
pptx.author = 'Refresco Iberia — Calidad Alcolea (DEMO)';
pptx.title = 'INSPECCION INCIDENCIAS CALIDAD 2026 — EJEMPLO';

const logoPath = join(root, 'public/assets/logo-diamante.png');
const stampPath = join(root, 'public/assets/sello-resuelto.png');
const tmpFiles = [];

const cover = pptx.addSlide();
cover.addText('INSPECCION INCIDENCIAS CALIDAD 2026', {
  x: 1.67, y: 1.7, w: 10, h: 1.6, fontSize: 36, bold: true, align: 'center', valign: 'middle', fontFace: 'Calibri',
});
cover.addText('REFRESCO IBERIA PLANTA ALCOLEA', {
  x: 1.67, y: 4.4, w: 10, h: 1.0, fontSize: 18, bold: true, align: 'center', fontFace: 'Calibri',
});
cover.addText('EJEMPLO — DATOS DE DEMOSTRACIÓN (NO REALES)', {
  x: 1.67, y: 5.5, w: 10, h: 0.4, fontSize: 12, color: 'C00000', align: 'center', bold: true,
});
if (existsSync(logoPath)) cover.addImage({ path: logoPath, x: 10.3, y: 3.9, w: 2.35, h: 2.35 });

const demos = [
  {
    section: 'INCIDENCIAS EXTERIORES',
    photos: [
      { label: 'EX-CALLE-FC43', cap: 'EJEMPLO — REPARAR ESTANTERIA — CALLE FC-43', status: 'resolved', bg: '#1F4E79' },
      { label: 'EX-CALLE-FC35', cap: 'EJEMPLO — REPARAR ESTANTERIA — CALLE FC-35', status: 'pending', bg: '#4472C4' },
    ],
  },
  {
    section: 'INCIDENCIAS LIMPIEZA',
    photos: [
      { label: 'LI-ZONA-A', cap: 'EJEMPLO — LIMPIEZA PENDIENTE — ZONA A', status: 'pending', bg: '#70AD47' },
    ],
  },
  {
    section: 'INCIDENCIAS VESTUARIOS',
    photos: [
      { label: 'V-VEST-01', cap: 'EJEMPLO — TAQUILLA DAÑADA — VESTUARIO 01', status: 'resolved', bg: '#ED7D31' },
      { label: 'V-VEST-02', cap: 'EJEMPLO — BANCO SUELTO — VESTUARIO 02', status: 'pending', bg: '#5B2C6F' },
    ],
  },
];

for (const group of demos) {
  const sec = pptx.addSlide();
  sec.addText(group.section, {
    x: 0.5, y: 2.8, w: W - 1, h: 1.2, fontSize: 36, bold: true, color: '1F4E79', align: 'center', fontFace: 'Calibri',
  });
  sec.addShape(pptx.shapes.RECTANGLE, { x: 4.5, y: 4.1, w: 4.3, h: 0.08, fill: { color: 'FFC000' } });

  for (let i = 0; i < group.photos.length; i += 2) {
    const pair = group.photos.slice(i, i + 2);
    const slide = pptx.addSlide();
    slide.addText('INSPECCIÓN SEPTIEMBRE 2026', {
      x: 2.5, y: 0.35, w: 8.3, h: 0.5, fontSize: 18, bold: true, align: 'center', fontFace: 'Calibri',
    });
    const slots =
      pair.length === 1
        ? [{ x: 4.15, y: 1.15, w: 5.0, h: 4.0, cx: 4.15, cy: 5.3, cw: 5.0 }]
        : [
            { x: 0.7, y: 1.15, w: 5.5, h: 4.0, cx: 0.7, cy: 5.3, cw: 5.5 },
            { x: 7.1, y: 1.15, w: 5.5, h: 4.0, cx: 7.1, cy: 5.3, cw: 5.5 },
          ];
    pair.forEach((ph, idx) => {
      const s = slots[idx];
      const tmp = join(outDir, `_tmp_${ph.label}.png`);
      writeFileSync(tmp, makePng(640, 480, ph.bg));
      tmpFiles.push(tmp);
      slide.addImage({ path: tmp, x: s.x, y: s.y, w: s.w, h: s.h });
      // overlay EJEMPLO text
      slide.addText('EJEMPLO', {
        x: s.x, y: s.y + s.h / 2 - 0.25, w: s.w, h: 0.5,
        fontSize: 28, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Arial',
      });
      slide.addText(ph.cap, {
        x: s.cx, y: s.cy, w: s.cw, h: 0.7, fontSize: 11, align: 'center', fontFace: 'Calibri',
      });
      if (ph.status === 'resolved' && existsSync(stampPath)) {
        slide.addImage({ path: stampPath, x: s.x + s.w - 1.15, y: s.y + s.h / 2 - 0.55, w: 1.05, h: 1.0 });
      } else if (ph.status === 'pending') {
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x: s.x + 0.15, y: s.y + 0.15, w: 1.6, h: 0.38, fill: { color: 'ED7D31' },
        });
        slide.addText('PENDIENTE', {
          x: s.x + 0.15, y: s.y + 0.15, w: 1.6, h: 0.38,
          fontSize: 11, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle',
        });
      }
    });
  }
}

const outFile = join(outDir, 'informe-ejemplo-alcolea.pptx');
await pptx.writeFile({ fileName: outFile });
for (const t of tmpFiles) {
  try { unlinkSync(t); } catch { /* ignore */ }
}
console.log('OK sample PPTX:', outFile);
