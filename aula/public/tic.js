/* 🧰 Herramientas TIC para docente — ProfeTok Interactivo
   Motor de Canvas PROPIO (sin librerías externas, offline-first).
   Expone window.TIC.montar(contenedor, ctx). ctx = { api, YO, TOK, esc, toast }.
   Incluye: Pizarra Mágica, Estudio de Diseño (reemplazo libre de Canva) y Asistente IA.
   Todo gratis. Nada de alumnos se envía a la IA (solo el tema que escribe el docente). */
(function () {
  'use strict';
  let CTX = null;

  // ---------- utilidades ----------
  const el = (t, p = {}, h = '') => { const e = document.createElement(t); Object.assign(e, p); if (h) e.innerHTML = h; return e; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => CTX && CTX.toast ? CTX.toast(m) : null;
  const api = (...a) => CTX.api(...a);
  const clone = o => JSON.parse(JSON.stringify(o, (k, v) => k === '_img' ? undefined : v));

  // paleta rápida de colores (bonitos y con buen contraste)
  const PALETA = ['#0f172a', '#ffffff', '#e11d48', '#f97316', '#f59e0b', '#22c55e', '#0ea5e9', '#2563eb', '#8b5cf6', '#ec4899', '#14b8a6', '#92400e'];
  // degradados para fondos de diseño
  const GRAD = { grad1: ['#0ea5e9', '#6366f1'], grad2: ['#f97316', '#ec4899'], grad3: ['#22c55e', '#0ea5e9'], grad4: ['#8b5cf6', '#ec4899'], grad5: ['#f59e0b', '#ef4444'], grad6: ['#0f766e', '#042f2e'] };

  // ---- pintado unificado (misma lógica para la pizarra en pantalla y para exportar a PNG/PDF) ----
  function bgFill(g, S) {
    g.save(); g.beginPath(); g.rect(0, 0, S.W, S.H); g.clip();
    if (GRAD[S.bg]) { const gr = g.createLinearGradient(0, 0, S.W, S.H); gr.addColorStop(0, GRAD[S.bg][0]); gr.addColorStop(1, GRAD[S.bg][1]); g.fillStyle = gr; }
    else if (S.bg === 'negro') g.fillStyle = '#0f2419';
    else if (S.bg === 'bgcolor') g.fillStyle = S.bgColor;
    else g.fillStyle = '#ffffff';
    g.fillRect(0, 0, S.W, S.H);
    const line = (col, step, from = 0, dir = 'both') => { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); if (dir !== 'h') for (let x = from; x <= S.W; x += step) { g.moveTo(x, 0); g.lineTo(x, S.H); } if (dir !== 'v') for (let y = from; y <= S.H; y += step) { g.moveTo(0, y); g.lineTo(S.W, y); } g.stroke(); };
    if (S.bg === 'cuadriculado') line('#dbe3ea', 32);
    else if (S.bg === 'matematica') { line('#e6eef5', 20); line('#c7d6e5', 100); }
    else if (S.bg === 'rayado') line('#dbe3ea', 40, 40, 'v');
    else if (S.bg === 'caligrafia') { for (let y = 60; y <= S.H; y += 80) { g.strokeStyle = '#cbd5e1'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y - 24); g.lineTo(S.W, y - 24); g.moveTo(0, y); g.lineTo(S.W, y); g.stroke(); g.strokeStyle = '#2563eb'; g.beginPath(); g.moveTo(0, y - 12); g.lineTo(S.W, y - 12); g.stroke(); } }
    else if (S.bg === 'cartesiano') { line('#e6eef5', 20); g.strokeStyle = '#94a3b8'; g.lineWidth = 2; g.beginPath(); g.moveTo(S.W / 2, 0); g.lineTo(S.W / 2, S.H); g.moveTo(0, S.H / 2); g.lineTo(S.W, S.H / 2); g.stroke(); }
    g.restore();
  }
  function rrr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function wrapTxt(g, txt, x, y, maxW, lh) { const words = String(txt).split(/\s+/); let line = '', yy = y; for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = test; } if (line) g.fillText(line, x, yy); }
  function objPaint(g, o) {
    g.save(); g.globalAlpha = o.alpha != null ? o.alpha : 1; g.strokeStyle = o.color || '#000'; g.fillStyle = o.color || '#000'; g.lineWidth = o.width || 2; g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.t === 'path') {
      const pts = o.pts || [];
      if (window.PerfectFreehand && pts.length > 1) { // trazo natural (grosor variable), como en papel
        const out = window.PerfectFreehand.getStroke(pts.map(p => [p.x, p.y]), { size: (o.width || 3) * 2.1, thinning: 0.62, smoothing: 0.5, streamline: 0.5, simulatePressure: true });
        if (out.length) { g.beginPath(); g.moveTo(out[0][0], out[0][1]); for (let i = 1; i < out.length; i++) g.lineTo(out[i][0], out[i][1]); g.closePath(); g.fill(); }
      } else { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke(); }
    }
    else if (o.t === 'line' || o.t === 'arrow') { g.beginPath(); g.moveTo(o.x1, o.y1); g.lineTo(o.x2, o.y2); g.stroke(); if (o.t === 'arrow') { const a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), L = 12 + (o.width || 2) * 1.5; g.beginPath(); g.moveTo(o.x2, o.y2); g.lineTo(o.x2 - L * Math.cos(a - .4), o.y2 - L * Math.sin(a - .4)); g.moveTo(o.x2, o.y2); g.lineTo(o.x2 - L * Math.cos(a + .4), o.y2 - L * Math.sin(a + .4)); g.stroke(); } }
    else if (o.t === 'rect') { if (o.fill) g.fillRect(o.x, o.y, o.w, o.h); g.strokeRect(o.x, o.y, o.w, o.h); }
    else if (o.t === 'ellipse') { g.beginPath(); g.ellipse(o.x + o.w / 2, o.y + o.h / 2, Math.abs(o.w / 2), Math.abs(o.h / 2), 0, 0, 7); if (o.fill) g.fill(); g.stroke(); }
    else if (o.t === 'triangle') { g.beginPath(); g.moveTo(o.x + o.w / 2, o.y); g.lineTo(o.x, o.y + o.h); g.lineTo(o.x + o.w, o.y + o.h); g.closePath(); if (o.fill) g.fill(); g.stroke(); }
    else if (o.t === 'text') { g.font = `${o.bold ? '700 ' : ''}${o.size || 28}px ${o.font || 'Arial, sans-serif'}`; g.textBaseline = 'top'; (o.text || '').split('\n').forEach((ln, i) => g.fillText(ln, o.x, o.y + i * (o.size || 28) * 1.25)); }
    else if (o.t === 'note') { g.fillStyle = o.color || '#fde68a'; g.shadowColor = 'rgba(0,0,0,.15)'; g.shadowBlur = 8; g.shadowOffsetY = 3; rrr(g, o.x, o.y, o.w, o.h, 10); g.fill(); g.shadowColor = 'transparent'; g.fillStyle = '#1f2937'; g.font = '16px Arial, sans-serif'; g.textBaseline = 'top'; wrapTxt(g, o.text || '', o.x + 10, o.y + 10, o.w - 20, 20); }
    else if (o.t === 'image' && o._img) { try { g.drawImage(o._img, o.x, o.y, o.w, o.h); } catch (e) {} }
    g.restore();
  }

  // estilos propios (una sola vez)
  function estilos() {
    if (document.getElementById('tic-css')) return;
    document.head.appendChild(el('style', { id: 'tic-css' }, `
.tic-hub{max-width:980px}
.tic-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:14px 0}
.tic-card{border:1px solid #e5e7eb;border-radius:18px;padding:20px;cursor:pointer;background:#fff;transition:.15s;display:flex;flex-direction:column;gap:6px}
.tic-card:hover{transform:translateY(-2px);box-shadow:0 10px 30px -14px rgba(2,132,199,.5);border-color:#7dd3fc}
.tic-card .ic{font-size:40px}
.tic-card b{font-size:17px}
.tic-card small{color:#64748b}
.tic-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-top:8px}
.tic-mini{border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#fff;cursor:pointer;transition:.15s}
.tic-mini:hover{border-color:#7dd3fc;transform:translateY(-2px)}
.tic-mini .th{height:104px;background:#f1f5f9 center/cover no-repeat;display:grid;place-items:center;color:#94a3b8;font-size:30px}
.tic-mini .bo{padding:8px 10px}
.tic-mini .bo b{font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tic-mini .bo small{color:#94a3b8;font-size:11px}
/* editor a pantalla completa */
.tic-ed{position:fixed;inset:0;z-index:4000;background:#eef2f6;display:flex;flex-direction:column;touch-action:none;-webkit-user-select:none;user-select:none}
.tic-bar{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#fff;border-bottom:1px solid #e5e7eb;flex-wrap:wrap}
.tic-bar .sep{width:1px;height:26px;background:#e5e7eb;margin:0 2px}
.tic-tool{width:40px;height:40px;border:1px solid transparent;border-radius:11px;background:#f1f5f9;cursor:pointer;font-size:19px;display:grid;place-items:center;line-height:1}
.tic-tool:hover{background:#e2e8f0}
.tic-tool.on{background:#0284c7;color:#fff}
.tic-bar input[type=color]{width:34px;height:34px;border:none;background:none;cursor:pointer;padding:0}
.tic-bar .ti{font-weight:700;border:1px solid #e5e7eb;border-radius:9px;padding:7px 10px;max-width:190px;min-width:120px}
.tic-bar .btn2{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px;cursor:pointer;font-weight:700;font-size:14px}
.tic-bar .btn2.pri{background:#0284c7;color:#fff;border-color:#0284c7}
.tic-bar .btn2:hover{filter:brightness(.97)}
.tic-stage{flex:1;position:relative;overflow:hidden}
.tic-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair;background:#eef2f6}
.tic-side{position:absolute;top:10px;right:10px;width:250px;max-height:calc(100% - 20px);overflow:auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 10px 30px -14px rgba(0,0,0,.3);padding:12px;font-size:14px}
.tic-side h4{margin:4px 0 8px;font-size:14px}
.tic-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.tic-chip{border:1px solid #e5e7eb;border-radius:9px;padding:8px;cursor:pointer;text-align:center;font-size:12.5px;background:#f8fafc}
.tic-chip:hover{border-color:#7dd3fc}
.tic-chip.on{background:#0284c7;color:#fff;border-color:#0284c7}
.tic-side textarea{width:100%;border:1px solid #e5e7eb;border-radius:9px;padding:8px;font:inherit;resize:vertical;min-height:62px}
.tic-side .btn2{width:100%;border:1px solid #0284c7;background:#0284c7;color:#fff;border-radius:9px;padding:9px;cursor:pointer;font-weight:700;margin-top:7px}
.tic-side .btn2.sec{background:#fff;color:#0284c7}
.tic-float{position:absolute;left:10px;bottom:10px;display:flex;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:5px}
.tic-float button{width:34px;height:34px;border:none;background:#f1f5f9;border-radius:8px;cursor:pointer;font-size:16px}
.tic-edit-in{position:absolute;z-index:5;border:2px solid #0284c7;border-radius:6px;padding:2px 4px;font-family:inherit;outline:none;background:rgba(255,255,255,.95);min-width:40px}
.tic-pal{display:flex;gap:3px;align-items:center;flex-wrap:wrap;max-width:200px}
.tic-sw{width:22px;height:22px;border-radius:6px;border:2px solid #fff;box-shadow:0 0 0 1px #cbd5e1;cursor:pointer;padding:0;transition:.12s}
.tic-sw:hover{transform:scale(1.18)}
.tic-bar{background:linear-gradient(#ffffff,#f1f5f9)}
.tic-bar .btn2.pri{background:linear-gradient(135deg,#0ea5e9,#2563eb);border-color:#0284c7;box-shadow:0 2px 8px -2px rgba(37,99,235,.5)}
.tic-tool.on{background:linear-gradient(135deg,#0ea5e9,#2563eb)}
.tic-card:nth-child(1){background:linear-gradient(135deg,#eff6ff,#e0f2fe)}
.tic-card:nth-child(2){background:linear-gradient(135deg,#faf5ff,#fce7f3)}
.tic-card:nth-child(3){background:linear-gradient(135deg,#ecfeff,#f0fdfa)}
.tic-chip.on{background:linear-gradient(135deg,#0ea5e9,#2563eb)}
.tic-font{border:1px solid #e5e7eb;border-radius:9px;padding:7px 6px;font-size:13px;background:#fff;cursor:pointer;max-width:96px}
@media(max-width:680px){.tic-side{width:200px}.tic-tool{width:36px;height:36px;font-size:17px}}
`));
  }

  // ================= HUB =================
  async function montar(M, ctx) {
    CTX = ctx; estilos();
    M.innerHTML = `<div class="tic-hub">
      <div class="fila entre"><h2>🧰 Herramientas TIC para docente</h2></div>
      <p class="muted" style="margin-top:-6px">Crea, dibuja y diseña para tus clases. <b>Gratis</b>, funciona en celular, tablet y PC, y se guarda solo.</p>
      <div class="tic-cards">
        <div class="tic-card" data-abrir="pizarra"><div class="ic">🪄</div><b>Pizarra Mágica</b><small>Dibuja, escribe y explica. Fondos, figuras, imágenes y exporta a PNG/PDF.</small></div>
        <div class="tic-card" data-abrir="diseno"><div class="ic">🎨</div><b>ProfeCrea · Estudio de diseño</b><small>Carteles, diplomas, horarios y portadas con plantillas listas. Como Canva, gratis y dentro de ProfeTok.</small></div>
        <div class="tic-card" data-asis><div class="ic">🤖</div><b>Asistente Libretín</b><small>Pídele ideas, esquemas o preguntas para tus pizarras y diseños.</small></div>
      </div>
      <h3 style="margin-top:18px">🗂️ Mis trabajos</h3>
      <div id="ticList" class="tic-list"><div class="muted small">Cargando…</div></div>
    </div>`;
    M.querySelectorAll('[data-abrir]').forEach(c => c.onclick = () => abrirEditor(c.dataset.abrir));
    M.querySelector('[data-asis]').onclick = () => abrirEditor('pizarra', null, true);
    cargarLista(M.querySelector('#ticList'));
  }

  async function cargarLista(cont) {
    try {
      const { items } = await api('tic/pizarras');
      if (!cont.isConnected) return;
      if (!items.length) { cont.innerHTML = '<div class="muted small">Aún no tienes trabajos. ¡Crea tu primera pizarra! 🪄</div>'; return; }
      cont.innerHTML = '';
      for (const it of items) {
        const card = el('div', { className: 'tic-mini' }, `<div class="th">${it.tipo === 'diseno' ? '🎨' : '🪄'}</div><div class="bo"><b>${esc(it.titulo)}</b><small>${it.tipo === 'diseno' ? 'Diseño' : 'Pizarra'} · ${fecha(it.actualizado)}</small></div>`);
        card.onclick = () => abrirEditor(it.tipo, it.id);
        cont.appendChild(card);
      }
    } catch (e) { if (cont.isConnected) cont.innerHTML = '<div class="muted small">No se pudo cargar.</div>'; }
  }
  const fecha = s => { try { return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }); } catch (e) { return ''; } };

  // ================= EDITOR =================
  function abrirEditor(tipo, id, abrirAsistente) {
    const diseno = tipo === 'diseno';
    const S = {
      id: id || null, tipo: diseno ? 'diseno' : 'pizarra', titulo: diseno ? 'Mi diseño' : 'Mi pizarra',
      bg: diseno ? 'blanco' : 'blanco', bgColor: '#ffffff', W: diseno ? 1080 : 1280, H: diseno ? 1080 : 800,
      objs: [], tool: 'pen', color: diseno ? '#0f172a' : '#e11d48', width: 4, size: 32, fill: false, font: 'Arial, sans-serif', bold: false,
      view: { s: 1, x: 0, y: 0 }, sel: -1, undo: [], redo: [], noteIdx: 0
    };

    const root = el('div', { className: 'tic-ed' });
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';

    // --- barra superior ---
    const tools = diseno
      ? [['select', '➚', 'Seleccionar'], ['text', '🅰️', 'Texto'], ['rect', '▭', 'Rectángulo'], ['ellipse', '⬭', 'Círculo'], ['triangle', '🔺', 'Triángulo'], ['line', '╱', 'Línea'], ['pen', '✏️', 'Lápiz'], ['image', '🖼️', 'Imagen'], ['note', '🗒️', 'Nota'], ['hand', '✋', 'Mover lienzo']]
      : [['select', '➚', 'Seleccionar'], ['pen', '✏️', 'Lápiz'], ['marker', '🖊️', 'Marcador'], ['highlighter', '🖍️', 'Resaltador'], ['eraser', '🧽', 'Borrador'], ['line', '╱', 'Línea'], ['arrow', '↗', 'Flecha'], ['rect', '▭', 'Rectángulo'], ['ellipse', '⬭', 'Círculo'], ['triangle', '🔺', 'Triángulo'], ['text', '🅰️', 'Texto'], ['note', '🗒️', 'Nota'], ['image', '🖼️', 'Imagen'], ['hand', '✋', 'Mover']];
    const bar = el('div', { className: 'tic-bar' });
    bar.appendChild(btn2('‹ Salir', () => cerrar()));
    bar.appendChild(sep());
    const titIn = el('input', { className: 'ti', value: S.titulo, title: 'Título' });
    titIn_onchange(titIn, S); bar.appendChild(titIn);
    bar.appendChild(sep());
    const toolBtns = {};
    for (const [k, ic, t] of tools) { const b = el('button', { className: 'tic-tool', title: t, textContent: ic }); b.onclick = () => setTool(k); toolBtns[k] = b; bar.appendChild(b); }
    bar.appendChild(sep());
    const colorIn = el('input', { type: 'color', value: S.color, title: 'Color personalizado' }); colorIn.oninput = () => { S.color = colorIn.value; applySel('color'); }; bar.appendChild(colorIn);
    const pal = el('div', { className: 'tic-pal' }); for (const col of PALETA) { const sw = el('button', { className: 'tic-sw', title: col }); sw.style.background = col; sw.onclick = () => { S.color = col; colorIn.value = col; applySel('color'); }; pal.appendChild(sw); } bar.appendChild(pal);
    const widthIn = el('input', { type: 'range', min: 1, max: 40, value: S.width, title: 'Grosor', style: 'width:90px' }); widthIn.oninput = () => { S.width = +widthIn.value; applySel('width'); }; bar.appendChild(widthIn);
    const fillBtn = el('button', { className: 'tic-tool', title: 'Relleno', textContent: '🩹' }); fillBtn.onclick = () => { S.fill = !S.fill; fillBtn.classList.toggle('on', S.fill); applySel('fill'); }; bar.appendChild(fillBtn);
    const boldBtn = el('button', { className: 'tic-tool', title: 'Negrita', textContent: 'B', style: 'font-weight:800' }); boldBtn.onclick = () => { S.bold = !S.bold; boldBtn.classList.toggle('on', S.bold); applySel('bold'); }; bar.appendChild(boldBtn);
    const fontSel = el('select', { className: 'tic-font', title: 'Tipo de letra' }); for (const [v, n] of [['Arial, sans-serif', 'Arial'], ['Georgia, serif', 'Georgia'], ['Trebuchet MS, sans-serif', 'Trebuchet'], ['Comic Sans MS, cursive', 'Comic'], ['Impact, sans-serif', 'Impact'], ['Courier New, monospace', 'Mono']]) fontSel.appendChild(el('option', { value: v, textContent: n })); fontSel.onchange = () => { S.font = fontSel.value; applySel('font'); }; bar.appendChild(fontSel);
    bar.appendChild(sep());
    bar.appendChild(btn2('↶', () => undo(), 'Deshacer'));
    bar.appendChild(btn2('↷', () => redo(), 'Rehacer'));
    bar.appendChild(btn2('🗑', () => { if (S.sel >= 0) { snap(); S.objs.splice(S.sel, 1); S.sel = -1; draw(); } }, 'Borrar seleccionado'));
    bar.appendChild(sep());
    bar.appendChild(btn2('🎨 Fondos', () => togglePanel('fondos')));
    bar.appendChild(btn2('📑 Plantillas', () => togglePanel('plantillas')));
    bar.appendChild(btn2('🤖 Asistente', () => togglePanel('asistente')));
    bar.appendChild(sep());
    bar.appendChild(btn2('⬇ PNG', () => exportar('png'), 'Descargar PNG'));
    bar.appendChild(btn2('⬇ PDF', () => exportar('pdf'), 'Descargar PDF'));
    bar.appendChild(btn2('💾 Guardar', () => guardar(), 'Guardar', true));
    root.appendChild(bar);

    // --- escenario ---
    const stage = el('div', { className: 'tic-stage' });
    const canvas = el('canvas', { className: 'tic-canvas' });
    stage.appendChild(canvas);
    const floats = el('div', { className: 'tic-float' });
    floats.appendChild(fbtn('＋', () => zoom(1.2)));
    floats.appendChild(fbtn('－', () => zoom(1 / 1.2)));
    floats.appendChild(fbtn('⤢', () => ajustar()));
    stage.appendChild(floats);
    root.appendChild(stage);
    const g = canvas.getContext('2d');
    let side = null, panel = '';

    // --- helpers de barra ---
    function sep() { return el('div', { className: 'sep' }); }
    function btn2(txt, fn, title, pri) { const b = el('button', { className: 'btn2' + (pri ? ' pri' : ''), textContent: txt, title: title || txt }); b.onclick = fn; return b; }
    function fbtn(txt, fn) { const b = el('button', { textContent: txt }); b.onclick = fn; return b; }
    function titIn_onchange(input, St) { input.onchange = () => St.titulo = input.value.slice(0, 80) || 'Sin título'; }
    function setTool(k) { S.tool = k; for (const kk in toolBtns) toolBtns[kk].classList.toggle('on', kk === k); canvas.style.cursor = k === 'hand' ? 'grab' : (k === 'select' ? 'default' : 'crosshair'); }
    setTool(S.tool);

    // ---------- resize canvas a DPR ----------
    function resize() {
      const r = stage.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    }
    const ro = new ResizeObserver(resize); ro.observe(stage);

    // ---------- transform lienzo ----------
    const toLocal = (cx, cy) => { const r = canvas.getBoundingClientRect(); return { x: (cx - r.left - S.view.x) / S.view.s, y: (cy - r.top - S.view.y) / S.view.s }; };
    function zoom(f) { S.view.s = Math.max(.2, Math.min(5, S.view.s * f)); draw(); }
    function ajustar() { const r = stage.getBoundingClientRect(), s = Math.min((r.width - 40) / S.W, (r.height - 40) / S.H); S.view.s = s; S.view.x = (r.width - S.W * s) / 2; S.view.y = (r.height - S.H * s) / 2; draw(); }

    // ---------- pintar en pantalla (usa el motor unificado bgFill/objPaint) ----------
    function drawBg() { bgFill(g, S); }
    function drawObj(o, ghost) {
      objPaint(g, o);
      if (!ghost && S.sel >= 0 && S.objs[S.sel] === o) { const bb = bbox(o); g.save(); g.strokeStyle = '#0284c7'; g.setLineDash([5, 4]); g.lineWidth = 1.5 / S.view.s; g.strokeRect(bb.x - 4, bb.y - 4, bb.w + 8, bb.h + 8); g.setLineDash([]); g.fillStyle = '#0284c7'; g.fillRect(bb.x + bb.w, bb.y + bb.h, 10 / S.view.s, 10 / S.view.s); g.restore(); }
    }

    function draw() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
      g.save(); g.translate(S.view.x, S.view.y); g.scale(S.view.s, S.view.s);
      g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 18; g.fillRect(0, 0, S.W, S.H); g.shadowBlur = 0;
      drawBg();
      for (const o of S.objs) drawObj(o);
      if (tempObj) drawObj(tempObj, true);
      g.strokeStyle = '#cbd5e1'; g.lineWidth = 1 / S.view.s; g.strokeRect(0, 0, S.W, S.H);
      g.restore();
    }

    // ---------- bounding box / hit ----------
    function bbox(o) {
      if (o.t === 'path') { const xs = o.pts.map(p => p.x), ys = o.pts.map(p => p.y); const x = Math.min(...xs), y = Math.min(...ys); return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }; }
      if (o.t === 'line' || o.t === 'arrow') { const x = Math.min(o.x1, o.x2), y = Math.min(o.y1, o.y2); return { x, y, w: Math.abs(o.x2 - o.x1), h: Math.abs(o.y2 - o.y1) }; }
      if (o.t === 'text') { g.font = `${o.size || 28}px ${o.font || 'Arial'}`; const lines = (o.text || '').split('\n'); const w = Math.max(10, ...lines.map(l => g.measureText(l).width)); return { x: o.x, y: o.y, w, h: lines.length * (o.size || 28) * 1.25 }; }
      const x = Math.min(o.x, o.x + o.w), y = Math.min(o.y, o.y + o.h); return { x, y, w: Math.abs(o.w), h: Math.abs(o.h) };
    }
    function hit(p) { for (let i = S.objs.length - 1; i >= 0; i--) { const b = bbox(S.objs[i]); if (p.x >= b.x - 6 && p.x <= b.x + b.w + 6 && p.y >= b.y - 6 && p.y <= b.y + b.h + 6) return i; } return -1; }
    function onHandle(p) { if (S.sel < 0) return false; const b = bbox(S.objs[S.sel]); return Math.abs(p.x - (b.x + b.w)) < 14 / S.view.s && Math.abs(p.y - (b.y + b.h)) < 14 / S.view.s; }

    // ---------- interacción ----------
    let drawing = false, tempObj = null, start = null, panStart = null, moving = null, resizing = false;
    function snap() { S.undo.push(clone({ a: S.objs, bg: S.bg, bgColor: S.bgColor })); if (S.undo.length > 40) S.undo.shift(); S.redo = []; }
    function undo() { if (!S.undo.length) return; S.redo.push(clone({ a: S.objs, bg: S.bg, bgColor: S.bgColor })); const st = S.undo.pop(); restore(st); }
    function redo() { if (!S.redo.length) return; S.undo.push(clone({ a: S.objs, bg: S.bg, bgColor: S.bgColor })); const st = S.redo.pop(); restore(st); }
    function restore(st) { S.objs = st.a; S.bg = st.bg; S.bgColor = st.bgColor; S.sel = -1; S.objs.forEach(o => { if (o.t === 'image' && o.src && !o._img) { const im = new Image(); im.onload = draw; im.src = o.src; o._img = im; } }); draw(); }

    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId); const p = toLocal(e.clientX, e.clientY);
      if (S.tool === 'hand') { panStart = { x: e.clientX - S.view.x, y: e.clientY - S.view.y }; canvas.style.cursor = 'grabbing'; return; }
      if (S.tool === 'select') {
        if (onHandle(p)) { snap(); resizing = true; return; }
        const i = hit(p); S.sel = i; if (i >= 0) { snap(); moving = { i, dx: p.x, dy: p.y, o: clone(S.objs[i]) }; } draw(); return;
      }
      if (S.tool === 'text' || S.tool === 'note') { editarTexto(p, null); return; }
      if (S.tool === 'image') { insertarImagen(p); return; }
      if (S.tool === 'eraser') { snap(); const i = hit(p); if (i >= 0) S.objs.splice(i, 1); drawing = 'erase'; draw(); return; }
      snap(); drawing = true; start = p;
      if (['pen', 'marker', 'highlighter'].includes(S.tool)) tempObj = { t: 'path', pts: [p], color: S.color, width: S.tool === 'highlighter' ? S.width * 3 : (S.tool === 'marker' ? S.width * 1.6 : S.width), alpha: S.tool === 'highlighter' ? .35 : 1 };
      else tempObj = baseShape(p);
    });
    canvas.addEventListener('pointermove', e => {
      const p = toLocal(e.clientX, e.clientY);
      if (panStart) { S.view.x = e.clientX - panStart.x; S.view.y = e.clientY - panStart.y; draw(); return; }
      if (resizing && S.sel >= 0) { const o = S.objs[S.sel], b = bbox(o); resizeObj(o, p, b); draw(); return; }
      if (moving && S.tool === 'select') { const o = S.objs[moving.i], dx = p.x - moving.dx, dy = p.y - moving.dy; moveObj(o, moving.o, dx, dy); draw(); return; }
      if (!drawing) return;
      if (drawing === 'erase') { const i = hit(p); if (i >= 0) { S.objs.splice(i, 1); draw(); } return; }
      if (tempObj.t === 'path') { tempObj.pts.push(p); } else updateShape(tempObj, start, p);
      draw();
    });
    canvas.addEventListener('pointerup', () => {
      if (panStart) { panStart = null; canvas.style.cursor = 'grab'; }
      if (resizing) { resizing = false; }
      if (moving) { moving = null; }
      if (drawing && drawing !== 'erase' && tempObj) { if (valido(tempObj)) S.objs.push(tempObj); }
      drawing = false; tempObj = null; draw();
    });

    function baseShape(p) { const base = { color: S.color, width: S.width, fill: S.fill }; if (['line', 'arrow'].includes(S.tool)) return { t: S.tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, ...base }; return { t: S.tool, x: p.x, y: p.y, w: 0, h: 0, ...base }; }
    function updateShape(o, s, p) { if (o.t === 'line' || o.t === 'arrow') { o.x2 = p.x; o.y2 = p.y; } else { o.x = Math.min(s.x, p.x); o.y = Math.min(s.y, p.y); o.w = Math.abs(p.x - s.x); o.h = Math.abs(p.y - s.y); } }
    function valido(o) { if (o.t === 'path') return o.pts.length > 1; if (o.t === 'line' || o.t === 'arrow') return Math.hypot(o.x2 - o.x1, o.y2 - o.y1) > 4; return (o.w > 4 && o.h > 4); }
    function moveObj(o, orig, dx, dy) { if (o.t === 'path') o.pts = orig.pts.map(q => ({ x: q.x + dx, y: q.y + dy })); else if (o.t === 'line' || o.t === 'arrow') { o.x1 = orig.x1 + dx; o.y1 = orig.y1 + dy; o.x2 = orig.x2 + dx; o.y2 = orig.y2 + dy; } else { o.x = orig.x + dx; o.y = orig.y + dy; } }
    function resizeObj(o, p, b) { if (o.t === 'text') { o.size = Math.max(10, (p.y - o.y) / ((o.text || 'A').split('\n').length * 1.25)); } else if (o.t === 'line' || o.t === 'arrow') { o.x2 = p.x; o.y2 = p.y; } else if (o.t === 'path') { const sx = (p.x - b.x) / (b.w || 1), sy = (p.y - b.y) / (b.h || 1); o.pts = o.pts.map(q => ({ x: b.x + (q.x - b.x) * Math.max(.05, sx), y: b.y + (q.y - b.y) * Math.max(.05, sy) })); } else { o.w = Math.max(8, p.x - o.x); o.h = Math.max(8, p.y - o.y); } }
    function applySel(prop) { if (S.sel < 0) return; const o = S.objs[S.sel]; if (prop === 'color' && o.t !== 'image') o.color = S.color; if (prop === 'width') o.width = S.width; if (prop === 'fill' && 'fill' in o) o.fill = S.fill; if (prop === 'bold' && o.t === 'text') o.bold = S.bold; if (prop === 'font' && o.t === 'text') o.font = S.font; draw(); }

    // ---------- texto / nota con input flotante ----------
    function editarTexto(p, existente) {
      const esNota = existente ? existente.t === 'note' : S.tool === 'note';
      const input = el(esNota ? 'textarea' : 'input', { className: 'tic-edit-in' });
      const sx = p ? p.x : existente.x, sy = p ? p.y : existente.y;
      input.style.left = (S.view.x + sx * S.view.s) + 'px'; input.style.top = (S.view.y + sy * S.view.s) + 'px';
      input.style.fontSize = ((existente ? existente.size || 28 : S.size) * S.view.s) + 'px';
      input.value = existente ? existente.text || '' : '';
      if (esNota) { input.style.width = '160px'; input.style.height = '90px'; }
      stage.appendChild(input); input.focus();
      const commit = () => {
        const v = input.value; input.remove();
        if (!v.trim()) { draw(); return; }
        snap();
        if (existente) { existente.text = v; }
        else if (esNota) S.objs.push({ t: 'note', x: sx, y: sy, w: 180, h: 120, text: v, color: NOTAS[(S.noteIdx++) % NOTAS.length] });
        else S.objs.push({ t: 'text', x: sx, y: sy, text: v, color: S.color, size: S.size, bold: S.bold, font: S.font });
        draw();
      };
      input.onblur = commit; input.onkeydown = ev => { if (ev.key === 'Enter' && !esNota) { ev.preventDefault(); input.blur(); } if (ev.key === 'Escape') { input.value = existente ? existente.text : ''; input.blur(); } };
    }
    canvas.addEventListener('dblclick', e => { const p = toLocal(e.clientX, e.clientY); const i = hit(p); if (i >= 0 && (S.objs[i].t === 'text' || S.objs[i].t === 'note')) { S.sel = i; editarTexto(null, S.objs[i]); } });

    // ---------- imagen ----------
    function insertarImagen(p) {
      const inp = el('input', { type: 'file', accept: 'image/*' });
      inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const img = new Image(); img.onload = () => { const max = 1000, sc = Math.min(1, max / Math.max(img.width, img.height)); const cw = Math.round(img.width * sc), ch = Math.round(img.height * sc); const c2 = el('canvas', { width: cw, height: ch }); c2.getContext('2d').drawImage(img, 0, 0, cw, ch); const src = c2.toDataURL('image/jpeg', .72); const im2 = new Image(); im2.onload = () => { snap(); const w = Math.min(cw, S.W * .6), h = w * ch / cw; S.objs.push({ t: 'image', x: (p ? p.x : S.W / 2 - w / 2), y: (p ? p.y : S.H / 2 - h / 2), w, h, src, _img: im2 }); draw(); }; im2.src = src; }; img.src = rd.result; }; rd.readAsDataURL(f); };
      inp.click();
    }

    // ---------- paneles laterales ----------
    function togglePanel(which) { if (panel === which && side) { side.remove(); side = null; panel = ''; return; } if (side) side.remove(); panel = which; side = el('div', { className: 'tic-side' }); stage.appendChild(side); (which === 'fondos' ? panelFondos : which === 'plantillas' ? panelPlantillas : panelAsistente)(side); }
    function panelFondos(c) {
      const fondos = [['blanco', 'Blanco'], ['negro', 'Pizarrón'], ['cuadriculado', 'Cuadriculado'], ['rayado', 'Rayado'], ['caligrafia', 'Caligrafía'], ['cartesiano', 'Plano cartesiano'], ['matematica', 'Cuadrícula mat.'], ['bgcolor', 'Color…'], ['grad1', '🌊 Océano'], ['grad2', '🌅 Atardecer'], ['grad3', '🌿 Menta'], ['grad4', '🍬 Dulce'], ['grad5', '🔥 Fuego'], ['grad6', '🌲 Bosque']];
      c.innerHTML = '<h4>🎨 Fondo</h4>'; const grid = el('div', { className: 'tic-grid' });
      for (const [k, t] of fondos) { const ch = el('div', { className: 'tic-chip' + (S.bg === k ? ' on' : ''), textContent: t }); ch.onclick = () => { snap(); S.bg = k; if (k === 'bgcolor') { const ci = el('input', { type: 'color', value: S.bgColor }); ci.oninput = () => { S.bgColor = ci.value; draw(); }; ci.click(); } grid.querySelectorAll('.tic-chip').forEach(x => x.classList.remove('on')); ch.classList.add('on'); draw(); }; grid.appendChild(ch); }
      c.appendChild(grid);
    }
    function panelPlantillas(c) {
      const plantillas = diseno
        ? plantillasDiseno().map(p => [p.n, () => preset(p.w, p.h, p.bg, p.bgc, p.objs)])
        : [...plantillasPizarra().map(p => [p.n, () => { snap(); S.bg = p.bg || 'blanco'; S.objs = p.objs.map(o => ({ ...o })); S.sel = -1; ajustar(); }]),
          ['⬜ Cuadrícula', () => { snap(); S.bg = 'cuadriculado'; draw(); }],
          ['📐 Plano cartesiano', () => { snap(); S.bg = 'cartesiano'; draw(); }],
          ['✍️ Caligrafía', () => { snap(); S.bg = 'caligrafia'; draw(); }]];
      c.innerHTML = '<h4>📑 Plantillas</h4>'; const grid = el('div', { className: 'tic-grid' });
      for (const [t, fn] of plantillas) { const ch = el('div', { className: 'tic-chip', textContent: t }); ch.onclick = fn; grid.appendChild(ch); }
      c.appendChild(grid);
    }
    function preset(w, h, bg, bgc, objs) { snap(); S.W = w; S.H = h; S.bg = bg; S.bgColor = bgc; S.objs = objs.map(o => ({ ...o })); S.sel = -1; ajustar(); }
    function panelAsistente(c) {
      c.innerHTML = '<h4>🤖 Asistente Libretín</h4><p class="small muted" style="margin:0 0 6px">Escribe un tema. No pongas datos de alumnos.</p>';
      const modos = [['ideas', '💡 Ideas'], ['esquema', '🗺️ Esquema'], ['pasos', '🔢 Pasos'], ['preguntas', '❓ Preguntas'], ['texto', '📝 Texto']];
      let modo = 'ideas'; const grid = el('div', { className: 'tic-grid' });
      for (const [k, t] of modos) { const ch = el('div', { className: 'tic-chip' + (k === 'ideas' ? ' on' : ''), textContent: t }); ch.onclick = () => { modo = k; grid.querySelectorAll('.tic-chip').forEach(x => x.classList.remove('on')); ch.classList.add('on'); }; grid.appendChild(ch); }
      c.appendChild(grid);
      const ta = el('textarea', { placeholder: 'Ej.: el ciclo del agua para 4° de primaria' }); c.appendChild(ta);
      const out = el('div', { style: 'margin-top:8px' });
      const b = el('button', { className: 'btn2', textContent: '✨ Generar' });
      b.onclick = async () => { const tema = ta.value.trim(); if (!tema) return toast('Escribe un tema'); b.disabled = true; b.textContent = 'Pensando…'; try { const r = await api('tic/asistente', { tema, modo }); if (r.aviso) { out.innerHTML = `<p class="small muted">${esc(r.aviso)}</p>`; } else { out.innerHTML = `<div style="white-space:pre-wrap;font-size:13px;border:1px solid #e5e7eb;border-radius:9px;padding:8px;max-height:200px;overflow:auto">${esc(r.texto)}</div>`; const add = el('button', { className: 'btn2', textContent: '➕ Poner en el lienzo' }); add.onclick = () => { snap(); S.objs.push({ t: 'text', x: 60, y: 60, text: r.texto.slice(0, 1500), color: S.bg === 'negro' ? '#fff' : '#0f172a', size: 24 }); draw(); toast('✅ Agregado'); }; out.appendChild(add); } } catch (e) { toast('⚠️ ' + e.message); } finally { b.disabled = false; b.textContent = '✨ Generar'; } };
      c.appendChild(b); c.appendChild(out);
    }
    function exportar(fmt) {
      const scale = 2, c2 = el('canvas', { width: S.W * scale, height: S.H * scale }), g2 = c2.getContext('2d'); g2.scale(scale, scale);
      bgFill(g2, S); for (const o of S.objs) objPaint(g2, o);
      const nombre = (S.titulo || 'profetok').replace(/[^\w\-]+/g, '_').slice(0, 40);
      if (fmt === 'png') { c2.toBlob(bl => bajar(bl, nombre + '.png'), 'image/png'); }
      else { const jpeg = c2.toDataURL('image/jpeg', .85); const blob = jpegPdf(jpeg, c2.width, c2.height); bajar(blob, nombre + '.pdf'); }
    }
    function bajar(blob, nombre) { const a = el('a', { href: URL.createObjectURL(blob), download: nombre }); document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 2000); toast('⬇ Descargado: ' + nombre); }

    // ---------- guardar ----------
    async function guardar() {
      const datos = JSON.stringify({ bg: S.bg, bgColor: S.bgColor, w: S.W, h: S.H, objs: S.objs.map(o => { const c = { ...o }; delete c._img; return c; }) });
      if (datos.length > 3.5e6) return toast('⚠️ El trabajo pesa mucho. Usa menos imágenes o más livianas.');
      try { const r = await api('tic/guardar', { id: S.id, tipo: S.tipo, titulo: S.titulo, datos }); S.id = r.id; toast('💾 Guardado'); } catch (e) { toast('⚠️ ' + e.message); }
    }

    // ---------- cargar existente ----------
    async function cargar() {
      if (!id) { ajustar(); if (abrirAsistente) togglePanel('asistente'); else if (diseno) togglePanel('plantillas'); return; }
      try { const r = await api('tic/pizarra?id=' + id); S.titulo = r.titulo; titIn.value = r.titulo; const d = r.datos || {}; S.bg = d.bg || 'blanco'; S.bgColor = d.bgColor || '#ffffff'; S.W = d.w || S.W; S.H = d.h || S.H; S.objs = d.objs || []; S.objs.forEach(o => { if (o.t === 'image' && o.src) { const im = new Image(); im.onload = draw; im.src = o.src; o._img = im; } }); } catch (e) { toast('⚠️ No se pudo cargar'); } ajustar();
    }

    // ---------- cerrar ----------
    function cerrar() { ro.disconnect(); window.removeEventListener('keydown', onKey); root.remove(); document.body.style.overflow = ''; const list = document.querySelector('#ticList'); if (list) cargarLista(list); }
    function onKey(e) { if (e.key === 'Delete' && S.sel >= 0) { snap(); S.objs.splice(S.sel, 1); S.sel = -1; draw(); } if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); } if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); } if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); guardar(); } }
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });

    resize(); cargar();
  }

  // PDF mínimo con una imagen JPEG embebida (DCTDecode). Devuelve Blob.
  function jpegPdf(jpegDataUrl, wpx, hpx) {
    const bin = atob(jpegDataUrl.split(',')[1]); const img = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) img[i] = bin.charCodeAt(i);
    const enc = s => { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
    const parts = []; let len = 0; const off = []; const push = b => { parts.push(b); len += b.length; };
    const W = wpx, H = hpx;
    push(enc('%PDF-1.4\n'));
    const obj = (n, body) => { off[n] = len; push(enc(n + ' 0 obj\n' + body + '\n')); };
    obj(1, '<</Type/Catalog/Pages 2 0 R>>');
    obj(2, '<</Type/Pages/Kids[3 0 R]/Count 1>>');
    obj(3, `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${W} ${H}]/Resources<</XObject<</Im0 4 0 R>>>>/Contents 5 0 R>>`);
    off[4] = len; push(enc(`4 0 obj\n<</Type/XObject/Subtype/Image/Width ${W}/Height ${H}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${img.length}>>\nstream\n`)); push(img); push(enc('\nendstream\nendobj\n'));
    const cont = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`; obj(5, `<</Length ${cont.length}>>\nstream\n${cont}\nendstream`);
    const xref = len; let x = `xref\n0 6\n0000000000 65535 f \n`; for (let n = 1; n <= 5; n++) x += String(off[n]).padStart(10, '0') + ' 00000 n \n'; push(enc(x));
    push(enc(`trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`));
    return new Blob(parts, { type: 'application/pdf' });
  }

  // Plantillas profesionales del estudio de diseño (ProfeCrea). Cada una es composición real de objetos.
  function plantillasDiseno() {
    const navy = '#0f172a', gold = '#d4a017', brown = '#b45309', sky = '#0284c7', white = '#ffffff', slate = '#475569';
    const T = (text, x, y, size, color, bold, font) => ({ t: 'text', x, y, text, size, color: color || navy, bold: !!bold, font: font || 'Arial, sans-serif' });
    const R = (x, y, w, h, color, width, fill) => ({ t: 'rect', x, y, w, h, color, width: width || 2, fill: !!fill });
    const E = (x, y, w, h, color, fill, alpha) => ({ t: 'ellipse', x, y, w, h, color, width: 2, fill: !!fill, alpha: alpha == null ? 1 : alpha });
    const L = (x1, y1, x2, y2, color, width) => ({ t: 'line', x1, y1, x2, y2, color, width: width || 2 });
    return [
      {
        n: '🏅 Diploma', w: 1350, h: 1000, bg: 'bgcolor', bgc: '#fffdf7', objs: [
          R(45, 45, 1260, 910, brown, 10, false), R(68, 68, 1214, 864, gold, 3, false),
          E(600, 92, 150, 150, gold, true), T('🏅', 648, 118, 92),
          T('DIPLOMA DE HONOR', 310, 290, 74, brown, true, 'Georgia, serif'),
          T('Se otorga a:', 300, 440, 40, slate), L(300, 575, 1050, 575, '#cbd5e1', 2),
          T('por su destacado desempeño durante el año escolar.', 300, 620, 30, slate),
          L(310, 835, 585, 835, navy, 2), L(765, 835, 1040, 835, navy, 2),
          T('Director(a)', 375, 850, 26, '#64748b'), T('Docente', 855, 850, 26, '#64748b')
        ]
      },
      {
        n: '📋 Normas del aula', w: 1080, h: 1350, bg: 'grad1', bgc: '#0ea5e9', objs: [
          R(70, 80, 940, 150, sky, 2, true), T('NORMAS DE\nNUESTRA AULA', 110, 100, 52, white, true),
          E(100, 330, 70, 70, '#f59e0b', true), T('1', 126, 346, 38, white, true), T('Escucho con atención', 205, 345, 40, navy),
          E(100, 490, 70, 70, '#ef4444', true), T('2', 126, 506, 38, white, true), T('Levanto la mano para hablar', 205, 505, 40, navy),
          E(100, 650, 70, 70, '#22c55e', true), T('3', 126, 666, 38, white, true), T('Cuido mis materiales', 205, 665, 40, navy),
          E(100, 810, 70, 70, '#8b5cf6', true), T('4', 126, 826, 38, white, true), T('Respeto a mis compañeros', 205, 825, 40, navy),
          T('¡Juntos aprendemos mejor! 🌟', 150, 1240, 40, white, true)
        ]
      },
      {
        n: '📅 Horario', w: 1350, h: 1000, bg: 'blanco', bgc: white, objs: (() => {
          const o = [T('HORARIO DE CLASES', 60, 45, 56, navy, true)], x0 = 60, y0 = 150, w = 1230, h = 790, col = w / 6, hh = 72;
          o.push(R(x0, y0, w, hh, sky, 2, true));
          ['Hora', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].forEach((d, i) => o.push(T(d, x0 + col * i + (i ? 30 : 40), y0 + 20, 26, white, true)));
          o.push(R(x0, y0, w, h, '#94a3b8', 2, false));
          for (let k = 1; k < 6; k++) o.push(L(x0 + col * k, y0, x0 + col * k, y0 + h, '#cbd5e1', 1));
          const rows = 7, rh = (h - hh) / rows;
          for (let r = 0; r <= rows; r++) o.push(L(x0, y0 + hh + rh * r, x0 + w, y0 + hh + rh * r, '#e2e8f0', 1));
          return o;
        })()
      },
      {
        n: '📓 Portada', w: 1080, h: 1350, bg: 'grad4', bgc: '#8b5cf6', objs: [
          E(760, -130, 520, 520, white, true, .12), E(-140, 1040, 440, 440, white, true, .10),
          T('CUADERNO DE', 100, 520, 44, white), T('Comunicación', 100, 580, 92, white, true),
          T('5° de Primaria · 2026', 100, 760, 40, white),
          R(100, 920, 640, 100, white, 3, false), T('Nombre:', 120, 952, 36, white)
        ]
      },
      {
        n: '⭐ Alumno del mes', w: 1350, h: 1000, bg: 'grad3', bgc: '#22c55e', objs: [
          R(165, 110, 1020, 780, white, 2, true),
          E(600, 155, 150, 150, gold, true), T('⭐', 648, 182, 86),
          T('ESTUDIANTE DEL MES', 360, 380, 60, navy, true),
          L(410, 560, 940, 560, '#cbd5e1', 2),
          T('¡Felicitaciones por tu esfuerzo y dedicación!', 370, 620, 32, slate)
        ]
      },
      {
        n: '💬 Frase', w: 1080, h: 1080, bg: 'grad2', bgc: '#f97316', objs: [
          E(780, 760, 420, 420, white, true, .12),
          T('«El esfuerzo\nde hoy es el\néxito de\nmañana»', 90, 230, 74, white, true, 'Georgia, serif'),
          T('— ProfeTok', 90, 900, 36, white)
        ]
      },
      {
        n: '🎉 Felicitaciones', w: 1080, h: 1080, bg: 'grad5', bgc: '#f59e0b', objs: [
          T('🎉', 450, 150, 170), T('¡FELICITACIONES!', 120, 500, 74, white, true),
          T('Por tu excelente trabajo', 250, 640, 42, white)
        ]
      },
      { n: '⬜ En blanco', w: 1080, h: 1080, bg: 'blanco', bgc: white, objs: [] }
    ];
  }

  // colores de notas adhesivas (estilo Miro); las notas rotan de color para una lluvia de ideas multicolor
  const NOTAS = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#ddd6fe', '#fbcfe8'];

  // Plantillas de trabajo para la Pizarra (estilo Miro, pensadas para el aula). Composición de objetos propios.
  function plantillasPizarra() {
    const navy = '#0f172a', sky = '#0284c7', gray = '#94a3b8';
    const T = (text, x, y, size, color, bold) => ({ t: 'text', x, y, text, size, color: color || navy, bold: !!bold, font: 'Arial, sans-serif' });
    const R = (x, y, w, h, color, width, fill) => ({ t: 'rect', x, y, w, h, color, width: width || 2, fill: !!fill });
    const E = (x, y, w, h, color, fill, alpha) => ({ t: 'ellipse', x, y, w, h, color, width: 3, fill: !!fill, alpha: alpha == null ? 1 : alpha });
    const L = (x1, y1, x2, y2, color, width) => ({ t: 'line', x1, y1, x2, y2, color: color || gray, width: width || 2 });
    const A = (x1, y1, x2, y2, color) => ({ t: 'arrow', x1, y1, x2, y2, color: color || navy, width: 3 });
    const N = (x, y, text, color) => ({ t: 'note', x, y, w: 180, h: 120, text, color });
    return [
      {
        n: '🧠 Mapa mental', bg: 'blanco', objs: [
          L(640, 400, 320, 190), L(640, 400, 960, 190), L(640, 400, 320, 610), L(640, 400, 960, 610),
          E(500, 330, 280, 140, sky, false), T('Tema central', 548, 385, 30, sky, true),
          E(210, 130, 210, 110, '#f59e0b', false), T('Idea 1', 258, 170, 26, '#b45309', true),
          E(850, 130, 210, 110, '#22c55e', false), T('Idea 2', 900, 170, 26, '#15803d', true),
          E(210, 560, 210, 110, '#ec4899', false), T('Idea 3', 258, 600, 26, '#be185d', true),
          E(850, 560, 210, 110, '#8b5cf6', false), T('Idea 4', 900, 600, 26, '#6d28d9', true)
        ]
      },
      {
        n: '💡 Lluvia de ideas', bg: 'blanco', objs: [
          T('💡 Lluvia de ideas', 60, 40, 44, navy, true),
          N(90, 140, 'Idea…', NOTAS[0]), N(330, 180, 'Idea…', NOTAS[1]), N(580, 140, 'Idea…', NOTAS[2]),
          N(820, 190, 'Idea…', NOTAS[3]), N(230, 420, 'Idea…', NOTAS[4]), N(540, 440, 'Idea…', NOTAS[5]), N(850, 430, 'Idea…', NOTAS[1])
        ]
      },
      {
        n: '➡️ Mapa de proceso', bg: 'blanco', objs: [
          T('Proceso', 60, 40, 40, navy, true),
          R(80, 330, 220, 120, sky, 3, false), T('Paso 1', 140, 375, 30, sky, true),
          A(300, 390, 420, 390, '#94a3b8'),
          R(420, 330, 220, 120, '#22c55e', 3, false), T('Paso 2', 480, 375, 30, '#15803d', true),
          A(640, 390, 760, 390, '#94a3b8'),
          R(760, 330, 220, 120, '#f59e0b', 3, false), T('Paso 3', 820, 375, 30, '#b45309', true),
          A(980, 390, 1100, 390, '#94a3b8'),
          R(1100, 330, 160, 120, '#ec4899', 3, false), T('Fin', 1150, 375, 30, '#be185d', true)
        ]
      },
      {
        n: '📊 KWL (qué sé)', bg: 'blanco', objs: [
          L(443, 120, 443, 760, '#cbd5e1', 2), L(837, 120, 837, 760, '#cbd5e1', 2),
          R(40, 40, 400, 70, sky, 2, true), T('Qué SÉ', 150, 58, 32, '#fff', true),
          R(443, 40, 394, 70, '#22c55e', 2, true), T('Qué QUIERO saber', 500, 58, 30, '#fff', true),
          R(840, 40, 400, 70, '#f59e0b', 2, true), T('Qué APRENDÍ', 950, 58, 30, '#fff', true)
        ]
      },
      {
        n: '⚖️ Comparar', bg: 'blanco', objs: [
          L(640, 130, 640, 760, '#cbd5e1', 2),
          R(60, 40, 520, 70, sky, 2, true), T('Opción A', 230, 58, 32, '#fff', true),
          R(700, 40, 520, 70, '#8b5cf6', 2, true), T('Opción B', 870, 58, 32, '#fff', true)
        ]
      },
      {
        n: '🔵 Venn', bg: 'blanco', objs: [
          E(230, 230, 520, 520, '#0ea5e9', true, .35), E(530, 230, 520, 520, '#f59e0b', true, .35),
          T('Grupo A', 300, 300, 32, '#0369a1', true), T('Grupo B', 820, 300, 32, '#b45309', true),
          T('Ambos', 580, 470, 28, navy, true)
        ]
      }
    ];
  }

  window.TIC = { montar };
})();
