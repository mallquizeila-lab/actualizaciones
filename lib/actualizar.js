// Actualizaciones con un clic: el programa se descarga de tu repositorio de GitHub
// (mallquizeila-lab/actualizaciones) y reemplaza SOLO los archivos del programa.
// Tus datos (claves, canales, voces, videos) viven en ShortForge-datos y no se tocan.
// Después se reinicia solo (servidor.bat lo vuelve a abrir en 5 segundos).
const fs = require('fs'), path = require('path');
const { ROOT, DATA, run, uid } = require('./util');
const { db, saveAll } = require('./store');

const repo = () => db.settings.updateRepo || 'mallquizeila-lab/actualizaciones';
const local = () => { try { return fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim(); } catch (e) { return '0'; } };
const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 4; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
const state = { ultima: null, nueva: null, notas: '', error: null, instalando: false, bajado: 0, total: 0, fase: '' };
// Registro de cada paso (si algo corta la instalación, al volver se sabe en qué paso fue)
const LOG = path.join(DATA, 'actualizar.log'), INTENTO = path.join(DATA, 'actualizar-intento.json');
const paso = (fase, extra = {}) => { state.fase = fase; console.log('[Actualizar] ' + fase); try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + fase + '\n'); fs.writeFileSync(INTENTO, JSON.stringify({ version: state.nueva, fase, fecha: new Date().toISOString(), ...extra })); } catch (e) {} };
try { const I = JSON.parse(fs.readFileSync(INTENTO, 'utf8')); if (I.fase !== 'listo' && I.version && I.version !== local() && Date.now() - new Date(I.fecha).getTime() < 2 * 864e5) state.error = `La instalación de la v${I.version} se cortó en el paso «${I.fase}». Vuelve a pulsar «Instalar la mejora».`; } catch (e) {}

