// 💎 Joyas: juego de combinar 3 estilo saga (implementación propia). Mapa de 100 niveles con progreso guardado,
// objetivos (puntos, recolectar colores, romper hielo), joyas especiales (rayo, bomba, arcoíris), potenciadores con monedas.
(() => {
  const A = window.ARC_API, { JUEGOS, cuadro, salir } = A, setParar = A.setParar;
  const N = 8, TOTAL = 100;
  const COL = [['#ff3b5c', '#ffb3c1'], ['#ff8c1a', '#ffd6a5'], ['#ffd60a', '#fff3b0'], ['#22c55e', '#bbf7d0'], ['#3b82f6', '#bfdbfe'], ['#a855f7', '#e9d5ff']];
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function cfg(n) {
    const r = rng(n * 7919), colores = n < 20 ? 5 : 6, tipo = n === 1 ? 'puntos' : ['puntos', 'recoger', 'hielo'][n % 3];
    const c = { n, colores, movs: 16 + Math.floor(r() * 6) + (tipo === 'hielo' ? 4 : 0), tipo, hielo: Array(N * N).fill(0) };
    if (tipo === 'puntos') c.meta = 3000 + n * 260;
    if (tipo === 'recoger') { const a = Math.floor(r() * colores); let b; do { b = Math.floor(r() * colores); } while (b === a); c.recoger = { [a]: 10 + Math.floor(n / 3), [b]: 8 + Math.floor(n / 4) }; }
    if (tipo === 'hielo') { const pat = Math.floor(r() * 4), k = Math.min(10 + n, 40); for (let i = 0; i < N * N; i++) { const x = i % N, y = Math.floor(i / N); if ((pat === 0 && y >= N - 3) || (pat === 1 && (x === y || x === N - 1 - y)) || (pat === 2 && x > 1 && x < 6 && y > 1 && y < 6) || (pat === 3 && (x + y) % 2 === 0 && y > 3)) c.hielo[i] = n > 40 && r() < .4 ? 2 : 1; } const idx = c.hielo.map((v, i) => v ? i : -1).filter(i => i >= 0); idx.slice(k).forEach(i => c.hielo[i] = 0); }
    c.e2 = Math.round((c.meta || 2600 + n * 200) * 1.6); c.e3 = Math.round(c.e2 * 1.6);
    return c;
  }

  // ---------- Mapa de niveles ----------
  function mapa(t) {
    salir(); registrar(t.id);
    const J = PERFIL.datos.juegos.joyas || { nivel: 1, estrellas: {} }, act = Math.min(J.nivel || 1, TOTAL), est = J.estrellas || {};
    const H = 96, W = Math.min(($('#stage').clientWidth || 360) - 10, 460), pos = n => ({ x: W / 2 + Math.sin(n * .9) * W * .3, y: (TOTAL - n) * H + 60 });
    stage(`<div class="card" style="padding:12px;position:sticky;top:6px;z-index:5"><div style="display:flex;justify-content:space-between;align-items:center"><b>💎 Joyas</b><span>🪙 ${PERFIL.datos.monedas} · ⭐ ${Object.values(est).reduce((a, b) => a + b, 0)}</span></div>
      <button class="btn" id="jg">▶ Jugar nivel ${act}</button></div>
      <div id="mapa" style="position:relative;height:${TOTAL * H + 120}px;margin-top:10px;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#2d1b69,#7b2ff7 30%,#ff5fa2 60%,#ffb36b 85%,#22c55e)">
      <svg width="${W}" height="${TOTAL * H + 120}" style="position:absolute;left:0;top:0"><polyline points="${[...Array(TOTAL).keys()].map(i => { const p = pos(i + 1); return p.x + ',' + p.y; }).join(' ')}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="10" stroke-dasharray="2 14" stroke-linecap="round"/></svg>
      ${[...Array(TOTAL).keys()].map(i => { const n = i + 1, p = pos(n), ok = n <= act, e = est[n] || 0; return `<button data-n="${n}" ${ok ? '' : 'disabled'} style="position:absolute;left:${p.x - 30}px;top:${p.y - 30}px;width:60px;height:60px;border-radius:50%;border:4px solid ${n === act ? '#fff' : 'rgba(255,255,255,.5)'};background:${ok ? (e ? 'radial-gradient(circle at 35% 30%,#ffe066,#f59f00)' : 'radial-gradient(circle at 35% 30%,#7dd3fc,#2563eb)') : 'rgba(30,20,60,.6)'};color:#fff;font:900 1.2rem Figtree,sans-serif;cursor:${ok ? 'pointer' : 'default'};box-shadow:${n === act ? '0 0 0 8px rgba(255,255,255,.25),0 0 30px #fff' : '0 6px 14px rgba(0,0,0,.35)'};${n === act ? 'animation:late 1.6s infinite' : ''}">${ok ? n : '🔒'}<span style="position:absolute;left:50%;transform:translateX(-50%);bottom:-18px;font-size:.75rem;white-space:nowrap">${ok && e ? '⭐'.repeat(e) : ''}</span></button>`; }).join('')}</div>`);
    const p = pos(act); setTimeout(() => scrollTo({ top: $('#mapa').getBoundingClientRect().top + scrollY + p.y - innerHeight / 2, behavior: 'smooth' }), 80);
    $('#stage').onclick = e => { const b = e.target.closest('[data-n]'); if (b && !b.disabled) nivel(t, +b.dataset.n); if (e.target.id === 'jg') nivel(t, act); };
    setParar(() => {});
  }

  // ---------- Un nivel ----------
  function nivel(t, n) {
    salir(); scrollTo(0, 0);
    const C = cfg(n), W = cuadro(), S = W / N;
    stage(`<div class="card" style="padding:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><button class="btn alt" id="vm" style="width:auto;margin:0;padding:4px 10px;font-size:.8rem">🗺️ Mapa</button><b>Nivel ${n}</b><span>🪙 <b id="mon">${PERFIL.datos.monedas}</b></span></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px"><div style="text-align:center;background:rgba(255,255,255,.08);border-radius:12px;padding:6px 12px"><small class="sub" style="margin:0">Movimientos</small><div id="mv" style="font:900 1.6rem Figtree,sans-serif">${C.movs}</div></div>
      <div id="obj" style="flex:1;text-align:center;background:rgba(255,255,255,.08);border-radius:12px;padding:6px"></div></div>
      <div class="prog" style="margin:8px 0"><i id="pb" style="width:0%"></i></div>
      <canvas id="cv" width="${W}" height="${W}" style="display:block;margin:0 auto;border-radius:16px;touch-action:none"></canvas>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:8px"><button class="btn alt" id="mart" style="width:auto;margin:0;padding:6px 12px">🔨 Martillo · 30 🪙</button><button class="btn alt" id="mez" style="width:auto;margin:0;padding:6px 12px">🔀 Mezclar · 20 🪙</button></div></div>`);
    const cv = $('#cv'), x = cv.getContext('2d');
    let perdio = false, g = [], hielo = [...C.hielo], movs = C.movs, pts = 0, ocupado = false, vivo = true, raf, sel = null, martillo = false, parts = [], textos = [], rec = { ...(C.recoger || {}) }, uid = 0;
    const nueva = () => ({ t: Math.floor(Math.random() * C.colores), s: null, oy: 0, ox: 0, sc: 1, id: ++uid });
    const at = (r, c) => r >= 0 && r < N && c >= 0 && c < N ? g[r * N + c] : null;
    // tablero inicial sin combinaciones hechas
    for (let i = 0; i < N * N; i++) { let c2; do { c2 = nueva(); } while ((i % N >= 2 && g[i - 1].t === c2.t && g[i - 2].t === c2.t) || (i >= 2 * N && g[i - N].t === c2.t && g[i - 2 * N].t === c2.t)); c2.oy = -W - (N - Math.floor(i / N)) * S * .3; g.push(c2); }
    const objetivo = () => {
      if (C.tipo === 'puntos') return `<small class="sub" style="margin:0">Objetivo</small><div><b>${pts}</b> / ${C.meta} puntos</div>`;
      if (C.tipo === 'recoger') return `<small class="sub" style="margin:0">Recoge</small><div style="display:flex;gap:12px;justify-content:center">${Object.entries(rec).map(([k, v]) => `<span style="display:inline-flex;align-items:center;gap:4px"><i style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${COL[k][0]}"></i><b>${Math.max(0, v)}</b>${v <= 0 ? '✅' : ''}</span>`).join('')}</div>`;
      const q = hielo.filter(Boolean).length; return `<small class="sub" style="margin:0">Rompe el hielo</small><div>🧊 <b>${q}</b> ${q ? 'restantes' : '✅'}</div>`;
    };
    const cumplido = () => C.tipo === 'puntos' ? pts >= C.meta : C.tipo === 'recoger' ? Object.values(rec).every(v => v <= 0) : !hielo.some(Boolean);
    const hud = () => { $('#mv').textContent = movs; $('#obj').innerHTML = objetivo(); $('#pb').style.width = Math.min(100, pts * 100 / C.e3) + '%'; $('#mon').textContent = PERFIL.datos.monedas; };
    hud();
    // ---- dibujo ----
    const forma = (ci, cx, cy, r, s) => {
      const [c1, c2] = COL[ci], gr = x.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r * 1.1); gr.addColorStop(0, c2); gr.addColorStop(.35, c1); gr.addColorStop(1, 'rgba(0,0,0,.55)');
      x.fillStyle = gr; x.beginPath();
      if (ci === 0) { x.moveTo(cx, cy + r * .85); x.bezierCurveTo(cx - r * 1.3, cy - r * .1, cx - r * .5, cy - r * 1.1, cx, cy - r * .35); x.bezierCurveTo(cx + r * .5, cy - r * 1.1, cx + r * 1.3, cy - r * .1, cx, cy + r * .85); }
      else if (ci === 1) x.roundRect(cx - r * .8, cy - r * .8, r * 1.6, r * 1.6, r * .4);
      else if (ci === 2) { x.moveTo(cx, cy - r); x.lineTo(cx + r * .85, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r * .85, cy); }
      else if (ci === 3) { x.moveTo(cx, cy - r * .95); x.lineTo(cx + r * .95, cy + r * .75); x.lineTo(cx - r * .95, cy + r * .75); }
      else if (ci === 4) { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; x.lineTo(cx + Math.cos(a) * r * .92, cy + Math.sin(a) * r * .92); } }
      else { for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } }
      x.closePath(); x.fill(); x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(cx - r * .25, cy - r * .35, r * .28, r * .14, -.5, 0, 7); x.fill();
      if (s === 'h' || s === 'v') { x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 3; for (const d of [-.3, 0, .3]) { x.beginPath(); if (s === 'h') { x.moveTo(cx - r * .7, cy + d * r); x.lineTo(cx + r * .7, cy + d * r); } else { x.moveTo(cx + d * r, cy - r * .7); x.lineTo(cx + d * r, cy + r * .7); } x.stroke(); } x.lineWidth = 1; }
      if (s === 'b') { x.strokeStyle = '#fff'; x.lineWidth = 3; x.shadowColor = '#fff'; x.shadowBlur = 14; x.beginPath(); x.arc(cx, cy, r * .95, 0, 7); x.stroke(); x.shadowBlur = 0; x.lineWidth = 1; }
    };
    const arcoiris = (cx, cy, r) => { const gr = x.createConicGradient ? x.createConicGradient(Date.now() / 400, cx, cy) : null; if (gr) { COL.forEach((c, k) => gr.addColorStop(k / 6, c[0])); gr.addColorStop(1, COL[0][0]); x.fillStyle = gr; } else x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, r * .9, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.arc(cx - r * .25, cy - r * .3, r * .2, 0, 7); x.fill(); };
    const dibujar = () => {
      const bg = x.createLinearGradient(0, 0, 0, W); bg.addColorStop(0, '#2a1f6e'); bg.addColorStop(1, '#16113d'); x.fillStyle = bg; x.fillRect(0, 0, W, W);
      for (let i = 0; i < N * N; i++) { const r = Math.floor(i / N), c = i % N; x.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.09)'; x.fillRect(c * S, r * S, S, S);
        if (hielo[i]) { x.fillStyle = hielo[i] > 1 ? 'rgba(170,220,255,.75)' : 'rgba(170,220,255,.45)'; x.beginPath(); x.roundRect(c * S + 2, r * S + 2, S - 4, S - 4, 8); x.fill(); x.strokeStyle = 'rgba(255,255,255,.6)'; x.stroke(); } }
      if (sel !== null) { x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeRect((sel % N) * S + 2, Math.floor(sel / N) * S + 2, S - 4, S - 4); x.lineWidth = 1; }
      for (let i = 0; i < N * N; i++) { const p = g[i]; if (!p || p.sc <= 0) continue; const cx = (i % N) * S + S / 2 + p.ox, cy = Math.floor(i / N) * S + S / 2 + p.oy; x.save(); x.translate(cx, cy); x.scale(p.sc, p.sc); if (p.s === 'c') arcoiris(0, 0, S * .42); else forma(p.t, 0, 0, S * .4, p.s); x.restore(); }
      parts = parts.filter(q => q.v-- > 0); for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += .25; x.globalAlpha = q.v / 30; x.fillStyle = q.c; x.beginPath(); x.arc(q.x, q.y, q.r, 0, 7); x.fill(); } x.globalAlpha = 1;
      textos = textos.filter(q => q.v-- > 0); for (const q of textos) { q.y -= .8; x.globalAlpha = Math.min(1, q.v / 20); x.fillStyle = '#fff'; x.font = `900 ${q.tam}px Figtree,sans-serif`; x.textAlign = 'center'; x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 4; x.strokeText(q.txt, q.x, q.y); x.fillText(q.txt, q.x, q.y); x.lineWidth = 1; } x.globalAlpha = 1;
    };
    const bucle = () => { if (!vivo) return; for (const p of g) if (p) { if (p.oy < 0) p.oy = Math.min(0, p.oy + Math.max(4, -p.oy * .18)); } dibujar(); raf = requestAnimationFrame(bucle); };
    bucle();
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const anima = (ms, f) => new Promise(r => { const t0 = performance.now(); const k = () => { const p = Math.min(1, (performance.now() - t0) / ms); f(p); if (p < 1) requestAnimationFrame(k); else r(); }; k(); });
    const quietos = () => new Promise(r => { const k = () => g.every(p => !p || p.oy >= 0) ? r() : requestAnimationFrame(k); k(); });
    // ---- lógica ----
    function buscar() {
      const grupos = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N;) { const t0 = at(r, c)?.t; let k = c; while (k < N && at(r, k) && at(r, k).s !== 'c' && at(r, k).t === t0) k++; if (k - c >= 3 && at(r, c).s !== 'c') grupos.push({ dir: 'h', celdas: [...Array(k - c).keys()].map(j => r * N + c + j) }); c = Math.max(k, c + 1); }
      for (let c = 0; c < N; c++) for (let r = 0; r < N;) { const t0 = at(r, c)?.t; let k = r; while (k < N && at(k, c) && at(k, c).s !== 'c' && at(k, c).t === t0) k++; if (k - r >= 3 && at(r, c).s !== 'c') grupos.push({ dir: 'v', celdas: [...Array(k - r).keys()].map(j => (r + j) * N + c) }); r = Math.max(k, r + 1); }
      return grupos;
    }
    const hayMovida = () => { for (let i = 0; i < N * N; i++) for (const j of [i + 1, i + N]) { if ((j === i + 1 && i % N === N - 1) || j >= N * N) continue; if (g[i].s === 'c' || g[j].s === 'c') return true; [g[i], g[j]] = [g[j], g[i]]; const ok = buscar().length > 0; [g[i], g[j]] = [g[j], g[i]]; if (ok) return true; } return false; };
    function expandir(set) {
      const cola = [...set];
      while (cola.length) { const i = cola.pop(), p = g[i]; if (!p || !p.s) continue; const r = Math.floor(i / N), c = i % N, add = [];
        if (p.s === 'h') for (let k = 0; k < N; k++) add.push(r * N + k);
        if (p.s === 'v') for (let k = 0; k < N; k++) add.push(k * N + c);
        if (p.s === 'b') for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (at(r + dr, c + dc)) add.push((r + dr) * N + c + dc);
        if (p.s === 'c') { const cuenta = {}; g.forEach(q => q && (cuenta[q.t] = (cuenta[q.t] || 0) + 1)); const tc = +Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0][0]; g.forEach((q, k) => { if (q && q.t === tc) add.push(k); }); }
        p.s = p.s + '*'; for (const k of add) if (!set.has(k)) { set.add(k); cola.push(k); } }
    }
    async function limpiar(set, combo, nuevos = {}) {
      expandir(set);
      let n = 0; for (const i of set) { const p = g[i]; if (!p) continue; n++; if (C.tipo === 'recoger' && rec[p.t] !== undefined) rec[p.t]--; if (hielo[i]) { hielo[i]--; pts += 40; }
        const cx = (i % N) * S + S / 2, cy = Math.floor(i / N) * S + S / 2; for (let q = 0; q < 5; q++) parts.push({ x: cx, y: cy, vx: (Math.random() - .5) * 6, vy: (Math.random() - .7) * 6, v: 30, r: 3 + Math.random() * 3, c: COL[p.t][0] }); }
      const ganado = n * 60 * combo; pts += ganado; FX.son(combo > 1 ? 'ganar' : 'punto'); FX.vibrar(combo > 1 ? 25 : 10);
      const ii = [...set][0]; textos.push({ x: (ii % N) * S + S / 2, y: Math.floor(ii / N) * S + S / 2, txt: '+' + ganado, tam: 18 + combo * 3, v: 40 });
      if (combo >= 3) textos.push({ x: W / 2, y: W / 2, txt: combo >= 5 ? '¡INCREÍBLE!' : combo >= 4 ? '¡GENIAL!' : '¡BIEN!', tam: 38, v: 50 });
      await anima(170, p => { for (const i of set) if (g[i]) g[i].sc = 1 - p; });
      for (const i of set) g[i] = null;
      for (const [i, s] of Object.entries(nuevos)) { g[i] = { ...s, oy: 0, ox: 0, sc: 1, id: ++uid }; }
      // gravedad
      for (let c = 0; c < N; c++) { let vacio = 0; for (let r = N - 1; r >= 0; r--) { const i = r * N + c; if (!g[i]) vacio++; else if (vacio) { const p = g[i]; g[(r + vacio) * N + c] = p; g[i] = null; p.oy -= vacio * S; } }
        for (let r = 0; r < vacio; r++) { const p = nueva(); p.oy = -(vacio - r) * S - S * .5; g[r * N + c] = p; } }
      hud(); await quietos();
    }
    async function cascada(origen) {
      let combo = 1;
      for (;;) {
        const grupos = buscar(); if (!grupos.length) break;
        const set = new Set(), nuevos = {};
        // especiales: 5 en línea → arcoíris; L/T → bomba; 4 → rayo
        const por = {}; grupos.forEach((gr, k) => gr.celdas.forEach(i => (por[i] = por[i] || []).push(k)));
        const usados = new Set();
        grupos.forEach((gr, k) => {
          gr.celdas.forEach(i => set.add(i));
          if (usados.has(k)) return;
          const cruce = gr.celdas.find(i => por[i].length > 1);
          const piv = gr.celdas.find(i => origen?.includes(i)) ?? cruce ?? gr.celdas[Math.floor(gr.celdas.length / 2)];
          let s = null;
          if (gr.celdas.length >= 5) s = 'c'; else if (cruce !== undefined) { s = 'b'; por[cruce].forEach(kk => usados.add(kk)); } else if (gr.celdas.length === 4) s = gr.dir === 'h' ? 'v' : 'h';
          if (s && !nuevos[piv]) nuevos[piv] = { t: g[piv].t, s };
        });
        for (const i of Object.keys(nuevos)) if (g[i]?.s && !String(g[i].s).endsWith('*')) delete nuevos[i]; // no pisar un especial que va a explotar
        await limpiar(set, combo, nuevos); combo++; origen = null;
      }
      if (!hayMovida()) { textos.push({ x: W / 2, y: W / 2, txt: '🔀 Mezclando…', tam: 26, v: 50 }); await espera(500); mezclar(); }
    }
    function mezclar() { let k = 0; do { const tipos = g.map(p => p.t).sort(() => Math.random() - .5); g.forEach((p, i) => { if (!p.s) p.t = tipos[i]; }); k++; } while ((buscar().length || !hayMovida()) && k < 50); }
    async function intercambiar(a, b) {
      if (ocupado || !vivo) return; ocupado = true; sel = null;
      const pa = g[a], pb = g[b], dx = ((b % N) - (a % N)) * S, dy = (Math.floor(b / N) - Math.floor(a / N)) * S;
      FX.son('swish');
      await anima(130, p => { pa.ox = dx * p; pa.oy = dy * p; pb.ox = -dx * p; pb.oy = -dy * p; });
      g[a] = pb; g[b] = pa; pa.ox = pa.oy = pb.ox = pb.oy = 0;
      // arcoíris: limpia todo un color (o el tablero si son dos)
      if (pa.s === 'c' || pb.s === 'c') { movs--; const otro = pa.s === 'c' ? pb : pa, set = new Set(); if (otro.s === 'c') g.forEach((q, i) => set.add(i)); else g.forEach((q, i) => { if (q.t === otro.t || q === pa || q === pb) set.add(i); }); (pa.s === 'c' ? pa : pb).s = 'c*'; await limpiar(set, 2); await cascada(); }
      else if (!buscar().length) { FX.son('error'); await anima(130, p => { pa.ox = -dx * (1 - p); pa.oy = -dy * (1 - p); pb.ox = dx * (1 - p); pb.oy = dy * (1 - p); }); g[a] = pa; g[b] = pb; pa.ox = pa.oy = pb.ox = pb.oy = 0; }
      else { movs--; hud(); await cascada([a, b]); }
      ocupado = false; hud(); revisar();
    }
    function revisar() {
      if (cumplido()) return ganar();
      if (movs <= 0) return perder();
    }
    async function ganar() {
      vivo = false; ocupado = true;
      // movimientos sobrantes = bonus
      const bonus = movs * 80; pts += bonus;
      const e = pts >= C.e3 ? 3 : pts >= C.e2 ? 2 : 1; PERFIL.partida('joyas', pts); PERFIL.joyasNivel(n, e); FX.confeti();
      post('/api/arcade/puntaje', { juego: 'joyas', puntos: Math.min(100000, pts), nombre: LS.get('chatNom') || 'Jugador', avatar: LS.get('chatAv') || 'a01', uid: VID }).catch(() => {});
      cerrar(`<div style="font-size:3rem;letter-spacing:6px">${'⭐'.repeat(e)}<span style="opacity:.25">${'⭐'.repeat(3 - e)}</span></div><h2>¡Nivel ${n} superado!</h2><p class="sub">${pts.toLocaleString('es-PE')} puntos${bonus ? ` (incluye +${bonus} por ${movs} movimientos sobrantes)` : ''} · +${e * 5} 🪙</p>
        ${n < TOTAL ? `<button class="btn" id="sig">▶ Nivel ${n + 1}</button>` : '<p>🏆 ¡Completaste los 100 niveles!</p>'}<button class="btn alt" id="map">🗺️ Ver el mapa</button><button class="btn alt" id="comp">📣 Compartir</button>`);
    }
    function perder() {
      ocupado = true; if (!perdio) { perdio = true; PERFIL.partida('joyas', pts); }
      cerrar(`<div style="font-size:3rem">😮</div><h2>¡Te quedaste sin movimientos!</h2><p class="sub">${objetivo().replace(/<[^>]+>/g, ' ')}</p><button class="btn" id="mas">➕5 movimientos · 40 🪙</button><button class="btn alt" id="rei">🔁 Reintentar</button><button class="btn alt" id="map">🗺️ Mapa</button>`);
    }
    function cerrar(html) {
      const d = document.createElement('div'); d.className = 'modal'; d.innerHTML = `<div class="card" style="text-align:center">${html}</div>`; document.body.append(d);
      d.onclick = async e => { const id = e.target.id; if (!id) return;
        if (id === 'sig') { d.remove(); nivel(t, n + 1); } if (id === 'map') { d.remove(); vivo = false; mapa(t); } if (id === 'rei') { d.remove(); nivel(t, n); }
        if (id === 'mas') { if (!PERFIL.gastar(40)) return toast('No tienes suficientes monedas 🪙: juega misiones y otros juegos para ganar más'); d.remove(); movs += 5; ocupado = false; hud(); }
        if (id === 'comp') { const url = `${location.origin}/r/${t.id}?src=joyas`; if (navigator.share) navigator.share({ title: 'Joyas', text: `💎 Voy en el nivel ${n + 1} de Joyas. ¿Me alcanzas?`, url }).catch(() => {}); else { navigator.clipboard?.writeText(url); toast('Enlace copiado'); } } };
    }
    // ---- entrada: arrastrar o tocar dos joyas ----
    let ini = null;
    const celda = e => { const p = (() => { const r = cv.getBoundingClientRect(), q = e.touches ? e.touches[0] || e.changedTouches[0] : e; return { x: (q.clientX - r.left) * W / r.width, y: (q.clientY - r.top) * W / r.height }; })(); return { i: Math.floor(p.y / S) * N + Math.floor(p.x / S), x: p.x, y: p.y }; };
    const down = e => { e.preventDefault(); if (ocupado) return; const c = celda(e); if (c.i < 0 || c.i >= N * N) return;
      if (martillo) { martillo = false; $('#mart').classList.add('alt'); ocupado = true; limpiar(new Set([c.i]), 1).then(cascada).then(() => { ocupado = false; revisar(); }); return; }
      ini = c; };
    const up = e => { if (!ini || ocupado) return; const c = celda(e), dx = c.x - ini.x, dy = c.y - ini.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > S * .35) { const r = Math.floor(ini.i / N), co = ini.i % N, j = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? (co < N - 1 ? ini.i + 1 : -1) : (co > 0 ? ini.i - 1 : -1)) : (dy > 0 ? (r < N - 1 ? ini.i + N : -1) : (r > 0 ? ini.i - N : -1)); if (j >= 0) intercambiar(ini.i, j); }
      else { if (sel !== null && [sel - 1, sel + 1, sel - N, sel + N].includes(ini.i) && (Math.floor(sel / N) === Math.floor(ini.i / N) || Math.abs(sel - ini.i) === N)) intercambiar(sel, ini.i); else { sel = ini.i; FX.son('click'); } }
      ini = null; };
    cv.addEventListener('mousedown', down); cv.addEventListener('touchstart', down, { passive: false }); window.addEventListener('mouseup', up); cv.addEventListener('touchend', up);
    $('#vm').onclick = () => { vivo = false; mapa(t); };
    $('#mart').onclick = () => { if (ocupado) return; if (martillo) { martillo = false; $('#mart').classList.add('alt'); return; } if (!PERFIL.gastar(30)) return toast('Necesitas 30 🪙'); martillo = true; $('#mart').classList.remove('alt'); hud(); toast('🔨 Toca la joya que quieres romper'); };
    $('#mez').onclick = () => { if (ocupado) return; if (!PERFIL.gastar(20)) return toast('Necesitas 20 🪙'); mezclar(); hud(); FX.son('swish'); };
    setParar(() => { vivo = false; cancelAnimationFrame(raf); window.removeEventListener('mouseup', up); document.querySelectorAll('.modal:not(#gate)').forEach(m => m.remove()); });
    window.__joyas = { g, intercambiar, buscar, hayMovida: () => hayMovida(), estado: () => ({ movs, pts, ocupado, vivo, cumplido: cumplido(), rec, hielo: hielo.filter(Boolean).length }) }; // para pruebas
  }
  JUEGOS.joyas = mapa;
})();
