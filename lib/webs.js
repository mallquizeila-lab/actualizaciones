// 🌐 Webs: sitios propios para AdSense (calidad > cantidad) y webs profesionales para clientes emprendedores.
// Reglas de oro: nada se publica sin tu aprobación, datos con fuente, un «bloque único» por página,
// páginas legales completas, fechas reales, ritmo natural y SEO técnico completo.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DATA, E, run, parseJSON, uid } = require('./util');
const { db } = require('./store');

const DIR = path.join(DATA, 'webs'), FILE = path.join(DATA, 'webs.json');
fs.mkdirSync(DIR, { recursive: true });
let W = []; try { W = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) {}
const guardar = () => { fs.writeFileSync(FILE + '.tmp', JSON.stringify(W, null, 1)); fs.renameSync(FILE + '.tmp', FILE); };
const web = id => W.find(w => w.id === id);
const hoy = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'pagina';
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
// Parecido entre dos temas (Jaccard), sin contar las palabras del nicho ni las muy comunes: así «receta de causa» y «receta de suspiro» NO se ven iguales
const COMUNES = new Set(norm('como para casa guia paso pasos que cual cuales cuanto cuanta donde cuando mejor mejores hacer tener puedo debo todo todos sobre entre desde hasta forma manera tipos qué cómo'));
const parecido = (a, b, extra = new Set()) => { const f = t => new Set(norm(t).filter(x => !COMUNES.has(x) && !extra.has(x)).map(x => x.slice(0, 6))); const A = f(a), B = f(b); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return n / (A.size + B.size - n); };
const ai = () => require('./ai');
const estado = { trabajando: null };
const log = (w, m) => { w.log = [...(w.log || []), new Date().toLocaleString('es-PE') + ' · ' + m].slice(-60); console.log('[Webs] ' + w.nombre + ': ' + m); };

