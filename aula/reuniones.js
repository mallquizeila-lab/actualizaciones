// 📅 Control de asistencia para familias y 👨‍👩‍👧 reuniones/eventos con asistencia de los padres.
//  - Alumnos: por mes, con totales (presentes, tardanzas, faltas, justificadas) y el detalle día por día con la hora del registro.
//  - Padres: el docente crea una reunión o evento; cada familia confirma si asistirá y el docente marca quién asistió.
function crear({ db, q, q1, run, aulaDe, veAlumno, esStaff, limpio, hoy, avisar }) {
  db.exec(`create table if not exists eventos_fam (id integer primary key, aula_id integer, autor_id integer, titulo text, detalle text, fecha text, hora text, lugar text, creado text default (datetime('now')));
  create table if not exists asist_fam (evento_id integer, padre_id integer, alumno_id integer, rsvp text, asistio integer, primary key (evento_id, padre_id));
  create index if not exists ev_aula on eventos_fam(aula_id, fecha);`);
  try { db.exec('alter table asistencia add column hora text'); } catch (e) {}
  const mesOk = m => /^\d{4}-\d{2}$/.test(m || '') ? m : hoy().slice(0, 7);
  const API = {};

  // asistencia de un alumno por mes (familia y docente)
  API['GET /api/asistencia-alumno'] = async ({ u, url }) => {
    const id = +url.searchParams.get('id'); if (!veAlumno(u, id)) throw 403; const mes = mesOk(url.searchParams.get('mes'));
    const dias = q("select s.fecha, s.estado, s.hora, (select estado from justificaciones j where j.alumno_id=s.alumno_id and j.fecha=s.fecha order by id desc limit 1) just from asistencia s where s.alumno_id=? and substr(s.fecha,1,7)=? order by s.fecha desc", id, mes);
    const meses = q("select distinct substr(fecha,1,7) m from asistencia where alumno_id=? order by m desc limit 12", id).map(x => x.m);
    const al = q1('select a.nombres, a.apellidos, x.nombre aula, x.nivel, x.grado, x.seccion from alumnos a join aulas x on x.id=a.aula_id where a.id=?', id);
    const c = k => dias.filter(d => d.estado === k).length;
    return { alumno: al, mes, meses: meses.includes(mes) ? meses : [mes, ...meses], totales: { P: c('P'), T: c('T'), F: c('F'), J: c('J') }, dias };
  };

  // --- reuniones y eventos ---
  const familiasAula = aid => q("select distinct u.id, u.nombre, u.telefono, al.id alumno_id, al.nombres || ' ' || coalesce(al.apellidos,'') alumno from familia f join usuarios u on u.id=f.padre_id join alumnos al on al.id=f.alumno_id where al.aula_id=? and u.rol='padre' and u.activo=1 group by u.id order by al.apellidos", aid);
  API['POST /api/evento'] = async ({ u, b }) => {
    const a = aulaDe(u, b.aula_id); if (!a || !esStaff(u)) throw 403;
    if (b.borrar) { run('delete from asist_fam where evento_id=?', +b.borrar); run('delete from eventos_fam where id=? and aula_id=?', +b.borrar, a.id); return { ok: 1 }; }
    const titulo = limpio(b.titulo, 100); if (titulo.length < 3) throw 'Escribe el nombre de la reunión o evento'; const fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : null; if (!fecha) throw 'Elige la fecha';
    const hora = /^\d{2}:\d{2}$/.test(b.hora || '') ? b.hora : '', lugar = limpio(b.lugar, 200);
    const id = run('insert into eventos_fam(aula_id, autor_id, titulo, detalle, fecha, hora, lugar) values(?,?,?,?,?,?,?)', a.id, u.id, titulo, limpio(b.detalle, 600), fecha, hora, lugar).lastInsertRowid;
    for (const f of familiasAula(a.id)) avisar('evento', f.alumno_id, { titulo, fecha, hora }, `evento|${id}|${f.id}`, f.id);
    return { id };
  };
  API['GET /api/eventos'] = async ({ u, url }) => {
    const a = aulaDe(u, url.searchParams.get('aula')); if (!a) throw 403; const fam = familiasAula(a.id);
    return { familias: fam.length, eventos: q('select * from eventos_fam where aula_id=? order by fecha desc, id desc limit 40', a.id).map(e => { const r = Object.fromEntries(q('select * from asist_fam where evento_id=?', e.id).map(x => [x.padre_id, x]));
      return { ...e, lista: fam.map(f => ({ padre_id: f.id, nombre: f.nombre, alumno: f.alumno, telefono: f.telefono, rsvp: r[f.id]?.rsvp || null, asistio: r[f.id]?.asistio ?? null })) }; }) };
  };
  API['POST /api/evento-asistio'] = async ({ u, b }) => { // el docente marca quién asistió
    const e = q1('select * from eventos_fam where id=?', +b.evento_id); if (!e || !aulaDe(u, e.aula_id) || !esStaff(u)) throw 403;
    for (const [pid, v] of Object.entries(b.marcas || {})) { if (!familiasAula(e.aula_id).some(f => f.id === +pid)) continue; run('insert into asist_fam(evento_id, padre_id, asistio) values(?,?,?) on conflict(evento_id, padre_id) do update set asistio=excluded.asistio', e.id, +pid, v ? 1 : 0); }
    return { ok: 1 };
  };
  API['POST /api/evento-rsvp'] = async ({ u, b }) => { // la familia confirma si irá
    const e = q1('select * from eventos_fam where id=?', +b.evento_id); if (!e || u.rol !== 'padre') throw 403;
    if (!q1('select 1 from familia f join alumnos a on a.id=f.alumno_id where f.padre_id=? and a.aula_id=?', u.id, e.aula_id)) throw 403;
    run('insert into asist_fam(evento_id, padre_id, rsvp) values(?,?,?) on conflict(evento_id, padre_id) do update set rsvp=excluded.rsvp', e.id, u.id, b.rsvp === 'no' ? 'no' : 'si'); return { ok: 1 };
  };
  API['GET /api/mis-eventos'] = async ({ u }) => { // la familia: sus reuniones y su asistencia
    if (u.rol !== 'padre') return { eventos: [], totales: {} };
    const ev = q('select e.*, a.nombre aula, af.rsvp, af.asistio from eventos_fam e join aulas a on a.id=e.aula_id left join asist_fam af on af.evento_id=e.id and af.padre_id=? where e.aula_id in (select al.aula_id from familia f join alumnos al on al.id=f.alumno_id where f.padre_id=?) order by e.fecha desc limit 40', u.id, u.id);
    const pasados = ev.filter(e => e.fecha < hoy() && e.asistio != null);
    return { eventos: ev, totales: { asistio: pasados.filter(e => e.asistio === 1).length, falto: pasados.filter(e => e.asistio === 0).length, proximos: ev.filter(e => e.fecha >= hoy()).length } };
  };
  return { API };
}
module.exports = { crear };
