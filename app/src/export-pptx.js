import PptxGenJS from 'pptxgenjs';
import {
  COLORS, COPY, LAYOUT, SLIDE, cardSlots, photoArea, captionArea, logoWidthForHeight,
} from './brand.js';
import { buildPreviewSlides, locationLabel, commentTitle, statusLabel } from './slides.js';
import { loadBrandAssets, containRect, dataUrlDimensions } from './assets-load.js';

const W = SLIDE.w;
const H = SLIDE.h;

function safeFileName(session) {
  const safe = (session.coverTitle || 'informe').replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/gi, '').slice(0, 60).trim() || 'informe';
  return `${safe.replace(/\s+/g, '_')}.pptx`;
}

function noLine() {
  return { color: COLORS.whiteHex, transparency: 100, width: 0 };
}

function addOval(slide, pptx, box, color) {
  slide.addShape(pptx.shapes.OVAL, {
    x: box.x, y: box.y, w: box.w, h: box.h,
    fill: { color },
    line: noLine(),
  });
}

function addChrome(slide, pptx, assets, pageNum) {
  const L = LAYOUT;
  if (assets.cenefa) {
    slide.addImage({
      data: assets.cenefa,
      x: L.cenefa.x, y: L.cenefa.y, w: L.cenefa.w, h: L.cenefa.h,
    });
  } else {
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: 0, y: H - 0.55, w: W, h: 0.55,
      fill: { color: COLORS.greenHex },
      line: noLine(),
    });
  }
  if (assets.mascots) {
    slide.addImage({
      data: assets.mascots,
      x: L.mascots.x, y: L.mascots.y, w: L.mascots.w, h: L.mascots.h,
    });
  }
  slide.addText(COPY.footerMeta, {
    x: L.footerMeta.x, y: L.footerMeta.y, w: L.footerMeta.w, h: L.footerMeta.h,
    fontSize: 10, bold: true, color: COLORS.whiteHex, fontFace: 'Calibri',
    valign: 'middle', margin: 0,
  });
  slide.addText(COPY.wordmark, {
    x: L.wordmark.x, y: L.wordmark.y, w: L.wordmark.w, h: L.wordmark.h,
    fontSize: 18, bold: true, color: COLORS.whiteHex, fontFace: 'Calibri',
    align: 'right', valign: 'middle', margin: 0,
  });
  if (pageNum) {
    slide.addText(String(pageNum), {
      x: L.pageNum.x, y: L.pageNum.y, w: L.pageNum.w, h: L.pageNum.h,
      fontSize: 9, bold: true, color: COLORS.whiteHex, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
  }
}

function addCover(pptx, assets, model) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgHex };
  const L = LAYOUT;
  addOval(slide, pptx, L.coverOrbGreen, COLORS.greenHex);
  addOval(slide, pptx, L.coverOrbOrange, 'E8922A');
  addOval(slide, pptx, L.coverOrbWhite, 'F3FBF6');

  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: L.coverLogoCard.x, y: L.coverLogoCard.y, w: L.coverLogoCard.w, h: L.coverLogoCard.h,
    fill: { color: COLORS.whiteHex },
    line: noLine(),
    rectRadius: 0.12,
    shadow: { type: 'outer', color: '2F3E46', blur: 10, opacity: 0.12, offset: 3 },
  });
  if (assets.logo) {
    const logoH = L.coverLogo.h;
    const logoW = logoWidthForHeight(logoH);
    const logoX = L.coverLogoCard.x + (L.coverLogoCard.w - logoW) / 2;
    const logoY = L.coverLogoCard.y + (L.coverLogoCard.h - logoH) / 2;
    slide.addImage({
      data: assets.logo,
      x: logoX, y: logoY, w: logoW, h: logoH,
      sizing: { type: 'contain', w: logoW, h: logoH },
    });
  }
  slide.addText(model.label || COPY.coverLabel, {
    x: L.coverLabel.x, y: L.coverLabel.y, w: L.coverLabel.w, h: L.coverLabel.h,
    fontSize: 11, bold: true, color: COLORS.orangeHex, fontFace: 'Calibri',
    margin: 0, charSpacing: 3,
  });
  slide.addText((model.title || '').toUpperCase(), {
    x: L.coverTitle.x, y: L.coverTitle.y, w: L.coverTitle.w, h: L.coverTitle.h,
    fontSize: 28, bold: true, color: COLORS.greenHex, fontFace: 'Calibri',
    align: 'left', valign: 'top', margin: 0,
  });
  slide.addText((model.subtitle || '').toUpperCase(), {
    x: L.coverSubtitle.x, y: L.coverSubtitle.y, w: L.coverSubtitle.w, h: L.coverSubtitle.h,
    fontSize: 13, bold: true, color: COLORS.charcoalHex, fontFace: 'Calibri',
    margin: 0,
  });
  addChrome(slide, pptx, assets, null);
}

