// 🧭 Centro de Mando de Yupitok: 4 agentes que hacen todo el trabajo gastando muy pocos créditos.
//  - 📊 Data (sin IA): visitas, juegos, suscriptores, canales y videos.
//  - 🛠️ Guardián (sin IA): errores de jugadores, juegos rotos, página caída, moderación pendiente, videos con error.
//  - 🎬 Creativo (IA solo al decidir): bandeja de links de YouTube → "🎬 lo armo" (video ORIGINAL inspirado en la idea) o "⏭️ lo dejo".
//  - 🌍 Embajador (sin IA): kit de difusión diario en ES/EN/PT, misiones para aparecer en todo el mundo, post diario en tu página de Facebook (opcional).
//  - 📣 Marketing (sin IA): meta de visitas, plan por fases, qué red trae más gente, campañas con enlace rastreable y mensajes para creadores.
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
    mes: stats?.mes || { n: 0, antes: 0, unicos: 0 }, fuentes30: stats?.fuentes30 || [], paises30: stats?.paises30 || [], referidos: stats?.referidos || 0,
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
  const p0 = (D.paises || [])[0]; if (p0 && p0.cc && HUSO[p0.cc] !== undefined) { const hl = ((19 - HUSO[p0.cc] - 5) % 24 + 24) % 24; c.push(`🌍 La mayoría de tus visitas llega de ${p0.pais}: publica tus videos y el kit del Embajador a las 7 pm de allá (${Math.floor(hl)}:${hl % 1 ? '30' : '00'} hora Perú).`); }
  if ((D.paises || []).length >= 2 && !(D.paises || []).some(x => ['US', 'GB', 'IN', 'PH', 'BR'].includes(x.cc))) c.push('🌎 Todavía casi no llegan visitas fuera de Latinoamérica: usa también los textos en inglés y portugués del Embajador.');
  if (!D.ingresos.total) c.push('💰 Anota tus ingresos del mes (GamePix → Reports, AdSense) en este Centro de Mando para ver cómo crece el negocio.');
  return c.slice(0, 6);
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
  try { const mk = marketing(D); L.splice(1, 0, `📣 Marketing: ${mk.mes.toLocaleString('es')} visitas en 30 días · meta ${mk.meta.toLocaleString('es')} (${mk.progreso} %)${mk.crecimiento !== null ? ` · crecimiento semanal ${mk.crecimiento > 0 ? '+' : ''}${mk.crecimiento} %` : ''}${mk.semanasMillon ? ` · a este ritmo, el millón llega en ${mk.semanasMillon} semanas` : ''}\n   Plan: ${mk.plan[0]}`); } catch (e) {}
  const mf = MISIONES.length - Object.keys(M.misiones || {}).length; L.push(`🌍 Embajador: tu kit de difusión de hoy (ES/EN/PT) está listo en el Centro de Mando${mf ? ` · te quedan ${mf} misiones para que el mundo te encuentre` : ''}`);
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
// ---------- 🌍 Embajador: trae gente de todo el mundo (0 créditos: todo con plantillas) ----------
// Cada día arma un "kit de difusión" listo para copiar y pegar en Facebook, TikTok/Reels/Shorts, X y WhatsApp,
// en español, inglés y portugués, con enlaces que dicen de qué red llegó cada visita (?src=…).
// Opcional: lo publica solo en TU página de Facebook (API oficial) y crea un short de Yupitok algunos días.
// Nunca usa bots, cuentas falsas, comentarios automáticos ni spam: solo publicaciones tuyas en tus redes.
const pub = async r => (await fetch('http://127.0.0.1:3300' + r, { signal: AbortSignal.timeout(8000) })).json();
const sitio = () => { try { const u = V().estado()?.url; if (/^https:\/\/(?!.*trycloudflare)[^/]+$/.test(String(u || '').replace(/\/$/, ''))) return u.replace(/\/$/, ''); } catch (e) {} return 'https://yupitok.com'; };
const ARC = { gusanito: 'Gusanito', bloques: 'Bloques', frutas: 'Frutas', ladrillos: 'Ladrillos', vuela: 'Vuela', corredor: 'Corredor', torre: 'Torre', n2048: '2048' };
const HUSO = { PE: -5, CO: -5, EC: -5, MX: -6, GT: -6, SV: -6, HN: -6, NI: -6, CR: -6, PA: -5, CU: -5, DO: -4, PR: -4, VE: -4, BO: -4, CL: -3, AR: -3, UY: -3, PY: -3, BR: -3, US: -5, ES: 1, PT: 0, GB: 0, PH: 8, IN: 5.5, ID: 7 };
const TAGS = { es: '#juegosgratis #juegos #gaming #yupitok', en: '#freegames #browsergames #gaming #yupitok', pt: '#jogosgratis #jogos #gaming #yupitok' };
const conSrc = (u, src) => u + (u.includes('?') ? '&' : '?') + 'src=' + src;
const diaLima = () => new Date(Date.now() - 5 * 3600e3).getUTCDay();
async function kitDelDia() {
  const S = sitio(), top = (await intenta(() => pub('/api/pro/top'), { top: [] }))?.top || [], tor = await intenta(() => pub('/api/torneo'), null);
  const g1 = top[0], tres = top.slice(0, 3), tj = ARC[tor?.juego] || 'Arcade', lider = tor?.top?.[0];
  const temas = [
    () => ({ tema: '👑 Salón de la Fama', path: '/campeones', pathEn: '/campeones?hl=en',
      es: `👑 ¿Quién será el próximo campeón de Yupitok? Cada mes los mejores entran al Salón de la Fama y muestran su red social. Juega gratis y quítales el trono 🎮`,
      en: `👑 Who will be the next Yupitok champion? Every month the top players enter the Hall of Fame. Play free and take their crown 🎮`,
      pt: `👑 Quem será o próximo campeão do Yupitok? Todo mês os melhores entram no Hall da Fama. Jogue grátis e roube a coroa 🎮` }),
    () => ({ tema: '🏆 Torneo de la semana', path: '/?g=arcade-' + (tor?.juego || 'gusanito'), pathEn: '/?g=arcade-' + (tor?.juego || 'gusanito') + '&hl=en',
      es: `🏆 ¡Empezó el torneo de la semana en ${tj}! Gratis para todos. Los 3 mejores ganan monedas y entran al ranking. ¿Te atreves? 🔥`,
      en: `🏆 This week's tournament is live: ${tj}! Free for everyone. Top 3 win coins and climb the ranking. Are you in? 🔥`,
      pt: `🏆 Começou o torneio da semana em ${tj}! Grátis para todos. Os 3 melhores ganham moedas. Topa o desafio? 🔥` }),
    () => tres.length ? ({ tema: '🔥 Top 3 más jugados', path: '/?g=pro', pathEn: '/en',
      es: `🔥 Los 3 juegos más jugados esta semana en Yupitok:\n${tres.map((g, i) => `${['🥇', '🥈', '🥉'][i]} ${g.t}`).join('\n')}\nGratis y sin instalar, en el celular o la PC 🎮`,
      en: `🔥 Top 3 most played games this week on Yupitok:\n${tres.map((g, i) => `${['🥇', '🥈', '🥉'][i]} ${g.t}`).join('\n')}\nFree, no download, on mobile or PC 🎮`,
      pt: `🔥 Os 3 jogos mais jogados da semana no Yupitok:\n${tres.map((g, i) => `${['🥇', '🥈', '🥉'][i]} ${g.t}`).join('\n')}\nGrátis, sem instalar, no celular ou PC 🎮` }) : null,
    () => ({ tema: '👑 GLORY BROWN', path: '/glory', pathEn: '/glory?hl=en',
      es: `⚔️ GLORY BROWN: batallas de cartas en línea 1 vs 1 y 2 vs 2 con 127 personajes. Hecho en Perú 🇵🇪 y gratis. ¿Quién gana, tú o tu amigo?`,
      en: `⚔️ GLORY BROWN: online card battles, 1v1 and 2v2, with 127 characters. Made in Peru 🇵🇪 and free. Who wins, you or your friend?`,
      pt: `⚔️ GLORY BROWN: batalhas de cartas online 1x1 e 2x2 com 127 personagens. Feito no Peru 🇵🇪 e grátis. Quem vence, você ou seu amigo?` }),
    () => g1 ? ({ tema: '🎮 Juego estrella', path: '/juego/' + g1.s, pathEn: '/en/game/' + g1.s,
      es: `🎮 El juego del momento: ${g1.t}. Gratis, sin descargar nada, directo en tu navegador. ¿Cuánto aguantas? 👇`,
      en: `🎮 Game of the moment: ${g1.t}. Free, no download, right in your browser. How far can you go? 👇`,
      pt: `🎮 O jogo do momento: ${g1.t}. Grátis, sem baixar nada, direto no navegador. Até onde você chega? 👇` }) : null,
    () => ({ tema: '⚡ Reto de récord', path: '/?g=arcade-' + (tor?.juego || 'gusanito'), pathEn: '/?g=arcade-' + (tor?.juego || 'gusanito') + '&hl=en',
      es: lider ? `⚡ ${lider.nombre} va primero en ${tj} con ${lider.puntos} puntos. ¿Alguien lo puede superar? Gratis en Yupitok 👇` : `⚡ Reto del viernes: juega ${tj} y comparte tu récord. ¿Quién de tus amigos te gana? 👇`,
      en: lider ? `⚡ ${lider.nombre} leads ${tj} with ${lider.puntos} points. Can anyone beat that? Free on Yupitok 👇` : `⚡ Friday challenge: play ${tj} and share your high score. Which friend can beat you? 👇`,
      pt: lider ? `⚡ ${lider.nombre} lidera ${tj} com ${lider.puntos} pontos. Alguém consegue superar? Grátis no Yupitok 👇` : `⚡ Desafio de sexta: jogue ${tj} e compartilhe seu recorde. Qual amigo te vence? 👇` }),
    () => ({ tema: '🌱 Juegos para la familia', path: '/?g=arcade-huerto', pathEn: '/?g=arcade-huerto&hl=en',
      es: `🌱 Fin de semana en familia: Huerto Defensor, Joyas y juegos educativos (tablas, inglés, ortografía). Todo gratis 💛`,
      en: `🌱 Family weekend: Garden Defender, Jewels and learning games (times tables, spelling and more). All free 💛`,
      pt: `🌱 Fim de semana em família: Huerto Defensor, Joias e jogos educativos (tabuada, ortografia e mais). Tudo grátis 💛` }),
  ];
  const d = diaLima(); let t = null; for (let i = 0; i < 7 && !t; i++) t = temas[(d + i) % 7]();
  const L = (lang, red, src) => { const base = lang === 'en' ? S + t.pathEn : lang === 'pt' ? S + t.path + (t.path.includes('?') ? '&' : '?') + 'hl=pt' : S + t.path; return conSrc(base, src); };
  const arma = lang => ({
    facebook: `${t[lang]}\n\n👉 ${L(lang, 'facebook', 'fb')}\n\n${TAGS[lang]}`,
    tiktok: `${t[lang]}\n${lang === 'en' ? 'Link in bio' : lang === 'pt' ? 'Link na bio' : 'Link en mi perfil'} 🔗 ${TAGS[lang]} #fyp`,
    x: `${t[lang].replace(/\n/g, ' ').slice(0, 200)} ${L(lang, 'x', 'x')}`,
    whatsapp: `${t[lang]}\n${L(lang, 'whatsapp', 'whatsapp')}`,
  });
  return { dia: day(), tema: t.tema, textos: { es: arma('es'), en: arma('en'), pt: arma('pt') }, bio: S + '/?src=bio' };
}
// Misiones (las haces tú, una vez): lugares legítimos para que el mundo encuentre Yupitok
const MISIONES = [
  ['sitemap', '🔎 Search Console: vuelve a enviar el sitemap (ahora trae miles de páginas en inglés)', 'https://search.google.com/search-console/sitemaps'],
  ['bing', '🅱️ Bing Webmaster: "Importar" desde Search Console (Bing también alimenta a ChatGPT, DuckDuckGo y Yahoo)', 'https://www.bing.com/webmasters'],
  ['yandex', '🌐 Yandex Webmaster: agrega yupitok.com (buscador #1 en Rusia y fuerte en Turquía)', 'https://webmaster.yandex.com'],
  ['ytlink', '▶️ YouTube: pon yupitok.com en "Enlaces" del canal y en la descripción de cada video', 'https://studio.youtube.com'],
  ['fbboton', '📘 Facebook: agrega el botón "Jugar juego" o "Más información" → yupitok.com en tu página', 'https://www.facebook.com/yupitokoficial'],
  ['tiktok', '🎵 Crea la cuenta de TikTok de Yupitok y pon el link en el perfil (los shorts de ShortForge sirven igual)', 'https://www.tiktok.com/signup'],
  ['insta', '📸 Crea el Instagram de Yupitok (Reels con los mismos videos) y link en la bio', 'https://www.instagram.com/accounts/emailsignup/'],
  ['wa', '💬 Crea un Canal de WhatsApp "Yupitok" y comparte ahí el kit del día', 'https://www.whatsapp.com/channel'],
  ['pinterest', '📌 Pinterest empresa: crea tableros "Juegos gratis" y "Juegos educativos" y pinea 5 juegos (trae visitas por meses)', 'https://business.pinterest.com'],
  ['itch', '🕹️ Publica GLORY BROWN en itch.io (es TUYO) con el enlace a Yupitok: allí lo ven jugadores de todo el mundo', 'https://itch.io/game/new'],
  ['reddit', '👽 Reddit r/WebGames: comparte UN juego propio (Huerto o GLORY), lee las reglas y responde comentarios. Una vez, no spam', 'https://www.reddit.com/r/WebGames/'],
  ['docentes', '🍎 Comparte los juegos educativos con 3 profesores o grupos de docentes que permitan compartir recursos', ''],
];
function misiones() { const h = M.misiones || {}; return MISIONES.map(([id, txt, url]) => ({ id, txt, url, hecha: !!h[id] })); }
function misionHecha(id, v) { M.misiones = M.misiones || {}; if (v) M.misiones[id] = day(); else delete M.misiones[id]; guardar(); return { ok: 1 }; }
const AJ = () => Object.assign({ fbAuto: false, hora: 19, shortsSemana: 0 }, db.settings.embajador || {});
function ajustesEmbajador(o) { const a = AJ(); if (o.fbAuto !== undefined) a.fbAuto = !!o.fbAuto; if (o.hora !== undefined) a.hora = Math.max(6, Math.min(23, +o.hora || 19)); if (o.shortsSemana !== undefined) a.shortsSemana = [0, 2, 3, 7].includes(+o.shortsSemana) ? +o.shortsSemana : 0; db.settings.embajador = a; require('./store').saveAll.settings(); return a; }
function paginaFB() { const P = require('./publish'), pages = P.tokens?.facebook?.pages || [], ch = (db.channels || []).find(c => /yupitok/i.test(c.name)); return pages.find(p => p.id === ch?.fbPageId) || pages.find(p => /yupitok/i.test(p.name)) || null; }
async function publicarFB() {
  const pg = paginaFB(); if (!pg) throw new Error('Conecta Facebook en Ajustes → Publicación (página Yupitok)');
  const k = await kitDelDia(), txt = k.textos.es.facebook, link = (/(https:\/\/\S+)/.exec(txt) || [])[1];
  const r = await (await fetch(`https://graph.facebook.com/${pg.id}/feed`, { method: 'POST', body: new URLSearchParams({ access_token: pg.token, message: txt.replace(link, '').replace(/\n{3,}/g, '\n\n').trim(), link }) })).json();
  if (r.error) throw new Error('Facebook: ' + r.error.message);
  M.difusion = M.difusion || []; M.difusion.push({ at: new Date().toISOString(), red: 'facebook', tema: k.tema, id: r.id }); M.difusion = M.difusion.slice(-60); guardar(); return { ok: 1, id: r.id };
}
async function shortYupitok() {
  const ch = (db.channels || []).find(c => /yupitok/i.test(c.name) && c.active !== false); if (!ch) throw new Error('Crea el canal "Yupitok" en ShortForge');
  const top = ((await intenta(() => pub('/api/pro/top'), { top: [] }))?.top || []).slice(0, 3), d = diaLima();
  const ideas = [top.length >= 3 ? `Top 3 juegos gratis más jugados esta semana en Yupitok: ${top.map(g => g.t).join(', ')}. Muestra qué hace divertido a cada uno` : 'Los 3 juegos gratis más divertidos para jugar con amigos sin instalar nada',
    'Trivia rápida: 5 preguntas de cultura general, cuenta regresiva de 3 segundos en cada una, y reta al público a decir su puntaje en los comentarios',
    'GLORY BROWN: 3 trucos para ganar las batallas de cartas en línea (elige bien tus personajes, guarda la energía, ataca en el momento justo)',
    'Huerto Defensor: cómo defender tu chacra de las plagas con choclos, cocos y ajíes, explicado en 30 segundos',
    '¿Cuánto sabes de matemáticas? 5 multiplicaciones cada vez más difíciles, en 3 segundos cada una'];
  const w = require('./worker'); w.newJob(ch, { topic: ideas[d % ideas.length] + '. Termina con: ¡Juega gratis en yupitok.com!' }); w.loop();
  M.difusion = M.difusion || []; M.difusion.push({ at: new Date().toISOString(), red: 'short', tema: ideas[d % ideas.length].slice(0, 80) }); guardar(); return { ok: 1 };
}
async function embajador() { return { kit: await intenta(() => kitDelDia(), null), misiones: misiones(), ajustes: AJ(), fb: paginaFB()?.name || null, historial: (M.difusion || []).slice().reverse().slice(0, 10) }; }
function tickEmbajador() {
  const a = AJ(), h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hour12: false }).format(new Date()), hoy = day();
  if (a.fbAuto && h >= a.hora && db.settings.embFB !== hoy && paginaFB()) { db.settings.embFB = hoy; require('./store').saveAll.settings(); publicarFB().catch(e => console.log('[Embajador] ' + e.message)); }
  const dias = { 2: [2, 5], 3: [1, 3, 5], 7: [0, 1, 2, 3, 4, 5, 6] }[a.shortsSemana] || [];
  if (dias.includes(diaLima()) && h >= 9 && db.settings.embShort !== hoy) { db.settings.embShort = hoy; require('./store').saveAll.settings(); shortYupitok().catch(e => console.log('[Embajador] ' + e.message)); }
}
// ---------- 📣 Marketing: el estratega de los millones de visitas (0 créditos: reglas + tus números) ----------
// Pone la meta del mes, mide qué red trae más gente, arma el plan de la semana según la fase en que estás,
// y te da enlaces rastreables para campañas, creadores y anuncios (así sabes cuánta gente trajo cada uno).
const ESCALONES = [1000, 10000, 50000, 100000, 300000, 1000000, 3000000, 10000000];
const RED_DE = s => { s = String(s || 'directo'); if (/^c-/.test(s)) return '🎯 Campañas'; if (/^web-(en|pt|fr|de|it|id)$/.test(s)) return '🌍 Páginas en otros idiomas'; const m = { fb: '📘 Facebook', facebook: '📘 Facebook', x: '𝕏 X', whatsapp: '💬 WhatsApp', bio: '🔗 Bio TikTok/Instagram', tiktok: '🎵 TikTok', instagram: '📸 Instagram', youtube: '▶️ YouTube', yt: '▶️ YouTube', google: '🔎 Google', bing: '🔎 Bing', yandex: '🔎 Yandex', duckduckgo: '🔎 DuckDuckGo', yahoo: '🔎 Yahoo', chatgpt: '🤖 ChatGPT', reddit: '👽 Reddit', pinterest: '📌 Pinterest', itch: '🕹️ itch.io', invitacion: '🎁 Invitaciones de jugadores', push: '🔔 Notificaciones', compartido: '📤 Compartidos por jugadores', reto: '⚡ Retos entre amigos', directo: '🚪 Directo / sin rastrear' }; return m[s] || (/^web-/.test(s) ? '🌐 Otras webs' : '📤 ' + s); };
const FASES = [
  { hasta: 1000, nombre: '🌱 Fase 1 · Semilla', meta: 'llegar a 1,000 visitas al mes', plan: ['🎬 1 video corto al día con el final "¡Juega gratis en yupitok.com!" (ShortForge lo hace solo).', '📋 Pega cada día el kit del Embajador en Facebook, WhatsApp y TikTok (2 minutos).', '👨‍👩‍👧 Pide a 20 amigos y familiares que jueguen y usen el botón "Retar": cada reto trae gente nueva.', '🎯 Termina las misiones del Embajador (Bing, Yandex, Pinterest, itch.io).'] },
  { hasta: 10000, nombre: '🚀 Fase 2 · Tracción', meta: 'llegar a 10,000 visitas al mes', plan: ['📈 Duplica la red que más gente te trae (mira "De dónde llegan") y publica ahí 2 veces al día.', '🤝 Escribe a 3 creadores pequeños de juegos (1k–50k seguidores) con el mensaje de abajo: torneo con su nombre + link propio.', '🏆 Promociona el torneo de la semana todos los lunes: es tu mejor gancho para que vuelvan.', '📝 Publica 1 guía nueva por semana (Google premia el contenido útil).'] },
  { hasta: 100000, nombre: '🔥 Fase 3 · Escala', meta: 'llegar a 100,000 visitas al mes', plan: ['💸 Prueba anuncios pequeños (3–5 USD al día en Meta Ads) solo en el país que más juega, con un enlace de campaña para medirlo. Si cada visita te cuesta menos de lo que ganas con GamePix por visita, sube el presupuesto.', '🌍 Empuja las páginas en otros idiomas: publica el kit en inglés y portugués en grupos y comunidades de esos países.', '🤝 Pasa a creadores medianos (50k–500k): ofréceles torneos patrocinados con premio que tú entregues.', '📱 Publica Yupitok como app en Google Play (TWA, pago único de 25 USD): más confianza y búsquedas dentro de Play.'] },
  { hasta: 1e12, nombre: '👑 Fase 4 · Marca mundial', meta: 'pasar el millón de visitas al mes', plan: ['📰 Envía una nota de prensa a medios de tecnología y gaming de Latinoamérica: "El juego peruano GLORY BROWN…".', '🏢 Busca patrocinadores (marcas de snacks, telefonía, gaming) para los premios de torneos.', '🌐 Abre más idiomas y un canal de YouTube en inglés con los mismos shorts.', '🎮 Saca un juego propio nuevo cada mes: lo exclusivo es lo que hace volver a la gente.'] },
];
const MENSAJE_CREADOR = {
  es: (n, l) => `¡Hola ${n}! 👋 Soy Jose, de Yupitok (yupitok.com), una plataforma peruana de juegos gratis.\nMe gusta tu contenido y te propongo algo sin costo: un TORNEO con tu nombre en Yupitok. Tus seguidores juegan gratis, los 3 mejores ganan premios en el juego y el campeón aparece en nuestro Salón de la Fama con su red social.\nTe doy tu enlace propio para que veas cuántos llegan: ${l}\n¿Te animas? 🎮`,
  en: (n, l) => `Hi ${n}! 👋 I'm Jose from Yupitok (yupitok.com), a free games platform made in Peru.\nI love your content and I'd like to offer you something free: a TOURNAMENT with your name on Yupitok. Your followers play for free, the top 3 win in-game prizes and the champion is featured in our Hall of Fame with their social handle.\nHere's your own link so you can see how many people you bring: ${l}\nWould you be up for it? 🎮`,
  pt: (n, l) => `Olá ${n}! 👋 Sou o Jose, do Yupitok (yupitok.com), uma plataforma peruana de jogos grátis.\nCurto seu conteúdo e quero te propor algo sem custo: um TORNEIO com o seu nome no Yupitok. Seus seguidores jogam grátis, os 3 melhores ganham prêmios no jogo e o campeão aparece no nosso Hall da Fama com a rede social dele.\nAqui está seu link próprio para ver quantos chegam: ${l}\nTopa? 🎮`,
};
function marketing(D) {
  const mes = D.mes?.n || 0, antes = D.mes?.antes || 0, sem = D.visitas?.semana || 0, semA = D.visitas?.semanaAnterior || 0;
  const meta = ESCALONES.find(x => x > mes) || ESCALONES.at(-1), fase = FASES.find(f => mes < f.hasta);
  const g = semA > 0 ? sem / semA - 1 : null;
  const semanas = g > 0.01 && mes > 0 ? Math.ceil(Math.log(meta / mes) / Math.log(1 + g)) : null;
  const semanasMillon = g > 0.01 && mes > 0 && mes < 1e6 ? Math.ceil(Math.log(1e6 / mes) / Math.log(1 + g)) : null;
  const redes = {}; for (const f of D.fuentes30 || []) { const r = RED_DE(f.source); redes[r] = (redes[r] || 0) + f.n; }
  const ranking = Object.entries(redes).sort((a, b) => b[1] - a[1]).map(([red, n]) => ({ red, n, pct: mes ? Math.round(n * 100 / Math.max(1, Object.values(redes).reduce((a, b) => a + b, 0))) : 0 }));
  const campanas = (M.campanas || []).map(c => ({ ...c, visitas: (D.fuentes30 || []).find(f => f.source === 'c-' + c.slug)?.n || 0 })).reverse();
  const foco = []; const mejor = ranking.find(r => !/Directo/.test(r.red));
  if (mejor) foco.push(`📈 Tu mejor red este mes es ${mejor.red} (${mejor.n} visitas): dale más ahí.`);
  const ext = (D.paises30 || []).find(p => !['PE', 'MX', 'CO', 'AR', 'CL', 'EC', 'BO', 'VE', 'UY', 'PY', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'DO', 'CU', 'PR', 'ES'].includes(p.cc) && p.cc);
  if (ext) foco.push(`🌍 Ya llega gente de ${ext.pais} (${ext.n}): comparte el kit en ${ext.cc === 'BR' || ext.cc === 'PT' ? 'portugués' : ['FR', 'BE', 'CA'].includes(ext.cc) ? 'francés' : ext.cc === 'DE' || ext.cc === 'AT' ? 'alemán' : ext.cc === 'IT' ? 'italiano' : ext.cc === 'ID' ? 'indonesio' : 'inglés'} y en comunidades de ese país.`);
  if (mes > 200 && (D.referidos || 0) / mes < 0.03) foco.push('🎁 Pocas visitas llegan por invitaciones de jugadores: recuerda en tus videos que invitar amigos da premios.');
  if (mes > 200 && (D.subs?.activos || 0) / Math.max(1, D.mes?.unicos || mes) < 0.02) foco.push('🔔 Menos del 2 % activa notificaciones: son visitas gratis que vuelven cada día. Pídelo en los videos.');
  if (g !== null && g < 0) foco.push('📉 Esta semana bajaron las visitas: vuelve a lo que funcionó (revisa la red que más trajo el mes pasado).');
  return { mes, antes, meta, fase: fase.nombre, metaTexto: fase.meta, plan: fase.plan, foco: foco.slice(0, 4), crecimiento: g === null ? null : Math.round(g * 100), semanas, semanasMillon, ranking: ranking.slice(0, 10), campanas, progreso: Math.min(100, Math.round(mes * 100 / meta)) };
}
function nuevaCampana({ nombre, tipo, destino }) {
  const n = String(nombre || '').trim().slice(0, 40); if (n.length < 2) throw new Error('Ponle un nombre (ej: "creador Juanito" o "anuncio México")');
  const slug = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || uid().slice(0, 6);
  M.campanas = M.campanas || []; if (M.campanas.some(c => c.slug === slug)) throw new Error('Ya tienes una campaña con ese nombre');
  const DEST = { inicio: '/', glory: '/glory', juegos: '/juegos', torneo: '/campeones', en: '/en', pt: '/pt' }, d = DEST[destino] || '/';
  const link = sitio() + d + (d.includes('?') ? '&' : '?') + 'src=c-' + slug;
  M.campanas.push({ id: uid(), nombre: n, slug, tipo: ['creador', 'grupo', 'anuncio', 'otro'].includes(tipo) ? tipo : 'otro', link, creado: day() });
  M.campanas = M.campanas.slice(-100); guardar(); return { ok: 1 };
}
function borrarCampana(id) { M.campanas = (M.campanas || []).filter(c => c.id !== id); guardar(); return { ok: 1 }; }
// ---------- 📝 Creativo: borradores de guías para Google (1 consulta de IA por guía; TÚ apruebas antes de publicar) ----------
async function sugerirGuias() {
  const top = ((await intenta(() => pub('/api/pro/top'), { top: [] }))?.top || []).slice(0, 6), hechas = new Set((M.guias || []).map(g => g.tema.toLowerCase()));
  const ideas = [...top.slice(0, 3).map(g => `Cómo jugar ${g.t}: trucos y consejos`), ...[...new Set(top.map(g => g.cat))].slice(0, 2).map(c => `Los mejores juegos de ${String(c).toLowerCase()} gratis para el celular`),
    'Trucos para el gusanito (snake): cómo hacer récord', 'Cómo ganar en Huerto Defensor: los mejores defensores para cada plaga', 'Juegos de palabras gratis para mejorar la ortografía', 'Juegos para jugar en el recreo o en el trabajo (partidas de 1 minuto)', 'Sudoku para principiantes: reglas y trucos', 'Trivia de Perú: 20 preguntas de cultura peruana', 'Juegos gratis sin internet lento: los más livianos'];
  return ideas.filter(t => !hechas.has(t.toLowerCase())).slice(0, 8);
}
const guiaP = (tema, juegos, guias) => [{ role: 'user', content:
`Escribe una GUÍA en español latino para la web de juegos gratis Yupitok (yupitok.com) sobre: "${tema}".
Objetivo: que sea útil de verdad para quien la busca en Google (contenido original, claro y honesto, 500–800 palabras).
Reglas:
- No inventes funciones de Yupitok. Solo puedes mencionar: juegos gratis sin instalar en celular y PC; miles de juegos de estudios externos; juegos propios (GLORY BROWN batallas de cartas 1v1 y 2v2, Huerto Defensor, Joyas, Islas Portal 3D, arcade clásicos); premio diario; torneo semanal gratis con monedas del juego; Salón de la Fama mensual; botón Retar para desafiar amigos; juegos educativos por niveles y cristianos.
- Si hablas de un juego de otro estudio, explica cómo se juega en general sin inventar datos específicos (niveles exactos, personajes, cifras).
- Nada de relleno ni repetir palabras clave. Frases cortas.
- HTML simple: solo <p>, <h2>, <h3>, <ul>, <ol>, <li>, <b>, <i> y enlaces internos <a href="/...">. Nada de <h1>, imágenes, estilos ni scripts.
- Puedes enlazar (si encaja) a estas guías: ${guias.slice(0, 15).map(g => '/guias/' + g).join(', ')} y a /juegos.
Juegos de Yupitok que puedes poner como "juego" principal (id: nombre): ${juegos.slice(0, 60).map(j => `${j.id}: ${j.t}`).join(' | ')}
Devuelve SOLO JSON: {"titulo":"máx 70 caracteres, atractivo y con la búsqueda principal","desc":"meta descripción de 140–160 caracteres","emoji":"1 emoji","juego":"id de la lista o vacío","html":"el contenido en HTML"}` }];
async function escribirGuia(gu) {
  gu.estado = 'escribiendo'; guardar();
  try {
    const ai = require('./ai'); if (!ai.active().length) throw new Error('Falta una clave de IA en Ajustes');
    const tests = await intenta(async () => (await fetch('http://127.0.0.1:3300/tests.json', { signal: AbortSignal.timeout(8000) })).json(), []), juegos = (Array.isArray(tests) ? tests : tests.tests || []).filter(t => /^(arcade|juego|edu|fe|trivia)-/.test(t.id)).map(t => ({ id: t.id, t: t.t }));
    const ex = await intenta(() => V().admin('guias-extra'), { guias: [] }), slugs = (ex?.guias || []).map(g => g.slug).concat(['como-ganar-en-glory-brown', 'guia-huerto-defensor', 'mejores-juegos-gratis-sin-instalar', 'juegos-para-aprender-tablas-de-multiplicar', 'premios-torneos-y-salon-de-la-fama', 'trucos-para-ganar-en-2048', 'como-jugar-buscaminas-y-ganar', 'juegos-para-jugar-con-amigos-online-gratis', 'estrategia-cuatro-en-linea', 'trivia-biblica-preguntas-y-respuestas', 'juegos-educativos-gratis-por-niveles']);
    const r = await ai.ask(guiaP(gu.tema, juegos, slugs), { json: true, max: 3000 }), j = parseJSON(r.text) || {};
    if (!j.titulo || !j.html || String(j.html).length < 600) throw new Error('La IA no devolvió una guía completa. Dale "Rehacer".');
    gu.g = { titulo: String(j.titulo).slice(0, 110), desc: String(j.desc || '').slice(0, 200), emoji: String(j.emoji || '📝').slice(0, 4), juego: juegos.some(x => x.id === j.juego) ? j.juego : '', html: String(j.html).slice(0, 20000) };
    gu.palabras = String(j.html).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length; gu.estado = 'borrador';
  } catch (e) { gu.estado = 'error'; gu.motivo = e.message; }
  guardar(); return gu;
}
function nuevaGuia({ tema }) {
  const t = String(tema || '').trim().slice(0, 140); if (t.length < 8) throw new Error('Escribe el tema de la guía (ej: "Trucos para ganar en el gusanito")');
  M.guias = M.guias || []; const gu = { id: uid(), tema: t, estado: 'nuevo', creado: day() }; M.guias.push(gu); M.guias = M.guias.slice(-60); guardar();
  setTimeout(() => escribirGuia(gu).catch(() => {}), 10); return gu;
}
async function accionGuia({ id, accion }) {
  const gu = (M.guias || []).find(x => x.id === id); if (!gu) throw new Error('No existe');
  if (accion === 'borrar') { if (gu.slug) await intenta(() => V().admin('guias-extra/borrar', { slug: gu.slug })); M.guias = M.guias.filter(x => x !== gu); guardar(); return { ok: 1 }; }
  if (accion === 'rehacer') { escribirGuia(gu).catch(() => {}); return { ok: 1 }; }
  if (accion === 'publicar') { if (gu.estado !== 'borrador' || !gu.g) throw new Error('Esta guía no está lista');
    const r = await V().admin('guias-extra/guardar', gu.g); gu.estado = 'publicada'; gu.url = r.url; gu.slug = r.url.split('/guias/')[1]; gu.publicada = day(); guardar(); return { ok: 1, url: r.url }; }
  throw new Error('Acción no válida');
}
// ---------- 🎬 Clips del día para Google Flow (1 consulta de IA de texto al día, casi gratis) ----------
// Tú pegas los prompts en Flow (tu plan de 4 USD/mes), descargas los clips en entrada/<canal>/unir y ShortForge arma el video solo.
const BIBLIA = `CHARACTER BIBLE (always describe them exactly like this, they are ORIGINAL characters):
- YUPI: cute 3D cartoon mascot shaped like a big yellow letter "Y", large blue eyes, small golden crown with blue gems, white cartoon gloves, white sneakers, big friendly smile, Pixar-style 3D render.
- GLORY BROWN QUEEN: elegant elf queen with long silver hair, golden crown, dark blue and gold ornate armor, glowing blue crystal staff, fantasy castle background.
- GARDEN DEFENDERS (Huerto Defensor): smiling corn cob warrior, cute blue mushroom that shoots water bubbles, sturdy coconut shield; enemies: armored brown beetles, slow snails, green worms; grassy tile garden with a wooden fence and a small house.
- WORLD: neon arcade galaxy with floating portals, game screens, stars and floating islands; colorful, joyful, family friendly.`;
const TEMAS_FLOW = ['Yupi abre un portal y presenta Yupitok: miles de juegos gratis', 'Batalla épica de GLORY BROWN: la reina defiende su castillo', 'Huerto Defensor: los defensores salvan la chacra de la plaga', 'Yupi gana la copa del torneo de la semana y entra al Salón de la Fama', 'Reto: ¿quién llega más lejos? Yupi desafía a sus amigos', 'Yupi viaja por mundos de juegos: carreras, puzzles y aventuras', 'Premio diario: Yupi abre un cofre de monedas cada día'];
const flowP = (tema, n) => [{ role: 'user', content:
`Eres director creativo de shorts virales para Yupitok (yupitok.com, juegos gratis). Diseña UN video vertical de ${n} clips de 8–10 s para generarlos en Google Flow (Veo). Tema: "${tema}".
${BIBLIA}
Reglas:
- Una historia con hilo: el clip 1 es un GANCHO visual fuerte (algo sorprendente en el primer segundo), los del medio desarrollan, el último es un final épico con Yupi celebrando (ahí el sistema pondrá "¡Juega gratis en yupitok.com!").
- Cada prompt en INGLÉS, autocontenido (repite la descripción de los personajes que salen), con: acción concreta, movimiento de cámara, iluminación, estilo "3D animated, Pixar-like, vibrant colors", "vertical 9:16".
- PROHIBIDO: personajes, logos o estilos de franquicias existentes (Disney, Pixar characters, Nintendo, Pokémon, Monsters Inc, Plants vs Zombies, Clash Royale, etc.), texto o letras dentro del video, violencia gráfica, sangre.
- Que los clips encajen entre sí (mismo estilo, misma luz, continuidad de personajes).
Devuelve SOLO JSON: {"titulo":"título corto en español","idea":"la historia en 1–2 frases en español","clips":[{"n":1,"prompt":"prompt en inglés","que_pasa":"qué pasa, en español, 1 frase"}]}` }];
async function flowGuion(tema, auto) {
  const ai = require('./ai'); if (!ai.active().length) throw new Error('Falta una clave de IA en Ajustes');
  const t = String(tema || '').trim().slice(0, 160) || TEMAS_FLOW[diaLima() % TEMAS_FLOW.length];
  const r = await ai.ask(flowP(t, 6), { json: true, max: 2500 }), j = parseJSON(r.text) || {};
  const clips = (j.clips || []).filter(c => c && c.prompt).slice(0, 6).map((c, i) => ({ n: i + 1, prompt: String(c.prompt).slice(0, 1200), que_pasa: String(c.que_pasa || '').slice(0, 200) }));
  if (clips.length < 3) throw new Error('La IA no devolvió los clips. Prueba otra vez.');
  M.flow = M.flow || []; const g = { id: uid(), dia: day(), tema: t, titulo: String(j.titulo || t).slice(0, 100), idea: String(j.idea || '').slice(0, 400), clips, auto: !!auto };
  M.flow.push(g); M.flow = M.flow.slice(-14); guardar(); return g;
}
function carpetaUnir() { try { const ch = (db.channels || []).find(c => /yupitok/i.test(c.name)) || (db.channels || [])[0]; if (!ch) return null; return path.join(require('./worker').INBOX, ch.name.replace(/[<>:"/\\|?*]/g, '').trim(), 'unir'); } catch (e) { return null; } }
// ---------- 💰 ingresos que anotas ----------
function ingreso({ fuente, monto, fecha, nota }) {
  const m = +monto; if (!fuente || !isFinite(m) || m <= 0 || m > 1e6) throw new Error('Escribe la fuente y un monto válido (en dólares)');
  M.ingresos.push({ id: uid(), fuente: String(fuente).slice(0, 40), monto: +m.toFixed(2), fecha: /^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ? fecha : day(), nota: String(nota || '').slice(0, 120) }); guardar(); return { ok: 1 };
}
function borrarIngreso(id) { M.ingresos = M.ingresos.filter(x => x.id !== id); guardar(); return { ok: 1 }; }
async function estado() { const D = await intenta(() => datos(), null); return { flow: (M.flow || []).slice().reverse().slice(0, 5), flowTemas: TEMAS_FLOW, carpetaUnir: carpetaUnir(), guias: (M.guias || []).slice().reverse(), ideasGuias: await intenta(() => sugerirGuias(), []), marketing: D ? await intenta(() => marketing(D), null) : null, mensajes: Object.fromEntries(Object.entries(MENSAJE_CREADOR).map(([l, f]) => [l, f('{nombre}', '{link}')])), embajador: await intenta(() => embajador(), null), links: M.links.slice().reverse(), ingresos: M.ingresos.slice().reverse().slice(0, 60), reportes: M.reportes.slice().reverse().slice(0, 7), datos: D }; }

// Reporte diario automático a las 8 am (Perú) por Telegram + análisis de links pendientes
function start() {
  setInterval(() => { const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hour12: false }).format(new Date());
    if (h >= 8 && db.settings.mandoReporte !== day()) { db.settings.mandoReporte = day(); require('./store').saveAll.settings(); reporte(true).catch(e => console.log('[Mando] ' + e.message)); }
    for (const l of M.links.filter(x => x.estado === 'nuevo')) analizarLink(l).catch(() => {});
    for (const g of (M.guias || []).filter(x => x.estado === 'nuevo')) escribirGuia(g).catch(() => {});
    if (h >= 7 && db.settings.mandoFlow !== day() && db.settings.flowAuto !== false && (db.channels || []).some(c => /yupitok/i.test(c.name)) && require('./ai').active().length) { db.settings.mandoFlow = day(); require('./store').saveAll.settings(); flowGuion('', true).catch(e => console.log('[Flow] ' + e.message)); }
    try { tickEmbajador(); } catch (e) { console.log('[Embajador] ' + e.message); }
  }, 10 * 60000).unref();
}
module.exports = { flowGuion, nuevaGuia, accionGuia, marketing, nuevaCampana, borrarCampana, kitDelDia, start, estado, reporte, nuevoLink, accionLink, ingreso, borrarIngreso, idYT, misionHecha, ajustesEmbajador, publicarFB, shortYupitok };
