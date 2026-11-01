// ShortForge: fábrica de videos verticales para varios canales (YouTube Shorts, TikTok y Reels).
// Abre http://localhost:3200 después de iniciar con start.bat.
const http = require('http'), fs = require('fs'), path = require('path');
const { E, setKeys, run, ff, uid, DATA, ROOT } = require('./lib/util');
const { db, saveAll, channel, job } = require('./lib/store');
const ai = require('./lib/ai');
const tts = require('./lib/tts');
const worker = require('./lib/worker');
const presets = require('./lib/presets');
const imagenes = require('./lib/imagenes');
const efectos = require('./lib/efectos');
const publish = require('./lib/publish');
const comments = require('./lib/comments');
const cerebro = require('./lib/cerebro');
const avisos = require('./lib/avisos');
const desarmar = require('./lib/desarmar');
const salud = require('./lib/salud');
const actualizar = require('./lib/actualizar');
const freesound = require('./lib/freesound');
const { chatSystem } = require('./lib/prompts');

const PORT = E.PORT || 3200, PUB = path.join(ROOT, 'public');
const KEYS = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'NVIDIA_API_KEY', 'ANTHROPIC_API_KEY', 'PEXELS_API_KEY', 'PIXABAY_API_KEY', 'YOUTUBE_API_KEY', 'CF_ACCOUNT_ID', 'CF_API_TOKEN', 'FREESOUND_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'FB_APP_ID', 'FB_APP_SECRET', 'FB_CONFIG_ID', 'TELEGRAM_BOT_TOKEN', 'GITHUB_TOKEN', 'MISTRAL_API_KEY', 'OPENROUTER_API_KEY', 'CEREBRAS_API_KEY'];
const MIME = { '.webm': 'audio/webm', '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css;charset=utf-8', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.aiff': 'audio/aiff', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain;charset=utf-8', '.svg': 'image/svg+xml' };
const DEFAULT_TIMES = { youtube: '18:00', tiktok: '20:00', facebook: '13:00' };

async function body(q, limit = 1e6) {
  const parts = []; let n = 0;
  for await (const x of q) { n += x.length; if (n > limit) throw new Error('Archivo demasiado grande'); parts.push(x); }
  return Buffer.concat(parts);
}
const json = async q => JSON.parse((await body(q)).toString() || '{}');

let tools = null;
async function checkTools() {
  tools = {
    ffmpeg: await run('ffmpeg', ['-version']).then(() => true, () => false),
    edge: await tts.edgeAvailable(),
  };
  return tools;
}

function publicState() {
  return {
    settings: { ...db.settings, engines: ai.engines() },
    keys: Object.fromEntries(KEYS.map(k => [k, !!E[k]])),
    providers: Object.fromEntries(Object.entries(ai.PROVIDERS).map(([k, p]) => [k, { label: p.label, url: p.url, key: p.key }])),
    channels: db.channels,
    jobs: db.jobs.map(({ script, ...j }) => j),
    voices: tts.catalog(), voicePresets: require('./lib/voces').lista(),
    myVoices: db.voices, salud: salud.estado(), seoMasivo: require('./lib/seo').masivo, act: actualizar.estado(), cuotas: ai.estadoCuotas(), activos: ai.active(), lastBackup: db.settings.lastBackup || null,
    worker: worker.state,
    tools: tools && { ...tools, ...tts.local() },
    cf: imagenes.cupo(),
    efectos: efectos.list().length,
    freesound: { running: freesound.state.running, done: freesound.state.done, total: freesound.state.total, error: freesound.state.error },
    publish: publish.status(),
    inbox: worker.INBOX,
    userdata: require('./lib/util').USERDATA,
    usage: db.usage,
    presetsUsed: db.channels.length > 0,
  };
}

