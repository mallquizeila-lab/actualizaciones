// 📣 Agente de Difusión: lleva Yupitok a todo el mundo desde TUS cuentas oficiales.
//  ⚡ Automática: publica solo (3 a 6 veces al día, en el idioma de cada cuenta) usando la conexión oficial de cada red.
//  ✋ Semi-automática: cada día te deja los textos listos para copiar y pegar donde no hay conexión oficial (WhatsApp, Reddit, foros…).
// Nunca crea cuentas ni publica desde cuentas que no sean tuyas. Las claves se guardan solo en esta PC/VPS.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DATA, E, uid, parseJSON, day } = require('./util');
const FILE = path.join(DATA, 'difusion.json');
const BASE = () => ({ conexiones: [], historial: [], hechos: {}, registro: {}, kitIdiomas: ['es', 'en'], kit: null, foroIdx: 0, textos: {} });
const D = (() => { try { return Object.assign(BASE(), JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) { return BASE(); } })();
const guardar = () => { D.historial = D.historial.slice(-400); fs.writeFileSync(FILE, JSON.stringify(D, null, 1)); };
const SITIO = () => { let u = ''; try { u = require('./viral').urlPublica(); } catch (e) {} return (u && !/localhost|127\.0\.0\.1|trycloudflare/.test(u) ? u : 'https://yupitok.com').replace(/\/$/, ''); };
const V = () => require('./viral');
const FAKE = () => !!E.DIFUSION_FAKE;

// ---------- Horarios del sol (hora de Perú) ----------
const HORARIOS = [
  { h: 6, zona: 'Europa y África', tipo: 'dibujo' }, { h: 8, zona: 'Latinoamérica', tipo: 'trivia' }, { h: 12, zona: 'EE. UU. y Latinoamérica', tipo: 'cuento' },
  { h: 17, zona: 'Salida del colegio en América', tipo: 'juego' }, { h: 20, zona: 'Asia', tipo: 'dibujo' }, { h: 23, zona: 'India, Medio Oriente y Rusia', tipo: 'cuento' }];
const IDIOMAS = { es: 'español', en: 'English', pt: 'português (Brasil)', fr: 'français', de: 'Deutsch', it: 'italiano', ru: 'русский', ja: '日本語', ko: '한국어', zh: '中文', id: 'Bahasa Indonesia', tr: 'Türkçe' };

// ---------- Redes con publicación automática oficial ----------
const REDES = {
  telegram: { n: 'Telegram (canal)', campos: [['token', 'Token del bot (de @BotFather)'], ['chat', 'Canal (ej. @yupitok_es)']], horas: [8, 12, 20] },
  discord: { n: 'Discord (tu servidor)', campos: [['webhook', 'URL del webhook del canal']], horas: [12, 17, 20] },
  bluesky: { n: 'Bluesky', campos: [['handle', 'Usuario (ej. yupitok.bsky.social)'], ['password', 'Contraseña de app']], horas: [6, 12, 17] },
  mastodon: { n: 'Mastodon', campos: [['instancia', 'Servidor (ej. https://mastodon.social)'], ['token', 'Token de acceso']], horas: [6, 12, 20] },
  x: { n: 'X (Twitter)', campos: [['apiKey', 'API Key'], ['apiSecret', 'API Key Secret'], ['accessToken', 'Access Token'], ['accessSecret', 'Access Token Secret']], horas: [8, 12, 17] },
  threads: { n: 'Threads', campos: [['userId', 'ID de usuario de Threads'], ['token', 'Token de acceso']], horas: [8, 12, 17] },
  instagram: { n: 'Instagram (profesional)', campos: [['userId', 'ID de la cuenta de Instagram'], ['token', 'Token de acceso']], horas: [8, 17, 20], imagen: true },
  facebook: { n: 'Página de Facebook', campos: [['pageId', 'ID de la página'], ['token', 'Token de la página']], horas: [8, 12, 17] },
  pinterest: { n: 'Pinterest', campos: [['token', 'Token de acceso'], ['board', 'Nombre del tablero (ej. Dibujos para colorear gratis) o su enlace']], horas: [6, 12, 20], imagen: true },
  vk: { n: 'VK (comunidad)', campos: [['token', 'Token de la comunidad'], ['grupo', 'ID numérico de la comunidad']], horas: [6, 12, 23] },
  tumblr: { n: 'Tumblr', campos: [['blog', 'Nombre del blog (ej. yupitok)'], ['consumerKey', 'Consumer Key'], ['consumerSecret', 'Consumer Secret'], ['token', 'Token'], ['tokenSecret', 'Token Secret']], horas: [12, 17, 20] },
};

// ---------- Lista para registrarte (en orden de prioridad) ----------
const REGISTRO = [
  ['pinterest', 'Pinterest (cuenta de empresa)', 'https://business.pinterest.com', 'auto', 'Crea la cuenta de empresa, un tablero por idioma y pide «Standard access» en developers.pinterest.com'],
  ['instagram', 'Instagram profesional', 'https://www.instagram.com', 'auto', 'Pásala a cuenta profesional y únela a tu página de Facebook; el token sale de developers.facebook.com'],
  ['threads', 'Threads', 'https://www.threads.net', 'auto', 'Entra con tu Instagram; el token sale de developers.facebook.com (producto Threads)'],
  ['telegram', 'Telegram: canales por idioma', 'https://telegram.org', 'auto', 'Crea los canales @yupitok_es, @yupitok_en, @yupitok_pt…, un bot con @BotFather y hazlo administrador de cada canal'],
  ['x', 'X (Twitter)', 'https://x.com', 'auto', 'Crea la cuenta y una app gratis en developer.x.com con permiso de «Read and write»'],
  ['bluesky', 'Bluesky', 'https://bsky.app', 'auto', 'Crea la cuenta; en Ajustes → Contraseñas de app crea una para ShortForge'],
  ['tiktok', 'TikTok (pedir revisión de la app)', 'https://developers.tiktok.com', 'aprob', 'Crea la cuenta y pide ya la revisión de la app: es la que más tarda'],
  ['youtube', 'YouTube (ya conectado)', 'https://studio.youtube.com', 'auto', 'Ya publica ShortForge; marca los videos para niños como «contenido para niños»'],
  ['facebook', 'Página de Facebook (ya conectada)', 'https://facebook.com', 'auto', 'Usa el token de la página'],
  ['discord', 'Discord: tu servidor', 'https://discord.com', 'auto', 'Crea el servidor Yupitok, un canal #novedades y un webhook (Editar canal → Integraciones)'],
  ['mastodon', 'Mastodon', 'https://mastodon.social', 'auto', 'Crea la cuenta, márcala como bot y crea una aplicación en Preferencias → Desarrollo'],
  ['vk', 'VK (comunidad)', 'https://vk.com', 'auto', 'Crea una comunidad y un token en Gestionar → Trabajo con la API'],
  ['tumblr', 'Tumblr', 'https://www.tumblr.com', 'auto', 'Crea el blog y una app en tumblr.com/oauth/apps'],
  ['blogger', 'Blogger (blogs por idioma)', 'https://www.blogger.com', 'pronto', 'Crea un blog por idioma; la conexión llega en la próxima versión'],
  ['dailymotion', 'Dailymotion', 'https://www.dailymotion.com', 'pronto', 'Para subir los Shorts en Francia, Europa y Asia (próxima versión)'],
  ['itchio', 'itch.io (juegos)', 'https://itch.io', 'manual', 'Sube GLORY BROWN, Huerto y las Aventuras con enlace a Yupitok'],
  ['crazygames', 'CrazyGames para desarrolladores', 'https://developer.crazygames.com', 'manual', 'Envía tus juegos propios (pueden pagarte por partidas)'],
  ['poki', 'Poki para desarrolladores', 'https://developers.poki.com', 'manual', 'Envía tus juegos propios'],
  ['tpt', 'Teachers Pay Teachers', 'https://www.teacherspayteachers.com', 'manual', 'Sube dibujos y fichas gratis con tu marca'],
  ['tes', 'TES', 'https://www.tes.com', 'manual', 'Sube recursos gratis para docentes'],
  ['islcollective', 'iSLCollective', 'https://islcollective.com', 'manual', 'Fichas de inglés para profesores'],
  ['wordwall', 'Wordwall', 'https://wordwall.net', 'manual', 'Actividades de repaso con enlace a la Academy'],
  ['whatsapp', 'Canal de WhatsApp', 'https://www.whatsapp.com/channel', 'manual', 'Crea el canal Yupitok desde tu WhatsApp (Novedades → Canales)'],
  ['reddit', 'Reddit (cuenta real)', 'https://www.reddit.com', 'manual', 'Participa primero; comparte solo donde se permite'],
  ['quora', 'Quora', 'https://www.quora.com', 'manual', 'Responde preguntas de padres y docentes'],
  ['snapchat', 'Snapchat (perfil público)', 'https://www.snapchat.com', 'manual', 'Muy usado en Arabia Saudí y EE. UU.'],
  ['linkedin', 'LinkedIn (página)', 'https://www.linkedin.com', 'manual', 'Para colegios y docentes'],
  ['line', 'LINE (cuenta oficial)', 'https://www.linebiz.com', 'pronto', 'Japón, Tailandia y Taiwán'],
  ['viber', 'Viber (canal)', 'https://www.viber.com', 'pronto', 'Europa del Este, Medio Oriente y Filipinas'],
].map(([k, n, url, modo, pasos]) => ({ k, n, url, modo, pasos }));

// ---------- Redes y foros semi-automáticos (textos listos para pegar) ----------
const MANUALES = [['whatsapp', 'Canal de WhatsApp'], ['reddit', 'Reddit'], ['quora', 'Quora'], ['snapchat', 'Snapchat'], ['linkedin', 'LinkedIn'], ['kwai', 'Kwai'], ['facebookGrupos', 'Grupos de Facebook de docentes y padres (con permiso del admin)']];
const FOROS = [['r/Teachers', 'https://www.reddit.com/r/Teachers', 'en'], ['r/ElementaryTeachers', 'https://www.reddit.com/r/ElementaryTeachers', 'en'], ['r/ESL_Teachers', 'https://www.reddit.com/r/ESL_Teachers', 'en'], ['r/TEFL', 'https://www.reddit.com/r/TEFL', 'en'], ['r/homeschool', 'https://www.reddit.com/r/homeschool', 'en'], ['r/Parenting', 'https://www.reddit.com/r/Parenting', 'en'], ['r/Mommit', 'https://www.reddit.com/r/Mommit', 'en'], ['r/daddit', 'https://www.reddit.com/r/daddit', 'en'], ['r/edtech', 'https://www.reddit.com/r/edtech', 'en'], ['r/languagelearning', 'https://www.reddit.com/r/languagelearning', 'en'], ['r/WebGames', 'https://www.reddit.com/r/WebGames', 'en'], ['r/IndieGaming', 'https://www.reddit.com/r/IndieGaming', 'en'], ['r/coloring', 'https://www.reddit.com/r/coloring', 'en'], ['r/learnprogramming', 'https://www.reddit.com/r/learnprogramming', 'en'],
  ['Mumsnet', 'https://www.mumsnet.com', 'en'], ['Netmums', 'https://www.netmums.com', 'en'], ['BabyCenter Community', 'https://community.babycenter.com', 'en'], ['What to Expect', 'https://community.whattoexpect.com', 'en'], ["Dave's ESL Cafe", 'https://www.eslcafe.com', 'en'], ['TES Community', 'https://www.tes.com', 'en'], ['ProTeacher Community', 'https://www.proteacher.net', 'en'], ['A to Z Teacher Stuff', 'https://forums.atozteacherstuff.com', 'en'], ['The Well-Trained Mind', 'https://forums.welltrainedmind.com', 'en'], ['Quora', 'https://www.quora.com', 'en'], ['Parenting Stack Exchange', 'https://parenting.stackexchange.com', 'en'], ['Brainly', 'https://brainly.com', 'en'], ['HTML5GameDevs', 'https://www.html5gamedevs.com', 'en'], ['TIGSource', 'https://forums.tigsource.com', 'en'], ['Foros de itch.io', 'https://itch.io/community', 'en'], ['IndieDB', 'https://www.indiedb.com', 'en'],
  ['Grupos de Facebook de docentes', 'https://www.facebook.com/groups', 'es'], ['Grupos de Telegram de docentes', 'https://telegram.org', 'es'], ['Todoele', 'https://www.todoele.net', 'es'], ['Mediavida', 'https://www.mediavida.com', 'es'], ['Foros de 3DJuegos', 'https://www.3djuegos.com', 'es'], ['Grupos de professores (Facebook)', 'https://www.facebook.com/groups', 'pt'], ['Fórum Adrenaline', 'https://forum.adrenaline.com.br', 'pt'], ['Doctissimo', 'https://forum.doctissimo.fr', 'fr'], ['Forums enseignants du primaire', 'https://www.forums-enseignants-du-primaire.com', 'fr'], ['jeuxvideo.com', 'https://www.jeuxvideo.com/forums.htm', 'fr'], ['urbia.de', 'https://www.urbia.de', 'de'], ['4teachers.de', 'https://www.4teachers.de', 'de'], ['Lehrerforen.de', 'https://www.lehrerforen.de', 'de'], ['alfemminile', 'https://forum.alfemminile.com', 'it'], ['Pikabu', 'https://pikabu.ru', 'ru'], ['Nachalka.com', 'https://nachalka.com', 'ru'], ['Habr', 'https://habr.com', 'ru'], ['Yahoo! Chiebukuro', 'https://chiebukuro.yahoo.co.jp', 'ja'], ['Hatena Bookmark', 'https://b.hatena.ne.jp', 'ja'], ['Naver Cafe', 'https://cafe.naver.com', 'ko'], ['Kaskus', 'https://www.kaskus.co.id', 'id'], ['Ekşi Sözlük', 'https://eksisozluk.com', 'tr']].map(([n, url, l]) => ({ n, url, l }));

// ---------- Firma OAuth 1.0a (X y Tumblr) ----------
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
function oauth1(method, url, params, k, fijo = {}) {
  const o = { oauth_consumer_key: k.ck, oauth_nonce: fijo.nonce || crypto.randomBytes(16).toString('hex'), oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: fijo.ts || String(Math.floor(Date.now() / 1000)), oauth_token: k.tk, oauth_version: '1.0' };
  const all = { ...params, ...o }, base = [method.toUpperCase(), enc(url), enc(Object.keys(all).sort().map(x => enc(x) + '=' + enc(all[x])).join('&'))].join('&');
  o.oauth_signature = crypto.createHmac('sha1', enc(k.cs) + '&' + enc(k.ts)).update(base).digest('base64');
  return 'OAuth ' + Object.keys(o).sort().map(x => `${enc(x)}="${enc(o[x])}"`).join(', ');
}

// ---------- Publicar en cada red (APIs oficiales) ----------
const pedir = async (url, opt = {}) => { const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(30000) }); const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch (e) {} if (!r.ok || j.error || j.ok === false) throw new Error(String(j.error?.message || j.error?.error_msg || j.description || j.message || j.error || t).slice(0, 200) || 'Error ' + r.status); return j; };
const formu = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
async function publicarEn(c, p) { // p: { texto, corto, url, titulo, desc, imagen, idioma }
  const k = c.cred || {};
  if (FAKE()) return { ok: 1, id: 'prueba-' + uid(), fake: true };
  switch (c.red) {
    case 'telegram': return p.imagen ? pedir(`https://api.telegram.org/bot${k.token}/sendPhoto`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: k.chat, photo: p.imagen, caption: p.texto.slice(0, 1000) }) })
      : pedir(`https://api.telegram.org/bot${k.token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: k.chat, text: p.texto }) });
    case 'discord': { const r = await fetch(k.webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: p.texto.slice(0, 1900) }), signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error('Discord ' + r.status); return { ok: 1 }; }
    case 'mastodon': return pedir(String(k.instancia).replace(/\/$/, '') + '/api/v1/statuses', { method: 'POST', headers: { authorization: 'Bearer ' + k.token }, body: formu({ status: p.texto.slice(0, 480), language: p.idioma }) });
    case 'bluesky': {
      const s = await pedir('https://bsky.social/xrpc/com.atproto.server.createSession', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: k.handle, password: k.password }) });
      let texto = p.corto; if ([...texto].length > 290) texto = [...texto].slice(0, 280).join('') + '…'; texto += '\n' + p.url;
      const ini = Buffer.byteLength(texto.slice(0, texto.lastIndexOf(p.url))), fin = ini + Buffer.byteLength(p.url);
      const record = { $type: 'app.bsky.feed.post', text: texto, createdAt: new Date().toISOString(), langs: [p.idioma], facets: [{ index: { byteStart: ini, byteEnd: fin }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: p.url }] }], embed: { $type: 'app.bsky.embed.external', external: { uri: p.url, title: p.titulo.slice(0, 100), description: p.desc.slice(0, 200) } } };
      return pedir('https://bsky.social/xrpc/com.atproto.repo.createRecord', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + s.accessJwt }, body: JSON.stringify({ repo: s.did, collection: 'app.bsky.feed.post', record }) });
    }
    case 'x': { const u = 'https://api.x.com/2/tweets', t = p.corto.slice(0, 250) + '\n' + p.url; return pedir(u, { method: 'POST', headers: { 'content-type': 'application/json', authorization: oauth1('POST', u, {}, { ck: k.apiKey, cs: k.apiSecret, tk: k.accessToken, ts: k.accessSecret }) }, body: JSON.stringify({ text: t }) }); }
    case 'tumblr': { const u = `https://api.tumblr.com/v2/blog/${encodeURIComponent(k.blog)}/posts`; return pedir(u, { method: 'POST', headers: { 'content-type': 'application/json', authorization: oauth1('POST', u, {}, { ck: k.consumerKey, cs: k.consumerSecret, tk: k.token, ts: k.tokenSecret }) }, body: JSON.stringify({ content: [...(p.imagen ? [{ type: 'image', media: [{ url: p.imagen }] }] : []), { type: 'text', text: p.texto }], tags: 'yupitok,kids,education' }) }); }
    case 'threads': { const b = 'https://graph.threads.net/v1.0/' + k.userId; const r = await pedir(b + '/threads', { method: 'POST', body: formu({ media_type: p.imagen ? 'IMAGE' : 'TEXT', image_url: p.imagen, text: p.texto.slice(0, 490), access_token: k.token }) });
      await new Promise(x => setTimeout(x, p.imagen ? 15000 : 3000)); return pedir(b + '/threads_publish', { method: 'POST', body: formu({ creation_id: r.id, access_token: k.token }) }); }
    case 'instagram': { if (!p.imagen) throw new Error('Instagram necesita una imagen'); const b = 'https://graph.facebook.com/v21.0/' + k.userId; const r = await pedir(b + '/media', { method: 'POST', body: formu({ image_url: p.imagen, caption: p.texto.slice(0, 2100), access_token: k.token }) });
      await new Promise(x => setTimeout(x, 15000)); return pedir(b + '/media_publish', { method: 'POST', body: formu({ creation_id: r.id, access_token: k.token }) }); }
    case 'facebook': return pedir(`https://graph.facebook.com/v21.0/${k.pageId}/feed`, { method: 'POST', body: formu({ message: p.texto, link: p.url, access_token: k.token }) });
    case 'pinterest': { if (!p.imagen) throw new Error('Pinterest necesita una imagen');
      let bid = /^\d+$/.test(String(k.board).trim()) ? String(k.board).trim() : c.boardId;
      if (!bid) { // se escribe el nombre o el enlace del tablero: se busca su número en tu cuenta
        const L = await pedir('https://api.pinterest.com/v5/boards?page_size=100', { headers: { authorization: 'Bearer ' + k.token } }), q = String(k.board).trim().toLowerCase().replace(/\/+$/, ''), slug = q.split('/').pop();
        const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const b = (L.items || []).find(x => x.name.toLowerCase() === q || norm(x.name) === norm(slug)); if (!b) throw new Error('No encontré el tablero «' + k.board + '». Tus tableros: ' + (L.items || []).map(x => x.name).join(', '));
        bid = c.boardId = b.id; guardar(); }
      return pedir('https://api.pinterest.com/v5/pins', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + k.token }, body: JSON.stringify({ board_id: bid, title: p.titulo.slice(0, 100), description: p.texto.slice(0, 480), link: p.url, alt_text: p.titulo.slice(0, 450), media_source: { source_type: 'image_url', url: p.imagen } }) }); }
    case 'vk': return pedir('https://api.vk.com/method/wall.post', { method: 'POST', body: formu({ owner_id: '-' + String(k.grupo).replace(/\D/g, ''), from_group: 1, message: p.texto, attachments: p.url, access_token: k.token, v: '5.199' }) });
  }
  throw new Error('Red no soportada');
}

