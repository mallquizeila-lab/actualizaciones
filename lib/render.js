// Arma el video vertical 1080x1920: escenas con voz, imagen IA o foto, personajes que hablan
// (y conversan), subtítulos karaoke, CTAs repartidos, efectos de sonido,
// logo como marca de agua, cierre obligatorio (comentar + suscribirse) y portada.
// Sale en 2 versiones: YouTube ("Suscríbete") y TikTok/Facebook ("Síguenos").
const fs = require('fs'), path = require('path');
const { ff, run, secs, slug, DATA, ROOT } = require('./util');
const { synthAll, timings } = require('./tts');
const { photo } = require('./media');
const imagenes = require('./imagenes');
const efectos = require('./efectos');
const director = require('./director');

const W = 1080, H = 1920, FPS = 30;
const clean = s => String(s || '').replace(/[{}\\]/g, '').replace(/\s+/g, ' ').trim();
const assTime = s => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}`;
const assColor = hex => { const h = String(hex || '#ffe600').replace('#', '').padEnd(6, '0'); return '&H00' + h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2); };

function assHeader(styles) {
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 0\n\n[V4+ Styles]\n` +
    'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n' +
    styles.join('\n') + '\n\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n';
}

// Subtítulos de la escena. Con tiempos reales (Whisper) son karaoke: la palabra que suena se
// pinta de amarillo y crece. Sin tiempos, grupos de 3 palabras repartidos por duración.
// También dibuja el CTA intermedio de la escena, si tiene.
function sceneAss(it, dur, top, cta, speaker, hook) {
  const st = [
    'Style: H,Impact,112,&H0000E6FF,&H000000FF,&H00000000,&HA0000000,0,0,0,0,100,100,1,0,1,8,4,5,60,60,0,1',
    'Style: L,Arial,64,&H00FFFFFF,&H000000FF,&H00226B1A,&H00000000,1,0,0,0,100,100,2,0,3,14,0,7,60,60,0,1',
    `Style: D,Arial,84,&H0000E6FF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,6,2,${top ? 8 : 2},80,80,${top ? 300 : 560},1`,
    `Style: K,Arial,84,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,6,2,${top ? 8 : 2},80,80,${top ? 300 : 560},1`,
    'Style: C,Arial,58,&H00FFFFFF,&H000000FF,&H001A1AE6,&H00000000,1,0,0,0,100,100,0,0,3,18,0,5,60,60,0,1',
    'Style: W,Impact,150,&H00FFFFFF,&H000000FF,&H00000000,&H96000000,0,0,0,0,100,100,2,0,1,10,5,5,60,60,0,1',
  ];
  const ev = [], up = t => clean(t).toUpperCase();
  const words = (it.words || []).filter(w => clean(w.texto));
  if (words.length) {
    const groups = []; let g = [];
    words.forEach((w, i) => {
      g.push(w);
      const next = words[i + 1], len = g.map(x => x.texto).join(' ').length;
      if (g.length >= 3 || len > 18 || /[.!?,;:]$/.test(w.texto) || !next || next.inicio - w.fin > 0.6) { groups.push(g); g = []; }
    });
    for (const gr of groups) gr.forEach((w, i) => {
      const end = i < gr.length - 1 ? gr[i + 1].inicio : w.fin;
      const txt = gr.map((q, j) => j === i ? `{\\c&H0000E6FF&\\fscx115\\fscy115}${up(q.texto)}{\\r}` : up(q.texto)).join(' ');
      // Dentro del grupo, cada palabra dura hasta que empieza la siguiente (sin solaparse).
      ev.push(`Dialogue: 0,${assTime(w.inicio)},${assTime(i < gr.length - 1 ? end : Math.max(end, w.inicio + 0.12))},K,,0,0,0,,${txt}`);
    });
  } else {
    const w = clean(it.text).split(' '), ch = [];
    for (let i = 0; i < w.length; i += 3) ch.push(w.slice(i, i + 3).join(' '));
    const tot = ch.join('').length || 1;
    let t = 0;
    ch.forEach(c => { const d = dur * c.length / tot; ev.push(`Dialogue: 0,${assTime(t)},${assTime(t + d)},D,,0,0,0,,{\\fad(40,0)}${c.toUpperCase()}`); t += d; });
  }
  if (it.clave) { // palabra clave grande cuando se dice (refuerza lo que se ve con lo que se oye)
    const norm = t => clean(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]/g, '');
    const k0 = norm(it.clave).split(' ')[0];
    const w = words.find(x => norm(x.texto) === k0) || words.find(x => k0 && norm(x.texto).startsWith(k0.slice(0, 5)));
    const t0 = w ? w.inicio : dur * 0.3, t1 = Math.min(dur, t0 + 1.8);
    if (t1 - t0 > 0.4) ev.push(`Dialogue: 2,${assTime(t0)},${assTime(t1)},W,,0,0,0,,{\\an5\\pos(540,${top ? 1380 : 400})\\fscx20\\fscy20\\t(0,140,\\fscx110\\fscy110)\\t(140,260,\\fscx100\\fscy100)\\fad(0,180)}${up(it.clave)}`);
  }
  if (hook) { // gancho grande en los primeros segundos, con efecto "pop"
    const lines = clean(hook).toUpperCase().split(' ').reduce((a, w) => { const l = a[a.length - 1]; if (l && (l + ' ' + w).length <= 16) a[a.length - 1] = l + ' ' + w; else a.push(w); return a; }, []).join('\\N');
    ev.push(`Dialogue: 3,${assTime(0)},${assTime(Math.min(dur, 2.8))},H,,0,0,0,,{\\an5\\pos(540,${top ? 700 : 520})\\fscx30\\fscy30\\t(0,160,\\fscx112\\fscy112)\\t(160,280,\\fscx100\\fscy100)\\fad(0,200)}${lines}`);
  }
  if (speaker) ev.push(`Dialogue: 2,${assTime(0)},${assTime(dur)},L,,0,0,0,,{\\pos(60,${top ? 470 : 230})\\fad(150,0)}${clean(speaker).toUpperCase()}`);
  if (cta) {
    const P = []; for (let t = 400; t < dur * 1000; t += 1000) P.push(`\\t(${t},${t + 500},\\fscx106\\fscy106)\\t(${t + 500},${t + 1000},\\fscx100\\fscy100)`);
    ev.push(`Dialogue: 1,${assTime(0.3)},${assTime(dur)},C,,0,0,0,,{\\an5\\pos(540,${top ? 620 : 330})\\fad(200,150)${P.join('')}}${clean(cta).toUpperCase()}`);
  }
  return assHeader(st) + ev.join('\n') + '\n';
}

