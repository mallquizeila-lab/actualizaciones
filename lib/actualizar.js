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
const state = { ultima: null, nueva: null, notas: '', error: null, instalando: false };

async function buscar() {
  state.error = null;
  try {
    const base = `https://raw.githubusercontent.com/${repo()}/main/`;
    const r = await fetch(base + 'VERSION', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(r.status === 404 ? 'Todavía no hay actualizaciones publicadas' : 'GitHub ' + r.status);
    const v = (await r.text()).trim();
    state.ultima = new Date().toISOString();
    state.nueva = cmp(v, local()) > 0 ? v : null;
    if (state.nueva) {
      const n = await fetch(base + 'NOVEDADES.txt', { signal: AbortSignal.timeout(20000) }).then(x => x.ok ? x.text() : '').catch(() => '');
      state.notas = n.split(/\r?\n\r?\n/)[0].slice(0, 1500);
    }
  } catch (e) { state.error = e.message; }
  return estado();
}

async function instalar() {
  if (state.instalando) throw new Error('Ya se está actualizando');
  await buscar();
  if (!state.nueva) throw new Error(state.error || 'Ya tienes la última versión');
  state.instalando = true;
  const tmp = path.join(DATA, 'cache', 'act-' + uid());
  try {
    fs.mkdirSync(tmp, { recursive: true });
    const r = await fetch(`https://codeload.github.com/${repo()}/zip/refs/heads/main`, { signal: AbortSignal.timeout(300000) });
    if (!r.ok) throw new Error('No pude descargar la actualización (' + r.status + ')');
    const zip = path.join(tmp, 'act.zip');
    fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
    // Windows 10/11 trae "tar", que abre zips; si no, PowerShell.
    try { await run('tar', ['-xf', zip, '-C', tmp]); }
    catch (e) {
      try { await run('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${tmp}' -Force`]); }
      catch (e2) { await run('unzip', ['-o', '-q', zip, '-d', tmp]); }
    }
    const dir = fs.readdirSync(tmp, { withFileTypes: true }).find(d => d.isDirectory());
    const src = dir && path.join(tmp, dir.name);
    if (!src || !fs.existsSync(path.join(src, 'server.js'))) throw new Error('La actualización descargada no es válida');
    // Respaldo del programa actual por si algo sale mal.
    const bk = path.join(require('./util').USERDATA, 'respaldos', 'programa-' + local());
    if (!fs.existsSync(bk)) fs.cpSync(ROOT, bk, { recursive: true, filter: s => !/[\\/](node_modules|\.git)([\\/]|$)/.test(s) });
    // servidor.bat está abierto mientras corre el programa: no se reemplaza en caliente (rara vez cambia).
    fs.cpSync(src, ROOT, { recursive: true, force: true, filter: s => !/[\\/]\.git([\\/]|$)/.test(s) && !/servidor\.bat$/i.test(s) });
    db.settings.lastUpdate = { version: state.nueva, at: new Date().toISOString() }; saveAll.settings();
    console.log('[Actualizar] Instalada la versión ' + state.nueva + '. Reiniciando...');
    setTimeout(() => process.exit(0), 1500); // servidor.bat lo vuelve a abrir solo
    return { ok: 1, version: state.nueva };
  } finally {
    state.instalando = false;
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  }
}

function estado() { return { version: local(), repo: repo(), ...state }; }

function start() {
  setTimeout(() => buscar().then(s => { if (s.nueva) try { require('./avisos').avisar(`🔄 Hay una mejora nueva de ShortForge (v${s.nueva}). Instálala en Ajustes → Actualizaciones.`); } catch (e) {} }).catch(() => {}), 60000);
  setInterval(() => buscar().catch(() => {}), 12 * 3600000);
}

module.exports = { buscar, instalar, estado, start };
