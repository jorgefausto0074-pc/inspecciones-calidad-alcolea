# PRD — App Inspecciones / Incidencias Calidad
**Cliente:** Jorge Quezada Ortega — Coordinador de Calidad, Refresco Iberia, planta Alcolea (Córdoba)  
**Producto:** App Android (APK) + versión web/PC  
**Estado:** APPROVED v1.3 — aprobado explícitamente por Jorge 2026-09-18; construcción vía Cursor a cargo del Jefe de gabinete  
**Fecha:** 2026-09-18  
**Plantilla visual:** `/home/box/shared/jorge-prd/inspecciones-calidad/referencia/plantilla-inspecciones-calidad.pptx`

---

## 1) Problema y audiencia

### Problema
Jorge (y el dpto. de Calidad) documentan inspecciones e incidencias en planta con muchas fotos del móvil. Hoy el flujo es manual: fotografiar, renombrar, montar PowerPoint respetando una estética fija (2 fotos por hoja, títulos, pies de ubicación) y exportar. Es lento, propenso a desorden y a perder el formato corporativo.

### Audiencia (v1)
- Usuario principal: Jorge / analistas de Calidad en planta Alcolea.
- Consumidores del entregable: dirección, mantenimiento, producción y otros deptos. que reciben el informe PPTX/PDF de incidencias.
- Acceso a la app: enlaces públicos protegidos con **contraseña sencilla** (APK + web). **Varios de Calidad** pueden usar el **mismo enlace + misma contraseña** (sin cuentas individuales en v1).

### Propuesta de valor
Desde el móvil (o PC): capturar la incidencia (foto + comentario + ubicación + código de depto.), montar automáticamente un informe con la estética de la plantilla (sin límite de páginas), previsualizarlo y descargar PPTX y/o PDF. Tras exportar, la sesión sigue editable. Distribución: enlace público APK + enlace público web/PC, ambos con contraseña.

---

## 2) Features (v1)

### 2.1 Captura en planta
- Hacer foto con la cámara de la app (y, opcional, elegir de galería).
- Por cada foto obligar / guiar:
  - **Código de departamento** (lista fija):
    | Código | Departamento |
    |--------|--------------|
    | `EX` | Exteriores |
    | `J-` | Jarabe |
    | `T` | Tratamiento de aguas |
    | `M` | Mantenimiento |
    | `P` | Producción |
    | `A` | Almacén |
    | `L` | Laboratorio |
    | `LI` | Limpieza |
    | `V` | Vestuario |
  - **Ubicación** (texto libre; ej. `CALLE FC-43`, `EB-06`, `L6`).
  - **Comentario / acción** (texto libre; ej. `REPARAR ESTANTERIA…`, `TUBERÍA…`, nº OT).
- Renombrado automático del fichero: `{CODIGO}-{ubicacion}-{timestamp}` (sanitizado).
- **Decisión v1:** el usuario elige el código de depto. en cada foto (selector rápido).

### 2.2 Sesión = informe
- Una sesión abierta = un informe (confirmado por Jorge).
- Durante la sesión: lista de fotos, editar comentario/ubicación/código, borrar, reordenar dentro del depto.
- **Tras exportar, la sesión SIGUE editable** (se puede seguir añadiendo/corrigiendo fotos y volver a exportar).
- Descartar sesión solo con confirmación explícita.

### 2.3 Montaje del informe (estética plantilla)
Respetar la plantilla de referencia:
- Formato **16:9** (13,33 × 7,50 in).
- **Sin límite de páginas** en la presentación.
- **Portada:**
  - Prellenado automático con mes/año (y año en el título) según la fecha de la sesión.
  - **Siempre editable:** Jorge puede reescribir el texto completo de portada (título y subtítulo) antes de exportar.
  - Logo de portada (diamante herramientas amarillo/azul/negro de la plantilla).
  - Default sugerido: `INSPECCION INCIDENCIAS CALIDAD {AÑO}` + `REFRESCO IBERIA PLANTA ALCOLEA`.
- **Hojas de contenido:**
  - Título centrado superior: `INSPECCIÓN {MES} {AÑO}` (prellenado; editable).
  - **2 fotos por hoja** lado a lado cuando hay par.
  - **Foto impar:** la última hoja de ese depto. **puede llevar 1 sola foto** (sin forzar hueco vacío).
  - Pie bajo cada foto: comentario + ubicación (estilo plantilla, mayúsculas, centrado).
- **Agrupación por departamento:** bloque de hojas consecutivas por código, con título de sección exacto: `INCIDENCIAS {DEPARTAMENTO}` (ej. `INCIDENCIAS VESTUARIOS`, `INCIDENCIAS LIMPIEZA`).
- Orden de deptos. default: EX → J- → T → M → P → A → L → LI → V.
- **Overlays de estado en v1:** marcar foto como `PROBLEMA RESUELTO` (sello rojo de la plantilla) y/o **pendiente**.

### 2.4 Preview y exportación
- Previsualización del informe montado (carrusel) **antes** de descargar.
- Exportar **PPTX** (base = plantilla).
- Exportar **PDF** (mismo contenido).
- Compartir / guardar en dispositivo.
- Re-exportar cuantas veces haga falta (sesión editable post-export).

### 2.5 Entregables de distribución
- **APK Android** con **enlace público + contraseña sencilla**.
- **Versión web/PC** con **enlace público + contraseña sencilla** (misma lógica; cámara del dispositivo o upload).
- La contraseña la define Jorge (o se acuerda en build); no es SSO corporativo.

### 2.6 UX / estética app
- UI en español.
- Paleta alineada a la plantilla / logo: amarillo industrial, azul claro, negro, acentos Office (azul `#4472C4`, naranja `#ED7D31`, dorado `#FFC000`, verde `#70AD47`) y sello rojo (si se activa).
- Flujos táctiles grandes (uso en planta).

