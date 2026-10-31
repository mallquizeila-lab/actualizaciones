// Desarmar video: subes un video y la IA lo "desarma" escena por escena (prompts de imagen,
// personajes, estilo, cámara, diálogos, ritmo, gancho y por qué funciona). Luego el sistema lo
// vuelve a crear desde cero, mejorado:
//  - "mio": tu propio video -> misma historia y personajes, pero mejor (gancho, coherencia, ritmo).
//  - "otro": video de otro creador -> solo su TÉCNICA y estilo, con otro tema y tus personajes
//    (contenido 100% original: nunca se copia la historia ni los diálogos ajenos).
const fs = require('fs'), path = require('path');
const { run, secs, parseJSON, uid, DATA } = require('./util');
const ai = require('./ai');

const FILE = path.join(DATA, 'desarmados.json');
const list = (() => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return []; } })();
const save = () => fs.writeFileSync(FILE, JSON.stringify(list.slice(-60), null, 1));
const DIR = path.join(DATA, 'desarmados');

const desarmarP = (F, dur, tr) => [{ role: 'user', content: [
  { type: 'text', text: `Eres director de arte, guionista y editor experto en videos cortos virales. "Desarma" este video de ${dur.toFixed(1)} s para poder recrearlo desde cero con IA.
Te paso ${F.length} fotogramas en orden con su segundo: ${F.map((f, i) => `#${i + 1}=${f.t.toFixed(1)}s`).join(', ')}.
${tr?.frases?.length ? 'LO QUE SE DICE (transcripción):\n' + tr.frases.map(f => `[${f.inicio.toFixed(1)}s] ${f.texto}`).join('\n').slice(0, 4000) : 'No tiene voces (o no se pudieron transcribir).'}
Devuelve SOLO JSON con esta forma:
{"titulo":"nombre corto del video","resumen":"de qué trata en 2 frases",
"estilo_visual":"prompt de ESTILO en inglés reutilizable (tipo de render, iluminación, paleta, lente, atmósfera)",
"personajes":[{"nombre":"...","descripcion":"cómo se ve, en español","prompt":"prompt en inglés para generar EXACTAMENTE a este personaje (especie, ropa, accesorios, colores, rasgos)","personalidad":"...","voz":"tipo de voz sugerido (niño, abuelo, gracioso...)"}],
"escenas":[{"inicio":0,"fin":3,"que_pasa":"en español","prompt_imagen":"prompt en inglés de 25 a 50 palabras para recrear la imagen: sujeto, acción, lugar, luz, encuadre + estilo","camara":"plano y movimiento","texto_en_pantalla":"si hay","dialogo":[{"personaje":"...","texto":"..."}]}],
"gancho":"qué hace en el primer segundo para retener","ritmo":"cada cuántos segundos cambia y cómo","musica_y_sonido":"...","estructura":"inicio -> desarrollo -> remate",
"por_que_funciona":"2 o 3 frases","mejoras":["5 mejoras concretas para superarlo (gancho, coherencia, ritmo, remate, retención)"]}
Agrupa en escenas por cambio de plano o de acción (una escena por idea visual). Sé preciso y visual en los prompts.` },
  ...F.map(f => ({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + f.b64 } })),
] }];

async function analizar(id, src, log = () => {}) {
  const it = list.find(x => x.id === id);
  try {
    const dur = await secs(src);
    const n = Math.max(8, Math.min(20, Math.round(dur / 2.5)));
    const F = [];
    fs.mkdirSync(DIR, { recursive: true });
    for (let k = 0; k < n; k++) {
      const t = dur * (k + 0.5) / n;
      const b = await run('ffmpeg', ['-v', 'error', '-ss', t.toFixed(2), '-i', src, '-frames:v', '1', '-vf', 'scale=448:-2', '-q:v', '5', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-'], { encoding: 'buffer' }).catch(() => null);
      if (b?.length) F.push({ t, b64: b.toString('base64') });
    }
    if (!F.length) throw new Error('No pude leer el video');
    fs.writeFileSync(path.join(DIR, id + '.jpg'), Buffer.from(F[Math.floor(F.length / 3)].b64, 'base64'));
    it.estado = 'transcribiendo';
    let tr = null;
    try { tr = await require('./transcribe').transcribir(src, log); } catch (e) {}
    it.estado = 'analizando';
    const r = await ai.ask(desarmarP(F, dur, tr), { json: true, vision: true, max: 8000, log });
    const o = parseJSON(r.text);
    if (!Array.isArray(o.escenas) || !o.escenas.length) throw new Error('La IA no pudo desarmar el video');
    Object.assign(it, { estado: 'listo', dur: +dur.toFixed(1), bp: o, titulo: o.titulo || it.nombre, error: null });
    fs.rmSync(src, { force: true }); delete it.src; // listo: el video subido ya no hace falta (ahorra espacio)
  } catch (e) { Object.assign(it, { estado: 'error', error: e.message, src }); } // se guarda para reintentar
  finally { save(); }
}
function reintentar(id) {
  const it = get(id);
  if (!it?.src || !fs.existsSync(it.src)) throw new Error('El video ya no está; súbelo de nuevo');
  it.estado = 'cola'; it.error = null; save();
  analizar(it.id, it.src).catch(() => {});
}

function nuevo(src, nombre) {
  const it = { id: uid(), nombre: String(nombre || 'video').slice(0, 80), at: new Date().toISOString(), estado: 'cola' };
  list.push(it); save();
  analizar(it.id, src).catch(() => {});
  return it;
}
function borrar(id) { const i = list.findIndex(x => x.id === id); if (i >= 0) { if (list[i].src) fs.rmSync(list[i].src, { force: true }); list.splice(i, 1); save(); fs.rmSync(path.join(DIR, id + '.jpg'), { force: true }); } }
const get = id => list.find(x => x.id === id);

// Guion nuevo (mismo formato que los videos desde cero) a partir del video desarmado.
const recrearP = (ch, bp, modo, notas) => {
  const P = require('./prompts');
  return [{ role: 'user', content:
`Recrea un video vertical desde cero para el canal "${ch.name}" (nicho: ${ch.niche}) a partir de este video DESARMADO:
${JSON.stringify({ resumen: bp.resumen, estilo_visual: bp.estilo_visual, personajes: bp.personajes, escenas: bp.escenas, gancho: bp.gancho, ritmo: bp.ritmo, estructura: bp.estructura, por_que_funciona: bp.por_que_funciona, mejoras: bp.mejoras }).slice(0, 12000)}
${modo === 'mio'
  ? 'Es un video PROPIO del dueño: recrea la MISMA historia con los mismos personajes, pero MEJOR: aplica todas las "mejoras", gancho más fuerte en el primer segundo, cada imagen coincide exactamente con lo que se dice, mejor remate y final en bucle. Usa los prompts de personajes y el estilo_visual dentro de cada prompt_imagen para que se vean iguales.'
  : 'Es un video de OTRO creador: toma SOLO su técnica (formato, estilo visual, ritmo, tipo de gancho, estructura). Cambia el tema, la historia, los diálogos y los personajes por unos propios del canal. Prohibido copiar frases o la historia: contenido 100% original que lo supere.'}
${notas ? 'Indicaciones del dueño: ' + notas : ''}
En cada "prompt_imagen" incluye el estilo_visual y la descripción completa de los personajes que aparecen (para que se vean siempre iguales).
${P.scriptRulesFor(ch)}
${P.schemaFor(ch)}` }];
};

module.exports = { reintentar, nuevo, borrar, get, list: () => list.slice().reverse(), recrearP, desarmarP };
