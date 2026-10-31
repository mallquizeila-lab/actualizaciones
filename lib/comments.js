// Comentarios: lee los comentarios nuevos de YouTube y Facebook, la IA propone una respuesta
// y (si el canal lo permite) la publica sola, con calma y con límites para no parecer spam.
//  - Modo por canal: 'off' | 'revisar' (tú apruebas) | 'auto' (responde solo; las críticas y dudas delicadas quedan para ti).
//  - Cuota de YouTube (gratis, 10.000 unidades al día por proyecto): subir un video ~1.600, responder 50, leer 1.
//    Se reservan siempre las unidades de las subidas del día para que publicar nunca falle por responder.
const fs = require('fs'), path = require('path');
const { DATA, day, sleep, parseJSON, uid } = require('./util');
const { db, channel } = require('./store');
const ai = require('./ai');
const publish = require('./publish');

const FILE = path.join(DATA, 'comments.json');
const C = (() => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return { items: [], quota: {}, last: {} }; } })();
C.items = C.items || []; C.quota = C.quota || {}; C.last = C.last || {};
const save = () => { C.items = C.items.slice(-3000); fs.writeFileSync(FILE + '.tmp', JSON.stringify(C)); fs.renameSync(FILE + '.tmp', FILE); };

const YT_DAY = 10000, UPLOAD = 1600, REPLY = 50;
const q = () => { const d = day(); if (C.quota.day !== d) C.quota = { day: d, units: 0, replies: {} }; return C.quota; };
const spend = n => { q().units += n; };
function ytBudget() {
  const Q = q(), uploads = db.jobs.filter(j => j.pub?.youtube?.ok && (j.pub.youtube.at || '').startsWith(Q.day)).length;
  const reserve = Math.max(0, (db.settings.ytDailyMax || 6) - uploads) * UPLOAD;
  return Math.floor((YT_DAY - uploads * UPLOAD - Q.units - reserve - 200) / REPLY);
}
const repliesToday = chId => q().replies[chId] || 0;
const state = { running: false, last: null, error: null };

// ---------- Leer ----------
async function ytFetch(ch) {
  const g = publish.tokens.google?.[ch.id];
  if (!g?.yt?.id) return 0;
  const access = await publish.googleAccess(ch.id);
  const r = await fetch('https://www.googleapis.com/youtube/v3/commentThreads?' + new URLSearchParams({
    part: 'snippet,replies', allThreadsRelatedToChannelId: g.yt.id, maxResults: '50', order: 'time', textFormat: 'plainText',
  }), { headers: { authorization: 'Bearer ' + access } });
  spend(1);
  const j = await r.json();
  if (!r.ok) throw new Error('YouTube: ' + (j.error?.message || r.status));
  const have = new Set(C.items.map(x => x.id)), titles = videoTitles();
  let n = 0;
  for (const t of j.items || []) {
    const s = t.snippet.topLevelComment.snippet;
    if (have.has(t.id) || s.authorChannelId?.value === g.yt.id) continue;
    if ((t.replies?.comments || []).some(c => c.snippet.authorChannelId?.value === g.yt.id)) continue;
    if (Date.now() - new Date(s.publishedAt).getTime() > 7 * 86400000) continue;
    C.items.push({ id: t.id, plat: 'youtube', chId: ch.id, videoId: s.videoId, video: titles[s.videoId] || '', author: s.authorDisplayName, text: String(s.textDisplay || '').slice(0, 1500), at: s.publishedAt, status: 'nuevo' });
    n++;
  }
  return n;
}
async function fbFetch(ch) {
  const page = publish.tokens.facebook?.pages?.find(p => p.id === ch.fbPageId);
  if (!page) return 0;
  const have = new Set(C.items.map(x => x.id));
  let n = 0;
  const vids = db.jobs.filter(j => j.channelId === ch.id && j.pub?.facebook?.ok && j.pub.facebook.id && Date.now() - new Date(j.pub.facebook.when || j.pub.facebook.at).getTime() < 14 * 86400000);
  for (const jb of vids.slice(-20)) {
    const r = await fetch(`https://graph.facebook.com/${jb.pub.facebook.id}/comments?` + new URLSearchParams({ fields: 'id,message,from,created_time,comment_count', order: 'reverse_chronological', limit: '50', access_token: page.token }));
    const j = await r.json();
    if (!r.ok || j.error) throw new Error('Facebook: ' + (j.error?.message || r.status));
    for (const c of j.data || []) {
      if (have.has(c.id) || c.from?.id === page.id || c.comment_count > 0 || !c.message) continue;
      C.items.push({ id: c.id, plat: 'facebook', chId: ch.id, videoId: jb.pub.facebook.id, video: jb.seo?.youtube?.title || jb.title || '', author: c.from?.name || 'Alguien', text: String(c.message).slice(0, 1500), at: c.created_time, status: 'nuevo' });
      n++;
    }
    await sleep(300);
  }
  return n;
}
function videoTitles() {
  const m = {};
  for (const j of db.jobs) if (j.pub?.youtube?.id) m[j.pub.youtube.id] = j.seo?.youtube?.title || j.title || '';
  return m;
}

