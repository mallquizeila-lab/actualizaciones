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

function estado() {
  const s = S();
  return { on: !!s.on, destacado: s.destacado !== false, tunelOn: s.tunel !== false, estado: st.estado, tunel: st.tunelEstado, fijo: !!E.CF_TUNNEL_TOKEN, url: urlPublica(), urlFija: E.VIRAL_URL || '',
    temporal: !E.CF_TUNNEL_TOKEN, local: `http://localhost:${PORT}`, panel: E.VIRAL_PASSWORD ? `http://localhost:${PORT}/panel?k=${token()}&tema=sf` : null,
    password: E.VIRAL_PASSWORD || null, cloudflared: fs.existsSync(CF_EXE), descargando: st.descargando, error: st.error, log: st.log.slice(-15), email: E.VIRAL_EMAIL || '' };
}
function ajustes(o) { const s = S(); if (o.destacado !== undefined) s.destacado = !!o.destacado; if (o.tunel !== undefined) { s.tunel = !!o.tunel; if (s.on) (s.tunel ? encenderTunel() : apagarTunel()); } saveAll.settings(); }

function start() {
  if (S().on) encender().catch(e => say(e.message));
  setInterval(() => destacar().catch(() => {}), 10 * 60000);
  setTimeout(() => destacar().catch(() => {}), 60000);
  const fin = () => { try { st.tunel?.kill(); st.pagina?.kill(); } catch (e) {} };
  process.on('exit', fin);
  for (const sig of ['SIGINT', 'SIGTERM']) process.once(sig, () => { fin(); process.exit(0); });
}

module.exports = { start, encender, apagar, estado, configurar, ajustes, destacar, admin };
