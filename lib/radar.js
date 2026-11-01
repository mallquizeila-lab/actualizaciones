// 📡 Radar de tendencias: busca DÓNDE se mueve la gente ahora y propone temas con más probabilidad de volverse virales.
// Solo fuentes públicas u oficiales y solo TEMAS (nunca datos de personas: ni nombres, ni perfiles, ni autores).
//  1) Comentarios de los Shorts más vistos de tu nicho (API oficial de YouTube): qué pregunta y pide la gente.
//  2) Tendencias del día de Google en Perú (listado público "Lo más buscado").
//  3) Lo que la gente escribe en el buscador de YouTube sobre tu nicho.
//  4) Artículos más leídos hoy en Wikipedia en español (estadística pública).
const { E, day, addDays, parseJSON } = require('./util');
const { db, saveAll } = require('./store');

const T = (u, ms = 15000) => fetch(u, { signal: AbortSignal.timeout(ms), headers: { 'user-agent': 'ShortForge/6 (radar de tendencias)' } });

// 1) Comentarios de los Shorts más vistos de las últimas 2 semanas (≈106 unidades de cuota).
async function comentarios(ch) {
  if (!E.YOUTUBE_API_KEY) return null;
  const c = require('./comments'); if (c.ytBudget() < 400) return null;
  const k = E.YOUTUBE_API_KEY, q = (ch.queries?.[0] || ch.keywords?.[0] || ch.niche || '').slice(0, 60);
  const desde = new Date(Date.now() - 14 * 86400000).toISOString();
  const s = await T('https://www.googleapis.com/youtube/v3/search?' + new URLSearchParams({ part: 'snippet', q, type: 'video', videoDuration: 'short', order: 'viewCount', publishedAfter: desde, relevanceLanguage: 'es', regionCode: 'PE', maxResults: '6', key: k })).then(r => r.json());
  c.spend(100);
  const vids = (s.items || []).map(i => ({ id: i.id.videoId, t: i.snippet.title })).filter(v => v.id);
  const out = [];
  for (const v of vids.slice(0, 6)) {
    const r = await T('https://www.googleapis.com/youtube/v3/commentThreads?' + new URLSearchParams({ part: 'snippet', videoId: v.id, order: 'relevance', maxResults: '40', textFormat: 'plainText', key: k })).then(x => x.json()).catch(() => ({}));
    c.spend(1);
    // Solo el TEXTO (sin autor) y recortado.
    const txt = (r.items || []).map(i => String(i.snippet.topLevelComment.snippet.textDisplay || '').replace(/\s+/g, ' ').slice(0, 160)).filter(x => x.length > 8);
    if (txt.length) out.push({ video: v.t, comentarios: txt.slice(0, 25) });
  }
  return out;
}

// 2) Lo más buscado hoy en Google (Perú), con su tráfico aproximado.
async function googleTrends(geo = 'PE') {
  try {
    const x = await T('https://trends.google.com/trending/rss?geo=' + geo).then(r => r.ok ? r.text() : '');
    return [...x.matchAll(/<item>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/g)].map(m => `${m[1].trim()} (${m[2].trim()} búsquedas)`).slice(0, 20);
  } catch (e) { return []; }
}