// ---------- Contenido del día y textos en cada idioma ----------
async function contenido() { try { return await V().admin('academia/para-difundir'); } catch (e) { return null; } }
function elegir(tipo, C, usados) {
  const u = new Set(usados), nuevo = l => l.find(x => !u.has(x.k)) || l[Math.floor(Math.random() * l.length)];
  const L = { dibujo: (C.laminas || []).map(x => ({ k: 'l:' + x.slug, tipo, titulo: x.titulo, emoji: x.emoji, desc: String(x.texto || '').replace(/<[^>]+>/g, ''), ruta: '/academia/colorear/' + x.slug, imagen: x.png ? SITIO() + '/laminas/' + x.slug + '.png' : null })).reverse(),
    cuento: [...(C.cuentos || []).map(x => ({ k: 'c:' + x.slug, tipo, titulo: x.titulo, emoji: x.emoji, desc: x.resumen, ruta: '/academia/cuentos/' + x.slug })), ...(C.lecciones || []).map(x => ({ k: 'e:' + x.curso + '/' + x.slug, tipo: 'leccion', titulo: x.titulo, emoji: x.emoji, desc: x.desc, ruta: `/academia/${x.curso}/${x.slug}` }))].reverse(),
    trivia: (C.preguntas || []).map((q, i) => ({ k: 'q:' + q.p.slice(0, 40), tipo, titulo: q.p, emoji: '🏆', desc: q.ops.join(' · '), ruta: '/academia/trivia', resp: q.ops[q.ok] })),
    juego: [{ k: 'j:glory', titulo: 'GLORY BROWN: El Choque de los Reinos', emoji: '👑', desc: 'Batallas de cartas en línea 1 vs 1 y 2 vs 2 con 127 personajes, gratis en el navegador.', ruta: '/glory' }, { k: 'j:huerto', titulo: 'Huerto Defensor', emoji: '🌱', desc: 'Defiende la chacra de las plagas con choclos, cocos y ajíes en 30 niveles.', ruta: '/?g=arcade-huerto' }, { k: 'j:aventura', titulo: 'Las Aventuras de Yupi (3D)', emoji: '🗺️', desc: 'Aventura 3D con Yupi y sus amigos, con un jefe final y preguntas del Sabio Búho.', ruta: '/?g=arcade-aventura' }, { k: 'j:trivia', titulo: 'Trivia en vivo con amigos', emoji: '🏆', desc: 'Crea una sala con código y compitan respondiendo preguntas.', ruta: '/academia/trivia' }, { k: 'j:colorear', titulo: 'Dibujos para colorear en línea', emoji: '🎨', desc: 'Toca y pinta, aprende los colores en inglés y descarga tu dibujo.', ruta: '/academia/colorear' }].map(x => ({ ...x, tipo })) };
  const l = L[tipo] && L[tipo].length ? L[tipo] : L.juego; return nuevo(l);
}
const PLANTILLA = { es: (it) => `${it.emoji} ${it.titulo}\n${it.desc}\n¡Gratis en Yupitok, sin instalar nada!`, en: (it) => `${it.emoji} ${it.titulo}\n${it.desc}\nFree on Yupitok, no download needed!`, pt: (it) => `${it.emoji} ${it.titulo}\n${it.desc}\nGrátis no Yupitok, sem instalar nada!` };
async function textoBase(it, idioma) {
  const clave = it.k + '|' + idioma + '|' + day(); if (D.textos[clave]) return D.textos[clave];
  let t = null; try { const ai = require('./ai'); if (ai.active().length) { const r = await ai.ask(`Escribe una publicación para redes sociales en ${IDIOMAS[idioma] || idioma}, cálida y entusiasta, dirigida a padres, docentes y niños (contenido educativo y seguro). Tema: ${it.emoji} ${it.titulo}. Detalle: ${it.desc}.${it.extra ? ' ' + it.extra : ''}${it.tipo === 'trivia' ? ' Es una pregunta de trivia: invita a responder en la trivia en vivo (no des la respuesta).' : ''} Termina invitando a jugar o aprender gratis en Yupitok, sin instalar nada. Sin hashtags inventados de marcas, sin promesas de dinero. Devuelve SOLO JSON: {"largo":"texto de 2 a 4 frases con 1 o 2 emojis y 2 o 3 hashtags al final","corto":"versión de máximo 200 caracteres","titulo":"título traducido, máx. 90 caracteres"}`, { json: true, max: 700 }); t = parseJSON(r.text); } } catch (e) {}
  const pl = (PLANTILLA[idioma] || PLANTILLA.en)(it); t = { largo: String(t?.largo || pl).slice(0, 1500), corto: String(t?.corto || pl).slice(0, 240), titulo: String(t?.titulo || it.titulo).slice(0, 100) };
  D.textos[clave] = t; const ks = Object.keys(D.textos); if (ks.length > 300) for (const x of ks.slice(0, ks.length - 300)) delete D.textos[x]; return t;
}
const urlDe = (it, c) => `${SITIO()}${it.ruta}${it.ruta.includes('?') ? '&' : '?'}hl=${c.idioma}&utm_source=${c.red}&utm_medium=social&utm_campaign=difusion`;

