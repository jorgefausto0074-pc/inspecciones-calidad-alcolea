import { jsPDF } from 'jspdf';
import { DEPT_ORDER, deptByCode } from './config.js';
import { groupPhotosByDept } from './session.js';

const W = 338.67; // mm ≈ 13.333 in
const H = 190.5;  // mm ≈ 7.5 in

// Compact corner badge (~18–20% of photo width)
const STAMP_MM = 18;
const PEND_W = 28;
const PEND_H = 7;

function captionText(photo) {
  const parts = [photo.comentario, photo.ubicacion].filter(Boolean);
  return parts.join(' — ').toUpperCase() || photo.displayName;
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function safeFileName(session) {
  const safe = (session.coverTitle || 'informe').replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/gi, '').slice(0, 60).trim() || 'informe';
  return `${safe.replace(/\s+/g, '_')}.pdf`;
}

/**
 * PDF 16:9. Devuelve { blob, fileName } (no escribe a disco).
 */
export async function exportPdf(session, { logoUrl = './assets/logo-diamante.png', stampUrl = './assets/sello-resuelto.png' } = {}) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });
  let logoImg = null;
  let stampImg = null;
  try { logoImg = await loadImage(logoUrl); } catch { /* optional */ }
  try { stampImg = await loadImage(stampUrl); } catch { /* optional */ }

  // Portada
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.text(session.coverTitle || '', W / 2, 55, { align: 'center', maxWidth: 250 });
  pdf.setFontSize(14);
  pdf.text(session.coverSubtitle || '', W / 2, 120, { align: 'center', maxWidth: 250 });
  if (logoImg) {
    pdf.addImage(logoImg, 'PNG', W - 70, 95, 55, 55);
  }

  const groups = groupPhotosByDept(session.photos, DEPT_ORDER);
  for (const [code, photos] of groups) {
    const dept = deptByCode(code);
    pdf.addPage([W, H], 'landscape');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(31, 78, 121);
    pdf.text(dept.section, W / 2, H / 2, { align: 'center' });
    pdf.setDrawColor(255, 192, 0);
    pdf.setLineWidth(1.5);
    pdf.line(W / 2 - 55, H / 2 + 12, W / 2 + 55, H / 2 + 12);
    pdf.setTextColor(0, 0, 0);

    for (let i = 0; i < photos.length; i += 2) {
      const pair = photos.slice(i, i + 2);
      pdf.addPage([W, H], 'landscape');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(session.slideTitle || '', W / 2, 14, { align: 'center' });

      const slots = pair.length === 1
        ? [{ x: 95, y: 28, w: 148, h: 115 }]
        : [
            { x: 18, y: 28, w: 145, h: 110 },
            { x: 176, y: 28, w: 145, h: 110 },
          ];

      for (let idx = 0; idx < pair.length; idx++) {
        const photo = pair[idx];
        const s = slots[idx];
        try {
          const img = await loadImage(photo.dataUrl);
          const ir = img.width / img.height;
          const br = s.w / s.h;
          let dw = s.w, dh = s.h, dx = s.x, dy = s.y;
          if (ir > br) { dh = s.w / ir; dy = s.y + (s.h - dh) / 2; }
          else { dw = s.h * ir; dx = s.x + (s.w - dw) / 2; }
          const fmt = photo.dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
          pdf.addImage(img, fmt, dx, dy, dw, dh);
        } catch {
          pdf.setFillColor(220, 220, 220);
          pdf.rect(s.x, s.y, s.w, s.h, 'F');
        }
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(captionText(photo), s.x + s.w / 2, s.y + s.h + 8, {
          align: 'center', maxWidth: s.w,
        });
        // Compact badge top-right of photo box
        if (photo.status === 'resolved' && stampImg) {
          pdf.addImage(
            stampImg, 'PNG',
            s.x + s.w - STAMP_MM - 2,
            s.y + 2,
            STAMP_MM,
            STAMP_MM * 0.95,
          );
        } else if (photo.status === 'pending') {
          const px = s.x + s.w - PEND_W - 2;
          const py = s.y + 2;
          pdf.setFillColor(237, 125, 49);
          pdf.roundedRect(px, py, PEND_W, PEND_H, 1.5, 1.5, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.text('PENDIENTE', px + PEND_W / 2, py + 5, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
        }
      }
    }
  }

  const fileName = safeFileName(session);
  const blob = pdf.output('blob');
  return { blob, fileName };
}

/**
 * Construye el modelo de diapositivas para la previsualización HTML.
 */
export function buildPreviewSlides(session) {
  const slides = [];
  slides.push({
    type: 'cover',
    title: session.coverTitle,
    subtitle: session.coverSubtitle,
  });
  const groups = groupPhotosByDept(session.photos, DEPT_ORDER);
  for (const [code, photos] of groups) {
    const dept = deptByCode(code);
    slides.push({ type: 'section', title: dept.section, code });
    for (let i = 0; i < photos.length; i += 2) {
      slides.push({
        type: 'content',
        slideTitle: session.slideTitle,
        photos: photos.slice(i, i + 2),
      });
    }
  }
  return slides;
}
