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

function isUserCancel(err) {
  if (!err) return false;
  const name = err.name || '';
  const msg = String(err.message || err).toLowerCase();
  return (
    name === 'AbortError' ||
    name === 'NotAllowedError' ||
    msg.includes('cancel') ||
    msg.includes('share canceled') ||
    msg.includes('share cancelled')
  );
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
 * Web desktop/mobile: File System Access API, else <a download>, PDF also opens in new tab.
 */
export async function saveWithPickerOrDownload(blob, fileName, mime, { toast, openPdfTab = false } = {}) {
  const type = mime || blob.type || 'application/octet-stream';

  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    try {
      const ext = fileName.toLowerCase().endsWith('.pdf') ? '.pdf' : '.pptx';
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: ext === '.pdf' ? 'PDF' : 'PowerPoint',
            accept: { [type]: [ext] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      const savedName = handle.name || fileName;
      toast?.(`Guardado: ${savedName}`);
      return { method: 'save-picker', path: savedName };
    } catch (err) {
      if (isUserCancel(err)) {
        return { method: 'cancelled' };
      }
      console.warn('[share] showSaveFilePicker failed, falling back to download', err);
    }
  }

  triggerDownload(blob, fileName);

  const isPdf = type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
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
  toast?.(
    `Descarga iniciada: ${fileName}. Revise la carpeta Descargas del navegador.`
  );
  return { method: 'download', fileName };
}

/**
 * @param {'share'|'download'} mode
 */
export async function shareOrDownload(blob, fileName, mime, { toast, mode = 'share' } = {}) {
  if (!blob) throw new Error('No hay archivo para exportar');
  if (!fileName) throw new Error('Nombre de archivo vacío');

  if (Capacitor.isNativePlatform()) {
    return saveAndShareNative(blob, fileName, {
      toast,
      wantShare: mode !== 'download',
    });
  }

  // Web Share only when user asked to share AND browser supports files
  if (mode === 'share') {
    try {
      const file = new File([blob], fileName, {
        type: mime || blob.type || 'application/octet-stream',
      });
      if (
        typeof navigator !== 'undefined' &&
        navigator.share &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: fileName });
        toast?.('Menú compartir abierto');
        return { method: 'web-share' };
      }
    } catch (err) {
      if (isUserCancel(err)) {
        return { method: 'cancelled' };
      }
      console.warn('[share] Web Share failed, falling back to save', err);
    }
  }

  const isPdf =
    mime === 'application/pdf' || String(fileName).toLowerCase().endsWith('.pdf');
  // PPTX: always picker/download (no silent false success)
  // PDF download mode: also open tab as fallback
  return saveWithPickerOrDownload(blob, fileName, mime, {
    toast,
    openPdfTab: isPdf,
  });
}

/** Explicit download path used by "Solo descargar" buttons */
export async function downloadOnly(blob, fileName, mime, { toast } = {}) {
  return shareOrDownload(blob, fileName, mime, { toast, mode: 'download' });
}
