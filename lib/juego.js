// 🎮 Agente del Juego: mejora los juegos de Yupitok.
//  - 🧊 Taller 3D: convierte tus imágenes (de Flow o tu póster) o la descripción de cada personaje en un modelo 3D profesional con Meshy,
//    te muestra la vista previa y, cuando apruebas, lo pone en "Yupitok: El Universo de las Aventuras". Nada se publica sin tu aprobación.
//  - 🩺 Salud de los juegos (sin IA): qué juegos crecen o caen, cuáles nadie abre, errores de jugadores, en qué nivel se traba la gente y la Torre.
//  - 💡 Ideas de mejora con IA (1 consulta, cuando tú lo pides) y 🦉 preguntas nuevas para el Sabio Búho (las apruebas tú).
// La clave de Meshy vive solo en tu PC (ShortForge → Claves). Meshy cobra créditos por modelo: el agente siempre pide tu confirmación.
const fs = require('fs'), path = require('path');
const { DATA, uid, parseJSON, day } = require('./util');

const DIR = path.join(DATA, 'modelos3d'), FILE = path.join(DATA, 'juego.json');
fs.mkdirSync(DIR, { recursive: true });
const J = (() => { try { return Object.assign({ modelos: [], preguntas: [], ideas: null, salud: null }, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) { return { modelos: [], preguntas: [], ideas: null, salud: null }; } })();
const guardar = () => { J.modelos = J.modelos.slice(-60); J.preguntas = J.preguntas.slice(-80); fs.writeFileSync(FILE, JSON.stringify(J, null, 1)); };
const V = () => require('./viral');
const intenta = async (f, d = null) => { try { return await f(); } catch (e) { return d; } };
const API = process.env.MESHY_API_BASE || 'https://api.meshy.ai/openapi';
const CLAVE_PRUEBA = 'msy_dummy_api_key_for_test_mode_12345678'; // modo de prueba de Meshy: devuelve un modelo de ejemplo sin gastar créditos
const clave = prueba => prueba ? CLAVE_PRUEBA : (process.env.MESHY_API_KEY || '').trim();

// Personajes que el taller sabe hacer (descripción de la biblia de personajes de Yupitok)
const PJ = {
  yupi: ['👑 Yupi', 'an original 3D mascot character shaped like a big golden yellow letter "Y", large expressive blue eyes, small golden crown with blue gems, white gloves, white sneakers with blue soles, short purple cape, friendly confident smile'],
  lulu: ['🦙 Lulú', 'an original 3D llama character with fluffy white wool, colorful Andean chullo hat (red, yellow and turquoise patterns), purple gamer headphones, short Andean poncho with diamond patterns and fringes, green eyes'],
  choki: ['🌽 Choki', 'an original 3D Peruvian corn cob warrior character with big white-yellow kernels, green husk leaves like a cape, small golden Inca-style helmet with a red crest, round golden shield engraved with a sun, a spear'],
  coquito: ['🥥 Coquito', 'an original 3D round brown coconut knight character wearing carved wooden armor, bronze helmet with a green feather, calm kind eyes, strong arms'],
  gorgojo: ['🪲 Gorgojo Capitán (jefe)', 'an original 3D chubby beetle villain captain with shiny purple metal armor, small dark captain hat, antennae like a mustache, mischievous red eyes'],
  m_cuy: ['🐹 Cuy Pompón', 'an original 3D cute guinea pig pet, brown and white fur'], m_vicuna: ['🦙 Vicuñita', 'an original 3D cute baby vicuña pet, tan and cream wool'],
  m_pollito: ['🐤 Pollito Inca', 'an original 3D cute yellow chick pet with a tiny red crest'], m_colibri: ['🐦 Colibrí Arcoíris', 'an original 3D hummingbird pet with emerald body and rainbow tail, wings open'],
  m_rana: ['🐸 Rana del Titicaca', 'an original 3D cute green frog pet with big eyes'], m_condor: ['🦅 Cóndor Bebé', 'an original 3D baby Andean condor pet, black feathers and white collar, wings open'],
  m_puma: ['🐆 Puma Dorado', 'an original 3D golden puma cub pet'], m_dragon: ['🐉 Dragoncito de Cristal', 'an original 3D small crystal dragon pet made of glowing cyan crystal, little wings'],
};
const ESTILOS = {
  pro: ['Profesional (película animada)', 'high quality stylized 3D animated movie style, clean detailed sculpt, appealing proportions, polished PBR materials'],
  adulto: ['Profesional para adultos (AAA)', 'mature stylized AAA video game character, detailed realistic materials and textures, heroic proportions, cinematic quality, not childish'],
};
const promptDe = (pj, estilo, extra) => `${PJ[pj][1]}. ${ESTILOS[estilo]?.[1] || ESTILOS.pro[1]}. Full body, standing pose, single character, centered, no background, no text.${extra ? ' ' + String(extra).slice(0, 200) : ''} Original design, not resembling any existing franchise character.`.slice(0, 600);

async function meshy(ruta, body, prueba) {
  const k = clave(prueba); if (!k) throw new Error('Falta tu clave de Meshy: pégala en ShortForge → Claves (MESHY_API_KEY)');
  const r = await fetch(API + ruta, { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + k, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
  const t = await r.text(), j = parseJSON(t) || {}; if (!r.ok) throw new Error('Meshy: ' + (j.message || j.error || t.slice(0, 160) || r.status)); return j;
}
async function creditos() { if (!clave()) return null; return intenta(async () => { const j = await meshy('/v1/balance'); return j.balance ?? null; }); }

// Crear un modelo: desde una imagen (data URL o enlace) o desde la descripción. Siempre lo pide el usuario desde el panel.
async function crear({ pj, imagen, estilo, extra, prueba }) {
  if (!PJ[pj]) throw new Error('Elige un personaje');
  if (imagen && !/^(data:image\/(png|jpe?g|webp);base64,|https:\/\/)/.test(imagen)) throw new Error('La imagen debe ser PNG, JPG o WEBP');
  if (imagen && imagen.length > 14e6) throw new Error('La imagen es muy pesada (máx. 10 MB)');
  const m = { id: uid(), pj, nombre: PJ[pj][0], tipo: imagen ? 'imagen' : 'texto', estilo: ESTILOS[estilo] ? estilo : 'pro', prueba: !!prueba, estado: 'enviando', progreso: 0, creado: new Date().toISOString(), giro: 0 };
  J.modelos.push(m); guardar();
  try {
    if (imagen) { const j = await meshy('/v1/image-to-3d', { image_url: imagen, enable_pbr: true, should_texture: true, should_remesh: true }, prueba); m.tarea = j.result; m.ruta = '/v1/image-to-3d/'; }
    else { m.prompt = promptDe(pj, m.estilo, extra); const j = await meshy('/v2/text-to-3d', { mode: 'preview', prompt: m.prompt, art_style: 'realistic', should_remesh: true }, prueba); m.tarea = j.result; m.ruta = '/v2/text-to-3d/'; m.fase = 'preview'; }
    m.estado = 'creando'; guardar();
  } catch (e) { m.estado = 'error'; m.motivo = e.message; guardar(); throw e; }
  return m;
}
// Revisa las tareas en curso (cada 20 s) y descarga el resultado
async function revisar() {
  for (const m of J.modelos.filter(x => x.estado === 'creando' && x.tarea)) {
    try {
      const j = await meshy(m.ruta + m.tarea, null, m.prueba); m.progreso = j.progress || 0;
      if (j.status === 'FAILED' || j.status === 'CANCELED' || j.status === 'EXPIRED') { m.estado = 'error'; m.motivo = j.task_error?.message || 'Meshy no pudo crear el modelo'; continue; }
      if (j.status !== 'SUCCEEDED') continue;
      if (m.fase === 'preview') { const r = await meshy('/v2/text-to-3d', { mode: 'refine', preview_task_id: m.tarea, enable_pbr: true }, m.prueba); m.tarea = r.result; m.fase = 'refine'; m.progreso = 0; continue; } // 2.º paso: texturas
      const url = j.model_urls?.glb; if (!url) { m.estado = 'error'; m.motivo = 'Meshy no devolvió el archivo .glb'; continue; }
      const glb = Buffer.from(await (await fetch(url, { signal: AbortSignal.timeout(180000) })).arrayBuffer()); fs.writeFileSync(path.join(DIR, m.id + '.glb'), glb); m.kb = Math.round(glb.length / 1024);
      if (j.thumbnail_url) { const im = Buffer.from(await (await fetch(j.thumbnail_url, { signal: AbortSignal.timeout(60000) })).arrayBuffer()); fs.writeFileSync(path.join(DIR, m.id + '.png'), im); m.thumb = 1; }
      m.estado = 'listo'; m.listo = new Date().toISOString();
      try { require('./avisos').avisar(`🧊 Tu modelo 3D de ${m.nombre} está listo. Revísalo en ShortForge → Centro de Mando → 🎮 Agente del Juego y pulsa "Usar en el juego" si te gusta.`); } catch (e) {}
    } catch (e) { m.intentos = (m.intentos || 0) + 1; if (m.intentos > 30) { m.estado = 'error'; m.motivo = e.message; } }
    finally { guardar(); }
  }
}
// Aprobar: el modelo pasa a la página (reemplaza al personaje hecho con código). Quitar: vuelve el de código.
async function accion({ id, accion: a, giro }) {
  const m = J.modelos.find(x => x.id === id); if (!m) throw new Error('No encontré ese modelo');
  if (a === 'giro') { m.giro = Math.max(-7, Math.min(7, +giro || 0)); guardar(); if (m.usado) await V().admin('modelo', { pj: m.pj, glb: fs.readFileSync(path.join(DIR, m.id + '.glb')).toString('base64'), giro: m.giro }); return { ok: 1 }; }
  if (a === 'usar') { const f = path.join(DIR, m.id + '.glb'); if (!fs.existsSync(f)) throw new Error('Aún no está listo'); await V().admin('modelo', { pj: m.pj, glb: fs.readFileSync(f).toString('base64'), giro: m.giro || 0 }); for (const x of J.modelos) if (x.pj === m.pj) x.usado = false; m.usado = true; guardar(); return { ok: 1 }; }
  if (a === 'quitar') { await V().admin('modelo/quitar', { pj: m.pj }); m.usado = false; guardar(); return { ok: 1 }; }
  if (a === 'borrar') { if (m.usado) await intenta(() => V().admin('modelo/quitar', { pj: m.pj })); for (const ext of ['.glb', '.png']) try { fs.unlinkSync(path.join(DIR, m.id + ext)); } catch (e) {} J.modelos = J.modelos.filter(x => x !== m); guardar(); return { ok: 1 }; }
  throw new Error('Acción no válida');
}
const archivo = (id, ext) => { const f = path.join(DIR, String(id).replace(/[^a-z0-9]/gi, '') + ext); return fs.existsSync(f) ? f : null; };

// ---------- 🩺 Salud de todos los juegos (sin IA) ----------
const NIV = { n0: 'Nivel 1 · Pradera', n1: 'Nivel 2 · Muros de Oro', n2: 'Nivel 3 · Islas del Cielo', n3: 'Jefe Gorgojo Capitán', obby: 'Torre de las Nubes' };
async function salud() {
  const d = await V().admin('juegos-salud'), consejos = [];
  const sube = (d.juegos || []).filter(x => x.antes && x.n >= x.antes * 1.5).slice(0, 3), baja = (d.juegos || []).filter(x => x.antes >= 5 && x.n <= x.antes * .6).slice(0, 3);
  if (sube.length) consejos.push(`🚀 Crecen: ${sube.map(x => `${x.game} (${x.antes}→${x.n})`).join(', ')}. Haz videos y posts de estos juegos: ya están enganchando.`);
  if (baja.length) consejos.push(`📉 Caen: ${baja.map(x => `${x.game} (${x.antes}→${x.n})`).join(', ')}. Prueba un reto o evento de fin de semana con ellos.`);
  if ((d.sinVisitas || []).length) consejos.push(`😴 ${d.sinVisitas.length} juegos sin visitas en 2 semanas (ej.: ${d.sinVisitas.slice(0, 4).map(x => x.t).join(', ')}). Muévelos más arriba en la portada o mejora su imagen y título.`);
  if ((d.errores || []).length) consejos.push(`🛠️ ${d.errores.length} errores de jugadores esta semana. El más repetido (${d.errores[0].n} veces): "${String(d.errores[0].msg).slice(0, 90)}" en ${d.errores[0].ruta || d.errores[0].src || '?'}.`);
  const embudo = Object.keys(NIV).map(k => { const f = t => (d.aventura || []).find(x => x.niv === k && x.tipo === t)?.n || 0, ini = f('inicio'), fin = f('fin'), aba = f('abandono'); return { k, nombre: NIV[k], ini, fin, aba, pct: ini ? Math.round(fin * 100 / ini) : null }; });
  for (const e of embudo) if (e.k !== 'obby' && e.ini >= 5 && e.pct !== null && e.pct < 35) consejos.push(`🧗 ${e.nombre}: solo ${e.pct}% lo termina (${e.fin} de ${e.ini}). Conviene hacerlo más fácil o dar una pista más clara.`);
  const t = d.torre || {}; if (t.jugadores) consejos.push(`🏗️ Torre: ${t.jugadores} jugadores este mes, llegan en promedio a la etapa ${t.promedio} (récord ${t.mejor}).${t.promedio < 2 ? ' La primera etapa podría ser más fácil para enganchar.' : ''}`);
  if (!consejos.length) consejos.push('Aún hay pocos datos: cuando más gente juegue, aquí verás qué mejorar en cada juego.');
  J.salud = { fecha: new Date().toISOString(), juegos: (d.juegos || []).slice(0, 12), sinVisitas: (d.sinVisitas || []).slice(0, 12), puntajes: (d.puntajes || []).slice(0, 12), errores: (d.errores || []).slice(0, 8), embudo, torre: t, consejos, modelos: d.modelos || {} };
  guardar(); return J.salud;
}
// 💡 Ideas concretas con IA (1 consulta, solo cuando la pides)
async function ideas() {
  const ai = require('./ai'); if (!ai.active().length) throw new Error('Falta una clave de IA en Ajustes');
  const S = J.salud || await salud();
  const p = `Eres diseñador de videojuegos de una plataforma web de juegos gratis (Yupitok) para todas las edades en español. Con estos datos de la última semana propone 6 mejoras CONCRETAS y fáciles de aplicar (qué cambiar, en qué juego y por qué), ordenadas por impacto. Nada de pagos con dinero real ni trucos engañosos.
Datos: ${JSON.stringify({ juegos: S.juegos, sinVisitas: S.sinVisitas.map(x => x.t), puntajes: S.puntajes, errores: S.errores.map(e => e.msg), aventura: S.embudo, torre: S.torre }).slice(0, 6000)}
Devuelve SOLO JSON: {"ideas":[{"titulo":"...","juego":"...","detalle":"1-2 frases"}]}`;
  const r = await ai.ask(p, { json: true, max: 1500 }), j = parseJSON(r.text) || {}; J.ideas = { fecha: new Date().toISOString(), lista: (j.ideas || []).slice(0, 8).map(x => ({ titulo: String(x.titulo || '').slice(0, 120), juego: String(x.juego || '').slice(0, 60), detalle: String(x.detalle || '').slice(0, 400) })) }; guardar(); return J.ideas;
}
// 🦉 Preguntas nuevas para el Sabio Búho (las apruebas antes de que entren al juego)
async function crearPreguntas(materia) {
  const ai = require('./ai'); if (!ai.active().length) throw new Error('Falta una clave de IA en Ajustes');
  const r = await ai.ask(`Escribe 10 preguntas de opción múltiple en español para niños de primaria y secundaria${materia ? ' sobre ' + String(materia).slice(0, 60) : ' (mezcla matemáticas, ciencias, historia y geografía del Perú y del mundo, lectura, lógica y valores)'}. Deben ser correctas, claras y sin ambigüedad. Formato EXACTO, una por línea, sin numerar:
materia|pregunta|respuesta correcta|incorrecta|incorrecta|explicación corta
No uses el carácter | dentro de los textos.`, { max: 2000 });
  const nuevas = String(r.text || '').split(/\r?\n/).map(l => l.trim().replace(/^[-*\d.)\s]+/, '')).filter(l => l.split('|').length === 6 && l.split('|').every(x => x.trim())).slice(0, 12);
  if (!nuevas.length) throw new Error('La IA no devolvió preguntas válidas, intenta otra vez');
  for (const l of nuevas) J.preguntas.push({ id: uid(), l, estado: 'pendiente' }); guardar(); return nuevas.length;
}
async function accionPreguntas({ accion: a, ids }) {
  const sel = J.preguntas.filter(p => p.estado === 'pendiente' && (!ids || ids.includes(p.id)));
  if (a === 'descartar') { for (const p of sel) p.estado = 'descartada'; guardar(); return { ok: 1 }; }
  if (a === 'aprobar') { const aj = await V().admin('ajustes'), actual = String(aj.avPreg || '').trim(); const txt = (actual ? actual + '\n' : '') + sel.map(p => p.l).join('\n'); await V().admin('ajustes', { avPreg: txt }); for (const p of sel) p.estado = 'aprobada'; guardar(); return { ok: 1, n: sel.length }; }
  throw new Error('Acción no válida');
}

async function estado() {
  return { tieneClave: !!clave(), creditos: await creditos(), personajes: Object.entries(PJ).map(([k, v]) => ({ k, n: v[0] })), estilos: Object.entries(ESTILOS).map(([k, v]) => ({ k, n: v[0] })),
    modelos: J.modelos.slice().reverse(), salud: J.salud, ideas: J.ideas, preguntas: J.preguntas.filter(p => p.estado === 'pendiente') };
}
function start() {
  setInterval(() => { if (J.modelos.some(m => m.estado === 'creando')) revisar().catch(() => {}); }, 20000).unref();
  // salud de los juegos una vez al día (9 am Perú) + resumen por Telegram
  setInterval(() => { const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hour12: false }).format(new Date());
    if (h >= 9 && J.diaSalud !== day()) { J.diaSalud = day(); guardar(); salud().then(S => { try { require('./avisos').avisar('🎮 Agente del Juego — salud de tus juegos:\n' + S.consejos.slice(0, 4).join('\n')); } catch (e) {} }).catch(() => {}); } }, 15 * 60000).unref();
}
module.exports = { estado, crear, revisar, accion, archivo, salud, ideas, crearPreguntas, accionPreguntas, start, PJ };
