// 🎮 Juegos arcade propios (géneros clásicos de dominio público): gusanito, ludo, billar, rompecabezas, memoria, buscaminas y 2048.
// Usa funciones de la página: stage, $, escH, toast, post, registrar, resultado, avImg, VID, LS, P.
(() => {
  const cuadro = () => Math.min(($('#stage')?.clientWidth || 360) - 30, 460);
  let parar = () => {}; // detiene el juego activo al salir
  const salir = () => { try { parar(); } catch (e) {} parar = () => {}; };
  window.ARC_SALIR = salir;

  // ---------- Efectos: sonido (sin archivos), vibración, confeti ----------
  let AC = null; const mute = () => LS.get('arcSonido') === '0';
  const FX = window.FX = {
    son(tipo) {
      if (mute()) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      const T = { punto: [660, .08, 'sine', 990], banda: [180, .04, 'triangle'], choque: [420, .03, 'square'], tronera: [220, .18, 'sine', 90], taco: [140, .06, 'triangle'], click: [880, .03, 'sine'], error: [160, .2, 'sawtooth', 90], ganar: [523, .5, 'sine', 1046], perder: [300, .4, 'triangle', 120], swish: [500, .1, 'sine', 1200] }[tipo] || [600, .05, 'sine'];
      const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime; o.type = T[2]; o.frequency.setValueAtTime(T[0], t0); if (T[3]) o.frequency.exponentialRampToValueAtTime(T[3], t0 + T[1]);
      g.gain.setValueAtTime(.08, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + T[1]); o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + T[1] + .02);
    },
    vibrar(ms) { try { if (!mute()) navigator.vibrate?.(ms); } catch (e) {} },
    confeti() {
      const c = document.createElement('canvas'); c.width = innerWidth; c.height = innerHeight; c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:70'; document.body.append(c);
      const x = c.getContext('2d'), P2 = [...Array(140)].map(() => ({ x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 4, c: `hsl(${Math.random() * 360},90%,60%)`, r: Math.random() * 6 + 3, a: Math.random() * 6 }));
      let n = 0; const f = () => { x.clearRect(0, 0, c.width, c.height); for (const p of P2) { p.x += p.vx; p.y += p.vy; p.vy += .35; p.a += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); x.restore(); } if (++n < 110) requestAnimationFrame(f); else c.remove(); }; f();
      FX.son('ganar'); FX.vibrar([30, 40, 60]);
    },
  };

  // ---------- Final común: puntaje, ranking del día y reto ----------
  async function fin(t, puntos, texto, extra = '') {
    salir();
    const nom = LS.get('chatNom') || 'Jugador', av = LS.get('chatAv') || 'a01';
    let d = { hoy: [] };
    try { d = await post('/api/arcade/puntaje', { juego: t.juego, puntos: Math.round(puntos), nombre: nom, avatar: av, uid: VID }); } catch (e) {}
    const reto = +P.get('reto'), vs = P.get('reto') !== null && P.get('g') === t.id ? (puntos > reto ? ` ¡Superaste a tu amigo (${reto})! 🏆` : ` Tu amigo hizo ${reto}: ¡revancha!`) : '';
    const tabla = (d.hoy || []).map((x, i) => `<div class="dato"><span style="display:flex;gap:6px;align-items:center">${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${avImg(x.avatar, 22)} ${escH(x.nombre)}</span><b>${x.puntos}</b></div>`).join('') || '<p class="sub">¡Sé el primero del día!</p>';
    resultado({ _listo: true, g: t.id, reto: Math.round(puntos), emoji: t.e, titulo: `${Math.round(puntos)} puntos`, sub: (texto || '') + vs,
      bloques: [['🏆 Récords de hoy', tabla + (d.puesto ? `<p class="sub" style="text-align:left;margin-top:6px">Quedaste en el puesto <b>#${d.puesto}</b> de hoy.</p>` : '') + extra + `<button class="btn" id="otra">🔁 Jugar otra vez</button>`]],
      compartir: `🎮 Hice ${Math.round(puntos)} puntos en ${t.t}. ¿Me superas?` });
    setTimeout(() => { const b = $('#otra'); if (b) b.onclick = () => JUEGOS[t.juego](t); }, 50);
  }
  const banner = t => P.get('reto') !== null && P.get('g') === t.id ? `<div class="reto">⚔️ Tu amigo hizo ${+P.get('reto')} puntos. ¿Lo superas?</div>` : '';
  const cab = (t, info) => `${banner(t)}<div class="card" style="padding:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>${t.e} ${escH(t.t)}</b><span style="display:flex;gap:8px;align-items:center"><span class="sub" id="info" style="margin:0">${info || ''}</span><button onclick="LS.set('arcSonido', LS.get('arcSonido') === '0' ? '1' : '0'); this.textContent = LS.get('arcSonido') === '0' ? '🔇' : '🔊'" style="background:none;border:0;font-size:1.1rem;cursor:pointer" aria-label="Sonido">${LS.get('arcSonido') === '0' ? '🔇' : '🔊'}</button></span></div>`;
  const swipe = (el, fn) => { let x0, y0; el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true }); el.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'i') : (dy > 0 ? 'b' : 'a')); x0 = null; }); };
  const teclas = fn => { const h = e => { const k = { ArrowUp: 'a', ArrowDown: 'b', ArrowLeft: 'i', ArrowRight: 'd', w: 'a', s: 'b', a: 'i', d: 'd' }[e.key]; if (k) { e.preventDefault(); fn(k); } }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); };
  const pad = `<div style="display:grid;grid-template-columns:repeat(3,56px);gap:6px;justify-content:center;margin-top:10px">${[['', ''], ['a', '⬆️'], ['', ''], ['i', '⬅️'], ['b', '⬇️'], ['d', '➡️']].map(([k, l]) => k ? `<button class="opt" data-dir="${k}" style="margin:0;text-align:center;padding:10px 0;font-size:1.2rem">${l}</button>` : '<span></span>').join('')}</div>`;

  const JUEGOS = {};

  // ---------- 🐍 Gusanito ----------
  JUEGOS.gusanito = t => {
    salir(); registrar(t.id);
    const N = 18, W = cuadro(), S = Math.floor(W / N);
    stage(cab(t, 'Puntos: 0') + `<canvas id="cv" width="${S * N}" height="${S * N}" style="display:block;margin:8px auto;border-radius:12px;background:#141a3a;touch-action:none"></canvas>${pad}<p class="sub" style="margin:6px 0 0">Desliza el dedo o usa las flechas.</p></div>`);
    const cv = $('#cv'), x = cv.getContext('2d');
    let gus = [[8, 9], [7, 9], [6, 9]], dir = [1, 0], sig = [1, 0], comida, pts = 0, vel = 150, vivo = true, chispas = [];
    const nuevaComida = () => { do { comida = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } while (gus.some(([a, b]) => a === comida[0] && b === comida[1])); };
    nuevaComida();
    const cambiar = k => { const d = { a: [0, -1], b: [0, 1], i: [-1, 0], d: [1, 0] }[k]; if (d && (d[0] !== -dir[0] || d[1] !== -dir[1])) sig = d; };
    const quitarT = teclas(cambiar); swipe(cv, cambiar);
    $('#stage').onclick = e => { const b = e.target.closest('[data-dir]'); if (b) cambiar(b.dataset.dir); };
    const dibujar = () => {
      const bg = x.createLinearGradient(0, 0, cv.width, cv.height); bg.addColorStop(0, '#0f1235'); bg.addColorStop(1, '#1d0f3a'); x.fillStyle = bg; x.fillRect(0, 0, cv.width, cv.height);
      x.strokeStyle = 'rgba(155,135,245,.08)'; for (let k2 = 0; k2 <= N; k2++) { x.beginPath(); x.moveTo(k2 * S, 0); x.lineTo(k2 * S, N * S); x.moveTo(0, k2 * S); x.lineTo(N * S, k2 * S); x.stroke(); }
      x.shadowColor = '#ff4d6d'; x.shadowBlur = 18; x.font = `${S}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🍎', comida[0] * S + S / 2, comida[1] * S + S / 2 + 1);
      x.shadowColor = '#39ff88'; x.shadowBlur = 14;
      gus.forEach(([a, b], i) => { x.fillStyle = i ? `hsl(${140 + i * 4},95%,${62 - Math.min(i, 25)}%)` : '#b6ffcf'; x.beginPath(); x.roundRect(a * S + 1, b * S + 1, S - 2, S - 2, S / 2.4); x.fill(); });
      x.shadowBlur = 0; chispas = chispas.filter(c2 => c2.v-- > 0); for (const c2 of chispas) { c2.x += c2.vx; c2.y += c2.vy; x.globalAlpha = c2.v / 20; x.fillStyle = '#ff6b81'; x.beginPath(); x.arc(c2.x, c2.y, 2.5, 0, 7); x.fill(); } x.globalAlpha = 1;
      const [ha, hb] = gus[0]; x.fillStyle = '#111'; x.beginPath(); x.arc(ha * S + S / 2 + dir[0] * S / 5 - dir[1] * S / 6, hb * S + S / 2 + dir[1] * S / 5 - dir[0] * S / 6, S / 9, 0, 7); x.arc(ha * S + S / 2 + dir[0] * S / 5 + dir[1] * S / 6, hb * S + S / 2 + dir[1] * S / 5 + dir[0] * S / 6, S / 9, 0, 7); x.fill();
    };
    let tm;
    const paso = () => {
      if (!vivo) return; dir = sig;
      const h = [gus[0][0] + dir[0], gus[0][1] + dir[1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || gus.some(([a, b]) => a === h[0] && b === h[1])) { vivo = false; FX.son('perder'); FX.vibrar(120); return fin(t, pts, `Comiste ${pts / 10} manzanas`); }
      gus.unshift(h);
      if (h[0] === comida[0] && h[1] === comida[1]) { pts += 10; FX.son('punto'); FX.vibrar(10); for (let q = 0; q < 12; q++) chispas.push({ x: comida[0] * S + S / 2, y: comida[1] * S + S / 2, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5, v: 20 }); $('#info').textContent = 'Puntos: ' + pts; nuevaComida(); vel = Math.max(70, vel - 4); } else gus.pop();
      dibujar(); tm = setTimeout(paso, vel);
    };
    dibujar(); tm = setTimeout(paso, 500);
    parar = () => { vivo = false; clearTimeout(tm); quitarT(); };
  };

  // ---------- 🧩 Rompecabezas deslizante ----------
  JUEGOS.rompecabezas = t => {
    salir(); registrar(t.id);
    const n = 3, imgs = ['general', 'trivia-peru', 'plato-peruano', 'viajero', 'juego-cuatro', 'lenguaje-amor', 'planetas'], img = `/og/${imgs[Math.floor(Math.random() * imgs.length)]}.png`;
    const W = cuadro(), T = Math.floor(W / n);
    let pz = [...Array(n * n).keys()], movs = 0, t0 = Date.now(), vacia = n * n - 1;
    const vecinos = i => [i - n, i + n, i % n ? i - 1 : -1, (i + 1) % n ? i + 1 : -1].filter(k => k >= 0 && k < n * n);
    for (let k = 0; k < 200; k++) { const v = vecinos(pz.indexOf(vacia)); const j = v[Math.floor(Math.random() * v.length)], a = pz.indexOf(vacia); [pz[a], pz[j]] = [pz[j], pz[a]]; }
    stage(cab(t, 'Movimientos: 0') + `<p class="sub" style="margin:4px 0">Ordena la imagen tocando las piezas junto al espacio vacío.</p>
      <div id="pz" style="position:relative;width:${T * n}px;height:${T * n}px;margin:6px auto;border-radius:12px;overflow:hidden;background:#141a3a"></div>
      <details><summary class="sub" style="text-align:center">Ver la imagen completa</summary><img src="${img}" style="width:100%;border-radius:10px;margin-top:6px"></details></div>`);
    // la imagen 1200x630 se recorta al centro para que quede cuadrada
    const pintar2 = () => { const off = (T * n * 1.905 - T * n) / 2; $('#pz').innerHTML = pz.map((v, i) => v === vacia ? '' : `<button data-i="${i}" aria-label="Pieza" style="position:absolute;left:${(i % n) * T}px;top:${Math.floor(i / n) * T}px;width:${T - 2}px;height:${T - 2}px;border:0;border-radius:8px;cursor:pointer;background-image:url(${img});background-size:${T * n * 1.905}px ${T * n}px;background-position:${-(off + (v % n) * T)}px ${-Math.floor(v / n) * T}px;transition:left .12s,top .12s"></button>`).join(''); };
    pintar2();
    $('#pz').onclick = e => {
      const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i, e0 = pz.indexOf(vacia);
      if (!vecinos(i).includes(e0)) return;
      [pz[i], pz[e0]] = [pz[e0], pz[i]]; movs++; FX.son('click'); $('#info').textContent = 'Movimientos: ' + movs; pintar2();
      if (pz.every((v, k) => v === k)) { FX.confeti(); const s = (Date.now() - t0) / 1000; fin(t, Math.max(50, 1000 - movs * 5 - s * 2), `Lo armaste en ${movs} movimientos y ${Math.round(s)} s`); }
    };
    parar = () => {};
  };

  // ---------- 🧠 Memoria ----------
  JUEGOS.memoria = t => {
    salir(); registrar(t.id);
    const av = [...Array(48).keys()].sort(() => Math.random() - 0.5).slice(0, 8).map(i => 'a' + String(i + 1).padStart(2, '0'));
    const cartas = [...av, ...av].sort(() => Math.random() - 0.5);
    let abiertas = [], hechas = new Set(), fallos = 0, t0 = Date.now(), bloq = false;
    stage(cab(t, 'Fallos: 0') + `<p class="sub" style="margin:4px 0">Encuentra las 8 parejas.</p><div id="mem" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">${cartas.map((c, i) => `<button data-i="${i}" style="aspect-ratio:1;border:0;border-radius:16px;background:linear-gradient(135deg,#ff4d8d,#7b2ff7);box-shadow:0 6px 16px rgba(123,47,247,.35);cursor:pointer;font-size:1.8rem;color:#fff;transition:transform .12s">✦</button>`).join('')}</div></div>`);
    $('#mem').onclick = e => {
      const b = e.target.closest('[data-i]'); if (!b || bloq) return; const i = +b.dataset.i;
      if (hechas.has(i) || abiertas.includes(i)) return;
      b.style.transform = 'rotateY(90deg)'; setTimeout(() => { b.innerHTML = `<img src="/avatares/${cartas[i]}.svg" style="width:86%">`; b.style.background = '#fff'; b.style.transform = 'rotateY(0)'; }, 120); FX.son('click'); abiertas.push(i);
      if (abiertas.length === 2) {
        const [a, c] = abiertas;
        if (cartas[a] === cartas[c]) { hechas.add(a); hechas.add(c); abiertas = []; FX.son('punto'); FX.vibrar(15); if (hechas.size === 16) FX.confeti(); if (hechas.size === 16) { const s = (Date.now() - t0) / 1000; setTimeout(() => fin(t, Math.max(50, 1000 - fallos * 25 - s * 3), `${fallos} fallos en ${Math.round(s)} s`), 500); } }
        else { fallos++; FX.son('error'); $('#info').textContent = 'Fallos: ' + fallos; bloq = true; setTimeout(() => { for (const k of [a, c]) { const x2 = document.querySelector(`#mem [data-i="${k}"]`); if (x2) { x2.textContent = '✦'; x2.style.background = 'linear-gradient(135deg,#ff4d8d,#7b2ff7)'; } } abiertas = []; bloq = false; }, 800); }
      }
    };
    parar = () => {};
  };

  // ---------- 💣 Buscaminas ----------
  JUEGOS.buscaminas = t => {
    salir(); registrar(t.id);
    const F = 9, C = 9, MINAS = 10; let minas = null, ab = new Set(), band = new Set(), modoBand = false, t0 = 0, vivo = true;
    stage(cab(t, `💣 ${MINAS}`) + `<p class="sub" style="margin:4px 0">Toca para abrir. Activa 🚩 para marcar minas.</p>
      <div id="bm" style="display:grid;grid-template-columns:repeat(${C},1fr);gap:3px;max-width:360px;margin:8px auto">${[...Array(F * C).keys()].map(i => `<button data-i="${i}" style="aspect-ratio:1;border:0;border-radius:8px;background:linear-gradient(135deg,#5b4bd6,#3a2d9a);box-shadow:inset 0 -3px 0 rgba(0,0,0,.25);color:#fff;font:800 1rem Figtree,sans-serif;cursor:pointer;padding:0"></button>`).join('')}</div>
      <button class="btn alt" id="flag">🚩 Marcar: NO</button></div>`);
    const vec = i => { const r = Math.floor(i / C), c = i % C, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const r2 = r + dr, c2 = c + dc; if (r2 >= 0 && r2 < F && c2 >= 0 && c2 < C) o.push(r2 * C + c2); } return o; };
    const cuenta = i => vec(i).filter(k => minas.has(k)).length, COL = ['', '#7cc4ff', '#7CFC8A', '#ff8a80', '#c39bff', '#ffcc66', '#66e0d0', '#fff', '#aaa'];
    const abrir = i => { if (ab.has(i) || band.has(i)) return; ab.add(i); const b = document.querySelector(`#bm [data-i="${i}"]`), n = cuenta(i); b.style.background = 'rgba(255,255,255,.06)'; b.textContent = n || ''; b.style.color = COL[n]; if (!n) vec(i).forEach(abrir); };
    $('#flag').onclick = () => { modoBand = !modoBand; $('#flag').textContent = '🚩 Marcar: ' + (modoBand ? 'SÍ' : 'NO'); $('#flag').classList.toggle('alt', !modoBand); };
    $('#bm').onclick = e => {
      const b = e.target.closest('[data-i]'); if (!b || !vivo) return; const i = +b.dataset.i;
      if (!minas) { const lib = [...Array(F * C).keys()].filter(k => k !== i && !vec(i).includes(k)).sort(() => Math.random() - 0.5); minas = new Set(lib.slice(0, MINAS)); t0 = Date.now(); }
      if (modoBand) { if (ab.has(i)) return; band.has(i) ? band.delete(i) : band.add(i); b.textContent = band.has(i) ? '🚩' : ''; $('#info').textContent = `💣 ${MINAS - band.size}`; return; }
      if (band.has(i)) return;
      if (minas.has(i)) { vivo = false; FX.son('perder'); FX.vibrar(200); minas.forEach(k => { const x2 = document.querySelector(`#bm [data-i="${k}"]`); x2.textContent = '💣'; x2.style.background = k === i ? '#ff5a5f' : '#5a2a4a'; }); return setTimeout(() => fin(t, Math.round(ab.size * 3), '¡Pisaste una mina!'), 1200); }
      abrir(i);
      if (ab.size === F * C - MINAS) { vivo = false; FX.confeti(); const s = (Date.now() - t0) / 1000; fin(t, Math.max(100, 1000 - s * 5), `¡Ganaste en ${Math.round(s)} s!`); }
    };
    parar = () => { vivo = false; };
  };

  // ---------- 🔢 2048 ----------
  JUEGOS.n2048 = t => {
    salir(); registrar(t.id);
    let g = Array(16).fill(0), pts = 0, vivo = true;
    const libre = () => { const l = g.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (l.length) g[l[Math.floor(Math.random() * l.length)]] = Math.random() < 0.9 ? 2 : 4; };
    libre(); libre();
    const COLS = { 2: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)', 4: 'linear-gradient(135deg,#84fab0,#8fd3f4)', 8: 'linear-gradient(135deg,#f6d365,#fda085)', 16: 'linear-gradient(135deg,#fda085,#f5576c)', 32: 'linear-gradient(135deg,#f093fb,#f5576c)', 64: 'linear-gradient(135deg,#ff0844,#ffb199)', 128: 'linear-gradient(135deg,#43e97b,#38f9d7)', 256: 'linear-gradient(135deg,#4facfe,#00f2fe)', 512: 'linear-gradient(135deg,#667eea,#764ba2)', 1024: 'linear-gradient(135deg,#f83600,#f9d423)', 2048: 'linear-gradient(135deg,#fa709a,#fee140)' };
    stage(cab(t, 'Puntos: 0') + `<p class="sub" style="margin:4px 0">Desliza para juntar números iguales. ¡Llega a 2048!</p><div id="g2" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#3d3580;padding:8px;border-radius:14px;max-width:360px;margin:8px auto;touch-action:none"></div>${pad}</div>`);
    const pintar = () => { $('#g2').innerHTML = g.map(v => `<div style="aspect-ratio:1;border-radius:10px;display:flex;align-items:center;justify-content:center;font:800 ${v >= 1024 ? 1.2 : v >= 128 ? 1.5 : 1.8}rem Figtree,sans-serif;background:${v ? COLS[v] || '#222' : 'rgba(255,255,255,.06)'};color:${v > 4 ? '#fff' : '#1d1a33'};box-shadow:${v ? '0 4px 14px rgba(0,0,0,.25)' : 'none'};text-shadow:${v > 4 ? '0 1px 2px rgba(0,0,0,.3)' : 'none'}">${v || ''}</div>`).join(''); $('#info').textContent = 'Puntos: ' + pts; };
    const mover = k => {
      if (!vivo) return;
      const lineas = [...Array(4).keys()].map(a => [...Array(4).keys()].map(b => k === 'i' ? a * 4 + b : k === 'd' ? a * 4 + 3 - b : k === 'a' ? b * 4 + a : (3 - b) * 4 + a));
      let cambio = false;
      for (const L of lineas) { const v = L.map(i => g[i]).filter(Boolean), out = []; for (let i = 0; i < v.length; i++) { if (v[i] === v[i + 1]) { out.push(v[i] * 2); pts += v[i] * 2; i++; } else out.push(v[i]); } while (out.length < 4) out.push(0); L.forEach((i, j) => { if (g[i] !== out[j]) cambio = true; g[i] = out[j]; }); }
      if (cambio) { libre(); pintar(); FX.son('swish'); }
      const puede = g.some(v => !v) || g.some((v, i) => (i % 4 < 3 && v === g[i + 1]) || (i < 12 && v === g[i + 4]));
      if (!puede) { vivo = false; setTimeout(() => fin(t, pts, `Ficha más alta: ${Math.max(...g)}`), 600); }
    };
    const quitarT = teclas(mover); swipe($('#g2'), mover);
    $('#stage').onclick = e => { const b = e.target.closest('[data-dir]'); if (b) mover(b.dataset.dir); };
    pintar(); parar = () => { vivo = false; quitarT(); };
  };

  // ---------- 🎱 Billar (troneras abiertas de verdad) ----------
  JUEGOS.billar = t => {
    salir(); registrar(t.id);
    const W = cuadro(), H = Math.round(W * 0.56), R = W / 38, M = R * 1.4, BOLS = 6;
    stage(cab(t, 'Tiros: 0') + `<p class="sub" style="margin:4px 0">Arrastra desde la bola blanca hacia atrás para apuntar y dar fuerza; suelta para tirar.</p><canvas id="cv" width="${W}" height="${H}" style="display:block;margin:8px auto;border-radius:16px;touch-action:none;box-shadow:0 10px 30px rgba(0,0,0,.5)"></canvas><p class="sub" id="msg" style="margin:4px 0;min-height:1.2em"></p></div>`);
    const cv = $('#cv'), x = cv.getContext('2d');
    // troneras sobre la línea de las bandas: 4 esquinas y 2 al centro de las bandas largas
    const huecos = [[M, M], [W / 2, M - R * .35], [W - M, M], [M, H - M], [W / 2, H - M + R * .35], [W - M, H - M]], BOCA = R * 1.75;
    const COL = ['#ffd23f', '#3a86ff', '#ff3b3b', '#8338ec', '#ff8500', '#06d6a0', '#a4161a', '#111'];
    let bolas = [{ x: W * .25, y: H / 2, vx: 0, vy: 0, c: '#fff', blanca: 1, n: 0 }], tiros = 0, apunta = null, vivo = true, raf, chispas = [];
    let k = 0; for (let fila = 0; fila < 3 && k < BOLS; fila++) for (let j2 = 0; j2 <= fila && k < BOLS; j2++) bolas.push({ x: W * .66 + fila * R * 1.8, y: H / 2 + (j2 - fila / 2) * R * 2.05, vx: 0, vy: 0, c: COL[k], n: ++k });
    const quietas = () => bolas.every(b => Math.hypot(b.vx, b.vy) < 0.03);
    const enBoca = b => huecos.some(([hx, hy]) => Math.hypot(b.x - hx, b.y - hy) < BOCA * 1.25);
    const fisica = () => {
      for (const b of bolas) {
        b.x += b.vx; b.y += b.vy; b.vx *= 0.988; b.vy *= 0.988; if (Math.hypot(b.vx, b.vy) < 0.03) { b.vx = 0; b.vy = 0; }
        if (!enBoca(b)) { // las bandas rebotan, menos frente a una tronera
          if (b.x < M + R && b.vx < 0) { b.x = M + R; b.vx *= -0.82; FX.son('banda'); } if (b.x > W - M - R && b.vx > 0) { b.x = W - M - R; b.vx *= -0.82; FX.son('banda'); }
          if (b.y < M + R && b.vy < 0) { b.y = M + R; b.vy *= -0.82; FX.son('banda'); } if (b.y > H - M - R && b.vy > 0) { b.y = H - M - R; b.vy *= -0.82; FX.son('banda'); }
        }
      }
      for (let i = 0; i < bolas.length; i++) for (let j2 = i + 1; j2 < bolas.length; j2++) {
        const a = bolas[i], b = bolas[j2], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 2 * R && d > 0) { const nx = dx / d, ny = dy / d, sol = (2 * R - d) / 2; a.x -= nx * sol; a.y -= ny * sol; b.x += nx * sol; b.y += ny * sol;
          const p = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (p > 0) { a.vx -= p * nx * .97; a.vy -= p * ny * .97; b.vx += p * nx * .97; b.vy += p * ny * .97; if (p > 1) FX.son('choque'); } }
      }
      for (const b of [...bolas]) {
        const h = huecos.find(([hx, hy]) => Math.hypot(b.x - hx, b.y - hy) < BOCA * .78);
        const fuera = b.x < M * .2 || b.x > W - M * .2 || b.y < M * .2 || b.y > H - M * .2;
        if (h || fuera) {
          FX.son('tronera'); FX.vibrar(30);
          for (let q = 0; q < 14; q++) chispas.push({ x: (h || [b.x, b.y])[0], y: (h || [b.x, b.y])[1], vx: (Math.random() - .5) * 4, vy: (Math.random() - .5) * 4, v: 30, c: b.c });
          if (b.blanca) { b.x = W * .25; b.y = H / 2; b.vx = b.vy = 0; tiros++; $('#msg').textContent = '⚠️ Metiste la blanca: +1 tiro de castigo'; }
          else { bolas = bolas.filter(z => z !== b); $('#msg').textContent = `✅ ¡Entró la ${b.n}! Quedan ${bolas.length - 1}`; }
        }
      }
    };
    const dibujar = () => {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6b3e1e'); g.addColorStop(1, '#3b200c'); x.fillStyle = g; x.beginPath(); x.roundRect(0, 0, W, H, 16); x.fill();
      const f = x.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * .6); f.addColorStop(0, '#13a05a'); f.addColorStop(1, '#0a6436'); x.fillStyle = f; x.fillRect(M * .55, M * .55, W - M * 1.1, H - M * 1.1);
      x.strokeStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.moveTo(W * .25, M); x.lineTo(W * .25, H - M); x.stroke();
      for (const [hx, hy] of huecos) { const hg = x.createRadialGradient(hx, hy, 2, hx, hy, BOCA); hg.addColorStop(0, '#000'); hg.addColorStop(.8, '#111'); hg.addColorStop(1, '#2a1a0d'); x.fillStyle = hg; x.beginPath(); x.arc(hx, hy, BOCA, 0, 7); x.fill(); }
      const bl = bolas.find(b => b.blanca);
      if (apunta && bl) { const dx = bl.x - apunta.x, dy = bl.y - apunta.y, d = Math.hypot(dx, dy) || 1, f2 = Math.min(d, W / 3) / (W / 3), ux = dx / d, uy = dy / d;
        x.strokeStyle = 'rgba(255,255,255,.7)'; x.setLineDash([5, 7]); x.lineWidth = 2; x.beginPath(); x.moveTo(bl.x, bl.y); x.lineTo(bl.x + ux * W * .7, bl.y + uy * W * .7); x.stroke(); x.setLineDash([]);
        const cg = x.createLinearGradient(bl.x - ux * R * 2, 0, bl.x - ux * W * .45, 0); x.strokeStyle = '#e9c48a'; x.lineWidth = R * .45; x.lineCap = 'round'; x.beginPath(); x.moveTo(bl.x - ux * (R * 1.6 + f2 * R * 3), bl.y - uy * (R * 1.6 + f2 * R * 3)); x.lineTo(bl.x - ux * (R * 1.6 + W * .45), bl.y - uy * (R * 1.6 + W * .45)); x.stroke(); x.lineWidth = 1;
        x.fillStyle = `hsl(${120 - f2 * 120},90%,55%)`; x.fillRect(12, H - 14, (W - 24) * f2, 6); }
      for (const b of bolas) { const bg = x.createRadialGradient(b.x - R * .35, b.y - R * .4, R * .1, b.x, b.y, R); bg.addColorStop(0, '#fff'); bg.addColorStop(.25, b.c); bg.addColorStop(1, b.blanca ? '#cfcfcf' : 'rgba(0,0,0,.65)'); x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.arc(b.x + 2, b.y + 3, R, 0, 7); x.fill(); x.fillStyle = bg; x.beginPath(); x.arc(b.x, b.y, R, 0, 7); x.fill();
        if (b.n) { x.fillStyle = '#fff'; x.beginPath(); x.arc(b.x, b.y, R * .45, 0, 7); x.fill(); x.fillStyle = '#111'; x.font = `bold ${R * .7}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(b.n, b.x, b.y + 1); } }
      chispas = chispas.filter(c2 => c2.v-- > 0); for (const c2 of chispas) { c2.x += c2.vx; c2.y += c2.vy; x.globalAlpha = c2.v / 30; x.fillStyle = c2.c; x.beginPath(); x.arc(c2.x, c2.y, 3, 0, 7); x.fill(); } x.globalAlpha = 1;
    };
    const bucle = () => { if (!vivo) return; for (let s2 = 0; s2 < 3; s2++) fisica(); dibujar();
      if (bolas.length === 1 && quietas()) { vivo = false; FX.confeti(); return fin(t, Math.max(10, 160 - tiros * 10), `Metiste las ${BOLS} bolas en ${tiros} tiros`); }
      raf = requestAnimationFrame(bucle); };
    const pos = e => { const r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] || e.changedTouches[0] : e; return { x: (p.clientX - r.left) * W / r.width, y: (p.clientY - r.top) * H / r.height }; };
    const ini = e => { if (!quietas()) return; e.preventDefault(); apunta = pos(e); };
    const mov = e => { if (!apunta) return; e.preventDefault(); apunta = pos(e); };
    const sol = () => { if (!apunta) return; const bl = bolas.find(b => b.blanca), dx = bl.x - apunta.x, dy = bl.y - apunta.y, d = Math.hypot(dx, dy); apunta = null; if (d < R) return;
      const f = Math.min(d, W / 3) / (W / 3) * W / 30; bl.vx = dx / d * f / 3; bl.vy = dy / d * f / 3; tiros++; FX.son('taco'); FX.vibrar(15); $('#info').textContent = 'Tiros: ' + tiros; $('#msg').textContent = ''; };
    cv.addEventListener('mousedown', ini); window.addEventListener('mousemove', mov); window.addEventListener('mouseup', sol);
    cv.addEventListener('touchstart', ini, { passive: false }); cv.addEventListener('touchmove', mov, { passive: false }); cv.addEventListener('touchend', sol);
    bucle();
    parar = () => { vivo = false; cancelAnimationFrame(raf); window.removeEventListener('mousemove', mov); window.removeEventListener('mouseup', sol); };
  };

  // ---------- 🎲 Ludo rápido (tú + 3 rivales de la máquina, 2 fichas cada uno) ----------
  JUEGOS.ludo = t => {
    salir(); registrar(t.id);
    const CAM = [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]];
    const JUG = [{ n: 'Tú', c: '#e5383b', ini: 0, casa: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], base: [[2, 2], [2, 3]] },
      { n: 'Verde', c: '#2a9d4f', ini: 13, casa: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], base: [[2, 11], [2, 12]] },
      { n: 'Amarillo', c: '#f2b705', ini: 26, casa: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], base: [[12, 11], [12, 12]] },
      { n: 'Azul', c: '#2b6fd6', ini: 39, casa: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], base: [[12, 2], [12, 3]] }];
    const SEG = new Set([0, 8, 13, 21, 26, 34, 39, 47]), META = 56;
    let fichas = JUG.map(() => [-1, -1]), turno = 0, dado = 0, esperando = false, vivo = true, tm;
    const W = cuadro(), S = W / 15;
    stage(cab(t, '') + `<canvas id="cv" width="${W}" height="${W}" style="display:block;margin:8px auto;border-radius:12px;background:#fff;touch-action:none"></canvas>
      <div style="display:flex;gap:10px;align-items:center;justify-content:center"><button class="btn" id="tirar" style="width:auto;margin:0;padding:10px 22px">🎲 Tirar dado</button><span id="dado" style="font-size:2.2rem">🎲</span></div>
      <p class="estado" id="est">Tu turno: tira el dado</p><p class="sub" style="margin:0">Sacas una ficha con 6. Con 6 vuelves a tirar. Si caes sobre un rival, lo mandas a su casa (menos en las ⭐).</p></div>`);
    const cv = $('#cv'), x = cv.getContext('2d');
    const celda = (j, p) => p < 0 ? null : p <= 50 ? CAM[(JUG[j].ini + p) % 52] : p < META ? JUG[j].casa[p - 51] : [7, 7];
    const dibujar = (mov = []) => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, W);
      JUG.forEach((J, j) => { const [r, c] = [[0, 0], [0, 9], [9, 9], [9, 0]][j]; x.fillStyle = J.c; x.fillRect(c * S, r * S, 6 * S, 6 * S); x.fillStyle = '#fff'; x.fillRect((c + 1) * S, (r + 1) * S, 4 * S, 4 * S); });
      CAM.forEach(([r, c], i) => { x.fillStyle = [0, 13, 26, 39].includes(i) ? JUG[[0, 13, 26, 39].indexOf(i)].c + '99' : '#fff'; x.fillRect(c * S, r * S, S, S); x.strokeStyle = '#ccc'; x.strokeRect(c * S, r * S, S, S); if (SEG.has(i) && ![0, 13, 26, 39].includes(i)) { x.font = `${S * .7}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('⭐', c * S + S / 2, r * S + S / 2 + 1); } });
      JUG.forEach(J => J.casa.forEach(([r, c]) => { x.fillStyle = J.c + 'bb'; x.fillRect(c * S, r * S, S, S); x.strokeStyle = '#fff'; x.strokeRect(c * S, r * S, S, S); }));
      const m = 7.5 * S; [[JUG[1].c, [6, 6], [6, 9], [7.5, 7.5]], [JUG[2].c, [6, 9], [9, 9], [7.5, 7.5]], [JUG[3].c, [9, 9], [9, 6], [7.5, 7.5]], [JUG[0].c, [9, 6], [6, 6], [7.5, 7.5]]].forEach(([col, a, b, cc]) => { x.fillStyle = col; x.beginPath(); x.moveTo(a[1] * S, a[0] * S); x.lineTo(b[1] * S, b[0] * S); x.lineTo(cc[1] * S, cc[0] * S); x.fill(); });
      fichas.forEach((fs, j) => fs.forEach((p, k) => {
        const pos = p < 0 ? JUG[j].base[k] : celda(j, p); if (!pos) return; const [r, c] = pos, off = p === META ? (j - 1.5) * S * .35 : fs.filter((q, kk) => kk < k && q === p && p >= 0).length * S * .25;
        x.fillStyle = JUG[j].c; x.strokeStyle = mov.includes(k) && j === 0 ? '#111' : '#fff'; x.lineWidth = mov.includes(k) && j === 0 ? 4 : 2; x.beginPath(); x.arc(c * S + S / 2 + off, r * S + S / 2, S * .38, 0, 7); x.fill(); x.stroke(); x.lineWidth = 1;
      }));
    };
    const movibles = (j, d) => fichas[j].map((p, k) => (p < 0 ? (d === 6 ? k : -1) : p + d <= META && p < META ? k : -1)).filter(k => k >= 0);
    const absoluta = (j, p) => p >= 0 && p <= 50 ? (JUG[j].ini + p) % 52 : -1;
    function mover(j, k) {
      const p = fichas[j][k]; fichas[j][k] = p < 0 ? 0 : p + dado; const a = absoluta(j, fichas[j][k]); let comio = false;
      if (a >= 0 && !SEG.has(a)) fichas.forEach((fs, j2) => { if (j2 !== j) fs.forEach((q, k2) => { if (absoluta(j2, q) === a) { fs[k2] = -1; comio = true; } }); });
      if (comio) { FX.son('tronera'); FX.vibrar(60); } else FX.son('choque');
      dibujar();
      if (fichas[j].every(q => q === META)) { vivo = false; if (j === 0) FX.confeti(); else FX.son('perder'); return setTimeout(() => fin(t, j === 0 ? 100 + fichas.slice(1).flat().filter(q => q < 0).length * 10 : fichas[0].filter(q => q === META).length * 25, j === 0 ? '🎉 ¡Ganaste el Ludo!' : `Ganó ${JUG[j].n}`), 700); }
      $('#est').textContent = comio ? `💥 ${JUG[j].n} ${j ? 'comió' : 'comiste'} una ficha` : '';
      siguiente(dado === 6 || comio);
    }
    function siguiente(otra) {
      if (!vivo) return; if (!otra) turno = (turno + 1) % 4; dado = 0;
      if (turno === 0) { esperando = true; $('#tirar').disabled = false; $('#est').textContent += ($('#est').textContent ? ' · ' : '') + 'Tu turno: tira el dado'; return; }
      $('#tirar').disabled = true; tm = setTimeout(jugarBot, 800);
    }
    function tirar() { FX.son('click'); FX.vibrar(10); dado = 1 + Math.floor(Math.random() * 6); $('#dado').textContent = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dado]; }
    function jugarBot() {
      if (!vivo) return; tirar(); const j = turno, ops = movibles(j, dado);
      $('#est').textContent = `${JUG[j].n} sacó ${dado}`;
      if (!ops.length) return tm = setTimeout(() => siguiente(dado === 6), 700);
      const puntaje = k => { const p = fichas[j][k], n = p < 0 ? 0 : p + dado, a = absoluta(j, n); let s = n; if (n === META) s += 100; if (p < 0) s += 40; if (a >= 0 && fichas.some((fs, j2) => j2 !== j && fs.some(q => absoluta(j2, q) === a)) && !SEG.has(a)) s += 80; if (SEG.has(a)) s += 15; return s + Math.random() * 8; };
      const k = ops.sort((a, b) => puntaje(b) - puntaje(a))[0]; tm = setTimeout(() => mover(j, k), 600);
    }
    $('#tirar').onclick = () => {
      if (!esperando || turno !== 0) return; esperando = false; $('#tirar').disabled = true; tirar();
      const ops = movibles(0, dado);
      if (!ops.length) { $('#est').textContent = `Sacaste ${dado}: no puedes mover`; return tm = setTimeout(() => siguiente(dado === 6), 900); }
      if (ops.length === 1 || (fichas[0][0] === fichas[0][1])) return mover(0, ops[0]);
      $('#est').textContent = `Sacaste ${dado}: toca la ficha que quieres mover`; dibujar(ops);
      cv.onclick = e => { const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * W / r.width, my = (e.clientY - r.top) * W / r.height;
        const k = ops.find(k2 => { const p = fichas[0][k2], pos = p < 0 ? JUG[0].base[k2] : celda(0, p); return pos && Math.hypot(pos[1] * S + S / 2 - mx, pos[0] * S + S / 2 - my) < S * .7; });
        if (k !== undefined) { cv.onclick = null; mover(0, k); } };
    };
    dibujar(); esperando = true;
    parar = () => { vivo = false; clearTimeout(tm); };
  };

  // Para los juegos de arcade2.js
  window.ARC_API = { JUEGOS, cab, fin, swipe, teclas, pad, cuadro, salir, setParar: f => { parar = f; } };
  window.ARCADE = { jugar: t => (JUEGOS[t.juego] || (() => toast('Juego no disponible')))(t), salir };
})();
