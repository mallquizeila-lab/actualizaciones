// 🎓 Agente de la Academy: escribe cuentos interactivos nuevos para yupitok.com/academia/cuentos.
// Flujo: Redactor (IA) → revisiones automáticas → Supervisor (OTRA IA, con rúbrica de 0 a 100) → corrección (máx. 2) → tu cola "Por aprobar".
// Nada se publica sin que tú lo apruebes. Lo que rechazas (con su motivo) se recuerda para no repetir el error.
const fs = require('fs'), path = require('path');
const { DATA, uid, parseJSON, day } = require('./util');
const FILE = path.join(DATA, 'academia-agente.json');
const A = (() => { try { return Object.assign({ cola: [], memoria: [], auto: 0, pausa: false }, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) { return { cola: [], memoria: [], auto: 0, pausa: false }; } })();
const guardar = () => { A.cola = A.cola.slice(-60); A.memoria = A.memoria.slice(-30); fs.writeFileSync(FILE, JSON.stringify(A, null, 1)); };
const V = () => require('./viral');

const TEMAS = { 'ciencia-curiosa': 'Ciencia', 'programa-con-yupi': 'Programación', 'ingles-con-yupi': 'Inglés', 'mates-divertidas': 'Mates', 'finanzas-personales': 'Valores' };
const PERSONAJES = 'Yupi (niño alegre y curioso), Lulú (llama viajera y amable), Choki (choclo guerrero y cocinero), Coquito (coco pequeño y tierno), Yupi-bot (robot obediente que dice «bip») y el Sabio Búho (maestro sabio)';
const PROHIBIDO = /(https?:\/\/|www\.|@\w|\b\d{7,}\b|sangre|matar|muert|\barmas?\b|pistola|droga|alcohol|cerveza|cigarr|apuesta|casino|novi[oa]s?\b|beso|odio|estúpid|idiota|tont[oa]\b|gord[oa]\b|feo\b|dieta)/i;
const RUBRICA = [['exactitud', 'Lo que enseña es correcto (ciencia, inglés, mates, etc.)', 25], ['edad', 'Vocabulario y frases adecuados para la edad', 20], ['coherencia', 'La historia tiene sentido, sigue el tema y respeta a los personajes', 15], ['seguridad', 'Sin miedo intenso, violencia, burlas, estereotipos ni presión para comprar', 15], ['diversion', 'Es divertida, con decisiones interesantes y finales que enseñan', 15], ['claridad', 'Las preguntas finales tienen una sola respuesta correcta y clara', 10]];

const slugDe = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const palabras = t => String(t).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

// ---------- Revisiones automáticas (sin IA) ----------
function revisarAuto(c, edad) {
  const err = [];
  if (!c || typeof c !== 'object') return ['No llegó un cuento en formato válido'];
  if (!c.titulo || String(c.titulo).length > 60) err.push('Falta el título o es muy largo');
  if (!c.resumen || String(c.resumen).length > 200) err.push('Falta el resumen o pasa de 200 letras');
  const P = c.paginas && typeof c.paginas === 'object' ? c.paginas : null; if (!P) return [...err, 'Faltan las páginas'];
  const ids = Object.keys(P); if (!P[c.inicio]) err.push('La página de inicio no existe');
  if (ids.length < 5 || ids.length > 10) err.push(`Debe tener entre 5 y 10 páginas (tiene ${ids.length})`);
  let fines = 0, decis = 0, total = 0;
  for (const [k, p] of Object.entries(P)) {
    const n = palabras(p.t || ''); total += n; if (!p.t) err.push(`La página ${k} no tiene texto`); else if (n > (edad === '6-8' ? 85 : 110)) err.push(`La página ${k} es muy larga (${n} palabras)`);
    if (!p.esc || String(p.esc).length > 24) err.push(`La página ${k} necesita una escena corta de 2 a 4 emojis`);
    if (/<(?!\/?(b|i)>)[^>]*>/i.test(p.t || '')) err.push(`La página ${k} tiene etiquetas no permitidas (solo <b> e <i>)`);
    if (p.fin) { fines++; if (!p.moraleja) err.push(`El final ${k} no tiene moraleja`); }
    else if (Array.isArray(p.opciones) && p.opciones.length) { decis++; if (p.opciones.length !== 2) err.push(`La decisión de ${k} debe tener 2 opciones`); for (const o of p.opciones) if (!P[o.ir]) err.push(`La opción «${o.t}» lleva a una página que no existe`); }
    else if (!P[p.sig]) err.push(`La página ${k} no dice a dónde sigue`);
  }
  if (fines !== 2) err.push(`Debe tener exactamente 2 finales (tiene ${fines})`); if (decis < 2) err.push('Debe tener al menos 2 decisiones');
  // que todas las páginas sean alcanzables y que no haya bucles infinitos sin final
  const vistos = new Set(); (function rec(k, d) { if (!P[k] || vistos.has(k) || d > 20) return; vistos.add(k); if (P[k].sig) rec(P[k].sig, d + 1); (P[k].opciones || []).forEach(o => rec(o.ir, d + 1)); })(c.inicio, 0);
  if (vistos.size !== ids.length) err.push('Hay páginas a las que no se puede llegar');
  if (!Array.isArray(c.preguntas) || c.preguntas.length !== 3) err.push('Deben ser exactamente 3 preguntas del Búho');
  else c.preguntas.forEach((q, i) => { if (!q.p || !Array.isArray(q.ops) || q.ops.length !== 3 || !(q.ok >= 0 && q.ok <= 2) || new Set(q.ops).size !== 3) err.push(`La pregunta ${i + 1} debe tener 3 opciones distintas y una correcta`); });
  const todo = JSON.stringify(c); if (PROHIBIDO.test(todo)) err.push('Tiene palabras o enlaces no permitidos para niños: ' + (todo.match(PROHIBIDO) || [''])[0]);
  if (total < 200) err.push('El cuento es demasiado corto');
  return err;
}

// ---------- Redactor ----------
async function redactar({ tema, curso, edad, idea }, notas, previo) {
  const ai = require('./ai');
  const mem = A.memoria.slice(-12).map(m => '- ' + m).join('\n');
  const p = `Eres un autor experto en literatura infantil y en pedagogía. Escribe un cuento INTERACTIVO original en español latinoamericano para niños de ${edad === '6-8' ? '6 a 8 años (frases muy cortas, palabras sencillas)' : '9 a 12 años (frases claras, puede enseñar un concepto)'}.
Tema educativo: ${tema}${idea ? '. Idea: ' + String(idea).slice(0, 200) : ''}. Debe enseñar algo correcto y verificable del curso "${curso}".
Personajes que puedes usar (solo estos, son propios de Yupitok): ${PERSONAJES}. Escenarios del Perú y Latinoamérica.
Reglas: tono cálido y alegre; sin miedo intenso, violencia, burlas, estereotipos, dietas, romance, marcas ni presión para comprar; un solo mensaje claro; la opción "equivocada" no castiga, enseña con cariño y vuelve al camino.
Estructura: 6 a 8 páginas. Cada página: "esc" (2 a 4 emojis de la escena), "t" (texto de ${edad === '6-8' ? '35 a 70' : '45 a 90'} palabras; solo se permiten <b> e <i>). Una página continúa con "sig" (id de la siguiente), o termina con "opciones" (exactamente 2: {"t":"emoji + acción","ir":"id"}), o es un final con "fin": true y "moraleja" (1 frase). Exactamente 2 finales distintos y al menos 2 decisiones. Ids cortos: p1, p2, p2b, p3, f1, f2…
Al final, 3 preguntas de comprensión con 3 opciones cada una y "ok" = índice (0, 1 o 2) de la correcta.
${mem ? 'Errores que NO debes repetir (los rechazó la persona que revisa):\n' + mem + '\n' : ''}${notas ? 'Corrige esta versión anterior según estas notas del supervisor:\n' + notas + '\nVersión anterior: ' + JSON.stringify(previo).slice(0, 6000) + '\n' : ''}
Devuelve SOLO JSON válido: {"titulo":"…","emoji":"un emoji","resumen":"1 o 2 frases para el lector","inicio":"p1","paginas":{"p1":{"esc":"…","t":"…","sig":"p2"}, …},"preguntas":[{"p":"…","ops":["…","…","…"],"ok":0}]}`;
  const r = await ai.ask(p, { json: true, max: 5000 }); return { c: parseJSON(r.text), proveedor: r.provider };
}
// ---------- Supervisor (otra IA) ----------
async function supervisar(c, { edad, tema }, evitar) {
  const ai = require('./ai');
  const p = `Eres el SUPERVISOR PEDAGÓGICO de Yupitok Academy, exigente y justo. Evalúa este cuento interactivo para niños de ${edad} años (tema: ${tema}).
Puntúa cada criterio de 0 a 10: ${RUBRICA.map(([k, d]) => `"${k}" (${d})`).join(', ')}.
Marca "rojo": true SOLO si hay algo inapropiado o peligroso para niños, o un error de contenido grave.
Da "notas": hasta 5 correcciones concretas y accionables (qué página, qué cambiar), en español. "resumen": 1 frase para el revisor humano.
Cuento: ${JSON.stringify(c).slice(0, 9000)}
Devuelve SOLO JSON: {"puntos":{"exactitud":0,"edad":0,"coherencia":0,"seguridad":0,"diversion":0,"claridad":0},"rojo":false,"notas":["…"],"resumen":"…"}`;
  const r = await ai.ask(p, { json: true, max: 1500, evitar }); const j = parseJSON(r.text) || {};
  const pts = j.puntos || {}, total = Math.round(RUBRICA.reduce((a, [k, , w]) => a + Math.max(0, Math.min(10, +pts[k] || 0)) * w / 10, 0));
  return { total, rojo: !!j.rojo || (+pts.seguridad || 0) < 6, notas: (j.notas || []).slice(0, 5).map(x => String(x).slice(0, 300)), resumen: String(j.resumen || '').slice(0, 300), puntos: pts, proveedor: r.provider };
}

// ---------- Trabajo completo de un cuento ----------
async function crearCuento(o = {}) {
  if (A.pausa) throw new Error('La Academy está en pausa. Reanúdala para crear.');
  const ai = require('./ai'); if (!ai.active().length) throw new Error('Falta una clave de IA en Ajustes');
  const curso = TEMAS[o.curso] ? o.curso : 'ciencia-curiosa', edad = o.edad === '9-12' ? '9-12' : '6-8', tema = String(o.tema || '').slice(0, 80) || TEMAS[curso];
  const it = { id: uid(), tipo: 'cuento', estado: 'trabajando', fase: 'Redactor escribiendo', curso, edad, tema, idea: String(o.idea || '').slice(0, 200), fecha: new Date().toISOString(), log: [] };
  A.cola.push(it); guardar();
  (async () => {
    let c = null, notas = '', sup = null;
    for (let intento = 1; intento <= 3; intento++) {
      it.fase = intento === 1 ? 'Redactor escribiendo' : `Redactor corrigiendo (intento ${intento})`; guardar();
      const r = await redactar({ tema, curso, edad, idea: it.idea }, notas, c); c = r.c; it.redactor = r.proveedor;
      const auto = revisarAuto(c, edad);
      if (auto.length) { it.log.push(`Revisión automática (${intento}): ${auto.slice(0, 4).join('; ')}`); notas = auto.join('\n'); if (intento === 3) throw new Error('No pasó las revisiones automáticas: ' + auto.slice(0, 3).join('; ')); continue; }
      it.fase = 'Supervisor revisando'; guardar();
      sup = await supervisar(c, { edad, tema }, r.proveedor); it.supervisor = sup.proveedor;
      it.log.push(`Supervisor (${intento}): ${sup.total}/100${sup.rojo ? ' · 🔴 rojo' : ''} · ${sup.resumen}`);
      if (sup.total >= 85 && !sup.rojo) break;
      if (sup.total < 60 && sup.rojo) throw new Error(`El supervisor lo descartó (${sup.total}/100): ${sup.notas.slice(0, 2).join('; ')}`);
      if (intento === 3) throw new Error(`No llegó a 85 puntos tras 2 correcciones (${sup.total}/100)`);
      notas = sup.notas.join('\n');
    }
    c.slug = slugDe(c.titulo); c.edad = edad; c.tema = TEMAS[curso]; c.curso = curso; c.min = edad === '6-8' ? 5 : 6;
    Object.assign(it, { estado: 'pendiente', fase: '', cuento: c, nota: sup.total, rubrica: sup.puntos, resumen: sup.resumen, notas: sup.notas }); guardar();
    try { require('./avisos').avisar(`🎓 Nuevo cuento por aprobar: «${c.titulo}» (${sup.total}/100). Revísalo en ShortForge → Centro de Mando → Agente de la Academy.`); } catch (e) {}
  })().catch(e => { Object.assign(it, { estado: 'descartado', fase: '', motivo: String(e.message || e).slice(0, 300) }); guardar(); console.log('[Academy] ' + it.motivo); });
  return it.id;
}

async function accion({ id, accion: a, motivo }) {
  const it = A.cola.find(x => x.id === id); if (!it) throw new Error('No encontrado');
  if (a === 'aprobar') { if (it.estado !== 'pendiente') throw new Error('Solo se aprueba lo que está por aprobar'); const r = await V().admin('academia/cuento', { cuento: it.cuento }); it.estado = 'aprobado'; it.url = r.url; guardar(); return r; }
  if (a === 'rechazar') { const m = String(motivo || '').trim().slice(0, 200); if (!m) throw new Error('Escribe el motivo en una frase: así el agente aprende'); it.estado = 'rechazado'; it.motivo = m; A.memoria.push(`${it.tipo} «${it.cuento?.titulo || it.tema}»: ${m}`); guardar(); return { ok: 1 }; }
  if (a === 'ocultar') { if (it.cuento?.slug) await V().admin('academia/cuento/quitar', { slug: it.cuento.slug }); it.estado = 'oculto'; guardar(); return { ok: 1 }; }
  if (a === 'borrar') { A.cola = A.cola.filter(x => x !== it); guardar(); return { ok: 1 }; }
  throw new Error('Acción no válida');
}
function ajustes(o) { if (o.pausa !== undefined) A.pausa = !!o.pausa; if (o.auto !== undefined) A.auto = Math.max(0, Math.min(3, Math.floor(+o.auto) || 0)); guardar(); }
function estado() {
  const sem = Date.now() - 7 * 864e5, r = A.cola.filter(x => new Date(x.fecha).getTime() >= sem);
  const motivos = {}; for (const x of r.filter(x => x.estado === 'rechazado' || x.estado === 'descartado')) { const m = String(x.motivo || '').split(':')[0].slice(0, 80); motivos[m] = (motivos[m] || 0) + 1; }
  return { cola: A.cola.slice().reverse(), pausa: A.pausa, auto: A.auto, memoria: A.memoria.slice(-10), temas: Object.entries(TEMAS).map(([k, v]) => ({ k, v })),
    semana: { creados: r.length, aprobados: r.filter(x => x.estado === 'aprobado').length, rechazados: r.filter(x => x.estado === 'rechazado').length, descartados: r.filter(x => x.estado === 'descartado').length, motivos: Object.entries(motivos).sort((a, b) => b[1] - a[1]).slice(0, 3) } };
}
function start() {
  // Si activas "cuentos por noche", el agente trabaja de madrugada (hora Perú) y te deja todo en la cola.
  setInterval(() => { const h = new Date(Date.now() - 5 * 3600000).getUTCHours(); if (A.auto > 0 && !A.pausa && h === 2 && A.diaAuto !== day()) { A.diaAuto = day(); guardar(); const cs = Object.keys(TEMAS); for (let i = 0; i < A.auto; i++) setTimeout(() => crearCuento({ curso: cs[Math.floor(Math.random() * cs.length)], edad: Math.random() < .5 ? '6-8' : '9-12' }).catch(() => {}), i * 120000); } }, 10 * 60000).unref();
  // Los trabajos que quedaron a medias por un reinicio se marcan como interrumpidos.
  for (const x of A.cola) if (x.estado === 'trabajando') { x.estado = 'descartado'; x.motivo = 'Interrumpido por un reinicio de ShortForge'; } guardar();
}
module.exports = { crearCuento, accion, ajustes, estado, start, revisarAuto };
