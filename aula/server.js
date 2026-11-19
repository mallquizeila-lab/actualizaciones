// 🎓 ProfeTok: sistema para docentes, padres y alumnos (con membresías).
// - Cada colegio (o docente independiente) tiene sus aulas, alumnos, notas, asistencia, tareas e incidencias.
// - Cada padre entra con su correo y SOLO ve a sus hijos: el servidor lo revisa en cada consulta.
// - Las fotos de los alumnos y los logos son privados: se sirven solo a quien tiene permiso.
// - Sin servicios externos: base de datos SQLite incorporada en Node (22.5+).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); }
catch (e) { if (process.execArgv.includes('--experimental-sqlite')) throw e; process.exit(require('child_process').spawnSync(process.execPath, ['--experimental-sqlite', ...process.execArgv, __filename, ...process.argv.slice(2)], { stdio: 'inherit' }).status ?? 1); }
for (const f of ['.env', '.env.txt']) { const fp = path.join(__dirname, f); if (!fs.existsSync(fp)) continue; for (const l of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(l); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } break; }

const E = process.env, PORT = +E.AULA_PORT || +E.PORT || 3400;
const DATA = E.AULA_DATA || path.join(__dirname, 'data'), PUB = path.join(__dirname, 'public'), ARCH = path.join(DATA, 'archivos');
fs.mkdirSync(ARCH, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'aula.db'));
db.exec('pragma journal_mode=wal; pragma foreign_keys=on;');
const q = (s, ...a) => db.prepare(s).all(...a), q1 = (s, ...a) => db.prepare(s).get(...a), run = (s, ...a) => db.prepare(s).run(...a);
const ahora = () => new Date().toISOString(), hoy = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10); // fecha de Perú
const DIA = 864e5, PRUEBA_DIAS = +E.AULA_PRUEBA_DIAS || 15;

db.exec(`
create table if not exists colegios (id integer primary key, nombre text, logo text, color text default '#0ea5e9', lema text, plan text default 'prueba', vence text, whatsapp text, creado text default (datetime('now')));
create table if not exists usuarios (id integer primary key, email text unique, nombre text, hash text, rol text, colegio_id integer, telefono text, activo integer default 1, creado text default (datetime('now')), ultimo text);
create table if not exists sesiones (token text primary key, usuario_id integer, expira integer);
create table if not exists aulas (id integer primary key, colegio_id integer, docente_id integer, nombre text, nivel text, grado text, seccion text, escala text default 'letras', meet text, horario text, creado text default (datetime('now')));
create table if not exists cursos (id integer primary key, aula_id integer, nombre text, color text);
create table if not exists alumnos (id integer primary key, aula_id integer, colegio_id integer, nombres text, apellidos text, foto text, nacimiento text, dni text, notas_salud text, consentimiento integer default 0, codigo text, creado text default (datetime('now')));
create table if not exists familia (padre_id integer, alumno_id integer, parentesco text, primary key (padre_id, alumno_id));
create table if not exists invitaciones (token text primary key, alumno_id integer, rol text, creado integer, usado integer default 0);
create table if not exists evaluaciones (id integer primary key, curso_id integer, aula_id integer, titulo text, fecha text, tipo text default 'evaluación', bimestre integer default 1);
create table if not exists notas (evaluacion_id integer, alumno_id integer, valor text, comentario text, primary key (evaluacion_id, alumno_id));
create table if not exists asistencia (aula_id integer, alumno_id integer, fecha text, estado text, primary key (alumno_id, fecha));
create table if not exists tareas (id integer primary key, aula_id integer, curso_id integer, titulo text, descripcion text, entrega text, creado text default (datetime('now')));
create table if not exists entregas (tarea_id integer, alumno_id integer, estado text, primary key (tarea_id, alumno_id));
create table if not exists incidencias (id integer primary key, alumno_id integer, aula_id integer, docente_id integer, fecha text, tipo text, descripcion text, visible_padre integer default 1, creado text default (datetime('now')));
create table if not exists comunicados (id integer primary key, aula_id integer, colegio_id integer, autor_id integer, titulo text, texto text, creado text default (datetime('now')));
create table if not exists leidos (comunicado_id integer, usuario_id integer, primary key (comunicado_id, usuario_id));
create table if not exists pagos (id integer primary key, colegio_id integer, plan text, monto real, metodo text, operacion text, estado text default 'pendiente', creado text default (datetime('now')), revisado text);
create table if not exists auditoria (id integer primary key, usuario_id integer, accion text, detalle text, fecha text default (datetime('now')));
create table if not exists ajustes (k text primary key, v text);
create index if not exists al_aula on alumnos(aula_id); create index if not exists al_col on alumnos(colegio_id); create index if not exists no_al on notas(alumno_id); create index if not exists en_al on entregas(alumno_id); create index if not exists fa_al on familia(alumno_id); create index if not exists inc_aula on incidencias(aula_id, fecha); create index if not exists au_doc on aulas(docente_id); create index if not exists au_col on aulas(colegio_id); create index if not exists us_col on usuarios(colegio_id); create index if not exists ta_aula on tareas(aula_id); create index if not exists ev_curso on evaluaciones(curso_id); create index if not exists co_aula on comunicados(aula_id); create index if not exists ev_aula on evaluaciones(aula_id); create index if not exists as_aula on asistencia(aula_id, fecha); create index if not exists inc_al on incidencias(alumno_id);
`);
const getS = (k, d) => { const r = q1('select v from ajustes where k=?', k); try { return r ? JSON.parse(r.v) : d; } catch (e) { return d; } };
const setS = (k, v) => run('insert into ajustes(k,v) values(?,?) on conflict(k) do update set v=excluded.v', k, JSON.stringify(v));
const audit = (uid, accion, detalle = '') => { try { run('insert into auditoria(usuario_id, accion, detalle) values(?,?,?)', uid, accion, String(detalle).slice(0, 300)); } catch (e) {} };

