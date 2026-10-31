// Cola de producción: toma los videos pendientes uno por uno.
// Planificador nocturno: a la hora elegida crea los videos de mañana para los canales que toca.
const fs = require('fs'), path = require('path');
const { parseJSON, uid, day, addDays, pick, slug, DATA, ROOT } = require('./util');
const { db, saveAll, channel } = require('./store');
const ai = require('./ai');
const P = require('./prompts');
const { render } = require('./render');
const reeditMod = require('./reedit');
const analista = require('./analista');

const state = { running: false, current: null };

function newJob(ch, o = {}) {
  const j = {
    id: uid(), channelId: ch.id, topic: o.topic || '', format: o.format || '', character: o.character || '', inspiration: o.inspiration || null,
    kind: o.kind || 'nuevo', ...(o.desarmado ? { desarmado: o.desarmado } : {}), source: o.source || null, segment: o.segment || null, mode: o.mode || null, ...(o.transcript !== undefined ? { transcript: o.transcript } : {}), title: o.title || '',
    status: 'cola', publishDate: o.publishDate || day(), created: new Date().toISOString(), log: [],
  };
  db.jobs.push(j);
  saveAll.jobs();
  return j;
}

// Pide temas en lote (ahorra solicitudes del plan gratis) y los guarda en el canal.
async function nextTopic(ch, log) {
  ch.topicBank = ch.topicBank || [];
  if (!ch.topicBank.length) {
    log('Buscando temas nuevos con potencial');
    // Sin repetir: temas de este canal + los recientes de tus otros canales (que no salgan videos gemelos).
    const used = [...db.jobs.filter(j => j.channelId === ch.id && j.topic).map(j => j.topic),
      ...db.jobs.filter(j => j.channelId !== ch.id && j.topic).slice(-40).map(j => j.topic)];
    const r = await ai.ask(P.topicsP(ch, 6, used), { json: true, log });
    ch.topicBank = (parseJSON(r.text).topics || []).filter(t => t && t.topic);
    if (!ch.topicBank.length) throw new Error('La IA no propuso temas');
  }
  const t = ch.topicBank.shift();
  saveAll.channels();
  return t;
}

// Primer día libre del canal desde `from` (para repartir videos de la bandeja, 1 por día).
// Primer día con espacio libre: cada canal publica hasta "perDay" videos por día (1 a 3, cada uno a su hora).
const porDia = ch => Math.max(1, Math.min(3, +ch.perDay || 1));
const delDia = (ch, d) => db.jobs.filter(j => j.channelId === ch.id && j.publishDate === d && j.status !== 'dividido').length;
function nextFreeDate(ch, from = day()) {
  let d = from;
  while (delDia(ch, d) >= porDia(ch)) d = addDays(d, 1);
  return d;
}

async function produceReedit(j, ch, log) {
  const info = await reeditMod.probe(j.source);
  if (!j.segment && info.dur > 75 && ch.cutLong !== false) {
    log(`Video largo (${Math.round(info.dur)} s): la IA elige los mejores tramos para Shorts`);
    const shorts = await reeditMod.chooseShorts({ ch, j, log });
    let date = j.publishDate;
    shorts.forEach((x, k) => {
      if (k) date = nextFreeDate(ch, addDays(date, 1));
      const nj = newJob(ch, { kind: 'reedit', source: j.source, segment: { inicio: x.inicio, fin: x.fin }, mode: j.mode, transcript: j.transcript, title: x.titulo, topic: x.titulo, publishDate: date });
      if (j.warning) nj.warning = j.warning;
    });
    log(`Dividido en ${shorts.length} Shorts (quedaron en la cola)`);
    return 'dividido';
  }
  // Antes de reeditar, te pregunta qué voz ponerle a cada personaje (si el canal lo tiene activado).
  if (ch.askVoices !== false && !j.preparado && !j.revoice) {
    const pre = await reeditMod.preparar({ ch, j, log });
    j.preparado = true;
    if (pre.personajes.length) { j.pre = pre; log(`🎭 Encontré ${pre.personajes.length} personaje(s). Elige sus voces en Videos para seguir.`); return 'esperando'; }
  }
  const { s, result } = await reeditMod.reedit({ ch, j, log });
  if (j.pre) { try { fs.rmSync(path.join(DATA, 'videos', 'pre-' + j.id), { recursive: true, force: true }); } catch (e) {} delete j.pre; }
  j.script = s; j.seo = s.seo || {}; j.result = result;
  j.title = j.seo.youtube?.title || s.title || j.title; j.topic = j.topic || j.title;
  if (j.transcript?.frases) {
    j.spoken = j.transcript.frases.map(f => f.texto).join(' ').slice(0, 3000); // para el analista
    const a = j.segment?.inicio || 0, b = j.segment?.fin || Infinity;
    j.vozFrases = j.vozFrases || j.transcript.frases.filter(f => f.fin > a && f.inicio < b && f.fin - f.inicio >= 0.6).map(f => ({ inicio: +f.inicio.toFixed(2), fin: +f.fin.toFixed(2), texto: String(f.texto).trim() })).slice(0, 80);
  }
  delete j.transcript; // ya no hace falta guardarla
  writeTexts(j, ch);
  finRevoice(j);
  // Clonación automática de las voces del video (si el canal lo activó con su confirmación de permiso)
  if (j.vozFrases?.length) {
    try {
      if (ch.autoClone) await require('./clonar').auto(j, ch, log);
      else if (ch.askClone !== false) await require('./clonar').proponer(j, ch, log); // te pregunta antes de clonar
    } catch (e) { log('Voces del video: ' + e.message.slice(0, 100)); }
  }
}

