// Biblioteca legal de efectos y música (idea de descargar_sfx.py de Video Relaunch).
// Descarga de Freesound SOLO sonidos con licencia Creative Commons 0 (uso libre, también comercial,
// sin atribución). Se guardan en efectos/<categoria>/ y música en efectos/musica_<animo>/.
// Clave gratis: freesound.org/apiv2/apply
const fs = require('fs'), path = require('path');
const { E, sleep } = require('./util');
const { DIR } = require('./efectos');

// categoria: [búsqueda, duración máxima, cuántos]
const CATS = {
  whoosh: ['whoosh', 3, 12], impacto: ['impact hit', 4, 10], boom: ['deep boom bass impact', 4, 8],
  glitch: ['glitch', 3, 8], suspenso: ['suspense hit', 6, 8], dramatico: ['dramatic sting', 5, 6],
  sorpresa: ['surprise stinger', 3, 6], riser: ['riser', 8, 6], pop: ['pop bubble', 2, 8],
  monedas: ['coins', 4, 6], notificacion: ['notification', 3, 6], campana: ['ding bell', 3, 6],
  latido: ['heartbeat', 6, 4], pasos: ['footsteps', 6, 4], vidrio: ['glass breaking', 4, 4],
  aplausos: ['applause', 6, 4], error: ['error buzzer', 3, 4], acierto: ['correct answer ding', 3, 4],
  risa: ['audience laughter', 6, 4], boing: ['cartoon boing', 3, 4],
  ambiente_lluvia: ['rain ambience', 60, 3], ambiente_viento: ['wind ambience', 60, 3],
  ambiente_ciudad: ['city ambience', 60, 3], ambiente_naturaleza: ['forest birds ambience', 60, 3],
  ambiente_cafe: ['cafe ambience', 60, 3],
  musica_alegre: ['happy upbeat music loop', 240, 6], musica_suspenso: ['dark suspense music', 240, 6],
  musica_epica: ['epic cinematic music', 240, 6], musica_lofi: ['lofi beat loop', 240, 6],
  musica_motivacional: ['inspiring motivational music', 240, 6], musica_tecnologia: ['electronic tech music loop', 240, 5],
};

const state = { running: false, done: 0, total: Object.keys(CATS).length, log: [], error: null };

async function buscar(q, maxDur, n) {
  const u = 'https://freesound.org/apiv2/search/text/?' + new URLSearchParams({
    query: q, filter: `license:"Creative Commons 0" duration:[1 TO ${maxDur}]`, sort: 'rating_desc',
    fields: 'id,name,duration,previews,username,license', page_size: String(Math.min(40, n * 3)), token: E.FREESOUND_API_KEY,
  });
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error('Freesound ' + r.status + ': ' + (await r.text()).slice(0, 150));
  return ((await r.json()).results || []).slice(0, n);
}

async function descargar() {
  if (state.running) return state;
  if (!E.FREESOUND_API_KEY) throw new Error('Falta la clave de Freesound (Ajustes)');
  Object.assign(state, { running: true, done: 0, log: [], error: null });
  (async () => {
    const creditos = [];
    try {
      for (const [cat, [q, dur, n]] of Object.entries(CATS)) {
        const dir = path.join(DIR, cat);
        fs.mkdirSync(dir, { recursive: true });
        const ya = fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).length;
        if (ya >= n) { state.done++; continue; }
        try {
          for (const it of await buscar(q, dur, n - ya)) {
            const nombre = `${it.id}_${String(it.name).replace(/[^\w-]+/g, '_').slice(0, 30)}.mp3`;
            const f = path.join(dir, nombre);
            if (fs.existsSync(f)) continue;
            const r = await fetch(it.previews['preview-hq-mp3'], { signal: AbortSignal.timeout(60000) });
            if (!r.ok) continue;
            fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
            creditos.push(`${cat}/${nombre} — ${it.username} — CC0 — https://freesound.org/s/${it.id}/`);
            await sleep(400);
          }
          state.log.push(`${cat}: listo`);
        } catch (e) { state.log.push(`${cat}: ${e.message}`); }
        state.done++;
        await sleep(1100);
      }
      if (creditos.length) fs.appendFileSync(path.join(DIR, 'CREDITOS_freesound.txt'), creditos.join('\n') + '\n');
    } catch (e) { state.error = e.message; }
    finally { state.running = false; require('./efectos').list(true); }
  })();
  return state;
}

module.exports = { descargar, state, CATS };
