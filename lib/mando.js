// 🧭 Centro de Mando de Yupitok: 4 agentes que hacen todo el trabajo gastando muy pocos créditos.
//  - 📊 Data (sin IA): visitas, juegos, suscriptores, canales y videos.
//  - 🛠️ Guardián (sin IA): errores de jugadores, juegos rotos, página caída, moderación pendiente, videos con error.
//  - 🎬 Creativo (IA solo al decidir): bandeja de links de YouTube → "🎬 lo armo" (video ORIGINAL inspirado en la idea) o "⏭️ lo dejo".
//  - 🌍 Embajador (sin IA): kit de difusión diario en ES/EN/PT, misiones para aparecer en todo el mundo, post diario en tu página de Facebook (opcional).
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
// ---------- 💰 ingresos que anotas ----------
function ingreso({ fuente, monto, fecha, nota }) {
  const m = +monto; if (!fuente || !isFinite(m) || m <= 0 || m > 1e6) throw new Error('Escribe la fuente y un monto válido (en dólares)');
  M.ingresos.push({ id: uid(), fuente: String(fuente).slice(0, 40), monto: +m.toFixed(2), fecha: /^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ? fecha : day(), nota: String(nota || '').slice(0, 120) }); guardar(); return { ok: 1 };
}
function borrarIngreso(id) { M.ingresos = M.ingresos.filter(x => x.id !== id); guardar(); return { ok: 1 }; }
async function estado() { return { embajador: await intenta(() => embajador(), null), links: M.links.slice().reverse(), ingresos: M.ingresos.slice().reverse().slice(0, 60), reportes: M.reportes.slice().reverse().slice(0, 7), datos: await intenta(() => datos(), null) }; }

// Reporte diario automático a las 8 am (Perú) por Telegram + análisis de links pendientes
function start() {
  setInterval(() => { const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hour12: false }).format(new Date());
    if (h >= 8 && db.settings.mandoReporte !== day()) { db.settings.mandoReporte = day(); require('./store').saveAll.settings(); reporte(true).catch(e => console.log('[Mando] ' + e.message)); }
    for (const l of M.links.filter(x => x.estado === 'nuevo')) analizarLink(l).catch(() => {});
    try { tickEmbajador(); } catch (e) { console.log('[Embajador] ' + e.message); }
  }, 10 * 60000).unref();
}
module.exports = { kitDelDia, start, estado, reporte, nuevoLink, accionLink, ingreso, borrarIngreso, idYT, misionHecha, ajustesEmbajador, publicarFB, shortYupitok };
