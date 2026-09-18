/**
 * Share or download a generated file (PPTX/PDF).
 * Prefer Web Share API (Android/mobile), then Capacitor Share/Filesystem, else download.
 */
export async function shareOrDownload(blob, fileName, mime, { toast } = {}) {
  const file = new File([blob], fileName, { type: mime || blob.type || 'application/octet-stream' });

  // 1) Web Share API with files (Chrome Android, Capacitor WebView often supports this)
  try {
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        toast?.('Compartido — elija WhatsApp, Drive, Archivos…');
        return { method: 'web-share' };
      }
    }
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
      return { method: 'cancelled' };
    }
    // fall through
  }

  // 2) Capacitor Share + Filesystem (if plugins are present)
  try {
    const Cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (Cap?.isNativePlatform?.()) {
      const { Filesystem, Directory } = await import(/* @vite-ignore */ '@capacitor/filesystem').catch(() => ({}));
      const { Share } = await import(/* @vite-ignore */ '@capacitor/share').catch(() => ({}));
      if (Filesystem?.writeFile && Share?.share) {
        const base64 = await blobToBase64(blob);
        const written = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: fileName,
          files: [written.uri],
          dialogTitle: 'Compartir / guardar',
        });
        toast?.('Compartido — elija destino');
        return { method: 'capacitor' };
      }
    }
  } catch (err) {
    if (err && (err.message || '').toLowerCase().includes('cancel')) {
      return { method: 'cancelled' };
    }
    // fall through to download
  }

  // 3) Fallback: trigger download
  triggerDownload(blob, fileName);
  toast?.('Guardado en Descargas. Use Compartir del sistema o mueva el archivo donde quiera.');
  return { method: 'download' };
}

export function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function blobToBase64(blob) {
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
