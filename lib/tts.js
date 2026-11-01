// Voces. Tres motores, todos con licencia para uso comercial:
//   edge:   voces neuronales de Microsoft Edge (gratis, por internet, vía el paquete edge-tts).
//   kokoro: Kokoro-82M en tu PC (sin internet; respaldo cuando Edge falla).
//   clon:   tu voz o la de alguien que te dio permiso, clonada con Chatterbox en tu PC.
// Ids: "es-MX-JorgeNeural" (edge), "kokoro:em_alex", "clon:<id>".
// TTS_FAKE=1 genera un tono para pruebas.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { E, run, ff, secs, ROOT, DATA } = require('./util');
const { db, saveAll } = require('./store');

const EDGE = [
  ['es-MX-DaliaNeural', 'Dalia', 'México', 'F'], ['es-MX-JorgeNeural', 'Jorge', 'México', 'M'],
  ['es-CO-SalomeNeural', 'Salomé', 'Colombia', 'F'], ['es-CO-GonzaloNeural', 'Gonzalo', 'Colombia', 'M'],
  ['es-PE-CamilaNeural', 'Camila', 'Perú', 'F'], ['es-PE-AlexNeural', 'Alex', 'Perú', 'M'],
  ['es-AR-ElenaNeural', 'Elena', 'Argentina', 'F'], ['es-AR-TomasNeural', 'Tomás', 'Argentina', 'M'],
  ['es-CL-CatalinaNeural', 'Catalina', 'Chile', 'F'], ['es-CL-LorenzoNeural', 'Lorenzo', 'Chile', 'M'],
  ['es-VE-PaolaNeural', 'Paola', 'Venezuela', 'F'], ['es-VE-SebastianNeural', 'Sebastián', 'Venezuela', 'M'],
  ['es-EC-AndreaNeural', 'Andrea', 'Ecuador', 'F'], ['es-EC-LuisNeural', 'Luis', 'Ecuador', 'M'],
  ['es-BO-SofiaNeural', 'Sofía', 'Bolivia', 'F'], ['es-BO-MarceloNeural', 'Marcelo', 'Bolivia', 'M'],
  ['es-UY-ValentinaNeural', 'Valentina', 'Uruguay', 'F'], ['es-UY-MateoNeural', 'Mateo', 'Uruguay', 'M'],
  ['es-US-PalomaNeural', 'Paloma', 'EE. UU. (latino)', 'F'], ['es-US-AlonsoNeural', 'Alonso', 'EE. UU. (latino)', 'M'],
  ['es-GT-MartaNeural', 'Marta', 'Guatemala', 'F'], ['es-GT-AndresNeural', 'Andrés', 'Guatemala', 'M'],
  ['es-CR-MariaNeural', 'María', 'Costa Rica', 'F'], ['es-CR-JuanNeural', 'Juan', 'Costa Rica', 'M'],
  ['es-DO-RamonaNeural', 'Ramona', 'R. Dominicana', 'F'], ['es-DO-EmilioNeural', 'Emilio', 'R. Dominicana', 'M'],
  ['es-PR-KarinaNeural', 'Karina', 'Puerto Rico', 'F'], ['es-PR-VictorNeural', 'Víctor', 'Puerto Rico', 'M'],
  ['es-ES-ElviraNeural', 'Elvira', 'España', 'F'], ['es-ES-AlvaroNeural', 'Álvaro', 'España', 'M'],
].map(([id, name, country, g]) => ({ id, name, group: 'Edge · ' + country, gender: g, engine: 'edge' }));
// Voces "multilingües" de Microsoft: más nuevas y expresivas (entonación más humana). Hablan español;
// algunas pueden tener un leve acento extranjero: escúchalas y quédate con las que te gusten.
EDGE.push(...[
  ['en-US-AndrewMultilingualNeural', 'Andrew (multilingüe)', 'M'], ['en-US-BrianMultilingualNeural', 'Brian (multilingüe)', 'M'],
  ['en-US-AvaMultilingualNeural', 'Ava (multilingüe)', 'F'], ['en-US-EmmaMultilingualNeural', 'Emma (multilingüe)', 'F'],
  ['fr-FR-RemyMultilingualNeural', 'Remy (multilingüe)', 'M'], ['fr-FR-VivienneMultilingualNeural', 'Vivienne (multilingüe)', 'F'],
  ['de-DE-FlorianMultilingualNeural', 'Florian (multilingüe)', 'M'], ['de-DE-SeraphinaMultilingualNeural', 'Seraphina (multilingüe)', 'F'],
  ['it-IT-GiuseppeMultilingualNeural', 'Giuseppe (multilingüe)', 'M'], ['pt-BR-ThalitaMultilingualNeural', 'Thalita (multilingüe)', 'F'],
].map(([id, name, g]) => ({ id, name, group: 'Edge · Multilingües (más expresivas, prueba)', gender: g, engine: 'edge' })));
const KOKORO = [['ef_dora', 'Dora', 'F'], ['em_alex', 'Alex', 'M'], ['em_santa', 'Santa', 'M']]
  .map(([k, name, g]) => ({ id: 'kokoro:' + k, name, group: 'Kokoro (sin internet)', gender: g, engine: 'kokoro' }));

