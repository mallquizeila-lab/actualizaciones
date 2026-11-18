// 🖼️ Imagen para compartir (1200×630) de cada web de cliente: así, al pegar el enlace en WhatsApp, Facebook o
// Telegram se ve el negocio con su nombre, su frase, su logo y fotos de sus trabajos (y no un recuadro vacío).
// Se dibuja con ffmpeg y la letra Outfit (licencia libre OFL, en lib/assets/fonts). Solo se rehace si algo cambió.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawnSync } = require('child_process');
const FUENTES = path.join(__dirname, 'assets', 'fonts');

// Corta un texto en líneas de máx. n letras (sin partir palabras)
function lineas(t, n, max) {
  const out = []; let l = '';
  for (const p of String(t || '').replace(/\s+/g, ' ').trim().split(' ')) { if ((l + ' ' + p).trim().length > n && l) { out.push(l); l = p; } else l = (l + ' ' + p).trim(); }
  if (l) out.push(l); if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].replace(/\s*\S*$/, '') + '…'; } return out;
}
const claro = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return false; const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 165; };
const sinEmoji = t => String(t || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();

// fotos: rutas absolutas (la primera es la principal) · logo: ruta absoluta o null
function generar({ out, nombre, frase, color = '#7c3aed', ciudad = '', pie = '', fotos = [], logo = null }) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = fs.mkdtempSync(path.join(path.dirname(out), '.og-'));
  try {
    for (const f of ['Outfit-Bold.ttf', 'Outfit-Regular.ttf']) fs.copyFileSync(path.join(FUENTES, f), path.join(tmp, f)); // rutas relativas: evita problemas con «C:» en Windows
    const c = /^#[0-9a-f]{6}$/i.test(color) ? color : '#7c3aed', txt = claro(c) ? '0x111827' : 'white', F = fotos.filter(f => f && fs.existsSync(f)).slice(0, 3);
    const izq = F.length ? 640 : 1200, nomL = lineas(sinEmoji(nombre), F.length ? 17 : 28, 3), fraL = lineas(sinEmoji(frase), F.length ? 30 : 50, 3);
    const tam = nomL.length > 2 ? 54 : nomL.some(l => l.length > 13) ? 62 : 74;
    const args = ['-y', '-v', 'error', '-f', 'lavfi', '-i', `color=c=${c.replace('#', '0x')}:s=1200x630`];
    F.forEach(f => args.push('-i', f)); if (logo && fs.existsSync(logo)) args.push('-i', logo);
    const fil = [], ult = () => fil.length ? `[b${fil.length}]` : '[0:v]'; let k = 0;
    const pon = (inp, w, h, x, y) => { const s = `s${k++}`; fil.push(`[${inp}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1[${s}];${ult()}[${s}]overlay=${x}:${y}[b${fil.length + 1}]`); };
    if (F.length === 1) pon(1, 560, 630, 640, 0);
    else if (F.length === 2) { pon(1, 560, 313, 640, 0); pon(2, 560, 313, 640, 317); }
    else if (F.length >= 3) { pon(1, 560, 370, 640, 0); pon(2, 278, 256, 640, 374); pon(3, 278, 256, 922, 374); }
    let y = 70; const capas = []; const t = (texto, fuente, size, yy, extra = '') => { const n = `t${capas.length}.txt`; fs.writeFileSync(path.join(tmp, n), texto); capas.push(`drawtext=fontfile=${fuente}:textfile=${n}:expansion=none:fontcolor=${txt}:fontsize=${size}:x=60:y=${yy}${extra}`); };
    if (logo && fs.existsSync(logo)) { const li = F.length + 1; fil.push(`[${li}:v]scale=96:96:force_original_aspect_ratio=decrease,pad=110:110:(ow-iw)/2:(oh-ih)/2:color=white[lg];${ult()}[lg]overlay=60:56[b${fil.length + 1}]`); y = 196; }
    if (y === 70) y = Math.max(60, Math.round((540 - (nomL.length * (tam + 8) + 14 + fraL.length * 44)) / 2));
    for (const l of nomL) { t(l, 'Outfit-Bold.ttf', tam, y); y += tam + 8; }
    y += 14; for (const l of fraL) { t(l, 'Outfit-Regular.ttf', 34, y, ':alpha=0.92'); y += 44; }
    const chip = [ciudad, pie].filter(Boolean).map(sinEmoji).join('  ·  ');
    if (chip) t(chip, 'Outfit-Bold.ttf', 26, 548, `:box=1:boxcolor=${txt === 'white' ? 'white@0.18' : 'black@0.10'}:boxborderw=16`);
    if (F.length) capas.push(`drawbox=x=${izq - 4}:y=0:w=4:h=630:color=white@0.9:t=fill`);
    const cadena = (fil.length ? fil.join(';') + ';' + ult() : '[0:v]') + capas.join(',') + '[fin]';
    args.push('-filter_complex', cadena, '-map', '[fin]', '-frames:v', '1', '-q:v', '3', path.join(tmp, 'og.jpg'));
    const r = spawnSync('ffmpeg', args, { cwd: tmp, encoding: 'utf8', timeout: 60000 });
    if (r.status !== 0 || !fs.existsSync(path.join(tmp, 'og.jpg'))) throw new Error((r.stderr || r.error?.message || 'ffmpeg falló').slice(0, 300));
    fs.copyFileSync(path.join(tmp, 'og.jpg'), out); return out;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// Para una web de cliente: elige textos y fotos, y solo la rehace si algo cambió
function paraWeb(w, ASSETS) {
  const A = ASSETS(w), T = w.textos || {}, ex = f => f && fs.existsSync(path.join(A, f)) ? path.join(A, f) : null;
  const tr = (w.trabajos || []).flatMap(t => (t.medios || []).filter(m => m.t === 'foto' || m.listo).slice(0, 1).map(m => m.t === 'video' ? m.poster : m.f));
  const fotos = [...new Set([w.portadaCliente, ...tr, ...(w.fotos || []), ...Object.values(w.fotoServ || {}), w.fotoHero].map(ex).filter(Boolean))].slice(0, 3);
  const logo = w.logo ? ex('logo.png') : null, q = require('./agencia').quince;
  const datos = { nombre: w.nombre, frase: q(T.hero_titulo || w.cliente?.rubro || ''), color: w.color, ciudad: w.cliente?.ciudad ? (/^peru$/i.test(w.cliente.ciudad.trim()) ? 'Perú' : w.cliente.ciudad) : '', pie: w.cliente?.whatsapp ? 'Cotiza por WhatsApp' : '', fotos, logo };
  const hash = crypto.createHash('md5').update(JSON.stringify(datos) + fotos.concat(logo || []).map(f => fs.statSync(f).mtimeMs).join()).digest('hex');
  const out = path.join(A, 'og.jpg');
  if (w.ogHash === hash && fs.existsSync(out)) return 'og.jpg';
  try { generar({ out, ...datos }); w.ogHash = hash; return 'og.jpg'; } catch (e) { console.log('[OG] ' + w.nombre + ': ' + e.message); return fs.existsSync(out) ? 'og.jpg' : null; }
}

module.exports = { generar, paraWeb, lineas };