// Después de rehacer las voces se borra el video anterior.
function finRevoice(j) {
  if (!j.revoice) return;
  const old = j.revoice.prevDir;
  if (old && old !== j.result?.dir) try { fs.rmSync(path.join(DATA, 'videos', old), { recursive: true, force: true }); } catch (e) {}
  delete j.revoice;
}

async function produce(j) {
  const ch = channel(j.channelId);
  if (!ch) throw new Error('El canal ya no existe');
  // Cada línea del registro lleva el tiempo transcurrido: así se ve qué paso es el lento.
  const t0 = Date.now(), mmss = () => { const s = Math.round((Date.now() - t0) / 1000); return `[${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}] `; };
  const log = m => { j.log.push(mmss() + m); saveAll.jobs(); };
  if (j.kind === 'reedit') return produceReedit(j, ch, log);
  // Continuar después de que elegiste las voces (videos desde cero).
  if (j.borrador) {
    const s = j.borrador; delete j.borrador; delete j.pre;
    if (j.ovPre) {
      s._ov = j.ovPre;
      for (const c of ch.characters || []) { const x = j.ovPre[c.name]; if (x && String(x).startsWith('clon:')) { c.voice = x; c.voicePreset = ''; } else if (x) c.voicePreset = x; }
      saveAll.channels();
    }
    log('Sigo con las voces que elegiste');
    return terminarNuevo(j, ch, s, log);
  }
  // Rehacer solo las voces: mismo guion y mismas imágenes, voces elegidas a mano.
  if (j.revoice && j.script) {
    log('Rehaciendo el video con las voces elegidas (mismo guion e imágenes)');
    const s = JSON.parse(JSON.stringify(j.script)); s._ov = j.revoice.map;
    for (const c of ch.characters || []) { // el personaje se queda con esa voz
      const x = j.revoice.map[c.name];
      if (x && String(x).startsWith('clon:')) { c.voice = x; c.voicePreset = ''; } else if (x) c.voicePreset = x;
    }
    saveAll.channels();
    const prev = j.result;
    const out = await render({ ch, s, log, reuseDir: j.revoice.prevDir, fondo: j.fondo });
    out.credits = prev?.credits || out.credits; out.aiImages = prev?.aiImages ?? out.aiImages;
    j.result = out; writeTexts(j, ch);
    finRevoice(j);
    return;
  }
  let r;
  if (j.desarmado) {
    const bp = require('./desarmar').get(j.desarmado.id);
    if (!bp?.bp) throw new Error('El video desarmado ya no existe');
    log(j.desarmado.modo === 'mio' ? 'Recreando tu video desde cero, mejorado' : 'Creando un video original con la técnica del video desarmado');
    r = await ai.ask(require('./desarmar').recrearP(ch, bp.bp, j.desarmado.modo, j.desarmado.notas), { json: true, log, max: 8000 });
  } else if (j.inspiration) {
    log('Analizando el viral y creando un guion original con su técnica');
    r = await ai.ask(P.inspireP(ch, j.inspiration.transcript, j.inspiration.notes), { json: true, log });
  } else {
    if (!j.topic) Object.assign(j, await nextTopic(ch, log));
    if (!j.format) j.format = pick(P.FORMATS);
    log('Tema: ' + j.topic + ' (' + j.format + ')');
    log('Escribiendo guion, título, descripción y etiquetas');
    r = await ai.ask(P.scriptP(ch, j), { json: true, log });
  }
  const s = parseJSON(r.text);
  if (j.desarmado) { j.topic = j.topic || s.title; }
  if (j.inspiration) { j.topic = s.topic || s.title; j.analysis = s.analysis || ''; log('Tema nuevo: ' + j.topic); }
  s.character = s.character || j.character;
  log('Guion listo (' + (ai.PROVIDERS[r.provider]?.label || 'IA') + ')');

  // Crítico: si el guion no llega a 8/10, se mejora antes de hacer el video.
  if (db.settings.critic !== false) {
    try {
      const c = parseJSON((await ai.ask(P.criticP(ch, s), { json: true, log })).text);
      j.critic = { nota: Math.round(+c.nota || 0), motivo: String(c.motivo || '').slice(0, 300) };
      if (j.critic.nota && j.critic.nota < 8 && Array.isArray(c.scenes) && c.scenes.length === s.scenes.length && c.scenes.every(t => typeof t === 'string' && t.trim())) {
        c.scenes.forEach((t, i) => { s.scenes[i].text = t; });
        if (c.hook) s.hook = String(c.hook);
        j.critic.mejorado = true;
        log(`Crítico: el guion sacó ${j.critic.nota}/10 (${j.critic.motivo}). Lo mejoré.`);
      } else log(`Crítico: guion aprobado con ${j.critic.nota}/10`);
    } catch (e) { log('Crítico no disponible (' + e.message.slice(0, 80) + ')'); }
  }

  j.issues = [];
  if (db.settings.factCheck) {
    log('Verificando datos');
    try {
      const f = parseJSON((await ai.ask(P.factP(ch, s), { json: true, log })).text);
      j.issues = (f.issues || []).filter(x => x && x.claim);
      if (Array.isArray(f.scenes) && f.scenes.length === s.scenes.length) f.scenes.forEach((t, i) => { if (typeof t === 'string' && t.trim()) s.scenes[i].text = t; });
      log(j.issues.length ? `Se corrigieron ${j.issues.length} frases dudosas (revísalas)` : 'Datos verificados sin problemas');
    } catch (e) { log('No se pudo verificar (' + e.message + '). Revisa el guion con cuidado.'); j.issues = [{ scene: 0, claim: 'Verificación no realizada', problem: e.message }]; }
  }

  // Antes de crear las imágenes y las voces, te pregunta qué voz ponerle a cada personaje que habla.
  if (ch.askVoices !== false && !j.preparado) {
    j.borrador = s; j.preparado = true;
    j.pre = { personajes: hablantes(ch, s), teniaVoces: false, audio: false, nuevo: true, descripcion: 'Guion listo: «' + (s.title || j.topic || '') + '»' };
    log(`🎭 Guion listo con ${j.pre.personajes.length} voz(ces). Elige cómo suena cada uno en Videos para seguir.`);
    return 'esperando';
  }
  return terminarNuevo(j, ch, s, log);
}