function catalog() {
  const clones = db.voices.map(v => ({ id: 'clon:' + v.id, name: v.name, group: 'Mis voces (clonadas con permiso)', gender: v.gender || 'M', engine: 'clon', owner: v.owner }));
  return [...EDGE, ...KOKORO, ...clones];
}

// ---------- Herramientas locales (las instala instalar_ia_local.bat) ----------
// La IA local se instala en la carpeta de datos (no se pierde al actualizar el programa).
const { USERDATA } = require('./util');
const IA_DIR = [path.join(USERDATA, 'ia'), ROOT].find(d => fs.existsSync(path.join(d, 'ia_local'))) || path.join(USERDATA, 'ia');
const venvPy = dir => path.join(IA_DIR, dir, process.platform === 'win32' ? 'Scripts\\python.exe' : 'bin/python');
const PY_LOCAL = venvPy('.venv'), PY_CLON = venvPy(path.join('motor_chatterbox', 'venv'));
const ok = n => fs.existsSync(path.join(IA_DIR, 'ia_local', n + '.ok'));
const local = () => ({ kokoro: ok('kokoro') && fs.existsSync(PY_LOCAL), whisper: ok('whisper') && fs.existsSync(PY_LOCAL), chatterbox: ok('chatterbox') && fs.existsSync(PY_CLON), demucs: ok('demucs') && fs.existsSync(PY_CLON) });

const PY = E.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
let edgeOk = null;
async function edgeAvailable() {
  if (edgeOk === null) edgeOk = await run(PY, ['-m', 'edge_tts', '--help']).then(() => true, () => false);
  return edgeOk;
}

// Ejecuta un script de python/ en lote con una lista de tareas (el modelo se carga una vez).
async function batch(py, script, mode, items, log, tag, timeout = 3 * 3600 * 1000) {
  const f = path.join(DATA, 'cache', 'items-' + crypto.randomBytes(4).toString('hex') + '.json');
  fs.writeFileSync(f, JSON.stringify(items));
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', HF_HUB_DISABLE_XET: '1', WHISPER_MODEL: db.settings.whisperModel || 'base' };
  // Kokoro necesita saber dónde está eSpeak NG en Windows (idea de INICIAR.bat de Video Relaunch).
  const espeak = 'C:\\Program Files\\eSpeak NG';
  if (process.platform === 'win32' && fs.existsSync(espeak)) { env.PHONEMIZER_ESPEAK_LIBRARY = espeak + '\\libespeak-ng.dll'; env.PATH = (env.PATH || env.Path || '') + ';' + espeak; }
  try {
    const out = await run(py, [path.join(ROOT, 'python', script), ...(mode ? [mode] : []), f], { env, timeout });
    const last = String(out).trim().split('\n').filter(l => /cargado/.test(l)).pop();
    if (last) log(tag + ': ' + last.trim());
  } finally { fs.rmSync(f, { force: true }); }
}

