// 🤖 «Mi asistente»: el ayudante con IA de cada docente en ProfeTok.
// Conoce sus aulas (grado, nivel, cursos, escala, cantidad de alumnos y quiénes necesitan apoyo, solo con su primer nombre)
// y está preparado para el Currículo Nacional (CNEB) del Perú. Usa la IA de ShortForge (sin costo extra).
// Privacidad: nunca se envían apellidos, DNI, fotos, salud ni datos de las familias a la IA.
function crear({ db, q, q1, run, getS, riesgo, aulaDe, membresia, E }) {
  db.exec(`create table if not exists asistente (id integer primary key, usuario_id integer, rol text, texto text, creado text default (datetime('now')));
    create index if not exists asi_u on asistente(usuario_id, id);`);
  const LIM = { prueba: 40, docente: 400, colegio: 4000 };
  const usoMes = u => q1("select count(*) n from asistente where usuario_id=? and rol='user' and creado>=date('now','start of month')", u.id).n;
  const listo = () => !!(E.AULA_SF_URL && E.AULA_IA_TOKEN);

  function contexto(u) {
    const aulas = q(u.rol === 'director' ? 'select * from aulas where colegio_id=?' : 'select * from aulas where docente_id=?', u.rol === 'director' ? u.colegio_id : u.id);
    const col = q1('select nombre from colegios where id=?', u.colegio_id);
    const partes = aulas.slice(0, 12).map(a => {
      const cursos = q('select nombre from cursos where aula_id=?', a.id).map(c => c.nombre).join(', ');
      const al = q('select id, nombres from alumnos where aula_id=?', a.id);
      const apoyo = al.map(x => ({ n: String(x.nombres || '').split(' ')[0], r: riesgo(x.id) })).filter(x => x.r && x.r.nivel !== 'bajo').slice(0, 10).map(x => `${x.n} (${x.r.nivel}: ${x.r.motivos.join(', ')})`);
      return `- Aula «${a.nombre}» · ${a.nivel || ''} ${a.grado || ''} ${a.seccion || ''} · ${al.length} alumnos · escala ${a.escala === 'vigesimal' ? '0 a 20' : 'AD/A/B/C'} · cursos: ${cursos || '—'}${apoyo.length ? `\n  Necesitan apoyo: ${apoyo.join('; ')}` : ''}`;
    });
    return `Docente: ${u.nombre} · ${col?.nombre || ''}\nSus aulas:\n${partes.join('\n') || '(todavía no tiene aulas)'}\nFecha de hoy: ${new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)} (Perú).`;
  }
  const SISTEMA = u => `Eres «Libretín», el asistente pedagógico personal de un(a) docente del Perú dentro de la plataforma ProfeTok (tu nombre es Libretín, la libreta amiga). Respondes SIEMPRE en español de Perú, claro, cálido y práctico, como un colega experto.
Conoces el Currículo Nacional de la Educación Básica (CNEB) del MINEDU: enfoque por competencias, áreas, competencias, capacidades, desempeños, estándares, enfoques transversales, evaluación formativa, escala AD/A/B/C, conclusiones descriptivas, y el formato de sesión de aprendizaje (título, propósito, competencia/capacidades, criterios de evaluación, evidencia, inicio–desarrollo–cierre con tiempos, materiales, reflexión).
Formato: usa títulos con «## », listas con «- », negritas con **texto** y tablas simples con | cuando ayuden. Deja todo listo para imprimir o copiar. Si haces un examen, incluye la clave de respuestas al final, separada.
Si piden un mensaje para padres, que sea respetuoso, breve y positivo. Nunca inventes datos de alumnos: usa solo lo que está abajo. No pidas ni guardes datos personales sensibles.
Datos del docente (para personalizar):\n${contexto(u)}`;

  async function preguntar(u, texto) {
    const hist = q('select rol, texto from asistente where usuario_id=? order by id desc limit 12', u.id).reverse();
    const messages = [{ role: 'system', content: SISTEMA(u) }, ...hist.map(h => ({ role: h.rol === 'user' ? 'user' : 'assistant', content: h.texto.slice(0, 6000) })), { role: 'user', content: texto }];
    const r = await fetch(E.AULA_SF_URL + '/api/libretin-ia', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sf-token': E.AULA_IA_TOKEN }, body: JSON.stringify({ messages, max: 4000 }), signal: AbortSignal.timeout(180000) });
    const j = await r.json().catch(() => ({})); if (!r.ok || j.error || !j.text) throw new Error(j.error ? 'La IA no respondió: ' + j.error : 'La IA no respondió. Intenta de nuevo en un momento.');
    return j.text.trim();
  }

  const API = {};
  API['GET /api/asistente'] = async ({ u }) => {
    if (!['docente', 'director'].includes(u.rol)) throw 403; const col = q1('select * from colegios where id=?', u.colegio_id), m = membresia(col);
    return { listo: listo(), historial: q('select id, rol, texto, creado from asistente where usuario_id=? order by id desc limit 40', u.id).reverse(), uso: usoMes(u), limite: LIM[m.prueba ? 'prueba' : col.plan] || 40,
      aulas: q(u.rol === 'director' ? 'select id, nombre, nivel, grado from aulas where colegio_id=?' : 'select id, nombre, nivel, grado from aulas where docente_id=?', u.rol === 'director' ? u.colegio_id : u.id) };
  };
  API['POST /api/asistente'] = async ({ u, b }) => {
    if (!['docente', 'director'].includes(u.rol)) throw 403; if (!listo()) throw 'Tu asistente se está activando. Intenta en unos minutos.';
    const col = q1('select * from colegios where id=?', u.colegio_id), m = membresia(col), lim = LIM[m.prueba ? 'prueba' : col.plan] || 40;
    if (usoMes(u) >= lim) throw `Usaste tus ${lim} consultas de este mes. Mejora tu plan para tener más.`;
    const texto = String(b.mensaje || '').replace(/[<>]/g, '').trim().slice(0, 4000); if (texto.length < 2) throw 'Escribe tu pregunta';
    const resp = await preguntar(u, texto);
    run("insert into asistente(usuario_id, rol, texto) values(?, 'user', ?)", u.id, texto); const id = run("insert into asistente(usuario_id, rol, texto) values(?, 'bot', ?)", u.id, resp.slice(0, 20000)).lastInsertRowid;
    return { id, texto: resp, uso: usoMes(u), limite: lim };
  };
  API['POST /api/asistente-borrar'] = async ({ u }) => { run('delete from asistente where usuario_id=?', u.id); return { ok: 1 }; };
  return { API, listo };
}
module.exports = { crear };