---

## 3) Fuera de alcance (v1) — obligatorio

- Publicación en **Google Play Store** (solo APK + enlace; Play Store = fase posterior).
- Roles / login corporativo SSO / cuentas individuales (v1 = mismo enlace + misma contraseña para varios de Calidad; sin directorio de usuarios).
- Sincronización automática a SharePoint/OneDrive/Drive.
- GPS automático obligatorio (ubicación es texto).
- OCR / IA que invente depto. o pie.
- Edición avanzada tipo PowerPoint (formas libres, tipografías ilimitadas).
- iOS / App Store.
- Integración SAP / OT automática (nº OT en comentario a mano).
- Offline total robusto con sync diferida (v1 asume **red disponible**).
- Firmas digitales / flujo formal de aprobación del informe.
- Histórico multi-año en servidor con analítica BI.
- Límite artificial de páginas (explícitamente **sin límite**).

---

## 4) Métricas de éxito

- Jorge completa una inspección real y obtiene PPTX+PDF con 2 fotos/hoja (1 en la impar), agrupado por depto., estética reconocible vs plantilla, **sin montaje manual**.
- Tiempo “última foto → PPT descargado” &lt; 3 minutos en sesión típica (≈10–20 fotos).
- APK instalable desde enlace público + contraseña en su Android.
- Web/PC abre desde enlace público + contraseña y genera el mismo tipo de informe.
- Tras un export, puede corregir/añadir y volver a exportar sin perder la sesión.
- Cero datos inventados de planta: solo lo que introduce (fotos, textos, códigos).

---

## 5) Clarificaciones

### Todas cerradas — PRD APROBADO (v1.3)
- 1 sesión = 1 informe; editable tras exportar.
- APK + web/PC con enlaces públicos + contraseña sencilla; varios de Calidad con el mismo enlace/contraseña.
- Red preferida; Jorge elige código al fotografiar; UI español.
- Plantilla PPTX = referencia estética obligatoria.
- Foto impar → 1 sola foto en la última hoja.
- Portada: mes/año auto + texto siempre editable.
- Sin límite de páginas.
- **Sello:** SÍ — `PROBLEMA RESUELTO` / pendiente en v1.
- **Títulos de sección:** `INCIDENCIAS {DEPARTAMENTO}`.

**Aprobado por Jorge.** Construcción autorizada con Cursor; la ejecuta el **Jefe de gabinete** (Arquitecto PRD no construye código en este encargo).


## Anexo A — Lectura de la plantilla (referencia)

Archivo: `plantilla-inspecciones-calidad.pptx` (autor Jorge Quesada; título documento histórico «REPARACIONES TEMPORALES 2022»; 7 diapositivas; 16:9).

| # | Contenido observado |
|---|---------------------|
| 1 | Portada: `INSPECCION INCIDENCIAS CALIDAD 2026` / `REFRESCO IBERIA PLANTA ALCOLEA` + logo diamante (reglas + llave/destornillador/brocha; amarillo / azul / negro) |
| 2–3 | `INSPECCIÓN FEBRERO 2026` — 2 fotos + pies «REPARAR ESTANTERIA… CALLE FC-…» + overlay sello rojo `PROBLEMA RESUELTO` |
| 4–5 | `INSPECCIÓN MAYO 2026` — mismo layout 2 fotos + pies |
| 6 | `INSPECCIÓN JULIO 2026` — 2 fotos (estantería / plegadora) |
| 7 | `INSPECCIÓN AGOSTO 2026` — 2 fotos + pies con OT; overlay distinto (emoji triste) en lugar del sello |

Patrón fijo: **título de inspección arriba**, **dos fotos**, **texto de acción/ubicación debajo**, overlays de estado opcionales.

## Anexo B — Historial de decisiones

| Fecha | Decisión |
|-------|----------|
| 2026-09-18 | Plantilla entregada y grabada como referencia |
| 2026-09-18 | 2 fotos/hoja; códigos EX/J-/T/M/P/A/L/LI/V; agrupación por depto.; preview; PPTX+PDF |
| 2026-09-18 | 1 sesión = 1 informe; APK + web/PC públicos |
| 2026-09-18 | Red preferida; elegir código al fotografiar; UI ES |
| 2026-09-18 (v1.2) | Foto impar = 1 foto; portada auto+editable; sesión editable post-export; enlaces con contraseña; sin límite de páginas |
| 2026-09-18 (v1.3) | **APROBADO:** sello PROBLEMA RESUELTO/pendiente SÍ; títulos INCIDENCIAS {DEPARTAMENTO}; varios Calidad mismo enlace+pwd; Cursor autorizado (Jefe construye) |

## Anexo C — Stack tentativo (solo tras aprobación; no construir aún)

Propuesta (decidible en build): app multiplataforma (p. ej. Flutter o PWA+Capacitor) → un código para APK + web; generación PPTX a partir de la plantilla; PDF desde PPTX o render; hosting del enlace público con auth por contraseña sencilla + APK en storage. **OK de Jorge recibido.** Cursor cloud agent lo lanza el Jefe de gabinete; Arquitecto PRD no construye.


## Anexo D — Aprobación Jorge 2026-09-18 (v1.3)
- Sello PROBLEMA RESUELTO / pendiente: SÍ
- Títulos sección: INCIDENCIAS {DEPARTAMENTO}
- Varios de Calidad, mismo enlace + misma contraseña
- Foto impar: 1 foto en última hoja OK
- Portada: mes/año auto + texto editable
- Sesión editable tras exportar
- Enlaces con contraseña sencilla
- Sin límite de páginas
- **APROBADO: construir APK + web con Cursor**
