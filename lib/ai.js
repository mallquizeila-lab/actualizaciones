// Motores de IA gratis con respaldo automático: si uno falla o llega a su límite, pasa al siguiente.
// Gemini, Groq y NVIDIA usan el formato de OpenAI; Claude (de pago, opcional) usa el suyo.
const { E, sleep, day } = require('./util');
const { db, saveAll } = require('./store');

const PROVIDERS = {
  gemini: {
    label: 'Google Gemini', key: 'GEMINI_API_KEY', url: 'aistudio.google.com',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai', json: true,
    // El más nuevo "gemini-X.Y-flash"; si no, flash-lite. Los nombres cambian, por eso se eligen de la lista viva.
    choose: ids => newest(ids, /^gemini-([\d.]+)-flash$/) || newest(ids, /^gemini-([\d.]+)-flash-lite$/),
    fallback: 'gemini-2.5-flash',
  },
  groq: {
    label: 'Groq', key: 'GROQ_API_KEY', url: 'console.groq.com',
    base: 'https://api.groq.com/openai/v1', json: true,
    choose: ids => first(ids, [/^openai\/gpt-oss-120b$/, /llama-3\.3-70b/, /qwen/, /^openai\/gpt-oss-20b$/]),
    fallback: 'openai/gpt-oss-120b',
  },
  nvidia: {
    label: 'NVIDIA', key: 'NVIDIA_API_KEY', url: 'build.nvidia.com',
    base: 'https://integrate.api.nvidia.com/v1', json: false, maxImg: 4,
    // La lista de NVIDIA trae modelos que tu cuenta gratis no siempre puede usar (error 404):
    // por eso se prueban varios candidatos y se recuerda el primero que funciona.
    prefs: [/deepseek-v4.*flash/, /deepseek-v3/, /llama-3\.3-70b-instruct/, /nemotron.*super/, /qwen3.*instruct/, /mistral-large/, /llama.*70b.*instruct/],
    choose: ids => first(ids, PROVIDERS.nvidia.prefs),
    fallback: 'meta/llama-3.3-70b-instruct',
  },
  // ----- Motores de reserva (cada uno con su propia cuenta gratis) -----
  github: {
    label: 'GitHub Models', key: 'GITHUB_TOKEN', url: 'github.com/marketplace/models',
    base: 'https://models.github.ai/inference', json: false, maxImg: 8,
    list: async () => { const r = await fetch('https://models.github.ai/catalog/models', { headers: { authorization: 'Bearer ' + E.GITHUB_TOKEN } }); if (!r.ok) throw new Error('GitHub ' + r.status); return (await r.json()).map(m => m.id); },
    choose: ids => first(ids, [/gpt-4\.1-mini/, /gpt-4o-mini/, /llama-3\.3-70b/i, /deepseek-v3/i]),
    visionPrefs: [/gpt-4\.1-mini/, /gpt-4o-mini/, /gpt-4\.1$/, /gpt-4o$/, /llama-4/i],
    fallback: 'openai/gpt-4.1-mini',
  },
  mistral: {
    label: 'Mistral', key: 'MISTRAL_API_KEY', url: 'console.mistral.ai',
    base: 'https://api.mistral.ai/v1', json: true, maxImg: 8,
    choose: ids => first(ids, [/^mistral-medium-latest$/, /^mistral-small-latest$/, /^mistral-large-latest$/]),
    visionPrefs: [/^mistral-medium-latest$/, /^mistral-small-latest$/, /^pixtral-large-latest$/, /^pixtral-12b/],
    fallback: 'mistral-small-latest',
  },
  openrouter: {
    label: 'OpenRouter (modelos gratis)', key: 'OPENROUTER_API_KEY', url: 'openrouter.ai',
    base: 'https://openrouter.ai/api/v1', json: false, maxImg: 5,
    choose: ids => first(ids, [/deepseek.*:free$/, /llama-3\.3-70b.*:free$/, /qwen.*:free$/, /gemma.*:free$/, /:free$/]),
    visionPrefs: [/qwen.*vl.*:free$/, /llama-4.*:free$/, /gemma-3.*:free$/, /-vl.*:free$/, /vision.*:free$/, /mistral-small.*:free$/],
    fallback: 'deepseek/deepseek-chat-v3-0324:free',
  },
  cerebras: {
    label: 'Cerebras (texto muy rápido)', key: 'CEREBRAS_API_KEY', url: 'cloud.cerebras.ai',
    base: 'https://api.cerebras.ai/v1', json: false,
    choose: ids => first(ids, [/gpt-oss-120b/, /llama-3\.3-70b/, /qwen-3.*235b/, /llama/]),
    fallback: 'llama-3.3-70b',
  },
  cloudflare: {
    label: 'Cloudflare AI (último respaldo)', key: 'CF_API_TOKEN', url: 'dash.cloudflare.com',
    get base() { return E.CF_ACCOUNT_ID ? `https://api.cloudflare.com/client/v4/accounts/${E.CF_ACCOUNT_ID}/ai/v1` : ''; }, json: false, maxImg: 4,
    list: async () => ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-4-scout-17b-16e-instruct'],
    choose: ids => ids[0], visionPrefs: [/llama-4-scout/],
    fallback: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  },
  anthropic: {
    label: 'Claude (de pago, opcional)', key: 'ANTHROPIC_API_KEY', url: 'console.anthropic.com',
    fallback: 'claude-sonnet-5-5',
  },
};

