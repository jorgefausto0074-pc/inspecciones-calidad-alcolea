import JSZip from 'jszip';

export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const IMAGE_TYPES = { jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png' };

function xmlEscape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    // Caracteres de control no válidos en XML 1.0
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function imageSignature(bytes) {
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png';
  return null;
}

function coreXml(meta) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
    + 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
    + 'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    + `<dc:title>${xmlEscape(meta.title)}</dc:title>`
    + `<dc:subject>${xmlEscape(meta.subject)}</dc:subject>`
    + `<dc:creator>${xmlEscape(meta.author)}</dc:creator>`
    + `<cp:keywords>${xmlEscape(meta.keywords)}</cp:keywords>`
    + `<dc:description>${xmlEscape(meta.description)}</dc:description>`
    + `<cp:lastModifiedBy>${xmlEscape(meta.author)}</cp:lastModifiedBy>`
    + '<cp:revision>1</cp:revision>'
    + '<dc:language>es-ES</dc:language>'
    + `<cp:category>${xmlEscape(meta.category)}</cp:category>`
    + `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>`
    + `<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>`
    + '</cp:coreProperties>';
}

function appXml({ slideTitles, notes, fonts, themeName, company }) {
  const titles = [...fonts, themeName, ...slideTitles];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
    + 'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
    + '<TotalTime>0</TotalTime><Words>0</Words>'
    + '<Application>Microsoft Office PowerPoint</Application>'
    + '<PresentationFormat>Panorámica</PresentationFormat>'
    + `<Paragraphs>0</Paragraphs><Slides>${slideTitles.length}</Slides><Notes>${notes}</Notes>`
    + '<HiddenSlides>0</HiddenSlides><MMClips>0</MMClips><ScaleCrop>false</ScaleCrop>'
    + '<HeadingPairs><vt:vector size="6" baseType="variant">'
    + `<vt:variant><vt:lpstr>Fuentes usadas</vt:lpstr></vt:variant><vt:variant><vt:i4>${fonts.length}</vt:i4></vt:variant>`
    + '<vt:variant><vt:lpstr>Tema</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant>'
    + `<vt:variant><vt:lpstr>Títulos de diapositiva</vt:lpstr></vt:variant><vt:variant><vt:i4>${slideTitles.length}</vt:i4></vt:variant>`
    + '</vt:vector></HeadingPairs>'
    + `<TitlesOfParts><vt:vector size="${titles.length}" baseType="lpstr">`
    + titles.map((t) => `<vt:lpstr>${xmlEscape(t)}</vt:lpstr>`).join('')
    + '</vt:vector></TitlesOfParts>'
    + `<Company>${xmlEscape(company)}</Company>`
    + '<LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc>'
    + '<HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion>'
    + '</Properties>';
}

/** Orden recomendado OPC: [Content_Types].xml primero, luego relaciones y propiedades. */
function partRank(name) {
  if (name === '[Content_Types].xml') return 0;
  if (name === '_rels/.rels') return 1;
  if (name.startsWith('docProps/')) return 2;
  if (name === 'ppt/presentation.xml' || name === 'ppt/_rels/presentation.xml.rels') return 3;
  return 4;
}

/**
 * Deja el PPTX de pptxgenjs listo para PowerPoint de escritorio (Windows/Mac) y en español:
 *  - ZIP reconstruido sin entradas de carpeta, [Content_Types].xml en primer lugar.
 *  - [Content_Types].xml solo con los tipos realmente usados (image/jpeg estándar, sin image/jpg).
 *  - Sin patrón de notas ni páginas de notas (causa de «PowerPoint no pudo leer», ver v1.5.2).
 *  - Overrides sin parte eliminados; sldSz 12192000×6858000 (16:9 estándar).
 *  - Imágenes: firma real JPEG/PNG obligatoria (si no, error claro en lugar de un archivo ilegible).
 *  - Idioma es-ES en todos los textos; nombres de diapositivas, formas, tema y diseño en español.
 *  - docProps (core/app) en español y coherentes con el contenido.
 * @param {ArrayBuffer|Uint8Array} input
 * @param {{title:string, slideTitles:string[], author?:string, subject?:string}} meta
 */