// ---------- contraseñas y sesiones ----------
const hashPass = p => { const sal = crypto.randomBytes(16).toString('hex'); return sal + ':' + crypto.scryptSync(String(p), sal, 64).toString('hex'); };
const verPass = (p, h) => { try { const [sal, x] = String(h).split(':'); return crypto.timingSafeEqual(Buffer.from(x, 'hex'), crypto.scryptSync(String(p), sal, 64)); } catch (e) { return false; } };
const nuevaSesion = uid => { const t = crypto.randomBytes(24).toString('base64url'); run('insert into sesiones values(?,?,?)', t, uid, Date.now() + 60 * DIA); run('update usuarios set ultimo=? where id=?', ahora(), uid); return t; };
const emailOk = e => /^[^\s@]{1,64}@[^\s@]{1,120}\.[a-z]{2,}$/i.test(String(e || '').trim());
const limpio = (t, n = 200) => String(t ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

// Dueño de la plataforma (tú): se crea solo la primera vez con AULA_OWNER_EMAIL y AULA_OWNER_PASS del .env
if (E.AULA_OWNER_EMAIL && !q1("select 1 from usuarios where rol='dueno'")) {
  const pass = E.AULA_OWNER_PASS || crypto.randomBytes(6).toString('base64url');
  run("insert into usuarios(email, nombre, hash, rol) values(?,?,?,'dueno')", E.AULA_OWNER_EMAIL.toLowerCase().trim(), 'Administrador', hashPass(pass));
  if (!E.AULA_OWNER_PASS) { fs.writeFileSync(path.join(DATA, 'CLAVE_DUENO.txt'), `Correo: ${E.AULA_OWNER_EMAIL}\nContraseña: ${pass}\nCámbiala apenas entres.\n`); console.log('[ProfeTok] Cuenta de dueño creada. La contraseña está en data/CLAVE_DUENO.txt'); }
}

// ---------- membresía ----------
const PLANES = getS('planes', { docente: { nombre: 'Docente', precio: 19, aulas: 6, ia: 60 }, colegio: { nombre: 'Colegio', precio: 149, aulas: 200, ia: 800 } });
const membresia = c => { if (!c) return { activa: false }; const v = c.vence ? new Date(c.vence).getTime() : 0, dias = Math.ceil((v - Date.now()) / DIA); return { plan: c.plan, vence: c.vence, dias, activa: dias > 0, prueba: c.plan === 'prueba' }; };

// ---------- permisos (el corazón de la privacidad) ----------
// dueño: todo · director: su colegio · docente: sus aulas · padre: solo sus hijos · alumno: solo él mismo
function alumnosVisibles(u) {
  if (u.rol === 'dueno') return null; // sin límite
  if (u.rol === 'director') return new Set(q('select id from alumnos where colegio_id=?', u.colegio_id).map(r => r.id));
  if (u.rol === 'docente') return new Set(q('select a.id from alumnos a join aulas x on x.id=a.aula_id where x.docente_id=?', u.id).map(r => r.id));
  if (u.rol === 'padre') return new Set(q('select alumno_id id from familia where padre_id=?', u.id).map(r => r.id));
  if (u.rol === 'alumno') return new Set(q('select alumno_id id from familia where padre_id=?', u.id).map(r => r.id)); // la cuenta de alumno se vincula igual que la del padre
  return new Set();
}
const veAlumno = (u, aid) => { const s = alumnosVisibles(u); return s === null || s.has(+aid); };
const aulaDe = (u, aid) => { const a = q1('select * from aulas where id=?', +aid); if (!a) return null; if (u.rol === 'dueno') return a; if (u.rol === 'director' && a.colegio_id === u.colegio_id) return a; if (u.rol === 'docente' && a.docente_id === u.id) return a; return null; };
const esStaff = u => ['docente', 'director', 'dueno'].includes(u.rol);

// ---------- 🚦 alerta temprana ----------
// Señales de los últimos 30 días: promedio bajo, faltas, incidencias y tareas sin entregar → riesgo alto / medio / bajo
const VAL_LETRA = { AD: 4, A: 3, B: 2, C: 1 };
const aNum = (v, escala) => { if (v == null || v === '') return null; if (escala === 'vigesimal') { const n = parseFloat(v); return isNaN(n) ? null : n / 5; } return VAL_LETRA[String(v).toUpperCase()] ?? null; }; // todo a escala 0–4
function riesgo(alumnoId) {
  const al = q1('select * from alumnos where id=?', alumnoId); if (!al) return null; const au = q1('select * from aulas where id=?', al.aula_id); const desde = new Date(Date.now() - 30 * DIA).toISOString().slice(0, 10);
  const notas = q('select n.valor, e.fecha from notas n join evaluaciones e on e.id=n.evaluacion_id where n.alumno_id=?', alumnoId).map(r => aNum(r.valor, au?.escala)).filter(v => v != null);
  const prom = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  const as = q('select estado from asistencia where alumno_id=? and fecha>=?', alumnoId, desde); const faltas = as.filter(r => r.estado === 'F').length, tard = as.filter(r => r.estado === 'T').length, pctAsis = as.length ? Math.round(as.filter(r => r.estado !== 'F').length / as.length * 100) : null;
  const inc = q1("select count(*) n from incidencias where alumno_id=? and fecha>=? and tipo in ('conducta','académica','salud')", alumnoId, desde).n;
  const sinEntregar = q1("select count(*) n from tareas t left join entregas e on e.tarea_id=t.id and e.alumno_id=? where t.aula_id=? and t.entrega<? and (e.estado is null or e.estado='pendiente')", alumnoId, al.aula_id, hoy()).n;
  const motivos = []; let pts = 0;
  if (prom != null && prom < 1.75) { pts += 3; motivos.push('Promedio bajo (en inicio)'); } else if (prom != null && prom < 2.4) { pts += 1; motivos.push('Promedio en proceso'); }
  if (faltas >= 4) { pts += 3; motivos.push(`${faltas} faltas en 30 días`); } else if (faltas >= 2) { pts += 1; motivos.push(`${faltas} faltas en 30 días`); }
  if (tard >= 5) { pts += 1; motivos.push(`${tard} tardanzas`); }
  if (inc >= 3) { pts += 2; motivos.push(`${inc} incidencias recientes`); } else if (inc >= 1) { pts += 1; motivos.push(`${inc} incidencia(s) reciente(s)`); }
  if (sinEntregar >= 3) { pts += 2; motivos.push(`${sinEntregar} tareas sin entregar`); } else if (sinEntregar >= 1) { pts += 1; motivos.push(`${sinEntregar} tarea(s) sin entregar`); }
  return { nivel: pts >= 5 ? 'alto' : pts >= 2 ? 'medio' : 'bajo', puntos: pts, motivos, promedio: prom, asistencia: pctAsis, faltas, tardanzas: tard, incidencias: inc, sinEntregar };
}
const letraDe = (p, escala) => p == null ? '–' : escala === 'vigesimal' ? (p * 5).toFixed(1) : p >= 3.5 ? 'AD' : p >= 2.5 ? 'A' : p >= 1.75 ? 'B' : 'C';

// ---------- resumen de un alumno (lo que ve su familia) ----------
function fichaAlumno(aid, u) {
  const al = q1('select * from alumnos where id=?', aid), au = q1('select * from aulas where id=?', al.aula_id), col = q1('select * from colegios where id=?', al.colegio_id);
  const cursos = q('select * from cursos where aula_id=? order by id', al.aula_id).map(c => {
    const ev = q('select e.*, n.valor, n.comentario from evaluaciones e left join notas n on n.evaluacion_id=e.id and n.alumno_id=? where e.curso_id=? order by e.fecha', aid, c.id);
    const vals = ev.map(e => aNum(e.valor, au.escala)).filter(v => v != null); const p = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { id: c.id, nombre: c.nombre, color: c.color, promedio: letraDe(p, au.escala), num: p, evaluaciones: ev.map(e => ({ titulo: e.titulo, fecha: e.fecha, bimestre: e.bimestre, valor: e.valor || null, comentario: e.comentario || '' })) };
  });
  const asis = q('select fecha, estado from asistencia where alumno_id=? order by fecha desc limit 120', aid);
  const tareas = q("select t.id, t.titulo, t.descripcion, t.entrega, c.nombre curso, coalesce(e.estado,'pendiente') estado from tareas t left join cursos c on c.id=t.curso_id left join entregas e on e.tarea_id=t.id and e.alumno_id=? where t.aula_id=? order by t.entrega desc limit 60", aid, al.aula_id);
  const inc = q('select fecha, tipo, descripcion from incidencias where alumno_id=? ' + (esStaff(u) ? '' : 'and visible_padre=1 ') + 'order by fecha desc limit 60', aid);
  const com = q('select id, titulo, texto, creado from comunicados where aula_id=? or (aula_id is null and colegio_id=?) order by id desc limit 30', al.aula_id, al.colegio_id);
  return { alumno: { id: al.id, nombres: al.nombres, apellidos: al.apellidos, foto: !!al.foto, nacimiento: al.nacimiento }, aula: { id: au.id, nombre: au.nombre, grado: au.grado, seccion: au.seccion, nivel: au.nivel, escala: au.escala, meet: au.meet, horario: au.horario }, colegio: { nombre: col.nombre, color: col.color, logo: !!col.logo, lema: col.lema, whatsapp: col.whatsapp }, docente: q1('select nombre from usuarios where id=?', au.docente_id)?.nombre, cursos, asistencia: asis, tareas, incidencias: inc, comunicados: com, riesgo: riesgo(aid) };
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const SEG = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'x-frame-options': 'DENY', 'permissions-policy': 'camera=(self), microphone=()' };
function send(res, code, body, req) { let b = Buffer.from(JSON.stringify(body)); const h = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SEG }; if (req && /gzip/.test(req.headers['accept-encoding'] || '') && b.length > 1500) { b = zlib.gzipSync(b); h['content-encoding'] = 'gzip'; } res.writeHead(code, h); res.end(b); }
const json = (req, max = 4e6) => new Promise((ok, no) => { let b = ''; req.on('data', c => { b += c; if (b.length > max) { no(new Error('Archivo muy grande')); req.destroy(); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { ok({}); } }); });
const LIM = new Map(); const limite = (ip, k, max, ms = 60000) => { const key = ip + '|' + k, t = Date.now(), r = LIM.get(key) || { n: 0, t }; if (t - r.t > ms) { r.n = 0; r.t = t; } r.n++; LIM.set(key, r); return r.n > max; };
setInterval(() => { LIM.clear(); run('delete from sesiones where expira<?', Date.now()); }, 10 * 60000).unref();
const ipDe = req => String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const usuarioDe = req => { const t = String(req.headers.authorization || '').replace(/^Bearer /, ''); if (!t) return null; const s = q1('select * from sesiones where token=? and expira>?', t, Date.now()); if (!s) return null; const u = q1('select * from usuarios where id=? and activo=1', s.usuario_id); return u ? { ...u, token: t } : null; };

// imágenes privadas: solo JPG/PNG/WEBP reales y de hasta 1,5 MB (el navegador ya las achica antes de subir)
function guardarImagen(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || '')); if (!m) throw new Error('Imagen no válida');
  const buf = Buffer.from(m[2], 'base64'); if (buf.length > 1.5e6) throw new Error('La imagen es muy pesada');
  const ok = (buf[0] === 0xff && buf[1] === 0xd8) || buf.slice(0, 4).toString('hex') === '89504e47' || buf.slice(8, 12).toString() === 'WEBP'; if (!ok) throw new Error('Imagen no válida');
  const id = crypto.randomBytes(12).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]); fs.writeFileSync(path.join(ARCH, id), buf); return id;
}
const borrarArchivo = id => { if (id && /^[a-f0-9]{24}\.(jpg|png|webp)$/.test(id)) fs.rmSync(path.join(ARCH, id), { force: true }); };

