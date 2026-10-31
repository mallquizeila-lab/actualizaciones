// Voces de personaje propias: se crean a partir de las voces con licencia (Edge/Kokoro) cambiando
// tono, velocidad y timbre. NO imitan a ninguna persona ni personaje existente: son voces nuevas.
// Además, todas las voces pasan por una cadena "voz natural" (ecualización cálida, compresión suave
// y un poco de ambiente) para que no suenen a robot.
//
//  edgePitch/edgeRate: se piden a Edge (cambio natural de entonación).
//  timbre: factor de "tamaño" de la voz (>1 = más pequeña/aguda tipo dibujo, <1 = más grande/grave).
//          Se aplica con ffmpeg manteniendo la duración.
//  fx: efectos extra (temblor de anciano, eco de narrador...).
const PRESETS = [
  // --- Niños y jóvenes ---
  { id: 'nino', nombre: 'Niño (8 años)', grupo: 'Niños y jóvenes', g: 'F', voces: ['es-MX-DaliaNeural', 'es-CO-SalomeNeural'], edgePitch: 22, edgeRate: 6, timbre: 1.12 },
  { id: 'nina', nombre: 'Niña (8 años)', grupo: 'Niños y jóvenes', g: 'F', voces: ['es-PE-CamilaNeural', 'es-US-PalomaNeural'], edgePitch: 30, edgeRate: 8, timbre: 1.14 },
  { id: 'chico', nombre: 'Adolescente chico', grupo: 'Niños y jóvenes', g: 'M', voces: ['es-PE-AlexNeural', 'es-US-AlonsoNeural'], edgePitch: 14, edgeRate: 8, timbre: 1.05 },
  { id: 'chica', nombre: 'Adolescente chica', grupo: 'Niños y jóvenes', g: 'F', voces: ['es-CO-SalomeNeural', 'es-AR-ElenaNeural'], edgePitch: 12, edgeRate: 10, timbre: 1.04 },
  // --- Adultos ---
  { id: 'hombre', nombre: 'Hombre adulto (natural)', grupo: 'Adultos', g: 'M', voces: ['es-MX-JorgeNeural', 'es-CO-GonzaloNeural'], edgePitch: 0, edgeRate: 4 },
  { id: 'mujer', nombre: 'Mujer adulta (natural)', grupo: 'Adultos', g: 'F', voces: ['es-MX-DaliaNeural', 'es-CO-SalomeNeural'], edgePitch: 0, edgeRate: 4 },
  { id: 'locutor', nombre: 'Locutor de radio', grupo: 'Adultos', g: 'M', voces: ['es-US-AlonsoNeural', 'es-MX-JorgeNeural'], edgePitch: -6, edgeRate: 2, timbre: 0.97, fx: 'equalizer=f=120:t=q:w=1:g=3' },
  { id: 'locutora', nombre: 'Locutora cálida', grupo: 'Adultos', g: 'F', voces: ['es-US-PalomaNeural', 'es-MX-DaliaNeural'], edgePitch: -4, edgeRate: 2, fx: 'equalizer=f=200:t=q:w=1:g=2' },
  { id: 'mama', nombre: 'Mamá cariñosa', grupo: 'Adultos', g: 'F', voces: ['es-PE-CamilaNeural', 'es-CR-MariaNeural'], edgePitch: 4, edgeRate: -4 },
  // --- Mayores ---
  { id: 'abuelo', nombre: 'Abuelo sabio', grupo: 'Mayores', g: 'M', voces: ['es-CO-GonzaloNeural', 'es-MX-JorgeNeural'], edgePitch: -14, edgeRate: -14, timbre: 0.96, fx: 'vibrato=f=5.5:d=0.12' },
  { id: 'abuela', nombre: 'Abuela tierna', grupo: 'Mayores', g: 'F', voces: ['es-MX-DaliaNeural', 'es-PE-CamilaNeural'], edgePitch: -10, edgeRate: -13, timbre: 0.98, fx: 'vibrato=f=5:d=0.14' },
  // --- Narradores ---
  { id: 'epico', nombre: 'Narrador épico', grupo: 'Narradores', g: 'M', voces: ['es-MX-JorgeNeural', 'es-ES-AlvaroNeural'], edgePitch: -12, edgeRate: -8, timbre: 0.93, fx: 'aecho=0.8:0.6:60|110:0.18|0.1' },
  { id: 'misterio', nombre: 'Narrador de misterio', grupo: 'Narradores', g: 'M', voces: ['es-AR-TomasNeural', 'es-CO-GonzaloNeural'], edgePitch: -10, edgeRate: -10, timbre: 0.95, fx: 'aecho=0.8:0.5:80|140:0.2|0.12,lowpass=f=7000' },
  { id: 'emocionado', nombre: 'Presentador emocionado', grupo: 'Narradores', g: 'M', voces: ['es-US-AlonsoNeural', 'es-PE-AlexNeural'], edgePitch: 8, edgeRate: 14 },
  // --- Graciosos (dibujos) ---
  { id: 'fruta', nombre: 'Fruta traviesa', grupo: 'Graciosos (dibujos)', g: 'F', voces: ['es-CO-SalomeNeural', 'es-PE-CamilaNeural'], edgePitch: 18, edgeRate: 10, timbre: 1.22 },
  { id: 'ardilla', nombre: 'Ardillita acelerada', grupo: 'Graciosos (dibujos)', g: 'M', voces: ['es-PE-AlexNeural', 'es-MX-JorgeNeural'], edgePitch: 20, edgeRate: 16, timbre: 1.38 },
  { id: 'gruñon', nombre: 'Gruñón cascarrabias', grupo: 'Graciosos (dibujos)', g: 'M', voces: ['es-CO-GonzaloNeural', 'es-CL-LorenzoNeural'], edgePitch: -8, edgeRate: -4, timbre: 0.86 },
  { id: 'gigante', nombre: 'Gigante bonachón', grupo: 'Graciosos (dibujos)', g: 'M', voces: ['es-MX-JorgeNeural', 'es-AR-TomasNeural'], edgePitch: -10, edgeRate: -10, timbre: 0.78, fx: 'aecho=0.8:0.4:40:0.12' },
  { id: 'villano', nombre: 'Villano de caricatura', grupo: 'Graciosos (dibujos)', g: 'M', voces: ['es-ES-AlvaroNeural', 'es-AR-TomasNeural'], edgePitch: -6, edgeRate: -6, timbre: 0.85, fx: 'aecho=0.8:0.55:70|120:0.2|0.1' },
  { id: 'chismosa', nombre: 'Vecina chismosa', grupo: 'Graciosos (dibujos)', g: 'F', voces: ['es-VE-PaolaNeural', 'es-DO-RamonaNeural'], edgePitch: 14, edgeRate: 14, timbre: 1.1 },
  // --- Más personajes ---
  { id: 'bebe', nombre: 'Bebé tierno', grupo: 'Niños y jóvenes', g: 'F', voces: ['es-US-PalomaNeural', 'es-MX-DaliaNeural'], edgePitch: 35, edgeRate: -6, timbre: 1.25 },
  { id: 'princesa', nombre: 'Princesa dulce', grupo: 'Personajes', g: 'F', voces: ['es-CO-SalomeNeural', 'es-UY-ValentinaNeural'], edgePitch: 16, edgeRate: -2, timbre: 1.08, fx: 'aecho=0.8:0.3:30:0.08' },
  { id: 'heroe', nombre: 'Héroe valiente', grupo: 'Personajes', g: 'M', voces: ['es-ES-AlvaroNeural', 'es-US-AlonsoNeural'], edgePitch: -4, edgeRate: 4, timbre: 0.95 },
  { id: 'presumido', nombre: 'Presumido creído', grupo: 'Personajes', g: 'M', voces: ['es-AR-TomasNeural', 'es-VE-SebastianNeural'], edgePitch: 6, edgeRate: -6, timbre: 1.03 },
  { id: 'timido', nombre: 'Tímido nervioso', grupo: 'Personajes', g: 'M', voces: ['es-PE-AlexNeural', 'es-UY-MateoNeural'], edgePitch: 10, edgeRate: 6, timbre: 1.06, fx: 'vibrato=f=7:d=0.08' },
  { id: 'dormilon', nombre: 'Dormilón flojo', grupo: 'Personajes', g: 'M', voces: ['es-BO-MarceloNeural', 'es-CL-LorenzoNeural'], edgePitch: -8, edgeRate: -22, timbre: 0.94 },
  { id: 'bruja', nombre: 'Bruja traviesa', grupo: 'Personajes', g: 'F', voces: ['es-VE-PaolaNeural', 'es-ES-ElviraNeural'], edgePitch: 10, edgeRate: -4, timbre: 1.12, fx: 'vibrato=f=6:d=0.2,aecho=0.8:0.4:50:0.12' },
  { id: 'monstruo', nombre: 'Monstruo tierno', grupo: 'Graciosos (dibujos)', g: 'M', voces: ['es-MX-JorgeNeural', 'es-CO-GonzaloNeural'], edgePitch: -14, edgeRate: -8, timbre: 0.72, fx: 'aecho=0.8:0.4:35:0.15' },
  { id: 'payaso', nombre: 'Payaso alegre', grupo: 'Graciosos (dibujos)', g: 'M', voces: ['es-DO-EmilioNeural', 'es-PR-VictorNeural'], edgePitch: 16, edgeRate: 14, timbre: 1.16 },
  { id: 'mago', nombre: 'Mago misterioso', grupo: 'Personajes', g: 'M', voces: ['es-ES-AlvaroNeural', 'es-GT-AndresNeural'], edgePitch: -10, edgeRate: -10, timbre: 0.9, fx: 'aecho=0.8:0.55:90|160:0.18|0.1' },
  { id: 'reportero', nombre: 'Reportero de noticias', grupo: 'Narradores', g: 'M', voces: ['es-US-AlonsoNeural', 'es-CR-JuanNeural'], edgePitch: 0, edgeRate: 10, fx: 'equalizer=f=2500:t=q:w=1:g=2' },
  { id: 'entrenador', nombre: 'Entrenador motivador', grupo: 'Narradores', g: 'M', voces: ['es-MX-JorgeNeural', 'es-CO-GonzaloNeural'], edgePitch: 4, edgeRate: 12, timbre: 0.98 },
  { id: 'susurro', nombre: 'Susurro (secreto)', grupo: 'Narradores', g: 'F', voces: ['es-MX-DaliaNeural', 'es-AR-ElenaNeural'], edgePitch: -4, edgeRate: -12, fx: 'highpass=f=300,volume=0.9' },
  // --- Acentos latinos (naturales) ---
  { id: 'mexicano', nombre: 'Acento mexicano', grupo: 'Acentos', g: 'M', voces: ['es-MX-JorgeNeural'], edgePitch: 0, edgeRate: 4 },
  { id: 'mexicana', nombre: 'Acento mexicano (mujer)', grupo: 'Acentos', g: 'F', voces: ['es-MX-DaliaNeural'], edgePitch: 0, edgeRate: 4 },
  { id: 'peruano', nombre: 'Acento peruano', grupo: 'Acentos', g: 'M', voces: ['es-PE-AlexNeural'], edgePitch: 0, edgeRate: 2 },
  { id: 'peruana', nombre: 'Acento peruano (mujer)', grupo: 'Acentos', g: 'F', voces: ['es-PE-CamilaNeural'], edgePitch: 0, edgeRate: 2 },
  { id: 'argentino', nombre: 'Acento argentino', grupo: 'Acentos', g: 'M', voces: ['es-AR-TomasNeural'], edgePitch: 0, edgeRate: 4 },
  { id: 'colombiana', nombre: 'Acento colombiano (mujer)', grupo: 'Acentos', g: 'F', voces: ['es-CO-SalomeNeural'], edgePitch: 0, edgeRate: 4 },
  { id: 'caribeno', nombre: 'Acento caribeño', grupo: 'Acentos', g: 'M', voces: ['es-DO-EmilioNeural', 'es-PR-VictorNeural'], edgePitch: 0, edgeRate: 8 },
  { id: 'espanol', nombre: 'Acento de España', grupo: 'Acentos', g: 'M', voces: ['es-ES-AlvaroNeural'], edgePitch: 0, edgeRate: 2 },
];
const byId = id => PRESETS.find(p => p.id === id);

