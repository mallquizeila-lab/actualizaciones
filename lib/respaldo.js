// 💾 Copia de seguridad diaria de los datos importantes (webs de clientes, CRM, contactos, ajustes).
// Guarda una carpeta por día en ShortForge-datos/respaldos/datos-AAAA-MM-DD y conserva las últimas 14.
// No copia fotos ni videos (pesan mucho y están en sus carpetas); solo los archivos .json de datos.
const fs = require('fs'), path = require('path');
const { USERDATA, DATA } = require('./util');
const DIR = path.join(USERDATA, 'respaldos'), DIAS = 14;
const hoy = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10); // fecha de Perú

function hacer(forzar = false) {
  try {
    const dst = path.join(DIR, 'datos-' + hoy());
    if (fs.existsSync(dst) && !forzar) return { ok: 1, ya: true };
    fs.mkdirSync(dst, { recursive: true }); let n = 0, bytes = 0;
    for (const f of fs.readdirSync(DATA)) {
      if (!/\.json$/i.test(f)) continue; const src = path.join(DATA, f), st = fs.statSync(src);
      if (!st.isFile() || st.size > 200e6) continue;
      const txt = fs.readFileSync(src, 'utf8'); try { JSON.parse(txt); } catch (e) { continue; } // no respaldar un archivo dañado
      fs.writeFileSync(path.join(dst, f), txt); n++; bytes += st.size;
    }
    // borrar los más viejos
    const L = fs.readdirSync(DIR).filter(d => /^datos-\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    for (const d of L.slice(0, Math.max(0, L.length - DIAS))) fs.rmSync(path.join(DIR, d), { recursive: true, force: true });
    console.log(`[Respaldo] ${n} archivos (${Math.round(bytes / 1024)} KB) → ${dst}`); return { ok: 1, archivos: n, carpeta: dst };
  } catch (e) { console.log('[Respaldo] ' + e.message); return { ok: 0, error: e.message }; }
}
function lista() { try { return fs.readdirSync(DIR).filter(d => /^datos-/.test(d)).sort().reverse(); } catch (e) { return []; } }
function iniciar() { setTimeout(() => hacer(), 2 * 60e3); setInterval(() => hacer(), 3 * 3600e3); }
module.exports = { hacer, lista, iniciar, DIR };