const API = {};
// --- cuentas ---
API['POST /api/registro'] = async ({ b, ip }) => { // docente nuevo: crea su colegio con prueba gratis
  if (!/^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(ip) && limite(ip, 'reg', 15, 3600e3)) throw 'Demasiados registros desde tu conexión. Espera un rato e intenta de nuevo.'; // en tu propia PC no hay límite
  const email = String(b.email || '').toLowerCase().trim(); if (!emailOk(email)) throw 'Escribe un correo válido'; if (String(b.clave || '').length < 8) throw 'La contraseña debe tener al menos 8 caracteres';
  if (q1('select 1 from usuarios where email=?', email)) throw 'Ese correo ya tiene cuenta. Inicia sesión.';
  const nombre = limpio(b.nombre, 80), colegio = limpio(b.colegio, 100) || ('Aula de ' + nombre); if (nombre.length < 3) throw 'Escribe tu nombre';
  const cid = run('insert into colegios(nombre, plan, vence) values(?,?,?)', colegio, 'prueba', new Date(Date.now() + PRUEBA_DIAS * DIA).toISOString()).lastInsertRowid;
  const rol = b.tipo === 'colegio' ? 'director' : 'docente';
  const uid = run('insert into usuarios(email, nombre, hash, rol, colegio_id, telefono) values(?,?,?,?,?,?)', email, nombre, hashPass(b.clave), rol, cid, limpio(b.telefono, 20)).lastInsertRowid;
  audit(uid, 'registro', colegio); return { token: nuevaSesion(uid) };
};
API['POST /api/entrar'] = async ({ b, ip }) => {
  if (!/^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(ip) && limite(ip, 'login', 10, 15 * 60000)) throw 'Demasiados intentos. Espera 15 minutos.';
  const u = q1('select * from usuarios where email=? and activo=1', String(b.email || '').toLowerCase().trim());
  if (!u || !verPass(b.clave, u.hash)) throw 'Correo o contraseña incorrectos'; audit(u.id, 'entrar'); return { token: nuevaSesion(u.id) };
};
API['POST /api/salir'] = async ({ u }) => { if (u) run('delete from sesiones where token=?', u.token); return { ok: 1 }; };
API['POST /api/clave'] = async ({ u, b }) => { if (!verPass(b.actual, u.hash)) throw 'Tu contraseña actual no es correcta'; if (String(b.nueva || '').length < 8) throw 'La nueva contraseña debe tener al menos 8 caracteres'; run('update usuarios set hash=? where id=?', hashPass(b.nueva), u.id); run('delete from sesiones where usuario_id=? and token<>?', u.id, u.token); return { ok: 1 }; };
// invitación: el docente crea un enlace para el padre (o el alumno) y lo manda por WhatsApp
API['GET /api/invitacion'] = async ({ url }) => { const i = q1('select * from invitaciones where token=? and usado=0', url.searchParams.get('t')); if (!i || Date.now() - i.creado > 30 * DIA) throw 'Esta invitación ya no es válida. Pide una nueva a tu docente.'; const al = q1('select * from alumnos where id=?', i.alumno_id), col = q1('select nombre from colegios where id=?', al.colegio_id); return { rol: i.rol, alumno: al.nombres, colegio: col.nombre }; };
API['POST /api/aceptar'] = async ({ b, ip }) => {
  if (limite(ip, 'acep', 10, 3600e3)) throw 429;
  const i = q1('select * from invitaciones where token=? and usado=0', String(b.t || '')); if (!i || Date.now() - i.creado > 30 * DIA) throw 'Esta invitación ya no es válida';
  const al = q1('select * from alumnos where id=?', i.alumno_id), email = String(b.email || '').toLowerCase().trim(); if (!emailOk(email)) throw 'Escribe un correo válido';
  if (!b.acepto) throw 'Debes aceptar la política de privacidad';
  let u = q1('select * from usuarios where email=?', email);
  if (u) { if (!verPass(b.clave, u.hash)) throw 'Ese correo ya tiene cuenta: escribe su contraseña para vincular a tu hijo'; if (!['padre', 'alumno'].includes(u.rol)) throw 'Ese correo es de un docente. Usa otro correo para la cuenta de familia.'; }
  else { if (String(b.clave || '').length < 8) throw 'La contraseña debe tener al menos 8 caracteres'; const id = run('insert into usuarios(email, nombre, hash, rol, colegio_id, telefono) values(?,?,?,?,?,?)', email, limpio(b.nombre, 80) || (i.rol === 'alumno' ? al.nombres : 'Familia de ' + al.nombres), hashPass(b.clave), i.rol, al.colegio_id, limpio(b.telefono, 20)).lastInsertRowid; u = q1('select * from usuarios where id=?', id); }
  run('insert or ignore into familia(padre_id, alumno_id, parentesco) values(?,?,?)', u.id, al.id, limpio(b.parentesco, 30) || (i.rol === 'alumno' ? 'alumno' : 'apoderado'));
  if (i.rol === 'padre') run('update alumnos set consentimiento=1 where id=?', al.id);
  run('update invitaciones set usado=1 where token=?', i.token); audit(u.id, 'vinculo', 'alumno ' + al.id); return { token: nuevaSesion(u.id) };
};

