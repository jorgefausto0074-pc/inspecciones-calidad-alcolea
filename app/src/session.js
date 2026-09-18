import { APP_CONFIG, defaultCover, buildDisplayName } from './config.js';

function uid() {
  return `ph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptySession() {
  const cover = defaultCover();
  return {
    id: `ses_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    coverTitle: cover.title,
    coverSubtitle: cover.subtitle,
    slideTitle: cover.slideTitle,
    photos: [],
    lastExportAt: null,
  };
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.sessionKey);
    if (!raw) return createEmptySession();
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.photos)) return createEmptySession();
    return s;
  } catch {
    return createEmptySession();
  }
}

export function saveSession(session) {
  session.updatedAt = new Date().toISOString();
  localStorage.setItem(APP_CONFIG.sessionKey, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(APP_CONFIG.sessionKey);
  return createEmptySession();
}

export function isAuthenticated() {
  return sessionStorage.getItem(APP_CONFIG.authKey) === '1';
}

export function setAuthenticated(ok) {
  if (ok) sessionStorage.setItem(APP_CONFIG.authKey, '1');
  else sessionStorage.removeItem(APP_CONFIG.authKey);
}

export function addPhoto(session, { dataUrl, code, ubicacion, comentario, status = 'pending', displayName } = {}) {
  const ts = Date.now();
  const autoName = buildDisplayName(code, ubicacion, ts);
  const photo = {
    id: uid(),
    dataUrl,
    code,
    ubicacion: (ubicacion || '').toUpperCase(),
    comentario: (comentario || '').toUpperCase(),
    status, // 'resolved' | 'pending'
    displayName: (displayName && String(displayName).trim()) || autoName,
    createdAt: new Date(ts).toISOString(),
  };
  session.photos.push(photo);
  return saveSession(session);
}

export function updatePhoto(session, id, patch) {
  const i = session.photos.findIndex((p) => p.id === id);
  if (i < 0) return session;
  const p = { ...session.photos[i], ...patch };
  if (patch.ubicacion != null || patch.code != null) {
    p.displayName = buildDisplayName(p.code, p.ubicacion, Date.parse(p.createdAt) || Date.now());
  }
  if (patch.ubicacion != null) p.ubicacion = String(patch.ubicacion).toUpperCase();
  if (patch.comentario != null) p.comentario = String(patch.comentario).toUpperCase();
  session.photos[i] = p;
  return saveSession(session);
}

export function removePhoto(session, id) {
  session.photos = session.photos.filter((p) => p.id !== id);
  return saveSession(session);
}

export const MOVE_TOAST_OK = 'Orden actualizado';
export const MOVE_TOAST_FIRST = 'Ya es la primera de este departamento';
export const MOVE_TOAST_LAST = 'Ya es la última de este departamento';

/**
 * Reorder a photo within its department (not the flat capture array).
 * Rebuilds the department subsequence and writes it back into the original
 * flat-array slots so interleaved departments stay put.
 */
export function movePhoto(session, id, dir) {
  const photos = session.photos;
  const i = photos.findIndex((p) => p.id === id);
  if (i < 0) return session;
  const step = dir < 0 ? -1 : 1;
  const code = photos[i].code;
  const deptIdxs = [];
  for (let k = 0; k < photos.length; k += 1) {
    if (photos[k].code === code) deptIdxs.push(k);
  }
  const pos = deptIdxs.indexOf(i);
  const targetPos = pos + step;
  if (pos < 0 || targetPos < 0 || targetPos >= deptIdxs.length) return session;

  const deptPhotos = deptIdxs.map((idx) => photos[idx]);
  const [moved] = deptPhotos.splice(pos, 1);
  deptPhotos.splice(targetPos, 0, moved);
  const next = photos.slice();
  for (let k = 0; k < deptIdxs.length; k += 1) {
    next[deptIdxs[k]] = deptPhotos[k];
  }
  session.photos = next;
  return saveSession(session);
}

/** Move within department and report whether it happened (for Lista toasts). */
export function attemptMovePhoto(session, id, dir) {
  const up = dir < 0;
  const st = photoMoveState(session.photos, id);
  if (up && !st.canUp) {
    return { session, moved: false, message: MOVE_TOAST_FIRST };
  }
  if (!up && !st.canDown) {
    return { session, moved: false, message: MOVE_TOAST_LAST };
  }
  return { session: movePhoto(session, id, dir), moved: true, message: MOVE_TOAST_OK };
}

/** Whether this photo can move up/down inside its department. */
export function photoMoveState(photos, id) {
  const list = photos || [];
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return { canUp: false, canDown: false };
  const code = list[i].code;
  const dept = list.filter((p) => p.code === code);
  const pos = dept.findIndex((p) => p.id === id);
  return { canUp: pos > 0, canDown: pos >= 0 && pos < dept.length - 1 };
}

export function groupPhotosByDept(photos, order) {
  const map = new Map();
  for (const code of order) map.set(code, []);
  for (const p of photos) {
    if (!map.has(p.code)) map.set(p.code, []);
    map.get(p.code).push(p);
  }
  return [...map.entries()].filter(([, arr]) => arr.length > 0);
}
