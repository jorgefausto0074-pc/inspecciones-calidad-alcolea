import JSZip from 'jszip';

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/**
 * Corrige dos defectos conocidos de pptxgenjs para que el PPTX pase el Open XML SDK
 * y pptx_check.py sin errores (PPTX_ESTANDAR.md):
 *  1. [Content_Types].xml declara slideMaster2..N que no existen → se quitan los Override sin parte.
 *  2. presentation.xml pone <p:notesMasterIdLst> después de <p:sldIdLst> → se coloca tras <p:sldMasterIdLst>.
 * No cambia contenido, diapositivas ni imágenes.
 */
export async function cleanPptxBlob(input) {
  const zip = await JSZip.loadAsync(input);

  const ctPath = '[Content_Types].xml';
  let ct = await zip.file(ctPath).async('string');
  ct = ct.replace(/<Override PartName="([^"]+)"[^>]*\/>/g, (m, part) => (zip.file(part.replace(/^\//, '')) ? m : ''));
  zip.file(ctPath, ct);

  const presPath = 'ppt/presentation.xml';
  let pres = await zip.file(presPath).async('string');
  const nm = pres.match(/<p:notesMasterIdLst>[\s\S]*?<\/p:notesMasterIdLst>/);
  if (nm && pres.indexOf(nm[0]) > pres.indexOf('</p:sldMasterIdLst>')) {
    pres = pres.replace(nm[0], '');
    pres = pres.replace('</p:sldMasterIdLst>', `</p:sldMasterIdLst>${nm[0]}`);
    zip.file(presPath, pres);
  }

  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: PPTX_MIME });
  return new Blob([bytes], { type: PPTX_MIME });
}
