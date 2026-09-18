/**
 * Lista ↑↓ reorder + movePhoto / attemptMovePhoto.
 * Run: node scripts/test-lista-reorder.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const {
  movePhoto,
  attemptMovePhoto,
  photoMoveState,
  groupPhotosByDept,
  createEmptySession,
  MOVE_TOAST_OK,
  MOVE_TOAST_FIRST,
  MOVE_TOAST_LAST,
} = await import('../src/session.js');

function photo(id, code) {
  return {
    id,
    code,
    ubicacion: 'LOC',
    comentario: 'ACCION',
    status: 'pending',
    displayName: `${code}-${id}`,
    dataUrl: 'data:image/png;base64,xx',
    createdAt: new Date().toISOString(),
  };
}

function ids(session) {
  return session.photos.map((p) => p.id).join(',');
}

let session = createEmptySession();
session.photos = [
  photo('a1', 'J-'),
  photo('b1', 'EX'),
  photo('a2', 'J-'),
  photo('b2', 'EX'),
  photo('a3', 'J-'),
];

ok(photoMoveState(session.photos, 'a1').canUp === false, 'first-in-dept cannot move up');
ok(photoMoveState(session.photos, 'a1').canDown === true, 'first-in-dept can move down');
ok(photoMoveState(session.photos, 'a2').canUp && photoMoveState(session.photos, 'a2').canDown, 'middle can move both ways');
ok(photoMoveState(session.photos, 'a3').canDown === false, 'last-in-dept cannot move down');
ok(!photoMoveState(session.photos, 'b1').canUp && photoMoveState(session.photos, 'b1').canDown, 'EX first of two: down only');

const blockedFirst = attemptMovePhoto(session, 'a1', -1);
ok(!blockedFirst.moved && blockedFirst.message === MOVE_TOAST_FIRST, 'blocked up toast: primera');
ok(ids(blockedFirst.session) === 'a1,b1,a2,b2,a3', 'blocked up does not mutate order');

const blockedLast = attemptMovePhoto(session, 'a3', 1);
ok(!blockedLast.moved && blockedLast.message === MOVE_TOAST_LAST, 'blocked down toast: última');

const down = attemptMovePhoto(session, 'a2', 1);
ok(down.moved && down.message === MOVE_TOAST_OK, 'success toast: Orden actualizado');
session = down.session;
ok(ids(session) === 'a1,b1,a3,b2,a2', `rebuild middle-down (got ${ids(session)})`);
ok(session.photos[1].id === 'b1' && session.photos[3].id === 'b2', 'other-dept flat slots unchanged');

const grouped = groupPhotosByDept(session.photos, ['EX', 'J-']);
ok(grouped.find(([c]) => c === 'J-')[1].map((p) => p.id).join(',') === 'a1,a3,a2', 'Lista grouping follows dept subsequence');
ok(grouped.find(([c]) => c === 'EX')[1].map((p) => p.id).join(',') === 'b1,b2', 'other dept grouping unchanged');

session = movePhoto(session, 'a2', -1);
ok(ids(session) === 'a1,b1,a2,b2,a3', 'move last-in-dept up restores');

session = movePhoto(session, 'a1', 1);
ok(ids(session) === 'a2,b1,a1,b2,a3', 'move first-in-dept down');
ok(groupPhotosByDept(session.photos, ['J-'])[0][1].map((p) => p.id).join(',') === 'a2,a1,a3', 'grouped order after first-down');

// Preview-equivalent: two-dept swap still matches prior contract
session.photos = [photo('j1', 'J-'), photo('ex1', 'EX'), photo('j2', 'J-')];
session = movePhoto(session, 'j2', -1);
ok(ids(session) === 'j2,ex1,j1', 'Preview-compatible interleaved up');

const mainSrc = readFileSync(path.join(root, 'src/main.js'), 'utf8');
ok(mainSrc.includes('attemptMovePhoto'), 'Lista uses attemptMovePhoto');
ok(mainSrc.includes('bindTap'), 'Lista uses bindTap for click+touchend');
ok(mainSrc.includes('stopPropagation'), 'Lista/Preview stopPropagation');
ok(mainSrc.includes("addEventListener('touchend'"), 'touchend listener for Android WebView');
ok(mainSrc.includes('lista-move-hit'), 'Lista ↑↓ have enlarged hit wrappers');
ok(mainSrc.includes('${st.canUp ? \'\' : \'disabled\'}'), 'Lista ↑ disabled when cannot move up');
ok(mainSrc.includes('${st.canDown ? \'\' : \'disabled\'}'), 'Lista ↓ disabled when cannot move down');
ok(mainSrc.includes('data-photo-move'), 'Preview ↑↓ still present');
ok(/data-photo-move[\s\S]*movePhoto\(session/.test(mainSrc), 'Preview still calls movePhoto');
ok(mainSrc.includes('toast(result.message, !result.moved)'), 'Lista toasts success and blocked');

const css = readFileSync(path.join(root, 'src/style.css'), 'utf8');
ok(css.includes('touch-action: manipulation'), 'touch-action manipulation on Lista controls');
ok(css.includes('.lista-move-hit'), 'CSS hit area for Lista ↑↓');
ok(css.includes('pointer-events: none'), 'inner Lista button defers taps to hit wrapper');
ok(css.includes('min-height: var(--touch)'), 'touch-sized hit area');

ok(MOVE_TOAST_OK === 'Orden actualizado', 'success copy');
ok(MOVE_TOAST_FIRST === 'Ya es la primera de este departamento', 'first copy');
ok(MOVE_TOAST_LAST === 'Ya es la última de este departamento', 'last copy');

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
ok(pkg.version === '1.3.1', 'app package version 1.3.1');
const wrap = JSON.parse(readFileSync(path.join(root, '../android-wrap/package.json'), 'utf8'));
ok(wrap.version === '1.3.1', 'android-wrap package version 1.3.1');
const gradle = readFileSync(path.join(root, '../android-wrap/android/app/build.gradle'), 'utf8');
ok(gradle.includes('versionCode 4'), 'versionCode 4');
ok(gradle.includes('versionName "1.3.1"'), 'versionName 1.3.1');

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll lista reorder checks passed.');
