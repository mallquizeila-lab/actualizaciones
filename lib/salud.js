// Salud del sistema: espacio en disco, limpieza automática, claves por vencer y reporte para soporte.
// Nada de esto toca la calidad de los videos: solo cuida que el sistema siga funcionando.
const fs = require('fs'), path = require('path');
const { E, DATA, USERDATA, day } = require('./util');
const { db, saveAll } = require('./store');

// ---------- Disco ----------
function disco() {
  try { const s = fs.statfsSync(USERDATA); return { libreGB: +(s.bavail * s.bsize / 1e9).toFixed(1), totalGB: +(s.blocks * s.bsize / 1e9).toFixed(1) }; }
  catch (e) { return null; }
}
const tam = d => { let n = 0; try { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); n += f.isDirectory() ? tam(p) : fs.statSync(p).size; } } catch (e) {} return n; };

// ---------- Limpieza ----------
// Borra temporales viejos (más de 3 días) y, si está activado, los videos YA PUBLICADOS hace más de 30 días
// (el registro del video queda; solo se borra el archivo pesado). Nunca toca videos por revisar o programados.
function limpiar({ forzar = false } = {}) {
  const S = db.settings, hoy = day();
  if (!forzar && S.lastClean === hoy) return null;
  let libre = 0, borrados = 0;
  const cache = path.join(DATA, 'cache');
  try {
    for (const f of fs.readdirSync(cache)) {
      const p = path.join(cache, f), st = fs.statSync(p);
      if (Date.now() - st.mtimeMs > 3 * 86400000) { libre += st.isDirectory() ? tam(p) : st.size; fs.rmSync(p, { recursive: true, force: true }); }
    }
  } catch (e) {}
  if (S.autoClean !== false) {
    for (const j of db.jobs.filter(x => x.status === 'publicado' && x.result?.dir && !x.result.borrado)) {
      const when = Object.values(j.pub || {}).map(p => p.when || p.at).filter(Boolean).sort().pop();
      if (!when || Date.now() - new Date(when).getTime() < 30 * 86400000) continue;
      const d = path.join(DATA, 'videos', j.result.dir);
      libre += tam(d); fs.rmSync(d, { recursive: true, force: true });
      j.result.borrado = new Date().toISOString(); borrados++;
    }
    // Originales de videos reeditados ya publicados hace más de 30 días
    for (const j of db.jobs.filter(x => x.kind === 'reedit' && x.status === 'publicado' && x.result?.borrado && x.source && fs.existsSync(x.source))) {
      if (db.jobs.some(o => o !== j && o.source === j.source && o.status !== 'publicado')) continue;
      libre += fs.statSync(j.source).size; fs.rmSync(j.source, { force: true });
    }
  }
  S.lastClean = hoy; saveAll.settings(); if (borrados) saveAll.jobs();
  return { liberadoMB: Math.round(libre / 1e6), videosBorrados: borrados };
}

// ---------- Claves por vencer ----------
// Se recuerda cuándo se guardó cada clave; algunas vencen (GitHub según lo que elegiste, NVIDIA a los 6 meses).
const VENCE = { GITHUB_TOKEN: 90, NVIDIA_API_KEY: 180 };
function clavesPorVencer() {
  const at = db.settings.keysAt || {}, out = [];
  for (const [k, dias] of Object.entries(VENCE)) {
    if (!E[k] || !at[k]) continue;
    const queda = Math.round(dias - (Date.now() - new Date(at[k]).getTime()) / 86400000);
    if (queda <= 10) out.push({ clave: k, quedan: queda });
  }
  return out;
}
function claveGuardada(k) { db.settings.keysAt = { ...(db.settings.keysAt || {}), [k]: new Date().toISOString() }; saveAll.settings(); }

