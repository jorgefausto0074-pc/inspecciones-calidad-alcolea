# Inspecciones Calidad Alcolea

Aplicación web (PWA) para capturar incidencias de planta en **Refresco Iberia — planta Alcolea**, montar el informe con la estética de la plantilla corporativa y exportar **PPTX** y **PDF**.

**PRD:** v1.3 (aprobado 2026-09-18)  
**App:** v1.3.0 — diseño visual v3 (Refresco) + reordenar fotos en Preview  
**Cliente:** Jorge Quezada Ortega — Coordinador de Calidad, planta Alcolea (Córdoba)

---

## Actualización v1.3.0 (diseño visual v3)

Informe y app alineados a la plantilla visual **v3** (naranja `#D9871A` / verde `#03A64B`):

- Portada: logo Refresco proporcional, orbes, título **INSPECCION INCIDENCIAS CALIDAD** (sin año), cenefa ondulada, mascotas sobre la cenefa, pie `Inspecciones calidad · Refresco Iberia · Planta Alcolea` (sin fechas).
- Separador de departamento: nombre grande en naranja + `INCIDENCIAS {DEPTO}` (sin leyenda de auto-agrupación; la agrupación sigue en código).
- Fichas: 2 fotos/hoja, sellos PENDIENTE/RESUELTO, mismo pie/cenefa/mascotas.
- Preview: botones **↑↓** en cada foto; `movePhoto` reordena **dentro del departamento** (ya no falla si hay otro depto. intercalado).
- Contraseña, captura, sellos, export Capacitor Filesystem+Share y el modelo de sesión **no cambian**.

### Web (GitHub Pages) — refrescar caché

Tras el despliegue de v1.3.0:

1. Abrir https://jorgefausto0074-pc.github.io/inspecciones-calidad-alcolea/
2. **Hard-refresh:** Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac).
3. Si sigue la versión vieja: DevTools → Application → Storage → **Clear site data**. Service worker: `inspecciones-calidad-v3-brand`.

### APK Android — reinstalar v1.3.0

**No instale encima del APK anterior.** Desinstale primero. Versión **1.3.0** (`versionCode 3`). El APK debug hay que regenerarlo con `android-wrap` (ver más abajo); este cambio de código no incluye un APK firmado nuevo.

---

## Actualización v1.2.0 (export / share)

La exportación **PPTX/PDF** en APK y en la web fallaba: el aviso decía que el archivo estaba en Descargas, pero no se guardaba ni se abría el menú de WhatsApp/correo.

**Qué cambia:** Capacitor Filesystem + Share en el APK (escribe el archivo y luego abre compartir); toasts honestos; el service worker ya no intercepta `blob:`/`data:`.

---

## Sitio web público (HTTPS)

**URL permanente (GitHub Pages):**  
https://jorgefausto0074-pc.github.io/inspecciones-calidad-alcolea/

Varios usuarios de Calidad pueden abrir el **mismo enlace** e introducir la **misma contraseña**. No hay cuentas individuales en v1.

El workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) construye `app/` (`npm ci` + `npm run build`) y:

1. Publica el estático en la rama **`gh-pages`** (listo para «Deploy from a branch»).
2. Intenta el despliegue oficial **GitHub Actions → Pages**.

El **build ya funciona**. El deploy oficial falla con 404 hasta que el **dueño del repo** active Pages (esta automatización no tiene permiso de administración para encenderlo).

### Activar Pages (una sola vez, dueño del repo)

1. Si el plan es **GitHub Free** y el repo sigue **privado**, Pages no sirve el sitio. Elija una opción (se prefiere privado si el plan lo permite):
   - **Pro / Team:** deje el repo privado.
   - **Free:** **Settings → General → Danger Zone → Change repository visibility → Public**. La app sigue protegida con contraseña `CalidadAlcolea2026`.
2. **Settings → Pages**:
   - **Source: GitHub Actions**, o
   - **Deploy from a branch** → rama `gh-pages` → carpeta `/ (root)`.
3. Reejecutar el workflow **Deploy GitHub Pages** (Actions → el run de `main` → *Re-run jobs*), o esperar el próximo push a `main`.

Hasta que eso ocurra, la URL de arriba devolverá 404. El código, el APK y el workflow ya están en GitHub.

---

## Contraseña de acceso

- **Contraseña:** `CalidadAlcolea2026`
- La misma contraseña vale para la **web** y para el **APK**.
- Para cambiarla: edite `password` en [`app/src/config.js`](app/src/config.js) y vuelva a construir (web y, si aplica, APK).

---

## Uso rápido

1. Abrir el enlace HTTPS e introducir la contraseña.
2. **Captura:** código de departamento (`EX`, `J-`, `T`, `M`, `P`, `A`, `L`, `LI`, `V`), ubicación, comentario y estado (pendiente / resuelto). Foto con cámara, galería o archivo.
3. Nombre automático: `{CODIGO}-{ubicacion}-{timestamp}`.
4. **Lista:** editar, reordenar dentro del depto., borrar.
5. **Portada:** título / subtítulo / título de hojas editables (mes-año prellenado).
6. **Preview:** carrusel 16:9 (2 fotos/hoja; 1 si impar).
7. **Exportar:** **Compartir / guardar** PPTX o PDF (menú del sistema en APK; selector/descarga en web). **Solo descargar** guarda sin abrir compartir. La sesión **sigue editable** tras exportar. Los avisos no dicen «en Descargas» si el archivo no se llegó a escribir.
8. Descartar sesión solo con doble confirmación.

