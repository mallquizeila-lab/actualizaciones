// Crecer sin arriesgar tus cuentas: solo herramientas oficiales y en TUS propias páginas.
//  1) Primer comentario en tu Reel de Facebook (pregunta para que comenten + enlace a tu YouTube).
//  2) El Reel también como Historia de la página (más gente lo ve arriba en Facebook).
//  3) Promoción cruzada entre TUS páginas del mismo tema (máx. 1 al día por página).
//  4) Enlaces a tus otras redes al final de cada descripción.
//  5) Kit para compartir en grupos A MANO (textos distintos y que aportan, y qué grupos buscar).
// Nada de bots en perfiles personales ni comentarios en videos ajenos: Meta y YouTube lo castigan.
const fs = require('fs'), path = require('path');
const { DATA, day, parseJSON } = require('./util');
const { db, saveAll } = require('./store');

const limpio = h => String(h || '').trim().replace(/^https?:\/\/[^/]+\//, '').replace(/^@/, '').replace(/\/.*$/, '');
function enlaces(ch, menos) {
  const h = ch.handles || {}, L = [];
  if (menos !== 'youtube' && limpio(h.youtube)) L.push('▶️ YouTube: https://www.youtube.com/@' + limpio(h.youtube));
  if (menos !== 'facebook' && limpio(h.facebook)) L.push('📘 Facebook: https://www.facebook.com/' + limpio(h.facebook));
  if (menos !== 'tiktok' && limpio(h.tiktok)) L.push('🎵 TikTok: https://www.tiktok.com/@' + limpio(h.tiktok));
  return L.length && ch.crossLinks !== false ? '\n\nSíguenos también:\n' + L.join('\n') : '';
}

async function graph(pathq, body, token) {
  const r = await fetch('https://graph.facebook.com/v21.0/' + pathq, { method: 'POST', body: new URLSearchParams({ ...body, access_token: token }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.message || 'error ' + r.status);
  return j;
}
const pagina = id => require('./publish').tokens.facebook?.pages?.find(p => p.id === id);

// 1) y 2): se llaman justo después de subir el Reel.
async function despuesDeFacebook(j, ch, r) {
  const page = pagina(ch.fbPageId); if (!page || !r?.id) return;
  if (ch.fbFirstComment !== false) {
    const y = j.seo?.youtube || {}, yt = limpio(ch.handles?.youtube);
    const msg = [y.pinned_comment || j.script?.comment_question, yt ? `▶️ Más videos así en YouTube: https://www.youtube.com/@${yt}` : ''].filter(Boolean).join('\n\n');
    if (msg) try { await graph(`${r.id}/comments`, { message: msg }, page.token); j.log.push('Facebook: primer comentario puesto ✓'); }
    catch (e) { j.log.push('Facebook: no pude poner el primer comentario (' + e.message + ')'); }
  }
  if (ch.fbStory && !r.scheduled) try { await historia(j, page); j.log.push('Facebook: también como Historia ✓'); }
  catch (e) { j.log.push('Facebook: Historia no publicada (' + e.message + ')'); }
}
async function historia(j, page) {
  const file = path.join(DATA, 'videos', j.result.dir, j.result.files.social);
  const st = await graph(`${page.id}/video_stories`, { upload_phase: 'start' }, page.token);
  const up = await fetch(st.upload_url || `https://rupload.facebook.com/video-upload/v21.0/${st.video_id}`, { method: 'POST', body: fs.readFileSync(file), headers: { authorization: 'OAuth ' + page.token, offset: '0', file_size: String(fs.statSync(file).size) } }).then(x => x.json());
  if (!up.success) throw new Error(up.error?.message || 'falló la subida');
  await graph(`${page.id}/video_stories`, { upload_phase: 'finish', video_id: st.video_id }, page.token);
}

// 3) Promoción cruzada: cuando el Reel ya salió, se comparte en tus otras páginas elegidas (1 al día por página).
async function cruzada() {
  const hoy = day();
  db.settings.cruzada = db.settings.cruzada || {};
  for (const j of db.jobs.filter(x => x.pub?.facebook?.ok && x.pub.facebook.url && !x.cruzada && new Date(x.pub.facebook.when).getTime() < Date.now() - 30 * 60000)) {
    const ch = db.channels.find(c => c.id === j.channelId);
    const destinos = (ch?.fbShareTo || []).filter(id => id !== ch.fbPageId);
    if (!destinos.length) { j.cruzada = true; continue; }
    j.cruzada = true;
    for (const id of destinos) {
      if (db.settings.cruzada[id] === hoy) continue; // ya recibió una hoy
      const page = pagina(id); if (!page) continue;
      try {
        await graph(`${id}/feed`, { link: j.pub.facebook.url, message: `${j.seo?.facebook?.caption || j.title || ''}\n\n👉 Lo encontramos en ${ch.name}` }, page.token);
        db.settings.cruzada[id] = hoy; j.log.push(`Compartido en tu página "${page.name}" ✓`);
      } catch (e) { j.log.push(`No pude compartirlo en "${page.name}" (${e.message})`); }
    }
  }
  saveAll.jobs(); saveAll.settings();
}

// 5) Kit para compartir a mano en grupos.
async function kitGrupos(j) {
  const ch = db.channels.find(c => c.id === j.channelId) || {};
  if (j.kit) return j.kit;
  const ai = require('./ai');
  const o = parseJSON((await ai.ask([{ role: 'user', content:
`Eres community manager en Latinoamérica. Video del canal "${ch.name}" (nicho: ${ch.niche}). Título: "${j.title}". De qué trata: ${String(j.spoken || (j.script?.scenes || []).map(s => s.text).join(' ') || j.topic || '').slice(0, 1500)}
Prepara un kit para que el DUEÑO comparta este video A MANO en grupos de Facebook donde ya participa:
- "textos": 3 textos DISTINTOS (no copiar el mismo en todos los grupos), naturales, que aporten algo al grupo (un dato, una pregunta, una opinión), 1 o 2 emojis, máx. 300 caracteres, sin "suscríbete" ni "dale like".
- "grupos": 6 búsquedas para encontrar grupos donde este video encaja (ej. "humor latino", "amantes de los animales").
- "consejos": 3 consejos cortos para que no lo marquen como spam.
Devuelve SOLO JSON: {"textos":["","",""],"grupos":["..."],"consejos":["..."]}` }], { json: true, max: 1500 })).text);
  j.kit = { textos: (o.textos || []).slice(0, 3).map(String), grupos: (o.grupos || []).slice(0, 8).map(String), consejos: (o.consejos || []).slice(0, 4).map(String) };
  saveAll.jobs();
  return j.kit;
}

function start() { setInterval(() => cruzada().catch(e => console.log('[Crecer] ' + e.message)), 20 * 60000); }

module.exports = { enlaces, despuesDeFacebook, cruzada, kitGrupos, start };
