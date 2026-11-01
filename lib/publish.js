// Publicación automática con las APIs OFICIALES (nada de robots que imiten clics).
//  - YouTube Data API v3: subida + programación (publishAt). Cada canal se conecta con su cuenta.
//    OJO: hasta que Google apruebe tu proyecto (auditoría gratis), los videos subidos por API quedan PRIVADOS.
//    La cuota gratis alcanza para ~6 subidas al día por proyecto.
//  - Facebook Graph API: Reels en tus páginas, publicados o programados a la hora del canal.
//  - TikTok: requiere aprobación de su API; mientras tanto, textos listos para pegar.
const fs = require('fs'), path = require('path');
const { E, DATA, day, sleep } = require('./util');
const { db, saveAll, channel } = require('./store');

const TOK = path.join(DATA, 'tokens.json');
const tokens = (() => { try { return JSON.parse(fs.readFileSync(TOK, 'utf8')); } catch (e) { return { google: {}, facebook: null }; } })();
const saveTok = () => fs.writeFileSync(TOK, JSON.stringify(tokens, null, 1));
const PORT = E.PORT || 3200;
const redirect = p => `http://localhost:${PORT}/oauth/${p}`;

// ---------------- YouTube ----------------
function googleAuthUrl(channelId) {
  if (!E.GOOGLE_CLIENT_ID) throw new Error('Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Ajustes');
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: E.GOOGLE_CLIENT_ID, redirect_uri: redirect('google'), response_type: 'code', access_type: 'offline', prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/blogger', include_granted_scopes: 'true', state: channelId,
  });
}
async function googleToken(body) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: E.GOOGLE_CLIENT_ID, client_secret: E.GOOGLE_CLIENT_SECRET, ...body }) });
  const j = await r.json();
  if (!r.ok) throw new Error('Google: ' + (j.error_description || j.error || r.status));
  return j;
}
async function googleCallback(code, channelId) {
  const t = await googleToken({ code, grant_type: 'authorization_code', redirect_uri: redirect('google') });
  if (!t.refresh_token) throw new Error('Google no entregó permiso permanente. Vuelve a conectar.');
  const g = tokens.google[channelId] = { refresh: t.refresh_token, access: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 };
  const me = await (await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { authorization: 'Bearer ' + g.access } })).json();
  g.yt = me.items?.[0] ? { id: me.items[0].id, title: me.items[0].snippet.title } : null;
  saveTok();
  return g.yt;
}
async function googleAccess(channelId) {
  const g = tokens.google[channelId];
  if (!g) throw new Error('Este canal no está conectado a YouTube');
  if (Date.now() < g.exp) return g.access;
  const t = await googleToken({ refresh_token: g.refresh, grant_type: 'refresh_token' });
  g.access = t.access_token; g.exp = Date.now() + (t.expires_in - 60) * 1000; saveTok();
  return g.access;
}

