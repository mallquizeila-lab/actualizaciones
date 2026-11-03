// Imágenes con IA en Cloudflare Workers AI, con UNA cuenta y su cupo gratis diario
// (basado en imagenesIA.js de Josefino). Modelos con licencia Apache-2.0, aptos para monetizar:
//   flux-2-klein-4b: buena calidad y acepta imágenes de referencia (personajes consistentes)
//   flux-1-schnell:  respaldo rápido
// El gasto se ESTIMA y se guarda en data/cf_uso.json; al acercarse al límite deja de pedir
// imágenes y el video usa fotos de Pexels/Pixabay.
const fs = require('fs'), path = require('path'), os = require('os');
const { E, ff, DATA, uid } = require('./util');

const USO = path.join(DATA, 'cf_uso.json');
const LIMITE = Number(E.CF_PRESUPUESTO_NEURONAS) || 9500; // margen bajo las 10.000 gratis por día
const MODELOS = [
  { id: '@cf/black-forest-labs/flux-2-klein-4b', multipart: true },
  { id: '@cf/black-forest-labs/flux-1-schnell', multipart: false },
];
const DIMS = { vertical: [864, 1536], cuadrado: [1024, 1024] };

const ready = () => !!(E.CF_ACCOUNT_ID && E.CF_API_TOKEN);
const nvidiaReady = () => !!E.NVIDIA_API_KEY;
const listo = () => ready() || nvidiaReady(); // Cloudflare o, de respaldo, NVIDIA

