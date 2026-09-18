# Inspecciones Calidad Alcolea

Aplicación web (PWA) para capturar incidencias de planta en **Refresco Iberia — planta Alcolea**, montar el informe con la estética de la plantilla corporativa y exportar **PPTX** y **PDF**.

**PRD:** v1.3 (aprobado 2026-09-18)  
**Cliente:** Jorge Quezada Ortega — Coordinador de Calidad, planta Alcolea (Córdoba)

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
7. **Exportar:** PPTX y/o PDF. La sesión **sigue editable** tras exportar.
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
- **Contraseña:** `CalidadAlcolea2026`
- **Permisos:** `CAMERA`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE` (Android ≤12)
- Es un APK **debug** (clave de depuración). Válido para pruebas internas; no para Play Store.

### Instalar (sideload)

1. Copiar el APK al teléfono (USB, Drive, correo interno, o descargarlo del repo si es público).
2. En Android: **Ajustes → Seguridad** (o Apps) → permitir **Instalar apps desconocidas**.
3. Abrir `inspecciones-calidad-debug.apk` e instalar.
4. Conceder **Cámara** (y fotos/galería si el sistema lo pide).
5. Introducir `CalidadAlcolea2026`.

Enlace de Drive (si se compartió aparte): [inspecciones-calidad-debug.apk](https://drive.google.com/file/d/1ZJtBPcCyE4jtbKrBD81wUYVpYRyaiF1F/view?usp=drivesdk).

---

## Reconstruir (web)

Requisitos: Node.js 22 y npm.

```bash
cd app
npm ci
npm run build
```

Salida: `app/dist/` (lista para GitHub Pages o para servir en local).

Desarrollo / vista previa:

```bash
cd app
npm ci
npm run build
npm run preview
```

Preview: `http://127.0.0.1:8787/`.

Tras un push a `main`, Actions vuelve a construir y publica Pages. No hace falta commitear `dist/`.

### Cambiar la contraseña

1. Editar `password` en `app/src/config.js`.
2. `cd app && npm ci && npm run build`.
3. Commit + push a `main` (Actions actualiza el sitio).
4. Si también usa el APK, regenérelo (ver abajo) y sustituya `artifacts/inspecciones-calidad-debug.apk`.

### Regenerar el APK

Este repositorio incluye el APK listo en `artifacts/`, pero **no** incluye el proyecto Capacitor/Gradle (`android-wrap` / `.tooling`). Para generar un APK nuevo a partir de `app/dist`:

```bash
cd app && npm ci && npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Inspecciones Calidad" com.refresco.alcolea.calidad --web-dir dist
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

Copiar el APK resultante a `artifacts/inspecciones-calidad-debug.apk`. Hace falta JDK y Android SDK. El APK de release firmado requiere un keystore propio.

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

Amarillo industrial `#FFC000`, azul Office `#4472C4` / `#1F4E79`, naranja `#ED7D31`, verde `#70AD47`, sello rojo de la plantilla, negro.

---

## Estructura

```
inspecciones-calidad-alcolea/
  PRD.md
  plantilla-inspecciones-calidad.pptx
  README.md
  .github/workflows/pages.yml   # build Vite + GitHub Pages
  samples/informe-ejemplo-alcolea.pptx
  artifacts/inspecciones-calidad-debug.apk
  app/
    src/           # código fuente
    public/assets/ # logo y sello de la plantilla
    dist/          # generado por npm run build (no se versiona)
```

---

## Fuera de alcance (v1)

Play Store, SSO, sync SharePoint/Drive, GPS obligatorio, OCR/IA, iOS, SAP, offline robusto, firmas digitales.