// ---------- Publicar una conexión en un horario ----------
async function publicarAhora(c, horario, C) {
  C = C || await contenido(); if (!C) throw new Error('La página viral está apagada: no puedo leer el contenido');
  const R = REDES[c.red], usados = D.historial.filter(h => h.con === c.id && h.ok).map(h => h.k).slice(-60);
  let it = elegir(horario.tipo, C, usados); if (R.imagen && !it.imagen) it = elegir('dibujo', { laminas: (C.laminas || []).filter(x => x.png) }, usados); if (R.imagen && !it.imagen) throw new Error('Aún no hay dibujos con imagen (los de la fábrica la traen)');
  const t = await textoBase(it, c.idioma), url = urlDe(it, c), texto = ['x', 'bluesky'].includes(c.red) ? t.corto : `${t.largo}\n${url}`;
  const r = await publicarEn(c, { texto, corto: t.corto, url, titulo: t.titulo, desc: it.desc || '', imagen: it.imagen, idioma: c.idioma });
  D.historial.push({ fecha: new Date().toISOString(), con: c.id, red: c.red, idioma: c.idioma, k: it.k, titulo: t.titulo, ok: true, fake: !!r.fake }); c.ultimo = { fecha: new Date().toISOString(), ok: true }; guardar(); return { titulo: t.titulo, url };
}
async function ciclo() {
  const h = new Date(Date.now() - 5 * 3600000).getUTCHours(), hoy = day(), activas = D.conexiones.filter(c => c.on);
  if (!activas.length) return; const slot = HORARIOS.find(x => x.h === h); if (!slot) return;
  let C = null;
  for (const c of activas) { const horas = c.horas || REDES[c.red].horas, clave = `${hoy}|${c.id}|${h}`; if (!horas.includes(h) || D.hechos[clave]) continue;
    D.hechos[clave] = 1; guardar(); try { C = C || await contenido(); await publicarAhora(c, slot, C); } catch (e) { D.historial.push({ fecha: new Date().toISOString(), con: c.id, red: c.red, idioma: c.idioma, ok: false, error: String(e.message).slice(0, 200) }); c.ultimo = { fecha: new Date().toISOString(), ok: false, error: String(e.message).slice(0, 160) }; guardar(); }
    await new Promise(r => setTimeout(r, 20000)); }
  for (const k of Object.keys(D.hechos)) if (!k.startsWith(hoy)) delete D.hechos[k];
}