// Etiquetas (YouTube cuenta las comillas de las que tienen espacios; máx. 500) y descripción final.
function textosYT(j) {
  const y = j.seo?.youtube || {}, tags = []; let len = 0;
  for (const t of y.tags || []) { const s = String(t).replace(/[<>]/g, '').slice(0, 60); const add = s.length + (s.includes(' ') ? 2 : 0) + 1; if (len + add > 490) continue; tags.push(s); len += add; }
  const hs = (y.hashtags || []).some(h => /^#shorts$/i.test(h)) ? (y.hashtags || []) : ['#Shorts', ...(y.hashtags || [])];
  const ch = channel(j.channelId) || {};
  const desc = [String(y.description || '') + require('./crecer').enlaces(ch, 'youtube'), hs.join(' '), j.result?.credits?.length ? 'Imágenes: ' + j.result.credits.join(', ') : ''].filter(Boolean).join('\n\n');
  return { tags, desc, title: String(y.title || j.title || 'Video').slice(0, 100) };
}
// Cambia título, descripción y etiquetas de un video YA subido (50 unidades de cuota).
async function actualizarYouTube(j, ch) {
  const id = j.pub?.youtube?.id; if (!id) return false;
  const access = await googleAccess(ch.id), { tags, desc, title } = textosYT(j);
  const cur = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}`, { headers: { authorization: 'Bearer ' + access } }).then(r => r.json());
  const sn = cur.items?.[0]?.snippet; if (!sn) throw new Error('YouTube: no encontré el video (¿lo borraste?)');
  const r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet', { method: 'PUT', headers: { authorization: 'Bearer ' + access, 'content-type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ id, snippet: { defaultLanguage: sn.defaultLanguage, defaultAudioLanguage: sn.defaultAudioLanguage, title, description: desc.slice(0, 4900), tags, categoryId: sn.categoryId } }) });
  if (!r.ok) throw new Error('YouTube: ' + (await r.text()).slice(0, 300));
  return true;
}

async function uploadYouTube(j, ch, when) {
  const y = j.seo?.youtube || {}, file = path.join(DATA, 'videos', j.result.dir, j.result.files.youtube);
  const { tags, desc } = textosYT(j);
  const future = when > Date.now() + 15 * 60000;
  const meta = {
    snippet: { title: String(y.title || j.title || 'Video').slice(0, 100), description: desc.slice(0, 4900), tags, categoryId: ch.ytCategory || '22', defaultLanguage: 'es', defaultAudioLanguage: 'es' },
    status: { privacyStatus: future ? 'private' : 'public', ...(future ? { publishAt: new Date(when).toISOString() } : {}), selfDeclaredMadeForKids: false, containsSyntheticMedia: ch.aiDisclosure !== false },
  };
  // Traducciones oficiales del título y la descripción (te encuentran en inglés y portugués).
  const loc = {};
  for (const [k, v] of Object.entries(y.localizations || {})) if (/^(en|pt)$/.test(k) && v?.title) loc[k] = { title: String(v.title).slice(0, 100), description: String(v.description || '').slice(0, 4900) };
  if (Object.keys(loc).length) meta.localizations = loc;
  const access = await googleAccess(ch.id), size = fs.statSync(file).size;
  const init = await fetch(`https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status${meta.localizations ? ',localizations' : ''}`, {
    method: 'POST', body: JSON.stringify(meta),
    headers: { authorization: 'Bearer ' + access, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-length': String(size), 'x-upload-content-type': 'video/mp4' },
  });
  if (!init.ok) throw new Error('YouTube: ' + (await init.text()).slice(0, 300));
  const up = await fetch(init.headers.get('location'), { method: 'PUT', body: fs.readFileSync(file), headers: { 'content-type': 'video/mp4', 'content-length': String(size) } });
  const r = await up.json().catch(() => ({}));
  if (!up.ok || !r.id) throw new Error('YouTube: ' + JSON.stringify(r.error || r).slice(0, 300));
  const pl = await addToPlaylist(ch, y.serie, r.id, access).catch(e => { console.log('[Playlist] ' + e.message); return null; });
  return { id: r.id, url: 'https://youtube.com/shorts/' + r.id, scheduled: future, privacy: r.status?.privacyStatus, playlist: pl };
}

// Playlists automáticas por serie: la gente ve un video tras otro (más vistas por persona).
async function addToPlaylist(ch, serie, videoId, access) {
  if (ch.playlists === false || !serie) return null;
  const C = require('./comments');
  if (C.ytBudget() < 4) return null; // nunca a costa de las subidas
  ch.ytPlaylists = ch.ytPlaylists || {};
  const name = String(serie).trim().slice(0, 60);
  const key = name.toLowerCase();
  const H = { authorization: 'Bearer ' + access, 'content-type': 'application/json' };
  if (!ch.ytPlaylists[key]) {
    if (Object.keys(ch.ytPlaylists).length >= 12) return null; // pocas listas, bien llenas
    const r = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', { method: 'POST', headers: H,
      body: JSON.stringify({ snippet: { title: name, description: `${name} | ${ch.name}`, defaultLanguage: 'es' }, status: { privacyStatus: 'public' } }) });
    C.spend(50);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || r.status);
    ch.ytPlaylists[key] = j.id; saveAll.channels();
  }
  const r = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', { method: 'POST', headers: H,
    body: JSON.stringify({ snippet: { playlistId: ch.ytPlaylists[key], resourceId: { kind: 'youtube#video', videoId } } }) });
  C.spend(50);
  if (!r.ok) throw new Error((await r.json()).error?.message || r.status);
  return name;
}

// ---------------- Facebook ----------------
function fbAuthUrl() {
  if (!E.FB_APP_ID) throw new Error('Faltan FB_APP_ID y FB_APP_SECRET en Ajustes');
  return 'https://www.facebook.com/dialog/oauth?' + new URLSearchParams({
    client_id: E.FB_APP_ID, redirect_uri: redirect('facebook'), state: 'sf', response_type: 'code',
    // Apps nuevas ("Inicio de sesión con Facebook para empresas") usan un Identificador de configuración.
    ...(E.FB_CONFIG_ID ? { config_id: E.FB_CONFIG_ID } : { scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement,pages_read_user_content,instagram_basic,instagram_content_publish,business_management' }),
  });
}
async function fbGet(u) { const r = await fetch(u); const j = await r.json(); if (!r.ok || j.error) throw new Error('Facebook: ' + (j.error?.message || r.status)); return j; }
async function fbCallback(code) {
  const base = { client_id: E.FB_APP_ID, client_secret: E.FB_APP_SECRET };
  const short = await fbGet('https://graph.facebook.com/oauth/access_token?' + new URLSearchParams({ ...base, redirect_uri: redirect('facebook'), code }));
  const long = await fbGet('https://graph.facebook.com/oauth/access_token?' + new URLSearchParams({ ...base, grant_type: 'fb_exchange_token', fb_exchange_token: short.access_token }));
  const pages = await fbGet('https://graph.facebook.com/me/accounts?' + new URLSearchParams({ fields: 'id,name,access_token', limit: '100', access_token: long.access_token }));
  tokens.facebook = { pages: (pages.data || []).map(p => ({ id: p.id, name: p.name, token: p.access_token })), at: new Date().toISOString() };
  saveTok();
  return tokens.facebook.pages.length;
}
async function uploadFacebook(j, ch, when) {
  const page = tokens.facebook?.pages?.find(p => p.id === ch.fbPageId);
  if (!page) throw new Error('Elige la página de Facebook de este canal');
  const f = j.seo?.facebook || {}, file = path.join(DATA, 'videos', j.result.dir, j.result.files.social);
  const form = o => new URLSearchParams({ access_token: page.token, ...o });
  const st = await fetch(`https://graph.facebook.com/${page.id}/video_reels`, { method: 'POST', body: form({ upload_phase: 'start' }) }).then(r => r.json());
  if (!st.video_id) throw new Error('Facebook: ' + (st.error?.message || 'no pude iniciar la subida'));
  const size = fs.statSync(file).size;
  const up = await fetch(st.upload_url || `https://rupload.facebook.com/video-upload/v21.0/${st.video_id}`, { method: 'POST', body: fs.readFileSync(file), headers: { authorization: 'OAuth ' + page.token, offset: '0', file_size: String(size) } }).then(r => r.json());
  if (!up.success) throw new Error('Facebook: ' + (up.error?.message || up.debug_info?.message || 'falló la subida'));
  const future = when > Date.now() + 15 * 60000;
  const desc = [String(f.caption || '') + require('./crecer').enlaces(ch, 'facebook'), (f.hashtags || []).map(h => '#' + String(h).replace(/^#/, '')).join(' ')].filter(Boolean).join('\n\n');
  const fin = await fetch(`https://graph.facebook.com/${page.id}/video_reels`, { method: 'POST', body: form({ upload_phase: 'finish', video_id: st.video_id, video_state: future ? 'SCHEDULED' : 'PUBLISHED', description: desc, ...(future ? { scheduled_publish_time: String(Math.floor(when / 1000)) } : {}) }) }).then(r => r.json());
  if (!fin.success) throw new Error('Facebook: ' + (fin.error?.message || 'no pude publicar'));
  return { id: st.video_id, url: `https://www.facebook.com/reel/${st.video_id}`, scheduled: future };
}

// ---------------- Cola de publicación ----------------
const NOMBRE = { youtube: 'YouTube', facebook: 'Facebook', tiktok: 'TikTok', instagram: 'Instagram', bluesky: 'Bluesky', mastodon: 'Mastodon', discord: 'Discord', blogger: 'Blogger' };
const R = require('./redes');
const PLAT = { youtube: uploadYouTube, facebook: uploadFacebook, instagram: (j, ch) => R.uploadInstagram(j, ch), bluesky: (j, ch) => R.uploadBluesky(j, ch), mastodon: (j, ch) => R.uploadMastodon(j, ch), discord: (j, ch) => R.uploadDiscord(j, ch), blogger: (j, ch) => R.uploadBlogger(j, ch) };
const AL_MOMENTO = new Set(['instagram', 'bluesky', 'mastodon', 'discord', 'blogger']); // no se pueden programar: se publican cuando llega la hora
const busy = { on: false };
// Hora de cada video: si el canal publica varias veces al día, el 1.º sale a la hora 1, el 2.º a la hora 2...
// Todas las horas son hora de Perú (UTC-5, sin horario de verano), esté como esté el reloj de la PC.
const PE = '-05:00';
const horaPeru = t => new Date(t).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false });
const fechaPeru = t => new Date(t).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short', hour12: false });
const horaDe = (j, ch, p) => horaPeru(whenOf(j, ch, p, true));
const whenOf = (j, ch, p, exacta) => {
  const mismos = db.jobs.filter(x => x.channelId === j.channelId && x.publishDate === j.publishDate && x.status !== 'dividido').sort((a, b) => String(a.created).localeCompare(String(b.created)));
  const k = Math.max(0, mismos.indexOf(j)), n = Math.max(1, Math.min(3, +ch.perDay || 1));
  // Las horas del día se ordenan: el 1.º video del día sale a la hora más temprana.
  const horas = [0, 1, 2].slice(0, n).map(i => (i ? ch.times?.[p + (i + 1)] : ch.times?.[p]) || ['07:00', '13:00', '19:00'][i]).sort();
  const t = (/^\d\d:\d\d$/.test(j.horaFija || '') && j.horaFija) || horas[Math.min(k, horas.length - 1)] || '18:00';
  const w = new Date(`${j.publishDate}T${t}:00${PE}`).getTime();
  return exacta || w > Date.now() ? w : Date.now();
};
function ytCountToday() { const d = day(); return db.jobs.filter(j => j.pub?.youtube?.ok && (j.pub.youtube.at || '').startsWith(d)).length; }

async function tick() {
  if (busy.on) return;
  busy.on = true;
  try {
    for (const j of db.jobs.filter(x => ['aprobado', 'programado'].includes(x.status) && x.result)) {
      const ch = channel(j.channelId);
      if (!ch?.autoPublish) continue;
      j.pub = j.pub || {};
      for (const p of Object.keys(PLAT)) {
        if (!ch.autoPublish[p] || j.pub[p]?.ok || (j.pub[p]?.tries || 0) >= 3) continue;
        if (p === 'youtube' && ytCountToday() >= (db.settings.ytDailyMax || 6)) continue;
    if (!PLAT[p]) continue;
        // Se sube con hasta 2 días de anticipación y la plataforma lo publica a la hora del canal.
        const when = whenOf(j, ch, p);
        if (when - Date.now() > 2 * 86400000) continue;
        if (AL_MOMENTO.has(p) && when > Date.now() + 60000) continue;
        try {
          const r = await PLAT[p](j, ch, when);
          try { require('./avisos').videoPublicado(j, ch, p, r); } catch (e) {}
          j.pub[p] = { ok: true, ...r, when: new Date(when).toISOString(), at: new Date().toISOString() };
          if (p === 'facebook') await require('./crecer').despuesDeFacebook(j, ch, r).catch(() => {});
          j.log.push(`${NOMBRE[p] || p}: ${r.scheduled ? 'programado para ' + fechaPeru(when) + ' (hora Perú)' : 'publicado'} ✓`);
        } catch (e) {
          if (e.esperar) continue; // aún no está público en YouTube/Facebook: se intenta en la próxima vuelta
          j.pub[p] = { ok: false, error: e.message, tries: (j.pub[p]?.tries || 0) + 1 };
          j.log.push(`${p}: no se pudo publicar (${e.message})`);
        }
        saveAll.jobs();
        await sleep(3000);
      }
      const want = Object.keys(PLAT).filter(p => ch.autoPublish[p]);
      if (want.length && want.every(p => j.pub[p]?.ok)) {
        j.status = want.every(p => new Date(j.pub[p].when).getTime() <= Date.now()) ? 'publicado' : 'programado';
        saveAll.jobs();
      }
    }
  } finally { busy.on = false; }
}

// Botones "Publicar": sube ya a las redes elegidas (aunque el canal no tenga la publicación automática activada).
// Si la hora del video todavía no llega, queda programado para esa hora; si ya pasó, sale al momento.

async function publicarYa(j, plats) {
  const ch = channel(j.channelId);
  if (!ch) throw new Error('Canal no encontrado');
  if (!j.result || j.result.borrado) throw new Error('El archivo del video ya no está en tu PC');
  if (j.status === 'produciendo') throw new Error('Espera a que termine de producirse');
  j.pub = j.pub || {};
  const hecho = [], fallo = [];
  for (const p of plats) {
    if (j.pub[p]?.ok) { hecho.push(NOMBRE[p] + ' (ya estaba)'); continue; }
    if (p === 'tiktok') { // TikTok no deja publicar por API sin su aprobación: lo subes tú y aquí queda marcado.
      j.pub.tiktok = { ok: true, manual: true, url: 'https://www.tiktok.com/upload', at: new Date().toISOString(), when: new Date().toISOString() };
      j.log.push('TikTok: marcado como subido a mano ✓'); hecho.push('TikTok'); continue;
    }
    if (p === 'youtube' && !tokens.google?.[ch.id]) { fallo.push('YouTube: conecta el canal (Canales → Editar)'); continue; }
    if (['facebook', 'instagram'].includes(p) && !tokens.facebook?.pages?.find(x => x.id === ch.fbPageId)) { fallo.push(NOMBRE[p] + ': elige la página de Facebook del canal (Canales → Editar)'); continue; }
    if (p === 'bluesky' && !tokens.bluesky?.[ch.id]) { fallo.push('Bluesky: pon tu usuario y contraseña de app (Canales → Editar)'); continue; }
    const when = AL_MOMENTO.has(p) ? Date.now() : whenOf(j, ch, p);
    try {
      const r = await PLAT[p](j, ch, when);
      try { require('./avisos').videoPublicado(j, ch, p, r); } catch (e) {}
      j.pub[p] = { ok: true, ...r, when: new Date(when).toISOString(), at: new Date().toISOString() };
      if (p === 'facebook') await require('./crecer').despuesDeFacebook(j, ch, r).catch(() => {});
      j.log.push(`${NOMBRE[p]}: ${r.scheduled ? 'programado para ' + fechaPeru(when) + ' (hora Perú)' : 'publicado'} ✓`);
      hecho.push(NOMBRE[p] + (r.scheduled ? ' (programado ' + horaPeru(when) + ')' : ''));
    } catch (e) {
      if (e.esperar) { fallo.push(e.message + ' (si lo activas en el canal, se publica solo cuando lo esté)'); continue; }
      j.pub[p] = { ok: false, error: e.message, tries: (j.pub[p]?.tries || 0) + 1 };
      j.log.push(`${NOMBRE[p]}: no se pudo publicar (${e.message})`); fallo.push(`${NOMBRE[p]}: ${e.message}`);
    }
    saveAll.jobs();
  }
  const subidos = Object.entries(j.pub).filter(([, x]) => x.ok);
  if (subidos.length) j.status = subidos.every(([, x]) => new Date(x.when).getTime() <= Date.now() + 60000) ? 'publicado' : 'programado';
  saveAll.jobs();
  return { ok: 1, hecho, fallo };
}

function status() {
  return {
    google: Object.fromEntries(Object.entries(tokens.google || {}).map(([k, v]) => [k, v.yt || { title: 'conectado' }])),
    facebookPages: (tokens.facebook?.pages || []).map(p => ({ id: p.id, name: p.name, ig: p.ig?.username || null })),
    bluesky: Object.fromEntries(Object.entries(tokens.bluesky || {}).map(([k, v]) => [k, v.handle])),
    mastodon: Object.fromEntries(Object.entries(tokens.mastodon || {}).map(([k, v]) => [k, v.server])),
    discord: Object.fromEntries(Object.entries(tokens.discord || {}).map(([k]) => [k, true])),
    ytToday: ytCountToday(),
  };
}
function disconnect(kind, channelId) { if (kind === 'google') delete tokens.google[channelId]; else tokens.facebook = null; saveTok(); }

function start() { setInterval(() => tick().catch(e => console.log('[Publicar] ' + e.message)), 60 * 1000); }

module.exports = { saveTokens: () => saveTok(), NOMBRE, publicarYa, textosYT, actualizarYouTube, horaDe, horaPeru, PE, whenOf, tokens, googleAccess, googleAuthUrl, googleCallback, fbAuthUrl, fbCallback, status, disconnect, start, tick };
