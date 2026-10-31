// Avisos y tareas diarias:
//  - Telegram (gratis, API oficial de bots): te avisa al celular (video listo, errores, comentarios delicados,
//    videos que despegan, resumen diario) y publica cada video nuevo en el canal de Telegram de cada canal.
//  - Comunidad: cada día prepara una publicación (encuesta, pregunta o adelanto). En Facebook se publica sola;
//    para la pestaña Comunidad de YouTube queda lista para copiar (YouTube no permite publicarla por API).
//  - Respaldo automático diario de tus claves y datos (se guardan los últimos 7).
const fs = require('fs'), path = require('path');
const { E, DATA, USERDATA, ENV_FILE, day, parseJSON } = require('./util');
const { db, saveAll } = require('./store');

// ---------- Telegram ----------
async function tg(method, body) {
  if (!E.TELEGRAM_BOT_TOKEN) throw new Error('Falta el token del bot de Telegram (Ajustes)');
  const r = await fetch(`https://api.telegram.org/bot${E.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error('Telegram: ' + (j.description || r.status));
  return j.result;
}
const quiet = p => p.catch(e => console.log('[Avisos] ' + e.message));
function avisar(texto) {
  if (!E.TELEGRAM_BOT_TOKEN || !E.TELEGRAM_CHAT_ID || db.settings.telegram === false) return;
  quiet(tg('sendMessage', { chat_id: E.TELEGRAM_CHAT_ID, text: String(texto).slice(0, 3500), disable_web_page_preview: true }));
}
// Busca tu chat: escribe /start a tu bot y pulsa "Detectar" en Ajustes.
async function detectarChat() {
  const ups = await tg('getUpdates', { limit: 20 });
  const m = [...ups].reverse().find(u => u.message?.chat?.id);
  if (!m) throw new Error('Escríbele "/start" a tu bot en Telegram y vuelve a pulsar Detectar');
  require('./util').setKeys({ TELEGRAM_CHAT_ID: String(m.message.chat.id) });
  await tg('sendMessage', { chat_id: m.message.chat.id, text: '✅ ShortForge conectado. Aquí te avisaré de tus videos.' });
  return m.message.chat.first_name || m.message.chat.title || 'tu chat';
}

const nameOf = id => db.channels.find(c => c.id === id)?.name || '?';
function job(j) {
  if (j.status === 'revisar') avisar(`🎬 Video listo para revisar\n${nameOf(j.channelId)}: ${j.title || j.topic}${j.review ? `\nCalidad: ${j.review.nota}/10` : ''}`);
  else if (j.status === 'error') avisar(`⚠️ Falló un video\n${nameOf(j.channelId)}: ${j.topic || j.title}\n${j.error}`);
}
function videoPublicado(j, ch, plat, r) {
  if (plat !== 'youtube' || !r?.url) return;
  if (ch.telegram && !r.scheduled && E.TELEGRAM_BOT_TOKEN)
    quiet(tg('sendMessage', { chat_id: ch.telegram, text: `${j.seo?.youtube?.title || j.title}\n\n▶️ ${r.url}` }));
  if (r.scheduled && ch.telegram) j.tgPending = true; // se publica en Telegram cuando salga
}
// Videos programados que ya salieron: se anuncian en el canal de Telegram.
function anunciarProgramados() {
  for (const j of db.jobs.filter(x => x.tgPending && x.pub?.youtube?.ok && new Date(x.pub.youtube.when).getTime() <= Date.now())) {
    const ch = db.channels.find(c => c.id === j.channelId);
    j.tgPending = false;
    if (ch?.telegram && E.TELEGRAM_BOT_TOKEN) quiet(tg('sendMessage', { chat_id: ch.telegram, text: `${j.seo?.youtube?.title || j.title}\n\n▶️ ${j.pub.youtube.url}` }));
  }
  saveAll.jobs();
}

function resumenDiario() {
  const d = day(), ayer = require('./util').addDays(d, -1);
  const J = db.jobs;
  const lines = [`☀️ Buenos días, Josefino. Resumen de ShortForge:`,
    `• Videos hechos ayer: ${J.filter(j => (j.created || '').startsWith(ayer)).length}`,
    `• Para revisar: ${J.filter(j => j.status === 'revisar').length}`,
    `• Publicados/programados ayer: ${J.filter(j => Object.values(j.pub || {}).some(p => p.ok && (p.at || '').startsWith(ayer))).length}`];
  for (const c of db.channels.filter(c => c.ytStats)) lines.push(`• ${c.name}: ${c.ytStats.subs ?? '?'} subs · ${(c.ytStats.shortsViews90 || 0).toLocaleString('es')} vistas Shorts (90 días)`);
  const hot = J.filter(j => j.stats && j.pub?.youtube?.ok).sort((a, b) => b.stats.views - a.stats.views)[0];
  if (hot) lines.push(`🔥 Tu mejor video: "${hot.title}" (${hot.stats.views.toLocaleString('es')} vistas)`);
  avisar(lines.join('\n'));
}

// ---------- Comunidad ----------
const comunidadP = ch => [{ role: 'user', content:
`Eres community manager del canal "${ch.name}" (nicho: ${ch.niche}). Crea UNA publicación para la pestaña Comunidad de YouTube y la página de Facebook.
Alterna el tipo (los últimos fueron: ${(ch.comunidad || []).slice(-3).map(x => x.tipo).join(', ') || 'ninguno'}): "encuesta" (pregunta + 2 a 4 opciones), "pregunta" (abierta, que invite a comentar) o "adelanto" (del próximo video, que dé curiosidad).
${(ch.tendencias || []).length ? 'Temas que interesan ahora: ' + ch.tendencias.slice(0, 4).join(' | ') : ''}
Corto (máx 300 caracteres), cercano, 1 o 2 emojis, sin enlaces. Nada de promesas de salud.
Devuelve SOLO JSON: {"tipo":"encuesta","texto":"...","opciones":["...","..."]}` }];

async function comunidad(ch) {
  const ai = require('./ai');
  const o = parseJSON((await ai.ask(comunidadP(ch), { json: true, max: 800 })).text);
  const post = { id: Date.now().toString(36), tipo: String(o.tipo || 'pregunta'), texto: String(o.texto || '').slice(0, 500), opciones: (o.opciones || []).slice(0, 4).map(String), at: new Date().toISOString() };
  if (!post.texto) return null;
  const page = ch.fbCommunity && require('./publish').tokens.facebook?.pages?.find(p => p.id === ch.fbPageId);
  if (page) {
    const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const msg = post.texto + (post.opciones.length ? '\n\n' + post.opciones.map((x, i) => `${nums[i]} ${x}`).join('\n') + '\n\n¡Responde con el número en los comentarios! 👇' : '');
    try {
      const r = await fetch(`https://graph.facebook.com/${page.id}/feed`, { method: 'POST', body: new URLSearchParams({ message: msg, access_token: page.token }) });
      const j = await r.json();
      post.fb = j.id ? { ok: true, id: j.id } : { ok: false, error: j.error?.message || 'error' };
    } catch (e) { post.fb = { ok: false, error: e.message }; }
  }
  ch.comunidad = [...(ch.comunidad || []), post].slice(-10);
  saveAll.channels();
  return post;
}

