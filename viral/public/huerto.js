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
    maracuya: { n: 'Maracuyá Eléctrica', costo: 175, carga: 10, hp: 300, desde: 16, d: 'Lanza un rayo que salta entre 3 plagas.' },
    cebolla: { n: 'Cebolla Llorona', costo: 125, carga: 14, hp: 900, desde: 19, d: 'Sus lágrimas picantes dañan a todas las plagas que tiene al lado.' },
    quinua: { n: 'Quinua Curandera', costo: 100, carga: 18, hp: 300, desde: 23, d: 'Cura a los defensores que tiene alrededor.' },
  };
  const ENE = {
    gusano: { n: 'Gusano', hp: 190, vel: .21, desde: 1, pts: 10, d: 'Lento pero insistente.' },
    caracol: { n: 'Caracol blindado', hp: 460, vel: .17, desde: 3, pts: 20, d: 'Su caparazón aguanta mucho.' },
    langosta: { n: 'Langosta', hp: 300, vel: .42, desde: 7, pts: 25, d: 'Rápida: salta sobre tu primer defensor.' },
    escarabajo: { n: 'Escarabajo tanque', hp: 880, vel: .16, desde: 11, pts: 40, d: 'Blindado y muy resistente.' },
    polilla: { n: 'Polilla nocturna', hp: 150, vel: .36, desde: 15, pts: 20, d: 'Vuela por encima de las murallas y las bombas.' },
    topo: { n: 'Topo excavador', hp: 420, vel: .19, desde: 18, pts: 30, d: 'Cava por debajo y sale a mitad de tu huerto.' },
    rata: { n: 'Rata jefa', hp: 3000, vel: .14, desde: 5, pts: 120, d: 'La jefa: enorme y voraz.' },
  };
  const ORDEN = Object.keys(DEF);
  const ZONAS = [
    { k: 'dia', n: 'Chacra soleada', e: '🌽', desde: 1, hasta: 10, fondo: 'linear-gradient(180deg,#7dd3fc,#bbf7d0 45%,#4ade80)', deco: ['🌻', '🌽', '🐓', '🏡', '🦋', '🌾', '🐄', '🌼'] },
    { k: 'noche', n: 'Jardín de noche', e: '🌙', desde: 11, hasta: 20, fondo: 'linear-gradient(180deg,#020617,#1e1b4b 40%,#14532d)', deco: ['🌙', '✨', '🍄', '🦉', '🏮', '⭐', '🌌', '🦇'] },
    { k: 'andes', n: 'Andenes de los Andes', e: '🏔️', desde: 21, hasta: 30, fondo: 'linear-gradient(180deg,#fb923c,#fcd34d 35%,#a3e635 75%,#4d7c0f)', deco: ['🏔️', '🦙', '🌄', '🪨', '🦅', '🌵', '🌽', '☀️'] },
  ];
  const zonaDe = n => ZONAS.find(z => n >= z.desde && n <= z.hasta) || ZONAS[0];
  const FRASES = {
    llega: { gusano: ['¡Ahí voy a comerte!', '¡Ñam ñam, choclitos!', '¡Este huerto es mío!', '¡Tengo un hambre!'], caracol: ['Despacito... pero llego', '¡Mi casco es indestructible!', 'Nadie me detiene'], langosta: ['¡Salto y me los como!', '¡Soy más rápida que tú!', '¡Hop, hop, hop!'], escarabajo: ['¡Soy un tanque!', '¡Ríndete, granjero!', 'Voy a crujir todo'], polilla: ['¡Vuelo sobre tus murallas!', '¡No me alcanzas!', '¡Bzzz, a la casa!'], topo: ['¡Sorpresa desde abajo!', '¡Cavé un túnel!', '¡Aquí estoy, jejeje!'], rata: ['¡Soy la jefa de este huerto! ¡Jajaja!', '¡Prepárate para perder!', '¡Todo esto será mío!'] },
    come: ['¡Qué rico!', '¡Crunch crunch!', '¡Delicioso!', '¡Ñam!', '¡Mmm, verdurita!'],
    muere: ['¡Noooo!', '¡Volveré!', '¡Me las pagarás!', '¡Auxilio!', '¡No es justo!', '¡Ay, mi pancita!', '¡Mamááá!'],
    entra: ['¡Jajaja, entré!', '¡Llegué a tu casa!', '¡Ganamos, ganamos!'],
    def: { choclo: ['¡Toma granos!', '¡Pum pum!', '¡A la carga!'], coco: ['¡No pasarás!', '¡Soy de piedra!'], aji: ['¡Picanteee!'], limon: ['¡Congélate!', '¡Fresquito!'], palta: ['¡Doble pepa!', '¡Ahí les va!'], hongo: ['¡Agüita fresca!', '¡Rocío para todos!'], pina: ['¡Sorpresa!', 'Shhh... escondida'], maracuya: ['¡Rayo maracuyá!', '¡Electrizante!'], cebolla: ['¡Te haré llorar!', '¡Lágrimas picantes!'], quinua: ['¡Los curo a todos!', '¡Fuerza andina!'] },
    gana: ['¡Huerto a salvo! ¡Eres un crack!', '¡Victoria! Las plagas salieron corriendo', '¡Ganaste! Tu huerto está feliz'],
    pierde: ['¡Oh no! Las plagas entraron a tu casa', '¡Nos ganaron esta vez! Inténtalo otra vez'],
  };
  const VOZ = { gusano: { tono: 1.7, vel: 1.25 }, caracol: { tono: .6, vel: .85 }, langosta: { tono: 1.95, vel: 1.4 }, escarabajo: { tono: .35, vel: .9 }, rata: { tono: .1, vel: .95 }, polilla: { tono: 1.8, vel: 1.3 }, topo: { tono: .8, vel: 1 } };
  const azar = l => l[Math.floor(Math.random() * l.length)];
  // Voces grabadas con la biblioteca de ShortForge (si existen); si no, la voz del celular
  let MANI_H = null, ultVozH = 0, audioH = null;
  const idFrase = (q, txt) => { let h = 0; const t = q + '|' + txt; for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) >>> 0; return q + '_' + h.toString(36); };
  function cargarVocesH() { if (MANI_H) return; MANI_H = {}; fetch('/voces/huerto/manifest.json').then(r => r.ok ? r.json() : {}).then(m => { MANI_H = Object.fromEntries((m.voces || []).map(v => [v, 1])); }).catch(() => {}); }
  function voz(txt, quien, o = {}) {
    const id = idFrase(quien, txt);
    if (MANI_H && MANI_H[id]) { if (LS.get('arcVoz') === '0' || LS.get('arcSonido') === '0') return; const ahora = Date.now(); if (!o.forzar && ahora - ultVozH < 1800) return; ultVozH = ahora;
      try { if (o.cortar && audioH) audioH.pause(); audioH = new Audio('/voces/huerto/' + id + '.mp3'); audioH.volume = .95; audioH.play().catch(() => {}); } catch (e) {} return; }
    FX.voz?.(txt, { ...(VOZ[quien] || {}), ...o });
  }
  const datos = () => PERFIL.datos.juegos.huerto || { nivel: 1, estrellas: {} };
  const desbloq = n => ORDEN.filter(k => DEF[k].desde <= n);

  function cfg(n) {
    const r = rng(n * 977 + 13), carriles = n <= 2 ? [1, 2, 3] : [0, 1, 2, 3, 4];
    const tipos = Object.keys(ENE).filter(k => k !== 'rata' && ENE[k].desde <= n), peso = { gusano: 5, caracol: 3, langosta: 2, escarabajo: 1.5, polilla: 2, topo: 1.5 };
    const elegir = () => { let x = r() * tipos.reduce((a, k) => a + peso[k], 0); for (const k of tipos) { x -= peso[k]; if (x <= 0) return k; } return 'gusano'; };
    const carril = () => carriles[Math.floor(r() * carriles.length)];
    const total = Math.round(5 + n * 1.3), normal = Math.round(total * .6), ev = [];
    let t = n < 10 ? 18 : 24;
    for (let i = 0; i < normal; i++) { ev.push({ t, tipo: i < 2 ? 'gusano' : elegir(), c: carril() }); t += Math.max(n >= 24 ? 4.3 : 3.6, 10.5 - n * .2 - i * .1) * (.75 + r() * .55); }
    t += 7; const ola = t;
    for (let i = normal; i < total; i++) ev.push({ t: t + r() * (10 + n * .4), tipo: elegir(), c: carril() });
    if (n % 5 === 0 || n > 20) ev.push({ t: t + 4, tipo: 'rata', c: carriles[Math.floor(carriles.length / 2)] });
    if (n > 25) ev.push({ t: t + 9, tipo: 'rata', c: carril() });
    ev.sort((a, b) => a.t - b.t);
    return { n, carriles, ev, ola, ultimo: ev[ev.length - 1].t, agua: n < 3 ? 150 : n < 10 ? 200 : n < 20 ? 275 : n < 26 ? 325 : 400 };
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
    maracuya(X, x, y, s, o) {
      const k = o.kick || 0, b = Math.sin(o.t * 3 + o.f) * .03; sombra(X, x, y + s * .33, s * .27);
      X.save(); X.translate(x, y + s * .33); X.scale(1 + k * .1, 1 - k * .12 + b); X.translate(-x, -(y + s * .33));
      X.fillStyle = '#3f6212'; for (const q of [-1, 1]) { X.beginPath(); X.ellipse(x + q * s * .22, y + s * .22, s * .16, s * .06, q * .5, 0, 7); X.fill(); }
      X.beginPath(); X.arc(x, y, s * .3, 0, 7); X.fillStyle = rad(X, x, y, s * .3, '#d8b4fe', '#581c87'); X.fill(); borde(X, s);
      X.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 9; i++) { const a = i * 2.4 + o.f, r = s * (.08 + (i % 3) * .07); X.beginPath(); X.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * .9, s * .018, 0, 7); X.fill(); }
      brillo(X, x - s * .12, y - s * .14, s * .07, s * .04);
      X.strokeStyle = '#fde047'; X.lineWidth = s * .035; X.lineJoin = 'round'; X.shadowColor = '#fde047'; X.shadowBlur = 8 + k * 14; X.beginPath(); X.moveTo(x - s * .06, y - s * .42); X.lineTo(x + s * .03, y - s * .32); X.lineTo(x - s * .03, y - s * .3); X.lineTo(x + s * .07, y - s * .18); X.stroke(); X.shadowBlur = 0;
      ojos(X, x, y + s * .02, s * .06, s * .1, -1, k > .3, parpadea(o)); X.fillStyle = '#3b0764'; X.beginPath(); X.arc(x, y + s * .14, s * .05, 0, Math.PI); X.fill();
      X.restore();
    },
    cebolla(X, x, y, s, o) {
      const k = o.kick || 0, b = Math.sin(o.t * 2.5 + o.f) * .03; sombra(X, x, y + s * .34, s * .28);
      X.save(); X.translate(x, y + s * .34); X.scale(1 + k * .08, 1 - k * .08 + b); X.translate(-x, -(y + s * .34));
      X.fillStyle = '#16a34a'; for (const q of [-1, 0, 1]) { X.beginPath(); X.ellipse(x + q * s * .06, y - s * .4, s * .035, s * .14, q * .35, 0, 7); X.fill(); }
      X.beginPath(); X.moveTo(x, y - s * .32); X.bezierCurveTo(x + s * .42, y - s * .15, x + s * .38, y + s * .32, x, y + s * .33); X.bezierCurveTo(x - s * .38, y + s * .32, x - s * .42, y - s * .15, x, y - s * .32); X.fillStyle = rad(X, x, y, s * .36, '#f5d0fe', '#a21caf'); X.fill(); borde(X, s);
      X.strokeStyle = 'rgba(255,255,255,.35)'; X.lineWidth = s * .02; for (const q of [-.16, 0, .16]) { X.beginPath(); X.moveTo(x, y - s * .3); X.quadraticCurveTo(x + q * s * 1.6, y, x + q * s * .4, y + s * .3); X.stroke(); }
      ojos(X, x, y + s * .02, s * .06, s * .1, 1, 0, parpadea(o));
      const ll = (o.t * 1.5 + o.f) % 1; X.fillStyle = '#7dd3fc'; for (const q of [-1, 1]) { X.beginPath(); X.ellipse(x + q * s * .1, y + s * .1 + ll * s * .16, s * .025, s * .04, 0, 0, 7); X.fill(); }
      X.fillStyle = '#4a044e'; X.beginPath(); X.ellipse(x, y + s * .17, s * .05, s * .025 + k * s * .03, 0, 0, 7); X.fill();
      X.restore();
    },
    quinua(X, x, y, s, o) {
      const k = o.kick || 0, sw = Math.sin(o.t * 2 + o.f) * .06; sombra(X, x, y + s * .34, s * .24);
      X.save(); X.translate(x, y + s * .34); X.rotate(sw * .5); X.scale(1, 1 - k * .1); X.translate(-x, -(y + s * .34));
      X.strokeStyle = '#4d7c0f'; X.lineWidth = s * .06; X.lineCap = 'round'; X.beginPath(); X.moveTo(x, y + s * .34); X.lineTo(x, y - s * .05); X.stroke();
      X.fillStyle = '#65a30d'; for (const q of [-1, 1]) { X.beginPath(); X.ellipse(x + q * s * .15, y + s * .14, s * .13, s * .05, q * -.5, 0, 7); X.fill(); }
      const cols = ['#f97316', '#dc2626', '#facc15', '#ea580c'], r0 = rng(Math.floor(o.f * 1000));
      for (let i = 0; i < 46; i++) { const a = r0() * 7, rr = Math.sqrt(r0()), px = x + Math.cos(a) * rr * s * .22, py = y - s * .22 + Math.sin(a) * rr * s * .2 - (1 - rr) * s * .06; X.fillStyle = cols[i % 4]; X.beginPath(); X.arc(px, py, s * .03, 0, 7); X.fill(); }
      X.beginPath(); X.ellipse(x, y - s * .02, s * .13, s * .11, 0, 0, 7); X.fillStyle = rad(X, x, y - s * .02, s * .13, '#fef3c7', '#d97706'); X.fill(); borde(X, s);
      ojos(X, x, y - s * .03, s * .045, s * .055, 0, 0, parpadea(o)); mejillas(X, x, y + s * .03, s, s * .08);
      if (o.carga > .8) { X.globalAlpha = (o.carga - .8) * 5; X.fillStyle = '#86efac'; X.font = `${s * .2}px sans-serif`; X.textAlign = 'center'; X.fillText('💚', x, y - s * .42); X.globalAlpha = 1; }
      X.restore(); X.lineCap = 'butt';
    },
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
    polilla(X, x, y, s, o) {
      X.fillStyle = 'rgba(0,0,0,.18)'; X.beginPath(); X.ellipse(x, y + s * .5, s * .18, s * .05, 0, 0, 7); X.fill();
      const al = Math.abs(Math.sin(o.t * 16)) * .7 + .3;
      for (const q of [-1, 1]) { X.save(); X.translate(x, y); X.scale(q * al, 1); X.beginPath(); X.moveTo(0, -s * .05); X.bezierCurveTo(s * .35, -s * .35, s * .45, s * .05, s * .05, s * .08); X.fillStyle = rad(X, s * .2, -s * .1, s * .3, '#d6c7a1', '#6b5a3a'); X.fill(); borde(X, s); X.fillStyle = 'rgba(60,40,20,.6)'; X.beginPath(); X.arc(s * .22, -s * .1, s * .05, 0, 7); X.fill(); X.fillStyle = 'rgba(255,240,200,.7)'; X.beginPath(); X.arc(s * .22, -s * .1, s * .025, 0, 7); X.fill(); X.restore(); }
      X.beginPath(); X.ellipse(x, y + s * .02, s * .07, s * .16, 0, 0, 7); X.fillStyle = rad(X, x, y, s * .16, '#a8946b', '#4a3b22'); X.fill(); borde(X, s);
      X.strokeStyle = '#3a2a14'; X.lineWidth = s * .015; for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .02, y - s * .12); X.quadraticCurveTo(x + q * s * .1, y - s * .26, x + q * s * .16, y - s * .24); X.stroke(); }
      ojos(X, x, y - s * .08, s * .035, s * .035, 1, 1, false);
    },
    topo(X, x, y, s, o) {
      X.fillStyle = '#6b4a2a'; X.beginPath(); X.ellipse(x, y + s * .3, s * .3, s * .08, 0, 0, 7); X.fill(); for (let i = 0; i < 5; i++) { X.fillStyle = '#8a6a45'; X.beginPath(); X.arc(x - s * .25 + i * s * .12, y + s * .27, s * .05, 0, 7); X.fill(); }
      const b = o.come ? Math.sin(o.t * 14) * s * .02 : Math.sin(o.t * 5) * s * .015;
      X.beginPath(); X.ellipse(x, y + b, s * .24, s * .27, 0, 0, 7); X.fillStyle = rad(X, x, y, s * .27, '#8b6b4f', '#3b2416'); X.fill(); borde(X, s);
      X.beginPath(); X.ellipse(x, y + s * .06 + b, s * .14, s * .14, 0, 0, 7); X.fillStyle = '#c9a27e'; X.fill();
      for (const q of [-1, 1]) { X.fillStyle = '#f9a8d4'; X.beginPath(); X.ellipse(x + q * s * .2, y + s * .14 + b, s * .07, s * .05, q * .4, 0, 7); X.fill(); X.strokeStyle = '#fbcfe8'; X.lineWidth = s * .015; for (let k = -1; k <= 1; k++) { X.beginPath(); X.moveTo(x + q * s * .25, y + s * .14 + b + k * s * .025); X.lineTo(x + q * s * .31, y + s * .12 + b + k * s * .035); X.stroke(); } }
      X.fillStyle = '#f472b6'; X.beginPath(); X.arc(x, y - s * .02 + b, s * .05, 0, 7); X.fill();
      ojos(X, x, y - s * .1 + b, s * .03, s * .07, 1, 1, false);
      X.fillStyle = '#fbbf24'; X.beginPath(); X.ellipse(x, y - s * .25 + b, s * .16, s * .07, 0, Math.PI, 0); X.fill(); X.fillStyle = '#fef9c3'; X.beginPath(); X.arc(x, y - s * .28 + b, s * .035, 0, 7); X.fill();
    },
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
  function gota(X, x, y, r, oro) {
    const g = X.createRadialGradient(x - r * .3, y - r * .2, r * .1, x, y + r * .2, r * 1.3); g.addColorStop(0, oro ? '#fffbe6' : '#f2fcff'); g.addColorStop(.4, oro ? '#ffd23f' : '#5cc8ff'); g.addColorStop(1, oro ? '#b45309' : '#1565c0');
    X.beginPath(); X.moveTo(x, y - r * 1.45); X.bezierCurveTo(x + r * 1.1, y - r * .2, x + r, y + r, x, y + r); X.bezierCurveTo(x - r, y + r, x - r * 1.1, y - r * .2, x, y - r * 1.45);
    X.fillStyle = g; X.fill(); X.strokeStyle = 'rgba(10,50,110,.6)'; X.lineWidth = Math.max(1, r * .12); X.stroke();
    X.fillStyle = 'rgba(255,255,255,.85)'; X.beginPath(); X.ellipse(x - r * .35, y - r * .15, r * .18, r * .3, -.4, 0, 7); X.fill();
  }
  function icono(cv, k, tam) {
    const dpr = Math.min(2, devicePixelRatio || 1), X = cv.getContext('2d'); X.setTransform(dpr, 0, 0, dpr, 0, 0); X.clearRect(0, 0, tam, tam);
    (DIB[k] ? dibD : dibP)(k, X, tam / 2, tam / 2 + tam * .02, tam * (PLAGA[k] ? .78 : .95), { t: 1, f: 0, frac: 1, armado: true, timer: 0, kick: 0 });
  }

  // ---------- Ilustraciones de ShortForge (personaje sin fondo); si no hay, el dibujo vectorial ----------
  const IMGH = {};
  function recortar(im) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0; for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 40) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (x1 <= x0) return null; const o = document.createElement('canvas'); o.width = x1 - x0 + 3; o.height = y1 - y0 + 3; o.getContext('2d').drawImage(c, x0 - 1, y0 - 1, o.width, o.height, 0, 0, o.width, o.height); return o; }
  function cargarArteH() { if (cargarArteH.ok) return; cargarArteH.ok = 1; fetch('/arte/huerto/manifest.json').then(r => r.ok ? r.json() : {}).then(m => { for (const id of m.arte || []) { const im = new Image(); im.onload = () => { try { const c = recortar(im); if (!c) return; IMGH[id] = c; document.querySelectorAll(`[data-sc="${id}"],[data-nv="${id}"],[data-px="${id}"]`).forEach(cv => icono(cv, id, cv.width / Math.min(2, devicePixelRatio || 1))); } catch (e) {} }; im.src = '/arte/huerto/' + id + '.webp'; } }).catch(() => {}); }
  function dibImg(k, X, x, y, s, o, plaga) {
    const im = IMGH[k], kick = o.kick || 0, b = Math.sin((o.t || 0) * (plaga ? 6 : 3) + (o.f || 0)) * (plaga ? .045 : .03);
    let h = s * (plaga ? (k === 'rata' ? 1.3 : k === 'escarabajo' ? 1.05 : .95) : .95), w = h * im.width / im.height; const mx = s * (k === 'rata' ? 1.25 : .98); if (w > mx) { h *= mx / w; w = mx; }
    const base = y + s * .38; sombra(X, x, base - s * .02, w * .42);
    X.save(); X.translate(x, base); if (plaga && o.come) X.rotate(Math.sin(o.t * 14) * .07); if (k === 'polilla') X.translate(0, -s * .1);
    X.scale(1 - b * .6 + kick * .12, 1 + b - kick * .14);     if (k === 'pina' && !o.armado) { X.beginPath(); X.rect(-w, -h * .55, w * 2, h * .55); X.clip(); X.translate(0, h * .4); }
    X.drawImage(im, -w / 2, -h, w, h); X.restore();
    if (k === 'hongo' && o.carga > .75) { X.globalAlpha = (o.carga - .75) * 4 * (.6 + .4 * Math.sin(o.t * 10)); gota(X, x, y - s * .5, s * .09); X.globalAlpha = 1; }
    if (k === 'maracuya' && kick > .2) { X.save(); X.globalCompositeOperation = 'lighter'; X.fillStyle = `rgba(253,224,71,${kick * .5})`; X.beginPath(); X.arc(x, y - s * .1, s * .45, 0, 7); X.fill(); X.restore(); }
  }
  const dibD = (k, X, x, y, s, o) => IMGH[k] ? dibImg(k, X, x, y, s, o, false) : DIB[k](X, x, y, s, o);
  const dibP = (k, X, x, y, s, o) => IMGH[k] ? dibImg(k, X, x, y, s, o, true) : PLAGA[k](X, x, y, s, o);

  // ---------- Mapa de niveles ----------
  function mapa(t) {
    salir(); registrar(t.id); $('#stage').onclick = null; FX.musica?.('huerto'); cargarVocesH(); cargarArteH();
    const J = datos(), act = Math.min(J.nivel || 1, TOTAL), est = J.estrellas || {}, totE = Object.values(est).reduce((a, b) => a + b, 0);
    const W = Math.min(($('#stage').clientWidth || 360) - 4, 460), HN = 92, posX = n => W / 2 + Math.sin(n * 1.15) * W * .28;
    const zonasHTML = [...ZONAS].reverse().map(z => {
      const cant = z.hasta - z.desde + 1, alto = cant * HN + 90, r = rng(z.desde * 31), yN = n => alto - 52 - (n - z.desde) * HN, bloq = act < z.desde;
      const deco = [...Array(16)].map((_, i) => `<span style="position:absolute;left:${r() < .5 ? r() * 20 : 75 + r() * 13}%;top:${10 + r() * 84}%;font-size:${1.3 + r() * 1.3}rem;filter:drop-shadow(0 4px 4px rgba(0,0,0,.3));animation:flota ${3 + r() * 3}s ease-in-out ${-r() * 3}s infinite alternate">${z.deco[i % z.deco.length]}</span>`).join('');
      const pts = [...Array(cant).keys()].map(i => `${posX(z.desde + i)},${yN(z.desde + i)}`).join(' ');
      const nodos = [...Array(cant).keys()].map(i => { const n = z.desde + i, ok = n <= act, e = est[n] || 0, x = posX(n), y = yN(n), jefe = n % 5 === 0;
        return `<button data-n="${n}" ${ok ? '' : 'disabled'} style="position:absolute;left:${x - 30}px;top:${y - 30}px;width:60px;height:60px;border-radius:50%;border:4px solid ${n === act ? '#fff' : 'rgba(255,255,255,.65)'};background:${ok ? (e ? 'radial-gradient(circle at 35% 30%,#fff3a0,#f59e0b)' : 'radial-gradient(circle at 35% 30%,#86efac,#15803d)') : 'radial-gradient(circle at 35% 30%,#9ca3af,#374151)'};color:${e ? '#3a2600' : '#fff'};font:900 1.15rem Figtree,sans-serif;cursor:${ok ? 'pointer' : 'default'};box-shadow:${n === act ? '0 0 0 8px rgba(255,255,255,.3),0 0 30px #fff' : '0 6px 14px rgba(0,0,0,.35)'};${n === act ? 'animation:late 1.6s infinite;' : ''}z-index:2">${ok ? n : '🔒'}${jefe ? '<span style="position:absolute;top:-14px;right:-12px;font-size:1.2rem">🐀</span>' : ''}<span style="position:absolute;left:50%;transform:translateX(-50%);bottom:-18px;font-size:.72rem;white-space:nowrap">${ok && e ? '⭐'.repeat(e) : ''}</span>${n === act ? '<span style="position:absolute;left:50%;top:-34px;transform:translateX(-50%);font-size:1.5rem;animation:flota 1s ease-in-out infinite alternate">📍</span>' : ''}</button>`; }).join('');
      return `<div style="position:relative;height:${alto}px;background:${z.fondo};overflow:hidden">${deco}${bloq ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,.35);z-index:1"></div>' : ''}<svg width="${W}" height="${alto}" style="position:absolute;left:0;top:0;z-index:1"><polyline points="${pts}" fill="none" stroke="rgba(120,72,30,.55)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round"/></svg>${nodos}<div style="position:absolute;left:50%;top:12px;transform:translateX(-50%);background:rgba(0,0,0,.5);backdrop-filter:blur(4px);padding:6px 14px;border-radius:999px;font-weight:900;white-space:nowrap;z-index:3">${z.e} ${z.n} · ${z.desde}–${z.hasta}${bloq ? ' 🔒' : ''}</div></div>`; }).join('');
    stage(`<style>@keyframes flota{from{transform:translateY(0)}to{transform:translateY(-8px)}}</style>
      <div class="card" style="padding:12px;position:sticky;top:6px;z-index:5;background:linear-gradient(165deg,#166534,#0f3d2a);border:0"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:1.15rem">🌱 Huerto Defensor</b><span>🪙 ${PERFIL.datos.monedas} · ⭐ ${totE}/${TOTAL * 3}</span></div>
      <button class="btn" id="jg" style="margin-top:8px">▶ ${act > 1 ? 'Continuar · ' : 'Jugar · '}Nivel ${act} · ${zonaDe(act).e} ${zonaDe(act).n}</button></div>
      <div id="mapa" style="border-radius:24px;overflow:hidden;margin-top:10px;box-shadow:0 12px 30px rgba(0,0,0,.35)">${zonasHTML}</div>
      <div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">Tus defensores</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px">${ORDEN.map(k => { const ok = DEF[k].desde <= act; return `<div style="background:rgba(0,0,0,.25);border-radius:14px;padding:8px 4px;text-align:center;${ok ? '' : 'opacity:.45'}"><canvas data-ic="${k}" style="width:56px;height:56px;${ok ? '' : 'filter:grayscale(1) brightness(.5)'}"></canvas><b style="display:block;font-size:.75rem">${ok ? DEF[k].n : '🔒 Nivel ' + DEF[k].desde}</b><small style="font-size:.68rem;opacity:.85">${ok ? DEF[k].d : ''}</small></div>`; }).join('')}</div>
      <h3 style="margin:16px 0 8px">Las plagas</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px">${Object.keys(ENE).map(k => { const ok = ENE[k].desde <= act; return `<div style="background:rgba(0,0,0,.25);border-radius:14px;padding:8px 4px;text-align:center;${ok ? '' : 'opacity:.45'}"><canvas data-ic="${k}" style="width:56px;height:56px;${ok ? '' : 'filter:brightness(0)'}"></canvas><b style="display:block;font-size:.75rem">${ok ? ENE[k].n : '???'}</b><small style="font-size:.68rem;opacity:.85">${ok ? ENE[k].d : 'Aparece en el nivel ' + ENE[k].desde}</small></div>`; }).join('')}</div></div>`);
    const dpr = Math.min(2, devicePixelRatio || 1);
    document.querySelectorAll('[data-ic]').forEach(c => { c.width = 56 * dpr; c.height = 56 * dpr; icono(c, c.dataset.ic, 56); });
    const zi = ZONAS.length - 1 - ZONAS.indexOf(zonaDe(act)), zAlto = z => (z.hasta - z.desde + 1) * HN + 90;
    let yAct = 0; for (const z of [...ZONAS].reverse().slice(0, zi)) yAct += zAlto(z); const z0 = zonaDe(act); yAct += zAlto(z0) - 52 - (act - z0.desde) * HN;
    setTimeout(() => { const m = $('#mapa'); if (m) scrollTo({ top: m.getBoundingClientRect().top + scrollY + yAct - innerHeight / 2, behavior: 'smooth' }); }, 120);
    $('#stage').onclick = e => { const b = e.target.closest('[data-n]'); if (b && !b.disabled) nivel(t, +b.dataset.n); if (e.target.id === 'jg') nivel(t, act); };
    setParar(() => { $('#stage').onclick = null; });
  }

  // ---------- Un nivel ----------
  function nivel(t, n) {
    salir(); scrollTo(0, 0); $('#stage').onclick = null;
    const C = cfg(n), tipos = desbloq(n), dpr = Math.min(2, devicePixelRatio || 1);
    document.body.classList.add('hd-full'); if (!document.getElementById('hdFullCss')) { const st = document.createElement('style'); st.id = 'hdFullCss'; st.textContent = '.hd-bar{margin:6px auto 0;display:flex;flex-direction:column;gap:6px;padding:6px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(6px);box-shadow:0 10px 30px rgba(0,0,0,.35)}.hd-top{display:flex;gap:6px;align-items:stretch}.hd-agua{flex:1.3;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:12px;background:linear-gradient(135deg,#0ea5e9,#1e3a8a);color:#fff;font-weight:900;font-size:1.05rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}.hd-poder,.hd-pala{flex:1;position:relative;overflow:hidden;border-radius:12px;color:#fff;font-weight:900;font-size:.85rem;padding:7px 4px;cursor:pointer;border:1px solid rgba(255,255,255,.2)}.hd-poder{background:linear-gradient(135deg,#a16207,#451a03);border-color:rgba(253,224,71,.5)}.hd-poder i{position:absolute;left:0;top:0;bottom:0;width:0;height:auto!important;background:linear-gradient(90deg,rgba(253,224,71,.55),rgba(250,204,21,.85))}.hd-poder span,.hd-pala span{position:relative}.hd-pala{background:linear-gradient(135deg,#475569,#1e293b)}.hd-cartas{display:grid;gap:5px}.hd-carta{position:relative;border-radius:13px;border:1px solid rgba(255,255,255,.22);background:linear-gradient(180deg,rgba(134,239,172,.22),rgba(20,83,45,.55));padding:3px 0 2px;color:#fff;cursor:pointer;overflow:hidden;transition:transform .15s,border-color .15s,box-shadow .15s}.hd-carta canvas{width:100%;max-width:56px;aspect-ratio:1;height:auto;display:block;margin:0 auto;pointer-events:none}.hd-carta small{display:block;font-weight:900;font-size:.72rem;pointer-events:none;text-align:center}.hd-carta i{position:absolute;left:0;right:0;top:0;height:0;background:rgba(0,0,0,.62);pointer-events:none}'+'.hd-full #play{position:fixed;inset:0;z-index:40;margin:0;max-width:none;width:100%;background:radial-gradient(circle at 50% 20%,#14532d,#052e16 80%);overflow-y:auto;overflow-x:hidden;padding:0}.hd-full #back,.hd-full .marca{display:none!important}.hd-full #stage{max-width:780px;margin:0 auto;padding:0}.hd-full #stage>.card{background:transparent;border:0;box-shadow:none;padding:4px!important;margin:0}.hd-btn{width:auto!important;margin:0!important;padding:6px 11px!important;font-size:.9rem!important;border-radius:12px!important;background:rgba(0,0,0,.35)!important;border:1px solid rgba(255,255,255,.2)!important;color:#fff!important;font-weight:800}'; document.head.appendChild(st); }
    const filas = desbloq(n).length <= 7 ? 1 : 2, ancho = Math.min(innerWidth, 760) - 10, S = Math.floor(Math.max(46, Math.min(ancho / L, (innerHeight - 118 - filas * 74) / 8.5))), W = S * L, TOP = S * .75, BOT = S * .75, Z = zonaDe(n).k, H = TOP + R * S + BOT;
    const chico = 'width:auto;margin:0;padding:5px 10px;font-size:.85rem';
    stage(`<div class="card" style="padding:8px;user-select:none;-webkit-user-select:none">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin:0 auto 6px;max-width:${W}px"><button class="btn alt hd-btn" id="vm">🗺️</button><b style="white-space:nowrap">${zonaDe(n).e} Nivel ${n}</b><span style="display:flex;gap:4px;align-items:center">${FX.botones ? FX.botones() : ''}<button class="btn alt hd-btn" id="vel">⏩ x1</button><button class="btn alt hd-btn" id="pau" aria-label="Pausa">❚❚</button></span></div>
      <canvas id="cv" width="${W * dpr}" height="${H * dpr}" style="width:${W}px;height:${H}px;display:block;margin:0 auto;border-radius:16px;touch-action:none;box-shadow:0 10px 30px rgba(0,0,0,.35)"></canvas>
      <div id="semillas" class="hd-bar" style="max-width:${W}px">
        <div class="hd-top"><div class="hd-agua">💧 <b id="aguaN">${C.agua}</b></div>
          <button class="semi hd-poder" data-k="furia" title="Súper poder: Furia del Huerto"><i></i><span>⚡ Furia</span></button>
          <button class="semi hd-pala" data-k="pala" title="Quitar un defensor"><span>✋ Quitar</span></button></div>
        <div class="hd-cartas" style="grid-template-columns:repeat(${tipos.length <= 7 ? Math.max(4, tipos.length) : Math.ceil(tipos.length / 2)},1fr)">
        ${tipos.map(k => `<button class="semi hd-carta" data-k="${k}" title="${DEF[k].n}"><canvas data-sc="${k}"></canvas><small>💧${DEF[k].costo}</small><i></i></button>`).join('')}</div>
      </div></div>`);
    document.querySelectorAll('[data-sc]').forEach(c => { c.width = 52 * dpr; c.height = 52 * dpr; icono(c, c.dataset.sc, 52); });
    const cv = $('#cv'), X = cv.getContext('2d'); X.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fondo = document.createElement('canvas'); fondo.width = W * dpr; fondo.height = H * dpr; pintarFondo(fondo.getContext('2d'));
    const cx = c => c * S + S / 2, cy = r => TOP + r * S + S / 2;
    let agua = C.agua, vidas = 3, tj = 0, vel = 1, pausa = false, vivo = true, fin = false, sel = null, pala = false, raf, last = performance.now(), evI = 0, puntos = 0, shake = 0, rojo = 0, avisoOla = false, lluvia = 5, perdio = false, ultAviso = 0, tutorial = n === 1 ? 1 : 0, ultBarra = 0;
    const defs = new Map(), enes = [], balas = [], gotas = [], parts = [], ondas = [], textos = [], cool = {}, caidos = [], rayos = []; let furia = 0, furiaT = 0;
    tipos.forEach(k => cool[k] = ['hongo', 'choclo', 'coco'].includes(k) ? 0 : DEF[k].carga * .5);

    function pintarFondo(F) {
      F.setTransform(dpr, 0, 0, dpr, 0, 0); const r = rng(n * 31 + 7);
      const PAL = { dia: { c1: '#38bdf8', c2: '#bae6fd', g1: '#5cb845', g2: '#6cc653', t1: '#8a6a45', t2: '#977552' }, noche: { c1: '#020617', c2: '#1e1b4b', g1: '#2c6a3a', g2: '#347a44', t1: '#4a3a2a', t2: '#544231' }, andes: { c1: '#f97316', c2: '#fde68a', g1: '#7cb342', g2: '#8bc34a', t1: '#8d6e4a', t2: '#9b7b55' } }[Z];
      const cielo = F.createLinearGradient(0, 0, 0, TOP); cielo.addColorStop(0, PAL.c1); cielo.addColorStop(1, PAL.c2); F.fillStyle = cielo; F.fillRect(0, 0, W, TOP + 2);
      if (Z === 'dia') {
        F.fillStyle = '#fff7b0'; F.shadowColor = '#fff3a0'; F.shadowBlur = 20; F.beginPath(); F.arc(W * .85, TOP * .38, S * .2, 0, 7); F.fill(); F.shadowBlur = 0;
        F.fillStyle = '#86c66b'; F.beginPath(); F.moveTo(0, TOP); for (let x = 0; x <= W; x += 8) F.lineTo(x, TOP * .62 - Math.sin(x / W * 6 + 1) * TOP * .12); F.lineTo(W, TOP); F.fill();
        for (let x = S * .1; x < W; x += S * .16) { const h = TOP * (.35 + r() * .15); F.strokeStyle = '#3f8f2f'; F.lineWidth = 2.5; F.beginPath(); F.moveTo(x, TOP); F.lineTo(x + 2, TOP - h); F.stroke(); F.fillStyle = '#4caf50'; F.beginPath(); F.ellipse(x - 4, TOP - h * .55, 5, 2, -.6, 0, 7); F.ellipse(x + 6, TOP - h * .7, 5, 2, .6, 0, 7); F.fill(); if (r() < .5) { F.fillStyle = '#facc15'; F.beginPath(); F.ellipse(x + 3, TOP - h * .8, 2.5, 6, .2, 0, 7); F.fill(); } }
      } else if (Z === 'noche') {
        for (let i = 0; i < 40; i++) { F.fillStyle = `rgba(255,255,255,${.4 + r() * .6})`; F.beginPath(); F.arc(r() * W, r() * TOP * .7, r() * 1.4 + .3, 0, 7); F.fill(); }
        F.fillStyle = '#fef9c3'; F.shadowColor = '#fef08a'; F.shadowBlur = 25; F.beginPath(); F.arc(W * .82, TOP * .38, S * .2, 0, 7); F.fill(); F.shadowBlur = 0; F.fillStyle = PAL.c2; F.beginPath(); F.arc(W * .82 + S * .08, TOP * .32, S * .17, 0, 7); F.fill();
        for (let i = 0; i < 14; i++) { const x = r() * W, rr = S * (.25 + r() * .3); F.fillStyle = ['#0b2a1a', '#0f3a24', '#123f2a'][i % 3]; F.beginPath(); F.arc(x, TOP * .85 + r() * TOP * .15, rr, 0, 7); F.fill(); }
      } else {
        const mont = (alto, col, nieve) => { F.fillStyle = col; F.beginPath(); F.moveTo(0, TOP); const picos = []; for (let x = 0; x <= W + 20; x += S * .55) { const y = TOP - alto * (.45 + r() * .55); picos.push([x, y]); F.lineTo(x, y); F.lineTo(x + S * .27, TOP - alto * (.2 + r() * .2)); } F.lineTo(W, TOP); F.fill(); if (nieve) { F.fillStyle = '#ffffff'; for (const [x, y] of picos) { F.beginPath(); F.moveTo(x - S * .09, y + S * .11); F.lineTo(x, y); F.lineTo(x + S * .09, y + S * .11); F.fill(); } } };
        F.fillStyle = '#fff7d6'; F.shadowColor = '#fde68a'; F.shadowBlur = 25; F.beginPath(); F.arc(W * .2, TOP * .55, S * .24, 0, 7); F.fill(); F.shadowBlur = 0;
        mont(TOP * .95, '#7c5c9e', true); mont(TOP * .6, '#4c6b3a', false);
      }
      for (let c = 0; c < L; c++) for (let rr = 0; rr < R; rr++) {
        const act = C.carriles.includes(c), x0 = c * S, y0 = TOP + rr * S;
        F.fillStyle = act ? ((c + rr) % 2 ? PAL.g1 : PAL.g2) : ((c + rr) % 2 ? PAL.t1 : PAL.t2); F.fillRect(x0, y0, S, S);
        if (act) { F.strokeStyle = Z === 'noche' ? 'rgba(10,40,20,.5)' : 'rgba(30,90,20,.35)'; F.lineWidth = 1.2; for (let k = 0; k < 8; k++) { const gx = x0 + r() * S, gy = y0 + r() * S; F.beginPath(); F.moveTo(gx, gy); F.quadraticCurveTo(gx + 2, gy - 4, gx + (r() - .5) * 5, gy - 6 - r() * 4); F.stroke(); }
          if (r() < (Z === 'noche' ? .12 : .2)) { const fx = x0 + S * .15 + r() * S * .7, fy = y0 + S * .15 + r() * S * .7; F.fillStyle = Z === 'noche' ? '#a5f3fc' : ['#fff', '#ffe066', '#ff9fc6', '#c4b5fd'][Math.floor(r() * 4)]; for (let p = 0; p < 5; p++) { F.beginPath(); F.arc(fx + Math.cos(p * 1.26) * 2.6, fy + Math.sin(p * 1.26) * 2.6, 2, 0, 7); F.fill(); } F.fillStyle = '#f59e0b'; F.beginPath(); F.arc(fx, fy, 1.6, 0, 7); F.fill(); }
          if (Z === 'noche' && r() < .07) { const hx = x0 + S * .2 + r() * S * .6, hy = y0 + S * .3 + r() * S * .5; F.fillStyle = '#f5f5f4'; F.fillRect(hx - 1.5, hy, 3, 6); F.fillStyle = '#22d3ee'; F.shadowColor = '#22d3ee'; F.shadowBlur = 8; F.beginPath(); F.arc(hx, hy, 5, Math.PI, 0); F.fill(); F.shadowBlur = 0; } }
        else { F.strokeStyle = 'rgba(40,25,10,.35)'; F.lineWidth = 2; for (let k = 1; k < 4; k++) { F.beginPath(); F.moveTo(x0 + 4, y0 + k * S / 4); F.lineTo(x0 + S - 4, y0 + k * S / 4); F.stroke(); } }
      }
      if (Z === 'andes') for (let rr = 0; rr <= R; rr++) { const y = TOP + rr * S - 3; F.fillStyle = '#8b7355'; F.fillRect(0, y, W, 6); for (let x = 0; x < W; x += 11) { F.fillStyle = ['#a8906c', '#9a8260', '#b59d78'][(x + rr) % 3]; F.beginPath(); F.ellipse(x + 5, y + 3, 5.5, 3.2, 0, 0, 7); F.fill(); F.strokeStyle = 'rgba(60,40,20,.5)'; F.lineWidth = 1; F.stroke(); } }
      // relieve de cada casilla: luz arriba a la izquierda, borde suave y franjas de pasto cortado
      for (let c = 0; c < L; c++) for (let rr = 0; rr < R; rr++) { if (!C.carriles.includes(c)) continue; const x0 = c * S, y0 = TOP + rr * S;
        const lz = F.createRadialGradient(x0 + S * .3, y0 + S * .25, S * .05, x0 + S * .5, y0 + S * .5, S * .75); lz.addColorStop(0, Z === 'noche' ? 'rgba(160,255,200,.10)' : 'rgba(255,255,200,.22)'); lz.addColorStop(1, 'rgba(0,0,0,.10)'); F.fillStyle = lz; F.fillRect(x0, y0, S, S);
        F.fillStyle = 'rgba(255,255,255,.05)'; for (let k = 0; k < 3; k++) F.fillRect(x0, y0 + k * S / 3, S, S / 6);
        F.strokeStyle = 'rgba(0,0,0,.10)'; F.lineWidth = 1; F.strokeRect(x0 + .5, y0 + .5, S - 1, S - 1); }
      // piedritas en el borde de los carriles cultivados
      for (const c of C.carriles) for (const lado of [0, 1]) { const vecino = lado ? c + 1 : c - 1; if (C.carriles.includes(vecino)) continue; const xb = c * S + (lado ? S : 0); for (let y = TOP + 4; y < TOP + R * S; y += S * .16) { F.fillStyle = ['#a8a29e', '#d6d3d1', '#78716c'][Math.floor(r() * 3)]; F.beginPath(); F.ellipse(xb + (lado ? -2 : 2), y, S * .055, S * .045, r(), 0, 7); F.fill(); F.strokeStyle = 'rgba(40,30,20,.45)'; F.lineWidth = 1; F.stroke(); } }
      F.fillStyle = 'rgba(0,0,0,.08)'; for (let c = 1; c < L; c++) F.fillRect(c * S - 1, TOP, 2, R * S);
      const sh = F.createLinearGradient(0, TOP, 0, TOP + S * .4); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); F.fillStyle = sh; F.fillRect(0, TOP, W, S * .4);
      // abajo: patio de piedra, cerco de madera con postes y la casita de adobe
      const yb = TOP + R * S, cxh = W / 2, hw = S * 1.6;
      const pat = F.createLinearGradient(0, yb, 0, H); pat.addColorStop(0, Z === 'noche' ? '#57534e' : '#d6b27a'); pat.addColorStop(1, Z === 'noche' ? '#292524' : '#a07a4a'); F.fillStyle = pat; F.fillRect(0, yb, W, BOT);
      for (let i = 0; i < 40; i++) { const px = r() * W, py = yb + BOT * (.55 + r() * .45); F.fillStyle = `rgba(${Z === 'noche' ? '200,190,170' : '120,85,45'},${.18 + r() * .2})`; F.beginPath(); F.ellipse(px, py, S * (.05 + r() * .07), S * (.025 + r() * .03), r(), 0, 7); F.fill(); }
      const sh2 = F.createLinearGradient(0, yb, 0, yb + BOT * .25); sh2.addColorStop(0, 'rgba(0,0,0,.35)'); sh2.addColorStop(1, 'rgba(0,0,0,0)'); F.fillStyle = sh2; F.fillRect(0, yb, W, BOT * .25);
      // cerco: dos travesaños con veta, tablas con punta, postes gruesos con tapa
      const mad = (x, y, w, h, base) => { const g = F.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, base[0]); g.addColorStop(.5, base[1]); g.addColorStop(1, base[2]); F.fillStyle = g; F.fillRect(x, y, w, h); };
      const MAD = Z === 'noche' ? ['#5b4532', '#7a5d42', '#4a3726'] : ['#a8743f', '#c99560', '#8a5a2e'];
      const fy0 = yb + BOT * .1, fy1 = yb + BOT * .78, hueco = (x0, x1) => x1 > cxh - hw / 2 - S * .08 && x0 < cxh + hw / 2 + S * .08;
      for (const ry of [.3, .6]) { const y = yb + BOT * ry; for (const [a, b] of [[0, cxh - hw / 2 - S * .08], [cxh + hw / 2 + S * .08, W]]) { mad(a, y, b - a, BOT * .09, ['#6b4423', '#8a5a2e', '#5a3a1e']); F.fillStyle = 'rgba(0,0,0,.25)'; F.fillRect(a, y + BOT * .09, b - a, 2); } }
      const tw = S * .2; for (let x = S * .05; x < W; x += S * .27) { if (hueco(x, x + tw)) continue; F.save(); F.shadowColor = 'rgba(0,0,0,.35)'; F.shadowBlur = 4; F.shadowOffsetY = 2; F.beginPath(); F.moveTo(x, fy1); F.lineTo(x, fy0 + S * .08); F.lineTo(x + tw / 2, fy0 - S * .02); F.lineTo(x + tw, fy0 + S * .08); F.lineTo(x + tw, fy1); F.closePath(); const g = F.createLinearGradient(x, 0, x + tw, 0); g.addColorStop(0, MAD[0]); g.addColorStop(.45, MAD[1]); g.addColorStop(1, MAD[2]); F.fillStyle = g; F.fill(); F.restore(); F.strokeStyle = 'rgba(60,30,10,.55)'; F.lineWidth = 1; F.stroke(); F.strokeStyle = 'rgba(60,30,10,.25)'; F.beginPath(); F.moveTo(x + tw * .35, fy0 + S * .15); F.lineTo(x + tw * .38, fy1 - 4); F.stroke(); F.fillStyle = 'rgba(40,20,5,.6)'; for (const ry of [.34, .64]) { F.beginPath(); F.arc(x + tw / 2, yb + BOT * ry, 1.4, 0, 7); F.fill(); } }
      for (const px of [S * .02, cxh - hw / 2 - S * .2, cxh + hw / 2 + S * .06, W - S * .16]) { mad(px, fy0 - S * .05, S * .14, fy1 - fy0 + S * .1, ['#4a2f17', '#6b4423', '#3f2812']); F.fillStyle = '#3f2812'; F.beginPath(); F.roundRect(px - S * .02, fy0 - S * .1, S * .18, S * .07, 3); F.fill(); }
      // casita de adobe con techo de tejas, chimenea, ventanas con luz y macetas
      const hy = yb + BOT * .02, hh = BOT * .9, tech = BOT * .42;
      const pared = F.createLinearGradient(0, hy, 0, hy + hh); pared.addColorStop(0, Z === 'andes' ? '#e7c7a0' : '#f3dfc0'); pared.addColorStop(1, Z === 'andes' ? '#c99f74' : '#d9b98c'); F.fillStyle = pared; F.fillRect(cxh - hw / 2, hy, hw, hh);
      F.fillStyle = 'rgba(120,80,40,.12)'; for (let k = 0; k < 14; k++) F.fillRect(cxh - hw / 2 + r() * hw * .9, hy + r() * hh * .9, S * .12, S * .04);
      F.strokeStyle = 'rgba(90,50,20,.45)'; F.lineWidth = 1.5; F.strokeRect(cxh - hw / 2, hy, hw, hh);
      F.fillStyle = '#78350f'; F.fillRect(cxh + hw * .22, hy - tech * .95, S * .16, tech * .6);
      const tj2 = F.createLinearGradient(0, hy - tech, 0, hy); tj2.addColorStop(0, '#ea580c'); tj2.addColorStop(1, '#9a3412'); F.fillStyle = tj2; F.beginPath(); F.moveTo(cxh - hw / 2 - S * .16, hy + 3); F.lineTo(cxh, hy - tech); F.lineTo(cxh + hw / 2 + S * .16, hy + 3); F.closePath(); F.fill(); F.strokeStyle = '#7c2d12'; F.lineWidth = 2; F.stroke();
      F.save(); F.clip(); F.strokeStyle = 'rgba(124,45,18,.55)'; F.lineWidth = 1.2; for (let k = 1; k < 6; k++) { const yy = hy - tech + tech * k / 6; F.beginPath(); F.moveTo(0, yy); F.lineTo(W, yy); F.stroke(); for (let x = cxh - hw; x < cxh + hw; x += S * .14) { F.beginPath(); F.arc(x + (k % 2) * S * .07, yy, S * .07, 0, Math.PI); F.stroke(); } } F.restore();
      const pu = cxh - S * .16; F.fillStyle = '#5b2e0e'; F.beginPath(); F.roundRect(pu, hy + hh * .38, S * .32, hh * .62, [S * .16, S * .16, 0, 0]); F.fill(); F.fillStyle = '#7c3f14'; F.beginPath(); F.roundRect(pu + S * .03, hy + hh * .42, S * .26, hh * .58, [S * .13, S * .13, 0, 0]); F.fill(); F.fillStyle = '#fbbf24'; F.beginPath(); F.arc(pu + S * .24, hy + hh * .72, S * .025, 0, 7); F.fill();
      for (const q of [-1, 1]) { const wx = cxh + q * hw * .3 - S * .12, wy = hy + hh * .28; F.fillStyle = '#5b3a1a'; F.fillRect(wx - 3, wy - 3, S * .24 + 6, S * .2 + 6); const vid = F.createLinearGradient(wx, wy, wx, wy + S * .2); vid.addColorStop(0, Z === 'noche' ? '#fde68a' : '#bae6fd'); vid.addColorStop(1, Z === 'noche' ? '#f59e0b' : '#38bdf8'); F.fillStyle = vid; if (Z === 'noche') { F.shadowColor = '#fbbf24'; F.shadowBlur = 14; } F.fillRect(wx, wy, S * .24, S * .2); F.shadowBlur = 0; F.fillStyle = '#5b3a1a'; F.fillRect(wx + S * .11, wy, 2, S * .2); F.fillRect(wx, wy + S * .09, S * .24, 2);
        F.fillStyle = '#9a3412'; F.fillRect(wx - S * .02, wy + S * .22, S * .28, S * .07); for (let k = 0; k < 4; k++) { F.fillStyle = ['#f43f5e', '#facc15', '#a855f7', '#fb923c'][k]; F.beginPath(); F.arc(wx + S * .03 + k * S * .065, wy + S * .2, S * .035, 0, 7); F.fill(); } }
      const vg = F.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, Z === 'noche' ? 'rgba(0,0,20,.45)' : 'rgba(0,0,0,.25)'); F.fillStyle = vg; F.fillRect(0, 0, W, H);
    }
    // Ambiente animado: nubes, mariposas, luciérnagas, cóndor
    const AMB = [...Array(Z === 'noche' ? 26 : 3)].map((_, i) => ({ x: Math.random() * W, y: Z === 'noche' ? TOP + Math.random() * R * S : Math.random() * TOP * .5, f: Math.random() * 9, v: .3 + Math.random() * .7 }));
    const BICHOS = Z === 'dia' ? [0, 1].map(i => ({ x: Math.random() * W, y: TOP + Math.random() * R * S, f: Math.random() * 9, c: ['#f472b6', '#facc15'][i] })) : [];
    function ambiente(t) {
      if (Z !== 'noche') for (const a of AMB) { const x = ((a.x + t * S * .15 * a.v) % (W + S * 2)) - S; X.fillStyle = 'rgba(255,255,255,.85)'; X.beginPath(); X.ellipse(x, a.y + TOP * .1, S * .3, S * .1, 0, 0, 7); X.ellipse(x + S * .15, a.y + TOP * .05, S * .2, S * .11, 0, 0, 7); X.ellipse(x - S * .15, a.y + TOP * .1, S * .15, S * .08, 0, 0, 7); X.fill(); }
      else for (const a of AMB) { const x = a.x + Math.sin(t * .7 + a.f) * S * .4, y = a.y + Math.cos(t * .5 + a.f * 2) * S * .3, b = .5 + .5 * Math.sin(t * 3 + a.f * 4); X.fillStyle = `rgba(217,255,107,${.25 + b * .7})`; X.shadowColor = '#d9ff6b'; X.shadowBlur = 10; X.beginPath(); X.arc(x, y, 2 + b * 1.5, 0, 7); X.fill(); } X.shadowBlur = 0;
      for (const m of BICHOS) { const x = (m.x + t * S * .25) % (W + S) - S * .5, y = m.y + Math.sin(t * 1.3 + m.f) * S * .4, al = Math.abs(Math.sin(t * 14 + m.f)) * S * .09 + S * .02; X.fillStyle = m.c; X.beginPath(); X.ellipse(x - al * .6, y, al, S * .07, -.4, 0, 7); X.ellipse(x + al * .6, y, al, S * .07, .4, 0, 7); X.fill(); X.fillStyle = '#3f2a1a'; X.fillRect(x - 1, y - S * .05, 2, S * .1); }
      if (Z === 'andes') { const x = (t * S * .35) % (W + S * 3) - S * 1.5, y = TOP * .3 + Math.sin(t * .6) * TOP * .1, al = Math.sin(t * 2) * S * .06; X.strokeStyle = '#1c1917'; X.lineWidth = 3; X.lineCap = 'round'; X.beginPath(); X.moveTo(x - S * .4, y - al); X.quadraticCurveTo(x - S * .2, y - S * .1 + al, x, y); X.quadraticCurveTo(x + S * .2, y - S * .1 + al, x + S * .4, y - al); X.stroke(); X.fillStyle = '#fff'; X.beginPath(); X.arc(x, y - 1, 2.5, 0, 7); X.fill(); X.lineCap = 'butt'; }
    }
    const chispas = (x, y, c, k, f = 1) => { for (let i = 0; i < k; i++) { const a = Math.random() * 7, v = (1 + Math.random() * 3) * f * S / 60; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S / 50, v: .6 + Math.random() * .4, max: 1, r: S * (.025 + Math.random() * .035), c }); } };
    const banner = (txt, tam = S * .42, dur = 2.2) => { for (const x of textos) if (x.fijo === 1) x.v = Math.min(x.v, .15); textos.push({ txt, x: W / 2, y: TOP + R * S * .42, tam, v: dur, max: dur, fijo: 1 }); };
    const aviso = txt => { if (performance.now() - ultAviso < 1200) return; ultAviso = performance.now(); textos.push({ txt, x: W / 2, y: TOP + R * S * .7, tam: S * .26, v: 1.6, max: 1.6, fijo: 2 }); FX.son('error'); };
    function explotar(x, y, alto, dmg, c, ancho) {
      for (const e of enes) if (e.hp > 0 && Math.abs(e.c - c) <= ancho && Math.abs(e.y - y) <= alto) herir(e, dmg);
      ondas.push({ x, y, r: 0, max: S * (ancho ? 1.6 : .9), v: .45 }); shake = .45; FX.son('explosion'); FX.vibrar(90); textos.push({ txt: '¡BUM!', x, y: y - S * .2, tam: S * .5, v: .9, max: .9 });
      for (let i = 0; i < 34; i++) { const a = Math.random() * 7, v = (1.5 + Math.random() * 4) * S / 50; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, v: .5 + Math.random() * .5, max: 1, r: S * (.04 + Math.random() * .06), c: ['#fff3a0', '#ffb703', '#fb5607', '#ff006e'][i % 4] }); }
    }
    const herir = (e, d) => { e.hp -= d; e.flash = 1; };
    const decir = (o, txt, dur = 1.8) => { o.dice = { txt, v: dur }; };
    function hablar(e, lista, prob = 1, forzar = false) { if (Math.random() > prob) return; const txt = azar(lista); decir(e, txt); voz(txt, e.tipo, { forzar }); }
    function burbuja(x, y, txt) { textos.push({ txt, x, y, tam: S * .2, v: 1.5, max: 1.5, burbuja: 1 }); }
    const racha = [];
    function disparar(d, segundo) {
      balas.push({ x: d.x, y: d.y - S * .3, c: d.c, tipo: d.k === 'limon' ? 'hielo' : d.k === 'palta' ? 'pepa' : 'grano', dmg: (d.k === 'limon' ? 24 : 30) * (furiaT > 0 ? 1.4 : 1), oro: furiaT > 0 });
      d.kick = 1; if (d.k === 'palta' && !segundo) d.doble = .2;
    }
    function recoger(g) { g.vuela = .001; g.x0 = g.x; g.y0 = g.y; FX.son(g.moneda ? 'moneda' : g.oro ? 'combo' : 'pop'); if (g.oro) textos.push({ txt: '¡Gota dorada! +75', x: g.x, y: g.y - S * .3, tam: S * .22, v: 1.2, max: 1.2 }); FX.vibrar(8); if (tutorial === 2) tutorial = 3; }

    function update(dt) {
      tj += dt; if (furiaT > 0) { furiaT -= dt; if (furiaT <= 0) FX.intensidad?.(avisoOla ? 2 : 1); }
      for (const k in cool) cool[k] = Math.max(0, cool[k] - dt);
      while (evI < C.ev.length && C.ev[evI].t <= tj) { const e = C.ev[evI++], d = ENE[e.tipo]; enes.push({ tipo: e.tipo, c: e.c, x: cx(e.c), y: TOP - S * .45, hp: d.hp, max: d.hp, lento: 0, f: Math.random() * 9, t: 0, flash: 0, salto: 0, saltado: false, come: false }); const nueva = enes[enes.length - 1]; if (e.tipo === 'topo') { nueva.y = TOP + S * (2.2 + Math.random() * 1.6); chispas(nueva.x, nueva.y + S * .25, '#7a5a2a', 18, 1.2); FX.son('choque'); shake = Math.max(shake, .15); hablar(nueva, FRASES.llega.topo, .8); } if (e.tipo === 'rata') { banner('🐀 ¡Llegó la rata jefa!', S * .34); FX.son('jefe'); FX.musica?.('jefe'); setTimeout(() => hablar(nueva, FRASES.llega.rata, 1, true), 900); } else hablar(nueva, FRASES.llega[e.tipo], evI <= 2 ? 1 : .35); }
      if (!avisoOla && tj >= C.ola - 2) { avisoOla = true; banner('🚨 ¡Gran oleada!', S * .5, 2.6); FX.son('sirena'); FX.vibrar([60, 60, 60]); FX.intensidad?.(2); voz('¡Cuidado! ¡Se viene una gran oleada!', 'narrador', { forzar: true, cortar: true, tono: 1.1 }); }
      lluvia -= dt; if (lluvia <= 0) { lluvia = (n >= 20 ? 5.8 : 7) + Math.random() * 3.2; const c = C.carriles[Math.floor(Math.random() * C.carriles.length)]; const oro = Math.random() < .12; gotas.push({ x: cx(c) + (Math.random() - .5) * S * .4, y: -S * .3, ty: TOP + S * (.8 + Math.random() * (R - 1.8)), v: 11, val: oro ? 75 : 25, oro, vuela: 0, cae: .9 }); if (tutorial === 1) tutorial = 2; }
      for (const d of defs.values()) {
        d.t += dt; d.kick = Math.max(0, d.kick - dt * 5); d.nace = Math.max(0, d.nace - dt * 4); d.golpe = Math.max(0, (d.golpe || 0) - dt);
        if (d.k === 'hongo') { d.timer += dt; d.carga = d.timer / (d.prim ? 5 : 9.5); if (d.carga >= 1) { d.timer = 0; d.prim = false; d.kick = 1; gotas.push({ x: d.x, y: d.y - S * .3, ty: d.y + S * .1, x2: d.x + (Math.random() < .5 ? -1 : 1) * S * .28, v: 11, val: 25, vuela: 0, cae: 2.4 }); } }
        else if (d.k === 'aji') { d.timer += dt; if (d.timer >= .9) { voz('¡Picanteee!', 'aji', { forzar: true, tono: 1.6, vel: 1.3 }); explotar(d.x, d.y, S * 1.6, 1800, d.c, 1); defs.delete(d.key); } }
        else if (d.k === 'pina') { d.timer += dt; if (!d.armado && d.timer >= 12) { d.armado = true; chispas(d.x, d.y + S * .2, '#8b5a2b', 10); FX.son('click'); } }
        else if (d.k === 'cebolla') { d.timer += dt; if (d.timer >= 1) { d.timer = 0; let hit = 0; for (const e of enes) if (e.hp > 0 && Math.abs(e.c - d.c) <= 1 && Math.abs(e.y - d.y) < S * 1.15) { herir(e, 34); hit++; } if (hit) { d.kick = 1; ondas.push({ x: d.x, y: d.y, r: 0, max: S * 1.3, v: .45, col: '125,211,252' }); for (let i = 0; i < 6; i++) parts.push({ x: d.x, y: d.y - S * .1, vx: (Math.random() - .5) * S / 14, vy: -Math.random() * S / 30, v: .6, max: .6, r: S * .035, c: '#bae6fd' }); } } }
        else if (d.k === 'quinua') { d.timer += dt; d.carga = d.timer / 4; if (d.timer >= 4) { d.timer = 0; let nc = 0; for (const o of defs.values()) if (o !== d && o.k !== 'aji' && Math.abs(o.c - d.c) <= 1 && Math.abs(o.r - d.r) <= 1 && o.hp < o.max) { o.hp = Math.min(o.max, o.hp + o.max * .3); nc++; chispas(o.x, o.y - S * .1, '#86efac', 9, .6); textos.push({ txt: '+💚', x: o.x, y: o.y - S * .4, tam: S * .22, v: .8, max: .8 }); } if (nc) { d.kick = 1; ondas.push({ x: d.x, y: d.y, r: 0, max: S * 1.5, v: .5, d: .5, col: '134,239,172' }); } } }
        else if (d.k === 'maracuya') {
          const ob = enes.filter(e => e.c === d.c && e.hp > 0 && e.y < d.y && e.y > TOP - S * .5).sort((a, b) => b.y - a.y)[0];
          d.timer = ob ? d.timer + dt * (furiaT > 0 ? 3 : 1) : Math.min(d.timer + dt, 1.5);
          if (ob && d.timer >= 2.2) { d.timer = 0; d.kick = 1; const golpeados = [ob], pts = [[d.x, d.y - S * .35], [ob.x, ob.y]]; let act = ob;
            for (let k = 0; k < 2; k++) { const sig = enes.filter(e => e.hp > 0 && !golpeados.includes(e) && Math.hypot(e.x - act.x, e.y - act.y) < S * 1.8).sort((a, b) => Math.hypot(a.x - act.x, a.y - act.y) - Math.hypot(b.x - act.x, b.y - act.y))[0]; if (!sig) break; golpeados.push(sig); pts.push([sig.x, sig.y]); act = sig; }
            golpeados.forEach((e, i) => { herir(e, [70, 50, 40][i] * (furiaT > 0 ? 1.5 : 1)); chispas(e.x, e.y, '#fef08a', 7, .9); });
            rayos.push({ pts, v: .32 }); FX.son('swish'); if (golpeados.length >= 3) textos.push({ txt: '⚡ x3', x: act.x, y: act.y - S * .45, tam: S * .26, v: .8, max: .8 }); } }
        else if (d.k !== 'coco') {
          const hay = enes.some(e => e.c === d.c && e.hp > 0 && e.y < d.y && e.y > TOP - S * .5);
          d.timer = hay ? d.timer + dt : Math.min(d.timer + dt, 1.1);
          if (hay && d.timer >= (d.k === 'limon' ? 1.6 : 1.45) * (furiaT > 0 ? .34 : 1)) { d.timer = 0; disparar(d); }
          if (d.doble > 0) { d.doble -= dt; if (d.doble <= 0) disparar(d, true); }
        }
      }
      for (const b of balas) {
        b.y -= S * 6.5 * dt; if (b.y < -S) b.fuera = 1;
        for (const e of enes) if (e.hp > 0 && e.c === b.c && e.salto <= 0 && b.y <= e.y + S * .3 && b.y >= e.y - S * .5) { herir(e, b.dmg); FX.son(b.tipo === 'hielo' ? 'hielo' : 'splat'); if (b.tipo === 'hielo') e.lento = 3.5; b.fuera = 1; chispas(b.x, b.y, b.tipo === 'hielo' ? '#c8f6ff' : b.tipo === 'pepa' ? '#a0682f' : '#ffd84d', 5, .7); break; }
      }
      for (let i = balas.length - 1; i >= 0; i--) if (balas[i].fuera) balas.splice(i, 1);
      for (const e of enes) {
        if (e.hp <= 0) continue;
        e.t += dt; e.flash = Math.max(0, e.flash - dt * 6); e.lento = Math.max(0, e.lento - dt);
        if (e.salto > 0) { e.salto -= dt; const p = 1 - Math.max(0, e.salto) / .6; e.y = e.s0 + (e.s1 - e.s0) * p; continue; }
        let blk = null; for (const d of defs.values()) if (d.c === e.c && d.y > e.y && d.y - e.y < S * .62 && !(e.tipo === 'polilla' && (d.k === 'coco' || d.k === 'pina'))) { blk = d; break; }
        if (blk && blk.k === 'pina' && blk.armado) { defs.delete(blk.key); explotar(blk.x, blk.y, S * .75, 1800, blk.c, 0); continue; }
        if (blk && e.tipo === 'langosta' && !e.saltado) { e.saltado = true; e.salto = .6; e.s0 = e.y; e.s1 = blk.y + S * .5; FX.son('swish'); continue; }
        if (blk && blk.k !== 'aji') { if (!e.come) { hablar(e, FRASES.come, .45); if (blk.k === 'coco' && !blk.hablo) { blk.hablo = 1; decir(blk, azar(FRASES.def.coco)); } } if (Math.random() < dt * 2) FX.son('comer'); e.come = true; blk.hp -= (e.tipo === 'rata' ? 240 : 110) * dt; blk.golpe = .12; if (Math.random() < dt * 5) chispas(blk.x, blk.y - S * .25, '#9be36b', 2, .5);
          if (blk.hp <= 0) { defs.delete(blk.key); chispas(blk.x, blk.y, '#7a5a2a', 14); FX.son('choque'); FX.vibrar(30); } }
        else { e.come = false; e.y += ENE[e.tipo].vel * S * (e.lento > 0 ? .5 : 1) * dt; }
        if (e.y > TOP + R * S + S * .1) { e.hp = 0; e.llego = 1; vidas--; rojo = 1; shake = .5; FX.son('perder'); burbuja(e.x, TOP + R * S - S * .2, azar(FRASES.entra)); voz(azar(FRASES.entra), e.tipo, { forzar: true }); FX.vibrar([120, 60, 120]); banner(vidas > 0 ? `💔 ¡Una plaga entró! Quedan ${vidas}` : '💔', S * .3, 1.8); if (vidas <= 0) { perder(); return; } }
      }
      for (let i = enes.length - 1; i >= 0; i--) { const e = enes[i]; if (e.hp <= 0) { if (!e.llego) { caidos.push({ e, v: .55 }); furia = Math.min(1, furia + ENE[e.tipo].pts / (e.tipo === 'rata' ? 120 : 260)); puntos += ENE[e.tipo].pts; chispas(e.x, e.y, '#c6f06a', 12); chispas(e.x, e.y, '#ffffff', 6, 1.4); FX.son('pop');
          if (Math.random() < (e.tipo === 'rata' ? 1 : .4)) { const f = azar(FRASES.muere); burbuja(e.x, e.y - S * .3, f); voz(f, e.tipo, { forzar: e.tipo === 'rata' }); }
          if (e.tipo === 'rata') { FX.musica?.('huerto'); FX.intensidad?.(avisoOla ? 2 : 1); }
          if (Math.random() < (e.tipo === 'rata' ? 1 : .1)) gotas.push({ x: e.x, y: e.y - S * .2, ty: e.y + S * .1, v: 9, val: e.tipo === 'rata' ? 5 : 1, moneda: 1, vuela: 0, cae: 2 });
          const ah = tj; racha.push(ah); while (racha.length && ah - racha[0] > 1.6) racha.shift();
          if (racha.length >= 2) { const k = racha.length, txt = k === 2 ? '¡DOBLE!' : k === 3 ? '¡TRIPLE!' : '¡IMPARABLE!'; textos.push({ txt, x: e.x, y: e.y - S * .5, tam: S * (.3 + k * .04), v: 1.1, max: 1.1 }); puntos += 15 * k; FX.son('combo'); if (k >= 3) voz(k === 3 ? '¡Triple!' : '¡Imparable!', 'narrador', { forzar: true, tono: 1.2 }); } } enes.splice(i, 1); } }
      for (const g of gotas) {
        if (g.vuela) { g.vuela += dt * 2.6; const p = Math.min(1, g.vuela), q = p * p; g.x = g.x0 + (S * .4 - g.x0) * q; g.y = g.y0 + (H + S * .3 - g.y0) * q; if (p >= 1) { if (g.moneda) { PERFIL.ganar(g.val); FX.son('moneda'); textos.push({ txt: `+${g.val} 🪙`, x: S * .8, y: H - S * .2, tam: S * .26, v: 1, max: 1 }); } else agua += g.val; g.fuera = 1; } continue; }
        if (g.y < g.ty) { g.y = Math.min(g.ty, g.y + S * g.cae * dt); if (g.x2 != null) g.x += (g.x2 - g.x) * Math.min(1, dt * 5); } else { g.v -= dt; if (g.v <= 0) g.fuera = 1; }
      }
      for (let i = gotas.length - 1; i >= 0; i--) if (gotas[i].fuera) gotas.splice(i, 1);
      if (evI >= C.ev.length && !enes.length && !fin) ganar();
    }

    function globo(o, x, y) {
      if (!o.dice || o.dice.v <= 0) return; X.font = `800 ${S * .19}px Figtree,sans-serif`; const w = Math.min(W * .62, X.measureText(o.dice.txt).width + S * .3), h = S * .32; x = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x)); y = Math.max(h + 4, y);
      X.globalAlpha = Math.min(1, o.dice.v * 3); X.fillStyle = '#fff'; X.strokeStyle = '#1b1b2f'; X.lineWidth = 2; X.beginPath(); X.roundRect(x - w / 2, y - h, w, h, h / 2); X.fill(); X.stroke();
      X.beginPath(); X.moveTo(x - 5, y - 1); X.lineTo(x, y + 7); X.lineTo(x + 5, y - 1); X.fill(); X.fillStyle = '#1b1b2f'; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(o.dice.txt, x, y - h / 2 + 1, w - 8); X.textBaseline = 'alphabetic'; X.globalAlpha = 1;
    }
    function dibujar(dt) {
      for (const o of [...enes, ...defs.values()]) if (o.dice) o.dice.v -= dt;
      for (const p of parts) { p.x += p.vx * 60 * dt; p.y += p.vy * 60 * dt; p.vy += S / 400 * 60 * dt; p.v -= dt; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].v <= 0) parts.splice(i, 1);
      for (const o of ondas) { o.v -= dt; o.r = Math.max(0, o.max * (1 - Math.max(0, o.v) / (o.d || .45))); }
      for (let i = ondas.length - 1; i >= 0; i--) if (ondas[i].v <= 0) ondas.splice(i, 1);
      for (const tx of textos) { tx.v -= dt; if (!tx.fijo) tx.y -= S * .5 * dt; }
      for (let i = textos.length - 1; i >= 0; i--) if (textos[i].v <= 0) textos.splice(i, 1);
      shake = Math.max(0, shake - dt); rojo = Math.max(0, rojo - dt * 1.5);
      X.save(); if (shake > 0) X.translate((Math.random() - .5) * S * .25 * shake, (Math.random() - .5) * S * .25 * shake);
      X.drawImage(fondo, 0, 0, W, H); ambiente(performance.now() / 1000);
      if (sel) { X.fillStyle = `rgba(255,255,255,${.1 + .07 * Math.sin(performance.now() / 160)})`; for (const c of C.carriles) for (let r = 0; r < R; r++) if (!defs.has(c * R + r)) { X.beginPath(); X.roundRect(c * S + 4, TOP + r * S + 4, S - 8, S - 8, 10); X.fill(); } }
      if (pala) { X.strokeStyle = 'rgba(255,90,90,.85)'; X.lineWidth = 3; for (const d of defs.values()) { X.beginPath(); X.roundRect(d.c * S + 4, TOP + d.r * S + 4, S - 8, S - 8, 10); X.stroke(); } }
      const todo = [...[...defs.values()].map(d => ({ z: d.y + S * .1, d })), ...enes.map(e => ({ z: e.y, e }))].sort((a, b) => a.z - b.z);
      for (const it of todo) {
        if (it.d) { const d = it.d, sc = 1 - d.nace * .7; X.save(); X.translate(d.x, d.y + S * .3); X.scale(sc, sc); X.translate(-d.x, -(d.y + S * .3)); if (d.golpe > 0) X.translate(Math.sin(performance.now() / 20) * S * .02, 0);
          dibD(d.k, X, d.x, d.y, S, { t: d.t, f: d.f, kick: d.kick, frac: d.hp / d.max, armado: d.armado, timer: d.timer, carga: d.carga || 0 }); X.restore(); if (d.hp < d.max && d.k !== 'aji') { const w = S * .55, f = Math.max(0, d.hp / d.max); X.fillStyle = 'rgba(0,0,0,.55)'; X.beginPath(); X.roundRect(d.x - w / 2, d.y + S * .36, w, 5, 3); X.fill(); X.fillStyle = f > .5 ? '#4ade80' : f > .25 ? '#facc15' : '#ef4444'; X.beginPath(); X.roundRect(d.x - w / 2, d.y + S * .36, w * f, 5, 3); X.fill(); } globo(d, d.x, d.y - S * .5); }
        else { const e = it.e; if (e.flash > .4) X.filter = 'brightness(1.9)';
          dibP(e.tipo, X, e.x + (e.come ? Math.sin(e.t * 14) * S * .015 : 0), e.y - (e.tipo === 'polilla' ? S * (.18 + Math.sin(e.t * 3) * .05) : 0), S, { t: e.t + e.f, frac: e.hp / e.max, come: e.come, salto: e.salto });
          X.filter = 'none';
          if (e.lento > 0) { X.fillStyle = 'rgba(140,220,255,.32)'; X.beginPath(); X.ellipse(e.x, e.y, S * .32, S * .4, 0, 0, 7); X.fill(); X.fillStyle = '#e8fbff'; for (let k = 0; k < 3; k++) { const a = e.t * 2 + k * 2.1; X.beginPath(); X.arc(e.x + Math.cos(a) * S * .3, e.y + Math.sin(a) * S * .3, S * .025, 0, 7); X.fill(); } }
          globo(e, e.x, e.y - S * .62);
          if (e.hp < e.max) { const w = S * .5; X.fillStyle = 'rgba(0,0,0,.5)'; X.beginPath(); X.roundRect(e.x - w / 2, e.y - S * .55, w, 5, 3); X.fill(); X.fillStyle = e.hp / e.max > .5 ? '#4ade80' : e.hp / e.max > .25 ? '#facc15' : '#ef4444'; X.beginPath(); X.roundRect(e.x - w / 2, e.y - S * .55, w * Math.max(0, e.hp / e.max), 5, 3); X.fill(); } }
      }
      for (let i = caidos.length - 1; i >= 0; i--) { const c = caidos[i], e = c.e; c.v -= dt; if (c.v <= 0) { caidos.splice(i, 1); continue; } const p = 1 - c.v / .55; X.save(); X.globalAlpha = Math.max(0, 1 - p * 1.1); X.translate(e.x, e.y + S * .3); X.rotate(p * (e.c % 2 ? 1.4 : -1.4)); X.scale(1 - p * .4, 1 - p * .55); X.filter = 'grayscale(.6) brightness(1.3)'; dibP(e.tipo, X, 0, -S * .3, S, { t: e.t + e.f, frac: 0, come: false, salto: 0 }); X.restore(); X.filter = 'none'; }
      for (const b of balas) {
        { const tr = X.createLinearGradient(b.x, b.y, b.x, b.y + S * .55); tr.addColorStop(0, b.oro ? 'rgba(253,224,71,.85)' : b.tipo === 'hielo' ? 'rgba(165,243,252,.7)' : 'rgba(255,240,170,.55)'); tr.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = tr; X.beginPath(); X.moveTo(b.x - S * .05, b.y); X.lineTo(b.x + S * .05, b.y); X.lineTo(b.x, b.y + S * .55); X.fill(); }
        if (b.oro) { X.save(); X.shadowColor = '#fde047'; X.shadowBlur = 16; X.fillStyle = '#fef9c3'; X.beginPath(); X.arc(b.x, b.y, S * .1, 0, 7); X.fill(); X.restore(); continue; }
        if (b.tipo === 'hielo') { X.shadowColor = '#7fe3ff'; X.shadowBlur = 10; X.fillStyle = '#d8f8ff'; X.beginPath(); X.arc(b.x, b.y, S * .08, 0, 7); X.fill(); X.shadowBlur = 0; }
        else { const r = b.tipo === 'pepa' ? S * .085 : S * .065; X.fillStyle = 'rgba(255,255,255,.25)'; X.beginPath(); X.ellipse(b.x, b.y + r * 1.6, r * .6, r * 1.4, 0, 0, 7); X.fill(); X.beginPath(); X.arc(b.x, b.y, r, 0, 7); X.fillStyle = rad(X, b.x, b.y, r, b.tipo === 'pepa' ? '#e0a46a' : '#fff6a8', b.tipo === 'pepa' ? '#6b3a17' : '#e0a000'); X.fill(); X.strokeStyle = 'rgba(60,30,0,.5)'; X.lineWidth = 1; X.stroke(); }
      }
      for (let i = rayos.length - 1; i >= 0; i--) { const ry = rayos[i]; ry.v -= dt; if (ry.v <= 0) { rayos.splice(i, 1); continue; } X.save(); X.globalCompositeOperation = 'lighter'; X.lineCap = 'round'; X.lineJoin = 'round';
        for (const [w, c] of [[S * .16, 'rgba(250,204,21,.35)'], [S * .06, 'rgba(254,240,138,.9)'], [S * .022, '#ffffff']]) { X.strokeStyle = c; X.lineWidth = w * (ry.v / .32 + .3); X.beginPath(); ry.pts.forEach(([x0, y0], j) => { if (!j) return X.moveTo(x0, y0); const [xa, ya] = ry.pts[j - 1]; for (let k = 1; k <= 5; k++) X.lineTo(xa + (x0 - xa) * k / 5 + (k < 5 ? (Math.random() - .5) * S * .3 : 0), ya + (y0 - ya) * k / 5 + (k < 5 ? (Math.random() - .5) * S * .3 : 0)); }); X.stroke(); } X.restore(); }
      if (furiaT > 0) { const a = Math.min(1, furiaT) * (.18 + .08 * Math.sin(performance.now() / 90)); const g = X.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, H * .75); g.addColorStop(0, 'rgba(250,204,21,0)'); g.addColorStop(1, `rgba(250,204,21,${a * 2})`); X.fillStyle = g; X.fillRect(0, 0, W, H); }
      for (const o of ondas) { X.strokeStyle = `rgba(${o.col || '255,200,80'},${Math.max(0, o.v / .45)})`; X.lineWidth = S * .12 * Math.max(.1, o.v / .45); X.beginPath(); X.arc(o.x, o.y, o.r, 0, 7); X.stroke(); X.fillStyle = `rgba(${o.col || '255,240,180'},${Math.max(0, o.v / .45) * .3})`; X.fill(); }
      for (const p of parts) { X.globalAlpha = Math.max(0, p.v / p.max); X.fillStyle = p.c; X.beginPath(); X.arc(p.x, p.y, p.r, 0, 7); X.fill(); } X.globalAlpha = 1;
      for (const g of gotas) { const bob = g.vuela ? 0 : Math.sin(performance.now() / 300 + g.ty) * S * .03; X.globalAlpha = g.v < 3 && !g.vuela ? (Math.sin(performance.now() / 80) > 0 ? 1 : .35) : 1; X.shadowColor = '#7fd3ff'; X.shadowBlur = 14; if (g.moneda) { const rr = S * .15, sx = Math.abs(Math.cos(performance.now() / 200)); X.shadowColor = '#ffd23f'; X.fillStyle = '#ffd23f'; X.beginPath(); X.ellipse(g.x, g.y + bob, rr * Math.max(.2, sx), rr, 0, 0, 7); X.fill(); X.strokeStyle = '#b45309'; X.lineWidth = 2; X.stroke(); } else gota(X, g.x, g.y + bob, S * .17 * (g.oro ? 1.25 : 1) * (g.vuela ? 1 - g.vuela * .4 : 1), g.oro); X.shadowBlur = 0; X.globalAlpha = 1; }
      // Indicaciones del primer nivel
      if (tutorial === 1 && !defs.size) { const k = sel ? 'Toca una casilla del huerto' : 'Elige un defensor abajo 👇'; X.font = `900 ${S * .24}px Figtree,sans-serif`; X.textAlign = 'center'; X.lineWidth = 5; X.strokeStyle = 'rgba(0,0,0,.6)'; X.strokeText(k, W / 2, TOP + R * S * .55); X.fillStyle = '#fff'; X.fillText(k, W / 2, TOP + R * S * .55); }
      if (tutorial === 2 && gotas.some(g => !g.vuela)) { const g = gotas.find(g => !g.vuela), y = g.y - S * .45 + Math.sin(performance.now() / 150) * 4; X.font = `900 ${S * .22}px Figtree,sans-serif`; X.textAlign = 'center'; X.lineWidth = 5; X.strokeStyle = 'rgba(0,0,0,.6)'; X.strokeText('¡Tócala! 👆', g.x, y); X.fillStyle = '#fff'; X.fillText('¡Tócala! 👆', g.x, y); }
      for (const tx of textos) { if (tx.burbuja) { const o = { dice: { txt: tx.txt, v: tx.v } }; globo(o, tx.x, tx.y); continue; } const a = Math.min(1, tx.v / .35, (tx.max - tx.v) / .15 + .2), sc = tx.fijo ? 1 + Math.max(0, .25 - (tx.max - tx.v)) * 1.5 : 1; X.globalAlpha = Math.max(0, a); X.font = `900 ${tx.tam * sc}px Figtree,sans-serif`; X.textAlign = 'center'; X.lineWidth = Math.max(4, tx.tam * .16); X.strokeStyle = 'rgba(40,10,20,.75)'; X.strokeText(tx.txt, tx.x, tx.y, W * .94); X.fillStyle = '#fff'; X.fillText(tx.txt, tx.x, tx.y, W * .94); } X.globalAlpha = 1;
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
        if (k === 'furia') { b.querySelector('i').style.width = (furiaT > 0 ? furiaT / 6 * 100 : furia * 100) + '%'; b.style.boxShadow = furia >= 1 ? `0 0 ${10 + 8 * Math.sin(now / 150)}px #fde047` : ''; b.style.opacity = furia >= 1 || furiaT > 0 ? 1 : .7; return; }
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
      chispas(cx(c), cy(r) + S * .3, '#8b5a2b', 8, .6); FX.son('plantar'); FX.vibrar(12); if (Math.random() < .45) { const f = azar(FRASES.def[sel]); decir(defs.get(key), f, 1.4); voz(f, sel); } sel = null;
    });
    $('#semillas').onclick = e => { const b = e.target.closest('.semi'); if (!b || fin) return; const k = b.dataset.k;
      if (k === 'furia') { if (furia < 1 || furiaT > 0) return aviso('⚡ Elimina más plagas para cargar la Furia'); furia = 0; furiaT = 6; pala = false; sel = null;
        for (const e of enes) if (e.hp > 0) { herir(e, 140); chispas(e.x, e.y, '#fde047', 10, 1.2); }
        ondas.push({ x: W / 2, y: TOP + R * S, r: 0, max: H * 1.1, v: .7, d: .7, col: '253,224,71' }); shake = .6; banner('⚡ ¡FURIA DEL HUERTO!', S * .44, 2.2); FX.son('combo'); FX.son('explosion'); FX.vibrar([80, 40, 120]); FX.intensidad?.(3);
        for (const d of defs.values()) { d.kick = 1; if (Math.random() < .35) decir(d, azar(['¡A la carga!', '¡Por el huerto!', '¡Furiaaa!', '¡Ahora sí!']), 1.4); }
        voz('¡Furia del huerto!', 'narrador', { forzar: true, cortar: true, tono: 1.1 }); return; }
      if (k === 'pala') { pala = !pala; sel = null; } else { if (cool[k] > 0) return aviso('Aún se está recargando'); if (agua < DEF[k].costo) return aviso('Te falta agua 💧'); sel = sel === k ? null : k; pala = false; }
      FX.son('click'); };
    $('#vel').onclick = () => { vel = vel >= 3 ? 1 : vel + 1; $('#vel').textContent = '⏩ x' + vel; FX.son('click'); };
    $('#pau').onclick = () => { if (fin || pausa) return; pausa = true; FX.son('click');
      modal(`<h2>⏸ Pausa</h2><p class="sub">${zonaDe(n).e} Nivel ${n} · ${'❤️'.repeat(vidas)}</p><button class="btn" id="seg">▶ Continuar</button><button class="btn alt" id="rei2">🔁 Reiniciar nivel</button><button class="btn alt" id="map2">🗺️ Volver al mapa</button>`, d => { d.onclick = e => { const id = e.target.id; if (id === 'seg' || e.target === d) { d.remove(); pausa = false; } if (id === 'rei2') { d.remove(); nivel(t, n); } if (id === 'map2') { d.remove(); vivo = false; mapa(t); } }; }); };
    $('#vm').onclick = () => { vivo = false; mapa(t); };
    const alSalir = () => { if (document.hidden && !fin && !pausa) $('#pau')?.click(); };
    document.addEventListener('visibilitychange', alSalir);
    setParar(() => { vivo = false; cancelAnimationFrame(raf); document.body.classList.remove('hd-full'); document.removeEventListener('visibilitychange', alSalir); document.querySelectorAll('.modal:not(#gate)').forEach(m => m.remove()); });

    // Presentación de novedades del nivel
    const nuevosD = tipos.filter(k => DEF[k].desde === n), nuevasP = Object.keys(ENE).filter(k => ENE[k].desde === n);
    if (nuevosD.length || nuevasP.length) {
      pausa = true;
      modal(`<h2>${n === 1 ? '🌱 Conoce a tu equipo' : nuevosD.length ? '🎉 ¡Nuevo defensor!' : '⚠️ ¡Nueva plaga!'}</h2>${[...nuevosD.map(k => [k, DEF[k].n, DEF[k].d]), ...nuevasP.map(k => [k, ENE[k].n, ENE[k].d])].map(([k, nm, d]) => `<div style="display:flex;align-items:center;gap:12px;text-align:left;background:rgba(255,255,255,.06);border-radius:14px;padding:8px;margin:8px 0"><canvas data-nv="${k}" style="width:72px;height:72px;flex:0 0 72px"></canvas><div><b>${nm}</b><br><small class="sub" style="margin:0">${d}</small></div></div>`).join('')}<button class="btn" id="ok">¡A jugar!</button>`, d => {
        d.querySelectorAll('[data-nv]').forEach(c => { c.width = 72 * dpr; c.height = 72 * dpr; icono(c, c.dataset.nv, 72); });
        d.onclick = e => { if (e.target.id === 'ok') { d.remove(); pausa = false; banner(`Nivel ${n}`, S * .5, 1.6); } };
      });
    } else banner(n === 1 ? '¡Defiende tu huerto!' : `Nivel ${n}`, S * .46, 1.8);
    FX.musica?.('huerto'); FX.intensidad?.(1);

    function modal(html, fn) { const d = document.createElement('div'); d.className = 'modal'; d.innerHTML = `<div class="card" style="text-align:center">${html}</div>`; document.body.append(d); fn && fn(d); return d; }
    function ganar() {
      fin = true; const e = vidas >= 3 ? 3 : vidas === 2 ? 2 : 1, pts = puntos + n * 100 + vidas * 150;
      try { PERFIL.partida('huerto', pts); PERFIL.nivelJuego('huerto', n, e); } catch (er) {}
      FX.pararMusica?.(); FX.son('nivel'); FX.confeti(); voz(azar(FRASES.gana), 'narrador', { forzar: true, cortar: true });
      post('/api/arcade/puntaje', { juego: 'huerto', puntos: Math.min(100000, pts), nombre: LS.get('chatNom') || 'Jugador', avatar: LS.get('chatAv') || 'a01', uid: VID }).catch(() => {});
      const prox = ORDEN.find(k => DEF[k].desde === n + 1) || Object.keys(ENE).find(k => ENE[k].desde === n + 1);
      setTimeout(() => modal(`<div style="font-size:3rem;letter-spacing:6px">${'⭐'.repeat(e)}<span style="opacity:.25">${'⭐'.repeat(3 - e)}</span></div><h2>¡Huerto a salvo!</h2><p class="sub">Nivel ${n} superado · ${pts.toLocaleString('es-PE')} puntos · +${e * 5} 🪙${e < 3 ? '<br>Para 3 estrellas no dejes pasar ninguna plaga.' : ''}</p>
        ${prox ? `<div style="display:flex;align-items:center;gap:10px;justify-content:center;background:rgba(255,255,255,.06);border-radius:14px;padding:8px;margin:8px 0"><canvas data-px="${prox}" style="width:52px;height:52px"></canvas><small style="text-align:left">${DEF[prox] ? `En el siguiente nivel desbloqueas<br><b>${DEF[prox].n}</b>` : `En el siguiente nivel aparece<br><b>${ENE[prox].n}</b>`}</small></div>` : ''}
        ${n < TOTAL ? `<button class="btn" id="sig">▶ Nivel ${n + 1}</button>` : '<p>🏆 ¡Completaste los 30 niveles!</p>'}${e < 3 ? '<button class="btn alt" id="rei">🔁 Repetir por 3 ⭐</button>' : ''}<button class="btn alt" id="map">🗺️ Ver el mapa</button><button class="btn alt" id="comp">📣 Retar a un amigo</button>`, botones), 900);
    }
    function perder() {
      fin = true; FX.pararMusica?.(); voz(azar(FRASES.pierde), 'narrador', { forzar: true, cortar: true }); if (!perdio) { perdio = true; try { PERFIL.partida('huerto', puntos); } catch (er) {} }
      setTimeout(() => modal(`<div style="font-size:3rem">🐛🏠</div><h2>¡Las plagas entraron a tu casa!</h2><p class="sub">Frenaste el ${Math.round((evI - enes.length) * 100 / C.ev.length)} % de las plagas del nivel ${n}.</p><button class="btn" id="mas">🛡️ Segunda oportunidad · 40 🪙</button><button class="btn alt" id="rei">🔁 Reintentar</button><button class="btn alt" id="map">🗺️ Mapa</button>`, botones), 700);
    }
    function botones(d) {
      d.querySelectorAll('[data-px]').forEach(c => { c.width = 52 * dpr; c.height = 52 * dpr; icono(c, c.dataset.px, 52); });
      d.onclick = e => { const id = e.target.id; if (!id) return;
        if (id === 'sig') { d.remove(); nivel(t, n + 1); } if (id === 'map') { d.remove(); vivo = false; mapa(t); } if (id === 'rei') { d.remove(); nivel(t, n); }
        if (id === 'mas') { if (!PERFIL.gastar(40)) return toast('No tienes suficientes monedas 🪙: juega misiones y otros juegos para ganar más'); d.remove();
          for (const en of enes) if (en.y > TOP + S * (R - 3.5)) { en.hp = 0; chispas(en.x, en.y, '#fff3a0', 14); } ondas.push({ x: W / 2, y: TOP + R * S, r: 0, max: W * .8, v: .45 }); vidas = 1; fin = false; shake = .4; FX.son('ganar'); FX.musica?.('huerto'); FX.intensidad?.(2); }
        if (id === 'comp') { const url = `${location.origin}/r/${t.id}?src=huerto`; if (navigator.share) navigator.share({ title: 'Huerto Defensor', text: `🌱 Ya voy en el nivel ${n + 1} de Huerto Defensor. ¿Me alcanzas?`, url }).catch(() => {}); else { navigator.clipboard?.writeText(url); toast('Enlace copiado'); } } };
    }
    window.__huerto = { estado: () => ({ agua, vidas, tj, enes: enes.length, defs: defs.size, fin, evI, total: C.ev.length, puntos }), plantar: (k, c, r) => { sel = k; const b = cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: b.left + (c + .5) * S * b.width / W, clientY: b.top + (TOP + (r + .5) * S) * b.height / H, bubbles: true })); }, agua: v => agua = v, vista: () => ({ enes: enes.map(e => [e.c, Math.round((e.y - TOP) / S * 10) / 10, e.tipo]), defs: [...defs.values()].map(d => [d.k, d.c, d.r]) }), sinRecarga: () => { for (const k in cool) cool[k] = 0; }, rapido: k => vel = k, recogerTodo: () => gotas.forEach(g => !g.vuela && recoger(g)), cargarFuria: () => furia = 1, furia: () => furia }; // para pruebas
  }
  JUEGOS.huerto = mapa;
})();
