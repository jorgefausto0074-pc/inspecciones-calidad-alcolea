# EXPORT AUDIT — PPTX/PDF download & share fix (2026-09-18, Europe/Madrid)

## Symptom (Jorge)

- Toast showed **“descargado” / “en Descargas”** but **no file appeared** in Downloads.
- **Compartir** did not open WhatsApp/email on the APK; unreliable on permanent web.

## Root causes

1. **android-wrap** only had `@capacitor/android`, `@capacitor/core`, `@capacitor/cli`.  
   **Missing:** `@capacitor/filesystem`, `@capacitor/share`.  
   Dynamic imports in `share.js` failed → code fell through to `<a download>`, which **Capacitor WebView often ignores**.
2. **False success toasts:** `doExport` / fallback path toasted “en Descargas” even when nothing was written.
3. **Service worker** cached GET responses broadly; risk of interfering with blob/object-URL style flows. Cache bumped and restricted.

## Fix summary

### A) Web app (`app/`)

- Added deps: `@capacitor/core`, `@capacitor/filesystem`, `@capacitor/share` (Capacitor 8.x).
- Rewrote `src/share.js`:
  - **Native:** blob→base64 → `Filesystem.writeFile` (try `ExternalStorage/Download/…`, then `External`, then `Documents`) → `Share.share({ files: [uri], dialogTitle: 'Compartir informe' })`.
  - On Share failure/cancel: file stays on disk; toast shows **`Guardado: ${path}`**.
  - **Never** success-toast unless `writeFile` succeeded.
  - **Web:** `showSaveFilePicker` when available; else `<a download>` + PDF `window.open(blobURL)` fallback; Web Share only if `canShare({files})` and user chose Compartir.
- `doExport` in `main.js` uses `downloadOnly` / `shareOrDownload` and surfaces **error message text**.
- `public/sw.js`: cache `inspecciones-calidad-v2-export`; **skip** `blob:`/`data:`; only network-first cache for static same-origin assets.

### B) Android wrap

- Installed `@capacitor/filesystem@8.1.3`, `@capacitor/share@8.0.2` (with core 8.5.x).
- `npx cap sync android` — plugins registered.
- Manifest: storage/media permissions + `requestLegacyExternalStorage`; FileProvider paths expanded.
- **versionCode 2 / versionName 1.2.0** (uninstall old APK first so Jorge sees the new build).

### C) Verification

- `node app/scripts/test-share-export.mjs` — all checks passed (no lying toasts, native write/share paths present, SW blob skip, blobToBase64 + download click mock).
- Local HTTP server on `127.0.0.1:8791` served `dist` + Content-Disposition download test OK.
- Desktop Chrome File System Access / `<a download>` against Pages/local: use rebuilt `dist` after GitHub Pages push.

## How Jorge should reinstall the APK

1. **Uninstall** the old “Inspecciones Calidad” app completely (Settings → Apps → Uninstall).  
   Do not install over the old debug APK without uninstall — version bump helps, but a clean uninstall avoids stale WebView/cache.
2. Install the new debug APK from `artifacts/inspecciones-calidad-debug.apk` (regenerated via `android-wrap`, versionName **1.2.0**).
3. Open app → create a tiny informe → **Compartir / guardar PDF** → system share sheet should appear; or **Solo descargar** → toast **`Guardado: …`** with real path (Documents or Download).
4. For web (GitHub Pages): after `main` deploys, hard-refresh / clear site data once so SW `inspecciones-calidad-v2-export` activates.

## Artifacts

| Item | Path |
|------|------|
| APK (workspace) | `artifacts/inspecciones-calidad-debug.apk` |
| APK (shared) | `/home/box/shared/jorge-prd/inspecciones-calidad/artifacts/inspecciones-calidad-debug.apk` |
| Web dist | `app/dist/` (+ shared copy) |
| Source tarball | `artifacts/inspecciones-calidad-export-fix-src.tgz` |
| Web zip | `artifacts/inspecciones-calidad-web.zip` |

## GitHub Pages

Push to `main` triggers `.github/workflows/pages.yml` (`npm ci` + `npm run build` in `app/`, then deploy). Users must hard-refresh / clear the old service worker cache.

## Honesty rule

Toasts allowed after this fix:

- `Generando PPTX…` / `Generando PDF…`
- `Menú compartir abierto`
- `Guardado: <path-or-name>`
- `Descarga iniciada: <file>. Revise la carpeta Descargas del navegador.`
- `Exportación cancelada` / `Error al exportar …: <detail>`

**Forbidden:** claiming the file is in Descargas when write/share did not succeed.
