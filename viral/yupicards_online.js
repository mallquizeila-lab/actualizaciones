// 🃏 YUPI CARDS en línea: salas privadas con código para jugar con amigos.
// Modos: 1 vs 1, 3 jugadores, 4 jugadores (todos contra todos) y 2 vs 2 (por equipos: asientos 1 y 3 contra 2 y 4).
// El servidor reparte y valida cada jugada (nadie puede hacer trampa ni ver las cartas de otros).
// Sin chat libre: solo reacciones predefinidas (seguro para niños). Los asientos vacíos se pueden llenar con la IA.
const crypto = require('crypto');

const COLS = ['r', 'b', 'g', 'y'], HEROES = ['bruja', 'rey', 'idol', 'coquito'];
const SUMA = { mas2: 2, mas3: 3, mas4c: 4, mas5: 5, mas6: 6, mas4: 4, rey: 4 }, suma = x => SUMA[x?.v] || 0;
const cuatro = v => v === 'mas4' || v === 'rey';
const MODOS = { '1v1': { n: 2, nombre: '1 vs 1' }, '3': { n: 3, nombre: '3 jugadores' }, '4': { n: 4, nombre: '4 jugadores' }, '2v2': { n: 4, nombre: '2 vs 2', equipos: true } };
const REACCIONES = ['¡Hola! 👋', '¡Bien jugado! 👏', '¡Oh no! 😱', '¡Date prisa! ⏰', '¡Increíble! 🤩', '¡Cambia de color! 🎨', '¡Suerte! 🍀', '¡Buena partida! 🤝', '😂', '😎', '😡', '😭', '🥳', '🤔', '❤️', '🔥'];
const BOTS = [['Nico', 'a05'], ['Sami', 'a12'], ['Lupe', 'a18'], ['Beto', 'a23'], ['Maya', 'a31'], ['Inti', 'a40']];
const TURNO_MS = 25000, PARTIDA_MS = 5 * 60000, ESPERA_RAPIDA = 15000; // reloj de la partida (gana quien tiene menos cartas) y espera de la partida rápida
const mezclar = l => { for (let i = l.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [l[i], l[j]] = [l[j], l[i]]; } return l; };
const azar = l => l[crypto.randomInt(l.length)];
const codigoNuevo = salas => { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c; do { c = [...Array(5)].map(() => A[crypto.randomInt(A.length)]).join(''); } while (salas[c]); return c; };

function mazo(o) {
  const M = []; let id = 0;
  for (const c of COLS) { M.push({ c, v: '0' }); for (let n = 1; n <= 9; n++) M.push({ c, v: String(n) }, { c, v: String(n) }); for (const v of ['saltar', 'reversa', 'mas2']) M.push({ c, v }, { c, v }); if (o.abanico !== false) M.push({ c, v: 'abanico' }); if (o.masN) for (const v of ['mas3', 'mas4c', 'mas5', 'mas6']) M.push({ c, v }); }
  for (let i = 0; i < 4; i++) M.push({ c: 'w', v: 'comodin' }, { c: 'w', v: 'mas4' });
  if (o.heroes) for (const v of HEROES) M.push({ c: 'w', v });
  return mezclar(M.map(x => ({ ...x, id: ++id })));
}