function saveChannel(o) {
  let ch = o.id && channel(o.id);
  if (!ch) { ch = { id: uid(), active: true, style: 'fotos', characters: [], times: { ...DEFAULT_TIMES }, created: new Date().toISOString() }; db.channels.push(ch); }
  for (const k of ['autoApprove', 'autoPublish', 'fbPageId', 'reeditMode', 'comments', 'commentsMax', 'manual', 'voicePreset', 'reparto', 'autoDub', 'autoClone', 'askClone', 'askVoices', 'frase', 'playlists', 'telegram', 'community', 'communityEvery', 'fbCommunity', 'reeditSubs', 'reeditReplaceSubs', 'reeditVary', 'reeditLook', 'reeditMusic', 'cutLong', 'length', 'fxDensity', 'mood', 'aiDisclosure', 'name', 'niche', 'style', 'images', 'look', 'voice', 'rate', 'pitch', 'color', 'tone', 'notes', 'active', 'priority', 'handles', 'times', 'perDay', 'characters', 'fbFirstComment', 'fbStory', 'fbShareTo', 'crossLinks', 'bloggerId', 'radarOn', 'radarAuto'])
    if (o[k] !== undefined) ch[k] = o[k];
  if (o.reparto !== undefined) ch.reparto = (Array.isArray(o.reparto) ? o.reparto : []).slice(0, 40).map(r => ({ id: String(r.id || uid()), nombre: String(r.nombre || 'Personaje').slice(0, 40), descripcion: String(r.descripcion || '').slice(0, 160), preset: String(r.voice || '').startsWith('clon:') ? '' : String(r.preset || 'hombre'), voice: String(r.voice || '') }));
  if (o.autoClone === true && o.autoCloneConsent === true) ch.autoCloneConsentAt = ch.autoCloneConsentAt || new Date().toISOString();
  if (o.autoClone === true && !ch.autoCloneConsentAt) throw new Error('Para clonar voces automáticamente confirma que las voces de los videos de este canal son tuyas, con permiso o sintéticas con licencia');
  if (o.autoClone === false) ch.autoCloneConsentAt = null;
  if (o.manual !== undefined) ch.manual = (Array.isArray(o.manual) ? o.manual : []).slice(0, 15).map(m => ({ t: String(m?.t ?? m).trim().slice(0, 200) })).filter(m => m.t);
  if (!String(ch.name || '').trim()) throw new Error('El canal necesita un nombre');
  for (const v of [ch.voice, ...(ch.characters || []).map(c => c.voice)])
    if (String(v || '').startsWith('clon:') && !db.voices.some(x => 'clon:' + x.id === v)) throw new Error('Esa voz clonada no existe o no tiene permiso');
  if (o.niche !== undefined) ch.topicBank = [];
  saveAll.channels();
  return ch;
}

// Sube un logo o un personaje: cualquier imagen se convierte a PNG (conserva transparencia).
async function upload(q, U) {
  const kind = U.searchParams.get('kind'), ch = channel(U.searchParams.get('channel'));
  if (!ch) throw new Error('Canal no encontrado');
  const buf = await body(q, 15e6), tmp = path.join(DATA, 'cache', 'up-' + uid());
  fs.writeFileSync(tmp, buf);
  try {
    if (kind === 'logo') {
      await ff(['-i', tmp, '-vf', 'scale=600:600:force_original_aspect_ratio=decrease', '-frames:v', '1', path.join(DATA, 'logos', ch.id + '.png')]);
      ch.logo = Date.now(); saveAll.channels();
      return { ok: 1 };
    }
    const c = (ch.characters || []).find(x => x.id === U.searchParams.get('char'));
    if (!c) throw new Error('Personaje no encontrado');
    const side = kind === 'open' ? 'open' : 'closed', name = `${ch.id}-${c.id}-${side}-${Date.now().toString(36)}.png`;
    await ff(['-i', tmp, '-vf', 'scale=900:1200:force_original_aspect_ratio=decrease', '-frames:v', '1', path.join(DATA, 'chars', name)]);
    c[side] = name; saveAll.channels();
    return { ok: 1 };
  } finally { fs.rmSync(tmp, { force: true }); }
}

// "Mis voces": solo se aceptan voces propias o con permiso escrito de la persona.
async function cloneVoice(q, U) {
  const name = String(U.searchParams.get('name') || '').trim().slice(0, 40);
  const owner = String(U.searchParams.get('owner') || '').trim().slice(0, 60);
  if (!name || !owner) throw new Error('Escribe el nombre de la voz y de quién es');
  if (U.searchParams.get('consent') !== '1') throw new Error('Debes confirmar que es tu voz o que tienes permiso de la persona');
  const buf = await body(q, 30e6), tmp = path.join(DATA, 'cache', 'rec-' + uid());
  fs.writeFileSync(tmp, buf);
  const id = uid(), out = path.join(DATA, 'voces', id + '.wav');
  try {
    const r = await tts.prepareSample(tmp, out);
    db.voices.push({ id, name, owner, gender: U.searchParams.get('gender') === 'F' ? 'F' : 'M', seconds: r.duration, consentAt: new Date().toISOString() });
    saveAll.voices();
    return { ok: 1, id, seconds: r.duration };
  } catch (e) { fs.rmSync(out, { force: true }); throw e; }
  finally { fs.rmSync(tmp, { force: true }); }
}

