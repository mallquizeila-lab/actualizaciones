// Doblaje: da voz a los personajes de TUS videos.
//  - La IA mira fotogramas con su segundo exacto, reconoce a cada personaje y escribe diálogos
//    sincronizados con lo que pasa en pantalla (graciosos si el video es de comedia).
//  - Reparto del canal (ch.reparto): cada personaje queda registrado con su tipo de voz y su voz base,
//    así el "mono con lentes" suena SIEMPRE igual en todos tus videos.
//  - Si el video ya tenía voces, se reescribe la historia con otras palabras y voces nuevas.
const fs = require('fs'), path = require('path');
const { run, ff, secs, parseJSON, uid } = require('./util');
const { saveAll } = require('./store');
const ai = require('./ai');
const V = require('./voces');
const tts = require('./tts');

async function framesAt(src, ini, dur, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = dur * (k + 0.5) / n;
    try {
      const b = await run('ffmpeg', ['-v', 'error', '-ss', (ini + t).toFixed(2), '-i', src, '-frames:v', '1', '-vf', 'scale=448:-2', '-q:v', '5', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-'], { encoding: 'buffer' });
      if (b.length) out.push({ t, b64: b.toString('base64') });
    } catch (e) {}
  }
  return out;
}

const doblajeP = (ch, F, dur, tr, castFijo) => [{ role: 'user', content: [
  { type: 'text', text: `Eres guionista y director de doblaje de videos cortos virales en español latino. Canal "${ch.name}" (nicho: ${ch.niche}; tono: ${ch.tone || 'divertido y cercano'}).
Te paso ${F.length} fotogramas EN ORDEN de un video de ${dur.toFixed(1)} s, cada uno con su segundo: ${F.map((f, i) => `#${i + 1}=${f.t.toFixed(1)}s`).join(', ')}.
${tr?.frases?.length ? `El video ya tenía estas voces (REESCRÍBELAS con otras palabras y más gracia, misma historia, para que sea original):\n${tr.frases.map(f => `[${f.inicio.toFixed(1)}s] ${f.texto}`).join('\n').slice(0, 3000)}` : 'El video NO tiene voces: tú creas lo que dicen.'}
${castFijo?.length ? `PERSONAJES DE ESTE VIDEO (ya elegidos por el dueño; usa EXACTAMENTE estos nombres y solo ellos, más "Narrador" si hace falta):\n${castFijo.map(c => `- ${c.nombre}: ${c.descripcion}`).join('\n')}\n` : ''}REPARTO YA CONOCIDO DEL CANAL (si aparece uno de estos, usa EXACTAMENTE su "id"; si es nuevo, deja id vacío):
${(ch.reparto || []).map(r => `- id ${r.id}: ${r.nombre} — ${r.descripcion}`).join('\n') || '(vacío)'}
TAREAS:
1. Identifica a los personajes que actúan (animales, frutas, personas...). Ponle a cada uno un nombre corto y gracioso y una descripción visual de 6 a 12 palabras.
2. Escribe un diálogo con hilo y remate (o narración + diálogo) que coincida con lo que se VE en cada momento: quien habla debe estar en pantalla y haciendo algo acorde.
3. DURACIÓN EXACTA (muy importante): el video dura ${dur.toFixed(1)} s y NO se puede alargar. Escribe como MÁXIMO ${Math.max(6, Math.floor(dur * 2.0))} palabras EN TOTAL sumando todas las líneas (unas 2 palabras por segundo, con pausas). Frases cortas (máx 12 palabras). La última línea debe terminar antes del segundo ${Math.max(1, dur - 1).toFixed(1)}. El primer diálogo empieza antes del segundo 1.5 y engancha.
4. Para cada personaje NUEVO elige un tipo de voz acorde a su aspecto y personalidad: ${V.PRESETS.map(p => p.id).join(', ')}. Si hay narrador, ponlo como personaje "Narrador".
5. Sin groserías, sin burlas ofensivas, apto para toda la familia.
Además describe el video para el resto del sistema: "descripcion" (3 a 5 frases concretas de lo que se ve), "encaja_con_canal" (true/false según el nicho) y "motivo" (si no encaja).
Devuelve SOLO JSON: {"descripcion":"...","encaja_con_canal":true,"motivo":"","personajes":[{"id":"","nombre":"...","descripcion":"...","genero":"M|F","voz":"tipo de voz"}],"lineas":[{"inicio":0.5,"personaje":"nombre exacto","texto":"..."}],"tema":"de qué trata en una frase"}` },
  ...F.map(f => ({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + f.b64 } })),
] }];

// Registra o reutiliza personajes en el reparto del canal y devuelve el mapa nombre -> entrada.
function castear(ch, personajes) {
  ch.reparto = ch.reparto || [];
  const map = {};
  for (const p of personajes || []) {
    let r = p.id && ch.reparto.find(x => x.id === p.id);
    if (!r) {
      const preset = V.byId(p.voz) ? p.voz : (p.genero === 'F' ? 'mujer' : 'hombre');
      const pr = V.byId(preset);
      // Voz base: distinta para cada personaje del reparto con el mismo tipo (que no suenen iguales).
      const usadas = ch.reparto.filter(x => x.preset === preset).map(x => x.voice);
      const voice = pr.voces.find(v => !usadas.includes(v)) || pr.voces[ch.reparto.length % pr.voces.length];
      r = { id: uid(), nombre: String(p.nombre || 'Personaje').slice(0, 40), descripcion: String(p.descripcion || '').slice(0, 160), preset, voice, nuevo: true };
      ch.reparto.push(r);
    }
    map[String(p.nombre || r.nombre).toLowerCase()] = r;
    map[r.nombre.toLowerCase()] = r;
  }
  ch.reparto = ch.reparto.slice(-40);
  saveAll.channels();
  return map;
}

// Coloca cada línea en su segundo sin pisarse; devuelve dónde termina la última.
async function colocar(items, juntas = false) {
  let fin = 0;
  for (const it of items) {
    it.len = await secs(it.file);
    it.at = juntas ? (fin ? fin + 0.1 : Math.min(it.at, 0.4)) : Math.max(it.at, fin + 0.12);
    fin = it.at + it.len;
  }
  return fin;
}
// Acelera una voz (hasta 25-30%, suena natural) y ajusta los tiempos de sus palabras.
async function acelerar(it, f, d) {
  const out = it.base + '_r.wav';
  await ff(['-y', '-i', it.file, '-af', `atempo=${f.toFixed(3)}`, out]);
  it.file = out;
  if (it.words) it.words = it.words.map(w => ({ ...w, inicio: w.inicio / f, fin: w.fin / f }));
}
async function ajustarAlVideo(items, dur0, d, log, ch) {
  const lim = Math.max(1, dur0 - 0.25);
  let fin = await colocar(items);
  if (fin <= lim) return;
  fin = await colocar(items, true); // primero: quitar pausas largas
  if (fin <= lim) { log('Diálogos ajustados al largo del video (menos pausas)'); return; }
  let f = fin / lim;
  if (f > 1.25) { // demasiado largo: la IA acorta las líneas y se vuelven a generar
    const total = items.reduce((a, it) => a + it.text.split(/\s+/).length, 0), meta = Math.max(4, Math.floor(total / f * 0.9));
    log(`Los diálogos duran ${fin.toFixed(0)} s y el video ${dur0.toFixed(0)} s: los acorto a unas ${meta} palabras`);
    try {
      const r = await ai.ask([{ role: 'user', content: `Acorta estos diálogos de un video de ${dur0.toFixed(0)} s para que sumen como máximo ${meta} palabras EN TOTAL, manteniendo la historia, el humor, el orden y la MISMA cantidad de líneas (${items.length}). Devuelve SOLO JSON: {"lineas":["..."]}\n${items.map((it, i) => `${i + 1}. ${it.quien}: ${it.text}`).join('\n')}` }], { json: true, max: 1500, log });
      const nuevas = parseJSON(r.text).lineas || [];
      if (nuevas.length === items.length) {
        nuevas.forEach((t, i) => { if (String(t || '').trim()) { items[i].text = String(t).replace(/^[^:]{1,25}:\s*/, '').trim(); delete items[i].file; delete items[i].words; } });
        await tts.synthAll(items, log); await tts.timings(items, log);
        fin = await colocar(items, true); f = fin / lim;
      }
    } catch (e) { log('No pude acortar los diálogos con la IA (' + e.message.slice(0, 60) + ')'); }
  }
  if (f > 1.001) { // un poco más rápido (máx 30%)
    const k = Math.min(1.3, f);
    for (const it of items) await acelerar(it, k, d);
    fin = await colocar(items, true);
    log(`Voces un ${Math.round((k - 1) * 100)}% más rápidas para que quepan en el video`);
  }
  // Último recurso: las líneas que igual no caben se quitan (nunca se repite el video).
  while (items.length > 1 && fin > dur0 - 0.05) { const x = items.pop(); log(`Quité una línea que no cabía: "${x.text.slice(0, 40)}"`); fin = items[items.length - 1].at + items[items.length - 1].len; }
}

// prev: diálogos ya escritos (para rehacer solo las voces). ov: { nombre: tipo de voz } elegido a mano.
async function doblar({ ch, src, ini, dur0, tr, d, log = () => {}, prev = null, ov = null, castFijo = null }) {
  let o = prev;
  if (!o) {
    const n = Math.max(8, Math.min(16, Math.round(dur0 / 3)));
    const F = await framesAt(src, ini, dur0, n);
    if (!F.length) throw new Error('No pude leer el video para el doblaje');
    log('Doblaje: la IA mira el video, reconoce a los personajes y escribe sus diálogos');
    o = parseJSON((await ai.ask(doblajeP(ch, F, dur0, tr, castFijo), { json: true, vision: true, max: 4000, log })).text);
  } else log('Doblaje: mismos diálogos, voces nuevas');
  const lineas = (o.lineas || []).filter(l => l && String(l.texto || '').trim()).sort((a, b) => (+a.inicio || 0) - (+b.inicio || 0));
  if (!lineas.length) throw new Error('La IA no escribió diálogos');
  const cast = castear(ch, o.personajes);
  (o.personajes || []).forEach(p => { const r = cast[String(p.nombre || '').toLowerCase()]; if (r) p.id = r.id; }); // para reutilizarlos
  // Voces elegidas a mano: se guardan en el reparto (ese personaje sonará así en los próximos videos).
  if (ov) for (const r of new Set(Object.values(cast))) {
    const x = ov[r.nombre];
    if (x && String(x).startsWith('clon:')) { r.voice = x; r.preset = ''; }
    else if (x && V.byId(x) && x !== r.preset) { r.preset = x; r.voice = ''; }
  }
  saveAll.channels();
  const nuevos = Object.values(cast).filter(r => r.nuevo);
  nuevos.forEach(r => delete r.nuevo);
  log(`Reparto: ${[...new Set(Object.values(cast))].map(r => `${r.nombre} (${V.byId(r.preset)?.nombre || r.preset})`).join(', ')}${nuevos.length ? ` · ${nuevos.length} personaje(s) nuevo(s) guardado(s) en el reparto del canal` : ''}`);

  // Voces de cada línea
  const items = lineas.map((l, i) => {
    const r = cast[String(l.personaje || '').toLowerCase()] || Object.values(cast)[0];
    const v = !r ? { voice: ch.voice } : String(r.voice).startsWith('clon:') ? { voice: r.voice, rate: 0, pitch: 0 } : V.aplicar({ voice: r.voice, rate: 0, pitch: 0 }, r.preset, tts.catalog(), r.nombre);
    return { text: String(l.texto).trim(), base: path.join(d, 'dub' + i), v, at: Math.max(0, +l.inicio || 0), quien: r?.nombre || '' };
  });
  await tts.synthAll(items, log);
  await tts.timings(items, log);
  // Que las voces quepan en el video: nunca se alarga ni se repite el video.
  await ajustarAlVideo(items, dur0, d, log, ch);
  const dur = dur0;
  const out = path.join(d, 'doblaje.wav');
  const args = [], fl = [];
  items.forEach((it, k) => { args.push('-i', it.file); const ms = Math.round(it.at * 1000); fl.push(`[${k}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[d${k}]`); });
  fl.push(`${items.map((_, k) => `[d${k}]`).join('')}amix=inputs=${items.length}:duration=longest:normalize=0,apad,atrim=0:${dur.toFixed(2)},loudnorm=I=-16:TP=-1.5:LRA=11[a]`);
  await ff([...args, '-filter_complex', fl.join(';'), '-map', '[a]', '-ar', '44100', '-ac', '2', out]);
  // Palabras con su tiempo en el video (para subtítulos karaoke y efectos por palabra)
  const words = [];
  for (const it of items) {
    if (it.words?.length) it.words.forEach(w => words.push({ ...w, inicio: w.inicio + it.at, fin: w.fin + it.at }));
    else { const ws = it.text.split(/\s+/), step = it.len / ws.length; ws.forEach((w, i) => words.push({ texto: w, inicio: it.at + i * step, fin: it.at + (i + 1) * step - 0.03 })); }
  }
  const frases = items.map(it => ({ inicio: it.at, fin: it.at + it.len, texto: (it.quien ? it.quien + ': ' : '') + it.text }));
  // Imagen de cada personaje (el momento en que habla por primera vez) para elegir su voz en el panel.
  const voces = [];
  for (const it of items) {
    if (!it.quien || voces.some(v => v.nombre === it.quien)) continue;
    const img = `voz_${voces.length}.jpg`;
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', (ini + Math.min(it.at + 0.3, dur0 - 0.1)).toFixed(2), '-i', src, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', path.join(d, img)]).catch(() => {});
    voces.push({ nombre: it.quien, img, preset: it.v.preset || '', voice: it.v.voice || '' });
  }
  return { data: { personajes: o.personajes, lineas: o.lineas, tema: o.tema, descripcion: o.descripcion, encaja_con_canal: o.encaja_con_canal, motivo: o.motivo }, voces, voice: out, words, text: items.map(it => it.text).join(' '), dur, frases, tema: o.tema || '', reparto: [...new Set(Object.values(cast))].map(r => r.nombre) };
}

module.exports = { doblar, doblajeP, castear };
