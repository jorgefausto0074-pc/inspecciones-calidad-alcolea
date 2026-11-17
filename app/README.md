# App web — Inspecciones Calidad Alcolea

PWA (Vite) de captura de incidencias y exportación PPTX/PDF.

**Sitio publicado:** https://jorgefausto0074-pc.github.io/inspecciones-calidad-alcolea/  
El acceso compara un hash PBKDF2-SHA256 en `src/config.js` (`auth`). La contraseña no se guarda en el repositorio.  
Documentación completa: [README raíz](../README.md).

```bash
npm ci
npm run build      # genera dist/ (GitHub Pages)
npm run preview    # http://127.0.0.1:8787/
```

Para cambiar el acceso, sustituya `auth.salt` y `auth.hash` en `src/config.js` (PBKDF2-SHA256, 600000 iteraciones, 32 bytes). No vuelva a dejar la contraseña en claro.
