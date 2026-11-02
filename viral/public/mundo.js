// 🌍 Islas Portal: mundo 3D propio (Three.js, licencia MIT) con plaza central, 5 mundos, monedas diarias,
// retos contrarreloj, personalización del personaje y otros jugadores en tiempo real. Se sigue donde te quedaste.
(() => {
  const A = window.ARC_API, { JUEGOS, salir } = A, setParar = A.setParar;
  const MUNDOS = {
    plaza: { n: 'Plaza de los Portales', e: '🏛️', cielo: ['#120c3a', '#5b3fc4', '#ffb08a'], suelo: '#8fd18a', niebla: '#7a5fc8', luz: '#fff1e0' },
    desierto: { n: 'Desierto de las Dunas', e: '🏜️', cielo: ['#1e4fc2', '#6fb0ff', '#ffe0a8'], suelo: '#e9c27c', niebla: '#f3d7a6', luz: '#fff4d6', col: '#ffb703' },
    bosque: { n: 'Bosque Encantado', e: '🌲', cielo: ['#07202e', '#1f6b5c', '#a8f0c0'], suelo: '#4fae4c', niebla: '#5fae86', luz: '#e8ffe8', col: '#22c55e' },
    nieve: { n: 'Picos Nevados', e: '❄️', cielo: ['#3d6db5', '#a3d0ff', '#ffffff'], suelo: '#f2f6ff', niebla: '#dcecff', luz: '#ffffff', col: '#38bdf8' },
    volcan: { n: 'Isla Volcán', e: '🌋', cielo: ['#140303', '#5e160a', '#ff7a2a'], suelo: '#4a3434', niebla: '#4a1d12', luz: '#ffd1b0', col: '#f97316' },
    luna: { n: 'Estación Lunar', e: '🌙', cielo: ['#000005', '#090930', '#2c2c66'], suelo: '#b8b8cc', niebla: '#14143a', luz: '#e6e6ff', col: '#a78bfa', grav: .42 },
  };
  const DESTINOS = ['desierto', 'bosque', 'nieve', 'volcan', 'luna'];
  const COLORES = ['#7c5cff', '#ff4d6d', '#ff9f1c', '#ffd60a', '#2ec4b6', '#3a86ff', '#06d6a0', '#f72585', '#8d99ae', '#222244'];
  const GORROS = [['', 'Sin gorro', 0], ['gorra', 'Gorra', 0], ['gato', 'Orejas de gato', 60], ['vaquero', 'Sombrero vaquero', 80], ['copa', 'Sombrero de copa', 100], ['corona', 'Corona', 200]];
  const EMOTES = ['👋', '😂', '❤️', '🔥', '👏', '😮', '🎉', '💃'];
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hoy = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  const CRATERES = (() => { const r = rng(99); return [...Array(14)].map(() => [(r() - .5) * 170, (r() - .5) * 170, 5 + r() * 10]).filter(([x, z]) => Math.hypot(x, z) > 18); })();
  // Altura del terreno en cada mundo (zona central plana para empezar).
  function alt(m, x, z) {
    const d = Math.hypot(x, z), k = sm(14, 34, d), borde = Math.pow(Math.max(0, d - 92), 1.25) * .45;
    if (m === 'plaza') return (d < 30 ? 0 : (Math.sin(x * .08) + Math.cos(z * .07)) * 1.8 * sm(30, 55, d)) + borde;
    if (m === 'desierto') return (Math.sin(x * .05) * Math.cos(z * .04) * 4 + Math.sin((x + z) * .09) * 1.4 + 2) * k + borde;
    if (m === 'bosque') return (Math.sin(x * .06) + Math.sin(z * .05) + Math.sin((x - z) * .03)) * 1.5 * k + borde;
    if (m === 'nieve') return (Math.sin(x * .04) * Math.cos(z * .05) * 7 + Math.sin(x * .11 + z * .07) * 1.8 + 6) * k + borde;
    if (m === 'volcan') { const dv = Math.hypot(x, z + 72), lava = Math.sin(x * .07) * Math.cos(z * .06) > .55 && dv > 30 ? -2.2 : 0; return Math.max(-2.2, (Math.sin(x * .09) * Math.cos(z * .08) * 1.5 + lava) * k + Math.max(0, 34 - dv) * .95 - (dv < 6 ? (6 - dv) * 2.5 : 0) * sm(20, 30, 34) + borde); }
    if (m === 'luna') { let h = (Math.sin(x * .05) * Math.sin(z * .06)) * 1.2 * k; for (const [cx, cz, r] of CRATERES) { const dc = Math.hypot(x - cx, z - cz); if (dc < r * 1.3) h += dc < r ? -(1 - (dc / r) ** 2) * r * .3 : Math.sin((dc - r) / (r * .3) * Math.PI) * r * .06; } return h * k + borde; }
    return 0;
  }

  function cargarThree() { return window.THREE ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/three.min.js?v=149'; s.onload = ok; s.onerror = no; document.head.append(s); }); }
  JUEGOS.mundo = t => {
    salir(); registrar(t.id);
    stage('<div class="card cargando"><div class="sp"></div><p>Cargando el mundo 3D…</p></div>');
    cargarThree().then(() => iniciar(t)).catch(() => stage('<div class="card"><h2>No se pudo cargar el mundo 3D</h2><p class="sub">Revisa tu conexión e inténtalo otra vez.</p></div>'));
  };

  function iniciar(t) {
    const THREE = window.THREE, V3 = THREE.Vector3;
    const D = PERFIL.datos, J = D.juegos.mundo = Object.assign({ visitados: [], estrellas: {}, mon: { dia: '', por: {} }, color: '#7c5cff', gorro: '', gorros: ['', 'gorra'], pos: null, record: 0, partidas: 0 }, D.juegos.mundo || {});
    if (J.mon.dia !== hoy()) J.mon = { dia: hoy(), por: {} };
    J.ultimo = Date.now(); PERFIL.guardar();
    // ---------- Pantalla completa ----------
    if (!document.getElementById('m3css')) { const st = document.createElement('style'); st.id = 'm3css'; st.textContent = `
      #m3d{position:fixed;inset:0;z-index:60;background:#000;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;font-family:Figtree,system-ui,sans-serif;color:#fff}
      #m3d canvas{width:100%;height:100%;display:block}
      .m3g{background:rgba(15,10,40,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);border-radius:16px}
      .m3b{border:0;color:#fff;cursor:pointer;font:800 .9rem Figtree,sans-serif;border-radius:14px;padding:8px 11px;background:rgba(15,10,40,.55);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.2)}
      #m3info{position:absolute;left:10px;top:10px;padding:9px 12px;max-width:62vw;font-size:.85rem;line-height:1.35}
      #m3top{position:absolute;right:10px;top:10px;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:40vw}
      #m3msg{position:absolute;left:50%;top:22%;transform:translate(-50%,-50%);text-align:center;font:900 1.7rem Figtree,sans-serif;text-shadow:0 3px 12px rgba(0,0,0,.6);pointer-events:none;transition:opacity .4s;opacity:0;width:90vw}
      #m3msg small{display:block;font-size:.95rem;font-weight:700;opacity:.9;margin-top:6px}
      #m3reto{position:absolute;left:50%;top:10px;transform:translateX(-50%);padding:6px 14px;font:900 1.2rem Figtree,sans-serif;display:none}
      #m3joy{position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35);display:none;pointer-events:none}
      #m3joy i{position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.7);box-shadow:0 4px 14px rgba(0,0,0,.4)}
      #m3salto{position:absolute;right:18px;bottom:26px;width:78px;height:78px;border-radius:50%;font-size:1.9rem;padding:0}
      #m3emo{position:absolute;right:104px;bottom:34px;width:56px;height:56px;border-radius:50%;font-size:1.5rem;padding:0}
      #m3emos{position:absolute;right:14px;bottom:118px;display:none;grid-template-columns:repeat(4,46px);gap:6px;padding:8px}
      #m3emos button{font-size:1.5rem;background:none;border:0;cursor:pointer}
      #m3ayuda{position:absolute;left:50%;bottom:120px;transform:translateX(-50%);padding:8px 14px;font-size:.85rem;text-align:center;pointer-events:none;transition:opacity .6s}
      #m3fade{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity .35s}
      #m3panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,380px);max-height:80vh;overflow:auto;padding:16px;display:none}
      #m3panel h3{margin:4px 0 8px}.m3sw{width:36px;height:36px;border-radius:50%;border:3px solid transparent;cursor:pointer}.m3sw.on{border-color:#fff;box-shadow:0 0 0 2px #000}
      .m3hat{display:flex;justify-content:space-between;align-items:center;width:100%;margin:5px 0;text-align:left}.m3hat.on{background:rgba(255,214,102,.3)}
      #m3carga{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#1a1446,#5b3fc4);font-weight:800;gap:10px;transition:opacity .5s}` ; document.head.append(st); }
    const ov = document.createElement('div'); ov.id = 'm3d';
    ov.innerHTML = `<canvas id="m3c"></canvas>
      <div id="m3info" class="m3g"><b id="m3n"></b><div>🪙 <b id="m3m"></b> <span id="m3mm" style="opacity:.85"></span></div><div id="m3mis" style="font-size:.78rem;opacity:.92;margin-top:3px"></div></div>
      <div id="m3top"><button class="m3b" id="m3est">🎨 Estilo</button><button class="m3b" id="m3pz">🏛️</button><button class="m3b" id="m3son">${LS.get('arcSonido') === '0' ? '🔇' : '🔊'}</button><button class="m3b" id="m3x">✖</button><span class="m3b" id="m3on" style="cursor:default">👥 1</span></div>
      <div id="m3reto" class="m3g"></div><div id="m3msg"></div><div id="m3joy"><i></i></div>
      <div id="m3ayuda" class="m3g">${matchMedia('(pointer:coarse)').matches ? '👈 Mueve con el dedo a la izquierda · Gira la cámara arrastrando a la derecha 👉' : 'Muévete con WASD o flechas · Espacio para saltar · Arrastra para girar la cámara'}</div>
      <button class="m3b" id="m3emo">😀</button><button class="m3b" id="m3salto">⤒</button>
      <div id="m3emos" class="m3g">${EMOTES.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>
      <div id="m3panel" class="m3g"></div><div id="m3fade"></div>
      <div id="m3carga"><div style="font-size:3rem">🌍</div>Creando el mundo…</div>`;
    document.body.append(ov); document.body.style.overflow = 'hidden';
    const $m = s => ov.querySelector(s), cv = $m('#m3c');
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { ov.remove(); document.body.style.overflow = ''; stage('<div class="card"><h2>Tu dispositivo no soporta 3D</h2><p class="sub">Prueba desde otro celular o computadora. Mientras tanto, juega Joyas o Huerto Defensor.</p></div>'); return; }
    let calidad = 1; const dprMax = Math.min(devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dprMax); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, .1, 600);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, .55), sol = new THREE.DirectionalLight(0xffffff, .75);
    sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024); Object.assign(sol.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 }); sol.shadow.bias = -.0008;
    scene.add(hemi, sol, sol.target);
    const tam = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 70 : 60; cam.updateProjectionMatrix(); };
    tam(); addEventListener('resize', tam);

    // ---------- Utilidades de construcción ----------
    const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, metalness: 0, flatShading: true, ...o });
    const malla = (g, m, x = 0, y = 0, z = 0, sombra = true) => { const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.castShadow = sombra; me.receiveShadow = true; return me; };
    function etiqueta(txt, color = '#fff', fondo = 'rgba(20,10,50,.7)', ancho = 4.2) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
      x.font = '800 52px Figtree, system-ui, sans-serif'; const w = Math.min(500, x.measureText(txt).width + 50);
      x.fillStyle = fondo; x.beginPath(); x.roundRect((512 - w) / 2, 14, w, 100, 50); x.fill(); x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 256, 66);
      const tx = new THREE.CanvasTexture(c), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })); sp.scale.set(ancho, ancho / 4, 1); return sp;
    }
    function emojiSprite(e, s = 1.3) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '96px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 72); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); sp.scale.set(s, s, 1); return sp; }
    function remolino(c1, c2) { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 7; for (let k = 0; k < 4; k++) { x.beginPath(); for (let a = 0; a < 9; a += .1) { const r = a * 13; x.lineTo(128 + Math.cos(a + k * Math.PI / 2) * r, 128 + Math.sin(a + k * Math.PI / 2) * r); } x.stroke(); }
      const tx = new THREE.CanvasTexture(c); tx.center.set(.5, .5); return tx; }

    // ---------- Personaje ----------
    function personaje(color, gorro) {
      const g = new THREE.Group(), cm = mat(color, { flatShading: false, roughness: .5 }), oscuro = mat(new THREE.Color(color).multiplyScalar(.6), { flatShading: false });
      const cuerpo = malla(new THREE.CapsuleGeometry(.5, .55, 6, 16), cm, 0, 1.05, 0); g.add(cuerpo);
      const visor = malla(new THREE.SphereGeometry(.36, 20, 14), mat('#ffffff', { flatShading: false, roughness: .3 }), 0, 1.3, .4, false); visor.scale.set(1.05, .65, .5); g.add(visor);
      for (const k of [-1, 1]) { const o = malla(new THREE.SphereGeometry(.075, 12, 10), mat('#1b1b2f', { flatShading: false, roughness: .2 }), k * .14, 1.32, .55, false); g.add(o); const b = malla(new THREE.SphereGeometry(.025, 8, 6), mat('#ffffff'), k * .14 - .025, 1.35, .62, false); g.add(b);
        const mj = malla(new THREE.SphereGeometry(.06, 10, 8), mat('#ff8fab', { flatShading: false }), k * .27, 1.2, .43, false); mj.scale.set(1, .6, .4); g.add(mj); }
      const mochila = malla(new THREE.BoxGeometry(.55, .55, .25), oscuro, 0, 1.05, -.5); g.add(mochila);
      const pierna = k => { const p = new THREE.Group(); p.position.set(k * .2, .55, 0); p.add(malla(new THREE.CapsuleGeometry(.15, .25, 4, 10), oscuro, 0, -.25, 0)); g.add(p); return p; };
      const brazo = k => { const p = new THREE.Group(); p.position.set(k * .55, 1.15, 0); p.add(malla(new THREE.CapsuleGeometry(.12, .3, 4, 10), cm, 0, -.22, 0)); g.add(p); return p; };
      g.userData = { piernas: [pierna(-1), pierna(1)], brazos: [brazo(-1), brazo(1)], fase: 0 };
      if (gorro) g.add(sombrero(gorro));
      return g;
    }
    function sombrero(tipo) {
      const h = new THREE.Group(); h.position.y = 1.72;
      if (tipo === 'gorra') { const c = malla(new THREE.SphereGeometry(.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#ff4d6d', { flatShading: false })); h.add(c); const v = malla(new THREE.CylinderGeometry(.42, .42, .05, 20, 1, false, -Math.PI / 2, Math.PI), mat('#c9184a')); v.position.set(0, .02, .2); h.add(v); }
      if (tipo === 'gato') for (const k of [-1, 1]) { const o = malla(new THREE.ConeGeometry(.16, .32, 4), mat('#2b2b3a')); o.position.set(k * .25, .05, 0); o.rotation.z = -k * .25; h.add(o); const i = malla(new THREE.ConeGeometry(.08, .2, 4), mat('#ff8fab')); i.position.set(k * .25, .03, .05); i.rotation.z = -k * .25; h.add(i); }
      if (tipo === 'vaquero') { h.add(malla(new THREE.CylinderGeometry(.75, .75, .05, 24), mat('#8b5a2b'))); const c = malla(new THREE.CylinderGeometry(.3, .38, .38, 18), mat('#a0672f')); c.position.y = .2; h.add(c); }
      if (tipo === 'copa') { h.add(malla(new THREE.CylinderGeometry(.55, .55, .04, 24), mat('#15151f', { roughness: .4 }))); const c = malla(new THREE.CylinderGeometry(.33, .33, .55, 20), mat('#15151f', { roughness: .4 })); c.position.y = .28; h.add(c); const b = malla(new THREE.CylinderGeometry(.335, .335, .1, 20), mat('#ff4d6d')); b.position.y = .08; h.add(b); }
      if (tipo === 'corona') { const o = mat('#ffd23f', { metalness: .3, roughness: .3, emissive: '#a06e00', emissiveIntensity: .5, flatShading: false }); h.add(malla(new THREE.CylinderGeometry(.34, .34, .18, 20, 1, true), o)); for (let i = 0; i < 6; i++) { const p = malla(new THREE.ConeGeometry(.08, .22, 4), o); const a = i * Math.PI / 3; p.position.set(Math.cos(a) * .32, .18, Math.sin(a) * .32); h.add(p); } }
      return h;
    }
    function animar(p, mov, aire, dt) {
      const u = p.userData; u.fase += dt * (mov ? 11 : 2);
      const s = mov ? Math.sin(u.fase) * .8 : 0;
      u.piernas[0].rotation.x = aire ? -.5 : s; u.piernas[1].rotation.x = aire ? .3 : -s;
      u.brazos[0].rotation.x = aire ? -2.4 : -s * .8; u.brazos[1].rotation.x = aire ? -2.4 : s * .8;
      u.brazos[0].rotation.z = aire ? -.3 : 0; u.brazos[1].rotation.z = aire ? .3 : 0;
    }

    // ---------- Construcción de cada mundo ----------
    let mundo = 'plaza', grupo = null, cielo, colis = [], plats = [], monedas = [], gemas = [], portales = [], orbe = null, parts = null, partV = null, lava = null, cristal = null;
    function construir(m) {
      if (grupo) { scene.remove(grupo); grupo.traverse(o => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } }); }
      grupo = new THREE.Group(); scene.add(grupo); colis = []; plats = []; monedas = []; gemas = []; portales = []; orbe = null; lava = null; cristal = null; parts = null;
      const M = MUNDOS[m], r = rng(m.length * 1337 + m.charCodeAt(0));
      scene.fog = new THREE.Fog(M.niebla, 55, 220); hemi.color.set(M.luz); hemi.groundColor.set(M.suelo).multiplyScalar(.5); sol.color.set(M.luz);
      hemi.intensity = m === 'luna' || m === 'volcan' ? .5 : .55; sol.intensity = m === 'nieve' || m === 'luna' ? .55 : m === 'desierto' ? .65 : .75;
      // cielo con degradado
      const sky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: new THREE.Color(M.cielo[0]) }, b: { value: new THREE.Color(M.cielo[1]) }, c: { value: new THREE.Color(M.cielo[2]) } },
        vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform vec3 c; varying vec3 p; void main(){ float h = p.y; vec3 col = h > 0.15 ? mix(b, a, smoothstep(0.15, 0.8, h)) : mix(c, b, smoothstep(-0.05, 0.15, h)); gl_FragColor = vec4(col, 1.0); }' });
      cielo = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), sky); grupo.add(cielo);
      if (['plaza', 'luna', 'volcan', 'bosque'].includes(m)) { const n = 900, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, b = r() * Math.PI * .45, R = 380; pos.set([Math.cos(a) * Math.cos(b) * R, Math.sin(b) * R + 20, Math.sin(a) * Math.cos(b) * R], i * 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); grupo.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: m === 'bosque' ? .5 : .9 }))); }
      // terreno con colores por vértice
      const geo = new THREE.PlaneGeometry(240, 240, 110, 110); geo.rotateX(-Math.PI / 2);
      const P = geo.attributes.position, cols = new Float32Array(P.count * 3), base = new THREE.Color(M.suelo), tmp = new THREE.Color();
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), h = alt(m, x, z); P.setY(i, h);
        tmp.copy(base).offsetHSL(0, 0, (r() - .5) * .05 + Math.min(.12, h * .012));
        if (m === 'volcan' && h < -1.2) tmp.set('#2a0e08'); if (m === 'nieve' && h > 8) tmp.set('#ffffff'); if (m === 'plaza' && Math.hypot(x, z) < 31) tmp.set('#b9aee6').offsetHSL(0, 0, (r() - .5) * .03);
        if (m === 'bosque' && r() < .15) tmp.offsetHSL(.03, 0, -.05);
        cols.set([tmp.r, tmp.g, tmp.b], i * 3); }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
      const suelo = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95 })); suelo.receiveShadow = true; grupo.add(suelo);
      const decor = { arbol: (x, z, s = 1) => { const y = alt(m, x, z); grupo.add(malla(new THREE.CylinderGeometry(.25 * s, .35 * s, 2 * s, 7), mat('#7a4a25'), x, y + s, z)); for (let k = 0; k < 3; k++) grupo.add(malla(new THREE.ConeGeometry((1.6 - k * .4) * s, 1.8 * s, 8), mat(['#2d8a3e', '#37a34a', '#46bd59'][k]), x, y + (2.2 + k * 1.1) * s, z)); colis.push([x, z, .5 * s]); },
        redondo: (x, z, s = 1, c = '#5cc96b') => { const y = alt(m, x, z); grupo.add(malla(new THREE.CylinderGeometry(.22 * s, .3 * s, 2 * s, 7), mat('#8a5a30'), x, y + s, z)); grupo.add(malla(new THREE.IcosahedronGeometry(1.3 * s, 0), mat(c), x, y + 2.6 * s, z)); colis.push([x, z, .45 * s]); },
        pino: (x, z, s = 1) => { const y = alt(m, x, z); grupo.add(malla(new THREE.CylinderGeometry(.2 * s, .3 * s, 1.6 * s, 6), mat('#6b4426'), x, y + .8 * s, z)); for (let k = 0; k < 3; k++) { grupo.add(malla(new THREE.ConeGeometry((1.5 - k * .38) * s, 1.7 * s, 7), mat('#1f5f3a'), x, y + (2 + k * 1) * s, z)); grupo.add(malla(new THREE.ConeGeometry((.9 - k * .25) * s, .7 * s, 7), mat('#ffffff'), x, y + (2.55 + k * 1) * s, z, false)); } colis.push([x, z, .45 * s]); },
        roca: (x, z, s = 1, c = '#8a8a9a') => { const me = malla(new THREE.DodecahedronGeometry(s, 0), mat(c), x, alt(m, x, z) + s * .4, z); me.rotation.set(r() * 3, r() * 3, r() * 3); grupo.add(me); colis.push([x, z, s * .85]); },
        cactus: (x, z, s = 1) => { const y = alt(m, x, z), c = mat('#3f9e4d'); grupo.add(malla(new THREE.CapsuleGeometry(.35 * s, 2.2 * s, 4, 8), c, x, y + 1.4 * s, z)); for (const k of [-1, 1]) { const b = malla(new THREE.CapsuleGeometry(.22 * s, .7 * s, 4, 8), c, x + k * .55 * s, y + (1.6 + k * .2) * s, z); grupo.add(b); grupo.add(malla(new THREE.CapsuleGeometry(.2 * s, .3 * s, 4, 8), c, x + k * .35 * s, y + (1.15 + k * .2) * s, z).rotateZ(Math.PI / 2)); } colis.push([x, z, .5 * s]); },
        piramide: (x, z, s) => { const me = malla(new THREE.ConeGeometry(s, s * 1.3, 4), mat('#d9a95b'), x, alt(m, x, z) + s * .62, z); me.rotation.y = Math.PI / 4; grupo.add(me); colis.push([x, z, s * .75]); },
        hongo: (x, z, s = 1) => { const y = alt(m, x, z); grupo.add(malla(new THREE.CylinderGeometry(.35 * s, .5 * s, 2.2 * s, 10), mat('#f5ead2', { flatShading: false }), x, y + 1.1 * s, z)); grupo.add(malla(new THREE.SphereGeometry(1.5 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(['#ff4d6d', '#a855f7', '#22d3ee'][Math.floor(r() * 3)], { flatShading: false, emissive: '#200010' }), x, y + 2.1 * s, z)); colis.push([x, z, .55 * s]); },
        cristal: (x, z, s = 1, c = '#a78bfa') => { const me = malla(new THREE.OctahedronGeometry(s, 0), mat(c, { emissive: c, emissiveIntensity: .45, roughness: .2, metalness: .3 }), x, alt(m, x, z) + s, z); me.scale.y = 1.8; grupo.add(me); colis.push([x, z, s * .7]); },
        planeta: (x, y, z, s, c, anillo) => { const p = new THREE.Mesh(new THREE.SphereGeometry(s, 32, 20), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .35, fog: false })); p.position.set(x, y, z); grupo.add(p); if (anillo) { const a = new THREE.Mesh(new THREE.TorusGeometry(s * 1.6, s * .12, 4, 48), new THREE.MeshBasicMaterial({ color: '#f5d0fe', fog: false })); a.position.copy(p.position); a.rotation.x = 1.2; grupo.add(a); } },
      };
      const lugar = (dmin = 22, dmax = 88) => { for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = dmin + r() * (dmax - dmin), x = Math.cos(a) * d, z = Math.sin(a) * d; if (!colis.some(([cx, cz, cr]) => Math.hypot(cx - x, cz - z) < cr + 3)) return [x, z]; } return [dmin, 0]; };
      if (m === 'plaza') {
        const disco = malla(new THREE.CylinderGeometry(31, 31.5, 1, 64), mat('#b9aee6', { flatShading: false, roughness: .35 }), 0, -.49, 0, false); grupo.add(disco);
        for (let k = 0; k < 3; k++) { const an = malla(new THREE.TorusGeometry(8 + k * 8, .12, 6, 96), mat('#c4b5fd', { emissive: '#7c3aed', emissiveIntensity: .4 }), 0, .02, 0, false); an.rotation.x = Math.PI / 2; grupo.add(an); }
        const pedestal = malla(new THREE.CylinderGeometry(2.4, 3, 1.2, 8), mat('#cfc6ea'), 0, .6, 0); grupo.add(pedestal); colis.push([0, 0, 3]);
        cristal = malla(new THREE.OctahedronGeometry(1.4, 0), mat('#c084fc', { emissive: '#a855f7', emissiveIntensity: .7, roughness: .1, metalness: .4 }), 0, 4, 0); cristal.scale.y = 1.6; grupo.add(cristal);
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + .3, x = Math.cos(a) * 28, z = Math.sin(a) * 28; grupo.add(malla(new THREE.CylinderGeometry(.12, .18, 3.6, 8), mat('#3b2f6b'), x, 1.8, z)); grupo.add(malla(new THREE.SphereGeometry(.38, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffe8a3' }), x, 3.8, z, false)); colis.push([x, z, .3]); }
        for (let i = 0; i < 26; i++) { const [x, z] = lugar(36, 90); decor.redondo(x, z, .9 + r() * .6, ['#5cc96b', '#ff9ec7', '#ffd166', '#7dd3fc'][i % 4]); }
        DESTINOS.forEach((d, i) => { const a = i / DESTINOS.length * Math.PI * 2, x = Math.sin(a) * 19, z = Math.cos(a) * 19; portal(x, z, a + Math.PI, d, `${MUNDOS[d].e} ${MUNDOS[d].n.split(' ').slice(-1)[0]}${J.visitados.includes(d) ? ' ✓' : ''}`, MUNDOS[d].col); });
      } else {
        const back = portal(0, -12, 0, 'plaza', '🏛️ Volver a la plaza', '#c084fc');
        if (m === 'desierto') { decor.piramide(-40, -60, 14); decor.piramide(-15, -78, 9); decor.piramide(45, -70, 18); for (let i = 0; i < 30; i++) { const [x, z] = lugar(); decor.cactus(x, z, .8 + r() * .5); } for (let i = 0; i < 14; i++) { const [x, z] = lugar(); decor.roca(x, z, .8 + r() * 1.4, '#c28e52'); } }
        if (m === 'bosque') { for (let i = 0; i < 70; i++) { const [x, z] = lugar(16, 92); decor.arbol(x, z, .9 + r() * .7); } for (let i = 0; i < 14; i++) { const [x, z] = lugar(); decor.hongo(x, z, .8 + r() * .8); } }
        if (m === 'nieve') { for (let i = 0; i < 55; i++) { const [x, z] = lugar(16, 92); decor.pino(x, z, 1 + r() * .7); } for (let i = 0; i < 12; i++) { const [x, z] = lugar(); decor.cristal(x, z, .7 + r() * .7, '#7dd3fc'); } }
        if (m === 'volcan') { lava = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ color: '#ff5a1f', emissive: '#ff3d00', emissiveIntensity: .9, roughness: .6 })); lava.rotation.x = -Math.PI / 2; lava.position.y = -1.25; grupo.add(lava); for (let i = 0; i < 26; i++) { const [x, z] = lugar(); if (alt(m, x, z) > -.5) decor.roca(x, z, .8 + r() * 1.6, '#2b2020'); } for (let i = 0; i < 10; i++) { const [x, z] = lugar(); if (alt(m, x, z) > -.5) decor.cristal(x, z, .6 + r() * .5, '#ff7a2a'); } }
        if (m === 'luna') { decor.planeta(-160, 120, -260, 45, '#7c3aed', true); decor.planeta(200, 70, -150, 22, '#38bdf8'); decor.planeta(60, 180, 260, 30, '#f472b6'); for (let i = 0; i < 18; i++) { const [x, z] = lugar(); decor.roca(x, z, .7 + r() * 1.3, '#9a9ab0'); } for (let i = 0; i < 8; i++) { const [x, z] = lugar(); decor.cristal(x, z, .7 + r() * .5, '#a78bfa'); }
          const base = malla(new THREE.SphereGeometry(5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e5e7eb', { flatShading: false, roughness: .3, metalness: .4 }), 28, alt(m, 28, 22), 22); grupo.add(base); colis.push([28, 22, 5]); }
        // escalera de plataformas hacia la gran moneda
        const px = 30 * (m === 'luna' ? -1 : 1), pz = 24, cP = M.col;
        for (let i = 0; i < 8; i++) { const a = i * .85, x = px + Math.cos(a) * 6, z = pz + Math.sin(a) * 6, y = alt(m, px, pz) + 1.2 + i * 1.35;
          const me = malla(new THREE.BoxGeometry(3, .6, 3), mat(i % 2 ? cP : '#ffffff', { flatShading: false, roughness: .4 }), x, y, z); grupo.add(me); plats.push({ x, y: y + .3, z, w: 1.5, d: 1.5, b: y - .3 }); }
        const top = plats[plats.length - 1]; moneda(top.x, top.y + 1.2, top.z, 'g', 10);
        // orbe del reto
        const ox = 9, oz = 4; orbe = malla(new THREE.SphereGeometry(.8, 24, 16), mat('#e879f9', { emissive: '#c026d3', emissiveIntensity: .8, flatShading: false, roughness: .2 }), ox, alt(m, ox, oz) + 1.4, oz); grupo.add(orbe);
        const et = etiqueta(`⏱️ Reto ${'⭐'.repeat(J.estrellas[m] || 0) || 'nuevo'}`, '#fff', 'rgba(150,20,160,.75)', 3.6); et.position.set(ox, orbe.position.y + 1.6, oz); grupo.add(et); orbe.userData.et = et;
        // 25 monedas de hoy
        const ya = J.mon.por[m] || [];
        for (let i = 0; i < 25; i++) { const [x, z] = i < 6 ? [Math.sin(i * .5) * 2.5, 5 + i * 3.2] : lugar(12, 80); if (!ya.includes(i)) moneda(x, alt(m, x, z) + 1.1, z, i, 1); }
        if (ya.includes('g')) { const g = monedas.find(c => c.i === 'g'); if (g) { grupo.remove(g.me); monedas = monedas.filter(c => c !== g); } }
        // partículas del ambiente
        const n = m === 'nieve' ? 700 : 260, pos = new Float32Array(n * 3); partV = new Float32Array(n);
        for (let i = 0; i < n; i++) { pos.set([(r() - .5) * 120, r() * 30, (r() - .5) * 120], i * 3); partV[i] = .5 + r(); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pc = { desierto: ['#fff3c4', .18], bosque: ['#d9ff6b', .28], nieve: ['#ffffff', .22], volcan: ['#ff8a3d', .25], luna: ['#c4b5fd', .15] }[m];
        parts = new THREE.Points(g, new THREE.PointsMaterial({ color: pc[0], size: pc[1], transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); grupo.add(parts);
      }
      function portal(x, z, ry, destino, texto, color) {
        const y = alt(m, x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; grupo.add(g);
        const aro = malla(new THREE.TorusGeometry(2.3, .32, 12, 48), mat(color, { emissive: color, emissiveIntensity: .8, flatShading: false, roughness: .3 }), 0, 2.8, 0); g.add(aro);
        const tx = remolino(color, '#1a0b3d'), disco = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40), new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: .92, side: THREE.DoubleSide })); disco.position.y = 2.8; g.add(disco);
        g.add(malla(new THREE.CylinderGeometry(2.8, 3, .4, 24), mat('#3b2f6b', { flatShading: false }), 0, .2, 0));
        const et = etiqueta(texto, '#fff', 'rgba(20,10,50,.75)', 4.4); et.position.set(0, 5.8, 0); g.add(et);
        portales.push({ x, z, destino, tx, aro, y });
        colis.push([x + Math.cos(ry) * 2.3, z - Math.sin(ry) * 2.3, .4], [x - Math.cos(ry) * 2.3, z + Math.sin(ry) * 2.3, .4]);
        return g;
      }
      function moneda(x, y, z, i, val) {
        const big = val > 1, me = malla(new THREE.CylinderGeometry(big ? 1 : .5, big ? 1 : .5, .14, 24), mat('#ffd23f', { metalness: .25, roughness: .3, emissive: '#c98a00', emissiveIntensity: .55, flatShading: false }), x, y, z, false);
        me.rotation.x = Math.PI / 2; grupo.add(me); monedas.push({ me, i, val, x, y, z, f: Math.random() * 6 });
      }
    }

    // ---------- Jugador, cámara y controles ----------
    let yo = personaje(J.color, J.gorro); scene.add(yo);
    const pos = new V3(0, 0, 8), vel = new V3(); let ry = Math.PI, yaw = 0, pitch = .3, dist = 7.5, enSuelo = true, saltos = 0, puedeSaltar = true, reto = null, monSes = 0, viajando = false, sinMover = 0, ayudaT = 7;
    const camPos = new V3(), mirar = new V3();
    const teclas = {}, joy = { id: null, x0: 0, y0: 0, x: 0, y: 0 }, giro = { id: null, x: 0, y: 0 };
    const kd = e => { if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return; teclas[e.key.toLowerCase()] = true; if (e.key === ' ') { e.preventDefault(); saltar(); } };
    const ku = e => { teclas[e.key.toLowerCase()] = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    const tactil = matchMedia('(pointer:coarse)').matches;
    cv.addEventListener('pointerdown', e => {
      ayudaT = Math.min(ayudaT, .5);
      if (tactil && e.clientX < innerWidth * .45 && joy.id === null) { joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; joy.x = joy.y = 0; const j = $m('#m3joy'); j.style.display = 'block'; j.style.left = e.clientX - 60 + 'px'; j.style.top = e.clientY - 60 + 'px'; }
      else if (giro.id === null) { giro.id = e.pointerId; giro.x = e.clientX; giro.y = e.clientY; }
      cv.setPointerCapture?.(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      if (e.pointerId === joy.id) { let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const l = Math.hypot(dx, dy); if (l > 50) { dx *= 50 / l; dy *= 50 / l; } joy.x = dx / 50; joy.y = -dy / 50; $m('#m3joy i').style.transform = `translate(${dx}px,${dy}px)`; }
      if (e.pointerId === giro.id) { yaw -= (e.clientX - giro.x) * .006; pitch = Math.max(.08, Math.min(1.2, pitch + (e.clientY - giro.y) * .004)); giro.x = e.clientX; giro.y = e.clientY; }
    });
    const suelta = e => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; $m('#m3joy').style.display = 'none'; $m('#m3joy i').style.transform = ''; } if (e.pointerId === giro.id) giro.id = null; };
    cv.addEventListener('pointerup', suelta); cv.addEventListener('pointercancel', suelta);
    cv.addEventListener('wheel', e => { dist = Math.max(4, Math.min(16, dist + e.deltaY * .01)); }, { passive: true });
    function saltar() { const g = MUNDOS[mundo].grav || 1; if (enSuelo) { vel.y = 10.5; enSuelo = false; saltos = 1; FX.son('swish'); } else if (saltos < 2) { vel.y = 9; saltos = 2; FX.son('swish'); } void g; }
    $m('#m3salto').addEventListener('pointerdown', e => { e.preventDefault(); saltar(); });

    // ---------- HUD ----------
    const msg = (t, sub = '', ms = 2600) => { const d = $m('#m3msg'); d.innerHTML = `${t}${sub ? `<small>${sub}</small>` : ''}`; d.style.opacity = 1; clearTimeout(d._t); d._t = setTimeout(() => d.style.opacity = 0, ms); };
    function hud() {
      const M = MUNDOS[mundo], ya = (J.mon.por[mundo] || []).length;
      $m('#m3n').textContent = `${M.e} ${M.n}`; $m('#m3m').textContent = PERFIL.datos.monedas;
      $m('#m3mm').textContent = mundo === 'plaza' ? '' : `· hoy ${Math.min(26, ya)}/26`;
      const vis = J.visitados.filter(d => DESTINOS.includes(d)).length;
      $m('#m3mis').innerHTML = mundo === 'plaza' ? `${vis >= 5 ? '✅' : '⬜'} Visita los 5 mundos (${vis}/5)<br>⬜ Entra a un portal brillante` : `${ya >= 26 ? '✅' : '⬜'} Recoge todas las monedas de hoy<br>${J.estrellas[mundo] >= 3 ? '✅' : '⬜'} Reto contrarreloj ${'⭐'.repeat(J.estrellas[mundo] || 0)}<br>⬜ Sube la torre y toma la gran moneda`;
    }

    // ---------- Viajes ----------
    function viajar(destino, x, z, aviso = true) {
      if (viajando) return; viajando = true; const f = $m('#m3fade'); f.style.opacity = 1; FX.son('ganar');
      setTimeout(() => {
        mundo = destino; if (reto) terminarReto(false); construir(mundo);
        pos.set(x ?? 0, 0, z ?? (destino === 'plaza' ? 8 : 0)); pos.y = alt(mundo, pos.x, pos.z) + .5; vel.set(0, 0, 0); ry = destino === 'plaza' ? Math.PI : 0; yaw = destino === 'plaza' ? 0 : Math.PI; camPos.set(pos.x, pos.y + 4, pos.z + 9);
        if (destino !== 'plaza' && !J.visitados.includes(destino)) { J.visitados.push(destino); if (DESTINOS.every(d => J.visitados.includes(d)) && !J.premioViaje) { J.premioViaje = 1; PERFIL.ganar(50); setTimeout(() => msg('🏆 ¡Visitaste los 5 mundos!', '+50 🪙 de premio'), 2800); } }
        try { PERFIL.mision('vivo1'); } catch (e) {}
        J.pos = { mundo, x: pos.x, z: pos.z }; PERFIL.guardar(); hud(); otrosLimpiar();
        f.style.opacity = 0; viajando = false;
        if (aviso) msg(`${MUNDOS[mundo].e} ${MUNDOS[mundo].n}`, mundo === 'plaza' ? 'Entra a un portal para viajar' : 'Recoge las monedas · Toca el orbe morado para el reto');
      }, 380);
    }
    function terminarReto(ok) {
      if (!reto) return; const r = reto; reto = null; $m('#m3reto').style.display = 'none'; gemas.forEach(g => grupo.remove(g.me)); gemas = [];
      if (!ok) return;
      const e = r.t > 30 ? 3 : r.t > 15 ? 2 : 1, antes = J.estrellas[mundo] || 0, premio = e > antes ? (e - antes) * 15 : 3;
      J.estrellas[mundo] = Math.max(antes, e); PERFIL.ganar(premio); FX.confeti();
      const pts = Math.round(r.t * 100); try { PERFIL.partida('mundo', pts); } catch (er) {}
      post('/api/arcade/puntaje', { juego: 'mundo', puntos: pts, nombre: LS.get('chatNom') || 'Jugador', avatar: LS.get('chatAv') || 'a01', uid: VID }).catch(() => {});
      msg(`${'⭐'.repeat(e)} ¡Reto superado!`, `Te sobraron ${Math.round(r.t)} s · +${premio} 🪙`, 3500);
      if (orbe) { grupo.remove(orbe.userData.et); const et = etiqueta(`⏱️ Reto ${'⭐'.repeat(J.estrellas[mundo])}`, '#fff', 'rgba(150,20,160,.75)', 3.6); et.position.set(orbe.position.x, orbe.position.y + 1.6, orbe.position.z); grupo.add(et); orbe.userData.et = et; }
      hud();
    }
    function empezarReto() {
      if (reto) return; const r = rng(Date.now() & 0xffff), cG = new THREE.Color(MUNDOS[mundo].col);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + r() * .4, d = 12 + r() * 22, x = orbe.position.x + Math.cos(a) * d, z = orbe.position.z + Math.sin(a) * d, y = alt(mundo, x, z) + 1.2 + (i % 3 === 2 ? 1.8 : 0);
        const me = malla(new THREE.OctahedronGeometry(.55, 0), mat(cG, { emissive: cG, emissiveIntensity: .9, roughness: .1, metalness: .3 }), x, y, z, false); grupo.add(me); gemas.push({ me, x, y, z }); }
      reto = { t: 60, n: 0 }; $m('#m3reto').style.display = 'block'; FX.son('ganar'); msg('⏱️ ¡Reto contrarreloj!', 'Recoge las 10 gemas brillantes antes de 60 segundos', 3000);
    }

    // ---------- Otros jugadores ----------
    const otros = new Map(); let ultimoEnvio = 0, emoteMio = null, emoteSp = null, emoteT = 0, red = null;
    function otrosLimpiar() { for (const o of otros.values()) scene.remove(o.g); otros.clear(); }
    function sincronizar(lista) {
      const vistos = new Set();
      for (const p of lista) { vistos.add(p.id); let o = otros.get(p.id);
        if (!o || o.color !== p.color || o.gorro !== p.gorro) { if (o) scene.remove(o.g); const g = personaje(p.color, p.gorro), et = etiqueta(p.nombre, '#fff', 'rgba(0,0,0,.45)', 3); et.position.y = 2.6; g.add(et); g.position.set(p.x, p.y, p.z); scene.add(g); o = { g, color: p.color, gorro: p.gorro, emote: null }; otros.set(p.id, o); }
        o.t = new V3(p.x, p.y, p.z); o.ry = p.ry; o.a = p.a;
        if (p.emote && p.emote !== o.emote) { if (o.sp) o.g.remove(o.sp); o.sp = emojiSprite(p.emote, 1.2); o.sp.position.y = 3.4; o.g.add(o.sp); }
        if (!p.emote && o.sp) { o.g.remove(o.sp); o.sp = null; } o.emote = p.emote; }
      for (const [k, o] of otros) if (!vistos.has(k)) { scene.remove(o.g); otros.delete(k); }
    }
    async function enviar() {
      if (red) return; red = 1;
      try { const r = await post('/api/mundo/mov', { uid: VID, mundo, x: pos.x, y: pos.y, z: pos.z, ry, a: enSuelo ? (vel.x * vel.x + vel.z * vel.z > 1 ? 'c' : 'q') : 's', nombre: LS.get('chatNom') || 'Jugador', color: J.color, gorro: J.gorro, emote: emoteMio });
        emoteMio = null; if (r.otros) { sincronizar(r.otros); $m('#m3on').textContent = '👥 ' + ((r.cuenta || {})[mundo] || 1); } } catch (e) {}
      red = null;
    }

    // ---------- Botones ----------
    $m('#m3x').onclick = () => document.getElementById('back').click();
    $m('#m3pz').onclick = () => { if (mundo !== 'plaza') viajar('plaza'); else { pos.set(0, 0, 8); vel.set(0, 0, 0); } };
    $m('#m3son').onclick = () => { LS.set('arcSonido', LS.get('arcSonido') === '0' ? '1' : '0'); $m('#m3son').textContent = LS.get('arcSonido') === '0' ? '🔇' : '🔊'; };
    $m('#m3emo').onclick = () => { const e = $m('#m3emos'); e.style.display = e.style.display === 'grid' ? 'none' : 'grid'; };
    $m('#m3emos').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; emoteMio = b.dataset.e; $m('#m3emos').style.display = 'none';
      if (emoteSp) yo.remove(emoteSp); emoteSp = emojiSprite(emoteMio, 1.2); emoteSp.position.y = 3.2; yo.add(emoteSp); emoteT = 3.2; FX.son('click'); };
    function panelEstilo() {
      const p = $m('#m3panel'); p.style.display = 'block';
      p.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h3>🎨 Tu estilo</h3><button class="m3b" id="m3cerrar">✖</button></div>
        <b style="font-size:.85rem">Color</b><div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px">${COLORES.map(c => `<button class="m3sw ${c === J.color ? 'on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
        <b style="font-size:.85rem">Gorro · tienes 🪙 ${PERFIL.datos.monedas}</b>${GORROS.map(([k, n, pr]) => { const tiene = J.gorros.includes(k); return `<button class="m3b m3hat ${J.gorro === k ? 'on' : ''}" data-g="${k}"><span>${n}</span><span>${J.gorro === k ? '✅ Puesto' : tiene ? 'Ponerme' : '🪙 ' + pr}</span></button>`; }).join('')}
        <p style="font-size:.75rem;opacity:.8;margin:8px 0 0">Gana monedas recogiéndolas en los mundos, con los retos y en Joyas o Huerto Defensor.</p>`;
      p.onclick = e => { if (e.target.id === 'm3cerrar') { p.style.display = 'none'; return; }
        const c = e.target.closest('[data-c]'), g = e.target.closest('[data-g]');
        if (c) J.color = c.dataset.c;
        if (g) { const k = g.dataset.g, pr = GORROS.find(x => x[0] === k)[2]; if (!J.gorros.includes(k)) { if (!PERFIL.gastar(pr)) { msg('Te faltan monedas 🪙', `Necesitas ${pr}`); return; } J.gorros.push(k); FX.confeti(); } J.gorro = k; }
        if (c || g) { const p0 = yo.position.clone(), r0 = yo.rotation.y; scene.remove(yo); if (emoteSp) emoteSp = null; yo = personaje(J.color, J.gorro); yo.position.copy(p0); yo.rotation.y = r0; scene.add(yo); PERFIL.guardar(); hud(); panelEstilo(); } };
    }
    $m('#m3est').onclick = panelEstilo;

    // ---------- Bucle principal ----------
    let raf, last = performance.now(), vivo = true, fpsN = 0, fpsT = 0, guardT = 0;
    const fwd = new V3(), der = new V3(), mv = new V3();
    function paso(dt) {
      const M = MUNDOS[mundo], G = 26 * (M.grav || 1);
      let jx = joy.x, jy = joy.y;
      if (teclas.w || teclas.arrowup) jy = 1; if (teclas.s || teclas.arrowdown) jy = -1; if (teclas.a || teclas.arrowleft) jx = -1; if (teclas.d || teclas.arrowright) jx = 1;
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); der.set(Math.cos(yaw), 0, -Math.sin(yaw));
      mv.copy(fwd).multiplyScalar(jy).addScaledVector(der, jx); const l = Math.min(1, mv.length()); if (l > .01) mv.normalize().multiplyScalar(l);
      const velo = 8.5; vel.x += (mv.x * velo - vel.x) * Math.min(1, dt * 10); vel.z += (mv.z * velo - vel.z) * Math.min(1, dt * 10);
      if (l > .1) { const obj = Math.atan2(mv.x, mv.z); let d = obj - ry; d = Math.atan2(Math.sin(d), Math.cos(d)); ry += d * Math.min(1, dt * 12); sinMover = 0; } else sinMover += dt;
      vel.y -= G * dt;
      const ox = pos.x, oz = pos.z, oy = pos.y;
      pos.x += vel.x * dt; pos.z += vel.z * dt; pos.y += vel.y * dt;
      // plataformas
      let piso = alt(mundo, pos.x, pos.z);
      for (const p of plats) { if (Math.abs(pos.x - p.x) < p.w + .35 && Math.abs(pos.z - p.z) < p.d + .35) { if (oy >= p.y - .05 && pos.y <= p.y + .05) piso = Math.max(piso, p.y); else if (pos.y < p.y - .1 && pos.y + 1.8 > p.b) { pos.x = ox; pos.z = oz; } } }
      // obstáculos
      for (const [cx, cz, cr] of colis) { const dx = pos.x - cx, dz = pos.z - cz, d = Math.hypot(dx, dz), m = cr + .45; if (d < m && d > 0 && pos.y < alt(mundo, cx, cz) + 6) { pos.x = cx + dx / d * m; pos.z = cz + dz / d * m; } }
      const dc = Math.hypot(pos.x, pos.z); if (dc > 104) { pos.x *= 104 / dc; pos.z *= 104 / dc; }
      if (pos.y <= piso) { pos.y = piso; if (vel.y < -14) FX.vibrar(15); vel.y = 0; enSuelo = true; saltos = 0; } else if (pos.y > piso + .15) enSuelo = false;
      if (lava && pos.y < -.9) { FX.son('perder'); FX.vibrar(120); msg('🔥 ¡Cuidado con la lava!', 'Vuelves al portal'); pos.set(0, alt(mundo, 0, 0) + .5, 0); vel.set(0, 0, 0); }
      if (pos.y < -30) { pos.set(0, alt(mundo, 0, 0) + 2, 0); vel.set(0, 0, 0); }
      // monedas
      for (let i = monedas.length - 1; i >= 0; i--) { const c = monedas[i]; if (Math.hypot(pos.x - c.x, pos.z - c.z) < (c.val > 1 ? 1.8 : 1.3) && Math.abs(pos.y + 1 - c.y) < 2) {
        grupo.remove(c.me); monedas.splice(i, 1); (J.mon.por[mundo] = J.mon.por[mundo] || []).push(c.i); PERFIL.ganar(c.val); monSes += c.val; try { PERFIL.mision('mundo10', c.val > 1 ? 3 : 1); } catch (e) {}
        FX.son('punto'); FX.vibrar(10); if (c.val > 1) { FX.confeti(); msg('🌟 ¡Gran moneda!', '+10 🪙'); } if (!monedas.some(m => m.val === 1) && c.val === 1) msg('🎉 ¡Recogiste todas las monedas de hoy!', 'Mañana aparecen nuevas'); hud(); } }
      // gemas del reto
      if (reto) { reto.t -= dt; for (let i = gemas.length - 1; i >= 0; i--) { const g = gemas[i]; if (Math.hypot(pos.x - g.x, pos.z - g.z) < 1.4 && Math.abs(pos.y + 1 - g.y) < 2) { grupo.remove(g.me); gemas.splice(i, 1); reto.n++; FX.son('punto'); FX.vibrar(12); } }
        $m('#m3reto').textContent = `⏱️ ${Math.ceil(reto.t)} s · 💎 ${reto.n}/10`; if (reto.n >= 10) terminarReto(true); else if (reto.t <= 0) { terminarReto(false); FX.son('perder'); msg('⏱️ ¡Se acabó el tiempo!', 'Toca el orbe para intentarlo otra vez'); } }
      if (orbe && !reto && Math.hypot(pos.x - orbe.position.x, pos.z - orbe.position.z) < 1.6) empezarReto();
      // portales
      for (const p of portales) if (Math.hypot(pos.x - p.x, pos.z - p.z) < 1.7 && pos.y < p.y + 4) { const dest = p.destino; if (dest === 'plaza') { const i = DESTINOS.indexOf(mundo), a = i / DESTINOS.length * Math.PI * 2; viajar('plaza', Math.sin(a) * 14, Math.cos(a) * 14); } else viajar(dest); break; }
      // personaje y animación
      yo.position.copy(pos); yo.rotation.y = ry; animar(yo, enSuelo && Math.hypot(vel.x, vel.z) > 1, !enSuelo, dt);
      if (emoteT > 0) { emoteT -= dt; if (emoteT <= 0 && emoteSp) { yo.remove(emoteSp); emoteSp = null; } }
      for (const o of otros.values()) { const pr = o.g.position.clone(); o.g.position.lerp(o.t, Math.min(1, dt * 8)); let d = o.ry - o.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.g.rotation.y += d * Math.min(1, dt * 8); animar(o.g, o.a === 'c' || pr.distanceTo(o.g.position) > .02, o.a === 's', dt); }
      // cámara en tercera persona
      if (sinMover > 2.5 && giro.id === null) { let d = ry + Math.PI - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * dt * .6; }
      const cx = pos.x + Math.sin(yaw) * Math.cos(pitch) * dist, cz = pos.z + Math.cos(yaw) * Math.cos(pitch) * dist; let cy = pos.y + 1.4 + Math.sin(pitch) * dist;
      cy = Math.max(cy, alt(mundo, cx, cz) + .8); camPos.lerp(new V3(cx, cy, cz), Math.min(1, dt * 8)); cam.position.copy(camPos); mirar.set(pos.x, pos.y + 1.4, pos.z); cam.lookAt(mirar);
      sol.position.set(pos.x + 25, pos.y + 40, pos.z + 15); sol.target.position.copy(pos);
      cielo.position.copy(cam.position);
    }
    function decorar(t, dt) {
      for (const c of monedas) { c.me.rotation.z = t * 2.5 + c.f; c.me.position.y = c.y + Math.sin(t * 2 + c.f) * .15; }
      for (const g of gemas) { g.me.rotation.y = t * 3; g.me.position.y = g.y + Math.sin(t * 3 + g.x) * .2; }
      for (const p of portales) { p.tx.rotation = -t * 1.5; p.aro.scale.setScalar(1 + Math.sin(t * 3) * .03); }
      if (cristal) { cristal.rotation.y = t * .8; cristal.position.y = 4 + Math.sin(t * 1.4) * .4; }
      if (orbe) { const s = 1 + Math.sin(t * 4) * .1; orbe.scale.setScalar(s); }
      if (lava) lava.material.emissiveIntensity = .75 + Math.sin(t * 2) * .2;
      if (parts) { const P = parts.geometry.attributes.position, a = P.array;
        for (let i = 0; i < partV.length; i++) { const k = i * 3;
          if (mundo === 'nieve') { a[k + 1] -= partV[i] * dt * 2.5; a[k] += Math.sin(t + i) * dt * .5; if (a[k + 1] < 0) a[k + 1] = 30; }
          else if (mundo === 'volcan') { a[k + 1] += partV[i] * dt * 2; if (a[k + 1] > 30) a[k + 1] = 0; }
          else { a[k] += Math.sin(t * .7 + i) * dt * .6; a[k + 1] += Math.cos(t * .9 + i * 1.3) * dt * .4; } }
        P.needsUpdate = true; parts.position.set(Math.round(pos.x / 40) * 40, mundo === 'nieve' || mundo === 'volcan' ? 0 : pos.y - 5, Math.round(pos.z / 40) * 40); }
    }
    function bucle(now) {
      if (!vivo) return; raf = requestAnimationFrame(bucle);
      const dt = Math.min(.05, (now - last) / 1000); last = now; if (document.hidden) return;
      if (!viajando) paso(dt); decorar(now / 1000, dt); renderer.render(scene, cam);
      // calidad automática según los cuadros por segundo
      fpsN++; fpsT += dt; if (fpsT > 2.5) { const fps = fpsN / fpsT; fpsN = fpsT = 0;
        if (fps < 32 && calidad > 0) { calidad--; renderer.setPixelRatio(1); renderer.shadowMap.enabled = false; sol.castShadow = false; scene.fog.far = 140; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
        else if (fps < 24 && calidad === 0 && renderer.getPixelRatio() > .75) renderer.setPixelRatio(.75); }
      if (now - ultimoEnvio > 300) { ultimoEnvio = now; enviar(); }
      guardT += dt; if (guardT > 5) { guardT = 0; J.pos = { mundo, x: Math.round(pos.x * 10) / 10, z: Math.round(pos.z * 10) / 10 }; PERFIL.guardar(); }
      if (ayudaT > 0) { ayudaT -= dt; if (ayudaT <= 0) $m('#m3ayuda').style.opacity = 0; }
    }

    // ---------- Inicio: seguir donde te quedaste ----------
    const ini = J.pos && MUNDOS[J.pos.mundo] ? J.pos : null;
    mundo = ini ? ini.mundo : 'plaza'; construir(mundo);
    pos.set(ini ? ini.x : 0, 0, ini ? ini.z : 8); pos.y = alt(mundo, pos.x, pos.z) + .5; if (mundo !== 'plaza') { ry = 0; yaw = Math.PI; } camPos.set(pos.x, pos.y + 5, pos.z + 9); hud();
    requestAnimationFrame(t0 => { last = t0; raf = requestAnimationFrame(bucle); setTimeout(() => { const c = $m('#m3carga'); if (c) { c.style.opacity = 0; setTimeout(() => c.remove(), 500); } msg(ini && ini.mundo !== 'plaza' ? `${MUNDOS[mundo].e} ¡Bienvenido de vuelta!` : '🌍 Islas Portal', ini ? `Sigues en ${MUNDOS[mundo].n}` : 'Explora, entra a los portales y recoge monedas', 3200); }, 250); });
    stage(`<div class="card" style="text-align:center"><div style="font-size:3rem">🌍</div><h2>Islas Portal</h2><p class="sub">Estás jugando en pantalla completa.</p></div>`);
    setParar(() => {
      vivo = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('resize', tam);
      J.pos = { mundo, x: pos.x, z: pos.z }; if (monSes) { try { PERFIL.partida('mundo', monSes * 10); } catch (e) {} } PERFIL.guardar();
      scene.traverse(o => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } }); renderer.dispose(); renderer.forceContextLoss?.();
      ov.remove(); document.body.style.overflow = '';
    });
    window.__mundo = { estado: () => ({ mundo, x: pos.x, y: pos.y, z: pos.z, monedas: monedas.length, reto: reto && { ...reto }, otros: otros.size, calidad }), ir: (x, z) => { pos.set(x, alt(mundo, x, z) + 1, z); }, viajar, yaw: v => { yaw = v; }, pitch: v => { pitch = v; } }; // para pruebas
  }
})();
