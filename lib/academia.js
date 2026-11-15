// 🎓 Agente de la Academy: crea contenido nuevo para yupitok.com/academia — cuentos, lecciones, dibujos para colorear y preguntas de trivia —
// y narra los cuentos con voz Kokoro.
// Flujo: Redactor (IA) → revisiones automáticas → Supervisor (OTRA IA, con rúbrica de 0 a 100) → corrección (máx. 2) → tu cola "Por aprobar".
// Nada se publica sin que tú lo apruebes. Lo que rechazas (con su motivo) se recuerda para no repetir el error.
const fs = require('fs'), path = require('path');
const { DATA, uid, parseJSON, day } = require('./util');
const FILE = path.join(DATA, 'academia-agente.json');
const BASE = () => ({ cola: [], memoria: [], auto: 0, pausa: false, narrando: null, usados: [], crecer: { on: true, dibujos: 15, cuentos: 1, lecciones: 1, trivia: 1 } });
const A = (() => { try { return Object.assign(BASE(), JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) { return BASE(); } })();
const guardar = () => { A.cola = A.cola.slice(-150); A.memoria = A.memoria.slice(-40); fs.writeFileSync(FILE, JSON.stringify(A, null, 1)); };
const V = () => require('./viral');

const TEMAS = { 'ciencia-curiosa': 'Ciencia', 'programa-con-yupi': 'Programación', 'ingles-con-yupi': 'Inglés', 'mates-divertidas': 'Mates', 'finanzas-personales': 'Finanzas y valores', 'crea-tu-pagina-web': 'Páginas web' };
const TIPOS = { dibujo: '🖼️ Dibujo moderno (fábrica)', cuento: '📖 Cuento interactivo', leccion: '📘 Lección nueva', lamina: '🎨 Dibujo simple (formas)', trivia: '🏆 Preguntas de trivia' };
const TEMAS_DIBUJO = require('./dibujos-temas');
const PERSONAJES = 'Yupi (niño alegre y curioso), Lulú (llama viajera y amable), Choki (choclo guerrero y cocinero), Coquito (coco pequeño y tierno), Yupi-bot (robot obediente que dice «bip») y el Sabio Búho (maestro sabio)';
const PROHIBIDO = /(https?:\/\/|www\.|@\w|\b\d{7,}\b|sangre|matar|muert|\barmas?\b|pistola|droga|alcohol|cerveza|cigarr|apuesta|casino|novi[oa]s?\b|beso|odio|estúpid|idiota|tont[oa]\b|gord[oa]\b|feo\b|dieta)/i;
const RUBRICA = [['exactitud', 'Lo que enseña es correcto y verificable', 25], ['edad', 'Vocabulario, largo y dificultad adecuados para la edad', 20], ['coherencia', 'Sigue el tema del curso y tiene sentido de principio a fin', 15], ['seguridad', 'Sin miedo intenso, violencia, burlas, estereotipos ni presión para comprar', 15], ['diversion', 'Es divertido y motiva a seguir aprendiendo', 15], ['claridad', 'Cada pregunta o reto tiene una sola respuesta correcta y clara', 10]];

const slugDe = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const palabras = t => String(t).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const edadTxt = e => e === '6-8' ? '6 a 8 años (frases muy cortas, palabras sencillas)' : e === '9-12' ? '9 a 12 años (frases claras, puede enseñar un concepto)' : e === '13-17' ? '13 a 17 años (adolescentes, ejemplos prácticos)' : 'adultos';

// ---------- Revisiones automáticas (sin IA) ----------
function preguntasMal(qs, n) { const err = []; if (!Array.isArray(qs) || qs.length < n) return [`Deben ser al menos ${n} preguntas`]; qs.forEach((q, i) => { if (!q || !q.p || !Array.isArray(q.ops) || q.ops.length < 3 || !(q.ok >= 0 && q.ok < q.ops.length) || new Set(q.ops.map(String)).size !== q.ops.length) err.push(`La pregunta ${i + 1} debe tener 3 opciones distintas y una sola correcta`); }); return err; }
function revisarAuto(c, edad, tipo = 'cuento') {
  const err = [];
  if (!c || typeof c !== 'object') return ['No llegó un contenido en formato válido'];
  if (tipo === 'cuento') {
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
    const vistos = new Set(); (function rec(k, d) { if (!P[k] || vistos.has(k) || d > 20) return; vistos.add(k); if (P[k].sig) rec(P[k].sig, d + 1); (P[k].opciones || []).forEach(o => rec(o.ir, d + 1)); })(c.inicio, 0);
    if (vistos.size !== ids.length) err.push('Hay páginas a las que no se puede llegar');
    if (!Array.isArray(c.preguntas) || c.preguntas.length !== 3) err.push('Deben ser exactamente 3 preguntas del Búho'); else err.push(...preguntasMal(c.preguntas, 3));
    if (total < 200) err.push('El cuento es demasiado corto');
  }
  if (tipo === 'leccion') {
    if (!c.titulo || String(c.titulo).length > 80) err.push('Falta el título o es muy largo');
    if (!c.desc || String(c.desc).length > 200) err.push('Falta la descripción corta (máx. 200 letras)');
    const n = palabras(c.html || ''); if (n < 150 || n > 500) err.push(`La explicación debe tener entre 150 y 500 palabras (tiene ${n})`);
    if (/<(?!\/?(p|h2|h3|ul|ol|li|b|i|code|pre|br)\b)[^>]*>/i.test(c.html || '')) err.push('La explicación usa etiquetas no permitidas');
    const act = Array.isArray(c.actividad) ? c.actividad : []; if (act.length < 3 || act.length > 5) err.push('La lección debe tener de 3 a 5 retos');
    act.forEach((a, i) => { const t = a && a.tipo;
      if (t === 'quiz') err.push(...preguntasMal([a], 1).map(e => `Reto ${i + 1}: ${e}`));
      else if (t === 'parejas') { if (!Array.isArray(a.pares) || a.pares.length < 3 || a.pares.some(p => !Array.isArray(p) || p.length !== 2 || !p[0] || !p[1]) || new Set(a.pares.map(p => p[1])).size !== a.pares.length) err.push(`Reto ${i + 1}: las parejas deben ser 3 a 5, sin repetir`); }
      else if (t === 'ordenar') { if (!Array.isArray(a.items) || a.items.length < 3 || new Set(a.items).size !== a.items.length) err.push(`Reto ${i + 1}: ordenar necesita 3 a 6 pasos distintos`); }
      else if (t === 'escribir') { if (!Array.isArray(a.ok) || !a.ok.length || a.ok.some(x => String(x).length > 30)) err.push(`Reto ${i + 1}: escribir necesita respuestas cortas aceptadas`); }
      else err.push(`Reto ${i + 1}: tipo no permitido (solo quiz, parejas, ordenar o escribir)`);
      if (!a || !a.p) err.push(`Reto ${i + 1}: falta la consigna`); });
  }
  if (tipo === 'lamina') {
    if (!c.titulo || String(c.titulo).length > 60) err.push('Falta el título');
    const F = Array.isArray(c.formas) ? c.formas : []; if (F.length < 6 || F.length > 120) err.push(`El dibujo debe tener entre 6 y 120 formas (tiene ${F.length})`);
    const fuera = F.filter(f => ['cx', 'cy', 'x', 'y'].some(k => f[k] != null && (+f[k] < -5 || +f[k] > 405))).length; if (fuera) err.push(`${fuera} formas se salen del lienzo de 400 × 400`);
    const zonas = F.filter(f => !f.l).length; if (zonas < 5) err.push('Necesita al menos 5 zonas para pintar');
    if (F.some(f => !['circle', 'ellipse', 'rect', 'polygon', 'path'].includes(f.t))) err.push('Solo se permiten círculos, elipses, rectángulos, polígonos y trazos');
    if (!c.texto || !c.reto) err.push('Falta el dato para aprender o el reto de color');
  }
  if (tipo === 'trivia') err.push(...preguntasMal(c.preguntas, 8));
  const todo = JSON.stringify(c); if (PROHIBIDO.test(todo)) err.push('Tiene palabras o enlaces no permitidos para niños: ' + (todo.match(PROHIBIDO) || [''])[0]);
  return err;
}

// ---------- Redactor ----------
async function contexto() { try { return await V().admin('academia/contenido'); } catch (e) { return null; } }
function instrucciones(tipo, { tema, curso, edad, idea }, ctx) {
  const cur = ctx?.cursos?.find(c => c.slug === curso), base = `Eres un docente y autor experto en contenido educativo infantil y juvenil, en español latinoamericano, para Yupitok Academy. Público: ${edadTxt(edad)}.
Tema / curso: ${tema} ("${cur ? cur.titulo : curso}")${idea ? '. Idea: ' + String(idea).slice(0, 200) : ''}. Todo debe ser correcto y verificable.
Personajes propios que puedes usar: ${PERSONAJES}. Ejemplos del Perú y Latinoamérica. Tono cálido y alegre; sin miedo, violencia, burlas, estereotipos, dietas, romance, marcas ni presión para comprar.`;
  if (tipo === 'cuento') return base + `
Escribe un cuento INTERACTIVO original. 6 a 8 páginas. Cada página: "esc" (2 a 4 emojis), "t" (${edad === '6-8' ? '35 a 70' : '45 a 90'} palabras; solo <b> e <i>). Una página sigue con "sig", o termina con "opciones" (exactamente 2: {"t":"emoji + acción","ir":"id"}), o es un final con "fin": true y "moraleja". Exactamente 2 finales y al menos 2 decisiones; la opción "equivocada" enseña con cariño y vuelve al camino. Ids: p1, p2, p2b, f1, f2…
${ctx?.cuentos?.length ? 'No repitas estos títulos: ' + ctx.cuentos.map(c => c.titulo).join('; ') + '.' : ''}
Devuelve SOLO JSON: {"titulo":"…","emoji":"…","resumen":"1 o 2 frases","inicio":"p1","paginas":{"p1":{"esc":"…","t":"…","sig":"p2"}},"preguntas":[{"p":"…","ops":["…","…","…"],"ok":0}]} (3 preguntas).`;
  if (tipo === 'leccion') return base + `
Escribe UNA lección nueva de unos 10 minutos para este curso. ${cur ? 'Lecciones que YA existen (no las repitas; continúa el tema con algo nuevo): ' + cur.lecciones.join('; ') + '.' : ''}
"html": explicación de 150 a 400 palabras con <h2>, <p>, <ul>/<ol>/<li>, <b>, <i>, <code> o <pre> (nada más): un gancho con una pregunta, la idea principal con ejemplos de la vida diaria y un consejo final.
"actividad": 3 o 4 retos que suban de dificultad, de estos tipos:
- {"tipo":"quiz","p":"pregunta","ops":["…","…","…"],"ok":0,"exp":"explicación corta"}
- {"tipo":"parejas","p":"consigna","pares":[["…","…"],["…","…"],["…","…"]]}
- {"tipo":"ordenar","p":"consigna","items":["paso 1","paso 2","paso 3"],"exp":"…"} (en el orden correcto)
- {"tipo":"escribir","p":"pregunta de respuesta corta","ok":["respuesta","variante aceptada"],"exp":"…"}
Devuelve SOLO JSON: {"titulo":"…","emoji":"…","min":10,"desc":"1 frase para Google (máx. 155 letras)","html":"…","actividad":[…]}`;
  if (tipo === 'lamina') return base + `
Diseña un DIBUJO PARA COLOREAR sencillo y reconocible (estilo libro de colorear: formas grandes y cerradas, sin detalles diminutos) en un lienzo de 400 × 400 (x hacia la derecha, y hacia abajo). ${ctx?.laminas?.length ? 'Ya existen: ' + ctx.laminas.join(', ') + '; haz uno distinto.' : ''}
Usa SOLO estas formas, de 10 a 60, ordenadas del fondo hacia adelante (las de adelante tapan a las de atrás):
{"t":"circle","cx":..,"cy":..,"r":..} · {"t":"ellipse","cx":..,"cy":..,"rx":..,"ry":..} · {"t":"rect","x":..,"y":..,"width":..,"height":..,"rx":..} · {"t":"polygon","points":"x,y x,y x,y"} · {"t":"path","d":"M… L… Q… A… Z"}
Opcional en cualquier forma: "rot":grados,"rx0":cx,"ry0":cy para girarla. Para líneas decorativas que no se pintan (bigotes, sonrisas) agrega "l":true y usa path sin cerrar.
Piensa primero en la composición: suelo abajo, figura principal grande al centro, 1 o 2 elementos de fondo.
Devuelve SOLO JSON: {"titulo":"…","emoji":"…","cat":"Animales|Naturaleza|Transportes|Mi mundo|Comida|Espacio y ciencia|Mandalas|Yupi y amigos","texto":"dato para aprender (1-2 frases; puede usar <b>)","reto":"reto de color (puede incluir colores en inglés en <b>)","formas":[…]}`;
  if (tipo === 'trivia') return base + `
Escribe 10 preguntas de trivia de opción múltiple sobre este curso, variadas y de dificultad creciente, para jugar en vivo (frases cortas: se leen en 15 segundos). Exactamente 3 opciones, una sola correcta, sin "todas las anteriores".
Devuelve SOLO JSON: {"preguntas":[{"p":"…","ops":["…","…","…"],"ok":0}]}`;
}
async function redactar(tipo, o, ctx, notas, previo) {
  const ai = require('./ai'), mem = A.memoria.slice(-12).map(m => '- ' + m).join('\n');
  const p = instrucciones(tipo, o, ctx) + (mem ? '\nErrores que NO debes repetir (los rechazó la persona que revisa):\n' + mem : '') + (notas ? '\nCorrige tu versión anterior según estas notas:\n' + notas + '\nVersión anterior: ' + JSON.stringify(previo).slice(0, 7000) : '');
  const r = await ai.ask(p, { json: true, max: tipo === 'lamina' ? 6000 : 5000 }); return { c: parseJSON(r.text), proveedor: r.provider };
}
// ---------- Supervisor (otra IA) ----------
async function supervisar(tipo, c, { edad, tema }, evitar) {
  const ai = require('./ai');
  const que = { cuento: 'este cuento interactivo', leccion: 'esta lección con sus retos', lamina: 'este dibujo para colorear (descrito como formas geométricas; juzga si las formas componen un dibujo reconocible, si las zonas son grandes para pintar con el dedo, y el texto y el reto)', trivia: 'estas preguntas de trivia (revisa una por una que la respuesta marcada sea la correcta)' }[tipo];
  const p = `Eres el SUPERVISOR PEDAGÓGICO de Yupitok Academy, exigente y justo. Evalúa ${que} para ${edadTxt(edad)} (tema: ${tema}).
Puntúa cada criterio de 0 a 10: ${RUBRICA.map(([k, d]) => `"${k}" (${d})`).join(', ')}.
Marca "rojo": true SOLO si hay algo inapropiado o peligroso para niños, o un error de contenido grave (por ejemplo, una respuesta correcta que en realidad está mal).
Da "notas": hasta 5 correcciones concretas y accionables, en español. "resumen": 1 frase para el revisor humano.
Contenido: ${JSON.stringify(c).slice(0, 9000)}
Devuelve SOLO JSON: {"puntos":{"exactitud":0,"edad":0,"coherencia":0,"seguridad":0,"diversion":0,"claridad":0},"rojo":false,"notas":["…"],"resumen":"…"}`;
  const r = await ai.ask(p, { json: true, max: 1500, evitar }); const j = parseJSON(r.text) || {};
  const pts = j.puntos || {}, total = Math.round(RUBRICA.reduce((a, [k, , w]) => a + Math.max(0, Math.min(10, +pts[k] || 0)) * w / 10, 0));
  return { total, rojo: !!j.rojo || (+pts.seguridad || 0) < 6, notas: (j.notas || []).slice(0, 5).map(x => String(x).slice(0, 300)), resumen: String(j.resumen || '').slice(0, 300), puntos: pts, proveedor: r.provider };
}

// ---------- Trabajo completo ----------
async function crear(o = {}) {
  if (A.pausa) throw new Error('La Academy está en pausa. Reanúdala para crear.');
  if (o.tipo === 'dibujo') return crearDibujo(o);
  const ai = require('./ai'); if (!ai.active().length) throw new Error('Falta una clave de IA en Ajustes');
  const tipo = TIPOS[o.tipo] ? o.tipo : 'cuento', curso = TEMAS[o.curso] ? o.curso : 'ciencia-curiosa';
  const edad = ['6-8', '9-12', '13-17', '18+'].includes(o.edad) ? o.edad : '6-8', tema = String(o.tema || '').slice(0, 80) || TEMAS[curso];
  const it = { id: uid(), tipo, estado: 'trabajando', fase: 'Redactor escribiendo', curso, edad, tema, idea: String(o.idea || '').slice(0, 200), fecha: new Date().toISOString(), log: [] };
  A.cola.push(it); guardar();
  (async () => {
    const ctx = await contexto(); let c = null, notas = '', sup = null;
    for (let intento = 1; intento <= 3; intento++) {
      it.fase = intento === 1 ? 'Redactor escribiendo' : `Redactor corrigiendo (intento ${intento})`; guardar();
      const r = await redactar(tipo, { tema, curso, edad, idea: it.idea }, ctx, notas, c); c = r.c; it.redactor = r.proveedor;
      const auto = revisarAuto(c, edad, tipo);
      if (auto.length) { it.log.push(`Revisión automática (${intento}): ${auto.slice(0, 4).join('; ')}`); notas = auto.join('\n'); if (intento === 3) throw new Error('No pasó las revisiones automáticas: ' + auto.slice(0, 3).join('; ')); continue; }
      it.fase = 'Supervisor revisando'; guardar();
      sup = await supervisar(tipo, c, { edad, tema }, r.proveedor); it.supervisor = sup.proveedor;
      it.log.push(`Supervisor (${intento}): ${sup.total}/100${sup.rojo ? ' · 🔴 rojo' : ''} · ${sup.resumen}`);
      if (sup.total >= 85 && !sup.rojo) break;
      if (sup.total < 60 && sup.rojo) throw new Error(`El supervisor lo descartó (${sup.total}/100): ${sup.notas.slice(0, 2).join('; ')}`);
      if (intento === 3) throw new Error(`No llegó a 85 puntos tras 2 correcciones (${sup.total}/100)`);
      notas = sup.notas.join('\n');
    }
    if (tipo !== 'trivia') c.slug = slugDe(c.titulo);
    if (tipo === 'cuento') Object.assign(c, { edad: edad === '9-12' ? '9-12' : '6-8', tema: TEMAS[curso], curso, min: edad === '6-8' ? 5 : 6 });
    if (tipo === 'lamina') Object.assign(c, { edad: edad === '9-12' ? '9-12' : '6-8', curso });
    Object.assign(it, { estado: 'pendiente', fase: '', cuento: c, nota: sup.total, rubrica: sup.puntos, resumen: sup.resumen, notas: sup.notas }); guardar();
    try { require('./avisos').avisar(`🎓 Nuevo contenido por aprobar (${TIPOS[tipo]}): «${c.titulo || TEMAS[curso]}» (${sup.total}/100). Revísalo en ShortForge → Centro de Mando → Agente de la Academy.`); } catch (e) {}
  })().catch(e => { Object.assign(it, { estado: 'descartado', fase: '', motivo: String(e.message || e).slice(0, 300) }); guardar(); console.log('[Academy] ' + it.motivo); });
  return it.id;
}
const esperar = async id => { const t0 = Date.now(); while (Date.now() - t0 < 15 * 60000) { const it = A.cola.find(x => x.id === id); if (!it || it.estado !== 'trabajando') return; await new Promise(r => setTimeout(r, 5000)); } };

// ---------- 🖼️ Fábrica de dibujos modernos (IA de imágenes de Cloudflare + trazado en zonas pintables) ----------
const PROMS = new Map();
function siguienteTema() { const u = new Set(A.usados); return TEMAS_DIBUJO.find(t => !u.has(t.es)) || TEMAS_DIBUJO[Math.floor(Math.random() * TEMAS_DIBUJO.length)]; }
async function crearDibujo(o = {}) {
  const img = require('./imagenes'); if (!img.listo()) throw new Error('Para la fábrica de dibujos hace falta la clave de Cloudflare (Ajustes → Claves)');
  const tema = o.idea ? { es: String(o.idea).slice(0, 80), en: null, cat: 'Más dibujos', curso: TEMAS[o.curso] ? o.curso : 'ciencia-curiosa' } : siguienteTema();
  if (!o.idea) { A.usados.push(tema.es); }
  const edad = o.edad === '9-12' ? '9-12' : '6-8';
  const it = { id: uid(), tipo: 'dibujo', estado: 'trabajando', fase: 'Escribiendo el dato y el reto', curso: tema.curso, edad, tema: tema.es, fecha: new Date().toISOString(), log: [] };
  A.cola.push(it); guardar();
  const p = (async () => {
    const ai = require('./ai'); let meta = null;
    if (ai.active().length) { try { const r = await ai.ask(`Para un dibujo para colorear de niños de ${edad} años cuyo tema es "${tema.es}", escribe en español latinoamericano, cálido y correcto. Devuelve SOLO JSON: {"titulo":"máx. 40 letras","emoji":"1 emoji","en":"descripción del dibujo en inglés, 6 a 12 palabras, solo el sujeto y la escena","texto":"1 o 2 frases con un dato curioso y verdadero para aprender","reto":"1 reto de color divertido; incluye 1 o 2 colores en inglés dentro de <b></b>"}`, { json: true, max: 600 }); meta = parseJSON(r.text); } catch (e) { it.log.push('Texto: ' + e.message.slice(0, 80)); } }
    meta = Object.assign({ titulo: tema.es, emoji: '🎨', texto: `Colorea este dibujo de ${tema.es.toLowerCase()} con tus colores favoritos.`, reto: 'Usa por lo menos 5 colores distintos: ¡<b>red</b>, <b>blue</b>, <b>yellow</b>…!' }, meta || {});
    if (PROHIBIDO.test(JSON.stringify(meta))) throw new Error('El texto tenía palabras no permitidas');
    const en = tema.en || String(meta.en || tema.es).slice(0, 120), cupo = img.cupo();
    if (cupo.quedanAprox < (o.manual ? 2 : 12)) throw new Error('Se guardó la cuota de imágenes de hoy para tus videos (vuelve a intentar mañana)');
    const dir = path.join(DATA, 'cache', 'dibujo-' + it.id); fs.mkdirSync(dir, { recursive: true });
    try {
      let mejor = null;
      for (let intento = 1; intento <= 2 && !mejor; intento++) {
        it.fase = `Dibujando con IA (intento ${intento})`; guardar();
        const out = path.join(dir, `img${intento}.png`), prompt = `Coloring book page for children: ${en}. Cute modern cartoon style, thick clean black outlines, pure white background, large simple closed shapes, centered, no shading, no gray, no colors, no text, no letters, no border${intento > 1 ? ', fewer details, even bolder lines' : ''}.`;
        await img.generar({ prompt, out, formato: 'lamina', log: m => it.log.push(m) });
        it.fase = 'Convirtiendo en zonas para pintar'; guardar();
        const r = await require('./trazar').trazar(out);
        it.log.push(`Intento ${intento}: ${r.zonas} zonas`);
        if (r.zonas >= 8 && r.zonas <= 220) mejor = r;
      }
      if (!mejor) throw new Error('El dibujo salió con muy pocas o demasiadas partes para pintar');
      const pngDir = path.join(DATA, 'academia-png'); fs.mkdirSync(pngDir, { recursive: true }); const ult = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort().pop(); if (ult) fs.copyFileSync(path.join(dir, ult), path.join(pngDir, it.id + '.png'));
      const c = { titulo: String(meta.titulo).slice(0, 40), emoji: String(meta.emoji).slice(0, 8), cat: tema.cat, texto: String(meta.texto).slice(0, 400), reto: String(meta.reto).slice(0, 250), formas: mejor.formas, edad, curso: tema.curso, slug: slugDe(meta.titulo) + '-' + it.id.slice(-4) };
      Object.assign(it, { estado: 'pendiente', fase: '', cuento: c, nota: null, resumen: `${mejor.zonas} partes para pintar · revisa que el dibujo se vea bien` }); guardar();
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} }
  })().catch(e => { Object.assign(it, { estado: 'descartado', fase: '', motivo: String(e.message || e).slice(0, 300) }); guardar(); console.log('[Academy · dibujos] ' + it.motivo); });
  PROMS.set(it.id, p); p.finally(() => PROMS.delete(it.id)); return it.id;
}