// --- quién soy ---
API['GET /api/yo'] = async ({ u }) => {
  const col = u.colegio_id ? q1('select * from colegios where id=?', u.colegio_id) : null;
  const r = { usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol }, colegio: col && { id: col.id, nombre: col.nombre, color: col.color, lema: col.lema, logo: !!col.logo, whatsapp: col.whatsapp }, membresia: membresia(col), planes: PLANES, soporte: E.AULA_WHATSAPP || getS('soporteWa', '') };
  if (u.rol === 'padre' || u.rol === 'alumno') r.hijos = q('select a.id, a.nombres, a.apellidos, a.foto is not null foto, x.nombre aula, x.grado from familia f join alumnos a on a.id=f.alumno_id join aulas x on x.id=a.aula_id where f.padre_id=?', u.id);
  if (esStaff(u)) r.aulas = q(`select x.*, (select count(*) from alumnos where aula_id=x.id) alumnos, u.nombre docente from aulas x left join usuarios u on u.id=x.docente_id where ${u.rol === 'docente' ? 'x.docente_id=?' : u.rol === 'director' ? 'x.colegio_id=?' : '1=1 or ?'} order by x.id`, u.rol === 'docente' ? u.id : u.colegio_id || 0);
  if (u.rol === 'director') r.docentes = q("select id, nombre, email from usuarios where colegio_id=? and rol='docente'", u.colegio_id);
  return r;
};

// --- colegio (encabezado institucional) ---
API['POST /api/colegio'] = async ({ u, b }) => {
  if (!['docente', 'director'].includes(u.rol)) throw 403; const c = q1('select * from colegios where id=?', u.colegio_id);
  if (u.rol === 'docente' && q1("select 1 from usuarios where colegio_id=? and rol='director'", c.id)) throw 'Los datos del colegio los cambia el director';
  let logo = c.logo; if (b.logo) { const nuevo = guardarImagen(b.logo); borrarArchivo(logo); logo = nuevo; } if (b.quitarLogo) { borrarArchivo(logo); logo = null; }
  run('update colegios set nombre=?, color=?, lema=?, logo=?, whatsapp=? where id=?', limpio(b.nombre, 100) || c.nombre, /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : c.color, limpio(b.lema, 120), logo, limpio(b.whatsapp, 20).replace(/[^\d+]/g, ''), c.id);
  return { ok: 1 };
};
API['POST /api/docente'] = async ({ u, b }) => { // el director agrega docentes a su colegio
  if (u.rol !== 'director') throw 403; const email = String(b.email || '').toLowerCase().trim(); if (!emailOk(email)) throw 'Correo no válido'; if (q1('select 1 from usuarios where email=?', email)) throw 'Ese correo ya tiene cuenta';
  const clave = crypto.randomBytes(5).toString('base64url'); run("insert into usuarios(email, nombre, hash, rol, colegio_id) values(?,?,?,'docente',?)", email, limpio(b.nombre, 80), hashPass(clave), u.colegio_id); return { clave };
};

