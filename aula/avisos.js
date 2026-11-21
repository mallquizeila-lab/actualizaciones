// 🔔 Avisos a las familias: notas, exámenes corregidos, logros, observaciones y faltas, al celular de los padres.
// Palabras cuidadas: se celebra lo bueno y, cuando hace falta más apoyo, se dice con cariño y sin etiquetas
// (nunca «mala nota», «desaprobó», «deficiente» ni «bajo»). Stickers animados de Libretín según el tono.
// No molesta: junta varias novedades en un solo aviso, respeta el horario de silencio (21:00 a 7:00) y cada familia elige qué recibir.
// Privacidad: las observaciones de conducta nunca muestran el texto en la pantalla bloqueada, solo «hay una nota nueva».
function crear({ db, q, q1, run, hoy, pushUsuario }) {
  db.exec(`create table if not exists avisos (id integer primary key, padre_id integer, alumno_id integer, tipo text, nivel text, titulo text, cuerpo text, detalle text, url text, clave text unique, creado text default (datetime('now')), enviado text, leido text);
  create table if not exists avisos_pref (usuario_id integer primary key, prefs text);
  create index if not exists av_p on avisos(padre_id, id); create index if not exists av_env on avisos(enviado);`);
  const PREF0 = { notas: true, examenes: true, logros: true, observaciones: true, asistencia: true, mensajes: true, silencio: true };
  const prefs = uid => ({ ...PREF0, ...(JSON.parse(q1('select prefs from avisos_pref where usuario_id=?', uid)?.prefs || '{}')) });
  const pila = n => String(n || '').trim().split(/\s+/)[0] || 'tu hijo(a)';
  const nivelDe = (escala, v) => { const s = String(v || '').toUpperCase().trim(); if (escala === 'vigesimal') { const n = parseFloat(s); return isNaN(n) ? null : n >= 18 ? 'destacado' : n >= 14 ? 'logrado' : n >= 11 ? 'proceso' : 'inicio'; } return { AD: 'destacado', A: 'logrado', B: 'proceso', C: 'inicio' }[s] || null; };
  // ideas para casa (sin culpar a nadie) según el área
  const IDEAS = [[/matem/i, ['Jueguen a contar o repartir cosas reales: frutas, monedas o juguetes.', 'Pídele que te explique cómo resolvió un ejercicio: enseñar ayuda a aprender.', '10 a 15 minutos diarios de práctica rinden más que una hora de golpe.']],
    [/comunic|lectura|ingl/i, ['Lean juntos 15 minutos al día y conversen sobre la historia.', 'Pídele que te cuente con sus palabras lo que leyó.', 'Celebra cada avance, por pequeño que sea.']],
    [/./, ['Pregúntale con calma qué le pareció difícil y escúchalo sin juzgar.', 'Arma un horario corto de repaso, con pausas.', 'Si quieres, escríbele a la docente para coordinar cómo apoyarlo juntos.']]];
  const ideas = curso => (IDEAS.find(([re]) => re.test(curso || '')) || IDEAS[2])[1];

  // mensajes según el tipo y el nivel (cuidando las palabras)
  function mensaje(tipo, d) {
    const n = pila(d.alumno), c = d.curso ? ` en ${d.curso}` : '', ev = d.evaluacion ? ` (${d.evaluacion})` : '';
    if (tipo === 'nota' || tipo === 'examen') {
      const extra = tipo === 'examen' ? ' Ya puedes ver su examen corregido.' : '';
      switch (d.nivel) {
        case 'destacado': return { sticker: 'felicita', titulo: '🎉 ¡Felicitaciones, familia!', cuerpo: `${n} obtuvo ${d.valor}${c}${ev}. ¡Es un logro destacado! Celébrenlo juntos 💙${extra}` };
        case 'logrado': return { sticker: 'felicita', titulo: `🌟 ¡Muy bien, ${n}!`, cuerpo: `${n} alcanzó ${d.valor}${c}${ev}. Va por muy buen camino: su esfuerzo se nota. ¡Sigan así!${extra}` };
        case 'proceso': return { sticker: 'animo', titulo: `📘 ${n} sigue avanzando`, cuerpo: `${n} obtuvo ${d.valor}${c}${ev}: está en proceso de lograrlo. Un ratito de práctica juntos en casa le ayudará mucho 💪${extra}`, ideas: ideas(d.curso) };
        case 'inicio': return { sticker: 'apoyo', titulo: `🤝 Acompañemos a ${n}`, cuerpo: `${n} obtuvo ${d.valor}${c}${ev}. Está empezando a desarrollar este aprendizaje y, con tu apoyo y el de su docente, lo va a lograr. ¡Cada paso cuenta! 💙${extra}`, ideas: ideas(d.curso) };
        default: return { sticker: 'info', titulo: `📚 Nueva nota de ${n}`, cuerpo: `${n} tiene una nueva nota${c}${ev}: ${d.valor}.${extra}` };
      }
    }
    if (tipo === 'logro') return { sticker: 'logro', titulo: `🌟 ¡Una gran noticia sobre ${n}!`, cuerpo: d.texto || `${n} tuvo un logro hoy en clase.` };
    if (tipo === 'observacion') return { sticker: 'info', titulo: `📒 Nota de la docente sobre ${n}`, cuerpo: 'La docente dejó una nota nueva. Puedes leerla con calma en ProfeTok.', privado: true };
    if (tipo === 'evento') return { sticker: 'info', titulo: `📅 ${d.titulo}`, cuerpo: `Te esperamos el ${new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}${d.hora ? ' a las ' + d.hora : ''}. Confirma si podrás asistir en ProfeTok 💙` };
    if (tipo === 'respuesta') return { sticker: 'info', titulo: '💬 La docente te respondió', cuerpo: `Tienes una respuesta sobre ${n}. Léela en ProfeTok.`, privado: true };
    if (tipo === 'justificacion') return d.aprobada ? { sticker: 'info', titulo: '✅ Falta justificada', cuerpo: `La docente aceptó la justificación de ${n} del ${d.fecha}. ¡Gracias por avisar!` } : { sticker: 'info', titulo: `📝 Sobre la falta de ${n}`, cuerpo: 'La docente revisó tu justificación. Si tienes dudas, escríbele desde ProfeTok.' };
    if (tipo === 'falta') return { sticker: 'info', titulo: `📅 Asistencia de ${n}`, cuerpo: `Hoy no registramos la asistencia de ${n} en clase. Si ya lo sabías, no te preocupes 🙂` };
    return null;
  }
  const PREF_DE = { nota: 'notas', examen: 'examenes', logro: 'logros', observacion: 'observaciones', falta: 'asistencia', respuesta: 'mensajes', justificacion: 'asistencia', evento: 'mensajes' };

  // encola el aviso para cada familia del alumno (una sola vez por clave)
  function encolar(tipo, alumnoId, d, clave, soloPadre) {
    const al = q1('select a.id, a.nombres, x.escala from alumnos a join aulas x on x.id=a.aula_id where a.id=?', +alumnoId); if (!al) return 0;
    const nivel = d.nivel || (d.valor != null ? nivelDe(al.escala, d.valor) : null), m = mensaje(tipo, { ...d, nivel, alumno: al.nombres }); if (!m) return 0;
    let n = 0;
    for (const p of q("select u.id from familia f join usuarios u on u.id=f.padre_id where f.alumno_id=? and u.rol='padre' and u.activo=1", al.id)) {
      if (soloPadre && p.id !== +soloPadre) continue; if (!prefs(p.id)[PREF_DE[tipo]]) continue;
      try { run('insert into avisos(padre_id, alumno_id, tipo, nivel, titulo, cuerpo, detalle, url, clave) values(?,?,?,?,?,?,?,?,?)', p.id, al.id, tipo, nivel, m.titulo, m.cuerpo, JSON.stringify({ sticker: m.sticker, ideas: m.ideas || null, privado: !!m.privado, mejorar: d.mejorar || null }), `/#/novedades`, `${p.id}|${clave || tipo + '|' + al.id + '|' + Date.now()}`); n++; } catch (e) {} // clave repetida: ya se avisó
    }
    return n;
  }

  // envío: espera 2 minutos para juntar novedades, respeta el horario de silencio y manda UN aviso por familia
  const horaLima = () => new Date(Date.now() - 5 * 3600e3).getUTCHours();
  let enviando = false;
  async function enviar() {
    if (enviando) return; enviando = true;
    try {
      const pend = q("select * from avisos where enviado is null and creado <= datetime('now','-' || ? || ' seconds') order by id limit 500", +(process.env.AULA_AVISOS_ESPERA ?? 120)), porPadre = {};
      for (const a of pend) (porPadre[a.padre_id] ||= []).push(a);
      for (const [pid, lista] of Object.entries(porPadre)) {
        const h = horaLima(); if (prefs(+pid).silencio && (h >= 21 || h < 7)) continue; // de noche: se manda a las 7 a. m.
        const orden = ['felicita', 'logro', 'animo', 'apoyo', 'info'], st = lista.map(a => JSON.parse(a.detalle || '{}').sticker).sort((x, y) => orden.indexOf(x) - orden.indexOf(y))[0] || 'info';
        let titulo, cuerpo;
        if (lista.length === 1) { const a = lista[0], d = JSON.parse(a.detalle || '{}'); titulo = a.titulo; cuerpo = d.privado ? 'Tienes una novedad nueva en ProfeTok.' : a.cuerpo; }
        else { const nombres = [...new Set(lista.map(a => pila(q1('select nombres from alumnos where id=?', a.alumno_id)?.nombres)))]; titulo = st === 'felicita' || st === 'logro' ? `🎉 ¡Buenas noticias de ${nombres.join(' y ')}!` : `📚 ${lista.length} novedades de ${nombres.join(' y ')}`; cuerpo = 'Toca para verlas en ProfeTok 💙'; }
        await pushUsuario(+pid, { title: titulo, body: cuerpo, url: '/#/novedades', icon: '/icono-192.png', image: `/stickers/${st}.png`, tag: 'profetok-familia', vibrate: [120, 80, 120, 80, 320] }).catch(() => {});
        run(`update avisos set enviado=datetime('now') where id in (${lista.map(a => a.id).join(',')})`);
      }
    } finally { enviando = false; }
  }
  setInterval(() => enviar().catch(e => console.log('[ProfeTok] Avisos: ' + e.message)), +(process.env.AULA_AVISOS_CADA || 60000)).unref(); // (las variables solo se usan en pruebas)

  const API = {};
  API['GET /api/avisos'] = async ({ u }) => { if (!['padre', 'alumno'].includes(u.rol)) return { avisos: [], noLeidos: 0, prefs: PREF0 };
    return { avisos: q('select a.*, al.nombres alumno from avisos a join alumnos al on al.id=a.alumno_id where a.padre_id=? order by a.id desc limit 60', u.id).map(a => ({ ...a, detalle: JSON.parse(a.detalle || '{}') })),
      noLeidos: q1('select count(*) n from avisos where padre_id=? and leido is null', u.id).n, prefs: prefs(u.id) }; };
  API['POST /api/avisos/leido'] = async ({ u, b }) => { if (b.todos) run("update avisos set leido=datetime('now') where padre_id=? and leido is null", u.id); else run("update avisos set leido=datetime('now') where id=? and padre_id=?", +b.id, u.id); return { ok: 1 }; };
  API['POST /api/avisos/prefs'] = async ({ u, b }) => { const p = Object.fromEntries(Object.keys(PREF0).map(k => [k, b[k] !== false])); run('insert into avisos_pref(usuario_id, prefs) values(?,?) on conflict(usuario_id) do update set prefs=excluded.prefs', u.id, JSON.stringify(p)); return { prefs: p }; };
  return { API, encolar, enviar, nivelDe, mensaje };
}
module.exports = { crear };
