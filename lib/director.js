// Director de efectos (idea de director.js de Video Relaunch): lee la narración palabra por
// palabra y decide, como un editor, dónde poner punch zoom, flash, glitch y UN solo "shock"
// (sacudida + destello + golpe) como clímax. Respeta respiros entre efectos para no saturar.
// También decide los efectos de sonido por palabra ("dinero" -> monedas), como sfx_plan.py.
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');

// Palabras que piden énfasis visual.
const ENFASIS = /^(nunca|jamas|secreto|increible|peligr|cuidado|verdad|mentira|millon|gratis|nadie|todos|siempre|prohibid|error|explot|boom|sorpres|mejor|peor|ojo|atencion|imposible|mortal|brutal|real|enorme|gigante|minuto|segundo|ahora|hoy|nadie|ninguno|cero|doble|triple|mitad|clave|truco|nuevo|primer|ultimo)/;

// Efectos de sonido por palabra (las reglas por defecto de sfx_plan.py).
const SFX_REGLAS = [
  { frases: ['de repente', 'explot*', 'explos*', 'estall*', 'boom', 'golpe*'], cat: ['impacto', 'boom'] },
  { frases: ['la verdad', 'en realidad', 'resulta que', 'sorprend*', 'increible'], cat: ['dramatico', 'sorpresa'] },
  { frases: ['misterio', 'secreto', 'oscur*', 'terror', 'miedo', 'leyenda'], cat: ['suspenso'] },
  { frases: ['corazon', 'latia', 'panico', 'nervios'], cat: ['latido'] },
  { frases: ['dinero', 'millones', 'millonario', 'dolares', 'soles', 'pesos', 'fortuna', 'ahorr*', 'gast*'], cat: ['monedas'] },
  { frases: ['camin*', 'pasos', 'se acerco', 'corr*'], cat: ['pasos'] },
  { frases: ['vidrio', 'cristal', 'rompio'], cat: ['vidrio'] },
  { frases: ['telefono', 'llamada', 'celular', 'notificacion'], cat: ['notificacion'] },
  { frases: ['campeon', 'logro', 'triunfo', 'exito', 'ganaste'], cat: ['aplausos'] },
  { frases: ['incorrecto', 'fracaso', 'fallo', 'error'], cat: ['error'] },
  { frases: ['correcto', 'acerto', 'perfecto'], cat: ['acierto'] },
  { frases: ['jaja*', 'chiste', 'gracioso', 'broma'], cat: ['risa'] },
];
const AMBIENTES = [
  { frases: ['lluvia', 'llovia', 'tormenta'], cat: 'ambiente_lluvia' },
  { frases: ['viento', 'ventisca'], cat: 'ambiente_viento' },
  { frases: ['ciudad', 'calle', 'trafico'], cat: 'ambiente_ciudad' },
  { frases: ['bosque', 'selva', 'pajaros', 'naturaleza'], cat: 'ambiente_naturaleza' },
  { frases: ['cocina', 'cafe', 'restaurante'], cat: 'ambiente_cafe' },
];

const compilar = f => f.split(' ').map(t => ({ t: norm(t.replace('*', '')), pref: t.endsWith('*') })).filter(x => x.t);
const casa = (tok, i, fr) => i + fr.length <= tok.length && fr.every((p, k) => p.pref ? tok[i + k].startsWith(p.t) : tok[i + k] === p.t);