// --- aulas y cursos ---
API['POST /api/aula'] = async ({ u, b }) => {
  if (!esStaff(u)) throw 403; const col = q1('select * from colegios where id=?', u.colegio_id), m = membresia(col);
  const datos = [limpio(b.nombre, 60), limpio(b.nivel, 20), limpio(b.grado, 20), limpio(b.seccion, 10), b.escala === 'vigesimal' ? 'vigesimal' : 'letras', /^https:\/\/meet\.google\.com\/[a-z0-9-]{6,40}$/i.test(b.meet || '') ? b.meet : null, limpio(b.horario, 200)];
  if (b.id) { const a = aulaDe(u, b.id); if (!a) throw 403; run('update aulas set nombre=?, nivel=?, grado=?, seccion=?, escala=?, meet=?, horario=? where id=?', ...datos, a.id); return { id: a.id }; }
  const n = q1('select count(*) n from aulas where colegio_id=?', u.colegio_id).n, max = m.prueba ? 3 : (PLANES[col.plan]?.aulas || 3); if (n >= max) throw `Tu plan permite ${max} aulas. Mejora tu plan para crear más.`;
  const docente = u.rol === 'director' && b.docente_id && q1("select id from usuarios where id=? and colegio_id=? and rol='docente'", +b.docente_id, u.colegio_id) ? +b.docente_id : u.id;
  const id = run('insert into aulas(colegio_id, docente_id, nombre, nivel, grado, seccion, escala, meet, horario) values(?,?,?,?,?,?,?,?,?)', u.colegio_id, docente, ...datos).lastInsertRowid;
  const base = { inicial: ['Comunicación', 'Matemática', 'Personal Social', 'Ciencia y Tecnología', 'Psicomotriz'], primaria: ['Comunicación', 'Matemática', 'Personal Social', 'Ciencia y Tecnología', 'Arte y Cultura', 'Educación Física', 'Educación Religiosa', 'Inglés'], secundaria: ['Comunicación', 'Matemática', 'Ciencias Sociales', 'Ciencia y Tecnología', 'DPCC', 'Inglés', 'Arte y Cultura', 'Educación Física', 'EPT'] }[datos[1]] || ['Comunicación', 'Matemática'];
  const colores = ['#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'];
  base.forEach((c, i) => run('insert into cursos(aula_id, nombre, color) values(?,?,?)', id, c, colores[i % colores.length])); return { id };
};
API['POST /api/curso'] = async ({ u, b }) => { const a = aulaDe(u, b.aula_id); if (!a) throw 403; if (b.borrar) { run('delete from cursos where id=? and aula_id=?', +b.id, a.id); return { ok: 1 }; } if (b.id) run('update cursos set nombre=? where id=? and aula_id=?', limpio(b.nombre, 50), +b.id, a.id); else run('insert into cursos(aula_id, nombre, color) values(?,?,?)', a.id, limpio(b.nombre, 50), '#64748b'); return { ok: 1 }; };
API['GET /api/aula'] = async ({ u, url }) => {
  const a = aulaDe(u, url.searchParams.get('id')); if (!a) throw 403;
  const alumnos = q('select id, nombres, apellidos, foto is not null foto, nacimiento, dni, consentimiento, (select count(*) from familia f join usuarios x on x.id=f.padre_id where f.alumno_id=alumnos.id and x.rol=\'padre\') padres from alumnos where aula_id=? order by apellidos, nombres', a.id).map(x => ({ ...x, riesgo: riesgo(x.id) }));
  return { aula: a, cursos: q('select * from cursos where aula_id=? order by id', a.id), alumnos, colegio: q1('select nombre, color, lema, logo is not null logo from colegios where id=?', a.colegio_id) };
};

// --- alumnos ---
API['POST /api/alumno'] = async ({ u, b }) => {
  if (!esStaff(u)) throw 403; const a = aulaDe(u, b.aula_id); if (!a) throw 403;
  const nombres = limpio(b.nombres, 60), apellidos = limpio(b.apellidos, 60); if (!nombres) throw 'Escribe los nombres del alumno';
  if (b.id) { if (!veAlumno(u, b.id)) throw 403; const al = q1('select * from alumnos where id=?', +b.id); let foto = al.foto; if (b.foto) { const nf = guardarImagen(b.foto); borrarArchivo(foto); foto = nf; } if (b.quitarFoto) { borrarArchivo(foto); foto = null; }
    run('update alumnos set nombres=?, apellidos=?, nacimiento=?, dni=?, notas_salud=?, foto=?, aula_id=? where id=?', nombres, apellidos, limpio(b.nacimiento, 10), limpio(b.dni, 12), limpio(b.notas_salud, 300), foto, a.id, al.id); return { id: al.id }; }
  const foto = b.foto ? guardarImagen(b.foto) : null;
  return { id: run('insert into alumnos(aula_id, colegio_id, nombres, apellidos, nacimiento, dni, notas_salud, foto) values(?,?,?,?,?,?,?,?)', a.id, a.colegio_id, nombres, apellidos, limpio(b.nacimiento, 10), limpio(b.dni, 12), limpio(b.notas_salud, 300), foto).lastInsertRowid };
};
API['POST /api/alumnos-lote'] = async ({ u, b }) => { // pegar una lista (uno por línea: Apellidos, Nombres)
  const a = aulaDe(u, b.aula_id); if (!a) throw 403; let n = 0;
  for (const l of String(b.lista || '').split(/\r?\n/).slice(0, 60)) { const t = limpio(l, 120); if (!t) continue; const [ap, no] = t.includes(',') ? t.split(',').map(x => x.trim()) : [t.split(' ').slice(0, 2).join(' '), t.split(' ').slice(2).join(' ') || t]; run('insert into alumnos(aula_id, colegio_id, nombres, apellidos) values(?,?,?,?)', a.id, a.colegio_id, no || ap, no ? ap : ''); n++; }
  return { n };
};
API['POST /api/alumno-borrar'] = async ({ u, b }) => { // borra al alumno y todos sus datos (derecho de cancelación)
  if (!esStaff(u) || !veAlumno(u, b.id)) throw 403; const al = q1('select * from alumnos where id=?', +b.id); borrarArchivo(al.foto);
  for (const t of ['notas', 'asistencia', 'entregas', 'incidencias', 'familia']) run(`delete from ${t} where alumno_id=?`, al.id); run('delete from invitaciones where alumno_id=?', al.id); run('delete from alumnos where id=?', al.id); audit(u.id, 'borrar alumno', al.nombres); return { ok: 1 };
};
API['POST /api/invitar'] = async ({ u, b }) => { if (!esStaff(u) || !veAlumno(u, b.alumno_id)) throw 403; const t = crypto.randomBytes(18).toString('base64url'); run('insert into invitaciones(token, alumno_id, rol, creado) values(?,?,?,?)', t, +b.alumno_id, b.rol === 'alumno' ? 'alumno' : 'padre', Date.now()); return { token: t }; };
API['GET /api/alumno'] = async ({ u, url }) => { const id = +url.searchParams.get('id'); if (!veAlumno(u, id)) throw 403; const f = fichaAlumno(id, u); if (esStaff(u)) { const al = q1('select dni, notas_salud, consentimiento from alumnos where id=?', id); Object.assign(f.alumno, al); f.familia = q('select x.nombre, x.email, x.telefono, x.rol, f.parentesco from familia f join usuarios x on x.id=f.padre_id where f.alumno_id=?', id); } return f; };