// ---------------- Markdown mínimo (sin dependencias) ----------------
function md(t) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, x, u) => /^(https?:\/\/|\/|#|mailto:)/.test(u.replace(/&amp;/g, '&')) ? `<a href="${u}"${/^https?:/.test(u) ? ' rel="noopener" target="_blank"' : ''}>${x}</a>` : x);
  const L = String(t || '').replace(/\r/g, '').split('\n'), out = []; let i = 0;
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{2,4})\s+(.*)/))) { const n = m[1].length, txt = m[2].trim(); out.push(`<h${n} id="${slug(txt)}">${inl(txt)}</h${n}>`); i++; continue; }
    if (/^#\s/.test(l)) { i++; continue; } // el H1 lo pone la plantilla
    if (/^\|.*\|\s*$/.test(l) && /^\|?\s*:?-{2,}/.test(L[i + 1] || '')) { // tabla
      const fila = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const cab = fila(l); i += 2; const filas = []; while (i < L.length && /^\|.*\|\s*$/.test(L[i])) filas.push(fila(L[i++]));
      out.push(`<div class="tabla"><table><thead><tr>${cab.map(c => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>${filas.map(f => `<tr>${f.map(c => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
    }
    if (/^\s*[-*]\s+/.test(l)) { const it = []; while (i < L.length && /^\s*[-*]\s+/.test(L[i])) it.push(L[i++].replace(/^\s*[-*]\s+/, '')); out.push(`<ul>${it.map(x => `<li>${inl(x)}</li>`).join('')}</ul>`); continue; }
    if (/^\s*\d+[.)]\s+/.test(l)) { const it = []; while (i < L.length && /^\s*\d+[.)]\s+/.test(L[i])) it.push(L[i++].replace(/^\s*\d+[.)]\s+/, '')); out.push(`<ol>${it.map(x => `<li>${inl(x)}</li>`).join('')}</ol>`); continue; }
    if (/^>\s?/.test(l)) { const it = []; while (i < L.length && /^>\s?/.test(L[i])) it.push(L[i++].replace(/^>\s?/, '')); out.push(`<blockquote>${inl(it.join(' '))}</blockquote>`); continue; }
    const p = []; while (i < L.length && L[i].trim() && !/^(#{1,4}\s|\s*[-*]\s|\s*\d+[.)]\s|>|\|)/.test(L[i])) p.push(L[i++].trim()); out.push(`<p>${inl(p.join(' '))}</p>`);
  }
  return out.join('\n');
}

// ---------------- Prompts ----------------
const PAIS = w => w.pais || 'Perú';
const planP = (w, n, ya) => [{ role: 'user', content: `Eres el editor jefe y estratega SEO de «${w.nombre}», un sitio de ${w.nicho} para ${w.publico || 'público general'} en ${PAIS(w)}.
Objetivo: un sitio ÚTIL de verdad (para que Google AdSense lo apruebe por su valor), no una granja de artículos.
${(w.categorias || []).length ? 'Categorías actuales: ' + w.categorias.map(c => c.nombre).join(', ') : 'Propón entre 4 y 6 categorías claras (nombres cortos, bien escritos, sin mayúsculas raras).'}
Propón ${n} páginas NUEVAS. Reglas:
- Cada una responde a UNA intención de búsqueda distinta (nada de dos páginas para lo mismo). Ya existen (no repitas ni parafrasees): ${ya.slice(0, 80).map(x => '«' + x + '»').join(', ') || 'ninguna'}.
- Prioriza lo que la gente de ${PAIS(w)} busca de verdad y lo que un sitio genérico no resuelve: casos locales, trámites, requisitos exactos, cálculos, comparativas.
- Cada página debe tener un «bloque único» posible: herramienta/calculadora, tabla de datos oficiales con fuente, plantilla descargable, checklist práctico o experiencia del autor.
- Títulos naturales (como los escribiría una persona), sin «guía definitiva», sin años forzados, sin números de relleno.
Devuelve SOLO JSON: {"categorias":[{"nombre":"…","desc":"1 frase"}],"paginas":[{"titulo":"…","intencion":"qué quiere lograr quien busca esto","keyword":"búsqueda principal","categoria":"nombre exacto de una categoría","bloque":"herramienta|tabla|plantilla|checklist|experiencia: qué exactamente","fuentes_sugeridas":["sitio oficial donde verificar los datos"]}]}` }];

const identidadP = (nicho, dominio, pais) => [{ role: 'user', content: `Eres director creativo y estratega SEO. Vamos a crear un sitio web de calidad (para ser aprobado por Google AdSense por su utilidad real).
Temática: «${nicho}». Dominio: ${dominio || '(aún sin dominio)'}. País principal: ${pais}.
Define su identidad: nombre de marca coherente con el dominio (si el dominio es «sebuscaempleo.com», el nombre es «Se Busca Empleo»), público concreto, lema corto, misión (qué problema real resuelve y cómo), un color de marca (hex, legible con texto blanco) y entre 4 y 6 categorías claras.
Devuelve SOLO JSON: {"nombre":"…","publico":"…","lema":"máx 60 caracteres","mision":"1-2 frases","color":"#0f766e","categorias":[{"nombre":"…","desc":"1 frase"}],"logo":"descripción en inglés de un ícono simple y memorable para el logo (un objeto o símbolo, sin letras)"}` }];

const escribirP = (w, p, arreglos) => [{ role: 'user', content: `Eres el editor jefe de «${w.nombre}», un sitio de ${w.nicho} para ${w.publico || 'público general'} en ${PAIS(w)}.
Autor responsable: ${w.autor?.nombre || 'Equipo editorial de ' + w.nombre} (no inventes credenciales ni experiencias personales).
TAREA: escribe la página «${p.titulo}» respondiendo exactamente a esta intención de búsqueda: «${p.intencion}».
Búsqueda principal: «${p.keyword || p.titulo}» (úsala de forma natural, jamás forzada ni repetida).
BLOQUE ÚNICO que debe tener esta página: ${p.bloque || 'una tabla, checklist o plantilla práctica propia'}.
${p.datos ? 'MATERIAL VERIFICADO (úsalo y cítalo):\n' + p.datos : 'No tienes material verificado: usa solo hechos generales ampliamente conocidos y, para leyes, montos o fechas, cita la fuente oficial ' + ((p.fuentes_sugeridas || []).join(', ') || 'del gobierno de ' + PAIS(w)) + ' con su URL; si no estás seguro de un dato exacto, escribe [FALTA DATO: qué falta] en lugar de inventarlo.'}
${arreglos ? 'CORRIGE ESTOS PROBLEMAS que señaló el revisor:\n- ' + arreglos.join('\n- ') : ''}
REGLAS:
1. Las 2 primeras frases responden la intención directamente (sin introducciones de relleno).
2. La extensión la decide el tema (normalmente 700–1400 palabras); no estires.
3. Cada cifra, ley o requisito con su fuente oficial al lado (enlace Markdown).
4. Pasos concretos, errores comunes y un ejemplo realista de ${PAIS(w)}.
5. Si toca dinero, leyes o salud: aclara que es información general y cuándo consultar a un profesional o entidad oficial.
6. Español neutro de ${PAIS(w)} (tuteo, SIN voseo). Prohibido: «en el mundo actual», «es importante destacar», «en conclusión», «guía definitiva».
7. Fechas reales: no digas «actualizado a ${new Date().getFullYear()}» si la fuente es anterior.
8. Usa ## y ### para secciones, listas y tablas Markdown. NO pongas el título H1 (lo agrega la plantilla).
9. Termina con una sección «## Qué hacer ahora» con 3 acciones concretas.
Devuelve SOLO JSON: {"titulo":"título SEO natural (máx. 60 caracteres)","descripcion":"meta descripción (máx. 155 caracteres)","imagen":"descripción EN INGLÉS de una ilustración editorial para encabezar la página (escena concreta, sin texto ni letras)","cuerpo":"Markdown completo","faq":[{"p":"pregunta real","r":"respuesta breve"}],"fuentes":[{"texto":"…","url":"https://…"}],"faltan":["datos que faltan verificar"]}` }];

const revisarP = (w, p, r) => [{ role: 'user', content: `Eres el revisor de calidad de un sitio que quiere ser aprobado en Google AdSense («${w.nombre}», ${w.nicho}, ${PAIS(w)}).
Intención que debe resolver: «${p.intencion}». Bloque único exigido: ${p.bloque || 'algo práctico propio'}.
PÁGINA:
# ${r.titulo}
${String(r.cuerpo || '').slice(0, 14000)}
FUENTES: ${(r.fuentes || []).map(f => f.url).join(', ') || 'ninguna'}
Califica de 1 a 10 considerando: utilidad real para esa intención, datos verificables con fuente, presencia real del bloque único, claridad, naturalidad (sin keyword forzada ni relleno), voseo o errores, y riesgo de información falsa o inventada.
Nota menor a 8 si: inventa cifras/leyes, no tiene bloque único real, es genérico (lo dice cualquier sitio), tiene relleno o voseo.
Devuelve SOLO JSON: {"nota":7,"problemas":["…"],"arreglos":["instrucción concreta"]}` }];

const clienteP = w => [{ role: 'user', content: `Eres un redactor publicitario y diseñador web para pequeños negocios de ${PAIS(w)}.
Negocio: ${w.cliente.negocio}. Rubro: ${w.cliente.rubro}. Ciudad: ${w.cliente.ciudad || PAIS(w)}.
Servicios/productos: ${w.cliente.servicios || '(deduce los típicos del rubro)'}. Público: ${w.publico || 'clientes de la zona'}.
Diferencial: ${w.cliente.diferencial || '(no indicado: no inventes premios ni años de experiencia)'}.
Escribe los textos de su página web profesional: cercanos, claros, persuasivos y honestos (sin inventar cifras, premios, clientes ni testimonios).
Devuelve SOLO JSON: {"titulo_seo":"máx 60 caracteres con rubro y ciudad","descripcion":"máx 155","hero_titulo":"…","hero_sub":"…","cta":"texto del botón principal","servicios":[{"t":"…","d":"1-2 frases","icono":"un emoji"}],"sobre":"2 párrafos sobre el negocio","por_que":[{"t":"…","d":"…"}],"pasos":[{"t":"…","d":"…"}],"faq":[{"p":"…","r":"…"}]}` }];

// ---------------- Acciones de IA ----------------
async function planificar(w, n = 20) {
  log(w, `Planificando ${n} páginas sin repetir intenciones`);
  const ya = (w.paginas || []).map(p => p.titulo);
  const r = await ai().ask(planP(w, n, ya), { json: true, max: 6000, preferir: ['gemini'] }), j = parseJSON(r.text);
  if (!(w.categorias || []).length) w.categorias = (j.categorias || []).slice(0, 7).map(c => ({ nombre: String(c.nombre).trim().slice(0, 40), slug: slug(c.nombre), desc: String(c.desc || '').slice(0, 200) }));
  let nuevas = 0;
  for (const p of j.paginas || []) {
    if (!p.titulo || !p.intencion) continue;
    const delNicho = new Set(norm(w.nicho + ' ' + w.nombre).map(x => x.slice(0, 6)));
    if ((w.paginas || []).some(x => parecido(x.titulo + ' ' + x.intencion, p.titulo + ' ' + p.intencion, delNicho) >= 0.5)) continue; // anti-canibalización
    const cat = w.categorias.find(c => slug(c.nombre) === slug(p.categoria)) || w.categorias[0];
    w.paginas.push({ id: uid().slice(0, 10), titulo: String(p.titulo).slice(0, 90), intencion: String(p.intencion).slice(0, 240), keyword: String(p.keyword || '').slice(0, 90), categoria: cat?.slug || '', bloque: String(p.bloque || '').slice(0, 200), fuentes_sugeridas: (p.fuentes_sugeridas || []).slice(0, 4).map(String), estado: 'idea', creada: hoy() });
    nuevas++;
  }
  log(w, `${nuevas} ideas nuevas (${(j.paginas || []).length - nuevas} descartadas por parecerse a otras)`); guardar(); return nuevas;
}

async function redactar(w, p) {
  p.estado = 'escribiendo'; guardar(); log(w, 'Redactando «' + p.titulo + '»');
  let arreglos = null, mejor = null;
  try {
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      const r = await ai().ask(escribirP(w, p, arreglos), { json: true, max: 9000, preferir: ['gemini'] }), j = parseJSON(r.text);
      if (!j.cuerpo || String(j.cuerpo).split(/\s+/).length < 250) throw new Error('La IA devolvió un texto demasiado corto');
      j.cuerpo = String(j.cuerpo).replace(/^#\s.*\n/, '');
      const rv = parseJSON((await ai().ask(revisarP(w, p, j), { json: true, max: 2500, evitar: r.provider })).text);
      const nota = Math.round(+rv.nota || 0);
      if (!mejor || nota > mejor.nota) mejor = { ...j, nota, problemas: (rv.problemas || []).slice(0, 8), motor: r.provider };
      log(w, `«${p.titulo}»: nota del revisor ${nota}/10${nota < 8 ? ' → corrigiendo' : ''}`);
      if (nota >= 8) break;
      arreglos = (rv.arreglos || rv.problemas || []).slice(0, 8);
    }
    Object.assign(p, { imgPrompt: String(mejor.imagen || '').slice(0, 300), tituloSeo: String(mejor.titulo || p.titulo).slice(0, 70), desc: String(mejor.descripcion || '').slice(0, 160), cuerpo: mejor.cuerpo, faq: (mejor.faq || []).slice(0, 6), fuentes: (mejor.fuentes || []).filter(f => /^https?:\/\//.test(f.url || '')).slice(0, 12), faltan: (mejor.faltan || []).slice(0, 8), nota: mejor.nota, problemas: mejor.problemas, estado: 'revisar', escrita: hoy() });
    // Voseo: se avisa (no se publica algo con «podés», «tenés»…)
    await imagenPagina(w, p).catch(e => log(w, 'Sin imagen para «' + p.titulo + '»: ' + e.message.slice(0, 100)));
    const vos = (p.cuerpo.match(/\b(podés|tenés|querés|sabés|hacés|escribinos|contanos|fijate|mirá|acá)\b/gi) || []);
    if (vos.length) p.problemas = [...(p.problemas || []), 'Tiene voseo: ' + [...new Set(vos)].join(', ')];
  } catch (e) { p.estado = 'error'; p.error = e.message.slice(0, 200); log(w, 'Error en «' + p.titulo + '»: ' + p.error); }
  guardar();
}

// Fecha de publicación: ritmo natural (máx. N por semana, nunca dos el mismo día)
function siguienteFecha(w) {
  const usadas = new Set(w.paginas.filter(p => p.fecha_pub).map(p => p.fecha_pub)), porSemana = Math.max(1, Math.min(7, +w.ritmo || 4));
  const d = new Date(); d.setHours(12);
  for (let k = 0; k < 400; k++) {
    const f = d.toISOString().slice(0, 10), ini = new Date(d); ini.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const semana = [...usadas].filter(x => { const t = new Date(x + 'T12:00:00'); return t >= ini && (t - ini) < 7 * 864e5; }).length;
    if (!usadas.has(f) && semana < porSemana) return f;
    d.setDate(d.getDate() + 1);
  }
  return hoy();
}

// ---------------- Logo e imágenes (Cloudflare FLUX gratis; si no hay cupo, el sitio sale igual) ----------------
const ASSETS = w => path.join(DIR, w.id, 'assets');
const imgs = () => require('./imagenes');
async function aWebp(src, dst, ancho) { try { await run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-vf', `scale=${ancho}:-2`, '-c:v', 'libwebp', '-quality', '78', dst]); return dst; } catch (e) { const j = dst.replace(/\.webp$/, '.jpg'); await run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-vf', `scale=${ancho}:-2`, '-q:v', '4', j]); return j; } }
async function logo(w) {
  if (!imgs().ready() || imgs().cupo().quedanAprox < 1) { log(w, 'Logo: sin cupo de imágenes hoy; uso el monograma (se intentará mañana)'); return; }
  fs.mkdirSync(ASSETS(w), { recursive: true }); const tmp = path.join(ASSETS(w), 'logo_ia.png');
  await imgs().generar({ prompt: `${w.logoIdea || w.nicho} icon, minimalist flat vector logo mark, simple bold geometric shapes, solid ${w.color} and white colors, centered on plain white background, no text, no letters, no words`, out: tmp, formato: 'cuadrado', log: m => {} });
  await run('ffmpeg', ['-y', '-v', 'error', '-i', tmp, '-vf', 'scale=256:256', path.join(ASSETS(w), 'logo.png')]); fs.rmSync(tmp, { force: true });
  w.logo = true; log(w, 'Logo creado ✅'); guardar();
}
async function imagenPagina(w, p) {
  if (!p.imgPrompt || !imgs().ready() || imgs().cupo().quedanAprox < 1) return;
  fs.mkdirSync(path.join(ASSETS(w), 'img'), { recursive: true }); const tmp = path.join(ASSETS(w), 'img', p.id + '_ia.png');
  await imgs().generar({ prompt: `${p.imgPrompt}, editorial illustration, modern clean style, soft natural light, accent color ${w.color}, no text, no letters, no watermark`, out: tmp, formato: 'horizontal', log: m => {} });
  const f = await aWebp(tmp, path.join(ASSETS(w), 'img', p.id + '.webp'), 1200); fs.rmSync(tmp, { force: true });
  p.img = 'img/' + path.basename(f); guardar();
}
async function identidad(w) {
  log(w, '✨ Creando la identidad del sitio (nombre, público, misión, color y categorías)');
  const j = parseJSON((await ai().ask(identidadP(w.nicho, w.dominio, PAIS(w)), { json: true, max: 2500, preferir: ['gemini'] })).text);
  if (!w.nombreFijo && j.nombre) w.nombre = String(j.nombre).slice(0, 60);
  for (const k of ['publico', 'lema', 'mision']) if (!w[k] && j[k]) w[k] = String(j[k]).slice(0, 300);
  if (/^#[0-9a-f]{6}$/i.test(j.color || '') && !w.colorFijo) w.color = j.color; w.logoIdea = String(j.logo || '').slice(0, 200);
  if (!(w.categorias || []).length) w.categorias = (j.categorias || []).slice(0, 6).map(c => ({ nombre: String(c.nombre).trim().slice(0, 40), slug: slug(c.nombre), desc: String(c.desc || '').slice(0, 200) }));
  guardar();
}
// ✨ Magia: con solo temática + dominio hace todo: identidad, logo, plan, primeras páginas con imagen y el sitio armado
async function magia(w) {
  await identidad(w);
  await logo(w).catch(e => log(w, 'Logo: ' + e.message.slice(0, 120)));
  await planificar(w, 24);
  for (const p of w.paginas.filter(x => x.estado === 'idea').slice(0, +w.primeras || 6)) await redactar(w, p);
  construir(w); log(w, '✨ Listo: revisa las páginas «por revisar» y apruébalas (o usa «Aprobar las de nota 9+»)');
}

async function textosCliente(w) {
  log(w, 'Escribiendo los textos de la web del negocio');
  const r = await ai().ask(clienteP(w), { json: true, max: 5000, preferir: ['gemini'] });
  w.textos = parseJSON(r.text); w.textos.hecho = hoy(); guardar();
}

// ---------------- Construcción del sitio (HTML estático, rápido y con SEO completo) ----------------
const CSS = c => `:root{--c:${c};--t:#1f2937;--s:#6b7280;--f:#f8fafc;--b:#e5e7eb}*{box-sizing:border-box}body{margin:0;font:17px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--t);background:#fff}a{color:var(--c)}img{max-width:100%;height:auto}
.w{max-width:1100px;margin:0 auto;padding:0 18px}.tx{max-width:760px;margin:0 auto;padding:0 18px}header{border-bottom:1px solid var(--b);background:#fff;position:sticky;top:0;z-index:5}
header .w{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:62px;flex-wrap:wrap}.logo{font-weight:800;font-size:1.25rem;color:var(--t);text-decoration:none}.logo span{color:var(--c)}
nav a{color:var(--t);text-decoration:none;margin-left:16px;font-size:.95rem;white-space:nowrap}nav a:hover{color:var(--c)}.migas{font-size:.85rem;color:var(--s);margin:18px 0 6px}.migas a{color:var(--s)}
h1{font-size:2rem;line-height:1.25;margin:.3em 0 .4em}h2{font-size:1.45rem;margin:1.6em 0 .5em;line-height:1.3}h3{font-size:1.15rem;margin:1.3em 0 .4em}.meta{color:var(--s);font-size:.9rem;margin-bottom:1.2em}
.tabla{overflow-x:auto}table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.95rem}th,td{border:1px solid var(--b);padding:8px 10px;text-align:left}th{background:var(--f)}
blockquote{border-left:4px solid var(--c);margin:1em 0;padding:.4em 1em;background:var(--f)}.caja{border:1px solid var(--b);border-radius:12px;padding:16px 18px;margin:1.4em 0;background:var(--f)}
.tarjetas{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin:16px 0 30px}.tarjeta{border:1px solid var(--b);border-radius:12px;padding:16px;text-decoration:none;color:var(--t);display:block;background:#fff}.tarjeta:hover{border-color:var(--c)}.tarjeta b{display:block;margin-bottom:4px}.tarjeta small{color:var(--s)}
.hero{background:linear-gradient(135deg,var(--c),#111827);color:#fff;padding:56px 0}.hero h1{color:#fff;font-size:2.3rem}.hero p{font-size:1.15rem;opacity:.92;max-width:700px}.btn{display:inline-block;background:var(--c);color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700}.hero .btn{background:#fff;color:var(--c)}
footer{border-top:1px solid var(--b);margin-top:50px;padding:26px 0;color:var(--s);font-size:.9rem;background:var(--f)}footer a{color:var(--s);margin-right:14px}.wa{position:fixed;right:18px;bottom:18px;background:#16a34a;color:#fff;border-radius:999px;padding:12px 18px;font-weight:700;text-decoration:none;box-shadow:0 6px 20px #0003}
.faq details{border:1px solid var(--b);border-radius:10px;padding:10px 14px;margin:8px 0}.faq summary{cursor:pointer;font-weight:600}@media(max-width:640px){h1{font-size:1.6rem}.hero h1{font-size:1.8rem}nav a{margin:0 12px 0 0}}`;

function pagina(w, { titulo, desc, ruta, cuerpo, ld = [], migas = [], robots = 'index,follow', og = 'website', img = null }) {
  const base = 'https://' + (w.dominio || 'ejemplo.com'), url = base + ruta;
  const cats = w.tipo === 'adsense' ? (w.categorias || []).filter(c => w.paginas.some(p => p.categoria === c.slug && publicada(p))) : [];
  const navAds = cats.slice(0, 6).map(c => `<a href="/${c.slug}/">${esc(c.nombre)}</a>`).join('') + '<a href="/sobre-nosotros/">Nosotros</a>';
  const navCli = '<a href="/#servicios">Servicios</a><a href="/#nosotros">Nosotros</a><a href="/#contacto">Contacto</a>';
  const ldMig = migas.length ? [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ n: 'Inicio', u: '/' }, ...migas].map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.n, item: base + m.u })) }] : [];
  const nombreLogo = (w.logo ? `<img src="/logo.png" alt="" width="34" height="34" style="vertical-align:middle;border-radius:8px;margin-right:8px">` : '') + esc(w.nombre).replace(/^(\S+)/, '<span>$1</span>');
  return `<!doctype html><html lang="es-${w.pais === 'México' ? 'MX' : w.pais === 'Colombia' ? 'CO' : w.pais === 'Argentina' ? 'AR' : w.pais === 'Chile' ? 'CL' : w.pais === 'España' ? 'ES' : 'PE'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}"><meta name="robots" content="${robots}">
<meta property="og:type" content="${og}"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:site_name" content="${esc(w.nombre)}"><meta property="og:locale" content="es_${(w.pais || 'Perú').slice(0, 2).toUpperCase() === 'PE' ? 'PE' : 'LA'}">
${w.adsenseId ? `<meta name="google-adsense-account" content="${esc(w.adsenseId)}">` : ''}${w.gsc ? `<meta name="google-site-verification" content="${esc(w.gsc)}">` : ''}
${w.logo ? '<link rel="icon" href="/logo.png">' : ''}${img ? `<meta property="og:image" content="${base}/${img}">` : ''}
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='${encodeURIComponent(w.color || '#2563eb')}'/><text x='50' y='68' font-size='58' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'>${esc((w.nombre || 'W')[0].toUpperCase())}</text></svg>">
<style>${CSS(w.color || '#2563eb')}</style>
${[...ldMig, ...ld].map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n')}
${w.adsenseId && w.anuncios ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(w.adsenseId)}" crossorigin="anonymous"></script>` : ''}
</head><body><header><div class="w"><a class="logo" href="/">${nombreLogo}</a><nav>${w.tipo === 'adsense' ? navAds : navCli}</nav></div></header>
<main>${cuerpo}</main>
<footer><div class="w"><p>${w.tipo === 'adsense' ? `<a href="/sobre-nosotros/">Sobre nosotros</a><a href="/contacto/">Contacto</a><a href="/politica-editorial/">Política editorial</a><a href="/privacidad/">Privacidad</a><a href="/terminos/">Términos</a>` : `<a href="/privacidad/">Privacidad</a>`}</p>
<p>© ${new Date().getFullYear()} ${esc(w.nombre)}${w.tipo === 'adsense' ? ` · Un proyecto de ${esc(w.editor?.nombre || w.responsable || w.nombre)}${w.ciudad ? ' · ' + esc(w.ciudad) + ', ' + esc(PAIS(w)) : ''}` : w.cliente?.direccion ? ' · ' + esc(w.cliente.direccion) : ''}</p></div></footer>
${w.tipo === 'cliente' && w.cliente?.whatsapp ? `<a class="wa" href="https://wa.me/${String(w.cliente.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent('Hola, vi su página web y quiero información')}" rel="noopener">💬 WhatsApp</a>` : ''}
</body></html>`;
}
const publicada = p => ['aprobada', 'publicada'].includes(p.estado) && p.fecha_pub && p.fecha_pub <= hoy();
const fechaLarga = f => { try { return new Date(f + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return f; } };

function legales(w) {
  const correo = w.correo ? `<a href="mailto:${esc(w.correo)}">${esc(w.correo)}</a>` : '<b>[FALTA CORREO]</b>', resp = esc(w.responsable || '[FALTA RESPONSABLE]');
  return {
    'sobre-nosotros': ['Sobre nosotros', `Quiénes hacemos ${w.nombre} y cómo trabajamos.`, `<h2>Quiénes somos</h2><p><b>${esc(w.nombre)}</b> es un sitio de ${esc(w.nicho)} para ${esc(w.publico || 'personas de ' + PAIS(w))}. Es un proyecto editorial de <b>${esc(w.editor?.nombre || w.nombre)}</b>, dirigido por <b>${resp}</b>${w.ciudad ? ' desde ' + esc(w.ciudad) + ', ' + esc(PAIS(w)) : ''}.</p>
