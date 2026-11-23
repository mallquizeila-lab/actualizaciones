// 🚪 Portería con QR: en la puerta escanean el fotocheck del alumno y la asistencia se marca sola
// (presente o tardanza según la hora de entrada del colegio). La familia recibe AL INSTANTE «llegó a las 7:52 a. m.».
// También registra la salida («salió a las 1:05 p. m.»).
//  - El QR lleva un código al azar (no se puede adivinar) o el código del fotocheck que el colegio ya tenía (se vincula una sola vez).
//  - Solo el personal del colegio escanea, y solo a alumnos que puede ver (director: todo el colegio · docente: sus aulas).
const crypto = require('crypto');
function crear({ db, q, q1, run, hoy, limpio, alumnosVisibles, veAlumno, esStaff, aulaDe, avisarYa, guardarImagen, borrarArchivo }) {
  try { db.exec('alter table asistencia add column salida text'); } catch (e) {}
  try { db.exec("alter table colegios add column entrada text default '08:00'"); } catch (e) {}
  try { db.exec('alter table colegios add column tolerancia integer default 10'); } catch (e) {}
  db.exec('create unique index if not exists al_codigo on alumnos(colegio_id, codigo)');
  const horaLima = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(11, 16);
  const min = h => { const [a, b] = String(h || '08:00').split(':').map(Number); return a * 60 + b; };
  const staff = u => { if (!esStaff(u) || !u.colegio_id) throw 403; };
  const ficha = id => q1('select a.id, a.nombres, a.apellidos, a.foto is not null as foto, x.nombre aula, x.grado, x.seccion from alumnos a join aulas x on x.id=a.aula_id where a.id=?', id);
  // quién puede cambiar la hora de entrada: el director o el docente sin director (colegio de un solo docente)
  const ajusta = u => u.rol === 'director' || (u.rol === 'docente' && !q1("select 1 from usuarios where colegio_id=? and rol='director' and activo=1", u.colegio_id));
  const API = {};

  API['POST /api/porteria/escanear'] = async ({ u, b }) => {
    staff(u); const cod = limpio(b.codigo, 120); if (!cod) throw 'Código vacío';
    const al = q1('select id from alumnos where colegio_id=? and codigo=?', u.colegio_id, cod);
    if (!al || !veAlumno(u, al.id)) return { nuevo: true, codigo: cod }; // fotocheck aún no vinculado
    const f = hoy(), h = horaLima(), r = q1('select estado, hora, salida from asistencia where alumno_id=? and fecha=?', al.id, f), A = ficha(al.id), aula = q1('select aula_id from alumnos where id=?', al.id).aula_id;
    if (b.modo === 'salida') {
      if (r?.salida) return { alumno: A, modo: 'salida', repetido: true, hora: r.salida, estado: r.estado };
      if (r) run('update asistencia set salida=? where alumno_id=? and fecha=?', h, al.id, f);
      else run("insert into asistencia(aula_id, alumno_id, fecha, estado, salida) values(?,?,?,'P',?)", aula, al.id, f, h); // salió sin marcar entrada: estuvo presente
      avisarYa('salida', al.id, { hora: h }, `salida|${al.id}|${f}`);
      return { alumno: A, modo: 'salida', hora: h, estado: r?.estado || 'P' };
    }
    if (r?.hora && ['P', 'T'].includes(r.estado)) return { alumno: A, modo: 'entrada', repetido: true, hora: r.hora, estado: r.estado };
    const c = q1('select entrada, tolerancia from colegios where id=?', u.colegio_id), estado = min(h) <= min(c.entrada) + (c.tolerancia ?? 10) ? 'P' : 'T';
    run('insert into asistencia(aula_id, alumno_id, fecha, estado, hora) values(?,?,?,?,?) on conflict(alumno_id, fecha) do update set estado=excluded.estado, hora=excluded.hora', aula, al.id, f, estado, h);
    avisarYa('entrada', al.id, { hora: h, tarde: estado === 'T' }, `entrada|${al.id}|${f}`);
    return { alumno: A, modo: 'entrada', hora: h, estado };
  };

  // resumen del día para la pantalla de portería
  API['GET /api/porteria/hoy'] = async ({ u }) => {
    staff(u); const vis = alumnosVisibles(u), ids = [...vis].join(',') || '0', c = q1('select entrada, tolerancia from colegios where id=?', u.colegio_id);
    const regs = q(`select s.alumno_id, s.estado, s.hora, s.salida from asistencia s where s.fecha=? and s.alumno_id in (${ids}) and (s.hora is not null or s.salida is not null) order by max(coalesce(s.hora,''), coalesce(s.salida,'')) desc`, hoy());
    return { entrada: c.entrada || '08:00', tolerancia: c.tolerancia ?? 10, ajusta: ajusta(u), total: vis.size, llegaron: regs.filter(r => r.hora).length, salieron: regs.filter(r => r.salida).length,
      ultimos: regs.slice(0, 25).map(r => ({ ...r, alumno: ficha(r.alumno_id) })) };
  };

  API['POST /api/porteria/config'] = async ({ u, b }) => {
    staff(u); if (!ajusta(u)) throw 'Solo la dirección cambia la hora de entrada';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.entrada || '')) throw 'Escribe la hora así: 07:45'; const t = Math.max(0, Math.min(120, Math.round(+b.tolerancia || 0)));
    run('update colegios set entrada=?, tolerancia=? where id=?', b.entrada, t, u.colegio_id); return { ok: 1 };
  };

  // fotocheck que el colegio ya tenía: se escanea una vez y se le asigna al alumno
  API['GET /api/porteria/buscar'] = async ({ u, url }) => {
    staff(u); const t = limpio(url.searchParams.get('q'), 40); if (t.length < 2) return { alumnos: [] }; const ids = [...alumnosVisibles(u)].join(',') || '0';
    return { alumnos: q(`select id from alumnos where id in (${ids}) and (nombres || ' ' || coalesce(apellidos,'')) like ? limit 12`, `%${t}%`).map(r => ficha(r.id)) };
  };
  API['POST /api/porteria/vincular'] = async ({ u, b }) => {
    staff(u); const cod = limpio(b.codigo, 120); if (!cod || !veAlumno(u, b.alumno_id)) throw 403;
    const otro = q1('select nombres from alumnos where colegio_id=? and codigo=? and id<>?', u.colegio_id, cod, +b.alumno_id); if (otro) throw `Ese fotocheck ya es de ${otro.nombres}`;
    run('update alumnos set codigo=? where id=?', cod, +b.alumno_id); return { ok: 1 };
  };

  // fotochecks para imprimir: a quien no tiene código se le crea uno al azar
  API['GET /api/porteria/fotochecks'] = async ({ u, url }) => {
    staff(u); const a = aulaDe(u, url.searchParams.get('aula')); if (!a) throw 403;
    for (const s of q('select id from alumnos where aula_id=? and codigo is null', a.id)) run('update alumnos set codigo=? where id=?', 'PT' + crypto.randomBytes(8).toString('base64url'), s.id);
    return { aula: { nombre: a.nombre, grado: a.grado, seccion: a.seccion, nivel: a.nivel }, alumnos: q('select id, nombres, apellidos, foto is not null as foto, codigo from alumnos where aula_id=? order by apellidos, nombres', a.id) };
  };
  // 📸 foto del alumno tomada en la misma hoja de fotochecks
  API['POST /api/porteria/foto'] = async ({ u, b }) => {
    staff(u); if (!veAlumno(u, b.alumno_id) || !b.foto) throw 403; const al = q1('select foto from alumnos where id=?', +b.alumno_id);
    const nf = guardarImagen(b.foto); run('update alumnos set foto=? where id=?', nf, +b.alumno_id); if (al.foto) borrarArchivo(al.foto); return { ok: 1 };
  };
  return { API };
}
module.exports = { crear };