// ---------- 🔊 Narración de cuentos con voz Kokoro ----------
const VOZ_KOKORO = 'kokoro:ef_dora';
async function narrar(slug) {
  if (A.narrando) throw new Error('Ya estoy narrando otro cuento. Espera a que termine.');
  const tts = require('./tts'), { ff } = require('./util'), ctx = await contexto(), c = ctx?.cuentos?.find(x => x.slug === slug); if (!c) throw new Error('No encontré ese cuento en la página');
  const usarKokoro = tts.local().kokoro, voz = usarKokoro ? VOZ_KOKORO : 'es-MX-DaliaNeural';
  A.narrando = { slug, titulo: c.titulo, fase: 'Preparando', hechas: 0, total: Object.keys(c.paginas).length }; guardar();
  (async () => {
    const dir = path.join(DATA, 'cache', 'narrar-' + uid()); fs.mkdirSync(dir, { recursive: true });
    try {
      const items = Object.entries(c.paginas).map(([k, p]) => ({ k, text: String(p.t).replace(/<[^>]+>/g, '').replace(/[—«»]/g, ' ') + (p.fin && p.moraleja ? ' ' + p.moraleja : ''), base: path.join(dir, k), v: { voice: voz, rate: -8 } })); // un poco más lenta: voz cálida de narrador para niños
      A.narrando.fase = usarKokoro ? 'Kokoro está narrando' : 'Narrando (Kokoro no está instalado en esta PC: uso voz natural de Microsoft)'; guardar();
      await tts.synthAll(items, m => console.log('[Academy · voz] ' + m));
      if (items.some(it => it.robot)) throw new Error('No hay una voz natural disponible (ni Kokoro ni Edge). Instala la IA local en Ajustes.');
      const hechas = [];
      for (const it of items) { const mp3 = it.base + '.mp3'; await ff(['-i', it.file, '-ac', '1', '-ar', '24000', '-af', 'loudnorm=I=-16:TP=-1.5', '-b:a', '64k', mp3]);
        await V().admin('academia/audio', { slug, pagina: it.k, mp3: fs.readFileSync(mp3).toString('base64') }); hechas.push(it.k); A.narrando.hechas = hechas.length; A.narrando.fase = 'Subiendo audios'; guardar(); }
      await V().admin('academia/audio/listo', { slug, paginas: hechas, voz: usarKokoro ? 'Kokoro · Dora' : 'Microsoft · Dalia' });
      A.ultNarrado = { slug, titulo: c.titulo, fecha: new Date().toISOString(), voz: usarKokoro ? 'Kokoro' : 'Microsoft' };
    } catch (e) { A.ultNarrado = { slug, titulo: c.titulo, error: String(e.message || e).slice(0, 200), fecha: new Date().toISOString() }; console.log('[Academy · voz] ' + e.message); }
    finally { A.narrando = null; guardar(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} }
  })();
}