async function buscar() {
  state.error = null;
  try {
    const base = `https://raw.githubusercontent.com/${repo()}/main/`;
    // Primero la API de GitHub (siempre al día); raw.githubusercontent guarda copia vieja unos minutos.
    const leer = async f => {
      const a = await fetch(`https://api.github.com/repos/${repo()}/contents/${f}?ref=main`, { headers: { accept: 'application/vnd.github.raw', 'user-agent': 'ShortForge' }, signal: AbortSignal.timeout(20000) }).catch(() => null);
      if (a?.ok) return a.text();
      const r = await fetch(base + f, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(r.status === 404 ? 'Todavía no hay actualizaciones publicadas' : 'GitHub ' + r.status);
      return r.text();
    };
    const v = (await leer('VERSION')).trim();
    state.sha = await fetch(`https://api.github.com/repos/${repo()}/commits/main`, { headers: { accept: 'application/vnd.github.sha', 'user-agent': 'ShortForge' }, signal: AbortSignal.timeout(20000) }).then(r => r.ok ? r.text() : null).catch(() => null);
    if (!/^[0-9a-f]{40}$/.test(state.sha || '')) state.sha = null;
    state.ultima = new Date().toISOString();
    state.nueva = cmp(v, local()) > 0 ? v : null;
    if (state.nueva) {
      const n = await leer('NOVEDADES.txt').catch(() => '');
      state.notas = n.split(/\r?\n\r?\n/)[0].slice(0, 1500);
    }
  } catch (e) { state.error = e.message; }
  return estado();
}

// Responde al instante y trabaja en segundo plano: el panel va mostrando cuánto lleva descargado
// (en conexiones lentas, como algunos VPS, la descarga puede tardar varios minutos).
async function instalar() {
  if (state.instalando) return { ok: 1, enCurso: true, version: state.nueva };
  await buscar();
  if (!state.nueva) throw new Error(state.error || 'Ya tienes la última versión');
  state.instalando = true; state.error = null; state.bajado = 0; state.total = 0; state.fase = 'Descargando';
  proceso().catch(e => { state.error = e.message || String(e); paso('Error: ' + state.error); state.fase = ''; });
  return { ok: 1, enCurso: true, version: state.nueva };
}
// ⚡ Liviana: pide a GitHub la lista de archivos que cambiaron desde la versión instalada y baja solo esos.
// Si no se puede (primera vez, demasiados cambios, GitHub no responde) se usa la descarga completa de siempre.
async function liviana(tmp) {
  const vieja = db.settings.lastUpdate?.sha, nueva = state.sha; if (!vieja || !nueva || vieja === nueva) return false;
  const c = await fetch(`https://api.github.com/repos/${repo()}/compare/${vieja}...${nueva}`, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'ShortForge' }, signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (!c?.ok) return false; const J = await c.json().catch(() => null); const F = (J?.files || []).filter(f => f.status !== 'removed');
  if (!J || J.status === 'diverged' || !J.files?.length || J.files.length >= 290) return false;
  state.total = 0; state.bajado = 0; // el panel muestra los MB bajados
  paso(`Descargando solo lo que cambió (${F.length} archivos)`);
  const dst = path.join(tmp, 'nuevo');
  for (const f of F) {
    if (/^servidor(-vps)?\.bat$/i.test(f.filename) || /(^|\/)\.git(\/|$)/.test(f.filename)) continue;
    const url = `https://raw.githubusercontent.com/${repo()}/${nueva}/${f.filename.split('/').map(encodeURIComponent).join('/')}`;
    let r = null; for (let i = 0; i < 3 && !r?.ok; i++) r = await fetch(url, { signal: AbortSignal.timeout(10 * 60000) }).catch(() => null);
    if (!r?.ok) throw new Error('No pude bajar ' + f.filename);
    const out = path.join(dst, f.filename), buf = Buffer.from(await r.arrayBuffer()); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buf); state.bajado += buf.length;
  }
  paso('Respaldando los archivos que se van a cambiar');
  const bk = path.join(require('./util').USERDATA, 'respaldos', 'programa-' + local());
  for (const f of F) { const o = path.join(ROOT, f.filename); if (fs.existsSync(o)) { try { fs.mkdirSync(path.dirname(path.join(bk, f.filename)), { recursive: true }); fs.copyFileSync(o, path.join(bk, f.filename)); } catch (e) {} } }
  paso('Copiando archivos nuevos'); if (fs.existsSync(dst)) await fs.promises.cp(dst, ROOT, { recursive: true, force: true });
  return true;
}
async function proceso() {
  const tmp = path.join(DATA, 'cache', 'act-' + uid());
  try {
    fs.mkdirSync(tmp, { recursive: true });
    if (await liviana(tmp).catch(e => { paso('Descarga liviana no disponible: ' + String(e.message || e).slice(0, 80)); return false; })) return terminar();
    paso('Descargando la versión ' + state.nueva);
    const r = await fetch(`https://codeload.github.com/${repo()}/zip/${state.sha || 'refs/heads/main'}`, { signal: AbortSignal.timeout(45 * 60000) });
    if (!r.ok) throw new Error('No pude descargar la actualización (' + r.status + ')');
    state.total = +r.headers.get('content-length') || 0;
    const zip = path.join(tmp, 'act.zip'), ws = fs.createWriteStream(zip);
    for await (const c of r.body) { state.bajado += c.length; if (!ws.write(c)) await new Promise(ok => ws.once('drain', ok)); }
    await new Promise((ok, no) => ws.end(e => e ? no(e) : ok())); paso('Descomprimiendo (' + Math.round(state.bajado / 1e5) / 10 + ' MB)'); state.fase = 'Instalando';
    // Windows 10/11 trae "tar", que abre zips; si no, PowerShell.
    // Si el antivirus bloquea algún archivo suelto, la descompresión "falla" pero el resto queda: se sigue igual si el programa está completo.
    const valido = () => { try { const d = fs.readdirSync(tmp, { withFileTypes: true }).find(x => x.isDirectory()); return d && fs.existsSync(path.join(tmp, d.name, 'server.js')) && fs.existsSync(path.join(tmp, d.name, 'lib', 'worker.js')); } catch (e) { return false; } };
    try { await run('tar', ['-xf', zip, '-C', tmp]); } catch (e) { console.log('[Actualizar] tar avisó un problema: ' + String(e.message || e).slice(0, 160)); }
    if (!valido()) { try { await run('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${tmp}' -Force`]); } catch (e2) { console.log('[Actualizar] Expand-Archive avisó un problema'); } }
    if (!valido()) { try { await run('unzip', ['-o', '-q', zip, '-d', tmp]); } catch (e3) {} }
    const dir = fs.readdirSync(tmp, { withFileTypes: true }).find(d => d.isDirectory());
    const src = dir && path.join(tmp, dir.name);
    if (!src || !fs.existsSync(path.join(src, 'server.js'))) throw new Error('La actualización descargada no es válida');
    // Respaldo del programa actual por si algo sale mal.
    // Respaldo liviano (solo el código, sin carpetas pesadas) y copia SIN congelar ShortForge (async).
    paso('Respaldando la versión actual');
    const bk = path.join(require('./util').USERDATA, 'respaldos', 'programa-' + local()), PESADAS = /[\\/](node_modules|\.git|ia_local|\.venv|python|descargas|entrada|musica|efectos|cache|respaldos|data|laminas)([\\/]|$)/i;
    if (!fs.existsSync(bk)) await fs.promises.cp(ROOT, bk, { recursive: true, filter: s => !PESADAS.test(s.slice(ROOT.length)) }).catch(e => paso('Respaldo omitido: ' + e.message.slice(0, 80)));
    // servidor.bat está abierto mientras corre el programa: no se reemplaza en caliente (rara vez cambia).
    paso('Copiando archivos nuevos');
    await fs.promises.cp(src, ROOT, { recursive: true, force: true, filter: s => !/[\\/]\.git([\\/]|$)/.test(s) && !/servidor(-vps)?\.bat$/i.test(s) });
    return terminar();
  } finally {
    state.instalando = false;
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  }
}
function terminar() {
    paso('listo');
    db.settings.lastUpdate = { version: state.nueva, sha: state.sha || null, at: new Date().toISOString() }; saveAll.settings();
    console.log('[Actualizar] Instalada la versión ' + state.nueva + '. Reiniciando...'); try { fs.appendFileSync(LOG, new Date().toISOString() + ' Instalada ' + state.nueva + '\n'); } catch (e) {}
    setTimeout(() => process.exit(0), 1500); // servidor.bat lo vuelve a abrir solo
    state.fase = 'Reiniciando';
    return { ok: 1, version: state.nueva };
}

function estado() { return { version: local(), repo: repo(), ...state }; }

function start() {
  setTimeout(() => buscar().then(s => { if (s.nueva) try { require('./avisos').avisar(`🔄 Hay una mejora nueva de ShortForge (v${s.nueva}). Instálala en Ajustes → Actualizaciones.`); } catch (e) {} }).catch(() => {}), 60000);
  setInterval(() => buscar().catch(() => {}), 12 * 3600000);
}

module.exports = { buscar, instalar, estado, start };
