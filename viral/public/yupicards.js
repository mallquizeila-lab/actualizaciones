// 🃏 YUPI CARDS: juego de cartas por colores y números, con identidad 100% propia de Yupitok.
// Fase 1: contra la IA (2 a 4 jugadores, 3 dificultades) y modo entrenamiento. Cartas dibujadas en SVG (nítidas en cualquier pantalla).
// Reglas: 7 cartas, se juega por color o número; especiales: Saltar, Reversa, +2, Comodín y Comodín +4; botón «¡YUPI!» con la última carta.
// Regla Yupi opcional: acumular +2 y +4. Cartas de personaje (opcionales): Brujita Lulú, Rey Choki, Idol Yupi y Coquito Travieso.
(() => {
  const A = window.ARC_API, { JUEGOS, salir } = A, setParar = A.setParar;
  const COL = { r: { n: 'Rojo', a: '#ff5a6e', m: '#e8173b', b: '#8f0a24', s: '🔥' }, b: { n: 'Azul', a: '#5cc8ff', m: '#1f7bff', b: '#0b2e8a', s: '🌊' }, g: { n: 'Verde', a: '#5cf2a0', m: '#12b76a', b: '#055c3a', s: '🌿' }, y: { n: 'Amarillo', a: '#fff07a', m: '#ffc21a', b: '#c26a00', s: '☀️' } };
  const COLS = Object.keys(COL);
  // ♿ cada color con su figura (para quien no distingue bien los colores)
  const FIG = { r: '<path d="M0 6 C-9 -1 -6 -9 0 -4 C6 -9 9 -1 0 6Z" fill="#fff"/>', b: '<circle r="5.2" fill="#fff"/>', g: '<path d="M0 -6 L6 5 L-6 5Z" fill="#fff"/>', y: '<rect x="-4.6" y="-4.6" width="9.2" height="9.2" rx="1" fill="#fff"/>' };
  const LS_ = { get: k => { try { return localStorage.getItem('yc_' + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('yc_' + k, v); } catch (e) {} } };
  // 🎨 Reversos y mesas que se desbloquean ganando (solo estética: no dan ventaja)
  const REVERSOS = [{ k: 'galaxia', n: 'Galaxia', g: 'linear-gradient(140deg,#4c1d95,#7c3aed 45%,#db2777)', min: 0 }, { k: 'oceano', n: 'Océano', g: 'linear-gradient(140deg,#0c4a6e,#0284c7 50%,#22d3ee)', min: 5 }, { k: 'oro', n: 'Oro real', g: 'linear-gradient(140deg,#78350f,#d97706 50%,#fde047)', min: 15 }, { k: 'neon', n: 'Neón', g: 'linear-gradient(140deg,#111827,#16a34a 40%,#a3e635)', min: 30 }];
  const MESAS = [{ k: 'noche', n: 'Noche Yupi', g: 'radial-gradient(ellipse at 50% 40%,#3b1d7a 0%,#1a0b3d 55%,#0b0420 100%)', min: 0 }, { k: 'selva', n: 'Selva', g: 'radial-gradient(ellipse at 50% 40%,#166534 0%,#0f3d2a 55%,#05170f 100%)', min: 10 }, { k: 'atardecer', n: 'Atardecer', g: 'radial-gradient(ellipse at 50% 40%,#c2410c 0%,#7c2d12 50%,#2a0a05 100%)', min: 20 }];
  // 🎯 Misiones del día (se renuevan cada día; al completarlas te dan puntos extra en tu siguiente partida)
  const MIS = [{ k: 'jugar', n: '🎮 Juega 3 partidas', meta: 3 }, { k: 'ganar', n: '🏆 Gana 1 partida', meta: 1 }, { k: 'esp', n: '⚡ Juega 10 cartas especiales', meta: 10 }, { k: 'yupi', n: '📣 Grita ¡YUPI! 2 veces', meta: 2 }];
  const hoyMis = () => new Date().toISOString().slice(0, 10);
  const misiones = () => { let m = {}; try { m = JSON.parse(LS_.get('mis') || '{}'); } catch (e) {} if (m.dia !== hoyMis()) m = { dia: hoyMis(), p: {}, cobradas: [] }; return m; };
  const avanzar = (k, n = 1) => { const m = misiones(); m.p[k] = (m.p[k] || 0) + n; LS_.set('mis', JSON.stringify(m)); };
  // 🌟 Cartas de PERSONAJE (con sonido y habilidad): personajes propios de Yupitok
  const HEROES = {
    bruja: { n: 'Brujita Lulú', e: '🧙‍♀️', h: 'Elige color y el siguiente se queda dormido 😴', g: ['#a855f7', '#4c1d95'], icono: '✨' },
    rey: { n: 'Rey Choki', e: '🤴', h: 'Comodín +4 real: elige color y el siguiente roba 4', g: ['#fbbf24', '#b45309'], icono: '+4' },
    idol: { n: 'Idol Yupi', e: '🎤', h: 'Elige color y TODOS los rivales roban 1', g: ['#f472b6', '#9d174d'], icono: '🎵' },
    coquito: { n: 'Coquito Travieso', e: '🐶', h: 'Elige color y cambia tu mano con el rival que tiene menos cartas', g: ['#34d399', '#065f46'], icono: '🔄' },
  };
  const esHeroe = x => !!HEROES[x?.v], cuatro = v => v === 'mas4' || v === 'rey';
  let ACs = null;
  function sonar(k) { // sonidos de cada personaje (sintetizados, sin archivos)
    try { if (localStorage.getItem('arcSonido') === '0') return; ACs = ACs || new (window.AudioContext || window.webkitAudioContext)(); if (ACs.state === 'suspended') ACs.resume(); const t0 = ACs.currentTime;
      const nota = (f, t, d, tipo = 'sine', vol = .09, f2) => { const o = ACs.createOscillator(), g = ACs.createGain(); o.type = tipo; o.frequency.setValueAtTime(f, t0 + t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + t + d); g.gain.setValueAtTime(0.0001, t0 + t); g.gain.linearRampToValueAtTime(vol, t0 + t + .02); g.gain.exponentialRampToValueAtTime(.001, t0 + t + d); o.connect(g); g.connect(ACs.destination); o.start(t0 + t); o.stop(t0 + t + d + .05); };
      if (k === 'bruja') { [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => nota(f, i * .06, .5, 'sine', .07)); nota(220, 0, .9, 'triangle', .05, 110); }
      if (k === 'rey') { [[523, 0], [523, .14], [523, .28], [659, .42], [784, .62]].forEach(([f, t]) => { nota(f, t, .3, 'square', .06); nota(f / 2, t, .3, 'sawtooth', .03); }); nota(1047, .62, .8, 'triangle', .07); }
      if (k === 'idol') { [[659, 0], [784, .12], [880, .24], [988, .36], [880, .48], [1175, .6]].forEach(([f, t]) => nota(f, t, .22, 'triangle', .08)); [[330, 0], [392, .24], [440, .48]].forEach(([f, t]) => nota(f, t, .3, 'sine', .05)); }
      if (k === 'coquito') { nota(700, 0, .12, 'sawtooth', .07, 380); nota(760, .18, .12, 'sawtooth', .07, 400); [523, 659, 784].forEach((f, i) => nota(f, .4 + i * .08, .15, 'square', .05)); }
    } catch (e) {}
  }
  // 💬 Reacciones rápidas (solo frases y emojis predefinidos, siempre amables)
  const FRASES = ['¡Hola! 👋', '¡Bien jugado! 👏', '¡Oh no! 😱', '¡Date prisa! ⏰', '¡Increíble! 🤩', '¡Cambia de color! 🎨', '¡Suerte! 🍀', '¡Buena partida! 🤝'];
  const EMOJIS = ['😂', '😎', '😡', '😭', '🥳', '🤔', '❤️', '🔥'];
  const NOMBRES = ['Nico', 'Sami', 'Lupe', 'Beto', 'Tito', 'Maya', 'Pancho', 'Rosi', 'Inti', 'Killa'];
  const CARAS = ['🦊', '🐼', '🐯', '🐸', '🦁', '🐨', '🐵', '🦄', '🐙', '🐧'];
  const azar = l => l[Math.floor(Math.random() * l.length)];
  const mezclar = l => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };

  // ---------- Mazo (108 cartas) ----------
  let uidC = 0;
  function mazo(heroes) {
    const M = [];
    for (const c of COLS) { M.push({ c, v: '0' }); for (let n = 1; n <= 9; n++) M.push({ c, v: String(n) }, { c, v: String(n) }); for (const v of ['saltar', 'reversa', 'mas2']) M.push({ c, v }, { c, v }); }
    for (let i = 0; i < 4; i++) M.push({ c: 'w', v: 'comodin' }, { c: 'w', v: 'mas4' });
    if (heroes) for (const v of Object.keys(HEROES)) M.push({ c: 'w', v });
    return mezclar(M.map(x => ({ ...x, id: ++uidC })));
  }
  const valor = x => /^\d$/.test(x.v) ? +x.v : x.c === 'w' ? 50 : 20;
  const esp = x => !/^\d$/.test(x.v);

  // ---------- Diseño de cartas (SVG propio) ----------
  const ICO = {
    saltar: '<circle cx="0" cy="0" r="22" fill="none" stroke="#fff" stroke-width="7"/><line x1="-15" y1="15" x2="15" y2="-15" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
    reversa: '<path d="M-18 -4 A18 18 0 0 1 14 -12" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M8 -22 L18 -11 L4 -6 Z" fill="#fff"/><path d="M18 4 A18 18 0 0 1 -14 12" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M-8 22 L-18 11 L-4 6 Z" fill="#fff"/>',
  };
  const estrella = (r, f) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + (Math.cos(a) * rr).toFixed(1) + ' ' + (Math.sin(a) * rr).toFixed(1); } return `<path d="${d}Z" fill="${f}"/>`; };
  const ruedaColores = r => COLS.map((c, i) => { const a0 = -Math.PI / 2 + i * Math.PI / 2, a1 = a0 + Math.PI / 2, p = a => `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`; return `<path d="M0 0 L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z" fill="${COL[c].a}"/>`; }).join('');
  function svgCarta(x, w = 90) {
    if (esHeroe(x)) { const H = HEROES[x.v], h = Math.round(w * 1.45), id = 'h' + x.id + 'w' + w, E = x.elegido && COL[x.elegido];
      return `<svg viewBox="0 0 100 145" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" aria-label="${H.n}: ${H.h}"><defs><radialGradient id="${id}" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="${H.g[0]}"/><stop offset="1" stop-color="${H.g[1]}"/></radialGradient><linearGradient id="${id}o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7cc"/><stop offset=".45" stop-color="#facc15"/><stop offset="1" stop-color="#a16207"/></linearGradient></defs>
<rect x="2" y="2" width="96" height="141" rx="13" fill="url(#${id}o)"/><rect x="6" y="6" width="88" height="133" rx="10" fill="url(#${id})"/>
<g transform="translate(50 60)" opacity=".3">${[...Array(12)].map((_, i) => `<path d="M0 0 L-5 -72 L5 -72Z" fill="#fff" transform="rotate(${i * 30})"/>`).join('')}</g>
<circle cx="50" cy="60" r="30" fill="#ffffff33" stroke="#fde68a" stroke-width="2.5"/><text x="50" y="73" text-anchor="middle" font-size="36">${H.e}</text>
${[[16, 18], [84, 18], [14, 96], [86, 96]].map(([a, b]) => `<g transform="translate(${a} ${b})">${estrella(5, '#fde68a')}</g>`).join('')}
<rect x="10" y="100" width="80" height="17" rx="8.5" fill="#000a" stroke="#fde68a" stroke-width="1.2"/><text x="50" y="112" text-anchor="middle" font-size="${H.n.length > 13 ? 7.6 : 8.8}" font-weight="900" fill="#fff" font-family="Figtree,Arial">${H.n}</text>
<g transform="translate(50 129)">${E ? `<circle r="8" fill="${E.m}" stroke="#fff" stroke-width="2"/>` : ruedaColores(7)}</g><text x="50" y="26" text-anchor="middle" font-size="12" font-weight="900" fill="#fff" font-family="Figtree,Arial" stroke="#0008" stroke-width="1.5" paint-order="stroke">${H.icono}</text>
<rect x="6" y="6" width="88" height="133" rx="10" fill="none" stroke="#fff" stroke-opacity=".5"/></svg>`; }
    const h = Math.round(w * 1.45), id = 'g' + x.id + 'w' + w, comodin = x.c === 'w', C = COL[x.c] || { a: '#334155', b: '#0f172a' };
    const txt = /^\d$/.test(x.v) ? x.v : x.v === 'mas2' ? '+2' : x.v === 'mas4' ? '+4' : '';
    const centro = x.v === 'saltar' || x.v === 'reversa' ? `<g transform="translate(50 72) scale(1.15)">${ICO[x.v]}</g>`
      : comodin ? `<g transform="translate(50 72)"><circle r="31" fill="#0b1020"/><g transform="rotate(${x.v === 'mas4' ? 45 : 0})">${ruedaColores(27)}</g>${estrella(13, '#fff')}${x.v === 'mas4' ? '<text x="0" y="52" text-anchor="middle" font-size="22" font-weight="900" fill="#fff" font-family="Figtree,Arial">+4</text>' : ''}</g>`
      : `<text x="50" y="${txt.length > 1 ? 86 : 90}" text-anchor="middle" font-size="${txt.length > 1 ? 40 : 54}" font-weight="900" fill="#fff" font-family="Figtree,Arial" stroke="${C.b}" stroke-width="2" paint-order="stroke">${txt}</text>`;
    const esq = comodin ? (x.v === 'mas4' ? '+4' : '★') : x.v === 'saltar' ? '⦸' : x.v === 'reversa' ? '⇄' : txt;
    return `<svg viewBox="0 0 100 145" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" aria-label="${comodin ? (x.v === 'mas4' ? 'Comodín +4' : 'Comodín') : COL[x.c].n + ' ' + (txt || x.v)}"><defs>
<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${comodin ? '<stop offset="0" stop-color="#312e81"/><stop offset=".55" stop-color="#1e1b4b"/><stop offset="1" stop-color="#05060f"/>' : `<stop offset="0" stop-color="${C.a}"/><stop offset=".5" stop-color="${C.m}"/><stop offset="1" stop-color="${C.b}"/>`}</linearGradient>
<linearGradient id="${id}o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7cc"/><stop offset=".5" stop-color="#facc15"/><stop offset="1" stop-color="#b45309"/></linearGradient>
<radialGradient id="${id}b" cx=".3" cy=".2" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<rect x="2" y="2" width="96" height="141" rx="13" fill="#fff"/><rect x="6" y="6" width="88" height="133" rx="10" fill="url(#${id})"/><rect x="9" y="9" width="82" height="127" rx="8" fill="none" stroke="url(#${id}o)" stroke-width="1.6" opacity=".9"/>
<g opacity=".16">${[[20, 30], [80, 118], [78, 34], [22, 112], [50, 20], [50, 126]].map(([a, b]) => `<g transform="translate(${a} ${b})">${estrella(6, '#fff')}</g>`).join('')}</g>
<circle cx="50" cy="72" r="${comodin ? 0 : 33}" fill="#ffffff26" stroke="#ffffffaa" stroke-width="2.4"/><ellipse cx="50" cy="${comodin ? 0 : 52}" rx="${comodin ? 0 : 22}" ry="7" fill="#ffffff30"/>${centro}
<text x="14" y="24" font-size="15" font-weight="900" fill="#fff" font-family="Figtree,Arial">${esq}</text>${comodin ? '' : `<g transform="translate(83 18)" opacity=".95">${FIG[x.c]}</g><g transform="translate(17 127)" opacity=".95">${FIG[x.c]}</g>`}<text x="86" y="131" font-size="15" font-weight="900" fill="#fff" font-family="Figtree,Arial" text-anchor="end">${esq}</text>
<rect x="6" y="6" width="88" height="133" rx="10" fill="url(#${id}b)"/><path d="M6 40 Q50 20 94 34 L94 16 Q94 6 84 6 L16 6 Q6 6 6 16 Z" fill="#fff" opacity=".1"/><text x="50" y="133" text-anchor="middle" font-size="7" font-weight="800" fill="#ffffffaa" font-family="Figtree,Arial" letter-spacing="1">YUPI</text></svg>`;
  }
  const reverso = (w = 60) => { const R = REVERSOS.find(r => r.k === LS_.get('reverso')) || REVERSOS[0]; return `<div class="yc-rev${w < 50 ? ' chica' : ''}" style="width:${w}px;height:${Math.round(w * 1.45)}px;background:radial-gradient(circle at 50% 50%,#ffffff2e 0 22%,transparent 23%),repeating-linear-gradient(45deg,#ffffff10 0 6px,transparent 6px 12px),${R.g};border-width:${w < 50 ? 2 : 4}px"><span style="font-size:${Math.max(.45, w / 110)}rem">${w < 50 ? '★' : 'YUPI<br>CARDS'}</span></div>`; };

  // ---------- Estado de la partida ----------
  let G = null;
  const CSS = `#yc{position:relative;border-radius:22px;overflow:hidden;min-height:min(86vh,760px);}#yc.full{position:fixed;inset:0;z-index:60;border-radius:0;min-height:100dvh}#yc.full .capa{min-height:100dvh;max-width:1100px;margin:0 auto}#yc{color:#fff;font-family:Figtree,system-ui,sans-serif;user-select:none;-webkit-user-select:none}
#yc .fondo{position:absolute;inset:0}#yc .fondo::after{content:'';position:absolute;inset:0;background-image:radial-gradient(#ffffff22 1px,transparent 1px);background-size:26px 26px;animation:ycDots 40s linear infinite}@keyframes ycDots{to{background-position:260px 260px}}
#yc .luz{position:absolute;width:60%;height:60%;left:20%;top:16%;border-radius:50%;background:radial-gradient(circle,#ffffff14,transparent 70%);animation:ycLuz 6s ease-in-out infinite alternate}@keyframes ycLuz{to{transform:scale(1.15)}}
#yc .capa{position:relative;z-index:2;display:grid;grid-template-rows:auto 1fr auto;min-height:min(86vh,760px);padding:10px}
.yc-top{display:flex;justify-content:space-around;gap:6px;flex-wrap:wrap}.yc-op{display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 8px;border-radius:16px;min-width:90px;transition:.3s;position:relative}.yc-op .yc-av{position:relative;width:min(64px,8vh);height:min(64px,8vh);border-radius:50%;display:grid;place-items:center;font-size:2.2rem!important;background:radial-gradient(circle at 35% 30%,#fff,#dbeafe 60%,#93c5fd);border:4px solid #f5c451;box-shadow:0 6px 16px #0008}.yc-n{position:absolute;right:-8px;bottom:-4px;font-style:normal;background:#111827;color:#fff;border:2px solid #fff;border-radius:999px;font:900 .8rem Figtree;min-width:24px;height:24px;display:grid;place-items:center}.yc-tag{background:#0f172acc;border:1px solid #ffffff33;border-radius:999px;padding:2px 10px;font-size:.82rem!important}
.yc-op.turno .yc-av{border-color:#4ade80;box-shadow:0 0 0 4px #4ade8055,0 0 26px #4ade80}.yc-op.turno .yc-tag{background:#16a34a}.yc-av{font-size:1.9rem;line-height:1}.yc-op b{font-size:.85rem}.yc-op small{opacity:.85;font-size:.75rem}.yc-mini{display:flex;height:auto}.yc-mini .yc-rev{margin-left:-16px;box-shadow:-2px 0 4px #0006}.yc-mini .yc-rev:first-child{margin-left:0}
.yc-rev{border-radius:10px;border:3px solid #fff;display:grid;place-items:center;box-shadow:0 4px 10px #0007,inset 0 0 0 2px #facc1588}.yc-rev.chica{border-radius:5px}.yc-rev span{font-weight:900;font-family:Figtree,sans-serif;text-align:center;letter-spacing:1px;color:#fff;text-shadow:0 2px 6px #000a;line-height:1.1}.yc-rev.chica span{color:#facc15;font-size:.8rem!important}
.yc-burbuja{position:absolute;top:-10px;right:-8px;background:#facc15;color:#1f1300;font-weight:900;font-size:.75rem;border-radius:999px;padding:3px 8px;animation:ycPop .4s}.yc-atrapar{position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;border:0;border-radius:999px;font:900 .75rem Figtree;padding:5px 10px;cursor:pointer;animation:ycLat .5s infinite alternate;white-space:nowrap}
@keyframes ycPop{from{transform:scale(0)}}@keyframes ycLat{to{transform:translateX(-50%) scale(1.12)}}
.yc-centro{display:flex;align-items:center;justify-content:center;gap:clamp(18px,6vw,60px);position:relative;padding:min(26px,2.5vh) 0;min-height:0}.yc-centro>*{z-index:1}.yc-mesa{position:absolute!important;z-index:0!important;left:50%;top:50%;transform:translate(-50%,-50%);width:min(96%,760px);height:min(100%,380px);border-radius:50%;background:radial-gradient(ellipse at 50% 40%,#3b8cff 0%,#1d5fd1 45%,#0c2f7a 100%);border:14px solid #8a4b1c;box-shadow:inset 0 0 0 4px #f5c451,inset 0 18px 50px #0006,0 20px 50px #0009,0 0 0 4px #5a2d0c}.yc-mesa::after{content:'';position:absolute;inset:16%;border-radius:50%;border:2px dashed #ffffff22}.yc-pila{position:relative;cursor:pointer;transition:transform .2s}.yc-pila:hover{transform:translateY(-4px)}.yc-pila .yc-rev{position:absolute}.yc-desc{position:relative;width:min(150px,20vh);height:min(218px,29vh)}.yc-desc .c{position:absolute;inset:0;filter:drop-shadow(0 8px 18px #0008)}
.yc-colorAct{position:absolute;inset:-18px;border-radius:50%;border:5px dashed;animation:ycGira 8s linear infinite;opacity:.8}.yc-dir{position:absolute;left:50%;top:50%;width:min(62vw,64vh,520px);height:min(62vw,64vh,520px);margin:calc(min(62vw,64vh,520px) / -2) 0 0 calc(min(62vw,64vh,520px) / -2);opacity:.35;z-index:0!important;pointer-events:none;animation:ycGira 9s linear infinite;filter:drop-shadow(0 0 8px #facc15)}.yc-dir.inv path{transform:scaleX(-1);transform-origin:100px 100px}.yc-reacs{position:fixed;left:50%;transform:translateX(-50%);box-sizing:border-box;max-width:calc(100vw - 20px);bottom:calc(min(170px,22vh) + 20px);z-index:14;background:#0f172af2;border:2px solid #facc15;border-radius:18px;padding:10px;display:grid;gap:6px;width:min(300px,86vw);box-shadow:0 14px 40px #000a}.yc-reacs .em{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px}.yc-reacs .em button{font-size:min(1.5rem,6.5vw);padding:0;background:none;border:0;cursor:pointer;transition:transform .12s}.yc-reacs .em button:hover{transform:scale(1.3)}.yc-reacs .fr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.yc-reacs .fr button{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:linear-gradient(#3b82f6,#1d4ed8);color:#fff;border:0;border-radius:10px;padding:7px 4px;font-weight:800;font-size:.8rem;cursor:pointer}.yc-bur{position:fixed;z-index:17;transform:translate(-50%,-100%);background:#fff;color:#111827;font-weight:900;border-radius:14px;padding:6px 12px;white-space:nowrap;box-shadow:0 8px 20px #0007;pointer-events:none;animation:ycBur 2.6s ease forwards}.yc-bur.e{font-size:2.2rem;background:none;box-shadow:none;padding:0}.yc-bur:not(.e)::after{content:'';position:absolute;left:50%;bottom:-7px;margin-left:-7px;border:7px solid transparent;border-bottom:0;border-top-color:#fff}@keyframes ycBur{0%{opacity:0;margin-top:10px}12%{opacity:1;margin-top:0}85%{opacity:1}100%{opacity:0;margin-top:-14px}}.yc-misfin{text-align:left;background:#ffffff12;border-radius:12px;padding:8px 10px;margin-top:8px;font-size:.85rem}.yc-misfin div{display:flex;align-items:center;gap:8px;margin:3px 0}.yc-misfin i{flex:1;height:8px;border-radius:5px;background:#ffffff22;overflow:hidden}.yc-misfin i u{display:block;height:100%;background:linear-gradient(90deg,#facc15,#4ade80)}@keyframes ycGira{to{transform:rotate(360deg)}}.yc-dir.inv{animation-direction:reverse}
.yc-info{position:absolute;bottom:4px;left:50%;transform:translateX(-50%);background:#0008;border-radius:999px;padding:5px 14px;font-weight:700;font-size:.9rem;white-space:nowrap}
.yc-yo{display:flex;flex-direction:column;align-items:center;gap:8px}.yc-mano{display:flex;justify-content:center;max-width:100%;overflow-x:auto;padding:min(22px,2.5vh) 10px 4px;scrollbar-width:thin}.yc-yo{gap:4px!important}.yc-mano .c{margin-left:-26px;transition:transform .2s,filter .2s;cursor:pointer;filter:drop-shadow(0 6px 10px #0007);flex:none}.yc-mano .c:first-child{margin-left:0}
.yc-mano .c.ok{transform:translateY(-14px)}.yc-mano .c.ok:hover{transform:translateY(-26px) scale(1.04)}.yc-mano .c.no{filter:brightness(.55) drop-shadow(0 6px 10px #0007)}.yc-mano .c.pista{animation:ycPista 1s infinite alternate}@keyframes ycPista{to{transform:translateY(-22px);filter:drop-shadow(0 0 14px #facc15)}}
.yc-barra{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}.yc-yupi{border:0;border-radius:999px;padding:14px 34px;font:900 1.3rem Figtree,sans-serif;color:#1f1300;background:linear-gradient(135deg,#fde047,#f59e0b);box-shadow:0 8px 24px #f59e0b88;cursor:pointer;transition:.2s}#ycYupi{width:min(96px,11vh);height:min(96px,11vh);padding:0;border-radius:50%;color:#fff;font:900 1.45rem Figtree,sans-serif;letter-spacing:.02em;text-shadow:0 3px 0 #7f1d1d,0 0 12px #0006;background:radial-gradient(circle at 35% 28%,#ff9aa2 0,#ff2d3d 38%,#b3001b 75%,#6b0010 100%);border:5px solid #fde68a;box-shadow:0 10px 0 #7f1d1d,0 16px 30px #000a,inset 0 -8px 14px #0005}#ycYupi:active{transform:translateY(6px);box-shadow:0 4px 0 #7f1d1d,0 8px 20px #000a}
.yc-yupi.listo{animation:ycLat2 .6s infinite alternate}@keyframes ycLat2{to{transform:scale(1.12);filter:brightness(1.15) drop-shadow(0 0 18px #ff2d3d)}}.yc-yupi:disabled{opacity:.35;animation:none}
.yc-yoav{display:flex;flex-direction:column;align-items:center;gap:4px}.yc-yoav img{width:58px;height:58px;border-radius:50%;border:4px solid #f5c451;box-shadow:0 6px 16px #0008;object-fit:cover;background:#fff}.yc-btn{border:0;border-radius:12px;padding:10px 16px;font:800 .95rem Figtree,sans-serif;color:#fff;background:#ffffff22;cursor:pointer}.yc-reloj{width:46px;height:46px}
.yc-vuela{position:fixed;z-index:80;pointer-events:none;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .45s}
.yc-modal{position:absolute;inset:0;z-index:20;background:#000b;display:grid;place-items:center;padding:16px}.yc-caja{background:linear-gradient(160deg,#2e1065,#0f0a2e);border:1px solid #ffffff33;border-radius:20px;padding:18px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px #000a}
.yc-colores{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.yc-colores button{border:0;border-radius:16px;height:74px;font:900 1.05rem Figtree;color:#fff;cursor:pointer;text-shadow:0 1px 3px #0008;transition:.15s}.yc-colores button:hover{transform:scale(1.05)}
.yc-heroe{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);z-index:16;width:min(86vw,380px);aspect-ratio:1;border-radius:50%;display:grid;place-items:center;align-content:center;gap:2px;text-align:center;pointer-events:none;animation:ycHeroe 1.7s ease forwards}.yc-heroe span{font-size:5rem;filter:drop-shadow(0 6px 20px #000a)}.yc-heroe b{font-size:1.5rem;text-shadow:0 3px 10px #000}.yc-heroe small{max-width:70%;font-weight:700;text-shadow:0 2px 6px #000}@keyframes ycHeroe{0%{transform:translate(-50%,-50%) scale(.2);opacity:0}15%{transform:translate(-50%,-50%) scale(1.08);opacity:1}80%{opacity:1}100%{transform:translate(-50%,-50%) scale(1.25);opacity:0}}
.yc-tip{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:15;background:#0f172ae6;border:1px solid #facc15;border-radius:14px;padding:10px 14px;max-width:min(92%,420px);font-size:.95rem;text-align:center;animation:ycPop .3s}
.yc-vitrina{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.yc-vitrina button{border:0;background:none;padding:0;cursor:pointer;transition:transform .15s;filter:drop-shadow(0 6px 12px #0008)}.yc-vitrina button:hover{transform:translateY(-5px) rotate(-3deg)}.yc-menu{display:grid;gap:10px;margin-top:10px}.yc-modos{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.yc-modos button{border:3px solid #ffffffcc;border-radius:16px;color:#fff;font:900 .82rem Figtree,sans-serif;padding:10px 4px;cursor:pointer;display:grid;gap:4px;justify-items:center;box-shadow:0 6px 0 #0006,0 10px 20px #0005;text-shadow:0 2px 4px #0008;transition:.15s}.yc-modos button:hover:not(:disabled){transform:translateY(-3px)}.yc-modos button span{font-size:1.9rem}.yc-modos button small{font-size:.66rem;background:#0006;border-radius:999px;padding:1px 6px}.yc-modos button:disabled{opacity:.7;cursor:default}@media(max-width:480px){.yc-modos{grid-template-columns:repeat(3,1fr)}}.yc-opc{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.yc-opc button{border:2px solid #ffffff33;background:#ffffff14;color:#fff;border-radius:12px;padding:8px 12px;font:800 .9rem Figtree;cursor:pointer}.yc-opc button.on{border-color:#facc15;background:#facc1533}
@media(max-width:600px){.yc-desc{width:104px;height:151px}#yc .capa{padding:6px}.yc-op{min-width:72px;padding:4px 6px}.yc-av{font-size:1.5rem}}`;

  function menu(t) {
    salir(); registrar(t.id);
    const st = JSON.parse(LS_.get('stats') || '{"g":0,"p":0}'), opc = JSON.parse(LS_.get('opc') || '{"n":4,"dif":"medio","acum":false}');
    const libres = (L, k) => L.map(x => `<button data-${k}="${x.k}" ${st.g >= x.min ? '' : 'disabled'} class="${(LS_.get(k) || L[0].k) === x.k ? 'on' : ''}" title="${st.g >= x.min ? '' : 'Gana ' + x.min + ' partidas'}">${st.g >= x.min ? '' : '🔒 '}${x.n}</button>`).join('');
    stage(`<style>${CSS}</style><div id="yc"><div class="fondo" style="background:${(MESAS.find(m => m.k === LS_.get('mesa')) || MESAS[0]).g}"></div><div class="luz"></div><div class="capa" style="grid-template-rows:auto;align-content:center"><div class="yc-caja" style="margin:auto">
<div style="display:flex;justify-content:center;gap:-10px;margin-bottom:6px">${[{ c: 'r', v: '7', id: 'a1' }, { c: 'w', v: 'mas4', id: 'a2' }, { c: 'b', v: 'reversa', id: 'a3' }].map((x, i) => `<div style="transform:rotate(${(i - 1) * 12}deg) translateY(${i === 1 ? -8 : 0}px);margin:0 -10px">${svgCarta(x, 70)}</div>`).join('')}</div>
<h2 style="margin:6px 0 2px;font-size:1.8rem;letter-spacing:1px">🃏 YUPI CARDS</h2><p style="margin:0;opacity:.85">Juega por color o número, usa las cartas especiales y grita <b>¡YUPI!</b> cuando te quede una sola carta.</p>
<p style="margin:8px 0 0;font-size:.85rem;opacity:.8">🏆 ${st.g} victorias · 🎮 ${st.p} partidas</p>
<div class="yc-menu"><div><b>Jugadores</b><div class="yc-opc" id="ycN">${[2, 3, 4].map(n => `<button data-n="${n}" class="${opc.n === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
<div><b>Dificultad de la IA</b><div class="yc-opc" id="ycD">${[['facil', '😊 Fácil'], ['medio', '🤔 Medio'], ['dificil', '😈 Difícil']].map(([k, l]) => `<button data-d="${k}" class="${opc.dif === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
<label style="font-size:.9rem;display:flex;gap:6px;justify-content:center;align-items:center"><input type="checkbox" id="ycAc" ${opc.acum ? 'checked' : ''}> Regla Yupi: acumular +2 y +4</label>
<label style="font-size:.9rem;display:flex;gap:6px;justify-content:center;align-items:center"><input type="checkbox" id="ycHe" ${opc.heroes !== false ? 'checked' : ''}> 🌟 Cartas de personaje (con sonido y poder)</label>
<div class="yc-vitrina">${Object.keys(HEROES).map((v, i) => `<button type="button" data-heroe="${v}" title="${HEROES[v].n}: ${HEROES[v].h}">${svgCarta({ c: 'w', v, id: 'v' + i }, innerWidth < 600 ? 70 : 92)}</button>`).join('')}</div><p style="margin:-4px 0 0;font-size:.78rem;opacity:.8">Toca un personaje para escuchar su sonido y ver su poder 🔊</p>
<div class="yc-modos"><button id="ycJugar" style="background:linear-gradient(160deg,#ff5a6e,#8f0a24)"><span>🤖</span>Contra la IA</button><button id="ycEntrena" style="background:linear-gradient(160deg,#a78bfa,#4c1d95)"><span>🎓</span>Entrenamiento</button><button disabled style="background:linear-gradient(160deg,#5cc8ff,#0b2e8a)"><span>🌐</span>Online<small>Pronto</small></button><button disabled style="background:linear-gradient(160deg,#5cf2a0,#055c3a)"><span>👥</span>Con amigos<small>Pronto</small></button><button disabled style="background:linear-gradient(160deg,#fff07a,#c26a00)"><span>🏆</span>Torneos<small>Pronto</small></button></div>
<details style="text-align:left;font-size:.88rem;opacity:.95"><summary style="cursor:pointer;font-weight:800">🎨 Reversos y mesas</summary><p style="margin:6px 0 2px">Reverso de tus cartas:</p><div class="yc-opc" id="ycRv">${libres(REVERSOS, 'reverso')}</div><p style="margin:6px 0 2px">Mesa:</p><div class="yc-opc" id="ycMs">${libres(MESAS, 'mesa')}</div><p style="opacity:.75;margin:6px 0 0">Se desbloquean ganando partidas. Solo cambian el aspecto: nadie tiene ventaja.</p></details>
<details style="text-align:left;font-size:.88rem"><summary style="cursor:pointer;font-weight:800">📖 Reglas</summary><ul style="margin:6px 0;padding-left:18px"><li>Todos empiezan con 7 cartas. Juega una carta del <b>mismo color o número</b> que la de la mesa.</li><li>Si no puedes, <b>roba</b> una del mazo (si sirve, puedes jugarla).</li><li><b>⦸ Saltar:</b> el siguiente pierde su turno. <b>⇄ Reversa:</b> cambia el sentido. <b>+2:</b> el siguiente roba 2 y pierde el turno.</li><li><b>★ Comodín:</b> eliges el color. <b>Comodín +4:</b> eliges color y el siguiente roba 4.</li><li>Con <b>2 cartas</b>, pulsa <b>¡YUPI!</b> antes de jugar (o justo después). Si te atrapan sin decirlo: <b>+2 cartas</b>.</li><li>Gana quien se queda sin cartas. Sumas puntos por las cartas que les quedan a los demás.</li></ul></details>
<div style="text-align:left;background:#ffffff10;border-radius:14px;padding:10px 12px"><b>🎯 Misiones de hoy</b>${(() => { const m = misiones(); return MIS.map(x => { const v = Math.min(x.meta, m.p[x.k] || 0), ok = v >= x.meta, cob = m.cobradas.includes(x.k); return `<div style="margin-top:7px"><div style="display:flex;justify-content:space-between;font-size:.86rem"><span>${x.n}</span><span>${cob ? '✅' : ok ? `<button class="yc-btn" data-cobrar="${x.k}" style="padding:3px 9px;background:#16a34a">🎁 +100</button>` : v + '/' + x.meta}</span></div><div style="height:7px;border-radius:9px;background:#ffffff22;margin-top:3px;overflow:hidden"><div style="height:100%;width:${v / x.meta * 100}%;background:linear-gradient(90deg,#facc15,#f97316)"></div></div></div>`; }).join(''); })()}${+LS_.get('bono') ? `<p style="margin:8px 0 0;font-size:.84rem">🎁 Tienes <b>+${LS_.get('bono')}</b> puntos extra para tu próxima victoria.</p>` : ''}</div>
<p style="font-size:.8rem;opacity:.7;margin:0">🌐 Partidas online, salas con amigos, torneos y cartas coleccionables: ¡muy pronto!</p></div></div></div></div>`);
    const sel = (box, attr, fn) => $(box).onclick = e => { const b = e.target.closest(`[data-${attr}]`); if (!b || b.disabled) return; FX.son('click'); fn(b.dataset[attr]); $(box).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
    sel('#ycN', 'n', v => opc.n = +v); sel('#ycD', 'd', v => opc.dif = v); sel('#ycRv', 'reverso', v => LS_.set('reverso', v)); sel('#ycMs', 'mesa', v => { LS_.set('mesa', v); $('#yc .fondo').style.background = MESAS.find(m => m.k === v).g; });
    $('#yc').addEventListener('click', e => { const b = e.target.closest('[data-cobrar]'); if (!b) return; const m = misiones(); if (m.cobradas.includes(b.dataset.cobrar)) return; m.cobradas.push(b.dataset.cobrar); LS_.set('mis', JSON.stringify(m)); LS_.set('bono', (+LS_.get('bono') || 0) + 100); FX.confeti(); menu(t); });
    $('#yc').addEventListener('click', e => { const b = e.target.closest('[data-heroe]'); if (!b) return; const H = HEROES[b.dataset.heroe]; sonar(b.dataset.heroe); toast(`${H.e} ${H.n}: ${H.h}`); });
    const guardarOpc = () => { opc.heroes = $('#ycHe').checked; opc.acum = $('#ycAc').checked; LS_.set('opc', JSON.stringify(opc)); };
    $('#ycJugar').onclick = () => { guardarOpc(); partida(t, { ...opc, entrena: false }); };
    $('#ycEntrena').onclick = () => { guardarOpc(); partida(t, { n: 2, dif: 'facil', acum: false, entrena: true, heroes: opc.heroes }); };
    setParar(() => {});
  }

  // ---------- Partida ----------
  function partida(t, opc) {
    salir(); let vivo = true, timer = null, relojT = null;
    const pantallaCompleta = () => { try { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen && matchMedia('(pointer:coarse)').matches) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) {} document.body.style.overflow = 'hidden'; };
    const salirCompleta = () => { document.body.style.overflow = ''; try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {} };
    const nombres = mezclar([...NOMBRES]), caras = mezclar([...CARAS]);
    const J = [{ yo: true, n: LS.get('chatNom') || 'Tú', cara: '😎', mano: [] }, ...[...Array(opc.n - 1)].map((_, i) => ({ yo: false, n: nombres[i], cara: caras[i], mano: [], vistos: {} }))];
    let ocupado = false, turnoId = 0, pila = mazo(opc.heroes !== false), desc = [], turno = 0, dir = 1, color = null, acum = 0, yupi = new Set(), vulnerable = null, robado = false, fin_ = false, pistaN = 0;
    for (let k = 0; k < 7; k++) for (const j of J) j.mano.push(pila.pop());
    let ini; do { ini = pila.pop(); if (ini.c === 'w' || ini.v === 'mas4') { pila.unshift(ini); ini = null; } } while (!ini);
    desc.push(ini); color = ini.c;
    G = { J };
    const tope = () => desc[desc.length - 1];
    const sig = (k = 1) => (turno + dir * k + J.length * 4) % J.length;
    const LOG = []; const total = () => J.reduce((a, j) => a + j.mano.length, 0) + pila.length + desc.length;
    const robar = (j, n) => { LOG.push(['robar', J.indexOf(j), n, total()]); for (let i = 0; i < n; i++) { if (!pila.length) { const top = desc.pop(); pila = mezclar(desc.map(x => x.c === 'w' ? { ...x, elegido: undefined } : x)); desc = [top]; } if (pila.length) j.mano.push(pila.pop()); } yupi.delete(J.indexOf(j)); };
    const puede = x => { const T = tope(); if (acum) return opc.acum && ((T.v === 'mas2' && (x.v === 'mas2' || cuatro(x.v))) || (cuatro(T.v) && cuatro(x.v))); return x.c === 'w' || x.c === color || x.v === T.v; };
    const nombreC = x => esHeroe(x) ? HEROES[x.v].n : x.c === 'w' ? (x.v === 'mas4' ? 'Comodín +4' : 'Comodín') : `${COL[x.c].n} ${/^\d$/.test(x.v) ? x.v : { saltar: 'Saltar', reversa: 'Reversa', mas2: '+2' }[x.v]}`;
    const EXPLICA = { saltar: '⦸ <b>Saltar</b>: el siguiente jugador pierde su turno.', reversa: '⇄ <b>Reversa</b>: el juego cambia de sentido.', mas2: '<b>+2</b>: el siguiente roba 2 cartas y pierde el turno.', comodin: '★ <b>Comodín</b>: quien lo juega elige el nuevo color.', mas4: '<b>Comodín +4</b>: elige color y el siguiente roba 4 cartas.', ...Object.fromEntries(Object.entries(HEROES).map(([k, H]) => [k, `${H.e} <b>${H.n}</b>: ${H.h}.`])) };

    // ---- Pintar mesa ----
    function pintar(msg) {
      if (!vivo) return; const T = tope(), yo = J[0], miTurno = turno === 0 && !fin_;
      const ops = J.slice(1).map((j, i) => { const k = i + 1; return `<div class="yc-op${turno === k && !fin_ ? ' turno' : ''}" data-op="${k}"><span class="yc-av">${j.cara}<i class="yc-n">${j.mano.length}</i></span><b class="yc-tag">${escH(j.n)}</b><div class="yc-mini">${[...Array(Math.min(j.mano.length, 7))].map(() => reverso(innerWidth < 600 ? 26 : 34)).join('')}</div><small>${j.mano.length} carta${j.mano.length === 1 ? '' : 's'}</small>${yupi.has(k) && j.mano.length === 1 ? '<span class="yc-burbuja">¡YUPI!</span>' : ''}${vulnerable === k ? '<button class="yc-atrapar" data-atrapar="' + k + '">🫵 ¡No dijo YUPI!</button>' : ''}</div>`; }).join('');
      $('#ycTop').innerHTML = ops;
      $('#ycDesc').innerHTML = desc.slice(-3).map((x, i, L) => `<div class="c" style="transform:rotate(${((x.id * 37) % 24) - 12}deg)">${svgCarta(x, Math.round(Math.min(($('#yc')?.clientWidth || 380) < 600 ? 104 : 150, innerHeight * .2)))}</div>`).join('') + `<div class="yc-colorAct" style="border-color:${COL[color]?.a || '#fff'}"></div>`;
      $('#ycDir').setAttribute('class', 'yc-dir' + (dir < 0 ? ' inv' : '')); $('#ycPilaN').textContent = pila.length;
      const jug = new Set(miTurno ? yo.mano.filter(puede).map(x => x.id) : []);
      const anchoY = $('#yc')?.clientWidth || 380, altoY = innerHeight, wC = Math.round(Math.min(anchoY < 600 ? 104 : 140, altoY * .16, Math.max(anchoY < 600 ? 78 : 96, anchoY / (Math.max(5, yo.mano.length) * .62 + 1)))), solape = Math.round(wC * (yo.mano.length > 9 ? .55 : .38));
      $('#ycMano').innerHTML = yo.mano.map((x, i) => `<div class="c ${miTurno ? (jug.has(x.id) ? 'ok' : 'no') : ''}${opc.entrena && miTurno && jug.has(x.id) && pistaN < 6 ? ' pista' : ''}" data-id="${x.id}" style="margin-left:${i ? -solape : 0}px">${svgCarta(x, wC)}</div>`).join('');
      const bY = $('#ycYupi'), puedeY = (yo.mano.length === 2 && miTurno && jug.size) || (yo.mano.length === 1 && !yupi.has(0));
      bY.disabled = !puedeY || yupi.has(0); bY.classList.toggle('listo', !!puedeY && !yupi.has(0));
      $('#ycPasar').hidden = !(miTurno && robado);
      $('#ycInfo').innerHTML = msg || (fin_ ? '' : miTurno ? (acum ? `⚠️ Acumulado: +${acum}. ${opc.acum ? 'Responde con +2/+4 o roba.' : ''}` : robado ? 'Juega la carta que robaste o pasa' : jug.size ? '👉 Tu turno: elige una carta' : '👉 No tienes carta: toca el mazo para robar') : `Turno de ${escH(J[turno].n)}…`);
    }

    // ---- Animación de carta volando ----
    function volar(desdeEl, haciaEl, html, cb) {
      try { const a = desdeEl.getBoundingClientRect(), b = haciaEl.getBoundingClientRect(), d = document.createElement('div'); d.className = 'yc-vuela'; d.innerHTML = html; d.style.left = a.left + 'px'; d.style.top = a.top + 'px'; document.body.append(d);
        requestAnimationFrame(() => { d.style.transform = `translate(${b.left - a.left + (b.width - a.width) / 2}px,${b.top - a.top}px) rotate(${Math.random() * 30 - 15}deg)`; }); setTimeout(() => { d.remove(); cb && cb(); }, 470); } catch (e) { cb && cb(); }
    }

    // ---- Jugar una carta ----
    function jugar(k, x, colorElegido) {
      ocupado = false; const j = J[k]; LOG.push(['jugar', k, x.c + x.v, x.id, total()]); if (!j.mano.some(c => c.id === x.id)) { LOG.push(['DUP', k, x.id]); return; } /* ya se jugó (doble toque) */ j.mano = j.mano.filter(c => c.id !== x.id); if (LOG.length > 200) LOG.splice(0, 100); if (x.c === 'w') x.elegido = colorElegido;
      desc.push(x); color = x.c === 'w' ? colorElegido : x.c; robado = false;
      FX.son(esp(x) ? 'combo' : 'swish'); FX.vibrar(15); if (k === 0 && esp(x)) avanzar('esp');
      if (opc.entrena && esp(x)) tip(EXPLICA[x.v] + (k ? ` <i>(${escH(j.n)} la jugó)</i>` : ''), 2600);
      // ¡YUPI!: si queda con 1 carta y no lo dijo, se puede atrapar hasta que juegue el siguiente
      if (j.mano.length === 1 && !yupi.has(k)) { vulnerable = k; if (k) setTimeout(() => botAtrapa(k), 0); else botsAtrapanAlHumano(); } else if (vulnerable === k) vulnerable = null;
      if (!j.mano.length) return ganar(k);
      let salto = 1;
      if (x.v === 'reversa') { dir = -dir; if (J.length === 2) salto = 2; }
      if (x.v === 'saltar') salto = 2;
      if (esHeroe(x)) { sonar(x.v); destello(HEROES[x.v]); }
      if (x.v === 'bruja') salto = 2;
      if (x.v === 'idol') { J.forEach((o, i) => { if (i !== k) robar(o, 1); }); botReacciona(k, 'feliz'); }
      if (x.v === 'coquito') { const v = J.filter((o, i) => i !== k).sort((a, b) => a.mano.length - b.mano.length)[0]; if (v && v.mano.length < j.mano.length) { botReacciona(J.indexOf(v), 'sufre'); const tmp = j.mano; j.mano = v.mano; v.mano = tmp; yupi.delete(k); yupi.delete(J.indexOf(v)); if (opc.entrena || j.yo || v.yo) tip(`🐶 ¡Coquito cambió las cartas de ${escH(j.n)} con ${escH(v.n)}!`, 2200); } }
      if (x.v === 'mas2' || cuatro(x.v)) { acum += x.v === 'mas2' ? 2 : 4; const s = J[sig()]; const responde = opc.acum && s.mano.some(c => (x.v === 'mas2' && (c.v === 'mas2' || cuatro(c.v))) || (cuatro(x.v) && cuatro(c.v)));
        if (!responde) { robar(s, acum); FX.son('error'); botReacciona(J.indexOf(s), 'sufre'); if (!s.yo && k !== 0) botReacciona(k, 'feliz'); if (opc.entrena && s.yo) tip(`Te tocó robar ${acum} cartas y pierdes el turno.`, 2000); acum = 0; salto = 2; } }
      if (vulnerable !== null && vulnerable !== k) vulnerable = null;
      turno = sig(salto); siguienteTurno();
    }

    function botsAtrapanAlHumano() { // los bots pueden atraparte si no dijiste ¡YUPI!
      const prob = { facil: .35, medio: .7, dificil: .95 }[opc.dif]; if (Math.random() > prob) return;
      setTimeout(() => { if (!vivo || vulnerable !== 0 || yupi.has(0) || J[0].mano.length !== 1) return; const quien = J[1 + Math.floor(Math.random() * (J.length - 1))]; robar(J[0], 2); vulnerable = null; FX.son('error'); FX.vibrar(80); tip(`🫵 ${escH(quien.n)} te atrapó sin decir <b>¡YUPI!</b>: +2 cartas`, 2200); pintar(); }, 1200 + Math.random() * 1600);
    }
    function botAtrapa(k) { // un bot se olvida de decir ¡YUPI! según la dificultad
      const olvida = { facil: .45, medio: .2, dificil: .03 }[opc.dif];
      if (Math.random() > olvida) { yupi.add(k); vulnerable = null; FX.son('punto'); pintar(); return; }
      pintar(); // queda vulnerable: el humano puede atraparlo; los otros bots también
      if (J.length > 2) setTimeout(() => { if (!vivo || vulnerable !== k) return; if (Math.random() < { facil: .2, medio: .45, dificil: .8 }[opc.dif]) { robar(J[k], 2); vulnerable = null; FX.son('error'); tip(`🫵 Atraparon a ${escH(J[k].n)} sin decir ¡YUPI!: +2 cartas`, 1800); pintar(); } }, 2200 + Math.random() * 1500);
    }

    // ---- Turno ----
    function siguienteTurno() {
      clearTimeout(timer); clearInterval(relojT); turnoId++; pintar(); if (!vivo || fin_) return;
      if (acum && !J[turno].mano.some(puede)) { robar(J[turno], acum); FX.son('error'); acum = 0; turno = sig(); return setTimeout(siguienteTurno, 500); }
      if (turno === 0) { reloj(opc.entrena ? 60 : 20); return; }
      const tid = turnoId; timer = setTimeout(() => { if (tid === turnoId) turnoBot(turno); }, 900 + Math.random() * 700);
    }
    function reloj(seg) {
      let s = seg; const el = $('#ycReloj'); const dib = () => { if (!el) return; const p = s / seg; el.innerHTML = `<svg viewBox="0 0 36 36" class="yc-reloj"><circle cx="18" cy="18" r="15" fill="#0006" stroke="#ffffff33" stroke-width="3"/><circle cx="18" cy="18" r="15" fill="none" stroke="${p > .4 ? '#4ade80' : p > .2 ? '#facc15' : '#ef4444'}" stroke-width="3" stroke-dasharray="${(94 * p).toFixed(1)} 94" transform="rotate(-90 18 18)" stroke-linecap="round"/><text x="18" y="22" text-anchor="middle" font-size="11" font-weight="900" fill="#fff">${s}</text></svg>`; };
      dib(); relojT = setInterval(() => { s--; dib(); if (s <= 5 && s > 0) FX.son('click'); if (s <= 0) { clearInterval(relojT); if (turno === 0 && !fin_) { if (!robado) { accionRobar(); } if (turno === 0) pasar(); } } }, 1000);
    }
    function accionRobar() {
      if (turno !== 0 || robado || fin_ || ocupado) return; const yo = J[0];
      if (acum) { robar(yo, acum); acum = 0; FX.son('error'); turno = sig(); return siguienteTurno(); }
      robar(yo, 1); robado = true; FX.son('pop'); pistaN++;
      const nueva = yo.mano[yo.mano.length - 1]; volar($('#ycPila'), $('#ycMano'), reverso(70));
      if (!puede(nueva)) { pintar('Robaste: no sirve. Pasa el turno…'); setTimeout(() => { if (turno === 0 && robado) pasar(); }, 900); } else pintar();
    }
    function pasar() { if (turno !== 0) return; robado = false; clearInterval(relojT); turno = sig(); siguienteTurno(); }

    // ---- IA ----
    function elegirColor(j) { const cnt = {}; for (const c of j.mano) if (c.c !== 'w') cnt[c.c] = (cnt[c.c] || 0) + 1;
      if (opc.dif === 'dificil') { const prox = J[sig()], falta = prox.vistos ? Object.entries(prox.vistos).sort((a, b) => b[1] - a[1])[0]?.[0] : null; const mejor = Object.entries(cnt).sort((a, b) => b[1] - a[1]); if (mejor[0] && falta && cnt[falta]) return falta; if (mejor[0]) return mejor[0][0]; }
      return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || azar(COLS); }
    function turnoBot(k) {
      if (!vivo || fin_ || turno !== k || ocupado) return; const j = J[k]; let ops = j.mano.filter(puede);
      if (!ops.length) { if (acum) { robar(j, acum); acum = 0; turno = sig(); return siguienteTurno(); }
        robar(j, 1); FX.son('pop'); volar($('#ycPila'), document.querySelector(`[data-op="${k}"]`) || $('#ycPila'), reverso(50)); const nv = j.mano[j.mano.length - 1]; pintar();
        // recuerda qué color le faltaba al bot (para la IA difícil)
        for (const o of J) if (o.vistos && o !== j) o.vistos = o.vistos; if (j.vistos) j.vistos[color] = (j.vistos[color] || 0) + 1;
        if (puede(nv)) ops = [nv]; else { turno = sig(); return setTimeout(siguienteTurno, 500); } }
      let x;
      const prox = J[sig()], proxPocas = prox.mano.length <= 2;
      if (opc.dif === 'facil') x = azar(ops);
      else { const val = c => { let s = 0; if (c.c === 'w') s -= 30; if (esp(c) && c.c !== 'w') s += proxPocas ? 40 : 8; if (cuatro(c.v)) s += proxPocas ? 60 : -20; if (c.v === 'bruja') s += proxPocas ? 50 : -10; if (c.v === 'idol') s += J.length > 2 ? 30 : 5; if (c.v === 'coquito') { const menor = Math.min(...J.filter(o => o !== j).map(o => o.mano.length)); s += j.mano.length - 1 - menor >= 3 ? 80 : -60; } if (/^\d$/.test(c.v)) s += +c.v; const mismos = j.mano.filter(o => o.c === c.c).length; s += mismos * 3; if (opc.dif === 'dificil' && j.mano.length <= 3 && c.c === 'w') s += 25; return s; };
        x = ops.sort((a, b) => val(b) - val(a))[0]; }
      if (j.mano.length === 2 && Math.random() > { facil: .45, medio: .2, dificil: .03 }[opc.dif]) yupi.add(k); // dice ¡YUPI! antes de jugar
      const desde = document.querySelector(`[data-op="${k}"]`) || $('#ycPila');
      ocupado = true; volar(desde, $('#ycDesc'), svgCarta(x, 90), () => { if (vivo) jugar(k, x, x.c === 'w' ? elegirColor(j) : null); else ocupado = false; });
    }

    // ---- Final ----
    function ganar(k) {
      fin_ = true; clearTimeout(timer); clearInterval(relojT); pintar(); const yo = k === 0;
      const pts = J.filter((j, i) => i !== k).reduce((a, j) => a + j.mano.reduce((s, c) => s + valor(c), 0), 0);
      const st = JSON.parse(LS_.get('stats') || '{"g":0,"p":0}'); st.p++; if (yo) st.g++; LS_.set('stats', JSON.stringify(st)); avanzar('jugar'); if (yo) avanzar('ganar');
      const nuevos = yo ? [...REVERSOS, ...MESAS].filter(x => x.min === st.g) : [];
      if (J.length > 1) { const q = yo ? 1 + Math.floor(Math.random() * (J.length - 1)) : k; setTimeout(() => burbuja(q, yo ? '¡Bien jugado! 👏' : '🥳'), 300); }
      if (yo) { FX.confeti(); FX.voz?.('¡Ganaste! ¡Eres un crack de las cartas!', { forzar: true }); } else { FX.son('perder'); }
      const bono = yo ? Math.min(400, +LS_.get('bono') || 0) : 0; if (bono) LS_.set('bono', 0);
      const puntos = (yo ? Math.min(4000, pts * ({ facil: 1, medio: 1.5, dificil: 2 }[opc.dif]) | 0) + (opc.entrena ? 0 : 50) : Math.min(60, (7 - J[0].mano.length) * 8)) + bono;
      modal(`<div style="font-size:3rem">${yo ? '🏆' : J[k].cara}</div><h2 style="margin:4px 0">${yo ? '¡Ganaste!' : escH(J[k].n) + ' ganó'}</h2><p style="opacity:.9">${yo ? `Sumaste <b>${puntos}</b> puntos por las cartas que les quedaron a los demás${bono ? ` (incluye 🎁 +${bono} de misiones)` : ''}.` : `Te quedaron ${J[0].mano.length} cartas. ¡La próxima es tuya!`}</p>${nuevos.length ? `<p>🎁 ¡Desbloqueaste: <b>${nuevos.map(x => x.n).join(', ')}</b>!</p>` : ''}
${(() => { const m = misiones(); return `<div class="yc-misfin"><b>🎯 Misiones de hoy</b>${MIS.map(x => { const v = Math.min(x.meta, m.p[x.k] || 0); return `<div><span style="min-width:150px">${x.n}</span><i><u style="width:${v / x.meta * 100}%"></u></i><b>${v >= x.meta ? '✅' : v + '/' + x.meta}</b></div>`; }).join('')}</div>`; })()}
<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px"><button class="yc-yupi" id="ycOtra">🔁 Otra partida</button><button class="yc-btn" id="ycMenu">🃏 Menú</button><button class="yc-btn" id="ycFin">💾 Guardar puntos</button></div>`);
      $('#ycOtra').onclick = () => partida(t, opc); $('#ycMenu').onclick = () => { salirCompleta(); menu(t); }; $('#ycFin').onclick = () => { vivo = false; salirCompleta(); A.fin(t, puntos, yo ? `¡Ganaste a la IA (${opc.dif})!` : 'Buena partida'); };
    }
    function burbuja(k, txt) { if (!vivo) return; const el = k === 0 ? $('#yc .yc-yoav') : $(`#ycTop [data-op="${k}"]`); if (!el) return; const r = el.getBoundingClientRect(); const d = document.createElement('div'); d.className = 'yc-bur' + ([...txt].length <= 2 ? ' e' : ''); d.textContent = txt; d.style.left = (r.left + r.width / 2) + 'px'; d.style.top = (r.top + (k === 0 ? 0 : r.height * .75)) + 'px'; $('#yc').append(d); setTimeout(() => d.remove(), 2600); }
    let ultReac = 0;
    function botReacciona(k, tipo) { if (!vivo || !J[k] || J[k].yo || Date.now() - ultReac < 2500 || Math.random() > .4) return; ultReac = Date.now(); const L = { sufre: ['¡Oh no! 😱', '😭', '😡', '¡Noooo!'], feliz: ['🥳', '😎', '¡Increíble! 🤩', '🔥'], yupi: ['😱', '¡Date prisa! ⏰', '🤔'], fin: ['¡Buena partida! 🤝', '¡Bien jugado! 👏', '🥳'] }[tipo]; setTimeout(() => burbuja(k, L[Math.floor(Math.random() * L.length)]), 500 + Math.random() * 700); }
    function destello(H) { const d = document.createElement('div'); d.className = 'yc-heroe'; d.innerHTML = `<span>${H.e}</span><b>${H.n}</b><small>${H.h}</small>`; d.style.background = `radial-gradient(circle,${H.g[0]}ee,${H.g[1]}dd 55%,transparent 72%)`; $('#yc')?.append(d); setTimeout(() => d.remove(), 1700); }
    function modal(h) { const d = document.createElement('div'); d.className = 'yc-modal'; d.innerHTML = `<div class="yc-caja">${h}</div>`; $('#yc').append(d); return d; }
    function tip(h, ms = 2000) { const d = document.createElement('div'); d.className = 'yc-tip'; d.innerHTML = h; $('#yc')?.append(d); setTimeout(() => d.remove(), ms); }
    function elegirColorHumano(cb) {
      const d = modal(`<h3 style="margin:0">Elige el nuevo color</h3><div class="yc-colores">${COLS.map(c => `<button data-col="${c}" style="background:linear-gradient(135deg,${COL[c].a},${COL[c].b})">${COL[c].s} ${COL[c].n}</button>`).join('')}</div>`);
      d.onclick = e => { const b = e.target.closest('[data-col]'); if (!b) return; d.remove(); cb(b.dataset.col); };
    }

    // ---- Montaje ----
    const M = MESAS.find(m => m.k === LS_.get('mesa')) || MESAS[0];
    stage(`<style>${CSS}</style><div id="yc" class="full"><div class="fondo" style="background:${M.g}"></div><div class="luz"></div><div class="capa">
<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><button class="yc-btn" id="ycSalir" style="padding:6px 12px">← Menú</button><b>🃏 YUPI CARDS${opc.entrena ? ' · 🎓 Entrenamiento' : ''}</b><button class="yc-btn" id="ycMus" style="padding:6px 10px" title="Música">${LS.get('arcMusica') === '0' ? '🔇' : '🎵'}</button><span id="ycReloj" style="width:46px;height:46px"></span></div><div class="yc-top" id="ycTop"></div></div>
<div class="yc-centro"><div class="yc-mesa"></div><div class="yc-pila" id="ycPila" title="Robar carta" style="width:${innerWidth < 600 ? 84 : 112}px;height:${innerWidth < 600 ? 122 : 162}px">${[0, 1, 2].map(i => `<div style="position:absolute;top:${-i * 3}px;left:${i * 2}px">${reverso(innerWidth < 600 ? 84 : 112)}</div>`).join('')}<span id="ycPilaN" style="position:absolute;bottom:-22px;left:0;right:0;text-align:center;font-size:.8rem;opacity:.8"></span></div>
<div class="yc-desc" id="ycDesc"></div><svg class="yc-dir" id="ycDir" viewBox="0 0 200 200" aria-hidden="true"><defs><marker id="ycFl" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#fde68a"/></marker></defs><path d="M100 12A88 88 0 0 1 188 100" fill="none" stroke="#fde68a" stroke-width="6" stroke-linecap="round" marker-end="url(#ycFl)"/><path d="M100 188A88 88 0 0 1 12 100" fill="none" stroke="#fde68a" stroke-width="6" stroke-linecap="round" marker-end="url(#ycFl)"/></svg><div class="yc-info" id="ycInfo"></div></div>
<div class="yc-yo"><div class="yc-mano" id="ycMano"></div><div class="yc-barra"><div class="yc-yoav" title="Cambia tu foto en tu perfil de Yupitok">${typeof avImg === 'function' ? avImg(LS.get('chatAv') || 'a01', 58) : '😎'}<b class="yc-tag">${escH(LS.get('chatNom') || 'Tú')}</b></div><button class="yc-btn yc-reacBtn" id="ycReac" title="Reacciones">💬</button><button class="yc-yupi" id="ycYupi">¡YUPI!</button><button class="yc-btn" id="ycPasar" hidden>⏭ Pasar</button></div></div></div></div>`);
    $('#ycSalir').onclick = () => { vivo = false; clearTimeout(timer); clearInterval(relojT); salirCompleta(); menu(t); };
    $('#ycMus').onclick = e => { FX.alternar?.('arcMusica', e.currentTarget); e.currentTarget.textContent = LS.get('arcMusica') === '0' ? '🔇' : '🎵'; if (LS.get('arcMusica') !== '0') FX.musica?.('cartas'); };
    pantallaCompleta(); FX.musica?.('cartas');
    $('#ycPila').onclick = () => accionRobar();
    $('#ycPasar').onclick = () => pasar();
    $('#ycYupi').onclick = () => { if (J[0].mano.length <= 2) { yupi.add(0); avanzar('yupi'); if (vulnerable === 0) vulnerable = null; FX.son('moneda'); FX.voz?.('¡Yupi!', { forzar: true }); tip('🎉 ¡Dijiste <b>¡YUPI!</b>!', 1100); pintar(); } };
    $('#ycReac').onclick = () => { const p = $('#yc .yc-reacs'); if (p) return p.remove(); FX.son('click'); const d = document.createElement('div'); d.className = 'yc-reacs'; d.innerHTML = `<div class="em">${EMOJIS.map(e => `<button data-r="${e}">${e}</button>`).join('')}</div><div class="fr">${FRASES.map(f => `<button data-r="${f}">${f}</button>`).join('')}</div>`; d.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; d.remove(); if (Date.now() - (window.__ycR || 0) < 1500) return; window.__ycR = Date.now(); burbuja(0, b.dataset.r); if (J.length > 1 && Math.random() < .5) setTimeout(() => burbuja(1 + Math.floor(Math.random() * (J.length - 1)), ['😂', '😎', '🤔', '¡Suerte! 🍀', '❤️'][Math.floor(Math.random() * 5)]), 1300); }; $('#yc').append(d); };
    $('#ycTop').onclick = e => { const b = e.target.closest('[data-atrapar]'); if (!b) return; const k = +b.dataset.atrapar; if (vulnerable !== k) return; robar(J[k], 2); vulnerable = null; FX.son('punto'); tip(`🫵 ¡Atrapaste a ${escH(J[k].n)}! Roba 2 cartas`, 1600); pintar(); };
    $('#ycMano').onclick = e => {
      const el = e.target.closest('[data-id]'); if (!el || turno !== 0 || fin_ || ocupado || document.querySelector('#yc .yc-colores')) return; const x = J[0].mano.find(c => c.id === +el.dataset.id);
      if (!x || !puede(x)) { FX.son('error'); if (opc.entrena) tip(acum ? 'Hay un + acumulado: responde con +2/+4 o toca el mazo para robar.' : `Esa carta no sirve: necesitas <b>${COL[color]?.n || ''}</b> o el número/símbolo de la carta de la mesa.`, 2200); return; }
      if (robado && x.id !== J[0].mano[J[0].mano.length - 1].id) { FX.son('error'); return; }
      clearInterval(relojT); pistaN++;
      const ir = col => { ocupado = true; volar(el, $('#ycDesc'), svgCarta(x, 90), () => jugar(0, x, col)); };
      if (x.c === 'w') elegirColorHumano(ir); else ir(null);
    };
    window.addEventListener('resize', () => vivo && pintar());
    if (opc.entrena) tip('🎓 <b>Entrenamiento</b>: las cartas que puedes jugar brillan. Juega por <b>color</b> o por <b>número</b>. Si ninguna sirve, toca el mazo.', 4200);
    if (esp(ini) && ini.v !== 'mas4') { if (ini.v === 'saltar') turno = sig(); if (ini.v === 'reversa') dir = -1; if (ini.v === 'mas2') { robar(J[0], 2); turno = sig(); } }
    siguienteTurno();
    setParar(() => { vivo = false; clearTimeout(timer); clearInterval(relojT); salirCompleta(); });
    window.__yc = { log: () => LOG.slice(-25), estado: () => ({ turno, color, acum, dir, top: tope(), manos: J.map(j => j.mano.length), pila: pila.length, desc: desc.length, fin: fin_, vulnerable, yupi: [...yupi] }), mano: () => J[0].mano };
  }
  JUEGOS.yupicards = menu;
})();
