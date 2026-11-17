/** Visual brand tokens — informes Refresco 2026 (v1.5.0). Paleta oficial Styleguide 1.6 / BrandIdentity 2.0. */

export const APP_VERSION = '1.5.0';

export const COLORS = {
  navy: '#071A40',
  navyHex: '071A40',
  orange: '#FF6633',
  orangeHex: 'FF6633',
  bright: '#083DC4',
  brightHex: '083DC4',
  lightblue: '#B1DCED',
  lightblueHex: 'B1DCED',
  highlight: '#CCF5FF',
  highlightHex: 'CCF5FF',
  lightgrey: '#E0E0E0',
  lightgreyHex: 'E0E0E0',
  slate: '#496380',
  slateHex: '496380',
  bg: '#F3F7FA',
  bgHex: 'F3F7FA',
  white: '#FFFFFF',
  whiteHex: 'FFFFFF',
};

export const FONT = 'Arial';

export const COPY = {
  footerMeta: 'Inspecciones calidad · Refresco Iberia · Planta Alcolea',
  coverLabel: 'CALIDAD · PLANTA ALCOLEA',
  departamento: 'DEPARTAMENTO',
};

/** Imágenes del informe (PNG/JPG; kit oficial de marca 2026 y Refresco_Template.pptx). */
export const ASSETS = {
  logo: './assets/informe2026/logo-refresco-naranja.png',
  rLogo: './assets/informe2026/r-naranja.png',
  cover: './assets/informe2026/portada-botellas.jpg',
  sections: [1, 2, 3, 4, 5, 6, 7].map((n) => `./assets/informe2026/seccion-${n}.jpg`),
};

/** Tamaño nativo (px) de los logos recortados, para mantener la proporción. */
export const LOGO_NATIVE = { w: 1808, h: 300 };
export const R_NATIVE = { w: 730, h: 593 };

export const SLIDE = { w: 13.333, h: 7.5 };

/**
 * Layout in inches on a 13.333 × 7.5 slide.
 * CSS preview converts via pct() so HTML/PPTX/PDF share the same geometry.
 */
export const LAYOUT = {
  footerBar: { x: 0, y: 7.0, w: 13.333, h: 0.5 },
  footerAccent: { x: 0, y: 6.97, w: 13.333, h: 0.035 },
  pageNum: { x: 0.18, y: 7.1, w: 0.4, h: 0.3 },
  footerMeta: { x: 0.62, y: 7.1, w: 8.5, h: 0.3 },
  footerLogo: { x: 11.42, y: 7.13, h: 0.24 },
  cornerR: { x: 12.42, y: 0.22, h: 0.5 },

  coverPhoto: { x: 7.733, y: 0, w: 5.6, h: 6.97 },
  coverLogo: { x: 0.8, y: 0.8, h: 0.5 },
  coverRule: { x: 0.8, y: 2.38, w: 0.9, h: 0.06 },
  coverLabel: { x: 0.8, y: 2.55, w: 6.6, h: 0.3 },
  coverTitle: { x: 0.8, y: 2.92, w: 6.6, h: 1.85 },
  coverSubtitle: { x: 0.8, y: 4.85, w: 6.6, h: 0.45 },
  coverCircles: [
    { x: 6.95, y: 5.15, w: 1.35, h: 1.35 },
    { x: 6.5, y: 4.82, w: 0.5, h: 0.5 },
    { x: 8.15, y: 4.62, w: 0.34, h: 0.34 },
  ],

  sectionPhoto: { x: 8.35, y: 1.2, w: 4.4, h: 4.4 },
  sectionCircles: [
    { x: 7.75, y: 4.55, w: 1.3, h: 1.3 },
    { x: 7.5, y: 4.2, w: 0.38, h: 0.38 },
    { x: 12.25, y: 0.7, w: 0.6, h: 0.6 },
  ],
  sectionRule: { x: 0.8, y: 2.12, w: 0.9, h: 0.06 },
  sectionKicker: { x: 0.8, y: 2.28, w: 7.0, h: 0.32 },
  sectionDept: { x: 0.8, y: 2.62, w: 7.3, h: 1.0 },
  sectionTitle: { x: 0.8, y: 3.68, w: 7.3, h: 0.6 },

  fichaDept: { x: 0.42, y: 0.2, w: 7.5, h: 0.42 },
  fichaIndex: { x: 0.42, y: 0.6, w: 5.5, h: 0.28 },
  fichaBadge: { x: 9.4, y: 0.29, w: 2.75, h: 0.36 },
  cardGap: 0.28,
  cards: { x: 0.38, y: 1.0, w: 12.57, h: 5.72 },
  cardCaptionH: 0.95,
  stamp: { w: 1.22, h: 0.28 },
};

/** Foto de sección según el departamento (fija por código, sin azar). */
export function sectionPhotoFor(code, deptOrder = []) {
  const i = Math.max(0, deptOrder.indexOf(code));
  return i % ASSETS.sections.length;
}

export function logoWidthForHeight(heightIn) {
  return heightIn * (LOGO_NATIVE.w / LOGO_NATIVE.h);
}

export function rWidthForHeight(heightIn) {
  return heightIn * (R_NATIVE.w / R_NATIVE.h);
}

export function pctBox({ x, y, w, h }) {
  return {
    left: `${(x / SLIDE.w) * 100}%`,
    top: `${(y / SLIDE.h) * 100}%`,
    width: w != null ? `${(w / SLIDE.w) * 100}%` : undefined,
    height: h != null ? `${(h / SLIDE.h) * 100}%` : undefined,
  };
}

export function boxStyle(box, extra = '') {
  const p = pctBox(box);
  const parts = [`left:${p.left}`, `top:${p.top}`];
  if (p.width) parts.push(`width:${p.width}`);
  if (p.height) parts.push(`height:${p.height}`);
  return `${parts.join(';')};${extra}`;
}

export const IN_TO_MM = 25.4;

export function mmBox(box) {
  const out = {
    x: box.x * IN_TO_MM,
    y: box.y * IN_TO_MM,
  };
  if (box.w != null) out.w = box.w * IN_TO_MM;
  if (box.h != null) out.h = box.h * IN_TO_MM;
  return out;
}

export function cardSlots(photoCount) {
  const area = LAYOUT.cards;
  if (photoCount <= 1) {
    const w = (area.w - LAYOUT.cardGap) / 2;
    return [{ x: area.x, y: area.y, w, h: area.h }];
  }
  const w = (area.w - LAYOUT.cardGap) / 2;
  return [
    { x: area.x, y: area.y, w, h: area.h },
    { x: area.x + w + LAYOUT.cardGap, y: area.y, w, h: area.h },
  ];
}

export function photoArea(card) {
  return {
    x: card.x,
    y: card.y,
    w: card.w,
    h: card.h - LAYOUT.cardCaptionH,
  };
}

export function captionArea(card) {
  const ph = photoArea(card);
  return {
    x: card.x + 0.14,
    y: ph.y + ph.h + 0.1,
    w: card.w - 0.28,
    h: LAYOUT.cardCaptionH - 0.16,
  };
}