const sign = (v, unit) => { const n = Math.round(Number(v) || 0); return (n >= 0 ? '+' : '') + n + unit; };
const PS = "Add-Type -AssemblyName System.Speech;$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;$v=$s.GetInstalledVoices()|%{$_.VoiceInfo}|?{$_.Culture.Name -like 'es*'}|select -First 1;if($v){$s.SelectVoice($v.Name)};$s.SetOutputToWaveFile($env:TTS_OUT);$s.Speak($env:TTS_TEXT);$s.Dispose()";

async function edgeOne(it) {
  const v = it.v;
  for (let i = 0; i < 3; i++) {
    try {
      await run(PY, ['-m', 'edge_tts', '--voice', v.voice, `--rate=${sign(v.rate, '%')}`, `--pitch=${sign(v.pitch, 'Hz')}`, '--text', it.text, '--write-media', it.base + '.mp3']);
      if (fs.existsSync(it.base + '.mp3') && fs.statSync(it.base + '.mp3').size > 1000) return it.base + '.mp3';
    } catch (e) { if (i === 2) throw e; }
  }
  throw new Error('Edge no devolvió audio');
}
async function systemOne(it) {
  if (process.platform === 'win32') { await run('powershell', ['-NoProfile', '-Command', PS], { env: { ...E, TTS_TEXT: it.text, TTS_OUT: it.base + '.wav' } }); return it.base + '.wav'; }
  if (process.platform === 'darwin') { await run('say', ['-o', it.base + '.aiff', it.text]); return it.base + '.aiff'; }
  throw new Error('No hay ninguna voz disponible');
}
const kokoroFor = v => {
  if (v.voice?.startsWith('kokoro:')) return v.voice.slice(7);
  const g = catalog().find(x => x.id === v.voice)?.gender;
  return g === 'F' ? 'ef_dora' : 'em_alex';
};

