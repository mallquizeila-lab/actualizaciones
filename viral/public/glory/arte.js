// 🎨 Arte de GLORY BROWN: cada carta se dibuja según su arquetipo, su aspecto y el estilo de su mundo (todo vectorial y propio).
// Los dibujos se guardan en caché como "sprites" (quieto y atacando) para que la batalla vaya fluida en celulares.
(() => {
  const EQ = [{ c: '#2563eb', c2: '#172554', luz: '#93c5fd' }, { c: '#dc2626', c2: '#450a0a', luz: '#fca5a5' }];
  const lin = (X, x0, y0, x1, y1, st) => { const g = X.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => g.addColorStop(i / (st.length - 1), c)); return g; };
  const rad = (X, x, y, r, c1, c2) => { const g = X.createRadialGradient(x - r * .35, y - r * .4, r * .08, x, y, r * 1.15); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };
  const metalC = { oro: ['#fff7c2', '#facc15', '#a16207', '#fde047'], plata: ['#f8fafc', '#cbd5e1', '#64748b', '#334155', '#94a3b8'], bronce: ['#fde4c3', '#c2782c', '#7c3f12', '#e8a35a'], oscuro: ['#a5a3b8', '#3f3a55', '#151225', '#5b5675'], hielo: ['#f0fdff', '#a5f3fc', '#0e7490', '#67e8f9'], rojo: ['#fecaca', '#b91c1c', '#450a0a', '#ef4444'], cuero: ['#d6a36a', '#8a5a2b', '#3f2410', '#a8713a'], verde: ['#d9f99d', '#4d7c0f', '#1a2e05', '#84cc16'], blanco: ['#ffffff', '#e2e8f0', '#94a3b8', '#f1f5f9'] };
  const metal = (X, x, y, r, tipo = 'plata') => lin(X, x - r, y - r, x + r, y + r, metalC[tipo] || metalC.plata);
  const cont = (X, w) => { X.lineJoin = 'round'; X.lineCap = 'round'; X.strokeStyle = 'rgba(8,6,16,.9)'; X.lineWidth = w; X.stroke(); };
  function brillo(X, x, y, r, col, a = .9) { X.save(); X.globalCompositeOperation = 'lighter'; const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); X.globalAlpha = a; X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, 7); X.fill(); X.restore(); }
  function ojosF(X, x, y, sep, r, col = '#fbbf24') { X.save(); X.shadowColor = col; X.shadowBlur = r * 4; X.fillStyle = col; for (const q of [-1, 1]) { X.beginPath(); X.ellipse(x + q * sep, y, r * 1.35, r * .55, q * .35, 0, 7); X.fill(); } X.restore(); }
  function ojosH(X, x, y, sep, r) { for (const q of [-1, 1]) { X.fillStyle = '#fff'; X.beginPath(); X.ellipse(x + q * sep, y, r * 1.2, r * .8, 0, 0, 7); X.fill(); X.fillStyle = '#1e1b2e'; X.beginPath(); X.arc(x + q * sep, y + r * .1, r * .62, 0, 7); X.fill(); X.fillStyle = '#fff'; X.beginPath(); X.arc(x + q * sep - r * .25, y - r * .2, r * .22, 0, 7); X.fill(); X.strokeStyle = 'rgba(30,20,20,.9)'; X.lineWidth = r * .55; X.beginPath(); X.moveTo(x + q * sep - q * r * 1.3, y - r * 1.5); X.lineTo(x + q * sep + q * r * 1.1, y - r * 1.15); X.stroke(); } }
  // Estilo de cada mundo para los humanoides
  const ESTILO = {
    alba: { metal: 'oro', tela: '#f8fafc', piel: '#f1c9a0', casco: 'yelmo', pelo: '#e7c46a', ojos: '#fde047', aura: '#fde047' },
    bosque: { metal: 'cuero', tela: '#166534', piel: '#e9c49f', casco: 'capucha', pelo: '#7c4a1a', ojos: '#86efac', aura: '#4ade80', orejas: 1 },
    arenas: { metal: 'bronce', tela: '#fde68a', piel: '#c58a5a', casco: 'turbante', pelo: '#1c1410', ojos: '#fbbf24', aura: '#f59e0b' },
    cielo: { metal: 'blanco', tela: '#e0f2fe', piel: '#f5d5b8', casco: 'tiara', pelo: '#f8fafc', ojos: '#7dd3fc', aura: '#bae6fd', alitas: 1 },
    sombras: { metal: 'oscuro', tela: '#2e1065', piel: '#a7a2c0', casco: 'cuernos', pelo: '#111', ojos: '#c084fc', aura: '#a855f7', brillaOjos: 1 },
    hielo: { metal: 'hielo', tela: '#e0f2fe', piel: '#f3d9c7', casco: 'piel', pelo: '#e2e8f0', ojos: '#67e8f9', aura: '#a5f3fc' },
    dragon: { metal: 'rojo', tela: '#1c1917', piel: '#d9a07a', casco: 'cuernos', pelo: '#7f1d1d', ojos: '#fb923c', aura: '#f97316', brillaOjos: 1 },
  };
  function capa(X, x, y, s, T) { X.beginPath(); X.moveTo(x - s * .48, y - s * .28); X.quadraticCurveTo(x - s * .72, y + s * .5, x - s * .45, y + s * .9); X.lineTo(x, y + s * .78); X.lineTo(x + s * .45, y + s * .9); X.quadraticCurveTo(x + s * .72, y + s * .5, x + s * .48, y - s * .28); X.closePath(); X.fillStyle = lin(X, x, y - s * .3, x, y + s * .9, [T.c, T.c2]); X.fill(); cont(X, s * .05); }
  function arma(X, tipo, x, y, s, at, est) {
    X.save(); X.translate(x, y);
    if (tipo === 'espada' || tipo === 'hacha' || tipo === 'maza') { X.rotate(at ? -1.5 : -.2); X.strokeStyle = '#3f2a14'; X.lineWidth = s * .08; X.beginPath(); X.moveTo(0, s * .2); X.lineTo(0, -s * .2); X.stroke();
      if (tipo === 'espada') { X.beginPath(); X.moveTo(-s * .06, -s * .2); X.lineTo(0, -s * .95); X.lineTo(s * .06, -s * .2); X.closePath(); X.fillStyle = metal(X, 0, -s * .5, s * .4); X.fill(); cont(X, s * .03); X.fillStyle = metal(X, 0, -s * .2, s * .2, est.metal); X.fillRect(-s * .18, -s * .24, s * .36, s * .07); }
      else if (tipo === 'hacha') { X.strokeStyle = '#3f2a14'; X.beginPath(); X.moveTo(0, -s * .2); X.lineTo(0, -s * .8); X.stroke(); X.beginPath(); X.moveTo(0, -s * .78); X.quadraticCurveTo(s * .5, -s * .9, s * .45, -s * .38); X.quadraticCurveTo(s * .22, -s * .48, 0, -s * .42); X.closePath(); X.fillStyle = metal(X, s * .2, -s * .6, s * .3); X.fill(); cont(X, s * .03); }
      else { X.strokeStyle = '#3f2a14'; X.beginPath(); X.moveTo(0, -s * .2); X.lineTo(0, -s * .7); X.stroke(); X.beginPath(); X.arc(0, -s * .78, s * .16, 0, 7); X.fillStyle = metal(X, 0, -s * .78, s * .16, est.metal); X.fill(); cont(X, s * .03); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; X.beginPath(); X.moveTo(Math.cos(a) * s * .14, -s * .78 + Math.sin(a) * s * .14); X.lineTo(Math.cos(a) * s * .26, -s * .78 + Math.sin(a) * s * .26); X.stroke(); } } }
    if (tipo === 'lanza') { X.rotate(at ? -.5 : -.15); X.strokeStyle = '#5b3a1a'; X.lineWidth = s * .07; X.beginPath(); X.moveTo(0, s * .4); X.lineTo(0, -s * 1.05); X.stroke(); X.beginPath(); X.moveTo(-s * .08, -s * 1); X.lineTo(0, -s * 1.3); X.lineTo(s * .08, -s * 1); X.fillStyle = metal(X, 0, -s * 1.1, s * .2); X.fill(); cont(X, s * .025); }
    if (tipo === 'arco') { X.strokeStyle = '#5b3a1a'; X.lineWidth = s * .08; X.beginPath(); X.arc(0, 0, s * .55, -1.25, 1.25); X.stroke(); X.strokeStyle = '#e7e5e4'; X.lineWidth = 1; const px = Math.cos(1.25) * s * .55, py = Math.sin(1.25) * s * .55, tx = at ? -s * .25 : px; X.beginPath(); X.moveTo(px, -py); X.lineTo(tx, 0); X.lineTo(px, py); X.stroke(); if (at) { X.strokeStyle = '#78350f'; X.lineWidth = s * .04; X.beginPath(); X.moveTo(tx, 0); X.lineTo(s * .7, 0); X.stroke(); } }
    if (tipo === 'baculo' || tipo === 'baculo_cura' || tipo === 'grimorio') { X.strokeStyle = '#4a2c12'; X.lineWidth = s * .07; X.beginPath(); X.moveTo(0, s * .45); X.lineTo(0, -s * .85); X.stroke(); const col = tipo === 'baculo_cura' ? '#86efac' : est.aura; X.fillStyle = metal(X, 0, -s * .9, s * .15, est.metal); X.beginPath(); X.arc(0, -s * .92, s * .1, 0, 7); X.fill(); brillo(X, 0, -s * .95, s * (at ? .55 : .32), col, at ? 1 : .7); X.fillStyle = col; X.beginPath(); X.arc(0, -s * .95, s * .1, 0, 7); X.fill(); }
    if (tipo === 'dagas') { for (const q of [-1, 1]) { X.save(); X.translate(q * s * .1, 0); X.rotate(at ? q * -1.2 : q * .35); X.beginPath(); X.moveTo(-s * .05, 0); X.lineTo(0, -s * .55); X.lineTo(s * .05, 0); X.fillStyle = metal(X, 0, -s * .3, s * .3, est.metal === 'oscuro' ? 'oscuro' : 'plata'); X.fill(); cont(X, s * .02); X.restore(); } }
    X.restore();
  }
  function cabeza(X, x, y, s, est, g, mundo) {
    const r = s * .32, F = g === 'F';
    if (F && est.casco !== 'capucha') { X.beginPath(); X.ellipse(x, y + r * .4, r * 1.15, r * 1.25, 0, 0, 7); X.fillStyle = lin(X, x, y - r, x, y + r * 1.6, [est.pelo, est.pelo, 'rgba(0,0,0,.6)']); X.fill(); }
    X.beginPath(); X.arc(x, y, r, 0, 7); X.fillStyle = rad(X, x, y, r, est.piel, '#5b3a24'); X.fill(); cont(X, s * .045);
    if (est.orejas) for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * r * .85, y); X.lineTo(x + q * r * 1.55, y - r * .55); X.lineTo(x + q * r * .9, y + r * .3); X.fillStyle = est.piel; X.fill(); cont(X, s * .03); }
    if (est.brillaOjos) ojosF(X, x, y + r * .05, r * .38, r * .14, est.ojos); else ojosH(X, x, y + r * .08, r * .38, r * .16);
    if (!F && (mundo === 'hielo' || mundo === 'dragon' || mundo === 'arenas')) { X.beginPath(); X.moveTo(x - r * .7, y + r * .35); X.quadraticCurveTo(x, y + r * 1.5, x + r * .7, y + r * .35); X.quadraticCurveTo(x, y + r * .75, x - r * .7, y + r * .35); X.fillStyle = est.pelo === '#111' ? '#333' : est.pelo; X.fill(); }
    // casco o tocado
    X.save();
    if (est.casco === 'yelmo' || est.casco === 'piel') { X.beginPath(); X.arc(x, y - r * .05, r * 1.06, Math.PI * 1.05, Math.PI * 1.95); X.lineTo(x + r * .95, y - r * .05); X.lineTo(x - r * .95, y - r * .05); X.closePath(); X.fillStyle = metal(X, x, y - r * .6, r, est.metal); X.fill(); cont(X, s * .04);
      if (est.casco === 'piel') { X.beginPath(); X.ellipse(x, y - r * .05, r * 1.1, r * .22, 0, 0, 7); X.fillStyle = '#f1f5f9'; X.fill(); cont(X, s * .025); }
      else { X.beginPath(); X.moveTo(x, y - r * 1.05); X.quadraticCurveTo(x + r * .9, y - r * 1.9, x + r * 1.3, y - r * 1.1); X.quadraticCurveTo(x + r * .6, y - r * 1.25, x, y - r * .95); X.fillStyle = '#dc2626'; X.fill(); } }
    if (est.casco === 'capucha') { X.beginPath(); X.moveTo(x - r * 1.2, y + r * .6); X.quadraticCurveTo(x - r * 1.3, y - r * 1.4, x, y - r * 1.5); X.quadraticCurveTo(x + r * 1.3, y - r * 1.4, x + r * 1.2, y + r * .6); X.quadraticCurveTo(x + r * .9, y - r * .5, x, y - r * .7); X.quadraticCurveTo(x - r * .9, y - r * .5, x - r * 1.2, y + r * .6); X.fillStyle = lin(X, x, y - r * 1.5, x, y + r, [est.tela, '#052e16']); X.fill(); cont(X, s * .04); }
    if (est.casco === 'turbante') { X.beginPath(); X.ellipse(x, y - r * .6, r * 1.05, r * .62, 0, Math.PI, 0); X.lineTo(x + r * 1.05, y - r * .45); X.lineTo(x - r * 1.05, y - r * .45); X.closePath(); X.fillStyle = lin(X, x, y - r * 1.2, x, y - r * .4, ['#fff7ed', est.tela, '#b45309']); X.fill(); cont(X, s * .035); X.fillStyle = '#dc2626'; X.beginPath(); X.arc(x, y - r * .75, r * .16, 0, 7); X.fill(); }
    if (est.casco === 'tiara') { if (!F) { X.beginPath(); X.arc(x, y - r * .15, r * 1.02, Math.PI * 1.1, Math.PI * 1.9); X.lineWidth = r * .35; X.strokeStyle = est.pelo; X.stroke(); } X.beginPath(); X.ellipse(x, y - r * .8, r * .7, r * .18, 0, 0, 7); X.strokeStyle = '#fde047'; X.lineWidth = r * .15; X.stroke(); brillo(X, x, y - r * 1.15, r * .9, '#fef9c3', .5); }
    if (est.casco === 'cuernos') { X.beginPath(); X.arc(x, y - r * .05, r * 1.06, Math.PI * 1.05, Math.PI * 1.95); X.lineTo(x + r * .95, y - r * .05); X.lineTo(x - r * .95, y - r * .05); X.closePath(); X.fillStyle = metal(X, x, y - r * .6, r, est.metal); X.fill(); cont(X, s * .04);
      for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * r * .75, y - r * .55); X.quadraticCurveTo(x + q * r * 1.7, y - r * .9, x + q * r * 1.45, y - r * 2); X.quadraticCurveTo(x + q * r * 1.3, y - r * 1.1, x + q * r * .45, y - r * .85); X.closePath(); X.fillStyle = lin(X, x, y - r * 2, x, y - r * .5, ['#fafaf9', '#78716c', '#292524']); X.fill(); cont(X, s * .03); } }
    X.restore();
  }
  function humanoide(X, x, y, s, T, est, o, at, t) {
    const b = Math.sin(t * 6) * s * .03;
    if (o.alas || est.alitas) for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .2, y - s * .35); X.quadraticCurveTo(x + q * s * 1.2, y - s * (1.1 + Math.sin(t * 5) * .1), x + q * s * 1.05, y + s * .1); X.quadraticCurveTo(x + q * s * .7, y - s * .1, x + q * s * .25, y + s * .05); X.fillStyle = lin(X, x, y - s, x + q * s, y, ['#ffffff', '#e0f2fe', '#93c5fd']); X.fill(); cont(X, s * .035); for (let i = 1; i < 4; i++) { X.strokeStyle = 'rgba(100,140,200,.5)'; X.lineWidth = 1; X.beginPath(); X.moveTo(x + q * s * .25, y - s * .1); X.lineTo(x + q * s * (.4 + i * .22), y - s * (.6 + i * .08)); X.stroke(); } }
    if (!o.sinCapa) capa(X, x, y + b, s, T);
    const ancho = o.F ? .42 : .5, gord = o.grueso || 1;
    X.beginPath(); X.ellipse(x, y + s * .1 + b, s * ancho * gord, s * .55, 0, 0, 7); X.fillStyle = o.tunica ? lin(X, x, y - s * .3, x, y + s * .7, [est.tela, est.tela, '#1f2937']) : metal(X, x, y + b, s * .55, est.metal); X.fill(); cont(X, s * .055);
    X.fillStyle = T.c; X.beginPath(); X.moveTo(x - s * .12, y - s * .1 + b); X.lineTo(x + s * .12, y - s * .1 + b); X.lineTo(x, y + s * .25 + b); X.closePath(); X.fill();
    X.fillStyle = metal(X, x, y + s * .3, s * .3, est.metal); X.fillRect(x - s * .42 * gord, y + s * .28 + b, s * .84 * gord, s * .09);
    for (const q of [-1, 1]) { X.beginPath(); X.ellipse(x + q * s * .42 * gord, y - s * .25 + b, s * .2, s * .15, q * .4, 0, 7); X.fillStyle = metal(X, x + q * s * .4, y - s * .25, s * .2, est.metal); X.fill(); cont(X, s * .035); }
    if (o.vendas) { X.strokeStyle = 'rgba(245,235,210,.95)'; X.lineWidth = s * .07; for (let i = 0; i < 5; i++) { X.beginPath(); X.moveTo(x - s * .45, y - s * .2 + i * s * .15 + b); X.lineTo(x + s * .45, y - s * .1 + i * s * .15 + b); X.stroke(); } }
    if (o.escudo) { const ex = x - s * .6, ey = y + s * .12 + b, r = s * .33; X.beginPath(); X.moveTo(ex - r * .8, ey - r); X.lineTo(ex + r * .8, ey - r); X.quadraticCurveTo(ex + r * .85, ey + r * .4, ex, ey + r * 1.15); X.quadraticCurveTo(ex - r * .85, ey + r * .4, ex - r * .8, ey - r); X.closePath(); X.fillStyle = metal(X, ex, ey, r, est.metal); X.fill(); cont(X, r * .14);
      X.beginPath(); X.moveTo(ex - r * .58, ey - r * .78); X.lineTo(ex + r * .58, ey - r * .78); X.quadraticCurveTo(ex + r * .6, ey + r * .3, ex, ey + r * .88); X.quadraticCurveTo(ex - r * .6, ey + r * .3, ex - r * .58, ey - r * .78); X.fillStyle = lin(X, ex, ey - r, ex, ey + r, [T.luz, T.c, T.c2]); X.fill(); X.fillStyle = metal(X, ex, ey, r * .3, 'oro'); X.beginPath(); X.moveTo(ex, ey - r * .45); X.lineTo(ex + r * .25, ey); X.lineTo(ex, ey + r * .45); X.lineTo(ex - r * .25, ey); X.fill(); }
    cabeza(X, x, y - s * .55 + b, s, est, o.F ? 'F' : 'M', o.mundo);
    if (o.arma) arma(X, o.arma, x + s * .55, y + s * .05 + b, s, at, est);
    if (o.aura) brillo(X, x, y, s * 1.1, o.aura, .25);
  }
  // ---- Bestias ----
  function bestia(X, x, y, s, T, tipo, mundo, at, t) {
    const b = Math.sin(t * 9) * s * .04, C = { lobo: ['#9ca3af', '#374151'], leon: ['#f59e0b', '#78350f'], oso: ['#8a5a2e', '#24150a'], pantera: ['#1f2937', '#030712'], escorpion: ['#b45309', '#3f1d06'], salamandra: ['#f97316', '#7c2d12'], ciervo: ['#d6a36a', '#5b3a1a'], camello: ['#e0b77a', '#7c5a2a'], caballo: ['#f5f5f4', '#78716c'], mamut: ['#7c5a3a', '#2b1a0c'] }[tipo] || ['#a8a29e', '#44403c'];
    if (mundo === 'hielo' && tipo === 'lobo') C[0] = '#e0f2fe';
    if (tipo === 'escorpion') { X.strokeStyle = C[1]; X.lineWidth = s * .12; X.beginPath(); X.moveTo(x, y + s * .4); X.quadraticCurveTo(x + s * .1, y + s * 1.1, x + s * .1, y + s * .2 - (at ? s * .6 : s * .2)); X.stroke(); X.fillStyle = '#84cc16'; X.beginPath(); X.arc(x + s * .1, y + s * .15 - (at ? s * .6 : s * .2), s * .1, 0, 7); X.fill();
      for (const q of [-1, 1]) { for (let i = 0; i < 3; i++) { X.strokeStyle = C[1]; X.lineWidth = s * .06; X.beginPath(); X.moveTo(x + q * s * .3, y + i * s * .15); X.lineTo(x + q * s * .75, y + i * s * .2 + Math.sin(t * 10 + i) * s * .05); X.stroke(); } X.beginPath(); X.ellipse(x + q * s * .55, y - s * .55, s * .2, s * .13, q * .5, 0, 7); X.fillStyle = rad(X, x, y, s * .2, C[0], C[1]); X.fill(); cont(X, s * .04); } }
    else if (tipo !== 'salamandra') for (const [q, w] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { X.beginPath(); X.ellipse(x + q * s * .38, y + w * s * .35 + Math.sin(t * 12 + q * w) * s * .06, s * .13, s * .18, 0, 0, 7); X.fillStyle = C[1]; X.fill(); cont(X, s * .03); }
    X.beginPath(); X.ellipse(x, y + s * .1 + b, s * (tipo === 'mamut' ? .62 : .45), s * .58, 0, 0, 7); X.fillStyle = rad(X, x, y, s * .58, C[0], C[1]); X.fill(); cont(X, s * .05);
    if (tipo === 'salamandra') { for (let i = 0; i < 5; i++) { X.fillStyle = '#fde047'; X.beginPath(); X.arc(x + Math.sin(i) * s * .2, y - s * .2 + i * s * .14 + b, s * .05, 0, 7); X.fill(); } X.strokeStyle = C[0]; X.lineWidth = s * .14; X.beginPath(); X.moveTo(x, y + s * .6); X.quadraticCurveTo(x + Math.sin(t * 6) * s * .5, y + s * 1, x, y + s * 1.2); X.stroke(); }
    if (mundo !== 'bosque' && ['lobo', 'oso', 'leon'].includes(tipo)) { X.beginPath(); X.ellipse(x, y + s * .05 + b, s * .36, s * .14, 0, 0, 7); X.fillStyle = metal(X, x, y, s * .4, ESTILO[mundo]?.metal || 'plata'); X.fill(); cont(X, s * .03); X.fillStyle = T.c; X.fillRect(x - s * .3, y + s * .12 + b, s * .6, s * .07); }
    else { X.fillStyle = T.c; X.beginPath(); X.ellipse(x, y + s * .2 + b, s * .3, s * .08, 0, 0, 7); X.fill(); }
    const hy = y - s * .45 + b;
    if (tipo === 'leon') { for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; X.beginPath(); X.ellipse(x + Math.cos(a) * s * .32, hy + Math.sin(a) * s * .3, s * .14, s * .09, a, 0, 7); X.fillStyle = '#92400e'; X.fill(); } }
    if (tipo === 'mamut') { for (const q of [-1, 1]) { X.beginPath(); X.ellipse(x + q * s * .42, hy, s * .25, s * .3, 0, 0, 7); X.fillStyle = C[1]; X.fill(); cont(X, s * .03); } }
    if (['lobo', 'pantera', 'leon', 'oso', 'ciervo', 'camello', 'caballo'].includes(tipo)) for (const q of [-1, 1]) { X.beginPath(); if (tipo === 'oso') X.arc(x + q * s * .22, hy - s * .25, s * .09, 0, 7); else { X.moveTo(x + q * s * .1, hy - s * .2); X.lineTo(x + q * s * .26, hy - s * .5); X.lineTo(x + q * s * .3, hy - s * .1); } X.fillStyle = C[1]; X.fill(); cont(X, s * .03); }
    if (tipo === 'ciervo') for (const q of [-1, 1]) { X.strokeStyle = '#fef3c7'; X.lineWidth = s * .05; X.beginPath(); X.moveTo(x + q * s * .12, hy - s * .25); X.lineTo(x + q * s * .4, hy - s * .75); X.moveTo(x + q * s * .28, hy - s * .5); X.lineTo(x + q * s * .5, hy - s * .55); X.moveTo(x + q * s * .34, hy - s * .62); X.lineTo(x + q * s * .2, hy - s * .85); X.stroke(); brillo(X, x + q * s * .35, hy - s * .7, s * .2, '#a7f3d0', .5); }
    X.beginPath(); X.ellipse(x, hy, s * .3, s * .28, 0, 0, 7); X.fillStyle = rad(X, x, hy, s * .3, C[0], C[1]); X.fill(); cont(X, s * .045);
    if (tipo !== 'escorpion' && tipo !== 'salamandra') { X.fillStyle = 'rgba(255,240,220,.6)'; X.beginPath(); X.ellipse(x, hy + s * .12, s * .14, s * .1, 0, 0, 7); X.fill(); X.fillStyle = '#111'; X.beginPath(); X.ellipse(x, hy + s * .08, s * .05, s * .035, 0, 0, 7); X.fill(); }
    if (tipo === 'mamut') { X.strokeStyle = '#fafaf9'; X.lineWidth = s * .07; for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .12, hy + s * .15); X.quadraticCurveTo(x + q * s * .45, hy + s * .4, x + q * s * .35, hy - s * .05); X.stroke(); } }
    ojosF(X, x, hy - s * .04, s * .12, s * .045, tipo === 'lobo' && mundo === 'hielo' ? '#67e8f9' : tipo === 'pantera' ? '#4ade80' : '#fbbf24');
    if (at) brillo(X, x, hy + s * .3, s * .35, '#ffffff', .5);
  }
  // ---- Colosos (gigantes, gólems, titanes) ----
  function coloso(X, x, y, s, T, mat, at, t) {
    const M = { piedra: ['#a8a29e', '#44403c', '#fbbf24'], bronce: ['#e8a35a', '#5b2f0f', '#fde047'], ent: ['#8a5a2e', '#2b1a0c', '#86efac'], nube: ['#f8fafc', '#94a3b8', '#7dd3fc'], hielo: ['#e0f2fe', '#0e7490', '#67e8f9'], magma: ['#57534e', '#1c1917', '#f97316'], abominacion: ['#6d5b8a', '#1e1b4b', '#a3e635'], demonio: ['#b91c1c', '#3f0a0a', '#fb923c'], yeti: ['#f1f5f9', '#94a3b8', '#38bdf8'], esfinge: ['#e7c27d', '#7c5a2a', '#fde047'], leviatan: ['#38bdf8', '#0c4a6e', '#f0f9ff'] }[mat] || ['#a8a29e', '#44403c', '#fbbf24'];
    const b = Math.sin(t * 3.5) * s * .03;
    for (const q of [-1, 1]) { X.beginPath(); X.ellipse(x + q * s * .32, y + s * .7, s * .2, s * .25, 0, 0, 7); X.fillStyle = rad(X, x, y, s * .3, M[0], M[1]); X.fill(); cont(X, s * .04); }
    X.beginPath(); X.moveTo(x - s * .7, y - s * .3 + b); X.quadraticCurveTo(x - s * .8, y + s * .55, x - s * .35, y + s * .62); X.lineTo(x + s * .35, y + s * .62); X.quadraticCurveTo(x + s * .8, y + s * .55, x + s * .7, y - s * .3 + b); X.quadraticCurveTo(x, y - s * .7 + b, x - s * .7, y - s * .3 + b); X.fillStyle = rad(X, x, y, s * .8, M[0], M[1]); X.fill(); cont(X, s * .06);
    if (mat === 'ent') { X.strokeStyle = 'rgba(30,15,5,.55)'; X.lineWidth = s * .04; for (let i = -2; i <= 2; i++) { X.beginPath(); X.moveTo(x + i * s * .15, y - s * .4); X.quadraticCurveTo(x + i * s * .2, y, x + i * s * .12, y + s * .6); X.stroke(); } for (let i = 0; i < 6; i++) { X.fillStyle = ['#15803d', '#22c55e', '#166534'][i % 3]; X.beginPath(); X.arc(x + Math.cos(i) * s * .55, y - s * .55 + Math.sin(i * 2) * s * .15 + b, s * .22, 0, 7); X.fill(); } }
    else if (mat === 'yeti' || mat === 'nube') { for (let i = 0; i < 9; i++) { X.fillStyle = M[0]; X.beginPath(); X.arc(x + Math.cos(i * .7) * s * .55, y - s * .1 + Math.sin(i * 1.3) * s * .35 + b, s * .2, 0, 7); X.fill(); } }
    else { X.strokeStyle = M[2]; X.lineWidth = s * .04; X.save(); X.shadowColor = M[2]; X.shadowBlur = s * .3; X.beginPath(); X.moveTo(x - s * .3, y - s * .25 + b); X.lineTo(x - s * .1, y + s * .05); X.lineTo(x - s * .25, y + s * .35); X.moveTo(x + s * .35, y - s * .2 + b); X.lineTo(x + s * .15, y + s * .1); X.lineTo(x + s * .3, y + s * .4); X.stroke(); X.restore(); }
    X.fillStyle = T.c; X.beginPath(); X.moveTo(x - s * .18, y - s * .05 + b); X.lineTo(x + s * .18, y - s * .05 + b); X.lineTo(x, y + s * .28 + b); X.fill(); cont(X, s * .02);
    const ab = at ? -s * .35 : 0;
    for (const q of [-1, 1]) { X.beginPath(); X.ellipse(x + q * s * .78, y + s * .05 + (q > 0 ? ab : 0) + b, s * .24, s * .38, q * .2, 0, 7); X.fillStyle = rad(X, x, y, s * .4, M[0], M[1]); X.fill(); cont(X, s * .05); }
    const hy = y - s * .55 + b;
    X.beginPath(); X.ellipse(x, hy, s * .3, s * .26, 0, 0, 7); X.fillStyle = rad(X, x, hy, s * .3, M[0], M[1]); X.fill(); cont(X, s * .05);
    if (mat === 'esfinge') { X.beginPath(); X.moveTo(x - s * .45, hy + s * .2); X.lineTo(x - s * .32, hy - s * .35); X.lineTo(x + s * .32, hy - s * .35); X.lineTo(x + s * .45, hy + s * .2); X.lineTo(x + s * .25, hy - s * .1); X.lineTo(x - s * .25, hy - s * .1); X.closePath(); X.fillStyle = lin(X, x, hy - s * .4, x, hy + s * .2, ['#fde047', '#1d4ed8', '#fde047']); X.fill(); cont(X, s * .03); }
    if (mat === 'demonio' || mat === 'abominacion') for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .18, hy - s * .18); X.quadraticCurveTo(x + q * s * .55, hy - s * .4, x + q * s * .4, hy - s * .7); X.lineTo(x + q * s * .1, hy - s * .25); X.fillStyle = '#e7e5e4'; X.fill(); cont(X, s * .03); }
    ojosF(X, x, hy, s * .11, s * .05, M[2]);
    X.fillStyle = 'rgba(0,0,0,.6)'; X.fillRect(x - s * .1, hy + s * .1, s * .2, s * .04);
  }
  // ---- Voladores ----
  function alado(X, x, y, s, T, tipo, mundo, at, t) {
    const al = Math.sin(t * (tipo === 'dragoncito' ? 14 : 7)) * s * .3, C = { dragon: mundo === 'cielo' ? ['#7dd3fc', '#0c4a6e'] : mundo === 'dragon' ? ['#ef4444', '#450a0a'] : ['#4ade80', '#052e16'], grifo: ['#f5d08a', '#7c5a2a'], buho: ['#a8a29e', '#3f3a35'], gargola: ['#78716c', '#1c1917'], fenix: ['#fb923c', '#7c2d12'], pegaso: ['#f8fafc', '#94a3b8'], djinn: ['#38bdf8', '#1e3a8a'], dragoncito: ['#f97316', '#7c2d12'] }[tipo] || ['#a8a29e', '#292524'];
    const pluma = ['grifo', 'buho', 'fenix', 'pegaso'].includes(tipo);
    if (tipo === 'djinn') { X.beginPath(); X.moveTo(x - s * .3, y); X.quadraticCurveTo(x - s * .1, y + s * .8, x + s * .25 * Math.sin(t * 3), y + s * 1.1); X.quadraticCurveTo(x + s * .2, y + s * .6, x + s * .3, y); X.fillStyle = lin(X, x, y, x, y + s, [C[0], 'rgba(56,189,248,0)']); X.fill(); }
    else for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .25, y - s * .1); X.lineTo(x + q * s * 1.3, y - s * .55 - al); X.lineTo(x + q * s * 1.2, y + s * .05 - al * .3); X.lineTo(x + q * s * 1.0, y - s * .05); X.lineTo(x + q * s * .9, y + s * .3); X.lineTo(x + q * s * .6, y + s * .15); X.lineTo(x + q * s * .3, y + s * .3); X.closePath();
      X.fillStyle = tipo === 'fenix' ? lin(X, x, y - s * .5, x + q * s, y + s * .3, ['#fef08a', '#f97316', '#b91c1c']) : pluma ? lin(X, x, y - s * .5, x + q * s, y + s * .3, [C[0], C[1]]) : lin(X, x, y - s * .5, x + q * s, y + s * .3, [T.luz, T.c, T.c2]); X.fill(); cont(X, s * .04);
      X.strokeStyle = 'rgba(0,0,0,.35)'; X.lineWidth = s * .025; for (const k of [1.2, 1.0, .6]) { X.beginPath(); X.moveTo(x + q * s * .3, y - s * .05); X.lineTo(x + q * s * k, y + s * .1 - al * .3); X.stroke(); } }
    if (tipo === 'fenix') brillo(X, x, y, s * 1.2, '#fb923c', .5);
    X.beginPath(); X.ellipse(x, y, s * .38, s * .52, 0, 0, 7); X.fillStyle = rad(X, x, y, s * .52, C[0], C[1]); X.fill(); cont(X, s * .05);
    X.fillStyle = T.c; X.beginPath(); X.ellipse(x, y + s * .1, s * .25, s * .07, 0, 0, 7); X.fill();
    const hy = y - s * .5; X.beginPath(); X.ellipse(x, hy, s * .26, s * .26, 0, 0, 7); X.fillStyle = rad(X, x, hy, s * .26, C[0], C[1]); X.fill(); cont(X, s * .04);
    if (tipo === 'dragon' || tipo === 'dragoncito' || tipo === 'gargola') for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .1, hy - s * .18); X.lineTo(x + q * s * .3, hy - s * .5); X.lineTo(x + q * s * .2, hy - s * .1); X.fillStyle = '#e7e5e4'; X.fill(); }
    if (pluma && tipo !== 'pegaso') { X.fillStyle = '#facc15'; X.beginPath(); X.moveTo(x - s * .06, hy + s * .06); X.lineTo(x + s * .06, hy + s * .06); X.lineTo(x, hy + s * .2); X.fill(); }
    if (tipo === 'pegaso') { X.strokeStyle = '#e0f2fe'; X.lineWidth = s * .05; X.beginPath(); X.moveTo(x, hy - s * .25); X.lineTo(x, hy - s * .5); X.stroke(); brillo(X, x, hy - s * .5, s * .2, '#bae6fd', .7); }
    ojosF(X, x, hy, s * .1, s * .045, tipo === 'gargola' ? '#ef4444' : tipo === 'djinn' ? '#fef08a' : '#fde047');
    if (at && (tipo === 'dragon' || tipo === 'dragoncito' || tipo === 'fenix')) brillo(X, x, hy - s * .35, s * .45, '#fb923c', 1);
  }
  // ---- Pequeños (enjambres) ----
  function pequeno(X, x, y, s, T, tipo, at, t) {
    const b = Math.sin(t * 12) * s * .06;
    if (tipo === 'hada' || tipo === 'espiritu') { const al = Math.abs(Math.sin(t * 30)) * s * .4; X.fillStyle = 'rgba(255,255,255,.6)'; X.beginPath(); X.ellipse(x - s * .5, y - s * .2, s * .4, al + s * .1, -.6, 0, 7); X.ellipse(x + s * .5, y - s * .2, s * .4, al + s * .1, .6, 0, 7); X.fill(); brillo(X, x, y, s * 1.1, tipo === 'hada' ? '#fde047' : '#bae6fd', .8); X.beginPath(); X.arc(x, y + b, s * .45, 0, 7); X.fillStyle = rad(X, x, y, s * .45, '#fff', tipo === 'hada' ? '#facc15' : '#38bdf8'); X.fill(); cont(X, s * .06); ojosF(X, x, y + b, s * .15, s * .07, T.c); return; }
    if (tipo === 'murcielago') { const al = Math.sin(t * 25) * s * .4; for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x, y); X.lineTo(x + q * s * 1.1, y - s * .3 - al); X.lineTo(x + q * s * .8, y + s * .2); X.lineTo(x + q * s * .5, y); X.closePath(); X.fillStyle = '#1e1b2e'; X.fill(); cont(X, s * .05); } X.beginPath(); X.arc(x, y, s * .4, 0, 7); X.fillStyle = rad(X, x, y, s * .4, '#4c1d95', '#0f0a1e'); X.fill(); cont(X, s * .06); ojosF(X, x, y, s * .14, s * .07, '#ef4444'); X.fillStyle = T.c; X.fillRect(x - s * .3, y + s * .25, s * .6, s * .1); return; }
    if (tipo === 'dragoncito') return alado(X, x, y, s * .9, T, 'dragoncito', 'dragon', at, t);
    const col = { duende: ['#4ade80', '#14532d'], hongo: ['#ef4444', '#7f1d1d'], esqueleto: ['#f5f5f4', '#78716c'], escarabajo: ['#fde047', '#713f12'], pinguino: ['#1f2937', '#030712'], momia: ['#f5ead2', '#a8957a'] }[tipo] || ['#a8a29e', '#292524'];
    X.beginPath(); X.ellipse(x, y + s * .2 + b, s * .42, s * .5, 0, 0, 7); X.fillStyle = rad(X, x, y, s * .5, col[0], col[1]); X.fill(); cont(X, s * .07);
    if (tipo === 'pinguino') { X.beginPath(); X.ellipse(x, y + s * .3 + b, s * .28, s * .35, 0, 0, 7); X.fillStyle = '#f8fafc'; X.fill(); X.fillStyle = '#ef4444'; X.beginPath(); X.arc(x + s * .25, y + s * .3, s * .14, 0, 7); X.fill(); X.strokeStyle = '#facc15'; X.lineWidth = 2; X.beginPath(); X.moveTo(x + s * .3, y + s * .17); X.lineTo(x + s * .38, y + s * .05); X.stroke(); }
    if (tipo === 'hongo') { X.beginPath(); X.ellipse(x, y - s * .25 + b, s * .65, s * .42, 0, Math.PI, 0); X.fillStyle = rad(X, x, y - s * .4, s * .6, '#fca5a5', '#991b1b'); X.fill(); cont(X, s * .06); X.fillStyle = '#fff'; for (const [dx, dy] of [[-.3, -.4], [.15, -.5], [.35, -.32]]) { X.beginPath(); X.arc(x + dx * s, y + dy * s + b, s * .08, 0, 7); X.fill(); } }
    else { X.beginPath(); X.arc(x, y - s * .3 + b, s * .32, 0, 7); X.fillStyle = rad(X, x, y - s * .3, s * .32, col[0], col[1]); X.fill(); cont(X, s * .06); }
    if (tipo === 'duende') for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .25, y - s * .35 + b); X.lineTo(x + q * s * .6, y - s * .55 + b); X.lineTo(x + q * s * .3, y - s * .2 + b); X.fillStyle = col[0]; X.fill(); cont(X, s * .04); }
    if (tipo === 'escarabajo') { X.strokeStyle = 'rgba(0,0,0,.5)'; X.lineWidth = s * .05; X.beginPath(); X.moveTo(x, y - s * .2); X.lineTo(x, y + s * .7); X.stroke(); brillo(X, x - s * .15, y, s * .3, '#fff', .4); }
    if (tipo === 'momia') { X.strokeStyle = 'rgba(120,100,70,.7)'; X.lineWidth = s * .05; for (let i = 0; i < 5; i++) { X.beginPath(); X.moveTo(x - s * .4, y - s * .4 + i * s * .2 + b); X.lineTo(x + s * .4, y - s * .3 + i * s * .2 + b); X.stroke(); } }
    ojosF(X, x, y - s * .3 + b, s * .13, s * .065, tipo === 'esqueleto' || tipo === 'momia' ? '#a3e635' : tipo === 'duende' ? '#fde047' : '#ef4444');
    X.fillStyle = T.c; X.beginPath(); X.arc(x, y + s * .3 + b, s * .12, 0, 7); X.fill();
    if (tipo === 'esqueleto' || tipo === 'duende') { X.save(); X.translate(x + s * .45, y + s * .1 + b); X.rotate(at ? -1 : .3); X.fillStyle = '#d6d3d1'; X.fillRect(-s * .04, -s * .55, s * .08, s * .55); X.restore(); }
  }
  function espectro(X, x, y, s, T, col, at, t) {
    X.save(); X.globalAlpha = .88; X.beginPath(); X.moveTo(x - s * .5, y - s * .2); X.quadraticCurveTo(x - s * .55, y - s * 1, x, y - s * 1); X.quadraticCurveTo(x + s * .55, y - s * 1, x + s * .5, y - s * .2); for (let i = 0; i <= 6; i++) X.lineTo(x + s * .5 - i * s / 6, y + s * .7 + Math.sin(t * 6 + i) * s * .12 * (i % 2 ? 1 : -1)); X.closePath();
    X.fillStyle = lin(X, x, y - s, x, y + s * .8, [col[0], col[1], 'rgba(0,0,0,0)']); X.fill(); X.restore(); X.strokeStyle = T.c; X.lineWidth = s * .06; X.beginPath(); X.moveTo(x - s * .45, y + s * .1); X.quadraticCurveTo(x, y + s * .3, x + s * .45, y + s * .1); X.stroke();
    ojosF(X, x, y - s * .5, s * .15, s * .08, col[2]); X.fillStyle = 'rgba(0,0,0,.7)'; X.beginPath(); X.ellipse(x, y - s * .25, s * .1, at ? s * .12 : s * .05, 0, 0, 7); X.fill();
    for (const q of [-1, 1]) { X.beginPath(); X.moveTo(x + q * s * .45, y - s * .3); X.quadraticCurveTo(x + q * s * .9, y - s * (at ? .7 : .1), x + q * s * .8, y + s * .1); X.strokeStyle = col[0]; X.lineWidth = s * .12; X.stroke(); }
  }
  // ---- Estructuras ----
  function estructura(X, x, y, s, T, card, at, t) {
    const est = ESTILO[card.mundo] || ESTILO.alba, a = card.arq, asp = card.aspecto;
    X.fillStyle = 'rgba(0,0,0,.35)'; X.beginPath(); X.ellipse(x + s * .1, y + s * .7, s * 1.05, s * .32, 0, 0, 7); X.fill();
    if (a === 'muro') { X.beginPath(); X.roundRect(x - s * 1.05, y - s * .45, s * 2.1, s * 1.1, s * .1); X.fillStyle = card.mundo === 'hielo' ? lin(X, x, y - s * .5, x, y + s * .6, ['#f0fdff', '#67e8f9', '#0e7490']) : lin(X, x, y - s * .5, x, y + s * .6, ['#d6d3d1', '#78716c']); X.fill(); cont(X, s * .06); X.strokeStyle = 'rgba(0,0,0,.3)'; X.lineWidth = 1.5; for (let i = 1; i < 3; i++) { X.beginPath(); X.moveTo(x - s * 1.05, y - s * .45 + i * s * .37); X.lineTo(x + s * 1.05, y - s * .45 + i * s * .37); X.stroke(); } X.fillStyle = T.c; X.fillRect(x - s * .2, y - s * .4, s * .4, s * .25); return; }
    if (a === 'generador') { const tc = { bosque: ['#8a5a2e', '#166534'], sombras: ['#3f3a55', '#1e1b4b'], dragon: ['#57534e', '#7f1d1d'] }[card.mundo] || ['#a8a29e', '#78350f'];
      X.beginPath(); X.roundRect(x - s * .8, y - s * .3, s * 1.6, s * .95, s * .1); X.fillStyle = lin(X, x - s, 0, x + s, 0, [tc[0], '#d6d3d1', tc[0]]); X.fill(); cont(X, s * .05); X.beginPath(); X.moveTo(x - s * 1, y - s * .25); X.lineTo(x, y - s * 1.05); X.lineTo(x + s * 1, y - s * .25); X.closePath(); X.fillStyle = lin(X, x, y - s, x, y, [tc[1], '#111']); X.fill(); cont(X, s * .05);
      X.fillStyle = '#111'; X.beginPath(); X.roundRect(x - s * .22, y + s * .05, s * .44, s * .6, [s * .2, s * .2, 0, 0]); X.fill(); brillo(X, x, y + s * .35, s * .45, est.aura, at ? 1 : .55); X.fillStyle = T.c; X.fillRect(x - s * .55, y - s * .55, s * .25, s * .2); return; }
    if (a === 'mortero' || a === 'canon') { X.beginPath(); X.ellipse(x, y + s * .3, s * .85, s * .45, 0, 0, 7); X.fillStyle = lin(X, x, y, x, y + s * .7, ['#a8a29e', '#44403c']); X.fill(); cont(X, s * .05);
      X.save(); X.translate(x, y + s * .05); X.rotate(a === 'mortero' ? 0 : (at ? -.15 : 0)); X.beginPath(); X.roundRect(-s * .28, -s * (a === 'mortero' ? .55 : .85), s * .56, s * (a === 'mortero' ? .75 : 1), s * .12); X.fillStyle = lin(X, -s * .3, 0, s * .3, 0, a === 'mortero' ? ['#292524', '#78716c', '#1c1917'] : metalC[est.metal]); X.fill(); cont(X, s * .05); X.fillStyle = '#0c0a09'; X.beginPath(); X.ellipse(0, -s * (a === 'mortero' ? .55 : .85), s * .22, s * .1, 0, 0, 7); X.fill(); if (at) brillo(X, 0, -s * .9, s * .5, '#fde68a', 1); X.restore(); X.fillStyle = T.c; X.fillRect(x - s * .5, y + s * .4, s, s * .1); return; }
    // torres y obeliscos
    if (asp === 'obelisco') { X.beginPath(); X.moveTo(x - s * .45, y + s * .6); X.lineTo(x - s * .28, y - s * 1.1); X.lineTo(x, y - s * 1.45); X.lineTo(x + s * .28, y - s * 1.1); X.lineTo(x + s * .45, y + s * .6); X.closePath(); X.fillStyle = lin(X, x - s * .5, 0, x + s * .5, 0, ['#b45309', '#fde68a', '#92400e']); X.fill(); cont(X, s * .05); brillo(X, x, y - s * 1.2, s * .5, '#fde047', at ? 1 : .6); X.fillStyle = T.c; X.fillRect(x - s * .2, y - s * .3, s * .4, s * .3); return; }
    if (asp === 'arbol') { X.fillStyle = lin(X, x - s * .3, 0, x + s * .3, 0, ['#5b3a1a', '#8a5a2e', '#3f2410']); X.fillRect(x - s * .22, y - s * .5, s * .44, s * 1.15); for (const [dx, dy, r, c] of [[0, -1, .7, '#166534'], [-.45, -.75, .45, '#15803d'], [.45, -.75, .45, '#22c55e'], [0, -1.35, .4, '#4ade80']]) { X.beginPath(); X.arc(x + dx * s, y + dy * s, r * s, 0, 7); X.fillStyle = rad(X, x + dx * s, y + dy * s, r * s, c, '#052e16'); X.fill(); cont(X, s * .03); } X.fillStyle = T.c; X.fillRect(x - s * .15, y - s * .1, s * .3, s * .22); return; }
    const piedra = card.mundo === 'hielo' ? ['#bae6fd', '#ecfeff', '#0e7490'] : card.mundo === 'sombras' ? ['#3f3a55', '#7c7894', '#1e1b2e'] : card.mundo === 'dragon' ? ['#44403c', '#78716c', '#1c1917'] : ['#78716c', '#d6d3d1', '#57534e'];
    X.beginPath(); X.moveTo(x - s * .6, y + s * .65); X.lineTo(x - s * .5, y - s * .8); X.lineTo(x + s * .5, y - s * .8); X.lineTo(x + s * .6, y + s * .65); X.closePath(); X.fillStyle = lin(X, x - s * .6, 0, x + s * .6, 0, [piedra[0], piedra[1], piedra[2]]); X.fill(); cont(X, s * .05);
    for (let i = -2; i <= 2; i++) { X.fillStyle = piedra[1]; X.fillRect(x + i * s * .22 - s * .08, y - s * 1.0, s * .16, s * .22); X.strokeStyle = 'rgba(0,0,0,.6)'; X.lineWidth = 1; X.strokeRect(x + i * s * .22 - s * .08, y - s * 1.0, s * .16, s * .22); }
    X.fillStyle = T.c; X.beginPath(); X.moveTo(x - s * .25, y - s * .6); X.lineTo(x + s * .25, y - s * .6); X.lineTo(x + s * .25, y); X.lineTo(x, y - s * .12); X.lineTo(x - s * .25, y); X.closePath(); X.fill(); cont(X, s * .03);
    if (card.mundo === 'dragon') brillo(X, x, y + s * .3, s * .5, '#f97316', .7);
    brillo(X, x, y - s * .95, s * .35, est.aura, at ? .9 : .3);
  }
  // ---- La Reina Glory Brown ----
  function reina(X, x, y, s, T, at, t) {
    const b = Math.sin(t * 4) * s * .03;
    brillo(X, x, y - s * .2, s * 1.4, '#fde047', .35 + (at ? .3 : 0));
    X.beginPath(); X.moveTo(x - s * .5, y - s * .3 + b); X.quadraticCurveTo(x - s * .85, y + s * .5, x - s * .6, y + s * .95); X.lineTo(x + s * .6, y + s * .95); X.quadraticCurveTo(x + s * .85, y + s * .5, x + s * .5, y - s * .3 + b); X.closePath(); X.fillStyle = lin(X, x, y - s * .3, x, y + s, ['#1e40af', '#1e3a8a', '#0b1440']); X.fill(); cont(X, s * .05);
    X.strokeStyle = '#facc15'; X.lineWidth = s * .04; X.beginPath(); X.moveTo(x - s * .6, y + s * .95); X.lineTo(x + s * .6, y + s * .95); X.stroke();
    X.beginPath(); X.moveTo(x - s * .4, y - s * .25 + b); X.lineTo(x + s * .4, y - s * .25 + b); X.lineTo(x + s * .55, y + s * .85); X.lineTo(x - s * .55, y + s * .85); X.closePath(); X.fillStyle = lin(X, x - s * .5, 0, x + s * .5, 0, ['#e2e8f0', '#ffffff', '#cbd5e1']); X.fill(); cont(X, s * .05);
    X.fillStyle = '#1e3a8a'; X.beginPath(); X.moveTo(x - s * .12, y + s * .1 + b); X.lineTo(x + s * .12, y + s * .1 + b); X.lineTo(x + s * .2, y + s * .85); X.lineTo(x - s * .2, y + s * .85); X.fill();
    X.fillStyle = metal(X, x, y, s * .3, 'oro'); X.fillRect(x - s * .42, y + s * .05 + b, s * .84, s * .1); X.beginPath(); X.arc(x, y + s * .1 + b, s * .1, 0, 7); X.fill(); cont(X, s * .02);
    X.fillStyle = '#3b82f6'; X.beginPath(); X.moveTo(x, y - s * .2 + b); X.lineTo(x + s * .1, y - s * .08 + b); X.lineTo(x, y + s * .04 + b); X.lineTo(x - s * .1, y - s * .08 + b); X.fill(); brillo(X, x, y - s * .08 + b, s * .2, '#93c5fd', .7);
    for (const q of [-1, 1]) { X.beginPath(); X.ellipse(x + q * s * .42, y - s * .22 + b, s * .22, s * .15, q * .4, 0, 7); X.fillStyle = metal(X, x + q * s * .42, y - s * .22, s * .2, 'oro'); X.fill(); cont(X, s * .03); }
    const hy = y - s * .62 + b, r = s * .3;
    X.beginPath(); X.ellipse(x, hy + r * .5, r * 1.35, r * 1.5, 0, 0, 7); X.fillStyle = lin(X, x, hy - r, x, hy + r * 2, ['#f8fafc', '#e2e8f0', '#94a3b8']); X.fill();
    X.beginPath(); X.arc(x, hy, r, 0, 7); X.fillStyle = rad(X, x, hy, r, '#fde2c8', '#c08a62'); X.fill(); cont(X, s * .04);
    for (const q of [-1, 1]) { X.fillStyle = '#fff'; X.beginPath(); X.ellipse(x + q * r * .38, hy + r * .05, r * .2, r * .13, 0, 0, 7); X.fill(); X.fillStyle = '#1e3a8a'; X.beginPath(); X.arc(x + q * r * .38, hy + r * .07, r * .1, 0, 7); X.fill(); X.strokeStyle = '#3f2a1a'; X.lineWidth = r * .1; X.beginPath(); X.moveTo(x + q * r * .2, hy - r * .22); X.lineTo(x + q * r * .6, hy - r * .17); X.stroke(); }
    X.strokeStyle = '#be185d'; X.lineWidth = r * .1; X.beginPath(); X.arc(x, hy + r * .35, r * .22, .3, Math.PI - .3); X.stroke();
    X.beginPath(); X.arc(x, hy - r * .1, r * 1.05, Math.PI * 1.08, Math.PI * 1.92); X.lineWidth = r * .4; X.strokeStyle = '#f1f5f9'; X.stroke();
    X.beginPath(); X.moveTo(x - r * .75, hy - r * .6); X.lineTo(x - r * .85, hy - r * 1.35); X.lineTo(x - r * .4, hy - r * 1); X.lineTo(x, hy - r * 1.6); X.lineTo(x + r * .4, hy - r * 1); X.lineTo(x + r * .85, hy - r * 1.35); X.lineTo(x + r * .75, hy - r * .6); X.closePath(); X.fillStyle = metal(X, x, hy - r, r, 'oro'); X.fill(); cont(X, s * .03);
    X.fillStyle = '#3b82f6'; X.beginPath(); X.moveTo(x, hy - r * 1.35); X.lineTo(x + r * .14, hy - r * 1.05); X.lineTo(x, hy - r * .8); X.lineTo(x - r * .14, hy - r * 1.05); X.fill(); brillo(X, x, hy - r * 1.05, r * .5, '#bfdbfe', .8);
    // cetro
    X.save(); X.translate(x + s * .62, y + s * .1 + b); X.rotate(at ? -.5 : -.1); X.strokeStyle = '#1c1410'; X.lineWidth = s * .07; X.beginPath(); X.moveTo(0, s * .55); X.lineTo(0, -s * .9); X.stroke(); X.fillStyle = metal(X, 0, -s * .95, s * .2, 'oro'); X.beginPath(); X.moveTo(-s * .18, -s * .85); X.lineTo(0, -s * 1.3); X.lineTo(s * .18, -s * .85); X.lineTo(0, -s * .75); X.closePath(); X.fill(); cont(X, s * .025);
    X.fillStyle = '#60a5fa'; X.beginPath(); X.moveTo(0, -s * 1.2); X.lineTo(s * .09, -s * .98); X.lineTo(0, -s * .82); X.lineTo(-s * .09, -s * .98); X.fill(); brillo(X, 0, -s * 1, s * (at ? .8 : .45), '#fde047', at ? 1 : .7); X.restore();
  }
  // ---- Selección del dibujo según la carta ----
  const HUM = { caballero: { arma: 'espada', escudo: 1 }, guerrero: { arma: 'hacha', grueso: 1.1 }, lanceros: { arma: 'lanza' }, arquero: { arma: 'arco', sinCapa: 1, tunica: 1 }, mago: { arma: 'baculo', tunica: 1 }, sanador: { arma: 'baculo_cura', tunica: 1 }, asesino: { arma: 'dagas', sinCapa: 1 }, invocador: { arma: 'grimorio', tunica: 1 } };
  const BESTIAS = ['lobo', 'leon', 'oso', 'pantera', 'escorpion', 'salamandra', 'ciervo', 'camello', 'caballo', 'mamut'];
  const COLOSO = { alba: 'bronce', bosque: 'ent', arenas: 'piedra', cielo: 'nube', sombras: 'abominacion', hielo: 'hielo', dragon: 'magma' };
  function dibujar(X, card, x, y, s, team, at, t = 0) {
    const T = EQ[team], est = ESTILO[card.mundo] || ESTILO.alba, asp = card.aspecto, arq = card.arq;
    if (arq === 'reina') return reina(X, x, y, s, T, at, t);
    if (card.tipo === 'estructura') return estructura(X, x, y, s, T, card, at, t);
    if (['gigante', 'golem', 'titan'].includes(arq)) { const mat = ['piedra', 'bronce', 'ent', 'nube', 'hielo', 'magma', 'abominacion', 'demonio', 'yeti', 'esfinge', 'leviatan'].includes(asp) ? asp : COLOSO[card.mundo]; if (mat === 'leviatan') return alado(X, x, y, s, T, 'dragon', 'cielo', at, t); return coloso(X, x, y, s, T, mat, at, t); }
    if (arq === 'jinete') { const mont = asp === 'dragon' ? 'dragon' : asp === 'pegaso' ? 'pegaso' : BESTIAS.includes(asp) ? asp : 'caballo'; if (mont === 'dragon' || mont === 'pegaso') alado(X, x, y + s * .2, s * .85, T, mont, card.mundo, at, t); else bestia(X, x, y + s * .25, s * .85, T, mont, card.mundo, at, t); humanoide(X, x, y - s * .25, s * .55, T, est, { arma: 'lanza', mundo: card.mundo, F: card.g === 'F' }, at, t); return; }
    if (BESTIAS.includes(asp)) return bestia(X, x, y, s, T, asp, card.mundo, at, t);
    if (['volador', 'enjambre_aire'].includes(arq) || ['grifo', 'buho', 'gargola', 'fenix', 'djinn', 'dragon', 'pegaso', 'dragoncito'].includes(asp)) { if (['hada', 'espiritu', 'murcielago', 'dragoncito'].includes(asp)) return pequeno(X, x, y, s, T, asp, at, t); return alado(X, x, y, s, T, ['grifo', 'buho', 'gargola', 'fenix', 'djinn', 'dragon', 'pegaso'].includes(asp) ? asp : card.mundo === 'dragon' || card.mundo === 'cielo' ? 'dragon' : 'grifo', card.mundo, at, t); }
    if (['enjambre', 'manada'].includes(arq)) return pequeno(X, x, y, s, T, ['duende', 'hongo', 'esqueleto', 'escarabajo', 'pinguino', 'momia'].includes(asp) ? asp : 'duende', at, t);
    if (arq === 'espectro' || asp === 'espectro' || asp === 'espiritu') { if (asp === 'angel') return humanoide(X, x, y, s, T, ESTILO.cielo, { arma: 'espada', alas: 1, mundo: 'cielo', F: card.g === 'F' }, at, t); const col = { sombras: ['#c4b5fd', '#4c1d95', '#a3e635'], hielo: ['#ecfeff', '#67e8f9', '#e0f2fe'], cielo: ['#ffffff', '#bae6fd', '#fde047'] }[card.mundo] || ['#e9d5ff', '#6d28d9', '#f0abfc']; return espectro(X, x, y, s, T, col, at, t); }
    if (asp === 'angel') return humanoide(X, x, y, s, T, ESTILO.cielo, { ...(HUM[arq] || HUM.guerrero), alas: 1, mundo: 'cielo', F: card.g === 'F', aura: '#fef9c3' }, at, t);
    const o = { ...(HUM[arq] || { arma: 'espada' }), mundo: card.mundo, F: card.g === 'F' };
    if (asp === 'momia') { o.vendas = 1; }
    if (arq === 'mago' || arq === 'invocador') o.aura = est.aura;
    humanoide(X, x, y, s, T, est, o, at, t);
  }
  // Caché de sprites: [carta|equipo|pose] -> lienzo 160x160 (s = 46)
  const CACHE = new Map(), TAM = 160, S0 = 46;
  function sprite(card, team, at) {
    const key = card.id + '|' + team + '|' + (at ? 1 : 0); let c = CACHE.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = TAM; const X = c.getContext('2d'); try { dibujar(X, card, TAM / 2, TAM * .56, S0, team, at, 0); } catch (e) { console.warn('arte', card.id, e); }
    CACHE.set(key, c); return c;
  }
  // Retrato grande para la colección y las presentaciones
  function retrato(card, w = 220, h = 280, team = 0) {
    const c = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1); c.width = w * dpr; c.height = h * dpr; const X = c.getContext('2d'); X.scale(dpr, dpr);
    const W0 = window.GLORY, M = W0.mundos[card.m] || W0.mundos[0], pal = M.pal;
    const g = X.createRadialGradient(w / 2, h * .45, 10, w / 2, h / 2, h * .75); g.addColorStop(0, pal[1]); g.addColorStop(.45, pal[0]); g.addColorStop(1, pal[2]); X.fillStyle = g; X.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { X.fillStyle = `rgba(255,255,255,${.15 + Math.random() * .3})`; X.beginPath(); X.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + .5, 0, 7); X.fill(); }
    X.fillStyle = 'rgba(0,0,0,.25)'; X.beginPath(); X.ellipse(w / 2, h * .82, w * .32, h * .05, 0, 0, 7); X.fill();
    if (card.tipo === 'hechizo') { const cx = w / 2, cy = h * .48; brillo(X, cx, cy, w * .45, card.color || pal[0], 1); X.font = `${w * .38}px serif`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText({ bola: '☄️', meteoro: '🌠', congelar: '❄️', rayo: '⚡', linea: '🗡️', cura: '💖', veneno: '☠️', furia: '🔥', tornado: '🌪️', empuje: '💨', escudo: '🛡️', invoca: '🌀', drenar: '🩸' }[card.arq] || '✨', cx, cy); }
    else { const s = Math.min(w, h) * (card.r > 1 ? .28 : card.cant > 2 ? .3 : .36) * (card.tipo === 'estructura' ? .85 : 1); dibujar(X, card, w / 2, h * .52, s, team, true, .3); }
    const vg = X.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, h * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); X.fillStyle = vg; X.fillRect(0, 0, w, h);
    return c;
  }
  window.GARTE = { EQ, dibujar, sprite, retrato, lin, rad, metal, cont, brillo, ojosF, TAM, S0 };
})();
