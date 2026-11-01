// Más redes con publicación automática OFICIAL (cada una con su API pública).
// Objetivo: atraer gente HACIA tus redes principales (YouTube, Facebook y TikTok): cada publicación termina con sus enlaces.
//  - Instagram Reels: con la misma app de Meta. Requiere cuenta de Instagram PROFESIONAL vinculada a la página.
//    Se sube directo desde tu PC (subida "reanudable"), sin necesidad de tener el video en internet.
//  - Bluesky: red abierta; se publica con una "contraseña de app" (no tu contraseña normal).
// Estas redes no permiten programar por API: el video sale cuando llega su hora.
const fs = require('fs'), path = require('path');
const { E, DATA, sleep } = require('./util');
const { db } = require('./store');

const archivo = j => path.join(DATA, 'videos', j.result.dir, j.result.files.social || j.result.files.youtube);
const textoDe = (j, ch, max) => {
  const f = j.seo?.facebook || {}, tt = j.seo?.tiktok || {};
  const base = f.caption || tt.caption || j.title || '';
  const tags = [...(tt.hashtags || []), ...(f.hashtags || [])].map(h => '#' + String(h).replace(/^#/, '').replace(/\s+/g, '')).filter((h, i, a) => a.indexOf(h) === i).slice(0, 8).join(' ');
  return (base + (tags ? '\n\n' + tags : '')).slice(0, max);
};
const embudo = ch => require('./crecer').enlaces({ ...ch, crossLinks: true }).replace('Síguenos también:', 'Más videos así en:');
async function jfetch(u, o = {}) {
  const r = await fetch(u, o); const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { raw: t }; }
  if (!r.ok || j.error) throw new Error(j.error?.message || j.error_description || j.message || (typeof j.error === 'string' ? j.error : '') || ('error ' + r.status));
  return j;
}

// ---------------- Instagram Reels ----------------
const G = 'https://graph.facebook.com/v21.0/';
async function igCuenta(ch) {
  const P = require('./publish'), page = P.tokens.facebook?.pages?.find(p => p.id === ch.fbPageId);
  if (!page) throw new Error('Instagram: primero elige la página de Facebook del canal (Instagram va vinculado a ella)');
  if (page.ig?.id) return { ig: page.ig.id, token: page.token };
  const r = await jfetch(G + page.id + '?' + new URLSearchParams({ fields: 'instagram_business_account{id,username}', access_token: page.token }));
  const ig = r.instagram_business_account;
  if (!ig) throw new Error('Instagram: la página no tiene una cuenta de Instagram profesional vinculada (Instagram → Configuración → Cuenta profesional, y vincúlala a la página)');
  page.ig = { id: ig.id, username: ig.username }; P.saveTokens();
  return { ig: ig.id, token: page.token };
}
async function uploadInstagram(j, ch) {
  const { ig, token } = await igCuenta(ch), file = archivo(j), size = fs.statSync(file).size;
  const c = await jfetch(G + ig + '/media', { method: 'POST', body: new URLSearchParams({ media_type: 'REELS', upload_type: 'resumable', caption: (textoDe(j, ch, 1600) + embudo(ch)).slice(0, 2200), share_to_feed: 'true', access_token: token }) });
  const up = await jfetch(`https://rupload.facebook.com/ig-api-upload/v21.0/${c.id}`, { method: 'POST', body: fs.readFileSync(file), headers: { authorization: 'OAuth ' + token, offset: '0', file_size: String(size) } });
  if (up.success === false) throw new Error('Instagram: falló la subida');
  for (let i = 0; i < 60; i++) { // Instagram procesa el video (normalmente 30 s a 2 min)
    const s = await jfetch(G + c.id + '?' + new URLSearchParams({ fields: 'status_code,status', access_token: token }));
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Instagram no aceptó el video: ' + (s.status || s.status_code));
    await sleep(5000);
  }
  const p = await jfetch(G + ig + '/media_publish', { method: 'POST', body: new URLSearchParams({ creation_id: c.id, access_token: token }) });
  const info = await jfetch(G + p.id + '?' + new URLSearchParams({ fields: 'permalink', access_token: token })).catch(() => ({}));
  return { id: p.id, url: info.permalink || 'https://www.instagram.com/', scheduled: false };
}

// ---------------- Bluesky ----------------
async function uploadBluesky(j, ch) {
  const P = require('./publish'), cred = P.tokens.bluesky?.[ch.id];
  if (!cred?.handle || !cred?.pass) throw new Error('Bluesky: pon tu usuario y contraseña de app en Canales → Editar');
  const pds = 'https://bsky.social/xrpc/';
  const s = await jfetch(pds + 'com.atproto.server.createSession', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: cred.handle.replace(/^@/, ''), password: cred.pass }) });
  const auth = { authorization: 'Bearer ' + s.accessJwt };
  const blob = await jfetch(pds + 'com.atproto.repo.uploadBlob', { method: 'POST', headers: { ...auth, 'content-type': 'video/mp4' }, body: fs.readFileSync(archivo(j)) });
  // Bluesky permite 300 caracteres: el texto corto + el enlace a tu YouTube (o Facebook/TikTok), que sí se puede tocar.
  const h = ch.handles || {}, limpio = x => String(x || '').trim().replace(/^https?:\/\/[^/]+\//, '').replace(/^@/, '').replace(/\/.*$/, '');
  const link = limpio(h.youtube) ? 'https://www.youtube.com/@' + limpio(h.youtube) : limpio(h.facebook) ? 'https://www.facebook.com/' + limpio(h.facebook) : limpio(h.tiktok) ? 'https://www.tiktok.com/@' + limpio(h.tiktok) : '';
  const cola = link ? '\n\n▶️ Más en ' + link : '';
  const text = [...textoDe(j, ch, 1000)].slice(0, 295 - [...cola].length).join('') + cola;
  const facets = [];
  if (link) { const enc = new TextEncoder(), start = enc.encode(text.slice(0, text.lastIndexOf(link))).length; facets.push({ index: { byteStart: start, byteEnd: start + enc.encode(link).length }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: link }] }); }
  const rec = await jfetch(pds + 'com.atproto.repo.createRecord', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({
    repo: s.did, collection: 'app.bsky.feed.post',
    record: { $type: 'app.bsky.feed.post', text, ...(facets.length ? { facets } : {}), createdAt: new Date().toISOString(), langs: ['es'], embed: { $type: 'app.bsky.embed.video', video: blob.blob, aspectRatio: { width: 9, height: 16 } } },
  }) });
  const rkey = String(rec.uri).split('/').pop();
  return { id: rec.uri, url: `https://bsky.app/profile/${s.handle}/post/${rkey}`, scheduled: false };
}

