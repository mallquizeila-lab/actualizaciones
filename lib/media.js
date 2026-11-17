// Fotos de fondo gratis: Pexels y Pixabay. Devuelve el nombre de la fuente para los créditos, o null.
const fs = require('fs');
const { E, pick } = require('./util');

async function download(url, out) {
  const r = await fetch(url);
  if (!r.ok) return false;
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  return true;
}

async function pexels(q, out) {
  if (!E.PEXELS_API_KEY) return null;
  const r = await fetch('https://api.pexels.com/v1/search?per_page=8&orientation=portrait&query=' + encodeURIComponent(q), { headers: { Authorization: E.PEXELS_API_KEY } });
  const p = (await r.json()).photos || [];
  if (!p.length) return null;
  return (await download(pick(p.slice(0, 4)).src.portrait, out)) ? 'Pexels' : null;
}

async function pixabay(q, out) {
  if (!E.PIXABAY_API_KEY) return null;
  const r = await fetch(`https://pixabay.com/api/?key=${E.PIXABAY_API_KEY}&orientation=vertical&image_type=photo&safesearch=true&per_page=10&q=` + encodeURIComponent(q));
  const h = (await r.json()).hits || [];
  if (!h.length) return null;
  return (await download(pick(h.slice(0, 4)).largeImageURL, out)) ? 'Pixabay' : null;
}

// Alterna el orden para que los videos no se parezcan tanto entre sí.
async function photo(q, out) {
  if (!q) return null;
  const order = Math.random() < 0.5 ? [pexels, pixabay] : [pixabay, pexels];
  for (const f of order) { try { const s = await f(q, out); if (s) return s; } catch (e) {} }
  return null;
}

// 🎥 Clips de VIDEO reales (gratis con las mismas claves): Pexels Videos y Pixabay Videos.
// Prefiere verticales, de 720p a 1080p, que duren lo suficiente para la escena. `evitar` = ids ya usados en este video.
async function bajarVideo(url, out) {
  const r = await fetch(url, { signal: AbortSignal.timeout(120000) }); if (!r.ok) return false;
  const n = +r.headers.get('content-length') || 0; if (n > 60e6) return false;
  const b = Buffer.from(await r.arrayBuffer()); if (b.length < 50e3 || b.length > 60e6) return false; fs.writeFileSync(out, b); return true;
}
async function pexelsVideo(q, min, evitar) {
  if (!E.PEXELS_API_KEY) return null;
  const r = await fetch('https://api.pexels.com/videos/search?per_page=15&orientation=portrait&size=medium&query=' + encodeURIComponent(q), { headers: { Authorization: E.PEXELS_API_KEY }, signal: AbortSignal.timeout(20000) });
  const vs = ((await r.json()).videos || []).filter(v => !evitar.has('px' + v.id) && v.duration >= Math.min(min, 6));
  for (const v of vs.slice(0, 6).sort(() => Math.random() - 0.5)) {
    const fs_ = (v.video_files || []).filter(f => /mp4/.test(f.file_type || 'mp4') && f.height >= f.width && f.height >= 960 && f.height <= 2000).sort((a, b) => Math.abs(a.height - 1920) - Math.abs(b.height - 1920));
    if (fs_.length) return { id: 'px' + v.id, url: fs_[0].link, fuente: 'Pexels' };
  }
  return null;
}
async function pixabayVideo(q, min, evitar) {
  if (!E.PIXABAY_API_KEY) return null;
  const r = await fetch(`https://pixabay.com/api/videos/?key=${E.PIXABAY_API_KEY}&safesearch=true&per_page=20&q=` + encodeURIComponent(q), { signal: AbortSignal.timeout(20000) });
  const hs = ((await r.json()).hits || []).filter(h => !evitar.has('pb' + h.id) && h.duration >= Math.min(min, 6));
  const vert = h => { const m = h.videos?.medium || h.videos?.large || {}; return m.height >= m.width; };
  for (const h of [...hs.filter(vert), ...hs.filter(h => !vert(h))].slice(0, 6)) {
    const f = [h.videos?.large, h.videos?.medium].find(x => x && x.url && x.width && Math.max(x.width, x.height) <= 2000 && Math.max(x.width, x.height) >= 1280);
    if (f) return { id: 'pb' + h.id, url: f.url, fuente: 'Pixabay' };
  }
  return null;
}
async function video(q, out, min = 5, evitar = new Set()) {
  if (!q) return null;
  for (const f of [pexelsVideo, pixabayVideo]) { // Pexels primero: tiene muchos más clips verticales
    try { const v = await f(q, min, evitar); if (v && await bajarVideo(v.url, out)) { evitar.add(v.id); return v.fuente; } } catch (e) {}
  }
  return null;
}

module.exports = { photo, video };
