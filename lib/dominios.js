// 🔎 ¿Está libre el dominio? Consulta el registro oficial (RDAP, el estándar que usan los registradores).
// Para extensiones sin RDAP público (por ejemplo .pe) se revisa el DNS: si no existe, «probablemente libre».
// 💡 Además sugiere nombres con buen SEO (cortos, memorables, con palabras del nicho) y revisa cuáles están libres.
const dns = require('dns').promises;
const { parseJSON } = require('./util');

const cache = new Map(); // dominio -> { r, t }
let boot = null, bootT = 0;
async function bootstrap() { // lista oficial de IANA: qué servidor RDAP atiende cada extensión
  if (boot && Date.now() - bootT < 864e5) return boot;
  try { const j = await (await fetch('https://data.iana.org/rdap/dns.json', { signal: AbortSignal.timeout(12000) })).json(); const m = {}; for (const [tlds, urls] of j.services || []) for (const t of tlds) m[t.toLowerCase()] = urls[0]; boot = m; bootT = Date.now(); }
  catch (e) { boot = boot || { com: 'https://rdap.verisign.com/com/v1/', net: 'https://rdap.verisign.com/net/v1/' }; }
  return boot;
}
const limpiar = d => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').replace(/[^a-z0-9.-]/g, '');

async function consultar(d) {
  const c = cache.get(d); if (c && Date.now() - c.t < 3600e3) return c.r;
  const tld = d.split('.').slice(1).join('.'), B = await bootstrap(), base = B[tld] || B[d.split('.').pop()];
  let r = null;
  if (base) {
    try { const x = await fetch(base.replace(/\/?$/, '/') + 'domain/' + encodeURIComponent(d), { headers: { accept: 'application/rdap+json' }, signal: AbortSignal.timeout(12000) });
      if (x.status === 404) r = { dominio: d, estado: 'libre', via: 'registro oficial' };
      else if (x.ok) r = { dominio: d, estado: 'ocupado', via: 'registro oficial' }; } catch (e) {}
  }
  if (!r) { // sin RDAP: se mira el DNS
    try { await dns.resolveNs(d); r = { dominio: d, estado: 'ocupado', via: 'DNS' }; }
    catch (e) { r = ['ENOTFOUND', 'ENODATA', 'ESERVFAIL'].includes(e.code) ? { dominio: d, estado: 'probable', via: 'DNS (confírmalo al comprar)' } : { dominio: d, estado: 'desconocido', via: e.code || 'error' }; }
  }
  cache.set(d, { r, t: Date.now() }); if (cache.size > 2000) cache.clear(); return r;
}

// «vivesanisimo» → revisa .com, .pe, .net y .org; «vivesanisimo.com» → solo ese
async function disponible(entrada, pais = 'Perú') {
  const d = limpiar(entrada); if (!d || d.length < 3) throw new Error('Escribe un nombre de dominio');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(d) || /^-|-$|--/.test(d.split('.')[0])) throw new Error('El nombre solo puede tener letras, números y guiones (sin espacios ni tildes)');
  const lista = d.includes('.') ? [d] : [d + '.com', ...(pais === 'Perú' ? [d + '.pe', d + '.com.pe'] : []), d + '.net', d + '.org'];
  const out = []; for (const x of lista) out.push(await consultar(x));
  return { resultados: out };
}

async function sugerir({ nicho, pais = 'Perú', base = '' }) {
  if (!String(nicho || '').trim()) throw new Error('Escribe primero la temática');
  const r = await require('./ai').ask([{ role: 'user', content: `Eres experto en naming y SEO. Propón 15 nombres de dominio para un sitio de contenido sobre «${nicho}» dirigido a ${pais}${base ? ` (al usuario le gusta la idea «${base}»)` : ''}.
Reglas: cortos (6 a 16 letras), fáciles de decir y escribir por teléfono, en español natural, sin guiones, sin números, sin tildes ni ñ (usa n), que incluyan o sugieran una palabra clave del nicho (ayuda a que la gente sepa de qué trata y haga clic) pero que suenen a marca, no a spam. Varía los estilos: palabra clave + palabra amable, nombres compuestos, expresiones de ${pais}.
Devuelve SOLO JSON: {"nombres":[{"nombre":"solo el nombre sin extensión","por_que":"máx 12 palabras"}]}` }], { json: true, max: 1500, preferir: ['groq', 'gemini'], rapido: true, modelos: { groq: 'llama-3.3-70b-versatile' } });
  const j = parseJSON(r.text), nombres = [...new Set((j.nombres || []).map(x => ({ n: limpiar(x.nombre).replace(/\..*$/, '').replace(/-/g, ''), p: String(x.por_que || '').slice(0, 120) })).filter(x => /^[a-z0-9]{4,22}$/.test(x.n)).map(x => JSON.stringify(x)))].map(x => JSON.parse(x)).slice(0, 15);
  const out = [];
  for (let i = 0; i < nombres.length; i += 4) out.push(...await Promise.all(nombres.slice(i, i + 4).map(async x => {
    const com = await consultar(x.n + '.com'), pe = pais === 'Perú' ? await consultar(x.n + '.pe') : null;
    return { nombre: x.n, por_que: x.p, com: com.estado, pe: pe?.estado || null };
  })));
  const peso = x => (x.com === 'libre' ? 0 : x.pe === 'libre' || x.pe === 'probable' ? 1 : 2);
  return { sugerencias: out.sort((a, b) => peso(a) - peso(b)) };
}

module.exports = { disponible, sugerir };
