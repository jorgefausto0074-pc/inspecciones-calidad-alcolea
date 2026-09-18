# CHECK — UX fixes (2026-09-18)

## Cambios

### 1) Export → Compartir / guardar
- Nuevo helper `app/src/share.js` → `shareOrDownload(blob, fileName, mime)`.
- Orden: Web Share API (`navigator.canShare({files})`) → Capacitor Share/Filesystem (si plugins) → descarga + toast Descargas/compartir.
- `exportPptx` / `exportPdf` devuelven `{ blob, fileName }` (ya no `writeFile`/`save` silenciosos como único camino).
- Botones: **Compartir / guardar PPTX|PDF** + secundarios **Solo descargar**.

### 2) Sello / PENDIENTE más pequeño, esquina
- CSS preview: `.stamp` y `.pend-tag` arriba-derecha, ~18% ancho, `max-width:48px`, `z-index:5`.
- PPTX/PDF: badge compacto arriba-derecha de cada caja de foto (no centrado).

### 3) Tres orígenes de captura
- **Cámara** (`#btn-cam`): getUserMedia; fallback input con `capture=environment` solo al pulsar Cámara.
- **Galería** (`#gallery-input`): `accept="image/*" multiple` **sin** `capture`.
- **Archivo / carpeta PC** (`#file-input`): igual, **sin** `capture`.
- Multi-selección: reutiliza depto/ubicación/comentario/estado del formulario; toast "N fotos añadidas".
- Campo opcional **Nombre** en el borrador antes de "Añadir al informe".

## Self-check (dist)
- [x] `gallery-input` y `file-input` presentes; sin `capture` en esos templates.
- [x] `btn-cam` presente.
- [x] CSS stamp `top:2%` / `max-width:48px`; pend-tag `right:2%`.
- [x] Textos "Compartir / guardar" y "Solo descargar".

## Build / entregables
| Artefacto | Ruta |
|-----------|------|
| Web dist | `/workspace/inspecciones-calidad/app/dist/` |
| APK debug | `/workspace/inspecciones-calidad/artifacts/inspecciones-calidad-debug.apk` |
| APK shared | `/home/box/shared/jorge-prd/inspecciones-calidad/artifacts/inspecciones-calidad-debug.apk` |
| Web zip | `.../artifacts/inspecciones-calidad-web.zip` |
| Shared app | `/home/box/shared/jorge-prd/inspecciones-calidad/app/` |

## Servidor local
- `http://127.0.0.1:8787/` y `:8790/` sirven `app/dist`.

## Notas / blockers
- Plugins `@capacitor/share` y `@capacitor/filesystem` **instalados** en `app/` y `android-wrap/` (v1.2.0). El APK escribe a disco y abre el menú compartir; la web usa selector de archivo / descarga honesta.
- APK sigue siendo **debug** (no release firmado). Desinstalar el APK anterior antes de instalar v1.2.0.
