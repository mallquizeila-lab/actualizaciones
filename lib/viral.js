// 📣 Página viral dentro de ShortForge.
//  - Enciende la página viral (carpeta viral/) en el puerto 3300, con sus datos en ShortForge-datos/viral.
//  - La publica en internet con Cloudflare Tunnel (gratis, con HTTPS):
//      · temporal: dirección *.trycloudflare.com que CAMBIA cada vez que se reinicia (solo para probar);
//      · fija: tu dominio, con el "token" de un túnel creado en Cloudflare (recomendado para usarla de verdad).
//  - Cuando sale un video tuyo en YouTube/Facebook, lo pone como "video destacado" de la página.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process');
const { ROOT, USERDATA, E, setKeys } = require('./util');
const { db, saveAll } = require('./store');

const PORT = 3300, DIR = path.join(ROOT, 'viral'), DATOS = path.join(USERDATA, 'viral'), BIN = path.join(USERDATA, 'bin');
const CF_EXE = path.join(BIN, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
const st = { pagina: null, tunel: null, url: null, log: [], estado: 'apagada', tunelEstado: 'apagado', error: null, descargando: false };
const S = () => (db.settings.viral = db.settings.viral || { on: false, destacado: true });
const say = m => { st.log = [...st.log, new Date().toLocaleTimeString('es-PE') + ' ' + String(m).trim()].slice(-40); };

// Claves que se crean solas la primera vez (quedan en tu archivo de claves, nunca se suben a ningún lado).
function claves() {
  const nuevo = {};
  if (!E.VIRAL_PASSWORD) nuevo.VIRAL_PASSWORD = crypto.randomBytes(9).toString('base64url');
  if (!E.VIRAL_VAPID_PUBLIC || !E.VIRAL_VAPID_PRIVATE) { const k = require(path.join(DIR, 'webpush.js')).generateVAPIDKeys(); nuevo.VIRAL_VAPID_PUBLIC = k.publicKey; nuevo.VIRAL_VAPID_PRIVATE = k.privateKey; }
  if (Object.keys(nuevo).length) setKeys(nuevo);
}
const token = () => crypto.createHash('sha256').update('sf-local:' + E.VIRAL_PASSWORD).digest('hex');
const urlPublica = () => (E.VIRAL_URL || st.url || '').replace(/\/+$/, '');

// ---------- La página ----------
function encenderPagina() {
  if (st.pagina) return;
  claves(); fs.mkdirSync(DATOS, { recursive: true });
  // Solo lo necesario: la página NO recibe tus otras claves (IA, YouTube, Facebook…).
  const base = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'windir', 'ComSpec', 'PATHEXT'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  const env = { ...base, PORT: String(PORT), VIRAL_DATA: DATOS, ADMIN_PASSWORD: E.VIRAL_PASSWORD, VAPID_PUBLIC: E.VIRAL_VAPID_PUBLIC, VAPID_PRIVATE: E.VIRAL_VAPID_PRIVATE,
    VAPID_EMAIL: 'mailto:' + (E.VIRAL_EMAIL || 'admin@example.com'), PUBLIC_URL: urlPublica() || `http://localhost:${PORT}`, META_PIXEL_ID: E.META_PIXEL_ID || '' };
  const p = spawn(process.execPath, [path.join(DIR, 'server.js')], { cwd: DIR, env, windowsHide: true });
  st.pagina = p; st.estado = 'encendiendo';
  const leer = d => String(d).split(/\r?\n/).filter(l => l.trim() && !/ExperimentalWarning|trace-warnings/.test(l)).forEach(l => { say('Página: ' + l); if (/Página viral en/.test(l)) st.estado = 'encendida'; });
  p.stdout.on('data', leer); p.stderr.on('data', leer);
  p.on('exit', code => {
    st.pagina = null; st.estado = 'apagada';
    if (S().on && !st.parando) { say(`La página se detuvo (código ${code}). La vuelvo a encender en 5 s.`); setTimeout(() => S().on && encenderPagina(), 5000); }
  });
}
function reiniciarPagina() { if (!st.pagina) return encenderPagina(); st.parando = true; st.pagina.once('exit', () => { st.parando = false; encenderPagina(); }); st.pagina.kill(); }

// ---------- Cloudflare Tunnel ----------
async function descargarCloudflared() {
  if (fs.existsSync(CF_EXE)) return;
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? '386' : 'amd64';
  const nombre = process.platform === 'win32' ? `cloudflared-windows-${arch}.exe` : process.platform === 'darwin' ? null : `cloudflared-linux-${arch}`;
  if (!nombre) throw new Error('En Mac instala cloudflared con: brew install cloudflared');
  st.descargando = true; say('Descargando cloudflared (programa oficial de Cloudflare, ~50 MB)…');
  try {
    const r = await fetch(`https://github.com/cloudflare/cloudflared/releases/latest/download/${nombre}`, { signal: AbortSignal.timeout(300000) });
    if (!r.ok) throw new Error('No pude descargar cloudflared (' + r.status + ')');
    fs.mkdirSync(BIN, { recursive: true }); fs.writeFileSync(CF_EXE + '.tmp', Buffer.from(await r.arrayBuffer())); fs.renameSync(CF_EXE + '.tmp', CF_EXE);
    if (process.platform !== 'win32') fs.chmodSync(CF_EXE, 0o755);
    say('cloudflared listo ✓');
  } finally { st.descargando = false; }
}
async function encenderTunel() {
  if (st.tunel) return;
  try { await descargarCloudflared(); } catch (e) { st.tunelEstado = 'error'; st.error = e.message; say(e.message); return; }
  const fijo = !!E.CF_TUNNEL_TOKEN;
  const args = fijo ? ['tunnel', '--no-autoupdate', 'run', '--token', E.CF_TUNNEL_TOKEN] : ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`];
  const t = spawn(CF_EXE, args, { windowsHide: true });
  st.tunel = t; st.tunelEstado = 'conectando'; st.error = null;
  const leer = d => String(d).split(/\r?\n/).forEach(l => {
    const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(l);
    if (m && !fijo && st.url !== m[0]) { st.url = m[0]; st.tunelEstado = 'conectado'; say('Dirección temporal: ' + m[0]); reiniciarPagina(); }
    if (fijo && /Registered tunnel connection|Connection .* registered/i.test(l)) { st.tunelEstado = 'conectado'; }
    if (/ERR|error/i.test(l) && !/rpc|ICMP|quic.*fallback/i.test(l)) say('Túnel: ' + l.replace(/^\S+\s+\S+\s+/, '').slice(0, 200));
  });
  t.stdout.on('data', leer); t.stderr.on('data', leer);
  t.on('exit', code => {
    st.tunel = null; st.tunelEstado = 'apagado';
    if (S().on && S().tunel !== false && !st.parandoTunel) { say(`El túnel se cortó (código ${code}). Lo reconecto en 10 s.`); setTimeout(() => S().on && encenderTunel(), 10000); }
  });
}
function apagarTunel() { if (st.tunel) { st.parandoTunel = true; st.tunel.once('exit', () => { st.parandoTunel = false; }); st.tunel.kill(); } }

async function encender() { const s = S(); s.on = true; saveAll.settings(); encenderPagina(); if (s.tunel !== false) encenderTunel(); }
function apagar() { const s = S(); s.on = false; saveAll.settings(); st.parando = true; apagarTunel(); if (st.pagina) { st.pagina.once('exit', () => { st.parando = false; }); st.pagina.kill(); } else st.parando = false; }

// Guardar dirección fija (dominio + token del túnel).
function configurar({ url, tokenTunel, email }) {
  const k = {};
  if (url !== undefined) { const u = String(url).trim().replace(/\/+$/, ''); if (u && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(u)) throw new Error('La dirección debe ser como https://suerte.tudominio.com'); k.VIRAL_URL = u; }
  if (tokenTunel !== undefined) { const t = String(tokenTunel).trim().replace(/^.*--token\s+/, '').replace(/^cloudflared\.exe\s+service\s+install\s+/i, ''); if (t && !/^[A-Za-z0-9_\-=.]{60,}$/.test(t)) throw new Error('Ese no parece un token de túnel. Copia el texto largo que empieza con "eyJ" desde Cloudflare.'); k.CF_TUNNEL_TOKEN = t; }
  if (email !== undefined) k.VIRAL_EMAIL = String(email).trim().slice(0, 80);
  setKeys(k);
  if (S().on) { apagarTunel(); setTimeout(() => { encenderTunel(); reiniciarPagina(); }, 1500); }
}

// ---------- Llamadas al panel de la página (desde ShortForge) ----------
async function admin(ruta, body) {
  const r = await fetch(`http://127.0.0.1:${PORT}/api/admin/${ruta}`, { method: body ? 'POST' : 'GET', headers: { 'x-sf-token': token(), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Página viral: ' + r.status); return j;
}
// El último video tuyo que ya está público en YouTube (o Facebook) pasa a ser el destacado.
async function destacar() {
  if (!S().on || S().destacado === false || st.estado !== 'encendida') return;
  const ahora = Date.now();
  const pub = db.jobs.filter(j => ['youtube', 'facebook'].some(p => j.pub?.[p]?.ok && j.pub[p].url && new Date(j.pub[p].when || j.pub[p].at).getTime() <= ahora))
    .map(j => { const p = j.pub.youtube?.ok && new Date(j.pub.youtube.when || j.pub.youtube.at).getTime() <= ahora ? j.pub.youtube : j.pub.facebook; return { j, p, t: new Date(p.when || p.at).getTime() }; })
    .sort((a, b) => b.t - a.t)[0];
  if (!pub || (S().ultimoDestacado === pub.p.url && S().destacadoV === 2)) return; // v2: título limpio, sin cortar
  try {
    await admin('ajustes', { video: { url: pub.p.url, title: String(pub.j.seo?.youtube?.title || pub.j.title || 'Mira el video de hoy').slice(0, 80) } });
    S().ultimoDestacado = pub.p.url; S().destacadoV = 2; saveAll.settings(); say('Video destacado: ' + pub.p.url);
  } catch (e) { say('No pude poner el video destacado: ' + e.message); }
}

let TESTS = null;
const tests = () => TESTS || (TESTS = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'public', 'tests.json'), 'utf8')).tests.map(t => ({ id: t.id, t: t.t, e: t.e, cat: t.cat })); } catch (e) { return []; } })());
function estado() {
  const s = S();
  return { tests: tests(), on: !!s.on, destacado: s.destacado !== false, tunelOn: s.tunel !== false, estado: st.estado, tunel: st.tunelEstado, fijo: !!E.CF_TUNNEL_TOKEN, url: urlPublica(), urlFija: E.VIRAL_URL || '',
    temporal: !E.CF_TUNNEL_TOKEN, local: `http://localhost:${PORT}`, panel: E.VIRAL_PASSWORD ? `http://localhost:${PORT}/panel?k=${token()}&tema=sf` : null,
    password: E.VIRAL_PASSWORD || null, vozGlory: vozJob, arteGlory: arteJob, huerto: huertoJob, huertoListo: (() => { try { return JSON.parse(fs.readFileSync(path.join(DATOS, 'voces_huerto', 'manifest.json'), 'utf8')).voces.length + (() => { try { return JSON.parse(fs.readFileSync(path.join(DATOS, 'arte_huerto', 'manifest.json'), 'utf8')).arte.length; } catch (e) { return 0; } })(); } catch (e) { return 0; } })(), arteListo: (() => { try { return JSON.parse(fs.readFileSync(path.join(DATOS, 'arte_glory', 'manifest.json'), 'utf8')).arte.length; } catch (e) { return 0; } })(), vocesListas: (() => { try { return JSON.parse(fs.readFileSync(path.join(DATOS, 'voces_glory', 'manifest.json'), 'utf8')).voces.length; } catch (e) { return 0; } })(), cloudflared: fs.existsSync(CF_EXE), descargando: st.descargando, error: st.error, log: st.log.slice(-15), email: E.VIRAL_EMAIL || '' };
}
// 🎙️ Voces de GLORY BROWN: graba cada frase de los 127 personajes con su voz de la biblioteca (Edge/Kokoro) en MP3.
// Se guardan en ShortForge-datos/viral/voces_glory y la página las sirve en /voces/glory/. Lo ya grabado no se repite.
let vozJob = { activo: false, hechas: 0, total: 0, error: null };
function vocesGlory() {
  if (vozJob.activo) return vozJob;
  const archivo = path.join(DIR, 'public', 'glory', 'frases.json'); if (!fs.existsSync(archivo)) throw new Error('No encuentro las frases del juego');
  const lista = JSON.parse(fs.readFileSync(archivo, 'utf8')).frases, out = path.join(DATOS, 'voces_glory'), tmp = path.join(out, '_tmp'); fs.mkdirSync(tmp, { recursive: true });
  const manifest = () => { const voces = fs.readdirSync(out).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4)); fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ voces, fecha: new Date().toISOString() })); return voces.length; };
  vozJob = { activo: true, hechas: 0, total: lista.length, error: null };
  (async () => {
    const tts = require('./tts'), { ff } = require('./util');
    try {
      const pend = lista.filter(f => !fs.existsSync(path.join(out, f.id + '.mp3'))); vozJob.hechas = lista.length - pend.length;
      for (let i = 0; i < pend.length; i += 9) {
        const lote = pend.slice(i, i + 9).map(f => ({ id: f.id, text: f.texto, base: path.join(tmp, f.id), v: { voice: f.voz.edge, rate: f.voz.rate || 0, pitch: f.voz.pitch || 0 } }));
        await tts.synthAll(lote, m => say('Voces Glory: ' + m));
        for (const it of lote) { try { if (it.file && fs.existsSync(it.file)) { const dest = path.join(out, it.id + '.mp3'); if (it.file.endsWith('.mp3')) fs.copyFileSync(it.file, dest); else await ff(['-i', it.file, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', dest]); } } catch (e) {} }
        vozJob.hechas = Math.min(vozJob.total, vozJob.hechas + lote.length); if (i % 45 === 0) manifest();
      }
    } catch (e) { vozJob.error = e.message; say('Voces Glory: ' + e.message); }
    try { manifest(); fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    vozJob.activo = false; say(`🎙️ Voces de GLORY BROWN listas (${vozJob.hechas}/${vozJob.total})`);
  })();
  return vozJob;
}
// Ilustraciones originales de las 127 cartas de GLORY BROWN con Cloudflare (cupo gratis diario).
// Se guardan en ShortForge-datos/viral/arte_glory y la página las sirve en /arte/glory/. Lo ya hecho no se repite;
// si se acaba el cupo del día, sigue solo al día siguiente.
let arteJob = { activo: false, hechas: 0, total: 0, error: null };
const ARQ_EN = { caballero: 'armored knight with sword and shield', guerrero: 'mighty warrior with a huge axe', lanceros: 'squad of three spear soldiers', arquero: 'archer with a bow', mago: 'wizard casting a glowing spell', sanador: 'healer priestess with a glowing staff', gigante: 'giant', jinete: 'rider on a charging mount', volador: 'flying creature', bestia: 'ferocious beast', golem: 'stone golem', titan: 'colossal titan', manada: 'pack of beasts', enjambre: 'swarm of small fighters', enjambre_aire: 'swarm of small flying creatures', asesino: 'stealthy assassin with daggers', invocador: 'dark summoner', espectro: 'ghostly specter', reina: 'queen', torre: 'defensive tower', canon: 'cannon emplacement', mortero: 'mortar', generador: 'magical spawner building', muro: 'fortified wall', bola: 'giant fireball spell', meteoro: 'falling meteor spell', congelar: 'freezing ice blast spell', rayo: 'lightning strike spell', linea: 'beam of energy spell', cura: 'healing light spell', veneno: 'poison cloud spell', furia: 'rage aura spell', tornado: 'tornado spell', empuje: 'shockwave spell', escudo: 'magic shield spell', invoca: 'summoning portal spell', drenar: 'life drain spell' };
const MUNDO_EN = { alba: 'golden sunrise kingdom with white castles and blue banners', bosque: 'enchanted emerald forest with glowing mushrooms', arenas: 'desert empire with ancient sandstone temples', cielo: 'floating sky islands above the clouds', sombras: 'haunted night realm with purple fog and a full moon', hielo: 'frozen ice kingdom with snow and crystals', dragon: 'volcanic dragon lands with lava and fire' };
function promptArte(c) {
  const quien = c.arq === 'reina' ? 'kind elderly queen with silver hair, golden crown and royal blue gown' : (c.aspecto && !['alba', 'bosque', 'arenas', 'cielo', 'sombras', 'hielo', 'dragon'].includes(c.aspecto) ? c.aspecto.replace(/_/g, ' ') + ' ' : '') + (ARQ_EN[c.arq] || c.arq);
  const gen = c.tipo === 'tropa' && c.g === 'F' ? 'female ' : '';
  return `Original fantasy character card illustration of a ${gen}${quien}, from the ${MUNDO_EN[c.mundo] || 'fantasy kingdom'}, ${c.tipo === 'hechizo' ? 'magical effect, epic composition' : 'heroic dynamic pose, full body, centered, big expressive face, confident smile'}, polished stylized 3D cartoon render, chunky proportions, rich vibrant colors, glossy materials, dramatic rim lighting, detailed armor and clothes, mobile strategy game splash art, background matching the world, no text, no logo, no watermark, family-friendly`;
}
function promptUnidad(c) {
  const varios = ['lanceros', 'manada', 'enjambre', 'enjambre_aire'].includes(c.arq) || c.cant > 1;
  return `${varios ? 'Only ONE single character from the reference (not a group), ' : 'The same character, '}full body from head to feet, standing in a ready-to-fight pose, seen from the front and slightly from above, centered and filling the image, polished stylized 3D cartoon render, same colors, armor and face as the reference, isolated on a solid flat pure magenta background (#FF00FF), no shadow, no ground, no scenery, no text`;
}
function arteGlory() {
  if (arteJob.activo) return arteJob;
  const imagenes = require('./imagenes'); if (!imagenes.ready()) throw new Error('Faltan las claves de Cloudflare (Ajustes)');
  const vm = require('vm'), ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(DIR, 'public', 'glory', 'cartas.js'), 'utf8'), ctx);
  const cartas = ctx.window.GLORY.cartas.filter(c => c.id !== 'glory_brown'), out = path.join(DATOS, 'arte_glory'); fs.mkdirSync(out, { recursive: true });
  const manifest = () => { const todo = fs.readdirSync(out).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)), lista = todo.filter(f => !f.endsWith('_u')), unidades = todo.filter(f => f.endsWith('_u')).map(f => f.slice(0, -2)); fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ arte: lista, unidades, fecha: new Date().toISOString() })); return lista.length; };
  const tropas = cartas.filter(c => c.tipo === 'tropa');
  arteJob = { activo: true, hechas: 0, total: cartas.length + tropas.length, error: null };
  (async () => {
    const { ff } = require('./util');
    const pend = cartas.filter(c => !fs.existsSync(path.join(out, c.id + '.webp'))), pendU = tropas.filter(c => !fs.existsSync(path.join(out, c.id + '_u.webp'))); arteJob.hechas = arteJob.total - pend.length - pendU.length;
    let sinCupo = false;
    for (const c of pend) {
      const tmp = path.join(out, c.id + '.tmp.png');
      try { await imagenes.generar({ prompt: promptArte(c), out: tmp, formato: 'cuadrado', log: say }); await ff(['-i', tmp, '-vf', 'scale=640:640', '-quality', '82', path.join(out, c.id + '.webp')]); arteJob.hechas++; if (arteJob.hechas % 5 === 0) manifest(); }
      catch (e) { arteJob.error = e.message; if (/cupo/.test(e.message)) { sinCupo = true; say('🎨 Ilustraciones: se acabó el cupo gratis de hoy, sigo mañana solo.'); break; } say('Ilustración ' + c.n + ': ' + e.message.slice(0, 120)); }
      finally { fs.rmSync(tmp, { force: true }); }
    }
    // Personaje recortado para la batalla: el mismo de su ilustración, de cuerpo entero y sin fondo
    if (!sinCupo) for (const c of pendU) {
      const ref = path.join(out, c.id + '.webp'); if (!fs.existsSync(ref)) continue; const tmp = path.join(out, c.id + '_u.tmp.png');
      try { await imagenes.generar({ prompt: promptUnidad(c), out: tmp, formato: 'cuadrado', refFiles: [ref], log: say }); await ff(['-i', tmp, '-vf', 'colorkey=0xFF00FF:0.3:0.1,format=rgba,scale=384:384', '-c:v', 'libwebp', '-quality', '85', path.join(out, c.id + '_u.webp')]); arteJob.hechas++; if (arteJob.hechas % 5 === 0) manifest(); }
      catch (e) { arteJob.error = e.message; if (/cupo/.test(e.message)) { say('🎨 Personajes de batalla: se acabó el cupo gratis de hoy, sigo mañana solo.'); break; } say('Personaje ' + c.n + ': ' + e.message.slice(0, 120)); }
      finally { fs.rmSync(tmp, { force: true }); }
    }
    manifest(); arteJob.activo = false; if (arteJob.hechas >= arteJob.total) arteJob.error = null; say(`🎨 Ilustraciones de GLORY BROWN: ${arteJob.hechas}/${arteJob.total}`);
  })();
  return arteJob;
}
// Huerto Defensor: voces (biblioteca de ShortForge) e ilustraciones (Cloudflare) de sus 17 personajes.
// Se guardan en ShortForge-datos/viral/voces_huerto y arte_huerto; la página las sirve en /voces/huerto/ y /arte/huerto/.
let huertoJob = { activo: false, hechas: 0, total: 0, error: null, fase: '' };
function huertoMedios() {
  if (huertoJob.activo) return huertoJob;
  const base = path.join(DIR, 'public', 'huerto'), frases = JSON.parse(fs.readFileSync(path.join(base, 'frases.json'), 'utf8')).frases, pers = JSON.parse(fs.readFileSync(path.join(base, 'personajes.json'), 'utf8')).personajes;
  const outV = path.join(DATOS, 'voces_huerto'), outA = path.join(DATOS, 'arte_huerto'), tmp = path.join(outV, '_tmp'); fs.mkdirSync(tmp, { recursive: true }); fs.mkdirSync(outA, { recursive: true });
  const mani = (dir, ext, clave) => { const l = fs.readdirSync(dir).filter(f => f.endsWith(ext)).map(f => f.slice(0, -ext.length)); fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ [clave]: l, fecha: new Date().toISOString() })); return l.length; };
  huertoJob = { activo: true, hechas: 0, total: frases.length + pers.length, error: null, fase: 'voces' };
  (async () => {
    const tts = require('./tts'), { ff } = require('./util'), imagenes = require('./imagenes');
    try {
      const pend = frases.filter(f => !fs.existsSync(path.join(outV, f.id + '.mp3'))); huertoJob.hechas = frases.length - pend.length;
      for (let i = 0; i < pend.length; i += 9) {
        const lote = pend.slice(i, i + 9).map(f => ({ id: f.id, text: f.texto, base: path.join(tmp, f.id), v: { voice: f.voz.edge, rate: f.voz.rate || 0, pitch: f.voz.pitch || 0 } }));
        await tts.synthAll(lote, m => say('Voces Huerto: ' + m));
        for (const it of lote) { try { if (it.file && fs.existsSync(it.file)) { const dest = path.join(outV, it.id + '.mp3'); if (it.file.endsWith('.mp3')) fs.copyFileSync(it.file, dest); else await ff(['-i', it.file, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', dest]); } } catch (e) {} }
        huertoJob.hechas = Math.min(frases.length, huertoJob.hechas + lote.length); mani(outV, '.mp3', 'voces');
      }
    } catch (e) { huertoJob.error = e.message; say('Voces Huerto: ' + e.message); }
    try { mani(outV, '.mp3', 'voces'); fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    huertoJob.fase = 'ilustraciones'; huertoJob.hechas = frases.length;
    if (!imagenes.ready()) { huertoJob.error = 'Voces listas. Para las ilustraciones faltan las claves de Cloudflare (Ajustes).'; }
    else for (const pj of pers) {
      const dest = path.join(outA, pj.id + '.webp'); if (fs.existsSync(dest)) { huertoJob.hechas++; continue; }
      const t0 = path.join(outA, pj.id + '.tmp.png'), verde = pj.fondo === 'verde';
      try { await imagenes.generar({ prompt: `${pj.prompt}, isolated on a solid flat pure ${verde ? 'green (#00FF00)' : 'magenta (#FF00FF)'} background, no shadow, no ground, no text, family-friendly`, out: t0, formato: 'cuadrado', log: say });
        await ff(['-i', t0, '-vf', `colorkey=${verde ? '0x00FF00' : '0xFF00FF'}:0.3:0.1,format=rgba,scale=384:384`, '-c:v', 'libwebp', '-quality', '85', dest]); huertoJob.hechas++; mani(outA, '.webp', 'arte'); }
      catch (e) { huertoJob.error = e.message; if (/cupo/.test(e.message)) { say('🌱 Ilustraciones del huerto: se acabó el cupo gratis de hoy; vuelve a apretar el botón mañana.'); break; } say('Ilustración ' + pj.nombre + ': ' + e.message.slice(0, 120)); }
      finally { fs.rmSync(t0, { force: true }); }
    }
    try { mani(outA, '.webp', 'arte'); } catch (e) {}
    huertoJob.activo = false; say(`🌱 Huerto Defensor: voces e ilustraciones ${huertoJob.hechas}/${huertoJob.total}`);
  })();
  return huertoJob;
}
function ajustes(o) { const s = S(); if (o.destacado !== undefined) s.destacado = !!o.destacado; if (o.tunel !== undefined) { s.tunel = !!o.tunel; if (s.on) (s.tunel ? encenderTunel() : apagarTunel()); } saveAll.settings(); }

function start() {
  if (S().on) encender().catch(e => say(e.message));
  setInterval(() => destacar().catch(() => {}), 10 * 60000);
  setTimeout(() => destacar().catch(() => {}), 60000);
  setInterval(() => { try { if (!arteJob.activo && arteJob.total && arteJob.hechas < arteJob.total) arteGlory(); } catch (e) {} }, 6 * 3600000);
  const fin = () => { try { st.tunel?.kill(); st.pagina?.kill(); } catch (e) {} };
  process.on('exit', fin);
  for (const sig of ['SIGINT', 'SIGTERM']) process.once(sig, () => { fin(); process.exit(0); });
}

module.exports = { start, encender, apagar, estado, configurar, ajustes, destacar, admin, vocesGlory, arteGlory, huertoMedios };