async function jobAction(o) {
  const j = job(o.id);
  if (!j) throw new Error('Video no encontrado');
  if (o.action === 'seo') return require('./lib/seo').mejorar(j);
  if (o.action === 'publicar') { const ps = (Array.isArray(o.plats) ? o.plats : []).filter(p => ['youtube', 'facebook', 'tiktok'].includes(p)); if (!ps.length) throw new Error('Elige una red'); return publish.publicarYa(j, ps); }
  const flow = { approve: 'aprobado', scheduled: 'programado', published: 'publicado', review: 'revisar' };
  if (flow[o.action]) j.status = flow[o.action];
  else if (o.action === 'revoice') {
    const V = require('./lib/voces'), map = {};
    for (const [k, v] of Object.entries(o.voces || {})) if (V.byId(v) || (String(v).startsWith('clon:') && db.voices.some(x => 'clon:' + x.id === v))) map[String(k).slice(0, 40)] = v;
    if (!Object.keys(map).length) throw new Error('Elige al menos una voz');
    if (!j.result?.dir || j.status === 'produciendo') throw new Error('Este video todavía no está listo');
    Object.assign(j, { revoice: { map, prevDir: j.result.dir }, status: 'cola', log: [], error: null, notBefore: undefined });
    worker.loop();
  }
  else if (o.action === 'dubWith') { // darles voz a los personajes del video (o cambiar las voces que ya tenía)
    const V = require('./lib/voces'), map = {};
    for (const [k, v] of Object.entries(o.voces || {})) if (V.byId(v) || (String(v).startsWith('clon:') && db.voices.some(x => 'clon:' + x.id === v))) map[String(k).slice(0, 40)] = v;
    if (j.kind !== 'reedit' || !j.result?.personajes?.length) throw new Error('Este video no tiene personajes detectados');
    if (j.status === 'produciendo') throw new Error('Espera a que termine');
    Object.assign(j, { mode: 'doblaje', castFijo: j.result.personajes.map(p => ({ nombre: p.nombre, descripcion: p.descripcion })), revoice: { map, prevDir: j.result.dir }, dub: undefined, status: 'cola', log: [], error: null });
    worker.loop();
  }
  else if (o.action === 'refondo') { // quitar o cambiar el sonido de fondo (mismo video, mismas voces)
    const modo = ['original', 'quitar', 'cambiar', 'ajustar'].includes(o.modo) ? o.modo : 'original';
    let archivo = null;
    if (modo === 'cambiar') { archivo = Buffer.from(String(o.fondo || ''), 'base64url').toString(); if (!efectos.esFondo(archivo)) throw new Error('Elige un fondo de la lista'); }
    if (!j.result?.dir || j.status === 'produciendo') throw new Error('Este video todavía no está listo');
    if (j.kind === 'reedit' && modo !== 'original' && j.result.fondo === 'original' && !tts.local().demucs) throw new Error('Para quitar el fondo de tu audio original falta Demucs: ejecuta instalar_ia_local.bat otra vez');
    Object.assign(j, { fondo: { modo, archivo, vol: modo === 'ajustar' ? Math.max(0, Math.min(2, +o.vol || 1)) : Math.max(0.05, Math.min(0.7, +o.vol || 0.32)) }, revoice: { map: {}, prevDir: j.result.dir }, status: 'cola', log: [], error: null });
    worker.loop();
  }
  else if (o.action === 'elegido') { // elegiste las voces (y el fondo) antes de reeditar
    if (j.status !== 'elegir' || !j.pre) throw new Error('Este video no está esperando voces');
    const V = require('./lib/voces'), map = {};
    for (const [k, v] of Object.entries(o.voces || {})) if (V.byId(v) || (String(v).startsWith('clon:') && db.voices.some(x => 'clon:' + x.id === v))) map[String(k).slice(0, 40)] = v;
    if (!o.original) {
      if (!Object.keys(map).length) throw new Error('Elige una voz para al menos un personaje');
      if (j.kind === 'reedit') Object.assign(j, { mode: 'doblaje', castFijo: j.pre.personajes.map(p => ({ nombre: p.nombre, descripcion: p.descripcion })) });
      j.ovPre = map;
    }
    const f = o.fondo || {}, modo = ['original', 'quitar', 'cambiar', 'ajustar'].includes(f.modo) ? f.modo : 'original';
    if (modo !== 'original') {
      let archivo = null;
      if (modo === 'cambiar') { archivo = Buffer.from(String(f.id || ''), 'base64url').toString(); if (!efectos.esFondo(archivo)) throw new Error('Elige un fondo de la lista'); }
      if ((modo === 'quitar' || modo === 'ajustar') && o.original && j.pre.audio && !tts.local().demucs) throw new Error('Para quitar o ajustar el fondo de tu audio original falta Demucs: ejecuta instalar_ia_local.bat otra vez');
      j.fondo = { modo, archivo, vol: modo === 'ajustar' ? Math.max(0, Math.min(2, +f.vol || 1)) : Math.max(0.05, Math.min(0.7, +f.vol || 0.32)) };
    }
    Object.assign(j, { status: 'cola', error: null });
    worker.loop();
  }
  else if (o.action === 'saltarVoces') { if (j.status === 'elegir') { j.status = 'cola'; worker.loop(); } }
  else if (o.action === 'retryNow') { j.notBefore = undefined; worker.loop(); }
  else if (o.action === 'redo') {
    Object.assign(j, { status: 'cola', log: [], error: null, result: null, seo: null, issues: null, pub: undefined, review: undefined, notBefore: undefined, retries: 0 });
    if (o.newTopic) Object.assign(j, { topic: '', format: '', character: '' });
    // Reeditados: se vuelven a analizar (por si ahora hay Whisper o el análisis visual).
    if (j.kind === 'reedit') { delete j.visual; delete j.warning; if (j.transcript === null) delete j.transcript; }
    worker.loop();
  }
  else if (o.action === 'delete') {
    if (j.status === 'produciendo') throw new Error('Espera a que termine de producirse');
    if (j.result?.dir) fs.rmSync(path.join(DATA, 'videos', j.result.dir), { recursive: true, force: true });
    db.jobs.splice(db.jobs.indexOf(j), 1);
  } else if (o.action === 'date' || o.action === 'hora') {
    const ya = Object.entries(j.pub || {}).filter(([, p]) => p.ok).map(([k]) => k === 'youtube' ? 'YouTube' : 'Facebook');
    if (ya.length) throw new Error(`Ya se subió a ${ya.join(' y ')}: cambia la hora allí (YouTube Studio / Meta Business Suite)`);
    if (o.action === 'date') j.publishDate = o.date; else j.horaFija = /^\d\d:\d\d$/.test(o.hora || '') ? o.hora : undefined;
    const ch = db.channels.find(c => c.id === j.channelId);
    if (ch && j.result) j.horas = Object.fromEntries(['youtube', 'tiktok', 'facebook'].map(p => [p, publish.horaDe(j, ch, p)]));
  } else if (o.action === 'canal') {
    const ch = db.channels.find(c => c.id === o.channelId);
    if (!ch) throw new Error('Canal no encontrado');
    if (ch.id === j.channelId) return { ok: 1 };
    if (j.status === 'produciendo') throw new Error('Espera a que termine de producirse');
    const subido = Object.values(j.pub || {}).some(p => p.ok);
    if (!subido) { // aún no salió en ningún lado: se pasa al otro canal
      j.channelId = ch.id; j.pub = undefined; j.avisoTT = false;
      j.log.push(`Pasado al canal ${ch.name}.`);
      if (j.result) j.horas = Object.fromEntries(['youtube', 'tiktok', 'facebook'].map(p => [p, publish.horaDe(j, ch, p)]));
      saveAll.jobs(); return { ok: 1, movido: 1 };
    }
    // Ya se publicó en este canal: se hace una copia para el otro (con sus propios archivos).
    const c = JSON.parse(JSON.stringify(j));
    Object.assign(c, { id: require('./lib/util').uid(), channelId: ch.id, pub: undefined, avisoTT: false, tgPending: false, stats: undefined, status: j.result ? 'revisar' : 'cola', created: new Date().toISOString(), log: [`Copia del video publicado en ${db.channels.find(x => x.id === j.channelId)?.name || 'otro canal'}.`] });
    if (j.result?.dir) {
      const nd = j.result.dir + '-' + c.id;
      fs.cpSync(path.join(DATA, 'videos', j.result.dir), path.join(DATA, 'videos', nd), { recursive: true });
      c.result.dir = nd;
      c.horas = Object.fromEntries(['youtube', 'tiktok', 'facebook'].map(p => [p, publish.horaDe(c, ch, p)]));
    }
    db.jobs.push(c); saveAll.jobs(); return { ok: 1, copia: 1 };
  }
  else if (o.action === 'retryPublish') { for (const p of Object.keys(j.pub || {})) if (!j.pub[p].ok) delete j.pub[p]; if (j.status === 'publicado') j.status = 'aprobado'; publish.tick(); }
  saveAll.jobs();
  return { ok: 1 };
}

