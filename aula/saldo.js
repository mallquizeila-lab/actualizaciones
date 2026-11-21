// 👛 Saldo del docente: recarga cuando quiera (Yape, Plin, tarjeta o QR) y paga su membresía desde su saldo.
// Si activa «renovar con mi saldo», un día antes de vencer ProfeTok renueva solo 1 mes con el saldo (y le avisa).
// Si el saldo no alcanza, le recuerda recargar o pagar como siempre. Recargas grandes reciben un poquito de regalo.
function crear({ db, q, q1, run, limpio, PLANES, pagosM, pushUsuario, avisarDueno, DIA }) {
  db.exec(`create table if not exists saldo_mov (id integer primary key, colegio_id integer, monto real, tipo text, detalle text, pago_id integer, creado text default (datetime('now')));
  create index if not exists sm_col on saldo_mov(colegio_id, id);`);
  try { db.exec('alter table colegios add column auto_saldo integer default 1'); } catch (e) {}
  const BONOS = [{ desde: 200, pct: 8 }, { desde: 100, pct: 5 }]; // 🎁 regalo por recarga
  const r2 = n => Math.round(n * 100) / 100;
  const saldoDe = cid => r2(q1('select coalesce(sum(monto),0) s from saldo_mov where colegio_id=?', cid).s);
  const bonoDe = m => { const b = BONOS.find(x => m >= x.desde); return b ? r2(m * b.pct / 100) : 0; };
  const montoRecarga = v => { const m = r2(+v); if (!(m >= 10 && m <= 2000)) throw 'La recarga debe ser de S/ 10 a S/ 2000'; return m; };
  const docenteDe = cid => q1("select * from usuarios where colegio_id=? and rol in ('director','docente') and activo=1 order by id limit 1", cid);

  // una recarga aprobada (Yape/Plin aprobado por el dueño, Mercado Pago o Izipay)
  function acreditar(p) {
    if (q1('select 1 from saldo_mov where pago_id=?', p.id)) return; const b = bonoDe(+p.monto);
    run("insert into saldo_mov(colegio_id, monto, tipo, detalle, pago_id) values(?,?, 'recarga', ?, ?)", p.colegio_id, +p.monto, `Recarga por ${p.metodo}`, p.id);
    if (b) run("insert into saldo_mov(colegio_id, monto, tipo, detalle, pago_id) values(?,?, 'premio', ?, null)", p.colegio_id, b, `🎁 Regalo por recargar S/ ${p.monto}`);
    const d = docenteDe(p.colegio_id); if (d) pushUsuario(d.id, { title: '👛 ¡Recarga lista!', body: `Recargaste S/ ${p.monto}${b ? ` + 🎁 S/ ${b} de regalo` : ''}. Tu saldo: S/ ${saldoDe(p.colegio_id).toFixed(2)}`, url: '/#/plan', icon: '/icono-192.png' }).catch(() => {});
  }
  // pagar la membresía con el saldo (lo usa el botón y la renovación automática)
  function pagarConSaldo(cid, plan, meses, cupon, via, activarPago) {
    const pr = pagosM.precio(plan, meses, cupon || ''), s = saldoDe(cid); if (s + 0.001 < pr.total) throw `Tu saldo (S/ ${s.toFixed(2)}) no alcanza: faltan S/ ${(pr.total - s).toFixed(2)}. Recarga o paga de otra forma.`;
    const pid = run("insert into pagos(colegio_id, plan, monto, metodo, operacion, cupon, meses) values(?,?,?, 'saldo', ?, ?, ?)", cid, pr.plan, pr.total, `Pagado con saldo · ${pr.meses} mes(es)`, pr.cupon?.codigo || null, pr.meses).lastInsertRowid;
    run("insert into saldo_mov(colegio_id, monto, tipo, detalle, pago_id) values(?,?, 'pago', ?, ?)", cid, -pr.total, `${PLANES[pr.plan].nombre} · ${pr.meses} mes(es)${via ? ' · ' + via : ''}`, pid);
    activarPago(pid, 'saldo ' + (via || '')); return { pago: pid, total: pr.total, saldo: saldoDe(cid) };
  }
  // renovación con saldo: un día antes de vencer (o hasta 3 días después), 1 mes del plan actual
  function revisarAuto(activarPago) {
    const lista = q("select c.* from colegios c where coalesce(c.auto_saldo,1)=1 and julianday(c.vence) between julianday('now','-3 days') and julianday('now','+1 day')");
    for (const c of lista) {
      const s = saldoDe(c.id); if (s <= 0) continue; const d = docenteDe(c.id); if (!d) continue;
      const plan = PLANES[c.plan] ? c.plan : d.rol === 'director' ? 'colegio' : 'docente', precio = PLANES[plan].precio;
      if (q1("select 1 from pagos where colegio_id=? and metodo='saldo' and operacion like '%renovación automática%' and creado>datetime('now','-1 day')", c.id)) continue; // una sola vez por vencimiento
      if (s + 0.001 >= precio) { try { const r = pagarConSaldo(c.id, plan, 1, '', 'renovación automática', activarPago); pushUsuario(d.id, { title: '✅ Renovamos tu plan con tu saldo', body: `Usamos S/ ${r.total.toFixed(2)} de tu saldo. Te quedan S/ ${r.saldo.toFixed(2)}.`, url: '/#/plan', icon: '/icono-192.png' }).catch(() => {}); } catch (e) {} }
      else if (!q1("select 1 from saldo_mov where colegio_id=? and tipo='aviso' and creado>datetime('now','-2 days')", c.id)) {
        run("insert into saldo_mov(colegio_id, monto, tipo, detalle) values(?, 0, 'aviso', 'saldo insuficiente')", c.id);
        pushUsuario(d.id, { title: '👛 Tu saldo no alcanza para renovar', body: `Tienes S/ ${s.toFixed(2)} y tu plan cuesta S/ ${precio}. Recarga o renueva en 1 clic.`, url: '/#/plan?renovar=1', icon: '/icono-192.png' }).catch(() => {});
      }
    }
  }

  const API = {};
  API['GET /api/saldo'] = async ({ u }) => { if (!['docente', 'director'].includes(u.rol)) throw 403; const c = q1('select auto_saldo from colegios where id=?', u.colegio_id);
    return { saldo: saldoDe(u.colegio_id), auto: c?.auto_saldo !== 0, bonos: BONOS, pendientes: q("select monto, metodo, creado from pagos where colegio_id=? and plan='recarga' and estado='pendiente' order by id desc", u.colegio_id),
      movimientos: q("select monto, tipo, detalle, creado from saldo_mov where colegio_id=? and tipo<>'aviso' order by id desc limit 30", u.colegio_id) }; };
  API['POST /api/saldo-auto'] = async ({ u, b }) => { if (!['docente', 'director'].includes(u.rol)) throw 403; run('update colegios set auto_saldo=? where id=?', b.on ? 1 : 0, u.colegio_id); return { ok: 1 }; };
  return { API, acreditar, pagarConSaldo, revisarAuto, saldoDe, montoRecarga, bonoDe };
}
module.exports = { crear };
