// 🎵 Motor de audio de los juegos: música de fondo generada en vivo (sin archivos, composiciones propias),
// efectos de sonido sintetizados y voces de personajes con la voz del propio navegador. Todo respeta el botón de silencio.
(() => {
  const FX = window.FX; if (!FX) return;
  let AC = null, ruido = null, ultSon = {};
  const mute = () => LS.get('arcSonido') === '0', sinMusica = () => LS.get('arcMusica') === '0', sinVoz = () => LS.get('arcVoz') === '0';
  const ctx = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return null; } return AC; };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function bufRuido() { if (ruido) return ruido; const n = AC.sampleRate; ruido = AC.createBuffer(1, n, AC.sampleRate); const d = ruido.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return ruido; }
  function tono(f, t, dur, tipo = 'square', vol = .1, dest, f2, ataque = .005) {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(dest || AC.destination); o.start(t); o.stop(t + dur + .03);
  }
  function soplo(t, dur, vol, dest, filtro = 'highpass', fq = 6000, fq2) {
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = bufRuido(); f.type = filtro; f.frequency.setValueAtTime(fq, t); if (fq2) f.frequency.exponentialRampToValueAtTime(fq2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(dest || AC.destination); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  const bombo = (t, vol, dest) => tono(150, t, .18, 'sine', vol, dest, 40, .002);

  // ---------- Efectos ----------
  const SONES = {
    punto: t => { tono(880, t, .07, 'square', .05); tono(1320, t + .06, .1, 'square', .05); },
    moneda: t => { tono(988, t, .06, 'square', .06); tono(1319, t + .06, .22, 'square', .06); },
    click: t => tono(1200, t, .03, 'sine', .05),
    swish: t => soplo(t, .16, .12, null, 'bandpass', 800, 3500),
    error: t => { tono(220, t, .12, 'square', .06); tono(165, t + .1, .18, 'square', .06); },
    ganar: t => [523, 659, 784, 1047].forEach((f, i) => tono(f, t + i * .07, .18, 'square', .06)),
    perder: t => [392, 330, 262, 196].forEach((f, i) => tono(f, t + i * .12, .22, 'triangle', .09)),
    choque: t => { soplo(t, .08, .15, null, 'lowpass', 1800); tono(300, t, .06, 'square', .04, null, 120); },
    banda: t => tono(180, t, .05, 'triangle', .06),
    tronera: t => tono(240, t, .25, 'sine', .12, null, 70),
    taco: t => soplo(t, .05, .2, null, 'bandpass', 2500),
    explosion: t => { soplo(t, .7, .45, null, 'lowpass', 2400, 120); bombo(t, .5); tono(90, t, .5, 'sawtooth', .08, null, 30); },
    splat: t => { soplo(t, .09, .12, null, 'bandpass', 1400, 400); tono(500, t, .05, 'sine', .04, null, 200); },
    plantar: t => { soplo(t, .12, .12, null, 'lowpass', 900); tono(330, t + .03, .1, 'sine', .07, null, 660); },
    pop: t => tono(600, t, .08, 'sine', .08, null, 1400),
    jefe: t => { [0, .25, .5].forEach(d => { tono(110, t + d, .22, 'sawtooth', .09, null, 104); bombo(t + d, .4); }); },
    sirena: t => { for (let i = 0; i < 3; i++) tono(600, t + i * .32, .3, 'square', .05, null, 900); },
    combo: t => [659, 784, 988, 1319].forEach((f, i) => tono(f, t + i * .045, .12, 'square', .055)),
    nivel: t => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tono(f, t + i * .09, i === 5 ? .5 : .14, 'square', .07)),
    salto: t => tono(300, t, .14, 'square', .045, null, 700),
    hielo: t => { tono(1800, t, .12, 'sine', .04, null, 2600); soplo(t, .1, .05, null, 'highpass', 8000); },
    comer: t => { for (let i = 0; i < 2; i++) soplo(t + i * .09, .06, .1, null, 'bandpass', 900); },
  };
  FX.son = function (tipo) {
    if (mute() || !ctx()) return;
    const ahora = performance.now(); if (ultSon[tipo] && ahora - ultSon[tipo] < 45) return; ultSon[tipo] = ahora; // evita saturar
    (SONES[tipo] || SONES.click)(AC.currentTime + .005);
  };

  // ---------- Música de fondo (composiciones generadas) ----------
  // Cada tema: tempo, nota base, progresión de acordes (en semitonos), escala de la melodía, timbres e intensidad.
  const TEMAS = {
    huerto: { bpm: 116, base: 55, prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]], esc: [0, 2, 4, 7, 9, 12, 14, 16], arp: 'square', lead: 'triangle', semilla: 7 },
    jefe: { bpm: 142, base: 50, prog: [[0, 3, 7], [0, 3, 7], [8, 12, 15], [7, 10, 14]], esc: [0, 3, 5, 7, 8, 12, 15], arp: 'sawtooth', lead: 'square', semilla: 13 },
    joyas: { bpm: 96, base: 57, prog: [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]], esc: [0, 2, 4, 7, 9, 12, 14, 16], arp: 'triangle', lead: 'sine', semilla: 3 },
    mundo: { bpm: 104, base: 53, prog: [[0, 4, 7], [2, 6, 9], [9, 12, 16], [7, 11, 14]], esc: [0, 2, 4, 6, 7, 9, 11, 12, 14], arp: 'triangle', lead: 'square', semilla: 21 },
    espacio: { bpm: 84, base: 52, prog: [[0, 4, 11], [5, 9, 16], [9, 12, 19], [7, 11, 17]], esc: [0, 4, 7, 11, 12, 16, 19], arp: 'sine', lead: 'sine', semilla: 5 },
    batalla: { bpm: 132, base: 50, prog: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 11, 14]], esc: [0, 2, 3, 5, 7, 8, 11, 12, 14], arp: 'sawtooth', lead: 'square', semilla: 17 },
    reina: { bpm: 88, base: 55, prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], esc: [0, 2, 4, 7, 9, 12, 14, 16, 19], arp: 'triangle', lead: 'sine', semilla: 33 },
    arcade: { bpm: 128, base: 52, prog: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], esc: [0, 3, 5, 7, 10, 12, 15], arp: 'square', lead: 'square', semilla: 11 },
  };
  let M = null;
  function melodia(T, n) {
    let s = T.semilla * 9301 + n; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const out = []; let i = 3; for (let k = 0; k < 64; k++) { if (k % 4 === 3 && r() < .45) { out.push(null); continue; } i = Math.max(0, Math.min(T.esc.length - 1, i + Math.round((r() - .5) * 4))); out.push(r() < .2 && k % 2 ? null : T.esc[i]); }
    return out;
  }
  function pasoMusica(p, t) {
    const T = M.T, sx = 60 / T.bpm / 4, comp = Math.floor(p / 16), ac = T.prog[comp % T.prog.length], k = p % 16, I = M.int, d = M.out;
    // batería
    if (k % 8 === 0 || (I > 1 && k === 10)) bombo(t, .35, d);
    if (k % 8 === 4) soplo(t, .12, .16, d, 'highpass', 1800);
    if (k % 2 === 0 || I > 1) soplo(t, k % 4 === 2 ? .05 : .025, I > 1 ? .07 : .05, d, 'highpass', 8000);
    // bajo
    if (k % 4 === 0 || (k % 4 === 3 && I > 1)) tono(mtof(T.base - 12 + ac[0] + (k === 8 ? 12 : 0)), t, sx * 3, 'triangle', .16, d);
    // arpegio
    if (k % (I > 1 ? 1 : 2) === 0) tono(mtof(T.base + 12 + ac[(k / (I > 1 ? 1 : 2)) % 3 | 0]), t, sx * .9, T.arp, .028, d);
    // melodía (dos frases que se alternan)
    const mel = M.mel[comp % 8 < 4 ? 0 : 1][(p % 64)];
    if (mel != null && k % 2 === 0) tono(mtof(T.base + 12 + mel), t, sx * 1.8, T.lead, .045, d, null, .01);
  }
  function programar() { if (!M || !AC) return; while (M.t < AC.currentTime + .15) { pasoMusica(M.p, M.t); M.t += 60 / M.T.bpm / 4; M.p++; } }
  FX.musica = function (tema) {
    if (mute() || sinMusica() || !TEMAS[tema] || !ctx()) return;
    if (M && M.tema === tema) return; FX.pararMusica();
    const out = AC.createGain(); out.gain.setValueAtTime(.0001, AC.currentTime); out.gain.exponentialRampToValueAtTime(.55, AC.currentTime + 1.2); out.connect(AC.destination);
    const T = TEMAS[tema]; M = { tema, T, p: 0, t: AC.currentTime + .1, out, int: 1, mel: [melodia(T, 1), melodia(T, 2)] }; M.timer = setInterval(programar, 30); programar();
  };
  FX.pararMusica = function () { if (!M) return; const m = M; M = null; clearInterval(m.timer); try { m.out.gain.cancelScheduledValues(AC.currentTime); m.out.gain.setValueAtTime(m.out.gain.value, AC.currentTime); m.out.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + .4); setTimeout(() => m.out.disconnect(), 600); } catch (e) {} };
  FX.intensidad = n => { if (M) M.int = n; };
  FX.temaActual = () => M?.tema;
  document.addEventListener('visibilitychange', () => { if (!AC) return; if (document.hidden) { AC.suspend(); try { speechSynthesis.cancel(); } catch (e) {} } else AC.resume(); });

  // ---------- Voces de personajes ----------
  let vozEs = null, ultVoz = 0;
  const elegirVoz = () => { try { const v = speechSynthesis.getVoices().filter(x => /^es/i.test(x.lang)); vozEs = v.find(x => /419|MX|US|PE|CO|AR/i.test(x.lang)) || v[0] || null; } catch (e) {} };
  if (window.speechSynthesis) { elegirVoz(); speechSynthesis.onvoiceschanged = elegirVoz; }
  FX.voz = function (txt, o = {}) {
    if (mute() || sinVoz() || !window.speechSynthesis) return false;
    const ahora = Date.now(); if (!o.forzar && ahora - ultVoz < (o.espera ?? 2200)) return false; ultVoz = ahora;
    try { if (o.cortar || speechSynthesis.pending) speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = vozEs?.lang || 'es-ES'; if (vozEs) u.voice = vozEs; u.pitch = o.tono ?? 1; u.rate = o.vel ?? 1.1; u.volume = o.vol ?? 1; speechSynthesis.speak(u); return true; } catch (e) { return false; }
  };
  FX.callar = () => { try { speechSynthesis.cancel(); } catch (e) {} };

  // ---------- Botones de música y voces ----------
  FX.botones = (estilo = '') => `<button onclick="FX.alternar('arcMusica', this, '🎵', '🎵̸')" title="Música" style="background:none;border:0;font-size:1.05rem;cursor:pointer;${LS.get('arcMusica') === '0' ? 'opacity:.35;' : ''}${estilo}">🎵</button><button onclick="FX.alternar('arcVoz', this)" title="Voces" style="background:none;border:0;font-size:1.05rem;cursor:pointer;${LS.get('arcVoz') === '0' ? 'opacity:.35;' : ''}${estilo}">🗣️</button>`;
  FX.alternar = (k, b) => { const off = LS.get(k) !== '0'; LS.set(k, off ? '0' : '1'); b.style.opacity = off ? .35 : 1; if (k === 'arcMusica') { if (off) FX.pararMusica(); else if (FX._ultimoTema) FX.musica(FX._ultimoTema); } if (k === 'arcVoz' && off) FX.callar(); };
  const musicaOrig = FX.musica; FX.musica = t => { FX._ultimoTema = t; musicaOrig(t); };
})();
