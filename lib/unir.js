// 🎞️ Unir clips: junta varios clips cortos (por ejemplo, de 5–10 s hechos con una IA de video) en UN solo video vertical,
// con transiciones suaves entre ellos. Después pasa por "Reeditar" como cualquier video tuyo (voz, subtítulos, efectos, CTA).
const fs = require('fs'), path = require('path');
const { ff, secs } = require('./util');
const W = 1080, H = 1920, FPS = 30, T = 0.45; // transición en segundos

async function unirClips(files, out) {
  if (!files.length) throw new Error('No hay clips');
  const dur = []; for (const f of files) { const d = await secs(f); if (!(d > 0.6)) throw new Error('Un clip no se pudo leer: ' + path.basename(f)); dur.push(d); }
  const args = [], fil = [];
  files.forEach(f => args.push('-i', f));
  args.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
  // Cada clip: vertical 1080x1920. Si no es vertical, fondo difuminado + clip centrado (no se corta nada importante).
  files.forEach((_, i) => fil.push(`[${i}:v]fps=${FPS},split=2[a${i}][b${i}];[a${i}]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=24:2[bg${i}];[b${i}]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg${i}];[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p,settb=AVTB[v${i}]`));
  let last = 'v0', acc = dur[0];
  for (let i = 1; i < files.length; i++) {
    const t = Math.min(T, dur[i - 1] / 3, dur[i] / 3), off = Math.max(0, acc - t), tipo = ['fade', 'smoothleft', 'circleopen', 'fadewhite', 'slideup'][i % 5];
    fil.push(`[${last}][v${i}]xfade=transition=${tipo}:duration=${t.toFixed(3)}:offset=${off.toFixed(3)}[x${i}]`);
    last = 'x' + i; acc = off + dur[i];
  }
  await ff([...args, '-filter_complex', fil.join(';'), '-map', `[${last}]`, '-map', `${files.length}:a`, '-t', acc.toFixed(3), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
  return { duracion: acc, clips: files.length };
}
module.exports = { unirClips };
