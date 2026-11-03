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
create table if not exists polls (id integer primary key, created_at text default (datetime('now')), question text, options text, active integer default 1);
create table if not exists votes (poll_id integer, option integer, voter text, created_at text default (datetime('now')), primary key (poll_id, voter));
create table if not exists settings (k text primary key, v text);
create table if not exists perfiles (id text primary key, codigo text unique, data text, updated_at text default (datetime('now')));
create table if not exists arcade (id integer primary key, juego text, uid text, nombre text, avatar text, puntos integer, created_at text default (datetime('now')));
create index if not exists ix_arc on arcade(juego, created_at);
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
setInterval(() => reloj().catch(console.error), 30000).unref();

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
function normalizarJuego(g, plantilla) {
  const pick = (...ks) => { for (const k of ks) { let v = k.split('.').reduce((o, x) => o?.[x], g); if (Array.isArray(v)) v = v[0]; if (v && typeof v === 'object') v = v.url || v.src || v.name || ''; if (v != null && v !== '') return v; } return ''; };
  const t = textoP(pick('title', 'Title', 'name', 'Name', 'game_name')).slice(0, 80), id = String(pick('id', 'Id', 'namespace', 'Md5', 'md5', 'gameId', 'game_id', 'slug'));
  let url = String(pick('url', 'Url', 'embed', 'embedUrl', 'embed_url', 'game_url', 'gameUrl', 'link', 'Link'));
  if (!/^https:\/\//i.test(url) && plantilla && id) url = plantilla.replace('{id}', encodeURIComponent(id));
  const img = String(pick('banner_image', 'image', 'Image', 'thumb', 'Thumb', 'thumbnail', 'Thumbnail', 'Asset', 'assets', 'images', 'icon', 'cover'));
  const cat = textoP(pick('category', 'Category', 'categories', 'Categories', 'genre', 'tags')).split(/[,|]/)[0].trim().slice(0, 30);
  if (!t || !/^https:\/\/[^\s"'<>]+$/i.test(url)) return null;
  return { id: crypto.createHash('md5').update(url).digest('hex').slice(0, 12), t, u: url, img: /^https:\/\/[^\s"'<>]+$/i.test(img) ? img : '', cat: cat || 'Juegos', d: textoP(pick('description', 'Description', 'desc')).slice(0, 220), w: +pick('width', 'Width') || 0, h: +pick('height', 'Height') || 0 };
}
async function catalogoPro(forzar) {
  const cfg = getS('pro', {}); if (!cfg.on || !cfg.feed) return [];
  if (!forzar && PRO.feed === cfg.feed && Date.now() - PRO.t < 6 * 3600e3 && PRO.items.length) return PRO.items;
  try {
    const r = await fetch(cfg.feed, { signal: AbortSignal.timeout(25000), headers: { accept: 'application/json, application/rss+xml, application/xml, text/xml' } }); const txt = (await r.text()).slice(0, 12e6);
    let lista = [];
    try { const j = JSON.parse(txt); lista = Array.isArray(j) ? j : j.data?.items || j.data || j.items || j.games || j.results || Object.values(j).find(Array.isArray) || []; }
    catch (e) { lista = [...txt.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => { const o = {}; for (const [, k, v] of m[1].matchAll(/<([a-zA-Z_:]+)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/g)) o[k.replace(/^.*:/, '')] = v; const im = /<(?:media:thumbnail|media:content|enclosure)[^>]*url="([^"]+)"/.exec(m[1]); if (im) o.image = im[1]; return o; }); }
    const vistos = new Set(), items = lista.map(g => normalizarJuego(g, cfg.plantilla)).filter(g => g && !vistos.has(g.id) && vistos.add(g.id)).slice(0, 5000);
    if (items.length) PRO = { t: Date.now(), items, feed: cfg.feed }; else console.error('Juegos pro: el catálogo no trajo juegos reconocibles');
  } catch (e) { console.error('Juegos pro:', e.message); }
  return PRO.items;
}
// ---------- Google AdSense ----------
const adsCfg = () => getS('ads', {});
const adsScript = () => { const c = adsCfg().client; return /^ca-pub-\d{10,20}$/.test(c || '') ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${c}" crossorigin="anonymous"></script><meta name="google-adsense-account" content="${c}">` : ''; };
// ---------- Páginas legales que pide Google (se llenan con tus datos del panel) ----------
function paginaLegal(tipo) {
  const pv = getS('priv', {}), mk = getS('marca', {}), sitio = esc(mk.nombre || 'Nuestra página'), resp = esc(pv.nombre || 'el responsable del sitio'), correo = esc(pv.correo || 'el correo de contacto de la página'), ciudad = esc(pv.ciudad || 'Perú');
  const T = {
    terminos: ['Términos de uso', `<p>Al usar ${sitio} aceptas estos términos. Si no estás de acuerdo, por favor no uses el sitio.</p>
      <h2>1. Qué ofrecemos</h2><p>Tests de entretenimiento, juegos gratuitos (propios y de otros estudios), chat y comunidad. Los resultados de los tests son solo para entretenimiento y no son consejo profesional.</p>
      <h2>2. Edad</h2><p>Las funciones con cuenta, chat y clanes son para mayores de 18 años. Los menores deben usar el sitio con supervisión de un adulto.</p>
      <h2>3. Convivencia</h2><p>No se permite publicar insultos, acoso, contenido sexual, violento o ilegal, datos personales, enlaces, teléfonos ni correos. Moderamos el chat y podemos suspender cuentas que no respeten estas reglas.</p>
      <h2>4. Juegos de terceros</h2><p>Algunos juegos son de otros estudios y se muestran a través de distribuidores autorizados. Sus derechos pertenecen a sus autores.</p>
      <h2>5. Anuncios</h2><p>El sitio es gratis gracias a la publicidad. Algunos anuncios los muestra Google u otros socios, que pueden usar cookies según su propia política.</p>
      <h2>6. Contenido propio</h2><p>Los juegos, personajes, textos e imágenes propios de ${sitio} (incluido GLORY BROWN) están protegidos. No se pueden copiar ni vender sin permiso.</p>
      <h2>7. Cambios</h2><p>Podemos actualizar estos términos. La versión vigente siempre está en esta página.</p>
      <h2>8. Contacto</h2><p>${resp} · ${ciudad} · ${correo}</p>`],
    contacto: ['Contacto', `<p>¿Tienes una pregunta, una idea o quieres reportar algo? Escríbenos.</p><p style="font-size:1.2rem"><b>📧 ${correo}</b></p><p>Responsable: ${resp} · ${ciudad}</p><p>Para pedir que borremos tus datos o tu cuenta, escribe a ese correo con el asunto <b>"Borrar mis datos"</b>. Respondemos en un máximo de 10 días hábiles.</p>`],
    nosotros: ['Quiénes somos', `<p><b>${sitio}</b> es una plataforma latina de entretenimiento gratis: tests para conocerte, más de 60 juegos, juegos propios como <b>GLORY BROWN: El Choque de los Reinos</b> y <b>Huerto Defensor</b>, chat, clanes y torneos.</p>
      <p>GLORY BROWN nació como homenaje a una abuelita muy querida: la Reina Glory Brown, que protege su reino con amor. Ese cariño es lo que queremos que se sienta en todo el sitio.</p>
      <p>Creamos contenido nuevo cada semana, con identidad latina y en español, para que juegues sin instalar nada desde tu celular, tablet o computadora.</p><p>Responsable: ${resp} · ${ciudad} · ${correo}</p>`],
  }[tipo];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${T[0]} · ${sitio}</title>${adsScript()}<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:0 auto;padding:22px 18px 60px;line-height:1.6;color:#1f2937;background:#fafafa}h1{font-size:1.7rem}h2{font-size:1.1rem;margin-top:1.4em}a{color:#7c3aed}</style></head><body><p><a href="/">← Volver a ${sitio}</a></p><h1>${T[0]}</h1>${T[1]}<p style="margin-top:2em;font-size:.9rem"><a href="/terminos.html">Términos</a> · <a href="/privacidad.html">Privacidad</a> · <a href="/contacto.html">Contacto</a> · <a href="/nosotros.html">Quiénes somos</a></p></body></html>`;
}
const json = req => new Promise((ok, no) => { let b = ''; req.on('data', c => { b += c; if (b.length > 20000) { no(new Error('muy grande')); req.destroy(); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { no(new Error('JSON inválido')); } }); });
const csv = rows => { if (!rows.length) return '\ufeffsin datos\n'; const k = Object.keys(rows[0]); const c = v => { v = String(v ?? ''); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return '\ufeff' + [k.join(','), ...rows.map(r => k.map(x => c(r[x])).join(','))].join('\n'); };

const chat = require('./chat').crear({ db, q, q1, run, getS, setS, preguntasTrivia: () => CATALOGO.filter(t => t.tipo === 'trivia').flatMap(t => t.preguntas) });
const online = require('./juego_online').crear({ datos: DATA, db, q, q1, run, revisar: require('./chat').revisar, apodo: require('./chat').apodo });
const mesas = require('./mesas').crear({ revisar: require('./chat').revisar, apodo: require('./chat').apodo });
const JUEGO = Object.fromEntries(CATALOGO.map(t => [t.id, [t.t, t.d]]));

async function api(req, res, u) {
  const ip = clientIp(req), P = req.method === 'POST';
  if (P && limite(ip, 'api', 240)) return send(res, 429, { error: 'Demasiadas peticiones, espera un momento' });

  // ---- chat en vivo ----
  if (u.pathname === '/api/pro') {
    const cfg = getS('pro', {}); if (!cfg.on) return send(res, 200, { on: false, juegos: [] });
    const todos = await catalogoPro(), qq = String(u.searchParams.get('q') || '').toLowerCase().slice(0, 40), cat = String(u.searchParams.get('cat') || ''), pag = Math.max(0, Math.min(200, +u.searchParams.get('p') || 0));
    const cats = Object.entries(todos.reduce((a, g) => (a[g.cat] = (a[g.cat] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([c]) => c);
    const f = todos.filter(g => (!cat || g.cat === cat) && (!qq || g.t.toLowerCase().includes(qq)));
    return send(res, 200, { on: true, total: f.length, cats, juegos: f.slice(pag * 48, pag * 48 + 48) }, undefined, { 'cache-control': 'public, max-age=300' });
  }
  if (u.pathname.startsWith('/api/chat/')) { const r = await chat.http(req, res, u, { ip, json, send, limite }); if (r !== false) return; }
  if (/^\/api\/(cuenta|clan|duelo|glory)/.test(u.pathname)) { const r = await online.http(req, res, u, { ip, json, send, limite }); if (r !== false) return; }
  if (u.pathname.startsWith('/api/mesas/')) { const r = await mesas.http(req, res, u, { ip, json, send, limite }); if (r !== false) return; }
  // ---- público ----
  if (u.pathname === '/api/config') {
    const poll = q1('select id,question,options from polls where active=1 order by id desc limit 1');
    const subs = q1('select count(*) n from subscribers where active=1').n;
    return send(res, 200, { marca: getS('marca', { nombre: '', eslogan: '' }), intereses: INTERESES, suscriptores: subs >= 50 ? subs : null, vapid: E.VAPID_PUBLIC || null, pixel: E.META_PIXEL_ID || null, video: getS('video', null), pro: !!(getS('pro', {}).on && getS('pro', {}).feed), poll: poll && { id: poll.id, q: poll.question, options: JSON.parse(poll.options) } });
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
  if (u.pathname === '/api/arcade/puntaje' && P) {
    const TOPE = { gusanito: 3000, rompecabezas: 1000, memoria: 1000, buscaminas: 1000, n2048: 300000, billar: 160, ludo: 200, bloques: 200000, frutas: 200000, colores: 2000, torre: 1000, palabra: 600, sudoku: 1000, ladrillos: 50000, vuela: 2000, corredor: 200000, flechas: 5000, joyas: 100000, huerto: 100000, batalla: 100000, ahorcado: 5000, sopa: 1000, ppt: 200, reflejos: 1000, tuberias: 1000, penales: 500, calculo: 3000, simon: 2000, topos: 2000, color: 2000 };
    const b = await json(req), jg = String(b.juego || ''), pts = Math.round(+b.puntos || 0);
    if (!TOPE[jg] || pts < 0 || pts > TOPE[jg]) return send(res, 400, { error: 'Puntaje no válido' });
    if (limite(ip, 'arc', 30)) return send(res, 429, { error: 'Más despacio' });
    const ch = require('./chat'), nombre = ch.apodo(b.nombre) || 'Jugador', avatar = /^a\d\d$/.test(b.avatar || '') ? b.avatar : 'a01', uidh = crypto.createHash('sha256').update(String(b.uid || ip)).digest('hex').slice(0, 16);
    run('insert into arcade(juego, uid, nombre, avatar, puntos) values(?,?,?,?,?)', jg, uidh, nombre, avatar, pts);
    const hoy = hoyPeru();
    const top = q(`select uid, nombre, avatar, max(puntos) puntos from arcade where juego=? and date(created_at,'-5 hours')=? group by uid order by puntos desc limit 10`, jg, hoy);
    const mio = q1(`select max(puntos) p from arcade where juego=? and uid=? and date(created_at,'-5 hours')=?`, jg, uidh, hoy).p;
    const puesto = q1(`select count(*) n from (select uid, max(puntos) p from arcade where juego=? and date(created_at,'-5 hours')=? group by uid) where p > ?`, jg, hoy, mio).n + 1;
    return send(res, 200, { hoy: top.map(({ uid, ...x }) => x), puesto });
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
        const b = await json(req);
        if (b.video !== undefined) { const v = b.video?.url ? safeDest(b.video.url) : null; if (b.video?.url && !v) return send(res, 400, { error: 'El video debe ser de YouTube, Facebook, TikTok o Instagram' }); setS('video', v ? { url: v, title: clip(b.video.title, 80) || 'Mira el video' } : null); }
        if (b.priv) setS('priv', Object.fromEntries(['nombre', 'ciudad', 'correo', 'plazo', 'codigo'].map(k => [k, clip(b.priv[k], 120).trim()])));
        if (b.pro) { const f = String(b.pro.feed || '').trim(), pl = String(b.pro.plantilla || '').trim(); if (f && !/^https:\/\/\S+$/.test(f)) return send(res, 400, { error: 'El enlace del catálogo debe empezar con https://' }); if (pl && !/^https:\/\/\S*\{id\}\S*$/.test(pl)) return send(res, 400, { error: 'La plantilla debe empezar con https:// y tener {id}' }); setS('pro', { on: !!b.pro.on, feed: f.slice(0, 600), plantilla: pl.slice(0, 300) }); PRO.t = 0; if (b.pro.on && f) { const n = (await catalogoPro(true)).length; if (!n) return send(res, 400, { error: 'Guardado, pero el catálogo no trajo juegos. Revisa el enlace (debe ser el "feed" JSON o RSS de tu distribuidor).' }); } }
        if (b.ads) { const c = String(b.ads.client || '').trim(); if (c && !/^ca-pub-\d{10,20}$/.test(c)) return send(res, 400, { error: 'El ID de AdSense se ve así: ca-pub-1234567890123456' }); setS('ads', { client: c, extra: clip(b.ads.extra, 3000) }); }
        if (b.marca) setS('marca', { nombre: clip(b.marca.nombre, 40).trim(), eslogan: clip(b.marca.eslogan, 90).trim() });
        if (b.bienvenida) setS('bienvenida', { on: !!b.bienvenida.on, title: clip(b.bienvenida.title, 80), body: clip(b.bienvenida.body, 200) });
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
      return send(res, 200, { pro: { ...getS('pro', {}), juegos: (await catalogoPro()).length }, ads: adsCfg(), marca: getS('marca', { nombre: '', eslogan: '' }), bienvenida: getS('bienvenida', { on: true, title: '✨ ¡Bienvenido!', body: 'Desde mañana recibirás tu lectura del día. Mientras tanto, prueba otro test 👉' }), priv: getS('priv', {}), video: getS('video', null), tope: getS('tope', 3), diario: getS('diario', { on: false, hora: '07:30', title: '✨ Tu horóscopo de hoy, {signo}', body: 'Los astros tienen un mensaje para ti. Toca para verlo 👉', url: '/?g=horoscopo&src=push' }),
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
      const reto = (/^\d{1,2}$/.test(u.searchParams.get('reto') || '') ? '&reto=' + u.searchParams.get('reto') : '') + (/^[a-f0-9]{6}$/.test(u.searchParams.get('mesa') || '') ? '&mesa=' + u.searchParams.get('mesa') : '');
      const target = `/?g=${m[1]}&src=${encodeURIComponent(clip(u.searchParams.get('src') || 'compartido', 40))}${reto}`;
      return send(res, 200, `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(t)}</title>
<meta property="og:type" content="website"><meta property="og:title" content="${esc(txt || t)}"><meta property="og:description" content="${esc(d)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:url" content="${esc(PUBLIC_URL + u.pathname)}">
<meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${esc(target)}"></head><body><a href="${esc(target)}">Continuar</a></body></html>`, 'text/html; charset=utf-8');
    }
    // Fotos subidas para las notificaciones.
    m = /^\/videos\/([a-f0-9]{16}\.mp4)$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, 'videos', m[1]); if (!fs.existsSync(f)) return send(res, 404, 'Este video ya expiró', 'text/plain'); return send(res, 200, fs.readFileSync(f), 'video/mp4', { 'content-disposition': `attachment; filename="glory-brown-${m[1]}"` }); }
    m = /^\/(arte|voces)\/huerto\/([a-z0-9_]{2,80}\.(?:webp|mp3)|manifest\.json)$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, m[1] + '_huerto', m[2]); return archivo(req, res, f, m[2].endsWith('.json') ? 'application/json' : m[2].endsWith('.mp3') ? 'audio/mpeg' : 'image/webp', { 'cache-control': m[2].endsWith('.json') ? 'no-cache' : 'public, max-age=86400' }); }
    m = /^\/arte\/glory\/([a-z0-9_]{2,80}\.webp|manifest\.json)$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, 'arte_glory', m[1]); return archivo(req, res, f, m[1].endsWith('.json') ? 'application/json' : 'image/webp', { 'cache-control': m[1].endsWith('.json') ? 'no-cache' : 'public, max-age=86400' }); }
    m = /^\/voces\/glory\/([a-z0-9_]{3,80}\.mp3|manifest\.json)$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, 'voces_glory', m[1]); return archivo(req, res, f, m[1].endsWith('.json') ? 'application/json' : 'audio/mpeg', { 'cache-control': 'public, max-age=86400' }); }
    m = /^\/m\/([a-f0-9]{16}\.(jpg|png|webp|gif))$/.exec(u.pathname);
    if (m) { const f = path.join(DATA, 'media', m[1]); if (!fs.existsSync(f)) return send(res, 404, 'No encontrado', 'text/plain'); return send(res, 200, fs.readFileSync(f), MIME['.' + m[2]] || 'image/' + m[2], { 'cache-control': 'public, max-age=604800' }); }
    const legal = /^\/(terminos|contacto|nosotros)\.html$/.exec(u.pathname);
    if (legal) return enviarHtml(req, res, paginaLegal(legal[1]), { 'cache-control': 'no-cache' });
    if (u.pathname === '/ads.txt') { const a = adsCfg(), lineas = []; if (/^ca-pub-\d{10,20}$/.test(a.client || '')) lineas.push(`google.com, ${a.client.replace('ca-', '')}, DIRECT, f08c47fec0942fa0`); for (const l of String(a.extra || '').split(/\r?\n/)) if (/^[a-z0-9.-]+\.[a-z]{2,},\s*[\w-]+,\s*(DIRECT|RESELLER)(,\s*[\w]+)?$/i.test(l.trim())) lineas.push(l.trim()); return send(res, 200, lineas.join('\n') + '\n', 'text/plain; charset=utf-8', { 'cache-control': 'no-cache' }); }
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
      const og = `<title>GLORY BROWN · El Choque de los Reinos</title><meta name="description" content="${esc(t.d)}"><meta property="og:type" content="website"><meta property="og:title" content="👑 GLORY BROWN · El Choque de los Reinos"><meta property="og:description" content="${esc(t.d)} ¡Juega gratis!"><meta property="og:url" content="${esc(PUBLIC_URL + '/glory')}"><meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(img)}"><meta name="apple-mobile-web-app-title" content="GLORY BROWN"><link rel="apple-touch-icon" href="/glory/icono-192.png"><script>if (!/[?&]g=/.test(location.search)) history.replaceState(null, '', '/glory?g=arcade-batalla&src=app');</script>`;
      return send(res, 200, fs.readFileSync(path.join(PUB, 'index.html'), 'utf8').replace('<link rel="manifest" href="/manifest.webmanifest">', '<link rel="manifest" href="/glory/manifest.webmanifest">').replace('<link rel="apple-touch-icon" href="/icon.png">', '').replace('<!--OG-->', og), 'text/html; charset=utf-8', { 'cache-control': 'no-cache' });
    }
    if (u.pathname === '/' || u.pathname === '/index.html') {
      const t = CATALOGO.find(x => x.id === u.searchParams.get('g'));
      const titulo = t ? t.t : (getS('marca', null)?.titulo || '32 tests gratis: descubre algo nuevo de ti');
      const desc = t ? `${t.d} Gratis, en ${t.min} min. ¿Te animas?` : 'Tests de personalidad, trivias, horóscopo y calculadoras. Gratis, en 1 a 3 minutos. ¿Te animas?';
      const img = `${PUBLIC_URL}/og/${t && fs.existsSync(path.join(PUB, 'og', t.id + '.png')) ? t.id : 'general'}.png`;
      const og = `<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(getS('marca', null)?.nombre || 'Tests virales')}">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(PUBLIC_URL + '/' + (t ? '?g=' + t.id : ''))}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:secure_url" content="${esc(img)}"><meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(titulo)}">
<meta property="og:locale" content="es_LA"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(img)}">`;
      return enviarHtml(req, res, fs.readFileSync(path.join(PUB, 'index.html'), 'utf8').replace('<!--OG-->', og + adsScript()), { 'cache-control': 'no-cache' });
    }
    // Archivos de la página.
    let f = u.pathname === '/' ? '/index.html' : u.pathname === '/panel' ? '/panel.html' : u.pathname;
    f = path.normalize(path.join(PUB, decodeURIComponent(f)));
    if (!f.startsWith(PUB + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
    const ext = path.extname(f), extra = ext === '.html' ? { 'cache-control': 'no-cache' } : { 'cache-control': u.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=86400' };
    if (path.basename(f) === 'sw.js') extra['cache-control'] = 'no-cache';
    if (path.basename(f) === 'panel.html') extra['content-security-policy'] = "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*";
    return archivo(req, res, f, MIME[ext] || 'application/octet-stream', extra);
  } catch (e) { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Error interno' }); }
}).listen(PORT, () => console.log(`Página viral en ${PUBLIC_URL}  ·  Panel: ${PUBLIC_URL}/panel`));
