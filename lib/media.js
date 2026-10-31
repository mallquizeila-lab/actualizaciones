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

module.exports = { photo };