async function accion({ id, ids, accion: a, motivo }) {
  if (a === 'aprobarVarios') { let n = 0; for (const i of (ids || []).slice(0, 60)) { try { await accion({ id: i, accion: 'aprobar' }); n++; } catch (e) {} } return { ok: 1, n }; }
  const it = A.cola.find(x => x.id === id); if (!it) throw new Error('No encontrado');
  if (a === 'aprobar') {
    if (it.estado !== 'pendiente') throw new Error('Solo se aprueba lo que está por aprobar');
    const c = it.cuento, r = it.tipo === 'leccion' ? await V().admin('academia/leccion', { curso: it.curso, leccion: c }) : it.tipo === 'lamina' || it.tipo === 'dibujo' ? await V().admin('academia/lamina', { lamina: c, png: (() => { try { return fs.readFileSync(path.join(DATA, 'academia-png', it.id + '.png')).toString('base64'); } catch (e) { return undefined; } })() }) : it.tipo === 'trivia' ? await V().admin('academia/trivia', { curso: it.curso, preguntas: c.preguntas }) : await V().admin('academia/cuento', { cuento: c });
    it.estado = 'aprobado'; it.url = r.url; guardar();
    if (it.tipo === 'cuento') narrar(new URL(r.url).pathname.split('/').pop()).catch(() => {}); // al aprobar un cuento, se narra solo
    return r;
  }
  if (a === 'rechazar') { const m = String(motivo || '').trim().slice(0, 200); if (!m) throw new Error('Escribe el motivo en una frase: así el agente aprende'); it.estado = 'rechazado'; it.motivo = m; A.memoria.push(`${TIPOS[it.tipo] || it.tipo} «${it.cuento?.titulo || it.tema}»: ${m}`); guardar(); return { ok: 1 }; }
  if (a === 'ocultar') { const slug = it.url ? new URL(it.url).pathname.split('/').pop() : it.cuento?.slug; if (it.tipo !== 'trivia' && slug) await V().admin('academia/quitar', { tipo: it.tipo === 'dibujo' ? 'lamina' : it.tipo, id: slug }); it.estado = 'oculto'; guardar(); return { ok: 1 }; }
  if (a === 'borrar') { A.cola = A.cola.filter(x => x !== it); guardar(); return { ok: 1 }; }
  throw new Error('Acción no válida');
}
function ajustes(o) { if (o.pausa !== undefined) A.pausa = !!o.pausa; if (o.crecer) { const c = A.crecer, n = (v, m) => Math.max(0, Math.min(m, Math.floor(+v) || 0)); if (o.crecer.on !== undefined) c.on = !!o.crecer.on; for (const [k, m] of [['dibujos', 40], ['cuentos', 3], ['lecciones', 3], ['trivia', 3]]) if (o.crecer[k] !== undefined) c[k] = n(o.crecer[k], m); } guardar(); }
// 🌱 Crecimiento automático diario: de madrugada el agente prepara lecciones, cuentos, trivia y dibujos nuevos, uno tras otro, y te deja todo en la cola.
async function crecerHoy() {
  const c = A.crecer, cs = ['ciencia-curiosa', 'programa-con-yupi', 'ingles-con-yupi', 'mates-divertidas'], al = l => l[Math.floor(Math.random() * l.length)], ed = () => Math.random() < .5 ? '6-8' : '9-12';
  const tareas = [...Array(c.lecciones).fill(0).map(() => ({ tipo: 'leccion', curso: al(cs), edad: ed() })), ...Array(c.cuentos).fill(0).map(() => ({ tipo: 'cuento', curso: al(cs), edad: ed() })), ...Array(c.trivia).fill(0).map(() => ({ tipo: 'trivia', curso: al([...cs, 'crea-tu-pagina-web']), edad: '9-12' })), ...Array(c.dibujos).fill(0).map(() => ({ tipo: 'dibujo' }))];
  A.ultCrecer = { fecha: new Date().toISOString(), tareas: tareas.length }; guardar();
  for (const t of tareas) { if (A.pausa) break; try { const id = await crear(t); await esperar(id); } catch (e) { console.log('[Academy · crecer] ' + e.message); if (/cuota|clave/i.test(e.message) && t.tipo === 'dibujo') break; } }
  try { const p = A.cola.filter(x => x.estado === 'pendiente').length; if (p) require('./avisos').avisar(`🌱 La Academy creció esta noche: tienes ${p} contenidos por aprobar en ShortForge → Centro de Mando → Agente de la Academy.`); } catch (e) {}
}
async function estado() {
  const sem = Date.now() - 7 * 864e5, r = A.cola.filter(x => new Date(x.fecha).getTime() >= sem);
  const motivos = {}; for (const x of r.filter(x => x.estado === 'rechazado' || x.estado === 'descartado')) { const m = String(x.motivo || '').split(':')[0].slice(0, 80); motivos[m] = (motivos[m] || 0) + 1; }
  const ctx = await contexto();
  return { cola: A.cola.slice().reverse(), pausa: A.pausa, auto: A.auto, memoria: A.memoria.slice(-10), temas: Object.entries(TEMAS).map(([k, v]) => ({ k, v })), tipos: Object.entries(TIPOS).map(([k, v]) => ({ k, v })),
    narrando: A.narrando, ultNarrado: A.ultNarrado || null, crecer: A.crecer, ultCrecer: A.ultCrecer || null, dibujosHechos: A.usados.length, dibujosTotal: TEMAS_DIBUJO.length, cloudflare: (() => { try { return require('./imagenes').listo(); } catch (e) { return false; } })(), kokoro: (() => { try { return require('./tts').local().kokoro; } catch (e) { return false; } })(),
    cuentos: (ctx?.cuentos || []).map(c => ({ slug: c.slug, titulo: c.titulo, emoji: c.emoji, audio: c.audio ? { voz: c.audio.voz, fecha: c.audio.v } : null })),
    semana: { creados: r.length, aprobados: r.filter(x => x.estado === 'aprobado').length, rechazados: r.filter(x => x.estado === 'rechazado').length, descartados: r.filter(x => x.estado === 'descartado').length, motivos: Object.entries(motivos).sort((a, b) => b[1] - a[1]).slice(0, 3) } };
}
function start() {
  // Contenido por noche: de madrugada (hora Perú) el agente rota entre cuentos, lecciones, dibujos y trivia, y te deja todo en la cola.
  setInterval(() => { const h = new Date(Date.now() - 5 * 3600000).getUTCHours(); if (A.crecer.on && !A.pausa && h === 1 && A.diaAuto !== day()) { A.diaAuto = day(); guardar(); crecerHoy().catch(e => console.log('[Academy · crecer] ' + e.message)); } }, 10 * 60000).unref();
  // Los trabajos que quedaron a medias por un reinicio se marcan como interrumpidos.
  for (const x of A.cola) if (x.estado === 'trabajando') { x.estado = 'descartado'; x.motivo = 'Interrumpido por un reinicio de ShortForge'; } A.narrando = null; guardar();
}
module.exports = { crecerHoy, crear, crearCuento: o => crear({ ...o, tipo: 'cuento' }), narrar, accion, ajustes, estado, start, revisarAuto };
