import { jsPDF } from 'jspdf';
import {
  COLORS, COPY, LAYOUT, SLIDE, cardSlots, photoArea, captionArea,
  logoWidthForHeight, mmBox, IN_TO_MM,
} from './brand.js';
import { buildPreviewSlides, locationLabel, commentTitle, statusLabel } from './slides.js';
import { loadBrandAssets, containRect, dataUrlDimensions } from './assets-load.js';

const W = SLIDE.w * IN_TO_MM;
const H = SLIDE.h * IN_TO_MM;

function hexRgb(hex) {
  const h = String(hex).replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function safeFileName(session) {
  const safe = (session.coverTitle || 'informe').replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/gi, '').slice(0, 60).trim() || 'informe';
  return `${safe.replace(/\s+/g, '_')}.pdf`;
}

function fillOval(pdf, boxIn, hex) {
  const b = mmBox(boxIn);
  const [r, g, bl] = hexRgb(hex);
  pdf.setFillColor(r, g, bl);
  pdf.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 'F');
}

function addChrome(pdf, assets, pageNum) {
  const L = LAYOUT;
  if (assets.cenefa) {
    const b = mmBox(L.cenefa);
    pdf.addImage(assets.cenefa, 'PNG', b.x, b.y, b.w, b.h);
  } else {
    const [r, g, bl] = hexRgb(COLORS.green);
    pdf.setFillColor(r, g, bl);
    pdf.rect(0, H - 14, W, 14, 'F');
  }
  if (assets.mascots) {
    const b = mmBox(L.mascots);
    pdf.addImage(assets.mascots, 'PNG', b.x, b.y, b.w, b.h);
  }
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  const meta = mmBox(L.footerMeta);
  pdf.setFontSize(10);
  pdf.text(COPY.footerMeta, meta.x, meta.y + meta.h * 0.72);
  const wm = mmBox(L.wordmark);
  pdf.setFontSize(16);
  pdf.text(COPY.wordmark, wm.x + wm.w, wm.y + wm.h * 0.72, { align: 'right' });
  if (pageNum) {
    const pn = mmBox(L.pageNum);
    pdf.setFontSize(9);
    pdf.text(String(pageNum), pn.x, pn.y + pn.h * 0.75);
  }
  pdf.setTextColor(0, 0, 0);
}

function roundedRect(pdf, boxIn, hex, radiusMm = 3) {
  const b = mmBox(boxIn);
  const [r, g, bl] = hexRgb(hex);
  pdf.setFillColor(r, g, bl);
  pdf.roundedRect(b.x, b.y, b.w, b.h, radiusMm, radiusMm, 'F');
}

function addCover(pdf, assets, model) {
  const L = LAYOUT;
  pdf.setFillColor(...hexRgb(COLORS.bg));
  pdf.rect(0, 0, W, H, 'F');
  fillOval(pdf, L.coverOrbGreen, COLORS.green);
  fillOval(pdf, L.coverOrbOrange, '#E8922A');
  fillOval(pdf, L.coverOrbWhite, '#F3FBF6');
  roundedRect(pdf, L.coverLogoCard, COLORS.white, 4);
  if (assets.logo) {
    const logoH = L.coverLogo.h;
    const logoW = logoWidthForHeight(logoH);
    const logoX = L.coverLogoCard.x + (L.coverLogoCard.w - logoW) / 2;
    const logoY = L.coverLogoCard.y + (L.coverLogoCard.h - logoH) / 2;
    pdf.addImage(assets.logo, 'PNG', logoX * IN_TO_MM, logoY * IN_TO_MM, logoW * IN_TO_MM, logoH * IN_TO_MM);
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...hexRgb(COLORS.orange));
  const lab = mmBox(L.coverLabel);
  pdf.setFontSize(11);
  pdf.text(model.label || COPY.coverLabel, lab.x, lab.y + lab.h * 0.75);
  pdf.setTextColor(...hexRgb(COLORS.green));
  const title = mmBox(L.coverTitle);
  pdf.setFontSize(28);
  pdf.text((model.title || '').toUpperCase(), title.x, title.y + 10, { maxWidth: title.w });
  pdf.setTextColor(...hexRgb(COLORS.charcoal));
  const sub = mmBox(L.coverSubtitle);
  pdf.setFontSize(12);
  pdf.text((model.subtitle || '').toUpperCase(), sub.x, sub.y + sub.h * 0.7);
  addChrome(pdf, assets, null);
}