function newest(ids, re) {
  const v = ids.map(id => [id, id.match(re)]).filter(x => x[1]);
  v.sort((a, b) => cmpVer(b[1][1], a[1][1]));
  return v[0] && v[0][0];
}
const cmpVer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
const first = (ids, res) => { for (const re of res) { const m = ids.find(i => re.test(i)); if (m) return m; } };

const modelCache = {};
async function listModels(p) {
  const P = PROVIDERS[p];
  if (P.list) return P.list();
  if (!P.base) return [];
  const r = await fetch(P.base + '/models', { headers: { authorization: 'Bearer ' + E[P.key] } });
  if (!r.ok) throw new Error(P.label + ': ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return ((await r.json()).data || []).map(m => String(m.id).replace(/^models\//, ''));
}
async function modelFor(p) {
  if (db.settings.models[p]) return db.settings.models[p];
  if (modelCache[p]) return modelCache[p];
  try { modelCache[p] = PROVIDERS[p].choose(await listModels(p)) || PROVIDERS[p].fallback; }
  catch (e) { return PROVIDERS[p].fallback; }
  return modelCache[p];
}

// Modelos de respaldo dentro del mismo motor: si el principal está saturado ("high demand"),
// se prueban otros (p. ej. una versión anterior de Gemini Flash o Flash-Lite).
const altCache = {};
async function modelsFor(p) {
  if (db.settings.models[p]) return [db.settings.models[p]];
  const main = await modelFor(p);
  let alts = [];
  if (p === 'openrouter') { // modelos gratis: se prueban varios (suelen saturarse o desaparecer)
    try {
      const ids = (altCache[p] || (altCache[p] = await listModels(p))).filter(i => /:free$/.test(i));
      const pref = [/deepseek/, /llama-3\.3-70b/, /qwen/, /gemma/, /mistral/, /llama/, /./];
      for (const re of pref) alts.push(...ids.filter(i => re.test(i)));
    } catch (e) {}
    return [...new Set([main, ...alts])].filter(m => /:free$/.test(m)).slice(0, 6);
  }
  if (p === 'nvidia') {
    try {
      const ids = altCache[p] || (altCache[p] = await listModels(p));
      for (const re of PROVIDERS.nvidia.prefs) alts.push(...ids.filter(i => re.test(i)));
      alts.push(PROVIDERS.nvidia.fallback);
    } catch (e) {}
    return [...new Set([main, ...alts])].slice(0, 6);
  }
  if (p === 'gemini') {
    try {
      const ids = altCache[p] || (altCache[p] = await listModels(p));
      const ver = id => (id.match(/^gemini-([\d.]+)-flash(-lite)?$/) || []);
      alts = ids.filter(i => ver(i)[1]).sort((a, b) => (!!ver(a)[2] - !!ver(b)[2]) || cmpVer(ver(b)[1], ver(a)[1]));
    } catch (e) {}
  }
  return [main, ...alts.filter(x => x !== main)].slice(0, 4);
}
const BUSY = [429, 500, 502, 503, 529];
const isBusy = e => BUSY.includes(e.status) || e.status === 404 || /provider returned error|no endpoints|temporarily|unavailable/i.test(e.message) || /high demand|overloaded|no respondió|tiempo agotado|timeout|aborted/i.test(e.message);

const engines = () => { const e = (db.settings.engines || []).filter(p => PROVIDERS[p]); return [...e, ...Object.keys(PROVIDERS).filter(p => !e.includes(p))]; };
const active = () => engines().filter(p => PROVIDERS[p] && E[PROVIDERS[p].key] && (p !== 'cloudflare' || E.CF_ACCOUNT_ID));

function count(p) {
  const d = day();
  db.usage = { [d]: db.usage[d] || {} };
  db.usage[d][p] = (db.usage[d][p] || 0) + 1;
  saveAll.usage();
}

// Ritmo: espacia los pedidos a cada motor para no disparar el límite por minuto (no cambia la calidad).
const GAP = { gemini: 4500, groq: 2200, github: 4000, openrouter: 3500, nvidia: 1500, cerebras: 1500, mistral: 1500, cloudflare: 800 };
const ultimo = {};
async function turno(p) {
  const gap = GAP[p] || 1000, ahora = Date.now(), t = Math.max(ahora, (ultimo[p] || 0) + gap);
  ultimo[p] = t;
  if (t > ahora) await sleep(t - ahora);
}

async function callOne(p, messages, { json, max, model }) {
  await turno(p);
  const P = PROVIDERS[p];
  model = model || await modelFor(p);
  if (p === 'anthropic') {
    const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': E[P.key], 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: max, system: sys || undefined, messages: messages.filter(m => m.role !== 'system') }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error?.message || 'Error ' + r.status), { status: r.status });
    return { text: j.content.map(x => x.text || '').join(''), model };
  }
  // Nemotron: sin "pensamiento largo" (si no, a veces devuelve la respuesta vacía).
  if (/nemotron/i.test(model)) messages = [{ role: 'system', content: 'detailed thinking off' }, ...messages];
  const razona = /(^|\/)(o\d|gpt-5|deepseek-r1|qwq|qwen3|magistral|phi-4-reasoning)/i.test(model);
  const body = { model, messages, temperature: 0.8 };
  // Los modelos que "razonan" usan otro nombre para el límite y necesitan más espacio para responder.
  if (razona && p === 'github') body.max_completion_tokens = Math.max(max, 4000); else body.max_tokens = razona ? Math.max(max, 4000) : max;
  if (razona && /^o\d|gpt-5/i.test(model.split('/').pop())) delete body.temperature;
  if (p === 'openrouter') body.reasoning = { effort: 'low' };
  if (json && P.json) body.response_format = { type: 'json_object' };
  const r = await fetch(P.base + '/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(p === 'gemini' || p === 'anthropic' ? 150000 : 75000), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + E[P.key] }, body: JSON.stringify(body),
  });
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t); } catch (e) {}
  if (!r.ok) throw Object.assign(new Error((j.error?.message || j.errors?.[0]?.message || (Array.isArray(j) && j[0]?.error?.message) || t || 'Error ' + r.status).slice(0, 300) || 'Error ' + r.status), { status: r.status });
  const msg = j.choices?.[0]?.message || j.choices?.[0]?.delta || {};
  // El texto puede venir como cadena o como lista de partes.
  let text = Array.isArray(msg.content) ? msg.content.map(x => x?.text || '').join('') : (msg.content || j.choices?.[0]?.text || '');
  // Modelos "que piensan" (Nemotron, Qwen3, DeepSeek...) a veces dejan la respuesta en el razonamiento.
  const raz = msg.reasoning_content || msg.reasoning || '';
  if (!text.trim() && raz && (!json || /\{[\s\S]*\}/.test(raz))) text = raz;
  if (!text.trim()) {
    const fin = j.choices?.[0]?.finish_reason, det = j.error?.message || (j.choices ? 'fin: ' + (fin || '?') : 'formato: ' + t.slice(0, 120).replace(/\s+/g, ' '));
    throw Object.assign(new Error('Respuesta vacía (' + det + ')'), { status: 503 }); // se prueba otro modelo
  }
  return { text, model };
}

