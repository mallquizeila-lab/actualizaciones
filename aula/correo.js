// 📧 Correos de ProfeTok: tareas, reuniones, comunicados y campañas (email marketing) a las familias y docentes.
// Envía con Brevo (API, gratis hasta 300 al día) o por SMTP: Amazon SES (≈ US$ 0.10 cada 1 000 correos, ideal para miles
// de docentes: email-smtp.us-east-1.amazonaws.com, puerto 465), Gmail con contraseña de aplicación o el correo de tu dominio. Sin librerías: el SMTP se habla directo con TLS.
// Cada correo lleva un enlace para darse de baja (ley de protección de datos y buenas prácticas de envío).
const tls = require('tls'), crypto = require('crypto');

function crear({ db, q, q1, run, getS, setS, limpio }) {
  db.exec(`create table if not exists campanas (id integer primary key, colegio_id integer, aula_id integer, autor_id integer, tipo text, asunto text, cuerpo text, enlace text, total integer default 0, enviados integer default 0, fallidos integer default 0, estado text default 'en cola', creado text default (datetime('now')));
    create table if not exists envios (id integer primary key, campana_id integer, email text, nombre text, alumno text, usuario_id integer, estado text default 'pendiente', error text, enviado text);
    create index if not exists env_c on envios(campana_id); create index if not exists env_e on envios(estado, id); create index if not exists cam_col on campanas(colegio_id, creado);`);
  try { db.exec('alter table usuarios add column no_correo integer default 0'); } catch (e) {}
  const SECRETO = getS('secreto') || (() => { const s = crypto.randomBytes(24).toString('hex'); setS('secreto', s); return s; })();
  const firma = id => crypto.createHmac('sha256', SECRETO).update('baja:' + id).digest('base64url').slice(0, 22);
  const conf = () => getS('correo', {});
  const listo = () => { const c = conf(); return !!(c.remitente && ((c.proveedor === 'brevo' && c.apiKey) || (c.proveedor === 'smtp' && c.host && c.user && c.pass))); };
  const LIMITE_MES = { prueba: 100, docente: 1500, colegio: 15000 };
  const usadosMes = cid => q1("select coalesce(sum(total),0) n from campanas where colegio_id=? and creado>=date('now','start of month')", cid).n;

  // ---------- envío ----------
  async function brevo(c, m) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': c.apiKey, 'content-type': 'application/json', accept: 'application/json' }, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ sender: { email: c.remitente, name: m.deNombre || c.nombre || 'ProfeTok' }, to: [{ email: m.para, name: m.paraNombre || undefined }], replyTo: m.responderA ? { email: m.responderA } : undefined, subject: m.asunto, htmlContent: m.html, textContent: m.texto, headers: m.baja ? { 'List-Unsubscribe': `<${m.baja}>` } : undefined }) });
    if (!r.ok) throw new Error('Brevo ' + r.status + ': ' + (await r.text()).slice(0, 160));
  }
  function smtp(c, m) { // SMTP con TLS directo (puerto 465)
    return new Promise((ok, no) => {
      const s = tls.connect({ host: c.host, port: +c.port || 465, servername: c.host }); s.setTimeout(30000, () => { s.destroy(); no(new Error('El servidor de correo no responde')); });
      let buf = '', paso = 0; const b64 = x => Buffer.from(x).toString('base64'), enc = t => '=?UTF-8?B?' + b64(t) + '?=';
      const limite = 'b' + crypto.randomBytes(8).toString('hex');
      const cuerpo = [`From: ${enc(m.deNombre || c.nombre || 'ProfeTok')} <${c.remitente}>`, `To: ${m.para}`, ...(m.responderA ? [`Reply-To: ${m.responderA}`] : []), `Subject: ${enc(m.asunto)}`, `Date: ${new Date().toUTCString()}`, `Message-ID: <${crypto.randomBytes(10).toString('hex')}@${c.remitente.split('@')[1]}>`, 'MIME-Version: 1.0', ...(m.baja ? [`List-Unsubscribe: <${m.baja}>`] : []), `Content-Type: multipart/alternative; boundary="${limite}"`, '',
        `--${limite}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(m.texto).replace(/.{76}/g, '$&\r\n'), `--${limite}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(m.html).replace(/.{76}/g, '$&\r\n'), `--${limite}--`, ''].join('\r\n');
      const pasos = [['EHLO libretin', 250], ['AUTH LOGIN', 334], [b64(c.user), 334], [b64(c.pass), 235], [`MAIL FROM:<${c.remitente}>`, 250], [`RCPT TO:<${m.para}>`, 250], ['DATA', 354], [cuerpo.replace(/\r\n\./g, '\r\n..') + '\r\n.', 250], ['QUIT', 221]];
      s.on('data', d => { buf += d; const lineas = buf.split('\r\n'); const ult = lineas.filter(Boolean).pop() || ''; if (!/^\d{3} /.test(ult)) return; const cod = +ult.slice(0, 3); buf = '';
        if (paso === 0) { if (cod !== 220) { s.destroy(); return no(new Error('SMTP: ' + ult)); } }
        else { const esperado = pasos[paso - 1][1]; if (cod !== esperado) { s.destroy(); return no(new Error('SMTP: ' + ult.slice(0, 160))); } if (paso === pasos.length) { s.end(); return ok(); } }
        s.write(pasos[paso][0] + '\r\n'); paso++; });
      s.on('error', e => no(new Error('SMTP: ' + e.message)));
    });
  }
  const enviar = m => { const c = conf(); return c.proveedor === 'smtp' ? smtp(c, m) : brevo(c, m); };

  // ---------- plantilla bonita (funciona en Gmail, Outlook y celulares) ----------
  const escH = s => String(s ?? '').replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  const ICON = { tarea: '📝', reunion: '🎥', comunicado: '📣', recordatorio: '⏰', felicitacion: '🌟', campana: '🎓', otro: '✉️' };
  function plantilla({ colegio, color = '#0284c7', titulo, saludo, cuerpo, boton, enlace, detalle, pie, baja, tipo }) {
    const p = escH(cuerpo).split(/\n{2,}/).map(x => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#0f172a">${x.replace(/\n/g, '<br>')}</p>`).join('');
    const html = `<!doctype html><html><body style="margin:0;background:#f0f9ff;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:20px 10px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
<tr><td style="background:${color};padding:18px 22px;color:#ffffff"><div style="font-size:13px;opacity:.9">${escH(colegio)}</div><div style="font-size:22px;font-weight:bold;margin-top:4px">${ICON[tipo] || '✉️'} ${escH(titulo)}</div></td></tr>
<tr><td style="padding:22px">${saludo ? `<p style="margin:0 0 14px;font-size:16px;color:#0f172a">${escH(saludo)}</p>` : ''}${p}
${detalle ? `<table role="presentation" cellpadding="0" cellspacing="0" style="background:#e0f2fe;border-radius:12px;width:100%;margin:6px 0 16px"><tr><td style="padding:12px 14px;font-size:15px;color:#075985">${escH(detalle).replace(/\n/g, '<br>')}</td></tr></table>` : ''}
${enlace ? `<p style="margin:8px 0 18px"><a href="${escH(enlace)}" style="background:${color};color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:12px;display:inline-block;font-size:16px">${escH(boton || 'Abrir')}</a></p>` : ''}
<p style="margin:16px 0 0;font-size:14px;color:#475569">${escH(pie || '')}</p></td></tr>
<tr><td style="background:#f8fafc;padding:14px 22px;font-size:12px;color:#64748b">Enviado con ProfeTok 📒 · Recibes este correo por tu registro como familia o docente.${baja ? ` <a href="${escH(baja)}" style="color:#64748b">Dejar de recibir correos</a>` : ''}</td></tr></table></td></tr></table></body></html>`;
    const texto = [colegio, titulo, '', saludo, cuerpo, detalle, enlace ? `${boton || 'Abrir'}: ${enlace}` : '', pie, '', baja ? 'Dejar de recibir correos: ' + baja : ''].filter(x => x !== undefined && x !== null).join('\n');
    return { html, texto };
  }

  // ---------- cola (envía de a uno, sin saturar al proveedor) ----------
  let trabajando = false;
  async function procesar() {
    if (trabajando || !listo()) return; trabajando = true;
    try { for (;;) {
      const e = q1("select e.*, c.asunto, c.cuerpo, c.enlace, c.tipo, c.colegio_id, c.autor_id, c.id cid from envios e join campanas c on c.id=e.campana_id where e.estado='pendiente' order by e.id limit 1"); if (!e) break;
      const col = q1('select * from colegios where id=?', e.colegio_id) || { nombre: 'ProfeTok', color: '#0284c7' }, autor = q1('select nombre, email from usuarios where id=?', e.autor_id), extra = (() => { try { return JSON.parse(e.enlace || '{}'); } catch (x) { return {}; } })();
      const persona = s => String(s || '').replace(/\{nombre\}/g, (e.nombre || '').split(' ')[0] || '').replace(/\{alumno\}/g, e.alumno || 'tu hijo(a)');
      const baja = (getS('urlPublica', '') || '') + `/baja?u=${e.usuario_id}&f=${firma(e.usuario_id)}`;
      const { html, texto } = plantilla({ colegio: col.nombre, color: col.color, tipo: e.tipo, titulo: persona(e.asunto), saludo: e.nombre ? `Hola ${e.nombre.split(' ')[0]} 👋` : 'Hola 👋', cuerpo: persona(e.cuerpo), detalle: persona(extra.detalle || ''), enlace: extra.url || '', boton: extra.boton, pie: autor ? `${autor.nombre}${e.tipo === 'campana' ? '' : ' · ' + col.nombre}` : col.nombre, baja: getS('urlPublica', '') ? baja : '' });
      try { await enviar({ para: e.email, paraNombre: e.nombre, asunto: persona(e.asunto), html, texto, deNombre: e.tipo === 'campana' ? (conf().nombre || 'ProfeTok') : `${col.nombre} (ProfeTok)`, responderA: e.tipo === 'campana' ? undefined : autor?.email, baja: getS('urlPublica', '') ? baja : '' });
        run("update envios set estado='enviado', enviado=datetime('now') where id=?", e.id); run('update campanas set enviados=enviados+1 where id=?', e.cid); }
      catch (er) { run("update envios set estado='fallido', error=? where id=?", String(er.message).slice(0, 200), e.id); run('update campanas set fallidos=fallidos+1 where id=?', e.cid); if (/40[13]|auth|credential|535/i.test(er.message)) { console.log('[ProfeTok] Correo: ' + er.message); break; } }
      run("update campanas set estado=case when enviados+fallidos>=total then 'enviada' else 'enviando' end where id=?", e.cid);
      await new Promise(r => setTimeout(r, +conf().pausa || 250)); // ~10 000 por hora; con Amazon SES o un plan pagado de Brevo se puede bajar la pausa
    } } finally { trabajando = false; }
  }
  setInterval(() => procesar().catch(() => {}), 20000).unref();

  // destinatarios: familias (padres) de un aula, de todos o de algunos alumnos
  function familiasDe(aulaId, alumnos) {
    const filtro = Array.isArray(alumnos) && alumnos.length ? `and a.id in (${alumnos.map(Number).filter(Boolean).join(',') || 0})` : '';
    const filas = q(`select u.id, u.email, u.nombre, group_concat(a.nombres, ' y ') alumno from familia f join usuarios u on u.id=f.padre_id join alumnos a on a.id=f.alumno_id where a.aula_id=? and u.rol='padre' and coalesce(u.no_correo,0)=0 and u.activo=1 ${filtro} group by u.id`, aulaId);
    return filas;
  }
  function encolar({ colegioId, aulaId, autorId, tipo, asunto, cuerpo, url, boton, detalle, destinatarios }) {
    const id = run('insert into campanas(colegio_id, aula_id, autor_id, tipo, asunto, cuerpo, enlace, total, estado) values(?,?,?,?,?,?,?,?,?)', colegioId, aulaId || null, autorId, tipo, asunto, cuerpo, JSON.stringify({ url, boton, detalle }), destinatarios.length, destinatarios.length ? 'en cola' : 'enviada').lastInsertRowid;
    for (const d of destinatarios) run('insert into envios(campana_id, email, nombre, alumno, usuario_id) values(?,?,?,?,?)', id, d.email, d.nombre, d.alumno || '', d.id);
    setTimeout(() => procesar().catch(() => {}), 200); return id;
  }
  const urlOk = u => /^https:\/\/[^\s<>"]{4,300}$/.test(String(u || '')) ? String(u) : '';

  // ---------- API ----------
  const API = {};
  // docente: enviar a las familias del aula (un clic)
  API['POST /api/correo'] = async ({ u, b, aulaDe, membresia }) => {
    const a = aulaDe(u, b.aula_id); if (!a) throw 403; if (!listo()) throw 'El envío de correos aún no está configurado. Avísale al administrador de ProfeTok.';
    const col = q1('select * from colegios where id=?', a.colegio_id), dest = familiasDe(a.id, b.alumnos);
    if (!dest.length) throw 'Ninguna familia de esta aula tiene cuenta todavía. Invítalas con el botón 👨‍👩‍👧.';
    const max = LIMITE_MES[membresia(col).prueba ? 'prueba' : col.plan] || 100; if (usadosMes(col.id) + dest.length > max) throw `Llegaste al límite de ${max} correos de este mes en tu plan.`;
    const tipo = ICON[b.tipo] ? b.tipo : 'otro', asunto = limpio(b.asunto, 120), cuerpo = String(b.cuerpo || '').replace(/[<>]/g, '').slice(0, 4000).trim();
    if (asunto.length < 3 || cuerpo.length < 3) throw 'Escribe el asunto y el mensaje';
    const id = encolar({ colegioId: col.id, aulaId: a.id, autorId: u.id, tipo, asunto, cuerpo, url: urlOk(b.url), boton: limpio(b.boton, 40), detalle: String(b.detalle || '').replace(/[<>]/g, '').slice(0, 400), destinatarios: dest });
    return { id, total: dest.length };
  };
  API['GET /api/correos'] = async ({ u, url, aulaDe }) => { const a = aulaDe(u, url.searchParams.get('aula')); if (!a) throw 403; const col = q1('select * from colegios where id=?', a.colegio_id); return { listo: listo(), campanas: q('select id, tipo, asunto, total, enviados, fallidos, estado, creado from campanas where aula_id=? order by id desc limit 40', a.id), familias: familiasDe(a.id).length, usados: usadosMes(col.id) }; };
  // dueño: configuración y campañas a docentes (email marketing de ProfeTok)
  API['POST /api/correo-config'] = async ({ u, b }) => {
    if (u.rol !== 'dueno') throw 403; const c = conf();
    const n = { proveedor: b.proveedor === 'smtp' ? 'smtp' : 'brevo', remitente: limpio(b.remitente, 120).toLowerCase(), nombre: limpio(b.nombre, 60) || 'ProfeTok', host: limpio(b.host, 120), port: +b.port || 465, user: limpio(b.user, 120), apiKey: b.apiKey ? String(b.apiKey).trim().slice(0, 200) : c.apiKey, pass: b.pass ? String(b.pass).slice(0, 200) : c.pass };
    setS('correo', n); if (b.urlPublica !== undefined) setS('urlPublica', urlOk(b.urlPublica).replace(/\/$/, ''));
    if (b.prueba) { const { html, texto } = plantilla({ colegio: 'ProfeTok', titulo: '¡Tus correos funcionan!', saludo: 'Hola 👋', cuerpo: 'Este es un correo de prueba de ProfeTok. Si lo recibes, ya puedes enviar tareas, reuniones y comunicados a las familias con un clic.', tipo: 'campana' }); await enviar({ para: u.email, asunto: '✅ Prueba de correo de ProfeTok', html, texto }); }
    return { ok: 1 };
  };
  API['GET /api/correo-config'] = async ({ u }) => { if (u.rol !== 'dueno') throw 403; const c = conf(); return { proveedor: c.proveedor || 'brevo', remitente: c.remitente || '', nombre: c.nombre || 'ProfeTok', host: c.host || '', port: c.port || 465, user: c.user || '', tieneClave: !!(c.apiKey || c.pass), listo: listo(), urlPublica: getS('urlPublica', ''), campanas: q("select id, asunto, total, enviados, fallidos, estado, creado from campanas where tipo='campana' order by id desc limit 20") }; };
  API['POST /api/campana'] = async ({ u, b }) => {
    if (u.rol !== 'dueno') throw 403; if (!listo()) throw 'Primero configura el envío de correos';
    const seg = { todos: "1=1", prueba: "c.plan='prueba'", pagando: "c.plan<>'prueba' and julianday(c.vence)>julianday('now')", vencidos: "julianday(c.vence)<=julianday('now')" }[b.segmento] || '1=1';
    const dest = q(`select u.id, u.email, u.nombre from usuarios u join colegios c on c.id=u.colegio_id where u.rol in ('docente','director') and coalesce(u.no_correo,0)=0 and u.activo=1 and ${seg}`);
    if (!dest.length) throw 'No hay docentes en ese grupo'; const asunto = limpio(b.asunto, 120), cuerpo = String(b.cuerpo || '').replace(/[<>]/g, '').slice(0, 6000);
    if (asunto.length < 3 || cuerpo.length < 3) throw 'Escribe el asunto y el mensaje';
    return { id: encolar({ colegioId: 0, aulaId: null, autorId: u.id, tipo: 'campana', asunto, cuerpo, url: urlOk(b.url), boton: limpio(b.boton, 40), destinatarios: dest }), total: dest.length };
  };
  // baja de correos (sin iniciar sesión, con firma)
  function baja(url) { const id = +url.searchParams.get('u'), f = url.searchParams.get('f'); if (!id || f !== firma(id)) return false; run('update usuarios set no_correo=1 where id=?', id); return true; }
  return { API, encolar, familiasDe, listo, baja, plantilla, enviar, nombre: () => conf().nombre || 'ProfeTok', remitente: () => conf().remitente || '' };
}
module.exports = { crear };
