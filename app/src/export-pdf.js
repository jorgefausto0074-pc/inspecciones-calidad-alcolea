import { jsPDF } from 'jspdf';
import {
  COLORS, COPY, LAYOUT, SLIDE, cardSlots, photoArea, captionArea,
  logoWidthForHeight, rWidthForHeight, sectionPhotoFor, mmBox, IN_TO_MM,
} from './brand.js';
import { DEPT_ORDER } from './config.js';
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
  pdf.setFillColor(...hexRgb(hex));
  pdf.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 'F');
}

function fillRect(pdf, boxIn, hex) {
  const b = mmBox(boxIn);
  pdf.setFillColor(...hexRgb(hex));
  pdf.rect(b.x, b.y, b.w, b.h, 'F');
}

function roundedRect(pdf, boxIn, hex, radiusMm = 3) {
  const b = mmBox(boxIn);
  pdf.setFillColor(...hexRgb(hex));
  pdf.roundedRect(b.x, b.y, b.w, b.h, radiusMm, radiusMm, 'F');
}

function imgFmt(dataUrl) {
  return String(dataUrl).startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
}

function addImageIn(pdf, dataUrl, x, y, w, h) {
  pdf.addImage(dataUrl, imgFmt(dataUrl), x * IN_TO_MM, y * IN_TO_MM, w * IN_TO_MM, h * IN_TO_MM);
}

function background(pdf, hex) {
  pdf.setFillColor(...hexRgb(hex));
  pdf.rect(0, 0, W, H, 'F');
}

/** Pie navy con filete naranja, nº de página, texto del pie y logo Refresco naranja. */
function addChrome(pdf, assets, pageNum) {
  const L = LAYOUT;
  fillRect(pdf, L.footerBar, COLORS.navy);
  fillRect(pdf, L.footerAccent, COLORS.orange);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  const meta = mmBox(L.footerMeta);
  pdf.setFontSize(10);
  pdf.text(COPY.footerMeta, meta.x, meta.y + meta.h * 0.72);
  if (assets.logo) {
    const h = L.footerLogo.h;
    addImageIn(pdf, assets.logo, L.footerLogo.x, L.footerLogo.y, logoWidthForHeight(h), h);
  }
  if (pageNum) {
    const pn = mmBox(L.pageNum);
    pdf.setTextColor(...hexRgb(COLORS.orange));
    pdf.setFontSize(10);
    pdf.text(String(pageNum), pn.x, pn.y + pn.h * 0.72);
  }
  pdf.setTextColor(0, 0, 0);
}

function addCover(pdf, assets, model) {
  const L = LAYOUT;
  background(pdf, COLORS.navy);
  if (assets.cover) addImageIn(pdf, assets.cover, L.coverPhoto.x, L.coverPhoto.y, L.coverPhoto.w, L.coverPhoto.h);
  L.coverCircles.forEach((c) => fillOval(pdf, c, COLORS.bright));
  if (assets.logo) {
    const h = L.coverLogo.h;
    addImageIn(pdf, assets.logo, L.coverLogo.x, L.coverLogo.y, logoWidthForHeight(h), h);
  }
  fillRect(pdf, L.coverRule, COLORS.orange);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...hexRgb(COLORS.orange));
  const lab = mmBox(L.coverLabel);
  pdf.setFontSize(12);
  pdf.text(model.label || COPY.coverLabel, lab.x, lab.y + lab.h * 0.75, { charSpace: 0.6 });
  pdf.setTextColor(255, 255, 255);
  const title = mmBox(L.coverTitle);
  pdf.setFontSize(32);
  pdf.text((model.title || '').toUpperCase(), title.x, title.y + 11, { maxWidth: title.w });
  pdf.setTextColor(...hexRgb(COLORS.lightblue));
  const sub = mmBox(L.coverSubtitle);
  pdf.setFontSize(14);
  pdf.text((model.subtitle || '').toUpperCase(), sub.x, sub.y + sub.h * 0.7);
  addChrome(pdf, assets, null);
}

