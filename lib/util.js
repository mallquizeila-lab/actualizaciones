// Utilidades comunes: .env, procesos, JSON, nombres de archivo.
const fs = require('fs'), path = require('path'), os = require('os'), { execFile } = require('child_process');

// El programa (ROOT) se puede reemplazar al actualizar. Tus datos viven aparte, en una carpeta
// fija que ninguna actualización toca: C:\Users\<tú>\ShortForge-datos
const ROOT = path.join(__dirname, '..');
const USERDATA = process.env.SHORTFORGE_DATA || path.join(os.homedir(), 'ShortForge-datos');
const DATA = path.join(USERDATA, 'data');
const ENV_FILE = path.join(USERDATA, '.env');

// Busca copias anteriores de ShortForge (carpetas viejas o anidadas) que tengan claves o canales.
function oldCopies() {
  const roots = [ROOT, path.dirname(ROOT), path.dirname(path.dirname(ROOT)), ...['Documents', 'Documentos', 'Desktop', 'Escritorio', 'Downloads', 'Descargas'].map(d => path.join(os.homedir(), d))];
  const found = new Set();
  const walk = (d, depth) => {
    if (depth < 0 || found.size > 20) return;
    let list; try { list = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    if (list.some(f => f.name === 'server.js') && fs.existsSync(path.join(d, 'lib', 'worker.js'))) found.add(d);
    for (const f of list) if (f.isDirectory() && !/^(node_modules|\.venv|venv|data|\.git|motor_chatterbox)$/.test(f.name)) walk(path.join(d, f.name), depth - 1);
  };
  roots.forEach(r => walk(r, 3));
  // Gana la copia con MÁS información (claves llenas + canales + videos), no la más reciente:
  // una carpeta nueva y vacía nunca le gana a la que tiene tus datos.
  const score = d => {
    let n = 0;
    try { n += 10 * fs.readFileSync(path.join(d, '.env'), 'utf8').split(/\r?\n/).filter(l => /^[A-Z0-9_]+\s*=\s*\S/.test(l)).length; } catch (e) {}
    try { n += 5 * JSON.parse(fs.readFileSync(path.join(d, 'data', 'channels.json'), 'utf8')).length; } catch (e) {}
    try { n += JSON.parse(fs.readFileSync(path.join(d, 'data', 'jobs.json'), 'utf8')).length; } catch (e) {}
    return n;
  };
  return [...found].filter(d => score(d) > 0).sort((a, b) => score(b) - score(a));
}

// Primera vez con esta versión: copia (no mueve) lo de la copia anterior más reciente de ShortForge.
function migrate() {
  fs.mkdirSync(USERDATA, { recursive: true });
  const src = fs.existsSync(path.join(USERDATA, '.env')) && fs.existsSync(path.join(USERDATA, 'data')) ? null : oldCopies()[0];
  // .env: junta las claves de TODAS las copias viejas (la más reciente gana si se repite)
  if (!fs.existsSync(ENV_FILE)) {
    const keys = {};
    const envs = oldCopies().map(d => path.join(d, '.env')).filter(f => fs.existsSync(f))
      .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
    for (const f of envs) fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach(l => {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(\S.*?)\s*$/); if (m) keys[m[1]] = m[2];
    });
    if (Object.keys(keys).length) {
      fs.writeFileSync(ENV_FILE, Object.entries(keys).map(([k, v]) => k + '=' + v).join('\n') + '\n');
      console.log(`[Datos] Recuperadas ${Object.keys(keys).length} claves de ${envs.length} copias anteriores`);
    }
  }
  const pairs = [['.env', '.env'], ['data', 'data'], ['efectos', 'efectos'], ['musica', 'musica'], ['entrada', 'entrada']];
  for (const [from, to] of pairs) {
    const a = path.join(src || ROOT, from), b = path.join(USERDATA, to);
    if (!fs.existsSync(a) || fs.existsSync(b)) continue;
    try { fs.cpSync(a, b, { recursive: true }); console.log(`[Datos] Copiado ${from} a ${USERDATA}`); } catch (e) { console.log('[Datos] No pude copiar ' + from + ': ' + e.message); }
  }
  for (const d of ['efectos', 'musica', 'entrada']) fs.mkdirSync(path.join(USERDATA, d), { recursive: true });
  // Las guías de las carpetas vienen con el programa
  for (const d of ['efectos', 'musica']) { const g = path.join(ROOT, d, 'LEEME.txt'); if (fs.existsSync(g)) try { fs.copyFileSync(g, path.join(USERDATA, d, 'LEEME.txt')); } catch (e) {} }
}
migrate();

try {
  fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) {}
const E = process.env;

// Guarda claves en .env sin borrar las demás.
function setKeys(o) {
  let t = '';
  try { t = fs.readFileSync(ENV_FILE, 'utf8'); } catch (e) {}
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    E[k] = v;
    const re = new RegExp('^' + k + '=.*$', 'm');
    t = re.test(t) ? t.replace(re, k + '=' + v) : t.trimEnd() + '\n' + k + '=' + v + '\n';
  }
  fs.writeFileSync(ENV_FILE, t);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const run = (cmd, args, o = {}) => new Promise((ok, no) =>
  execFile(cmd, args, { maxBuffer: 1 << 28, windowsHide: true, ...o }, (e, so, se) =>
    e ? no(new Error(String(se || e.message).slice(-600))) : ok(so)));
const ff = (args, cwd) => run('ffmpeg', ['-y', '-v', 'error', ...args], { cwd });
const secs = async f => parseFloat(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]));

const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'video';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pick = a => a[Math.floor(Math.random() * a.length)];

// Extrae el primer objeto JSON de una respuesta de IA (tolera ```json y texto alrededor).
function parseJSON(t) {
  const s = String(t).replace(/```(json)?/gi, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('La IA no devolvió JSON');
  return JSON.parse(s.slice(a, b + 1));
}

// Fecha local AAAA-MM-DD (la PC del usuario manda la zona horaria).
const day = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return day(d); };

module.exports = { oldCopies, ROOT, USERDATA, DATA, ENV_FILE, E, setKeys, sleep, run, ff, secs, slug, uid, pick, parseJSON, day, addDays };
