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
const say = m => { st.log = [...st.log, new Date().toLocaleTimeString('es-PE') + ' ' + String(m).trim()].slice(-30); };

function encenderProc() {
  if (st.proc) return; const s = S(); fs.mkdirSync(DATOS, { recursive: true });
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
const estado = () => ({ on: !!S().on, email: S().email || '', soporte: S().soporte || '', estado: st.estado, puerto: PORT, local: `http://localhost:${PORT}`, clave: S().on ? (E.LIBRETIN_OWNER_PASS || '') : '', log: st.log.slice(-10) });
function start() { if (S().on) encenderProc(); process.on('exit', () => { try { st.proc?.kill(); } catch (e) {} }); }
module.exports = { start, encender, apagar, estado };
