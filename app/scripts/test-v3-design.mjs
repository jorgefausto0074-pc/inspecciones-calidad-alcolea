/**
 * v3 design + movePhoto checks.
 * Run: node scripts/test-v3-design.mjs
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

let failed = 0;
function ok(cond, msg) {
  if (cond) console.log('PASS:', msg);
  else {
    console.error('FAIL:', msg);
    failed += 1;
  }
}

const { movePhoto, photoMoveState, groupPhotosByDept, createEmptySession } = await import('../src/session.js');
const { buildPreviewSlides } = await import('../src/slides.js');
const { defaultCover } = await import('../src/config.js');
const { COPY, ASSETS, COLORS } = await import('../src/brand.js');
const { exportPptx } = await import('../src/export-pptx.js');
const { exportPdf } = await import('../src/export-pdf.js');

function makePng(w, h, bg = [3, 166, 75]) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 3;
      raw[i] = bg[0]; raw[i + 1] = bg[1]; raw[i + 2] = bg[2];
    }
  }
  const compressed = zlib.deflateSync(raw);
  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const tinyPng = `data:image/png;base64,${makePng(32, 24).toString('base64')}`;

function photo(id, code, extra = {}) {
  return {
    id,
    code,
    ubicacion: extra.ubicacion || 'LOC',
    comentario: extra.comentario || 'ACCION',
    status: extra.status || 'pending',
    displayName: `${code}-LOC`,
    dataUrl: tinyPng,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

// --- Cover default has no year ---
const cover = defaultCover(new Date('2026-09-18'));
ok(cover.title === 'INSPECCION INCIDENCIAS CALIDAD', 'cover title has no year');
ok(!/\d{4}/.test(cover.title), 'cover title digits-year absent');
ok(cover.subtitle.includes('ALCOLEA'), 'cover subtitle plant name');
ok(/INSPECCIÓN .+ 2026/.test(cover.slideTitle), 'slideTitle still has month/year');

// --- movePhoto across interleaved departments ---
let session = createEmptySession();
session.photos = [
  photo('j1', 'J-', { ubicacion: 'FC-43', comentario: 'A' }),
  photo('ex1', 'EX', { ubicacion: 'ZONA', comentario: 'B' }),
  photo('j2', 'J-', { ubicacion: 'EB-06', comentario: 'C' }),
];
ok(photoMoveState(session.photos, 'j2').canUp, 'j2 can move up within JARABE');
ok(!photoMoveState(session.photos, 'j1').canUp, 'j1 cannot move up');
ok(!photoMoveState(session.photos, 'ex1').canUp && !photoMoveState(session.photos, 'ex1').canDown, 'single EX photo cannot move');

const before = session.photos.map((p) => p.id).join(',');
ok(before === 'j1,ex1,j2', 'interleaved capture order');

session = movePhoto(session, 'j2', -1);
const after = session.photos.map((p) => p.id).join(',');
ok(after === 'j2,ex1,j1', `movePhoto swaps within dept (got ${after})`);

const grouped = groupPhotosByDept(session.photos, ['EX', 'J-']);
const jarabeIds = grouped.find(([c]) => c === 'J-')[1].map((p) => p.id).join(',');
ok(jarabeIds === 'j2,j1', `grouped JARABE order follows reorder (got ${jarabeIds})`);

session = movePhoto(session, 'j2', -1);
ok(session.photos.map((p) => p.id).join(',') === 'j2,ex1,j1', 'moving first-in-dept is a no-op');

session = movePhoto(session, 'j1', 1);
ok(session.photos.map((p) => p.id).join(',') === 'j2,ex1,j1', 'moving last-in-dept down is a no-op');

session = movePhoto(session, 'j1', -1);
ok(session.photos.map((p) => p.id).join(',') === 'j1,ex1,j2', 'move j1 up restores original dept order');

// --- Slide model ---
session.coverTitle = 'INSPECCION INCIDENCIAS CALIDAD';
session.coverSubtitle = 'REFRESCO IBERIA PLANTA ALCOLEA';
session.photos = [
  photo('j1', 'J-', { ubicacion: 'CALLE FC-43', comentario: 'REPARAR ESTANTERIA JUNTO CALLE FC-43', status: 'pending' }),
  photo('j2', 'J-', { ubicacion: 'EB-06', comentario: 'REPARAR ESTANTERIA EB-06', status: 'resolved' }),
];
const slides = buildPreviewSlides(session);
ok(slides[0].type === 'cover', 'first slide is cover');
ok(slides[0].title === 'INSPECCION INCIDENCIAS CALIDAD', 'cover title in model');
ok(slides[1].type === 'section' && slides[1].deptName === 'JARABE', 'section has large dept name');
ok(slides[1].title === 'INCIDENCIAS JARABE', 'section title');
ok(!JSON.stringify(slides).includes('agrup'), 'no auto-grouping legend text');
ok(slides[2].type === 'content' && slides[2].photos.length === 2, 'ficha has 2 photos');
ok(slides[2].fichaIndex === 1 && slides[2].fichaTotal === 1, 'ficha numbering');
ok(slides[2].deptName === 'JARABE', 'ficha shows department name');

ok(COPY.footerMeta === 'Inspecciones calidad · Refresco Iberia · Planta Alcolea', 'footer meta exact');
ok(!COPY.footerMeta.match(/\d{4}/), 'footer has no date/year');
ok(ASSETS.logo.includes('logo-refresco.png'), 'clean logo path');
ok(COLORS.green === '#03A64B' && COLORS.orange === '#D9871A', 'brand colors');

const srcMain = readFileSync(path.join(root, 'src/main.js'), 'utf8');
ok(srcMain.includes('data-photo-move'), 'Preview has ↑↓ controls');
ok(srcMain.includes('CalidadAlcolea2026') === false, 'password stays in config not hardcoded in preview');
ok(readFileSync(path.join(root, 'src/config.js'), 'utf8').includes("password: 'CalidadAlcolea2026'"), 'password gate unchanged');

ok(existsSync(path.join(root, 'public/assets/logo-refresco.png')), 'logo-refresco in public');
ok(existsSync(path.join(root, 'public/assets/cenefa-ondulada.png')), 'cenefa in public');
ok(existsSync(path.join(root, 'public/assets/logo-mascotas.png')), 'mascots in public');

const css = readFileSync(path.join(root, 'src/style.css'), 'utf8');
ok(css.includes('#03A64B') && css.includes('#D9871A'), 'CSS uses v3 palette');
ok(!/side.?stripe/i.test(css), 'no side-stripe wording');
ok(css.includes('object-fit: contain'), 'logo not stretched');

// --- Export PPTX/PDF sample ---
const pptx = await exportPptx(session);
ok(pptx.blob && pptx.blob.size > 20000, `pptx blob size ${pptx.blob?.size}`);
ok(pptx.fileName.endsWith('.pptx'), 'pptx filename');

const pdf = await exportPdf(session);
ok(pdf.blob && pdf.blob.size > 5000, `pdf blob size ${pdf.blob?.size}`);
ok(pdf.fileName.endsWith('.pdf'), 'pdf filename');

const tmp = path.join(os.tmpdir(), `v3-export-${Date.now()}`);
mkdirSync(tmp, { recursive: true });
const pptxFile = path.join(tmp, 'out.pptx');
const pdfFile = path.join(tmp, 'out.pdf');
writeFileSync(pptxFile, Buffer.from(await pptx.blob.arrayBuffer()));
writeFileSync(pdfFile, Buffer.from(await pdf.blob.arrayBuffer()));

const xml = execFileSync('python3', ['-c', `
import zipfile, sys
z = zipfile.ZipFile(sys.argv[1])
parts = []
for name in z.namelist():
    if name.endswith('.xml'):
        parts.append(z.read(name).decode('utf-8', 'ignore'))
sys.stdout.write('\\n'.join(parts))
`, pptxFile], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
ok(xml.includes('INSPECCION INCIDENCIAS CALIDAD'), 'pptx has cover title');
ok(!/INSPECCION INCIDENCIAS CALIDAD 20\d\d/.test(xml), 'pptx cover title has no year');
ok(xml.includes(COPY.footerMeta) || xml.includes('Inspecciones calidad'), 'pptx has footer meta');
ok(xml.includes('Refresco'), 'pptx has Refresco wordmark');
ok(xml.includes('DEPARTAMENTO'), 'pptx section kicker');
ok(xml.includes('JARABE'), 'pptx department name');
ok(xml.includes('INCIDENCIAS JARABE'), 'pptx section title');
ok(xml.includes('FICHA 1 DE 1') || xml.includes('FICHA'), 'pptx ficha label');
ok(!/informe fotogr/i.test(xml), 'no 2-fotos cover pill');
ok(!/agrupad/i.test(xml), 'no auto-grouping legend');
ok(xml.includes('PENDIENTE') && xml.includes('RESUELTO'), 'status stamps in pptx');

const pdfTxt = Buffer.from(readFileSync(pdfFile)).toString('latin1');
ok(pdfTxt.includes('%PDF'), 'pdf header');
ok(pdf.blob.size > 8000, 'pdf not empty');

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll v3 design checks passed.');
