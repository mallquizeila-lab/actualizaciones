// Archivos para el Asistente IA: fotos, capturas, videos (se miran 6 cuadros) y textos (txt, csv, json, srt…).
// Se guardan 7 días en cache/chat y solo se usan para la conversación.
const fs = require('fs'), path = require('path');
const { DATA, ff, run, uid } = require('./util');
const DIR = path.join(DATA, 'cache', 'chat');
const IMG = /\.(jpe?g|png|webp|gif|bmp|avif)$/i, VID = /\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i, TXT = /\.(txt|csv|tsv|md|json|srt|vtt|log|html?|xml|ya?ml|js|py)$/i;
const okId = id => /^[a-z0-9]{6,20}(_\d)?$/.test(String(id));

function limpiar() { try { for (const f of fs.readdirSync(DIR)) { const p = path.join(DIR, f); if (Date.now() - fs.statSync(p).mtimeMs > 7 * 86400000) fs.rmSync(p, { force: true }); } } catch (e) {} }

async function guardar(nombre, buf) {
  fs.mkdirSync(DIR, { recursive: true }); limpiar();
  const id = uid().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || Date.now().toString(36), ext = path.extname(nombre).toLowerCase();
  if (/\.pdf$/i.test(nombre)) throw new Error('Los PDF todavía no: ábrelo y manda capturas de las páginas, o copia y pega el texto.');
  if (/\.(heic|heif)$/i.test(nombre)) throw new Error('Las fotos HEIC del iPhone no se pueden leer: mándala como captura de pantalla o en JPG.');
  const tmp = path.join(DIR, id + '_orig' + ext); fs.writeFileSync(tmp, buf);
  try {
    if (IMG.test(nombre)) {
      await ff(['-i', tmp, '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2", '-q:v', '4', path.join(DIR, id + '.jpg')]);
      return { id, nombre, tipo: 'imagen' };
    }
    if (VID.test(nombre)) {
      const dur = parseFloat(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', tmp])) || 10;
      const frames = [];
      for (let k = 0; k < 6; k++) {
        const fid = `${id}_${k}`;
        await ff(['-ss', (dur * (k + 0.5) / 6).toFixed(2), '-i', tmp, '-frames:v', '1', '-vf', "scale='min(768,iw)':-2", '-q:v', '5', path.join(DIR, fid + '.jpg')]).catch(() => {});
        if (fs.existsSync(path.join(DIR, fid + '.jpg'))) frames.push(fid);
      }
      if (!frames.length) throw new Error('No pude leer ese video');
      return { id, nombre, tipo: 'video', frames, duracion: Math.round(dur) };
    }
    if (TXT.test(nombre) || !/[\x00-\x08]/.test(buf.subarray(0, 2000).toString('latin1'))) {
      const t = buf.toString('utf8').replace(/\r/g, '').slice(0, 20000);
      fs.writeFileSync(path.join(DIR, id + '.txt'), t);
      return { id, nombre, tipo: 'texto', chars: t.length };
    }
    throw new Error('Ese tipo de archivo no lo puedo leer. Sirven fotos, capturas, videos y archivos de texto (txt, csv, json, srt).');
  } finally { fs.rmSync(tmp, { force: true }); }
}

const ruta = (id, ext) => okId(id) ? path.join(DIR, id + ext) : null;
const imagen = id => { const p = ruta(id, '.jpg'); return p && fs.existsSync(p) ? p : null; };
const texto = id => { const p = ruta(id, '.txt'); return p && fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };

// Arma el mensaje con los archivos: los textos van pegados al mensaje y las imágenes como "image_url".
function armar(mensajes) {
  let imgs = 0; const MAX = 6;
  const out = mensajes.map(m => ({ role: m.role, content: String(m.content || '').slice(0, 12000), adj: Array.isArray(m.adj) ? m.adj.slice(0, 8) : [] }));
  // Las imágenes se mandan solo de los mensajes más recientes (de atrás hacia adelante) hasta 6.
  for (let i = out.length - 1; i >= 0; i--) {
    const m = out[i]; if (m.role !== 'user' || !m.adj.length) continue;
    const partes = [], notas = [];
    for (const a of m.adj) {
      if (a.tipo === 'texto') { const t = texto(a.id); if (t) notas.push(`\n\n[Archivo "${String(a.nombre).slice(0, 80)}"]\n${t.slice(0, 15000)}`); else notas.push(`\n\n[El archivo "${a.nombre}" ya no está disponible]`); }
      const ids = a.tipo === 'imagen' ? [a.id] : a.tipo === 'video' ? (a.frames || []) : [];
      if (a.tipo === 'video') notas.push(`\n\n[Video "${String(a.nombre).slice(0, 80)}"${a.duracion ? `, ${a.duracion} s` : ''}: te paso ${ids.length} cuadros en orden, del inicio al final]`);
      for (const id of ids) {
        const p = imagen(id); if (!p || imgs >= MAX) continue;
        partes.push({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64') } }); imgs++;
      }
    }
    m.content = partes.length ? [{ type: 'text', text: (m.content || 'Analiza esto.') + notas.join('') }, ...partes] : m.content + notas.join('');
  }
  return { mensajes: out.map(({ role, content }) => ({ role, content })), imagenes: imgs };
}

module.exports = { guardar, imagen, armar };