function crear({ apodo }) {
  const salas = {}, subs = {};
  const equipo = (s, i) => s.equipos ? i % 2 : i;

  // ---------- lo que ve cada jugador ----------
  function vista(s, uid) {
    const yo = s.jug.findIndex(j => j.uid === uid), T = s.desc[s.desc.length - 1];
    return { codigo: s.id, modo: s.modo, nombreModo: MODOS[s.modo].nombre, equipos: !!s.equipos, n: MODOS[s.modo].n, estado: s.estado, host: s.jug[0]?.uid === uid, yo, opc: s.opc,
      jugadores: s.jug.map((j, i) => ({ nombre: j.nombre, avatar: j.avatar, bot: !!j.bot, cartas: j.mano.length, equipo: equipo(s, i), yupi: s.yupi.includes(i), conectado: j.bot || !!subs[s.id] && [...subs[s.id]].some(x => x.uid === j.uid) })),
      mano: yo >= 0 ? s.jug[yo].mano : [], socio: s.equipos && yo >= 0 ? s.jug[(yo + 2) % 4]?.mano || [] : null, // 🤝 en 2 vs 2 ves las cartas de tu compañero (y él las tuyas)
      tope: T || null, color: s.color, turno: s.turno, dir: s.dir, acum: s.acum, robado: s.robado && s.turno === yo, vulnerable: s.vulnerable, quedan: s.turnoFin ? Math.max(0, s.turnoFin - Date.now()) : 0,
      pila: s.pila.length, ganador: s.ganador, ultimo: s.ultimo, n_ev: s.nEv, publica: !!s.publica, arranca: s.arranca ? Math.max(0, s.arranca - Date.now()) : 0, finEn: s.finAt && s.estado === 'jugando' ? Math.max(0, s.finAt - Date.now()) : 0 };
  }
  function avisar(s) { s.nEv++; for (const x of subs[s.id] || []) { try { x.res.write(`event: sala\ndata: ${JSON.stringify(vista(s, x.uid))}\n\n`); } catch (e) {} } }
  function evento(s, tipo, data) { for (const x of subs[s.id] || []) { try { x.res.write(`event: ${tipo}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) {} } }

  // ---------- reglas ----------
  const tope = s => s.desc[s.desc.length - 1];
  const sig = (s, k = 1) => (s.turno + s.dir * k + s.jug.length * 4) % s.jug.length;
  function robar(s, j, n) { for (let i = 0; i < n; i++) { if (!s.pila.length) { const top = s.desc.pop(); s.pila = mezclar(s.desc.map(x => x.c === 'w' ? { ...x, elegido: undefined } : x)); s.desc = [top]; } if (s.pila.length) j.mano.push(s.pila.pop()); } s.yupi = s.yupi.filter(i => s.jug[i] !== j); }
  function puede(s, x) { const T = tope(s); if (s.acum) return suma(x) > 0; // ⛓️ cadena de +: cualquier carta + defiende y se suma
    return x.c === 'w' || x.c === s.color || x.v === T.v; }

  function empezar(s) {
    clearTimeout(s.timer); clearTimeout(s.relojP); clearTimeout(s.arrT); s.arranca = 0; s.finAt = Date.now() + PARTIDA_MS; s.relojP = setTimeout(() => porTiempo(s), PARTIDA_MS); s.pila = mazo(s.opc); s.desc = []; s.dir = 1; s.acum = 0; s.yupi = []; s.vulnerable = null; s.robado = false; s.ganador = null; s.ultimo = null; s.estado = 'jugando';
    for (const j of s.jug) j.mano = [];
    for (let k = 0; k < 7; k++) for (const j of s.jug) j.mano.push(s.pila.pop());
    let ini; do { ini = s.pila.pop(); if (ini.c === 'w' || suma(ini)) { s.pila.unshift(ini); ini = null; } } while (!ini);
    s.desc.push(ini); s.color = ini.c; s.turno = crypto.randomInt(s.jug.length);
    if (ini.v === 'saltar') s.turno = sig(s); if (ini.v === 'reversa') s.dir = -1;
    turnoNuevo(s);
  }
  // ⏳ se acabó el reloj: gana quien tiene menos cartas (en 2 vs 2, el equipo de ese jugador)
  function porTiempo(s) { if (s.estado !== 'jugando') return; const pts = j => j.mano.reduce((a, c) => a + (/^\d$/.test(c.v) ? +c.v : c.c === 'w' ? 50 : 20), 0); const k = s.jug.map((_, i) => i).sort((a, b) => s.jug[a].mano.length - s.jug[b].mano.length || pts(s.jug[a]) - pts(s.jug[b]))[0]; terminar(s, k, true); }
  function terminar(s, k, tiempo) {
    clearTimeout(s.timer); clearTimeout(s.relojP); s.estado = 'fin'; s.turnoFin = 0;
    s.ganador = { i: k, tiempo: !!tiempo, nombre: s.jug[k].nombre, equipo: equipo(s, k), equipoNombres: s.equipos ? s.jug.filter((_, i) => equipo(s, i) === equipo(s, k)).map(j => j.nombre) : null };
    avisar(s);
  }
  function turnoNuevo(s) {
    clearTimeout(s.timer); if (s.estado !== 'jugando') return;
    const j = s.jug[s.turno];
    // si hay un + acumulado y no puede responder, roba y pierde el turno
    if (s.acum && !j.mano.some(x => puede(s, x))) { robar(s, j, s.acum); s.ultimo = { tipo: 'roba', i: s.turno, n: s.acum }; s.acum = 0; s.turno = sig(s); s.robado = false; return turnoNuevo(s); }
    s.turnoFin = Date.now() + (j.bot ? 1500 : TURNO_MS); s.robado = false; avisar(s);
    s.timer = setTimeout(() => j.bot ? jugarBot(s) : tiempoAgotado(s), j.bot ? 900 + crypto.randomInt(800) : TURNO_MS);
  }
  function tiempoAgotado(s) { if (s.estado !== 'jugando') return; const j = s.jug[s.turno]; if (!s.robado) robar(s, j, s.acum || 1); s.acum = 0; s.ultimo = { tipo: 'tiempo', i: s.turno }; s.turno = sig(s); turnoNuevo(s); }

  function jugar(s, k, x, col) {
    const j = s.jug[k]; j.mano = j.mano.filter(c => c.id !== x.id);
    if (x.c === 'w') x.elegido = COLS.includes(col) ? col : azar(COLS);
    const fan = x.v === 'abanico' ? j.mano.filter(c => c.c === x.c) : []; // 🪭 Abanico: bota de golpe todas las cartas de ese color
    if (fan.length) { j.mano = j.mano.filter(c => c.c !== x.c); s.desc.push(...fan); }
    s.desc.push(x); s.color = x.c === 'w' ? x.elegido : x.c; s.robado = false; s.ultimo = { tipo: 'juega', i: k, carta: x, ...(fan.length ? { fan } : {}) };
    if (j.mano.length === 1 && !s.yupi.includes(k)) { s.vulnerable = k; botsAtrapan(s, k); } else if (s.vulnerable === k) s.vulnerable = null;
    if (!j.mano.length) return terminar(s, k);
    let salto = 1;
    if (x.v === 'reversa') { s.dir = -s.dir; if (s.jug.length === 2) salto = 2; }
    if (x.v === 'saltar' || x.v === 'bruja') salto = 2;
    if (x.v === 'idol') s.jug.forEach((o, i) => { if (i !== k) robar(s, o, 1); });
    if (x.v === 'coquito') { const v = s.jug.filter((o, i) => i !== k && equipo(s, i) !== equipo(s, k)).sort((a, b) => a.mano.length - b.mano.length)[0]; if (v && v.mano.length < j.mano.length) { const t = j.mano; j.mano = v.mano; v.mano = t; s.yupi = s.yupi.filter(i => s.jug[i] !== j && s.jug[i] !== v); s.ultimo.cambio = v.nombre; } }
    if (suma(x)) { s.acum += suma(x); const sg = s.jug[sig(s)]; const responde = sg.mano.some(c => suma(c) > 0);
      if (!responde) { robar(s, sg, s.acum); s.ultimo.roba = { nombre: sg.nombre, n: s.acum }; s.acum = 0; salto = 2; } }
    if (s.vulnerable !== null && s.vulnerable !== k) s.vulnerable = null;
    s.turno = sig(s, salto); turnoNuevo(s);
  }
  function llenarYEmpezar(s) { const usados = new Set(s.jug.map(j => j.nombre)); while (s.jug.length < MODOS[s.modo].n) { const [n, a] = BOTS.find(([n]) => !usados.has(n)) || ['IA', 'a27']; usados.add(n); s.jug.push({ uid: 'bot' + s.jug.length, nombre: n + ' (IA)', avatar: a, mano: [], bot: true }); } empezar(s); }
  function botsAtrapan(s, k) { // la IA atrapa a quien no dijo ¡YUPI! (a veces)
    const bots = s.jug.map((j, i) => j.bot && i !== k && equipo(s, i) !== equipo(s, k) ? i : -1).filter(i => i >= 0); if (!bots.length) return;
    setTimeout(() => { if (s.vulnerable !== k || s.estado !== 'jugando' || Math.random() > .55) return; robar(s, s.jug[k], 2); s.vulnerable = null; s.ultimo = { tipo: 'atrapado', i: k, por: s.jug[azar(bots)].nombre }; avisar(s); }, 1600 + crypto.randomInt(1500));
  }
  function jugarBot(s) {
    if (s.estado !== 'jugando') return; const k = s.turno, j = s.jug[k]; let ops = j.mano.filter(x => puede(s, x));
    if (!ops.length) { robar(s, j, 1); const nv = j.mano[j.mano.length - 1]; if (puede(s, nv)) ops = [nv]; else { s.ultimo = { tipo: 'roba', i: k, n: 1 }; s.turno = sig(s); return turnoNuevo(s); } }
    const prox = s.jug[sig(s)], amigo = equipo(s, sig(s)) === equipo(s, k), pocas = prox.mano.length <= 2 && !amigo;
    const val = c => { let v = 0; if (c.c === 'w') v -= 30; if (suma(c) || ['saltar', 'bruja'].includes(c.v)) v += amigo ? -40 : pocas ? 50 : 8; if (/^\d$/.test(c.v)) v += +c.v; v += j.mano.filter(o => o.c === c.c).length * 3; if (c.v === 'coquito') v += j.mano.length >= 6 ? 60 : -60; if (c.v === 'abanico') v += j.mano.filter(o => o.c === c.c).length * 14; return v + Math.random() * 4; };
    const x = ops.sort((a, b) => val(b) - val(a))[0];
    if (j.mano.length === 2 && Math.random() < .85) { s.yupi.push(k); evento(s, 'reac', { i: k, t: '¡YUPI! 📣' }); }
    const cnt = {}; for (const c of j.mano) if (c.c !== 'w' && c.id !== x.id) cnt[c.c] = (cnt[c.c] || 0) + 1;
    jugar(s, k, x, Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || azar(COLS));
  }

  setInterval(() => { const ahora = Date.now(); for (const [id, s] of Object.entries(salas)) if (ahora - s.activo > 30 * 60000 && !(subs[id]?.size)) { clearTimeout(s.timer); clearTimeout(s.relojP); clearTimeout(s.arrT); delete salas[id]; } }, 60000).unref();

  async function http(req, res, u, { ip, json, send, limite }) {
    if (u.pathname === '/api/yc/stream') {
      const s = salas[String(u.searchParams.get('id') || '').toUpperCase()], uid = String(u.searchParams.get('uid') || '').slice(0, 40);
      if (!s) return send(res, 404, { error: 'Esta sala ya no existe' });
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      res.write('retry: 3000\n\n'); const x = { res, uid }; (subs[s.id] = subs[s.id] || new Set()).add(x);
      avisar(s); const ka = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 20000);
      req.on('close', () => { clearInterval(ka); subs[s.id]?.delete(x); if (salas[s.id]) avisar(s); });
      return;
    }
    if (req.method !== 'POST' || !u.pathname.startsWith('/api/yc/')) return false;
    if (limite(ip, 'yc', 240)) return send(res, 429, { error: 'Más despacio 🙂' });
    const b = await json(req), uid = String(b.uid || '').slice(0, 40), r = u.pathname.slice(8);
    if (uid.length < 6) return send(res, 400, { error: 'Falta tu perfil' });
    const nombre = apodo(b.nombre) || 'Jugador', avatar = require('./fotos').valido(b.avatar) ? b.avatar : 'a01';
    if (r === 'crear') {
      if (!MODOS[b.modo]) return send(res, 400, { error: 'Modo no válido' });
      if (limite(ip, 'ycCrear', 20)) return send(res, 429, { error: 'Espera un poco para crear otra sala' });
      const id = codigoNuevo(salas), o = b.opc || {};
      salas[id] = { id, modo: b.modo, equipos: !!MODOS[b.modo].equipos, jug: [{ uid, nombre, avatar, mano: [] }], estado: 'esperando', pila: [], desc: [], yupi: [], opc: { acum: !!o.acum, heroes: o.heroes !== false, masN: o.masN !== false, abanico: o.abanico !== false }, activo: Date.now(), nEv: 0 };
      return send(res, 200, { id });
    }
    if (r === 'rapida') { // ⚡ partida rápida: te une a una sala pública que está esperando o abre una nueva; a los 15 s la IA llena lo que falte
      const modo = b.modo === '4' ? '4' : '1v1'; if (limite(ip, 'ycRapida', 30)) return send(res, 429, { error: 'Espera un poco 🙂' });
      let s = Object.values(salas).find(x => x.publica && x.estado === 'esperando' && x.modo === modo && x.jug.length < MODOS[modo].n && !x.jug.some(j => j.uid === uid));
      if (s) { s.jug.push({ uid, nombre, avatar, mano: [] }); evento(s, 'aviso', { texto: `👋 ${nombre} entró a la partida` }); if (s.jug.length >= MODOS[modo].n) empezar(s); else avisar(s); return send(res, 200, { id: s.id }); }
      const id = codigoNuevo(salas); s = salas[id] = { id, modo, publica: true, equipos: false, jug: [{ uid, nombre, avatar, mano: [] }], estado: 'esperando', pila: [], desc: [], yupi: [], opc: { acum: false, heroes: true, masN: true, abanico: true }, activo: Date.now(), nEv: 0, arranca: Date.now() + ESPERA_RAPIDA };
      s.arrT = setTimeout(() => { if (s.estado === 'esperando' && s.jug.some(j => !j.bot)) llenarYEmpezar(s); }, ESPERA_RAPIDA); return send(res, 200, { id });
    }
    const s = salas[String(b.id || '').toUpperCase().trim()]; if (!s) return send(res, 404, { error: 'No encontramos esa sala. Revisa el código 🙂' });
    s.activo = Date.now(); const k = s.jug.findIndex(j => j.uid === uid), yo = s.jug[k];
    if (r === 'unir') {
      if (yo) { yo.nombre = nombre; yo.avatar = avatar; avisar(s); return send(res, 200, { id: s.id }); }
      if (s.estado !== 'esperando') return send(res, 400, { error: 'La partida ya empezó' });
      const libre = s.jug.findIndex(j => j.bot); // reemplaza a un bot si lo hay
      if (libre >= 0) s.jug[libre] = { uid, nombre, avatar, mano: [] }; else if (s.jug.length >= MODOS[s.modo].n) return send(res, 400, { error: 'La sala está llena' }); else s.jug.push({ uid, nombre, avatar, mano: [] });
      evento(s, 'aviso', { texto: `👋 ${nombre} entró a la sala` }); avisar(s); return send(res, 200, { id: s.id });
    }
    if (!yo) return send(res, 403, { error: 'No estás en esta sala' });
    if (r === 'empezar') { // el anfitrión empieza; los asientos vacíos los ocupa la IA
      if (k !== 0 || s.estado === 'jugando' || s.publica) return send(res, 400, { error: 'Solo el anfitrión puede empezar' });
      llenarYEmpezar(s); return send(res, 200, { ok: 1 });
    }
    if (r === 'reaccion') {
      if (limite(ip, 'ycReac', 30)) return send(res, 429, { error: 'Más despacio 🙂' });
      const t = REACCIONES[+b.r]; if (!t) return send(res, 400, { error: 'Reacción no válida' });
      evento(s, 'reac', { i: k, t }); return send(res, 200, { ok: 1 });
    }
    if (r === 'salir') {
      if (s.estado === 'jugando') { s.jug[k] = { ...yo, uid: 'bot' + k, nombre: yo.nombre + ' (IA)', bot: true }; evento(s, 'aviso', { texto: `🚪 ${yo.nombre} salió; la IA juega por él` }); if (s.turno === k) turnoNuevo(s); else avisar(s); }
      else { s.jug.splice(k, 1); if (!s.jug.some(j => !j.bot)) { clearTimeout(s.timer); clearTimeout(s.arrT); delete salas[s.id]; } else avisar(s); }
      return send(res, 200, { ok: 1 });
    }
    if (r === 'revancha') { if (s.estado !== 'fin') return send(res, 400, { error: 'No disponible' }); empezar(s); return send(res, 200, { ok: 1 }); }
    if (s.estado !== 'jugando') return send(res, 400, { error: 'La partida no está en juego' });
    if (r === 'yupi') { if (yo.mano.length <= 2 && !s.yupi.includes(k)) { s.yupi.push(k); if (s.vulnerable === k) s.vulnerable = null; evento(s, 'reac', { i: k, t: '¡YUPI! 📣' }); avisar(s); } return send(res, 200, { ok: 1 }); }
    if (r === 'atrapar') { const v = +b.k; if (s.vulnerable !== v || v === k || equipo(s, v) === equipo(s, k)) return send(res, 400, { error: 'Muy tarde 🙂' }); robar(s, s.jug[v], 2); s.vulnerable = null; s.ultimo = { tipo: 'atrapado', i: v, por: yo.nombre }; avisar(s); return send(res, 200, { ok: 1 }); }
    if (s.turno !== k) return send(res, 400, { error: 'Espera tu turno' });
    if (r === 'robar') {
      if (s.robado) return send(res, 400, { error: 'Ya robaste' });
      if (s.acum) { robar(s, yo, s.acum); s.ultimo = { tipo: 'roba', i: k, n: s.acum }; s.acum = 0; s.turno = sig(s); turnoNuevo(s); return send(res, 200, { ok: 1 }); }
      robar(s, yo, 1); s.robado = true; const nv = yo.mano[yo.mano.length - 1];
      if (!puede(s, nv)) { s.ultimo = { tipo: 'roba', i: k, n: 1 }; s.turno = sig(s); turnoNuevo(s); } else avisar(s);
      return send(res, 200, { ok: 1 });
    }
    if (r === 'pasar') { if (!s.robado) return send(res, 400, { error: 'Primero roba una carta' }); s.turno = sig(s); turnoNuevo(s); return send(res, 200, { ok: 1 }); }
    if (r === 'jugar') {
      const x = yo.mano.find(c => c.id === +b.carta); if (!x) return send(res, 400, { error: 'Esa carta no está en tu mano' });
      if (!puede(s, x)) return send(res, 400, { error: 'Esa carta no se puede jugar ahora' });
      if (s.robado && x.id !== yo.mano[yo.mano.length - 1].id) return send(res, 400, { error: 'Solo puedes jugar la carta que robaste' });
      jugar(s, k, x, b.color); return send(res, 200, { ok: 1 });
    }
    return send(res, 404, { error: 'No existe' });
  }
  return { http, MODOS, REACCIONES, _salas: salas };
}
module.exports = { crear, MODOS, REACCIONES };
