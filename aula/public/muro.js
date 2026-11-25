/* 📌 Muro Digital (estilo Padlet) — ProfeTok. window.MURO.abrir({api,toast,esc}).
   Tarjetas con texto, color e imagen. Enlace público (solo lectura) para compartir. Gratis. */
(function () {
  'use strict';
  const el = (t, p = {}, h = '') => { const e = document.createElement(t); Object.assign(e, p); if (h) e.innerHTML = h; return e; };
  const COLS = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#ddd6fe', '#fbcfe8', '#ffffff'];
  const GRAD = { grad1: 'linear-gradient(135deg,#0ea5e9,#6366f1)', grad2: 'linear-gradient(135deg,#f97316,#ec4899)', grad3: 'linear-gradient(135deg,#22c55e,#0ea5e9)', grad4: 'linear-gradient(135deg,#8b5cf6,#ec4899)', grad5: 'linear-gradient(135deg,#f59e0b,#ef4444)', grad6: 'linear-gradient(135deg,#0f766e,#042f2e)', pizarra: '#0f2419', claro: '#eef2f6' };
  let CTX = null; const api = (...a) => CTX.api(...a), toast = m => CTX.toast && CTX.toast(m), esc = CTX ? null : null;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function estilos() {
    if (document.getElementById('mu-css')) return;
    document.head.appendChild(el('style', { id: 'mu-css' }, `
.mu-ov{position:fixed;inset:0;z-index:4100;background:#eef2f6;display:flex;flex-direction:column;font-family:ui-sans-serif,system-ui,Arial}
.mu-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border-bottom:1px solid #e5e7eb;flex-wrap:wrap}
.mu-bar .ti{font-weight:800;font-size:18px;border:1px solid transparent;border-radius:8px;padding:6px 8px;min-width:120px}
.mu-bar .ti:hover{border-color:#e5e7eb}
.mu-b{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px;cursor:pointer;font-weight:700;font-size:14px}
.mu-b.pri{background:#0284c7;color:#fff;border-color:#0284c7}
.mu-b:hover{filter:brightness(.97)}
.mu-body{flex:1;overflow:auto;padding:18px}
.mu-desc{color:#fff;opacity:.95;margin:-6px 0 14px;font-size:15px;text-shadow:0 1px 3px rgba(0,0,0,.25)}
.mu-cols{column-width:230px;column-gap:14px}
.mu-card{break-inside:avoid;margin:0 0 14px;border-radius:14px;padding:14px;box-shadow:0 4px 14px -6px rgba(0,0,0,.25);position:relative}
.mu-card img{width:100%;border-radius:9px;margin-bottom:8px;display:block}
.mu-card .tx{white-space:pre-wrap;word-break:break-word;font-size:15px;color:#1f2937}
.mu-card .au{font-size:11px;color:#6b7280;margin-top:8px}
.mu-card .del{position:absolute;top:6px;right:6px;border:none;background:rgba(0,0,0,.08);border-radius:50%;width:26px;height:26px;cursor:pointer;opacity:0;transition:.12s}
.mu-card:hover .del{opacity:1}
.mu-add{break-inside:avoid;margin:0 0 14px;border-radius:14px;padding:16px;background:rgba(255,255,255,.85);border:2px dashed #94a3b8;cursor:pointer;text-align:center;font-weight:700;color:#475569}
.mu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.mu-mini{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;cursor:pointer;transition:.12s}
.mu-mini:hover{transform:translateY(-2px);border-color:#7dd3fc}
.mu-form{position:fixed;inset:0;z-index:4150;background:rgba(15,23,42,.5);display:grid;place-items:center;padding:16px}
.mu-fc{background:#fff;border-radius:16px;padding:18px;width:min(94vw,420px);display:flex;flex-direction:column;gap:10px}
.mu-fc textarea{border:1px solid #e5e7eb;border-radius:10px;padding:10px;font:inherit;min-height:90px;resize:vertical}
.mu-sw{display:flex;gap:6px;flex-wrap:wrap}
.mu-sw button{width:26px;height:26px;border-radius:7px;border:2px solid #fff;box-shadow:0 0 0 1px #cbd5e1;cursor:pointer}
`));
  }

  function abrir(ctx) {
    CTX = ctx; estilos();
    const ov = el('div', { className: 'mu-ov' });
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const bar = el('div', { className: 'mu-bar' }), body = el('div', { className: 'mu-body' });
    ov.appendChild(bar); ov.appendChild(body);
    const cerrar = () => { ov.remove(); document.body.style.overflow = ''; };

    async function vistaLista() {
      bar.innerHTML = ''; body.style.background = '#eef2f6';
      const back = el('button', { className: 'mu-b', textContent: '‹ Cerrar' }); back.onclick = cerrar; bar.appendChild(back);
      bar.appendChild(el('div', { style: 'font-weight:800;font-size:18px' }, '📌 Muro Digital'));
      body.innerHTML = '<div class="mu-grid" id="mg"><div>Cargando…</div></div>';
      const g = body.querySelector('#mg');
      let items = []; try { items = (await api('tic/muros')).items; } catch (e) { }
      g.innerHTML = '';
      const nuevo = el('div', { className: 'mu-mini', style: 'border:2px dashed #94a3b8;text-align:center;color:#475569;font-weight:700' }, '➕ Nuevo muro');
      nuevo.onclick = async () => { try { const r = await api('tic/muro-guardar', { titulo: 'Mi muro' }); abrirMuro(r.id); } catch (e) { toast('⚠️ ' + e.message); } };
      g.appendChild(nuevo);
      for (const m of items) { const c = el('div', { className: 'mu-mini' }, `<b>${E(m.titulo)}</b><div style="color:#94a3b8;font-size:13px;margin-top:4px">${m.posts} tarjeta${m.posts === 1 ? '' : 's'}</div>`); c.onclick = () => abrirMuro(m.id); g.appendChild(c); }
    }

    async function abrirMuro(id) {
      let data; try { data = await api('tic/muro?id=' + id); } catch (e) { toast('⚠️ ' + e.message); return vistaLista(); }
      let muro = data.muro, posts = data.posts;
      bar.innerHTML = '';
      const back = el('button', { className: 'mu-b', textContent: '‹ Mis muros' }); back.onclick = vistaLista; bar.appendChild(back);
      const ti = el('input', { className: 'ti', value: muro.titulo }); ti.onchange = () => guardarMuro({ titulo: ti.value }); bar.appendChild(ti);
      const fondoSel = el('select', { className: 'mu-b' }); for (const [k, n] of [['grad1', '🌊 Azul'], ['grad3', '🌿 Verde'], ['grad2', '🌅 Naranja'], ['grad4', '🟣 Morado'], ['grad5', '🔥 Rojo'], ['claro', '⬜ Claro'], ['pizarra', '🟩 Pizarrón']]) fondoSel.appendChild(el('option', { value: k, textContent: n, selected: muro.fondo === k })); fondoSel.onchange = () => { muro.fondo = fondoSel.value; pintarFondo(); guardarMuro({ fondo: muro.fondo }); }; bar.appendChild(fondoSel);
      const comp = el('button', { className: 'mu-b', textContent: '🔗 Compartir' }); comp.onclick = () => compartir(muro.token); bar.appendChild(comp);
      const del = el('button', { className: 'mu-b', textContent: '🗑' }); del.title = 'Borrar muro'; del.onclick = async () => { if (!confirm('¿Borrar este muro y sus tarjetas?')) return; await api('tic/muro-borrar', { id }); vistaLista(); }; bar.appendChild(del);

      function pintarFondo() { body.style.background = GRAD[muro.fondo] || '#eef2f6'; }
      async function guardarMuro(campos) { try { await api('tic/muro-guardar', { id, titulo: ti.value, descripcion: muro.descripcion, fondo: muro.fondo, ...campos }); } catch (e) { toast('⚠️ ' + e.message); } }
      function render() {
        pintarFondo();
        body.innerHTML = (muro.descripcion ? `<div class="mu-desc">${E(muro.descripcion)}</div>` : '') + '<div class="mu-cols" id="mc"></div>';
        const mc = body.querySelector('#mc');
        const add = el('div', { className: 'mu-add' }, '➕ Agregar tarjeta'); add.onclick = () => formPost(); mc.appendChild(add);
        for (const p of posts) {
          const c = el('div', { className: 'mu-card' }); c.style.background = p.color || '#fde68a';
          c.innerHTML = (p.img ? `<img src="${E(p.img)}" alt="">` : '') + (p.texto ? `<div class="tx">${E(p.texto)}</div>` : '') + (p.autor ? `<div class="au">— ${E(p.autor)}</div>` : '');
          const x = el('button', { className: 'del', textContent: '✕', title: 'Borrar' }); x.onclick = async (e) => { e.stopPropagation(); await api('tic/post-borrar', { id: p.id }); posts = posts.filter(z => z !== p); render(); }; c.appendChild(x);
          c.onclick = () => formPost(p);
          mc.appendChild(c);
        }
      }
      function formPost(edit) {
        const wrap = el('div', { className: 'mu-form' }); const fc = el('div', { className: 'mu-fc' });
        let color = edit ? edit.color : '#fde68a', img = edit ? edit.img : '';
        fc.appendChild(el('b', {}, edit ? '✏️ Editar tarjeta' : '➕ Nueva tarjeta'));
        const ta = el('textarea', { placeholder: 'Escribe algo…', value: edit ? edit.texto : '' }); fc.appendChild(ta);
        const sw = el('div', { className: 'mu-sw' }); for (const col of COLS) { const b = el('button'); b.style.background = col; b.onclick = () => { color = col; sw.querySelectorAll('button').forEach(z => z.style.outline = ''); b.style.outline = '3px solid #0284c7'; }; if (col === color) b.style.outline = '3px solid #0284c7'; sw.appendChild(b); } fc.appendChild(sw);
        const prev = el('div'); if (img) prev.innerHTML = `<img src="${E(img)}" style="max-width:100%;border-radius:8px">`;
        const bImg = el('button', { className: 'mu-b', textContent: '🖼️ Imagen' }); bImg.onclick = () => { const inp = el('input', { type: 'file', accept: 'image/*' }); inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const max = 900, sc = Math.min(1, max / Math.max(im.width, im.height)); const cw = im.width * sc, ch = im.height * sc; const cv = el('canvas', { width: cw, height: ch }); cv.getContext('2d').drawImage(im, 0, 0, cw, ch); img = cv.toDataURL('image/jpeg', .7); prev.innerHTML = `<img src="${img}" style="max-width:100%;border-radius:8px">`; }; im.src = rd.result; }; rd.readAsDataURL(f); }; inp.click(); };
        fc.appendChild(bImg); fc.appendChild(prev);
        const row = el('div', { style: 'display:flex;gap:8px;justify-content:flex-end' });
        const cancel = el('button', { className: 'mu-b', textContent: 'Cancelar' }); cancel.onclick = () => wrap.remove();
        const ok = el('button', { className: 'mu-b pri', textContent: 'Guardar' });
        ok.onclick = async () => { try { const r = await api('tic/post', { muro_id: id, id: edit ? edit.id : undefined, texto: ta.value, color, img }); if (edit) { edit.texto = ta.value; edit.color = color; if (img) edit.img = img; } else { posts.push({ id: r.id, texto: ta.value, color, img, autor: CTX.nombre || '' }); } wrap.remove(); render(); } catch (e) { toast('⚠️ ' + e.message); } };
        row.appendChild(cancel); row.appendChild(ok); fc.appendChild(row);
        wrap.appendChild(fc); document.body.appendChild(wrap); wrap.onclick = e => { if (e.target === wrap) wrap.remove(); }; ta.focus();
      }
      function compartir(token) {
        const link = location.origin + '/muro.html?t=' + token;
        const wrap = el('div', { className: 'mu-form' }); const fc = el('div', { className: 'mu-fc' });
        fc.innerHTML = '<b>🔗 Compartir muro</b><p style="margin:0;color:#475569;font-size:14px">Cualquiera con este enlace puede VER el muro (solo lectura). Compártelo por WhatsApp con tus alumnos o sus familias.</p>';
        const inp = el('input', { className: 'mu-b', value: link, readOnly: true, style: 'width:100%' }); fc.appendChild(inp);
        const row = el('div', { style: 'display:flex;gap:8px;justify-content:flex-end' });
        const cp = el('button', { className: 'mu-b pri', textContent: '📋 Copiar' }); cp.onclick = () => { inp.select(); try { navigator.clipboard.writeText(link); } catch (e) { document.execCommand('copy'); } toast('✅ Enlace copiado'); };
        const wa = el('a', { className: 'mu-b', textContent: '📲 WhatsApp', href: 'https://wa.me/?text=' + encodeURIComponent('Mira nuestro muro en ProfeTok: ' + link), target: '_blank' });
        const cerrarF = el('button', { className: 'mu-b', textContent: 'Cerrar' }); cerrarF.onclick = () => wrap.remove();
        row.appendChild(wa); row.appendChild(cp); row.appendChild(cerrarF); fc.appendChild(row);
        wrap.appendChild(fc); document.body.appendChild(wrap); wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
      }
      render();
    }

    vistaLista();
  }

  window.MURO = { abrir };
})();
