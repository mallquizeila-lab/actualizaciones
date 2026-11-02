// Panel de ShortForge (sin librerías).
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmtDay = s => new Date(s + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

let S = null, tab = store.get('tab', 'hoy'), sig = '', filter = store.get('filter', 'revisar');
// Títulos con nombres automáticos de archivo (ej. "AQMAfOm7Jn...") se muestran legibles.
const nice = t => { t = String(t || ''); return /^\S{25,}/.test(t.replace(/ /g, '')) && t.split(' ').some(w => w.length > 25) ? 'Video subido (' + t.slice(0, 6) + '…)' : t; };
// Errores explicados en palabras simples, con qué hacer.
const AYUDA = [
  [/cuota|quota|agotad|rate.?limit|429|ningún motor/i, 'Las IA gratis llegaron a su límite por ahora. El sistema reintenta solo; para no esperar, agrega motores de reserva (GitHub, OpenRouter) en Ajustes.'],
  [/no pude mirar|ver imágenes|visión/i, 'Ninguna IA pudo "ver" el video en este momento. Se reintenta solo en 2 horas, o pulsa "Intentar ahora" más tarde.'],
  [/ENOSPC|no space|espacio/i, 'Tu disco está lleno. Borra videos viejos o pulsa Ajustes → Mantenimiento → Limpiar ahora.'],
  [/ffmpeg/i, 'Falta ffmpeg o falló al armar el video. Abre start.bat de nuevo; si sigue, genera un reporte en Ajustes y mándamelo.'],
  [/chatterbox|voz clonada/i, 'La voz clonada no está disponible. Revisa que Chatterbox esté instalado (instalar_ia_local.bat).'],
  [/whisper|transcrib/i, 'No se pudo escuchar el audio. Revisa que Whisper esté instalado (instalar_ia_local.bat).'],
  [/clave|api key|unauthorized|401|403|invalid/i, 'Una clave no es válida o venció. Ve a Ajustes, pega una nueva y pulsa Probar.'],
  [/ENOENT|no encuentro|ya no está/i, 'Falta un archivo (quizás se movió o borró el video original). Súbelo de nuevo.'],
];
const ayuda = e => (AYUDA.find(([re]) => re.test(e || '')) || [, 'Si se repite, genera un reporte en Ajustes → Mantenimiento y mándamelo.'])[1];
// Nombre del archivo al descargar: "titulo-del-video-youtube.mp4"
const fname = (j, k) => String(nice(j.title || j.topic || 'video')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '-' + k + '.mp4';
const STATUS = { elegir: '🎭 Elige las voces', cola: 'En cola', produciendo: 'Produciendo', revisar: 'Por revisar', aprobado: 'Aprobado', programado: 'Programado', publicado: 'Publicado', error: 'Error', dividido: 'Dividido en Shorts' };

async function api(u, o) {
  const r = await fetch(u, o === undefined ? {} : { method: 'POST', headers: { 'x-sf': '1', 'content-type': 'application/json' }, body: JSON.stringify(o) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || 'Error ' + r.status);
  return j;
}
async function uploadFile(file, q) {
  const r = await fetch('/api/upload?' + new URLSearchParams(q), { method: 'POST', headers: { 'x-sf': '1' }, body: file });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || 'No se pudo subir');
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3500); }
const guard = fn => async el => { try { await fn(el); } catch (e) { alert(e.message); } };
const chName = id => S.channels.find(c => c.id === id)?.name || '(canal borrado)';
const status = s => `<span class="chip st-${s}">${STATUS[s] || s}</span>`;
const logoHtml = c => c.logo ? `<img class="logo" src="/files/logos/${c.id}.png?v=${c.logo}" alt="">` : `<div class="logo" style="background:${esc(c.color || '#14532d')}">${esc((c.name || '?')[0])}</div>`;

// Markdown sencillo para las respuestas del asistente: títulos, negritas, listas y separadores.
function md(t) {
  const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
  let html = '', list = false, code = null, tabla = [];
  const cerrarTabla = () => {
    if (!tabla.length) return;
    const filas = tabla.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)).map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    html += '<div class="mdt"><table>' + filas.map((f, i) => '<tr>' + f.map(c => i ? `<td>${inline(c)}</td>` : `<th>${inline(c)}</th>`).join('') + '</tr>').join('') + '</table></div>';
    tabla = [];
  };
  for (const raw of String(t || '').split('\n')) {
    if (/^\s*```/.test(raw)) { if (code === null) { if (list) { html += '</ul>'; list = false; } cerrarTabla(); code = []; } else { html += `<pre class="mdc">${esc(code.join('\n'))}</pre>`; code = null; } continue; }
    if (code !== null) { code.push(raw); continue; }
    if (/^\s*\|.*\|\s*$/.test(raw)) { if (list) { html += '</ul>'; list = false; } tabla.push(raw); continue; }
    cerrarTabla();
    const l = raw.trimEnd(), li = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (li) { if (!list) { html += '<ul>'; list = true; } html += '<li>' + inline(li[1]) + '</li>'; continue; }
    if (list) { html += '</ul>'; list = false; }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) html += `<h4 class="mdh">${inline(h[2])}</h4>`;
    else if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) html += '<hr>';
    else if (l.trim()) html += '<p>' + inline(l) + '</p>';
  }
  cerrarTabla();
  if (code !== null) html += `<pre class="mdc">${esc(code.join('\n'))}</pre>`;
  return html + (list ? '</ul>' : '');
}

// ---------- Estado y refresco ----------
async function refresh(force) {
  S = await api('/api/state');
  const cur = S.jobs.find(j => j.id === S.worker.current);
  $('#worker').innerHTML = cur ? `<b>Produciendo${cur.inicio ? ' (' + Math.round((Date.now() - cur.inicio) / 60000) + ' min)' : ''}:</b><br>${esc(chName(cur.channelId))}<br><span style="opacity:.8">${esc(cur.log.at(-1) || '')}</span><br>${S.jobs.filter(j => j.status === 'cola').length} en cola` : '';
  const rev = S.jobs.filter(j => j.status === 'revisar' || j.status === 'elegir').length;
  $('#badge').textContent = rev || '';
  const s2 = JSON.stringify([S.jobs.map(j => j.id + j.status + (j.result?.dir || '')), S.channels.length, S.worker.current]);
  if (force || (s2 !== sig && ['hoy', 'videos', 'calendario'].includes(tab))) render();
  sig = s2;
  if (tab === 'desarmar' && Date.now() - DSt > 5000 && (DS || []).some(d => !['listo', 'error'].includes(d.estado))) loadDS().catch(() => {});
  if (tab === 'estadisticas' && Date.now() - BRt > 30000) loadBrain(true).catch(() => {});
  if (tab === 'viral' && Date.now() - VSt > 5000 && document.activeElement?.tagName !== 'INPUT') loadViral().catch(() => {});
  if (Date.now() - CMt > (tab === 'comentarios' ? 15000 : 120000)) loadComments().catch(() => {});
  document.querySelectorAll('[data-log]').forEach(el => { const j = S.jobs.find(x => x.id === el.dataset.log); if (j) { el.innerHTML = j.log.map(esc).join('<br>'); el.scrollTop = 1e6; } });
}
function render() {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#main').innerHTML = VIEWS[tab]();
  if (tab === 'chat') { const m = $('.msgs'); if (m) m.scrollTop = 1e6; }
}

// ---------- Vistas ----------
const VIEWS = {};

VIEWS.hoy = () => {
  const t = today(), J = S.jobs, n = s => J.filter(j => j.status === s).length;
  const anyAI = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'NVIDIA_API_KEY', 'ANTHROPIC_API_KEY'].some(k => S.keys[k]);
  const act = S.channels.filter(c => c.active);
  const setup = [
    [S.tools?.ffmpeg, 'ffmpeg instalado (para armar los videos)'],
    [S.tools?.edge, 'Voces de Microsoft Edge instaladas (gratis)'],
    [anyAI, 'Clave de IA gratis (Gemini) en Ajustes'],
    [S.keys.PEXELS_API_KEY || S.keys.PIXABAY_API_KEY, 'Clave de Pexels para las fotos (gratis)'],
    [S.channels.length, 'Tus canales creados'],
    [act.length && act.every(c => c.logo), 'Logo en cada canal activo'],
    [act.filter(c => c.style === 'personaje').every(c => (c.characters || []).some(x => x.closed)), 'Imágenes de los personajes (canal de frutas)'],
  ];
  const done = setup.every(x => x[0]);
  const forToday = J.filter(j => j.publishDate === t && ['revisar', 'aprobado', 'programado'].includes(j.status));
  return `<h1>Hola, Josefino 👋</h1><p class="sub">${esc(fmtDay(t))}. Esto es lo que toca hoy.</p>
  ${done ? '' : `<div class="card"><h3>Para dejar todo listo</h3><ul class="check" style="list-style:none;padding:0">${setup.map(([ok, l]) => `<li class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${l}</li>`).join('')}</ul>
    <div class="btns"><button class="b" data-act="go" data-tab="ajustes">Ir a Ajustes</button><button class="b ghost" data-act="go" data-tab="canales">Ir a Canales</button></div></div>`}
  ${radarCard()}
  <div class="stats">
    <div class="stat"><b>${n('revisar')}</b><span>Por revisar</span></div>
    <div class="stat"><b>${n('aprobado')}</b><span>Aprobados, falta programar</span></div>
    <div class="stat"><b>${n('cola') + n('produciendo')}</b><span>En producción</span></div>
    <div class="stat"><b>${J.filter(j => j.status === 'publicado').length}</b><span>Publicados en total</span></div>
    <div class="stat"><b>${act.length}</b><span>Canales activos</span></div>
  </div>
  ${(() => { const esperando = J.filter(j => j.status === 'cola' && j.notBefore), ag = S.cuotas || [], prov = S.providers || {};
    const items = [
      [S.activos?.length, `Motores de IA activos: <b>${(S.activos || []).map(p => esc(prov[p]?.label || p)).join(', ') || 'ninguno'}</b>`],
      [!ag.length, ag.length ? `Cuota agotada por hoy: <b>${ag.map(x => esc(x.modelo)).join(', ')}</b> (el sistema usa los de reserva y se renueva solo)` : 'Ningún motor sin cuota'],
      [S.tools?.whisper, S.tools?.whisper ? 'Whisper instalado (subtítulos exactos y clonar voces)' : 'Falta Whisper: ejecuta instalar_ia_local.bat'],
      [S.tools?.edge, S.tools?.edge ? 'Voces de Microsoft listas' : 'Voces de Microsoft no disponibles: abre start.bat con internet'],
      [!esperando.length, esperando.length ? `${esperando.length} video(s) esperando reintentar (cuota) — ver en Videos` : 'Ningún video esperando'],
      [S.lastBackup, S.lastBackup ? 'Último respaldo: ' + esc(new Date(S.lastBackup).toLocaleString('es')) : 'Aún sin respaldo automático'],
      ...(() => { const h = S.salud?.health?.engines; if (!h) return []; const ven = Object.entries(h).filter(([, x]) => x.vision).map(([p]) => esc(prov[p]?.label || p)), mal = Object.entries(h).filter(([, x]) => !x.ok).map(([p]) => esc(prov[p]?.label || p));
        return [[ven.length, ven.length ? `Pueden mirar imágenes hoy: <b>${ven.join(', ')}</b>` : '<b>Ningún motor puede mirar imágenes hoy</b>: los reeditados esperarán (agrega GitHub u OpenRouter en Ajustes)'], ...(mal.length ? [[false, `Con problema en la última revisión: ${mal.join(', ')} (Ajustes → Motores de IA → Probar)`]] : [])]; })(),
      ...(S.salud?.disco ? [[!S.salud.poco, `Disco: <b>${S.salud.disco.libreGB} GB libres</b>${S.salud.poco ? ' — ¡libera espacio!' : ''} · tus videos ocupan ${S.salud.videosGB} GB`]] : []),
      ...(S.salud?.vencen || []).map(v => [false, `La clave <b>${esc(v.clave)}</b> vence en ${v.quedan} días: crea una nueva y pégala en Ajustes`]),
    ];
    return `<div class="card"><h3>🩺 Estado del sistema</h3><ul class="check" style="list-style:none;padding:0">${items.map(([ok, l]) => `<li style="margin:4px 0">${ok ? '✅' : '⚠️'} ${l}</li>`).join('')}</ul></div>`; })()}
  <div class="card"><h3>Producción</h3>
    <p class="hint">Cada noche a las <b>${esc(S.settings.nightly.time)}</b> ${S.settings.nightly.enabled ? 'se preparan' : '(desactivado) se prepararían'} <b>${S.settings.videosPerDay}</b> videos, rotando entre tus canales activos. Deja la PC encendida y sin suspender.</p>
    <div class="btns"><button class="b" data-act="plan" data-date="${t}">Producir ahora los de hoy</button><button class="b ghost" data-act="plan" data-date="${addDays(t, 1)}">Producir ya los de mañana</button><button class="b ghost" data-act="go" data-tab="crear">Crear un video a mano</button></div></div>
  <div class="card"><h3>Para publicar hoy</h3>${forToday.length ? forToday.map(j => {
    const c = S.channels.find(x => x.id === j.channelId) || {};
    return `<div class="item"><div><b>${esc(c.name)}</b> · ${esc(j.title || j.topic)}<div class="times">YouTube ${esc(j.horas?.youtube || c.times?.youtube)} · TikTok ${esc(j.horas?.tiktok || c.times?.tiktok)} · Facebook ${esc(j.horas?.facebook || c.times?.facebook)}</div></div><div>${status(j.status)}</div></div>`;
  }).join('') : '<p class="hint">Nada programado para hoy todavía.</p>'}
    <div class="btns"><button class="b ghost sm" data-act="go" data-tab="videos">Ver videos</button><button class="b ghost sm" data-act="go" data-tab="calendario">Ver calendario</button></div></div>
  <div class="card"><h3>Tu rutina de 4 horas</h3><ol class="steps">
    <li><b>30 min · Revisar y aprobar</b> los videos de la noche (Videos → Por revisar). Mira las frases marcadas por la verificación.</li>
    <li><b>45 min · Programar</b>: YouTube Studio, TikTok Studio y Meta Business Suite. Copia título, descripción y etiquetas con un clic. Mejor aún: hazlo en bloque 1 o 2 veces por semana.</li>
    <li><b>60 min · Responder comentarios.</b> Es lo que más empuja al algoritmo en canales nuevos.</li>
    <li><b>45 min · Revisar resultados</b> y preguntarle al Asistente IA qué temas y ganchos funcionan.</li>
    <li><b>60 min · Mejorar</b> lo que mejor va: rehacer ganchos, probar formatos, subir la prioridad del canal que crece.</li></ol></div>`;
};

VIEWS.canales = () => {
  const missing = S.channels.length < 10;
  return `<h1>Canales</h1><p class="sub">Cada canal es el mismo en YouTube, TikTok y Facebook. Aquí van su nombre, logo, voz, nicho y horarios.</p>
  <div class="btns" style="margin:0 0 16px"><button class="b" data-act="editCh">+ Nuevo canal</button>${missing ? '<button class="b ghost" data-act="presets">Cargar mis 10 canales sugeridos</button>' : ''}</div>
  ${S.channels.length ? `<div class="grid">${S.channels.map(c => `<div class="card ${c.active ? '' : 'off'}" style="margin:0"><div class="ch">${logoHtml(c)}<div><h3>${esc(c.name)}</h3><div class="hint">${esc(c.niche)}</div></div></div>
    <p style="margin:10px 0 0">${c.active ? '<span class="chip st-aprobado">Activo</span>' : '<span class="chip">Pausado</span>'} <span class="chip">${c.style === 'personaje' ? 'Personajes que hablan' : 'Fotos + narración'}</span>${c.logo ? '' : ' <span class="chip st-error">Sin logo</span>'}</p>
    <div class="times" style="margin-top:8px">YT ${esc(c.times?.youtube)} · TT ${esc(c.times?.tiktok)} · FB ${esc(c.times?.facebook)}</div>
    <div class="btns"><button class="b sm" data-act="editCh" data-id="${c.id}">Editar</button><button class="b ghost sm" data-act="quickJob" data-id="${c.id}">Crear video</button><button class="b ghost sm" data-act="toggleCh" data-id="${c.id}">${c.active ? 'Pausar' : 'Activar'}</button></div></div>`).join('')}</div>`
    : '<div class="card empty">Todavía no tienes canales. Crea uno o carga los 10 sugeridos.</div>'}`;
};

VIEWS.crear = () => {
  const chs = [...S.channels].sort((a, b) => b.active - a.active);
  if (!chs.length) return `<h1>Crear videos</h1><div class="card empty">Primero crea un canal.<div class="btns" style="justify-content:center"><button class="b" data-act="go" data-tab="canales">Ir a Canales</button></div></div>`;
  return `<h1>Crear videos</h1><p class="sub">Normalmente no necesitas esto: la producción nocturna lo hace sola. Úsalo para un tema concreto o para adelantar trabajo.</p>
  ${(() => { const el = S.jobs.filter(j => j.status === 'elegir' && j.pre && j.kind !== 'reedit'); return el.length ? `<div class="card"><h3>🎭 Guiones listos esperando que elijas las voces (${el.length})</h3>${el.map(j => `<p style="margin:10px 0 0"><b>${esc(chName(j.channelId))}</b> · ${esc(j.topic || j.title || '')}</p>` + eligeBox(j)).join('')}</div>` : ''; })()}
  <div class="card"><label>Canal<select id="cj-ch">${chs.map(c => `<option value="${c.id}" ${c.id === store.get('lastCh') ? 'selected' : ''}>${esc(c.name)}${c.active ? '' : ' (pausado)'}</option>`).join('')}</select></label>
  <label>Temas <small>(uno por línea; déjalo vacío para que la IA elija temas con potencial)</small><textarea id="cj-topics" placeholder="Ej: Esto le pasa a tu cuerpo si comes ajo en ayunas"></textarea></label>
  <div class="row"><label>Cantidad <small>(si no escribes temas)</small><input id="cj-n" type="number" min="1" max="10" value="1"></label><label>Fecha de publicación<input id="cj-date" type="date" value="${today()}"></label></div>
  <div class="btns"><button class="b big" data-act="createJobs">Agregar a la cola</button></div></div>
  <div class="card"><h3>💡 Inspirarse en un viral</h3><p class="hint">Pega la transcripción de un video viral (en YouTube: "...más" → "Mostrar transcripción"). La IA analiza <b>por qué funciona</b> (gancho, ritmo, giros, CTAs) y crea un video <b>original</b> con esa técnica pero con otro tema o ángulo. Nunca copia frases ni la historia: así no te reclaman ni te desmonetizan.</p>
  <label>Canal<select id="in-ch">${chs.map(c => `<option value="${c.id}" ${c.id === store.get('lastCh') ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label>Transcripción del viral<textarea id="in-tr" style="min-height:140px" placeholder="Pega aquí el texto completo del video"></textarea></label>
  <label>Indicaciones <small>(opcional: qué quieres cambiar o mejorar)</small><input id="in-notes" placeholder="Ej: hazlo sobre el jengibre, más divertido"></label>
  <div class="row"><label>Fecha de publicación<input id="in-date" type="date" value="${today()}"></label></div>
  <div class="btns"><button class="b big" data-act="inspire">Crear video original</button></div></div>`;
};

function copyBox(k, v) { if (!v) return ''; return `<div class="copy"><span class="k">${k}</span>${esc(v)}<button class="b ghost sm" data-act="copy">Copiar</button></div>`; }
// 📡 Radar de tendencias (en Hoy)
function radarCard() {
  const chs = S.channels.filter(c => c.active);
  if (!chs.length) return '';
  const sel = chs.find(c => c.id === store.get('radarCh')) || chs[0], R = sel.radar;
  const F = { comentarios: '💬 comentarios', buscador: '🔎 buscador', google: '📈 Google', wikipedia: '📚 Wikipedia', cerebro: '🧠 cerebro' };
  return `<div class="card"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3 style="margin:0">📡 Radar de tendencias</h3>
    <select data-act-change="radarCh" style="width:auto;padding:2px 6px">${chs.map(c => `<option value="${c.id}" ${c.id === sel.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <button class="b ghost sm" data-act="radarScan" data-id="${sel.id}">Buscar ahora</button>
    <span class="hint">${R ? 'Actualizado ' + esc(new Date(R.at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })) + ` · leyó ${R.fuentes.comentarios} comentarios, ${R.fuentes.buscador} búsquedas, ${R.fuentes.google} tendencias de Google y ${R.fuentes.wikipedia} de Wikipedia` : 'Se actualiza solo cada mañana.'}</span></div>
    ${R?.ideas?.length ? `<div style="margin-top:8px">${R.ideas.map(i => `<div class="item"><div><b>${esc(i.tema)}</b> <span class="chip ${i.puntaje >= 8 ? 'st-aprobado' : ''}">🔥 ${i.puntaje}/10</span> <span class="chip">${F[i.fuente] || esc(i.fuente)}</span>
      <div class="hint">${esc(i.porque)}${i.gancho ? ' · Gancho: «' + esc(i.gancho) + '»' : ''}</div></div><div><button class="b sm" data-act="radarJob" data-id="${sel.id}" data-t="${esc(i.tema)}">Crear video</button></div></div>`).join('')}</div>
      <p class="hint">Las ideas de 7/10 o más pasan solas a la fila de temas del canal.</p>` : ''}</div>`;
}
const RED = { youtube: 'YouTube', facebook: 'Facebook', tiktok: 'TikTok', instagram: 'Instagram', bluesky: 'Bluesky', mastodon: 'Mastodon', discord: 'Discord', blogger: 'Blogger' };
const tagLine = a => (a || []).map(t => '#' + String(t).replace(/^#/, '').replace(/\s+/g, '')).join(' ');

function videoCard(j) {
  const c = S.channels.find(x => x.id === j.channelId) || {}, r = j.result, base = r ? `/files/videos/${r.dir}/` : '';
  const y = j.seo?.youtube || {}, tt = j.seo?.tiktok || {}, fb = j.seo?.facebook || {};
  const cred = r?.credits?.length ? '\n\nImágenes: ' + r.credits.join(', ') : '';
  const media = r?.borrado ? `<div class="ph" style="display:grid;place-items:center;text-align:center;padding:10px">🗑 Archivo borrado para liberar espacio (ya estaba publicado)</div>` : r ? `<video src="${base}${r.files.youtube}" ${r.files.cover ? `poster="${base}${r.files.cover}"` : ''} controls preload="none"></video>` : `<div class="cover" style="width:200px;aspect-ratio:9/16;border-radius:10px;background:${esc(c.color || '#14532d')};display:grid;place-items:center;color:#fff;padding:12px;text-align:center">${STATUS[j.status]}</div>`;
  return `<div class="card"><div class="vid">${media}<div style="min-width:0">
    <div class="hint"><select data-act-change="canal" data-id="${j.id}" title="Pasar o copiar este video a otro canal" style="width:auto;padding:2px 6px">${S.channels.map(x => `<option value="${x.id}" ${x.id === j.channelId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select> · publicar el <input type="date" value="${esc(j.publishDate)}" data-act-change="date" data-id="${j.id}" style="width:auto;padding:2px 6px"> a las <input type="time" value="${esc(j.horaFija || j.horas?.youtube || '')}" data-act-change="hora" data-id="${j.id}" style="width:auto;padding:2px 6px"> <b>hora Perú</b>${j.horaFija ? ' <a href="#" data-act-hora="auto" data-id="' + j.id + '" class="hint">(usar horario del canal)</a>' : ''}</div>
    <h3 style="margin-top:6px">${esc(nice(j.title || j.topic || 'Tema automático'))}</h3>${status(j.status)}${j.character ? ` <span class="chip">${esc(j.character)}</span>` : ''}
    ${['cola', 'produciendo', 'error'].includes(j.status) ? `<div class="log" data-log="${j.id}">${j.log.map(esc).join('<br>')}</div>` : ''}
    ${j.status === 'error' ? `<div class="issues" style="border-left-color:var(--bad)"><b>¿Qué pasó?</b> ${esc(ayuda(j.error))}</div>` : ''}
    ${j.status === 'cola' && j.notBefore ? `<div class="btns" style="margin:6px 0 0"><span class="hint" style="align-self:center">⏳ Reintenta solo a las ${esc(new Date(j.notBefore).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }))}</span><button class="b ghost sm" data-act="job" data-a="retryNow" data-id="${j.id}">Intentar ahora</button></div>` : ''}
    ${j.warning ? `<div class="issues" style="border-left-color:var(--bad)"><b>⚠ ${esc(j.warning)}</b></div>` : ''}
    ${j.analysis ? `<details class="seo"><summary>💡 Técnica tomada del viral</summary><p style="white-space:pre-wrap">${esc(j.analysis)}</p></details>` : ''}
    ${r ? `<div style="margin-top:6px">${r.karaoke ? '<span class="chip">Subtítulos karaoke</span> ' : ''}${r.aiImages ? `<span class="chip">${r.aiImages} imágenes IA</span> <span class="hint">· al subir, marca "contenido generado con IA" si se ven realistas</span>` : ''}</div>` : ''}
    ${j.issues?.length ? `<div class="issues"><b>Revisa estas frases</b> (la verificación las corrigió o no pudo comprobarlas):<ul>${j.issues.map(i => `<li>“${esc(i.claim)}” — ${esc(i.problem)}</li>`).join('')}</ul></div>` : ''}
    ${j.kind === 'reedit' ? vozPropuesta(j) : ''}
    ${j.kind === 'reedit' && r && !['cola', 'produciendo'].includes(j.status) ? `<div class="btns" style="margin:8px 0 0">${j.vozPregunta !== 'pendiente' ? `<button class="b sm" data-act="vzBuscar" data-id="${j.id}">🔎 Buscar voces para clonar</button>` : ''}<button class="b ghost sm" data-act="cloneFromVideo" data-id="${j.id}">🎤 Clonar voz de este video</button></div>` : ''}
    ${j.status === 'elegir' && j.pre ? eligeBox(j) : ''}
    ${r && !r.borrado && !['cola', 'produciendo'].includes(j.status) ? fondoBox(j) : ''}
    ${r?.personajes?.length && !r?.voces?.length && !['cola', 'produciendo'].includes(j.status) ? `<details class="voces" style="margin-top:8px" open><summary><b>🎭 Personajes de este video</b> <span class="hint">(${r.teniaVoces ? 'ya tiene voces: elige otras para cambiarlas' : 'no tienen voz: elige la de cada uno'})</span></summary>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px">${r.personajes.map(p => `<div style="width:170px;background:var(--soft,#f5f5f4);border-radius:12px;padding:8px">
        <img src="${base}${esc(p.img)}" style="width:100%;height:150px;object-fit:cover;border-radius:8px;background:#ddd" onerror="this.style.visibility='hidden'">
        <b style="display:block;margin:6px 0 2px">${esc(p.nombre)}</b><small class="hint" style="display:block;min-height:30px">${esc(p.descripcion)}</small>
        <select data-pj="${j.id}" data-vn="${esc(p.nombre)}" style="width:100%">${presetOptions(p.preset || (String(p.voice).startsWith('clon:') ? p.voice : (p.genero === 'F' ? 'mujer' : 'hombre')), false, true).replace('<option value="" ', '<option value="hombre" ')}</select>
        <button class="b ghost sm" style="margin-top:6px;width:100%" data-act="pjPlay" data-job="${j.id}" data-vn="${esc(p.nombre)}">▶ Escuchar</button></div>`).join('')}</div>
      <div class="btns"><button class="b sm" data-act="pjDub" data-id="${j.id}">🎭 ${r.teniaVoces ? 'Cambiar sus voces por estas' : 'Darles voz con estas voces'}</button><span class="hint" style="align-self:center">La IA escribe sus diálogos (${r.teniaVoces ? 'misma historia, otras palabras' : 'según lo que pasa en el video'}) y los guarda en el reparto del canal.</span></div></details>` : ''}
    ${r?.voces?.length && !['cola', 'produciendo'].includes(j.status) ? `<details class="voces" style="margin-top:8px" ${j.status === 'revisar' ? 'open' : ''}><summary><b>🎙️ Voces de este video</b> <span class="hint">(${r.voces.length} ${r.voces.length === 1 ? 'voz' : 'voces'}: elige la de cada uno y rehaz solo las voces)</span></summary>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px">${r.voces.map((v, k) => `<div style="width:170px;background:var(--soft,#f5f5f4);border-radius:12px;padding:8px">
        <img src="${base}${esc(v.img)}" style="width:100%;height:150px;object-fit:cover;border-radius:8px;background:#ddd" onerror="this.style.visibility='hidden'">
        <b style="display:block;margin:6px 0 4px">${esc(v.nombre)}</b>
        <select data-vz="${j.id}" data-vn="${esc(v.nombre)}" style="width:100%">${presetOptions(v.preset || (String(v.voice).startsWith('clon:') ? v.voice : 'hombre'), false, true).replace('<option value="" ', '<option value="hombre" ')}</select>
        <button class="b ghost sm" style="margin-top:6px;width:100%" data-act="vzPlay" data-job="${j.id}" data-vn="${esc(v.nombre)}">▶ Escuchar</button></div>`).join('')}</div>
      <div class="btns"><button class="b sm" data-act="vzApply" data-id="${j.id}">🎙️ Rehacer con estas voces</button><span class="hint" style="align-self:center">Mismo guion e imágenes; ${j.kind === 'reedit' ? 'el reparto del canal se actualiza' : 'cada personaje se queda con esa voz para los próximos videos'}.</span></div></details>` : ''}
    ${j.review ? `<details class="review" style="margin-top:8px"><summary><span class="chip ${j.review.nota >= 8 ? 'st-aprobado' : j.review.nota >= 6 ? '' : 'st-error'}">🔍 Calidad ${j.review.nota}/10</span> <span class="hint">coherencia ${j.review.coherencia} · gancho ${j.review.gancho} · visual ${j.review.visual} · guion ${j.review.guion}</span></summary>
      <p class="hint">${esc(j.review.resumen)}</p>${j.review.problemas.length ? '<ul>' + j.review.problemas.map(p => `<li><b>${esc(p.momento)}</b> ${esc(p.problema)} → <i>${esc(p.solucion)}</i></li>`).join('') + '</ul>' : ''}
      ${j.review.lecciones.length ? `<p class="hint">📘 Aprendido: ${j.review.lecciones.map(esc).join(' · ')}</p>` : ''}</details>` : ''}
    ${j.pub && Object.keys(j.pub).length ? `<div style="margin-top:8px">${Object.entries(j.pub).map(([p, x]) => x.ok ? `<a class="chip st-aprobado" href="${esc(x.url)}" target="_blank">${RED[p] || p}: ${x.manual ? 'subido a mano' : x.scheduled ? 'programado ' + esc(new Date(x.when).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })) : 'publicado'}${x.privacy === 'private' && !x.scheduled ? ' (privado)' : ''} ↗</a>` : `<span class="chip st-error" title="${esc(x.error)}">${p}: error</span>`).join(' ')}${Object.values(j.pub).some(x => !x.ok) ? ` <button class="b ghost sm" data-act="job" data-a="retryPublish" data-id="${j.id}">Reintentar publicación</button>` : ''}</div>` : ''}
    ${r && !r.borrado ? (() => { const pg = S.publish.facebookPages.find(p => p.id === c.fbPageId), falta = ['youtube', 'facebook', 'tiktok', ...(pg?.ig ? ['instagram'] : []), ...(S.publish.bluesky?.[c.id] ? ['bluesky'] : []), ...(S.publish.mastodon?.[c.id] ? ['mastodon'] : []), ...(S.publish.discord?.[c.id] ? ['discord'] : []), ...(c.autoPublish?.blogger ? ['blogger'] : [])].filter(p => !j.pub?.[p]?.ok); return falta.length ? `<div class="btns" style="margin-top:8px;align-items:center"><b style="font-size:13px">Publicar:</b>${falta.length > 1 ? `<button class="b sm" data-act="pub" data-id="${j.id}" data-p="${falta.join(',')}">🚀 En ${falta.length >= 3 ? 'todas (' + falta.length + ')' : falta.map(p => RED[p]).join(' y ')}</button>` : ''}${falta.map(p => `<button class="b ghost sm" data-act="pub" data-id="${j.id}" data-p="${p}">${{ youtube: '▶️', facebook: '📘', tiktok: '🎵', instagram: '📸', bluesky: '🦋', mastodon: '🐘', discord: '💬', blogger: '📝' }[p]} Solo ${RED[p]}</button>`).join('')}</div>` : ''; })() : ''}
    ${r && j.pub?.facebook?.ok ? `<div class="btns" style="margin-top:4px"><button class="b ghost sm" data-act="kit" data-id="${j.id}">📣 Kit para compartir en grupos (a mano)</button></div>` : ''}
    ${r ? `<div class="seo-score" style="margin:8px 0;padding:8px 10px;border-radius:8px;background:var(--soft,#f4f4f4)">${j.seoScore ? `<span class="chip ${j.seoScore.nota >= 80 ? 'st-aprobado' : j.seoScore.nota >= 60 ? '' : 'st-error'}">🔎 SEO ${j.seoScore.nota}/100</span> <span class="hint">palabra clave: <b>${esc(j.seoScore.clave)}</b>${j.seoScore.reales ? ` · ${j.seoScore.reales} etiquetas que la gente busca` : ''}</span>${j.seoScore.tips.length ? '<ul class="hint" style="margin:4px 0 0 18px">' + j.seoScore.tips.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : ''}${j.seoScore.buscador?.length ? `<details class="hint"><summary>Lo que la gente escribe en YouTube</summary>${j.seoScore.buscador.map(esc).join(' · ')}</details>` : ''}` : '<span class="hint">🔎 SEO sin revisar con búsquedas reales.</span>'}
      <button class="b ghost sm" data-act="job" data-a="seo" data-id="${j.id}" style="margin-left:6px">🔎 Mejorar SEO${j.pub?.youtube?.ok ? ' (y actualizarlo en YouTube)' : ''}</button></div>
    <details class="seo" open><summary>YouTube</summary>${copyBox('Título', y.title)}${(y.alt_titles || []).map((t, i) => copyBox('Título alternativo ' + (i + 1), t)).join('')}${copyBox('Descripción', (y.description || '') + '\n\n' + tagLine(y.hashtags) + cred)}${copyBox('Etiquetas', (y.tags || []).join(', '))}${copyBox('Palabras clave', (y.keywords || []).join(', '))}${copyBox('Comentario fijado', y.pinned_comment)}<div class="times">Hora: ${esc(j.horas?.youtube || c.times?.youtube)} (hora Perú)</div></details>
    <details class="seo"><summary>TikTok</summary>${copyBox('Texto', (tt.caption || '') + '\n\n' + tagLine(tt.hashtags))}<div class="times">Hora: ${esc(j.horas?.tiktok || c.times?.tiktok)} (hora Perú)</div></details>
    <details class="seo"><summary>Facebook</summary>${copyBox('Texto', (fb.caption || '') + '\n\n' + tagLine(fb.hashtags) + cred)}<div class="times">Hora: ${esc(j.horas?.facebook || c.times?.facebook)} (hora Perú)</div></details>
    <div class="btns">${r.borrado ? '' : `<a class="b sm" href="${base}${r.files.youtube}" download="${esc(fname(j, 'youtube'))}" style="text-decoration:none">⬇ Descargar para YouTube</a><a class="b sm" href="${base}${r.files.social}" download="${esc(fname(j, 'tiktok-facebook'))}" style="text-decoration:none">⬇ Descargar para TikTok/Facebook</a>`}${r.files.cover ? `<a class="b ghost sm" href="${base}${r.files.cover}" download style="text-decoration:none">⬇ Portada</a>` : ''}</div>` : ''}
    <div class="btns">
      ${j.status === 'revisar' ? `<button class="b sm" data-act="job" data-a="approve" data-id="${j.id}">✓ Aprobar</button>` : ''}
      ${j.status === 'aprobado' ? `<button class="b sm" data-act="job" data-a="scheduled" data-id="${j.id}">Ya lo programé</button>` : ''}
      ${['aprobado', 'programado'].includes(j.status) ? `<button class="b sm ghost" data-act="job" data-a="published" data-id="${j.id}">Ya se publicó</button>` : ''}
      ${['revisar', 'error', 'aprobado'].includes(j.status) ? `<button class="b ghost sm" data-act="job" data-a="redo" data-id="${j.id}">Rehacer</button><button class="b ghost sm" data-act="job" data-a="redoNew" data-id="${j.id}">Otro tema</button>` : ''}
      ${j.status !== 'produciendo' ? `<button class="b ghost sm" data-act="job" data-a="delete" data-id="${j.id}">Eliminar</button>` : ''}
    </div></div></div></div>`;
}

VIEWS.videos = () => {
  const F = { elegir: '🎭 Elegir voces', revisar: 'Por revisar', aprobado: 'Aprobados', programado: 'Programados', cola: 'En producción', publicado: 'Publicados', error: 'Errores', todos: 'Todos' };
  const list = S.jobs.filter(j => filter === 'todos' || j.status === filter || (filter === 'cola' && j.status === 'produciendo')).slice().reverse();
  return `<h1>Videos</h1><p class="sub">Revisa, aprueba y copia los textos para cada plataforma.</p>
  <div class="quick">${Object.entries(F).map(([k, v]) => `<button class="b sm ${filter === k ? '' : 'ghost'}" data-act="filter" data-f="${k}">${v} (${k === 'todos' ? S.jobs.length : S.jobs.filter(j => j.status === k || (k === 'cola' && j.status === 'produciendo')).length})</button>`).join('')}</div>
  ${list.length ? list.slice(0, 40).map(videoCard).join('') : '<div class="card empty">No hay videos aquí.</div>'}`;
};

VIEWS.calendario = () => {
  const t = today(), days = [];
  for (let i = -2; i < 14; i++) days.push(addDays(t, i));
  return `<h1>Calendario</h1><p class="sub">Qué sale cada día y a qué hora en cada plataforma. Programa en <b>YouTube Studio</b>, <b>TikTok Studio</b> (web) y <b>Meta Business Suite</b>.</p>
  <div class="cal">${days.map(d => {
    const js = S.jobs.filter(j => j.publishDate === d);
    if (!js.length && d < t) return '';
    return `<div class="day ${d === t ? 'today' : ''}"><h3>${esc(fmtDay(d))}${d === t ? ' · hoy' : ''}</h3>${js.length ? js.map(j => {
      const c = S.channels.find(x => x.id === j.channelId) || {};
      return `<div class="item"><div><b>${esc(c.name)}</b> · ${esc(j.title || j.topic || 'tema automático')}<div class="times">YouTube ${esc(j.horas?.youtube || c.times?.youtube)} · TikTok ${esc(j.horas?.tiktok || c.times?.tiktok)} · Facebook ${esc(j.horas?.facebook || c.times?.facebook)}</div></div><div>${status(j.status)}</div></div>`;
    }).join('') : '<div class="hint">Sin videos.</div>'}</div>`;
  }).join('')}</div>`;
};

let chatMsgs = store.get('chat', []), chatBusy = false;
// ---------- 📣 Página viral ----------
let VS = null, VSt = 0;
async function loadViral() {
  VS = await api('/api/viral'); VSt = Date.now();
  if (tab !== 'viral') return;
  const conPanel = !!(VS.on && VS.panel && VS.estado === 'encendida'), top = $('#vf-top');
  // El panel incrustado solo se vuelve a dibujar si aparece o desaparece (así no se recarga mientras lo usas).
  if (!top || conPanel !== !!$('#vf-frame')) render(); else top.innerHTML = viralTop();
}
function viralTop() {
  const v = VS; if (!v) return '<p class="hint">Cargando…</p>';
  const dot = ok => `<span class="chip ${ok ? 'st-aprobado' : ''}">${ok ? '●' : '○'}</span>`;
  const enLinea = v.on && v.estado === 'encendida' && v.tunel === 'conectado' && v.url;
  return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      ${v.on ? `<button class="b ghost sm" data-act="vfOff">Apagar la página</button>` : `<button class="b sm" data-act="vfOn">Encender la página</button>`}
      ${dot(v.estado === 'encendida')} <span class="hint">Página: ${esc(v.estado)}</span>
      ${dot(v.tunel === 'conectado')} <span class="hint">Internet: ${v.descargando ? 'descargando cloudflared…' : esc(v.tunel)}${v.fijo ? ' (dirección fija)' : v.on ? ' (dirección temporal)' : ''}</span></div>
    ${enLinea ? `<p style="margin:10px 0 0"><b>Tu página en internet:</b> <a href="${esc(v.url)}" target="_blank">${esc(v.url)}</a>
      <button class="b ghost sm" data-act="vfCopy" data-u="${esc(v.url)}">Copiar</button> <a class="b ghost sm" href="${esc(v.url)}/panel" target="_blank" style="text-decoration:none">Panel desde el celular</a></p>
      ${v.temporal ? '<p class="hint" style="color:#b45309">⚠ Es una dirección <b>temporal</b>: cambia cada vez que se reinicia ShortForge y entonces los enlaces que compartiste y las notificaciones dejan de servir. Para usarla de verdad, pon una dirección fija (abajo).</p>' : ''}` : v.on ? '<p class="hint" style="margin-top:8px">Conectando… (la primera vez descarga cloudflared, 1 o 2 minutos)</p>' : '<p class="hint" style="margin-top:8px">Enciéndela para que la gente pueda entrar desde internet. Tu PC tiene que estar prendida.</p>'}
    ${v.password ? `<p class="hint" style="margin-top:6px">Contraseña del panel (para entrar desde el celular): <code>${esc(v.password)}</code></p>` : ''}
    <label style="margin-top:8px"><input type="checkbox" id="vf-dest" ${v.destacado ? 'checked' : ''}> 🎬 Poner automáticamente mi último video publicado (YouTube o Facebook) como "video destacado" de la página</label>
    ${v.error ? `<p class="hint" style="color:#b91c1c">${esc(v.error)}</p>` : ''}
    <div style="margin-top:10px;padding:10px;border-radius:10px;background:rgba(250,204,21,.12)"><b>👑 Voces de GLORY BROWN</b> <span class="hint">Cada uno de los 127 personajes habla con su propia voz de tu biblioteca (${v.vocesListas || 0} de ${v.vozGlory?.total || 983} frases grabadas).</span>
      ${v.vozGlory?.activo ? `<p class="hint">🎙️ Grabando… ${v.vozGlory.hechas}/${v.vozGlory.total} (puede tardar unos 15 minutos; puedes seguir usando ShortForge)</p>` : `<button class="b sm" data-act="vfVoces" style="margin-top:6px">🎙️ ${v.vocesListas ? 'Completar o actualizar las voces' : 'Grabar las voces de los personajes'}</button>`}
      ${v.vozGlory?.error ? `<p class="hint" style="color:#b91c1c">${esc(v.vozGlory.error)}</p>` : ''}<p class="hint" style="margin:4px 0 0">Mientras no estén grabadas, el juego usa la voz del celular de cada jugador.</p></div>
    <div style="margin-top:10px;padding:10px;border-radius:10px;background:rgba(168,85,247,.12)"><b>🎨 Ilustraciones de GLORY BROWN</b> <span class="hint">Arte original tipo póster para las 126 cartas (la Reina ya usa tu imagen), hecho con tu cuenta de Cloudflare: ${v.arteListo || 0} de 126 listas.</span>
      ${v.arteGlory?.activo ? `<p class="hint">🎨 Creando… ${v.arteGlory.hechas}/${v.arteGlory.total}. El cupo gratis alcanza unas 70 por día; si se acaba, sigue sola al día siguiente.</p>` : `<button class="b sm" data-act="vfArte" style="margin-top:6px">🎨 ${v.arteListo ? 'Completar las ilustraciones' : 'Crear las ilustraciones de las cartas'}</button>`}
      ${v.arteGlory?.error ? `<p class="hint" style="color:#b91c1c">${esc(v.arteGlory.error)}</p>` : ''}</div>
    <details style="margin-top:8px"><summary class="hint">Registro</summary><pre style="white-space:pre-wrap;font-size:12px;max-height:180px;overflow:auto">${esc((v.log || []).join('\n'))}</pre></details>`;
}
VIEWS.viral = () => {
  if (!VS || Date.now() - VSt > 4000) loadViral().catch(() => {});
  const v = VS || {};
  return `<h1>📣 Página viral</h1><p class="sub">Juegos para compartir (horóscopo, test de amor, ruleta…) que llevan gente a tus videos y juntan suscriptores para tus notificaciones.</p>
  <div class="card" id="vf-top">${viralTop()}</div>
  <details class="card" ${v.fijo ? '' : 'open'}><summary><b>🔗 Dirección fija (tu dominio) — recomendado</b></summary>
    <ol class="steps" style="margin-top:8px">
      <li>Compra un dominio barato (ej. en Cloudflare, Namecheap o Porkbun, ~10 dólares al año) y agrégalo a tu cuenta de <b>Cloudflare</b> (la misma de las imágenes).</li>
      <li>En <a href="https://one.dash.cloudflare.com/" target="_blank">one.dash.cloudflare.com</a> → <b>Redes → Túneles</b> (Networks → Tunnels) → <b>Crear un túnel</b> → tipo <b>Cloudflared</b> → nombre "pagina-viral".</li>
      <li>En "Instalar y ejecutar un conector" copia el comando de Windows: tiene un texto largo que empieza con <code>eyJ</code>. Pégalo aquí (puedes pegar el comando entero).</li>
      <li>En <b>Nombres de host públicos</b>: subdominio (ej. <code>suerte</code>), tu dominio, Tipo <b>HTTP</b>, URL <b>localhost:3300</b>. Guarda.</li>
      <li>Escribe aquí esa dirección (ej. <code>https://suerte.tudominio.com</code>) y guarda.</li>
      <li>Opcional (para ver la ciudad de cada visitante): en Cloudflare → tu dominio → <b>Reglas → Transformaciones administradas</b> → activa <b>"Add visitor location headers"</b>.</li></ol>
    <div class="row"><label>Token del túnel<input id="vf-tok" type="password" placeholder="${v.fijo ? '✓ guardado (pega otro para cambiarlo)' : 'eyJ...'}"></label>
      <label>Dirección de tu página<input id="vf-url" value="${esc(v.urlFija || '')}" placeholder="https://suerte.tudominio.com"></label>
      <label>Tu correo (lo piden las notificaciones)<input id="vf-mail" value="${esc(v.email || '')}" placeholder="tu@correo.com"></label></div>
    <div class="btns"><button class="b sm" data-act="vfSave">Guardar</button>${v.fijo ? '<button class="b ghost sm" data-act="vfTemp">Volver a dirección temporal</button>' : ''}</div></details>
  ${v.on && v.panel && v.estado === 'encendida' ? `<div class="card" style="padding:0;overflow:hidden"><iframe id="vf-frame" src="${esc(v.panel)}" style="width:100%;height:1400px;border:0;display:block" title="Panel de la página viral"></iframe></div>`
    : '<div class="card"><p class="hint">Cuando la página esté encendida, aquí verás el panel: visitantes por país y ciudad, suscriptores, campañas de notificaciones, encuesta del día y más.</p></div>'}
  ${v.on && v.url ? `<details class="card"><summary><b>🔗 Enlaces para compartir</b> <span class="hint">(cada test con su imagen para Facebook y WhatsApp)</span></summary>
    <div class="row" style="margin-top:8px"><label>¿Dónde lo vas a publicar? (para saber qué trae más gente)<input id="vf-src" value="fb" placeholder="fb, whatsapp, tiktok-bio, grupo-x…"></label></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:8px">${[{ id: '', t: 'Portada (todos los tests)', e: '✨' }, ...(v.tests || [])].map(t => `<div class="card" style="margin:0;padding:8px">
      <img src="${esc(v.local)}/og/${t.id || 'general'}.png" alt="" loading="lazy" style="width:100%;border-radius:8px;display:block">
      <div style="font-size:13px;margin:6px 0"><b>${esc(t.e)} ${esc(t.t)}</b></div>
      <div class="btns" style="margin:0"><button class="b sm" data-act="vfLink" data-g="${t.id}">Copiar enlace</button><a class="b ghost sm" target="_blank" href="https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(v.url + '/' + (t.id ? '?g=' + t.id : ''))}" style="text-decoration:none">Revisar en Facebook</a></div></div>`).join('')}</div>
    <p class="hint" style="margin-top:8px">Si Facebook todavía muestra la vista previa vieja, pulsa "Revisar en Facebook" → <b>"Volver a extraer"</b> (Facebook guarda las vistas previas por un tiempo).</p></details>` : ''}
  <div class="card"><h3>Antes de compartirla</h3><ul class="hint" style="margin:0 0 0 18px"><li>Completa la <b>política de privacidad</b> en el panel de abajo → <b>Ajustes</b> (tu nombre y correo).</li>
    <li>Ley 29733 (Perú): inscribe tu banco de datos en la Autoridad Nacional de Protección de Datos Personales (gratis).</li>
    <li>En Facebook pon el enlace en el primer comentario o en una Historia (con enlace en el texto llega a menos gente). Usa <code>?src=</code> para saber qué publicación trae más gente, ej. <code>/?g=ruleta&src=fb-reel-1</code>.</li></ul></div>`;
};

// ---------- Archivos en el asistente ----------
let chatAdj = [];
const ADJ_ICO = { imagen: '🖼️', video: '🎬', texto: '📄' };
function adjHtml(adj) {
  if (!adj?.length) return '';
  return '<div class="adjs">' + adj.map(a => a.tipo === 'imagen' ? `<img src="/api/chat/adjunto?id=${encodeURIComponent(a.id)}" alt="${esc(a.nombre)}" title="${esc(a.nombre)}">`
    : a.tipo === 'video' ? `<span class="adjc">🎬 ${esc(a.nombre)}</span>${(a.frames || []).slice(0, 3).map(f => `<img src="/api/chat/adjunto?id=${encodeURIComponent(f)}" alt="">`).join('')}`
    : `<span class="adjc">📄 ${esc(a.nombre)}</span>`).join('') + '</div>';
}
function adjPend() { return chatAdj.map((a, i) => `<span class="adjc">${a.subiendo ? '⏳' : ADJ_ICO[a.tipo] || '📎'} ${esc(a.nombre)} <button class="adjx" data-act="adjDel" data-i="${i}" title="Quitar">✕</button></span>`).join(''); }
async function subirAdj(files) {
  for (const f of [...files].slice(0, 8)) {
    if (f.size > 60e6) { toast(f.name + ': muy pesado (máx. 60 MB)'); continue; }
    const a = { nombre: f.name || 'captura.png', subiendo: true }; chatAdj.push(a); $('#adjBox') && ($('#adjBox').innerHTML = adjPend());
    try {
      const r = await fetch('/api/chat/adjunto', { method: 'POST', headers: { 'x-sf': '1', 'x-name': encodeURIComponent(a.nombre) }, body: f });
      const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Error ' + r.status);
      Object.assign(a, j, { subiendo: false });
    } catch (e) { chatAdj.splice(chatAdj.indexOf(a), 1); toast(e.message); }
    if ($('#adjBox')) $('#adjBox').innerHTML = adjPend();
  }
}
document.addEventListener('paste', e => { if (tab !== 'chat') return; const fs2 = [...(e.clipboardData?.files || [])]; if (fs2.length) { e.preventDefault(); subirAdj(fs2); } });
document.addEventListener('dragover', e => { if (tab === 'chat' && e.target.closest?.('.chat')) e.preventDefault(); });
document.addEventListener('drop', e => { if (tab !== 'chat' || !e.target.closest?.('.chat')) return; e.preventDefault(); if (e.dataTransfer?.files?.length) subirAdj(e.dataTransfer.files); });

VIEWS.chat = () => {
  const c = S.channels.find(x => x.active) || S.channels[0];
  const quick = [
    c && `Dame 10 ideas de temas virales para mi canal ${c.name}`,
    '¿Cuál de mis nichos tiene más potencial para monetizar en Latinoamérica y por qué?',
    'Te pego datos de un canal de competencia (nombre, vistas, temas de sus videos más vistos). Analízalo y dime qué copiar y qué evitar:',
    'Mejora este gancho para que retenga más:',
    'Escribe respuestas cortas y amables para estos comentarios:',
  ].filter(Boolean);
  return `<h1>Asistente IA</h1><p class="sub">Conoce tus canales. Pídele ideas, nichos, análisis de competencia, ganchos o estrategia.</p>
  <div class="chat"><div class="msgs">${chatMsgs.length ? chatMsgs.map((m, i) => m.role === 'assistant' && !m.content ? '' : `<div class="msg ${m.role}${chatBusy && i === chatMsgs.length - 1 && m.role === 'assistant' ? ' live' : ''}">${m.role === 'assistant' ? md(m.content) || '…' : adjHtml(m.adj) + esc(m.content)}</div>`).join('') : '<div class="empty">Escribe tu pregunta o usa un atajo.</div>'}${chatBusy && (chatMsgs.at(-1)?.role === 'user' || !chatMsgs.at(-1)?.content) ? '<div class="msg assistant" id="thinking">Pensando…</div>' : ''}</div>
  <div class="quick">${quick.map(q => `<button class="b ghost sm" data-act="quick" data-q="${esc(q)}">${esc(q.length > 60 ? q.slice(0, 58) + '…' : q)}</button>`).join('')}<button class="b ghost sm" data-act="clearChat">Borrar chat</button></div>
  <div id="adjBox" class="adjbox">${adjPend()}</div>
  <div class="chatin"><label class="b ghost" title="Adjuntar fotos, capturas, videos o archivos de texto" style="display:flex;align-items:center;cursor:pointer;font-size:20px;padding:0 12px">📎<input type="file" id="chatFile" multiple accept="image/*,video/*,.txt,.csv,.tsv,.md,.json,.srt,.vtt,.log,.html,.xml" hidden></label>
    <textarea id="chatIn" placeholder="Escribe aquí… o pega una captura (Ctrl+V), arrastra archivos o usa 📎. Enter para enviar."></textarea><button class="b" data-act="send" ${chatBusy ? 'disabled' : ''}>Enviar</button></div></div>`;
};

let rec = null;
const READ_TEXT = 'Hola, soy la voz de este canal. Cada día te traigo datos curiosos, consejos útiles y historias que vale la pena conocer. Si te gusta lo que ves, quédate hasta el final, porque siempre hay una sorpresa. ¿Listo? Empecemos. Uno, dos, tres: ¡vamos con todo!';
const presetOptions = (cur, withAuto = true, clones = false) => `<option value="" ${!cur ? 'selected' : ''}>Sin efecto (la voz tal cual)</option>${withAuto ? `<option value="auto" ${cur === 'auto' ? 'selected' : ''}>✨ Automático según el video</option>` : ''}` +
  (clones && (S.myVoices || []).length ? `<optgroup label="🎤 Mis voces clonadas">${S.myVoices.map(v => `<option value="clon:${v.id}" ${cur === 'clon:' + v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</optgroup>` : '') +
  Object.entries((S.voicePresets || []).reduce((a, p) => ((a[p.grupo] = a[p.grupo] || []).push(p), a), {})).map(([g, ps]) => `<optgroup label="${esc(g)}">${ps.map(p => `<option value="${p.id}" ${cur === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</optgroup>`).join('');
const DEMO = { 'Niños y jóvenes': '¡Mamá, mamá! ¿Sabías que el plátano te da energía para jugar todo el día?', Adultos: 'Hoy te voy a enseñar un truco casero que poca gente conoce. Presta atención.', Mayores: 'Ay, mijito... este remedio me lo enseñó mi abuela hace muchísimos años.', Narradores: 'Nadie sabía lo que estaba a punto de pasar... hasta esa noche.', 'Graciosos (dibujos)': '¡Oye, oye! ¿Me vas a comer? ¡No, no, no! ¡Primero escucha lo que tengo que decirte!', Personajes: '¡Nadie me había dicho que este bosque era tan misterioso! Pero aquí estoy.', Acentos: '¿Sabías que este truco casero te ahorra dinero todos los meses? Te lo cuento.' };
VIEWS.voces = () => {
  const by = {};
  S.voices.filter(v => v.engine !== 'clon').forEach(v => (by[v.group] = by[v.group] || []).push(v));
  return `<h1>Voces</h1><p class="sub">Todas con licencia para usar en canales monetizados. Elige la voz de cada canal en Canales → Editar.</p>
  <div class="card"><h2 style="margin-top:0">🎭 Tipos de voz</h2><p class="hint">Voces nuevas creadas a partir de las voces con licencia: niños, jóvenes, adultos, abuelos, narradores y voces graciosas de dibujos. No imitan a nadie: son originales de tu canal. Úsalas en Canales → Editar (narrador y cada personaje), o elige "Automático según el video" y la IA escoge la voz según el tono (comedia, misterio, consejos...).</p>
  ${Object.entries((S.voicePresets || []).reduce((a, p) => ((a[p.grupo] = a[p.grupo] || []).push(p), a), {})).map(([g, ps]) => `<h3>${esc(g)}</h3><div class="quick">${ps.map(p => `<button class="b ghost sm" data-act="playPreset" data-p="${p.id}" data-t="${esc(DEMO[g] || '')}">▶ ${esc(p.nombre)}</button>`).join('')}</div>`).join('')}</div>
  <div class="card"><h3>🎤 Mis voces (clonadas con permiso)</h3>
  <p class="hint">Clona <b>tu voz</b> o la de alguien que te dé <b>permiso por escrito</b>. Así tienes voces únicas que nadie más usa. Clonar voces de famosos, actores de doblaje, creadores o personajes sin permiso no está permitido: daña a esas personas y te pueden tumbar el canal.</p>
  ${S.myVoices.length ? S.myVoices.map(v => `<div class="item"><div><b>${esc(v.name)}</b> <span class="hint">· voz de ${esc(v.owner)} · ${v.seconds || '?'} s de muestra · permiso confirmado el ${esc((v.consentAt || '').slice(0, 10))}${v.origen?.video ? ' · sacada del video «' + esc(v.origen.video) + '»' : ''}</span></div><div class="btns" style="margin:0">${S.tools?.chatterbox ? `<button class="b ghost sm" data-act="playVoice" data-v="clon:${v.id}" data-slow="1">▶ Probar</button>` : ''}<audio controls src="/files/voces/${v.id}.wav" style="height:32px"></audio><button class="b ghost sm" data-act="renVoice" data-id="${v.id}" data-n="${esc(v.name)}">Renombrar</button><button class="b ghost sm" data-act="delVoice" data-id="${v.id}">Eliminar</button></div></div>`).join('') : '<p class="hint">Todavía no tienes voces propias.</p>'}
  ${S.tools?.chatterbox ? '' : '<p class="hint" style="color:var(--warn)">Para usar las voces clonadas en los videos instala Chatterbox con <b>instalar_ia_local.bat</b>. Mientras tanto puedes ir grabándolas.</p>'}
  <h2>Agregar una voz</h2>
  <div class="row"><label>Nombre de la voz<input id="v-name" placeholder="Ej: Josefino narrador"></label><label>¿De quién es la voz?<input id="v-owner" placeholder="Ej: José (yo)"></label><label>Género<select id="v-gender"><option value="M">Hombre</option><option value="F">Mujer</option></select></label></div>
  <p class="hint">Graba entre <b>15 y 30 segundos</b> en un lugar silencioso, leyendo este texto con la energía que quieres en los videos:</p>
  <div class="copy" style="padding-right:10px">${READ_TEXT}</div>
  <div class="btns"><button class="b" id="v-rec" data-act="recStart">● Grabar</button><button class="b red" id="v-stop" data-act="recStop" hidden>■ Detener</button><span id="v-state" class="hint" style="align-self:center"></span></div>
  <audio id="v-play" controls hidden style="margin-top:8px"></audio>
  <label>…o sube un audio <small>(wav, mp3 o m4a, una sola persona hablando, sin música)</small><input type="file" id="v-file" accept="audio/*"></label>
  <label style="font-weight:600"><input type="checkbox" id="v-consent">Confirmo que esta es mi voz, o que la persona me dio permiso por escrito para clonarla y usarla en mis canales.</label>
  <div class="btns"><button class="b big" data-act="saveVoice">Guardar voz</button></div></div>
  ${Object.entries(by).map(([g, vs]) => `<div class="card"><h3>${esc(g)}</h3><div class="quick">${vs.map(v => `<button class="b ghost sm" data-act="playVoice" data-v="${v.id}">▶ ${esc(v.name)} (${v.gender === 'F' ? 'mujer' : 'hombre'})</button>`).join('')}</div>${g.startsWith('Kokoro') && !S.tools?.kokoro ? '<p class="hint">Necesita instalar_ia_local.bat</p>' : ''}</div>`).join('')}`;
};

VIEWS.reeditar = () => {
  const chs = [...S.channels].sort((a, b) => b.active - a.active);
  if (!chs.length) return `<h1>Reeditar mis videos</h1><div class="card empty">Primero crea un canal.</div>`;
  const sel = store.get('reCh') || chs[0].id, c = S.channels.find(x => x.id === sel) || chs[0];
  const jobs = S.jobs.filter(j => j.kind === 'reedit').slice(-12).reverse();
  return `<h1>Reeditar mis videos</h1><p class="sub">Sube videos tuyos (hechos con cualquier IA o grabados por ti). El sistema los deja listos para cada plataforma con calidad pro, y se reparten 1 por día en el calendario.</p>
  ${(() => { const el = S.jobs.filter(j => j.status === 'elegir' && j.pre && j.kind === 'reedit'); return el.length ? `<div class="card"><h3>🎭 Videos esperando que elijas las voces (${el.length})</h3>${el.map(j => `<p style="margin:10px 0 0"><b>${esc(nice(j.title || 'Video'))}</b></p>` + eligeBox(j)).join('')}</div>` : ''; })()}
  ${(() => { const pend = S.jobs.filter(j => j.kind === 'reedit' && j.vozPregunta === 'pendiente'); return pend.length ? `<div class="card"><h3>🎤 Voces encontradas en tus videos (${pend.length})</h3><p class="hint">Tú decides cuáles clonar. Las que se parecen a una que ya tienes vienen desmarcadas.</p>${pend.map(vozPropuesta).join('')}</div>` : ''; })()}
  <div class="card"><div class="row"><label>Canal<select id="re-ch" data-act-change="reCh">${chs.map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
  <label>Qué hacer con el audio<select id="re-mode"><option value="mejorar" ${(c.reeditMode || 'mejorar') === 'mejorar' ? 'selected' : ''}>Conservar mi audio y mejorar el video</option><option value="doblaje" ${c.reeditMode === 'doblaje' ? 'selected' : ''}>🎭 Dar voz a los personajes (doblaje; si ya tiene voces, las cambia)</option><option value="nueva_voz" ${c.reeditMode === 'nueva_voz' ? 'selected' : ''}>Guion nuevo con voz nueva (sobre mis imágenes)</option></select></label></div>
  <div id="drop" class="drop">Arrastra aquí tus videos (puedes soltar varios a la vez)<br><small>o</small><br><input type="file" id="re-files" accept="video/*" multiple></div>
  <div id="re-prog" class="hint"></div>
  <ul class="check" style="list-style:none;padding:0;margin-top:14px;font-size:14px">
   <li>✓ Vertical 9:16 (si es horizontal, fondo difuminado)</li><li>✓ Subtítulos karaoke, gancho grande y CTAs en el momento justo</li>
   <li>✓ Director de efectos: punch zoom, sacudida, destellos, glitch y sonidos sincronizados a las palabras</li>
   <li>✓ Logo, barra de progreso, cierre con Suscríbete/Síguenos, portada y SEO</li><li>✓ Videos de más de 75 s: la IA elige los mejores tramos y los corta en Shorts</li></ul>
  <details class="seo"><summary>📁 Sin subir nada: carpeta de entrada</summary><p class="hint">Copia tus videos a <code>${esc(S.inbox)}\\${esc(c.name)}</code> y el sistema los toma solo cada 30 segundos (puedes copiar 30 videos de una vez).</p></details></div>
  <h2>Últimos videos reeditados</h2>${jobs.length ? jobs.map(j => `<div class="item"><div><b>${esc(chName(j.channelId))}</b> · ${esc(nice(j.title || j.topic || 'video'))}${j.segment ? ` <span class="hint">(${Math.round(j.segment.inicio)}–${Math.round(j.segment.fin)} s)</span>` : ''}<div class="times">publicar el ${esc(j.publishDate)}</div></div><div>${status(j.status)}</div></div>`).join('') : '<p class="hint">Todavía no hay videos reeditados.</p>'}`;
};

const KEYINFO = [
  ['GEMINI_API_KEY', 'Google Gemini', 'IA principal (gratis, recomendado)', 'https://aistudio.google.com/apikey'],
  ['PEXELS_API_KEY', 'Pexels', 'Fotos de fondo (gratis, recomendado)', 'https://www.pexels.com/api/'],
  ['PIXABAY_API_KEY', 'Pixabay', 'Más fotos (gratis, opcional)', 'https://pixabay.com/api/docs/'],
  ['GROQ_API_KEY', 'Groq', 'IA de respaldo (gratis)', 'https://console.groq.com/keys'],
  ['NVIDIA_API_KEY', 'NVIDIA', 'IA de respaldo (gratis)', 'https://build.nvidia.com/'],
  ['ANTHROPIC_API_KEY', 'Claude', 'IA de pago (opcional, la mejor en español)', 'https://console.anthropic.com/'],
  ['CF_ACCOUNT_ID', 'Cloudflare: Account ID', 'Imágenes con IA (gratis, 1 cuenta). Está en dash.cloudflare.com → Workers AI', 'https://dash.cloudflare.com/'],
  ['CF_API_TOKEN', 'Cloudflare: API Token', 'Crea un token con permiso "Workers AI"', 'https://dash.cloudflare.com/profile/api-tokens'],
  ['YOUTUBE_API_KEY', 'YouTube Data API', 'El Cerebro: analiza a la competencia de tu nicho', 'https://console.cloud.google.com/'],
  ['CEREBRAS_API_KEY', 'Cerebras (reserva)', 'Textos muy rápidos, gratis. cloud.cerebras.ai → API Keys', 'https://cloud.cerebras.ai/'],
  ['GITHUB_TOKEN', 'GitHub Models (reserva)', 'Gratis con tu cuenta de GitHub; puede mirar imágenes. Crea un token "fine-grained" con el permiso Models: read', 'https://github.com/settings/personal-access-tokens/new'],
  ['MISTRAL_API_KEY', 'Mistral (reserva)', 'Plan gratis "Experiment"; buen español y mira imágenes. console.mistral.ai → API Keys', 'https://console.mistral.ai/api-keys'],
  ['OPENROUTER_API_KEY', 'OpenRouter (reserva)', 'Usa solo modelos gratis (:free). openrouter.ai → Keys', 'https://openrouter.ai/settings/keys'],
  ['TELEGRAM_BOT_TOKEN', 'Telegram: token del bot', 'Avisos al celular gratis. En Telegram habla con @BotFather → /newbot → copia el token', 'https://t.me/BotFather'],
  ['FREESOUND_API_KEY', 'Freesound', 'Biblioteca gratis de efectos y música CC0', 'https://freesound.org/apiv2/apply'],
  ['GOOGLE_CLIENT_ID', 'Google OAuth: Client ID', 'Para publicar en YouTube (ver guía abajo)', 'https://console.cloud.google.com/apis/credentials'],
  ['GOOGLE_CLIENT_SECRET', 'Google OAuth: Client Secret', 'Para publicar en YouTube', 'https://console.cloud.google.com/apis/credentials'],
  ['FB_APP_ID', 'Facebook: App ID', 'Para publicar en tus páginas (ver guía abajo)', 'https://developers.facebook.com/apps/'],
  ['FB_APP_SECRET', 'Facebook: App Secret', 'Para publicar en tus páginas', 'https://developers.facebook.com/apps/'],
  ['FB_CONFIG_ID', 'Facebook: Identificador de configuración', 'Solo si Facebook lo pide (Inicio de sesión para empresas → Configuraciones)', 'https://developers.facebook.com/apps/'],
];
VIEWS.ajustes = () => {
  const s = S.settings, eng = s.engines;
  const usage = S.usage[today()] || {};
  return `<h1>Ajustes</h1><p class="sub">Todo gratis. Las claves se guardan solo en tu PC (archivo .env).</p>
  <div class="card"><h3>Claves</h3><p class="hint">Para empezar solo necesitas <b>Gemini</b> y <b>Pexels</b>. Deja vacío lo que no quieras cambiar.</p>
  ${KEYINFO.map(([k, n, d, url]) => `<label>${n} <small>— ${d} · <a href="${url}" target="_blank" rel="noopener">sacar clave</a></small><input type="password" autocomplete="off" data-key="${k}" placeholder="${S.keys[k] ? '✓ guardada (pega otra para cambiarla)' : 'pega tu clave aquí'}"></label>`).join('')}
  <div class="btns"><button class="b" data-act="saveKeys">Guardar claves</button></div></div>

  <div class="card"><h3>Motores de IA</h3><p class="hint">Se usan en este orden y van rotando solos: si uno falla o se agota su cupo gratis del día, pasa al siguiente. Para mirar imágenes se usa Gemini primero y luego los que pueden ver (pulsa Probar para saberlo). Cloudflare AI usa la misma clave que tus imágenes. El modelo se elige solo (el más nuevo); puedes fijarlo a mano.</p>
  ${eng.map((p, i) => { const P = S.providers[p]; return `<div class="item" style="align-items:center"><div><b>${i + 1}. ${esc(P.label)}</b> ${S.keys[P.key] ? '<span class="chip st-aprobado">con clave</span>' : '<span class="chip">sin clave</span>'} <span class="hint">· usado hoy: ${usage[p] || 0}</span>
    <div class="hint" id="test-${p}"></div><div class="row" style="margin-top:6px"><select data-model="${p}"><option value="">Automático${s.models[p] ? '' : ' (recomendado)'}</option>${s.models[p] ? `<option selected>${esc(s.models[p])}</option>` : ''}</select></div></div>
    <div class="btns" style="margin:0"><button class="b ghost sm" data-act="mv" data-i="${i}" data-d="-1">↑</button><button class="b ghost sm" data-act="mv" data-i="${i}" data-d="1">↓</button><button class="b ghost sm" data-act="testEng" data-p="${p}">Probar</button><button class="b ghost sm" data-act="loadModels" data-p="${p}">Ver modelos</button></div></div>`; }).join('')}
  <div class="btns"><button class="b" data-act="saveModels">Guardar modelos</button></div></div>

  <div class="card"><h3>Producción</h3>
  <label><input type="checkbox" id="set-agenda" ${s.agenda !== false ? 'checked' : ''}><b>📅 Producir según los horarios</b>: el sistema siempre deja listos los videos de hoy y mañana para cada hora de publicación de tus canales (YouTube, Facebook y TikTok).</label>
  <label><input type="checkbox" id="set-autovol" ${s.autoVolume !== false ? 'checked' : ''}>Calcular solo los videos por día (suma de las "publicaciones por día" de tus canales activos: ${S.channels.filter(c => c.active).reduce((t, c) => t + Math.max(1, Math.min(3, +c.perDay || 1)), 0)})</label>
  <div class="row"><label>Videos por día <small>(si no se calcula solo)</small><input type="number" id="set-vpd" min="0" max="30" value="${s.videosPerDay}"></label>
  <label>Hora de la producción nocturna<input type="time" id="set-time" value="${esc(s.nightly.time)}"></label></div>
  <label><input type="checkbox" id="set-night" ${s.nightly.enabled ? 'checked' : ''}>Producir automáticamente cada noche</label>
  <label><input type="checkbox" id="set-fc" ${s.factCheck ? 'checked' : ''}>Verificar datos antes de armar cada video (recomendado)</label>
  <label><input type="checkbox" id="set-kar" ${s.karaoke ? 'checked' : ''}>Subtítulos karaoke (palabra resaltada; necesita Whisper instalado)</label>
  <label>Precisión de Whisper<select id="set-wm">${[['tiny', 'Rápida (menos precisa)'], ['base', 'Normal (recomendada para tu PC)'], ['small', 'Alta (más lenta)']].map(([k, l]) => `<option value="${k}" ${s.whisperModel === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <label><input type="checkbox" id="set-cont" ${s.continuous ? 'checked' : ''}>Producir todo el día (mantiene la cola llena para los próximos días)</label>
  <div class="row"><label>Días por adelantado<input type="number" id="set-buf" min="0" max="7" value="${s.bufferDays ?? 1}"></label><label>Máx. subidas a YouTube por día <small>(cuota gratis ≈ 6)</small><input type="number" id="set-ytmax" min="1" max="50" value="${s.ytDailyMax || 6}"></label></div>
  <div class="row"><label><input type="checkbox" id="set-reserve" ${s.reserveGemini !== false ? 'checked' : ''}>💎 Cuidar la cuota de Gemini: guiones y textos con Groq/NVIDIA primero; Gemini se guarda para mirar imágenes y videos (recomendado)</label></div>
  <div class="row"><label><input type="checkbox" id="set-natural" ${s.naturalVoice !== false ? 'checked' : ''}>🎙️ Voz natural: ecualización cálida, compresión y ambiente suave en todas las voces (menos sonido a robot)</label></div>
  <div class="row"><label><input type="checkbox" id="set-cloneslow" ${s.cloneSlow ? 'checked' : ''}>🎤 Usar voces clonadas aunque mi PC sea lenta ${s.cloneSpeed ? `<span class="hint">(tu PC tarda ~${s.cloneSpeed} s por frase${s.cloneSpeed > 45 ? ': ahora se usan voces normales parecidas para que los videos salgan en minutos' : ''})</span>` : ''}</label></div>
  <div class="row"><label><input type="checkbox" id="set-seopro" ${s.seoPro !== false ? 'checked' : ''}>🔎 SEO con búsquedas reales: título, etiquetas y hashtags según lo que la gente escribe en YouTube y lo que usan los Shorts más vistos (recomendado)</label></div>
  <div class="row"><button class="b ghost sm" data-act="seoTodos">🔎 Mejorar el SEO de todos mis videos</button><span class="hint" style="align-self:center">${S.seoMasivo?.on ? `Trabajando: ${S.seoMasivo.hechos}/${S.seoMasivo.total}…` : S.seoMasivo?.fin ? `Listo: ${S.seoMasivo.hechos} videos (${S.seoMasivo.errores} con error)` : 'Los que ya están en YouTube se actualizan allí (título, descripción y etiquetas).'}</span></div>
  <div class="row"><label><input type="checkbox" id="set-waitimg" ${s.waitAiImages !== false ? 'checked' : ''}>🖼️ Si se acaba el cupo de imágenes con IA, esperar al día siguiente en vez de usar fotos de stock que no coinciden con el guion (recomendado)</label></div>
  <div class="row"><label><input type="checkbox" id="set-critic" ${s.critic !== false ? 'checked' : ''}>✍️ Crítico: mejora el guion si saca menos de 8/10</label>
  <label><input type="checkbox" id="set-cimg" ${s.checkImages !== false ? 'checked' : ''}>🎯 Coherencia: director visual + revisar cada imagen y rehacer las que no coinciden (gasta algo más de cupo de imágenes)</label></div>
  <div class="row"><label><input type="checkbox" id="set-rev" ${s.review !== false ? 'checked' : ''}>🔍 Analista: revisar cada video terminado, ponerle nota y aprender (necesita Gemini)</label>
  <label>Nota mínima para aprobar solo<input type="number" id="set-minnota" min="1" max="10" value="${s.minNota || 6}"></label></div>
  <p class="hint">Plan para subir poco a poco: semanas 1–2: <b>3</b> · semanas 3–4: <b>5–7</b> · desde la semana 5: <b>10</b> (1 por canal).</p>
  <div class="btns"><button class="b" data-act="saveSettings">Guardar</button></div></div>

  <div class="card"><h3>💾 Tus datos</h3>
  <p class="hint">Tus claves, canales, logos, personajes, voces y videos se guardan en <code>${esc(S.userdata)}</code>, fuera de la carpeta del programa. Al actualizar ShortForge <b>no se pierden</b>.</p>
  <div class="btns"><button class="b" data-act="backup">Hacer respaldo ahora</button></div>
  <p class="hint">Además se hace un respaldo automático cada día (se guardan los últimos 7).</p></div>
  <div class="card"><h3>🔄 Actualizaciones</h3>
  <p>Tienes la versión <b>${esc(S.act?.version || '?')}</b>.${S.act?.nueva ? ` <b style="color:var(--brand)">¡Hay una mejora nueva: v${esc(S.act.nueva)}!</b>` : S.act?.ultima ? ' Estás al día ✓' : ''}</p>
  ${S.act?.nueva && S.act.notas ? `<pre class="hint" style="white-space:pre-wrap;background:var(--soft,#f5f5f4);padding:10px;border-radius:8px">${esc(S.act.notas)}</pre>` : ''}
  ${S.act?.error ? `<p class="hint">${esc(S.act.error)}</p>` : ''}
  <div class="btns">${S.act?.nueva ? '<button class="b" data-act="actInstalar">⬇ Instalar la mejora</button>' : ''}<button class="b ghost" data-act="actBuscar">Buscar actualizaciones</button></div>
  <p class="hint">Se descarga de tu GitHub y reemplaza solo el programa: tus claves, canales, voces y videos no se tocan. Al terminar, ShortForge se reinicia solo (unos segundos).</p></div>
  <div class="card"><h3>🩺 Mantenimiento</h3>
  <p class="hint">El sistema revisa los motores de IA al iniciar y cada mañana, limpia temporales y te avisa si falta espacio o si una clave está por vencer.</p>
  <label><input type="checkbox" id="set-clean" ${s.autoClean !== false ? 'checked' : ''}>Borrar los videos ya publicados hace más de 30 días (libera espacio; el registro del video se conserva)</label>
  <div class="btns"><button class="b" data-act="reporte">📋 Generar reporte (sin claves)</button><button class="b ghost" data-act="revMotores">Revisar motores ahora</button><button class="b ghost" data-act="limpiar">Limpiar ahora</button></div>
  <p class="hint" id="mant-out"></p></div>
  <div class="card"><h3>📱 Avisos al celular (Telegram, gratis)</h3>
  <p class="hint">1) En Telegram busca <b>@BotFather</b> → escribe <b>/newbot</b> → ponle un nombre → copia el token y pégalo arriba en <b>Telegram: token del bot</b> → Guardar claves. 2) Abre tu bot nuevo y escríbele <b>/start</b>. 3) Pulsa <b>Detectar mi chat</b>.</p>
  <p class="hint">Te avisa: videos listos, errores, comentarios delicados, videos que despegan y un resumen cada mañana.</p>
  <div class="btns"><button class="b" data-act="tgDetect" ${S.keys.TELEGRAM_BOT_TOKEN ? '' : 'disabled'}>Detectar mi chat</button><button class="b ghost" data-act="tgTest" ${S.keys.TELEGRAM_BOT_TOKEN ? '' : 'disabled'}>Enviar prueba</button></div></div>

  <div class="card"><h3>🔊 Biblioteca de sonidos y música (gratis, CC0)</h3>
  <p class="hint">Descarga de Freesound efectos (whoosh, impactos, suspenso, monedas, risas, ambientes...) y música de fondo por ánimo, todo con licencia Creative Commons 0: uso libre y comercial. Tienes <b>${S.efectos}</b> archivos.</p>
  ${S.freesound.running ? `<p><b>Descargando… ${S.freesound.done} de ${S.freesound.total} categorías</b></p>` : `<div class="btns"><button class="b" data-act="sounds" ${S.keys.FREESOUND_API_KEY ? '' : 'disabled title="Pon tu clave de Freesound arriba"'}>Descargar biblioteca</button></div>`}
  ${S.freesound.error ? `<p class="hint" style="color:var(--bad)">${esc(S.freesound.error)}</p>` : ''}</div>

  <div class="card"><h3>📤 Publicación automática</h3>
  <p class="hint">Se usa la API oficial de cada plataforma. Luego, en cada canal (Canales → Editar) conectas su YouTube, eliges su página de Facebook y activas la publicación.</p>
  <details class="seo"><summary>Guía: YouTube (15 minutos, una sola vez)</summary><ol class="steps">
    <li>Entra a <a href="https://console.cloud.google.com/" target="_blank">console.cloud.google.com</a>, crea un proyecto (ej. "ShortForge") y habilita <b>YouTube Data API v3</b>.</li>
    <li>"Pantalla de consentimiento de OAuth": tipo <b>Externo</b>, pon tu correo, agrega el permiso <code>youtube.upload</code> y en "Usuarios de prueba" agrega los correos de tus canales.</li>
    <li>Pulsa <b>"Publicar app" → En producción</b> (si la dejas en "Prueba", el permiso caduca a los 7 días). Google mostrará un aviso de "app no verificada": es normal porque es tu propia app.</li>
    <li>"Credenciales" → Crear credenciales → <b>ID de cliente de OAuth</b> → tipo <b>Aplicación web</b> → URI de redireccionamiento: <code>http://localhost:3200/oauth/google</code>.</li>
    <li>Copia el Client ID y el Client Secret arriba y guarda.</li>
    <li><b>Importante:</b> hasta que Google apruebe tu proyecto (formulario gratis "YouTube API Services - Audit", tarda semanas), los videos subidos por API quedan <b>privados</b>. Mientras tanto puedes cambiarlos a público en YouTube Studio con un clic.</li></ol></details>
  <details class="seo"><summary>Guía: Facebook (10 minutos, una sola vez)</summary><ol class="steps">
    <li>Entra a <a href="https://developers.facebook.com/apps/" target="_blank">developers.facebook.com/apps</a> → Crear app → caso de uso <b>"Administrar todo en tu página"</b>.</li>
    <li>En "Inicio de sesión con Facebook" → Configuración → URI de redireccionamiento válido: <code>http://localhost:3200/oauth/facebook</code>.</li>
    <li>Configuración básica: copia el <b>App ID</b> y la <b>Clave secreta</b> arriba y guarda.</li>
    <li>Pulsa el botón de abajo y acepta los permisos para tus páginas. Como eres el administrador, funciona sin revisión de Meta.</li></ol></details>
  <div class="btns"><a class="b" href="/oauth/facebook/start" style="text-decoration:none">${S.publish.facebookPages.length ? 'Reconectar' : 'Conectar'} Facebook</a>${S.publish.facebookPages.length ? `<span class="hint" style="align-self:center">✓ ${S.publish.facebookPages.length} página(s): ${S.publish.facebookPages.map(p => esc(p.name)).join(', ')}</span>` : ''}</div>
  <p class="hint">TikTok: su API exige aprobación de la app; mientras tanto, los textos quedan listos para pegar. YouTube hoy: <b>${S.publish.ytToday}</b> subidas.</p></div>

  <div class="card"><h3>Herramientas en tu PC</h3><ul class="check" style="list-style:none;padding:0">
    <li class="${S.tools?.ffmpeg ? 'ok' : 'no'}">${S.tools?.ffmpeg ? '✓' : '✗'} ffmpeg ${S.tools?.ffmpeg ? '' : '— en PowerShell: <code>winget install Gyan.FFmpeg</code>'}</li>
    <li class="${S.tools?.edge ? 'ok' : 'no'}">${S.tools?.edge ? '✓' : '✗'} Voces de Edge ${S.tools?.edge ? '' : '— instala Python (<code>winget install Python.Python.3.12</code>) y luego <code>python -m pip install edge-tts</code>. Reinicia start.bat.'}</li>
    <li class="${S.tools?.kokoro ? 'ok' : 'no'}">${S.tools?.kokoro ? '✓' : '✗'} Kokoro (voz sin internet, respaldo)</li>
    <li class="${S.tools?.whisper ? 'ok' : 'no'}">${S.tools?.whisper ? '✓' : '✗'} Whisper (subtítulos karaoke)</li>
    <li class="${S.tools?.chatterbox ? 'ok' : 'no'}">${S.tools?.chatterbox ? '✓' : '✗'} Chatterbox (clonar tu voz)</li></ul>
    ${S.tools?.kokoro && S.tools?.whisper && S.tools?.chatterbox ? '' : '<p class="hint">Para instalar lo que falta: cierra ShortForge y haz doble clic en <b>instalar_ia_local.bat</b> (descarga unos 3 GB, una sola vez).</p>'}
    <p class="hint">Imágenes IA (Cloudflare): ${S.cf.ready ? `hoy usadas <b>${S.cf.usadasHoy}</b>, quedan aprox. <b>${S.cf.quedanAprox}</b>` : 'faltan las claves'}. · Efectos de sonido: <b>${S.efectos}</b> archivos en la carpeta <b>efectos</b>.</p>
    <p class="hint">Música: pon archivos .mp3 con licencia (por ejemplo de la Biblioteca de audio de YouTube) en la carpeta <b>musica</b>.</p></div>`;
};

// ---------- Editor de canal ----------
let edit = null;
function voiceOptions(sel) {
  const by = {};
  S.voices.forEach(v => (by[v.group] = by[v.group] || []).push(v));
  return Object.entries(by).map(([c, vs]) => `<optgroup label="${esc(c)}">${vs.map(v => `<option value="${v.id}" ${v.id === sel ? 'selected' : ''}>${esc(v.name)} (${v.gender === 'F' ? 'Mujer' : 'Hombre'})</option>`).join('')}</optgroup>`).join('');
}
function openChannel(id) {
  const c = S.channels.find(x => x.id === id);
  edit = c ? JSON.parse(JSON.stringify(c)) : { name: '', niche: '', style: 'fotos', voice: 'es-MX-JorgeNeural', rate: 0, pitch: 0, color: '#14532d', tone: '', notes: '', active: true, priority: 0, times: { youtube: '18:00', tiktok: '20:00', facebook: '13:00' }, handles: {}, characters: [] };
  drawChannel();
  $('#modal').hidden = false;
  if (!c) setTimeout(() => $('#e-name')?.focus(), 50);
}
function drawChannel() {
  const e = edit, isNew = !e.id;
  $('#modalBox').innerHTML = `<h1>${isNew ? 'Nuevo canal' : esc(e.name)}</h1>
  <label>¿Cómo se llama tu canal?<input id="e-name" value="${esc(e.name)}" placeholder="Ej: Plata Clara"></label>
  <label>Sube tu logo <small>(PNG con fondo transparente, cuadrado; aparece en todos los videos)</small></label>
  <div class="ch">${e.id ? logoHtml(e) : ''}<input type="file" id="e-logo" accept="image/*"></div>
  <label>Nicho<input id="e-niche" value="${esc(e.niche)}" placeholder="Ej: Finanzas personales y ahorro"></label>
  <div class="row"><label>Estilo de video<select id="e-style"><option value="fotos" ${e.style !== 'personaje' ? 'selected' : ''}>Fotos + narración</option><option value="personaje" ${e.style === 'personaje' ? 'selected' : ''}>Personajes que hablan (frutas, etc.)</option></select></label>
  <label>Imágenes<select id="e-images">${[['mixto', 'Mixto: IA en las 3 primeras escenas (recomendado)'], ['ia', 'Todo con IA (gasta más cupo)'], ['stock', 'Solo fotos de Pexels/Pixabay']].map(([k, l]) => `<option value="${k}" ${(e.images || 'mixto') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <label>Color del canal<input type="color" id="e-color" value="${esc(e.color || '#14532d')}"></label></div>
  <label>Tono <small>(cómo habla el canal)</small><input id="e-tone" value="${esc(e.tone)}" placeholder="Ej: cercano, divertido y confiable"></label>
  <label>Notas para la IA <small>(opcional: temas a evitar, público, estilo)</small><textarea id="e-notes" style="min-height:60px">${esc(e.notes)}</textarea></label>
  <h2>Voz</h2>
  <div class="row"><label>Tipo de voz del narrador<select id="e-vpreset">${presetOptions(e.voicePreset || '')}</select></label></div>
  <div class="row"><label>Voz principal<select id="e-voice">${voiceOptions(e.voice)}</select></label>
  <label>Velocidad <small id="e-rate-v">${e.rate || 0}%</small><input type="range" id="e-rate" min="-30" max="30" value="${e.rate || 0}"></label>
  <label>Tono de voz <small id="e-pitch-v">${e.pitch || 0} Hz</small><input type="range" id="e-pitch" min="-20" max="20" value="${e.pitch || 0}"></label></div>
  <div class="btns"><button class="b ghost sm" data-act="listen">▶ Escuchar</button><audio id="e-audio" controls hidden></audio></div>
  <h2>Horarios de publicación <small class="hint">(iniciales; ajústalos con tus estadísticas)</small></h2>
  <div class="row"><label>Publicaciones por día en este canal<select id="e-perday" onchange="document.querySelectorAll('[data-slot]').forEach(r => r.hidden = +r.dataset.slot >= +this.value)">${[1, 2, 3].map(n => `<option value="${n}" ${(+e.perDay || 1) === n ? 'selected' : ''}>${n} ${n === 1 ? 'video' : 'videos'} al día</option>`).join('')}</select></label></div>
  ${[0, 1, 2].map(k => `<div class="row" data-slot="${k}" ${k >= (+e.perDay || 1) ? 'hidden' : ''}>${['youtube', 'tiktok', 'facebook'].map(p => { const key = k ? p + (k + 1) : p; return `<label>${k ? `${k + 1}.ª publicación · ` : (+e.perDay || 1) > 1 ? '1.ª publicación · ' : ''}${p === 'youtube' ? 'YouTube' : p === 'tiktok' ? 'TikTok' : 'Facebook'}<input type="time" data-time="${key}" value="${esc(e.times?.[key] || (k ? ['', '13:00', '19:00'][k] : ''))}"></label>`; }).join('')}</div>`).join('')}
  <p class="hint">Si eliges 2 o 3 videos al día, sube también "Videos por día" en Ajustes → Producción (es el total entre todos tus canales).</p>
  <div class="row">${['youtube', 'tiktok', 'facebook'].map(p => `<label>@ en ${p === 'youtube' ? 'YouTube' : p === 'tiktok' ? 'TikTok' : 'Facebook'}<input data-handle="${p}" value="${esc(e.handles?.[p] || '')}" placeholder="@usuario"></label>`).join('')}</div>
  <div class="row"><label>Prioridad <small>(sube la del canal que más crece)</small><select id="e-prio">${[0, 1, 2].map(n => `<option value="${n}" ${+e.priority === n ? 'selected' : ''}>${['Normal', 'Alta', 'Máxima'][n]}</option>`).join('')}</select></label>
  <label style="margin-top:38px"><input type="checkbox" id="e-active" ${e.active ? 'checked' : ''}>Canal activo (entra en la producción diaria)</label></div>
  <h2>Edición y efectos</h2>
  <div class="row"><label>Duración de los videos nuevos<select id="e-len">${[['viral', 'Viral: 25-45 s (más vistas y repeticiones)'], ['corto', 'Corto: 45-55 s'], ['medio', 'Medio: 60-80 s (recomendado)'], ['largo', 'Largo: 80-110 s']].map(([k, l]) => `<option value="${k}" ${(e.length || 'medio') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
  <div class="row"><label>Efectos del director<select id="e-fx">${[['baja', 'Pocos (sobrio)'], ['media', 'Normal (recomendado)'], ['alta', 'Muchos (energético)']].map(([k, l]) => `<option value="${k}" ${(e.fxDensity || 'media') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <label>Música<select id="e-mood"><option value="">Automática según el nicho</option>${['alegre', 'suspenso', 'epica', 'lofi', 'motivacional', 'tecnologia'].map(m => `<option ${e.mood === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label></div>
  <p class="hint"><b>Reeditar mis videos</b> en este canal:</p>
  <div class="row"><label>Color<select id="e-relook"><option value="">Variado (recomendado)</option>${[['cine', 'Cine (naranja y azul)'], ['calido', 'Cálido'], ['vibrante', 'Vibrante'], ['frio', 'Frío'], ['suave', 'Suave y luminoso'], ['dramatico', 'Dramático'], ['vintage', 'Vintage']].map(([k, l]) => `<option value="${k}" ${e.reeditLook === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <label>Audio<select id="e-remode"><option value="mejorar" ${(e.reeditMode || 'mejorar') === 'mejorar' ? 'selected' : ''}>Conservar mi audio</option><option value="doblaje" ${e.reeditMode === 'doblaje' ? 'selected' : ''}>Doblaje: voces a los personajes</option><option value="nueva_voz" ${e.reeditMode === 'nueva_voz' ? 'selected' : ''}>Guion y voz nuevos</option></select></label>
  <div><label><input type="checkbox" id="e-resubs" ${e.reeditSubs !== false ? 'checked' : ''}>Subtítulos karaoke</label>
  <label><input type="checkbox" id="e-askvoices" ${e.askVoices !== false ? 'checked' : ''}>🎭 Antes de reeditar, preguntarme qué voz ponerle a cada personaje (con sus fotos)</label>
  <label><input type="checkbox" id="e-askclone" ${e.askClone !== false ? 'checked' : ''}>🎤 Preguntarme si quiero clonar las voces de cada video que reedite (recomendado)</label>
  <label><input type="checkbox" id="e-autoclone" ${e.autoClone ? 'checked' : ''}>Clonarlas automáticamente sin preguntar</label>
  <label style="margin-left:24px"><input type="checkbox" id="e-autoclone-ok" ${e.autoCloneConsentAt ? 'checked' : ''}><small>Confirmo que las voces de los videos que subo a este canal son mías, de personas que me dieron permiso o voces sintéticas que mi plan me deja usar; no son imitaciones de personas o personajes famosos.</small></label>
  <label><input type="checkbox" id="e-autodub" ${e.autoDub !== false ? 'checked' : ''}>Si el video no tiene voces, darle voz a los personajes (doblaje automático)</label>
  <label><input type="checkbox" id="e-rerep" ${e.reeditReplaceSubs !== false ? 'checked' : ''}>Tapar los subtítulos que ya trae el video y poner los nuevos</label>
  <label><input type="checkbox" id="e-revary" ${e.reeditVary !== false ? 'checked' : ''}>Que no quede igual al original <small>(otro encuadre y ritmo un poco más ágil)</small></label>
  <label><input type="checkbox" id="e-remus" ${e.reeditMusic ? 'checked' : ''}>Agregar música de fondo</label>
  <label><input type="checkbox" id="e-cut" ${e.cutLong !== false ? 'checked' : ''}>Cortar videos largos en Shorts</label></div></div>
  ${(e.reparto || []).length ? `<h2>🎭 Reparto de tus videos <small class="hint">(personajes que el doblaje reconoció; cada uno suena siempre igual)</small></h2>
  ${e.reparto.map((r, i) => `<div class="row" style="align-items:end"><label>Personaje<input data-rpn="${i}" value="${esc(r.nombre)}"><small class="hint">${esc(r.descripcion)}</small></label><label>Tipo de voz<select data-rpp="${i}">${presetOptions(r.preset || (String(r.voice).startsWith('clon:') ? r.voice : 'hombre'), false, true).replace('<option value="" ', '<option value="hombre" ')}</select></label>
   <div class="btns" style="margin:0"><button class="b ghost sm" data-act="rpPlay" data-i="${i}">▶</button><button class="b ghost sm" data-act="rpDel" data-i="${i}">Quitar</button></div></div>`).join('')}` : ''}
  ${(e.manual || []).length ? `<h2>📘 Manual del canal <small class="hint">(lo que el analista aprendió de tus videos${e.notas?.length ? ' · nota promedio últimos ' + e.notas.length + ': ' + (e.notas.reduce((a, b) => a + b, 0) / e.notas.length).toFixed(1) : ''})</small></h2>
  <ol class="hint">${e.manual.map(m => `<li>${esc(m.t)}</li>`).join('')}</ol><div class="btns"><button class="b ghost sm" data-act="clearManual">Borrar manual y empezar de cero</button></div>` : ''}
  <h2>Automatización y publicación</h2>
  <label><input type="checkbox" id="e-auto" ${e.autoApprove ? 'checked' : ''}>Aprobar solo (sin revisión). <small>Recomendado solo cuando el canal ya da buenos resultados; en salud y finanzas mejor revisar.</small></label>
  <div class="row"><label>Frase de cierre del canal <small>(su "firma", opcional)</small><input id="e-frase" maxlength="80" value="${esc(e.frase || '')}" placeholder="Ej: ¡La naturaleza te cuida!"></label>
  <label>Canal de Telegram del canal <small>(opcional, ej. @huertahabla)</small><input id="e-tg" value="${esc(e.telegram || '')}" placeholder="@micanal"></label></div>
  <div class="row"><label><input type="checkbox" id="e-pl" ${e.playlists !== false ? 'checked' : ''}>Playlists automáticas en YouTube por serie</label>
  <label><input type="checkbox" id="e-comu" ${e.community ? 'checked' : ''}>Publicación de Comunidad cada <input type="number" id="e-comuevery" min="1" max="7" value="${e.communityEvery || 2}" style="width:60px;display:inline-block"> días <small>(en Facebook se publica sola si eliges la página)</small></label></div>
  <div class="row"><label>Responder comentarios<select id="e-cm">${[['off', 'No'], ['revisar', 'La IA propone y yo apruebo'], ['auto', 'Automático (responde sola, de a poco)']].map(([k, l]) => `<option value="${k}" ${(e.comments || 'off') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <label>Máximo de respuestas automáticas por día<input id="e-cmmax" type="number" min="1" max="100" value="${e.commentsMax || 30}"></label></div>
  <label><input type="checkbox" id="e-aidis" ${e.aiDisclosure !== false ? 'checked' : ''}>Marcar en YouTube "contenido alterado o sintético" (recomendado para videos hechos con IA realista)</label>
  ${e.id ? `<div class="row" style="margin-top:8px"><div class="card" style="margin:0;padding:14px"><b>YouTube</b><br>${S.publish.google[e.id] ? `<span class="hint">✓ ${esc(S.publish.google[e.id].title)}</span> <button class="b ghost sm" data-act="disc" data-kind="google">Desconectar</button>` : `<a class="b sm" href="/oauth/google/start?channel=${e.id}" style="text-decoration:none;display:inline-block;margin-top:6px">Conectar YouTube</a>`}
    <label><input type="checkbox" id="e-pyt" ${e.autoPublish?.youtube ? 'checked' : ''} ${S.publish.google[e.id] ? '' : 'disabled'}>Publicar solo a la hora del canal</label></div>
   <div class="card" style="margin:0;padding:14px"><b>Facebook</b><select id="e-fbpage" style="margin-top:6px"><option value="">${S.publish.facebookPages.length ? 'Elige la página…' : 'Conecta Facebook en Ajustes'}</option>${S.publish.facebookPages.map(p => `<option value="${p.id}" ${e.fbPageId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
    <label><input type="checkbox" id="e-pfb" ${e.autoPublish?.facebook ? 'checked' : ''} ${S.publish.facebookPages.length ? '' : 'disabled'}>Publicar solo a la hora del canal</label>
    <label><input type="checkbox" id="e-fbcom" ${e.fbFirstComment !== false ? 'checked' : ''}>Poner el primer comentario (pregunta + enlace a tu YouTube)</label>
    <label><input type="checkbox" id="e-fbstory" ${e.fbStory ? 'checked' : ''}>Publicarlo también como Historia de la página</label></div></div>
  <div class="row" style="margin-top:8px"><div class="card" style="margin:0;padding:14px"><b>Instagram Reels</b><br>${(() => { const pg = S.publish.facebookPages.find(p => p.id === e.fbPageId); return pg?.ig ? `<span class="hint">✓ @${esc(pg.ig)}</span>` : `<span class="hint">Usa la cuenta de Instagram profesional vinculada a la página de Facebook.</span>`; })()} <button class="b ghost sm" data-act="igCheck" data-id="${e.id}" ${e.fbPageId ? '' : 'disabled'}>Comprobar</button>
    <label><input type="checkbox" id="e-pig" ${e.autoPublish?.instagram ? 'checked' : ''}>Publicar solo a la hora de Facebook</label></div>
   <div class="card" style="margin:0;padding:14px"><b>Bluesky</b><br>${S.publish.bluesky?.[e.id] ? `<span class="hint">✓ @${esc(S.publish.bluesky[e.id])}</span> <button class="b ghost sm" data-act="bskyOff" data-id="${e.id}">Quitar</button>` : `<input id="e-bsky-h" placeholder="usuario.bsky.social" style="margin-top:6px"><input id="e-bsky-p" type="password" placeholder="contraseña de app (no la normal)" style="margin-top:6px"><button class="b ghost sm" data-act="bskyOn" data-id="${e.id}" style="margin-top:6px">Conectar</button>`}
    <label><input type="checkbox" id="e-pbsky" ${e.autoPublish?.bluesky ? 'checked' : ''}>Publicar solo a la hora de Facebook</label></div></div>
  <div class="row" style="margin-top:8px"><div class="card" style="margin:0;padding:14px"><b>Blogger</b> <span class="hint">(artículo en Google con tu Short)</span><br><span class="hint">Usa la cuenta de Google de YouTube. Crea un blog gratis en blogger.com y pulsa "Reconectar" YouTube una vez.</span>
    <label><input type="checkbox" id="e-pblog" ${e.autoPublish?.blogger ? 'checked' : ''} ${S.publish.google[e.id] ? '' : 'disabled'}>Publicar cuando salga en YouTube</label></div>
   <div class="card" style="margin:0;padding:14px"><b>Mastodon</b><br>${S.publish.mastodon?.[e.id] ? `<span class="hint">✓ ${esc(S.publish.mastodon[e.id])}</span> <button class="b ghost sm" data-act="redOff" data-red="mastodon" data-id="${e.id}">Quitar</button>` : `<input id="e-mast-s" placeholder="servidor (ej. mastodon.social)" style="margin-top:6px"><input id="e-mast-t" type="password" placeholder="token de acceso" style="margin-top:6px"><button class="b ghost sm" data-act="redOn" data-red="mastodon" data-id="${e.id}" style="margin-top:6px">Conectar</button>`}
    <label><input type="checkbox" id="e-pmast" ${e.autoPublish?.mastodon ? 'checked' : ''}>Publicar solo a la hora de Facebook</label></div>
   <div class="card" style="margin:0;padding:14px"><b>Discord</b> <span class="hint">(tu servidor de fans)</span><br>${S.publish.discord?.[e.id] ? `<span class="hint">✓ conectado</span> <button class="b ghost sm" data-act="redOff" data-red="discord" data-id="${e.id}">Quitar</button>` : `<input id="e-disc-u" type="password" placeholder="webhook del canal de anuncios" style="margin-top:6px"><button class="b ghost sm" data-act="redOn" data-red="discord" data-id="${e.id}" style="margin-top:6px">Conectar</button>`}
    <label><input type="checkbox" id="e-pdisc" ${e.autoPublish?.discord ? 'checked' : ''}>Avisar cuando salga en YouTube/Facebook</label></div></div>
  <div class="card" style="margin:10px 0 0;padding:14px"><b>📣 Crecer</b>
    <label><input type="checkbox" id="e-xlinks" ${e.crossLinks !== false ? 'checked' : ''}>Poner enlaces a mis otras redes al final de cada descripción (usa los @ de arriba)</label>
    ${S.publish.facebookPages.length > 1 ? `<p class="hint" style="margin:8px 0 4px">Promoción cruzada: compartir los Reels de este canal en estas otras páginas tuyas del mismo tema (máx. 1 al día por página):</p><div style="display:flex;flex-wrap:wrap;gap:4px 14px">${S.publish.facebookPages.filter(p => p.id !== e.fbPageId).map(p => `<label style="font-weight:400"><input type="checkbox" data-share="${p.id}" ${(e.fbShareTo || []).includes(p.id) ? 'checked' : ''}>${esc(p.name)}</label>`).join('')}</div>` : ''}</div>` : '<p class="hint">Guarda el canal para conectar YouTube y Facebook.</p>'}
  ${e.style === 'personaje' ? `<label>Cómo se ven los personajes<select id="e-look">${[['escena', 'Escena completa: los personajes dentro de cada escena con IA (recomendado)'], ['pegado', 'Personaje encima del fondo (gasta menos cupo de imágenes)']].map(([k, l]) => `<option value="${k}" ${(e.look || 'escena') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` + charEditor() : ''}
  <div class="btns" style="margin-top:22px"><button class="b big" data-act="saveCh">Guardar canal</button><button class="b ghost" data-act="closeModal">Cancelar</button>${e.id ? '<button class="b red" data-act="delCh" style="margin-left:auto">Eliminar canal</button>' : ''}</div>`;
  $('#e-rate').oninput = ev => $('#e-rate-v').textContent = ev.target.value + '%';
  $('#e-pitch').oninput = ev => $('#e-pitch-v').textContent = ev.target.value + ' Hz';
  $('#e-style').onchange = () => { readChannel(); drawChannel(); };
}
function charEditor() {
  const e = edit;
  return `<h2>Personajes</h2><p class="hint">Cada personaje necesita una imagen con la <b>boca cerrada</b> y otra con la <b>boca abierta</b> (así parece que habla), con fondo transparente. Con Cloudflare puedes <b>crearlas con IA</b> en un clic; o súbelas tú. En los videos los personajes pueden conversar entre ellos, cada uno con su voz.</p>
  <details class="seo"><summary>Cómo crear las imágenes gratis</summary><ol class="steps">
    <li>Abre un generador de imágenes gratis (por ejemplo, Microsoft Designer / Bing Image Creator o la app de Gemini).</li>
    <li>Pide: <i>“Personaje 3D estilo animación de un limón simpático con cara, ojos grandes, boca cerrada sonriendo, cuerpo completo, fondo blanco liso”</i>.</li>
    <li>Luego: <i>“El mismo personaje exactamente igual pero con la boca abierta hablando”</i>.</li>
    <li>Quita el fondo gratis: Paint de Windows 11 tiene “Quitar fondo”, o usa remove.bg. Guarda como PNG.</li>
    <li>Súbelas aquí. Se reutilizan en todos los videos y el canal se vuelve reconocible.</li></ol></details>
  ${e.id ? (e.characters || []).map((c, i) => `<div class="charrow"><label>Nombre<input data-cname="${i}" value="${esc(c.name)}"></label><label>Voz<select data-cvoice="${i}">${voiceOptions(c.voice || e.voice)}</select></label><label>Tipo de voz<select data-cpreset="${i}">${presetOptions(c.voicePreset || '')}</select></label>
    <label>Boca cerrada ${c.closed ? `<img src="/files/chars/${c.closed}">` : ''}<input type="file" accept="image/*" data-cup="closed" data-cid="${c.id}"></label>
    <label>Boca abierta ${c.open ? `<img src="/files/chars/${c.open}">` : ''}<input type="file" accept="image/*" data-cup="open" data-cid="${c.id}"></label>
    <label>Descripción para crearlo con IA <small>(en inglés o español)</small><input data-cdesc="${i}" value="${esc(c.description || '')}" placeholder="Ej: lemon with green leaf hat"></label>
    <div class="btns" style="margin:0;align-items:end"><button class="b sm" data-act="aiChar" data-cid="${c.id}" data-i="${i}" ${S.cf.ready ? '' : 'disabled title="Pon tus claves de Cloudflare en Ajustes"'}>✨ Crear con IA</button><button class="b ghost sm" data-act="delChar" data-i="${i}">Quitar</button></div></div>`).join('') + '<div class="btns"><button class="b ghost sm" data-act="addChar">+ Agregar personaje</button></div>'
    : '<p class="hint">Guarda el canal primero para agregar personajes.</p>'}`;
}
function readChannel() {
  const e = edit, v = id => $('#' + id)?.value;
  Object.assign(e, { name: v('e-name').trim(), niche: v('e-niche').trim(), style: v('e-style'), images: v('e-images'), look: v('e-look') || e.look, color: v('e-color'), tone: v('e-tone'), notes: v('e-notes'), voice: v('e-voice'), rate: +v('e-rate'), pitch: +v('e-pitch'), priority: +v('e-prio'), active: $('#e-active').checked,
    length: v('e-len'), fxDensity: v('e-fx'), mood: v('e-mood'), reeditMode: v('e-remode'), autoDub: $('#e-autodub').checked, autoClone: $('#e-autoclone').checked, askClone: $('#e-askclone').checked, askVoices: $('#e-askvoices').checked, autoCloneConsent: $('#e-autoclone-ok').checked, reeditSubs: $('#e-resubs').checked, reeditReplaceSubs: $('#e-rerep').checked, reeditVary: $('#e-revary').checked, reeditLook: v('e-relook'), reeditMusic: $('#e-remus').checked, cutLong: $('#e-cut').checked,
    autoApprove: $('#e-auto').checked, aiDisclosure: $('#e-aidis').checked, fbPageId: v('e-fbpage') ?? e.fbPageId,
    comments: v('e-cm'), voicePreset: v('e-vpreset'), frase: v('e-frase').trim(), telegram: v('e-tg').trim(), playlists: $('#e-pl').checked, community: $('#e-comu').checked, communityEvery: +v('e-comuevery') || 2, fbCommunity: $('#e-comu').checked, commentsMax: +v('e-cmmax') || 30, autoPublish: { youtube: !!$('#e-pyt')?.checked, facebook: !!$('#e-pfb')?.checked, instagram: !!$('#e-pig')?.checked, bluesky: !!$('#e-pbsky')?.checked, blogger: !!$('#e-pblog')?.checked, mastodon: !!$('#e-pmast')?.checked, discord: !!$('#e-pdisc')?.checked },
    ...($('#e-fbcom') ? { fbFirstComment: $('#e-fbcom').checked, fbStory: $('#e-fbstory').checked, crossLinks: $('#e-xlinks').checked, fbShareTo: [...document.querySelectorAll('[data-share]')].filter(x => x.checked).map(x => x.dataset.share) } : {}) });
  e.times = {}; document.querySelectorAll('[data-time]').forEach(i => { if (i.value) e.times[i.dataset.time] = i.value; }); e.perDay = +($('#e-perday')?.value || 1);
  e.handles = {}; document.querySelectorAll('[data-handle]').forEach(i => e.handles[i.dataset.handle] = i.value.trim());
  document.querySelectorAll('[data-cname]').forEach(i => e.characters[+i.dataset.cname].name = i.value.trim());
  document.querySelectorAll('[data-cvoice]').forEach(i => e.characters[+i.dataset.cvoice].voice = i.value);
  document.querySelectorAll('[data-rpn]').forEach(i => e.reparto[+i.dataset.rpn].nombre = i.value.trim() || e.reparto[+i.dataset.rpn].nombre);
  document.querySelectorAll('[data-rpp]').forEach(i => { const r = e.reparto[+i.dataset.rpp]; if (i.value.startsWith('clon:')) { r.voice = i.value; r.preset = ''; } else if (r.preset !== i.value) { r.preset = i.value; r.voice = ''; } });
  document.querySelectorAll('[data-cpreset]').forEach(i => e.characters[+i.dataset.cpreset].voicePreset = i.value);
  document.querySelectorAll('[data-cdesc]').forEach(i => e.characters[+i.dataset.cdesc].description = i.value.trim());
}
async function saveChannel(close) {
  readChannel();
  if (!edit.name) throw new Error('Escribe el nombre del canal');
  if (!edit.niche) throw new Error('Escribe el nicho del canal');
  const logo = $('#e-logo').files[0];
  const saved = await api('/api/channel', edit);
  edit.id = saved.id;
  if (logo) await uploadFile(logo, { kind: 'logo', channel: saved.id });
  await refresh();
  if (close) { $('#modal').hidden = true; edit = null; render(); toast('Canal guardado'); }
  else { edit = JSON.parse(JSON.stringify(S.channels.find(c => c.id === saved.id))); drawChannel(); }
}

// Subida de videos propios con barra de progreso (uno por uno).
async function uploadVideos(files) {
  const ch = $('#re-ch').value, mode = $('#re-mode').value, out = $('#re-prog');
  for (const [i, f] of files.entries()) {
    await new Promise((ok, no) => {
      const x = new XMLHttpRequest();
      x.open('POST', '/api/reedit/upload?' + new URLSearchParams({ channel: ch, mode, name: f.name }));
      x.setRequestHeader('x-sf', '1');
      x.upload.onprogress = e => { out.textContent = `Subiendo ${i + 1} de ${files.length}: ${f.name} (${Math.round(e.loaded / e.total * 100)}%)`; };
      x.onload = () => { const j = JSON.parse(x.responseText || '{}'); if (x.status >= 400 || j.error) no(new Error(j.error || 'Error')); else ok(j); };
      x.onerror = () => no(new Error('No se pudo subir ' + f.name));
      x.send(f);
    });
  }
  out.textContent = `✓ ${files.length} video(s) en la cola. Se reparten 1 por día en el calendario.`;
  await refresh(true);
}
document.addEventListener('dragover', e => { const d = e.target.closest?.('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
document.addEventListener('dragleave', e => { const d = e.target.closest?.('#drop'); if (d) d.classList.remove('over'); });
document.addEventListener('drop', e => { const d = e.target.closest?.('#drop'); if (!d) return; e.preventDefault(); d.classList.remove('over'); const fs = [...e.dataTransfer.files].filter(f => /video|\.(mp4|mov|mkv|webm|m4v)$/i.test(f.type + f.name)); if (fs.length) uploadVideos(fs).catch(err => alert(err.message)); });

// ---------- Acciones ----------

// ---------- Desarmar video ----------
let DS = null, DSt = 0;
async function loadDS(redraw) { DSt = Date.now(); const old = JSON.stringify(DS); DS = (await api('/api/desarmados')).items; if (tab === 'desarmar' && (redraw || old !== JSON.stringify(DS)) && !(document.activeElement && ['TEXTAREA', 'INPUT', 'SELECT'].includes(document.activeElement.tagName))) render(); }
const EST = { cola: '⏳ En cola', transcribiendo: '🎧 Escuchando…', analizando: '🔬 La IA lo está desarmando…', listo: '✅ Listo', error: '⚠ Error' };
VIEWS.desarmar = () => {
  if (!DS) { loadDS(true).catch(e => toast(e.message)); return '<h1>Desarmar video</h1><div class="card">Cargando…</div>'; }
  const chs = S.channels;
  return `<h1>🔬 Desarmar video</h1><p class="sub">Sube un video y la IA lo desarma escena por escena: prompts de cada imagen, personajes, estilo, cámara, diálogos, ritmo y por qué funciona. Después el sistema lo <b>vuelve a crear desde cero, mejorado</b>.</p>
  <div class="card"><label>Sube uno o varios videos (mp4, mov, webm)<input type="file" id="ds-files" accept="video/*" multiple></label><p class="hint" id="ds-prog"></p></div>
  ${DS.length ? DS.map(d => { const b = d.bp || {};
    const allPrompts = b.escenas ? [`ESTILO: ${b.estilo_visual || ''}`, ...(b.personajes || []).map(p => `PERSONAJE ${p.nombre}: ${p.prompt}`), ...b.escenas.map((e, i) => `ESCENA ${i + 1} (${e.inicio}-${e.fin}s): ${e.prompt_imagen}`)].join('\n\n') : '';
    return `<div class="card"><div class="vid">${d.estado === 'listo' || d.bp ? `<img src="/files/desarmados/${d.id}.jpg" style="width:150px;border-radius:12px" onerror="this.remove()">` : ''}<div style="min-width:0;flex:1">
    <h3 style="margin-top:0">${esc(d.titulo || d.nombre)}</h3><span class="chip">${EST[d.estado] || esc(d.estado)}</span>${d.dur ? ` <span class="hint">${d.dur} s · ${b.escenas?.length || 0} escenas</span>` : ''}
    ${d.error ? `<p class="hint" style="color:var(--bad)">${esc(d.error)}</p>` : ''}
    ${b.resumen ? `<p>${esc(b.resumen)}</p><p class="hint"><b>Por qué funciona:</b> ${esc(b.por_que_funciona || '')}</p><p class="hint"><b>Gancho:</b> ${esc(b.gancho || '')} · <b>Ritmo:</b> ${esc(b.ritmo || '')}</p>` : ''}
    </div></div>
    ${b.escenas ? `
    ${b.mejoras?.length ? `<details open><summary><b>🚀 Cómo superarlo</b></summary><ul>${b.mejoras.map(m => `<li>${esc(m)}</li>`).join('')}</ul></details>` : ''}
    <details><summary><b>🎨 Estilo y personajes</b></summary>${copyBox('Estilo visual', b.estilo_visual)}${(b.personajes || []).map(p => copyBox(`${p.nombre} · voz: ${p.voz || '-'}`, p.prompt)).join('')}</details>
    <details><summary><b>🎬 Escenas y prompts (${b.escenas.length})</b></summary>${b.escenas.map((e, i) => `<div style="border-top:1px solid var(--line,#eee);padding:8px 0"><b>Escena ${i + 1}</b> <span class="hint">${esc(e.inicio)}–${esc(e.fin)} s · ${esc(e.camara || '')}</span><p>${esc(e.que_pasa || '')}</p>${(e.dialogo || []).length ? `<p class="hint">${e.dialogo.map(x => `<b>${esc(x.personaje)}:</b> ${esc(x.texto)}`).join('<br>')}</p>` : ''}${copyBox('Prompt', e.prompt_imagen)}</div>`).join('')}
      ${copyBox('Todos los prompts', allPrompts)}</details>
    <h3>✨ Crearlo desde cero</h3>
    <div class="row"><label>Canal<select id="dsc-${d.id}">${chs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
     <label>Cómo<select id="dsm-${d.id}"><option value="mio">Es mi video: misma historia, mejorada</option><option value="otro">Es de otro creador: su técnica con otro tema (original)</option></select></label>
     <label>Cuántas versiones<input type="number" id="dsn-${d.id}" min="1" max="5" value="1"></label></div>
    <label>Indicaciones (opcional)<input id="dsi-${d.id}" placeholder="Ej: que el burro sea el héroe, más chistes, final sorpresa"></label>
    <div class="btns"><button class="b" data-act="dsCrear" data-id="${d.id}" ${chs.length ? '' : 'disabled'}>Crear video</button><button class="b ghost sm" data-act="dsBorrar" data-id="${d.id}">Eliminar</button></div>`
    : `<div class="btns">${d.estado === 'error' && d.src ? `<button class="b sm" data-act="dsRetry" data-id="${d.id}">↻ Reintentar</button>` : ''}<button class="b ghost sm" data-act="dsBorrar" data-id="${d.id}">Eliminar</button></div>`}</div>`; }).join('') : '<div class="card empty">Todavía no desarmaste ningún video.</div>'}`;
};
async function uploadDS(files) {
  const out = $('#ds-prog');
  for (const [i, f] of files.entries()) {
    await new Promise((ok, no) => {
      const x = new XMLHttpRequest();
      x.open('POST', '/api/desarmar/upload?' + new URLSearchParams({ name: f.name }));
      x.setRequestHeader('x-sf', '1');
      x.upload.onprogress = e => { out.textContent = `Subiendo ${i + 1} de ${files.length}: ${f.name} (${Math.round(e.loaded / e.total * 100)}%)`; };
      x.onload = () => { const j = JSON.parse(x.responseText || '{}'); if (x.status >= 400 || j.error) no(new Error(j.error || 'Error')); else ok(j); };
      x.onerror = () => no(new Error('No se pudo subir ' + f.name));
      x.send(f);
    });
  }
  out.textContent = `✓ ${files.length} video(s) subidos. La IA los está desarmando (1 a 3 minutos cada uno).`;
  await loadDS(true);
}

// ---------- Estadísticas y Cerebro ----------
let BR = null, BRt = 0;
async function loadBrain(redraw) { BRt = Date.now(); BR = await api('/api/brain'); if (tab === 'estadisticas' && redraw) render(); }
const bar = (v, max, label) => { const p = Math.min(100, Math.round(100 * (v || 0) / max)); return `<div style="margin:6px 0"><div class="hint">${label}: <b>${(v || 0).toLocaleString('es')}</b> de ${max.toLocaleString('es')} (${p}%)</div><div style="background:var(--line,#e5e5e5);border-radius:8px;height:12px;overflow:hidden"><div style="width:${p}%;height:100%;background:var(--brand,#15803d)"></div></div></div>`; };
VIEWS.estadisticas = () => {
  if (!BR) { loadBrain(true).catch(e => toast(e.message)); return '<h1>Estadísticas</h1><div class="card">Cargando…</div>'; }
  const cs = BR.canales.filter(c => S.channels.find(x => x.id === c.id)?.active);
  return `<h1>Estadísticas y Cerebro</h1><p class="sub">Tus números reales de YouTube, el camino a la monetización y lo que el Cerebro aprendió de la competencia. Se actualiza solo (estadísticas cada 6 horas, competencia 1 vez por semana por canal).</p>
  <div class="card"><div class="btns" style="margin:0"><button class="b" data-act="brainRun">🧠 Analizar todo ahora</button><button class="b ghost" data-act="brainReload">Actualizar pantalla</button></div>
   ${!S.keys.YOUTUBE_API_KEY ? '<p class="hint">Para analizar la competencia, pega tu clave <b>YouTube Data API</b> en Ajustes.</p>' : ''}
   ${BR.state.running ? '<p class="hint">Pensando… (puede tardar unos minutos)</p>' : ''}
   ${BR.state.log.length ? `<details><summary class="hint">Registro del Cerebro</summary><div class="log">${BR.state.log.map(esc).join('<br>')}</div></details>` : ''}</div>
  ${cs.length ? cs.map(c => { const st = c.stats || {}, nota = c.notas.length ? (c.notas.reduce((a, b) => a + b, 0) / c.notas.length).toFixed(1) : null;
    const perDay = (st.shortsViews90 || 0) / 90, faltan = 10e6 - (st.shortsViews90 || 0);
    const comu = (S.channels.find(x => x.id === c.id)?.comunidad || []).slice(-2).reverse();
    return `<div class="card"><h2 style="margin-top:0">${esc(c.name)}</h2>
    ${c.stats ? `<p class="hint">${(st.subs ?? 0).toLocaleString('es')} suscriptores · ${(st.views ?? 0).toLocaleString('es')} vistas totales · ${st.videos ?? 0} videos${nota ? ' · calidad promedio ' + nota + '/10' : ''}${st.analyticsError ? ' · <span style="color:var(--bad)">' + esc(st.analyticsError) + '</span>' : ''}</p>
      <h3>💰 Camino a la monetización</h3>${bar(st.subs, 1000, 'Suscriptores')}${bar(st.shortsViews90, 10e6, 'Vistas de Shorts (últimos 90 días)')}
      <p class="hint">${faltan <= 0 && (st.subs || 0) >= 1000 ? '🎉 ¡Cumples los requisitos! Revisa el canal y pide la monetización en YouTube Studio.' : perDay > 0 ? `Al ritmo actual (${Math.round(perDay).toLocaleString('es')} vistas/día) te faltan unos ${Math.ceil(Math.max(0, faltan) / perDay)} días para las vistas. Un solo viral lo acelera muchísimo.` : 'Aún sin vistas registradas.'}</p>
      ${c.top.length ? `<h3>🏆 Tus mejores videos</h3><ol>${c.top.map(v => `<li>${v.url ? `<a href="${esc(v.url)}" target="_blank">${esc(v.title)}</a>` : esc(v.title)} — ${v.views.toLocaleString('es')} vistas${v.pct ? ` · ${v.pct}% visto` : ''}${v.subsGained ? ` · +${v.subsGained} subs` : ''}</li>`).join('')}</ol>` : ''}`
    : `<p class="hint">Conecta YouTube en este canal (Canales → Editar) para ver tus estadísticas y el camino a la monetización.${nota ? ' Calidad promedio de tus videos: ' + nota + '/10.' : ''}</p>`}
    ${c.brain ? `<h3>🧠 Lo que aprendió el Cerebro <small class="hint">(${esc(new Date(c.brain.at).toLocaleDateString('es'))})</small></h3><p>${esc(c.brain.resumen)}</p>
      ${c.insights.length ? `<p class="hint"><b>Qué funciona:</b></p><ul>${c.insights.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${c.tendencias.length ? `<p class="hint"><b>Tendencias del nicho:</b> ${c.tendencias.map(esc).join(' · ')}</p>` : ''}
      ${c.keywords.length ? `<p class="hint"><b>Búsquedas reales para SEO:</b> ${c.keywords.map(esc).join(', ')}</p>` : ''}
      ${c.brain.comp?.length ? `<details><summary class="hint">Shorts más fuertes de la competencia (${c.brain.comp.length})</summary><ol>${c.brain.comp.map(v => `<li><a href="${esc(v.url)}" target="_blank">${esc(v.title)}</a> — ${esc(v.canal)} · ${v.views.toLocaleString('es')} vistas · ${v.dur}s${v.ratio >= 5 ? ' · <b>🔥 fuera de serie</b>' : ''}</li>`).join('')}</ol></details>` : ''}`
    : '<p class="hint">El Cerebro todavía no analizó este canal.</p>'}
    <div class="btns"><button class="b ghost sm" data-act="brainRun" data-id="${c.id}">Analizar este canal</button><button class="b ghost sm" data-act="communityNew" data-id="${c.id}">📢 Crear publicación de Comunidad</button></div>
    ${comu.map(p => `<div class="copy" style="white-space:pre-wrap"><span class="k">Comunidad · ${esc(p.tipo)} · ${esc(new Date(p.at).toLocaleDateString('es'))}${p.fb?.ok ? ' · ✓ publicada en Facebook' : ''}</span>${esc(p.texto)}${p.opciones.length ? '\n' + p.opciones.map((o, i) => `${i + 1}. ${esc(o)}`).join('\n') : ''}<button class="b ghost sm" data-act="copy">Copiar para YouTube</button></div>`).join('')}
    </div>`; }).join('') : '<div class="card empty">Activa al menos un canal.</div>'}`;
};

// ---------- Comentarios ----------
let CM = null, CMt = 0, cmFilter = 'propuesta';
async function loadComments(redraw) {
  CMt = Date.now();
  const old = CM && JSON.stringify(CM.items.map(x => x.id + x.status));
  CM = await api('/api/comments');
  const n = CM.items.filter(x => x.status === 'propuesta').length;
  $('#cbadge').textContent = n || '';
  const typing = document.activeElement && document.activeElement.tagName === 'TEXTAREA';
  if (tab === 'comentarios' && (redraw || (!typing && old !== JSON.stringify(CM.items.map(x => x.id + x.status))))) render();
}
const TIPO = { pregunta: '❓ Pregunta', elogio: '💚 Elogio', critica: '⚠ Crítica', delicado: '🩺 Delicado', otro: '💬 Comentario' };
VIEWS.comentarios = () => {
  if (!CM) { loadComments(true).catch(e => toast(e.message)); return '<h1>Comentarios</h1><div class="card">Cargando…</div>'; }
  const on = S.channels.filter(c => c.comments && c.comments !== 'off');
  const F = { propuesta: 'Por responder', respondido: 'Respondidos', ignorado: 'Ignorados' };
  const items = CM.items.filter(x => x.status === cmFilter);
  const ideas = CM.items.filter(x => x.idea && !x.ideaUsed);
  return `<h1>Comentarios</h1><p class="sub">La IA lee los comentarios nuevos de YouTube y Facebook cada 30 minutos y propone una respuesta. En modo <b>automático</b> responde sola de a poco (las críticas y preguntas de salud personal siempre quedan para ti).</p>
  <div class="card">${on.length ? `<p>Activado en: <b>${on.map(c => esc(c.name) + (c.comments === 'auto' ? ' (automático)' : ' (tú apruebas)')).join(', ')}</b></p>` : `<p><b>Todavía no está activado en ningún canal.</b> Ve a Canales → Editar → "Responder comentarios".</p>`}
   <p class="hint">Respuestas hoy: <b>${CM.today}</b> · Cuota de YouTube disponible para responder hoy: <b>${CM.budget}</b> respuestas (se reserva lo necesario para tus subidas)${CM.state.last ? ' · Última revisión: ' + esc(new Date(CM.state.last).toLocaleTimeString('es')) : ''}</p>
   ${CM.state.error ? `<p class="hint" style="color:var(--bad)">${esc(CM.state.error)}</p>` : ''}
   <div class="btns"><button class="b" data-act="cmCheck" ${on.length ? '' : 'disabled'}>Buscar comentarios ahora</button></div></div>
  ${ideas.length ? `<div class="card"><h3>💡 Ideas de video sacadas de tus comentarios</h3>${ideas.slice(0, 8).map(x => `<div class="item"><div><b>${esc(x.idea)}</b><br><span class="hint">${esc(x.channel)} · pedido por ${esc(x.author)}</span></div><div class="btns" style="margin:0"><button class="b sm" data-act="cmIdea" data-id="${esc(x.id)}">Crear video</button><button class="b ghost sm" data-act="cmIdeaNo" data-id="${esc(x.id)}">Descartar</button></div></div>`).join('')}</div>` : ''}
  <div class="quick">${Object.entries(F).map(([k, v]) => `<button class="b sm ${cmFilter === k ? '' : 'ghost'}" data-act="cmFilter" data-f="${k}">${v} (${CM.items.filter(x => x.status === k).length})</button>`).join('')}</div>
  ${items.length ? items.slice(0, 60).map(x => `<div class="card">
    <div class="hint">${x.plat === 'youtube' ? 'YouTube' : 'Facebook'} · ${esc(x.channel)}${x.video ? ' · ' + esc(x.video) : ''} · ${esc(new Date(x.at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }))} ${x.tipo ? `<span class="chip">${TIPO[x.tipo] || esc(x.tipo)}</span>` : ''}${x.liked ? ' <span class="chip">👍 me gusta</span>' : ''}</div>
    <p><b>${esc(x.author)}:</b> ${esc(x.text)}</p>
    ${x.status === 'propuesta' ? `<textarea id="cm-${esc(x.id)}" rows="2">${esc(x.reply || '')}</textarea>
      ${x.error ? `<p class="hint" style="color:var(--bad)">${esc(x.error)}</p>` : ''}
      <div class="btns"><button class="b sm" data-act="cmSend" data-id="${esc(x.id)}">Responder</button><button class="b ghost sm" data-act="cmRedo" data-id="${esc(x.id)}">Otra respuesta</button><button class="b ghost sm" data-act="cmIgnore" data-id="${esc(x.id)}">Ignorar</button></div>`
    : x.reply ? `<p class="hint">↳ Tu respuesta: ${esc(x.reply)}</p>` : ''}</div>`).join('') : '<div class="card empty">Nada por aquí.</div>'}`;
};

const ACT = {
  go: el => { tab = el.dataset.tab; store.set('tab', tab); render(); },
  filter: el => { filter = el.dataset.f; store.set('filter', filter); render(); },
  plan: guard(async el => { const r = await api('/api/plan', { date: el.dataset.date }); toast(r.n ? `${r.n} videos agregados a la cola` : 'Ya hay videos para ese día (o no hay canales activos)'); await refresh(true); }),
  presets: guard(async () => { const r = await api('/api/channel/presets', {}); toast(`${r.n} canales creados. Activé 3 para empezar.`); await refresh(true); }),
  editCh: el => openChannel(el.dataset.id),
  closeModal: () => { $('#modal').hidden = true; edit = null; },
  saveCh: guard(() => saveChannel(true)),
  delCh: guard(async () => { if (!confirm('¿Eliminar este canal? Sus videos ya hechos se conservan.')) return; await api('/api/channel/delete', { id: edit.id }); $('#modal').hidden = true; await refresh(true); }),
  toggleCh: guard(async el => { const c = S.channels.find(x => x.id === el.dataset.id); await api('/api/channel', { id: c.id, active: !c.active }); await refresh(true); }),
  quickJob: el => { store.set('lastCh', el.dataset.id); tab = 'crear'; store.set('tab', tab); render(); },
  listen: guard(async el => {
    el.disabled = true; el.textContent = 'Generando…';
    try { const pr = $('#e-vpreset').value; const r = await api('/api/voice/preview', { voice: $('#e-voice').value, rate: +$('#e-rate').value, pitch: +$('#e-pitch').value, preset: pr === 'auto' ? '' : pr, text: `Hola, soy la voz de ${$('#e-name').value || 'tu canal'}. ¿Te gusta cómo sueno?` }); const a = $('#e-audio'); a.src = r.url; a.hidden = false; a.play(); }
    finally { el.disabled = false; el.textContent = '▶ Escuchar'; }
  }),
  addChar: guard(async () => { readChannel(); edit.characters.push({ id: Math.random().toString(36).slice(2, 8), name: 'Nuevo personaje', voice: edit.voice }); await saveChannel(false); }),
  delChar: guard(async el => { readChannel(); edit.characters.splice(+el.dataset.i, 1); await saveChannel(false); }),
  inspire: guard(async () => { const ch = $('#in-ch').value; store.set('lastCh', ch); await api('/api/inspire', { channelId: ch, transcript: $('#in-tr').value, notes: $('#in-notes').value, publishDate: $('#in-date').value }); toast('En la cola: la IA creará un video original'); filter = 'cola'; store.set('filter', filter); tab = 'videos'; store.set('tab', tab); await refresh(true); }),
  aiChar: guard(async el => {
    readChannel(); await api('/api/channel', edit);
    el.disabled = true; el.textContent = 'Creando… (1-2 min)';
    try { await api('/api/character/ai', { channelId: edit.id, charId: el.dataset.cid, description: edit.characters[+el.dataset.i].description || edit.characters[+el.dataset.i].name }); await refresh(); edit = JSON.parse(JSON.stringify(S.channels.find(c => c.id === edit.id))); drawChannel(); toast('Personaje creado'); }
    finally { el.disabled = false; el.textContent = '✨ Crear con IA'; }
  }),
  recStart: guard(async el => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rec = { chunks: [], mr: new MediaRecorder(stream), t0: Date.now() };
    rec.mr.ondataavailable = e => rec.chunks.push(e.data);
    rec.mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); rec.blob = new Blob(rec.chunks, { type: rec.mr.mimeType }); $('#v-play').src = URL.createObjectURL(rec.blob); $('#v-play').hidden = false; $('#v-state').textContent = `Grabado: ${Math.round((Date.now() - rec.t0) / 1000)} s`; };
    rec.mr.start(); el.hidden = true; $('#v-stop').hidden = false; $('#v-state').textContent = '● Grabando… lee el texto con calma';
  }),
  recStop: el => { rec?.mr.stop(); el.hidden = true; $('#v-rec').hidden = false; },
  saveVoice: guard(async el => {
    const file = $('#v-file').files[0] || rec?.blob;
    if (!file) throw new Error('Graba tu voz o sube un archivo de audio');
    if (!$('#v-consent').checked) throw new Error('Debes confirmar que tienes permiso para usar esta voz');
    el.disabled = true; el.textContent = 'Revisando la calidad…';
    try {
      const r = await fetch('/api/voices/clone?' + new URLSearchParams({ name: $('#v-name').value, owner: $('#v-owner').value, gender: $('#v-gender').value, consent: '1' }), { method: 'POST', headers: { 'x-sf': '1' }, body: file });
      const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error);
      rec = null; toast(`Voz guardada (${j.seconds} s de muestra)`); await refresh(true);
    } finally { el.disabled = false; el.textContent = 'Guardar voz'; }
  }),
  delVoice: guard(async el => { if (!confirm('¿Eliminar esta voz?')) return; await api('/api/voices/delete', { id: el.dataset.id }); await refresh(true); }),
  playVoice: guard(async el => {
    const old = el.textContent; el.disabled = true; el.textContent = el.dataset.slow ? 'Generando (puede tardar 1-3 min)…' : 'Generando…';
    try { const r = await api('/api/voice/preview', { voice: el.dataset.v, rate: 0, pitch: 0 }); const a = new Audio(r.url); a.play(); }
    finally { el.disabled = false; el.textContent = old; }
  }),
  backup: guard(async () => { const r = await api('/api/backup', {}); alert('Respaldo guardado en:\n' + r.dest); }),
  sounds: guard(async () => { await api('/api/sounds/download', {}); toast('Descargando biblioteca de sonidos…'); await refresh(true); }),
  disc: guard(async el => { await api('/api/publish/disconnect', { kind: el.dataset.kind, channelId: edit.id }); await refresh(); edit = JSON.parse(JSON.stringify(S.channels.find(c => c.id === edit.id))); drawChannel(); }),
  createJobs: guard(async () => { const ch = $('#cj-ch').value; store.set('lastCh', ch); const r = await api('/api/jobs', { channelId: ch, topics: $('#cj-topics').value, count: $('#cj-n').value, publishDate: $('#cj-date').value }); toast(`${r.n} video(s) en la cola`); filter = 'cola'; store.set('filter', filter); tab = 'videos'; store.set('tab', tab); await refresh(true); }),
  igCheck: guard(async el => { readChannel(); await api('/api/channel', edit); const r = await api('/api/instagram/check', { channelId: el.dataset.id }); toast('Instagram conectado: @' + r.username); await refresh(); edit = JSON.parse(JSON.stringify(S.channels.find(c => c.id === edit.id))); drawChannel(); }),
  bskyOn: guard(async el => { readChannel(); await api('/api/channel', edit); await api('/api/bluesky', { channelId: el.dataset.id, handle: $('#e-bsky-h').value, pass: $('#e-bsky-p').value }); toast('Bluesky conectado ✓'); await refresh(); edit = JSON.parse(JSON.stringify(S.channels.find(c => c.id === edit.id))); drawChannel(); }),
  redOn: guard(async el => { readChannel(); await api('/api/channel', edit); const red = el.dataset.red; await api('/api/red', red === 'mastodon' ? { red, channelId: el.dataset.id, server: $('#e-mast-s').value, token: $('#e-mast-t').value } : { red, channelId: el.dataset.id, url: $('#e-disc-u').value }); toast((red === 'mastodon' ? 'Mastodon' : 'Discord') + ' conectado ✓'); await refresh(); edit = JSON.parse(JSON.stringify(S.channels.find(c => c.id === edit.id))); drawChannel(); }),
  redOff: guard(async el => { await api('/api/red', { red: el.dataset.red, channelId: el.dataset.id, borrar: true }); await refresh(); drawChannel(); }),
  bskyOff: guard(async el => { await api('/api/bluesky', { channelId: el.dataset.id, handle: '' }); await refresh(); drawChannel(); }),
  adjDel: el => { chatAdj.splice(+el.dataset.i, 1); $('#adjBox').innerHTML = adjPend(); },
  vfArte: guard(async () => { VS = await api('/api/viral/arte-glory', {}); toast('🎨 Creando las ilustraciones de GLORY BROWN…'); render(); }),
  vfVoces: guard(async () => { VS = await api('/api/viral/voces-glory', {}); toast('🎙️ Grabando las voces de GLORY BROWN…'); render(); }),
  vfOn: guard(async () => { VS = await api('/api/viral/encender', {}); toast('Encendiendo la página…'); render(); }),
  vfOff: guard(async () => { if (!confirm('¿Apagar la página viral? Nadie podrá entrar mientras esté apagada.')) return; VS = await api('/api/viral/apagar', {}); render(); }),
  vfLink: el => { const u = VS.url + '/?' + (el.dataset.g ? 'g=' + el.dataset.g + '&' : '') + 'src=' + encodeURIComponent(($('#vf-src')?.value || 'fb').trim().replace(/\s+/g, '-').slice(0, 40)); navigator.clipboard.writeText(u).then(() => toast('Enlace copiado: ' + u)); },
  vfCopy: el => navigator.clipboard.writeText(el.dataset.u).then(() => toast('Dirección copiada')),
  vfSave: guard(async () => { const o = { url: $('#vf-url').value, email: $('#vf-mail').value }; if ($('#vf-tok').value.trim()) o.tokenTunel = $('#vf-tok').value; VS = await api('/api/viral/config', o); toast('Guardado ✓'); render(); }),
  vfTemp: guard(async () => { if (!confirm('¿Quitar la dirección fija y usar una temporal?')) return; VS = await api('/api/viral/config', { tokenTunel: '', url: '' }); render(); }),
  radarScan: guard(async el => { el.disabled = true; el.textContent = '📡 Buscando… (1 o 2 minutos)'; try { await api('/api/radar', { channelId: el.dataset.id }); toast('Radar actualizado'); } finally { await refresh(true); } }),
  radarJob: guard(async el => { await api('/api/jobs', { channelId: el.dataset.id, topics: el.dataset.t }); toast('Video agregado a la cola ✓'); await refresh(true); }),
  kit: guard(async el => {
    const j = S.jobs.find(x => x.id === el.dataset.id), box = $('#modalBox'); $('#modal').hidden = false;
    box.innerHTML = '<h2>📣 Kit para compartir en grupos</h2><p>Preparando textos…</p>';
    const k = await api('/api/kit', { id: j.id }), url = j.pub.facebook.url;
    box.innerHTML = `<h2>📣 Kit para compartir en grupos</h2>
      <p class="hint">Compártelo <b>tú</b>, en grupos donde ya participas y que aceptan este tipo de contenido. Usa un texto distinto en cada grupo y no más de 3 a 5 grupos al día.</p>
      ${k.textos.map((t, i) => copyBox('Texto ' + (i + 1), t + '\n\n' + url)).join('')}
      <p><b>Grupos que puedes buscar en Facebook:</b><br>${k.grupos.map(g => `<a href="https://www.facebook.com/search/groups/?q=${encodeURIComponent(g)}" target="_blank">${esc(g)}</a>`).join(' · ')}</p>
      <ul class="hint">${k.consejos.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      <div class="btns"><a class="b" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" style="text-decoration:none">Abrir Facebook para compartir</a><button class="b ghost" data-act="closeModal">Cerrar</button></div>`;
  }),
  pub: guard(async el => {
    const id = el.dataset.id, ps = el.dataset.p.split(','), j = S.jobs.find(x => x.id === id), c = S.channels.find(x => x.id === j?.channelId) || {};
    if (ps.includes('tiktok')) {
      const tt = j.seo?.tiktok || {};
      try { await navigator.clipboard.writeText((tt.caption || '') + '\n\n' + tagLine(tt.hashtags)); } catch (e) {}
      const a = document.createElement('a'); a.href = `/files/videos/${j.result.dir}/${j.result.files.social}`; a.download = fname(j, 'tiktok'); document.body.appendChild(a); a.click(); a.remove();
      window.open('https://www.tiktok.com/upload', '_blank');
      if (!confirm('TikTok no deja publicar automático sin su aprobación, así que:\n1) Ya se descargó el video.\n2) El texto con hashtags ya está copiado (pégalo con Ctrl+V).\n3) Se abrió TikTok para subirlo.\n\n¿Lo marco como subido a TikTok?' + (ps.length > 1 ? '\n(Las otras redes se publican igual.)' : ''))) { if (ps.length === 1) return; ps.splice(ps.indexOf('tiktok'), 1); }
    }
    if (!ps.length) return;
    el.disabled = true; el.textContent = '⏳ Publicando…';
    try { const r = await api('/api/job/action', { id, action: 'publicar', plats: ps }); if (r.fallo.length) alert('Publicado: ' + (r.hecho.join(', ') || 'nada') + '\n\nNo se pudo:\n' + r.fallo.join('\n')); else toast('✓ ' + r.hecho.join(', ')); }
    finally { await refresh(true); }
  }),
  seoTodos: guard(async () => { if (!confirm('¿Mejorar el SEO de todos los videos que aún no tienen puntaje? Los que ya están en YouTube se actualizan allí. Tarda unos segundos por video.')) return; const r = await api('/api/seo/todos', {}); toast(`Mejorando ${r.total} videos en segundo plano`); await refresh(true); }),
  job: guard(async el => {
    const a = el.dataset.a;
    if (a === 'delete' && !confirm('¿Eliminar este video y sus archivos?')) return;
    if (a === 'seo') { el.disabled = true; el.textContent = '🔎 Buscando lo que la gente escribe…'; try { const r = await api('/api/job/action', { id: el.dataset.id, action: 'seo' }); toast(`SEO mejorado: ${r.nota}/100${r.youtube ? ' · actualizado en YouTube' : ''}`); } finally { await refresh(true); } return; }
    await api('/api/job/action', { id: el.dataset.id, action: a === 'redoNew' ? 'redo' : a, newTopic: a === 'redoNew' });
    toast({ approve: 'Aprobado. Ahora prográmalo.', scheduled: 'Marcado como programado', published: '¡Publicado!', redo: 'Rehaciendo…', redoNew: 'Rehaciendo con otro tema…', delete: 'Eliminado' }[a]);
    await refresh(true);
  }),
  copy: el => { const box = el.parentElement, txt = [...box.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(''); navigator.clipboard.writeText(txt).then(() => { el.textContent = '¡Listo!'; setTimeout(() => el.textContent = 'Copiar', 1200); }, () => alert('No se pudo copiar')); },
  quick: el => { $('#chatIn').value = el.dataset.q + (el.dataset.q.endsWith(':') ? '\n' : ''); $('#chatIn').focus(); },
  clearChat: () => { chatMsgs = []; store.set('chat', chatMsgs); render(); },
  send: guard(async () => {
    let t = $('#chatIn').value.trim(); if (chatBusy) return;
    if (chatAdj.some(a => a.subiendo)) return toast('Espera a que terminen de subir los archivos');
    if (!t && !chatAdj.length) return;
    const adj = chatAdj.map(({ subiendo, ...a }) => a); chatAdj = [];
    if (!t) t = adj.some(a => a.tipo !== 'texto') ? 'Analiza esto y dime qué ves y cómo lo puedo aprovechar para mis canales.' : 'Analiza este archivo.';
    chatMsgs.push({ role: 'user', content: t, ...(adj.length ? { adj } : {}) }); chatBusy = true; render();
    const m = { role: 'assistant', content: '' };
    const t0 = Date.now(), tick = setInterval(() => { const el = $('#thinking'); if (el) el.textContent = `Pensando… ${Math.round((Date.now() - t0) / 1000)} s`; }, 1000);
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'x-sf': '1', 'content-type': 'application/json' }, body: JSON.stringify({ messages: chatMsgs }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Error ' + r.status);
      chatMsgs.push(m); render();
      const rd = r.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        m.content += dec.decode(value, { stream: true });
        const el = document.querySelector('.msg.live');
        if (el) { el.innerHTML = md(m.content); const box = $('.msgs'); box.scrollTop = box.scrollHeight; } else if (tab === 'chat') render();
      }
    } catch (e) { if (!chatMsgs.includes(m)) chatMsgs.push(m); m.content += '⚠ ' + e.message; }
    finally { clearInterval(tick); chatBusy = false; store.set('chat', chatMsgs.slice(-60)); if (tab === 'chat') render(); }
  }),
  saveKeys: guard(async () => { const o = {}; document.querySelectorAll('[data-key]').forEach(i => { if (i.value.trim()) o[i.dataset.key] = i.value.trim(); }); if (!Object.keys(o).length) return toast('No pegaste ninguna clave nueva'); await api('/api/keys', o); toast('Claves guardadas'); await refresh(true); }),
  mv: guard(async el => { const e = [...S.settings.engines], i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= e.length) return; [e[i], e[j]] = [e[j], e[i]]; await api('/api/settings', { engines: e }); await refresh(true); }),
  testEng: guard(async el => { const p = el.dataset.p, out = $('#test-' + p); out.textContent = 'Probando…'; const r = await api('/api/engine/test', { provider: p }); out.textContent = (r.ok ? '✓ ' : '✗ ') + r.msg; out.style.color = r.ok ? 'var(--brand)' : 'var(--bad)'; }),
  loadModels: guard(async el => { const p = el.dataset.p, sel = document.querySelector(`[data-model="${p}"]`), r = await api('/api/engine/models', { provider: p }); const cur = S.settings.models[p] || ''; sel.innerHTML = `<option value="">Automático (${esc(r.auto)})</option>` + r.models.map(m => `<option ${m === cur ? 'selected' : ''}>${esc(m)}</option>`).join(''); toast(r.models.length + ' modelos disponibles'); }),
  saveModels: guard(async () => { const m = {}; document.querySelectorAll('[data-model]').forEach(s => { if (s.value) m[s.dataset.model] = s.value; }); await api('/api/settings', { models: m }); toast('Guardado'); await refresh(true); }),
  saveSettings: guard(async () => { await api('/api/settings', { agenda: $('#set-agenda').checked, autoVolume: $('#set-autovol').checked, videosPerDay: $('#set-vpd').value, nightly: { enabled: $('#set-night').checked, time: $('#set-time').value }, factCheck: $('#set-fc').checked, karaoke: $('#set-kar').checked, whisperModel: $('#set-wm').value, continuous: $('#set-cont').checked, bufferDays: $('#set-buf').value, ytDailyMax: $('#set-ytmax').value, review: $('#set-rev').checked, critic: $('#set-critic').checked, waitAiImages: $('#set-waitimg').checked, seoPro: $('#set-seopro').checked, cloneSlow: $('#set-cloneslow').checked, naturalVoice: $('#set-natural').checked, reserveGemini: $('#set-reserve').checked, autoClean: $('#set-clean')?.checked, checkImages: $('#set-cimg').checked, minNota: $('#set-minnota').value }); toast('Ajustes guardados'); await refresh(true); }),
};

Object.assign(ACT, {
  clearManual: () => { if (confirm('¿Borrar todo lo aprendido de este canal?')) { edit.manual = []; readChannel(); edit.manual = []; drawChannel(); toast('Se borrará al guardar el canal'); } },
  cmFilter: el => { cmFilter = el.dataset.f; render(); },
  cmCheck: guard(async () => { await api('/api/comments/check', {}); toast('Buscando comentarios… tarda un momento'); setTimeout(() => loadComments(true), 8000); }),
  cmSend: guard(async el => { const id = el.dataset.id; el.disabled = true; await api('/api/comments/action', { id, act: 'send', text: document.getElementById('cm-' + id).value }); toast('Respuesta publicada ✓'); await loadComments(true); }),
  cmRedo: guard(async el => { el.disabled = true; await api('/api/comments/action', { id: el.dataset.id, act: 'redo' }); await loadComments(true); }),
  cmIgnore: guard(async el => { await api('/api/comments/action', { id: el.dataset.id, act: 'ignore' }); await loadComments(true); }),
  cmIdeaNo: guard(async el => { await api('/api/comments/action', { id: el.dataset.id, act: 'idea_done' }); await loadComments(true); }),
  cmIdea: guard(async el => { const x = CM.items.find(i => i.id === el.dataset.id); await api('/api/jobs', { channelId: x.chId, topics: x.idea }); await api('/api/comments/action', { id: x.id, act: 'idea_done' }); toast('Video agregado a la cola ✓'); await loadComments(true); }),
});

Object.assign(ACT, {
  actBuscar: guard(async el => { el.disabled = true; try { const r = await api('/api/actualizar/buscar', {}); toast(r.nueva ? '¡Hay una mejora nueva: v' + r.nueva + '!' : r.error || 'Ya tienes la última versión ✓'); await refresh(true); } finally { el.disabled = false; } }),
  actInstalar: guard(async el => { if (!confirm('¿Instalar la mejora? ShortForge se reiniciará solo en unos segundos.')) return; el.disabled = true; el.textContent = 'Instalando…'; const r = await api('/api/actualizar/instalar', {}); toast('Mejora v' + r.version + ' instalada. Reiniciando…'); setTimeout(() => location.reload(), 9000); }),
  reporte: guard(async () => { const r = await api('/api/reporte', {}); const a = document.createElement('a'); a.href = r.url; a.download = r.name; a.click(); $('#mant-out').textContent = '✓ Reporte descargado (' + r.name + '). Mándamelo: no tiene ninguna clave.'; }),
  revMotores: guard(async el => { el.disabled = true; $('#mant-out').textContent = 'Probando todos los motores… (1 a 2 minutos)'; try { const r = await api('/api/motores/revisar', {}); const e = Object.entries(r.engines); $('#mant-out').innerHTML = e.map(([p, x]) => `${x.ok ? '✅' : '❌'} ${esc(S.providers[p]?.label || p)}: ${esc(x.msg)}`).join('<br>'); await refresh(); } finally { el.disabled = false; } }),
  limpiar: guard(async () => { const r = await api('/api/limpiar', {}); $('#mant-out').textContent = `✓ Limpieza lista: ${r.liberadoMB} MB liberados${r.videosBorrados ? `, ${r.videosBorrados} videos publicados hace más de 30 días` : ''}.`; await refresh(true); }),
});
Object.assign(ACT, {
  playPreset: guard(async el => {
    const old = el.textContent; el.disabled = true; el.textContent = 'Generando…';
    try { const r = await api('/api/voice/preview', { preset: el.dataset.p, text: el.dataset.t }); new Audio(r.url).play(); }
    finally { el.disabled = false; el.textContent = old; }
  }),
});
Object.assign(ACT, {
  brainRun: guard(async el => { await api('/api/brain/run', { channelId: el.dataset.id || '' }); toast('El Cerebro está analizando… vuelve en unos minutos'); setTimeout(() => loadBrain(true), 6000); }),
  brainReload: guard(async () => { await loadBrain(true); }),
  communityNew: guard(async el => { el.disabled = true; toast('Creando publicación…'); await api('/api/community/new', { channelId: el.dataset.id }); await refresh(true); await loadBrain(true); }),
  tgDetect: guard(async () => { const r = await api('/api/telegram/detect', {}); toast('Telegram conectado: ' + r.name); await refresh(true); }),
  tgTest: guard(async () => { await api('/api/telegram/test', {}); toast('Mensaje de prueba enviado'); }),
});

Object.assign(ACT, {
  dsCrear: guard(async el => { const id = el.dataset.id; el.disabled = true; const r = await api('/api/desarmar/crear', { id, channelId: $('#dsc-' + id).value, modo: $('#dsm-' + id).value, count: $('#dsn-' + id).value, notas: $('#dsi-' + id).value }); toast(`${r.n} video(s) en la cola ✓ (míralos en Videos)`); el.disabled = false; await refresh(true); }),
  dsRetry: guard(async el => { await api('/api/desarmar/reintentar', { id: el.dataset.id }); toast('Reintentando…'); await loadDS(true); }),
  dsBorrar: guard(async el => { if (!confirm('¿Eliminar este análisis?')) return; await api('/api/desarmar/borrar', { id: el.dataset.id }); await loadDS(true); }),
  rpPlay: guard(async el => { readChannel(); const r = edit.reparto[+el.dataset.i]; const old = el.textContent; el.textContent = '…'; try { const x = await api('/api/voice/preview', { preset: r.preset, voice: r.voice, who: r.nombre, text: `¡Hola! Soy ${r.nombre}. ¿Te gusta cómo sueno?` }); new Audio(x.url).play(); } finally { el.textContent = old; } }),
  rpDel: el => { readChannel(); edit.reparto.splice(+el.dataset.i, 1); drawChannel(); },
});

Object.assign(ACT, {
  vzPlay: guard(async el => {
    const sel = document.querySelector(`[data-vz="${el.dataset.job}"][data-vn="${CSS.escape(el.dataset.vn)}"]`);
    const old = el.textContent; el.disabled = true; el.textContent = 'Generando…';
    try { const x = await api('/api/voice/preview', { ...(sel.value.startsWith('clon:') ? { voice: sel.value } : { preset: sel.value }), who: el.dataset.vn, text: `¡Hola! Soy ${el.dataset.vn}. ¿Te gusta cómo sueno en este video?` }); new Audio(x.url).play(); }
    finally { el.disabled = false; el.textContent = old; }
  }),
  vzApply: guard(async el => {
    const voces = {}; document.querySelectorAll(`[data-vz="${el.dataset.id}"]`).forEach(s => voces[s.dataset.vn] = s.value);
    el.disabled = true; await api('/api/job/action', { id: el.dataset.id, action: 'revoice', voces });
    toast('Rehaciendo con las voces elegidas… (mismo guion e imágenes)'); await refresh(true);
  }),
});

// Propuesta de clonar las voces detectadas en un video reeditado (tú autorizas).
const vozPropuesta = j => j.vozPregunta !== 'pendiente' || !(j.vozGrupos || []).length ? '' : `<div class="card" style="margin:10px 0 0;padding:12px;border:2px solid var(--brand,#15803d)"><b>🎤 ¿Quieres clonar estas voces?</b> <span class="hint">Encontré ${j.vozGrupos.length} voz(ces) en «${esc(j.title || '')}». Marca las que quieras sumar a Mis voces.</span>
  ${j.vozGrupos.map(g => `<div class="row" style="align-items:center;margin-top:6px"><label style="font-weight:400"><input type="checkbox" data-pg="${j.id}" data-gid="${g.id}" ${g.parecidaA.length ? '' : 'checked'}> Voz ${esc(g.tipo)} (${g.gender === 'F' ? 'mujer/aguda' : 'hombre/grave'}, ${g.dur} s)${g.parecidaA.length ? ` <span class="chip st-error">parecida a: ${g.parecidaA.map(esc).join(', ')}</span>` : ''}</label>
   <input data-pgn="${j.id}-${g.id}" placeholder="Nombre (ej: Ajo, Limón)" style="max-width:220px"><button class="b ghost sm" data-act="pgPlay" data-job="${j.id}" data-gid="${g.id}">▶ Escuchar</button></div>`).join('')}
  <label style="font-weight:400;margin-top:6px"><input type="checkbox" id="pgok-${j.id}"><small>Confirmo que son voces mías, con permiso o sintéticas que mi plan me deja usar (no imitaciones de famosos).</small></label>
  <div class="btns"><button class="b sm" data-act="pgYes" data-job="${j.id}">Sí, clonar las marcadas</button><button class="b ghost sm" data-act="pgNo" data-job="${j.id}">No, gracias</button></div></div>`;
Object.assign(ACT, {
  vzBuscar: guard(async el => { el.disabled = true; el.textContent = 'Escuchando el video… (1-2 min)'; try { const r = await api('/api/voices/buscar', { jobId: el.dataset.id }); toast(`Encontré ${r.n} voz(ces): decide arriba si las clonas`); await refresh(true); } finally { el.disabled = false; el.textContent = '🔎 Buscar voces para clonar'; } }),
  pjPlay: guard(async el => {
    const sel = document.querySelector(`[data-pj="${el.dataset.job}"][data-vn="${CSS.escape(el.dataset.vn)}"]`);
    const old = el.textContent; el.disabled = true; el.textContent = 'Generando…';
    try { const x = await api('/api/voice/preview', { ...(sel.value.startsWith('clon:') ? { voice: sel.value } : { preset: sel.value }), who: el.dataset.vn, text: `¡Hola! Soy ${el.dataset.vn}. ¿Te gusta cómo sueno?` }); new Audio(x.url).play(); }
    finally { el.disabled = false; el.textContent = old; }
  }),
  pjDub: guard(async el => {
    const voces = {}; document.querySelectorAll(`[data-pj="${el.dataset.id}"]`).forEach(s => voces[s.dataset.vn] = s.value);
    el.disabled = true; await api('/api/job/action', { id: el.dataset.id, action: 'dubWith', voces });
    toast('Dando voz a los personajes… (mismo video, voces nuevas)'); await refresh(true);
  }),
  pgPlay: guard(async el => { const x = await api('/api/voices/propuesta/muestra', { jobId: el.dataset.job, gid: el.dataset.gid }); new Audio(x.url).play(); }),
  pgNo: guard(async el => { await api('/api/voices/propuesta', { jobId: el.dataset.job, no: true }); await refresh(true); }),
  pgYes: guard(async el => {
    const id = el.dataset.job, grupos = [...document.querySelectorAll(`[data-pg="${id}"]:checked`)].map(c => ({ id: +c.dataset.gid, name: (document.querySelector(`[data-pgn="${id}-${c.dataset.gid}"]`) || {}).value || '' }));
    if (!grupos.length) return toast('Marca al menos una voz');
    el.disabled = true; el.textContent = 'Clonando…';
    try { const r = await api('/api/voices/propuesta', { jobId: id, grupos, consent: $('#pgok-' + id).checked }); toast(`${r.n} voz(ces) guardadas en Voces → Mis voces ✓`); await refresh(true); }
    finally { el.disabled = false; el.textContent = 'Sí, clonar las marcadas'; }
  }),
});

// Opciones de sonido de fondo (se usan antes y después de reeditar).
function fondoOpciones(id, f, conOriginal) {
  const grupos = {}; (FD?.items || []).forEach(x => (grupos[x.grupo] = grupos[x.grupo] || []).push(x));
  const vol = f.modo === 'ajustar' ? Math.round((f.vol || 1) * 100) : Math.round((f.vol || 0.32) * 100);
  return `<div style="display:flex;flex-wrap:wrap;gap:14px;margin:8px 0">
      <label style="font-weight:400"><input type="radio" name="fm-${id}" value="original" ${!f.modo || f.modo === 'original' ? 'checked' : ''}> Mantener como está</label>
      ${conOriginal ? `<label style="font-weight:400"><input type="radio" name="fm-${id}" value="ajustar" ${f.modo === 'ajustar' ? 'checked' : ''}> Mantener el fondo original con otro volumen</label>` : ''}
      <label style="font-weight:400"><input type="radio" name="fm-${id}" value="quitar" ${f.modo === 'quitar' ? 'checked' : ''}> Quitar el fondo (solo voces)</label>
      <label style="font-weight:400"><input type="radio" name="fm-${id}" value="cambiar" ${f.modo === 'cambiar' ? 'checked' : ''}> Cambiar por otro</label></div>
    <div class="row" style="align-items:end">${FD?.items?.length ? `<label>Fondo nuevo (si eliges cambiar)<select id="fs-${id}">${Object.entries(grupos).map(([g, xs]) => `<optgroup label="${esc(g)}">${xs.map(x => `<option value="${x.id}" data-url="${esc(x.url)}">${esc(x.nombre)}</option>`).join('')}</optgroup>`).join('')}</select></label><div class="btns" style="margin:0"><button class="b ghost sm" data-act="fPlay" data-id="${id}">▶ Escuchar</button></div>` : '<p class="hint">Sin música en tu biblioteca: Ajustes → Biblioteca de sonidos → Descargar.</p>'}
      <label>Volumen del fondo <small id="fvv-${id}">${vol}%</small><input type="range" id="fv-${id}" min="0" max="200" value="${vol}" oninput="document.getElementById('fvv-${id}').textContent=this.value+'%'"><small class="hint">Original: 100% = igual que ahora; más = más fuerte. Música nueva: 30% es lo normal.</small></label></div>`;
}
const fondoLeer = id => { const modo = document.querySelector(`input[name="fm-${id}"]:checked`)?.value || 'original', v = (+$('#fv-' + id)?.value || 0) / 100; return { modo, id: $('#fs-' + id)?.value, vol: modo === 'ajustar' ? v : Math.min(0.7, Math.max(0.05, v)) }; };
// Antes de reeditar: fotos de los personajes, su lista de voces y el sonido de fondo.
function eligeBox(j) {
  if (!FD) { loadFondos().catch(() => {}); }
  const p = j.pre;
  return `<div class="card" style="margin:10px 0 0;padding:12px;border:2px solid var(--brand,#15803d)"><b>🎭 ¿Qué voz le pones a cada ${p.nuevo ? 'uno que habla' : 'personaje'}?</b> <span class="hint">Elige y luego pulsa "${p.nuevo ? 'Crear el video' : 'Reeditar con esto'}". ${esc(p.descripcion || '')} Si no eliges en 12 horas, sigue solo con las sugeridas.</span>
    ${p.nuevo ? '' : p.teniaVoces ? `<label style="font-weight:400;margin-top:6px"><input type="checkbox" id="eo-${j.id}"> Mantener las voces originales del video (no cambiar nada de las voces)</label>` : '<p class="hint">Este video no tiene voces: la IA les escribirá sus diálogos con las voces que elijas.</p>'}
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px">${p.personajes.map(c => `<div style="width:170px;background:var(--soft,#f5f5f4);border-radius:12px;padding:8px">
      ${c.img ? `<img src="${esc(c.img)}" style="width:100%;height:150px;object-fit:cover;border-radius:8px;background:#ddd" onerror="this.style.visibility='hidden'">` : `<div style="width:100%;height:150px;border-radius:8px;background:#e7e5e4;display:grid;place-items:center;font-size:48px">${c.nombre === 'Narrador' ? '🎙️' : '🎭'}</div>`}
      <b style="display:block;margin:6px 0 2px">${esc(c.nombre)}</b><small class="hint" style="display:block;min-height:30px">${esc(c.descripcion)}</small>
      <select data-pre="${j.id}" data-vn="${esc(c.nombre)}" style="width:100%">${presetOptions(c.sugerida, false, true).replace('<option value="" ', '<option value="hombre" ')}</select>
      <button class="b ghost sm" style="margin-top:6px;width:100%" data-act="preePlay" data-job="${j.id}" data-vn="${esc(c.nombre)}">▶ Escuchar</button></div>`).join('')}</div>
    <details style="margin-top:8px"><summary><b>🎵 Sonido de fondo</b> <span class="hint">(opcional)</span></summary>${fondoOpciones(j.id, {}, p.audio)}</details>
    <p class="hint" id="pe-${j.id}" style="color:var(--bad);font-weight:600"></p>
    <div class="btns"><button class="b big" data-act="preGo" data-id="${j.id}">✅ ${p.nuevo ? 'Crear el video con estas voces' : 'Reeditar con esto'}</button><button class="b ghost sm" data-act="preSkip" data-id="${j.id}">${p.nuevo ? 'Seguir con las sugeridas' : 'Saltar (reeditar sin cambiar voces)'}</button></div></div>`;
}
Object.assign(ACT, {
  preePlay: guard(async el => {
    const sel = document.querySelector(`[data-pre="${el.dataset.job}"][data-vn="${CSS.escape(el.dataset.vn)}"]`);
    const old = el.textContent; el.disabled = true; el.textContent = 'Generando…';
    try { const x = await api('/api/voice/preview', { ...(sel.value.startsWith('clon:') ? { voice: sel.value } : { preset: sel.value }), who: el.dataset.vn, text: `¡Hola! Soy ${el.dataset.vn}. ¿Te gusta cómo sueno?` }); new Audio(x.url).play(); }
    finally { el.disabled = false; el.textContent = old; }
  }),
  preGo: async el => {
    const id = el.dataset.id, voces = {}, out = $('#pe-' + id); document.querySelectorAll(`[data-pre="${id}"]`).forEach(s => voces[s.dataset.vn] = s.value);
    const old = el.textContent; el.disabled = true; el.textContent = 'Enviando…'; if (fAudio) fAudio.pause(); if (out) out.textContent = '';
    try { await api('/api/job/action', { id, action: 'elegido', voces, original: !!$('#eo-' + id)?.checked, fondo: fondoLeer(id) }); toast('¡Listo! Reeditando con tus voces…'); await refresh(true); }
    catch (e) { if (out) out.textContent = '⚠ ' + e.message; toast(e.message); }
    finally { el.disabled = false; el.textContent = old; }
  },
  preSkip: guard(async el => { await api('/api/job/action', { id: el.dataset.id, action: 'saltarVoces' }); toast('Sigo con las voces sugeridas'); await refresh(true); }),
});

// ---------- Sonido de fondo de cada video ----------
let FD = null;
async function loadFondos() { FD = await api('/api/fondos'); if (tab === 'videos') render(); }
const FONDO_TXT = { 'original ajustado': 'el fondo original con tu volumen', original: 'el audio original del video', música: 'música de la biblioteca', cambiado: 'el fondo que elegiste', quitado: 'sin fondo (solo voces)', ninguno: 'sin sonido de fondo' };
function fondoBox(j) {
  if (!FD) { loadFondos().catch(() => {}); return ''; }
  const r = j.result, f = j.fondo || {}, grupos = {};
  FD.items.forEach(x => (grupos[x.grupo] = grupos[x.grupo] || []).push(x));
  const cur = r.fondo || 'música';
  return `<details class="voces" style="margin-top:8px" ${j.kind === 'reedit' && j.status === 'revisar' && cur === 'original' && r.teniaVoces ? 'open' : ''}><summary><b>🎵 Sonido de fondo</b> <span class="hint">(ahora: ${esc(FONDO_TXT[cur] || cur)}) — ¿lo quitas o lo cambias?</span></summary>
    ${fondoOpciones(j.id, f, j.kind === 'reedit' && /original/.test(cur))}
    ${j.kind === 'reedit' && cur === 'original' && !FD.demucs ? '<p class="hint" style="color:var(--bad)">Para quitar el fondo de tu audio original falta <b>Demucs</b>: ejecuta instalar_ia_local.bat otra vez.</p>' : ''}
    <div class="btns"><button class="b sm" data-act="fApply" data-id="${j.id}">🎵 Aplicar fondo</button><span class="hint" style="align-self:center">Mismo video y mismas voces; solo cambia el fondo.</span></div></details>`;
}
let fAudio = null;
Object.assign(ACT, {
  fPlay: el => { const sel = $('#fs-' + el.dataset.id), url = sel?.selectedOptions[0]?.dataset.url; if (!url) return; if (fAudio) fAudio.pause(); fAudio = new Audio(url); fAudio.volume = Math.min(1, (+$('#fv-' + el.dataset.id)?.value || 30) / 60); fAudio.play(); setTimeout(() => fAudio && fAudio.pause(), 15000); },
  fApply: guard(async el => {
    const id = el.dataset.id, modo = fondoLeer(id).modo;
    if (fAudio) fAudio.pause();
    el.disabled = true;
    const fl = fondoLeer(id);
    await api('/api/job/action', { id, action: 'refondo', modo: fl.modo, fondo: fl.id, vol: fl.vol });
    toast(modo === 'quitar' ? 'Quitando el fondo… (separa la voz de la música)' : modo === 'cambiar' ? 'Cambiando el fondo…' : 'Rehaciendo con el fondo original…'); await refresh(true);
  }),
});

// ---------- Clonar voz desde un video reeditado ----------
async function openCloneModal(jobId) {
  const box = $('#modalBox'); $('#modal').hidden = false;
  box.innerHTML = '<h2>🎤 Clonar voz de este video</h2><p>Escuchando el video para encontrar las frases… (puede tardar 1 o 2 minutos)</p>';
  let fr;
  try { fr = (await api('/api/voices/fromvideo/frases', { jobId })).frases; }
  catch (e) { box.innerHTML = `<h2>🎤 Clonar voz</h2><p style="color:var(--bad)">${esc(e.message)}</p><div class="btns"><button class="b ghost" data-act="closeModal">Cerrar</button></div>`; return; }
  box.innerHTML = `<h2>🎤 Clonar voz de este video</h2>
   <p class="hint">Marca las frases de <b>UNA sola persona</b> (escúchalas con ▶). Junta de <b>15 a 30 segundos</b>. Si hablan varias, clona cada voz por separado. Funciona mejor con frases sin música fuerte de fondo.</p>
   <div style="max-height:320px;overflow:auto;border:1px solid var(--line,#e5e5e5);border-radius:10px;padding:6px">${fr.map((f, i) => `<label style="display:flex;gap:8px;align-items:center;padding:4px 2px;font-weight:400"><input type="checkbox" data-vf="${i}" data-d="${(f.fin - f.inicio).toFixed(2)}"><button class="b ghost sm" data-act="vfPlay" data-job="${jobId}" data-i="${i}">▶</button><span class="hint" style="min-width:70px">${f.inicio.toFixed(1)}–${f.fin.toFixed(1)} s</span><span>${esc(f.texto)}</span></label>`).join('')}</div>
   <p><b id="vf-total">0 s</b> elegidos (mínimo 10, ideal 15–30)</p>
   <div class="row"><label>Nombre de la voz<input id="vf-name" placeholder="Ej: Narrador de mis videos"></label><label>¿De quién es?<input id="vf-owner" placeholder="Ej: José (yo) / voz IA de mi plan"></label><label>Género<select id="vf-g"><option value="M">Hombre</option><option value="F">Mujer</option></select></label></div>
   <label style="font-weight:600"><input type="checkbox" id="vf-consent">Confirmo que es mi voz, la de alguien que me dio permiso, o una voz sintética que mi plan me permite usar. No es una imitación de una persona o personaje famoso.</label>
   <div class="btns"><button class="b" data-act="vfSave" data-job="${jobId}">Guardar en Mis voces</button><button class="b ghost" data-act="closeModal">Cancelar</button></div>`;
}
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.vf !== undefined) { const t = [...document.querySelectorAll('[data-vf]:checked')].reduce((a, x) => a + +x.dataset.d, 0); const el = $('#vf-total'); if (el) el.textContent = t.toFixed(0) + ' s'; } });
Object.assign(ACT, {
  renVoice: guard(async el => { const n = prompt('Nuevo nombre de la voz (ej: Ajo, Limón, Narrador):', el.dataset.n); if (!n) return; await api('/api/voices/rename', { id: el.dataset.id, name: n }); toast('Nombre cambiado'); await refresh(true); }),
  cloneFromVideo: el => openCloneModal(el.dataset.id),
  vfPlay: guard(async el => { const x = await api('/api/voices/fromvideo/clip', { jobId: el.dataset.job, i: el.dataset.i }); new Audio(x.url).play(); }),
  vfSave: guard(async el => {
    const frases = [...document.querySelectorAll('[data-vf]:checked')].map(x => +x.dataset.vf);
    el.disabled = true;
    try { const r = await api('/api/voices/fromvideo/save', { jobId: el.dataset.job, frases, name: $('#vf-name').value, owner: $('#vf-owner').value, gender: $('#vf-g').value, consent: $('#vf-consent').checked }); $('#modal').hidden = true; toast(`Voz guardada en Voces → Mis voces (${r.seconds} s) ✓`); await refresh(true); }
    finally { el.disabled = false; }
  }),
});

document.addEventListener('click', e => {
  const n = e.target.closest('nav button'); if (n) { tab = n.dataset.tab; store.set('tab', tab); render(); return; }
  const ha = e.target.closest('[data-act-hora]'); if (ha) { e.preventDefault(); api('/api/job/action', { id: ha.dataset.id, action: 'hora', hora: '' }).then(() => { toast('Usará el horario del canal'); refresh(true); }); return; }
  const b = e.target.closest('[data-act]'); if (b && ACT[b.dataset.act]) { e.preventDefault(); ACT[b.dataset.act](b); }
  if (e.target.id === 'modal') { $('#modal').hidden = true; edit = null; }
});
document.addEventListener('change', guard(async e => {
  const t = e.target;
  if (t.dataset.actChange === 'reCh') { store.set('reCh', t.value); render(); return; }
  if (t.id === 're-files' && t.files.length) { await uploadVideos([...t.files]); return; }
  if (t.id === 'ds-files' && t.files.length) { await uploadDS([...t.files]); return; }
  if (t.id === 'chatFile' && t.files.length) { await subirAdj(t.files); t.value = ''; return; }
  if (t.id === 'vf-dest') { VS = await api('/api/viral/ajustes', { destacado: t.checked }); toast(t.checked ? 'Tu último video será el destacado' : 'Desactivado'); return; }
  if (t.dataset.actChange === 'radarCh') { store.set('radarCh', t.value); render(); return; }
  if (t.dataset.actChange === 'hora') { await api('/api/job/action', { id: t.dataset.id, action: 'hora', hora: t.value }); toast('Hora cambiada (hora Perú)'); await refresh(true); return; }
  if (t.dataset.actChange === 'canal') {
    const j = S.jobs.find(x => x.id === t.dataset.id), destino = t.options[t.selectedIndex].text;
    const pub = Object.values(j?.pub || {}).some(p => p.ok);
    if (!confirm(pub ? `Este video ya se publicó. ¿Hago una COPIA para "${destino}"? (el original se queda donde está)` : `¿Pasar este video al canal "${destino}"?\nOjo: el logo y la marca dentro del video son del canal anterior; si quieres los del nuevo, luego pulsa Rehacer.`)) { t.value = j.channelId; return; }
    const r = await api('/api/job/action', { id: t.dataset.id, action: 'canal', channelId: t.value });
    toast(r.copia ? 'Copia creada en ' + destino + ' (queda para Revisar)' : 'Video pasado a ' + destino); await refresh(true); return;
  }
  if (t.dataset.actChange === 'date') { await api('/api/job/action', { id: t.dataset.id, action: 'date', date: t.value }); toast('Fecha cambiada'); await refresh(true); }
  if (t.dataset.cup) { readChannel(); await api('/api/channel', edit); await uploadFile(t.files[0], { kind: t.dataset.cup, channel: edit.id, char: t.dataset.cid }); await refresh(); edit = JSON.parse(JSON.stringify(S.channels.find(c => c.id === edit.id))); drawChannel(); toast('Imagen subida'); }
}));
document.addEventListener('keydown', e => { if (e.target.id === 'chatIn' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ACT.send(); } });

refresh(true).catch(e => { $('#main').innerHTML = `<div class="card">No se pudo conectar con el servidor. ¿Está abierta la ventana de ShortForge? (${esc(e.message)})</div>`; });
setInterval(() => refresh().catch(() => {}), 3000);
