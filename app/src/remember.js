/**
 * «Recordar contraseña en este dispositivo».
 * Nunca se guarda la contraseña: solo un token aleatorio y su huella SHA-256 ligada al hash
 * de contraseña configurado. Si cambia la contraseña (hash/sal/iteraciones), el token deja de valer.
 * Web y APK (WebView de Capacitor) usan localStorage, que persiste hasta «Cerrar sesión».
 */
import { APP_CONFIG } from './config.js';

export const REMEMBER_KEY = 'inspecciones-calidad-recordar-v1';

function b64(bytes) {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s);
}

async function fingerprint(token) {
  const a = APP_CONFIG.auth || {};
  const data = new TextEncoder().encode(`${token}|${a.algo}|${a.iterations}|${a.salt}|${a.hash}`);
  return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

export async function rememberDevice() {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const token = b64(raw);
  const tag = await fingerprint(token);
  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ v: 1, token, tag, desde: new Date().toISOString() }));
}

export function forgetDevice() {
  try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
}

/** true si este dispositivo tiene un acceso recordado válido para la contraseña actual. */
export async function isDeviceRemembered() {
  try {
    const rec = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
    if (!rec || rec.v !== 1 || !rec.token || !rec.tag || !globalThis.crypto?.subtle) return false;
    const ok = (await fingerprint(rec.token)) === rec.tag;
    if (!ok) forgetDevice(); // contraseña cambiada → se pide de nuevo
    return ok;
  } catch {
    forgetDevice();
    return false;
  }
}
