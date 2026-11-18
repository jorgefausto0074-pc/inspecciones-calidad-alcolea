/**
 * Rock-solid share / save for PPTX & PDF.
 * Native (Capacitor): write to disk first, then Share sheet.
 * Web: showSaveFilePicker → download (+ PDF tab fallback). Never lie about success.
 */
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** Solo AbortError es una cancelación real del usuario (cerró el diálogo / menú compartir). */
function isUserCancel(err) {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  return err.name === 'AbortError' || msg.includes('share canceled') || msg.includes('share cancelled');
}

function extOf(fileName) {
  return String(fileName).toLowerCase().endsWith('.pdf') ? '.pdf' : '.pptx';
}

async function resolveBlob(blobOrFactory) {
  const blob = typeof blobOrFactory === 'function' ? await blobOrFactory() : blobOrFactory;
  if (!blob || !blob.size) throw new Error('No hay archivo para exportar');
  return blob;
}

/** ¿El navegador puede compartir este tipo de archivo? (Chrome/Edge de PC no admiten PPTX). */
export function webCanShareFile(fileName, mime) {
  try {
    if (typeof navigator === 'undefined' || !navigator.share || typeof navigator.canShare !== 'function') return false;
    const probe = new File([new Uint8Array(1)], fileName, { type: mime || 'application/octet-stream' });
    return navigator.canShare({ files: [probe] }) === true;
  } catch {
    return false;
  }
}

/**
 * Write blob to native filesystem. Prefer public Download on Android; fall back to Documents.
 * NEVER claims success unless writeFile actually succeeded.
 */
export async function writeNativeFile(blob, fileName) {
  const base64 = await blobToBase64(blob);
  const attempts = [];

  if (Capacitor.getPlatform() === 'android') {
    attempts.push({
      path: `Download/${fileName}`,
      directory: Directory.ExternalStorage,
      label: `Download/${fileName}`,
    });
    attempts.push({
      path: fileName,
      directory: Directory.External,
      label: `External/${fileName}`,
    });
  }

  attempts.push({
    path: fileName,
    directory: Directory.Documents,
    label: `Documents/${fileName}`,
  });

  let lastErr;
  for (const a of attempts) {
    try {
      const written = await Filesystem.writeFile({
        path: a.path,
        data: base64,
        directory: a.directory,
        recursive: true,
      });
      const uri = written?.uri;
      if (!uri) throw new Error('writeFile returned empty URI');
      return { uri, path: a.label, directory: a.directory };
    } catch (err) {
      lastErr = err;
      console.warn('[share] write failed', a.label, err);
    }
  }
  throw new Error(
    `No se pudo guardar el archivo (${lastErr?.message || lastErr || 'sin detalle'})`
  );
}

/**
 * Native: save to disk, then open system share sheet (WhatsApp, email, Files…).
 */
export async function saveAndShareNative(blob, fileName, { toast, wantShare = true } = {}) {
  const saved = await writeNativeFile(blob, fileName);

  if (!wantShare) {
    toast?.(`Guardado: ${saved.path}`);
    return { method: 'capacitor-save', ...saved };
  }

  try {
    await Share.share({
      title: fileName,
      files: [saved.uri],
      dialogTitle: 'Compartir informe',
    });
    toast?.('Menú compartir abierto');
    return { method: 'capacitor-share', ...saved };
  } catch (err) {
    // File is on disk regardless — never pretend share succeeded
    toast?.(`Guardado: ${saved.path}`);
    if (isUserCancel(err)) {
      return { method: 'cancelled-after-save', ...saved };
    }
    return {
      method: 'capacitor-save',
      ...saved,
      shareError: String(err?.message || err),
    };
  }
}

export function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
  return url;
}

/**
 * Abre «Guardar como» ANTES de generar (el navegador exige el clic reciente del usuario).
 * Devuelve el handle, 'cancelled', o null si no hay selector o falló (→ descarga normal).
 */
export async function pickSaveHandle(fileName, mime) {
  if (typeof window === 'undefined' || typeof window.showSaveFilePicker !== 'function') return null;
  const ext = extOf(fileName);
  const type = ext === '.pdf' ? 'application/pdf' : (mime || 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  try {
    return await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description: ext === '.pdf' ? 'Documento PDF' : 'Presentación de PowerPoint', accept: { [type]: [ext] } }],
      excludeAcceptAllOption: true,
    });
  } catch (err) {
    if (isUserCancel(err)) return 'cancelled';
    console.warn('[share] showSaveFilePicker no disponible, se usará descarga', err);
    return null;
  }
}

