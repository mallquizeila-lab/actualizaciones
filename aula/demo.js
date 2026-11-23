// 🎓 Cuenta de demostración para seminarios: I.E. Cepriano, 6.° grado «A» de primaria, profesor Emanuel Fernández,
// 40 alumnos y sus 40 mamás, y un bimestre de actividad (asistencia por QR, notas, tareas, bitácora, comunicados,
// reuniones, mensajes, avisos y conversaciones con el asistente). TODO es inventado.
//  - Correos con el dominio .demo (no existe): nunca sale un correo, aviso ni WhatsApp a nadie real.
//  - «Crear / reiniciar» borra la demo anterior y la vuelve a armar con fechas de esta semana.
//  - Las contraseñas se generan al azar y solo se ven en el panel del dueño.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
function crear({ q, q1, run, hashPass, hoy, guardarImagen, borrarArchivo, getS, setS }) {
  const DIR = path.join(__dirname, 'demo'), img = f => guardarImagen(`data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(path.join(DIR, f)).toString('base64'));
  let semilla = 7; const rnd = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646, elige = L => L[Math.floor(rnd() * L.length)];
  const clave = () => 'Demo-' + crypto.randomInt(1000, 9999) + crypto.randomBytes(2).toString('hex');

  function borrar() {
    const cid = getS('demo_colegio', 0); if (!cid) return;
    const als = q('select id, foto from alumnos where colegio_id=?', cid), aulas = q('select id from aulas where colegio_id=?', cid).map(a => a.id), us = q('select id from usuarios where colegio_id=?', cid).map(u => u.id);
    const tablas = q("select name from sqlite_master where type='table'").map(t => t.name), col = (t, c) => q(`pragma table_info(${t})`).some(x => x.name === c);
    for (const a of als) { borrarArchivo(a.foto); for (const t of tablas) if (col(t, 'alumno_id')) run(`delete from ${t} where alumno_id=?`, a.id); }
    for (const a of aulas) { for (const e of q('select id from evaluaciones where aula_id=?', a)) run('delete from notas where evaluacion_id=?', e.id); for (const tt of q('select id from tareas where aula_id=?', a)) run('delete from entregas where tarea_id=?', tt.id); for (const c of q('select id from comunicados where aula_id=?', a)) run('delete from leidos where comunicado_id=?', c.id); for (const ev of q('select id from eventos_fam where aula_id=?', a)) run('delete from asist_fam where evento_id=?', ev.id);
      for (const t of ['evaluaciones', 'tareas', 'comunicados', 'eventos_fam', 'cursos', 'incidencias', 'asistencia']) if (tablas.includes(t)) run(`delete from ${t} where aula_id=?`, a); }
    for (const u of us) { for (const t of ['sesiones', 'asistente', 'avisos_pref', 'push_subs']) if (tablas.includes(t)) run(`delete from ${t} where usuario_id=?`, u); run('delete from avisos where padre_id=?', u); run('delete from familia where padre_id=?', u); }
    const lg = q1('select logo from colegios where id=?', cid); borrarArchivo(lg?.logo);
    run('delete from alumnos where colegio_id=?', cid); run('delete from aulas where colegio_id=?', cid); run('delete from usuarios where colegio_id=?', cid); run('delete from colegios where id=?', cid); setS('demo_colegio', 0);
  }

  function armar() {
    borrar(); semilla = 7; const ahora = new Date(), vence = new Date(Date.now() + 3650 * 864e5).toISOString();
    const cid = run("insert into colegios(nombre, logo, color, lema, plan, vence) values(?,?,?,?,?,?)", 'I.E. Cepriano', img('logo.png'), '#1d4ed8', 'Ciencia · Tecnología · Valores', 'colegio', vence).lastInsertRowid; setS('demo_colegio', cid);
    try { run("update colegios set entrada='07:45', tolerancia=10 where id=?", cid); } catch (e) {}
    const cProf = clave(), cMama = clave();
    const prof = run("insert into usuarios(email, nombre, hash, rol, colegio_id, telefono) values(?,?,?,?,?,?)", 'emanuel.fernandez@cepriano.demo', 'Emanuel Fernández', hashPass(cProf), 'docente', cid, '').lastInsertRowid;
    const aula = run('insert into aulas(colegio_id, docente_id, nombre, nivel, grado, seccion, escala, horario) values(?,?,?,?,?,?,?,?)', cid, prof, '6.° A', 'Primaria', '6.° grado', 'A', 'letras', 'Lunes a viernes · 7:45 a. m. a 1:15 p. m.').lastInsertRowid;
    const CURSOS = [['Matemática', '#2563eb'], ['Comunicación', '#dc2626'], ['Ciencia y Tecnología', '#16a34a'], ['Personal Social', '#ca8a04'], ['Inglés', '#7c3aed'], ['Arte y Cultura', '#db2777'], ['Educación Física', '#0891b2']].map(([n, c]) => ({ n, id: run('insert into cursos(aula_id, nombre, color) values(?,?,?)', aula, n, c).lastInsertRowid }));
    const NINOS = ['Mateo', 'Santiago', 'Thiago', 'Sebastián', 'Gael', 'Diego', 'Adrián', 'Joaquín', 'Liam', 'Dylan', 'Fabricio', 'Ángel', 'Rodrigo', 'Benjamín', 'Alessandro', 'Luis', 'Jhosep', 'Matías', 'Gabriel', 'Leonardo'];
    const NINAS = ['Valentina', 'Camila', 'Luciana', 'Mía', 'Isabella', 'Ariana', 'Valeria', 'Ximena', 'Fernanda', 'Sofía', 'Antonella', 'Danna', 'Brianna', 'Kiara', 'Abigail', 'Nicole', 'Rafaela', 'Alessia', 'Zoe', 'Mariana'];
    const AP = ['Quispe', 'Flores', 'Huamán', 'Mamani', 'Rojas', 'Sánchez', 'García', 'Torres', 'Chávez', 'Ramos', 'Vargas', 'Castillo', 'Mendoza', 'Gutiérrez', 'Espinoza', 'Díaz', 'Cruz', 'Salazar', 'Medina', 'Paredes', 'Cárdenas', 'Romero', 'Ríos', 'Herrera', 'Silva'];
    const MAMAS = ['Rosa', 'María', 'Carmen', 'Juana', 'Lucía', 'Patricia', 'Elena', 'Ana', 'Gladys', 'Marisol', 'Silvia', 'Milagros', 'Roxana', 'Karina', 'Yolanda', 'Liliana', 'Diana', 'Verónica', 'Flor', 'Jessica'];
    const sinTilde = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    // nivel de cada alumno: 4 necesitan apoyo, 6 en proceso, el resto bien (para que la alerta temprana tenga qué mostrar)
    const perfiles = [...Array(40)].map((_, i) => i < 4 ? 'bajo' : i < 10 ? 'medio' : 'alto').sort(() => rnd() - .5);
    const A = [];
    for (let i = 0; i < 40; i++) {
      const nina = i % 2 === 1, nombre = (nina ? NINAS : NINOS)[Math.floor(i / 2)], ap1 = elige(AP), ap2 = elige(AP), mama = MAMAS[i % 20], apMama = ap2;
      const id = run('insert into alumnos(aula_id, colegio_id, nombres, apellidos, foto, nacimiento, consentimiento, codigo) values(?,?,?,?,?,?,1,?)', aula, cid, nombre, `${ap1} ${ap2}`, img(`av${(i % 16) + 1}.jpg`), `2014-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i * 7) % 28).padStart(2, '0')}`, 'PT' + crypto.randomBytes(8).toString('base64url')).lastInsertRowid;
      const email = `${sinTilde(mama)}.${sinTilde(apMama)}${i + 1}@cepriano.demo`;
      const mid = run("insert into usuarios(email, nombre, hash, rol, colegio_id, telefono) values(?,?,?,'padre',?,?)", email, `${mama} ${apMama}`, hashPass(cMama), cid, '').lastInsertRowid;
      run('insert into familia(padre_id, alumno_id, parentesco) values(?,?,?)', mid, id, 'madre');
      A.push({ id, nombre, mid, mama: `${mama} ${apMama}`, email, p: perfiles[i] });
    }
    // días de clase: las últimas 6 semanas (lunes a viernes) hasta hoy
    const dias = []; for (let d = 0; dias.length < 30 && d < 60; d++) { const f = new Date(Date.now() - 5 * 3600e3 - d * 864e5), w = f.getUTCDay(); if (w > 0 && w < 6) dias.unshift(f.toISOString().slice(0, 10)); }
    const hm = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, hoyD = hoy();
    for (const a of A) for (const f of dias) {
      const r = rnd(), pf = a.p === 'bajo' ? .1 : a.p === 'medio' ? .05 : .015, pt = a.p === 'bajo' ? .14 : a.p === 'medio' ? .08 : .03;
      if (r < pf) { const just = rnd() < .4; run('insert into asistencia(aula_id, alumno_id, fecha, estado) values(?,?,?,?)', aula, a.id, f, just ? 'J' : 'F'); if (just) run("insert into justificaciones(alumno_id, padre_id, fecha, motivo, estado) values(?,?,?,?,'aprobada')", a.id, a.mid, f, elige(['Tuvo cita médica', 'Amaneció con fiebre', 'Viaje familiar por salud de su abuelita'])); continue; }
      const tarde = r < pf + pt, h = tarde ? hm(8, 2 + Math.floor(rnd() * 25)) : hm(7, 25 + Math.floor(rnd() * 25)), sal = f === hoyD ? null : hm(13, 15 + Math.floor(rnd() * 12));
      run('insert into asistencia(aula_id, alumno_id, fecha, estado, hora, salida) values(?,?,?,?,?,?)', aula, a.id, f, tarde ? 'T' : 'P', h, sal);
    }
    run("insert into justificaciones(alumno_id, padre_id, fecha, motivo, estado) values(?,?,?,?,'pendiente')", A[3].id, A[3].mid, dias[dias.length - 2], 'Tuvo control con el dentista, adjunto la constancia.');
    // notas: 4 evaluaciones por curso en el bimestre
    const letra = p => { const r = rnd(); return p === 'alto' ? (r < .35 ? 'AD' : r < .9 ? 'A' : 'B') : p === 'medio' ? (r < .1 ? 'A' : r < .75 ? 'B' : 'C') : (r < .2 ? 'B' : 'C'); };
    const EVAL = ['Evaluación diagnóstica', 'Práctica calificada', 'Exposición', 'Evaluación de unidad'];
    CURSOS.forEach((c, ci) => EVAL.forEach((t, ei) => { const eid = run('insert into evaluaciones(curso_id, aula_id, titulo, fecha, tipo, bimestre) values(?,?,?,?,?,?)', c.id, aula, t, dias[Math.min(dias.length - 1, 4 + ei * 7 + (ci % 3))], ei === 2 ? 'exposición' : 'evaluación', 3).lastInsertRowid;
      for (const a of A) run('insert into notas(evaluacion_id, alumno_id, valor, comentario) values(?,?,?,?)', eid, a.id, letra(a.p), ''); }));
    // tareas y entregas
    const TAREAS = [[0, 'Problemas de fracciones (pág. 54)', 'Resolver del 1 al 10 en el cuaderno.'], [1, 'Cuento con valores', 'Escribir un cuento corto sobre la honestidad.'], [2, 'Maqueta del sistema solar', 'Con material reciclado. Trabajo en parejas.'], [3, 'Línea de tiempo de la Independencia', 'En papelógrafo, con imágenes.'], [4, 'Vocabulary: My family', 'Completar la ficha y practicar la pronunciación.'], [0, 'Tabla de proporcionalidad', 'Ficha 12 del cuaderno de trabajo.'], [1, 'Lectura: «El zorro y el cóndor»', 'Leer y responder las 8 preguntas.'], [2, 'Experimento: germinación', 'Registrar en la ficha cada día.'], [5, 'Dibujo: danza típica de mi región', 'Con témperas en hoja A3.'], [0, 'Repaso para la evaluación de unidad', 'Resolver la práctica dirigida.']];
    TAREAS.forEach(([ci, t, d], k) => { const entrega = dias[Math.min(dias.length - 1, 3 + k * 3)] || hoyD, tid = run('insert into tareas(aula_id, curso_id, titulo, descripcion, entrega) values(?,?,?,?,?)', aula, CURSOS[ci].id, t, d, k === TAREAS.length - 1 ? new Date(Date.now() + 3 * 864e5 - 5 * 3600e3).toISOString().slice(0, 10) : entrega).lastInsertRowid;
      if (k < TAREAS.length - 1) for (const a of A) { const r = rnd(), ok = a.p === 'bajo' ? r < .45 : a.p === 'medio' ? r < .78 : r < .96; run('insert into entregas values(?,?,?)', tid, a.id, ok ? 'entregada' : r < .985 ? 'pendiente' : 'tarde'); } });
    // bitácora
    const LOGROS = ['Ganó el primer puesto en el concurso de matemática del colegio 🏆', 'Ayudó a un compañero a entender las fracciones', 'Excelente exposición sobre el agua', 'Leyó 3 libros este mes en el plan lector', 'Representó al aula en el campeonato de fulbito', 'Muy solidario en la campaña de reciclaje'];
    const OBS = ['Conversa mucho durante la clase; se habló con él/ella', 'No trajo materiales para Arte dos veces', 'Llegó sin tarea de Matemática', 'Discusión con un compañero en el recreo; se resolvió conversando'];
    A.forEach((a, i) => { if (a.p === 'alto' && rnd() < .3) run("insert into incidencias(alumno_id, aula_id, docente_id, fecha, tipo, descripcion, visible_padre) values(?,?,?,?,'logro',?,1)", a.id, aula, prof, elige(dias), elige(LOGROS));
      if (a.p !== 'alto' && rnd() < .7) run("insert into incidencias(alumno_id, aula_id, docente_id, fecha, tipo, descripcion, visible_padre) values(?,?,?,?,?,?,1)", a.id, aula, prof, elige(dias), elige(['conducta', 'académica']), elige(OBS)); });
    run("insert into incidencias(alumno_id, aula_id, docente_id, fecha, tipo, descripcion, visible_padre) values(?,?,?,?,'salud',?,0)", A[7].id, aula, prof, dias[dias.length - 3], 'Se sintió mal en la segunda hora; se avisó a la mamá y lo recogió.');
    // comunicados (casi todas las mamás los leyeron)
    const COM = [['Reunión de padres del III bimestre', 'Estimadas familias: los esperamos el próximo viernes a las 6:00 p. m. en el aula de 6.° A para entregar los avances del bimestre. ¡Su asistencia es muy importante!'], ['Paseo de integración', 'El jueves iremos al parque zonal. Traer lonchera saludable, gorro y bloqueador. Salida 8:00 a. m., retorno 12:30 p. m.'], ['Día del Logro', 'Este mes presentaremos los proyectos de Ciencia. Los alumnos preparan sus maquetas en clase.'], ['Uso del fotocheck con QR', 'Desde esta semana el ingreso se registra escaneando el fotocheck en la puerta. Ustedes recibirán en su celular la hora exacta de llegada de su hijo(a).'], ['Campaña de vacunación', 'El centro de salud vendrá a vacunar contra la influenza. Firmar y devolver la autorización.']];
    COM.forEach(([t, x], k) => { const id = run("insert into comunicados(aula_id, colegio_id, autor_id, titulo, texto, creado) values(?,?,?,?,?,datetime('now', ?))", aula, cid, prof, t, x, `-${(COM.length - k) * 6} days`).lastInsertRowid; for (const a of A) if (rnd() < .88) run('insert or ignore into leidos values(?,?)', id, a.mid); });
    // reuniones con las mamás: una pasada (con asistencia) y una próxima (con confirmaciones)
    const ev1 = run('insert into eventos_fam(aula_id, autor_id, titulo, detalle, fecha, hora, lugar) values(?,?,?,?,?,?,?)', aula, prof, 'Reunión de inicio del bimestre', 'Presentación del plan de trabajo y acuerdos de convivencia.', dias[2], '18:00', 'Aula de 6.° A').lastInsertRowid;
    const ev2 = run('insert into eventos_fam(aula_id, autor_id, titulo, detalle, fecha, hora, lugar) values(?,?,?,?,?,?,?)', aula, prof, 'Entrega de avances del III bimestre', 'Conversaremos sobre el progreso de cada estudiante.', new Date(Date.now() + 5 * 864e5 - 5 * 3600e3).toISOString().slice(0, 10), '18:00', 'Aula de 6.° A').lastInsertRowid;
    for (const a of A) { run('insert into asist_fam(evento_id, padre_id, alumno_id, rsvp, asistio) values(?,?,?,?,?)', ev1, a.mid, a.id, 'si', rnd() < .82 ? 1 : 0); const r = rnd(); if (r < .7) run('insert into asist_fam(evento_id, padre_id, alumno_id, rsvp) values(?,?,?,?)', ev2, a.mid, a.id, r < .62 ? 'si' : 'no'); }
    // mensajes de mamás al profe
    const MSJ = [['Profesor, buenas tardes. ¿Podría indicarme qué temas entran en la evaluación de Matemática?', 'Buenas tardes, señora. Entran fracciones, decimales y proporcionalidad. ¡Gracias por preguntar!'], ['Mi hijo no podrá asistir mañana por una cita médica. Gracias.', 'Gracias por avisar. Que se recupere pronto.'], ['¿Se puede llevar la maqueta el lunes en vez del viernes?', 'Sí, no hay problema. La recibiré el lunes a primera hora.'], ['Profesor, ¿cómo va mi hija en Comunicación? La noto preocupada.', null], ['Quisiera una reunión para conversar sobre la conducta de mi hijo.', null], ['Muchas gracias por la paciencia con mi niño, está muy contento en el aula.', '¡Gracias a usted! Es un gusto tenerlo en clase.']];
    MSJ.forEach(([t, r], k) => { const a = A[(k * 7 + 2) % 40]; run("insert into mensajes(alumno_id, padre_id, docente_id, tipo, texto, respuesta, creado) values(?,?,?,?,?,?,datetime('now', ?))", a.id, a.mid, prof, k === 4 ? 'reunion' : 'mensaje', t, r, `-${(6 - k) * 2} days`); });
    // avisos que ya recibieron las mamás (en su celular aparecen en «Novedades»)
    const av = (a, tipo, nivel, titulo, cuerpo, st, hace) => { try { run("insert into avisos(padre_id, alumno_id, tipo, nivel, titulo, cuerpo, detalle, url, clave, creado, enviado) values(?,?,?,?,?,?,?,?,?,datetime('now', ?),datetime('now', ?))", a.mid, a.id, tipo, nivel, titulo, cuerpo, JSON.stringify({ sticker: st }), '/#/novedades', `demo|${a.mid}|${tipo}|${hace}`, hace, hace); } catch (e) {} };
    A.filter(a => a.p === 'alto').slice(0, 12).forEach((a, k) => av(a, 'nota', 'destacado', '🎉 ¡Felicitaciones, familia!', `${a.nombre} obtuvo AD en Matemática (Evaluación de unidad). ¡Es un logro destacado! Celébrenlo juntos 💙`, 'felicita', `-${k + 1} days`));
    A.filter(a => a.p === 'bajo').forEach((a, k) => av(a, 'nota', 'inicio', `🤝 Acompañemos a ${a.nombre}`, `${a.nombre} obtuvo C en Comunicación. Está empezando a desarrollar este aprendizaje y, con tu apoyo y el de su docente, lo va a lograr. ¡Cada paso cuenta! 💙`, 'apoyo', `-${k + 2} days`));
    // la llegada de hoy, la más reciente
    for (const a of A) { const r = q1('select hora, estado from asistencia where alumno_id=? and fecha=?', a.id, hoyD); if (r?.hora) av(a, 'entrada', null, `🎒 ${a.nombre} llegó al colegio`, `Entró a las ${r.hora} a. m.${r.estado === 'T' ? ', un poquito después de la hora de entrada (tardanza).' : ' ¡Que tenga un lindo día! 💙'}`, r.estado === 'T' ? 'info' : 'felicita', '-2 hours'); }
    // el asistente con conversaciones de ejemplo
    const CH = [['user', 'Prepárame una sesión de aprendizaje de Matemática para 6.° grado sobre fracciones equivalentes (90 minutos).'], ['bot', '📘 **Sesión: Descubrimos fracciones equivalentes**\n\n**Competencia:** Resuelve problemas de cantidad.\n**Propósito:** Hoy reconoceremos fracciones equivalentes usando material concreto.\n\n**Inicio (15 min):** Reto de la pizza: ¿es lo mismo comer 2/4 que 1/2?\n**Desarrollo (60 min):** Trabajo en grupos con tiras de papel, regletas y la recta numérica. Registran sus hallazgos en un organizador.\n**Cierre (15 min):** Metacognición: ¿cómo sabemos que dos fracciones son equivalentes?\n\n**Evidencia:** Ficha de 6 problemas contextualizados (mercado, chacra, recetas).\n**Criterios:** Representa, compara y explica fracciones equivalentes.'], ['user', 'Escribe un mensaje amable para las familias recordando la reunión del viernes.'], ['bot', '👋 Estimadas familias de 6.° A:\n\nLes recordamos con cariño nuestra **reunión del viernes a las 6:00 p. m.** en el aula. Conversaremos sobre los avances de sus hijos y las metas del bimestre.\n\n¡Su presencia hace la diferencia! 💙\n\nProf. Emanuel Fernández']];
    try { for (const [r, t] of CH) run('insert into asistente(usuario_id, rol, texto) values(?,?,?)', prof, r, t); } catch (e) {}
    const mamaEj = A.find(a => a.p === 'alto') || A[0];
    return { colegio: 'I.E. Cepriano', docente: { email: 'emanuel.fernandez@cepriano.demo', clave: cProf }, mama: { email: mamaEj.email, nombre: mamaEj.mama, hijo: mamaEj.nombre, clave: cMama }, alumnos: A.length, dias: dias.length };
  }
  return { armar, borrar };
}
module.exports = { crear };
