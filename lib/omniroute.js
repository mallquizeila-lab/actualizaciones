// 🔀 OmniRoute: relevo local de IA gratis (licencia MIT). ShortForge lo instala, lo enciende y lo vigila.
// Seguridad: SIEMPRE escucha solo en esta PC (127.0.0.1); por defecto OmniRoute se abriría a toda la red.
const fs = require('fs'), path = require('path'), { spawn, execFile } = require('child_process');
const { E, USERDATA, DATA } = require('./util');
const { db, saveAll } = require('./store');

const PUERTO = 20128, URL_ = () => (E.OMNIROUTE_URL || `http://127.0.0.1:${PUERTO}`).replace(/\/+$/, '');
const LOG = path.join(DATA, 'omniroute.log'), PID = path.join(DATA, 'omniroute.pid'), DIR = path.join(USERDATA, 'omniroute');
const WIN = process.platform === 'win32', NPM = WIN ? 'npm.cmd' : 'npm';
const st = { instalando: false, arrancando: false, msg: '', raiz: null, ultimo: null };
const cfg = () => (db.settings.omniroute = db.settings.omniroute || { on: false });
const anota = t => { st.msg = t; console.log('[OmniRoute] ' + t); try { if (fs.existsSync(LOG) && fs.statSync(LOG).size > 2e6) fs.writeFileSync(LOG, ''); fs.appendFileSync(LOG, new Date().toISOString() + ' ' + t + '\n'); } catch (e) {} };

// Node mínimo que pide OmniRoute: 22.22.2+ o 24+
function nodeOk(v = process.versions.node) { const [a, b, c] = v.split('.').map(Number); return a >= 24 || (a === 22 && (b > 22 || (b === 22 && c >= 2))); }
function raizGlobal() {
  if (st.raiz) return Promise.resolve(st.raiz);
  return new Promise(ok => execFile(NPM, ['root', '-g'], { shell: WIN, windowsHide: true, timeout: 30000 }, (e, out) => { st.raiz = e ? null : String(out).trim() || null; ok(st.raiz); }));
}
async function paquete() { const r = process.env.OMNIROUTE_NPM_ROOT || await raizGlobal(); if (!r) return null; const f = path.join(r, 'omniroute', 'package.json'); try { return { dir: path.dirname(f), version: JSON.parse(fs.readFileSync(f, 'utf8')).version }; } catch (e) { return null; } }
async function corriendo() { try { const r = await fetch(URL_() + '/v1/models', { signal: AbortSignal.timeout(4000) }); return r.status > 0; } catch (e) { return false; } }

async function estado() {
  const p = await paquete(), on = await corriendo();
  return { claves: Object.keys(cfg().claves || {}), sincronizando, activo: !!cfg().on, instalado: !!p, version: p?.version || null, corriendo: on, instalando: st.instalando, arrancando: st.arrancando, msg: st.msg, node: process.versions.node, nodeOk: nodeOk(), panel: URL_() + '/dashboard', url: URL_() + '/v1' };
}

function instalar() {
  if (st.instalando) return; if (!nodeOk()) throw new Error(`OmniRoute necesita Node.js 24 LTS (tienes ${process.versions.node}). Instálalo desde https://nodejs.org y reinicia ShortForge.`);
  st.instalando = true; anota('Instalando OmniRoute (npm install -g omniroute)… puede tardar 2 a 5 minutos');
  const ch = spawn(NPM, ['install', '-g', 'omniroute@latest', '--no-audit', '--no-fund'], { shell: WIN, windowsHide: true });
  const out = fs.openSync(LOG, 'a'); ch.stdout.on('data', d => fs.writeSync(out, d)); ch.stderr.on('data', d => fs.writeSync(out, d));
  ch.on('close', async code => { st.instalando = false; st.raiz = null; try { fs.closeSync(out); } catch (e) {}
    if (code === 0) { anota('Instalado ✅'); cfg().on = true; saveAll.settings(); arrancar().catch(e => anota('No arrancó: ' + e.message)); }
    else anota('La instalación falló (código ' + code + '). Mira el registro: ' + LOG); });
  ch.on('error', e => { st.instalando = false; anota('No pude ejecutar npm: ' + e.message); });
}

async function arrancar() {
  if (st.arrancando) return; if (await corriendo()) { anota('Ya está encendido'); return; }
  const p = await paquete(); if (!p) throw new Error('OmniRoute no está instalado: pulsa «Instalar»');
  if (!nodeOk()) throw new Error(`OmniRoute necesita Node.js 24 LTS (tienes ${process.versions.node})`);
  st.arrancando = true; fs.mkdirSync(DIR, { recursive: true }); anota('Encendiendo OmniRoute en ' + URL_());
  const out = fs.openSync(LOG, 'a');
  const ch = spawn(process.execPath, [path.join(p.dir, 'bin', 'omniroute.mjs'), 'serve', '--no-open', '--port', String(PUERTO)], {
    cwd: DIR, detached: true, windowsHide: true, stdio: ['ignore', out, out],
    env: { ...process.env, PORT: String(PUERTO), OMNIROUTE_SERVER_HOST: '127.0.0.1', DATA_DIR: DIR, OMNIROUTE_CLI_SKIP_REPO_ENV: '1', NO_UPDATE_NOTIFIER: '1' },
  });
  ch.on('error', e => anota('No arrancó: ' + e.message)); ch.unref(); try { fs.writeFileSync(PID, String(ch.pid)); } catch (e) {}
  for (let i = 0; i < 40 && !(await corriendo()); i++) await new Promise(r => setTimeout(r, 3000));
  st.arrancando = false; if (await corriendo()) { anota('Encendido ✅ (solo en esta PC)'); setTimeout(() => sincronizar().catch(e => anota('Claves: ' + e.message)), 20000); } else anota('Tarda en encender; revisa el registro: ' + LOG);
}