// --- asistencia ---
API['GET /api/asistencia'] = async ({ u, url }) => { const a = aulaDe(u, url.searchParams.get('aula')); if (!a) throw 403; const f = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('fecha') || '') ? url.searchParams.get('fecha') : hoy(); return { fecha: f, marcas: Object.fromEntries(q('select alumno_id, estado from asistencia where aula_id=? and fecha=?', a.id, f).map(r => [r.alumno_id, r.estado])) }; };
API['POST /api/asistencia'] = async ({ u, b }) => {
  const a = aulaDe(u, b.aula_id); if (!a) throw 403; const f = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : hoy();
  for (const [aid, est] of Object.entries(b.marcas || {})) { if (!['P', 'T', 'F', 'J'].includes(est) || !q1('select 1 from alumnos where id=? and aula_id=?', +aid, a.id)) continue; run('insert into asistencia(aula_id, alumno_id, fecha, estado) values(?,?,?,?) on conflict(alumno_id, fecha) do update set estado=excluded.estado', a.id, +aid, f, est); }
  return { ok: 1 };
};

// --- evaluaciones y notas ---
API['GET /api/registro-notas'] = async ({ u, url }) => { const a = aulaDe(u, url.searchParams.get('aula')); if (!a) throw 403; const cid = +url.searchParams.get('curso'); const ev = q('select * from evaluaciones where aula_id=? and curso_id=? order by fecha, id', a.id, cid); const notas = q('select n.* from notas n join evaluaciones e on e.id=n.evaluacion_id where e.aula_id=? and e.curso_id=?', a.id, cid); return { evaluaciones: ev, notas }; };
API['POST /api/evaluacion'] = async ({ u, b }) => { const a = aulaDe(u, b.aula_id); if (!a) throw 403; if (!q1('select 1 from cursos where id=? and aula_id=?', +b.curso_id, a.id)) throw 'Curso no válido'; if (b.borrar) { run('delete from notas where evaluacion_id=?', +b.id); run('delete from evaluaciones where id=? and aula_id=?', +b.id, a.id); return { ok: 1 }; } return { id: run('insert into evaluaciones(curso_id, aula_id, titulo, fecha, tipo, bimestre) values(?,?,?,?,?,?)', +b.curso_id, a.id, limpio(b.titulo, 80) || 'Evaluación', /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : hoy(), limpio(b.tipo, 30), Math.min(4, Math.max(1, +b.bimestre || 1))).lastInsertRowid }; };
API['POST /api/notas'] = async ({ u, b }) => {
  const a = aulaDe(u, b.aula_id); if (!a) throw 403;
  for (const n of (b.notas || []).slice(0, 3000)) { const ev = q1('select * from evaluaciones where id=? and aula_id=?', +n.evaluacion_id, a.id); if (!ev || !q1('select 1 from alumnos where id=? and aula_id=?', +n.alumno_id, a.id)) continue;
    let v = String(n.valor ?? '').trim().toUpperCase(); if (v === '') { run('delete from notas where evaluacion_id=? and alumno_id=?', ev.id, +n.alumno_id); continue; }
    if (a.escala === 'vigesimal') { const x = parseFloat(v); if (isNaN(x) || x < 0 || x > 20) continue; v = String(Math.round(x * 10) / 10); } else if (!VAL_LETRA[v]) continue;
    run('insert into notas(evaluacion_id, alumno_id, valor, comentario) values(?,?,?,?) on conflict(evaluacion_id, alumno_id) do update set valor=excluded.valor, comentario=coalesce(excluded.comentario, notas.comentario)', ev.id, +n.alumno_id, v, n.comentario != null ? limpio(n.comentario, 200) : null); }
  return { ok: 1 };
};

// --- tareas ---
API['POST /api/tarea'] = async ({ u, b }) => { const a = aulaDe(u, b.aula_id); if (!a) throw 403; if (b.borrar) { run('delete from entregas where tarea_id=?', +b.id); run('delete from tareas where id=? and aula_id=?', +b.id, a.id); return { ok: 1 }; } const tid = run('insert into tareas(aula_id, curso_id, titulo, descripcion, entrega) values(?,?,?,?,?)', a.id, +b.curso_id || null, limpio(b.titulo, 100), limpio(b.descripcion, 1500), /^\d{4}-\d{2}-\d{2}$/.test(b.entrega || '') ? b.entrega : hoy()).lastInsertRowid;
  let correos = 0; if (b.correo) { const cu = q1('select nombre from cursos where id=?', +b.curso_id)?.nombre, ent = /^\d{4}-\d{2}-\d{2}$/.test(b.entrega || '') ? new Date(b.entrega + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }) : ''; correos = conCorreo(u, a, 'tarea', 'Nueva tarea: ' + limpio(b.titulo, 100), (limpio(b.descripcion, 1500) || 'Hay una nueva tarea para {alumno}.') , { detalle: `${cu ? '📚 Curso: ' + cu + '\n' : ''}📅 Entrega: ${ent}`, url: getS('urlPublica', '') ? getS('urlPublica', '') + '/' : '', boton: 'Ver en ProfeTok' }); }
  return { id: tid, correos }; };
API['GET /api/tareas'] = async ({ u, url }) => { const a = aulaDe(u, url.searchParams.get('aula')); if (!a) throw 403; return { tareas: q('select t.*, c.nombre curso, (select count(*) from entregas e where e.tarea_id=t.id and e.estado=\'entregada\') entregadas from tareas t left join cursos c on c.id=t.curso_id where t.aula_id=? order by t.entrega desc', a.id), entregas: q('select e.* from entregas e join tareas t on t.id=e.tarea_id where t.aula_id=?', a.id) }; };
API['POST /api/entrega'] = async ({ u, b }) => { const t = q1('select * from tareas where id=?', +b.tarea_id); if (!t || !aulaDe(u, t.aula_id) || !q1('select 1 from alumnos where id=? and aula_id=?', +b.alumno_id, t.aula_id)) throw 403; run('insert into entregas values(?,?,?) on conflict(tarea_id, alumno_id) do update set estado=excluded.estado', t.id, +b.alumno_id, ['entregada', 'pendiente', 'tarde'].includes(b.estado) ? b.estado : 'entregada'); return { ok: 1 }; };

