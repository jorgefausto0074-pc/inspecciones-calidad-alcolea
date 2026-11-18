import PptxGenJS from 'pptxgenjs';
import {
  COLORS, COPY, LAYOUT, SLIDE, FONT, cardSlots, photoArea, captionArea,
  logoWidthForHeight, rWidthForHeight, sectionPhotoFor,
} from './brand.js';
import { DEPT_ORDER } from './config.js';
import { buildPreviewSlides, locationLabel, commentTitle, statusLabel } from './slides.js';
import { loadBrandAssets, containRect, dataUrlDimensions } from './assets-load.js';
import { cleanPptxBlob } from './pptx-clean.js';
import { exportFileName } from './filename.js';
import { sessionWithNormalizedPhotos } from './image-normalize.js';

const W = SLIDE.w;
const H = SLIDE.h;

function safeFileName(session) {
  return exportFileName(session.coverTitle || 'INFORME INSPECCION', '.pptx');
}

function noLine() {
  return { color: COLORS.whiteHex, transparency: 100, width: 0 };
}

function addRect(slide, pptx, box, color) {
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: box.x, y: box.y, w: box.w, h: box.h,
    fill: { color },
    line: noLine(),
  });
}

function addOval(slide, pptx, box, color) {
  slide.addShape(pptx.shapes.OVAL, {
    x: box.x, y: box.y, w: box.w, h: box.h,
    fill: { color },
    line: noLine(),
  });
}

/** Pie navy con filete naranja, nº de página, texto del pie y logo Refresco naranja. */
function addChrome(slide, pptx, assets, pageNum) {
  const L = LAYOUT;
  addRect(slide, pptx, L.footerBar, COLORS.navyHex);
  addRect(slide, pptx, L.footerAccent, COLORS.orangeHex);
  slide.addText(COPY.footerMeta, {
    x: L.footerMeta.x, y: L.footerMeta.y, w: L.footerMeta.w, h: L.footerMeta.h,
    fontSize: 10, bold: true, color: COLORS.whiteHex, fontFace: FONT,
    valign: 'middle', margin: 0,
  });
  if (assets.logo) {
    const h = L.footerLogo.h;
    slide.addImage({ data: assets.logo, x: L.footerLogo.x, y: L.footerLogo.y, w: logoWidthForHeight(h), h, altText: 'Logotipo Refresco' });
  }
  if (pageNum) {
    slide.addText(String(pageNum), {
      x: L.pageNum.x, y: L.pageNum.y, w: L.pageNum.w, h: L.pageNum.h,
      fontSize: 10, bold: true, color: COLORS.orangeHex, fontFace: FONT,
      align: 'left', valign: 'middle', margin: 0,
    });
  }
}

function addCornerR(slide, assets) {
  if (!assets.rLogo) return;
  const h = LAYOUT.cornerR.h;
  slide.addImage({ data: assets.rLogo, x: LAYOUT.cornerR.x, y: LAYOUT.cornerR.y, w: rWidthForHeight(h), h, altText: 'Símbolo R de Refresco' });
}

function addCover(pptx, assets, model) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.navyHex };
  const L = LAYOUT;
  if (assets.cover) {
    slide.addImage({ data: assets.cover, x: L.coverPhoto.x, y: L.coverPhoto.y, w: L.coverPhoto.w, h: L.coverPhoto.h, altText: 'Fotografía de portada Refresco' });
  }
  L.coverCircles.forEach((c) => addOval(slide, pptx, c, COLORS.brightHex));
  if (assets.logo) {
    const h = L.coverLogo.h;
    slide.addImage({ data: assets.logo, x: L.coverLogo.x, y: L.coverLogo.y, w: logoWidthForHeight(h), h, altText: 'Logotipo Refresco' });
  }
  addRect(slide, pptx, L.coverRule, COLORS.orangeHex);
  slide.addText(model.label || COPY.coverLabel, {
    x: L.coverLabel.x, y: L.coverLabel.y, w: L.coverLabel.w, h: L.coverLabel.h,
    fontSize: 12, bold: true, color: COLORS.orangeHex, fontFace: FONT,
    margin: 0, charSpacing: 3,
  });
  slide.addText((model.title || '').toUpperCase(), {
    x: L.coverTitle.x, y: L.coverTitle.y, w: L.coverTitle.w, h: L.coverTitle.h,
    fontSize: 34, bold: true, color: COLORS.whiteHex, fontFace: FONT,
    align: 'left', valign: 'top', margin: 0,
  });
  slide.addText((model.subtitle || '').toUpperCase(), {
    x: L.coverSubtitle.x, y: L.coverSubtitle.y, w: L.coverSubtitle.w, h: L.coverSubtitle.h,
    fontSize: 14, bold: true, color: COLORS.lightblueHex, fontFace: FONT,
    margin: 0,
  });
  addChrome(slide, pptx, assets, null);
}