No se incluyen datos inventados de planta: solo lo que el usuario captura.

---

## APK Android

El APK **debug** precompilado está en el repositorio:

| Artefacto | Ruta |
|-----------|------|
| APK debug | [`artifacts/inspecciones-calidad-debug.apk`](artifacts/inspecciones-calidad-debug.apk) |
| ZIP de la web (`dist`) | [`artifacts/inspecciones-calidad-web.zip`](artifacts/inspecciones-calidad-web.zip) |

- **Package ID:** `com.refresco.alcolea.calidad`
- **Versión:** `1.3.0` (`versionCode 3`) — desinstalar el APK anterior antes de instalar este
- **Contraseña:** `CalidadAlcolea2026`
- **Permisos:** `CAMERA`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` (Android ≤12)
- Es un APK **debug** (clave de depuración). Válido para pruebas internas; no para Play Store.

### Instalar (sideload) — v1.3.0

1. **Desinstalar** cualquier «Inspecciones Calidad» previa (Ajustes → Apps → Desinstalar). No actualice encima del debug viejo.
2. Copiar el APK v1.3.0 al teléfono (USB, Drive, correo interno, o descargarlo del repo si es público).
3. En Android: **Ajustes → Seguridad** (o Apps) → permitir **Instalar apps desconocidas**.
4. Abrir `inspecciones-calidad-debug.apk` e instalar.
5. Conceder **Cámara** (y fotos/galería si el sistema lo pide).
6. Introducir `CalidadAlcolea2026`.

Enlace de Drive (si se compartió aparte): [inspecciones-calidad-debug.apk](https://drive.google.com/file/d/1ZJtBPcCyE4jtbKrBD81wUYVpYRyaiF1F/view?usp=drivesdk).

---

## Reconstruir (web)

Requisitos: Node.js 22 y npm.

```bash
cd app
npm ci
npm run build
```

Salida: `app/dist/` (lista para GitHub Pages o para servir en local). El `dist` se versiona como respaldo; Actions lo **vuelve a construir** en cada push a `main`.

Desarrollo / vista previa:

```bash
cd app
npm ci
npm run build
npm run preview
```

Preview: `http://127.0.0.1:8787/`.

Tras un push a `main`, Actions vuelve a construir y publica Pages. Compruebe el export PPTX/PDF y, si el SW viejo sigue activo, haga hard-refresh / borre datos del sitio.

### Cambiar la contraseña

1. Editar `password` en `app/src/config.js`.
2. `cd app && npm ci && npm run build`.
3. Commit + push a `main` (Actions actualiza el sitio).
4. Si también usa el APK, regenérelo (ver abajo) y sustituya `artifacts/inspecciones-calidad-debug.apk`.

### Regenerar el APK

El wrap Capacitor está en [`android-wrap/`](android-wrap/) (plugins `@capacitor/filesystem` y `@capacitor/share`, `versionName 1.3.0`). Para generar un APK nuevo a partir de `app/dist`:

```bash
cd app && npm ci && npm run build
cd ../android-wrap
npm ci
npx cap sync android
cd android && ./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk \
  ../../artifacts/inspecciones-calidad-debug.apk
```

Hace falta JDK y Android SDK. El APK de release firmado requiere un keystore propio. Recuerde **desinstalar** el APK anterior antes de instalar el nuevo.

---

## Plantilla y ejemplo

- Plantilla estética: [`plantilla-inspecciones-calidad.pptx`](plantilla-inspecciones-calidad.pptx)
- Informe de ejemplo (fotos placeholder **EJEMPLO**, no son datos reales de planta): [`samples/informe-ejemplo-alcolea.pptx`](samples/informe-ejemplo-alcolea.pptx)

```bash
cd app
npm run sample
```

---

## Paleta

Amarillo/naranja marca `#D9871A` / `#ED7D31`, verde `#03A64B`, carbón `#2F3E46`, fondo `#FAFCFA`.

---

## Estructura

```
inspecciones-calidad-alcolea/
  PRD.md
  EXPORT-AUDIT.md               # auditoría del fix de export v1.2.0
  plantilla-inspecciones-calidad.pptx
  README.md
  .github/workflows/pages.yml   # build Vite + GitHub Pages
  samples/informe-ejemplo-alcolea.pptx
  artifacts/inspecciones-calidad-debug.apk
  android-wrap/                 # Capacitor 8 + Filesystem/Share (APK 1.3.0)
  app/
    src/           # código fuente (share.js, export PPTX/PDF)
    public/        # SW v2-export, logo y sello
    dist/          # npm run build (versionado + rebuild en Actions)
```

---

## Fuera de alcance (v1)

Play Store, SSO, sync SharePoint/Drive, GPS obligatorio, OCR/IA, iOS, SAP, offline robusto, firmas digitales.