<h2>Qué encontrarás aquí</h2><p>${esc(w.mision || 'Guías prácticas, herramientas y datos verificados para resolver dudas concretas, explicados en lenguaje claro.')}</p>
<h2>Cómo trabajamos</h2><ul><li>Cada dato importante (leyes, montos, requisitos) lleva su fuente oficial al lado.</li><li>Usamos herramientas de inteligencia artificial para investigar y redactar borradores; <b>una persona del equipo revisa y aprueba cada página</b> antes de publicarla.</li><li>Actualizamos las páginas cuando cambia una norma o un dato, y lo indicamos con la fecha de actualización.</li></ul>
<h2>Autor</h2><p><b>${esc(w.autor?.nombre || 'Equipo editorial de ' + w.nombre)}</b>. ${esc(w.autor?.bio || '')}</p><h2>Contacto</h2><p>Escríbenos a ${correo}. Leemos todos los mensajes.</p>`],
    contacto: ['Contacto', `Escríbenos para consultas, correcciones o propuestas.`, `<p>¿Tienes una consulta, encontraste un error o quieres proponer un tema? Escríbenos a ${correo}.</p><div class="caja"><b>Para correcciones</b>, incluye el enlace de la página y qué dato debemos revisar. Respondemos en unos días hábiles.</div><p>Responsable: ${resp}${w.ciudad ? ' · ' + esc(w.ciudad) + ', ' + esc(PAIS(w)) : ''}.</p>`],
    'politica-editorial': ['Política editorial', 'Cómo investigamos, verificamos y corregimos nuestro contenido.', `<h2>Fuentes</h2><p>Priorizamos fuentes oficiales (leyes, ministerios, organismos reguladores) y las enlazamos junto a cada dato.</p><h2>Uso de inteligencia artificial</h2><p>Usamos IA para investigar y redactar borradores. Ninguna página se publica sin la revisión y aprobación de una persona del equipo. La IA nunca firma como experto ni inventa experiencias.</p><h2>Correcciones</h2><p>Si detectas un error, escríbenos a ${correo}. Corregimos y actualizamos la fecha de la página.</p><h2>Independencia</h2><p>${esc(w.nombre)} es independiente: no tiene vínculo con organismos oficiales ni con las empresas que se mencionan, salvo que se indique. Los anuncios no influyen en el contenido.</p>`],
    privacidad: ['Política de privacidad', 'Qué datos se tratan en este sitio y cómo.', `<p>Última actualización: ${fechaLarga(hoy())}.</p><h2>Responsable</h2><p>${resp}${w.ciudad ? ', ' + esc(w.ciudad) + ', ' + esc(PAIS(w)) : ''}. Contacto: ${correo}.</p><h2>Datos que tratamos</h2><ul><li>Los que nos envías voluntariamente por correo.</li><li>Datos técnicos anónimos de navegación (tipo de dispositivo, páginas visitadas) para estadísticas.</li></ul><h2>Cookies y publicidad</h2><p>Este sitio puede mostrar anuncios de <b>Google AdSense</b>. Google y sus socios usan cookies para mostrar anuncios basados en tus visitas a este y otros sitios. Puedes desactivar la publicidad personalizada en <a href="https://adssettings.google.com" rel="noopener" target="_blank">Configuración de anuncios de Google</a>. Más información: <a href="https://policies.google.com/technologies/ads?hl=es" rel="noopener" target="_blank">cómo usa Google las cookies en publicidad</a>.</p><h2>Tus derechos</h2><p>Puedes pedir acceso, rectificación o eliminación de tus datos escribiendo a ${correo}${PAIS(w) === 'Perú' ? ' (Ley N.º 29733 de Protección de Datos Personales)' : ''}.</p>`],
    terminos: ['Términos de uso', 'Condiciones de uso del sitio.', `<p>El contenido de ${esc(w.nombre)} es informativo y general: no reemplaza el asesoramiento de un profesional para tu caso particular. Hacemos lo posible para que sea correcto y actual, pero las normas pueden cambiar; verifica siempre en la fuente oficial enlazada. Puedes citar nuestro contenido enlazando a la página original. Titular: ${resp}. Contacto: ${correo}.</p>`],
  };
}

function construir(w) {
  const out = path.join(DIR, w.id, 'dist'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  if (fs.existsSync(ASSETS(w))) fs.cpSync(ASSETS(w), out, { recursive: true, filter: f => !/_ia\.png$/.test(f) });
  const base = 'https://' + (w.dominio || 'ejemplo.com'), esc_ = esc, archivos = [], escribe = (ruta, html, prio = 0.6, fecha = hoy()) => {
    const f = path.join(out, ruta, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); archivos.push({ ruta, prio, fecha }); };
  const org = { '@context': 'https://schema.org', '@type': w.tipo === 'cliente' ? 'LocalBusiness' : 'Organization', name: w.nombre, url: base + '/', ...(w.correo ? { email: w.correo } : {}), ...(w.logo ? { logo: base + '/logo.png' } : {}) };
  if (w.tipo === 'cliente') {
    const T = w.textos || {}, C = w.cliente || {}; if (C.whatsapp) org.telephone = '+' + String(C.whatsapp).replace(/\D/g, ''); if (C.direccion) org.address = { '@type': 'PostalAddress', streetAddress: C.direccion, addressLocality: C.ciudad || '', addressCountry: PAIS(w) }; if (C.horario) org.openingHours = C.horario;
    const wa = C.whatsapp ? `https://wa.me/${String(C.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent('Hola, vi su página web y quiero información')}` : '#contacto';
    const cuerpo = `<section class="hero"><div class="w"><h1>${esc(T.hero_titulo || w.nombre)}</h1><p>${esc(T.hero_sub || '')}</p><a class="btn" href="${wa}" rel="noopener">${esc(T.cta || 'Escríbenos por WhatsApp')}</a></div></section>
<div class="w"><h2 id="servicios">Servicios</h2><div class="tarjetas">${(T.servicios || []).map(s => `<div class="tarjeta"><b>${esc(s.icono || '✅')} ${esc(s.t)}</b><small>${esc(s.d)}</small></div>`).join('')}</div>
${(T.por_que || []).length ? `<h2>¿Por qué elegirnos?</h2><div class="tarjetas">${T.por_que.map(s => `<div class="tarjeta"><b>${esc(s.t)}</b><small>${esc(s.d)}</small></div>`).join('')}</div>` : ''}
${(T.pasos || []).length ? `<h2>Cómo trabajamos</h2><ol>${T.pasos.map(s => `<li><b>${esc(s.t)}:</b> ${esc(s.d)}</li>`).join('')}</ol>` : ''}
<h2 id="nosotros">Sobre ${esc(C.negocio || w.nombre)}</h2>${String(T.sobre || '').split(/\n+/).map(x => `<p>${esc(x)}</p>`).join('')}
${(T.faq || []).length ? `<h2>Preguntas frecuentes</h2><div class="faq">${T.faq.map(f => `<details><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('')}</div>` : ''}
<h2 id="contacto">Contacto</h2><div class="caja">${C.whatsapp ? `<p>📱 WhatsApp: <a href="${wa}" rel="noopener">+${esc(String(C.whatsapp).replace(/\D/g, ''))}</a></p>` : ''}${w.correo ? `<p>✉️ <a href="mailto:${esc(w.correo)}">${esc(w.correo)}</a></p>` : ''}${C.direccion ? `<p>📍 ${esc(C.direccion)}${C.ciudad ? ', ' + esc(C.ciudad) : ''} · <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(C.direccion + ' ' + (C.ciudad || ''))}" rel="noopener" target="_blank">Ver en el mapa</a></p>` : ''}${C.horario ? `<p>🕒 ${esc(C.horario)}</p>` : ''}</div></div>`;
    const faqLd = (T.faq || []).length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: T.faq.map(f => ({ '@type': 'Question', name: f.p, acceptedAnswer: { '@type': 'Answer', text: f.r } })) }] : [];
    escribe('', pagina(w, { titulo: T.titulo_seo || w.nombre, desc: T.descripcion || '', ruta: '/', cuerpo, ld: [org, ...faqLd] }), 1);
    const L = legales(w); escribe('privacidad', pagina(w, { titulo: 'Privacidad · ' + w.nombre, desc: 'Política de privacidad', ruta: '/privacidad/', cuerpo: `<div class="tx"><h1>Política de privacidad</h1>${L.privacidad[2]}</div>`, robots: 'noindex,follow' }), 0.1);
  } else {
    const pubs = w.paginas.filter(publicada).sort((a, b) => b.fecha_pub.localeCompare(a.fecha_pub)), cats = (w.categorias || []).filter(c => pubs.some(p => p.categoria === c.slug));
    const tarjeta = p => `<a class="tarjeta" href="/${p.slug}/">${p.img ? `<img src="/${p.img}" alt="" width="400" height="225" loading="lazy" style="border-radius:8px;margin-bottom:8px;aspect-ratio:16/9;object-fit:cover">` : ''}<b>${esc(p.tituloSeo || p.titulo)}</b><small>${esc(p.desc || '')}</small></a>`;
    // portada
    const inicio = `<section class="hero"><div class="w"><h1>${esc(w.nombre)}</h1><p>${esc(w.mision || `${w.nicho} explicado claro, con datos oficiales y herramientas prácticas para ${w.publico || 'ti'}.`)}</p></div></section><div class="w">
${pubs.length ? `<h2>Lo más reciente</h2><div class="tarjetas">${pubs.slice(0, 6).map(tarjeta).join('')}</div>` : '<p>Muy pronto publicaremos nuestras primeras guías.</p>'}
${cats.map(c => `<h2><a href="/${c.slug}/" style="color:inherit;text-decoration:none">${esc(c.nombre)}</a></h2><p>${esc(c.desc || '')}</p><div class="tarjetas">${pubs.filter(p => p.categoria === c.slug).slice(0, 3).map(tarjeta).join('')}</div>`).join('')}
<div class="caja"><b>Cómo trabajamos:</b> cada página la investiga y revisa nuestro equipo con fuentes oficiales. <a href="/politica-editorial/">Lee nuestra política editorial</a>.</div></div>`;
    const ultima = pubs.map(p => p.fecha_act || p.fecha_pub).sort().pop() || w.creado || hoy(), ultimaDe = slugC => pubs.filter(p => p.categoria === slugC).map(p => p.fecha_act || p.fecha_pub).sort().pop() || ultima;
    escribe('', pagina(w, { titulo: `${w.nombre}: ${w.lema || w.nicho}`.slice(0, 65), desc: (w.mision || `${w.nicho} para ${w.publico || PAIS(w)}: guías claras con datos oficiales.`).slice(0, 155), ruta: '/', cuerpo: inicio, ld: [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: w.nombre, url: base + '/', inLanguage: 'es' }] }), 1, ultima);
    // categorías
    for (const c of cats) { const ps = pubs.filter(p => p.categoria === c.slug);
      escribe(c.slug, pagina(w, { titulo: `${c.nombre} · ${w.nombre}`, desc: (c.desc || `Guías de ${c.nombre}`).slice(0, 155), ruta: `/${c.slug}/`, migas: [{ n: c.nombre, u: `/${c.slug}/` }], cuerpo: `<div class="w"><p class="migas"><a href="/">Inicio</a> › ${esc(c.nombre)}</p><h1>${esc(c.nombre)}</h1><p>${esc(c.desc || '')}</p><div class="tarjetas">${ps.map(tarjeta).join('')}</div></div>` }), 0.7, ultimaDe(c.slug)); }
    // artículos
    const autorLd = { '@type': w.autor?.tipo === 'persona' ? 'Person' : 'Organization', name: w.autor?.nombre || 'Equipo editorial de ' + w.nombre, url: base + '/sobre-nosotros/' };
    for (const p of pubs) {
      const c = (w.categorias || []).find(x => x.slug === p.categoria), rel = pubs.filter(x => x !== p && x.categoria === p.categoria).slice(0, 4);
      const fuentes = (p.fuentes || []).length ? `<div class="caja"><b>Fuentes consultadas</b><ul>${p.fuentes.map(f => `<li><a href="${esc(f.url)}" rel="noopener" target="_blank">${esc(f.texto || f.url)}</a></li>`).join('')}</ul></div>` : '';
      const faq = (p.faq || []).length ? `<h2>Preguntas frecuentes</h2><div class="faq">${p.faq.map(f => `<details><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('')}</div>` : '';
      const act = p.fecha_act && p.fecha_act > p.fecha_pub ? ` · Actualizado el ${fechaLarga(p.fecha_act)}` : '';
      const cuerpo = `<article class="tx"><p class="migas"><a href="/">Inicio</a>${c ? ` › <a href="/${c.slug}/">${esc(c.nombre)}</a>` : ''}</p><h1>${esc(p.tituloSeo || p.titulo)}</h1>
<p class="meta">Por <a href="/sobre-nosotros/">${esc(autorLd.name)}</a> · Publicado el ${fechaLarga(p.fecha_pub)}${act}</p>${p.img ? `<img src="/${p.img}" alt="${esc(p.tituloSeo || p.titulo)}" width="1200" height="675" style="border-radius:12px;margin:0 0 1em">` : ''}${md(p.cuerpo)}${faq}${fuentes}
<div class="caja"><small>Información general revisada por nuestro equipo. No reemplaza la asesoría de un profesional para tu caso. ¿Viste un error? <a href="/contacto/">Avísanos</a>.</small></div>
${rel.length ? `<h2>También te puede servir</h2><div class="tarjetas">${rel.map(tarjeta).join('')}</div>` : ''}</article>`;
      const ld = [{ '@context': 'https://schema.org', '@type': 'Article', headline: p.tituloSeo || p.titulo, description: p.desc, datePublished: p.fecha_pub, dateModified: p.fecha_act || p.fecha_pub, author: autorLd, publisher: { '@type': 'Organization', name: w.editor?.nombre || w.nombre, ...(w.editor?.url ? { url: w.editor.url } : {}) }, mainEntityOfPage: base + `/${p.slug}/`, inLanguage: 'es', ...(p.img ? { image: base + '/' + p.img } : {}) }];
      if ((p.faq || []).length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.p, acceptedAnswer: { '@type': 'Answer', text: f.r } })) });
      escribe(p.slug, pagina(w, { titulo: p.tituloSeo || p.titulo, desc: p.desc || '', ruta: `/${p.slug}/`, cuerpo, ld, og: 'article', img: p.img, migas: c ? [{ n: c.nombre, u: `/${c.slug}/` }, { n: p.tituloSeo || p.titulo, u: `/${p.slug}/` }] : [] }), 0.8, p.fecha_act || p.fecha_pub);
      if (p.estado === 'aprobada') p.estado = 'publicada';
    }
    for (const [k, [t, d, h]] of Object.entries(legales(w))) escribe(k, pagina(w, { titulo: `${t} · ${w.nombre}`, desc: d, ruta: `/${k}/`, cuerpo: `<div class="tx"><h1>${esc(t)}</h1>${h}</div>`, robots: ['privacidad', 'terminos'].includes(k) ? 'noindex,follow' : 'index,follow' }), 0.3, w.creado || hoy());
  }
  fs.writeFileSync(path.join(out, '404.html'), pagina(w, { titulo: 'Página no encontrada · ' + w.nombre, desc: '', ruta: '/404', cuerpo: '<div class="tx"><h1>No encontramos esa página</h1><p><a href="/">Volver al inicio</a></p></div>', robots: 'noindex' }));
  fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${archivos.filter(a => !/^(privacidad|terminos)$/.test(a.ruta)).map(a => `<url><loc>${base}/${a.ruta ? a.ruta + '/' : ''}</loc><lastmod>${a.fecha}</lastmod><priority>${a.prio}</priority></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
  if (w.adsenseId) fs.writeFileSync(path.join(out, 'ads.txt'), `google.com, ${w.adsenseId.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
  if (w.indexnow) fs.writeFileSync(path.join(out, w.indexnow + '.txt'), w.indexnow);
  w.construido = new Date().toISOString(); guardar();
  return { paginas: archivos.length, carpeta: out };
}

// ---------------- Revisión de requisitos de AdSense ----------------
function chequeo(w) {
  const pubs = w.paginas?.filter(publicada) || [], L = [];
  const ok = (c, t, consejo) => L.push({ ok: !!c, t, consejo });
  if (w.tipo === 'cliente') { ok(w.textos, 'Textos de la web escritos', 'Pulsa «Escribir textos»'); ok(w.cliente?.whatsapp || w.correo, 'Forma de contacto (WhatsApp o correo)', 'Agrega el WhatsApp del negocio'); ok(w.dominio, 'Dominio', 'Compra el dominio del cliente'); return L; }
  ok(w.dominio && !/ejemplo/.test(w.dominio), 'Dominio propio', 'Escribe el dominio comprado');
  ok(/@/.test(w.correo || ''), 'Correo de contacto real', 'Sin correo AdSense suele rechazar');
  ok((w.responsable || '').trim().length > 3, 'Persona o empresa responsable', 'Pon tu nombre real (va en Sobre nosotros)');
  ok((w.autor?.nombre || '').length > 3, 'Autor (persona real o equipo editorial)', 'Configura el autor');
  ok(pubs.length >= 20, `20+ páginas publicadas de calidad (tienes ${pubs.length})`, 'Sigue aprobando páginas; mejor 25 buenas que 300 flojas');
  ok(pubs.every(p => (p.nota || 0) >= 8), 'Todas las publicadas con nota 8+ del revisor', 'Revisa o reescribe las de nota baja');
  ok(!pubs.some(p => (p.problemas || []).some(x => /voseo/i.test(x))), 'Sin voseo', 'Corrige las páginas marcadas');
  ok(new Set(pubs.map(p => p.fecha_pub)).size === pubs.length, 'Fechas distintas (ritmo natural)', 'No publiques muchas el mismo día');
  ok(!pubs.some(p => /\[FALTA DATO/i.test(p.cuerpo || '')), 'Sin datos pendientes [FALTA DATO]', 'Completa los datos marcados antes de publicar');
  const dias = pubs.length ? Math.round((Date.now() - new Date(pubs.map(p => p.fecha_pub).sort()[0] + 'T12:00:00')) / 864e5) : 0;
  ok(dias >= 21, `Sitio con historia (${dias} días desde la primera publicación; ideal 3+ semanas)`, 'Espera unas semanas publicando antes de pedir AdSense');
  ok(w.gsc, 'Verificado en Google Search Console', 'Pega el código de verificación de Search Console');
  return L;
}

// ---------------- Exportar / publicar ----------------
async function zip(w) {
  const d = path.join(DIR, w.id, 'dist'); if (!fs.existsSync(d)) construir(w);
  const z = path.join(DIR, w.id, slug(w.dominio || w.nombre) + '.zip'); fs.rmSync(z, { force: true });
  if (process.platform === 'win32') await run('tar', ['-a', '-c', '-f', z, '-C', d, '.']); else await run('zip', ['-r', '-q', z, '.'], { cwd: d });
  return '/webs-zip/' + w.id + '/' + path.basename(z);
}
async function publicarCF(w) {
  const tok = E.CF_PAGES_TOKEN || E.CF_API_TOKEN, acc = E.CF_ACCOUNT_ID; if (!tok || !acc) throw new Error('Falta la cuenta de Cloudflare: en Ajustes → Claves pega «Cloudflare: Account ID» y un token con permiso «Cloudflare Pages: Edit»');
  construir(w); const d = path.join(DIR, w.id, 'dist'), proyecto = slug(w.dominio || w.nombre).slice(0, 50), env = { ...process.env, CLOUDFLARE_API_TOKEN: tok, CLOUDFLARE_ACCOUNT_ID: acc, WRANGLER_SEND_METRICS: 'false' };
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  log(w, 'Publicando en Cloudflare Pages (proyecto ' + proyecto + ')…');
  await run(npx, ['--yes', 'wrangler@3', 'pages', 'project', 'create', proyecto, '--production-branch', 'main'], { env, shell: process.platform === 'win32' }).catch(() => {}); // si ya existe, sigue
  const o = await run(npx, ['--yes', 'wrangler@3', 'pages', 'deploy', d, '--project-name', proyecto, '--branch', 'main', '--commit-dirty=true'], { env, shell: process.platform === 'win32' });
  const url = (String(o).match(/https:\/\/[a-z0-9.-]+\.pages\.dev/) || [])[0] || `https://${proyecto}.pages.dev`;
  w.publicado = { url, fecha: new Date().toISOString(), proyecto }; log(w, 'Publicado ✅ ' + url); guardar();
  return w.publicado;
}

// ---------------- Trabajo diario automático ----------------
// Cada día: escribe hasta N borradores (quedan «por revisar») y reconstruye/publica lo que ya llegó a su fecha.
async function diario() {
  for (const w of W.filter(x => x.tipo === 'adsense' && x.auto)) {
    try {
      if (w.ultimoDiario === hoy()) continue; w.ultimoDiario = hoy(); guardar();
      const porRevisar = w.paginas.filter(p => p.estado === 'revisar').length;
      if (!w.logo) await logo(w).catch(() => {});
      for (const p of w.paginas.filter(p => p.cuerpo && !p.img && p.imgPrompt).slice(0, 3)) await imagenPagina(w, p).catch(() => {});
      if (w.paginas.filter(p => p.estado === 'idea').length < 3) await planificar(w, 12);
      for (const p of w.paginas.filter(p => p.estado === 'idea').slice(0, Math.max(0, Math.min(+w.porDia || 2, 6 - porRevisar)))) await redactar(w, p);
      if (w.paginas.some(p => p.estado === 'aprobada' && p.fecha_pub <= hoy())) { construir(w); if (w.autoPublicar && w.publicado) await publicarCF(w).catch(e => log(w, 'No se pudo publicar: ' + e.message.slice(0, 160))); }
    } catch (e) { log(w, 'Trabajo diario: ' + e.message.slice(0, 200)); }
  }
}
function iniciar() { setTimeout(diario, 60000); setInterval(diario, 30 * 60000); }

// ---------------- API ----------------
const resumen = w => ({ ...w, paginas: (w.paginas || []).map(p => ({ ...p, cuerpo: undefined, palabras: p.cuerpo ? p.cuerpo.split(/\s+/).length : 0 })), chequeo: chequeo(w), log: (w.log || []).slice(-15) });
function listar(tipo) { return { webs: W.filter(w => !tipo || w.tipo === tipo).map(resumen), trabajando: estado.trabajando, def: db.settings.websDef || {} }; }
const enCola = (w, fn, txt) => { if (estado.trabajando) throw new Error('Estoy ocupado con: ' + estado.trabajando + '. Espera un momento.'); estado.trabajando = txt; fn().catch(e => log(w, 'Error: ' + e.message.slice(0, 200))).finally(() => { estado.trabajando = null; }); };

async function accion(o) {
  const a = o.accion;
  if (a === 'crear') {
    const tipo = o.tipo === 'cliente' ? 'cliente' : 'adsense', nombre = String(o.nombre || '').trim().slice(0, 60); if (!nombre) throw new Error('Ponle un nombre a la web');
    const w = { id: uid().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10), tipo, nombre, dominio: String(o.dominio || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''), nicho: String(o.nicho || '').slice(0, 120), pais: o.pais || 'Perú', publico: String(o.publico || '').slice(0, 120), ciudad: String(o.ciudad || '').slice(0, 60), correo: String(o.correo || '').trim().slice(0, 80), responsable: String(o.responsable || '').slice(0, 80), color: /^#[0-9a-f]{6}$/i.test(o.color || '') ? o.color : '#2563eb', lema: String(o.lema || '').slice(0, 80), mision: String(o.mision || '').slice(0, 300), autor: { nombre: String(o.autor || 'Equipo editorial de Yupitok').slice(0, 80), tipo: o.autorTipo === 'persona' ? 'persona' : 'equipo', bio: String(o.autorBio || 'Investigamos cada tema en fuentes oficiales y revisamos cada página antes de publicarla.').slice(0, 400) }, editor: { nombre: String(o.editor || 'Yupitok').slice(0, 60), url: String(o.editorUrl || 'https://yupitok.com').slice(0, 120) }, ritmo: 4, porDia: 2, auto: false, categorias: [], paginas: [], creado: hoy(), log: [] };
    if (tipo === 'cliente') w.cliente = { negocio: nombre, rubro: String(o.rubro || '').slice(0, 80), servicios: String(o.servicios || '').slice(0, 600), whatsapp: String(o.whatsapp || '').replace(/[^\d+]/g, '').slice(0, 20), direccion: String(o.direccion || '').slice(0, 120), ciudad: String(o.ciudad || '').slice(0, 60), horario: String(o.horario || '').slice(0, 80), diferencial: String(o.diferencial || '').slice(0, 300) };
    W.push(w); guardar(); log(w, 'Web creada');
    if (tipo === 'adsense' && w.nicho) enCola(w, () => planificar(w, 20), 'planificar ' + w.nombre); else if (tipo === 'cliente') enCola(w, () => textosCliente(w), 'textos de ' + w.nombre);
    return { ok: 1, id: w.id };
  }
  if (a === 'magia') {
    const dominio = String(o.dominio || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''), nicho = String(o.nicho || '').trim().slice(0, 160);
    if (!nicho) throw new Error('Escribe la temática o nicho'); if (dominio && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dominio)) throw new Error('El dominio no es válido (ej: misitio.com)');
    const D = db.settings.websDef = { ...(db.settings.websDef || {}), ...(o.responsable ? { responsable: String(o.responsable).slice(0, 80) } : {}), ...(o.autor ? { autor: String(o.autor).slice(0, 80) } : {}), ...(o.ciudad ? { ciudad: String(o.ciudad).slice(0, 60) } : {}) }; require('./store').saveAll.settings();
    const base = dominio ? dominio.split('.')[0].replace(/-/g, ' ') : nicho; const w = { id: uid().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10), tipo: 'adsense', nombre: base.replace(/\b\w/g, c => c.toUpperCase()).slice(0, 60), dominio, nicho, pais: o.pais || 'Perú', publico: '', ciudad: String(o.ciudad || D.ciudad || '').slice(0, 60), correo: dominio ? 'contacto@' + dominio : '', responsable: D.responsable || '', color: '#2563eb', lema: '', mision: '', autor: { nombre: D.autor || 'Equipo editorial de Yupitok', tipo: 'equipo', bio: 'Investigamos cada tema en fuentes oficiales y revisamos cada página antes de publicarla.' }, editor: { nombre: 'Yupitok', url: 'https://yupitok.com' }, ritmo: 4, porDia: 2, auto: true, categorias: [], paginas: [], creado: hoy(), log: [], magia: true };
    W.push(w); guardar(); log(w, '✨ Web mágica creada: ' + nicho); enCola(w, () => magia(w), '✨ creando ' + (dominio || nicho)); return { ok: 1, id: w.id };
  }
  const w = web(o.id); if (!w) throw new Error('Web no encontrada');
  if (a === 'aprobarBuenas') { const min = Math.max(8, +o.min || 9); let n = 0; for (const p of w.paginas.filter(p => p.estado === 'revisar' && (p.nota || 0) >= min && !/\[FALTA DATO/i.test(p.cuerpo || '') && !(p.problemas || []).some(x => /voseo/i.test(x)))) { p.estado = 'aprobada'; p.slug = p.slug || (() => { let s2 = slug(p.tituloSeo || p.titulo), k = 2; while (w.paginas.some(x => x !== p && x.slug === s2)) s2 = slug(p.titulo) + '-' + k++; return s2; })(); p.fecha_pub = p.fecha_pub || siguienteFecha(w); n++; } guardar(); log(w, `Aprobadas ${n} páginas con nota ${min}+`); return { ...resumen(w), aprobadas: n }; }
  if (a === 'logo') { enCola(w, () => logo(w), 'logo de ' + w.nombre); return resumen(w); }
  const p = o.pid ? w.paginas.find(x => x.id === o.pid) : null;
  if (a === 'ajustes') { for (const k of ['nombre', 'dominio', 'nicho', 'pais', 'publico', 'ciudad', 'correo', 'responsable', 'color', 'lema', 'mision', 'adsenseId', 'gsc']) if (o[k] !== undefined) w[k] = String(o[k]).trim().slice(0, 300);
    for (const k of ['ritmo', 'porDia']) if (o[k] !== undefined) w[k] = Math.max(1, Math.min(7, +o[k] || 2)); for (const k of ['auto', 'autoPublicar', 'anuncios']) if (o[k] !== undefined) w[k] = !!o[k];
    if (o.autor !== undefined) w.autor = { ...w.autor, nombre: String(o.autor).slice(0, 80) }; if (o.autorBio !== undefined) w.autor = { ...w.autor, bio: String(o.autorBio).slice(0, 400) };
    if (w.cliente) for (const k of ['rubro', 'servicios', 'whatsapp', 'direccion', 'horario', 'diferencial']) if (o[k] !== undefined) w.cliente[k] = String(o[k]).slice(0, 600);
    if (w.adsenseId && !/^ca-pub-\d{10,20}$/.test(w.adsenseId)) w.adsenseId = ''; if (!w.indexnow) w.indexnow = crypto.randomBytes(16).toString('hex'); guardar(); return resumen(w); }
  if (a === 'planificar') { enCola(w, () => planificar(w, +o.n || 15), 'planificar ' + w.nombre); return resumen(w); }
  if (a === 'escribir') { const ps = p ? [p] : w.paginas.filter(x => x.estado === 'idea').slice(0, Math.min(5, +o.n || 3)); if (!ps.length) throw new Error('No hay ideas pendientes: pulsa «Más ideas»');
    enCola(w, async () => { for (const x of ps) await redactar(w, x); }, 'escribir ' + ps.length + ' página(s)'); return resumen(w); }
  if (a === 'textos') { enCola(w, () => textosCliente(w), 'textos de ' + w.nombre); return resumen(w); }
  if (a === 'ver') { if (!p) throw new Error('Página no encontrada'); return { pagina: p }; }
  if (a === 'editar') { if (!p) throw new Error('Página no encontrada'); for (const k of ['titulo', 'tituloSeo', 'desc', 'cuerpo', 'intencion', 'bloque', 'datos']) if (o[k] !== undefined) p[k] = String(o[k]).slice(0, 60000); if (p.estado === 'publicada' && o.cuerpo !== undefined) p.fecha_act = hoy(); guardar(); return resumen(w); }
  if (a === 'aprobar') { if (!p || !p.cuerpo) throw new Error('Esa página aún no está escrita'); if (/\[FALTA DATO/i.test(p.cuerpo) && !o.forzar) throw new Error('La página tiene datos marcados [FALTA DATO]: complétalos (Editar) antes de aprobarla.');
    p.estado = 'aprobada'; p.slug = p.slug || (() => { let s = slug(p.tituloSeo || p.titulo), k = 2; while (w.paginas.some(x => x !== p && x.slug === s)) s = slug(p.titulo) + '-' + k++; return s; })(); p.fecha_pub = p.fecha_pub || siguienteFecha(w); guardar(); return resumen(w); }
  if (a === 'descartar') { if (!p) throw new Error('Página no encontrada'); w.paginas = w.paginas.filter(x => x !== p); guardar(); return resumen(w); }
  if (a === 'construir') { const r = construir(w); log(w, `Sitio armado: ${r.paginas} páginas`); return { ...resumen(w), construido: r }; }
  if (a === 'zip') return { ...resumen(w), zip: await zip(w) };
  if (a === 'publicar') { enCola(w, () => publicarCF(w), 'publicar ' + w.nombre); return resumen(w); }
  if (a === 'borrar') { W = W.filter(x => x !== w); guardar(); fs.rmSync(path.join(DIR, w.id), { recursive: true, force: true }); return { ok: 1 }; }
  throw new Error('Acción desconocida');
}

module.exports = { listar, accion, iniciar, DIR, md, construir };
