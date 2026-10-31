// Biblioteca de efectos de sonido (idea de biblioteca.py de Josefino).
// Pon archivos con licencia en efectos/<categoria>/ (ej. efectos/transicion/whoosh_1.mp3).
// Las etiquetas salen del nombre del archivo y de la carpeta. Se prefiere el menos usado
// y se evita repetir los últimos, para que los videos no suenen todos igual.
const fs = require('fs'), path = require('path');
const { ROOT } = require('./util');
const { db, saveAll } = require('./store');

const DIR = path.join(require('./util').USERDATA, 'efectos');
const EXT = /\.(wav|mp3|ogg|flac|m4a)$/i;
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

let cache = { t: 0, list: [] };
function list(force) {
  if (!force && Date.now() - cache.t < 60000) return cache.list;
  const out = [];
  const walk = (d, cat) => {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p, cat || f.name);
      else if (EXT.test(f.name)) {
        const rel = path.relative(DIR, p);
        out.push({ id: norm(rel).replace(/[^a-z0-9]+/g, '_'), file: p, cat: norm(cat || 'general'), tags: new Set([norm(cat || 'general'), ...norm(f.name.replace(EXT, '')).split(/[^a-z0-9]+/).filter(t => t.length > 2)]) });
      }
    }
  };
  walk(DIR, '');
  cache = { t: Date.now(), list: out };
  return out;
}

// Sinónimos para que la IA pueda pedir el efecto en español o inglés.
const SYN = { whoosh: ['transicion', 'swoosh', 'woosh'], golpe: ['hit', 'impacto', 'boom'], latido: ['heartbeat', 'corazon'], ding: ['campana', 'bell', 'notificacion'], risa: ['laugh'], pop: ['burbuja', 'bubble'], suspenso: ['tension', 'misterio', 'riser'] };
function expand(words) {
  const s = new Set(words.map(norm));
  for (const [k, v] of Object.entries(SYN)) if (s.has(k) || v.some(x => s.has(x))) { s.add(k); v.forEach(x => s.add(x)); }
  return s;
}

function find(query, recent = []) {
  const q = expand(String(query || '').split(/[^\p{L}0-9]+/u).filter(Boolean));
  if (!q.size) return null;
  const scored = list().map(e => [[...q].filter(t => e.tags.has(t)).length, e]).filter(x => x[0]);
  if (!scored.length) return null;
  const best = Math.max(...scored.map(x => x[0]));
  let top = scored.filter(x => x[0] === best).map(x => x[1]);
  top = top.filter(e => !recent.includes(e.id)).length ? top.filter(e => !recent.includes(e.id)) : top;
  top.sort((a, b) => (db.fxUse[a.id] || 0) - (db.fxUse[b.id] || 0));
  const e = top[0];
  db.fxUse[e.id] = (db.fxUse[e.id] || 0) + 1;
  saveAll.fxUse();
  recent.push(e.id);
  return e.file;
}

// Elige un archivo de la primera categoría (carpeta) que tenga sonidos. cats: ['boom', 'impacto']
function byCat(cats, recent = []) {
  for (const c of [].concat(cats || [])) {
    let pool = list().filter(e => e.cat === norm(c));
    if (!pool.length) continue;
    pool = pool.filter(e => !recent.includes(e.id)).length ? pool.filter(e => !recent.includes(e.id)) : pool;
    pool.sort((a, b) => (db.fxUse[a.id] || 0) - (db.fxUse[b.id] || 0) || Math.random() - 0.5);
    const e = pool[0];
    db.fxUse[e.id] = (db.fxUse[e.id] || 0) + 1;
    saveAll.fxUse();
    recent.push(e.id);
    return e.file;
  }
  return null;
}

// Música según el ánimo del canal (carpetas efectos/musica_<animo>/ o la carpeta musica/).
function music(animo) {
  const m = list().filter(e => e.cat === 'musica_' + (animo || ''));
  const any = m.length ? m : list().filter(e => e.cat.startsWith('musica_'));
  return any.length ? any[Math.floor(Math.random() * any.length)].file : null;
}

// Sello sonoro del canal: siempre el mismo sonido corto al inicio (identidad de marca, como un logo de audio).
function sello(ch) {
  const fs2 = require('fs');
  if (ch.sting === false) return null;
  if (ch.sting && fs2.existsSync(ch.sting)) return ch.sting;
  const f = byCat(['campana', 'notificacion', 'pop', 'acierto'], []);
  if (f) { ch.sting = f; try { require('./store').saveAll.channels(); } catch (e) {} }
  return f || null;
}

// Fondos disponibles: música (musica_*) y ambientes (ambiente_*) de la biblioteca + tu carpeta musica/.
function fondos() {
  const out = list(true).filter(e => /^(musica|ambiente)_/.test(e.cat)).map(e => ({ file: e.file, grupo: e.cat.replace('_', ' '), nombre: path.basename(e.file).replace(EXT, '').replace(/^\d+_/, '').replace(/_/g, ' ').slice(0, 40), url: '/efectos/' + path.relative(DIR, e.file).split(path.sep).map(encodeURIComponent).join('/') }));
  const md = path.join(require('./util').USERDATA, 'musica');
  try { for (const f of fs.readdirSync(md)) if (EXT.test(f)) out.push({ file: path.join(md, f), grupo: 'mi musica', nombre: f.replace(EXT, '').slice(0, 40), url: '/musica/' + encodeURIComponent(f) }); } catch (e) {}
  return out;
}
const esFondo = f => fondos().some(x => x.file === f);

module.exports = { fondos, esFondo, sello, list, find, byCat, music, DIR };