// ---------- Proponer respuestas con IA ----------
const replyP = (ch, list) => [{ role: 'user', content:
`Eres quien maneja la comunidad del canal "${ch.name}" (nicho: ${ch.niche}; tono: ${ch.tone || 'cercano y entusiasta'}).
Responde a estos comentarios de tus videos cortos. Reglas:
- Español latinoamericano natural, 1 o 2 frases (máximo 200 caracteres). A veces usa el nombre de la persona. Varía las respuestas: nunca dos iguales.
- Agradece, responde la duda si la sabes con seguridad o invita a seguir la conversación con una pregunta.
- Sin enlaces, sin pedir "suscríbete" en cada respuesta (como mucho en 1 de cada 5), sin prometer nada.
- No inventes datos. Si una pregunta es de salud personal (síntomas, dosis, enfermedades, medicamentos, embarazo), responde con cariño en general y recomienda consultar a un médico; márcala "delicado".
- "ignorar" para spam, estafas, enlaces, insultos, odio, contenido sexual o comentarios sin sentido.
- "critica" si es una queja o crítica: propón una respuesta educada y humilde (la revisará el dueño).
- "idea_video": si el comentario pide o sugiere un tema que serviría para un video nuevo del canal, escríbelo en una frase; si no, vacío.
COMENTARIOS:
${list.map(c => `[${c.id}] (video: ${c.video || 'sin título'}) ${c.author}: ${c.text.replace(/\s+/g, ' ').slice(0, 500)}`).join('\n')}
Devuelve SOLO JSON: {"r":[{"id":"...","tipo":"pregunta|elogio|critica|delicado|otro|ignorar","respuesta":"...","idea_video":""}]}` }];

async function propose(ch, log) {
  const pend = C.items.filter(x => x.chId === ch.id && x.status === 'nuevo').slice(0, 15);
  if (!pend.length) return 0;
  const r = await ai.ask(replyP(ch, pend), { json: true, max: 3000, log });
  const out = parseJSON(r.text).r || [];
  for (const o of out) {
    const it = pend.find(x => x.id === o.id);
    if (!it) continue;
    it.tipo = o.tipo || 'otro';
    it.idea = String(o.idea_video || '').trim().slice(0, 200);
    if (it.tipo === 'ignorar' || !String(o.respuesta || '').trim()) { it.status = 'ignorado'; continue; }
    it.reply = String(o.respuesta).trim().slice(0, 500);
    it.status = 'propuesta';
    if (['delicado', 'critica'].includes(it.tipo)) try { require('./avisos').avisar(`💬 Comentario ${it.tipo === 'delicado' ? 'delicado (salud)' : 'con crítica'} para revisar en ${ch.name}:\n${it.author}: ${it.text.slice(0, 200)}`); } catch (e) {}
  }
  pend.filter(x => x.status === 'nuevo').forEach(x => { x.tries = (x.tries || 0) + 1; if (x.tries >= 3) x.status = 'ignorado'; });
  save();
  return out.length;
}

