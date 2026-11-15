// 🏆 Trivia en vivo de Yupitok Academy: salas con código de 4 letras, de 1 a 6 jugadores, preguntas de los cursos y cuentos.
// Sin chat: solo 6 emojis fijos. Nombres generados (nunca nombres reales). Si juegas solo, Yupi-bot te acompaña.
const crypto = require('crypto');
const EMOJIS = ['👏', '😂', '😮', '🔥', '💪', '🎉'];
const ANIMALES = ['Loro', 'Llama', 'Cóndor', 'Puma', 'Delfín', 'Tortuga', 'Colibrí', 'Vicuña', 'Oso', 'Zorro', 'Búho', 'Mono'];
const COLORES = ['Azul', 'Verde', 'Dorado', 'Rojo', 'Morado', 'Naranja', 'Turquesa', 'Plateado'];
const TPREG = 15000, TRES = 4500, NPREG = 8, MAXJ = 6;
// Preguntas extra por curso (para que cada paquete tenga variedad)
const EXTRA = {
  'programa-con-yupi': [['¿Qué hace un robot si le damos una orden equivocada?', ['La sigue igual', 'La corrige solo', 'Se apaga'], 0], ['Repetir 3 veces ➡️ es lo mismo que…', ['➡️➡️➡️', '➡️', '⬅️⬅️⬅️'], 0], ['¿Qué es depurar un programa?', ['Buscar y arreglar errores', 'Borrarlo todo', 'Pintarlo'], 0]],
  'ingles-con-yupi': [['¿Cómo se dice «perro» en inglés?', ['Dog', 'Cat', 'Duck'], 0], ['«Blue» es el color…', ['Azul', 'Rojo', 'Verde'], 0], ['¿Qué número es «five»?', ['5', '4', '9'], 0], ['«Goodbye» significa…', ['Adiós', 'Hola', 'Gracias'], 0]],
  'mates-divertidas': [['8 × 7 =', ['56', '54', '48'], 0], ['¿Cuánto es la mitad de 1/2?', ['1/4', '1/3', '2/4'], 0]],
  'ciencia-curiosa': [['¿Qué planeta es el más cercano al Sol?', ['Mercurio', 'Venus', 'Marte'], 0], ['¿Qué gas sueltan las plantas al aire?', ['Oxígeno', 'Humo', 'Helio'], 0]],
  'crea-tu-pagina-web': [['¿Qué lenguaje da colores y estilo a una página?', ['CSS', 'HTML', 'Excel'], 0], ['¿Qué etiqueta crea un párrafo?', ['<p>', '<h1>', '<ul>'], 0], ['¿Qué lenguaje hace que un botón responda?', ['JavaScript', 'CSS', 'PDF'], 0], ['¿Cómo se cierra la etiqueta <b>?', ['</b>', '<b/>', '<\\b>'], 0], ['¿Qué etiqueta va dentro de <ul> para cada elemento?', ['<li>', '<p>', '<h2>'], 0], ['En CSS, ¿qué propiedad cambia el tamaño de la letra?', ['font-size', 'color', 'text-align'], 0]],
  'finanzas-personales': [['En la regla 50/30/20, ¿qué porcentaje va al ahorro?', ['20 %', '50 %', '30 %'], 0], ['¿Cuántos meses de gastos se recomienda en el fondo de emergencia?', ['De 3 a 6', 'Medio mes', 'De 20 a 30'], 0]],
};