// --- bitácora de incidencias ---
API['POST /api/incidencia'] = async ({ u, b }) => {
  if (!esStaff(u) || !veAlumno(u, b.alumno_id)) throw 403; if (b.borrar) { run('delete from incidencias where id=? and alumno_id=?', +b.id, +b.alumno_id); return { ok: 1 }; }
  const al = q1('select * from alumnos where id=?', +b.alumno_id), tipo = ['conducta', 'académica', 'salud', 'logro', 'otro'].includes(b.tipo) ? b.tipo : 'otro';
  return { id: run('insert into incidencias(alumno_id, aula_id, docente_id, fecha, tipo, descripcion, visible_padre) values(?,?,?,?,?,?,?)', al.id, al.aula_id, u.id, /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : hoy(), tipo, limpio(b.descripcion, 1000), b.visible_padre === false ? 0 : 1).lastInsertRowid };
};
API['GET /api/incidencias'] = async ({ u, url }) => { const a = aulaDe(u, url.searchParams.get('aula')); if (!a) throw 403; return { incidencias: q('select i.*, a.nombres, a.apellidos from incidencias i join alumnos a on a.id=i.alumno_id where i.aula_id=? order by i.fecha desc, i.id desc limit 300', a.id) }; };

// --- comunicados ---
API['POST /api/comunicado'] = async ({ u, b }) => { if (!esStaff(u)) throw 403; const a = b.aula_id ? aulaDe(u, b.aula_id) : null; if (b.aula_id && !a) throw 403; if (!a && u.rol !== 'director') throw 'Elige un aula'; const id = run('insert into comunicados(aula_id, colegio_id, autor_id, titulo, texto) values(?,?,?,?,?)', a?.id || null, u.colegio_id, u.id, limpio(b.titulo, 100), String(b.texto || '').replace(/[<>]/g, '').slice(0, 3000)).lastInsertRowid; const correos = b.correo && a ? conCorreo(u, a, 'comunicado', limpio(b.titulo, 100), String(b.texto || '').replace(/[<>]/g, '').slice(0, 3000)) : 0; return { id, correos }; };

// --- resumen del docente (alertas) ---
API['GET /api/alertas'] = async ({ u }) => { if (!esStaff(u)) throw 403; const ids = alumnosVisibles(u); const lista = ids === null ? q('select id from alumnos limit 500').map(r => r.id) : [...ids]; return { alertas: lista.map(id => { const r = riesgo(id), al = q1('select a.id, a.nombres, a.apellidos, a.foto is not null foto, x.nombre aula from alumnos a join aulas x on x.id=a.aula_id where a.id=?', id); return { ...al, ...r }; }).filter(x => x.nivel !== 'bajo').sort((a, b) => b.puntos - a.puntos) }; };

// --- membresía y pagos (Yape / Plin con número de operación; el dueño lo aprueba) ---
API['POST /api/pago'] = async ({ u, b }) => { if (!['docente', 'director'].includes(u.rol)) throw 403; if (!PLANES[b.plan]) throw 'Plan no válido'; const meses = [1, 3, 6, 12].includes(+b.meses) ? +b.meses : 1; const op = limpio(b.operacion, 30); if (op.length < 4) throw 'Escribe el número de operación de tu Yape o Plin'; run('insert into pagos(colegio_id, plan, monto, metodo, operacion) values(?,?,?,?,?)', u.colegio_id, b.plan, PLANES[b.plan].precio * meses, limpio(b.metodo, 10) || 'yape', op + ' · ' + meses + ' mes(es)'); return { ok: 1 }; };
API['GET /api/dueno'] = async ({ u }) => { if (u.rol !== 'dueno') throw 403; return { colegios: q("select c.*, (select count(*) from usuarios where colegio_id=c.id and rol in ('docente','director')) docentes, (select count(*) from alumnos where colegio_id=c.id) alumnos, (select email from usuarios where colegio_id=c.id and rol in ('director','docente') order by id limit 1) email from colegios c order by c.id desc"), pagos: q("select p.*, c.nombre colegio from pagos p join colegios c on c.id=p.colegio_id order by p.id desc limit 200"), planes: PLANES, soporte: getS('soporteWa', '') }; };
API['POST /api/dueno'] = async ({ u, b }) => {
  if (u.rol !== 'dueno') throw 403;
  if (b.accion === 'aprobar') { const p = q1('select * from pagos where id=?', +b.id); if (!p) throw 404; const c = q1('select * from colegios where id=?', p.colegio_id), meses = +(/(\d+) mes/.exec(p.operacion)?.[1] || 1), base = Math.max(Date.now(), c.vence ? new Date(c.vence).getTime() : 0); run('update colegios set plan=?, vence=? where id=?', p.plan, new Date(base + meses * 30 * DIA).toISOString(), c.id); run("update pagos set estado='aprobado', revisado=? where id=?", ahora(), p.id); return { ok: 1 }; }
  if (b.accion === 'rechazar') { run("update pagos set estado='rechazado', revisado=? where id=?", ahora(), +b.id); return { ok: 1 }; }
  if (b.accion === 'extender') { const c = q1('select * from colegios where id=?', +b.id); const base = Math.max(Date.now(), c.vence ? new Date(c.vence).getTime() : 0); run('update colegios set vence=?, plan=? where id=?', new Date(base + (+b.dias || 30) * DIA).toISOString(), PLANES[b.plan] ? b.plan : c.plan, c.id); return { ok: 1 }; }
  if (b.accion === 'soporte') { setS('soporteWa', limpio(b.whatsapp, 20).replace(/[^\d+]/g, '')); return { ok: 1 }; }
  if (b.accion === 'planes') { const P = {}; for (const k of ['docente', 'colegio']) P[k] = { ...PLANES[k], precio: Math.max(0, +b[k] || PLANES[k].precio) }; Object.assign(PLANES, P); setS('planes', PLANES); return { ok: 1 }; }
  throw 404;
};

// 📧 correos a las familias y campañas (ver correo.js)
const correo = require('./correo').crear({ db, q, q1, run, getS, setS, limpio });
for (const [k, f] of Object.entries(correo.API)) API[k] = ctx => f({ ...ctx, aulaDe, membresia });
const conCorreo = (u, a, tipo, asunto, cuerpo, extra = {}) => { if (!correo.listo()) return 0; const dest = correo.familiasDe(a.id); if (!dest.length) return 0; correo.encolar({ colegioId: a.colegio_id, aulaId: a.id, autorId: u.id, tipo, asunto, cuerpo, destinatarios: dest, ...extra }); return dest.length; };

// 🤖 «Mi asistente» con IA para cada docente (ver asistente.js)
const asistente = require('./asistente').crear({ db, q, q1, run, getS, riesgo, aulaDe, membresia, E });
for (const [k, f] of Object.entries(asistente.API)) API[k] = f;

