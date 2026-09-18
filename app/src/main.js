import './style.css';
import { APP_CONFIG, DEPTS, DEPT_ORDER, deptByCode, buildDisplayName } from './config.js';
import {
  loadSession, saveSession, clearSession, createEmptySession,
  isAuthenticated, setAuthenticated,
  addPhoto, updatePhoto, removePhoto, movePhoto, groupPhotosByDept,
} from './session.js';
import { exportPptx } from './export-pptx.js';
import { exportPdf, buildPreviewSlides } from './export-pdf.js';
import { shareOrDownload, triggerDownload } from './share.js';

let session = loadSession();
let tab = 'captura';
let selectedDept = 'EX';
let previewIdx = 0;
let stream = null;
let draftDataUrl = null;
let draftNameOverride = '';

const app = document.getElementById('app');

function toast(msg, err = false) {
  const el = document.createElement('div');
  el.className = `toast${err ? ' err' : ''}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

function formMeta() {
  return {
    ubicacion: (document.getElementById('ubicacion')?.value || '').trim(),
    comentario: (document.getElementById('comentario')?.value || '').trim(),
    status: document.getElementById('status')?.value || 'pending',
    code: selectedDept,
  };
}

function suggestDraftName() {
  const ubicacion = document.getElementById('ubicacion')?.value?.trim() || '';
  return buildDisplayName(selectedDept, ubicacion || 'SIN-UBICACION');
}

function syncDraftNameField(force = false) {
  const inp = document.getElementById('draft-name');
  if (!inp) return;
  if (force || !draftNameOverride) {
    const suggested = suggestDraftName();
    if (!draftNameOverride) inp.value = suggested;
  }
}

function renderGate() {
  app.innerHTML = `
    <div class="gate">
      <div class="card">
        <img class="logo" src="./assets/logo-diamante.png" alt="Logo Calidad" />
        <h1>Inspecciones Calidad</h1>
        <p>Refresco Iberia · Planta Alcolea</p>
        <form id="login-form">
          <label for="pwd">Contraseña</label>
          <input id="pwd" type="password" autocomplete="current-password" placeholder="••••••••" required />
          <button type="submit" style="width:100%">Entrar</button>
        </form>
        <p class="hint">Acceso compartido del dpto. de Calidad. La contraseña se define en la configuración de la app.</p>
      </div>
    </div>`;
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = document.getElementById('pwd').value;
    if (v === APP_CONFIG.password) {
      setAuthenticated(true);
      render();
    } else {
      toast('Contraseña incorrecta', true);
    }
  });
}

function toolbar() {
  return `
    <div class="header">
      <div class="brand">
        <img src="./assets/logo-diamante.png" alt="" />
        <div>
          <h1>Inspecciones Calidad · Alcolea</h1>
          <div style="opacity:.85;font-size:.85rem">Sesión = 1 informe · editable tras exportar</div>
        </div>
      </div>
      <div class="row" style="flex:0">
        <button type="button" class="ghost" id="btn-logout">Salir</button>
      </div>
    </div>
    <div class="tabs">
      <button type="button" data-tab="captura" class="${tab==='captura'?'active':''}">📷 Captura</button>
      <button type="button" data-tab="lista" class="${tab==='lista'?'active':''}">📋 Lista (${session.photos.length})</button>
      <button type="button" data-tab="portada" class="${tab==='portada'?'active':''}">🖋 Portada</button>
      <button type="button" data-tab="preview" class="${tab==='preview'?'active':''}">👁 Preview</button>
      <button type="button" data-tab="export" class="${tab==='export'?'active':''}">⬇ Exportar</button>
    </div>`;
}

function renderCaptura() {
  const nameVal = draftNameOverride || (draftDataUrl ? suggestDraftName() : '');
  return `
    <div class="grid-2">
      <div class="card">
        <h2 style="margin-top:0">Nueva incidencia</h2>
        <div class="field">
          <label>Departamento</label>
          <div class="dept-chips" id="dept-chips">
            ${DEPTS.map((d) => `<button type="button" data-code="${d.code}" class="${selectedDept===d.code?'selected':''}" title="${d.name}">${d.code}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label for="ubicacion">Ubicación</label>
          <input id="ubicacion" placeholder="Ej. CALLE FC-43 / EB-06 / L6" />
        </div>
        <div class="field">
          <label for="comentario">Comentario / acción</label>
          <textarea id="comentario" rows="3" placeholder="Ej. REPARAR ESTANTERIA… / nº OT"></textarea>
        </div>
        <div class="field">
          <label for="status">Estado</label>
          <select id="status">
            <option value="pending">Pendiente</option>
            <option value="resolved">Problema resuelto</option>
          </select>
        </div>
        <p style="font-size:.85rem;color:#555;margin:.4rem 0 .6rem">Origen de la foto (elija uno):</p>
        <div class="row source-btns">
          <button type="button" id="btn-cam">📷 Cámara</button>
          <label class="pick" for="gallery-input">🖼 Galería
            <input type="file" id="gallery-input" accept="image/*" multiple class="hidden" />
          </label>
          <label class="pick file-pick" for="file-input">📁 Archivo / carpeta PC
            <input type="file" id="file-input" accept="image/*" multiple class="hidden" />
          </label>
        </div>
        <p class="hint-sm" style="font-size:.8rem;color:#666;margin-top:.5rem">
          Cámara = live / sensor trasero. Galería = álbumes del móvil. Archivo = explorador del PC (sin forzar cámara).
        </p>
      </div>
      <div class="card">
        <div class="camera-box" id="camera-box">
          <video id="video" class="hidden" playsinline autoplay muted></video>
          <img id="preview-shot" class="${draftDataUrl?'':'hidden'}" alt="Vista previa" src="${draftDataUrl||''}" />
          <span id="cam-placeholder" class="${draftDataUrl?'hidden':''}">Sin foto — Cámara / Galería / Archivo</span>
        </div>
        <div class="field" style="margin-top:.75rem">
          <label for="draft-name">Nombre (opcional)</label>
          <input id="draft-name" placeholder="Auto: CODIGO-ubicacion-timestamp" value="${escapeAttr(nameVal)}" />
        </div>
        <div class="row" style="margin-top:.5rem">
          <button type="button" id="btn-shot" class="secondary" disabled>Capturar frame</button>
          <button type="button" id="btn-add" ${draftDataUrl?'':'disabled'}>Añadir al informe</button>
        </div>
      </div>
    </div>`;
}

function renderLista() {
  const groups = groupPhotosByDept(session.photos, DEPT_ORDER);
  if (!groups.length) {
    return `<div class="card"><p>No hay fotos en esta sesión. Vaya a <strong>Captura</strong> para añadir incidencias.</p></div>`;
  }
  return `<div class="card"><div class="photo-list">${groups.map(([code, photos]) => {
    const dept = deptByCode(code);
    return `<div class="dept-group-title">${dept.section}</div>` + photos.map((p) => `
      <div class="photo-item" data-id="${p.id}">
        <img src="${p.dataUrl}" alt="" />
        <div>
          <div><strong>${p.code}</strong> · <span class="badge ${p.status}">${p.status==='resolved'?'RESUELTO':'PENDIENTE'}</span></div>
          <div class="meta">${p.displayName}</div>
          <div class="field"><label>Ubicación</label><input data-f="ubicacion" value="${escapeAttr(p.ubicacion)}" /></div>
          <div class="field"><label>Comentario</label><input data-f="comentario" value="${escapeAttr(p.comentario)}" /></div>
          <div class="field"><label>Depto.</label>
            <select data-f="code">${DEPTS.map((d)=>`<option value="${d.code}" ${d.code===p.code?'selected':''}>${d.code} — ${d.name}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Estado</label>
            <select data-f="status">
              <option value="pending" ${p.status==='pending'?'selected':''}>Pendiente</option>
              <option value="resolved" ${p.status==='resolved'?'selected':''}>Problema resuelto</option>
            </select>
          </div>
          <div class="row">
            <button type="button" class="secondary" data-act="up">↑</button>
            <button type="button" class="secondary" data-act="down">↓</button>
            <button type="button" class="danger" data-act="del">Borrar</button>
          </div>
        </div>
      </div>`).join('');
  }).join('')}</div></div>`;
}

function escapeAttr(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

function renderPortada() {
  return `
    <div class="card">
      <h2 style="margin-top:0">Portada y títulos (editables)</h2>
      <p>Los valores se rellenan con mes/año de la sesión; puede reescribirlos antes de exportar.</p>
      <div class="field"><label for="coverTitle">Título de portada</label>
        <input id="coverTitle" value="${escapeAttr(session.coverTitle)}" /></div>
      <div class="field"><label for="coverSubtitle">Subtítulo</label>
        <input id="coverSubtitle" value="${escapeAttr(session.coverSubtitle)}" /></div>
      <div class="field"><label for="slideTitle">Título de hojas de contenido</label>
        <input id="slideTitle" value="${escapeAttr(session.slideTitle)}" /></div>
      <button type="button" id="btn-save-cover">Guardar portada</button>
    </div>`;
}

function renderPreview() {
  const slides = buildPreviewSlides(session);
  if (!slides.length) return `<div class="card">Sin contenido.</div>`;
  if (previewIdx >= slides.length) previewIdx = slides.length - 1;
  if (previewIdx < 0) previewIdx = 0;
  const s = slides[previewIdx];
  let inner = '';
  if (s.type === 'cover') {
    inner = `<div class="cover-slide"><div><h2>${escapeAttr(s.title)}</h2><p>${escapeAttr(s.subtitle)}</p></div>
      <img class="logo" src="./assets/logo-diamante.png" alt="" /></div>`;
  } else if (s.type === 'section') {
    inner = `<div class="section-slide">${escapeAttr(s.title)}</div>`;
  } else {
    const single = s.photos.length === 1 ? ' single' : '';
    inner = `<div class="slide-title">${escapeAttr(s.slideTitle)}</div>
      <div class="pair">${s.photos.map((p) => {
        const cap = [p.comentario, p.ubicacion].filter(Boolean).join(' — ').toUpperCase();
        return `<div class="slot${single}">
          <img class="photo" src="${p.dataUrl}" alt="" />
          ${p.status==='resolved' ? '<img class="stamp" src="./assets/sello-resuelto.png" alt="RESUELTO" />' : '<span class="pend-tag">PENDIENTE</span>'}
          <div class="cap">${escapeAttr(cap)}</div>
        </div>`;
      }).join('')}</div>`;
  }
  return `
    <div class="card preview-stage">
      <div class="slide-16x9">${inner}</div>
      <div class="preview-nav">
        <button type="button" class="secondary" id="prev-slide">← Anterior</button>
        <span class="status">Diapositiva ${previewIdx + 1} / ${slides.length}</span>
        <button type="button" class="secondary" id="next-slide">Siguiente →</button>
      </div>
    </div>`;
}

function renderExport() {
  const disabled = session.photos.length ? '' : 'disabled';
  return `
    <div class="card export-actions">
      <h2 style="margin-top:0">Exportar informe</h2>
      <p>Formato 16:9, agrupado por departamento, 2 fotos por hoja (1 si es impar). Sin límite de páginas.</p>
      <p><strong>Fotos en sesión:</strong> ${session.photos.length}
        ${session.lastExportAt ? ` · Última exportación: ${new Date(session.lastExportAt).toLocaleString('es-ES')}` : ''}</p>
      <p>En el móvil/APK, <strong>Compartir / guardar</strong> abre el menú del sistema (WhatsApp, Drive, Archivos, correo…).</p>
      <div class="row">
        <button type="button" id="btn-pptx" ${disabled}>Compartir / guardar PPTX</button>
        <button type="button" id="btn-pdf" class="secondary" ${disabled}>Compartir / guardar PDF</button>
      </div>
      <div class="row" style="margin-top:.5rem">
        <button type="button" id="btn-pptx-dl" class="ghost" style="color:#333;border-color:var(--border);background:#eee" ${disabled}>Solo descargar PPTX</button>
        <button type="button" id="btn-pdf-dl" class="ghost" style="color:#333;border-color:var(--border);background:#eee" ${disabled}>Solo descargar PDF</button>
      </div>
      <p class="hint-sm">Si el compartir no está disponible, se guarda en Descargas y puede moverlo donde quiera.</p>
      <hr style="margin:1.2rem 0;border:none;border-top:1px solid var(--border)" />
      <p>Tras exportar puede seguir editando y volver a exportar. Para empezar un informe nuevo:</p>
      <button type="button" class="danger" id="btn-reset">Descartar sesión (pedir confirmación)</button>
    </div>`;
}

function render() {
  if (!isAuthenticated()) {
    renderGate();
    return;
  }
  let body = '';
  if (tab === 'captura') body = renderCaptura();
  else if (tab === 'lista') body = renderLista();
  else if (tab === 'portada') body = renderPortada();
  else if (tab === 'preview') body = renderPreview();
  else body = renderExport();

  app.innerHTML = `<div class="app-shell">${toolbar()}${body}
    <footer class="note">PWA local · Refresco Iberia Alcolea · v1.1 (PRD v1.3 + UX share/sello/fuentes)</footer></div>`;
  bind();
}

function bind() {
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await stopCamera();
    setAuthenticated(false);
    render();
  });
  document.querySelectorAll('.tabs [data-tab]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await stopCamera();
      tab = btn.dataset.tab;
      render();
    });
  });

  if (tab === 'captura') bindCaptura();
  if (tab === 'lista') bindLista();
  if (tab === 'portada') bindPortada();
  if (tab === 'preview') bindPreview();
  if (tab === 'export') bindExport();
}

function showDraftPreview(dataUrl) {
  draftDataUrl = dataUrl;
  const img = document.getElementById('preview-shot');
  const video = document.getElementById('video');
  if (img) {
    img.src = draftDataUrl;
    img.classList.remove('hidden');
  }
  video?.classList.add('hidden');
  document.getElementById('cam-placeholder')?.classList.add('hidden');
  const addBtn = document.getElementById('btn-add');
  if (addBtn) addBtn.disabled = false;
  syncDraftNameField(true);
}

async function addManyFromFiles(fileList) {
  const files = [...(fileList || [])].filter((f) => f.type.startsWith('image/'));
  if (!files.length) {
    toast('No se seleccionaron imágenes', true);
    return;
  }
  const meta = formMeta();
  if (!meta.ubicacion) {
    toast('Indique ubicación antes de añadir fotos', true);
    return;
  }
  if (files.length === 1) {
    await stopCamera();
    draftDataUrl = await fileToDataUrl(files[0]);
    draftNameOverride = '';
    showDraftPreview(draftDataUrl);
    toast('Foto lista — revise nombre y pulse Añadir');
    return;
  }
  // Multi: reuse form fields, add all sequentially
  await stopCamera();
  let n = 0;
  for (const f of files) {
    const dataUrl = await fileToDataUrl(f);
    session = addPhoto(session, {
      dataUrl,
      code: meta.code,
      ubicacion: meta.ubicacion,
      comentario: meta.comentario,
      status: meta.status,
    });
    n += 1;
  }
  draftDataUrl = null;
  draftNameOverride = '';
  toast(`${n} fotos añadidas`);
  tab = 'lista';
  render();
}

function bindCaptura() {
  document.querySelectorAll('#dept-chips [data-code]').forEach((b) => {
    b.addEventListener('click', () => {
      selectedDept = b.dataset.code;
      document.querySelectorAll('#dept-chips button').forEach((x) => x.classList.toggle('selected', x.dataset.code === selectedDept));
      if (!draftNameOverride) syncDraftNameField(true);
    });
  });

  document.getElementById('ubicacion')?.addEventListener('input', () => {
    if (!draftNameOverride) syncDraftNameField(true);
  });
  document.getElementById('draft-name')?.addEventListener('input', (e) => {
    draftNameOverride = e.target.value.trim();
  });

  const video = document.getElementById('video');
  const shotBtn = document.getElementById('btn-shot');

  document.getElementById('btn-cam')?.addEventListener('click', async () => {
    // Prefer getUserMedia; fallback: camera-only file input with capture
    try {
      await stopCamera();
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      video.srcObject = stream;
      video.classList.remove('hidden');
      document.getElementById('preview-shot')?.classList.add('hidden');
      document.getElementById('cam-placeholder')?.classList.add('hidden');
      if (shotBtn) shotBtn.disabled = false;
      toast('Cámara lista — pulse Capturar frame');
    } catch (err) {
      console.warn(err);
      // Fallback: temporary input with capture=environment (only when user taps Cámara)
      const camInput = document.createElement('input');
      camInput.type = 'file';
      camInput.accept = 'image/*';
      camInput.setAttribute('capture', 'environment');
      camInput.className = 'hidden';
      document.body.appendChild(camInput);
      camInput.addEventListener('change', async () => {
        const f = camInput.files?.[0];
        camInput.remove();
        if (!f) return;
        draftNameOverride = '';
        showDraftPreview(await fileToDataUrl(f));
        toast('Foto de cámara lista');
      }, { once: true });
      camInput.click();
    }
  });

  shotBtn?.addEventListener('click', () => {
    if (!stream) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0);
    draftNameOverride = '';
    showDraftPreview(canvas.toDataURL('image/jpeg', 0.85));
    toast('Frame capturado');
  });

  // Galería — NO capture attribute
  document.getElementById('gallery-input')?.addEventListener('change', async (e) => {
    await addManyFromFiles(e.target.files);
    e.target.value = '';
  });
  // Archivo / carpeta PC — NO capture attribute
  document.getElementById('file-input')?.addEventListener('change', async (e) => {
    await addManyFromFiles(e.target.files);
    e.target.value = '';
  });

  document.getElementById('btn-add')?.addEventListener('click', async () => {
    if (!draftDataUrl) return;
    const meta = formMeta();
    if (!meta.ubicacion) { toast('Indique ubicación', true); return; }
    const customName = (document.getElementById('draft-name')?.value || '').trim();
    session = addPhoto(session, {
      dataUrl: draftDataUrl,
      code: meta.code,
      ubicacion: meta.ubicacion,
      comentario: meta.comentario,
      status: meta.status,
      displayName: customName || undefined,
    });
    draftDataUrl = null;
    draftNameOverride = '';
    await stopCamera();
    toast('Foto añadida al informe');
    tab = 'lista';
    render();
  });
}

function bindLista() {
  document.querySelectorAll('.photo-item').forEach((item) => {
    const id = item.dataset.id;
    item.querySelectorAll('[data-f]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const patch = { [inp.dataset.f]: inp.value };
        session = updatePhoto(session, id, patch);
        toast('Actualizado');
        if (inp.dataset.f === 'code' || inp.dataset.f === 'status') render();
      });
    });
    item.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'del') {
          if (!confirm('¿Borrar esta foto del informe?')) return;
          session = removePhoto(session, id);
          render();
        } else if (act === 'up') {
          session = movePhoto(session, id, -1);
          render();
        } else if (act === 'down') {
          session = movePhoto(session, id, 1);
          render();
        }
      });
    });
  });
}

function bindPortada() {
  document.getElementById('btn-save-cover')?.addEventListener('click', () => {
    session.coverTitle = document.getElementById('coverTitle').value.trim();
    session.coverSubtitle = document.getElementById('coverSubtitle').value.trim();
    session.slideTitle = document.getElementById('slideTitle').value.trim();
    session = saveSession(session);
    toast('Portada guardada');
  });
}

function bindPreview() {
  const slides = buildPreviewSlides(session);
  document.getElementById('prev-slide')?.addEventListener('click', () => {
    previewIdx = Math.max(0, previewIdx - 1);
    render();
  });
  document.getElementById('next-slide')?.addEventListener('click', () => {
    previewIdx = Math.min(slides.length - 1, previewIdx + 1);
    render();
  });
}

async function doExport(kind, mode) {
  try {
    toast(kind === 'pptx' ? 'Generando PPTX…' : 'Generando PDF…');
    const result = kind === 'pptx' ? await exportPptx(session) : await exportPdf(session);
    const mime = kind === 'pptx'
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : 'application/pdf';
    if (mode === 'download') {
      triggerDownload(result.blob, result.fileName);
      toast(`${kind.toUpperCase()} en Descargas`);
    } else {
      await shareOrDownload(result.blob, result.fileName, mime, { toast });
    }
    session.lastExportAt = new Date().toISOString();
    session = saveSession(session);
  } catch (e) {
    console.error(e);
    toast(`Error al exportar ${kind.toUpperCase()}`, true);
  }
}

function bindExport() {
  document.getElementById('btn-pptx')?.addEventListener('click', () => doExport('pptx', 'share'));
  document.getElementById('btn-pdf')?.addEventListener('click', () => doExport('pdf', 'share'));
  document.getElementById('btn-pptx-dl')?.addEventListener('click', () => doExport('pptx', 'download'));
  document.getElementById('btn-pdf-dl')?.addEventListener('click', () => doExport('pdf', 'download'));
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (!confirm('¿Descartar TODA la sesión actual? Esta acción no se puede deshacer.')) return;
    if (!confirm('Confirme de nuevo: se borrarán todas las fotos de este informe.')) return;
    session = clearSession();
    draftDataUrl = null;
    draftNameOverride = '';
    previewIdx = 0;
    toast('Sesión descartada');
    tab = 'captura';
    render();
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

render();
