// 🎉 «Mis trabajos» de las webs de clientes: cada trabajo (ej. «Boda en jardín») tiene categoría, explicación,
// lo que incluyó (toldo, maestro de ceremonias, hora loca…), precio (solo decoración o paquete completo), fotos y VIDEOS.
// También «Mis precios» por servicio y por paquete. Lo usa el panel del cliente, la web y el asistente de chat.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { run } = require('./util');
const W_ = () => require('./webs');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const corto = (t, n) => String(t ?? '').trim().slice(0, n);

// Extras sugeridos (la dueña marca los que hizo y puede escribir otros)
const EXTRAS = ['Toldo', 'Maestro de ceremonias', 'Hora loca', 'DJ y sonido', 'Iluminación', 'Mesas y sillas', 'Mantelería', 'Arco de globos', 'Backing o fondo temático', 'Mesa de dulces', 'Torta', 'Flores naturales', 'Centros de mesa', 'Fotografía y video', 'Animación infantil', 'Bocaditos'];
const LIM = { trabajos: 60, fotosPorTrabajo: 40, videosPorTrabajo: 8, videosTotal: 40 };

const lista = w => (w.trabajos = w.trabajos || []);
const buscar = (w, id) => lista(w).find(t => t.id === id);
const dirDe = (w, t) => path.join(W_().ASSETS(w), 'trabajos', t.id);
const esVideo = (buf, nombre) => /\.(mp4|mov|m4v|webm|3gp|mkv|avi)$/i.test(nombre || '') || (buf.length > 12 && (buf.slice(4, 8).toString() === 'ftyp' || buf.readUInt32BE(0) === 0x1a45dfa3));
const precioTxt = t => !t.precio || t.ocultarPrecio ? '' : `${t.tipoPrecio === 'paquete' ? 'Paquete completo' : 'Decoración'}: ${/^\d/.test(t.precio) ? 'S/ ' + t.precio : t.precio}`;
const fmtPrecio = p => !p ? '' : /^\d/.test(p) ? 'S/ ' + p : p;

