// 🧠 Centro de IA: varios motores de IA en una arquitectura modular, cada uno con su adaptador.
//  - Texto y razonamiento: usa los motores que ya funcionan en ai.js (Gemini, Groq, NVIDIA, OpenRouter, OmniRoute…)
//    sin reemplazarlos, y suma Ollama (modelos locales) y Hugging Face.
//  - Video y animación GRATIS: Spaces de Hugging Face con GPU gratuita (ZeroGPU) llamados por su API de Gradio:
//    LTX-Video, Wan 2.2, HunyuanVideo 1.5, CogVideoX y FramePack. Si el modelo necesita una imagen y no se da,
//    primero se crea con FLUX (Cloudflare, gratis) y luego se anima.
//  - ComfyUI propio (opcional, para cuando haya una GPU): se le manda un flujo (workflow) en formato API.
// Cola de tareas en segundo plano con reintentos, espera de cupo, historial y archivos guardados en data/ia.
// El cupo gratis de ZeroGPU es diario y por cuenta: con un token gratis de Hugging Face (HF_TOKEN) alcanza para unos
// cuantos clips al día. Cuando se agota, la tarea espera y sigue sola cuando vuelve el cupo (o pasa a otro motor).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { E, DATA } = require('./util');
const { db, saveAll } = require('./store');

const DIR = path.join(DATA, 'ia'); fs.mkdirSync(DIR, { recursive: true });
const TAREAS = path.join(DATA, 'ia_tareas.json');
const hoy = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
const cfg = () => (db.settings.centroia = db.settings.centroia || { motores: {} });
const mcfg = id => (cfg().motores[id] = cfg().motores[id] || {});

// ---------- catálogo de motores (cada uno con su adaptador) ----------
const DIM = { vertical: [704, 512], horizontal: [512, 704], cuadrado: [576, 576] }; // alto, ancho (múltiplos de 32)
const MOTORES = {
  // Texto (adaptador «ai»: usa ai.js tal cual)
  gemini: { tipo: 'texto', nombre: 'Google Gemini', via: 'ai' },
  groq: { tipo: 'texto', nombre: 'Groq', via: 'ai' },
  nvidia: { tipo: 'texto', nombre: 'NVIDIA', via: 'ai' },
  openrouter: { tipo: 'texto', nombre: 'OpenRouter (gratis)', via: 'ai' },
  omniroute: { tipo: 'texto', nombre: 'OmniRoute (relevo)', via: 'ai' },
  ollama: { tipo: 'texto', nombre: 'Ollama (modelos locales)', via: 'ai', local: true, nota: 'Instala Ollama en el VPS (ollama.com) y descarga un modelo pequeño, ej.: ollama pull qwen2.5:3b. Sin GPU es lento: úsalo de respaldo.' },
  huggingface: { tipo: 'texto', nombre: 'Hugging Face (router)', via: 'ai', nota: 'Con tu token gratis de Hugging Face (cupo gratis pequeño al mes).' },
  // Video (Spaces gratis de Hugging Face)
  ltx: { tipo: 'video', nombre: 'LTX-Video (rápido)', via: 'space', space: 'Lightricks/ltx-video-distilled', texto: true, imagen: true, seg: [2, 5, 3],
    receta: ({ prompt, img, alto, ancho, seg }) => img ? { api: 'image_to_video', v: { prompt, input_image_filepath: img, height_ui: alto, width_ui: ancho, mode: 'image-to-video', duration_ui: seg, randomize_seed: true } }
      : { api: 'text_to_video', v: { prompt, input_image_filepath: null, input_video_filepath: null, height_ui: alto, width_ui: ancho, mode: 'text-to-video', duration_ui: seg, randomize_seed: true } } },
  wan22: { tipo: 'video', nombre: 'Wan 2.2 (mejor calidad)', via: 'space', space: 'zerogpu-aoti/wan2-2-fp8da-aoti-faster', imagen: true, necesitaImagen: true, seg: [2, 5, 3.5],
    receta: ({ prompt, img, seg }) => ({ api: 'generate_video', v: { input_image: img, prompt, duration_seconds: seg, randomize_seed: true } }) },
  hunyuan: { tipo: 'video', nombre: 'HunyuanVideo 1.5', via: 'space', space: 'multimodalart/Hunyuan-Video-1-5', imagen: true, necesitaImagen: true, seg: [2, 4, 2.5],
    receta: ({ prompt, img, seg }) => ({ api: 'generate', v: { input_image: img, prompt, length: Math.round(seg * 24) + 1, seed: -1 } }) },
  cogvideox: { tipo: 'video', nombre: 'CogVideoX 5B', via: 'space', space: 'zai-org/CogVideoX-5B-Space', texto: true, imagen: true, seg: [6, 6, 6],
    receta: ({ prompt, img }) => ({ api: 'generate', v: { prompt, image_input: img || null, video_input: null, seed_value: -1 } }) },
  skyreels: { tipo: 'video', nombre: 'SkyReels V2', via: 'space', space: 'fffiloni/SkyReels-V2', texto: true, seg: [4, 4, 4], nota: 'Su Space suele estar sin GPU; si aparece apagado, usa otro motor.' },
  mochi: { tipo: 'video', nombre: 'Mochi 1', via: 'comfy', nota: 'No tiene Space gratis: funciona con tu propio ComfyUI (cuando tengas una GPU).' },
  // Animación de imágenes
  framepack: { tipo: 'animar', nombre: 'FramePack F1 (anima una imagen)', via: 'space', space: 'linoyts/FramePack-F1', imagen: true, necesitaImagen: true, seg: [2, 5, 3],
    receta: ({ prompt, img, seg }) => ({ api: 'process', v: { input_image: { background: img, layers: [], composite: img }, prompt, t2v: false, seed: Math.floor(Math.random() * 1e6), total_second_length: seg } }) },
  comfyui: { tipo: 'animar', nombre: 'ComfyUI (servidor propio)', via: 'comfy', local: true, nota: 'Para cuando tengas una GPU: pon la dirección de tu ComfyUI y sube un flujo exportado «para API». Usa {PROMPT} donde va el texto.' },
};
const activo = id => { const m = MOTORES[id], c = mcfg(id); if (m.via === 'ai') return (db.settings.engines || []).includes(id); return c.on !== undefined ? !!c.on : (m.via === 'space' && id !== 'skyreels'); };
const spaceDe = id => mcfg(id).space || MOTORES[id].space;
const hostDe = sp => E.CENTROIA_SPACE_HOST ? E.CENTROIA_SPACE_HOST /* solo para pruebas */ : 'https://' + sp.toLowerCase().replace(/[^a-z0-9/-]/g, '-').replace('/', '-') + '.hf.space';
const tokenHF = () => E.HF_TOKEN || E.HUGGINGFACE_TOKEN || '';