// ---------------- Espacios PROPIOS que llevan gente a YouTube/Facebook ----------------
// Estos necesitan que el video ya esté público en YouTube o Facebook (publican el enlace).
function enlacePrincipal(j) {
  const y = j.pub?.youtube, f = j.pub?.facebook, ahora = Date.now();
  if (y?.ok && y.id && new Date(y.when).getTime() <= ahora) return { yt: y.id, url: 'https://www.youtube.com/shorts/' + y.id };
  if (f?.ok && f.url && new Date(f.when).getTime() <= ahora) return { url: f.url };
  return null;
}
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Mastodon: tu cuenta en el servidor que elijas (respeta sus reglas: muchos piden marcar la cuenta como "bot").
async function uploadMastodon(j, ch) {
  const c = require('./publish').tokens.mastodon?.[ch.id];
  if (!c?.server || !c?.token) throw new Error('Mastodon: pon tu servidor y token en Canales → Editar');
  const base = c.server.replace(/\/+$/, ''), auth = { authorization: 'Bearer ' + c.token };
  const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(archivo(j))], { type: 'video/mp4' }), 'video.mp4');
  fd.append('description', String(j.title || '').slice(0, 1400));
  let m = await jfetch(base + '/api/v2/media', { method: 'POST', headers: auth, body: fd });
  for (let i = 0; i < 60 && !m.url; i++) { await sleep(5000); m = await jfetch(base + '/api/v1/media/' + m.id, { headers: auth }); }
  const st = await jfetch(base + '/api/v1/statuses', { method: 'POST', headers: { ...auth, 'content-type': 'application/json', 'idempotency-key': 'sf-' + j.id }, body: JSON.stringify({ status: (textoDe(j, ch, 300) + embudo(ch)).slice(0, 490), media_ids: [m.id], visibility: 'public', language: 'es' }) });
  return { id: st.id, url: st.url, scheduled: false };
}

