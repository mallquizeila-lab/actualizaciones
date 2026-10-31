// Clonar voces desde tus videos reeditados (solo voces tuyas o con permiso).
//  1) frases(): transcribe el video original y devuelve cada frase con su tiempo.
//  2) clip(): recorta una frase para escucharla en el panel.
//  3) guardar(): une las frases elegidas (de UNA sola persona), limpia el ruido y la guarda en
//     "Mis voces" con la confirmación de permiso, igual que una voz grabada.
const fs = require('fs'), path = require('path');
const { ff, uid, DATA } = require('./util');
const { db, saveAll, job } = require('./store');
const tts = require('./tts');

function fuente(j) {
  if (!j || j.kind !== 'reedit' || !j.source || !fs.existsSync(j.source)) throw new Error('El video original ya no está disponible');
  return { src: j.source, ini: j.segment?.inicio || 0, fin: j.segment?.fin || null };
}

async function frases(jobId, log = () => {}) {
  const j = job(jobId), { src, ini, fin } = fuente(j);
  if (!j.vozFrases) {
    const tr = await require('./transcribe').transcribir(src, log);
    if (!tr?.frases?.length) throw new Error('No encontré voces en este video (o falta Whisper: ejecuta instalar_ia_local.bat)');
    j.vozFrases = tr.frases.filter(f => f.fin > ini && (!fin || f.inicio < fin) && f.fin - f.inicio >= 0.6)
      .map(f => ({ inicio: +f.inicio.toFixed(2), fin: +f.fin.toFixed(2), texto: String(f.texto).trim() })).slice(0, 80);
    saveAll.jobs();
  }
  return j.vozFrases;
}

async function clip(jobId, i) {
  const j = job(jobId), { src } = fuente(j), f = (j.vozFrases || [])[+i];
  if (!f) throw new Error('Frase no encontrada');
  const name = `vf-${j.id}-${i}.mp3`, out = path.join(DATA, 'cache', name);
  if (!fs.existsSync(out)) await ff(['-ss', String(Math.max(0, f.inicio - 0.05)), '-to', String(f.fin + 0.1), '-i', src, '-vn', '-ac', '1', '-ar', '24000', out]);
  return '/files/cache/' + name;
}

async function guardar(o) {
  const j = job(o.jobId), { src } = fuente(j);
  const name = String(o.name || '').trim().slice(0, 40), owner = String(o.owner || '').trim().slice(0, 60);
  if (!name || !owner) throw new Error('Escribe el nombre de la voz y de quién es');
  if (o.consent !== true) throw new Error('Debes confirmar que es tu voz, una voz con permiso o una voz sintética que tu plan te deja usar (no imitaciones de personas o personajes famosos)');
  const sel = [...new Set((o.frases || []).map(Number))].map(i => (j.vozFrases || [])[i]).filter(Boolean);
  const total = sel.reduce((a, f) => a + (f.fin - f.inicio), 0);
  if (total < 10) throw new Error(`Elige más frases de la misma persona: tienes ${total.toFixed(0)} s y hacen falta al menos 10 s (ideal 15 a 30 s)`);
  const tmp = path.join(DATA, 'cache', 'vclon-' + uid() + '.wav');
  // Une las frases elegidas y limpia: corta graves/agudos de la música y reduce el ruido de fondo.
  const parts = sel.map((f, k) => `[0:a]atrim=${Math.max(0, f.inicio - 0.05).toFixed(2)}:${(f.fin + 0.08).toFixed(2)},asetpts=PTS-STARTPTS[p${k}]`);
  await ff(['-i', src, '-filter_complex', `${parts.join(';')};${sel.map((_, k) => `[p${k}]`).join('')}concat=n=${sel.length}:v=0:a=1,highpass=f=80,lowpass=f=9000,afftdn=nf=-25[a]`, '-map', '[a]', '-ac', '1', '-ar', '24000', tmp]);
  const id = uid(), out = path.join(DATA, 'voces', id + '.wav');
  try {
    const r = await tts.prepareSample(tmp, out);
    db.voices.push({ id, name, owner, gender: o.gender === 'F' ? 'F' : 'M', seconds: r.duration, consentAt: new Date().toISOString(), origen: { video: j.title || '', jobId: j.id } });
    saveAll.voices();
    return { ok: 1, id, seconds: r.duration };
  } catch (e) { fs.rmSync(out, { force: true }); throw e; }
  finally { fs.rmSync(tmp, { force: true }); }
}