const STREAMED = Symbol('streamed');

async function api(u, q, U, r) {
  const P = q.method === 'POST';
  if (u === '/api/state') return publicState();
  if (u === '/api/job') { const j = job(U.searchParams.get('id')); if (!j) throw new Error('No encontrado'); return j; }
  if (u === '/api/comments') return comments.list();
  if (u === '/api/bluesky' && P) {
    const o = await json(q), T = publish.tokens; T.bluesky = T.bluesky || {};
    if (!o.handle) delete T.bluesky[o.channelId];
    else {
      const h = String(o.handle).trim().replace(/^@/, ''), pass = String(o.pass || '').trim();
      // Se prueba antes de guardar (sesión oficial de Bluesky).
      const r = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: h, password: pass }) });
      if (!r.ok) throw new Error('Bluesky no aceptó ese usuario y contraseña de app. Usa una "contraseña de app" (Configuración → Privacidad y seguridad → Contraseñas de app).');
      T.bluesky[o.channelId] = { handle: h, pass };
    }
    publish.saveTokens(); return { ok: 1 };
  }
  if (u === '/api/red' && P) { // Mastodon y Discord: datos de conexión de cada canal (se prueban antes de guardar)
    const o = await json(q), T = publish.tokens, red = o.red;
    if (!['mastodon', 'discord'].includes(red)) throw new Error('Red no válida');
    T[red] = T[red] || {};
    if (o.borrar) delete T[red][o.channelId];
    else if (red === 'mastodon') {
      const server = /^https?:\/\//.test(o.server) ? String(o.server).trim().replace(/\/+$/, '') : 'https://' + String(o.server || '').trim().replace(/\/+$/, '');
      const r = await fetch(server + '/api/v1/accounts/verify_credentials', { headers: { authorization: 'Bearer ' + String(o.token || '').trim() } });
      if (!r.ok) throw new Error('Mastodon no aceptó ese servidor y token. En tu cuenta: Preferencias → Desarrollo → Nueva aplicación (permisos write:media y write:statuses) y copia "Tu token de acceso".');
      T.mastodon[o.channelId] = { server, token: String(o.token).trim() };
    } else {
      const url = String(o.url || '').trim();
      if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(url)) throw new Error('Pega el webhook completo de Discord (empieza con https://discord.com/api/webhooks/)');
      const r = await fetch(url); if (!r.ok) throw new Error('Discord no reconoce ese webhook');
      T.discord[o.channelId] = { url };
    }
    publish.saveTokens(); return { ok: 1 };
  }
  if (u === '/api/instagram/check' && P) { const o = await json(q), ch = db.channels.find(c => c.id === o.channelId); if (!ch) throw new Error('Canal no encontrado'); const pg = publish.tokens.facebook?.pages?.find(p => p.id === ch.fbPageId); if (pg) delete pg.ig; await require('./lib/redes').igCuenta(ch); return { ok: 1, username: pg?.ig?.username }; }
  if (u === '/api/radar' && P) { const o = await json(q), ch = db.channels.find(c => c.id === o.channelId); if (!ch) throw new Error('Canal no encontrado'); return require('./lib/radar').escanear(ch); }
  if (u === '/api/kit' && P) { const o = await json(q), j = job(o.id); if (!j) throw new Error('Video no encontrado'); return require('./lib/crecer').kitGrupos(j); }
  if (u === '/api/seo/todos' && P) return require('./lib/seo').mejorarTodos();
  if (u === '/api/salud') return salud.estado();
  if (u === '/api/actualizar') return actualizar.estado();
  if (u === '/api/fondos') return { items: efectos.fondos().map(({ file, ...x }) => ({ ...x, id: Buffer.from(file).toString('base64url') })), demucs: !!tts.local().demucs };
  if (u === '/api/desarmados') return { items: desarmar.list() };
  if (u === '/api/cuotas') return { agotados: ai.estadoCuotas(), uso: db.usage };
  if (u === '/api/brain') return { canales: cerebro.resumen(), state: cerebro.state, telegram: { bot: !!E.TELEGRAM_BOT_TOKEN, chat: !!E.TELEGRAM_CHAT_ID }, lastBackup: db.settings.lastBackup || null };
  if (!P) return null;
  if (!q.headers['x-sf']) throw Object.assign(new Error('Prohibido'), { code: 403 });

  if (u === '/api/keys') {
    const o = await json(q), ok = {};
    for (const k of KEYS) if (o[k] !== undefined) {
      const v = String(o[k]).trim();
      if (v && !(/^[A-Za-z0-9_\-.:]{16,}$/.test(v) || (/_ID$/.test(k) && /^\d{6,}$/.test(v)))) throw new Error('La clave ' + k + ' no parece válida. Cópiala completa, sin espacios.');
      ok[k] = v;
    }
    setKeys(ok);
    for (const [k, v] of Object.entries(ok)) if (v) require('./lib/salud').claveGuardada(k); // para avisar antes de que venzan
    if (Object.values(ok).some(Boolean)) ai.revisar().catch(() => {}); // vuelve a revisar los motores con la clave nueva
    return { ok: 1 };
  }
  if (u === '/api/settings') {
    const o = await json(q);
    if (o.videosPerDay !== undefined) db.settings.videosPerDay = Math.max(0, Math.min(30, Math.round(+o.videosPerDay || 0)));
    if (o.nightly) db.settings.nightly = { enabled: !!o.nightly.enabled, time: /^\d\d:\d\d$/.test(o.nightly.time) ? o.nightly.time : '02:00' };
    if (Array.isArray(o.engines)) db.settings.engines = o.engines.filter(e => ai.PROVIDERS[e]);
    if (o.models) db.settings.models = o.models;
    if (o.factCheck !== undefined) db.settings.factCheck = !!o.factCheck;
    if (o.karaoke !== undefined) db.settings.karaoke = !!o.karaoke;
    if (['tiny', 'base', 'small'].includes(o.whisperModel)) db.settings.whisperModel = o.whisperModel;
    if (o.continuous !== undefined) db.settings.continuous = !!o.continuous;
    if (o.bufferDays !== undefined) db.settings.bufferDays = Math.max(0, Math.min(7, +o.bufferDays || 0));
    if (o.ytDailyMax !== undefined) db.settings.ytDailyMax = Math.max(1, Math.min(50, +o.ytDailyMax || 6));
    if (o.review !== undefined) db.settings.review = !!o.review;
    for (const k of ['critic', 'checkImages', 'telegram', 'naturalVoice', 'reserveGemini', 'autoClean', 'autoVolume', 'agenda', 'waitAiImages', 'seoPro']) if (o[k] !== undefined) db.settings[k] = !!o[k];
    if (o.minNota !== undefined) db.settings.minNota = Math.max(1, Math.min(10, +o.minNota || 6));
    saveAll.settings();
    return { ok: 1 };
  }
  if (u === '/api/engine/test') { const o = await json(q); return ai.test(o.provider); }
  if (u === '/api/engine/models') { const o = await json(q); return { models: await ai.listModels(o.provider), auto: await ai.modelFor(o.provider) }; }
  if (u === '/api/channel') return saveChannel(await json(q));
  if (u === '/api/channel/delete') { const o = await json(q); db.channels = db.channels.filter(c => c.id !== o.id); saveAll.channels(); return { ok: 1 }; }
  if (u === '/api/channel/presets') {
    const have = new Set(db.channels.map(c => c.name));
    let n = 0;
    for (const p of presets) if (!have.has(p.name)) { saveChannel({ ...p, style: p.style || 'fotos', active: !!p.active }); n++; }
    return { ok: 1, n };
  }
  if (u === '/api/upload') return upload(q, U);
  if (u === '/api/voice/preview') {
    const o = await json(q), V = require('./lib/voces');
    const v = o.preset && V.byId(o.preset) ? V.aplicar({ voice: o.voice || '', rate: +o.rate || 0, pitch: +o.pitch || 0 }, o.preset, tts.catalog(), o.who || '') : { voice: o.voice, rate: o.rate, pitch: o.pitch };
    return { url: await tts.preview(v, o.text) };
  }
  if (u === '/api/jobs') {
    const o = await json(q), ch = channel(o.channelId);
    if (!ch) throw new Error('Elige un canal');
    const topics = String(o.topics || '').split('\n').map(s => s.trim()).filter(Boolean);
    const n = topics.length || Math.max(1, Math.min(10, +o.count || 1));
    for (let i = 0; i < n; i++) worker.newJob(ch, { topic: topics[i] || '', publishDate: o.publishDate });
    worker.loop();
    return { ok: 1, n };
  }
  if (u === '/api/job/action') return jobAction(await json(q));
  if (u === '/api/inspire') {
    const o = await json(q), ch = channel(o.channelId);
    if (!ch) throw new Error('Elige un canal');
    if (String(o.transcript || '').trim().length < 80) throw new Error('Pega la transcripción completa del video viral');
    worker.newJob(ch, { publishDate: o.publishDate, inspiration: { transcript: String(o.transcript).slice(0, 10000), notes: String(o.notes || '').slice(0, 1000) } });
    worker.loop();
    return { ok: 1 };
  }
  if (u === '/api/voices/clone') return cloneVoice(q, U);
  if (u === '/api/voices/fromvideo/frases') { const o = await json(q); return { frases: await require('./lib/clonar').frases(o.jobId) }; }
  if (u === '/api/voices/fromvideo/clip') { const o = await json(q); return { url: await require('./lib/clonar').clip(o.jobId, o.i) }; }
  if (u === '/api/voices/buscar') { const o = await json(q); return require('./lib/clonar').buscar(o.jobId); }
  if (u === '/api/voices/propuesta') { const o = await json(q); return require('./lib/clonar').responder(o); }
  if (u === '/api/voices/propuesta/muestra') { const o = await json(q); return { url: await require('./lib/clonar').muestra(o.jobId, o.gid) }; }
  if (u === '/api/voices/fromvideo/save') { const o = await json(q); return require('./lib/clonar').guardar(o); }
  if (u === '/api/reedit/upload') {
    const ch = channel(U.searchParams.get('channel'));
    if (!ch) throw new Error('Elige un canal');
    const name = String(U.searchParams.get('name') || 'video.mp4');
    if (!/\.(mp4|mov|mkv|webm|m4v)$/i.test(name)) throw new Error('Formato no soportado (usa mp4, mov, mkv o webm)');
    const tmp = path.join(DATA, 'cache', 'up-' + uid() + path.extname(name).toLowerCase());
    const w = fs.createWriteStream(tmp); let n = 0;
    for await (const x of q) { n += x.length; if (n > 2e9) { w.destroy(); fs.rmSync(tmp, { force: true }); throw new Error('Video demasiado grande'); } w.write(x); }
    await new Promise(r => w.end(r));
    const j = worker.addOwnVideo(ch, tmp, { name, mode: U.searchParams.get('mode') || undefined });
    return { ok: 1, id: j.id, publishDate: j.publishDate };
  }
  if (u === '/api/actualizar/buscar') return actualizar.buscar();
  if (u === '/api/actualizar/instalar') return actualizar.instalar();
  if (u === '/api/reporte') return salud.reporte();
  if (u === '/api/limpiar') return salud.limpiar({ forzar: true }) || { liberadoMB: 0, videosBorrados: 0 };
  if (u === '/api/motores/revisar') return { engines: await ai.revisar() };
  if (u === '/api/desarmar/upload') {
    const name = String(U.searchParams.get('name') || 'video.mp4');
    if (!/\.(mp4|mov|mkv|webm|m4v)$/i.test(name)) throw new Error('Formato no soportado (usa mp4, mov, mkv o webm)');
    const tmp = path.join(DATA, 'cache', 'des-' + uid() + path.extname(name).toLowerCase());
    const w = fs.createWriteStream(tmp); let n = 0;
    for await (const x of q) { n += x.length; if (n > 1e9) { w.destroy(); fs.rmSync(tmp, { force: true }); throw new Error('Video demasiado grande (máx 1 GB)'); } w.write(x); }
    await new Promise(r => w.end(r));
    return { ok: 1, id: desarmar.nuevo(tmp, name).id };
  }
  if (u === '/api/desarmar/reintentar') { const o = await json(q); desarmar.reintentar(o.id); return { ok: 1 }; }
  if (u === '/api/desarmar/borrar') { const o = await json(q); desarmar.borrar(o.id); return { ok: 1 }; }
  if (u === '/api/desarmar/crear') {
    const o = await json(q), ch = channel(o.channelId), d = desarmar.get(o.id);
    if (!ch) throw new Error('Elige un canal');
    if (!d?.bp) throw new Error('Ese video todavía no está desarmado');
    const n = Math.max(1, Math.min(5, +o.count || 1));
    for (let i = 0; i < n; i++) worker.newJob(ch, { topic: o.modo === 'mio' ? d.titulo : '', desarmado: { id: d.id, modo: o.modo === 'mio' ? 'mio' : 'otro', notas: String(o.notas || '').slice(0, 500) + (i ? ` (versión ${i + 1}, distinta a las anteriores)` : '') }, publishDate: o.publishDate });
    worker.loop();
    return { ok: 1, n };
  }
  if (u === '/api/sounds/download') return freesound.descargar();
  if (u === '/api/backup') return { ok: 1, dest: avisos.respaldo() };
  if (u === '/api/publish/disconnect') { const o = await json(q); publish.disconnect(o.kind, o.channelId); return { ok: 1 }; }
  if (u === '/api/brain/run') { const o = await json(q); cerebro.ciclo({ force: true, only: o.channelId || undefined }).catch(() => {}); return { ok: 1 }; }
  if (u === '/api/community/new') { const o = await json(q), ch = channel(o.channelId); if (!ch) throw new Error('Elige un canal'); return { post: await avisos.comunidad(ch) }; }
  if (u === '/api/telegram/detect') return { name: await avisos.detectarChat() };
  if (u === '/api/telegram/test') { await avisos.tg('sendMessage', { chat_id: E.TELEGRAM_CHAT_ID, text: '🔔 Prueba de ShortForge: los avisos funcionan.' }); return { ok: 1 }; }
  if (u === '/api/comments/check') { comments.check({ force: true }).catch(() => {}); return { ok: 1 }; }
  if (u === '/api/comments/action') return comments.action(await json(q));
  if (u === '/api/publish/now') { publish.tick(); return { ok: 1 }; }
  if (u === '/api/voices/rename') { const o = await json(q), v = db.voices.find(x => x.id === o.id); if (!v) throw new Error('Voz no encontrada'); v.name = String(o.name || v.name).trim().slice(0, 40) || v.name; saveAll.voices(); return { ok: 1 }; }
  if (u === '/api/voices/delete') {
    const o = await json(q), v = db.voices.find(x => x.id === o.id);
    if (!v) throw new Error('Voz no encontrada');
    const inUse = db.channels.filter(c => [c.voice, ...(c.characters || []).map(x => x.voice)].includes('clon:' + v.id)).map(c => c.name);
    if (inUse.length) throw new Error('Esa voz la usan estos canales: ' + inUse.join(', ') + '. Cámbiales la voz primero.');
    db.voices = db.voices.filter(x => x !== v); saveAll.voices();
    fs.rmSync(path.join(DATA, 'voces', v.id + '.wav'), { force: true });
    return { ok: 1 };
  }
  if (u === '/api/character/ai') {
    const o = await json(q), ch = channel(o.channelId), c = ch && (ch.characters || []).find(x => x.id === o.charId);
    if (!c) throw new Error('Personaje no encontrado');
    const desc = String(o.description || c.name).slice(0, 300);
    const r = await imagenes.personaje(desc, path.join(DATA, 'chars'), `${ch.id}-${c.id}-${Date.now().toString(36)}`);
    Object.assign(c, r, { description: desc }); saveAll.channels();
    return { ok: 1 };
  }
  if (u === '/api/plan') { const o = await json(q); const n = worker.plan(o.date); worker.loop(); return { ok: 1, n }; }
  if (u === '/api/worker/start') { worker.loop(); return { ok: 1 }; }
  if (u === '/api/chat') {
    const o = await json(q);
    const msgs = [{ role: 'system', content: chatSystem(db) }, ...(o.messages || []).slice(-20).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 12000) }))];
    // Respuesta en vivo: se envía el texto a medida que llega.
    r.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' });
    r.flushHeaders();
    try { await ai.askStream(msgs, d => r.write(d), { max: 4000 }); }
    catch (e) { r.write('\n\n⚠ ' + e.message); }
    r.end();
    return STREAMED;
  }
  return null;
}

