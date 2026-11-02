// 👑 GLORY BROWN — El Choque de los Reinos. Juego original de estrategia con cartas en tiempo real.
// Datos: /glory/cartas.js (127 cartas, 7 mundos, 21 arenas). Arte: /glory/arte.js. En homenaje a la abuelita Glory Brown.
(() => {
  const A = window.ARC_API, { JUEGOS, salir } = A, setParar = A.setParar;
  const AN = 18, AL = 32, RIO0 = 15, RIO1 = 17, PUENTES = [3.5, 14.5];
  let G = null, CARTA = {}, GA = null;
  const cargar = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });
  async function listo() { if (!window.GLORY) await cargar('/glory/cartas.js?v=1'); if (!window.GARTE) await cargar('/glory/arte.js?v=2'); if (!window.GloryMotor) await cargar('/glory/motor.js?v=1'); try { if (!window.THREE) await cargar('/three.min.js?v=149'); if (!window.GLORY3D) await cargar('/glory/tres.js?v=4'); } catch (e) {} G = window.GLORY; GA = window.GARTE; CARTA = Object.fromEntries(G.cartas.map(c => [c.id, c])); for (const [k, m] of Object.entries(G.minis)) CARTA['_' + k] = { id: '_' + k, n: m.n, arq: m.arq, aspecto: m.aspecto, mundo: 'sombras', m: 4, tipo: 'tropa', ...G.cartas.find(c => c.arq === m.arq && c.tipo === 'tropa'), id: '_' + k, n: m.n, aspecto: m.aspecto, hp: m.hp, dmg: m.dmg, cant: 1, hab: null, frases: null }; vocesManifest(); await arteManifest(); }
  const azar = l => l[Math.floor(Math.random() * l.length)];
  const RZ = () => G.rarezas;
  const MAZO_INICIAL = ['escudero_del_alba', 'arqueras_del_sol', 'lanceros_dorados', 'hadas_del_alba', 'lluvia_de_luz', 'torre_del_vigia', 'paladin_radiante', 'cleriga_de_la_aurora'];
  // ---------- Progreso del jugador ----------
  function D() {
    const d = PERFIL.datos, J = d.juegos.batalla = Object.assign({ trofeos: 0, victorias: 0, derrotas: 0, record: 0, partidas: 0 }, d.juegos.batalla || {});
    if (!J.cartas || J.v !== 2) { J.v = 2; J.cartas = {}; J.mazo = null; J.cofres = []; J.coronas = 0; J.maxArena = 0; }
    J.cofres = J.cofres || []; J.coronas = J.coronas || 0;
    if (G) { for (const c of G.cartas) if (c.arena <= arenaDe(J.trofeos) && c.id !== 'glory_brown' && !J.cartas[c.id]) J.cartas[c.id] = { nv: 1, frag: 0, nueva: 1 };
      if (J.reina && !J.cartas.glory_brown) J.cartas.glory_brown = { nv: 1, frag: 0, nueva: 1 };
      if (!J.mazo || J.mazo.length !== 8 || J.mazo.some(k => !J.cartas[k])) { const base = MAZO_INICIAL.map(k => CARTA[k] ? k : null).filter(Boolean); const extra = Object.keys(J.cartas).filter(k => !base.includes(k)); J.mazo = [...base, ...extra].slice(0, 8); } }
    return J;
  }
  const arenaDe = tr => G ? G.arenas.reduce((a, x, i) => tr >= x.trofeos ? i : a, 0) : 0;
  const nivelDe = id => (D().cartas[id] || {}).nv || 1;
  const mult = nv => 1 + (nv - 1) * .08;
  const FRAG = [0, 2, 4, 10, 20, 50, 100, 200, 400, 800], FR_R = { comun: 1, rara: .5, epica: .2, legendaria: .05, mitica: .04, suprema: .03, real: .05 };
  const fragPara = (c, nv) => Math.max(1, Math.round(FRAG[Math.min(nv, 9)] * (FR_R[c.rareza] || 1)));
  const monedasPara = nv => 25 * nv * nv;
  // ---------- Voces y diálogos ----------
  let MANI = null; const AUD = {};
  let ARTE = {}, UNI = {}; const IMG = {}, SPR = {};
  // personajes de batalla: imagen sin fondo, recortada a su silueta
  function precargar(ids) { for (const id of ids || []) { if (!UNI[id] || SPR[id] !== undefined) continue; SPR[id] = null; const im = new Image(); im.onload = () => { try { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0; for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 40) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (x1 <= x0) return; const o = document.createElement('canvas'); o.width = x1 - x0 + 5; o.height = y1 - y0 + 5; o.getContext('2d').drawImage(c, x0 - 2, y0 - 2, o.width, o.height, 0, 0, o.width, o.height); SPR[id] = o; } catch (e) {} }; im.src = '/arte/glory/' + id + '_u.webp'; } }
  async function arteManifest() { try { const r = await Promise.race([fetch('/arte/glory/manifest.json'), new Promise((_, n) => setTimeout(n, 1500))]); if (r.ok) { const m = await r.json(); ARTE = Object.fromEntries((m.arte || []).map(v => [v, 1])); UNI = Object.fromEntries((m.unidades || []).map(v => [v, 1])); } precargar(D().mazo); } catch (e) {} }
  const tieneArte = c => c && ARTE[c.id];
  function imgArte(c) { if (!IMG[c.id]) IMG[c.id] = new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = '/arte/glory/' + c.id + '.webp'; }); return IMG[c.id]; }
  function cubrir(X, im, x, y, w, h) { const s = Math.max(w / im.width, h / im.height), iw = im.width * s, ih = im.height * s; X.drawImage(im, x + (w - iw) / 2, y + (h - ih) * .3, iw, ih); }
  function ponerArte(cv, c, w, h) { if (!tieneArte(c)) return false; imgArte(c).then(im => { if (!im) { const r = GA.retrato(c, w, h); cv.width = r.width; cv.height = r.height; cv.getContext('2d').drawImage(r, 0, 0); return; } cv.width = w * 2; cv.height = h * 2; cubrir(cv.getContext('2d'), im, 0, 0, w * 2, h * 2); }); return true; }
  function vocesManifest() { if (MANI !== null) return; MANI = {}; fetch('/voces/glory/manifest.json').then(r => r.ok ? r.json() : {}).then(m => { MANI = m.voces ? Object.fromEntries(m.voces.map(v => [v, 1])) : {}; }).catch(() => {}); }
  let ultVoz = 0;
  function decir(card, clave, i, forzar) {
    if (!card?.frases) return null; const lista = card.frases[clave]; if (!lista) return null; const arr = Array.isArray(lista) ? lista : [lista]; if (i == null) i = Math.floor(Math.random() * arr.length); const txt = arr[i % arr.length];
    const ahora = Date.now(); if (!forzar && ahora - ultVoz < 1700) return null; ultVoz = ahora;
    if (LS.get('arcSonido') === '0' || LS.get('arcVoz') === '0') return txt;
    const id = `${card.id}__${clave}${i % arr.length}`;
    if (MANI && MANI[id]) { try { FX.callar?.(); const a = AUD[id] || (AUD[id] = new Audio(`/voces/glory/${id}.mp3`)); a.currentTime = 0; a.volume = .95; a.play().catch(() => {}); } catch (e) {} }
    else FX.voz?.(txt, { tono: card.voz?.tono ?? 1, vel: card.voz?.vel ?? 1.05, forzar: true, cortar: true });
    return txt;
  }
  // tema musical de la Reina y de batalla (se registran en el motor de audio)
  function musicaReina() { try { FX.musica?.('reina'); } catch (e) {} }
  // ---------- Estilos de la interfaz GLORY BROWN ----------
  function estilos() {
    if (document.getElementById('gbcss')) return; const st = document.createElement('style'); st.id = 'gbcss';
    st.textContent = `
    .gb{--oro:#fcd34d;--oro2:#b45309;--azul:#1e3a8a;font-family:Figtree,system-ui,sans-serif}
    .gb-logo{text-align:center;margin:4px 0 10px;line-height:.95}
    .gb-logo b{display:block;font:900 2.3rem 'Fraunces',Georgia,serif;letter-spacing:1px;background:linear-gradient(180deg,#fff7c2,#fcd34d 45%,#b45309);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #3b1d00) drop-shadow(0 6px 14px rgba(0,0,0,.5))}
    .gb-logo small{display:inline-block;margin-top:6px;padding:3px 14px;border-radius:999px;background:linear-gradient(90deg,#4c1d95,#7c3aed,#4c1d95);color:#fde68a;font-weight:800;font-size:.8rem;letter-spacing:2px;box-shadow:0 0 0 2px #fcd34d inset}
    .gb-panel{background:linear-gradient(170deg,rgba(30,27,75,.95),rgba(15,12,40,.97));border:2px solid rgba(252,211,77,.45);border-radius:20px;padding:12px;box-shadow:0 10px 30px rgba(0,0,0,.45),inset 0 0 30px rgba(124,58,237,.18);margin-bottom:12px}
    .gb-btn{display:block;width:100%;border:0;border-radius:16px;padding:14px;font:900 1.2rem Figtree,sans-serif;color:#3b1d00;cursor:pointer;background:linear-gradient(180deg,#fff7c2,#fcd34d 40%,#f59e0b);box-shadow:0 5px 0 #92400e,0 10px 20px rgba(0,0,0,.4);text-shadow:0 1px 0 rgba(255,255,255,.6);margin:8px 0;transition:transform .08s}
    .gb-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #92400e}
    .gb-btn.azul{background:linear-gradient(180deg,#93c5fd,#3b82f6 45%,#1e3a8a);color:#fff;text-shadow:0 1px 0 #0b1440;box-shadow:0 5px 0 #0b1440,0 10px 20px rgba(0,0,0,.4)}
    .gb-btn.chico{font-size:.9rem;padding:10px 8px;margin:4px 0}
    .gb-tabs{position:sticky;bottom:6px;z-index:6;display:grid;grid-template-columns:repeat(6,1fr);gap:4px;background:rgba(10,8,30,.92);backdrop-filter:blur(8px);border:2px solid rgba(252,211,77,.4);border-radius:18px;padding:5px;margin-top:10px}
    .gb-tabs button{border:0;background:none;color:#cbd5e1;font:800 .68rem Figtree,sans-serif;padding:6px 0;border-radius:12px;cursor:pointer}
    .gb-tabs button span{display:block;font-size:1.35rem}
    .gb-tabs button.on{background:linear-gradient(180deg,#4c1d95,#1e1b4b);color:#fde68a;box-shadow:inset 0 0 0 1px #fcd34d}
    .gb-carta{position:relative;border-radius:14px;padding:3px;cursor:pointer;border:0;background:var(--rz,#9ca3af);box-shadow:0 4px 10px rgba(0,0,0,.5);color:#fff;font-family:inherit}
    .gb-carta .in{border-radius:11px;overflow:hidden;background:#0f0c29;position:relative}
    .gb-carta canvas,.gb-carta img{display:block;width:100%;aspect-ratio:11/14;object-fit:cover}
    .gb-carta .cos{position:absolute;left:-5px;top:-6px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f5d0fe,#a21caf 60%,#581c87);border:1.5px solid #fde68a;font:900 .8rem/21px Figtree,sans-serif;text-align:center;box-shadow:0 0 8px #d946ef;z-index:2}
    .gb-carta .nom{position:absolute;left:0;right:0;bottom:0;padding:10px 2px 3px;background:linear-gradient(transparent,rgba(0,0,0,.85));font:800 .6rem Figtree,sans-serif;text-align:center;line-height:1.1}
    .gb-carta .nv{position:absolute;right:3px;top:3px;font:900 .58rem Figtree,sans-serif;background:rgba(0,0,0,.6);padding:1px 5px;border-radius:6px}
    .gb-carta.bloq{filter:grayscale(1) brightness(.45)}
    .gb-carta .nueva{position:absolute;right:-4px;top:-6px;background:#ef4444;color:#fff;font:900 .55rem Figtree,sans-serif;padding:2px 5px;border-radius:6px;z-index:2;animation:gbpulso 1s infinite alternate}
    @keyframes gbpulso{to{transform:scale(1.15)}}
    @keyframes gbbrillo{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(220%) skewX(-20deg)}}
    .gb-shine{position:relative;overflow:hidden}.gb-shine:after{content:'';position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);animation:gbbrillo 2.6s infinite}
    .gb-modal{position:fixed;inset:0;z-index:80;background:radial-gradient(circle at 50% 40%,rgba(76,29,149,.97),rgba(5,3,20,.99));display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto}
    .gb-modal .box{width:min(420px,100%);max-height:96vh;overflow:auto}
    .gb-stat{display:flex;align-items:center;gap:8px;font-size:.82rem;margin:4px 0}.gb-stat i{flex:1;height:8px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden;position:relative}.gb-stat i b{position:absolute;left:0;top:0;bottom:0;border-radius:5px}
    .gb-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.35);border:1px solid rgba(252,211,77,.35);font-weight:800;font-size:.85rem}
    .gb-cofre{border:0;border-radius:16px;padding:8px 4px;cursor:pointer;color:#fff;font:800 .7rem Figtree,sans-serif;background:linear-gradient(180deg,#312e81,#1e1b4b);box-shadow:inset 0 0 0 2px rgba(252,211,77,.4)}
    .gb-cofre span{display:block;font-size:2.1rem}
    `; document.head.append(st);
  }
  // ---------- Carta pequeña (mini) ----------
  const URL_REINA = '/glory/reina_carta.webp', URL_REINA_FULL = '/glory/reina_presentacion.webp';
  function cartaHTML(c, o = {}) { const J = D(), mia = J.cartas[c.id], col = RZ()[c.rareza].color, bloq = !mia && !o.libre;
    return `<button class="gb-carta ${bloq ? 'bloq' : ''}" data-carta="${c.id}" style="--rz:linear-gradient(160deg,${col},#1e1b4b 70%,${col})">${o.coste !== false ? `<span class="cos">${c.c}</span>` : ''}${mia?.nueva && !o.sinNueva ? '<span class="nueva">¡NUEVA!</span>' : ''}<div class="in">${c.id === 'glory_brown' ? `<img src="${URL_REINA}" alt="">` : `<canvas data-ret="${c.id}"></canvas>`}<span class="nv">${mia ? 'Nv ' + mia.nv : '🔒'}</span><div class="nom">${escH(c.n)}</div></div></button>`; }
  function fondoRet(c, w, h) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const x = cv.getContext('2d'), M = G.mundos[c.m] || G.mundos[0], g = x.createRadialGradient(w, h * .9, 10, w, h, h * 1.5); g.addColorStop(0, M.pal[1]); g.addColorStop(.45, M.pal[0]); g.addColorStop(1, M.pal[2]); x.fillStyle = g; x.fillRect(0, 0, w * 2, h * 2); for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .5})`; x.beginPath(); x.arc(Math.random() * w * 2, Math.random() * h * 2, Math.random() * 3, 0, 7); x.fill(); } x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(w, h * 1.7, w * .6, h * .1, 0, 0, 7); x.fill(); return cv; }
  const usar3D = c => window.GLORY3D && window.THREE && LS.get('gb3d') !== '0' && c.tipo !== 'hechizo';
  function retratoDe(c, w, h) { return (usar3D(c) && GLORY3D.retrato3D(c, w, h, fondoRet(c, w, h))) || GA.retrato(c, w, h); }
  function pintarRetratos(raiz = document) { const lista = [...raiz.querySelectorAll('canvas[data-ret]')].filter(cv => !cv.dataset.ok); lista.forEach(cv => cv.dataset.ok = 1); let i = 0;
    const paso = () => { const fin = Math.min(lista.length, i + 8); for (; i < fin; i++) { const cv = lista[i]; if (!cv.isConnected) continue; if (ponerArte(cv, CARTA[cv.dataset.ret], 110, 140)) continue; const r = retratoDe(CARTA[cv.dataset.ret], 110, 140); cv.width = r.width; cv.height = r.height; cv.getContext('2d').drawImage(r, 0, 0); } if (i < lista.length) requestAnimationFrame(paso); }; paso(); }
  // ---------- Presentación de una carta (también para compartir) ----------
  function presentacion(id, alCerrar) {
    const c = CARTA[id], J = D(), mia = J.cartas[id], R = RZ()[c.rareza], nv = mia?.nv || 1, m = mult(nv), M = G.mundos[c.m] || { n: 'Reino del Alba', e: '👑' };
    if (mia?.nueva) { delete mia.nueva; PERFIL.guardar(); }
    const barra = (et, v, max, col) => `<div class="gb-stat"><span style="width:76px">${et}</span><i><b style="width:${Math.min(100, v * 100 / max)}%;background:${col}"></b></i><b style="width:46px;text-align:right">${Math.round(v)}</b></div>`;
    const reina = id === 'glory_brown';
    const d = document.createElement('div'); d.className = 'gb-modal gb';
    const fr = fragPara(c, nv), puede = mia && nv < 10 && (mia.frag || 0) >= fr;
    d.innerHTML = `<div class="box"><div class="gb-panel" style="border-color:${R.color};box-shadow:0 0 40px ${R.color}66,inset 0 0 30px rgba(124,58,237,.25)">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="gb-chip" style="color:${R.color}">${R.n.toUpperCase()}</span><span class="gb-chip">${M.e} ${escH(M.n)}</span><button class="gb-btn chico azul" id="pcer" style="width:auto;margin:0;padding:6px 12px">✖</button></div>
      <div style="position:relative;margin:10px 0;border-radius:16px;overflow:hidden;border:3px solid ${R.color};box-shadow:0 0 30px ${R.color}88" class="gb-shine">${reina ? `<img src="${URL_REINA}" style="display:block;width:100%">` : '<canvas id="pret" style="display:block;width:100%"></canvas>'}
        <span style="position:absolute;left:8px;top:8px;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f5d0fe,#a21caf 60%,#581c87);border:2px solid #fde68a;font:900 1.2rem/36px Figtree;text-align:center;box-shadow:0 0 14px #d946ef">${c.c}</span></div>
      <h2 style="margin:4px 0 0;text-align:center;font:900 1.7rem 'Fraunces',Georgia,serif;color:#fde68a;text-shadow:0 2px 0 #3b1d00">${escH(c.n)}</h2>${c.titulo ? `<p style="text-align:center;margin:0;color:#fcd34d;font-weight:800">— ${escH(c.titulo)} —</p>` : ''}
      <p class="sub" style="text-align:center;margin:6px 0 10px">${escH(c.d)}</p>
      ${c.tipo !== 'hechizo' ? barra('❤️ Vida', c.hp * m, 5500, '#ef4444') + (c.dmg ? barra('⚔️ Daño', c.dmg * m, 800, '#f59e0b') : '') + barra('🎯 Alcance', (c.rango || 0) * 10, 115, '#38bdf8') + (c.vel ? barra('👟 Velocidad', c.vel * 50, 100, '#4ade80') : '') : barra('⚔️ Poder', (c.dmg || c.valor || 300) * m, 900, '#f59e0b') + barra('🌀 Área', (c.radio || 3) * 20, 80, '#a78bfa')}
      ${c.habilidades ? `<div style="margin-top:10px">${c.habilidades.map(([e, n, t]) => `<div style="display:flex;gap:10px;align-items:center;background:rgba(252,211,77,.08);border-radius:12px;padding:8px;margin:6px 0"><span style="font-size:1.6rem;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#fde68a,#b45309)">${e}</span><div><b style="color:#fde68a">${n}</b><br><small>${t}</small></div></div>`).join('')}</div>` : c.hab ? `<p style="margin:8px 0;background:rgba(252,211,77,.08);border-radius:12px;padding:8px"><b style="color:#fde68a">✨ Habilidad:</b> ${habTexto(c.hab)}</p>` : ''}
      <p style="font-style:italic;font-size:.85rem;opacity:.9;margin:10px 0">“${escH(c.historia)}”</p>
      ${reina ? `<p style="text-align:center;font:800 1rem 'Fraunces',Georgia,serif;color:#fde68a;margin:8px 0">❤️ ${escH(c.homenaje)}</p>` : ''}
      ${mia ? `<p class="sub" style="text-align:center;margin:4px 0">Nivel ${nv} · Fragmentos ${mia.frag || 0}/${fr}</p>${nv < 10 ? `<button class="gb-btn ${puede ? '' : 'azul'} chico" id="pmej" ${puede ? '' : 'disabled style="opacity:.6"'}>⬆️ Mejorar a nivel ${nv + 1} · ${monedasPara(nv)} 🪙</button>` : ''}` : `<p class="sub" style="text-align:center">🔒 Se desbloquea en la arena ${escH(G.arenas[c.arena]?.n || '')}${reina ? ' o al ganar 3 batallas' : ''}</p>`}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><button class="gb-btn chico azul" id="pvoz">🔊 Escuchar</button><button class="gb-btn chico" id="pcomp">📣 Compartir</button></div></div></div>`;
    document.body.append(d);
    if (!reina && !ponerArte(d.querySelector('#pret'), c, 360, 440)) { const r = retratoDe(c, 360, 440), cv = d.querySelector('#pret'); cv.width = r.width; cv.height = r.height; cv.getContext('2d').drawImage(r, 0, 0); }
    if (reina) { musicaReina(); decir(c, 'aparece', 0, true); }
    d.onclick = async e => { const t = e.target.id;
      if (t === 'pcer' || e.target === d) { d.remove(); if (reina) FX.musica?.('batalla'); alCerrar && alCerrar(); }
      if (t === 'pvoz') decir(c, azar(['aparece', 'ataque', 'resp']), null, true);
      if (t === 'pmej') { if (!PERFIL.gastar(monedasPara(nv))) return toast('Te faltan monedas 🪙'); mia.frag -= fr; mia.nv++; PERFIL.guardar(); FX.son('nivel'); FX.confeti(); d.remove(); presentacion(id, alCerrar); }
      if (t === 'pcomp') compartirCarta(c); };
  }
  function habTexto(h) { return { cura: `Cura ${h.valor} de vida a los aliados cercanos cada ${h.cada} s.`, escudo_aura: `Los aliados cercanos reciben ${h.red}% menos daño.`, carga: 'Su primer golpe tras correr hace el doble de daño.', rugido: 'Al aparecer aturde a los enemigos cercanos.', invisible: 'Es invisible hasta que ataca.', asesino: 'Busca a la unidad enemiga más débil.', veneno: 'Sus golpes envenenan.', quema: 'Sus golpes queman durante unos segundos.', congela: 'Sus golpes vuelven lentos a los enemigos.', aturde: 'Sus gritos aturden por un instante.', cadena: `Su rayo salta a ${h.saltos} enemigos más.`, robo: `Se cura el ${h.pct}% del daño que hace.`, explota: 'Explota al morir y daña alrededor.', divide: 'Al caer se divide en unidades más pequeñas.', invoca: `Invoca ${h.n} aliado(s) cada ${h.cada} s.`, revive: 'Renace una vez de sus cenizas.', empuje: 'Sus ataques empujan a los enemigos.', provoca: 'Atrae a los enemigos cercanos.' }[h.tipo] || ''; }
  // Imagen para compartir en redes (1080x1350)
  async function compartirCarta(c) {
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const X = cv.getContext('2d'), R = RZ()[c.rareza];
    const g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1e1b4b'); g.addColorStop(.5, '#4c1d95'); g.addColorStop(1, '#0b0820'); X.fillStyle = g; X.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) { X.fillStyle = `rgba(253,230,138,${Math.random() * .7})`; X.beginPath(); X.arc(Math.random() * W, Math.random() * H, Math.random() * 3, 0, 7); X.fill(); }
    X.fillStyle = R.color; X.fillRect(90, 170, 900, 900); X.fillStyle = '#0f0c29'; X.fillRect(104, 184, 872, 872);
    if (c.id === 'glory_brown') { const im = new Image(); im.src = URL_REINA; await new Promise(r => { im.onload = r; im.onerror = r; }); X.drawImage(im, 104, 184, 872, 872 * im.height / im.width > 872 ? 872 : 872 * im.height / im.width); }
    else { const im = tieneArte(c) ? await imgArte(c) : null; if (im) cubrir(X, im, 104, 184, 872, 872); else X.drawImage(GA.retrato(c, 436, 436), 104, 184, 872, 872); }
    X.textAlign = 'center'; const tg = X.createLinearGradient(0, 40, 0, 140); tg.addColorStop(0, '#fff7c2'); tg.addColorStop(1, '#f59e0b'); X.fillStyle = tg; X.font = '900 96px Georgia,serif'; X.fillText('GLORY BROWN', W / 2, 125); X.fillStyle = '#fde68a'; X.font = '700 34px Figtree,sans-serif'; X.fillText('EL CHOQUE DE LOS REINOS', W / 2, 165);
    X.fillStyle = 'rgba(0,0,0,.6)'; X.fillRect(104, 900, 872, 156); X.fillStyle = '#fff'; X.font = '900 70px Georgia,serif'; X.fillText(c.n, W / 2, 985); X.fillStyle = R.color; X.font = '800 38px Figtree,sans-serif'; X.fillText(R.n.toUpperCase() + ' · ' + (G.mundos[c.m]?.n || 'Reina'), W / 2, 1035);
    X.fillStyle = '#fff'; X.font = '700 40px Figtree,sans-serif'; X.fillText(c.tipo === 'hechizo' ? `💜 ${c.c}  ·  ⚔️ ${c.dmg || c.valor || ''}` : `💜 ${c.c}   ❤️ ${c.hp}   ⚔️ ${c.dmg}`, W / 2, 1140);
    X.fillStyle = '#fde68a'; X.font = '800 44px Figtree,sans-serif'; X.fillText('¿Tienes esta carta? ¡Juega gratis!', W / 2, 1230); X.fillStyle = '#c4b5fd'; X.font = '600 32px Figtree,sans-serif'; X.fillText(location.host, W / 2, 1290);
    const url = `${location.origin}/r/arcade-batalla?src=carta`;
    cv.toBlob(async b => { const f = new File([b], `glory-brown-${c.id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], text: `👑 ¡Mira mi carta ${c.n} en GLORY BROWN! ${url}` }); return; } catch (e) {} }
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = f.name; a.click(); navigator.clipboard?.writeText(url); toast('🖼️ Imagen descargada. ¡Súbela a tus redes!'); }, 'image/png');
  }
  // ---------- Intro de la Reina (primera vez) ----------
  function intro(sig) {
    const d = document.createElement('div'); d.className = 'gb-modal gb'; d.style.background = '#000';
    d.innerHTML = `<div style="width:min(560px,100%)"><div style="border-radius:20px;overflow:hidden;box-shadow:0 0 60px #fcd34d88;border:3px solid #fcd34d"><img src="${URL_REINA_FULL}" style="display:block;width:100%;animation:gbzoom 9s ease-out forwards"></div><div style="padding:14px 4px"><div class="gb-logo"><b>GLORY BROWN</b><small>EL CHOQUE DE LOS REINOS</small></div><p style="text-align:center;margin:6px 0;color:#fde68a;font:700 1rem 'Fraunces',Georgia,serif">❤️ Su legado vive en cada reino y su luz nunca se apagará.</p><button class="gb-btn gb-shine" id="ientrar">⚔️ ¡ENTRAR AL REINO!</button></div></div><style>@keyframes gbzoom{from{transform:scale(1.12)}to{transform:scale(1)}}</style>`;
    document.body.append(d); musicaReina(); setTimeout(() => decir(CARTA.glory_brown, 'aparece', 0, true), 700);
    d.onclick = e => { if (e.target.id === 'ientrar') { d.remove(); D().intro = 1; PERFIL.guardar(); FX.son('nivel'); sig(); } };
  }
  // ---------- Cofres ----------
  const COFRES = { madera: { n: 'Cofre de Madera', e: '📦', col: '#a16207', mon: [30, 50], frag: 6, cartas: 2 }, plata: { n: 'Cofre de Plata', e: '🎁', col: '#cbd5e1', mon: [60, 100], frag: 14, cartas: 3 }, oro: { n: 'Cofre de Oro', e: '💰', col: '#fcd34d', mon: [150, 250], frag: 40, cartas: 4, min: 'rara' },
    magico: { n: 'Cofre Mágico', e: '🔮', col: '#c084fc', mon: [300, 500], frag: 90, cartas: 5, min: 'epica' }, real: { n: 'Cofre Real de Glory', e: '👑', col: '#fde047', mon: [600, 900], frag: 200, cartas: 6, min: 'legendaria' } };
  const ORD_R = ['comun', 'rara', 'epica', 'legendaria', 'mitica', 'suprema', 'real'];
  function sortearCofre() { const r = Math.random(); return r < .5 ? 'madera' : r < .8 ? 'plata' : r < .95 ? 'oro' : r < .99 ? 'magico' : 'real'; }
  function abrirCofre(tipo, alFin) {
    const C = COFRES[tipo], J = D(), mias = Object.keys(J.cartas).map(k => CARTA[k]).filter(Boolean);
    const mon = C.mon[0] + Math.floor(Math.random() * (C.mon[1] - C.mon[0])); PERFIL.ganar(mon);
    const premios = []; let quedan = C.frag;
    for (let i = 0; i < C.cartas && mias.length; i++) {
      let pool = mias; if (i === C.cartas - 1 && C.min) { const p2 = mias.filter(c => ORD_R.indexOf(c.rareza) >= ORD_R.indexOf(C.min)); if (p2.length) pool = p2; }
      const pesos = pool.map(c => ({ comun: 10, rara: 5, epica: 2, legendaria: .6, mitica: .4, suprema: .2, real: .5 }[c.rareza] || 1)), tot = pesos.reduce((a, b) => a + b, 0); let x = Math.random() * tot, c = pool[0]; for (let k = 0; k < pool.length; k++) { x -= pesos[k]; if (x <= 0) { c = pool[k]; break; } }
      const n = i === C.cartas - 1 ? quedan : Math.max(1, Math.round(quedan * (.3 + Math.random() * .3) * ({ comun: 1, rara: .6, epica: .3 }[c.rareza] || .15))); quedan -= n; if (n <= 0) continue;
      J.cartas[c.id].frag = (J.cartas[c.id].frag || 0) + n; premios.push([c, n]); }
    PERFIL.guardar();
    const d = document.createElement('div'); d.className = 'gb-modal gb';
    d.innerHTML = `<div class="box" style="text-align:center"><h2 style="color:${C.col};font:900 1.6rem 'Fraunces',Georgia,serif;text-shadow:0 2px 0 #000">${C.n}</h2><div id="cofre" style="font-size:7rem;cursor:pointer;filter:drop-shadow(0 0 30px ${C.col});animation:gbsacude .5s infinite">${C.e}</div><p class="sub">Toca el cofre para abrirlo</p><div id="prem"></div></div><style>@keyframes gbsacude{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg) scale(1.05)}}</style>`;
    document.body.append(d); FX.son('pop');
    let paso = -1; const sig = () => { paso++; const p = d.querySelector('#prem');
      if (paso === 0) { d.querySelector('#cofre').style.animation = 'none'; d.querySelector('#cofre').textContent = '✨'; FX.confeti(); FX.son('nivel'); p.innerHTML = `<div class="gb-panel"><div style="font-size:3rem">🪙</div><b style="font-size:1.6rem;color:#fde68a">+${mon} monedas</b></div><p class="sub">Toca para seguir</p>`; return; }
      if (paso <= premios.length) { const [c, n] = premios[paso - 1], R = RZ()[c.rareza]; FX.son(ORD_R.indexOf(c.rareza) >= 2 ? 'combo' : 'moneda'); if (ORD_R.indexOf(c.rareza) >= 3) { FX.confeti(); decir(c, 'aparece', 0, true); }
        p.innerHTML = `<div style="width:170px;margin:0 auto;animation:gbentra .4s">${cartaHTML(c, { sinNueva: 1 })}</div><b style="display:block;font-size:1.4rem;color:${R.color};margin-top:8px">+${n} fragmentos</b><small>${R.n}</small><p class="sub">Toca para seguir (${paso}/${premios.length})</p><style>@keyframes gbentra{from{transform:scale(.3) rotate(-20deg);opacity:0}}</style>`; pintarRetratos(p); return; }
      d.remove(); alFin && alFin(); };
    d.onclick = () => sig();
  }
  // ---------- Pantalla principal ----------
  const datosJugador = () => { const J = D(); return { uid: VID, tok: PERFIL.tok, nombre: LS.get('chatNom') || PERFIL.usuario || 'Jugador', avatar: LS.get('chatAv') || 'a01', trofeos: J.trofeos, mazo: J.mazo, niveles: Object.fromEntries(J.mazo.map(k => [k, nivelDe(k)])), clan: J.clan || '' }; };
  let TAB = 'batalla';
  function lobby(t, tab) {
    salir(); registrar(t.id); $('#stage').onclick = null; if (tab) TAB = tab; estilos();
    if (!G) { stage('<div class="card cargando"><div class="sp"></div><p>Abriendo los reinos…</p></div>'); listo().then(() => lobby(t)).catch(() => stage('<div class="card"><h2>No se pudo cargar GLORY BROWN</h2><p class="sub">Revisa tu conexión.</p></div>')); return; }
    const J = D(); if (!J.intro) return intro(() => lobby(t));
    FX.musica?.('batalla');
    const tabs = [['batalla', '⚔️', 'Batalla'], ['cartas', '🃏', 'Cartas'], ['mundos', '🗺️', 'Mundos'], ['ranking', '🏆', 'Ranking'], ['cofres', '🎁', 'Cofres'], ['clan', '🛡️', 'Clan']];
    const cuerpo = { batalla: tabBatalla, cartas: tabCartas, mundos: tabMundos, cofres: tabCofres, ranking: tabRanking }[TAB] || tabBatalla;
    stage(`<div class="gb">${cuerpo(J)}<nav class="gb-tabs">${tabs.map(([k, e, n]) => `<button data-tab="${k}" class="${TAB === k ? 'on' : ''}"><span>${e}</span>${n}${k === 'cofres' && (J.cofres.length || cofreGratisListo(J)) ? ' 🔴' : ''}</button>`).join('')}</nav></div>`);
    pintarRetratos(); if (TAB === 'ranking') cargarRanking(); if (TAB === 'batalla') cardTorneo();
    $('#stage').onclick = e => {
      const tb = e.target.closest('[data-tab]'); if (tb) { if (tb.dataset.tab === 'clan') return clanes(t); return lobby(t, tb.dataset.tab); }
      const cid = e.target.closest('[data-carta]')?.dataset.carta; if (cid) return clicCarta(t, cid);
      const id = e.target.id;
      if (id === 'cuenta') return cuentaModal('crear', () => lobby(t));
      if (id === 'm_1v1' || id === 'm_2v2') return buscar(t, id.slice(2), 'buscar');
      if (id === 'm_ia') return batalla(t, { modo: '1v1' });
      if (id === 'm_ia2') return batalla(t, { modo: '2v2' });
      if (id === 'm_amigo') return amigo(t);
      if (id === 'reinaVer') return presentacion('glory_brown');
      if (id === 'instalar') return instalarApp();
      if (id === 'verPase') return verPase(t);
      if (id === 'g3d') { LS.set('gb3d', LS.get('gb3d') === '0' ? '1' : '0'); LS.set('gb3dq', '1'); toast(LS.get('gb3d') === '0' ? 'Gráficos 2D: más livianos' : 'Gráficos 3D activados ✨'); return lobby(t); }
      if (id === 'reclamarT') { e.target.disabled = true; return post('/api/glory/torneo/reclamar', datosJugador()).then(r => { if (r.error) { toast(r.error); return lobby(t); } FX.confeti(); abrirCofre(r.cofre, () => lobby(t)); }); }
      const rk = e.target.closest('[data-rk]'); if (rk) { RK = rk.dataset.rk; return cargarRanking(); }
      const ca = e.target.closest('[data-camp]'); if (ca) return batalla(t, { modo: '1v1', campana: +ca.dataset.camp });
      const co = e.target.closest('[data-cofre]'); if (co) { const i = +co.dataset.cofre; const tipo = J.cofres[i]; J.cofres.splice(i, 1); PERFIL.guardar(); return abrirCofre(tipo, () => lobby(t)); }
      if (id === 'cgratis') { if (!cofreGratisListo(J)) return toast('Aún no está listo ⏳'); J.cofreGratis = Date.now(); PERFIL.guardar(); return abrirCofre('plata', () => lobby(t)); }
      if (id === 'ccoronas') { if (J.coronas < 10) return toast('Consigue 10 coronas en batallas 👑'); J.coronas -= 10; PERFIL.guardar(); return abrirCofre('oro', () => lobby(t)); }
      if (e.target.dataset.filtro !== undefined) { FILTRO[e.target.dataset.filtro] = e.target.value; }
    };
    $('#stage').onchange = e => { if (e.target.dataset.filtro) { FILTRO[e.target.dataset.filtro] = e.target.value; lobby(t); } };
    setParar(() => { $('#stage').onclick = null; $('#stage').onchange = null; });
  }
  const cofreGratisListo = J => Date.now() - (J.cofreGratis || 0) > 4 * 3600000;
  function tabBatalla(J) {
    const ai = arenaDe(J.trofeos), Ar = G.arenas[ai], sig = G.arenas[ai + 1], M = G.mundos[Ar.mundo], pct = sig ? Math.round((J.trofeos - Ar.trofeos) * 100 / (sig.trofeos - Ar.trofeos)) : 100;
    const misionReina = !J.reina ? `<div class="gb-panel gb-shine" style="display:flex;gap:10px;align-items:center;border-color:#fde047"><img src="/glory/reina_mini.webp" style="width:64px;height:64px;border-radius:50%;border:3px solid #fde047;box-shadow:0 0 18px #fde047"><div style="flex:1"><b style="color:#fde68a">👑 Misión de la Reina</b><br><small>Gana 3 batallas para desbloquear a <b>Glory Brown</b>, la Reina de la Victoria.</small><div class="prog" style="margin:6px 0 0"><i style="width:${Math.min(100, (J.victorias || 0) * 33.4)}%;background:linear-gradient(90deg,#fde047,#f59e0b)"></i></div><small>${Math.min(3, J.victorias || 0)}/3 victorias</small></div><button class="gb-btn chico azul" id="reinaVer" style="width:auto;margin:0;padding:8px">Ver</button></div>` : '';
    return `<div class="gb-logo"><b>GLORY BROWN</b><small>EL CHOQUE DE LOS REINOS</small></div>
      <div class="gb-panel" style="display:flex;gap:8px;justify-content:space-between;align-items:center;padding:8px 12px"><span class="gb-chip">🏆 ${J.trofeos}</span><span class="gb-chip">🪙 ${PERFIL.datos.monedas}</span><span class="gb-chip">👑 ${J.coronas}</span>${PERFIL.usuario ? `<span class="gb-chip">👤 ${escH(PERFIL.usuario)}</span>` : '<button class="gb-btn chico azul" id="cuenta" style="width:auto;margin:0;padding:5px 10px;font-size:.75rem">👤 Crear usuario</button>'}</div>
      ${misionReina}
      ${cardPase()}<div id="torneoBox"></div>
      <div class="gb-panel gb-shine" style="text-align:center;background:linear-gradient(180deg,${M.pal[2]},#0f0c29);border-color:${M.pal[0]}"><small style="letter-spacing:2px;color:${M.pal[1]}">ARENA ${ai + 1} DE 21 · ${M.e} ${escH(M.n).toUpperCase()}</small><h2 style="margin:4px 0;font:900 1.5rem 'Fraunces',Georgia,serif;color:#fff">${escH(Ar.n)}</h2>
        <div class="prog" style="margin:8px 0 2px"><i style="width:${pct}%;background:linear-gradient(90deg,${M.pal[0]},#fff)"></i></div><small>${sig ? `${sig.trofeos - J.trofeos} 🏆 para ${escH(sig.n)}` : '¡Llegaste a la arena legendaria!'}</small>
        <button class="gb-btn gb-shine" id="m_1v1" style="font-size:1.45rem;margin-top:12px">⚔️ BATALLA EN LÍNEA</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><button class="gb-btn chico azul" id="m_2v2">👥 2 vs 2 en línea</button><button class="gb-btn chico azul" id="m_ia">🤖 Contra la máquina</button><button class="gb-btn chico azul" id="m_amigo">🤝 Con un amigo</button><button class="gb-btn chico azul" id="m_ia2">👥 2 vs 2 con bots</button></div></div>
      <div class="gb-panel"><b>🃏 Tu mazo</b> <small style="opacity:.8">· coste medio 💜 ${(J.mazo.reduce((a, k) => a + CARTA[k].c, 0) / 8).toFixed(1)}</small><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">${J.mazo.map(k => cartaHTML(CARTA[k])).join('')}</div></div>
      ${matchMedia('(display-mode: standalone)').matches ? '' : '<button class="gb-btn azul gb-shine" id="instalar">📲 Instalar GLORY BROWN en mi celular</button>'}
      <button class="gb-btn chico azul" id="g3d">🎮 Gráficos: ${window.GLORY3D && LS.get('gb3d') !== '0' ? '3D ✨ (toca para 2D)' : '2D (toca para 3D)'}</button>
      <p class="sub" style="text-align:center">${J.victorias} victorias · ${J.derrotas} derrotas</p>`;
  }
  // ---------- Pase Real (pase de temporada gratis) ----------
  const PASE_N = 30, PASE_XP = 200, MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const temporada = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 7);
  function pase() { const J = D(); if (!J.pase || J.pase.temp !== temporada()) J.pase = { temp: temporada(), xp: 0, rec: [] }; return J.pase; }
  const premioPase = i => i % 10 === 0 ? { cofre: i === PASE_N ? 'real' : 'magico' } : i % 5 === 0 ? { cofre: 'oro' } : i % 3 === 0 ? { frag: 15 + i } : { mon: 40 + i * 8 };
  const iconoPase = r => r.cofre ? COFRES[r.cofre].e : r.frag ? '🧩' : '🪙', textoPase = r => r.cofre ? COFRES[r.cofre].n : r.frag ? `${r.frag} fragmentos` : `${r.mon} monedas`;
  function nombreTemporada() { const [a, m] = temporada().split('-').map(Number); return `Temporada de ${MESES[m - 1]} · ${G.mundos[(a * 12 + m) % 7].n}`; }
  function cardPase() { const P2 = pase(), nv = Math.min(PASE_N, Math.floor(P2.xp / PASE_XP)), pend = [...Array(nv).keys()].filter(i => !P2.rec.includes(i + 1)).length, fr = P2.xp % PASE_XP;
    return `<div class="gb-panel gb-shine" style="border-color:#c084fc;background:linear-gradient(170deg,#4c1d95,#1e1b4b)"><div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#f5d0fe">🎫 Pase Real · gratis</b><small>${escH(nombreTemporada())}</small></div>
      <div style="display:flex;align-items:center;gap:8px;margin:8px 0"><span class="gb-chip">Nivel ${nv}/${PASE_N}</span><div class="prog" style="flex:1;margin:0"><i style="width:${nv >= PASE_N ? 100 : fr * 100 / PASE_XP}%;background:linear-gradient(90deg,#c084fc,#fde047)"></i></div><small>${nv >= PASE_N ? '¡Completo!' : `${fr}/${PASE_XP} XP`}</small></div>
      <button class="gb-btn chico ${pend ? '' : 'azul'}" id="verPase" style="margin:0">${pend ? `🎁 ¡Tienes ${pend} recompensa${pend > 1 ? 's' : ''} por reclamar!` : '🎫 Ver las 30 recompensas'}</button></div>`; }
  function verPase(t) {
    const P2 = pase(), nv = Math.min(PASE_N, Math.floor(P2.xp / PASE_XP)), d = document.createElement('div'); d.className = 'gb-modal gb';
    const pinta = () => { d.innerHTML = `<div class="box"><div class="gb-panel"><div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#f5d0fe;font-size:1.2rem">🎫 Pase Real</b><button class="gb-btn chico azul" id="pcerr" style="width:auto;margin:0;padding:6px 12px">✖</button></div><p class="sub" style="margin:4px 0 10px">${escH(nombreTemporada())}. Ganas XP en cada batalla (más si ganas, más coronas y en línea). Se reinicia cada mes. ¡Es gratis!</p>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${[...Array(PASE_N).keys()].map(i => { const n = i + 1, r = premioPase(n), hecho = P2.rec.includes(n), listo = n <= nv && !hecho;
        return `<button data-pase="${n}" style="border:0;border-radius:12px;padding:6px 2px;color:#fff;font:800 .62rem Figtree,sans-serif;cursor:${listo ? 'pointer' : 'default'};background:${hecho ? 'rgba(34,197,94,.25)' : listo ? 'linear-gradient(180deg,#fde047,#f59e0b)' : 'rgba(255,255,255,.07)'};${listo ? 'color:#3b1d00;box-shadow:0 0 12px #fde047' : ''};${n > nv ? 'opacity:.55' : ''}"><span style="display:block;font-size:1.4rem">${iconoPase(r)}</span>${n}${hecho ? ' ✅' : n > nv ? ' 🔒' : ''}</button>`; }).join('')}</div></div></div>`; };
    pinta(); document.body.append(d);
    d.onclick = e => { if (e.target.id === 'pcerr' || e.target === d) { d.remove(); return lobby(t); } const b = e.target.closest('[data-pase]'); if (!b) return; const n = +b.dataset.pase; if (n > nv || P2.rec.includes(n)) return;
      const r = premioPase(n), J = D(); P2.rec.push(n); PERFIL.guardar();
      if (r.cofre) { d.remove(); return abrirCofre(r.cofre, () => verPase(t)); }
      if (r.mon) { PERFIL.ganar(r.mon); FX.son('moneda'); toast(`+${r.mon} 🪙`); }
      if (r.frag) { const pool = Object.keys(J.cartas).map(k => CARTA[k]).filter(c => ORD_R.indexOf(c.rareza) >= 2); const c = (pool.length ? pool : Object.keys(J.cartas).map(k => CARTA[k]))[Math.floor(Math.random() * (pool.length || Object.keys(J.cartas).length))]; J.cartas[c.id].frag = (J.cartas[c.id].frag || 0) + r.frag; PERFIL.guardar(); FX.son('combo'); toast(`🧩 +${r.frag} fragmentos de ${c.n}`); }
      pinta(); };
  }
  // ---------- Torneo semanal ----------
  let TORNEO = null;
  async function cardTorneo() {
    const box = $('#torneoBox'); if (!box) return;
    try { TORNEO = await fetch('/api/glory/torneo').then(r => r.json()); const yo2 = await post('/api/glory/torneo/yo', datosJugador());
      const resta = Math.max(0, TORNEO.termina - Date.now()), dd = Math.floor(resta / 864e5), hh = Math.floor(resta % 864e5 / 3600000);
      box.innerHTML = `<div class="gb-panel" style="border-color:#f97316;background:linear-gradient(170deg,#7c2d12,#1e1b4b)"><div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#fed7aa">🏟️ ${escH(TORNEO.evento)}</b><small>⏳ ${dd}d ${hh}h</small></div>
        <p class="sub" style="margin:6px 0;text-align:left;font-size:.82rem">Suma puntos en batallas en línea esta semana: victoria +3, empate +2, derrota +1 y +1 por cada corona. Premios: 🥇 Cofre Real · 🥈🥉 Mágico · Top 10 Oro · Top 50 Plata.</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="gb-chip">Tus puntos: ${yo2.puntos || 0}</span><span class="gb-chip">${yo2.puesto ? 'Puesto #' + yo2.puesto : 'Aún sin puesto'}</span></div>
        ${yo2.premio ? `<button class="gb-btn gb-shine" id="reclamarT" style="margin-top:8px">🎁 ¡Quedaste #${yo2.premio.puesto} la semana pasada! Reclamar ${COFRES[yo2.premio.cofre].n}</button>` : ''}</div>`;
    } catch (e) { box.innerHTML = ''; }
  }
  // ---------- App instalable ----------
  async function instalarApp() {
    if (window.__instalar) { const e = window.__instalar; window.__instalar = null; e.prompt(); const r = await e.userChoice.catch(() => ({})); if (r.outcome === 'accepted') { toast('👑 ¡GLORY BROWN se instaló en tu celular!'); FX.confeti(); } return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!ios && location.pathname !== '/glory') { location.href = '/glory?g=arcade-batalla&src=app'; return; }
    const d = document.createElement('div'); d.className = 'gb-modal gb';
    d.innerHTML = `<div class="box"><div class="gb-panel" style="text-align:center"><img src="/glory/icono-192.png" style="width:90px;border-radius:22px"><h2 style="color:#fde68a">📲 Instala GLORY BROWN</h2>${ios ? '<p>1. Toca el botón <b>Compartir</b> <span style="font-size:1.3rem">⬆️</span> de Safari.<br>2. Elige <b>"Agregar a pantalla de inicio"</b>.<br>3. Toca <b>Agregar</b>. ¡Listo! Tendrás el ícono de la Reina.</p>' : '<p>1. Toca el menú <b>⋮</b> del navegador.<br>2. Elige <b>"Instalar aplicación"</b> o <b>"Agregar a la pantalla principal"</b>.<br>3. Confirma. ¡Listo! Tendrás el ícono de la Reina.</p>'}<button class="gb-btn" id="okInst">Entendido</button></div></div>`;
    document.body.append(d); d.onclick = e => { if (e.target.id === 'okInst' || e.target === d) d.remove(); };
  }
  // ---------- Ranking (puntos que da el servidor en partidas en línea) ----------
  let RK = 'mundial', MIO = null;
  function tabRanking() {
    return `<div class="gb-logo"><b style="font-size:1.6rem">RANKING</b><small>BATALLAS EN LÍNEA</small></div>
      <div class="gb-panel" id="rkYo" style="text-align:center"><small>Cargando tu puesto…</small></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">${[['mundial', '🌎 Mundial'], ['pais', '🏳️ País'], ['torneo', '🏟️ Torneo'], ['clanes', '🛡️ Clanes']].map(([k, n]) => `<button class="gb-btn chico ${RK === k ? '' : 'azul'}" data-rk="${k}" style="margin:0">${n}</button>`).join('')}</div>
      <div class="gb-panel" id="rkLista"><p class="sub">Cargando…</p></div>
      <p class="sub" style="text-align:center;font-size:.8rem">Los puntos de ranking solo se ganan en batallas en línea y los calcula el servidor: nadie puede hacer trampa. En línea todas las cartas juegan al nivel de torneo 9.</p>`;
  }
  const BANDERA = cc => cc && cc.length === 2 ? String.fromCodePoint(...[...cc].map(ch => 127397 + ch.charCodeAt(0))) : '🏳️';
  async function cargarRanking() {
    document.querySelectorAll('[data-rk]').forEach(b => b.classList.toggle('azul', b.dataset.rk !== RK));
    try { MIO = await post('/api/glory/yo', datosJugador()); } catch (e) { MIO = {}; }
    const yo2 = $('#rkYo'); if (yo2) yo2.innerHTML = MIO.puesto ? `<b style="font-size:1.4rem;color:#fde68a">#${MIO.puesto}</b> mundial ${MIO.puestoPais ? `· <b>#${MIO.puestoPais}</b> en ${BANDERA(MIO.pais)}` : ''}<br><small>${MIO.puntos} puntos · ${MIO.victorias} victorias</small>` : '<small>Juega una batalla en línea para entrar al ranking 🏆</small>';
    if (RK === 'torneo') { const tr = await fetch('/api/glory/torneo').then(r => r.json()).catch(() => ({ top: [] })), bx = $('#rkLista'); if (bx) bx.innerHTML = `<p style="margin:0 0 8px;text-align:center"><b style="color:#fed7aa">🏟️ ${escH(tr.evento || 'Torneo semanal')}</b></p>` + (tr.top.length ? tr.top.map((x, i) => `<div class="dato"><span>${['🥇', '🥈', '🥉'][i] || `<b style="display:inline-block;width:26px">${i + 1}</b>`} ${BANDERA(x.pais)} ${escH(x.nombre)}</span><b>⭐ ${x.puntos}</b></div>`).join('') : '<p class="sub">Nadie ha jugado esta semana. ¡Sé el primero!</p>'); return; }
    const pais = RK === 'pais' ? (MIO.pais || 'PE') : '', d = await fetch(`/api/glory/ranking?tipo=${RK === 'clanes' ? 'clanes' : 'jugadores'}${pais ? '&pais=' + pais : ''}`).then(r => r.json()).catch(() => ({ lista: [] }));
    const box = $('#rkLista'); if (!box) return;
    box.innerHTML = d.lista.length ? d.lista.map((x, i) => `<div class="dato" style="${i < 3 ? 'background:rgba(252,211,77,.1);border-radius:10px;padding:6px' : ''}"><span>${['🥇', '🥈', '🥉'][i] || `<b style="display:inline-block;width:26px">${i + 1}</b>`} ${RK === 'clanes' ? `${x.insignia} ${escH(x.nombre)} <small style="opacity:.7">· ${x.miembros} 👥</small>` : `${BANDERA(x.pais)} ${escH(x.nombre)}`}</span><b>🏆 ${x.puntos}</b></div>`).join('') : '<p class="sub">Todavía no hay nadie aquí. ¡Sé el primero!</p>';
  }
  const FILTRO = { mundo: 'todos', rareza: 'todas', tipo: 'todos' };
  let CAMBIO = null;
  function tabCartas(J) {
    const lista = G.cartas.filter(c => (FILTRO.mundo === 'todos' || String(c.m) === FILTRO.mundo) && (FILTRO.rareza === 'todas' || c.rareza === FILTRO.rareza) && (FILTRO.tipo === 'todos' || c.tipo === FILTRO.tipo));
    const tengo = Object.keys(J.cartas).length, sel = (k, ops) => `<select data-filtro="${k}" style="flex:1;min-width:0;padding:6px;border-radius:10px;background:#1e1b4b;color:#fff;border:1px solid #fcd34d66">${ops.map(([v, n]) => `<option value="${v}" ${FILTRO[k] === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    return `<div class="gb-logo"><b style="font-size:1.6rem">COLECCIÓN</b><small>${tengo} DE 127 CARTAS</small></div>
      <div class="gb-panel"><b>Tu mazo</b>${CAMBIO ? ` <span class="gb-chip" style="color:#fde68a">Toca la carta del mazo que quieres cambiar por ${escH(CARTA[CAMBIO].n)}</span>` : ''}<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">${J.mazo.map(k => cartaHTML(CARTA[k])).join('')}</div></div>
      <div style="display:flex;gap:6px;margin-bottom:10px">${sel('mundo', [['todos', '🌍 Mundos'], ...G.mundos.map((m, i) => [String(i), m.e + ' ' + m.n]), ['-1', '👑 Reina']])}${sel('rareza', [['todas', '💎 Rareza'], ...Object.entries(G.rarezas).map(([k, r]) => [k, r.n])])}${sel('tipo', [['todos', '🧩 Tipo'], ['tropa', 'Tropas'], ['hechizo', 'Hechizos'], ['estructura', 'Estructuras']])}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${lista.map(c => cartaHTML(c)).join('')}</div>`;
  }
  function clicCarta(t, id) {
    const J = D();
    if (CAMBIO && J.mazo.includes(id) && TAB === 'cartas') { J.mazo[J.mazo.indexOf(id)] = CAMBIO; CAMBIO = null; PERFIL.guardar(); FX.son('swish'); return lobby(t); }
    presentacion(id, () => lobby(t));
    if (J.cartas[id] && !J.mazo.includes(id)) setTimeout(() => { const box = document.querySelector('.gb-modal .gb-panel'); if (!box) return; const b = document.createElement('button'); b.className = 'gb-btn'; b.textContent = '🔁 Poner en mi mazo'; b.onclick = ev => { ev.stopPropagation(); CAMBIO = id; TAB = 'cartas'; document.querySelector('.gb-modal')?.remove(); lobby(t); toast('Ahora toca la carta del mazo que quieres cambiar'); }; box.append(b); }, 30);
  }
  function tabMundos(J) {
    const ai = arenaDe(J.trofeos), camp = J.campana || {};
    return `<div class="gb-logo"><b style="font-size:1.6rem">LOS 7 MUNDOS</b><small>21 ARENAS · CAMPAÑA</small></div>` + G.mundos.map((M, mi) => `<div class="gb-panel" style="background:linear-gradient(170deg,${M.pal[2]},#0f0c29 80%);border-color:${M.pal[0]}"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:2.2rem">${M.e}</span><div><b style="font:900 1.15rem 'Fraunces',Georgia,serif;color:${M.pal[1]}">${escH(M.n)}</b><br><small style="opacity:.85">${escH(M.d)}</small></div></div>
      ${G.arenas.map((A2, i) => A2.mundo !== mi ? '' : `<div style="display:flex;align-items:center;gap:8px;margin-top:8px;background:rgba(0,0,0,.3);border-radius:12px;padding:8px;${i > ai ? 'opacity:.5' : ''}"><b style="width:26px">${i + 1}</b><div style="flex:1"><b>${escH(A2.n)}</b><br><small>🏆 ${A2.trofeos} · ${'⭐'.repeat(camp[i] || 0)}${'☆'.repeat(3 - (camp[i] || 0))}</small></div>${i <= ai ? `<button class="gb-btn chico" data-camp="${i}" style="width:auto;margin:0;padding:8px 12px">▶ Campaña</button>` : '🔒'}</div>`).join('')}
      <div style="display:flex;gap:4px;overflow-x:auto;margin-top:8px;padding-bottom:4px">${G.cartas.filter(c => c.m === mi).map(c => `<div style="flex:0 0 58px">${cartaHTML(c, { coste: false })}</div>`).join('')}</div></div>`).join('');
  }
  function tabCofres(J) {
    const resta = Math.max(0, 4 * 3600000 - (Date.now() - (J.cofreGratis || 0))), h = Math.floor(resta / 3600000), m = Math.floor(resta % 3600000 / 60000);
    return `<div class="gb-logo"><b style="font-size:1.6rem">COFRES</b><small>RECOMPENSAS SIN TRAMPAS</small></div>
      <div class="gb-panel"><b>🎁 Tus cofres</b><small style="opacity:.8"> · ganas uno en cada victoria</small><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">${J.cofres.length ? J.cofres.map((c, i) => `<button class="gb-cofre gb-shine" data-cofre="${i}"><span>${COFRES[c].e}</span>${COFRES[c].n.replace('Cofre ', '')}<br>¡Abrir!</button>`).join('') : '<p class="sub" style="grid-column:1/-1">Gana batallas para conseguir cofres.</p>'}</div></div>
      <div class="gb-panel" style="display:flex;align-items:center;gap:10px"><span style="font-size:2.6rem">🎁</span><div style="flex:1"><b>Cofre gratis</b><br><small>Uno cada 4 horas</small></div><button class="gb-btn chico ${cofreGratisListo(J) ? '' : 'azul'}" id="cgratis" style="width:auto;margin:0;padding:8px 12px">${cofreGratisListo(J) ? '¡Abrir!' : `${h}h ${m}m`}</button></div>
      <div class="gb-panel" style="display:flex;align-items:center;gap:10px"><span style="font-size:2.6rem">👑</span><div style="flex:1"><b>Cofre de coronas</b><br><small>Destruye torres: ${Math.min(10, J.coronas)}/10 coronas</small><div class="prog" style="margin:4px 0 0"><i style="width:${Math.min(100, J.coronas * 10)}%;background:#fde047"></i></div></div><button class="gb-btn chico ${J.coronas >= 10 ? '' : 'azul'}" id="ccoronas" style="width:auto;margin:0;padding:8px 12px">Abrir</button></div>
      <div class="gb-panel"><b>📜 Cómo funcionan</b><p class="sub" style="text-align:left;margin:6px 0 0;font-size:.82rem">Los cofres dan monedas y fragmentos para mejorar tus cartas. Todo se gana jugando: no hay compras obligatorias ni apuestas.</p>${Object.values(COFRES).map(c => `<div class="dato"><span>${c.e} ${c.n}</span><b>${c.cartas} cartas · ${c.mon[0]}+ 🪙</b></div>`).join('')}</div>`;
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

  // ---------- Escenarios de los 7 mundos ----------
  const TEMA = [
    { ces: ['#3f7d33', '#4c8f3a'], hoja: ['rgba(90,150,60,.55)', 'rgba(30,70,25,.55)', 'rgba(170,210,110,.35)'], cam: [150, 128, 96], rio: ['#0c4a6e', '#0369a1', '#0284c7'], pue: 'piedra', prop: 'alba', part: 'petalos', borde: ['#78716c', '#a8a29e'] },
    { ces: ['#1f5d2a', '#2c7a35'], hoja: ['rgba(60,140,60,.6)', 'rgba(10,50,20,.6)', 'rgba(120,200,90,.35)'], cam: [120, 98, 70], rio: ['#064e3b', '#047857', '#10b981'], pue: 'madera', prop: 'bosque', part: 'luciernagas', borde: ['#3f2a14', '#6b4426'] },
    { ces: ['#d6a35a', '#e8bd73'], hoja: ['rgba(180,130,60,.4)', 'rgba(240,200,130,.4)', 'rgba(150,100,40,.35)'], cam: [196, 160, 110], rio: ['#0e7490', '#06b6d4', '#67e8f9'], pue: 'oro', prop: 'arenas', part: 'arena', borde: ['#b45309', '#fcd34d'] },
    { ces: ['#9bd3f5', '#c6e8fb'], hoja: ['rgba(255,255,255,.5)', 'rgba(150,200,240,.5)', 'rgba(255,255,255,.35)'], cam: [235, 238, 245], rio: ['#1e3a8a', '#3b82f6', '#bfdbfe'], pue: 'cristal', prop: 'cielo', part: 'plumas', borde: ['#e0f2fe', '#ffffff'] },
    { ces: ['#2a2440', '#352d52'], hoja: ['rgba(90,70,140,.5)', 'rgba(10,5,20,.6)', 'rgba(140,120,200,.3)'], cam: [90, 84, 108], rio: ['#14532d', '#4d7c0f', '#a3e635'], pue: 'hueso', prop: 'sombras', part: 'niebla', borde: ['#1e1b2e', '#3f3a55'] },
    { ces: ['#dbeafe', '#eff6ff'], hoja: ['rgba(160,200,240,.5)', 'rgba(255,255,255,.6)', 'rgba(120,170,220,.35)'], cam: [170, 190, 210], rio: ['#0c4a6e', '#38bdf8', '#e0f2fe'], pue: 'hielo', prop: 'hielo', part: 'nieve', borde: ['#94a3b8', '#e2e8f0'] },
    { ces: ['#3a2a24', '#4a342b'], hoja: ['rgba(120,60,30,.5)', 'rgba(20,10,5,.6)', 'rgba(200,90,40,.3)'], cam: [92, 80, 74], rio: ['#7f1d1d', '#ea580c', '#fde047'], pue: 'obsidiana', prop: 'dragon', part: 'brasas', borde: ['#1c1917', '#57534e'] },
  ];
  function pintarArena(F, W, H, k, mundo, variante, dpr, solo) {
    const T = TEMA[mundo] || TEMA[0], lin = GA.lin; F.setTransform(dpr, 0, 0, dpr, 0, 0); let sd = 11 + mundo * 7; const r = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
    const g0 = F.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, T.ces[0]); g0.addColorStop(.5, T.ces[1]); g0.addColorStop(1, T.ces[0]); F.fillStyle = g0; F.fillRect(0, 0, W, H);
    for (let i = 0; i < 22; i++) { const x = r() * W, y = r() * H, rr = k * (2 + r() * 4), g = F.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, r() < .5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)'); F.fillStyle = g; F.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    for (let i = 0; i < 2400; i++) { const x = r() * W, y = r() * H, h = 2 + r() * 4; F.strokeStyle = T.hoja[i % 3]; F.lineWidth = 1; F.beginPath(); F.moveTo(x, y); F.lineTo(x + (r() - .5) * 2, y - h); F.stroke(); }
    const camino = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L * 3.2); F.strokeStyle = `rgb(${T.cam.map(v => v * .55 | 0)})`; F.lineWidth = k * 1.7; F.lineCap = 'round'; F.beginPath(); F.moveTo(x0 * k, y0 * k); F.lineTo(x1 * k, y1 * k); F.stroke();
      for (let i = 0; i <= n; i++) { const p = i / n, cx = (x0 + (x1 - x0) * p) * k, cy = (y0 + (y1 - y0) * p) * k; for (let j = -1; j <= 1; j++) { const nx = -(y1 - y0) / L, ny = (x1 - x0) / L, px = cx + nx * j * k * .5 + (r() - .5) * 3, py = cy + ny * j * k * .5 + (r() - .5) * 3, w = k * (.22 + r() * .1), v = .85 + r() * .3;
        F.beginPath(); F.ellipse(px, py, w, w * .8, r() * 3, 0, 7); F.fillStyle = `rgb(${T.cam.map(c => Math.min(255, c * v | 0))})`; F.fill(); F.strokeStyle = 'rgba(30,20,15,.55)'; F.lineWidth = 1; F.stroke(); F.fillStyle = 'rgba(255,255,255,.18)'; F.beginPath(); F.ellipse(px - w * .25, py - w * .25, w * .35, w * .2, 0, 0, 7); F.fill(); } } };
    for (const bx of PUENTES) { camino(bx, 6.5, bx, RIO0); camino(bx, RIO1, bx, 25.5); } camino(3.5, 25.5, 9, 28.4); camino(14.5, 25.5, 9, 28.4); camino(3.5, 6.5, 9, 3.6); camino(14.5, 6.5, 9, 3.6);
    for (const [x, y, rr] of [[3.5, 25.5, 2.1], [14.5, 25.5, 2.1], [9, 28.4, 2.6], [3.5, 6.5, 2.1], [14.5, 6.5, 2.1], [9, 3.6, 2.6]]) { F.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; F.lineTo(x * k + Math.cos(a) * rr * k, y * k + Math.sin(a) * rr * k * .85); } F.closePath(); F.fillStyle = lin(F, 0, (y - rr) * k, 0, (y + rr) * k, [`rgb(${T.cam})`, `rgb(${T.cam.map(v => v * .6 | 0)})`]); F.fill(); F.strokeStyle = 'rgba(20,15,10,.7)'; F.lineWidth = 2; F.stroke(); }
    const rg = F.createLinearGradient(0, RIO0 * k, 0, RIO1 * k); rg.addColorStop(0, T.rio[0]); rg.addColorStop(.4, T.rio[1]); rg.addColorStop(.7, T.rio[2]); rg.addColorStop(1, T.rio[0]); F.fillStyle = rg; F.fillRect(0, RIO0 * k, W, (RIO1 - RIO0) * k);
    for (const yb of [RIO0, RIO1]) for (let x = 0; x < W; x += k * .45) { const w = k * (.25 + r() * .2), c = (mundo === 6 ? 40 : 90) + Math.floor(r() * 50); F.beginPath(); F.ellipse(x + r() * 4, yb * k + (r() - .5) * 4, w, w * .6, 0, 0, 7); F.fillStyle = mundo === 3 ? `rgba(255,255,255,.9)` : `rgb(${c},${c},${c + 8})`; F.fill(); F.strokeStyle = 'rgba(15,15,20,.5)'; F.lineWidth = 1; F.stroke(); }
    const PU = { piedra: ['#78716c', '#a8a29e', '#d6d3d1'], madera: ['#5b3a1a', '#8a5a2e', '#b07a42'], oro: ['#b45309', '#fcd34d', '#fff7c2'], cristal: ['#93c5fd', '#e0f2fe', '#ffffff'], hueso: ['#57534e', '#d6d3d1', '#f5f5f4'], hielo: ['#67e8f9', '#e0f2fe', '#ffffff'], obsidiana: ['#0c0a09', '#44403c', '#f97316'] }[T.pue];
    if (!solo) for (const bx of PUENTES) { const x0 = (bx - 1.35) * k, y0 = (RIO0 - .5) * k, w = 2.7 * k, h = (RIO1 - RIO0 + 1) * k; F.fillStyle = 'rgba(0,0,0,.35)'; F.fillRect(x0 + 4, y0 + 6, w, h); F.fillStyle = lin(F, x0, 0, x0 + w, 0, [PU[0], PU[1], PU[0]]); F.fillRect(x0, y0, w, h);
      F.strokeStyle = 'rgba(30,25,20,.5)'; F.lineWidth = 1; for (let yy = y0; yy < y0 + h; yy += k * .4) { F.beginPath(); F.moveTo(x0, yy); F.lineTo(x0 + w, yy); F.stroke(); }
      for (const sx of [x0 - k * .12, x0 + w - k * .2]) { F.fillStyle = lin(F, sx, 0, sx + k * .32, 0, [PU[0], PU[2], PU[0]]); F.fillRect(sx, y0 - k * .1, k * .32, h + k * .2); F.strokeStyle = 'rgba(20,15,10,.8)'; F.lineWidth = 1.5; F.strokeRect(sx, y0 - k * .1, k * .32, h + k * .2); } }
    // decoración propia de cada mundo
    const sombra = (x, y, s) => { F.fillStyle = 'rgba(0,0,0,.3)'; F.beginPath(); F.ellipse(x + s * .3, y + s * .5, s * 1.1, s * .45, 0, 0, 7); F.fill(); };
    const copa = (x, y, s, cols) => { sombra(x, y, s); for (const [dx, dy, rr, c] of [[0, 0, 1, cols[0]], [-.35, -.2, .7, cols[1]], [.3, -.25, .65, cols[2]], [0, -.45, .6, cols[3]]]) { const g = F.createRadialGradient(x + dx * s - rr * s * .3, y + dy * s - rr * s * .3, 0, x + dx * s, y + dy * s, rr * s); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,.85)'); F.fillStyle = g; F.beginPath(); F.arc(x + dx * s, y + dy * s, rr * s, 0, 7); F.fill(); } };
    const pico = (x, y, s, c1, c2) => { sombra(x, y, s * .8); F.beginPath(); F.moveTo(x - s * .5, y + s * .4); F.lineTo(x - s * .1, y - s * 1.2); F.lineTo(x + s * .15, y - s * .3); F.lineTo(x + s * .35, y - s * .9); F.lineTo(x + s * .6, y + s * .4); F.closePath(); F.fillStyle = lin(F, x - s, y - s, x + s, y + s, [c1, c2]); F.fill(); F.strokeStyle = 'rgba(0,0,0,.4)'; F.lineWidth = 1.5; F.stroke(); };
    const sitios = [[.7, 11], [17.3, 11.5], [.8, 21], [17.2, 20.5], [.6, 2], [17.4, 2.2], [.6, 30], [17.4, 29.8], [6.5, 12.2], [11.8, 19.8], [1.2, 15.6], [16.8, 16.4], [10.2, 9.5], [7.8, 22.6]];
    if (!solo) sitios.forEach(([x, y], i) => { const X0 = x * k, Y0 = y * k, s = k * (i < 8 ? 1 : .5);
      if (T.prop === 'alba') { if (i < 8) copa(X0, Y0, s, ['#166534', '#15803d', '#22c55e', '#86efac']); else { F.fillStyle = '#facc15'; for (let p = 0; p < 5; p++) { F.beginPath(); F.arc(X0 + Math.cos(p * 1.26) * 3, Y0 + Math.sin(p * 1.26) * 3, 2.5, 0, 7); F.fill(); } } }
      if (T.prop === 'bosque') { if (i < 8) copa(X0, Y0, s * 1.15, ['#052e16', '#14532d', '#166534', '#22c55e']); else { F.fillStyle = '#f5ead2'; F.fillRect(X0 - 2, Y0, 4, s * .4); F.save(); F.shadowColor = '#22d3ee'; F.shadowBlur = 10; F.fillStyle = '#22d3ee'; F.beginPath(); F.arc(X0, Y0, s * .35, Math.PI, 0); F.fill(); F.restore(); } }
      if (T.prop === 'arenas') { if (i < 8) { sombra(X0, Y0, s * .6); F.strokeStyle = '#78350f'; F.lineWidth = s * .2; F.beginPath(); F.moveTo(X0, Y0 + s * .4); F.quadraticCurveTo(X0 + s * .2, Y0 - s * .3, X0, Y0 - s * .9); F.stroke(); for (let h = 0; h < 6; h++) { const a = h * 1.05; F.fillStyle = '#16a34a'; F.beginPath(); F.ellipse(X0 + Math.cos(a) * s * .45, Y0 - s * .9 + Math.sin(a) * s * .2, s * .5, s * .12, a, 0, 7); F.fill(); } } else pico(X0, Y0, s * .9, '#fcd34d', '#92400e'); }
      if (T.prop === 'cielo') { if (i < 8) { for (let n = 0; n < 4; n++) { F.fillStyle = 'rgba(255,255,255,.9)'; F.beginPath(); F.arc(X0 + (n - 1.5) * s * .5, Y0 + Math.sin(n) * s * .2, s * .55, 0, 7); F.fill(); } } else { F.save(); F.shadowColor = '#fde047'; F.shadowBlur = 12; pico(X0, Y0, s * .8, '#ffffff', '#93c5fd'); F.restore(); } }
      if (T.prop === 'sombras') { if (i < 8) { sombra(X0, Y0, s * .6); F.strokeStyle = '#1c1917'; F.lineWidth = s * .18; F.beginPath(); F.moveTo(X0, Y0 + s * .4); F.lineTo(X0, Y0 - s * .5); F.lineTo(X0 - s * .5, Y0 - s * .9); F.moveTo(X0, Y0 - s * .3); F.lineTo(X0 + s * .5, Y0 - s * .8); F.stroke(); } else { F.fillStyle = '#57534e'; F.beginPath(); F.roundRect(X0 - s * .3, Y0 - s * .5, s * .6, s * .8, [s * .3, s * .3, 0, 0]); F.fill(); F.strokeStyle = '#1c1917'; F.stroke(); F.save(); F.shadowColor = '#a855f7'; F.shadowBlur = 10; F.fillStyle = '#c084fc'; F.fillRect(X0 - 1, Y0 - s * .35, 2, s * .3); F.restore(); } }
      if (T.prop === 'hielo') { if (i < 8) { sombra(X0, Y0, s * .7); for (let n = 0; n < 3; n++) { F.beginPath(); F.moveTo(X0, Y0 - s * (1.2 - n * .35)); F.lineTo(X0 + s * (.4 + n * .15), Y0 - s * (.5 - n * .35)); F.lineTo(X0 - s * (.4 + n * .15), Y0 - s * (.5 - n * .35)); F.closePath(); F.fillStyle = n % 2 ? '#14532d' : '#166534'; F.fill(); F.fillStyle = '#fff'; F.beginPath(); F.ellipse(X0, Y0 - s * (1.05 - n * .35), s * .2, s * .07, 0, 0, 7); F.fill(); } } else pico(X0, Y0, s, '#ffffff', '#38bdf8'); }
      if (T.prop === 'dragon') { if (i < 8) { pico(X0, Y0, s * 1.1, '#57534e', '#0c0a09'); F.save(); F.shadowColor = '#f97316'; F.shadowBlur = 14; F.strokeStyle = '#f97316'; F.lineWidth = 2; F.beginPath(); F.moveTo(X0 - s * .1, Y0 - s * .9); F.lineTo(X0, Y0 - s * .2); F.stroke(); F.restore(); } else { F.strokeStyle = '#e7e5e4'; F.lineWidth = 3; F.beginPath(); F.arc(X0, Y0, s * .4, Math.PI * 1.1, Math.PI * 1.9); F.stroke(); } }
    });
    const muro = (y0, y1) => { F.fillStyle = lin(F, 0, 0, k * .35, 0, [T.borde[0], T.borde[1]]); F.fillRect(0, y0, k * .35, y1 - y0); F.fillStyle = lin(F, W - k * .35, 0, W, 0, [T.borde[1], T.borde[0]]); F.fillRect(W - k * .35, y0, k * .35, y1 - y0); };
    if (!solo) { muro(0, RIO0 * k); muro(RIO1 * k, H); }
    if (variante === 1) { F.fillStyle = 'rgba(255,130,60,.12)'; F.fillRect(0, 0, W, H); } if (variante === 2) { F.fillStyle = 'rgba(30,10,80,.22)'; F.fillRect(0, 0, W, H); }
    const vg = F.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); F.fillStyle = vg; F.fillRect(0, 0, W, H);
  }
  // ---------- La batalla ----------
  // cfg: { modo: '1v1'|'2v2', online?, campana?: índice de arena }. El asiento 0 simula; en línea los demás reciben el estado.
  function batalla(t, cfg = { modo: '1v1' }) {
    salir(); scrollTo(0, 0); $('#stage').onclick = null; estilos();
    if (!G) return listo().then(() => batalla(t, cfg));
    const J = D(), B = G.balance, dpr = Math.min(2, devicePixelRatio || 1), ON = cfg.online || null, n4 = cfg.modo === '2v2';
    const miAsiento = ON ? ON.asiento : 0, equipoDe = a => n4 ? (a < 2 ? 0 : 1) : a, miEquipo = equipoDe(miAsiento), anfitrion = !ON, voltear = miEquipo === 1;
    const arenaI = cfg.campana ?? (ON ? arenaDe(ON.jugadores?.[0]?.trofeos || 0) : arenaDe(J.trofeos)), arena = G.arenas[arenaI], mundoI = arena.mundo, variante = arenaI % 3;
    // Batalla a pantalla completa: la arena ocupa todo el alto disponible, como en los juegos de celular
    document.body.classList.add('gb-full'); if (!document.getElementById('gbFullCss')) { const st = document.createElement('style'); st.id = 'gbFullCss'; st.textContent = '.gb-full #play{position:fixed;inset:0;z-index:9000;margin:0;max-width:none;width:100%;background:radial-gradient(circle at 50% 30%,#3b0764,#0b0820 75%);overflow-y:auto;overflow-x:hidden;padding:0}.gb-full #back,.gb-full .marca{display:none!important}.gb-full #stage{max-width:520px;margin:0 auto;padding:0}.gb-full #stage .gb-bat{padding:4px 4px 6px;border:0;border-radius:0;background:transparent;box-shadow:none}.gb-full #cv{border:0!important;border-radius:10px!important}'; document.head.appendChild(st); }
    const ancho = Math.min(innerWidth, 520) - 8, k = Math.max(14, Math.min(ancho / AN, (innerHeight - 168) / AL)), W = AN * k, H = AL * k;
    const nivIA = Math.min(10, 1 + Math.floor((cfg.campana ?? arenaDe(J.trofeos)) / 2));
    const baraja = l => [...l].sort(() => Math.random() - .5);
    const mazoBot = () => { const pool = G.cartas.filter(c => c.id !== 'glory_brown' && c.arena <= Math.max(arenaI, 2) && (cfg.campana == null || c.m === mundoI || c.arena <= arenaI)); const t1 = pool.filter(c => ['gigante', 'golem', 'titan', 'jinete'].includes(c.arq)), t2 = pool.filter(c => c.tipo === 'hechizo'), t3 = pool.filter(c => c.tipo === 'tropa' && !t1.includes(c)); const m = [...baraja(t1).slice(0, 2), ...baraja(t2).slice(0, 2), ...baraja(t3)].slice(0, 8).map(c => c.id); while (m.length < 8) m.push(MAZO_INICIAL[m.length]); return m; };
    const asientos = [...Array(n4 ? 4 : 2).keys()].map(a => {
      const jo = ON?.jugadores.find(j => j.asiento === a), local = a === miAsiento, ia = ON ? (!jo || jo.bot) : !local;
      let mazo = local ? [...J.mazo] : jo && !jo.bot && jo.mazo?.length === 8 ? jo.mazo.filter(c => CARTA[c]) : mazoBot(); while (mazo.length < 8) mazo.push(MAZO_INICIAL[mazo.length]); mazo = baraja(mazo);
      const niv = ON ? Object.fromEntries(G.cartas.map(c => [c.id, 9])) : local ? Object.fromEntries(Object.entries(J.cartas).map(([k2, v]) => [k2, v.nv])) : jo && !jo.bot ? (jo.niveles || {}) : Object.fromEntries(G.cartas.map(c => [c.id, nivIA]));
      return { a, team: equipoDe(a), ctrl: local ? 'local' : ia ? 'ia' : 'remoto', mana: B.manaInicial, mano: mazo.slice(0, 4), cola: mazo.slice(4), niv, nombre: jo ? jo.nombre : local ? (LS.get('chatNom') || 'Tú') : cfg.campana != null ? `Guardián de ${arena.n.split(' ').slice(-1)[0]}` : ['Bot Kira', 'Bot Toro', 'Bot Luna', 'Bot Rayo'][a], iaT: 2 + a * .7 };
    });
    const yo = asientos[miAsiento];
    stage(`<div class="gb" style="user-select:none;-webkit-user-select:none"><div class="gb-panel gb-bat" style="padding:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px"><button class="gb-btn chico azul" id="rend" style="width:auto;margin:0;padding:4px 9px;font-size:.8rem">🏳️</button><div style="text-align:center"><b id="reloj" style="font-size:1.15rem">3:00</b><br><small style="opacity:.8;font-size:.62rem">${G.mundos[mundoI].e} ${escH(arena.n)}</small></div><span style="display:flex;gap:2px;align-items:center">${FX.botones ? FX.botones() : ''}<button class="gb-btn chico azul" id="emo" style="width:auto;margin:0;padding:4px 9px">😀</button></span></div>
      <canvas id="cv" width="${W * dpr}" height="${H * dpr}" style="width:${W}px;height:${H}px;display:block;margin:0 auto;border-radius:14px;touch-action:none;border:2px solid rgba(252,211,77,.5)"></canvas>
      <div id="emos" style="display:none;justify-content:center;gap:10px;padding:4px">${['😂', '👍', '😡', '😭', '😎', '👏'].map(e => `<button data-e="${e}" style="background:none;border:0;font-size:1.6rem;cursor:pointer">${e}</button>`).join('')}</div>
      <div style="display:flex;gap:6px;align-items:flex-end;margin-top:6px"><div style="text-align:center;width:44px"><small style="font-size:.6rem;opacity:.8">Sigue</small><canvas id="sig" style="width:40px;height:50px;display:block;margin:0 auto;opacity:.8;border-radius:6px"></canvas></div><div id="mano" style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:5px"></div></div>
      <div style="position:relative;height:22px;margin-top:6px;border-radius:11px;background:rgba(0,0,0,.5);overflow:hidden;border:1px solid #d946ef88"><i id="mana" style="position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#86198f,#d946ef,#f5d0fe);width:0%;box-shadow:0 0 12px #d946ef"></i><i id="manaP" style="position:absolute;top:0;bottom:0;background:rgba(245,208,254,.35);width:0%"></i><div style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(10,1fr)">${'<span style="border-right:1px solid rgba(255,255,255,.25)"></span>'.repeat(10)}</div><b id="manaN" style="position:absolute;left:8px;top:0;font-size:.9rem;line-height:22px;text-shadow:0 1px 2px #000">💜 5</b></div></div></div>`);
    const cv = $('#cv'), X = cv.getContext('2d'); X.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fondo = document.createElement('canvas'); fondo.width = W * dpr; fondo.height = H * dpr; pintarArena(fondo.getContext('2d'), W, H, k, mundoI, variante, dpr);
    let ents = [], proys = [], efectos = [], textos = [], zonas = [], tiempo = B.duracion, extra = false, fin = false, vivo = true, raf, last = performance.now(), sel = null, coronas = [0, 0], shake = 0;
    const torres = tm => ents.filter(e => e.torre && e.team === tm && e.hp > 0);
    const vy = y => voltear ? AL - y : y, vt = tm => voltear ? 1 - tm : tm;
    const texto = (txt, x, y, tam, dur) => { textos.push({ txt, x, y, tam, v: dur, max: dur }); };
    // Eventos que llegan del motor (local) o del servidor (en línea)
    function recibirEfecto(f) { if (f.tipo === 'sacudida') shake = Math.max(shake, f.v); else if (f.tipo === 'confeti') FX.confeti(); else if (f.tipo === 'muerte') { for (let i = 0; i < 8; i++) efectos.push({ tipo: 'chispa', x: f.x, y: f.y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, v: .5, max: .5, team: f.team }); } else efectos.push(f); }
    function recibirTexto(txt, o = {}) { if (txt == null) txt = o.equipo === miEquipo ? o.a : o.b; texto(txt, o.x != null ? o.x * k : W / 2, o.y != null ? vy(o.y) * k : H / 2, (o.tam || 1) * k, o.dur || 1.8); }
    function recibirVoz(tipo, team) { const mio = team === miEquipo; const t2 = { reyDespierta: mio ? '¡La reina despierta! ¡Defiendan el castillo!' : null, torre: mio ? '¡Cuidado! Perdimos una torre' : '¡Torre destruida! ¡Bien hecho!', extra: '¡Tiempo extra!', doble: '¡Elixir doble!' }[tipo]; if (t2) FX.voz?.(t2, { forzar: true, tono: mio ? .9 : 1.05 }); if (tipo === 'extra' || tipo === 'doble') FX.intensidad?.(2); }
    function recibirHabla(e, clave, i, forzar) { if (!e?.card) return; const txt = decir(e.card, clave, i, forzar); if (txt) e.dice = { txt, v: 2.2 }; }
    // ---------- Motor local (contra la máquina) ----------
    let M = null;
    if (!ON) {
      M = GloryMotor.crear({ G, CARTA, n4, arenaI, asientos: asientos.map(a => ({ a: a.a, team: a.team, ctrl: a.ctrl === 'ia' ? 'ia' : 'jugador', mazo: [...a.mano, ...a.cola], niv: a.niv, nombre: a.nombre, bonus: a.ctrl === 'ia' && a.team !== miEquipo ? 1 + arenaI * .01 : 1 })),
        ev: { efecto: recibirEfecto, son: t2 => FX.son(t2), texto: recibirTexto, habla: recibirHabla, voz: recibirVoz, emote: (a, e) => emote(a, e), fin: g => terminar(g) } });
      M.S.asientos.forEach((s, i) => { const c = asientos[i].ctrl; Object.assign(asientos[i], s, { ctrl: s.ctrl === 'ia' ? 'ia' : c }); M.S.asientos[i] = asientos[i]; });
    }
    // Grabación del video de la batalla (para compartir en TikTok, Reels y Facebook)
    let grab = null, trozos = [], grabTipo = '', grabT0 = performance.now();
    let conAudio = false; try { if (window.MediaRecorder && cv.captureStream) { const flujo = cv.captureStream(30), au = FX.flujoAudio?.(); if (au) au.getAudioTracks().forEach(tr => { flujo.addTrack(tr); conAudio = true; }); grabTipo = [...(conAudio ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus'] : []), 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || ''; if (grabTipo && !/opus|mp4a/.test(grabTipo)) { flujo.getAudioTracks().forEach(tr => flujo.removeTrack(tr)); conAudio = false; } if (grabTipo) { grab = new MediaRecorder(flujo, { mimeType: grabTipo, videoBitsPerSecond: 2500000, audioBitsPerSecond: 96000 }); grab.ondataavailable = e => { if (e.data.size) trozos.push(e.data); }; grab.start(1000); } } } catch (e) { grab = null; }
    const pararGrab = () => new Promise(ok => { if (!grab || grab.state === 'inactive') return ok(); grab.onstop = () => ok(); try { grab.stop(); } catch (e) { ok(); } });
    // Portadas del video (1080x1920): intro con la Reina y cierre con el resultado
    async function portadaVideo(tipo) {
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const x = c.getContext('2d'), M2 = G.mundos[mundoI];
      const g = x.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#0b0820'); g.addColorStop(.5, M2.pal[2]); g.addColorStop(1, '#0b0820'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
      for (let i = 0; i < 220; i++) { x.fillStyle = `rgba(253,230,138,${Math.random() * .8})`; x.beginPath(); x.arc(Math.random() * 1080, Math.random() * 1920, Math.random() * 3.5, 0, 7); x.fill(); }
      const im = new Image(); im.src = '/glory/reina_carta.webp'; await new Promise(r => { im.onload = r; im.onerror = r; });
      const dorado = y0 => { const tg = x.createLinearGradient(0, y0 - 120, 0, y0); tg.addColorStop(0, '#fff7c2'); tg.addColorStop(.5, '#fcd34d'); tg.addColorStop(1, '#b45309'); return tg; };
      x.textAlign = 'center'; x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 20;
      if (tipo === 'intro') {
        if (im.width) { x.save(); x.shadowColor = '#fcd34d'; x.shadowBlur = 60; x.drawImage(im, 140, 330, 800, 800 * im.height / im.width); x.restore(); x.strokeStyle = '#fcd34d'; x.lineWidth = 10; x.strokeRect(140, 330, 800, 800 * im.height / im.width); }
        x.fillStyle = dorado(250); x.font = '900 150px Georgia,serif'; x.fillText('GLORY BROWN', 540, 250, 980); x.fillStyle = '#fde68a'; x.font = '800 46px Figtree,sans-serif'; x.fillText('EL CHOQUE DE LOS REINOS', 540, 315);
        const eq = tm => asientos.filter(a => a.team === tm).map(a => a.nombre).join(' + ');
        x.fillStyle = '#93c5fd'; x.font = '900 78px Figtree,sans-serif'; x.fillText(eq(miEquipo), 540, 1470); x.fillStyle = '#fde047'; x.font = '900 96px Figtree,sans-serif'; x.fillText('⚔️ VS ⚔️', 540, 1590); x.fillStyle = '#fca5a5'; x.font = '900 78px Figtree,sans-serif'; x.fillText(eq(1 - miEquipo), 540, 1710);
        x.fillStyle = '#e9d5ff'; x.font = '700 42px Figtree,sans-serif'; x.fillText(`${M2.e} ${arena.n}`, 540, 1810);
      } else {
        const gano2 = coronas[miEquipo] > coronas[1 - miEquipo] ? true : coronas[miEquipo] < coronas[1 - miEquipo] ? false : null;
        x.fillStyle = gano2 === false ? '#fca5a5' : dorado(420); x.font = '900 170px Georgia,serif'; x.fillText(gano2 ? '¡VICTORIA!' : gano2 === null ? '¡EMPATE!' : 'DERROTA', 540, 420, 1000);
        x.font = '140px serif'; x.fillText('👑'.repeat(Math.min(3, coronas[miEquipo])) + '🤍'.repeat(3 - Math.min(3, coronas[miEquipo])), 540, 620);
        if (im.width) { x.save(); x.beginPath(); x.arc(540, 960, 260, 0, 7); x.clip(); x.drawImage(im, 280, 700, 520, 520 * im.height / im.width); x.restore(); x.strokeStyle = '#fcd34d'; x.lineWidth = 12; x.beginPath(); x.arc(540, 960, 260, 0, 7); x.stroke(); }
        x.fillStyle = '#fff'; x.font = '900 70px Figtree,sans-serif'; x.fillText('¿TÚ ME GANAS?', 540, 1380); x.fillStyle = '#fde68a'; x.font = '800 56px Figtree,sans-serif'; x.fillText('Juega gratis en', 540, 1490);
        x.fillStyle = '#fff'; x.font = '900 64px Figtree,sans-serif'; x.fillText(location.host + '/glory', 540, 1590, 1000); x.fillStyle = '#c4b5fd'; x.font = '700 40px Figtree,sans-serif'; x.fillText('127 cartas · 7 mundos · batallas en vivo', 540, 1700);
      }
      return await new Promise(r => c.toBlob(r, 'image/png'));
    }
    async function compartirVideo(btn) {
      if (!trozos.length) return toast('Este celular no permite grabar el video 😕');
      btn.disabled = true; btn.textContent = '⏳ Preparando tu video…'; const dur = Math.round((performance.now() - grabT0) / 1000), crudo = new Blob(trozos, { type: grabTipo.split(';')[0] });
      let blob = crudo, ext = grabTipo.includes('mp4') ? 'mp4' : 'webm';
      try { const [ini, cie] = await Promise.all([portadaVideo('intro'), portadaVideo('cierre')]); btn.textContent = '🎬 Montando el video (intro, batalla y final)…';
        const r = await fetch(`/api/glory/video?dur=${dur}&i=${ini.size}&o=${cie.size}&a=${conAudio ? 1 : 0}`, { method: 'POST', headers: { 'content-type': grabTipo.split(';')[0] }, body: new Blob([ini, cie, crudo]) }).then(r => r.json()); if (r.url) { blob = await fetch(r.url).then(x => x.blob()); ext = 'mp4'; } } catch (e) {}
      const f = new File([blob], `glory-brown-batalla.${ext}`, { type: ext === 'mp4' ? 'video/mp4' : 'video/webm' }), txt = `👑 ¡Mira mi batalla en GLORY BROWN! Juega gratis: ${location.origin}/glory`;
      btn.disabled = false; btn.textContent = '🎬 Compartir video de la batalla';
      if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], text: txt }); return; } catch (e) {} }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; a.click(); navigator.clipboard?.writeText(txt).catch(() => {}); toast('🎬 Video descargado. ¡Súbelo a TikTok, Reels o Facebook!');
    }
    const sincronizar = () => { ents = M.S.ents; proys = M.S.proys; zonas = M.S.zonas; tiempo = M.S.tiempo; extra = M.S.extra; coronas = M.S.coronas; };
    if (M) sincronizar();
    function emote(asiento, e, enviarRed) { efectos.push({ tipo: 'emote', team: equipoDe(asiento), e, v: 2.5, max: 2.5, x: 0, y: 0 }); FX.son('pop'); if (ON && enviarRed) post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'emote', datos: { e, a: asiento } }).catch(() => {}); }
    // ---------- En línea: el servidor calcula la partida; aquí solo se dibuja ----------
    let mapa = new Map();
    function aplicarEstado(d) {
      tiempo = d.t; extra = !!d.x; coronas = d.c; const vistos = new Set();
      for (const [id, team, cid, x, y, hp, max, fl] of d.e) { vistos.add(id); let e = mapa.get(id);
        if (!e) { e = { id, team, x, y, hp, max, t: Math.random() * 5, buf: {} }; if (cid === 'R' || cid === 'T') Object.assign(e, { torre: 1, rey: cid === 'R', r: cid === 'R' ? 1.9 : 1.5 }); else { const c = CARTA[cid]; if (!c) continue; Object.assign(e, { card: c, cid, r: c.r, aire: c.aire, estructura: c.tipo === 'estructura' }); } mapa.set(id, e); }
        if (hp < e.hp) e.flash = .15; e.tx = x; e.ty = y; e.hp = hp; e.max = max; e.buf.aturdido = fl & 1; e.nace = fl & 2 ? .5 : 0; e.at = fl & 4 ? .25 : 0; e.activo = !!(fl & 8); e.invis = fl & 32; e.buf.lento = fl & 64; e.buf.red = fl & 128; e.buf.furia = fl & 256; e.mueve = fl & 512 ? .15 : 0; }
      for (const [id, e] of mapa) if (!vistos.has(id) && !e.torre) mapa.delete(id);
      ents = [...mapa.values()].filter(e => e.hp > 0 || e.torre);
      proys = d.p.map(([tipo, x, y, tx, ty]) => ({ tipo, x, y, tx, ty, tgt: { x: tx, y: ty } })); zonas = d.z.map(([tipo, x, y, radio, col]) => ({ tipo, x, y, radio, col }));
      d.s.forEach((s, i) => { if (!asientos[i]) return; asientos[i].mana = s[0]; asientos[i].mano = s[1]; asientos[i].cola = [s[2]]; });
      for (const f of d.fx || []) recibirEfecto(f); for (const s of (d.so || []).slice(0, 6)) FX.son(s);
      for (const [txt, o] of d.tx || []) recibirTexto(txt, o); for (const [tipo, team] of d.vo || []) recibirVoz(tipo, team);
      for (const [id, clave, i] of d.ha || []) recibirHabla(mapa.get(id), clave, i, true);
      if (JSON.stringify(yo.mano) !== manoPintada) pintarMano();
    }
    if (ON) {
      ES = ES || new EventSource(`/api/duelo/stream?sala=${ON.sala}&tok=${ON.tok}`);
      ES.addEventListener('estado', e => aplicarEstado(JSON.parse(e.data)));
      ES.addEventListener('emote', e => { const d = JSON.parse(e.data); if (d.de !== miAsiento) emote(d.a ?? d.de, d.e, false); });
      ES.addEventListener('salio', e => { const d = JSON.parse(e.data); if (!fin) texto(`📴 ${d.nombre} se desconectó · un bot juega por él`, W / 2, H * .4, k * .6, 3); });
      ES.addEventListener('fin', e => { const d = JSON.parse(e.data); coronas = d.c; terminar(d.g, d.rank ? d.rank[miAsiento] : null); });
    }
    // ---------- Dibujo ----------
    const PART = (() => { const T = TEMA[mundoI].part; return [...Array(T === 'nieve' ? 70 : 34)].map(() => ({ x: Math.random() * W, y: Math.random() * H, f: Math.random() * 9, v: .4 + Math.random() * .8, tipo: T })); })();
    function ambiente(dt, tt) {
      for (const p of PART) { const T = p.tipo;
        if (T === 'nieve') { p.y += p.v * 22 * dt; p.x += Math.sin(tt + p.f) * 8 * dt; if (p.y > H) p.y = -5; X.fillStyle = 'rgba(255,255,255,.85)'; X.beginPath(); X.arc(p.x, p.y, 1.6 + p.v, 0, 7); X.fill(); }
        else if (T === 'brasas') { p.y -= p.v * 18 * dt; p.x += Math.sin(tt * 2 + p.f) * 6 * dt; if (p.y < -5) p.y = H + 5; X.fillStyle = `rgba(251,146,60,${.4 + .5 * Math.sin(tt * 4 + p.f) ** 2})`; X.beginPath(); X.arc(p.x, p.y, 1.5, 0, 7); X.fill(); }
        else if (T === 'luciernagas') { const x = p.x + Math.sin(tt * .7 + p.f) * k, y = p.y + Math.cos(tt * .5 + p.f * 2) * k; X.fillStyle = `rgba(217,255,107,${.3 + .6 * Math.sin(tt * 3 + p.f) ** 2})`; X.beginPath(); X.arc(x, y, 2, 0, 7); X.fill(); }
        else if (T === 'arena') { p.x += p.v * 40 * dt; if (p.x > W) p.x = -5; X.fillStyle = 'rgba(253,230,138,.5)'; X.fillRect(p.x, p.y, 2.5, 1); }
        else if (T === 'plumas' || T === 'petalos') { p.y += p.v * 14 * dt; p.x += Math.sin(tt + p.f) * 10 * dt; if (p.y > H) p.y = -5; X.fillStyle = T === 'petalos' ? 'rgba(251,207,232,.85)' : 'rgba(255,255,255,.85)'; X.beginPath(); X.ellipse(p.x, p.y, 3, 1.5, tt + p.f, 0, 7); X.fill(); }
        else if (T === 'niebla') { p.x += p.v * 6 * dt; if (p.x > W + 40) p.x = -40; X.fillStyle = 'rgba(167,139,250,.06)'; X.beginPath(); X.arc(p.x, p.y, k * 2.2, 0, 7); X.fill(); } }
    }
    function rio(tt) { const T = TEMA[mundoI]; if (mundoI === 6) { X.fillStyle = `rgba(253,224,71,${.15 + .1 * Math.sin(tt * 2)})`; X.fillRect(0, RIO0 * k, W, (RIO1 - RIO0) * k); } X.strokeStyle = mundoI === 6 ? 'rgba(254,240,138,.5)' : 'rgba(255,255,255,.35)'; X.lineWidth = 1.5; for (let i = 0; i < 3; i++) { X.beginPath(); for (let x = 0; x <= W; x += 6) X.lineTo(x, (RIO0 + .5 + i * .5) * k + Math.sin(x / 18 + tt * (mundoI === 6 ? .5 : 1.6) + i * 2) * 2); X.stroke(); } void T; }
    function dibTorre(e) {
      const x = e.x * k, y = vy(e.y) * k, s = e.r * k, tm = vt(e.team), T = GA.EQ[tm], h = s * (e.rey ? 1.55 : 1.35), w = s * .95, ahora = performance.now() / 1000, lin = GA.lin, cont = GA.cont, metal = GA.metal;
      if (e.hp <= 0) { X.fillStyle = 'rgba(0,0,0,.35)'; X.beginPath(); X.ellipse(x, y + s * .4, s * 1.1, s * .4, 0, 0, 7); X.fill(); for (let i = 0; i < 9; i++) { const rx = x + Math.sin(i * 2.3) * s * .8, ry = y + Math.cos(i * 1.7) * s * .35, ww = s * (.2 + (i % 3) * .1); X.beginPath(); X.moveTo(rx - ww, ry + ww * .4); X.lineTo(rx - ww * .4, ry - ww * .6); X.lineTo(rx + ww * .7, ry - ww * .3); X.lineTo(rx + ww, ry + ww * .5); X.closePath(); X.fillStyle = lin(X, rx - ww, ry - ww, rx + ww, ry + ww, ['#a8a29e', '#57534e']); X.fill(); } return; }
      X.fillStyle = 'rgba(0,0,0,.4)'; X.beginPath(); X.ellipse(x + s * .25, y + s * .55, w * 1.15, s * .38, 0, 0, 7); X.fill();
      X.fillStyle = lin(X, x - w, 0, x + w, 0, ['#57534e', '#d6d3d1', '#a8a29e', '#44403c']); X.beginPath(); X.moveTo(x - w, y - h * .6); X.lineTo(x - w, y + s * .4); X.ellipse(x, y + s * .4, w, s * .3, 0, Math.PI, 0, true); X.lineTo(x + w, y - h * .6); X.closePath(); X.fill(); cont(X, 2);
      X.strokeStyle = 'rgba(30,25,20,.45)'; X.lineWidth = 1; for (let i = 1; i < 6; i++) { const yy = y - h * .6 + i * (h * .6 + s * .4) / 6; X.beginPath(); X.moveTo(x - w, yy); X.lineTo(x + w, yy); X.stroke(); }
      X.beginPath(); X.moveTo(x - s * .35, y - h * .45); X.lineTo(x + s * .35, y - h * .45); X.lineTo(x + s * .35, y + s * .15); X.lineTo(x, y + s * .02 + Math.sin(ahora * 3) * 2); X.lineTo(x - s * .35, y + s * .15); X.closePath(); X.fillStyle = lin(X, x, y - h * .45, x, y + s * .15, [T.luz, T.c, T.c2]); X.fill(); cont(X, 1.5);
      // emblema de la corona de GLORY BROWN
      X.fillStyle = metal(X, x, y - h * .2, s * .2, 'oro'); X.beginPath(); const cy0 = y - h * .22; X.moveTo(x - s * .18, cy0 + s * .08); X.lineTo(x - s * .2, cy0 - s * .1); X.lineTo(x - s * .08, cy0 - s * .02); X.lineTo(x, cy0 - s * .15); X.lineTo(x + s * .08, cy0 - s * .02); X.lineTo(x + s * .2, cy0 - s * .1); X.lineTo(x + s * .18, cy0 + s * .08); X.closePath(); X.fill();
      X.beginPath(); X.ellipse(x, y - h * .6, w * 1.08, s * .3, 0, 0, 7); X.fillStyle = lin(X, x, y - h * .6 - s * .3, x, y - h * .6 + s * .3, ['#e7e5e4', '#78716c']); X.fill(); cont(X, 2);
      for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6, bx = x + Math.cos(a) * w * .95, by = y - h * .6 + Math.sin(a) * s * .26; X.fillStyle = lin(X, bx - s * .12, 0, bx + s * .12, 0, ['#a8a29e', '#e7e5e4', '#78716c']); X.fillRect(bx - s * .12, by - s * .32, s * .24, s * .3); }
      const gy = y - h * .62;
      if (e.rey) { X.beginPath(); X.moveTo(x - s * .38, gy); X.quadraticCurveTo(x, gy + s * .5, x + s * .38, gy); X.lineTo(x + s * .3, gy - s * .35); X.lineTo(x - s * .3, gy - s * .35); X.closePath(); X.fillStyle = lin(X, x, gy - s * .35, x, gy + s * .3, [T.c, T.c2]); X.fill(); cont(X, 1.5);
        X.beginPath(); X.ellipse(x, gy - s * .4, s * .36, s * .38, 0, 0, 7); X.fillStyle = '#e2e8f0'; X.fill();
        X.beginPath(); X.arc(x, gy - s * .5, s * .25, 0, 7); X.fillStyle = GA.rad(X, x, gy - s * .5, s * .25, '#fde2c8', '#c08a62'); X.fill(); cont(X, 1.5);
        GA.ojosF(X, x, gy - s * .52, s * .08, s * .03, tm ? '#fecaca' : '#bfdbfe');
        X.beginPath(); X.moveTo(x - s * .24, gy - s * .66); X.lineTo(x - s * .28, gy - s * 1.0); X.lineTo(x - s * .13, gy - s * .82); X.lineTo(x, gy - s * 1.08); X.lineTo(x + s * .13, gy - s * .82); X.lineTo(x + s * .28, gy - s * 1.0); X.lineTo(x + s * .24, gy - s * .66); X.closePath(); X.fillStyle = metal(X, x, gy - s * .85, s * .3, 'oro'); X.fill(); cont(X, 1.2); X.fillStyle = '#3b82f6'; X.beginPath(); X.arc(x, gy - s * .8, s * .05, 0, 7); X.fill(); GA.brillo(X, x, gy - s * .85, s * .5, '#fde047', .5);
        if (!e.activo) { X.font = `900 ${s * .5}px Figtree,sans-serif`; X.textAlign = 'center'; X.fillStyle = '#e0e7ff'; X.fillText('z z', x + s * .65, gy - s * .9 - Math.sin(ahora * 2) * 3); } }
      else { X.beginPath(); X.arc(x, gy - s * .3, s * .22, 0, 7); X.fillStyle = metal(X, x, gy - s * .3, s * .22); X.fill(); cont(X, 1.2); X.fillStyle = '#0f172a'; X.fillRect(x - s * .15, gy - s * .32, s * .3, s * .06); X.fillStyle = T.c; X.beginPath(); X.moveTo(x - s * .03, gy - s * .5); X.quadraticCurveTo(x + s * .25, gy - s * .8, x + s * .1, gy - s * .45); X.fill(); }
      const px = x + w * .85, py0 = y - h * .62; X.strokeStyle = '#292524'; X.lineWidth = 2; X.beginPath(); X.moveTo(px, py0); X.lineTo(px, py0 - s * 1.1); X.stroke();
      X.beginPath(); X.moveTo(px, py0 - s * 1.1); for (let i = 0; i <= 8; i++) X.lineTo(px + i * s * .07, py0 - s * 1.1 + Math.sin(ahora * 6 + i * .8) * 2.5); for (let i = 8; i >= 0; i--) X.lineTo(px + i * s * .07, py0 - s * .75 + Math.sin(ahora * 6 + i * .8) * 2.5); X.closePath(); X.fillStyle = T.c; X.fill();
      const f = e.hp / e.max; if (f < .66) { X.strokeStyle = 'rgba(20,10,5,.85)'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(x - w * .6, y - h * .5); X.lineTo(x - w * .3, y - h * .2); X.lineTo(x - w * .5, y + s * .1); X.stroke(); }
      if (f < .33 && Math.random() < .25) efectos.push({ tipo: 'humo', x: e.x + (Math.random() - .5), y: e.y - (h / k) * .7 * (voltear ? -1 : 1), vx: (Math.random() - .5) * .4, vy: -.8 * (voltear ? -1 : 1), v: 1.2, max: 1.2, r: .4 });
      if (e.buf?.aturdido > 0) { X.fillStyle = 'rgba(186,230,253,.35)'; X.beginPath(); X.ellipse(x, y - h * .2, w * 1.1, h * .7, 0, 0, 7); X.fill(); }
      if (e.hp < e.max || e.rey) { const bw = s * 2.1, yb = tm ? y + s * .85 : y - h * .62 - s * 1.35; X.fillStyle = 'rgba(0,0,0,.65)'; X.beginPath(); X.roundRect(x - bw / 2 - 2, yb - 2, bw + 4, 11, 5); X.fill(); X.fillStyle = lin(X, 0, yb, 0, yb + 7, [T.luz, T.c]); X.beginPath(); X.roundRect(x - bw / 2, yb, bw * Math.max(0, e.hp) / e.max, 7, 4); X.fill();
        X.font = `900 ${Math.max(9, k * .48)}px Figtree,sans-serif`; X.textAlign = 'center'; X.lineWidth = 3; X.strokeStyle = 'rgba(0,0,0,.8)'; const tx = Math.max(0, Math.ceil(e.hp)); X.strokeText(tx, x, yb + (tm ? 20 : -4)); X.fillStyle = '#fff'; X.fillText(tx, x, yb + (tm ? 20 : -4)); }
    }
    function globo(e, x, y) { if (!e.dice || e.dice.v <= 0) return; X.font = `800 ${Math.max(10, k * .48)}px Figtree,sans-serif`; const w = Math.min(W * .7, X.measureText(e.dice.txt).width + 16), hh = Math.max(18, k * .8); x = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x)); y = Math.max(hh + 4, y);
      X.globalAlpha = Math.min(1, e.dice.v * 3); X.fillStyle = vt(e.team) ? '#fff1f2' : '#eff6ff'; X.strokeStyle = vt(e.team) ? '#dc2626' : '#2563eb'; X.lineWidth = 2; X.beginPath(); X.roundRect(x - w / 2, y - hh, w, hh, hh / 2); X.fill(); X.stroke(); X.beginPath(); X.moveTo(x - 5, y - 1); X.lineTo(x, y + 7); X.lineTo(x + 5, y - 1); X.fill(); X.fillStyle = '#111827'; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(e.dice.txt, x, y - hh / 2 + 1, w - 8); X.textBaseline = 'alphabetic'; X.globalAlpha = 1; }
    let G3 = null; const K0 = k; try { asientos.forEach(a => precargar([...a.mano, ...a.cola])); } catch (e) {}
    if (window.GLORY3D && LS.get('gb3d') !== '0') { try { const su = document.createElement('canvas'); su.width = 576; su.height = 1024; pintarArena(su.getContext('2d'), 576, 1024, 32, mundoI, variante, 1, true); G3 = GLORY3D.crear({ W, H, dpr, mundoI, voltear, CARTA, suelo: su, sprite: cid => { if (SPR[cid] === undefined) precargar([cid]); return SPR[cid] || null; }, calidad: LS.get('gb3dq') === '0' ? 0 : 1 }); } catch (er) { console.warn('3D no disponible', er); G3 = null; } }
    const scr = (x, y, h = 0) => G3 ? G3.proj(x, y, h) : [x * k, vy(y) * k - h * k * .6, k];
    function overlay3D(e, tm, tt) {
      const alto = (e.aire ? 2.1 : 0) + (G3.altoDe(e) || Math.max(.55, e.r * 2.1) * (e.card?.tipo === 'estructura' ? 1.6 : 1.15)) + .15, [x, y, kk] = scr(e.x, e.y, alto), [, yp] = scr(e.x, e.y, 0), [, ym] = scr(e.x, e.y, alto / 2);
      X.save(); X.strokeStyle = GA.EQ[tm].c; X.shadowColor = GA.EQ[tm].c; X.shadowBlur = 8; X.lineWidth = 2; X.globalAlpha = .8; X.beginPath(); X.ellipse(x, yp, kk * e.r * .95, kk * e.r * .5, 0, 0, 7); X.stroke(); X.restore();
      if (e.card?.id === 'glory_brown') GA.brillo(X, x, ym, kk * 1.7, '#fde047', .22 + .1 * Math.sin(tt * 3));
      if (e.flash > 0) GA.brillo(X, x, ym, kk * e.r * 1.4, '#ffffff', .55);
      if (e.buf?.lento > 0 || e.buf?.aturdido > 0) { X.fillStyle = 'rgba(165,243,252,.3)'; X.beginPath(); X.ellipse(x, ym, kk * e.r * 1.1, kk * e.r * 1.4, 0, 0, 7); X.fill(); }
      if (e.buf?.red > 0 || e.buf?.escudo > 0) { X.save(); X.strokeStyle = '#93c5fd'; X.shadowColor = '#3b82f6'; X.shadowBlur = 10; X.lineWidth = 2; X.globalAlpha = .7; X.beginPath(); X.ellipse(x, ym, kk * e.r * 1.3, kk * e.r * 1.6, 0, 0, 7); X.stroke(); X.restore(); }
      if (e.buf?.furia > 0) GA.brillo(X, x, ym, kk * e.r * 1.4, '#ef4444', .3);
      if (e.hp < e.max) { const w = Math.max(22, kk * e.r * 1.6), yb = y - 6; X.fillStyle = 'rgba(0,0,0,.7)'; X.beginPath(); X.roundRect(x - w / 2 - 1, yb - 1, w + 2, 6, 3); X.fill(); X.fillStyle = GA.lin(X, 0, yb, 0, yb + 4, [GA.EQ[tm].luz, GA.EQ[tm].c]); X.beginPath(); X.roundRect(x - w / 2, yb, w * Math.max(0, e.hp) / e.max, 4, 2); X.fill(); }
      globo(e, x, y - 12);
    }
    function barraTorre3D(e) {
      if (e.hp <= 0) return; const tm = vt(e.team), T = GA.EQ[tm], [x, y, kk] = scr(e.x, e.y, e.rey ? 5.6 : 4.6), bw = kk * 2.4, yb = y - 8;
      if (e.hp < e.max || e.rey) { X.fillStyle = 'rgba(0,0,0,.65)'; X.beginPath(); X.roundRect(x - bw / 2 - 2, yb - 2, bw + 4, 11, 5); X.fill(); X.fillStyle = GA.lin(X, 0, yb, 0, yb + 7, [T.luz, T.c]); X.beginPath(); X.roundRect(x - bw / 2, yb, bw * Math.max(0, e.hp) / e.max, 7, 4); X.fill();
        X.font = `900 ${Math.max(9, K0 * .45)}px Figtree,sans-serif`; X.textAlign = 'center'; X.lineWidth = 3; X.strokeStyle = 'rgba(0,0,0,.8)'; const tx = Math.max(0, Math.ceil(e.hp)); X.strokeText(tx, x, yb - 4); X.fillStyle = '#fff'; X.fillText(tx, x, yb - 4); }
      if (e.rey && !e.activo) { X.font = `900 ${K0 * .6}px Figtree,sans-serif`; X.fillStyle = '#e0e7ff'; X.fillText('z z', x + kk * 1.4, yb - 14 - Math.sin(performance.now() / 500) * 3); }
      if (e.hp / e.max < .33 && Math.random() < .2) efectos.push({ tipo: 'humo', x: e.x + (Math.random() - .5), y: e.y, vx: (Math.random() - .5) * .4, vy: 0, v: 1.2, max: 1.2, r: .45, alto: 3 });
    }
    let fpsN = 0, fpsT = 0;
    function dibujar(dt) {
      const tt = performance.now() / 1000;
      for (const f of efectos) { f.v -= dt; if (f.vx) { f.x += f.vx * dt; f.y += f.vy * dt; } } efectos = efectos.filter(f => f.v > 0);
      for (const tx of textos) tx.v -= dt; textos = textos.filter(x => x.v > 0); shake = Math.max(0, shake - dt);
      for (const e of ents) { if (e.dice) e.dice.v -= dt; if (!anfitrion) { if (e.tx != null) { e.x += (e.tx - e.x) * Math.min(1, dt * 10); e.y += (e.ty - e.y) * Math.min(1, dt * 10); } e.t = (e.t || 0) + dt; e.flash = Math.max(0, (e.flash || 0) - dt); } }
      X.save(); if (shake > 0) X.translate((Math.random() - .5) * k * shake, (Math.random() - .5) * k * shake);
      if (G3) { G3.render(ents, proys, dt, tt); X.drawImage(G3.canvas, 0, 0, W, H); fpsN++; fpsT += dt; if (fpsT > 4) { if (fpsN / fpsT < 22 && LS.get('gb3dq') !== '0') LS.set('gb3dq', '0'); fpsN = fpsT = 0; } } else { X.drawImage(fondo, 0, 0, W, H); rio(tt); }
      for (const z of zonas) { const [zx, zy, zk] = scr(z.x, z.y); X.save(); X.globalAlpha = .25 + .1 * Math.sin(tt * 4); X.fillStyle = z.col || '#fff'; X.beginPath(); X.ellipse(zx, zy, z.radio * zk, z.radio * zk * (G3 ? .6 : 1), 0, 0, 7); X.fill(); X.globalAlpha = .7; X.strokeStyle = z.col || '#fff'; X.lineWidth = 2; X.setLineDash([6, 6]); X.lineDashOffset = -tt * 20; X.stroke(); X.restore(); }
      if (G3) G3.zona(sel && CARTA[sel].tipo !== 'hechizo');
      if (sel && !G3) { const C = CARTA[sel]; if (C.tipo !== 'hechizo') { X.fillStyle = 'rgba(239,68,68,.22)'; X.fillRect(0, 0, W, (RIO1 + .2) * k); if (C.tipo === 'tropa') for (const lado of [0, 1]) if (!torres(1 - miEquipo).some(e => !e.rey && (e.x < 9) === (lado === 0))) { X.fillStyle = 'rgba(255,255,255,.12)'; X.fillRect(lado * W / 2, 9 * k, W / 2, (RIO1 - 9) * k); } } else { X.strokeStyle = 'rgba(255,255,255,.4)'; X.setLineDash([6, 6]); X.strokeRect(2, 2, W - 4, H - 4); X.setLineDash([]); } }
      const orden = ents.filter(e => e.hp > 0 || e.torre).sort((a, b) => (a.aire ? 100 : 0) + vy(a.y) - ((b.aire ? 100 : 0) + vy(b.y)));
      for (const e of orden) {
        if (e.torre) { if (G3) barraTorre3D(e); else dibTorre(e); continue; }
        if (G3) { overlay3D(e, vt(e.team), tt); continue; }
        const tm = vt(e.team), x = e.x * k, yy = vy(e.y), cae = e.nace > 0 ? Math.max(0, e.nace - .5) * 2 : 0, est = e.estructura, sz0 = e.r * k * (est ? 1.6 : 1.55), y0 = yy * k - (e.aire ? k * 1.1 : 0) - cae * k * 3;
        X.fillStyle = 'rgba(0,0,0,.35)'; X.beginPath(); X.ellipse(x + sz0 * .15, yy * k + sz0 * .6, sz0 * .85 * (1 - cae * .4), sz0 * .3 * (1 - cae * .4), 0, 0, 7); X.fill();
        X.save(); X.strokeStyle = GA.EQ[tm].c; X.shadowColor = GA.EQ[tm].c; X.shadowBlur = 8; X.lineWidth = 2; X.globalAlpha = .9; X.beginPath(); X.ellipse(x, yy * k + sz0 * .6, sz0 * .8, sz0 * .28, 0, 0, 7); X.stroke(); X.restore();
        if (e.card?.id === 'glory_brown') GA.brillo(X, x, y0, sz0 * 1.6, '#fde047', .35 + .15 * Math.sin(tt * 3));
        const spr = GA.sprite(e.card, tm, e.at > 0), sz = GA.TAM * sz0 / GA.S0, mov = e.mueve > 0 || (!anfitrion && Math.abs((e.tx ?? e.x) - e.x) + Math.abs((e.ty ?? e.y) - e.y) > .02);
        const bob = est ? 0 : mov ? Math.abs(Math.sin(e.t * 9)) * -sz0 * .12 : Math.sin(e.t * 2.5) * sz0 * .03, rot = !est && mov ? Math.sin(e.t * 9) * .06 : 0, sq = e.at > 0 ? 1 + e.at * .5 : 1;
        X.save(); X.translate(x, y0 + bob); X.rotate(rot); X.scale(sq, 2 - sq);
        if (e.invis) X.globalAlpha = e.team === miEquipo ? .45 : .18; if (e.flash > 0) X.filter = 'brightness(2.2)'; if (e.buf?.aturdido > 0) X.filter = 'grayscale(.6) brightness(1.2)';
        X.drawImage(spr, -sz / 2, -sz * .56, sz, sz); X.filter = 'none'; X.globalAlpha = 1; X.restore();
        if (e.buf?.lento > 0 || e.buf?.aturdido > 0) { X.fillStyle = 'rgba(165,243,252,.35)'; X.beginPath(); X.arc(x, y0, sz0 * 1.05, 0, 7); X.fill(); }
        if (e.buf?.red > 0 || e.buf?.escudo > 0) { X.save(); X.strokeStyle = '#93c5fd'; X.shadowColor = '#3b82f6'; X.shadowBlur = 10; X.lineWidth = 2; X.globalAlpha = .7; X.beginPath(); X.arc(x, y0, sz0 * 1.15, 0, 7); X.stroke(); X.restore(); }
        if (e.buf?.furia > 0) GA.brillo(X, x, y0, sz0 * 1.2, '#ef4444', .35);
        if (e.hp < e.max) { const w = sz0 * 1.5, yb = y0 - sz0 * 1.3; X.fillStyle = 'rgba(0,0,0,.7)'; X.beginPath(); X.roundRect(x - w / 2 - 1, yb - 1, w + 2, 6, 3); X.fill(); X.fillStyle = GA.lin(X, 0, yb, 0, yb + 4, [GA.EQ[tm].luz, GA.EQ[tm].c]); X.beginPath(); X.roundRect(x - w / 2, yb, w * Math.max(0, e.hp) / e.max, 4, 2); X.fill(); }
        globo(e, x, y0 - sz0 * 1.45);
      }
      for (const p of (G3 ? [] : proys)) { const x = p.x * k, y = vy(p.y) * k;
        if (p.tipo === 'bola') { GA.brillo(X, x, y, k * (p.grande ? 1.4 : .9), p.color || '#fb923c', 1); X.fillStyle = '#fff7ed'; X.beginPath(); X.arc(x, y, k * .3, 0, 7); X.fill(); if (Math.random() < .7) efectos.push({ tipo: 'humo', x: p.x, y: p.y, vx: 0, vy: 0, v: .5, max: .7, r: .35 }); }
        else if (p.tipo === 'flecha' || p.tipo === 'virote' || p.tipo === 'pluma') { const a = Math.atan2(vy(p.tgt?.y ?? p.ty) - vy(p.y), (p.tgt?.x ?? p.tx) - p.x); X.save(); X.translate(x, y); X.rotate(a); X.fillStyle = p.tipo === 'pluma' ? '#fef3c7' : '#78350f'; X.fillRect(-k * .4, -1, k * .8, 2); X.fillStyle = '#e5e7eb'; X.beginPath(); X.moveTo(k * .45, 0); X.lineTo(k * .25, -3); X.lineTo(k * .25, 3); X.fill(); X.restore(); }
        else { const col = { magia: '#c084fc', luz: '#fde047', fuego: '#f97316', hielo: '#7dd3fc', espina: '#84cc16', viento: '#e0f2fe', rayo: '#fef08a', grito: '#e9d5ff', dorado: '#fde047', bala: '#1c1917', roca: '#78716c' }[p.tipo] || '#f97316'; if (p.tipo === 'bala' || p.tipo === 'roca') { X.fillStyle = col; X.beginPath(); X.arc(x, y, k * (p.tipo === 'roca' ? .35 : .2), 0, 7); X.fill(); } else { GA.brillo(X, x, y, k * .5, col, 1); X.fillStyle = '#fff'; X.beginPath(); X.arc(x, y, k * .12, 0, 7); X.fill(); } } }
      for (const f of efectos) { const a = f.v / f.max, [x, y, k] = f.tipo === 'emote' ? [0, 0, K0] : scr(f.x, f.y, f.alto ?? (f.tipo === 'humo' || f.tipo === 'chispa' ? .6 : .2));
        if (f.tipo === 'boom') { const R = f.r * k * (1.25 - a * .45); GA.brillo(X, x, y, R, f.c || '#fb923c', a); X.strokeStyle = `rgba(255,255,255,${a * .8})`; X.lineWidth = 3 * a; X.beginPath(); X.arc(x, y, f.r * k * (1.4 - a * .6), 0, 7); X.stroke(); if (!f.humo && f.r > 1.2) { f.humo = 1; for (let i = 0; i < 10; i++) efectos.push({ tipo: 'humo', x: f.x + (Math.random() - .5) * f.r, y: f.y + (Math.random() - .5) * f.r, vx: (Math.random() - .5) * 1.2, vy: (Math.random() - .5) * 1.2, v: 1 + Math.random() * .6, max: 1.6, r: .5 + Math.random() * .5 }); } }
        if (f.tipo === 'humo') { X.fillStyle = `rgba(60,55,50,${a * .45})`; X.beginPath(); X.arc(x, y, f.r * k * (1.6 - a * .6), 0, 7); X.fill(); }
        if (f.tipo === 'chispa') { GA.brillo(X, x, y, 5, GA.EQ[vt(f.team || 0)].luz, a); }
        if (f.tipo === 'golpe') { X.save(); X.globalCompositeOperation = 'lighter'; X.strokeStyle = `rgba(255,250,220,${a})`; X.lineWidth = 4 * a + 1; X.beginPath(); X.arc(x, y, k * .7, -1.2 + (1 - a) * 1.5, .3 + (1 - a) * 1.5); X.stroke(); X.restore(); }
        if (f.tipo === 'aparece') { X.save(); X.strokeStyle = f.reina ? '#fde047' : GA.EQ[vt(f.team)].luz; X.shadowColor = f.reina ? '#fde047' : GA.EQ[vt(f.team)].c; X.shadowBlur = 14; X.globalAlpha = a; X.lineWidth = 4 * a; X.beginPath(); X.ellipse(x, y + k * .5, k * 2 * (1 - a) + k * .4, (k * 2 * (1 - a) + k * .4) * .4, 0, 0, 7); X.stroke(); X.restore(); if (f.reina) { GA.brillo(X, x, y - k * 3 * a, k * 2, '#fde047', a); X.fillStyle = `rgba(253,224,71,${a * .5})`; X.fillRect(x - k * .6, 0, k * 1.2, y); }
          if (!f.polvo && a < .5) { f.polvo = 1; for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; efectos.push({ tipo: 'humo', x: f.x + Math.cos(an) * .6, y: f.y + .3 + Math.sin(an) * .25, vx: Math.cos(an) * 1.5, vy: Math.sin(an) * .6, v: .6, max: .9, r: .3 }); } } }
        if (f.tipo === 'hielo') { X.fillStyle = `rgba(186,230,253,${a * .5})`; X.beginPath(); X.arc(x, y, f.r * k, 0, 7); X.fill(); GA.brillo(X, x, y, f.r * k, '#e0f2fe', a * .6); }
        if (f.tipo === 'rayo') { X.save(); X.strokeStyle = `rgba(254,240,138,${a})`; X.shadowColor = '#fde047'; X.shadowBlur = 16; X.lineWidth = 4; X.beginPath(); X.moveTo(x, 0); for (let yy = 0; yy < y; yy += k * 1.2) X.lineTo(x + (Math.random() - .5) * k, yy); X.lineTo(x, y); X.stroke(); X.restore(); GA.brillo(X, x, y, k * 1.5, '#fde047', a); }
        if (f.tipo === 'cadena') { X.save(); X.strokeStyle = `rgba(254,240,138,${a})`; X.shadowColor = '#fde047'; X.shadowBlur = 10; X.lineWidth = 2.5; X.beginPath(); X.moveTo(x, y); const [x2, y2] = scr(f.x2, f.y2, .3); for (let i = 1; i < 5; i++) X.lineTo(x + (x2 - x) * i / 5 + (Math.random() - .5) * k * .6, y + (y2 - y) * i / 5 + (Math.random() - .5) * k * .6); X.lineTo(x2, y2); X.stroke(); X.restore(); }
        if (f.tipo === 'linea') { const [, y2] = scr(f.x, f.y + f.l, .2); X.save(); X.globalCompositeOperation = 'lighter'; X.fillStyle = GA.lin(X, 0, y, 0, y2, [f.c || '#fde047', 'rgba(0,0,0,0)']); X.globalAlpha = a; X.fillRect(x - f.w * k, Math.min(y, y2), f.w * k * 2, Math.abs(y2 - y)); X.restore(); }
        if (f.tipo === 'rayoD') { const [x2, y2] = scr(f.x2, f.y2, .8); X.save(); X.globalCompositeOperation = 'lighter'; X.strokeStyle = `rgba(253,224,71,${a})`; X.shadowColor = '#fde047'; X.shadowBlur = 24; X.lineWidth = k * .9 * a + 2; X.lineCap = 'round'; X.beginPath(); X.moveTo(x, y); X.lineTo(x2, y2); X.stroke(); X.strokeStyle = `rgba(255,255,255,${a})`; X.lineWidth = k * .25; X.stroke(); X.restore(); }
        if (f.tipo === 'zona' || f.tipo === 'onda') { X.save(); X.strokeStyle = f.c || '#fde047'; X.globalAlpha = a; X.lineWidth = 3; X.beginPath(); X.arc(x, y, f.r * k * (f.tipo === 'onda' ? 1.3 - a * .5 : 1), 0, 7); X.stroke(); X.restore(); }
        if (f.tipo === 'curar') { for (let i = 0; i < 5; i++) { const an = i * 1.25 + f.v, rr = f.r * k * .6, cx = x + Math.cos(an) * rr, cy = y + Math.sin(an) * rr * .6 - (1 - a) * k * 1.5; X.globalAlpha = a; X.fillStyle = f.oro ? '#fde047' : '#4ade80'; X.fillRect(cx - 2, cy - 7, 4, 14); X.fillRect(cx - 7, cy - 2, 14, 4); } X.globalAlpha = 1; GA.brillo(X, x, y, f.r * k, f.oro ? '#fde047' : '#4ade80', a * .5); }
        if (f.tipo === 'escudo') { X.save(); X.globalAlpha = a * .6; X.fillStyle = GA.lin(X, x, y - f.r * k, x, y + f.r * k, ['rgba(191,219,254,.9)', 'rgba(37,99,235,.2)']); X.beginPath(); X.arc(x, y, f.r * k, Math.PI, 0); X.fill(); X.strokeStyle = '#bfdbfe'; X.lineWidth = 3; X.stroke(); X.restore(); }
        if (f.tipo === 'corazon') { GA.brillo(X, x, y, f.r * k * (1.4 - a * .4), '#f43f5e', a * .8); X.font = `${k * 2.4 * (1.3 - a * .3)}px serif`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.globalAlpha = a; X.fillText('❤️', x, y - k * 2); X.globalAlpha = 1; X.textBaseline = 'alphabetic'; }
        if (f.tipo === 'emote') { const abajo = vt(f.team) === 0, ex = W / 2 + k * 3.5, ey = abajo ? H - k * 5.5 : k * 5.5; X.globalAlpha = Math.min(1, a * 3); X.fillStyle = '#fff'; X.beginPath(); X.roundRect(ex - k * .9, ey - k * .9, k * 1.8, k * 1.8, k * .4); X.fill(); X.font = `${k * 1.2}px serif`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(f.e, ex, ey + 2); X.textBaseline = 'alphabetic'; X.globalAlpha = 1; } }
      ambiente(dt, tt);
      for (const tx of textos) { X.globalAlpha = Math.min(1, tx.v / .3); X.font = `900 ${tx.tam}px Figtree,sans-serif`; X.textAlign = 'center'; X.lineWidth = 5; X.strokeStyle = 'rgba(30,10,40,.85)'; X.strokeText(tx.txt, tx.x, tx.y, W - 10); X.fillStyle = '#fde68a'; X.fillText(tx.txt, tx.x, tx.y, W - 10); } X.globalAlpha = 1;
      const cE = coronas[1 - miEquipo], cY = coronas[miEquipo];
      X.font = `900 ${k * .8}px Figtree,sans-serif`; X.textAlign = 'left'; X.fillStyle = '#fff'; X.lineWidth = 4; X.strokeStyle = 'rgba(0,0,0,.6)';
      X.strokeText(`👑 ${cE}`, k * .5, (RIO0 - .4) * k); X.fillText(`👑 ${cE}`, k * .5, (RIO0 - .4) * k); X.strokeText(`👑 ${cY}`, k * .5, (RIO1 + 1.2) * k); X.fillText(`👑 ${cY}`, k * .5, (RIO1 + 1.2) * k);
      X.save(); X.font = `800 ${k * .42}px Figtree,sans-serif`; X.textAlign = 'center'; X.fillStyle = 'rgba(255,255,255,.6)'; X.fillText('👑 GLORY BROWN · ' + location.host, W / 2, k * .7); X.restore();
      X.font = `800 ${k * .5}px Figtree,sans-serif`; X.textAlign = 'right'; const nom = tm => asientos.filter(a => a.team === tm).map(a => a.nombre).join(' + ');
      X.strokeText(nom(1 - miEquipo), W - k * .5, (RIO0 - .5) * k); X.fillText(nom(1 - miEquipo), W - k * .5, (RIO0 - .5) * k); X.strokeText(nom(miEquipo), W - k * .5, (RIO1 + 1.1) * k); X.fillText(nom(miEquipo), W - k * .5, (RIO1 + 1.1) * k);
      X.restore();
    }
    // ---------- Mano, elixir y toques ----------
    let manoPintada = '';
    function hud() {
      const m = yo.mana, fr = m - Math.floor(m); $('#mana').style.width = Math.floor(m) * 10 + '%'; $('#manaP').style.left = Math.floor(m) * 10 + '%'; $('#manaP').style.width = (m < 10 ? fr * 10 : 0) + '%'; $('#manaN').textContent = '💜 ' + Math.floor(m);
      const ss = Math.max(0, Math.ceil(tiempo)); $('#reloj').textContent = `${extra ? '⏱️ ' : ''}${Math.floor(ss / 60)}:${String(ss % 60).padStart(2, '0')}${!extra && tiempo <= B.dobleDesde ? ' 💜x2' : ''}`; $('#reloj').style.color = tiempo <= 30 ? '#fca5a5' : '';
      document.querySelectorAll('#mano .gb-carta').forEach(b => { const C = CARTA[b.dataset.carta]; b.style.opacity = m >= C.c ? 1 : .55; b.style.filter = m >= C.c ? '' : 'grayscale(.7)'; b.style.transform = sel === b.dataset.carta ? 'translateY(-10px) scale(1.06)' : ''; b.style.outline = sel === b.dataset.carta ? '3px solid #fde68a' : ''; });
    }
    function pintarMano() {
      manoPintada = JSON.stringify(yo.mano); if (sel && !yo.mano.includes(sel)) sel = null;
      $('#mano').innerHTML = yo.mano.map(c => cartaHTML(CARTA[c], { libre: 1, sinNueva: 1 })).join(''); pintarRetratos($('#mano'));
      const sg = $('#sig'), c0 = CARTA[yo.cola[0]]; if (c0) { if (c0.id === 'glory_brown') { const im = new Image(); im.src = '/glory/reina_mini.webp'; im.onload = () => { sg.width = 80; sg.height = 100; sg.getContext('2d').drawImage(im, 0, 0, 80, 100); }; } else if (!ponerArte(sg, c0, 40, 50)) { const r = GA.retrato(c0, 40, 50); sg.width = r.width; sg.height = r.height; sg.getContext('2d').drawImage(r, 0, 0); } }
    }
    pintarMano();
    $('#mano').onclick = e => { const b = e.target.closest('[data-carta]'); if (!b || fin) return; const c = b.dataset.carta; sel = sel === c ? null : c; FX.son('click'); hud(); };
    cv.addEventListener('pointerdown', e => {
      if (fin || !sel) return; const r = cv.getBoundingClientRect(); let x = (e.clientX - r.left) / r.width * AN, ys = (e.clientY - r.top) / r.height * AL, y = vy(ys); if (G3) { const pk = G3.pick((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H); if (!pk) return; x = Math.max(.3, Math.min(AN - .3, pk[0])); y = Math.max(.3, Math.min(AL - .3, pk[1])); ys = voltear ? AL - y : y; } const C = CARTA[sel];
      if (yo.mana < C.c) { texto('💜 Te falta elixir', W / 2, H * .62, k * .8, 1, true); FX.son('error'); return; }
      if (C.tipo !== 'hechizo') { const bolsillo = C.tipo === 'tropa' && !torres(1 - miEquipo).some(o => !o.rey && (o.x < 9) === (x < 9)) && ys >= 9; if (ys < RIO1 + .3 && !bolsillo) { texto('Despliega en tu lado del río', W / 2, H * .62, k * .7, 1, true); FX.son('error'); return; } }
      const key = sel; sel = null;
      if (!ON) { if (!M.jugar(miAsiento, key, x, y)) return; }
      else { post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'jugar', datos: { k: key, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } }).catch(() => {}); yo.mana -= C.c; efectos.push({ tipo: 'aparece', x, y, v: .6, max: .6, team: miEquipo }); }
      FX.son(C.tipo === 'hechizo' ? 'swish' : 'plantar'); FX.vibrar(12); pintarMano(); hud();
    });
    $('#emo').onclick = () => { const d = $('#emos'); d.style.display = d.style.display === 'flex' ? 'none' : 'flex'; };
    $('#emos').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; emote(miAsiento, b.dataset.e, true); $('#emos').style.display = 'none'; if (!ON && Math.random() < .5) setTimeout(() => emote(1, azar(['😂', '😡', '👍', '😭'])), 900 + Math.random() * 800); };
    $('#rend').onclick = () => { if (!fin && confirm('¿Rendirte? Perderás trofeos.')) { if (ON) { post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'rendirse' }).catch(() => {}); if (!n4) return setTimeout(() => { if (!fin) { coronas[1 - miEquipo] = 3; terminar(1 - miEquipo); } }, 3000); } if (M) { M.S.coronas[1 - miEquipo] = 3; M.terminar(1 - miEquipo); } else { coronas[1 - miEquipo] = 3; terminar(1 - miEquipo); } } };
    // ---------- Final y recompensas ----------
    function terminar(ganador, rank) {
      if (fin) return; fin = true; pararGrab();
      const gano = ganador === null ? null : ganador === miEquipo, misC = Math.min(3, coronas[miEquipo]);
      const camp = cfg.campana != null, dTr = camp || gano === null ? 0 : gano ? Math.round((28 + Math.floor(Math.random() * 6)) * (ON ? 1.2 : 1)) : -Math.min(J.trofeos, 18 + Math.floor(Math.random() * 5)), arenaAntes = arenaDe(J.trofeos);
      J.trofeos += dTr; if (gano) J.victorias++; else if (gano === false) J.derrotas++; J.coronas += misC;
      const monedas = gano ? 15 + misC * 5 + (ON ? 5 : 0) : gano === null ? 6 : 3; PERFIL.ganar(monedas);
      let cofre = null; if (gano && J.cofres.length < 4) { cofre = sortearCofre(); J.cofres.push(cofre); }
      if (camp && gano) { J.campana = J.campana || {}; J.campana[cfg.campana] = Math.max(J.campana[cfg.campana] || 0, Math.max(1, misC)); }
      const xpPase = Math.round(((gano ? 100 : gano === null ? 60 : 40) + misC * 20) * (ON ? 1.5 : 1)); pase().xp += xpPase;
      let reinaNueva = false; if (!J.reina && J.victorias >= 3) { J.reina = 1; reinaNueva = true; }
      const pts = misC * 1000 + Math.max(0, Math.round(tiempo)) * 5 + (gano ? 2000 : 0); try { PERFIL.partida('batalla', pts); } catch (e) {}
      post('/api/arcade/puntaje', { juego: 'batalla', puntos: pts, nombre: LS.get('chatNom') || 'Jugador', avatar: LS.get('chatAv') || 'a01', uid: VID }).catch(() => {});
      const arenaAhora = arenaDe(J.trofeos), subio = arenaAhora > arenaAntes; D(); PERFIL.guardar();
      FX.pararMusica?.(); if (gano) { FX.confeti(); FX.son('nivel'); } else FX.son('perder');
      FX.voz?.(subio ? `¡Nueva arena desbloqueada: ${G.arenas[arenaAhora].n}!` : gano ? '¡Victoria! ¡Gloria para el reino!' : gano === null ? '¡Empate!' : '¡Derrota! La revancha será nuestra', { forzar: true, cortar: true });
      setTimeout(() => { cerrarES(); const d = document.createElement('div'); d.className = 'gb-modal gb'; const nuevas = subio ? G.cartas.filter(c => c.arena === arenaAhora) : [];
        d.innerHTML = `<div class="box"><div class="gb-panel" style="text-align:center"><div style="font-size:3rem">${gano ? '🏆' : gano === null ? '🤝' : '💔'}</div><h2 style="font:900 2rem 'Fraunces',Georgia,serif;color:${gano ? '#fde68a' : '#fca5a5'};margin:0">${gano ? '¡VICTORIA!' : gano === null ? '¡EMPATE!' : 'DERROTA'}</h2>
          <div style="font-size:2rem;letter-spacing:4px">${'👑'.repeat(misC)}<span style="opacity:.25">${'👑'.repeat(3 - misC)}</span></div>
          ${rank != null ? `<p class="gb-chip" style="color:#fde68a">🌎 Ranking en línea: ${rank} puntos</p>` : ''}<p>${camp ? `Campaña: ${'⭐'.repeat(J.campana?.[cfg.campana] || 0)}` : `🏆 ${dTr >= 0 ? '+' : ''}${dTr} trofeos (${J.trofeos})`} · +${monedas} 🪙 · +${misC} 👑 · +${xpPase} XP 🎫</p>
          ${cofre ? `<div class="gb-panel gb-shine" style="display:inline-block;padding:8px 18px"><span style="font-size:2.4rem">${COFRES[cofre].e}</span><br><b>¡Ganaste un ${COFRES[cofre].n}!</b></div>` : gano && J.cofres.length >= 4 ? '<p class="sub">Tus 4 espacios de cofres están llenos: ábrelos para ganar más.</p>' : ''}
          ${subio ? `<div class="gb-panel" style="border-color:#fde047"><b style="color:#fde68a">🗺️ ¡Nueva arena: ${escH(G.arenas[arenaAhora].n)}!</b><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px">${nuevas.map(c => cartaHTML(c)).join('')}</div></div>` : ''}
          ${reinaNueva ? `<div class="gb-panel gb-shine" style="border-color:#fde047"><img src="/glory/reina_mini.webp" style="width:80px;border-radius:50%;border:3px solid #fde047"><br><b style="color:#fde68a">👑 ¡Desbloqueaste a Glory Brown, la Reina de la Victoria!</b></div>` : ''}
          ${!PERFIL.usuario ? '<button class="gb-btn chico azul" id="crearU">👤 Crea tu usuario para guardar tu progreso</button>' : ''}
          ${grab ? '<button class="gb-btn azul gb-shine" id="vid">🎬 Compartir video de la batalla</button>' : ''}<button class="gb-btn gb-shine" id="otra">⚔️ OTRA BATALLA</button><button class="gb-btn chico azul" id="lob">🏰 Volver al reino</button><button class="gb-btn chico azul" id="comp">📣 Retar a un amigo</button></div></div>`; document.body.append(d); pintarRetratos(d);
        if (reinaNueva) setTimeout(() => presentacion('glory_brown'), 600);
        d.onclick = e => { const id = e.target.id; if (id === 'vid') return pararGrab().then(() => compartirVideo(e.target)); if (id === 'crearU') cuentaModal('crear'); if (id === 'otra') { d.remove(); FX.musica?.('batalla'); if (ON) buscar(t, cfg.modo, 'buscar'); else batalla(t, { modo: cfg.modo, campana: cfg.campana }); } if (id === 'lob') { d.remove(); lobby(t, 'batalla'); } if (id === 'comp') { d.remove(); amigo(t); } }; }, 1300);
    }
    let errores = 0;
    const bucleInt = dt => {
      if (M && !fin && !document.hidden) { M.paso(dt); sincronizar(); }
      if (ON && !fin) for (const a of asientos) a.mana = Math.min(B.manaMax, a.mana + dt / B.regen * (tiempo <= B.dobleDesde || extra ? 2 : 1) * (n4 ? .8 : 1));
      dibujar(dt); hud(); };
    const bucle = now => { if (!vivo) return; raf = requestAnimationFrame(bucle); const dt = Math.min(.05, (now - last) / 1000); last = now; try { bucleInt(dt); } catch (er) { if (++errores < 5) console.warn('GLORY BROWN:', er); } };
    texto(ON ? `⚔️ ${cfg.modo === '2v2' ? '2 vs 2' : '1 vs 1'} · nivel de torneo` : cfg.campana != null ? `🗺️ Campaña · ${arena.n}` : '⚔️ ¡A la batalla!', W / 2, H / 2, k * 1.1, 1.8); FX.musica?.('batalla'); FX.voz?.('¡Que empiece la batalla!', { forzar: true, cortar: true });
    raf = requestAnimationFrame(bucle);
    setParar(() => { vivo = false; cancelAnimationFrame(raf); document.body.classList.remove('gb-full'); try { G3?.liberar(); } catch (e) {} try { if (grab && grab.state !== 'inactive') grab.stop(); } catch (e) {} if (ON && !fin) post('/api/duelo/salir', { sala: ON.sala, tok: ON.tok }).catch(() => {}); cerrarES(); document.querySelectorAll('.gb-modal').forEach(m => m.remove()); });
    window.__batalla = { estado: () => ({ tiempo, mana: asientos.map(a => a.mana), coronas: [...coronas], ents: ents.filter(e => e.hp > 0 && !e.torre).length, torres: ents.filter(e => e.torre).map(e => [e.team, Math.round(e.hp)]), fin, anfitrion, miAsiento, ctrl: asientos.map(a => a.ctrl) }), mana: v => { yo.mana = v; }, jugar: (c, x, y) => { sel = c; const r = cv.getBoundingClientRect(), [sx, sy] = G3 ? scr(x, voltear ? AL - y : y) : [x / AN * W, y / AL * H]; cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + sx * r.width / W, clientY: r.top + sy * r.height / H, bubbles: true })); }, es3D: () => !!G3, mano: () => [...yo.mano], tiempo: v => { if (M) M.S.tiempo = v; }, poner: (tm, c, x, y) => M.desplegar(asientos.findIndex(a => a.team === tm), c, x, y) };
  }
  JUEGOS.batalla = t => lobby(t);
})();