function addSection(pdf, assets, model, pageNum) {
  const L = LAYOUT;
  pdf.setFillColor(...hexRgb(COLORS.bg));
  pdf.rect(0, 0, W, H, 'F');
  fillOval(pdf, L.sectionOrbLeft, '#F0E4D0');
  fillOval(pdf, L.sectionOrbRight, '#D8F3E3');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...hexRgb(COLORS.orange));
  const k = mmBox(L.sectionKicker);
  pdf.setFontSize(12);
  pdf.text(COPY.departamento, W / 2, k.y + k.h * 0.75, { align: 'center' });
  const d = mmBox(L.sectionDept);
  pdf.setFontSize(40);
  pdf.text((model.deptName || '').toUpperCase(), W / 2, d.y + d.h * 0.72, { align: 'center' });
  pdf.setTextColor(...hexRgb(COLORS.green));
  const t = mmBox(L.sectionTitle);
  pdf.setFontSize(22);
  pdf.text((model.title || '').toUpperCase(), W / 2, t.y + t.h * 0.7, { align: 'center' });
  addChrome(pdf, assets, pageNum);
}

function addStamp(pdf, photoBoxIn, photo) {
  const w = LAYOUT.stamp.w * IN_TO_MM;
  const h = LAYOUT.stamp.h * IN_TO_MM;
  const b = mmBox(photoBoxIn);
  const x = b.x + b.w - w - 2.5;
  const y = b.y + 2.5;
  const resolved = photo.status === 'resolved';
  pdf.setFillColor(...hexRgb(resolved ? COLORS.green : COLORS.orangeAlt));
  pdf.roundedRect(x, y, w, h, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text(statusLabel(photo), x + w / 2, y + h * 0.68, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
}

function addFicha(pdf, assets, model, pageNum) {
  const L = LAYOUT;
  pdf.setFillColor(...hexRgb(COLORS.bg));
  pdf.rect(0, 0, W, H, 'F');
  fillOval(pdf, L.fichaOrb, '#D8F3E3');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...hexRgb(COLORS.orange));
  const dn = mmBox(L.fichaDept);
  pdf.setFontSize(20);
  pdf.text((model.deptName || '').toUpperCase(), dn.x, dn.y + dn.h * 0.8);
  pdf.setTextColor(...hexRgb(COLORS.green));
  const fi = mmBox(L.fichaIndex);
  pdf.setFontSize(11);
  pdf.text(`FICHA ${model.fichaIndex} DE ${model.fichaTotal}`, fi.x, fi.y + fi.h * 0.8);
  roundedRect(pdf, L.fichaBadge, COLORS.orange, 3);
  pdf.setTextColor(255, 255, 255);
  const bd = mmBox(L.fichaBadge);
  pdf.setFontSize(8);
  pdf.text((model.deptSection || '').toUpperCase(), bd.x + bd.w / 2, bd.y + bd.h * 0.68, { align: 'center' });

  const slots = cardSlots(model.photos.length);
  model.photos.forEach((photo, idx) => {
    const card = slots[idx];
    roundedRect(pdf, card, COLORS.white, 3);
    const ph = photoArea(card);
    const phMm = mmBox(ph);
    pdf.setFillColor(...hexRgb('#D5E6DB'));
    pdf.rect(phMm.x, phMm.y, phMm.w, phMm.h, 'F');
    if (photo.dataUrl) {
      try {
        const dim = dataUrlDimensions(photo.dataUrl);
        const fitIn = dim ? containRect(dim.w, dim.h, ph) : ph;
        const fit = mmBox(fitIn);
        const fmt = String(photo.dataUrl).startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
        pdf.addImage(photo.dataUrl, fmt, fit.x, fit.y, fit.w, fit.h);
      } catch {
        /* keep placeholder */
      }
    }
    addStamp(pdf, ph, photo);
    const cap = captionArea(card);
    const capMm = mmBox(cap);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...hexRgb(COLORS.orange));
    pdf.setFontSize(9);
    pdf.text(locationLabel(photo), capMm.x, capMm.y + 4, { maxWidth: capMm.w });
    pdf.setTextColor(...hexRgb(COLORS.charcoal));
    pdf.setFontSize(10);
    pdf.text(commentTitle(photo), capMm.x, capMm.y + 10, { maxWidth: capMm.w });
  });

  addChrome(pdf, assets, pageNum);
}

/**
 * PDF 16:9 v3. Devuelve { blob, fileName } (no escribe a disco).
 */
export async function exportPdf(session, { assets } = {}) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H], compress: true });
  const brand = assets || await loadBrandAssets();
  const slides = buildPreviewSlides(session);

  slides.forEach((model, idx) => {
    if (idx > 0) pdf.addPage([W, H], 'landscape');
    const page = idx + 1;
    if (model.type === 'cover') addCover(pdf, brand, model);
    else if (model.type === 'section') addSection(pdf, brand, model, page);
    else addFicha(pdf, brand, model, page);
  });

  const fileName = safeFileName(session);
  const blob = pdf.output('blob');
  return { blob, fileName };
}

export { buildPreviewSlides } from './slides.js';