function addSection(pptx, assets, model, pageNum) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgHex };
  const L = LAYOUT;
  addOval(slide, pptx, L.sectionOrbLeft, 'F0E4D0');
  addOval(slide, pptx, L.sectionOrbRight, 'D8F3E3');
  slide.addText(COPY.departamento, {
    x: L.sectionKicker.x, y: L.sectionKicker.y, w: L.sectionKicker.w, h: L.sectionKicker.h,
    fontSize: 12, bold: true, color: COLORS.orangeHex, fontFace: 'Calibri',
    align: 'center', margin: 0, charSpacing: 4,
  });
  slide.addText((model.deptName || '').toUpperCase(), {
    x: L.sectionDept.x, y: L.sectionDept.y, w: L.sectionDept.w, h: L.sectionDept.h,
    fontSize: 44, bold: true, color: COLORS.orangeHex, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0,
  });
  slide.addText((model.title || '').toUpperCase(), {
    x: L.sectionTitle.x, y: L.sectionTitle.y, w: L.sectionTitle.w, h: L.sectionTitle.h,
    fontSize: 24, bold: true, color: COLORS.greenHex, fontFace: 'Calibri',
    align: 'center', margin: 0,
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
    fill: { color: resolved ? COLORS.greenHex : COLORS.orangeAltHex },
    line: noLine(),
    rectRadius: 0.12,
  });
  slide.addText(statusLabel(photo), {
    x, y, w, h,
    fontSize: 8, bold: true, color: COLORS.whiteHex, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0,
  });
}

function addFicha(pptx, assets, model, pageNum) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgHex };
  const L = LAYOUT;
  addOval(slide, pptx, L.fichaOrb, 'D8F3E3');
  slide.addText((model.deptName || '').toUpperCase(), {
    x: L.fichaDept.x, y: L.fichaDept.y, w: L.fichaDept.w, h: L.fichaDept.h,
    fontSize: 22, bold: true, color: COLORS.orangeHex, fontFace: 'Calibri',
    margin: 0,
  });
  slide.addText(`FICHA ${model.fichaIndex} DE ${model.fichaTotal}`, {
    x: L.fichaIndex.x, y: L.fichaIndex.y, w: L.fichaIndex.w, h: L.fichaIndex.h,
    fontSize: 12, bold: true, color: COLORS.greenHex, fontFace: 'Calibri',
    margin: 0,
  });
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: L.fichaBadge.x, y: L.fichaBadge.y, w: L.fichaBadge.w, h: L.fichaBadge.h,
    fill: { color: COLORS.orangeHex },
    line: noLine(),
    rectRadius: 0.16,
  });
  slide.addText((model.deptSection || '').toUpperCase(), {
    x: L.fichaBadge.x, y: L.fichaBadge.y, w: L.fichaBadge.w, h: L.fichaBadge.h,
    fontSize: 9, bold: true, color: COLORS.whiteHex, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0,
  });

  const slots = cardSlots(model.photos.length);
  model.photos.forEach((photo, idx) => {
    const card = slots[idx];
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: card.x, y: card.y, w: card.w, h: card.h,
      fill: { color: COLORS.whiteHex },
      line: { color: 'E4EEE7', width: 0.75 },
      rectRadius: 0.12,
      shadow: { type: 'outer', color: '2F3E46', blur: 8, opacity: 0.1, offset: 2 },
    });
    const ph = photoArea(card);
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: ph.x, y: ph.y, w: ph.w, h: ph.h,
      fill: { color: 'D5E6DB' },
      line: noLine(),
    });
    if (photo.dataUrl) {
      try {
        const dim = dataUrlDimensions(photo.dataUrl);
        const fit = dim ? containRect(dim.w, dim.h, ph) : ph;
        slide.addImage({
          data: photo.dataUrl,
          x: fit.x, y: fit.y, w: fit.w, h: fit.h,
          sizing: { type: 'contain', w: fit.w, h: fit.h },
        });
      } catch {
        /* keep placeholder fill */
      }
    }
    addStamp(slide, pptx, ph, photo);
    const cap = captionArea(card);
    slide.addText(locationLabel(photo), {
      x: cap.x, y: cap.y, w: cap.w, h: 0.22,
      fontSize: 10, bold: true, color: COLORS.orangeHex, fontFace: 'Calibri',
      margin: 0,
    });
    slide.addText(commentTitle(photo), {
      x: cap.x, y: cap.y + 0.22, w: cap.w, h: 0.42,
      fontSize: 11, bold: true, color: COLORS.charcoalHex, fontFace: 'Calibri',
      margin: 0, valign: 'top',
    });
  });

  addChrome(slide, pptx, assets, pageNum);
}

/**
 * Genera PPTX 16:9 v3. Devuelve { blob, fileName } (no escribe a disco).
 */
export async function exportPptx(session, { assets } = {}) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE16x9', width: W, height: H });
  pptx.layout = 'WIDE16x9';
  pptx.author = 'Refresco Iberia — Calidad Alcolea';
  pptx.title = session.coverTitle || 'Inspección incidencias';

  const brand = assets || await loadBrandAssets();
  const slides = buildPreviewSlides(session);

  slides.forEach((model, idx) => {
    const page = idx + 1;
    if (model.type === 'cover') addCover(pptx, brand, model);
    else if (model.type === 'section') addSection(pptx, brand, model, page);
    else addFicha(pptx, brand, model, page);
  });

  const fileName = safeFileName(session);
  const output = await pptx.write({ outputType: 'blob' });
  const blob = output instanceof Blob
    ? output
    : new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  return { blob, fileName };
}