// Conexión con YouTube y Facebook (el navegador vuelve aquí después de dar permiso).
async function oauth(u, U, r) {
  const page = (ok, msg) => { r.writeHead(ok ? 200 : 400, { 'content-type': 'text/html;charset=utf-8' }); r.end(`<!doctype html><meta charset="utf-8"><body style="font:16px system-ui;padding:40px;background:#f1f2ef"><h2>${ok ? '✓ Listo' : '✗ No se pudo conectar'}</h2><p>${String(msg).replace(/</g, '&lt;')}</p><p><a href="/">Volver a ShortForge</a></p><script>setTimeout(()=>location.href='/',${ok ? 2500 : 15000})</script>`); };
  try {
    if (u === '/oauth/google/start') { r.writeHead(302, { location: publish.googleAuthUrl(U.searchParams.get('channel')) }); return r.end(); }
    if (u === '/oauth/facebook/start') { r.writeHead(302, { location: publish.fbAuthUrl() }); return r.end(); }
    if (U.searchParams.get('error')) return page(false, U.searchParams.get('error_description') || U.searchParams.get('error'));
    if (u === '/oauth/google') { const yt = await publish.googleCallback(U.searchParams.get('code'), U.searchParams.get('state')); return page(true, 'YouTube conectado' + (yt ? ': ' + yt.title : '') + '.'); }
    if (u === '/oauth/facebook') { const n = await publish.fbCallback(U.searchParams.get('code')); return page(true, `Facebook conectado: ${n} página(s). Ahora elige la página de cada canal.`); }
  } catch (e) { return page(false, e.message); }
  r.writeHead(404); r.end();
}

