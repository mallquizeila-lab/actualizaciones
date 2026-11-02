// 💬 Chat en vivo con salas y juegos (sin librerías: Server-Sent Events + POST).
// Seguridad: solo texto y emojis (sin enlaces, teléfonos, correos ni @usuarios), filtro de groserías,
// límite de mensajes, reportes, bloqueos y borrado desde el panel. Los mensajes se guardan 7 días.
const crypto = require('crypto');

const SALAS = {
  general: { nombre: '💬 Charla general', desc: 'Conversa con gente de toda Latinoamérica.' },
  emoji: { nombre: '🎯 Adivina el emoji', desc: 'Adivina la película, comida o cosa escondida en los emojis. ¡El primero gana!', juego: 'emoji' },
  trivia: { nombre: '🏆 Trivia en vivo', desc: 'Todos responden la misma pregunta. Escribe A, B, C o D.', juego: 'trivia' },
};

// Adivinanzas con emojis: [emojis, respuestas aceptadas, pista]
const EMOJIS = [
  ['🦁👑', ['el rey leon', 'rey leon'], 'Película'], ['🕷️🧑', ['hombre arana', 'spiderman', 'spider man'], 'Superhéroe'], ['❄️👸', ['frozen'], 'Película'],
  ['🧜‍♀️', ['la sirenita', 'sirenita'], 'Película'], ['🚢🧊💔', ['titanic'], 'Película'], ['🧙‍♂️⚡', ['harry potter'], 'Película'],
  ['🐠🔍', ['buscando a nemo', 'nemo'], 'Película'], ['🐼🥋', ['kung fu panda'], 'Película'], ['👽📞🏠', ['et', 'e.t.', 'e t'], 'Película'],
  ['🧸🤠', ['toy story'], 'Película'], ['🦇🧑', ['batman'], 'Superhéroe'], ['🦖🏞️', ['jurassic park', 'parque jurasico'], 'Película'],
  ['🐟🍋🇵🇪', ['ceviche'], 'Comida peruana'], ['🥔🌶️🧀', ['papa a la huancaina', 'huancaina'], 'Comida peruana'], ['🐔🔥🍟', ['pollo a la brasa'], 'Comida peruana'],
  ['🌽🟣🥤', ['chicha morada', 'chicha'], 'Bebida peruana'], ['🥩🍟🍅', ['lomo saltado'], 'Comida peruana'], ['🏔️🦅', ['condor', 'el condor'], 'Animal andino'],
  ['🌧️🌈', ['arcoiris', 'arco iris'], 'Cosa'], ['🎂🎉', ['cumpleanos'], 'Celebración'], ['🐝🍯', ['miel', 'abeja'], 'Cosa'],
  ['🎄🎅', ['navidad'], 'Celebración'], ['💍👰', ['boda', 'matrimonio'], 'Celebración'], ['📚🎓', ['graduacion'], 'Celebración'],
  ['🐢🐇', ['la liebre y la tortuga', 'la tortuga y la liebre'], 'Fábula'], ['🌋', ['volcan'], 'Cosa'], ['🚀🌕', ['viaje a la luna', 'luna', 'astronauta'], 'Cosa'],
  ['🧀🐭', ['raton', 'el raton'], 'Animal'], ['👻🏠', ['casa embrujada', 'casa encantada'], 'Lugar'], ['🔥🚒', ['bombero', 'bomberos'], 'Profesión'],
  ['⚽🏆', ['mundial', 'copa del mundo', 'campeon'], 'Deporte'], ['🍕🇮🇹', ['pizza'], 'Comida'], ['🦙⛰️', ['llama'], 'Animal andino'],
  ['🏖️☀️', ['playa', 'verano'], 'Lugar'], ['☕🥐', ['desayuno'], 'Comida'], ['🎸🤘', ['rock'], 'Música'], ['💃🕺', ['baile', 'bailar'], 'Actividad'],
  ['🐒🍌', ['mono'], 'Animal'], ['🌙⭐', ['noche'], 'Cosa'], ['🍿🎬', ['cine', 'pelicula'], 'Lugar'], ['🦸‍♂️🛡️🇺🇸', ['capitan america'], 'Superhéroe'],
  ['🐉🔥👸', ['game of thrones', 'juego de tronos'], 'Serie'], ['🧟‍♂️', ['zombie', 'zombi'], 'Personaje'], ['🎃👻', ['halloween'], 'Celebración'],
];

