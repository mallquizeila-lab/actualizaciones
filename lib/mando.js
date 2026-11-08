// 🧭 Centro de Mando de Yupitok: 4 agentes que hacen todo el trabajo gastando muy pocos créditos.
//  - 📊 Data (sin IA): visitas, juegos, suscriptores, canales y videos.
//  - 🛠️ Guardián (sin IA): errores de jugadores, juegos rotos, página caída, moderación pendiente, videos con error.
//  - 🎬 Creativo (IA solo al decidir): bandeja de links de YouTube → "🎬 lo armo" (video ORIGINAL inspirado en la idea) o "⏭️ lo dejo".
//  - 💰 Monetiza (sin IA): ingresos que anotas (GamePix, AdSense, apoyos) y consejos según los números.
// Reporte diario (sin IA) en el panel y por Telegram.
const fs = require('fs'), path = require('path');
const { DATA, uid, parseJSON, day } = require('./util');
const { db } = require('./store');

const FILE = path.join(DATA, 'mando.json');
const M = (() => { try { return Object.assign({ links: [], ingresos: [], reportes: [] }, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) { return { links: [], ingresos: [], reportes: [] }; } })();
const guardar = () => { M.links = M.links.slice(-200); M.ingresos = M.ingresos.slice(-500); M.reportes = M.reportes.slice(-30); fs.writeFileSync(FILE, JSON.stringify(M, null, 1)); };
const V = () => require('./viral');
const intenta = async (f, def = null) => { try { return await f(); } catch (e) { return def; } };

// ---------- 📊 Data + 🛠️ Guardián + 💰 Monetiza: todo con código (0 créditos) ----------
async function datos() {
  const v = V(), est = intenta(() => v.estado(), {}), on = (await est)?.estado === 'encendida';
  const [stats, errores, pro, fotos, redes] = on ? await Promise.all([intenta(() => v.admin('stats')), intenta(() => v.admin('errores'), { errores: [] }), intenta(() => v.admin('pro-reportes'), { ocultos: [], rep: [] }), intenta(() => v.admin('fotos'), { fotos: [] }), intenta(() => v.admin('redes-campeones'), { redes: [] })]) : [null, { errores: [] }, { ocultos: [], rep: [] }, { fotos: [] }, { redes: [] }];
  const e = await est, hoy = day(), ayer = require('./util').addDays(hoy, -1), J = db.jobs || [];
  const dias = stats?.dias || [], vAyer = dias.find(x => x.d === ayer)?.n || 0, sem = dias.slice(-7).reduce((a, x) => a + x.n, 0), semAnt = dias.slice(-14, -7).reduce((a, x) => a + x.n, 0);
  const D = {
    pagina: { encendida: on, tunel: e?.tunel || '?', url: e?.url || null },
    visitas: { hoy: stats?.visitas?.hoy || 0, ayer: vAyer, semana: sem, semanaAnterior: semAnt, total: stats?.visitas?.total || 0 },
    subs: stats?.subs || { activos: 0, hoy: 0 }, paises: (stats?.paises || []).slice(0, 5), fuentes: (stats?.fuentes || []).slice(0, 6), juegos: (stats?.juegos || []).filter(x => x.game && x.game !== '-').slice(0, 6),
    videos: { ayer: J.filter(j => (j.created || '').startsWith(ayer)).length, revisar: J.filter(j => ['revisar', 'elegir'].includes(j.status)).length, error: J.filter(j => j.status === 'error').length,
      publicadosAyer: J.filter(j => Object.values(j.pub || {}).some(p => p.ok && (p.at || '').startsWith(ayer))).length },
    canales: (db.channels || []).filter(c => c.active).map(c => ({ nombre: c.name, subs: c.ytStats?.subs ?? null, vistas90: c.ytStats?.shortsViews90 || 0 })),
    alertas: [],
  };
  // 🛠️ Guardián
  if (!on) D.alertas.push('🔴 La página Yupitok está APAGADA. Enciéndela en ShortForge → Página viral.');
  else if (!/conectad/.test(String(D.pagina.tunel))) D.alertas.push('🟠 La página está encendida pero el túnel de internet no está conectado: desde fuera no se ve.');
  const errs = (errores?.errores || []).filter(x => x.ultimo >= ayer); if (errs.length) D.alertas.push(`🐞 ${errs.length} error(es) de jugadores desde ayer (Moderación). El más común: "${String(errs.sort((a, b) => b.n - a.n)[0].msg).slice(0, 80)}"`);
  if ((pro?.ocultos || []).length) D.alertas.push(`🕹️ ${pro.ocultos.length} juego(s) de GamePix ocultos por reportes "no carga": revísalos en Moderación.`);
  const fp = (fotos?.fotos || []).filter(f => f.estado === 'pendiente').length; if (fp) D.alertas.push(`📷 ${fp} foto(s) de perfil esperan tu revisión.`);
  const rp = (redes?.redes || []).filter(r => r.estado === 'pendiente').length; if (rp) D.alertas.push(`👑 ${rp} red(es) social(es) de campeones esperan tu aprobación.`);
  if (D.videos.error) D.alertas.push(`🎬 ${D.videos.error} video(s) con error en ShortForge.`);
  if (D.videos.revisar >= 5) D.alertas.push(`👀 ${D.videos.revisar} videos esperan tu revisión: si te gustan, activa la aprobación automática en esos canales.`);
  // 💰 Monetiza
  const mes = hoy.slice(0, 7), ing = M.ingresos.filter(x => x.fecha.startsWith(mes)), porFuente = {};
  for (const x of ing) porFuente[x.fuente] = (porFuente[x.fuente] || 0) + x.monto;
  D.ingresos = { mes, total: +ing.reduce((a, x) => a + x.monto, 0).toFixed(2), porFuente };
  D.consejos = consejos(D);
  return D;
}
function consejos(D) {
  const c = [], f = Object.fromEntries((D.fuentes || []).map(x => [x.source || 'directo', x.n])), tot = Object.values(f).reduce((a, b) => a + b, 0) || 1;
  const google = Object.entries(f).filter(([k]) => /google|bing|seo|buscador/i.test(k)).reduce((a, [, n]) => a + n, 0);
  if (google / tot < .1) c.push('🔎 Casi nadie llega desde Google todavía: es normal al inicio. Sigue subiendo videos con el link a yupitok.com y pide indexación en Search Console.');
  if (D.visitas.semanaAnterior && D.visitas.semana < D.visitas.semanaAnterior * .8) c.push('📉 Las visitas bajaron frente a la semana anterior: publica más videos con el final "Juega gratis en yupitok.com" y comparte el torneo de la semana.');
  if (D.visitas.semana > D.visitas.semanaAnterior * 1.2 && D.visitas.semanaAnterior) c.push('📈 ¡Las visitas subieron más de 20 % esta semana! Repite lo que hiciste: mismo tipo de videos y horarios.');
  if ((D.subs.activos || 0) < 100) c.push('🔔 Pocos suscriptores a notificaciones: el aviso de racha y el juego del día funcionan mejor con más gente. Pide en tus videos que activen las notificaciones.');
  const top = D.juegos[0]; if (top) c.push(`🎮 El juego más visitado es "${top.game}": haz videos y guías sobre ese juego, es lo que la gente busca.`);
  if (!D.ingresos.total) c.push('💰 Anota tus ingresos del mes (GamePix → Reports, AdSense) en este Centro de Mando para ver cómo crece el negocio.');
  return c.slice(0, 5);
}
function textoReporte(D) {
  const L = [`🧭 Reporte del Centro de Mando · ${day()}`,
    `📊 Visitas: ayer ${D.visitas.ayer} · semana ${D.visitas.semana}${D.visitas.semanaAnterior ? ` (antes ${D.visitas.semanaAnterior})` : ''} · total ${D.visitas.total}`,
    `🔔 Suscriptores: ${D.subs.activos || 0} (${D.subs.hoy || 0} nuevos hoy)`,
    `🎬 Videos: ${D.videos.ayer} hechos ayer · ${D.videos.publicadosAyer} publicados · ${D.videos.revisar} por revisar`];
  if (D.juegos.length) L.push('🎮 Más visitados: ' + D.juegos.slice(0, 3).map(x => `${x.game} (${x.n})`).join(', '));
  if (D.ingresos.total) L.push(`💰 Ingresos de ${D.ingresos.mes}: ${D.ingresos.total} USD`);
  L.push(D.alertas.length ? '🛠️ Guardián:\n' + D.alertas.map(a => '• ' + a).join('\n') : '🛠️ Guardián: todo en orden ✅');
  if (D.consejos.length) L.push('💡 Consejos:\n' + D.consejos.slice(0, 3).map(a => '• ' + a).join('\n'));
  const pend = M.links.filter(l => l.estado === 'nuevo' || l.estado === 'analizando').length; if (pend) L.push(`🎬 Creativo: ${pend} link(s) de YouTube por analizar`);
  return L.join('\n');
}
async function reporte(enviar) {
  const D = await datos(), txt = textoReporte(D);
  M.reportes.push({ at: new Date().toISOString(), dia: day(), texto: txt }); guardar();
  if (enviar) intenta(() => require('./avisos').avisar(txt));
  return { D, texto: txt };
}

// ---------- 🎬 Creativo: bandeja de links de YouTube ----------
const idYT = u => { const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/.exec(String(u)); return m ? m[1] : null; };
async function infoYT(id) {
  const o = await intenta(async () => (await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, { signal: AbortSignal.timeout(15000) })).json(), {});
  const info = { titulo: o.title || '', autor: o.author_name || '', descripcion: '', vistas: null, duracion: '' };
  // Con la API oficial de YouTube (usa la conexión de cualquiera de tus canales) se leen descripción, vistas y duración
  const P = require('./publish'), conectado = Object.keys(P.tokens?.google || {})[0];
  if (conectado) await intenta(async () => {
    const acc = await P.googleAccess(conectado), r = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${id}`, { headers: { authorization: 'Bearer ' + acc }, signal: AbortSignal.timeout(15000) })).json(), it = r.items?.[0];
    if (it) Object.assign(info, { titulo: it.snippet.title, autor: it.snippet.channelTitle, descripcion: String(it.snippet.description || '').slice(0, 1500), vistas: +it.statistics?.viewCount || null, duracion: it.contentDetails?.duration || '', etiquetas: (it.snippet.tags || []).slice(0, 12) });
  });
  return info;
}
const decidirP = (l, canales) => [{ role: 'user', content:
`Eres el agente Creativo de Yupitok (plataforma latina de juegos gratis, yupitok.com) y de sus canales de videos cortos.
Te pasan un video de YouTube de OTRO creador. Decide si vale la pena hacer un video NUEVO y 100 % ORIGINAL inspirado solo en su IDEA o estructura (nunca copiar su historia, diálogos, imágenes ni voz).
Video: título "${l.info.titulo}" · canal "${l.info.autor}" · vistas ${l.info.vistas ?? 'desconocidas'} · duración ${l.info.duracion || '?'}
Descripción: ${(l.info.descripcion || '').slice(0, 800) || '(sin descripción)'}
${l.transcripcion ? 'Transcripción (resumida): ' + l.transcripcion.slice(0, 2500) : ''}
${l.nota ? 'Nota del dueño: ' + l.nota : ''}
Canales disponibles (id: nombre — nicho):
${canales.map(c => `${c.id}: ${c.name} — ${c.niche || ''}`).join('\n')}
Reglas: di "dejar" si el tema no encaja con ningún canal, si depende de contenido con derechos (películas, música, marcas, famosos), si es para adultos, violento, político, de apuestas o engañoso, o si la idea es muy pobre.
Si encaja, elige el canal que mejor calce (prefiere "Yupitok" si es de juegos, retos o trivias) y propone una idea propia con un gancho fuerte.
Devuelve SOLO JSON: {"decision":"armar" o "dejar","canal":"id del canal o vacío","motivo":"1 frase en español","idea":"de qué tratará nuestro video ORIGINAL, 1-2 frases","gancho":"primera frase del video"}` }];
async function analizarLink(l) {
  l.estado = 'analizando'; guardar();
  try {
    l.info = await infoYT(l.vid);
    if (!l.info.titulo && !l.nota && !l.transcripcion) throw new Error('No pude leer ese video (¿es privado o el link está mal?). Escribe de qué trata en la nota y dale Reintentar');
    const canales = (db.channels || []).filter(c => c.active !== false);
    if (!canales.length) throw new Error('Crea primero un canal en ShortForge');
    const ai = require('./ai'); if (!ai.active().length) throw new Error('Falta una clave de IA en Ajustes');
    const r = await ai.ask(decidirP(l, canales), { json: true, max: 700 }), j = parseJSON(r.text) || {};
    l.decision = j.decision === 'armar' ? 'armar' : 'dejar'; l.motivo = String(j.motivo || '').slice(0, 300); l.idea = String(j.idea || '').slice(0, 400); l.gancho = String(j.gancho || '').slice(0, 200);
    l.canal = canales.find(c => c.id === j.canal)?.id || (l.decision === 'armar' ? (canales.find(c => /yupitok/i.test(c.name)) || canales[0]).id : '');
    l.estado = 'decidido';
    if (l.decision === 'armar' && l.auto) await armar(l);
  } catch (e) { l.estado = 'error'; l.motivo = e.message; }
  guardar(); return l;
}
async function armar(l) {
  const ch = (db.channels || []).find(c => c.id === l.canal); if (!ch) throw new Error('Elige un canal');
  const w = require('./worker'), base = [`Video de referencia (de otro creador, solo para inspirarse en la IDEA): "${l.info.titulo}" de ${l.info.autor}.`, l.info.descripcion ? 'Descripción: ' + l.info.descripcion : '', l.transcripcion ? 'Transcripción: ' + l.transcripcion : ''].filter(Boolean).join('\n');
  w.newJob(ch, { inspiration: { transcript: base.slice(0, 10000).padEnd(80, ' '), notes: [`Idea propia aprobada: ${l.idea}`, l.gancho ? `Gancho sugerido: ${l.gancho}` : '', 'Crea un video 100 % ORIGINAL: no copies la historia, los diálogos ni las imágenes del video de referencia.', /yupitok/i.test(ch.name) ? 'Termina invitando a jugar gratis en yupitok.com.' : ''].filter(Boolean).join(' ').slice(0, 1000) } });
  w.loop(); l.estado = 'armado'; l.armadoEn = new Date().toISOString(); guardar();
}
function nuevoLink({ url, nota, transcripcion, auto }) {
  const vid = idYT(url); if (!vid) throw new Error('Ese no parece un link de YouTube');
  if (M.links.some(l => l.vid === vid && l.estado !== 'error')) throw new Error('Ese video ya está en la bandeja');
  const l = { id: uid(), vid, url: `https://www.youtube.com/watch?v=${vid}`, nota: String(nota || '').slice(0, 500), transcripcion: String(transcripcion || '').slice(0, 10000), auto: auto !== false, estado: 'nuevo', creado: new Date().toISOString() };
  M.links.push(l); guardar(); setTimeout(() => analizarLink(l).catch(() => {}), 10); return l;
}
async function accionLink({ id, accion, canal }) {
  const l = M.links.find(x => x.id === id); if (!l) throw new Error('No existe');
  if (accion === 'borrar') { M.links = M.links.filter(x => x !== l); guardar(); return { ok: 1 }; }
  if (accion === 'reanalizar') { analizarLink(l).catch(() => {}); return { ok: 1 }; }
  if (accion === 'armar') { if (canal) l.canal = canal; if (!l.info) throw new Error('Espera a que termine el análisis'); await armar(l); return { ok: 1 }; }
  if (accion === 'dejar') { l.estado = 'dejado'; guardar(); return { ok: 1 }; }
  throw new Error('Acción no válida');
}
// ---------- 💰 ingresos que anotas ----------
function ingreso({ fuente, monto, fecha, nota }) {
  const m = +monto; if (!fuente || !isFinite(m) || m <= 0 || m > 1e6) throw new Error('Escribe la fuente y un monto válido (en dólares)');
  M.ingresos.push({ id: uid(), fuente: String(fuente).slice(0, 40), monto: +m.toFixed(2), fecha: /^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ? fecha : day(), nota: String(nota || '').slice(0, 120) }); guardar(); return { ok: 1 };
}
function borrarIngreso(id) { M.ingresos = M.ingresos.filter(x => x.id !== id); guardar(); return { ok: 1 }; }
async function estado() { return { links: M.links.slice().reverse(), ingresos: M.ingresos.slice().reverse().slice(0, 60), reportes: M.reportes.slice().reverse().slice(0, 7), datos: await intenta(() => datos(), null) }; }

// Reporte diario automático a las 8 am (Perú) por Telegram + análisis de links pendientes
function start() {
  setInterval(() => { const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hour12: false }).format(new Date());
    if (h >= 8 && db.settings.mandoReporte !== day()) { db.settings.mandoReporte = day(); require('./store').saveAll.settings(); reporte(true).catch(e => console.log('[Mando] ' + e.message)); }
    for (const l of M.links.filter(x => x.estado === 'nuevo')) analizarLink(l).catch(() => {});
  }, 10 * 60000).unref();
}
module.exports = { start, estado, reporte, nuevoLink, accionLink, ingreso, borrarIngreso, idYT };