// ---------- Clonación automática ----------
// Tono (frecuencia fundamental) de una frase: autocorrelación sobre el audio a 16 kHz.
async function tono(src, f) {
  const buf = await require('./util').run('ffmpeg', ['-v', 'error', '-ss', String(f.inicio), '-to', String(f.fin), '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], { encoding: 'buffer' });
  const x = new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2)), N = 640, hop = 640, f0s = [];
  for (let s0 = 0; s0 + N < x.length; s0 += hop) {
    let e = 0; for (let i = 0; i < N; i++) e += x[s0 + i] * x[s0 + i];
    if (e / N < 250000) continue; // silencio
    let best = 0, lag = 0;
    for (let L = 32; L <= 228; L++) { // 70 Hz a 500 Hz
      let c = 0, e2 = 0; for (let i = 0; i < N - L; i++) { c += x[s0 + i] * x[s0 + i + L]; e2 += x[s0 + i + L] * x[s0 + i + L]; }
      const r = c / Math.sqrt(e * e2 + 1); if (r > best) { best = r; lag = L; }
    }
    if (best > 0.55 && lag) f0s.push(16000 / lag);
  }
  if (f0s.length < 3) return 0;
  f0s.sort((a, b) => a - b);
  return f0s[Math.floor(f0s.length / 2)];
}

// Agrupa las frases por tono: cada grupo es una voz distinta del video.
async function grupos(j) {
  const { src } = fuente(j);
  // Con las 30 frases más largas basta para separar las voces (más rápido, mismo resultado).
  const fr = (j.vozFrases || []).filter(f => f.fin - f.inicio >= 1).sort((a, b) => (b.fin - b.inicio) - (a.fin - a.inicio)).slice(0, 30);
  const conTono = [];
  for (const f of fr) { const t = await tono(src, f).catch(() => 0); if (t) conTono.push({ i: j.vozFrases.indexOf(f), f, t }); }
  conTono.sort((a, b) => a.t - b.t);
  const gs = [];
  for (const x of conTono) { const g = gs[gs.length - 1]; if (g && Math.log(x.t / g[g.length - 1].t) < Math.log(1.16)) g.push(x); else gs.push([x]); }
  return gs.map(g => {
    const hz = g[Math.floor(g.length / 2)].t, dur = g.reduce((a, x) => a + x.f.fin - x.f.inicio, 0);
    const largas = g.slice().sort((a, c) => (c.f.fin - c.f.inicio) - (a.f.fin - a.f.inicio));
    const frases = largas.reduce((a, x) => (a.d < 30 ? { d: a.d + x.f.fin - x.f.inicio, l: [...a.l, x.i] } : a), { d: 0, l: [] }).l;
    return { hz: Math.round(hz), dur: Math.round(dur), tipo: hz < 140 ? 'grave' : hz < 220 ? 'media' : 'aguda', gender: hz < 165 ? 'M' : 'F', frases, muestra: largas[0].i };
  }).filter(x => x.dur >= 12).sort((a, b) => b.dur - a.dur).slice(0, 4);
}
// Voces ya guardadas con un tono parecido (para no clonar repetidas).
const parecida = hz => db.voices.filter(v => v.origen?.hz && Math.abs(Math.log(v.origen.hz / hz)) < Math.log(1.08)).map(v => v.name);

// Propuesta: detecta las voces y pregunta en el panel si las quieres clonar.
async function proponer(j, ch, log = () => {}) {
  if (j.vozPregunta || db.voices.some(v => v.origen?.jobId === j.id)) return;
  const gs = await grupos(j);
  if (!gs.length) return;
  j.vozGrupos = gs.map((g, k) => ({ ...g, id: k, parecidaA: parecida(g.hz) }));
  j.vozPregunta = 'pendiente';
  saveAll.jobs();
  log(`🎤 Encontré ${gs.length} voz(ces) en este video. Decide en Videos o en Reeditar si quieres clonarlas.`);
}
async function responder(o) {
  const j = job(o.jobId);
  if (!j?.vozGrupos) throw new Error('No hay voces para clonar en este video');
  if (o.no) { j.vozPregunta = 'no'; saveAll.jobs(); return { ok: 1, n: 0 }; }
  if (o.consent !== true) throw new Error('Confirma que las voces son tuyas, con permiso o sintéticas con licencia');
  const ch = db.channels.find(c => c.id === j.channelId) || {};
  const hechas = [];
  for (const x of o.grupos || []) {
    const g = j.vozGrupos.find(y => y.id === +x.id);
    if (!g) continue;
    const r = await guardar({ jobId: j.id, frases: g.frases, name: String(x.name || `${ch.name || 'Video'} · voz ${g.tipo}`).slice(0, 40), owner: 'Videos del canal ' + (ch.name || ''), gender: g.gender, consent: true });
    const v = db.voices.find(y => y.id === r.id); Object.assign(v.origen, { canal: ch.id, hz: g.hz }); saveAll.voices();
    hechas.push(v.name);
  }
  j.vozPregunta = 'hecho'; saveAll.jobs();
  return { ok: 1, n: hechas.length, voces: hechas };
}
async function muestra(jobId, gid) { const j = job(jobId), g = (j?.vozGrupos || []).find(y => y.id === +gid); if (!g) throw new Error('Voz no encontrada'); return clip(jobId, g.muestra); }

