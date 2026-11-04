// Cuentas de jugador (usuario + contraseña), clanes con chat moderado y salas en línea de Duelo de Torres (1 vs 1 y 2 vs 2).
// Las salas usan un "anfitrión": el primer jugador simula la partida y el servidor solo reenvía mensajes (rápido y sin carga).
const crypto = require('crypto'), fs = require('fs'), path = require('path'), vm = require('vm'), RIV = require('./rivales');
// Catálogo y motor de GLORY BROWN: el servidor calcula las partidas en línea (los celulares solo las dibujan).
function cargarGlory() {
  const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'public', 'glory', 'cartas.js'), 'utf8'), ctx); const G = ctx.window.GLORY;
  const CARTA = Object.fromEntries(G.cartas.map(c => [c.id, c]));
  for (const [k, m] of Object.entries(G.minis)) CARTA['_' + k] = { ...G.cartas.find(c => c.arq === m.arq && c.tipo === 'tropa'), id: '_' + k, n: m.n, aspecto: m.aspecto, hp: m.hp, dmg: m.dmg, cant: 1, hab: null, frases: null };
  return { G, CARTA, Motor: require('./public/glory/motor.js') };
}

function crear({ db, q, q1, run, revisar, apodo, datos, social = () => ({}), guardarFoto = async () => null, borrarFotos = () => {} }) {
  const VIDEOS = path.join(datos || __dirname, 'videos'); let G_MUNDOS = ['Reino del Alba', 'Bosque Esmeralda', 'Imperio de las Arenas', 'Islas Celestiales', 'Reino de las Sombras', 'Dominio de Hielo', 'Reino del Dragón'];
  db.exec(`
    create table if not exists glory_semana (semana text, jugador text, nombre text, pais text, puntos integer default 0, victorias integer default 0, partidas integer default 0, primary key (semana, jugador));
    create table if not exists glory_premios (semana text, jugador text, cofre text, created_at text default (datetime('now')), primary key (semana, jugador));
    create table if not exists glory_rank (jugador text primary key, nombre text, pais text, puntos integer default 0, victorias integer default 0, derrotas integer default 0, updated_at text default (datetime('now')));
    create index if not exists i_glory_rank on glory_rank(puntos desc);
    create table if not exists cuentas (id integer primary key, usuario text unique collate nocase, sal text, hash text, perfil_id text, created_at text default (datetime('now')));
    create table if not exists sesiones (tok text primary key, cuenta_id integer, created_at text default (datetime('now')));
    create table if not exists clanes (id integer primary key, nombre text unique collate nocase, insignia text, descr text, lider text, trofeos integer default 0, created_at text default (datetime('now')));
    create table if not exists clan_miembros (jugador text primary key, clan_id integer, nombre text, trofeos integer default 0, rol text default 'miembro', unido text default (datetime('now')));
    create table if not exists clan_chat (id integer primary key, clan_id integer, nombre text, avatar text, texto text, tipo text default 'msg', extra text, created_at text default (datetime('now')));
    create index if not exists i_clan_chat on clan_chat(clan_id, id);
  `);
  for (const col of ['avatar text', 'suspendido integer default 0', 'vid text', 'google_sub text', 'fb_id text']) { try { db.exec('alter table cuentas add column ' + col); } catch (e) {} }
  const sha = s => crypto.createHash('sha256').update(s).digest('hex');
  const hashClave = (clave, sal) => crypto.scryptSync(String(clave), sal, 32).toString('hex');
  const cuentaDeTok = tok => tok && /^[a-f0-9]{48}$/.test(tok) ? q1('select c.* from sesiones s join cuentas c on c.id=s.cuenta_id where s.tok=?', tok) : null;
  // Identidad del jugador: su cuenta si inició sesión, si no el identificador del navegador.
  const perfilId = b => { const c = cuentaDeTok(b.tok); return c ? c.perfil_id : sha('perfil:' + String(b.uid || '')).slice(0, 24); };
  const jugadorId = b => sha('jugador:' + perfilId(b)).slice(0, 24);
  const insignias = ['🛡️', '⚔️', '🐉', '🦅', '🐻', '🔥', '❄️', '👑', '🌙', '⭐', '🦁', '🐺'];

  // ---------- Salas en línea ----------
  const salas = new Map(), cola = { '1v1': [], '2v2': [] }, subs = new Map();
  const tam = m => m === '2v2' ? 4 : 2;
  const pub = s => ({ id: s.id, modo: s.modo, codigo: s.codigo, estado: s.estado, jugadores: s.jugadores.map(j => ({ asiento: j.asiento, nombre: j.nombre, trofeos: j.trofeos, mazo: j.mazo, niveles: j.niveles, clan: j.clan, bot: !!j.bot })) });
  function emitir(s, ev, data, excepto) { for (const c of subs.get(s.id) || []) if (c.tok !== excepto) try { c.res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) {} }
  function nuevaSala(modo, privada) { const id = crypto.randomBytes(6).toString('hex'); let codigo = null; if (privada) do { codigo = crypto.randomBytes(3).toString('hex').toUpperCase(); } while ([...salas.values()].some(x => x.codigo === codigo)); const s = { id, modo, codigo, estado: 'esperando', jugadores: [], creada: Date.now(), activo: Date.now() }; salas.set(id, s); return s; }
  function sentar(s, b) {
    const libre = [...Array(tam(s.modo)).keys()].find(i => !s.jugadores.some(j => j.asiento === i)); if (libre === undefined) return null;
    const j = { asiento: libre, tok: crypto.randomBytes(12).toString('hex'), nombre: apodo(b.nombre) || 'Jugador', trofeos: Math.max(0, Math.min(99999, +b.trofeos || 0)), mazo: Array.isArray(b.mazo) ? b.mazo.slice(0, 8).map(x => String(x).slice(0, 40)) : [], niveles: typeof b.niveles === 'object' && b.niveles ? Object.fromEntries(Object.entries(b.niveles).slice(0, 12).map(([k, v]) => [String(k).slice(0, 40), Math.max(1, Math.min(10, +v || 1))])) : {}, clan: String(b.clan || '').slice(0, 30), jid: jugadorId(b) };
    s.jugadores.push(j); s.activo = Date.now(); return j;
  }
  let GL = null; const MAZO_INICIAL = ['escudero_del_alba', 'arqueras_del_sol', 'lanceros_dorados', 'hadas_del_alba', 'lluvia_de_luz', 'torre_del_vigia', 'paladin_radiante', 'cleriga_de_la_aurora'];
  function empezar(s, conBots) {
    if (conBots) { const ref = s.jugadores.filter(j => !j.bot).map(j => j.trofeos || 0), base = ref.length ? ref.reduce((a, b) => a + b, 0) / ref.length : 100;
      for (let i = 0; i < tam(s.modo); i++) if (!s.jugadores.some(j => j.asiento === i)) s.jugadores.push({ asiento: i, bot: 1, nombre: RIV.nombreRival(), avatar: RIV.avatarRival(), trofeos: Math.max(0, Math.round(base + (Math.random() - .5) * 160)), mazo: [], niveles: {} }); }
    s.estado = 'jugando'; s.inicio = Date.now(); emitir(s, 'empieza', pub(s));
    try { iniciarMotor(s); } catch (e) { console.error('GLORY motor:', e.message); }
  }
  // La partida la calcula el servidor: valida mazos, elixir, mano y lado del río; todos juegan con nivel de torneo 9.
  // Estado liviano: solo lo que cambió desde el envío anterior (y una foto completa cada ~2 s o cuando alguien se conecta)
  function delta(s, d) {
    const prev = s.ultE, ahora = new Map(), completo = !prev || s.completo || ++s.nEnv % 14 === 0; s.completo = false;
    const cambios = []; for (const a of d.e) { const k = a.join(','); ahora.set(a[0], k); if (completo || prev.get(a[0]) !== k) cambios.push(a); }
    const fuera = completo ? [] : [...prev.keys()].filter(id => !ahora.has(id)); s.ultE = ahora;
    for (const nom of ['s', 'z', 'c']) { const k = JSON.stringify(d[nom]); if (!completo && s['ult_' + nom] === k) delete d[nom]; else s['ult_' + nom] = k; }
    for (const nom of ['fx', 'so', 'tx', 'ha', 'vo']) if (Array.isArray(d[nom]) && !d[nom].length) delete d[nom];
    if (!d.p?.length && !completo) delete d.p;
    if (!completo) { d.e = cambios; d.g = fuera; d.dl = 1; }
    return d;
  }
  function iniciarMotor(s) { s.nEnv = 0; s.ultE = null;
    GL = GL || cargarGlory(); const { G, CARTA, Motor } = GL, n4 = s.modo === '2v2', equipoDe = a => n4 ? (a < 2 ? 0 : 1) : a;
    const arenaDe = tr => G.arenas.reduce((a, x, i) => tr >= x.trofeos ? i : a, 0), arenaI = arenaDe(Math.max(...s.jugadores.filter(j => !j.bot).map(j => j.trofeos), 0));
    const NIV = Object.fromEntries(G.cartas.map(c => [c.id, 9])), baraja = l => [...l].sort(() => Math.random() - .5);
    const valido = m => { const v = (Array.isArray(m) ? m : []).filter((c, i, a) => CARTA[c] && !c.startsWith('_') && a.indexOf(c) === i); return v.length === 8 ? v : MAZO_INICIAL; };
    const mazoBot = () => { const pool = G.cartas.filter(c => c.id !== 'glory_brown' && c.arena <= Math.max(arenaI, 2)); const t1 = pool.filter(c => ['gigante', 'golem', 'titan', 'jinete'].includes(c.arq)), t2 = pool.filter(c => c.tipo === 'hechizo'), t3 = pool.filter(c => c.tipo === 'tropa' && !t1.includes(c)); const m = [...baraja(t1).slice(0, 2), ...baraja(t2).slice(0, 2), ...baraja(t3)].slice(0, 8).map(c => c.id); return m.length === 8 ? m : MAZO_INICIAL; };
    s.nuevos = { fx: [], so: [], tx: [], ha: [], vo: [] };
    const asientos = [...s.jugadores].sort((a, b) => a.asiento - b.asiento).map(j => ({ a: j.asiento, team: equipoDe(j.asiento), ctrl: j.bot ? 'ia' : 'jugador', mazo: j.bot ? mazoBot() : valido(j.mazo), niv: NIV, nombre: j.nombre }));
    s.motor = Motor.crear({ G, CARTA, n4, arenaI, asientos, ev: {
      efecto: f => s.nuevos.fx.push(f), son: t => s.nuevos.so.push(t), texto: (t, o) => s.nuevos.tx.push([t, o]), voz: (t, team) => s.nuevos.vo.push([t, team]),
      habla: (e, clave, i) => s.nuevos.ha.push([e.id, clave, i]), emote: (a, e) => emitir(s, 'emote', { de: a, a, e }), fin: g => finSala(s, g) } });
    let envT = 0, errores = 0;
    s.reloj = setInterval(() => {
      try { s.motor.paso(.05); } catch (e) { if (++errores < 3) console.error('GLORY paso:', e.message); }
      if ((envT -= .05) <= 0 && !s.motor.S.fin) { envT = .15; const d = delta(s, s.motor.foto(s.nuevos)); s.nuevos = { fx: [], so: [], tx: [], ha: [], vo: [] }; emitir(s, 'estado', d); }
      s.activo = Date.now(); if (Date.now() - s.inicio > 6 * 60000) s.motor.terminar();
    }, 50);
  }
  // Semana del torneo (lunes a domingo, hora de Perú)
  const lunes = (desfase = 0) => { const d = new Date(Date.now() - 5 * 3600000); const dia = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dia - desfase * 7); return d.toISOString().slice(0, 10); };
  const finSemana = () => { const l = new Date(lunes() + 'T05:00:00Z'); return l.getTime() + 7 * 864e5; };
  const PREMIO = p => p === 1 ? 'real' : p <= 3 ? 'magico' : p <= 10 ? 'oro' : p <= 50 ? 'plata' : null;
  function finSala(s, g) {
    clearInterval(s.reloj); const d = s.motor.foto(s.nuevos); emitir(s, 'estado', d);
    const n4 = s.modo === '2v2', equipoDe = a => n4 ? (a < 2 ? 0 : 1) : a, rank = {};
    for (const j of s.jugadores) { if (j.bot || !j.jid) continue; const eq = equipoDe(j.asiento), rival = s.jugadores.filter(x => equipoDe(x.asiento) !== eq), contraBots = rival.every(x => x.bot);
      const delta = g === null ? 0 : g === eq ? (contraBots ? 10 : 30) : (contraBots ? -5 : -20), fila = q1('select puntos from glory_rank where jugador=?', j.jid), pts = Math.max(0, (fila?.puntos || 0) + delta);
      run(`insert into glory_rank(jugador, nombre, pais, puntos, victorias, derrotas) values(?,?,?,?,?,?) on conflict(jugador) do update set nombre=excluded.nombre, pais=coalesce(excluded.pais, pais), puntos=excluded.puntos, victorias=victorias+excluded.victorias, derrotas=derrotas+excluded.derrotas, updated_at=datetime('now')`, j.jid, j.nombre, j.pais || null, pts, g === eq ? 1 : 0, g !== null && g !== eq ? 1 : 0);
      rank[j.asiento] = pts;
      const pt = (g === null ? 2 : g === eq ? 3 : 1) + (contraBots ? 0 : (s.motor.S.coronas[eq] || 0)) - (contraBots && g !== eq ? 1 : 0);
      run(`insert into glory_semana(semana, jugador, nombre, pais, puntos, victorias, partidas) values(?,?,?,?,?,?,1) on conflict(semana, jugador) do update set nombre=excluded.nombre, pais=coalesce(excluded.pais, pais), puntos=puntos+excluded.puntos, victorias=victorias+excluded.victorias, partidas=partidas+1`, lunes(), j.jid, j.nombre, j.pais || null, Math.max(0, pt), g === eq ? 1 : 0); }
    emitir(s, 'fin', { g, c: s.motor.S.coronas, rank }); s.estado = 'terminada'; setTimeout(() => { salas.delete(s.id); subs.delete(s.id); }, 20000);
  }
  setInterval(() => { const ahora = Date.now(); for (const s of salas.values()) if (s.estado === 'esperando' && !s.codigo && s.jugadores.some(j => !j.bot) && ahora - s.creada > (s.modo === '2v2' ? RIV.ESPERA.duelo2v2 : RIV.ESPERA.duelo1v1) * 1000) { cola[s.modo] = cola[s.modo].filter(x => x !== s.id); empezar(s, true); } }, 1000);
  setInterval(() => { const ahora = Date.now(); for (const [id, s] of salas) if (ahora - s.activo > (s.estado === 'jugando' ? 90000 : 10 * 60000)) { emitir(s, 'cerrada', {}); salas.delete(id); subs.delete(id); } for (const m in cola) cola[m] = cola[m].filter(x => salas.has(x) && salas.get(x).estado === 'esperando'); }, 15000).unref();

  async function http(req, res, u, { ip, json, send, limite }) {
    const P = req.method === 'POST', r = u.pathname;
    // ===== Cuentas =====
    if (r === '/api/cuenta/crear' && P) {
      if (limite(ip, 'cuentaC', 6, 3600000)) return send(res, 429, { error: 'Demasiadas cuentas creadas. Intenta más tarde.' });
      const b = await json(req), usuario = apodo(b.usuario), clave = String(b.clave || '');
      if (!usuario || usuario.length < 3 || /\s/.test(usuario)) return send(res, 400, { error: 'Elige un usuario de 3 a 18 letras o números, sin espacios ni groserías' });
      if (clave.length < 6 || clave.length > 100) return send(res, 400, { error: 'La contraseña debe tener al menos 6 caracteres' });
      if (q1('select 1 from cuentas where usuario=?', usuario)) return send(res, 409, { error: 'Ese usuario ya existe. Prueba con otro.' });
      const ya = cuentaDeTok(b.tok); if (ya) return send(res, 400, { error: 'Ya iniciaste sesión como ' + ya.usuario });
      const pid = sha('perfil:' + String(b.uid || '')).slice(0, 24);
      if (q1('select 1 from cuentas where perfil_id=?', pid)) return send(res, 400, { error: 'Este progreso ya está ligado a otro usuario' });
      const sal = crypto.randomBytes(16).toString('hex'), info = run('insert into cuentas(usuario, sal, hash, perfil_id) values(?,?,?,?)', usuario, sal, hashClave(clave, sal), pid);
      if (b.data && typeof b.data === 'object') { const d = JSON.stringify(b.data); if (d.length < 30000) run("insert into perfiles(id, codigo, data) values(?,?,?) on conflict(id) do update set data=excluded.data, updated_at=datetime('now')", pid, crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6), d); }
      const tok = crypto.randomBytes(24).toString('hex'); run('insert into sesiones(tok, cuenta_id) values(?,?)', tok, info.lastInsertRowid);
      return send(res, 200, { ok: 1, tok, usuario });
    }
    // ===== Continuar con Google / Facebook =====
    if (r === '/api/cuenta/social' && P) {
      if (limite(ip, 'social', 20, 15 * 60000)) return send(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
      const b = await json(req), cfg = social(); let ps = null;
      try {
        if (b.proveedor === 'google') {
          if (!cfg.google) return send(res, 400, { error: 'El inicio con Google aún no está activado' });
          const t = await (await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(b.credential || '')), { signal: AbortSignal.timeout(15000) })).json();
          if (t.aud !== cfg.google || !['accounts.google.com', 'https://accounts.google.com'].includes(t.iss) || !t.sub || +t.exp * 1000 < Date.now()) return send(res, 401, { error: 'No se pudo verificar tu cuenta de Google' });
          ps = { campo: 'google_sub', id: String(t.sub), nombre: t.given_name || t.name || 'Jugador', foto: t.picture };
        } else if (b.proveedor === 'facebook') {
          if (!cfg.facebook) return send(res, 400, { error: 'El inicio con Facebook aún no está activado' });
          const at = encodeURIComponent(String(b.accessToken || '')), app = await (await fetch('https://graph.facebook.com/app?access_token=' + at, { signal: AbortSignal.timeout(15000) })).json();
          if (String(app.id) !== String(cfg.facebook)) return send(res, 401, { error: 'No se pudo verificar tu cuenta de Facebook' });
          const me = await (await fetch('https://graph.facebook.com/me?fields=id,first_name,name,picture.width(256).height(256)&access_token=' + at, { signal: AbortSignal.timeout(15000) })).json();
          if (!me.id) return send(res, 401, { error: 'No se pudo verificar tu cuenta de Facebook' });
          ps = { campo: 'fb_id', id: String(me.id), nombre: me.first_name || me.name || 'Jugador', foto: me.picture?.data?.is_silhouette ? null : me.picture?.data?.url };
        } else return send(res, 400, { error: 'Proveedor no válido' });
      } catch (e) { return send(res, 502, { error: 'No hay conexión con ' + (b.proveedor === 'google' ? 'Google' : 'Facebook') + '. Intenta de nuevo.' }); }
      let c = q1(`select * from cuentas where ${ps.campo}=?`, ps.id), nueva = false;
      const ya = cuentaDeTok(b.tok);
      if (!c && ya) { run(`update cuentas set ${ps.campo}=? where id=?`, ps.id, ya.id); c = q1('select * from cuentas where id=?', ya.id); } // vincula a la cuenta con la que ya entró
      if (!c) { // cuenta nueva con su nombre y su progreso actual
        let base = String(apodo(ps.nombre) || 'Jugador').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 14) || 'Jugador'; if (base.length < 3) base += 'gamer';
        let usuario = base; for (let i = 0; q1('select 1 from cuentas where usuario=?', usuario) && i < 50; i++) usuario = base + (Math.floor(Math.random() * 900) + 100);
        let pid = sha('perfil:' + String(b.uid || '')).slice(0, 24); if (q1('select 1 from cuentas where perfil_id=?', pid)) pid = sha('perfil:' + ps.campo + ps.id).slice(0, 24);
        const sal = crypto.randomBytes(16).toString('hex'), info = run(`insert into cuentas(usuario, sal, hash, perfil_id, ${ps.campo}) values(?,?,?,?,?)`, usuario, sal, hashClave(crypto.randomBytes(24).toString('hex'), sal), pid, ps.id);
        if (b.data && typeof b.data === 'object') { const d = JSON.stringify(b.data); if (d.length < 30000) run("insert into perfiles(id, codigo, data) values(?,?,?) on conflict(id) do update set data=excluded.data, updated_at=datetime('now')", pid, crypto.randomBytes(4).toString('hex').toUpperCase(), d); }
        c = q1('select * from cuentas where id=?', info.lastInsertRowid); nueva = true;
      }
      if (c.suspendido) return send(res, 403, { error: 'Esta cuenta está suspendida' });
      let avatar = null; // su foto de perfil de Google/Facebook (se revisa antes de mostrarse a los demás)
      if (ps.foto && /^https:\/\//.test(ps.foto) && (nueva || !/^f/.test(c.avatar || ''))) { try { const im = await fetch(ps.foto, { signal: AbortSignal.timeout(15000) }); if (im.ok) avatar = await guardarFoto(Buffer.from(await im.arrayBuffer()), b.uid); } catch (e) {} if (avatar) run('update cuentas set avatar=? where id=?', avatar, c.id); }
      const tok = crypto.randomBytes(24).toString('hex'); run('insert into sesiones(tok, cuenta_id) values(?,?)', tok, c.id);
      const f = q1('select data from perfiles where id=?', c.perfil_id);
      return send(res, 200, { ok: 1, tok, usuario: c.usuario, nueva, avatar, data: !nueva && f ? JSON.parse(f.data) : null });
    }
    if (r === '/api/cuenta/entrar' && P) {
      const b = await json(req), usuario = String(b.usuario || '').trim().slice(0, 30);
      if (limite(ip, 'cuentaE', 12, 15 * 60000) || limite('u:' + usuario.toLowerCase(), 'cuentaE', 8, 15 * 60000)) return send(res, 429, { error: 'Demasiados intentos. Espera 15 minutos.' });
      const c = q1('select * from cuentas where usuario=?', usuario);
      if (!c || !crypto.timingSafeEqual(Buffer.from(hashClave(b.clave || '', c.sal), 'hex'), Buffer.from(c.hash, 'hex'))) return send(res, 401, { error: 'Usuario o contraseña incorrectos' });
      const tok = crypto.randomBytes(24).toString('hex'); run('insert into sesiones(tok, cuenta_id) values(?,?)', tok, c.id);
      const f = q1('select data from perfiles where id=?', c.perfil_id);
      return send(res, 200, { ok: 1, tok, usuario: c.usuario, data: f ? JSON.parse(f.data) : null });
    }
    // 🗑️ Borrar mi cuenta y mis datos (lo pide la ley y Facebook/Google). No se puede deshacer.
    if (r === '/api/cuenta/borrar' && P) {
      if (limite(ip, 'cuentaB', 5, 15 * 60000)) return send(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
      const b = await json(req), c = cuentaDeTok(b.tok); if (!c) return send(res, 401, { error: 'Primero entra a tu usuario en este celular o computadora' });
      if (String(b.confirmar || '').trim().toUpperCase() !== 'BORRAR') return send(res, 400, { error: 'Escribe BORRAR para confirmar' });
      const id = c.id, pid = c.perfil_id, uid = /^[a-z0-9]{8,40}$/.test(String(b.uid || '')) ? String(b.uid) : null, T = (sql, ...a) => { try { run(sql, ...a); } catch (e) {} };
      T('delete from sesiones where cuenta_id=?', id); T('delete from amigos where a=? or b=?', id, id); T('delete from bloqueos where quien=? or a=?', id, id);
      T('delete from dm where de=? or para=?', id, id); T('delete from dm_reportes where quien=?', id); T('delete from grupo_miembros where cuenta=?', id); T('delete from gmsg where de=?', id);
      for (const j of [pid, uid].filter(Boolean)) { T('delete from glory_rank where jugador=?', j); T('delete from glory_semana where jugador=?', j); T('delete from glory_premios where jugador=?', j); T('delete from clan_miembros where jugador=?', j); T('delete from arcade where uid=?', j); T("update chat set nombre='(borrado)', texto='(mensaje borrado)', borrado=1 where uid=?", j); T('delete from ref_codigos where uid=?', j); }
      T('delete from perfiles where id=?', pid); T('delete from cuentas where id=?', id);
      if (uid) try { borrarFotos(uid); } catch (e) {}
      return send(res, 200, { ok: 1 });
    }
    if (r === '/api/cuenta/salir' && P) { const b = await json(req); if (b.tok) run('delete from sesiones where tok=?', String(b.tok)); return send(res, 200, { ok: 1 }); }
    if (r === '/api/cuenta/yo' && P) { const b = await json(req), c = cuentaDeTok(b.tok); return send(res, 200, c ? { usuario: c.usuario } : { usuario: null }); }

    // ===== Clanes =====
    if (r.startsWith('/api/clan')) {
      if (r === '/api/clanes') { const busca = String(u.searchParams.get('q') || '').slice(0, 30); const l = q(`select c.id, c.nombre, c.insignia, c.descr, (select count(*) from clan_miembros m where m.clan_id=c.id) miembros, (select coalesce(sum(trofeos),0) from clan_miembros m where m.clan_id=c.id) trofeos from clanes c ${busca ? 'where c.nombre like ?' : ''} order by trofeos desc, miembros desc limit 30`, ...(busca ? ['%' + busca + '%'] : [])); return send(res, 200, { clanes: l, insignias }); }
      if (!P) return false;
      if (limite(ip, 'clan', 90)) return send(res, 429, { error: 'Más despacio 🙂' });
      const b = await json(req); if (String(b.uid || '').length < 6) return send(res, 400, { error: 'Falta tu perfil' });
      const jid = jugadorId(b), yo = q1('select * from clan_miembros where jugador=?', jid), nombre = apodo(b.nombre) || 'Jugador', trofeos = Math.max(0, Math.min(99999, +b.trofeos || 0));
      if (yo && (yo.nombre !== nombre || yo.trofeos !== trofeos)) run('update clan_miembros set nombre=?, trofeos=? where jugador=?', nombre, trofeos, jid);
      if (r === '/api/clan/crear') {
        if (yo) return send(res, 400, { error: 'Ya estás en un clan. Sal primero para crear otro.' });
        const n = apodo(b.clan); if (!n || n.length < 3) return send(res, 400, { error: 'Elige un nombre de clan de 3 a 18 letras, sin groserías' });
        if (q1('select 1 from clanes where nombre=?', n)) return send(res, 409, { error: 'Ya existe un clan con ese nombre' });
        const d = revisar(b.descr || 'Clan de Duelo de Torres'); if (d.error) return send(res, 400, { error: 'Descripción: ' + d.error });
        const ins = insignias.includes(b.insignia) ? b.insignia : '🛡️', info = run('insert into clanes(nombre, insignia, descr, lider) values(?,?,?,?)', n, ins, d.texto.slice(0, 120), jid);
        run('insert into clan_miembros(jugador, clan_id, nombre, trofeos, rol) values(?,?,?,?,?)', jid, info.lastInsertRowid, nombre, trofeos, 'líder');
        run('insert into clan_chat(clan_id, nombre, avatar, texto, tipo) values(?,?,?,?,?)', info.lastInsertRowid, nombre, '', `${nombre} fundó el clan 🎉`, 'sis');
        return send(res, 200, { ok: 1 });
      }
      if (r === '/api/clan/unir') {
        if (yo) return send(res, 400, { error: 'Ya estás en un clan' });
        const c = q1('select * from clanes where id=?', +b.clan); if (!c) return send(res, 404, { error: 'Ese clan ya no existe' });
        if (q1('select count(*) n from clan_miembros where clan_id=?', c.id).n >= 30) return send(res, 400, { error: 'Ese clan está lleno (30 miembros)' });
        run('insert into clan_miembros(jugador, clan_id, nombre, trofeos) values(?,?,?,?)', jid, c.id, nombre, trofeos);
        run('insert into clan_chat(clan_id, nombre, avatar, texto, tipo) values(?,?,?,?,?)', c.id, nombre, '', `${nombre} se unió al clan 👋`, 'sis');
        return send(res, 200, { ok: 1 });
      }
      if (!yo) return send(res, 200, { clan: null });
      if (r === '/api/clan/salir') {
        run('delete from clan_miembros where jugador=?', jid); run('insert into clan_chat(clan_id, nombre, avatar, texto, tipo) values(?,?,?,?,?)', yo.clan_id, nombre, '', `${nombre} salió del clan`, 'sis');
        const quedan = q('select jugador from clan_miembros where clan_id=? order by trofeos desc', yo.clan_id);
        if (!quedan.length) { run('delete from clanes where id=?', yo.clan_id); run('delete from clan_chat where clan_id=?', yo.clan_id); } else if (yo.rol === 'líder') run("update clan_miembros set rol='líder' where jugador=?", quedan[0].jugador);
        return send(res, 200, { ok: 1 });
      }
      if (r === '/api/clan/chat') {
        if (limite(jid, 'clanmsg', 12)) return send(res, 429, { error: 'Estás enviando muy rápido 🙂' });
        const av = require('./fotos').valido(b.avatar) ? b.avatar : 'a01';
        if (b.reto) { const cod = String(b.reto).toUpperCase(); const sa = [...salas.values()].find(x => x.codigo === cod && x.estado === 'esperando'); if (!sa) return send(res, 400, { error: 'Esa sala ya no está disponible' }); run('insert into clan_chat(clan_id, nombre, avatar, texto, tipo, extra) values(?,?,?,?,?,?)', yo.clan_id, nombre, av, `⚔️ ${nombre} busca rival para un ${sa.modo === '2v2' ? '2 vs 2' : '1 vs 1'}`, 'reto', cod); return send(res, 200, { ok: 1 }); }
        const t = revisar(b.texto); if (t.error) return send(res, 400, { error: t.error });
        run('insert into clan_chat(clan_id, nombre, avatar, texto) values(?,?,?,?)', yo.clan_id, nombre, av, t.texto);
        run("delete from clan_chat where clan_id=? and created_at < datetime('now','-14 days')", yo.clan_id);
        return send(res, 200, { ok: 1 });
      }
      if (r === '/api/clan/mio') {
        const c = q1('select id, nombre, insignia, descr from clanes where id=?', yo.clan_id);
        const desde = Math.max(0, +b.desde || 0), msgs = q('select id, nombre, avatar, texto, tipo, extra, created_at from clan_chat where clan_id=? and id>? order by id desc limit 60', yo.clan_id, desde).reverse();
        const miembros = b.desde ? undefined : q('select nombre, trofeos, rol from clan_miembros where clan_id=? order by trofeos desc', yo.clan_id);
        return send(res, 200, { clan: c, rol: yo.rol, miembros, msgs });
      }
      return false;
    }

    // ===== Ranking de GLORY BROWN (puntos que solo da el servidor en partidas en línea) =====
    if (r === '/api/glory/ranking') {
      const tipo = u.searchParams.get('tipo') === 'clanes' ? 'clanes' : 'jugadores', pais = String(u.searchParams.get('pais') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
      if (tipo === 'clanes') return send(res, 200, { lista: q(`select c.nombre, c.insignia, count(*) miembros, coalesce(sum(r.puntos),0) puntos from clanes c join clan_miembros m on m.clan_id=c.id left join glory_rank r on r.jugador=m.jugador group by c.id order by puntos desc limit 50`) });
      return send(res, 200, { lista: q(`select nombre, pais, puntos, victorias, derrotas from glory_rank ${pais ? 'where pais=?' : ''} order by puntos desc, victorias desc limit 50`, ...(pais ? [pais] : [])) });
    }
    if (r === '/api/glory/torneo') {
      const sem = lunes(), mi = G_MUNDOS[Math.floor(new Date(sem).getTime() / (7 * 864e5)) % 7];
      return send(res, 200, { semana: sem, termina: finSemana(), evento: `Torneo del ${mi}`, top: q('select nombre, pais, puntos, victorias, partidas from glory_semana where semana=? order by puntos desc, victorias desc limit 30', sem), premios: [['🥇 1.º', 'Cofre Real de Glory'], ['🥈 2.º y 3.º', 'Cofre Mágico'], ['🏅 4.º al 10.º', 'Cofre de Oro'], ['🎖️ 11.º al 50.º', 'Cofre de Plata']] });
    }
    if (r === '/api/glory/torneo/yo' && P) {
      const b = await json(req), jid = jugadorId(b), sem = lunes(), f = q1('select puntos, victorias, partidas from glory_semana where semana=? and jugador=?', sem, jid);
      const puesto = f ? q1('select count(*) n from glory_semana where semana=? and puntos > ?', sem, f.puntos).n + 1 : null;
      const ant = lunes(1), fa = q1('select puntos from glory_semana where semana=? and jugador=?', ant, jid), pa = fa ? q1('select count(*) n from glory_semana where semana=? and puntos > ?', ant, fa.puntos).n + 1 : null;
      const premio = pa && PREMIO(pa) && !q1('select 1 from glory_premios where semana=? and jugador=?', ant, jid) ? { puesto: pa, cofre: PREMIO(pa) } : null;
      return send(res, 200, { ...(f || { puntos: 0, victorias: 0, partidas: 0 }), puesto, premio });
    }
    if (r === '/api/glory/torneo/reclamar' && P) {
      const b = await json(req), jid = jugadorId(b), ant = lunes(1), fa = q1('select puntos from glory_semana where semana=? and jugador=?', ant, jid); if (!fa) return send(res, 400, { error: 'No participaste en el torneo pasado' });
      const pa = q1('select count(*) n from glory_semana where semana=? and puntos > ?', ant, fa.puntos).n + 1, cofre = PREMIO(pa); if (!cofre) return send(res, 400, { error: 'Esta vez no alcanzaste premio. ¡La próxima!' });
      try { run('insert into glory_premios(semana, jugador, cofre) values(?,?,?)', ant, jid, cofre); } catch (e) { return send(res, 409, { error: 'Ya reclamaste este premio' }); }
      return send(res, 200, { cofre, puesto: pa });
    }
    // Video de la batalla: lo convierte a MP4 vertical (1080x1920) para TikTok, Reels y Facebook.
    if (r === '/api/glory/video' && P) {
      if (limite(ip, 'video', 6, 3600000)) return send(res, 429, { error: 'Ya hiciste muchos videos esta hora 🙂' });
      const chunks = []; let tam2 = 0; for await (const c of req) { tam2 += c.length; if (tam2 > 45 * 1024 * 1024) return send(res, 413, { error: 'Video muy grande' }); chunks.push(c); }
      const dir = path.join(VIDEOS), id = crypto.randomBytes(8).toString('hex'), todo = Buffer.concat(chunks), li = Math.max(0, +u.searchParams.get('i') || 0), lo = Math.max(0, +u.searchParams.get('o') || 0);
      if (li + lo >= todo.length) return send(res, 400, { error: 'Video vacío' });
      fs.mkdirSync(dir, { recursive: true });
      const ent = path.join(dir, id + (String(req.headers['content-type']).includes('mp4') ? '.in.mp4' : '.in.webm')), pIni = path.join(dir, id + '.ini.png'), pFin = path.join(dir, id + '.fin.png'), sal = path.join(dir, id + '.mp4');
      fs.writeFileSync(ent, todo.subarray(li + lo)); if (li) fs.writeFileSync(pIni, todo.subarray(0, li)); if (lo) fs.writeFileSync(pFin, todo.subarray(li, li + lo));
      const dur = Math.max(1, +u.searchParams.get('dur') || 60), vel = dur > 60 ? Math.min(3, dur / 55) : 1, audio = u.searchParams.get('a') === '1';
      const atempo = vel > 2 ? `atempo=2,atempo=${(vel / 2).toFixed(3)}` : `atempo=${vel.toFixed(3)}`;
      const vb = `setpts=PTS/${vel.toFixed(3)},scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x1e1b4b,setsar=1,fps=30,format=yuv420p`;
      const ejecutar = args => new Promise(fin => { const p2 = require('child_process').spawn('ffmpeg', ['-y', '-v', 'error', ...args], { windowsHide: true }); p2.on('error', () => fin(false)); p2.on('close', c => fin(c === 0)); setTimeout(() => { try { p2.kill(); } catch (e) {} fin(false); }, 180000); });
      let ok = false;
      if (li && lo) { // intro (2,2 s) + batalla + cierre (3 s), con fundidos y el sonido del juego
        const fc = `[0:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=1.8:d=0.4[v0];[1:v]${vb}[v1];[2:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p,fade=t=in:st=0:d=0.5[v2];` +
          (audio ? `[3:a]asplit[s0][s1];[s0]atrim=duration=2.2[a0];[s1]atrim=duration=3[a2];[1:a]${atempo},aresample=44100[a1];[v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1[v][a]` : `[v0][v1][v2]concat=n=3:v=1:a=0[v]`);
        ok = await ejecutar(['-loop', '1', '-t', '2.2', '-i', pIni, '-i', ent, '-loop', '1', '-t', '3', '-i', pFin, ...(audio ? ['-f', 'lavfi', '-t', '6', '-i', 'anullsrc=r=44100:cl=stereo'] : []), '-filter_complex', fc, '-map', '[v]', ...(audio ? ['-map', '[a]', '-c:a', 'aac', '-b:a', '128k'] : ['-an']), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', sal]);
      }
      if (!ok) ok = await ejecutar(['-i', ent, '-vf', vb, ...(audio ? ['-af', atempo, '-c:a', 'aac'] : ['-an']), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', sal]);
      for (const f of [pIni, pFin]) try { fs.unlinkSync(f); } catch (e) {}
      try { fs.unlinkSync(ent); } catch (e) {}
      for (const f of fs.readdirSync(dir)) try { if (Date.now() - fs.statSync(path.join(dir, f)).mtimeMs > 864e5) fs.unlinkSync(path.join(dir, f)); } catch (e) {}
      return ok ? send(res, 200, { url: `/videos/${id}.mp4` }) : send(res, 500, { error: 'No se pudo preparar el video' });
    }
    if (r === '/api/glory/yo' && P) {
      const b = await json(req), jid = jugadorId(b), f = q1('select puntos, pais, victorias, derrotas from glory_rank where jugador=?', jid); if (!f) return send(res, 200, { puntos: 0, puesto: null });
      const puesto = q1('select count(*) n from glory_rank where puntos > ?', f.puntos).n + 1, puestoPais = f.pais ? q1('select count(*) n from glory_rank where pais=? and puntos > ?', f.pais, f.puntos).n + 1 : null;
      return send(res, 200, { ...f, puesto, puestoPais });
    }
    // ===== Salas de Duelo de Torres =====
    if (r === '/api/duelo/stream') {
      const s = salas.get(u.searchParams.get('sala')), tok = String(u.searchParams.get('tok') || '');
      if (!s || !s.jugadores.some(j => j.tok === tok)) return send(res, 404, { error: 'Sala no encontrada' });
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      res.write('retry: 2000\n\n'); const c = { res, tok }; if (!subs.has(s.id)) subs.set(s.id, new Set()); subs.get(s.id).add(c); s.completo = true;
      res.write(`event: sala\ndata: ${JSON.stringify(pub(s))}\n\n`); if (s.estado === 'jugando') res.write(`event: empieza\ndata: ${JSON.stringify(pub(s))}\n\n`);
      const ka = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 15000);
      req.on('close', () => { clearInterval(ka); subs.get(s.id)?.delete(c); const j = s.jugadores.find(x => x.tok === tok);
        setTimeout(() => { if (![...(subs.get(s.id) || [])].some(x => x.tok === tok) && j && salas.has(s.id)) { if (s.estado === 'esperando') { s.jugadores = s.jugadores.filter(x => x !== j); emitir(s, 'sala', pub(s)); if (!s.jugadores.length) salas.delete(s.id); } else { if (s.motor) s.motor.S.asientos[j.asiento].ctrl = 'ia'; emitir(s, 'salio', { asiento: j.asiento, nombre: j.nombre }); } } }, 4000); });
      return;
    }
    if (!P || !r.startsWith('/api/duelo/')) return false;
    if (limite(ip, 'duelo', 4000)) return send(res, 429, { error: 'Más despacio' });
    const b = await json(req), accion = r.slice(11);
    if (accion === 'buscar' || accion === 'crear' || accion === 'unir') {
      if (limite(ip, 'dueloB', 60)) return send(res, 429, { error: 'Más despacio 🙂' });
      const modo = b.modo === '2v2' ? '2v2' : '1v1'; let s;
      if (accion === 'unir') { s = [...salas.values()].find(x => x.codigo === String(b.codigo || '').toUpperCase().trim() && x.estado === 'esperando'); if (!s) return send(res, 404, { error: 'No hay ninguna sala esperando con ese código' }); }
      else if (accion === 'crear') s = nuevaSala(modo, true);
      else { s = cola[modo].map(id => salas.get(id)).find(x => x && x.estado === 'esperando' && x.jugadores.length < tam(modo) && !x.jugadores.some(j => j.jid === jugadorId(b))); if (!s) { s = nuevaSala(modo, false); cola[modo].push(s.id); } }
      const j = sentar(s, b); if (!j) return send(res, 400, { error: 'La sala está llena' }); j.pais = String(req.headers['cf-ipcountry'] || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || null; if (j.pais === 'XX' || j.pais === 'T1') j.pais = null;
      if (s.jugadores.length === tam(s.modo)) empezar(s); else emitir(s, 'sala', pub(s));
      return send(res, 200, { sala: s.id, tok: j.tok, asiento: j.asiento, codigo: s.codigo, modo: s.modo });
    }
    const s = salas.get(String(b.sala || '')), j = s && s.jugadores.find(x => x.tok === b.tok);
    if (!s || !j) return send(res, 404, { error: 'Sala no encontrada' });
    s.activo = Date.now();
    if (accion === 'bots') { if (s.estado === 'esperando' && j.asiento === 0) empezar(s, true); return send(res, 200, { ok: 1 }); }
    if (accion === 'salir') { if (s.motor && !s.motor.S.fin) { s.motor.S.asientos[j.asiento].ctrl = 'ia'; if (!s.jugadores.some(x => !x.bot && x !== j)) { s.motor.terminar(1 - (s.modo === '2v2' ? (j.asiento < 2 ? 0 : 1) : j.asiento)); } } s.jugadores = s.jugadores.filter(x => x !== j); emitir(s, s.estado === 'esperando' ? 'sala' : 'salio', s.estado === 'esperando' ? pub(s) : { asiento: j.asiento, nombre: j.nombre }); if (!s.jugadores.some(x => !x.bot)) { clearInterval(s.reloj); salas.delete(s.id); } return send(res, 200, { ok: 1 }); }
    if (accion === 'msg') {
      const tipo = String(b.tipo || ''), datos = b.datos || {};
      if (tipo === 'jugar') { if (!s.motor) return send(res, 409, { error: 'La partida no ha empezado' }); if (limite(b.tok, 'jugada', 60, 10000)) return send(res, 429, { error: 'Más despacio' }); const ok = s.motor.jugar(j.asiento, String(datos.k || ''), +datos.x, +datos.y); return send(res, 200, { ok }); }
      if (tipo === 'rendirse') { if (s.motor && !s.motor.S.fin) { if (s.modo === '2v2') { s.motor.S.asientos[j.asiento].ctrl = 'ia'; emitir(s, 'salio', { asiento: j.asiento, nombre: j.nombre }); } else s.motor.terminar(1 - j.asiento); } return send(res, 200, { ok: 1 }); }
      if (tipo === 'emote') { if (!['😂', '👍', '😡', '😭', '😎', '👏'].includes(datos.e)) return send(res, 400, { error: 'Emoji no válido' }); if (limite(b.tok, 'emote', 6, 10000)) return send(res, 429, { error: 'Más despacio' }); emitir(s, 'emote', { de: j.asiento, a: j.asiento, e: datos.e }, j.tok); return send(res, 200, { ok: 1 }); }
      return send(res, 400, { error: 'Mensaje no válido' });
    }
    return send(res, 404, { error: 'No encontrado' });
  }
  return { http, perfilId, cuentaDeTok };
}
module.exports = { crear };