// words: [{texto, inicio, fin}] (tiempos absolutos). scenes: [{inicio, fin}] para el respaldo.
// densidad: baja | media | alta. Devuelve { fx: [{t, tipo, k}], sfx: [{t, cat, vol}], amb: [{t, fin, cat}] }
function plan(words, dur, { scenes = [], densidad = 'media' } = {}) {
  const fx = [], sfx = [], amb = [];
  const porMin = { baja: 4, media: 7, alta: 10 }[densidad] || 7;
  const maxFx = Math.max(2, Math.round(dur / 60 * porMin));
  const tok = (words || []).map(w => norm(w.texto));

  // 1) Candidatos con puntaje
  const cand = [];
  (words || []).forEach((w, i) => {
    let p = 0;
    if (ENFASIS.test(tok[i])) p += 3;
    if (/\d/.test(w.texto)) p += 2;
    if (/[!¡]/.test(w.texto)) p += 2;
    if (/[?¿]/.test(w.texto)) p += 1;
    if (i > 0 && w.inicio - words[i - 1].fin > 0.35) p += 1.5; // tras una pausa dramática
    if (w.texto.length > 9) p += 0.5;
    if (p >= 2) cand.push({ t: w.inicio, p, i });
  });
  // Sin palabras (sin Whisper): un efecto al inicio de cada escena.
  // Sin palabras (sin transcripción): efectos al cambiar de escena o, si no hay escenas, cada ~3.5 s.
  if (!cand.length) {
    const marks = scenes.length > 1 ? scenes.slice(1).map(s => s.inicio + 0.05) : Array.from({ length: Math.max(0, Math.floor((dur - 1.5) / 3.5)) }, (_, k) => 1.2 + k * 3.5);
    marks.forEach((t, k) => cand.push({ t, p: 2 + (k % 3 === 1 ? 1 : 0) }));
  }

  // 2) Clímax: el candidato más fuerte entre el 50% y el 85% del video
  const zona = cand.filter(c => c.t > dur * 0.5 && c.t < dur * 0.85);
  const clim = (zona.length ? zona : cand).slice().sort((a, b) => b.p - a.p)[0];
  if (clim) fx.push({ t: clim.t, tipo: 'shock', k: 1 });

  // 3) Apoyo: los mejores, separados al menos 2.2 s, intensidad que sube hacia el clímax
  const tipos = ['punch', 'punch', 'flash', 'punch', 'glitch'];
  cand.filter(c => c !== clim).sort((a, b) => b.p - a.p).forEach(c => {
    if (fx.length >= maxFx || c.t < 0.8) return;
    if (fx.some(e => Math.abs(e.t - c.t) < 2.2)) return;
    const k = clim ? Math.min(1, 0.55 + 0.45 * Math.max(0, 1 - Math.abs(c.t - clim.t) / (dur / 2))) : 0.8;
    fx.push({ t: c.t, tipo: tipos[fx.length % tipos.length], k });
  });
  fx.sort((a, b) => a.t - b.t);

  // 4) Sonidos que acompañan a cada efecto (entran 2-3 cuadros antes que la imagen)
  const SFX_FX = { shock: ['boom', 'impacto'], punch: ['whoosh', 'impacto'], flash: ['whoosh'], glitch: ['glitch', 'whoosh'] };
  fx.forEach(e => sfx.push({ t: Math.max(0, e.t - 0.08), cat: SFX_FX[e.tipo], vol: e.tipo === 'shock' ? 0.6 : 0.4 }));

  // 5) Efectos por palabra (máx. 6 por minuto, separados 5 s, sin chocar con los de arriba)
  const usado = {};
  for (const r of SFX_REGLAS) {
    for (const fr of r.frases.map(compilar)) {
      tok.forEach((_, i) => {
        if (!casa(tok, i, fr)) return;
        const t = words[i].inicio - 0.05;
        if (sfx.some(s => Math.abs(s.t - t) < (s.palabra ? 5 : 1.2))) return;
        if (sfx.filter(s => s.palabra).length >= Math.max(2, dur / 10)) return;
        if (usado[r.cat[0]] && t - usado[r.cat[0]] < 20) return;
        usado[r.cat[0]] = t;
        sfx.push({ t: Math.max(0, t), cat: r.cat, vol: 0.45, palabra: words[i].texto });
      });
    }
  }
  // 6) Ambiente: una sola cama a la vez
  for (const a of AMBIENTES) {
    for (const fr of a.frases.map(compilar)) {
      const i = tok.findIndex((_, k) => casa(tok, k, fr));
      if (i >= 0 && !amb.some(x => words[i].inicio < x.fin)) amb.push({ t: Math.max(0, words[i].inicio - 0.5), fin: Math.min(dur, words[i].inicio + 20), cat: a.cat });
    }
  }
  sfx.sort((a, b) => a.t - b.t);
  return { fx, sfx, amb };
}

// Expresiones de zoompan con los efectos de un tramo [T0, T0+dur]. `idx` es la variable de cuadro
// ('on' para imágenes, 'in' para video). Devuelve { z, dx, dy } para sumar al movimiento de cámara.
function zoomExpr(fx, T0, dur, FPS, idx = 'on') {
  const z = [], d = [];
  for (const e of fx) {
    if (e.t < T0 - 0.3 || e.t > T0 + dur) continue;
    const F = Math.round((e.t - T0) * FPS);
    if (e.tipo === 'punch' || e.tipo === 'shock') z.push(`${(e.tipo === 'shock' ? 0.22 : 0.14) * e.k}*max(0,1-abs(${idx}-${F})/${e.tipo === 'shock' ? 9 : 6})`);
    if (e.tipo === 'shock') d.push(`${Math.round(34 * e.k)}*sin(${idx}*2.9)*max(0,1-(${idx}-${F})/16)*between(${idx},${F},${F + 16})`);
  }
  return { z: z.length ? '+' + z.join('+') : '', dx: d.length ? '+' + d.join('+') : '', dy: d.length ? '+' + d.map(x => x.replace('sin(', 'cos(')).join('+') : '' };
}

// Filtros de destello y glitch (después del zoompan). t es el tiempo del tramo.
function flashGlitch(fx, T0, dur) {
  const out = [];
  for (const e of fx) {
    const t = e.t - T0;
    if (t < 0 || t > dur) continue;
    if (e.tipo === 'flash' || e.tipo === 'shock') out.push(`lutyuv=y='min(255,val*${e.tipo === 'shock' ? 2.0 : 1.7})':enable='between(t,${t.toFixed(2)},${(t + 0.09).toFixed(2)})'`);
    if (e.tipo === 'glitch' || e.tipo === 'shock') out.push(`rgbashift=rh=${e.tipo === 'shock' ? 18 : 14}:bh=-${e.tipo === 'shock' ? 18 : 14}:enable='between(t,${t.toFixed(2)},${(t + 0.2).toFixed(2)})'`);
  }
  return out.length ? ',' + out.join(',') : '';
}

module.exports = { plan, zoomExpr, flashGlitch };