async function writeToHandle(handle, blob, fileName, toast) {
  const ext = extOf(fileName);
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  let savedName = handle.name || fileName;
  if (!savedName.toLowerCase().endsWith(ext) && typeof handle.move === 'function') {
    // Si Windows recortó o cambió la extensión, se corrige para que PowerPoint lo abra
    const fixed = savedName.replace(/\.[A-Za-z0-9]{1,5}$/, '') + ext;
    try { await handle.move(fixed); savedName = fixed; } catch { /* se avisa abajo */ }
  }
  if (!savedName.toLowerCase().endsWith(ext)) {
    toast?.(`Guardado como ${savedName}. Cambie la extensión a ${ext} para abrirlo.`, true);
  } else {
    toast?.(`Guardado: ${savedName}`);
  }
  return { method: 'save-picker', path: savedName };
}

export function triggerDownloadNamed(blob, fileName, mime) {
  // El Blob lleva el MIME correcto para que el navegador respete la extensión
  const typed = blob.type ? blob : new Blob([blob], { type: mime || 'application/octet-stream' });
  return triggerDownload(typed, fileName);
}

/**
 * Web: «Guardar como» (si existe) o descarga normal. PDF además se abre en pestaña nueva.
 * blobOrFactory puede ser un Blob o una función async que lo genera (se llama tras elegir destino).
 */
export async function saveWithPickerOrDownload(blobOrFactory, fileName, mime, { toast, openPdfTab = false, usePicker = true, note = '' } = {}) {
  const handle = usePicker ? await pickSaveHandle(fileName, mime) : null;
  if (handle === 'cancelled') return { method: 'cancelled' };
  const blob = await resolveBlob(blobOrFactory);
  if (handle) {
    try {
      const out = await writeToHandle(handle, blob, fileName, toast);
      if (note) toast?.(note);
      return out;
    } catch (err) {
      console.warn('[share] escritura con selector falló, se usa descarga', err);
    }
  }

  triggerDownloadNamed(blob, fileName, mime);

  const isPdf = extOf(fileName) === '.pdf';
  if (openPdfTab && isPdf && typeof window !== 'undefined') {
    try {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (_) {
      /* ignore popup blockers */
    }
  }

  // Honest: browser started a download — user must check Downloads / picker
  toast?.(`${note ? `${note} ` : ''}Descarga iniciada: ${fileName}. Revise la carpeta Descargas del navegador.`);
  return { method: 'download', fileName };
}

/**
 * @param {Blob|(() => Promise<Blob>)} blobOrFactory
 * @param {'share'|'download'} mode
 */
export async function shareOrDownload(blobOrFactory, fileName, mime, { toast, mode = 'share' } = {}) {
  if (!blobOrFactory) throw new Error('No hay archivo para exportar');
  if (!fileName) throw new Error('Nombre de archivo vacío');

  if (Capacitor.isNativePlatform()) {
    const blob = await resolveBlob(blobOrFactory);
    return saveAndShareNative(blob, fileName, {
      toast,
      wantShare: mode !== 'download',
    });
  }

  const isPdf = extOf(fileName) === '.pdf';
  const type = mime || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation');

  // Web Share solo si el usuario pidió compartir Y el navegador admite este tipo de archivo
  if (mode === 'share') {
    if (webCanShareFile(fileName, type)) {
      const blob = await resolveBlob(blobOrFactory);
      try {
        const file = new File([blob], fileName, { type });
        await navigator.share({ files: [file], title: fileName });
        toast?.('Menú compartir abierto');
        return { method: 'web-share' };
      } catch (err) {
        if (isUserCancel(err)) return { method: 'cancelled' };
        console.warn('[share] Web Share falló, se descarga el archivo', err);
        // Sin gesto de usuario ya no se puede abrir «Guardar como»: descarga directa
        return saveWithPickerOrDownload(blob, fileName, type, {
          toast, openPdfTab: isPdf, usePicker: false,
          note: 'No se pudo abrir el menú compartir.',
        });
      }
    }
    // PC (Chrome/Edge/Firefox): no permiten compartir un PowerPoint → se guarda y se avisa
    return saveWithPickerOrDownload(blobOrFactory, fileName, type, {
      toast, openPdfTab: isPdf,
      note: isPdf ? '' : 'Este navegador no comparte PowerPoint directamente; adjunte el archivo guardado en el correo o Teams.',
    });
  }

  return saveWithPickerOrDownload(blobOrFactory, fileName, type, {
    toast,
    openPdfTab: isPdf,
  });
}

/** Explicit download path used by "Solo descargar" buttons */
export async function downloadOnly(blobOrFactory, fileName, mime, { toast } = {}) {
  return shareOrDownload(blobOrFactory, fileName, mime, { toast, mode: 'download' });
}