// Modelos que agotaron su cuota gratis del día: se saltan hasta que se renueve (ahorra tiempo).
const agotado = {};
const QUOTA = /quota|exceeded|RESOURCE_EXHAUSTED|rate.?limit|per day|limit: 0/i;
const isAgotado = (p, m) => (agotado[p + '|' + m] || 0) > Date.now();
function marcarAgotado(p, m, e) { if (e.status === 429 && QUOTA.test(e.message)) agotado[p + '|' + m] = Date.now() + 4 * 3600000; }

// Modelos con visión (para mirar imágenes) fuera de Gemini: respaldo cuando Gemini se agota.
const visionCache = {};
async function visionModels(p) {
  if (p === 'gemini') return modelsFor(p);
  if (visionCache[p]) return visionCache[p];
  if (p === 'openrouter') { // OpenRouter dice qué modelos aceptan imágenes: se usan los gratis que sí
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { authorization: 'Bearer ' + E.OPENROUTER_API_KEY } });
      const ms = ((await r.json()).data || []).filter(m => /:free$/.test(m.id) && (m.architecture?.input_modalities || []).includes('image'));
      const pref = [/qwen.*vl/i, /llama-4/i, /gemma-3/i, /nemotron.*vl/i, /mistral/i, /./];
      const out = []; for (const re of pref) out.push(...ms.filter(m => re.test(m.id)).map(m => m.id));
      return (visionCache[p] = [...new Set(out)].slice(0, 4));
    } catch (e) { return (visionCache[p] = []); }
  }
  try {
    const ids = await listModels(p);
    const prefs = PROVIDERS[p].visionPrefs || (p === 'nvidia' ? [/nemotron.*vl/i, /llama-3\.2-90b-vision/i, /vision/i, /-vl/i] : p === 'groq' ? [/llama-4-maverick/i, /llama-4-scout/i, /vision/i] : []);
    if (!prefs.length) return (visionCache[p] = []);
    const out = [];
    for (const re of prefs) out.push(...ids.filter(i => re.test(i)));
    return (visionCache[p] = [...new Set(out)].slice(0, 2));
  } catch (e) { return (visionCache[p] = []); }
}
// Con imágenes, algunos motores aceptan pocas: se reduce la cantidad de fotogramas si hace falta.
function menosImagenes(messages, maxImg) {
  return messages.map(m => {
    if (!Array.isArray(m.content)) return m;
    const imgs = m.content.filter(x => x.type === 'image_url');
    if (imgs.length <= maxImg) return m;
    const keep = new Set(Array.from({ length: maxImg }, (_, k) => imgs[Math.round(k * (imgs.length - 1) / (maxImg - 1))]));
    return { ...m, content: m.content.filter(x => x.type !== 'image_url' || keep.has(x)) };
  });
}

