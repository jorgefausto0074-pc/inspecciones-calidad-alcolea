/**
 * Imagen Refresco 2026 — solo presentación de la interfaz (v1.4.0).
 * Los informes PPTX/PDF siguen usando ASSETS de brand.js (diseño v3 aprobado, sin cambios).
 * Fuentes: kit oficial de marca 2026 (Logo Set + Refresco_Template.pptx).
 */
const B = './assets/marca2026/';

export const UI = {
  logo: `${B}refresco-logo-naranja.png`,
  logoWhite: `${B}refresco-logo-blanco.png`,
  rOrange: `${B}refresco-r-naranja.png`,
  rWhite: `${B}refresco-r-blanco.png`,
  stripeOrange: `${B}stripe-r-naranja.svg`,
  stripeBlue: `${B}stripe-r-azul.svg`,
  circlesBlue: `${B}circulos-azul.svg`,
  bubbles: `${B}foto-burbujas.webp`,
  stripePhoto: `${B}foto-stripe-zumos.webp`,
  lines: [1, 2, 3, 4, 5, 6, 7].map((n) => `${B}foto-linea-${n}.webp`),
};

/** Tagline oficial (BrandIdentity 2.0). */
export const TAGLINE = 'The agile beverage solutions partner.';

/** Assets de la interfaz que el service worker precachea para uso sin conexión. */
export const UI_PRECACHE = [
  UI.logo, UI.logoWhite, UI.rOrange, UI.rWhite, UI.stripeOrange, UI.stripeBlue,
  UI.circlesBlue, UI.bubbles, UI.stripePhoto, ...UI.lines,
];

function bubblesHTML(n, cls) {
  let html = '';
  for (let i = 0; i < n; i += 1) {
    // Distribución fija (sin Math.random) para que el render sea estable.
    const left = (i * 37 + 11) % 100;
    const size = 8 + ((i * 13) % 26);
    const delay = (i * 1.7) % 9;
    const dur = 7 + ((i * 3) % 7);
    html += `<span class="bubble" style="left:${left}%;width:${size}px;height:${size}px;animation-delay:-${delay.toFixed(1)}s;animation-duration:${dur}s"></span>`;
  }
  return `<div class="${cls}" aria-hidden="true">${html}</div>`;
}

/** Fondo decorativo del acceso: foto de burbujas, círculos de marca y botellas. */
export function gateDecorHTML() {
  const bottles = UI.lines.slice(0, 4)
    .map((src, i) => `<div class="gate-bottle" style="--i:${i}"><img src="${src}" alt="" /></div>`)
    .join('');
  return `
    <div class="gate-decor" aria-hidden="true">
      <div class="gate-photo"><img src="${UI.bubbles}" alt="" /></div>
      <img class="gate-circles gate-circles-a" src="${UI.circlesBlue}" alt="" />
      <img class="gate-stripe" src="${UI.stripeOrange}" alt="" />
      <div class="gate-bottles">${bottles}</div>
      ${bubblesHTML(18, 'bubbles')}
    </div>`;
}

/** Cinta animada de fotos de líneas y botellas Refresco bajo la cabecera. */
export function ribbonHTML() {
  const tiles = [...UI.lines, UI.stripePhoto, ...UI.lines, UI.stripePhoto]
    .map((src) => `<div class="ribbon-tile${src === UI.stripePhoto ? ' wide' : ''}"><img src="${src}" alt="" loading="lazy" /></div>`)
    .join('');
  // Desfase según el reloj: al repintar la pantalla la cinta no salta al inicio.
  const offset = ((Date.now() / 1000) % 70).toFixed(2);
  return `<div class="ribbon" aria-hidden="true"><div class="ribbon-track" style="animation-delay:-${offset}s">${tiles}</div>${bubblesHTML(10, 'bubbles ribbon-bubbles')}</div>`;
}
