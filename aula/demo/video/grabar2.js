// Graba el recorrido de ProfeTok al ritmo de la voz: cada escena dura lo que dura su narración y
// cada acción (clic, escaneo, cambio de curso…) ocurre cuando la voz la menciona. Lee plan.json (de alinear.py).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), B = 'http://localhost:3411', OUT = __dirname;
const PLAN = JSON.parse(fs.readFileSync(path.join(OUT, 'plan.json')));
const call = async (r, body, tok) => (await fetch(B + '/api/' + r, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined })).json();
const espera = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
const RD0 = Date, lima0 = new RD0(RD0.now() - 5 * 3600e3).toISOString().slice(0, 10), OFF = new RD0(lima0 + 'T12:52:00Z').getTime() - RD0.now();
const CURSOR = fs.readFileSync(path.join(OUT, 'grabar.js'), 'utf8').match(/const CURSOR = `([\s\S]*?)`;/)[1];
(async () => {
  const { token: D } = await call('entrar', { email: 'dueno@x.pe', clave: 'ClaveDueno123' }); const R = await call('demo', {}, D);
  const P = (await call('entrar', { email: R.docente.email, clave: R.docente.clave })).token, aula = (await call('yo', null, P)).aulas[0].id;
  const AL = (await call('aula?id=' + aula, null, P)).alumnos, riesgo = AL.find(a => a.riesgo?.nivel === 'alto');
  const marc = (await call(`asistencia?aula=${aula}`, null, P)).marcas, ausente = AL.find(a => !marc[a.id]) || AL.find(a => marc[a.id] === 'F') || AL[0];
  const codigo = (await call('porteria/fotochecks?aula=' + aula, null, P)).alumnos.find(a => a.id === ausente.id).codigo;
  const M = (await call('entrar', { email: R.mama.email, clave: R.mama.clave })).token;
  console.log('escaneo:', ausente.nombres, '· ficha:', riesgo.nombres, '· mamá de', R.mama.hijo);
  const b = await chromium.launch();
  const CONF = {
    s01_login: { ir: '' }, s02_inicio: { tok: P, ir: '#/inicio' }, s03_porteria: { tok: P, ir: '#/porteria' }, s04_fotochecks: { tok: P, ir: `#/fotochecks/${aula}` },
    s05_asistencia: { tok: P, ir: `#/aula/${aula}/asistencia` }, s06_notas: { tok: P, ir: `#/aula/${aula}/notas` }, s07_alumnos: { tok: P, ir: `#/aula/${aula}/alumnos` },
    s08_libreta: { tok: P, ir: `#/libreta/${riesgo.id}` }, s09_tareas: { tok: P, ir: `#/aula/${aula}/tareas` }, s10_asistente: { tok: P, ir: '#/asistente' },
    s11_mama: { tok: M, ir: '#/novedades', vp: { width: 390, height: 780 }, dsf: 2.5, movil: true },
  };
  // acciones: se disparan cuando empieza la frase que contiene la palabra clave
  const ACC = {
    s01_login: [[/escribimos/i, async ({ p, ir }) => { await ir('[data-entrar]'); await espera(700); const em = await p.waitForSelector('input[type=email], input[name=email]'); await ir(em); await p.keyboard.type(R.docente.email, { delay: 40 }); await ir(await p.$('input[type=password]')); await p.keyboard.type(R.docente.clave, { delay: 50 }); await espera(300); await p.keyboard.press('Enter'); }]],
    s02_inicio: [[/justificación de una falta/i, async ({ p, ir }) => { await espera(2500); const ac = await p.$('button:has-text("Aceptar")'); if (ac) await ir(ac); }], [/responder mensajes/i, async ({ ir }) => { await ir('textarea, input[placeholder*="respuesta"]', false); }], [/más abajo/i, async ({ bajar }) => bajar(700, 50, 60)]],
    s03_porteria: [[/contador/i, async ({ ir }) => ir('#pCont', false)], [/Escaneamos el fotocheck de/, async ({ p, ir, bajar }) => { await ir('#pMan input'); await p.keyboard.type(codigo, { delay: 50 }); await espera(300); await p.keyboard.press('Enter'); await espera(600); await bajar(300, 15, 30); }],
      [/hora de salida/i, async ({ p, ir }) => { await p.evaluate(() => scrollTo(0, 0)); await espera(300); await ir('[data-modo="salida"]'); }], [/Fácil, rápido/i, async ({ ir }) => ir('[data-modo="entrada"]')]],
    s04_fotochecks: [[/Cada fotocheck incluye/i, async ({ bajar }) => bajar(420, 40, 50)], [/tomarlas directamente/i, async ({ ir }) => ir('.fck-f', false)], [/otro sistema/i, async ({ p }) => p.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))]],
    s05_asistencia: [[/Fíjense/i, async ({ ir, bajar }) => { await ir('#tab .lista small', false); await espera(2500); await bajar(350, 40, 60); }]],
    s06_notas: [[/promedio se calcula/i, async ({ ir }) => ir('table tr:nth-child(3) td:last-child', false)], [/cambiar de curso/i, async ({ ir }) => ir('#tab select', false)], [/Comunicación/i, async ({ p }) => { await p.selectOption('#tab select', { index: 1 }); }]],
    s07_alumnos: [[/alerta temprana nos ayuda/i, async ({ ir }) => ir('.chip.alto', false)], [/abrir la ficha/i, async ({ ir }) => ir(`a[href="#/alumno/${riesgo.id}"]`)], [/motivos/i, async ({ ir, bajar }) => { await ir('.alerta', false); await espera(3500); await bajar(380, 40, 60); }]],
    s08_libreta: [[/listo para imprimir/i, async ({ bajar }) => bajar(450, 40, 60)], [/Así evitamos/i, async ({ bajar }) => bajar(300, 30, 60)]],
    s09_tareas: [[/familias también/i, async ({ ir }) => ir('#tab .card', false)], [/En la bitácora/i, async ({ ir }) => ir('a[href$="/bitacora"], button:has-text("Bitácora")')], [/sección de comunicados/i, async ({ ir }) => ir('a[href$="/comunicados"], button:has-text("Comunicados")')], [/cuántas personas/i, async ({ bajar }) => bajar(650, 50, 60)]],
    s10_asistente: [[/En cuestión de segundos/i, async ({ bajar }) => bajar(450, 40, 60)], [/privacidad/i, async ({ bajar }) => bajar(500, 40, 60)]],
    s11_mama: [[/llegada al colegio/i, async ({ bajar, p }) => { await bajar(250, 25, 50); await espera(2500); await p.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' })); }], [/asistencia día por día/i, async ({ ir }) => ir('a[href^="#/asistencia"]')], [/justificación/i, async ({ p, ir }) => { const j = await p.$('[data-jf2]'); if (j) await ir(j, false); }], [/solamente puede visualizar/i, async ({ p }) => p.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))]],
  };
  for (const E of PLAN.escenas) {
    if (process.env.SOLO && !process.env.SOLO.split(',').includes(E.k)) continue;
    const o = CONF[E.k], ctx = await b.newContext({ timezoneId: 'America/Lima', viewport: o.vp || { width: 1280, height: 720 }, deviceScaleFactor: o.dsf || 1.5, isMobile: !!o.movil, hasTouch: !!o.movil });
    if (o.tok) await ctx.addInitScript(t => localStorage.setItem('libretin', t), o.tok);
    await ctx.addInitScript(CURSOR); await ctx.addInitScript(off => { const RD = Date; class D extends RD { constructor(...a) { if (!a.length) super(RD.now() + off); else super(...a); } static now() { return RD.now() + off; } } window.Date = D; }, OFF);
    const p = await ctx.newPage(); await p.goto(B + '/' + o.ir); await espera(2200); await p.mouse.move(640, 380);
    const dir = path.join(OUT, 'v_' + E.k); fs.mkdirSync(dir, { recursive: true }); const frames = []; let t0 = 0, n = 0;
    const cdp = await ctx.newCDPSession(p); cdp.on('Page.screencastFrame', f => { const ts = f.metadata.timestamp; if (!t0) t0 = ts; const nm = `f${String(n++).padStart(5, '0')}.jpg`; fs.writeFileSync(path.join(dir, nm), Buffer.from(f.data, 'base64')); frames.push([nm, +(ts - t0).toFixed(3)]); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
    const ir = async (sel, click = true) => { try { const el = typeof sel === 'string' ? await p.waitForSelector(sel, { timeout: 6000 }) : sel; await el.scrollIntoViewIfNeeded(); const bb = await el.boundingBox(); await p.mouse.move(bb.x + Math.min(bb.width / 2, 60), bb.y + bb.height / 2, { steps: 25 }); await espera(250); if (click) await p.mouse.click(bb.x + Math.min(bb.width / 2, 60), bb.y + bb.height / 2); } catch (e) { console.log('  (sin', sel, ')'); } };
    const bajar = async (px, pasos = 30, ms = 40) => { for (let i = 0; i < pasos; i++) { await p.mouse.wheel(0, px / pasos); await espera(ms); } };
    while (!t0) await espera(30); const inicio = Date.now() / 1000 - t0; // las frases se miden desde el primer cuadro
    for (const L of E.lineas) {
      await espera((L.t + inicio - (Date.now() / 1000 - t0)) * 1000);
      const a = (ACC[E.k] || []).find(([re]) => re.test(L.txt)); if (a) a[1]({ p, ir, bajar }).catch(e => console.log('  acción', e.message.slice(0, 80)));
    }
    await espera((E.dur + inicio - (Date.now() / 1000 - t0)) * 1000 + 300);
    await cdp.send('Page.stopScreencast'); await espera(150);
    fs.writeFileSync(path.join(OUT, 'v_' + E.k + '.json'), JSON.stringify({ frames, inicio, dur: E.dur })); console.log(E.k, frames.length, 'dur', E.dur.toFixed(1)); await ctx.close();
  }
  await b.close();
})();
