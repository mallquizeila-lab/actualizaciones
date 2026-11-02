// 🎮 Tanda 3 de juegos (propios, géneros clásicos): ahorcado con globos, sopa de letras, piedra-papel-tijera,
// reflejos, tuberías, penales, cálculo rápido, simón dice, atrapa al topo y "¿qué color es?".
(() => {
  const A = window.ARC_API, { JUEGOS, cab, fin, cuadro, salir } = A, setParar = A.setParar;
  const posCanvas = (cv, e) => { const r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] || e.changedTouches[0] : e; return { x: (p.clientX - r.left) * cv.width / r.width, y: (p.clientY - r.top) * cv.height / r.height }; };
  const btn = (txt, attrs = '', st = '') => `<button ${attrs} style="border:0;border-radius:12px;background:rgba(255,255,255,.12);color:#fff;font:700 1rem Figtree,sans-serif;cursor:pointer;${st}">${txt}</button>`;
  const PALABRAS = { 'Animales': ['ELEFANTE', 'JIRAFA', 'TORTUGA', 'PINGUINO', 'COCODRILO', 'MARIPOSA', 'CONDOR', 'VICUÑA', 'DELFIN', 'CANGURO'], 'Comida': ['CEVICHE', 'CHOCOLATE', 'ESPAGUETI', 'EMPANADA', 'HAMBURGUESA', 'PICARONES', 'MAZAMORRA', 'ANTICUCHO', 'GUACAMOLE', 'PALTA'], 'Países': ['ARGENTINA', 'COLOMBIA', 'VENEZUELA', 'URUGUAY', 'PARAGUAY', 'ECUADOR', 'BOLIVIA', 'MEXICO', 'GUATEMALA', 'HONDURAS'], 'Profesiones': ['ARQUITECTO', 'ENFERMERA', 'BOMBERO', 'PROFESOR', 'COCINERO', 'ASTRONAUTA', 'VETERINARIO', 'PERIODISTA', 'CARPINTERO', 'MUSICO'], 'Deportes': ['FUTBOL', 'NATACION', 'BALONCESTO', 'VOLEIBOL', 'CICLISMO', 'ATLETISMO', 'SURF', 'BOXEO', 'TENIS', 'KARATE'] };

  // ---------- 🎈 Ahorcado (versión globos) ----------
  JUEGOS.ahorcado = t => {
    salir(); registrar(t.id);
    let pts = 0, ronda = 0;
    const jugarRonda = () => {
      const cats = Object.keys(PALABRAS), cat = cats[Math.floor(Math.random() * cats.length)], pal = PALABRAS[cat][Math.floor(Math.random() * PALABRAS[cat].length)];
      let usadas = new Set(), globos = 6, cerrada = false;
      stage(cab(t, `Puntos: ${pts}`) + `<p class="sub" style="margin:4px 0">Categoría: <b>${cat}</b> · Cada error revienta un globo 🎈</p><div id="gl" style="font-size:2rem;text-align:center;min-height:44px;letter-spacing:4px"></div><div id="pl" style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:12px 0"></div><div id="tc" style="display:grid;grid-template-columns:repeat(9,1fr);gap:5px"></div></div>`);
      const pintar = () => {
        $('#gl').textContent = '🎈'.repeat(globos) + '💥'.repeat(6 - globos);
        $('#pl').innerHTML = [...pal].map(c => `<span style="width:30px;height:40px;border-bottom:3px solid #9b87f5;display:flex;align-items:center;justify-content:center;font:800 1.5rem Figtree,sans-serif">${usadas.has(c) ? c : ''}</span>`).join('');
        $('#tc').innerHTML = [...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'].map(c => btn(c, `data-l="${c}" ${usadas.has(c) ? 'disabled' : ''}`, `height:40px;opacity:${usadas.has(c) ? .3 : 1};background:${usadas.has(c) ? (pal.includes(c) ? '#2fbf71' : '#5a2a4a') : 'rgba(255,255,255,.14)'}`)).join('');
      };
      pintar();
      $('#tc').onclick = e => {
        const b = e.target.closest('[data-l]'); if (!b || cerrada || usadas.has(b.dataset.l)) return; const c = b.dataset.l; usadas.add(c);
        if (pal.includes(c)) FX.son('punto'); else { globos--; FX.son('error'); FX.vibrar(40); }
        pintar();
        if ([...pal].every(x => usadas.has(x))) { cerrada = true; pts += 50 + globos * 10; ronda++; FX.confeti(); setTimeout(jugarRonda, 900); }
        else if (!globos) { cerrada = true; FX.son('perder'); setTimeout(() => fin(t, pts, `Adivinaste ${ronda} palabras. La última era ${pal}`), 600); }
      };
    };
    jugarRonda(); setParar(() => {});
  };

  // ---------- 🔎 Sopa de letras ----------
  JUEGOS.sopa = t => {
    salir(); registrar(t.id);
    const N = 10, cats = Object.keys(PALABRAS), cat = cats[Math.floor(Math.random() * cats.length)];
    const pals = PALABRAS[cat].filter(p => p.length <= N).sort(() => Math.random() - .5).slice(0, 6);
    const g = Array(N * N).fill(''), DIR = [[1, 0], [0, 1], [1, 1], [-1, 1]], pos = {};
    for (const p of pals) for (let i = 0; i < 300; i++) { const [dx, dy] = DIR[Math.floor(Math.random() * DIR.length)], x0 = Math.floor(Math.random() * N), y0 = Math.floor(Math.random() * N), cs = [...p].map((c, k) => [x0 + dx * k, y0 + dy * k]);
      if (cs.every(([x, y], k) => x >= 0 && y >= 0 && x < N && y < N && (!g[y * N + x] || g[y * N + x] === p[k]))) { cs.forEach(([x, y], k) => g[y * N + x] = p[k]); pos[p] = cs.map(([x, y]) => y * N + x); break; } }
    const lista = pals.filter(p => pos[p]); g.forEach((c, i) => { if (!c) g[i] = 'ABCDEFGHIJLMNOPRSTUV'[Math.floor(Math.random() * 20)]; });
    let hall = new Set(), ini = null, marc = new Set(), t0 = Date.now();
    stage(cab(t, `0/${lista.length}`) + `<p class="sub" style="margin:4px 0">Categoría: <b>${cat}</b>. Toca la primera y la última letra de cada palabra.</p><div id="sp" style="display:grid;grid-template-columns:repeat(${N},1fr);gap:2px;max-width:360px;margin:8px auto"></div><div id="ls" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center"></div></div>`);
    const pintar = () => {
      $('#sp').innerHTML = g.map((c, i) => `<button data-i="${i}" style="aspect-ratio:1;border:0;border-radius:6px;padding:0;font:800 .95rem Figtree,sans-serif;cursor:pointer;color:#fff;background:${i === ini ? '#ffb703' : marc.has(i) ? 'linear-gradient(135deg,#06d6a0,#118ab2)' : 'rgba(255,255,255,.08)'}">${c}</button>`).join('');
      $('#ls').innerHTML = lista.map(p => `<span style="padding:4px 10px;border-radius:12px;background:${hall.has(p) ? '#2fbf71' : 'rgba(255,255,255,.12)'};${hall.has(p) ? 'text-decoration:line-through' : ''}">${p}</span>`).join('');
    };
    pintar();
    $('#sp').onclick = e => {
      const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i;
      if (ini === null) { ini = i; FX.son('click'); return pintar(); }
      const p = lista.find(p2 => !hall.has(p2) && ((pos[p2][0] === ini && pos[p2][pos[p2].length - 1] === i) || (pos[p2][0] === i && pos[p2][pos[p2].length - 1] === ini)));
      ini = null;
      if (p) { hall.add(p); pos[p].forEach(k => marc.add(k)); FX.son('punto'); FX.vibrar(20); $('#info').textContent = `${hall.size}/${lista.length}`; if (hall.size === lista.length) { FX.confeti(); const s = (Date.now() - t0) / 1000; setTimeout(() => fin(t, Math.max(100, 1000 - s * 4), `Encontraste todas en ${Math.round(s)} s`), 700); } }
      else FX.son('error');
      pintar();
    };
    setParar(() => {});
  };

  // ---------- ✊ Piedra, papel o tijera ----------
  JUEGOS.ppt = t => {
    salir(); registrar(t.id);
    const OP = [['piedra', '✊'], ['papel', '✋'], ['tijera', '✌️']], gana = (a, b) => (a - b + 3) % 3 === 1;
    let yo = 0, el = 0, hist = [];
    stage(cab(t, 'Al mejor de 5') + `<div style="display:flex;justify-content:space-around;align-items:center;margin:16px 0;font-size:4rem"><div id="mi" style="transition:transform .3s">❔</div><b style="font-size:1.4rem">VS</b><div id="su" style="transition:transform .3s">🤖</div></div><p class="estado" id="mar">Tú 0 · 0 Máquina</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${OP.map(([n, e], i) => btn(`<span style="font-size:2.4rem;display:block">${e}</span>${n}`, `data-o="${i}"`, 'padding:12px 0')).join('')}</div><p class="sub" id="msg" style="margin-top:10px"></p></div>`);
    $('#stage').onclick = e => {
      const b = e.target.closest('[data-o]'); if (!b || yo === 3 || el === 3) return; const a = +b.dataset.o;
      // la máquina mira tus jugadas anteriores (no es puro azar)
      const freq = [0, 0, 0]; hist.slice(-6).forEach(h => freq[h]++); const prob = freq.indexOf(Math.max(...freq)), m = Math.random() < .4 && hist.length > 2 ? (prob + 1) % 3 : Math.floor(Math.random() * 3);
      hist.push(a); $('#mi').textContent = OP[a][1]; $('#su').textContent = OP[m][1]; $('#mi').style.transform = $('#su').style.transform = 'scale(1.25)'; setTimeout(() => { $('#mi').style.transform = $('#su').style.transform = 'scale(1)'; }, 250);
      if (a === m) { $('#msg').textContent = 'Empate'; FX.son('click'); } else if (gana(a, m)) { yo++; $('#msg').textContent = `¡${OP[a][0]} le gana a ${OP[m][0]}!`; FX.son('punto'); } else { el++; $('#msg').textContent = `${OP[m][0]} le gana a ${OP[a][0]}`; FX.son('error'); }
      $('#mar').textContent = `Tú ${yo} · ${el} Máquina`;
      if (yo === 3 || el === 3) { if (yo === 3) FX.confeti(); else FX.son('perder'); setTimeout(() => fin(t, yo * 30 + (yo === 3 ? 60 - el * 10 : 0), yo === 3 ? '¡Le ganaste a la máquina!' : 'La máquina ganó esta vez'), 800); }
    };
    setParar(() => {});
  };

  // ---------- ⚡ Reflejos ----------
  JUEGOS.reflejos = t => {
    salir(); registrar(t.id);
    let tiempos = [], estado = 'listo', t0 = 0, tm;
    stage(cab(t, 'Ronda 1 de 5') + `<button id="zona" style="width:100%;height:320px;border:0;border-radius:20px;font:800 1.6rem Figtree,sans-serif;color:#fff;cursor:pointer;background:#3a86ff;margin-top:10px">Toca para empezar</button><p class="sub" id="msg" style="margin-top:10px">Cuando se ponga VERDE, toca lo más rápido que puedas.</p></div>`);
    const z = $('#zona');
    const preparar = () => { estado = 'espera'; z.style.background = '#e63946'; z.textContent = 'Espera el verde…'; tm = setTimeout(() => { estado = 'ya'; t0 = performance.now(); z.style.background = '#2fbf71'; z.textContent = '¡YA!'; FX.son('punto'); }, 1200 + Math.random() * 2500); };
    z.onpointerdown = () => {
      if (estado === 'listo') return preparar();
      if (estado === 'espera') { clearTimeout(tm); FX.son('error'); FX.vibrar(80); z.style.background = '#6c757d'; z.textContent = '¡Muy pronto! Toca para repetir'; estado = 'listo'; return; }
      if (estado === 'ya') { const ms = Math.round(performance.now() - t0); tiempos.push(ms); FX.vibrar(15); z.style.background = '#3a86ff'; z.textContent = `${ms} ms · toca para seguir`; estado = 'listo'; $('#info').textContent = `Ronda ${Math.min(tiempos.length + 1, 5)} de 5`;
        if (tiempos.length === 5) { const prom = Math.round(tiempos.reduce((a, b) => a + b) / 5); estado = 'fin'; setTimeout(() => fin(t, Math.max(0, 1000 - prom), `Tu promedio: ${prom} ms ${prom < 250 ? '⚡ ¡reflejos de piloto!' : prom < 350 ? '👍 muy bien' : '🐢 puedes mejorar'}`), 600); } }
    };
    setParar(() => clearTimeout(tm));
  };

  // ---------- 🚰 Tuberías ----------
  JUEGOS.tuberias = t => {
    salir(); registrar(t.id);
    const N = 5; let nivel = 1, giros = 0, total = 0;
    // cada pieza: conexiones [arriba, derecha, abajo, izquierda]
    const armar = () => {
      // camino aleatorio desde (0, fila) a la derecha
      let r = Math.floor(Math.random() * N), c = 0; const camino = [[r, c]], vis = new Set([r * N]);
      while (c < N - 1) { const op = [[0, 1], [0, 1], [-1, 0], [1, 0]].filter(([dr, dc]) => { const r2 = r + dr, c2 = c + dc; return r2 >= 0 && r2 < N && c2 < N && !vis.has(r2 * N + c2); }); const [dr, dc] = op[Math.floor(Math.random() * op.length)] || [0, 1]; r += dr; c += dc; camino.push([r, c]); vis.add(r * N + c); }
      const g = [...Array(N * N)].map(() => { const tipo = Math.random() < .5 ? [1, 0, 1, 0] : [1, 1, 0, 0]; return tipo; });
      camino.forEach(([r2, c2], k) => { const pr = k ? camino[k - 1] : [r2, c2 - 1], nx = camino[k + 1] || [r2, c2 + 1]; const con = [0, 0, 0, 0]; for (const [a, b] of [pr, nx]) { if (a < r2) con[0] = 1; if (a > r2) con[2] = 1; if (b < c2) con[3] = 1; if (b > c2) con[1] = 1; } g[r2 * N + c2] = con; });
      const rot = g.map(p => { let q = [...p]; for (let k = Math.floor(Math.random() * 4); k > 0; k--) q = [q[3], q[0], q[1], q[2]]; return q; });
      return { g: rot, ent: camino[0][0], sal: camino[camino.length - 1][0] };
    };
    let L = armar();
    stage(cab(t, 'Nivel 1') + `<p class="sub" style="margin:4px 0">Gira las piezas para llevar el agua 💧 de la izquierda a la casa 🏠 de la derecha.</p><div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-top:8px"><div id="iz" style="display:grid;grid-template-rows:repeat(${N},1fr);gap:4px;height:300px;font-size:1.4rem"></div><div id="tu" style="display:grid;grid-template-columns:repeat(${N},1fr);gap:4px;width:300px;height:300px"></div><div id="de" style="display:grid;grid-template-rows:repeat(${N},1fr);gap:4px;height:300px;font-size:1.4rem"></div></div></div>`);
    const conectado = () => { const ok = new Set(), cola = []; if (L.g[L.ent * N][3]) { cola.push(L.ent * N); ok.add(L.ent * N); }
      while (cola.length) { const i = cola.shift(), r = Math.floor(i / N), c = i % N, p = L.g[i]; for (const [d, dr, dc, op] of [[0, -1, 0, 2], [1, 0, 1, 3], [2, 1, 0, 0], [3, 0, -1, 1]]) { if (!p[d]) continue; const r2 = r + dr, c2 = c + dc; if (r2 < 0 || r2 >= N || c2 < 0 || c2 >= N) continue; const j = r2 * N + c2; if (L.g[j][op] && !ok.has(j)) { ok.add(j); cola.push(j); } } }
      return { ok, gana: ok.has(L.sal * N + N - 1) && L.g[L.sal * N + N - 1][1] };
    };
    const svg = (p, agua) => { const col = agua ? '#4cc9f0' : '#adb5bd', seg = [[50, 0, 50, 50], [50, 50, 100, 50], [50, 50, 50, 100], [0, 50, 50, 50]]; return `<svg viewBox="0 0 100 100" width="100%" height="100%">${p.map((v, k) => v ? `<line x1="${seg[k][0]}" y1="${seg[k][1]}" x2="${seg[k][2]}" y2="${seg[k][3]}" stroke="${col}" stroke-width="22" stroke-linecap="round"/>` : '').join('')}<circle cx="50" cy="50" r="11" fill="${col}"/></svg>`; };
    const pintar = () => { const { ok, gana } = conectado();
      $('#tu').innerHTML = L.g.map((p, i) => `<button data-i="${i}" style="border:0;border-radius:10px;background:rgba(255,255,255,.07);padding:4px;cursor:pointer">${svg(p, ok.has(i))}</button>`).join('');
      $('#iz').innerHTML = [...Array(N).keys()].map(r => `<span>${r === L.ent ? '💧' : ''}</span>`).join(''); $('#de').innerHTML = [...Array(N).keys()].map(r => `<span>${r === L.sal ? '🏠' : ''}</span>`).join('');
      return gana; };
    pintar();
    $('#tu').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i, p = L.g[i]; L.g[i] = [p[3], p[0], p[1], p[2]]; giros++; FX.son('click');
      if (pintar()) { FX.confeti(); total += Math.max(30, 150 - giros * 3); giros = 0; nivel++; if (nivel > 5) return setTimeout(() => fin(t, total, '¡Conectaste las 5 casas!'), 800); setTimeout(() => { L = armar(); $('#info').textContent = 'Nivel ' + nivel; pintar(); }, 900); } };
    setParar(() => {});
  };

  // ---------- ⚽ Penales ----------
  JUEGOS.penales = t => {
    salir(); registrar(t.id);
    const W = cuadro(), H = Math.round(W * .9);
    stage(cab(t, 'Tiro 1 de 5') + `<p class="sub" style="margin:4px 0">Toca dónde quieres patear. ¡Engaña al arquero!</p><canvas id="cv" width="${W}" height="${H}" style="display:block;margin:6px auto;border-radius:18px;touch-action:none"></canvas><p class="estado" id="msg"></p></div>`);
    const cv = $('#cv'), x = cv.getContext('2d'), AR = { x: W * .12, y: H * .12, w: W * .76, h: H * .42 };
    let tiro = 0, goles = 0, anim = null, arq = { x: W / 2, y: AR.y + AR.h * .65 }, raf, vivo = true, histo = [];
    const dibujar = () => {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b3d2e'); g.addColorStop(1, '#1b7a43'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.05)'; x.fillRect(0, AR.y + AR.h + k * 30, W, 30); }
      x.strokeStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i <= 12; i++) { x.beginPath(); x.moveTo(AR.x + AR.w * i / 12, AR.y); x.lineTo(AR.x + AR.w * i / 12, AR.y + AR.h); x.stroke(); } for (let i = 0; i <= 6; i++) { x.beginPath(); x.moveTo(AR.x, AR.y + AR.h * i / 6); x.lineTo(AR.x + AR.w, AR.y + AR.h * i / 6); x.stroke(); }
      x.strokeStyle = '#fff'; x.lineWidth = 8; x.strokeRect(AR.x, AR.y, AR.w, AR.h + 4); x.lineWidth = 1;
      x.font = `${W / 7}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🧤', arq.x, arq.y);
      const b = anim ? anim.b : { x: W / 2, y: H * .85, s: 1 }; x.font = `${W / 12 * b.s}px serif`; x.fillText('⚽', b.x, b.y);
      x.fillStyle = '#fff'; x.font = 'bold 15px sans-serif'; x.textAlign = 'left'; x.fillText(histo.map(h => h ? '✅' : '❌').join(' '), 10, H - 12);
    };
    const bucle = () => { if (!vivo) return;
      if (anim) { anim.k += .05; const k = Math.min(1, anim.k); anim.b = { x: W / 2 + (anim.to.x - W / 2) * k, y: H * .85 + (anim.to.y - H * .85) * k, s: 1 - k * .45 }; arq.x += (anim.dive.x - arq.x) * .12; arq.y += (anim.dive.y - arq.y) * .12;
        if (k >= 1 && !anim.hecho) { anim.hecho = 1; const atajo = Math.hypot(anim.to.x - arq.x, anim.to.y - arq.y) < W * .16, fuera = !(anim.to.x > AR.x + 6 && anim.to.x < AR.x + AR.w - 6 && anim.to.y > AR.y + 6 && anim.to.y < AR.y + AR.h);
          const gol = !atajo && !fuera; histo.push(gol); if (gol) { goles++; FX.son('ganar'); FX.vibrar([20, 30, 20]); $('#msg').textContent = '⚽ ¡GOOOL!'; } else { FX.son('error'); $('#msg').textContent = fuera ? '😬 ¡Afuera!' : '🧤 ¡Atajó el arquero!'; }
          setTimeout(() => { tiro++; anim = null; arq = { x: W / 2, y: AR.y + AR.h * .65 }; if (tiro >= 5) { vivo = false; if (goles >= 4) FX.confeti(); return fin(t, goles * 100, `Metiste ${goles} de 5 penales`); } $('#info').textContent = `Tiro ${tiro + 1} de 5`; $('#msg').textContent = ''; }, 1100); } }
      dibujar(); raf = requestAnimationFrame(bucle); };
    const patear = e => { if (anim || !vivo) return; e.preventDefault(); const p = posCanvas(cv, e); if (p.y > AR.y + AR.h + 30) return;
      // el arquero adivina: más difícil en cada tiro
      const lado = Math.random() < .45 + tiro * .08 ? p.x : AR.x + AR.w * (Math.random() * .8 + .1);
      anim = { k: 0, to: { x: p.x, y: p.y }, dive: { x: lado, y: AR.y + AR.h * (Math.random() * .5 + .35) } }; FX.son('taco'); };
    cv.addEventListener('mousedown', patear); cv.addEventListener('touchstart', patear, { passive: false });
    bucle(); setParar(() => { vivo = false; cancelAnimationFrame(raf); });
  };

  // ---------- ➗ Cálculo rápido ----------
  JUEGOS.calculo = t => {
    salir(); registrar(t.id);
    let pts = 0, racha = 0, fin0 = Date.now() + 60000, tm, act;
    stage(cab(t, '60 s') + `<div id="op" style="text-align:center;font:800 3rem Figtree,sans-serif;margin:24px 0"></div><div id="ops" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"></div><p class="estado" id="msg">Puntos: 0</p></div>`);
    const nueva = () => { const nv = Math.min(4, 1 + Math.floor(pts / 80)); const op = ['+', '-', '×', '÷'][Math.floor(Math.random() * Math.min(4, nv + 1))];
      let a = 2 + Math.floor(Math.random() * (8 * nv)), b = 2 + Math.floor(Math.random() * (5 * nv)), r;
      if (op === '+') r = a + b; if (op === '-') { if (b > a) [a, b] = [b, a]; r = a - b; } if (op === '×') { a = 2 + Math.floor(Math.random() * 10); b = 2 + Math.floor(Math.random() * 10); r = a * b; } if (op === '÷') { b = 2 + Math.floor(Math.random() * 9); r = 2 + Math.floor(Math.random() * 10); a = b * r; }
      const ops = new Set([r]); while (ops.size < 4) { const v = r + Math.floor(Math.random() * 11) - 5; if (v >= 0) ops.add(v); else ops.add(r + ops.size + 1); } act = r;
      $('#op').textContent = `${a} ${op} ${b}`; $('#ops').innerHTML = [...ops].sort(() => Math.random() - .5).map(v => btn(v, `data-v="${v}"`, 'height:64px;font-size:1.6rem')).join(''); };
    nueva();
    $('#ops').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; if (+b.dataset.v === act) { racha++; pts += 10 + Math.min(racha, 10); FX.son('punto'); } else { racha = 0; FX.son('error'); FX.vibrar(40); fin0 -= 3000; } $('#msg').textContent = `Puntos: ${pts}${racha > 2 ? ` · racha x${racha} 🔥` : ''}`; nueva(); };
    tm = setInterval(() => { const s = Math.max(0, Math.ceil((fin0 - Date.now()) / 1000)); $('#info').textContent = s + ' s'; if (!s) { clearInterval(tm); FX.son('ganar'); fin(t, pts, `Respondiste en 60 segundos`); } }, 250);
    setParar(() => clearInterval(tm));
  };

  // ---------- 🔴 Simón dice ----------
  JUEGOS.simon = t => {
    salir(); registrar(t.id);
    const COL = [['#ff4d6d', 330], ['#06d6a0', 440], ['#3a86ff', 550], ['#ffd60a', 660]];
    let sec = [], paso = 0, turno = false, vivo = true, tm;
    stage(cab(t, 'Nivel 0') + `<p class="sub" style="margin:4px 0">Mira la secuencia y repítela. Cada nivel suma un color.</p><div id="sm" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:300px;margin:16px auto">${COL.map(([c], i) => `<button data-c="${i}" style="aspect-ratio:1;border:0;border-radius:${['80px 16px 16px 16px', '16px 80px 16px 16px', '16px 16px 16px 80px', '16px 16px 80px 16px'][i]};background:${c};opacity:.45;cursor:pointer;transition:opacity .12s,transform .12s"></button>`).join('')}</div><p class="estado" id="msg">Mira…</p></div>`);
    const tono = f => { if (LS.get('arcSonido') === '0') return; try { const ac = window.__ac || (window.__ac = new (window.AudioContext || window.webkitAudioContext)()); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .35); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .36); } catch (e) {} };
    const brillar = i => { const b = document.querySelector(`#sm [data-c="${i}"]`); if (!b) return; b.style.opacity = 1; b.style.transform = 'scale(1.05)'; tono(COL[i][1]); setTimeout(() => { b.style.opacity = .45; b.style.transform = 'scale(1)'; }, 350); };
    const mostrar = () => { turno = false; $('#msg').textContent = 'Mira…'; sec.push(Math.floor(Math.random() * 4)); $('#info').textContent = 'Nivel ' + (sec.length - 1); let k = 0; const vel = Math.max(280, 600 - sec.length * 25);
      const f = () => { if (!vivo) return; if (k >= sec.length) { turno = true; paso = 0; $('#msg').textContent = '¡Tu turno!'; return; } brillar(sec[k++]); tm = setTimeout(f, vel); }; tm = setTimeout(f, 600); };
    $('#sm').onclick = e => { const b = e.target.closest('[data-c]'); if (!b || !turno) return; const i = +b.dataset.c; brillar(i);
      if (i !== sec[paso]) { turno = false; vivo = false; FX.son('perder'); FX.vibrar(200); return setTimeout(() => fin(t, (sec.length - 1) * 20, `Llegaste al nivel ${sec.length - 1}`), 600); }
      if (++paso === sec.length) { FX.son('punto'); turno = false; setTimeout(mostrar, 700); } };
    mostrar(); setParar(() => { vivo = false; clearTimeout(tm); });
  };

  // ---------- 🐹 Atrapa al topo ----------
  JUEGOS.topos = t => {
    salir(); registrar(t.id);
    let pts = 0, fin0 = Date.now() + 30000, vivo = true, tm, tm2;
    stage(cab(t, '30 s') + `<p class="sub" style="margin:4px 0">Toca los topos 🐹 antes de que se escondan. ¡Cuidado con las bombas 💣!</p><div id="tp" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:330px;margin:12px auto">${[...Array(9).keys()].map(i => `<button data-i="${i}" style="aspect-ratio:1;border:0;border-radius:50%;background:radial-gradient(circle at 50% 70%,#3b2412,#6b4423 60%,#8a5a2b);font-size:2.6rem;cursor:pointer;box-shadow:inset 0 -8px 0 rgba(0,0,0,.35)"></button>`).join('')}</div><p class="estado" id="msg">Puntos: 0</p></div>`);
    const act = {};
    const salir2 = () => { if (!vivo) return; const libres = [...Array(9).keys()].filter(i => !act[i]); if (libres.length) { const i = libres[Math.floor(Math.random() * libres.length)], bomba = Math.random() < .18; act[i] = bomba ? 'b' : 't'; const b = document.querySelector(`#tp [data-i="${i}"]`); b.textContent = bomba ? '💣' : '🐹'; setTimeout(() => { if (act[i]) { delete act[i]; b.textContent = ''; } }, Math.max(500, 1100 - (30000 - (fin0 - Date.now())) / 60)); }
      tm = setTimeout(salir2, Math.max(330, 750 - (30000 - (fin0 - Date.now())) / 70)); };
    $('#tp').onpointerdown = e => { const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i; if (!act[i]) return;
      if (act[i] === 'b') { pts = Math.max(0, pts - 30); FX.son('error'); FX.vibrar(120); b.textContent = '💥'; } else { pts += 10; FX.son('punto'); FX.vibrar(10); b.textContent = '⭐'; }
      delete act[i]; setTimeout(() => { if (!act[i]) b.textContent = ''; }, 250); $('#msg').textContent = 'Puntos: ' + pts; };
    salir2();
    tm2 = setInterval(() => { const s = Math.max(0, Math.ceil((fin0 - Date.now()) / 1000)); $('#info').textContent = s + ' s'; if (!s) { vivo = false; clearInterval(tm2); clearTimeout(tm); FX.son('ganar'); fin(t, pts, 'Se acabó el tiempo'); } }, 250);
    setParar(() => { vivo = false; clearTimeout(tm); clearInterval(tm2); });
  };

  // ---------- 🎨 ¿Qué color es? ----------
  JUEGOS.color = t => {
    salir(); registrar(t.id);
    const C = [['ROJO', '#ff4d6d'], ['AZUL', '#3a86ff'], ['VERDE', '#2fbf71'], ['AMARILLO', '#ffd60a'], ['MORADO', '#8338ec'], ['NARANJA', '#fb5607']];
    let pts = 0, fin0 = Date.now() + 45000, tm, act;
    stage(cab(t, '45 s') + `<p class="sub" style="margin:4px 0">Toca el <b>COLOR</b> con el que está pintada la palabra, no lo que dice. ¡Tu cerebro te va a engañar!</p><div id="pw" style="text-align:center;font:900 3rem Figtree,sans-serif;margin:26px 0;letter-spacing:2px"></div><div id="cs" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px"></div><p class="estado" id="msg">Puntos: 0</p></div>`);
    const nueva = () => { const w = Math.floor(Math.random() * C.length); let c; do { c = Math.floor(Math.random() * C.length); } while (c === w && Math.random() < .8); act = c; $('#pw').textContent = C[w][0]; $('#pw').style.color = C[c][1];
      $('#cs').innerHTML = [...C.keys()].sort(() => Math.random() - .5).map(i => btn(C[i][0], `data-c="${i}"`, 'height:56px;font-size:.9rem;background:rgba(255,255,255,.12)')).join(''); };
    nueva();
    $('#cs').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; if (+b.dataset.c === act) { pts += 10; FX.son('punto'); } else { pts = Math.max(0, pts - 5); FX.son('error'); FX.vibrar(40); } $('#msg').textContent = 'Puntos: ' + pts; nueva(); };
    tm = setInterval(() => { const s = Math.max(0, Math.ceil((fin0 - Date.now()) / 1000)); $('#info').textContent = s + ' s'; if (!s) { clearInterval(tm); FX.son('ganar'); fin(t, pts, 'Se acabó el tiempo'); } }, 250);
    setParar(() => clearInterval(tm));
  };
})();
