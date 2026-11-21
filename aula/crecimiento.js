// 🚀 Motor de crecimiento de ProfeTok: contactos (mini CRM), recursos gratis, secuencias automáticas por correo,
// notificaciones push y WhatsApp, reactivación con cupón real, referidos, testimonios, embudo por fuente y privacidad.
// Reglas (Ley 29733): solo docentes y directores que dejaron sus datos por su cuenta. Los datos de padres y alumnos
// NUNCA se usan para marketing. Publicidad solo con casilla marcada por la persona; baja con un clic en cada mensaje.
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const push = require('./push'), R = require('./recursos');
const DIA = 864e5;

function crear({ db, q, q1, run, getS, setS, limpio, correo, PLANES, membresia, DATA, ARCH, nuevoCupon, E }) {
  db.exec(`
  create table if not exists contactos (id integer primary key, email text unique, nombre text, whatsapp text, nivel text, region text, fuente text default 'directo', utm text, recurso text, ok_correo integer default 0, ok_wa integer default 0, confirmado integer default 0, baja integer default 0, token text unique, usuario_id integer, puntos integer default 0, notas text, creado text default (datetime('now')), actualizado text default (datetime('now')));
  create table if not exists eventos (id integer primary key, contacto_id integer, tipo text, detalle text, fecha text default (datetime('now')));
  create table if not exists auto_envios (contacto_id integer, clave text, canal text, estado text, detalle text, fecha text default (datetime('now')), primary key (contacto_id, clave, canal));
  create table if not exists push_subs (id integer primary key, endpoint text unique, p256dh text, auth text, contacto_id integer, usuario_id integer, creado text default (datetime('now')));
  create table if not exists testimonios (id integer primary key, nombre text, cargo text, texto text, permiso integer default 0, visible integer default 1, creado text default (datetime('now')));
  create table if not exists recursos (slug text primary key, emoji text, titulo text, descripcion text, tipo text default 'interno', contenido text, archivo text, activo integer default 1, descargas integer default 0, orden integer default 0, creado text default (datetime('now')));
  create table if not exists visitas (dia text, fuente text, n integer default 0, primary key (dia, fuente));
  create index if not exists co_us on contactos(usuario_id); create index if not exists ev_co on eventos(contacto_id); create index if not exists ae_est on auto_envios(estado, canal); create index if not exists ps_co on push_subs(contacto_id); create index if not exists ps_us on push_subs(usuario_id);`);
  for (const [t, c] of [['usuarios', 'ref text'], ['colegios', 'referido_por integer'], ['colegios', 'ref_bono integer default 0']]) try { db.exec(`alter table ${t} add column ${c}`); } catch (e) {}
  R.BASE.forEach((r, i) => run('insert or ignore into recursos(slug, emoji, titulo, descripcion, tipo, orden) values(?,?,?,?,?,?)', r.slug, r.emoji, r.titulo, r.descripcion, 'interno', i));

  const VAPID = push.clavesVapid(getS, setS);
  const base = () => getS('urlPublica', '') || '';
  const tok = () => crypto.randomBytes(18).toString('base64url');
  const evento = (cid, tipo, detalle = '', pts = 0) => { if (!cid) return; run('insert into eventos(contacto_id, tipo, detalle) values(?,?,?)', cid, tipo, String(detalle).slice(0, 200)); run("update contactos set puntos=puntos+?, actualizado=datetime('now') where id=?", pts, cid); };
  const fuenteOk = f => /^[a-z0-9_.-]{1,30}$/i.test(String(f || '')) ? String(f).toLowerCase() : 'directo';
  const waNum = t => { let d = String(t || '').replace(/\D/g, ''); if (/^9\d{8}$/.test(d)) d = '51' + d; return d.length >= 10 && d.length <= 15 ? d : ''; };
  const nombre1 = n => (String(n || '').trim().split(/\s+/)[0] || 'profe');

  // contacto por correo (crea o actualiza)
  function contacto({ email, nombre, whatsapp, nivel, region, fuente, utm, recurso, okCorreo, okWa, usuarioId }) {
    email = String(email || '').toLowerCase().trim(); let c = q1('select * from contactos where email=?', email);
    if (!c) { const id = run('insert into contactos(email, nombre, whatsapp, nivel, region, fuente, utm, recurso, ok_correo, ok_wa, token, usuario_id) values(?,?,?,?,?,?,?,?,?,?,?,?)', email, limpio(nombre, 80), waNum(whatsapp), limpio(nivel, 20), limpio(region, 40), fuenteOk(fuente), limpio(utm, 200), recurso || null, okCorreo ? 1 : 0, okWa ? 1 : 0, tok(), usuarioId || null).lastInsertRowid; return q1('select * from contactos where id=?', id); }
    run(`update contactos set nombre=coalesce(nullif(?,''), nombre), whatsapp=coalesce(nullif(?,''), whatsapp), nivel=coalesce(nullif(?,''), nivel), recurso=coalesce(?, recurso), ok_correo=max(ok_correo, ?), ok_wa=max(ok_wa, ?), baja=case when ?=1 then 0 else baja end, usuario_id=coalesce(?, usuario_id), actualizado=datetime('now') where id=?`,
      limpio(nombre, 80), waNum(whatsapp), limpio(nivel, 20), recurso || null, okCorreo ? 1 : 0, okWa ? 1 : 0, okCorreo ? 1 : 0, usuarioId || null, c.id);
    return q1('select * from contactos where id=?', c.id);
  }
  // todos los docentes y directores ya registrados entran al CRM (sin permiso de publicidad hasta que lo den)
  for (const u of q("select u.* from usuarios u where u.rol in ('docente','director') and not exists (select 1 from contactos c where c.usuario_id=u.id or c.email=u.email)")) contacto({ email: u.email, nombre: u.nombre, whatsapp: u.telefono, usuarioId: u.id, fuente: 'registro' });

  // ---------- envíos por canal ----------
  async function porCorreo(c, { asunto, texto, boton, url }) {
    if (!correo.listo() || !base()) throw new Error('correo sin configurar');
    const baja = `${base()}/baja?c=${c.token}`, n = nombre1(c.nombre);
    const { html, texto: txt } = correo.plantilla({ colegio: 'ProfeTok', color: '#0284c7', tipo: 'campana', titulo: asunto, saludo: `Hola ${n} 👋`, cuerpo: texto, boton, enlace: url, pie: 'Libretín y el equipo de ProfeTok 💙', baja });
    await correo.enviar({ para: c.email, paraNombre: c.nombre, asunto, html, texto: txt, deNombre: correo.nombre(), baja });
  }
  async function porPush(c, { titulo, texto, url }) {
    const subs = q('select * from push_subs where contacto_id=? or (usuario_id is not null and usuario_id=?)', c.id, c.usuario_id || -1); let n = 0;
    for (const s of subs) { try { if (await push.enviar(VAPID, s, { title: titulo, body: texto, url, icon: '/icono-192.png' }, 'mailto:' + (correo.remitente() || 'soporte@profetok.com')) === 'borrar') run('delete from push_subs where id=?', s.id); else n++; } catch (e) { console.log('[ProfeTok] ' + e.message); } }
    if (!n) throw new Error('sin suscripción push'); return n;
  }
  const waConf = () => getS('wa', {});
  async function porWhatsApp(c, plantilla, params) { // API oficial de WhatsApp Cloud (Meta), solo con plantillas aprobadas
    const w = waConf(), r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(w.phoneId)}/messages`, { method: 'POST', signal: AbortSignal.timeout(20000), headers: { authorization: 'Bearer ' + w.token, 'content-type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: c.whatsapp, type: 'template', template: { name: plantilla, language: { code: w.idioma || 'es' }, components: [{ type: 'body', parameters: params.map(t => ({ type: 'text', text: String(t).slice(0, 200) })) }] } }) });
    if (!r.ok) throw new Error('WhatsApp ' + r.status + ': ' + (await r.text()).slice(0, 160));
  }

  // ---------- secuencias automáticas (el dueño puede editar textos y apagar pasos) ----------
  const PASOS = [
    { id: 'L1', grupo: 'lead', desde: 'creado', dias: 2, mk: 1, nombre: 'Lead · día 2: beneficios', canales: ['correo', 'push', 'wa'], ir: 'registro',
      asunto: '{nombre}, 3 cosas que ya no tienes que hacer a mano', boton: 'Probar ProfeTok gratis',
      texto: 'Espero que el recurso te esté sirviendo 📋.\n\nTe cuento qué hacen los docentes que usan ProfeTok:\n\n✅ Marcan la asistencia con un toque (1 minuto).\n📊 Los promedios AD, A, B, C se calculan solos.\n👨‍👩‍👧 Cada familia ve el avance de su hijo en su celular, sin que tú mandes 30 mensajes.\n\nPuedes probarlo 15 días gratis, sin tarjeta.',
      wa: 'Hola {nombre} 👋, soy Libretín de ProfeTok. ¿Te sirvió el recurso? Si quieres dejar de llenar registros a mano, prueba ProfeTok 15 días gratis: {enlace}' },
    { id: 'L2', grupo: 'lead', desde: 'creado', dias: 5, mk: 1, nombre: 'Lead · día 5: testimonio', canales: ['correo', 'push'], ir: 'registro',
      asunto: '«Ahora termino mis registros antes de salir del colegio»', boton: 'Quiero probarlo',
      texto: 'Muchos docentes nos cuentan lo mismo: el trabajo administrativo les quitaba las noches.\n\n{testimonio}\n\nCon ProfeTok y Libretín, tu asistente con IA, armas una sesión o un examen en segundos y la libreta se imprime sola con el logo de tu colegio.\n\n¿Lo pruebas esta semana? Son 15 días gratis.' },
    { id: 'L3', grupo: 'lead', desde: 'creado', dias: 9, mk: 1, nombre: 'Lead · día 9: último empujón', canales: ['correo', 'wa'], ir: 'registro',
      asunto: '{nombre}, ¿te ayudo a ordenar tu aula en 10 minutos?', boton: 'Empezar gratis',
      texto: 'Te propongo algo sencillo: crea tu aula, pega la lista de tus estudiantes y marca la asistencia de mañana. Son 10 minutos.\n\nSi te gusta, sigues. Si no, no pagas nada.\n\nY si tienes dudas, responde este correo: lo leemos personas reales 💙.',
      wa: 'Hola {nombre} 👋. ¿Te ayudo a crear tu aula en ProfeTok? Son 10 minutos y la prueba es gratis: {enlace}' },
    { id: 'P1', grupo: 'prueba', desde: 'registro', dias: 1, mk: 0, nombre: 'Prueba · día 1: primeros pasos', canales: ['correo'], ir: 'inicio',
      asunto: '🎒 Tus primeros pasos en ProfeTok', boton: 'Abrir ProfeTok',
      texto: '¡Bienvenido(a) a ProfeTok! Para sacarle el jugo esta semana:\n\n1️⃣ Crea tu aula y pega la lista de estudiantes.\n2️⃣ Marca la asistencia de hoy (1 minuto).\n3️⃣ Invita a una familia por WhatsApp para que vea el avance de su hijo.\n4️⃣ Pídele a Libretín, tu asistente, una sesión de aprendizaje.\n\nTu prueba gratis dura {dias} días más.' },
    { id: 'P2', grupo: 'prueba', desde: 'vence', dias: -3, mk: 0, nombre: 'Prueba · faltan 3 días', canales: ['correo', 'push', 'wa'], ir: 'plan',
      asunto: '⏳ Tu prueba de ProfeTok termina en 3 días', boton: 'Ver planes',
      texto: 'Tu prueba gratis termina en 3 días. Tus datos están seguros y no se borran.\n\nPara seguir registrando asistencia, notas y comunicándote con las familias, elige tu plan. Pagando varios meses ahorras hasta 25 %.\n\n{testimonio}',
      wa: 'Hola {nombre} 👋. Tu prueba de ProfeTok termina en 3 días. Tus datos están a salvo. Si quieres seguir, aquí están los planes: {enlace}' },
    { id: 'P3', grupo: 'prueba', desde: 'vence', dias: -1, mk: 0, nombre: 'Prueba · último día', canales: ['correo', 'push'], ir: 'plan',
      asunto: 'Mañana termina tu prueba gratis', boton: 'Elegir mi plan',
      texto: 'Mañana termina tu prueba de ProfeTok. Puedes pagar con tarjeta, Yape o Plin y tu plan se activa al momento.\n\nSi necesitas más tiempo para decidir, responde este correo y te ayudamos.' },
    { id: 'R1', grupo: 'vencido', desde: 'vence', dias: 1, mk: 1, nombre: 'Reactivación 1: testimonios', canales: ['correo', 'wa'], ir: 'plan',
      asunto: '{nombre}, tu aula te espera (tus datos siguen ahí)', boton: 'Volver a ProfeTok',
      texto: 'Tu membresía terminó, pero no borramos nada: tus estudiantes, notas y asistencias te esperan.\n\n{testimonio}\n\nCuando quieras volver, todo estará tal como lo dejaste.',
      wa: 'Hola {nombre} 👋. Tus datos en ProfeTok siguen guardados. Cuando quieras volver, todo está tal cual: {enlace}' },
    { id: 'R2', grupo: 'vencido', desde: 'vence', dias: 3, mk: 1, cupon: true, nombre: 'Reactivación 2: cupón 72 h', canales: ['correo', 'wa', 'push'], ir: 'plan',
      asunto: '🎁 {pct} % de descuento para ti (vale 72 horas)', boton: 'Usar mi descuento',
      texto: 'Queremos que sigas con nosotros. Usa este código y obtén {pct} % de descuento en tu plan:\n\n🎟️ {cupon}\n\nEs personal y vale hasta el {vence_cupon}. Se aplica al pagar con tarjeta, Yape o Plin.',
      wa: 'Hola {nombre} 🎁. Te regalamos {pct} % de descuento para volver a ProfeTok con el código {cupon} (vale 72 horas): {enlace}' },
    { id: 'R3', grupo: 'vencido', desde: 'vence', dias: 5.5, mk: 1, nombre: 'Reactivación 3: último aviso', canales: ['correo', 'wa', 'push'], ir: 'plan',
      asunto: 'Último día de tu descuento', boton: 'Activar con descuento',
      texto: 'Hoy es el último día para usar tu código {cupon} con {pct} % de descuento.\n\nDespués de hoy no te volveremos a escribir sobre esto. Gracias por haber probado ProfeTok 💙.',
      wa: 'Hola {nombre}. Hoy vence tu código {cupon} de {pct} % en ProfeTok. ¡Te esperamos! {enlace}' },
    { id: 'C1', grupo: 'cliente', desde: 'vence', dias: -5, mk: 0, nombre: 'Cliente · renovar en 5 días', canales: ['correo', 'push'], ir: 'plan',
      asunto: 'Tu plan de ProfeTok se renueva en 5 días', boton: 'Renovar',
      texto: 'Tu plan vence en 5 días. Renueva con un clic para que tus familias sigan recibiendo la información sin pausa.\n\n¡Gracias por confiar en ProfeTok! 💙' },
    { id: 'A1', grupo: 'abandono', desde: 'pago', dias: 0.1, mk: 0, nombre: 'Pago no terminado', canales: ['correo', 'wa'], ir: 'plan',
      asunto: '¿Tuviste algún problema al pagar?', boton: 'Intentar de nuevo',
      texto: 'Vimos que empezaste a pagar tu plan pero no se completó. A veces el banco rechaza la tarjeta por seguridad.\n\nPuedes intentarlo otra vez o pagar con Yape o Plin. Si algo falla, responde este correo y te ayudamos al momento.',
      wa: 'Hola {nombre} 👋. Vimos que tu pago en ProfeTok no se completó. ¿Te ayudamos? También puedes pagar con Yape o Plin: {enlace}' },
  ];
  const pasos = () => { const o = getS('pasos', {}); return PASOS.map(p => ({ ...p, ...(o[p.id] || {}), on: o[p.id]?.on !== false })); };
  const testimonio = () => { const t = q1('select * from testimonios where visible=1 and permiso=1 order by random() limit 1'); return t ? `💬 «${t.texto}»\n— ${t.nombre}${t.cargo ? ', ' + t.cargo : ''}` : ''; };
  const llenar = (s, v) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => v[k] ?? '').replace(/\n{3,}/g, '\n\n').trim();

  // estado de cada contacto para decidir qué secuencia le toca
  function fichas() {
    return q(`select c.*, u.creado u_creado, u.no_correo, u.activo, col.plan, col.vence, col.id colegio_id,
      (select count(*) from pagos p where p.colegio_id=col.id and p.estado='aprobado') pagados,
      (select max(id) from pagos p where p.colegio_id=col.id and p.metodo='mercadopago' and p.estado='pendiente' and p.creado<=datetime('now','-2 hours') and p.creado>datetime('now','-2 days') and not exists (select 1 from pagos p2 where p2.colegio_id=col.id and p2.estado='aprobado' and p2.id>p.id)) pago_pend
      from contactos c left join usuarios u on u.id=c.usuario_id left join colegios col on col.id=u.colegio_id
      where c.baja=0 and (c.creado>datetime('now','-12 days') or u.creado>datetime('now','-3 days') or (col.vence between datetime('now','-8 days') and datetime('now','+7 days')) or exists (select 1 from pagos p where p.colegio_id=col.id and p.estado='pendiente' and p.creado>datetime('now','-2 days')))`);
  }
  const gruposDe = f => { // en qué secuencias está hoy cada contacto (si paga, sale solo de la reactivación)
    if (!f.usuario_id) return f.confirmado ? ['lead'] : []; if (f.activo === 0) return [];
    const v = f.vence ? new Date(f.vence).getTime() : 0, g = [v <= Date.now() ? 'vencido' : f.plan === 'prueba' ? 'prueba' : 'cliente'];
    if (f.pago_pend) g.push('abandono'); return g;
  };
  let trabajando = false;
  async function tick() {
    if (trabajando || !base()) return; // sin dirección pública no hay enlaces que mandar
    trabajando = true; let hechos = 0;
    try {
      const P = pasos().filter(p => p.on), w = waConf(), waApi = !!(w.token && w.phoneId), waHora = q1("select count(*) n from auto_envios where canal='wa' and estado='enviado' and fecha>datetime('now','-1 hour')").n;
      let waCupo = Math.max(0, (+w.porHora || 60) - waHora);
      for (const f of fichas()) {
        const G = gruposDe(f); if (!G.length) continue;
        for (const p of P.filter(p => G.includes(p.grupo))) {
          const t0 = p.desde === 'creado' ? f.creado : p.desde === 'registro' ? f.u_creado : p.desde === 'pago' ? q1('select creado from pagos where id=?', f.pago_pend)?.creado : f.vence; if (!t0) continue;
          const t = new Date(t0.length === 19 ? t0.replace(' ', 'T') + 'Z' : t0).getTime() + p.dias * DIA; if (Date.now() < t || Date.now() > t + 2 * DIA) continue;
          const clave = p.id + ':' + (p.desde === 'pago' ? f.pago_pend : String(t0).slice(0, 10));
          const hechosYa = new Set(q('select canal from auto_envios where contacto_id=? and clave=?', f.id, clave).map(x => x.canal));
          const ok = { correo: !hechosYa.has('correo') && correo.listo() && !f.no_correo && (!p.mk || f.ok_correo), push: !hechosYa.has('push') && !!q1('select 1 from push_subs where contacto_id=? or (usuario_id is not null and usuario_id=?)', f.id, f.usuario_id || -1), wa: !hechosYa.has('wa') && p.wa && f.whatsapp && f.ok_wa };
          const canales = p.canales.filter(c => ok[c]); if (!canales.length) continue;
          // variables del mensaje
          const v = { nombre: nombre1(f.nombre), dias: f.vence ? Math.max(0, Math.ceil((new Date(f.vence) - Date.now()) / DIA)) : '', testimonio: testimonio(), enlace: '' };
          if (p.cupon || /\{cupon\}/.test(p.texto + p.asunto)) { // cupón personal real (el mismo en los 3 mensajes de reactivación)
            const prev = q1("select detalle from auto_envios where contacto_id=? and clave like 'R2:%' and detalle like 'CUP:%' order by fecha desc", f.id);
            let cod = prev?.detalle.split(':')[1], cu = cod && q1('select * from cupones where codigo=?', cod);
            if (!cu && p.cupon) { cod = nuevoCupon({ pct: +getS('cuponReactivar', 30) || 30, horas: 72, usos: 1, contactoId: f.id, nota: 'Reactivación automática', prefijo: 'VUELVE' }); cu = q1('select * from cupones where codigo=?', cod); }
            if (!cu || new Date(cu.vence) < new Date() || (cu.usos_max && cu.usos >= cu.usos_max)) continue; // sin cupón vigente no se manda el aviso del cupón
            Object.assign(v, { cupon: cu.codigo, pct: cu.pct, vence_cupon: new Date(cu.vence).toLocaleString('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) });
          }
          v.enlace = `${base()}/${p.ir === 'registro' ? `?utm_source=auto&e=${encodeURIComponent(f.email)}#/registro` : '#/' + p.ir}${v.cupon ? (p.ir === 'registro' ? '' : '?cupon=' + v.cupon) : ''}`;
          const m = { asunto: llenar(p.asunto, v), texto: llenar(p.texto, v), boton: p.boton, url: v.enlace };
          for (const canal of canales) {
            let estado = 'enviado', det = v.cupon ? 'CUP:' + v.cupon : '';
            try {
              if (canal === 'correo') await porCorreo(f, m);
              else if (canal === 'push') await porPush(f, { titulo: m.asunto, texto: llenar(p.texto, v).split('\n')[0].slice(0, 140), url: v.enlace });
              else if (canal === 'wa') { const tpl = (w.plantillas || {})[p.id]; if (waApi && tpl) { if (waCupo <= 0) continue; await porWhatsApp(f, tpl, [v.nombre, v.cupon || v.dias || v.enlace]); waCupo--; } else { estado = 'manual'; det = llenar(p.wa, v); } }
            } catch (e) { estado = 'fallido'; det = String(e.message).slice(0, 200); }
            run('insert or replace into auto_envios(contacto_id, clave, canal, estado, detalle) values(?,?,?,?,?)', f.id, clave, canal, estado, det);
            if (estado === 'enviado') evento(f.id, 'auto', p.id + ' por ' + canal);
            if (++hechos >= 150) return; // de a poco: el resto en la siguiente vuelta (cada 5 minutos)
          }
        }
      }
    } catch (e) { console.log('[ProfeTok] Automatización: ' + e.message); } finally { trabajando = false; }
  }
  setTimeout(() => tick(), 40000).unref(); setInterval(() => tick(), 5 * 60000).unref();

  // ---------- ganchos que usa el servidor ----------
  function alRegistrar({ uid, cid, b, email, nombre }) {
    const c = contacto({ email, nombre, whatsapp: b.telefono, usuarioId: uid, okCorreo: !!b.novedades, okWa: !!b.novedadesWa, fuente: b.fuente || 'directo', utm: b.utm });
    evento(c.id, 'registro', 'prueba gratis', 20);
    const ref = String(b.ref || '').trim(), padrino = ref && q1('select * from usuarios where ref=?', ref);
    if (padrino && padrino.colegio_id && padrino.colegio_id !== cid) { // invitado por un colega: +7 días de prueba
      const col = q1('select * from colegios where id=?', cid); run('update colegios set referido_por=?, vence=? where id=?', padrino.colegio_id, new Date(new Date(col.vence).getTime() + 7 * DIA).toISOString(), cid); evento(c.id, 'referido', 'invitado por ' + padrino.email);
    }
  }
  async function alPagar(p) { // recibo + premio al colega que lo invitó (1 mes gratis, una sola vez por invitado)
    const col = q1('select * from colegios where id=?', p.colegio_id), u = q1("select * from usuarios where colegio_id=? and rol in ('director','docente') order by id limit 1", p.colegio_id);
    const c = u && q1('select * from contactos where usuario_id=? or email=?', u.id, u.email);
    if (c) { evento(c.id, 'pago', `${p.plan} S/ ${p.monto}`, 50); porCorreo(c, { asunto: '✅ ¡Gracias! Tu plan de ProfeTok está activo', texto: `Recibimos tu pago de S/ ${p.monto} (${PLANES[p.plan]?.nombre || p.plan}).\n\nTu plan está activo hasta el ${new Date(col.vence).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}.\n\n¿Sabías que puedes ganar meses gratis? Invita a un colega desde «Plan»: cuando se suscriba, te regalamos 1 mes.`, boton: 'Abrir ProfeTok', url: base() + '/#/inicio' }).catch(() => {}); porPush(c, { titulo: '✅ Plan activo', texto: 'Gracias por tu pago. ¡A seguir!', url: base() + '/#/inicio' }).catch(() => {}); }
    if (col.referido_por && !col.ref_bono) {
      const pad = q1('select * from colegios where id=?', col.referido_por); run('update colegios set ref_bono=1 where id=?', col.id); if (!pad) return;
      run('update colegios set vence=? where id=?', new Date(Math.max(Date.now(), pad.vence ? new Date(pad.vence).getTime() : 0) + 30 * DIA).toISOString(), pad.id);
      const pu = q1("select * from usuarios where colegio_id=? and rol in ('director','docente') order by id limit 1", pad.id), pc = pu && q1('select * from contactos where usuario_id=?', pu.id);
      if (pc) { evento(pc.id, 'premio', '+30 días por referido', 10); porCorreo(pc, { asunto: '🎁 ¡Ganaste 1 mes gratis en ProfeTok!', texto: `Un colega que invitaste se suscribió a ProfeTok. Como agradecimiento, sumamos 30 días a tu plan.\n\n¡Gracias por recomendarnos! Cada colega que se suscriba te da otro mes.`, boton: 'Ver mi plan', url: base() + '/#/plan' }).catch(() => {}); }
    }
  }

  // aviso push a un usuario (por ejemplo, a una familia)
  async function pushUsuario(uid, payload) { let n = 0; for (const s of q('select * from push_subs where usuario_id=?', uid)) { try { (await push.enviar(VAPID, s, payload, 'mailto:' + (correo.remitente() || 'soporte@profetok.com'))) === 'borrar' ? run('delete from push_subs where id=?', s.id) : n++; } catch (e) {} } return n; }
  // aviso al dueño (correo + 🔔) cuando entra un pago por revisar
  async function avisarDueno(titulo, texto, ruta = '/') {
    const D = q("select * from usuarios where rol='dueno' and activo=1"), url = (base() || '') + ruta;
    for (const d of D) {
      if (correo.listo() && base()) { const { html, texto: t } = correo.plantilla({ colegio: 'ProfeTok · Administración', color: '#0f172a', tipo: 'otro', titulo, cuerpo: texto, boton: 'Abrir el panel', enlace: url }); await correo.enviar({ para: d.email, asunto: titulo, html, texto: t, deNombre: 'ProfeTok' }).catch(e => console.log('[ProfeTok] Aviso al dueño: ' + e.message)); }
      for (const s of q('select * from push_subs where usuario_id=?', d.id)) await push.enviar(VAPID, s, { title: titulo, body: texto.split('\n')[0], url, icon: '/icono-192.png' }, 'mailto:' + (correo.remitente() || 'soporte@profetok.com')).then(r => r === 'borrar' && run('delete from push_subs where id=?', s.id)).catch(() => {});
    }
  }

  // ---------- API ----------
  const API = {}, LIBRES = ['POST /api/lead', 'GET /api/publico', 'POST /api/v', 'POST /api/push-sub'];
  const LIM = new Map(), limite = (k, max, ms) => { const t = Date.now(), r = LIM.get(k) || { n: 0, t }; if (t - r.t > ms) { r.n = 0; r.t = t; } r.n++; LIM.set(k, r); if (LIM.size > 5e4) LIM.clear(); return r.n > max; };
  API['GET /api/publico'] = async () => ({ recursos: q('select slug, emoji, titulo, descripcion from recursos where activo=1 order by orden, creado'), testimonios: q('select nombre, cargo, texto from testimonios where visible=1 and permiso=1 order by id desc limit 6'), vapid: VAPID.publica });
  API['POST /api/v'] = async ({ b, ip }) => { if (!limite(ip + 'v', 30, 60000)) run('insert into visitas(dia, fuente, n) values(?,?,1) on conflict(dia, fuente) do update set n=n+1', new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10), fuenteOk(b.f)); return { ok: 1 }; };
  API['POST /api/lead'] = async ({ b, ip }) => {
    if (limite(ip + 'lead', 12, 3600e3)) throw 429;
    const email = String(b.email || '').toLowerCase().trim(); if (!/^[^\s@]{1,64}@[^\s@]{1,120}\.[a-z]{2,}$/i.test(email)) throw 'Escribe un correo válido';
    if (limpio(b.nombre, 80).length < 2) throw 'Escribe tu nombre'; if (!b.acepto) throw 'Debes aceptar la política de privacidad';
    const r = q1('select * from recursos where slug=? and activo=1', String(b.recurso || '')) || q1('select * from recursos where activo=1 order by orden limit 1');
    const c = contacto({ email, nombre: b.nombre, whatsapp: b.whatsapp, nivel: b.nivel, region: b.region, fuente: b.fuente, utm: b.utm, recurso: r?.slug, okCorreo: !!b.novedades, okWa: !!b.novedadesWa });
    if (c.baja && !b.novedades) run('update contactos set baja=0 where id=?', c.id); // pidió un recurso de nuevo: vuelve a recibir lo que pidió
    evento(c.id, 'pidio', r?.slug, 5);
    const url = `/r/${r.slug}?c=${c.token}`;
    if (correo.listo() && base()) porCorreo(c, { asunto: `📥 Tu recurso: ${r.titulo}`, texto: `¡Gracias por descargar «${r.titulo}»! Aquí lo tienes, listo para imprimir o guardar en PDF.\n\nCon este enlace también confirmas tu correo.`, boton: 'Abrir mi recurso', url: `${base()}${url}&e=1` }).catch(e => console.log('[ProfeTok] Recurso: ' + e.message));
    return { url, token: c.token };
  };
  API['POST /api/push-sub'] = async ({ u, b, ip }) => {
    if (limite(ip + 'push', 20, 3600e3)) throw 429; const s = b.sub || {};
    if (!/^https:\/\/[^\s]{10,800}$/.test(s.endpoint || '') || !s.keys?.p256dh || !s.keys?.auth) throw 'Suscripción no válida';
    const c = b.c ? q1('select id from contactos where token=?', String(b.c)) : u ? q1('select id from contactos where usuario_id=?', u.id) : null;
    run('insert into push_subs(endpoint, p256dh, auth, contacto_id, usuario_id) values(?,?,?,?,?) on conflict(endpoint) do update set p256dh=excluded.p256dh, auth=excluded.auth, contacto_id=coalesce(excluded.contacto_id, contacto_id), usuario_id=coalesce(excluded.usuario_id, usuario_id)', s.endpoint, String(s.keys.p256dh).slice(0, 200), String(s.keys.auth).slice(0, 100), c?.id || null, u?.id || null);
    if (c) evento(c.id, 'push', 'activó avisos', 5); return { ok: 1 };
  };
  // docente: su enlace para invitar colegas
  API['GET /api/referidos'] = async ({ u }) => {
    if (!['docente', 'director'].includes(u.rol)) throw 403; let ref = u.ref;
    if (!ref) { ref = 'P' + u.id.toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(); run('update usuarios set ref=? where id=?', ref, u.id); }
    const inv = q1('select count(*) n, sum(ref_bono) pagaron from colegios where referido_por=?', u.colegio_id);
    return { enlace: (base() || '') + '/?ref=' + ref, invitados: inv.n || 0, pagaron: inv.pagaron || 0 };
  };

  // dueño: panel de crecimiento
  const soloDueno = u => { if (u.rol !== 'dueno') throw 403; };
  API['GET /api/crecer'] = async ({ u, url }) => {
    soloDueno(u); const dias = Math.min(365, +url.searchParams.get('dias') || 30), desde = `datetime('now','-${dias} days')`, buscar = '%' + (url.searchParams.get('q') || '') + '%';
    const visitas = q(`select fuente, sum(n) n from visitas where dia>=date('now','-${dias} days') group by fuente`);
    const leads = q(`select fuente, count(*) n, sum(confirmado) conf from contactos where creado>=${desde} and (usuario_id is null or recurso is not null) group by fuente`);
    const regs = q(`select coalesce(c.fuente,'directo') fuente, count(*) n from usuarios u left join contactos c on c.usuario_id=u.id where u.rol in ('docente','director') and u.creado>=${desde} group by 1`);
    const pagos = q(`select coalesce(c.fuente,'directo') fuente, count(*) n, sum(p.monto) monto from pagos p join colegios col on col.id=p.colegio_id left join usuarios u on u.colegio_id=col.id and u.rol in ('docente','director') left join contactos c on c.usuario_id=u.id where p.estado='aprobado' and p.creado>=${desde} group by 1`);
    const fuentes = {}; const sum = (l, k, cmp = 'n') => l.forEach(x => { (fuentes[x.fuente] ||= { fuente: x.fuente, visitas: 0, leads: 0, registros: 0, pagos: 0, monto: 0 })[k] += +x[cmp] || 0; });
    sum(visitas, 'visitas'); sum(leads, 'leads'); sum(regs, 'registros'); sum(pagos, 'pagos'); sum(pagos, 'monto', 'monto');
    const P = pasos(), stats = q("select substr(clave,1,instr(clave,':')-1) id, canal, estado, count(*) n from auto_envios group by 1,2,3").reduce((m, r) => { (m[r.id] ||= {})[r.canal + ' ' + r.estado] = r.n; return m; }, {});
    return {
      dias, fuentes: Object.values(fuentes).sort((a, b) => b.visitas + b.leads - a.visitas - a.leads),
      total: { contactos: q1('select count(*) n from contactos').n, conCorreo: q1('select count(*) n from contactos where ok_correo=1 and baja=0').n, conWa: q1("select count(*) n from contactos where ok_wa=1 and whatsapp<>'' and baja=0").n, push: q1('select count(*) n from push_subs').n, bajas: q1('select count(*) n from contactos where baja=1').n },
      contactos: q(`select c.id, c.email, c.nombre, c.whatsapp, c.nivel, c.fuente, c.recurso, c.ok_correo, c.ok_wa, c.confirmado, c.baja, c.puntos, c.creado, c.usuario_id, col.plan, col.vence from contactos c left join usuarios u on u.id=c.usuario_id left join colegios col on col.id=u.colegio_id where c.email like ? or c.nombre like ? order by c.id desc limit 200`, buscar, buscar),
      pasos: P.map(p => ({ id: p.id, nombre: p.nombre, on: p.on, canales: p.canales, asunto: p.asunto, texto: p.texto, wa: p.wa || '', boton: p.boton, mk: p.mk, stats: stats[p.id] || {} })),
      manual: q("select a.contacto_id, a.clave, a.detalle, a.fecha, c.nombre, c.whatsapp from auto_envios a join contactos c on c.id=a.contacto_id where a.canal='wa' and a.estado='manual' and c.baja=0 order by a.fecha limit 100"),
      testimonios: q('select * from testimonios order by id desc'), recursos: q('select slug, emoji, titulo, descripcion, tipo, activo, descargas from recursos order by orden, creado'),
      wa: { listo: !!(waConf().token && waConf().phoneId), phoneId: waConf().phoneId || '', idioma: waConf().idioma || 'es', porHora: waConf().porHora || 60, plantillas: waConf().plantillas || {}, tieneToken: !!waConf().token },
      legal: getS('legal', {}), cuponReactivar: getS('cuponReactivar', 30), base: base(),
      referidos: q1('select count(*) n, coalesce(sum(ref_bono),0) pagaron from colegios where referido_por is not null'), vista: (getS('vistaTok') || (() => { const t = tok(); setS('vistaTok', t); return t; })()),
    };
  };
  API['GET /api/crecer-csv'] = async ({ u }) => { soloDueno(u); const f = q('select email, nombre, whatsapp, nivel, fuente, recurso, ok_correo, ok_wa, confirmado, baja, puntos, creado from contactos order by id'); const e = v => /[",\n;]/.test(String(v ?? '')) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v ?? ''); return { csv: [Object.keys(f[0] || { email: 1 }).join(','), ...f.map(r => Object.values(r).map(e).join(','))].join('\n') }; };
  API['POST /api/crecer'] = async ({ u, b }) => {
    soloDueno(u); const a = b.accion;
    if (a === 'paso') { const o = getS('pasos', {}), p = PASOS.find(x => x.id === b.id); if (!p) throw 404; o[p.id] = { ...(o[p.id] || {}), ...(b.on !== undefined ? { on: !!b.on } : {}), ...(b.asunto ? { asunto: limpio(b.asunto, 140) } : {}), ...(b.texto ? { texto: String(b.texto).replace(/[<>]/g, '').slice(0, 3000) } : {}), ...(b.wa !== undefined && p.wa ? { wa: String(b.wa).replace(/[<>]/g, '').slice(0, 700) } : {}) }; if (b.restaurar) delete o[p.id]; setS('pasos', o); return { ok: 1 }; }
    if (a === 'wa-hecho') { run("update auto_envios set estado='enviado', fecha=datetime('now') where contacto_id=? and clave=? and canal='wa'", +b.contacto, String(b.clave)); evento(+b.contacto, 'auto', String(b.clave).split(':')[0] + ' por wa (manual)'); return { ok: 1 }; }
    if (a === 'wa-saltar') { run("update auto_envios set estado='omitido' where contacto_id=? and clave=? and canal='wa'", +b.contacto, String(b.clave)); return { ok: 1 }; }
    if (a === 'wa-config') { const w = waConf(); setS('wa', { token: b.token ? String(b.token).trim().slice(0, 400) : w.token, phoneId: limpio(b.phoneId, 40), idioma: limpio(b.idioma, 10) || 'es', porHora: Math.max(1, Math.min(1000, +b.porHora || 60)), plantillas: Object.fromEntries(PASOS.filter(p => p.wa).map(p => [p.id, limpio(b['tpl_' + p.id], 60)]).filter(x => x[1])) }); return { ok: 1 }; }
    if (a === 'cupon-auto') { setS('cuponReactivar', Math.max(5, Math.min(60, +b.pct || 30))); return { ok: 1 }; }
    if (a === 'testimonio') { if (!b.permiso) throw 'Marca que tienes el permiso de esa persona para publicar su testimonio'; if (limpio(b.texto, 400).length < 10) throw 'Escribe el testimonio'; run('insert into testimonios(nombre, cargo, texto, permiso) values(?,?,?,1)', limpio(b.nombre, 60), limpio(b.cargo, 80), limpio(b.texto, 400)); return { ok: 1 }; }
    if (a === 'testimonio-borrar') { run('delete from testimonios where id=?', +b.id); return { ok: 1 }; }
    if (a === 'testimonio-ver') { run('update testimonios set visible=1-visible where id=?', +b.id); return { ok: 1 }; }
    if (a === 'recurso-ver') { run('update recursos set activo=1-activo where slug=?', String(b.slug)); return { ok: 1 }; }
    if (a === 'recurso-borrar') { const r = q1("select * from recursos where slug=? and tipo<>'interno'", String(b.slug)); if (!r) throw 'Los recursos que vienen con ProfeTok no se borran: puedes ocultarlos'; if (r.archivo) fs.rmSync(path.join(ARCH, r.archivo), { force: true }); run('delete from recursos where slug=?', r.slug); return { ok: 1 }; }
    if (a === 'recurso') {
      const titulo = limpio(b.titulo, 100); if (titulo.length < 4) throw 'Escribe el título'; const slug = titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) + '-' + crypto.randomBytes(2).toString('hex');
      let archivo = null; if (b.pdf) { const m = /^data:application\/pdf;base64,(.+)$/.exec(b.pdf); if (!m) throw 'El archivo debe ser PDF'; const buf = Buffer.from(m[1], 'base64'); if (buf.length > 2.8e6) throw 'El PDF pesa más de 2.8 MB'; archivo = crypto.randomBytes(12).toString('hex') + '.pdf'; fs.mkdirSync(ARCH, { recursive: true }); fs.writeFileSync(path.join(ARCH, archivo), buf); }
      else if (String(b.contenido || '').trim().length < 20) throw 'Escribe el contenido del recurso o sube un PDF';
      run('insert into recursos(slug, emoji, titulo, descripcion, tipo, contenido, archivo, orden) values(?,?,?,?,?,?,?,?)', slug, limpio(b.emoji, 4) || '📄', titulo, limpio(b.descripcion, 200), archivo ? 'pdf' : 'texto', String(b.contenido || '').replace(/[<>]/g, '').slice(0, 30000), archivo, 50); return { ok: 1 };
    }
    if (a === 'legal') { setS('legal', { titular: limpio(b.titular, 120), ruc: limpio(b.ruc, 15), correo: limpio(b.correo, 120), direccion: limpio(b.direccion, 160), anpd: limpio(b.anpd, 60) }); return { ok: 1 }; }
    if (a === 'push-campana') {
      const titulo = limpio(b.titulo, 60), texto = limpio(b.texto, 140); if (titulo.length < 3 || texto.length < 3) throw 'Escribe el título y el texto';
      const seg = { todos: '1=1', docentes: 'usuario_id is not null', leads: 'usuario_id is null and contacto_id is not null' }[b.para] || '1=1', subs = q(`select * from push_subs where ${seg}`);
      let ok = 0, mal = 0; for (const s of subs) { try { (await push.enviar(VAPID, s, { title: titulo, body: texto, url: /^https:\/\//.test(b.url || '') ? b.url : base() + '/', icon: '/icono-192.png' }, 'mailto:' + (correo.remitente() || 'soporte@profetok.com'))) === 'borrar' ? run('delete from push_subs where id=?', s.id) : ok++; } catch (e) { mal++; } }
      return { ok, mal };
    }
    if (a === 'tick') { await tick(); return { ok: 1 }; }
    if (a === 'contacto-borrar') { const c = q1('select * from contactos where id=?', +b.id); if (!c) throw 404; run('delete from eventos where contacto_id=?', c.id); run('delete from auto_envios where contacto_id=?', c.id); run('delete from push_subs where contacto_id=?', c.id); run('delete from contactos where id=?', c.id); return { ok: 1 }; } // derecho de supresión (ARCO)
    if (a === 'contacto') { const c = q1('select * from contactos where id=?', +b.id); if (!c) throw 404; return { contacto: c, eventos: q('select * from eventos where contacto_id=? order by id desc limit 50', c.id), envios: q('select * from auto_envios where contacto_id=? order by fecha desc limit 50', c.id) }; }
    throw 'Acción no válida';
  };

  // ---------- páginas (fuera de la app) ----------
  const html = (res, code, h) => { res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' }); res.end(h); };
  function pagina(req, res, url) {
    let m = /^\/r\/([a-z0-9-]{3,80})$/.exec(url.pathname);
    if (m) {
      const r = q1('select * from recursos where slug=?', m[1]), t = url.searchParams.get('c') || '', vista = t && t === getS('vistaTok');
      const c = !vista && t ? q1('select * from contactos where token=?', t) : null;
      if (!r || (!c && !vista)) { res.writeHead(302, { location: '/recursos?r=' + encodeURIComponent(m[1]) }); res.end(); return true; }
      if (c) { run('update recursos set descargas=descargas+1 where slug=?', r.slug); evento(c.id, 'descargo', r.slug, 2); if (url.searchParams.get('e') === '1' && !c.confirmado) { run('update contactos set confirmado=1 where id=?', c.id); evento(c.id, 'confirmo', 'correo', 10); } }
      if (r.tipo === 'pdf' && r.archivo && fs.existsSync(path.join(ARCH, r.archivo))) { res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="${r.slug}.pdf"`, 'x-content-type-options': 'nosniff' }); fs.createReadStream(path.join(ARCH, r.archivo)).pipe(res); return true; }
      html(res, 200, r.tipo === 'interno' ? R.interno(r.slug) : R.texto(r.titulo, r.contenido || '')); return true;
    }
    if (url.pathname === '/baja' && url.searchParams.get('c')) {
      const c = q1('select * from contactos where token=?', url.searchParams.get('c')); if (c) { run("update contactos set baja=1, ok_correo=0, ok_wa=0, actualizado=datetime('now') where id=?", c.id); if (c.usuario_id) run('update usuarios set no_correo=1 where id=?', c.usuario_id); evento(c.id, 'baja', 'pidió no recibir más mensajes'); }
      html(res, 200, R.pagina('Listo', `<h1>${c ? '✅ Listo, ya no te escribiremos' : '😕 Enlace no válido'}</h1><p>${c ? 'No recibirás más correos ni mensajes de ProfeTok. Si fue un error, vuelve a dejar tus datos cuando quieras.' : 'Este enlace no es válido.'}</p>`)); return true;
    }
    if (url.pathname === '/privacidad') {
      const L = getS('legal', {}), t = L.titular || '[Nombre o razón social del titular]';
      html(res, 200, R.pagina('Política de privacidad', `<h1>🔒 Política de privacidad de ProfeTok</h1><p class="muted">Ley N.° 29733, Ley de Protección de Datos Personales, y su reglamento.</p>
<h2>1. ¿Quién es responsable de tus datos?</h2><p>${R.esc(t)}${L.ruc ? ', RUC ' + R.esc(L.ruc) : ''}${L.direccion ? ', con domicilio en ' + R.esc(L.direccion) : ''}. Contacto: <b>${R.esc(L.correo || '[correo de contacto]')}</b>.${L.anpd ? ` Banco de datos inscrito ante la Autoridad Nacional de Protección de Datos Personales con el código ${R.esc(L.anpd)}.` : ''}</p>
<h2>2. ¿Qué datos usamos y para qué?</h2><ul><li><b>Docentes y directores</b> (nombre, correo, celular, colegio): para crear y mantener tu cuenta, cobrar la membresía y darte soporte.</li><li><b>Publicidad y novedades</b> (recursos, consejos, ofertas): <b>solo si marcaste la casilla</b>. Puedes darte de baja con un clic en cualquier mensaje.</li><li><b>Estudiantes y familias</b>: los registra el docente o el colegio solo con fines educativos. Cada familia ve únicamente a su hijo(a). <b>Nunca usamos datos de estudiantes ni de familias para publicidad</b>, ni los vendemos.</li><li><b>Estadísticas de visitas</b>: contamos visitas por fuente (por ejemplo «facebook»), sin guardar tu dirección IP.</li></ul>
<h2>3. ¿Con quién se comparten?</h2><p>Solo con proveedores que nos ayudan a prestar el servicio y bajo confidencialidad: envío de correos (por ejemplo Brevo o Amazon SES), cobros (Mercado Pago), WhatsApp Business (Meta), notificaciones del navegador y alojamiento seguro (Cloudflare). Algunos están fuera del Perú (flujo transfronterizo) con medidas de seguridad adecuadas.</p>
<h2>4. ¿Cuánto tiempo se guardan?</h2><p>Mientras tengas tu cuenta o hasta que pidas su eliminación. Los datos de una cuenta vencida se conservan para que puedas volver, salvo que pidas borrarlos.</p>
<h2>5. Tus derechos</h2><p>Puedes pedir acceso, rectificación, cancelación u oposición (derechos ARCO) escribiendo a <b>${R.esc(L.correo || '[correo de contacto]')}</b>. Respondemos dentro de los plazos de ley. Si no estás conforme, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.</p>
<h2>6. Seguridad</h2><p>Contraseñas cifradas, conexión segura (HTTPS), permisos estrictos por rol y copias de seguridad diarias.</p>`)); return true;
    }
    return false;
  }
  return { API, LIBRES, alRegistrar, alPagar, pagina, tick, contacto, avisarDueno, pushUsuario };
}
module.exports = { crear };
