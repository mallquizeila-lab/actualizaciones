/* 🧰 Herramientas de aula para docente — ProfeTok (gratis, sin dependencias).
   Expone window.HAULA = { temporizador, ruleta, grupos, dados, semaforo }.
   Todo del lado del navegador; la lista de nombres se guarda en el propio equipo. */
(function () {
  'use strict';
  const el = (t, p = {}, h = '') => { const e = document.createElement(t); Object.assign(e, p); if (h) e.innerHTML = h; return e; };
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const rnd = n => Math.floor(Math.random() * n);
  const COLORES = ['#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#eab308'];

  // 📋 Trae los alumnos reales del docente (sus aulas de ProfeTok). Si hay varias aulas, deja elegir.
  async function misAlumnos(ctx) {
    if (!ctx || !ctx.api) { alert('Abre esta herramienta desde ProfeTok para usar tus alumnos.'); return null; }
    let d; try { d = await ctx.api('tic/alumnos'); } catch (e) { alert('No se pudo cargar tus alumnos.'); return null; }
    const aulas = (d.aulas || []).filter(a => a.alumnos && a.alumnos.length);
    if (!aulas.length) { alert('Todavía no tienes alumnos en tus aulas. Agrégalos en ProfeTok y vuelve.'); return null; }
    if (aulas.length === 1) return aulas[0].alumnos;
    return new Promise(res => {
      const w = el('div', { className: 'ha-ov', style: 'background:rgba(15,23,42,.9);z-index:4300' });
      w.appendChild(el('h2', {}, '📋 Elige el aula'));
      const row = el('div', { className: 'ha-row', style: 'max-width:600px' });
      aulas.forEach(a => { const b = el('button', { className: 'ha-btn', textContent: a.nombre + ' (' + a.alumnos.length + ')' }); b.onclick = () => { w.remove(); res(a.alumnos); }; row.appendChild(b); });
      const x = el('button', { className: 'ha-btn sec', textContent: 'Cancelar' }); x.onclick = () => { w.remove(); res(null); };
      w.appendChild(row); w.appendChild(x); document.body.appendChild(w);
    });
  }

  function estilos() {
    if (document.getElementById('haula-css')) return;
    document.head.appendChild(el('style', { id: 'haula-css' }, `
.ha-ov{position:fixed;inset:0;z-index:4200;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:20px;font-family:ui-sans-serif,system-ui,Arial}
.ha-ov h2{font-size:26px;margin:0;font-weight:600}
.ha-x{position:absolute;top:16px;right:18px;width:44px;height:44px;border:none;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:22px;cursor:pointer}
.ha-x:hover{background:rgba(255,255,255,.22)}
.ha-btn{border:none;border-radius:14px;padding:14px 22px;font-size:17px;font-weight:700;cursor:pointer;background:#0ea5e9;color:#fff;transition:.12s}
.ha-btn:hover{filter:brightness(1.08)}
.ha-btn.sec{background:rgba(255,255,255,.15)}
.ha-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.ha-chip{border:none;border-radius:11px;padding:10px 16px;font-size:15px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.15);color:#fff}
.ha-chip:hover{background:rgba(255,255,255,.28)}
.ha-time{font-size:min(26vw,220px);font-weight:800;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.ha-ta{width:min(90vw,420px);min-height:160px;border-radius:14px;border:none;padding:12px;font-size:16px;font-family:inherit;resize:vertical}
.ha-win{font-size:min(12vw,86px);font-weight:800}
.ha-grupos{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;width:min(94vw,900px);max-height:62vh;overflow:auto}
.ha-g{background:rgba(255,255,255,.1);border-radius:14px;padding:14px;text-align:left}
.ha-g h3{margin:0 0 8px;font-size:18px}
.ha-g div{padding:3px 0;font-size:16px}
.ha-dado{width:120px;height:120px;background:#fff;border-radius:20px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:6px;padding:16px;box-sizing:border-box}
.ha-pip{background:#0f172a;border-radius:50%;align-self:center;justify-self:center;width:20px;height:20px}
.ha-sem{width:min(60vw,260px);height:min(60vw,260px);border-radius:50%;transition:.2s;box-shadow:0 0 60px -10px currentColor}
.ha-small{opacity:.7;font-size:14px}
`));
  }

  function abrir(titulo, construir) {
    estilos();
    const ov = el('div', { className: 'ha-ov' });
    const x = el('button', { className: 'ha-x', textContent: '✕', title: 'Cerrar' });
    const cerrar = () => { try { ov._limpiar && ov._limpiar(); } catch (e) {} ov.remove(); };
    x.onclick = cerrar;
    ov.appendChild(x);
    ov.appendChild(el('h2', {}, titulo));
    const cont = el('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:18px;width:100%' });
    ov.appendChild(cont);
    document.body.appendChild(ov);
    construir(cont, ov, cerrar);
    return ov;
  }

  // ⏱️ Temporizador / cronómetro
  function temporizador() {
    abrir('⏱️ Temporizador', (c, ov) => {
      let total = 300, queda = 300, corriendo = false, modo = 'cuenta', t0 = 0, acc = 0, timer = null;
      const disp = el('div', { className: 'ha-time', textContent: '05:00' });
      const fmt = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
      const pintar = () => disp.textContent = fmt(modo === 'cuenta' ? queda : acc);
      const beep = () => { try { const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; o.start(); g.gain.setValueAtTime(.3, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + 1.2); o.stop(a.currentTime + 1.2); } catch (e) {} };
      const tick = () => { if (!corriendo) return; const ahora = performance.now(); if (modo === 'cuenta') { queda = total - (ahora - t0) / 1000; if (queda <= 0) { queda = 0; corriendo = false; pintar(); disp.style.color = '#ef4444'; beep(); return; } } else { acc = (ahora - t0) / 1000; } pintar(); timer = requestAnimationFrame(tick); };
      const presets = el('div', { className: 'ha-row' });
      for (const m of [1, 3, 5, 10, 15]) { const b = el('button', { className: 'ha-chip', textContent: m + ' min' }); b.onclick = () => { modo = 'cuenta'; total = queda = m * 60; corriendo = false; disp.style.color = '#fff'; pintar(); }; presets.appendChild(b); }
      const ctr = el('div', { className: 'ha-row' });
      const bPlay = el('button', { className: 'ha-btn', textContent: '▶ Iniciar' });
      bPlay.onclick = () => { if (corriendo) { corriendo = false; bPlay.textContent = '▶ Iniciar'; if (modo === 'cronometro') acc = (performance.now() - t0) / 1000; } else { corriendo = true; bPlay.textContent = '⏸ Pausar'; t0 = performance.now() - (modo === 'cuenta' ? (total - queda) * 1000 : acc * 1000); if (modo === 'cuenta') total = queda + (total - queda); tick(); } };
      const bReset = el('button', { className: 'ha-btn sec', textContent: '↺ Reiniciar' });
      bReset.onclick = () => { corriendo = false; bPlay.textContent = '▶ Iniciar'; disp.style.color = '#fff'; if (modo === 'cuenta') queda = total; else acc = 0; pintar(); };
      const bModo = el('button', { className: 'ha-btn sec', textContent: '⏱️ Cronómetro' });
      bModo.onclick = () => { corriendo = false; bPlay.textContent = '▶ Iniciar'; disp.style.color = '#fff'; if (modo === 'cuenta') { modo = 'cronometro'; acc = 0; bModo.textContent = '⏳ Cuenta regresiva'; } else { modo = 'cuenta'; queda = total; bModo.textContent = '⏱️ Cronómetro'; } pintar(); };
      ctr.appendChild(bPlay); ctr.appendChild(bReset); ctr.appendChild(bModo);
      c.appendChild(disp); c.appendChild(presets); c.appendChild(ctr);
      pintar();
      ov._limpiar = () => { corriendo = false; if (timer) cancelAnimationFrame(timer); };
    });
  }

  // 🎡 Ruleta de nombres
  function listaNombres() { return (LS.get('haula_nombres') || 'Ana\nLuis\nMaría\nJosé\nRosa\nPedro\nLucía\nCarlos').split(/\n+/).map(s => s.trim()).filter(Boolean); }
  function ruleta(ctx) {
    abrir('🎡 Ruleta de nombres', (c, ov) => {
      let nombres = listaNombres(), ang = 0, girando = false, raf = null;
      const cv = el('canvas', { width: 420, height: 420, style: 'max-width:min(80vw,420px)' });
      const g = cv.getContext('2d');
      const win = el('div', { className: 'ha-win', style: 'min-height:90px' });
      const dibujar = () => {
        g.clearRect(0, 0, 420, 420); const n = nombres.length || 1, R = 200, cx = 210, cy = 210;
        for (let i = 0; i < n; i++) { const a0 = ang + i / n * 2 * Math.PI, a1 = ang + (i + 1) / n * 2 * Math.PI; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath(); g.fillStyle = COLORES[i % COLORES.length]; g.fill(); g.save(); g.translate(cx, cy); g.rotate((a0 + a1) / 2); g.fillStyle = '#fff'; g.font = 'bold 18px Arial'; g.textAlign = 'right'; g.fillText(String(nombres[i] || '').slice(0, 12), R - 14, 6); g.restore(); }
        g.beginPath(); g.arc(cx, cy, 26, 0, 7); g.fillStyle = '#fff'; g.fill();
        g.beginPath(); g.moveTo(410, 210); g.lineTo(380, 196); g.lineTo(380, 224); g.closePath(); g.fillStyle = '#0f172a'; g.fill();
      };
      const girar = () => { if (girando || !nombres.length) return; girando = true; win.textContent = ''; const dur = 4200, v = 8 + Math.random() * 6, t0 = performance.now(); const paso = () => { const t = performance.now() - t0, k = Math.min(1, t / dur), e = 1 - Math.pow(1 - k, 3); ang = e * v * 2 * Math.PI; dibujar(); if (k < 1) raf = requestAnimationFrame(paso); else { girando = false; const n = nombres.length, norm = ((-ang) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); const idx = Math.floor(norm / (2 * Math.PI) * n) % n; win.textContent = '🎉 ' + nombres[idx]; } }; raf = requestAnimationFrame(paso); };
      const bGirar = el('button', { className: 'ha-btn', textContent: '🎡 Girar' }); bGirar.onclick = girar;
      cv.onclick = girar;
      const bEdit = el('button', { className: 'ha-btn sec', textContent: '✏️ Editar nombres' });
      bEdit.onclick = () => { const ta = el('textarea', { className: 'ha-ta', value: nombres.join('\n') }); const guardar = el('button', { className: 'ha-btn', textContent: '✅ Guardar' }); const box = el('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:center' }); box.appendChild(ta); box.appendChild(guardar); const old = c.innerHTML; c.innerHTML = ''; c.appendChild(box); guardar.onclick = () => { nombres = ta.value.split(/\n+/).map(s => s.trim()).filter(Boolean); LS.set('haula_nombres', nombres.join('\n')); c.innerHTML = ''; c.appendChild(cv); c.appendChild(win); c.appendChild(row); dibujar(); }; };
      const bAlum = el('button', { className: 'ha-btn sec', textContent: '📋 Mis alumnos' });
      bAlum.onclick = async () => { const n = await misAlumnos(ctx); if (n && n.length) { nombres = n; LS.set('haula_nombres', n.join('\n')); win.textContent = ''; dibujar(); } };
      const row = el('div', { className: 'ha-row' }); row.appendChild(bGirar); row.appendChild(bAlum); row.appendChild(bEdit);
      c.appendChild(cv); c.appendChild(win); c.appendChild(row); dibujar();
      ov._limpiar = () => { if (raf) cancelAnimationFrame(raf); };
    });
  }

  // 👥 Armador de grupos
  function grupos(ctx) {
    abrir('👥 Armar grupos', (c) => {
      let nombres = listaNombres(), nGrupos = 3;
      const cfg = el('div', { className: 'ha-row' });
      const info = el('div', { className: 'ha-small', textContent: nombres.length + ' nombres' });
      for (const n of [2, 3, 4, 5]) { const b = el('button', { className: 'ha-chip', textContent: n + ' grupos' }); b.onclick = () => { nGrupos = n; armar(); }; cfg.appendChild(b); }
      const bEdit = el('button', { className: 'ha-chip', textContent: '✏️ Nombres' });
      bEdit.onclick = () => { const ta = el('textarea', { className: 'ha-ta', value: nombres.join('\n') }); const gb = el('button', { className: 'ha-btn', textContent: '✅ Usar' }); cont.innerHTML = ''; cont.appendChild(ta); cont.appendChild(gb); gb.onclick = () => { nombres = ta.value.split(/\n+/).map(s => s.trim()).filter(Boolean); LS.set('haula_nombres', nombres.join('\n')); info.textContent = nombres.length + ' nombres'; armar(); }; };
      cfg.appendChild(bEdit);
      const bAlum = el('button', { className: 'ha-chip', textContent: '📋 Mis alumnos' });
      bAlum.onclick = async () => { const n = await misAlumnos(ctx); if (n && n.length) { nombres = n; LS.set('haula_nombres', n.join('\n')); info.textContent = nombres.length + ' nombres'; armar(); } };
      cfg.appendChild(bAlum);
      const cont = el('div', { className: 'ha-grupos' });
      const armar = () => { const pool = nombres.slice(); for (let i = pool.length - 1; i > 0; i--) { const j = rnd(i + 1);[pool[i], pool[j]] = [pool[j], pool[i]]; } const gs = Array.from({ length: nGrupos }, () => []); pool.forEach((n, i) => gs[i % nGrupos].push(n)); cont.innerHTML = ''; gs.forEach((g, i) => { const d = el('div', { className: 'ha-g' }); d.style.borderTop = '5px solid ' + COLORES[i % COLORES.length]; d.appendChild(el('h3', {}, 'Grupo ' + (i + 1))); g.forEach(n => d.appendChild(el('div', {}, '• ' + n))); cont.appendChild(d); }); };
      c.appendChild(info); c.appendChild(cfg); c.appendChild(cont); armar();
    });
  }

  // 🎲 Dado y moneda
  function dados() {
    abrir('🎲 Dado y moneda', (c) => {
      const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
      const caja = el('div', { className: 'ha-row' });
      const d1 = el('div', { className: 'ha-dado' }), d2 = el('div', { className: 'ha-dado' });
      const cara = v => { const e = v === 1 ? d1 : d2; e.innerHTML = ''; for (let i = 0; i < 9; i++) { const cell = el('div'); if (PIPS[e._v].includes(i)) cell.appendChild(el('div', { className: 'ha-pip' })); e.appendChild(cell); } };
      d1._v = 1; d2._v = 1; caja.appendChild(d1); caja.appendChild(d2); cara(1); cara(2);
      const res = el('div', { className: 'ha-win', style: 'min-height:90px;font-size:64px' });
      const tirar = (dos) => { let n = 0; const anim = setInterval(() => { d1._v = rnd(6) + 1; cara(1); if (dos) { d2._v = rnd(6) + 1; cara(2); } if (++n > 10) { clearInterval(anim); res.textContent = dos ? '= ' + (d1._v + d2._v) : d1._v; } }, 60); d2.style.display = dos ? '' : 'none'; };
      const moneda = () => { d1.style.display = d2.style.display = 'none'; let n = 0; const anim = setInterval(() => { res.textContent = rnd(2) ? '🪙 Cara' : '🪙 Sello'; if (++n > 10) clearInterval(anim); }, 70); };
      const row = el('div', { className: 'ha-row' });
      const b1 = el('button', { className: 'ha-btn', textContent: '🎲 1 dado' }); b1.onclick = () => { d1.style.display = ''; tirar(false); };
      const b2 = el('button', { className: 'ha-btn', textContent: '🎲🎲 2 dados' }); b2.onclick = () => { d1.style.display = ''; tirar(true); };
      const b3 = el('button', { className: 'ha-btn sec', textContent: '🪙 Moneda' }); b3.onclick = moneda;
      row.appendChild(b1); row.appendChild(b2); row.appendChild(b3);
      c.appendChild(caja); c.appendChild(res); c.appendChild(row);
    });
  }

  // 🔇 Semáforo del ruido (usa el micrófono)
  function semaforo() {
    abrir('🔇 Semáforo del ruido', (c, ov) => {
      const circ = el('div', { className: 'ha-sem', style: 'background:#22c55e;color:#22c55e' });
      const txt = el('div', { style: 'font-size:28px;font-weight:700' }, 'Toca «Activar micrófono»');
      const nivel = el('div', { className: 'ha-small' });
      const bOn = el('button', { className: 'ha-btn', textContent: '🎤 Activar micrófono' });
      let ac = null, raf = null, umbral = 0.08;
      const ctrl = el('div', { className: 'ha-row' });
      for (const [t, u] of [['Muy exigente', .05], ['Normal', .08], ['Permisivo', .14]]) { const b = el('button', { className: 'ha-chip', textContent: t }); b.onclick = () => { umbral = u; }; ctrl.appendChild(b); }
      bOn.onclick = async () => {
        try {
          const st = await navigator.mediaDevices.getUserMedia({ audio: true });
          ac = new (window.AudioContext || window.webkitAudioContext)(); const src = ac.createMediaStreamSource(st); const an = ac.createAnalyser(); an.fftSize = 512; src.connect(an); const buf = new Uint8Array(an.fftSize); bOn.style.display = 'none';
          const loop = () => { an.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; } const rms = Math.sqrt(s / buf.length); const col = rms < umbral ? '#22c55e' : rms < umbral * 2 ? '#f59e0b' : '#ef4444'; const et = rms < umbral ? '✅ Silencio' : rms < umbral * 2 ? '🟡 Bajemos la voz' : '🔴 ¡Mucho ruido!'; circ.style.background = col; circ.style.color = col; txt.textContent = et; nivel.textContent = 'Nivel: ' + Math.round(rms * 100); raf = requestAnimationFrame(loop); };
          loop();
        } catch (e) { txt.textContent = '⚠️ No se pudo usar el micrófono. Dale permiso o pruébalo en tu equipo.'; }
      };
      c.appendChild(circ); c.appendChild(txt); c.appendChild(nivel); c.appendChild(bOn); c.appendChild(ctrl);
      ov._limpiar = () => { if (raf) cancelAnimationFrame(raf); try { ac && ac.close(); } catch (e) {} };
    });
  }

  window.HAULA = { temporizador, ruleta, grupos, dados, semaforo };
})();