// ---------- ✋ Kit diario semi-automático ----------
async function kitDelDia(forzar) {
  if (D.kit && D.kit.dia === day() && !forzar) return D.kit;
  const C = await contenido(); if (!C) throw new Error('La página viral está apagada');
  const it = elegir(['dibujo', 'cuento', 'juego'][new Date().getDate() % 3], C, []), idiomas = D.kitIdiomas.length ? D.kitIdiomas : ['es'];
  const textos = {}; for (const l of idiomas) { const t = await textoBase(it, l); textos[l] = { texto: t.largo, url: urlDe(it, { idioma: l, red: 'manual' }) }; }
  const foros = []; for (let i = 0; i < 3; i++) { const f = FOROS[(D.foroIdx + i) % FOROS.length]; foros.push(f); } D.foroIdx = (D.foroIdx + 3) % FOROS.length;
  let ayuda = {}; for (const f of foros) { if (ayuda[f.l]) continue; const t = await textoBase({ ...it, k: it.k + ':foro', tipo: 'foro', extra: 'Es para responder en un foro de padres o docentes: tono humano y cercano, sin sonar a publicidad, como recurso gratuito útil, y aclarando que quien escribe es el creador de Yupitok.' }, f.l); ayuda[f.l] = { texto: t.largo, url: urlDe(it, { idioma: f.l, red: 'foro' }) }; }
  D.kit = { dia: day(), titulo: it.titulo, emoji: it.emoji, imagen: it.imagen || null, textos, redes: MANUALES.map(([k, n]) => ({ k, n })), foros: foros.map(f => ({ ...f, texto: ayuda[f.l]?.texto, link: ayuda[f.l]?.url })), hechos: {} }; guardar(); return D.kit;
}