export async function cleanPptxBlob(input, meta = {}) {
  const src = await JSZip.loadAsync(input);
  const files = new Map();
  for (const [name, entry] of Object.entries(src.files)) {
    if (entry.dir) continue;
    files.set(name, entry);
  }
  // 0) Sin notas: pptxgenjs 4.0.1 crea un patrón de notas que comparte theme1.xml con el patrón de
  //    diapositivas. Con <p:notesMasterIdLst> en su sitio de esquema, PowerPoint 365 no abre el archivo
  //    (0x80070570), y en el sitio original PowerPoint lo «repara». El informe no usa notas → se quitan.
  for (const name of [...files.keys()]) {
    if (/^ppt\/(notesSlides|notesMasters)\//.test(name)) files.delete(name);
  }

  const text = {};
  for (const name of files.keys()) {
    if (/\.(xml|rels)$/i.test(name)) text[name] = await files.get(name).async('string');
  }
  const binary = {};
  for (const name of files.keys()) {
    if (!(name in text)) binary[name] = await files.get(name).async('uint8array');
  }

  // 1) Imágenes: solo JPEG/PNG reales, con extensión coherente
  const usedExt = new Set();
  for (const [name, bytes] of Object.entries(binary)) {
    if (!name.startsWith('ppt/media/')) continue;
    const ext = name.split('.').pop().toLowerCase();
    const sig = imageSignature(bytes);
    if (!sig || (sig === 'png') !== (ext === 'png')) {
      throw new Error(`Imagen no compatible con PowerPoint en el informe (${name.split('/').pop()})`);
    }
    usedExt.add(ext);
  }

  // 2) [Content_Types].xml limpio
  const ctName = '[Content_Types].xml';
  const ctOld = text[ctName];
  const overrides = [...ctOld.matchAll(/<Override PartName="([^"]+)" ContentType="([^"]+)"\s*\/>/g)]
    .filter(([, part]) => files.has(part.replace(/^\//, '')))
    .map(([, part, type]) => `<Override PartName="${part}" ContentType="${type}"/>`);
  const defaults = [
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    ...[...usedExt].sort().map((e) => `<Default Extension="${e}" ContentType="${IMAGE_TYPES[e]}"/>`),
  ];
  text[ctName] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + defaults.join('') + overrides.join('') + '</Types>';

  // 3) presentation.xml y relaciones sin notas; tamaños estándar de PowerPoint
  const presName = 'ppt/presentation.xml';
  text[presName] = text[presName]
    .replace(/<p:notesMasterIdLst>[\s\S]*?<\/p:notesMasterIdLst>/g, '')
    .replace(/<p:sldSz cx="12191695" cy="6858000"\/>/, '<p:sldSz cx="12192000" cy="6858000"/>')
    .replace(/<p:notesSz [^>]*\/>/, '<p:notesSz cx="6858000" cy="9144000"/>');
  for (const name of Object.keys(text)) {
    if (!name.endsWith('.rels')) continue;
    text[name] = text[name].replace(/\s*<Relationship [^>]*Type="[^"]*\/(notesMaster|notesSlide)"[^>]*\/>/g, '');
  }

  // 4) Español: idioma de texto, nombres de diapositivas/formas/tema/diseño
  const themeName = 'Refresco 2026';
  const slideTitles = meta.slideTitles || [];
  for (const name of Object.keys(text)) {
    if (!/^ppt\/.*\.xml$/.test(name)) continue;
    let x = text[name];
    x = x.replace(/\blang="en-US"/g, 'lang="es-ES"').replace(/\baltLang="en-US"/g, 'altLang="es-ES"');
    const sm = name.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (sm) {
      const n = Number(sm[1]);
      x = x.replace(/<p:cSld name="[^"]*">/, `<p:cSld name="${xmlEscape(slideTitles[n - 1] || `Diapositiva ${n}`)}">`);
    }
    x = x.replace(/(<p:cNvPr id="\d+" name=")Text (\d+)"/g, (m, a, k) => `${a}Texto ${Number(k) + 1}"`)
      .replace(/(<p:cNvPr id="\d+" name=")Image (\d+)"/g, (m, a, k) => `${a}Imagen ${Number(k) + 1}"`)
      .replace(/(<p:cNvPr id="\d+" name=")Shape (\d+)"/g, (m, a, k) => `${a}Forma ${Number(k) + 1}"`)
      .replace(/ descr="preencoded\.(png|jpe?g)"/g, ' descr="Imagen"');
    if (name.startsWith('ppt/theme/')) x = x.replace(/<a:theme([^>]*) name="[^"]*"/, `<a:theme$1 name="${themeName}"`);
    if (name.startsWith('ppt/slideLayouts/')) x = x.replace(/<p:cSld name="DEFAULT"/, '<p:cSld name="En blanco Refresco"');
    text[name] = x;
  }

  // 5) Propiedades del documento en español
  const notes = 0;
  const nSlides = [...files.keys()].filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length;
  const titles = Array.from({ length: nSlides }, (_, i) => slideTitles[i] || `Diapositiva ${i + 1}`);
  text['docProps/core.xml'] = coreXml({
    title: meta.title || 'Informe de inspección de calidad',
    subject: meta.subject || 'Informe de inspección de incidencias de calidad',
    author: meta.author || 'Refresco Iberia · Calidad Planta Alcolea',
    keywords: 'inspección; calidad; incidencias; Refresco Iberia; Alcolea',
    description: 'Informe generado con la app Inspecciones Calidad Alcolea. Textos e imágenes editables.',
    category: 'Calidad',
  });
  text['docProps/app.xml'] = appXml({ slideTitles: titles, notes, fonts: ['Arial'], themeName, company: 'Refresco Iberia' });

  // 6) ZIP nuevo, sin carpetas, en orden OPC
  const out = new JSZip();
  const names = [...files.keys()].sort((a, b) => partRank(a) - partRank(b) || a.localeCompare(b));
  for (const name of names) {
    const data = name in text ? text[name] : binary[name];
    out.file(name, data, { createFolders: false, binary: !(name in text) });
  }
  const bytes = await out.generateAsync({
    type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: PPTX_MIME,
  });
  return new Blob([bytes], { type: PPTX_MIME });
}
