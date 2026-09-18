import PptxGenJS from 'pptxgenjs';
import { DEPT_ORDER, deptByCode } from './config.js';
import { groupPhotosByDept } from './session.js';

const W = 13.333;
const H = 7.5;

// Compact corner badge (~18–20% of photo box width)
const STAMP_W = 0.95;
const STAMP_H = 0.90;
const PEND_W = 1.15;
const PEND_H = 0.28;

async function loadAsDataUrl(path) {
  const res = await fetch(path);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function captionText(photo) {
  const parts = [photo.comentario, photo.ubicacion].filter(Boolean);
  return parts.join(' — ').toUpperCase() || photo.displayName;
}

function safeFileName(session) {
  const safe = (session.coverTitle || 'informe').replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/gi, '').slice(0, 60).trim() || 'informe';
  return `${safe.replace(/\s+/g, '_')}.pptx`;
}

/**
 * Genera PPTX 16:9. Devuelve { blob, fileName } (no escribe a disco).
 */
export async function exportPptx(session, { logoUrl = './assets/logo-diamante.png', stampUrl = './assets/sello-resuelto.png' } = {}) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE16x9', width: W, height: H });
  pptx.layout = 'WIDE16x9';
  pptx.author = 'Refresco Iberia — Calidad Alcolea';
  pptx.title = session.coverTitle || 'Inspección incidencias';

  let logoData;
  let stampData;
  try { logoData = await loadAsDataUrl(logoUrl); } catch { logoData = null; }
  try { stampData = await loadAsDataUrl(stampUrl); } catch { stampData = null; }

  // Portada
  const cover = pptx.addSlide();
  cover.addText(session.coverTitle || '', {
    x: 1.67, y: 1.7, w: 10, h: 1.6,
    fontSize: 36, bold: true, color: '000000', fontFace: 'Calibri',
    align: 'center', valign: 'middle',
  });
  cover.addText(session.coverSubtitle || '', {
    x: 1.67, y: 4.4, w: 10, h: 1.0,
    fontSize: 18, bold: true, color: '000000', fontFace: 'Calibri',
    align: 'center', valign: 'middle',
  });
  if (logoData) {
    cover.addImage({ data: logoData, x: 10.3, y: 3.9, w: 2.35, h: 2.35 });
  }

  const groups = groupPhotosByDept(session.photos, DEPT_ORDER);

  for (const [code, photos] of groups) {
    const dept = deptByCode(code);
    const sec = pptx.addSlide();
    sec.addText(dept.section, {
      x: 0.5, y: 2.8, w: W - 1, h: 1.2,
      fontSize: 36, bold: true, color: '1F4E79', fontFace: 'Calibri',
      align: 'center', valign: 'middle',
    });
    sec.addShape(pptx.shapes.RECTANGLE, {
      x: 4.5, y: 4.1, w: 4.3, h: 0.08, fill: { color: 'FFC000' },
    });

    for (let i = 0; i < photos.length; i += 2) {
      const pair = photos.slice(i, i + 2);
      const slide = pptx.addSlide();
      slide.addText(session.slideTitle || '', {
        x: 2.5, y: 0.35, w: 8.3, h: 0.5,
        fontSize: 18, bold: true, color: '000000', fontFace: 'Calibri',
        align: 'center',
      });

      const slots = pair.length === 1
        ? [{ x: 4.15, y: 1.15, w: 5.0, h: 4.2, cx: 4.15, cy: 5.5, cw: 5.0 }]
        : [
            { x: 0.7, y: 1.15, w: 5.5, h: 4.0, cx: 0.7, cy: 5.3, cw: 5.5 },
            { x: 7.1, y: 1.15, w: 5.5, h: 4.0, cx: 7.1, cy: 5.3, cw: 5.5 },
          ];

      pair.forEach((photo, idx) => {
        const s = slots[idx];
        if (photo.dataUrl) {
          try {
            slide.addImage({
              data: photo.dataUrl,
              x: s.x, y: s.y, w: s.w, h: s.h,
              sizing: { type: 'contain', w: s.w, h: s.h },
            });
          } catch {
            slide.addShape(pptx.shapes.RECTANGLE, {
              x: s.x, y: s.y, w: s.w, h: s.h, fill: { color: 'DDDDDD' },
            });
          }
        }
        slide.addText(captionText(photo), {
          x: s.cx, y: s.cy, w: s.cw, h: 0.7,
          fontSize: 12, color: '000000', fontFace: 'Calibri',
          align: 'center', valign: 'top',
        });
        // Compact badge top-right of photo box (~18% width)
        if (photo.status === 'resolved' && stampData) {
          slide.addImage({
            data: stampData,
            x: s.x + s.w - STAMP_W - 0.08,
            y: s.y + 0.08,
            w: STAMP_W,
            h: STAMP_H,
          });
        } else if (photo.status === 'pending') {
          const px = s.x + s.w - PEND_W - 0.08;
          const py = s.y + 0.08;
          slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: px, y: py, w: PEND_W, h: PEND_H,
            fill: { color: 'ED7D31' },
            shadow: { type: 'outer', color: '000000', blur: 2, opacity: 0.2 },
          });
          slide.addText('PENDIENTE', {
            x: px, y: py, w: PEND_W, h: PEND_H,
            fontSize: 9, bold: true, color: 'FFFFFF', fontFace: 'Calibri',
            align: 'center', valign: 'middle',
          });
        }
      });
    }
  }

  const fileName = safeFileName(session);
  const output = await pptx.write({ outputType: 'blob' });
  const blob = output instanceof Blob
    ? output
    : new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  return { blob, fileName };
}
