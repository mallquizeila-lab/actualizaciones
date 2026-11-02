// 🎲 Mesas de juego en tiempo real (sin librerías: Server-Sent Events + POST).
// Juegos propios de dominio público / género: Tres en raya, Cuatro en línea y "¿Quién es el impostor?" (palabras).
// En 1 contra 1, si nadie se une, juega la máquina. Chat de mesa con el mismo filtro del chat en vivo.
const crypto = require('crypto');

const JUEGOS = {
  tresenraya: { nombre: 'Tres en raya', min: 2, max: 2, bot: true },
  cuatro: { nombre: 'Cuatro en línea', min: 2, max: 2, bot: true },
  impostor: { nombre: '¿Quién es el impostor?', min: 3, max: 8, bot: false },
};
const PALABRAS = {
  'Comida peruana': ['ceviche', 'lomo saltado', 'ají de gallina', 'anticucho', 'causa', 'rocoto relleno', 'pollo a la brasa', 'chifa', 'tamal', 'picarones'],
  'Animales': ['perro', 'gato', 'llama', 'cóndor', 'delfín', 'jirafa', 'tiburón', 'loro', 'tortuga', 'oso'],
  'Lugares': ['playa', 'hospital', 'colegio', 'aeropuerto', 'mercado', 'cine', 'estadio', 'iglesia', 'biblioteca', 'gimnasio'],
  'Profesiones': ['doctor', 'profesor', 'bombero', 'cocinero', 'policía', 'piloto', 'abogado', 'mecánico', 'enfermera', 'futbolista'],
  'Objetos': ['celular', 'reloj', 'paraguas', 'guitarra', 'espejo', 'mochila', 'llave', 'almohada', 'televisor', 'bicicleta'],
  'Deportes': ['fútbol', 'vóley', 'básquet', 'natación', 'tenis', 'boxeo', 'ciclismo', 'surf', 'ajedrez', 'atletismo'],
};
const id6 = () => crypto.randomBytes(4).toString('hex').slice(0, 6);

// ---------- Reglas ----------
const T3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const gana3 = b => { for (const [a, c, d] of T3) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { g: b[a], linea: [a, c, d] }; return b.every(Boolean) ? { g: 'empate' } : null; };
function bot3(b, yo) { // minimax: la máquina no pierde, pero a veces se equivoca a propósito (20 %) para que sea divertido
  const otro = yo === 'X' ? 'O' : 'X', libres = b.map((v, i) => v ? null : i).filter(v => v !== null);
  if (Math.random() < 0.2) return libres[Math.floor(Math.random() * libres.length)];
  const mm = (t, turno) => { const r = gana3(t); if (r) return r.g === yo ? 10 : r.g === otro ? -10 : 0; const vals = t.map((v, i) => v ? null : i).filter(v => v !== null).map(i => { t[i] = turno; const s = mm(t, turno === yo ? otro : yo); t[i] = null; return s; }); return turno === yo ? Math.max(...vals) : Math.min(...vals); };
  let mejor = libres[0], m = -99; for (const i of libres) { b[i] = yo; const s = mm(b, otro); b[i] = null; if (s > m) { m = s; mejor = i; } } return mejor;
}
const C4 = { F: 6, C: 7 };
function caer(b, col, f) { for (let r = C4.F - 1; r >= 0; r--) if (!b[r * C4.C + col]) { b[r * C4.C + col] = f; return r; } return -1; }
function gana4(b) {
  const at = (r, c) => r >= 0 && r < C4.F && c >= 0 && c < C4.C ? b[r * C4.C + c] : null;
  for (let r = 0; r < C4.F; r++) for (let c = 0; c < C4.C; c++) { const v = at(r, c); if (!v) continue;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) if ([1, 2, 3].every(k => at(r + dr * k, c + dc * k) === v)) return { g: v, linea: [0, 1, 2, 3].map(k => (r + dr * k) * C4.C + c + dc * k) }; }
  return b.every(Boolean) ? { g: 'empate' } : null;
}
function bot4(b, yo) { // gana si puede, bloquea si debe, si no prefiere el centro (con algo de azar)
  const otro = yo === 'R' ? 'A' : 'R', cols = [...Array(C4.C).keys()].filter(c => !b[c]);
  const prueba = (f) => cols.find(c => { const t = [...b]; caer(t, c, f); return gana4(t)?.g === f; });
  let c = prueba(yo); if (c !== undefined) return c;
  c = prueba(otro); if (c !== undefined && Math.random() < 0.9) return c;
  const seguras = cols.filter(c2 => { const t = [...b]; caer(t, c2, yo); return !([...Array(C4.C).keys()].some(c3 => { if (t[c3]) return false; const u = [...t]; caer(u, c3, otro); return gana4(u)?.g === otro; })); });
  const op = (seguras.length ? seguras : cols).sort((a, d) => Math.abs(3 - a) - Math.abs(3 - d) + (Math.random() - 0.5) * 2.2);
  return op[0];
}

