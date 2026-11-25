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
  db.exec(`create table if not exists int_muros(
    id integer primary key autoincrement,
    usuario_id integer not null,
    token text not null,
    titulo text not null default 'Mi muro',
    descripcion text default '',
    fondo text default 'grad1',
    creado text, actualizado text
  )`);
  db.exec(`create table if not exists int_posts(
    id integer primary key autoincrement,
    muro_id integer not null,
    autor text default '',
    texto text default '',
    img text default '',
    color text default '#fde68a',
    creado text
  )`);
  try { db.exec('create index if not exists ix_intmuro_user on int_muros(usuario_id)'); db.exec('create index if not exists ix_intpost_muro on int_posts(muro_id)'); } catch (e) {}

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

  // 🎨 Diseña con IA (Libretín): el docente escribe un tema y Libretín propone el diseño completo (formato, título, textos, emoji)
  API['POST /api/tic/diseno-ia'] = async ({ u, b }) => {
    if (!puede(u)) throw 403;
    if (tope(u.id, 60)) throw 'Alcanzaste el límite de ayudas de hoy. Vuelve mañana.';
    const tema = limpio(b.tema, 300);
    if (!tema) throw 'Escribe un tema o idea para el diseño.';
    if (!(E.AULA_SF_URL && E.AULA_IA_TOKEN)) return { aviso: 'El diseñador con IA aún no está activado. Puedes elegir una plantilla y escribir el texto a mano.' };
    const sistema = `Eres «Libretín», diseñador para docentes del Perú. A partir de un tema, propones un diseño escolar breve y bonito.
Responde ÚNICAMENTE con un objeto JSON válido (sin texto antes ni después, sin comillas de código) con EXACTAMENTE estas claves:
"tipo": uno de "cartel", "diploma", "portada", "frase", "felicitacion";
"titulo": título corto en MAYÚSCULAS si es cartel (máx 40 caracteres);
"subtitulo": frase de apoyo (máx 60 caracteres, puede ir vacío);
"cuerpo": una línea opcional (máx 110 caracteres, puede ir vacío);
"emoji": un solo emoji que represente el tema.
Español del Perú. No inventes datos de personas. No agregues nada fuera del JSON.`;
    const txt = await ia([{ role: 'system', content: sistema }, { role: 'user', content: 'Tema: ' + tema }], 500);
    let d = null;
    try { const m = String(txt || '').match(/\{[\s\S]*\}/); d = m ? JSON.parse(m[0]) : null; } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = { tipo: 'cartel', titulo: tema.slice(0, 40).toUpperCase(), subtitulo: '', cuerpo: '', emoji: '📌' };
    const tipos = ['cartel', 'diploma', 'portada', 'frase', 'felicitacion'];
    return {
      diseno: {
        tipo: tipos.includes(d.tipo) ? d.tipo : 'cartel',
        titulo: limpio(d.titulo, 60) || tema.slice(0, 40),
        subtitulo: limpio(d.subtitulo, 90),
        cuerpo: limpio(d.cuerpo, 160),
        emoji: (String(d.emoji || '📌').match(/\p{Extended_Pictographic}/u) || ['📌'])[0]
      }
    };
  };

  // ===== 📌 Muro Digital (estilo Padlet): tarjetas con texto, color e imagen; enlace público para compartir =====
  const nuevoToken = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const MAX_IMG = 1.2e6;
  const puedeMuro = m => m; // (reservado)

  API['GET /api/tic/muros'] = async ({ u }) => {
    if (!puede(u)) throw 403;
    return { items: q('select id,titulo,descripcion,token,actualizado from int_muros where usuario_id=? order by actualizado desc', u.id).map(m => ({ id: m.id, titulo: m.titulo, descripcion: m.descripcion, token: m.token, actualizado: m.actualizado, posts: q1('select count(*) n from int_posts where muro_id=?', m.id).n })) };
  };
  API['GET /api/tic/muro'] = async ({ u, url }) => {
    if (!puede(u)) throw 403;
    const m = q1('select * from int_muros where id=? and usuario_id=?', +url.searchParams.get('id') || 0, u.id);
    if (!m) throw 404;
    return { muro: { id: m.id, titulo: m.titulo, descripcion: m.descripcion, fondo: m.fondo, token: m.token }, posts: q('select id,autor,texto,img,color,creado from int_posts where muro_id=? order by id', m.id) };
  };
  API['POST /api/tic/muro-guardar'] = async ({ u, b }) => {
    if (!puede(u)) throw 403;
    const titulo = limpio(b.titulo, 80) || 'Mi muro', desc = limpio(b.descripcion, 200), fondo = limpio(b.fondo, 20) || 'grad1', t = new Date().toISOString();
    if (b.id) { const m = q1('select id from int_muros where id=? and usuario_id=?', +b.id, u.id); if (!m) throw 404; run('update int_muros set titulo=?,descripcion=?,fondo=?,actualizado=? where id=?', titulo, desc, fondo, t, m.id); return { id: m.id }; }
    if (q1('select count(*) n from int_muros where usuario_id=?', u.id).n >= 100) throw 'Llegaste al máximo de muros.';
    const tok = nuevoToken();
    run('insert into int_muros(usuario_id,token,titulo,descripcion,fondo,creado,actualizado) values(?,?,?,?,?,?,?)', u.id, tok, titulo, desc, fondo, t, t);
    return { id: q1('select last_insert_rowid() id').id, token: tok };
  };
  API['POST /api/tic/muro-borrar'] = async ({ u, b }) => {
    if (!puede(u)) throw 403;
    const m = q1('select id from int_muros where id=? and usuario_id=?', +b.id || 0, u.id);
    if (m) { run('delete from int_posts where muro_id=?', m.id); run('delete from int_muros where id=?', m.id); }
    return { ok: 1 };
  };
  API['POST /api/tic/post'] = async ({ u, b }) => {
    if (!puede(u)) throw 403;
    const m = q1('select id from int_muros where id=? and usuario_id=?', +b.muro_id || 0, u.id);
    if (!m) throw 404;
    const texto = limpio(b.texto, 1200), color = limpio(b.color, 16) || '#fde68a';
    let img = ''; if (b.img && /^data:image\/(png|jpeg|webp);base64,/.test(b.img)) { if (b.img.length > MAX_IMG) throw 'La imagen pesa mucho.'; img = b.img; }
    if (!texto && !img) throw 'Escribe algo o agrega una imagen.';
    if (b.id) { const p = q1('select id from int_posts where id=? and muro_id=?', +b.id, m.id); if (!p) throw 404; if (img) run('update int_posts set texto=?,color=?,img=? where id=?', texto, color, img, p.id); else run('update int_posts set texto=?,color=? where id=?', texto, color, p.id); return { id: p.id }; }
    if (q1('select count(*) n from int_posts where muro_id=?', m.id).n >= 300) throw 'Este muro llegó al máximo de tarjetas.';
    run('insert into int_posts(muro_id,autor,texto,img,color,creado) values(?,?,?,?,?,?)', m.id, limpio(u.nombre || '', 40), texto, img, color, new Date().toISOString());
    run('update int_muros set actualizado=? where id=?', new Date().toISOString(), m.id);
    return { id: q1('select last_insert_rowid() id').id };
  };
  API['POST /api/tic/post-borrar'] = async ({ u, b }) => {
    if (!puede(u)) throw 403;
    const p = q1('select p.id from int_posts p join int_muros m on m.id=p.muro_id where p.id=? and m.usuario_id=?', +b.id || 0, u.id);
    if (p) run('delete from int_posts where id=?', p.id);
    return { ok: 1 };
  };
  // público (sin login): ver un muro por su token (solo lectura)
  API['GET /api/tic/muro-publico'] = async ({ url }) => {
    const m = q1('select * from int_muros where token=?', String(url.searchParams.get('t') || '').slice(0, 60));
    if (!m) throw 404;
    return { muro: { titulo: m.titulo, descripcion: m.descripcion, fondo: m.fondo }, posts: q('select autor,texto,img,color,creado from int_posts where muro_id=? order by id', m.id) };
  };

  // 📋 Mis aulas con los nombres de pila de los alumnos (para la ruleta y el armador de grupos).
  // Es la propia data del docente; solo nombre + inicial del apellido; NUNCA se envía a ninguna IA.
  API['GET /api/tic/alumnos'] = async ({ u }) => {
    if (!puede(u)) throw 403;
    const aulas = u.rol === 'director' ? q('select id,nombre from aulas where colegio_id=? order by id', u.colegio_id)
      : u.rol === 'dueno' ? q('select id,nombre from aulas order by id')
        : q('select id,nombre from aulas where docente_id=? order by id', u.id);
    return {
      aulas: aulas.map(a => ({
        id: a.id, nombre: a.nombre,
        alumnos: q('select nombres,apellidos from alumnos where aula_id=? order by apellidos,nombres', a.id).map(x => {
          const pila = String(x.nombres || '').trim().split(/\s+/)[0] || 'Alumno', ini = (String(x.apellidos || '').trim()[0] || '').toUpperCase();
          return pila + (ini ? ' ' + ini + '.' : '');
        })
      }))
    };
  };

  // rutas que funcionan sin plan (gratis), para que server.js las marque libres de membresía
  const SINPLAN = ['POST /api/tic/guardar', 'POST /api/tic/borrar', 'POST /api/tic/duplicar', 'POST /api/tic/asistente', 'POST /api/tic/diseno-ia', 'POST /api/tic/muro-guardar', 'POST /api/tic/muro-borrar', 'POST /api/tic/post', 'POST /api/tic/post-borrar'];
  return { API, SINPLAN };
}
module.exports = { crear };
