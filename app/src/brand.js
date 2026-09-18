/** Visual brand tokens — Refresco Iberia Alcolea, diseño v3 (APPROVED). */

export const APP_VERSION = '1.3.0';

export const COLORS = {
  green: '#03A64B',
  greenHex: '03A64B',
  orange: '#D9871A',
  orangeHex: 'D9871A',
  orangeAlt: '#ED7D31',
  orangeAltHex: 'ED7D31',
  charcoal: '#2F3E46',
  charcoalHex: '2F3E46',
  muted: '#6E7F88',
  mutedHex: '6E7F88',
  bg: '#FAFCFA',
  bgHex: 'FAFCFA',
  white: '#FFFFFF',
  whiteHex: 'FFFFFF',
  orbGreen: '#03A64B',
  orbOrange: '#E8922A',
  orbMint: '#D8F3E3',
  orbCream: '#F0E4D0',
  orbWhite: '#F3FBF6',
  photoBg: '#D5E6DB',
  cardBorder: '#E4EEE7',
};

export const COPY = {
  footerMeta: 'Inspecciones calidad · Refresco Iberia · Planta Alcolea',
  coverLabel: 'CALIDAD · PLANTA ALCOLEA',
  wordmark: 'Refresco',
  departamento: 'DEPARTAMENTO',
};

export const ASSETS = {
  logo: './assets/logo-refresco.png',
  cenefa: './assets/cenefa-ondulada.png',
  mascots: './assets/logo-mascotas.png',
};

/** Native logo pixel size (clean wordmark). Used to keep object-fit contain. */
export const LOGO_NATIVE = { w: 1216, h: 743 };

export const SLIDE = { w: 13.333, h: 7.5 };

/**
 * Layout in inches on a 13.333 × 7.5 slide.
 * CSS preview converts via pct() so HTML/PPTX/PDF share the same geometry.
 */
export const LAYOUT = {
  cenefa: { x: 0, y: 5.833, w: 13.333, h: 1.667 },
  mascots: { x: 0.28, y: 6.12, w: 1.12, h: 1.32 },
  footerMeta: { x: 1.52, y: 7.08, w: 8.3, h: 0.28 },
  wordmark: { x: 10.15, y: 6.96, w: 2.9, h: 0.42 },
  pageNum: { x: 0.06, y: 7.10, w: 0.22, h: 0.22 },

  coverLogoCard: { x: 0.78, y: 1.05, w: 2.55, h: 1.62 },
  coverLogo: { x: 0.98, y: 1.22, h: 0.92 },
  coverLabel: { x: 0.78, y: 2.82, w: 7.4, h: 0.28 },
  coverTitle: { x: 0.78, y: 3.12, w: 7.6, h: 1.35 },
  coverSubtitle: { x: 0.78, y: 4.52, w: 8.2, h: 0.38 },
  coverOrbGreen: { x: 10.55, y: 0.05, w: 3.55, h: 3.55 },
  coverOrbOrange: { x: 10.05, y: 2.42, w: 1.95, h: 1.95 },
  coverOrbWhite: { x: 12.05, y: 3.42, w: 1.38, h: 1.38 },

  sectionKicker: { x: 0.8, y: 2.28, w: 11.73, h: 0.32 },
  sectionDept: { x: 0.8, y: 2.58, w: 11.73, h: 0.85 },
  sectionTitle: { x: 0.8, y: 3.48, w: 11.73, h: 0.7 },
  sectionOrbLeft: { x: -0.85, y: 2.05, w: 2.35, h: 2.35 },
  sectionOrbRight: { x: 11.55, y: -0.35, w: 2.85, h: 2.85 },

  fichaDept: { x: 0.42, y: 0.18, w: 7.5, h: 0.42 },
  fichaIndex: { x: 0.42, y: 0.58, w: 5.5, h: 0.28 },
  fichaBadge: { x: 10.15, y: 0.26, w: 2.75, h: 0.36 },
  fichaOrb: { x: 12.35, y: 0.55, w: 1.55, h: 1.55 },
  cardGap: 0.28,
  cards: { x: 0.38, y: 0.98, w: 12.57, h: 4.95 },
  cardCaptionH: 0.95,
  stamp: { w: 1.22, h: 0.28 },
};

export function logoWidthForHeight(heightIn) {
  return heightIn * (LOGO_NATIVE.w / LOGO_NATIVE.h);
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