// messages: [{role:'system'|'user'|'assistant', content}]
async function ask(messages, { json = false, max = 6000, log = () => {}, vision = false } = {}) {
  let list = active();
  if (vision) list = ['gemini', 'nvidia', 'github', 'mistral', 'openrouter', 'groq', 'cloudflare'].filter(p => list.includes(p));
  // Cuidar a Gemini: es el único que ve bien las imágenes. Las tareas de solo texto van primero a
  // Groq/NVIDIA y Gemini queda de respaldo (así su cuota gratis alcanza para mirar los videos).
  else if (db.settings.reserveGemini !== false && list.length > 1 && list.includes('gemini')) list = [...list.filter(p => p !== 'gemini'), 'gemini'];
  if (vision && !list.length) throw new Error('Para analizar imágenes hace falta la clave de Gemini');
  if (!list.length) throw new Error('No hay ninguna clave de IA. Ve a Ajustes y pega tu clave gratis de Gemini.');
  const errs = [];
  for (const p of list) {
    const models = (vision ? await visionModels(p) : await modelsFor(p)).filter(m => !isAgotado(p, m));
    if (!models.length) { errs.push(PROVIDERS[p].label + ': cuota del día agotada (se renueva sola)'); continue; }
    const msgs = vision && p !== 'gemini' ? menosImagenes(messages, PROVIDERS[p].maxImg || (p === 'groq' ? 5 : 8)) : messages;
    if (vision && p !== 'gemini') log(`Gemini no disponible: miro las imágenes con ${PROVIDERS[p].label}`);
    for (const [i, model] of models.entries()) {
      try {
        const r = await callOne(p, msgs, { json, max, model });
        if (!db.settings.models[p] && !vision) modelCache[p] = model;
        count(p);
        return { ...r, provider: p };
      } catch (e) {
        console.log('[IA] ' + PROVIDERS[p].label + ' (' + model + '): ' + e.message);
        marcarAgotado(p, model, e);
        if (!isBusy(e) || i === models.length - 1) { errs.push(PROVIDERS[p].label + ': ' + (QUOTA.test(e.message) && e.status === 429 ? 'cuota gratis del día agotada (se renueva sola)' : e.message)); break; }
        log(PROVIDERS[p].label + (QUOTA.test(e.message) ? ' agotó la cuota de ' + model : ' saturado') + ', pruebo con ' + models[i + 1]);
        await sleep(2000);
      }
    }
    if (list.indexOf(p) < list.length - 1) log('Cambiando de motor de IA (' + PROVIDERS[p].label + ' no respondió)');
  }
  throw new Error('Ningún motor de IA respondió. ' + errs.join(' | '));
}