// Lista de imágenes boca abierta/cerrada siguiendo el volumen de la voz.
async function mouthTrack(audio, d, i, ci, hasOpen) {
  if (!hasOpen) return null;
  const pcm = await run('ffmpeg', ['-v', 'error', '-i', audio, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { encoding: 'buffer' });
  const step = 666, rms = [];
  for (let s = 0; s + 2 <= pcm.length; s += step * 2) {
    let sum = 0, n = 0;
    for (let k = s; k < Math.min(s + step * 2, pcm.length - 1); k += 2) { const v = pcm.readInt16LE(k); sum += v * v; n++; }
    rms.push(Math.sqrt(sum / (n || 1)));
  }
  const sorted = [...rms].sort((a, b) => a - b), thr = (sorted[Math.floor(sorted.length * 0.9)] || 1) * 0.3;
  const seg = [];
  rms.forEach(v => { const o = v > thr; if (seg.length && seg[seg.length - 1].o === o) seg[seg.length - 1].n++; else seg.push({ o, n: 1 }); });
  const lines = ['ffconcat version 1.0'];
  seg.forEach(s => lines.push(`file '${s.o ? 'co' : 'cc'}${ci}.png'`, `duration ${(s.n * step / 8000).toFixed(3)}`));
  lines.push(`file 'cc${ci}.png'`);
  fs.writeFileSync(path.join(d, `m${i}.txt`), lines.join('\n'));
  return `m${i}.txt`;
}

// Movimientos de cámara. Escenas largas se parten en 2 tomas (corte a mitad de escena) para
// dar ritmo, como en los virales. Todo con expresiones de zoompan sobre una sola imagen.
const MOVES = [
  { z: t => `1+0.38*${t}`, x: () => 'iw/2-iw/zoom/2', y: () => 'ih/2-ih/zoom/2' },                    // acercar
  { z: t => `1.42-0.38*${t}`, x: () => 'iw/2-iw/zoom/2', y: () => 'ih/2-ih/zoom/2' },                  // alejar
  { z: () => '1.4', x: t => `(iw-iw/zoom)*${t}`, y: () => 'ih/2-ih/zoom/2' },                         // paneo a la derecha
  { z: () => '1.4', x: t => `(iw-iw/zoom)*(1-${t})`, y: () => 'ih/2-ih/zoom/2' },                     // paneo a la izquierda
  { z: () => '1.4', x: () => 'iw/2-iw/zoom/2', y: t => `(ih-ih/zoom)*(1-${t})` },                     // sube
  { z: t => `1.3+0.35*${t}`, x: () => 'iw/2-iw/zoom/2', y: () => 'max(0,ih*0.38-ih/zoom/2)' },         // primer plano (caras)
];
function camera(i, N, fx = { z: '', dx: '', dy: '' }) {
  const a = MOVES[i % MOVES.length], b = MOVES[(i * 7 + 3) % MOVES.length];
  if (N < FPS * 3.4 || a === b) { const t = `(on/${N})`; return `z='${a.z(t)}${fx.z}':x='${a.x(t)}${fx.dx}':y='${a.y(t)}${fx.dy}'`; }
  const M = Math.round(N / 2), t1 = `(on/${M})`, t2 = `((on-${M})/${N - M})`;
  const sw = (fa, fb) => `if(lt(on,${M}),${fa(t1)},${fb(t2)})`;
  return `z='${sw(a.z, b.z)}${fx.z}':x='${sw(a.x, b.x)}${fx.dx}':y='${sw(a.y, b.y)}${fx.dy}'`;
}

// Un clip de escena. o = { d, img, audio, ass, dur, out, char:{track,id}|null, logo|null, blur, i, flash,
//   fx: efectos del director, T0: inicio del tramo en el video, sfx: [{file, at, vol}], bar: {T0, TOT} }
async function clip(o) {
  const N = Math.round(o.dur * FPS), args = [...(o.blur ? ['-loop', '1'] : []), '-i', o.img, '-i', path.basename(o.audio)];
  const SW = Math.round(W * 1.5), SH = Math.round(H * 1.5);
  let f = o.blur
    ? `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=20:2,eq=brightness=-0.22,fps=${FPS}[bg]`
    : `[0:v]scale=${SW}:${SH}:force_original_aspect_ratio=increase,crop=${SW}:${SH},zoompan=${camera(o.i || 0, N, o.fx ? director.zoomExpr(o.fx, o.T0, o.dur, FPS) : undefined)}:d=${N}:s=${W}x${H}:fps=${FPS}` +
      `${o.char ? ',eq=brightness=-0.08' : ''},eq=contrast=1.07:saturation=1.15,unsharp=5:5:0.5${o.flash ? ',fade=t=in:st=0:d=0.18:color=white' : ''}${o.fx ? director.flashGlitch(o.fx, o.T0, o.dur) : ''},vignette=PI/5[bg]`;
  let last = 'bg', n = 2;
  if (o.char) {
    if (o.char.track) args.push('-f', 'concat', '-safe', '0', '-i', o.char.track); else args.push('-loop', '1', '-i', `cc${o.char.id}.png`);
    f += `;[${n}:v]fps=${FPS},scale=780:1050:force_original_aspect_ratio=decrease,format=rgba[ch];[${last}][ch]overlay=x='(W-w)/2+8*sin(t*2.3)':y='H-h-150+16*sin(t*5.5)':eval=frame[v${n}]`;
    last = 'v' + n; n++;
  }
  if (o.logo) {
    args.push('-loop', '1', '-i', o.logo.file);
    f += o.logo.big
      ? `;[${n}:v]scale=420:420:force_original_aspect_ratio=decrease,format=rgba,fade=in:st=0:d=0.5:alpha=1[lg];[${last}][lg]overlay=(W-w)/2:560[v${n}]`
      : `;[${n}:v]scale=170:170:force_original_aspect_ratio=decrease,format=rgba,colorchannelmixer=aa=0.88[lg];[${last}][lg]overlay=W-w-40:70[v${n}]`;
    last = 'v' + n; n++;
  }
  if (o.bar) { // barra de progreso: avanza durante todo el video (sin contar el cierre)
    args.push('-f', 'lavfi', '-i', `color=c=0xFFD400:s=${W}x14:r=${FPS}`);
    f += `;[${last}][${n}:v]overlay=x='-w+w*(${o.bar.T0.toFixed(3)}+t)/${o.bar.TOT.toFixed(3)}':y=H-14:shortest=1[v${n}]`;
    last = 'v' + n; n++;
  }
  f += `;[${last}]subtitles=${o.ass},format=yuv420p[v]`;
  let amap = ['-map', '1:a', '-af', 'apad'];
  const sfx = (o.sfx || []).filter(x => x && x.file);
  if (sfx.length) { // efectos de sonido en su momento exacto
    const ins = sfx.map((x, k) => {
      args.push('-i', x.file);
      const ms = Math.max(0, Math.round(x.at * 1000));
      return `[${n + k}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${x.vol || 0.4}${x.fin ? `,atrim=0:${Math.max(0.3, x.fin - x.at).toFixed(2)},afade=t=out:st=${Math.max(0, x.fin - x.at - 1).toFixed(2)}:d=1` : ''},adelay=${ms}|${ms}[s${k}]`;
    });
    f += ';' + ins.join(';') + `;[1:a]aformat=sample_rates=44100:channel_layouts=stereo,apad[va];[va]${sfx.map((_, k) => `[s${k}]`).join('')}amix=inputs=${sfx.length + 1}:duration=first:normalize=0[a]`;
    amap = ['-map', '[a]'];
  }
  await ff([...args, '-filter_complex', f, '-map', '[v]', ...amap, '-t', o.dur.toFixed(2),
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-c:a', 'aac', '-ar', '44100', '-ac', '2', o.out], o.d);
}

// Cierre: pregunta para comentar + logo + nombre + botón animado.
function ctaAss(q, name, button, sub, dur, hasLogo) {
  const pulses = [];
  for (let t = 0; t < dur * 1000; t += 900) pulses.push(`\\t(${t},${t + 450},\\fscx110\\fscy110)\\t(${t + 450},${t + 900},\\fscx100\\fscy100)`);
  const P = pulses.join('');
  const box = 'm 40 0 l 600 0 b 622 0 640 18 640 40 l 640 130 b 640 152 622 170 600 170 l 40 170 b 18 170 0 152 0 130 l 0 40 b 0 18 18 0 40 0';
  const end = assTime(dur + 1), y0 = hasLogo ? 1110 : 900;
  return assHeader([
    'Style: Q,Arial,74,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,1,0,0,0,100,100,0,0,1,5,3,8,80,80,200,1',
    'Style: N,Arial,82,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,1,0,0,0,100,100,0,0,1,5,3,5,40,40,0,1',
    'Style: B,Arial,70,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,1,0,1,0,0,5,0,0,0,1',
    'Style: S,Arial,52,&H0000E6FF,&H000000FF,&H00000000,&H90000000,1,0,0,0,100,100,0,0,1,4,2,5,40,40,0,1',
  ]) + [
    `Dialogue: 0,${assTime(0)},${end},Q,,0,0,0,,{\\fad(250,0)}${clean(q)}\\N{\\fs54\\c&H0000E6FF&}¡Déjalo en los comentarios!`,
    `Dialogue: 0,${assTime(0.2)},${end},N,,0,0,0,,{\\pos(540,${y0})\\fad(300,0)}${clean(name)}`,
    `Dialogue: 1,${assTime(0.5)},${end},B,,0,0,0,,{\\an5\\pos(540,${y0 + 230})\\p1\\c&H1A1AE6&\\bord0\\shad0${P}}${box}`,
    `Dialogue: 2,${assTime(0.5)},${end},B,,0,0,0,,{\\an5\\pos(540,${y0 + 230})${P}}${button}`,
    `Dialogue: 0,${assTime(0.8)},${end},S,,0,0,0,,{\\pos(540,${y0 + 400})\\fad(300,0)}${clean(sub)}`,
  ].join('\n') + '\n';
}

function coverAss(text) {
  return assHeader(['Style: T,Arial,128,&H0000E6FF,&H000000FF,&H00000000,&HC0000000,1,0,0,0,100,100,0,0,3,24,0,5,70,70,0,1']) +
    `Dialogue: 0,${assTime(0)},${assTime(10)},T,,0,0,0,,${clean(text).toUpperCase()}\n`;
}

// Voz final de un personaje o del narrador, con su "tipo de voz" (fijo, o automático según el video).
function voiceOf(ch, char, auto = {}, ov = null) {
  const base = char && char.voice ? { voice: char.voice, rate: char.rate ?? ch.rate, pitch: char.pitch ?? ch.pitch } : { voice: ch.voice, rate: ch.rate, pitch: ch.pitch };
  let preset = char ? (char.voicePreset || '') : (ch.voicePreset || '');
  const o = ov && ov[char ? char.name : 'Narrador']; // voz elegida a mano para este video
  if (o && String(o).startsWith('clon:')) return { voice: o, rate: 0, pitch: 0 }; // una de "Mis voces"
  if (o) preset = o;
  if (preset === 'auto') { const a = auto || {}; preset = (char ? a[char.name] || a[String(char.name).toLowerCase()] : a.narrador) || ''; }
  if (!preset) return base;
  const V = require('./voces');
  return V.byId(preset) ? V.aplicar(base, preset, require('./tts').catalog(), char ? char.name : ch.name) : base;
}

const STYLE = {
  fotos: 'cinematic realistic photo, natural dramatic lighting, rich colors, sharp focus, vertical 9:16 composition',
  personaje: 'colorful 3D animated background scene, Pixar style, soft warm light, empty scene with no characters, vertical 9:16 composition',
  escena: 'expressive 3D Pixar-style animated cartoon characters with big eyes and expressive faces, dynamic pose, cinematic lighting, depth of field, vibrant colors, vertical 9:16 composition, family-friendly',
};
const charDesc = c => (c.description || c.name).replace(/\s+/g, ' ').trim();

// "Escena completa": la IA dibuja la escena CON los personajes dentro, usando sus imágenes como
// referencia para que siempre se vean iguales. Si falla o no hay cupo, se usa el personaje encima del fondo.
async function sceneWithChars(x, i, out, log) {
  if (!imagenes.ready() || imagenes.cupo().quedanAprox < 1) return false;
  const who = [x._char, x._other].filter(Boolean);
  const prompt = `${who.map(c => charDesc(c) + ' character').join(' and ')}: ${x.prompt_imagen || x.img || ''}, ${STYLE.escena}`;
  try {
    await imagenes.generar({ prompt, out, refFiles: who.map(c => path.join(DATA, 'chars', c.closed)), log });
    return true;
  } catch (e) { log(`Escena ${i + 1}: no se pudo dibujar la escena completa (${e.message.slice(0, 80)}); uso personaje encima del fondo`); return false; }
}

// Imagen de cada escena según el canal: "stock" (Pexels/Pixabay), "ia" (Cloudflare) o "mixto"
// (IA en las 3 primeras escenas, que son las que retienen, y stock en el resto para cuidar el cupo).
async function sceneImage(ch, x, i, out, log) {
  const mode = ch.images || 'mixto';
  if (imagenes.ready() && x.prompt_imagen && (mode === 'ia' || (mode === 'mixto' && i < 3)) && imagenes.cupo().quedanAprox > 0) {
    try { await imagenes.generar({ prompt: `${x.prompt_imagen}, ${STYLE[ch.style === 'personaje' ? 'personaje' : 'fotos']}`, out, log }); return 'IA'; }
    catch (e) { log(`Escena ${i + 1}: imagen IA no disponible, uso foto de stock`); }
  }
  return photo(x.img || x.prompt_imagen?.split(' ').slice(0, 5).join(' '), out);
}

// Voz al nivel estándar de YouTube (-16 LUFS). Kokoro y la voz del sistema salen bajitas.
async function normalizeVoices(items, d) {
  for (const it of items) {
    const out = it.base + '_n.wav';
    try { await ff(['-i', it.file, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', out], d); it.file = out; } catch (e) {}
  }
}

// Música: ánimo del canal (biblioteca de Freesound) o la carpeta musica/.
const MOOD = { leyenda: 'suspenso', misterio: 'suspenso', terror: 'suspenso', finanz: 'motivacional', ahorro: 'motivacional', tecnolog: 'tecnologia', psicolog: 'lofi', espacio: 'epica', universo: 'epica', historia: 'epica', motiva: 'motivacional', habito: 'motivacional', salud: 'alegre', fruta: 'alegre', animal: 'alegre', curios: 'alegre' };
function pickSong(ch) {
  const md = path.join(require('./util').USERDATA, 'musica');
  const own = fs.existsSync(md) ? fs.readdirSync(md).filter(x => /\.mp3$/i.test(x)) : [];
  if (own.length && !ch.mood) return path.join(md, own[Math.floor(Math.random() * own.length)]);
  const n = String(ch.niche || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const mood = ch.mood || Object.entries(MOOD).find(([k]) => n.includes(k))?.[1] || 'alegre';
  return efectos.music(mood) || (own.length ? path.join(md, own[0]) : null);
}

// Fondo elegido a mano para un video: { modo: 'original'|'quitar'|'cambiar', archivo, vol }.
function fondoDe(ch, fondo, porDefecto) {
  if (fondo?.modo === 'quitar') return null; // ('ajustar' en videos nuevos = la música de siempre, con tu volumen)
  if (fondo?.modo === 'cambiar' && fondo.archivo && fs.existsSync(fondo.archivo)) return fondo.archivo;
  return porDefecto;
}

// Mezcla final: la música baja sola cuando habla la voz (ducking) y todo queda a -14 LUFS (YouTube).
async function finalMix(d, input, song, out, vol = 0.32, duck = true) {
  const a = song
    ? ['-i', input, '-stream_loop', '-1', '-i', song, '-filter_complex',
      duck ? `[0:a]asplit[v1][v2];[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${(+vol || 0.32).toFixed(2)},afade=t=in:d=1[m];[m][v1]sidechaincompress=threshold=0.02:ratio=9:attack=15:release=350[md];[v2][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`
        : `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${(+vol || 1).toFixed(2)}[m];[0:a][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
      '-map', '0:v', '-map', '[a]']
    : ['-i', input, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-map', '0:v', '-map', '0:a'];
  await ff([...a, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', out], d);
}

async function render({ ch, s, log = () => {}, reuseDir = null, fondo = null }) {
  const sc = (s.scenes || []).filter(x => x && x.text);
  if (sc.length < 3) throw new Error('Guion incompleto');
  const id = slug(s.seo?.youtube?.title || s.title) + '-' + Date.now().toString(36).slice(-5);
  const d = path.join(DATA, 'videos', id), P = x => path.join(d, x);
  fs.mkdirSync(d, { recursive: true });

  const logoFile = path.join(DATA, 'logos', ch.id + '.png');
  const logo = fs.existsSync(logoFile) ? logoFile : null;

  // Personajes: cada escena puede tener su propio hablante (diálogos entre frutas).
  const cs = ch.style === 'personaje' ? (ch.characters || []).filter(c => c.closed) : [];
  if (ch.style === 'personaje' && !cs.length) log('Este canal no tiene personajes con imagen: uso fotos normales');
  const byName = n => cs.find(c => c.name.toLowerCase() === String(n || '').toLowerCase());
  const main = byName(s.character) || cs[0] || null;
  const used = new Map();
  const charOf = x => { const c = byName(x.speaker) || main; if (c && !used.has(c.id)) used.set(c.id, used.size); return c; };
  sc.forEach(x => { x._char = cs.length ? charOf(x) : null; });
  // En diálogos, el otro personaje también aparece en la escena (escuchando).
  const speakers = [...new Set(sc.map(x => x._char).filter(Boolean))];
  const dialog = speakers.length > 1;
  sc.forEach(x => { x._other = dialog ? speakers.find(c => c !== x._char) : null; });
  const escena = cs.length && (ch.look || 'escena') === 'escena';
  for (const [cid, k] of used) {
    const c = cs.find(x => x.id === cid);
    fs.copyFileSync(path.join(DATA, 'chars', c.closed), P(`cc${k}.png`));
    if (c.open) fs.copyFileSync(path.join(DATA, 'chars', c.open), P(`co${k}.png`));
  }
  await ff(['-f', 'lavfi', '-i', `color=c=${(ch.color || '#14532d').replace('#', '0x')}:s=${W}x${H}`, '-frames:v', '1', 'bg.png'], d);

  // Voces de todo el video en lote (escenas + 2 cierres) e imágenes en paralelo.
  const q = s.comment_question || '¿Tú qué opinas?';
  const ctaV = main ? voiceOf(ch, main, s.voces, s._ov) : voiceOf(ch, null, s.voces, s._ov);
  const versions = {
    youtube: { narr: `${q} Déjamelo en los comentarios. Y si te gustó, suscríbete a ${ch.name} para más videos así.${ch.frase ? ' ' + ch.frase : ''}`, button: 'SUSCRÍBETE', sub: 'Y activa la campanita' },
    social: { narr: `${q} Déjamelo en los comentarios. Y síguenos en ${ch.name} para más.${ch.frase ? ' ' + ch.frase : ''}`, button: 'SÍGUENOS', sub: 'Y compártelo con alguien' },
  };
  const items = [
    ...sc.map((x, i) => ({ text: x.text, base: P('a' + i), v: voiceOf(ch, x._char, s.voces, s._ov), clave: x.clave })),
    ...Object.entries(versions).map(([k, c]) => ({ text: c.narr, base: P('cta_' + k), v: ctaV })),
  ];
  const credits = new Set();
  let aiImages = 0;
  log(`Generando voces (${items.length}) e imágenes (${sc.length})`);
  const [, srcs] = await Promise.all([
    synthAll(items, log),
    (async () => {
      const r = [];
      for (const [i, x] of sc.entries()) {
        // Rehacer solo las voces: se reutilizan las mismas imágenes del video anterior.
        const old = reuseDir && path.join(DATA, 'videos', reuseDir, `p${i}.jpg`);
        if (old && fs.existsSync(old)) { fs.copyFileSync(old, P(`p${i}.jpg`)); r.push(x._src || 'IA'); continue; }
        if (escena && x._char && await sceneWithChars(x, i, P(`p${i}.jpg`), log)) { x._full = true; r.push('IA'); continue; }
        r.push(await sceneImage(ch, x, i, P(`p${i}.jpg`), log));
      }
      return r;
    })(),
  ]);
  // Revisor de imágenes: Gemini compara cada imagen con su frase y rehace las que no coinciden.
  if (db().settings.checkImages !== false && !reuseDir) {
    const coh = await require('./coherencia').revisarImagenes({
      ch, sc, files: sc.map((_, i) => P(`p${i}.jpg`)), log,
      regen: async (i, prompt) => {
        const x = sc[i]; x.prompt_imagen = prompt;
        if (x._full && await sceneWithChars(x, i, P(`p${i}.jpg`), log)) return true;
        const r = await sceneImage(ch, x, i, P(`p${i}.jpg`), log);
        if (r && r !== 'IA') credits.add(r);
        return !!r;
      },
    });
    if (coh) s._coherencia = coh;
  }
  srcs.forEach(x => { if (x === 'IA') aiImages++; else if (x) credits.add(x); });
  if (db().settings.karaoke) { log('Midiendo cada palabra para los subtítulos'); await timings(items, log); }
  await normalizeVoices(items, d);

  // Línea de tiempo completa y plan del director (efectos visuales + sonidos por palabra).
  const durs = [];
  for (const it of items.slice(0, sc.length)) durs.push(await secs(it.file) + 0.3);
  const starts = durs.map((_, i) => durs.slice(0, i).reduce((a, b) => a + b, 0)), TOT = durs.reduce((a, b) => a + b, 0);
  const allWords = items.slice(0, sc.length).flatMap((it, i) => (it.words || []).map(w => ({ ...w, inicio: w.inicio + starts[i], fin: w.fin + starts[i] })));
  const plan = director.plan(allWords, TOT, { scenes: durs.map((dd, i) => ({ inicio: starts[i], fin: starts[i] + dd })), densidad: ch.fxDensity || 'media' });
  log(`Director: ${plan.fx.length} efectos visuales y ${plan.sfx.length} sonidos`);
  const recentFx = [], pick = cats => efectos.byCat(cats, recentFx) || efectos.find([].concat(cats).join(' '), recentFx);
  const sfxAt = plan.sfx.map(x => ({ ...x, file: pick(x.cat) })).filter(x => x.file);
  const ambAt = fondo?.modo === 'quitar' || fondo?.modo === 'cambiar' ? [] : plan.amb.map(x => ({ ...x, file: pick(x.cat) })).filter(x => x.file);

  const ctas = Object.fromEntries((s.ctas || []).filter(c => c && c.text).map(c => [Number(c.scene) - 1, c.text]));
  const hook = s.hook || s.thumbnail_text || '';
  const list = [];
  for (const [i, x] of sc.entries()) {
    log(`Armando escena ${i + 1} de ${sc.length}`);
    const it = items[i], dur = durs[i], T0 = starts[i], k = x._char ? used.get(x._char.id) : null;
    const overlay = x._char && !x._full; // personaje encima del fondo (modo clásico o respaldo)
    fs.writeFileSync(P(`s${i}.ass`), sceneAss(it, dur, overlay, ctas[i], dialog && x._char ? x._char.name : '', i === 0 ? hook : ''));
    const track = overlay ? await mouthTrack(it.file, d, i, k, !!x._char.open) : null;
    const inClip = a => a.t >= T0 - 0.1 && a.t < T0 + dur;
    const sfx = [
      ...(i > 0 ? [{ file: pick(['whoosh']), at: 0, vol: 0.35 }] : hook ? [{ file: pick(['boom', 'impacto']), at: 0.05, vol: 0.5 }] : []),
      ...(i === 0 && efectos.sello(ch) ? [{ file: efectos.sello(ch), at: 0, vol: 0.4 }] : []),
      ...sfxAt.filter(inClip).map(a => ({ file: a.file, at: a.t - T0, vol: a.vol })),
      ...ambAt.filter(a => a.t < T0 + dur && a.fin > T0).map(a => ({ file: a.file, at: Math.max(0, a.t - T0), fin: Math.min(dur, a.fin - T0), vol: 0.12 })),
    ];
    await clip({ d, i, flash: i > 0 && i % 3 === 1, img: srcs[i] ? `p${i}.jpg` : 'bg.png', audio: it.file, ass: `s${i}.ass`, dur, out: `c${i}.mp4`, char: overlay ? { track, id: k } : null, logo: logo && { file: logo }, sfx, fx: plan.fx, T0, bar: { T0, TOT } });
    list.push(`c${i}.mp4`);
  }

  const lastImg = srcs[sc.length - 1] ? `p${sc.length - 1}.jpg` : 'bg.png';
  for (const [k, c] of Object.entries(versions)) {
    log(`Cierre para ${k === 'youtube' ? 'YouTube' : 'TikTok y Facebook'}`);
    const it = items[sc.length + (k === 'youtube' ? 0 : 1)], dur = await secs(it.file) + 0.8;
    fs.writeFileSync(P(`cta_${k}.ass`), ctaAss(q, ch.name, c.button, c.sub, dur, !!logo));
    await clip({ d, img: lastImg, audio: it.file, ass: `cta_${k}.ass`, dur, out: `cta_${k}.mp4`, blur: true, logo: logo && { file: logo, big: true }, sfx: [{ file: pick(['campana', 'notificacion', 'pop']), at: 0.5, vol: 0.45 }] });
  }

  const song = fondoDe(ch, fondo, pickSong(ch));
  const out = { youtube: 'video_youtube.mp4', social: 'video_tiktok_facebook.mp4' };
  for (const k of Object.keys(out)) {
    log('Uniendo escenas ' + (k === 'youtube' ? '(YouTube)' : '(TikTok/Facebook)') + (song ? ' y mezclando música' : ''));
    fs.writeFileSync(P(`list_${k}.txt`), [...list, `cta_${k}.mp4`].map(f => `file '${f}'`).join('\n'));
    await ff(['-f', 'concat', '-safe', '0', '-i', `list_${k}.txt`, '-c', 'copy', `j_${k}.mp4`], d);
    await finalMix(d, `j_${k}.mp4`, song, out[k], fondo?.vol);
  }

  log('Creando portada');
  fs.writeFileSync(P('cover.ass'), coverAss(s.thumbnail_text || s.seo?.youtube?.title || ''));
  await ff(['-ss', '0.4', '-i', 'c0.mp4', '-vf', 'subtitles=cover.ass', '-frames:v', '1', '-q:v', '3', 'portada.jpg'], d).catch(() => {});

  // Quién habla en el video (con la imagen de su primera escena) para poder cambiarle la voz.
  const voces = [];
  sc.forEach((x, i) => {
    const nombre = x._char ? x._char.name : 'Narrador';
    if (voces.some(v => v.nombre === nombre)) return;
    voces.push({ nombre, img: `p${i}.jpg`, preset: items[i].v.preset || '', voice: items[i].v.voice || '' });
  });
  // Se guardan las imágenes de las escenas (pesan poco) para poder rehacer solo las voces.
  fs.readdirSync(d).filter(x => !/^(video_.*\.mp4|portada\.jpg|p\d+\.jpg)$/.test(x)).forEach(x => fs.rmSync(P(x), { recursive: true, force: true }));
  return { fondo: song ? (fondo?.modo === 'cambiar' ? 'cambiado' : 'música') : 'quitado', voces, dir: id, files: { ...out, cover: fs.existsSync(P('portada.jpg')) ? 'portada.jpg' : null }, credits: [...credits], aiImages, character: main?.name || null, karaoke: items.some(it => it.words?.length) };
}

const db = () => require('./store').db;

module.exports = { fondoDe, render, sceneAss, ctaAss, coverAss, finalMix, pickSong, normalizeVoices, voiceOf, assHeader, clean, assTime, W, H, FPS };
