/**
 * Nombre de archivo seguro para Windows/Android/iOS.
 * - Sin tildes ni símbolos (solo A-Z 0-9 _ -), para que ningún sistema lo cambie.
 * - Base máx. 40 caracteres: el diálogo «Guardar como» de Chrome en Windows recorta
 *   el nombre sugerido a 63 caracteres y podía dejar «.pptx» convertido en «.ppt».
 */
export function exportFileName(title, ext) {
  const cleanExt = String(ext || '').replace(/^\.?/, '.').toLowerCase();
  const base = String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
    .slice(0, 40)
    .replace(/[_-]+$/g, '')
    .toUpperCase() || 'INFORME_INSPECCION';
  return `${base}${cleanExt}`;
}

/** Garantiza que el nombre termina exactamente en la extensión pedida. */
export function ensureExtension(name, ext) {
  const e = String(ext).toLowerCase();
  const n = String(name || '');
  if (n.toLowerCase().endsWith(e)) return n;
  const stem = n.replace(/\.[A-Za-z0-9]{1,5}$/, '');
  return `${stem || 'INFORME_INSPECCION'}${e}`;
}