// items: [{ text, base, v:{voice, rate, pitch} }] -> rellena it.file. Agrupa por motor y aplica respaldos.
async function synthAll(items, log = () => {}) {
  for (const it of items) it.text = String(it.text).replace(/\s+/g, ' ').trim();
  if (E.TTS_FAKE) {
    for (const it of items) { await ff(['-f', 'lavfi', '-i', `sine=f=220:d=${Math.max(1.2, it.text.split(' ').length * 0.36)}`, '-af', 'volume=8dB,apulsator=hz=4', it.base + '.wav']); it.file = it.base + '.wav'; }
    return items;
  }
  const L = local(), edge = await edgeAvailable();
  const pending = { clon: [], kokoro: [], edge: [] };
  for (const it of items) {
    const id = it.v.voice || 'es-MX-JorgeNeural';
    if (id.startsWith('clon:')) {
      const c = db.voices.find(x => 'clon:' + x.id === id);
      // Si esta PC es muy lenta clonando (sin tarjeta NVIDIA), se usa una voz normal parecida: el video sale en minutos y no en horas.
      const lenta = db.settings.cloneSlow !== true && (db.settings.cloneSpeed || 0) > 45;
      if (c && L.chatterbox && !lenta) { pending.clon.push({ ...it, ref: path.join(DATA, 'voces', c.id + '.wav') }); continue; }
      if (c && lenta && !synthAll._avisoLenta) { synthAll._avisoLenta = true; log(`⚡ Voces clonadas en pausa: tu PC tarda ~${Math.round(db.settings.cloneSpeed)} s por frase. Uso voces normales parecidas (Ajustes → "Usar voces clonadas aunque sea lento").`); }
      else if (!lenta) log(c ? 'Chatterbox no está instalado: uso otra voz' : 'Esa voz clonada ya no existe: uso otra voz');
      it.v = { ...it.v, voice: c?.gender === 'F' ? 'es-MX-DaliaNeural' : 'es-MX-JorgeNeural' };
    }
    (it.v.voice.startsWith('kokoro:') ? pending.kokoro : pending.edge).push(it);
  }

  if (pending.clon.length) {
    log(`Voz clonada: ${pending.clon.length} frases. ⏳ Sin tarjeta NVIDIA es lo más lento del video (aprox. ${Math.max(1, Math.round(pending.clon.length * 0.6))} min o más)`);
    const t = Date.now();
    try {
      // Tope de tiempo: máx. ~1.5 min por frase y nunca más de 20 min (antes podía quedarse horas).
      const tope = Math.min((+db.settings.cloneMaxMin || 20) * 60000, Math.max(6 * 60000, pending.clon.length * 90000));
      await batch(PY_CLON, 'voz_clonada.py', null, pending.clon.map(it => ({ text: it.text, out: it.base + '.wav', ref: it.ref })), log, 'Chatterbox', tope);
      for (const it of pending.clon) { it.file = it.base + '.wav'; items.find(x => x.base === it.base).file = it.file; }
      const seg = (Date.now() - t) / 1000;
      db.settings.cloneSpeed = +(seg / pending.clon.length).toFixed(1); saveAll.settings();
      log(`Voz clonada lista en ${Math.round(seg)} s (${db.settings.cloneSpeed} s por frase)`);
    } catch (e) {
      const seg = (Date.now() - t) / 1000;
      if (seg > 300) { db.settings.cloneSpeed = Math.max(60, +(seg / pending.clon.length).toFixed(1)); saveAll.settings(); }
      // Las frases que alcanzaron a salir se usan; el resto con voz normal parecida.
      const hechas = pending.clon.filter(it => { try { return fs.statSync(it.base + '.wav').size > 2000; } catch (x) { return false; } });
      for (const it of hechas) items.find(x => x.base === it.base).file = it.base + '.wav';
      log(`${seg > 300 ? '⏱ La voz clonada tardaba demasiado' : 'Falló la voz clonada (' + e.message.split('\n').pop() + ')'}: ${hechas.length} frases clonadas, el resto con voz normal parecida.`);
      for (const it of pending.clon.filter(x => !hechas.includes(x))) { const o = items.find(x => x.base === it.base), c = db.voices.find(x => 'clon:' + x.id === o.v.voice); o.v = { ...o.v, voice: c?.gender === 'F' ? 'es-MX-DaliaNeural' : 'es-MX-JorgeNeural' }; pending.edge.push(o); }
    }
  }

  for (let i = 0; i < pending.edge.length; i += 3) {
    await Promise.all(pending.edge.slice(i, i + 3).map(async it => {
      if (!edge) { pending.kokoro.push(it); return; }
      try { it.file = await edgeOne(it); } catch (e) { pending.kokoro.push(it); }
    }));
  }
  if (!edge && pending.edge.length) log('Edge no está instalado: uso ' + (L.kokoro ? 'Kokoro' : 'la voz del sistema'));
  else if (pending.kokoro.some(it => !it.v.voice.startsWith('kokoro:'))) log('Edge falló (Microsoft a veces lo bloquea): uso ' + (L.kokoro ? 'Kokoro' : 'la voz del sistema'));

  const kk = pending.kokoro.filter(it => !it.file);
  if (kk.length && L.kokoro) {
    try {
      await batch(PY_LOCAL, 'voz_local.py', 'kokoro', kk.map(it => ({ text: it.text, out: it.base + '.wav', voice: kokoroFor(it.v), speed: 1 + (Number(it.v.rate) || 0) / 100 })), log, 'Kokoro');
      for (const it of kk) it.file = it.base + '.wav';
    } catch (e) { log('Kokoro falló: ' + e.message.split('\n').pop()); }
  }
  const robot = items.filter(it => !it.file);
  if (robot.length) log('⚠ Se usó la voz de Windows (suena a robot) porque Edge y Kokoro fallaron. Revisa tu internet o ejecuta start.bat de nuevo para actualizar las voces.');
  for (const it of robot) { it.file = await systemOne(it); it.robot = true; }
  // Tipo de voz (niño, abuelo, gracioso...) + cadena "voz natural" (menos sonido a robot).
  const V = require('./voces'), natural = db.settings.naturalVoice !== false;
  for (const it of items) {
    if (String(it.v.voice || '').startsWith('clon:') && !it.v.preset) continue; // las voces clonadas se dejan tal cual
    const f = V.filtro(it.v.preset, natural);
    if (!f) continue;
    const out = it.base + '_v.wav';
    try { await ff(['-i', it.file, '-af', f, '-ac', '1', out]); it.file = out; } catch (e) { log('No se pudo aplicar el tipo de voz (' + e.message.slice(0, 80) + ')'); }
  }
  return items;
}