// Quién habla en el guion (con su imagen) para elegir su voz antes de crear el video.
function hablantes(ch, s) {
  const out = [], vistos = new Set();
  // Igual que al armar el video: en canales de personajes, una escena sin hablante la dice el personaje principal.
  const cs = ch.style === 'personaje' ? (ch.characters || []).filter(c => c.closed) : [];
  const by = n => cs.find(k => k.name.toLowerCase() === String(n || '').toLowerCase());
  const main = by(s.character) || cs[0] || null;
  for (const x of s.scenes || []) {
    const c = cs.length ? (by(x.speaker) || main) : null;
    const nombre = c ? c.name : 'Narrador';
    if (vistos.has(nombre)) continue; vistos.add(nombre);
    const auto = s.voces?.[nombre] || s.voces?.[nombre.toLowerCase()] || (nombre === 'Narrador' ? s.voces?.narrador : '');
    const sug = c ? (String(c.voice || '').startsWith('clon:') && !c.voicePreset ? c.voice : (c.voicePreset && c.voicePreset !== 'auto' ? c.voicePreset : auto)) : (ch.voicePreset && ch.voicePreset !== 'auto' ? ch.voicePreset : auto);
    out.push({ nombre, descripcion: c ? (c.description || 'Personaje del canal') : 'Voz que narra el video', genero: 'M', img: c?.closed ? '/files/chars/' + c.closed : fs.existsSync(path.join(DATA, 'logos', ch.id + '.png')) ? '/files/logos/' + ch.id + '.png' : '', sugerida: sug || 'hombre' });
  }
  return out;
}

