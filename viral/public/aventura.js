// 👑 YUPITOK: El Universo de las Aventuras — Fase 2. Motor 3D propio sobre Three.js (MIT).
// Equipo jugable: Yupi (doble salto y giro de corona), Lulú (escupitajo de nubes), Choki (lanzazo solar) y Coquito (coraza).
// Mundo 1, Reino de Yupitok: 3 niveles + el jefe Gorgojo Capitán. Banco de 100 preguntas (+ las que agregues en el panel).
// Todo es original de Yupitok. Diseño completo: YUPITOK_AVENTURAS_DISENO.md
(() => {
  const A = window.ARC_API; if (!A) return; const { JUEGOS, salir } = A, setParar = A.setParar;
  const cargarThree = () => window.THREE ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/three.min.js?v=149'; s.onload = ok; s.onerror = no; document.head.append(s); });
  const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PERS = [
    ['yupi', '👑', 'Yupi', 'Doble salto y giro de corona', 0], ['lulu', '🦙', 'Lulú', 'Salto alto y escupitajo de nubes', 0], ['choki', '🌽', 'Choki', 'Lanzazo solar: rompe el oro', 0], ['coquito', '🥥', 'Coquito', 'Coraza y fuerza', 0],
    ['rocoto', '🌶️', 'Rocoto Rojo', 'Carrera picante', 3], ['buho', '🦉', 'Sabio Búho', 'Maestro de la magia', 3], ['yuki', '🤖', 'Robo Yuki', 'Gancho magnético', 3], ['hada', '🧚', 'Hada Aprendiz', 'Curación', 3],
    ['estrellin', '⭐', 'Estrellín', 'Guía mágico', 4], ['tortugo', '🐢', 'Tortugo', 'Caparazón rodante', 4], ['drakito', '🐉', 'Drakito Azul', 'Vuelo corto', 4], ['grun', '🪲', 'Gorgojo Grun', '¿Villano… o amigo?', 5],
  ];
  const EQUIPO = {
    yupi: { e: '👑', n: 'Yupi', vel: 9, salto: 11, saltos: 2, hab: 'giro', btn: '👑', txt: 'Doble salto y giro de corona' },
    lulu: { e: '🦙', n: 'Lulú', vel: 9.5, salto: 12.5, saltos: 1, hab: 'nube', btn: '☁️', txt: 'Salto alto y escupitajo de nubes: llega lejos y alto' },
    choki: { e: '🌽', n: 'Choki', vel: 8.5, salto: 11, saltos: 1, hab: 'lanza', btn: '🔱', txt: 'Lanzazo solar: rompe los muros de oro' },
    coquito: { e: '🥥', n: 'Coquito', vel: 7.5, salto: 10.5, saltos: 1, hab: 'coraza', btn: '🛡️', txt: 'Coraza: no recibe daño y empuja rocas pesadas' },
  }, ORDEN = ['yupi', 'lulu', 'choki', 'coquito'];
  const NIVELES = [
    { n: 'La Pradera del Búho', e: '🌼', d: 'Junta monedas, supera la prueba del Sabio Búho y entra al castillo.', t: [150, 260] },
    { n: 'Los Muros de Oro', e: '🧱', d: 'Choki rompe el oro, Lulú toca las campanas y Coquito empuja la roca mágica.', t: [210, 360] },
    { n: 'Las Islas del Cielo', e: '☁️', d: 'Salta de isla en isla hasta el portal del cielo.', t: [150, 280] },
    { n: 'Jefe: Gorgojo Capitán', e: '🪲', d: 'Esquiva sus embestidas, haz que se maree y recupera el Cristal Amarillo.', t: [120, 220], jefe: 1 },
  ];
  // Banco de preguntas: archivo base (100+) + las que agregues en el panel → Ajustes → 👑 Aventuras. Formato: materia|pregunta|correcta|incorrecta|incorrecta|explicación
  const PREG_BASE = ['Matemáticas|¿Cuánto es 7 × 8?|56|54|64|7 × 8 = 56.', 'Ciencias|¿Qué planeta es conocido como el planeta rojo?|Marte|Venus|Júpiter|Marte se ve rojo por el óxido de hierro de su suelo.', 'Historia y Geografía|¿Cuál es la capital del Perú?|Lima|Cusco|Arequipa|Lima es la capital del Perú.', 'Valores|Si un amigo se cae, ¿qué es lo correcto?|Ayudarlo|Reírme|Irme|Ayudar a los demás nos hace mejores amigos.'];
  let BANCO = null;
  const leerPreg = l => { const p = String(l || '').split('|').map(s => s.trim()); if (p.length < 5 || !p[1] || !p[2] || !p[3]) return null; const ex = p.length >= 6 ? p[p.length - 1] : '', malas = (p.length >= 6 ? p.slice(3, -1) : p.slice(3)).filter(Boolean).slice(0, 3); return malas.length ? { mat: p[0] || 'General', q: p[1], ok: p[2], malas, ex } : null; };
  const cargarBanco = () => BANCO ? Promise.resolve(BANCO) : Promise.all([
    fetch('/aventura-preguntas.json?v=1').then(r => r.json()).then(j => j.preguntas || []).catch(() => []),
    fetch('/api/aventura/preguntas').then(r => r.json()).then(j => j.lineas || []).catch(() => []),
  ]).then(([a, b]) => { const l = [...b, ...a].map(leerPreg).filter(Boolean); BANCO = l.length >= 3 ? l : PREG_BASE.map(leerPreg); return BANCO; });

  JUEGOS.aventura = t => {
    salir(); try { registrar(t.id); } catch (e) {}
    portada(t);
  };
  const datosJ = () => { const D = PERFIL.datos, prev = D.juegos.aventura || {}; if (prev.nivel === undefined && prev.cristales) { prev.nivel = 1; prev.cristales = 0; } // progreso de la Fase 1 → nivel 1 completado
    const J = D.juegos.aventura = Object.assign({ partidas: 0, record: 0, cristales: 0, mejorTiempo: 0, nivel: 0, est: [0, 0, 0, 0], pj: 'yupi' }, prev); if (!Array.isArray(J.est)) J.est = [0, 0, 0, 0]; return J; };

  // ---------- Pantalla de inicio: héroe y nivel ----------
  function portada(t) {
    css(); const J = datosJ(); let pj = ORDEN.includes(J.pj) ? J.pj : 'yupi', niv = Math.min(J.nivel, NIVELES.length - 1);
    const ov = document.createElement('div'); ov.id = 'avz'; document.body.append(ov); document.body.style.overflow = 'hidden';
    const pinta = () => { ov.innerHTML = `<div class="avz-menu"><div class="avz-logo">👑 YUPITOK<small>El Universo de las Aventuras</small></div>
      <p class="avz-lema">¡Juega, ríe, aprende y gana!</p>
      <p class="avz-hist">Gorgojo Grun robó los <b>Cristales del Arcoíris</b> y el reino perdió su color. ¡Forma tu equipo y recupera el <b>Cristal Amarillo</b>!</p>
      <h3>1. Elige tu héroe</h3><div class="avz-pers">${PERS.map(([id, e, n, h, f]) => `<button class="avz-p ${f ? 'lock' : ''} ${id === pj ? 'sel' : ''}" data-p="${id}"><span>${e}</span><b>${n}</b><small>${f ? `🔒 Fase ${f}` : h}</small></button>`).join('')}</div>
      <p class="avz-hist" style="font-size:.85rem">🔄 En el juego cambias de héroe cuando quieras: cada uno tiene un poder distinto.</p>
      <h3>2. Elige el nivel · Mundo 1: Reino de Yupitok</h3><div class="avz-niveles">${NIVELES.map((Nv, i) => { const ok = i <= J.nivel, e = J.est[i] || 0; return `<button class="avz-n ${ok ? '' : 'lock'} ${i === niv ? 'sel' : ''}" data-n="${i}"><span>${ok ? Nv.e : '🔒'}</span><b>${Nv.jefe ? '👹 Jefe' : 'Nivel ' + (i + 1)}</b><small>${escH(Nv.n)}</small><em>${'⭐'.repeat(e)}${'☆'.repeat(3 - e)}</em></button>`; }).join('')}</div>
      <p class="avz-hist">${escH(NIVELES[niv].d)}</p>
      ${J.cristales ? '<p class="avz-hist">💛 ¡Ya recuperaste el Cristal Amarillo! El Bosque Encantado y el Imperio Dorado llegan en la Fase 3.</p>' : ''}
      <div class="avz-bts"><button class="avz-go" data-go="1">▶ Jugar con ${EQUIPO[pj].e} ${EQUIPO[pj].n}</button><button class="avz-x" data-x="1">✕ Salir</button></div></div>`; };
    pinta();
    ov.onclick = e => {
      const p = e.target.closest('[data-p]'), n = e.target.closest('[data-n]');
      if (p) { const P = PERS.find(x => x[0] === p.dataset.p); if (P[4]) { toast(`${P[1]} ${P[2]} llega en la Fase ${P[4]} del universo Yupitok. ¡Muy pronto!`); return; } pj = P[0]; J.pj = pj; pinta(); return; }
      if (n) { const i = +n.dataset.n; if (i > J.nivel) { toast('🔒 Completa el nivel anterior para abrir este'); return; } niv = i; pinta(); return; }
      if (e.target.closest('[data-x]')) { cerrar(ov); return; }
      if (e.target.closest('[data-go]')) lanzar(t, ov, pj, niv);
    };
    setParar(() => cerrar(ov));
  }
  function lanzar(t, ov, pj, niv) { ov.onclick = null; ov.innerHTML = `<div class="avz-carga"><div style="font-size:3rem">${EQUIPO[pj].e}</div>Preparando ${escH(NIVELES[niv].n)}…</div>`; Promise.all([cargarThree(), cargarBanco()]).then(() => jugar(t, ov, { pj, niv })).catch(() => { toast('No se pudo cargar el 3D'); cerrar(ov); }); }
  function cerrar(ov) { ov?.remove(); document.body.style.overflow = ''; }

  // ---------- El juego ----------
  function jugar(t, ov, cfg) {
    const THREE = window.THREE, V3 = THREE.Vector3;
    ov.innerHTML = `<canvas id="avc"></canvas>
      <div class="avz-hud"><div id="avvida">❤️❤️❤️</div><div>🪙 <b id="avmon">0</b></div><div id="avmis"></div></div>
      <div class="avz-top"><button class="avz-b" id="avcambio">🔄</button><button class="avz-b" id="avson">${LS.get('arcSonido') === '0' ? '🔇' : '🔊'}</button><button class="avz-b" id="avsal">✕</button></div>
      <div id="avmsg"></div><div id="avjefe"><b>🪲 Gorgojo Capitán</b><i><u></u></i></div><div id="avjoy"><i></i></div>
      <button class="avz-b avz-bt" id="avsalto">⤒</button><button class="avz-b avz-bt" id="avgiro">👑</button><button class="avz-b avz-bt" id="avhab" style="display:none">💬</button>
      <div id="avpanel"></div>
      <div id="avayuda">${matchMedia('(pointer:coarse)').matches ? '👈 Muévete con el dedo a la izquierda · Gira la cámara arrastrando a la derecha 👉 · 🔄 cambia de héroe' : 'WASD o flechas: moverte · Espacio: saltar · Q: poder del héroe · C o 1-4: cambiar de héroe · E: hablar · Arrastra para girar la cámara'}</div>`;
    const $ = s => ov.querySelector(s), cv = $('#avc');
    let renderer; try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) { toast('Tu equipo no soporta 3D'); cerrar(ov); return; }
    const tactilR = matchMedia('(pointer:coarse)').matches; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, tactilR ? 1.6 : 2)); const CM = THREE.ColorManagement, cmAntes = CM ? CM.legacyMode : true; if (CM) CM.legacyMode = false; renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, .1, 500);
    scene.background = new THREE.Color('#9fd8ff'); scene.fog = new THREE.Fog('#c4e8ff', 90, 260);
    const tam = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }; tam(); addEventListener('resize', tam);
    scene.add(new THREE.HemisphereLight('#dff1ff', '#6a8f3a', .34)); const borde = new THREE.DirectionalLight('#bfe0ff', .35); borde.position.set(-30, 25, -40); scene.add(borde);
    const sol = new THREE.DirectionalLight('#ffeccc', 1.75); sol.position.set(30, 50, 20); sol.castShadow = true; sol.shadow.mapSize.set(tactilR ? 1024 : 2048, tactilR ? 1024 : 2048); sol.shadow.bias = -.0006; sol.shadow.normalBias = .02; Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 150 }); scene.add(sol); scene.add(sol.target);
    const grad = (() => { const tx = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1); tx.minFilter = tx.magFilter = THREE.NearestFilter; tx.needsUpdate = true; return tx; })();
    const ORO = new Set(['#ffc23d', '#ffcc33', '#ffb000', '#ffc81f', '#ffd23f', '#ffc83d', '#ffcf2e']);
    const MT = (o = {}) => { const { gradientMap, ...r } = o; return new THREE.MeshStandardMaterial({ roughness: .62, metalness: 0, ...r }); };
    const mat = (c, o = {}) => { const { metalness, roughness, flatShading, ...r } = o; const oro = ORO.has(String(c).toLowerCase()); return MT({ color: c, roughness: oro ? .3 : .6, metalness: oro ? .55 : 0, ...r }); };
    const tinta = new THREE.MeshBasicMaterial({ color: '#2b1645', side: THREE.BackSide });
    const contorno = (obj, k = 1.07) => { k = 1 + (k - 1) * .45; const l = []; obj.traverse(m => { if (m.isMesh && !m.userData.sinBorde) l.push(m); }); for (const m of l) { const o = new THREE.Mesh(m.geometry, tinta); o.scale.setScalar(k); o.userData.sinBorde = 1; m.add(o); } return obj; };
    const lienzo = (w, h, pinta, rx = 1, ry = 1) => { const c = document.createElement('canvas'); c.width = w; c.height = h; pinta(c.getContext('2d'), w, h); const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rx, ry); tx.anisotropy = 4; return tx; };
    const resplandor = lienzo(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,240,170,.8)'); r.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    const brillo = (color, tam) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: resplandor, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(tam); return sp; };
    // cielo degradado (azul intenso arriba, celeste en el horizonte) que sigue a la cámara
    const cielo = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { a: { value: new THREE.Color('#2a6dff') }, b: { value: new THREE.Color('#c9ecff') }, c: { value: new THREE.Color('#ffe3f6') } },
      vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform vec3 c; varying vec3 p; void main(){ float h = normalize(p).y; vec3 col = h > 0.0 ? mix(b, a, pow(h, 0.55)) : mix(b, c, min(1.0, -h * 3.0)); gl_FragColor = linearToOutputTexel(vec4(col, 1.0)); }' }));
    cielo.renderOrder = -1; scene.add(cielo);
    try { const envS = new THREE.Scene(), cieloE = cielo.clone(); cieloE.scale.setScalar(.2); envS.add(cieloE); const solE = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff4d6' })); solE.position.set(30, 45, -40); envS.add(solE);
      const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(envS, .04).texture; pm.dispose(); } catch (e) {}
    const solDisco = brillo('#fff2b0', 90); solDisco.position.set(120, 140, -260); solDisco.material.fog = false; scene.add(solDisco);
    // nubes esponjosas
    const nubes = [], matNube = MT({ color: '#ffffff', gradientMap: grad, emissive: '#dfefff', emissiveIntensity: .35 }), geoNube = new THREE.SphereGeometry(1, 14, 10);
    for (let i = 0; i < 16; i++) { const n = new THREE.Group(), k = 4 + Math.random() * 5; for (let j = 0; j < 5; j++) { const b = new THREE.Mesh(geoNube, matNube); b.scale.set(k * (1 - Math.abs(j - 2) * .18), k * (.7 - Math.abs(j - 2) * .1), k * .8); b.position.set((j - 2) * k * .75, Math.random() * k * .3, Math.random() * k * .4); n.add(b); }
      const an = Math.random() * Math.PI * 2, r = 110 + Math.random() * 110; n.position.set(Math.cos(an) * r, 45 + Math.random() * 40, Math.sin(an) * r); n.userData.v = .4 + Math.random() * .6; scene.add(n); nubes.push(n); }
    const malla = (g, m, sombra = true) => { const me = new THREE.Mesh(g, m); me.castShadow = sombra; me.receiveShadow = true; return me; };

    // Mundo: pradera, camino, castillo, árboles, islas flotantes y la barrera mágica del Sabio Búho
    const suelo = malla(new THREE.CylinderGeometry(70, 66, 6, 48, 1, true), mat('#8a5a33'), false); suelo.position.y = -3; scene.add(suelo);
    const texPasto = lienzo(512, 512, (g, w) => { g.fillStyle = '#5fc23f'; g.fillRect(0, 0, w, w);
      for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = Math.random() * w, r = 20 + Math.random() * 60, c = g.createRadialGradient(x, y, 0, x, y, r); c.addColorStop(0, Math.random() < .5 ? 'rgba(130,220,80,.45)' : 'rgba(40,140,50,.35)'); c.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = c; g.fillRect(x - r, y - r, r * 2, r * 2); }
      for (let i = 0; i < 2600; i++) { const x = Math.random() * w, y = Math.random() * w; g.strokeStyle = ['#4caf35', '#7bd655', '#3f9a32', '#8fe060'][i % 4]; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 4, y - 5 - Math.random() * 6); g.stroke(); } }, 14, 14);
    const pasto = malla(new THREE.CircleGeometry(70, 64), MT({ map: texPasto, gradientMap: grad }), false); pasto.rotation.x = -Math.PI / 2; scene.add(pasto);
    const texPiedra = lienzo(256, 512, (g, w, h) => { g.fillStyle = '#b8895a'; g.fillRect(0, 0, w, h); let y = 0;
      while (y < h) { const fh = 34 + Math.random() * 18; let x = (y / 40 % 2) * -20; while (x < w) { const fw = 40 + Math.random() * 30; g.fillStyle = ['#f0d29c', '#e8c58c', '#f5dcae', '#e2bd82'][Math.floor(Math.random() * 4)]; g.beginPath(); g.roundRect ? g.roundRect(x + 3, y + 3, fw - 6, fh - 6, 12) : g.rect(x + 3, y + 3, fw - 6, fh - 6); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 9, y + 7, fw * .4, 4); x += fw; } y += fh; } }, 1, 10);
    const camino = malla(new THREE.PlaneGeometry(7, 72), MT({ map: texPiedra, gradientMap: grad }), false); camino.rotation.x = -Math.PI / 2; camino.position.set(0, .03, -10); scene.add(camino);
    for (const sx of [-1, 1]) { const bo = malla(new THREE.BoxGeometry(.5, .25, 72), mat('#9b6b43'), false); bo.position.set(sx * 3.7, .1, -10); scene.add(bo); }
    const colis = [], plataformas = [];
    // castillo (al norte)
    const castillo = new THREE.Group(); castillo.position.set(0, 0, -48); scene.add(castillo);
    const muro = (x, z, w, d) => { const m = malla(new THREE.BoxGeometry(w, 8, d), mat('#efe3ff')); m.position.set(x, 4, z); castillo.add(m); };
    muro(-14, 0, 2, 22); muro(14, 0, 2, 22); muro(0, -11, 30, 2); muro(-9, 11, 12, 2); muro(9, 11, 12, 2);
    for (const [x, z] of [[-14, -11], [14, -11], [-14, 11], [14, 11]]) { const tor = malla(new THREE.CylinderGeometry(3, 3.3, 14, 10), mat('#e7d7ff')); tor.position.set(x, 7, z); castillo.add(tor); const tec = malla(new THREE.ConeGeometry(3.8, 6, 10), mat('#7b2ff7')); tec.position.set(x, 17, z); castillo.add(tec); }
    const keep = malla(new THREE.CylinderGeometry(4, 4.5, 18, 12), mat('#f3eaff')); keep.position.set(0, 9, -4); castillo.add(keep); const kt = malla(new THREE.ConeGeometry(5, 8, 12), mat('#7b2ff7')); kt.position.set(0, 22, -4); castillo.add(kt);
    { const piedraC = mat('#efe3ff'), oroC = mat('#ffc83d'), ventana = mat('#3b1d7a', { emissive: '#ffb84d', emissiveIntensity: .25 }), geoAl = new THREE.BoxGeometry(1, 1.2, 1);
      for (const [x, z, w, d] of [[-14, 0, 2, 22], [14, 0, 2, 22], [0, -11, 30, 2], [-9, 11, 12, 2], [9, 11, 12, 2]]) { const n = Math.floor(Math.max(w, d) / 2); for (let i = 0; i < n; i++) { const al = new THREE.Mesh(geoAl, piedraC); al.castShadow = true; const t = (i + .5) / n - .5; al.position.set(x + (w > d ? t * w : 0), 8.6, z + (d > w ? t * d : 0)); castillo.add(al); } }
      for (const [x, z] of [[-14, -11], [14, -11], [-14, 11], [14, 11], [0, -4]]) { const alto = x === 0 ? 18 : 14, rad = x === 0 ? 4.3 : 3.2;
        for (const a of [0, 1.6, 3.2, 4.8]) for (const yy of [alto * .45, alto * .75]) { const v = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.3, .3), ventana); v.position.set(x + Math.sin(a) * rad, yy, z + Math.cos(a) * rad); v.rotation.y = a; castillo.add(v); }
        const aro = new THREE.Mesh(new THREE.TorusGeometry(rad + .05, .22, 6, 20), oroC); aro.rotation.x = Math.PI / 2; aro.position.set(x, alto, z); castillo.add(aro);
        const punta = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8), oroC); punta.position.set(x, alto + (x === 0 ? 12.2 : 9.2), z); castillo.add(punta);
        const asta = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.4, 5), oroC); asta.position.set(x, alto + (x === 0 ? 13.4 : 10.4), z); castillo.add(asta);
        const bandera = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .9), mat(x === 0 ? '#ffcf2e' : '#ff4fa3', { side: THREE.DoubleSide })); bandera.position.set(x + .8, alto + (x === 0 ? 14.1 : 11.1), z); bandera.userData.ondea = 1; castillo.add(bandera); }
      const arco = new THREE.Mesh(new THREE.TorusGeometry(3.2, .45, 8, 20, Math.PI), oroC); arco.position.set(0, 6.3, 11); castillo.add(arco);
      for (const sx of [-1, 1]) { const pil = new THREE.Mesh(new THREE.CylinderGeometry(.5, .6, 6.5, 10), oroC); pil.position.set(sx * 3.2, 3.2, 11); castillo.add(pil); }
      contorno(castillo, 1.025); }
    for (const [x, z, r] of [[-14, -48, 3.5], [14, -48, 3.5], [-14, -59, 3.5], [14, -59, 3.5], [0, -52, 4.8], [-9, -37, 6.2], [9, -37, 6.2]]) colis.push([x, z, r]);
    for (let i = -13; i <= 13; i += 2) { colis.push([-14, -48 + i * .8, 1.3]); colis.push([14, -48 + i * .8, 1.3]); colis.push([i, -59, 1.3]); }
    // pedestal del castillo y Cristal Amarillo (aparece al vencer al jefe)
    const pedestal = malla(new THREE.CylinderGeometry(1.6, 2, 1.2, 12), mat('#ffd23f')); pedestal.position.set(0, .6, -44); scene.add(pedestal); colis.push([0, -44, 2]);
    const cristal = malla(new THREE.OctahedronGeometry(1.1), MT({ color: '#ffe14d', gradientMap: grad, emissive: '#ffb800', emissiveIntensity: .7 })); cristal.visible = false; cristal.add(brillo('#ffd23f', 6)); scene.add(cristal); const luzC = new THREE.PointLight('#ffd04d', 0, 14); scene.add(luzC);
    // barrera mágica en la puerta del castillo (se abre al superar la prueba del Búho)
    const barrera = malla(new THREE.BoxGeometry(6, 8, .4), new THREE.MeshBasicMaterial({ color: '#b794ff', transparent: true, opacity: .5 }), false); barrera.position.set(0, 4, -37); scene.add(barrera);
    // árboles y rocas
    const geoTr = new THREE.CylinderGeometry(.35, .6, 3, 8), geoCo = new THREE.SphereGeometry(1, 14, 10), matTr = mat('#8b5a2b'), matCo = ['#3fb34d', '#5cc95a', '#2f9f55', '#7ad04a'].map(c => mat(c));
    const arbol = (x, z, s = 1, padre = scene) => { const g = new THREE.Group(); const tr = malla(geoTr, matTr); tr.position.y = 1.5; g.add(tr); const mc = matCo[Math.floor(Math.random() * 4)];
      for (const [cx, cy, cz, r] of [[0, 4.3, 0, 2], [1.2, 3.6, .3, 1.4], [-1.1, 3.7, -.2, 1.5], [.2, 5.4, -.2, 1.4]]) { const co = malla(geoCo, mc); co.scale.setScalar(r); co.position.set(cx, cy, cz); g.add(co); }
      g.scale.setScalar(s); g.position.set(x, 0, z); g.rotation.y = Math.random() * 6; padre.add(g); if (padre === scene) colis.push([x, z, .9 * s]); return g; };
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 46; i++) { const an = Math.random() * Math.PI * 2, r = rnd(32, 66); const x = Math.cos(an) * r, z = Math.sin(an) * r; if (z < -30 && Math.abs(x) < 22) continue; arbol(x, z, rnd(.8, 1.4)); }
    for (let i = 0; i < 6; i++) { const isla = new THREE.Group(), r = rnd(3, 6); const top = malla(new THREE.CylinderGeometry(r, r * .9, 1.2, 8), mat('#6fbf55'), false); isla.add(top); const base = malla(new THREE.ConeGeometry(r * .9, r * 1.6, 8), mat('#a0764a'), false); base.rotation.x = Math.PI; base.position.y = -r * .85; isla.add(base); arbol(rnd(-r * .3, r * .3), rnd(-r * .3, r * .3), .5, isla).position.y = .6; const cas = new THREE.Mesh(new THREE.PlaneGeometry(1.2, r * 2.2), new THREE.MeshBasicMaterial({ color: '#bfeaff', transparent: true, opacity: .75, side: THREE.DoubleSide })); cas.position.set(0, -r * 1.1, r * .92); isla.add(cas); isla.position.set(rnd(-80, 80), rnd(22, 40), rnd(-90, -20)); isla.userData.f = Math.random() * 6; scene.add(isla); }
    { const dummy = new THREE.Object3D(), libre = (x, z) => Math.abs(x) > 4.2 || z > 26 || z < -46;
      const flores = new THREE.InstancedMesh(new THREE.SphereGeometry(.22, 8, 6), MT({ gradientMap: grad }), 520), cols = ['#ff5fa2', '#ffd23f', '#ffffff', '#b06bff', '#ff8a3d', '#5ac8ff'].map(c => new THREE.Color(c));
      for (let i = 0; i < 520; i++) { let x, z; do { const an = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 64; x = Math.cos(an) * r; z = Math.sin(an) * r; } while (!libre(x, z)); dummy.position.set(x, .2, z); dummy.scale.set(1, .6, 1); dummy.updateMatrix(); flores.setMatrixAt(i, dummy.matrix); flores.setColorAt(i, cols[i % cols.length]); }
      scene.add(flores);
      const matas = new THREE.InstancedMesh(new THREE.ConeGeometry(.35, 1, 5), mat('#4fb83a'), 700);
      for (let i = 0; i < 700; i++) { let x, z; do { const an = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 66; x = Math.cos(an) * r; z = Math.sin(an) * r; } while (!libre(x, z)); dummy.position.set(x, .35, z); dummy.rotation.set((Math.random() - .5) * .5, 0, (Math.random() - .5) * .5); dummy.scale.setScalar(.6 + Math.random() * .7); dummy.updateMatrix(); matas.setMatrixAt(i, dummy.matrix); }
      scene.add(matas);
      const matGema = MT({ color: '#b26bff', gradientMap: grad, emissive: '#6a1fd1', emissiveIntensity: .55 }), geoGema = new THREE.OctahedronGeometry(1, 0);
      for (let i = 0; i < 14; i++) { const an = Math.random() * Math.PI * 2, r = 40 + Math.random() * 24, gx = Math.cos(an) * r, gz = Math.sin(an) * r, grupo = new THREE.Group();
        for (let j = 0; j < 3; j++) { const ge = new THREE.Mesh(geoGema, matGema); ge.scale.set(.5, 1.2 + Math.random(), .5); ge.position.set((j - 1) * .7, .8, Math.random() * .5); ge.rotation.z = (j - 1) * .35; grupo.add(ge); }
        grupo.position.set(gx, 0, gz); contorno(grupo, 1.08); scene.add(grupo); }
      const geoRoca = new THREE.DodecahedronGeometry(1, 0), matRoca = mat('#a8a2b8');
      for (let i = 0; i < 18; i++) { const an = Math.random() * Math.PI * 2, r = 30 + Math.random() * 36, ro = malla(geoRoca, matRoca); ro.scale.set(1 + Math.random(), .7 + Math.random() * .6, 1 + Math.random()); ro.position.set(Math.cos(an) * r, .3, Math.sin(an) * r); scene.add(ro); } }
    // brillitos mágicos flotando
    const polvo = (() => { const n = 260, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * 120; p[i * 3 + 1] = Math.random() * 14; p[i * 3 + 2] = (Math.random() - .5) * 120; } g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .5, map: resplandor, color: '#fff4b0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(pts); return pts; })();
    // Sabio Búho (NPC) junto a la puerta
    const buho = new THREE.Group(); { const cuerpo = malla(new THREE.SphereGeometry(1.1, 16, 12), mat('#9a6b3f')); cuerpo.scale.y = 1.2; cuerpo.position.y = 1.4; buho.add(cuerpo); const panza = malla(new THREE.SphereGeometry(.8, 14, 10), mat('#f1dcb7')); panza.position.set(0, 1.25, .45); buho.add(panza);
      for (const sx of [-.42, .42]) { const o = malla(new THREE.SphereGeometry(.34, 12, 10), mat('#ffffff')); o.position.set(sx, 2.15, .82); buho.add(o); const pu = malla(new THREE.SphereGeometry(.15, 8, 8), mat('#222')); pu.position.set(sx, 2.15, 1.12); buho.add(pu); const ga = malla(new THREE.TorusGeometry(.36, .05, 6, 16), mat('#ffd23f', { metalness: .5 })); ga.position.set(sx, 2.15, 1.05); buho.add(ga); }
      const pico = malla(new THREE.ConeGeometry(.15, .35, 6), mat('#f5a623')); pico.rotation.x = Math.PI / 2; pico.position.set(0, 1.85, 1.08); buho.add(pico); const som = malla(new THREE.ConeGeometry(1.1, 1.8, 12), mat('#5b21b6')); som.position.y = 3.3; buho.add(som); const ala = malla(new THREE.CylinderGeometry(.04, .04, 3, 6), mat('#8b5a2b')); ala.position.set(1.3, 1.8, 0); buho.add(ala); const est = malla(new THREE.OctahedronGeometry(.3), mat('#ffd23f', { emissive: '#ffb800', emissiveIntensity: .8 })); est.position.set(1.3, 3.4, 0); buho.add(est); }
    contorno(buho, 1.06); scene.add(buho);
    // Estrellín (guía): flota y apunta al siguiente objetivo
    const estrellin = new THREE.Group(); { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .3 : .7; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const eg = new THREE.ExtrudeGeometry(sh, { depth: .2, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 3 }); eg.center();
      const cu = new THREE.Mesh(eg, MT({ color: '#ffe14d', gradientMap: grad, emissive: '#ffb800', emissiveIntensity: .45 })); estrellin.add(cu);
      for (const sx of [-.15, .15]) { const o = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#2b1645' })); o.position.set(sx, .05, .24); estrellin.add(o); }
      const bo = new THREE.Mesh(new THREE.TorusGeometry(.09, .025, 6, 10, Math.PI), new THREE.MeshBasicMaterial({ color: '#2b1645' })); bo.rotation.z = Math.PI; bo.position.set(0, -.08, .24); estrellin.add(bo);
      contorno(estrellin, 1.08); estrellin.add(brillo('#fff3a0', 2.6)); } scene.add(estrellin);

    // Yupi: la "Y" dorada redondeada con corona, cara expresiva, brazos con guantes, zapatillas y capa morada
    const hacerYupi = () => { const yupi = new THREE.Group(), cuerpoY = new THREE.Group(); yupi.add(cuerpoY); const brazos = [];
    { const oro = mat('#ffc81f', { emissive: '#4a2d00', emissiveIntensity: .25 }), blanco = mat('#ffffff'), oscuro = new THREE.MeshBasicMaterial({ color: '#24113d' });
      const y = new THREE.Shape(); [[-.42, 0], [.42, 0], [.42, 1.15], [1.2, 2.45], [.58, 2.45], [0, 1.72], [-.58, 2.45], [-1.2, 2.45], [-.42, 1.15]].forEach(([x, z], i) => i ? y.lineTo(x, z) : y.moveTo(x, z));
      const gy = new THREE.ExtrudeGeometry(y, { depth: .5, bevelEnabled: true, bevelThickness: .2, bevelSize: .16, bevelSegments: 5, curveSegments: 8 }); gy.translate(0, 0, -.25); gy.computeVertexNormals();
      const tronco = malla(gy, oro); tronco.position.y = .72; cuerpoY.add(tronco);
      for (const s of [-1, 1]) { const ojo = new THREE.Mesh(new THREE.SphereGeometry(.24, 18, 14), new THREE.MeshBasicMaterial({ color: '#ffffff' })); ojo.scale.set(.9, 1.1, .55); ojo.position.set(s * .25, 2.12, .44); cuerpoY.add(ojo);
        const iris = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 12), mat('#1f7bff')); iris.scale.z = .4; iris.position.set(s * .23, 2.1, .55); cuerpoY.add(iris);
        const pu = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 10), oscuro); pu.scale.z = .4; pu.position.set(s * .23, 2.1, .6); cuerpoY.add(pu);
        const bri = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); bri.position.set(s * .23 + .05, 2.16, .63); cuerpoY.add(bri);
        const ceja = new THREE.Mesh(new THREE.CapsuleGeometry(.035, .2, 4, 6), oscuro); ceja.rotation.z = Math.PI / 2 + s * .25; ceja.position.set(s * .26, 2.43, .45); cuerpoY.add(ceja); }
      const boca = new THREE.Mesh(new THREE.CircleGeometry(.24, 20, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: '#7a1430' })); boca.scale.y = .8; boca.position.set(0, 1.8, .47); cuerpoY.add(boca);
      const lengua = new THREE.Mesh(new THREE.CircleGeometry(.13, 16, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: '#ff6b8a' })); lengua.position.set(0, 1.66, .475); cuerpoY.add(lengua);
      const dientes = new THREE.Mesh(new THREE.PlaneGeometry(.36, .06), new THREE.MeshBasicMaterial({ color: '#ffffff' })); dientes.position.set(0, 1.775, .476); cuerpoY.add(dientes);
      for (const s of [-1, 1]) { const me = new THREE.Mesh(new THREE.CircleGeometry(.09, 12), new THREE.MeshBasicMaterial({ color: '#ff9a6b', transparent: true, opacity: .6 })); me.position.set(s * .5, 1.9, .43); cuerpoY.add(me); }
      // corona dorada con gemas azules, en la "V" de la Y
      const corona = new THREE.Group(), oroC = mat('#ffb000', { emissive: '#5a3500', emissiveIntensity: .3 }), gemaM = mat('#2f8bff', { emissive: '#0b4dff', emissiveIntensity: .45 });
      const aro = malla(new THREE.CylinderGeometry(.5, .46, .3, 20, 1, true), mat('#ffb000', { side: THREE.DoubleSide })); aro.userData.sinBorde = 1; corona.add(aro);
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, pk = malla(new THREE.ConeGeometry(.11, .38, 6), oroC); pk.position.set(Math.sin(a) * .47, .3, Math.cos(a) * .47); corona.add(pk); const bo = malla(new THREE.SphereGeometry(.06, 8, 6), oroC); bo.position.set(Math.sin(a) * .47, .52, Math.cos(a) * .47); corona.add(bo); }
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2, ge = malla(new THREE.OctahedronGeometry(.1), gemaM); ge.position.set(Math.sin(a) * .5, 0, Math.cos(a) * .5); corona.add(ge); }
      corona.position.set(0, 2.78, 0); corona.rotation.x = -.12; cuerpoY.add(corona);
      // brazos con guantes blancos
      for (const s of [-1, 1]) { const b = new THREE.Group(); b.position.set(s * .62, 1.75, 0); const br = malla(new THREE.CapsuleGeometry(.08, .5, 4, 8), oro); br.rotation.z = s * 1.0; br.position.set(s * .25, -.15, 0); b.add(br);
        const gu = malla(new THREE.SphereGeometry(.22, 14, 10), blanco); gu.scale.set(1, .9, .85); gu.position.set(s * .55, -.35, .05); b.add(gu); const pul = malla(new THREE.CapsuleGeometry(.06, .12, 4, 6), blanco); pul.position.set(s * .5, -.17, .15); b.add(pul);
        const pu2 = malla(new THREE.TorusGeometry(.13, .05, 6, 14), blanco); pu2.rotation.y = Math.PI / 2; pu2.rotation.z = s * 1.0; pu2.position.set(s * .38, -.24, .02); b.add(pu2); cuerpoY.add(b); brazos.push(b); }
      // capa morada curva, con forro dorado
      const capa = new THREE.Group(); capa.position.set(0, 2.35, -.1); const tela = new THREE.Mesh(new THREE.CylinderGeometry(.5, .75, 1.25, 18, 1, true, Math.PI / 2, Math.PI), mat('#7b2ff7', { side: THREE.DoubleSide })); tela.position.y = -.6; tela.castShadow = true; capa.add(tela);
      const cuello = new THREE.Mesh(new THREE.TorusGeometry(.55, .07, 6, 16, Math.PI), mat('#ffcf2e')); cuello.rotation.x = Math.PI / 2; cuello.rotation.z = Math.PI; capa.add(cuello); cuerpoY.add(capa); yupi.userData.capa = capa; capa.traverse(m => m.userData.sinBorde = 1);
      contorno(cuerpoY, 1.045); }
    const piernas = []; for (const s of [-1, 1]) { const g = new THREE.Group(); const pi = malla(new THREE.CapsuleGeometry(.09, .32, 4, 8), mat('#ffc81f')); pi.position.y = -.22; g.add(pi);
      const za = malla(new THREE.CapsuleGeometry(.17, .3, 6, 10), mat('#ffffff')); za.rotation.x = Math.PI / 2; za.position.set(0, -.55, .1); g.add(za); const sue = malla(new THREE.BoxGeometry(.36, .07, .62), mat('#2f6bff')); sue.position.set(0, -.7, .1); g.add(sue);
      contorno(g, 1.06); g.position.set(s * .22, .72, 0); yupi.add(g); piernas.push(g); }
      return { g: yupi, cu: cuerpoY, brazos, piernas, capa: yupi.userData.capa }; };

    // ---------- Texturas y piezas de los personajes ----------
    const texPoncho = lienzo(256, 64, (g, w, h) => { g.fillStyle = '#d7263d'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23f'; g.fillRect(0, 6, w, 6); g.fillRect(0, h - 12, w, 6);
      for (let x = 0; x < w; x += 32) { g.fillStyle = '#1fc8c8'; g.beginPath(); g.moveTo(x + 16, 16); g.lineTo(x + 30, 32); g.lineTo(x + 16, 48); g.lineTo(x + 2, 32); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + 16, 25); g.lineTo(x + 23, 32); g.lineTo(x + 16, 39); g.lineTo(x + 9, 32); g.closePath(); g.fill(); } }, 3, 1);
    const texChullo = lienzo(128, 128, (g, w) => { const c = ['#d7263d', '#ffd23f', '#1fc8c8', '#7b2ff7', '#ff8a3d']; for (let i = 0; i < 8; i++) { g.fillStyle = c[i % 5]; g.fillRect(0, i * 16, w, 16); }
      g.fillStyle = '#fff'; for (let x = 0; x < w; x += 16) for (let y = 2; y < w; y += 32) { g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 14, y + 6); g.lineTo(x + 8, y + 12); g.lineTo(x + 2, y + 6); g.fill(); } }, 2, 1);
    const texGrano = lienzo(128, 256, (g, w, h) => { g.fillStyle = '#d9c27a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8 - 8; x < w; x += 16) { const r = g.createRadialGradient(x + 6, y + 5, 1, x + 8, y + 8, 9); r.addColorStop(0, '#fffbe6'); r.addColorStop(1, '#efd98f'); g.fillStyle = r; g.beginPath(); g.ellipse(x + 8, y + 8, 7, 7.2, 0, 0, Math.PI * 2); g.fill(); } }, 3, 2);
    const texCoco = lienzo(256, 128, (g, w, h) => { g.fillStyle = '#8b5a2b'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.strokeStyle = ['#6e4420', '#a06a38', '#5c3618'][i % 3]; g.lineWidth = 1.5; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 6, y + 6 + Math.random() * 8); g.stroke(); } }, 2, 1);
    const oscuroB = new THREE.MeshBasicMaterial({ color: '#24113d' }), blancoB = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const ojos = (padre, y, z, sep, r, iris, ceja = true) => { for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), blancoB); o.scale.set(.9, 1.1, .55); o.position.set(s * sep, y, z); padre.add(o);
        const ir = new THREE.Mesh(new THREE.SphereGeometry(r * .6, 14, 10), mat(iris)); ir.scale.z = .4; ir.position.set(s * sep * .95, y - r * .05, z + r * .45); padre.add(ir);
        const pu = new THREE.Mesh(new THREE.SphereGeometry(r * .3, 10, 8), oscuroB); pu.scale.z = .4; pu.position.set(s * sep * .95, y - r * .05, z + r * .62); padre.add(pu);
        const b = new THREE.Mesh(new THREE.SphereGeometry(r * .17, 8, 6), blancoB); b.position.set(s * sep * .95 + r * .2, y + r * .22, z + r * .72); padre.add(b);
        if (ceja) { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r * .14, r * .8, 4, 6), oscuroB); c.rotation.z = Math.PI / 2 + s * .25; c.position.set(s * sep, y + r * 1.4, z + r * .1); padre.add(c); } } };
    const sonrisa = (padre, y, z, r) => { const b = new THREE.Mesh(new THREE.CircleGeometry(r, 18, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: '#7a1430' })); b.scale.y = .8; b.position.set(0, y, z); padre.add(b);
      const l = new THREE.Mesh(new THREE.CircleGeometry(r * .55, 14, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: '#ff6b8a' })); l.position.set(0, y - r * .45, z + .005); padre.add(l); };

    // 🦙 Lulú: llama blanca y esponjosa con chullo andino, audífonos gamer morados y poncho de rombos
    const hacerLulu = () => { const g = new THREE.Group(), cu = new THREE.Group(); g.add(cu); const lana = mat('#fbf6ee'), crema = mat('#f1dcc0'), pezu = mat('#5a3a22'), morado = mat('#8b3dff');
      const cuerpo = malla(new THREE.SphereGeometry(.8, 20, 16), lana); cuerpo.scale.set(1, .85, 1.25); cuerpo.position.set(0, 1.3, -.15); cu.add(cuerpo);
      const geoB = new THREE.SphereGeometry(.3, 12, 10); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, b = malla(geoB, lana); b.position.set(Math.cos(a) * .75, 1.1 + (i % 2) * .3, Math.sin(a) * .95 - .15); cu.add(b); }
      const poncho = malla(new THREE.CylinderGeometry(.8, 1.0, .6, 24, 1, true), MT({ map: texPoncho, gradientMap: grad, side: THREE.DoubleSide })); poncho.scale.z = 1.22; poncho.position.set(0, 1.5, -.12); poncho.userData.sinBorde = 1; cu.add(poncho);
      const cuello = malla(new THREE.CapsuleGeometry(.27, .75, 6, 12), lana); cuello.position.set(0, 2.1, .45); cuello.rotation.x = .2; cu.add(cuello);
      const cab = new THREE.Group(); cab.position.set(0, 2.72, .62); cu.add(cab);
      cab.add(malla(new THREE.SphereGeometry(.45, 20, 16), lana));
      const hocico = malla(new THREE.SphereGeometry(.26, 16, 12), crema); hocico.scale.set(1.1, .85, .9); hocico.position.set(0, -.17, .36); cab.add(hocico);
      for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), oscuroB); n.position.set(s * .07, -.1, .6); cab.add(n); }
      sonrisa(cab, -.24, .6, .09); ojos(cab, .1, .38, .17, .13, '#2fbf5a', false);
      for (const s of [-1, 1]) { const o = malla(new THREE.ConeGeometry(.1, .38, 8), lana); o.position.set(s * .3, .42, -.08); o.rotation.z = -s * .45; cab.add(o); }
      const chullo = malla(new THREE.ConeGeometry(.44, .58, 24), MT({ map: texChullo, gradientMap: grad })); chullo.position.set(0, .52, -.02); cab.add(chullo);
      const pom = malla(new THREE.SphereGeometry(.11, 10, 8), mat('#d7263d')); pom.position.set(0, .86, -.02); cab.add(pom);
      for (const s of [-1, 1]) { const ore = malla(new THREE.ConeGeometry(.12, .4, 10), MT({ map: texChullo, gradientMap: grad })); ore.rotation.x = Math.PI; ore.position.set(s * .36, .05, -.05); cab.add(ore); }
      const banda = malla(new THREE.TorusGeometry(.5, .055, 8, 24, Math.PI), morado); cab.add(banda);
      for (const s of [-1, 1]) { const cup = malla(new THREE.CylinderGeometry(.17, .17, .16, 16), morado); cup.rotation.z = Math.PI / 2; cup.position.set(s * .5, 0, 0); cab.add(cup); const luz = new THREE.Mesh(new THREE.CircleGeometry(.08, 12), new THREE.MeshBasicMaterial({ color: '#22e6ff' })); luz.rotation.y = s * Math.PI / 2; luz.position.set(s * .585, 0, 0); cab.add(luz); }
      const cola = malla(new THREE.SphereGeometry(.22, 12, 10), lana); cola.position.set(0, 1.55, -1.2); cu.add(cola);
      contorno(cu, 1.045);
      const piernas = []; for (const [x, z] of [[-.38, .45], [.38, .45], [.38, -.65], [-.38, -.65]]) { const p = new THREE.Group(); p.position.set(x, .95, z); const l = malla(new THREE.CapsuleGeometry(.12, .55, 4, 8), lana); l.position.y = -.38; p.add(l); const c = malla(new THREE.CylinderGeometry(.13, .14, .16, 10), pezu); c.position.y = -.85; p.add(c); contorno(p, 1.06); g.add(p); piernas.push(p); }
      g.scale.setScalar(.9); return { g, cu, piernas, brazos: [] }; };

    // 🌽 Choki: choclo peruano de granos blancos, hojas como capa, casco inca dorado, lanza y escudo con sol
    const hacerChoki = () => { const g = new THREE.Group(), cu = new THREE.Group(); g.add(cu); const verde = mat('#3fae3a'), oro = mat('#ffc23d', { emissive: '#4a2d00', emissiveIntensity: .25 }), rojo = mat('#e3262f'), cafe = mat('#7a4a22');
      const maz = malla(new THREE.CapsuleGeometry(.55, 1.15, 8, 20), MT({ map: texGrano, gradientMap: grad })); maz.position.y = 1.62; cu.add(maz);
      const geoH = new THREE.SphereGeometry(1, 16, 12);
      for (const [x, y, z, ry2, rz, sy] of [[-.42, 1.15, -.3, -.6, .3, 1], [.42, 1.15, -.3, .6, -.3, 1], [0, 1.2, -.5, 0, 0, 1.1], [-.62, .95, .1, -1.3, .45, .75], [.62, .95, .1, 1.3, -.45, .75]]) { const h = malla(geoH, verde); h.scale.set(.32, .85 * sy, .1); h.position.set(x, y, z); h.rotation.set(-.15, ry2, rz); cu.add(h); }
      const casco = malla(new THREE.SphereGeometry(.62, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), oro); casco.position.y = 2.27; casco.scale.y = .85; cu.add(casco);
      const ala = malla(new THREE.TorusGeometry(.6, .07, 8, 24), oro); ala.rotation.x = Math.PI / 2; ala.position.y = 2.29; cu.add(ala);
      const pen = malla(new THREE.SphereGeometry(1, 14, 10), rojo); pen.scale.set(.12, .42, .55); pen.position.set(0, 2.92, -.05); cu.add(pen);
      const sol = malla(new THREE.CylinderGeometry(.13, .13, .05, 14), mat('#ff9a1f')); sol.rotation.x = Math.PI / 2; sol.position.set(0, 2.5, .5); cu.add(sol);
      ojos(cu, 1.98, .5, .21, .17, '#2fbf5a'); sonrisa(cu, 1.68, .56, .17);
      const brazos = []; let lanza;
      for (const s of [-1, 1]) { const b = new THREE.Group(); b.position.set(s * .55, 1.6, 0); const br = malla(new THREE.CapsuleGeometry(.09, .45, 4, 8), verde); br.rotation.z = s * 1.0; br.position.set(s * .22, -.12, 0); b.add(br);
        const ma = malla(new THREE.SphereGeometry(.17, 12, 10), oro); ma.position.set(s * .45, -.3, .08); b.add(ma);
        if (s > 0) { lanza = new THREE.Group(); lanza.position.set(.45, -.3, .08); const asta = malla(new THREE.CylinderGeometry(.045, .045, 2.6, 8), cafe); lanza.add(asta); const punta = malla(new THREE.ConeGeometry(.13, .42, 8), oro); punta.position.y = 1.5; lanza.add(punta); const aro = malla(new THREE.TorusGeometry(.09, .03, 6, 12), oro); aro.rotation.x = Math.PI / 2; aro.position.y = 1.22; lanza.add(aro); b.add(lanza); }
        else { const esc = new THREE.Group(); esc.position.set(-.62, -.32, .32); const d = malla(new THREE.CylinderGeometry(.52, .52, .1, 24), oro); d.rotation.x = Math.PI / 2; esc.add(d); const so = malla(new THREE.ConeGeometry(.18, .14, 16), mat('#ff9a1f')); so.rotation.x = Math.PI / 2; so.position.z = .12; esc.add(so); const ar = malla(new THREE.TorusGeometry(.38, .03, 6, 24), mat('#ff9a1f')); ar.position.z = .06; esc.add(ar); b.add(esc); }
        cu.add(b); brazos.push(b); }
      contorno(cu, 1.045);
      const piernas = []; for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * .22, .55, 0); const l = malla(new THREE.CapsuleGeometry(.09, .25, 4, 8), verde); l.position.y = -.2; p.add(l); const bo = malla(new THREE.CapsuleGeometry(.14, .22, 6, 10), cafe); bo.rotation.x = Math.PI / 2; bo.position.set(0, -.45, .08); p.add(bo); contorno(p, 1.06); g.add(p); piernas.push(p); }
      return { g, cu, piernas, brazos, lanza }; };

    // 🥥 Coquito: coco caballero con armadura de madera tallada, casco con pluma verde y mirada tranquila
    const hacerCoquito = () => { const g = new THREE.Group(), cu = new THREE.Group(); g.add(cu); const madera = mat('#c48a4a'), madera2 = mat('#8a5a2e'), oro = mat('#ffc23d'), verde = mat('#3fae3a'), puno = mat('#7a4a22');
      const coco = malla(new THREE.SphereGeometry(.88, 24, 18), MT({ map: texCoco, gradientMap: grad })); coco.position.y = 1.3; cu.add(coco);
      const arm = malla(new THREE.CylinderGeometry(.92, .86, .5, 24, 1, true), madera); arm.position.y = .85; arm.userData.sinBorde = 1; cu.add(arm);
      for (const y of [1.1, .6]) { const b = malla(new THREE.TorusGeometry(y > 1 ? .92 : .86, .05, 6, 24), madera2); b.rotation.x = Math.PI / 2; b.position.y = y; cu.add(b); }
      const heb = malla(new THREE.BoxGeometry(.32, .26, .08), oro); heb.position.set(0, .85, .92); cu.add(heb);
      for (const s of [-1, 1]) { const h = malla(new THREE.SphereGeometry(.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), madera); h.position.set(s * .8, 1.55, 0); h.rotation.z = -s * .6; cu.add(h); }
      const casco = malla(new THREE.SphereGeometry(.7, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), madera2); casco.scale.y = .7; casco.position.y = 1.88; cu.add(casco);
      const ala = malla(new THREE.TorusGeometry(.68, .05, 6, 24), madera); ala.rotation.x = Math.PI / 2; ala.position.y = 1.9; cu.add(ala);
      const pluma = malla(new THREE.SphereGeometry(1, 14, 10), verde); pluma.scale.set(.1, .5, .22); pluma.position.set(.25, 2.45, -.1); pluma.rotation.z = -.5; cu.add(pluma);
      ojos(cu, 1.5, .78, .25, .17, '#6b3b16'); sonrisa(cu, 1.2, .88, .15);
      const brazos = []; for (const s of [-1, 1]) { const b = new THREE.Group(); b.position.set(s * .85, 1.3, 0); const br = malla(new THREE.CapsuleGeometry(.1, .35, 4, 8), madera2); br.rotation.z = s * 1.1; br.position.set(s * .2, -.12, 0); b.add(br); const pu = malla(new THREE.SphereGeometry(.18, 12, 10), puno); pu.position.set(s * .38, -.28, .05); b.add(pu); cu.add(b); brazos.push(b); }
      contorno(cu, 1.045);
      const piernas = []; for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * .3, .5, 0); const l = malla(new THREE.CapsuleGeometry(.1, .18, 4, 8), madera2); l.position.y = -.18; p.add(l); const bo = malla(new THREE.CapsuleGeometry(.15, .2, 6, 10), mat('#5a3418')); bo.rotation.x = Math.PI / 2; bo.position.set(0, -.4, .08); p.add(bo); contorno(p, 1.06); g.add(p); piernas.push(p); }
      const burbuja = new THREE.Mesh(new THREE.SphereGeometry(1.75, 24, 18), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .28, depthWrite: false })); burbuja.position.y = 1.3; burbuja.visible = false; g.add(burbuja);
      return { g, cu, piernas, brazos, burbuja }; };

    const MODELOS = { yupi: hacerYupi(), lulu: hacerLulu(), choki: hacerChoki(), coquito: hacerCoquito() };
    const jug = new THREE.Group(); scene.add(jug); for (const k of ORDEN) { MODELOS[k].g.visible = false; jug.add(MODELOS[k].g); }
    let pj = ORDEN.includes(cfg.pj) ? cfg.pj : 'yupi', M = MODELOS[pj], E = EQUIPO[pj]; M.g.visible = true;
    const sombraY = new THREE.Mesh(new THREE.CircleGeometry(.85, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .18, depthWrite: false })); sombraY.rotation.x = -Math.PI / 2; scene.add(sombraY);
    const destello = brillo('#ffffff', .1); scene.add(destello);

    // ---------- Objetos de los niveles ----------
    const niv = Math.max(0, Math.min(NIVELES.length - 1, cfg.niv | 0)), N = NIVELES[niv];
    const monedas = []; const geoM = new THREE.CylinderGeometry(.45, .45, .12, 18), matM = mat('#ffd23f', { emissive: '#b87400', emissiveIntensity: .45 });
    const ponMoneda = (x, y, z, plat = null) => { const m = malla(geoM, matM, false); m.add(new THREE.Mesh(geoM, tinta)); m.children[0].scale.set(1.12, .8, 1.12); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); m.userData.plat = plat; scene.add(m); monedas.push(m); };
    const matIsla = mat('#6fbf55'), matTierra = mat('#a0764a'), matPedra = mat('#d8b98a');
    const plataforma = (x, z, h, r = 2.2, mov = null) => { const flota = h >= 5, m = new THREE.Group(); m.position.set(x, h, z);
      if (flota) { const top = malla(new THREE.CylinderGeometry(r, r * .92, 1, 14), matIsla); top.position.y = -.5; m.add(top); const base = malla(new THREE.ConeGeometry(r * .9, r * 1.3, 12), matTierra); base.rotation.x = Math.PI; base.position.y = -1 - r * .65; m.add(base); }
      else { const c = malla(new THREE.CylinderGeometry(r, r * 1.08, h, 14), matPedra); c.position.y = -h / 2; m.add(c); const borde = malla(new THREE.TorusGeometry(r, .12, 6, 24), mat('#6fbf55')); borde.rotation.x = Math.PI / 2; m.add(borde); }
      contorno(m, 1.03); scene.add(m); const p = { x, z, r, h, g: flota ? 1 : h, m, mov, x0: x, z0: z, dx: 0, dz: 0 }; plataformas.push(p); return p; };
    const enemigos = [];
    const cuerpoGorgojo = () => { const g = new THREE.Group(); const c = malla(new THREE.SphereGeometry(.85, 16, 12), mat('#6d28d9')); c.scale.set(1, .7, 1.2); c.position.y = .7; g.add(c); const ca = malla(new THREE.SphereGeometry(.5, 14, 10), mat('#4c1d95')); ca.position.set(0, .9, .85); g.add(ca);
      for (const s of [-1, 1]) { const o = malla(new THREE.SphereGeometry(.13, 8, 8), mat('#ff4d4d', { emissive: '#ff0000', emissiveIntensity: .4 })); o.position.set(s * .18, 1.05, 1.25); g.add(o); const an = malla(new THREE.CylinderGeometry(.03, .03, .6, 5), mat('#1e0b3d')); an.position.set(s * .2, 1.45, 1.05); an.rotation.z = s * .5; g.add(an); const ma = malla(new THREE.SphereGeometry(.16, 8, 6), mat('#a78bfa')); ma.position.set(s * .35, 1.05, -.3); g.add(ma); }
      return g; };
    const gorgojito = (x, z, o = {}) => { const g = cuerpoGorgojo(); contorno(g, 1.07); g.position.set(x, o.base || 0, z); scene.add(g); enemigos.push({ g, tipo: 'gorgojito', x0: x, z0: z, f: Math.random() * 6, vivo: true, r: 1.1, base: o.base || 0, ax: o.ax ?? 6, az: o.az ?? 4 }); };
    const babosa = (x, z) => { const g = new THREE.Group(); const c = malla(new THREE.CapsuleGeometry(.55, 1, 6, 10), mat('#7ee05a')); c.rotation.x = Math.PI / 2; c.position.y = .55; g.add(c);
      for (const s of [-1, 1]) { const o = malla(new THREE.SphereGeometry(.16, 8, 8), mat('#ffffff')); o.position.set(s * .22, 1.2, .55); g.add(o); const pu = malla(new THREE.SphereGeometry(.08, 6, 6), mat('#222')); pu.position.set(s * .22, 1.22, .68); g.add(pu); }
      contorno(g, 1.07); g.position.set(x, 0, z); scene.add(g); enemigos.push({ g, tipo: 'babosa', x0: x, z0: z, f: Math.random() * 6, vivo: true, r: 1, vy: 0, y: 0, base: 0 }); };
    const ponBuho = (x, y, z, r = 0) => { buho.position.set(x, y, z); buho.userData.y0 = y; buho.rotation.y = r; colis.push([x, z, 1.3, y]); };
    const PUERTA = new V3(0, 0, -41);
    let SPAWN = new V3(0, 0, 26), rotos = 0, sonadas = 0, roca = null, jefe = null, portal = null, barreraAbierta = false;
    const muros = [], campanas = [];
    let MIS = [];
    const monedaCercana = () => { let m = null, d = 1e9; for (const c of monedas) if (c.visible) { const k = c.position.distanceTo(pos); if (k < d) { d = k; m = c; } } return m ? m.position : PUERTA; };
    const enemigoCercano = tipo => { let m = null, d = 1e9; for (const e of enemigos) if (e.vivo && e.tipo === tipo) { const k = e.g.position.distanceTo(pos); if (k < d) { d = k; m = e; } } return m ? m.g.position : PUERTA; };
    const misionMonedas = n => ({ txt: () => `Recoge ${n} monedas (${Math.min(mon, n)}/${n})`, ok: () => mon >= n, meta: monedaCercana });
    const misionBuho = { txt: () => 'Habla con el Sabio Búho 🦉 y supera su prueba', ok: () => prueba, meta: () => buho.position };
    const misionPuerta = { txt: () => 'Entra al castillo por la puerta mágica', ok: () => pos.z < -39.5 && Math.abs(pos.x) < 3.5, meta: () => PUERTA };

    if (niv === 0) { // 🌼 Nivel 1: La Pradera del Búho
      for (const [x, z, h] of [[-18, 4, 1.5], [-22, 0, 3], [-26, -5, 4.5], [20, 6, 1.5], [24, 2, 3]]) { const p = plataforma(x, z, h); ponMoneda(x, h + 1, z); }
      for (let i = 0; i < 9; i++) ponMoneda(rnd(-3, 3), 1, 18 - i * 5);
      for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; ponMoneda(Math.cos(an) * 14 + 20, 1, Math.sin(an) * 8 + 20); }
      gorgojito(-10, 6); gorgojito(10, -10); gorgojito(-14, -22); gorgojito(18, 18); babosa(-20, 18); babosa(22, -14); babosa(4, -20);
      ponBuho(6, 0, -31, -.6);
      MIS = [misionMonedas(10), misionBuho, { txt: () => `Derrota 3 gorgojitos (${Math.min(derrotados, 3)}/3) y entra al castillo`, ok: () => derrotados >= 3 && misionPuerta.ok(), meta: () => derrotados < 3 ? enemigoCercano('gorgojito') : PUERTA }];
    } else if (niv === 1) { // 🧱 Nivel 2: Los Muros de Oro
      const oroM = mat('#ffcc33', { emissive: '#6b4500', emissiveIntensity: .35 }), naranja = mat('#ff9a1f');
      for (const [x, z, rot] of [[-12, 10, .4], [16, -2, -.5], [-20, -14, .9]]) { const g = new THREE.Group(); const b = malla(new THREE.BoxGeometry(4.2, 3.6, 1), oroM); b.position.y = 1.8; g.add(b);
        for (const zz of [.52, -.52]) { const s = malla(new THREE.CylinderGeometry(.6, .6, .08, 18), naranja); s.rotation.x = Math.PI / 2; s.position.set(0, 2, zz); g.add(s); }
        contorno(g, 1.04); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g); const cs = [-1.4, 0, 1.4].map(k => { const c = [x + Math.cos(rot) * k, z - Math.sin(rot) * k, 1.05]; colis.push(c); return c; }); muros.push({ g, x, z, roto: false, cs, t: 0 }); }
      const piedraP = mat('#d9cfee'), oroC = mat('#ffc23d', { emissive: '#5a3500', emissiveIntensity: .3 });
      for (const [x, z] of [[22, 16], [-26, 4]]) { const g = new THREE.Group(); const pil = malla(new THREE.CylinderGeometry(.9, 1.15, 9, 14), piedraP); pil.position.y = 4.5; g.add(pil); const capi = malla(new THREE.BoxGeometry(2.4, .4, 2.4), piedraP); capi.position.y = 9.1; g.add(capi);
        const arco = malla(new THREE.TorusGeometry(1, .12, 6, 16, Math.PI), oroC); arco.position.y = 9.3; g.add(arco); const cam = new THREE.Group(); cam.position.y = 10.25; const cuerpoC = malla(new THREE.CylinderGeometry(.35, .85, 1.1, 20, 1, true), mat('#ffc23d', { side: THREE.DoubleSide, emissive: '#5a3500', emissiveIntensity: .3 })); cuerpoC.position.y = -.55; cuerpoC.userData.sinBorde = 1; cam.add(cuerpoC); const tapa = malla(new THREE.SphereGeometry(.36, 12, 8), oroC); tapa.position.y = 0; cam.add(tapa); const bad = malla(new THREE.SphereGeometry(.18, 10, 8), mat('#8a5a2e')); bad.position.y = -1.1; cam.add(bad); g.add(cam);
        contorno(g, 1.03); g.position.set(x, 0, z); scene.add(g); colis.push([x, z, 1.4]); campanas.push({ g, cam, x, z, ok: false, t: 0, p: new V3(x, 9.6, z) }); }
      roca = { m: malla(new THREE.DodecahedronGeometry(1.35, 1), mat('#9b93b3')), x: 6, z: 6, ok: false }; contorno(roca.m, 1.04); scene.add(roca.m);
      roca.placa = new THREE.Group(); { const pl = malla(new THREE.CylinderGeometry(1.7, 1.8, .2, 24), mat('#7be0ff', { emissive: '#1ba6d6', emissiveIntensity: .6 }), false); pl.position.y = .1; roca.placa.add(pl); const an = new THREE.Mesh(new THREE.TorusGeometry(2.1, .1, 6, 32), new THREE.MeshBasicMaterial({ color: '#22e6ff' })); an.rotation.x = Math.PI / 2; an.position.y = .2; roca.placa.add(an); roca.placa.add(brillo('#22e6ff', 5)); }
      roca.placa.position.set(12, 0, -10); scene.add(roca.placa);
      for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; ponMoneda(Math.cos(an) * 8, 1, 12 + Math.sin(an) * 6); }
      for (const [x, z] of [[-9, 13], [13, -5], [-17, -11], [19, 13]]) ponMoneda(x, 1, z);
      gorgojito(-6, -2); gorgojito(8, -20); gorgojito(-16, 22); babosa(18, 24); babosa(-22, -4); babosa(2, 16);
      ponBuho(6, 0, -31, -.6);
      const tareaCercana = () => { const c = []; for (const m of muros) if (!m.roto) c.push(new V3(m.x, 0, m.z)); for (const k of campanas) if (!k.ok) c.push(new V3(k.x, 0, k.z)); if (!roca.ok) c.push(pj === 'coquito' && Math.hypot(pos.x - roca.x, pos.z - roca.z) < 4 ? roca.placa.position : new V3(roca.x, 0, roca.z)); let m = PUERTA, d = 1e9; for (const v of c) { const k = Math.hypot(v.x - pos.x, v.z - pos.z); if (k < d) { d = k; m = v; } } return m; };
      MIS = [{ txt: () => `Abre el camino: 🧱 muros ${rotos}/3 · 🔔 campanas ${sonadas}/2 · 🪨 roca ${roca.ok ? 1 : 0}/1`, ok: () => rotos >= 3 && sonadas >= 2 && roca.ok, meta: tareaCercana }, misionBuho, misionPuerta];
    } else if (niv === 2) { // ☁️ Nivel 3: Las Islas del Cielo
      SPAWN = new V3(0, 0, 24);
      const P3 = [[4, 15, 1.6, 2.4], [8, 9, 3.4, 2.2], [6, 3, 5.2, 2.2, { ax: 'x', amp: 2.5, vel: .9 }], [0, -1, 7, 2.2], [-5, -5, 8.8, 2, { ax: 'z', amp: 2, vel: 1.1 }], [-9, -11, 10.6, 2.2], [-5, -16, 12.4, 2, { ax: 'x', amp: 2.5, vel: .8 }], [1, -18, 14.2, 2.2], [6, -22, 16, 2.2, { ax: 'z', amp: 1.8, vel: 1 }], [0, -28.5, 17.8, 6]];
      for (const [x, z, h, r, mov] of P3) { const p = plataforma(x, z, h, r, mov || null); if (r < 5) ponMoneda(x, h + 1, z, mov ? p : null); }
      for (const [x, z] of [[-3, -25], [3, -25], [-4, -30], [4, -31]]) ponMoneda(x, 18.8, z);
      ponBuho(3.5, 17.8, -31, -.3);
      portal = new THREE.Group(); { const aro = malla(new THREE.TorusGeometry(1.9, .3, 12, 36), mat('#ff3df0', { emissive: '#8b2fd1', emissiveIntensity: .6 })); portal.add(aro); const aro2 = malla(new THREE.TorusGeometry(1.55, .12, 8, 36), mat('#22e6ff', { emissive: '#0b8fb3', emissiveIntensity: .6 })); portal.add(aro2);
        const disco = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ map: lienzo(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, '#ffffff'); r.addColorStop(.4, '#b47bff'); r.addColorStop(1, '#3a0ca3'); g.fillStyle = r; g.fillRect(0, 0, w, w); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 4; for (let a = 0; a < 6; a++) { g.beginPath(); for (let k = 0; k < 60; k++) { const rr = k, an = a + k * .08; g.lineTo(64 + Math.cos(an) * rr, 64 + Math.sin(an) * rr); } g.stroke(); } }), transparent: true, opacity: .9, side: THREE.DoubleSide })); portal.add(disco); portal.userData.disco = disco; portal.add(brillo('#d68bff', 7)); }
      portal.position.set(-3, 20, -32); scene.add(portal);
      babosa(6, 20); babosa(-8, 12); gorgojito(-1, -28.5, { base: 17.8, ax: 2.5, az: 1.5 });
      MIS = [{ txt: () => `Sube de isla en isla y junta 10 monedas (${Math.min(mon, 10)}/10)`, ok: () => mon >= 10, meta: monedaCercana }, { txt: () => 'Habla con el Sabio Búho en la isla más alta', ok: () => prueba, meta: () => buho.position }, { txt: () => 'Entra al portal del cielo 🌀', ok: () => portal.position.distanceTo(new V3(pos.x, pos.y + 1.5, pos.z)) < 2.4, meta: () => portal.position }];
    } else { // 👹 Jefe: Gorgojo Capitán, en la arena frente al castillo
      SPAWN = new V3(0, 0, 10);
      const C = new V3(0, 0, -6), R = 21; const anillo = new THREE.Mesh(new THREE.TorusGeometry(R, .3, 8, 72), new THREE.MeshBasicMaterial({ color: '#b26bff' })); anillo.rotation.x = Math.PI / 2; anillo.position.set(C.x, .15, C.z); scene.add(anillo);
      const matG = MT({ color: '#b26bff', gradientMap: grad, emissive: '#6a1fd1', emissiveIntensity: .55 }), geoG = new THREE.OctahedronGeometry(1, 0);
      for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, ge = new THREE.Mesh(geoG, matG); ge.scale.set(.5, 1.6, .5); ge.position.set(C.x + Math.cos(a) * (R + .8), 1.4, C.z + Math.sin(a) * (R + .8)); contorno(ge, 1.08); scene.add(ge); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2; ponMoneda(C.x + Math.cos(a) * 15, 1, C.z + Math.sin(a) * 15); }
      const g = cuerpoGorgojo(); { const osc = mat('#1e0b3d'), oroJ = mat('#ffc23d', { emissive: '#5a3500', emissiveIntensity: .3 });
        for (const s of [-1, 1]) { const bi = malla(new THREE.CapsuleGeometry(.05, .35, 4, 8), osc); bi.rotation.z = s * 1.25; bi.position.set(s * .25, .86, 1.3); g.add(bi); const ce = malla(new THREE.BoxGeometry(.3, .06, .06), osc); ce.rotation.z = -s * .4; ce.position.set(s * .2, 1.25, 1.22); g.add(ce); }
        const ala = malla(new THREE.CylinderGeometry(.62, .62, .06, 20), osc); ala.position.set(0, 1.38, .72); g.add(ala); const copa = malla(new THREE.CylinderGeometry(.34, .42, .4, 16), osc); copa.position.set(0, 1.6, .72); g.add(copa);
        const banda = malla(new THREE.TorusGeometry(.4, .04, 6, 20), oroJ); banda.rotation.x = Math.PI / 2; banda.position.set(0, 1.48, .72); g.add(banda); const est = malla(new THREE.OctahedronGeometry(.13), oroJ); est.position.set(0, 1.62, 1.08); g.add(est); }
      contorno(g, 1.05); g.scale.setScalar(2.4); g.position.set(0, 0, -18); scene.add(g);
      const mareo = new THREE.Group(); for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(.32), new THREE.MeshBasicMaterial({ color: '#ffe14d' })); const a = i / 3 * Math.PI * 2; s.position.set(Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4); mareo.add(s); } mareo.visible = false; scene.add(mareo);
      jefe = { g, mareo, hp: 6, estado: 'mira', t: 2.2, dir: new V3(), vivo: true, C, R, golpeT: 0, llamo: {} };
      MIS = [{ txt: () => `Vence al Gorgojo Capitán (❤️ ${jefe.hp}/6) · cuando se maree 💫, ¡atácalo!`, ok: () => jefe.hp <= 0, meta: () => jefe.g.position }, { txt: () => '¡Toma el Cristal Amarillo! 💛', ok: () => cristalOk, meta: () => cristal.position }];
    }
    if (!buho.userData.y0 && buho.userData.y0 !== 0) ponBuho(6, 0, -31, -.6);

    let mi = 0, mon = 0, vidas = 3, prueba = false, cristalOk = false, derrotados = 0, invul = 0, giroT = 0, lanzaT = 0, corazaT = 0, cd = 0, tiempo = 0, fin = false, pausa = false;
    const pintarHUD = () => { $('#avvida').textContent = '❤️'.repeat(Math.max(0, vidas)) + '🖤'.repeat(Math.max(0, 3 - vidas)); $('#avmon').textContent = mon; $('#avmis').innerHTML = mi < MIS.length ? `🎯 <b>Misión ${mi + 1}/${MIS.length}:</b> ${MIS[mi].txt()}` : '🏆 ¡Nivel completado!';
      if (jefe) { $('#avjefe').style.display = jefe.hp > 0 ? 'block' : 'none'; $('#avjefe u').style.width = (jefe.hp / 6 * 100) + '%'; } };
    const msg = (t, sub = '', ms = 2600) => { const d = $('#avmsg'); d.innerHTML = t + (sub ? `<small>${sub}</small>` : ''); d.style.opacity = 1; clearTimeout(d._t); d._t = setTimeout(() => d.style.opacity = 0, ms); };
    const pistas = {}; const pista = (k, t, sub) => { const n = performance.now(); if ((pistas[k] || 0) > n) return; pistas[k] = n + 6000; msg(t, sub, 2200); };
    const son = n => { try { FX.son(n); } catch (e) {} };
    const avanzarMision = () => { while (mi < MIS.length && MIS[mi].ok()) { mi++; son('nivel'); if (mi < MIS.length) msg('✅ ¡Misión cumplida!', MIS[mi].txt()); } pintarHUD(); if (mi >= MIS.length && !fin) completarNivel(); };

    // Controles: teclado, joystick táctil, cámara orbital
    const pos = SPAWN.clone(), vel = new V3(); let ry = Math.PI, yaw = 0, pitch = .42, dist = innerHeight > innerWidth ? 13 : 10, enSuelo = true, saltos = 0, cerca = false, sobre = null;
    pintarHUD(); setTimeout(() => msg(`${N.e} ${N.n}`, niv === 1 ? '🔄 Cambia de héroe: Choki rompe el oro, Lulú toca campanas y Coquito empuja la roca' : niv === 3 ? '¡Cuidado con sus embestidas! Esquívalo y ataca cuando se maree 💫' : N.d, 4200), 500);
    const tec = {}, joy = { id: null, x0: 0, y0: 0, x: 0, y: 0 }, giro = { id: null, x: 0, y: 0 }, tactil = matchMedia('(pointer:coarse)').matches;
    const kd = e => { if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return; const k = e.key.toLowerCase(); tec[k] = true; if (k === ' ') { e.preventDefault(); saltar(); } if (k === 'q') usar(); if (k === 'e') hablar(); if (k === 'c') cambiar(); if (/^[1-4]$/.test(k)) cambiar(ORDEN[+k - 1]); };
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
    function saltar() { if (pausa || fin) return; if (enSuelo) { vel.y = E.salto; enSuelo = false; saltos = 1; son('salto'); } else if (saltos < E.saltos) { vel.y = E.salto * .86; saltos = 2; son('salto'); } }
    function cambiar(id) { if (fin || pausa) return; if (!id) id = ORDEN[(ORDEN.indexOf(pj) + 1) % ORDEN.length]; if (id === pj || !MODELOS[id]) return;
      M.g.visible = false; if (M.burbuja) M.burbuja.visible = false; pj = id; M = MODELOS[pj]; E = EQUIPO[pj]; M.g.visible = true; giroT = lanzaT = corazaT = 0; cd = 0; saltos = enSuelo ? 0 : 2;
      destello.scale.setScalar(6); destello.material.opacity = 1; son('pop'); msg(`${E.e} ¡${E.n}!`, E.txt, 1700); $('#avgiro').textContent = E.btn; $('#avcambio').textContent = `🔄 ${E.e}`; }
    // Poderes de cada héroe
    const frente = () => [Math.sin(ry), Math.cos(ry)];
    function golpeArea(r) { for (const en of enemigos) if (en.vivo && en.g.position.distanceTo(pos) < r) derrotar(en); if (jefe && jefe.vivo && Math.hypot(jefe.g.position.x - pos.x, jefe.g.position.z - pos.z) < r + 2) golpearJefe(); }
    function golpeFrente(alc) { const [fx, fz] = frente();
      for (const en of enemigos) if (en.vivo) { const dx = en.g.position.x - pos.x, dz = en.g.position.z - pos.z, d = Math.hypot(dx, dz); if (d < alc && (dx * fx + dz * fz) / (d || 1) > .4 && Math.abs(en.g.position.y - pos.y) < 2.5) derrotar(en); }
      for (const m of muros) if (!m.roto) { const dx = m.x - pos.x, dz = m.z - pos.z, d = Math.hypot(dx, dz); if (d < alc + 1.6 && (dx * fx + dz * fz) / (d || 1) > .2) romperMuro(m); }
      if (jefe && jefe.vivo) { const dx = jefe.g.position.x - pos.x, dz = jefe.g.position.z - pos.z, d = Math.hypot(dx, dz); if (d < alc + 2 && (dx * fx + dz * fz) / (d || 1) > .3) golpearJefe(); } }
    const nubesP = [], geoNP = new THREE.SphereGeometry(.38, 12, 10), matNP = mat('#ffffff', { emissive: '#cfe8ff', emissiveIntensity: .4 });
    function dispararNube() { const [fx, fz] = frente(), o = new V3(pos.x + fx * 1.4, pos.y + 2.6, pos.z + fz * 1.4); let obj = null, mejor = 1e9; const cand = [];
      for (const c of campanas) if (!c.ok) cand.push(c.p); for (const en of enemigos) if (en.vivo) cand.push(en.g.position.clone().setY(en.g.position.y + .8)); if (jefe && jefe.vivo) cand.push(jefe.g.position.clone().setY(1.8));
      for (const p of cand) { const dx = p.x - o.x, dz = p.z - o.z, h = Math.hypot(dx, dz); if (h < 28 && h > .1 && (dx * fx + dz * fz) / h > .78 && h < mejor) { mejor = h; obj = p; } }
      const dir = obj ? obj.clone().sub(o).normalize() : new V3(fx, -.04, fz).normalize();
      const m = new THREE.Group(); for (const [x, y, s] of [[0, 0, 1], [.3, .1, .75], [-.3, .05, .7]]) { const b = new THREE.Mesh(geoNP, matNP); b.scale.setScalar(s); b.position.set(x, y, 0); m.add(b); } m.position.copy(o); scene.add(m); nubesP.push({ m, v: dir.multiplyScalar(26), vida: 1.4 }); }
    function usar() { if (pausa || fin || cd > 0) return;
      if (E.hab === 'giro') { giroT = .9; cd = .9; son('pop'); golpeArea(3.2); }
      else if (E.hab === 'nube') { cd = .45; son('pop'); dispararNube(); }
      else if (E.hab === 'lanza') { cd = .6; lanzaT = .35; son('pop'); golpeFrente(3.8); }
      else { corazaT = 2.4; cd = 4.5; son('nivel'); msg('🛡️ ¡Coraza!', 'No recibes daño y derribas a quien te toque', 1300); } }
    function derrotar(en) { if (!en.vivo) return; en.vivo = false; derrotados += en.tipo === 'gorgojito' ? 1 : 0; mon += 2; son('moneda'); msg(en.tipo === 'gorgojito' ? '💥 ¡Gorgojito derrotado!' : '💥 ¡Babosa derrotada!', '+2 🪙', 1500); en.muere = 1; avanzarMision(); pintarHUD(); }
    const piezas = [];
    function romperMuro(m) { if (m.roto) return; m.roto = true; rotos++; for (const c of m.cs) c[2] = 0; mon += 3; son('moneda'); msg('💥 ¡Muro de oro roto!', `+3 🪙 · ${rotos}/3`, 1500);
      for (let i = 0; i < 10; i++) { const p = malla(new THREE.BoxGeometry(.5, .5, .3), mat('#ffcc33'), false); p.position.set(m.x + rnd(-1.5, 1.5), rnd(.5, 3), m.z + rnd(-.5, .5)); scene.add(p); piezas.push({ p, v: new V3(rnd(-5, 5), rnd(4, 9), rnd(-5, 5)), t: 1.2 }); } m.g.visible = false; avanzarMision(); pintarHUD(); }
    function tocarCampana(c) { if (c.ok) return; c.ok = true; c.t = 2.5; sonadas++; son('nivel'); msg('🔔 ¡Dooong!', `Campana ${sonadas}/2`, 1500); const b = brillo('#ffe14d', 5); b.position.y = 9.8; c.g.add(b); avanzarMision(); pintarHUD(); }
    function golpearJefe() { if (!jefe || !jefe.vivo) return; if (jefe.estado !== 'mareado') { pista('jefe', '🛡️ ¡Su armadura lo protege!', 'Esquiva su embestida: cuando choque y se maree 💫, ¡ataca!'); return; }
      jefe.hp--; jefe.golpeT = .5; son('moneda'); msg('💥 ¡Golpe al Capitán!', `Le quedan ${jefe.hp} ❤️`, 1300); jefe.estado = 'golpe'; jefe.t = .9; jefe.dir.set(jefe.g.position.x - pos.x, 0, jefe.g.position.z - pos.z).normalize();
      if ((jefe.hp === 4 || jefe.hp === 2) && !jefe.llamo[jefe.hp]) { jefe.llamo[jefe.hp] = 1; for (const s of [-1, 1]) gorgojito(jefe.C.x + s * 10, jefe.C.z + rnd(-6, 6), { ax: 4, az: 3 }); setTimeout(() => msg('📣 ¡A mí, gorgojitos!', 'El Capitán llamó refuerzos', 1600), 1400); }
      if (jefe.hp <= 0) { jefe.vivo = false; jefe.estado = 'fin'; jefe.t = 1.2; jefe.mareo.visible = false; son('nivel'); msg('🏆 ¡Venciste al Gorgojo Capitán!', 'El Cristal Amarillo apareció 💛', 3000); cristal.position.set(jefe.C.x, 2.2, jefe.C.z); cristal.visible = true; luzC.position.set(jefe.C.x, 3, jefe.C.z); luzC.intensity = 1.2; try { FX.confeti?.(); } catch (e) {} avanzarMision(); }
      pintarHUD(); }
    function herir(dx, dz, desdeJefe = false) { if (invul > 0 || fin) return; if (corazaT > 0) { if (desdeJefe && jefe.estado === 'carga') { jefe.estado = 'mareado'; jefe.t = 3; msg('🛡️ ¡Rebotó en la coraza!', '¡Ahora ataca!', 1400); son('pop'); } return; }
      vidas--; invul = 1.5; son('error'); vel.y = 7; const d = Math.hypot(dx, dz) || 1; pos.x += dx / d * 2.5; pos.z += dz / d * 2.5; pintarHUD();
      if (vidas <= 0) { vidas = 3; pos.copy(SPAWN); vel.set(0, 0, 0); msg('😵 ¡Uy! Vuelves al inicio', 'Tus monedas se quedan contigo'); pintarHUD(); } else msg('💢 ¡Auch!', `Salta encima de los enemigos o usa tu poder ${E.btn}`, 1600); }
    function hablar() { if (!cerca || pausa || fin) return; if (prueba) { msg('🦉 Sabio Búho', niv === 2 ? '¡Bien hecho! Entra al portal del cielo 🌀' : '¡Bien hecho! La puerta del castillo está abierta.'); return; } abrirPrueba(); }
    $('#avsalto').addEventListener('pointerdown', e => { e.preventDefault(); saltar(); });
    $('#avgiro').addEventListener('pointerdown', e => { e.preventDefault(); usar(); });
    $('#avcambio').addEventListener('click', () => cambiar());
    $('#avhab').addEventListener('click', () => hablar());
    $('#avgiro').textContent = E.btn; $('#avcambio').textContent = `🔄 ${E.e}`;
    $('#avson').onclick = () => { const on = LS.get('arcSonido') === '0'; LS.set('arcSonido', on ? '1' : '0'); $('#avson').textContent = on ? '🔊' : '🔇'; };
    $('#avsal').onclick = () => { parar(); cerrar(ov); try { A.salir?.(); } catch (e) {} };

    // Prueba del Sabio Búho: 3 preguntas del banco, hay que acertar 2. Fallar explica la respuesta y deja reintentar.
    function abrirPrueba() {
      pausa = true; const qs = (BANCO || []).slice().sort(() => Math.random() - .5).slice(0, 3).map(P => { const ops = [P.ok, ...P.malas].sort(() => Math.random() - .5); return { ...P, ops, k: ops.indexOf(P.ok) }; }); let k = 0, bien = 0; const p = $('#avpanel'); p.style.display = 'block';
      const pinta = () => { const Q = qs[k]; p.innerHTML = `<h3>🦉 Prueba del Sabio Búho · ${k + 1}/3</h3><p class="avz-mat">${escH(Q.mat)}</p><p class="avz-q">${escH(Q.q)}</p>${Q.ops.map((o, i) => `<button class="avz-op" data-o="${i}">${escH(o)}</button>`).join('')}<p class="avz-ex" id="avex"></p>`; };
      pinta();
      p.onclick = e => { const b = e.target.closest('[data-o]'); if (!b || b.disabled) return; const Q = qs[k], acierto = +b.dataset.o === Q.k;
        p.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (+x.dataset.o === Q.k) x.classList.add('ok'); else if (x === b) x.classList.add('mal'); });
        $('#avex').textContent = (acierto ? '✅ ¡Correcto! ' : '💡 ') + (Q.ex || (acierto ? '' : 'La respuesta correcta es: ' + Q.ok)); if (acierto) { bien++; son('moneda'); } else son('error');
        setTimeout(() => { k++; if (k < 3) return pinta();
          if (bien >= 2) { prueba = true; mon += 5; p.style.display = 'none'; pausa = false; msg('✨ ¡Superaste la prueba!', (niv === 2 ? 'El portal del cielo se abrió 🌀' : 'La barrera del castillo se abrió') + ' · +5 🪙'); if (niv < 2) { barreraAbierta = true; barrera.userData.abrir = 1; } try { PERFIL.evento('trivia'); } catch (er) {} avanzarMision(); }
          else { p.innerHTML = `<h3>🦉 ¡Casi!</h3><p>Acertaste ${bien} de 3. Necesitas 2 para seguir.</p><button class="avz-op ok" id="avotra">🔁 Intentar otra vez</button>`; $('#avotra').onclick = () => { p.style.display = 'none'; pausa = false; abrirPrueba(); }; } }, 1900); };
    }

    function completarNivel() {
      fin = true; const seg = Math.round(tiempo), est = seg < N.t[0] ? 3 : seg < N.t[1] ? 2 : 1, J = datosJ();
      J.partidas++; J.est[niv] = Math.max(J.est[niv] || 0, est); J.nivel = Math.max(J.nivel, niv + 1); J.pj = pj;
      if (N.jefe) { J.cristales = Math.max(J.cristales, 1); J.mejorTiempo = J.mejorTiempo ? Math.min(J.mejorTiempo, seg) : seg; }
      try { PERFIL.ganar(mon); PERFIL.partida('aventura', mon * 10 + est * 100 + niv * 200); } catch (e) {}
      son('nivel'); try { FX.confeti?.(); } catch (e) {}
      const p = $('#avpanel'); p.style.display = 'block'; const sig = niv < NIVELES.length - 1 ? NIVELES[niv + 1] : null;
      p.innerHTML = `<h3>${N.jefe ? '🏆 ¡Recuperaste el Cristal Amarillo!' : `🎉 ¡Nivel ${niv + 1} completado!`}</h3><p style="font-size:2rem;margin:4px 0">${'⭐'.repeat(est)}${'☆'.repeat(3 - est)}</p><p>🪙 ${mon} monedas · ⏱️ ${seg} segundos · 💥 ${derrotados} gorgojitos</p>
        ${N.jefe ? '<p class="avz-ex">¡El Reino de Yupitok recuperó su color amarillo! Los cristales del Bosque Encantado, el Imperio Dorado, el Volcán de Fuego y la Fortaleza de Grun llegan muy pronto.</p>' : `<p class="avz-ex">Siguiente: ${sig.e} ${escH(sig.n)}</p>`}
        ${sig ? `<button class="avz-op ok" id="avsig">▶ Siguiente nivel</button>` : ''}<button class="avz-op ${sig ? '' : 'ok'}" id="avcomp">📤 Compartir mi récord</button><button class="avz-op" id="avotra">🔁 Repetir nivel</button><button class="avz-op" id="avfin">🏠 Menú de niveles</button>`;
      $('#avcomp').onclick = () => { const txt = N.jefe ? `👑 ¡Vencí al Gorgojo Capitán y recuperé el Cristal Amarillo en Yupitok: El Universo de las Aventuras! (${'⭐'.repeat(est)}) ¿Puedes ganarme?` : `👑 Completé "${N.n}" en ${seg} segundos (${'⭐'.repeat(est)}) en Yupitok: El Universo de las Aventuras. ¿Puedes ganarme?`, url = location.origin + '/?g=arcade-aventura&src=reto-aventura'; if (navigator.share) navigator.share({ text: txt, url }).catch(() => {}); else open('https://wa.me/?text=' + encodeURIComponent(txt + ' ' + url), '_blank'); };
      if (sig) $('#avsig').onclick = () => { parar(); lanzar(t, ov, pj, niv + 1); };
      $('#avotra').onclick = () => { parar(); lanzar(t, ov, pj, niv); };
      $('#avfin').onclick = () => { parar(); ov.remove(); portada(t); };
    }

    // Física: suelo, plataformas (fijas, flotantes y móviles) y colisiones circulares
    const dentro = (p, x, z) => Math.hypot(x - p.x, z - p.z) < p.r;
    const sueloEn = (x, z, y) => { let h = 0, s = null; for (const p of plataformas) if (p.h <= y + .6 && p.h > h && dentro(p, x, z)) { h = p.h; s = p; } return [h, s]; };
    const bloquea = (x, z, y) => plataformas.some(p => p.h > y + .6 && p.h - p.g < y + 2.2 && dentro(p, x, z));
    const tmp = new V3(); let last = 0, raf = 0, vivo = true;
    function bucle(ts) {
      if (!vivo) return; raf = requestAnimationFrame(bucle); const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; const tt = ts / 1000;
      // plataformas móviles (llevan al jugador y a sus monedas)
      for (const p of plataformas) if (p.mov) { const nv = (p.mov.ax === 'x' ? p.x0 : p.z0) + Math.sin(tt * p.mov.vel) * p.mov.amp; if (p.mov.ax === 'x') { p.dx = nv - p.x; p.dz = 0; p.x = nv; } else { p.dz = nv - p.z; p.dx = 0; p.z = nv; } p.m.position.x = p.x; p.m.position.z = p.z;
        for (const c of monedas) if (c.userData.plat === p) { c.position.x += p.dx; c.position.z += p.dz; } if (sobre === p && enSuelo && !pausa && !fin) { pos.x += p.dx; pos.z += p.dz; } }
      if (!pausa && !fin) {
        tiempo += dt; invul = Math.max(0, invul - dt); giroT = Math.max(0, giroT - dt); lanzaT = Math.max(0, lanzaT - dt); corazaT = Math.max(0, corazaT - dt); cd = Math.max(0, cd - dt);
        let ix = (tec.d || tec.arrowright ? 1 : 0) - (tec.a || tec.arrowleft ? 1 : 0) + joy.x, iz = (tec.w || tec.arrowup ? 1 : 0) - (tec.s || tec.arrowdown ? 1 : 0) + joy.y;
        const l = Math.hypot(ix, iz); if (l > 1) { ix /= l; iz /= l; }
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw), vx = (fx * iz + rx * ix) * E.vel, vz = (fz * iz + rz * ix) * E.vel;
        let nx = pos.x + vx * dt, nz = pos.z + vz * dt;
        if (pos.y < 8.5) for (const c of colis) { const [cx, cz, cr, cy] = c; if (!cr || (cy !== undefined && Math.abs(pos.y - cy) > 2.5)) continue; const dx = nx - cx, dz = nz - cz, d = Math.hypot(dx, dz), m = cr + .6; if (d < m && d > 0) { nx = cx + dx / d * m; nz = cz + dz / d * m; } }
        else if (buho.userData.y0 > 8) { const dx = nx - buho.position.x, dz = nz - buho.position.z, d = Math.hypot(dx, dz); if (d < 1.9 && d > 0) { nx = buho.position.x + dx / d * 1.9; nz = buho.position.z + dz / d * 1.9; } }
        if (roca && !roca.ok && pos.y < 2) { const dx = nx - roca.x, dz = nz - roca.z, d = Math.hypot(dx, dz), m = 1.35 + .6; if (d < m && d > 0) {
            if (pj === 'coquito') { const rx2 = nx - dx / d * m, rz2 = nz - dz / d * m; let libre = Math.hypot(rx2, rz2) < 62; for (const c of colis) if (c[2] && Math.hypot(rx2 - c[0], rz2 - c[1]) < c[2] + 1.3) libre = false;
              if (libre) { roca.m.rotation.x += (rz2 - roca.z) * .8; roca.m.rotation.z -= (rx2 - roca.x) * .8; roca.x = rx2; roca.z = rz2; } else { nx = roca.x + dx / d * m; nz = roca.z + dz / d * m; } }
            else { nx = roca.x + dx / d * m; nz = roca.z + dz / d * m; pista('roca', '🪨 ¡Muy pesada!', 'Cambia a Coquito 🥥 con 🔄 para empujarla'); } }
          if (Math.hypot(roca.x - roca.placa.position.x, roca.z - roca.placa.position.z) < 1.6) { roca.ok = true; roca.x = roca.placa.position.x; roca.z = roca.placa.position.z; son('nivel'); msg('✨ ¡La roca activó la placa mágica!', '🪨 1/1'); try { FX.confeti?.(); } catch (e) {} avanzarMision(); }
          roca.m.position.set(roca.x, 1.25, roca.z); }
        if (!barreraAbierta && nz < -36.2 && nz > -38 && Math.abs(nx) < 3.2 && pos.y < 8) nz = -36.2; // barrera mágica
        if (jefe) { const dx = nx - jefe.C.x, dz = nz - jefe.C.z, d = Math.hypot(dx, dz); if (d > jefe.R - .6) { nx = jefe.C.x + dx / d * (jefe.R - .6); nz = jefe.C.z + dz / d * (jefe.R - .6); } }
        const rr = Math.hypot(nx, nz); if (rr > 68) { nx *= 68 / rr; nz *= 68 / rr; }
        if (bloquea(nx, nz, pos.y)) { if (!bloquea(nx, pos.z, pos.y)) nz = pos.z; else if (!bloquea(pos.x, nz, pos.y)) nx = pos.x; else { nx = pos.x; nz = pos.z; } }
        pos.x = nx; pos.z = nz; if (Math.hypot(vx, vz) > .5) ry = Math.atan2(vx, vz);
        const yAntes = pos.y; vel.y -= 26 * dt; pos.y += vel.y * dt;
        if (vel.y > 0) for (const p of plataformas) if (p.h - p.g > yAntes + 2.1 && pos.y + 2.2 > p.h - p.g && dentro(p, pos.x, pos.z)) { pos.y = p.h - p.g - 2.2; vel.y = 0; }
        const [hS, pS] = sueloEn(pos.x, pos.z, yAntes);
        if (pos.y <= hS) { if (!enSuelo && vel.y < -2) son('pop'); pos.y = hS; vel.y = 0; enSuelo = true; saltos = 0; sobre = pS; } else { enSuelo = false; sobre = null; }
        // pistas: qué héroe usar
        if (niv === 1) { for (const m of muros) if (!m.roto && pj !== 'choki' && Math.hypot(m.x - pos.x, m.z - pos.z) < 4.5) pista('muro', '🧱 Muro de oro', 'Solo el lanzazo de Choki 🌽 lo rompe: cambia con 🔄'); for (const c of campanas) if (!c.ok && pj !== 'lulu' && Math.hypot(c.x - pos.x, c.z - pos.z) < 9) pista('campana', '🔔 Campana muy alta', 'Lulú 🦙 la alcanza con su escupitajo de nubes ☁️'); }
        // monedas
        for (const m of monedas) if (m.visible) { m.rotation.z += dt * 3; if (Math.hypot(m.position.x - pos.x, m.position.z - pos.z) < 1.2 && Math.abs(m.position.y - (pos.y + 1)) < 1.6) { m.visible = false; mon++; son('moneda'); pintarHUD(); avanzarMision(); } }
        // enemigos
        for (const en of enemigos) { const g = en.g;
          if (en.muere) { en.muere += dt * 3; g.scale.setScalar(Math.max(0, 1 - (en.muere - 1))); g.rotation.y += dt * 12; if (en.muere > 2) { g.visible = false; en.muere = 0; } continue; }
          if (!en.vivo) continue; en.f += dt;
          if (en.tipo === 'gorgojito') { const tx = en.x0 + Math.sin(en.f * .6) * en.ax, tz = en.z0 + Math.cos(en.f * .45) * en.az; const ang = Math.atan2(tx - g.position.x, tz - g.position.z); g.position.x = tx; g.position.z = tz; g.rotation.y = ang; g.position.y = en.base + Math.abs(Math.sin(en.f * 8)) * .1; }
          else { const d = Math.hypot(pos.x - g.position.x, pos.z - g.position.z); en.vy -= 20 * dt; en.y += en.vy * dt; if (en.y <= 0) { en.y = 0; en.vy = d < 14 ? 7 : 4; } if (en.y > 0 && d < 14 && d > .1) { g.position.x += (pos.x - g.position.x) / d * 3 * dt; g.position.z += (pos.z - g.position.z) / d * 3 * dt; g.rotation.y = Math.atan2(pos.x - g.position.x, pos.z - g.position.z); } g.position.y = en.base + en.y; g.scale.y = 1 + (en.y > 0 ? .15 : -.1); }
          const d = Math.hypot(pos.x - g.position.x, pos.z - g.position.z);
          if (d < en.r + .5 && Math.abs(pos.y - g.position.y) < 1.8) { if (corazaT > 0) derrotar(en); else if (vel.y < -1 && pos.y > g.position.y + .5) { derrotar(en); vel.y = 9; } else herir(pos.x - g.position.x, pos.z - g.position.z); } }
        // jefe: mira → embiste → se marea al chocar con el borde → recibe golpes
        if (jefe && jefe.estado !== 'fin') { const g = jefe.g, dxj = pos.x - g.position.x, dzj = pos.z - g.position.z, dj = Math.hypot(dxj, dzj); jefe.t -= dt; jefe.golpeT = Math.max(0, jefe.golpeT - dt);
          if (jefe.estado === 'mira') { g.rotation.y = Math.atan2(dxj, dzj); g.position.y = Math.abs(Math.sin(tt * 18)) * (jefe.t < .6 ? .25 : .05); if (jefe.t <= 0) { jefe.estado = 'carga'; jefe.t = 2.4; jefe.dir.set(dxj, 0, dzj).normalize(); son('salto'); } }
          else if (jefe.estado === 'carga') { const v = 13 + (6 - jefe.hp) * 1.2; g.position.x += jefe.dir.x * v * dt; g.position.z += jefe.dir.z * v * dt; g.position.y = Math.abs(Math.sin(tt * 20)) * .2; const dc = Math.hypot(g.position.x - jefe.C.x, g.position.z - jefe.C.z);
            if (dc > jefe.R - 2.6) { jefe.estado = 'mareado'; jefe.t = 3; son('pop'); pista('mareo', '💫 ¡Se mareó!', '¡Ahora! Salta encima o usa tu poder'); } else if (jefe.t <= 0) { jefe.estado = 'mira'; jefe.t = 1.2; } }
          else if (jefe.estado === 'mareado') { g.position.y = 0; g.rotation.z = Math.sin(tt * 6) * .15; if (jefe.t <= 0) { jefe.estado = 'mira'; jefe.t = Math.max(.8, 1.6 - (6 - jefe.hp) * .15); g.rotation.z = 0; } }
          else if (jefe.estado === 'golpe') { g.position.x += jefe.dir.x * 8 * dt; g.position.z += jefe.dir.z * 8 * dt; const dc = Math.hypot(g.position.x - jefe.C.x, g.position.z - jefe.C.z); if (dc > jefe.R - 2.6) { g.position.x = jefe.C.x + (g.position.x - jefe.C.x) / dc * (jefe.R - 2.6); g.position.z = jefe.C.z + (g.position.z - jefe.C.z) / dc * (jefe.R - 2.6); } if (jefe.t <= 0) { jefe.estado = 'mira'; jefe.t = 1.3; g.rotation.z = 0; } }
          jefe.mareo.visible = jefe.estado === 'mareado'; jefe.mareo.position.set(g.position.x, 5.2, g.position.z); jefe.mareo.rotation.y += dt * 4;
          g.scale.setScalar(2.4 * (1 + (jefe.golpeT > 0 ? Math.sin(jefe.golpeT * 40) * .06 : 0)));
          if (dj < 2.9 && jefe.estado !== 'golpe') { if (pos.y > 2 && vel.y < 0) { vel.y = 11; if (jefe.estado === 'mareado') golpearJefe(); else pista('jefe', '🛡️ ¡Su armadura lo protege!', 'Esquiva su embestida: cuando choque y se maree 💫, ¡ataca!'); } else if (jefe.estado !== 'mareado') herir(dxj, dzj, true); } }
        if (jefe && jefe.estado === 'fin') { jefe.t -= dt; jefe.g.scale.setScalar(Math.max(.01, 2.4 * jefe.t / 1.2)); jefe.g.rotation.y += dt * 10; if (jefe.t <= 0) jefe.g.visible = false; }
        // nubes de Lulú
        for (let i = nubesP.length - 1; i >= 0; i--) { const n = nubesP[i]; n.m.position.addScaledVector(n.v, dt); n.vida -= dt; n.m.rotation.z += dt * 6; let fuera = n.vida <= 0;
          for (const en of enemigos) if (!fuera && en.vivo && n.m.position.distanceTo(tmp.copy(en.g.position).setY(en.g.position.y + .8)) < 1.5) { derrotar(en); fuera = true; }
          for (const c of campanas) if (!fuera && !c.ok && n.m.position.distanceTo(c.p) < 2) { tocarCampana(c); fuera = true; }
          if (!fuera && jefe && jefe.vivo && n.m.position.distanceTo(tmp.copy(jefe.g.position).setY(1.8)) < 3) { golpearJefe(); fuera = true; }
          for (const m of muros) if (!fuera && !m.roto && Math.hypot(n.m.position.x - m.x, n.m.position.z - m.z) < 2.3 && n.m.position.y < 4) { pista('muro2', '🧱 El oro es muy duro', 'Usa el lanzazo de Choki 🌽'); fuera = true; }
          if (fuera) { scene.remove(n.m); nubesP.splice(i, 1); } }
        // Sabio Búho: botón para hablar
        cerca = Math.hypot(pos.x - buho.position.x, pos.z - buho.position.z) < 4 && Math.abs(pos.y - buho.userData.y0) < 2.5; $('#avhab').style.display = cerca ? 'block' : 'none';
        // cristal (al vencer al jefe)
        if (jefe && cristal.visible && !cristalOk && Math.hypot(pos.x - cristal.position.x, pos.z - cristal.position.z) < 2.2) { cristalOk = true; cristal.visible = false; luzC.intensity = 0; son('nivel'); }
        if (mi < MIS.length && MIS[mi].ok()) avanzarMision();
      }
      // piezas de los muros rotos
      for (let i = piezas.length - 1; i >= 0; i--) { const q = piezas[i]; q.v.y -= 20 * dt; q.p.position.addScaledVector(q.v, dt); q.p.rotation.x += dt * 8; q.t -= dt; if (q.t <= 0 || q.p.position.y < -1) { scene.remove(q.p); piezas.splice(i, 1); } }
      for (const c of campanas) if (c.t > 0) { c.t = Math.max(0, c.t - dt); c.cam.rotation.z = Math.sin(c.t * 12) * .5 * c.t / 2.5; }
      // animaciones del héroe
      jug.position.copy(pos); jug.rotation.y = ry; const mov = Math.hypot(joy.x, joy.y) > .1 || ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(k => tec[k]);
      const sw = mov && enSuelo ? Math.sin(tt * 12) * .7 : 0; M.piernas.forEach((p, i) => p.rotation.x = i % 2 ? -sw : sw);
      if (M.brazos.length) { M.brazos[0].rotation.x = -sw * .8; M.brazos[1].rotation.x = sw * .8; M.brazos[0].rotation.z = enSuelo ? 0 : -.6; M.brazos[1].rotation.z = enSuelo ? 0 : .6; }
      if (pj === 'choki' && lanzaT > 0) { M.brazos[1].rotation.x = -1.5 * Math.sin((1 - lanzaT / .35) * Math.PI); M.brazos[1].rotation.z = 0; }
      M.cu.position.y = mov && enSuelo ? Math.abs(Math.sin(tt * 12)) * .08 : Math.sin(tt * 2) * .03;
      M.cu.rotation.y = pj === 'yupi' && giroT > 0 ? (1 - giroT / .9) * Math.PI * 4 : 0;
      if (M.capa) M.capa.rotation.x = .12 + (mov ? .35 : .05) + Math.sin(tt * 6) * .05;
      if (M.burbuja) { M.burbuja.visible = corazaT > 0; M.burbuja.scale.setScalar(1 + Math.sin(tt * 8) * .04); }
      jug.visible = !(invul > 0 && Math.floor(tt * 12) % 2);
      const hS2 = sueloEn(pos.x, pos.z, pos.y)[0]; sombraY.position.set(pos.x, hS2 + .05, pos.z); sombraY.scale.setScalar(Math.max(.4, 1 - (pos.y - hS2) * .12));
      if (destello.material.opacity > 0) { destello.material.opacity = Math.max(0, destello.material.opacity - dt * 2.5); destello.position.set(pos.x, pos.y + 1.5, pos.z); }
      cristal.rotation.y += .02; if (cristal.visible) cristal.position.y = 2.2 + Math.sin(tt * 2) * .2;
      if (barrera.userData.abrir) { barrera.material.opacity = Math.max(0, barrera.material.opacity - .01); barrera.position.y += .04; if (barrera.material.opacity <= 0) barrera.visible = false; }
      buho.position.y = (buho.userData.y0 || 0) + Math.sin(tt * 1.5) * .05;
      if (portal) { portal.rotation.y = Math.sin(tt * .8) * .25; portal.userData.disco.rotation.z -= dt * 2; portal.scale.setScalar(prueba ? 1 : .55); }
      if (roca && roca.ok) roca.placa.children[1].scale.setScalar(1 + Math.sin(tt * 4) * .05);
      scene.children.forEach(o => { if (o.userData.f !== undefined) o.position.y += Math.sin(tt + o.userData.f) * .005; });
      for (const n of nubes) { n.position.x += n.userData.v * dt; if (n.position.x > 230) n.position.x = -230; }
      polvo.rotation.y += dt * .02; castillo.traverse(o => { if (o.userData.ondea) o.rotation.y = Math.sin(tt * 3 + o.position.x) * .3; });
      const meta = mi < MIS.length ? MIS[mi].meta() : pos;
      tmp.set(pos.x, pos.y + 3.8, pos.z).lerp(new V3(meta.x, pos.y + 3.8, meta.z), .12); estrellin.position.lerp(tmp, .08);
      estrellin.quaternion.copy(cam.quaternion); estrellin.rotateZ(Math.sin(tt * 3) * .2);
      // cámara
      const cx = pos.x + Math.sin(yaw) * Math.cos(pitch) * dist, cz = pos.z + Math.cos(yaw) * Math.cos(pitch) * dist, cy = pos.y + 1.5 + Math.sin(pitch) * dist;
      cam.position.lerp(tmp.set(cx, cy, cz), .15); cam.lookAt(pos.x, pos.y + 1.8, pos.z); sol.position.set(pos.x + 30, pos.y + 50, pos.z + 20); sol.target.position.copy(pos);
      cielo.position.copy(cam.position); renderer.render(scene, cam);
    }
    raf = requestAnimationFrame(t0 => { last = t0; raf = requestAnimationFrame(bucle); });
    setTimeout(() => { const a = $('#avayuda'); if (a) a.style.opacity = 0; }, 8000);
    function parar() { vivo = false; if (CM) CM.legacyMode = cmAntes; cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('resize', tam); try { renderer.dispose(); } catch (e) {} }
    setParar(() => { parar(); cerrar(ov); });
    window.__aventura = { get estado() { return { niv, pj, mi, nm: MIS.length, mon, vidas, prueba, derrotados, rotos, sonadas, rocaOk: !!roca?.ok, jefeHp: jefe ? jefe.hp : null, jefeEstado: jefe ? jefe.estado : null, cristalOk, fin, cd: +cd.toFixed(2), pos: [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2)] }; },
      tp: (x, z, y = 0) => { pos.set(x, y, z); vel.set(0, 0, 0); }, mirar: a => { ry = a; }, usar, cambiar, saltar, ganarMonedas: n => { mon += n; avanzarMision(); }, derrotarTodos: () => enemigos.filter(e => e.tipo === 'gorgojito').forEach(derrotar),
      marear: () => { if (jefe) { jefe.estado = 'mareado'; jefe.t = 5; } }, tpJefe: () => { if (jefe) { pos.set(jefe.g.position.x + 2.5, 0, jefe.g.position.z); vel.set(0, 0, 0); } }, roca: () => roca && { x: roca.x, z: roca.z, placa: [roca.placa.position.x, roca.placa.position.z] }, muros: () => muros.map(m => [m.x, m.z, m.roto]), campanas: () => campanas.map(c => [c.x, c.z, c.ok]), camara: (y, pi, d) => { yaw = y; pitch = pi; dist = d; } };
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
    .avz-op.ok{background:#16a34a;border-color:#4ade80}.avz-op.mal{background:#b91c1c;border-color:#f87171}.avz-ex{font-size:.9rem;opacity:.9;min-height:1.2em}
    .avz-p.sel{background:linear-gradient(160deg,#ffcf2e,#ff7a1a);color:#2b1645;box-shadow:0 0 24px rgba(255,210,63,.85);transform:scale(1.04)}
    .avz-niveles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:10px 0}
    .avz-n{border:2px solid rgba(255,255,255,.18);border-radius:18px;background:linear-gradient(160deg,rgba(34,230,255,.3),rgba(15,10,40,.85));color:#fff;padding:10px 6px;cursor:pointer;font:inherit}
    .avz-n span{font-size:2rem;display:block}.avz-n b{display:block}.avz-n small{display:block;font-size:.75rem;opacity:.9}.avz-n em{font-style:normal;font-size:.8rem}
    .avz-n.sel{border-color:#22e6ff;box-shadow:0 0 20px rgba(34,230,255,.7)}.avz-n.lock{filter:grayscale(.7);opacity:.6}
    #avcambio{font-size:1.05rem}.avz-mat{margin:0 0 4px;font-size:.8rem;color:#22e6ff;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    #avjefe{position:fixed;left:50%;top:12px;transform:translateX(-50%);width:min(60vw,320px);display:none;text-align:center;z-index:2;font-size:.85rem;text-shadow:0 2px 6px #000}
    #avjefe i{display:block;height:12px;border-radius:8px;background:rgba(0,0,0,.5);border:2px solid #fff;overflow:hidden;margin-top:3px}#avjefe u{display:block;height:100%;width:100%;background:linear-gradient(90deg,#ff3d6e,#b26bff);transition:width .3s}
    @media (max-width:600px){#avjefe{top:auto;bottom:112px}}`;
    document.head.append(s);
  }
})();