// ---------- Crear / editar / borrar ----------
function guardarTrabajo(w, o) {
  let t = o.tid ? buscar(w, String(o.tid)) : null;
  if (!t) { if (lista(w).length >= LIM.trabajos) throw new Error('Máximo ' + LIM.trabajos + ' trabajos'); t = { id: 't' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex'), medios: [], creado: new Date().toISOString() }; w.trabajos.unshift(t); }
  t.cat = corto(o.cat, 40); t.titulo = corto(o.titulo, 80) || (t.cat ? t.cat : 'Trabajo'); t.desc = corto(o.desc, 1200);
  t.extras = [...new Set((Array.isArray(o.extras) ? o.extras : String(o.extras || '').split(',')).map(x => corto(x, 40)).filter(Boolean))].slice(0, 20);
  t.precio = corto(o.precio, 40).replace(/^s\/\.?\s*/i, ''); t.tipoPrecio = o.tipoPrecio === 'paquete' ? 'paquete' : 'decoracion'; t.ocultarPrecio = !!o.ocultarPrecio;
  t.lugar = corto(o.lugar, 60); t.clase = o.clase === 'paquete' ? 'paquete' : 'trabajo'; t.editado = new Date().toISOString();
  W_().guardar(); return { ok: 1, tid: t.id };
}
function borrarTrabajo(w, tid) { const t = buscar(w, tid); if (!t) return { ok: 1 }; fs.rmSync(dirDe(w, t), { recursive: true, force: true }); w.trabajos = lista(w).filter(x => x !== t); W_().guardar(); return { ok: 1 }; }
function quitarMedio(w, tid, f) { const t = buscar(w, tid); if (!t) throw new Error('Trabajo no encontrado'); const m = t.medios.find(x => x.f === f); if (!m) return { ok: 1 };
  for (const g of [m.f, m.poster]) if (g) fs.rmSync(path.join(W_().ASSETS(w), g), { force: true }); t.medios = t.medios.filter(x => x !== m); W_().guardar(); return { ok: 1 }; }
function portadaMedio(w, tid, f) { const t = buscar(w, tid); if (!t) throw new Error('Trabajo no encontrado'); const m = t.medios.find(x => x.f === f); if (m) { t.medios = [m, ...t.medios.filter(x => x !== m)]; W_().guardar(); } return { ok: 1 }; }
function moverTrabajo(w, tid, dir) { const L = lista(w), i = L.findIndex(t => t.id === tid), j = i + (dir < 0 ? -1 : 1); if (i < 0 || j < 0 || j >= L.length) return { ok: 1 }; [L[i], L[j]] = [L[j], L[i]]; W_().guardar(); return { ok: 1 }; }

// ---------- Precios por servicio y paquete ----------
function guardarPrecios(w, o) {
  const P = w.precios = { serv: {}, paq: {}, nota: '' };
  for (const [k, v] of Object.entries(o.serv || {})) if (corto(v, 40)) P.serv[corto(k, 120)] = corto(v, 40).replace(/^s\/\.?\s*/i, '');
  for (const [k, v] of Object.entries(o.paq || {})) if (corto(v, 40)) P.paq[corto(k, 120)] = corto(v, 40).replace(/^s\/\.?\s*/i, '');
  P.nota = corto(o.nota, 200); W_().guardar(); return { ok: 1 };
}

// ---------- Subir foto o video a un trabajo ----------
const colaV = []; let procesando = false;
async function procesarVideos() {
  if (procesando) return; procesando = true;
  while (colaV.length) { const { w, t, m, src } = colaV.shift(), A = W_().ASSETS(w);
    try {
      await run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-t', '60', '-vf', "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)',fps=30", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-maxrate', '1500k', '-bufsize', '3000k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', path.join(A, m.f)]);
      await run('ffmpeg', ['-y', '-v', 'error', '-ss', '1', '-i', path.join(A, m.f), '-frames:v', '1', '-vf', 'scale=900:-2', '-c:v', 'libwebp', '-quality', '75', path.join(A, m.poster)]).catch(() => run('ffmpeg', ['-y', '-v', 'error', '-i', path.join(A, m.f), '-frames:v', '1', '-vf', 'scale=900:-2', path.join(A, m.poster)]));
      m.listo = true; delete m.error;
    } catch (e) { m.error = 'No se pudo procesar el video'; console.log('[Trabajos] video: ' + String(e.message || e).slice(0, 200)); }
    fs.rmSync(src, { force: true }); W_().guardar(); }
  procesando = false;
}
async function subirMedio(w, tid, buf, nombre) {
  const t = buscar(w, tid); if (!t) throw new Error('Trabajo no encontrado'); if (!buf || buf.length < 100) throw new Error('Archivo vacío');
  const A = W_().ASSETS(w), dir = dirDe(w, t); fs.mkdirSync(dir, { recursive: true }); const n = 'm' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
  if (esVideo(buf, nombre)) {
    if (t.medios.filter(m => m.t === 'video').length >= LIM.videosPorTrabajo) throw new Error('Máximo ' + LIM.videosPorTrabajo + ' videos por trabajo');
    if (lista(w).reduce((s, x) => s + x.medios.filter(m => m.t === 'video').length, 0) >= LIM.videosTotal) throw new Error('Máximo ' + LIM.videosTotal + ' videos en total');
    const src = path.join(dir, n + '.src'); fs.writeFileSync(src, buf);
    const m = { t: 'video', f: path.relative(A, path.join(dir, n + '.mp4')).split(path.sep).join('/'), poster: path.relative(A, path.join(dir, n + '.webp')).split(path.sep).join('/'), listo: false };
    t.medios.push(m); W_().guardar(); colaV.push({ w, t, m, src }); procesarVideos(); return { ok: 1, video: true };
  }
  if (t.medios.filter(m => m.t === 'foto').length >= LIM.fotosPorTrabajo) throw new Error('Máximo ' + LIM.fotosPorTrabajo + ' fotos por trabajo');
  const tmp = path.join(dir, n + '.tmp'); fs.writeFileSync(tmp, buf);
  try { const f = await W_().aWebp(tmp, path.join(dir, n + '.webp'), 1400); t.medios.push({ t: 'foto', f: path.relative(A, f).split(path.sep).join('/') }); W_().guardar(); }
  catch (e) { throw new Error('No se pudo leer la imagen ' + (nombre || '') + ' (usa JPG o PNG)'); } finally { fs.rmSync(tmp, { force: true }); }
  return { ok: 1 };
}
async function fotoServicio(w, i, buf, nombre) {
  const s = (w.textos?.servicios || [])[+i]; if (!s) throw new Error('Servicio no encontrado');
  await W_().subirFoto(w.id, buf, nombre, s.t); quitarMuestra(w, i); return { ok: 1 };
}
function quitarMuestra(w, i) { const s = (w.textos?.servicios || [])[+i]; if (!s || !w.fotoServ?.[s.t]) return { ok: 1 }; fs.rmSync(path.join(W_().ASSETS(w), w.fotoServ[s.t]), { force: true }); delete w.fotoServ[s.t]; W_().guardar(); return { ok: 1 }; }
function quitarHero(w) { if (w.fotoHero) { fs.rmSync(path.join(W_().ASSETS(w), w.fotoHero), { force: true }); delete w.fotoHero; W_().guardar(); } return { ok: 1 }; }
const tipoArchivo = f => ({ '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' }[path.extname(f).toLowerCase()] || 'application/octet-stream');

// Sirve un archivo con soporte de «Range» (los videos en iPhone lo necesitan)
function servirArchivo(q, r, f, extra = {}) {
  const tam = fs.statSync(f).size, tipo = tipoArchivo(f), rg = /^bytes=(\d*)-(\d*)$/.exec(q.headers.range || '');
  if (rg && tipo.startsWith('video/')) { let a = rg[1] === '' ? tam - +rg[2] : +rg[1], b = rg[1] !== '' && rg[2] !== '' ? +rg[2] : tam - 1; a = Math.max(0, a); b = Math.min(tam - 1, b);
    if (a > b) { r.writeHead(416, { 'content-range': `bytes */${tam}` }); return r.end(); }
    r.writeHead(206, { 'content-type': tipo, 'content-range': `bytes ${a}-${b}/${tam}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1, ...extra }); return fs.createReadStream(f, { start: a, end: b }).pipe(r); }
  r.writeHead(200, { 'content-type': tipo, 'content-length': tam, ...(tipo.startsWith('video/') ? { 'accept-ranges': 'bytes' } : {}), ...extra }); fs.createReadStream(f).pipe(r);
}

// ---------- Para la web ----------
const visibles = w => lista(w).map(t => ({ ...t, medios: t.medios.filter(m => m.t === 'foto' || m.listo) })).filter(t => t.medios.length);
function seccionWeb(w, waDe, o = {}) {
  const q = require('./agencia').quince, base = o.lista || visibles(w), T0 = (o.porClase ? [...base.filter(t => t.clase === 'paquete'), ...base.filter(t => t.clase !== 'paquete')] : base), T = T0.map(t => ({ ...t, cat: q(t.cat || ''), titulo: q(t.titulo), desc: q(t.desc || '') })); if (!T.length) return '';
  const grupo = t => o.porClase ? (t.clase === 'paquete' ? '📦 Paquetes' : '📸 Decoraciones que hicimos') : t.cat, cats = [...new Set(T.map(grupo).filter(Boolean))];
  const datos = T.map(t => ({ titulo: t.titulo, cat: t.cat, desc: t.desc, extras: t.extras, precio: precioTxt(t), lugar: t.lugar, wa: waDe(`Hola, vi su trabajo «${t.titulo}» en su página web y quiero algo así`), m: t.medios.map(m => m.t === 'video' ? { v: m.f, p: m.poster } : { i: m.f }) }));
  return `<section class="trabs" id="galeria"><div class="w"><h2>${esc(o.titulo || 'Nuestros trabajos')}</h2><p class="lead">${esc(o.lead || 'Decoraciones reales que hemos hecho.')} Toca cualquiera para ver todas sus fotos${T.some(t => t.medios.some(m => m.t === 'video')) ? ' y videos' : ''}.</p>
${(o.temas || []).length ? `<div class="temas-nav"><span>Ver por temática:</span>${o.temas.map(x => `<a href="${x.url}">${esc(x.icono || '')} ${esc(x.t)} <small>(${x.n})</small></a>`).join('')}</div>` : ''}
${cats.length > 1 ? `<div class="filtros"><button type="button" class="on" data-cat="">Todos</button>${cats.map(c => `<button type="button" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
<div class="trabg">${T.map((t, i) => { const p = t.medios[0], nf = t.medios.filter(m => m.t === 'foto').length, nv = t.medios.filter(m => m.t === 'video').length;
    return `<button type="button" class="trab rv" data-i="${i}" data-cat="${esc(grupo(t) || '')}"><span class="trimg"><img src="/${esc(p.t === 'video' ? p.poster : p.f)}" alt="${esc(t.titulo)}" loading="lazy">${p.t === 'video' ? '<span class="play">▶</span>' : ''}${t.cat && !o.porClase ? `<span class="trcat">${esc(t.cat)}</span>` : ''}<span class="trn">${nf ? '📷 ' + nf : ''}${nv ? ' 🎥 ' + nv : ''}</span></span><span class="trtx">${t.clase === 'paquete' ? '<span class="trpq">📦 Paquete</span>' : ''}<b>${esc(t.titulo)}</b>${t.desc ? `<small>${esc(t.desc.slice(0, 140))}${t.desc.length > 140 ? '…' : ''}</small>` : ''}${t.extras.length ? `<span class="trex">${t.extras.slice(0, 5).map(x => `<i>✓ ${esc(x)}</i>`).join('')}${t.extras.length > 5 ? `<i>+${t.extras.length - 5}</i>` : ''}</span>` : ''}${precioTxt(t) ? `<span class="trp">${esc(precioTxt(t))}</span>` : ''}</span></button>`; }).join('')}</div></div></section>
<div id="lb" role="dialog" aria-modal="true" aria-label="Trabajo"><div class="lbc"><button type="button" class="lbx" aria-label="Cerrar">✕</button><div class="lbm"></div><div class="lbt"></div></div></div>
<script>(()=>{const D=${JSON.stringify(datos).replace(/</g, '\\u003c')},lb=document.getElementById('lb'),e=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const BASE=(document.querySelector('.trab img').getAttribute('src')||'').split('trabajos/')[0];const abrir=i=>{const t=D[i];lb.querySelector('.lbm').innerHTML=t.m.map(m=>m.v?'<video controls playsinline preload="metadata" poster="'+BASE+m.p+'" src="'+BASE+m.v+'"></video>':'<img src="'+BASE+m.i+'" alt="">').join('');
lb.querySelector('.lbt').innerHTML='<b>'+e(t.titulo)+'</b>'+(t.cat?'<span class="trcat2">'+e(t.cat)+'</span>':'')+(t.lugar?'<small>📍 '+e(t.lugar)+'</small>':'')+(t.desc?'<p>'+e(t.desc).replace(/\\n/g,'<br>')+'</p>':'')+(t.extras.length?'<div class="trex">'+t.extras.map(x=>'<i>✓ '+e(x)+'</i>').join('')+'</div>':'')+(t.precio?'<div class="trp">'+e(t.precio)+'</div>':'')+'<a class="btn" href="'+t.wa+'" rel="noopener">💬 Quiero algo así</a>';
lb.classList.add('on');document.body.style.overflow='hidden'};const cerrar=()=>{lb.classList.remove('on');document.body.style.overflow='';lb.querySelectorAll('video').forEach(v=>v.pause())};
document.querySelectorAll('.trab').forEach(b=>b.onclick=()=>abrir(+b.dataset.i));lb.querySelector('.lbx').onclick=cerrar;lb.onclick=ev=>{if(ev.target===lb)cerrar()};addEventListener('keydown',ev=>{if(ev.key==='Escape')cerrar()});
const B=[...document.querySelectorAll('.trabs .filtros button')],I=[...document.querySelectorAll('.trab')];const ver=c=>{B.forEach(b=>b.classList.toggle('on',b.dataset.cat===c));I.forEach(i=>i.style.display=!c||i.dataset.cat===c?'':'none')};B.forEach(b=>b.onclick=()=>ver(b.dataset.cat));
document.querySelectorAll('[data-vercat]').forEach(a=>a.addEventListener('click',()=>ver(a.dataset.vercat)));})()</script>`;
}
const CSS = `.trabs{background:linear-gradient(180deg,#fff,var(--f));padding:10px 0 30px;margin:20px 0}.trabg{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:18px}
.trab{all:unset;cursor:pointer;display:flex;flex-direction:column;background:#fff;border:1px solid var(--b);border-radius:18px;overflow:hidden;transition:transform .25s,box-shadow .25s}.trab:hover,.trab:focus-visible{transform:translateY(-6px);box-shadow:0 18px 40px #0f172a22;outline:2px solid var(--c)}
.trimg{position:relative;display:block;aspect-ratio:4/3;overflow:hidden}.trimg img{width:100%;height:100%;object-fit:cover;transition:transform .6s}.trab:hover .trimg img{transform:scale(1.07)}
.play{position:absolute;inset:0;margin:auto;width:58px;height:58px;border-radius:50%;background:#000a;color:#fff;display:grid;place-items:center;font-size:1.4rem}.trcat,.trcat2{position:absolute;left:10px;top:10px;background:var(--c);color:#fff;font-size:.78rem;font-weight:700;padding:4px 10px;border-radius:999px}.trcat2{position:static;display:inline-block;margin:0 0 6px 8px}
.trn{position:absolute;right:10px;bottom:10px;background:#000a;color:#fff;font-size:.8rem;padding:3px 9px;border-radius:999px}.trtx{display:grid;gap:6px;padding:14px 16px 16px}.trtx b{font-size:1.08rem}.trpq{justify-self:start;background:#111827;color:#fff;font-size:.75rem;font-weight:700;border-radius:999px;padding:3px 10px}.trtx small{color:var(--s);line-height:1.5}
.trex{display:flex;flex-wrap:wrap;gap:5px}.trex i{font-style:normal;font-size:.78rem;background:color-mix(in srgb,var(--c) 10%,#fff);color:var(--c);border-radius:999px;padding:3px 9px;font-weight:600}.trp{font-weight:800;color:var(--t);background:#fef3c7;border-radius:10px;padding:6px 10px;justify-self:start}
#lb{display:none;position:fixed;inset:0;z-index:80;background:#000c;padding:16px;overflow:auto}#lb.on{display:grid;place-items:start center}.lbc{position:relative;background:#fff;border-radius:18px;max-width:980px;width:100%;margin:20px auto;display:grid;grid-template-columns:1.4fr 1fr;overflow:hidden}
.lbm{display:grid;gap:8px;padding:10px;max-height:80vh;overflow:auto;background:#0f172a}.lbm img,.lbm video{width:100%;border-radius:10px;display:block;max-height:70vh;object-fit:contain;background:#000}.lbt{padding:22px 54px 22px 22px;display:grid;gap:10px;align-content:start}.lbt b{font-size:1.3rem}.lbt p{margin:0;color:var(--t)}.lbt .btn{justify-self:start}
.lbx{position:absolute;right:10px;top:10px;z-index:2;background:#fff;border:0;border-radius:50%;width:38px;height:38px;font-size:1.1rem;cursor:pointer;box-shadow:0 4px 14px #0004}@media(max-width:760px){.lbc{grid-template-columns:1fr}.lbm{max-height:none}}
.temas-nav{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 16px}.temas-nav span{color:var(--s);font-size:.9rem}.temas-nav a{background:#fff;border:1px solid var(--b);border-radius:999px;padding:7px 14px;text-decoration:none;color:var(--t);font-weight:600;font-size:.92rem;transition:.2s}.temas-nav a:hover,.temas-nav a.on{border-color:var(--c);background:var(--c);color:#fff}.temas-nav small{opacity:.7}
.tema-h{position:relative;color:#fff;border-radius:22px;overflow:hidden;padding:46px 28px;margin:18px 0 22px;background:linear-gradient(120deg,var(--c),#111827)}.tema-h>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.25;max-width:none;filter:saturate(1.1)}.tema-h>div{position:relative}.tema-h h1{color:#fff;margin:.1em 0 .2em}.tema-h .lead{color:#fff;opacity:.92}.tema-h ul{margin:8px 0 14px}.tema-h .btn{background:#fff;color:var(--c)}.tema-ico{font-size:2.6rem}
.precio{display:inline-block;margin-top:8px;font-weight:800;background:#fef3c7;color:#111827;border-radius:10px;padding:4px 10px;font-size:.92rem}`;

// Para el asistente de chat: precios y trabajos que la dueña cargó
function conocimiento(w) {
  const P = w.precios || {}, s = [];
  const ps = Object.entries(P.serv || {}), pp = Object.entries(P.paq || {});
  if (ps.length || pp.length) s.push('PRECIOS QUE PUSO LA DUEÑA (puedes darlos tal cual, como referencia):\n' + [...ps.map(([k, v]) => `- ${k}: desde ${fmtPrecio(v)}`), ...pp.map(([k, v]) => `- Paquete ${k}: ${fmtPrecio(v)}`)].join('\n') + (P.nota ? '\nNota de precios: ' + P.nota : ''));
  const T = visibles(w).slice(0, 15); if (T.length) s.push('TRABAJOS REALIZADOS (ejemplos reales que puedes mencionar):\n' + T.map(t => `- «${t.titulo}»${t.cat ? ' (' + t.cat + ')' : ''}${t.extras.length ? ': incluyó ' + t.extras.join(', ') : ''}${precioTxt(t) ? '. ' + precioTxt(t) : ''}${t.desc ? '. ' + t.desc.slice(0, 200) : ''}`).join('\n'));
  return s.join('\n');
}

// ---------- Panel del cliente ----------
const tjHtml = t => `<div class="tj"><div class="tjh"><div>${t.clase === 'paquete' ? '<span class="pill" style="background:#111827;color:#fff">📦 Paquete</span> ' : ''}<b>${esc(t.titulo)}</b><div class="sub">${t.extras.length ? '✓ ' + t.extras.map(esc).join(' · ✓ ') : 'Sin detalle de lo que incluye'}${precioTxt(t) ? ' · <b>' + esc(precioTxt(t)) + '</b>' : t.precio && t.ocultarPrecio ? ' · (precio oculto)' : ' · sin precio'}</div></div>
<div class="tjb"><button type="button" data-ed="${t.id}" title="Editar">✏️</button><button type="button" data-up="${t.id}" data-dir="-1" title="Subir">⬆</button><button type="button" data-up="${t.id}" data-dir="1" title="Bajar">⬇</button><button type="button" data-borrarT="${t.id}" title="Borrar">🗑</button></div></div>
<div class="g">${t.medios.map((m, i) => `<div class="f${i === 0 ? ' port' : ''}">${m.t === 'video' ? (m.listo ? `<img src="img/${esc(m.poster)}" alt=""><span class="vid">🎥</span>` : `<div class="proc">${m.error ? '⚠️ ' + esc(m.error) : '⏳ Procesando video…'}</div>`) : `<img src="img/${esc(m.f)}" alt="" loading="lazy">`}<div><button type="button" data-portM="${t.id}" data-f="${esc(m.f)}" title="Usar de portada">⭐</button><button type="button" data-quitM="${t.id}" data-f="${esc(m.f)}" title="Quitar">🗑</button></div></div>`).join('')}
<label class="f mas">➕<br>Agregar fotos<br>o videos<input type="file" accept="image/*,video/*" multiple data-mas="${t.id}" style="display:none"></label></div><div class="estM" id="estM-${t.id}"></div></div>`;
function muestrasHtml(w) {
  const A = W_().ASSETS(w), S = (w.textos?.servicios || []).map((s, i) => ({ s, i, f: w.fotoServ?.[s.t] })).filter(x => x.f && fs.existsSync(path.join(A, x.f)));
  const h = w.fotoHero && fs.existsSync(path.join(A, w.fotoHero)) ? w.fotoHero : null; if (!S.length && !h) return '';
  return `<details class="card"><summary style="cursor:pointer;font-weight:700">🖼️ Fotos de muestra que puso el sistema (${S.length + (h ? 1 : 0)})</summary><p style="color:#64748b;font-size:.9rem;margin:6px 0">Mientras no tengas fotos tuyas, tu web usa estas fotos referenciales. Cámbialas por una tuya o quítalas.</p><div class="g">
${S.map(x => `<div class="f"><img src="img/${esc(x.f)}" alt="" loading="lazy"><div style="display:block"><small style="display:block;padding:2px 4px;font-weight:600">${esc(x.s.t)}</small><label class="mini2">📷 Poner mi foto<input type="file" accept="image/*" data-servfoto="${x.i}" style="display:none"></label><button type="button" data-quitmu="${x.i}">🗑 Quitar</button></div></div>`).join('')}
${h ? `<div class="f"><img src="img/${esc(h)}" alt=""><div style="display:block"><small style="display:block;padding:2px 4px;font-weight:600">Portada</small><button type="button" data-quithero="1">🗑 Quitar</button></div></div>` : ''}</div><div class="estM" id="estMu"></div></details>`;
}
function portalHtml(w) {
  const servs = (w.textos?.servicios || []).map(x => x.t), paqs = (w.textos?.paquetes || []).map(x => x.nombre), P = w.precios || { serv: {}, paq: {} };
  const cats = [...new Set([...servs, ...lista(w).map(t => t.cat)].filter(Boolean))];
  const tj = lista(w);
  return `<div class="card" id="trabajos"><h2 style="margin-top:0">🎉 Mis trabajos y paquetes <small style="color:#64748b;font-weight:400">(${tj.length})</small></h2>
<p style="color:#64748b;margin:0 0 10px">Ordena todo tu material por <b>temática</b> (infantil, 15 años, bodas…). Dentro de cada temática sube tus <b>trabajos</b> (decoraciones que ya hiciste) o tus <b>paquetes</b> (lo que ofreces), cada uno con todas sus fotos y videos, lo que incluye y su precio. Puedes ir subiendo de a pocos.</p>
<button class="btn" type="button" id="nuevoT">➕ Nuevo trabajo o paquete</button>
<form id="fT" style="display:none;margin-top:14px;border:2px solid #ede9fe;border-radius:14px;padding:12px;background:#faf5ff"><input type="hidden" name="tid">
<label>¿Qué vas a subir?</label><div class="chk" style="grid-template-columns:1fr 1fr"><label><input type="radio" name="clase" value="trabajo" checked> 📸 Un trabajo que ya hice</label><label><input type="radio" name="clase" value="paquete"> 📦 Un paquete que ofrezco</label></div>
<label>Tipo de celebración</label><select name="cat"><option value="">Elige…</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}<option value="__nueva">➕ Otra (escribir)</option></select><input name="catNueva" placeholder="Ej: Graduación, Bautizo, Aniversario" style="display:none;margin-top:8px">
<label id="lTit">Nombre del trabajo</label><input name="titulo" maxlength="80" placeholder="Ej: Boda en jardín con toldo y luces">
<label id="lDesc">Cuéntanos cómo fue esta decoración</label><textarea name="desc" rows="4" maxlength="1200" placeholder="Ej: Decoramos una boda para 120 invitados en Cieneguilla. Usamos flores naturales blancas, arco principal, camino de velas y luces cálidas en el toldo…"></textarea>
<label>Lugar (opcional)</label><input name="lugar" maxlength="60" placeholder="Ej: Local en Los Olivos, casa de campo en Chaclacayo">
<label id="lInc">¿Qué incluyó? (marca todo lo que hiciste)</label><div class="chk">${EXTRAS.map(x => `<label><input type="checkbox" name="ex" value="${esc(x)}"> ${esc(x)}</label>`).join('')}</div><input name="exOtros" maxlength="200" placeholder="Otros (separados por comas): Ej: Carrito de canchita, Pirotecnia fría" style="margin-top:8px">
<label>Precio (opcional)</label><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span>S/</span><input name="precio" maxlength="40" placeholder="Ej: 850 o 1,200 a 1,800" style="width:180px"><select name="tipoPrecio" style="width:auto"><option value="decoracion">Solo la decoración</option><option value="paquete">Paquete completo</option></select><label style="font-weight:400;margin:0"><input type="checkbox" name="ocultarPrecio"> No mostrar en la web</label></div>
<label>Fotos y videos (puedes elegir varios a la vez · videos de hasta 60 segundos)</label><input type="file" name="files" accept="image/*,video/*" multiple>
<p style="margin:14px 0 0;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">💾 Guardar</button><button class="btn gris" type="button" id="cancelT">Cancelar</button></p><progress id="barT" max="100" value="0" style="display:none;width:100%;margin-top:8px"></progress><div id="estT"></div></form>
${(() => { const ord = [...cats], grupos = ord.map(c => ({ c, L: tj.filter(t => t.cat === c) })), sin = tj.filter(t => !t.cat);
  if (sin.length) grupos.push({ c: '', L: sin });
  const ico = c => ((w.textos?.servicios || []).find(x => x.t === c) || {}).icono || '🎉';
  return grupos.map(g => { const nf = g.L.reduce((a, t) => a + t.medios.filter(m => m.t === 'foto').length, 0), nv = g.L.reduce((a, t) => a + t.medios.filter(m => m.t === 'video').length, 0);
    return `<details class="tema"${g.L.length ? ' open' : ''}><summary><span>${esc(ico(g.c))} <b>${esc(g.c || 'Sin temática')}</b></span><small>${g.L.length ? `${g.L.length} ${g.L.length === 1 ? 'trabajo' : 'trabajos'} · 📷 ${nf}${nv ? ' · 🎥 ' + nv : ''}` : 'vacío: sube tu primer trabajo'}</small></summary>
<p style="margin:8px 0"><button class="btn sm" type="button" data-nuevocat="${esc(g.c)}">➕ Agregar trabajo o paquete${g.c ? ' de ' + esc(g.c) : ''}</button></p>
${g.L.map(t => tjHtml(t)).join('')}</details>`; }).join(''); })()}
</div>
${muestrasHtml(w)}
${servs.length || paqs.length ? `<details class="card" id="precios"><summary style="cursor:pointer;font-weight:700">💰 Mis precios</summary><p style="color:#64748b;font-size:.9rem;margin:6px 0">Si pones un precio, aparece en tu web y el asistente lo puede dar. Déjalo vacío si prefieres cotizar por WhatsApp.</p>
${servs.length ? '<b>Por servicio (desde)</b>' + servs.map(s => `<label style="font-weight:400">${esc(s)}</label><div style="display:flex;gap:8px;align-items:center"><span>Desde S/</span><input data-ps="${esc(s)}" value="${esc((P.serv || {})[s] || '')}" maxlength="40" placeholder="Ej: 350"></div>`).join('') : ''}
${paqs.length ? '<p style="margin:14px 0 0"><b>Paquetes completos</b></p>' + paqs.map(s => `<label style="font-weight:400">${esc(s)}</label><div style="display:flex;gap:8px;align-items:center"><span>S/</span><input data-pp="${esc(s)}" value="${esc((P.paq || {})[s] || '')}" maxlength="40" placeholder="Ej: 1500"></div>`).join('') : ''}
<label>Nota sobre precios (opcional)</label><input id="pNota" maxlength="200" value="${esc(P.nota || '')}" placeholder="Ej: Precios referenciales, varían según cantidad de invitados y distrito">
<p style="margin:12px 0 0"><button class="btn" type="button" id="guardarPrecios">💾 Guardar precios</button></p></details>` : ''}`;
}
const portalCss = `.chk{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px 10px}.chk label{font-weight:400;margin:0;display:flex;gap:6px;align-items:center}.chk input{width:auto}textarea{font:inherit;padding:11px;border:1px solid #cbd5e1;border-radius:10px;width:100%}
.btn.gris{background:#e2e8f0;color:#0f172a}.tj{border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-top:12px}.tjh{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.tjb{display:flex;gap:4px;flex-shrink:0}.tjb button{border:0;background:#f1f5f9;border-radius:8px;padding:6px 8px;cursor:pointer}
.pill{background:#ede9fe;color:#5b21b6;border-radius:999px;padding:2px 9px;font-size:.78rem;font-weight:700}.sub{color:#64748b;font-size:.85rem;margin:4px 0 8px}.f{position:relative}.vid{position:absolute;left:6px;top:6px;background:#000a;color:#fff;border-radius:6px;padding:1px 6px}
.proc{aspect-ratio:4/3;display:grid;place-items:center;background:#f1f5f9;font-size:.8rem;text-align:center;padding:6px}.f.mas{display:grid;place-items:center;aspect-ratio:4/3;cursor:pointer;color:#64748b;font-weight:700;text-align:center;border:2px dashed #cbd5e1}.estM{font-weight:600;font-size:.9rem}
.tema{border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;margin-top:12px;background:#fff}.tema>summary{cursor:pointer;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;font-size:1.05rem}.tema>summary small{color:#64748b}.btn.sm{padding:8px 14px;font-size:.9rem}.mini2{display:inline-block;background:#ede9fe;color:#5b21b6;border-radius:8px;padding:5px 7px;cursor:pointer;font-size:.78rem;font-weight:700;margin:2px}`;
const portalJs = (w) => `const TJ=${JSON.stringify(lista(w).map(t => ({ id: t.id, clase: t.clase || 'trabajo', cat: t.cat, titulo: t.titulo, desc: t.desc, lugar: t.lugar, extras: t.extras, precio: t.precio, tipoPrecio: t.tipoPrecio, ocultarPrecio: !!t.ocultarPrecio }))).replace(/</g, '\\u003c')},EXT=${JSON.stringify(EXTRAS)};
const fT=document.getElementById('fT');
const subirArch=async(tid,F,est,bar)=>{let ok=0,vid=0,hechos=0,errs=[];if(bar){bar.style.display='block';bar.value=0}const uno=async f=>{if(f.size>95e6){errs.push(f.name+': pesa más de 95 MB');return}try{const r=await fetch('foto?'+new URLSearchParams({trabajo:tid,nombre:f.name}),{method:'POST',body:f});const j=await r.json().catch(()=>({error:r.status===413?'muy grande':'error al subir'}));if(j.ok){ok++;if(j.video)vid++}else errs.push(f.name+': '+(j.error||'error'))}catch(e){errs.push(f.name+': sin conexión')}};
const cola=[...F];const trab=async()=>{while(cola.length){const f=cola.shift();await uno(f);hechos++;est.textContent='Subiendo… '+hechos+' de '+F.length;if(bar)bar.value=hechos*100/F.length}};await Promise.all([trab(),trab()]);if(errs.length)alert('No se pudieron subir: '+errs.slice(0,10).join(' · '));
est.textContent='✅ '+ok+' archivos subidos'+(vid?' ('+vid+' video(s): se están procesando, tardan 1 o 2 minutos)':'')+'. Pulsa «Publicar cambios» cuando termines.';return ok};
const modo=()=>{const p=fT.querySelector('[name=clase]:checked').value==='paquete';document.getElementById('lTit').textContent=p?'Nombre del paquete':'Nombre del trabajo';fT.titulo.placeholder=p?'Ej: Paquete Princesa, Paquete Boda Completa':'Ej: Boda en jardín con toldo y luces';document.getElementById('lDesc').textContent=p?'Describe el paquete (para quién es, cuántos invitados, estilo)':'Cuéntanos cómo fue esta decoración';document.getElementById('lInc').textContent=p?'¿Qué incluye el paquete? (marca todo)':'¿Qué incluyó? (marca todo lo que hiciste)';if(p&&!fT.tid.value)fT.tipoPrecio.value='paquete'};
fT.querySelectorAll('[name=clase]').forEach(x=>x.onchange=modo);
const abrirNuevo=cat=>{fT.reset();fT.tid.value='';if(cat){const o=[...fT.cat.options].find(x=>x.value===cat);if(o)fT.cat.value=cat;else{fT.cat.value='__nueva';fT.catNueva.value=cat}}fT.catNueva.style.display=fT.cat.value==='__nueva'?'block':'none';modo();fT.style.display='block';fT.scrollIntoView({behavior:'smooth'})};
document.getElementById('nuevoT').onclick=()=>abrirNuevo('');
document.getElementById('cancelT').onclick=()=>{fT.style.display='none'};
fT.cat.onchange=()=>{fT.catNueva.style.display=fT.cat.value==='__nueva'?'block':'none'};
fT.onsubmit=async e=>{e.preventDefault();const cat=fT.cat.value==='__nueva'?fT.catNueva.value.trim():fT.cat.value;if(!cat)return alert('Elige el tipo de celebración');
const extras=[...fT.querySelectorAll('[name=ex]:checked')].map(x=>x.value).concat(fT.exOtros.value.split(',').map(x=>x.trim()).filter(Boolean));
const btn=fT.querySelector('[type=submit]');btn.disabled=true;try{const j=await acc({accion:'trabajo',tid:fT.tid.value,clase:fT.querySelector('[name=clase]:checked').value,cat,titulo:fT.titulo.value,desc:fT.desc.value,lugar:fT.lugar.value,extras,precio:fT.precio.value,tipoPrecio:fT.tipoPrecio.value,ocultarPrecio:fT.ocultarPrecio.checked});if(j.error)throw new Error(j.error);
const F=[...fT.files.files];if(F.length)await subirArch(j.tid,F,document.getElementById('estT'),document.getElementById('barT'));setTimeout(()=>location.reload(),F.length?1500:200)}catch(err){alert(err.message);btn.disabled=false}};
document.addEventListener('click',async e=>{const d=e.target.dataset||{};
if(d.nuevocat!==undefined)abrirNuevo(d.nuevocat);
if(d.quitmu&&confirm('¿Quitar esta foto de muestra?')){await acc({accion:'quitarMuestra',i:+d.quitmu});location.reload()}
if(d.quithero&&confirm('¿Quitar la foto de portada de muestra?')){await acc({accion:'quitarHero'});location.reload()}
if(d.ed){const t=TJ.find(x=>x.id===d.ed);fT.reset();fT.tid.value=t.id;const o=[...fT.cat.options].find(x=>x.value===t.cat);if(o)fT.cat.value=t.cat;else{fT.cat.value='__nueva';fT.catNueva.style.display='block';fT.catNueva.value=t.cat||''}
fT.querySelector('[name=clase][value='+(t.clase||'trabajo')+']').checked=true;modo();fT.titulo.value=t.titulo||'';fT.desc.value=t.desc||'';fT.lugar.value=t.lugar||'';fT.precio.value=t.precio||'';fT.tipoPrecio.value=t.tipoPrecio||'decoracion';fT.ocultarPrecio.checked=!!t.ocultarPrecio;fT.querySelectorAll('[name=ex]').forEach(x=>x.checked=t.extras.includes(x.value));fT.exOtros.value=t.extras.filter(x=>!EXT.includes(x)).join(', ');fT.style.display='block';fT.scrollIntoView({behavior:'smooth'})}
if(d.up){await acc({accion:'moverTrabajo',tid:d.up,dir:+d.dir});location.reload()}
if(d.borrart&&confirm('¿Borrar este trabajo con todas sus fotos y videos?')){await acc({accion:'borrarTrabajo',tid:d.borrart});location.reload()}
if(d.portm){await acc({accion:'portadaMedio',tid:d.portm,f:d.f});location.reload()}
if(d.quitm&&confirm('¿Quitar este archivo?')){await acc({accion:'quitarMedio',tid:d.quitm,f:d.f});location.reload()}});
document.addEventListener('change',async e=>{const sf=e.target.dataset&&e.target.dataset.servfoto;if(sf!==undefined){const f=e.target.files[0];if(!f)return;document.getElementById('estMu').textContent='Subiendo…';const r=await fetch('foto?'+new URLSearchParams({servicio:sf,nombre:f.name}),{method:'POST',body:f});const j=await r.json().catch(()=>({}));if(!j.ok)return alert(j.error||'No se pudo subir');location.reload();return}
const tid=e.target.dataset&&e.target.dataset.mas;if(!tid)return;const n=await subirArch(tid,[...e.target.files],document.getElementById('estM-'+tid));if(n)setTimeout(()=>location.reload(),1500)});
const gp=document.getElementById('guardarPrecios');if(gp)gp.onclick=async()=>{const serv={},paq={};document.querySelectorAll('[data-ps]').forEach(x=>serv[x.dataset.ps]=x.value);document.querySelectorAll('[data-pp]').forEach(x=>paq[x.dataset.pp]=x.value);const j=await acc({accion:'precios',serv,paq,nota:document.getElementById('pNota').value});alert(j.error||'💾 Precios guardados. Pulsa «Publicar cambios» para verlos en tu web.')};
if(TJ.length===0)setTimeout(()=>{},0);${lista(w).some(t => t.medios.some(m => m.t === 'video' && !m.listo && !m.error)) ? 'setTimeout(()=>location.reload(),20000);' : ''}`;

function accionPortal(w, o) {
  if (o.accion === 'trabajo') return guardarTrabajo(w, o);
  if (o.accion === 'borrarTrabajo') return borrarTrabajo(w, String(o.tid));
  if (o.accion === 'quitarMedio') return quitarMedio(w, String(o.tid), String(o.f));
  if (o.accion === 'portadaMedio') return portadaMedio(w, String(o.tid), String(o.f));
  if (o.accion === 'moverTrabajo') return moverTrabajo(w, String(o.tid), +o.dir);
  if (o.accion === 'precios') return guardarPrecios(w, o);
  if (o.accion === 'quitarMuestra') return quitarMuestra(w, o.i);
  if (o.accion === 'quitarHero') return quitarHero(w);
  return null;
}

module.exports = { fotoServicio, EXTRAS, subirMedio, accionPortal, seccionWeb, CSS, conocimiento, portalHtml, portalCss, portalJs, servirArchivo, tipoArchivo, fmtPrecio, visibles };
