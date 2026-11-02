// 👑 GLORY BROWN — El Choque de los Reinos. Juego original de estrategia con cartas en tiempo real.
// Datos: /glory/cartas.js (127 cartas, 7 mundos, 21 arenas). Arte: /glory/arte.js. En homenaje a la abuelita Glory Brown.
(() => {
  const A = window.ARC_API, { JUEGOS, salir } = A, setParar = A.setParar;
  const AN = 18, AL = 32, RIO0 = 15, RIO1 = 17, PUENTES = [3.5, 14.5];
  let G = null, CARTA = {}, GA = null;
  const cargar = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });
  async function listo() { if (!window.GLORY) await cargar('/glory/cartas.js?v=1'); if (!window.GARTE) await cargar('/glory/arte.js?v=2'); G = window.GLORY; GA = window.GARTE; CARTA = Object.fromEntries(G.cartas.map(c => [c.id, c])); for (const [k, m] of Object.entries(G.minis)) CARTA['_' + k] = { id: '_' + k, n: m.n, arq: m.arq, aspecto: m.aspecto, mundo: 'sombras', m: 4, tipo: 'tropa', ...G.cartas.find(c => c.arq === m.arq && c.tipo === 'tropa'), id: '_' + k, n: m.n, aspecto: m.aspecto, hp: m.hp, dmg: m.dmg, cant: 1, hab: null, frases: null }; vocesManifest(); }
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
    .gb-tabs{position:sticky;bottom:6px;z-index:6;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;background:rgba(10,8,30,.92);backdrop-filter:blur(8px);border:2px solid rgba(252,211,77,.4);border-radius:18px;padding:5px;margin-top:10px}
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
  function pintarRetratos(raiz = document) { raiz.querySelectorAll('canvas[data-ret]').forEach(cv => { if (cv.dataset.ok) return; cv.dataset.ok = 1; const r = GA.retrato(CARTA[cv.dataset.ret], 110, 140); cv.width = r.width; cv.height = r.height; cv.getContext('2d').drawImage(r, 0, 0); }); }
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
    if (!reina) { const r = GA.retrato(c, 360, 440), cv = d.querySelector('#pret'); cv.width = r.width; cv.height = r.height; cv.getContext('2d').drawImage(r, 0, 0); }
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
    else X.drawImage(GA.retrato(c, 436, 436), 104, 184, 872, 872);
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
    const tabs = [['batalla', '⚔️', 'Batalla'], ['cartas', '🃏', 'Cartas'], ['mundos', '🗺️', 'Mundos'], ['cofres', '🎁', 'Cofres'], ['clan', '🛡️', 'Clan']];
    const cuerpo = { batalla: tabBatalla, cartas: tabCartas, mundos: tabMundos, cofres: tabCofres }[TAB] || tabBatalla;
    stage(`<div class="gb">${cuerpo(J)}<nav class="gb-tabs">${tabs.map(([k, e, n]) => `<button data-tab="${k}" class="${TAB === k ? 'on' : ''}"><span>${e}</span>${n}${k === 'cofres' && (J.cofres.length || cofreGratisListo(J)) ? ' 🔴' : ''}</button>`).join('')}</nav></div>`);
    pintarRetratos();
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
      <div class="gb-panel gb-shine" style="text-align:center;background:linear-gradient(180deg,${M.pal[2]},#0f0c29);border-color:${M.pal[0]}"><small style="letter-spacing:2px;color:${M.pal[1]}">ARENA ${ai + 1} DE 21 · ${M.e} ${escH(M.n).toUpperCase()}</small><h2 style="margin:4px 0;font:900 1.5rem 'Fraunces',Georgia,serif;color:#fff">${escH(Ar.n)}</h2>
        <div class="prog" style="margin:8px 0 2px"><i style="width:${pct}%;background:linear-gradient(90deg,${M.pal[0]},#fff)"></i></div><small>${sig ? `${sig.trofeos - J.trofeos} 🏆 para ${escH(sig.n)}` : '¡Llegaste a la arena legendaria!'}</small>
        <button class="gb-btn gb-shine" id="m_1v1" style="font-size:1.45rem;margin-top:12px">⚔️ BATALLA EN LÍNEA</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><button class="gb-btn chico azul" id="m_2v2">👥 2 vs 2 en línea</button><button class="gb-btn chico azul" id="m_ia">🤖 Contra la máquina</button><button class="gb-btn chico azul" id="m_amigo">🤝 Con un amigo</button><button class="gb-btn chico azul" id="m_ia2">👥 2 vs 2 con bots</button></div></div>
      <div class="gb-panel"><b>🃏 Tu mazo</b> <small style="opacity:.8">· coste medio 💜 ${(J.mazo.reduce((a, k) => a + CARTA[k].c, 0) / 8).toFixed(1)}</small><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">${J.mazo.map(k => cartaHTML(CARTA[k])).join('')}</div></div>
      <p class="sub" style="text-align:center">${J.victorias} victorias · ${J.derrotas} derrotas</p>`;
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
  function pintarArena(F, W, H, k, mundo, variante, dpr) {
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
    for (const bx of PUENTES) { const x0 = (bx - 1.35) * k, y0 = (RIO0 - .5) * k, w = 2.7 * k, h = (RIO1 - RIO0 + 1) * k; F.fillStyle = 'rgba(0,0,0,.35)'; F.fillRect(x0 + 4, y0 + 6, w, h); F.fillStyle = lin(F, x0, 0, x0 + w, 0, [PU[0], PU[1], PU[0]]); F.fillRect(x0, y0, w, h);
      F.strokeStyle = 'rgba(30,25,20,.5)'; F.lineWidth = 1; for (let yy = y0; yy < y0 + h; yy += k * .4) { F.beginPath(); F.moveTo(x0, yy); F.lineTo(x0 + w, yy); F.stroke(); }
      for (const sx of [x0 - k * .12, x0 + w - k * .2]) { F.fillStyle = lin(F, sx, 0, sx + k * .32, 0, [PU[0], PU[2], PU[0]]); F.fillRect(sx, y0 - k * .1, k * .32, h + k * .2); F.strokeStyle = 'rgba(20,15,10,.8)'; F.lineWidth = 1.5; F.strokeRect(sx, y0 - k * .1, k * .32, h + k * .2); } }
    // decoración propia de cada mundo
    const sombra = (x, y, s) => { F.fillStyle = 'rgba(0,0,0,.3)'; F.beginPath(); F.ellipse(x + s * .3, y + s * .5, s * 1.1, s * .45, 0, 0, 7); F.fill(); };
    const copa = (x, y, s, cols) => { sombra(x, y, s); for (const [dx, dy, rr, c] of [[0, 0, 1, cols[0]], [-.35, -.2, .7, cols[1]], [.3, -.25, .65, cols[2]], [0, -.45, .6, cols[3]]]) { const g = F.createRadialGradient(x + dx * s - rr * s * .3, y + dy * s - rr * s * .3, 0, x + dx * s, y + dy * s, rr * s); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,.85)'); F.fillStyle = g; F.beginPath(); F.arc(x + dx * s, y + dy * s, rr * s, 0, 7); F.fill(); } };
    const pico = (x, y, s, c1, c2) => { sombra(x, y, s * .8); F.beginPath(); F.moveTo(x - s * .5, y + s * .4); F.lineTo(x - s * .1, y - s * 1.2); F.lineTo(x + s * .15, y - s * .3); F.lineTo(x + s * .35, y - s * .9); F.lineTo(x + s * .6, y + s * .4); F.closePath(); F.fillStyle = lin(F, x - s, y - s, x + s, y + s, [c1, c2]); F.fill(); F.strokeStyle = 'rgba(0,0,0,.4)'; F.lineWidth = 1.5; F.stroke(); };
    const sitios = [[.7, 11], [17.3, 11.5], [.8, 21], [17.2, 20.5], [.6, 2], [17.4, 2.2], [.6, 30], [17.4, 29.8], [6.5, 12.2], [11.8, 19.8], [1.2, 15.6], [16.8, 16.4], [10.2, 9.5], [7.8, 22.6]];
    sitios.forEach(([x, y], i) => { const X0 = x * k, Y0 = y * k, s = k * (i < 8 ? 1 : .5);
      if (T.prop === 'alba') { if (i < 8) copa(X0, Y0, s, ['#166534', '#15803d', '#22c55e', '#86efac']); else { F.fillStyle = '#facc15'; for (let p = 0; p < 5; p++) { F.beginPath(); F.arc(X0 + Math.cos(p * 1.26) * 3, Y0 + Math.sin(p * 1.26) * 3, 2.5, 0, 7); F.fill(); } } }
      if (T.prop === 'bosque') { if (i < 8) copa(X0, Y0, s * 1.15, ['#052e16', '#14532d', '#166534', '#22c55e']); else { F.fillStyle = '#f5ead2'; F.fillRect(X0 - 2, Y0, 4, s * .4); F.save(); F.shadowColor = '#22d3ee'; F.shadowBlur = 10; F.fillStyle = '#22d3ee'; F.beginPath(); F.arc(X0, Y0, s * .35, Math.PI, 0); F.fill(); F.restore(); } }
      if (T.prop === 'arenas') { if (i < 8) { sombra(X0, Y0, s * .6); F.strokeStyle = '#78350f'; F.lineWidth = s * .2; F.beginPath(); F.moveTo(X0, Y0 + s * .4); F.quadraticCurveTo(X0 + s * .2, Y0 - s * .3, X0, Y0 - s * .9); F.stroke(); for (let h = 0; h < 6; h++) { const a = h * 1.05; F.fillStyle = '#16a34a'; F.beginPath(); F.ellipse(X0 + Math.cos(a) * s * .45, Y0 - s * .9 + Math.sin(a) * s * .2, s * .5, s * .12, a, 0, 7); F.fill(); } } else pico(X0, Y0, s * .9, '#fcd34d', '#92400e'); }
      if (T.prop === 'cielo') { if (i < 8) { for (let n = 0; n < 4; n++) { F.fillStyle = 'rgba(255,255,255,.9)'; F.beginPath(); F.arc(X0 + (n - 1.5) * s * .5, Y0 + Math.sin(n) * s * .2, s * .55, 0, 7); F.fill(); } } else { F.save(); F.shadowColor = '#fde047'; F.shadowBlur = 12; pico(X0, Y0, s * .8, '#ffffff', '#93c5fd'); F.restore(); } }
      if (T.prop === 'sombras') { if (i < 8) { sombra(X0, Y0, s * .6); F.strokeStyle = '#1c1917'; F.lineWidth = s * .18; F.beginPath(); F.moveTo(X0, Y0 + s * .4); F.lineTo(X0, Y0 - s * .5); F.lineTo(X0 - s * .5, Y0 - s * .9); F.moveTo(X0, Y0 - s * .3); F.lineTo(X0 + s * .5, Y0 - s * .8); F.stroke(); } else { F.fillStyle = '#57534e'; F.beginPath(); F.roundRect(X0 - s * .3, Y0 - s * .5, s * .6, s * .8, [s * .3, s * .3, 0, 0]); F.fill(); F.strokeStyle = '#1c1917'; F.stroke(); F.save(); F.shadowColor = '#a855f7'; F.shadowBlur = 10; F.fillStyle = '#c084fc'; F.fillRect(X0 - 1, Y0 - s * .35, 2, s * .3); F.restore(); } }
      if (T.prop === 'hielo') { if (i < 8) { sombra(X0, Y0, s * .7); for (let n = 0; n < 3; n++) { F.beginPath(); F.moveTo(X0, Y0 - s * (1.2 - n * .35)); F.lineTo(X0 + s * (.4 + n * .15), Y0 - s * (.5 - n * .35)); F.lineTo(X0 - s * (.4 + n * .15), Y0 - s * (.5 - n * .35)); F.closePath(); F.fillStyle = n % 2 ? '#14532d' : '#166534'; F.fill(); F.fillStyle = '#fff'; F.beginPath(); F.ellipse(X0, Y0 - s * (1.05 - n * .35), s * .2, s * .07, 0, 0, 7); F.fill(); } } else pico(X0, Y0, s, '#ffffff', '#38bdf8'); }
      if (T.prop === 'dragon') { if (i < 8) { pico(X0, Y0, s * 1.1, '#57534e', '#0c0a09'); F.save(); F.shadowColor = '#f97316'; F.shadowBlur = 14; F.strokeStyle = '#f97316'; F.lineWidth = 2; F.beginPath(); F.moveTo(X0 - s * .1, Y0 - s * .9); F.lineTo(X0, Y0 - s * .2); F.stroke(); F.restore(); } else { F.strokeStyle = '#e7e5e4'; F.lineWidth = 3; F.beginPath(); F.arc(X0, Y0, s * .4, Math.PI * 1.1, Math.PI * 1.9); F.stroke(); } }
    });
    const muro = (y0, y1) => { F.fillStyle = lin(F, 0, 0, k * .35, 0, [T.borde[0], T.borde[1]]); F.fillRect(0, y0, k * .35, y1 - y0); F.fillStyle = lin(F, W - k * .35, 0, W, 0, [T.borde[1], T.borde[0]]); F.fillRect(W - k * .35, y0, k * .35, y1 - y0); };
    muro(0, RIO0 * k); muro(RIO1 * k, H);
    if (variante === 1) { F.fillStyle = 'rgba(255,130,60,.12)'; F.fillRect(0, 0, W, H); } if (variante === 2) { F.fillStyle = 'rgba(30,10,80,.22)'; F.fillRect(0, 0, W, H); }
    const vg = F.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); F.fillStyle = vg; F.fillRect(0, 0, W, H);
  }
  // ---------- La batalla ----------
  // cfg: { modo: '1v1'|'2v2', online?, campana?: índice de arena }. El asiento 0 simula; en línea los demás reciben el estado.
  function batalla(t, cfg = { modo: '1v1' }) {
    salir(); scrollTo(0, 0); $('#stage').onclick = null; estilos();
    if (!G) return listo().then(() => batalla(t, cfg));
    const J = D(), B = G.balance, dpr = Math.min(2, devicePixelRatio || 1), ON = cfg.online || null, n4 = cfg.modo === '2v2';
    const miAsiento = ON ? ON.asiento : 0, equipoDe = a => n4 ? (a < 2 ? 0 : 1) : a, miEquipo = equipoDe(miAsiento), anfitrion = !ON || miAsiento === 0, voltear = miEquipo === 1;
    const arenaI = cfg.campana ?? (ON ? arenaDe(ON.jugadores?.[0]?.trofeos || 0) : arenaDe(J.trofeos)), arena = G.arenas[arenaI], mundoI = arena.mundo, variante = arenaI % 3;
    const ancho = Math.min(($('#stage').clientWidth || 360) - 12, 460), k = Math.max(14, Math.min(ancho / AN, (innerHeight - 215) / AL)), W = AN * k, H = AL * k;
    const nivIA = Math.min(10, 1 + Math.floor((cfg.campana ?? arenaDe(J.trofeos)) / 2));
    const baraja = l => [...l].sort(() => Math.random() - .5);
    const mazoBot = () => { const pool = G.cartas.filter(c => c.id !== 'glory_brown' && c.arena <= Math.max(arenaI, 2) && (cfg.campana == null || c.m === mundoI || c.arena <= arenaI)); const t1 = pool.filter(c => ['gigante', 'golem', 'titan', 'jinete'].includes(c.arq)), t2 = pool.filter(c => c.tipo === 'hechizo'), t3 = pool.filter(c => c.tipo === 'tropa' && !t1.includes(c)); const m = [...baraja(t1).slice(0, 2), ...baraja(t2).slice(0, 2), ...baraja(t3)].slice(0, 8).map(c => c.id); while (m.length < 8) m.push(MAZO_INICIAL[m.length]); return m; };
    const asientos = [...Array(n4 ? 4 : 2).keys()].map(a => {
      const jo = ON?.jugadores.find(j => j.asiento === a), local = a === miAsiento, ia = ON ? (!jo || jo.bot) : !local;
      let mazo = local ? [...J.mazo] : jo && !jo.bot && jo.mazo?.length === 8 ? jo.mazo.filter(c => CARTA[c]) : mazoBot(); while (mazo.length < 8) mazo.push(MAZO_INICIAL[mazo.length]); mazo = baraja(mazo);
      const niv = local ? Object.fromEntries(Object.entries(J.cartas).map(([k2, v]) => [k2, v.nv])) : jo && !jo.bot ? (jo.niveles || {}) : Object.fromEntries(G.cartas.map(c => [c.id, nivIA]));
      return { a, team: equipoDe(a), ctrl: local ? 'local' : ia ? 'ia' : 'remoto', mana: B.manaInicial, mano: mazo.slice(0, 4), cola: mazo.slice(4), niv, nombre: jo ? jo.nombre : local ? (LS.get('chatNom') || 'Tú') : cfg.campana != null ? `Guardián de ${arena.n.split(' ').slice(-1)[0]}` : ['Bot Kira', 'Bot Toro', 'Bot Luna', 'Bot Rayo'][a], iaT: 2 + a * .7 };
    });
    const yo = asientos[miAsiento];
    stage(`<div class="gb" style="user-select:none;-webkit-user-select:none"><div class="gb-panel" style="padding:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px"><button class="gb-btn chico azul" id="rend" style="width:auto;margin:0;padding:4px 9px;font-size:.8rem">🏳️</button><div style="text-align:center"><b id="reloj" style="font-size:1.15rem">3:00</b><br><small style="opacity:.8;font-size:.62rem">${G.mundos[mundoI].e} ${escH(arena.n)}</small></div><span style="display:flex;gap:2px;align-items:center">${FX.botones ? FX.botones() : ''}<button class="gb-btn chico azul" id="emo" style="width:auto;margin:0;padding:4px 9px">😀</button></span></div>
      <canvas id="cv" width="${W * dpr}" height="${H * dpr}" style="width:${W}px;height:${H}px;display:block;margin:0 auto;border-radius:14px;touch-action:none;border:2px solid rgba(252,211,77,.5)"></canvas>
      <div id="emos" style="display:none;justify-content:center;gap:10px;padding:4px">${['😂', '👍', '😡', '😭', '😎', '👏'].map(e => `<button data-e="${e}" style="background:none;border:0;font-size:1.6rem;cursor:pointer">${e}</button>`).join('')}</div>
      <div style="display:flex;gap:6px;align-items:flex-end;margin-top:6px"><div style="text-align:center;width:44px"><small style="font-size:.6rem;opacity:.8">Sigue</small><canvas id="sig" style="width:40px;height:50px;display:block;margin:0 auto;opacity:.8;border-radius:6px"></canvas></div><div id="mano" style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:5px"></div></div>
      <div style="position:relative;height:22px;margin-top:6px;border-radius:11px;background:rgba(0,0,0,.5);overflow:hidden;border:1px solid #d946ef88"><i id="mana" style="position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#86198f,#d946ef,#f5d0fe);width:0%;box-shadow:0 0 12px #d946ef"></i><i id="manaP" style="position:absolute;top:0;bottom:0;background:rgba(245,208,254,.35);width:0%"></i><div style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(10,1fr)">${'<span style="border-right:1px solid rgba(255,255,255,.25)"></span>'.repeat(10)}</div><b id="manaN" style="position:absolute;left:8px;top:0;font-size:.9rem;line-height:22px;text-shadow:0 1px 2px #000">💜 5</b></div></div></div>`);
    const cv = $('#cv'), X = cv.getContext('2d'); X.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fondo = document.createElement('canvas'); fondo.width = W * dpr; fondo.height = H * dpr; pintarArena(fondo.getContext('2d'), W, H, k, mundoI, variante, dpr);
    let ents = [], proys = [], efectos = [], textos = [], zonas = [], uid = 0, tiempo = B.duracion, extra = false, fin = false, vivo = true, raf, last = performance.now(), sel = null, coronas = [0, 0], iaEmoT = 10, shake = 0, envT = 0, charlaT = 3;
    let nuevos = { fx: [], son: [], tx: [], ha: [] };
    const son = tipo => { FX.son(tipo); if (ON && anfitrion) nuevos.son.push(tipo); };
    const efecto = f => { efectos.push(f); if (ON && anfitrion) nuevos.fx.push(f); };
    const texto = (txt, x, y, tam, dur, solo) => { textos.push({ txt, x, y, tam, v: dur, max: dur }); if (ON && anfitrion && !solo) nuevos.tx.push([txt, tam / k, dur]); };
    // Habla de un personaje (globo + voz). En línea se reenvía a todos.
    function habla(e, clave, i, forzar) { if (!e || !e.card || e.hp <= 0) return; const txt = decir(e.card, clave, i, forzar); if (txt) { e.dice = { txt, v: 2.2 }; if (ON && anfitrion) nuevos.ha.push([e.id, clave, i ?? 0]); } }
    const torre = (team, x, y, rey) => { const tb = rey ? B.rey : B.torre, hp = tb.vida * (n4 ? 1.35 : 1); ents.push({ id: ++uid, team, torre: 1, rey, x, y, hp, max: hp, r: rey ? 1.9 : 1.5, rango: tb.rango, dmg: tb.dmg, golpe: tb.golpe, cd: 0, activo: !rey, obj: 'todo', aAire: 1, buf: {} }); };
    torre(0, 3.5, 25.5); torre(0, 14.5, 25.5); torre(0, 9, 28.4, 1); torre(1, 3.5, 6.5); torre(1, 14.5, 6.5); torre(1, 9, 3.6, 1);
    const torres = tm => ents.filter(e => e.torre && e.team === tm && e.hp > 0);
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const vy = y => voltear ? AL - y : y, vt = tm => voltear ? 1 - tm : tm;

    // ---------- Creación de unidades y hechizos ----------
    function crearUnidad(team, card, x, y, nv, extra2 = {}) {
      const m = mult(nv || 1), e = { id: ++uid, team, card, cid: card.id, x: Math.max(.5, Math.min(AN - .5, x)), y: Math.max(.5, Math.min(AL - .5, y)), hp: card.hp * m, max: card.hp * m, dmg: (card.dmg || 0) * m, golpe: card.golpe, rango: card.rango || 1, vel: card.vel, r: card.r, obj: card.obj, aire: card.aire, aAire: card.aAire || card.aire, area: card.area, proy: card.proy, hab: card.hab, cd: .4, nace: 1, t: Math.random() * 5, at: 0, buf: {}, habT: card.hab?.cada || 0, recorrido: 0, ...extra2 };
      if (card.tipo === 'estructura') { e.estructura = 1; e.vida = card.dur || 30; }
      if (card.hab?.tipo === 'invisible') e.invis = 1;
      if (card.hab?.tipo === 'reina') e.rt = { luz: 4, rayo: 6, escudo: 8, corazon: 12 };
      ents.push(e); return e;
    }
    function desplegar(as, key, x, y) {
      const card = CARTA[key], nv = as.niv[key] || 1, team = as.team;
      if (card.tipo === 'hechizo') return hechizo(team, card, x, y, mult(nv));
      const n = card.cant || 1; let primera = null;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, d = n > 1 ? .55 + n * .08 : 0; const e = crearUnidad(team, card, x + Math.cos(a) * d, y + Math.sin(a) * d, nv); primera = primera || e; }
      efecto({ tipo: 'aparece', x, y, v: .6, max: .6, team, reina: key === 'glory_brown' });
      if (key === 'glory_brown') { texto('👑 ¡GLORY BROWN ENTRA A LA BATALLA!', W / 2, H * .45, k * .75, 2.4); son('nivel'); setTimeout(() => habla(primera, 'aparece', null, true), 300); }
      else if (Math.random() < .6) setTimeout(() => habla(primera, 'aparece'), 450);
    }
    function hechizo(team, c, x, y, m) {
      const enemigos = () => ents.filter(e => e.team !== team && e.hp > 0), aliados = () => ents.filter(e => e.team === team && e.hp > 0 && !e.torre), en = (e, r) => Math.hypot(e.x - x, e.y - y) < r + (e.torre ? e.r : 0);
      const col = c.color || '#fde047'; son('swish');
      switch (c.arq) {
        case 'bola': case 'meteoro': { const rey = torres(team).find(e => e.rey) || { x: 9, y: team ? 3.6 : 28.4 }; proys.push({ x: c.arq === 'meteoro' ? x : rey.x, y: c.arq === 'meteoro' ? y - 12 * (team ? -1 : 1) : rey.y, tx: x, ty: y, v: c.arq === 'meteoro' ? 10 : 13, tipo: 'bola', team, dmg: c.dmg * m, radio: c.radio, color: col, grande: c.arq === 'meteoro' }); break; }
        case 'congelar': for (const e of enemigos()) if (en(e, c.radio)) { e.buf.aturdido = (c.dur || 4) * (e.torre ? .6 : 1); herir(e, (c.dmg || 0) * m); } efecto({ tipo: 'hielo', x, y, r: c.radio, v: 1, max: 1, c: col }); son('hielo'); break;
        case 'rayo': { const obj = enemigos().filter(e => en(e, c.radio)).sort((a, b) => b.hp - a.hp).slice(0, c.objetivos || 3); for (const e of obj) { herir(e, c.dmg * m * (e.torre ? .35 : 1)); efecto({ tipo: 'rayo', x: e.x, y: e.y, v: .5, max: .5 }); } shake = .3; son('explosion'); break; }
        case 'linea': { const dir = team ? 1 : -1; for (const e of enemigos()) if (Math.abs(e.x - x) < (c.ancho || 1.2) + e.r * .5 && (e.y - y) * dir >= -.5 && (e.y - y) * dir <= (c.largo || 9)) herir(e, c.dmg * m * (e.torre ? .35 : 1)); efecto({ tipo: 'linea', x, y, l: (c.largo || 9) * dir, w: c.ancho || 1.2, v: .6, max: .6, c: col }); son('swish'); break; }
        case 'cura': case 'veneno': case 'furia': case 'tornado': zonas.push({ tipo: c.arq, team, x, y, radio: c.radio, hasta: tiempo - (c.dur || 4), valor: (c.valor || c.dmg || 0) * m, pct: c.pct || 40, col, tick: 0 }); efecto({ tipo: 'zona', x, y, r: c.radio, v: Math.min(8, c.dur || 4), max: Math.min(8, c.dur || 4), c: col }); son(c.arq === 'cura' ? 'ganar' : 'hielo'); break;
        case 'empuje': for (const e of enemigos()) if (!e.torre && en(e, c.radio)) { const a = Math.atan2(e.y - y, e.x - x); e.x += Math.cos(a) * 2.2; e.y += Math.sin(a) * 2.2; herir(e, c.dmg * m); } efecto({ tipo: 'onda', x, y, r: c.radio, v: .5, max: .5, c: col }); son('swish'); break;
        case 'escudo': for (const e of aliados()) if (en(e, c.radio)) { e.buf.escudo = (c.valor || 400) * m; e.buf.escudoT = c.dur || 8; } efecto({ tipo: 'escudo', x, y, r: c.radio, v: 1, max: 1 }); son('nivel'); break;
        case 'invoca': { const mini = CARTA['_' + (c.unidad || 'esbirro')]; for (let i = 0; i < (c.cantidad || 4); i++) { const a = i / 4 * Math.PI * 2; crearUnidad(team, mini, x + Math.cos(a) * .8, y + Math.sin(a) * .8, Math.round(m * 10 - 9)); } efecto({ tipo: 'onda', x, y, r: 1.6, v: .6, max: .6, c: '#7c3aed' }); son('jefe'); break; }
        case 'drenar': { let tot = 0; for (const e of enemigos()) if (en(e, c.radio)) { const d = c.dmg * m * (e.torre ? .35 : 1); herir(e, d); tot += d; } for (const e of aliados()) if (en(e, c.radio + 1.5)) e.hp = Math.min(e.max, e.hp + tot * .5); efecto({ tipo: 'zona', x, y, r: c.radio, v: .8, max: .8, c: col }); son('splat'); break; }
      }
    }
    function herir(e, d, de) {
      if (e.hp <= 0 || d <= 0) return;
      if (!e.torre) { const prot = ents.find(a => a.team === e.team && a.hp > 0 && a.hab?.tipo === 'escudo_aura' && dist(a, e) < a.hab.radio); if (prot) d *= 1 - prot.hab.red / 100; if (e.buf.red) d *= .6; if (e.buf.escudo > 0) { const ab = Math.min(e.buf.escudo, d); e.buf.escudo -= ab; d -= ab; } }
      e.hp -= d; e.flash = .15;
      if (e.torre && e.rey && !e.activo) { e.activo = true; if (e.team === miEquipo) FX.voz?.('¡La reina despierta! ¡Defiendan el castillo!', { tono: .9 }); }
      if (e.hp <= 0) morir(e, de);
    }
    function morir(e, de) {
      if (e.torre) {
        coronas[1 - e.team] += e.rey ? 3 - coronas[1 - e.team] : 1; shake = .7; son('explosion'); FX.vibrar([80, 50, 120]);
        efecto({ tipo: 'boom', x: e.x, y: e.y, v: .9, max: .9, r: 3.2 });
        const rey = ents.find(x => x.torre && x.rey && x.team === e.team); if (rey) rey.activo = true;
        textoEquipo(e.team, '😱 ¡Perdimos una torre!', '👑 ¡Torre destruida!');
        if (e.rey || coronas[0] >= 3 || coronas[1] >= 3 || extra) terminar();
        return;
      }
      for (let i = 0; i < 8; i++) efectos.push({ tipo: 'chispa', x: e.x, y: e.y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, v: .5, max: .5, team: e.team });
      son('pop'); if (e.card?.frases && Math.random() < .3) habla(e, 'muere');
      const h = e.hab;
      if (h?.tipo === 'explota') { for (const o of ents) if (o.team !== e.team && o.hp > 0 && dist(o, e) < h.radio + o.r * .5) herir(o, h.dmg); efecto({ tipo: 'boom', x: e.x, y: e.y, v: .5, max: .5, r: h.radio }); son('explosion'); }
      if (h?.tipo === 'divide') { const mini = CARTA['_' + h.unidad]; for (let i = 0; i < h.n; i++) crearUnidad(e.team, mini, e.x + (i - (h.n - 1) / 2) * .9, e.y, 1, { nace: .2 }); }
      if (h?.tipo === 'revive' && !e.revivio) { const n = crearUnidad(e.team, e.card, e.x, e.y, 1, { revivio: 1, nace: 1.2 }); n.hp = n.max * .5; efecto({ tipo: 'aparece', x: e.x, y: e.y, v: 1, max: 1, team: e.team }); texto('🔥 ¡Renace!', e.x * k, vy(e.y) * k - k, k * .6, 1.2); }
      if (e.card?.id === 'glory_brown') { texto('👑 Su luz nunca se apagará', W / 2, H / 2, k * .8, 2.5); efecto({ tipo: 'zona', x: e.x, y: e.y, r: 3, v: 2, max: 2, c: '#fde047' }); }
    }
    function textoEquipo(teamAfectado, txtAfectado, txtOtro) { texto(teamAfectado === miEquipo ? txtAfectado : txtOtro, W / 2, H / 2, k * 1.1, 1.8, true); if (ON && anfitrion) nuevos.tx.push(['@' + teamAfectado + '|' + txtAfectado + '|' + txtOtro, 1.1, 1.8]); if (teamAfectado !== miEquipo) FX.voz?.('¡Torre destruida! ¡Bien hecho!', { forzar: true }); else FX.voz?.('¡Cuidado! Perdimos una torre', { forzar: true, tono: .9 }); }
    function objetivo(u) {
      let mejor = null, md = 1e9; const vista = u.hab?.tipo === 'asesino' || u.hab?.tipo === 'invisible' ? 7 : 5.5;
      const prov = ents.find(e => e.team !== u.team && e.hp > 0 && e.hab?.tipo === 'provoca' && dist(u, e) < e.hab.radio && !u.aire); if (prov && u.obj !== 'edif') return prov;
      for (const e of ents) { if (e.team === u.team || e.hp <= 0 || e.nace > 0 || e.invis) continue; if (u.obj === 'edif' && !e.torre && !e.estructura) continue; if (e.aire && !u.aAire) continue;
        const d = dist(u, e) - e.r; if (!e.torre && d > vista) continue; if (e.torre) { const mismoLado = (e.x < 9) === (u.x < 9) || e.rey; if (!mismoLado && torres(e.team).some(o => !o.rey && (o.x < 9) === (u.x < 9))) continue; }
        let pd = d + (e.torre ? 3 : 0); if (u.hab?.tipo === 'asesino' && !e.torre) pd = e.hp / 100 + d * .3; if (pd < md) { md = pd; mejor = e; } }
      return mejor;
    }
    function moverHacia(u, tx, ty, dt) {
      let px = tx, py = ty; const lado = y => y < RIO0 ? 1 : y > RIO1 ? 0 : 2;
      if (!u.aire && lado(u.y) !== lado(ty)) { const bx = Math.abs(u.x - PUENTES[0]) < Math.abs(u.x - PUENTES[1]) ? PUENTES[0] : PUENTES[1]; const ent = u.team ? RIO0 - .3 : RIO1 + .3, sal = u.team ? RIO1 + .5 : RIO0 - .5;
        if (lado(u.y) === 2 || Math.abs(u.x - bx) < .4) { px = bx; py = sal; } else { px = bx; py = ent; } }
      const lento = u.buf.lento > 0 ? .5 : 1, furia = u.buf.furia > 0 ? 1.4 : 1;
      const dx = px - u.x, dy = py - u.y, d = Math.hypot(dx, dy) || 1, v = u.vel * lento * furia * dt; const mv = Math.min(v, d); u.x += dx / d * mv; u.y += dy / d * mv; u.recorrido += mv; u.mueve = .15;
    }
    function paso(dt) {
      tiempo -= dt; const doble = tiempo <= B.dobleDesde || extra;
      for (const as of asientos) as.mana = Math.min(B.manaMax, as.mana + dt / B.regen * (doble ? 2 : 1) * (n4 ? .8 : 1) * (as.ctrl === 'ia' && !ON && as.team !== miEquipo ? 1 + arenaI * .01 : 1));
      if (tiempo <= 0) { if (!extra && coronas[0] === coronas[1]) { extra = true; tiempo = B.extra; texto('⏱️ ¡Tiempo extra! La siguiente torre gana', W / 2, H / 2, k * .8, 2.2); son('sirena'); FX.intensidad?.(2); FX.voz?.('¡Tiempo extra!', { forzar: true }); } else return terminar(); }
      if (!extra && tiempo <= B.dobleDesde && tiempo + dt > B.dobleDesde) { texto('💜 ¡Elixir doble!', W / 2, H / 2, k, 1.8); son('combo'); FX.intensidad?.(2); FX.voz?.('¡Elixir doble!', { forzar: true }); }
      // zonas de hechizos
      for (const z of zonas) { z.tick -= dt; if (z.tick > 0) continue; z.tick = .5;
        for (const e of ents) { if (e.hp <= 0 || Math.hypot(e.x - z.x, e.y - z.y) > z.radio + (e.torre ? e.r : 0)) continue;
          if (z.tipo === 'cura' && e.team === z.team && !e.torre) e.hp = Math.min(e.max, e.hp + z.valor * .5);
          if (z.tipo === 'veneno' && e.team !== z.team) { herir(e, z.valor * .5 * (e.torre ? .35 : 1)); if (!e.torre) e.buf.lento = .6; }
          if (z.tipo === 'furia' && e.team === z.team && !e.torre) e.buf.furia = .6;
          if (z.tipo === 'tornado' && e.team !== z.team && !e.torre) { const a = Math.atan2(z.y - e.y, z.x - e.x); e.x += Math.cos(a) * .5; e.y += Math.sin(a) * .5; herir(e, z.valor * .25); } } }
      zonas = zonas.filter(z => tiempo > z.hasta);
      for (const u of ents) {
        if (u.hp <= 0) continue; u.t = (u.t || 0) + dt; u.flash = Math.max(0, (u.flash || 0) - dt); u.at = Math.max(0, (u.at || 0) - dt); u.mueve = Math.max(0, (u.mueve || 0) - dt);
        const bf = u.buf; for (const kk of ['lento', 'furia', 'red', 'aturdido', 'escudoT']) if (bf[kk] > 0) bf[kk] -= dt; if (bf.escudoT <= 0) bf.escudo = 0;
        if (bf.dot && bf.dot.hasta > 0) { bf.dot.hasta -= dt; herir(u, bf.dot.dps * dt); if (u.hp <= 0) continue; }
        if (u.estructura) { u.hp -= u.max / u.vida * dt; if (u.hp <= 0) { morir(u); continue; } }
        if (u.nace > 0) { u.nace -= dt; if (u.nace <= 0 && u.hab?.tipo === 'rugido') { for (const o of ents) if (o.team !== u.team && o.hp > 0 && !o.torre && dist(o, u) < u.hab.radio) o.buf.aturdido = u.hab.dur; efecto({ tipo: 'onda', x: u.x, y: u.y, r: u.hab.radio, v: .6, max: .6, c: '#fde047' }); son('jefe'); shake = .3; } continue; }
        if (bf.aturdido > 0) continue;
        if (u.torre && !u.activo) continue;
        habilidades(u, dt);
        if (!u.dmg || (u.golpe >= 99)) continue;
        if (!u.tgt || u.tgt.hp <= 0 || u.tgt.invis || (!u.torre && !u.tgt.torre && dist(u, u.tgt) > 7.5) || ((u.torre || u.estructura) && dist(u, u.tgt) - u.tgt.r > u.rango)) {
          const ant = u.tgt; u.tgt = (u.torre || u.estructura) ? (() => { let m = null, md = 1e9; for (const e of ents) if (e.team !== u.team && e.hp > 0 && !e.torre && !(e.nace > 0) && !e.invis && (!e.aire || u.aAire)) { const d = dist(u, e) - e.r; if (d <= u.rango && d < md && !(u.card?.arq === 'mortero' && d < 3.5)) { md = d; m = e; } } return m; })() : objetivo(u);
          // diálogo: al encontrar un rival, se provocan entre sí
          if (u.tgt && u.tgt !== ant && !u.tgt.torre && u.card?.frases && u.tgt.card?.frases && charlaT <= 0) { charlaT = 4 + Math.random() * 3; const yo2 = u, el = u.tgt; habla(yo2, 'ataque'); setTimeout(() => { if (el.hp > 0 && yo2.hp > 0) habla(el, 'resp', null, true); }, 1400); }
        }
        const tg = u.tgt; if (!tg) continue;
        const d = dist(u, tg) - tg.r - (u.torre ? 0 : u.r * .3);
        if (d <= u.rango) { u.cd -= dt * (bf.furia > 0 ? 1.4 : 1); if (u.cd <= 0) { u.cd = u.golpe; u.at = .25; if (u.invis) u.invis = 0; atacar(u, tg); } }
        else if (!u.torre && !u.estructura) { u.cd = Math.min(u.cd, u.golpe * .5); moverHacia(u, tg.x, tg.y, dt); }
      }
      charlaT -= dt;
      const vivos = ents.filter(e => e.hp > 0);
      for (let i = 0; i < vivos.length; i++) for (let j = i + 1; j < vivos.length; j++) { const a = vivos[i], b = vivos[j]; if (!!a.aire !== !!b.aire || (a.torre && b.torre)) continue; const fa = a.torre || a.estructura, fb = b.torre || b.estructura; if (fa && fb) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, m = (a.r + b.r) * .85; if (d < m) { const p = (m - d) / 2, nx = dx / d, ny = dy / d; if (fa) { b.x += nx * p * 2; b.y += ny * p * 2; } else if (fb) { a.x -= nx * p * 2; a.y -= ny * p * 2; } else { a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; } } }
      for (const u of vivos) if (!u.torre && !u.estructura) { u.x = Math.max(.4, Math.min(AN - .4, u.x)); u.y = Math.max(.4, Math.min(AL - .4, u.y)); if (!u.aire && u.y > RIO0 - .1 && u.y < RIO1 + .1) { const bx = Math.abs(u.x - PUENTES[0]) < Math.abs(u.x - PUENTES[1]) ? PUENTES[0] : PUENTES[1]; u.x = Math.max(bx - 1, Math.min(bx + 1, u.x)); } }
      for (const p of proys) {
        if (p.tipo === 'bola') { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy); if (d < p.v * dt) { p.fin = 1; for (const e of ents) if (e.team !== p.team && e.hp > 0 && Math.hypot(e.x - p.tx, e.y - p.ty) < p.radio + (e.torre ? e.r : 0)) herir(e, e.torre ? p.dmg * .35 : p.dmg); efecto({ tipo: 'boom', x: p.tx, y: p.ty, v: .7, max: .7, r: p.radio }); son('explosion'); shake = p.grande ? .7 : .35; } else { p.x += dx / d * p.v * dt; p.y += dy / d * p.v * dt; } continue; }
        const tg = p.tgt; if (!tg || tg.hp <= 0) { p.fin = 1; continue; } const dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy); p.tx = tg.x; p.ty = tg.y;
        if (d < p.v * dt + .2) { p.fin = 1; impacto(p.de, tg, p.dmg, p.area, p.tipo); } else { p.x += dx / d * p.v * dt; p.y += dy / d * p.v * dt; }
      }
      proys = proys.filter(p => !p.fin); ents = ents.filter(e => e.hp > 0 || e.torre);
      for (const as of asientos) if (as.ctrl === 'ia') ia(as, dt);
      iaEmoT -= dt; if (iaEmoT <= 0) { iaEmoT = 14 + Math.random() * 15; const bot = asientos.find(a => a.ctrl === 'ia' && a.team !== miEquipo); if (bot && Math.random() < .5) emote(bot.a, azar(['😂', '😡', '👍', '😭', '😎']), true); }
    }
    function habilidades(u, dt) {
      const h = u.hab; if (!h) return;
      if (h.tipo === 'cura' || h.tipo === 'invoca') { u.habT -= dt; if (u.habT > 0) return; u.habT = h.cada;
        if (h.tipo === 'cura') { let alguien = false; for (const a of ents) if (a.team === u.team && a.hp > 0 && !a.torre && a !== u && dist(a, u) < h.radio && a.hp < a.max) { a.hp = Math.min(a.max, a.hp + h.valor * mult(1)); alguien = true; } if (alguien) efecto({ tipo: 'curar', x: u.x, y: u.y, r: h.radio, v: .8, max: .8 }); }
        else { const mini = CARTA['_' + h.unidad]; for (let i = 0; i < h.n; i++) crearUnidad(u.team, mini, u.x + (Math.random() - .5) * 1.4, u.y + (u.team ? 1 : -1) * (u.r + .5), 1, { nace: .3 }); efecto({ tipo: 'onda', x: u.x, y: u.y, r: 1.2, v: .4, max: .4, c: '#a855f7' }); } }
      if (h.tipo === 'carga' && u.recorrido > 2.5) u.cargado = 1;
      if (h.tipo === 'reina') { const R = u.rt, aliados = () => ents.filter(a => a.team === u.team && a.hp > 0 && !a.torre);
        for (const kk in R) R[kk] -= dt;
        if (R.luz <= 0) { R.luz = h.luz.cada; let n = 0; for (const a of aliados()) if (dist(a, u) < h.luz.radio) { a.hp = Math.min(a.max, a.hp + h.luz.valor); a.buf.dot = null; a.buf.lento = 0; a.buf.aturdido = 0; n++; } efecto({ tipo: 'curar', x: u.x, y: u.y, r: h.luz.radio, v: 1, max: 1, oro: 1 }); if (n > 1) habla(u, 'luz', 0, true); }
        if (R.rayo <= 0) { const obj = objetivo(u); if (obj) { R.rayo = h.rayo.cada; const a = Math.atan2(obj.y - u.y, obj.x - u.x); for (const e of ents) if (e.team !== u.team && e.hp > 0) { const rx = e.x - u.x, ry = e.y - u.y, along = rx * Math.cos(a) + ry * Math.sin(a), perp = Math.abs(-rx * Math.sin(a) + ry * Math.cos(a)); if (along > 0 && along < h.rayo.largo && perp < h.rayo.ancho + e.r * .5) herir(e, h.rayo.dmg * (e.torre ? .5 : 1)); } efecto({ tipo: 'rayoD', x: u.x, y: u.y, a, l: h.rayo.largo, v: .6, max: .6 }); son('explosion'); shake = .25; habla(u, 'rayo', 0, true); } }
        if (R.escudo <= 0) { R.escudo = h.escudo.cada; for (const a of aliados()) if (dist(a, u) < h.escudo.radio) a.buf.red = h.escudo.dur; efecto({ tipo: 'escudo', x: u.x, y: u.y, r: h.escudo.radio, v: 1.2, max: 1.2 }); son('nivel'); habla(u, 'escudo', 0, true); }
        if (R.corazon <= 0) { R.corazon = h.corazon.cada; for (const a of aliados()) if (dist(a, u) < h.corazon.radio) { a.buf.furia = h.corazon.dur; a.hp = Math.min(a.max, a.hp + a.max * .1); } efecto({ tipo: 'corazon', x: u.x, y: u.y, r: h.corazon.radio, v: 1.6, max: 1.6 }); texto('❤️ ¡CORAZÓN DE ABUELITA!', u.x * k, vy(u.y) * k - k * 1.5, k * .7, 2); son('combo'); FX.confeti(); habla(u, 'corazon', 0, true); } }
    }
    function atacar(u, tg) {
      if (u.proy || u.torre) { proys.push({ x: u.x, y: u.y - (u.torre ? u.r : 0), tgt: tg, tx: tg.x, ty: tg.y, v: u.torre ? 14 : 11, dmg: u.dmg, area: u.area, tipo: u.torre ? 'flecha' : u.proy, team: u.team, de: u }); if (!u.torre) son(u.card?.sfx?.ataque || 'swish'); }
      else { impacto(u, tg, u.dmg * (u.cargado ? 2 : 1), u.area, 'golpe'); if (u.cargado) { u.cargado = 0; u.recorrido = 0; efecto({ tipo: 'onda', x: tg.x, y: tg.y, r: 1.2, v: .4, max: .4, c: '#fde047' }); } efecto({ tipo: 'golpe', x: (u.x + tg.x) / 2, y: (u.y + tg.y) / 2, v: .2, max: .2 }); son(tg.torre ? 'choque' : 'splat'); }
    }
    function impacto(u, tg, dmg, area, tipo) {
      const team = u ? u.team : 1 - tg.team, lista = area ? ents.filter(e => e.team !== team && e.hp > 0 && dist(e, tg) < area + e.r * .5) : [tg];
      if (area) efecto({ tipo: 'boom', x: tg.x, y: tg.y, v: .35, max: .35, r: area, c: tipo === 'magia' || tipo === 'luz' ? '#c4b5fd' : tipo === 'hielo' ? '#bae6fd' : tipo === 'espina' ? '#a3e635' : null });
      const h = u?.hab;
      for (const e of lista) { herir(e, dmg, u); if (!h || e.torre) continue;
        if (h.tipo === 'veneno' || h.tipo === 'quema') e.buf.dot = { dps: h.dps, hasta: h.dur };
        if (h.tipo === 'congela') e.buf.lento = h.dur; if (h.tipo === 'aturde') e.buf.aturdido = h.dur;
        if (h.tipo === 'empuje') { const a = Math.atan2(e.y - u.y, e.x - u.x); e.x += Math.cos(a) * .8; e.y += Math.sin(a) * .8; } }
      if (h?.tipo === 'robo' && u.hp > 0) u.hp = Math.min(u.max, u.hp + dmg * h.pct / 100);
      if (h?.tipo === 'cadena') { let prev = tg; const vistos = new Set([tg]); for (let i = 0; i < h.saltos; i++) { const sig = ents.filter(e => e.team !== team && e.hp > 0 && !vistos.has(e) && dist(e, prev) < 4).sort((a, b) => dist(a, prev) - dist(b, prev))[0]; if (!sig) break; vistos.add(sig); herir(sig, dmg * .7, u); efecto({ tipo: 'cadena', x: prev.x, y: prev.y, x2: sig.x, y2: sig.y, v: .3, max: .3 }); prev = sig; } }
      if (tipo !== 'golpe') son('splat');
    }
    function jugarCarta(as, key, x, y) {
      const C = CARTA[key]; if (!C || !as.mano.includes(key) || as.mana < C.c || fin) return false;
      if (C.tipo !== 'hechizo') { const propio = as.team ? y <= RIO0 - .3 : y >= RIO1 + .3, bolsillo = C.tipo === 'tropa' && !torres(1 - as.team).some(o => !o.rey && (o.x < 9) === (x < 9)) && (as.team ? y <= 23 : y >= 9); if (!propio && !bolsillo) return false; }
      as.mana -= C.c; as.mano.splice(as.mano.indexOf(key), 1); as.mano.push(as.cola.shift()); as.cola.push(key);
      desplegar(as, key, Math.max(.5, Math.min(AN - .5, x)), Math.max(.5, Math.min(AL - .5, y))); return true;
    }
    // ---------- Inteligencia de los bots ----------
    function ia(as, dt) {
      as.iaT -= dt; if (as.iaT > 0) return; as.iaT = Math.max(.4, 1.1 - arenaI * .03) + Math.random() * .5 + (n4 ? .5 : 0);
      const Y = y => as.team ? y : AL - y, rel = e => as.team ? e.y : AL - e.y, enemigo = 1 - as.team, C = id => CARTA[id];
      const jugar = (key, x, yr) => jugarCarta(as, key, x, Y(C(key).tipo === 'hechizo' ? yr : Math.min(RIO0 - .5, yr)));
      const amenazas = ents.filter(e => e.team === enemigo && e.hp > 0 && !e.torre && !e.invis && rel(e) < 21);
      const hech = as.mano.filter(c => C(c).tipo === 'hechizo' && C(c).c <= as.mana && ['bola', 'meteoro', 'rayo', 'veneno', 'congelar', 'linea', 'tornado', 'drenar'].includes(C(c).arq));
      if (hech.length) { const g = ents.filter(e => e.team === enemigo && !e.torre && e.hp > 0); for (const e of g) { const cerca = g.filter(o => dist(o, e) < 2.4); if (cerca.length >= 3 || cerca.reduce((a, o) => a + o.hp, 0) > 1100) { const cx = cerca.reduce((a, o) => a + o.x, 0) / cerca.length, cy = cerca.reduce((a, o) => a + o.y, 0) / cerca.length; jugarCarta(as, hech[0], cx, cy); return; } } }
      if (amenazas.length) {
        const a = amenazas.sort((p, q) => rel(p) - rel(q))[0], volador = a.aire, enjambre = amenazas.filter(o => dist(o, a) < 2.5).length >= 3;
        const def = as.mano.filter(c => C(c).tipo !== 'hechizo' && C(c).c <= as.mana && C(c).obj !== 'edif' && (C(c).dmg > 0) && (!volador || C(c).aAire)).sort((p, q) => (enjambre ? (C(q).area ? 1 : 0) - (C(p).area ? 1 : 0) : 0) || C(q).hp - C(p).hp);
        if (def.length && rel(a) < 18) { const c = def[0], est = C(c).tipo === 'estructura'; jugar(c, est ? 9 + (a.x < 9 ? -1.5 : 1.5) : Math.max(1, Math.min(AN - 1, a.x + (Math.random() - .5) * 2)), est ? 10.5 : Math.max(1.5, Math.min(RIO0 - .5, rel(a) - (C(c).rango > 2 ? 4 : 2)))); return; }
      }
      if (as.mana >= 8.5 || (as.mana >= 6 && Math.random() < .25)) {
        const lado = (() => { const ts = torres(enemigo).filter(e => !e.rey); if (!ts.length) return Math.random() < .5 ? 0 : 1; return ts.sort((p, q) => p.hp - q.hp)[0].x < 9 ? 0 : 1; })(), bx = PUENTES[n4 && as.a % 2 ? 1 - lado : lado];
        const propios = ents.filter(e => e.team === as.team && !e.torre && !e.estructura && e.hp > 0 && Math.abs(e.x - bx) < 4);
        const tanque = as.mano.find(c => (['gigante', 'golem', 'titan', 'jinete', 'reina'].includes(C(c).arq)) && C(c).c <= as.mana);
        if (tanque && !propios.length) { jugar(tanque, bx + (Math.random() - .5), ['golem', 'titan', 'gigante'].includes(C(tanque).arq) ? 4 : RIO0 - 1); return; }
        const apoyo = as.mano.find(c => C(c).tipo === 'tropa' && C(c).c <= as.mana && !['golem', 'titan'].includes(C(c).arq)) || as.mano.find(c => C(c).tipo === 'estructura' && C(c).c <= as.mana);
        if (apoyo) { const t0 = propios[0]; if (C(apoyo).tipo === 'estructura') jugar(apoyo, 9 + (Math.random() - .5) * 4, C(apoyo).arq === 'mortero' || C(apoyo).arq === 'generador' ? 4 : 10); else jugar(apoyo, t0 ? t0.x : bx, t0 ? rel(t0) - 2 : RIO0 - 2); }
      }
    }
    function emote(asiento, e, enviarRed) { efectos.push({ tipo: 'emote', team: equipoDe(asiento), e, v: 2.5, max: 2.5, x: 0, y: 0 }); FX.son('pop'); if (ON && enviarRed) post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'emote', datos: { e, a: asiento } }).catch(() => {}); }
    // ---------- Red (en línea) ----------
    let mapa = new Map();
    function enviarEstado() {
      const r1 = v => Math.round(v * 10) / 10;
      const d = { t: r1(tiempo), x: extra ? 1 : 0, c: coronas, e: ents.map(e => [e.id, e.team, e.torre ? (e.rey ? 'R' : 'T') : e.cid, r1(e.x), r1(e.y), Math.round(e.hp), Math.round(e.max), (e.buf.aturdido > 0 ? 1 : 0) | (e.nace > 0 ? 2 : 0) | (e.at > 0 ? 4 : 0) | (e.activo ? 8 : 0) | (e.flash > 0 ? 16 : 0) | (e.invis ? 32 : 0) | (e.buf.lento > 0 ? 64 : 0) | (e.buf.red > 0 || e.buf.escudo > 0 ? 128 : 0) | (e.buf.furia > 0 ? 256 : 0) | (e.mueve > 0 ? 512 : 0)]),
        p: proys.map(p => [p.tipo, r1(p.x), r1(p.y), r1(p.tx ?? p.x), r1(p.ty ?? p.y)]), z: zonas.map(z => [z.tipo, r1(z.x), r1(z.y), z.radio, z.col]), s: asientos.map(a => [r1(a.mana), a.mano, a.cola[0]]), fx: nuevos.fx.map(f => ({ ...f })), so: nuevos.son, tx: nuevos.tx, ha: nuevos.ha };
      nuevos = { fx: [], son: [], tx: [], ha: [] };
      post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'estado', datos: d }).catch(() => {});
    }
    function aplicarEstado(d) {
      tiempo = d.t; extra = !!d.x; coronas = d.c; const vistos = new Set();
      for (const [id, team, cid, x, y, hp, max, fl] of d.e) { vistos.add(id); let e = mapa.get(id);
        if (!e) { e = { id, team, x, y, hp, max, t: Math.random() * 5, buf: {} }; if (cid === 'R' || cid === 'T') Object.assign(e, { torre: 1, rey: cid === 'R', r: cid === 'R' ? 1.9 : 1.5 }); else { const c = CARTA[cid]; Object.assign(e, { card: c, cid, r: c.r, aire: c.aire, estructura: c.tipo === 'estructura' }); } mapa.set(id, e); }
        if (hp < e.hp) e.flash = .15; e.tx = x; e.ty = y; e.hp = hp; e.max = max; e.buf.aturdido = fl & 1; e.nace = fl & 2 ? .5 : 0; e.at = fl & 4 ? .25 : 0; e.activo = !!(fl & 8); e.invis = fl & 32; e.buf.lento = fl & 64; e.buf.red = fl & 128; e.buf.furia = fl & 256; e.mueve = fl & 512 ? .15 : 0; }
      for (const [id, e] of mapa) if (!vistos.has(id) && !e.torre) { mapa.delete(id); for (let i = 0; i < 8; i++) efectos.push({ tipo: 'chispa', x: e.x, y: e.y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, v: .5, max: .5, team: e.team }); }
      ents = [...mapa.values()].filter(e => e.hp > 0 || e.torre);
      proys = d.p.map(([tipo, x, y, tx, ty]) => ({ tipo, x, y, tx, ty, tgt: { x: tx, y: ty } })); zonas = d.z.map(([tipo, x, y, radio, col]) => ({ tipo, x, y, radio, col }));
      d.s.forEach((s, i) => { asientos[i].mana = s[0]; asientos[i].mano = s[1]; asientos[i].cola = [s[2]]; });
      for (const f of d.fx) efectos.push(f); for (const s of d.so.slice(0, 6)) FX.son(s);
      for (const [txt, tam, dur] of d.tx) { if (txt[0] === '@') { const [tmA, a, b] = txt.slice(1).split('|'); texto(+tmA === miEquipo ? a : b, W / 2, H / 2, k * tam, dur, true); } else texto(txt, W / 2, H / 2, k * tam, dur, true); }
      for (const [id, clave, i] of d.ha || []) { const e = mapa.get(id); if (e?.card) { const txt = decir(e.card, clave, i, true); if (txt) e.dice = { txt, v: 2.2 }; } }
      if (JSON.stringify(yo.mano) !== manoPintada) pintarMano();
    }
    if (ON) {
      ES = ES || new EventSource(`/api/duelo/stream?sala=${ON.sala}&tok=${ON.tok}`);
      ES.addEventListener('estado', e => { if (!anfitrion) aplicarEstado(JSON.parse(e.data)); });
      ES.addEventListener('jugar', e => { if (!anfitrion) return; const d = JSON.parse(e.data), as = asientos[d.de]; if (as && as.ctrl === 'remoto') jugarCarta(as, d.k, +d.x, +d.y); });
      ES.addEventListener('emote', e => { const d = JSON.parse(e.data); if (d.de !== miAsiento) emote(d.a ?? d.de, d.e, false); });
      ES.addEventListener('salio', e => { const d = JSON.parse(e.data); if (fin) return; if (d.asiento === 0 && !anfitrion) { texto('📴 El anfitrión se desconectó', W / 2, H / 2, k * .8, 3, true); terminar(equipoDe(0) !== miEquipo ? miEquipo : null, true); return; } const as = asientos[d.asiento]; if (as) { as.ctrl = 'ia'; texto(`📴 ${d.nombre} se desconectó · un bot juega por él`, W / 2, H * .4, k * .6, 3); } });
      ES.addEventListener('fin', e => { if (anfitrion) return; const d = JSON.parse(e.data); coronas = d.c; terminar(d.g, true); });
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
    function dibujar(dt) {
      const tt = performance.now() / 1000;
      for (const f of efectos) { f.v -= dt; if (f.vx) { f.x += f.vx * dt; f.y += f.vy * dt; } } efectos = efectos.filter(f => f.v > 0);
      for (const tx of textos) tx.v -= dt; textos = textos.filter(x => x.v > 0); shake = Math.max(0, shake - dt);
      for (const e of ents) { if (e.dice) e.dice.v -= dt; if (!anfitrion) { if (e.tx != null) { e.x += (e.tx - e.x) * Math.min(1, dt * 10); e.y += (e.ty - e.y) * Math.min(1, dt * 10); } e.t = (e.t || 0) + dt; e.flash = Math.max(0, (e.flash || 0) - dt); } }
      X.save(); if (shake > 0) X.translate((Math.random() - .5) * k * shake, (Math.random() - .5) * k * shake);
      X.drawImage(fondo, 0, 0, W, H); rio(tt);
      for (const z of zonas) { const zx = z.x * k, zy = vy(z.y) * k; X.save(); X.globalAlpha = .25 + .1 * Math.sin(tt * 4); X.fillStyle = z.col || '#fff'; X.beginPath(); X.arc(zx, zy, z.radio * k, 0, 7); X.fill(); X.globalAlpha = .7; X.strokeStyle = z.col || '#fff'; X.lineWidth = 2; X.setLineDash([6, 6]); X.lineDashOffset = -tt * 20; X.stroke(); X.restore(); }
      if (sel) { const C = CARTA[sel]; if (C.tipo !== 'hechizo') { X.fillStyle = 'rgba(239,68,68,.22)'; X.fillRect(0, 0, W, (RIO1 + .2) * k); if (C.tipo === 'tropa') for (const lado of [0, 1]) if (!torres(1 - miEquipo).some(e => !e.rey && (e.x < 9) === (lado === 0))) { X.fillStyle = 'rgba(255,255,255,.12)'; X.fillRect(lado * W / 2, 9 * k, W / 2, (RIO1 - 9) * k); } } else { X.strokeStyle = 'rgba(255,255,255,.4)'; X.setLineDash([6, 6]); X.strokeRect(2, 2, W - 4, H - 4); X.setLineDash([]); } }
      const orden = ents.filter(e => e.hp > 0 || e.torre).sort((a, b) => (a.aire ? 100 : 0) + vy(a.y) - ((b.aire ? 100 : 0) + vy(b.y)));
      for (const e of orden) {
        if (e.torre) { dibTorre(e); continue; }
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
      for (const p of proys) { const x = p.x * k, y = vy(p.y) * k;
        if (p.tipo === 'bola') { GA.brillo(X, x, y, k * (p.grande ? 1.4 : .9), p.color || '#fb923c', 1); X.fillStyle = '#fff7ed'; X.beginPath(); X.arc(x, y, k * .3, 0, 7); X.fill(); if (Math.random() < .7) efectos.push({ tipo: 'humo', x: p.x, y: p.y, vx: 0, vy: 0, v: .5, max: .7, r: .35 }); }
        else if (p.tipo === 'flecha' || p.tipo === 'virote' || p.tipo === 'pluma') { const a = Math.atan2(vy(p.tgt?.y ?? p.ty) - vy(p.y), (p.tgt?.x ?? p.tx) - p.x); X.save(); X.translate(x, y); X.rotate(a); X.fillStyle = p.tipo === 'pluma' ? '#fef3c7' : '#78350f'; X.fillRect(-k * .4, -1, k * .8, 2); X.fillStyle = '#e5e7eb'; X.beginPath(); X.moveTo(k * .45, 0); X.lineTo(k * .25, -3); X.lineTo(k * .25, 3); X.fill(); X.restore(); }
        else { const col = { magia: '#c084fc', luz: '#fde047', fuego: '#f97316', hielo: '#7dd3fc', espina: '#84cc16', viento: '#e0f2fe', rayo: '#fef08a', grito: '#e9d5ff', dorado: '#fde047', bala: '#1c1917', roca: '#78716c' }[p.tipo] || '#f97316'; if (p.tipo === 'bala' || p.tipo === 'roca') { X.fillStyle = col; X.beginPath(); X.arc(x, y, k * (p.tipo === 'roca' ? .35 : .2), 0, 7); X.fill(); } else { GA.brillo(X, x, y, k * .5, col, 1); X.fillStyle = '#fff'; X.beginPath(); X.arc(x, y, k * .12, 0, 7); X.fill(); } } }
      for (const f of efectos) { const a = f.v / f.max, x = f.x * k, y = vy(f.y) * k;
        if (f.tipo === 'boom') { const R = f.r * k * (1.25 - a * .45); GA.brillo(X, x, y, R, f.c || '#fb923c', a); X.strokeStyle = `rgba(255,255,255,${a * .8})`; X.lineWidth = 3 * a; X.beginPath(); X.arc(x, y, f.r * k * (1.4 - a * .6), 0, 7); X.stroke(); if (!f.humo && f.r > 1.2) { f.humo = 1; for (let i = 0; i < 10; i++) efectos.push({ tipo: 'humo', x: f.x + (Math.random() - .5) * f.r, y: f.y + (Math.random() - .5) * f.r, vx: (Math.random() - .5) * 1.2, vy: (Math.random() - .5) * 1.2, v: 1 + Math.random() * .6, max: 1.6, r: .5 + Math.random() * .5 }); } }
        if (f.tipo === 'humo') { X.fillStyle = `rgba(60,55,50,${a * .45})`; X.beginPath(); X.arc(x, y, f.r * k * (1.6 - a * .6), 0, 7); X.fill(); }
        if (f.tipo === 'chispa') { GA.brillo(X, x, y, 5, GA.EQ[vt(f.team || 0)].luz, a); }
        if (f.tipo === 'golpe') { X.save(); X.globalCompositeOperation = 'lighter'; X.strokeStyle = `rgba(255,250,220,${a})`; X.lineWidth = 4 * a + 1; X.beginPath(); X.arc(x, y, k * .7, -1.2 + (1 - a) * 1.5, .3 + (1 - a) * 1.5); X.stroke(); X.restore(); }
        if (f.tipo === 'aparece') { X.save(); X.strokeStyle = f.reina ? '#fde047' : GA.EQ[vt(f.team)].luz; X.shadowColor = f.reina ? '#fde047' : GA.EQ[vt(f.team)].c; X.shadowBlur = 14; X.globalAlpha = a; X.lineWidth = 4 * a; X.beginPath(); X.ellipse(x, y + k * .5, k * 2 * (1 - a) + k * .4, (k * 2 * (1 - a) + k * .4) * .4, 0, 0, 7); X.stroke(); X.restore(); if (f.reina) { GA.brillo(X, x, y - k * 3 * a, k * 2, '#fde047', a); X.fillStyle = `rgba(253,224,71,${a * .5})`; X.fillRect(x - k * .6, 0, k * 1.2, y); }
          if (!f.polvo && a < .5) { f.polvo = 1; for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; efectos.push({ tipo: 'humo', x: f.x + Math.cos(an) * .6, y: f.y + .3 + Math.sin(an) * .25, vx: Math.cos(an) * 1.5, vy: Math.sin(an) * .6, v: .6, max: .9, r: .3 }); } } }
        if (f.tipo === 'hielo') { X.fillStyle = `rgba(186,230,253,${a * .5})`; X.beginPath(); X.arc(x, y, f.r * k, 0, 7); X.fill(); GA.brillo(X, x, y, f.r * k, '#e0f2fe', a * .6); }
        if (f.tipo === 'rayo') { X.save(); X.strokeStyle = `rgba(254,240,138,${a})`; X.shadowColor = '#fde047'; X.shadowBlur = 16; X.lineWidth = 4; X.beginPath(); X.moveTo(x, 0); for (let yy = 0; yy < y; yy += k * 1.2) X.lineTo(x + (Math.random() - .5) * k, yy); X.lineTo(x, y); X.stroke(); X.restore(); GA.brillo(X, x, y, k * 1.5, '#fde047', a); }
        if (f.tipo === 'cadena') { X.save(); X.strokeStyle = `rgba(254,240,138,${a})`; X.shadowColor = '#fde047'; X.shadowBlur = 10; X.lineWidth = 2.5; X.beginPath(); X.moveTo(x, y); const x2 = f.x2 * k, y2 = vy(f.y2) * k; for (let i = 1; i < 5; i++) X.lineTo(x + (x2 - x) * i / 5 + (Math.random() - .5) * k * .6, y + (y2 - y) * i / 5 + (Math.random() - .5) * k * .6); X.lineTo(x2, y2); X.stroke(); X.restore(); }
        if (f.tipo === 'linea') { const y2 = vy(f.y + f.l) * k; X.save(); X.globalCompositeOperation = 'lighter'; X.fillStyle = GA.lin(X, 0, y, 0, y2, [f.c || '#fde047', 'rgba(0,0,0,0)']); X.globalAlpha = a; X.fillRect(x - f.w * k, Math.min(y, y2), f.w * k * 2, Math.abs(y2 - y)); X.restore(); }
        if (f.tipo === 'rayoD') { const yd = voltear ? -1 : 1, x2 = x + Math.cos(f.a) * f.l * k, y2 = y + Math.sin(f.a) * f.l * k * yd; X.save(); X.globalCompositeOperation = 'lighter'; X.strokeStyle = `rgba(253,224,71,${a})`; X.shadowColor = '#fde047'; X.shadowBlur = 24; X.lineWidth = k * .9 * a + 2; X.lineCap = 'round'; X.beginPath(); X.moveTo(x, y); X.lineTo(x2, y2); X.stroke(); X.strokeStyle = `rgba(255,255,255,${a})`; X.lineWidth = k * .25; X.stroke(); X.restore(); }
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
      const sg = $('#sig'), c0 = CARTA[yo.cola[0]]; if (c0) { if (c0.id === 'glory_brown') { const im = new Image(); im.src = '/glory/reina_mini.webp'; im.onload = () => { sg.width = 80; sg.height = 100; sg.getContext('2d').drawImage(im, 0, 0, 80, 100); }; } else { const r = GA.retrato(c0, 40, 50); sg.width = r.width; sg.height = r.height; sg.getContext('2d').drawImage(r, 0, 0); } }
    }
    pintarMano();
    $('#mano').onclick = e => { const b = e.target.closest('[data-carta]'); if (!b || fin) return; const c = b.dataset.carta; sel = sel === c ? null : c; FX.son('click'); hud(); };
    cv.addEventListener('pointerdown', e => {
      if (fin || !sel) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * AN, ys = (e.clientY - r.top) / r.height * AL, y = vy(ys), C = CARTA[sel];
      if (yo.mana < C.c) { texto('💜 Te falta elixir', W / 2, H * .62, k * .8, 1, true); FX.son('error'); return; }
      if (C.tipo !== 'hechizo') { const bolsillo = C.tipo === 'tropa' && !torres(1 - miEquipo).some(o => !o.rey && (o.x < 9) === (x < 9)) && ys >= 9; if (ys < RIO1 + .3 && !bolsillo) { texto('Despliega en tu lado del río', W / 2, H * .62, k * .7, 1, true); FX.son('error'); return; } }
      const key = sel; sel = null;
      if (anfitrion) { if (!jugarCarta(yo, key, x, y)) return; }
      else { post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'jugar', datos: { k: key, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } }).catch(() => {}); yo.mana -= C.c; efectos.push({ tipo: 'aparece', x, y, v: .6, max: .6, team: miEquipo }); }
      FX.son(C.tipo === 'hechizo' ? 'swish' : 'plantar'); FX.vibrar(12); pintarMano(); hud();
    });
    $('#emo').onclick = () => { const d = $('#emos'); d.style.display = d.style.display === 'flex' ? 'none' : 'flex'; };
    $('#emos').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; emote(miAsiento, b.dataset.e, true); $('#emos').style.display = 'none'; if (!ON && Math.random() < .5) setTimeout(() => emote(1, azar(['😂', '😡', '👍', '😭'])), 900 + Math.random() * 800); };
    $('#rend').onclick = () => { if (!fin && confirm('¿Rendirte? Perderás trofeos.')) { if (ON) post('/api/duelo/salir', { sala: ON.sala, tok: ON.tok }).catch(() => {}); coronas[1 - miEquipo] = 3; terminar(1 - miEquipo, true); } };
    // ---------- Final y recompensas ----------
    function terminar(ganador, remoto) {
      if (fin) return; fin = true;
      if (!remoto) { ganador = coronas[0] > coronas[1] ? 0 : coronas[1] > coronas[0] ? 1 : null; if (ganador === null) { const pct = tm => torres(tm).reduce((a, e) => Math.min(a, e.hp / e.max), 1); ganador = pct(0) > pct(1) ? 0 : pct(0) < pct(1) ? 1 : null; } if (ON && anfitrion) { enviarEstado(); post('/api/duelo/msg', { sala: ON.sala, tok: ON.tok, tipo: 'fin', datos: { g: ganador, c: coronas } }).catch(() => {}); } }
      const gano = ganador === null ? null : ganador === miEquipo, misC = Math.min(3, coronas[miEquipo]);
      const camp = cfg.campana != null, dTr = camp || gano === null ? 0 : gano ? Math.round((28 + Math.floor(Math.random() * 6)) * (ON ? 1.2 : 1)) : -Math.min(J.trofeos, 18 + Math.floor(Math.random() * 5)), arenaAntes = arenaDe(J.trofeos);
      J.trofeos += dTr; if (gano) J.victorias++; else if (gano === false) J.derrotas++; J.coronas += misC;
      const monedas = gano ? 15 + misC * 5 + (ON ? 5 : 0) : gano === null ? 6 : 3; PERFIL.ganar(monedas);
      let cofre = null; if (gano && J.cofres.length < 4) { cofre = sortearCofre(); J.cofres.push(cofre); }
      if (camp && gano) { J.campana = J.campana || {}; J.campana[cfg.campana] = Math.max(J.campana[cfg.campana] || 0, Math.max(1, misC)); }
      let reinaNueva = false; if (!J.reina && J.victorias >= 3) { J.reina = 1; reinaNueva = true; }
      const pts = misC * 1000 + Math.max(0, Math.round(tiempo)) * 5 + (gano ? 2000 : 0); try { PERFIL.partida('batalla', pts); } catch (e) {}
      post('/api/arcade/puntaje', { juego: 'batalla', puntos: pts, nombre: LS.get('chatNom') || 'Jugador', avatar: LS.get('chatAv') || 'a01', uid: VID }).catch(() => {});
      const arenaAhora = arenaDe(J.trofeos), subio = arenaAhora > arenaAntes; D(); PERFIL.guardar();
      FX.pararMusica?.(); if (gano) { FX.confeti(); FX.son('nivel'); } else FX.son('perder');
      FX.voz?.(subio ? `¡Nueva arena desbloqueada: ${G.arenas[arenaAhora].n}!` : gano ? '¡Victoria! ¡Gloria para el reino!' : gano === null ? '¡Empate!' : '¡Derrota! La revancha será nuestra', { forzar: true, cortar: true });
      setTimeout(() => { cerrarES(); const d = document.createElement('div'); d.className = 'gb-modal gb'; const nuevas = subio ? G.cartas.filter(c => c.arena === arenaAhora) : [];
        d.innerHTML = `<div class="box"><div class="gb-panel" style="text-align:center"><div style="font-size:3rem">${gano ? '🏆' : gano === null ? '🤝' : '💔'}</div><h2 style="font:900 2rem 'Fraunces',Georgia,serif;color:${gano ? '#fde68a' : '#fca5a5'};margin:0">${gano ? '¡VICTORIA!' : gano === null ? '¡EMPATE!' : 'DERROTA'}</h2>
          <div style="font-size:2rem;letter-spacing:4px">${'👑'.repeat(misC)}<span style="opacity:.25">${'👑'.repeat(3 - misC)}</span></div>
          <p>${camp ? `Campaña: ${'⭐'.repeat(J.campana?.[cfg.campana] || 0)}` : `🏆 ${dTr >= 0 ? '+' : ''}${dTr} trofeos (${J.trofeos})`} · +${monedas} 🪙 · +${misC} 👑</p>
          ${cofre ? `<div class="gb-panel gb-shine" style="display:inline-block;padding:8px 18px"><span style="font-size:2.4rem">${COFRES[cofre].e}</span><br><b>¡Ganaste un ${COFRES[cofre].n}!</b></div>` : gano && J.cofres.length >= 4 ? '<p class="sub">Tus 4 espacios de cofres están llenos: ábrelos para ganar más.</p>' : ''}
          ${subio ? `<div class="gb-panel" style="border-color:#fde047"><b style="color:#fde68a">🗺️ ¡Nueva arena: ${escH(G.arenas[arenaAhora].n)}!</b><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px">${nuevas.map(c => cartaHTML(c)).join('')}</div></div>` : ''}
          ${reinaNueva ? `<div class="gb-panel gb-shine" style="border-color:#fde047"><img src="/glory/reina_mini.webp" style="width:80px;border-radius:50%;border:3px solid #fde047"><br><b style="color:#fde68a">👑 ¡Desbloqueaste a Glory Brown, la Reina de la Victoria!</b></div>` : ''}
          ${!PERFIL.usuario ? '<button class="gb-btn chico azul" id="crearU">👤 Crea tu usuario para guardar tu progreso</button>' : ''}
          <button class="gb-btn gb-shine" id="otra">⚔️ OTRA BATALLA</button><button class="gb-btn chico azul" id="lob">🏰 Volver al reino</button><button class="gb-btn chico azul" id="comp">📣 Retar a un amigo</button></div></div>`; document.body.append(d); pintarRetratos(d);
        if (reinaNueva) setTimeout(() => presentacion('glory_brown'), 600);
        d.onclick = e => { const id = e.target.id; if (id === 'crearU') cuentaModal('crear'); if (id === 'otra') { d.remove(); FX.musica?.('batalla'); if (ON) buscar(t, cfg.modo, 'buscar'); else batalla(t, { modo: cfg.modo, campana: cfg.campana }); } if (id === 'lob') { d.remove(); lobby(t, 'batalla'); } if (id === 'comp') { d.remove(); amigo(t); } }; }, 1300);
    }
    let errores = 0;
    const bucleInt = dt => {
      if (!fin && anfitrion && !(document.hidden && !ON)) { paso(dt); if (ON) { envT -= dt; if (envT <= 0) { envT = .1; enviarEstado(); } } }
      if (!anfitrion) for (const a of asientos) a.mana = Math.min(B.manaMax, a.mana + dt / B.regen * (tiempo <= B.dobleDesde || extra ? 2 : 1) * (n4 ? .8 : 1));
      dibujar(dt); hud(); };
    const bucle = now => { if (!vivo) return; raf = requestAnimationFrame(bucle); const dt = Math.min(.05, (now - last) / 1000); last = now; try { bucleInt(dt); } catch (er) { if (++errores < 5) console.warn('GLORY BROWN:', er); } };
    texto(ON ? `⚔️ ${cfg.modo === '2v2' ? '2 vs 2' : '1 vs 1'} en línea` : cfg.campana != null ? `🗺️ Campaña · ${arena.n}` : '⚔️ ¡A la batalla!', W / 2, H / 2, k * 1.1, 1.8, true); FX.musica?.('batalla'); FX.voz?.('¡Que empiece la batalla!', { forzar: true, cortar: true });
    raf = requestAnimationFrame(bucle);
    setParar(() => { vivo = false; cancelAnimationFrame(raf); if (ON && !fin) post('/api/duelo/salir', { sala: ON.sala, tok: ON.tok }).catch(() => {}); cerrarES(); document.querySelectorAll('.gb-modal').forEach(m => m.remove()); });
    window.__batalla = { estado: () => ({ tiempo, mana: asientos.map(a => a.mana), coronas: [...coronas], ents: ents.filter(e => e.hp > 0 && !e.torre).length, torres: ents.filter(e => e.torre).map(e => [e.team, Math.round(e.hp)]), fin, anfitrion, miAsiento, ctrl: asientos.map(a => a.ctrl) }), mana: v => yo.mana = v, jugar: (c, x, y) => { sel = c; const r = cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + x / AN * r.width, clientY: r.top + y / AL * r.height, bubbles: true })); }, mano: () => [...yo.mano], tiempo: v => tiempo = v, poner: (tm, c, x, y) => desplegar(asientos.find(a => a.team === tm), c, x, y) };
  }
  JUEGOS.batalla = t => lobby(t);
})();