// ---------- Respaldo diario ----------
function respaldo() {
  const base = path.join(USERDATA, 'respaldos');
  const dest = path.join(base, new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
  fs.mkdirSync(dest, { recursive: true });
  if (fs.existsSync(ENV_FILE)) fs.copyFileSync(ENV_FILE, path.join(dest, '.env'));
  fs.cpSync(DATA, path.join(dest, 'data'), { recursive: true, filter: s => !/[\\/]data[\\/](videos|cache|originales)([\\/]|$)/.test(s) });
  // Se guardan los últimos 7 respaldos automáticos
  const all = fs.readdirSync(base).filter(f => /^\d{4}-/.test(f)).sort();
  for (const old of all.slice(0, Math.max(0, all.length - 7))) try { fs.rmSync(path.join(base, old), { recursive: true, force: true }); } catch (e) {}
  db.settings.lastBackup = new Date().toISOString(); saveAll.settings();
  return dest;
}

// ---------- Reloj diario ----------
async function diario() {
  const S = db.settings, d = day(), h = new Date().getHours();
  if (!S.lastBackup || Date.now() - new Date(S.lastBackup).getTime() > 20 * 3600000) { try { respaldo(); console.log('[Avisos] Respaldo diario hecho'); } catch (e) { console.log('[Avisos] Respaldo: ' + e.message); } }
  if (h >= 8 && S.lastSummary !== d) { S.lastSummary = d; saveAll.settings(); resumenDiario(); }
  if (h >= 11) for (const ch of db.channels.filter(c => c.active && c.community)) {
    if ((ch.comunidad || []).some(p => p.at.startsWith(d))) continue;
    const every = +ch.communityEvery || 2; // cada cuántos días
    const last = (ch.comunidad || []).slice(-1)[0];
    if (last && Date.now() - new Date(last.at).getTime() < (every - 0.5) * 86400000) continue;
    try { const p = await comunidad(ch); if (p) avisar(`📢 Publicación de Comunidad lista (${ch.name})${p.fb?.ok ? ' — ya publicada en Facebook' : ''}. Cópiala en YouTube desde la pestaña Estadísticas.`); }
    catch (e) { console.log('[Comunidad] ' + e.message); }
  }
  anunciarProgramados();
}
// TikTok no permite publicar por API: te avisa al celular a la hora de cada video para que lo subas.
function horaTikTok() {
  const hoy = day(), ahora = Date.now();
  for (const j of db.jobs.filter(x => x.publishDate === hoy && x.horas?.tiktok && !x.avisoTT && ['aprobado', 'programado', 'publicado'].includes(x.status))) {
    const t = new Date(`${hoy}T${j.horas.tiktok}:00`).getTime();
    if (t - ahora <= 10 * 60000 && ahora - t <= 30 * 60000) {
      j.avisoTT = true; saveAll.jobs();
      const ch = db.channels.find(c => c.id === j.channelId);
      avisar(`📱 Hora de subir a TikTok (${j.horas.tiktok}) — ${ch?.name || ''}\n«${j.seo?.youtube?.title || j.title || ''}»\nDescárgalo en Videos → "Descargar para TikTok/Facebook" y copia el texto de TikTok.`);
    }
  }
}

function start() {
  setInterval(() => { try { horaTikTok(); } catch (e) {} }, 5 * 60000);
  setTimeout(() => diario().catch(() => {}), 30000);
  setInterval(() => diario().catch(e => console.log('[Avisos] ' + e.message)), 20 * 60000);
}

module.exports = { avisar, detectarChat, job, videoPublicado, comunidad, respaldo, resumenDiario, start, tg };