// Cadena "voz natural": quita graves sucios, calienta la voz, suaviza las "s", compresión ligera y un
// toque de ambiente de habitación (sin eco notorio). Se aplica a todas las voces del sistema.
const NATURAL = 'highpass=f=75,equalizer=f=180:t=q:w=1.2:g=1.5,equalizer=f=3200:t=q:w=1.5:g=1.2,deesser=i=0.35,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,aecho=0.9:0.25:18|31:0.07|0.05';

const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// Devuelve la voz final {voice, rate, pitch, preset} a partir de la voz elegida y el tipo de voz.
// Si la voz elegida es del mismo género que el tipo, se respeta (identidad del canal); si no, se usa
// una voz del tipo, siempre la misma para el mismo personaje.
function aplicar(base, presetId, catalog, who = '') {
  const p = byId(presetId);
  if (!p) return { ...base };
  const g = (catalog || []).find(v => v.id === base.voice)?.gender;
  const voice = base.voice && !String(base.voice).startsWith('clon:') && g === p.g ? base.voice : p.voces[hash(who || p.id) % p.voces.length];
  return { voice, rate: (Number(base.rate) || 0) + p.edgeRate, pitch: (Number(base.pitch) || 0) + p.edgePitch, preset: p.id };
}

// Filtro de ffmpeg para el tipo de voz (+ cadena natural).
function filtro(presetId, natural = true) {
  const p = byId(presetId), f = ['aresample=44100'];
  if (p?.timbre && Math.abs(p.timbre - 1) > 0.005) {
    const t = p.timbre;
    // asetrate cambia tono y timbre; atempo devuelve la duración original.
    const tempos = []; let x = 1 / t;
    while (x < 0.5) { tempos.push(0.5); x /= 0.5; }
    while (x > 2) { tempos.push(2); x /= 2; }
    tempos.push(+x.toFixed(4));
    f.push(`asetrate=44100*${t},aresample=44100,${tempos.map(a => 'atempo=' + a).join(',')}`);
  }
  if (p?.fx) f.push(p.fx);
  if (natural) f.push(NATURAL);
  return f.length > 1 ? f.join(',') : '';
}

const lista = () => PRESETS.map(p => ({ id: p.id, nombre: p.nombre, grupo: p.grupo, g: p.g }));
const ids = () => PRESETS.map(p => p.id);

module.exports = { PRESETS, aplicar, filtro, lista, ids, byId, NATURAL };