// solo lectura cuando la membresía venció (los datos nunca se borran)
const ESCRIBE_SIN_PLAN = new Set(['POST /api/salir', 'POST /api/clave', 'POST /api/pago', 'POST /api/colegio']);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), ip = ipDe(req), clave = req.method + ' ' + url.pathname;
  if (req.headers['cf-connecting-ip'] && !getS('urlPublica', '') && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(req.headers.host || '') && !/trycloudflare\.com$/i.test(req.headers.host || '')) setS('urlPublica', 'https://' + req.headers.host); // la dirección pública se aprende sola (para los enlaces de los correos)
  try {
    // archivos privados (fotos y logos): solo con permiso
    let m = /^\/api\/foto\/(alumno|logo)\/(\d+)$/.exec(url.pathname);
    if (m) { const u = usuarioDe(req) || (() => { const t = url.searchParams.get('t'); const s = t && q1('select * from sesiones where token=? and expira>?', t, Date.now()); return s ? q1('select * from usuarios where id=?', s.usuario_id) : null; })(); if (!u) return send(res, 401, { error: 'Inicia sesión' });
      let f = null; if (m[1] === 'alumno') { if (!veAlumno(u, m[2])) return send(res, 403, { error: 'Sin permiso' }); f = q1('select foto from alumnos where id=?', +m[2])?.foto; } else { const c = q1('select logo from colegios where id=?', +m[2]); if (u.rol !== 'dueno' && u.colegio_id !== +m[2]) return send(res, 403, { error: 'Sin permiso' }); f = c?.logo; }
      if (!f || !fs.existsSync(path.join(ARCH, f))) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'image/jpeg', 'cache-control': 'private, max-age=3600', ...SEG }); return fs.createReadStream(path.join(ARCH, f)).pipe(res); }
    if (API[clave]) {
      const libre = ['POST /api/registro', 'POST /api/entrar', 'GET /api/invitacion', 'POST /api/aceptar'].includes(clave);
      const u = usuarioDe(req); if (!libre && !u) return send(res, 401, { error: 'Tu sesión terminó. Vuelve a entrar.' });
      if (limite(ip, 'api', 400)) return send(res, 429, { error: 'Más despacio, por favor' });
      if (u && req.method === 'POST' && esStaff(u) && u.rol !== 'dueno' && !ESCRIBE_SIN_PLAN.has(clave) && !membresia(q1('select * from colegios where id=?', u.colegio_id)).activa) return send(res, 402, { error: 'Tu membresía venció. Tus datos están a salvo: renueva para seguir editando.' });
      const b = req.method === 'POST' ? await json(req) : {};
      return send(res, 200, await API[clave]({ u, b, url, ip, req }), req);
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'No existe' });
    if (url.pathname === '/baja') { const ok = correo.baja(url); res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', ...SEG }); return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ProfeTok</title><body style="font-family:Arial;background:#f0f9ff;display:grid;place-items:center;min-height:90vh"><div style="background:#fff;padding:28px;border-radius:16px;max-width:420px;text-align:center"><img src="/libretin.svg" width="110" alt=""><h2>${ok ? '✅ Listo, ya no recibirás correos' : 'Enlace no válido'}</h2><p>${ok ? 'Puedes seguir viendo todo en tu panel de ProfeTok. Si cambias de opinión, avísale al colegio.' : ''}</p><a href="/">Ir a ProfeTok</a></div></body>`); }
    // archivos públicos de la aplicación
    let f = decodeURIComponent(url.pathname); if (f === "/" || /^\/(invitacion|app)(\/|$)/.test(f)) f = "/index.html";
    const fp = path.join(PUB, path.normalize(f).replace(/^(\.\.[/\\])+/, ''));
    if (!fp.startsWith(PUB) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
    let body = fs.readFileSync(fp);
    if (fp.endsWith('index.html')) { // vista previa al compartir (WhatsApp, Facebook, Telegram): imagen, título y descripción
      const host = /^[a-z0-9.:-]{3,100}$/i.test(req.headers.host || '') ? req.headers.host : 'localhost', base = (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-proto'] === 'https' ? 'https://' : 'http://') + host;
      const t = 'ProfeTok · Tu aula ordenada, tus familias informadas', d = 'Asistencia, notas, tareas, alertas tempranas y Libretín, un asistente con IA que arma sesiones y exámenes en segundos. Prueba gratis 15 días.';
      body = Buffer.from(body.toString().replace('<!--OG-->', `<meta property="og:type" content="website"><meta property="og:site_name" content="ProfeTok"><meta property="og:title" content="${t}"><meta property="og:description" content="${d}"><meta property="og:url" content="${base}/"><meta property="og:image" content="${base}/og.jpg?v=1"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="ProfeTok con Libretín, el asistente para docentes"><meta property="og:locale" content="es_PE"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${base}/og.jpg?v=1">`)); }
    const h = { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream', 'cache-control': fp.endsWith('.html') ? 'no-cache' : 'public, max-age=3600', ...SEG };
    if (/gzip/.test(req.headers['accept-encoding'] || '') && /\.(html|js|css|svg|json)$/.test(fp)) { body = zlib.gzipSync(body); h['content-encoding'] = 'gzip'; }
    res.writeHead(200, h); res.end(body);
  } catch (e) {
    if (e === 403) return send(res, 403, { error: 'No tienes permiso para ver esto' }); if (e === 404) return send(res, 404, { error: 'No encontrado' }); if (e === 429) return send(res, 429, { error: 'Demasiados intentos. Intenta más tarde.' });
    if (typeof e === 'string') return send(res, 400, { error: e }); if (e?.message && /Imagen|pesad|grande/.test(e.message)) return send(res, 400, { error: e.message });
    console.error('[ProfeTok] Error en ' + clave + ': ' + (e?.stack || e)); return send(res, 500, { error: 'Algo salió mal (' + String(e?.message || e).slice(0, 120) + '). Avísale al administrador.' });
  }
});
// 💾 copia de seguridad diaria de la base de datos (se guardan las últimas 14)
function respaldo() { try { const dir = path.join(DATA, 'respaldos'), f = path.join(dir, 'aula-' + hoy() + '.db'); fs.mkdirSync(dir, { recursive: true }); if (fs.existsSync(f)) return; db.exec(`VACUUM INTO '${f.replace(/'/g, "''")}'`); const L = fs.readdirSync(dir).filter(x => /^aula-\d{4}-\d{2}-\d{2}\.db$/.test(x)).sort(); for (const x of L.slice(0, Math.max(0, L.length - 14))) fs.rmSync(path.join(dir, x), { force: true }); console.log('[ProfeTok] Respaldo listo: ' + f); } catch (e) { console.log('[ProfeTok] Respaldo: ' + e.message); } }
setTimeout(respaldo, 60000).unref(); setInterval(respaldo, 3 * 3600e3).unref();
if (require.main === module) server.listen(PORT, () => console.log(`🎓 ProfeTok en http://localhost:${PORT}`));
module.exports = { server, db, riesgo, alumnosVisibles };
