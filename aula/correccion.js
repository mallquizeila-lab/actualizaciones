// 📸 «Corregir con Libretín»: el docente toma foto del examen y Libretín propone la corrección pregunta por pregunta,
// con la clave, la rúbrica y el CRITERIO DEL PROPIO DOCENTE.
// Calibración: las primeras N correcciones (5 a 10) las hace el docente; Libretín también corrige en silencio y se mide
// cuánto coincide. Cada corrección confirmada queda en la «memoria del criterio» y se usa como ejemplo en las siguientes.
// Con ≥ 90 % de coincidencia se activa el modo rápido (el docente solo revisa lo dudoso). Siempre confirma el docente.
// Privacidad: la foto se guarda en privado; a la IA no se le da el nombre del alumno (y la franja del nombre puede taparse).
const fs = require('fs'), path = require('path');
function crear({ db, q, q1, run, aulaDe, hoy, API, E, limpio, guardarImagen, ARCH, veAlumno, avisar = () => {} }) {
  db.exec(`create table if not exists examenes (id integer primary key, aula_id integer, curso_id integer, docente_id integer, titulo text, clave text, perfil text, calibrar integer default 6, creado text default (datetime('now')));
  create table if not exists correcciones (id integer primary key, examen_id integer, alumno_id integer, fotos text, ia text, final text, puntaje real, total real, nota text, retro text, estado text default 'propuesta', coincidencia real, modo text, creado text default (datetime('now')), confirmado text);
  create index if not exists ex_aula on examenes(aula_id); create index if not exists co_ex on correcciones(examen_id, estado);`);
  for (const c of ['borrador text', 'publicado integer default 0', 'publicado_en text']) try { db.exec('alter table correcciones add column ' + c); } catch (e) {}
  const J = (s, d) => { try { return JSON.parse(s) ?? d; } catch (e) { return d; } };
  const PERFIL0 = { procedimiento: 50, ortografia: 0, caligrafia: 0, parcial: true, letra: 'flexible' };
  const iaLista = () => !!(E.AULA_SF_URL && E.AULA_IA_TOKEN);
  const deExamen = (u, id) => { const e = q1('select * from examenes where id=?', +id); if (!e || !aulaDe(u, e.aula_id)) throw 403; return e; };
  const totalDe = clave => clave.reduce((s, p) => s + (+p.puntos || 0), 0);
  const notaDe = (a, pts, tot) => { const p = tot ? pts / tot : 0; return a.escala === 'vigesimal' ? String(Math.round(p * 200) / 10) : p >= 0.9 ? 'AD' : p >= 0.7 ? 'A' : p >= 0.55 ? 'B' : 'C'; };

  async function ia(messages, max = 4000) {
    const r = await fetch(E.AULA_SF_URL + '/api/libretin-ia', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sf-token': E.AULA_IA_TOKEN }, signal: AbortSignal.timeout(180000), body: JSON.stringify({ messages, max, json: true }) });
    const j = await r.json().catch(() => ({})); if (!r.ok || !j.text) throw new Error(j.error ? 'La IA no respondió: ' + String(j.error).slice(0, 120) : 'La IA no respondió. Intenta de nuevo.');
    const m = /\{[\s\S]*\}/.exec(j.text); if (!m) throw new Error('La IA respondió en otro formato. Intenta de nuevo.'); return JSON.parse(m[0]);
  }
  const foto = id => ({ type: 'image_url', image_url: { url: `data:image/${/\.png$/.test(id) ? 'png' : 'jpeg'};base64,` + fs.readFileSync(path.join(ARCH, id)).toString('base64') } });
  const perfilTxt = p => [`- Procedimiento vs. resultado: ${p.procedimiento >= 70 ? 'el PROCEDIMIENTO vale más que el resultado' : p.procedimiento <= 30 ? 'importa sobre todo el RESULTADO final' : 'procedimiento y resultado valen parecido'}.`,
    `- Ortografía: ${['no resta puntos', 'resta un poco (máximo 10 % de la pregunta)', 'resta puntos (hasta 25 % de la pregunta)'][+p.ortografia || 0]}.`,
    `- Caligrafía, orden y limpieza: ${['no cuentan', 'cuentan un poco (letra clara y ordenada suma o resta máximo 10 %)', 'cuentan bastante (letra ilegible o desorden resta hasta 25 %)'][+p.caligrafia || 0]}.`,
    `- Puntaje parcial: ${p.parcial ? 'SÍ, da puntos parciales a respuestas incompletas o con errores menores' : 'NO, solo puntaje completo o cero'}.`,
    `- Letra difícil de leer: ${p.letra === 'estricto' ? 'si no se entiende, no se puntúa' : 'interpreta con buena fe; si dudas, marca la pregunta como dudosa'}.`].join('\n');
  // ejemplos del criterio del docente (correcciones que ya confirmó en este examen)
  function memoria(e, clave) {
    const ok = q("select ia, final from correcciones where examen_id=? and estado='confirmada' order by id desc limit 8", e.id);
    return ok.map((c, i) => { const ia_ = J(c.ia, {}).preguntas || [], fin = J(c.final, []);
      return `Ejemplo ${i + 1}:\n` + fin.map(f => { const x = ia_.find(z => +z.n === +f.n) || {}, max = clave.find(p => +p.n === +f.n)?.puntos;
        return `  P${f.n}: el alumno respondió «${String(x.leido || '?').slice(0, 140)}» → el DOCENTE puso ${f.puntos}/${max}${x.puntos != null && +x.puntos !== +f.puntos ? ` (tú habías propuesto ${x.puntos}: ajústate a su criterio)` : ''}${f.comentario ? ` · nota del docente: «${String(f.comentario).slice(0, 120)}»` : ''}`; }).join('\n'); }).join('\n');
  }
  async function corregirIA(e, a, fotos) {
    const clave = J(e.clave, []), perfil = { ...PERFIL0, ...J(e.perfil, {}) }, mem = memoria(e, clave);
    const sys = `Eres Libretín, asistente que CORRIGE exámenes escritos a mano de estudiantes del Perú, imitando el criterio de su docente. No escribas ni menciones nombres de alumnos.
Examen: «${e.titulo}». Clave y puntaje por pregunta:\n${clave.map(p => `P${p.n} (${p.puntos} pts): ${p.pregunta || ''} → Respuesta esperada: ${p.respuesta || '(criterio del docente)'}${p.criterio ? ' · Rúbrica: ' + p.criterio : ''}`).join('\n')}
Criterio del docente:\n${perfilTxt(perfil)}
${mem ? `Así corrigió el docente otros exámenes de esta misma prueba (imita su criterio):\n${mem}` : ''}
Mira la(s) foto(s) del examen resuelto. Para cada pregunta de la clave responde con JSON:
{"preguntas":[{"n":1,"leido":"lo que escribió el alumno, breve y literal","puntos":número entre 0 y el máximo (múltiplos de 0.5),"comentario":"explicación corta para el docente","dudosa":true si la letra no se lee bien o no estás seguro,"y":posición vertical aproximada de esa respuesta en la foto de 0.0 (arriba) a 1.0 (abajo),"pagina":1}],
"retro":{"logros":"1-2 frases para el estudiante: qué hizo bien","mejorar":"1-2 frases: qué debe reforzar"}}
Si una pregunta no aparece o está en blanco: puntos 0 y "leido":"(en blanco)". Responde SOLO el JSON.`;
    const r = await ia([{ role: 'system', content: sys }, { role: 'user', content: [{ type: 'text', text: 'Corrige este examen.' }, ...fotos.map(foto)] }], 5000);
    const pre = (r.preguntas || []).map(x => { const max = +(clave.find(p => +p.n === +x.n)?.puntos) || 0; return { n: +x.n, leido: limpio(x.leido, 300), puntos: Math.max(0, Math.min(max, Math.round((+x.puntos || 0) * 2) / 2)), max, comentario: limpio(x.comentario, 240), dudosa: !!x.dudosa, y: Math.max(0, Math.min(1, +x.y || 0)), pagina: Math.max(1, +x.pagina || 1) }; }).filter(x => clave.some(p => +p.n === x.n));
    for (const p of clave) if (!pre.some(x => x.n === +p.n)) pre.push({ n: +p.n, leido: '(no encontrada)', puntos: 0, max: +p.puntos, comentario: 'No la encontré en la foto', dudosa: true, y: 0, pagina: 1 });
    pre.sort((x, y) => x.n - y.n);
    return { preguntas: pre, retro: { logros: limpio(r.retro?.logros, 300), mejorar: limpio(r.retro?.mejorar, 300) } };
  }
  function estadistica(e) {
    const conf = q("select coincidencia from correcciones where examen_id=? and estado='confirmada' order by id desc", e.id), med = conf.filter(c => c.coincidencia != null).slice(0, 10);
    const coin = med.length ? Math.round(med.reduce((s, c) => s + c.coincidencia, 0) / med.length) : null;
    const modo = conf.length < (+e.calibrar || 6) ? 'calibracion' : coin != null && coin >= 90 && med.length >= 5 ? 'rapido' : 'revision';
    const x = q1("select sum(estado='propuesta') pend, sum(estado='confirmada' and coalesce(publicado,0)=0) porPub, sum(coalesce(publicado,0)=1) pub from correcciones where examen_id=?", e.id) || {};
    return { confirmadas: conf.length, calibrar: +e.calibrar || 6, coincidencia: coin, modo, pendientes: x.pend || 0, porPublicar: x.porPub || 0, publicadas: x.pub || 0 };
  }

  const api = {};
  api['GET /api/examenes'] = async ({ u, url }) => { const a = aulaDe(u, url.searchParams.get('aula')); if (!a) throw 403;
    return { ia: iaLista(), examenes: q('select e.*, c.nombre curso from examenes e left join cursos c on c.id=e.curso_id where e.aula_id=? order by e.id desc', a.id).map(e => ({ ...e, clave: J(e.clave, []), perfil: { ...PERFIL0, ...J(e.perfil, {}) }, total: totalDe(J(e.clave, [])), ...estadistica(e) })) }; };
  api['POST /api/examen'] = async ({ u, b }) => {
    const a = aulaDe(u, b.aula_id); if (!a) throw 403; if (!q1('select 1 from cursos where id=? and aula_id=?', +b.curso_id, a.id)) throw 'Elige el curso';
    const clave = (b.clave || []).slice(0, 60).map((p, i) => ({ n: i + 1, pregunta: limpio(p.pregunta, 400), respuesta: limpio(p.respuesta, 600), criterio: limpio(p.criterio, 400), puntos: Math.max(0, Math.min(100, +p.puntos || 0)) })).filter(p => p.puntos > 0);
    if (!clave.length) throw 'Agrega al menos una pregunta con su puntaje'; const titulo = limpio(b.titulo, 80); if (titulo.length < 3) throw 'Escribe el nombre del examen';
    const pf = b.perfil || {}, perfil = { procedimiento: Math.max(0, Math.min(100, +pf.procedimiento || 0)), ortografia: [0, 1, 2].includes(+pf.ortografia) ? +pf.ortografia : 0, caligrafia: [0, 1, 2].includes(+pf.caligrafia) ? +pf.caligrafia : 0, parcial: pf.parcial !== false, letra: pf.letra === 'estricto' ? 'estricto' : 'flexible' };
    const cal = Math.max(5, Math.min(10, +b.calibrar || 6));
    if (b.id) { const e = deExamen(u, b.id); run('update examenes set curso_id=?, titulo=?, clave=?, perfil=?, calibrar=? where id=?', +b.curso_id, titulo, JSON.stringify(clave), JSON.stringify(perfil), cal, e.id); return { id: e.id }; }
    return { id: run('insert into examenes(aula_id, curso_id, docente_id, titulo, clave, perfil, calibrar) values(?,?,?,?,?,?,?)', a.id, +b.curso_id, u.id, titulo, JSON.stringify(clave), JSON.stringify(perfil), cal).lastInsertRowid };
  };
  api['POST /api/examen-borrar'] = async ({ u, b }) => { const e = deExamen(u, b.id); for (const c of q('select fotos from correcciones where examen_id=?', e.id)) for (const f of J(c.fotos, [])) fs.rmSync(path.join(ARCH, f), { force: true }); run('delete from correcciones where examen_id=?', e.id); run('delete from examenes where id=?', e.id); return { ok: 1 }; };
  // lee las preguntas desde la foto del examen en blanco (o ya resuelto por el docente)
  api['POST /api/examen/leer'] = async ({ u, b }) => {
    const a = aulaDe(u, b.aula_id); if (!a) throw 403; if (!iaLista()) throw 'La IA aún no está activa'; const id = guardarImagen(b.foto);
    try { const r = await ia([{ role: 'system', content: 'Lees exámenes escolares del Perú. Devuelve SOLO JSON {"titulo":"...","preguntas":[{"pregunta":"texto breve","respuesta":"respuesta correcta si aparece marcada o si es evidente; si no, vacío","puntos":número si está indicado, si no 0}]}. No inventes preguntas.' }, { role: 'user', content: [{ type: 'text', text: 'Extrae las preguntas de este examen.' }, foto(id)] }], 3000);
      return { titulo: limpio(r.titulo, 80), preguntas: (r.preguntas || []).slice(0, 60).map(p => ({ pregunta: limpio(p.pregunta, 400), respuesta: limpio(p.respuesta, 600), puntos: +p.puntos || 0 })) };
    } finally { fs.rmSync(path.join(ARCH, id), { force: true }); }
  };
  api['GET /api/examen'] = async ({ u, url }) => { const e = deExamen(u, url.searchParams.get('id'));
    return { examen: { ...e, clave: J(e.clave, []), perfil: { ...PERFIL0, ...J(e.perfil, {}) }, total: totalDe(J(e.clave, [])), ...estadistica(e) },
      correcciones: q('select c.id, c.alumno_id, c.nota, c.puntaje, c.total, c.estado, c.coincidencia, c.modo, c.confirmado, c.publicado, c.borrador is not null borrador, a.nombres, a.apellidos from correcciones c join alumnos a on a.id=c.alumno_id where c.examen_id=? order by c.id desc', e.id) }; };
  api['GET /api/correccion'] = async ({ u, url }) => { const c = q1('select * from correcciones where id=?', +url.searchParams.get('id')); if (!c) throw 404; const e = deExamen(u, c.examen_id), al = q1('select nombres, apellidos from alumnos where id=?', c.alumno_id);
    return { id: c.id, examen: { id: e.id, titulo: e.titulo, clave: J(e.clave, []), total: totalDe(J(e.clave, [])) }, alumno: al, fotos: J(c.fotos, []).map((f, i) => i), ia: J(c.ia, null), final: J(c.final, null), borrador: J(c.borrador, null), publicado: !!c.publicado, nota: c.nota, retro: J(c.retro, null), estado: c.estado, coincidencia: c.coincidencia, modo: c.modo, ...estadistica(e) }; };
  // nueva corrección: guarda las fotos y Libretín propone (en calibración la propuesta se guarda en silencio para medir la coincidencia)
  api['POST /api/correccion'] = async ({ u, b }) => {
    const e = deExamen(u, b.examen_id), a = aulaDe(u, e.aula_id); if (!q1('select 1 from alumnos where id=? and aula_id=?', +b.alumno_id, a.id)) throw 'Elige al alumno';
    const fotos = (b.fotos || []).slice(0, 3); if (!fotos.length) throw 'Toma la foto del examen'; const ids = fotos.map(f => guardarImagen(f)), est = estadistica(e);
    const prev = q1("select * from correcciones where examen_id=? and alumno_id=? and estado='propuesta'", e.id, +b.alumno_id); if (prev) { for (const f of J(prev.fotos, [])) fs.rmSync(path.join(ARCH, f), { force: true }); run('delete from correcciones where id=?', prev.id); }
    let propuesta = null, error = null; if (iaLista()) { try { propuesta = await corregirIA(e, a, ids); } catch (x) { error = x.message; } } else error = 'La IA no está activa: corrige a mano';
    const id = run('insert into correcciones(examen_id, alumno_id, fotos, ia, total, modo) values(?,?,?,?,?,?)', e.id, +b.alumno_id, JSON.stringify(ids), propuesta ? JSON.stringify(propuesta) : null, totalDe(J(e.clave, [])), est.modo).lastInsertRowid;
    return { id, error };
  };
  api['POST /api/correccion/confirmar'] = async ({ u, b }) => {
    const c = q1('select * from correcciones where id=?', +b.id); if (!c) throw 404; const e = deExamen(u, c.examen_id), a = aulaDe(u, e.aula_id), clave = J(e.clave, []);
    const fin = clave.map(p => { const x = (b.puntos || []).find(z => +z.n === +p.n) || {}; return { n: +p.n, puntos: Math.max(0, Math.min(+p.puntos, Math.round((+x.puntos || 0) * 2) / 2)), comentario: limpio(x.comentario, 240) }; });
    const pts = fin.reduce((s, x) => s + x.puntos, 0), tot = totalDe(clave), nota = notaDe(a, pts, tot);
    const pro = J(c.ia, null)?.preguntas; let coin = null;
    if (pro) { const tol = p => Math.max(0.5, 0.1 * p.puntos); coin = Math.round(100 * clave.filter(p => { const x = pro.find(z => z.n === +p.n), f = fin.find(z => z.n === +p.n); return x && Math.abs(x.puntos - f.puntos) <= tol(p); }).length / clave.length); }
    const retro = { logros: limpio(b.retro?.logros, 400), mejorar: limpio(b.retro?.mejorar, 400) };
    run("update correcciones set final=?, puntaje=?, total=?, nota=?, retro=?, estado='confirmada', coincidencia=?, confirmado=datetime('now') where id=?", JSON.stringify(fin), pts, tot, nota, JSON.stringify(retro), coin, c.id);
    run('update correcciones set borrador=null, publicado=0 where id=?', c.id); // confirmado: espera a «Registrar y publicar»
    return { nota, puntaje: pts, total: tot, coincidencia: coin, iaPuntaje: pro ? pro.reduce((s, x) => s + x.puntos, 0) : null, ...estadistica(e) };
  };
  // 💾 borrador automático: lo que el docente va escribiendo nunca se pierde
  api['POST /api/correccion/borrador'] = async ({ u, b }) => {
    const c = q1('select * from correcciones where id=?', +b.id); if (!c) throw 404; deExamen(u, c.examen_id);
    run('update correcciones set borrador=? where id=?', JSON.stringify({ puntos: (b.puntos || []).slice(0, 60).map(x => ({ n: +x.n, puntos: x.puntos === '' || x.puntos == null ? '' : +x.puntos, comentario: limpio(x.comentario, 240) })), retro: { logros: limpio(b.retro?.logros, 400), mejorar: limpio(b.retro?.mejorar, 400) }, fecha: new Date().toISOString() }), c.id);
    return { ok: 1 };
  };
  // 📤 Registrar y publicar: las notas confirmadas pasan al registro (con el nombre de cada alumno) y las familias ven el examen corregido
  api['POST /api/examen/publicar'] = async ({ u, b }) => {
    const e = deExamen(u, b.id), a = aulaDe(u, e.aula_id), lista = q("select * from correcciones where examen_id=? and estado='confirmada' and coalesce(publicado,0)=0", e.id);
    if (!lista.length) throw 'No hay exámenes confirmados nuevos para publicar';
    const ev = q1('select id from evaluaciones where aula_id=? and curso_id=? and titulo=?', a.id, e.curso_id, e.titulo)?.id || (await API['POST /api/evaluacion']({ u, b: { aula_id: a.id, curso_id: e.curso_id, titulo: e.titulo, fecha: hoy() } })).id;
    await API['POST /api/notas']({ u, b: { aula_id: a.id, sinAviso: true, notas: lista.map(c => { const r = J(c.retro, {}); return { evaluacion_id: ev, alumno_id: c.alumno_id, valor: c.nota, comentario: [r.logros, r.mejorar].filter(Boolean).join(' · ').slice(0, 200) || null }; }) } });
    run("update correcciones set publicado=1, publicado_en=datetime('now') where examen_id=? and estado='confirmada' and coalesce(publicado,0)=0", e.id);
    const cur = q1('select nombre from cursos where id=?', e.curso_id)?.nombre; for (const c of lista) avisar('examen', c.alumno_id, { valor: c.nota, curso: cur, evaluacion: e.titulo, mejorar: J(c.retro, {}).mejorar }, `examen|${c.id}|${c.nota}`);
    return { publicadas: lista.length, ...estadistica(e) };
  };
  // 👨‍👩‍👧 familias (y docentes): exámenes publicados de un alumno, con la foto calificada
  api['GET /api/examenes-alumno'] = async ({ u, url }) => {
    const aid = +url.searchParams.get('id'); if (!veAlumno(u, aid)) throw 403;
    return { examenes: q("select c.id, c.nota, c.puntaje, c.total, c.final, c.ia, c.retro, c.fotos, c.publicado_en, e.titulo, e.clave, cu.nombre curso from correcciones c join examenes e on e.id=c.examen_id left join cursos cu on cu.id=e.curso_id where c.alumno_id=? and c.publicado=1 order by c.publicado_en desc limit 40", aid)
      .map(c => ({ id: c.id, titulo: c.titulo, curso: c.curso, nota: c.nota, puntaje: c.puntaje, total: c.total, fecha: c.publicado_en, retro: J(c.retro, {}), paginas: J(c.fotos, []).length,
        preguntas: J(c.clave, []).map(p => { const f = J(c.final, []).find(x => +x.n === +p.n) || {}, x = (J(c.ia, {}).preguntas || []).find(z => +z.n === +p.n) || {}; return { n: +p.n, max: +p.puntos, puntos: f.puntos ?? 0, comentario: f.comentario || '', y: x.y || 0, pagina: x.pagina || 1 }; }) })) };
  };
  // foto privada del examen (solo el docente del aula)
  function fotoRuta(u, cid, i) { const c = q1('select * from correcciones where id=?', +cid); if (!c) return null; const familia = ['padre', 'alumno'].includes(u.rol); if (familia) { if (!c.publicado || !veAlumno(u, c.alumno_id)) return null; } else try { deExamen(u, c.examen_id); } catch (e) { return null; } const f = J(c.fotos, [])[+i || 0]; return f ? path.join(ARCH, f) : null; }
  return { API: api, fotoRuta };
}
module.exports = { crear };
