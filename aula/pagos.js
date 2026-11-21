// 💳 Pagos automáticos con Mercado Pago (tarjetas, y Yape si tu cuenta de Mercado Pago lo tiene habilitado) + cupones.
// El docente paga → Mercado Pago avisa a ProfeTok (webhook) → el plan se activa solo, al instante.
// Seguridad: nunca se confía en lo que manda el navegador; ProfeTok consulta el pago directo a Mercado Pago
// y revisa estado, monto y referencia. Si configuras la «clave secreta» del webhook, además se verifica su firma.
// El pago manual con Yape/Plin (número de operación + aprobación del dueño) sigue funcionando como respaldo.
const crypto = require('crypto');
const MP = process.env.AULA_MP_API || 'https://api.mercadopago.com'; // (la variable solo se usa en pruebas)
const DESC_MESES = { 1: 0, 3: 0.10, 6: 0.15, 12: 0.25 }; // pagar por más meses sale más barato

function crear({ db, q, q1, run, getS, setS, limpio, PLANES, activarPago, base }) {
  for (const c of ['mp_pref text', 'mp_id text', 'cupon text', 'meses integer default 1', 'comprobante text', 'provisional integer default 0', 'vence_antes text', 'bono integer default 0']) try { db.exec('alter table pagos add column ' + c); } catch (e) {}
  db.exec(`create table if not exists suscripciones (id integer primary key, colegio_id integer, usuario_id integer, plan text, monto real, mp_id text unique, estado text default 'pendiente', creado text default (datetime('now')), ultimo_cobro text);`);
  db.exec(`create table if not exists cupones (codigo text primary key, pct integer, plan text, vence text, usos_max integer default 0, usos integer default 0, contacto_id integer, nota text, creado text default (datetime('now')));`);
  const conf = () => getS('mp', {});
  const listo = () => !!conf().token;
  const mp = async (ruta, opc = {}) => {
    const r = await fetch(MP + ruta, { ...opc, signal: AbortSignal.timeout(20000), headers: { authorization: 'Bearer ' + conf().token, 'content-type': 'application/json', ...(opc.headers || {}) } });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error('Mercado Pago ' + r.status + ': ' + String(j.message || j.error || '').slice(0, 140)); return j;
  };

  // ---------- cupones ----------
  function cupon(codigo, plan) {
    const c = q1('select * from cupones where codigo=?', String(codigo || '').trim().toUpperCase()); if (!c) return null;
    if (c.vence && new Date(c.vence) < new Date()) return null; if (c.usos_max && c.usos >= c.usos_max) return null; if (c.plan && plan && c.plan !== plan) return null;
    return c;
  }
  function precio(plan, meses, codigo) {
    const P = PLANES[plan]; if (!P) throw 'Plan no válido'; meses = DESC_MESES[meses] !== undefined ? +meses : 1;
    const bruto = P.precio * meses, dm = DESC_MESES[meses], cu = codigo ? cupon(codigo, plan) : null;
    if (codigo && !cu) throw 'Ese cupón no existe, ya venció o ya se usó';
    const total = Math.max(1, Math.round(bruto * (1 - dm) * (1 - (cu ? cu.pct : 0) / 100) * 100) / 100);
    return { plan, meses, bruto, descMeses: Math.round(dm * 100), cupon: cu ? { codigo: cu.codigo, pct: cu.pct } : null, total };
  }
  const nuevoCupon = ({ pct, horas, plan, usos = 1, contactoId, nota, prefijo = 'PROFE' }) => {
    const codigo = prefijo + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    run('insert into cupones(codigo, pct, plan, vence, usos_max, contacto_id, nota) values(?,?,?,?,?,?,?)', codigo, pct, plan || null, horas ? new Date(Date.now() + horas * 3600e3).toISOString() : null, usos, contactoId || null, nota || ''); return codigo;
  };

  // ---------- revisar un pago con Mercado Pago y activar ----------
  async function revisarPagoMP(pagoMP) {
    const ref = +pagoMP.external_reference, p = ref && q1('select * from pagos where id=?', ref); if (!p) return 'sin referencia';
    run('update pagos set mp_id=? where id=?', String(pagoMP.id), p.id);
    if (pagoMP.status === 'approved') {
      if (pagoMP.currency_id && pagoMP.currency_id !== 'PEN') return 'moneda distinta';
      if (+pagoMP.transaction_amount + 0.01 < +p.monto) { run("update pagos set estado='revisar' where id=?", p.id); return 'monto menor'; }
      activarPago(p.id, 'Mercado Pago ' + (pagoMP.payment_method_id || '')); return 'aprobado';
    }
    if (['rejected', 'cancelled'].includes(pagoMP.status) && p.estado === 'pendiente') run("update pagos set estado='rechazado' where id=?", p.id);
    return pagoMP.status;
  }
  const firmaOk = (req, url) => { // https://www.mercadopago.com.pe/developers/es/docs/your-integrations/notifications/webhooks
    const s = conf().secreto; if (!s) return true; const x = String(req.headers['x-signature'] || ''), ts = /ts=([^,]+)/.exec(x)?.[1], v1 = /v1=([a-f0-9]+)/.exec(x)?.[1];
    if (!ts || !v1) return false; const id = String(url.searchParams.get('data.id') || '').toLowerCase();
    const esperado = crypto.createHmac('sha256', s).update(`id:${id};request-id:${req.headers['x-request-id'] || ''};ts:${ts};`).digest('hex');
    return esperado.length === v1.length && crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
  };

  const API = {}, LIBRES = ['POST /api/mp/webhook'];
  API['GET /api/precio'] = async ({ url }) => { return precio(url.searchParams.get('plan'), +url.searchParams.get('meses') || 1, url.searchParams.get('cupon')); };
  API['POST /api/checkout'] = async ({ u, b, req }) => {
    if (!['docente', 'director'].includes(u.rol)) throw 403; if (!listo()) throw 'El pago con tarjeta aún no está activado. Usa Yape o Plin.';
    const pr = b.recarga ? { plan: 'recarga', meses: 0, total: Math.round(+b.recarga * 100) / 100 } : precio(b.plan, +b.meses || 1, b.cupon), P = PLANES[pr.plan] || { nombre: 'Recarga de saldo' }, url = base(req);
    if (b.recarga && !(pr.total >= 10 && pr.total <= 2000)) throw 'La recarga debe ser de S/ 10 a S/ 2000';
    const id = run('insert into pagos(colegio_id, plan, monto, metodo, operacion, cupon, meses) values(?,?,?,?,?,?,?)', u.colegio_id, pr.plan, pr.total, 'mercadopago', b.recarga ? 'Mercado Pago · recarga' : 'Mercado Pago · ' + pr.meses + ' mes(es)', pr.cupon?.codigo || null, pr.meses).lastInsertRowid;
    const pref = await mp('/checkout/preferences', { method: 'POST', body: JSON.stringify({
      items: [{ id: 'profetok-' + pr.plan, title: b.recarga ? `ProfeTok · Recarga de saldo S/ ${pr.total}` : `ProfeTok ${P.nombre} · ${pr.meses} mes${pr.meses > 1 ? 'es' : ''}`, quantity: 1, unit_price: pr.total, currency_id: 'PEN' }],
      payer: { email: u.email }, external_reference: String(id), statement_descriptor: 'PROFETOK',
      back_urls: { success: `${url}/#/plan?pago=${id}`, failure: `${url}/#/plan?pago=${id}`, pending: `${url}/#/plan?pago=${id}` }, auto_return: 'approved',
      ...(/^https:/.test(url) ? { notification_url: `${url}/api/mp/webhook` } : {}), metadata: { pago: id } }) });
    run('update pagos set mp_pref=? where id=?', pref.id, id);
    return { url: pref.init_point, id };
  };
  // al volver de Mercado Pago el navegador pregunta; ProfeTok confirma directo con Mercado Pago (por si el webhook tarda)
  API['GET /api/checkout-estado'] = async ({ u, url }) => {
    const p = q1('select * from pagos where id=? and colegio_id=?', +url.searchParams.get('id'), u.colegio_id || -1); if (!p) throw 404;
    if (p.estado === 'pendiente' && listo()) { const r = await mp('/v1/payments/search?sort=date_created&criteria=desc&external_reference=' + p.id).catch(() => null); for (const x of r?.results || []) await revisarPagoMP(x); }
    return { estado: q1('select estado from pagos where id=?', p.id).estado };
  };
  API['POST /api/mp/webhook'] = async ({ b, url, req }) => {
    if (!firmaOk(req, url)) return { ok: 0 };
    const tipo = b.type || url.searchParams.get('type') || b.topic, id = b.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
    if (/subscription|preapproval/.test(tipo || '') && id && listo()) { await revisarSuscripcion(tipo, String(id)).catch(e => console.log('[ProfeTok] Suscripción: ' + e.message)); return { ok: 1 }; }
    if (tipo === 'payment' && id && listo()) { const p = await mp('/v1/payments/' + encodeURIComponent(id)).catch(e => (console.log('[ProfeTok] ' + e.message), null)); if (p) console.log('[ProfeTok] Mercado Pago pago ' + id + ': ' + await revisarPagoMP(p)); }
    return { ok: 1 };
  };
  // dueño
  API['GET /api/mp-config'] = async ({ u }) => { if (u.rol !== 'dueno') throw 403; const c = conf(); return { listo: listo(), tieneToken: !!c.token, tieneSecreto: !!c.secreto, prueba: /^TEST-/.test(c.token || ''), cupones: q('select * from cupones order by creado desc limit 60'), descMeses: DESC_MESES }; };
  API['POST /api/mp-config'] = async ({ u, b }) => {
    if (u.rol !== 'dueno') throw 403; const c = conf();
    const n = { token: b.token ? String(b.token).trim().slice(0, 200) : c.token, secreto: b.secreto ? String(b.secreto).trim().slice(0, 200) : c.secreto };
    if (b.borrar) { setS('mp', {}); return { ok: 1 }; }
    if (b.token) { const r = await fetch(MP + '/users/me', { headers: { authorization: 'Bearer ' + n.token }, signal: AbortSignal.timeout(15000) }).catch(() => null); if (!r?.ok) throw 'Mercado Pago no aceptó ese Access Token. Cópialo de nuevo (Tus integraciones → Credenciales de producción).'; }
    setS('mp', n); return { ok: 1 };
  };
  API['POST /api/cupon'] = async ({ u, b }) => {
    if (u.rol !== 'dueno') throw 403;
    if (b.borrar) { run('delete from cupones where codigo=?', String(b.borrar)); return { ok: 1 }; }
    const pct = Math.round(+b.pct); if (!(pct >= 1 && pct <= 90)) throw 'El descuento debe ser de 1 a 90 %';
    const codigo = String(b.codigo || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20); if (codigo.length < 4) throw 'El código debe tener al menos 4 letras o números';
    if (q1('select 1 from cupones where codigo=?', codigo)) throw 'Ese código ya existe';
    run('insert into cupones(codigo, pct, plan, vence, usos_max, nota) values(?,?,?,?,?,?)', codigo, pct, PLANES[b.plan] ? b.plan : null, b.vence ? new Date(b.vence + 'T23:59:59-05:00').toISOString() : null, Math.max(0, +b.usos || 0), limpio(b.nota, 80)); return { ok: 1 };
  };
  // ---------- 💳 renovación automática (suscripción mensual con tarjeta en Mercado Pago) ----------
  const suscripcion = cid => { const s = q1("select id, plan, monto, estado, ultimo_cobro, creado from suscripciones where colegio_id=? and estado in ('activa','pendiente') order by id desc limit 1", cid); return s && s.estado === 'activa' ? s : s ? { ...s, pendiente: true } : null; };
  async function revisarSuscripcion(tipo, id) {
    if (/authorized_payment/.test(tipo)) { // un cobro mensual
      const a = await mp('/authorized_payments/' + encodeURIComponent(id)), s = q1('select * from suscripciones where mp_id=?', String(a.preapproval_id || ''));
      const aprobado = a.payment?.status === 'approved' || (a.status === 'processed' && !a.payment?.status);
      if (!s || !aprobado || q1('select 1 from pagos where mp_id=?', 'auto-' + id)) return;
      const pid = run('insert into pagos(colegio_id, plan, monto, metodo, operacion, meses, mp_id) values(?,?,?,?,?,?,?)', s.colegio_id, s.plan, +a.transaction_amount || s.monto, 'mp-auto', 'Renovación automática · 1 mes(es)', 1, 'auto-' + id).lastInsertRowid;
      run("update suscripciones set ultimo_cobro=datetime('now'), estado='activa' where id=?", s.id); activarPago(pid, 'renovación automática'); return;
    }
    const p = await mp('/preapproval/' + encodeURIComponent(id)), s = q1('select * from suscripciones where mp_id=?', String(p.id || id)); if (!s) return;
    run('update suscripciones set estado=? where id=?', p.status === 'authorized' ? 'activa' : p.status === 'cancelled' ? 'cancelada' : p.status === 'paused' ? 'pausada' : 'pendiente', s.id);
  }
  API['POST /api/suscripcion'] = async ({ u, b, req }) => {
    if (!['docente', 'director'].includes(u.rol)) throw 403; if (!listo()) throw 'La renovación automática necesita Mercado Pago (aún no está activado).';
    if (q1("select 1 from suscripciones where colegio_id=? and estado='activa'", u.colegio_id)) throw 'Ya tienes la renovación automática activada';
    const pr = precio(b.plan, 1, ''), url = base(req), P = PLANES[pr.plan];
    const r = await mp('/preapproval', { method: 'POST', body: JSON.stringify({ reason: `ProfeTok ${P.nombre} · mensual`, external_reference: 'col-' + u.colegio_id, payer_email: u.email, back_url: `${url}/#/plan?auto=1`, status: 'pending',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: pr.total, currency_id: 'PEN' } }) });
    run("delete from suscripciones where colegio_id=? and estado='pendiente'", u.colegio_id);
    run('insert into suscripciones(colegio_id, usuario_id, plan, monto, mp_id) values(?,?,?,?,?)', u.colegio_id, u.id, pr.plan, pr.total, String(r.id)); return { url: r.init_point };
  };
  API['GET /api/suscripcion'] = async ({ u }) => { const s = q1("select * from suscripciones where colegio_id=? and estado in ('activa','pendiente') order by id desc limit 1", u.colegio_id || -1);
    if (s?.estado === 'pendiente' && listo()) await revisarSuscripcion('preapproval', s.mp_id).catch(() => {}); return { auto: suscripcion(u.colegio_id || -1) }; };
  API['POST /api/suscripcion-cancelar'] = async ({ u }) => { const s = q1("select * from suscripciones where colegio_id=? and estado in ('activa','pendiente','pausada') order by id desc limit 1", u.colegio_id || -1); if (!s) throw 'No tienes renovación automática';
    if (listo()) await mp('/preapproval/' + encodeURIComponent(s.mp_id), { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) }).catch(e => { throw 'Mercado Pago no respondió: ' + e.message; });
    run("update suscripciones set estado='cancelada' where id=?", s.id); return { ok: 1 }; };
  return { API, LIBRES, precio, nuevoCupon, listo, DESC_MESES, suscripcion };
}
module.exports = { crear, DESC_MESES };