// Chat en vivo: el texto llega por partes (onDelta) para que el panel lo muestre mientras se escribe.
// Con Gemini se pide "pensar poco" (reasoning_effort low): responde mucho más rápido.
// Corta la espera si el motor no empieza a responder a tiempo.
function firstByteTimeout(ms) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(new Error(`no respondió en ${ms / 1000} s`)), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

async function streamOne(p, messages, max, onDelta, model) {
  const P = PROVIDERS[p];
  model = model || await modelFor(p);
  const to = firstByteTimeout(40000);
  if (!P.base) { const r = await callOne(p, messages, { max, model }); onDelta(r.text); return { text: r.text, model }; }
  const body = { model, messages, max_tokens: max, temperature: 0.8, stream: true };
  if (p === 'gemini') body.reasoning_effort = 'low';
  const send = () => fetch(P.base + '/chat/completions', { method: 'POST', signal: to.signal, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + E[P.key] }, body: JSON.stringify(body) });
  let r;
  try {
    r = await send();
    if (r.status === 400 && body.reasoning_effort) { delete body.reasoning_effort; r = await send(); } // por si el modelo no acepta ese ajuste
  } catch (e) { to.done(); throw new Error(to.signal.aborted ? String(to.signal.reason?.message || 'tiempo agotado') : e.message); }
  if (!r.ok) { const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch (e) {} throw Object.assign(new Error((j.error?.message || (Array.isArray(j) && j[0]?.error?.message) || t).slice(0, 300)), { status: r.status }); }
  const dec = new TextDecoder();
  let buf = '', text = '';
  try {
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      try { const d = JSON.parse(data).choices?.[0]?.delta?.content; if (d) { if (!text) to.done(); text += d; onDelta(d); } } catch (e) {}
    }
  }
  } catch (e) { throw new Error(to.signal.aborted && !text ? String(to.signal.reason?.message || 'tiempo agotado') : e.message); }
  finally { to.done(); }
  if (!text.trim()) throw new Error('Respuesta vacía');
  return { text, model };
}

