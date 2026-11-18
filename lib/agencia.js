// 🤝 Yupitok Studio: página de presentación para conseguir clientes + chatbot vendedor + CRM.
// La página la sirve el servidor público (página viral) por su propio dominio, reenviando aquí /agencia-pub/*.
// El bot solo habla de lo que ofrecemos, nunca inventa precios ni promesas, y pide los datos con permiso.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DATA, parseJSON, uid } = require('./util');
const { db, saveAll } = require('./store');

const FILE = path.join(DATA, 'crm.json');
let C = { leads: [], sesiones: {} }; try { C = { leads: [], sesiones: {}, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch (e) {}
let tGuardar = null; const guardar = () => { clearTimeout(tGuardar); tGuardar = setTimeout(() => { fs.writeFileSync(FILE + '.tmp', JSON.stringify(C)); fs.renameSync(FILE + '.tmp', FILE); }, 400); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ETAPAS = ['nuevo', 'contactado', 'propuesta', 'ganado', 'perdido'];

const DEF = {
  marca: 'Yupitok Studio', dominio: '', whatsapp: '', correo: '', ciudad: 'Lima', pais: 'Perú', color: '#7c3aed',
  planes: [
    { plan: 'Web Esencial', desde: '', incluye: 'Página de una sección para tu negocio: portada, servicios, ubicación en el mapa, botón de WhatsApp y formulario de contacto. Diseño para celular.' },
    { plan: 'Web Profesional', desde: '', incluye: 'Varias secciones (inicio, servicios, nosotros, preguntas frecuentes, contacto), textos profesionales escritos para tu negocio y SEO local para aparecer en Google.' },
    { plan: 'Catálogo / Carta digital', desde: '', incluye: 'Catálogo de productos o carta digital con fotos y precios, y pedidos directos por WhatsApp.' },
  ],
  entrega: '', pagos: 'Yape, Plin o transferencia bancaria', dominioIncluido: 'Te ayudamos a registrar tu propio dominio (.com o .pe) a tu nombre.', extra: '',
};
const cfg = () => { const a = db.settings.agencia || {}, A = { ...DEF, ...a, planes: (a.planes && a.planes.length ? a.planes : DEF.planes) };
  // si el campo de WhatsApp quedó vacío, se toma el número que escribiste en «Lo que el bot debe saber» (ej. wa.me/519… o +51 9…)
  if (!String(A.whatsapp || '').replace(/\D/g, '')) { const t = String(A.extra || ''), m = t.match(/wa\.me\/(\d{8,15})/) || t.match(/whats ?app[^\n\d+]{0,40}(\+?\d[\d\s-]{7,16}\d)/i); if (m) A.whatsapp = m[1].replace(/\D/g, ''); }
  return A; };
const waLink = (num, txt) => num ? `https://wa.me/${String(num).replace(/\D/g, '')}?text=${encodeURIComponent(txt)}` : '#contacto';

// ---------------- Conocimiento del bot ----------------
function conocimiento(A) {
  const precios = A.planes.map(p => `- ${p.plan}: ${p.desde ? 'desde ' + p.desde : 'precio a cotizar (NO des un número)'}. Incluye: ${p.incluye}`).join('\n');
  return `Eres el asistente comercial de «${A.marca}», un estudio que crea PÁGINAS WEB PROFESIONALES PARA NEGOCIOS (${A.ciudad ? 'desde ' + A.ciudad + ', ' : ''}${A.pais}; atendemos a negocios de cualquier rubro y ciudad, de forma remota).
QUÉ HACEMOS (solo esto):
${precios}
Todas incluyen: diseño adaptado a celular, botón de WhatsApp, ubicación en Google Maps, carga rápida, certificado de seguridad (https), textos profesionales escritos para el negocio y optimización básica para Google (SEO local). ${A.dominioIncluido}
Proceso: 1) el cliente nos cuenta de su negocio, 2) diseñamos y le mostramos una vista previa, 3) ajustamos lo que pida, 4) publicamos. ${A.entrega ? 'Tiempo de entrega: ' + A.entrega + '.' : 'El tiempo de entrega se confirma al cotizar.'}
Formas de pago: ${A.pagos}.
${A.extra ? 'INFORMACIÓN ADICIONAL DEL ESTUDIO:\n' + A.extra : ''}
CÓMO UNA WEB AYUDA A CRECER (úsalo para asesorar, adaptado a su rubro): aparecer cuando buscan «${'[rubro]'} cerca de mí» en Google y Maps; dar confianza (un negocio con web propia se ve serio); recibir consultas y pedidos por WhatsApp a cualquier hora; mostrar servicios, precios, horarios y ubicación sin tener que responder lo mismo cada vez; no depender solo de Facebook o Instagram; poder compartir un enlace propio en tarjetas, redes y Google.
REGLAS:
1. Responde en español, cálido y cercano, TUTEANDO siempre (nunca «usted»), breve (2 a 4 frases, máx. 70 palabras), como un asesor humano experto. Haz UNA pregunta a la vez.
2. Eres un asesor, no un formulario: primero entiende el negocio (rubro, ciudad, qué quiere lograr) y EXPLICA, poco a poco y con ejemplos de SU rubro, todo lo que su web puede hacer por él (aparecer en Google y Maps, recibir pedidos por WhatsApp, mostrar carta/catálogo, horarios, reservas, confianza…). Una idea nueva por mensaje, sin soltar todo de golpe.
3. Precios: da SOLO los «desde» que figuran arriba. Si un plan dice «a cotizar», no inventes cifras. Nunca prometas resultados garantizados (ventas, primer lugar en Google, etc.).
4. Si preguntan algo que no hacemos (apps, redes, publicidad pagada…), dilo con honestidad y vuelve a la web.
5. NO pidas nombre, WhatsApp ni correo. Si el cliente los da por su cuenta, perfecto, pero tú no los pides.
6. Solo cuando haya interés real (pregunta cómo empezar, pide cotización o propuesta, dice «quiero», «me interesa», «cuándo empezamos», o pregunta precios después de entender lo que incluye), invítalo a continuar por WhatsApp con un asesor y pon "listo": true. Antes de eso, "listo": false. Si dice que solo está mirando, respétalo y sigue ayudando sin presionar.
7. Nunca pidas contraseñas, datos bancarios ni documentos de identidad.
Devuelve SOLO JSON: {"respuesta":"texto para el cliente","listo":false,"resumen":"resumen para el asesor en 3 a 6 líneas cortas con viñetas «• »: negocio y rubro, ciudad, qué quiere lograr, plan o servicio que le interesa, dudas o pedidos especiales, presupuesto o urgencia si los mencionó (solo lo que dijo de verdad)","datos":{"nombre":"","negocio":"","rubro":"","ciudad":"","whatsapp":"solo dígitos con código de país si lo dio","correo":"","necesidad":"qué quiere en 1 frase","plan":"plan que le interesa"}}
(en "datos" pon solo lo que el cliente dijo de verdad; deja vacío lo que no sepas).`;
}

// ---------------- Leads (CRM) ----------------
function avisar(l, nuevo) {
  try { require('./avisos').avisar(`🤝 ${nuevo ? 'Nuevo cliente potencial' : 'Cliente actualizado'} (${cfg().marca})\n👤 ${l.nombre || '—'} · 🏪 ${l.negocio || '—'} (${l.rubro || '—'})\n📱 ${l.whatsapp || '—'}${l.correo ? ' · ✉️ ' + l.correo : ''}\n📝 ${l.necesidad || '—'}${l.plan ? '\n💼 Plan: ' + l.plan : ''}${l.origen === 'whatsapp' ? '\n➡️ Va a escribirte por WhatsApp' : ''}`); } catch (e) {}
}
function guardarLead(datos, { sid, origen, ip, pais, sinContacto }) {
  const limpio = { nombre: '', negocio: '', rubro: '', ciudad: '', whatsapp: '', correo: '', necesidad: '', plan: '' };
  for (const k of Object.keys(limpio)) limpio[k] = String(datos?.[k] || '').trim().slice(0, k === 'necesidad' ? 400 : 80);
  limpio.whatsapp = limpio.whatsapp.replace(/\D/g, '').slice(0, 15); // solo dígitos: «+51 987…» y «51987…» son el mismo cliente if (!/@/.test(limpio.correo)) limpio.correo = '';
  if (!limpio.whatsapp && !limpio.correo && !sinContacto) return null;
  const dig = t => String(t || '').replace(/\D/g, ''), igual = (a, b) => a && b && (a === b || (a.length >= 8 && b.length >= 8 && (a.endsWith(b.slice(-9)) && b.endsWith(a.slice(-9)))));
  let l = C.leads.find(x => (sid && x.sid === sid) || igual(dig(x.whatsapp), limpio.whatsapp) || (limpio.correo && x.correo === limpio.correo));
  const nuevo = !l;
  if (!l) { l = { id: uid().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10), fecha: new Date().toISOString(), etapa: 'nuevo', notas: [], origen, sid, pais: pais || '', ip: ip ? crypto.createHash('sha256').update('ip|' + ip).digest('hex').slice(0, 10) : '' }; C.leads.unshift(l); }
  let cambio = nuevo; for (const [k, v] of Object.entries(limpio)) if (v && l[k] !== v) { l[k] = v; cambio = true; }
  l.actualizado = new Date().toISOString(); guardar(); if (cambio) avisar(l, nuevo); return l;
}

// ---------------- Límite anti-abuso ----------------
const usos = new Map();
const limite = (clave, max, ms) => { const t = Date.now(), a = (usos.get(clave) || []).filter(x => t - x < ms); a.push(t); usos.set(clave, a); if (usos.size > 5000) usos.clear(); return a.length > max; };

async function chat({ sid, msg }, { ip, pais }) {
  sid = String(sid || '').replace(/[^a-z0-9]/gi, '').slice(0, 24); msg = String(msg || '').trim().slice(0, 600);
  if (!sid || !msg) throw new Error('Mensaje vacío');
  if (limite('c:' + ip, 40, 3600e3) || limite('s:' + sid, 30, 3600e3)) return { respuesta: 'Has escrito muchos mensajes seguidos. Si quieres, déjanos tu WhatsApp en el formulario y un asesor te escribe. 🙌' };
  const A = cfg(), S = C.sesiones[sid] = C.sesiones[sid] || { inicio: new Date().toISOString(), m: [], datos: {} };
  S.m.push({ r: 'u', t: msg }); S.m = S.m.slice(-30); S.ult = Date.now();
  let respuesta = '', datos = {}, fallo = false;
  try {
    const hist = S.m.slice(-10).map(x => ({ role: x.r === 'u' ? 'user' : 'assistant', content: x.t }));
    const r = await require('./ai').ask([{ role: 'system', content: conocimiento(A) + (Object.values(S.datos).some(Boolean) ? '\nDATOS QUE YA TENEMOS DEL CLIENTE: ' + JSON.stringify(S.datos) : '') }, ...hist], { json: true, max: 1500, preferir: ['groq', 'cerebras', 'gemini'], rapido: true, modelos: { groq: 'llama-3.3-70b-versatile', cerebras: 'llama-3.3-70b' } }); // modelos que responden al instante (sin «pensar») // ⚡ los motores más rápidos primero
    const j = parseJSON(r.text); respuesta = String(j.respuesta || '').slice(0, 1200); if (respuesta.trim().length < 3) throw new Error('respuesta vacía'); datos = j.datos || {}; if (j.resumen) S.resumen = String(j.resumen).slice(0, 900);
    const turnos = S.m.filter(x => x.r === 'u').length; if (j.listo === true && turnos >= 2) S.listo = true; // nunca en el primer mensaje
    if (/whats ?app|asesor/i.test(respuesta) && /(te invito|escr[ií]benos|habla|contin[uú]a|comun[ií]cate|sigue)/i.test(respuesta)) S.listo = true; // si el bot invita a WhatsApp, el botón aparece sí o sí
  } catch (e) { fallo = true; respuesta = `Ahora mismo no puedo responder bien 🙏. Déjanos tu nombre y WhatsApp en el formulario de abajo${A.whatsapp ? ' o escríbenos directo por WhatsApp' : ''} y un asesor de ${A.marca} te contacta.`; }
  if (/(hablar|comunicarme|contactar(los|me)?|conversar|llamar|escribir)(les)? con (ustedes|un asesor|alguien|una persona)|quiero (hablar|comunicarme|contratar|empezar|la web|la p[aá]gina|cotizar)|whats ?app|cot[ií]za(me|r)?|me interesa|c[oó]mo (empiezo|empezamos|contrato)|su (n[uú]mero|whatsapp|contacto)/i.test(msg)) S.listo = true;
  // el WhatsApp también se detecta en el mensaje del cliente (por si la IA no lo extrajo)
  const num = (msg.match(/(\+?\d[\d\s-]{7,16}\d)/) || [])[1]; if (num && !datos.whatsapp) datos.whatsapp = num.replace(/[^\d+]/g, '');
  for (const [k, v] of Object.entries(datos)) if (v) S.datos[k] = v;
  S.m.push({ r: 'b', t: respuesta });
  let lead = null; if (S.datos.whatsapp || S.datos.correo) { lead = guardarLead(S.datos, { sid, origen: 'chatbot', ip, pais }); if (lead) S.lead = lead.id; }
  if (fallo && lead) { respuesta = `¡Gracias! Ya tengo tu contacto (${lead.whatsapp || lead.correo}). Un asesor de ${A.marca} te escribirá muy pronto con una propuesta para tu negocio 🙌`; S.m[S.m.length - 1].t = respuesta; }
  if (lead) lead.conversacion = S.m.slice(-30);
  // sesiones viejas se borran (24 h sin actividad y sin lead)
  if (Math.random() < 0.05) for (const [k, v] of Object.entries(C.sesiones)) if (Date.now() - (v.ult || 0) > 864e5 && !v.lead) delete C.sesiones[k];
  guardar();
  if (lead && S.resumen) lead.resumen = S.resumen;
  const waRes = A.whatsapp ? waLink(A.whatsapp, mensajeWA(A, S)) : null;
  return { respuesta, conLead: !!lead, listo: !!S.listo, wa: S.listo ? waRes : null, waSiempre: waRes };
}
// Mensaje que llega a TU WhatsApp: saludo + resumen de lo conversado (así entiendes todo de un vistazo)
function mensajeWA(A, S) {
  const d = S.datos || {}, res = S.resumen || [d.negocio && '• Negocio: ' + d.negocio, d.rubro && '• Rubro: ' + d.rubro, d.ciudad && '• Ciudad: ' + d.ciudad, d.necesidad && '• Quiere: ' + d.necesidad, d.plan && '• Plan: ' + d.plan].filter(Boolean).join('\n');
  return `Hola ${A.marca} 👋 Vengo de su página web y quiero continuar con mi página web.${res ? '\n\n📝 Resumen de lo que conversé con su asistente:\n' + res : ''}`;
}
// El cliente pulsó «Continuar por WhatsApp»: queda en el CRM con el resumen y la conversación
function fueWhatsApp({ sid }, { ip, pais }) {
  sid = String(sid || '').replace(/[^a-z0-9]/gi, '').slice(0, 24); const S = C.sesiones[sid]; if (!S) return { ok: 0 };
  if (limite('w:' + sid, 5, 3600e3)) return { ok: 1 };
  const l = guardarLead({ ...S.datos, necesidad: S.datos.necesidad || (S.resumen || '').replace(/\n/g, ' ').slice(0, 400) }, { sid, origen: 'whatsapp', ip, pais, sinContacto: true });
  if (l) { l.resumen = S.resumen || l.resumen; l.conversacion = S.m.slice(-30); l.fueWhatsApp = new Date().toISOString(); S.lead = l.id; guardar(); }
  return { ok: 1 };
}

function contacto(o, { ip, pais }) {
  if (limite('f:' + ip, 6, 3600e3)) throw new Error('Demasiados envíos, intenta más tarde');
  if (!o.acepta) throw new Error('Marca la casilla para que podamos contactarte');
  const l = guardarLead({ nombre: o.nombre, negocio: o.negocio, rubro: o.rubro, whatsapp: o.whatsapp, correo: o.correo, necesidad: o.necesidad }, { sid: null, origen: 'formulario', ip, pais });
  if (!l) throw new Error('Escribe tu WhatsApp o tu correo para poder contactarte');
  return { ok: 1 };
}

// ---------------- 🤖 Asistente de cada web de cliente ----------------
const SB = new Map(); // conversaciones en curso (en memoria; el resumen queda guardado en la web)
function conocimientoNegocio(w) {
  const T = w.textos || {}, C = w.cliente || {}, L = (a, f) => (a || []).map(f).join('\n');
  return `Eres el asistente virtual de «${w.nombre}»${C.rubro ? ' (' + C.rubro + ')' : ''}${C.ciudad ? ' en ' + C.ciudad : ''}, ${PAIS_(w)}. Atiendes a los visitantes de su página web.
LO QUE SABES DEL NEGOCIO (solo esto, no inventes nada más):
${T.hero_sub ? 'Presentación: ' + T.hero_sub + '\n' : ''}${T.sobre ? 'Sobre el negocio: ' + String(T.sobre).slice(0, 900) + '\n' : ''}SERVICIOS:
${L(T.servicios, x => `- ${x.t}: ${x.d || ''}${(x.detalles || []).length ? ' (' + x.detalles.join('; ') + ')' : ''}`)}
${(T.paquetes || []).length ? 'PAQUETES:\n' + L(T.paquetes, x => `- ${x.nombre}${x.ideal_para ? ' (ideal para ' + x.ideal_para + ')' : ''}: ${(x.incluye || []).join(', ')}`) + '\n' : ''}${(T.pasos || []).length ? 'CÓMO SE TRABAJA: ' + T.pasos.map((x, i) => `${i + 1}) ${x.t}`).join(' ') + '\n' : ''}${T.zonas ? 'ZONAS O MODALIDAD: ' + T.zonas + '\n' : ''}${C.direccion ? 'Dirección: ' + C.direccion + '\n' : ''}${C.horario ? 'Horario: ' + C.horario + '\n' : ''}${C.promo ? 'PROMOCIÓN VIGENTE: ' + C.promo + '\n' : ''}${(T.faq || []).length ? 'PREGUNTAS FRECUENTES:\n' + L(T.faq, x => `P: ${x.p}\nR: ${x.r}`) + '\n' : ''}${C.servicios ? 'Notas del negocio: ' + String(C.servicios).slice(0, 500) + '\n' : ''}${C.diferencial ? 'Lo que lo diferencia: ' + String(C.diferencial).slice(0, 300) + '\n' : ''}
REGLAS:
1. Español cálido y cercano, tuteando, breve (2 a 4 frases, máx. 70 palabras). Una pregunta a la vez. Habla como parte del equipo («nosotros»).
2. Primero entiende qué necesita (tipo de servicio, fecha, cantidad de personas, zona…) y recomiéndale el servicio o paquete que mejor le va, explicando lo que incluye, poco a poco.
3. PRECIOS: si arriba no hay un precio, NO inventes cifras: di que el precio depende de lo que necesite y que se lo confirman por WhatsApp. Nunca inventes servicios, disponibilidad, fechas libres, descuentos ni datos que no estén arriba. Si no sabes algo, dilo y ofrece WhatsApp.
4. NO pidas nombre, teléfono ni correo. Nunca pidas contraseñas, datos bancarios ni documentos.
5. Si la pregunta no tiene nada que ver con el negocio, responde amable en una frase y vuelve al tema.
6. Cuando haya interés real (quiere reservar, cotizar, pregunta precio exacto, disponibilidad de una fecha, cómo pagar o «quiero»), invítalo a continuar por WhatsApp y pon "listo": true. Antes, "listo": false.
7. LENGUAJE CORRECTO: la que cumple 15 años es una chica: di «la quinceañera», «fiesta de 15 años» o «tus 15 / sus 15»; NUNCA «un quinceañero», «el quinceañero» ni «Quinceañeros». Usa el género correcto de las personas (la novia, la cumpleañera, el bebé) y si no lo sabes, usa formas neutras («la persona que cumple años», «el festejo»). Usa el español natural de Perú.
Devuelve SOLO JSON: {"respuesta":"texto para el visitante","listo":false,"resumen":"3 a 5 líneas con «• »: qué necesita, servicio o paquete que le interesa, fecha, cantidad, zona y dudas (solo lo que dijo de verdad)"}`;
}
// «para un quinceañero» → «para una fiesta de 15 años» (la que cumple 15 es una chica)
const quince = t => String(t).replace(/\b(?:(para|de|en|a|con)\s+)?(un|el|del|al)\s+quincea[ñn]ero\b/gi, (m, pre, art) => { const P = pre ? pre + ' ' : '', a = art.toLowerCase(), may = /^[A-ZÁÉÍÓÚ]/.test(m);
  const r = a === 'un' ? P + 'una fiesta de 15 años' : a === 'del' ? P + 'de la fiesta de 15 años' : a === 'al' ? P + 'a la fiesta de 15 años' : P + 'la fiesta de 15 años'; return may ? r[0].toUpperCase() + r.slice(1) : r; }).replace(/\bquincea[ñn]eros\b/g, 'fiestas de 15 años').replace(/\bQuincea[ñn]eros\b/g, 'Fiestas de 15 años');
const PAIS_ = w => w.pais || 'Perú';
function waNegocio(w, S) {
  return `Hola ${w.nombre} 👋 Vengo de su página web.${S.resumen ? '\n\n📝 Lo que conversé con su asistente:\n' + S.resumen : ''}`;
}
function anotarConsulta(w, S, sid, fueWA) {
  const W = require('./webs'); w.chats = w.chats || []; let c = w.chats.find(x => x.sid === sid);
  if (!c) { c = { sid, fecha: new Date().toISOString() }; w.chats.unshift(c); w.chats = w.chats.slice(0, 150); }
  c.resumen = S.resumen || S.m.filter(x => x.r === 'u').map(x => '• ' + x.t).slice(0, 4).join('\n'); c.mensajes = S.m.filter(x => x.r === 'u').length; c.act = new Date().toISOString(); if (fueWA) c.whatsapp = true; W.guardar();
}
async function chatNegocio(w, { sid, msg }, { ip }) {
  sid = String(sid || '').replace(/[^a-z0-9]/gi, '').slice(0, 32); msg = String(msg || '').trim().slice(0, 500);
  if (!sid || !msg) throw new Error('Mensaje vacío');
  const C = w.cliente || {}, num = String(C.whatsapp || '').replace(/\D/g, '');
  if (limite('nb:' + ip, 60, 3600e3) || limite('ns:' + sid, 30, 3600e3)) return { respuesta: 'Has escrito muchos mensajes seguidos 🙏 Escríbenos por WhatsApp y te atendemos.', wa: num ? waLink(num, `Hola ${w.nombre} 👋 Vengo de su página web.`) : null };
  const clave = w.id + ':' + sid, S = SB.get(clave) || { m: [], ult: 0 }; SB.set(clave, S);
  if (SB.size > 3000) for (const [k, v] of SB) if (Date.now() - v.ult > 6 * 3600e3) SB.delete(k);
  S.m.push({ r: 'u', t: msg }); S.m = S.m.slice(-24); S.ult = Date.now();
  let respuesta = '';
  try {
    const r = await require('./ai').ask([{ role: 'system', content: conocimientoNegocio(w) }, ...S.m.slice(-10).map(x => ({ role: x.r === 'u' ? 'user' : 'assistant', content: x.t }))], { json: true, max: 1200, preferir: ['groq', 'cerebras', 'gemini'], rapido: true, modelos: { groq: 'llama-3.3-70b-versatile', cerebras: 'llama-3.3-70b' } });
    const j = parseJSON(r.text); respuesta = String(j.respuesta || '').slice(0, 1000); respuesta = quince(respuesta); if (respuesta.trim().length < 3) throw new Error('vacía');
    if (j.resumen) S.resumen = String(j.resumen).slice(0, 700);
    if (j.listo === true && S.m.filter(x => x.r === 'u').length >= 2) S.listo = true;
    if (/whats ?app/i.test(respuesta) && /(escr[ií]be|contin[uú]a|habla|comun[ií]ca|coordina|confirm)/i.test(respuesta)) S.listo = true;
  } catch (e) { respuesta = `Ahora mismo no puedo responder bien 🙏${num ? ' Escríbenos por WhatsApp y te atendemos enseguida.' : ''}`; S.listo = true; }
  if (/whats ?app|reserv|cotiz|precio exacto|disponib|quiero (contratar|reservar|el|la)|me interesa|c[oó]mo (pago|reservo|contrato)|hablar con/i.test(msg)) S.listo = true;
  S.m.push({ r: 'b', t: respuesta });
  if (S.m.filter(x => x.r === 'u').length >= 2 || S.listo) anotarConsulta(w, S, sid, false);
  return { respuesta, wa: S.listo && num ? waLink(num, waNegocio(w, S)) : null };
}

// ---------------- Página de presentación ----------------
function pagina(A, url) {
  const c = A.color || '#7c3aed', wa = waLink(A.whatsapp, `Hola ${A.marca}, quiero una página web para mi negocio`);
  const conPrecio = A.planes.some(p => p.desde);
  const demos = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'demos', 'lista.json'), 'utf8')); } catch (e) { return []; } })();
  const ej = (() => { try { return require('./webs').listar('cliente').webs.filter(w => w.publicado?.url).slice(0, 6); } catch (e) { return []; } })();
  const rubros = ['🍗 Restaurantes y pollerías', '🔧 Talleres y mecánicos', '🦷 Consultorios y clínicas', '💇 Salones y barberías', '🛍️ Tiendas y bodegas', '🏨 Hospedajes', '📚 Academias', '⚖️ Abogados y contadores', '🏗️ Constructoras', '🐾 Veterinarias', '🎂 Pastelerías', '🚚 Transporte y mudanzas'];
  const faq = [
    ['¿Necesito saber de tecnología?', 'No. Tú nos cuentas de tu negocio y nosotros hacemos todo: diseño, textos, publicación y configuración.'],
    ['¿El dominio (www.minegocio.com) es mío?', A.dominioIncluido],
    ['¿Cuánto demora?', A.entrega ? A.entrega + '.' : 'Depende de lo que necesites; te lo confirmamos al enviarte la propuesta.'],
    ['¿Cómo pago?', A.pagos + '.'],
    ['¿Aparecerá mi negocio en Google?', 'Dejamos tu web optimizada para búsquedas locales y te ayudamos a vincularla con tu ficha de Google Maps. El posicionamiento depende de muchos factores, así que no prometemos un puesto exacto: sí te damos todo lo necesario para que Google te encuentre.'],
    ['¿Puedo pedir cambios después?', 'Sí. Te mostramos una vista previa y ajustamos lo que pidas antes de publicar.'],
  ];
  const ld = [{ '@context': 'https://schema.org', '@type': 'ProfessionalService', name: A.marca, url, description: 'Diseño de páginas web profesionales para negocios.', areaServed: A.pais, ...(A.correo ? { email: A.correo } : {}), ...(A.whatsapp ? { telephone: '+' + String(A.whatsapp).replace(/\D/g, '') } : {}), address: { '@type': 'PostalAddress', addressLocality: A.ciudad, addressCountry: A.pais } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([p, r]) => ({ '@type': 'Question', name: p, acceptedAnswer: { '@type': 'Answer', text: r } })) }];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(A.marca)} · Páginas web profesionales para tu negocio</title><meta name="description" content="Creamos la página web de tu negocio: diseño para celular, WhatsApp, Google Maps y SEO local. Cotiza gratis con nuestro asistente.">
