// Página viral + base de visitantes + campañas de notificaciones push.
// Sin servicios externos de base de datos: todo se guarda en data/viral.db (SQLite incorporado en Node 22.13+).
// Privacidad: solo se guarda a quien acepta y declara ser mayor de 18; la IP se guarda recortada.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const [mayor, menor] = process.versions.node.split('.').map(Number);
if (mayor < 22 || (mayor === 22 && menor < 5)) { console.error(`\nNecesitas Node.js 22.5 o más nuevo (tienes ${process.versions.node}). Descárgalo en https://nodejs.org (versión LTS) o en PowerShell: winget upgrade OpenJS.NodeJS.LTS\n`); process.exit(1); }
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); }
catch (e) { // Node 22.5–22.12: SQLite viene detrás de una opción; se vuelve a abrir con ella.
  if (process.execArgv.includes('--experimental-sqlite')) throw e;
  process.exit(require('child_process').spawnSync(process.execPath, ['--experimental-sqlite', ...process.execArgv, __filename, ...process.argv.slice(2)], { stdio: 'inherit' }).status ?? 1);
}
const webpush = require('./webpush'); // notificaciones sin librerías externas

// Lee el archivo .env (o .env.txt, por si Windows le agregó la extensión) sin depender de opciones de Node.
for (const f of ['.env', '.env.txt']) {
  const fp = path.join(__dirname, f); if (!fs.existsSync(fp)) continue;
  for (const l of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(l); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
  break;
}
const E = process.env;
const PORT = +E.PORT || 3000, PUBLIC_URL = (E.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const ADMIN_PASSWORD = E.ADMIN_PASSWORD || '', SECRET = E.SESSION_SECRET || crypto.createHash('sha256').update('sf:' + ADMIN_PASSWORD).digest('hex');
const TZ = E.TZ_PANEL || 'America/Lima';
const VAPID = E.VAPID_PUBLIC && E.VAPID_PRIVATE ? { subject: E.VAPID_EMAIL || 'mailto:admin@example.com', publicKey: E.VAPID_PUBLIC, privateKey: E.VAPID_PRIVATE } : null;
// Token para que ShortForge (en la misma PC) entre al panel sin escribir la contraseña.
const LOCAL_TOKEN = ADMIN_PASSWORD ? crypto.createHash('sha256').update('sf-local:' + ADMIN_PASSWORD).digest('hex') : null;

// ---------------- Base de datos ----------------
const DATA = E.VIRAL_DATA || path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'viral.db'));
db.exec(`PRAGMA journal_mode=WAL;
create table if not exists visitors (id integer primary key, created_at text default (datetime('now')), vid text, ip text, country_code text, country text, region text, city text,
  device text, browser text, source text, game text, sign text);
create index if not exists ix_v_country on visitors(country_code, city); create index if not exists ix_v_created on visitors(created_at);
create table if not exists subscribers (id integer primary key, created_at text default (datetime('now')), endpoint text unique not null, sub text not null,
  vid text, country_code text, country text, city text, sign text, game text, source text, device text, active integer default 1,
  day text, today integer default 0, sent integer default 0, clicks integer default 0, last_at text);
create index if not exists ix_s_active on subscribers(active, country_code);
create table if not exists campaigns (id integer primary key, created_at text default (datetime('now')), title text, body text, url text, image text,
  filters text, max_n integer, run_at text, status text, sent integer default 0, failed integer default 0, removed integer default 0, skipped integer default 0,
  clicks integer default 0, auto text, finished_at text);
create table if not exists i18n (lang text not null, src text not null, dst text not null, created_at text default (datetime('now')), primary key (lang, src));
create table if not exists ref_codigos (uid text primary key, codigo text unique not null, created_at text default (datetime('now')));
create table if not exists ref_altas (nuevo text primary key, codigo text not null, ipt text, created_at text default (datetime('now')), reclamado integer default 0);
create table if not exists polls (id integer primary key, created_at text default (datetime('now')), question text, options text, active integer default 1);
create table if not exists votes (poll_id integer, option integer, voter text, created_at text default (datetime('now')), primary key (poll_id, voter));
create table if not exists settings (k text primary key, v text);
create table if not exists perfiles (id text primary key, codigo text unique, data text, updated_at text default (datetime('now')));
create table if not exists yc_mov (id integer primary key, perfil text, tipo text, monto integer, motivo text, ip text, created_at text default (datetime('now')));
create index if not exists yc_mov_p on yc_mov(perfil, created_at);
create table if not exists yc_alerta (id integer primary key, perfil text, detalle text, created_at text default (datetime('now')));
create table if not exists yc_inv (perfil text, item text, created_at text default (datetime('now')), primary key (perfil, item));
create table if not exists yc_estilo (uidh text primary key, perfil text, marco text, titulo text, color text);
create table if not exists arcade (id integer primary key, juego text, uid text, nombre text, avatar text, puntos integer, created_at text default (datetime('now')));
create index if not exists ix_arc on arcade(juego, created_at);
create table if not exists pro_jugadas (id text, dia text, n integer default 0, primary key (id, dia));
create table if not exists pro_tiempo (mes text, uid text, juego text, min integer default 0, primary key (mes, uid, juego));
create table if not exists pro_jugador (uid text primary key, nombre text, avatar text);
create table if not exists pro_dia (uid text, dia text, min integer default 0, primary key (uid, dia));
create table if not exists campeones (mes text, juego text, puesto integer, uid text, nombre text, avatar text, puntos integer, primary key (mes, juego, puesto));
create table if not exists campeon_red (uid text primary key, cuenta integer, usuario_yupi text, red text, usuario text, estado text default 'pendiente', created_at text default (datetime('now')));
create table if not exists torneo_premios (semana text, uid text, puesto integer, monedas integer, reclamado integer default 0, primary key (semana, uid));
create table if not exists pro_rep (id text, iph text, created_at text default (datetime('now')), primary key (id, iph));
create table if not exists pro_oculto (id text primary key, motivo text, created_at text default (datetime('now')));
create table if not exists errores (firma text primary key, msg text, src text, ruta text, ua text, n integer default 1, primero text default (datetime('now')), ultimo text default (datetime('now')));
create table if not exists resultados (id integer primary key, test text, clave text, created_at text default (datetime('now')));
create index if not exists ix_r_test on resultados(test, clave);`);
try { db.exec('alter table subscribers add column intereses text'); } catch (e) {} // agrega la columna si falta
const q = (sql, ...a) => db.prepare(sql).all(...a), q1 = (sql, ...a) => db.prepare(sql).get(...a), run = (sql, ...a) => db.prepare(sql).run(...a);
const getS = (k, d) => { const r = q1('select v from settings where k=?', k); return r ? JSON.parse(r.v) : d; };
const setS = (k, v) => run('insert into settings(k,v) values(?,?) on conflict(k) do update set v=excluded.v', k, JSON.stringify(v));
if (!q1('select id from polls limit 1')) run('insert into polls(question,options) values(?,?)', '¿Qué prefieres para el fin de semana?', JSON.stringify(['🍕 Pizza y película', '🏖️ Playa', '🎉 Fiesta', '😴 Dormir todo el día']));

// ---------------- Utilidades ----------------
const SIGNS = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];
const INTERESES = [['horoscopo', '🔮 Horóscopo diario'], ['tests', '🧠 Tests nuevos'], ['trivias', '🏆 Trivias y retos'], ['videos', '🎬 Videos nuevos'], ['amor', '💘 Amor y relaciones'], ['dinero', '💰 Dinero y trabajo']];
// Catálogo de tests (el mismo que usa la página).
const CATALOGO = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'tests.json'), 'utf8')).tests; } catch (e) { return []; } })();
const GAMES = CATALOGO.map(t => t.id);
const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s ?? '').slice(0, n);
const hoyPeru = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const horaPeru = () => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
function clientIp(req) {
  // Detrás de Cloudflare (túnel) la IP real llega en cf-connecting-ip; detrás de Nginx/Caddy en x-forwarded-for.
  const xf = E.TRUST_PROXY !== '0' ? String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  return (xf || req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}
// IP recortada: suficiente para estadísticas, no identifica a la persona.
const ipCorta = ip => ip.includes(':') ? ip.split(':').slice(0, 3).join(':') + '::' : ip.split('.').slice(0, 3).join('.') + '.0';
// País, región y ciudad los da Cloudflare en cada visita (gratis). La ciudad y región requieren activar
// "Add visitor location headers" en Cloudflare (Reglas → Transformaciones administradas).
function geo(ip, req) {
  const h = k => { const v = req.headers[k]; if (!v) return null; try { return decodeURIComponent(escape(String(v))).slice(0, 60); } catch (e) { return String(v).slice(0, 60); } };
  let cc = String(req.headers['cf-ipcountry'] || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!cc || cc === 'XX' || cc === 'T1') cc = null;
  let country = null; try { country = cc ? regionNames.of(cc) : null; } catch (e) {}
  return { country_code: cc, country, region: h('cf-region'), city: h('cf-ipcity') };
}
function dispositivo(ua) {
  ua = String(ua || '');
  const device = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : 'Otro';
  const browser = /FBAN|FBAV/.test(ua) ? 'Facebook' : /Instagram/.test(ua) ? 'Instagram' : /TikTok|musical_ly|BytedanceWebview/.test(ua) ? 'TikTok' : /WhatsApp/.test(ua) ? 'WhatsApp' : /Edg\//.test(ua) ? 'Edge' : /Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : 'Otro';
  return { device, browser };
}
// Destinos permitidos: solo videos de YouTube/Facebook/TikTok/Instagram o tu propio dominio (evita "open redirect").
function safeDest(raw) {
  try {
    const u = new URL(raw, PUBLIC_URL);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (u.origin === new URL(PUBLIC_URL).origin) return u.toString();
    const h = u.hostname.replace(/^(www|m)\./, '');
    const ok = (h === 'youtube.com' && /^\/(shorts|watch|@|channel|c\/)/.test(u.pathname)) || h === 'youtu.be' ||
      (h === 'facebook.com' && /^\/(reel|watch|share|[^/]+\/videos|[^/]+\/?$)/.test(u.pathname)) || h === 'fb.watch' ||
      (h === 'tiktok.com' && /^\/@/.test(u.pathname)) || (h === 'instagram.com' && /^\/(reel|p|[^/]+\/?$)/.test(u.pathname));
    return ok ? u.toString() : null;
  } catch (e) { return null; }
}
// Límite simple de peticiones por IP.
const hits = new Map();
const MUNDO_POS = new Map(), MUNDO_ID = new Map(), MUNDOS3D = ['plaza', 'desierto', 'bosque', 'nieve', 'volcan', 'luna'], EMOTES3D = ['👋', '😂', '❤️', '🔥', '👏', '😮', '🎉', '💃'];
function limite(ip, key, max, ms = 60000) {
  const k = key + ip, now = Date.now(), h = (hits.get(k) || []).filter(t => now - t < ms);
  h.push(now); hits.set(k, h); return h.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (!h.some(t => now - t < 3600000)) hits.delete(k); }, 600000).unref();

// Sesión del panel: cookie firmada (sin guardar contraseñas en el navegador).
const firma = v => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
const nuevaSesion = () => { const v = (Date.now() + 7 * 86400000).toString(36) + '.' + crypto.randomBytes(8).toString('hex'); return v + '.' + firma(v); };
function admin(req) {
  if (LOCAL_TOKEN && req.headers['x-sf-token'] && req.headers['x-sf-token'].length === 64 && crypto.timingSafeEqual(Buffer.from(req.headers['x-sf-token']), Buffer.from(LOCAL_TOKEN))) return true;
  const m = /(?:^|;\s*)sid=([^;]+)/.exec(req.headers.cookie || ''); if (!m) return false;
  const [exp, rnd, sig] = m[1].split('.'), v = exp + '.' + rnd;
  if (!sig || sig.length !== 64) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(firma(v))) && parseInt(exp, 36) > Date.now();
}

// ---------------- Campañas ----------------
function filtroSQL(f = {}) {
  const w = ['active=1'], a = [];
  const lista = (col, arr) => { arr = (arr || []).filter(Boolean).slice(0, 300); if (arr.length) { w.push(`${col} in (${arr.map(() => '?').join(',')})`); a.push(...arr.map(String)); } };
  lista('country_code', f.countries); lista('sign', f.signs); lista('game', f.games); lista('source', f.sources); lista('device', f.devices);
  if (f.cities?.length) lista('city', f.cities);
  const ints = (f.intereses || []).filter(x => INTERESES.some(i => i[0] === x)).slice(0, 10);
  if (ints.length) { w.push('(' + ints.map(() => "(',' || coalesce(intereses,'') || ',') like ?").join(' or ') + ')'); a.push(...ints.map(x => '%,' + x + ',%')); }
  return { where: w.join(' and '), args: a };
}
function contar(f) { const { where, args } = filtroSQL(f); return q1(`select count(*) n from subscribers where ${where}`, ...args).n; }
const enviando = { id: null }, populares = { t: 0, lista: [] };
async function enviarCampana(c) {
  if (enviando.id) return; // de a una
  if (!VAPID) { run("update campaigns set status='error', finished_at=datetime('now') where id=?", c.id); return; }
  enviando.id = c.id; run("update campaigns set status='enviando' where id=?", c.id);
  try {
    const f = JSON.parse(c.filters || '{}'), { where, args } = filtroSQL(f), hoy = hoyPeru(), tope = +getS('tope', 3) || 3;
    const max = c.max_n > 0 ? c.max_n : 1e9;
    let last = 0, sent = 0, failed = 0, removed = 0, skipped = 0;
    while (sent < max) {
      // Se recorre por id (no por "offset"): así nadie se salta aunque se den de baja suscripciones en el camino.
      const rows = q(`select * from subscribers where ${where} and id>? order by id limit 500`, ...args, last);
      if (!rows.length) break;
      last = rows[rows.length - 1].id;
      for (let i = 0; i < rows.length && sent < max; i += 50) {
        await Promise.all(rows.slice(i, i + 50).map(async r => {
          if (sent >= max) return;
          if (r.day === hoy && r.today >= tope) { skipped++; return; } // tope diario por persona (evita que te bloqueen como spam)
          sent++;
          const nombre = r.sign ? r.sign[0].toUpperCase() + r.sign.slice(1) : 'tú';
          const payload = JSON.stringify({ title: String(c.title).replaceAll('{signo}', nombre), body: String(c.body).replaceAll('{signo}', nombre),
            url: `${PUBLIC_URL}/c/${c.id}?s=${r.id}`, image: c.image || undefined, tag: 'c' + c.id });
          try {
            await webpush.sendNotification(JSON.parse(r.sub), payload, { vapid: VAPID, TTL: 86400, urgency: 'normal' });
            run('update subscribers set day=?, today=case when day=? then today+1 else 1 end, sent=sent+1, last_at=datetime(\'now\') where id=?', hoy, hoy, r.id);
          } catch (e) {
            sent--;
            if (e.statusCode === 404 || e.statusCode === 410) { removed++; run('update subscribers set active=0 where id=?', r.id); } else failed++;
          }
        }));
        run('update campaigns set sent=?, failed=?, removed=?, skipped=? where id=?', sent, failed, removed, skipped, c.id);
      }
    }
    run("update campaigns set status='enviada', sent=?, failed=?, removed=?, skipped=?, finished_at=datetime('now') where id=?", sent, failed, removed, skipped, c.id);
  } catch (e) { console.error(e); run("update campaigns set status='error', finished_at=datetime('now') where id=?", c.id); }
  finally { enviando.id = null; }
}
// Reloj: campañas programadas + horóscopo diario automático (hora Perú).
async function reloj() {
  const due = q1("select * from campaigns where status='programada' and run_at<=datetime('now') order by run_at limit 1");
  if (due) return enviarCampana(due);
  const d = getS('diario', { on: false, hora: '07:30', title: '✨ Tu horóscopo de hoy, {signo}', body: 'Los astros tienen un mensaje para ti. Toca para verlo 👉', url: '/?g=horoscopo&src=push' });
  if (d.on && horaPeru() >= d.hora && getS('diarioDia', '') !== hoyPeru()) {
    setS('diarioDia', hoyPeru());
    const r = run("insert into campaigns(title,body,url,filters,max_n,run_at,status,auto) values(?,?,?,?,0,datetime('now'),'programada','diario')", d.title, d.body, d.url || '/', '{}');
    enviarCampana(q1('select * from campaigns where id=?', r.lastInsertRowid));
  }
}
// 🔥 Juego del día: una notificación al día con el juego más jugado de la semana (no repite el mismo en 7 días).
// No se envía si ese día ya mandaste una campaña tuya, para no cansar a la gente.
async function juegoDelDia() {
  const jd = getS('juegoDia', { on: false, hora: '19:30' }); if (!jd.on || horaPeru() < jd.hora || getS('juegoDiaDia', '') === hoyPeru() || enviando.id) return;
  if (q1("select 1 from campaigns where (auto is null or auto='') and date(created_at, '-5 hours') = ? and status in ('enviada','enviando','programada')", hoyPeru())) { setS('juegoDiaDia', hoyPeru()); return; }
  if (!getS('pro', {}).on) return; const J7 = jugadas7(), usados = getS('juegoDiaUsados', []);
  const g = (await proVisibles()).filter(x => !usados.includes(x.id)).map(x => ({ ...x, j: J7.get(x.id) || 0 })).sort((a, b) => b.j - a.j)[0]; if (!g) return;
  setS('juegoDiaDia', hoyPeru()); setS('juegoDiaUsados', [g.id, ...usados].slice(0, 7));
  const r = run("insert into campaigns(title,body,url,image,filters,max_n,run_at,status,auto) values(?,?,?,?,?,0,datetime('now'),'programada','juegoDia')", clip('🔥 El juego del día: ' + g.t, 80), g.j >= 10 ? `${g.j} partidas esta semana en Yupitok. ¿Te animas a probarlo? 🎮` : '¡Juego nuevo para ti! Gratis y sin instalar. Toca para jugar 🎮', '/juego/' + g.s + '?src=push', g.img || null, '{}');
  enviarCampana(q1('select * from campaigns where id=?', r.lastInsertRowid));
}
// 👑 El día 1 de cada mes (desde el mediodía): aviso "Ya están los campeones" (si ese día no mandaste otra campaña tuya)
async function avisoCampeones() {
  if (getS('campeonesAviso', true) === false || enviando.id) return; const hoy = hoyPeru(), A = mesPeru(-1);
  if (hoy.slice(8) !== '01' || horaPeru() < '12:00' || getS('campeonesAvisoMes', '') === A.mes) return; mesCerrar(A);
  setS('campeonesAvisoMes', A.mes); if (!q1('select 1 from campeones where mes=?', A.mes)) return;
  if (q1("select 1 from campaigns where (auto is null or auto='') and date(created_at, '-5 hours') = ?", hoy)) return;
  const r = run("insert into campaigns(title,body,url,filters,max_n,run_at,status,auto) values(?,?,?,?,0,datetime('now'),'programada','campeones')", `👑 ¡Ya están los campeones de ${A.nombre}!`, '¿Quién reina en tu juego favorito? Mira el Salón de la Fama y quítales el trono 🎮', '/campeones?src=push', '{}');
  enviarCampana(q1('select * from campaigns where id=?', r.lastInsertRowid));
}
// 🔥 "No pierdas tu racha": a las 7 pm (Perú), aviso personalizado solo a quien tiene racha de 2+ días y todavía no entró hoy
async function avisoRacha() {
  const cfgR = getS('rachaAviso', { on: true, hora: '19:00' }); if (!cfgR.on || !VAPID || enviando.id || horaPeru() < cfgR.hora || getS('rachaAvisoDia', '') === hoyPeru()) return;
  setS('rachaAvisoDia', hoyPeru()); const hoy = hoyPeru(), ayer = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() - 864e5)), tope = +getS('tope', 3) || 3;
  const r0 = run("insert into campaigns(title,body,url,filters,max_n,run_at,status,auto) values(?,?,?,?,0,datetime('now'),'enviando','racha')", '🔥 ¡No pierdas tu racha!', 'Aviso personalizado a quien tiene racha', '/?src=racha', '{}'), cid = r0.lastInsertRowid;
  enviando.id = cid; let sent = 0, failed = 0, removed = 0;
  try {
    for (const r of q("select * from subscribers where active=1 and vid is not null and vid != ''")) {
      if (r.day === hoy && r.today >= tope) continue;
      const f = q1('select data from perfiles where id=?', crypto.createHash('sha256').update('perfil:' + r.vid).digest('hex').slice(0, 24)); if (!f) continue;
      let D; try { D = JSON.parse(f.data); } catch (e) { continue; } const rc = D?.racha; if (!rc || rc.dia !== ayer || (rc.n || 0) < 2) continue;
      const sig = ((rc.n % 7) + 1), premio = [20, 30, 40, 50, 60, 80, 150][sig - 1];
      const payload = JSON.stringify({ title: `🔥 ¡Llevas ${rc.n} días seguidos!`, body: `Entra hoy y reclama tu premio del día ${sig}: ${premio} 🪙${sig === 7 ? ' + cofre 🧰' : ''}. ¡No pierdas tu racha!`, url: `${PUBLIC_URL}/c/${cid}?s=${r.id}`, tag: 'racha' });
      try { await webpush.sendNotification(JSON.parse(r.sub), payload, { vapid: VAPID, TTL: 5 * 3600, urgency: 'normal' }); sent++; run("update subscribers set day=?, today=case when day=? then today+1 else 1 end, sent=sent+1, last_at=datetime('now') where id=?", hoy, hoy, r.id); }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { removed++; run('update subscribers set active=0 where id=?', r.id); } else failed++; }
    }
  } catch (e) { console.error(e); }
  run("update campaigns set status='enviada', sent=?, failed=?, removed=?, finished_at=datetime('now') where id=?", sent, failed, removed, cid); enviando.id = null;
}
// 🎉 Hora feliz: un día a la semana, monedas extra por cada partida (con aviso al empezar)
const DIAS_SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function horaFeliz() {
  const h = getS('horaFeliz', { on: true, dia: 6, desde: '20:00', hasta: '21:00', extra: 20 }); if (!h.on) return { activa: false, ...h };
  const dia = new Date(Date.now() - 5 * 3600e3).getUTCDay(), ahora = horaPeru(), activa = dia === +h.dia && ahora >= h.desde && ahora < h.hasta;
  const [hh, mm] = h.hasta.split(':').map(Number), d = new Date(Date.now() - 5 * 3600e3), fin = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm) + 5 * 3600e3;
  return { ...h, activa, fin: activa ? fin : 0, diaNombre: DIAS_SEM[+h.dia] };
}
async function avisoHoraFeliz() {
  const h = horaFeliz(); if (!h.activa || h.aviso === false || enviando.id || getS('horaFelizAviso', '') === hoyPeru()) return; setS('horaFelizAviso', hoyPeru());
  if (q1("select 1 from campaigns where (auto is null or auto='') and date(created_at, '-5 hours') = ?", hoyPeru())) return;
  const r = run("insert into campaigns(title,body,url,filters,max_n,run_at,status,auto) values(?,?,?,?,0,datetime('now'),'programada','horaFeliz')", '🎉 ¡Empezó la Hora Feliz en Yupitok!', `+${h.extra} 🪙 extra por cada partida hasta las ${h.hasta}. ¡Entra a jugar ahora! 🎮`, '/?src=horafeliz', '{}');
  enviarCampana(q1('select * from campaigns where id=?', r.lastInsertRowid));
}
setInterval(() => reloj().then(() => juegoDelDia()).then(() => avisoCampeones()).then(() => avisoHoraFeliz()).then(() => avisoRacha()).catch(console.error), 30000).unref();

