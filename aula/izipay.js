// 💜💙 Izipay: QR interoperable dinámico (Yape, Plin y otras billeteras), código Yape, Plin y tarjeta.
// El QR se genera con el monto exacto de cada pago y, al pagar, Izipay avisa a ProfeTok (IPN) y el plan se activa al instante.
// Basado en la documentación oficial de developers.izipay.pe:
//  - Token de sesión: POST {api}/security/v1/Token/Generate (header transactionId; body requestSource, merchantCode, orderNumber, publicKey, amount)
//  - Formulario: script {checkout}/payments/v1/js/index.js → new Izipay({ config }).LoadForm({ authorization, keyRSA, callbackResponse })
//    con config.order.payMethod = "QR,YAPE_CODE,PAGO_PUSH,CARD" y config.urlIPN para el aviso.
//  - Firma: HMAC-SHA256 (base64) de payloadHttp con la «Clave Hash» del panel de Izipay; code "00" = operación exitosa.
//  - Consulta de respaldo: POST {api}/orderinfo/v1/Transaction/Search (Authorization: Bearer token).
// Credenciales (panel.izipay.pe → Desarrolladores → Claves): Código de comercio, Clave API del nuevo botón de pagos, Clave Hash y Clave pública (RSA).
const crypto = require('crypto');
const ENTORNO = {
  prueba: { api: 'https://sandbox-api-pw.izipay.pe', script: 'https://sandbox-checkout.izipay.pe/payments/v1/js/index.js' },
  produccion: { api: 'https://api-pw.izipay.pe', script: 'https://checkout.izipay.pe/payments/v1/js/index.js' },
};
const METODOS = { QR: 'QR interoperable (Yape, Plin y otras)', YAPE_CODE: 'Código Yape', PAGO_PUSH: 'Plin', CARD: 'Tarjeta' };

