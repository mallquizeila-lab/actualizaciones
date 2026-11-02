// 🎮 GLORY BROWN en 3D (Three.js, licencia MIT): arena con perspectiva, luces y sombras, torres de castillo y
// personajes 3D armados por partes con animaciones (caminar, aletear, atacar, aparecer y caer). Todo generado por código.
(() => {
  const T3 = () => window.THREE;
  const EQ = [0x2563eb, 0xdc2626], EQ_LUZ = [0x93c5fd, 0xfca5a5];
  const METAL = { oro: [0xf0c030, .4, .35], plata: [0xd6dde6, .35, .35], bronce: [0xcd8a4a, .35, .4], oscuro: [0x4b4565, .35, .45], hielo: [0xb6f0fa, .2, .25], rojo: [0xb91c1c, .3, .4], cuero: [0x8a5a2b, 0, .8], blanco: [0xf8fafc, .2, .35] };
  const ESTILO = { alba: ['oro', 0xf8fafc, 0xf1c9a0, 'yelmo', 0xe7c46a], bosque: ['cuero', 0x166534, 0xe9c49f, 'capucha', 0x7c4a1a], arenas: ['bronce', 0xfde68a, 0xc58a5a, 'turbante', 0x1c1410], cielo: ['blanco', 0xe0f2fe, 0xf5d5b8, 'tiara', 0xf8fafc], sombras: ['oscuro', 0x2e1065, 0xa7a2c0, 'cuernos', 0x111111], hielo: ['hielo', 0xe0f2fe, 0xf3d9c7, 'piel', 0xe2e8f0], dragon: ['rojo', 0x1c1917, 0xd9a07a, 'cuernos', 0x7f1d1d] };
  const OJOS = { alba: 0xfde047, bosque: 0x86efac, arenas: 0xfbbf24, cielo: 0x7dd3fc, sombras: 0xc084fc, hielo: 0x67e8f9, dragon: 0xfb923c };
  let GEO = null, MATS = new Map();
  function geos() { if (GEO) return GEO; const THREE = T3(); GEO = { esfera: new THREE.SphereGeometry(1, 16, 12), esferaB: new THREE.SphereGeometry(1, 8, 6), cap: new THREE.CapsuleGeometry(1, 1, 4, 10), caja: new THREE.BoxGeometry(1, 1, 1), cil: new THREE.CylinderGeometry(1, 1, 1, 14), cono: new THREE.ConeGeometry(1, 1, 10), cono4: new THREE.ConeGeometry(1, 1, 4), toro: new THREE.TorusGeometry(1, .18, 8, 20), cupula: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), ico: new THREE.IcosahedronGeometry(1, 0), dode: new THREE.DodecahedronGeometry(1, 0), oct: new THREE.OctahedronGeometry(1, 0), plano: new THREE.PlaneGeometry(1, 1) };
    const ala = new THREE.BufferGeometry(); ala.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1.4, .5, -.1, 1.2, -.1, 0, 0, 0, 0, 1.2, -.1, 0, .8, -.35, .05, 0, 0, 0, .8, -.35, .05, .3, -.3, .05], 3)); ala.computeVertexNormals(); GEO.ala = ala;
    const capa = new THREE.PlaneGeometry(1, 1.3, 4, 6); capa.translate(0, -.65, 0); GEO.capa = capa; return GEO; }
  function mat(c, o = {}) { const k = [c, o.m || 0, o.r ?? .6, o.e || 0, o.op || 1, o.ds ? 1 : 0, o.flat ? 1 : 0].join('|'); let m = MATS.get(k); if (m) return m; const THREE = T3();
    m = new THREE.MeshStandardMaterial({ color: c, metalness: o.m || 0, roughness: o.r ?? .6, emissive: o.e || 0, emissiveIntensity: o.e ? 1 : 0, transparent: (o.op || 1) < 1, opacity: o.op || 1, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, flatShading: !!o.flat }); MATS.set(k, m); return m; }
  const metal = n => { const v = METAL[n] || METAL.plata; return mat(v[0], { m: v[1], r: v[2] }); };
  function pieza(g, geo, m, pos, esc, rot) { const THREE = T3(), me = new THREE.Mesh(geo, m); if (pos) me.position.set(...pos); if (esc) me.scale.set(...(Array.isArray(esc) ? esc : [esc, esc, esc])); if (rot) me.rotation.set(...rot); me.castShadow = true; g.add(me); return me; }
  const grupo = (padre, nombre, pos) => { const THREE = T3(), g = new THREE.Group(); g.name = nombre || ''; if (pos) g.position.set(...pos); padre.add(g); return g; };

  // ---------- Personajes ----------
  function humanoide(card, team, o = {}) {
    const THREE = T3(), G0 = geos(), raiz = new THREE.Group(), est = ESTILO[card.mundo] || ESTILO.alba, F = card.g === 'F', tc = EQ[team];
    const armad = metal(o.metal || est[0]), tela = mat(est[1], { r: .8 }), piel = mat(est[2], { r: .7 }), pelo = mat(est[4], { r: .8 }), oscuro = mat(0x1f1b2e, { r: .7 }), equipo = mat(tc, { r: .55 });
    const cuerpo = grupo(raiz, 'cuerpo', [0, .82, 0]);
    for (const q of [-1, 1]) { const p = grupo(raiz, q < 0 ? 'piernaI' : 'piernaD', [q * .16, .62, 0]); pieza(p, G0.cap, o.tunica ? tela : oscuro, [0, -.3, 0], [.11, .17, .11]); pieza(p, G0.caja, armad, [0, -.58, .04], [.17, .09, .24]); }
    pieza(cuerpo, G0.cap, o.tunica ? tela : armad, [0, .1, 0], [F ? .26 : .3, .2, .22]);
    pieza(cuerpo, G0.caja, equipo, [0, .12, .2], [.22, .3, .04]);
    pieza(cuerpo, G0.toro, metal('oro'), [0, -.12, 0], [.3, .3, .3], [Math.PI / 2, 0, 0]);
    for (const q of [-1, 1]) pieza(cuerpo, G0.esfera, armad, [q * .33, .32, 0], [.13, .11, .13]);
    if (!o.sinCapa) { const cp = pieza(cuerpo, G0.capa, mat(tc, { ds: true, r: .8 }), [0, .42, -.2], [.62, .6, 1]); cp.name = 'capa'; cp.rotation.x = .15; }
    const cab = grupo(cuerpo, 'cabeza', [0, .62, 0]);
    pieza(cab, G0.esfera, piel, [0, 0, 0], [.2, .22, .2]);
    const brillan = card.mundo === 'sombras' || card.mundo === 'dragon';
    for (const q of [-1, 1]) { if (!brillan) pieza(cab, G0.esferaB, mat(0xffffff, { r: .3 }), [q * .072, .02, .168], [.052, .058, .04]); pieza(cab, G0.esferaB, mat(brillan ? OJOS[card.mundo] : 0x1e1b4b, brillan ? { e: OJOS[card.mundo] } : { r: .2 }), [q * .072, .015, .19], [.03, .038, .025]); pieza(cab, G0.caja, mat(est[4], { r: .8 }), [q * .075, .085, .18], [.07, .015, .02], [0, 0, q * (F ? .15 : -.2)]); }
    pieza(cab, G0.caja, mat(0x7f1d1d, { r: .6 }), [0, -.09, .185], [.06, .015, .02]);
    if (F && est[3] !== 'capucha') { pieza(cab, G0.esfera, pelo, [0, .02, -.06], [.23, .24, .2]); pieza(cab, G0.cap, pelo, [0, -.2, -.12], [.15, .18, .08]); }
    const casco = est[3];
    if (casco === 'yelmo' || casco === 'piel' || casco === 'cuernos') { pieza(cab, G0.cupula, armad, [0, .04, 0], [.235, .2, .235]); pieza(cab, G0.toro, armad, [0, .04, 0], [.22, .22, .3], [Math.PI / 2, 0, 0]); if (casco === 'yelmo') pieza(cab, G0.cono, mat(0xdc2626, { r: .8 }), [0, .3, -.05], [.06, .25, .06], [-.4, 0, 0]); if (casco === 'piel') pieza(cab, G0.toro, mat(0xf1f5f9, { r: 1 }), [0, .02, 0], [.24, .24, .5], [Math.PI / 2, 0, 0]);
      if (casco === 'cuernos') for (const q of [-1, 1]) pieza(cab, G0.cono, mat(0xe7e5e4, { r: .5 }), [q * .2, .2, 0], [.05, .25, .05], [0, 0, -q * .7]); }
    if (casco === 'capucha') pieza(cab, G0.cono, tela, [0, .12, -.03], [.27, .45, .27]);
    if (casco === 'turbante') { pieza(cab, G0.esfera, tela, [0, .12, 0], [.24, .15, .24]); pieza(cab, G0.esferaB, mat(0xdc2626, { e: 0x7f1d1d }), [0, .13, .22], [.04, .04, .03]); }
    if (casco === 'tiara') pieza(cab, G0.toro, metal('oro'), [0, .17, 0], [.16, .16, .4], [Math.PI / 2, 0, 0]);
    if (o.alas || card.mundo === 'cielo' && !o.sinAlas) for (const q of [-1, 1]) { const a = grupo(cuerpo, q < 0 ? 'alaI' : 'alaD', [q * .12, .35, -.18]); const m2 = pieza(a, G0.ala, mat(0xf8fafc, { ds: true, r: .6 }), [0, 0, 0], [q * .7, .7, .7]); m2.rotation.y = -q * .3; }
    // brazos y armas
    const bI = grupo(cuerpo, 'brazoI', [-.36, .3, 0]), bD = grupo(cuerpo, 'brazoD', [.36, .3, 0]);
    for (const b of [bI, bD]) { pieza(b, G0.cap, o.tunica ? tela : armad, [0, -.2, 0], [.085, .14, .085]); pieza(b, G0.esferaB, piel, [0, -.42, 0], [.07, .07, .07]); }
    const arma = grupo(bD, 'arma', [0, -.42, .05]);
    const tipo = o.arma || 'espada';
    if (tipo === 'espada') { pieza(arma, G0.caja, metal('plata'), [0, .34, 0], [.05, .55, .015]); pieza(arma, G0.caja, metal('oro'), [0, .06, 0], [.2, .04, .05]); }
    if (tipo === 'hacha') { pieza(arma, G0.cil, mat(0x5b3a1a), [0, .3, 0], [.025, .75, .025]); pieza(arma, G0.cil, metal('plata'), [.1, .58, 0], [.17, .03, .17], [Math.PI / 2, 0, 0]); }
    if (tipo === 'lanza') { pieza(arma, G0.cil, mat(0x5b3a1a), [0, .45, 0], [.022, 1.1, .022]); pieza(arma, G0.cono4, metal('plata'), [0, 1.05, 0], [.05, .18, .05]); }
    if (tipo === 'arco') { const ar = pieza(arma, G0.toro, mat(0x5b3a1a, { r: .6 }), [0, .1, .05], [.38, .38, .25], [0, Math.PI / 2, 0]); ar.name = 'arco'; }
    if (tipo === 'baculo' || tipo === 'baculo_cura' || tipo === 'grimorio') { pieza(arma, G0.cil, mat(0x4a2c12), [0, .3, 0], [.025, .9, .025]); const col = tipo === 'baculo_cura' ? 0x86efac : OJOS[card.mundo] || 0xfde047; const orbe = pieza(arma, G0.esfera, mat(col, { e: col }), [0, .8, 0], [.08, .08, .08]); orbe.name = 'orbe'; }
    if (tipo === 'dagas') { pieza(arma, G0.cono4, metal('plata'), [0, .15, 0], [.03, .3, .015]); const a2 = grupo(bI, 'arma2', [0, -.42, .05]); pieza(a2, G0.cono4, metal('plata'), [0, .15, 0], [.03, .3, .015]); }
    if (o.escudo) { const es = grupo(bI, 'escudo', [-.05, -.32, .12]); pieza(es, G0.cil, metal(est[0]), [0, 0, 0], [.22, .04, .22], [Math.PI / 2, 0, 0]); pieza(es, G0.cil, equipo, [0, 0, .025], [.17, .02, .17], [Math.PI / 2, 0, 0]); pieza(es, G0.oct, metal('oro'), [0, 0, .05], [.05, .07, .02]); }
    if (o.aura) { const au = pieza(cuerpo, G0.esfera, mat(o.aura, { e: o.aura, op: .18 }), [0, .2, 0], [.75, .75, .75]); au.castShadow = false; au.name = 'aura'; }
    raiz.userData.fam = 'humano'; return raiz;
  }
  function reina(team) {
    const THREE = T3(), G0 = geos(), r = humanoide({ mundo: 'alba', g: 'F' }, team, { arma: 'baculo', metal: 'oro', aura: 0xfde047 });
    const cab = r.getObjectByName('cabeza'), cu = r.getObjectByName('cuerpo');
    cab.children.filter(c => c.material === metal('oro') || c.geometry === G0.cono).forEach(c => cab.remove(c));
    pieza(cab, G0.esfera, mat(0xf1f5f9, { r: .7 }), [0, .03, -.07], [.26, .27, .22]); pieza(cab, G0.cap, mat(0xe2e8f0, { r: .7 }), [0, -.28, -.13], [.18, .26, .09]);
    const cor = grupo(cab, 'corona', [0, .22, 0]); pieza(cor, G0.cil, metal('oro'), [0, 0, 0], [.17, .07, .17]); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; pieza(cor, G0.cono4, metal('oro'), [Math.cos(a) * .15, .1, Math.sin(a) * .15], [.04, .12, .04]); } pieza(cor, G0.oct, mat(0x3b82f6, { e: 0x1d4ed8 }), [0, .1, .16], [.05, .07, .03]);
    pieza(cu, G0.cono, mat(0xf8fafc, { r: .5 }), [0, -.45, 0], [.42, .55, .42]); pieza(cu, G0.cono, mat(0x1e3a8a, { r: .5 }), [0, -.42, .02], [.3, .5, .32]);
    const orbe = r.getObjectByName('orbe'); orbe.material = mat(0x60a5fa, { e: 0x3b82f6 }); orbe.scale.setScalar(.12);
    r.userData.fam = 'humano'; r.userData.reina = 1; return r;
  }
  function bestia(card, team, tipo) {
    const THREE = T3(), G0 = geos(), raiz = new THREE.Group(), C = { lobo: [0x9ca3af, 0x374151], leon: [0xf59e0b, 0x92400e], oso: [0x8a5a2e, 0x3b2410], pantera: [0x1f2937, 0x030712], escorpion: [0xb45309, 0x451a03], salamandra: [0xf97316, 0x7c2d12], ciervo: [0xd6a36a, 0x5b3a1a], camello: [0xe0b77a, 0x7c5a2a], caballo: [0xf5f5f4, 0x78716c], mamut: [0x7c5a3a, 0x2b1a0c] }[tipo] || [0xa8a29e, 0x44403c];
    if (card.mundo === 'hielo' && tipo === 'lobo') C[0] = 0xe0f2fe;
    const m1 = mat(C[0], { r: .75 }), m2 = mat(C[1], { r: .8 }), cuerpo = grupo(raiz, 'cuerpo', [0, .55, 0]);
    pieza(cuerpo, G0.cap, m1, [0, 0, 0], tipo === 'mamut' ? [.42, .35, .42] : [.27, .3, .27], [Math.PI / 2, 0, 0]);
    pieza(cuerpo, G0.caja, mat(EQ[team], { r: .6 }), [0, .25, 0], [.4, .05, .35]);
    const cab = grupo(cuerpo, 'cabeza', [0, .15, .45]); pieza(cab, G0.esfera, m1, [0, 0, 0], tipo === 'mamut' ? [.3, .3, .3] : [.2, .19, .22]); pieza(cab, G0.esfera, m2, [0, -.05, .17], [.09, .07, .09]);
    const ojo = card.mundo === 'hielo' ? 0x67e8f9 : tipo === 'pantera' ? 0x4ade80 : 0xfbbf24; for (const q of [-1, 1]) pieza(cab, G0.esferaB, mat(ojo, { e: ojo }), [q * .09, .06, .17], [.03, .025, .02]);
    if (['lobo', 'pantera', 'ciervo', 'camello', 'caballo', 'leon'].includes(tipo)) for (const q of [-1, 1]) pieza(cab, G0.cono, m2, [q * .1, .2, -.02], [.05, .12, .04]);
    if (tipo === 'oso') for (const q of [-1, 1]) pieza(cab, G0.esferaB, m2, [q * .14, .17, 0], [.06, .06, .04]);
    if (tipo === 'leon') pieza(cab, G0.esfera, mat(0xb45309, { r: 1, flat: true }), [0, .02, -.08], [.3, .3, .2]);
    if (tipo === 'ciervo') for (const q of [-1, 1]) { pieza(cab, G0.cil, mat(0xfef3c7, { e: 0x34d399 }), [q * .13, .32, 0], [.015, .3, .015], [0, 0, -q * .4]); pieza(cab, G0.cil, mat(0xfef3c7), [q * .2, .38, 0], [.012, .15, .012], [0, 0, q * .5]); }
    if (tipo === 'mamut') for (const q of [-1, 1]) { pieza(cab, G0.cono, mat(0xfafaf9, { r: .4 }), [q * .15, -.12, .2], [.04, .35, .04], [1.1, 0, -q * .3]); pieza(cab, G0.esfera, m2, [q * .3, .02, -.05], [.06, .2, .18]); }
    if (tipo === 'escorpion') { for (const q of [-1, 1]) pieza(cab, G0.esfera, m1, [q * .3, 0, .2], [.12, .07, .1]); const cola = grupo(cuerpo, 'cola', [0, .2, -.35]); for (let i = 0; i < 4; i++) pieza(cola, G0.esfera, m1, [0, .1 + i * .12, -i * .06], [.08, .08, .08]); pieza(cola, G0.cono, mat(0x84cc16, { e: 0x365314 }), [0, .62, .02], [.05, .12, .05], [.6, 0, 0]); }
    else { const cola = grupo(cuerpo, 'cola', [0, .05, -.42]); pieza(cola, G0.cap, m2, [0, 0, -.12], [.04, .15, .04], [-1, 0, 0]); }
    const patas = [];
    for (const [q, w] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const p = grupo(raiz, 'pata', [q * .17, .42, w * .25]); pieza(p, G0.cap, m2, [0, -.18, 0], [.07, .13, .07]); patas.push(p); }
    raiz.userData.fam = 'bestia'; return raiz;
  }
  function coloso(card, team, matN) {
    const THREE = T3(), G0 = geos(), raiz = new THREE.Group();
    const M = { piedra: [0xa8a29e, 0xfbbf24], bronce: [0xb87333, 0xfde047], ent: [0x6b4426, 0x86efac], nube: [0xf1f5f9, 0x7dd3fc], hielo: [0xbae6fd, 0x67e8f9], magma: [0x44403c, 0xf97316], abominacion: [0x6d5b8a, 0xa3e635], demonio: [0x991b1b, 0xfb923c], yeti: [0xf1f5f9, 0x38bdf8], esfinge: [0xe7c27d, 0xfde047], leviatan: [0x38bdf8, 0xf0f9ff] }[matN] || [0xa8a29e, 0xfbbf24];
    const m = mat(M[0], { r: .85, flat: true, m: matN === 'bronce' ? .7 : 0 }), luz = mat(M[1], { e: M[1] }), cuerpo = grupo(raiz, 'cuerpo', [0, 1.05, 0]);
    pieza(cuerpo, G0.dode, m, [0, 0, 0], [.6, .62, .45]); pieza(cuerpo, G0.caja, luz, [0, .1, .4], [.12, .3, .05]).castShadow = false;
    pieza(cuerpo, G0.caja, mat(EQ[team], { r: .6 }), [0, -.2, .38], [.3, .14, .05]);
    const cab = grupo(cuerpo, 'cabeza', [0, .62, .05]); pieza(cab, G0.ico, m, [0, 0, 0], [.27, .25, .25]); for (const q of [-1, 1]) pieza(cab, G0.esferaB, luz, [q * .1, .02, .21], [.045, .03, .02]);
    if (matN === 'ent') for (let i = 0; i < 5; i++) pieza(cab, G0.ico, mat(0x22c55e, { r: .9, flat: true }), [Math.cos(i * 1.3) * .25, .25 + (i % 2) * .1, Math.sin(i * 1.3) * .15], [.2, .18, .2]);
    if (matN === 'demonio' || matN === 'abominacion') for (const q of [-1, 1]) pieza(cab, G0.cono, mat(0xe7e5e4, { r: .4 }), [q * .2, .25, 0], [.06, .3, .06], [0, 0, -q * .5]);
    for (const q of [-1, 1]) { const b = grupo(cuerpo, q < 0 ? 'brazoI' : 'brazoD', [q * .68, .2, 0]); pieza(b, G0.dode, m, [0, -.32, 0], [.22, .38, .22]); pieza(b, G0.dode, m, [0, -.75, .05], [.24, .22, .24]); }
    for (const q of [-1, 1]) { const p = grupo(raiz, q < 0 ? 'piernaI' : 'piernaD', [q * .3, .6, 0]); pieza(p, G0.dode, m, [0, -.3, 0], [.2, .32, .2]); }
    raiz.userData.fam = 'humano'; raiz.userData.pesado = 1; return raiz;
  }
  function alado(card, team, tipo) {
    const THREE = T3(), G0 = geos(), raiz = new THREE.Group();
    const C = { dragon: card.mundo === 'cielo' ? [0x7dd3fc, 0x0c4a6e] : card.mundo === 'dragon' ? [0xdc2626, 0x450a0a] : [0x22c55e, 0x052e16], grifo: [0xe7c27d, 0x7c5a2a], buho: [0xa8a29e, 0x3f3a35], gargola: [0x78716c, 0x1c1917], fenix: [0xfb923c, 0xb91c1c], pegaso: [0xf8fafc, 0x94a3b8], djinn: [0x38bdf8, 0x1e3a8a], dragoncito: [0xf97316, 0x7c2d12] }[tipo] || [0xa8a29e, 0x292524];
    const m1 = mat(C[0], { r: .55, e: tipo === 'fenix' ? 0x7c2d12 : 0 }), cuerpo = grupo(raiz, 'cuerpo', [0, 0, 0]);
    pieza(cuerpo, G0.cap, m1, [0, 0, 0], [.3, .34, .3], [Math.PI / 2.4, 0, 0]);
    const cab = grupo(cuerpo, 'cabeza', [0, .32, .48]); pieza(cab, G0.esfera, m1, [0, 0, 0], [.23, .22, .26]);
    const ojo = tipo === 'gargola' ? 0xef4444 : 0xfde047; for (const q of [-1, 1]) pieza(cab, G0.esferaB, mat(ojo, { e: ojo }), [q * .08, .05, .16], [.03, .025, .02]);
    if (['dragon', 'dragoncito', 'gargola'].includes(tipo)) for (const q of [-1, 1]) pieza(cab, G0.cono, mat(0xe7e5e4), [q * .08, .17, -.05], [.03, .14, .03], [-.5, 0, 0]);
    if (['grifo', 'buho', 'fenix'].includes(tipo)) pieza(cab, G0.cono, mat(0xfacc15, { r: .4 }), [0, -.03, .22], [.04, .1, .04], [Math.PI / 2, 0, 0]);
    pieza(cuerpo, G0.caja, mat(EQ[team]), [0, .1, 0], [.28, .05, .28]);
    for (const q of [-1, 1]) { const a = grupo(cuerpo, q < 0 ? 'alaI' : 'alaD', [q * .12, .12, 0]); pieza(a, G0.ala, mat(['grifo', 'buho', 'pegaso'].includes(tipo) ? C[0] : EQ[team], { ds: true, r: .6, e: tipo === 'fenix' ? 0xf97316 : 0 }), [0, 0, 0], [q * 1.05, 1, 1]).castShadow = true; }
    const cola = grupo(cuerpo, 'cola', [0, -.15, -.35]); pieza(cola, G0.cono, m1, [0, 0, -.25], [.08, .5, .08], [-Math.PI / 2, 0, 0]);
    raiz.userData.fam = 'alado'; return raiz;
  }
  function pequeno(card, team, tipo) {
    const THREE = T3(), G0 = geos(), raiz = new THREE.Group(), cuerpo = grupo(raiz, 'cuerpo', [0, .35, 0]);
    const C = { duende: 0x4ade80, hongo: 0xf5ead2, esqueleto: 0xf5f5f4, escarabajo: 0xfacc15, pinguino: 0x1f2937, momia: 0xf5ead2, hada: 0xfde047, espiritu: 0xbae6fd, murcielago: 0x2e1065, dragoncito: 0xf97316 }[tipo] || 0xa8a29e;
    const brilla = tipo === 'hada' || tipo === 'espiritu', m1 = mat(C, brilla ? { e: C } : { r: .6, m: tipo === 'escarabajo' ? .6 : 0 });
    pieza(cuerpo, G0.esfera, m1, [0, 0, 0], tipo === 'escarabajo' ? [.25, .15, .3] : [.2, .25, .2]);
    if (tipo === 'hongo') pieza(cuerpo, G0.esfera, mat(0xef4444, { r: .5 }), [0, .22, 0], [.3, .17, .3]);
    if (tipo === 'pinguino') pieza(cuerpo, G0.esfera, mat(0xf8fafc), [0, -.02, .1], [.15, .2, .12]);
    if (tipo !== 'hongo' && tipo !== 'escarabajo') { const cab = grupo(cuerpo, 'cabeza', [0, .3, 0]); pieza(cab, G0.esfera, m1, [0, 0, 0], [.15, .15, .15]); const ojo = ['esqueleto', 'momia'].includes(tipo) ? 0xa3e635 : tipo === 'duende' ? 0xfde047 : 0xef4444; for (const q of [-1, 1]) pieza(cab, G0.esferaB, mat(ojo, { e: ojo }), [q * .06, .02, .13], [.03, .03, .02]); if (tipo === 'duende') for (const q of [-1, 1]) pieza(cab, G0.cono, m1, [q * .15, .05, 0], [.04, .15, .04], [0, 0, -q * 1.2]); }
    pieza(cuerpo, G0.esferaB, mat(EQ[team], { e: EQ[team] }), [0, -.1, .17], [.05, .05, .03]);
    if (['hada', 'espiritu', 'murcielago', 'dragoncito'].includes(tipo)) for (const q of [-1, 1]) { const a = grupo(cuerpo, q < 0 ? 'alaI' : 'alaD', [q * .1, .1, -.05]); pieza(a, G0.ala, mat(tipo === 'murcielago' ? 0x1e1b2e : 0xf0f9ff, { ds: true, op: tipo === 'murcielago' ? 1 : .7, r: .4 }), [0, 0, 0], [q * .45, .45, .45]); }
    for (const q of [-1, 1]) { const p = grupo(raiz, q < 0 ? 'piernaI' : 'piernaD', [q * .09, .14, 0]); pieza(p, G0.cap, m1, [0, -.07, 0], [.05, .06, .05]); }
    if (tipo === 'esqueleto' || tipo === 'duende') { const bD = grupo(cuerpo, 'brazoD', [.2, .05, 0]); const ar = grupo(bD, 'arma', [0, -.1, .05]); pieza(ar, G0.caja, metal('plata'), [0, .15, 0], [.03, .3, .01]); }
    raiz.userData.fam = brilla || tipo === 'murcielago' || tipo === 'dragoncito' ? 'alado' : 'humano'; raiz.userData.chico = 1; return raiz;
  }
  function espectro(card, team) {
    const THREE = T3(), G0 = geos(), raiz = new THREE.Group(), col = { sombras: 0x8b5cf6, hielo: 0x67e8f9, cielo: 0xf8fafc }[card.mundo] || 0xc4b5fd, cuerpo = grupo(raiz, 'cuerpo', [0, .2, 0]);
    pieza(cuerpo, G0.cono, mat(col, { e: col, op: .55, r: .3 }), [0, 0, 0], [.35, 1, .35], [Math.PI, 0, 0]).castShadow = false;
    const cab = grupo(cuerpo, 'cabeza', [0, .55, 0]); pieza(cab, G0.esfera, mat(col, { e: col, op: .7 }), [0, 0, 0], [.25, .27, .25]);
    for (const q of [-1, 1]) pieza(cab, G0.esferaB, mat(0x111111), [q * .09, .03, .2], [.05, .07, .03]);
    pieza(cuerpo, G0.toro, mat(EQ[team], { e: EQ[team] }), [0, .2, 0], [.25, .25, .5], [Math.PI / 2, 0, 0]);
    raiz.userData.fam = 'alado'; return raiz;
  }
  function estructura(card, team) {
    const THREE = T3(), G0 = geos(), raiz = new THREE.Group(), a = card.arq, asp = card.aspecto, piedra = mat(card.mundo === 'hielo' ? 0xbae6fd : card.mundo === 'sombras' ? 0x3f3a55 : card.mundo === 'dragon' ? 0x44403c : 0x9ca3af, { r: .9, flat: true });
    const eq = mat(EQ[team]);
    if (a === 'muro') { pieza(raiz, G0.caja, piedra, [0, .5, 0], [1.9, 1, .7]); for (let i = -2; i <= 2; i++) pieza(raiz, G0.caja, piedra, [i * .4, 1.1, 0], [.25, .25, .7]); pieza(raiz, G0.caja, eq, [0, .55, .36], [.4, .35, .02]); }
    else if (a === 'generador') { pieza(raiz, G0.cil, piedra, [0, .45, 0], [.75, .9, .75]); pieza(raiz, G0.cono, mat(card.mundo === 'dragon' ? 0x7f1d1d : card.mundo === 'sombras' ? 0x1e1b4b : 0x92400e, { r: .8 }), [0, 1.25, 0], [.95, .75, .95]); pieza(raiz, G0.caja, mat(0x111111, { e: 0x7c2d12 }), [0, .35, .74], [.35, .55, .02]); pieza(raiz, G0.caja, eq, [.45, .75, .55], [.2, .2, .02]); }
    else if (a === 'canon' || a === 'mortero') { pieza(raiz, G0.cil, piedra, [0, .2, 0], [.8, .4, .8]); const tubo = grupo(raiz, 'tubo', [0, .5, 0]); pieza(tubo, G0.cil, metal(a === 'mortero' ? 'oscuro' : 'bronce'), [0, a === 'mortero' ? .25 : 0, a === 'mortero' ? 0 : .3], a === 'mortero' ? [.3, .6, .3] : [.18, .9, .18], a === 'mortero' ? [0, 0, 0] : [Math.PI / 2, 0, 0]); pieza(raiz, G0.cil, eq, [0, .42, 0], [.82, .06, .82]); }
    else if (asp === 'arbol') { pieza(raiz, G0.cil, mat(0x5b3a1a), [0, .7, 0], [.22, 1.4, .22]); for (const [x, y, z, s] of [[0, 1.7, 0, .7], [-.4, 1.4, .1, .45], [.4, 1.45, -.1, .45]]) pieza(raiz, G0.ico, mat(0x16a34a, { flat: true }), [x, y, z], [s, s, s]); pieza(raiz, G0.caja, eq, [0, .8, .23], [.25, .2, .02]); }
    else if (asp === 'obelisco') { pieza(raiz, G0.cono4, mat(0xd4a017, { m: .6, r: .3 }), [0, 1.1, 0], [.45, 2.2, .45]); pieza(raiz, G0.oct, mat(0xfde047, { e: 0xfde047 }), [0, 2.3, 0], [.15, .2, .15]); }
    else { pieza(raiz, G0.cil, piedra, [0, .8, 0], [.6, 1.6, .6]); for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; pieza(raiz, G0.caja, piedra, [Math.cos(an) * .55, 1.7, Math.sin(an) * .55], [.2, .25, .2]); } pieza(raiz, G0.caja, eq, [0, 1.1, .6], [.35, .45, .02]); if (card.mundo === 'dragon') pieza(raiz, G0.esfera, mat(0xf97316, { e: 0xf97316 }), [0, 1.8, 0], [.18, .18, .18]); }
    raiz.userData.fam = 'estructura'; return raiz;
  }
  const BESTIAS = ['lobo', 'leon', 'oso', 'pantera', 'escorpion', 'salamandra', 'ciervo', 'camello', 'caballo', 'mamut'];
  const HUM = { caballero: { arma: 'espada', escudo: 1 }, guerrero: { arma: 'hacha' }, lanceros: { arma: 'lanza' }, arquero: { arma: 'arco', sinCapa: 1, tunica: 1 }, mago: { arma: 'baculo', tunica: 1 }, sanador: { arma: 'baculo_cura', tunica: 1 }, asesino: { arma: 'dagas', sinCapa: 1 }, invocador: { arma: 'grimorio', tunica: 1 } };
  const COLOSO = { alba: 'bronce', bosque: 'ent', arenas: 'piedra', cielo: 'nube', sombras: 'abominacion', hielo: 'hielo', dragon: 'magma' };
  function construir(card, team) {
    const asp = card.aspecto, arq = card.arq;
    if (arq === 'reina') return reina(team);
    if (card.tipo === 'estructura') return estructura(card, team);
    if (['gigante', 'golem', 'titan'].includes(arq)) { if (asp === 'leviatan') return alado(card, team, 'dragon'); return coloso(card, team, ['piedra', 'bronce', 'ent', 'nube', 'hielo', 'magma', 'abominacion', 'demonio', 'yeti', 'esfinge'].includes(asp) ? asp : COLOSO[card.mundo]); }
    if (arq === 'jinete') { const g = new (T3().Group)(), mont = ['dragon', 'pegaso'].includes(asp) ? alado(card, team, asp) : bestia(card, team, BESTIAS.includes(asp) ? asp : 'caballo'); g.add(mont); const j = humanoide(card, team, { arma: 'lanza', sinCapa: 1 }); j.name = 'jinete'; j.scale.setScalar(.65); j.position.set(0, mont.userData.fam === 'alado' ? .15 : .55, -.05); g.add(j); g.userData = { fam: mont.userData.fam, esJinete: 1 }; return g; }
    if (BESTIAS.includes(asp)) return bestia(card, team, asp);
    if (['hada', 'espiritu', 'murcielago', 'dragoncito', 'duende', 'hongo', 'esqueleto', 'escarabajo', 'pinguino'].includes(asp) && ['enjambre', 'enjambre_aire', 'manada'].includes(arq)) return pequeno(card, team, asp);
    if (arq === 'volador' || ['grifo', 'buho', 'gargola', 'fenix', 'djinn', 'dragon', 'pegaso'].includes(asp)) return alado(card, team, ['grifo', 'buho', 'gargola', 'fenix', 'djinn', 'dragon', 'pegaso'].includes(asp) ? asp : card.mundo === 'dragon' || card.mundo === 'cielo' ? 'dragon' : 'grifo');
    if (['enjambre', 'manada', 'enjambre_aire'].includes(arq)) return pequeno(card, team, card.aire ? 'hada' : 'duende');
    if (arq === 'espectro' && asp !== 'angel') return espectro(card, team);
    if (asp === 'espectro' || asp === 'espiritu') return espectro(card, team);
    return humanoide(card, team, { ...(HUM[arq] || HUM.guerrero), alas: asp === 'angel', aura: arq === 'mago' || arq === 'invocador' ? OJOS[card.mundo] : 0 });
  }
  // Animación de cada modelo según lo que hace la unidad
  function refs(o) { if (o.__r) return o.__r; const r = { patas: [] }; o.traverse(c => { if (c.name === 'pata') r.patas.push(c); else if (c.name && !r[c.name]) r[c.name] = c; }); return (o.__r = r); }
  function animar(o, e, t, dt) {
    const u = o.userData, R = refs(o), mov = e.mueve > 0, at = e.at > 0; o.__fase = (o.__fase ?? Math.random() * 6) + dt * (mov ? 10 : 2.4); const fase = o.__fase, s = Math.sin(fase), cu = R.cuerpo;
    if (cu && o.__baseY === undefined) o.__baseY = cu.position.y;
    if (u.fam === 'humano') { const amp = u.pesado ? .4 : .8;
      if (R.piernaI) { R.piernaI.rotation.x = mov ? s * amp : 0; R.piernaD.rotation.x = mov ? -s * amp : 0; }
      if (R.brazoI) R.brazoI.rotation.x = mov ? -s * .6 : Math.sin(t * 2) * .05;
      if (R.brazoD) R.brazoD.rotation.x = at ? -2.2 + Math.sin(t * 30) * .2 : mov ? s * .6 : -.2;
      if (cu) cu.position.y = o.__baseY + (mov ? Math.abs(s) * .05 : Math.sin(t * 2.5) * .015);
      if (R.capa) R.capa.rotation.x = .15 + (mov ? .35 + Math.sin(fase * .5) * .1 : Math.sin(t * 1.5) * .05);
      if (R.orbe) R.orbe.scale.setScalar((u.reina ? .12 : .08) * (at ? 1.8 : 1 + Math.sin(t * 4) * .1)); }
    if (R.patas.length) R.patas.forEach((p, i) => { p.rotation.x = mov ? Math.sin(fase + (i % 3 === 0 ? 0 : Math.PI)) * .7 : 0; });
    if (u.fam === 'bestia' && cu) cu.position.y = o.__baseY + (mov ? Math.abs(s) * .06 : 0) + (at ? .08 : 0);
    if (u.fam === 'alado') { const f = Math.sin(t * (u.chico ? 22 : 7)) * (u.chico ? .7 : .5); if (R.alaI) R.alaI.rotation.z = f; if (R.alaD) R.alaD.rotation.z = -f; if (cu) cu.position.y = o.__baseY + Math.sin(t * 2) * .08; }
    if (R.cola) R.cola.rotation.y = Math.sin(t * 3) * .4;
    if (R.jinete) animar(R.jinete, { mueve: 0, at: e.at }, t, dt);
    if (R.tubo) R.tubo.position.y += ((at ? .42 : .5) - R.tubo.position.y) * .3;
  }

  // ---------- Escena de la batalla ----------
  function crear({ W, H, dpr, mundoI, voltear, CARTA, suelo, calidad = 1 }) {
    const THREE = T3(); geos();
    const ren = new THREE.WebGLRenderer({ antialias: calidad > 0, powerPreference: 'high-performance' }); ren.setPixelRatio(Math.min(dpr, calidad > 0 ? 2 : 1)); ren.setSize(W, H, false);
    ren.shadowMap.enabled = calidad > 0; ren.shadowMap.type = THREE.PCFSoftShadowMap;
    const escena = new THREE.Scene(), CIELO = [0x87b8e8, 0x2f6a3a, 0xf5c27a, 0xbfe3ff, 0x1a1530, 0xdbeafe, 0x3a1410][mundoI] || 0x87b8e8;
    escena.background = new THREE.Color(CIELO); escena.fog = new THREE.Fog(CIELO, 45, 90);
    const cam = new THREE.PerspectiveCamera(30, W / H, .5, 200), dir = voltear ? -1 : 1;
    cam.position.set(0, 46, 25 * dir); cam.lookAt(0, 0, 1.6 * dir);
    escena.add(new THREE.HemisphereLight(0xffffff, 0x445533, .75));
    const sol = new THREE.DirectionalLight(0xfff4e0, 1.05); sol.position.set(-12, 30, 14); sol.castShadow = calidad > 0; sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 20, bottom: -20, near: 1, far: 80 }); sol.shadow.bias = -.0006; escena.add(sol);
    // suelo pintado (caminos, césped, río) + borde
    const tex = new THREE.CanvasTexture(suelo); tex.anisotropy = 4;
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(18, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: .95 })); piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; escena.add(piso);
    const base = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 38), mat([0x57534e, 0x3f2a14, 0xb45309, 0xe0f2fe, 0x1e1b2e, 0x94a3b8, 0x1c1917][mundoI] || 0x57534e, { r: .95 })); base.position.y = -.62; base.receiveShadow = true; escena.add(base);
    // agua / lava animada
    const aguaCol = [0x0ea5e9, 0x10b981, 0x22d3ee, 0x93c5fd, 0x65a30d, 0x7dd3fc, 0xf97316][mundoI];
    const agua = new THREE.Mesh(new THREE.PlaneGeometry(18, 2, 36, 4), new THREE.MeshStandardMaterial({ color: aguaCol, transparent: true, opacity: mundoI === 6 ? .9 : .7, roughness: .15, metalness: .2, emissive: mundoI === 6 ? 0xf97316 : 0, emissiveIntensity: mundoI === 6 ? .6 : 0 }));
    agua.rotation.x = -Math.PI / 2; agua.position.set(0, .06, 0); escena.add(agua);
    // puentes y muros de 3D
    const piedra = mat(0x9a948c, { r: .9 }), madera = mat(0x8a5a2e, { r: .85 });
    for (const bx of [-5.5, 5.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.6, .3, 3), mundoI === 1 ? madera : piedra); p.position.set(bx, .15, 0); p.castShadow = p.receiveShadow = true; escena.add(p); for (const q of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.25, .5, 3), piedra); b.position.set(bx + q * 1.3, .4, 0); b.castShadow = true; escena.add(b); } }
    for (const q of [-1, 1]) for (const z of [-8, 8]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.6, 1, 14), mat(0x78716c, { r: .9, flat: true })); m.position.set(q * 9.3, .4, z * 1.05); m.castShadow = m.receiveShadow = true; escena.add(m); }
    // decoración 3D según el mundo
    const decor = (x, z, s, tipo) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); escena.add(g);
      const add = (geo, m, p, sc) => { const me = new THREE.Mesh(geo, m); me.position.set(...p); me.scale.set(...sc); me.castShadow = true; g.add(me); };
      if (tipo === 'arbol') { add(GEO.cil, mat(0x5b3a1a), [0, .7, 0], [.18, 1.4, .18]); add(GEO.ico, mat([0x16a34a, 0x15803d, 0x22c55e][Math.floor(Math.random() * 3)], { flat: true }), [0, 1.8, 0], [.9, .9, .9]); add(GEO.ico, mat(0x166534, { flat: true }), [.3, 1.4, .2], [.55, .55, .55]); }
      if (tipo === 'pino') { add(GEO.cil, mat(0x5b3a1a), [0, .4, 0], [.15, .8, .15]); for (let i = 0; i < 3; i++) add(GEO.cono, mat(i === 2 ? 0xf8fafc : 0x14532d, { flat: true }), [0, 1 + i * .55, 0], [.85 - i * .22, .9, .85 - i * .22]); }
      if (tipo === 'roca') add(GEO.dode, mat([0x78716c, 0xa8a29e][Math.floor(Math.random() * 2)], { flat: true, r: .95 }), [0, .3, 0], [.6, .45, .55]);
      if (tipo === 'palmera') { add(GEO.cil, mat(0x92400e), [0, .9, 0], [.12, 1.8, .12]); for (let i = 0; i < 6; i++) { const me = new THREE.Mesh(GEO.caja, mat(0x16a34a)); me.position.set(Math.cos(i) * .45, 1.8, Math.sin(i) * .45); me.scale.set(.9, .05, .25); me.rotation.y = -i; me.rotation.z = -.4; me.castShadow = true; g.add(me); } }
      if (tipo === 'cristal') add(GEO.oct, mat([0xa78bfa, 0x67e8f9, 0xfde047][mundoI % 3], { e: [0x6d28d9, 0x0891b2, 0xb45309][mundoI % 3], r: .2 }), [0, .7, 0], [.35, .7, .35]);
      if (tipo === 'muerto') { add(GEO.cil, mat(0x292524), [0, .8, 0], [.12, 1.6, .12]); for (const q of [-1, 1]) { const me = new THREE.Mesh(GEO.cil, mat(0x292524)); me.position.set(q * .3, 1.4, 0); me.scale.set(.06, .7, .06); me.rotation.z = -q * .8; g.add(me); } }
      if (tipo === 'volcan') { add(GEO.cono, mat(0x292524, { flat: true }), [0, .7, 0], [.9, 1.4, .9]); add(GEO.esfera, mat(0xf97316, { e: 0xf97316 }), [0, 1.4, 0], [.25, .1, .25]); }
      if (tipo === 'nube') for (let i = 0; i < 4; i++) add(GEO.esfera, mat(0xffffff, { r: 1 }), [(i - 1.5) * .45, .4 + Math.sin(i) * .1, 0], [.5, .4, .45]);
    };
    const DEC = [['arbol', 'roca'], ['arbol', 'cristal'], ['palmera', 'roca'], ['nube', 'cristal'], ['muerto', 'cristal'], ['pino', 'cristal'], ['volcan', 'roca']][mundoI] || ['arbol', 'roca'];
    [[-8.4, -5], [8.4, -4.5], [-8.3, 5], [8.2, 4.5], [-8.4, -14], [8.4, -13.8], [-8.4, 14], [8.4, 13.8]].forEach(([x, z]) => decor(x, z, 1, DEC[0]));
    [[-2.5, -3.8], [2.8, 3.8], [-7.8, 0], [7.8, 0], [1, -6.5], [-1.2, 6.2]].forEach(([x, z]) => decor(x, z, .8, DEC[1]));
    // torres de castillo
    const torres3D = new Map();
    function torre(e) { const g = new THREE.Group(), rey = e.rey, s = rey ? 1.25 : 1, tm = e.team;
      const pied = mat(0xc7c2bb, { r: .85 }), pied2 = mat(0x8b857d, { r: .9 });
      const add = (geo, m, p, sc, rot) => { const me = new THREE.Mesh(geo, m); me.position.set(...p); me.scale.set(...sc); if (rot) me.rotation.set(...rot); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
      add(GEO.cil, pied2, [0, .25, 0], [1.6 * s, .5, 1.6 * s]); add(GEO.cil, pied, [0, 1.3 * s, 0], [1.25 * s, 2 * s, 1.25 * s]);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(GEO.caja, pied, [Math.cos(a) * 1.18 * s, 2.45 * s, Math.sin(a) * 1.18 * s], [.38 * s, .45 * s, .38 * s], [0, -a, 0]); }
      add(GEO.cil, pied2, [0, 2.32 * s, 0], [1.32 * s, .14, 1.32 * s]);
      const ban = add(GEO.caja, mat(EQ[tm], { r: .7 }), [0, 1.4 * s, 1.27 * s * (tm ? -1 : 1)], [.7 * s, 1.1 * s, .04]); add(GEO.oct, metal('oro'), [0, 1.55 * s, 1.31 * s * (tm ? -1 : 1)], [.16 * s, .22 * s, .05]);
      const asta = add(GEO.cil, mat(0x292524), [.95 * s, 3.3 * s, 0], [.04, 1.6 * s, .04]); const flag = add(GEO.plano, mat(EQ[tm], { ds: true }), [1.3 * s, 3.8 * s, 0], [.7 * s, .45 * s, 1]); flag.name = 'bandera';
      const guardia = rey ? reina(tm) : humanoide({ mundo: 'alba', g: 'M' }, tm, { arma: 'arco', sinCapa: 1 }); guardia.scale.setScalar(rey ? 1.2 : 1); guardia.position.set(0, 2.42 * s, 0); guardia.rotation.y = tm ? 0 : Math.PI; guardia.name = 'guardia'; g.add(guardia);
      g.position.set(e.x - 9, 0, e.y - 16); escena.add(g); return g; }
    function ruinas(g) { const pos = g.position.clone(); escena.remove(g); const r = new THREE.Group(); r.position.copy(pos); for (let i = 0; i < 9; i++) { const me = new THREE.Mesh(GEO.dode, mat(0x8b857d, { flat: true })); me.position.set(Math.sin(i * 2.3) * 1, .25, Math.cos(i * 1.7) * .8); me.scale.setScalar(.3 + (i % 3) * .12); me.rotation.set(i, i * 2, 0); me.castShadow = true; r.add(me); } escena.add(r); return r; }
    // unidades
    const modelos = new Map(), plantillas = new Map(), muriendo = [];
    function modelo(e) { const k = e.cid + '|' + e.team; let p = plantillas.get(k); if (!p) { p = construir(e.card, e.team); const tam = Math.max(.55, e.r * 2.1) * (e.card.tipo === 'estructura' ? .9 : 1); p.scale.multiplyScalar(tam); plantillas.set(k, p); }
      const o = p.clone(); o.__base = p.scale.x; escena.add(o); return o; }
    // proyectiles
    const glow = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const pool = [], PCOL = { magia: 0xc084fc, luz: 0xfde047, fuego: 0xf97316, hielo: 0x7dd3fc, espina: 0x84cc16, viento: 0xe0f2fe, rayo: 0xfef08a, grito: 0xe9d5ff, dorado: 0xfde047, bala: 0x44403c, roca: 0x78716c, flecha: 0xfef3c7, virote: 0xfef3c7, pluma: 0xffffff, bola: 0xfb923c };
    function proy(i) { let s = pool[i]; if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pool[i] = s; escena.add(s); } s.visible = true; return s; }
    // zona prohibida al desplegar
    const prohibida = new THREE.Mesh(new THREE.PlaneGeometry(18, 17.2), new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: .22, depthWrite: false })); prohibida.rotation.x = -Math.PI / 2; prohibida.position.set(0, .08, -7.4 * (voltear ? -1 : 1)); prohibida.visible = false; escena.add(prohibida);
    const ray = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), v = new THREE.Vector3();
    let t0 = 0;
    function render(ents, proys, dt, t) {
      t0 += dt;
      agua.position.y = .06 + Math.sin(t * 1.5) * .02; const pa = agua.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * .9 + t * 2) * .05); pa.needsUpdate = true;
      const vivos = new Set();
      for (const e of ents) {
        if (e.torre) { let g = torres3D.get(e.id); if (!g) { g = torre(e); torres3D.set(e.id, g); } if (e.hp <= 0 && !g.userData.ruina) { const r = ruinas(g); r.userData.ruina = 1; torres3D.set(e.id, r); continue; } if (g.userData.ruina) continue; const fl = g.getObjectByName('bandera'); if (fl) fl.rotation.y = Math.sin(t * 3 + e.id) * .3; const gu = g.getObjectByName('guardia'); if (gu) { gu.position.y = (e.rey ? 3 : 2.42) + Math.sin(t * 2 + e.id) * .02; } continue; }
        if (e.hp <= 0 || !e.card) continue; vivos.add(e.id);
        let o = modelos.get(e.id); if (!o) { o = modelo(e); modelos.set(e.id, o); o.__px = e.x; o.__py = e.y; o.rotation.y = (e.team ? 0 : Math.PI); }
        const cae = e.nace > 0 ? Math.max(0, e.nace - .5) * 2 : 0, alto = e.aire ? 2.1 : 0;
        o.position.set(e.x - 9, alto + cae * 6, e.y - 16);
        const dx = e.x - o.__px, dy = e.y - o.__py; if (Math.hypot(dx, dy) > .004) { const obj = Math.atan2(dx, dy); let d = obj - o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.rotation.y += d * Math.min(1, dt * 10); } o.__px = e.x; o.__py = e.y;
        const sc = e.flash > 0 ? 1.12 : e.at > 0 ? 1.06 : 1; o.scale.setScalar(o.__base * sc); o.visible = !(e.invis && e.team !== (voltear ? 1 : 0));
        animar(o, e, t, dt);
      }
      for (const [id, o] of modelos) if (!vivos.has(id)) { modelos.delete(id); o.__muere = .45; muriendo.push(o); }
      for (let i = muriendo.length - 1; i >= 0; i--) { const o = muriendo[i]; o.__muere -= dt; const p = Math.max(0, o.__muere / .45); o.scale.setScalar(o.__base * p); o.position.y += dt * 2; o.rotation.y += dt * 8; if (p <= 0) { escena.remove(o); muriendo.splice(i, 1); } }
      let i = 0; for (const p of proys) { const s = proy(i++), c = PCOL[p.tipo] || 0xfbbf24; s.material.color.setHex(c); const g = p.tipo === 'bola' ? (p.grande ? 2.4 : 1.6) : p.tipo === 'roca' || p.tipo === 'bala' ? .5 : .7; s.scale.set(g, g, 1); s.position.set(p.x - 9, p.tipo === 'bola' ? 1.5 : 1.2, p.y - 16); } for (; i < pool.length; i++) pool[i].visible = false;
      ren.render(escena, cam);
    }
    // de casillas del juego a píxeles de pantalla (para barras de vida, globos y efectos)
    function proj(x, y, h = 0) { v.set(x - 9, h, y - 16).project(cam); const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H; v.set(x - 9 + 1, h, y - 16).project(cam); const ex = (v.x + 1) / 2 * W; return [sx, sy, Math.abs(ex - sx)]; }
    function pick(px, py) { ray.setFromCamera({ x: px / W * 2 - 1, y: -(py / H * 2 - 1) }, cam); const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(plano, p)) return null; return [p.x + 9, p.z + 16]; }
    return { canvas: ren.domElement, render, proj, pick, zona: on => { prohibida.visible = !!on; }, liberar: () => { ren.dispose(); ren.forceContextLoss?.(); } };
  }
  // Retrato 3D para la colección (un solo lienzo compartido)
  let RR = null; const RCACHE = new Map();
  function retrato3D(card, w, h, fondo) {
    const THREE = T3(); if (!THREE) return null; const key = card.id + w + 'x' + h; if (RCACHE.has(key)) return RCACHE.get(key);
    try { geos(); if (!RR) { RR = { ren: new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }), esc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, 1, .1, 50) }; RR.esc.add(new THREE.HemisphereLight(0xffffff, 0x334155, .9)); const d = new THREE.DirectionalLight(0xffffff, 1.1); d.position.set(2, 4, 5); RR.esc.add(d); }
      RR.ren.setSize(w * 2, h * 2, false); RR.cam.aspect = w / h; RR.cam.updateProjectionMatrix();
      const o = construir(card, 0); const caja = new THREE.Box3().setFromObject(o), c = caja.getCenter(new THREE.Vector3()), tam = caja.getSize(new THREE.Vector3()), m = Math.max(tam.y, tam.x * h / w);
      o.position.sub(c); o.rotation.y = .32; RR.esc.add(o); RR.cam.position.set(0, m * .25, m * 2.2 + .5); RR.cam.lookAt(0, 0, 0); RR.ren.setClearColor(0x000000, 0); RR.ren.render(RR.esc, RR.cam); RR.esc.remove(o);
      const out = document.createElement('canvas'); out.width = w * 2; out.height = h * 2; const x = out.getContext('2d'); if (fondo) x.drawImage(fondo, 0, 0, w * 2, h * 2); x.drawImage(RR.ren.domElement, 0, 0); RCACHE.set(key, out); return out; } catch (e) { return null; }
  }
  window.GLORY3D = { crear, construir, retrato3D };
})();
