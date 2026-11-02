// 🎮 Tanda 2 de juegos (géneros casuales populares, implementación propia):
// bloques 8x8, fusiona frutas, ordena colores, apila la torre, palabra del día, sudoku, rompe ladrillos, vuela, corredor y lanza flechas.
(() => {
  const A = window.ARC_API, { JUEGOS, cab, fin, swipe, cuadro, salir } = A, setParar = A.setParar;
  const grad = (x, w, h, a, b) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const posCanvas = (cv, e) => { const r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] || e.changedTouches[0] : e; return { x: (p.clientX - r.left) * cv.width / r.width, y: (p.clientY - r.top) * cv.height / r.height }; };
  const NEON = ['#ff4d6d', '#ffb703', '#06d6a0', '#3a86ff', '#8338ec', '#ff006e', '#00f5d4', '#fb5607'];

  // ---------- 🧱 Bloques 8x8 ----------
  JUEGOS.bloques = t => {
    salir(); registrar(t.id);
    const N = 8, FIG = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], [[0, 0], [1, 0], [2, 0], [1, 1]]];
    let g = Array(N * N).fill(null), mano = [], sel = null, pts = 0, combo = 0;
    const nueva = () => { mano = [0, 1, 2].map(() => ({ f: FIG[Math.floor(Math.random() * FIG.length)], c: NEON[Math.floor(Math.random() * NEON.length)] })); };
    const cabe = (f, r, c) => f.every(([dx, dy]) => r + dy < N && c + dx < N && !g[(r + dy) * N + c + dx]);
    const algunaCabe = () => mano.some(m => m && [...Array(N * N).keys()].some(i => cabe(m.f, Math.floor(i / N), i % N)));
    nueva();
    stage(cab(t, 'Puntos: 0') + `<p class="sub" style="margin:4px 0">Elige una pieza y toca dónde ponerla. Llena filas o columnas para borrarlas.</p>
      <div id="bq" style="display:grid;grid-template-columns:repeat(${N},1fr);gap:3px;background:rgba(255,255,255,.05);padding:6px;border-radius:14px;max-width:360px;margin:8px auto"></div>
      <div id="mano" style="display:flex;justify-content:space-around;align-items:center;gap:8px;min-height:90px"></div></div>`);
    const pintar = () => {
      $('#bq').innerHTML = g.map((c, i) => `<div data-i="${i}" style="aspect-ratio:1;border-radius:6px;cursor:pointer;background:${c || 'rgba(255,255,255,.07)'};box-shadow:${c ? `inset 0 -3px 0 rgba(0,0,0,.25),0 0 10px ${c}66` : 'none'}"></div>`).join('');
      $('#mano').innerHTML = mano.map((m, k) => m ? `<button data-k="${k}" style="background:${sel === k ? 'rgba(255,255,255,.15)' : 'none'};border:2px solid ${sel === k ? 'var(--gold)' : 'transparent'};border-radius:12px;padding:6px;cursor:pointer;display:grid;grid-template-columns:repeat(${Math.max(...m.f.map(p => p[0])) + 1},14px);gap:2px">${(() => { const w = Math.max(...m.f.map(p => p[0])) + 1, h = Math.max(...m.f.map(p => p[1])) + 1; let o = ''; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o += `<i style="display:block;width:14px;height:14px;border-radius:3px;background:${m.f.some(p => p[0] === x && p[1] === y) ? m.c : 'transparent'}"></i>`; return o; })()}</button>` : '<span style="width:40px"></span>').join('');
    };
    pintar();
    $('#stage').onclick = e => {
      const k = e.target.closest('[data-k]'); if (k) { sel = +k.dataset.k; FX.son('click'); return pintar(); }
      const c = e.target.closest('[data-i]'); if (!c || sel === null) return;
      const i = +c.dataset.i, r = Math.floor(i / N), co = i % N, m = mano[sel];
      if (!cabe(m.f, r, co)) { FX.son('error'); FX.vibrar(40); return; }
      m.f.forEach(([dx, dy]) => g[(r + dy) * N + co + dx] = m.c); pts += m.f.length; mano[sel] = null; sel = null; FX.son('choque');
      const filas = [...Array(N).keys()].filter(y => [...Array(N).keys()].every(x2 => g[y * N + x2])), cols = [...Array(N).keys()].filter(x2 => [...Array(N).keys()].every(y => g[y * N + x2]));
      const lin = filas.length + cols.length;
      if (lin) { combo++; filas.forEach(y => { for (let x2 = 0; x2 < N; x2++) g[y * N + x2] = null; }); cols.forEach(x2 => { for (let y = 0; y < N; y++) g[y * N + x2] = null; }); pts += lin * 10 * lin * combo; FX.son('punto'); FX.vibrar(30); } else combo = 0;
      if (mano.every(x2 => !x2)) nueva();
      $('#info').textContent = 'Puntos: ' + pts + (combo > 1 ? ` · combo x${combo}` : ''); pintar();
      if (!algunaCabe()) { FX.son('perder'); setTimeout(() => fin(t, pts, 'Ya no caben más piezas'), 600); }
    };
    setParar(() => {});
  };

  // ---------- 🍉 Fusiona frutas ----------
  JUEGOS.frutas = t => {
    salir(); registrar(t.id);
    const F = ['🍒', '🍓', '🍇', '🍊', '🍋', '🍎', '🍐', '🍑', '🍍', '🍈', '🍉'], W = cuadro(), H = Math.round(W * 1.25), TOPE = H * .18;
    const rad = n => W * (0.035 + n * 0.017);
    stage(cab(t, 'Puntos: 0') + `<p class="sub" style="margin:4px 0">Toca para soltar. Dos frutas iguales se fusionan en una más grande.</p><canvas id="cv" width="${W}" height="${H}" style="display:block;margin:6px auto;border-radius:18px;touch-action:none"></canvas><p class="sub" style="margin:0">Siguiente: <span id="sig" style="font-size:1.4rem"></span></p></div>`);
    const cv = $('#cv'), x = cv.getContext('2d');
    let bs = [], pts = 0, actual = Math.floor(Math.random() * 4), sig = Math.floor(Math.random() * 4), px = W / 2, espera = 0, vivo = true, raf, sobre = 0;
    const dibujar = () => {
      x.fillStyle = grad(x, 0, H, '#ffe8a3', '#ffb86b'); x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(220,60,60,.6)'; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(0, TOPE); x.lineTo(W, TOPE); x.stroke(); x.setLineDash([]);
      if (espera <= 0) { x.globalAlpha = .55; x.font = `${rad(actual) * 2}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(F[actual], px, TOPE * .5); x.globalAlpha = 1; x.strokeStyle = 'rgba(0,0,0,.15)'; x.beginPath(); x.moveTo(px, TOPE * .5); x.lineTo(px, H); x.stroke(); }
      for (const b of bs) { x.font = `${b.r * 2.1}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(F[b.n], b.x, b.y + b.r * .08); }
    };
    const fisica = () => {
      for (const b of bs) { b.vy += .35; b.x += b.vx; b.y += b.vy; b.vx *= .99;
        if (b.x < b.r) { b.x = b.r; b.vx *= -.4; } if (b.x > W - b.r) { b.x = W - b.r; b.vx *= -.4; } if (b.y > H - b.r) { b.y = H - b.r; b.vy *= -.25; b.vx *= .9; } }
      for (let it = 0; it < 3; it++) for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], b = bs[j]; if (!a || !b) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
        if (d < m && d > 0) {
          if (a.n === b.n && a.n < F.length - 1 && !a.f && !b.f) { a.f = b.f = 1; const n = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: 0, vy: -1, n: a.n + 1, r: rad(a.n + 1) }; bs = bs.filter(z => z !== a && z !== b); bs.push(n); pts += (a.n + 1) * 10; $('#info').textContent = 'Puntos: ' + pts; FX.son('punto'); FX.vibrar(20); continue; }
          const nx = dx / d, ny = dy / d, sol = (m - d) / 2; a.x -= nx * sol; a.y -= ny * sol; b.x += nx * sol; b.y += ny * sol;
          const p = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (p > 0) { a.vx -= p * nx * .5; a.vy -= p * ny * .5; b.vx += p * nx * .5; b.vy += p * ny * .5; }
        }
      }
      const alto = bs.some(b => b.y - b.r < TOPE && Math.abs(b.vy) < .5 && !b.nueva); sobre = alto ? sobre + 1 : 0;
      bs.forEach(b => { if (b.nueva && b.y > TOPE + b.r) b.nueva = 0; });
      if (sobre > 120) { vivo = false; FX.son('perder'); fin(t, pts, 'Las frutas pasaron la línea'); }
    };
    const bucle = () => { if (!vivo) return; fisica(); espera--; dibujar(); raf = requestAnimationFrame(bucle); };
    const mover = e => { px = Math.max(rad(actual), Math.min(W - rad(actual), posCanvas(cv, e).x)); };
    cv.addEventListener('mousemove', mover); cv.addEventListener('touchmove', e => { e.preventDefault(); mover(e); }, { passive: false });
    const soltar = e => { if (espera > 0 || !vivo) return; mover(e); bs.push({ x: px, y: TOPE * .5, vx: 0, vy: 0, n: actual, r: rad(actual), nueva: 1 }); actual = sig; sig = Math.floor(Math.random() * 5); $('#sig').textContent = F[sig]; espera = 30; FX.son('click'); };
    cv.addEventListener('click', soltar); $('#sig').textContent = F[sig];
    bucle(); setParar(() => { vivo = false; cancelAnimationFrame(raf); });
  };

  // ---------- 🧪 Ordena colores ----------
  JUEGOS.colores = t => {
    salir(); registrar(t.id);
    let nivel = 1, movs = 0, total = 0, t0 = Date.now();
    const COL = ['#ff4d6d', '#ffd60a', '#06d6a0', '#3a86ff', '#8338ec', '#fb5607', '#00f5d4', '#ff006e', '#a7c957'];
    const crear = () => { const n = Math.min(3 + nivel, 9), bolas = []; for (let c = 0; c < n; c++) for (let k = 0; k < 4; k++) bolas.push(c); bolas.sort(() => Math.random() - .5); const tubos = []; for (let i = 0; i < n; i++) tubos.push(bolas.slice(i * 4, i * 4 + 4)); tubos.push([], []); return tubos; };
    let tubos = crear(), sel = null;
    stage(cab(t, 'Nivel 1') + `<p class="sub" style="margin:4px 0">Toca un tubo y luego otro para pasar el color de arriba. Deja cada tubo de un solo color.</p><div id="tb" style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:12px 0"></div><button class="btn alt" id="rein">↺ Reiniciar nivel</button></div>`);
    let copia = JSON.stringify(tubos);
    const pintar = () => { $('#tb').innerHTML = tubos.map((tb, i) => `<button data-t="${i}" style="width:44px;height:170px;border-radius:0 0 22px 22px;border:3px solid ${sel === i ? 'var(--gold)' : 'rgba(255,255,255,.35)'};border-top:0;background:rgba(255,255,255,.06);display:flex;flex-direction:column-reverse;padding:4px;gap:3px;cursor:pointer;transform:translateY(${sel === i ? -10 : 0}px);transition:transform .15s">${tb.map(c => `<i style="display:block;width:100%;height:36px;border-radius:${'8px'};background:${COL[c]};box-shadow:inset 0 -4px 0 rgba(0,0,0,.2),0 0 8px ${COL[c]}88"></i>`).join('')}</button>`).join(''); };
    pintar();
    $('#rein').onclick = () => { tubos = JSON.parse(copia); sel = null; pintar(); };
    $('#tb').onclick = e => {
      const b = e.target.closest('[data-t]'); if (!b) return; const i = +b.dataset.t;
      if (sel === null) { if (tubos[i].length) { sel = i; FX.son('click'); } return pintar(); }
      if (sel === i) { sel = null; return pintar(); }
      const de = tubos[sel], a = tubos[i], c = de[de.length - 1];
      if (a.length < 4 && (!a.length || a[a.length - 1] === c)) { while (de.length && de[de.length - 1] === c && a.length < 4) a.push(de.pop()); movs++; FX.son('swish'); } else { FX.son('error'); FX.vibrar(30); }
      sel = null; pintar();
      if (tubos.every(tb => !tb.length || (tb.length === 4 && tb.every(c2 => c2 === tb[0])))) {
        FX.confeti(); total += Math.max(20, 120 - movs * 2); movs = 0; nivel++;
        if (nivel > 5) return setTimeout(() => fin(t, Math.min(2000, total + Math.max(0, 600 - (Date.now() - t0) / 1000)), '¡Completaste los 5 niveles!'), 900);
        setTimeout(() => { tubos = crear(); copia = JSON.stringify(tubos); $('#info').textContent = 'Nivel ' + nivel; pintar(); }, 900);
      }
    };
    setParar(() => {});
  };

  // ---------- 🏗️ Apila la torre ----------
  JUEGOS.torre = t => {
    salir(); registrar(t.id);
    const W = cuadro(), H = Math.round(W * 1.3), BH = H / 16;
    stage(cab(t, 'Altura: 0') + `<p class="sub" style="margin:4px 0">Toca para soltar el bloque. Lo que sobresale se corta. ¡Hazla altísima!</p><canvas id="cv" width="${W}" height="${H}" style="display:block;margin:6px auto;border-radius:18px;touch-action:none"></canvas></div>`);
    const cv = $('#cv'), x = cv.getContext('2d');
    let pila = [{ x: W * .2, w: W * .6 }], mov = { x: 0, w: W * .6, d: 1 }, vel = W / 160, vivo = true, raf, caida = [], cam = 0;
    const color = i => `hsl(${(i * 14) % 360},85%,60%)`;
    const dibujar = () => {
      x.fillStyle = grad(x, 0, H, `hsl(${(pila.length * 8) % 360},60%,22%)`, '#0d0b26'); x.fillRect(0, 0, W, H);
      const base = H - BH * 2 + cam;
      pila.forEach((b, i) => { x.fillStyle = color(i); x.fillRect(b.x, base - i * BH, b.w, BH - 2); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(b.x, base - i * BH, b.w, 4); });
      if (vivo) { x.fillStyle = color(pila.length); x.fillRect(mov.x, base - pila.length * BH, mov.w, BH - 2); }
      caida = caida.filter(c => (c.y += c.v += .6) < H + 50); for (const c of caida) { x.fillStyle = c.c; x.fillRect(c.x, c.y + cam, c.w, BH - 2); }
    };
    const bucle = () => { if (!vivo) { dibujar(); return; } mov.x += vel * mov.d; if (mov.x < 0 || mov.x + mov.w > W) mov.d *= -1; const obj = Math.max(0, pila.length - 9) * BH; cam += (obj - cam) * .1; dibujar(); raf = requestAnimationFrame(bucle); };
    const soltar = () => {
      if (!vivo) return; const ult = pila[pila.length - 1], ini = Math.max(ult.x, mov.x), fin2 = Math.min(ult.x + ult.w, mov.x + mov.w), w = fin2 - ini;
      if (w <= 0) { vivo = false; FX.son('perder'); FX.vibrar(150); caida.push({ x: mov.x, y: H - BH * 2 - pila.length * BH, w: mov.w, v: 0, c: color(pila.length) }); return setTimeout(() => fin(t, pila.length - 1, `Torre de ${pila.length - 1} pisos`), 900); }
      const perfecto = Math.abs(w - ult.w) < 3;
      if (!perfecto) caida.push({ x: mov.x < ult.x ? mov.x : fin2, y: H - BH * 2 - pila.length * BH, w: mov.w - w, v: 0, c: color(pila.length) });
      pila.push({ x: perfecto ? ult.x : ini, w: perfecto ? ult.w : w }); FX.son(perfecto ? 'punto' : 'choque'); FX.vibrar(perfecto ? 25 : 10);
      mov = { x: mov.d > 0 ? 0 : W - pila[pila.length - 1].w, w: pila[pila.length - 1].w, d: mov.d }; vel = Math.min(W / 50, vel * 1.04);
      $('#info').textContent = 'Altura: ' + (pila.length - 1) + (perfecto ? ' · ¡Perfecto!' : '');
    };
    cv.addEventListener('mousedown', soltar); cv.addEventListener('touchstart', e => { e.preventDefault(); soltar(); }, { passive: false });
    const k = e => { if (e.code === 'Space') { e.preventDefault(); soltar(); } }; document.addEventListener('keydown', k);
    bucle(); setParar(() => { vivo = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', k); });
  };

  // ---------- 🔤 Palabra del día ----------
  const PAL5 = ['AMIGO', 'PLAYA', 'FUEGO', 'NIEVE', 'LIMON', 'PERRO', 'GATOS', 'MUNDO', 'CIELO', 'RISAS', 'SUEÑO', 'PIANO', 'LLAMA', 'COCOS', 'MANGO', 'PLATO', 'CARNE', 'PAPAS', 'QUESO', 'LECHE', 'HUEVO', 'ARROZ', 'TORTA', 'DULCE', 'SALSA', 'VERDE', 'NEGRO', 'BLUSA', 'FALDA', 'BOTAS', 'GORRA', 'RELOJ', 'LIBRO', 'LAPIZ', 'PAPEL', 'CARTA', 'NOVIA', 'BESOS', 'BAILE', 'RITMO', 'CANTO', 'VERSO', 'POEMA', 'NOCHE', 'TARDE', 'LUNES', 'MARZO', 'ABRIL', 'JUNIO', 'JULIO', 'CAMPO', 'MONTE', 'VALLE', 'SELVA', 'ARENA', 'PIEDRA', 'NUBES', 'LLUVIA', 'TRUENO', 'VIENTO', 'TIGRE', 'CEBRA', 'PANDA', 'KOALA', 'MONOS', 'BURRO', 'VACAS', 'POLLO', 'PATOS', 'CISNE', 'GARZA', 'LORO', 'FRESA', 'MELON', 'PERAS', 'UVAS', 'BANCO', 'PLAZA', 'CALLE', 'AVION', 'BARCO', 'TRENES', 'MOTOS', 'CAMION', 'RADIO', 'VIDEO', 'FOTOS', 'GENTE', 'NIÑOS', 'PADRE', 'MADRE', 'PRIMO', 'TIOS', 'SALUD', 'FELIZ', 'TRAJE', 'JUEGO', 'GANAR', 'CORRE', 'SALTA', 'NADAR', 'COMER', 'BEBER', 'DORMIR', 'LEER', 'SOÑAR', 'BRAZO', 'MANOS', 'DEDOS', 'BOCAS', 'OJOS', 'LABIO', 'DIOSA', 'REINA', 'PRINCE', 'HEROE', 'MAGIA', 'BRUJA', 'HADAS', 'DUNAS', 'OASIS', 'TACOS', 'CHIFA', 'CAUSA', 'PISCO', 'CUSCO', 'LIMA', 'ANDES', 'INCAS', 'CONDOR'].filter(w => [...w].length === 5);
  JUEGOS.palabra = t => {
    salir(); registrar(t.id);
    const dia = Math.floor((Date.now() - 5 * 3600000) / 864e5), sol = PAL5[dia % PAL5.length], hoy = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
    const guard = (() => { try { return JSON.parse(LS.get('palabra:' + hoy) || '[]'); } catch (e) { return []; } })();
    let filas = guard, act = '';
    const TECL = ['QWERTYUIOP', 'ASDFGHJKLÑ', '⏎ZXCVBNM⌫'];
    stage(cab(t, 'Palabra de hoy') + `<p class="sub" style="margin:4px 0">Adivina la palabra de 5 letras en 6 intentos. 🟩 letra en su lugar · 🟨 está en otro lugar · ⬛ no está. ¡Una nueva cada día!</p><div id="tab" style="display:grid;gap:5px;max-width:300px;margin:10px auto"></div><div id="tec" style="display:grid;gap:5px;margin-top:8px"></div></div>`);
    const eval1 = w => { const r = Array(5).fill('n'), s2 = [...sol], usado = Array(5).fill(false); [...w].forEach((c, i) => { if (c === s2[i]) { r[i] = 'v'; usado[i] = true; } }); [...w].forEach((c, i) => { if (r[i] === 'v') return; const k = s2.findIndex((x2, j) => x2 === c && !usado[j]); if (k >= 0) { r[i] = 'a'; usado[k] = true; } }); return r; };
    const COL = { v: '#2fbf71', a: '#e9b824', n: '#3a3a52' };
    const pintar = () => {
      const est = {}; filas.forEach(w => eval1(w).forEach((r, i) => { const c = w[i]; if (est[c] !== 'v') est[c] = r === 'v' ? 'v' : est[c] === 'a' ? 'a' : r; }));
      $('#tab').innerHTML = [...Array(6).keys()].map(r => `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px">${[...Array(5).keys()].map(c => { const w = filas[r], ch = w ? w[c] : r === filas.length ? act[c] || '' : ''; const col = w ? COL[eval1(w)[c]] : 'transparent'; return `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font:800 1.6rem Figtree,sans-serif;border-radius:8px;border:2px solid ${w ? col : ch ? '#9b87f5' : 'rgba(255,255,255,.2)'};background:${col}">${ch}</div>`; }).join('')}</div>`).join('');
      $('#tec').innerHTML = TECL.map(f => `<div style="display:flex;gap:4px;justify-content:center">${[...f].map(k => `<button data-k="${k}" style="flex:${k === '⏎' || k === '⌫' ? 1.5 : 1};max-width:${k === '⏎' || k === '⌫' ? 52 : 34}px;height:46px;border:0;border-radius:8px;font:700 .95rem Figtree,sans-serif;cursor:pointer;color:#fff;background:${est[k] ? COL[est[k]] : 'rgba(255,255,255,.18)'}">${k}</button>`).join('')}</div>`).join('');
    };
    const terminar = () => { const ok = filas[filas.length - 1] === sol, n = filas.length; LS.set('palabra:' + hoy, JSON.stringify(filas)); if (ok) FX.confeti(); else FX.son('perder');
      const grid = filas.map(w => eval1(w).map(r => ({ v: '🟩', a: '🟨', n: '⬛' })[r]).join('')).join('\n');
      setTimeout(() => fin(t, ok ? (7 - n) * 100 : 0, ok ? `¡La adivinaste en ${n}/6!` : `La palabra era ${sol}`, `<pre style="text-align:center;font-size:1.3rem;line-height:1.2;margin:8px 0">${grid}</pre><p class="sub">Vuelve mañana por una palabra nueva.</p>`), 700); };
    const tecla = k => {
      if (filas.length >= 6 || filas[filas.length - 1] === sol) return;
      if (k === '⌫') act = act.slice(0, -1); else if (k === '⏎') { if ([...act].length < 5) { FX.son('error'); FX.vibrar(40); return toast('Faltan letras'); } filas.push(act); act = ''; LS.set('palabra:' + hoy, JSON.stringify(filas)); FX.son('click'); if (filas[filas.length - 1] === sol || filas.length === 6) { pintar(); return terminar(); } }
      else if ([...act].length < 5) act += k;
      pintar();
    };
    pintar();
    if (filas.length && (filas[filas.length - 1] === sol || filas.length === 6)) terminar();
    $('#tec').onclick = e => { const b = e.target.closest('[data-k]'); if (b) tecla(b.dataset.k); };
    const h = e => { if (e.key === 'Enter') tecla('⏎'); else if (e.key === 'Backspace') tecla('⌫'); else if (/^[a-zñ]$/i.test(e.key)) tecla(e.key.toUpperCase()); }; document.addEventListener('keydown', h);
    setParar(() => document.removeEventListener('keydown', h));
  };

  // ---------- 🔢 Sudoku ----------
  JUEGOS.sudoku = t => {
    salir(); registrar(t.id);
    const g = Array(81).fill(0), ok = (b, i, n) => { const r = Math.floor(i / 9), c = i % 9; for (let k = 0; k < 9; k++) if (b[r * 9 + k] === n || b[k * 9 + c] === n) return false; const br = r - r % 3, bc = c - c % 3; for (let a = 0; a < 3; a++) for (let d = 0; d < 3; d++) if (b[(br + a) * 9 + bc + d] === n) return false; return true; };
    const llenar = b => { const i = b.indexOf(0); if (i < 0) return true; for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - .5)) if (ok(b, i, n)) { b[i] = n; if (llenar(b)) return true; b[i] = 0; } return false; };
    llenar(g); const sol = [...g], fijo = [...g]; [...Array(81).keys()].sort(() => Math.random() - .5).slice(0, 42).forEach(i => fijo[i] = 0);
    let tab = [...fijo], sel = null, err = 0, t0 = Date.now();
    stage(cab(t, 'Errores: 0') + `<p class="sub" style="margin:4px 0">Completa con números del 1 al 9 sin repetir en fila, columna ni cuadro.</p><div id="sd" style="display:grid;grid-template-columns:repeat(9,1fr);max-width:360px;margin:8px auto;border:2px solid #9b87f5;border-radius:10px;overflow:hidden"></div><div id="np" style="display:grid;grid-template-columns:repeat(9,1fr);gap:4px;max-width:360px;margin:8px auto">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}" style="height:44px;border:0;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font:800 1.1rem Figtree,sans-serif;cursor:pointer">${n}</button>`).join('')}</div></div>`);
    const pintar = () => { $('#sd').innerHTML = tab.map((v, i) => { const r = Math.floor(i / 9), c = i % 9, misma = sel !== null && (Math.floor(sel / 9) === r || sel % 9 === c); return `<button data-i="${i}" style="aspect-ratio:1;border:0;border-right:${c % 3 === 2 && c < 8 ? '2px solid #9b87f5' : '1px solid rgba(255,255,255,.1)'};border-bottom:${r % 3 === 2 && r < 8 ? '2px solid #9b87f5' : '1px solid rgba(255,255,255,.1)'};background:${i === sel ? '#4b3bbf' : misma ? 'rgba(155,135,245,.15)' : 'transparent'};color:${fijo[i] ? '#fff' : '#ffd60a'};font:${fijo[i] ? 800 : 700} 1.05rem Figtree,sans-serif;cursor:pointer;padding:0">${v || ''}</button>`; }).join(''); };
    pintar();
    $('#stage').onclick = e => {
      const c = e.target.closest('[data-i]'); if (c) { const i = +c.dataset.i; if (!fijo[i]) { sel = i; FX.son('click'); pintar(); } return; }
      const n = e.target.closest('[data-n]'); if (!n || sel === null) return;
      const v = +n.dataset.n; if (v === sol[sel]) { tab[sel] = v; FX.son('punto'); sel = null; pintar(); if (tab.every((x2, i) => x2 === sol[i])) { FX.confeti(); const s = (Date.now() - t0) / 1000; setTimeout(() => fin(t, Math.max(100, 1000 - err * 50 - s), `Resuelto en ${Math.round(s / 60)} min con ${err} errores`), 600); } }
      else { err++; FX.son('error'); FX.vibrar(60); $('#info').textContent = 'Errores: ' + err; if (err >= 5) { setTimeout(() => fin(t, Math.round(tab.filter((x2, i) => x2 && !fijo[i]).length * 5), '5 errores: fin de la partida'), 300); } }
    };
    setParar(() => {});
  };

  // ---------- 🧱 Rompe ladrillos ----------
  JUEGOS.ladrillos = t => {
    salir(); registrar(t.id);
    const W = cuadro(), H = Math.round(W * 1.3), PW = W / 4.5, R = W / 60;
    stage(cab(t, 'Vidas: ❤️❤️❤️') + `<p class="sub" style="margin:4px 0">Mueve la barra con el dedo. Rompe todos los ladrillos.</p><canvas id="cv" width="${W}" height="${H}" style="display:block;margin:6px auto;border-radius:18px;touch-action:none"></canvas></div>`);
    const cv = $('#cv'), x = cv.getContext('2d');
    let px = W / 2 - PW / 2, b = { x: W / 2, y: H * .7, vx: W / 140, vy: -W / 110 }, vidas = 3, pts = 0, vivo = true, raf, lad = [], chis = [], nivel = 1;
    const armar = () => { lad = []; const C = 7, F = 4 + Math.min(nivel, 4), w = (W - 16) / C; for (let r = 0; r < F; r++) for (let c = 0; c < C; c++) lad.push({ x: 8 + c * w, y: 50 + r * 22, w: w - 4, h: 18, c: NEON[r % NEON.length], g: r < 2 && nivel > 1 ? 2 : 1 }); };
    armar();
    const dibujar = () => {
      x.fillStyle = grad(x, 0, H, '#120d2e', '#2a0f3d'); x.fillRect(0, 0, W, H);
      for (const l of lad) { x.shadowColor = l.c; x.shadowBlur = 10; x.fillStyle = l.c; x.beginPath(); x.roundRect(l.x, l.y, l.w, l.h, 5); x.fill(); if (l.g > 1) { x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(l.x + 3, l.y + 3, l.w - 6, 3); } }
      x.shadowColor = '#00f5d4'; x.shadowBlur = 16; x.fillStyle = '#00f5d4'; x.beginPath(); x.roundRect(px, H - 30, PW, 12, 6); x.fill();
      x.shadowColor = '#fff'; x.fillStyle = '#fff'; x.beginPath(); x.arc(b.x, b.y, R, 0, 7); x.fill(); x.shadowBlur = 0;
      chis = chis.filter(c => c.v-- > 0); for (const c of chis) { c.x += c.vx; c.y += c.vy; x.globalAlpha = c.v / 25; x.fillStyle = c.c; x.fillRect(c.x, c.y, 3, 3); } x.globalAlpha = 1;
    };
    const bucle = () => {
      if (!vivo) return; b.x += b.vx; b.y += b.vy;
      if (b.x < R || b.x > W - R) { b.vx *= -1; FX.son('banda'); } if (b.y < R) { b.vy *= -1; FX.son('banda'); }
      if (b.y > H - 30 - R && b.y < H - 18 && b.x > px && b.x < px + PW && b.vy > 0) { const off = (b.x - (px + PW / 2)) / (PW / 2), v = Math.hypot(b.vx, b.vy) * 1.01; b.vx = v * Math.sin(off * 1.05); b.vy = -v * Math.cos(off * 1.05); FX.son('choque'); }
      for (const l of lad) if (b.x > l.x - R && b.x < l.x + l.w + R && b.y > l.y - R && b.y < l.y + l.h + R) { b.vy *= -1; l.g--; if (!l.g) { lad = lad.filter(z => z !== l); pts += 10; for (let q = 0; q < 10; q++) chis.push({ x: l.x + l.w / 2, y: l.y + l.h / 2, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5, v: 25, c: l.c }); FX.son('punto'); FX.vibrar(8); } break; }
      if (!lad.length) { nivel++; FX.confeti(); armar(); b = { x: W / 2, y: H * .7, vx: W / 140 * (1 + nivel * .1), vy: -W / 110 * (1 + nivel * .1) }; }
      if (b.y > H + R) { vidas--; FX.son('perder'); FX.vibrar(150); if (!vidas) { vivo = false; return fin(t, pts, `Llegaste al nivel ${nivel}`); } b = { x: W / 2, y: H * .7, vx: W / 140, vy: -W / 110 }; }
      $('#info').textContent = `Vidas: ${'❤️'.repeat(vidas)} · ${pts}`; dibujar(); raf = requestAnimationFrame(bucle);
    };
    const mover = e => { px = Math.max(0, Math.min(W - PW, posCanvas(cv, e).x - PW / 2)); };
    cv.addEventListener('mousemove', mover); cv.addEventListener('touchmove', e => { e.preventDefault(); mover(e); }, { passive: false }); cv.addEventListener('touchstart', e => { e.preventDefault(); mover(e); }, { passive: false });
    bucle(); setParar(() => { vivo = false; cancelAnimationFrame(raf); });
  };

  // ---------- 🐤 Vuela ----------
  JUEGOS.vuela = t => {
    salir(); registrar(t.id);
    const W = cuadro(), H = Math.round(W * 1.35), HU = H * .3, AN = W * .17;
    stage(cab(t, 'Puntos: 0') + `<p class="sub" style="margin:4px 0">Toca para aletear y pasa entre los pilares.</p><canvas id="cv" width="${W}" height="${H}" style="display:block;margin:6px auto;border-radius:18px;touch-action:none"></canvas></div>`);
    const cv = $('#cv'), x = cv.getContext('2d');
    let y = H / 2, v = 0, pil = [], pts = 0, vivo = true, raf, f = 0, empezo = false;
    const dibujar = () => {
      x.fillStyle = grad(x, 0, H, '#4cc9f0', '#f8c8dc'); x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 4; k++) { const cx = ((k * 140 - f * .4) % (W + 140) + W + 140) % (W + 140) - 70; x.beginPath(); x.arc(cx, 60 + k * 40, 22, 0, 7); x.arc(cx + 22, 60 + k * 40, 28, 0, 7); x.arc(cx + 46, 60 + k * 40, 20, 0, 7); x.fill(); }
      for (const p of pil) { x.fillStyle = grad(x, p.x, 0, '#06d6a0', '#118ab2'); x.beginPath(); x.roundRect(p.x, -10, AN, p.y, 10); x.roundRect(p.x, p.y + HU, AN, H, 10); x.fill(); }
      x.fillStyle = '#7a4e2d'; x.fillRect(0, H - 18, W, 18);
      x.save(); x.translate(W * .28, y); x.rotate(Math.max(-.5, Math.min(1, v / 10))); x.font = `${W / 9}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.scale(-1, 1); x.fillText('🐤', 0, 0); x.restore();
      if (!empezo) { x.fillStyle = 'rgba(0,0,0,.45)'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('Toca para empezar', W / 2, H * .62); }
    };
    const bucle = () => {
      if (!vivo) return; f++;
      if (empezo) { v += .45; y += v; if (f % 95 === 0) pil.push({ x: W, y: H * .12 + Math.random() * (H * .5), ok: 0 }); pil.forEach(p => p.x -= W / 160); pil = pil.filter(p => p.x > -AN);
        for (const p of pil) { if (!p.ok && p.x + AN < W * .28) { p.ok = 1; pts++; FX.son('punto'); $('#info').textContent = 'Puntos: ' + pts; }
          if (W * .28 + W / 22 > p.x && W * .28 - W / 22 < p.x + AN && (y - W / 22 < p.y || y + W / 22 > p.y + HU)) return morir(); }
        if (y > H - 18 - W / 22 || y < 0) return morir(); }
      dibujar(); raf = requestAnimationFrame(bucle);
    };
    const morir = () => { vivo = false; FX.son('perder'); FX.vibrar(160); dibujar(); setTimeout(() => fin(t, pts, `Pasaste ${pts} pilares`), 600); };
    const aletear = e => { e?.preventDefault?.(); empezo = true; v = -7.5; FX.son('swish'); };
    cv.addEventListener('mousedown', aletear); cv.addEventListener('touchstart', aletear, { passive: false });
    const k = e => { if (e.code === 'Space' || e.key === 'ArrowUp') aletear(e); }; document.addEventListener('keydown', k);
    bucle(); setParar(() => { vivo = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', k); });
  };

  // ---------- 🏃 Corredor ----------
  JUEGOS.corredor = t => {
    salir(); registrar(t.id);
    const W = cuadro(), H = Math.round(W * .62), SU = H - 30, TAM = W / 11;
    stage(cab(t, '0 m') + `<p class="sub" style="margin:4px 0">Toca para saltar los obstáculos. Cada vez más rápido.</p><canvas id="cv" width="${W}" height="${H}" style="display:block;margin:6px auto;border-radius:18px;touch-action:none"></canvas></div>`);
    const cv = $('#cv'), x = cv.getContext('2d');
    let y = 0, v = 0, obs = [], d = 0, vel = W / 110, vivo = true, raf, f = 0, prox = 60;
    const dibujar = () => {
      x.fillStyle = grad(x, 0, H, '#ff9e6d', '#5b2a86'); x.fillRect(0, 0, W, H);
      x.fillStyle = '#ffd166'; x.beginPath(); x.arc(W * .8, H * .3, H * .12, 0, 7); x.fill();
      x.fillStyle = 'rgba(40,10,60,.5)'; for (let k = 0; k < 6; k++) { const mx = ((k * 120 - d * .3) % (W + 120) + W + 120) % (W + 120) - 60; x.beginPath(); x.moveTo(mx - 70, SU); x.lineTo(mx, SU - 70 - (k % 3) * 20); x.lineTo(mx + 70, SU); x.fill(); }
      x.fillStyle = '#2b1640'; x.fillRect(0, SU, W, H - SU);
      x.font = `${TAM}px serif`; x.textAlign = 'center'; x.textBaseline = 'bottom';
      for (const o of obs) x.fillText(o.e, o.x, o.alto ? SU - TAM * 1.2 : SU + 4);
      x.save(); x.translate(W * .18, SU - y + 4); x.scale(-1, 1); x.fillText(f % 16 < 8 || y > 0 ? '🏃' : '🏃‍♂️', 0, 0); x.restore();
    };
    const bucle = () => {
      if (!vivo) return; f++; d += vel; vel += .0015 * W / 100; if (y > 0 || v > 0) { y += v; v -= .9; if (y < 0) { y = 0; v = 0; } }
      if (--prox <= 0) { const alto = d > 1500 && Math.random() < .25; obs.push({ x: W + 20, e: alto ? '🦅' : ['🌵', '🪨', '🔥'][Math.floor(Math.random() * 3)], alto }); prox = 45 + Math.random() * 60; }
      obs.forEach(o => o.x -= vel); obs = obs.filter(o => o.x > -40);
      for (const o of obs) if (Math.abs(o.x - W * .18) < TAM * .55 && (o.alto ? y > TAM * .6 : y < TAM * .7)) { vivo = false; FX.son('perder'); FX.vibrar(160); dibujar(); return setTimeout(() => fin(t, Math.round(d / 10), `Corriste ${Math.round(d / 10)} metros`), 600); }
      if (f % 30 === 0) $('#info').textContent = Math.round(d / 10) + ' m';
      dibujar(); raf = requestAnimationFrame(bucle);
    };
    const saltar = e => { e?.preventDefault?.(); if (y === 0) { v = H / 26; FX.son('swish'); } };
    cv.addEventListener('mousedown', saltar); cv.addEventListener('touchstart', saltar, { passive: false });
    const k = e => { if (e.code === 'Space' || e.key === 'ArrowUp') saltar(e); }; document.addEventListener('keydown', k);
    bucle(); setParar(() => { vivo = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', k); });
  };

  // ---------- 🎯 Lanza flechas ----------
  JUEGOS.flechas = t => {
    salir(); registrar(t.id);
    const W = cuadro(), H = Math.round(W * 1.3), CX = W / 2, CY = H * .32, RAD = W * .2;
    stage(cab(t, 'Nivel 1') + `<p class="sub" style="margin:4px 0">Toca para lanzar. No le pegues a otra flecha.</p><canvas id="cv" width="${W}" height="${H}" style="display:block;margin:6px auto;border-radius:18px;touch-action:none"></canvas></div>`);
    const cv = $('#cv'), x = cv.getContext('2d');
    let nivel = 1, ang = 0, vel = .025, clav = [], quedan = 6, vuelo = null, pts = 0, vivo = true, raf;
    const armar = () => { clav = [...Array(Math.min(nivel - 1, 4)).keys()].map(k => k * 2 * Math.PI / Math.max(1, Math.min(nivel - 1, 4)) + Math.random()); quedan = 5 + nivel; vel = .02 + nivel * .006; };
    const dibujar = () => {
      x.fillStyle = grad(x, 0, H, '#1b1036', '#3b1460'); x.fillRect(0, 0, W, H);
      x.save(); x.translate(CX, CY); x.rotate(ang);
      for (const a of clav) { x.save(); x.rotate(a); x.fillStyle = '#e9e9f0'; x.fillRect(-2, RAD, 4, RAD * .9); x.fillStyle = '#ff4d6d'; x.beginPath(); x.moveTo(-8, RAD * 1.9); x.lineTo(8, RAD * 1.9); x.lineTo(0, RAD * 1.75); x.fill(); x.restore(); }
      const gg = x.createRadialGradient(0, 0, 4, 0, 0, RAD); gg.addColorStop(0, '#ffd166'); gg.addColorStop(.6, '#f77f00'); gg.addColorStop(1, '#9c4a00'); x.fillStyle = gg; x.beginPath(); x.arc(0, 0, RAD, 0, 7); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.25)'; for (let k = 1; k < 4; k++) { x.beginPath(); x.arc(0, 0, RAD * k / 4, 0, 7); x.stroke(); } x.restore();
      const fy = vuelo !== null ? vuelo : H * .82; x.fillStyle = '#e9e9f0'; x.fillRect(CX - 2, fy, 4, RAD * .9); x.fillStyle = '#ff4d6d'; x.beginPath(); x.moveTo(CX - 8, fy + RAD * .9); x.lineTo(CX + 8, fy + RAD * .9); x.lineTo(CX, fy + RAD * .75); x.fill();
      x.fillStyle = '#fff'; x.font = '16px sans-serif'; x.textAlign = 'left'; x.fillText('🏹 '.repeat(quedan), 12, H - 14);
    };
    const bucle = () => {
      if (!vivo) return; ang += vel * (nivel % 3 === 0 ? Math.sin(Date.now() / 600) * 1.6 : 1);
      if (vuelo !== null) { vuelo -= W / 14; if (vuelo <= CY + RAD) { vuelo = null; const a = (Math.PI / 2 - ang) % (2 * Math.PI);
        if (clav.some(c => Math.abs(Math.atan2(Math.sin(c - a), Math.cos(c - a))) < .16)) { vivo = false; FX.son('perder'); FX.vibrar(160); dibujar(); return setTimeout(() => fin(t, pts, `Llegaste al nivel ${nivel}`), 600); }
        clav.push(a); quedan--; pts += 5; FX.son('choque'); FX.vibrar(12);
        if (!quedan) { pts += 20 * nivel; nivel++; FX.confeti(); armar(); $('#info').textContent = 'Nivel ' + nivel; } } }
      dibujar(); raf = requestAnimationFrame(bucle);
    };
    const lanzar = e => { e?.preventDefault?.(); if (vuelo === null && vivo) { vuelo = H * .82; FX.son('swish'); } };
    cv.addEventListener('mousedown', lanzar); cv.addEventListener('touchstart', lanzar, { passive: false });
    const k = e => { if (e.code === 'Space') lanzar(e); }; document.addEventListener('keydown', k);
    armar(); bucle(); setParar(() => { vivo = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', k); });
  };
})();
