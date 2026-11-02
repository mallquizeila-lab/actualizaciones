// 🌱 Huerto Defensor: defensa por carriles con personajes y diseño propios (choclo, coco, ají, limón, piña, palta vs. plagas).
// Vertical para celular: las plagas bajan por 5 carriles y tú plantas defensores con el agua 💧 que recoges.
(() => {
  const A = window.ARC_API, { JUEGOS, salir } = A, setParar = A.setParar;
  const TOTAL = 30, L = 5, R = 7;
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const DEF = {
    hongo: { n: 'Hongo Rocío', costo: 50, carga: 6, hp: 300, desde: 1, d: 'Produce gotas de agua 💧 para plantar más.' },
    choclo: { n: 'Choclo Lanzagranos', costo: 100, carga: 6, hp: 300, desde: 1, d: 'Dispara granos a las plagas de su carril.' },
    coco: { n: 'Coco Muralla', costo: 50, carga: 22, hp: 4000, desde: 2, d: 'Muralla durísima: frena a las plagas.' },
    aji: { n: 'Ají Explosivo', costo: 150, carga: 35, hp: 9999, desde: 4, d: 'Explota y arrasa todo a su alrededor.' },
    limon: { n: 'Limón Helado', costo: 175, carga: 8, hp: 300, desde: 6, d: 'Su jugo helado vuelve lentas a las plagas.' },
    pina: { n: 'Piña Bomba', costo: 25, carga: 22, hp: 300, desde: 9, d: 'Barata. Tarda en armarse y luego estalla.' },
    palta: { n: 'Palta Doble', costo: 200, carga: 8, hp: 300, desde: 13, d: 'Dispara dos pepas seguidas.' },
  };
  const ENE = {
    gusano: { n: 'Gusano', hp: 190, vel: .21, desde: 1, pts: 10, d: 'Lento pero insistente.' },
    caracol: { n: 'Caracol blindado', hp: 520, vel: .17, desde: 3, pts: 20, d: 'Su caparazón aguanta mucho.' },
    langosta: { n: 'Langosta', hp: 300, vel: .42, desde: 7, pts: 25, d: 'Rápida: salta sobre tu primer defensor.' },
    escarabajo: { n: 'Escarabajo tanque', hp: 1100, vel: .16, desde: 11, pts: 40, d: 'Blindado y muy resistente.' },
    rata: { n: 'Rata jefa', hp: 3000, vel: .14, desde: 5, pts: 120, d: 'La jefa: enorme y voraz.' },
  };
  const ORDEN = Object.keys(DEF);
  const datos = () => PERFIL.datos.juegos.huerto || { nivel: 1, estrellas: {} };
  const desbloq = n => ORDEN.filter(k => DEF[k].desde <= n);

  function cfg(n) {
    const r = rng(n * 977 + 13), carriles = n <= 2 ? [1, 2, 3] : [0, 1, 2, 3, 4];
    const tipos = Object.keys(ENE).filter(k => k !== 'rata' && ENE[k].desde <= n), peso = { gusano: 5, caracol: 3, langosta: 2, escarabajo: 1.5 };
    const elegir = () => { let x = r() * tipos.reduce((a, k) => a + peso[k], 0); for (const k of tipos) { x -= peso[k]; if (x <= 0) return k; } return 'gusano'; };
    const carril = () => carriles[Math.floor(r() * carriles.length)];
    const total = Math.round(5 + n * 1.3), normal = Math.round(total * .6), ev = [];
    let t = 18;
    for (let i = 0; i < normal; i++) { ev.push({ t, tipo: i < 2 ? 'gusano' : elegir(), c: carril() }); t += Math.max(3, 10.5 - n * .22 - i * .12) * (.7 + r() * .6); }
    t += 7; const ola = t;
    for (let i = normal; i < total; i++) ev.push({ t: t + r() * (8 + n * .2), tipo: elegir(), c: carril() });
    if (n % 5 === 0 || n > 20) ev.push({ t: t + 4, tipo: 'rata', c: carriles[Math.floor(carriles.length / 2)] });
    if (n > 25) ev.push({ t: t + 9, tipo: 'rata', c: carril() });
    ev.sort((a, b) => a.t - b.t);
    return { n, carriles, ev, ola, ultimo: ev[ev.length - 1].t, agua: n < 3 ? 150 : n < 15 ? 200 : 250 };
  }

  // ---------- Dibujo de personajes (todo vectorial, propio) ----------
  const rad = (X, x, y, r, c1, c2) => { const g = X.createRadialGradient(x - r * .35, y - r * .4, r * .08, x, y, r * 1.15); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };
  const borde = (X, s) => { X.strokeStyle = 'rgba(25,12,30,.6)'; X.lineWidth = Math.max(1.4, s * .032); X.stroke(); };
  const sombra = (X, x, y, w) => { X.fillStyle = 'rgba(0,0,0,.22)'; X.beginPath(); X.ellipse(x, y, w, w * .3, 0, 0, 7); X.fill(); };
  const brillo = (X, x, y, w, h) => { X.fillStyle = 'rgba(255,255,255,.5)'; X.beginPath(); X.ellipse(x, y, w, h, -.5, 0, 7); X.fill(); };
  function ojos(X, x, y, r, sep, mira, enojo, parp) {
    for (const k of [-1, 1]) {
      const ox = x + k * sep;
      X.fillStyle = '#fff'; X.beginPath(); X.ellipse(ox, y, r * .8, parp ? r * .12 : r, 0, 0, 7); X.fill(); X.strokeStyle = 'rgba(0,0,0,.45)'; X.lineWidth = r * .2; X.stroke();
      if (!parp) { X.fillStyle = '#1b1b2f'; X.beginPath(); X.arc(ox, y + mira * r * .35, r * .5, 0, 7); X.fill(); X.fillStyle = '#fff'; X.beginPath(); X.arc(ox - r * .18, y + mira * r * .35 - r * .2, r * .17, 0, 7); X.fill(); }
      if (enojo) { X.strokeStyle = '#1b1b2f'; X.lineWidth = r * .32; X.lineCap = 'round'; X.beginPath(); X.moveTo(ox + k * r * .9, y - r * 1.35); X.lineTo(ox - k * r * .55, y - r * .85); X.stroke(); X.lineCap = 'butt'; }
    }
  }
  const mejillas = (X, x, y, s, sep) => { X.fillStyle = 'rgba(255,105,140,.45)'; for (const k of [-1, 1]) { X.beginPath(); X.ellipse(x + k * sep, y, s * .05, s * .03, 0, 0, 7); X.fill(); } };
  const parpadea = o => Math.sin(o.t * 1.3 + o.f * 7) > .985;
  // Cada función dibuja centrada en (x, y) dentro de una celda de tamaño s.
  const DIB = {
    hongo(X, x, y, s, o) {
      const b = Math.sin(o.t * 3 + o.f) * .035 + (o.kick || 0) * .1; sombra(X, x, y + s * .33, s * .27);
      X.save(); X.translate(x, y + s * .32); X.scale(1 - b, 1 + b); X.translate(-x, -(y + s * .32));
      X.beginPath(); X.roundRect(x - s * .16, y - s * .06, s * .32, s * .38, s * .12); X.fillStyle = rad(X, x, y + s * .1, s * .25, '#fffaf0', '#e2c08f'); X.fill(); borde(X, s);
      X.beginPath(); X.moveTo(x - s * .4, y - s * .02); X.bezierCurveTo(x - s * .42, y - s * .46, x + s * .42, y - s * .46, x + s * .4, y - s * .02); X.quadraticCurveTo(x, y + s * .08, x - s * .4, y - s * .02);
      X.fillStyle = rad(X, x, y - s * .2, s * .38, '#8ff5ea', '#0e8f86'); X.fill(); borde(X, s);
      X.fillStyle = 'rgba(255,255,255,.85)'; for (const [dx, dy, r] of [[-.2, -.15, .06], [.05, -.27, .07], [.24, -.12, .05], [-.03, -.1, .04]]) { X.beginPath(); X.arc(x + dx * s, y + dy * s, r * s, 0, 7); X.fill(); }
      ojos(X, x, y + s * .1, s * .055, s * .07, -1, 0, parpadea(o)); mejillas(X, x, y + s * .2, s, s * .11);
      X.restore();
      if (o.carga > .75) { const p = (o.carga - .75) * 4; X.globalAlpha = p * (.6 + .4 * Math.sin(o.t * 10)); gota(X, x, y - s * .48, s * .09); X.globalAlpha = 1; }
    },
    choclo(X, x, y, s, o) {
      const k = o.kick || 0, b = Math.sin(o.t * 3 + o.f) * .03; sombra(X, x, y + s * .34, s * .27);
      X.save(); X.translate(x, y + s * .34); X.scale(1 + k * .12, 1 - k * .16 + b); X.translate(-x, -(y + s * .34));
      for (const d of [-1, 1]) { X.beginPath(); X.moveTo(x, y + s * .34); X.quadraticCurveTo(x + d * s * .46, y + s * .14, x + d * s * .33, y - s * .26); X.quadraticCurveTo(x + d * s * .14, y - s * .02, x, y + s * .34); X.fillStyle = rad(X, x + d * s * .2, y, s * .32, '#a6f07d', '#2b8a2b'); X.fill(); borde(X, s); }
      X.beginPath(); X.ellipse(x, y - s * .05, s * .175, s * .34, 0, 0, 7); X.fillStyle = rad(X, x, y - s * .08, s * .32, '#fff6b0', '#f0a400'); X.fill(); borde(X, s);
      X.fillStyle = 'rgba(190,110,0,.35)'; for (const i of [-3.3, -2.3, 2.3]) for (let j = -1; j <= 1; j++) { X.beginPath(); X.arc(x + j * s * .085 + (i > 0 ? 0 : (i < -3 ? s * .04 : 0)), y + i * s * .085 - s * .03, s * .027, 0, 7); X.fill(); }
      brillo(X, x - s * .07, y - s * .25, s * .04, s * .08);
      ojos(X, x, y - s * .07, s * .062, s * .075, -1, 0, parpadea(o)); mejillas(X, x, y + s * .03, s, s * .12);
      X.fillStyle = '#5a1a00'; X.beginPath(); X.ellipse(x, y + s * .08, s * .035 + k * s * .03, s * .022 + k * s * .045, 0, 0, 7); X.fill();
      X.restore();
    },
    coco(X, x, y, s, o) {
      const f = o.frac ?? 1, b = Math.sin(o.t * 2 + o.f) * .02; sombra(X, x, y + s * .34, s * .33);
      X.save(); X.translate(x, y + s * .34); X.scale(1 + b, 1 - b); X.translate(-x, -(y + s * .34));
      X.beginPath(); X.ellipse(x, y + s * .02, s * .37, s * .35, 0, 0, 7); X.fillStyle = rad(X, x, y, s * .37, '#c08a5a', '#4a2812'); X.fill(); borde(X, s);
      X.strokeStyle = 'rgba(255,225,190,.28)'; X.lineWidth = s * .016; for (let i = 0; i < 14; i++) { const a = i * .45 + .2; X.beginPath(); X.moveTo(x + Math.cos(a) * s * .2, y + Math.sin(a) * s * .19); X.lineTo(x + Math.cos(a + .12) * s * .34, y + Math.sin(a + .12) * s * .32); X.stroke(); }
      brillo(X, x - s * .15, y - s * .17, s * .08, s * .045);
      ojos(X, x, y - s * .02, s * .07, s * .11, -1, 1, parpadea(o));
      X.strokeStyle = '#2a1206'; X.lineWidth = s * .03; X.lineCap = 'round'; X.beginPath(); X.moveTo(x - s * .07, y + s * .14); X.lineTo(x + s * .07, y + s * .14); X.stroke(); X.lineCap = 'butt';
      X.strokeStyle = 'rgba(30,10,0,.85)'; X.lineWidth = s * .022;
      if (f < .67) { X.beginPath(); X.moveTo(x + s * .12, y - s * .3); X.lineTo(x + s * .18, y - s * .18); X.lineTo(x + s * .12, y - s * .08); X.lineTo(x + s * .2, y); X.stroke(); }
      if (f < .34) { X.beginPath(); X.moveTo(x - s * .3, y + s * .05); X.lineTo(x - s * .18, y + s * .1); X.lineTo(x - s * .22, y + s * .22); X.stroke(); X.beginPath(); X.moveTo(x - s * .05, y + s * .36); X.lineTo(x, y + s * .26); X.lineTo(x + s * .08, y + s * .3); X.stroke(); }
      X.restore();
    },
    aji(X, x, y, s, o) {
      const p = Math.min(1, (o.timer || 0) / .9); x += (Math.random() - .5) * s * .07 * p; sombra(X, x, y + s * .36, s * .22);
      X.save(); X.translate(x, y); X.scale(1 + p * .25, 1 + p * .25); X.translate(-x, -y);
      X.beginPath(); X.moveTo(x - s * .17, y - s * .22); X.bezierCurveTo(x - s * .28, y + s * .1, x - s * .06, y + s * .34, x + s * .09, y + s * .4); X.bezierCurveTo(x + s * .22, y + s * .2, x + s * .25, y - s * .05, x + s * .17, y - s * .22); X.quadraticCurveTo(x, y - s * .3, x - s * .17, y - s * .22);
      X.fillStyle = rad(X, x, y, s * .3, p > .5 ? '#fff1b0' : '#ff8a7a', p > .5 ? '#ff4d00' : '#c2101c'); X.fill(); borde(X, s);
      X.beginPath(); X.ellipse(x, y - s * .25, s * .15, s * .06, 0, 0, 7); X.fillStyle = '#2e9b3a'; X.fill(); borde(X, s);
      X.strokeStyle = '#2e9b3a'; X.lineWidth = s * .05; X.lineCap = 'round'; X.beginPath(); X.moveTo(x, y - s * .28); X.quadraticCurveTo(x + s * .02, y - s * .4, x + s * .1, y - s * .42); X.stroke(); X.lineCap = 'butt';
      brillo(X, x - s * .09, y - s * .1, s * .03, s * .08);
      ojos(X, x, y - s * .04, s * .055, s * .07, -1, 1, false);
      X.fillStyle = '#4a0000'; X.beginPath(); X.ellipse(x, y + s * .1, s * .05, s * .03 + p * s * .03, 0, 0, 7); X.fill();
      X.restore();
    },
    limon(X, x, y, s, o) {
      const k = o.kick || 0, b = Math.sin(o.t * 2.5 + o.f) * .03; sombra(X, x, y + s * .3, s * .3);
      X.save(); X.translate(x, y + s * .3); X.scale(1 + k * .14, 1 - k * .14 + b); X.translate(-x, -(y + s * .3));
      X.beginPath(); X.moveTo(x - s * .4, y); X.bezierCurveTo(x - s * .35, y - s * .34, x + s * .35, y - s * .34, x + s * .4, y); X.bezierCurveTo(x + s * .35, y + s * .3, x - s * .35, y + s * .3, x - s * .4, y);
      X.fillStyle = rad(X, x, y, s * .36, '#f4ffd6', '#5fae1e'); X.fill(); borde(X, s);
      X.fillStyle = 'rgba(190,240,255,.55)'; X.beginPath(); X.ellipse(x, y - s * .14, s * .25, s * .08, 0, 0, 7); X.fill();
      X.strokeStyle = 'rgba(220,250,255,.9)'; X.lineWidth = s * .015; for (const [dx, dy] of [[-.3, -.26], [.32, -.22], [.36, .14]]) { const cx = x + dx * s, cy = y + dy * s, r = s * .04 * (1 + .3 * Math.sin(o.t * 4 + dx * 9)); X.beginPath(); X.moveTo(cx - r, cy); X.lineTo(cx + r, cy); X.moveTo(cx, cy - r); X.lineTo(cx, cy + r); X.stroke(); }
      ojos(X, x, y - s * .02, s * .06, s * .1, -1, 0, true);
      X.strokeStyle = '#2d4a10'; X.lineWidth = s * .025; X.beginPath(); X.arc(x, y + s * .06, s * .06, .2, Math.PI - .2); X.stroke();
      X.fillStyle = '#9be8ff'; X.beginPath(); X.ellipse(x, y + s * .16 + k * s * .02, s * .04 + k * s * .03, s * .02 + k * s * .03, 0, 0, 7); if (k > .1) X.fill();
      X.restore();
    },
    pina(X, x, y, s, o) {
      if (!o.armado) {
        X.beginPath(); X.ellipse(x, y + s * .2, s * .3, s * .12, 0, 0, 7); X.fillStyle = rad(X, x, y + s * .2, s * .3, '#9a6a3c', '#4b2e14'); X.fill(); borde(X, s);
        const p = Math.min(1, (o.timer || 0) / 12);
        for (let i = -2; i <= 2; i++) { X.beginPath(); X.moveTo(x + i * s * .05, y + s * .15); X.lineTo(x + i * s * .09, y + s * (.1 - .18 * p) - Math.abs(2 - Math.abs(i)) * s * .03 * p); X.lineTo(x + i * s * .05 + s * .03, y + s * .15); X.fillStyle = '#3ea14a'; X.fill(); }
        X.fillStyle = 'rgba(255,255,255,.75)'; X.font = `900 ${s * .16}px Figtree,sans-serif`; X.textAlign = 'center'; X.fillText(Math.ceil(12 - (o.timer || 0)) + 's', x, y + s * .45);
        return;
      }
      const b = Math.sin(o.t * 5 + o.f) * .04; sombra(X, x, y + s * .34, s * .24);
      for (let i = -2; i <= 2; i++) { X.beginPath(); X.moveTo(x + i * s * .04, y - s * .18); X.lineTo(x + i * s * .1, y - s * .48 + Math.abs(i) * s * .07); X.lineTo(x + i * s * .04 + s * .04, y - s * .18); X.fillStyle = i % 2 ? '#2f8f3b' : '#49b856'; X.fill(); }
      X.save(); X.translate(x, y + s * .34); X.scale(1 - b, 1 + b); X.translate(-x, -(y + s * .34));
      X.beginPath(); X.ellipse(x, y + s * .08, s * .24, s * .28, 0, 0, 7); X.fillStyle = rad(X, x, y + s * .05, s * .28, '#ffe680', '#d98a00'); X.fill(); borde(X, s);
      X.save(); X.clip(); X.strokeStyle = 'rgba(140,80,0,.45)'; X.lineWidth = s * .02; for (let i = -5; i <= 5; i++) { X.beginPath(); X.moveTo(x + i * s * .09 - s * .3, y - s * .25); X.lineTo(x + i * s * .09 + s * .3, y + s * .4); X.stroke(); X.beginPath(); X.moveTo(x + i * s * .09 + s * .3, y - s * .25); X.lineTo(x + i * s * .09 - s * .3, y + s * .4); X.stroke(); } X.restore();
      ojos(X, x, y + s * .04, s * .06, s * .08, -1, 1, false);
      X.fillStyle = Math.sin(o.t * 12) > 0 ? '#ff2a2a' : '#7a0000'; X.beginPath(); X.arc(x, y - s * .14, s * .035, 0, 7); X.fill();
      X.restore();
    },
    palta(X, x, y, s, o) {
      const k = o.kick || 0, b = Math.sin(o.t * 2.6 + o.f) * .03; sombra(X, x, y + s * .36, s * .27);
      X.save(); X.translate(x, y + s * .36); X.scale(1 + k * .1, 1 - k * .14 + b); X.translate(-x, -(y + s * .36));
      const pera = sc => { X.beginPath(); X.moveTo(x, y - s * .4 * sc); X.bezierCurveTo(x + s * .2 * sc, y - s * .4 * sc, x + s * .36 * sc, y + s * .05, x + s * .3 * sc, y + s * .22 * sc + s * .02); X.bezierCurveTo(x + s * .22 * sc, y + s * .4, x - s * .22 * sc, y + s * .4, x - s * .3 * sc, y + s * .22 * sc + s * .02); X.bezierCurveTo(x - s * .36 * sc, y + s * .05, x - s * .2 * sc, y - s * .4 * sc, x, y - s * .4 * sc); };
      pera(1); X.fillStyle = rad(X, x, y, s * .38, '#6fae35', '#1d4a10'); X.fill(); borde(X, s);
      pera(.8); X.fillStyle = rad(X, x, y, s * .3, '#f2ffb8', '#a7d050'); X.fill();
      X.beginPath(); X.arc(x, y + s * .14, s * .13, 0, 7); X.fillStyle = rad(X, x, y + s * .14, s * .13, '#c98a52', '#6b3a17'); X.fill(); borde(X, s);
      ojos(X, x, y - s * .1, s * .055, s * .075, -1, 0, parpadea(o)); mejillas(X, x, y - s * .01, s, s * .12);
      X.fillStyle = '#3a1a05'; X.beginPath(); X.ellipse(x, y + s * .15, s * .035 + k * s * .02, s * .02 + k * s * .035, 0, 0, 7); X.fill();
      X.restore();
    },
  };
  // Plagas (bajan por la pantalla: la cabeza va abajo)
  const PLAGA = {
    gusano(X, x, y, s, o) {
      sombra(X, x, y + s * .3, s * .2);
      const seg = [0, 1, 2, 3];
      for (const i of seg) { const sy = y - s * .3 + i * s * .14 + (o.come ? Math.sin(o.t * 14) * s * .02 : 0), sx = x + Math.sin(o.t * 6 + i * 1.1) * s * .05, r = s * (.11 + i * .025);
        X.beginPath(); X.arc(sx, sy, r, 0, 7); X.fillStyle = rad(X, sx, sy, r, i === 3 ? '#e2ff9a' : '#c6f06a', '#4d8c16'); X.fill(); borde(X, s);
        if (i === 3) { X.strokeStyle = '#3c6b10'; X.lineWidth = s * .025; X.lineCap = 'round'; for (const k of [-1, 1]) { X.beginPath(); X.moveTo(sx + k * r * .4, sy - r * .8); X.quadraticCurveTo(sx + k * r * .9, sy - r * 1.6, sx + k * r * 1.2, sy - r * 1.3); X.stroke(); } X.lineCap = 'butt';
          ojos(X, sx, sy - r * .1, r * .32, r * .38, 1, 1, false); X.fillStyle = '#3a1020'; X.beginPath(); X.ellipse(sx, sy + r * .5, r * .3, o.come ? r * .25 : r * .1, 0, 0, 7); X.fill(); } }
    },
    caracol(X, x, y, s, o) {
      const f = o.frac ?? 1, w = Math.sin(o.t * 3) * .02; sombra(X, x, y + s * .32, s * .24);
      X.beginPath(); X.ellipse(x, y + s * .1, s * .17, s * .32 * (1 + w), 0, 0, 7); X.fillStyle = rad(X, x, y + s * .1, s * .3, '#d8e6c8', '#6b8a5a'); X.fill(); borde(X, s);
      X.strokeStyle = '#6b8a5a'; X.lineWidth = s * .03; X.lineCap = 'round'; for (const k of [-1, 1]) { X.beginPath(); X.moveTo(x + k * s * .06, y + s * .34); X.lineTo(x + k * s * .12, y + s * .48); X.stroke(); X.fillStyle = '#fff'; X.beginPath(); X.arc(x + k * s * .12, y + s * .48, s * .045, 0, 7); X.fill(); X.fillStyle = '#1b1b2f'; X.beginPath(); X.arc(x + k * s * .12, y + s * .5, s * .022, 0, 7); X.fill(); } X.lineCap = 'butt';
      X.beginPath(); X.arc(x, y - s * .06, s * .27, 0, 7); X.fillStyle = rad(X, x, y - s * .06, s * .27, '#ffc76b', '#9a4b12'); X.fill(); borde(X, s);
      X.strokeStyle = 'rgba(90,40,5,.7)'; X.lineWidth = s * .028; X.beginPath(); for (let a = 0; a < 14; a += .2) { const r = s * .022 * a; X.lineTo(x + Math.cos(a) * r, y - s * .06 + Math.sin(a) * r); } X.stroke();
      brillo(X, x - s * .1, y - s * .18, s * .07, s * .035);
      if (f < .5) { X.strokeStyle = '#2a1206'; X.lineWidth = s * .02; X.beginPath(); X.moveTo(x + s * .05, y - s * .32); X.lineTo(x + s * .1, y - s * .2); X.lineTo(x + s * .03, y - s * .12); X.stroke(); }
    },
    langosta(X, x, y, s, o) {
      const salto = o.salto > 0 ? Math.sin((1 - o.salto / .6) * Math.PI) : 0, sc = 1 + salto * .35;
      sombra(X, x, y + s * .3 + salto * s * .3, s * .2 * (1 - salto * .4));
      X.save(); X.translate(x, y - salto * s * .2); X.scale(sc, sc); X.translate(-x, -y);
      X.strokeStyle = '#2f6b12'; X.lineWidth = s * .04; X.lineCap = 'round'; X.lineJoin = 'round';
      for (const k of [-1, 1]) { X.beginPath(); X.moveTo(x + k * s * .08, y - s * .05); X.lineTo(x + k * s * .3, y - s * .25 + Math.sin(o.t * 10) * s * .02); X.lineTo(x + k * s * .24, y + s * .15); X.stroke(); X.beginPath(); X.moveTo(x + k * s * .07, y + s * .12); X.lineTo(x + k * s * .2, y + s * .24); X.stroke(); }
      X.beginPath(); X.ellipse(x, y - s * .05, s * .13, s * .3, 0, 0, 7); X.fillStyle = rad(X, x, y - s * .05, s * .3, '#c4f56e', '#3f8a14'); X.fill(); borde(X, s);
      X.fillStyle = 'rgba(40,90,10,.35)'; for (let i = 0; i < 4; i++) X.fillRect(x - s * .1, y - s * .28 + i * s * .08, s * .2, s * .02);
      X.beginPath(); X.ellipse(x, y + s * .25, s * .14, s * .12, 0, 0, 7); X.fillStyle = rad(X, x, y + s * .25, s * .14, '#d6ff8a', '#4f9a1a'); X.fill(); borde(X, s);
      X.beginPath(); X.moveTo(x - s * .05, y + s * .33); X.quadraticCurveTo(x - s * .2, y + s * .5, x - s * .26, y + s * .46); X.moveTo(x + s * .05, y + s * .33); X.quadraticCurveTo(x + s * .2, y + s * .5, x + s * .26, y + s * .46); X.lineWidth = s * .02; X.stroke();
      X.lineCap = 'butt'; X.lineJoin = 'miter';
      ojos(X, x, y + s * .23, s * .05, s * .07, 1, 1, false);
      X.restore();
    },
    escarabajo(X, x, y, s, o) {
      sombra(X, x, y + s * .34, s * .3);
      X.strokeStyle = '#120c26'; X.lineWidth = s * .035; X.lineCap = 'round';
      for (let i = 0; i < 3; i++) for (const k of [-1, 1]) { const m = Math.sin(o.t * 9 + i * 2 + (k > 0 ? 1.5 : 0)) * s * .04; X.beginPath(); X.moveTo(x + k * s * .2, y - s * .12 + i * s * .14); X.lineTo(x + k * s * .38, y - s * .18 + i * s * .14 + m); X.stroke(); }
      X.lineCap = 'butt';
      X.beginPath(); X.ellipse(x, y - s * .04, s * .3, s * .34, 0, 0, 7); X.fillStyle = rad(X, x, y - s * .06, s * .34, '#9d8cff', '#1a1240'); X.fill(); borde(X, s);
      X.strokeStyle = 'rgba(0,0,0,.5)'; X.lineWidth = s * .02; X.beginPath(); X.moveTo(x, y - s * .38); X.lineTo(x, y + s * .28); X.stroke();
      brillo(X, x - s * .13, y - s * .2, s * .07, s * .12); brillo(X, x + s * .1, y - s * .24, s * .03, s * .06);
      X.beginPath(); X.ellipse(x, y + s * .32, s * .16, s * .11, 0, 0, 7); X.fillStyle = '#2b2150'; X.fill(); borde(X, s);
      X.beginPath(); X.moveTo(x - s * .03, y + s * .38); X.quadraticCurveTo(x, y + s * .56, x + s * .06, y + s * .5); X.quadraticCurveTo(x + s * .03, y + s * .44, x + s * .04, y + s * .38); X.fillStyle = '#d9c9ff'; X.fill();
      ojos(X, x, y + s * .3, s * .04, s * .085, 1, 1, false);
    },
    rata(X, x, y, s, o) {
      s *= 1.3; sombra(X, x, y + s * .32, s * .3);
      X.strokeStyle = '#e88aa0'; X.lineWidth = s * .04; X.lineCap = 'round'; X.beginPath(); X.moveTo(x, y - s * .3); X.bezierCurveTo(x + Math.sin(o.t * 4) * s * .3, y - s * .45, x - Math.sin(o.t * 4) * s * .3, y - s * .55, x + Math.sin(o.t * 4 + 1) * s * .15, y - s * .7); X.stroke(); X.lineCap = 'butt';
      X.beginPath(); X.ellipse(x, y - s * .05, s * .27, s * .3, 0, 0, 7); X.fillStyle = rad(X, x, y - s * .05, s * .3, '#c9c9d6', '#55556a'); X.fill(); borde(X, s);
      for (const k of [-1, 1]) { X.beginPath(); X.arc(x + k * s * .17, y + s * .12, s * .1, 0, 7); X.fillStyle = '#8a8a9c'; X.fill(); borde(X, s); X.beginPath(); X.arc(x + k * s * .17, y + s * .12, s * .06, 0, 7); X.fillStyle = '#ffb3c6'; X.fill(); }
      X.beginPath(); X.ellipse(x, y + s * .22, s * .17, s * .16, 0, 0, 7); X.fillStyle = rad(X, x, y + s * .2, s * .17, '#dedeea', '#6a6a80'); X.fill(); borde(X, s);
      X.fillStyle = '#ff6f91'; X.beginPath(); X.arc(x, y + s * .37, s * .035, 0, 7); X.fill();
      X.strokeStyle = 'rgba(40,40,50,.6)'; X.lineWidth = s * .01; for (const k of [-1, 1]) for (const d of [-.02, .02]) { X.beginPath(); X.moveTo(x + k * s * .04, y + s * .35); X.lineTo(x + k * s * .2, y + s * (.33 + d * 3)); X.stroke(); }
      ojos(X, x, y + s * .2, s * .045, s * .07, 1, 1, false);
      X.beginPath(); X.moveTo(x - s * .12, y - s * .02); X.lineTo(x - s * .12, y - s * .14); X.lineTo(x - s * .06, y - s * .08); X.lineTo(x, y - s * .17); X.lineTo(x + s * .06, y - s * .08); X.lineTo(x + s * .12, y - s * .14); X.lineTo(x + s * .12, y - s * .02); X.closePath();
      X.fillStyle = rad(X, x, y - s * .08, s * .14, '#fff3a0', '#e0a000'); X.fill(); borde(X, s);
    },
  };
  function gota(X, x, y, r) {
    const g = X.createRadialGradient(x - r * .3, y - r * .2, r * .1, x, y + r * .2, r * 1.3); g.addColorStop(0, '#f2fcff'); g.addColorStop(.4, '#5cc8ff'); g.addColorStop(1, '#1565c0');
    X.beginPath(); X.moveTo(x, y - r * 1.45); X.bezierCurveTo(x + r * 1.1, y - r * .2, x + r, y + r, x, y + r); X.bezierCurveTo(x - r, y + r, x - r * 1.1, y - r * .2, x, y - r * 1.45);
    X.fillStyle = g; X.fill(); X.strokeStyle = 'rgba(10,50,110,.6)'; X.lineWidth = Math.max(1, r * .12); X.stroke();
    X.fillStyle = 'rgba(255,255,255,.85)'; X.beginPath(); X.ellipse(x - r * .35, y - r * .15, r * .18, r * .3, -.4, 0, 7); X.fill();
  }
  function icono(cv, k, tam) {
    const dpr = Math.min(2, devicePixelRatio || 1), X = cv.getContext('2d'); X.setTransform(dpr, 0, 0, dpr, 0, 0); X.clearRect(0, 0, tam, tam);
    (DIB[k] || PLAGA[k])(X, tam / 2, tam / 2 + tam * .02, tam * (PLAGA[k] ? .78 : .95), { t: 1, f: 0, frac: 1, armado: true, timer: 0, kick: 0 });
  }

  // ---------- Mapa de niveles ----------
  function mapa(t) {
    salir(); registrar(t.id);
    const J = datos(), act = Math.min(J.nivel || 1, TOTAL), est = J.estrellas || {}, totE = Object.values(est).reduce((a, b) => a + b, 0);
    stage(`<div class="card" style="padding:14px;background:linear-gradient(165deg,#2a8a4a,#0f3d2a 70%);border:0">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:1.2rem">🌱 Huerto Defensor</b><span>🪙 ${PERFIL.datos.monedas} · ⭐ ${totE}/${TOTAL * 3}</span></div>
      <p class="sub" style="text-align:left;margin:6px 0 10px;color:#d9f7e2">Planta defensores y frena a las plagas antes de que lleguen a tu casa. Tu avance se guarda solo.</p>
      <button class="btn" id="jg">▶ ${act > 1 ? 'Continuar · ' : 'Jugar · '}Nivel ${act}</button>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:12px">${[...Array(TOTAL).keys()].map(i => { const n = i + 1, ok = n <= act, e = est[n] || 0, jefe = n % 5 === 0;
        return `<button data-n="${n}" ${ok ? '' : 'disabled'} style="aspect-ratio:1;border-radius:16px;border:${n === act ? '3px solid #fff' : '2px solid rgba(255,255,255,.18)'};background:${ok ? (e ? 'linear-gradient(160deg,#ffe066,#e8a100)' : 'linear-gradient(160deg,#6ee7a0,#15803d)') : 'rgba(0,0,0,.3)'};color:${e ? '#3a2600' : '#fff'};font:900 1.05rem Figtree,sans-serif;cursor:${ok ? 'pointer' : 'default'};position:relative;${n === act ? 'animation:late 1.6s infinite;box-shadow:0 0 0 0 #fff' : ''}">${ok ? n : '🔒'}${jefe ? '<span style="position:absolute;top:-8px;right:-6px;font-size:.9rem">🐀</span>' : ''}<span style="display:block;font-size:.55rem;letter-spacing:-1px;margin-top:2px">${ok && e ? '⭐'.repeat(e) : ''}</span></button>`; }).join('')}</div>
      <h3 style="margin:16px 0 8px">Tus defensores</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px">${ORDEN.map(k => { const ok = DEF[k].desde <= act; return `<div style="background:rgba(0,0,0,.25);border-radius:14px;padding:8px 4px;text-align:center;${ok ? '' : 'opacity:.45'}"><canvas data-ic="${k}" style="width:56px;height:56px;${ok ? '' : 'filter:grayscale(1) brightness(.5)'}"></canvas><b style="display:block;font-size:.75rem">${ok ? DEF[k].n : '🔒 Nivel ' + DEF[k].desde}</b><small style="font-size:.68rem;opacity:.85">${ok ? DEF[k].d : ''}</small></div>`; }).join('')}</div>
      <h3 style="margin:16px 0 8px">Las plagas</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px">${Object.keys(ENE).map(k => { const ok = ENE[k].desde <= act; return `<div style="background:rgba(0,0,0,.25);border-radius:14px;padding:8px 4px;text-align:center;${ok ? '' : 'opacity:.45'}"><canvas data-ic="${k}" style="width:56px;height:56px;${ok ? '' : 'filter:brightness(0)'}"></canvas><b style="display:block;font-size:.75rem">${ok ? ENE[k].n : '???'}</b><small style="font-size:.68rem;opacity:.85">${ok ? ENE[k].d : 'Aparece en el nivel ' + ENE[k].desde}</small></div>`; }).join('')}</div></div>`);
    const dpr = Math.min(2, devicePixelRatio || 1);
    document.querySelectorAll('[data-ic]').forEach(c => { c.width = 56 * dpr; c.height = 56 * dpr; icono(c, c.dataset.ic, 56); });
    $('#stage').onclick = e => { const b = e.target.closest('[data-n]'); if (b && !b.disabled) nivel(t, +b.dataset.n); if (e.target.id === 'jg') nivel(t, act); };
    setParar(() => { $('#stage').onclick = null; });
  }

  // ---------- Un nivel ----------
  function nivel(t, n) {
    salir(); scrollTo(0, 0); $('#stage').onclick = null;
    const C = cfg(n), tipos = desbloq(n), dpr = Math.min(2, devicePixelRatio || 1);
    const ancho = Math.min(($('#stage').clientWidth || 360) - 16, 460), S = Math.floor(Math.max(52, Math.min(ancho / L, (innerHeight - 250) / 8.25))), W = S * L, TOP = S * .75, BOT = S * .5, H = TOP + R * S + BOT;
    const chico = 'width:auto;margin:0;padding:5px 10px;font-size:.85rem';
    stage(`<div class="card" style="padding:8px;user-select:none;-webkit-user-select:none">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px"><button class="btn alt" id="vm" style="${chico}">🗺️ Mapa</button><b>🌱 Nivel ${n}</b><span style="display:flex;gap:6px"><button class="btn alt" id="vel" style="${chico}">⏩ x1</button><button class="btn alt" id="pau" style="${chico}">⏸</button></span></div>
      <canvas id="cv" width="${W * dpr}" height="${H * dpr}" style="width:${W}px;height:${H}px;display:block;margin:0 auto;border-radius:16px;touch-action:none;box-shadow:0 10px 30px rgba(0,0,0,.35)"></canvas>
      <div id="semillas" style="display:flex;gap:6px;overflow-x:auto;padding:8px 2px 2px;align-items:stretch;justify-content:${tipos.length < 5 ? 'center' : 'flex-start'}">
        <div style="flex:0 0 auto;min-width:60px;border-radius:14px;background:linear-gradient(160deg,#38bdf8,#1e3a8a);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;color:#fff;box-shadow:inset 0 0 0 2px rgba(255,255,255,.25)"><span style="font-size:1.3rem">💧</span><span id="aguaN" style="font-size:1.05rem">${C.agua}</span></div>
        ${tipos.map(k => `<button class="semi" data-k="${k}" title="${DEF[k].n}" style="position:relative;flex:0 0 auto;width:62px;border:2px solid rgba(255,255,255,.22);border-radius:14px;background:linear-gradient(180deg,#5b3d22,#2a1a0c);padding:3px 0;color:#fff;cursor:pointer;overflow:hidden;transition:transform .15s,border-color .15s"><canvas data-sc="${k}" style="width:52px;height:52px;display:block;margin:0 auto;pointer-events:none"></canvas><small style="font-weight:900;font-size:.75rem;pointer-events:none">💧${DEF[k].costo}</small><i style="position:absolute;left:0;right:0;top:0;background:rgba(0,0,0,.6);height:0%;pointer-events:none"></i></button>`).join('')}
        <button class="semi" data-k="pala" title="Quitar un defensor" style="flex:0 0 auto;width:56px;border:2px solid rgba(255,255,255,.22);border-radius:14px;background:linear-gradient(180deg,#6b7280,#374151);color:#fff;cursor:pointer;font-size:1.5rem">✋<small style="display:block;font-size:.65rem;font-weight:800">Quitar</small></button>
      </div></div>`);
    document.querySelectorAll('[data-sc]').forEach(c => { c.width = 52 * dpr; c.height = 52 * dpr; icono(c, c.dataset.sc, 52); });
    const cv = $('#cv'), X = cv.getContext('2d'); X.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fondo = document.createElement('canvas'); fondo.width = W * dpr; fondo.height = H * dpr; pintarFondo(fondo.getContext('2d'));
    const cx = c => c * S + S / 2, cy = r => TOP + r * S + S / 2;
    let agua = C.agua, vidas = 3, tj = 0, vel = 1, pausa = false, vivo = true, fin = false, sel = null, pala = false, raf, last = performance.now(), evI = 0, puntos = 0, shake = 0, rojo = 0, avisoOla = false, lluvia = 5, perdio = false, ultAviso = 0, tutorial = n === 1 ? 1 : 0, ultBarra = 0;
    const defs = new Map(), enes = [], balas = [], gotas = [], parts = [], ondas = [], textos = [], cool = {};
    tipos.forEach(k => cool[k] = ['hongo', 'choclo', 'coco'].includes(k) ? 0 : DEF[k].carga * .5);

    function pintarFondo(F) {
      F.setTransform(dpr, 0, 0, dpr, 0, 0); const r = rng(n * 31 + 7);
      const cielo = F.createLinearGradient(0, 0, 0, TOP); cielo.addColorStop(0, '#0d3b24'); cielo.addColorStop(1, '#1d6b3a'); F.fillStyle = cielo; F.fillRect(0, 0, W, TOP + 2);
      for (let i = 0; i < 16; i++) { const x = r() * W, rr = S * (.25 + r() * .3); F.fillStyle = ['#14532d', '#166534', '#1f7a3e'][i % 3]; F.beginPath(); F.arc(x, TOP * .55 + r() * TOP * .3, rr, 0, 7); F.fill(); }
      for (let i = 0; i < 9; i++) { const x = r() * W; F.fillStyle = 'rgba(180,255,190,.18)'; F.beginPath(); F.arc(x, TOP * .45 + r() * TOP * .3, S * .07, 0, 7); F.fill(); }
      for (let c = 0; c < L; c++) for (let rr = 0; rr < R; rr++) {
        const act = C.carriles.includes(c), x0 = c * S, y0 = TOP + rr * S;
        F.fillStyle = act ? ((c + rr) % 2 ? '#5cb845' : '#6cc653') : ((c + rr) % 2 ? '#8a6a45' : '#977552'); F.fillRect(x0, y0, S, S);
        if (act) { F.strokeStyle = 'rgba(30,90,20,.35)'; F.lineWidth = 1.2; for (let k = 0; k < 7; k++) { const gx = x0 + r() * S, gy = y0 + r() * S; F.beginPath(); F.moveTo(gx, gy); F.lineTo(gx + (r() - .5) * 4, gy - 5 - r() * 4); F.stroke(); }
          if (r() < .18) { const fx = x0 + S * .15 + r() * S * .7, fy = y0 + S * .15 + r() * S * .7; F.fillStyle = ['#fff', '#ffe066', '#ff9fc6'][Math.floor(r() * 3)]; for (let p = 0; p < 5; p++) { F.beginPath(); F.arc(fx + Math.cos(p * 1.26) * 2.6, fy + Math.sin(p * 1.26) * 2.6, 2, 0, 7); F.fill(); } F.fillStyle = '#f59e0b'; F.beginPath(); F.arc(fx, fy, 1.6, 0, 7); F.fill(); } }
        else { F.strokeStyle = 'rgba(60,35,15,.35)'; F.lineWidth = 2; for (let k = 1; k < 4; k++) { F.beginPath(); F.moveTo(x0 + 4, y0 + k * S / 4); F.lineTo(x0 + S - 4, y0 + k * S / 4); F.stroke(); } }
      }
      F.fillStyle = 'rgba(0,0,0,.08)'; for (let c = 1; c < L; c++) F.fillRect(c * S - 1, TOP, 2, R * S);
      const sh = F.createLinearGradient(0, TOP, 0, TOP + S * .4); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); F.fillStyle = sh; F.fillRect(0, TOP, W, S * .4);
      const yb = TOP + R * S; F.fillStyle = '#c9a26b'; F.fillRect(0, yb, W, BOT); F.fillStyle = 'rgba(120,80,40,.3)'; for (let i = 0; i < 20; i++) { F.beginPath(); F.ellipse(r() * W, yb + r() * BOT, 5 + r() * 6, 3, 0, 0, 7); F.fill(); }
      F.fillStyle = '#8b5a2b'; F.fillRect(0, yb + BOT * .25, W, BOT * .12); F.fillRect(0, yb + BOT * .6, W, BOT * .12);
      for (let x = S * .1; x < W; x += S * .34) { F.beginPath(); F.moveTo(x, yb + BOT * .95); F.lineTo(x, yb + BOT * .12); F.lineTo(x + S * .07, yb); F.lineTo(x + S * .14, yb + BOT * .12); F.lineTo(x + S * .14, yb + BOT * .95); F.fillStyle = '#b07a42'; F.fill(); F.strokeStyle = 'rgba(60,30,10,.6)'; F.lineWidth = 1.2; F.stroke(); }
      const vg = F.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)'); F.fillStyle = vg; F.fillRect(0, 0, W, H);
    }
    const chispas = (x, y, c, k, f = 1) => { for (let i = 0; i < k; i++) { const a = Math.random() * 7, v = (1 + Math.random() * 3) * f * S / 60; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S / 50, v: .6 + Math.random() * .4, max: 1, r: S * (.025 + Math.random() * .035), c }); } };
    const banner = (txt, tam = S * .42, dur = 2.2) => { for (const x of textos) if (x.fijo === 1) x.v = Math.min(x.v, .15); textos.push({ txt, x: W / 2, y: TOP + R * S * .42, tam, v: dur, max: dur, fijo: 1 }); };
    const aviso = txt => { if (performance.now() - ultAviso < 1200) return; ultAviso = performance.now(); textos.push({ txt, x: W / 2, y: TOP + R * S * .7, tam: S * .26, v: 1.6, max: 1.6, fijo: 2 }); FX.son('error'); };
    function explotar(x, y, alto, dmg, c, ancho) {
      for (const e of enes) if (e.hp > 0 && Math.abs(e.c - c) <= ancho && Math.abs(e.y - y) <= alto) herir(e, dmg);
      ondas.push({ x, y, r: 0, max: S * (ancho ? 1.6 : .9), v: .45 }); shake = .45; FX.son('tronera'); FX.vibrar(90);
      for (let i = 0; i < 34; i++) { const a = Math.random() * 7, v = (1.5 + Math.random() * 4) * S / 50; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, v: .5 + Math.random() * .5, max: 1, r: S * (.04 + Math.random() * .06), c: ['#fff3a0', '#ffb703', '#fb5607', '#ff006e'][i % 4] }); }
    }
    const herir = (e, d) => { e.hp -= d; e.flash = 1; };
    function disparar(d, segundo) {
      balas.push({ x: d.x, y: d.y - S * .3, c: d.c, tipo: d.k === 'limon' ? 'hielo' : d.k === 'palta' ? 'pepa' : 'grano', dmg: d.k === 'limon' ? 22 : 26 });
      d.kick = 1; if (d.k === 'palta' && !segundo) d.doble = .2;
    }
    function recoger(g) { g.vuela = .001; g.x0 = g.x; g.y0 = g.y; FX.son('punto'); FX.vibrar(8); if (tutorial === 2) tutorial = 3; }

    function update(dt) {
      tj += dt;
      for (const k in cool) cool[k] = Math.max(0, cool[k] - dt);
      while (evI < C.ev.length && C.ev[evI].t <= tj) { const e = C.ev[evI++], d = ENE[e.tipo]; enes.push({ tipo: e.tipo, c: e.c, x: cx(e.c), y: TOP - S * .45, hp: d.hp, max: d.hp, lento: 0, f: Math.random() * 9, t: 0, flash: 0, salto: 0, saltado: false, come: false }); if (e.tipo === 'rata') { banner('🐀 ¡Llegó la rata jefa!', S * .34); FX.son('error'); } }
      if (!avisoOla && tj >= C.ola - 2) { avisoOla = true; banner('🚨 ¡Gran oleada!', S * .5, 2.6); FX.son('error'); FX.vibrar([60, 60, 60]); }
      lluvia -= dt; if (lluvia <= 0) { lluvia = 7 + Math.random() * 3.5; const c = C.carriles[Math.floor(Math.random() * C.carriles.length)]; gotas.push({ x: cx(c) + (Math.random() - .5) * S * .4, y: -S * .3, ty: TOP + S * (.8 + Math.random() * (R - 1.8)), v: 11, val: 25, vuela: 0, cae: .9 }); if (tutorial === 1) tutorial = 2; }
      for (const d of defs.values()) {
        d.t += dt; d.kick = Math.max(0, d.kick - dt * 5); d.nace = Math.max(0, d.nace - dt * 4); d.golpe = Math.max(0, (d.golpe || 0) - dt);
        if (d.k === 'hongo') { d.timer += dt; d.carga = d.timer / (d.prim ? 5 : 11); if (d.carga >= 1) { d.timer = 0; d.prim = false; d.kick = 1; gotas.push({ x: d.x, y: d.y - S * .3, ty: d.y + S * .1, x2: d.x + (Math.random() < .5 ? -1 : 1) * S * .28, v: 11, val: 25, vuela: 0, cae: 2.4 }); } }
        else if (d.k === 'aji') { d.timer += dt; if (d.timer >= .9) { explotar(d.x, d.y, S * 1.6, 1800, d.c, 1); defs.delete(d.key); } }
        else if (d.k === 'pina') { d.timer += dt; if (!d.armado && d.timer >= 12) { d.armado = true; chispas(d.x, d.y + S * .2, '#8b5a2b', 10); FX.son('click'); } }
        else if (d.k !== 'coco') {
          const hay = enes.some(e => e.c === d.c && e.hp > 0 && e.y < d.y && e.y > TOP - S * .5);
          d.timer = hay ? d.timer + dt : Math.min(d.timer + dt, 1.1);
          if (hay && d.timer >= (d.k === 'limon' ? 1.6 : 1.45)) { d.timer = 0; disparar(d); }
          if (d.doble > 0) { d.doble -= dt; if (d.doble <= 0) disparar(d, true); }
        }
      }
      for (const b of balas) {
        b.y -= S * 6.5 * dt; if (b.y < -S) b.fuera = 1;
        for (const e of enes) if (e.hp > 0 && e.c === b.c && e.salto <= 0 && b.y <= e.y + S * .3 && b.y >= e.y - S * .5) { herir(e, b.dmg); if (b.tipo === 'hielo') e.lento = 3.5; b.fuera = 1; chispas(b.x, b.y, b.tipo === 'hielo' ? '#c8f6ff' : b.tipo === 'pepa' ? '#a0682f' : '#ffd84d', 5, .7); break; }
      }
      for (let i = balas.length - 1; i >= 0; i--) if (balas[i].fuera) balas.splice(i, 1);
      for (const e of enes) {
        if (e.hp <= 0) continue;
        e.t += dt; e.flash = Math.max(0, e.flash - dt * 6); e.lento = Math.max(0, e.lento - dt);
        if (e.salto > 0) { e.salto -= dt; const p = 1 - Math.max(0, e.salto) / .6; e.y = e.s0 + (e.s1 - e.s0) * p; continue; }
        let blk = null; for (const d of defs.values()) if (d.c === e.c && d.y > e.y && d.y - e.y < S * .62) { blk = d; break; }
        if (blk && blk.k === 'pina' && blk.armado) { defs.delete(blk.key); explotar(blk.x, blk.y, S * .75, 1800, blk.c, 0); continue; }
        if (blk && e.tipo === 'langosta' && !e.saltado) { e.saltado = true; e.salto = .6; e.s0 = e.y; e.s1 = blk.y + S * .5; FX.son('swish'); continue; }
        if (blk && blk.k !== 'aji') { e.come = true; blk.hp -= (e.tipo === 'rata' ? 240 : 110) * dt; blk.golpe = .12; if (Math.random() < dt * 5) chispas(blk.x, blk.y - S * .25, '#9be36b', 2, .5);
          if (blk.hp <= 0) { defs.delete(blk.key); chispas(blk.x, blk.y, '#7a5a2a', 14); FX.son('choque'); FX.vibrar(30); } }
        else { e.come = false; e.y += ENE[e.tipo].vel * S * (e.lento > 0 ? .5 : 1) * dt; }
        if (e.y > TOP + R * S + S * .1) { e.hp = 0; e.llego = 1; vidas--; rojo = 1; shake = .5; FX.son('perder'); FX.vibrar([120, 60, 120]); banner(vidas > 0 ? `💔 ¡Una plaga entró! Quedan ${vidas}` : '💔', S * .3, 1.8); if (vidas <= 0) { perder(); return; } }
      }
      for (let i = enes.length - 1; i >= 0; i--) { const e = enes[i]; if (e.hp <= 0) { if (!e.llego) { puntos += ENE[e.tipo].pts; chispas(e.x, e.y, '#c6f06a', 12); chispas(e.x, e.y, '#ffffff', 6, 1.4); FX.son('punto'); } enes.splice(i, 1); } }
      for (const g of gotas) {
        if (g.vuela) { g.vuela += dt * 2.6; const p = Math.min(1, g.vuela), q = p * p; g.x = g.x0 + (S * .4 - g.x0) * q; g.y = g.y0 + (H + S * .3 - g.y0) * q; if (p >= 1) { agua += g.val; g.fuera = 1; } continue; }
        if (g.y < g.ty) { g.y = Math.min(g.ty, g.y + S * g.cae * dt); if (g.x2 != null) g.x += (g.x2 - g.x) * Math.min(1, dt * 5); } else { g.v -= dt; if (g.v <= 0) g.fuera = 1; }
      }
      for (let i = gotas.length - 1; i >= 0; i--) if (gotas[i].fuera) gotas.splice(i, 1);
      if (evI >= C.ev.length && !enes.length && !fin) ganar();
    }

    function dibujar(dt) {
      for (const p of parts) { p.x += p.vx * 60 * dt; p.y += p.vy * 60 * dt; p.vy += S / 400 * 60 * dt; p.v -= dt; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].v <= 0) parts.splice(i, 1);
      for (const o of ondas) { o.v -= dt; o.r = o.max * (1 - Math.max(0, o.v) / .45); }
      for (let i = ondas.length - 1; i >= 0; i--) if (ondas[i].v <= 0) ondas.splice(i, 1);
      for (const tx of textos) { tx.v -= dt; if (!tx.fijo) tx.y -= S * .5 * dt; }
      for (let i = textos.length - 1; i >= 0; i--) if (textos[i].v <= 0) textos.splice(i, 1);
      shake = Math.max(0, shake - dt); rojo = Math.max(0, rojo - dt * 1.5);
      X.save(); if (shake > 0) X.translate((Math.random() - .5) * S * .25 * shake, (Math.random() - .5) * S * .25 * shake);
      X.drawImage(fondo, 0, 0, W, H);
      if (sel) { X.fillStyle = `rgba(255,255,255,${.1 + .07 * Math.sin(performance.now() / 160)})`; for (const c of C.carriles) for (let r = 0; r < R; r++) if (!defs.has(c * R + r)) { X.beginPath(); X.roundRect(c * S + 4, TOP + r * S + 4, S - 8, S - 8, 10); X.fill(); } }
      if (pala) { X.strokeStyle = 'rgba(255,90,90,.85)'; X.lineWidth = 3; for (const d of defs.values()) { X.beginPath(); X.roundRect(d.c * S + 4, TOP + d.r * S + 4, S - 8, S - 8, 10); X.stroke(); } }
      const todo = [...[...defs.values()].map(d => ({ z: d.y + S * .1, d })), ...enes.map(e => ({ z: e.y, e }))].sort((a, b) => a.z - b.z);
      for (const it of todo) {
        if (it.d) { const d = it.d, sc = 1 - d.nace * .7; X.save(); X.translate(d.x, d.y + S * .3); X.scale(sc, sc); X.translate(-d.x, -(d.y + S * .3)); if (d.golpe > 0) X.translate(Math.sin(performance.now() / 20) * S * .02, 0);
          DIB[d.k](X, d.x, d.y, S, { t: d.t, f: d.f, kick: d.kick, frac: d.hp / d.max, armado: d.armado, timer: d.timer, carga: d.carga || 0 }); X.restore(); }
        else { const e = it.e; if (e.flash > .4) X.filter = 'brightness(1.9)';
          PLAGA[e.tipo](X, e.x + (e.come ? Math.sin(e.t * 14) * S * .015 : 0), e.y, S, { t: e.t + e.f, frac: e.hp / e.max, come: e.come, salto: e.salto });
          X.filter = 'none';
          if (e.lento > 0) { X.fillStyle = 'rgba(140,220,255,.32)'; X.beginPath(); X.ellipse(e.x, e.y, S * .32, S * .4, 0, 0, 7); X.fill(); X.fillStyle = '#e8fbff'; for (let k = 0; k < 3; k++) { const a = e.t * 2 + k * 2.1; X.beginPath(); X.arc(e.x + Math.cos(a) * S * .3, e.y + Math.sin(a) * S * .3, S * .025, 0, 7); X.fill(); } }
          if (e.hp < e.max) { const w = S * .5; X.fillStyle = 'rgba(0,0,0,.5)'; X.beginPath(); X.roundRect(e.x - w / 2, e.y - S * .55, w, 5, 3); X.fill(); X.fillStyle = e.hp / e.max > .5 ? '#4ade80' : e.hp / e.max > .25 ? '#facc15' : '#ef4444'; X.beginPath(); X.roundRect(e.x - w / 2, e.y - S * .55, w * Math.max(0, e.hp / e.max), 5, 3); X.fill(); } }
      }
      for (const b of balas) {
        if (b.tipo === 'hielo') { X.shadowColor = '#7fe3ff'; X.shadowBlur = 10; X.fillStyle = '#d8f8ff'; X.beginPath(); X.arc(b.x, b.y, S * .08, 0, 7); X.fill(); X.shadowBlur = 0; }
        else { const r = b.tipo === 'pepa' ? S * .085 : S * .065; X.fillStyle = 'rgba(255,255,255,.25)'; X.beginPath(); X.ellipse(b.x, b.y + r * 1.6, r * .6, r * 1.4, 0, 0, 7); X.fill(); X.beginPath(); X.arc(b.x, b.y, r, 0, 7); X.fillStyle = rad(X, b.x, b.y, r, b.tipo === 'pepa' ? '#e0a46a' : '#fff6a8', b.tipo === 'pepa' ? '#6b3a17' : '#e0a000'); X.fill(); X.strokeStyle = 'rgba(60,30,0,.5)'; X.lineWidth = 1; X.stroke(); }
      }
      for (const o of ondas) { X.strokeStyle = `rgba(255,200,80,${Math.max(0, o.v / .45)})`; X.lineWidth = S * .12 * Math.max(.1, o.v / .45); X.beginPath(); X.arc(o.x, o.y, o.r, 0, 7); X.stroke(); X.fillStyle = `rgba(255,240,180,${Math.max(0, o.v / .45) * .35})`; X.fill(); }
      for (const p of parts) { X.globalAlpha = Math.max(0, p.v / p.max); X.fillStyle = p.c; X.beginPath(); X.arc(p.x, p.y, p.r, 0, 7); X.fill(); } X.globalAlpha = 1;
      for (const g of gotas) { const bob = g.vuela ? 0 : Math.sin(performance.now() / 300 + g.ty) * S * .03; X.globalAlpha = g.v < 3 && !g.vuela ? (Math.sin(performance.now() / 80) > 0 ? 1 : .35) : 1; X.shadowColor = '#7fd3ff'; X.shadowBlur = 14; gota(X, g.x, g.y + bob, S * .17 * (g.vuela ? 1 - g.vuela * .4 : 1)); X.shadowBlur = 0; X.globalAlpha = 1; }
      // Indicaciones del primer nivel
      if (tutorial === 1 && !defs.size) { const k = sel ? 'Toca una casilla del huerto' : 'Elige un defensor abajo 👇'; X.font = `900 ${S * .24}px Figtree,sans-serif`; X.textAlign = 'center'; X.lineWidth = 5; X.strokeStyle = 'rgba(0,0,0,.6)'; X.strokeText(k, W / 2, TOP + R * S * .55); X.fillStyle = '#fff'; X.fillText(k, W / 2, TOP + R * S * .55); }
      if (tutorial === 2 && gotas.some(g => !g.vuela)) { const g = gotas.find(g => !g.vuela), y = g.y - S * .45 + Math.sin(performance.now() / 150) * 4; X.font = `900 ${S * .22}px Figtree,sans-serif`; X.textAlign = 'center'; X.lineWidth = 5; X.strokeStyle = 'rgba(0,0,0,.6)'; X.strokeText('¡Tócala! 👆', g.x, y); X.fillStyle = '#fff'; X.fillText('¡Tócala! 👆', g.x, y); }
      for (const tx of textos) { const a = Math.min(1, tx.v / .35, (tx.max - tx.v) / .15 + .2), sc = tx.fijo ? 1 + Math.max(0, .25 - (tx.max - tx.v)) * 1.5 : 1; X.globalAlpha = Math.max(0, a); X.font = `900 ${tx.tam * sc}px Figtree,sans-serif`; X.textAlign = 'center'; X.lineWidth = Math.max(4, tx.tam * .16); X.strokeStyle = 'rgba(40,10,20,.75)'; X.strokeText(tx.txt, tx.x, tx.y); X.fillStyle = '#fff'; X.fillText(tx.txt, tx.x, tx.y); } X.globalAlpha = 1;
      X.restore();
      // HUD: avance del nivel y vidas
      const bx = S * .25, bw = W - S * 1.9, by = TOP * .36, prog = Math.min(1, tj / (C.ultimo + 2)), mo = C.ola / (C.ultimo + 2);
      X.fillStyle = 'rgba(0,0,0,.45)'; X.beginPath(); X.roundRect(bx, by, bw, S * .17, S * .09); X.fill();
      const gr = X.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#a3e635'); gr.addColorStop(1, '#f97316'); X.fillStyle = gr; X.beginPath(); X.roundRect(bx + 2, by + 2, Math.max(0, (bw - 4) * prog), S * .17 - 4, S * .08); X.fill();
      X.font = `${S * .24}px sans-serif`; X.textAlign = 'center'; X.fillText('🚩', bx + bw * mo, by + S * .05); X.fillText('🐛', bx + bw * prog, by + S * .16);
      X.font = `${S * .26}px sans-serif`; for (let i = 0; i < 3; i++) X.fillText(i < vidas ? '❤️' : '🖤', W - S * 1.35 + i * S * .42, by + S * .2);
      if (rojo > 0) { const vg = X.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, H * .7); vg.addColorStop(0, 'rgba(255,0,0,0)'); vg.addColorStop(1, `rgba(255,0,40,${rojo * .5})`); X.fillStyle = vg; X.fillRect(0, 0, W, H); }
      if (pausa && !fin) { X.fillStyle = 'rgba(10,10,30,.55)'; X.fillRect(0, 0, W, H); X.font = `900 ${S * .5}px Figtree,sans-serif`; X.fillStyle = '#fff'; X.textAlign = 'center'; X.fillText('⏸ Pausa', W / 2, H / 2); }
    }
    function barra(now) {
      if (now - ultBarra < 100) return; ultBarra = now;
      $('#aguaN').textContent = agua;
      document.querySelectorAll('#semillas .semi').forEach(b => { const k = b.dataset.k, on = k === 'pala' ? pala : sel === k; b.style.borderColor = on ? '#ffd166' : 'rgba(255,255,255,.22)'; b.style.transform = on ? 'translateY(-4px)' : '';
        if (k === 'pala') return; const D = DEF[k]; b.querySelector('i').style.height = (cool[k] / D.carga * 100) + '%'; b.style.opacity = agua >= D.costo ? 1 : .55; });
    }
    const bucle = now => { if (!vivo) return; const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!pausa && !fin && !document.hidden) for (let i = 0; i < vel && !fin; i++) update(dt);
      dibujar(pausa ? 0 : dt); barra(now); raf = requestAnimationFrame(bucle); };
    raf = requestAnimationFrame(bucle);

    // ---- toques ----
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); if (pausa || fin) return; const p = pos(e);
      let mejor = null, dm = S * .55; for (const g of gotas) if (!g.vuela) { const d = Math.hypot(g.x - p.x, g.y - p.y); if (d < dm) { dm = d; mejor = g; } }
      if (mejor) return recoger(mejor);
      const c = Math.floor(p.x / S), r = Math.floor((p.y - TOP) / S); if (c < 0 || c >= L || r < 0 || r >= R) return;
      const key = c * R + r;
      if (pala) { const d = defs.get(key); if (d) { defs.delete(key); chispas(d.x, d.y, '#8b5a2b', 10); FX.son('click'); } pala = false; return; }
      if (!sel) { if (!defs.has(key)) aviso('Elige un defensor abajo 👇'); return; }
      if (!C.carriles.includes(c)) return aviso('Esa fila no está cultivada');
      if (defs.has(key)) return aviso('Ahí ya hay un defensor');
      const D = DEF[sel]; if (agua < D.costo) return aviso('Te falta agua 💧'); if (cool[sel] > 0) return aviso('Aún se está recargando');
      agua -= D.costo; cool[sel] = D.carga;
      defs.set(key, { key, k: sel, c, r, x: cx(c), y: cy(r), hp: D.hp, max: D.hp, t: 0, timer: sel === 'hongo' ? 0 : 1, kick: 0, f: Math.random() * 9, prim: true, armado: false, doble: 0, nace: 1, carga: 0 });
      chispas(cx(c), cy(r) + S * .3, '#8b5a2b', 8, .6); FX.son('punto'); FX.vibrar(12); sel = null;
    });
    $('#semillas').onclick = e => { const b = e.target.closest('.semi'); if (!b || fin) return; const k = b.dataset.k;
      if (k === 'pala') { pala = !pala; sel = null; } else { if (cool[k] > 0) return aviso('Aún se está recargando'); if (agua < DEF[k].costo) return aviso('Te falta agua 💧'); sel = sel === k ? null : k; pala = false; }
      FX.son('click'); };
    $('#vel').onclick = () => { vel = vel === 1 ? 2 : 1; $('#vel').textContent = vel === 1 ? '⏩ x1' : '⏩ x2'; };
    $('#pau').onclick = () => { if (fin) return; pausa = !pausa; $('#pau').textContent = pausa ? '▶' : '⏸'; };
    $('#vm').onclick = () => { vivo = false; mapa(t); };
    const alSalir = () => { if (document.hidden && !fin) { pausa = true; const b = $('#pau'); if (b) b.textContent = '▶'; } };
    document.addEventListener('visibilitychange', alSalir);
    setParar(() => { vivo = false; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', alSalir); document.querySelectorAll('.modal:not(#gate)').forEach(m => m.remove()); });

    // Presentación de novedades del nivel
    const nuevosD = tipos.filter(k => DEF[k].desde === n), nuevasP = Object.keys(ENE).filter(k => ENE[k].desde === n);
    if (nuevosD.length || nuevasP.length) {
      pausa = true;
      modal(`<h2>${n === 1 ? '🌱 Conoce a tu equipo' : nuevosD.length ? '🎉 ¡Nuevo defensor!' : '⚠️ ¡Nueva plaga!'}</h2>${[...nuevosD.map(k => [k, DEF[k].n, DEF[k].d]), ...nuevasP.map(k => [k, ENE[k].n, ENE[k].d])].map(([k, nm, d]) => `<div style="display:flex;align-items:center;gap:12px;text-align:left;background:rgba(255,255,255,.06);border-radius:14px;padding:8px;margin:8px 0"><canvas data-nv="${k}" style="width:72px;height:72px;flex:0 0 72px"></canvas><div><b>${nm}</b><br><small class="sub" style="margin:0">${d}</small></div></div>`).join('')}<button class="btn" id="ok">¡A jugar!</button>`, d => {
        d.querySelectorAll('[data-nv]').forEach(c => { c.width = 72 * dpr; c.height = 72 * dpr; icono(c, c.dataset.nv, 72); });
        d.onclick = e => { if (e.target.id === 'ok') { d.remove(); pausa = false; banner(`Nivel ${n}`, S * .5, 1.6); } };
      });
    } else banner(n === 1 ? '¡Defiende tu huerto!' : `Nivel ${n}`, S * .46, 1.8);

    function modal(html, fn) { const d = document.createElement('div'); d.className = 'modal'; d.innerHTML = `<div class="card" style="text-align:center">${html}</div>`; document.body.append(d); fn && fn(d); return d; }
    function ganar() {
      fin = true; const e = vidas >= 3 ? 3 : vidas === 2 ? 2 : 1, pts = puntos + n * 100 + vidas * 150;
      try { PERFIL.partida('huerto', pts); PERFIL.nivelJuego('huerto', n, e); } catch (er) {}
      FX.confeti();
      post('/api/arcade/puntaje', { juego: 'huerto', puntos: Math.min(100000, pts), nombre: LS.get('chatNom') || 'Jugador', avatar: LS.get('chatAv') || 'a01', uid: VID }).catch(() => {});
      const prox = ORDEN.find(k => DEF[k].desde === n + 1) || Object.keys(ENE).find(k => ENE[k].desde === n + 1);
      setTimeout(() => modal(`<div style="font-size:3rem;letter-spacing:6px">${'⭐'.repeat(e)}<span style="opacity:.25">${'⭐'.repeat(3 - e)}</span></div><h2>¡Huerto a salvo!</h2><p class="sub">Nivel ${n} superado · ${pts.toLocaleString('es-PE')} puntos · +${e * 5} 🪙${e < 3 ? '<br>Para 3 estrellas no dejes pasar ninguna plaga.' : ''}</p>
        ${prox ? `<div style="display:flex;align-items:center;gap:10px;justify-content:center;background:rgba(255,255,255,.06);border-radius:14px;padding:8px;margin:8px 0"><canvas data-px="${prox}" style="width:52px;height:52px"></canvas><small style="text-align:left">${DEF[prox] ? `En el siguiente nivel desbloqueas<br><b>${DEF[prox].n}</b>` : `En el siguiente nivel aparece<br><b>${ENE[prox].n}</b>`}</small></div>` : ''}
        ${n < TOTAL ? `<button class="btn" id="sig">▶ Nivel ${n + 1}</button>` : '<p>🏆 ¡Completaste los 30 niveles!</p>'}<button class="btn alt" id="map">🗺️ Ver el mapa</button><button class="btn alt" id="comp">📣 Retar a un amigo</button>`, botones), 900);
    }
    function perder() {
      fin = true; if (!perdio) { perdio = true; try { PERFIL.partida('huerto', puntos); } catch (er) {} }
      setTimeout(() => modal(`<div style="font-size:3rem">🐛🏠</div><h2>¡Las plagas entraron a tu casa!</h2><p class="sub">Frenaste el ${Math.round((evI - enes.length) * 100 / C.ev.length)} % de las plagas del nivel ${n}.</p><button class="btn" id="mas">🛡️ Segunda oportunidad · 40 🪙</button><button class="btn alt" id="rei">🔁 Reintentar</button><button class="btn alt" id="map">🗺️ Mapa</button>`, botones), 700);
    }
    function botones(d) {
      d.querySelectorAll('[data-px]').forEach(c => { c.width = 52 * dpr; c.height = 52 * dpr; icono(c, c.dataset.px, 52); });
      d.onclick = e => { const id = e.target.id; if (!id) return;
        if (id === 'sig') { d.remove(); nivel(t, n + 1); } if (id === 'map') { d.remove(); vivo = false; mapa(t); } if (id === 'rei') { d.remove(); nivel(t, n); }
        if (id === 'mas') { if (!PERFIL.gastar(40)) return toast('No tienes suficientes monedas 🪙: juega misiones y otros juegos para ganar más'); d.remove();
          for (const en of enes) if (en.y > TOP + S * (R - 3.5)) { en.hp = 0; chispas(en.x, en.y, '#fff3a0', 14); } ondas.push({ x: W / 2, y: TOP + R * S, r: 0, max: W * .8, v: .45 }); vidas = 1; fin = false; shake = .4; FX.son('ganar'); }
        if (id === 'comp') { const url = `${location.origin}/r/${t.id}?src=huerto`; if (navigator.share) navigator.share({ title: 'Huerto Defensor', text: `🌱 Ya voy en el nivel ${n + 1} de Huerto Defensor. ¿Me alcanzas?`, url }).catch(() => {}); else { navigator.clipboard?.writeText(url); toast('Enlace copiado'); } } };
    }
    window.__huerto = { estado: () => ({ agua, vidas, tj, enes: enes.length, defs: defs.size, fin, evI, total: C.ev.length, puntos }), plantar: (k, c, r) => { sel = k; const b = cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: b.left + (c + .5) * S * b.width / W, clientY: b.top + (TOP + (r + .5) * S) * b.height / H, bubbles: true })); }, agua: v => agua = v, vista: () => ({ enes: enes.map(e => [e.c, Math.round((e.y - TOP) / S * 10) / 10, e.tipo]), defs: [...defs.values()].map(d => [d.k, d.c, d.r]) }), sinRecarga: () => { for (const k in cool) cool[k] = 0; }, rapido: k => vel = k, recogerTodo: () => gotas.forEach(g => !g.vuela && recoger(g)) }; // para pruebas
  }
  JUEGOS.huerto = mapa;
})();
