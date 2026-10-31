// Base de datos sencilla en archivos JSON dentro de data/.
const fs = require('fs'), path = require('path');
const { DATA } = require('./util');

for (const d of ['', 'logos', 'chars', 'videos', 'cache', 'voces']) fs.mkdirSync(path.join(DATA, d), { recursive: true });

const file = n => path.join(DATA, n + '.json');
function load(n, def) { try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch (e) { return def; } }
function save(n, v) { const f = file(n); fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 1)); fs.renameSync(f + '.tmp', f); }

const DEFAULT_SETTINGS = {
  videosPerDay: 3,               // subir poco a poco: 3 -> 5 -> 7 -> 10
  nightly: { enabled: true, time: '02:00' },
  engines: ['gemini', 'groq', 'nvidia', 'cerebras', 'github', 'mistral', 'openrouter', 'cloudflare', 'anthropic'],
  models: {},                    // modelo elegido a mano por motor (vacío = automático)
  factCheck: true,
  karaoke: true,                 // subtítulos con la palabra resaltada (necesita Whisper local)
  whisperModel: 'base',          // tiny | base | small (más grande = más preciso y más lento)
  continuous: false,             // producir todo el día manteniendo la cola llena
  bufferDays: 1,                 // cuántos días por adelantado preparar en modo continuo
  ytDailyMax: 6,
  review: true,
  critic: true,                  // crítico: mejora el guion si saca menos de 8/10
  checkImages: true,
  telegram: true,
  naturalVoice: true,
  reserveGemini: true,
  autoClean: true,
  autoVolume: true,              // videos por día = suma de las publicaciones por día de tus canales
  agenda: true,                  // producir según los horarios: siempre deja listos los videos de hoy y mañana               // borra videos ya publicados hace más de 30 días (se conserva el registro)           // texto con Groq/NVIDIA primero; Gemini se guarda para mirar imágenes            // cadena "voz natural" en todas las voces (menos robot)                // avisos al celular por Telegram             // director visual + revisor de imágenes (coherencia)                  // el analista revisa cada video terminado (necesita Gemini)
  minNota: 6,                    // con autoaprobación, debajo de esta nota el video queda para revisar                 // subidas a YouTube por día (cuota gratis de la API)
  lastPlanned: '',
};

const db = {
  channels: load('channels', []),
  jobs: load('jobs', []),
  settings: { ...DEFAULT_SETTINGS, ...load('settings', {}) },
  usage: load('usage', {}),      // { 'AAAA-MM-DD': { gemini: 12, ... } }
  voices: load('voices', []),    // voces clonadas CON permiso: { id, name, owner, gender, consentAt }
  fxUse: load('fxuse', {}),      // cuántas veces se usó cada efecto de sonido
};
const saveAll = {
  channels: () => save('channels', db.channels),
  jobs: () => save('jobs', db.jobs),
  settings: () => save('settings', db.settings),
  usage: () => save('usage', db.usage),
  voices: () => save('voices', db.voices),
  fxUse: () => save('fxuse', db.fxUse),
};

// Si el programa se cerró a mitad de un video, lo devuelve a la cola.
for (const j of db.jobs) if (j.status === 'produciendo') { j.status = 'cola'; j.log = (j.log || []).concat('Reiniciado tras cerrar el programa'); }
saveAll.jobs();

const channel = id => db.channels.find(c => c.id === id);
const job = id => db.jobs.find(j => j.id === id);

module.exports = { db, saveAll, channel, job, DATA };