function crear({ db, q1, run, getS, setS, limpio, PLANES, activarPago, base, precio }) {
  for (const c of ['iz_orden text', 'iz_trx text']) try { db.exec('alter table pagos add column ' + c); } catch (e) {}
  const conf = () => getS('izipay', {});
  const listo = () => { const c = conf(); return !!(c.merchantCode && c.apiKey && c.claveHash && c.rsa); };
  const ent = () => { const c = conf(), e = ENTORNO[c.modo === 'produccion' ? 'produccion' : 'prueba']; return { ...e, api: process.env.AULA_IZI_API || (c.modo === 'produccion' && c.apiUrl) || e.api }; };
  const metodos = () => (conf().metodos || ['QR', 'YAPE_CODE', 'PAGO_PUSH', 'CARD']).filter(m => METODOS[m]);
  const trx = () => String(Date.now()) + crypto.randomInt(100, 999);
  async function token(transactionId, orderNumber, amount) {
    const c = conf(), r = await fetch(ent().api + '/security/v1/Token/Generate', { method: 'POST', signal: AbortSignal.timeout(20000), headers: { 'content-type': 'application/json', transactionId },
      body: JSON.stringify({ requestSource: 'ECOMMERCE', merchantCode: c.merchantCode, orderNumber, publicKey: c.apiKey, amount }) });
    const j = await r.json().catch(() => ({})); if (j.code !== '00' || !j.response?.token) throw new Error('Izipay no generó el token (' + (j.code || r.status) + ': ' + String(j.message || '').slice(0, 80) + '). Revisa tus claves.');
    return j.response.token;
  }
  const firmaOk = (payload, firma) => { const k = conf().claveHash; if (!k || !payload || !firma) return false; const h = crypto.createHmac('sha256', Buffer.from(k, 'utf-8')).update(Buffer.from(payload, 'utf-8')).digest('base64'); return h.length === String(firma).length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(String(firma))); };
  // revisa un resultado firmado de Izipay y activa el plan si todo cuadra
  function procesar(payloadHttp, signature, via, confiable = false) { // confiable = respuesta que ProfeTok pidió directo a la API de Izipay
    if (!confiable && !firmaOk(payloadHttp, signature)) return 'firma inválida';
    let d; try { d = JSON.parse(payloadHttp); } catch (e) { return 'payload ilegible'; }
    const o = (d.response?.order || [])[0] || {}, p = o.orderNumber && q1('select * from pagos where iz_orden=?', String(o.orderNumber)); if (!p) return 'orden desconocida';
    if (d.code !== '00') { if (p.estado === 'pendiente' && d.code !== '021') run("update pagos set estado='rechazado', revisado=datetime('now') where id=?", p.id); return 'no aprobado ' + d.code; }
    if (o.stateMessage && !/autoriz|aprob|exitos/i.test(o.stateMessage)) return 'estado ' + o.stateMessage; // aún no pagado
    if ((o.currency || 'PEN') !== 'PEN' || +o.amount + 0.01 < +p.monto) { run("update pagos set estado='revisar' where id=?", p.id); return 'monto distinto'; }
    run('update pagos set operacion=? where id=?', `Izipay ${o.payMethodAuthorization || d.response?.payMethod || ''} · ${o.referenceNumber || o.uniqueId || ''} · ${p.plan === 'recarga' ? 'recarga' : (p.meses || 1) + ' mes(es)'}`, p.id);
    activarPago(p.id, 'Izipay ' + (o.payMethodAuthorization || '') + ' ' + via); return 'aprobado';
  }

  const API = {}, LIBRES = ['POST /api/izipay/ipn'];
  API['POST /api/izipay/iniciar'] = async ({ u, b, req }) => {
    if (!['docente', 'director'].includes(u.rol)) throw 403; if (!listo()) throw 'El pago con QR aún no está activado. Usa Yape o Plin manual.';
    const dni = String(b.documento || '').replace(/\D/g, ''), cel = String(b.celular || '').replace(/\D/g, '').slice(-9);
    if (!/^\d{8}$/.test(dni) && !/^\d{11}$/.test(dni)) throw 'Escribe tu DNI (8 dígitos) o RUC (11) para el comprobante';
    if (!/^9\d{8}$/.test(cel)) throw 'Escribe tu celular (9 dígitos)';
    const pr = b.recarga ? { plan: 'recarga', meses: 0, total: Math.round(+b.recarga * 100) / 100 } : precio(b.plan, +b.meses || 1, b.cupon || '', u.colegio_id), amount = pr.total.toFixed(2), transactionId = trx();
    if (b.recarga && !(pr.total >= 10 && pr.total <= 2000)) throw 'La recarga debe ser de S/ 10 a S/ 2000';
    const id = run('insert into pagos(colegio_id, plan, monto, metodo, operacion, cupon, meses, iz_trx) values(?,?,?,?,?,?,?,?)', u.colegio_id, pr.plan, pr.total, 'izipay', b.recarga ? 'Izipay · recarga' : 'Izipay · ' + pr.meses + ' mes(es)', pr.cupon?.codigo || null, pr.meses, transactionId).lastInsertRowid;
    const orderNumber = 'PT' + String(id).padStart(8, '0'); run('update pagos set iz_orden=? where id=?', orderNumber, id);
    const auth = await token(transactionId, orderNumber, amount), url = base(req), [nom, ...ape] = limpio(u.nombre, 100).split(' ');
    return { id, script: ent().script, keyRSA: conf().rsa, authorization: auth, config: {
      transactionId, action: 'pay', merchantCode: conf().merchantCode,
      order: { orderNumber, currency: 'PEN', amount, processType: 'AT', merchantBuyerId: 'PT' + String(u.id).padStart(6, '0'), dateTimeTransaction: String(Date.now() * 1000), payMethod: metodos().join(',') },
      billing: { firstName: (nom || 'Docente').slice(0, 50), lastName: (ape.join(' ') || 'ProfeTok').slice(0, 50), email: u.email, phoneNumber: cel, street: (limpio(b.direccion, 40) || 'Av. Principal 100').padEnd(5, '.'), city: (limpio(b.ciudad, 25) || 'Lima').padEnd(3, '.'), state: (limpio(b.ciudad, 25) || 'Lima').padEnd(3, '.'), country: 'PE', postalCode: '15000', documentType: dni.length === 11 ? 'RUC' : 'DNI', document: dni },
      render: { typeForm: 'pop-up', showButtonProcessForm: true },
      ...(/^https:/.test(url) ? { urlIPN: url + '/api/izipay/ipn' } : {}),
      appearance: { logo: url + '/icono-192.png', theme: 'blue', language: 'ESP' } } };
  };
  // respuesta que el formulario entrega al navegador (firmada: se verifica igual que el aviso)
  API['POST /api/izipay/respuesta'] = async ({ u, b }) => {
    const p = q1('select * from pagos where id=? and colegio_id=?', +b.id, u.colegio_id || -1); if (!p) throw 404;
    let r = b.payloadHttp ? procesar(String(b.payloadHttp), String(b.signature || ''), '(navegador)') : 'sin datos';
    if (r !== 'aprobado' && q1('select estado from pagos where id=?', p.id).estado === 'pendiente') r += ' → ' + (await consultar(p).catch(e => e.message)); // se confirma con Izipay
    return { estado: q1('select estado from pagos where id=?', p.id).estado, detalle: r };
  };
  // aviso instantáneo de Izipay (IPN)
  API['POST /api/izipay/ipn'] = async ({ b }) => {
    let r = procesar(String(b.payloadHttp || ''), String(b.signature || ''), '(aviso IPN)');
    if (r === 'firma inválida') { // nunca se confía en un aviso sin firma válida: se pregunta directo a Izipay por esa orden
      let o = ''; try { o = String((JSON.parse(b.payloadHttp || '{}').response?.order || [])[0]?.orderNumber || ''); } catch (e) {}
      const p = /^PT\d{8}$/.test(o) && q1("select * from pagos where iz_orden=? and estado='pendiente'", o);
      if (p) r += ' → consulta directa: ' + (await consultar(p).catch(e => e.message)); }
    console.log('[ProfeTok] Izipay IPN: ' + r); return { ok: 1 };
  };
  // consulta de respaldo (si el aviso tardara)
  async function consultar(p) {
    if (!listo() || !p.iz_orden) return; const t = trx(), tk = await token(t, p.iz_orden, '0.00');
    const r = await fetch(ent().api + '/orderinfo/v1/Transaction/Search', { method: 'POST', signal: AbortSignal.timeout(20000), headers: { 'content-type': 'application/json', transactionId: t, Authorization: 'Bearer ' + tk }, body: JSON.stringify({ merchantCode: conf().merchantCode, numberOrden: p.iz_orden, language: 'ESP' }) });
    const j = await r.json().catch(() => ({})); // respuesta directa de la API de Izipay (pedida por ProfeTok con su token)
    if (j.payloadHttp) return procesar(j.payloadHttp, j.signature, '(consulta)', true);
    if (j.code) return procesar(JSON.stringify(j), '', '(consulta)', true);
  }
  API['GET /api/izipay/estado'] = async ({ u, url }) => {
    const p = q1('select * from pagos where id=? and colegio_id=?', +url.searchParams.get('id'), u.colegio_id || -1); if (!p) throw 404;
    if (p.estado === 'pendiente') await consultar(p).catch(e => console.log('[ProfeTok] Izipay consulta: ' + e.message));
    return { estado: q1('select estado from pagos where id=?', p.id).estado };
  };
  // dueño
  API['GET /api/izipay-config'] = async ({ u }) => { if (u.rol !== 'dueno') throw 403; const c = conf(); return { listo: listo(), modo: c.modo || 'prueba', merchantCode: c.merchantCode || '', tieneApiKey: !!c.apiKey, tieneHash: !!c.claveHash, tieneRsa: !!c.rsa, metodos: metodos(), METODOS, apiUrl: c.apiUrl || '' }; };
  API['POST /api/izipay-config'] = async ({ u, b }) => {
    if (u.rol !== 'dueno') throw 403; if (b.borrar) { setS('izipay', {}); return { ok: 1 }; } const c = conf();
    const n = { modo: b.modo === 'produccion' ? 'produccion' : 'prueba', merchantCode: limpio(b.merchantCode, 15).replace(/\D/g, ''), apiKey: b.apiKey ? String(b.apiKey).trim().slice(0, 400) : c.apiKey, claveHash: b.claveHash ? String(b.claveHash).trim().slice(0, 200) : c.claveHash, rsa: b.rsa ? String(b.rsa).trim().slice(0, 4000) : c.rsa,
      metodos: Object.keys(METODOS).filter(m => b['m_' + m]), apiUrl: /^https:\/\/[a-z0-9.-]+\.izipay\.pe$/.test(String(b.apiUrl || '').trim()) ? String(b.apiUrl).trim() : '' };
    if (!n.metodos.length) n.metodos = ['QR'];
    setS('izipay', n);
    if (b.probar && n.merchantCode && n.apiKey) { await token(trx(), 'PRUEBA' + Date.now().toString().slice(-8), '1.00').catch(e => { throw e.message; }); return { ok: 1, probado: 1 }; }
    return { ok: 1 };
  };
  return { API, LIBRES, listo, procesar, firmaOk };
}
module.exports = { crear, METODOS };
