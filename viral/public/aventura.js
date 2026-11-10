// 👑 YUPITOK: El Universo de las Aventuras — prototipo jugable (Fase 1). Motor 3D propio sobre Three.js (MIT).
// Yupi jugable en el Reino de Yupitok: moverse, saltar (doble salto), giro de corona, 3 misiones, 2 enemigos,
// la prueba del Sabio Búho (preguntas educativas), monedas y pantalla de selección de personajes.
// Todo es original de Yupitok. Diseño completo: YUPITOK_AVENTURAS_DISENO.md
(() => {
  const A = window.ARC_API; if (!A) return; const { JUEGOS, salir } = A, setParar = A.setParar;
  const cargarThree = () => window.THREE ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/three.min.js?v=149'; s.onload = ok; s.onerror = no; document.head.append(s); });
  const PERS = [
    ['yupi', '👑', 'Yupi', 'Doble salto y giro de corona', 0], ['lulu', '🦙', 'Lulú', 'Escupitajo de nubes', 2], ['choki', '🌽', 'Choki', 'Lanzazo solar', 2], ['coquito', '🥥', 'Coquito', 'Coraza de madera', 2],
    ['rocoto', '🌶️', 'Rocoto Rojo', 'Carrera picante', 3], ['buho', '🦉', 'Sabio Búho', 'Maestro de la magia', 3], ['yuki', '🤖', 'Robo Yuki', 'Gancho magnético', 3], ['hada', '🧚', 'Hada Aprendiz', 'Curación', 3],
    ['estrellin', '⭐', 'Estrellín', 'Guía mágico', 4], ['tortugo', '🐢', 'Tortugo', 'Caparazón rodante', 4], ['drakito', '🐉', 'Drakito Azul', 'Vuelo corto', 4], ['grun', '🪲', 'Gorgojo Grun', '¿Villano… o amigo?', 5],
  ];
  const PREGUNTAS = [
    ['¿Cuánto es 7 × 8?', ['54', '56', '64'], 1, '7 × 8 = 56. Truco: 5, 6, 7, 8 → 56 = 7 × 8.'],
    ['¿Qué planeta es conocido como el planeta rojo?', ['Marte', 'Venus', 'Júpiter'], 0, 'Marte se ve rojo por el óxido de hierro de su suelo.'],
    ['¿Cuál es la capital del Perú?', ['Cusco', 'Arequipa', 'Lima'], 2, 'Lima es la capital del Perú desde 1535.'],
    ['¿Qué necesitan las plantas para hacer su alimento?', ['Luz del sol', 'Arena', 'Sal'], 0, 'Con la luz del sol, agua y aire las plantas hacen fotosíntesis.'],
    ['Si un amigo se cae, ¿qué es lo correcto?', ['Reírme', 'Ayudarlo', 'Irme'], 1, 'Ayudar a los demás nos hace mejores amigos.'],
    ['¿Cuánto es 15 + 27?', ['42', '32', '52'], 0, '15 + 27 = 42.'],
    ['¿Cuántos lados tiene un hexágono?', ['5', '6', '8'], 1, 'Hexa significa seis: tiene 6 lados.'],
    ['¿Qué animal es típico de los Andes?', ['La llama', 'El canguro', 'El panda'], 0, 'La llama vive en los Andes de Perú, Bolivia y más.'],
    ['¿Cuál es el océano más grande?', ['Atlántico', 'Índico', 'Pacífico'], 2, 'El Pacífico es el más grande… ¡y baña las costas del Perú!'],
    ['¿Cuánto es la mitad de 50?', ['20', '25', '30'], 1, 'La mitad de 50 es 25.'],
    ['¿Qué estado del agua es el hielo?', ['Sólido', 'Líquido', 'Gas'], 0, 'El hielo es agua en estado sólido.'],
    ['¿Qué palabra está bien escrita?', ['Havía', 'Había', 'Abía'], 1, '"Había" se escribe con h y con b.'],
  ];

  JUEGOS.aventura = t => {
    salir(); try { registrar(t.id); } catch (e) {}
    portada(t);
  };

  // ---------- Pantalla de inicio y selección de personaje ----------
  function portada(t) {
    css();
    const ov = document.createElement('div'); ov.id = 'avz';
    const D = PERFIL.datos, J = D.juegos.aventura = Object.assign({ partidas: 0, record: 0, cristales: 0, mejorTiempo: 0 }, D.juegos.aventura || {});
    ov.innerHTML = `<div class="avz-menu"><div class="avz-logo">👑 YUPITOK<small>El Universo de las Aventuras</small></div>
      <p class="avz-lema">¡Juega, ríe, aprende y gana!</p>
      <p class="avz-hist">Gorgojo Grun robó los <b>Cristales del Arcoíris</b> y el reino perdió su color. ¡Ayuda a Yupi a recuperar el <b>Cristal Amarillo</b>!</p>
      <h3>Elige tu personaje</h3><div class="avz-pers">${PERS.map(([id, e, n, h, f]) => `<button class="avz-p ${f ? 'lock' : ''}" data-p="${id}"><span>${e}</span><b>${n}</b><small>${f ? `🔒 Fase ${f}` : h}</small></button>`).join('')}</div>
      ${J.cristales ? `<p class="avz-hist">🏆 Ya recuperaste ${J.cristales} cristal(es) · Mejor tiempo: ${J.mejorTiempo}s</p>` : ''}
      <div class="avz-bts"><button class="avz-go" data-go="1">▶ Jugar con Yupi</button><button class="avz-x" data-x="1">✕ Salir</button></div></div>`;
    document.body.append(ov); document.body.style.overflow = 'hidden';
    ov.onclick = e => {
      const p = e.target.closest('[data-p]'); if (p && p.classList.contains('lock')) { const P = PERS.find(x => x[0] === p.dataset.p); toast(`${P[1]} ${P[2]} llega en la Fase ${P[4]} del universo Yupitok. ¡Muy pronto!`); return; }
      if (e.target.closest('[data-x]')) { cerrar(ov); return; }
      if (e.target.closest('[data-go]') || (p && p.dataset.p === 'yupi')) { ov.innerHTML = '<div class="avz-carga"><div style="font-size:3rem">👑</div>Creando el Reino de Yupitok…</div>'; cargarThree().then(() => jugar(t, ov)).catch(() => { toast('No se pudo cargar el 3D'); cerrar(ov); }); }
    };
    setParar(() => cerrar(ov));
  }
  function cerrar(ov) { ov?.remove(); document.body.style.overflow = ''; }

  // ---------- El juego ----------
  function jugar(t, ov) {
    const THREE = window.THREE, V3 = THREE.Vector3;
    ov.innerHTML = `<canvas id="avc"></canvas>
      <div class="avz-hud"><div id="avvida">❤️❤️❤️</div><div>🪙 <b id="avmon">0</b></div><div id="avmis"></div></div>
      <div class="avz-top"><button class="avz-b" id="avson">${LS.get('arcSonido') === '0' ? '🔇' : '🔊'}</button><button class="avz-b" id="avsal">✕</button></div>
      <div id="avmsg"></div><div id="avjoy"><i></i></div>
      <button class="avz-b avz-bt" id="avsalto">⤒</button><button class="avz-b avz-bt" id="avgiro">👑</button><button class="avz-b avz-bt" id="avhab" style="display:none">💬</button>
      <div id="avpanel"></div>
      <div id="avayuda">${matchMedia('(pointer:coarse)').matches ? '👈 Muévete con el dedo a la izquierda · Gira la cámara arrastrando a la derecha 👉' : 'WASD o flechas para moverte · Espacio: saltar · Q: giro de corona · E: hablar · Arrastra para girar la cámara'}</div>`;
    const $ = s => ov.querySelector(s), cv = $('#avc');
    let renderer; try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) { toast('Tu equipo no soporta 3D'); cerrar(ov); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, .1, 500);
    scene.background = new THREE.Color('#5cb8ff'); scene.fog = new THREE.Fog('#a8dcff', 70, 180);
    const tam = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }; tam(); addEventListener('resize', tam);
    scene.add(new THREE.HemisphereLight('#ffffff', '#4a6b3a', .55));
    const sol = new THREE.DirectionalLight('#fff3dd', .8); sol.position.set(30, 50, 20); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024); Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 150 }); scene.add(sol); scene.add(sol.target);
    const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .7, flatShading: true, ...o });
    const malla = (g, m, sombra = true) => { const me = new THREE.Mesh(g, m); me.castShadow = sombra; me.receiveShadow = true; return me; };

    // Mundo: pradera, camino, castillo, árboles, islas flotantes y la barrera mágica del Sabio Búho
    const suelo = malla(new THREE.CylinderGeometry(70, 72, 4, 48), mat('#5aaf3c'), false); suelo.position.y = -2; scene.add(suelo);
    const camino = malla(new THREE.PlaneGeometry(6, 70), mat('#d9b77a'), false); camino.rotation.x = -Math.PI / 2; camino.position.set(0, .02, -10); scene.add(camino);
    const colis = [], plataformas = [];
    // castillo (al norte)
    const castillo = new THREE.Group(); castillo.position.set(0, 0, -48); scene.add(castillo);
    const muro = (x, z, w, d) => { const m = malla(new THREE.BoxGeometry(w, 8, d), mat('#efe3ff')); m.position.set(x, 4, z); castillo.add(m); };
    muro(-14, 0, 2, 22); muro(14, 0, 2, 22); muro(0, -11, 30, 2); muro(-9, 11, 12, 2); muro(9, 11, 12, 2);
    for (const [x, z] of [[-14, -11], [14, -11], [-14, 11], [14, 11]]) { const tor = malla(new THREE.CylinderGeometry(3, 3.3, 14, 10), mat('#e7d7ff')); tor.position.set(x, 7, z); castillo.add(tor); const tec = malla(new THREE.ConeGeometry(3.8, 6, 10), mat('#7b2ff7')); tec.position.set(x, 17, z); castillo.add(tec); }
    const keep = malla(new THREE.CylinderGeometry(4, 4.5, 18, 12), mat('#f3eaff')); keep.position.set(0, 9, -4); castillo.add(keep); const kt = malla(new THREE.ConeGeometry(5, 8, 12), mat('#7b2ff7')); kt.position.set(0, 22, -4); castillo.add(kt);
    for (const [x, z, r] of [[-14, -48, 3.5], [14, -48, 3.5], [-14, -59, 3.5], [14, -59, 3.5], [0, -52, 4.8], [-9, -37, 6.2], [9, -37, 6.2]]) colis.push([x, z, r]);
    for (let i = -13; i <= 13; i += 2) { colis.push([-14, -48 + i * .8, 1.3]); colis.push([14, -48 + i * .8, 1.3]); colis.push([i, -59, 1.3]); }
    // pedestal del cristal dentro del castillo
    const pedestal = malla(new THREE.CylinderGeometry(1.6, 2, 1.2, 12), mat('#ffd23f', { metalness: .3 })); pedestal.position.set(0, .6, -44); scene.add(pedestal); plataformas.push({ x: 0, z: -44, r: 2, h: 1.2 });
    const cristal = malla(new THREE.OctahedronGeometry(1.1), new THREE.MeshStandardMaterial({ color: '#ffe14d', emissive: '#ffb800', emissiveIntensity: .8, metalness: .2, roughness: .2 })); cristal.position.set(0, 2.8, -44); scene.add(cristal);
    // barrera mágica en la puerta del castillo (se abre al superar la prueba)
    const barrera = malla(new THREE.BoxGeometry(6, 8, .4), new THREE.MeshStandardMaterial({ color: '#a78bfa', transparent: true, opacity: .55, emissive: '#7b2ff7', emissiveIntensity: .6 }), false); barrera.position.set(0, 4, -37); scene.add(barrera);
    // escalones y plataformas (para saltar) con monedas encima
    for (const [x, z, h] of [[-18, 4, 1.5], [-22, 0, 3], [-26, -5, 4.5], [20, 6, 1.5], [24, 2, 3]]) { const p = malla(new THREE.CylinderGeometry(2.2, 2.4, h, 10), mat('#c9a77a')); p.position.set(x, h / 2, z); scene.add(p); plataformas.push({ x, z, r: 2.2, h }); }
    // árboles y rocas
    const arbol = (x, z, s = 1) => { const g = new THREE.Group(); const tr = malla(new THREE.CylinderGeometry(.4 * s, .6 * s, 3 * s, 7), mat('#8b5a2b')); tr.position.y = 1.5 * s; g.add(tr); const co = malla(new THREE.IcosahedronGeometry(2.2 * s, 0), mat(['#3fa34d', '#4cbb5a', '#2f8f45'][Math.floor(Math.random() * 3)])); co.position.y = 4.2 * s; g.add(co); g.position.set(x, 0, z); scene.add(g); colis.push([x, z, .9 * s]); };
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 46; i++) { const an = Math.random() * Math.PI * 2, r = rnd(32, 66); const x = Math.cos(an) * r, z = Math.sin(an) * r; if (z < -30 && Math.abs(x) < 22) continue; arbol(x, z, rnd(.8, 1.4)); }
    for (let i = 0; i < 6; i++) { const isla = new THREE.Group(), r = rnd(3, 6); const top = malla(new THREE.CylinderGeometry(r, r * .9, 1.2, 8), mat('#6fbf55'), false); isla.add(top); const base = malla(new THREE.ConeGeometry(r * .9, r * 1.6, 8), mat('#a0764a'), false); base.rotation.x = Math.PI; base.position.y = -r * .85; isla.add(base); isla.position.set(rnd(-80, 80), rnd(22, 40), rnd(-90, -20)); isla.userData.f = Math.random() * 6; scene.add(isla); }
    // Sabio Búho (NPC) junto a la puerta
    const buho = new THREE.Group(); { const cuerpo = malla(new THREE.SphereGeometry(1.1, 16, 12), mat('#9a6b3f')); cuerpo.scale.y = 1.2; cuerpo.position.y = 1.4; buho.add(cuerpo); const panza = malla(new THREE.SphereGeometry(.8, 14, 10), mat('#f1dcb7')); panza.position.set(0, 1.25, .45); buho.add(panza);
      for (const sx of [-.42, .42]) { const o = malla(new THREE.SphereGeometry(.34, 12, 10), mat('#ffffff')); o.position.set(sx, 2.15, .82); buho.add(o); const pu = malla(new THREE.SphereGeometry(.15, 8, 8), mat('#222')); pu.position.set(sx, 2.15, 1.12); buho.add(pu); const ga = malla(new THREE.TorusGeometry(.36, .05, 6, 16), mat('#ffd23f', { metalness: .5 })); ga.position.set(sx, 2.15, 1.05); buho.add(ga); }
      const pico = malla(new THREE.ConeGeometry(.15, .35, 6), mat('#f5a623')); pico.rotation.x = Math.PI / 2; pico.position.set(0, 1.85, 1.08); buho.add(pico); const som = malla(new THREE.ConeGeometry(1.1, 1.8, 12), mat('#5b21b6')); som.position.y = 3.3; buho.add(som); const ala = malla(new THREE.CylinderGeometry(.04, .04, 3, 6), mat('#8b5a2b')); ala.position.set(1.3, 1.8, 0); buho.add(ala); const est = malla(new THREE.OctahedronGeometry(.3), mat('#ffd23f', { emissive: '#ffb800', emissiveIntensity: .8 })); est.position.set(1.3, 3.4, 0); buho.add(est); }
    buho.position.set(6, 0, -31); buho.rotation.y = -.6; scene.add(buho); colis.push([6, -31, 1.3]);
    // Estrellín (guía): flota y apunta al siguiente objetivo
    const estrellin = malla(new THREE.OctahedronGeometry(.45), new THREE.MeshStandardMaterial({ color: '#fff36b', emissive: '#ffd000', emissiveIntensity: 1 }), false); scene.add(estrellin);

    // Yupi: la "Y" dorada con corona, ojos, guantes, zapatillas y capa morada
    const yupi = new THREE.Group(), cuerpoY = new THREE.Group(); yupi.add(cuerpoY);
    { const oro = mat('#ffcf2e', { metalness: .25, roughness: .4, flatShading: false });
      const tallo = malla(new THREE.BoxGeometry(.7, 1.3, .55), oro); tallo.position.y = 1.15; cuerpoY.add(tallo);
      for (const s of [-1, 1]) { const br = malla(new THREE.BoxGeometry(.65, 1.4, .55), oro); br.position.set(s * .55, 2.25, 0); br.rotation.z = -s * .55; cuerpoY.add(br); }
      for (const s of [-1, 1]) { const ojo = malla(new THREE.SphereGeometry(.2, 12, 10), mat('#ffffff', { flatShading: false })); ojo.position.set(s * .2, 2.0, .3); cuerpoY.add(ojo); const iris = malla(new THREE.SphereGeometry(.11, 10, 8), mat('#2b7fff', { flatShading: false })); iris.position.set(s * .2, 2.0, .46); cuerpoY.add(iris); }
      const boca = malla(new THREE.TorusGeometry(.15, .04, 6, 12, Math.PI), mat('#7a1d2f')); boca.position.set(0, 1.72, .29); boca.rotation.z = Math.PI; cuerpoY.add(boca);
      const corona = new THREE.Group(); const aro = malla(new THREE.CylinderGeometry(.42, .45, .25, 12, 1, true), mat('#ffb300', { metalness: .6, roughness: .3, side: THREE.DoubleSide })); corona.add(aro);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, pk = malla(new THREE.ConeGeometry(.1, .3, 6), mat('#ffb300', { metalness: .6 })); pk.position.set(Math.cos(a) * .4, .25, Math.sin(a) * .4); corona.add(pk); }
      const gema = malla(new THREE.OctahedronGeometry(.11), mat('#3aa0ff', { emissive: '#1d6fff', emissiveIntensity: .5 })); gema.position.set(0, .05, .44); corona.add(gema); corona.position.set(0, 3.05, 0); cuerpoY.add(corona);
      for (const s of [-1, 1]) { const gu = malla(new THREE.SphereGeometry(.26, 12, 10), mat('#ffffff', { flatShading: false })); gu.position.set(s * 1.05, 2.75, .1); cuerpoY.add(gu); }
      const capa = malla(new THREE.PlaneGeometry(.95, 1.25), mat('#7b2ff7', { side: THREE.DoubleSide })); capa.position.set(0, 1.45, -.33); capa.rotation.x = .12; cuerpoY.add(capa); yupi.userData.capa = capa; }
    const piernas = []; for (const s of [-1, 1]) { const g = new THREE.Group(); const pi = malla(new THREE.BoxGeometry(.18, .5, .18), mat('#ffcf2e')); pi.position.y = -.25; g.add(pi); const za = malla(new THREE.BoxGeometry(.38, .22, .55), mat('#ffffff')); za.position.set(0, -.55, .08); g.add(za); g.position.set(s * .2, .62, 0); yupi.add(g); piernas.push(g); }
    scene.add(yupi);

    // Monedas, enemigos y misiones
    const monedas = []; const geoM = new THREE.CylinderGeometry(.45, .45, .12, 18), matM = mat('#ffd23f', { metalness: .4, roughness: .3, emissive: '#c98a00', emissiveIntensity: .45, flatShading: false });
    const ponMoneda = (x, y, z) => { const m = malla(geoM, matM, false); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); scene.add(m); monedas.push(m); };
    for (const p of plataformas) if (p.h < 2 || p.x) ponMoneda(p.x, p.h + 1, p.z);
    for (let i = 0; i < 9; i++) ponMoneda(rnd(-3, 3), 1, 18 - i * 5);
    for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; ponMoneda(Math.cos(an) * 14 + 20, 1, Math.sin(an) * 8 + 20); }
    const enemigos = [];
    const gorgojito = (x, z) => { const g = new THREE.Group(); const c = malla(new THREE.SphereGeometry(.85, 14, 10), mat('#6d28d9', { metalness: .4, roughness: .35 })); c.scale.set(1, .7, 1.2); c.position.y = .7; g.add(c); const ca = malla(new THREE.SphereGeometry(.5, 12, 10), mat('#4c1d95')); ca.position.set(0, .9, .85); g.add(ca);
      for (const s of [-1, 1]) { const o = malla(new THREE.SphereGeometry(.13, 8, 8), mat('#ff4d4d', { emissive: '#ff0000', emissiveIntensity: .4 })); o.position.set(s * .18, 1.05, 1.25); g.add(o); const an = malla(new THREE.CylinderGeometry(.03, .03, .6, 5), mat('#1e0b3d')); an.position.set(s * .2, 1.45, 1.05); an.rotation.z = s * .5; g.add(an); }
      g.position.set(x, 0, z); scene.add(g); enemigos.push({ g, tipo: 'gorgojito', x0: x, z0: z, f: Math.random() * 6, vivo: true, r: 1.1 }); };
    const babosa = (x, z) => { const g = new THREE.Group(); const c = malla(new THREE.CapsuleGeometry(.55, 1, 6, 10), mat('#7ee05a', { flatShading: false })); c.rotation.x = Math.PI / 2; c.position.y = .55; g.add(c);
      for (const s of [-1, 1]) { const o = malla(new THREE.SphereGeometry(.16, 8, 8), mat('#ffffff')); o.position.set(s * .22, 1.2, .55); g.add(o); const pu = malla(new THREE.SphereGeometry(.08, 6, 6), mat('#222')); pu.position.set(s * .22, 1.22, .68); g.add(pu); }
      g.position.set(x, 0, z); scene.add(g); enemigos.push({ g, tipo: 'babosa', x0: x, z0: z, f: Math.random() * 6, vivo: true, r: 1, vy: 0, y: 0 }); };
    gorgojito(-10, 6); gorgojito(10, -10); gorgojito(-14, -22); gorgojito(18, 18); babosa(-20, 18); babosa(22, -14); babosa(4, -20);

    const MIS = [{ txt: 'Recoge 10 monedas del reino', ok: () => mon >= 10 }, { txt: 'Habla con el Sabio Búho y supera su prueba', ok: () => prueba }, { txt: 'Derrota 3 gorgojitos y recupera el Cristal Amarillo', ok: () => cristalOk }];
    let mi = 0, mon = 0, vidas = 3, prueba = false, cristalOk = false, derrotados = 0, invul = 0, giroT = 0, tiempo = 0, fin = false, pausa = false;
    const pintarHUD = () => { $('#avvida').textContent = '❤️'.repeat(vidas) + '🖤'.repeat(3 - vidas); $('#avmon').textContent = mon; $('#avmis').innerHTML = mi < 3 ? `🎯 <b>Misión ${mi + 1}/3:</b> ${MIS[mi].txt}${mi === 0 ? ` (${Math.min(mon, 10)}/10)` : mi === 2 ? ` (${Math.min(derrotados, 3)}/3)` : ''}` : '🏆 ¡Reino salvado!'; };
    const msg = (t, sub = '', ms = 2600) => { const d = $('#avmsg'); d.innerHTML = t + (sub ? `<small>${sub}</small>` : ''); d.style.opacity = 1; clearTimeout(d._t); d._t = setTimeout(() => d.style.opacity = 0, ms); };
    const son = n => { try { FX.son(n); } catch (e) {} };
    const avanzarMision = () => { while (mi < 3 && MIS[mi].ok()) { mi++; son('nivel'); if (mi < 3) msg('✅ ¡Misión cumplida!', MIS[mi].txt); } pintarHUD(); if (mi >= 3 && !fin) victoria(); };
    pintarHUD(); setTimeout(() => msg('👑 ¡Recupera el Cristal Amarillo!', 'Sigue a Estrellín ⭐'), 600);

    // Controles: teclado, joystick táctil, cámara orbital
    const pos = new V3(0, 0, 26), vel = new V3(); let ry = Math.PI, yaw = 0, pitch = .42, dist = innerHeight > innerWidth ? 13 : 10, enSuelo = true, saltos = 0, cerca = false;
    const tec = {}, joy = { id: null, x0: 0, y0: 0, x: 0, y: 0 }, giro = { id: null, x: 0, y: 0 }, tactil = matchMedia('(pointer:coarse)').matches;
    const kd = e => { if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return; const k = e.key.toLowerCase(); tec[k] = true; if (k === ' ') { e.preventDefault(); saltar(); } if (k === 'q') girar(); if (k === 'e') hablar(); };
    const ku = e => { tec[e.key.toLowerCase()] = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    cv.addEventListener('pointerdown', e => { $('#avayuda').style.opacity = 0;
      if (tactil && e.clientX < innerWidth * .45 && joy.id === null) { joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; const j = $('#avjoy'); j.style.display = 'block'; j.style.left = (e.clientX - 60) + 'px'; j.style.top = (e.clientY - 60) + 'px'; }
      else if (giro.id === null) { giro.id = e.pointerId; giro.x = e.clientX; giro.y = e.clientY; } cv.setPointerCapture?.(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (e.pointerId === joy.id) { let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const l = Math.hypot(dx, dy); if (l > 50) { dx *= 50 / l; dy *= 50 / l; } joy.x = dx / 50; joy.y = -dy / 50; $('#avjoy i').style.transform = `translate(${dx}px,${dy}px)`; }
      if (e.pointerId === giro.id) { yaw -= (e.clientX - giro.x) * .006; pitch = Math.max(.1, Math.min(1.15, pitch + (e.clientY - giro.y) * .004)); giro.x = e.clientX; giro.y = e.clientY; } });
    const suelta = e => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; $('#avjoy').style.display = 'none'; $('#avjoy i').style.transform = ''; } if (e.pointerId === giro.id) giro.id = null; };
    cv.addEventListener('pointerup', suelta); cv.addEventListener('pointercancel', suelta);
    cv.addEventListener('wheel', e => { dist = Math.max(5, Math.min(16, dist + e.deltaY * .01)); }, { passive: true });
    function saltar() { if (pausa || fin) return; if (enSuelo) { vel.y = 11; enSuelo = false; saltos = 1; son('salto'); } else if (saltos < 2) { vel.y = 9.5; saltos = 2; son('salto'); } }
    function girar() { if (pausa || fin || giroT > 0) return; giroT = .9; son('pop');
      for (const en of enemigos) if (en.vivo && Math.hypot(en.g.position.x - pos.x, en.g.position.z - pos.z) < 3.2) derrotar(en); }
    function derrotar(en) { en.vivo = false; derrotados += en.tipo === 'gorgojito' ? 1 : 0; mon += 2; son('moneda'); msg(en.tipo === 'gorgojito' ? '💥 ¡Gorgojito derrotado!' : '💥 ¡Babosa derrotada!', '+2 🪙'); en.muere = 1; avanzarMision(); pintarHUD(); }
    function hablar() { if (!cerca || pausa || fin) return; if (prueba) { msg('🦉 Sabio Búho', '¡Bien hecho! La puerta del castillo está abierta.'); return; } abrirPrueba(); }
    $('#avsalto').addEventListener('pointerdown', e => { e.preventDefault(); saltar(); });
    $('#avgiro').addEventListener('pointerdown', e => { e.preventDefault(); girar(); });
    $('#avhab').addEventListener('click', () => hablar());
    $('#avson').onclick = () => { const on = LS.get('arcSonido') === '0'; LS.set('arcSonido', on ? '1' : '0'); $('#avson').textContent = on ? '🔊' : '🔇'; };
    $('#avsal').onclick = () => { parar(); cerrar(ov); try { A.salir?.(); } catch (e) {} };

    // Prueba del Sabio Búho: 3 preguntas, hay que acertar 2. Fallar explica la respuesta y deja reintentar.
    function abrirPrueba() {
      pausa = true; const qs = PREGUNTAS.slice().sort(() => Math.random() - .5).slice(0, 3); let k = 0, bien = 0; const p = $('#avpanel'); p.style.display = 'block';
      const pinta = () => { const [q, ops] = qs[k]; p.innerHTML = `<h3>🦉 Prueba del Sabio Búho · ${k + 1}/3</h3><p class="avz-q">${q}</p>${ops.map((o, i) => `<button class="avz-op" data-o="${i}">${o}</button>`).join('')}<p class="avz-ex" id="avex"></p>`; };
      pinta();
      p.onclick = e => { const b = e.target.closest('[data-o]'); if (!b || b.disabled) return; const [, , ok, ex] = qs[k], acierto = +b.dataset.o === ok;
        p.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (+x.dataset.o === ok) x.classList.add('ok'); else if (x === b) x.classList.add('mal'); });
        $('#avex').textContent = (acierto ? '✅ ¡Correcto! ' : '💡 ') + ex; if (acierto) { bien++; son('moneda'); } else son('error');
        setTimeout(() => { k++; if (k < 3) return pinta();
          if (bien >= 2) { prueba = true; mon += 5; p.style.display = 'none'; pausa = false; msg('✨ ¡Superaste la prueba!', 'La barrera del castillo se abrió · +5 🪙'); barrera.userData.abrir = 1; try { PERFIL.evento('trivia'); } catch (er) {} avanzarMision(); }
          else { p.innerHTML = `<h3>🦉 ¡Casi!</h3><p>Acertaste ${bien} de 3. Necesitas 2 para abrir la puerta.</p><button class="avz-op ok" id="avotra">🔁 Intentar otra vez</button>`; $('#avotra').onclick = () => { p.style.display = 'none'; pausa = false; abrirPrueba(); }; } }, 1700); };
    }

    function victoria() {
      fin = true; const seg = Math.round(tiempo), estrellas = seg < 180 ? 3 : seg < 300 ? 2 : 1;
      const D = PERFIL.datos, J = D.juegos.aventura = Object.assign({ partidas: 0, record: 0, cristales: 0, mejorTiempo: 0 }, D.juegos.aventura || {});
      J.cristales = Math.max(J.cristales, 1); J.mejorTiempo = J.mejorTiempo ? Math.min(J.mejorTiempo, seg) : seg;
      try { PERFIL.ganar(mon); PERFIL.partida('aventura', mon * 10 + estrellas * 100); } catch (e) {}
      son('nivel'); try { FX.confeti?.(); } catch (e) {}
      const p = $('#avpanel'); p.style.display = 'block';
      p.innerHTML = `<h3>🏆 ¡Recuperaste el Cristal Amarillo!</h3><p style="font-size:2rem;margin:4px 0">${'⭐'.repeat(estrellas)}${'☆'.repeat(3 - estrellas)}</p><p>🪙 ${mon} monedas · ⏱️ ${seg} segundos · 💥 ${derrotados} gorgojitos</p><p class="avz-ex">Los otros 4 cristales están en el Bosque Encantado, el Imperio Dorado, el Volcán de Fuego y la Fortaleza de Grun… ¡muy pronto!</p>
        <button class="avz-op ok" id="avcomp">📤 Compartir mi récord</button><button class="avz-op" id="avotra">🔁 Jugar otra vez</button><button class="avz-op" id="avfin">🏠 Salir</button>`;
      $('#avcomp').onclick = () => { const txt = `👑 Recuperé el Cristal Amarillo en Yupitok: El Universo de las Aventuras en ${seg} segundos (${'⭐'.repeat(estrellas)}). ¿Puedes ganarme?`, url = location.origin + '/?g=arcade-aventura&src=reto-aventura'; if (navigator.share) navigator.share({ text: txt, url }).catch(() => {}); else open('https://wa.me/?text=' + encodeURIComponent(txt + ' ' + url), '_blank'); };
      $('#avotra').onclick = () => { parar(); ov.remove(); JUEGOS.aventura(t); };
      $('#avfin').onclick = () => { parar(); cerrar(ov); };
    }

    // Física simple: suelo, plataformas y colisiones circulares
    const alturaEn = (x, z) => { let h = 0; for (const p of plataformas) if (Math.hypot(x - p.x, z - p.z) < p.r) h = Math.max(h, p.h); return h; };
    const tmp = new V3(); let last = 0, raf = 0, vivo = true;
    function bucle(ts) {
      if (!vivo) return; raf = requestAnimationFrame(bucle); const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
      if (!pausa && !fin) {
        tiempo += dt; invul = Math.max(0, invul - dt); giroT = Math.max(0, giroT - dt);
        let ix = (tec.d || tec.arrowright ? 1 : 0) - (tec.a || tec.arrowleft ? 1 : 0) + joy.x, iz = (tec.w || tec.arrowup ? 1 : 0) - (tec.s || tec.arrowdown ? 1 : 0) + joy.y;
        const l = Math.hypot(ix, iz); if (l > 1) { ix /= l; iz /= l; }
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw), vx = (fx * iz + rx * ix) * 9, vz = (fz * iz + rz * ix) * 9;
        let nx = pos.x + vx * dt, nz = pos.z + vz * dt;
        for (const [cx, cz, cr] of colis) { const dx = nx - cx, dz = nz - cz, d = Math.hypot(dx, dz), m = cr + .6; if (d < m && d > 0) { nx = cx + dx / d * m; nz = cz + dz / d * m; } }
        if (!prueba && nz < -36.2 && nz > -38 && Math.abs(nx) < 3.2) nz = -36.2; // barrera mágica
        const rr = Math.hypot(nx, nz); if (rr > 68) { nx *= 68 / rr; nz *= 68 / rr; }
        const hS = alturaEn(nx, nz); if (hS > pos.y + .6 && enSuelo) { nx = pos.x; nz = pos.z; }
        pos.x = nx; pos.z = nz; if (Math.hypot(vx, vz) > .5) ry = Math.atan2(vx, vz);
        vel.y -= 26 * dt; pos.y += vel.y * dt; const hSuelo = alturaEn(pos.x, pos.z);
        if (pos.y <= hSuelo) { if (!enSuelo && vel.y < -2) son('pop'); pos.y = hSuelo; vel.y = 0; enSuelo = true; saltos = 0; } else enSuelo = false;
        // monedas
        for (const m of monedas) if (m.visible) { m.rotation.z += dt * 3; if (Math.hypot(m.position.x - pos.x, m.position.z - pos.z) < 1.2 && Math.abs(m.position.y - (pos.y + 1)) < 1.6) { m.visible = false; mon++; son('moneda'); pintarHUD(); avanzarMision(); } }
        // enemigos
        for (const en of enemigos) { const g = en.g;
          if (en.muere) { en.muere += dt * 3; g.scale.setScalar(Math.max(0, 1 - (en.muere - 1))); g.rotation.y += dt * 12; if (en.muere > 2) { g.visible = false; en.muere = 0; } continue; }
          if (!en.vivo) continue; en.f += dt;
          if (en.tipo === 'gorgojito') { const tx = en.x0 + Math.sin(en.f * .6) * 6, tz = en.z0 + Math.cos(en.f * .45) * 4; const ang = Math.atan2(tx - g.position.x, tz - g.position.z); g.position.x = tx; g.position.z = tz; g.rotation.y = ang; g.position.y = Math.abs(Math.sin(en.f * 8)) * .1; }
          else { const d = Math.hypot(pos.x - g.position.x, pos.z - g.position.z); en.vy -= 20 * dt; en.y += en.vy * dt; if (en.y <= 0) { en.y = 0; en.vy = d < 14 ? 7 : 4; } if (en.y > 0 && d < 14) { g.position.x += (pos.x - g.position.x) / d * 3 * dt; g.position.z += (pos.z - g.position.z) / d * 3 * dt; g.rotation.y = Math.atan2(pos.x - g.position.x, pos.z - g.position.z); } g.position.y = en.y; g.scale.y = 1 + (en.y > 0 ? .15 : -.1); }
          const d = Math.hypot(pos.x - g.position.x, pos.z - g.position.z);
          if (d < en.r + .5) { if (vel.y < -1 && pos.y > g.position.y + .5) { derrotar(en); vel.y = 9; } else if (!invul) { vidas--; invul = 1.5; son('error'); vel.y = 7; const k = 4 / Math.max(.1, d); pos.x += (pos.x - g.position.x) * k * .3; pos.z += (pos.z - g.position.z) * k * .3; pintarHUD();
            if (vidas <= 0) { vidas = 3; pos.set(0, 0, 26); msg('😵 ¡Uy! Vuelves al inicio', 'Tus monedas se quedan contigo'); pintarHUD(); } else msg('💢 ¡Auch!', 'Salta encima de los enemigos o usa el giro 👑', 1600); } } }
        // Sabio Búho: botón para hablar
        cerca = Math.hypot(pos.x - buho.position.x, pos.z - buho.position.z) < 4; $('#avhab').style.display = cerca ? 'block' : 'none';
        // cristal: se recoge con la misión 2 y 3 gorgojitos
        if (!cristalOk && Math.hypot(pos.x - cristal.position.x, pos.z - cristal.position.z) < 2.2 && pos.y > .8) { if (derrotados >= 3) { cristalOk = true; cristal.visible = false; avanzarMision(); } else msg('🔒 El cristal está protegido', `Derrota ${3 - derrotados} gorgojito(s) más`, 1500); }
      }
      // animaciones
      yupi.position.copy(pos); yupi.rotation.y = ry; const mov = Math.hypot(joy.x, joy.y) > .1 || ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(k => tec[k]);
      const tt = ts / 1000; piernas[0].rotation.x = mov && enSuelo ? Math.sin(tt * 12) * .7 : 0; piernas[1].rotation.x = -piernas[0].rotation.x; cuerpoY.position.y = mov && enSuelo ? Math.abs(Math.sin(tt * 12)) * .08 : Math.sin(tt * 2) * .03;
      cuerpoY.rotation.y = giroT > 0 ? (1 - giroT / .9) * Math.PI * 4 : 0; yupi.userData.capa.rotation.x = .12 + (mov ? .35 : .05) + Math.sin(tt * 6) * .05; yupi.visible = !(invul > 0 && Math.floor(tt * 12) % 2);
      cristal.rotation.y += .02; cristal.position.y = 2.8 + Math.sin(tt * 2) * .2;
      if (barrera.userData.abrir) { barrera.material.opacity = Math.max(0, barrera.material.opacity - .01); barrera.position.y += .04; if (barrera.material.opacity <= 0) barrera.visible = false; }
      buho.position.y = Math.sin(tt * 1.5) * .05;
      scene.children.forEach(o => { if (o.userData.f !== undefined) o.position.y += Math.sin(tt + o.userData.f) * .005; });
      const meta = mi === 0 ? (monedas.find(m => m.visible)?.position || cristal.position) : mi === 1 ? buho.position : cristal.position;
      tmp.set(pos.x, pos.y + 3.6, pos.z).lerp(new V3(meta.x, pos.y + 3.6, meta.z), .12); estrellin.position.lerp(tmp, .08); estrellin.rotation.y += .05;
      // cámara
      const cx = pos.x + Math.sin(yaw) * Math.cos(pitch) * dist, cz = pos.z + Math.cos(yaw) * Math.cos(pitch) * dist, cy = pos.y + 1.5 + Math.sin(pitch) * dist;
      cam.position.lerp(new V3(cx, cy, cz), .15); cam.lookAt(pos.x, pos.y + 1.8, pos.z); sol.position.set(pos.x + 30, 50, pos.z + 20); sol.target.position.copy(pos);
      renderer.render(scene, cam);
    }
    raf = requestAnimationFrame(t0 => { last = t0; raf = requestAnimationFrame(bucle); });
    setTimeout(() => { const a = $('#avayuda'); if (a) a.style.opacity = 0; }, 8000);
    function parar() { vivo = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('resize', tam); try { renderer.dispose(); } catch (e) {} }
    setParar(() => { parar(); cerrar(ov); });
    window.__aventura = { get estado() { return { mi, mon, vidas, prueba, cristalOk, derrotados, pos: [pos.x, pos.y, pos.z] }; }, tp: (x, z) => { pos.x = x; pos.z = z; }, ganarMonedas: n => { mon += n; avanzarMision(); }, derrotarTodos: () => enemigos.filter(e => e.tipo === 'gorgojito').forEach(derrotar) };
  }

  function css() {
    if (document.getElementById('avzcss')) return; const s = document.createElement('style'); s.id = 'avzcss'; s.textContent = `
    #avz{position:fixed;inset:0;z-index:60;background:radial-gradient(circle at 50% 0,#5b3fc4,#160d40 60%,#07041a);color:#fff;font-family:Figtree,system-ui,sans-serif;overflow:auto;touch-action:none;user-select:none}
    #avz canvas{position:fixed;inset:0;width:100%;height:100%;display:block}
    .avz-menu{max-width:860px;margin:0 auto;padding:22px 14px 40px;text-align:center}
    .avz-logo{font:900 2.6rem Figtree,sans-serif;color:#ffd23f;text-shadow:0 4px 0 #b35c00,0 0 24px rgba(255,61,240,.6)}.avz-logo small{display:block;font-size:1rem;color:#fff;text-shadow:0 2px 8px #000;letter-spacing:.06em}
    .avz-lema{font-weight:800;color:#22e6ff;margin:6px 0}.avz-hist{opacity:.9;max-width:560px;margin:8px auto}
    .avz-pers{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin:10px 0 16px}
    .avz-p{border:2px solid rgba(255,255,255,.18);border-radius:18px;background:linear-gradient(160deg,rgba(139,92,246,.45),rgba(15,10,40,.85));color:#fff;padding:10px 6px;cursor:pointer;font:inherit}
    .avz-p span{font-size:2.2rem;display:block}.avz-p b{display:block;font-size:.9rem}.avz-p small{font-size:.7rem;opacity:.85}
    .avz-p:not(.lock){border-color:#ffd23f;box-shadow:0 0 18px rgba(255,210,63,.5)}.avz-p.lock{filter:grayscale(.6);opacity:.75}
    .avz-bts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.avz-go{border:0;border-radius:16px;padding:14px 26px;font:900 1.15rem Figtree,sans-serif;color:#fff;background:linear-gradient(90deg,#22e6ff,#8b5cf6,#ff3df0);cursor:pointer}
    .avz-x{border:1px solid rgba(255,255,255,.3);border-radius:16px;padding:14px 20px;background:transparent;color:#fff;font:800 1rem Figtree,sans-serif;cursor:pointer}
    .avz-carga{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-weight:800}
    .avz-hud{position:fixed;left:10px;top:10px;padding:9px 12px;border-radius:16px;background:rgba(15,10,40,.6);backdrop-filter:blur(8px);font-size:.9rem;line-height:1.5;max-width:66vw;z-index:2}
    .avz-top{position:fixed;right:10px;top:10px;display:flex;gap:6px;z-index:2}
    .avz-b{border:1px solid rgba(255,255,255,.25);border-radius:14px;padding:8px 12px;background:rgba(15,10,40,.6);backdrop-filter:blur(8px);color:#fff;font:800 1rem Figtree,sans-serif;cursor:pointer;z-index:2}
    .avz-bt{position:fixed;width:74px;height:74px;border-radius:50%;font-size:1.8rem;padding:0}#avsalto{right:16px;bottom:26px}#avgiro{right:98px;bottom:30px;width:60px;height:60px;font-size:1.5rem}#avhab{right:16px;bottom:112px;background:#ff3df0}
    #avmsg{position:fixed;left:50%;top:22%;transform:translate(-50%,-50%);text-align:center;font:900 1.6rem Figtree,sans-serif;text-shadow:0 3px 12px rgba(0,0,0,.7);pointer-events:none;transition:opacity .4s;opacity:0;width:92vw;z-index:2}#avmsg small{display:block;font-size:.95rem;font-weight:700;margin-top:6px}
    #avjoy{position:fixed;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35);display:none;pointer-events:none;z-index:2}#avjoy i{position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.75)}
    #avayuda{position:fixed;left:50%;bottom:118px;transform:translateX(-50%);padding:8px 14px;border-radius:14px;background:rgba(15,10,40,.6);font-size:.85rem;text-align:center;pointer-events:none;transition:opacity .6s;z-index:2;width:max-content;max-width:90vw}
    #avpanel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,420px);max-height:84vh;overflow:auto;padding:18px;border-radius:20px;background:rgba(15,10,40,.92);border:2px solid #ffd23f;display:none;text-align:center;z-index:3}
    #avpanel h3{margin:2px 0 10px;color:#ffd23f}.avz-q{font-size:1.15rem;font-weight:800}.avz-op{display:block;width:100%;margin:8px 0;padding:12px;border-radius:14px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font:800 1rem Figtree,sans-serif;cursor:pointer}
    .avz-op.ok{background:#16a34a;border-color:#4ade80}.avz-op.mal{background:#b91c1c;border-color:#f87171}.avz-ex{font-size:.9rem;opacity:.9;min-height:1.2em}`;
    document.head.append(s);
  }
})();
