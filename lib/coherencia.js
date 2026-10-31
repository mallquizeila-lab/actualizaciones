// Coherencia: que lo que se VE sea exactamente lo que se DICE.
//  1) dirigir(): un "director visual" revisa el guion escena por escena y reescribe la descripción de
//     cada imagen para que muestre literalmente lo que dice esa frase (antes de gastar cupo de imágenes).
//  2) revisarImagenes(): Gemini mira todas las imágenes generadas junto con su frase y les pone nota;
//     las que sacan menos de 7 se vuelven a crear con una descripción corregida (con límite de cupo).
const fs = require('fs');
const { run, parseJSON } = require('./util');
const ai = require('./ai');

const direccionP = (ch, s) => [{ role: 'user', content:
`Eres director de arte de videos cortos. Canal "${ch.name}" (nicho: ${ch.niche}).
Para cada escena, la imagen debe mostrar LITERALMENTE lo que dice esa frase en ese momento: los mismos objetos, ingredientes, acciones y cantidades que se nombran. Nada genérico ni decorativo.
Ejemplo: "exprime medio limón en una taza de agua tibia" -> "close-up of hands squeezing half a lemon into a cup of warm water, steam rising, kitchen counter".
${ch.style === 'personaje' ? 'Los personajes (frutas que hablan) deben aparecer haciendo la acción o reaccionando a ella; nómbralos por su fruta en inglés.' : ''}
Para cada escena devuelve:
- "prompt_imagen": en INGLÉS, 20 a 40 palabras, sujeto + acción congelada + lugar + luz + encuadre. Sin texto ni letras.
- "img": 3 a 5 palabras en inglés para buscar una foto de stock que muestre lo mismo.
- "clave": la palabra MÁS importante que se dice en la escena (un ingrediente, objeto o dato), tal cual aparece en la frase, para mostrarla grande en pantalla; o vacío.
ESCENAS:
${s.scenes.map((x, i) => `${i + 1}. ${x.text}  [imagen actual: ${x.prompt_imagen || x.img || '-'}]`).join('\n')}
Devuelve SOLO JSON: {"escenas":[{"prompt_imagen":"...","img":"...","clave":"..."}]} con exactamente ${s.scenes.length} elementos en el mismo orden.` }];

async function dirigir(ch, s, log = () => {}) {
  try {
    const r = await ai.ask(direccionP(ch, s), { json: true, max: 4000, log });
    const e = parseJSON(r.text).escenas || [];
    if (e.length !== s.scenes.length) { log('Director visual: respuesta incompleta, sigo con el guion original'); return false; }
    e.forEach((x, i) => {
      const sc = s.scenes[i];
      if (x.prompt_imagen && String(x.prompt_imagen).split(' ').length >= 6) sc.prompt_imagen = String(x.prompt_imagen);
      if (x.img) sc.img = String(x.img);
      const k = String(x.clave || '').trim();
      if (k && k.length <= 24 && sc.text.toLowerCase().includes(k.toLowerCase())) sc.clave = k;
    });
    log('Director visual: cada imagen ahora describe exactamente lo que se dice');
    return true;
  } catch (e) { log('Director visual no disponible (' + e.message.slice(0, 80) + ')'); return false; }
}

const revisarP = (ch, sc, imgs) => [{ role: 'user', content: [
  { type: 'text', text: `Revisa si cada imagen muestra lo que dice su frase (video del canal "${ch.name}", nicho ${ch.niche}). Te paso ${imgs.length} imágenes en orden; cada una corresponde a esta frase:
${imgs.map((x, k) => `Imagen ${k + 1} -> "${sc[x.i].text}"`).join('\n')}
Para cada imagen da "nota" del 1 al 10 (10 = muestra exactamente lo que se dice, se entiende al instante y se ve profesional; menos de 7 = no corresponde, es confusa, tiene texto deformado o se ve mal).
Si la nota es menor a 7, escribe "nuevo_prompt": una descripción en INGLÉS (20 a 40 palabras) de la imagen correcta, sin texto ni letras.
Devuelve SOLO JSON: {"imagenes":[{"n":1,"nota":8,"problema":"","nuevo_prompt":""}]}` },
  ...imgs.map(x => ({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + x.b64 } })),
] }];

async function thumb(file) {
  const b = await run('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'scale=384:-2', '-frames:v', '1', '-q:v', '6', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-'], { encoding: 'buffer' });
  return b.toString('base64');
}

// regen(i, prompt) vuelve a crear la imagen de la escena i; devuelve true si lo logró.
async function revisarImagenes({ ch, sc, files, regen, maxRegen = 4, log = () => {} }) {
  const imgs = [];
  for (const [i, f] of files.entries()) if (f && fs.existsSync(f)) { try { imgs.push({ i, b64: await thumb(f) }); } catch (e) {} }
  if (!imgs.length) return null;
  let res;
  try {
    const r = await ai.ask(revisarP(ch, sc, imgs), { json: true, vision: true, max: 3000, log });
    res = parseJSON(r.text).imagenes || [];
  } catch (e) { log('Revisor de imágenes no disponible (' + e.message.slice(0, 80) + ')'); return null; }
  const notas = [];
  let rehechas = 0;
  for (const [k, x] of imgs.entries()) {
    const v = res.find(o => +o.n === k + 1) || res[k] || {};
    const nota = Math.round(+v.nota || 0);
    notas.push(nota);
    sc[x.i]._nota = nota;
    if (nota && nota < 7 && v.nuevo_prompt && rehechas < maxRegen) {
      log(`Escena ${x.i + 1}: imagen con nota ${nota}/10 (${String(v.problema || 'no coincide').slice(0, 80)}); la vuelvo a crear`);
      sc[x.i].prompt_imagen = String(v.nuevo_prompt);
      try { if (await regen(x.i, sc[x.i].prompt_imagen)) rehechas++; } catch (e) { log(`Escena ${x.i + 1}: no se pudo rehacer (${e.message.slice(0, 60)})`); }
    }
  }
  const prom = notas.filter(Boolean).reduce((a, b) => a + b, 0) / (notas.filter(Boolean).length || 1);
  log(`Revisor de imágenes: coherencia promedio ${prom.toFixed(1)}/10${rehechas ? `, ${rehechas} imagen(es) rehecha(s)` : ''}`);
  return { promedio: +prom.toFixed(1), rehechas };
}

module.exports = { dirigir, revisarImagenes, direccionP, revisarP };