function crear({ academia, cuentos, extra = () => ({}) }) {
  const salas = new Map();
  const tok = () => crypto.randomBytes(12).toString('hex');
  const codigo = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[crypto.randomInt(24)]).join(''); } while (salas.has(c)); return c; };
  const nombre = s => { for (let i = 0; i < 30; i++) { const n = `${ANIMALES[crypto.randomInt(ANIMALES.length)]} ${COLORES[crypto.randomInt(COLORES.length)]} ${crypto.randomInt(10, 99)}`; if (!s || !s.jugadores.some(j => j.nombre === n)) return n; } return 'Jugador ' + crypto.randomInt(100, 999); };

  function paquete(curso) {
    const A = academia(), C = cuentos(), cursos = curso === 'mezcla' ? A.cursos.filter(c => c.edad !== '18+') : A.cursos.filter(c => c.slug === curso), pool = [];
    for (const c of cursos) {
      for (const m of c.modulos) for (const l of m.lecciones) for (const a of l.actividad) if (a.tipo === 'quiz' && !a.voz) pool.push({ p: a.p, ops: a.ops, ok: a.ok });
      for (const q of (EXTRA[c.slug] || [])) pool.push({ p: q[0], ops: q[1], ok: q[2] });
      for (const q of (extra()[c.slug] || [])) pool.push({ p: q.p, ops: q.ops, ok: q.ok });
      for (const k of C.filter(x => x.curso === c.slug)) for (const q of k.preguntas) pool.push({ p: q.p, ops: q.ops, ok: q.ok });
    }
    return pool.sort(() => Math.random() - .5).slice(0, NPREG).map(q => { const ord = q.ops.map((t, i) => ({ t, i })).sort(() => Math.random() - .5); return { p: q.p, ops: ord.map(o => o.t), ok: ord.findIndex(o => o.i === q.ok) }; });
  }
  const tituloCurso = s => s === 'mezcla' ? 'Mezcla de todo' : (academia().cursos.find(c => c.slug === s) || {}).titulo || s;

  function vista(s, j) {
    const q = s.preg[s.i], v = { code: s.code, curso: s.curso, cursoT: tituloCurso(s.curso), estado: s.estado, i: s.i, total: s.preg.length, host: j && j.tok === s.host, yo: j ? j.nombre : null,
      jugadores: s.jugadores.map(x => ({ nombre: x.nombre, puntos: x.puntos, respondio: s.estado === 'pregunta' ? x.resp != null : undefined, ultimo: s.estado !== 'pregunta' ? x.gano || 0 : 0, emoji: x.emoji && Date.now() - x.emojiT < 3000 ? x.emoji : null, bot: !!x.bot, yo: x === j })).sort((a, b) => b.puntos - a.puntos) };
    if (q && (s.estado === 'pregunta' || s.estado === 'resultado')) { v.pregunta = { p: q.p, ops: q.ops }; v.restante = Math.max(0, s.hasta - Date.now()); if (s.estado === 'resultado') { v.correcta = q.ok; v.mia = j ? j.resp : null; } }
    return v;
  }
  function emitir(s) { for (const x of s.subs) { try { x.res.write(`data: ${JSON.stringify(vista(s, x.j))}\n\n`); } catch (e) {} } s.toque = Date.now(); }
  function siguiente(s) {
    clearTimeout(s.timer); s.i++;
    if (s.i >= s.preg.length) { s.estado = 'fin'; emitir(s); return; }
    s.estado = 'pregunta'; s.hasta = Date.now() + TPREG; s.jugadores.forEach(j => { j.resp = null; j.gano = 0; });
    for (const b of s.jugadores.filter(j => j.bot)) setTimeout(() => { if (s.estado !== 'pregunta' || b.resp != null) return; const q = s.preg[s.i]; responder(s, b, Math.random() < .6 ? q.ok : crypto.randomInt(q.ops.length)); }, 3000 + crypto.randomInt(8000));
    s.timer = setTimeout(() => cerrar(s), TPREG); emitir(s);
  }
  function cerrar(s) { if (s.estado !== 'pregunta') return; clearTimeout(s.timer); s.estado = 'resultado'; s.hasta = Date.now(); emitir(s); s.timer = setTimeout(() => siguiente(s), TRES); }
  function responder(s, j, k) {
    if (s.estado !== 'pregunta' || j.resp != null) return; const q = s.preg[s.i]; j.resp = k;
    if (k === q.ok) { j.gano = 100 + Math.round(Math.max(0, s.hasta - Date.now()) / TPREG * 100); j.puntos += j.gano; }
    if (s.jugadores.every(x => x.resp != null)) cerrar(s); else emitir(s);
  }
  setInterval(() => { const ya = Date.now(); for (const [c, s] of salas) if (ya - s.toque > 60 * 60000 || (!s.subs.size && ya - s.toque > 10 * 60000)) { clearTimeout(s.timer); salas.delete(c); } for (const s of salas.values()) for (const x of s.subs) { try { x.res.write(': ping\n\n'); } catch (e) {} } }, 20000).unref();

  async function http(req, res, u, { ip, json, send, limite }) {
    const P = req.method === 'POST', ruta = u.pathname.slice('/api/trivia/'.length);
    const sala = c => salas.get(String(c || '').toUpperCase().slice(0, 4));
    const jug = (s, t) => s && s.jugadores.find(x => x.tok === String(t || ''));
    if (ruta === 'crear' && P) {
      if (limite(ip, 'trivc', 20)) return send(res, 429, { error: 'Espera un momento' }); if (salas.size > 800) return send(res, 503, { error: 'Hay muchas salas abiertas. Prueba en unos minutos.' });
      const b = await json(req).catch(() => ({})), curso = String(b.curso || 'mezcla'); if (curso !== 'mezcla' && !academia().cursos.some(c => c.slug === curso)) return send(res, 400, { error: 'Ese curso no existe' });
      const s = { code: codigo(), curso, estado: 'espera', jugadores: [], preg: [], i: -1, subs: new Set(), toque: Date.now() }, j = { tok: tok(), nombre: nombre(), puntos: 0 };
      s.jugadores.push(j); s.host = j.tok; salas.set(s.code, s); return send(res, 200, { code: s.code, tok: j.tok, nombre: j.nombre });
    }
    if (ruta === 'unir' && P) {
      if (limite(ip, 'trivu', 30)) return send(res, 429, { error: 'Espera un momento' }); const b = await json(req).catch(() => ({})), s = sala(b.code);
      if (!s) return send(res, 404, { error: 'No existe una sala con ese código' }); const ya = jug(s, b.tok); if (ya) return send(res, 200, { code: s.code, tok: ya.tok, nombre: ya.nombre });
      if (s.estado !== 'espera') return send(res, 400, { error: 'Esa partida ya empezó' }); if (s.jugadores.length >= MAXJ) return send(res, 400, { error: 'La sala está llena (máximo 6)' });
      const j = { tok: tok(), nombre: nombre(s), puntos: 0 }; s.jugadores.push(j); emitir(s); return send(res, 200, { code: s.code, tok: j.tok, nombre: j.nombre });
    }
    if (ruta === 'ver') {
      const s = sala(u.searchParams.get('code')), j = jug(s, u.searchParams.get('tok')); if (!s || !j) return send(res, 404, { error: 'Sala no encontrada' });
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      res.write('retry: 3000\n\n'); const x = { res, j }; s.subs.add(x); res.write(`data: ${JSON.stringify(vista(s, j))}\n\n`); req.on('close', () => s.subs.delete(x)); return;
    }
    if (!P) return false;
    const b = await json(req).catch(() => ({})), s = sala(b.code), j = jug(s, b.tok); if (!s || !j) return send(res, 404, { error: 'Sala no encontrada' });
    if (ruta === 'empezar') {
      if (j.tok !== s.host) return send(res, 403, { error: 'Solo quien creó la sala puede empezar' }); if (s.estado !== 'espera' && s.estado !== 'fin') return send(res, 400, { error: 'Ya está en juego' });
      s.jugadores = s.jugadores.filter(x => !x.bot); if (s.jugadores.length === 1 || b.bot) s.jugadores.push({ tok: tok(), nombre: 'Yupi-bot 🤖', puntos: 0, bot: true });
      s.jugadores.forEach(x => { x.puntos = 0; x.gano = 0; x.resp = null; }); s.preg = paquete(s.curso); if (s.preg.length < 3) return send(res, 400, { error: 'Ese curso aún no tiene suficientes preguntas' });
      s.i = -1; siguiente(s); return send(res, 200, { ok: 1 });
    }
    if (ruta === 'responder') { const k = Math.floor(+b.k); if (!(k >= 0 && k < 6)) return send(res, 400, { error: 'Respuesta no válida' }); responder(s, j, k); return send(res, 200, { ok: 1 }); }
    if (ruta === 'emoji') { if (!EMOJIS.includes(b.e) || limite(j.tok, 'trive', 30)) return send(res, 200, { ok: 0 }); j.emoji = b.e; j.emojiT = Date.now(); emitir(s); setTimeout(() => emitir(s), 3100); return send(res, 200, { ok: 1 }); }
    if (ruta === 'salir') { s.jugadores = s.jugadores.filter(x => x !== j); if (!s.jugadores.some(x => !x.bot)) { clearTimeout(s.timer); salas.delete(s.code); } else { if (s.host === j.tok) s.host = s.jugadores.find(x => !x.bot).tok; if (s.estado === 'pregunta' && s.jugadores.every(x => x.resp != null)) cerrar(s); else emitir(s); } return send(res, 200, { ok: 1 }); }
    return false;
  }
  return { http, EMOJIS };
}
module.exports = { crear };