// ---------- consumo y límites ----------
function uso(id) { const c = mcfg(id); if (!c.uso || c.uso.dia !== hoy()) c.uso = { dia: hoy(), ok: 0, fallos: 0, seg: 0 }; return c.uso; }
const sinCupoHasta = {}; // motor → hora en que vuelve el cupo
const limiteOk = id => { const l = +mcfg(id).limite || 0; return !l || uso(id).ok < l; };

// ---------- cliente de Gradio (Spaces) ----------
async function g(host, ruta, opc = {}) {
  const r = await fetch(host + ruta, { ...opc, signal: AbortSignal.timeout(opc.timeout || 30000), headers: { ...(tokenHF() ? { authorization: 'Bearer ' + tokenHF() } : {}), ...(opc.headers || {}) } })
    .catch(e => { throw new Error('Sin conexión con ' + (host || ruta).replace(/^https?:\/\//, '').split('/')[0] + ' (' + (e.cause?.code || e.cause?.message || e.message) + ')'); });
  if (!r.ok) { const t = (await r.text()).slice(0, 160); const e = new Error(`${r.status} ${t}`); e.status = r.status; throw e; }
  return r;
}
const infoCache = {};
async function info(sp) {
  if (infoCache[sp] && Date.now() - infoCache[sp].t < 3600e3) return infoCache[sp];
  const host = hostDe(sp), [i, c] = await Promise.all([g(host, '/gradio_api/info').then(r => r.json()), g(host, '/config').then(r => r.json())]);
  return (infoCache[sp] = { t: Date.now(), host, endpoints: i.named_endpoints || {}, fn: Object.fromEntries((c.dependencies || []).filter(d => d.api_name).map(d => [d.api_name, d.id])), version: c.version });
}
async function subir(host, file) { // imagen local → archivo del Space
  const fd = new FormData(); fd.append('files', new Blob([fs.readFileSync(file)], { type: /\.png$/i.test(file) ? 'image/png' : 'image/jpeg' }), path.basename(file));
  const [p] = await (await g(host, '/gradio_api/upload', { method: 'POST', body: fd, timeout: 60000 })).json();
  return { path: p, orig_name: path.basename(file), meta: { _type: 'gradio.FileData' } };
}
// arma los datos en el orden del Space: valores de la receta y, para lo demás, los valores por defecto del Space
function datos(ep, v) {
  return ep.parameters.map(p => p.parameter_name in v ? v[p.parameter_name] : p.parameter_has_default ? p.parameter_default : null);
}
const esperaCupo = msg => { const m = /Try again in (\d+):(\d+):(\d+)/.exec(msg || ''); return m ? Math.max(15 * 60000, (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000 + 60000) : 3600e3; }; // mínimo 15 min: no insistir de más
async function llamarSpace(sp, api, valores, onAvance) {
  const I = await info(sp), ep = I.endpoints['/' + api]; if (!ep) throw Object.assign(new Error(`El Space ${sp} ya no tiene «${api}». Puede que haya cambiado: revisa el motor.`), { fatal: true });
  const data = datos(ep, valores), sesion = 'sf' + crypto.randomBytes(6).toString('hex');
  const jn = await (await g(I.host, '/gradio_api/queue/join', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data, fn_index: I.fn[api], session_hash: sesion, event_data: null, trigger_id: null }) })).json();
  if (!jn.event_id) throw new Error('El Space no aceptó la tarea');
  const r = await g(I.host, '/gradio_api/queue/data?session_hash=' + sesion, { timeout: 20 * 60000 });
  let buf = '', ultimo = null; const dec = new TextDecoder();
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true }); let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const linea = buf.slice(0, i).replace(/^data: ?/, ''); buf = buf.slice(i + 2); let m; try { m = JSON.parse(linea); } catch (e) { continue; }
      if (m.msg === 'estimation') onAvance?.(`En la fila del Space: puesto ${m.rank + 1} (≈ ${Math.round(m.rank_eta || 0)} s)`);
      else if (m.msg === 'process_starts') onAvance?.('Generando en la GPU…');
      else if (m.msg === 'progress' && m.progress_data?.[0]) onAvance?.(`Generando… ${m.progress_data[0].index || 0}/${m.progress_data[0].length || '?'}`);
      else if (m.msg === 'process_generating' && m.output?.data) ultimo = m.output.data;
      else if (m.msg === 'process_completed') {
        if (!m.success) { const t = m.output?.error || m.title || 'error del Space'; const e = new Error(t); if (/quota|ZeroGPU/i.test(t)) { e.cupo = true; e.espera = esperaCupo(t); } throw e; }
        return { salida: m.output?.data || ultimo, host: I.host };
      }
    }
  }
  if (ultimo) return { salida: ultimo, host: I.host }; throw new Error('El Space cortó la conexión');
}
async function bajarVideo(salida, host, out) {
  const vids = (salida || []).map(x => x?.video || x).filter(x => x && (x.url || x.path) && /\.(mp4|webm|mov)(\?|$)/i.test(x.url || x.path || x.orig_name || ''));
  const v = vids[vids.length - 1] || (salida || []).map(x => x?.video || x).find(x => x && (x.url || x.path)); if (!v) throw new Error('El Space no devolvió un video');
  const url = v.url || `${host}/gradio_api/file=${v.path}`, r = await g(url.startsWith('http') ? '' : host, url, { timeout: 180000 });
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); if (fs.statSync(out).size < 2000) throw new Error('El video llegó vacío'); return out;
}

