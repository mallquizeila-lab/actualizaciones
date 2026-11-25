// 🔎 Revisión técnica de cada video terminado, ANTES de que se apruebe o publique solo.
// Sin IA y sin costo: ffmpeg mira el video completo y avisa si hay
//  - pantalla negra de más de 1 s,
//  - imagen congelada de más de 4 s (escena que no cargó),
//  - audio muy bajo, saturado o con silencios largos,
//  - ritmo lento «tipo diapositivas» (la imagen casi no cambia).
// Idea tomada de los «controles tras el render» de OpenMontage (solo la idea; el código es propio).
const { run } = require('./util'), { execFile } = require('child_process');

const num = (re, s) => [...String(s).matchAll(re)].map(m => +m[1]);

async function revisar(file, { congelado = 4, negro = 1, ritmo = true } = {}) {
  const P = [];
  const dur = parseFloat(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).catch(() => '0')) || 0;
  if (dur < 2) return { ok: false, dur, problemas: ['El video está vacío o no se pudo leer'] };
  // un solo pase de ffmpeg para todo (rápido incluso en el VPS); el informe sale por stderr
  const txt = await new Promise(ok => execFile('ffmpeg', ['-hide_banner', '-nostats', '-i', file,
    '-vf', `blackdetect=d=${negro}:pix_th=0.10,freezedetect=n=-55dB:d=${congelado},scdet=threshold=6`, '-af', 'ebur128=peak=true,silencedetect=noise=-50dB:d=3', '-f', 'null', '-'],
    { maxBuffer: 1 << 27, windowsHide: true }, (e, so, se) => ok(String(se || ''))));
  const negros = [...txt.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map(m => [+m[1], +m[2]]);
  const congelados = num(/freeze_duration: ([\d.]+)/g, txt);
  const silencios = num(/silence_duration: ([\d.]+)/g, txt);
  // 🎞️ Ritmo (detector de «video tipo diapositivas»): cada cuántos segundos cambia la imagen. Los virales cambian cada 2-3 s.
  const cortes = num(/lavfi\.scd\.time: ([\d.]+)/g, txt).filter((t, i, a) => !i || t - a[i - 1] > 0.4);
  const marcas = [0, ...cortes, dur], planos = marcas.slice(1).map((t, i) => t - marcas[i]);
  const plano = planos.length ? dur / planos.length : dur, maxPlano = planos.length ? Math.max(...planos) : dur;
  const I = num(/^\s+I:\s+(-?[\d.]+) LUFS/gm, txt).pop(), pico = num(/^\s+Peak:\s+(-?[\d.]+) dBFS/gm, txt).pop();
  // un fundido a negro al inicio o al final es normal; en medio no
  const malos = negros.filter(([a, b]) => a > 0.6 && b < dur - 0.6);
  if (malos.length) P.push(`Pantalla negra en medio del video (${malos.map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)} s`).join(', ')})`);
  if (congelados.length) P.push(`Imagen congelada ${congelados.length} vez/veces (la más larga: ${Math.max(...congelados).toFixed(1)} s): alguna escena no cargó`);
  if (I !== undefined && I < -26) P.push(`Audio muy bajo (${I} LUFS): casi no se escucha`);
  if (pico !== undefined && pico > 0.5) P.push(`Audio saturado (pico ${pico} dBFS): se escucha distorsionado`);
  const silLargo = silencios.filter(x => x >= 3);
  if (silLargo.length && silLargo.reduce((a, b) => a + b, 0) > dur * 0.25) P.push(`Demasiado silencio (${silLargo.reduce((a, b) => a + b, 0).toFixed(0)} s sin sonido)`);
  if (ritmo && dur >= 15 && (plano > 7 || maxPlano > 14)) P.push(`Ritmo lento tipo diapositivas: la imagen cambia cada ${plano.toFixed(1)} s en promedio${maxPlano > 14 ? ` y hay una escena de ${maxPlano.toFixed(0)} s` : ''} (los videos que retienen cambian cada 2 a 3 s)`);
  return { ok: !P.length, dur: +dur.toFixed(1), lufs: I ?? null, pico: pico ?? null, cortes: cortes.length, plano: +plano.toFixed(1), maxPlano: +maxPlano.toFixed(1), problemas: P };
}

module.exports = { revisar };