// ---------- Responder ----------
async function send(it, text) {
  const ch = channel(it.chId);
  if (!ch) throw new Error('Canal no encontrado');
  text = String(text || it.reply || '').trim().slice(0, 1000);
  if (!text) throw new Error('La respuesta está vacía');
  if (it.plat === 'youtube') {
    if (ytBudget() < 1) throw new Error('Se acabó la cuota de YouTube de hoy (se guarda para las subidas). Mañana sigue.');
    const access = await publish.googleAccess(ch.id);
    const r = await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet', {
      method: 'POST', headers: { authorization: 'Bearer ' + access, 'content-type': 'application/json' },
      body: JSON.stringify({ snippet: { parentId: it.id, textOriginal: text } }),
    });
    spend(REPLY);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = j.error?.message || String(r.status);
      throw new Error(/insufficient|scope|permission/i.test(m) ? 'Falta permiso para responder: en Canales → Editar, desconecta YouTube y vuelve a conectarlo.' : 'YouTube: ' + m);
    }
  } else {
    const page = publish.tokens.facebook?.pages?.find(p => p.id === ch.fbPageId);
    if (!page) throw new Error('La página de Facebook no está conectada');
    const r = await fetch(`https://graph.facebook.com/${it.id}/comments`, { method: 'POST', body: new URLSearchParams({ message: text, access_token: page.token }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) {
      const m = j.error?.message || String(r.status);
      throw new Error(/permission|pages_manage_engagement/i.test(m) ? 'Falta permiso para responder: vuelve a conectar Facebook en Ajustes.' : 'Facebook: ' + m);
    }
    // En Facebook la página también le da "me gusta" al comentario (YouTube no lo permite por API).
    await fetch(`https://graph.facebook.com/${it.id}/likes`, { method: 'POST', body: new URLSearchParams({ access_token: page.token }) }).catch(() => {});
    it.liked = true;
  }
  it.reply = text; it.status = 'respondido'; it.sentAt = new Date().toISOString(); delete it.error;
  q().replies[it.chId] = repliesToday(it.chId) + 1;
  save();
}

// Respuestas automáticas: de a una por canal en cada vuelta, con pausas, para que se vea natural.
const AUTO_OK = ['pregunta', 'elogio', 'otro'];
async function autoSend(ch, log) {
  if (ch.comments !== 'auto') return;
  if (repliesToday(ch.id) >= (+ch.commentsMax || 30)) return;
  const it = C.items.find(x => x.chId === ch.id && x.status === 'propuesta' && AUTO_OK.includes(x.tipo) && !x.error
    && Date.now() - new Date(x.at).getTime() > 10 * 60000);
  if (!it) return;
  try { await send(it); log(`Respondí a ${it.author} en ${ch.name}`); }
  catch (e) { it.error = e.message; save(); log('Comentarios: ' + e.message); }
}

async function check({ force = false, log = m => console.log('[Comentarios] ' + m) } = {}) {
  if (state.running) return state;
  state.running = true; state.error = null;
  try {
    for (const ch of db.channels.filter(c => c.comments && c.comments !== 'off')) {
      const every = 30 * 60000;
      if (force || !C.last[ch.id] || Date.now() - C.last[ch.id] > every) {
        C.last[ch.id] = Date.now();
        let n = 0;
        try { n += await ytFetch(ch); } catch (e) { state.error = e.message; log(ch.name + ': ' + e.message); }
        try { n += await fbFetch(ch); } catch (e) { state.error = e.message; log(ch.name + ': ' + e.message); }
        if (n) log(`${ch.name}: ${n} comentario(s) nuevo(s)`);
        save();
      }
      try { await propose(ch, () => {}); } catch (e) { state.error = 'IA: ' + e.message; }
      await autoSend(ch, log);
    }
    state.last = new Date().toISOString();
  } finally { state.running = false; }
  return state;
}

async function action(o) {
  const it = C.items.find(x => x.id === o.id);
  if (!it) throw new Error('Comentario no encontrado');
  if (o.act === 'send') { await send(it, o.text); return { ok: 1 }; }
  if (o.act === 'ignore') { it.status = 'ignorado'; save(); return { ok: 1 }; }
  if (o.act === 'redo') { it.status = 'nuevo'; delete it.reply; delete it.error; save(); await propose(channel(it.chId), () => {}); return { ok: 1 }; }
  if (o.act === 'idea_done') { it.ideaUsed = true; save(); return { ok: 1 }; }
  throw new Error('Acción desconocida');
}

function list() {
  const names = Object.fromEntries(db.channels.map(c => [c.id, c.name]));
  return {
    items: C.items.slice(-400).reverse().map(x => ({ ...x, channel: names[x.chId] || '?' })),
    budget: Math.max(0, ytBudget()), units: q().units, state,
    today: Object.values(q().replies).reduce((a, b) => a + b, 0),
  };
}

function start() {
  setTimeout(() => check().catch(() => {}), 20000);
  setInterval(() => check().catch(e => console.log('[Comentarios] ' + e.message)), 5 * 60000);
}

module.exports = { spend, check, action, list, start, ytBudget, _C: C, replyP };
