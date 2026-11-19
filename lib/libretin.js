// 🎓 ProfeTok (sistema para docentes y familias): ShortForge lo enciende en tu VPS (puerto 3400) y lo vuelve a
// encender si se cae. Sus datos van en ShortForge-datos/libretin (base de datos, fotos privadas y respaldos diarios).
// Para verlo en internet: en Cloudflare → Zero Trust → Tunnels → tu túnel → «Public Hostname», agrega tu dominio
// (ej. libretin.pe) apuntando a http://localhost:3400. Usa el mismo túnel de la página viral.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process');
const { ROOT, USERDATA, E, setKeys } = require('./util');
const { db, saveAll } = require('./store');
const PORT = 3400, DIR = path.join(ROOT, 'aula'), DATOS = path.join(USERDATA, 'libretin');
const S = () => (db.settings.libretin = db.settings.libretin || { on: false });
const st = { proc: null, estado: 'apagado', log: [], parando: false };
const say = m => { st.log = [...st.log, new Date().toLocaleTimeString('es-PE') + ' ' + String(m).trim()].slice(-60); };

// En Windows, al reiniciar ShortForge (por ejemplo al actualizar) puede quedar abierto el ProfeTok viejo ocupando el puerto:
// se cierra antes de encender el nuevo, para que siempre corra la última versión.
function liberarPuerto() {
  try { const { execSync } = require('child_process');
    if (process.platform === 'win32') { const out = execSync('netstat -ano -p tcp', { encoding: 'utf8', windowsHide: true, timeout: 8000 });
      const pids = new Set(out.split(/\r?\n/).filter(l => new RegExp(`[:.]${PORT}\\s`).test(l) && /LISTENING/i.test(l)).map(l => l.trim().split(/\s+/).pop()).filter(p => /^\d+$/.test(p) && +p !== process.pid && +p > 4));
      for (const p of pids) { try { execSync(`taskkill /PID ${p} /T /F`, { windowsHide: true, timeout: 8000 }); say(`Cerré un ProfeTok viejo que seguía abierto (proceso ${p}).`); } catch (e) {} } }
    else { try { execSync(`fuser -k ${PORT}/tcp`, { timeout: 8000, stdio: 'ignore' }); } catch (e) {} }
  } catch (e) {}
}
function encenderProc() {
  if (st.proc) return; liberarPuerto(); const s = S(); fs.mkdirSync(DATOS, { recursive: true });
  if (!E.LIBRETIN_IA_TOKEN) setKeys({ LIBRETIN_IA_TOKEN: crypto.randomBytes(24).toString('hex') }); // clave privada para que ProfeTok use la IA de ShortForge
  if (!E.LIBRETIN_OWNER_PASS) setKeys({ LIBRETIN_OWNER_PASS: crypto.randomBytes(8).toString('base64url') }); // tu contraseña de dueño (cámbiala al entrar)
  const base = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'windir', 'ComSpec', 'PATHEXT'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  const env = { ...base, AULA_PORT: String(PORT), AULA_DATA: DATOS, AULA_OWNER_EMAIL: s.email || '', AULA_OWNER_PASS: E.LIBRETIN_OWNER_PASS || '', AULA_WHATSAPP: s.soporte || '', AULA_SF_URL: `http://127.0.0.1:${E.PORT || 3200}`, AULA_IA_TOKEN: E.LIBRETIN_IA_TOKEN || '' };
  const p = spawn(process.execPath, [path.join(DIR, 'server.js')], { cwd: DIR, env, windowsHide: true });
  st.proc = p; st.estado = 'encendiendo';
  const leer = d => String(d).split(/\r?\n/).filter(l => l.trim() && !/ExperimentalWarning|trace-warnings/.test(l)).forEach(l => { say(l); if (/ProfeTok en/.test(l)) st.estado = 'encendido'; });
  p.stdout.on('data', leer); p.stderr.on('data', leer);
  p.on('exit', code => { st.proc = null; st.estado = 'apagado'; if (S().on && !st.parando) { say(`Se detuvo (código ${code}). Lo vuelvo a encender en 5 s.`); setTimeout(() => S().on && encenderProc(), 5000); } });
}
function encender(o = {}) { const s = S(); if (o.email) s.email = String(o.email).trim().toLowerCase().slice(0, 120); if (o.soporte !== undefined) s.soporte = String(o.soporte).replace(/[^\d+]/g, '').slice(0, 20); s.on = true; saveAll.settings(); if (st.proc) { st.parando = true; st.proc.once('exit', () => { st.parando = false; encenderProc(); }); st.proc.kill(); } else encenderProc(); }
function apagar() { const s = S(); s.on = false; saveAll.settings(); if (st.proc) { st.parando = true; st.proc.once('exit', () => { st.parando = false; }); st.proc.kill(); } }
// 🌐 Enlace de prueba instantáneo (Cloudflare, gratis, sin configurar nada). Cambia si se reinicia: para un enlace
// fijo usa profetok.yupitok.com (subdominio en tu túnel) o tu dominio propio.
const tn = { proc: null, url: '', estado: 'apagado' };
async function enlacePrueba(on) {
  if (!on) { S().prueba = false; saveAll.settings(); if (tn.proc) tn.proc.kill(); tn.proc = null; tn.url = ''; tn.estado = 'apagado'; return; }
  S().prueba = true; saveAll.settings(); if (tn.proc) return;
  const V = require('./viral'); try { await V.descargarCloudflared(); } catch (e) { tn.estado = 'error'; say('Enlace de prueba: ' + e.message); return; }
  const t = spawn(V.CF_EXE, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`], { windowsHide: true }); tn.proc = t; tn.estado = 'conectando';
  const leer = d => String(d).split(/\r?\n/).forEach(l => { const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(l); if (m && tn.url !== m[0]) { tn.url = m[0]; tn.estado = 'listo'; say('🌐 Enlace de prueba: ' + m[0]); } });
  t.stdout.on('data', leer); t.stderr.on('data', leer);
  t.on('exit', () => { tn.proc = null; tn.url = ''; tn.estado = 'apagado'; if (S().prueba && S().on) setTimeout(() => enlacePrueba(true), 10000); });
}
const estado = () => ({ prueba: !!S().prueba, enlace: tn.url, enlaceEstado: tn.estado, on: !!S().on, email: S().email || '', soporte: S().soporte || '', estado: st.estado, puerto: PORT, local: `http://localhost:${PORT}`, clave: S().on ? (E.LIBRETIN_OWNER_PASS || '') : '', log: st.log.slice(-25) });
function start() { if (S().on) { encenderProc(); if (S().prueba) setTimeout(() => enlacePrueba(true), 8000); } process.on('exit', () => { try { st.proc?.kill(); tn.proc?.kill(); } catch (e) {} }); }
module.exports = { start, encender, apagar, estado, enlacePrueba };
