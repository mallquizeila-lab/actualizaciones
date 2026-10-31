// Transcribe videos propios con tiempos por palabra.
// 1) Groq (Whisper large en la nube, gratis con tu clave, muy rápido) si hay GROQ_API_KEY.
// 2) Whisper en tu PC (instalar_ia_local.bat) como respaldo.
const fs = require('fs'), path = require('path');
const { E, ff, DATA, uid } = require('./util');
const tts = require('./tts');

async function groq(audio) {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(audio)]), 'audio.mp3');
  fd.append('model', 'whisper-large-v3-turbo');
  fd.append('language', 'es');
  fd.append('response_format', 'verbose_json');
  fd.append('timestamp_granularities[]', 'word');
  fd.append('timestamp_granularities[]', 'segment');
  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST', headers: { authorization: 'Bearer ' + E.GROQ_API_KEY }, body: fd, signal: AbortSignal.timeout(300000),
  });
  if (!r.ok) throw new Error('Groq ' + r.status + ': ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return {
    texto: j.text || '',
    frases: (j.segments || []).map(s => ({ inicio: s.start, fin: s.end, texto: String(s.text).trim() })),
    palabras: (j.words || []).map(w => ({ texto: String(w.word).trim(), inicio: w.start, fin: w.end })).filter(w => w.texto),
  };
}

// video -> { texto, frases[], palabras[] } o null si no tiene voz / no hay transcriptor.
async function transcribir(video, log = () => {}) {
  const tmp = path.join(DATA, 'cache', 'tr-' + uid() + '.mp3');
  try {
    await ff(['-i', video, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k', tmp]);
  } catch (e) { log('El video no tiene audio que transcribir'); return null; }
  try {
    if (E.GROQ_API_KEY && fs.statSync(tmp).size < 24e6) {
      try { log('Transcribiendo con Groq'); return await groq(tmp); }
      catch (e) { log('Groq no pudo transcribir (' + e.message.slice(0, 80) + '); uso Whisper local'); }
    }
    if (!tts.local().whisper) { log('Sin transcriptor: pon tu clave de Groq o instala la IA local'); return null; }
    log('Transcribiendo con Whisper en tu PC');
    const out = tmp + '.json';
    await tts.batch('transcribe', [{ audio: tmp, out }], log);
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  } finally { for (const f of [tmp, tmp + '.json']) fs.rmSync(f, { force: true }); }
}

module.exports = { transcribir };
