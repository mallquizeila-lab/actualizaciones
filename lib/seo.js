// SEO de verdad: en vez de que la IA "imagine" etiquetas, se basa en lo que la gente ESCRIBE en el buscador.
//  1) Sugerencias del buscador de YouTube (lo que aparece al escribir; gratis y sin clave).
//  2) Etiquetas de los Shorts más vistos del mismo tema (YouTube Data API, si tienes la clave; 101 unidades).
//  3) La IA reescribe título, descripción, etiquetas y hashtags usando SOLO frases reales y que coincidan con el video.
//  4) Reglas fijas: palabra clave al inicio, etiquetas de 2 a 4 palabras, máx. 480 caracteres, #Shorts, sin repetidos.
//  5) Puntaje SEO de 0 a 100 con consejos, visible en cada video.
const { E, parseJSON } = require('./util');

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ# ]+/g, ' ').replace(/\s+/g, ' ').trim();
const uniq = arr => { const seen = new Set(); return arr.filter(x => { const k = norm(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };

// 1) Lo que sugiere el buscador de YouTube en Perú/Latinoamérica.
async function sugerencias(q) {
  try {
    const u = 'https://suggestqueries.google.com/complete/search?' + new URLSearchParams({ client: 'firefox', ds: 'yt', hl: 'es', gl: 'PE', ie: 'utf-8', oe: 'utf-8', q });
    const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const buf = Buffer.from(await r.arrayBuffer()), cs = /charset=([\w-]+)/i.exec(r.headers.get('content-type') || '')?.[1] || 'utf-8';
    const j = JSON.parse(new TextDecoder(/8859|latin/i.test(cs) ? 'latin1' : 'utf-8').decode(buf).normalize());
    return (j[1] || []).map(String).filter(s => s.length <= 60);
  } catch (e) { return []; }
}
async function buscador(semillas) {
  const out = [];
  for (const q of uniq(semillas).slice(0, 6)) { out.push(...await sugerencias(q)); await new Promise(r => setTimeout(r, 250)); }
  return uniq(out).slice(0, 40);
}

// 2) Etiquetas y títulos de los Shorts más vistos con esa búsqueda.
async function competencia(q) {
  if (!E.YOUTUBE_API_KEY) return null;
  try {
    const c = require('./comments');
    if (c.ytBudget() < 300) return null; // la cuota se guarda para tus subidas
    const yt = async (p, params) => { const r = await fetch('https://www.googleapis.com/youtube/v3/' + p + '?' + new URLSearchParams({ ...params, key: E.YOUTUBE_API_KEY }), { signal: AbortSignal.timeout(15000) }); const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || r.status); return j; };
    const s = await yt('search', { part: 'snippet', q, type: 'video', videoDuration: 'short', order: 'viewCount', relevanceLanguage: 'es', regionCode: 'PE', maxResults: '12' });
    const ids = (s.items || []).map(i => i.id.videoId).filter(Boolean);
    if (!ids.length) return null;
    const v = await yt('videos', { part: 'snippet,statistics', id: ids.join(',') });
    c.spend(101);
    const cuenta = {};
    for (const it of v.items || []) for (const t of it.snippet.tags || []) { const k = norm(t); if (k.length > 2 && k.length <= 40) cuenta[k] = (cuenta[k] || 0) + 1; }
    return {
      tags: Object.entries(cuenta).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([t, n]) => `${t} (${n})`),
      titulos: (v.items || []).sort((a, b) => (+b.statistics.viewCount || 0) - (+a.statistics.viewCount || 0)).slice(0, 6).map(i => `${i.snippet.title} — ${(+i.statistics.viewCount || 0).toLocaleString('es')} vistas`),
    };
  } catch (e) { return null; }
}

const seoP = (ch, j, s, sug, comp) => [{ role: 'user', content:
`Eres experto en SEO de YouTube Shorts, TikTok y Facebook Reels para Latinoamérica (sobre todo Perú). Mejora el SEO de este video.
CANAL: "${ch.name}" (nicho: ${ch.niche}).${(ch.keywords || []).length ? ' Palabras que ya le funcionan al canal: ' + ch.keywords.join(', ') + '.' : ''}
DE QUÉ TRATA EL VIDEO (lo que se dice y se ve; el SEO debe coincidir con esto y nada más):
${String(j.spoken || (s.scenes || []).map(x => x.text).join(' ') || s.narration || j.topic || '').slice(0, 2500)}
SEO ACTUAL: ${JSON.stringify(s.seo || {}).slice(0, 2500)}
LO QUE LA GENTE ESCRIBE EN EL BUSCADOR DE YOUTUBE (frases reales): ${sug.length ? sug.join(' | ') : '(no disponible)'}
${comp ? `ETIQUETAS DE LOS SHORTS MÁS VISTOS DEL TEMA (entre paréntesis, en cuántos aparece): ${comp.tags.join(', ')}
TÍTULOS QUE MÁS VISTAS TIENEN: ${comp.titulos.join(' | ')}` : ''}
REGLAS:
- Elige UNA palabra clave principal: la frase REAL del buscador que más se parezca al video. Si ninguna encaja, usa las palabras más simples que escribiría la gente (ej. "burro gracioso", no "animales antropomórficos").
- TÍTULO: máx. 60 caracteres, la palabra clave al inicio, + curiosidad o emoción, 1 emoji como máximo, sin mentir. Nada de mayúsculas sostenidas.
- 3 títulos alternativos con otras frases reales del buscador.
- DESCRIPCIÓN: 1.ª línea = la palabra clave en una frase natural (es lo que se ve en el buscador). Luego 2 o 3 frases con palabras clave secundarias y una pregunta para comentar. Sin listas de palabras sueltas.
- ETIQUETAS: 15 a 20, ordenadas de la más importante a la menos. Primero la palabra clave exacta, luego frases del buscador y de los videos más vistos que SÍ tengan que ver con el video, luego 3 o 4 palabras amplias del nicho y el nombre del canal. Usa palabras comunes que la gente escribe (2 a 4 palabras), sin tecnicismos ni palabras raras, sin repetir la misma idea. Puedes incluir la versión sin tilde de la principal.
- HASHTAGS de YouTube: #Shorts + 2 o 3 relacionados (los 3 primeros salen encima del título).
- TikTok: el texto empieza con la palabra clave (TikTok también es buscador), máx. 150 caracteres, 4 a 6 hashtags: 2 amplios del nicho y 2 a 4 específicos.
- Facebook: 2 o 3 frases con la palabra clave al inicio que inviten a comentar y compartir, 3 a 5 hashtags.
- Comentario fijado: una pregunta fácil de responder sobre el video.
- No uses etiquetas ni hashtags de cosas que NO aparecen en el video. No inventes volúmenes de búsqueda.
Devuelve SOLO JSON:
{"palabra_clave":"...","youtube":{"title":"...","alt_titles":["","",""],"description":"...","tags":["..."],"keywords":["principal","secundarias"],"hashtags":["#Shorts","..."],"pinned_comment":"..."},"tiktok":{"caption":"...","hashtags":["..."]},"facebook":{"caption":"...","hashtags":["..."]}}` }];

// 4) Reglas fijas: ordena, limpia y recorta para que YouTube lo acepte y rinda.
function pulir(seo, ch, clave) {
  const y = seo.youtube = seo.youtube || {};
  const hash = t => '#' + String(t).replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
  y.title = String(y.title || '').replace(/\s+/g, ' ').trim().slice(0, 70);
  let tags = uniq([clave, ...(y.tags || [])].filter(Boolean).map(t => String(t).replace(/[<>#"]/g, '').replace(/\s+/g, ' ').trim()).filter(t => t.length >= 2 && t.split(' ').length <= 5));
  if (ch.name && !tags.some(t => norm(t) === norm(ch.name))) tags.push(ch.name);
  const out = []; let len = 0; // YouTube cuenta máx. 500 caracteres (dejo margen)
  for (const t of tags) { const add = t.length + (t.includes(' ') ? 2 : 0) + 1; if (len + add > 480) continue; out.push(t); len += add; }
  y.tags = out;
  y.hashtags = uniq(['#Shorts', ...(y.hashtags || []).map(hash)]).filter(h => h.length > 2).slice(0, 4);
  for (const p of ['tiktok', 'facebook']) { const x = seo[p] = seo[p] || {}; x.hashtags = uniq((x.hashtags || []).map(hash)).filter(h => h.length > 2).slice(0, p === 'tiktok' ? 6 : 5); }
  if (seo.tiktok.caption) seo.tiktok.caption = String(seo.tiktok.caption).slice(0, 150);
  y.alt_titles = (y.alt_titles || []).map(t => String(t).slice(0, 70)).filter(Boolean).slice(0, 3);
  return seo;
}

// 5) Puntaje SEO (0 a 100) con consejos.
function puntaje(seo, clave, sug) {
  const y = seo?.youtube || {}, k = norm(clave), T = norm(y.title), D = norm(y.description).slice(0, 160);
  const tips = []; let p = 0;
  const chk = (ok, pts, tip) => { if (ok) p += pts; else tips.push(tip); };
  chk(k && T.startsWith(k.split(' ').slice(0, 2).join(' ')), 15, 'La palabra clave no está al inicio del título');
  chk(k && T.includes(k), 10, 'El título no tiene la palabra clave completa');
  chk(y.title && y.title.length >= 25 && y.title.length <= 60, 10, 'El título debería tener entre 25 y 60 caracteres');
  chk(k && D.includes(k.split(' ')[0]), 10, 'La primera línea de la descripción no tiene la palabra clave');
  chk((y.description || '').length >= 120, 5, 'Descripción muy corta');
  const tags = (y.tags || []).map(norm);
  chk(tags[0] === k, 10, 'La primera etiqueta debería ser la palabra clave exacta');
  chk(tags.length >= 12, 10, 'Pocas etiquetas (lo ideal es 15 a 20)');
  const len = (y.tags || []).join(',').length;
  chk(len >= 300, 5, 'Usa más espacio de etiquetas (300 a 480 caracteres)');
  const S = (sug || []).map(norm);
  const reales = S.length ? tags.filter(t => S.some(s => s === t || s.startsWith(t + ' ') || t.startsWith(s))).length : 0;
  chk(!S.length || reales >= 4, 15, 'Pocas etiquetas coinciden con lo que la gente busca');
  chk((y.hashtags || []).some(h => /^#shorts$/i.test(h)) && (y.hashtags || []).length <= 5, 5, 'Usa #Shorts y máximo 4 hashtags');
  chk((seo.tiktok?.caption || '') && norm(seo.tiktok.caption).includes(k.split(' ')[0]), 5, 'El texto de TikTok no empieza con la palabra clave');
  return { nota: Math.min(100, p), clave, tips, reales, buscador: (sug || []).slice(0, 15) };
}

async function optimizar(j, ch, log = () => {}) {
  const s = j.script || {}; s.seo = s.seo || j.seo || {};
  if (require('./store').db.settings.seoPro === false) return;
  try {
    const y = s.seo.youtube || {};
    const base = (y.keywords || [])[0] || (y.tags || [])[0] || j.topic || y.title || '';
    const palabras = norm(base).split(' ').filter(w => w.length > 2);
    const semillas = [base, palabras.slice(0, 2).join(' '), ...(y.keywords || []).slice(1, 3), ...(y.tags || []).slice(1, 3)];
    log('🔎 SEO: buscando lo que la gente escribe en YouTube');
    const sug = await buscador(semillas.filter(Boolean));
    const comp = j._sinComp ? null : await competencia(norm(base).split(' ').slice(0, 3).join(' '));
    const ai = require('./ai');
    const o = parseJSON((await ai.ask(seoP(ch, j, s, sug, comp), { json: true, max: 2500 })).text);
    if (!o.youtube?.title) throw new Error('respuesta incompleta');
    const clave = String(o.palabra_clave || (o.youtube.keywords || [])[0] || base).trim();
    const nuevo = pulir({ ...s.seo, youtube: { ...s.seo.youtube, ...o.youtube }, tiktok: { ...s.seo.tiktok, ...o.tiktok }, facebook: { ...s.seo.facebook, ...o.facebook } }, ch, clave);
    s.seo = nuevo; j.seo = nuevo;
    const sug2 = uniq([...await sugerencias(clave), ...sug]); // lo que se busca alrededor de la palabra elegida
    j.seoScore = puntaje(nuevo, clave, sug2);
    log(`🔎 SEO: palabra clave "${clave}", ${sug.length} búsquedas reales${comp ? ' y etiquetas de los Shorts más vistos' : ''} → puntaje ${j.seoScore.nota}/100`);
  } catch (e) {
    s.seo = pulir(s.seo, ch, (s.seo.youtube?.keywords || [])[0] || '');
    j.seo = s.seo;
    j.seoScore = puntaje(s.seo, (s.seo.youtube?.keywords || [])[0] || '', []);
    log('SEO: no pude mejorarlo con búsquedas reales (' + e.message + '); dejé el básico ordenado.');
  }
}

// Botón "Mejorar SEO" (un video) y "Mejorar SEO de todos": reescribe los textos y,
// si el video ya está en YouTube, le cambia título, descripción y etiquetas allí mismo.
const masivo = { on: false, hechos: 0, total: 0, errores: 0, fin: null };
async function mejorar(j, { competir = true } = {}) {
  const { db, saveAll } = require('./store');
  const ch = db.channels.find(c => c.id === j.channelId); if (!ch) throw new Error('Canal no encontrado');
  if (!j.result) throw new Error('El video aún no está listo');
  j.script = j.script || { seo: j.seo };
  if (!competir) j._sinComp = true;
  const log = m => j.log.push(m);
  await optimizar(j, ch, log); delete j._sinComp;
  j.title = j.seo.youtube?.title || j.title;
  try { require('./worker').writeTexts(j, ch); } catch (e) {}
  let yt = false;
  if (j.pub?.youtube?.ok) { yt = await require('./publish').actualizarYouTube(j, ch); if (yt) log('YouTube: título, descripción y etiquetas actualizados ✓'); }
  saveAll.jobs();
  return { ok: 1, nota: j.seoScore?.nota, youtube: yt };
}
async function mejorarTodos() {
  if (masivo.on) return masivo;
  const { db } = require('./store');
  const lista = db.jobs.filter(j => j.result && !['produciendo', 'error', 'dividido'].includes(j.status) && !j.seoScore);
  Object.assign(masivo, { on: true, hechos: 0, total: lista.length, errores: 0, fin: null });
  (async () => {
    for (const j of lista) {
      try { await mejorar(j, { competir: false }); } catch (e) { masivo.errores++; j.log.push('SEO: ' + e.message); }
      masivo.hechos++;
      await new Promise(r => setTimeout(r, 4000)); // sin apurar a las IAs gratis
    }
    masivo.on = false; masivo.fin = new Date().toISOString();
  })();
  return masivo;
}

module.exports = { mejorar, mejorarTodos, masivo, optimizar, sugerencias, buscador, pulir, puntaje };
