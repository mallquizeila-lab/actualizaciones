// 🎙️ «Dictar a Libretín»: el docente habla (o escribe) lo que pasó en clase y ProfeTok lo ordena solo en
// asistencia, notas, bitácora (conducta y logros) y tareas. El docente revisa la propuesta y la guarda con un toque.
// Privacidad: a la IA solo van códigos (A1, A2…) con el nombre de pila y la inicial del apellido; los apellidos que el
// docente diga se reemplazan por su inicial antes de enviar. Nada se guarda sin que el docente lo confirme.
// Si la IA no está disponible, un intérprete propio (sin IA) entiende lo más común: faltas, tardanzas y notas.
function crear({ q, q1, aulaDe, hoy, API, E, limpio }) {
  const quitarTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const LIM = new Map(); const limite = uid => { const k = uid + '|' + hoy(), n = (LIM.get(k) || 0) + 1; LIM.set(k, n); if (LIM.size > 5000) LIM.clear(); return n > 150; };

  // alumnos con alias para la IA: «A3: María Q.» (si dos se llaman igual, se diferencian por la inicial)
  function padron(a) {
    const al = q('select id, nombres, apellidos from alumnos where aula_id=? order by apellidos, nombres', a.id);
    return al.map((x, i) => { const pila = String(x.nombres || '').trim().split(/\s+/)[0] || 'Alumno', ini = (String(x.apellidos || '').trim()[0] || '').toUpperCase();
      return { ...x, cod: 'A' + (i + 1), pila, etiqueta: `${pila}${ini ? ' ' + ini + '.' : ''}` }; });
  }
  // reemplaza los apellidos dichos por el docente por su inicial (no salen de ProfeTok)
  function anonimizar(texto, P) {
    let t = String(texto || '');
    const palabras = new Set(P.flatMap(x => String(x.apellidos || '').split(/\s+/)).filter(w => w.length > 2));
    for (const w of palabras) t = t.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), w[0].toUpperCase() + '.');
    return t;
  }

  async function conIA(a, P, cursos, texto, fecha) {
    const sistema = `Eres Libretín, asistente de un(a) docente en Perú. Conviertes lo que el docente DICTA en datos ordenados para su registro.
Alumnos del aula (código: nombre): ${P.map(x => `${x.cod}: ${x.etiqueta}`).join(' | ')}
Cursos (código: nombre): ${cursos.map(c => `C${c.id}: ${c.nombre}`).join(' | ')}
Escala de notas: ${a.escala === 'vigesimal' ? 'vigesimal de 0 a 20' : 'letras AD, A, B, C (si dice «logro destacado» = AD, «logro esperado» = A, «en proceso» = B, «en inicio» = C)'}.
Fecha de hoy: ${fecha}. Días: interpreta «mañana», «el viernes», etc. como fecha YYYY-MM-DD a partir de hoy.
Responde SOLO con JSON con esta forma (listas vacías si no aplica):
{"asistencia":[{"a":"A3","estado":"F|T|P|J"}],"demas_presentes":true|false,"notas":[{"a":"A3","curso":"C12","evaluacion":"título corto","valor":"18 o AD"}],"bitacora":[{"a":"A3","tipo":"conducta|logro|académica|salud|otro","texto":"redactado breve, respetuoso y objetivo","visible_padre":true}],"tareas":[{"curso":"C12","titulo":"...","descripcion":"...","entrega":"YYYY-MM-DD"}],"dudas":["nombres o datos que no entendiste"]}
Reglas: F = faltó, T = llegó tarde, J = falta justificada, P = presente. «Los demás presentes» → demas_presentes true. Usa SOLO códigos de la lista; si un nombre no coincide con nadie o es ambiguo, ponlo en "dudas" y no inventes. Para salud o temas delicados, visible_padre false y texto prudente.`;
    const r = await fetch(E.AULA_SF_URL + '/api/libretin-ia', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sf-token': E.AULA_IA_TOKEN }, signal: AbortSignal.timeout(90000),
      body: JSON.stringify({ messages: [{ role: 'system', content: sistema }, { role: 'user', content: anonimizar(texto, P) }], max: 3000, json: true }) });
    const j = await r.json().catch(() => ({})); if (!r.ok || !j.text) throw new Error(j.error || 'La IA no respondió');
    const m = /\{[\s\S]*\}/.exec(j.text); if (!m) throw new Error('La IA respondió en otro formato'); return JSON.parse(m[0]);
  }

  // intérprete sin IA: lo más común (faltas, tardanzas, «los demás presentes» y notas «Nombre 18»)
  function sinIA(a, P, cursos, texto) {
    const out = { asistencia: [], demas_presentes: false, notas: [], bitacora: [], tareas: [], dudas: [] };
    const frases = String(texto).split(/[.;\n]+/).map(s => s.trim()).filter(Boolean);
    const buscar = s => { const t = quitarTildes(s); return P.filter(x => new RegExp(`\\b${quitarTildes(x.pila)}\\b`).test(t)); };
    for (const f of frases) {
      const t = quitarTildes(f), quien = buscar(f);
      if (/(los )?(demas|todos|resto).{0,20}presente|asistieron todos|vinieron todos/.test(t)) out.demas_presentes = true;
      const est = /justific/.test(t) ? 'J' : /tarde|tardanza/.test(t) ? 'T' : /falt[oóa]|no (vino|asistio)|ausente/.test(t) ? 'F' : /presente/.test(t) && !/demas|todos|resto/.test(t) ? 'P' : null;
      if (est) for (const x of quien) out.asistencia.push({ a: x.cod, estado: est });
      const curso = cursos.find(c => t.includes(quitarTildes(c.nombre).split(' ')[0]));
      for (const x of quien) { const m = new RegExp(`\\b${quitarTildes(x.pila)}\\b[^0-9a-z]{0,12}(\\d{1,2}(?:[.,]\\d)?|ad|a|b|c)\\b`).exec(t); if (m && !est && curso) out.notas.push({ a: x.cod, curso: 'C' + curso.id, evaluacion: 'Evaluación dictada', valor: m[1].replace(',', '.').toUpperCase() }); }
    }
    if (!out.asistencia.length && !out.notas.length && !out.demas_presentes) out.dudas.push('Sin la IA solo entiendo faltas, tardanzas y notas del tipo «María 18 en Matemática». Intenta de nuevo en un momento para lo demás.');
    return out;
  }

  // convierte la respuesta en filas claras con los ids reales (y descarta lo que no cuadre)
  function ordenar(a, P, cursos, x, fecha) {
    const porCod = Object.fromEntries(P.map(p => [p.cod, p])), cur = id => cursos.find(c => 'C' + c.id === String(id || '').toUpperCase()) || null;
    const alumno = p => ({ alumno_id: p.id, nombre: `${p.nombres} ${p.apellidos || ''}`.trim() });
    const notaOk = v => a.escala === 'vigesimal' ? (() => { const n = parseFloat(String(v).replace(',', '.')); return n >= 0 && n <= 20 ? String(Math.round(n * 10) / 10) : null; })() : (['AD', 'A', 'B', 'C'].includes(String(v).toUpperCase().trim()) ? String(v).toUpperCase().trim() : null);
    const fechaOk = f => /^\d{4}-\d{2}-\d{2}$/.test(f || '') ? f : fecha;
    const r = { fecha, asistencia: [], demas_presentes: !!x.demas_presentes, notas: [], bitacora: [], tareas: [], dudas: (x.dudas || []).map(d => limpio(d, 160)).slice(0, 10) };
    const vistos = new Set();
    for (const s of x.asistencia || []) { const p = porCod[s.a]; if (p && ['P', 'T', 'F', 'J'].includes(s.estado) && !vistos.has(p.id)) { vistos.add(p.id); r.asistencia.push({ ...alumno(p), estado: s.estado }); } }
    for (const n of x.notas || []) { const p = porCod[n.a], c = cur(n.curso), v = notaOk(n.valor); if (!p) continue; if (!c || v == null) { r.dudas.push(`Nota de ${p.pila}: ${!c ? 'no entendí el curso' : 'el valor «' + limpio(n.valor, 10) + '» no es válido'}`); continue; } r.notas.push({ ...alumno(p), curso_id: c.id, curso: c.nombre, evaluacion: limpio(n.evaluacion, 80) || 'Evaluación dictada', valor: v }); }
    for (const b of x.bitacora || []) { const p = porCod[b.a]; if (p && String(b.texto || '').trim()) r.bitacora.push({ ...alumno(p), tipo: ['conducta', 'académica', 'salud', 'logro', 'otro'].includes(b.tipo) ? b.tipo : 'otro', texto: limpio(b.texto, 600), visible_padre: b.tipo === 'salud' ? false : b.visible_padre !== false }); }
    for (const t of x.tareas || []) { if (!String(t.titulo || '').trim()) continue; const c = cur(t.curso); r.tareas.push({ curso_id: c?.id || null, curso: c?.nombre || '', titulo: limpio(t.titulo, 100), descripcion: limpio(t.descripcion, 800), entrega: fechaOk(t.entrega) }); }
    r.presentes = r.demas_presentes ? P.filter(p => !vistos.has(p.id)).length : 0;
    return r;
  }

  const api = {};
  api['POST /api/dictado/interpretar'] = async ({ u, b }) => {
    const a = aulaDe(u, b.aula_id); if (!a) throw 403; if (limite(u.id)) throw 'Usaste muchos dictados hoy. Intenta mañana.';
    const texto = String(b.texto || '').replace(/[<>]/g, '').trim().slice(0, 5000); if (texto.length < 4) throw 'Dicta o escribe lo que pasó en clase';
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : hoy(), P = padron(a), cursos = q('select id, nombre from cursos where aula_id=? order by id', a.id);
    if (!P.length) throw 'Primero agrega a tus alumnos en esta aula';
    let x, motor = 'ia';
    if (E.AULA_SF_URL && E.AULA_IA_TOKEN) { try { x = await conIA(a, P, cursos, texto, fecha); } catch (e) { console.log('[ProfeTok] Dictado sin IA: ' + e.message); } }
    if (!x) { x = sinIA(a, P, cursos, texto); motor = 'basico'; }
    return { ...ordenar(a, P, cursos, x, fecha), motor };
  };
  // guarda la propuesta revisada por el docente, usando las mismas reglas y permisos de siempre
  api['POST /api/dictado/guardar'] = async ({ u, b }) => {
    const a = aulaDe(u, b.aula_id); if (!a) throw 403; const fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : hoy(), hechos = { asistencia: 0, notas: 0, bitacora: 0, tareas: 0 };
    const marcas = {}; for (const s of b.asistencia || []) marcas[+s.alumno_id] = s.estado;
    if (b.demas_presentes) for (const x of q('select id from alumnos where aula_id=?', a.id)) if (!(x.id in marcas)) marcas[x.id] = 'P';
    if (Object.keys(marcas).length) { await API['POST /api/asistencia']({ u, b: { aula_id: a.id, fecha, marcas } }); hechos.asistencia = Object.keys(marcas).length; }
    const grupos = {}; for (const n of b.notas || []) (grupos[n.curso_id + '|' + (n.evaluacion || 'Evaluación dictada')] ||= []).push(n);
    for (const [k, lista] of Object.entries(grupos)) { const [cid, titulo] = [+k.split('|')[0], k.split('|').slice(1).join('|')];
      if (!q1('select 1 from cursos where id=? and aula_id=?', cid, a.id)) continue;
      const ev = q1('select id from evaluaciones where aula_id=? and curso_id=? and titulo=? and fecha=?', a.id, cid, limpio(titulo, 80), fecha)?.id || (await API['POST /api/evaluacion']({ u, b: { aula_id: a.id, curso_id: cid, titulo, fecha } })).id;
      await API['POST /api/notas']({ u, b: { aula_id: a.id, notas: lista.map(n => ({ evaluacion_id: ev, alumno_id: +n.alumno_id, valor: n.valor })) } }); hechos.notas += lista.length; }
    for (const i of b.bitacora || []) { if (!q1('select 1 from alumnos where id=? and aula_id=?', +i.alumno_id, a.id)) continue; await API['POST /api/incidencia']({ u, b: { alumno_id: +i.alumno_id, tipo: i.tipo, descripcion: i.texto, fecha, visible_padre: i.visible_padre !== false } }); hechos.bitacora++; }
    for (const t of b.tareas || []) { await API['POST /api/tarea']({ u, b: { aula_id: a.id, curso_id: t.curso_id, titulo: t.titulo, descripcion: t.descripcion, entrega: t.entrega } }); hechos.tareas++; }
    return hechos;
  };
  return { API: api };
}
module.exports = { crear };
