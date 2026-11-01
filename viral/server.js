// Página viral + base de visitantes + campañas de notificaciones push.
// Sin servicios externos de base de datos: todo se guarda en data/viral.db (SQLite incorporado en Node 22.13+).
// Privacidad: solo se guarda a quien acepta y declara ser mayor de 18; la IP se guarda recortada.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
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
create table if not exists polls (id integer primary key, created_at text default (datetime('now')), question text, options text, active integer default 1);
create table if not exists votes (poll_id integer, option integer, voter text, created_at text default (datetime('now')), primary key (poll_id, voter));
create table if not exists settings (k text primary key, v text);`);
const q = (sql, ...a) => db.prepare(sql).all(...a), q1 = (sql, ...a) => db.prepare(sql).get(...a), run = (sql, ...a) => db.prepare(sql).run(...a);
const getS = (k, d) => { const r = q1('select v from settings where k=?', k); return r ? JSON.parse(r.v) : d; };
const setS = (k, v) => run('insert into settings(k,v) values(?,?) on conflict(k) do update set v=excluded.v', k, JSON.stringify(v));
if (!q1('select id from polls limit 1')) run('insert into polls(question,options) values(?,?)', '¿Qué prefieres para el fin de semana?', JSON.stringify(['🍕 Pizza y película', '🏖️ Playa', '🎉 Fiesta', '😴 Dormir todo el día']));

// ---------------- Utilidades ----------------
const SIGNS = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];
const GAMES = ['horoscopo', 'compatibilidad', 'animal', 'ruleta', 'numerologia', 'encuesta'];
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
  return { where: w.join(' and '), args: a };
}
function contar(f) { const { where, args } = filtroSQL(f); return q1(`select count(*) n from subscribers where ${where}`, ...args).n; }
const enviando = { id: null };
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
setInterval(() => reloj().catch(console.error), 30000).unref();

// ---------------- Servidor ----------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const PUB = path.join(__dirname, 'public');
function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'content-type': type, 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
const json = req => new Promise((ok, no) => { let b = ''; req.on('data', c => { b += c; if (b.length > 20000) { no(new Error('muy grande')); req.destroy(); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { no(new Error('JSON inválido')); } }); });
const csv = rows => { if (!rows.length) return '\ufeffsin datos\n'; const k = Object.keys(rows[0]); const c = v => { v = String(v ?? ''); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return '\ufeff' + [k.join(','), ...rows.map(r => k.map(x => c(r[x])).join(','))].join('\n'); };

const JUEGO = {
  horoscopo: ['Tu horóscopo y tu alma gemela', 'Descubre qué dicen los astros hoy y quién es tu alma gemela.'],
  compatibilidad: ['Test de compatibilidad', '¿Cuánto amor hay entre ustedes? Pon sus nombres y descúbrelo.'],
  animal: ['¿Qué animal eres?', 'Responde 5 preguntas y descubre tu animal interior.'],
  ruleta: ['La ruleta de la suerte', 'Gira la ruleta y mira qué te depara el día.'],
  numerologia: ['Tu número del destino', 'Tu fecha de nacimiento esconde un número que dice mucho de ti.'],
  encuesta: ['La encuesta del día', 'Vota y mira qué eligió todo el mundo.'],
};

async function api(req, res, u) {
  const ip = clientIp(req), P = req.method === 'POST';
  if (P && limite(ip, 'api', 60)) return send(res, 429, { error: 'Demasiadas peticiones, espera un momento' });

  // ---- público ----
  if (u.pathname === '/api/config') {
    const poll = q1('select id,question,options from polls where active=1 order by id desc limit 1');
    return send(res, 200, { vapid: E.VAPID_PUBLIC || null, pixel: E.META_PIXEL_ID || null, video: getS('video', null), poll: poll && { id: poll.id, q: poll.question, options: JSON.parse(poll.options) } });
  }
  if (u.pathname === '/api/visit' && P) {
    const b = await json(req);
    if (b.consent !== true || b.adult !== true) return send(res, 400, { error: 'Falta tu permiso' });
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
    return send(res, 200, { ok: 1 });
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
        : `id, datetime(created_at,'-5 hours') fecha, country pais, city ciudad, device dispositivo, source fuente, game juego, sign signo, active activo, sent recibidas, clicks clics`;
      if (r === 'export') return send(res, 200, csv(q(`select ${cols} from ${tabla} ${W} order by id desc limit 200000`, ...a)), 'text/csv; charset=utf-8', { 'content-disposition': `attachment; filename="${tabla === 'visitors' ? 'visitantes' : 'suscriptores'}-${hoyPeru()}.csv"` });
      const page = Math.max(0, +F.p || 0);
      return send(res, 200, { total: q1(`select count(*) n from ${tabla} ${W}`, ...a).n, rows: q(`select ${cols} from ${tabla} ${W} order by id desc limit 100 offset ?`, ...a, page * 100) });
    }
    if (r === 'contar' && P) { const b = await json(req); const n = contar(b.filters || {}); return send(res, 200, { n, enviar: b.max > 0 ? Math.min(n, b.max) : n }); }
    if (r === 'campana' && P) {
      const b = await json(req);
      if (!E.VAPID_PUBLIC) return send(res, 400, { error: 'Faltan las llaves de notificaciones (VAPID). En ShortForge se crean solas al encender la página.' });
      const title = clip(b.title, 80).trim(), body = clip(b.body, 200).trim();
      if (!title || !body) return send(res, 400, { error: 'Escribe el título y el mensaje' });
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
        const b = await json(req);
        if (b.video !== undefined) { const v = b.video?.url ? safeDest(b.video.url) : null; if (b.video?.url && !v) return send(res, 400, { error: 'El video debe ser de YouTube, Facebook, TikTok o Instagram' }); setS('video', v ? { url: v, title: clip(b.video.title, 80) || 'Mira el video' } : null); }
        if (b.priv) setS('priv', Object.fromEntries(['nombre', 'ciudad', 'correo', 'plazo', 'codigo'].map(k => [k, clip(b.priv[k], 120).trim()])));
        if (b.tope !== undefined) setS('tope', Math.max(1, Math.min(10, +b.tope || 3)));
        if (b.diario) setS('diario', { on: !!b.diario.on, hora: /^\d\d:\d\d$/.test(b.diario.hora) ? b.diario.hora : '07:30', title: clip(b.diario.title, 80), body: clip(b.diario.body, 200), url: safeDest(b.diario.url || '/') || '/' });
        if (b.encuesta?.q && Array.isArray(b.encuesta.options)) {
          const ops = b.encuesta.options.map(x => clip(x, 60).trim()).filter(Boolean).slice(0, 6);
          if (ops.length < 2) return send(res, 400, { error: 'La encuesta necesita al menos 2 opciones' });
          run('update polls set active=0'); run('insert into polls(question,options) values(?,?)', clip(b.encuesta.q, 120), JSON.stringify(ops));
        }
      }
      const poll = q1('select * from polls where active=1 order by id desc limit 1');
      const pr = poll ? q('select option, count(*) n from votes where poll_id=? group by option', poll.id) : [];
      return send(res, 200, { priv: getS('priv', {}), video: getS('video', null), tope: getS('tope', 3), diario: getS('diario', { on: false, hora: '07:30', title: '✨ Tu horóscopo de hoy, {signo}', body: 'Los astros tienen un mensaje para ti. Toca para verlo 👉', url: '/?g=horoscopo&src=push' }),
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
    m = /^\/r\/([a-z]+)$/.exec(u.pathname);
    if (m && JUEGO[m[1]]) {
      const [t, d] = JUEGO[m[1]], txt = clip(u.searchParams.get('t') || '', 120), img = fs.existsSync(path.join(PUB, 'og', m[1] + '.png')) ? `${PUBLIC_URL}/og/${m[1]}.png` : `${PUBLIC_URL}/og/general.png`;
      const target = `/?g=${m[1]}&src=${encodeURIComponent(clip(u.searchParams.get('src') || 'compartido', 40))}`;
      return send(res, 200, `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(t)}</title>
<meta property="og:type" content="website"><meta property="og:title" content="${esc(txt || t)}"><meta property="og:description" content="${esc(d)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:url" content="${esc(PUBLIC_URL + u.pathname)}">
<meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${esc(target)}"></head><body><a href="${esc(target)}">Continuar</a></body></html>`, 'text/html; charset=utf-8');
    }
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
    // Archivos de la página.
    let f = u.pathname === '/' ? '/index.html' : u.pathname === '/panel' ? '/panel.html' : u.pathname;
    f = path.normalize(path.join(PUB, decodeURIComponent(f)));
    if (!f.startsWith(PUB + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
    const ext = path.extname(f), extra = ext === '.html' ? { 'cache-control': 'no-cache' } : { 'cache-control': 'public, max-age=86400' };
    if (path.basename(f) === 'sw.js') extra['cache-control'] = 'no-cache';
    if (path.basename(f) === 'panel.html') extra['content-security-policy'] = "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*";
    return send(res, 200, fs.readFileSync(f), MIME[ext] || 'application/octet-stream', extra);
  } catch (e) { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Error interno' }); }
}).listen(PORT, () => console.log(`Página viral en ${PUBLIC_URL}  ·  Panel: ${PUBLIC_URL}/panel`));