const ESC = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const GROSERIAS = ['mierda', 'puta', 'puto', 'pendejo', 'cabron', 'concha', 'conchatumadre', 'ctm', 'csm', 'huevon', 'cojudo', 'marica', 'maricon', 'imbecil', 'idiota', 'estupido', 'pinche', 'verga', 'chinga', 'carajo', 'joder', 'gilipollas', 'malparido', 'hdp', 'mrd', 'webon', 'zorra', 'perra'];
const reGros = new RegExp('\\b(' + GROSERIAS.join('|') + ')\\b', 'gi');

// Nada de enlaces, dominios, correos, teléfonos ni @usuarios (evita spam y estafas).
function revisar(t) {
  t = String(t || '').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!t) return { error: 'Escribe un mensaje' };
  const n = norm(t).replace(/ /g, '');
  if (/https?:|www\.|\b[a-z0-9-]{2,}\s*(\.|\(\.\)|\[\.\]|punto)\s*(com|net|org|pe|io|me|ly|gl|co|xyz|info|site|online|link|app|tk|ru|es|mx|ar|cl)\b/i.test(t) || /(com|net|org)pe?$/.test(n) && /\./.test(t)) return { error: 'No se permiten enlaces 🙅' };
  if (/[\w.+-]+\s*(@|\(at\)|arroba)\s*[\w-]+\s*\./i.test(t)) return { error: 'No se permiten correos 🙅' };
  if ((t.match(/\d/g) || []).length >= 7) return { error: 'No se permiten números de teléfono 🙅' };
  if (/(^|\s)@\w{3,}/.test(t) || /\b(whatsapp|wsp|telegram|instagram|ig|tiktok|onlyfans|t\.me|wa\.me)\b/i.test(t) && /\d|@|\./.test(t)) return { error: 'No se permite compartir contactos ni cuentas 🙅' };
  return { texto: t.replace(reGros, m => m[0] + '•'.repeat(m.length - 1)) };
}
function apodo(n) {
  n = String(n || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 18);
  if (n.length < 2) return null;
  const nn = norm(n).replace(/[^a-z]/g, '');
  if (GROSERIAS.some(g => g.length > 3 && nn.includes(g)) || /admin|moderador|soporte|oficial|facebook|meta/i.test(n)) return null;
  return n;
}
const AVATARES = ['😀', '😎', '🤠', '🥳', '😺', '🐶', '🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐙', '🌸', '🌻', '⚽', '🎸', '🍕', '🚀', '👑', '💎', '🔥', '⭐'];