// Discord: TU servidor (comunidad de fans). Se publica con un "webhook" del canal de anuncios.
async function uploadDiscord(j, ch) {
  const c = require('./publish').tokens.discord?.[ch.id];
  if (!c?.url) throw new Error('Discord: pega el webhook de tu servidor en Canales → Editar');
  const e = enlacePrincipal(j); if (!e) throw Object.assign(new Error('Discord: espera a que el video esté público en YouTube o Facebook'), { esperar: true });
  const r = await fetch(c.url + (c.url.includes('?') ? '&' : '?') + 'wait=true', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: ch.name, content: `🎬 **${j.title || ''}**\n${e.url}${embudo(ch)}`.slice(0, 1900) }) });
  const m = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Discord: ' + (m.message || r.status));
  return { id: m.id, url: e.url, scheduled: false };
}

// Blogger (de Google, gratis): cada video se vuelve un artículo con el Short incrustado. Google lo indexa y
// la gente que busca el tema en Google llega a tu YouTube. Usa la misma conexión de YouTube del canal.
async function uploadBlogger(j, ch) {
  const P = require('./publish'), e = enlacePrincipal(j);
  if (!e?.yt) throw Object.assign(new Error('Blogger: espera a que el video esté público en YouTube'), { esperar: true });
  const access = await P.googleAccess(ch.id), auth = { authorization: 'Bearer ' + access };
  let blogId = ch.bloggerId;
  if (!blogId) {
    const b = await jfetch('https://www.googleapis.com/blogger/v3/users/self/blogs', { headers: auth });
    blogId = b.items?.[0]?.id;
    if (!blogId) throw new Error('Blogger: crea un blog gratis en blogger.com con la misma cuenta de Google del canal');
  }
  const y = j.seo?.youtube || {}, h = ch.handles || {}, limpio = x => String(x || '').trim().replace(/^https?:\/\/[^/]+\//, '').replace(/^@/, '').replace(/\/.*$/, '');
  const parrafos = String(y.description || '').split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
  const html = `<div style="max-width:360px;margin:0 auto"><iframe width="315" height="560" src="https://www.youtube.com/embed/${esc(e.yt)}" frameborder="0" allowfullscreen></iframe></div>
${parrafos}${j.spoken ? `<h3>Lo que se dice en el video</h3><p>${esc(String(j.spoken).slice(0, 1500))}</p>` : ''}
<p><b>▶️ Mira más videos así:</b> ${[limpio(h.youtube) && `<a href="https://www.youtube.com/@${esc(limpio(h.youtube))}">YouTube</a>`, limpio(h.facebook) && `<a href="https://www.facebook.com/${esc(limpio(h.facebook))}">Facebook</a>`, limpio(h.tiktok) && `<a href="https://www.tiktok.com/@${esc(limpio(h.tiktok))}">TikTok</a>`].filter(Boolean).join(' · ') || `<a href="${esc(e.url)}">YouTube</a>`}</p>`;
  const post = await jfetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ title: String(y.title || j.title || 'Video').slice(0, 200), content: html, labels: (y.tags || []).slice(0, 5).map(String) }) });
  return { id: post.id, url: post.url, scheduled: false };
}

module.exports = { uploadInstagram, uploadBluesky, uploadMastodon, uploadDiscord, uploadBlogger, igCuenta };