function serveFile(r, p, root) {
  if (!p.startsWith(root + path.sep) || !fs.existsSync(p) || !fs.statSync(p).isFile()) return false;
  r.writeHead(200, { 'content-type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'content-length': fs.statSync(p).size, 'cache-control': 'no-cache' });
  fs.createReadStream(p).pipe(r);
  return true;
}

http.createServer(async (q, r) => {
  const U = new URL(q.url, 'http://x'), u = decodeURIComponent(U.pathname);
  try {
    if (u.startsWith('/oauth/')) return oauth(u, U, r);
    if (u.startsWith('/api/')) {
      const out = await api(u, q, U, r);
      if (out === STREAMED) return;
      if (out === null) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'content-type': 'application/json' });
      return r.end(JSON.stringify(out));
    }
    if (u.startsWith('/efectos/') && serveFile(r, path.join(efectos.DIR, ...u.slice(9).split('/').map(decodeURIComponent)), efectos.DIR)) return;
    if (u.startsWith('/musica/') && serveFile(r, path.join(require('./lib/util').USERDATA, 'musica', decodeURIComponent(u.slice(8))), path.join(require('./lib/util').USERDATA, 'musica'))) return;
    if (u.startsWith('/files/') && /^\/files\/(videos|logos|chars|cache|voces|desarmados)\//.test(u) && serveFile(r, path.join(DATA, u.slice(7)), DATA)) return;
    if (serveFile(r, path.join(PUB, u === '/' ? 'index.html' : u), PUB)) return;
    r.writeHead(404); r.end('No encontrado');
  } catch (e) {
    r.writeHead(e.code || 400, { 'content-type': 'application/json' });
    r.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, '127.0.0.1', async () => {
  await checkTools();
  console.log('ShortForge listo en http://localhost:' + PORT);
  if (!tools.ffmpeg) console.log('[AVISO] Falta ffmpeg');
  if (!tools.edge) console.log('[AVISO] Falta la voz de Edge: python -m pip install edge-tts');
  worker.startScheduler();
  publish.start();
  comments.start();
  cerebro.start();
  avisos.start();
  salud.start();
  actualizar.start();
  require('./lib/crecer').start();
  require('./lib/radar').start();
  ai.startRevision();
});
