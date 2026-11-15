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
  proceso().catch(e => { state.error = e.message || String(e); state.fase = ''; console.log('[Actualizar] Error: ' + state.error); });
  return { ok: 1, enCurso: true, version: state.nueva };
}
async function proceso() {
  const tmp = path.join(DATA, 'cache', 'act-' + uid());
  try {
    fs.mkdirSync(tmp, { recursive: true });
    console.log('[Actualizar] Descargando la versión ' + state.nueva + '...');
    const r = await fetch(`https://codeload.github.com/${repo()}/zip/refs/heads/main`, { signal: AbortSignal.timeout(45 * 60000) });
    if (!r.ok) throw new Error('No pude descargar la actualización (' + r.status + ')');
    state.total = +r.headers.get('content-length') || 0;
    const zip = path.join(tmp, 'act.zip'), partes = [];
    for await (const c of r.body) { partes.push(Buffer.from(c)); state.bajado += c.length; }
    fs.writeFileSync(zip, Buffer.concat(partes)); state.fase = 'Instalando';
    console.log('[Actualizar] Descarga lista (' + Math.round(state.bajado / 1e5) / 10 + ' MB). Instalando...');
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
    const bk = path.join(require('./util').USERDATA, 'respaldos', 'programa-' + local());
    if (!fs.existsSync(bk)) fs.cpSync(ROOT, bk, { recursive: true, filter: s => !/[\\/](node_modules|\.git)([\\/]|$)/.test(s) });
    // servidor.bat está abierto mientras corre el programa: no se reemplaza en caliente (rara vez cambia).
    fs.cpSync(src, ROOT, { recursive: true, force: true, filter: s => !/[\\/]\.git([\\/]|$)/.test(s) && !/servidor\.bat$/i.test(s) });
    db.settings.lastUpdate = { version: state.nueva, at: new Date().toISOString() }; saveAll.settings();
    console.log('[Actualizar] Instalada la versión ' + state.nueva + '. Reiniciando...');
    setTimeout(() => process.exit(0), 1500); // servidor.bat lo vuelve a abrir solo
    state.fase = 'Reiniciando';
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
