// El Cerebro: investiga a la competencia, mira los videos ganadores, mide tus videos y aprende.
//  - Competencia (YouTube Data API con tu clave): Shorts más vistos del nicho en los últimos 30 días y
//    "videos fuera de serie" (muchas más vistas que suscriptores tiene su canal).
//  - Gemini ve los 2 mejores por su enlace (función oficial de Google) y saca su técnica.
//  - Tus estadísticas (con YouTube conectado): vistas, likes, comentarios, % visto y suscriptores.
//  - Aprende: guarda en el canal "insights" (lo que funciona) y "tendencias", que usan los temas y guiones.
//  - Detector de videos que suben: si un video tuyo despega, prepara pronto la "parte 2".
// Nunca copia contenido: solo aprende técnicas. Respeta la cuota de YouTube (reserva las subidas).
const { E, day, addDays, parseJSON, sleep } = require('./util');
const { db, saveAll, channel } = require('./store');
const ai = require('./ai');
const publish = require('./publish');

const state = { running: false, last: null, log: [], error: null };
const say = m => { state.log = [...state.log, new Date().toLocaleTimeString('es') + ' ' + m].slice(-30); console.log('[Cerebro] ' + m); };
let comments = null; // se carga después (evita dependencia circular)
const budget = () => { comments = comments || require('./comments'); return comments.ytBudget(); };
const spend = n => { comments = comments || require('./comments'); comments.spend(n); };