// ---------- ComfyUI propio (opcional) ----------
async function comfy(id, t, onAvance) {
  const c = mcfg('comfyui'), base = (c.url || '').replace(/\/+$/, ''); if (!base) throw Object.assign(new Error('Pon la dirección de tu ComfyUI'), { fatal: true });
  if (!c.flujo) throw Object.assign(new Error('Sube un flujo de ComfyUI exportado «para API»'), { fatal: true });
  const flujo = JSON.parse(JSON.stringify(c.flujo).replace(/\{PROMPT\}/g, t.prompt.replace(/["\\]/g, ' ')));
  const { prompt_id } = await (await fetch(base + '/prompt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: flujo, client_id: 'shortforge' }), signal: AbortSignal.timeout(30000) })).json();
  for (let i = 0; i < 360; i++) { await new Promise(r => setTimeout(r, 5000)); onAvance?.(`ComfyUI trabajando… ${i * 5} s`);
    const h = (await (await fetch(base + '/history/' + prompt_id)).json())[prompt_id]; if (!h) continue;
    const f = Object.values(h.outputs || {}).flatMap(o => [...(o.gifs || []), ...(o.videos || []), ...(o.images || [])]).find(x => /\.(mp4|webm|gif)$/i.test(x.filename)); if (!f) throw new Error('ComfyUI terminó sin video');
    const r = await fetch(`${base}/view?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder || '')}&type=${f.type || 'output'}`);
    const out = path.join(DIR, t.id + path.extname(f.filename)); fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); return out; }
  throw new Error('ComfyUI tardó demasiado');
}

// ---------- tareas en segundo plano ----------
let tareas = []; try { tareas = JSON.parse(fs.readFileSync(TAREAS, 'utf8')); } catch (e) {}
const guardar = () => { if (tareas.length > 500) tareas = tareas.slice(-500); fs.writeFileSync(TAREAS + '.tmp', JSON.stringify(tareas, null, 1)); fs.renameSync(TAREAS + '.tmp', TAREAS); };
for (const t of tareas) if (t.estado === 'trabajando') { t.estado = 'en cola'; t.avance = 'Se reanudó tras reiniciar ShortForge'; } // si se apagó a la mitad

function crearTarea(o) {
  const tipo = ['video', 'animar', 'texto'].includes(o.tipo) ? o.tipo : 'video', motor = o.motor && MOTORES[o.motor] ? o.motor : 'auto';
  const prompt = String(o.prompt || '').trim().slice(0, 1500); if (prompt.length < 3) throw new Error('Escribe qué quieres generar');
  const t = { id: 'ia' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex'), tipo, motor, prompt, formato: DIM[o.formato] ? o.formato : 'vertical', seg: Math.max(1, Math.min(10, +o.seg || 0)) || null,
    imagen: null, estado: 'en cola', intentos: 0, creado: new Date().toISOString(), historial: [] };
  if (o.imagen) { const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(o.imagen); if (!m) throw new Error('Imagen no válida'); t.imagen = path.join(DIR, t.id + '-ref.' + (m[1] === 'png' ? 'png' : 'jpg')); fs.writeFileSync(t.imagen, Buffer.from(m[2], 'base64')); }
  if (tipo === 'animar' && !t.imagen) t.necesitaImagen = true;
  tareas.push(t); guardar(); setTimeout(trabajar, 100); return t;
}
const candidatos = t => {
  if (t.motor !== 'auto') return [t.motor];
  const orden = t.tipo === 'animar' ? ['framepack', 'wan22', 'ltx', 'hunyuan', 'comfyui'] : t.imagen ? ['wan22', 'ltx', 'hunyuan', 'framepack', 'cogvideox'] : ['ltx', 'wan22', 'cogvideox', 'hunyuan', 'comfyui'];
  return orden.filter(id => activo(id) && MOTORES[id].via !== 'ai' && limiteOk(id) && !((sinCupoHasta[id] || 0) > Date.now()));
};
async function imagenBase(t, log) { // crea la imagen de partida con FLUX (gratis) si el modelo la necesita
  const I = require('./imagenes'); if (!I.listo()) throw Object.assign(new Error('Este modelo necesita una imagen: súbela o configura Cloudflare para crearla gratis'), { fatal: true });
  const out = path.join(DIR, t.id + '-base.png'); log('Creando la imagen de partida con FLUX (gratis)…');
  await I.generar({ prompt: t.prompt, out, formato: t.formato === 'horizontal' ? 'horizontal' : t.formato === 'cuadrado' ? 'cuadrado' : 'vertical', log });
  return out;
}
async function ejecutar(t) {
  const log = s => { t.avance = s; t.historial.push(new Date().toISOString().slice(11, 19) + ' ' + s); if (t.historial.length > 40) t.historial.shift(); guardar(); };
  if (t.tipo === 'texto') { const ai = require('./ai'); const r = await ai.ask([{ role: 'user', content: t.prompt }], { max: 3000, log, preferir: t.motor !== 'auto' ? t.motor : null }); t.texto = typeof r === 'string' ? r : r?.text || JSON.stringify(r); return; }
  const lista = candidatos(t); if (!lista.length) { const e = new Error('No hay motores de video activos con cupo ahora'); e.cupo = true; e.espera = Math.max(600000, Math.min(...Object.values(sinCupoHasta).filter(x => x > Date.now()).map(x => x - Date.now()), 6 * 3600e3)); throw e; }
  let ultimoError;
  for (const id of lista) {
    const M = MOTORES[id], inicio = Date.now(); t.motorUsado = id; log(`Usando ${M.nombre}`);
    try {
      let out = path.join(DIR, t.id + '.mp4');
      if (M.via === 'comfy') out = await comfy(id, t, log);
      else {
        if (!M.receta) throw Object.assign(new Error(`${M.nombre} todavía no tiene adaptador listo`), { fatal: true });
        let ref = t.imagen; if (!ref && (M.necesitaImagen || t.necesitaImagen)) ref = t.imagen = await imagenBase(t, log);
        const I = await info(spaceDe(id)), img = ref && (M.imagen ? await subir(I.host, ref) : null);
        const [alto, ancho] = DIM[t.formato], [mn, mx, def] = M.seg, seg = Math.max(mn, Math.min(mx, t.seg || def));
        const { api, v } = M.receta({ prompt: t.prompt, img, alto, ancho, seg });
        const { salida, host } = await llamarSpace(spaceDe(id), api, v, log); log('Descargando el video…'); await bajarVideo(salida, host, out);
      }
      const u = uso(id); u.ok++; u.seg += Math.round((Date.now() - inicio) / 1000); saveAll.settings();
      t.archivo = path.basename(out); t.segundos = Math.round((Date.now() - inicio) / 1000); return;
    } catch (e) {
      uso(id).fallos++; ultimoError = e; log(`⚠️ ${M.nombre}: ${String(e.message).slice(0, 160)}`);
      if (e.cupo) sinCupoHasta[id] = Date.now() + (e.espera || 3600e3);
      if (t.motor !== 'auto') throw e; // el usuario eligió este motor: no se cambia
    }
  }
  throw ultimoError || new Error('No se pudo generar');
}
let trabajando = false;
async function trabajar() {
  if (trabajando) return; trabajando = true;
  try {
    for (;;) {
      const t = tareas.find(x => (x.estado === 'en cola') || (x.estado === 'esperando cupo' && Date.parse(x.reintentar || 0) <= Date.now())); if (!t) break;
      t.estado = 'trabajando'; t.empezo = new Date().toISOString(); t.intentos++; guardar();
      try { await ejecutar(t); t.estado = 'listo'; t.termino = new Date().toISOString(); t.avance = '✅ Listo'; t.error = null; }
      catch (e) {
        t.error = String(e.message).slice(0, 300);
        if (e.cupo) { t.estado = 'esperando cupo'; t.reintentar = new Date(Date.now() + (e.espera || 3600e3)).toISOString(); t.avance = `⏳ Sin cupo gratis: se reintenta sola a las ${new Date(t.reintentar).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })}`; }
        else if (!e.fatal && t.intentos < 3) { t.estado = 'esperando cupo'; t.reintentar = new Date(Date.now() + t.intentos * 120000).toISOString(); t.avance = `🔁 Reintento ${t.intentos + 1} de 3 en ${t.intentos * 2} min`; }
        else { t.estado = 'error'; t.avance = '❌ ' + t.error; }
      }
      guardar();
    }
  } finally { trabajando = false; }
}
setInterval(() => trabajar().catch(() => {}), 60000).unref(); setTimeout(() => trabajar().catch(() => {}), 15000).unref();

// ---------- estado de conexión ----------
const estadoCache = {};
async function probar(id) {
  const M = MOTORES[id], t0 = Date.now(); let r;
  try {
    if (M.via === 'ai') {
      const ai = require('./ai'), P = ai.PROVIDERS[id]; if (!P) r = { ok: false, msg: 'No disponible en esta versión' };
      else { const x = await ai.test(id); r = { ok: !!x?.ok, msg: x?.msg || (x?.ok ? 'Funciona' : 'Falló') }; }
    } else if (M.via === 'space') {
      const rt = await (await fetch(`https://huggingface.co/api/spaces/${spaceDe(id)}/runtime`, { signal: AbortSignal.timeout(15000), headers: tokenHF() ? { authorization: 'Bearer ' + tokenHF() } : {} })).json();
      const gpu = /zero|gpu|a10|a100|t4|l4|h100/i.test(rt.hardware?.current || '');
      r = { ok: rt.stage === 'RUNNING' && gpu, msg: rt.stage === 'RUNNING' ? (gpu ? 'Encendido con GPU gratis' : 'Encendido pero SIN GPU (no genera video)') : 'Estado del Space: ' + (rt.stage || 'desconocido') };
      if (r.ok) await info(spaceDe(id));
    } else if (id === 'comfyui') { const u = (mcfg(id).url || '').replace(/\/+$/, ''); if (!u) r = { ok: false, msg: 'Sin configurar' }; else { await (await fetch(u + '/system_stats', { signal: AbortSignal.timeout(8000) })).json(); r = { ok: true, msg: 'Conectado' }; } }
    else r = { ok: false, msg: 'Necesita ComfyUI propio' };
  } catch (e) { r = { ok: false, msg: String(e.message === 'fetch failed' ? 'Sin conexión (' + (e.cause?.code || e.cause?.message || 'red') + ')' : e.message).slice(0, 140) }; }
  if ((sinCupoHasta[id] || 0) > Date.now()) r.msg += ' · sin cupo gratis por ahora';
  return (estadoCache[id] = { ...r, ms: Date.now() - t0, fecha: new Date().toISOString() });
}

// ---------- API para el panel ----------
function estado() {
  return {
    hfToken: !!tokenHF(), ollama: !!(db.settings.ollama?.on),
    motores: Object.entries(MOTORES).map(([id, M]) => ({ id, tipo: M.tipo, nombre: M.nombre, via: M.via, nota: M.nota || '', activo: activo(id), space: M.via === 'space' ? spaceDe(id) : null, url: mcfg(id).url || '', limite: +mcfg(id).limite || 0, uso: uso(id), conexion: estadoCache[id] || null, sinCupoHasta: (sinCupoHasta[id] || 0) > Date.now() ? new Date(sinCupoHasta[id]).toISOString() : null, listo: !!M.receta || M.via !== 'space', flujo: id === 'comfyui' ? !!mcfg(id).flujo : undefined })),
    tareas: tareas.slice(-60).reverse().map(t => ({ ...t, historial: t.historial.slice(-8), imagen: !!t.imagen })),
  };
}
function configurar(o) {
  const M = MOTORES[o.id]; if (!M) throw new Error('Motor desconocido'); const c = mcfg(o.id);
  if (o.on !== undefined) { if (M.via === 'ai') { const L = db.settings.engines = db.settings.engines || []; const i = L.indexOf(o.id); if (o.on && i < 0) L.push(o.id); if (!o.on && i >= 0) L.splice(i, 1); if (o.id === 'ollama') db.settings.ollama = { ...(db.settings.ollama || {}), on: !!o.on }; } else c.on = !!o.on; }
  if (o.space !== undefined && M.via === 'space') { const s = String(o.space).trim(); if (s && !/^[\w.-]+\/[\w.-]+$/.test(s)) throw new Error('El Space debe ser usuario/nombre'); c.space = s || undefined; delete infoCache[s]; }
  if (o.url !== undefined) { const u = String(o.url).trim(); if (u && !/^https?:\/\/[^\s]+$/.test(u)) throw new Error('Dirección no válida'); c.url = u; if (o.id === 'ollama') db.settings.ollama = { ...(db.settings.ollama || {}), url: u }; }
  if (o.limite !== undefined) c.limite = Math.max(0, Math.min(1000, +o.limite || 0));
  if (o.flujo !== undefined && o.id === 'comfyui') { try { c.flujo = o.flujo ? JSON.parse(o.flujo) : null; } catch (e) { throw new Error('El flujo debe ser el JSON exportado «para API» desde ComfyUI'); } }
  saveAll.settings(); return { ok: 1 };
}
function accion(id, a) {
  const t = tareas.find(x => x.id === id); if (!t) throw new Error('No existe');
  if (a === 'cancelar' && t.estado !== 'trabajando') { t.estado = 'cancelado'; t.avance = 'Cancelada'; }
  if (a === 'reintentar' && ['error', 'cancelado', 'esperando cupo'].includes(t.estado)) { t.estado = 'en cola'; t.intentos = 0; t.reintentar = null; setTimeout(trabajar, 100); }
  if (a === 'borrar' && t.estado !== 'trabajando') { for (const f of [t.archivo, t.imagen && path.basename(t.imagen)]) if (f) fs.rmSync(path.join(DIR, f), { force: true }); tareas = tareas.filter(x => x !== t); }
  guardar(); return { ok: 1 };
}
const archivo = id => { const t = tareas.find(x => x.id === id); return t?.archivo ? path.join(DIR, t.archivo) : null; };
const imagenDe = id => { const t = tareas.find(x => x.id === id); return t?.imagen && fs.existsSync(t.imagen) ? t.imagen : null; };

module.exports = { MOTORES, estado, configurar, probar, crearTarea, accion, archivo, imagenDe, trabajar, _datos: datos, _hostDe: hostDe, _esperaCupo: esperaCupo, _bajarVideo: bajarVideo };