// ---------------- Servidor ----------------
const MIME = { '.webp': 'image/webp', '.gif': 'image/gif', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const PUB = path.join(__dirname, 'public');
function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'content-type': type, 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
// Archivos en memoria, comprimidos una sola vez (brotli/gzip) y con ETag: el celular no vuelve a bajar lo que ya tiene.
const CACHE_ARCH = new Map(), COMPRIMIBLE = /^(text\/|application\/(json|javascript|manifest\+json)|image\/svg)/;
function archivo(req, res, f, type, extra = {}) {
  let st; try { st = fs.statSync(f); } catch (e) { return send(res, 404, 'No encontrado', 'text/plain; charset=utf-8'); }
  let c = CACHE_ARCH.get(f);
  if (!c || c.mtime !== st.mtimeMs || c.size !== st.size) {
    const raw = fs.readFileSync(f), zip = COMPRIMIBLE.test(type) && raw.length > 900;
    c = { mtime: st.mtimeMs, size: st.size, raw, etag: '"' + crypto.createHash('sha1').update(raw).digest('base64').slice(0, 16) + '"',
      br: null, gz: zip ? zlib.gzipSync(raw, { level: 7 }) : null };
    // brotli (más chico) se prepara en segundo plano para no frenar a nadie; mientras tanto va gzip
    if (zip) { const cc = c; zlib.brotliCompress(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 10, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } }, (e, b) => { if (!e) cc.br = b; }); }
    if (raw.length < 8e6) { CACHE_ARCH.set(f, c); if (CACHE_ARCH.size > 600) CACHE_ARCH.delete(CACHE_ARCH.keys().next().value); }
  }
  const h = { 'content-type': type, 'x-content-type-options': 'nosniff', etag: c.etag, vary: 'Accept-Encoding', ...extra };
  if (req.headers['if-none-match'] === c.etag) { res.writeHead(304, h); return res.end(); }
  const ae = String(req.headers['accept-encoding'] || ''); let body = c.raw;
  if (c.br && /\bbr\b/.test(ae)) { body = c.br; h['content-encoding'] = 'br'; } else if (c.gz && /gzip/.test(ae)) { body = c.gz; h['content-encoding'] = 'gzip'; }
  h['content-length'] = body.length; res.writeHead(200, h); res.end(req.method === 'HEAD' ? undefined : body);
}
// HTML que cambia por pedido (la portada con sus etiquetas para redes): se comprime al vuelo.
function enviarHtml(req, res, html, extra = {}) {
  const ae = String(req.headers['accept-encoding'] || ''), h = { 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', vary: 'Accept-Encoding', ...extra };
  let body = Buffer.from(html); if (/gzip/.test(ae)) { body = zlib.gzipSync(body, { level: 6 }); h['content-encoding'] = 'gzip'; }
  res.writeHead(200, h); res.end(body);
}
// ---------- Juegos profesionales: catálogo de un distribuidor (GameDistribution, GamePix, GameMonetize…) ----------
// En el panel se pega el enlace del catálogo (JSON o RSS) que da el distribuidor; aquí se lee y se ordena.
let PRO = { t: 0, items: [], feed: '' };
const textoP = v => String(v ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").trim();
// Categorías de los distribuidores, en español
const CAT_ES = { puzzle: 'Rompecabezas', puzzles: 'Rompecabezas', action: 'Acción', arcade: 'Arcade', adventure: 'Aventura', racing: 'Carreras', car: 'Carros', cars: 'Carros', sports: 'Deportes', sport: 'Deportes', soccer: 'Fútbol', football: 'Fútbol', basketball: 'Básquet', shooter: 'Disparos', shooting: 'Disparos', strategy: 'Estrategia', casual: 'Casual', girls: 'Moda y belleza', 'dress-up': 'Vestir', dressup: 'Vestir', board: 'De mesa', 'board games': 'De mesa', cards: 'Cartas', card: 'Cartas', 'match-3': 'Combinar 3', match3: 'Combinar 3', io: 'Multijugador .io', '.io': 'Multijugador .io', kids: 'Infantiles', educational: 'Educativos', education: 'Educativos', simulation: 'Simulación', platformer: 'Plataformas', platform: 'Plataformas', fighting: 'Peleas', classics: 'Clásicos', classic: 'Clásicos', music: 'Música', word: 'Palabras', words: 'Palabras', '3d': '3D', idle: 'Idle', clicker: 'Clicker', drawing: 'Dibujo', running: 'Correr', runner: 'Correr', skill: 'Habilidad', multiplayer: 'Multijugador', cooking: 'Cocina', animal: 'Animales', animals: 'Animales', 'hidden object': 'Objetos ocultos', quiz: 'Trivias', trivia: 'Trivias', mahjong: 'Mahjong', solitaire: 'Solitario', bubble: 'Burbujas', 'bubble shooter': 'Burbujas', tower: 'Torres', 'tower defense': 'Defensa de torres', zombie: 'Zombis', math: 'Matemáticas', coloring: 'Colorear', escape: 'Escape', physics: 'Física', rpg: 'Rol', horror: 'Terror', stickman: 'Stickman', bike: 'Motos', flight: 'Aviones', minecraft: 'Bloques', snake: 'Serpiente', golf: 'Golf', pool: 'Billar', chess: 'Ajedrez' };
const catEs = c => { const k = String(c || '').trim().toLowerCase(); return CAT_ES[k] || (k ? k.charAt(0).toUpperCase() + k.slice(1) : 'Juegos'); };
const slugDe = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'juego';
function normalizarJuego(g, plantilla) {
  const pick = (...ks) => { for (const k of ks) { let v = k.split('.').reduce((o, x) => o?.[x], g); if (Array.isArray(v)) v = v[0]; if (v && typeof v === 'object') v = v.url || v.src || v.name || ''; if (v != null && v !== '') return v; } return ''; };
  const t = textoP(pick('title', 'Title', 'name', 'Name', 'game_name')).slice(0, 80), id = String(pick('id', 'Id', 'namespace', 'Md5', 'md5', 'gameId', 'game_id', 'slug'));
  let url = String(pick('url', 'Url', 'embed', 'embedUrl', 'embed_url', 'game_url', 'gameUrl', 'link', 'Link'));
  if (!/^https:\/\//i.test(url) && plantilla && id) url = plantilla.replace('{id}', encodeURIComponent(id));
  const img = String(pick('banner_image', 'image', 'Image', 'thumb', 'Thumb', 'thumbnail', 'Thumbnail', 'Asset', 'assets', 'images', 'icon', 'cover'));
  const cat = textoP(pick('category', 'Category', 'categories', 'Categories', 'genre', 'tags')).split(/[,|]/)[0].trim().slice(0, 30);
  if (!t || !/^https:\/\/[^\s"'<>]+$/i.test(url)) return null;
  const id12 = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
  return { id: id12, s: slugDe(t) + '-' + id12, t, u: url, img: /^https:\/\/[^\s"'<>]+$/i.test(img) ? img : '', cat: catEs(cat), d: textoP(pick('description', 'Description', 'desc')).slice(0, 220), w: +pick('width', 'Width') || 0, h: +pick('height', 'Height') || 0 };
}
async function catalogoPro(forzar) {
  const cfg = getS('pro', {}); if (!cfg.on || !cfg.feed) return [];
  if (!forzar && PRO.feed === cfg.feed && Date.now() - PRO.t < 6 * 3600e3 && PRO.items.length) return PRO.items;
  try {
    const r = await fetch(cfg.feed, { signal: AbortSignal.timeout(25000), headers: { accept: 'application/json, application/rss+xml, application/xml, text/xml' } }); const txt = (await r.text()).slice(0, 12e6);
    let lista = [];
    const sacar = j => Array.isArray(j) ? j : j.data?.items || j.data || j.items || j.games || j.results || Object.values(j).find(Array.isArray) || [];
    try { const j = JSON.parse(txt); lista = sacar(j);
      // catálogos por páginas (por ejemplo GamePix: ...&pagination=96&page=1): sigue leyendo las páginas siguientes
      let sig = j && !Array.isArray(j) && /^https:\/\//.test(j.next_url || '') ? j.next_url : null, pag = 1; const uP = new URL(cfg.feed), porSig = !!sig;
      for (let k = 0; k < 20 && lista.length < 5000; k++) {
        if (!sig && !porSig && uP.searchParams.has('page')) { pag++; uP.searchParams.set('page', String(pag)); sig = uP.toString(); }
        if (!sig) break;
        try { const r2 = await fetch(sig, { signal: AbortSignal.timeout(25000), headers: { accept: 'application/json' } }); if (!r2.ok) break; const j2 = JSON.parse((await r2.text()).slice(0, 12e6)), l2 = sacar(j2); if (!l2.length) break;
          const antes = lista.length; lista = lista.concat(l2); if (lista.length === antes) break; sig = j2 && !Array.isArray(j2) && /^https:\/\//.test(j2.next_url || '') && j2.next_url !== sig ? j2.next_url : null; } catch (e2) { break; }
      } }
    catch (e) { lista = [...txt.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => { const o = {}; for (const [, k, v] of m[1].matchAll(/<([a-zA-Z_:]+)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/g)) o[k.replace(/^.*:/, '')] = v; const im = /<(?:media:thumbnail|media:content|enclosure)[^>]*url="([^"]+)"/.exec(m[1]); if (im) o.image = im[1]; return o; }); }
    const vistos = new Set(), items = lista.map(g => normalizarJuego(g, cfg.plantilla)).filter(g => g && !vistos.has(g.id) && vistos.add(g.id)).slice(0, 5000);
    if (items.length) PRO = { t: Date.now(), items, feed: cfg.feed }; else console.error('Juegos pro: el catálogo no trajo juegos reconocibles');
  } catch (e) { console.error('Juegos pro:', e.message); }
  return PRO.items;
}
// ---------- 📣 IndexNow: avisa a Bing, Yandex, Seznam, Naver… cuando hay páginas nuevas (una vez al día) ----------
const indexNowKey = () => { let k = getS('indexnowKey', ''); if (!/^[a-f0-9]{32}$/.test(k)) { k = crypto.randomBytes(16).toString('hex'); setS('indexnowKey', k); } return k; };
async function indexNow() {
  if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(PUBLIC_URL) || /trycloudflare/.test(PUBLIC_URL) || getS('indexnowDia', '') === hoyPeru()) return;
  setS('indexnowDia', hoyPeru());
  try { const r = await fetch(PUBLIC_URL.replace(/\/$/, '') + '/sitemap.xml', { signal: AbortSignal.timeout(60000) }).catch(() => null); const xml = r && r.ok ? await r.text() : '';
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&')), vistos = new Set(getS('indexnowEnviadas', [])), nuevas = urls.filter(x => !vistos.has(x));
    const lote = (nuevas.length ? nuevas : urls.slice(0, 20)).slice(0, 9000); if (!lote.length) return; const host = new URL(PUBLIC_URL).host, key = indexNowKey();
    const rr = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host, key, keyLocation: `${PUBLIC_URL}/${key}.txt`, urlList: lote }), signal: AbortSignal.timeout(60000) });
    if (rr.ok || rr.status === 202) setS('indexnowEnviadas', [...vistos, ...lote].slice(-20000)); console.log('IndexNow:', rr.status, lote.length, 'URLs');
  } catch (e) { console.error('IndexNow:', e.message); }
}
setTimeout(() => indexNow(), 5 * 60000); setInterval(() => indexNow(), 3 * 3600000).unref();
// ---------- 🔎 Páginas de categorías (SEO): "Juegos de carreras gratis", etc. ----------
const INTRO_CAT = {
  'Carreras': 'Pisa el acelerador: carros, motos y camiones para correr contra el reloj o contra otros pilotos. Juegos de carreras gratis que funcionan en el celular y en la computadora, sin descargar nada.',
  'Carros': 'Maneja, estaciona, derrapa y personaliza carros de todo tipo. Juegos de carros gratis para jugar al instante desde el navegador.',
  'Motos': 'Saltos imposibles, pistas extremas y acrobacias en dos ruedas. Juegos de motos gratis para el celular y la PC.',
  'Disparos': 'Puntería, reflejos y estrategia: juegos de disparos gratis para todos los gustos, desde tiro al blanco hasta misiones de acción.',
  'Acción': 'Aventuras rápidas, enemigos, saltos y poderes. Juegos de acción gratis para descargar adrenalina en minutos.',
  'Aventura': 'Explora mundos, resuelve misterios y supera desafíos. Juegos de aventura gratis para jugar sin instalar.',
  'Rompecabezas': 'Entrena tu mente con rompecabezas, acertijos y retos de lógica. Juegos de puzzle gratis para relajarte o desafiarte.',
  'Deportes': 'Fútbol, básquet, tenis, golf y mucho más. Juegos de deportes gratis para competir desde el celular o la computadora.',
  'Fútbol': 'Penales, partidos rápidos y torneos: juegos de fútbol gratis para los amantes de la pelota.',
  'Estrategia': 'Planifica, construye y defiende. Juegos de estrategia gratis donde cada decisión cuenta.',
  'Casual': 'Partidas cortas, fáciles de aprender y difíciles de soltar. Juegos casuales gratis para cualquier momento del día.',
  'Arcade': 'La diversión clásica de las maquinitas, ahora en tu celular: juegos arcade gratis, rápidos y adictivos.',
  'Multijugador .io': 'Compite en vivo contra jugadores de todo el mundo en juegos .io gratis: crece, sobrevive y llega al primer lugar.',
  'Multijugador': 'Juega con amigos o con gente de todo el mundo en juegos multijugador gratis y sin instalar.',
  'Combinar 3': 'Combina joyas, dulces y frutas de 3 en 3. Juegos de combinar gratis, relajantes y llenos de niveles.',
  'Moda y belleza': 'Viste, maquilla y decora: juegos de moda y belleza gratis para dar rienda suelta a tu creatividad.',
  'Vestir': 'Crea looks, combina ropa y diseña estilos únicos en juegos de vestir gratis.',
  'Cocina': 'Prepara recetas, atiende clientes y maneja tu propio restaurante en juegos de cocina gratis.',
  'Infantiles': 'Juegos sencillos, coloridos y divertidos para los más pequeños de la casa, con supervisión de un adulto.',
  'Educativos': 'Aprende jugando: matemáticas, idiomas, memoria y más en juegos educativos gratis.',
  'De mesa': 'Ajedrez, damas, ludo y otros clásicos de mesa para jugar gratis en línea.',
  'Cartas': 'Solitario, póquer sin apuestas, uno y más: juegos de cartas gratis para pasar el rato.',
  'Plataformas': 'Corre, salta y esquiva obstáculos en juegos de plataformas gratis al estilo de los clásicos.',
  'Simulación': 'Maneja, construye, cultiva o administra: juegos de simulación gratis para vivir otras vidas.',
  'Habilidad': 'Reflejos, precisión y paciencia: juegos de habilidad gratis para ponerte a prueba.',
  'Burbujas': 'Apunta, combina colores y revienta burbujas en juegos clásicos de burbujas gratis.',
  'Zombis': 'Sobrevive a las hordas de zombis con estrategia y puntería en juegos de zombis gratis.',
  'Peleas': 'Golpes, combos y poderes especiales en juegos de peleas gratis para jugar al instante.',
  'Correr': 'Corre sin parar, esquiva obstáculos y junta monedas en juegos de correr infinitos y gratis.',
  'Clásicos': 'Los juegos de siempre, renovados: clásicos gratis para jugar en el navegador.',
  'Ajedrez': 'Mueve tus piezas y entrena tu estrategia con juegos de ajedrez gratis.',
  'Solitario': 'El clásico solitario y sus variantes, gratis y sin instalar.',
};
const catsPro = async () => { const t = await proVisibles(), m = {}; for (const g of t) (m[g.cat] = m[g.cat] || []).push(g); return Object.entries(m).filter(([, l]) => l.length >= 6).sort((a, b) => b[1].length - a[1].length); };
const CSS_NEON = `<style>body{font-family:system-ui,sans-serif;max-width:980px;margin:0 auto;padding:22px 16px 60px;line-height:1.6;color:#f3f0ff;background:radial-gradient(circle at 15% 0,rgba(255,61,240,.22),transparent 40%),radial-gradient(circle at 90% 20%,rgba(34,230,255,.18),transparent 45%),radial-gradient(circle at 50% 0,#25106b,#0c0830 55%,#04030f) fixed;font-size:17px}a{color:#22e6ff}h1{line-height:1.25;text-shadow:0 0 14px rgba(255,61,240,.5)}h2{color:#fde68a}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}.t{display:block;text-decoration:none;color:inherit;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}.t img{width:100%;aspect-ratio:1;object-fit:cover;display:block}.t span{display:block;padding:6px 8px;font-weight:700;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chips a{display:inline-block;margin:4px;padding:6px 12px;border-radius:999px;border:1px solid rgba(139,92,246,.5);text-decoration:none;color:#e9e4ff}.miga{font-size:.85rem;opacity:.8}.btn{display:block;text-align:center;padding:14px;border-radius:14px;background:linear-gradient(90deg,#22e6ff,#8b5cf6,#ff3df0);color:#fff;font-weight:800;text-decoration:none;margin:16px 0}</style>`;
// 🌍 Versión en inglés de las páginas de juegos (para que nos encuentren en todo el mundo)
const CAT_EN = (() => { const m = { 'Moda y belleza': 'Dress-up & Fashion', 'Carros': 'Car', 'De mesa': 'Board', 'Combinar 3': 'Match-3', 'Multijugador .io': '.io Multiplayer', 'Objetos ocultos': 'Hidden Object', 'Defensa de torres': 'Tower Defense', 'Bloques': 'Block', 'Burbujas': 'Bubble Shooter', 'Idle': 'Idle', '3D': '3D' }; for (const [k, v] of Object.entries(CAT_ES)) if (!m[v]) m[v] = k.replace(/(^|[\s-])\w/g, x => x.toUpperCase()); return m; })();
const catEn = c => CAT_EN[c] || c;
// 🌍 Textos de las páginas en otros idiomas (la descripción de cada juego se traduce sola, de a poco, con tu IA)
const LANGS = ['en', 'pt', 'fr', 'de', 'it', 'id'];
const EMBEBIBLES = ['arcade-huerto', 'arcade-joyas', 'arcade-n2048', 'arcade-gusanito', 'arcade-buscaminas', 'arcade-sudoku', 'arcade-memoria', 'arcade-bloques', 'edu-ingles', 'trivia-peru', 'fe-personajes'];
const TXT = {
  en: { num: 'en-US', loc: 'en_US', lc: 1, nombre: '🇬🇧 English', slogan: 'Play, laugh, learn and win!', games: 'Games', play: "▶ Play now — it's free", playG: '▶ Play now — free', most: '🔥 Most played this week', cats: '🕹️ Game categories',
    tHome: (s, n) => `${s}: ${n} free online games — play instantly, no download`, dHome: n => `Play ${n}+ free online games on your phone, tablet or PC: racing, shooting, puzzle, sports, strategy and more. No download, no sign-up.`,
    h1Home: s => `${s}: free online games for everyone`, introHome: n => `More than <b>${n} free games</b> you can play instantly in your browser — on your phone, tablet or computer. No downloads, no sign-up needed.`,
    whyT: s => `Why play on ${s}?`, why: ['<b>Thousands of games</b> from top studios, updated every week.', '<b>Weekly tournaments</b> with in-game coin prizes and a monthly <a href="/campeones?hl=en">Hall of Fame</a>.', '<b>Our own originals</b> like GLORY BROWN (online 1v1 and 2v2 battles), Garden Defender and Jewels.', '<b>Daily rewards</b>, streaks and challenges to share with friends.', 'Works on any device. Install it as an app in one tap.'],
    tCats: (n, s) => `Free online games by category: ${n} games, no download · ${s}`, h1Cats: 'Free online games by category', seeAll: (n, c) => `See all ${n} ${c} games`,
    freeCat: c => `Free ${c} games`, introCat: c => `The best free ${c} games online: play them instantly in your browser, on mobile or PC, with no download and no sign-up. We pick the most played ones every week so you always find something fun.`, mostCat: (n, c) => `We have <b>${n} ${c} games</b>. Most played this week:`,
    tGame: (t, s) => `${t}: play free online · ${s}`, gTail: c => `Free ${c} game, no download, on mobile and PC.`, gMeta: c => `${c} · Free · No download · Mobile and PC`, howT: 'How to play',
    how: (c, n) => `Tap <b>Play now</b> and the game opens right in your browser. It works on phones, tablets and computers. If it's your first time, give it a few seconds to load. You can also find more ${c} games below, or browse all ${n} free games.`, more: c => `More ${c} games`, third: 'Game by a third-party studio, provided by an authorized distributor.', allCats: 'All categories', about: 'About', contact: 'Contact', privacy: 'Privacy' },
  pt: { num: 'pt-BR', loc: 'pt_BR', lc: 1, nombre: '🇧🇷 Português', slogan: 'Jogue, ria, aprenda e ganhe!', games: 'Jogos', play: '▶ Jogar agora — é grátis', playG: '▶ Jogar agora — grátis', most: '🔥 Mais jogados da semana', cats: '🕹️ Categorias de jogos',
    tHome: (s, n) => `${s}: ${n} jogos online grátis — jogue na hora, sem baixar`, dHome: n => `Jogue mais de ${n} jogos online grátis no celular, tablet ou PC: corrida, tiro, quebra-cabeça, esportes, estratégia e muito mais. Sem baixar e sem cadastro.`,
    h1Home: s => `${s}: jogos online grátis para todos`, introHome: n => `Mais de <b>${n} jogos grátis</b> para jogar na hora no navegador — no celular, tablet ou computador. Sem baixar nada e sem cadastro.`,
    whyT: s => `Por que jogar no ${s}?`, why: ['<b>Milhares de jogos</b> dos melhores estúdios, atualizados toda semana.', '<b>Torneios semanais</b> com prêmios em moedas do jogo e um <a href="/campeones?hl=pt">Hall da Fama</a> mensal.', '<b>Jogos próprios</b> como GLORY BROWN (batalhas online 1x1 e 2x2), Huerto Defensor e Joias.', '<b>Prêmios diários</b>, sequências e desafios para compartilhar com amigos.', 'Funciona em qualquer aparelho. Instale como app com um toque.'],
    tCats: (n, s) => `Jogos online grátis por categoria: ${n} jogos, sem baixar · ${s}`, h1Cats: 'Jogos online grátis por categoria', seeAll: (n, c) => `Ver os ${n} jogos de ${c}`,
    freeCat: c => `Jogos de ${c} grátis`, introCat: c => `Os melhores jogos de ${c} grátis: jogue na hora no navegador, no celular ou PC, sem baixar e sem cadastro. Toda semana destacamos os mais jogados para você sempre achar algo divertido.`, mostCat: (n, c) => `Temos <b>${n} jogos de ${c}</b>. Os mais jogados da semana:`,
    tGame: (t, s) => `${t}: jogue grátis online · ${s}`, gTail: c => `Jogo de ${c} grátis, sem baixar, no celular e PC.`, gMeta: c => `${c} · Grátis · Sem baixar · Celular e PC`, howT: 'Como jogar',
    how: (c, n) => `Toque em <b>Jogar agora</b> e o jogo abre direto no navegador. Funciona em celulares, tablets e computadores. Na primeira vez, espere alguns segundos para carregar. Veja mais jogos de ${c} abaixo ou explore todos os ${n} jogos grátis.`, more: c => `Mais jogos de ${c}`, third: 'Jogo de um estúdio externo, oferecido por um distribuidor autorizado.', allCats: 'Todas as categorias', about: 'Sobre nós', contact: 'Contato', privacy: 'Privacidade' },
  fr: { num: 'fr-FR', loc: 'fr_FR', lc: 1, nombre: '🇫🇷 Français', slogan: 'Joue, ris, apprends et gagne !', games: 'Jeux', play: "▶ Jouer maintenant — c'est gratuit", playG: '▶ Jouer maintenant — gratuit', most: '🔥 Les plus joués cette semaine', cats: '🕹️ Catégories de jeux',
    tHome: (s, n) => `${s} : ${n} jeux en ligne gratuits — joue tout de suite, sans téléchargement`, dHome: n => `Plus de ${n} jeux en ligne gratuits sur mobile, tablette ou PC : course, tir, puzzle, sport, stratégie et plus. Sans téléchargement ni inscription.`,
    h1Home: s => `${s} : des jeux en ligne gratuits pour tous`, introHome: n => `Plus de <b>${n} jeux gratuits</b> à lancer tout de suite dans ton navigateur — sur mobile, tablette ou ordinateur. Sans téléchargement, sans inscription.`,
    whyT: s => `Pourquoi jouer sur ${s} ?`, why: ['<b>Des milliers de jeux</b> des meilleurs studios, mis à jour chaque semaine.', '<b>Tournois hebdomadaires</b> avec des pièces en jeu à gagner et un <a href="/campeones?hl=fr">Panthéon</a> mensuel.', '<b>Nos propres jeux</b> comme GLORY BROWN (combats en ligne 1c1 et 2c2), Huerto Defensor et Joyaux.', '<b>Récompenses quotidiennes</b>, séries et défis à partager avec tes amis.', "Marche sur tous les appareils. Installe-le comme une appli en un clic."],
    tCats: (n, s) => `Jeux en ligne gratuits par catégorie : ${n} jeux, sans téléchargement · ${s}`, h1Cats: 'Jeux en ligne gratuits par catégorie', seeAll: (n, c) => `Voir les ${n} jeux de ${c}`,
    freeCat: c => `Jeux de ${c} gratuits`, introCat: c => `Les meilleurs jeux de ${c} gratuits : joue tout de suite dans ton navigateur, sur mobile ou PC, sans téléchargement ni inscription. Chaque semaine, on met en avant les plus joués.`, mostCat: (n, c) => `Nous avons <b>${n} jeux de ${c}</b>. Les plus joués cette semaine :`,
    tGame: (t, s) => `${t} : jouer gratuitement en ligne · ${s}`, gTail: c => `Jeu de ${c} gratuit, sans téléchargement, sur mobile et PC.`, gMeta: c => `${c} · Gratuit · Sans téléchargement · Mobile et PC`, howT: 'Comment jouer',
    how: (c, n) => `Appuie sur <b>Jouer maintenant</b> et le jeu s'ouvre directement dans ton navigateur. Il marche sur téléphone, tablette et ordinateur. La première fois, attends quelques secondes le chargement. Découvre d'autres jeux de ${c} ci-dessous ou parcours les ${n} jeux gratuits.`, more: c => `Plus de jeux de ${c}`, third: "Jeu d'un studio externe, proposé par un distributeur autorisé.", allCats: 'Toutes les catégories', about: 'À propos', contact: 'Contact', privacy: 'Confidentialité' },
  de: { num: 'de-DE', loc: 'de_DE', lc: 0, nombre: '🇩🇪 Deutsch', slogan: 'Spielen, lachen, lernen und gewinnen!', games: 'Spiele', play: '▶ Jetzt spielen — kostenlos', playG: '▶ Jetzt kostenlos spielen', most: '🔥 Diese Woche am meisten gespielt', cats: '🕹️ Spielkategorien',
    tHome: (s, n) => `${s}: ${n} kostenlose Online-Spiele — sofort spielen, ohne Download`, dHome: n => `Über ${n} kostenlose Online-Spiele für Handy, Tablet und PC: Rennen, Shooter, Puzzle, Sport, Strategie und mehr. Ohne Download, ohne Anmeldung.`,
    h1Home: s => `${s}: kostenlose Online-Spiele für alle`, introHome: n => `Mehr als <b>${n} kostenlose Spiele</b>, die du sofort im Browser spielen kannst — auf Handy, Tablet oder Computer. Ohne Download, ohne Anmeldung.`,
    whyT: s => `Warum auf ${s} spielen?`, why: ['<b>Tausende Spiele</b> von Top-Studios, jede Woche aktualisiert.', '<b>Wöchentliche Turniere</b> mit Münzen im Spiel als Preis und eine monatliche <a href="/campeones?hl=de">Ruhmeshalle</a>.', '<b>Eigene Spiele</b> wie GLORY BROWN (Online-Kämpfe 1 gegen 1 und 2 gegen 2), Huerto Defensor und Juwelen.', '<b>Tägliche Belohnungen</b>, Serien und Herausforderungen für deine Freunde.', 'Läuft auf jedem Gerät. Mit einem Tipp als App installieren.'],
    tCats: (n, s) => `Kostenlose Online-Spiele nach Kategorie: ${n} Spiele ohne Download · ${s}`, h1Cats: 'Kostenlose Online-Spiele nach Kategorie', seeAll: (n, c) => `Alle ${n} Spiele: ${c}`,
    freeCat: c => `Kostenlose ${c}-Spiele`, introCat: c => `Die besten kostenlosen ${c}-Spiele: sofort im Browser spielen, auf Handy oder PC, ohne Download und ohne Anmeldung. Jede Woche zeigen wir die beliebtesten zuerst.`, mostCat: (n, c) => `Wir haben <b>${n} ${c}-Spiele</b>. Diese Woche am meisten gespielt:`,
    tGame: (t, s) => `${t}: kostenlos online spielen · ${s}`, gTail: c => `Kostenloses ${c}-Spiel ohne Download, für Handy und PC.`, gMeta: c => `${c} · Kostenlos · Ohne Download · Handy und PC`, howT: "So wird's gespielt",
    how: (c, n) => `Tippe auf <b>Jetzt spielen</b> und das Spiel öffnet sich direkt im Browser. Es läuft auf Handy, Tablet und Computer. Beim ersten Mal kann das Laden ein paar Sekunden dauern. Unten findest du weitere ${c}-Spiele, oder entdecke alle ${n} kostenlosen Spiele.`, more: c => `Weitere ${c}-Spiele`, third: 'Spiel eines externen Studios, bereitgestellt von einem autorisierten Vertriebspartner.', allCats: 'Alle Kategorien', about: 'Über uns', contact: 'Kontakt', privacy: 'Datenschutz' },
  it: { num: 'it-IT', loc: 'it_IT', lc: 1, nombre: '🇮🇹 Italiano', slogan: 'Gioca, ridi, impara e vinci!', games: 'Giochi', play: '▶ Gioca ora — è gratis', playG: '▶ Gioca ora — gratis', most: '🔥 I più giocati della settimana', cats: '🕹️ Categorie di giochi',
    tHome: (s, n) => `${s}: ${n} giochi online gratis — gioca subito, senza scaricare`, dHome: n => `Oltre ${n} giochi online gratis su telefono, tablet o PC: corse, sparatutto, puzzle, sport, strategia e altro. Senza download né registrazione.`,
    h1Home: s => `${s}: giochi online gratis per tutti`, introHome: n => `Più di <b>${n} giochi gratis</b> da giocare subito nel browser — su telefono, tablet o computer. Senza scaricare nulla e senza registrazione.`,
    whyT: s => `Perché giocare su ${s}?`, why: ['<b>Migliaia di giochi</b> dei migliori studi, aggiornati ogni settimana.', '<b>Tornei settimanali</b> con monete di gioco in palio e una <a href="/campeones?hl=it">Hall of Fame</a> mensile.', '<b>Giochi originali</b> come GLORY BROWN (sfide online 1 contro 1 e 2 contro 2), Huerto Defensor e Gioielli.', '<b>Premi giornalieri</b>, serie e sfide da condividere con gli amici.', "Funziona su ogni dispositivo. Installalo come app con un tocco."],
    tCats: (n, s) => `Giochi online gratis per categoria: ${n} giochi, senza download · ${s}`, h1Cats: 'Giochi online gratis per categoria', seeAll: (n, c) => `Vedi tutti i ${n} giochi di ${c}`,
    freeCat: c => `Giochi di ${c} gratis`, introCat: c => `I migliori giochi di ${c} gratis: giocali subito nel browser, su telefono o PC, senza download e senza registrazione. Ogni settimana mettiamo in evidenza i più giocati.`, mostCat: (n, c) => `Abbiamo <b>${n} giochi di ${c}</b>. I più giocati questa settimana:`,
    tGame: (t, s) => `${t}: gioca gratis online · ${s}`, gTail: c => `Gioco di ${c} gratis, senza download, su telefono e PC.`, gMeta: c => `${c} · Gratis · Senza download · Telefono e PC`, howT: 'Come si gioca',
    how: (c, n) => `Tocca <b>Gioca ora</b> e il gioco si apre direttamente nel browser. Funziona su telefono, tablet e computer. La prima volta aspetta qualche secondo per il caricamento. Qui sotto trovi altri giochi di ${c}, oppure scopri tutti i ${n} giochi gratis.`, more: c => `Altri giochi di ${c}`, third: 'Gioco di uno studio esterno, offerto da un distributore autorizzato.', allCats: 'Tutte le categorie', about: 'Chi siamo', contact: 'Contatti', privacy: 'Privacy' },
  id: { num: 'id-ID', loc: 'id_ID', lc: 1, nombre: '🇮🇩 Bahasa Indonesia', slogan: 'Main, tertawa, belajar dan menang!', games: 'Game', play: '▶ Main sekarang — gratis', playG: '▶ Main sekarang — gratis', most: '🔥 Paling banyak dimainkan minggu ini', cats: '🕹️ Kategori game',
    tHome: (s, n) => `${s}: ${n} game online gratis — langsung main tanpa download`, dHome: n => `Mainkan lebih dari ${n} game online gratis di HP, tablet atau PC: balapan, tembak-tembakan, puzzle, olahraga, strategi dan lainnya. Tanpa download, tanpa daftar.`,
    h1Home: s => `${s}: game online gratis untuk semua`, introHome: n => `Lebih dari <b>${n} game gratis</b> yang bisa langsung dimainkan di browser — di HP, tablet atau komputer. Tanpa download dan tanpa daftar.`,
    whyT: s => `Kenapa main di ${s}?`, why: ['<b>Ribuan game</b> dari studio terbaik, diperbarui setiap minggu.', '<b>Turnamen mingguan</b> dengan hadiah koin dalam game dan <a href="/campeones?hl=id">Hall of Fame</a> bulanan.', '<b>Game buatan kami</b> seperti GLORY BROWN (pertarungan online 1v1 dan 2v2), Huerto Defensor dan Permata.', '<b>Hadiah harian</b>, streak dan tantangan untuk dibagikan ke teman.', 'Bisa di semua perangkat. Pasang sebagai aplikasi dengan sekali ketuk.'],
    tCats: (n, s) => `Game online gratis per kategori: ${n} game tanpa download · ${s}`, h1Cats: 'Game online gratis per kategori', seeAll: (n, c) => `Lihat semua ${n} game ${c}`,
    freeCat: c => `Game ${c} gratis`, introCat: c => `Game ${c} gratis terbaik: langsung main di browser, di HP atau PC, tanpa download dan tanpa daftar. Setiap minggu kami tampilkan yang paling banyak dimainkan.`, mostCat: (n, c) => `Ada <b>${n} game ${c}</b>. Paling banyak dimainkan minggu ini:`,
    tGame: (t, s) => `${t}: main gratis online · ${s}`, gTail: c => `Game ${c} gratis, tanpa download, di HP dan PC.`, gMeta: c => `${c} · Gratis · Tanpa download · HP dan PC`, howT: 'Cara main',
    how: (c, n) => `Ketuk <b>Main sekarang</b> dan game langsung terbuka di browser. Bisa di HP, tablet dan komputer. Pertama kali, tunggu beberapa detik sampai selesai memuat. Temukan game ${c} lainnya di bawah, atau jelajahi semua ${n} game gratis.`, more: c => `Game ${c} lainnya`, third: 'Game dari studio luar, disediakan oleh distributor resmi.', allCats: 'Semua kategori', about: 'Tentang kami', contact: 'Kontak', privacy: 'Privasi' },
};
const trDe = (lang, src) => src ? q1('select dst from i18n where lang=? and src=?', lang, src)?.dst || '' : '';
const descL = (g, l) => !g.d ? '' : l === 'en' ? (/[áéíóúñ¿¡]/i.test(g.d) ? '' : g.d) : trDe(l, g.d);
const catL = (c, l) => l === 'en' ? catEn(c) : (trDe(l, catEn(c)) || catEn(c)).slice(0, 40);
const altDe = (k, x) => { const es = k === 'home' ? '/' : k === 'cats' ? '/juegos' : k === 'cat' ? '/juegos/' + slugDe(x) : '/juego/' + x, o = { es };
  for (const l of LANGS) o[l] = k === 'home' ? '/' + l : k === 'cats' ? `/${l}/games` : k === 'cat' ? `/${l}/games/` + slugDe(catEn(x)) : `/${l}/game/` + x; o['x-default'] = es; return o; };
const pieIdioma = L => { const T = TXT[L]; return `<p class="miga" style="margin-top:30px"><a href="/${L}">🎮 Yupitok</a> · <a href="/${L}/games">🕹️ ${T.allCats}</a> · <a href="/nosotros.html?hl=${L}">${T.about}</a> · <a href="/contacto.html?hl=${L}">${T.contact}</a> · <a href="/privacidad.html?hl=${L}">${T.privacy}</a></p><p class="miga">🌍 <a href="/" hreflang="es">🇪🇸 Español</a> · ${LANGS.filter(l => l !== L).map(l => `<a href="/${l}" hreflang="${l}">${TXT[l].nombre}</a>`).join(' · ')}</p><script>try{localStorage.setItem('lang','${L}')}catch(e){}</script></body></html>`; };
const PIE_NEON = `<p class="miga" style="margin-top:30px"><a href="/">🎮 Yupitok</a> · <a href="/juegos">🕹️ Todas las categorías</a> · <a href="/guias">📝 Guías</a> · <a href="/campeones">👑 Salón de la Fama</a> · <a href="/para-tu-web">🧩 Para tu web</a> · <a href="/prensa">📰 Prensa</a> · 🌍 <a href="/en" hreflang="en">English</a> · <a href="/pt" hreflang="pt">Português</a> · <a href="/fr" hreflang="fr">Français</a> · <a href="/de" hreflang="de">Deutsch</a> · <a href="/it" hreflang="it">Italiano</a> · <a href="/id" hreflang="id">Indonesia</a> · <a href="/nosotros.html">Quiénes somos</a> · <a href="/contacto.html">Contacto</a> · <a href="/privacidad.html">Privacidad</a></p><script src="/i18n.js?v=5"></script></body></html>`;
const hrefl = alt => alt ? Object.entries(alt).map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${esc(PUBLIC_URL + p)}">`).join('') : '';
const headNeon = (t, d, url, ld, alt, lang = 'es') => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t)}</title><meta name="description" content="${esc(d)}"><link rel="canonical" href="${esc(url)}">${hrefl(alt)}<meta property="og:type" content="website"><meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(d)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(PUBLIC_URL + '/og/general.png')}"><link rel="icon" href="/icon.png?v=3">${(Array.isArray(ld) ? ld : ld ? [ld] : []).map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('')}${CSS_NEON}</head><body>`;
const migas = l => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: l.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: PUBLIC_URL + u })) });
// Juegos ocultos (reportados como "no carga" o escondidos por el dueño) y descripción en español
// 📝 Guías: las del archivo + las que escribe el agente Creativo y TÚ apruebas (solo HTML simple y enlaces internos)
const guiasTodas = () => { let G = []; try { G = JSON.parse(fs.readFileSync(path.join(__dirname, 'guias.json'), 'utf8')).guias; } catch (e) {} const ya = new Set(G.map(x => x.slug)); return [...G, ...getS('guiasExtra', []).filter(x => !ya.has(x.slug))]; };
const limpiaHtml = h => String(h || '').slice(0, 20000).replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, '').replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (m, t, at) => { t = t.toLowerCase(); const cierre = m[1] === '/';
  if (['p', 'h2', 'h3', 'ul', 'ol', 'li', 'b', 'i', 'strong', 'em', 'br'].includes(t)) return cierre ? `</${t}>` : (t === 'ol' && /start="?(\d{1,3})/.test(at) ? `<ol start="${/start="?(\d{1,3})/.exec(at)[1]}">` : `<${t}>`);
  if (t === 'a') { if (cierre) return '</a>'; const hr = (/href\s*=\s*"([^"]*)"/i.exec(at) || [])[1] || ''; return /^\/[a-z0-9/?=&_.-]*$/i.test(hr) ? `<a href="${hr}">` : '<a>'; } return ''; });

// ---------- 💎 Yupicoins: libro de movimientos (1 Yupicoin = 0.01 USD de referencia) ----------
// Jugando se ganan como máximo 30 al día (entrar cada día, partidas, misiones, logros, niveles, torneo).
// Las tareas de anunciantes y los depósitos no tienen ese tope. Se gastan solo dentro de Yupitok y no se cobran.
const YC = () => Object.assign({ topeDia: 30, topeIp: 150, valorUsd: 0.01 }, getS('yupicoins', {}));
const YC_JUEGO = { diario: 5, partida: 1, mision: 3, logro: 3, nivel: 5 };
if (getS('ycVer', 0) !== 2) { try { run('delete from yc_mov'); run('delete from yc_alerta'); } catch (e) {} setS('ycVer', 2); setS('yupicoins', {}); }
const ycSaldo = perfil => q1('select coalesce(sum(monto),0) s from yc_mov where perfil=?', perfil).s;
const ycHoyJuego = (col, v) => q1(`select coalesce(sum(monto),0) s from yc_mov where ${col}=? and tipo='ganado' and motivo like 'juego:%' and date(created_at,'-5 hours')=?`, v, hoyPeru()).s;
function ycDar(perfil, monto, motivo, ip, cat = 'juego') { // devuelve cuántas se dieron de verdad
  monto = Math.floor(+monto) || 0; if (monto <= 0) return 0; const C = YC(), ipc = ipCorta(ip || '');
  if (cat === 'juego') {
    const ok = Math.max(0, Math.min(monto, C.topeDia - ycHoyJuego('perfil', perfil), C.topeIp - ycHoyJuego('ip', ipc)));
    if (ok < monto && ycHoyJuego('ip', ipc) >= C.topeIp && !q1("select 1 from yc_alerta where perfil=? and created_at>=datetime('now','-12 hours')", perfil)) run('insert into yc_alerta(perfil,detalle) values(?,?)', perfil, `Muchas cuentas ganando Yupicoins desde la misma conexión (${ipc})`);
    monto = ok;
  }
  if (monto > 0) run("insert into yc_mov(perfil,tipo,monto,motivo,ip) values(?,'ganado',?,?,?)", perfil, monto, cat + ':' + motivo, ipc);
  return monto;
}
function ycGastar(perfil, monto, motivo, ip) { monto = Math.floor(+monto) || 0; if (monto <= 0 || ycSaldo(perfil) < monto) return false; run("insert into yc_mov(perfil,tipo,monto,motivo,ip) values(?,'gastado',?,?,?)", perfil, -monto, motivo, ipCorta(ip || '')); return true; }
// 🛍️ Tienda Yupitok: cosas solo visuales que se lucen en los rankings (marco del avatar, título y color del nombre)
const TIENDA = [
  ['m-oro', 'marco', '🟡 Marco dorado', 60, '0 0 0 2px #ffd23f'], ['m-neon', 'marco', '💠 Marco neón', 90, '0 0 0 2px #22e6ff,0 0 8px #22e6ff'], ['m-fuego', 'marco', '🔥 Marco de fuego', 120, '0 0 0 2px #ff7a1a,0 0 10px #ff3d00'],
  ['m-arcoiris', 'marco', '🌈 Marco arcoíris', 200, '0 0 0 2px #ff5fa2,0 0 0 4px #ffd23f,0 0 0 6px #22e6ff'], ['m-diamante', 'marco', '💎 Marco diamante', 300, '0 0 0 2px #b9f2ff,0 0 14px #b9f2ff'],
  ['t-gamer', 'titulo', '🎮 Gamer', 30], ['t-huerto', 'titulo', '🌱 Rey del Huerto', 60], ['t-joyas', 'titulo', '💎 Maestro de Joyas', 60], ['t-glory', 'titulo', '⚔️ Guerrero GLORY', 60], ['t-cerebro', 'titulo', '🧠 Cerebrito', 60], ['t-leyenda', 'titulo', '👑 Leyenda', 250],
  ['c-oro', 'color', '🟨 Nombre dorado', 40, 'color:#ffd23f'], ['c-cian', 'color', '🟦 Nombre cian', 40, 'color:#22e6ff'], ['c-rosa', 'color', '🟪 Nombre rosa', 40, 'color:#ff7ac0'], ['c-verde', 'color', '🟩 Nombre verde', 40, 'color:#4ade80'],
  ['c-arcoiris', 'color', '🌈 Nombre arcoíris', 150, 'background:linear-gradient(90deg,#ff5fa2,#ffd23f,#22e6ff);-webkit-background-clip:text;background-clip:text;color:transparent'],
].map(([id, tipo, nombre, precio, css]) => ({ id, tipo, nombre, precio, css: css || '' }));
const TIENDA_M = new Map(TIENDA.map(x => [x.id, x]));
const uidArcade = uid => crypto.createHash('sha256').update(String(uid || '')).digest('hex').slice(0, 16);
const estiloCss = r => r ? { m: TIENDA_M.get(r.marco)?.css || '', t: TIENDA_M.get(r.titulo)?.nombre || '', c: TIENDA_M.get(r.color)?.css || '' } : null;
const conEstilo = filas => { if (!filas.length) return filas; const E = new Map(q(`select * from yc_estilo where uidh in (${filas.map(() => '?').join(',')})`, ...filas.map(f => f.uid)).map(r => [r.uidh, r])); return filas.map(f => ({ ...f, est: estiloCss(E.get(f.uid)) })); };
const ycEstado = perfil => { const C = YC(); return { saldo: ycSaldo(perfil), hoy: ycHoyJuego('perfil', perfil), tope: C.topeDia, valorUsd: C.valorUsd }; };
// 📺 Yupitok TV: listas y videos de YouTube que elige el dueño (reproductor oficial de YouTube, contenido legal)
function tvParse(texto) {
  const out = [];
  for (const l of String(texto || '').split(/\r?\n/)) {
    const [a, b] = l.includes('|') ? l.split('|') : ['', l], u = (b || '').trim(), t = clip(textoP(a).trim(), 60); if (!u) continue;
    let m;
    if ((m = /[?&]list=([A-Za-z0-9_-]{10,64})/.exec(u))) out.push({ t: t || 'Lista', k: 'l', id: m[1] });
    else if ((m = /youtube\.com\/channel\/UC([A-Za-z0-9_-]{22})/.exec(u))) out.push({ t: t || 'Canal', k: 'l', id: 'UU' + m[1] });
    else if ((m = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/.exec(u))) out.push({ t: t || 'Video', k: 'v', id: m[1] });
    if (out.length >= 40) break;
  }
  return out;
}
const proOcultos = () => new Set(q('select id from pro_oculto').map(r => r.id));
const descEs = g => { if (!g.d) return ''; const r = q1("select dst from i18n where lang='es' and src=?", g.d); return r ? r.dst : g.d; };
// ---------- 👑 Campeones del mes (por juego; el top 3 puede mostrar su red social, aprobada por el dueño) ----------
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const REDES_OK = { tiktok: ['TikTok', u => 'https://www.tiktok.com/@' + u], instagram: ['Instagram', u => 'https://www.instagram.com/' + u], youtube: ['YouTube', u => 'https://www.youtube.com/@' + u], facebook: ['Facebook', u => 'https://www.facebook.com/' + u], x: ['X', u => 'https://x.com/' + u], twitch: ['Twitch', u => 'https://www.twitch.tv/' + u], kick: ['Kick', u => 'https://kick.com/' + u] };
function mesPeru(delta = 0) {
  const d = new Date(Date.now() - 5 * 3600e3), y = d.getUTCFullYear(), m = d.getUTCMonth() + delta, a = Date.UTC(y, m, 1), b = Date.UTC(y, m + 1, 1), iso = t => new Date(t + 5 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
  return { mes: new Date(a).toISOString().slice(0, 7), nombre: MESES_ES[new Date(a).getUTCMonth()], desde: iso(a), hasta: iso(b), ini: a + 5 * 3600e3, fin: b + 5 * 3600e3 };
}
const topMes = (juego, M, n = 3) => q(`select uid, nombre, avatar, max(puntos) puntos from arcade where juego=? and created_at>=? and created_at<? group by uid order by puntos desc limit ?`, juego, M.desde, M.hasta, n);
function mesCerrar(M) { // guarda el top 3 de cada juego de un mes ya terminado (una sola vez)
  if (Date.now() < M.fin || getS('mesCerrado', '') >= M.mes) return;
  for (const { juego } of q('select distinct juego from arcade where created_at>=? and created_at<?', M.desde, M.hasta)) topMes(juego, M).forEach((r, i) => run('insert or ignore into campeones(mes, juego, puesto, uid, nombre, avatar, puntos) values(?,?,?,?,?,?,?)', M.mes, juego, i + 1, r.uid, r.nombre, r.avatar, r.puntos));
  topJugadores(M.mes, 3).forEach((r, i) => run('insert or ignore into campeones(mes, juego, puesto, uid, nombre, avatar, puntos) values(?,?,?,?,?,?,?)', M.mes, 'jugador', i + 1, r.uid, r.nombre, r.avatar, r.min));
  for (const { juego } of q('select juego from pro_tiempo where mes=? group by juego having sum(min) >= 30', M.mes)) { const f = fanDe(M.mes, juego); if (f) run('insert or ignore into campeones(mes, juego, puesto, uid, nombre, avatar, puntos) values(?,?,?,?,?,?,?)', M.mes, juego, 1, f.uid, f.nombre, f.avatar, f.min); }
  setS('mesCerrado', M.mes);
}
// 🎮 Tiempo jugado en los juegos profesionales (no podemos ver sus puntajes, pero sí cuánto juega cada persona)
const topJugadores = (mes, n = 10) => q(`select t.uid, coalesce(j.nombre, 'Jugador') nombre, coalesce(j.avatar, 'a01') avatar, sum(t.min) min from pro_tiempo t left join pro_jugador j on j.uid=t.uid where t.mes=? group by t.uid order by min desc limit ?`, mes, n);
const fanDe = (mes, juego) => q1(`select t.uid, coalesce(j.nombre, 'Jugador') nombre, coalesce(j.avatar, 'a01') avatar, t.min from pro_tiempo t left join pro_jugador j on j.uid=t.uid where t.mes=? and t.juego=? order by t.min desc limit 1`, mes, juego);
// Las redes de los ganadores se ven todo el mes siguiente, o solo los primeros 7 días si así lo eliges en el panel
const diasFama = () => getS('famaDias', 0) === 7 ? 7 : 0, finFama = () => diasFama() ? mesPeru().ini + 7 * 864e5 : mesPeru().fin, semanaFama = () => Date.now() < finFama();
const redDe = uid => { if (!semanaFama()) return null; const r = q1("select red, usuario from campeon_red where uid=? and estado='ok'", uid); return r && REDES_OK[r.red] ? { red: REDES_OK[r.red][0], usuario: r.usuario, url: REDES_OK[r.red][1](r.usuario) } : null; };
const sinUid = r => { const { uid, ...x } = r; return x; };
// ---------- Torneo de la semana ----------
const TORNEO_JUEGOS = ['gusanito', 'bloques', 'frutas', 'ladrillos', 'vuela', 'corredor', 'torre', 'n2048'], TORNEO_PREMIOS = [500, 300, 150];
function torneoSemana(delta = 0) {
  const ahora = Date.now() - 5 * 3600e3 + delta * 7 * 864e5, d = new Date(ahora), dia = (d.getUTCDay() + 6) % 7;
  const lunes = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dia), ini = lunes + 5 * 3600e3, fin = ini + 7 * 864e5; // en UTC
  const iso = t => new Date(t).toISOString().slice(0, 19).replace('T', ' '), n = Math.floor(lunes / (7 * 864e5));
  return { semana: new Date(lunes).toISOString().slice(0, 10), juego: TORNEO_JUEGOS[((n % TORNEO_JUEGOS.length) + TORNEO_JUEGOS.length) % TORNEO_JUEGOS.length], desde: iso(ini), hasta: iso(fin), fin };
}
function torneoCerrar(A) { // guarda el top 3 de una semana ya terminada (una sola vez)
  if (Date.now() < A.fin || q1('select 1 from torneo_premios where semana=?', A.semana)) return;
  q(`select uid, max(puntos) p from arcade where juego=? and created_at>=? and created_at<? group by uid order by p desc limit 3`, A.juego, A.desde, A.hasta)
    .forEach((r, i) => run('insert or ignore into torneo_premios(semana, uid, puesto, monedas) values(?,?,?,?)', A.semana, r.uid, i + 1, TORNEO_PREMIOS[i]));
}
// 🔥 Jugadas reales de cada juego (cuenta solo si la persona jugó al menos 30 segundos), últimos 7 días
let JUG = { t: 0, m: new Map() };
const jugadas7 = () => { if (Date.now() - JUG.t > 5 * 60000) { JUG = { t: Date.now(), m: new Map(q("select id, sum(n) n from pro_jugadas where dia >= date('now','-7 days') group by id").map(r => [r.id, r.n])) }; } return JUG.m; };
// ⭐ Los mejores: primero los más jugados en Yupitok esta semana; se completa con los mejores de GamePix (su ranking de calidad)
const topPro = async (n = 12) => { const J7 = jugadas7(), todos = await proVisibles(), jug = todos.filter(g => (J7.get(g.id) || 0) >= 3).map(g => ({ ...g, j: J7.get(g.id) })).sort((a, b) => b.j - a.j);
  const ya = new Set(jug.map(g => g.id)); return [...jug, ...todos.filter(g => !ya.has(g.id)).map(g => ({ ...g, j: J7.get(g.id) || 0 }))].slice(0, n); };
const proVisibles = async () => { const oc = proOcultos(), t = await catalogoPro(); return oc.size ? t.filter(g => !oc.has(g.id)) : t; };
// Traduce de a poco las descripciones de los juegos al español (una sola vez; queda guardado)
setInterval(async () => { try { if (!getS('pro', {}).on) return; const t = await catalogoPro(); const falta = [];
  for (const g of t) { if (falta.length >= 30) break; if (g.d && !/[áéíóúñ¿¡]/i.test(g.d) && !q1("select 1 from i18n where lang='es' and src=?", g.d)) falta.push(g.d); }
  if (falta.length) await traducirFaltan('es', falta); } catch (e) {} }, 8 * 60000);
// 🌍 El original de GamePix ya está en inglés. Traduce de a poco a portugués, francés, alemán, italiano e indonesio
// (un lote de 30 cada 6 min, rotando idiomas; primero los nombres de las categorías y los juegos más jugados)
let rotaL = 0; setInterval(async () => { try { if (!getS('pro', {}).on) return; const l = LANGS.filter(x => x !== 'en')[rotaL++ % (LANGS.length - 1)];
  const cps = (await catsPro()).map(([c]) => catEn(c)).filter(c => !trDe(l, c)); if (cps.length) { await traducirFaltan(l, cps.slice(0, 30)); return; }
  const t = await topPro(5000), falta = []; for (const g of t) { if (falta.length >= 30) break; if (g.d && !/[áéíóúñ¿¡]/i.test(g.d) && !trDe(l, g.d)) falta.push(g.d); }
  if (falta.length) await traducirFaltan(l, falta); } catch (e) {} }, 6 * 60000);
// ---------- Traducción automática (la hace ShortForge con tu IA; aquí se guarda para siempre) ----------
const IDIOMAS = ['en', 'pt', 'fr', 'it', 'de', 'ru', 'ja', 'ko', 'zh', 'id', 'tr'];
const enCurso = new Map(); let usoHoy = { d: '', n: 0 };
async function traducirFaltan(lang, textos) {
  const hoy = new Date().toISOString().slice(0, 10); if (usoHoy.d !== hoy) usoHoy = { d: hoy, n: 0 };
  if (!E.SF_URL || !LOCAL_TOKEN || usoHoy.n > (+E.I18N_MAX_DIA || 6000)) return {};
  const prom = {}, out = {}, pedir = [];
  for (const t of textos) { const k = lang + '|' + t; if (enCurso.has(k)) prom[t] = enCurso.get(k); else pedir.push(t); }
  for (let i = 0; i < pedir.length; i += 30) {
    const lote = pedir.slice(i, i + 30);
    const pr = fetch(E.SF_URL + '/api/traducir', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sf-token': LOCAL_TOKEN }, body: JSON.stringify({ lang, textos: lote }), signal: AbortSignal.timeout(60000) })
      .then(r => r.ok ? r.json() : null).then(j => { const m = {}; (j?.t || []).forEach((d, k) => { if (d && lote[k]) { m[lote[k]] = d; try { run('insert or ignore into i18n(lang,src,dst) values(?,?,?)', lang, lote[k], String(d).slice(0, 800)); } catch (e) {} } }); usoHoy.n += lote.length; return m; }).catch(() => ({}));
    for (const t of lote) { prom[t] = pr.then(m => m[t]); enCurso.set(lang + '|' + t, prom[t]); }
    pr.finally(() => { for (const t of lote) enCurso.delete(lang + '|' + t); });
  }
  for (const t of textos) { const v = await prom[t]; if (v) out[t] = v; }
  return out;
}
// ---------- Google AdSense ----------
const adsCfg = () => getS('ads', {});
const adsScript = () => { const c = adsCfg().client; return /^ca-pub-\d{10,20}$/.test(c || '') ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${c}" crossorigin="anonymous"></script><meta name="google-adsense-account" content="${c}">` : ''; };
// ---------- Páginas legales que pide Google (se llenan con tus datos del panel) ----------
// ---------- Apoya el proyecto: aportes voluntarios (enlaces y direcciones los pone el dueño en el panel) ----------
const APOYO_LINKS = [['kofi', '☕ Ko-fi', '#29abe0'], ['paypal', '💙 PayPal', '#003087'], ['bmac', '🍪 Buy Me a Coffee', '#ffdd00'], ['patreon', '🧡 Patreon', '#ff424d'], ['mercadopago', '💳 Mercado Pago', '#009ee3'], ['otro', '🤝 Otra forma de apoyar', '#7c3aed']];
const REDES_CRIPTO = ['USDT (TRON · TRC20)', 'USDT (BNB Chain · BEP20)', 'USDT (Ethereum · ERC20)', 'USDT (Solana)', 'USDT (Polygon)', 'USDC (Ethereum · ERC20)', 'USDC (Solana)', 'USDC (Base)', 'Bitcoin (BTC)', 'Ethereum (ETH)', 'BNB (BNB Chain)', 'Solana (SOL)', 'TRON (TRX)', 'Litecoin (LTC)', 'Dogecoin (DOGE)', 'XRP', 'TON'];
// Métodos en orden: { tipo: 'enlace' | 'cripto' | 'numero', nombre, valor, red?, titular?, nota? }
function metodosApoyo(a) {
  if (Array.isArray(a.metodos)) return a.metodos;
  const m = APOYO_LINKS.filter(([k]) => a.links?.[k]).map(([k, n]) => ({ tipo: 'enlace', nombre: n.replace(/^\S+\s/, ''), valor: a.links[k] })); // formato anterior
  for (const c of a.cripto || []) m.push({ tipo: 'cripto', nombre: c.red.split(' ')[0], red: c.red, valor: c.dir });
  return m;
}
// Imagen QR de un método: llega como data:image/...;base64 y se guarda como archivo (no se publica el número).
const QR_DIR = path.join(DATA, 'apoyo_qr');
function guardarQR(q) {
  if (!q) return null; if (/^[a-f0-9]{20}\.(png|jpg|webp)$/.test(q)) return fs.existsSync(path.join(QR_DIR, q)) ? q : null;
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(q)); if (!m) throw new Error('El QR debe ser una imagen PNG, JPG o WEBP');
  const buf = Buffer.from(m[2], 'base64'); if (buf.length > 600000) throw new Error('La imagen del QR es muy pesada (máximo 600 KB)');
  const ok = m[1] === 'png' ? buf.slice(0, 4).toString('hex') === '89504e47' : m[1] === 'jpeg' ? buf.slice(0, 2).toString('hex') === 'ffd8' : buf.slice(8, 12).toString() === 'WEBP'; if (!ok) throw new Error('La imagen del QR no es válida');
  const nombre = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20) + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
  fs.mkdirSync(QR_DIR, { recursive: true }); fs.writeFileSync(path.join(QR_DIR, nombre), buf); return nombre;
}
function validarMetodos(lista) {
  const out = [];
  for (const m of (Array.isArray(lista) ? lista : []).slice(0, 12)) {
    const tipo = ['enlace', 'cripto', 'numero'].includes(m.tipo) ? m.tipo : null, valor = String(m.valor || '').trim(), nombre = clip(m.nombre, 40).trim(); if (!tipo) continue;
    const qr = guardarQR(m.qr); if (!valor && !qr) continue;
    if (tipo !== 'cripto' && /^eyJ[\w-]{20,}|[A-Za-z0-9_-]{60,}/.test(valor)) throw new Error(`"${nombre}" tiene algo que parece una clave o token. Bórralo: se publicaría en la página.`);
    if (!nombre) throw new Error('Ponle un nombre a cada método (por ejemplo: Yape, PayPal, USDT)');
    if (tipo === 'enlace' && valor && !/^https:\/\/[^\s"'<>]{4,300}$/.test(valor)) throw new Error(`El enlace de "${nombre}" debe empezar con https://`);
    if (tipo === 'cripto' && !REDES_CRIPTO.includes(m.red)) throw new Error(`Elige la red de "${nombre}"`);
    if (tipo === 'cripto' && valor && !/^[A-Za-z0-9:]{20,110}$/.test(valor)) throw new Error(`Revisa la dirección de "${nombre}": solo letras y números, sin espacios`);
    if (tipo === 'numero' && valor && !/^[A-Za-z0-9@._+\-\s$#]{4,80}$/.test(valor)) throw new Error(`Revisa el número o cuenta de "${nombre}"`);
    out.push({ tipo, nombre, valor, ...(qr ? { qr } : {}), ...(tipo === 'cripto' ? { red: m.red } : {}), ...(tipo === 'numero' && m.titular ? { titular: clip(m.titular, 60).trim() } : {}), ...(m.nota ? { nota: clip(m.nota, 140).trim() } : {}) });
  }
  return out;
}
const COLOR_APOYO = n => { const x = n.toLowerCase(); return /yape/.test(x) ? '#742284' : /plin/.test(x) ? '#00b5e2' : /paypal/.test(x) ? '#003087' : /ko-?fi/.test(x) ? '#29abe0' : /patreon/.test(x) ? '#ff424d' : /mercado/.test(x) ? '#009ee3' : /coffee/.test(x) ? '#ffdd00' : /nequi/.test(x) ? '#da0081' : /pix/.test(x) ? '#32bcad' : /zelle/.test(x) ? '#6d1ed4' : /bizum/.test(x) ? '#05c3dd' : /binance/.test(x) ? '#f0b90b' : /cash ?app/.test(x) ? '#00d632' : /venmo/.test(x) ? '#008cff' : /wise/.test(x) ? '#9fe870' : /banco|bcp|interbank|bbva|scotia|transfer/.test(x) ? '#0f766e' : /usdt|tether/.test(x) ? '#26a17b' : /btc|bitcoin/.test(x) ? '#f7931a' : /eth/.test(x) ? '#627eea' : /sol/.test(x) ? '#9945ff' : '#7c3aed'; };
function paginaApoyo() {
  const a = getS('apoyo', {}), mk = getS('marca', {}), sitio = esc(mk.nombre || 'Yupitok'), met = metodosApoyo(a);
  const paso = (n, t) => `<li><b>${n}.</b> ${t}</li>`;
  const bloques = met.map((m, i) => {
    const col = COLOR_APOYO(m.nombre + ' ' + (m.red || '')), osc = ['#ffdd00', '#f0b90b', '#9fe870'].includes(col) ? '#111' : '#fff', nota = m.nota ? `<p class="w">${esc(m.nota)}</p>` : '';
    const qr = m.qr ? `<div class="qr"><img src="/apoyo-qr/${m.qr}" alt="Código QR de ${esc(m.nombre)}"><a class="ir" href="/apoyo-qr/${m.qr}" download="QR-${esc(m.nombre).replace(/\s+/g, '-')}.${m.qr.split('.').pop()}" style="background:#fff;color:#111">⬇️ Descargar QR</a></div>` : '';
    if (m.qr && !m.valor) return `<details class="m"><summary style="background:${col};color:${osc}">${m.tipo === 'cripto' ? '🪙' : m.tipo === 'numero' ? '📱' : '💳'} ${esc(m.nombre)}${m.tipo === 'cripto' ? ` <small>· ${esc(m.red)}</small>` : ''}</summary><div class="in"><ol>${paso(1, `Abre tu app de <b>${esc(m.nombre)}</b>${m.tipo === 'cripto' ? ' o tu billetera' : ''}.`)}${paso(2, 'Toca la opción para <b>escanear QR</b>.')}${paso(3, 'Si estás en otra pantalla, escanea el código de abajo. Si estás en este mismo celular, toca <b>Descargar QR</b> y elige la imagen desde tu galería dentro de la app.')}${m.tipo === 'cripto' ? paso(4, `Confirma que la red sea <b>${esc(m.red)}</b> y envía el monto que quieras.`) : paso(4, `${m.titular ? `Verifica que el nombre sea <b>${esc(m.titular)}</b> y envía` : 'Envía'} el monto que quieras.`)}</ol>${m.nota ? `<p class="w">${esc(m.nota)}</p>` : ''}${qr}</div></details>`;
    const cuerpo = m.tipo === 'enlace' ? `<ol>${paso(1, `Toca el botón <b>Ir a ${esc(m.nombre)}</b>.`)}${paso(2, 'Elige el monto que tú quieras.')}${paso(3, 'Completa el pago en la página oficial.')}</ol>${nota}<a class="ir" href="${esc(m.valor)}" target="_blank" rel="noopener" style="background:${col};color:${osc}">Ir a ${esc(m.nombre)} ›</a>`
      : m.tipo === 'cripto' ? `<ol>${paso(1, 'Abre tu billetera o tu exchange (Binance, Trust Wallet, etc.).')}${paso(2, `Elige enviar <b>${esc(m.red)}</b>. ⚠️ Usa <b>solo esa red</b>: si eliges otra, el envío se pierde.`)}${paso(3, 'Copia la dirección y pégala en tu billetera.')}${paso(4, 'Revisa los primeros y últimos caracteres y envía el monto que quieras.')}</ol>${nota}<code id="v${i}">${esc(m.valor)}</code><button class="ir" style="background:${col};color:#fff" onclick="cp('v${i}',this)">Copiar dirección</button>`
      : `<ol>${paso(1, `Abre tu app de <b>${esc(m.nombre)}</b>${/banco|bcp|interbank|bbva|scotia|transfer/i.test(m.nombre) ? ' o tu banca por internet' : ''}.`)}${paso(2, /binance/i.test(m.nombre) ? 'Ve a <b>Pagar → Enviar</b> y elige pagar con <b>Pay ID</b>.' : /banco|bcp|interbank|bbva|scotia|transfer/i.test(m.nombre) ? 'Elige <b>transferir a otra cuenta</b>.' : 'Elige enviar o pagar.')}${paso(3, 'Copia el dato de abajo y pégalo.')}${m.titular ? paso(4, `Verifica que el nombre que aparece sea <b>${esc(m.titular)}</b> y envía el monto que quieras.`) : paso(4, 'Envía el monto que quieras.')}</ol>${nota}<code id="v${i}">${esc(m.valor)}</code><button class="ir" style="background:${col};color:#fff" onclick="cp('v${i}',this)">Copiar</button>`;
    return `<details class="m"><summary style="background:${col};color:${osc}">${m.tipo === 'cripto' ? '🪙' : m.tipo === 'numero' ? '📱' : '💳'} ${esc(m.nombre)}${m.tipo === 'cripto' ? ` <small>· ${esc(m.red)}</small>` : ''}</summary><div class="in">${cuerpo}${qr ? `<p class="w" style="margin-top:12px">O escanea su código QR:</p>${qr}` : ''}</div></details>`;
  }).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Apoya el proyecto · ${sitio}</title>${adsScript()}
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:22px 16px 60px;line-height:1.6;color:#f3f0ff;background:radial-gradient(circle at 15% 0,rgba(255,61,240,.22),transparent 40%),radial-gradient(circle at 90% 20%,rgba(34,230,255,.18),transparent 45%),radial-gradient(circle at 50% 0,#25106b,#0c0830 55%,#04030f) fixed}a{color:#22e6ff}h1{text-shadow:0 0 14px rgba(255,61,240,.6)}h1{font-size:1.8rem;margin:.2em 0}.card{background:rgba(14,11,40,.78);border:1px solid rgba(34,230,255,.3);box-shadow:0 0 24px rgba(139,92,246,.2);border-radius:18px;padding:16px;margin:14px 0}.m{margin:10px 0;border-radius:14px;overflow:hidden;background:rgba(0,0,0,.25)}.m summary{list-style:none;cursor:pointer;font-weight:800;padding:14px;font-size:1.08rem;display:flex;justify-content:space-between}.m summary::after{content:'▾'}.m[open] summary::after{content:'▴'}.m summary::-webkit-details-marker{display:none}.in{padding:6px 14px 14px}.in ol{list-style:none;padding:0;margin:6px 0}.in li{margin:5px 0}.ir{display:block;box-sizing:border-box;width:100%;text-align:center;font-weight:800;padding:12px;border-radius:12px;margin-top:8px;text-decoration:none;border:0;font-size:1rem;cursor:pointer}code{display:block;word-break:break-all;font-size:.95rem;margin:8px 0;color:#fde68a;background:rgba(0,0,0,.3);padding:8px;border-radius:8px}.w{font-size:.85rem;opacity:.85}.qr{background:#fff;border-radius:14px;padding:12px;margin-top:10px;text-align:center}.qr img{max-width:100%;width:260px;height:auto;display:block;margin:0 auto}.qr .ir{border:1px solid #ddd}</style>
<script>function cp(id,b){navigator.clipboard.writeText(document.getElementById(id).textContent).then(function(){b.textContent='¡Copiado! ✓';setTimeout(function(){b.textContent=b.textContent.replace('¡Copiado! ✓','Copiado ✓')},1500)})}</script></head><body>
<p><a href="/">← Volver a jugar</a></p><div style="text-align:center;font-size:3rem">💛</div><h1 style="text-align:center">Apoya el proyecto</h1>
<div class="card"><p style="white-space:pre-line;margin:0">${esc(a.mensaje || `Hola 👋 ${mk.nombre || 'Yupitok'} es un proyecto independiente, hecho en Perú con mucho cariño: juegos y tests gratis para todos, sin instalar nada.\n\nSi te gusta lo que hacemos y quieres ayudarnos a seguir creando juegos nuevos, cualquier aporte, por pequeño que sea, es muy bienvenido. Y si no puedes, compartir la página con tus amigos también nos ayuda muchísimo. ¡Gracias de corazón!`)}</p></div>
${met.length ? `<div class="card"><h2 style="margin:0 0 4px;font-size:1.15rem">Elige cómo apoyar</h2><p class="w" style="margin:0">Toca una opción y sigue los pasos.</p>${bloques}</div>` : '<div class="card"><p>Muy pronto podrás apoyarnos desde aquí. Mientras tanto, ¡compartir la página ya es una gran ayuda! 💛</p></div>'}
<div class="card w">Los aportes son <b>voluntarios</b> y no dan ventajas en los juegos: todo sigue siendo gratis para todos. Nunca te pediremos contraseñas, códigos ni datos de tu tarjeta fuera de las apps y páginas oficiales de cada servicio.</div>
<p style="text-align:center"><a href="/">🎮 Volver a jugar</a> · <a href="/nosotros.html">Quiénes somos</a> · <a href="/contacto.html">Contacto</a></p><script src="/i18n.js?v=5"></script></body></html>`;
}
function paginaLegal(tipo) {
  const pv = getS('priv', {}), mk = getS('marca', {}), sitio = esc(mk.nombre || 'Yupitok'), resp = esc(pv.nombre || 'el responsable del sitio'), correo = esc(pv.correo || 'el correo de contacto de la página'), ciudad = esc(pv.ciudad || 'Perú');
  const T = {
    terminos: ['Términos de uso', `<p>Al usar ${sitio} aceptas estos términos. Si no estás de acuerdo, por favor no uses el sitio.</p>
      <h2>1. Qué ofrecemos</h2><p>Tests de entretenimiento, juegos gratuitos (propios y de otros estudios), chat y comunidad. Los resultados de los tests son solo para entretenimiento y no son consejo profesional.</p><p><b>Torneo de la semana:</b> participar es gratis y no requiere ninguna compra. Las Yupicoins son la moneda de Yupitok (1 Yupicoin = 0.01 USD de referencia): se ganan jugando o se compran, se usan solo dentro de Yupitok, no son dinero y no se pueden cambiar por dinero. Los premios en Yupicoins son del juego y no tienen valor en dinero. Si hay un premio de un patrocinador, se indica en la portada y lo entrega ${resp} al ganador, que debe tener 18 años o más; se puede descalificar a quien haga trampa.</p><p><b>Campeones del mes:</b> el top 3 de cada juego aparece en el Salón de la Fama con su apodo y puntaje. Si quiere, puede mostrar su usuario de una red social: lo revisamos antes de publicarlo, puede quitarlo cuando quiera y no publicamos cuentas ofensivas, de apuestas o engañosas.</p>
      <h2>2. Edad</h2><p>Los juegos son para todo público. Las salas de chat, las mesas en vivo, las fotos de perfil y las redes sociales del Salón de la Fama son solo para mayores de 18 años. Los menores de 14 años deben usar el sitio con permiso y supervisión de sus padres o tutores.</p>
      <h2>3. Convivencia</h2><p>No se permite publicar insultos, acoso, contenido sexual, violento o ilegal, datos personales, enlaces, teléfonos ni correos. Moderamos el chat y podemos suspender cuentas que no respeten estas reglas.</p>
      <h2>4. Partidas en línea</h2><p>Si cuando buscas una partida en línea no hay otros jugadores disponibles, después de unos segundos juegas contra un rival controlado por la computadora. Al final de la partida te lo indicamos con 🤖.</p>
      <h2>5. Juegos de terceros</h2><p>Algunos juegos son de otros estudios y se muestran a través de distribuidores autorizados. Sus derechos pertenecen a sus autores.</p>
      <h2>6. Anuncios</h2><p>El sitio es gratis gracias a la publicidad. Algunos anuncios los muestra Google u otros socios, que pueden usar cookies según su propia política.</p>
      <h2>7. Contenido propio</h2><p>Los juegos, personajes, textos e imágenes propios de ${sitio} (incluido GLORY BROWN) están protegidos. No se pueden copiar ni vender sin permiso.</p>
      <h2>8. Cambios</h2><p>Podemos actualizar estos términos. La versión vigente siempre está en esta página.</p>
      <h2>9. Contacto</h2><p>${resp} · ${ciudad} · ${correo}</p>`],
    contacto: ['Contacto', `<p>¿Tienes una pregunta, una idea o quieres reportar algo? Escríbenos.</p><p>🗑️ Para borrar tu cuenta tú mismo, entra a <a href="/borrar-datos.html">Borrar mis datos</a>.</p><p style="font-size:1.2rem"><b>📧 ${correo}</b></p><p>Responsable: ${resp} · ${ciudad}</p><p>Para pedir que borremos tus datos o tu cuenta, escribe a ese correo con el asunto <b>"Borrar mis datos"</b>. Respondemos en un máximo de 10 días hábiles.</p>`],
    'borrar-datos': ['Borrar mis datos', `<p>Puedes borrar tu usuario y tus datos de ${sitio} cuando quieras, también si entraste con <b>Google</b> o <b>Facebook</b>.</p>
      <h2>Opción 1: tú mismo, al instante</h2><ol><li>Abre ${sitio} en el mismo celular o computadora donde entraste a tu usuario.</li><li>Vuelve a esta página y aprieta el botón de abajo.</li><li>Escribe <b>BORRAR</b> para confirmar.</li></ol>
      <div id="bz" style="padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#fff"><p id="bzEst">Revisando…</p><input id="bzC" placeholder="Escribe BORRAR" style="padding:10px;border:1px solid #ccc;border-radius:8px;width:100%;max-width:260px" hidden> <button id="bzB" hidden style="padding:10px 16px;border:0;border-radius:8px;background:#dc2626;color:#fff;font-weight:700;cursor:pointer">🗑️ Borrar mi cuenta y mis datos</button></div>
      <h2>Opción 2: por correo</h2><p>Escribe a <b>${correo}</b> con el asunto <b>"Borrar mis datos"</b> e indica tu nombre de usuario. Lo hacemos en un máximo de 10 días hábiles.</p>
      <h2>Qué se borra</h2><p>Tu usuario, tu progreso, tus fotos subidas, tus amigos y mensajes privados, tus puntajes en los rankings y tu lugar en los clanes. Tus mensajes del chat público quedan como "(mensaje borrado)".</p>
      <h2>Si entraste con Facebook o Google</h2><p>También puedes quitar el permiso a ${sitio}: en Facebook ve a <i>Configuración → Apps y sitios web</i>; en Google ve a <i>myaccount.google.com → Seguridad → Conexiones de terceros</i>.</p>
      <script>(()=>{const g=k=>{try{return localStorage.getItem(k)}catch(e){return null}},tok=g('perfilTok'),us=g('perfilUsuario'),E=document.getElementById('bzEst'),C=document.getElementById('bzC'),B=document.getElementById('bzB');
      if(!tok){E.textContent='En este navegador no hay ningún usuario abierto. Entra a tu usuario en ${sitio} y vuelve aquí, o usa la opción 2.';return}
      E.innerHTML='Usuario abierto aquí: <b></b>';E.querySelector('b').textContent=us||'(tu usuario)';C.hidden=B.hidden=false;
      B.onclick=async()=>{if(C.value.trim().toUpperCase()!=='BORRAR'){alert('Escribe BORRAR para confirmar');return}B.disabled=true;
        const r=await fetch('/api/cuenta/borrar',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tok,uid:g('vid'),confirmar:'BORRAR'})}).then(x=>x.json()).catch(()=>({error:'Sin conexión'}));
        if(r.ok){try{['perfilTok','perfilUsuario','perfilCodigo','miFoto'].forEach(k=>localStorage.removeItem(k))}catch(e){}E.textContent='✅ Listo: tu cuenta y tus datos fueron borrados.';C.hidden=B.hidden=true}else{E.textContent='❌ '+(r.error||'No se pudo borrar');B.disabled=false}}})();</script>`],
    nosotros: ['Quiénes somos', `<p><b>${sitio}</b> es una plataforma latina de entretenimiento gratis: tests para conocerte, miles de juegos, juegos propios como <b>GLORY BROWN: El Choque de los Reinos</b> y <b>Huerto Defensor</b>, chat, clanes y torneos.</p>
      <p>GLORY BROWN nació como homenaje a una abuelita muy querida: la Reina Glory Brown, que protege su reino con amor. Ese cariño es lo que queremos que se sienta en todo el sitio.</p>
      <p>Creamos contenido nuevo cada semana, con identidad latina y en español, para que juegues sin instalar nada desde tu celular, tablet o computadora.</p><p>Responsable: ${resp} · ${ciudad} · ${correo}</p>`],
  }[tipo];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${T[0]} · ${sitio}</title>${adsScript()}<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:0 auto;padding:22px 18px 60px;line-height:1.6;color:#1f2937;background:#fafafa}h1{font-size:1.7rem}h2{font-size:1.1rem;margin-top:1.4em}a{color:#7c3aed}</style></head><body><p><a href="/">← Volver a ${sitio}</a></p><h1>${T[0]}</h1>${T[1]}<p style="margin-top:2em;font-size:.9rem"><a href="/terminos.html">Términos</a> · <a href="/privacidad.html">Privacidad</a> · <a href="/contacto.html">Contacto</a> · <a href="/nosotros.html">Quiénes somos</a></p><script src="/i18n.js?v=5"></script></body></html>`;
}
const json = (req, max = 20000) => new Promise((ok, no) => { let b = ''; req.on('data', c => { b += c; if (b.length > max) { no(new Error('muy grande')); req.destroy(); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { no(new Error('JSON inválido')); } }); });
const csv = rows => { if (!rows.length) return '\ufeffsin datos\n'; const k = Object.keys(rows[0]); const c = v => { v = String(v ?? ''); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return '\ufeff' + [k.join(','), ...rows.map(r => k.map(x => c(r[x])).join(','))].join('\n'); };

const chat = require('./chat').crear({ db, q, q1, run, getS, setS, preguntasTrivia: () => CATALOGO.filter(t => t.tipo === 'trivia').flatMap(t => t.preguntas) });
const FOTOS = require('./fotos'), fotos = FOTOS.crear({ DATA, db, q, q1, run, E, LOCAL_TOKEN });
const amigos = require('./amigos').crear({ db, q, q1, run, revisar: require('./chat').revisar, valido: FOTOS.valido, catalogo: () => CATALOGO,
  notificar: (vid, n) => { if (!VAPID) return; for (const r of q('select id, sub from subscribers where vid=? and active=1 order by id desc limit 3', vid)) webpush.sendNotification(JSON.parse(r.sub), JSON.stringify({ ...n, url: PUBLIC_URL + n.url, tag: 'amigos' }), { vapid: VAPID, TTL: 3600, urgency: 'high' }).catch(e => { if (e.statusCode === 404 || e.statusCode === 410) run('update subscribers set active=0 where id=?', r.id); }); } });
const online = require('./juego_online').crear({ social: () => getS('login', {}), guardarFoto: (buf, uid) => fotos.guardarBuffer(buf, uid), borrarFotos: uid => fotos.borrarDe(uid), datos: DATA, db, q, q1, run, revisar: require('./chat').revisar, apodo: require('./chat').apodo });
const mesas = require('./mesas').crear({ revisar: require('./chat').revisar, apodo: require('./chat').apodo });
const JUEGO = Object.fromEntries(CATALOGO.map(t => [t.id, [t.t, t.d]]));

async function api(req, res, u) {
  const ip = clientIp(req), P = req.method === 'POST';
  if (P && limite(ip, 'api', 240)) return send(res, 429, { error: 'Demasiadas peticiones, espera un momento' });

  // ---- chat en vivo ----
  // ---- Idiomas: la página se traduce sola. Cada texto se traduce UNA vez (con la IA de ShortForge) y queda guardado ----
  if (u.pathname === '/api/i18n' && P) {
    if (limite(ip, 'i18n', 90)) return send(res, 429, { error: 'Más despacio' });
    const b = await json(req, 60000), lang = String(b.lang || ''); if (!IDIOMAS.includes(lang)) return send(res, 400, { error: 'Idioma no soportado' });
    const textos = [...new Set((Array.isArray(b.textos) ? b.textos : []).map(x => String(x)).filter(x => x.length <= 400 && /\p{L}{2,}/u.test(x)))].slice(0, 60);
    const out = {}, faltan = []; for (const t of textos) { const f = q1('select dst from i18n where lang=? and src=?', lang, t); if (f) out[t] = f.dst; else faltan.push(t); }
    if (faltan.length) { const nuevos = await traducirFaltan(lang, faltan); Object.assign(out, nuevos); }
    return send(res, 200, { t: out });
  }
  // ---- Invitaciones: cada jugador tiene su código; gana premios cuando un amigo nuevo juega su primera partida ----
  if (u.pathname.startsWith('/api/ref/') && P) {
    if (limite(ip, 'ref', 60)) return send(res, 429, { error: 'Más despacio' });
    const b = await json(req), uid = clip(b.uid, 40), acc = u.pathname.slice(9); if (!/^[a-z0-9]{8,40}$/.test(uid)) return send(res, 400, { error: 'Falta tu identificador' });
    const miCodigo = () => { let f = q1('select codigo from ref_codigos where uid=?', uid); if (f) return f.codigo; for (let i = 0; i < 8; i++) { const c = Array.from(crypto.randomBytes(6), x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join(''); try { run('insert into ref_codigos(uid,codigo) values(?,?)', uid, c); return c; } catch (e) {} } return null; };
    if (acc === 'yo') { const c = miCodigo(), t = q1('select count(*) n, coalesce(sum(reclamado=0),0) p from ref_altas where codigo=?', c); return send(res, 200, { codigo: c, total: t.n, pendientes: t.p }); }
    if (acc === 'reclamar') { const c = miCodigo(), n = q1('select count(*) n from ref_altas where codigo=? and reclamado=0', c).n; run('update ref_altas set reclamado=1 where codigo=?', c); return send(res, 200, { reclamados: n }); }
    if (acc === 'confirmar') {
      const codigo = String(b.ref || '').toUpperCase(), dueno = q1('select uid from ref_codigos where codigo=?', codigo);
      if (!/^[A-Z2-9]{6}$/.test(codigo) || !dueno || dueno.uid === uid) return send(res, 200, { ok: 0 });
      if (q1('select 1 from ref_altas where nuevo=?', uid) || q1("select 1 from visitors where vid=? and created_at < datetime('now','-2 days') limit 1", uid)) return send(res, 200, { ok: 0 }); // solo jugadores nuevos
      if (q1("select count(*) n from ref_altas where ipt=? and created_at>=datetime('now','-1 day')", ipCorta(ip)).n >= 3) return send(res, 200, { ok: 0 }); // freno a las trampas
      run('insert into ref_altas(nuevo,codigo,ipt) values(?,?,?)', uid, codigo, ipCorta(ip)); return send(res, 200, { ok: 1 });
    }
    return send(res, 404, { error: 'No existe' });
  }
  if (u.pathname === '/api/pro/jugar' && P) { // una jugada real (el navegador la manda tras 30 s de juego); 1 por persona y juego cada 30 min
    const b = await json(req), id = String(b.id || ''); if (!/^[a-f0-9]{12}$/.test(id)) return send(res, 400, { error: 'Juego no válido' });
    if (limite(ip + ':' + id, 'proJ', 1, 30 * 60000) || limite(ip, 'proJt', 40, 3600000)) return send(res, 200, { ok: 0 });
    run("insert into pro_jugadas(id, dia, n) values(?, date('now'), 1) on conflict(id, dia) do update set n = n + 1", id); JUG.m.set(id, (JUG.m.get(id) || 0) + 1);
    return send(res, 200, { ok: 1 });
  }
  if (u.pathname === '/api/pro/tiempo' && P) { // +1 minuto jugado (el navegador lo manda cada minuto mientras se juega de verdad)
    const b = await json(req), id = String(b.id || ''), uq = String(b.uid || ''); if (!/^[a-f0-9]{12}$/.test(id) || !/^[a-z0-9]{8,40}$/.test(uq)) return send(res, 400, { error: 'Datos no válidos' });
    const uh = crypto.createHash('sha256').update(uq).digest('hex').slice(0, 16), dia = hoyPeru();
    if (limite('t:' + uh, 'proT', 1, 50000) || limite(ip, 'proTi', 90, 3600000)) return send(res, 200, { ok: 0 });
    if ((q1('select min from pro_dia where uid=? and dia=?', uh, dia)?.min || 0) >= 240) return send(res, 200, { ok: 0, tope: 1 }); // máximo 4 horas al día
    run("insert into pro_dia(uid, dia, min) values(?,?,1) on conflict(uid, dia) do update set min = min + 1", uh, dia);
    run("insert into pro_tiempo(mes, uid, juego, min) values(?,?,?,1) on conflict(mes, uid, juego) do update set min = min + 1", mesPeru().mes, uh, id);
    const ch = require('./chat'), nombre = ch.apodo(b.nombre) || 'Jugador', avatar = FOTOS.valido(b.avatar) ? b.avatar : 'a01';
    run('insert into pro_jugador(uid, nombre, avatar) values(?,?,?) on conflict(uid) do update set nombre=excluded.nombre, avatar=excluded.avatar', uh, nombre, avatar);
    return send(res, 200, { ok: 1 });
  }
  if (u.pathname === '/api/pro/jugadores') { // jugador del mes (tiempo total) y fan #1 de un juego
    const M = mesPeru(), A = mesPeru(-1); mesCerrar(A); const id = String(u.searchParams.get('id') || '');
    const ant = q("select * from campeones where mes=? and juego='jugador' order by puesto", A.mes).map(r => ({ ...sinUid(r), red: redDe(r.uid) }));
    const fan = /^[a-f0-9]{12}$/.test(id) ? fanDe(M.mes, id) : null, fanAnt = /^[a-f0-9]{12}$/.test(id) ? q1('select * from campeones where mes=? and juego=? and puesto=1', A.mes, id) : null;
    return send(res, 200, { mes: M.nombre, mesAnterior: A.nombre, lideres: topJugadores(M.mes, 3).map(sinUid), campeones: ant, fan: fan ? sinUid(fan) : null, fanAnterior: fanAnt ? { ...sinUid(fanAnt), red: redDe(fanAnt.uid) } : null }, undefined, { 'cache-control': 'public, max-age=60' });
  }
  if (u.pathname === '/api/pro/top') { // los más jugados de la semana (para la portada)
    if (!getS('pro', {}).on) return send(res, 200, { top: [] });
    const top = await topPro(16);
    return send(res, 200, { top }, undefined, { 'cache-control': 'public, max-age=300' });
  }
  if (u.pathname === '/api/pro/reportar' && P) { // "Este juego no carga": con 3 personas distintas se oculta hasta que lo revises
    if (limite(ip, 'proRep', 10, 3600000)) return send(res, 429, { error: 'Más despacio' });
    const b = await json(req), id = String(b.id || ''); if (!/^[a-f0-9]{12}$/.test(id)) return send(res, 400, { error: 'Juego no válido' });
    run('insert or ignore into pro_rep(id, iph) values(?,?)', id, crypto.createHash('sha256').update('rep:' + ip).digest('hex').slice(0, 16));
    if ((q1('select count(*) n from pro_rep where id=?', id)?.n || 0) >= 3) run("insert or ignore into pro_oculto(id, motivo) values(?, 'Reportado: no carga')", id);
    return send(res, 200, { ok: 1 });
  }
  if (u.pathname === '/api/err' && P) { // errores de los jugadores (sin datos personales) para revisarlos en el panel
    if (limite(ip, 'err', 20, 3600000)) return send(res, 200, { ok: 0 });
    const b = await json(req, 6000), msg = String(b.msg || '').slice(0, 300), src = String(b.src || '').slice(0, 200), ruta = String(b.ruta || '').slice(0, 120), ua = String(req.headers['user-agent'] || '').slice(0, 160);
    if (!msg || /^Script error\.?$/i.test(msg) || /extension:\/\//.test(src)) return send(res, 200, { ok: 0 });
    const firma = crypto.createHash('sha1').update(msg + '|' + src.replace(/\?.*$/, '')).digest('hex').slice(0, 16);
    if (q1('select 1 from errores where firma=?', firma)) run("update errores set n=n+1, ultimo=datetime('now'), ruta=?, ua=? where firma=?", ruta, ua, firma);
    else if ((q1('select count(*) n from errores')?.n || 0) < 500) run('insert into errores(firma, msg, src, ruta, ua) values(?,?,?,?,?)', firma, msg, src, ruta, ua);
    return send(res, 200, { ok: 1 });
  }
  if (u.pathname === '/api/pro') {
    const cfg = getS('pro', {}); if (!cfg.on) return send(res, 200, { on: false, juegos: [] });
    const todos = await proVisibles(), qq = String(u.searchParams.get('q') || '').toLowerCase().slice(0, 40), cat = String(u.searchParams.get('cat') || ''), pag = Math.max(0, Math.min(200, +u.searchParams.get('p') || 0));
    const cats = Object.entries(todos.reduce((a, g) => (a[g.cat] = (a[g.cat] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([c]) => c);
    const J7 = jugadas7(), orden = new Map(todos.map((g, i) => [g.id, i])), conJ = g => ({ ...g, j: J7.get(g.id) || 0 });
    const f = todos.filter(g => (!cat || g.cat === cat) && (!qq || g.t.toLowerCase().includes(qq))).map(conJ).sort((a, b) => (b.j >= 3 ? b.j : 0) - (a.j >= 3 ? a.j : 0) || orden.get(a.id) - orden.get(b.id));
    const top = !qq && !cat && pag === 0 ? await topPro(12) : [];
    return send(res, 200, { on: true, total: f.length, cats, top, juegos: f.slice(pag * 48, pag * 48 + 48) }, undefined, { 'cache-control': 'public, max-age=300' });
  }
  if (u.pathname.startsWith('/api/chat/')) { const r = await chat.http(req, res, u, { ip, json, send, limite }); if (r !== false) return; }
  if (/^\/api\/(amigos|dm|grupos)\//.test(u.pathname)) { const r = await amigos.http(req, res, u, { ip, json, send, limite, cuentaDeTok: online.cuentaDeTok }); if (r !== false) return; }
  if (u.pathname.startsWith('/api/foto/')) { const r = await fotos.http(req, res, u, { ip, json, send, limite, archivoEstatico: archivo }); if (r !== false) return; }
  if (/^\/api\/(cuenta|clan|duelo|glory)/.test(u.pathname)) { const r = await online.http(req, res, u, { ip, json, send, limite }); if (r !== false) return; }
  if (u.pathname.startsWith('/api/mesas/')) { const r = await mesas.http(req, res, u, { ip, json, send, limite }); if (r !== false) return; }
  // ---- público ----
  if (u.pathname === '/api/config') {
    const poll = q1('select id,question,options from polls where active=1 order by id desc limit 1');
    const subs = q1('select count(*) n from subscribers where active=1').n;
    const TV = getS('tv', {}); return send(res, 200, { tv: TV.on && TV.listas?.length ? TV.listas : null, horaFeliz: (({ activa, fin, extra, desde, hasta, diaNombre, on }) => ({ activa, fin, extra, desde, hasta, diaNombre, on }))(horaFeliz()), pais: geo(ip, req).country_code, apoyo: !!getS('apoyo', {}).on, login: getS('login', {}), marca: getS('marca', { nombre: '', eslogan: '' }), intereses: INTERESES, suscriptores: subs >= 50 ? subs : null, vapid: E.VAPID_PUBLIC || null, pixel: E.META_PIXEL_ID || null, video: getS('video', null), pro: !!(getS('pro', {}).on && getS('pro', {}).feed), poll: poll && { id: poll.id, q: poll.question, options: JSON.parse(poll.options) } });
  }
  if (u.pathname === '/api/visit' && P) {
    const b = await json(req);
    if (b.consent !== true) return send(res, 400, { error: 'Falta tu permiso' });
    const g = geo(ip, req), d = dispositivo(req.headers['user-agent']);
    run('insert into visitors(vid,ip,country_code,country,region,city,device,browser,source,game,sign) values(?,?,?,?,?,?,?,?,?,?,?)',
      clip(b.vid, 40), ipCorta(ip), g.country_code, g.country, g.region, g.city, d.device, d.browser, clip(b.src || 'directo', 60), GAMES.includes(b.game) ? b.game : null, SIGNS.includes(b.sign) ? b.sign : null);
    return send(res, 200, { ok: 1, country: g.country, city: g.city });
  }
  if (u.pathname === '/api/subscribe' && P) {
    const b = await json(req), s = b.subscription;
    if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth || !/^https:\/\//.test(s.endpoint)) return send(res, 400, { error: 'Suscripción inválida' });
    const g = geo(ip, req), d = dispositivo(req.headers['user-agent']);
    run(`insert into subscribers(endpoint,sub,vid,country_code,country,city,sign,game,source,device,active) values(?,?,?,?,?,?,?,?,?,?,1)
      on conflict(endpoint) do update set sub=excluded.sub, active=1, sign=coalesce(excluded.sign, sign), game=coalesce(excluded.game, game)`,
      s.endpoint, JSON.stringify({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }), clip(b.vid, 40), g.country_code, g.country, g.city,
      SIGNS.includes(b.sign) ? b.sign : null, GAMES.includes(b.game) ? b.game : null, clip(b.src || 'directo', 60), d.device);
    const row = q1('select id, sent from subscribers where endpoint=?', s.endpoint);
    // Notificación de bienvenida (solo la primera vez): la persona ve al instante cómo serán las alertas.
    const bv = getS('bienvenida', { on: true, title: '✨ ¡Bienvenido!', body: 'Desde mañana recibirás tu lectura del día. Mientras tanto, prueba otro test 👉' });
    if (VAPID && bv.on && row && !row.sent) webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title: bv.title, body: bv.body, url: `${PUBLIC_URL}/?src=bienvenida`, tag: 'bienvenida' }), { vapid: VAPID, TTL: 3600 })
      .then(() => run("update subscribers set sent=sent+1, last_at=datetime('now') where id=?", row.id)).catch(() => {});
    return send(res, 200, { ok: 1, id: row?.id });
  }
  if (u.pathname === '/api/intereses' && P) {
    const b = await json(req), ints = (Array.isArray(b.intereses) ? b.intereses : []).filter(x => INTERESES.some(i => i[0] === x));
    run('update subscribers set intereses=? where endpoint=?', ints.length ? ',' + ints.join(',') + ',' : null, String(b.endpoint || ''));
    return send(res, 200, { ok: 1 });
  }
  // Resultados de todos (anónimos): para "El 34 % obtuvo lo mismo que tú".
  if (u.pathname === '/api/resultado' && P) {
    const b = await json(req), test = String(b.test || ''), clave = clip(b.clave, 30);
    if (!GAMES.includes(test) || !clave) return send(res, 400, { error: 'Dato no válido' });
    const k = 'res:' + test + ':' + crypto.createHash('sha256').update(String(b.vid || ip)).digest('hex').slice(0, 16);
    if (!hits.has(k)) { hits.set(k, [Date.now()]); run('insert into resultados(test, clave) values(?,?)', test, clave); } // uno por persona y test (aprox.)
    const filas = q('select clave, count(*) n from resultados where test=? group by clave', test), total = filas.reduce((a, x) => a + x.n, 0);
    return send(res, 200, { total, claves: Object.fromEntries(filas.map(x => [x.clave, x.n])) });
  }
  // Ranking del día de los juegos arcade.
  if (u.pathname === '/api/campeon') { // líder del mes y campeones del mes pasado de un juego
    const jg = String(u.searchParams.get('juego') || ''); if (!/^[a-z0-9]{2,20}$/.test(jg)) return send(res, 400, { error: 'Juego no válido' });
    const M = mesPeru(), A = mesPeru(-1); mesCerrar(A);
    const ant = q('select * from campeones where mes=? and juego=? order by puesto', A.mes, jg).map(r => ({ ...sinUid(r), red: redDe(r.uid) }));
    return send(res, 200, { mes: M.nombre, mesAnterior: A.nombre, lideres: topMes(jg, M).map(sinUid), campeones: ant }, undefined, { 'cache-control': 'public, max-age=60' });
  }
  if (u.pathname === '/api/campeon/yo' && P) { // ¿soy campeón del mes pasado? (para invitarlo a poner su red)
    const b = await json(req), uh = crypto.createHash('sha256').update(String(b.uid || '')).digest('hex').slice(0, 16), A = mesPeru(-1); mesCerrar(A);
    const lista = q('select juego, puesto, puntos from campeones where mes=? and uid=? order by puesto', A.mes, uh), r = q1('select red, usuario, estado from campeon_red where uid=?', uh);
    return send(res, 200, { mes: A.nombre, lista: semanaFama() ? lista : [], red: r || null, hasta: finFama(), redes: Object.fromEntries(Object.entries(REDES_OK).map(([k, v]) => [k, v[0]])) });
  }
  if (u.pathname === '/api/campeon/red' && P) { // el campeón pone (o quita) su red social; la aprueba el dueño en el panel
    if (limite(ip, 'campRed', 10, 3600000)) return send(res, 429, { error: 'Más despacio' });
    const b = await json(req), uh = crypto.createHash('sha256').update(String(b.uid || '')).digest('hex').slice(0, 16), c = online.cuentaDeTok(b.tok);
    if (!c) return send(res, 401, { error: 'Primero entra a tu usuario de Yupitok' });
    if (b.borrar) { run('delete from campeon_red where uid=?', uh); return send(res, 200, { ok: 1 }); }
    const A = mesPeru(-1); mesCerrar(A); if (!q1('select 1 from campeones where mes=? and uid=?', A.mes, uh)) return send(res, 403, { error: 'Solo los campeones del mes pasado pueden poner su red' }); if (!semanaFama()) return send(res, 403, { error: 'La semana de fama ya terminó. ¡Gana este mes para volver a salir!' });
    const red = String(b.red || ''), us = String(b.usuario || '').trim().replace(/^@/, '');
    if (!REDES_OK[red]) return send(res, 400, { error: 'Elige una red' }); if (!/^[A-Za-z0-9._-]{2,30}$/.test(us)) return send(res, 400, { error: 'Escribe solo tu usuario (sin @ ni enlaces)' });
    run("insert or replace into campeon_red(uid, cuenta, usuario_yupi, red, usuario, estado) values(?,?,?,?,?,'pendiente')", uh, c.id, c.usuario, red, us);
    return send(res, 200, { ok: 1, estado: 'pendiente' });
  }
  // 🏆 Torneo de la semana: un juego arcade distinto cada semana (lunes a domingo, hora Perú). Gratis: sin entrada pagada.
  // Premios en monedas del juego para el top 3 (y, si quieres, un premio de un patrocinador que pones en el panel).
  if (u.pathname === '/api/torneo' || (u.pathname === '/api/torneo/premio' && P)) {
    const T = torneoSemana(), uidh = c => crypto.createHash('sha256').update(String(c || '')).digest('hex').slice(0, 16);
    if (u.pathname === '/api/torneo/premio') { // reclama el premio de la semana pasada (si quedaste en el top 3)
      const b = await json(req), uh = uidh(b.uid); if (!b.uid) return send(res, 400, { error: 'Falta uid' });
      const A = torneoSemana(-1); torneoCerrar(A);
      const p = q1('select * from torneo_premios where semana=? and uid=? and reclamado=0', A.semana, uh); if (!p) return send(res, 200, { monedas: 0 });
      run('update torneo_premios set reclamado=1 where semana=? and uid=?', A.semana, uh); const ycg = ycDar(online.perfilId(b), [30, 20, 10][p.puesto - 1] || 0, 'torneo', ip); return send(res, 200, { monedas: p.monedas, puesto: p.puesto, juego: A.juego, yupicoins: ycg });
    }
    const top = conEstilo(q(`select uid, nombre, avatar, max(puntos) puntos from arcade where juego=? and created_at>=? and created_at<? group by uid order by puntos desc limit 10`, T.juego, T.desde, T.hasta)).map(({ uid, ...x }) => x);
    let yo = null; const uq = u.searchParams.get('uid'); if (uq) { const uh = uidh(uq), m = q1('select max(puntos) p from arcade where juego=? and uid=? and created_at>=? and created_at<?', T.juego, uh, T.desde, T.hasta)?.p; if (m != null) yo = { puntos: m, puesto: q1(`select count(*) n from (select max(puntos) p from arcade where juego=? and created_at>=? and created_at<? group by uid) where p > ?`, T.juego, T.desde, T.hasta, m).n + 1 }; }
    return send(res, 200, { juego: T.juego, termina: T.fin, top, yo, premios: TORNEO_PREMIOS, patrocinador: clip(getS('torneo', {}).premio || '', 140) });
  }
  if (u.pathname === '/api/arcade/puntaje' && P) {
    const TOPE = { gusanito: 3000, rompecabezas: 1000, memoria: 1000, buscaminas: 1000, n2048: 300000, billar: 160, ludo: 200, bloques: 200000, frutas: 200000, colores: 2000, torre: 1000, palabra: 600, sudoku: 1000, ladrillos: 50000, vuela: 2000, corredor: 200000, flechas: 5000, joyas: 100000, huerto: 100000, batalla: 100000, ahorcado: 5000, sopa: 1000, ppt: 200, reflejos: 1000, tuberias: 1000, penales: 500, calculo: 3000, simon: 2000, topos: 2000, color: 2000 };
    const b = await json(req), jg = String(b.juego || ''), pts = Math.round(+b.puntos || 0);
    if (!TOPE[jg] || pts < 0 || pts > TOPE[jg]) return send(res, 400, { error: 'Puntaje no válido' });
    if (limite(ip, 'arc', 30)) return send(res, 429, { error: 'Más despacio' });
    const ch = require('./chat'), nombre = ch.apodo(b.nombre) || 'Jugador', avatar = FOTOS.valido(b.avatar) ? b.avatar : 'a01', uidh = crypto.createHash('sha256').update(String(b.uid || ip)).digest('hex').slice(0, 16);
    run('insert into arcade(juego, uid, nombre, avatar, puntos) values(?,?,?,?,?)', jg, uidh, nombre, avatar, pts);
    const hoy = hoyPeru();
    const top = conEstilo(q(`select uid, nombre, avatar, max(puntos) puntos from arcade where juego=? and date(created_at,'-5 hours')=? group by uid order by puntos desc limit 10`, jg, hoy));
    const mio = q1(`select max(puntos) p from arcade where juego=? and uid=? and date(created_at,'-5 hours')=?`, jg, uidh, hoy).p;
    const puesto = q1(`select count(*) n from (select uid, max(puntos) p from arcade where juego=? and date(created_at,'-5 hours')=? group by uid) where p > ?`, jg, hoy, mio).n + 1;
    const MM = mesPeru(), mioMes = q1('select max(puntos) p from arcade where juego=? and uid=? and created_at>=? and created_at<?', jg, uidh, MM.desde, MM.hasta).p, mesPuesto = q1('select count(*) n from (select max(puntos) p from arcade where juego=? and created_at>=? and created_at<? group by uid) where p > ?', jg, MM.desde, MM.hasta, mioMes).n + 1;
    return send(res, 200, { hoy: top.map(({ uid, ...x }) => x), puesto, mesPuesto, mes: MM.nombre });
  }
  // Progreso del jugador (nivel, monedas, niveles de Joyas…): se guarda por navegador y se recupera con un código.
  if (u.pathname === '/api/mundo/mov' && P) { // Mundo 3D: posición de cada jugador (en memoria) y la de los demás del mismo mundo
    if (limite(ip, 'mundoip', 6000)) return send(res, 429, { error: 'Más despacio' });
    const b = await json(req); if (String(b.uid || '').length < 6) return send(res, 400, { error: 'Falta tu identificador' });
    const uidh = crypto.createHash('sha256').update('mundo:' + b.uid).digest('hex').slice(0, 16);
    if (limite(uidh, 'mundo', 420)) return send(res, 429, { error: 'Más despacio' });
    let pid = MUNDO_ID.get(uidh); if (!pid) { pid = crypto.randomBytes(5).toString('hex'); MUNDO_ID.set(uidh, pid); }
    const num = (v, m) => Math.round(Math.max(-m, Math.min(m, +v || 0)) * 100) / 100, prev = MUNDO_POS.get(pid) || {}, ahora = Date.now();
    const e = { mundo: MUNDOS3D.includes(b.mundo) ? b.mundo : 'plaza', x: num(b.x, 400), y: num(b.y, 400), z: num(b.z, 400), ry: num(b.ry, 7), a: ['q', 'c', 's'].includes(b.a) ? b.a : 'q',
      nn: String(b.nombre || '').slice(0, 30), color: /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : '#7c5cff', gorro: ['', 'gorra', 'gato', 'vaquero', 'copa', 'corona'].includes(b.gorro) ? b.gorro : '', emote: prev.emote, et: prev.et, t: ahora, uidh };
    e.nombre = prev.nn === e.nn && prev.nombre ? prev.nombre : (require('./chat').apodo(e.nn) || 'Jugador');
    if (EMOTES3D.includes(b.emote) && ahora - (prev.et || 0) > 1500) { e.emote = b.emote; e.et = ahora; }
    MUNDO_POS.set(pid, e);
    const otros = [], cuenta = {};
    for (const [k, o] of MUNDO_POS) {
      if (ahora - o.t > 8000) { MUNDO_POS.delete(k); MUNDO_ID.delete(o.uidh); continue; }
      cuenta[o.mundo] = (cuenta[o.mundo] || 0) + 1;
      if (k !== pid && o.mundo === e.mundo && otros.length < 40) otros.push({ id: k, x: o.x, y: o.y, z: o.z, ry: o.ry, a: o.a, nombre: o.nombre, color: o.color, gorro: o.gorro, emote: ahora - (o.et || 0) < 3500 ? o.emote : null });
    }
    return send(res, 200, { otros, cuenta });
  }
  // 🪙 Yupicoins: el saldo de cada jugador sale de su libro de movimientos (no se edita a mano).
  // Lo que el juego suma o resta se registra como movimiento; lo ganado tiene tope por día (por jugador y por IP) para frenar trampas.
  if (u.pathname.startsWith('/api/tienda') && P) {
    const b = await json(req); if (String(b.uid || '').length < 6) return send(res, 400, { error: 'Falta tu identificador' });
    const id = online.perfilId(b), uidh = uidArcade(b.uid), inv = () => q('select item from yc_inv where perfil=?', id).map(r => r.item);
    const eq = () => q1('select marco, titulo, color from yc_estilo where perfil=? limit 1', id) || {};
    if (u.pathname === '/api/tienda/comprar') { const it = TIENDA_M.get(String(b.item || '')); if (!it) return send(res, 400, { error: 'Ese artículo no existe' });
      if (inv().includes(it.id)) return send(res, 400, { error: 'Ya lo tienes' });
      if (!ycGastar(id, it.precio, 'tienda:' + it.id, ip)) return send(res, 400, { error: `Te faltan Yupicoins: cuesta ${it.precio} 💎` });
      run('insert or ignore into yc_inv(perfil,item) values(?,?)', id, it.id); b.equipar = it.id; }
    if (b.equipar !== undefined || b.quitar) { const tipo = b.quitar || TIENDA_M.get(String(b.equipar))?.tipo; if (!['marco', 'titulo', 'color'].includes(tipo)) return send(res, 400, { error: 'No válido' });
      const val = b.quitar ? null : String(b.equipar); if (val && !inv().includes(val)) return send(res, 400, { error: 'Primero cómpralo' });
      const e = { ...eq() }; e[tipo] = val; run('insert into yc_estilo(uidh,perfil,marco,titulo,color) values(?,?,?,?,?) on conflict(uidh) do update set perfil=excluded.perfil, marco=excluded.marco, titulo=excluded.titulo, color=excluded.color', uidh, id, e.marco || null, e.titulo || null, e.color || null);
      run('update yc_estilo set marco=?, titulo=?, color=? where perfil=?', e.marco || null, e.titulo || null, e.color || null, id); }
    return send(res, 200, { items: TIENDA, inv: inv(), equipo: eq(), ...ycEstado(id) });
  }
  if ((u.pathname === '/api/yc' || u.pathname === '/api/yc/ganar') && P) {
    const b = await json(req); if (String(b.uid || '').length < 6) return send(res, 400, { error: 'Falta tu identificador' });
    const id = online.perfilId(b); if (u.pathname === '/api/yc') return send(res, 200, ycEstado(id));
    const m = String(b.motivo || ''); if (!YC_JUEGO[m] || limite(id, 'yc', 40)) return send(res, 200, { ganado: 0, ...ycEstado(id) });
    if (m === 'diario' && q1("select 1 from yc_mov where perfil=? and motivo='juego:diario' and date(created_at,'-5 hours')=?", id, hoyPeru())) return send(res, 200, { ganado: 0, ...ycEstado(id) });
    if (m === 'partida' && q1("select 1 from yc_mov where perfil=? and motivo='juego:partida' and created_at>=datetime('now','-90 seconds')", id)) return send(res, 200, { ganado: 0, ...ycEstado(id) });
    const g = ycDar(id, YC_JUEGO[m], m, ip); return send(res, 200, { ganado: g, ...ycEstado(id) });
  }
  if (u.pathname === '/api/perfil' && P) {
    const b = await json(req), id = online.perfilId(b);
    if (String(b.uid || '').length < 6) return send(res, 400, { error: 'Falta tu identificador' });
    let fila = q1('select codigo, data from perfiles where id=?', id);
    if (b.data && typeof b.data === 'object') {
      const d = JSON.stringify(b.data); if (d.length > 30000) return send(res, 400, { error: 'Demasiados datos' });
      if (limite(ip, 'perfil', 40)) return send(res, 429, { error: 'Más despacio' });
      if (!fila) { let cod; do { cod = crypto.randomBytes(4).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase(); } while (cod.length < 6 || q1('select 1 from perfiles where codigo=?', cod)); run('insert into perfiles(id, codigo, data) values(?,?,?)', id, cod, d); fila = { codigo: cod }; }
      else run("update perfiles set data=?, updated_at=datetime('now') where id=?", d, id);
      return send(res, 200, { ok: 1, codigo: fila.codigo });
    }
    return send(res, 200, fila ? { codigo: fila.codigo, data: JSON.parse(fila.data) } : {});
  }
  if (u.pathname === '/api/perfil/recuperar' && P) {
    if (limite(ip, 'recup', 10, 15 * 60000)) return send(res, 429, { error: 'Demasiados intentos. Espera 15 minutos.' });
    const b = await json(req), f = q1('select data from perfiles where codigo=?', String(b.codigo || '').trim().toUpperCase());
    if (!f) return send(res, 404, { error: 'Ese código no existe' });
    const id = online.perfilId(b);
    run('insert into perfiles(id, codigo, data) values(?,?,?) on conflict(id) do update set data=excluded.data', id, crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8), f.data);
    return send(res, 200, { data: JSON.parse(f.data) });
  }
  if (u.pathname === '/api/populares') {
    if (!populares.t || Date.now() - populares.t > 10 * 60000) { populares.lista = q(`select game, count(*) n from visitors where game is not null and created_at>=datetime('now','-7 days') group by game order by n desc limit 6`).filter(x => x.n >= 3).map(x => x.game); populares.t = Date.now(); }
    return send(res, 200, { populares: populares.lista });
  }
  if (u.pathname === '/api/unsubscribe' && P) {
    const b = await json(req); run('update subscribers set active=0 where endpoint=?', String(b.endpoint || '')); return send(res, 200, { ok: 1 });
  }
  if (u.pathname === '/api/vote' && P) {
    const b = await json(req), p = q1('select * from polls where id=?', +b.poll); if (!p) return send(res, 404, { error: 'Encuesta no encontrada' });
    const n = JSON.parse(p.options).length, o = +b.option;
    if (o >= 0 && o < n) run('insert or ignore into votes(poll_id,option,voter) values(?,?,?)', p.id, o, crypto.createHash('sha256').update(String(b.vid || ip) + SECRET).digest('hex').slice(0, 24));
    const r = q('select option, count(*) n from votes where poll_id=? group by option', p.id), tot = r.reduce((a, x) => a + x.n, 0);
    return send(res, 200, { total: tot, votes: Array.from({ length: n }, (_, i) => r.find(x => x.option === i)?.n || 0) });
  }

  // ---- panel ----
  if (u.pathname === '/api/admin/login' && P) {
    if (limite(ip, 'login', 8, 15 * 60000)) return send(res, 429, { error: 'Demasiados intentos. Espera 15 minutos.' });
    const b = await json(req);
    if (!ADMIN_PASSWORD) return send(res, 400, { error: 'Pon ADMIN_PASSWORD en el archivo .env' });
    const a = crypto.createHash('sha256').update(String(b.password || '')).digest(), c = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
    if (!crypto.timingSafeEqual(a, c)) return send(res, 401, { error: 'Contraseña incorrecta' });
    return send(res, 200, { ok: 1 }, undefined, { 'set-cookie': `sid=${nuevaSesion()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${PUBLIC_URL.startsWith('https') ? '; Secure' : ''}` });
  }
  if (u.pathname.startsWith('/api/admin/')) {
    if (!admin(req)) return send(res, 401, { error: 'Inicia sesión' });
    if (P && req.headers['x-panel'] !== '1' && !req.headers['x-sf-token']) return send(res, 403, { error: 'Prohibido' }); // protección CSRF
    const r = u.pathname.slice(11), F = Object.fromEntries(u.searchParams);
    if (r === 'reportes-dm' || r === 'suspender') { const ar = amigos.admin(r, P ? await json(req) : {}); if (ar) return send(res, 200, ar); }
    if (r === 'foto-ver') return fotos.verAdmin(req, res, String(F.id || ''), send, archivo);
    if (r === 'pro-reportes') { const todos = await catalogoPro(), M = new Map(todos.map(g => [g.id, g])); const ocultos = q('select id, motivo, created_at from pro_oculto order by created_at desc limit 200').map(o => ({ ...o, t: M.get(o.id)?.t || '(ya no está en el catálogo)', s: M.get(o.id)?.s || '' })); const rep = q('select id, count(*) n from pro_rep group by id order by n desc limit 50').map(o => ({ ...o, t: M.get(o.id)?.t || '?', s: M.get(o.id)?.s || '' })); return send(res, 200, { ocultos, rep }); }
    if (r === 'pro-mostrar' && P) { const b = await json(req), id = String(b.id || ''); run('delete from pro_oculto where id=?', id); run('delete from pro_rep where id=?', id); return send(res, 200, { ok: 1 }); }
    if (r === 'pro-ocultar' && P) { const b = await json(req), id = String(b.id || ''); if (/^[a-f0-9]{12}$/.test(id)) run("insert or replace into pro_oculto(id, motivo) values(?, 'Ocultado por el dueño')", id); return send(res, 200, { ok: 1 }); }
    if (r === 'errores') return send(res, 200, { errores: q('select * from errores order by ultimo desc limit 100') });
    if (r === 'redes-campeones') return send(res, 200, { redes: q("select uid, usuario_yupi, red, usuario, estado, created_at from campeon_red order by (estado='pendiente') desc, created_at desc limit 100").map(x => ({ ...x, url: REDES_OK[x.red] ? REDES_OK[x.red][1](x.usuario) : '' })) });
    if (r === 'redes-campeones/estado' && P) { const b = await json(req); if (['ok', 'rechazado'].includes(b.estado)) run('update campeon_red set estado=? where uid=?', b.estado, String(b.uid || '')); return send(res, 200, { ok: 1 }); }
    if (r === 'yupicoins') { const C = YC(); return send(res, 200, { ajustes: C,
      emitidas: q1("select coalesce(sum(monto),0) s from yc_mov where monto>0").s, gastadas: -q1("select coalesce(sum(monto),0) s from yc_mov where monto<0").s,
      hoy: { emitidas: q1("select coalesce(sum(monto),0) s from yc_mov where monto>0 and created_at>=datetime('now','-24 hours')").s, gastadas: -q1("select coalesce(sum(monto),0) s from yc_mov where monto<0 and created_at>=datetime('now','-24 hours')").s },
      jugadores: q1('select count(distinct perfil) n from yc_mov').n, gastan: q1("select count(distinct perfil) n from yc_mov where monto<0").n,
      top: q('select substr(perfil,1,8) perfil, sum(monto) saldo from yc_mov group by perfil order by saldo desc limit 10'), alertas: q('select substr(perfil,1,8) perfil, detalle, created_at from yc_alerta order by id desc limit 30') }); }
    if (r === 'yupicoins/ajustes' && P) { const b = await json(req), C = YC(); for (const k of ['topeDia', 'topeIp']) if (b[k] !== undefined) C[k] = Math.max(1, Math.min(1e6, Math.floor(+b[k]) || C[k])); setS('yupicoins', C); return send(res, 200, { ok: 1, ajustes: C }); }
    if (r === 'guias-extra') return send(res, 200, { guias: getS('guiasExtra', []) });
    if (r === 'guias-extra/guardar' && P) { const b = await json(req), slug = slugDe(String(b.slug || b.titulo || '')).slice(0, 70); if (slug.length < 4 || !b.titulo || !b.html) return send(res, 400, { error: 'Falta título o contenido' });
      if (JSON.parse(fs.readFileSync(path.join(__dirname, 'guias.json'), 'utf8')).guias.some(x => x.slug === slug)) return send(res, 400, { error: 'Ya existe una guía con ese nombre' });
      const g = { slug, titulo: clip(textoP(b.titulo), 110), desc: clip(textoP(b.desc || ''), 200), emoji: clip(String(b.emoji || '📝'), 4), juego: /^[a-z0-9-]{2,40}$/.test(b.juego || '') && GAMES.includes(b.juego) ? b.juego : '', fecha: hoyPeru(), html: limpiaHtml(b.html) };
      setS('guiasExtra', [...getS('guiasExtra', []).filter(x => x.slug !== slug), g].slice(-300)); return send(res, 200, { ok: 1, url: PUBLIC_URL + '/guias/' + slug }); }
    if (r === 'guias-extra/borrar' && P) { const b = await json(req); setS('guiasExtra', getS('guiasExtra', []).filter(x => x.slug !== String(b.slug || ''))); return send(res, 200, { ok: 1 }); }
    if (r === 'errores-borrar' && P) { run('delete from errores'); return send(res, 200, { ok: 1 }); }
    if (r === 'fotos' || r.startsWith('fotos/')) { const fr = fotos.admin(r, P ? await json(req) : {}); if (fr) return send(res, 200, fr); }
    if (r === 'chat' || r.startsWith('chat/')) { const cr = chat.admin(r, P ? await json(req) : {}, F); if (cr) return send(res, 200, cr); }
    if (r === 'logout') return send(res, 200, { ok: 1 }, undefined, { 'set-cookie': 'sid=; Path=/; Max-Age=0' });
    if (r === 'stats') {
      const dias = q(`select date(created_at,'-5 hours') d, count(*) n from visitors where created_at>=datetime('now','-14 days') group by d order by d`);
      return send(res, 200, {
        visitas: { hoy: q1(`select count(*) n from visitors where date(created_at,'-5 hours')=?`, hoyPeru()).n, semana: q1(`select count(*) n from visitors where created_at>=datetime('now','-7 days')`).n, total: q1('select count(*) n from visitors').n, unicos: q1('select count(distinct vid) n from visitors').n },
        subs: { activos: q1('select count(*) n from subscribers where active=1').n, total: q1('select count(*) n from subscribers').n, hoy: q1(`select count(*) n from subscribers where date(created_at,'-5 hours')=?`, hoyPeru()).n },
        clics: q1('select coalesce(sum(clicks),0) n from campaigns').n, enviadas: q1('select coalesce(sum(sent),0) n from campaigns').n,
        dias,
        paises: q(`select coalesce(country,'Desconocido') pais, country_code cc, count(*) visitas, (select count(*) from subscribers s where s.active=1 and s.country_code is v.country_code) subs from visitors v group by country_code order by visitas desc limit 30`),
        ciudades: q(`select coalesce(city,'?') ciudad, coalesce(country,'?') pais, count(*) n from visitors group by city, country order by n desc limit 20`),
        fuentes: q(`select source, count(*) n from visitors group by source order by n desc limit 20`),
        mes: { n: q1(`select count(*) n from visitors where created_at>=datetime('now','-30 days')`).n, antes: q1(`select count(*) n from visitors where created_at>=datetime('now','-60 days') and created_at<datetime('now','-30 days')`).n, unicos: q1(`select count(distinct vid) n from visitors where created_at>=datetime('now','-30 days')`).n },
        fuentes30: q(`select source, count(*) n from visitors where created_at>=datetime('now','-30 days') group by source order by n desc limit 60`),
        paises30: q(`select coalesce(country,'?') pais, country_code cc, count(*) n from visitors where created_at>=datetime('now','-30 days') group by country_code order by n desc limit 15`),
        referidos: (() => { try { return q1(`select count(*) n from visitors where source='invitacion' and created_at>=datetime('now','-30 days')`).n; } catch (e) { return 0; } })(),
        juegos: q(`select coalesce(game,'-') game, count(*) n from visitors group by game order by n desc`),
        dispositivos: q(`select device, browser, count(*) n from visitors group by device, browser order by n desc limit 12`),
        signos: q(`select sign, count(*) n from subscribers where active=1 and sign is not null group by sign order by n desc`),
        vapid: !!E.VAPID_PUBLIC, video: getS('video', null),
      });
    }
    if (r === 'opciones') return send(res, 200, {
      paises: q(`select country_code cc, coalesce(country,country_code) pais, count(*) n from subscribers where active=1 and country_code is not null group by country_code order by n desc`),
      fuentes: q(`select source, count(*) n from subscribers where active=1 group by source order by n desc limit 50`),
      ciudades: q(`select city, country_code cc, count(*) n from subscribers where active=1 and city is not null group by city, country_code order by n desc limit 100`),
      intereses: INTERESES.map(([k, l]) => ({ k, l, n: q1("select count(*) n from subscribers where active=1 and intereses like ?", '%,' + k + ',%').n })),
    });
    if (r === 'visitantes' || r === 'suscriptores' || r === 'export') {
      const tabla = (r === 'suscriptores' || F.tipo === 'suscriptores') ? 'subscribers' : 'visitors', w = [], a = [];
      if (F.pais) { w.push('country_code=?'); a.push(F.pais); }
      if (F.ciudad) { w.push('city=?'); a.push(F.ciudad); }
      if (F.juego) { w.push('game=?'); a.push(F.juego); }
      if (F.fuente) { w.push('source=?'); a.push(F.fuente); }
      if (F.signo) { w.push('sign=?'); a.push(F.signo); }
      if (F.desde) { w.push(`date(created_at,'-5 hours')>=?`); a.push(F.desde); }
      if (F.hasta) { w.push(`date(created_at,'-5 hours')<=?`); a.push(F.hasta); }
      if (tabla === 'subscribers' && F.activos !== '0') w.push('active=1');
      const W = w.length ? 'where ' + w.join(' and ') : '';
      const cols = tabla === 'visitors' ? `id, datetime(created_at,'-5 hours') fecha, country pais, region, city ciudad, device dispositivo, browser app, source fuente, game juego, sign signo, ip ip_recortada`
        : `id, datetime(created_at,'-5 hours') fecha, country pais, city ciudad, device dispositivo, source fuente, game juego, sign signo, trim(intereses, ',') intereses, active activo, sent recibidas, clicks clics`;
      if (r === 'export') return send(res, 200, csv(q(`select ${cols} from ${tabla} ${W} order by id desc limit 200000`, ...a)), 'text/csv; charset=utf-8', { 'content-disposition': `attachment; filename="${tabla === 'visitors' ? 'visitantes' : 'suscriptores'}-${hoyPeru()}.csv"` });
      const page = Math.max(0, +F.p || 0);
      return send(res, 200, { total: q1(`select count(*) n from ${tabla} ${W}`, ...a).n, rows: q(`select ${cols} from ${tabla} ${W} order by id desc limit 100 offset ?`, ...a, page * 100) });
    }
    if (r === 'imagen' && P) { // foto subida desde tu PC para la notificación
      const buf = await new Promise((ok, no) => { const p = []; let n = 0; req.on('data', c => { n += c.length; if (n > 5e6) { no(new Error('La imagen pesa más de 5 MB')); req.destroy(); } else p.push(c); }); req.on('end', () => ok(Buffer.concat(p))); req.on('error', no); });
      const ext = buf[0] === 0xff && buf[1] === 0xd8 ? 'jpg' : buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'png' : buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP' ? 'webp' : buf.subarray(0, 3).toString() === 'GIF' ? 'gif' : null;
      if (!ext) return send(res, 400, { error: 'Sube una foto JPG, PNG, WEBP o GIF' });
      const dir = path.join(DATA, 'media'); fs.mkdirSync(dir, { recursive: true });
      const name = crypto.randomBytes(8).toString('hex') + '.' + ext; fs.writeFileSync(path.join(dir, name), buf);
      return send(res, 200, { url: `${PUBLIC_URL}/m/${name}` });
    }
    if (r === 'contar' && P) { const b = await json(req); const n = contar(b.filters || {}); return send(res, 200, { n, enviar: b.max > 0 ? Math.min(n, b.max) : n }); }
    if (r === 'campana' && P) {
      const b = await json(req);
      if (!E.VAPID_PUBLIC) return send(res, 400, { error: 'Faltan las llaves de notificaciones (VAPID). En ShortForge se crean solas al encender la página.' });
      const title = clip(b.title, 80).trim(), body = clip(b.body, 200).trim();
      if (!title || !body) return send(res, 400, { error: 'Escribe el título y el mensaje' });
      const ultimo = s => { const m = String(s || '').match(/https?:\/\/[^\s]+?(?=https?:\/\/|\s|$)/g); return m ? m[m.length - 1] : String(s || '').trim(); };
      b.url = ultimo(b.url); b.image = ultimo(b.image);
      const dest = b.url ? safeDest(b.url) : PUBLIC_URL + '/';
      if (!dest) return send(res, 400, { error: 'El enlace debe ser de tu página o un video de YouTube/Facebook/TikTok/Instagram' });
      const image = b.image ? (safeDest(b.image) || (/^https:\/\/[^\s"']+\.(jpg|jpeg|png|webp)(\?|$)/i.test(b.image) ? b.image : null)) : null;
      let runAt = null;
      if (b.cuando) { const t = new Date(b.cuando + ':00-05:00'); if (isNaN(t)) return send(res, 400, { error: 'Fecha no válida' }); runAt = t.toISOString().slice(0, 19).replace('T', ' '); }
      const rr = run("insert into campaigns(title,body,url,image,filters,max_n,run_at,status) values(?,?,?,?,?,?,coalesce(?,datetime('now')),'programada')",
        title, body, dest, image, JSON.stringify(b.filters || {}), Math.max(0, +b.max || 0), runAt);
      if (!runAt) enviarCampana(q1('select * from campaigns where id=?', rr.lastInsertRowid));
      return send(res, 200, { ok: 1, id: rr.lastInsertRowid });
    }
    if (r === 'campanas') return send(res, 200, q(`select id, datetime(created_at,'-5 hours') creada, datetime(run_at,'-5 hours') hora, title, body, url, filters, max_n, status, sent, failed, removed, skipped, clicks, auto from campaigns order by id desc limit 100`));
    if (r === 'cancelar' && P) { const b = await json(req); run("update campaigns set status='cancelada' where id=? and status='programada'", +b.id); return send(res, 200, { ok: 1 }); }
    if (r === 'ajustes') {
      if (P) {
        const b = await json(req, 6e6); // los QR de apoyo vienen como imagen
        if (b.video !== undefined) { const v = b.video?.url ? safeDest(b.video.url) : null; if (b.video?.url && !v) return send(res, 400, { error: 'El video debe ser de YouTube, Facebook, TikTok o Instagram' }); setS('video', v ? { url: v, title: clip(b.video.title, 80) || 'Mira el video' } : null); }
        if (b.priv) setS('priv', Object.fromEntries(['nombre', 'ciudad', 'correo', 'plazo', 'codigo'].map(k => [k, clip(b.priv[k], 120).trim()])));
        if (b.pro) { const f = String(b.pro.feed || '').trim(), pl = String(b.pro.plantilla || '').trim(); if (f && !/^https:\/\/\S+$/.test(f)) return send(res, 400, { error: 'El enlace del catálogo debe empezar con https://' }); if (pl && !/^https:\/\/\S*\{id\}\S*$/.test(pl)) return send(res, 400, { error: 'La plantilla debe empezar con https:// y tener {id}' }); setS('pro', { on: !!b.pro.on, feed: f.slice(0, 600), plantilla: pl.slice(0, 300) }); PRO.t = 0; if (b.pro.on && f) { const n = (await catalogoPro(true)).length; if (!n) return send(res, 400, { error: 'Guardado, pero el catálogo no trajo juegos. Revisa el enlace (debe ser el "feed" JSON o RSS de tu distribuidor).' }); } }
        if (b.apoyo) { const prev = getS('apoyo', {}); let metodos = metodosApoyo(prev);
          if (b.apoyo.metodos !== undefined) { try { metodos = validarMetodos(b.apoyo.metodos); } catch (e) { return send(res, 400, { error: e.message }); } }
          setS('apoyo', { on: b.apoyo.on !== undefined ? !!b.apoyo.on : !!prev.on, mensaje: b.apoyo.mensaje !== undefined ? clip(b.apoyo.mensaje, 1500) : (prev.mensaje || ''), metodos }); }
        if (b.login) { const g = String(b.login.google || '').trim(), f = String(b.login.facebook || '').trim(); if (g && !/^[\w-]+\.apps\.googleusercontent\.com$/.test(g)) return send(res, 400, { error: 'El ID de cliente de Google termina en .apps.googleusercontent.com' }); if (f && !/^\d{8,20}$/.test(f)) return send(res, 400, { error: 'El ID de la app de Facebook son solo números' }); setS('login', { google: g, facebook: f }); }
        if (b.ads) { // si pegan el código completo de Google en cualquiera de los dos cuadros, se saca solo el ca-pub y se descarta el resto
          let c = String(b.ads.client || '').trim(), ex = String(b.ads.extra || ''); const enEx = /ca-pub-\d{10,20}/.exec(ex), enC = /ca-pub-\d{10,20}/.exec(c);
          if (enC) c = enC[0]; else if (!c && enEx) c = enEx[0];
          if (c && !/^ca-pub-\d{10,20}$/.test(c)) return send(res, 400, { error: 'El ID de AdSense se ve así: ca-pub-1234567890123456' });
          ex = ex.replace(/<script[\s\S]*?<\/script>/gi, '\n').replace(/<[^>]*>/g, '\n');
          setS('ads', { client: c, extra: clip(ex, 120000) }); }
        if (b.marca) setS('marca', { nombre: clip(b.marca.nombre, 40).trim(), eslogan: clip(b.marca.eslogan, 90).trim() });
        if (b.bienvenida) setS('bienvenida', { on: !!b.bienvenida.on, title: clip(b.bienvenida.title, 80), body: clip(b.bienvenida.body, 200) });
        if (b.tope !== undefined) setS('tope', Math.max(1, Math.min(10, +b.tope || 3)));
        if (b.torneo) setS('torneo', { premio: clip(b.torneo.premio || '', 140) });
        if (b.campeonesAviso !== undefined) setS('campeonesAviso', !!b.campeonesAviso);
        if (b.rachaAviso) setS('rachaAviso', { on: !!b.rachaAviso.on, hora: /^\d\d:\d\d$/.test(b.rachaAviso.hora) ? b.rachaAviso.hora : '19:00' });
        if (b.horaFeliz) { const h = b.horaFeliz, ok = x => /^\d\d:\d\d$/.test(x); setS('horaFeliz', { on: !!h.on, dia: Math.max(0, Math.min(6, +h.dia || 0)), desde: ok(h.desde) ? h.desde : '20:00', hasta: ok(h.hasta) ? h.hasta : '21:00', extra: Math.max(5, Math.min(100, +h.extra || 20)), aviso: h.aviso !== false }); }
        if (b.famaDias !== undefined) setS('famaDias', +b.famaDias === 7 ? 7 : 0);
        if (b.tv) { const listas = tvParse(b.tv.texto); setS('tv', { on: !!b.tv.on, texto: clip(String(b.tv.texto || ''), 6000), listas }); }
        if (b.juegoDia) setS('juegoDia', { on: !!b.juegoDia.on, hora: /^\d\d:\d\d$/.test(b.juegoDia.hora) ? b.juegoDia.hora : '19:30' });
        if (b.diario) setS('diario', { on: !!b.diario.on, hora: /^\d\d:\d\d$/.test(b.diario.hora) ? b.diario.hora : '07:30', title: clip(b.diario.title, 80), body: clip(b.diario.body, 200), url: safeDest(b.diario.url || '/') || '/' });
        if (b.encuesta?.q && Array.isArray(b.encuesta.options)) {
          const ops = b.encuesta.options.map(x => clip(x, 60).trim()).filter(Boolean).slice(0, 6);
          if (ops.length < 2) return send(res, 400, { error: 'La encuesta necesita al menos 2 opciones' });
          run('update polls set active=0'); run('insert into polls(question,options) values(?,?)', clip(b.encuesta.q, 120), JSON.stringify(ops));
        }
      }
      const poll = q1('select * from polls where active=1 order by id desc limit 1');
      const pr = poll ? q('select option, count(*) n from votes where poll_id=? group by option', poll.id) : [];
      return send(res, 200, { pro: { ...getS('pro', {}), juegos: (await catalogoPro()).length }, apoyo: { ...getS('apoyo', {}), metodos: metodosApoyo(getS('apoyo', {})) }, login: getS('login', {}), tv: getS('tv', { on: false, texto: '', listas: [] }), redesCripto: REDES_CRIPTO, ads: adsCfg(), marca: getS('marca', { nombre: '', eslogan: '' }), bienvenida: getS('bienvenida', { on: true, title: '✨ ¡Bienvenido!', body: 'Desde mañana recibirás tu lectura del día. Mientras tanto, prueba otro test 👉' }), priv: getS('priv', {}), video: getS('video', null), tope: getS('tope', 3), juegoDia: getS('juegoDia', { on: false, hora: '19:30' }), torneo: getS('torneo', {}), campeonesAviso: getS('campeonesAviso', true), famaDias: getS('famaDias', 0), rachaAviso: getS('rachaAviso', { on: true, hora: '19:00' }), horaFeliz: getS('horaFeliz', { on: true, dia: 6, desde: '20:00', hasta: '21:00', extra: 20, aviso: true }), diario: getS('diario', { on: false, hora: '07:30', title: '✨ Tu horóscopo de hoy, {signo}', body: 'Los astros tienen un mensaje para ti. Toca para verlo 👉', url: '/?g=horoscopo&src=push' }),
        encuesta: poll && { q: poll.question, options: JSON.parse(poll.options), votos: JSON.parse(poll.options).map((_, i) => pr.find(x => x.option === i)?.n || 0) } });
    }
    return send(res, 404, { error: 'No existe' });
  }
  return send(res, 404, { error: 'No existe' });
}

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/api/')) return await api(req, res, u);
    // Clic en una notificación: se cuenta y se manda a su destino.
    let m = /^\/c\/(\d+)$/.exec(u.pathname);
    if (m) {
      const c = q1('select url from campaigns where id=?', +m[1]);
      if (c) { run('update campaigns set clicks=clicks+1 where id=?', +m[1]); if (+u.searchParams.get('s')) run('update subscribers set clicks=clicks+1 where id=?', +u.searchParams.get('s')); }
      let to = c ? safeDest(c.url) || '/' : '/';
      if (to.startsWith(PUBLIC_URL)) { const x = new URL(to); if (!x.searchParams.get('src')) x.searchParams.set('src', 'push'); to = x.toString(); }
      return send(res, 302, '', 'text/plain', { location: to });
    }
    // Enlace para compartir: vista previa bonita en Facebook/WhatsApp y luego abre el juego.
    m = /^\/r\/([a-z0-9-]+)$/.exec(u.pathname);
    if (m && JUEGO[m[1]]) {
      const [t, d] = JUEGO[m[1]], txt = clip(u.searchParams.get('t') || '', 120), img = fs.existsSync(path.join(PUB, 'og', m[1] + '.png')) ? `${PUBLIC_URL}/og/${m[1]}.png` : `${PUBLIC_URL}/og/general.png`;
      const deR = String(u.searchParams.get('de') || '').trim(), reto = (/^\d{1,7}$/.test(u.searchParams.get('reto') || '') ? '&reto=' + u.searchParams.get('reto') + (/^[\p{L}\p{N} ._-]{2,16}$/u.test(deR) ? '&de=' + encodeURIComponent(deR) : '') : '') + (/^[a-f0-9]{6}$/.test(u.searchParams.get('mesa') || '') ? '&mesa=' + u.searchParams.get('mesa') : '');
      const target = `/?g=${m[1]}&src=${encodeURIComponent(clip(u.searchParams.get('src') || 'compartido', 40))}${reto}${/^[A-Z2-9]{6}$/.test(u.searchParams.get('ref') || '') ? '&ref=' + u.searchParams.get('ref') : ''}`;
      return send(res, 200, `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(t)}</title>
<meta property="og:type" content="website"><meta property="og:title" content="${esc(txt || t)}"><meta property="og:description" content="${esc(d)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:url" content="${esc(PUBLIC_URL + u.pathname)}">
<meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${esc(target)}"></head><body><a href="${esc(target)}">Continuar</a></body></html>`, 'text/html; charset=utf-8');
    }
    // Fotos subidas para las notificaciones.
    m = /^\/videos\/([a-f0-9]{16}\.mp4)$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, 'videos', m[1]); if (!fs.existsSync(f)) return send(res, 404, 'Este video ya expiró', 'text/plain'); return send(res, 200, fs.readFileSync(f), 'video/mp4', { 'content-disposition': `attachment; filename="glory-brown-${m[1]}"` }); }
    m = /^\/voces\/(juegos|glory|huerto)-(en|pt|fr|de|it|id)\/([a-z0-9_]{2,80}\.mp3|manifest\.json)$/.exec(u.pathname); // 🌍 voces grabadas en otros idiomas
    if (m) { const f = path.join(DATA, `voces_${m[1]}_${m[2]}`, m[3]); return archivo(req, res, f, m[3].endsWith('.json') ? 'application/json' : 'audio/mpeg', { 'cache-control': m[3].endsWith('.json') ? 'no-cache' : 'public, max-age=86400' }); }
    m = /^\/(arte|voces)\/huerto\/([a-z0-9_]{2,80}\.(?:webp|mp3)|manifest\.json)$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, m[1] + '_huerto', m[2]); return archivo(req, res, f, m[2].endsWith('.json') ? 'application/json' : m[2].endsWith('.mp3') ? 'audio/mpeg' : 'image/webp', { 'cache-control': m[2].endsWith('.json') ? 'no-cache' : 'public, max-age=86400' }); }
    m = /^\/arte\/glory\/([a-z0-9_]{2,80}\.webp|manifest\.json)$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, 'arte_glory', m[1]); return archivo(req, res, f, m[1].endsWith('.json') ? 'application/json' : 'image/webp', { 'cache-control': m[1].endsWith('.json') ? 'no-cache' : 'public, max-age=86400' }); }
    m = /^\/arte\/escenas\/([a-z0-9_]{2,40}\.webp|manifest\.json)$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, 'arte_escenas', m[1]); return archivo(req, res, f, m[1].endsWith('.json') ? 'application/json' : 'image/webp', { 'cache-control': m[1].endsWith('.json') ? 'no-cache' : 'public, max-age=86400' }); }
    m = /^\/voces\/juegos\/(n_[a-z0-9]{1,9}_\d\.mp3|manifest\.json)$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, 'voces_juegos', m[1]); return archivo(req, res, f, m[1].endsWith('.json') ? 'application/json' : 'audio/mpeg', { 'cache-control': m[1].endsWith('.json') ? 'no-cache' : 'public, max-age=86400' }); }
    m = /^\/voces\/glory\/([a-z0-9_]{3,80}\.mp3|manifest\.json)$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, 'voces_glory', m[1]); return archivo(req, res, f, m[1].endsWith('.json') ? 'application/json' : 'audio/mpeg', { 'cache-control': m[1].endsWith('.json') ? 'no-cache' : 'public, max-age=86400' }); }
    m = /^\/m\/([a-f0-9]{16}\.(jpg|png|webp|gif))$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, 'media', m[1]); if (!fs.existsSync(f)) return send(res, 404, 'No encontrado', 'text/plain'); return send(res, 200, fs.readFileSync(f), MIME['.' + m[2]] || 'image/' + m[2], { 'cache-control': 'public, max-age=604800' }); }
    { const mi = /^\/i18n\/([a-z]{2})\.json$/.exec(u.pathname); if (mi && IDIOMAS.includes(mi[1])) { const filas = q('select src, dst from i18n where lang=? order by rowid limit 30000', mi[1]), cuerpo = JSON.stringify(Object.fromEntries(filas.map(f => [f.src, f.dst]))), et = '"' + crypto.createHash('sha1').update(cuerpo).digest('base64').slice(0, 16) + '"';
      if (req.headers['if-none-match'] === et) { res.writeHead(304, { etag: et }); return res.end(); } const gz = /gzip/.test(req.headers['accept-encoding'] || ''); return send(res, 200, gz ? zlib.gzipSync(cuerpo) : cuerpo, 'application/json; charset=utf-8', { etag: et, 'cache-control': 'no-cache', vary: 'Accept-Encoding', ...(gz ? { 'content-encoding': 'gzip' } : {}) }); } }
    if (u.pathname.startsWith('/fotos/')) { const r = await fotos.http(req, res, u, { ip: clientIp(req), json, send, limite, archivoEstatico: archivo }); if (r !== false) return; }
    { const mk = /^\/([a-f0-9]{32})\.txt$/.exec(u.pathname); if (mk && mk[1] === getS('indexnowKey', '')) return send(res, 200, mk[1], 'text/plain; charset=utf-8'); }
    if (u.pathname === '/robots.txt') return send(res, 200, `User-agent: *\nAllow: /\nDisallow: /panel\nDisallow: /api/\nSitemap: ${PUBLIC_URL}/sitemap.xml\n`, 'text/plain; charset=utf-8');
    if (u.pathname === '/sitemap.xml') {
      const juegosPro = getS('pro', {}).on ? (await proVisibles()).slice(0, 5000).map(g => ['/juego/' + g.s, '0.6']) : [];
      const proOn = getS('pro', {}).on, cp = proOn ? await catsPro() : [], vis = proOn ? (await proVisibles()).slice(0, 5000) : [];
      const catsUrls = proOn ? [['/juegos', '0.8'], ...cp.map(([c]) => ['/juegos/' + slugDe(c), '0.8']), ...LANGS.flatMap(l => [['/' + l, '0.9'], [`/${l}/games`, '0.8'], ...cp.map(([c]) => [`/${l}/games/` + slugDe(catEn(c)), '0.7'])])] : [];
      // En otros idiomas solo entran los juegos que ya tienen su descripción traducida (páginas con contenido real)
      const juegosEn = proOn ? LANGS.flatMap(l => { const ok = l === 'en' ? null : new Set(q('select src from i18n where lang=?', l).map(r => r.src)); return vis.filter(g => l === 'en' ? descL(g, 'en') : g.d && ok.has(g.d)).map(g => [`/${l}/game/` + g.s, '0.5']); }) : [];
      const hoy = new Date().toISOString().slice(0, 10), urls = [['/', '1.0'], ['/glory', '0.9'], ...CATALOGO.map(t => ['/?g=' + t.id, t.id.startsWith('arcade-') ? '0.8' : '0.6']), ['/campeones', '0.7'], ['/guias', '0.7'], ['/para-tu-web', '0.6'], ['/prensa', '0.5'], ...guiasTodas().map(x => ['/guias/' + x.slug, '0.8']), ['/nosotros.html', '0.3'], ['/terminos.html', '0.2'], ['/privacidad.html', '0.2'], ['/contacto.html', '0.2'], ...catsUrls, ...juegosPro, ...juegosEn];
      return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([l, pr]) => `<url><loc>${esc(PUBLIC_URL + l)}</loc><lastmod>${hoy}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`, 'application/xml; charset=utf-8', { 'cache-control': 'public, max-age=3600' });
    }
    { const mq = /^\/apoyo-qr\/([a-f0-9]{20}\.(png|jpg|webp))$/.exec(u.pathname); if (mq) return archivo(req, res, path.join(QR_DIR, mq[1]), mq[2] === 'jpg' ? 'image/jpeg' : 'image/' + mq[2], { 'cache-control': 'public, max-age=31536000, immutable' }); }
    if (u.pathname === '/apoyar' || u.pathname === '/apoyar.html') return enviarHtml(req, res, paginaApoyo(), { 'cache-control': 'no-cache' });
    const legal = /^\/(terminos|contacto|nosotros|borrar-datos)\.html$/.exec(u.pathname);
    if (legal) return enviarHtml(req, res, paginaLegal(legal[1]), { 'cache-control': 'no-cache' });
    if (u.pathname === '/ads.txt') { const a = adsCfg(), lineas = []; if (/^ca-pub-\d{10,20}$/.test(a.client || '')) lineas.push(`google.com, ${a.client.replace('ca-', '')}, DIRECT, f08c47fec0942fa0`); for (const l of String(a.extra || '').split(/\r?\n/)) { const t = l.trim(); if (/^[a-z0-9.-]+\.[a-z]{2,}\s*,\s*[\w.:-]+\s*,\s*(DIRECT|RESELLER)\s*(,\s*[\w.-]+)?\s*(#.*)?$/i.test(t) || /^(OWNERDOMAIN|MANAGERDOMAIN|CONTACT|SUBDOMAIN|INVENTORYPARTNERDOMAIN)\s*=\s*[^\s<>]+$/i.test(t) || /^#[^<>]{0,200}$/.test(t)) lineas.push(t); } return send(res, 200, lineas.join('\n') + '\n', 'text/plain; charset=utf-8', { 'cache-control': 'no-cache' }); }
    // Política de privacidad con tus datos (se completa en el panel → Ajustes; sobrevive a las actualizaciones).
    if (u.pathname === '/privacidad.html') {
      const pv = getS('priv', {}), x = (v, d) => esc(v || d);
      let h = fs.readFileSync(path.join(PUB, 'privacidad.html'), 'utf8')
        .replace('TU NOMBRE O EMPRESA', x(pv.nombre, 'TU NOMBRE O EMPRESA')).replace('TU CIUDAD, PERÚ', x(pv.ciudad, 'TU CIUDAD, PERÚ'))
        .replaceAll('TU-CORREO@EJEMPLO.COM', x(pv.correo, 'TU-CORREO@EJEMPLO.COM')).replace('PLAZO (por ejemplo, 24 meses)', x(pv.plazo, '24 meses'))
        .replace('NÚMERO DE INSCRIPCIÓN', x(pv.codigo, 'en trámite'));
      if (pv.nombre && pv.correo) h = h.replace(/<p class="n">[\s\S]*?<\/p>/, '');
      return send(res, 200, h, 'text/html; charset=utf-8', { 'cache-control': 'no-cache' });
    }
    // Entrada directa al panel desde ShortForge (misma PC): /panel?k=<token>
    if (u.pathname === '/panel' && u.searchParams.get('k') && LOCAL_TOKEN && u.searchParams.get('k').length === 64 && crypto.timingSafeEqual(Buffer.from(u.searchParams.get('k')), Buffer.from(LOCAL_TOKEN))) {
      return send(res, 302, '', 'text/plain', { location: '/panel' + (u.searchParams.get('tema') ? '?tema=' + encodeURIComponent(u.searchParams.get('tema')) : ''), 'set-cookie': `sid=${nuevaSesion()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` });
    }
    // Página principal con la vista previa correcta para Facebook/WhatsApp (imagen y textos de cada test).
    if (u.pathname === '/glory' || u.pathname === '/glory/') { // GLORY BROWN como app instalable (su propio ícono y nombre)
      const t = CATALOGO.find(x => x.id === 'arcade-batalla') || { t: 'GLORY BROWN', d: '' }, img = `${PUBLIC_URL}/og/arcade-batalla.png`;
      const og = `<title>GLORY BROWN · El Choque de los Reinos</title><meta name="description" content="${esc(t.d)}"><meta property="og:type" content="website"><meta property="og:title" content="👑 GLORY BROWN · El Choque de los Reinos"><meta property="og:description" content="${esc(t.d)} ¡Juega gratis!"><meta property="og:url" content="${esc(PUBLIC_URL + '/glory')}"><meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(img)}"><meta name="apple-mobile-web-app-title" content="GLORY BROWN"><link rel="apple-touch-icon" href="/glory/icono-192.png"><script>if (!/[?&]g=/.test(location.search)) history.replaceState(null, '', '/glory?g=arcade-batalla&' + (/[?&]src=/.test(location.search) ? location.search.slice(1) : 'src=app' + location.search.replace('?', '&')));</script>`;
      return send(res, 200, fs.readFileSync(path.join(PUB, 'index.html'), 'utf8').replace('<link rel="manifest" href="/manifest.webmanifest">', '<link rel="manifest" href="/glory/manifest.webmanifest">').replace('<link rel="apple-touch-icon" href="/icon.png">', '').replace('<!--OG-->', og + adsScript()), 'text/html; charset=utf-8', { 'cache-control': 'no-cache' });
    }
    // 🧩 Juegos para poner en otras webs (blogs, profesores, comunidades): cada partida allí lleva gente a Yupitok
    { const mb = /^\/embed\/([a-z0-9-]{3,40})\/?$/.exec(u.pathname); if (mb) {
      const t = CATALOGO.find(x => x.id === mb[1] && EMBEBIBLES.includes(x.id)); if (!t) return send(res, 404, 'Juego no disponible', 'text/plain; charset=utf-8');
      const og = `<title>${esc(t.t)} · Yupitok</title><meta name="robots" content="noindex"><link rel="canonical" href="${esc(PUBLIC_URL + '/?g=' + t.id)}"><style>.embed [data-app],.embed #appPill,.embed #btnIdioma{display:none!important}#yupiEmb{position:fixed;left:8px;bottom:8px;z-index:99;background:linear-gradient(90deg,#22e6ff,#8b5cf6,#ff3df0);color:#fff;font:800 12px system-ui,sans-serif;padding:6px 10px;border-radius:999px;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.4)}</style><script>window.EMBED=1;document.documentElement.classList.add('embed');history.replaceState(null,'','/?g=${t.id}&src='+encodeURIComponent(('embed-'+((()=>{try{return new URL(document.referrer).hostname.replace(/^www\\./,'')}catch(e){return ''}})()||'web')).slice(0,60)));addEventListener('DOMContentLoaded',()=>{const a=document.createElement('a');a.id='yupiEmb';a.href='${esc(PUBLIC_URL)}/?src=embed-boton';a.target='_blank';a.rel='noopener';a.textContent='🎮 Más juegos gratis en Yupitok';document.body.append(a)});</script>`;
      return enviarHtml(req, res, fs.readFileSync(path.join(PUB, 'index.html'), 'utf8').replace('<!--OG-->', og), { 'cache-control': 'no-cache' }); // sin AdSense dentro de otras webs
    } }
    if (u.pathname === '/para-tu-web') {
      const sitio = getS('marca', null)?.nombre || 'Yupitok', url = PUBLIC_URL + '/para-tu-web', L = EMBEBIBLES.map(id => CATALOGO.find(x => x.id === id)).filter(Boolean);
      const codigo = t => `<iframe src="${PUBLIC_URL}/embed/${t.id}" width="100%" height="640" style="border:0;border-radius:12px;max-width:520px" allow="autoplay; fullscreen" loading="lazy" title="${t.t} - juego gratis"></iframe>\n<p style="font-size:13px">Juego gratis de <a href="${PUBLIC_URL}/">${sitio}</a></p>`;
      return enviarHtml(req, res, headNeon(`Pon juegos gratis en tu web o blog · ${sitio}`, `Juegos gratis para poner en tu web, blog o comunidad: copia y pega el código. Sin costo y sin anuncios dentro del juego.`, url, [migas([['Yupitok', '/'], ['Para tu web', '/para-tu-web']])])
        + `<p class="miga"><a href="/">← Volver a Yupitok</a></p><h1>🧩 Pon nuestros juegos gratis en tu web</h1><p>¿Tienes un blog, una web de juegos, de tecnología o de tu comunidad? Agrega un juego de Yupitok gratis: solo copia el código y pégalo en tu página (en WordPress, Blogger, Google Sites o Wix usa un bloque "HTML" o "Insertar").</p><ul><li>✅ Gratis para siempre.</li><li>✅ Sin anuncios dentro del juego.</li><li>✅ Funciona en celular, tablet y computadora.</li><li>✅ Para todo público: el chat y las salas en vivo no se muestran dentro del juego insertado.</li></ul>`
        + L.map(t => `<div style="border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:12px;margin:14px 0"><h2 style="margin:0 0 4px">${esc(t.e || '🎮')} ${esc(t.t)}</h2><p style="margin:0 0 8px;opacity:.85">${esc(t.d || '')}</p><textarea readonly rows="4" style="width:100%;font:12px monospace;border-radius:8px;padding:8px;background:#0b0820;color:#e9e4ff;border:1px solid #5b4bb5" onclick="this.select()">${esc(codigo(t))}</textarea><p style="margin:6px 0 0"><a href="/embed/${t.id}" target="_blank" rel="noopener">👀 Ver cómo se ve</a></p></div>`).join('')
        + `<p style="opacity:.8;font-size:.9rem">¿Quieres un juego especial para tu comunidad o tu marca? Escríbenos desde <a href="/contacto.html">Contacto</a>.</p>` + PIE_NEON, { 'cache-control': 'public, max-age=900' });
    }
    if (u.pathname === '/prensa') {
      const sitio = getS('marca', null)?.nombre || 'Yupitok', pv = getS('priv', {}), correo = pv.correo || '', url = PUBLIC_URL + '/prensa', n = getS('pro', {}).on ? (await proVisibles()).length : 0;
      return enviarHtml(req, res, headNeon(`Prensa y creadores · ${sitio}`, `Kit de prensa de ${sitio}: qué es, datos, logos e imágenes para descargar, y cómo hacer un torneo con tu comunidad.`, url, [migas([['Yupitok', '/'], ['Prensa y creadores', '/prensa']])])
        + `<p class="miga"><a href="/">← Volver a Yupitok</a></p><p style="text-align:center"><img src="/brand/mascota-128.webp" width="110" height="110" alt="Yupi, la mascota de Yupitok"></p><h1 style="text-align:center">📰 Prensa y creadores</h1>
<h2>¿Qué es ${esc(sitio)}?</h2><p><b>${esc(sitio)}</b> es una plataforma peruana de juegos gratis en el navegador, con el lema <b>"¡Juega, ríe, aprende y gana!"</b>. Se juega sin instalar nada, en el celular o la computadora, y está disponible en 7 idiomas.</p>
<ul><li>🎮 ${n ? `Más de ${n.toLocaleString('es-PE')} juegos` : 'Miles de juegos'} de estudios de todo el mundo, más juegos propios.</li><li>👑 <b>GLORY BROWN: El Choque de los Reinos</b>: batallas de cartas en línea 1 vs 1 y 2 vs 2 con 127 personajes, hecho en Perú.</li><li>🌱 <b>Huerto Defensor</b>: defiende la chacra con choclos, cocos y ajíes, en 30 niveles.</li><li>🎓 Juegos educativos por niveles y juegos cristianos para la familia.</li><li>🏆 Premio diario, torneo semanal gratis y Salón de la Fama mensual.</li></ul>
<h2>🖼️ Logos e imágenes</h2><p>Puedes usarlos para hablar de ${esc(sitio)} (sin modificarlos):</p><div class="grid"><a class="t" href="/brand/logo-horizontal.png" download><img src="/brand/logo-horizontal.webp" alt="Logo de Yupitok" style="object-fit:contain;background:#0b0820"><span>⬇️ Logo horizontal</span></a><a class="t" href="/brand/yupitok-512.png" download><img src="/brand/yupitok-512.png" alt="Ícono de Yupitok"><span>⬇️ Ícono</span></a><a class="t" href="/brand/mascota.webp" download><img src="/brand/mascota.webp" alt="Yupi, la mascota"><span>⬇️ Yupi (mascota)</span></a><a class="t" href="/brand/yupitok-arte.webp" download><img src="/brand/yupitok-arte.webp" alt="Arte de Yupitok"><span>⬇️ Arte</span></a></div>
<h2>🎥 ¿Eres creador o streamer?</h2><p>Hagamos un <b>torneo con tu nombre</b>: tus seguidores juegan gratis, el ranking es en vivo y el campeón entra al <a href="/campeones">Salón de la Fama</a> con su red social. Te damos un enlace propio para que veas cuántos llegan. Sin costo y sin apuestas.</p>
<h2>🧩 ¿Tienes una web o un blog?</h2><p>Pon nuestros juegos gratis en tu página: <a href="/para-tu-web">códigos para tu web</a>.</p>
<h2>📩 Contacto</h2><p>${correo ? `Escríbenos a <b>${esc(correo)}</b> (asunto: "Prensa" o "Creador").` : 'Escríbenos desde la página de <a href="/contacto.html">Contacto</a>.'}</p>` + PIE_NEON, { 'cache-control': 'public, max-age=900' });
    }
    { const me = /^\/(en|pt|fr|de|it|id)(?:\/(games|game)(?:\/([a-z0-9-]{1,90}))?)?\/?$/.exec(u.pathname); if (me && getS('pro', {}).on) { // 🌍 Yupitok en otros idiomas (para todo el mundo)
      const L = me[1], T = TXT[L], todos = await proVisibles(), cats = await catsPro(), J7 = jugadas7(), sitio = getS('marca', null)?.nombre || 'Yupitok';
      const tile = g => `<a class="t" href="/${L}/game/${esc(g.s)}">${g.img ? `<img src="${esc(g.img)}" alt="${esc(g.t)}" loading="lazy">` : ''}<span>${esc(g.t)}</span></a>`;
      const cn = c => catL(c, L), cs = c => slugDe(catEn(c)), lc = c => T.lc ? cn(c).toLowerCase() : cn(c);
      const chips = `<div class="chips">${cats.map(([c, l]) => `<a href="/${L}/games/${cs(c)}">${esc(cn(c))} (${l.length})</a>`).join('')}</div>`;
      const n = todos.length.toLocaleString(T.num), cc = { 'cache-control': 'public, max-age=900' }, pie = pieIdioma(L);
      const masJ = l => l.slice().sort((a, b) => (J7.get(b.id) || 0) - (J7.get(a.id) || 0)), hl = '&hl=' + L + '&src=web-' + L;
      if (!me[2]) { const top = await topPro(24), url = PUBLIC_URL + '/' + L;
        return enviarHtml(req, res, headNeon(T.tHome(sitio, n), T.dHome(n), url, [{ '@context': 'https://schema.org', '@type': 'WebSite', name: sitio, url, inLanguage: L }, { '@context': 'https://schema.org', '@type': 'Organization', name: sitio, url: PUBLIC_URL + '/', logo: PUBLIC_URL + '/icon-512.png', slogan: T.slogan }], altDe('home'), L)
          + `<p style="text-align:center"><img src="/brand/mascota-128.webp" alt="Yupitok" width="96" height="96"></p><h1 style="text-align:center">🎮 ${esc(T.h1Home(sitio))}</h1><p style="text-align:center"><b>${T.slogan}</b> ${T.introHome(n)}</p>`
          + `<a class="btn" href="/?g=pro${hl}">${T.play}</a><h2>${T.most}</h2><div class="grid">${top.map(tile).join('')}</div><h2>${T.cats}</h2>${chips}<h2>🏆 ${T.whyT(esc(sitio))}</h2><ul>${T.why.map(x => `<li>${x}</li>`).join('')}</ul>` + pie, cc); }
      if (me[2] === 'games' && !me[3]) { const url = PUBLIC_URL + `/${L}/games`;
        return enviarHtml(req, res, headNeon(T.tCats(n, sitio), T.dHome(n), url, [migas([['Yupitok', '/' + L], [T.games, `/${L}/games`]]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: T.h1Cats, url, inLanguage: L }], altDe('cats'), L)
          + `<p class="miga"><a href="/${L}">← Yupitok</a></p><h1>🕹️ ${T.h1Cats}</h1><p>${T.introHome(n)}</p>${chips}`
          + cats.slice(0, 12).map(([c, l]) => `<h2><a href="/${L}/games/${cs(c)}" style="color:inherit">${esc(cn(c))}</a></h2><div class="grid">${masJ(l).slice(0, 6).map(tile).join('')}</div><p><a href="/${L}/games/${cs(c)}">${T.seeAll(l.length, esc(lc(c)))} →</a></p>`).join('') + pie, cc); }
      if (me[2] === 'games') { const ent = cats.find(([c]) => cs(c) === me[3]); if (!ent) { res.writeHead(302, { location: `/${L}/games` }); return res.end(); }
        const [cat, lista] = ent, cl = lc(cat), url = PUBLIC_URL + `/${L}/games/` + me[3], ord = masJ(lista), intro = T.introCat(cl);
        const ld = [migas([['Yupitok', '/' + L], [T.games, `/${L}/games`], [cn(cat), `/${L}/games/` + me[3]]]), { '@context': 'https://schema.org', '@type': 'ItemList', name: T.freeCat(cl), numberOfItems: Math.min(60, ord.length), itemListElement: ord.slice(0, 60).map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: PUBLIC_URL + `/${L}/game/` + g.s, name: g.t })) }];
        return enviarHtml(req, res, headNeon(`${T.freeCat(cl)} (${lista.length}) · ${sitio}`, `${intro.slice(0, 120)} ${lista.length} · ${sitio}`, url, ld, altDe('cat', cat), L)
          + `<p class="miga"><a href="/${L}">Yupitok</a> › <a href="/${L}/games">${T.games}</a> › ${esc(cn(cat))}</p><h1>🎮 ${esc(T.freeCat(cl))}</h1><p>${esc(intro)}</p><p>${T.mostCat(lista.length, esc(cl))} ${ord.slice(0, 3).map(g => `<a href="/${L}/game/${esc(g.s)}">${esc(g.t)}</a>`).join(', ')}.</p>`
          + `<div class="grid">${ord.slice(0, 120).map(tile).join('')}</div>${chips}` + pie, cc); }
      const id = /([a-f0-9]{12})$/.exec(me[3] || '')?.[1], g = id && todos.find(x => x.id === id);
      if (!g) { res.writeHead(302, { location: `/${L}/games` }); return res.end(); }
      if (me[3] !== g.s) { res.writeHead(301, { location: `/${L}/game/` + g.s }); return res.end(); }
      const ce = cn(g.cat), cl = lc(g.cat), url = PUBLIC_URL + `/${L}/game/` + g.s, d = descL(g, L), desc = (d ? d.replace(/\s+/g, ' ').slice(0, 150) + ' ' : '') + T.gTail(cl);
      const rel = masJ(todos.filter(x => x.cat === g.cat && x.id !== g.id)).slice(0, 12), jugar = `/juego/${esc(g.s)}?hl=${L}&src=web-${L}`;
      const ld = [{ '@context': 'https://schema.org', '@type': 'VideoGame', name: g.t, description: d || desc, url, image: g.img || undefined, genre: ce, inLanguage: L, isAccessibleForFree: true, gamePlatform: ['Web', 'Android', 'iOS'], applicationCategory: 'Game', operatingSystem: 'Web', publisher: { '@type': 'Organization', name: sitio } }, migas([['Yupitok', '/' + L], [T.games, `/${L}/games`], [ce, `/${L}/games/` + cs(g.cat)], [g.t, `/${L}/game/` + g.s]])];
      return enviarHtml(req, res, headNeon(T.tGame(g.t, sitio), desc, url, ld, altDe('game', g.s), L).replace('</head>', g.img ? `<meta property="og:image" content="${esc(g.img)}"><meta name="twitter:card" content="summary_large_image"></head>` : '</head>')
        + `<p class="miga"><a href="/${L}">Yupitok</a> › <a href="/${L}/games">${T.games}</a> › <a href="/${L}/games/${cs(g.cat)}">${esc(ce)}</a></p><h1>🎮 ${esc(g.t)}</h1><p>${esc(T.gMeta(ce))}</p><a class="btn" href="${jugar}">${T.playG}</a>${g.img ? `<a href="${jugar}"><img src="${esc(g.img)}" alt="${esc(g.t)}" width="512" height="384" style="width:100%;height:auto;max-height:300px;object-fit:cover;border-radius:16px;display:block"></a>` : ''}${d ? `<p>${esc(d)}</p>` : ''}`
        + `<h2>${T.howT}</h2><p>${T.how(esc(cl), `<a href="/${L}/games">${n}</a>`)}</p>`
        + (rel.length ? `<h2>${T.more(esc(cl))}</h2><div class="grid">${rel.map(tile).join('')}</div>` : '') + `<p style="font-size:.8rem;opacity:.7">${T.third}</p>` + pie, { 'cache-control': 'public, max-age=600' });
    } }
    { const mc = /^\/juegos(?:\/([a-z0-9-]{2,60}))?\/?$/.exec(u.pathname); if (mc) { // 🕹️ Categorías de juegos (páginas para Google)
      if (!getS('pro', {}).on) { res.writeHead(302, { location: '/' }); return res.end(); }
      const sitio = getS('marca', null)?.nombre || 'Yupitok', cats = await catsPro(), J7 = jugadas7();
      const tile = g => `<a class="t" href="/juego/${esc(g.s)}">${g.img ? `<img src="${esc(g.img)}" alt="${esc(g.t)}" loading="lazy">` : ''}<span>${esc(g.t)}</span></a>`;
      const chips = `<div class="chips">${cats.map(([c, l]) => `<a href="/juegos/${slugDe(c)}">${esc(c)} (${l.length})</a>`).join('')}</div>`;
      if (!mc[1]) { const url = PUBLIC_URL + '/juegos', total = cats.reduce((a, [, l]) => a + l.length, 0);
        return enviarHtml(req, res, headNeon(`Juegos gratis por categoría: ${total.toLocaleString('es-PE')} juegos sin instalar · ${sitio}`, `Más de ${total.toLocaleString('es-PE')} juegos gratis sin instalar: carreras, disparos, rompecabezas, deportes, estrategia y más. Juega al instante en el celular o la PC.`, url, [migas([['Yupitok', '/'], ['Juegos', '/juegos']]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Juegos gratis por categoría', url, inLanguage: 'es' }], altDe('cats'))
          + `<p class="miga"><a href="/">← Volver a Yupitok</a></p><h1>🕹️ Juegos gratis por categoría</h1><p>Más de <b>${total.toLocaleString('es-PE')} juegos gratis</b> para jugar al instante, sin descargar nada, en el celular, la tablet o la computadora. Elige tu categoría favorita:</p>${chips}`
          + cats.slice(0, 12).map(([c, l]) => `<h2><a href="/juegos/${slugDe(c)}" style="color:inherit">${esc(c)}</a></h2><div class="grid">${l.slice().sort((a, b) => (J7.get(b.id) || 0) - (J7.get(a.id) || 0)).slice(0, 6).map(tile).join('')}</div><p><a href="/juegos/${slugDe(c)}">Ver los ${l.length} juegos de ${esc(c.toLowerCase())} →</a></p>`).join('') + PIE_NEON, { 'cache-control': 'public, max-age=900' }); }
      const ent = cats.find(([c]) => slugDe(c) === mc[1]); if (!ent) { res.writeHead(302, { location: '/juegos' }); return res.end(); }
      const [cat, lista] = ent, url = PUBLIC_URL + '/juegos/' + mc[1], ord = lista.slice().sort((a, b) => (J7.get(b.id) || 0) - (J7.get(a.id) || 0)), catL = cat.toLowerCase();
      const intro = INTRO_CAT[cat] || `Los mejores juegos de ${catL} gratis: juégalos al instante desde el navegador, en el celular o la computadora, sin instalar nada.`;
      const ld = [migas([['Yupitok', '/'], ['Juegos', '/juegos'], [cat, '/juegos/' + mc[1]]]), { '@context': 'https://schema.org', '@type': 'ItemList', name: `Juegos de ${catL} gratis`, numberOfItems: Math.min(60, ord.length), itemListElement: ord.slice(0, 60).map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: PUBLIC_URL + '/juego/' + g.s, name: g.t })) }];
      const top = ord.slice(0, 5).map(g => `<b>${esc(g.t)}</b>`).join(', ');
      return enviarHtml(req, res, headNeon(`Juegos de ${catL} gratis (${lista.length}) · Juega sin instalar · ${sitio}`, `${intro.slice(0, 120)} ${lista.length} juegos de ${catL} gratis en ${sitio}.`, url, ld, altDe('cat', cat))
        + `<p class="miga"><a href="/">Yupitok</a> › <a href="/juegos">Juegos</a> › ${esc(cat)}</p><h1>🎮 Juegos de ${esc(catL)} gratis</h1><p>${esc(intro)}</p><p>Tenemos <b>${lista.length} juegos de ${esc(catL)}</b>. Los más jugados esta semana: ${top}.</p>`
        + `<div class="grid">${ord.slice(0, 120).map(tile).join('')}</div>${lista.length > 120 ? `<p>…y ${lista.length - 120} juegos más en <a href="/?g=pro">el catálogo completo</a>.</p>` : ''}`
        + `<h2>¿Cómo jugar?</h2><p>Toca cualquier juego para abrir su página y aprieta <b>"Jugar ahora"</b>. Todos son gratis, funcionan en el navegador y no ocupan espacio en tu celular. Si un juego no carga, avísanos con el botón "¿No carga?" para revisarlo.</p><h2>Otras categorías</h2>${chips}` + PIE_NEON, { 'cache-control': 'public, max-age=900' });
    } }
    { const mg = /^\/guias(?:\/([a-z0-9-]{3,80}))?\/?$/.exec(u.pathname); if (mg) { // 📝 Guías y trucos (contenido propio)
      const G = guiasTodas();
      const sitio = getS('marca', null)?.nombre || 'Yupitok', g = mg[1] ? G.find(x => x.slug === mg[1]) : null; if (mg[1] && !g) return send(res, 404, 'Guía no encontrada', 'text/plain; charset=utf-8');
      const css = `<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:0 auto;padding:22px 16px 60px;line-height:1.7;color:#f3f0ff;background:radial-gradient(circle at 15% 0,rgba(255,61,240,.22),transparent 40%),radial-gradient(circle at 90% 20%,rgba(34,230,255,.18),transparent 45%),radial-gradient(circle at 50% 0,#25106b,#0c0830 55%,#04030f) fixed;font-size:17px}a{color:#22e6ff}h1{line-height:1.25;text-shadow:0 0 14px rgba(255,61,240,.5)}h2{margin-top:1.6em;color:#fde68a}.card{background:rgba(14,11,40,.78);border:1px solid rgba(34,230,255,.3);border-radius:18px;padding:14px 16px;margin:12px 0}.btn{display:block;text-align:center;padding:15px;border-radius:14px;background:linear-gradient(90deg,#22e6ff,#8b5cf6,#ff3df0);color:#fff;font-weight:800;text-decoration:none;margin:18px 0;font-size:1.1rem}.miga{font-size:.85rem;opacity:.8}li{margin:4px 0}</style>`;
      const head = (t, d, url, ld) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t)}</title><meta name="description" content="${esc(d)}"><link rel="canonical" href="${esc(url)}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(d)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(PUBLIC_URL + '/og/general.png')}"><link rel="icon" href="/icon.png?v=3">${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}${adsScript()}${css}</head><body>`;
      const pie = `<p class="miga" style="margin-top:30px"><a href="/">🎮 Yupitok</a> · <a href="/guias">📝 Guías</a> · <a href="/campeones">👑 Salón de la Fama</a> · <a href="/para-tu-web">🧩 Para tu web</a> · <a href="/prensa">📰 Prensa</a> · 🌍 <a href="/en" hreflang="en">English</a> · <a href="/pt" hreflang="pt">Português</a> · <a href="/fr" hreflang="fr">Français</a> · <a href="/de" hreflang="de">Deutsch</a> · <a href="/it" hreflang="it">Italiano</a> · <a href="/id" hreflang="id">Indonesia</a> · <a href="/nosotros.html">Quiénes somos</a> · <a href="/contacto.html">Contacto</a> · <a href="/privacidad.html">Privacidad</a></p><script src="/i18n.js?v=5"></script></body></html>`;
      if (!g) { const url = PUBLIC_URL + '/guias'; return enviarHtml(req, res, head(`📝 Guías y trucos de juegos · ${sitio}`, 'Guías, trucos y consejos para ganar en GLORY BROWN, Huerto Defensor y los juegos gratis de Yupitok.', url, { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Guías y trucos', url, inLanguage: 'es' })
        + `<p class="miga"><a href="/">← Volver a jugar</a></p><h1>📝 Guías y trucos</h1><p>Consejos para ganar en nuestros juegos y aprovechar los premios de ${esc(sitio)}.</p>${G.map(x => `<a class="card" href="/guias/${esc(x.slug)}" style="display:block;text-decoration:none;color:inherit"><b style="font-size:1.1rem">${esc(x.emoji)} ${esc(x.titulo)}</b><br><span style="opacity:.85">${esc(x.desc)}</span></a>`).join('')}` + pie, { 'cache-control': 'public, max-age=600' }); }
      const url = PUBLIC_URL + '/guias/' + g.slug, otras = G.filter(x => x.slug !== g.slug).slice(0, 4);
      const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: g.titulo, description: g.desc, inLanguage: 'es', datePublished: g.fecha, dateModified: g.fecha, mainEntityOfPage: url, image: PUBLIC_URL + '/og/general.png', author: { '@type': 'Organization', name: sitio }, publisher: { '@type': 'Organization', name: sitio, logo: { '@type': 'ImageObject', url: PUBLIC_URL + '/icon-512.png' } } };
      const jugar = g.juego ? `<a class="btn" href="/?g=${esc(g.juego)}">▶ Jugar ahora gratis</a>` : `<a class="btn" href="/">🎮 Entrar a Yupitok</a>`;
      return enviarHtml(req, res, head(`${g.titulo} · ${sitio}`, g.desc, url, ld) + `<p class="miga"><a href="/">Yupitok</a> › <a href="/guias">Guías</a></p><h1>${esc(g.emoji)} ${esc(g.titulo)}</h1>${jugar}<article>${g.html}</article>${jugar}<h2>📝 Más guías</h2>${otras.map(x => `<a class="card" href="/guias/${esc(x.slug)}" style="display:block;text-decoration:none;color:inherit"><b>${esc(x.emoji)} ${esc(x.titulo)}</b></a>`).join('')}` + pie, { 'cache-control': 'public, max-age=600' });
    } }
    if (u.pathname === '/campeones' || u.pathname === '/campeones.html') { // 👑 Salón de la Fama
      const A = mesPeru(-1), M = mesPeru(); mesCerrar(A); const sitio = getS('marca', null)?.nombre || 'Yupitok';
      const PM = new Map((getS('pro', {}).on ? await catalogoPro() : []).map(g => [g.id, g])), esPro = jg => /^[a-f0-9]{12}$/.test(jg), unidad = jg => jg === 'jugador' || esPro(jg) ? ' min' : '';
      const tit = jg => { if (jg === 'jugador') return '🎮 Jugador del mes (tiempo jugado en Yupitok)'; if (esPro(jg)) return '🕹️ Fan #1 de ' + (PM.get(jg)?.t || 'un juego'); const t = CATALOGO.find(x => x.id === 'arcade-' + jg); return t ? `${t.e} ${t.t.split(':')[0]}` : jg; };
      const enlaceJ = jg => jg === 'jugador' ? '/?g=pro' : esPro(jg) ? (PM.get(jg) ? '/juego/' + PM.get(jg).s : '/?g=pro') : '/?g=arcade-' + jg;
      const camp = q("select * from campeones where mes=? order by (juego='jugador') desc, juego, puesto", A.mes), porJ = {}; for (const r of camp) (porJ[r.juego] = porJ[r.juego] || []).push(r);
      const jugMes = topJugadores(M.mes, 3);
      const lideres = q('select distinct juego from arcade where created_at>=? and created_at<?', M.desde, M.hasta).map(r => ({ juego: r.juego, top: topMes(r.juego, M, 1)[0] })).filter(x => x.top).sort((a, b) => tit(a.juego).localeCompare(tit(b.juego)));
      const fila = (r, med) => { const red = redDe(r.uid); return `<div class="f"><span>${med} <b>${esc(r.nombre)}</b>${red ? ` · <a href="${esc(red.url)}" target="_blank" rel="nofollow ugc noopener noreferrer">${esc(red.red)}: @${esc(red.usuario)}</a>` : ''}</span><b>${r.puntos}${unidad(r.juego)}</b></div>`; };
      const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>👑 Salón de la Fama · Campeones de ${A.nombre} · ${esc(sitio)}</title><meta name="description" content="Los mejores jugadores de ${esc(sitio)}: campeones de ${A.nombre} y líderes de ${M.nombre} en cada juego. ¿Te atreves a quitarles el trono?"><link rel="canonical" href="${esc(PUBLIC_URL + '/campeones')}"><meta property="og:title" content="👑 Campeones de ${A.nombre} en ${esc(sitio)}"><meta property="og:description" content="¿Te atreves a quitarles el trono? Juega gratis."><meta property="og:image" content="${esc(PUBLIC_URL + '/og/general.png')}">${adsScript()}
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:0 auto;padding:22px 16px 60px;color:#f3f0ff;background:radial-gradient(circle at 15% 0,rgba(255,61,240,.22),transparent 40%),radial-gradient(circle at 90% 20%,rgba(34,230,255,.18),transparent 45%),radial-gradient(circle at 50% 0,#25106b,#0c0830 55%,#04030f) fixed}a{color:#22e6ff}h1{text-shadow:0 0 14px rgba(255,61,240,.6);text-align:center}.card{background:rgba(14,11,40,.78);border:1px solid rgba(34,230,255,.3);border-radius:18px;padding:14px;margin:12px 0}.f{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.08)}.btn{display:block;text-align:center;padding:14px;border-radius:12px;background:linear-gradient(90deg,#22e6ff,#8b5cf6,#ff3df0);color:#fff;font-weight:800;text-decoration:none;margin-top:16px}</style></head><body>
<p><a href="/">← Volver a jugar</a></p><h1>👑 Salón de la Fama</h1><p style="text-align:center">Los mejores de cada juego. Los campeones del mes ganan un lugar aquí para siempre y muestran su red social para que los sigas.</p>
<h2>🏆 Campeones de ${A.nombre}</h2>${Object.keys(porJ).length ? Object.entries(porJ).map(([jg, l]) => `<div class="card"><b><a href="${esc(enlaceJ(jg))}" style="color:inherit">${esc(tit(jg))}</a></b>${l.map(r => fila(r, ['🥇', '🥈', '🥉'][r.puesto - 1])).join('')}</div>`).join('') : `<p>El primer Salón de la Fama se arma al terminar ${A.nombre === M.nombre ? 'este mes' : M.nombre}. ¡Todavía puedes ser campeón!</p>`}
<h2>🔥 Líderes de ${M.nombre} (en vivo)</h2>${jugMes.length ? `<div class="card"><b>🎮 Jugador del mes (tiempo jugado)</b>${jugMes.map((r, i) => `<div class="f"><span>${['🥇', '🥈', '🥉'][i]} <b>${esc(r.nombre)}</b></span><b>${r.min} min</b></div>`).join('')}</div>` : ''}${lideres.map(x => `<div class="card"><b><a href="/?g=arcade-${esc(x.juego)}" style="color:inherit">${esc(tit(x.juego))}</a></b><div class="f"><span>👑 <b>${esc(x.top.nombre)}</b></span><b>${x.top.puntos}</b></div></div>`).join('') || '<p>Nadie ha jugado este mes todavía. ¡Sé el primero!</p>'}
<a class="btn" href="/">🎮 Jugar y quitarles el trono</a><p style="font-size:.8rem;opacity:.7;margin-top:16px">Las redes sociales las ponen los mismos campeones y se revisan antes de mostrarse. Si ves algo que no corresponde, escríbenos desde <a href="/contacto.html">Contacto</a>.</p><script src="/i18n.js?v=5"></script></body></html>`;
      return enviarHtml(req, res, html, { 'cache-control': 'public, max-age=120' });
    }
    { const mj = /^\/juego\/([a-z0-9-]{0,80}?)-?([a-f0-9]{12})\/?$/.exec(u.pathname); if (mj) { // 🕹️ Página propia de cada juego profesional (para que Google la encuentre)
      const todos = getS('pro', {}).on ? await proVisibles() : [], g = todos.find(x => x.id === mj[2]);
      if (!g) { res.writeHead(302, { location: '/?g=pro' }); return res.end(); }
      if (u.pathname !== '/juego/' + g.s) { res.writeHead(301, { location: '/juego/' + g.s }); return res.end(); }
      const sitio = getS('marca', null)?.nombre || 'Yupitok', d = descEs(g), titulo = `${g.t}: juega gratis online · ${sitio}`, url = PUBLIC_URL + '/juego/' + g.s;
      const desc = (d ? d.replace(/\s+/g, ' ').slice(0, 150) + ' ' : '') + `Juego de ${g.cat.toLowerCase()} gratis, sin instalar, en celular y PC.`;
      const J7r = jugadas7(), rel = todos.filter(x => x.cat === g.cat && x.id !== g.id).sort((a, b) => (J7r.get(b.id) || 0) - (J7r.get(a.id) || 0)).slice(0, 12);
      const og = `<title>${esc(titulo)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(sitio)}"><meta property="og:title" content="${esc(g.t)} · ¡Juega gratis!"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">${g.img ? `<meta property="og:image" content="${esc(g.img)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(g.img)}">` : ''}<meta property="og:locale" content="es_LA">${hrefl(altDe('game', g.s))}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'VideoGame', name: g.t, description: d || desc, url, image: g.img || undefined, genre: g.cat, inLanguage: 'es', isAccessibleForFree: true, gamePlatform: ['Web', 'Android', 'iOS'], applicationCategory: 'Game', operatingSystem: 'Web', publisher: { '@type': 'Organization', name: sitio } }).replace(/</g, '\\u003c')}</script>
<script type="application/ld+json">${JSON.stringify(migas([['Yupitok', '/'], ['Juegos', '/juegos'], [g.cat, '/juegos/' + slugDe(g.cat)], [g.t, '/juego/' + g.s]])).replace(/</g, '\\u003c')}</script>
<script>window.JUEGO_SEO=${JSON.stringify(g).replace(/</g, '\\u003c')};</script>`;
      const art = `<article id="seoJuego" class="card" style="margin-top:6px">${g.img ? `<img src="${esc(g.img)}" alt="${esc(g.t)}" width="512" height="384" style="width:100%;max-height:260px;object-fit:cover;border-radius:14px;display:block" loading="eager">` : ''}
<h1 style="font-size:1.6rem;margin:12px 0 4px;text-align:left">🎮 ${esc(g.t)}</h1><p class="sub" style="text-align:left;margin:0 0 8px"><a href="/juegos/${slugDe(g.cat)}" style="color:inherit">${esc(g.cat)}</a> · Gratis · Sin instalar · Celular y PC</p>
${d ? `<p style="margin:0 0 10px">${esc(d)}</p>` : ''}<button class="btn" id="seoJugar" style="font-size:1.15rem">▶ Jugar ahora</button>
${rel.length ? `<h2 style="font-size:1.1rem;margin:16px 0 8px">Más juegos de ${esc(g.cat.toLowerCase())}</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">${rel.map(x => `<a href="/juego/${esc(x.s)}" style="display:block;text-decoration:none;color:inherit;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.06)">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">` : ''}<small style="display:block;padding:4px 6px;font-weight:700;font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.t)}</small></a>`).join('')}</div>` : ''}
<p class="sub" style="font-size:.75rem;margin:10px 0 0">Juego de un estudio externo, ofrecido por un distribuidor autorizado. <a href="/?g=pro" style="color:inherit">Ver todos los juegos →</a></p></article>`;
      const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8').replace('<!--OG-->', og).replace('<section id="home">', '<section id="home">' + art); // sin AdSense aquí: estas páginas son de juegos de otro estudio (ya traen sus propios anuncios)
      return enviarHtml(req, res, html, { 'cache-control': 'public, max-age=600' });
    } }
    if (u.pathname === '/' || u.pathname === '/index.html') {
      const t = CATALOGO.find(x => x.id === u.searchParams.get('g'));
      const titulo = t ? t.t : (getS('marca', null)?.titulo || `${getS('marca', null)?.nombre || 'Yupitok'}: juegos y tests gratis · ¡Juega, ríe, aprende y gana!`);
      const desc = t ? `${t.d} Gratis${t.min ? `, en ${t.min} min` : ''}. ¿Te animas?` : 'Miles de juegos y tests gratis sin instalar: GLORY BROWN (batallas en línea 1 vs 1 y 2 vs 2), Huerto Defensor, Joyas, juegos con amigos, chat y clanes. ¡Entra y juega!';
      const img = `${PUBLIC_URL}/og/${t && fs.existsSync(path.join(PUB, 'og', t.id + '.png')) ? t.id : 'general'}.png`;
      const og = `<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(getS('marca', null)?.nombre || 'Yupitok')}">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(PUBLIC_URL + '/' + (t ? '?g=' + t.id : ''))}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:secure_url" content="${esc(img)}"><meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(titulo)}">
<meta property="og:locale" content="es_LA"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(img)}">
<link rel="canonical" href="${esc(PUBLIC_URL + '/' + (t ? '?g=' + t.id : ''))}">${!t && getS('pro', {}).on ? hrefl(altDe('home')) : ''}
<script type="application/ld+json">${JSON.stringify(t ? { '@context': 'https://schema.org', '@type': t.id.startsWith('arcade-') ? 'VideoGame' : 'Quiz', name: t.t, description: t.d, url: PUBLIC_URL + '/?g=' + t.id, inLanguage: 'es', isAccessibleForFree: true, image: img, ...(t.id.startsWith('arcade-') ? { gamePlatform: ['Web', 'Android', 'iOS'], applicationCategory: 'Game', operatingSystem: 'Web' } : {}) } : [{ '@context': 'https://schema.org', '@type': 'WebSite', name: getS('marca', null)?.nombre || 'Yupitok', url: PUBLIC_URL + '/', inLanguage: 'es' }, { '@context': 'https://schema.org', '@type': 'Organization', name: getS('marca', null)?.nombre || 'Yupitok', url: PUBLIC_URL + '/', logo: PUBLIC_URL + '/icon-512.png', slogan: '¡Juega, ríe, aprende y gana!', sameAs: (getS('redesMarca', null) || ['https://www.facebook.com/yupitokoficial']).filter(x => /^https:\/\//.test(x)) }]).replace(/</g, '\\u003c')}</script>`;
      return enviarHtml(req, res, fs.readFileSync(path.join(PUB, 'index.html'), 'utf8').replace('<!--OG-->', og + adsScript()), { 'cache-control': 'no-cache' });
    }
    // Archivos de la página.
    let f = u.pathname === '/' ? '/index.html' : u.pathname === '/panel' ? '/panel.html' : u.pathname;
    f = path.normalize(path.join(PUB, decodeURIComponent(f)));
    if (!f.startsWith(PUB + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
    const ext = path.extname(f), extra = ext === '.html' ? { 'cache-control': 'no-cache' } : { 'cache-control': u.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=86400' };
    if (['sw.js', 'tests.json'].includes(path.basename(f))) extra['cache-control'] = 'no-cache'; // siempre la última versión (con ETag no se descarga si no cambió)
    if (path.basename(f) === 'panel.html') extra['content-security-policy'] = "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*";
    return archivo(req, res, f, MIME[ext] || 'application/octet-stream', extra);
  } catch (e) { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Error interno' }); }
}).listen(PORT, () => console.log(`Página viral en ${PUBLIC_URL}  ·  Panel: ${PUBLIC_URL}/panel`));