// Clonación automática (sin preguntar): mismo análisis, guarda todo lo que no esté repetido.
async function auto(j, ch, log = () => {}) {
  if (!ch.autoClone || !ch.autoCloneConsentAt) return [];
  if (db.voices.some(v => v.origen?.jobId === j.id)) return [];
  if (db.voices.filter(v => v.origen?.canal === ch.id).length >= 30) { log('Clonación automática: ya hay 30 voces de este canal (borra las que no uses)'); return []; }
  const { src } = fuente(j);
  const fr = (j.vozFrases || []).filter(f => f.fin - f.inicio >= 1);
  if (fr.reduce((a, f) => a + f.fin - f.inicio, 0) < 12) return [];
  const conTono = [];
  for (const [i, f] of fr.entries()) { const t = await tono(src, f).catch(() => 0); if (t) conTono.push({ i: j.vozFrases.indexOf(f), f, t }); }
  conTono.sort((a, b) => a.t - b.t);
  const grupos = [];
  for (const x of conTono) { const g = grupos[grupos.length - 1]; if (g && Math.log(x.t / g[g.length - 1].t) < Math.log(1.16)) g.push(x); else grupos.push([x]); }
  const buenos = grupos.map(g => ({ g, dur: g.reduce((a, x) => a + x.f.fin - x.f.inicio, 0), hz: g[Math.floor(g.length / 2)].t })).filter(x => x.dur >= 12 && !parecida(x.hz).length).sort((a, b) => b.dur - a.dur).slice(0, 3);
  const hechas = [];
  for (const [k, b] of buenos.entries()) {
    const tipo = b.hz < 140 ? 'grave' : b.hz < 220 ? 'media' : 'aguda';
    try {
      // Hasta 30 s: las frases más largas del grupo
      const sel = b.g.slice().sort((a, c) => (c.f.fin - c.f.inicio) - (a.f.fin - a.f.inicio)).reduce((a, x) => (a.d < 30 ? { d: a.d + x.f.fin - x.f.inicio, l: [...a.l, x.i] } : a), { d: 0, l: [] }).l;
      const r = await guardar({ jobId: j.id, frases: sel, name: `${ch.name} · voz ${tipo} ${db.voices.filter(v => v.origen?.canal === ch.id).length + 1}`.slice(0, 40), owner: 'Videos del canal ' + ch.name, gender: b.hz < 165 ? 'M' : 'F', consent: true });
      const v = db.voices.find(x => x.id === r.id); v.origen.canal = ch.id; v.origen.auto = true; v.origen.hz = Math.round(b.hz); saveAll.voices();
      hechas.push(v.name);
    } catch (e) { log('Clonación automática: ' + e.message.slice(0, 100)); }
  }
  if (hechas.length) log(`🎤 Voces clonadas automáticamente: ${hechas.join(', ')} (en Voces → Mis voces)`);
  return hechas;
}

// Para videos reeditados antes: transcribe, detecta las voces y deja la pregunta lista.
async function buscar(jobId) {
  const j = job(jobId);
  await frases(jobId);
  const ch = db.channels.find(c => c.id === j.channelId) || {};
  if (j.vozPregunta === 'no' || j.vozPregunta === 'hecho') delete j.vozPregunta;
  await proponer(j, ch);
  if (j.vozPregunta !== 'pendiente') throw new Error('No encontré voces con suficiente audio (al menos 12 s de una misma voz). Prueba con "Clonar voz de este video" y elige las frases a mano.');
  return { ok: 1, n: j.vozGrupos.length };
}

module.exports = { frases, clip, guardar, auto, tono, grupos, proponer, responder, muestra, buscar };