function crear({ revisar, apodo }) {
  const mesas = {}; // id -> mesa
  const subs = {};  // id -> Set({res, uid})
  const vista = (m, uid) => { // lo que ve cada jugador (en el impostor, cada uno ve solo su palabra)
    const yo = m.jugadores.find(j => j.uid === uid);
    const v = { id: m.id, juego: m.juego, nombre: JUEGOS[m.juego].nombre, estado: m.estado, privada: m.privada, jugadores: m.jugadores.map(j => ({ nombre: j.nombre, avatar: j.avatar, ficha: j.ficha, puntos: j.puntos || 0, bot: !!j.bot, conectado: j.bot || !!(subs[m.id] && [...subs[m.id]].some(s => s.uid === j.uid)) })),
      yo: yo ? { ficha: yo.ficha, i: m.jugadores.indexOf(yo) } : null, turno: m.turno, tablero: m.tablero, ganador: m.ganador, linea: m.linea, min: JUEGOS[m.juego].min, max: JUEGOS[m.juego].max, msg: m.msg, fin: m.fin };
    if (m.juego === 'impostor' && m.ronda) {
      const r = m.ronda;
      const idx = u2 => m.jugadores.findIndex(j => j.uid === u2); // nunca se envían los identificadores internos
      const turnoJ = m.jugadores.find(j => j.uid === r.orden[r.turno]);
      v.ronda = { fase: r.fase, categoria: r.categoria, pistas: r.pistas, turno: r.turno, fin: r.fin, turnoNombre: turnoJ?.nombre || null, miTurno: r.fase === 'pistas' && r.orden[r.turno] === uid, yaVote: !!r.votos[uid],
        votaron: Object.keys(r.votos).map(idx), votos: r.fase === 'resultado' ? Object.entries(r.votos).map(([de, a2]) => [idx(de), idx(a2)]) : [],
        palabra: yo ? (r.impostor === uid ? null : r.palabra) : null, soyImpostor: yo ? r.impostor === uid : false,
        revelado: r.fase === 'resultado' ? { impostor: m.jugadores.find(j => j.uid === r.impostor)?.nombre, palabra: r.palabra, atrapado: r.atrapado } : null };
    }
    return v;
  };
  function avisar(m) { for (const s of subs[m.id] || []) { try { s.res.write(`event: mesa\ndata: ${JSON.stringify(vista(m, s.uid))}\n\n`); } catch (e) {} } }
  function chatMesa(m, nombre, avatar, texto, bot) { const x = { nombre, avatar, texto, bot: !!bot, t: Date.now() }; m.chat.push(x); if (m.chat.length > 40) m.chat.shift(); for (const s of subs[m.id] || []) try { s.res.write(`event: chat\ndata: ${JSON.stringify(x)}\n\n`); } catch (e) {} }

  function nueva(juego, privada) {
    const m = { id: id6(), juego, privada: !!privada, jugadores: [], estado: 'esperando', turno: 0, tablero: null, chat: [], creada: Date.now(), activo: Date.now() };
    mesas[m.id] = m; return m;
  }
  function empezar(m) {
    m.estado = 'jugando'; m.ganador = null; m.linea = null; m.msg = null;
    if (m.juego === 'tresenraya') { m.tablero = Array(9).fill(null); m.jugadores.forEach((j, i) => j.ficha = i ? 'O' : 'X'); m.turno = Math.random() < 0.5 ? 0 : 1; }
    if (m.juego === 'cuatro') { m.tablero = Array(C4.F * C4.C).fill(null); m.jugadores.forEach((j, i) => j.ficha = i ? 'A' : 'R'); m.turno = Math.random() < 0.5 ? 0 : 1; }
    if (m.juego === 'impostor') rondaImpostor(m);
    avisar(m); jugarBot(m);
  }
  // ---------- Impostor ----------
  function rondaImpostor(m) {
    const cats = Object.keys(PALABRAS), categoria = cats[Math.floor(Math.random() * cats.length)], ps = PALABRAS[categoria];
    const imp = m.jugadores[Math.floor(Math.random() * m.jugadores.length)];
    const orden = [...m.jugadores].sort(() => Math.random() - 0.5).map(j => j.uid);
    m.ronda = { fase: 'pistas', categoria, palabra: ps[Math.floor(Math.random() * ps.length)], impostor: imp.uid, orden, turno: 0, pistas: [], votos: {}, fin: Date.now() + 35000 };
    chatMesa(m, 'Anfitrión', '🤖', `🕵️ Nueva ronda · Categoría: ${categoria}. Cada uno escribe UNA pista sobre su palabra (sin decirla). El impostor no la conoce: ¡que no te descubran!`, true);
    reloj(m);
  }
  function reloj(m) {
    clearTimeout(m.timer); const r = m.ronda; if (!r) return;
    m.timer = setTimeout(() => {
      if (r.fase === 'pistas') { const uid = r.orden[r.turno], j = m.jugadores.find(x => x.uid === uid); if (j) r.pistas.push({ nombre: j.nombre, avatar: j.avatar, texto: '(no dio pista)' }); siguientePista(m); }
      else if (r.fase === 'votacion') cerrarVotacion(m);
      else if (r.fase === 'resultado') { if (m.jugadores.length >= JUEGOS.impostor.min) { rondaImpostor(m); avisar(m); } else { m.estado = 'esperando'; m.ronda = null; avisar(m); } }
    }, Math.max(1000, r.fin - Date.now()));
  }
  function siguientePista(m) {
    const r = m.ronda; r.turno++;
    if (r.turno >= r.orden.length) { r.fase = 'votacion'; r.fin = Date.now() + 40000; chatMesa(m, 'Anfitrión', '🤖', '🗳️ ¡A votar! ¿Quién es el impostor? (40 s)', true); }
    else r.fin = Date.now() + 35000;
    reloj(m); avisar(m);
  }
  function cerrarVotacion(m) {
    const r = m.ronda, cuenta = {}; Object.values(r.votos).forEach(v => cuenta[v] = (cuenta[v] || 0) + 1);
    const top = Object.entries(cuenta).sort((a, b) => b[1] - a[1]), empate = top.length > 1 && top[0][1] === top[1][1];
    r.atrapado = !!top.length && !empate && top[0][0] === r.impostor;
    const imp = m.jugadores.find(j => j.uid === r.impostor);
    if (r.atrapado) m.jugadores.forEach(j => { if (j.uid !== r.impostor && r.votos[j.uid] === r.impostor) j.puntos = (j.puntos || 0) + 2; });
    else if (imp) imp.puntos = (imp.puntos || 0) + 3;
    r.fase = 'resultado'; r.fin = Date.now() + 12000;
    chatMesa(m, 'Anfitrión', '🤖', r.atrapado ? `🎉 ¡Atraparon al impostor! Era ${imp?.nombre}. La palabra era «${r.palabra}». +2 a quienes votaron bien.` : `😈 ¡El impostor se salió con la suya! Era ${imp?.nombre}. La palabra era «${r.palabra}». +3 para el impostor.`, true);
    reloj(m); avisar(m);
  }
  // ---------- Máquina ----------
  function jugarBot(m) {
    const j = m.jugadores[m.turno];
    if (m.estado !== 'jugando' || !j?.bot) return;
    setTimeout(() => {
      if (m.estado !== 'jugando' || m.jugadores[m.turno] !== j) return;
      if (m.juego === 'tresenraya') mover(m, j, bot3(m.tablero, j.ficha));
      if (m.juego === 'cuatro') mover(m, j, bot4(m.tablero, j.ficha));
    }, 700 + Math.random() * 700);
  }
  function mover(m, j, pos) {
    if (m.juego === 'tresenraya') { if (m.tablero[pos]) return 'Casilla ocupada'; m.tablero[pos] = j.ficha; const r = gana3(m.tablero); if (r) terminar(m, r); else m.turno = 1 - m.turno; }
    if (m.juego === 'cuatro') { if (!(pos >= 0 && pos < C4.C) || caer(m.tablero, pos, j.ficha) < 0) return 'Columna llena'; const r = gana4(m.tablero); if (r) terminar(m, r); else m.turno = 1 - m.turno; }
    m.activo = Date.now(); avisar(m); jugarBot(m); return null;
  }
  function terminar(m, r) {
    m.estado = 'fin'; m.linea = r.linea || null;
    const g = m.jugadores.find(j => j.ficha === r.g); m.ganador = r.g === 'empate' ? 'empate' : g?.nombre;
    if (g) g.puntos = (g.puntos || 0) + 1;
    m.msg = r.g === 'empate' ? '🤝 ¡Empate!' : `🏆 ¡Ganó ${g?.nombre}!`;
  }

  // Limpieza de mesas abandonadas.
  setInterval(() => { const ahora = Date.now(); for (const [id, m] of Object.entries(mesas)) if (ahora - m.activo > 20 * 60000 && !(subs[id]?.size)) { clearTimeout(m.timer); delete mesas[id]; } }, 60000).unref();

  async function http(req, res, u, { ip, json, send, limite }) {
    const P = req.method === 'POST';
    if (u.pathname === '/api/mesas/lista') {
      const jg = u.searchParams.get('juego');
      return send(res, 200, { mesas: Object.values(mesas).filter(m => !m.privada && m.estado === 'esperando' && (!jg || m.juego === jg) && m.jugadores.some(j => !j.bot)).slice(0, 20).map(m => ({ id: m.id, juego: m.juego, nombre: JUEGOS[m.juego].nombre, jugadores: m.jugadores.map(j => ({ nombre: j.nombre, avatar: j.avatar })), max: JUEGOS[m.juego].max })),
        jugando: Object.values(mesas).filter(m => m.estado !== 'esperando' && (!jg || m.juego === jg)).length });
    }
    if (u.pathname === '/api/mesas/stream') {
      const m = mesas[u.searchParams.get('id')], uid = String(u.searchParams.get('uid') || '').slice(0, 40);
      if (!m) return send(res, 404, { error: 'Esta mesa ya no existe' });
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      res.write('retry: 3000\n\n');
      const s = { res, uid }; (subs[m.id] = subs[m.id] || new Set()).add(s);
      res.write(`event: mesa\ndata: ${JSON.stringify(vista(m, uid))}\n\n`);
      for (const c of m.chat.slice(-20)) res.write(`event: chat\ndata: ${JSON.stringify(c)}\n\n`);
      avisar(m);
      const ka = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 20000);
      req.on('close', () => { clearInterval(ka); subs[m.id]?.delete(s); if (mesas[m.id]) avisar(m); });
      return;
    }
    if (!P || !u.pathname.startsWith('/api/mesas/')) return false;
    if (limite(ip, 'mesa', 120)) return send(res, 429, { error: 'Más despacio 🙂' });
    const b = await json(req), uid = String(b.uid || '').slice(0, 40);
    if (uid.length < 6) return send(res, 400, { error: 'Falta tu perfil' });
    const nombre = apodo(b.nombre), avatar = /^a\d\d$/.test(b.avatar || '') ? b.avatar : 'a01';
    if (!nombre) return send(res, 400, { error: 'Elige otro apodo' });
    const r = u.pathname.slice(11);
    if (r === 'crear' || r === 'rapido') {
      if (!JUEGOS[b.juego]) return send(res, 400, { error: 'Juego no válido' });
      let m = r === 'rapido' ? Object.values(mesas).find(x => x.juego === b.juego && !x.privada && x.estado === 'esperando' && x.jugadores.length < JUEGOS[x.juego].max && !x.jugadores.some(j => j.uid === uid || j.bot)) : null;
      if (!m) m = nueva(b.juego, r === 'crear' && b.privada);
      if (!m.jugadores.some(j => j.uid === uid)) m.jugadores.push({ uid, nombre, avatar });
      m.activo = Date.now();
      if (JUEGOS[m.juego].max === 2 && m.jugadores.length === 2) empezar(m); else avisar(m);
      return send(res, 200, { id: m.id });
    }
    const m = mesas[b.id]; if (!m) return send(res, 404, { error: 'Esta mesa ya no existe' });
    const yo = m.jugadores.find(j => j.uid === uid); m.activo = Date.now();
    if (r === 'unir') {
      if (yo) return send(res, 200, { id: m.id });
      if (m.jugadores.length >= JUEGOS[m.juego].max) return send(res, 400, { error: 'La mesa está llena' });
      if (m.estado !== 'esperando' && m.juego !== 'impostor') return send(res, 400, { error: 'La partida ya empezó' });
      m.jugadores.push({ uid, nombre, avatar, puntos: 0 });
      chatMesa(m, 'Anfitrión', '🤖', `👋 ${nombre} se unió a la mesa`, true);
      if (JUEGOS[m.juego].max === 2 && m.jugadores.length === 2) empezar(m); else avisar(m);
      return send(res, 200, { id: m.id });
    }
    if (r === 'maquina') { // 1 contra 1 sin rival: juega la máquina
      if (!yo || !JUEGOS[m.juego].bot || m.estado !== 'esperando' || m.jugadores.length !== 1) return send(res, 400, { error: 'No disponible' });
      m.jugadores.push({ uid: 'bot', nombre: 'Máquina', avatar: 'a27', bot: true }); empezar(m); return send(res, 200, { ok: 1 });
    }
    if (r === 'empezar') { // impostor: cualquiera de la mesa lo inicia con 3 o más
      if (!yo || m.juego !== 'impostor' || m.estado !== 'esperando') return send(res, 400, { error: 'No disponible' });
      if (m.jugadores.length < JUEGOS.impostor.min) return send(res, 400, { error: 'Se necesitan al menos 3 jugadores' });
      empezar(m); return send(res, 200, { ok: 1 });
    }
    if (r === 'revancha') { if (!yo || m.estado !== 'fin') return send(res, 400, { error: 'No disponible' }); empezar(m); return send(res, 200, { ok: 1 }); }
    if (r === 'jugar') {
      if (!yo) return send(res, 403, { error: 'No estás en esta mesa' });
      if (m.juego === 'impostor') {
        const R = m.ronda; if (!R) return send(res, 400, { error: 'Aún no empieza' });
        if (R.fase === 'pistas') {
          if (R.orden[R.turno] !== uid) return send(res, 400, { error: 'Espera tu turno' });
          const rv = revisar(b.texto); if (rv.error) return send(res, 400, { error: rv.error });
          if (R.impostor !== uid && rv.texto.toLowerCase().includes(R.palabra.toLowerCase())) return send(res, 400, { error: '¡No digas la palabra! Da una pista' });
          R.pistas.push({ nombre: yo.nombre, avatar: yo.avatar, texto: rv.texto.slice(0, 60) }); siguientePista(m); return send(res, 200, { ok: 1 });
        }
        if (R.fase === 'votacion') {
          const obj = m.jugadores[+b.voto]; if (!obj || obj.uid === uid) return send(res, 400, { error: 'Voto no válido' });
          R.votos[uid] = obj.uid; avisar(m);
          if (Object.keys(R.votos).length >= m.jugadores.length) cerrarVotacion(m);
          return send(res, 200, { ok: 1 });
        }
        return send(res, 400, { error: 'Espera la siguiente ronda' });
      }
      if (m.estado !== 'jugando' || m.jugadores[m.turno] !== yo) return send(res, 400, { error: 'No es tu turno' });
      const e = mover(m, yo, +b.pos); if (e) return send(res, 400, { error: e });
      return send(res, 200, { ok: 1 });
    }
    if (r === 'chat') {
      if (limite(ip, 'mchat', 20)) return send(res, 429, { error: 'Más despacio 🙂' });
      const rv = revisar(b.texto); if (rv.error) return send(res, 400, { error: rv.error });
      chatMesa(m, nombre, avatar, rv.texto); return send(res, 200, { ok: 1 });
    }
    if (r === 'salir') {
      if (yo) { m.jugadores = m.jugadores.filter(j => j !== yo); chatMesa(m, 'Anfitrión', '🤖', `🚪 ${yo.nombre} salió de la mesa`, true);
        if (!m.jugadores.some(j => !j.bot)) { clearTimeout(m.timer); delete mesas[m.id]; } else if (m.juego !== 'impostor' && m.estado === 'jugando') { m.estado = 'fin'; m.msg = `🚪 ${yo.nombre} se fue. Fin de la partida.`; }
        else if (m.juego === 'impostor' && m.jugadores.length < 3 && m.ronda) { clearTimeout(m.timer); m.ronda = null; m.estado = 'esperando'; }
        if (mesas[m.id]) avisar(m); }
      return send(res, 200, { ok: 1 });
    }
    return send(res, 404, { error: 'No existe' });
  }
  return { http, JUEGOS };
}

module.exports = { crear, JUEGOS, gana3, gana4, bot3, bot4, caer };