// ---------- Panel ----------
const mascara = v => { v = String(v || ''); return v.length > 8 ? v.slice(0, 3) + '•••' + v.slice(-3) : v ? '•••' : ''; };
function estado() {
  const hoy = day(), H = D.historial.slice().reverse();
  return { redes: Object.entries(REDES).map(([k, r]) => ({ k, n: r.n, campos: r.campos.map(c => ({ k: c[0], n: c[1] })), imagen: !!r.imagen })), idiomas: IDIOMAS, horarios: HORARIOS,
    conexiones: D.conexiones.map(c => ({ id: c.id, red: c.red, nombre: c.nombre, idioma: c.idioma, on: c.on, horas: c.horas || REDES[c.red].horas, ultimo: c.ultimo || null, cred: Object.fromEntries(Object.entries(c.cred || {}).map(([k, v]) => [k, /token|secret|password|webhook/i.test(k) ? mascara(v) : v])), hoy: D.historial.filter(h => h.con === c.id && h.ok && h.fecha.slice(0, 10) === new Date().toISOString().slice(0, 10)).length })),
    historial: H.slice(0, 30), registro: REGISTRO.map(r => ({ ...r, hecho: !!D.registro[r.k] })), kit: D.kit && D.kit.dia === hoy ? D.kit : null, kitIdiomas: D.kitIdiomas, totalForos: FOROS.length,
    semana: (() => { const s = Date.now() - 7 * 864e5, h = D.historial.filter(x => new Date(x.fecha).getTime() >= s); return { ok: h.filter(x => x.ok).length, fallos: h.filter(x => !x.ok).length }; })() };
}
async function accion(o) {
  if (o.accion === 'conectar') { const R = REDES[o.red]; if (!R) throw new Error('Red no válida'); const cred = {}; for (const [k] of R.campos) { const v = String(o.cred?.[k] || '').trim(); if (!v) throw new Error('Falta: ' + R.campos.find(c => c[0] === k)[1]); cred[k] = v.slice(0, 600); }
    const c = { id: uid(), red: o.red, nombre: String(o.nombre || R.n).slice(0, 60), idioma: IDIOMAS[o.idioma] ? o.idioma : 'es', on: true, cred, horas: R.horas.slice() }; D.conexiones.push(c); guardar(); return { ok: 1, id: c.id }; }
  const c = D.conexiones.find(x => x.id === o.id);
  if (o.accion === 'probar') { if (!c) throw new Error('No encontrada'); return publicarAhora(c, HORARIOS[Math.floor(Math.random() * HORARIOS.length)]); }
  if (o.accion === 'onoff') { if (!c) throw new Error('No encontrada'); c.on = !c.on; guardar(); return { ok: 1 }; }
  if (o.accion === 'horas') { if (!c) throw new Error('No encontrada'); const hs = (o.horas || []).map(Number).filter(h => HORARIOS.some(x => x.h === h)); if (!hs.length) throw new Error('Elige al menos un horario'); c.horas = [...new Set(hs)].slice(0, 6); guardar(); return { ok: 1 }; }
  if (o.accion === 'borrar') { D.conexiones = D.conexiones.filter(x => x !== c); guardar(); return { ok: 1 }; }
  if (o.accion === 'registro') { D.registro[o.k] = !D.registro[o.k]; guardar(); return { ok: 1 }; }
  if (o.accion === 'kit') return kitDelDia(!!o.forzar);
  if (o.accion === 'kitHecho') { if (D.kit) { D.kit.hechos[o.k] = !D.kit.hechos[o.k]; guardar(); } return { ok: 1 }; }
  if (o.accion === 'kitIdiomas') { D.kitIdiomas = (o.idiomas || []).filter(l => IDIOMAS[l]).slice(0, 6); if (!D.kitIdiomas.length) D.kitIdiomas = ['es']; D.kit = null; guardar(); return { ok: 1 }; }
  throw new Error('Acción no válida');
}
function start() { setInterval(() => ciclo().catch(e => console.log('[Difusión] ' + e.message)), 5 * 60000).unref(); }
module.exports = { start, estado, accion, oauth1, publicarAhora, ciclo, kitDelDia, REDES, FOROS, REGISTRO };
