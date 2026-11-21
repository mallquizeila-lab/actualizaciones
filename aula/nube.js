// ☁️ Copia de seguridad en la nube: cada día la base de datos se comprime, se CIFRA con tu «clave de respaldo»
// (AES-256-GCM: ni el proveedor de la nube puede leerla) y se sube a un almacenamiento compatible con S3:
// Cloudflare R2 (10 GB gratis), Backblaze B2 (10 GB gratis) o Amazon S3. Se guardan los últimos 30 días.
// Si el VPS se daña, se descarga el archivo y se restaura con:  node restaurar.js archivo.enc "tu clave" aula.db
// Firma AWS Signature V4 hecha con crypto de Node (sin librerías).
const crypto = require('crypto'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const sha = d => crypto.createHash('sha256').update(d).digest('hex');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

// firma una petición S3 (Signature V4); devuelve las cabeceras a enviar
function firmar({ metodo, url, region = 'auto', servicio = 's3', clave, secreto, cuerpo = '', fecha = new Date(), cabeceras = {}, hashCuerpo }) {
  const u = new URL(url), amz = fecha.toISOString().replace(/[:-]|\.\d{3}/g, ''), dia = amz.slice(0, 8);
  const ph = hashCuerpo || sha(cuerpo), H = { host: u.host, 'x-amz-date': amz, ...(servicio === 's3' ? { 'x-amz-content-sha256': ph } : {}), ...Object.fromEntries(Object.entries(cabeceras).map(([k, v]) => [k.toLowerCase(), String(v).trim()])) };
  const nombres = Object.keys(H).sort(), firmadas = nombres.join(';');
  const ruta = u.pathname.split('/').map(p => enc(decodeURIComponent(p))).join('/') || '/';
  const consulta = [...u.searchParams].sort(([a, x], [b, y]) => a < b ? -1 : a > b ? 1 : x < y ? -1 : 1).map(([k, v]) => enc(k) + '=' + enc(v)).join('&');
  const canon = [metodo, ruta, consulta, nombres.map(n => n + ':' + H[n]).join('\n') + '\n', firmadas, ph].join('\n');
  const alcance = `${dia}/${region}/${servicio}/aws4_request`, aFirmar = ['AWS4-HMAC-SHA256', amz, alcance, sha(canon)].join('\n');
  const kf = hmac(hmac(hmac(hmac('AWS4' + secreto, dia), region), servicio), 'aws4_request');
  return { ...H, authorization: `AWS4-HMAC-SHA256 Credential=${clave}/${alcance}, SignedHeaders=${firmadas}, Signature=${hmac(kf, aFirmar).toString('hex')}` };
}

// cifrado del respaldo: «PTK1» + sal(16) + iv(12) + tag(16) + datos   (clave = scrypt(tu clave, sal))
function cifrar(buf, clave) { const sal = crypto.randomBytes(16), iv = crypto.randomBytes(12), k = crypto.scryptSync(String(clave), sal, 32), c = crypto.createCipheriv('aes-256-gcm', k, iv); const d = Buffer.concat([c.update(buf), c.final()]); return Buffer.concat([Buffer.from('PTK1'), sal, iv, c.getAuthTag(), d]); }
function descifrar(buf, clave) { if (buf.subarray(0, 4).toString() !== 'PTK1') throw new Error('No es un respaldo de ProfeTok'); const sal = buf.subarray(4, 20), iv = buf.subarray(20, 32), tag = buf.subarray(32, 48), k = crypto.scryptSync(String(clave), sal, 32), d = crypto.createDecipheriv('aes-256-gcm', k, iv); d.setAuthTag(tag); return Buffer.concat([d.update(buf.subarray(48)), d.final()]); }

function crear({ db, getS, setS, DATA, hoy, limpio }) {
  const conf = () => getS('nube', {}), estado = () => getS('nube_estado', {});
  const listo = () => { const c = conf(); return !!(c.endpoint && c.bucket && c.clave && c.secreto && c.cifrado); };
  const objUrl = nombre => { const c = conf(); return `${c.endpoint.replace(/\/+$/, '')}/${c.bucket}/${(c.carpeta || 'profetok').replace(/^\/|\/$/g, '')}/${nombre}`; };
  async function s3(metodo, nombre, cuerpo) {
    const c = conf(), url = objUrl(nombre), h = firmar({ metodo, url, region: c.region || 'auto', clave: c.clave, secreto: c.secreto, cuerpo: cuerpo || '' });
    const r = await fetch(url, { method: metodo, headers: h, body: cuerpo, signal: AbortSignal.timeout(300000) });
    if (!r.ok && !(metodo === 'DELETE' && r.status === 404)) throw new Error(`La nube respondió ${r.status}: ${(await r.text()).replace(/\s+/g, ' ').slice(0, 160)}`); return r;
  }
  // arma el respaldo cifrado de hoy (base de datos + archivos ligeros como logos y fotos)
  function armar() {
    const tmp = path.join(DATA, 'respaldos', 'nube-tmp.db'); fs.mkdirSync(path.dirname(tmp), { recursive: true }); fs.rmSync(tmp, { force: true });
    db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`); const crudo = fs.readFileSync(tmp); fs.rmSync(tmp, { force: true });
    return cifrar(zlib.gzipSync(crudo, { level: 9 }), conf().cifrado);
  }
  let trabajando = false;
  async function subir(forzar) {
    if (!listo() || trabajando) return estado(); const e = estado(); if (!forzar && e.dia === hoy() && e.ok) return e; trabajando = true;
    try {
      const datos = armar(), nombre = `aula-${hoy()}.db.gz.enc`; await s3('PUT', nombre, datos);
      const viejo = new Date(Date.now() - 31 * 864e5 - 5 * 3600e3).toISOString().slice(0, 10); await s3('DELETE', `aula-${viejo}.db.gz.enc`).catch(() => {}); // se guardan 30 días
      setS('nube_estado', { ok: true, dia: hoy(), fecha: new Date().toISOString(), nombre, kb: Math.round(datos.length / 1024) }); console.log('[ProfeTok] ☁️ Respaldo en la nube: ' + nombre);
    } catch (er) { setS('nube_estado', { ...estado(), ok: false, error: String(er.message).slice(0, 200), fecha: new Date().toISOString() }); console.log('[ProfeTok] ☁️ Respaldo falló: ' + er.message); }
    finally { trabajando = false; } return estado();
  }
  setTimeout(() => subir().catch(() => {}), 120000).unref(); setInterval(() => subir().catch(() => {}), 3 * 3600e3).unref();

  const API = {};
  API['GET /api/nube'] = async ({ u }) => { if (u.rol !== 'dueno') throw 403; const c = conf(); return { listo: listo(), endpoint: c.endpoint || '', bucket: c.bucket || '', carpeta: c.carpeta || 'profetok', region: c.region || 'auto', tieneClave: !!c.clave, tieneSecreto: !!c.secreto, tieneCifrado: !!c.cifrado, estado: estado() }; };
  API['POST /api/nube'] = async ({ u, b }) => {
    if (u.rol !== 'dueno') throw 403; const c = conf();
    if (b.probar) { if (!listo()) throw 'Completa los datos de la nube'; const e = await subir(true); if (!e.ok) throw e.error || 'No se pudo subir'; return { estado: e }; }
    const ep = String(b.endpoint || '').trim().replace(/\/+$/, ''); if (ep && !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(ep)) throw 'La dirección (endpoint) debe empezar con https:// y no llevar carpetas';
    if (b.cifrado && String(b.cifrado).length < 10) throw 'La clave de respaldo debe tener al menos 10 caracteres (guárdala bien: sin ella no se puede restaurar)';
    setS('nube', { endpoint: ep, bucket: limpio(b.bucket, 63).toLowerCase(), carpeta: limpio(b.carpeta, 40) || 'profetok', region: limpio(b.region, 30) || 'auto',
      clave: b.clave ? String(b.clave).trim().slice(0, 200) : c.clave, secreto: b.secreto ? String(b.secreto).trim().slice(0, 300) : c.secreto, cifrado: b.cifrado ? String(b.cifrado).slice(0, 200) : c.cifrado });
    return { ok: 1 };
  };
  // ⬇️ descarga manual (cifrada) para guardarla también en tu PC
  function descarga(u) { if (u?.rol !== 'dueno') return null; const c = conf(); if (!c.cifrado) return { error: 'Primero define tu clave de respaldo' }; return { nombre: `ProfeTok-respaldo-${hoy()}.db.gz.enc`, datos: armar() }; }
  return { API, subir, descarga, listo };
}
module.exports = { crear, firmar, cifrar, descifrar };