async function terminarNuevo(j, ch, s, log) {
  // Sin cupo de imágenes con IA, las fotos de stock no coinciden con el guion: mejor esperar al día siguiente.
  const im = require('./imagenes'), modo = ch.images || 'mixto', escenas = (s.scenes || []).length;
  if (db.settings.waitAiImages !== false && modo !== 'stock' && im.ready() && im.cupo().quedanAprox < Math.min(escenas, modo === 'mixto' ? 3 : escenas)) {
    j.borrador = s; // se guarda el guion: mañana sigue desde aquí
    throw Object.assign(new Error(`Hoy se acabó el cupo de imágenes con IA (quedan ${im.cupo().quedanAprox}). Lo termino cuando se renueve para que las imágenes coincidan con el guion.`), { retryable: true, retryInMs: 4 * 3600000, maxRetries: 8 });
  }
  // Director visual: cada imagen debe mostrar exactamente lo que se dice en esa escena.
  if (db.settings.checkImages !== false) await require('./coherencia').dirigir(ch, s, log);

  const out = await render({ ch, s, log, fondo: j.fondo });
  if (s._coherencia) { j.coherencia = s._coherencia; delete s._coherencia; }
  j.script = s;
  j.seo = s.seo || {};
  j.result = out;
  j.title = j.seo.youtube?.title || s.title;
  writeTexts(j, ch);
  ch.lastProduced = new Date().toISOString();
  saveAll.channels();
}

