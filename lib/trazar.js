// ✏️ Convierte un dibujo de líneas (imagen blanco y negro, estilo libro de colorear) en zonas que se pintan con un toque.
// Cada zona blanca cerrada se vuelve un "path" (con sus huecos), y las líneas negras quedan como fondo negro entre zonas.
// Sin librerías: ffmpeg lee la imagen en escala de grises; aquí se separan las zonas y se sacan sus contornos (marching squares).
const fs = require('fs'), path = require('path'), os = require('os');
const { ff, uid } = require('./util');

async function grises(file, N) {
  const raw = path.join(os.tmpdir(), 'trazo-' + uid() + '.raw');
  // fondo blanco por si trae transparencia, escala a N×N, gris; un leve desenfoque cierra puntitos sueltos
  await ff(['-i', file, '-vf', `scale=${N}:${N}:force_original_aspect_ratio=decrease,pad=${N}:${N}:(ow-iw)/2:(oh-ih)/2:white,format=gray,gblur=sigma=0.6`, '-f', 'rawvideo', '-pix_fmt', 'gray', raw]);
  const b = fs.readFileSync(raw); fs.rmSync(raw, { force: true }); return b;
}
// Simplifica un contorno (Ramer–Douglas–Peucker)
function simplificar(pts, eps) {
  if (pts.length < 4) return pts;
  const d2 = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy; if (!L) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2; };
  const rec = (s, e, out) => { let m = 0, i0 = -1; for (let i = s + 1; i < e; i++) { const d = d2(pts[i], pts[s], pts[e]); if (d > m) { m = d; i0 = i; } } if (m > eps * eps) { rec(s, i0, out); out.push(pts[i0]); rec(i0, e, out); } };
  const out = [pts[0]]; rec(0, pts.length - 1, out); out.push(pts[pts.length - 1]); return out;
}
// Contornos (exteriores y huecos) de una máscara binaria con marching squares
function contornos(mask, w, h) {
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] ? 1 : 0, segs = new Map(), k = (x, y) => x + ',' + y;
  const add = (a, b) => { const ka = k(...a); if (!segs.has(ka)) segs.set(ka, []); segs.get(ka).push(b); };
  for (let y = -1; y < h; y++) for (let x = -1; x < w; x++) {
    const c = at(x, y) * 8 + at(x + 1, y) * 4 + at(x + 1, y + 1) * 2 + at(x, y + 1); if (c === 0 || c === 15) continue;
    const T = [x + 1, y + .5], R = [x + 1.5, y + 1], B = [x + 1, y + 1.5], Lf = [x + .5, y + 1]; // puntos medios (en coordenadas de píxel +0.5)
    const S = { 1: [[Lf, B]], 2: [[B, R]], 3: [[Lf, R]], 4: [[R, T]], 5: [[Lf, T], [R, B]], 6: [[B, T]], 7: [[Lf, T]], 8: [[T, Lf]], 9: [[T, B]], 10: [[T, R], [B, Lf]], 11: [[T, R]], 12: [[R, Lf]], 13: [[R, B]], 14: [[B, Lf]] }[c];
    for (const [a, b] of S) add(a, b);
  }
  const loops = [];
  for (const [ka, lista] of segs) while (lista.length) {
    const ini = lista.pop(), loop = [ka.split(',').map(Number), ini]; let cur = ini, guard = 0;
    while (guard++ < 200000) { const kk = k(...cur), nx = segs.get(kk); if (!nx || !nx.length) break; const n = nx.pop(); if (k(...n) === ka) break; loop.push(n); cur = n; }
    if (loop.length >= 4) loops.push(loop);
  }
  return loops;
}

// Devuelve { formas, zonas } listas para la Academy (lienzo 400×400): un fondo negro + un path por zona blanca.
async function trazar(file, { N = 320, umbral = 150, minArea = 30, maxZonas = 220 } = {}) {
  const g = await grises(file, N), blanco = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) blanco[i] = g[i] > umbral ? 1 : 0;
  const lab = new Int32Array(N * N).fill(-1), regiones = [];
  for (let i = 0; i < N * N; i++) if (blanco[i] && lab[i] < 0) {
    const id = regiones.length, cola = [i]; lab[i] = id; let n = 0, x0 = N, y0 = N, x1 = 0, y1 = 0;
    while (cola.length) { const p = cola.pop(), x = p % N, y = (p / N) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [x > 0 ? p - 1 : -1, x < N - 1 ? p + 1 : -1, y > 0 ? p - N : -1, y < N - 1 ? p + N : -1]) if (q >= 0 && blanco[q] && lab[q] < 0) { lab[q] = id; cola.push(q); } }
    regiones.push({ id, n, x0, y0, x1, y1 });
  }
  let usar = regiones.filter(r => r.n >= minArea).sort((a, b) => b.n - a.n); if (usar.length > maxZonas) usar = usar.slice(0, maxZonas);
  const f = 400 / N, formas = [{ t: 'rect', x: 0, y: 0, width: 400, height: 400, n: true }];
  for (const r of usar) {
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1, m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = lab[(y + r.y0) * N + x + r.x0] === r.id ? 1 : 0;
    const d = contornos(m, w, h).map(l => simplificar(l, 0.7)).filter(l => l.length >= 3)
      .map(l => 'M' + l.map(([x, y]) => `${Math.round((x + r.x0) * f * 10) / 10} ${Math.round((y + r.y0) * f * 10) / 10}`).join('L') + 'Z').join('');
    if (d) formas.push({ t: 'path', d, eo: true });
  }
  return { formas, zonas: formas.length - 1 };
}
module.exports = { trazar };
