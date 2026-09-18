import { DEPT_ORDER, deptByCode } from './config.js';
import { groupPhotosByDept } from './session.js';
import { COPY } from './brand.js';

/**
 * Canonical slide model shared by Preview, PPTX and PDF.
 * Grouping by department stays in code; no legend text is attached to slides.
 */
export function buildPreviewSlides(session) {
  const slides = [];
  slides.push({
    type: 'cover',
    title: session.coverTitle || 'INSPECCION INCIDENCIAS CALIDAD',
    subtitle: session.coverSubtitle || '',
    label: COPY.coverLabel,
  });

  const groups = groupPhotosByDept(session.photos || [], DEPT_ORDER);
  for (const [code, photos] of groups) {
    const dept = deptByCode(code);
    slides.push({
      type: 'section',
      code,
      deptName: dept.name,
      title: dept.section,
    });
    const fichaTotal = Math.max(1, Math.ceil(photos.length / 2));
    for (let i = 0; i < photos.length; i += 2) {
      slides.push({
        type: 'content',
        code,
        deptName: dept.name,
        deptSection: dept.section,
        fichaIndex: i / 2 + 1,
        fichaTotal,
        photos: photos.slice(i, i + 2),
      });
    }
  }
  return slides;
}

export function locationLabel(photo) {
  const loc = String(photo.ubicacion || '').trim();
  if (loc) return `${photo.code} · ${loc}`.toUpperCase();
  return String(photo.code || '').toUpperCase();
}

export function commentTitle(photo) {
  const c = String(photo.comentario || '').trim();
  if (c) return c.toUpperCase();
  return String(photo.displayName || '').toUpperCase();
}

export function statusLabel(photo) {
  return photo.status === 'resolved' ? 'RESUELTO' : 'PENDIENTE';
}
