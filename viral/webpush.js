// Notificaciones Web Push sin librerías (RFC 8291 "aes128gcm" + RFC 8292 VAPID), solo con el módulo crypto de Node.
const crypto = require('crypto');
const b64u = b => Buffer.from(b).toString('base64url');
const unb64u = s => Buffer.from(String(s), 'base64url');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

function generateVAPIDKeys() {
  const e = crypto.createECDH('prime256v1'); e.generateKeys();
  return { publicKey: b64u(e.getPublicKey()), privateKey: b64u(e.getPrivateKey()) };
}

function vapidHeader(endpoint, { subject, publicKey, privateKey }) {
  const pub = unb64u(publicKey);
  const key = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: b64u(unb64u(privateKey)), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' });
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }));
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + body), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${publicKey}`;
}

function encrypt(sub, payload) {
  const uaPublic = unb64u(sub.keys.p256dh), authSecret = unb64u(sub.keys.auth);
  const e = crypto.createECDH('prime256v1'); e.generateKeys();
  const asPublic = e.getPublicKey(), shared = e.computeSecret(uaPublic);
  const ikm = hmac(hmac(authSecret, shared), Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]));
  const salt = crypto.randomBytes(16), prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ct = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const head = Buffer.alloc(21); salt.copy(head, 0); head.writeUInt32BE(4096, 16); head[20] = asPublic.length;
  return Buffer.concat([head, asPublic, ct]);
}

async function sendNotification(sub, payload, { vapid, TTL = 86400, urgency = 'normal' } = {}) {
  const body = encrypt(sub, payload);
  const r = await fetch(sub.endpoint, { method: 'POST', body, signal: AbortSignal.timeout(20000), headers: {
    authorization: vapidHeader(sub.endpoint, vapid), 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: String(TTL), urgency,
  } });
  if (r.status >= 200 && r.status < 300) return { statusCode: r.status };
  const err = new Error('Push ' + r.status + ': ' + (await r.text().catch(() => '')).slice(0, 200)); err.statusCode = r.status; throw err;
}

module.exports = { generateVAPIDKeys, sendNotification, encrypt, vapidHeader };
