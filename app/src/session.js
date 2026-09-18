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

export function movePhoto(session, id, dir) {
  const i = session.photos.findIndex((p) => p.id === id);
  if (i < 0) return session;
  const j = i + dir;
  if (j < 0 || j >= session.photos.length) return session;
  const sameDept = session.photos[i].code === session.photos[j].code;
  if (!sameDept) return session;
  const tmp = session.photos[i];
  session.photos[i] = session.photos[j];
  session.photos[j] = tmp;
  return saveSession(session);
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
