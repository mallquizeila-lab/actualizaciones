// 📋 «Mi equipo» del director: cómo va cada docente y cada aula, de un vistazo.
//  - Por docente: ¿pasó asistencia hoy?, último registro de asistencia y de notas, mensajes de familias sin responder,
//    familias conectadas y último ingreso. Semáforo 🟢🟡🔴 con el motivo en palabras simples.
//  - Por aula: asistencia de 30 días, promedio, alumnos en riesgo y familias conectadas (para comparar).
//  - «Recordar con cariño»: un aviso amable al celular del docente (una vez al día por docente).
function crear({ q, q1, run, hoy, riesgo, letraDe, pushUsuario, audit }) {
  const DIA = 864e5, fecha = s => new Date(s + 'T12:00:00Z');
  const habiles = (desde, hasta) => { // días de clase (lunes a viernes) entre dos fechas, sin contarlas
    if (!desde) return 99; let n = 0; for (let t = fecha(desde).getTime() + DIA; t < fecha(hasta).getTime(); t += DIA) { const d = new Date(t).getUTCDay(); if (d && d !== 6) n++; } return n; };
  const esHabil = f => { const d = fecha(f).getUTCDay(); return d !== 0 && d !== 6; };
  const horaLima = () => new Date(Date.now() - 5 * 3600e3).getUTCHours();

  function equipo(cid) {
    const h = hoy(), hace30 = new Date(fecha(h).getTime() - 30 * DIA).toISOString().slice(0, 10);
    const docentes = q("select u.id, u.nombre, u.email, u.rol, u.ultimo from usuarios u where u.colegio_id=? and u.rol in ('docente','director') and u.activo=1 and (u.rol='docente' or exists (select 1 from aulas where docente_id=u.id)) order by u.rol desc, u.nombre", cid);
    const aulas = q("select x.id, x.nombre, x.nivel, x.grado, x.seccion, x.escala, x.docente_id, (select count(*) from alumnos where aula_id=x.id) alumnos from aulas x where x.colegio_id=? order by x.nivel, x.grado, x.seccion", cid).map(a => {
      const as = q1("select count(*) n, sum(estado<>'F') pres from asistencia where aula_id=? and fecha>=?", a.id, hace30);
      const fam = q1("select count(distinct al.id) n from alumnos al join familia f on f.alumno_id=al.id join usuarios u on u.id=f.padre_id and u.rol='padre' where al.aula_id=?", a.id).n;
      const rs = q('select id from alumnos where aula_id=?', a.id).map(x => riesgo(x.id)).filter(Boolean), proms = rs.map(r => r.promedio).filter(p => p != null);
      const prom = proms.length ? proms.reduce((s, p) => s + p, 0) / proms.length : null;
      return { ...a, asistencia: as.n ? Math.round(as.pres / as.n * 100) : null, promedio: letraDe(prom, a.escala), promNum: prom, alto: rs.filter(r => r.nivel === 'alto').length, medio: rs.filter(r => r.nivel === 'medio').length, familias: a.alumnos ? Math.round(fam / a.alumnos * 100) : 0,
        hoy: !!q1('select 1 from asistencia where aula_id=? and fecha=?', a.id, h), ultAsis: q1('select max(fecha) f from asistencia where aula_id=?', a.id).f, ultNota: q1('select max(e.fecha) f from evaluaciones e where e.aula_id=? and exists (select 1 from notas n where n.evaluacion_id=e.id)', a.id).f };
    });
    const lista = docentes.map(d => {
      const mis = aulas.filter(a => a.docente_id === d.id), ids = mis.map(a => a.id), en = ids.length ? `(${ids.join(',')})` : '(0)';
      const ultAsis = mis.map(a => a.ultAsis).filter(Boolean).sort().pop() || null, ultNota = mis.map(a => a.ultNota).filter(Boolean).sort().pop() || null;
      const sinMsg = q1(`select count(*) n from mensajes m join alumnos al on al.id=m.alumno_id where al.aula_id in ${en} and m.respondido is null`).n;
      const sinJust = q1(`select count(*) n from justificaciones j join alumnos al on al.id=j.alumno_id where al.aula_id in ${en} and j.estado='pendiente'`).n;
      const alumnos = mis.reduce((s, a) => s + a.alumnos, 0), fam = mis.reduce((s, a) => s + Math.round(a.familias * a.alumnos / 100), 0);
      const faltanHoy = esHabil(h) ? mis.filter(a => a.alumnos && !a.hoy).map(a => a.nombre) : [];
      const diasAsis = habiles(ultAsis, h), diasNota = ultNota ? Math.floor((fecha(h) - fecha(ultNota)) / DIA) : null;
      const motivos = []; let nivel = 'verde';
      const sube = n => { if (n === 'rojo' || (n === 'amarillo' && nivel === 'verde')) nivel = n; };
      if (!mis.length) { motivos.push('Aún no tiene aulas'); sube('amarillo'); }
      else if (!alumnos) { motivos.push('Sus aulas aún no tienen alumnos'); sube('amarillo'); }
      else {
        if (!ultAsis) { motivos.push('Todavía no registra asistencia'); sube('rojo'); }
        else if (diasAsis >= 3) { motivos.push(`${diasAsis} días de clase sin asistencia`); sube('rojo'); }
        else if (diasAsis >= 1) { motivos.push(`${diasAsis} día(s) de clase sin asistencia`); sube('amarillo'); }
        if (!ultNota) { motivos.push('Aún no registra notas'); sube('amarillo'); }
        else if (diasNota > 21) { motivos.push(`Sin notas nuevas hace ${diasNota} días`); sube('rojo'); }
        else if (diasNota > 14) { motivos.push(`Sin notas nuevas hace ${diasNota} días`); sube('amarillo'); }
        if (faltanHoy.length && horaLima() >= 11) { motivos.push(`Aún no registra la asistencia de hoy (${faltanHoy.join(', ')})`); sube('amarillo'); }
        if (sinMsg + sinJust >= 5) { motivos.push(`${sinMsg + sinJust} mensajes de familias sin responder`); sube('rojo'); }
        else if (sinMsg + sinJust) { motivos.push(`${sinMsg + sinJust} mensaje(s) de familias sin responder`); sube('amarillo'); }
        if (alumnos && fam / alumnos < 0.3) motivos.push(`Solo ${Math.round(fam / alumnos * 100)} % de familias conectadas`);
      }
      return { id: d.id, nombre: d.nombre, email: d.email, rol: d.rol, ultimo: d.ultimo, aulas: mis.map(a => a.nombre), alumnos, ultAsis, ultNota, faltanHoy, pendientes: sinMsg + sinJust, familias: alumnos ? Math.round(fam / alumnos * 100) : 0, nivel, motivos,
        recordado: !!q1("select 1 from auditoria where accion='recordatorio director' and detalle like ? and fecha>datetime('now','-20 hours')", d.id + '|%') };
    });
    const conAlumnos = aulas.filter(a => a.alumnos);
    return { hoy: h, habil: esHabil(h), hora: horaLima(), docentes: lista, aulas,
      resumen: { aulasHoy: conAlumnos.filter(a => a.hoy).length, aulasTotal: conAlumnos.length, asistencia: (() => { const v = aulas.filter(a => a.asistencia != null); return v.length ? Math.round(v.reduce((s, a) => s + a.asistencia * a.alumnos, 0) / v.reduce((s, a) => s + a.alumnos, 0)) : null; })(),
        alto: aulas.reduce((s, a) => s + a.alto, 0), familias: (() => { const t = aulas.reduce((s, a) => s + a.alumnos, 0); return t ? Math.round(aulas.reduce((s, a) => s + a.familias * a.alumnos / 100, 0) / t * 100) : 0; })(),
        verde: lista.filter(d => d.nivel === 'verde').length, amarillo: lista.filter(d => d.nivel === 'amarillo').length, rojo: lista.filter(d => d.nivel === 'rojo').length } };
  }

  // recordatorio amable (nunca un regaño): el director elige el motivo
  const TEXTOS = {
    asistencia: n => ({ title: '📅 Un recordatorio de la dirección', body: `Hola ${n}, cuando puedas, registra la asistencia de hoy 🙌 (con 🎙️ Dictar te toma 1 minuto). ¡Gracias!` }),
    notas: n => ({ title: '📊 Un recordatorio de la dirección', body: `Hola ${n}, cuando tengas un momento, registra las últimas notas para que las familias las vean 💙 ¡Gracias por tu trabajo!` }),
    mensajes: n => ({ title: '📬 Tienes mensajes de familias', body: `Hola ${n}, hay familias esperando tu respuesta en ProfeTok. Gracias por acompañarlas 💙` }),
  };
  const API = {};
  API['GET /api/equipo'] = async ({ u }) => { if (u.rol !== 'director') throw 403; return equipo(u.colegio_id); };
  API['POST /api/equipo-recordar'] = async ({ u, b }) => {
    if (u.rol !== 'director') throw 403; const d = q1("select * from usuarios where id=? and colegio_id=? and rol='docente' and activo=1", +b.docente_id, u.colegio_id); if (!d) throw 'Ese docente no es de tu colegio';
    const t = TEXTOS[b.tipo] ? b.tipo : 'asistencia';
    if (q1("select 1 from auditoria where accion='recordatorio director' and detalle like ? and fecha>datetime('now','-20 hours')", d.id + '|%')) throw `Ya le enviaste un recordatorio hoy a ${d.nombre.split(' ')[0]}. Mañana puedes enviar otro.`;
    const n = await pushUsuario(d.id, { ...TEXTOS[t](d.nombre.split(' ')[0]), url: '/#/inicio', icon: '/icono-192.png' }).catch(() => 0);
    audit(u.id, 'recordatorio director', `${d.id}|${t}`);
    return { enviado: n > 0, nombre: d.nombre };
  };
  return { API, equipo };
}
module.exports = { crear };
