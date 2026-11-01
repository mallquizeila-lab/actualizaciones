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

module.exports = { uploadInstagram, uploadBluesky, igCuenta };
