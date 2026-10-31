// "Reeditar mis videos": toma un video PROPIO y lo deja listo para cada plataforma, con calidad pro:
//  - formato vertical 9:16 (si es horizontal: fondo difuminado + video centrado)
//  - subtítulos karaoke, gancho grande al inicio, CTAs en el momento justo, logo, barra de progreso
//  - director de efectos (punch zoom, sacudida, destello, glitch) y sonidos sincronizados a palabras
//  - modo "mejorar" (conserva tu audio) o "nueva_voz" (guion nuevo narrado sobre tus imágenes)
//  - cierre con "Suscríbete" (YouTube) y "Síguenos" (TikTok/Facebook), portada y textos SEO
const fs = require('fs'), path = require('path');
const { ff, run, secs, slug, parseJSON, DATA } = require('./util');
const { synthAll, timings } = require('./tts');
const efectos = require('./efectos');
const director = require('./director');
const ai = require('./ai');
const P = require('./prompts');
const { transcribir } = require('./transcribe');
const R = require('./render');
const { W, H, FPS } = R;

async function probe(f) {
  const j = JSON.parse(await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', f]));
  const v = (j.streams || []).find(s => s.codec_type === 'video') || {};
  let w = +v.width || W, h = +v.height || H;
  const rot = Math.abs(+(v.tags?.rotate || v.side_data_list?.find(x => x.rotation !== undefined)?.rotation || 0));
  if (rot % 180 === 90) [w, h] = [h, w];
  return { dur: parseFloat(j.format?.duration) || 0, w, h, audio: (j.streams || []).some(s => s.codec_type === 'audio') };
}

// Toma 6 fotogramas y le pide a Gemini que describa el video (para que título y gancho coincidan).
async function describeVideo(ch, src, ini, dur, log) {
  try {
    const frames = [], times = [];
    for (let k = 0; k < 6; k++) {
      const t = ini + dur * (k + 0.5) / 6;
      times.push(t);
      const b = await run('ffmpeg', ['-v', 'error', '-ss', t.toFixed(2), '-i', src, '-frames:v', '1', '-vf', 'scale=512:-2', '-q:v', '5', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-'], { encoding: 'buffer' });
      if (b.length) frames.push(b.toString('base64'));
    }
    if (!frames.length) return null;
    log('La IA mira el video para entender de qué trata');
    const r = await ai.ask(P.visionP(ch, frames), { json: true, log, vision: true, max: 2000 });
    const o = parseJSON(r.text);
    o._t = times; // segundo de cada fotograma (para sacar la foto de cada personaje)
    return o;
  } catch (e) { log('No se pudo analizar la imagen del video (' + e.message.slice(0, 80) + ')'); return null; }
}

// Subtítulos karaoke + gancho + CTAs en su segundo exacto.
function assFor(words, text, dur, hook, ctas, band) {
  let a = R.sceneAss({ text, words }, dur, false, '', '', hook);
  // Si se tapó un subtítulo viejo, los nuevos van justo encima de esa franja.
  if (band) a = a.replace(/^(Style: [DK],.*),2,80,80,560,1$/gm, (m, x) => band.top
    ? `${x},8,80,80,${Math.max(40, band.y0 + 20)},1` : `${x},2,80,80,${Math.max(80, R.H - band.y1 + 20)},1`);
  const C = ctas.filter(c => c.t > 2.5 && c.t < dur - 1).map(c => {
    const P2 = [], d = Math.min(3, dur - c.t);
    for (let t = 300; t < d * 1000; t += 1000) P2.push(`\\t(${t},${t + 500},\\fscx106\\fscy106)\\t(${t + 500},${t + 1000},\\fscx100\\fscy100)`);
    return `Dialogue: 1,${R.assTime(c.t)},${R.assTime(c.t + d)},C,,0,0,0,,{\\an5\\pos(540,330)\\fad(200,150)${P2.join('')}}${R.clean(c.text).toUpperCase()}`;
  });
  return a + C.join('\n') + (C.length ? '\n' : '');
}

// Looks de color: cada video reeditado sale con un estilo distinto al original (o el fijo del canal).
const LOOKS = {
  cine: 'colorbalance=rs=-0.05:bs=0.07:rh=0.07:bh=-0.07,eq=contrast=1.12:saturation=1.12:gamma=0.97',
  calido: 'colorbalance=rm=0.06:bm=-0.06:rh=0.04:bh=-0.05,eq=contrast=1.07:saturation=1.22',
  vibrante: 'vibrance=intensity=0.35,eq=contrast=1.1:saturation=1.3',
  frio: 'colorbalance=bs=0.06:bm=0.04:rh=-0.03,eq=contrast=1.1:saturation=1.08',
  suave: 'eq=contrast=0.96:brightness=0.03:saturation=1.12:gamma=1.04',
  dramatico: 'curves=preset=strong_contrast,eq=saturation=1.08:gamma=0.96',
  vintage: 'curves=preset=vintage,eq=saturation=0.95:contrast=1.04',
  vivo: 'vibrance=intensity=0.45,eq=contrast=1.12:saturation=1.28:gamma=0.97,unsharp=7:7:0.6',
  atardecer: 'colorbalance=rs=0.04:gs=-0.01:bs=-0.06:rm=0.07:bm=-0.05:rh=0.06:bh=-0.08,eq=contrast=1.08:saturation=1.2',
  pastel: 'eq=contrast=0.94:brightness=0.04:saturation=1.05:gamma=1.06,colorbalance=rh=0.03:bh=0.03',
  hdr: 'unsharp=9:9:0.7,eq=contrast=1.15:saturation=1.18:gamma=0.95,vibrance=intensity=0.25',
};
const rnd = (a, b) => a + Math.random() * (b - a);

async function reedit({ ch, j, log = () => {} }) {
  const src = j.source;
  if (!src || !fs.existsSync(src)) throw new Error('No encuentro el video original');
  const info = await probe(src);
  const seg = j.segment || null;
  const ini = seg ? seg.inicio : 0, fin = seg ? Math.min(seg.fin, info.dur) : info.dur;
  const dur0 = fin - ini;
  // Variación para que no quede igual al original: look de color, encuadre y ritmo un poco más ágil.
  const vary = ch.reeditVary !== false;
  // El estilo se guarda en el trabajo: al rehacer solo las voces, el video se ve igual.
  const est = j.estilo || (j.estilo = {
    lookName: ch.reeditLook && LOOKS[ch.reeditLook] ? ch.reeditLook : Object.keys(LOOKS)[Math.floor(Math.random() * Object.keys(LOOKS).length)],
    sp: vary ? +rnd(1.02, 1.06).toFixed(3) : 1, zb: vary ? +rnd(1.06, 1.11).toFixed(3) : 1.04,
    ox: vary ? Math.round(rnd(-18, 18)) : 0, oy: vary ? Math.round(rnd(-18, 18)) : 0,
  });
  const { lookName, sp, zb, ox, oy } = est;
  const mode = j.mode || ch.reeditMode || 'mejorar';
  const id = slug(j.title || path.basename(src, path.extname(src))) + '-' + Date.now().toString(36).slice(-5);
  const d = path.join(DATA, 'videos', id), Pth = x => path.join(d, x);
  fs.mkdirSync(d, { recursive: true });

  // 1) Transcripción (con caché en el trabajo para los cortes)
  let tr = j.transcript;
  if (tr === undefined && info.audio) { tr = await transcribir(src, log); j.transcript = tr || null; }
  if (tr && seg) tr = {
    frases: (tr.frases || []).filter(f => f.fin > ini && f.inicio < fin).map(f => ({ ...f, inicio: Math.max(0, f.inicio - ini), fin: f.fin - ini })),
    palabras: (tr.palabras || []).filter(w => w.inicio >= ini && w.fin <= fin + 0.2).map(w => ({ ...w, inicio: w.inicio - ini, fin: w.fin - ini })),
  };

  // 2) La IA mira el video, y luego prepara gancho, CTAs, SEO (y guion nuevo si toca)
  // ¿Habrá doblaje? Entonces la mirada del doblaje (más fotogramas) sirve también para entender el
  // video: una sola llamada de visión en vez de dos (ahorra cuota, misma o mejor calidad).
  const sinVoz = !info.audio || !(tr?.frases?.length);
  let mode2 = mode, dub = null;
  if (mode === 'mejorar' && sinVoz && ch.autoDub !== false) { mode2 = 'doblaje'; log('El video no tiene voces: le doy voz a los personajes (doblaje automático)'); }
  let vis = j.visual || (mode2 === 'doblaje' ? null : await describeVideo(ch, src, ini, dur0, log));
  if (mode2 === 'doblaje') {
    try { dub = await require('./doblaje').doblar({ ch, src, ini, dur0, tr, d, log, prev: j.revoice && j.dub ? j.dub : null, ov: j.revoice?.map || j.ovPre || null, castFijo: j.castFijo || null }); j.dub = dub.data; }
    catch (e) { throw Object.assign(new Error('Doblaje: ' + e.message.slice(0, 160) + '. Lo reintento solo en 2 horas.'), { retryable: true }); }
    if (!vis) vis = { descripcion: dub.data.descripcion || dub.tema || '', tema: dub.tema || '', encaja_con_canal: dub.data.encaja_con_canal !== false, motivo: dub.data.motivo || '' };
  }
  if (vis) {
    j.visual = vis;
    if (vis.encaja_con_canal === false) { j.warning = `Este video parece no encajar con "${ch.name}": ${vis.motivo || vis.tema}. Revisa si va en otro canal.`; log('⚠ ' + j.warning); }
  }
  // Sin "ver" el video no se inventa nada: si la IA no pudo mirarlo (cuota agotada) y el video no tiene
  // voces que transcribir, o hay que escribir voces nuevas, se espera y se reintenta más tarde.
  const necesitaVer = mode2 === 'doblaje' || mode === 'nueva_voz' || !(tr?.frases?.length);
  if (!vis && necesitaVer) throw Object.assign(new Error('No pude mirar el video (las IA que ven imágenes están sin cuota ahora). Lo reintento solo en 2 horas; no se inventa nada.'), { retryable: true });
  log('La IA prepara gancho, llamados a la acción y SEO');
  const ctx = dub ? { frases: dub.frases, nombre: path.basename(src), visual: vis ? `${vis.descripcion} Tema: ${dub.tema || vis.tema}` : dub.tema }
    : { ...(tr || {}), nombre: path.basename(src), visual: vis ? `${vis.descripcion} Tema: ${vis.tema}` : '' };
  const s = j.revoice && j.script ? { ...j.script } : parseJSON((await ai.ask(P.reeditP(ch, ctx, dur0, mode, false), { json: true, log })).text);
  if (j.revoice) s._ov = j.revoice.map; else if (j.ovPre) s._ov = j.ovPre; // voces elegidas antes de reeditar

  // 3) Audio principal
  let voice, words = [], text = '', dur = dur0, fondoOriginal = null;
  if (dub) {
    voice = dub.voice; words = dub.words; text = dub.text; dur = dub.dur;
    j.reparto = dub.reparto; j.spoken = dub.frases.map(f => f.texto).join(' ').slice(0, 3000);
  } else if (mode === 'nueva_voz' && s.narration) {
    log('Narrando el guion nuevo');
    const it = { text: s.narration, base: Pth('narr'), v: R.voiceOf(ch, null, s.voces, s._ov) };
    await synthAll([it], log);
    await timings([it], log);
    // Que la narración quepa en el video (nunca se repite el video): acortar con IA y/o acelerar un poco.
    let largo = await secs(it.file);
    if (largo > dur0 - 0.3 && largo / (dur0 - 0.3) > 1.25) {
      const meta = Math.max(6, Math.floor(s.narration.split(/\s+/).length * (dur0 - 0.3) / largo * 0.9));
      log(`La narración dura ${largo.toFixed(0)} s y el video ${dur0.toFixed(0)} s: la acorto a unas ${meta} palabras`);
      try {
        const r2 = await ai.ask([{ role: 'user', content: `Acorta esta narración a como MÁXIMO ${meta} palabras, mismo tema, mismo gancho al inicio, natural. Devuelve SOLO JSON: {"narration":"..."}\n${s.narration}` }], { json: true, max: 1200, log });
        const n = parseJSON(r2.text).narration;
        if (n && n.split(/\s+/).length < s.narration.split(/\s+/).length) { s.narration = it.text = n; delete it.file; delete it.words; await synthAll([it], log); await timings([it], log); largo = await secs(it.file); }
      } catch (e) {}
    }
    if (largo > dur0 - 0.3) {
      const k = Math.min(1.3, largo / (dur0 - 0.3));
      await ff(['-y', '-i', it.file, '-af', `atempo=${k.toFixed(3)}`, it.base + '_r.wav']);
      it.file = it.base + '_r.wav'; if (it.words) it.words = it.words.map(w => ({ ...w, inicio: w.inicio / k, fin: w.fin / k }));
      log(`Voz un ${Math.round((k - 1) * 100)}% más rápida para que quepa en el video`);
    }
    await R.normalizeVoices([it], d);
    voice = it.file; words = (it.words || []).filter(w => w.inicio < dur0); text = s.narration;
    dur = dur0; // el video nunca se alarga ni se repite
  } else if (info.audio) {
    voice = Pth('orig.wav');
    let fuenteAudio = src, desde = ini;
    // Quitar o cambiar el fondo: se separa la voz de la música con Demucs y se usa solo la voz.
    if (j.fondo?.modo === 'quitar' || j.fondo?.modo === 'cambiar' || j.fondo?.modo === 'ajustar') {
      await ff(['-ss', String(ini), '-t', dur0.toFixed(2), '-i', src, '-vn', '-ar', '44100', '-ac', '2', Pth('mezcla.wav')]);
      const sep = await require('./tts').separar(Pth('mezcla.wav'), Pth('sep'), log);
      fuenteAudio = sep.voz; desde = 0;
      if (j.fondo.modo === 'ajustar') { // el fondo original vuelve, al volumen que elegiste
        await ff(['-i', sep.fondo, '-af', `atempo=${sp}`, '-ar', '44100', '-ac', '2', Pth('fondo_orig.wav')]);
        fondoOriginal = Pth('fondo_orig.wav');
      }
    }
    await ff(['-ss', String(desde), '-t', dur0.toFixed(2), '-i', fuenteAudio, '-vn', '-af', `atempo=${sp},loudnorm=I=-16:TP=-1.5:LRA=11`, '-ar', '44100', '-ac', '2', voice]);
    words = (tr?.palabras || []).map(w => ({ ...w, inicio: w.inicio / sp, fin: w.fin / sp })); text = (tr?.frases || []).map(f => f.texto).join(' ');
    dur = dur0 / sp; (s.ctas || []).forEach(c => { if (c.t) c.t = c.t / sp; });
  } else {
    voice = Pth('silence.wav');
    dur = dur0 / sp;
    await ff(['-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`, '-t', dur.toFixed(2), voice]);
  }
  if (ch.reeditSubs === false) words = [];

  // 4) Director: efectos visuales + sonidos
  const plan = director.plan(words, dur, { densidad: ch.fxDensity || 'media' });
  log(`Director: ${plan.fx.length} efectos visuales y ${plan.sfx.length} sonidos`);
  const recent = [], pick = cats => efectos.byCat(cats, recent) || efectos.find([].concat(cats).join(' '), recent);
  const sfx = [
    ...(s.hook ? [{ file: pick(['boom', 'impacto']), at: 0.05, vol: 0.5 }] : []), // golpe cuando aparece el gancho
    ...(efectos.sello(ch) ? [{ file: efectos.sello(ch), at: 0, vol: 0.4 }] : []), // sello sonoro del canal
    ...plan.sfx.map(x => ({ file: pick(x.cat), at: x.t, vol: x.vol })),
    ...(j.fondo?.modo === 'quitar' || j.fondo?.modo === 'cambiar' ? [] : plan.amb.map(x => ({ file: pick(x.cat), at: x.t, fin: x.fin, vol: 0.1 }))),
  ].filter(x => x.file);

  // 5) Video principal en una sola pasada
  log('Armando el video vertical con efectos');
  const logoFile = path.join(DATA, 'logos', ch.id + '.png');
  const fxz = director.zoomExpr(plan.fx, 0, dur, FPS, 'in');
  const vertical = info.w / info.h < 0.62;
  const vsp = (mode === 'nueva_voz' || dub) ? 1 : sp;
  // Subtítulos quemados del original: se difumina su franja y se reemplazan por los nuevos.
  let band = null;
  const z = vis && vis.subtitulos_quemados && vis.zona_subtitulos;
  if (z && ch.reeditReplaceSubs !== false && words.length && +z.abajo > +z.arriba && +z.abajo - +z.arriba < 45) {
    const fh = vertical ? H : Math.round(W * info.h / info.w), off = vertical ? 0 : Math.round((H - fh) / 2);
    const y0 = Math.max(0, Math.round(off + fh * (+z.arriba - 4) / 100)), y1 = Math.min(H, Math.round(off + fh * (+z.abajo + 4) / 100));
    band = { y0, y1: Math.max(y1, y0 + 120), top: (y0 + y1) / 2 < H * 0.4 };
    band.y1 = Math.min(H, band.y1);
    log(`Tapo los subtítulos originales (franja ${Math.round(+z.arriba)}%-${Math.round(+z.abajo)}%) y pongo los nuevos`);
  }
  fs.writeFileSync(Pth('main.ass'), assFor(words, text, dur, s.hook || '', s.ctas || [], band));
  log(`Estilo: color "${lookName}"${vary ? `, encuadre ${Math.round((zb - 1) * 100)}%${vsp > 1 ? ` y ritmo ${Math.round((sp - 1) * 100)}% más ágil` : ''}` : ''}${dub ? ' · voces: doblaje' : ''}`);
  const args = ['-ss', String(ini), '-i', src, '-i', path.basename(voice)]; // el video no se repite: el audio se ajusta a él
  let f = `[0:v]setpts=PTS/${vsp},fps=${FPS},setsar=1,` + (vertical
    ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}[base]`
    : `split[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=28:2,eq=brightness=-0.18:saturation=1.2[bg];[b]scale=${W}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[base]`);
  // Corrección de color tipo cine: más contraste, color y nitidez.
  if (band) f += `;[base]split[bo][bc];[bc]crop=${W}:${band.y1 - band.y0}:0:${band.y0},boxblur=26:4,eq=brightness=-0.12[bb];[bo][bb]overlay=0:${band.y0}[base2]`;
  f += `;[${band ? 'base2' : 'base'}]${LOOKS[lookName]},unsharp=5:5:0.55[cg]`;
  f += `;[cg]zoompan=z='${zb}+0.03*sin(in/90)${fxz.z}':x='iw/2-iw/zoom/2+(${ox})${fxz.dx}':y='ih/2-ih/zoom/2+(${oy})${fxz.dy}':d=1:s=${W}x${H}:fps=${FPS}${director.flashGlitch(plan.fx, 0, dur)},vignette=PI/6[v1]`;
  let last = 'v1', n = 2;
  if (fs.existsSync(logoFile)) {
    args.push('-loop', '1', '-i', logoFile);
    f += `;[${n}:v]scale=170:170:force_original_aspect_ratio=decrease,format=rgba,colorchannelmixer=aa=0.88[lg];[${last}][lg]overlay=W-w-40:70:shortest=1[v${n}]`;
    last = 'v' + n; n++;
  }
  args.push('-f', 'lavfi', '-i', `color=c=0xFFD400:s=${W}x14:r=${FPS}`);
  f += `;[${last}][${n}:v]overlay=x='-w+w*t/${dur.toFixed(3)}':y=H-14:shortest=1[v${n}]`;
  last = 'v' + n; n++;
  f += `;[${last}]subtitles=main.ass,format=yuv420p[v]`;
  const ins = sfx.map((x, k) => {
    args.push('-i', x.file);
    const ms = Math.max(0, Math.round(x.at * 1000));
    return `[${n + k}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${x.vol}${x.fin ? `,atrim=0:${Math.max(0.3, x.fin - x.at).toFixed(2)},afade=t=out:st=${Math.max(0, x.fin - x.at - 1).toFixed(2)}:d=1` : ''},adelay=${ms}|${ms}[s${k}]`;
  });
  f += `;[1:a]aformat=sample_rates=44100:channel_layouts=stereo,apad[va]` + (ins.length ? ';' + ins.join(';') + `;[va]${sfx.map((_, k) => `[s${k}]`).join('')}amix=inputs=${sfx.length + 1}:duration=first:normalize=0[a]` : ';[va]anull[a]');
  await ff([...args, '-filter_complex', f, '-map', '[v]', '-map', '[a]', '-t', dur.toFixed(2), '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-ar', '44100', '-ac', '2', 'main.mp4'], d);

  // 6) Cierres (YouTube / TikTok-Facebook) sobre el último cuadro difuminado
  await ff(['-sseof', '-0.5', '-i', 'main.mp4', '-frames:v', '1', '-q:v', '3', 'last.jpg'], d);
  const q = s.comment_question || '¿Tú qué opinas?';
  const versions = {
    youtube: { narr: `${q} Déjamelo en los comentarios. Y si te gustó, suscríbete a ${ch.name} para más videos así.${ch.frase ? ' ' + ch.frase : ''}`, button: 'SUSCRÍBETE', sub: 'Y activa la campanita' },
    social: { narr: `${q} Déjamelo en los comentarios. Y síguenos en ${ch.name} para más.${ch.frase ? ' ' + ch.frase : ''}`, button: 'SÍGUENOS', sub: 'Y compártelo con alguien' },
  };
  const items = Object.keys(versions).map(k => ({ text: versions[k].narr, base: Pth('cta_' + k), v: R.voiceOf(ch, null, s.voces) }));
  await synthAll(items, log);
  await R.normalizeVoices(items, d);
  const out = { youtube: 'video_youtube.mp4', social: 'video_tiktok_facebook.mp4' };
  // Música: en "mejorar" tu video ya trae su audio; solo se agrega si el canal lo pide.
  const song = fondoOriginal || R.fondoDe(ch, j.fondo, (mode === 'nueva_voz' || dub || ch.reeditMusic) ? R.pickSong(ch) : null);
  for (const [i, k] of Object.keys(versions).entries()) {
    log(`Cierre para ${k === 'youtube' ? 'YouTube' : 'TikTok y Facebook'}`);
    const c = versions[k], cd = await secs(items[i].file) + 0.8;
    fs.writeFileSync(Pth(`cta_${k}.ass`), R.ctaAss(q, ch.name, c.button, c.sub, cd, fs.existsSync(logoFile)));
    const a2 = ['-loop', '1', '-i', 'last.jpg', '-i', path.basename(items[i].file)];
    let g = `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=20:2,eq=brightness=-0.22,fps=${FPS}[bg]`, lst = 'bg';
    if (fs.existsSync(logoFile)) { a2.push('-loop', '1', '-i', logoFile); g += `;[2:v]scale=420:420:force_original_aspect_ratio=decrease,format=rgba,fade=in:st=0:d=0.5:alpha=1[lg];[bg][lg]overlay=(W-w)/2:560[l]`; lst = 'l'; }
    g += `;[${lst}]subtitles=cta_${k}.ass,format=yuv420p[v]`;
    await ff([...a2, '-filter_complex', g, '-map', '[v]', '-map', '1:a', '-af', 'apad', '-t', cd.toFixed(2), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-ar', '44100', '-ac', '2', `cta_${k}.mp4`], d);
    fs.writeFileSync(Pth(`list_${k}.txt`), `file 'main.mp4'\nfile 'cta_${k}.mp4'`);
    await ff(['-f', 'concat', '-safe', '0', '-i', `list_${k}.txt`, '-c', 'copy', `j_${k}.mp4`], d);
    await R.finalMix(d, `j_${k}.mp4`, song, out[k], j.fondo?.vol, !fondoOriginal);
  }

  log('Creando portada');
  fs.writeFileSync(Pth('cover.ass'), R.coverAss(s.thumbnail_text || s.hook || ''));
  await ff(['-ss', String(Math.min(1.5, dur / 3)), '-i', 'main.mp4', '-vf', 'subtitles=cover.ass', '-frames:v', '1', '-q:v', '3', 'portada.jpg'], d).catch(() => {});
  // Quién habla (con su imagen) para poder cambiarle la voz desde el panel.
  let voces = dub?.voces || [];
  if (!dub && mode === 'nueva_voz' && s.narration) {
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(ini + Math.min(1, dur0 / 3)), '-i', src, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', Pth('voz_0.jpg')]).catch(() => {});
    const v = R.voiceOf(ch, null, s.voces, s._ov);
    voces = [{ nombre: 'Narrador', img: 'voz_0.jpg', preset: v.preset || '', voice: v.voice || '' }];
  }
  // Personajes que hablan o podrían hablar (con su foto) para elegirles voz desde el panel.
  let personajes = [];
  if (!dub && Array.isArray(vis?.personajes)) {
    for (const [k, p] of vis.personajes.filter(p => p && typeof p === 'object' && p.nombre && p.puede_hablar !== false).slice(0, 5).entries()) {
      const t = vis._t?.[Math.max(0, Math.min(5, (+p.foto || 1) - 1))] ?? ini + dur0 / 2;
      const img = `pj_${k}.jpg`;
      await run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(2), '-i', src, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', Pth(img)]).catch(() => {});
      const r0 = (ch.reparto || []).find(r => r.nombre.toLowerCase() === String(p.nombre).toLowerCase());
      personajes.push({ nombre: String(p.nombre).slice(0, 40), descripcion: String(p.descripcion || '').slice(0, 160), genero: p.genero === 'F' ? 'F' : 'M', img, preset: r0?.preset || '', voice: r0?.voice || '' });
    }
  }
  fs.readdirSync(d).filter(x => !/^(video_.*\.mp4|portada\.jpg|voz_\d+\.jpg|pj_\d+\.jpg)$/.test(x)).forEach(x => fs.rmSync(Pth(x), { recursive: true, force: true }));
  delete s._ov;
  return { s, result: { dir: id, files: { ...out, cover: fs.existsSync(Pth('portada.jpg')) ? 'portada.jpg' : null }, credits: [], aiImages: 0, karaoke: words.length > 0, reedit: dub ? 'doblaje' : mode, reparto: dub?.reparto, voces, personajes, teniaVoces: !!(tr?.frases?.length), fondo: fondoOriginal ? 'original ajustado' : song ? (j.fondo?.modo === 'cambiar' ? 'cambiado' : 'música') : (j.fondo?.modo === 'quitar' ? 'quitado' : info.audio ? 'original' : 'ninguno') } };
}

// Antes de reeditar: mira el video, saca la foto de cada personaje que hablaría y se queda esperando
// a que elijas sus voces (y el sonido de fondo) en el panel.
async function preparar({ ch, j, log = () => {} }) {
  const src = j.source, info = await probe(src);
  const ini = j.segment ? j.segment.inicio : 0, fin = j.segment ? Math.min(j.segment.fin, info.dur) : info.dur, dur0 = fin - ini;
  if (j.transcript === undefined && info.audio) { j.transcript = await transcribir(src, log) || null; }
  const tr = j.transcript, frases = (tr?.frases || []).filter(f => f.fin > ini && f.inicio < fin);
  const vis = j.visual || await describeVideo(ch, src, ini, dur0, log);
  if (!vis) throw Object.assign(new Error('No pude mirar el video para mostrarte sus personajes (las IA que ven imágenes están sin cuota ahora). Lo reintento solo en 2 horas.'), { retryable: true });
  j.visual = vis;
  const dir = path.join(DATA, 'videos', 'pre-' + j.id); fs.mkdirSync(dir, { recursive: true });
  const personajes = [];
  for (const [k, p] of (Array.isArray(vis.personajes) ? vis.personajes : []).filter(p => p && typeof p === 'object' && p.nombre && p.puede_hablar !== false).slice(0, 5).entries()) {
    const t = vis._t?.[Math.max(0, Math.min(5, (+p.foto || 1) - 1))] ?? ini + dur0 / 2;
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(2), '-i', src, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', path.join(dir, `pj_${k}.jpg`)]).catch(() => {});
    const r0 = (ch.reparto || []).find(r => r.nombre.toLowerCase() === String(p.nombre).toLowerCase());
    personajes.push({ nombre: String(p.nombre).slice(0, 40), descripcion: String(p.descripcion || '').slice(0, 160), genero: p.genero === 'F' ? 'F' : 'M', img: `/files/videos/pre-${j.id}/pj_${k}.jpg`, sugerida: r0?.voice?.startsWith('clon:') ? r0.voice : (r0?.preset || (p.genero === 'F' ? 'mujer' : 'hombre')) });
  }
  return { personajes, teniaVoces: frases.length > 0, audio: info.audio, descripcion: vis.descripcion || '' };
}

// Videos largos: la IA elige de 1 a 3 tramos que funcionan solos como Shorts.
async function chooseShorts({ ch, j, log }) {
  const info = await probe(j.source);
  if (j.transcript === undefined && info.audio) j.transcript = await transcribir(j.source, log) || null;
  if (!j.visual) j.visual = await describeVideo(ch, j.source, 0, info.dur, log);
  const ctx = { ...(j.transcript || {}), nombre: path.basename(j.source), visual: j.visual ? `${j.visual.descripcion} Tema: ${j.visual.tema}` : '' };
  const r = await ai.ask(P.reeditP(ch, ctx, info.dur, 'mejorar', true), { json: true, log });
  const sh = (parseJSON(r.text).shorts || []).filter(x => x && x.fin - x.inicio >= 15 && x.fin - x.inicio <= 90 && x.inicio >= 0);
  return sh.length ? sh.slice(0, 3) : [{ inicio: 0, fin: Math.min(info.dur, 59), titulo: 'Parte 1' }];
}

module.exports = { preparar, reedit, chooseShorts, probe };