// ---------- Reporte para soporte (SIN claves) ----------
function reporte() {
  const secretos = Object.entries(E).filter(([k, v]) => /KEY|TOKEN|SECRET|CLIENT_ID|ACCOUNT_ID|CHAT_ID/i.test(k) && v && String(v).length > 5).map(([, v]) => String(v));
  const tapar = t => secretos.reduce((a, s) => a.split(s).join('***'), String(t));
  const ai = require('./ai');
  const L = [];
  L.push('REPORTE DE SHORTFORGE — ' + new Date().toLocaleString('es'));
  L.push('Sistema: ' + process.platform + ' · Node ' + process.version);
  const dk = disco(); if (dk) L.push(`Disco: ${dk.libreGB} GB libres de ${dk.totalGB} GB`);
  try { L.push('Herramientas: ' + JSON.stringify(require('./tts').local())); } catch (e) {}
  L.push('Claves configuradas: ' + Object.keys(E).filter(k => /_(API_KEY|TOKEN|SECRET|ID)$/.test(k) && E[k]).join(', '));
  L.push('Motores activos: ' + ai.active().join(', '));
  L.push('Cuotas agotadas ahora: ' + JSON.stringify(ai.estadoCuotas()));
  L.push('Última revisión de motores: ' + JSON.stringify(db.settings.health || {}));
  L.push(`Canales: ${db.channels.length} (${db.channels.filter(c => c.active).length} activos) · Voces clonadas: ${db.voices.length}`);
  const cuenta = {}; db.jobs.forEach(j => cuenta[j.status] = (cuenta[j.status] || 0) + 1);
  L.push('Videos por estado: ' + JSON.stringify(cuenta));
  const { reserveGemini, critic, checkImages, review, naturalVoice, videosPerDay, ytDailyMax, whisperModel } = db.settings;
  L.push('Ajustes: ' + JSON.stringify({ reserveGemini, critic, checkImages, review, naturalVoice, videosPerDay, ytDailyMax, whisperModel }));
  L.push('', '--- ÚLTIMOS ERRORES Y AVISOS ---');
  for (const j of db.jobs.filter(x => x.error || (x.log || []).some(l => /error|⚠|⏳|falló|no pude/i.test(l))).slice(-15)) {
    L.push(`[${j.status}] ${j.kind || 'nuevo'} · ${(j.title || j.topic || '').slice(0, 60)}`);
    (j.log || []).filter(l => /error|⚠|⏳|falló|no pude|agot|vacía/i.test(l)).slice(-5).forEach(l => L.push('   ' + l.slice(0, 300)));
    if (j.error) L.push('   ERROR: ' + j.error.slice(0, 300));
  }
  const txt = tapar(L.join('\n'));
  const name = 'reporte-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.txt';
  fs.writeFileSync(path.join(DATA, 'cache', name), txt);
  return { url: '/files/cache/' + name, name };
}

function estado() {
  const dk = disco();
  return { disco: dk, poco: dk && dk.libreGB < 5, vencen: clavesPorVencer(), health: db.settings.health || null, videosGB: +(tam(path.join(DATA, 'videos')) / 1e9).toFixed(1) };
}

function start() {
  const tick = () => {
    try {
      const r = limpiar();
      if (r?.liberadoMB) console.log(`[Limpieza] ${r.liberadoMB} MB liberados (${r.videosBorrados} videos publicados hace más de 30 días)`);
      const dk = disco();
      if (dk && dk.libreGB < 5 && db.settings.lastDiskWarn !== day()) { db.settings.lastDiskWarn = day(); saveAll.settings(); require('./avisos').avisar(`💾 Te quedan solo ${dk.libreGB} GB libres en el disco. Libera espacio para que ShortForge siga trabajando.`); }
      const v = clavesPorVencer();
      if (v.length && db.settings.lastKeyWarn !== day()) { db.settings.lastKeyWarn = day(); saveAll.settings(); require('./avisos').avisar('🔑 Claves por vencer: ' + v.map(x => `${x.clave} (${x.quedan} días)`).join(', ') + '. Crea una nueva y pégala en Ajustes.'); }
    } catch (e) { console.log('[Salud] ' + e.message); }
  };
  setTimeout(tick, 45000);
  setInterval(tick, 6 * 3600000);
}

module.exports = { disco, limpiar, reporte, estado, claveGuardada, clavesPorVencer, start };