function addSection(pdf, assets, model, pageNum) {
  const L = LAYOUT;
  background(pdf, COLORS.navy);
  const photo = assets.sections?.[sectionPhotoFor(model.code, DEPT_ORDER)];
  if (photo) addImageIn(pdf, photo, L.sectionPhoto.x, L.sectionPhoto.y, L.sectionPhoto.w, L.sectionPhoto.h);
  L.sectionCircles.forEach((c) => fillOval(pdf, c, COLORS.bright));
  fillRect(pdf, L.sectionRule, COLORS.orange);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...hexRgb(COLORS.orange));
  const k = mmBox(L.sectionKicker);
  pdf.setFontSize(12);
  pdf.text(COPY.departamento, k.x, k.y + k.h * 0.75, { charSpace: 0.8 });
  pdf.setTextColor(255, 255, 255);
  const d = mmBox(L.sectionDept);
  pdf.setFontSize(42);
  pdf.text((model.deptName || '').toUpperCase(), d.x, d.y + d.h * 0.72);
  pdf.setTextColor(...hexRgb(COLORS.lightblue));
  const t = mmBox(L.sectionTitle);
  pdf.setFontSize(21);
  pdf.text((model.title || '').toUpperCase(), t.x, t.y + t.h * 0.7);
  addChrome(pdf, assets, pageNum);
}

function addStamp(pdf, photoBoxIn, photo) {
  const w = LAYOUT.stamp.w * IN_TO_MM;
  const h = LAYOUT.stamp.h * IN_TO_MM;
  const b = mmBox(photoBoxIn);
  const x = b.x + b.w - w - 2.5;
  const y = b.y + 2.5;
  const resolved = photo.status === 'resolved';
  pdf.setFillColor(...hexRgb(resolved ? COLORS.bright : COLORS.orange));
  pdf.roundedRect(x, y, w, h, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(statusLabel(photo), x + w / 2, y + h * 0.68, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
}

function addFicha(pdf, assets, model, pageNum) {
  const L = LAYOUT;
  background(pdf, COLORS.bg);
  if (assets.rLogo) {
    const h = L.cornerR.h;
    addImageIn(pdf, assets.rLogo, L.cornerR.x, L.cornerR.y, rWidthForHeight(h), h);
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...hexRgb(COLORS.navy));
  const dn = mmBox(L.fichaDept);
  pdf.setFontSize(20);
  pdf.text((model.deptName || '').toUpperCase(), dn.x, dn.y + dn.h * 0.8);
  pdf.setTextColor(...hexRgb(COLORS.orange));
  const fi = mmBox(L.fichaIndex);
  pdf.setFontSize(11);
  pdf.text(`FICHA ${model.fichaIndex} DE ${model.fichaTotal}`, fi.x, fi.y + fi.h * 0.8);
  roundedRect(pdf, L.fichaBadge, COLORS.navy, 3);
  pdf.setTextColor(255, 255, 255);
  const bd = mmBox(L.fichaBadge);
  pdf.setFontSize(8);
  pdf.text((model.deptSection || '').toUpperCase(), bd.x + bd.w / 2, bd.y + bd.h * 0.68, { align: 'center' });

  const slots = cardSlots(model.photos.length);
  model.photos.forEach((photo, idx) => {
    const card = slots[idx];
    const cMm = mmBox(card);
    pdf.setDrawColor(...hexRgb(COLORS.lightgrey));
    pdf.setLineWidth(0.3);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(cMm.x, cMm.y, cMm.w, cMm.h, 3, 3, 'FD');
    const ph = photoArea(card);
    fillRect(pdf, ph, COLORS.lightgrey);
    if (photo.dataUrl) {
      try {
        const dim = dataUrlDimensions(photo.dataUrl);
        const fitIn = dim ? containRect(dim.w, dim.h, ph) : ph;
        const fit = mmBox(fitIn);
        pdf.addImage(photo.dataUrl, imgFmt(photo.dataUrl), fit.x, fit.y, fit.w, fit.h);
      } catch {
        /* keep placeholder */
      }
    }
    addStamp(pdf, ph, photo);
    fillRect(pdf, { x: card.x, y: ph.y + ph.h, w: card.w, h: 0.04 }, COLORS.orange);
    const cap = captionArea(card);
    const capMm = mmBox(cap);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...hexRgb(COLORS.orange));
    pdf.setFontSize(10);
    pdf.text(locationLabel(photo), capMm.x, capMm.y + 4, { maxWidth: capMm.w });
    pdf.setTextColor(...hexRgb(COLORS.navy));
    pdf.setFontSize(11);
    pdf.text(commentTitle(photo), capMm.x, capMm.y + 10, { maxWidth: capMm.w });
  });

  addChrome(pdf, assets, pageNum);
}

/**
 * PDF 16:9 con la imagen Refresco 2026. Devuelve { blob, fileName } (no escribe a disco).
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