// 4) Lo más leído ayer en Wikipedia en español.
async function wikipedia() {
  try {
    const d = addDays(day(), -1).split('-');
    const j = await T(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/es.wikipedia/all-access/${d[0]}/${d[1]}/${d[2]}`).then(r => r.json());
    return (j.items?.[0]?.articles || []).filter(a => !/^(Especial|Wikipedia|Portal|Archivo|Anexo|Ayuda|Categoría):|^Main_Page$|^Wikipedia$/.test(a.article)).slice(0, 25).map(a => `${a.article.replace(/_/g, ' ')} (${a.views.toLocaleString('es')} visitas)`);
  } catch (e) { return []; }
}

const radarP = (ch, d, usados) => [{ role: 'user', content:
`Eres estratega de contenido viral en Latinoamérica (sobre todo Perú). Canal de Shorts "${ch.name}", nicho: ${ch.niche}.
Te paso lo que se mueve HOY. Propón los 8 temas de video con más probabilidad de volverse virales EN ESTE CANAL.
${d.coments?.length ? 'COMENTARIOS EN LOS SHORTS MÁS VISTOS DEL NICHO (qué pregunta, pide o celebra la gente):\n' + d.coments.map(v => `• Video "${v.video}":\n  - ${v.comentarios.join('\n  - ')}`).join('\n').slice(0, 7000) : ''}
${d.buscador.length ? 'LO QUE LA GENTE ESCRIBE EN EL BUSCADOR DE YOUTUBE: ' + d.buscador.join(' | ') : ''}
${d.google.length ? 'LO MÁS BUSCADO HOY EN GOOGLE PERÚ: ' + d.google.join(' | ') : ''}
${d.wiki.length ? 'LO MÁS LEÍDO AYER EN WIKIPEDIA EN ESPAÑOL: ' + d.wiki.join(' | ') : ''}
${(ch.tendencias || []).length ? 'TENDENCIAS QUE YA DETECTÓ EL CEREBRO: ' + ch.tendencias.join(' | ') : ''}
TEMAS YA HECHOS (no repetir): ${usados.slice(-40).join(' | ') || 'ninguno'}
REGLAS:
- Solo temas que encajen con el nicho del canal. Una tendencia general (fútbol, política, farándula) solo si se puede conectar de forma natural y respetuosa con el nicho; si no, ignórala.
- Nada de tragedias, muertes, política partidaria, menores en riesgo, desinformación ni temas de salud con promesas.
- Prioriza lo que piden muchos comentarios y lo que crece hoy.
- "porque": en 1 frase, de dónde sale y qué señal hay (ej. "muchos comentarios piden la parte 2", "tendencia #3 en Google Perú hoy").
- "puntaje": de 1 a 10 según probabilidad de viralizar.
- "gancho": la primera frase del video (máx. 12 palabras).
Devuelve SOLO JSON: {"ideas":[{"tema":"...","gancho":"...","porque":"...","fuente":"comentarios|buscador|google|wikipedia|cerebro","puntaje":8}]}` }];

async function escanear(ch, { log = () => {} } = {}) {
  const usados = db.jobs.filter(j => j.channelId === ch.id && (j.topic || j.title)).map(j => j.topic || j.title);
  const seo = require('./seo');
  const semillas = [ch.niche, ...(ch.keywords || []).slice(0, 3), ...(ch.queries || []).slice(0, 2)].filter(Boolean);
  const [coments, buscador, google, wiki] = await Promise.all([
    comentarios(ch).catch(() => null), seo.buscador(semillas).catch(() => []), googleTrends().catch(() => []), wikipedia().catch(() => []),
  ]);
  const d = { coments: coments || [], buscador, google, wiki };
  const fuentes = { comentarios: d.coments.reduce((a, v) => a + v.comentarios.length, 0), buscador: buscador.length, google: google.length, wikipedia: wiki.length };
  if (!Object.values(fuentes).some(Boolean)) throw new Error('No pude leer ninguna fuente (¿sin internet?)');
  const o = parseJSON((await require('./ai').ask(radarP(ch, d, usados), { json: true, max: 3000 })).text);
  const ideas = (o.ideas || []).filter(i => i?.tema).map(i => ({ tema: String(i.tema).slice(0, 200), gancho: String(i.gancho || '').slice(0, 120), porque: String(i.porque || '').slice(0, 200), fuente: String(i.fuente || ''), puntaje: Math.max(1, Math.min(10, +i.puntaje || 5)) })).sort((a, b) => b.puntaje - a.puntaje).slice(0, 8);
  ch.radar = { at: new Date().toISOString(), fuentes, ideas, google: google.slice(0, 8) };
  // Las mejores ideas pasan primero a la fila de temas del canal (las usa la producción automática).
  if (ch.radarAuto !== false) {
    const top = ideas.filter(i => i.puntaje >= 7).slice(0, 3).map(i => ({ topic: i.tema, format: '', character: '', radar: true }));
    const ya = new Set((ch.topicBank || []).map(t => String(t.topic).toLowerCase()));
    ch.topicBank = [...top.filter(t => !ya.has(t.topic.toLowerCase())), ...(ch.topicBank || []).filter(t => !t.radar)].slice(0, 12);
  }
  saveAll.channels();
  log(`📡 Radar ${ch.name}: ${ideas.length} ideas (comentarios ${fuentes.comentarios}, buscador ${fuentes.buscador}, Google ${fuentes.google}, Wikipedia ${fuentes.wikipedia})`);
  return ch.radar;
}

// Una vez al día por canal activo (por la mañana, antes de producir).
async function diario() {
  const h = new Date().getHours(), hoy = day();
  if (h < 6) return;
  for (const ch of db.channels.filter(c => c.active && c.radarOn !== false)) {
    if ((ch.radar?.at || '').startsWith(hoy)) continue;
    try { await escanear(ch, { log: m => console.log('[Radar] ' + m) }); } catch (e) { console.log('[Radar] ' + ch.name + ': ' + e.message); }
    await new Promise(r => setTimeout(r, 20000));
  }
}
function start() { setTimeout(() => diario().catch(() => {}), 120000); setInterval(() => diario().catch(() => {}), 60 * 60000); }

module.exports = { escanear, googleTrends, wikipedia, start };