<link rel="canonical" href="${esc(url)}"><meta property="og:title" content="${esc(A.marca)} · Tu negocio con página web profesional"><meta property="og:description" content="Diseño, textos, WhatsApp, Google Maps y SEO local. Cotiza gratis."><meta property="og:type" content="website"><meta property="og:url" content="${esc(url)}"><meta property="og:site_name" content="${esc(A.marca)}"><meta property="og:locale" content="es_PE">
<meta property="og:image" content="${esc(url)}og.jpg"><meta property="og:image:secure_url" content="${esc(url)}og.jpg"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(A.marca)}: páginas web profesionales para negocios">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(A.marca)} · Tu negocio con página web profesional"><meta name="twitter:description" content="Diseño, textos, WhatsApp, Google Maps y SEO local. Cotiza gratis."><meta name="twitter:image" content="${esc(url)}og.jpg">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='${encodeURIComponent(c)}'/><text x='50' y='68' font-size='56' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'>Y</text></svg>">
${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('')}
<style>:root{--c:${c};--t:#0f172a;--s:#64748b;--b:#e2e8f0;--f:#f8fafc}*{box-sizing:border-box}body{margin:0;font:17px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--t);background:#fff}a{color:var(--c)}
.w{max-width:1120px;margin:0 auto;padding:0 18px}header{position:sticky;top:0;background:#fffe;backdrop-filter:blur(8px);border-bottom:1px solid var(--b);z-index:10}header .w{display:flex;justify-content:space-between;align-items:center;min-height:64px;gap:10px}
.logo{font-weight:800;font-size:1.2rem;text-decoration:none;color:var(--t)}.logo b{color:var(--c)}.btn{display:inline-block;background:var(--c);color:#fff;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;border:0;cursor:pointer;font-size:1rem}.btn.alt{background:#fff;color:var(--c);border:2px solid #fff3}.btn.wa{background:#16a34a}
.hero{background:radial-gradient(circle at 80% 10%,#ffffff22,transparent 40%),linear-gradient(135deg,var(--c),#0f172a);color:#fff;padding:72px 0 80px}.hero h1{font-size:clamp(2rem,5vw,3.2rem);line-height:1.15;margin:0 0 16px;max-width:760px}.hero p{font-size:1.2rem;opacity:.92;max-width:640px}.hero .btns{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}
section{padding:60px 0}section.gris{background:var(--f)}h2{font-size:clamp(1.6rem,3.5vw,2.2rem);margin:0 0 10px;line-height:1.2}.sub{color:var(--s);font-size:1.1rem;max-width:700px;margin:0 0 28px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}.k{background:#fff;border:1px solid var(--b);border-radius:16px;padding:20px}.k .i{font-size:1.8rem}.k b{display:block;margin:6px 0 4px;font-size:1.08rem}.k small{color:var(--s);font-size:.95rem}
.chips{display:flex;flex-wrap:wrap;gap:10px}.chips span{background:#fff;border:1px solid var(--b);border-radius:999px;padding:8px 14px}.pasos{counter-reset:p}.pasos .k b::before{counter-increment:p;content:counter(p);display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--c);color:#fff;margin-right:8px;font-size:.9rem}
.plan{border:2px solid var(--b);border-radius:18px;padding:24px;background:#fff}.plan .p{font-size:1.6rem;font-weight:800;color:var(--c);margin:6px 0}details{border:1px solid var(--b);border-radius:12px;padding:12px 16px;margin:10px 0;background:#fff}summary{cursor:pointer;font-weight:700}
form{display:grid;gap:12px;max-width:620px}input,textarea,select{font:inherit;padding:12px 14px;border:1px solid var(--b);border-radius:12px;width:100%}footer{border-top:1px solid var(--b);padding:28px 0;color:var(--s);font-size:.92rem}
#bot{position:fixed;right:16px;bottom:16px;z-index:50}#botBtn{background:var(--c);color:#fff;border:0;border-radius:999px;padding:14px 20px;font-weight:700;font-size:1rem;box-shadow:0 10px 30px #0004;cursor:pointer}
#botPanel{display:none;position:fixed;right:16px;bottom:82px;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 120px));background:#fff;border-radius:18px;box-shadow:0 20px 60px #0005;flex-direction:column;overflow:hidden}#botPanel.on{display:flex}
#botHead{background:var(--c);color:#fff;padding:14px 16px;font-weight:700;display:flex;justify-content:space-between}#botMsgs{flex:1;overflow:auto;padding:14px;background:var(--f)}.m{max-width:85%;padding:10px 13px;border-radius:14px;margin:6px 0;white-space:pre-wrap;font-size:.95rem;line-height:1.45}.m.b{background:#fff;border:1px solid var(--b)}.m.u{background:var(--c);color:#fff;margin-left:auto}
#botForm{display:flex;gap:8px;padding:10px;border-top:1px solid var(--b)}#botForm input{flex:1}#botForm button{background:var(--c);color:#fff;border:0;border-radius:12px;padding:0 16px;font-weight:700;cursor:pointer}.dots i{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:#94a3b8;animation:dt 1s infinite}.dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}@keyframes dt{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}.rap{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.rap button{border:1px solid var(--c);color:var(--c);background:#fff;border-radius:999px;padding:6px 10px;cursor:pointer;font-size:.85rem}
.hg{display:grid;grid-template-columns:1.1fr .9fr;gap:30px;align-items:center}.col{position:relative;height:430px}.tel{position:absolute;width:210px;height:390px;object-fit:cover;object-position:top;border-radius:28px;border:7px solid #0f172a;box-shadow:0 25px 50px #0007;background:#fff}.tel{transition:opacity .45s,transform .45s}.tel.cambia{opacity:0;transform:translateY(14px) scale(.96)}.tel.t0{left:0;top:40px;transform:rotate(-7deg)}.tel.t0.cambia{transform:rotate(-7deg) translateY(14px) scale(.96)}.tel.t2.cambia{transform:rotate(7deg) translateY(14px) scale(.96)}.tel.t1{left:30%;top:0;z-index:2}.tel.t2{right:0;top:50px;transform:rotate(7deg)}
.demos{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:22px}.demo{display:block;text-decoration:none;color:var(--t);background:#fff;border:1px solid var(--b);border-radius:20px;padding:14px;transition:.2s}.demo:hover{transform:translateY(-4px);box-shadow:0 18px 40px #0f172a22;border-color:var(--c)}.marco{border-radius:22px;border:6px solid #0f172a;overflow:hidden;height:330px;margin-bottom:12px;background:#f1f5f9}.marco img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}.demo b{display:block;font-size:1.05rem}.demo small{color:var(--s)}.demo span{display:block;margin-top:6px;color:var(--c);font-weight:700}
@media(max-width:860px){.hg{grid-template-columns:1fr}.col{height:330px;max-width:420px;margin:10px auto 0;width:100%}.tel{width:160px;height:300px}}
@media(max-width:640px){.hero{padding:48px 0 56px}section{padding:44px 0}}</style></head><body>
<header><div class="w"><a class="logo" href="/">${esc(A.marca).replace(/(\S+)$/, '<b>$1</b>')}</a><span style="display:flex;gap:8px">${A.whatsapp ? `<a class="btn wa" href="${esc(wa)}" rel="noopener" target="_blank" style="padding:9px 16px" data-wa>💬 WhatsApp</a>` : ""}<a class="btn" href="#contacto" style="padding:9px 18px">Cotizar</a></span></div></header>
${A.whatsapp ? `<a href="${esc(wa)}" target="_blank" rel="noopener" data-wa aria-label="Escríbenos por WhatsApp" style="position:fixed;left:16px;bottom:16px;z-index:40;background:#16a34a;color:#fff;border-radius:999px;width:58px;height:58px;display:grid;place-items:center;font-size:26px;text-decoration:none;box-shadow:0 10px 30px #0004">📞</a>` : ""}
<section class="hero"><div class="w hg"><div><h1>Tu negocio con página web profesional, lista para que te encuentren</h1><p>Diseñamos la web de tu negocio, la conectamos a WhatsApp y Google Maps y la dejamos optimizada para Google. Tú atiendes a tus clientes; nosotros nos encargamos de lo técnico.</p>
<div class="btns"><button class="btn alt" onclick="abrirBot()">💬 Habla con nuestro asistente</button>${A.whatsapp ? `<a class="btn wa" href="${esc(wa)}" rel="noopener">WhatsApp</a>` : ''}</div><p style="font-size:.95rem;opacity:.8;margin-top:18px">✓ Vista previa antes de publicar · ✓ Dominio a tu nombre · ✓ Cambios incluidos</p></div>
${demos.length >= 3 ? `<div class="col" aria-hidden="true" data-demos="${esc(JSON.stringify(demos.map(d => d.slug)))}">${demos.slice(0, 3).map((d, i) => `<img class="tel t${i}" src="ejemplos/${d.slug}.jpg" alt="" width="210" height="390">`).join('')}</div>` : ''}</div></section>
<section><div class="w"><h2>¿Te pasa esto?</h2><p class="sub">Si tu negocio no tiene web propia, estás dejando clientes en la mesa.</p><div class="g">
<div class="k"><div class="i">🔎</div><b>Te buscan en Google y no apareces</b><small>Cuando alguien busca «${'tu rubro'} cerca de mí», aparecen los negocios que sí tienen web y ficha completa.</small></div>
<div class="k"><div class="i">📱</div><b>Solo tienes Facebook o Instagram</b><small>Las redes ayudan, pero no son tuyas ni aparecen bien en Google. Tu web es tu casa propia en internet.</small></div>
<div class="k"><div class="i">🌙</div><b>Respondes lo mismo todo el día</b><small>Precios, horarios, ubicación… tu web lo explica sola, de día y de noche, y te manda los clientes a WhatsApp.</small></div>
<div class="k"><div class="i">🤝</div><b>Te falta verte más serio</b><small>Un negocio con web y dominio propio inspira confianza y se recomienda más fácil: solo compartes un enlace.</small></div></div></div></section>
<section class="gris"><div class="w"><h2>Qué incluye tu web</h2><p class="sub">Todo lo necesario para que tu negocio se vea profesional y te contacten.</p><div class="g">
${[['📱', 'Diseño para celular', 'Se ve perfecta en el teléfono, que es desde donde te buscan.'], ['💬', 'Botón de WhatsApp', 'Te escriben con un toque, con el mensaje listo.'], ['📍', 'Ubicación en Google Maps', 'Para que lleguen a tu local sin perderse.'], ['🔎', 'SEO local', 'Optimizada para búsquedas de tu rubro y tu ciudad.'], ['✍️', 'Textos profesionales', 'Escritos para tu negocio, claros y que convencen.'], ['⚡', 'Rápida y segura', 'Carga en segundos y tiene candado de seguridad (https).'], ['🌐', 'Dominio propio', 'www.tunegocio.com a tu nombre.'], ['🛠️', 'Cambios incluidos', 'Te mostramos una vista previa y ajustamos lo que pidas.']].map(([i, t, d]) => `<div class="k"><div class="i">${i}</div><b>${t}</b><small>${d}</small></div>`).join('')}</div></div></section>
${demos.length ? `<section><div class="w"><h2>Así se ven las webs que hacemos</h2><p class="sub">Diseños de ejemplo para distintos rubros (negocios ficticios). Tu web se hace con tus datos, tus fotos y tus colores. Tócalos para verlos completos.</p>
<div class="demos">${demos.map(d => `<a class="demo" href="ejemplos/${d.slug}/" target="_blank" rel="noopener"><div class="marco"><img src="ejemplos/${d.slug}.jpg" alt="Diseño de ejemplo: ${esc(d.rubro)}" loading="lazy" width="420" height="780"></div><b>${esc(d.icono)} ${esc(d.rubro.charAt(0).toUpperCase() + d.rubro.slice(1))}</b><small>${esc(d.nombre)} · ${esc(d.ciudad)}</small><span>Ver diseño →</span></a>`).join('')}</div>
<p style="text-align:center;margin-top:24px"><button class="btn" onclick="abrirBot()">💬 Quiero una así para mi negocio</button></p></div></section>` : ''}
<section class="gris"><div class="w"><h2>Para todo tipo de negocio</h2><p class="sub">Adaptamos el diseño y los textos a tu rubro.</p><div class="chips">${rubros.map(r => `<span>${r}</span>`).join('')}</div></div></section>
<section><div class="w"><h2>Así de fácil</h2><div class="g pasos">${[['Nos cuentas de tu negocio', 'Por el chat o WhatsApp: qué vendes, dónde estás y qué quieres lograr.'], ['Diseñamos tu web', 'Escribimos los textos y armamos el diseño con tus colores.'], ['Revisas y ajustamos', 'Te enviamos una vista previa y cambiamos lo que quieras.'], ['¡Publicada!', 'Tu web en línea con tu dominio, lista para compartir.']].map(([t, d]) => `<div class="k"><b>${t}</b><small>${d}</small></div>`).join('')}</div></div></section>
<section class="gris"><div class="w"><h2>Planes</h2><p class="sub">${conPrecio ? 'Precios de referencia. Te enviamos una cotización exacta según lo que necesites.' : 'Cada negocio es distinto: cuéntanos qué necesitas y te enviamos una cotización sin compromiso.'}</p><div class="g">
${A.planes.map(p => `<div class="plan"><b style="font-size:1.15rem">${esc(p.plan)}</b><div class="p">${p.desde ? 'Desde ' + esc(p.desde) : 'A cotizar'}</div><small style="color:var(--s)">${esc(p.incluye)}</small><p><a class="btn" href="#contacto" style="padding:10px 18px">Quiero este</a></p></div>`).join('')}</div></div></section>
${ej.length ? `<section class="gris"><div class="w"><h2>Algunos de nuestros trabajos</h2><div class="g">${ej.map(w => `<a class="k" href="${esc(w.publicado.url)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><b>${esc(w.nombre)}</b><small>${esc(w.cliente?.rubro || '')}</small></a>`).join('')}</div></div></section>` : ''}
<section class="${ej.length ? '' : 'gris'}"><div class="w"><h2>Preguntas frecuentes</h2>${faq.map(([p, r]) => `<details><summary>${esc(p)}</summary><p>${esc(r)}</p></details>`).join('')}</div></section>
<section id="contacto" class="${ej.length ? 'gris' : ''}"><div class="w"><h2>Cotiza gratis</h2><p class="sub">Déjanos tus datos y te escribimos con una propuesta para tu negocio.${A.whatsapp ? ` O escríbenos directo por <a href="${esc(wa)}" rel="noopener">WhatsApp</a>.` : ''}</p>
<form id="fc"><input name="nombre" placeholder="Tu nombre" required maxlength="80"><input name="negocio" placeholder="Nombre de tu negocio" maxlength="80"><input name="rubro" placeholder="Rubro (ej. pollería, taller, consultorio)" maxlength="80">
<input name="whatsapp" placeholder="Tu WhatsApp (con código de país, ej. 51987654321)" inputmode="tel" maxlength="20"><input name="correo" type="email" placeholder="Correo (opcional)" maxlength="80"><textarea name="necesidad" rows="3" placeholder="¿Qué necesitas?" maxlength="400"></textarea>
<label style="display:flex;gap:8px;align-items:flex-start;font-size:.92rem;color:var(--s)"><input type="checkbox" name="acepta" style="width:auto;margin-top:5px"> Acepto que ${esc(A.marca)} use estos datos solo para contactarme sobre mi consulta (<a href="privacidad">privacidad</a>).</label>
<button class="btn" type="submit">Enviar</button><p id="fcOk" style="display:none;color:#16a34a;font-weight:700">✅ ¡Recibido! Te escribimos muy pronto.</p></form></div></section>
<footer><div class="w">© ${new Date().getFullYear()} ${esc(A.marca)} · ${esc(A.ciudad)}, ${esc(A.pais)}${A.correo ? ` · <a href="mailto:${esc(A.correo)}">${esc(A.correo)}</a>` : ''} · <a href="privacidad">Privacidad</a></div></footer>
<div id="bot"><div id="botPanel"><div id="botHead"><span>💬 Asistente de ${esc(A.marca)}</span><span style="display:flex;gap:12px;align-items:center">${A.whatsapp ? `<a id="botWa" href="${esc(wa)}" target="_blank" rel="noopener" title="Hablar con un asesor por WhatsApp" style="background:#16a34a;color:#fff;text-decoration:none;font-size:.8rem;padding:4px 10px;border-radius:999px">WhatsApp</a>` : ""}<span style="cursor:pointer" onclick="abrirBot(false)">✕</span></span></div><div id="botMsgs"></div><form id="botForm"><input id="botIn" placeholder="Escribe tu mensaje…" maxlength="600" autocomplete="off"><button>➤</button></form></div><button id="botBtn" onclick="abrirBot()">💬 ¿Te ayudo?</button></div>
<script>
(()=>{const $=s=>document.querySelector(s);let sid;try{sid=localStorage.getItem('ysid')}catch(e){}if(!sid){sid=Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem('ysid',sid)}catch(e){}}
const msgs=$('#botMsgs'),add=(t,r,raw)=>{const d=document.createElement('div');d.className='m '+r;if(raw)d.innerHTML=t;else d.textContent=t;msgs.append(d);msgs.scrollTop=1e6;return d};let abierto=false,saludo=false;
const rapidas=()=>{const d=document.createElement('div');d.className='rap';['Tengo un restaurante','¿Cuánto cuesta?','¿Qué incluye la web?','¿Cómo me ayuda a vender más?'].forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.onclick=()=>{d.remove();enviar(t)};d.append(b)});msgs.append(d)};
window.abrirBot=(on=true)=>{abierto=on;$('#botPanel').classList.toggle('on',on);if(on&&!saludo){saludo=true;add('¡Hola! 👋 Soy el asistente de ${esc(A.marca).replace(/'/g, '')}. Ayudo a negocios a tener su página web profesional. ¿De qué es tu negocio?','b');rapidas()}if(on)setTimeout(()=>$('#botIn').focus(),100)};
async function enviar(t){add(t,'u');const p=add('','b');p.innerHTML='<span class="dots"><i></i><i></i><i></i></span>';const tt=setTimeout(()=>{if(!p.textContent)p.innerHTML='<span class="dots"><i></i><i></i><i></i></span> <small style="color:#64748b">Pensando la mejor respuesta para tu negocio…</small>'},6000);try{const r=await fetch('chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sid,msg:t})});const j=await r.json();clearTimeout(tt);p.textContent=j.respuesta||j.error||'…';if(j.waSiempre){const bw=document.getElementById('botWa');if(bw)bw.href=j.waSiempre}if(j.listo&&j.wa){document.querySelectorAll('.waBtn').forEach(x=>x.remove());const a=add('<a class="waBtn" href="'+j.wa+'" target="_blank" rel="noopener" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;text-decoration:none;padding:10px 16px;border-radius:999px">💬 Continuar por WhatsApp con un asesor</a><div style="font-size:.8rem;color:#64748b;margin-top:6px">Te llevamos el resumen de esta conversación para que no repitas nada.</div>','b',true);a.querySelector('a').onclick=()=>{fetch('wa',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sid})}).catch(()=>{})}}}catch(e){clearTimeout(tt);p.textContent='No me pude conectar. Escríbenos en el formulario de abajo 🙏'}}
document.addEventListener('click',e=>{const a=e.target.closest('#botWa');if(a&&saludo)fetch('wa',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sid})}).catch(()=>{})});
(()=>{const c=document.querySelector('.col[data-demos]');if(!c)return;let L=[];try{L=JSON.parse(c.dataset.demos)}catch(e){}if(L.length<4)return;L.forEach(s=>{const i=new Image();i.src='ejemplos/'+s+'.jpg'});const T=[...c.querySelectorAll('.tel')];let sig=3,k=0;
setInterval(()=>{if(document.hidden)return;const t=T[[1,0,2][k%3]];k++;t.classList.add('cambia');setTimeout(()=>{t.src='ejemplos/'+L[sig%L.length]+'.jpg';sig++;t.classList.remove('cambia')},450)},2800)})();
$('#botForm').onsubmit=e=>{e.preventDefault();const t=$('#botIn').value.trim();if(!t)return;$('#botIn').value='';enviar(t)};
setTimeout(()=>{if(!abierto&&!saludo)$('#botBtn').animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:700,iterations:3})},8000);
$('#fc').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),o=Object.fromEntries(f);o.acepta=!!f.get('acepta');const r=await fetch('contacto',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(o)});const j=await r.json();if(j.ok){e.target.querySelectorAll('input,textarea,button').forEach(x=>x.disabled=true);$('#fcOk').style.display='block'}else alert(j.error||'No se pudo enviar')};})();
</script></body></html>`;
}
const privacidad = A => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacidad · ${esc(A.marca)}</title><meta name="robots" content="noindex"><style>body{font:17px/1.7 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;color:#0f172a}</style></head><body>
<h1>Política de privacidad</h1><p><b>Responsable:</b> ${esc(A.marca)}, ${esc(A.ciudad)}, ${esc(A.pais)}${A.correo ? ' · ' + esc(A.correo) : ''}.</p><h2>Qué datos tratamos</h2><p>Los que nos das en el formulario o en el chat (nombre, negocio, rubro, WhatsApp, correo y tu consulta), y la conversación con el asistente. No pedimos datos bancarios ni documentos.</p>
<h2>Para qué</h2><p>Solo para responder tu consulta y enviarte una propuesta. No vendemos ni compartimos tus datos con terceros. El asistente usa servicios de inteligencia artificial para entender tus mensajes.</p><h2>Tus derechos</h2><p>Puedes pedir que borremos tus datos en cualquier momento${A.correo ? ' escribiendo a ' + esc(A.correo) : ''}${A.pais === 'Perú' ? ' (Ley N.º 29733 de Protección de Datos Personales)' : ''}.</p><p><a href="/">Volver</a></p></body></html>`;

// Peticiones públicas (llegan reenviadas por el servidor público, o desde esta PC para la vista previa)
async function publico(u, q, r, body) {
  const A = cfg(), ip = String(q.headers['x-ip'] || '').slice(0, 64), pais = String(q.headers['x-pais'] || '').slice(0, 4), ruta = u.replace(/^\/agencia-pub/, '') || '/';
  // dirección pública real (para la vista previa al compartir): el dominio de la visita (+ /studio si es la vista previa en Yupitok)
  const host = String(q.headers['x-host'] || '').toLowerCase().replace(/[^a-z0-9.:-]/g, ''), pref = /^\/[a-z0-9-]{1,20}$/.test(q.headers['x-prefijo'] || '') ? q.headers['x-prefijo'] : '';
  const url = host && !/^(localhost|127\.)/.test(host) ? 'https://' + host.replace(/:\d+$/, '') + pref + '/' : A.dominio ? 'https://' + A.dominio + '/' : 'http://localhost/';
  const enviar = (code, tipo, txt) => { r.writeHead(code, { 'content-type': tipo, 'cache-control': 'no-store' }); r.end(txt); };
  if (q.method === 'POST' && (ruta === '/chat' || ruta === '/contacto' || ruta === '/wa')) {
    try { const o = JSON.parse(body || '{}'); const out = ruta === '/chat' ? await chat(o, { ip, pais }) : ruta === '/wa' ? fueWhatsApp(o, { ip, pais }) : contacto(o, { ip, pais }); return enviar(200, 'application/json', JSON.stringify(out)); }
    catch (e) { return enviar(400, 'application/json', JSON.stringify({ error: e.message })); }
  }
  { const m = ruta.match(/^\/bot\/([a-z0-9-]{1,50})(\/wa)?$/); if (m) { // 🤖 chat de las webs de clientes (también desde su dominio propio)
    const cors = { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
    if (q.method === 'OPTIONS') { r.writeHead(204, cors); return r.end(); }
    const w = require('./webs').porSitio(m[1]); if (!w || q.method !== 'POST' || !require('./webs').conBot(w)) { r.writeHead(404, cors); return r.end('{"error":"No disponible"}'); }
    try { const o = JSON.parse(body || '{}'); let out;
      if (m[2]) { const S = SB.get(w.id + ':' + String(o.sid || '').replace(/[^a-z0-9]/gi, '').slice(0, 32)); if (S && !limite('nw:' + ip, 20, 3600e3)) anotarConsulta(w, S, String(o.sid).replace(/[^a-z0-9]/gi, '').slice(0, 32), true); out = { ok: 1 }; }
      else out = await chatNegocio(w, o, { ip });
      r.writeHead(200, cors); return r.end(JSON.stringify(out)); }
    catch (e) { r.writeHead(400, cors); return r.end(JSON.stringify({ error: e.message })); } } }
  if (u === '/agencia-pub') { r.writeHead(302, { location: '/agencia-pub/' }); return r.end(); }
  { const m = ruta.match(/^\/sitio\/([a-z0-9-]{1,50})(\/.*)?$/); if (m) { // 🌐 webs creadas, publicadas gratis sin dominio
    const W = require('./webs'), w = W.porSitio(m[1]); if (!w) return enviar(404, 'text/html;charset=utf-8', '<p style="font-family:sans-serif">Esta página no existe.</p>');
    if (!m[2]) { r.writeHead(301, { location: (q.headers['x-prefijo'] || '') + '/sitio/' + m[1] + '/' }); return r.end(); }
    const raiz = path.join(W.DIR, w.id, 'dist'); if (!fs.existsSync(path.join(raiz, 'index.html'))) W.construir(w);
    let f = path.join(raiz, ...decodeURIComponent(m[2]).split('/').filter(Boolean)); if (!path.extname(f)) f = path.join(f, 'index.html');
    if (!f.startsWith(raiz + path.sep) || !fs.existsSync(f)) f = path.join(raiz, '404.html');
    const pre = (q.headers['x-prefijo'] || '') + '/sitio/' + m[1], ext = path.extname(f).toLowerCase();
    if (ext === '.html') { r.writeHead(200, { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'no-cache', ...(w.dominio ? { 'x-robots-tag': 'noindex' } : {}) }); return r.end(fs.readFileSync(f, 'utf8').replace(/(href|src)="\/(?!\/)/g, `$1="${pre}/`)); }
    const tipos = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };
    r.writeHead(200, { 'content-type': tipos[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=3600' }); return r.end(fs.readFileSync(f)); } }
  { const m = ruta.match(/^\/cliente\/([a-f0-9]{36})\/(foto|accion|img\/.+)?$/); if (m) return portalCliente(m[1], m[2] || '', q, r, body, ip); } // 📷 portal privado de cada cliente
  if (ruta === '/' || ruta === '/index.html') return enviar(200, 'text/html;charset=utf-8', pagina(A, url));
  if (ruta === '/privacidad') return enviar(200, 'text/html;charset=utf-8', privacidad(A));
  { const m = ruta.match(/^\/ejemplos\/([a-z]{3,20})(\/|\/index\.html|\.jpg)?$/); if (m) { const base = path.join(__dirname, 'assets', 'demos'); // 🖼️ webs de ejemplo por rubro
    if (m[2] === '.jpg' && fs.existsSync(path.join(base, m[1] + '.jpg'))) { r.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' }); return r.end(fs.readFileSync(path.join(base, m[1] + '.jpg'))); }
    if (!m[2]) { r.writeHead(301, { location: (q.headers['x-prefijo'] || '') + '/ejemplos/' + m[1] + '/' }); return r.end(); }
    if (fs.existsSync(path.join(base, m[1], 'index.html'))) return enviar(200, 'text/html;charset=utf-8', fs.readFileSync(path.join(base, m[1], 'index.html'), 'utf8')); } }
  if (ruta === '/og.jpg') { const f = path.join(DATA, 'agencia-og.jpg'), g = fs.existsSync(f) ? f : path.join(__dirname, 'assets', 'studio-og.jpg'); r.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' }); return r.end(fs.readFileSync(g)); } // imagen al compartir (puedes poner la tuya en data/agencia-og.jpg)
  if (ruta === '/robots.txt') return enviar(200, 'text/plain', `User-agent: *\nAllow: /\nDisallow: /chat\nSitemap: ${url}sitemap.xml\n`);
  if (ruta === '/sitemap.xml') return enviar(200, 'application/xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc></url></urlset>`);
  return enviar(404, 'text/html;charset=utf-8', '<p>No encontrado. <a href="/">Volver</a></p>');
}

// ---------------- 📷 Portal privado del cliente: sube y ordena sus fotos por celebración ----------------
async function portalCliente(token, sub, q, r, body, ip) {
  const W = require('./webs'), w = W.porPortal(token), enviar = (code, tipo, t) => { r.writeHead(code, { 'content-type': tipo, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }); r.end(t); };
  if (!w) return enviar(404, 'text/html;charset=utf-8', '<p style="font-family:sans-serif">Este enlace no es válido o fue cambiado. Pídele el nuevo enlace a tu asesor.</p>');
  if (sub === 'foto' && q.method === 'POST') { if (limite('pf:' + ip, 300, 3600e3)) return enviar(429, 'application/json', '{"error":"Demasiadas fotos seguidas"}');
    try { const p = new URL(q.url, 'http://x').searchParams; await W.subirFoto(w.id, body, p.get('nombre'), p.get('cat')); return enviar(200, 'application/json', '{"ok":1}'); } catch (e) { return enviar(400, 'application/json', JSON.stringify({ error: e.message })); } }
  if (sub === 'accion' && q.method === 'POST') { try { const o = JSON.parse(String(body || '{}'));
      if (o.accion === 'publicar') return enviar(200, 'application/json', JSON.stringify(W.publicarDesdePortal(w)));
      if (o.accion === 'datos') return enviar(200, 'application/json', JSON.stringify(W.datosDesdePortal(w, o)));
      if (['quitarFoto', 'catFoto', 'portadaFoto'].includes(o.accion)) { await W.accion({ ...o, id: w.id }); return enviar(200, 'application/json', '{"ok":1}'); }
      throw new Error('Acción no permitida'); } catch (e) { return enviar(400, 'application/json', JSON.stringify({ error: e.message })); } }
  if (sub.startsWith('img/')) { const f = path.join(W.ASSETS(w), sub.slice(4)); if (!f.startsWith(W.ASSETS(w) + path.sep) || !fs.existsSync(f)) return enviar(404, 'text/plain', ''); r.writeHead(200, { 'content-type': 'image/webp', 'cache-control': 'private, max-age=3600' }); return r.end(fs.readFileSync(f)); }
  const fotos = w.fotos || [], cat = w.fotoCat || {}, cats = [...new Set([...(w.textos?.servicios || []).map(x => x.t), ...Object.values(cat)].filter(Boolean))];
  const grupos = {}; for (const f of fotos) (grupos[cat[f] || 'Sin categoría'] = grupos[cat[f] || 'Sin categoría'] || []).push(f);
  const c = w.color || '#7c3aed';
  return enviar(200, 'text/html;charset=utf-8', `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Mi panel · ${esc(w.nombre)}</title>
<style>*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,-apple-system,Roboto,sans-serif;background:#f8fafc;color:#0f172a}header{background:${c};color:#fff;padding:18px}header h1{margin:0;font-size:1.3rem}.w{max-width:900px;margin:0 auto;padding:14px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin:12px 0}
label{display:block;font-weight:600;margin:8px 0 4px}input,select{font:inherit;padding:11px;border:1px solid #cbd5e1;border-radius:10px;width:100%}.btn{display:inline-block;background:${c};color:#fff;border:0;border-radius:999px;padding:12px 22px;font-weight:700;font-size:1rem;cursor:pointer}.btn.verde{background:#16a34a}.btn:disabled{opacity:.6}
h2{font-size:1.1rem;margin:18px 0 8px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}.f{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-size:.8rem}.f img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}.f div{display:flex;gap:4px;padding:5px;align-items:center}.f select{padding:4px;font-size:.78rem}.f button{border:0;background:#f1f5f9;border-radius:8px;padding:5px 7px;cursor:pointer}.port{outline:3px solid ${c}}#est{font-weight:600;margin-top:8px}</style></head><body>
<header><h1>🛠️ Mi panel · ${esc(w.nombre)}</h1><div style="opacity:.9;font-size:.92rem">Tu panel para manejar tu página web: sube tus fotos por categoría, cambia tus datos o pon una promoción.</div></header><div class="w">
<div class="card"><b>📷 Subir fotos</b><label>¿De qué categoría o celebración son estas fotos?</label><select id="cat"><option value="">Elige una…</option>${cats.map(x => `<option>${esc(x)}</option>`).join('')}<option value="__nueva">➕ Otra (escribir)</option></select><input id="nueva" placeholder="Ej: Baby shower, 50 años, Graduación" style="display:none;margin-top:8px">
<label>Fotos (puedes elegir varias)</label><input type="file" id="files" accept="image/*" multiple><p style="margin:12px 0 0"><button class="btn" id="subir">⬆ Subir fotos</button></p><div id="est"></div></div>
<details class="card"><summary style="cursor:pointer;font-weight:700">✏️ Datos de mi negocio y promoción</summary>
<label>📣 Promoción o aviso (aparece arriba en tu web; déjalo vacío para quitarlo)</label><input id="d-promo" maxlength="160" value="${esc(w.cliente?.promo || '')}" placeholder="Ej: Este mes 10% de descuento en baby showers">
<label>WhatsApp (con código de país)</label><input id="d-whatsapp" value="${esc(w.cliente?.whatsapp || '')}" inputmode="tel">
<label>Horario</label><input id="d-horario" value="${esc(w.cliente?.horario || '')}">
<label>Dirección</label><input id="d-direccion" value="${esc(w.cliente?.direccion || '')}">
<label>Correo</label><input id="d-correo" type="email" value="${esc(w.correo || '')}">
<p style="margin:12px 0 0"><button class="btn" id="guardarDatos">💾 Guardar datos</button></p></details>
<div class="card"><b>¿Terminaste?</b> Pulsa para actualizar tu página web con tus cambios.<p style="margin:10px 0 0"><button class="btn verde" id="pub">✅ Publicar cambios</button></p></div>
${(w.chats || []).length ? `<details class="card"><summary style="cursor:pointer;font-weight:700">🤖 Consultas de tu asistente de chat (${w.chats.length})</summary><p style="color:#64748b;font-size:.9rem;margin:6px 0">Lo que preguntaron los visitantes de tu web. ✅ = pasó a tu WhatsApp.</p>${w.chats.slice(0, 40).map(c => `<div style="border-top:1px solid #e2e8f0;padding:8px 0"><small style="color:#64748b">${esc(new Date(c.act || c.fecha).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }))} · ${c.mensajes || 0} mensajes${c.whatsapp ? ' · ✅ WhatsApp' : ''}</small><div style="white-space:pre-wrap">${esc(c.resumen || '')}</div></div>`).join('')}</details>` : ''}
<p style="color:#64748b;font-size:.9rem">Tienes ${fotos.length} fotos guardadas. La que tiene borde de color es la portada de tu web.</p>
${Object.entries(grupos).map(([g, fs_]) => `<h2>${esc(g)} <small style="color:#64748b;font-weight:400">(${fs_.length})</small></h2><div class="g">${fs_.map(f => `<div class="f${f === fotos[0] ? ' port' : ''}"><img src="img/${esc(f)}" alt="" loading="lazy"><div><select data-f="${esc(f)}" title="Celebración"><option value="">Sin categoría</option>${cats.map(x => `<option ${cat[f] === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select><button data-port="${esc(f)}" title="Usar de portada">⭐</button><button data-del="${esc(f)}" title="Borrar">🗑</button></div></div>`).join('')}</div>`).join('')}
</div><script>
const $=s=>document.querySelector(s),acc=o=>fetch('accion',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(o)}).then(r=>r.json());
$('#cat').onchange=()=>{$('#nueva').style.display=$('#cat').value==='__nueva'?'block':'none'};
$('#subir').onclick=async()=>{const cat=$('#cat').value==='__nueva'?$('#nueva').value.trim():$('#cat').value,F=[...$('#files').files];if(!cat)return alert('Elige la celebración');if(!F.length)return alert('Elige las fotos');$('#subir').disabled=true;let ok=0;
for(const [i,f] of F.entries()){$('#est').textContent='Subiendo '+(i+1)+' de '+F.length+'…';if(f.size>24e6){alert(f.name+' pesa más de 24 MB');continue}const r=await fetch('foto?'+new URLSearchParams({cat,nombre:f.name}),{method:'POST',body:f});const j=await r.json().catch(()=>({}));if(j.ok)ok++;else alert(j.error||'No se pudo subir '+f.name)}
$('#est').textContent='✅ '+ok+' fotos subidas. Ahora pulsa «Publicar cambios».';setTimeout(()=>location.reload(),1200)};
document.addEventListener('change',async e=>{const f=e.target.dataset&&e.target.dataset.f;if(!f)return;await acc({accion:'catFoto',foto:f,categoria:e.target.value});location.reload()});
document.addEventListener('click',async e=>{const p=e.target.dataset&&e.target.dataset.port,d=e.target.dataset&&e.target.dataset.del;if(p){await acc({accion:'portadaFoto',foto:p});location.reload()}if(d&&confirm('¿Borrar esta foto?')){await acc({accion:'quitarFoto',foto:d});location.reload()}});
$('#guardarDatos').onclick=async()=>{const o={accion:'datos'};for(const k of ['promo','whatsapp','horario','direccion','correo'])o[k]=$('#d-'+k).value;const j=await acc(o);alert(j.error||'💾 Datos guardados. Pulsa «Publicar cambios» para verlos en tu web.')};
$('#pub').onclick=async()=>{$('#pub').disabled=true;const j=await acc({accion:'publicar'});alert(j.error||(j.publicado?'✅ ¡Listo! Tu página se está actualizando (1 a 3 minutos).':'✅ Cambios guardados. Tu asesor publicará la página.'));$('#pub').disabled=false};
</script></body></html>`);
}

// ---------------- CRM (panel) ----------------
const listar = () => ({ cfg: cfg(), etapas: ETAPAS, leads: C.leads.map(l => ({ ...l, conversacion: (l.conversacion || []).slice(-30) })), sesiones: Object.keys(C.sesiones).length });
async function accion(o) {
  const a = o.accion;
  if (a === 'cfg') { const A = { ...(db.settings.agencia || {}) };
    for (const k of ['marca', 'dominio', 'whatsapp', 'correo', 'ciudad', 'pais', 'color', 'entrega', 'pagos', 'dominioIncluido', 'extra']) if (o[k] !== undefined) A[k] = String(o[k]).trim().slice(0, k === 'extra' ? 4000 : 300);
    A.dominio = String(A.dominio || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (Array.isArray(o.planes)) A.planes = o.planes.slice(0, 6).map(p => ({ plan: String(p.plan || '').slice(0, 60), desde: String(p.desde || '').slice(0, 40), incluye: String(p.incluye || '').slice(0, 400) })).filter(p => p.plan);
    db.settings.agencia = A; saveAll.settings(); return listar(); }
  const l = C.leads.find(x => x.id === o.id);
  if (a === 'nuevo') { const n = guardarLead(o, { origen: 'manual' }); if (!n) throw new Error('Pon al menos WhatsApp o correo'); return listar(); }
  if (!l) throw new Error('Cliente no encontrado');
  if (a === 'etapa') { if (!ETAPAS.includes(o.etapa)) throw new Error('Etapa inválida'); l.etapa = o.etapa; l.notas.push({ f: new Date().toISOString(), t: '→ ' + o.etapa }); }
  else if (a === 'nota') { const t = String(o.texto || '').trim().slice(0, 1000); if (!t) throw new Error('Nota vacía'); l.notas.push({ f: new Date().toISOString(), t }); }
  else if (a === 'datos') { for (const k of ['nombre', 'negocio', 'rubro', 'ciudad', 'whatsapp', 'correo', 'necesidad', 'plan', 'proximo']) if (o[k] !== undefined) l[k] = String(o[k]).slice(0, 400); }
  else if (a === 'crearWeb') { if (!l.negocio && !l.nombre) throw new Error('Falta el nombre del negocio');
    const r = await require('./webs').accion({ accion: 'crear', tipo: 'cliente', nombre: l.negocio || l.nombre, rubro: l.rubro || l.necesidad || 'negocio', servicios: l.necesidad || '', whatsapp: l.whatsapp, ciudad: l.ciudad, correo: l.correo });
    l.web = r.id; l.notas.push({ f: new Date().toISOString(), t: '🌐 Web creada en «Web para clientes»' }); if (l.etapa === 'nuevo' || l.etapa === 'contactado') l.etapa = 'propuesta'; }
  else if (a === 'borrar') C.leads = C.leads.filter(x => x !== l);
  else throw new Error('Acción desconocida');
  l.actualizado = new Date().toISOString(); guardar(); return listar();
}

module.exports = { publico, listar, accion, cfg, conocimiento, quince };
