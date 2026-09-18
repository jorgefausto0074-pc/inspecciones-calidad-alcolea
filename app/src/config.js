/** Configuración editable — cambiar contraseña aquí o en config.local.js */
export const APP_CONFIG = {
  password: 'CalidadAlcolea2026',
  sessionKey: 'inspecciones-calidad-session-v1',
  authKey: 'inspecciones-calidad-auth-v1',
  plantName: 'REFRESCO IBERIA PLANTA ALCOLEA',
  defaultTitlePrefix: 'INSPECCION INCIDENCIAS CALIDAD',
};

export const DEPTS = [
  { code: 'EX', name: 'EXTERIORES', section: 'INCIDENCIAS EXTERIORES' },
  { code: 'J-', name: 'JARABE', section: 'INCIDENCIAS JARABE' },
  { code: 'T', name: 'TRATAMIENTO DE AGUAS', section: 'INCIDENCIAS TRATAMIENTO DE AGUAS' },
  { code: 'M', name: 'MANTENIMIENTO', section: 'INCIDENCIAS MANTENIMIENTO' },
  { code: 'P', name: 'PRODUCCIÓN', section: 'INCIDENCIAS PRODUCCIÓN' },
  { code: 'A', name: 'ALMACÉN', section: 'INCIDENCIAS ALMACÉN' },
  { code: 'L', name: 'LABORATORIO', section: 'INCIDENCIAS LABORATORIO' },
  { code: 'LI', name: 'LIMPIEZA', section: 'INCIDENCIAS LIMPIEZA' },
  { code: 'V', name: 'VESTUARIO', section: 'INCIDENCIAS VESTUARIOS' },
];

export const DEPT_ORDER = DEPTS.map((d) => d.code);

export const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

export function deptByCode(code) {
  return DEPTS.find((d) => d.code === code) || { code, name: code, section: `INCIDENCIAS ${code}` };
}

export function sanitizeName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 80) || 'SIN-UBICACION';
}

export function buildDisplayName(code, ubicacion, ts = Date.now()) {
  const d = new Date(ts);
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('');
  return `${code}-${sanitizeName(ubicacion)}-${stamp}`;
}

export function defaultCover(date = new Date()) {
  const year = date.getFullYear();
  return {
    title: `${APP_CONFIG.defaultTitlePrefix} ${year}`,
    subtitle: APP_CONFIG.plantName,
    slideTitle: `INSPECCIÓN ${MONTHS_ES[date.getMonth()]} ${year}`,
  };
}
