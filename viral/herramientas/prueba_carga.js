// Prueba de carga de la página viral: simula visitas, chat y batallas en línea de GLORY BROWN.
// Uso: node herramientas/prueba_carga.js <url> <jugadores> [segundos] [pid del servidor]
// Mide: tiempo de respuesta (ms), bytes enviados por el servidor y CPU del proceso (si se da el pid).
const http = require('http'), https = require('https'), fs = require('fs');
const BASE = new URL(process.argv[2] || 'http://localhost:3300'), N = +process.argv[3] || 100, SEG = +process.argv[4] || 40, PID = +process.argv[5] || 0;
const mod = BASE.protocol === 'https:' ? https : http, agent = new mod.Agent({ keepAlive: true, maxSockets: 4000 });
let bytes = 0; const lat = [];
const ipDe = i => `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;
function pedir(ruta, { metodo = 'GET', cuerpo, ip = '10.0.0.1', zip = true } = {}) {
  return new Promise(ok => { const t0 = Date.now(); const r = mod.request(new URL(ruta, BASE), { method: metodo, agent, headers: { 'cf-connecting-ip': ip, 'accept-encoding': zip ? 'br, gzip' : 'identity', ...(cuerpo ? { 'content-type': 'application/json' } : {}) } }, res => { let b = []; res.on('data', d => { bytes += d.length; b.push(d); }); res.on('end', () => ok({ code: res.statusCode, ms: Date.now() - t0, body: Buffer.concat(b), h: res.headers })); });
    r.on('error', e => ok({ code: 0, ms: Date.now() - t0, err: e.message })); if (cuerpo) r.write(JSON.stringify(cuerpo)); r.end(); });
}
function stream(ruta, ip, alEvento) {
  const r = mod.request(new URL(ruta, BASE), { agent, headers: { 'cf-connecting-ip': ip, accept: 'text/event-stream' } }, res => { let buf = ''; res.on('data', d => { bytes += d.length; buf += d; let i; while ((i = buf.indexOf('\n\n')) >= 0) { const bloque = buf.slice(0, i); buf = buf.slice(i + 2); const ev = /^event: (.*)$/m.exec(bloque)?.[1], data = /^data: (.*)$/m.exec(bloque)?.[1]; if (ev && data) try { alEvento(ev, JSON.parse(data)); } catch (e) {} } }); });
  r.on('error', () => {}); r.end(); return r;
}
function cpu() { try { const f = fs.readFileSync(`/proc/${PID}/stat`, 'utf8').split(') ')[1].split(' '); return (+f[11] + +f[12]) / 100; } catch (e) { return null; } }
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const kb = b => (b / 1024).toFixed(0) + ' KB', mb = b => (b / 1048576).toFixed(1) + ' MB';

(async () => {
  console.log(`\n=== Prueba con ${N} personas contra ${BASE.origin} ===`);
  // 1) Visitas: cada persona abre la página y descarga los archivos principales
  const html = (await pedir('/', { zip: false })).body.toString(), recursos = [...html.matchAll(/(?:src|href)="(\/[^"#]+?\.(?:js|css|webp|png)(?:\?[^"]*)?)"/g)].map(m => m[1]).slice(0, 30);
  const extra = ['/three.min.js?v=149', '/glory/cartas.js?v=1', '/glory/arte.js?v=2', '/glory/motor.js?v=1', '/glory/tres.js?v=4'];
  for (const r of ['/', ...recursos, ...extra]) await pedir(r); await new Promise(r => setTimeout(r, 3000)); // el servidor prepara la compresión una vez
  bytes = 0; let t0 = Date.now(), c0 = cpu(); const lv = [];
  await Promise.all([...Array(N).keys()].map(async i => { for (const r of ['/', ...recursos, ...extra]) { const x = await pedir(r, { ip: ipDe(i) }); lv.push(x.ms); } }));
  const tv = (Date.now() - t0) / 1000, c1 = cpu();
  console.log(`1) Visitas: ${N} personas abrieron la página + GLORY (${1 + recursos.length + extra.length} archivos c/u) en ${tv.toFixed(1)} s · enviado ${mb(bytes)} (${kb(bytes / N)} por persona) · respuesta p50 ${pct(lv, .5)} ms, p95 ${pct(lv, .95)} ms${c0 != null ? ` · CPU ${(c1 - c0).toFixed(1)} s` : ''}`);
  // 2) Batallas en línea: parejas 1 vs 1 que juegan cartas de verdad
  bytes = 0; const salas = [], streams = [];
  const MAZO = ['escudero_del_alba', 'arqueras_del_sol', 'lanceros_dorados', 'hadas_del_alba', 'lluvia_de_luz', 'torre_del_vigia', 'paladin_radiante', 'cleriga_de_la_aurora'];
  let jugadas = 0, estados = 0, fallos = 0;
  for (let i = 0; i < N; i++) {
    const ip = ipDe(5000 + i), r = await pedir('/api/duelo/buscar', { metodo: 'POST', ip, cuerpo: { uid: 'p' + i, nombre: 'Prueba ' + i, avatar: 'a01', trofeos: 100, mazo: MAZO, niveles: {} } });
    if (r.code !== 200) { fallos++; continue; } const d = JSON.parse(r.body); const yo = { ...d, ip, mano: [] }; salas.push(yo);
    streams.push(stream(`/api/duelo/stream?sala=${d.sala}&tok=${d.tok}`, ip, (ev, data) => { if (ev === 'estado') { estados++; if (data.s?.[yo.asiento]) yo.mano = data.s[yo.asiento][1]; yo.fin = !!data.fin; } }));
  }
  await new Promise(r => setTimeout(r, 2000));
  const empezadas = salas.length; c0 = cpu(); t0 = Date.now(); const lj = [], lp = [];
  const ping = setInterval(async () => { const x = await pedir('/api/chat/salas', { ip: '10.9.9.9' }); lp.push(x.ms); }, 250);
  const juego = setInterval(() => { for (const yo of salas) if (Math.random() < .15 && yo.mano.length) { const k = yo.mano[Math.floor(Math.random() * yo.mano.length)], y = yo.asiento === 0 ? 24 + Math.random() * 5 : 3 + Math.random() * 5;
    pedir('/api/duelo/msg', { metodo: 'POST', ip: yo.ip, cuerpo: { sala: yo.sala, tok: yo.tok, tipo: 'jugar', datos: { k, x: 2 + Math.random() * 14, y } } }).then(x => { jugadas++; lj.push(x.ms); }); } }, 500);
  await new Promise(r => setTimeout(r, SEG * 1000)); clearInterval(juego); clearInterval(ping);
  const tb = (Date.now() - t0) / 1000, c2 = cpu();
  console.log(`2) Batallas: ${empezadas} jugadores en ${Math.ceil(empezadas / 2)} salas durante ${tb.toFixed(0)} s${fallos ? ` (${fallos} no entraron)` : ''} · ${(estados / tb).toFixed(0)} estados/s recibidos · ${jugadas} cartas jugadas`);
  console.log(`   Enviado por el servidor: ${mb(bytes)} → ${kb(bytes / tb)}/s en total, ${kb(bytes / tb / Math.max(1, empezadas))}/s por jugador (≈ ${(bytes * 8 / tb / 1e6).toFixed(1)} Mbit/s de subida)`);
  console.log(`   Respuesta a una jugada: p50 ${pct(lj, .5)} ms, p95 ${pct(lj, .95)} ms · Página mientras tanto: p50 ${pct(lp, .5)} ms, p95 ${pct(lp, .95)} ms${c0 != null ? ` · CPU del servidor ${((c2 - c0) / tb * 100).toFixed(0)} % de un núcleo` : ''}`);
  for (const s of streams) s.destroy(); for (const yo of salas) pedir('/api/duelo/salir', { metodo: 'POST', ip: yo.ip, cuerpo: { sala: yo.sala, tok: yo.tok } });
  setTimeout(() => process.exit(0), 1500);
})();