async function yt(pathq, params, auth) {
  const u = 'https://www.googleapis.com/youtube/v3/' + pathq + '?' + new URLSearchParams(auth ? params : { ...params, key: E.YOUTUBE_API_KEY });
  const r = await fetch(u, { headers: auth ? { authorization: 'Bearer ' + auth } : {} });
  const j = await r.json();
  if (!r.ok) throw new Error('YouTube: ' + (j.error?.message || r.status));
  return j;
}
const iso = s => { const m = String(s || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };

// ---------- 1) Competencia ----------
async function queriesFor(ch) {
  if (ch.queries?.length) return ch.queries;
  const r = await ai.ask([{ role: 'user', content: `Canal de Shorts "${ch.name}", nicho: ${ch.niche}. Escribe 3 búsquedas cortas (2 a 4 palabras, en español, como las escribiría la gente en YouTube) para encontrar los Shorts más vistos de este nicho. Devuelve SOLO JSON: {"q":["...","...","..."]}` }], { json: true });
  ch.queries = (parseJSON(r.text).q || []).slice(0, 3).map(String);
  saveAll.channels();
  return ch.queries;
}

async function competencia(ch) {
  if (!E.YOUTUBE_API_KEY) throw new Error('Falta la clave "YouTube Data API" en Ajustes');
  if (budget() < 3) throw new Error('Cuota de YouTube reservada para tus subidas; investigo mañana');
  // Una búsqueda por vez (100 unidades), rotando entre las 3 del canal: cuida la cuota de tus subidas.
  const all = await queriesFor(ch), k = (ch.qIdx || 0) % all.length;
  ch.qIdx = k + 1;
  const qs = [all[k]];
  const ids = new Set();
  for (const q of qs) {
    const r = await yt('search', { part: 'snippet', q, type: 'video', videoDuration: 'short', order: 'viewCount', publishedAfter: new Date(Date.now() - 30 * 86400000).toISOString(), relevanceLanguage: 'es', maxResults: '25' });
    spend(100);
    (r.items || []).forEach(x => x.id?.videoId && ids.add(x.id.videoId));
    await sleep(500);
  }
  if (!ids.size) return [];
  const vids = (await yt('videos', { part: 'snippet,statistics,contentDetails', id: [...ids].slice(0, 50).join(',') })).items || [];
  spend(1);
  const chIds = [...new Set(vids.map(v => v.snippet.channelId))].slice(0, 50);
  const subs = {};
  ((await yt('channels', { part: 'statistics', id: chIds.join(',') })).items || []).forEach(c => { subs[c.id] = +c.statistics.subscriberCount || 0; });
  spend(1);
  const mine = new Set(Object.values(publish.tokens.google || {}).map(g => g.yt?.id).filter(Boolean));
  const list = vids.filter(v => !mine.has(v.snippet.channelId)).map(v => {
    const views = +v.statistics.viewCount || 0, s = subs[v.snippet.channelId] || 0;
    return {
      id: v.id, url: 'https://www.youtube.com/shorts/' + v.id, title: v.snippet.title, canal: v.snippet.channelTitle,
      views, likes: +v.statistics.likeCount || 0, comments: +v.statistics.commentCount || 0, dur: iso(v.contentDetails.duration),
      subs: s, ratio: +(views / Math.max(1000, s)).toFixed(1), tags: (v.snippet.tags || []).slice(0, 12), at: v.snippet.publishedAt,
    };
  }).filter(v => v.dur <= 180);
  // Puntaje: vistas + bonus "fuera de serie" (muchas más vistas que suscriptores)
  list.sort((a, b) => (b.views * Math.min(10, b.ratio)) - (a.views * Math.min(10, a.ratio)));
  return list.slice(0, 15);
}

// ---------- 2) Gemini mira un video por su enlace ----------
async function mirar(url, ch) {
  if (!E.GEMINI_API_KEY) return null;
  const model = await ai.modelFor('gemini');
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${E.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(180000),
    body: JSON.stringify({ contents: [{ parts: [{ fileData: { fileUri: url } }, { text:
`Analiza este Short viral del nicho "${ch.niche}" como editor profesional. NO resumas su contenido para copiarlo: extrae su TÉCNICA.
Devuelve SOLO JSON: {"gancho":"qué hace en el primer segundo","ritmo":"cada cuántos segundos cambia la imagen y cómo","visual":"estilo de imágenes, texto en pantalla, colores","voz":"tipo de voz y tono","estructura":"cómo avanza la historia","cierre":"cómo termina y si hace bucle","duracion_s":0,"por_que_funciona":"1 o 2 frases"}` }] }],
      generationConfig: { responseMimeType: 'application/json' } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Gemini (video): ' + (j.error?.message || r.status));
  return parseJSON((j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''));
}

// ---------- 3) Tus estadísticas ----------
async function misStats(ch) {
  const g = publish.tokens.google?.[ch.id];
  if (!g) return null;
  const access = await publish.googleAccess(ch.id);
  const out = { at: new Date().toISOString() };
  try {
    const me = (await yt('channels', { part: 'statistics', mine: 'true' }, access)).items?.[0];
    spend(1);
    if (me) Object.assign(out, { subs: +me.statistics.subscriberCount || 0, views: +me.statistics.viewCount || 0, videos: +me.statistics.videoCount || 0 });
  } catch (e) { out.error = e.message; }
  const jobs = db.jobs.filter(j => j.channelId === ch.id && j.pub?.youtube?.id);
  for (let i = 0; i < jobs.length; i += 50) {
    const part = jobs.slice(i, i + 50);
    try {
      const r = await yt('videos', { part: 'statistics', id: part.map(j => j.pub.youtube.id).join(',') }, access);
      spend(1);
      for (const v of r.items || []) {
        const j = part.find(x => x.pub.youtube.id === v.id);
        j.stats = { ...(j.stats || {}), views: +v.statistics.viewCount || 0, likes: +v.statistics.likeCount || 0, comments: +v.statistics.commentCount || 0, at: out.at };
      }
    } catch (e) { out.error = e.message; }
  }
  // YouTube Analytics (% visto, duración media, suscriptores ganados por video y vistas de Shorts en 90 días)
  const A = async q => {
    const r = await fetch('https://youtubeanalytics.googleapis.com/v2/reports?' + new URLSearchParams({ ids: 'channel==MINE', ...q }), { headers: { authorization: 'Bearer ' + access } });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || r.status);
    return j;
  };
  try {
    const r = await A({ startDate: addDays(day(), -90), endDate: day(), metrics: 'views,averageViewPercentage,averageViewDuration,subscribersGained', dimensions: 'video', sort: '-views', maxResults: '200' });
    for (const row of r.rows || []) {
      const j = jobs.find(x => x.pub.youtube.id === row[0]);
      if (j) Object.assign(j.stats = j.stats || {}, { pct: Math.round(row[2]), avgDur: Math.round(row[3]), subsGained: row[4] });
    }
    try {
      const t = await A({ startDate: addDays(day(), -90), endDate: day(), metrics: 'views', dimensions: 'creatorContentType' });
      const sh = (t.rows || []).find(x => /short/i.test(x[0]));
      out.shortsViews90 = sh ? sh[1] : 0;
    } catch (e) {}
    out.analytics = true;
  } catch (e) { out.analytics = false; out.analyticsError = /scope|insufficient|permission/i.test(e.message) ? 'Reconecta YouTube para dar permiso de estadísticas' : String(e.message); }
  if (out.shortsViews90 === undefined) out.shortsViews90 = jobs.filter(j => Date.now() - new Date(j.pub.youtube.when || j.pub.youtube.at).getTime() < 90 * 86400000).reduce((a, j) => a + (j.stats?.views || 0), 0);
  ch.ytStats = out;
  saveAll.channels(); saveAll.jobs();
  return out;
}

// Detector de videos que despegan: si uno rinde el doble que tu mediana, se prepara la parte 2.
function despegues(ch) {
  const js = db.jobs.filter(j => j.channelId === ch.id && j.stats?.views >= 0 && j.pub?.youtube?.ok);
  if (js.length < 3) return [];
  const v = js.map(j => j.stats.views).sort((a, b) => a - b), med = v[Math.floor(v.length / 2)];
  const hot = js.filter(j => !j.followUp && j.stats.views >= Math.max(1000, med * 2) && Date.now() - new Date(j.pub.youtube.when || j.pub.youtube.at).getTime() < 7 * 86400000);
  const made = [];
  for (const j of hot.slice(0, 1)) {
    j.followUp = true;
    const nj = require('./worker').newJob(ch, { topic: `Parte 2 de "${j.title}": profundiza con un dato o paso nuevo que la gente pidió (mismo estilo)`, format: j.format || '', publishDate: day() });
    nj.parentHit = j.id;
    made.push(nj);
    say(`🔥 "${j.title}" está despegando (${j.stats.views} vistas): preparo la parte 2`);
    try { require('./avisos').avisar(`🔥 ¡${ch.name}: "${j.title}" está despegando! (${j.stats.views} vistas). Ya preparo la parte 2.`); } catch (e) {}
  }
  if (made.length) { saveAll.jobs(); require('./worker').loop(); }
  return made;
}

// ---------- 4) Aprender ----------
async function aprender(ch, comp, vistos) {
  const mine = db.jobs.filter(j => j.channelId === ch.id && j.stats).slice(-30)
    .map(j => `- "${j.title}" | ${j.stats.views} vistas${j.stats.pct ? ', ' + j.stats.pct + '% visto' : ''}${j.review ? ', nota ' + j.review.nota : ''} | formato ${j.format || j.kind || '?'}`).join('\n');
  const r = await ai.ask([{ role: 'user', content:
`Eres estratega de crecimiento de YouTube Shorts. Canal "${ch.name}" (nicho ${ch.niche}).
COMPETENCIA (Shorts más vistos del nicho en 30 días; ratio = vistas/suscriptores, alto = fórmula fuera de serie):
${(comp || []).map(v => `- "${v.title}" (${v.canal}) ${v.views} vistas, ratio ${v.ratio}, ${v.dur}s, tags: ${v.tags.slice(0, 6).join(', ')}`).join('\n') || '(sin datos)'}
TÉCNICA DE LOS MEJORES (vista por IA):
${(vistos || []).map(x => '- ' + JSON.stringify(x)).join('\n') || '(sin datos)'}
TUS VIDEOS (resultados reales):
${mine || '(todavía sin estadísticas)'}
Saca conclusiones ACCIONABLES y comprobables con estos datos (no inventes). Devuelve SOLO JSON:
{"insights":["máx 8 reglas cortas: qué temas, formatos, duración, ganchos, títulos y portadas funcionan; qué evitar"],"tendencias":["máx 8 temas que están funcionando AHORA en el nicho, reformulados con tus palabras"],"palabras_clave":["máx 12 búsquedas reales del nicho para SEO"],"resumen":"2 frases para el dueño"}` }], { json: true, max: 3000 });
  const o = parseJSON(r.text);
  ch.insights = (o.insights || []).slice(0, 8).map(String);
  ch.tendencias = (o.tendencias || []).slice(0, 8).map(String);
  ch.keywords = (o.palabras_clave || []).slice(0, 12).map(String);
  ch.brain = { resumen: String(o.resumen || ''), at: new Date().toISOString(), comp: (comp || []).slice(0, 10), vistos: vistos || [] };
  ch.topicBank = []; // los próximos temas ya usan lo aprendido
  saveAll.channels();
}

// ---------- Ciclo ----------
async function pensar(ch, { force = false } = {}) {
  const now = Date.now();
  if (publish.tokens.google?.[ch.id] && (force || !ch.ytStats || now - new Date(ch.ytStats.at).getTime() > 6 * 3600000)) {
    try { await misStats(ch); say(`${ch.name}: estadísticas actualizadas`); despegues(ch); } catch (e) { say(`${ch.name}: estadísticas: ${e.message}`); }
  }
  const due = force || !ch.brain || now - new Date(ch.brain.at).getTime() > 7 * 86400000;
  if (!due) return;
  let comp = [], vistos = [];
  if (E.YOUTUBE_API_KEY) {
    try { comp = await competencia(ch); say(`${ch.name}: analicé ${comp.length} Shorts de la competencia`); }
    catch (e) { say(`${ch.name}: competencia: ${e.message}`); if (/Cuota/.test(e.message)) return; }
    for (const v of comp.slice(0, 2)) {
      try { const x = await mirar(v.url, ch); if (x) vistos.push({ titulo: v.title, ...x }); } catch (e) { say('No pude ver un video: ' + e.message.slice(0, 100)); }
    }
  }
  if (!comp.length && !db.jobs.some(j => j.channelId === ch.id && j.stats)) return; // nada que aprender todavía
  try { await aprender(ch, comp, vistos); say(`${ch.name}: aprendí ${ch.insights.length} reglas nuevas`); }
  catch (e) { say(`${ch.name}: no pude sacar conclusiones (${e.message.slice(0, 80)})`); }
}

async function ciclo({ force = false, only } = {}) {
  if (state.running) return state;
  state.running = true; state.error = null;
  try {
    let deep = 0;
    for (const ch of db.channels.filter(c => c.active && (!only || c.id === only))) {
      const wasDue = !ch.brain || Date.now() - new Date(ch.brain.at).getTime() > 7 * 86400000;
      if (wasDue && !force && deep >= 2) { if (publish.tokens.google?.[ch.id]) await pensar(ch, { force: false }).catch(() => {}); continue; } // máx 2 investigaciones por día
      await pensar(ch, { force });
      if (wasDue || force) deep++;
    }
    state.last = new Date().toISOString();
  } catch (e) { state.error = e.message; }
  finally { state.running = false; }
  return state;
}

function resumen() {
  return db.channels.map(c => ({
    id: c.id, name: c.name, stats: c.ytStats || null, insights: c.insights || [], tendencias: c.tendencias || [], keywords: c.keywords || [],
    brain: c.brain ? { resumen: c.brain.resumen, at: c.brain.at, comp: c.brain.comp, vistos: c.brain.vistos } : null,
    notas: c.notas || [], manual: (c.manual || []).length,
    top: db.jobs.filter(j => j.channelId === c.id && j.stats).sort((a, b) => b.stats.views - a.stats.views).slice(0, 5).map(j => ({ title: j.title, ...j.stats, url: j.pub?.youtube?.url })),
  }));
}

function start() {
  setTimeout(() => ciclo().catch(() => {}), 60000);
  setInterval(() => ciclo().catch(e => console.log('[Cerebro] ' + e.message)), 3 * 3600000);
}

module.exports = { ciclo, pensar, competencia, mirar, misStats, despegues, aprender, resumen, state, start };
