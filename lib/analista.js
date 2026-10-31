// Analista de calidad: después de cada video, Gemini "mira" el video terminado junto con su guion,
// le pone nota, señala qué falló y saca lecciones. Las lecciones se guardan en el "Manual del canal"
// (ch.manual) y se usan en los siguientes guiones: así cada video sale mejor que el anterior.
const fs = require('fs'), path = require('path');
const { run, secs, parseJSON, DATA } = require('./util');
const { saveAll } = require('./store');
const ai = require('./ai');

async function frames(file, n = 8) {
  const dur = await secs(file);
  const end = Math.max(2, dur - 6); // sin el cierre (CTA)
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = 0.4 + (end - 0.4) * i / (n - 1);
    try {
      const b = await run('ffmpeg', ['-v', 'error', '-ss', t.toFixed(2), '-i', file, '-frames:v', '1', '-vf', 'scale=432:-2', '-q:v', '5', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-'], { encoding: 'buffer' });
      if (b.length) out.push({ t, b64: b.toString('base64') });
    } catch (e) {}
  }
  return { dur, frames: out };
}

function guionDe(j) {
  const s = j.script || {};
  if (s.scenes) return s.scenes.map((x, i) => `${i + 1}. ${x.speaker ? x.speaker + ': ' : ''}${x.text}`).join('\n');
  return s.narration || j.spoken || (j.visual ? 'Video sin narración. Contenido: ' + j.visual.descripcion : 'Sin guion disponible');
}

const reviewP = (ch, j, F) => [{ role: 'user', content: [
  { type: 'text', text: `Eres un editor exigente de Shorts/TikTok/Reels virales. Evalúa este video TERMINADO del canal "${ch.name}" (nicho: ${ch.niche}).
Tipo: ${j.kind === 'reedit' ? 'video propio reeditado' : 'video creado desde cero con IA'}. Duración: ${F.dur.toFixed(0)} s.
Título: ${j.title || ''}
Gancho en pantalla: ${j.script?.hook || ''}
GUION / LO QUE SE DICE (en orden):
${guionDe(j).slice(0, 4000)}
Te paso ${F.frames.length} fotogramas en orden (${F.frames.map(f => f.t.toFixed(0) + 's').join(', ')}).
Califica del 1 al 10 (sé estricto: 10 = nivel de los mejores virales):
- "coherencia": ¿lo que se ve coincide con lo que se dice en ese momento?
- "gancho": ¿el primer segundo obliga a quedarse?
- "visual": calidad, variedad y claridad de las imágenes y del texto en pantalla (legible, sin tapar lo importante).
- "guion": ¿un solo tema bien desarrollado, claro, útil y con buen cierre?
- "nota": nota general.
Señala hasta 5 problemas concretos con su solución, y saca de 1 a 3 LECCIONES generales y accionables para los próximos videos del canal (ej. "Mostrar el ingrediente en primer plano cuando se nombra").
MANUAL ACTUAL DEL CANAL (lecciones ya aprendidas):
${(ch.manual || []).map(m => '- ' + m.t).join('\n') || '(vacío)'}
Devuelve también "manual": el manual actualizado, máximo 15 reglas cortas: conserva las que siguen siendo válidas, fusiona las repetidas y agrega las nuevas importantes.
Devuelve SOLO JSON: {"nota":7,"coherencia":7,"gancho":7,"visual":7,"guion":7,"resumen":"1 frase","problemas":[{"momento":"5s","problema":"...","solucion":"..."}],"lecciones":["..."],"manual":["..."]}` },
  ...F.frames.map(f => ({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + f.b64 } })),
] }];

async function analizar(ch, j, log = () => {}) {
  if (!j.result?.files) return null;
  const file = path.join(DATA, 'videos', j.result.dir, j.result.files.youtube || j.result.files.social || '');
  if (!fs.existsSync(file)) return null;
  log('Analista: revisando la calidad del video terminado');
  const F = await frames(file);
  if (!F.frames.length) return null;
  const r = await ai.ask(reviewP(ch, j, F), { json: true, vision: true, max: 3000, log });
  const v = parseJSON(r.text);
  const n = x => Math.max(1, Math.min(10, Math.round(+x || 0))) || null;
  j.review = {
    nota: n(v.nota), coherencia: n(v.coherencia), gancho: n(v.gancho), visual: n(v.visual), guion: n(v.guion),
    resumen: String(v.resumen || '').slice(0, 300),
    problemas: (v.problemas || []).slice(0, 5).map(p => ({ momento: String(p.momento || ''), problema: String(p.problema || ''), solucion: String(p.solucion || '') })),
    lecciones: (v.lecciones || []).slice(0, 3).map(String), at: new Date().toISOString(),
  };
  if (Array.isArray(v.manual) && v.manual.length) {
    ch.manual = v.manual.slice(0, 15).map(t => String(t).trim().slice(0, 200)).filter(Boolean).map(t => ({ t }));
    ch.manualAt = new Date().toISOString();
    saveAll.channels();
  }
  ch.notas = [...(ch.notas || []), j.review.nota].slice(-30);
  saveAll.channels();
  log(`Analista: nota ${j.review.nota}/10 (coherencia ${j.review.coherencia}, gancho ${j.review.gancho}, visual ${j.review.visual}, guion ${j.review.guion}). ${j.review.resumen}`);
  return j.review;
}

module.exports = { analizar, reviewP, frames };
