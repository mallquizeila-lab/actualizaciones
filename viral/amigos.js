// 👥 Amigos y mensajes privados entre usuarios registrados.
// - Buscar por usuario, enviar y aceptar solicitudes. Solo se puede escribir a quien aceptó ser tu amigo.
// - Mismo filtro que el chat público: sin enlaces, teléfonos, correos ni groserías.
// - Bloquear y reportar. El dueño ve los reportes en su panel y puede suspender a un usuario.
// - Invitaciones a jugar: un mensaje especial con el juego y, si hay, el código de la sala.
const crypto = require('crypto');
function crear({ db, q, q1, run, revisar, valido, catalogo, notificar = () => {} }) {
  db.exec(`create table if not exists amigos (a integer, b integer, estado text default 'pendiente', de integer, created_at text default (datetime('now')), primary key (a, b));
    create table if not exists bloqueos (quien integer, a integer, primary key (quien, a));
    create table if not exists dm (id integer primary key, de integer, para integer, texto text, tipo text default 'msg', extra text, leido integer default 0, created_at text default (datetime('now')));
    create index if not exists dm_par on dm(de, para, id);
    create table if not exists grupos (id integer primary key, nombre text, creador integer, created_at text default (datetime('now')));
    create table if not exists grupo_miembros (grupo integer, cuenta integer, leido integer default 0, unido text default (datetime('now')), primary key (grupo, cuenta));
    create table if not exists gmsg (id integer primary key, grupo integer, de integer, texto text, tipo text default 'msg', extra text, created_at text default (datetime('now')));
    create index if not exists gmsg_g on gmsg(grupo, id);
    create table if not exists dm_reportes (id integer primary key, quien integer, a integer, texto text, created_at text default (datetime('now')));`);
  try { db.exec('alter table cuentas add column avatar text'); } catch (e) {}
  try { db.exec('alter table cuentas add column suspendido integer default 0'); } catch (e) {}
  try { db.exec('alter table cuentas add column vid text'); } catch (e) {}
  // Aviso por notificación cuando te escriben (máximo uno cada 2 minutos por conversación, para no molestar)
  const ultAviso = new Map();
  function avisar(para, clave, titulo, cuerpo) { const k = para.id + '|' + clave, ahora = Date.now(); if (ahora - (ultAviso.get(k) || 0) < 120000 || Date.now() - (visto.get(para.id) || 0) < 15000) return; ultAviso.set(k, ahora); if (para.vid) notificar(para.vid, { title: titulo, body: cuerpo, url: '/?amigos=1' }); }
  const visto = new Map(); // cuenta -> último momento en línea
  const par = (x, y) => x < y ? [x, y] : [y, x];
  const relacion = (x, y) => { const [a, b] = par(x, y); return q1('select * from amigos where a=? and b=?', a, b); };
  const bloqueado = (x, y) => !!q1('select 1 from bloqueos where (quien=? and a=?) or (quien=? and a=?)', x, y, y, x);
  const publico = c => ({ usuario: c.usuario, avatar: valido(c.avatar) ? c.avatar : 'a01', enLinea: Date.now() - (visto.get(c.id) || 0) < 120000 });
  const JUEGOS_INV = () => Object.fromEntries((catalogo() || []).filter(t => t.tipo === 'arcade' || t.tipo === 'mesa' || t.tipo === 'sala').map(t => [t.id, t.e + ' ' + t.t]));

  async function http(req, res, u, { ip, json, send, limite, cuentaDeTok }) {
    if (req.method !== 'POST') return false;
    const r = u.pathname, b = await json(req), yo = cuentaDeTok(b.tok);
    if (!yo) return send(res, 401, { error: 'Crea tu usuario o inicia sesión para usar Amigos' });
    const me = q1('select * from cuentas where id=?', yo.id); visto.set(me.id, Date.now());
    if (b.avatar && valido(b.avatar) && b.avatar !== me.avatar) run('update cuentas set avatar=? where id=?', b.avatar, me.id);
    if (/^[a-z0-9]{8,40}$/.test(b.vid || '') && b.vid !== me.vid) run('update cuentas set vid=? where id=?', b.vid, me.id);
    const otro = () => { const c = q1('select * from cuentas where usuario=?', String(b.usuario || '').trim().slice(0, 30)); return c && c.id !== me.id ? c : null; };

    if (r === '/api/amigos/buscar') {
      if (limite(ip, 'amBus', 40)) return send(res, 429, { error: 'Más despacio' });
      const t = String(b.q || '').trim().replace(/[%_]/g, '').slice(0, 18); if (t.length < 2) return send(res, 200, { usuarios: [] });
      const lista = q("select * from cuentas where usuario like ? and id<>? and coalesce(suspendido,0)=0 order by length(usuario) limit 15", t + '%', me.id)
        .filter(c => !bloqueado(me.id, c.id)).map(c => { const rel = relacion(me.id, c.id); return { ...publico(c), estado: rel ? (rel.estado === 'ok' ? 'amigo' : rel.de === me.id ? 'enviada' : 'recibida') : null }; });
      return send(res, 200, { usuarios: lista });
    }
    if (r === '/api/amigos/lista') {
      const filas = q('select * from amigos where a=? or b=?', me.id, me.id), amigos = [], recibidas = [], enviadas = [];
      for (const f of filas) { const oid = f.a === me.id ? f.b : f.a, c = q1('select * from cuentas where id=?', oid); if (!c || bloqueado(me.id, oid)) continue;
        const x = { ...publico(c), sinLeer: f.estado === 'ok' ? q1('select count(*) n from dm where de=? and para=? and leido=0', oid, me.id).n : 0, ultimo: f.estado === 'ok' ? q1('select max(id) m from dm where (de=? and para=?) or (de=? and para=?)', oid, me.id, me.id, oid).m || 0 : 0 };
        if (f.estado === 'ok') amigos.push(x); else if (f.de === me.id) enviadas.push(x); else recibidas.push(x); }
      amigos.sort((p, s) => (s.enLinea - p.enLinea) || (s.ultimo - p.ultimo));
      const grupos = q('select g.id, g.nombre, m.leido, (select count(*) from grupo_miembros where grupo=g.id) miembros, (select max(id) from gmsg where grupo=g.id) ultimo from grupos g join grupo_miembros m on m.grupo=g.id and m.cuenta=? order by ultimo desc', me.id)
        .map(g => ({ id: g.id, nombre: g.nombre, miembros: g.miembros, sinLeer: q1('select count(*) n from gmsg where grupo=? and id>? and de<>?', g.id, g.leido || 0, me.id).n }));
      return send(res, 200, { usuario: me.usuario, amigos, recibidas, enviadas, grupos, juegos: JUEGOS_INV() });
    }
    if (r === '/api/amigos/pedir') {
      if (limite(ip, 'amPed', 30, 3600000)) return send(res, 429, { error: 'Enviaste muchas solicitudes. Intenta más tarde.' });
      const c = otro(); if (!c || c.suspendido) return send(res, 404, { error: 'No encontramos ese usuario' }); if (bloqueado(me.id, c.id)) return send(res, 403, { error: 'No puedes agregar a este usuario' });
      const rel = relacion(me.id, c.id), [a, bb] = par(me.id, c.id);
      if (rel?.estado === 'ok') return send(res, 200, { ok: 1, estado: 'amigo' });
      if (rel && rel.de !== me.id) { run("update amigos set estado='ok' where a=? and b=?", a, bb); return send(res, 200, { ok: 1, estado: 'amigo' }); } // los dos se pidieron: amigos
      if (!rel) { run('insert into amigos(a, b, de) values(?,?,?)', a, bb, me.id); avisar(c, 'sol' + me.id, '👥 Nueva solicitud de amistad', `${me.usuario} quiere ser tu amigo en Yupitok`); }
      return send(res, 200, { ok: 1, estado: 'enviada' });
    }
    if (r === '/api/amigos/aceptar') { const c = otro(); if (!c) return send(res, 404, { error: 'No encontrado' }); const [a, bb] = par(me.id, c.id); run("update amigos set estado='ok' where a=? and b=? and de<>?", a, bb, me.id); return send(res, 200, { ok: 1 }); }
    if (r === '/api/amigos/quitar') { const c = otro(); if (!c) return send(res, 404, { error: 'No encontrado' }); const [a, bb] = par(me.id, c.id); run('delete from amigos where a=? and b=?', a, bb); return send(res, 200, { ok: 1 }); }
    if (r === '/api/amigos/bloquear') { const c = otro(); if (!c) return send(res, 404, { error: 'No encontrado' }); const [a, bb] = par(me.id, c.id); run('delete from amigos where a=? and b=?', a, bb); run('insert or ignore into bloqueos(quien, a) values(?,?)', me.id, c.id); return send(res, 200, { ok: 1 }); }
    if (r === '/api/amigos/reportar') {
      const c = otro(); if (!c) return send(res, 404, { error: 'No encontrado' });
      const ult = q("select texto from dm where de=? and para=? order by id desc limit 5", c.id, me.id).map(x => x.texto).reverse().join(' | ');
      run('insert into dm_reportes(quien, a, texto) values(?,?,?)', me.id, c.id, String(b.motivo || '').slice(0, 200) + (ult ? ' — Últimos mensajes: ' + ult.slice(0, 600) : '')); return send(res, 200, { ok: 1 });
    }
    // ---- Mensajes ----
    const amigo = () => { const c = otro(); if (!c) return null; const rel = relacion(me.id, c.id); return rel?.estado === 'ok' && !bloqueado(me.id, c.id) ? c : null; };
    if (r === '/api/dm/hilo') {
      const c = amigo(); if (!c) return send(res, 403, { error: 'Solo puedes escribir a tus amigos' });
      const desde = Math.max(0, +b.desde || 0), msgs = q('select id, de, texto, tipo, extra, created_at from dm where ((de=? and para=?) or (de=? and para=?)) and id>? order by id desc limit 60', me.id, c.id, c.id, me.id, desde).reverse();
      run('update dm set leido=1 where de=? and para=? and leido=0', c.id, me.id);
      return send(res, 200, { amigo: publico(c), msgs: msgs.map(m => ({ id: m.id, mio: m.de === me.id, texto: m.texto, tipo: m.tipo, extra: m.extra ? JSON.parse(m.extra) : null, t: Date.parse(m.created_at + 'Z') })) });
    }
    if (r === '/api/dm/enviar') {
      if (me.suspendido) return send(res, 403, { error: 'Tu cuenta no puede enviar mensajes' });
      if (limite('dm:' + me.id, 'dm', 20, 60000)) return send(res, 429, { error: 'Vas muy rápido 🙂 espera un momento' });
      const c = amigo(); if (!c) return send(res, 403, { error: 'Solo puedes escribir a tus amigos' });
      if (b.tipo === 'invita') { const J = JUEGOS_INV(); if (!J[b.juego]) return send(res, 400, { error: 'Juego no válido' }); const codigo = /^[A-Z0-9]{4,8}$/.test(String(b.codigo || '').toUpperCase()) ? String(b.codigo).toUpperCase() : null;
        run('insert into dm(de, para, texto, tipo, extra) values(?,?,?,?,?)', me.id, c.id, '🎮 Te invito a jugar ' + J[b.juego], 'invita', JSON.stringify({ juego: b.juego, codigo })); avisar(c, 'u' + me.id, `🎮 ${me.usuario} te invita a jugar`, J[b.juego] + (codigo ? ' · código ' + codigo : '')); return send(res, 200, { ok: 1 }); }
      const rv = revisar(b.texto); if (rv.error) return send(res, 400, { error: rv.error });
      run('insert into dm(de, para, texto) values(?,?,?)', me.id, c.id, rv.texto.slice(0, 300)); avisar(c, 'u' + me.id, `💬 ${me.usuario} te escribió`, rv.texto.slice(0, 90)); return send(res, 200, { ok: 1 });
    }
    // ---- Chats de grupo (con amigos) ----
    const esAmigo = c => c && relacion(me.id, c.id)?.estado === 'ok' && !bloqueado(me.id, c.id);
    const miGrupo = () => { const g = q1('select g.* from grupos g join grupo_miembros m on m.grupo=g.id and m.cuenta=? where g.id=?', me.id, +b.id || 0); return g || null; };
    if (r === '/api/grupos/crear') {
      if (limite(ip, 'grCrear', 10, 3600000)) return send(res, 429, { error: 'Creaste muchos grupos. Intenta más tarde.' });
      const rv = revisar(String(b.nombre || '').slice(0, 30)); if (rv.error || rv.texto.length < 2) return send(res, 400, { error: rv.error || 'Ponle un nombre al grupo' });
      const miembros = [...new Set((Array.isArray(b.miembros) ? b.miembros : []).slice(0, 19))].map(x => q1('select * from cuentas where usuario=?', String(x))).filter(esAmigo);
      if (!miembros.length) return send(res, 400, { error: 'Elige al menos un amigo' });
      const id = run('insert into grupos(nombre, creador) values(?,?)', rv.texto, me.id).lastInsertRowid;
      for (const c of [me, ...miembros]) run('insert or ignore into grupo_miembros(grupo, cuenta) values(?,?)', id, c.id);
      run('insert into gmsg(grupo, de, texto, tipo) values(?,?,?,?)', id, me.id, `👋 ${me.usuario} creó el grupo «${rv.texto}»`, 'sistema');
      return send(res, 200, { ok: 1, id });
    }
    if (r === '/api/grupos/hilo') {
      const g = miGrupo(); if (!g) return send(res, 403, { error: 'No estás en este grupo' });
      const desde = Math.max(0, +b.desde || 0), msgs = q('select m.id, m.de, m.texto, m.tipo, m.extra, m.created_at, c.usuario, c.avatar from gmsg m left join cuentas c on c.id=m.de where m.grupo=? and m.id>? order by m.id desc limit 80', g.id, desde).reverse();
      const ult = msgs.length ? msgs[msgs.length - 1].id : 0; if (ult) run('update grupo_miembros set leido=max(leido, ?) where grupo=? and cuenta=?', ult, g.id, me.id);
      const miembros = q('select c.* from grupo_miembros m join cuentas c on c.id=m.cuenta where m.grupo=?', g.id).map(publico);
      return send(res, 200, { grupo: { id: g.id, nombre: g.nombre, miembros }, msgs: msgs.map(m => ({ id: m.id, mio: m.de === me.id, de: m.usuario, avatar: valido(m.avatar) ? m.avatar : 'a01', texto: m.texto, tipo: m.tipo, extra: m.extra ? JSON.parse(m.extra) : null, t: Date.parse(m.created_at + 'Z') })) });
    }
    const avisarGrupo = (g, txt) => { for (const c of q('select c.* from grupo_miembros m join cuentas c on c.id=m.cuenta where m.grupo=? and c.id<>?', g.id, me.id)) avisar(c, 'g' + g.id, `👥 ${g.nombre}`, `${me.usuario}: ${txt}`.slice(0, 100)); };
    if (r === '/api/grupos/enviar') {
      if (me.suspendido) return send(res, 403, { error: 'Tu cuenta no puede enviar mensajes' });
      if (limite('gm:' + me.id, 'gm', 20, 60000)) return send(res, 429, { error: 'Vas muy rápido 🙂 espera un momento' });
      const g = miGrupo(); if (!g) return send(res, 403, { error: 'No estás en este grupo' });
      if (b.tipo === 'invita') { const J = JUEGOS_INV(); if (!J[b.juego]) return send(res, 400, { error: 'Juego no válido' }); const codigo = /^[A-Z0-9]{4,8}$/.test(String(b.codigo || '').toUpperCase()) ? String(b.codigo).toUpperCase() : null;
        run('insert into gmsg(grupo, de, texto, tipo, extra) values(?,?,?,?,?)', g.id, me.id, '🎮 ¡Vamos a jugar ' + J[b.juego] + '!', 'invita', JSON.stringify({ juego: b.juego, codigo })); avisarGrupo(g, '🎮 ¡Vamos a jugar ' + J[b.juego] + '!'); return send(res, 200, { ok: 1 }); }
      const rv = revisar(b.texto); if (rv.error) return send(res, 400, { error: rv.error });
      run('insert into gmsg(grupo, de, texto) values(?,?,?)', g.id, me.id, rv.texto.slice(0, 300)); avisarGrupo(g, rv.texto); return send(res, 200, { ok: 1 });
    }
    if (r === '/api/grupos/agregar') {
      const g = miGrupo(); if (!g) return send(res, 403, { error: 'No estás en este grupo' });
      if (q1('select count(*) n from grupo_miembros where grupo=?', g.id).n >= 20) return send(res, 400, { error: 'El grupo ya tiene 20 personas' });
      const c = otro(); if (!esAmigo(c)) return send(res, 403, { error: 'Solo puedes agregar a tus amigos' });
      if (q1('select 1 from grupo_miembros where grupo=? and cuenta=?', g.id, c.id)) return send(res, 200, { ok: 1 });
      run('insert into grupo_miembros(grupo, cuenta) values(?,?)', g.id, c.id); run('insert into gmsg(grupo, de, texto, tipo) values(?,?,?,?)', g.id, me.id, `➕ ${me.usuario} agregó a ${c.usuario}`, 'sistema');
      return send(res, 200, { ok: 1 });
    }
    if (r === '/api/grupos/salir') {
      const g = miGrupo(); if (!g) return send(res, 200, { ok: 1 });
      run('delete from grupo_miembros where grupo=? and cuenta=?', g.id, me.id); run('insert into gmsg(grupo, de, texto, tipo) values(?,?,?,?)', g.id, me.id, `🚪 ${me.usuario} salió del grupo`, 'sistema');
      if (!q1('select count(*) n from grupo_miembros where grupo=?', g.id).n) { run('delete from gmsg where grupo=?', g.id); run('delete from grupos where id=?', g.id); }
      return send(res, 200, { ok: 1 });
    }
    if (r === '/api/grupos/reportar') {
      const g = miGrupo(); if (!g) return send(res, 403, { error: 'No estás en este grupo' });
      const ult = q('select m.texto, c.usuario from gmsg m left join cuentas c on c.id=m.de where m.grupo=? and m.de<>? order by m.id desc limit 8', g.id, me.id).reverse().map(x => x.usuario + ': ' + x.texto).join(' | ');
      run('insert into dm_reportes(quien, a, texto) values(?,?,?)', me.id, 0, `[Grupo «${g.nombre}»] ` + String(b.motivo || '').slice(0, 200) + ' — ' + ult.slice(0, 700)); return send(res, 200, { ok: 1 });
    }
    if (r === '/api/dm/pendientes') { // para el globito de mensajes nuevos
      const gs = q('select grupo, leido from grupo_miembros where cuenta=?', me.id).reduce((n, g) => n + q1('select count(*) n from gmsg where grupo=? and id>? and de<>?', g.grupo, g.leido || 0, me.id).n, 0);
      return send(res, 200, { sinLeer: q1('select count(*) n from dm where para=? and leido=0', me.id).n + gs, solicitudes: q1("select count(*) n from amigos where (a=? or b=?) and estado='pendiente' and de<>?", me.id, me.id, me.id).n });
    }
    return send(res, 404, { error: 'No existe' });
  }
  // Panel del dueño: reportes y suspensiones
  function admin(r, b) {
    if (r === 'reportes-dm') return { reportes: q('select r.id, r.texto, r.created_at, (select usuario from cuentas where id=r.quien) quien, (select usuario from cuentas where id=r.a) a, (select coalesce(suspendido,0) from cuentas where id=r.a) suspendido from dm_reportes r order by r.id desc limit 100') };
    if (r === 'suspender' && b.usuario) { run('update cuentas set suspendido=? where usuario=?', b.si === false ? 0 : 1, String(b.usuario)); return { ok: 1 }; }
    return null;
  }
  return { http, admin };
}
module.exports = { crear };