function addSection(pptx, assets, model, pageNum) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.navyHex };
  const L = LAYOUT;
  const photo = assets.sections?.[sectionPhotoFor(model.code, DEPT_ORDER)];
  if (photo) {
    slide.addImage({ data: photo, x: L.sectionPhoto.x, y: L.sectionPhoto.y, w: L.sectionPhoto.w, h: L.sectionPhoto.h, altText: `Fotografía de sección ${model.deptName || ''}`.trim() });
  }
  L.sectionCircles.forEach((c) => addOval(slide, pptx, c, COLORS.brightHex));
  addRect(slide, pptx, L.sectionRule, COLORS.orangeHex);
  slide.addText(COPY.departamento, {
    x: L.sectionKicker.x, y: L.sectionKicker.y, w: L.sectionKicker.w, h: L.sectionKicker.h,
    fontSize: 12, bold: true, color: COLORS.orangeHex, fontFace: FONT,
    align: 'left', margin: 0, charSpacing: 4,
  });
  slide.addText((model.deptName || '').toUpperCase(), {
    x: L.sectionDept.x, y: L.sectionDept.y, w: L.sectionDept.w, h: L.sectionDept.h,
    fontSize: 44, bold: true, color: COLORS.whiteHex, fontFace: FONT,
    align: 'left', valign: 'middle', margin: 0,
  });
  slide.addText((model.title || '').toUpperCase(), {
    x: L.sectionTitle.x, y: L.sectionTitle.y, w: L.sectionTitle.w, h: L.sectionTitle.h,
    fontSize: 22, bold: true, color: COLORS.lightblueHex, fontFace: FONT,
    align: 'left', margin: 0,
  });
  addChrome(slide, pptx, assets, pageNum);
}

function addStamp(slide, pptx, photoBox, photo) {
  const w = LAYOUT.stamp.w;
  const h = LAYOUT.stamp.h;
  const x = photoBox.x + photoBox.w - w - 0.1;
  const y = photoBox.y + 0.1;
  const resolved = photo.status === 'resolved';
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: resolved ? COLORS.brightHex : COLORS.orangeHex },
    line: noLine(),
    rectRadius: 0.12,
  });
  slide.addText(statusLabel(photo), {
    x, y, w, h,
    fontSize: 9, bold: true, color: COLORS.whiteHex, fontFace: FONT,
    align: 'center', valign: 'middle', margin: 0,
  });
}

