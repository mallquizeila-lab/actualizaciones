// 🧰 Herramientas TIC para docente (ProfeTok Interactivo).
// Por ahora: la PIZARRA MÁGICA y el ESTUDIO DE DISEÑO (reemplazo libre de Canva), ambos con el MISMO motor de
// Canvas propio (sin librerías externas, offline-first), y un ASISTENTE que reutiliza la IA de Libretín.
// GRATIS: estas rutas se agregan a ESCRIBE_SIN_PLAN en server.js, así cualquier docente las usa aunque no tenga plan
// (la idea es captar gente). Guarda cada trabajo como JSON por usuario; nada se expone a otros.
// Privacidad (Ley 29733): al asistente solo va el texto del tema que el docente escribe, nunca datos de alumnos.
function crear({ db, q, q1, run, hoy, limpio, E }) {
  db.exec(`create table if not exists int_pizarras(
    id integer primary key autoincrement,
    usuario_id integer not null,
    tipo text not null default 'pizarra',   -- 'pizarra' | 'diseno'
    titulo text not null default 'Sin título',
    datos text not null default '{}',        -- {bg, w, h, objs:[...]} en JSON
    creado text, actualizado text
  )`);
  try { db.exec('create index if not exists ix_intpiz_user on int_pizarras(usuario_id, tipo)'); } catch (e) {}

  const API = {};
  const puede = u => ['docente', 'director', 'dueno'].includes(u.rol);
  const MAX_DATOS = 3.6e6; // ~3.6 MB por trabajo (protege el disco del VPS)

  // límite suave del asistente por usuario y día
  const LIM = new Map();
  const tope = (uid, max) => { const k = uid + '|' + hoy(), n = (LIM.get(k) || 0) + 1; LIM.set(k, n); if (LIM.size > 5000) LIM.clear(); return n > max; };

  const fila = r => ({ id: r.id, tipo: r.tipo, titulo: r.titulo, actualizado: r.actualizado });

  API['GET /api/tic/pizarras'] = async ({ u, url }) => {
    if (!puede(u)) throw 403;
    const tipo = url.searchParams.get('tipo');
    const rows = tipo
      ? q('select id,tipo,titulo,actualizado from int_pizarras where usuario_id=? and tipo=? order by actualizado desc', u.id, tipo === 'diseno' ? 'diseno' : 'pizarra')
      : q('select id,tipo,titulo,actualizado from int_pizarras where usuario_id=? order by actualizado desc', u.id);
    return { items: rows.map(fila) };
  };

  API['GET /api/tic/pizarra'] = async ({ u, url }) => {
    if (!puede(u)) throw 403;
    const r = q1('select * from int_pizarras where id=? and usuario_id=?', +url.searchParams.get('id') || 0, u.id);
    if (!r) throw 404;
    let datos = {}; try { datos = JSON.parse(r.datos); } catch (e) {}
    return { id: r.id, tipo: r.tipo, titulo: r.titulo, datos };
  };

  API['POST /api/tic/guardar'] = async ({ u, b }) => {
    if (!puede(u)) throw 403;
    const tipo = b.tipo === 'diseno' ? 'diseno' : 'pizarra';
    const titulo = limpio(b.titulo, 80) || 'Sin título';
    const datos = typeof b.datos === 'string' ? b.datos : JSON.stringify(b.datos || {});
    if (datos.length > MAX_DATOS) throw 'El trabajo pesa demasiado. Usa menos imágenes o más livianas.';
    try { JSON.parse(datos); } catch (e) { throw 'Datos no válidos'; }
    const t = new Date().toISOString();
    if (b.id) {
      const r = q1('select id from int_pizarras where id=? and usuario_id=?', +b.id, u.id);
      if (!r) throw 404;
      run('update int_pizarras set titulo=?, datos=?, actualizado=? where id=?', titulo, datos, t, r.id);
      return { id: r.id };
    }
    // tope anti-abuso: máximo 300 trabajos por usuario
    if (q1('select count(*) n from int_pizarras where usuario_id=?', u.id).n >= 300) throw 'Llegaste al máximo de trabajos guardados. Borra alguno para crear otro.';
    run('insert into int_pizarras(usuario_id,tipo,titulo,datos,creado,actualizado) values(?,?,?,?,?,?)', u.id, tipo, titulo, datos, t, t);
    return { id: q1('select last_insert_rowid() id').id };
  };

  API['POST /api/tic/borrar'] = async ({ u, b }) => {
    if (!puede(u)) throw 403;
    run('delete from int_pizarras where id=? and usuario_id=?', +b.id || 0, u.id);
    return { ok: 1 };
  };

  API['POST /api/tic/duplicar'] = async ({ u, b }) => {
    if (!puede(u)) throw 403;
    const r = q1('select * from int_pizarras where id=? and usuario_id=?', +b.id || 0, u.id);
    if (!r) throw 404;
    if (q1('select count(*) n from int_pizarras where usuario_id=?', u.id).n >= 300) throw 'Llegaste al máximo de trabajos guardados.';
    const t = new Date().toISOString();
    run('insert into int_pizarras(usuario_id,tipo,titulo,datos,creado,actualizado) values(?,?,?,?,?,?)', u.id, r.tipo, (r.titulo + ' (copia)').slice(0, 80), r.datos, t, t);
    return { id: q1('select last_insert_rowid() id').id };
  };

  // 🤖 Asistente: ayuda a preparar contenido para la pizarra/diseño. Solo texto del tema (nunca datos de alumnos).
  async function ia(messages, max = 1200) {
    if (!(E.AULA_SF_URL && E.AULA_IA_TOKEN)) return null;
    const r = await fetch(E.AULA_SF_URL + '/api/libretin-ia', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sf-token': E.AULA_IA_TOKEN }, body: JSON.stringify({ messages, max }), signal: AbortSignal.timeout(120000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error || !j.text) throw new Error(j.error || 'La IA no respondió. Intenta de nuevo en un momento.');
    return j.text;
  }

  API['POST /api/tic/asistente'] = async ({ u, b }) => {
    if (!puede(u)) throw 403;
    if (tope(u.id, 60)) throw 'Alcanzaste el límite de ayudas de hoy. Vuelve mañana.';
    const tema = limpio(b.tema, 400);
    if (!tema) throw 'Escribe un tema o una instrucción.';
    const modo = ['ideas', 'esquema', 'pasos', 'preguntas', 'texto'].includes(b.modo) ? b.modo : 'ideas';
    if (!(E.AULA_SF_URL && E.AULA_IA_TOKEN)) return { texto: '', aviso: 'El asistente con IA aún no está activado. El docente puede escribir el contenido a mano; todo lo demás funciona.' };
    const guia = {
      ideas: 'Da entre 5 y 8 ideas o puntos breves, uno por línea, sin numerar, listos para pegar en una pizarra.',
      esquema: 'Devuelve un esquema jerárquico simple (tema central y ramas) en texto, una idea por línea, usando guiones para las ramas. Pensado para un mapa conceptual.',
      pasos: 'Explica el procedimiento en pasos cortos y numerados, claros para estudiantes.',
      preguntas: 'Crea entre 5 y 8 preguntas de repaso, una por línea.',
      texto: 'Escribe un texto corto y claro (máximo 120 palabras) para mostrar en una lámina.'
    }[modo];
    const sistema = `Eres «Libretín», asistente pedagógico de un(a) docente del Perú (CNEB). Respondes en español de Perú, claro y práctico. ${guia} No incluyas introducciones ni despedidas; solo el contenido pedido.`;
    const texto = await ia([{ role: 'system', content: sistema }, { role: 'user', content: tema }], 1000);
    return { texto: String(texto || '').trim() };
  };

  // rutas que funcionan sin plan (gratis), para que server.js las marque libres de membresía
  const SINPLAN = ['POST /api/tic/guardar', 'POST /api/tic/borrar', 'POST /api/tic/duplicar', 'POST /api/tic/asistente'];
  return { API, SINPLAN };
}
module.exports = { crear };
