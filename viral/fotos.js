// 📷 Fotos de perfil subidas por los usuarios.
// - La foto llega ya recortada y achicada desde el navegador (máx. 256x256).
// - Se revisa con la IA de ShortForge (si está disponible) antes de mostrarse a los demás.
// - Quien la sube la ve al instante; los demás solo cuando está aprobada.
// - El dueño de la página puede aprobar o borrar fotos desde su panel, y la comunidad puede reportarlas.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ID = /^f[0-9a-f]{16}$/;
const aprobadas = new Set();
function crear({ DATA, db, q, q1, run, E, LOCAL_TOKEN }) {
  const DIR = path.join(DATA, 'fotos'); fs.mkdirSync(DIR, { recursive: true });
  db.exec(`create table if not exists fotos (id text primary key, uid text, estado text default 'pendiente', motivo text, reportes integer default 0, created_at text default (datetime('now')));`);
  for (const f of q("select id from fotos where estado='ok'")) aprobadas.add(f.id);
  const archivo = id => path.join(DIR, id + '.webp');

  async function moderar(id) {
    if (!E.SF_URL || !LOCAL_TOKEN) return; // sin ShortForge queda pendiente: la aprueba el dueño desde el panel
    try {
      const b64 = fs.readFileSync(archivo(id)).toString('base64');
      const r = await fetch(E.SF_URL + '/api/moderar-imagen', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sf-token': LOCAL_TOKEN }, body: JSON.stringify({ img: 'data:image/webp;base64,' + b64 }), signal: AbortSignal.timeout(60000) });
      if (!r.ok) return; const j = await r.json();
      if (j.ok === true) { run("update fotos set estado='ok', motivo=null where id=?", id); aprobadas.add(id); }
      else if (j.ok === false) { run("update fotos set estado='rechazada', motivo=? where id=?", String(j.motivo || '').slice(0, 120), id); aprobadas.delete(id); }
    } catch (e) {}
  }
  // Reintenta las pendientes cada 10 minutos (por si ShortForge estaba cerrado)
  setInterval(() => { for (const f of q("select id from fotos where estado='pendiente' and created_at >= datetime('now','-3 days') limit 20")) moderar(f.id); }, 10 * 60000);

  async function http(req, res, u, { ip, json, send, limite, archivoEstatico }) {
    const P = req.method === 'POST';
    const m = /^\/fotos\/(f[0-9a-f]{16})\.webp$/.exec(u.pathname);
    if (m) { // los demás solo ven fotos aprobadas; el dueño la ve aunque esté en revisión (?mia=uid)
      const f = q1('select estado, uid from fotos where id=?', m[1]); if (!f || f.estado === 'rechazada') return send(res, 404, 'No encontrado', 'text/plain');
      if (f.estado !== 'ok' && crypto.createHash('sha256').update(String(u.searchParams.get('mia') || '')).digest('hex') !== f.uid) return send(res, 404, 'No encontrado', 'text/plain');
      return archivoEstatico(req, res, archivo(m[1]), 'image/webp', { 'cache-control': f.estado === 'ok' ? 'public, max-age=86400' : 'no-store' });
    }
    if (u.pathname === '/api/foto/subir' && P) {
      if (limite(ip, 'foto', 6, 3600000)) return send(res, 429, { error: 'Subiste muchas fotos. Intenta más tarde.' });
      const b = await json(req, 400000), uid = String(b.uid || ''); if (!/^[a-z0-9]{8,40}$/.test(uid)) return send(res, 400, { error: 'Falta tu identificador' });
      const mm = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img || '')); if (!mm) return send(res, 400, { error: 'La foto debe ser una imagen' });
      const buf = Buffer.from(mm[2], 'base64'); if (buf.length > 260000) return send(res, 400, { error: 'La foto es muy pesada' });
      const okFirma = mm[1] === 'webp' ? buf.slice(8, 12).toString() === 'WEBP' : mm[1] === 'jpeg' ? buf.slice(0, 2).toString('hex') === 'ffd8' : buf.slice(0, 4).toString('hex') === '89504e47'; if (!okFirma) return send(res, 400, { error: 'La foto no es válida' });
      const id = 'f' + crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
      fs.writeFileSync(archivo(id), buf); // se guarda tal cual llegó (el navegador ya la convirtió y achicó)
      const uh = crypto.createHash('sha256').update(uid).digest('hex');
      if (!q1('select 1 from fotos where id=?', id)) run('insert into fotos(id, uid) values(?,?)', id, uh);
      moderar(id); // en segundo plano
      return send(res, 200, { id, estado: q1('select estado from fotos where id=?', id).estado });
    }
    if (u.pathname === '/api/foto/estado') { const f = q1('select estado, motivo from fotos where id=?', String(u.searchParams.get('id') || '')); return send(res, 200, f || { estado: 'no-existe' }); }
    if (u.pathname === '/api/foto/reportar' && P) {
      if (limite(ip, 'fotoRep', 20)) return send(res, 429, { error: 'Más despacio' });
      const b = await json(req), id = String(b.id || ''); if (!ID.test(id)) return send(res, 400, { error: 'Foto no válida' });
      run('update fotos set reportes = reportes + 1 where id=?', id);
      const f = q1('select reportes from fotos where id=?', id); if (f && f.reportes >= 3) { run("update fotos set estado='pendiente' where id=?", id); aprobadas.delete(id); } // con 3 reportes se oculta hasta que la revises
      return send(res, 200, { ok: 1 });
    }
    return false;
  }
  // Panel del dueño: lista, aprobar y borrar
  function verAdmin(req, res, id, send, archivoEstatico) { if (!ID.test(id) || !fs.existsSync(archivo(id))) return send(res, 404, 'No encontrado', 'text/plain'); return archivoEstatico(req, res, archivo(id), 'image/webp', { 'cache-control': 'no-store' }); }
  function admin(r, b) {
    if (r === 'fotos') return { fotos: q("select id, estado, motivo, reportes, created_at from fotos order by (estado='pendiente') desc, reportes desc, created_at desc limit 120") };
    if (r === 'fotos/aprobar' && ID.test(b.id || '')) { run("update fotos set estado='ok', reportes=0 where id=?", b.id); aprobadas.add(b.id); return { ok: 1 }; }
    if (r === 'fotos/borrar' && ID.test(b.id || '')) { run("update fotos set estado='rechazada', motivo='Borrada por el administrador' where id=?", b.id); aprobadas.delete(b.id); try { fs.rmSync(archivo(b.id), { force: true }); } catch (e) {} return { ok: 1 }; }
    return null;
  }
  // Guarda una foto que viene de otro lado (por ejemplo, la foto de Google o Facebook al iniciar sesión)
  async function guardarBuffer(buf, uid) {
    if (!buf || buf.length < 200 || buf.length > 3e6) return null;
    let webp = null;
    try { webp = await new Promise((ok, no) => { const p = require('child_process').spawn('ffmpeg', ['-loglevel', 'error', '-i', 'pipe:0', '-vf', 'scale=256:256:force_original_aspect_ratio=increase,crop=256:256', '-f', 'webp', '-quality', '85', 'pipe:1']); const out = []; p.stdout.on('data', d => out.push(d)); p.on('error', no); p.on('close', c => c === 0 ? ok(Buffer.concat(out)) : no(new Error('ffmpeg'))); p.stdin.on('error', () => {}); p.stdin.end(buf); }); } catch (e) {}
    const data = webp && webp.length > 100 ? webp : buf, id = 'f' + crypto.createHash('sha1').update(data).digest('hex').slice(0, 16);
    fs.writeFileSync(archivo(id), data); if (!q1('select 1 from fotos where id=?', id)) run('insert into fotos(id, uid) values(?,?)', id, crypto.createHash('sha256').update(String(uid || '')).digest('hex'));
    moderar(id); return id;
  }
  return { http, admin, verAdmin, guardarBuffer };
}
// Un avatar es válido si es uno de los ilustrados (a01…a48) o una foto aprobada
const valido = a => /^a\d\d$/.test(a || '') || (ID.test(a || '') && aprobadas.has(a));
module.exports = { crear, valido };
