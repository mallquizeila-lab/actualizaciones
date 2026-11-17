// 🤝 Clientes (CRM) de Yupitok Studio: configuración de la página + chatbot, y seguimiento de cada cliente potencial
(() => {
  let CR = null, CRt = 0, carga = false, filtro = 'activos';
  async function cargar() { if (carga) return; carga = true; try { CR = await api('/api/crm'); } catch (e) { CR = { error: e.message }; } CRt = Date.now(); carga = false;
    if (tab === 'crm' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) render(); }
  setInterval(() => { if (tab === 'crm' && Date.now() - CRt > 15000) cargar(); }, 5000);
  const ET = { nuevo: ['🆕 Nuevo', '#e0e7ff', '#3730a3'], contactado: ['📞 Contactado', '#fef9c3', '#854d0e'], propuesta: ['📄 Propuesta', '#ffedd5', '#9a3412'], ganado: ['🏆 Cliente', '#dcfce7', '#166534'], perdido: ['✖ Perdido', '#f3f4f6', '#6b7280'] };
  const chip = e => { const [t, bg, c] = ET[e] || ET.nuevo; return `<span style="background:${bg};color:${c};border-radius:99px;padding:1px 9px;font-size:.78rem">${t}</span>`; };
  const fecha = f => { try { return new Date(f).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return f; } };

  function config(A) {
    const c = (k, lab, ph = '') => `<label>${lab}<input id="cf-${k}" value="${esc(A[k] || '')}" placeholder="${esc(ph)}"></label>`;
    return `${A.whatsapp ? '' : '<div class="card" style="background:#fee2e2;color:#991b1b"><b>⚠️ Falta tu WhatsApp de ventas.</b> Sin él, la página no muestra el botón de WhatsApp y el chatbot no puede pasarte a los clientes. Escríbelo abajo y pulsa Guardar.</div>'}<details class="card" ${A.whatsapp ? '' : 'open'}><summary style="cursor:pointer"><b>⚙️ Tu página y tu chatbot</b> <span class="hint">· lo que el asistente sabe y dice</span></summary>
    <div class="row">${c('marca', 'Marca')}${c('dominio', 'Dominio de la agencia', 'yupitokstudio.com')}${c('whatsapp', 'Tu WhatsApp de ventas (con código de país)', '51987654321')}</div>
    <div class="row">${c('correo', 'Correo de contacto', 'hola@yupitokstudio.com')}${c('ciudad', 'Ciudad')}${c('pais', 'País')}<label>Color<input type="color" id="cf-color" value="${esc(A.color || '#7c3aed')}"></label></div>
    <h3 style="margin-top:14px">💼 Planes y precios «desde»</h3><p class="hint">Si dejas el precio vacío, el bot dice «a cotizar» y <b>nunca inventa un número</b>.</p>
    ${A.planes.map((p, i) => `<div class="row"><label>Plan<input id="cp-plan-${i}" value="${esc(p.plan)}"></label><label>Desde<input id="cp-desde-${i}" value="${esc(p.desde)}" placeholder="S/ 350"></label></div><label>Qué incluye<input id="cp-incluye-${i}" value="${esc(p.incluye)}"></label>`).join('')}
    <div class="row">${c('entrega', 'Tiempo de entrega', 'Ej: 3 a 5 días hábiles')}${c('pagos', 'Formas de pago')}</div>${c('dominioIncluido', 'Sobre el dominio')}
    <label>📚 Lo que el bot debe saber además <span class="hint">(promociones, garantías, ejemplos, lo que NO hacemos…)</span><textarea id="cf-extra" style="min-height:90px">${esc(A.extra || '')}</textarea></label>
    <div class="btns"><button class="b" data-act="crmCfg">💾 Guardar</button><a class="b ghost" href="/agencia-pub/" target="_blank" rel="noopener">👁 Ver la página y probar el chatbot</a></div>
    <details style="margin-top:8px"><summary class="hint" style="cursor:pointer">🌐 Cómo ponerla en tu dominio (una sola vez)</summary><ol class="hint" style="margin:6px 0 0 18px">
      <li>Compra el dominio (por ejemplo, <b>yupitokstudio.com</b>) y agrégalo a tu cuenta de Cloudflare.</li>
      <li>Cloudflare → <b>Zero Trust → Networks → Tunnels</b> → tu túnel de Yupitok → <b>Public Hostname → Add</b>: dominio <b>yupitokstudio.com</b>, servicio <b>http://localhost:3300</b> (el mismo puerto que usa Yupitok). Repite con <b>www</b>.</li>
      <li>Escribe el dominio arriba y guarda. Listo: el servidor reconoce el dominio y muestra la página de la agencia, no la de juegos.</li>
      <li>Correo gratis: Cloudflare → tu dominio → <b>Email Routing</b> → hola@ → tu Gmail.</li></ol></details></details>`;
  }
  function lead(l) {
    const wa = l.whatsapp ? `https://wa.me/${String(l.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${l.nombre || ''}, te escribo de ${CR.cfg.marca} por la página web para ${l.negocio || 'tu negocio'} 🙌`)}` : null;
    return `<div class="card" style="border-left:5px solid ${(ET[l.etapa] || ET.nuevo)[2]}"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><b style="font-size:1.08rem">${esc(l.nombre || 'Sin nombre')}</b> ${l.negocio ? `· 🏪 ${esc(l.negocio)}` : ''} ${l.rubro ? `<span class="hint">(${esc(l.rubro)})</span>` : ''} ${chip(l.etapa)} <span class="hint">· ${l.origen === 'whatsapp' ? '📲 pasó a tu WhatsApp' : l.origen === 'chatbot' ? '💬 chatbot' : l.origen === 'formulario' ? '📝 formulario' : '✍️ manual'} · ${fecha(l.fecha)}${l.pais ? ' · ' + esc(l.pais) : ''}</span></div>
      <p style="margin:6px 0">${l.whatsapp ? `📱 <b>${esc(l.whatsapp)}</b> ` : ''}${l.correo ? `✉️ ${esc(l.correo)} ` : ''}${l.ciudad ? `📍 ${esc(l.ciudad)} ` : ''}${l.plan ? `💼 ${esc(l.plan)}` : ''}</p>${l.resumen ? `<div style="background:#f5f3ff;border-radius:10px;padding:8px 12px;margin:6px 0;white-space:pre-line"><b>📝 Resumen del asistente</b>\n${esc(l.resumen)}</div>` : l.necesidad ? `<p style="margin:4px 0">📝 ${esc(l.necesidad)}</p>` : ''}${!l.whatsapp && !l.correo ? '<p class="hint">📲 Aún sin número: te escribirá por WhatsApp con este resumen.</p>' : ''}
      <div class="btns">${wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener" style="background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:9px 16px;border-radius:10px;display:inline-block">💬 Escribir por WhatsApp</a>` : ''}<select data-crmetapa="${l.id}" style="width:auto">${CR.etapas.map(e => `<option value="${e}" ${l.etapa === e ? 'selected' : ''}>${ET[e][0]}</option>`).join('')}</select>${l.web ? `<button class="b ghost" data-act="go" data-tab="webcli">🌐 Ver su web</button>` : `<button class="b ghost" data-act="crmAcc" data-a="crearWeb" data-id="${l.id}">🌐 Crear su web</button>`}<button class="b ghost" data-act="crmAcc" data-a="borrar" data-id="${l.id}">🗑</button></div>
      <div style="display:flex;gap:8px;margin-top:8px"><input id="nota-${l.id}" placeholder="Agregar nota (ej. le envié propuesta, llamar el lunes)" style="flex:1"><button class="b ghost sm" data-act="crmNota" data-id="${l.id}" style="flex:0 0 auto">➕ Nota</button></div>
      ${(l.notas || []).length ? `<div class="hint">${l.notas.slice(-5).reverse().map(n => `🗒 ${fecha(n.f)} · ${esc(n.t)}`).join('<br>')}</div>` : ''}
      ${(l.conversacion || []).length ? `<details><summary class="hint" style="cursor:pointer">💬 Conversación con el chatbot (${l.conversacion.length})</summary><div style="max-height:260px;overflow:auto;background:#f8fafc;border-radius:10px;padding:8px;margin-top:6px">${l.conversacion.map(m => `<div style="margin:4px 0;${m.r === 'u' ? 'text-align:right' : ''}"><span style="display:inline-block;padding:6px 10px;border-radius:10px;max-width:85%;${m.r === 'u' ? 'background:#7c3aed;color:#fff' : 'background:#fff;border:1px solid #e5e7eb'}">${esc(m.t)}</span></div>`).join('')}</div></details>` : ''}</div>`;
  }
  VIEWS.crm = () => {
    if (!CR || Date.now() - CRt > 15000) setTimeout(cargar, 0);
    if (!CR) return '<h1>🤝 Clientes</h1><div class="card">Cargando…</div>';
    if (CR.error) return `<h1>🤝 Clientes</h1><div class="card" style="color:#b91c1c">${esc(CR.error)}</div>`;
    const L = CR.leads, n = e => L.filter(l => l.etapa === e).length, vis = L.filter(l => filtro === 'todos' || (filtro === 'activos' ? !['ganado', 'perdido'].includes(l.etapa) : l.etapa === filtro));
    return `<h1>🤝 Clientes · ${esc(CR.cfg.marca)}</h1><p class="sub">Tu página de presentación con un asistente que atiende 24/7, asesora a cada negocio y te deja aquí sus datos. Te aviso por Telegram cada vez que llega uno nuevo.</p>
    <div class="card"><div style="display:flex;gap:18px;flex-wrap:wrap">${Object.keys(ET).map(e => `<div><div style="font-size:1.6rem;font-weight:800">${n(e)}</div><div class="hint">${ET[e][0]}</div></div>`).join('')}<div><div style="font-size:1.6rem;font-weight:800">${CR.sesiones}</div><div class="hint">💬 chats</div></div></div></div>
    ${config(CR.cfg)}
    <div class="btns">${[['activos', 'Activos'], ['nuevo', '🆕 Nuevos'], ['propuesta', '📄 Propuesta'], ['ganado', '🏆 Clientes'], ['todos', 'Todos']].map(([k, t]) => `<button class="b ${filtro === k ? '' : 'ghost'} sm" data-act="crmFiltro" data-f="${k}">${t}</button>`).join('')}<button class="b ghost sm" data-act="crmNuevo">➕ Agregar a mano</button></div>
    ${vis.map(lead).join('') || '<div class="card empty">Aún no hay clientes aquí. Comparte tu página y el chatbot los irá registrando.</div>'}`;
  };
  Object.assign(ACT, {
    crmCfg: guard(async () => { const g = k => document.getElementById('cf-' + k)?.value, o = { accion: 'cfg' };
      for (const k of ['marca', 'dominio', 'whatsapp', 'correo', 'ciudad', 'pais', 'color', 'entrega', 'pagos', 'dominioIncluido', 'extra']) o[k] = g(k) ?? '';
      o.planes = CR.cfg.planes.map((_, i) => ({ plan: document.getElementById('cp-plan-' + i).value, desde: document.getElementById('cp-desde-' + i).value, incluye: document.getElementById('cp-incluye-' + i).value }));
      CR = await api('/api/crm', o); toast('💾 Guardado: el chatbot ya usa esta información'); render(); }),
    crmAcc: guard(async el => { if (el.dataset.a === 'borrar' && !confirm('¿Borrar este cliente?')) return; CR = await api('/api/crm', { accion: el.dataset.a, id: el.dataset.id }); toast(el.dataset.a === 'crearWeb' ? '🌐 Creando su web en «Web para clientes» (la IA escribe los textos)…' : 'Listo'); render(); }),
    crmNota: guard(async el => { const i = document.getElementById('nota-' + el.dataset.id); CR = await api('/api/crm', { accion: 'nota', id: el.dataset.id, texto: i.value }); toast('🗒 Nota guardada'); render(); }),
    crmFiltro: el => { filtro = el.dataset.f; render(); },
    crmNuevo: guard(async () => { const nombre = prompt('Nombre del cliente'); if (nombre === null) return; const negocio = prompt('Negocio') || '', whatsapp = prompt('WhatsApp (con código de país)') || '';
      CR = await api('/api/crm', { accion: 'nuevo', nombre, negocio, whatsapp }); render(); }),
  });
  document.addEventListener('change', async e => { const id = e.target.dataset?.crmetapa; if (!id) return; try { CR = await api('/api/crm', { accion: 'etapa', id, etapa: e.target.value }); toast('Etapa actualizada'); render(); } catch (x) { alert(x.message); } });
})();