const tagsLine = a => (a || []).map(t => '#' + String(t).replace(/^#/, '').replace(/\s+/g, '')).join(' ');

// Textos listos para copiar y pegar en cada plataforma.
function writeTexts(j, ch) {
  const y = j.seo.youtube || {}, t = j.seo.tiktok || {}, f = j.seo.facebook || {};
  const cred = j.result.credits.length ? '\n\nImágenes: ' + j.result.credits.join(', ') : '';
  // Las plataformas piden marcar el contenido realista hecho con IA.
  const aiNote = j.result.aiImages ? '\n\nAVISO: este video tiene imágenes generadas con IA. Si se ven realistas, marca "Contenido alterado o sintético" en YouTube Studio y la etiqueta "Contenido generado por IA" en TikTok.' : '';
  const P = require('./publish');
  j.horas = { youtube: P.horaDe(j, ch, 'youtube'), tiktok: P.horaDe(j, ch, 'tiktok'), facebook: P.horaDe(j, ch, 'facebook') }; // hora de cada plataforma para este video
  const d = path.join(DATA, 'videos', j.result.dir);
  fs.writeFileSync(path.join(d, 'subir_youtube.txt'),
    `TÍTULO:\n${y.title}\n\nOTROS TÍTULOS:\n${(y.alt_titles || []).join('\n')}\n\nDESCRIPCIÓN:\n${y.description}\n\n${tagsLine(y.hashtags)}${cred}\n\nETIQUETAS (separadas por comas):\n${(y.tags || []).join(', ')}\n\nPALABRAS CLAVE:\n${(y.keywords || []).join(', ')}\n\nCOMENTARIO FIJADO:\n${y.pinned_comment}\n\nHORA: ${j.publishDate} ${j.horas.youtube}${aiNote}\n`);
  fs.writeFileSync(path.join(d, 'subir_tiktok.txt'), `${t.caption}\n\n${tagsLine(t.hashtags)}\n\nHORA: ${j.publishDate} ${j.horas.tiktok}${aiNote}\n`);
  fs.writeFileSync(path.join(d, 'subir_facebook.txt'), `${f.caption}\n\n${tagsLine(f.hashtags)}${cred}\n\nHORA: ${j.publishDate} ${j.horas.facebook}\n`);
}

async function loop() {
  if (state.running) return;
  state.running = true;
  try {
    let j;
    while ((j = db.jobs.find(x => x.status === 'cola' && !(x.notBefore && Date.now() < x.notBefore)))) {
      state.current = j.id;
      j.status = 'produciendo'; j.log = []; j.error = null; saveAll.jobs();
      try {
        const rv = !!j.revoice, t0 = Date.now();
        const r = await produce(j);
        j.minutos = +((Date.now() - t0) / 60000).toFixed(1);
        const ch = channel(j.channelId);
        // El analista mira cada video terminado, le pone nota y alimenta el manual del canal.
        if (r !== 'dividido' && r !== 'esperando' && ch && db.settings.review !== false && !rv) {
          try { await analista.analizar(ch, j, m => { j.log.push(m); saveAll.jobs(); }); }
          catch (e) { j.log.push('Analista: no se pudo revisar (' + e.message + ')'); }
        }
        // "Aprobar solo" solo si el analista lo revisó y salió bien (nota y coherencia), y no salió con fotos de stock.
        const min = +db.settings.minNota || 6, R = j.result || {};
        const stock = j.kind !== 'reedit' && R.credits?.length && (R.aiImages || 0) < (j.script?.scenes?.length || 0) / 2;
        const motivo = !j.review ? 'el analista no pudo revisarlo (IA sin cuota)' : j.review.nota < min ? `nota ${j.review.nota}/10 (mínimo ${min})` : (j.review.coherencia || 10) < min ? `coherencia ${j.review.coherencia}/10: lo que se ve no coincide bien con lo que se dice` : stock ? 'usó fotos de stock en la mayoría de escenas' : '';
        const low = !!motivo;
        if (r === 'esperando') { j.status = 'elegir'; j.eligeDesde = Date.now(); saveAll.jobs(); try { require('./avisos').avisar(`🎭 ${ch?.name || ''}: elige las voces de los personajes para seguir con «${j.title || 'tu video'}»`); } catch (e) {} continue; }
        if (r === 'dividido') j.status = 'dividido';
        else if (ch?.autoApprove && low) { j.status = 'revisar'; j.log.push(`No se aprobó solo: ${motivo}. Revísalo o pulsa Rehacer.`); }
        else if (ch?.autoApprove) { j.status = 'aprobado'; j.log.push('Aprobado automáticamente (canal con autoaprobación)'); }
        else { j.status = 'revisar'; j.log.push('Listo para revisar'); }
        j.log.push(`⏱ Tiempo total: ${j.minutos} min`);
      }
      catch (e) {
        if (process.env.SF_DEBUG) console.log(e.stack);
        // Errores pasajeros (cuotas agotadas): se reintenta solo más tarde, hasta 4 veces.
        if (e.retryable && (j.retries || 0) < (e.maxRetries || 4)) { j.retries = (j.retries || 0) + 1; j.status = 'cola'; j.notBefore = Date.now() + (e.retryInMs || 2 * 3600000); j.log.push('⏳ ' + e.message); }
        else { j.status = 'error'; j.error = e.message; j.log.push('Error: ' + e.message); }
      }
      saveAll.jobs();
      try { require('./avisos').job(j); } catch (e) {}
    }
  } finally { state.running = false; state.current = null; }
}

// Elige los canales que toca: los que hace más tiempo no producen, hasta "videos por día".
function plan(date) {
  const ya = db.jobs.filter(j => j.publishDate === date && j.status !== 'dividido').length;
  // Volumen automático: la suma de "publicaciones por día" de tus canales activos.
  const total = db.settings.autoVolume !== false ? db.channels.filter(c => c.active).reduce((t, c) => t + porDia(c), 0) : db.settings.videosPerDay;
  let n = Math.max(0, total - ya);
  const chs = db.channels.filter(c => c.active)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || String(a.lastProduced || '').localeCompare(String(b.lastProduced || '')));
  // Se reparten por turnos: primero 1 por canal, luego el 2.º y 3.º de los canales que publican más veces al día.
  let made = 0;
  for (let ronda = 0; ronda < 3 && n > 0; ronda++)
    for (const c of chs) { if (n <= 0) break; if (delDia(c, date) <= ronda && delDia(c, date) < porDia(c)) { newJob(c, { publishDate: date }); n--; made++; } }
  return made;
}

// Bandeja de entrada: entrada/<Nombre del canal>/ — los videos que sueltes ahí se reeditan solos.
const INBOX = path.join(require('./util').USERDATA, 'entrada');
const seen = new Map();
function scanInbox() {
  fs.mkdirSync(INBOX, { recursive: true });
  for (const ch of db.channels) {
    const dir = path.join(INBOX, ch.name.replace(/[<>:"/\\|?*]/g, '').trim());
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(mp4|mov|mkv|webm|m4v)$/i.test(f)) continue;
      const p = path.join(dir, f), size = fs.statSync(p).size;
      if (seen.get(p) !== size) { seen.set(p, size); continue; } // espera a que termine de copiarse
      seen.delete(p);
      addOwnVideo(ch, p, { name: f, move: true });
    }
  }
}

// Registra un video propio para reeditar (desde la bandeja o subido en el panel).
function addOwnVideo(ch, file, { name, move, mode } = {}) {
  const dir = path.join(DATA, 'originales'); fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, uid() + path.extname(file).toLowerCase());
  if (move) { try { fs.renameSync(file, dest); } catch (e) { fs.copyFileSync(file, dest); fs.rmSync(file, { force: true }); } }
  else fs.renameSync(file, dest);
  let title = String(name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  // Nombres automáticos (Facebook/TikTok/WhatsApp: "AQMAfOm7Jn...", "VID-2026..."): se cambian por uno legible.
  if (!title || /^\S{20,}$/.test(title.replace(/ /g, '')) && !/[aeiou]{2}.*[aeiou]{2}/i.test(title.slice(0, 12)) || /^(vid|video|img|snaptik|ssstik)\s*\d/i.test(title))
    title = 'Video subido el ' + new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit' }) + ' ' + new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const j = newJob(ch, { kind: 'reedit', source: dest, mode: mode || ch.reeditMode || 'mejorar', title, topic: title, publishDate: nextFreeDate(ch) });
  loop();
  return j;
}

// Producción continua: mantiene la cola llena para los próximos días, todo el día.
function keepBuffer() {
  const s = db.settings;
  if (!(s.continuous || s.agenda) || state.running || db.jobs.some(j => j.status === 'cola')) return;
  for (let k = 0; k <= (s.bufferDays ?? 1); k++) if (plan(addDays(day(), k))) break;
  loop();
}

// Revisa cada minuto si ya es la hora de la producción nocturna.
function startScheduler() {
  setInterval(() => { try { scanInbox(); } catch (e) { console.log('[Bandeja] ' + e.message); } }, 30 * 1000);
  setInterval(() => {
    try { keepBuffer(); } catch (e) {}
    // Si no eliges las voces en 12 horas, sigue solo con las sugeridas (para que la producción no se detenga).
    for (const x of db.jobs.filter(x => x.status === 'elegir' && x.eligeDesde && Date.now() - x.eligeDesde > 12 * 3600000)) { x.status = 'cola'; x.log.push('Pasaron 12 horas sin elegir voces: sigo con las sugeridas'); saveAll.jobs(); }
    if (db.jobs.some(x => x.status === 'cola')) loop();
  }, 10 * 60 * 1000);
  setInterval(() => {
    const s = db.settings, now = new Date(), hm = now.toTimeString().slice(0, 5), today = day(now);
    if (!s.nightly.enabled || s.lastPlanned === today || hm < s.nightly.time) return;
    s.lastPlanned = today; saveAll.settings();
    // Antes del mediodía se prepara lo de hoy; si la hora elegida es de tarde/noche, lo de mañana.
    plan(s.nightly.time < '12:00' ? today : addDays(today, 1));
    loop();
  }, 60 * 1000);
  loop();
}

module.exports = { state, newJob, loop, plan, startScheduler, writeTexts, addOwnVideo, nextFreeDate, INBOX };
