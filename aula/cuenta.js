// 🔑 «Olvidé mi contraseña»: enlace de un solo uso (vale 1 hora) al correo.
// Si el correo aún no está configurado, el dueño (o el docente, para las familias de su aula) puede generar el enlace y mandarlo por WhatsApp.
// La respuesta es siempre la misma exista o no el correo (así nadie puede averiguar quién tiene cuenta).
const crypto = require('crypto');
function crear({ db, q, q1, run, hashPass, nuevaSesion, correo, getS, limpio, veAlumno, emailOk, audit }) {
  db.exec(`create table if not exists claves_reset (token text primary key, usuario_id integer, expira integer, usado integer default 0, creado text default (datetime('now')));`);
  const LIM = new Map(), limite = (k, max, ms) => { const t = Date.now(), r = LIM.get(k) || { n: 0, t }; if (t - r.t > ms) { r.n = 0; r.t = t; } r.n++; LIM.set(k, r); if (LIM.size > 2e4) LIM.clear(); return r.n > max; };
  const base = () => getS('urlPublica', '') || '';
  function enlace(uid, horas = 1) { const t = crypto.randomBytes(24).toString('base64url'); run('insert into claves_reset(token, usuario_id, expira) values(?,?,?)', t, uid, Date.now() + horas * 3600e3); return `${base()}/#/clave?t=${t}`; }
  const API = {}, LIBRES = ['POST /api/olvide', 'GET /api/clave-reset', 'POST /api/clave-nueva'];
  API['POST /api/olvide'] = async ({ b, ip }) => {
    if (limite(ip, 6, 3600e3)) throw 'Demasiados intentos. Espera una hora o escribe a soporte.';
    const email = String(b.email || '').toLowerCase().trim(); if (!emailOk(email)) throw 'Escribe tu correo';
    const u = q1('select * from usuarios where email=? and activo=1', email), listo = correo.listo() && !!base();
    if (u && listo && !limite('u' + u.id, 3, 3600e3)) {
      const url = enlace(u.id), { html, texto } = correo.plantilla({ colegio: 'ProfeTok', titulo: '🔑 Crea tu nueva contraseña', saludo: `Hola ${String(u.nombre || '').split(' ')[0]} 👋`, cuerpo: 'Recibimos un pedido para cambiar la contraseña de tu cuenta de ProfeTok. Toca el botón para crear una nueva (el enlace vale 1 hora y se usa una sola vez).\n\nSi no fuiste tú, ignora este correo: tu contraseña sigue igual.', boton: 'Crear nueva contraseña', enlace: url, tipo: 'otro' });
      correo.enviar({ para: u.email, asunto: '🔑 Tu enlace para cambiar la contraseña de ProfeTok', html, texto, deNombre: 'ProfeTok' }).catch(e => console.log('[ProfeTok] Olvidé: ' + e.message));
    }
    return { ok: 1, correo: listo, soporte: (getS('soporteWa', '') || '').replace(/\D/g, '') };
  };
  API['GET /api/clave-reset'] = async ({ url }) => { const r = q1('select r.*, u.nombre, u.email from claves_reset r join usuarios u on u.id=r.usuario_id where r.token=?', url.searchParams.get('t') || ''); if (!r || r.usado || r.expira < Date.now()) throw 'Este enlace ya no es válido. Pide uno nuevo con «¿Olvidaste tu contraseña?».'; return { nombre: String(r.nombre || '').split(' ')[0], email: r.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2') }; };
  API['POST /api/clave-nueva'] = async ({ b }) => {
    const r = q1('select * from claves_reset where token=?', String(b.t || '')); if (!r || r.usado || r.expira < Date.now()) throw 'Este enlace ya no es válido. Pide uno nuevo.';
    if (String(b.clave || '').length < 8) throw 'La contraseña debe tener al menos 8 caracteres';
    run('update usuarios set hash=? where id=?', hashPass(b.clave), r.usuario_id); run('update claves_reset set usado=1 where usuario_id=?', r.usuario_id); run('delete from sesiones where usuario_id=?', r.usuario_id);
    audit(r.usuario_id, 'nueva contraseña'); return { token: nuevaSesion(r.usuario_id) };
  };
  // enlace manual para mandar por WhatsApp: el dueño (a cualquiera) o el docente (a las familias de su aula)
  API['POST /api/clave-enlace'] = async ({ u, b }) => {
    const v = b.email && u.rol === 'dueno' ? q1('select * from usuarios where email=?', String(b.email).toLowerCase().trim()) : q1('select * from usuarios where id=?', +b.usuario_id); if (!v) throw 404;
    const ok = u.rol === 'dueno' || (['docente', 'director'].includes(u.rol) && v.rol === 'padre' && q('select alumno_id from familia where padre_id=?', v.id).some(f => veAlumno(u, f.alumno_id))) || (u.rol === 'director' && v.colegio_id === u.colegio_id && v.rol === 'docente');
    if (!ok) throw 403; audit(u.id, 'enlace de contraseña', 'para ' + v.id); return { url: enlace(v.id, 24), nombre: v.nombre, telefono: v.telefono || '' };
  };
  return { API, LIBRES };
}
module.exports = { crear };