// Tiempos reales de cada palabra (Whisper). items: [{ file, text }] -> it.words o null.
async function timings(items, log = () => {}) {
  if (!db.settings.karaoke || !local().whisper || E.TTS_FAKE) return items;
  const jobs = items.map(it => ({ audio: it.file, text: it.text, out: it.file + '.words.json' }));
  try {
    await batch(PY_LOCAL, 'voz_local.py', 'timing', jobs, log, 'Whisper');
    items.forEach((it, i) => { try { it.words = JSON.parse(fs.readFileSync(jobs[i].out, 'utf8')).palabras; } catch (e) {} });
  } catch (e) { log('Subtítulos karaoke no disponibles (' + e.message.split('\n').pop() + '). Uso subtítulos normales.'); }
  return items;
}

async function preview(v, text) {
  text = text || 'Hola, esta es mi voz. ¿Te gusta cómo suena para tu canal?';
  const h = crypto.createHash('md5').update(JSON.stringify([v.voice, v.rate, v.pitch, v.preset || '', db.settings.naturalVoice !== false, text])).digest('hex').slice(0, 12);
  const base = path.join(DATA, 'cache', 'voz-' + h);
  for (const ext of ['.mp3', '.wav']) if (fs.existsSync(base + ext)) return '/files/cache/voz-' + h + ext;
  const [it] = await synthAll([{ text, base, v }]);
  return '/files/cache/' + path.basename(it.file);
}

// Prepara una muestra para clonar: recorta silencios, normaliza y revisa la calidad.
async function prepareSample(inFile, outFile) {
  await ff(['-i', inFile, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.6:stop_threshold=-45dB,loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '24000', '-ac', '1', '-t', '30', outFile]);
  const dur = await secs(outFile);
  if (!(dur >= 8)) throw new Error(`La grabación quedó muy corta (${(dur || 0).toFixed(1)} s de voz). Graba al menos 15 segundos hablando sin pausas largas.`);
  // volumedetect escribe en stderr
  const st = await new Promise(r => require('child_process').execFile('ffmpeg', ['-i', inFile, '-af', 'volumedetect', '-f', 'null', '-'], { windowsHide: true }, (e, o, se) => r(String(se || ''))));
  const mean = parseFloat((st.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1]);
  if (mean < -42) throw new Error('La grabación está muy baja. Acércate al micrófono y vuelve a grabar.');
  return { duration: Math.round(dur) };
}

// Para otros módulos (transcripción): ejecuta voz_local.py en el entorno local.
const localBatch = (mode, items, log) => batch(PY_LOCAL, 'voz_local.py', mode, items, log, 'Whisper');

// Separa la voz de la música/ruido de fondo (Demucs). Devuelve { voz, fondo } en wav.
async function separar(input, outDir, log = () => {}) {
  if (!local().demucs) throw new Error('Para quitar el fondo instala Demucs: ejecuta instalar_ia_local.bat otra vez');
  log('Separando la voz del sonido de fondo (Demucs; en tu PC tarda 1 a 3 minutos)');
  await run(PY_CLON, ['-m', 'demucs', '--two-stems=vocals', '-n', 'htdemucs', '-d', 'cpu', '-o', outDir, input], { env: { ...E, PYTHONIOENCODING: 'utf-8' } });
  const base = path.join(outDir, 'htdemucs', path.basename(input).replace(/\.[^.]+$/, ''));
  const voz = path.join(base, 'vocals.wav'), fondo = path.join(base, 'no_vocals.wav');
  if (!fs.existsSync(voz)) throw new Error('Demucs no devolvió la voz separada');
  return { voz, fondo };
}

module.exports = { separar, catalog, synthAll, timings, preview, prepareSample, edgeAvailable, local, batch: localBatch, VOICES: EDGE };
