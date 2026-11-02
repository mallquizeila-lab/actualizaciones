// ⚔️ Duelo de Torres: batalla de cartas en tiempo real (diseño y personajes propios: animales guerreros).
// Arena vertical con río y 2 puentes, 3 torres por lado, maná, mazo de 8 cartas, rival con IA, trofeos, ligas y mejoras con monedas.
(() => {
  const A = window.ARC_API, { JUEGOS, salir } = A, setParar = A.setParar;
  const AN = 18, AL = 32, RIO0 = 15, RIO1 = 17, PUENTES = [3.5, 14.5];
  // tipo: u = unidad, h = hechizo. obj: 'todo' o 'edif' (solo torres). aire: vuela. aAire: puede atacar al aire.
  const CARTAS = {
    oso: { n: 'Oso Escudero', e: '🐻', c: 3, tipo: 'u', cant: 1, hp: 1100, dmg: 120, vel: 1, rango: 1.2, golpe: 1.2, r: .65, obj: 'todo', d: 'Resistente y valiente. Ideal para defender.' },
    buhos: { n: 'Búhos Arqueros', e: '🦉', c: 3, tipo: 'u', cant: 2, hp: 260, dmg: 75, vel: 1, rango: 5, golpe: 1, r: .45, obj: 'todo', aAire: 1, proy: 'flecha', d: 'Dos arqueros que disparan de lejos, también al aire.' },
    erizos: { n: 'Erizos', e: '🦔', c: 2, tipo: 'u', cant: 4, hp: 130, dmg: 60, vel: 1.4, rango: .8, golpe: 1, r: .35, obj: 'todo', d: 'Cuatro erizos rápidos y baratos.' },
    jabali: { n: 'Jabalí Embestidor', e: '🐗', c: 4, tipo: 'u', cant: 1, hp: 850, dmg: 190, vel: 1.9, rango: 1.1, golpe: 1.5, r: .6, obj: 'edif', d: 'Corre directo a las torres.' },
    llama: { n: 'Llama Escupidora', e: '🦙', c: 4, tipo: 'u', cant: 1, hp: 650, dmg: 115, vel: 1, rango: 5, golpe: 1.6, r: .6, obj: 'todo', aAire: 1, area: 1.3, proy: 'escupe', d: 'Escupe de lejos y daña en área.' },
    tortuga: { n: 'Tortuga Gigante', e: '🐢', c: 5, tipo: 'u', cant: 1, hp: 3000, dmg: 160, vel: .65, rango: 1.2, golpe: 1.5, r: .95, obj: 'edif', d: 'Un tanque enorme que va por las torres.' },
    abejas: { n: 'Abejas', e: '🐝', c: 3, tipo: 'u', cant: 5, hp: 85, dmg: 50, vel: 2, rango: .8, golpe: .8, r: .3, obj: 'todo', aire: 1, aAire: 1, d: 'Enjambre volador muy rápido.' },
    fuego: { n: 'Bola de Fuego', e: '🔥', c: 4, tipo: 'h', radio: 2.5, dmg: 340, d: 'Hechizo: daña todo en un área. A las torres les hace menos.' },
    dragon: { n: 'Dragoncito', e: '🐉', c: 4, tipo: 'u', cant: 1, hp: 750, dmg: 105, vel: 1.4, rango: 3.2, golpe: 1.5, r: .65, obj: 'todo', aire: 1, aAire: 1, area: 1.1, proy: 'llama', d: 'Vuela y lanza fuego en área.', liga: 1 },
    ventisca: { n: 'Ventisca', e: '❄️', c: 3, tipo: 'h', radio: 3, dmg: 90, congela: 3.5, d: 'Hechizo: congela a los enemigos unos segundos.', liga: 2 },
    condor: { n: 'Cóndor Real', e: '🦅', c: 5, tipo: 'u', cant: 1, hp: 1900, dmg: 150, vel: 1.1, rango: 1.2, golpe: 1.4, r: .85, obj: 'edif', aire: 1, d: 'Vuela sobre el río directo a las torres.', liga: 3 },
    puma: { n: 'Puma Veloz', e: '🐆', c: 4, tipo: 'u', cant: 1, hp: 720, dmg: 270, vel: 1.7, rango: 1, golpe: 1.1, r: .55, obj: 'todo', d: 'Ataca rapidísimo y con fuerza.', liga: 4 },
  };
  const LIGAS = [['Bronce', '🥉', 0, '#cd7f32'], ['Plata', '🥈', 300, '#c0c0c0'], ['Oro', '🥇', 700, '#ffd23f'], ['Diamante', '💎', 1200, '#67e8f9'], ['Leyenda', '👑', 2000, '#c084fc']];
  const ligaDe = tr => LIGAS.reduce((a, l, i) => tr >= l[2] ? i : a, 0);
  const MAZO_INICIAL = ['oso', 'buhos', 'erizos', 'jabali', 'llama', 'tortuga', 'abejas', 'fuego'];
  const FR = { despliegue: ['¡A la carga!', '¡Por el reino!', '¡Vamos!', '¡Al ataque!'], rey: ['¡Defiendan la torre!', '¡Nos atacan!'], rivalE: ['😂', '😡', '👍', '😭', '🤔', '😎'], gana: ['¡Victoria! ¡Eres un gran estratega!', '¡Ganaste la batalla!'], pierde: ['¡Perdimos esta vez! ¡A la revancha!', '¡Casi! La próxima es tuya'] };
  const azar = l => l[Math.floor(Math.random() * l.length)];
  const D = () => { const d = PERFIL.datos, J = d.juegos.batalla = Object.assign({ trofeos: 0, mazo: [...MAZO_INICIAL], niveles: {}, victorias: 0, derrotas: 0, record: 0, partidas: 0 }, d.juegos.batalla || {}); return J; };
  const nivelC = k => D().niveles[k] || 1;
  const mult = l => 1 + (l - 1) * .08;

  // ---------- Dibujo de los guerreros ----------
  const COLT = ['#3b82f6', '#ef4444'];
  function ojos(X, x, y, r, sep, mira) { for (const k of [-1, 1]) { X.fillStyle = '#fff'; X.beginPath(); X.arc(x + k * sep, y, r, 0, 7); X.fill(); X.fillStyle = '#111'; X.beginPath(); X.arc(x + k * sep, y + mira * r * .35, r * .55, 0, 7); X.fill(); } }
  const rad = (X, x, y, r, c1, c2) => { const g = X.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.1); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };
  const bord = (X, w) => { X.strokeStyle = 'rgba(20,10,20,.65)'; X.lineWidth = w; X.stroke(); };
  function guerrero(X, k, x, y, s, team, t, ataque) {
    // s = radio en píxeles; mira: el jugador mira hacia arriba (-1), el rival hacia abajo (1)
    const mira = team ? 1 : -1, tc = COLT[team], b = Math.sin(t * 8) * s * .06, lw = Math.max(1.2, s * .08);
    const cuerpo = (piel, piel2) => { X.beginPath(); X.ellipse(x, y + s * .25 + b * .3, s * .62, s * .55, 0, 0, 7); X.fillStyle = rad(X, x, y + s * .25, s * .6, tc, team ? '#7f1d1d' : '#1e3a8a'); X.fill(); bord(X, lw); X.beginPath(); X.arc(x, y - s * .25 + b, s * .5, 0, 7); X.fillStyle = rad(X, x, y - s * .25, s * .5, piel, piel2); X.fill(); bord(X, lw); };
    const orejas = (tipo, c) => { for (const q of [-1, 1]) { X.beginPath(); if (tipo === 'r') X.arc(x + q * s * .38, y - s * .62 + b, s * .17, 0, 7); else { X.moveTo(x + q * s * .2, y - s * .6 + b); X.lineTo(x + q * s * .42, y - s * .98 + b); X.lineTo(x + q * s * .44, y - s * .48 + b); } X.fillStyle = c; X.fill(); bord(X, lw); } };
    const cara = (dy = 0) => ojos(X, x, y - s * .3 + b + dy, s * .11, s * .17, mira);
    const arma = () => { const a = ataque ? -.9 : .3; X.save(); X.translate(x + s * .55, y + s * .05); X.rotate(a * (team ? -1 : 1)); X.fillStyle = '#e5e7eb'; X.fillRect(-s * .05, -s * .9, s * .1, s * .85); X.fillStyle = '#a16207'; X.fillRect(-s * .17, -s * .08, s * .34, s * .09); X.restore(); };
    return { cuerpo, orejas, cara, arma, mira, b, lw, tc };
  }
  const DIB = {
    oso(X, x, y, s, tm, t, at) { const g = guerrero(X, 0, x, y, s, tm, t, at); g.orejas('r', '#7a4a22'); g.cuerpo('#a8703c', '#5b3417'); X.fillStyle = '#e8c39e'; X.beginPath(); X.ellipse(x, y - s * .13 + g.b, s * .2, s * .14, 0, 0, 7); X.fill(); X.fillStyle = '#2b1a0e'; X.beginPath(); X.arc(x, y - s * .18 + g.b, s * .06, 0, 7); X.fill(); g.cara(); g.arma(); X.beginPath(); X.arc(x - s * .55, y + s * .2, s * .32, 0, 7); X.fillStyle = rad(X, x - s * .55, y + s * .2, s * .32, '#f1f5f9', g.tc); X.fill(); bord(X, g.lw); },
    buhos(X, x, y, s, tm, t, at) { const g = guerrero(X, 0, x, y, s, tm, t, at); g.orejas('p', '#8a5a1a'); g.cuerpo('#c48a3a', '#6b4210'); ojos(X, x, y - s * .3 + g.b, s * .17, s * .19, g.mira); X.fillStyle = '#f59e0b'; X.beginPath(); X.moveTo(x - s * .06, y - s * .14 + g.b); X.lineTo(x + s * .06, y - s * .14 + g.b); X.lineTo(x, y - s * .02 + g.b); X.fill(); X.strokeStyle = '#7c2d12'; X.lineWidth = s * .08; X.beginPath(); X.arc(x + s * .6, y + s * .1, s * .45, -1.2, 1.2); X.stroke(); X.strokeStyle = '#eee'; X.lineWidth = 1; X.beginPath(); X.moveTo(x + s * .6 + Math.cos(-1.2) * s * .45, y + s * .1 + Math.sin(-1.2) * s * .45); X.lineTo(x + s * .6 + Math.cos(1.2) * s * .45 - (at ? s * .2 : 0), y + s * .1 + Math.sin(1.2) * s * .45); X.stroke(); },
    erizos(X, x, y, s, tm, t, at) { const b = Math.sin(t * 10) * s * .05; X.fillStyle = '#4a3020'; X.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, rr = i % 2 ? s * .75 : s * 1.05; X.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr + b); } X.closePath(); X.fill(); bord(X, 1.2); X.beginPath(); X.arc(x, y + s * .1 + b, s * .55, 0, 7); X.fillStyle = rad(X, x, y, s * .55, '#f5d6b0', '#c08a5a'); X.fill(); ojos(X, x, y + b, s * .14, s * .2, tm ? 1 : -1); X.fillStyle = COLT[tm]; X.beginPath(); X.arc(x, y - s * .8 + b, s * .2, 0, 7); X.fill(); },
    jabali(X, x, y, s, tm, t, at) { const g = guerrero(X, 0, x, y, s, tm, t * 1.6, at); g.orejas('p', '#4b3524'); g.cuerpo('#7a5a42', '#3b2a1c'); X.fillStyle = '#d4a5a5'; X.beginPath(); X.ellipse(x, y - s * .12 + g.b, s * .2, s * .14, 0, 0, 7); X.fill(); X.fillStyle = '#fff'; for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .15, y - s * .08 + g.b); X.lineTo(x + q * s * .3, y - s * .32 + g.b); X.lineTo(x + q * s * .22, y - s * .05 + g.b); X.fill(); } g.cara(-s * .05); X.strokeStyle = '#3b2a1c'; X.lineWidth = s * .1; for (let i = -1; i <= 1; i++) { X.beginPath(); X.moveTo(x + i * s * .12, y - s * .78 + g.b); X.lineTo(x + i * s * .16, y - s * .98 + g.b); X.stroke(); } },
    llama(X, x, y, s, tm, t, at) { const g = guerrero(X, 0, x, y, s, tm, t, at); X.beginPath(); X.ellipse(x, y + s * .25, s * .62, s * .55, 0, 0, 7); X.fillStyle = rad(X, x, y + s * .25, s * .6, g.tc, tm ? '#7f1d1d' : '#1e3a8a'); X.fill(); bord(X, g.lw); X.fillStyle = '#f8f4ec'; X.beginPath(); X.roundRect(x - s * .2, y - s * .75 + g.b, s * .4, s * .9, s * .2); X.fill(); bord(X, g.lw); X.beginPath(); X.ellipse(x, y - s * .7 + g.b, s * .32, s * .28, 0, 0, 7); X.fill(); bord(X, g.lw); for (const q of [-1, 1]) { X.beginPath(); X.ellipse(x + q * s * .2, y - s * 1.02 + g.b, s * .07, s * .17, q * .3, 0, 7); X.fill(); bord(X, g.lw); } ojos(X, x, y - s * .75 + g.b, s * .09, s * .13, g.mira); X.fillStyle = ['#f43f5e', '#facc15', '#22c55e'][0]; X.fillRect(x - s * .2, y - s * .25 + g.b, s * .4, s * .1); },
    tortuga(X, x, y, s, tm, t, at) { const b = Math.sin(t * 4) * s * .03; for (const [q, w] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { X.fillStyle = '#65a30d'; X.beginPath(); X.ellipse(x + q * s * .62, y + w * s * .45 + Math.sin(t * 6 + q * w) * s * .05, s * .2, s * .16, 0, 0, 7); X.fill(); bord(X, 1.5); } X.fillStyle = '#84cc16'; X.beginPath(); X.ellipse(x, y + (tm ? 1 : -1) * s * .75, s * .25, s * .22, 0, 0, 7); X.fill(); bord(X, 1.5); ojos(X, x, y + (tm ? 1 : -1) * s * .8, s * .07, s * .1, tm ? 1 : -1);
      X.beginPath(); X.ellipse(x, y + b, s * .75, s * .68, 0, 0, 7); X.fillStyle = rad(X, x, y, s * .75, '#4d7c0f', '#1a2e05'); X.fill(); bord(X, 2); X.strokeStyle = 'rgba(190,242,100,.5)'; X.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; X.beginPath(); X.moveTo(x + Math.cos(a) * s * .25, y + Math.sin(a) * s * .23 + b); X.lineTo(x + Math.cos(a) * s * .65, y + Math.sin(a) * s * .6 + b); X.stroke(); } X.beginPath(); X.arc(x, y + b, s * .25, 0, 7); X.stroke(); X.fillStyle = COLT[tm]; X.beginPath(); X.arc(x, y + b, s * .14, 0, 7); X.fill(); },
    abejas(X, x, y, s, tm, t) { const al = Math.abs(Math.sin(t * 30)) * s * .5; X.fillStyle = 'rgba(255,255,255,.75)'; X.beginPath(); X.ellipse(x - s * .4, y - s * .4, s * .35, al * .8 + s * .1, -.5, 0, 7); X.ellipse(x + s * .4, y - s * .4, s * .35, al * .8 + s * .1, .5, 0, 7); X.fill(); X.beginPath(); X.ellipse(x, y, s * .55, s * .7, 0, 0, 7); X.fillStyle = '#facc15'; X.fill(); bord(X, 1.2); X.fillStyle = '#1c1917'; for (const d of [-.2, .2]) X.fillRect(x - s * .5, y + d * s - s * .08, s, s * .16); X.fillStyle = COLT[tm]; X.beginPath(); X.arc(x, y + (tm ? 1 : -1) * s * .55, s * .22, 0, 7); X.fill(); },
    dragon(X, x, y, s, tm, t, at) { const al = Math.sin(t * 9) * s * .35; for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .3, y); X.quadraticCurveTo(x + q * s * 1.3, y - s * .6 - al, x + q * s * 1.2, y + s * .3); X.quadraticCurveTo(x + q * s * .8, y + s * .1, x + q * s * .3, y + s * .3); X.fillStyle = tm ? '#be123c' : '#7c3aed'; X.fill(); bord(X, 1.5); } X.beginPath(); X.ellipse(x, y, s * .45, s * .6, 0, 0, 7); X.fillStyle = rad(X, x, y, s * .6, '#a3e635', '#15803d'); X.fill(); bord(X, 1.5); const hy = y + (tm ? 1 : -1) * s * .55; X.beginPath(); X.arc(x, hy, s * .32, 0, 7); X.fillStyle = '#84cc16'; X.fill(); bord(X, 1.5); ojos(X, x, hy, s * .08, s * .12, tm ? 1 : -1); if (at) { X.fillStyle = 'rgba(255,140,0,.8)'; X.beginPath(); X.arc(x, hy + (tm ? 1 : -1) * s * .4, s * .18, 0, 7); X.fill(); } },
    condor(X, x, y, s, tm, t) { const al = Math.sin(t * 4) * s * .25; for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .3, y - s * .1); X.lineTo(x + q * s * 1.5, y - s * .3 - al); X.lineTo(x + q * s * 1.3, y + s * .1 - al * .5); X.lineTo(x + q * s * 1.1, y + s * .2); X.lineTo(x + q * s * .3, y + s * .3); X.fillStyle = '#1c1917'; X.fill(); bord(X, 1.5); X.fillStyle = '#e7e5e4'; X.fillRect(x + q * s * 1 - s * .2, y - s * .05 - al * .6, s * .4, s * .08); } X.beginPath(); X.ellipse(x, y, s * .45, s * .6, 0, 0, 7); X.fillStyle = '#292524'; X.fill(); bord(X, 1.5); const hy = y + (tm ? 1 : -1) * s * .55; X.fillStyle = '#f5f5f4'; X.beginPath(); X.arc(x, hy - (tm ? 1 : -1) * s * .15, s * .3, 0, 7); X.fill(); X.fillStyle = '#e11d48'; X.beginPath(); X.arc(x, hy, s * .22, 0, 7); X.fill(); ojos(X, x, hy, s * .06, s * .09, tm ? 1 : -1); X.fillStyle = COLT[tm]; X.beginPath(); X.arc(x, y, s * .15, 0, 7); X.fill(); },
    puma(X, x, y, s, tm, t, at) { const g = guerrero(X, 0, x, y, s, tm, t * 1.4, at); g.orejas('p', '#b45309'); g.cuerpo('#e0a458', '#8a5a1e'); X.fillStyle = '#fbe7c6'; X.beginPath(); X.ellipse(x, y - s * .13 + g.b, s * .18, s * .12, 0, 0, 7); X.fill(); X.fillStyle = '#3f2a1a'; X.beginPath(); X.arc(x, y - s * .17 + g.b, s * .05, 0, 7); X.fill(); g.cara(); if (at) { X.strokeStyle = '#fff'; X.lineWidth = 2; for (let i = -1; i <= 1; i++) { X.beginPath(); X.moveTo(x + s * .4 + i * s * .12, y - s * .3); X.lineTo(x + s * .6 + i * s * .12, y + s * .2); X.stroke(); } } },
    fuego(X, x, y, s) { const g = X.createRadialGradient(x, y, s * .1, x, y, s); g.addColorStop(0, '#fff7ae'); g.addColorStop(.5, '#fb923c'); g.addColorStop(1, '#b91c1c'); X.fillStyle = g; X.beginPath(); X.arc(x, y, s, 0, 7); X.fill(); },
    ventisca(X, x, y, s) { X.strokeStyle = '#e0f2fe'; X.lineWidth = s * .14; X.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; X.beginPath(); X.moveTo(x - Math.cos(a) * s, y - Math.sin(a) * s); X.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); X.stroke(); } X.lineCap = 'butt'; X.fillStyle = '#7dd3fc'; X.beginPath(); X.arc(x, y, s * .3, 0, 7); X.fill(); },
  };
  function icono(cv, k, tam) { const dpr = Math.min(2, devicePixelRatio || 1), X = cv.getContext('2d'); X.setTransform(dpr, 0, 0, dpr, 0, 0); X.clearRect(0, 0, tam, tam); DIB[k](X, tam / 2, tam / 2 + tam * .06, tam * (k === 'tortuga' ? .36 : CARTAS[k].tipo === 'h' ? .32 : ['dragon', 'condor'].includes(k) ? .27 : .34), 0, 1, false); }

  // ---------- Pantalla principal (lobby) ----------
  const datosJugador = () => { const J = D(); return { uid: VID, tok: PERFIL.tok, nombre: LS.get('chatNom') || PERFIL.usuario || 'Jugador', avatar: LS.get('chatAv') || 'a01', trofeos: J.trofeos, mazo: J.mazo, niveles: J.niveles, clan: J.clan || '' }; };
  function lobby(t) {
    salir(); registrar(t.id); $('#stage').onclick = null; FX.musica?.('batalla');
    const J = D(), li = ligaDe(J.trofeos), L0 = LIGAS[li], L1 = LIGAS[li + 1], dpr = Math.min(2, devicePixelRatio || 1);
    const pct = L1 ? Math.round((J.trofeos - L0[2]) * 100 / (L1[2] - L0[2])) : 100;
    const disponibles = Object.keys(CARTAS).filter(k => (CARTAS[k].liga || 0) <= li);
    const carta = k => { const C = CARTAS[k], nv = nivelC(k), ok = disponibles.includes(k); return `<button class="bcarta" data-k="${k}" style="position:relative;border:2px solid ${J.mazo.includes(k) ? '#ffd166' : 'rgba(255,255,255,.2)'};border-radius:14px;background:linear-gradient(180deg,#3b2f6b,#1e1640);padding:4px 2px 4px;color:#fff;cursor:pointer;${ok ? '' : 'opacity:.4;filter:grayscale(1)'}"><span style="position:absolute;left:-4px;top:-6px;background:linear-gradient(135deg,#e879f9,#7c3aed);border-radius:50%;width:22px;height:22px;font:900 .8rem/22px Figtree,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.4)">${C.c}</span><canvas data-ic="${k}" style="width:52px;height:52px;display:block;margin:0 auto;pointer-events:none"></canvas><small style="font-size:.62rem;font-weight:800;display:block;line-height:1.1;pointer-events:none">${C.n.split(' ')[0]}</small><small style="font-size:.6rem;opacity:.85;pointer-events:none">${ok ? 'Nv. ' + nv : '🔒 ' + LIGAS[C.liga][0]}</small></button>`; };
    const bm = 'margin:6px 0 0;padding:12px 8px;font-size:.95rem';
    stage(`<div class="card" style="padding:14px;background:linear-gradient(165deg,#312e81,#1e1b4b 60%,#4c1d95);border:0">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:1.2rem">⚔️ Duelo de Torres</b><span>🪙 ${PERFIL.datos.monedas}</span></div>
      ${PERFIL.usuario ? `<small style="opacity:.85">👤 ${escH(PERFIL.usuario)}${J.clan ? ' · 🛡️ ' + escH(J.clan) : ''}</small>` : `<button class="btn alt" id="cuenta" style="margin:8px 0 0;padding:8px;font-size:.85rem">👤 Crea tu usuario para no perder tus trofeos</button>`}
      <div style="display:flex;align-items:center;gap:12px;margin:12px 0;background:rgba(0,0,0,.25);border-radius:16px;padding:10px"><div style="font-size:2.4rem">${L0[1]}</div><div style="flex:1"><b style="color:${L0[3]}">Liga ${L0[0]}</b> · 🏆 ${J.trofeos}<div class="prog" style="margin:6px 0 2px"><i style="width:${pct}%;background:linear-gradient(90deg,${L0[3]},#fff)"></i></div><small class="sub" style="margin:0">${L1 ? `${L1[2] - J.trofeos} trofeos para ${L1[1]} ${L1[0]}${Object.keys(CARTAS).find(k => CARTAS[k].liga === li + 1) ? ' · desbloquea ' + CARTAS[Object.keys(CARTAS).find(k => CARTAS[k].liga === li + 1)].n : ''}` : '¡Estás en la liga más alta!'}</small></div></div>
      <button class="btn" id="m_1v1" style="font-size:1.2rem;padding:15px;background:linear-gradient(90deg,#facc15,#f97316);color:#3a1d00">🌐 1 vs 1 en línea</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><button class="btn alt" id="m_2v2" style="${bm}">👥 2 vs 2 en línea</button><button class="btn alt" id="m_ia" style="${bm}">🤖 Contra la máquina</button><button class="btn alt" id="m_amigo" style="${bm}">🤝 Con un amigo</button><button class="btn alt" id="m_clan" style="${bm}">🛡️ Clanes</button></div>
      <p class="sub" style="text-align:center;margin:8px 0 0">${J.victorias} victorias · ${J.derrotas} derrotas</p></div>
      <div class="card"><h3 style="margin:0 0 4px">Tu mazo (8 cartas)</h3><p class="sub" style="text-align:left;margin:0 0 8px;font-size:.82rem">Toca una carta del mazo y luego una de tu colección para cambiarla. Mejora tus cartas con monedas.</p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${J.mazo.map(carta).join('')}</div>
      <h3 style="margin:14px 0 8px">Colección</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${Object.keys(CARTAS).filter(k => !J.mazo.includes(k)).map(carta).join('') || '<p class="sub">Todas tus cartas están en el mazo.</p>'}</div>
      <div id="det" style="margin-top:12px"></div></div>`);
    document.querySelectorAll('[data-ic]').forEach(c => { c.width = 52 * dpr; c.height = 52 * dpr; icono(c, c.dataset.ic, 52); });
    let elegida = null;
    const detalle = k => { const C = CARTAS[k], nv = nivelC(k), costo = 60 * nv, ok = disponibles.includes(k), m = mult(nv);
      $('#det').innerHTML = `<div style="background:rgba(255,255,255,.06);border-radius:14px;padding:10px"><b>${C.e} ${C.n}</b> · Nivel ${nv}/5<p class="sub" style="text-align:left;margin:4px 0">${C.d}</p><small>${C.tipo === 'u' ? `❤️ ${Math.round(C.hp * m)} · ⚔️ ${Math.round(C.dmg * m)}${C.cant > 1 ? ' · x' + C.cant : ''}${C.aire ? ' · vuela' : ''}${C.obj === 'edif' ? ' · solo torres' : ''}` : `⚔️ ${Math.round(C.dmg * m)} en área`} · 💜 ${C.c}</small>
        ${ok && nv < 5 ? `<button class="btn alt" id="mejorar" data-k="${k}" style="margin-top:8px">⬆️ Mejorar a nivel ${nv + 1} · ${costo} 🪙</button>` : ok ? '<p class="sub">⭐ Nivel máximo</p>' : ''}</div>`; };
    $('#stage').onclick = e => {
      const id = e.target.id;
      if (id === 'cuenta') return cuentaModal('crear', () => lobby(t));
      if (id === 'm_ia') return elegirIA(t);
      if (id === 'm_1v1' || id === 'm_2v2') return buscar(t, id.slice(2), 'buscar');
      if (id === 'm_amigo') return amigo(t);
      if (id === 'm_clan') return clanes(t);
      if (id === 'mejorar') { const k = e.target.dataset.k, nv = nivelC(k); if (!PERFIL.gastar(60 * nv)) return toast('Te faltan monedas 🪙. Gánalas en batallas, Joyas o Huerto.'); D().niveles[k] = nv + 1; PERFIL.guardar(); FX.son('nivel'); toast(`⬆️ ${CARTAS[k].n} subió a nivel ${nv + 1}`); return lobby(t); }
      const b = e.target.closest('.bcarta'); if (!b) return; const k = b.dataset.k; detalle(k); FX.son('click');
      const J2 = D(), enMazo = J2.mazo.includes(k);
      if (!disponibles.includes(k)) return;
      if (elegida && elegida !== k && J2.mazo.includes(elegida) !== enMazo) { const a = enMazo ? k : elegida, n2 = enMazo ? elegida : k; J2.mazo[J2.mazo.indexOf(a)] = n2; PERFIL.guardar(); elegida = null; FX.son('swish'); return lobby(t); }
      elegida = k; document.querySelectorAll('.bcarta').forEach(x => x.style.transform = x.dataset.k === k ? 'translateY(-5px) scale(1.05)' : '');
    };
    setParar(() => { $('#stage').onclick = null; });
  }
  function elegirIA(t) {
    stage(`<div class="card" style="text-align:center"><h2>🤖 Contra la máquina</h2><p class="sub">Practica sin conexión. Ganas trofeos y monedas igual.</p><button class="btn" id="ia1">⚔️ 1 vs 1</button><button class="btn alt" id="ia2">👥 2 vs 2 (con un compañero bot)</button><button class="btn alt" id="vol">← Volver</button></div>`);
    $('#stage').onclick = e => { if (e.target.id === 'ia1') batalla(t, { modo: '1v1' }); if (e.target.id === 'ia2') batalla(t, { modo: '2v2' }); if (e.target.id === 'vol') lobby(t); };
  }

  // ---------- En línea: buscar rival, sala con amigo ----------
  let ES = null;
  const cerrarES = () => { if (ES) { ES.close(); ES = null; } };
  async function buscar(t, modo, accion, codigo) {
    cerrarES(); $('#stage').onclick = null;
    let r; try { r = await post('/api/duelo/' + accion, { ...datosJugador(), modo, codigo }); } catch (e) { r = { error: 'Sin conexión' }; }
    if (r.error) { toast(r.error); return accion === 'unir' ? amigo(t) : lobby(t); }
    const sala = r, t0 = Date.now(); let ultimo = null, tm = null, empezo = false;
    const pinta = s => { ultimo = s || ultimo; const n = ultimo ? ultimo.jugadores.length : 1, tot = modo === '2v2' ? 4 : 2, seg = Math.floor((Date.now() - t0) / 1000);
      stage(`<div class="card" style="text-align:center"><div class="sp" style="margin:10px auto"></div><h2>${sala.codigo ? '🤝 Sala con amigos' : modo === '2v2' ? '👥 Buscando equipo…' : '🌐 Buscando rival…'}</h2>
        ${sala.codigo ? `<p class="sub">Comparte este código con tu amigo:</p><div style="font:900 2.2rem Figtree,sans-serif;letter-spacing:6px;color:#ffd166">${sala.codigo}</div><button class="btn alt" id="compCod">📣 Enviar el código</button>${D().clan ? '<button class="btn alt" id="aClan">🛡️ Avisar a mi clan</button>' : ''}` : ''}
        <p style="font-size:1.4rem;margin:12px 0">${'🟢'.repeat(n)}${'⚪'.repeat(Math.max(0, tot - n))}</p><p class="sub">${n} de ${tot} jugadores · ${seg} s</p>
        <div style="text-align:left">${(ultimo?.jugadores || []).map(j => `<div class="dato"><span>${j.asiento < (tot / 2) ? '🔵' : '🔴'} ${escH(j.nombre)}${j.clan ? ' · 🛡️ ' + escH(j.clan) : ''}</span><b>🏆 ${j.trofeos}</b></div>`).join('')}</div>
        ${sala.asiento === 0 && seg >= 15 ? `<button class="btn" id="bots">🤖 Completar con bots y empezar</button>` : ''}<button class="btn alt" id="cancelar">✖ Cancelar</button></div>`); };
    pinta();
    tm = setInterval(() => { if (!ES) return clearInterval(tm); pinta(); if (sala.asiento === 0 && !sala.codigo && Date.now() - t0 > 45000) post('/api/duelo/bots', { sala: sala.sala, tok: sala.tok }); }, 1000);
    ES = new EventSource(`/api/duelo/stream?sala=${sala.sala}&tok=${sala.tok}`);
    ES.addEventListener('sala', e => pinta(JSON.parse(e.data)));
    ES.addEventListener('empieza', e => { if (empezo) return; empezo = true; clearInterval(tm); const s = JSON.parse(e.data); FX.son('sirena'); setParar(() => {}); batalla(t, { modo: s.modo, online: { ...sala, jugadores: s.jugadores } }); });
    ES.addEventListener('cerrada', () => { clearInterval(tm); cerrarES(); toast('La sala se cerró'); lobby(t); });
    ES.onerror = () => {};
    $('#stage').onclick = async e => {
      if (e.target.id === 'cancelar') { clearInterval(tm); post('/api/duelo/salir', { sala: sala.sala, tok: sala.tok }).catch(() => {}); cerrarES(); lobby(t); }
      if (e.target.id === 'bots') post('/api/duelo/bots', { sala: sala.sala, tok: sala.tok });
      if (e.target.id === 'compCod') { const txt = `⚔️ ¡Te reto en Duelo de Torres! Entra a ${location.origin}/?g=${t.id} → Con un amigo → código ${sala.codigo}`; if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else { navigator.clipboard?.writeText(txt); toast('Copiado'); } }
      if (e.target.id === 'aClan') { const r2 = await post('/api/clan/chat', { ...datosJugador(), reto: sala.codigo }); toast(r2.error || '🛡️ Aviso enviado al chat del clan'); }
    };
    setParar(() => { clearInterval(tm); cerrarES(); post('/api/duelo/salir', { sala: sala.sala, tok: sala.tok }).catch(() => {}); });
  }
  function amigo(t) {
    stage(`<div class="card" style="text-align:center"><h2>🤝 Jugar con un amigo</h2><p class="sub">Crea una sala y pásale el código, o escribe el código que te dieron.</p>
      <button class="btn" id="c1">Crear sala 1 vs 1</button><button class="btn alt" id="c2">Crear sala 2 vs 2</button>
      <div style="display:flex;gap:6px;margin-top:12px"><input id="cod" maxlength="6" placeholder="Código" style="flex:1;margin:0;text-transform:uppercase;letter-spacing:4px;text-align:center;font-weight:900"><button class="btn" id="unir" style="width:auto;margin:0">Entrar</button></div>
      <button class="btn alt" id="vol" style="margin-top:12px">← Volver</button></div>`);
    $('#stage').onclick = e => { const id = e.target.id; if (id === 'c1') buscar(t, '1v1', 'crear'); if (id === 'c2') buscar(t, '2v2', 'crear'); if (id === 'unir') { const c = $('#cod').value.trim(); if (c.length < 6) return toast('El código tiene 6 caracteres'); buscar(t, '1v1', 'unir', c); } if (id === 'vol') lobby(t); };
  }

  // ---------- Clanes ----------
  function clanes(t) {
    salir(); $('#stage').onclick = null; let desde = 0, pol = null, vivo = true;
    const cargar = async () => {
      const r = await post('/api/clan/mio', datosJugador()).catch(() => ({}));
      if (!vivo) return;
      if (!r.clan) { D().clan = ''; PERFIL.guardar(); return sinClan(); }
      D().clan = r.clan.nombre; PERFIL.guardar();
      stage(`<div class="card" style="padding:12px;background:linear-gradient(165deg,#1e3a8a,#312e81);border:0"><div style="display:flex;align-items:center;gap:10px"><div style="font-size:2.4rem">${r.clan.insignia}</div><div style="flex:1"><b style="font-size:1.15rem">${escH(r.clan.nombre)}</b><br><small style="opacity:.85">${escH(r.clan.descr || '')}</small></div><button class="btn alt" id="vol" style="width:auto;margin:0;padding:6px 10px">←</button></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px"><button class="btn" id="r1" style="margin:0;padding:10px">⚔️ Retar al clan 1v1</button><button class="btn alt" id="r2" style="margin:0;padding:10px">👥 Retar 2v2</button></div></div>
        <div class="chatbox" style="height:auto"><div id="cmsgs" style="height:min(46vh,380px);overflow-y:auto;padding:6px"></div>
        <div class="emojis" style="display:flex;flex-wrap:wrap;gap:2px">${['😂', '🔥', '👏', '💪', '⚔️', '🛡️', '👑', '🎉', '😎', '🙌', '❤️', '🇵🇪'].map(e => `<button data-emo="${e}" style="background:none;border:0;font-size:1.3rem;cursor:pointer">${e}</button>`).join('')}</div>
        <div class="envio"><input id="ctxt" type="text" maxlength="200" placeholder="Escribe al clan…" autocomplete="off"><button id="cenv">➤</button></div>
        <p class="small" style="margin-top:6px">Solo texto y emojis · Sin enlaces, teléfonos, correos ni cuentas · Los mensajes se revisan</p></div>
        <div class="card"><h3 style="margin:0 0 8px">👥 Miembros (${r.miembros.length}/30)</h3>${r.miembros.map((m, i) => `<div class="dato"><span>${i + 1}. ${escH(m.nombre)} ${m.rol === 'líder' ? '👑' : ''}</span><b>🏆 ${m.trofeos}</b></div>`).join('')}<button class="btn alt" id="salirClan" style="margin-top:10px">🚪 Salir del clan</button></div>`);
      desde = 0; await mensajes(); pol = setInterval(mensajes, 3000);
    };
    const mensajes = async () => {
      const r = await post('/api/clan/mio', { ...datosJugador(), desde: desde || 1e-9 }).catch(() => null); const box = $('#cmsgs'); if (!r || !box || !vivo) return;
      if (!r.clan) { clearInterval(pol); return cargar(); }
      for (const m of r.msgs) { desde = Math.max(desde, m.id); const d = document.createElement('div');
        if (m.tipo === 'sis') d.innerHTML = `<p class="small" style="text-align:center;margin:6px 0">${escH(m.texto)}</p>`;
        else if (m.tipo === 'reto') d.innerHTML = `<div style="background:linear-gradient(90deg,#f59e0b,#ef4444);border-radius:14px;padding:8px 10px;margin:6px 0;display:flex;align-items:center;gap:8px"><span style="flex:1;font-weight:800">${escH(m.texto)}</span><button class="btn" data-reto="${escH(m.extra)}" style="width:auto;margin:0;padding:6px 12px;background:#fff;color:#7c2d12">Aceptar</button></div>`;
        else d.innerHTML = `<div style="display:flex;gap:8px;align-items:flex-start;margin:6px 0">${avImg(m.avatar, 28)}<div style="background:rgba(255,255,255,.08);border-radius:12px;padding:6px 10px;max-width:80%"><b style="font-size:.78rem;color:#ffd166">${escH(m.nombre)}</b><div style="word-break:break-word">${escH(m.texto)}</div></div></div>`;
        box.append(d); }
      if (r.msgs.length) box.scrollTop = box.scrollHeight;
    };
    const enviar = async () => { const i = $('#ctxt'), txt = i.value.trim(); if (!txt) return; i.value = ''; const r = await post('/api/clan/chat', { ...datosJugador(), texto: txt }).catch(() => ({ error: 'Sin conexión' })); if (r.error) { toast(r.error); i.value = txt; } else mensajes(); };
    function sinClan() {
      fetch('/api/clanes').then(r => r.json()).then(d => {
        if (!vivo) return;
        stage(`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">🛡️ Clanes</h2><button class="btn alt" id="vol" style="width:auto;margin:0;padding:6px 10px">←</button></div>
          <p class="sub" style="text-align:left">Únete a un clan para chatear con tu equipo, retarlos y jugar 2 vs 2 juntos.</p>
          <input id="bus" placeholder="🔎 Buscar clan…" style="margin-bottom:8px;width:100%;box-sizing:border-box"><div id="lista">${d.clanes.map(c => `<div class="dato" style="align-items:center"><span><span style="font-size:1.4rem">${c.insignia}</span> <b>${escH(c.nombre)}</b><br><small style="opacity:.8">👥 ${c.miembros}/30 · 🏆 ${c.trofeos}</small></span><button class="btn" data-unir="${c.id}" style="width:auto;margin:0;padding:6px 12px" ${c.miembros >= 30 ? 'disabled' : ''}>Unirme</button></div>`).join('') || '<p class="sub">Todavía no hay clanes. ¡Crea el primero!</p>'}</div></div>
          <div class="card"><h3 style="margin:0 0 8px">✨ Crear mi clan · 100 🪙</h3><input id="cn2" maxlength="18" placeholder="Nombre del clan" style="margin-bottom:8px;width:100%;box-sizing:border-box"><input id="cd" maxlength="120" placeholder="Descripción corta (opcional)" style="margin-bottom:8px;width:100%;box-sizing:border-box">
          <div id="ins" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${d.insignias.map((x, i) => `<button data-ins="${x}" style="font-size:1.5rem;background:${i ? 'rgba(255,255,255,.06)' : 'rgba(255,214,102,.35)'};border:0;border-radius:10px;padding:4px 6px;cursor:pointer">${x}</button>`).join('')}</div><button class="btn" id="crear">Crear clan</button></div>`);
        let ins = d.insignias[0];
        $('#bus').oninput = () => { const v = norm($('#bus').value); document.querySelectorAll('#lista .dato').forEach(x => x.style.display = norm(x.textContent).includes(v) ? '' : 'none'); };
        $('#stage').onclick = async e => {
          if (e.target.id === 'vol') return lobby(t);
          const u2 = e.target.dataset.unir; if (u2) { const r = await post('/api/clan/unir', { ...datosJugador(), clan: +u2 }); if (r.error) return toast(r.error); FX.son('nivel'); return cargar(); }
          if (e.target.dataset.ins) { ins = e.target.dataset.ins; document.querySelectorAll('[data-ins]').forEach(b => b.style.background = b.dataset.ins === ins ? 'rgba(255,214,102,.35)' : 'rgba(255,255,255,.06)'); }
          if (e.target.id === 'crear') { const n = $('#cn2').value.trim(); if (n.length < 3) return toast('Escribe un nombre de al menos 3 letras'); if (!PERFIL.gastar(100)) return toast('Necesitas 100 🪙 para crear un clan');
            const r = await post('/api/clan/crear', { ...datosJugador(), clan: n, descr: $('#cd').value.trim(), insignia: ins }); if (r.error) { PERFIL.ganar(100); return toast(r.error); } FX.confeti(); cargar(); }
        };
      });
    }
    $('#stage').onclick = null;
    document.getElementById('stage').addEventListener('click', clicClan);
    async function clicClan(e) {
      if (!$('#cmsgs')) return; const id = e.target.id;
      if (id === 'vol') return lobby(t);
      if (id === 'cenv') return enviar();
      if (e.target.dataset.emo) { const i = $('#ctxt'); i.value += e.target.dataset.emo; i.focus(); }
      if (id === 'r1' || id === 'r2') return buscar(t, id === 'r1' ? '1v1' : '2v2', 'crear');
      if (e.target.dataset.reto) return buscar(t, '1v1', 'unir', e.target.dataset.reto);
      if (id === 'salirClan' && confirm('¿Salir del clan?')) { await post('/api/clan/salir', datosJugador()); D().clan = ''; PERFIL.guardar(); clearInterval(pol); sinClan(); }
    }
    document.addEventListener('keydown', teclaClan);
    function teclaClan(e) { if (e.key === 'Enter' && document.activeElement?.id === 'ctxt') enviar(); }
    stage('<div class="card cargando"><div class="sp"></div><p>Cargando clanes…</p></div>'); cargar();
    setParar(() => { vivo = false; clearInterval(pol); document.getElementById('stage').removeEventListener('click', clicClan); document.removeEventListener('keydown', teclaClan); $('#stage').onclick = null; });
  }

  // ---------- La batalla ----------
  // cfg: { modo: '1v1' | '2v2', online?: { sala, tok, asiento, jugadores } }. El asiento 0 simula; los demás ven y envían jugadas.
  function batalla(t, cfg = { modo: '1v1' }) {
    salir(); scrollTo(0, 0); $('#stage').onclick = null;
    const J = D(), li = ligaDe(J.trofeos), dpr = Math.min(2, devicePixelRatio || 1), ON = cfg.online || null, n4 = cfg.modo === '2v2';
    const miAsiento = ON ? ON.asiento : 0, equipoDe = a => n4 ? (a < 2 ? 0 : 1) : a, miEquipo = equipoDe(miAsiento), anfitrion = !ON || miAsiento === 0, voltear = miEquipo === 1;
    const ancho = Math.min(($('#stage').clientWidth || 360) - 12, 460), k = Math.max(14, Math.min(ancho / AN, (innerHeight - 215) / AL)), W = AN * k, H = AL * k;
    const disponiblesIA = Object.keys(CARTAS).filter(c => (CARTAS[c].liga || 0) <= li);
    const mazoBot = () => { const tanques = ['tortuga', 'oso', 'jabali', 'condor'].filter(c => disponiblesIA.includes(c)), resto = disponiblesIA.filter(c => !tanques.includes(c)).sort(() => Math.random() - .5); return [...tanques.slice(0, 2), ...resto].slice(0, 8); };
    const nivIA = Math.min(5, 1 + Math.floor(li * .9 + Math.random() * .6));
    const baraja = l => [...l].sort(() => Math.random() - .5);
    // asientos (jugadores)
    const asientos = [...Array(n4 ? 4 : 2).keys()].map(a => {
      const jo = ON?.jugadores.find(j => j.asiento === a), local = a === miAsiento, ia = ON ? (!jo || jo.bot) : !local;
      const mazo = baraja(local ? J.mazo : jo && !jo.bot && jo.mazo?.length === 8 ? jo.mazo.filter(c => CARTAS[c]) : mazoBot());
      while (mazo.length < 8) mazo.push(mazoBot()[mazo.length]);
      const niv = local ? J.niveles : jo && !jo.bot ? (jo.niveles || {}) : Object.fromEntries(Object.keys(CARTAS).map(c => [c, nivIA]));
      return { a, team: equipoDe(a), ctrl: local ? 'local' : ia ? 'ia' : 'remoto', mana: 5, mano: mazo.slice(0, 4), cola: mazo.slice(4), niv, nombre: jo ? jo.nombre : local ? (LS.get('chatNom') || 'Tú') : ['Bot Kira', 'Bot Toro', 'Bot Luna', 'Bot Rayo'][a], iaT: 1.5 + a * .7 };
    });
    const yo = asientos[miAsiento];
    stage(`<div class="card" style="padding:6px;user-select:none;-webkit-user-select:none;background:#1e1b4b">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px"><button class="btn alt" id="rend" style="width:auto;margin:0;padding:4px 9px;font-size:.8rem">🏳️</button><b id="reloj" style="font-size:1.1rem">3:00</b><span style="display:flex;gap:2px;align-items:center">${FX.botones ? FX.botones() : ''}<button class="btn alt" id="emo" style="width:auto;margin:0;padding:4px 9px">😀</button></span></div>
      <canvas id="cv" width="${W * dpr}" height="${H * dpr}" style="width:${W}px;height:${H}px;display:block;margin:0 auto;border-radius:14px;touch-action:none"></canvas>
      <div id="emos" style="display:none;justify-content:center;gap:10px;font-size:1.6rem;padding:4px">${['😂', '👍', '😡', '😭', '😎', '👏'].map(e => `<button data-e="${e}" style="background:none;border:0;font-size:1.6rem;cursor:pointer">${e}</button>`).join('')}</div>
      <div style="display:flex;gap:6px;align-items:flex-end;margin-top:6px"><div style="text-align:center;width:44px"><small style="font-size:.6rem;opacity:.8">Sigue</small><canvas id="sig" style="width:40px;height:40px;display:block;margin:0 auto;opacity:.75"></canvas></div><div id="mano" style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:5px"></div></div>
      <div style="position:relative;height:20px;margin-top:6px;border-radius:10px;background:rgba(0,0,0,.4);overflow:hidden"><i id="mana" style="position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#c026d3,#e879f9);width:0%"></i><div style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(10,1fr)">${'<span style="border-right:1px solid rgba(255,255,255,.25)"></span>'.repeat(10)}</div><b id="manaN" style="position:absolute;left:8px;top:0;font-size:.85rem;line-height:20px">💜 5</b></div></div>`);
    const cv = $('#cv'), X = cv.getContext('2d'); X.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fondo = document.createElement('canvas'); fondo.width = W * dpr; fondo.height = H * dpr; pintarArena(fondo.getContext('2d'));
    let ents = [], proys = [], efectos = [], textos = [], uid = 0, tiempo = 180, extra = false, fin = false, vivo = true, raf, last = performance.now(), sel = null, coronas = [0, 0], iaEmoT = 8, shake = 0, envT = 0;
    let nuevos = { fx: [], son: [], tx: [] };
    const son = tipo => { FX.son(tipo); if (ON && anfitrion) nuevos.son.push(tipo); };
    const efecto = f => { efectos.push(f); if (ON && anfitrion) nuevos.fx.push(f); };
    const texto = (txt, x, y, tam, dur, solo) => { textos.push({ txt, x, y, tam, v: dur, max: dur }); if (ON && anfitrion && !solo) nuevos.tx.push([txt, tam / k, dur]); };
    // torres
    const torre = (team, x, y, rey) => ents.push({ id: ++uid, team, torre: 1, rey, x, y, hp: rey ? 2600 : 1450, max: rey ? 2600 : 1450, r: rey ? 1.9 : 1.5, rango: rey ? 7 : 7.5, dmg: rey ? 75 : 55, golpe: rey ? 1 : .8, cd: 0, activo: !rey, obj: 'todo', aAire: 1 });
    if (n4) { for (const e of [[0, 3.5, 25.5], [0, 14.5, 25.5], [0, 9, 29.2, 1], [1, 3.5, 6.5], [1, 14.5, 6.5], [1, 9, 2.8, 1]]) torre(...e); ents.forEach(e => { e.hp = e.max = e.max * 1.35; }); }
    else { torre(0, 3.5, 25.5); torre(0, 14.5, 25.5); torre(0, 9, 29.2, 1); torre(1, 3.5, 6.5); torre(1, 14.5, 6.5); torre(1, 9, 2.8, 1); }
    const torres = tm => ents.filter(e => e.torre && e.team === tm && e.hp > 0);
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    function pintarArena(F) {
      F.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let x = 0; x < AN; x++) for (let y = 0; y < AL; y++) { F.fillStyle = (x + y) % 2 ? '#5fb04a' : '#69bb53'; F.fillRect(x * k, y * k, k + .5, k + .5); }
      F.fillStyle = 'rgba(0,0,0,.12)'; F.fillRect(0, 0, W, k * .6); F.fillRect(0, H - k * .6, W, k * .6);
      const camino = (x0, y0, x1, y1) => { F.strokeStyle = '#c9a66b'; F.lineWidth = k * 1.5; F.lineCap = 'round'; F.beginPath(); F.moveTo(x0 * k, y0 * k); F.lineTo(x1 * k, y1 * k); F.stroke(); };
      for (const bx of PUENTES) camino(bx, 6.5, bx, 25.5); camino(3.5, 25.5, 9, 29.2); camino(14.5, 25.5, 9, 29.2); camino(3.5, 6.5, 9, 2.8); camino(14.5, 6.5, 9, 2.8);
      const rg = F.createLinearGradient(0, RIO0 * k, 0, RIO1 * k); rg.addColorStop(0, '#38bdf8'); rg.addColorStop(.5, '#0ea5e9'); rg.addColorStop(1, '#0284c7'); F.fillStyle = rg; F.fillRect(0, RIO0 * k, W, (RIO1 - RIO0) * k);
      F.fillStyle = '#9ca3af'; F.fillRect(0, RIO0 * k - 3, W, 3); F.fillRect(0, RIO1 * k, W, 3);
      for (const bx of PUENTES) { F.fillStyle = '#a16207'; F.fillRect((bx - 1.3) * k, (RIO0 - .3) * k, 2.6 * k, (RIO1 - RIO0 + .6) * k); F.strokeStyle = '#713f12'; F.lineWidth = 1.5; for (let i = 0; i <= 6; i++) { const y = (RIO0 - .3 + i * (RIO1 - RIO0 + .6) / 6) * k; F.beginPath(); F.moveTo((bx - 1.3) * k, y); F.lineTo((bx + 1.3) * k, y); F.stroke(); } F.fillStyle = '#78350f'; F.fillRect((bx - 1.45) * k, (RIO0 - .3) * k, k * .2, (RIO1 - RIO0 + .6) * k); F.fillRect((bx + 1.25) * k, (RIO0 - .3) * k, k * .2, (RIO1 - RIO0 + .6) * k); }
      const r = (() => { let s = 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
      for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H; if (y > RIO0 * k - 5 && y < RIO1 * k + 5) continue; F.fillStyle = ['#fff', '#fde047', '#f9a8d4'][i % 3]; F.beginPath(); F.arc(x, y, 1.6, 0, 7); F.fill(); }
      for (const [x, y] of [[.8, 12], [17.2, 12], [.8, 20], [17.2, 20], [8.5, 11], [9.5, 21]]) { F.fillStyle = '#2f7a2f'; F.beginPath(); F.arc(x * k, y * k, k * .55, 0, 7); F.arc(x * k + k * .4, y * k - k * .2, k * .45, 0, 7); F.fill(); }
    }
    // En pantalla, mi equipo siempre aparece abajo y en azul.
    const vy = y => voltear ? AL - y : y, vt = tm => voltear ? 1 - tm : tm;
    function dibTorre(e) {
      const x = e.x * k, y = vy(e.y) * k, s = e.r * k, tm = vt(e.team), tc = COLT[tm];
      if (e.hp <= 0) { X.fillStyle = '#6b7280'; for (let i = 0; i < 6; i++) { X.beginPath(); X.arc(x + Math.cos(i) * s * .5, y + Math.sin(i * 2) * s * .3, s * .25, 0, 7); X.fill(); } return; }
      X.fillStyle = 'rgba(0,0,0,.25)'; X.beginPath(); X.ellipse(x, y + s * .7, s * 1.05, s * .4, 0, 0, 7); X.fill();
      X.beginPath(); X.roundRect(x - s, y - s * .6, s * 2, s * 1.4, s * .2); X.fillStyle = rad(X, x, y, s * 1.4, '#e5e7eb', '#6b7280'); X.fill(); bord(X, 2);
      X.strokeStyle = 'rgba(55,65,81,.45)'; X.lineWidth = 1; for (let i = 1; i < 4; i++) { X.beginPath(); X.moveTo(x - s, y - s * .6 + i * s * .35); X.lineTo(x + s, y - s * .6 + i * s * .35); X.stroke(); }
      for (let i = -2; i <= 2; i++) { X.fillStyle = '#9ca3af'; X.fillRect(x + i * s * .4 - s * .14, y - s * .85, s * .28, s * .28); }
      X.fillStyle = tc; X.beginPath(); X.roundRect(x - s * .55, y - s * .55, s * 1.1, s * .55, s * .1); X.fill();
      if (e.rey) { X.fillStyle = '#fde68a'; X.beginPath(); X.arc(x, y - s * .7, s * .42, 0, 7); X.fill(); bord(X, 1.5); ojos(X, x, y - s * .72, s * .09, s * .15, tm ? 1 : -1); X.fillStyle = '#facc15'; X.beginPath(); X.moveTo(x - s * .35, y - s * 1.0); X.lineTo(x - s * .35, y - s * 1.35); X.lineTo(x - s * .17, y - s * 1.15); X.lineTo(x, y - s * 1.45); X.lineTo(x + s * .17, y - s * 1.15); X.lineTo(x + s * .35, y - s * 1.35); X.lineTo(x + s * .35, y - s * 1.0); X.fill(); bord(X, 1.2); if (!e.activo) { X.font = `900 ${s * .45}px Figtree,sans-serif`; X.textAlign = 'center'; X.fillText('💤', x + s * .75, y - s * 1.1); } }
      else { X.fillStyle = '#fbcfe8'; X.beginPath(); X.arc(x, y - s * .65, s * .3, 0, 7); X.fill(); bord(X, 1.2); ojos(X, x, y - s * .66, s * .07, s * .11, tm ? 1 : -1); X.fillStyle = tc; X.beginPath(); X.moveTo(x - s * .3, y - s * .82); X.lineTo(x, y - s * 1.2); X.lineTo(x + s * .3, y - s * .82); X.fill(); }
      X.strokeStyle = '#4b5563'; X.lineWidth = 2; X.beginPath(); X.moveTo(x + s * .9, y - s * .6); X.lineTo(x + s * .9, y - s * 1.5); X.stroke(); X.fillStyle = tc; X.beginPath(); X.moveTo(x + s * .9, y - s * 1.5); X.lineTo(x + s * .9 + s * .5 + Math.sin(performance.now() / 200) * 2, y - s * 1.32); X.lineTo(x + s * .9, y - s * 1.15); X.fill();
      if (e.hp < e.max || e.rey) { const w = s * 2, yb = tm ? y + s * .95 : y - s * 1.75; X.fillStyle = 'rgba(0,0,0,.55)'; X.beginPath(); X.roundRect(x - w / 2, yb, w, 8, 4); X.fill(); X.fillStyle = tc; X.beginPath(); X.roundRect(x - w / 2 + 1, yb + 1, (w - 2) * Math.max(0, e.hp) / e.max, 6, 3); X.fill(); X.fillStyle = '#fff'; X.font = `800 ${Math.max(9, k * .45)}px Figtree,sans-serif`; X.textAlign = 'center'; X.fillText(Math.max(0, Math.ceil(e.hp)), x, yb + (tm ? 18 : -3)); }
    }

    // ---------- Simulación (solo el anfitrión) ----------
    function crear(as, key, x, y) {
      const C = CARTAS[key], team = as.team, m = mult(as.niv[key] || 1);
      if (C.tipo === 'h') { lanzarHechizo(team, key, x, y, m); return; }
      for (let i = 0; i < C.cant; i++) { const a = i / C.cant * Math.PI * 2, d = C.cant > 1 ? .55 + C.cant * .08 : 0;
        ents.push({ id: ++uid, team, tipo: key, x: Math.max(.5, Math.min(AN - .5, x + Math.cos(a) * d)), y: y + Math.sin(a) * d, hp: C.hp * m, max: C.hp * m, dmg: C.dmg * m, vel: C.vel, rango: C.rango, golpe: C.golpe, r: C.r, obj: C.obj, aire: C.aire, aAire: C.aAire || C.aire, area: C.area, proy: C.proy, cd: .3, nace: 1, t: Math.random() * 5, at: 0, frio: 0 }); }
      efecto({ tipo: 'aparece', x, y, v: .6, max: .6, team });
    }
    function lanzarHechizo(team, key, x, y, m) {
      const C = CARTAS[key];
      if (key === 'fuego') { const rey = torres(team).find(e => e.rey) || { x: 9, y: team ? 2.8 : 29.2 }; proys.push({ x: rey.x, y: rey.y, tx: x, ty: y, v: 13, tipo: 'bola', team, dmg: C.dmg * m, radio: C.radio }); son('swish'); }
      if (key === 'ventisca') { for (const e of ents) if (e.team !== team && e.hp > 0 && !e.torre && Math.hypot(e.x - x, e.y - y) < C.radio) { e.frio = C.congela; herir(e, C.dmg * m); } for (const e of ents) if (e.team !== team && e.torre && e.hp > 0 && Math.hypot(e.x - x, e.y - y) < C.radio + e.r) e.frio = C.congela * .6; efecto({ tipo: 'hielo', x, y, r: C.radio, v: .8, max: .8 }); son('hielo'); }
    }
    function herir(e, d) {
      if (e.hp <= 0) return; e.hp -= d; e.flash = .15;
      if (e.torre) { if (e.rey && !e.activo) e.activo = true; if (e.team === miEquipo && Math.random() < .12) FX.voz?.(azar(FR.rey), { tono: .8 }); }
      if (e.hp <= 0) morir(e);
    }
    function morir(e) {
      if (e.torre) {
        coronas[1 - e.team] += e.rey ? 3 - coronas[1 - e.team] : 1; shake = .6; son('explosion'); FX.vibrar([80, 50, 120]);
        efecto({ tipo: 'boom', x: e.x, y: e.y, v: .8, max: .8, r: 3 });
        const rey = ents.find(x => x.torre && x.rey && x.team === e.team); if (rey) rey.activo = true;
        textoEquipo(e.team, '😱 ¡Perdimos una torre!', '👑 ¡Torre destruida!');
        if (e.team !== miEquipo) FX.voz?.(e.rey ? '¡Victoria total!' : '¡Torre destruida! ¡Bien hecho!', { forzar: true, cortar: true }); else FX.voz?.('¡Cuidado! Perdimos una torre', { forzar: true, cortar: true, tono: .9 });
        if (e.rey || coronas[0] >= 3 || coronas[1] >= 3 || extra) terminar();
      } else { for (let i = 0; i < 8; i++) efectos.push({ tipo: 'chispa', x: e.x, y: e.y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, v: .5, max: .5, team: e.team }); son('pop'); }
    }
    // Texto distinto para cada equipo (en línea cada uno lo ve desde su lado).
    function textoEquipo(teamAfectado, txtAfectado, txtOtro) { texto(teamAfectado === miEquipo ? txtAfectado : txtOtro, W / 2, H / 2, k * 1.1, 1.8, true); if (ON && anfitrion) nuevos.tx.push(['@' + teamAfectado + '|' + txtAfectado + '|' + txtOtro, 1.1, 1.8]); }
    function objetivo(u) {
      let mejor = null, md = 1e9;
      for (const e of ents) { if (e.team === u.team || e.hp <= 0 || e.nace > 0) continue; if (u.obj === 'edif' && !e.torre) continue; if (e.aire && !u.aAire) continue;
        const d = dist(u, e) - e.r; if (!e.torre && d > 5.5) continue; if (e.torre) { const mismoLado = (e.x < 9) === (u.x < 9) || e.rey; if (!mismoLado && torres(e.team).some(o => !o.rey && (o.x < 9) === (u.x < 9))) continue; }
        const pd = d + (e.torre ? 3 : 0); if (pd < md) { md = pd; mejor = e; } }
      return mejor;
    }
    function moverHacia(u, tx, ty, dt) {
      let px = tx, py = ty; const lado = y => y < RIO0 ? 1 : y > RIO1 ? 0 : 2;
      if (!u.aire && lado(u.y) !== lado(ty)) { const bx = Math.abs(u.x - PUENTES[0]) < Math.abs(u.x - PUENTES[1]) ? PUENTES[0] : PUENTES[1]; const ent = u.team ? RIO0 - .3 : RIO1 + .3, sal = u.team ? RIO1 + .5 : RIO0 - .5;
        if (lado(u.y) === 2 || Math.abs(u.x - bx) < .4) { px = bx; py = sal; } else { px = bx; py = ent; } }
      const dx = px - u.x, dy = py - u.y, d = Math.hypot(dx, dy) || 1, v = u.vel * (u.frio > 0 ? 0 : 1) * dt; u.x += dx / d * Math.min(v, d); u.y += dy / d * Math.min(v, d);
    }
    function paso(dt) {
      tiempo -= dt; const doble = tiempo <= 60 || extra;
      for (const as of asientos) as.mana = Math.min(10, as.mana + dt / 2.8 * (doble ? 2 : 1) * (n4 ? .8 : 1) * (as.ctrl === 'ia' && !ON && as.team !== miEquipo ? 1 + li * .04 : 1));
      if (tiempo <= 0) { if (!extra && coronas[0] === coronas[1]) { extra = true; tiempo = 60; texto('⏱️ ¡Tiempo extra! La siguiente torre gana', W / 2, H / 2, k * .8, 2.2); son('sirena'); FX.intensidad?.(2); FX.voz?.('¡Tiempo extra!', { forzar: true }); } else return terminar(); }
      if (!extra && tiempo <= 60 && tiempo + dt > 60) { texto('💜 ¡Maná doble!', W / 2, H / 2, k, 1.8); son('combo'); FX.intensidad?.(2); FX.voz?.('¡Maná doble!', { forzar: true }); }
      for (const u of ents) {
        if (u.hp <= 0) continue; u.t = (u.t || 0) + dt; u.flash = Math.max(0, (u.flash || 0) - dt); u.at = Math.max(0, (u.at || 0) - dt);
        if (u.frio > 0) { u.frio -= dt; continue; }
        if (u.nace > 0) { u.nace -= dt; continue; }
        if (u.torre && !u.activo) continue;
        if (!u.tgt || u.tgt.hp <= 0 || (!u.torre && !u.tgt.torre && dist(u, u.tgt) > 7) || (u.torre && dist(u, u.tgt) - u.tgt.r > u.rango)) u.tgt = u.torre ? (() => { let m = null, md = 1e9; for (const e of ents) if (e.team !== u.team && e.hp > 0 && !e.torre && !(e.nace > 0)) { const d = dist(u, e) - e.r; if (d <= u.rango && d < md) { md = d; m = e; } } return m; })() : objetivo(u);
        const tg = u.tgt; if (!tg) continue;
        const d = dist(u, tg) - tg.r - (u.torre ? 0 : u.r * .3);
        if (d <= u.rango) { u.cd -= dt; if (u.cd <= 0) { u.cd = u.golpe; u.at = .25; atacar(u, tg); } }
        else if (!u.torre) { u.cd = Math.min(u.cd, u.golpe * .5); moverHacia(u, tg.x, tg.y, dt); }
      }
      const vivos = ents.filter(e => e.hp > 0);
      for (let i = 0; i < vivos.length; i++) for (let j = i + 1; j < vivos.length; j++) { const a = vivos[i], b = vivos[j]; if (!!a.aire !== !!b.aire || (a.torre && b.torre)) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, m = (a.r + b.r) * .85; if (d < m) { const p = (m - d) / 2, nx = dx / d, ny = dy / d; if (a.torre) { b.x += nx * p * 2; b.y += ny * p * 2; } else if (b.torre) { a.x -= nx * p * 2; a.y -= ny * p * 2; } else { a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; } } }
      for (const u of vivos) if (!u.torre) { u.x = Math.max(.4, Math.min(AN - .4, u.x)); u.y = Math.max(.4, Math.min(AL - .4, u.y)); if (!u.aire && u.y > RIO0 - .1 && u.y < RIO1 + .1) { const bx = Math.abs(u.x - PUENTES[0]) < Math.abs(u.x - PUENTES[1]) ? PUENTES[0] : PUENTES[1]; u.x = Math.max(bx - 1, Math.min(bx + 1, u.x)); } }
      for (const p of proys) {
        if (p.tipo === 'bola') { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy); if (d < p.v * dt) { p.fin = 1; for (const e of ents) if (e.team !== p.team && e.hp > 0 && Math.hypot(e.x - p.tx, e.y - p.ty) < p.radio + (e.torre ? e.r : 0)) herir(e, e.torre ? p.dmg * .35 : p.dmg); efecto({ tipo: 'boom', x: p.tx, y: p.ty, v: .6, max: .6, r: p.radio }); son('explosion'); shake = .3; } else { p.x += dx / d * p.v * dt; p.y += dy / d * p.v * dt; } continue; }
        const tg = p.tgt; if (!tg || tg.hp <= 0) { p.fin = 1; continue; } const dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy); p.tx = tg.x; p.ty = tg.y;
        if (d < p.v * dt + .2) { p.fin = 1; if (p.area) { for (const e of ents) if (e.team !== p.team && e.hp > 0 && Math.hypot(e.x - tg.x, e.y - tg.y) < p.area + e.r * .5) herir(e, p.dmg); efecto({ tipo: 'boom', x: tg.x, y: tg.y, v: .35, max: .35, r: p.area, c: p.tipo === 'escupe' ? '#a3e635' : '#fb923c' }); } else herir(tg, p.dmg); son('splat'); }
        else { p.x += dx / d * p.v * dt; p.y += dy / d * p.v * dt; }
      }
      proys = proys.filter(p => !p.fin); ents = ents.filter(e => e.hp > 0 || e.torre);
      for (const as of asientos) if (as.ctrl === 'ia') ia(as, dt);
      iaEmoT -= dt; if (iaEmoT <= 0) { iaEmoT = 12 + Math.random() * 15; const bot = asientos.find(a => a.ctrl === 'ia' && a.team !== miEquipo); if (bot && Math.random() < .5) emote(bot.a, azar(FR.rivalE), true); }
    }
    function atacar(u, tg) {
      if (u.proy || u.torre) { proys.push({ x: u.x, y: u.y - (u.torre ? u.r : 0), tgt: tg, tx: tg.x, ty: tg.y, v: u.torre ? 14 : 11, dmg: u.dmg, area: u.area, tipo: u.torre ? 'flecha' : u.proy, team: u.team }); if (!u.torre) son('swish'); }
      else { if (u.area) { for (const e of ents) if (e.team !== u.team && e.hp > 0 && dist(e, tg) < u.area) herir(e, u.dmg); } else herir(tg, u.dmg); efecto({ tipo: 'golpe', x: (u.x + tg.x) / 2, y: (u.y + tg.y) / 2, v: .2, max: .2 }); son(tg.torre ? 'choque' : 'splat'); }
    }
    // Jugar una carta (valida maná, mano y lado del río)
    function jugarCarta(as, key, x, y) {
      const C = CARTAS[key]; if (!C || !as.mano.includes(key) || as.mana < C.c || fin) return false;
      if (C.tipo === 'u') { const propio = as.team ? y <= RIO0 - .3 : y >= RIO1 + .3, bolsillo = !torres(1 - as.team).some(o => !o.rey && (o.x < 9) === (x < 9)) && (as.team ? y <= 23 : y >= 9); if (!propio && !bolsillo) return false; }
      as.mana -= C.c; as.mano.splice(as.mano.indexOf(key), 1); as.mano.push(as.cola.shift()); as.cola.push(key);
      crear(as, key, Math.max(.5, Math.min(AN - .5, x)), Math.max(.5, Math.min(AL - .5, y))); return true;
    }
    // ---------- Inteligencia de los bots (trabaja en coordenadas propias: su lado arriba) ----------
    function ia(as, dt) {
      as.iaT -= dt; if (as.iaT > 0) return; as.iaT = Math.max(.35, .9 - li * .12) + Math.random() * .4 + (n4 ? .5 : 0);
      const Y = y => as.team ? y : AL - y, rel = e => as.team ? e.y : AL - e.y, enemigo = 1 - as.team;
      const jugar = (key, x, yr) => jugarCarta(as, key, x, Y(Math.min(RIO0 - .5, yr)));
      const amenazas = ents.filter(e => e.team === enemigo && e.hp > 0 && !e.torre && rel(e) < 21);
      for (const sp of ['fuego', 'ventisca']) if (as.mano.includes(sp) && as.mana >= CARTAS[sp].c) { const g = ents.filter(e => e.team === enemigo && !e.torre && e.hp > 0); for (const e of g) { const cerca = g.filter(o => dist(o, e) < 2.4); if (cerca.length >= 3 || (cerca.reduce((a, o) => a + o.hp, 0) > 900 && rel(e) < 14)) { if (sp === 'fuego' || rel(e) < 12) { const cx = cerca.reduce((a, o) => a + o.x, 0) / cerca.length, cy = cerca.reduce((a, o) => a + o.y, 0) / cerca.length; as.mana -= CARTAS[sp].c; as.mano.splice(as.mano.indexOf(sp), 1); as.mano.push(as.cola.shift()); as.cola.push(sp); lanzarHechizo(as.team, sp, cx, cy, mult(as.niv[sp] || 1)); return; } } } }
      if (amenazas.length) {
        const a = amenazas.sort((p, q) => rel(p) - rel(q))[0], volador = a.aire, enjambre = amenazas.filter(o => dist(o, a) < 2.5).length >= 3;
        const ops = as.mano.filter(c => CARTAS[c].tipo === 'u' && CARTAS[c].c <= as.mana && CARTAS[c].obj !== 'edif' && (!volador || CARTAS[c].aAire || CARTAS[c].aire)).sort((p, q) => (enjambre ? (CARTAS[q].area ? 1 : 0) - (CARTAS[p].area ? 1 : 0) : 0) || CARTAS[q].hp - CARTAS[p].hp);
        if (ops.length && rel(a) < 18) { const c = ops[0]; jugar(c, Math.max(1, Math.min(AN - 1, a.x + (Math.random() - .5) * 2)), Math.max(1.5, Math.min(RIO0 - .5, rel(a) - (CARTAS[c].rango > 2 ? 4 : 2)))); return; }
      }
      if (as.mana >= 8.5 || (as.mana >= 6 && Math.random() < .25)) {
        const lado = (() => { const ts = torres(enemigo).filter(e => !e.rey); if (!ts.length) return Math.random() < .5 ? 0 : 1; return ts.sort((p, q) => p.hp - q.hp)[0].x < 9 ? 0 : 1; })(), bx = PUENTES[n4 && as.a % 2 ? 1 - lado : lado];
        const propios = ents.filter(e => e.team === as.team && !e.torre && e.hp > 0 && Math.abs(e.x - bx) < 4);
        const tanque = as.mano.find(c => ['tortuga', 'condor', 'oso', 'jabali'].includes(c) && CARTAS[c].c <= as.mana);
        if (tanque && !propios.length) { jugar(tanque, bx + (Math.random() - .5), tanque === 'tortuga' || tanque === 'condor' ? 4 : RIO0 - 1); return; }
        const apoyo = as.mano.find(c => CARTAS[c].tipo === 'u' && CARTAS[c].c <= as.mana && !['tortuga', 'condor'].includes(c));
        if (apoyo) { const t0 = propios[0]; jugar(apoyo, t0 ? t0.x : bx, t0 ? rel(t0) - 2 : RIO0 - 2); }
      }
    }
    function emote(asiento, e, enviarRed) { const tm = equipoDe(asiento); efectos.push({ tipo: 'emote', team: tm, e, v: 2.5, max: 2.5, x: 0, y: 0 }); FX.son('pop'); if (ON && enviarRed) post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'emote', datos: { e, a: asiento } }).catch(() => {}); }

    // ---------- Red ----------
    let snap = null, mapa = new Map();
    function enviarEstado() {
      const r1 = v => Math.round(v * 10) / 10;
      const d = { t: r1(tiempo), x: extra ? 1 : 0, c: coronas, e: ents.map(e => [e.id, e.team, e.torre ? (e.rey ? 'R' : 'T') : e.tipo, r1(e.x), r1(e.y), Math.round(e.hp), Math.round(e.max), (e.frio > 0 ? 1 : 0) | (e.nace > 0 ? 2 : 0) | (e.at > 0 ? 4 : 0) | (e.activo ? 8 : 0) | (e.flash > 0 ? 16 : 0)]),
        p: proys.map(p => [p.tipo, r1(p.x), r1(p.y), r1(p.tx ?? p.x), r1(p.ty ?? p.y)]), s: asientos.map(a => [r1(a.mana), a.mano, a.cola[0]]), fx: nuevos.fx.map(f => ({ ...f })), so: nuevos.son, tx: nuevos.tx };
      nuevos = { fx: [], son: [], tx: [] };
      post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'estado', datos: d }).catch(() => {});
    }
    function aplicarEstado(d) {
      tiempo = d.t; extra = !!d.x; coronas = d.c;
      const vistos = new Set();
      for (const [id, team, tipo, x, y, hp, max, fl] of d.e) { vistos.add(id); let e = mapa.get(id);
        if (!e) { e = { id, team, x, y, hp, max, t: Math.random() * 5 }; if (tipo === 'R' || tipo === 'T') Object.assign(e, { torre: 1, rey: tipo === 'R', r: tipo === 'R' ? 1.9 : 1.5 }); else Object.assign(e, { tipo, r: CARTAS[tipo].r, aire: CARTAS[tipo].aire }); mapa.set(id, e); }
        if (hp < e.hp) e.flash = .15; e.tx = x; e.ty = y; e.hp = hp; e.max = max; e.frio = fl & 1 ? 1 : 0; e.nace = fl & 2 ? .5 : 0; e.at = fl & 4 ? .25 : 0; e.activo = !!(fl & 8); }
      for (const [id, e] of mapa) if (!vistos.has(id) && !e.torre) { mapa.delete(id); for (let i = 0; i < 8; i++) efectos.push({ tipo: 'chispa', x: e.x, y: e.y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, v: .5, max: .5, team: e.team }); }
      ents = [...mapa.values()].filter(e => e.hp > 0 || e.torre);
      proys = d.p.map(([tipo, x, y, tx, ty]) => ({ tipo, x, y, tx, ty, tgt: { x: tx, y: ty } }));
      d.s.forEach((s, i) => { asientos[i].mana = s[0]; asientos[i].mano = s[1]; asientos[i].cola = [s[2]]; });
      for (const f of d.fx) efectos.push(f); for (const s of d.so.slice(0, 6)) FX.son(s);
      for (const [txt, tam, dur] of d.tx) { if (txt[0] === '@') { const [tmA, a, b] = txt.slice(1).split('|'); texto(+tmA === miEquipo ? a : b, W / 2, H / 2, k * tam, dur, true); } else texto(txt, W / 2, H / 2, k * tam, dur, true); }
      if (JSON.stringify(yo.mano) !== manoPintada) pintarMano();
    }
    if (ON) {
      ES = ES || new EventSource(`/api/duelo/stream?sala=${ON.sala}&tok=${ON.tok}`);
      ES.addEventListener('estado', e => { if (!anfitrion) { snap = JSON.parse(e.data); aplicarEstado(snap); } });
      ES.addEventListener('jugar', e => { if (!anfitrion) return; const d = JSON.parse(e.data), as = asientos[d.de]; if (as && as.ctrl === 'remoto') jugarCarta(as, d.k, +d.x, +d.y); });
      ES.addEventListener('emote', e => { const d = JSON.parse(e.data); if (d.de !== miAsiento) emote(d.a ?? d.de, d.e, false); });
      ES.addEventListener('salio', e => { const d = JSON.parse(e.data); if (fin) return;
        if (d.asiento === 0 && !anfitrion) { texto('📴 El anfitrión se desconectó', W / 2, H / 2, k * .8, 3, true); terminar(equipoDe(0) !== miEquipo ? miEquipo : null, true); return; }
        const as = asientos[d.asiento]; if (as) { as.ctrl = 'ia'; texto(`📴 ${d.nombre} se desconectó · un bot juega por él`, W / 2, H * .4, k * .6, 3); } });
      ES.addEventListener('fin', e => { if (anfitrion) return; const d = JSON.parse(e.data); coronas = d.c; terminar(d.g, true); });
    }

    // ---------- Dibujo ----------
    function dibujar(dt) {
      for (const f of efectos) { f.v -= dt; if (f.vx) { f.x += f.vx * dt; f.y += f.vy * dt; } } efectos = efectos.filter(f => f.v > 0);
      for (const tx of textos) tx.v -= dt; textos = textos.filter(x => x.v > 0); shake = Math.max(0, shake - dt);
      if (!anfitrion) for (const e of ents) { if (e.tx != null) { e.x += (e.tx - e.x) * Math.min(1, dt * 10); e.y += (e.ty - e.y) * Math.min(1, dt * 10); } e.t = (e.t || 0) + dt; e.flash = Math.max(0, (e.flash || 0) - dt); }
      X.save(); if (shake > 0) X.translate((Math.random() - .5) * k * shake, (Math.random() - .5) * k * shake);
      X.drawImage(fondo, 0, 0, W, H);
      X.strokeStyle = 'rgba(255,255,255,.35)'; X.lineWidth = 1.5; const tt = performance.now() / 600; for (let i = 0; i < 3; i++) { X.beginPath(); for (let x = 0; x <= W; x += 6) X.lineTo(x, (RIO0 + .5 + i * .5) * k + Math.sin(x / 18 + tt + i * 2) * 2); X.stroke(); }
      if (sel) { const C = CARTAS[sel]; if (C.tipo === 'u') { X.fillStyle = 'rgba(239,68,68,.22)'; X.fillRect(0, 0, W, (RIO1 + .2) * k); for (const lado of [0, 1]) if (!torres(1 - miEquipo).some(e => !e.rey && (e.x < 9) === (lado === 0))) { X.fillStyle = 'rgba(255,255,255,.12)'; X.fillRect(lado * W / 2, 9 * k, W / 2, (RIO1 - 9) * k); } } else { X.strokeStyle = 'rgba(255,255,255,.4)'; X.setLineDash([6, 6]); X.strokeRect(2, 2, W - 4, H - 4); X.setLineDash([]); } }
      const orden = ents.filter(e => e.hp > 0 || e.torre).sort((a, b) => (a.aire ? 100 : 0) + vy(a.y) - ((b.aire ? 100 : 0) + vy(b.y)));
      for (const e of orden) {
        if (e.torre) { dibTorre(e); continue; }
        const tm = vt(e.team), x = e.x * k, yy = vy(e.y), y = yy * k - (e.aire ? k * .9 : 0), s = e.r * k * 1.15;
        X.fillStyle = 'rgba(0,0,0,.22)'; X.beginPath(); X.ellipse(x, yy * k + s * .55, s * .8, s * .3, 0, 0, 7); X.fill();
        X.fillStyle = COLT[tm]; X.globalAlpha = .55; X.beginPath(); X.ellipse(x, yy * k + s * .55, s * .9, s * .35, 0, 0, 7); X.fill(); X.globalAlpha = 1;
        if (e.nace > 0) X.globalAlpha = .5; if (e.flash > 0) X.filter = 'brightness(2)';
        DIB[e.tipo](X, x, y, s, tm, e.t || 0, e.at > 0);
        X.filter = 'none'; X.globalAlpha = 1;
        if (e.frio > 0) { X.fillStyle = 'rgba(165,243,252,.45)'; X.beginPath(); X.arc(x, y, s * 1.05, 0, 7); X.fill(); }
        if (e.hp < e.max) { const w = s * 1.6; X.fillStyle = 'rgba(0,0,0,.5)'; X.fillRect(x - w / 2, y - s * 1.35, w, 4); X.fillStyle = COLT[tm]; X.fillRect(x - w / 2, y - s * 1.35, w * e.hp / e.max, 4); }
      }
      for (const p of proys) { const x = p.x * k, y = vy(p.y) * k;
        if (p.tipo === 'bola') { X.shadowColor = '#fb923c'; X.shadowBlur = 16; DIB.fuego(X, x, y, k * .55); X.shadowBlur = 0; }
        else if (p.tipo === 'flecha') { const a = Math.atan2(vy(p.tgt?.y ?? p.ty) - vy(p.y), (p.tgt?.x ?? p.tx) - p.x); X.save(); X.translate(x, y); X.rotate(a); X.fillStyle = '#78350f'; X.fillRect(-k * .4, -1, k * .8, 2); X.fillStyle = '#e5e7eb'; X.beginPath(); X.moveTo(k * .45, 0); X.lineTo(k * .25, -3); X.lineTo(k * .25, 3); X.fill(); X.restore(); }
        else { X.fillStyle = p.tipo === 'escupe' ? '#a3e635' : '#fb923c'; X.beginPath(); X.arc(x, y, k * .22, 0, 7); X.fill(); } }
      for (const f of efectos) { const a = f.v / f.max, x = f.x * k, y = vy(f.y) * k;
        if (f.tipo === 'boom') { X.fillStyle = f.c ? f.c + '88' : `rgba(251,146,60,${a * .6})`; X.beginPath(); X.arc(x, y, f.r * k * (1.2 - a * .4), 0, 7); X.fill(); X.strokeStyle = `rgba(255,240,180,${a})`; X.lineWidth = 3; X.stroke(); }
        if (f.tipo === 'hielo') { X.fillStyle = `rgba(186,230,253,${a * .5})`; X.beginPath(); X.arc(x, y, f.r * k, 0, 7); X.fill(); DIB.ventisca(X, x, y, k * .8 * a + k * .3); }
        if (f.tipo === 'chispa') { X.fillStyle = COLT[vt(f.team || 0)]; X.globalAlpha = a; X.beginPath(); X.arc(x, y, 3, 0, 7); X.fill(); X.globalAlpha = 1; }
        if (f.tipo === 'golpe') { X.strokeStyle = `rgba(255,255,255,${a})`; X.lineWidth = 3; X.beginPath(); X.arc(x, y, k * .5 * (1.5 - a), 0, 7); X.stroke(); }
        if (f.tipo === 'aparece') { X.strokeStyle = COLT[vt(f.team)]; X.globalAlpha = a; X.lineWidth = 3; X.beginPath(); X.arc(x, y, k * 1.5 * (1 - a) + k * .3, 0, 7); X.stroke(); X.globalAlpha = 1; }
        if (f.tipo === 'emote') { const abajo = vt(f.team) === 0, ex = W / 2 + k * 3.5, ey = abajo ? H - k * 5.5 : k * 5.5; X.globalAlpha = Math.min(1, a * 3); X.fillStyle = '#fff'; X.beginPath(); X.roundRect(ex - k * .9, ey - k * .9, k * 1.8, k * 1.8, k * .4); X.fill(); X.font = `${k * 1.2}px serif`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(f.e, ex, ey + 2); X.textBaseline = 'alphabetic'; X.globalAlpha = 1; } }
      for (const tx of textos) { X.globalAlpha = Math.min(1, tx.v / .3); X.font = `900 ${tx.tam}px Figtree,sans-serif`; X.textAlign = 'center'; X.lineWidth = 5; X.strokeStyle = 'rgba(30,10,40,.85)'; X.strokeText(tx.txt, tx.x, tx.y, W - 10); X.fillStyle = '#fff'; X.fillText(tx.txt, tx.x, tx.y, W - 10); } X.globalAlpha = 1;
      // coronas y nombres
      const cE = coronas[1 - miEquipo], cY = coronas[miEquipo];
      X.font = `900 ${k * .8}px Figtree,sans-serif`; X.textAlign = 'left'; X.fillStyle = '#fff'; X.lineWidth = 4; X.strokeStyle = 'rgba(0,0,0,.6)';
      X.strokeText(`👑 ${cE}`, k * .3, (RIO0 - .4) * k); X.fillText(`👑 ${cE}`, k * .3, (RIO0 - .4) * k); X.strokeText(`👑 ${cY}`, k * .3, (RIO1 + 1.2) * k); X.fillText(`👑 ${cY}`, k * .3, (RIO1 + 1.2) * k);
      X.font = `800 ${k * .5}px Figtree,sans-serif`; X.textAlign = 'right';
      const nom = tm => asientos.filter(a => a.team === tm).map(a => a.nombre).join(' + ');
      X.strokeText(nom(1 - miEquipo), W - k * .3, (RIO0 - .5) * k); X.fillText(nom(1 - miEquipo), W - k * .3, (RIO0 - .5) * k); X.strokeText(nom(miEquipo), W - k * .3, (RIO1 + 1.1) * k); X.fillText(nom(miEquipo), W - k * .3, (RIO1 + 1.1) * k);
      X.restore();
    }
    let manoPintada = '';
    function hud() {
      const m = yo.mana; $('#mana').style.width = m * 10 + '%'; $('#manaN').textContent = '💜 ' + Math.floor(m);
      const ss = Math.max(0, Math.ceil(tiempo)); $('#reloj').textContent = `${extra ? '⏱️ ' : ''}${Math.floor(ss / 60)}:${String(ss % 60).padStart(2, '0')}${!extra && tiempo <= 60 ? ' 💜x2' : ''}`; $('#reloj').style.color = tiempo <= 30 ? '#fca5a5' : '';
      document.querySelectorAll('#mano .bcarta').forEach(b => { const C = CARTAS[b.dataset.k]; b.style.opacity = m >= C.c ? 1 : .5; b.style.transform = sel === b.dataset.k ? 'translateY(-8px)' : ''; b.style.borderColor = sel === b.dataset.k ? '#ffd166' : 'rgba(255,255,255,.2)'; });
    }
    function pintarMano() {
      manoPintada = JSON.stringify(yo.mano); if (sel && !yo.mano.includes(sel)) sel = null;
      $('#mano').innerHTML = yo.mano.map(c => `<button class="bcarta" data-k="${c}" style="position:relative;border:2px solid rgba(255,255,255,.2);border-radius:12px;background:linear-gradient(180deg,#3b2f6b,#1e1640);padding:3px 0;color:#fff;cursor:pointer;transition:transform .12s"><span style="position:absolute;left:-3px;top:-6px;background:linear-gradient(135deg,#e879f9,#7c3aed);border-radius:50%;width:20px;height:20px;font:900 .75rem/20px Figtree,sans-serif">${CARTAS[c].c}</span><canvas data-mc="${c}" style="width:48px;height:48px;display:block;margin:0 auto;pointer-events:none"></canvas><small style="font-size:.58rem;font-weight:800;pointer-events:none">${CARTAS[c].n.split(' ')[0]}</small></button>`).join('');
      document.querySelectorAll('[data-mc]').forEach(c => { c.width = 48 * dpr; c.height = 48 * dpr; icono(c, c.dataset.mc, 48); });
      const sg = $('#sig'); sg.width = 40 * dpr; sg.height = 40 * dpr; if (yo.cola[0]) icono(sg, yo.cola[0], 40);
    }
    pintarMano();
    $('#mano').onclick = e => { const b = e.target.closest('.bcarta'); if (!b || fin) return; const c = b.dataset.k; sel = sel === c ? null : c; FX.son('click'); hud(); };
    cv.addEventListener('pointerdown', e => {
      if (fin || !sel) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * AN, ys = (e.clientY - r.top) / r.height * AL, y = vy(ys), C = CARTAS[sel];
      if (yo.mana < C.c) { texto('💜 Te falta maná', W / 2, H * .62, k * .8, 1, true); FX.son('error'); return; }
      if (C.tipo === 'u') { const bolsillo = !torres(1 - miEquipo).some(o => !o.rey && (o.x < 9) === (x < 9)) && ys >= 9; if (ys < RIO1 + .3 && !bolsillo) { texto('Despliega en tu lado del río', W / 2, H * .62, k * .7, 1, true); FX.son('error'); return; } }
      const key = sel; sel = null;
      if (anfitrion) { if (!jugarCarta(yo, key, x, y)) return; }
      else { post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'jugar', datos: { k: key, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } }).catch(() => {}); yo.mana -= C.c; efectos.push({ tipo: 'aparece', x, y, v: .6, max: .6, team: miEquipo }); }
      FX.son(C.tipo === 'h' ? 'swish' : 'plantar'); FX.vibrar(12); if (C.tipo === 'u' && Math.random() < .3) FX.voz?.(azar(FR.despliegue), { tono: 1.1 });
      pintarMano(); hud();
    });
    $('#emo').onclick = () => { const d = $('#emos'); d.style.display = d.style.display === 'flex' ? 'none' : 'flex'; };
    $('#emos').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; emote(miAsiento, b.dataset.e, true); $('#emos').style.display = 'none'; if (!ON && Math.random() < .5) setTimeout(() => emote(1, azar(FR.rivalE)), 900 + Math.random() * 800); };
    $('#rend').onclick = () => { if (!fin && confirm('¿Rendirte? Perderás trofeos.')) { if (ON) post('/api/duelo/salir', { sala: ON.sala, tok: ON.tok }).catch(() => {}); coronas[1 - miEquipo] = 3; terminar(1 - miEquipo, true); } };

    // ganador: número de equipo, null = empate. remoto = ya decidido (no recalcular)
    function terminar(ganador, remoto) {
      if (fin) return; fin = true;
      if (!remoto) { ganador = coronas[0] > coronas[1] ? 0 : coronas[1] > coronas[0] ? 1 : null; if (ganador === null) { const pct = tm => torres(tm).reduce((a, e) => Math.min(a, e.hp / e.max), 1); ganador = pct(0) > pct(1) ? 0 : pct(0) < pct(1) ? 1 : null; } if (ON && anfitrion) { enviarEstado(); post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'fin', datos: { g: ganador, c: coronas } }).catch(() => {}); } }
      const gano = ganador === null ? null : ganador === miEquipo, misC = coronas[miEquipo];
      const factor = ON ? 1.2 : 1, dTr = gano === null ? 0 : gano ? Math.round((28 + Math.floor(Math.random() * 6)) * factor) : -Math.min(J.trofeos, 18 + Math.floor(Math.random() * 5)), ligaAntes = ligaDe(J.trofeos);
      J.trofeos += dTr; if (gano) J.victorias++; else if (gano === false) J.derrotas++;
      const monedas = gano ? 12 + misC * 4 + (ON ? 5 : 0) : gano === null ? 6 : 3; PERFIL.ganar(monedas);
      const pts = misC * 1000 + Math.max(0, Math.round(tiempo)) * 5 + (gano ? 2000 : 0);
      try { PERFIL.partida('batalla', pts); } catch (e) {}
      post('/api/arcade/puntaje', { juego: 'batalla', puntos: pts, nombre: LS.get('chatNom') || 'Jugador', avatar: LS.get('chatAv') || 'a01', uid: VID }).catch(() => {});
      const ligaAhora = ligaDe(J.trofeos), subio = ligaAhora > ligaAntes; PERFIL.guardar();
      FX.pararMusica?.(); if (gano) { FX.confeti(); FX.son('nivel'); } else FX.son('perder');
      FX.voz?.(subio ? `¡Subiste a la liga ${LIGAS[ligaAhora][0]}!` : gano ? azar(FR.gana) : gano === null ? '¡Empate!' : azar(FR.pierde), { forzar: true, cortar: true });
      const nueva = subio && Object.keys(CARTAS).find(c => CARTAS[c].liga === ligaAhora);
      setTimeout(() => { cerrarES(); const d = document.createElement('div'); d.className = 'modal'; d.innerHTML = `<div class="card" style="text-align:center"><div style="font-size:2.6rem">${gano ? '🏆' : gano === null ? '🤝' : '💔'}</div><h2>${gano ? '¡Victoria!' : gano === null ? '¡Empate!' : 'Derrota'}</h2>
        <div style="font-size:2rem;letter-spacing:4px">${'👑'.repeat(Math.min(3, misC))}<span style="opacity:.25">${'👑'.repeat(Math.max(0, 3 - misC))}</span></div>
        <p class="sub">🏆 ${dTr >= 0 ? '+' : ''}${dTr} trofeos (${J.trofeos}) · +${monedas} 🪙</p>${subio ? `<p style="font-weight:900;color:${LIGAS[ligaAhora][3]}">${LIGAS[ligaAhora][1]} ¡Subiste a la liga ${LIGAS[ligaAhora][0]}!${nueva ? `<br>Nueva carta: ${CARTAS[nueva].e} ${CARTAS[nueva].n}` : ''}</p>` : ''}
        ${!PERFIL.usuario ? '<button class="btn alt" id="crearU">👤 Crea tu usuario para guardar tus trofeos</button>' : ''}
        <button class="btn" id="otra">⚔️ Otra batalla</button><button class="btn alt" id="lob">🏰 Volver al castillo</button><button class="btn alt" id="comp">📣 Retar a un amigo</button></div>`; document.body.append(d);
        d.onclick = e => { const id = e.target.id; if (id === 'crearU') { cuentaModal('crear'); } if (id === 'otra') { d.remove(); FX.musica?.('batalla'); if (ON) buscar(t, cfg.modo, 'buscar'); else batalla(t, { modo: cfg.modo }); } if (id === 'lob') { d.remove(); lobby(t); } if (id === 'comp') { d.remove(); amigo(t); } }; }, 1200);
    }
    const bucle = now => { if (!vivo) return; const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!fin && anfitrion && !(document.hidden && !ON)) { paso(dt); if (ON) { envT -= dt; if (envT <= 0) { envT = .1; enviarEstado(); } } }
      if (!anfitrion) for (const a of asientos) a.mana = Math.min(10, a.mana + dt / 2.8 * (tiempo <= 60 || extra ? 2 : 1) * (n4 ? .8 : 1));
      dibujar(dt); hud(); raf = requestAnimationFrame(bucle); };
    texto(ON ? `⚔️ ${cfg.modo === '2v2' ? '2 vs 2' : '1 vs 1'} en línea` : '⚔️ ¡A la batalla!', W / 2, H / 2, k * 1.2, 1.8, true); FX.musica?.('batalla'); FX.voz?.('¡Que empiece la batalla!', { forzar: true, cortar: true });
    raf = requestAnimationFrame(bucle);
    setParar(() => { vivo = false; cancelAnimationFrame(raf); if (ON && !fin) post('/api/duelo/salir', { sala: ON.sala, tok: ON.tok }).catch(() => {}); cerrarES(); document.querySelectorAll('.modal:not(#gate)').forEach(m => m.remove()); });
    window.__batalla = { estado: () => ({ tiempo, mana: asientos.map(a => a.mana), coronas: [...coronas], ents: ents.filter(e => e.hp > 0 && !e.torre).length, torres: ents.filter(e => e.torre).map(e => [e.team, Math.round(e.hp)]), fin, anfitrion, miAsiento, ctrl: asientos.map(a => a.ctrl) }), mana: v => yo.mana = v, jugar: (c, x, y) => { sel = c; const r = cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + x / AN * r.width, clientY: r.top + y / AL * r.height, bubbles: true })); }, mano: () => [...yo.mano], tiempo: v => tiempo = v };
  }
  JUEGOS.batalla = lobby;
})();