function addFicha(pptx, assets, model, pageNum) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgHex };
  const L = LAYOUT;
  addCornerR(slide, assets);
  slide.addText((model.deptName || '').toUpperCase(), {
    x: L.fichaDept.x, y: L.fichaDept.y, w: L.fichaDept.w, h: L.fichaDept.h,
    fontSize: 22, bold: true, color: COLORS.navyHex, fontFace: FONT,
    margin: 0,
  });
  slide.addText(`FICHA ${model.fichaIndex} DE ${model.fichaTotal}`, {
    x: L.fichaIndex.x, y: L.fichaIndex.y, w: L.fichaIndex.w, h: L.fichaIndex.h,
    fontSize: 12, bold: true, color: COLORS.orangeHex, fontFace: FONT,
    margin: 0,
  });
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: L.fichaBadge.x, y: L.fichaBadge.y, w: L.fichaBadge.w, h: L.fichaBadge.h,
    fill: { color: COLORS.navyHex },
    line: noLine(),
    rectRadius: 0.16,
  });
  slide.addText((model.deptSection || '').toUpperCase(), {
    x: L.fichaBadge.x, y: L.fichaBadge.y, w: L.fichaBadge.w, h: L.fichaBadge.h,
    fontSize: 9, bold: true, color: COLORS.whiteHex, fontFace: FONT,
    align: 'center', valign: 'middle', margin: 0,
  });

  const slots = cardSlots(model.photos.length);
  model.photos.forEach((photo, idx) => {
    const card = slots[idx];
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: card.x, y: card.y, w: card.w, h: card.h,
      fill: { color: COLORS.whiteHex },
      line: { color: COLORS.lightgreyHex, width: 0.75 },
      rectRadius: 0.12,
    });
    const ph = photoArea(card);
    addRect(slide, pptx, ph, COLORS.lightgreyHex);
    if (photo.dataUrl) {
      try {
        const dim = dataUrlDimensions(photo.dataUrl);
        const fit = dim ? containRect(dim.w, dim.h, ph) : ph;
        slide.addImage({
          data: photo.dataUrl,
          x: fit.x, y: fit.y, w: fit.w, h: fit.h,
          altText: `Foto de incidencia: ${locationLabel(photo)} — ${commentTitle(photo)}`,
        });
      } catch {
        /* keep placeholder fill */
      }
    }
    addStamp(slide, pptx, ph, photo);
    const cap = captionArea(card);
    addRect(slide, pptx, { x: card.x, y: ph.y + ph.h, w: card.w, h: 0.04 }, COLORS.orangeHex);
    slide.addText(locationLabel(photo), {
      x: cap.x, y: cap.y, w: cap.w, h: 0.22,
      fontSize: 11, bold: true, color: COLORS.orangeHex, fontFace: FONT,
      margin: 0,
    });
    slide.addText(commentTitle(photo), {
      x: cap.x, y: cap.y + 0.22, w: cap.w, h: 0.42,
      fontSize: 12, bold: true, color: COLORS.navyHex, fontFace: FONT,
      margin: 0, valign: 'top',
    });
  });

  addChrome(slide, pptx, assets, pageNum);
}

/**
 * Genera PPTX 16:9 editable (cuadros de texto y fotos insertadas) con la imagen Refresco 2026,
 * en español (es-ES). Devuelve { blob, fileName, skipped } (no escribe a disco).
 */
export async function exportPptx(rawSession, { assets } = {}) {
  const { session, skipped } = await sessionWithNormalizedPhotos(rawSession);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'PANORAMICA_16x9', width: W, height: H });
  pptx.layout = 'PANORAMICA_16x9';
  const title = session.coverTitle || 'Inspección de incidencias de calidad';
  pptx.author = 'Refresco Iberia · Calidad Planta Alcolea';
  pptx.company = 'Refresco Iberia';
  pptx.subject = 'Informe de inspección de incidencias de calidad';
  pptx.title = title;
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

  const brand = assets || await loadBrandAssets();
  const slides = buildPreviewSlides(session);
  const slideTitles = [];

  slides.forEach((model, idx) => {
    const page = idx + 1;
    if (model.type === 'cover') {
      addCover(pptx, brand, model);
      slideTitles.push(`Portada · ${model.title || title}`);
    } else if (model.type === 'section') {
      addSection(pptx, brand, model, page);
      slideTitles.push(`Departamento · ${model.deptName || ''}`);
    } else {
      addFicha(pptx, brand, model, page);
      slideTitles.push(`${model.deptName || ''} · Ficha ${model.fichaIndex} de ${model.fichaTotal}`);
    }
  });

  const fileName = safeFileName(session);
  const output = await pptx.write({ outputType: 'arraybuffer' });
  const blob = await cleanPptxBlob(output, { title, slideTitles });
  return { blob, fileName, skipped };
}