function crear({ db, q, q1, run, getS, setS, preguntasTrivia }) {
  db.exec(`create table if not exists chat (id integer primary key, created_at text default (datetime('now')), sala text, uid text, nombre text, avatar text, texto text, reportes integer default 0, borrado integer default 0, ip text);
create index if not exists ix_chat_sala on chat(sala, id);`);
  const conexiones = {}; // sala -> Set(res)
  const ultimos = {}; // uid -> [tiempos]
  const juegos = {}; // sala -> estado
  const hash = s => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
  const bloqueados = () => getS('chatBloq', {});
  const activo = () => getS('chatOn', true) !== false;

  function emitir(sala, ev, data) {
    const txt = `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const r of conexiones[sala] || []) { try { r.write(txt); } catch (e) {} }
  }
  const enLinea = sala => (conexiones[sala] || new Set()).size;
  const presencia = () => { for (const s of Object.keys(SALAS)) emitir(s, 'presencia', { n: enLinea(s) }); };
  function bot(sala, texto) {
    const m = { id: 'b' + Date.now() + Math.random().toString(36).slice(2, 5), sala, nombre: 'Anfitrión', avatar: '🤖', texto, bot: true, t: Date.now() };
    emitir(sala, 'msg', m);
  }

  // ---------- Juegos ----------
  function puntaje(sala) { const g = juegos[sala]; return Object.entries(g.puntos).sort((a, b) => b[1].p - a[1].p).slice(0, 5).map(([uid, x]) => ({ nombre: x.nombre, avatar: x.avatar, p: x.p })); }
  function nuevaRonda(sala) {
    const g = juegos[sala]; if (!g) return;
    clearTimeout(g.timer);
    if (!enLinea(sala)) { g.activa = null; g.timer = setTimeout(() => nuevaRonda(sala), 15000); return; }
    if (SALAS[sala].juego === 'emoji') {
      let k; do { k = Math.floor(Math.random() * EMOJIS.length); } while (EMOJIS.length > 1 && k === g.ultimo); g.ultimo = k;
      const [e, resp, pista] = EMOJIS[k];
      g.activa = { tipo: 'emoji', e, resp, pista, fin: Date.now() + 40000, ganador: null };
      emitir(sala, 'ronda', { tipo: 'emoji', e, pista, fin: g.activa.fin, puntos: puntaje(sala) });
      g.timer = setTimeout(() => { if (!g.activa.ganador) bot(sala, `⏰ Nadie adivinó. Era: «${resp[0]}». ¡Va otra!`); emitir(sala, 'ronda', { tipo: 'pausa', puntos: puntaje(sala) }); g.timer = setTimeout(() => nuevaRonda(sala), 6000); }, 40000);
    } else {
      const P = preguntasTrivia(); if (!P.length) return;
      let k; do { k = Math.floor(Math.random() * P.length); } while (P.length > 1 && k === g.ultimo); g.ultimo = k;
      const [preg, ops, c, dato] = P[k];
      g.activa = { tipo: 'trivia', preg, ops, c, dato, fin: Date.now() + 20000, acertaron: [], respondieron: new Set() };
      emitir(sala, 'ronda', { tipo: 'trivia', preg, ops, fin: g.activa.fin, puntos: puntaje(sala) });
      g.timer = setTimeout(() => {
        const a = g.activa, L = 'ABCD'[a.c];
        bot(sala, `✅ Respuesta: ${L}) ${a.ops[a.c]}. ${a.dato}${a.acertaron.length ? ` 🎉 Acertaron: ${a.acertaron.slice(0, 8).join(', ')}${a.acertaron.length > 8 ? '…' : ''}` : ' Nadie acertó esta.'}`);
        emitir(sala, 'ronda', { tipo: 'pausa', puntos: puntaje(sala) }); g.timer = setTimeout(() => nuevaRonda(sala), 7000);
      }, 20000);
    }
  }
  for (const s of Object.keys(SALAS)) if (SALAS[s].juego) { juegos[s] = { puntos: {}, activa: null, timer: null }; setTimeout(() => nuevaRonda(s), 3000); }
  // Puntos se reinician cada día (tabla diaria).
  setInterval(() => { const d = new Date().toISOString().slice(0, 10); for (const g of Object.values(juegos)) if (g.dia !== d) { g.dia = d; g.puntos = {}; } }, 60000).unref();

  function jugar(sala, uid, nombre, avatar, texto) {
    const g = juegos[sala], a = g?.activa; if (!a || Date.now() > a.fin) return;
    const sumar = (n) => { const x = g.puntos[uid] = g.puntos[uid] || { nombre, avatar, p: 0 }; x.nombre = nombre; x.avatar = avatar; x.p += n; };
    if (a.tipo === 'emoji' && !a.ganador) {
      const t = norm(texto);
      if (a.resp.some(r => t === norm(r) || (norm(r).length > 4 && t.includes(norm(r))))) {
        a.ganador = nombre; sumar(3); clearTimeout(g.timer);
        bot(sala, `🎉 ¡${nombre} adivinó! Era «${a.resp[0]}». +3 puntos`);
        emitir(sala, 'ronda', { tipo: 'pausa', puntos: puntaje(sala) });
        g.timer = setTimeout(() => nuevaRonda(sala), 6000);
      }
    }
    if (a.tipo === 'trivia' && !a.respondieron.has(uid)) {
      const t = norm(texto), letra = /^[abcd]$/.test(t) ? 'abcd'.indexOf(t) : a.ops.findIndex(o => norm(o) === t);
      if (letra < 0) return;
      a.respondieron.add(uid);
      if (letra === a.c) { sumar(a.acertaron.length === 0 ? 3 : 1); a.acertaron.push(nombre); }
    }
  }

  // ---------- HTTP ----------
  async function http(req, res, u, { ip, json, send, limite }) {
    const P = req.method === 'POST';
    if (u.pathname === '/api/chat/salas') return send(res, 200, { activo: activo(), avatares: AVATARES, salas: Object.entries(SALAS).map(([id, s]) => ({ id, ...s, enLinea: enLinea(id) })) });
    if (u.pathname === '/api/chat/stream') {
      const sala = u.searchParams.get('sala');
      if (!SALAS[sala] || !activo()) return send(res, 404, { error: 'Sala cerrada' });
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      res.write('retry: 4000\n\n');
      const prev = q("select id, nombre, avatar, texto, created_at from chat where sala=? and borrado=0 order by id desc limit 40", sala).reverse()
        .map(m => ({ id: m.id, sala, nombre: m.nombre, avatar: m.avatar, texto: m.texto, t: Date.parse(m.created_at + 'Z') }));
      res.write(`event: historial\ndata: ${JSON.stringify(prev)}\n\n`);
      const g = juegos[sala]; if (g?.activa && Date.now() < g.activa.fin) res.write(`event: ronda\ndata: ${JSON.stringify(g.activa.tipo === 'emoji' ? { tipo: 'emoji', e: g.activa.e, pista: g.activa.pista, fin: g.activa.fin, puntos: puntaje(sala) } : { tipo: 'trivia', preg: g.activa.preg, ops: g.activa.ops, fin: g.activa.fin, puntos: puntaje(sala) })}\n\n`);
      (conexiones[sala] = conexiones[sala] || new Set()).add(res); presencia();
      // Si la sala de juego estaba esperando gente, la ronda arranca enseguida.
      if (g && (!g.activa || Date.now() > g.activa.fin + 8000)) { clearTimeout(g.timer); g.timer = setTimeout(() => nuevaRonda(sala), 2000); }
      const ka = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 20000);
      req.on('close', () => { clearInterval(ka); conexiones[sala].delete(res); presencia(); });
      return;
    }
    if (u.pathname === '/api/chat/enviar' && P) {
      if (!activo()) return send(res, 403, { error: 'El chat está cerrado por ahora' });
      const b = await json(req), sala = String(b.sala || ''), uid = String(b.uid || '').slice(0, 40);
      if (!SALAS[sala] || uid.length < 6) return send(res, 400, { error: 'Sala no válida' });
      if (b.consent !== true) return send(res, 400, { error: 'Falta aceptar las reglas' });
      const B = bloqueados(), hu = hash(uid), hi = hash(ip);
      if ((B[hu] && B[hu] > Date.now()) || (B[hi] && B[hi] > Date.now())) return send(res, 403, { error: 'No puedes escribir en el chat por ahora' });
      const nombre = apodo(b.nombre); if (!nombre) return send(res, 400, { error: 'Elige otro apodo (2 a 18 letras, sin groserías)' });
      const avatar = AVATARES.includes(b.avatar) ? b.avatar : '😀';
      const t = (ultimos[uid] || []).filter(x => Date.now() - x < 30000); ultimos[uid] = t;
      if (t.length && Date.now() - t[t.length - 1] < 2500) return send(res, 429, { error: 'Más despacio 🙂' });
      if (t.length >= 8 || limite(ip, 'chat', 30)) return send(res, 429, { error: 'Estás escribiendo muy rápido. Espera un momento.' });
      const r = revisar(b.texto); if (r.error) return send(res, 400, { error: r.error });
      const ult = q1('select texto from chat where uid=? order by id desc limit 1', hu);
      if (ult && norm(ult.texto) === norm(r.texto) && r.texto.length > 3) return send(res, 400, { error: 'No repitas el mismo mensaje' });
      t.push(Date.now());
      // En la trivia, las respuestas (A, B, C o D) no se muestran a los demás para no soplar la respuesta.
      if (SALAS[sala].juego === 'trivia' && /^[abcd]$/i.test(r.texto.trim())) { jugar(sala, uid, nombre, avatar, r.texto); return send(res, 200, { ok: 1, oculto: 1 }); }
      const ins = run('insert into chat(sala, uid, nombre, avatar, texto, ip) values(?,?,?,?,?,?)', sala, hu, nombre, avatar, r.texto, hi);
      const m = { id: Number(ins.lastInsertRowid), sala, nombre, avatar, texto: r.texto, t: Date.now() };
      emitir(sala, 'msg', m);
      if (SALAS[sala].juego) jugar(sala, uid, nombre, avatar, r.texto);
      return send(res, 200, { ok: 1, id: m.id });
    }
    if (u.pathname === '/api/chat/reportar' && P) {
      const b = await json(req);
      if (!limite(ip, 'rep', 20, 3600000)) run('update chat set reportes=reportes+1 where id=?', +b.id);
      const m = q1('select reportes, uid from chat where id=?', +b.id);
      if (m && m.reportes >= 3) { run('update chat set borrado=1 where id=?', +b.id); emitir(String(b.sala), 'borrar', { id: +b.id }); } // 3 reportes: se oculta solo
      return send(res, 200, { ok: 1 });
    }
    return false;
  }

  // ---------- Panel (moderación) ----------
  function admin(r, b, F) {
    if (r === 'chat') return { activo: activo(), enLinea: Object.fromEntries(Object.keys(SALAS).map(s => [s, enLinea(s)])), salas: SALAS,
      mensajes: q(`select id, datetime(created_at,'-5 hours') hora, sala, uid, nombre, avatar, texto, reportes, borrado from chat ${F.rep === '1' ? 'where reportes>0' : ''} order by id desc limit 200`),
      bloqueados: Object.entries(bloqueados()).filter(([, t]) => t > Date.now()).length };
    if (r === 'chat/borrar') { const m = q1('select sala from chat where id=?', +b.id); run('update chat set borrado=1 where id=?', +b.id); if (m) emitir(m.sala, 'borrar', { id: +b.id }); return { ok: 1 }; }
    if (r === 'chat/bloquear') {
      const m = q1('select uid, ip, sala from chat where id=?', +b.id); if (!m) return { ok: 0 };
      const B = bloqueados(), hasta = Date.now() + (+b.horas > 0 ? +b.horas * 3600000 : 3650 * 86400000);
      B[m.uid] = hasta; B[m.ip] = hasta; setS('chatBloq', B);
      for (const x of q('select id, sala from chat where uid=? and borrado=0', m.uid)) emitir(x.sala, 'borrar', { id: x.id });
      run('update chat set borrado=1 where uid=?', m.uid);
      return { ok: 1 };
    }
    if (r === 'chat/activo') { setS('chatOn', !!b.on); if (!b.on) for (const s of Object.keys(SALAS)) { emitir(s, 'cerrado', {}); for (const x of conexiones[s] || []) try { x.end(); } catch (e) {} } return { ok: 1 }; }
    if (r === 'chat/desbloquear') { setS('chatBloq', {}); return { ok: 1 }; }
    return null;
  }
  // Limpieza: los mensajes se guardan 7 días.
  setInterval(() => run("delete from chat where created_at < datetime('now','-7 days')"), 3600000).unref();

  return { http, admin, SALAS, revisar, apodo };
}

module.exports = { crear, revisar, apodo, SALAS, EMOJIS };
