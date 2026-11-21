// 👨‍👩‍👧 Familia ↔ docente: «Enterado» en los comunicados, justificar faltas desde el celular, mensajes y pedidos de reunión,
// y la lista de familias conectadas (con sus correos) para el docente.
// Cada familia solo ve y escribe sobre su propio hijo; cada docente solo ve a las familias de sus aulas.
function crear({ db, q, q1, run, aulaDe, veAlumno, esStaff, limpio, hoy, avisar, pushUsuario }) {
  db.exec(`create table if not exists justificaciones (id integer primary key, alumno_id integer, padre_id integer, fecha text, motivo text, estado text default 'pendiente', creado text default (datetime('now')), revisado text);
  create table if not exists mensajes (id integer primary key, alumno_id integer, padre_id integer, docente_id integer, tipo text, texto text, respuesta text, creado text default (datetime('now')), respondido text, leido_docente text);
  create index if not exists ju_al on justificaciones(alumno_id, estado); create index if not exists me_doc on mensajes(docente_id, id); create index if not exists me_pa on mensajes(padre_id, id);`);
  const aulaDeAlumno = id => q1('select x.* from alumnos a join aulas x on x.id=a.aula_id where a.id=?', +id);
  const pila = n => String(n || '').trim().split(/\s+/)[0] || '';
  const esPadre = u => ['padre', 'alumno'].includes(u.rol);
  const avisarDocente = (did, titulo, cuerpo) => pushUsuario(did, { title: titulo, body: cuerpo, url: '/#/inicio', icon: '/icono-192.png', tag: 'profetok-docente', vibrate: [120, 80, 120, 80, 320] }).catch(() => {});
  const API = {};

  // --- comunicados: «Enterado» ---
  API['POST /api/comunicado-leido'] = async ({ u, b }) => {
    const c = q1('select * from comunicados where id=?', +b.id); if (!c) throw 404;
    const mio = q1('select 1 from familia f join alumnos a on a.id=f.alumno_id where f.padre_id=? and (a.aula_id=? or (? is null and a.colegio_id=?))', u.id, c.aula_id, c.aula_id, c.colegio_id); if (!mio) throw 403;
    run('insert or ignore into leidos(comunicado_id, usuario_id) values(?,?)', c.id, u.id); return { ok: 1 };
  };
  API['GET /api/comunicados'] = async ({ u, url }) => {
    const a = aulaDe(u, url.searchParams.get('aula')); if (!a) throw 403;
    const fam = q("select distinct u.id, u.nombre from familia f join usuarios u on u.id=f.padre_id join alumnos al on al.id=f.alumno_id where al.aula_id=? and u.rol='padre'", a.id);
    return { familias: fam.length, comunicados: q('select * from comunicados where aula_id=? order by id desc limit 30', a.id).map(c => { const l = new Set(q('select usuario_id from leidos where comunicado_id=?', c.id).map(x => x.usuario_id)); return { ...c, leidos: fam.filter(f => l.has(f.id)).length, faltan: fam.filter(f => !l.has(f.id)).map(f => f.nombre) }; }) };
  };
  // --- familias conectadas del aula (para escribirles) ---
  API['GET /api/familias'] = async ({ u, url }) => {
    const a = aulaDe(u, url.searchParams.get('aula')); if (!a) throw 403;
    return { familias: q("select u.id, u.nombre, u.email, u.telefono, f.parentesco, al.nombres || ' ' || coalesce(al.apellidos,'') alumno, coalesce(u.no_correo,0) no_correo from familia f join usuarios u on u.id=f.padre_id join alumnos al on al.id=f.alumno_id where al.aula_id=? and u.rol='padre' and u.activo=1 order by al.apellidos, al.nombres", a.id),
      sinFamilia: q('select al.id, al.nombres, al.apellidos from alumnos al where al.aula_id=? and not exists (select 1 from familia f join usuarios u on u.id=f.padre_id where f.alumno_id=al.id and u.rol=\'padre\') order by al.apellidos', a.id) };
  };
  // --- justificar faltas ---
  API['POST /api/justificar'] = async ({ u, b }) => {
    if (!esPadre(u) || !veAlumno(u, b.alumno_id)) throw 403; const fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : null; if (!fecha) throw 'Elige la fecha';
    const dif = (new Date(fecha + 'T12:00:00') - new Date(hoy() + 'T12:00:00')) / 864e5; if (dif > 30 || dif < -60) throw 'Elige una fecha cercana (hasta 30 días antes o 2 meses atrás)';
    const motivo = limpio(b.motivo, 500); if (motivo.length < 4) throw 'Cuéntale a la docente el motivo';
    if (q1("select 1 from justificaciones where alumno_id=? and fecha=? and estado='pendiente'", +b.alumno_id, fecha)) throw 'Ya enviaste una justificación para ese día';
    const id = run('insert into justificaciones(alumno_id, padre_id, fecha, motivo) values(?,?,?,?)', +b.alumno_id, u.id, fecha, motivo).lastInsertRowid;
    const au = aulaDeAlumno(b.alumno_id), al = q1('select nombres from alumnos where id=?', +b.alumno_id); if (au?.docente_id) avisarDocente(au.docente_id, `📝 Justificación de ${pila(al.nombres)}`, fecha > hoy() ? `La familia avisa que faltará el ${fecha}: ${motivo.slice(0, 80)}` : `La familia justificó la falta del ${fecha}: ${motivo.slice(0, 80)}`);
    return { id };
  };
  API['POST /api/justificacion'] = async ({ u, b }) => {
    const j = q1('select * from justificaciones where id=?', +b.id); if (!j || !esStaff(u) || !veAlumno(u, j.alumno_id)) throw 403;
    const ok = !!b.aprobar; run("update justificaciones set estado=?, revisado=datetime('now') where id=?", ok ? 'aprobada' : 'rechazada', j.id);
    if (ok) { const au = aulaDeAlumno(j.alumno_id); run("insert into asistencia(aula_id, alumno_id, fecha, estado) values(?,?,?,'J') on conflict(alumno_id, fecha) do update set estado='J'", au.id, j.alumno_id, j.fecha); }
    avisar('justificacion', j.alumno_id, { aprobada: ok, fecha: j.fecha }, 'just|' + j.id); return { ok: 1 };
  };
  // --- mensajes y pedidos de reunión ---
  API['POST /api/mensaje'] = async ({ u, b }) => {
    if (!esPadre(u) || !veAlumno(u, b.alumno_id)) throw 403; const texto = limpio(b.texto, 1500); if (texto.length < 3) throw 'Escribe tu mensaje';
    const au = aulaDeAlumno(b.alumno_id); if (!au?.docente_id) throw 'El aula aún no tiene docente asignado';
    if (q1("select count(*) n from mensajes where padre_id=? and creado>datetime('now','-1 day')", u.id).n >= 10) throw 'Enviaste muchos mensajes hoy. Espera la respuesta de la docente 🙂';
    const tipo = b.tipo === 'reunion' ? 'reunion' : 'mensaje', id = run('insert into mensajes(alumno_id, padre_id, docente_id, tipo, texto) values(?,?,?,?,?)', +b.alumno_id, u.id, au.docente_id, tipo, texto).lastInsertRowid;
    const al = q1('select nombres from alumnos where id=?', +b.alumno_id); avisarDocente(au.docente_id, tipo === 'reunion' ? `📅 Pedido de reunión · ${pila(al.nombres)}` : `💬 Mensaje de la familia de ${pila(al.nombres)}`, texto.slice(0, 120));
    return { id };
  };
  API['POST /api/mensaje-responder'] = async ({ u, b }) => {
    const m = q1('select * from mensajes where id=?', +b.id); if (!m || !esStaff(u) || !veAlumno(u, m.alumno_id)) throw 403; const r = limpio(b.texto, 1500); if (r.length < 2) throw 'Escribe tu respuesta';
    run("update mensajes set respuesta=?, respondido=datetime('now'), leido_docente=coalesce(leido_docente, datetime('now')) where id=?", r, m.id);
    avisar('respuesta', m.alumno_id, { padre: m.padre_id }, 'resp|' + m.id + '|' + Date.now(), m.padre_id); return { ok: 1 };
  };
  // bandeja del docente: justificaciones pendientes y mensajes
  API['GET /api/bandeja'] = async ({ u }) => {
    if (!esStaff(u)) throw 403; const aulas = q(u.rol === 'director' ? 'select id from aulas where colegio_id=?' : 'select id from aulas where docente_id=?', u.rol === 'director' ? u.colegio_id : u.id).map(a => a.id); if (!aulas.length) return { justificaciones: [], mensajes: [], pendientes: 0 };
    const enA = `(${aulas.join(',')})`;
    const just = q(`select j.*, a.nombres, a.apellidos, p.nombre padre from justificaciones j join alumnos a on a.id=j.alumno_id join usuarios p on p.id=j.padre_id where a.aula_id in ${enA} and j.estado='pendiente' order by j.id desc limit 50`);
    const msj = q(`select m.*, a.nombres, a.apellidos, p.nombre padre, p.telefono from mensajes m join alumnos a on a.id=m.alumno_id join usuarios p on p.id=m.padre_id where a.aula_id in ${enA} order by (m.respuesta is null) desc, m.id desc limit 50`);
    return { justificaciones: just, mensajes: msj, pendientes: just.length + msj.filter(m => !m.respuesta).length };
  };
  // lo que ve la familia en la ficha de su hijo
  API['GET /api/familia-extra'] = async ({ u, url }) => {
    const aid = +url.searchParams.get('alumno'); if (!veAlumno(u, aid)) throw 403;
    return { leidos: q('select comunicado_id from leidos where usuario_id=?', u.id).map(x => x.comunicado_id),
      faltas: q("select s.fecha, s.estado, (select estado from justificaciones j where j.alumno_id=s.alumno_id and j.fecha=s.fecha order by id desc limit 1) just from asistencia s where s.alumno_id=? and s.estado in ('F','J') and s.fecha>=date('now','-30 days') order by s.fecha desc", aid),
      mensajes: esPadre(u) ? q('select id, tipo, texto, respuesta, creado, respondido from mensajes where alumno_id=? and padre_id=? order by id desc limit 20', aid, u.id) : [] };
  };
  return { API };
}
module.exports = { crear };