async function askStream(messages, onDelta, { max = 4000 } = {}) {
  let list = active();
  if (db.settings.reserveGemini !== false && list.length > 1 && list.includes('gemini')) list = [...list.filter(p => p !== 'gemini'), 'gemini'];
  if (!list.length) throw new Error('No hay ninguna clave de IA. Ve a Ajustes y pega tu clave gratis de Gemini.');
  const errs = [];
  for (const p of list) {
    const models = (await modelsFor(p)).filter(m => !isAgotado(p, m));
    for (const [i, model] of models.entries()) {
      let sent = false;
      try {
        const r = await streamOne(p, messages, max, d => { sent = true; onDelta(d); }, model);
        count(p);
        return { ...r, provider: p };
      } catch (e) {
        console.log('[Chat] ' + PROVIDERS[p].label + ' (' + model + '): ' + e.message);
        if (sent) throw e; // ya se mostró parte de la respuesta: no mezclar motores
        if (!isBusy(e) || i === models.length - 1) { errs.push(PROVIDERS[p].label + ': ' + e.message); break; }
      }
    }
  }
  throw new Error('Ningún motor de IA respondió. ' + errs.join(' | '));
}

async function test(p) {
  if (!E[PROVIDERS[p].key]) return { ok: false, msg: 'Sin clave' };
  let last;
  for (const model of await modelsFor(p)) {
    try {
      const r = await callOne(p, [{ role: 'user', content: 'Responde solo: OK' }], { json: false, max: 1000, model });
      if (!db.settings.models[p]) modelCache[p] = model;
      const vm = await visionModels(p).catch(() => []);
      return { ok: true, msg: 'Funciona con ' + r.model + (vm.length ? ' · 👁 puede mirar imágenes (' + vm[0] + ')' : ' · solo texto') };
    } catch (e) { last = e; if (!isBusy(e)) break; }
  }
  return { ok: false, msg: last ? last.message : 'Sin modelos' };
}

function estadoCuotas() { return Object.entries(agotado).filter(([, t]) => t > Date.now()).map(([k, t]) => ({ motor: k.split('|')[0], modelo: k.split('|')[1], hasta: new Date(t).toISOString() })); }

// Revisión de motores: prueba todos, guarda cuáles funcionan y cuáles ven imágenes; avisa si no hay visión.
async function revisar() {
  const out = {};
  for (const p of active()) {
    const r = await test(p).catch(e => ({ ok: false, msg: e.message }));
    out[p] = { ok: r.ok, msg: String(r.msg || '').slice(0, 160), vision: r.ok && /👁/.test(r.msg || '') };
  }
  db.settings.health = { at: new Date().toISOString(), engines: out };
  require('./store').saveAll.settings();
  const ven = Object.entries(out).filter(([, x]) => x.vision).map(([p]) => PROVIDERS[p].label);
  if (!ven.length) try { require('./avisos').avisar('⚠️ Hoy ningún motor de IA puede mirar imágenes (cuotas agotadas o claves con problema). Los videos reeditados esperarán y se reintentan solos. Revisa Ajustes → Motores de IA.'); } catch (e) {}
  return out;
}
function startRevision() {
  setTimeout(() => revisar().catch(() => {}), 15000);
  setInterval(() => { const d = new Date(); if (d.getHours() === 7 && (db.settings.health?.at || '').slice(0, 10) !== d.toISOString().slice(0, 10)) revisar().catch(() => {}); }, 30 * 60000);
}

module.exports = { revisar, startRevision, engines, estadoCuotas, PROVIDERS, ask, askStream, test, active, listModels, modelFor };
