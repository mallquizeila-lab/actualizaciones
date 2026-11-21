// 🔔 Notificaciones push (Web Push con VAPID) sin librerías ni servicios pagados.
// Cifrado aes128gcm (RFC 8291) y firma VAPID ES256 (RFC 8292) hechos con el módulo crypto de Node.
// Funciona en Chrome, Edge, Firefox y Android; en iPhone solo si el docente instala ProfeTok en su pantalla de inicio.
const crypto = require('crypto');
const b64u = b => Buffer.from(b).toString('base64url'), deB64u = s => Buffer.from(String(s), 'base64url');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();

// Claves VAPID: se crean una sola vez y se guardan en ajustes
function clavesVapid(getS, setS) {
  let k = getS('vapid');
  if (!k?.publica) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const j = publicKey.export({ format: 'jwk' });
    k = { publica: b64u(Buffer.concat([Buffer.from([4]), deB64u(j.x), deB64u(j.y)])), privada: privateKey.export({ format: 'jwk' }) };
    setS('vapid', k);
  }
  return k;
}

function jwtVapid(k, endpoint, contacto) {
  const aud = new URL(endpoint).origin, ahora = Math.floor(Date.now() / 1000);
  const datos = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' })) + '.' + b64u(JSON.stringify({ aud, exp: ahora + 12 * 3600, sub: contacto }));
  const firma = crypto.sign('sha256', Buffer.from(datos), { key: crypto.createPrivateKey({ key: k.privada, format: 'jwk' }), dsaEncoding: 'ieee-p1363' });
  return datos + '.' + b64u(firma);
}

// Cifra el mensaje para una suscripción del navegador (p256dh + auth)
function cifrar(p256dh, auth, texto) {
  const uaPub = deB64u(p256dh), secreto = deB64u(auth), ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const asPub = ecdh.getPublicKey(), compartido = ecdh.computeSecret(uaPub), sal = crypto.randomBytes(16);
  const prkKey = hmac(secreto, compartido);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub, Buffer.from([1])])).subarray(0, 32);
  const prk = hmac(sal, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01', 'binary')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01', 'binary')).subarray(0, 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const cuerpo = Buffer.concat([c.update(Buffer.concat([Buffer.from(texto), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const cab = Buffer.alloc(21); sal.copy(cab, 0); cab.writeUInt32BE(4096, 16); cab[20] = 65;
  return Buffer.concat([cab, asPub, cuerpo]);
}

// Envía un aviso. Devuelve 'ok', 'borrar' (la suscripción ya no existe) o lanza un error.
async function enviar(k, sub, mensaje, contacto = 'mailto:soporte@profetok.com') {
  const r = await fetch(sub.endpoint, { method: 'POST', signal: AbortSignal.timeout(15000), body: cifrar(sub.p256dh, sub.auth, JSON.stringify(mensaje)),
    headers: { TTL: '86400', Urgency: 'normal', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', Authorization: `vapid t=${jwtVapid(k, sub.endpoint, contacto)}, k=${k.publica}` } });
  if (r.status === 404 || r.status === 410) return 'borrar';
  if (!r.ok) throw new Error('Push ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 120));
  return 'ok';
}

module.exports = { clavesVapid, cifrar, enviar, jwtVapid };