// 🔗 Conecta solo tus claves gratis de ShortForge en OmniRoute (con su propia herramienta oficial; la clave viaja
// por una variable de entorno local, nunca por la red). Solo vuelve a tocar una clave si cambió.
const CLAVES = [['GEMINI_API_KEY', 'gemini', 'Gemini'], ['GROQ_API_KEY', 'groq', 'Groq'], ['NVIDIA_API_KEY', 'nvidia', 'NVIDIA'], ['GITHUB_TOKEN', 'github', 'GitHub Models'], ['OPENROUTER_API_KEY', 'openrouter', 'OpenRouter'], ['CEREBRAS_API_KEY', 'cerebras', 'Cerebras'], ['MISTRAL_API_KEY', 'mistral', 'Mistral']];
const huella = k => require('crypto').createHash('sha256').update('sf|' + k).digest('hex').slice(0, 16);
function cli(p, args, clave) { return new Promise(ok => { const ch = spawn(process.execPath, [path.join(p.dir, 'bin', 'omniroute.mjs'), ...args], { cwd: DIR, windowsHide: true, env: { ...process.env, PORT: String(PUERTO), SF_K: clave, DATA_DIR: DIR, OMNIROUTE_CLI_SKIP_REPO_ENV: '1', NO_UPDATE_NOTIFIER: '1' } });
  let err = ''; ch.stderr.on('data', d => { err += d; }); ch.stdout.on('data', d => { if (err.length < 4000) err += d; }); const t = setTimeout(() => { try { ch.kill(); } catch (e) {} }, 120000);
  ch.on('close', code => { clearTimeout(t); ok({ ok: code === 0, err: err.replace(/\x1b\[[0-9;]*m/g, '').trim().slice(-200) }); }); ch.on('error', e => { clearTimeout(t); ok({ ok: false, err: e.message }); }); }); }
let sincronizando = false;
async function sincronizar(forzar = false) {
  if (sincronizando || !(await corriendo())) return; const p = await paquete(); if (!p) return; sincronizando = true;
  const c = cfg(), h = c.claves = c.claves || {}, hechos = [], fallos = [];
  try { for (const [env, id, nom] of CLAVES) { const k = E[env]; if (!k) continue; const f = huella(k); if (!forzar && h[id] === f) continue;
      const nombre = 'shortforge-' + id; let r = await cli(p, ['providers', 'edit', nombre, '--credential-env', 'SF_K', '--active', '--json'], k);
      if (!r.ok) { r = await cli(p, ['providers', 'add', id, '--name', nombre, '--credential-env', 'SF_K', '--yes', '--json'], k); if (r.ok) r = await cli(p, ['providers', 'edit', nombre, '--active', '--json'], k); }
      if (!r.ok) { await new Promise(z => setTimeout(z, 8000)); r = await cli(p, ['providers', 'add', id, '--name', nombre, '--credential-env', 'SF_K', '--yes', '--json'], k); if (!r.ok) r = await cli(p, ['providers', 'edit', nombre, '--credential-env', 'SF_K', '--active', '--json'], k); else r = await cli(p, ['providers', 'edit', nombre, '--active', '--json'], k); }
      if (r.ok) { h[id] = f; hechos.push(nom); } else fallos.push(nom + (r.err ? ' (' + r.err.split('\n').filter(x => /error|✖|fail/i.test(x)).slice(-1)[0]?.trim().slice(0, 140) + ')' : '')); }
    saveAll.settings();
  } finally { sincronizando = false; }
  if (hechos.length || fallos.length) anota((hechos.length ? '🔗 Claves conectadas en OmniRoute: ' + hechos.join(', ') : '') + (fallos.length ? (hechos.length ? ' · ' : '') + 'No se pudo: ' + fallos.join('; ') : ''));
  else if (forzar) anota('No hay claves de IA en ShortForge para conectar');
}

function detener() {
  let pid = null; try { pid = +fs.readFileSync(PID, 'utf8'); } catch (e) {}
  if (pid) { if (WIN) spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }); else try { process.kill(-pid); } catch (e) { try { process.kill(pid); } catch (e2) {} } }
  try { fs.unlinkSync(PID); } catch (e) {} anota('Apagado');
}

async function ajustar(o = {}) {
  const c = cfg();
  if (o.accion === 'instalar') instalar();
  else if (o.accion === 'encender') { c.on = true; saveAll.settings(); arrancar().catch(e => anota(e.message)); }
  else if (o.accion === 'apagar') { c.on = false; saveAll.settings(); detener(); }
  else if (o.accion === 'claves') { anota('Conectando tus claves en OmniRoute…'); sincronizar(true).catch(e => anota('Claves: ' + e.message)); }
  return estado();
}

// 👀 Vigilante: si está activado y se cae (o se reinició la PC), lo vuelve a encender solo
async function vigilar() { try { if (!cfg().on || st.instalando || st.arrancando) return; if (await corriendo()) return sincronizar(); /* si cambiaste o agregaste una clave, se conecta sola */ if (!(await paquete())) return; anota('No respondía: lo vuelvo a encender'); await arrancar(); } catch (e) { anota('Vigilante: ' + e.message); } }
function iniciar() { setTimeout(vigilar, 20000); setInterval(vigilar, 3 * 60000); }

module.exports = { estado, ajustar, iniciar, nodeOk };