// Respaldo con NVIDIA (misma clave que ya usas para textos). Solo modelos que permiten uso comercial.
// No admite imágenes de referencia: si el pedido las necesita, no se usa.
const NV_MODELOS = ['black-forest-labs/flux.1-schnell'];
let nvSinCredito = '';
async function nvidia({ prompt, w, h }) {
  if (nvSinCredito === hoyUTC()) throw Object.assign(new Error('NVIDIA sin créditos hoy'), { cupo: true });
  const lado = v => Math.max(768, Math.min(1344, Math.round(v / 64) * 64));
  let ultimo;
  for (const modelo of NV_MODELOS) for (const body of [{ prompt, width: lado(w), height: lado(h), steps: 4, seed: Math.floor(Math.random() * 1e9) }, { prompt, mode: 'base', steps: 4, seed: 0 }]) {
    const r = await fetch('https://ai.api.nvidia.com/v1/genai/' + modelo, { method: 'POST', headers: { Authorization: 'Bearer ' + E.NVIDIA_API_KEY, Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(150000) });
    const t = await r.text();
    if (!r.ok) { ultimo = new Error('NVIDIA ' + r.status + ': ' + t.slice(0, 200)); if (r.status === 402 || r.status === 429 || /credit|quota|limit/i.test(t)) { nvSinCredito = hoyUTC(); throw Object.assign(ultimo, { cupo: true }); } if (r.status === 401 || r.status === 403) throw ultimo; continue; }
    let j; try { j = JSON.parse(t); } catch (e) { ultimo = new Error('NVIDIA respondió algo raro'); continue; }
    const a = j.artifacts?.[0]; if (a && /filter/i.test(a.finishReason || '')) throw new Error('NVIDIA filtró la imagen');
    const b64 = a?.base64 || j.image || j.data?.[0]?.b64_json; if (b64) return Buffer.from(b64, 'base64');
    ultimo = new Error('NVIDIA respondió sin imagen');
  }
  throw ultimo || new Error('NVIDIA no respondió');
}
const hoyUTC = () => new Date().toISOString().slice(0, 10);
function uso() { try { const u = JSON.parse(fs.readFileSync(USO, 'utf8')); if (u.fecha === hoyUTC()) return u; } catch (e) {} return { fecha: hoyUTC(), neuronas: 0, imagenes: 0 }; }
const guardar = u => fs.writeFileSync(USO, JSON.stringify(u));
function costo(m, w, h) { return m.multipart ? Math.ceil(125 * (w * h) / (768 * 1344)) : 70; } // estimado
function cupo() {
  const u = uso(), [w, h] = DIMS.vertical, left = Math.max(0, LIMITE - u.neuronas);
  return { ready: ready(), usadasHoy: u.imagenes, quedanAprox: Math.floor(left / costo(MODELOS[0], w, h)) };
}

// Palabras que activan el filtro aunque los personajes sean frutas o dibujos.
const LIMPIEZA = [
  [/\bcrop[- ]?tops?\b/gi, 't-shirt'], [/\bshorts\b/gi, 'jeans'], [/\b(shirtless|topless|bare[- ]chested)\b/gi, 'wearing a t-shirt'],
  [/\b(bikini|swimsuit|swimwear|underwear|lingerie)\b/gi, 'casual clothes'], [/\bbare\b/gi, ''],
  [/\b(naked|nude|sexy|seductive|busty|curvy|cleavage|abs|ribs?|collarbones?)\b/gi, ''], [/\b(torso|chest)\b/gi, 'upper body'],
  [/\b(bony|skinny|thin)\b/gi, 'slim'], [/\byoung (woman|man)\b/gi, 'adult $1'], [/\btight\b/gi, 'casual'],
];
const limpiar = p => { let t = String(p || ''); for (const [re, r] of LIMPIEZA) t = t.replace(re, r); return t.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim(); };

async function llamar(m, { prompt, w, h, refs }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${E.CF_ACCOUNT_ID}/ai/run/${m.id}`;
  const headers = { Authorization: 'Bearer ' + E.CF_API_TOKEN };
  let body;
  if (m.multipart) {
    body = new FormData();
    body.append('prompt', prompt); body.append('width', String(w)); body.append('height', String(h));
    refs.forEach((r, i) => body.append('input_image_' + i, new Blob([r]), 'ref' + i + '.png'));
  } else { headers['Content-Type'] = 'application/json'; body = JSON.stringify({ prompt, steps: 6 }); }
  const r = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(150000) });
  if (!r.ok) {
    const t = (await r.text()).slice(0, 300);
    throw Object.assign(new Error('Cloudflare ' + r.status + ': ' + t), { cupo: r.status === 429 || /daily free allocation|neurons|4006|quota/i.test(t) });
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('json')) {
    const j = await r.json();
    const b64 = j.result?.image || j.image;
    if (!b64) throw new Error('Cloudflare respondió sin imagen');
    return Buffer.from(b64, 'base64');
  }
  return Buffer.from(await r.arrayBuffer());
}

// Las referencias deben medir menos de 512x512.
// Si la imagen tiene transparencia (personajes), se pone sobre fondo blanco.
async function reducir(file) {
  const out = path.join(os.tmpdir(), 'ref-' + uid() + '.png');
  await ff(['-f', 'lavfi', '-i', 'color=white:s=500x500', '-i', file, '-filter_complex', '[1:v]scale=500:500:force_original_aspect_ratio=decrease[f];[0:v][f]overlay=(W-w)/2:(H-h)/2', '-frames:v', '1', out]);
  const b = fs.readFileSync(out); fs.rmSync(out, { force: true }); return b;
}

// Genera una imagen y la guarda en `out`. Devuelve true o lanza error.
async function generar({ prompt, out, formato = 'vertical', refFiles = [], log = () => {} }) {
  if (!listo()) throw new Error('Faltan las claves de Cloudflare o NVIDIA (Ajustes)');
  const [w, h] = DIMS[formato] || DIMS.vertical;
  const refs = [];
  for (const f of refFiles.slice(0, 4)) refs.push(await reducir(f));
  const p = (refs.length ? 'Keep exactly the same character as in the reference image (same face, colors and proportions). ' : '') + limpiar(prompt);
  const errs = [];
  for (const m of !ready() ? [] : refs.length ? MODELOS.filter(x => x.multipart) : MODELOS) {
    const c = costo(m, w, h), u = uso();
    if (u.neuronas + c > LIMITE) { errs.push('sin cupo gratis hoy'); break; }
    try {
      const buf = await llamar(m, { prompt: p, w, h, refs });
      u.neuronas += c; u.imagenes++; guardar(u);
      fs.writeFileSync(out, buf);
      return true;
    } catch (e) {
      if (e.cupo) { const u2 = uso(); u2.neuronas = LIMITE; guardar(u2); errs.push('cupo agotado'); break; }
      errs.push(e.message); log('Imagen IA: ' + e.message.slice(0, 120));
    }
  }
  // Respaldo: NVIDIA cuando Cloudflare no tiene cupo o falla (solo pedidos sin imagen de referencia)
  if (nvidiaReady() && !refs.length) {
    try { const buf = await nvidia({ prompt: p, w, h }); fs.writeFileSync(out, buf); log('Imagen creada con NVIDIA (respaldo)'); return true; }
    catch (e) { errs.push(e.message); log('Imagen IA (NVIDIA): ' + e.message.slice(0, 120)); if (e.cupo && errs.some(x => /cupo/.test(x))) throw new Error('No se pudo generar la imagen (cupo agotado en Cloudflare y NVIDIA)'); }
  }
  throw new Error('No se pudo generar la imagen (' + errs.join(' | ') + ')');
}

// Crea un personaje (boca cerrada y boca abierta) con fondo transparente.
// Se pide un fondo magenta liso y luego se quita con ffmpeg (ninguna fruta común es magenta).
async function personaje(desc, dir, base, log) {
  const estilo = 'cute 3D animated cartoon character, Pixar style, big expressive eyes, small arms and legs, full body, centered, facing the camera, isolated on a solid flat pure magenta background (#FF00FF), no shadow, no text, family-friendly';
  const tmpC = path.join(dir, base + '-c.jpg'), tmpO = path.join(dir, base + '-o.jpg');
  await generar({ prompt: `${desc} character with a friendly face, mouth closed and smiling, ${estilo}`, out: tmpC, formato: 'cuadrado', log });
  await generar({ prompt: `the same ${desc} character, identical design and colors, mouth wide open as if talking, ${estilo}`, out: tmpO, formato: 'cuadrado', refFiles: [tmpC], log });
  const key = (i, o) => ff(['-i', i, '-vf', 'colorkey=0xFF00FF:0.33:0.12,format=rgba', '-frames:v', '1', o]);
  const closed = base + '-closed.png', open = base + '-open.png';
  await key(tmpC, path.join(dir, closed));
  await key(tmpO, path.join(dir, open));
  fs.rmSync(tmpC, { force: true }); fs.rmSync(tmpO, { force: true });
  return { closed, open };
}

module.exports = { ready, listo, nvidiaReady, cupo, generar, personaje, limpiar };
