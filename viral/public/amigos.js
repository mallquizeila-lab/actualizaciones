// 👥 Amigos y chat privado (interfaz). Usa funciones de la página: post, escH, avImg, toast, LS, abrir, PERFIL, cuentaModal.
(() => {
  const css = document.createElement('style'); css.textContent = `
  .am-modal{position:fixed;inset:0;z-index:55;background:rgba(8,5,25,.78);display:flex;align-items:center;justify-content:center;padding:12px}
  .am-box{width:min(560px,100%);height:min(720px,94vh);display:flex;flex-direction:column;background:linear-gradient(180deg,#1e1a4a,#120d33);border:1px solid rgba(255,255,255,.14);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden;color:#fff}
  .am-top{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.1)}
  .am-top h3{margin:0;flex:1;font-size:1.1rem}.am-x{background:none;border:0;color:#fff;font-size:1.3rem;cursor:pointer}
  .am-tabs{display:flex;gap:6px;padding:8px 12px}.am-tabs button{flex:1;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#fff;border-radius:12px;padding:8px;font-weight:800;cursor:pointer;position:relative}
  .am-tabs button.on{background:linear-gradient(135deg,#7c3aed,#ec4899);border-color:transparent}
  .am-body{flex:1;overflow-y:auto;padding:8px 12px}
  .am-row{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:rgba(255,255,255,.05);margin:6px 0}
  .am-row .n{flex:1;min-width:0}.am-row .n b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.am-row small{opacity:.75}
  .am-btn{border:0;border-radius:10px;padding:7px 11px;font-weight:800;cursor:pointer;background:#7c3aed;color:#fff;font-size:.82rem}.am-btn.alt{background:rgba(255,255,255,.12)}.am-btn.ok{background:#16a34a}
  .am-dot{width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;display:inline-block;margin-left:4px}
  .am-badge{position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border-radius:999px;font-size:.7rem;padding:1px 6px;font-weight:900}
  .am-msgs{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
  .am-m{max-width:80%;padding:8px 11px;border-radius:14px;background:rgba(255,255,255,.1);word-wrap:break-word}.am-m.mio{align-self:flex-end;background:linear-gradient(135deg,#7c3aed,#db2777)}
  .am-m small{display:block;opacity:.6;font-size:.68rem;margin-top:2px}
  .am-inv{border:1px solid rgba(253,224,71,.5);background:rgba(253,224,71,.12)}
  .am-envio{display:flex;gap:6px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.1)}.am-envio input{flex:1;margin:0}`;
  document.head.append(css);
  const tok = () => window.PERFIL?.tok, api = (r, o = {}) => post('/api/' + r, { tok: tok(), vid: typeof VID !== 'undefined' ? VID : undefined, avatar: LS.get('chatAv') || undefined, ...o });
  let caja = null, pestana = 'amigos', datos = null, hilo = null, timer = null;

  async function abrirAmigos(p = 'amigos') {
    if (!tok()) { toast('👤 Crea tu usuario (o entra) para buscar amigos y chatear'); return window.cuentaModal?.('crear'); }
    cerrar(); pestana = p; caja = document.createElement('div'); caja.className = 'am-modal';
    caja.innerHTML = `<div class="am-box"><div class="am-top"><h3>👥 Amigos</h3><button class="am-x" data-x="1" aria-label="Cerrar">✕</button></div><div id="amIn" style="flex:1;display:flex;flex-direction:column;min-height:0"></div></div>`;
    caja.onclick = e => { if (e.target === caja || e.target.dataset.x) cerrar(); }; document.body.append(caja); await lista();
  }
  function cerrar() { clearInterval(timer); timer = null; hilo = null; caja?.remove(); caja = null; window.AMIGOS?.revisar(); }

  async function lista() {
    hilo = null; clearInterval(timer);
    datos = await api('amigos/lista').catch(() => null); if (!caja) return; if (!datos || datos.error) { caja.querySelector('#amIn').innerHTML = `<p class="sub" style="padding:16px">${escH(datos?.error || 'Sin conexión')}</p>`; return; }
    const nSol = datos.recibidas.length;
    caja.querySelector('#amIn').innerHTML = `<div class="am-tabs"><button data-t="amigos" class="${pestana === 'amigos' ? 'on' : ''}">💬 Amigos</button><button data-t="buscar" class="${pestana === 'buscar' ? 'on' : ''}">🔎 Buscar</button><button data-t="sol" class="${pestana === 'sol' ? 'on' : ''}">📩 Solicitudes${nSol ? `<span class="am-badge">${nSol}</span>` : ''}</button></div><div class="am-body" id="amB"></div>`;
    caja.querySelector('.am-tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { pestana = b.dataset.t; lista(); } };
    const B = caja.querySelector('#amB'), fila = (u, botones) => `<div class="am-row">${avImg(u.avatar, 44)}<div class="n"><b>${escH(u.usuario)}${u.enLinea ? '<span class="am-dot" title="En línea"></span>' : ''}</b><small>${u.enLinea ? 'En línea' : 'Desconectado'}${u.sinLeer ? ` · <b style="color:#fde68a;display:inline">${u.sinLeer} nuevo${u.sinLeer > 1 ? 's' : ''}</b>` : ''}</small></div>${botones}</div>`;
    const pideAvisos = window.Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied' && typeof suscribir === 'function';
    if (pestana === 'amigos') B.innerHTML = (pideAvisos ? '<button class="am-btn ok" id="amAvisos" style="width:100%;margin:6px 0;padding:11px">🔔 Avísame cuando mis amigos me escriban</button>' : '') + `<p class="sub" style="text-align:left;margin:4px 0">Tu usuario: <b>${escH(datos.usuario)}</b> · compártelo para que te agreguen.</p>${datos.amigos.length ? '<button class="am-btn" id="amNuevoG" style="width:100%;margin:6px 0">👥➕ Crear chat de grupo</button>' : ''}`
      + (datos.grupos || []).map(g => `<div class="am-row"><span style="font-size:1.8rem;width:44px;text-align:center">👥</span><div class="n"><b>${escH(g.nombre)}</b><small>${g.miembros} personas${g.sinLeer ? ` · <b style="color:#fde68a;display:inline">${g.sinLeer} nuevo${g.sinLeer > 1 ? 's' : ''}</b>` : ''}</small></div><button class="am-btn" data-grupo="${g.id}">💬 Abrir</button></div>`).join('') + (datos.amigos.map(u => fila(u, `<button class="am-btn" data-chat="${escH(u.usuario)}">💬 Chatear</button>`)).join('') || '<p class="sub">Todavía no tienes amigos. Búscalos por su usuario en 🔎 Buscar.</p>');
    if (pestana === 'sol') B.innerHTML = (datos.recibidas.map(u => fila(u, `<button class="am-btn ok" data-acep="${escH(u.usuario)}">Aceptar</button> <button class="am-btn alt" data-rech="${escH(u.usuario)}">✕</button>`)).join('') || '<p class="sub">No tienes solicitudes nuevas.</p>') + (datos.enviadas.length ? '<p class="sub" style="text-align:left;margin:12px 0 4px">Enviadas (esperando respuesta):</p>' + datos.enviadas.map(u => fila(u, '<small>⏳</small>')).join('') : '');
    if (pestana === 'buscar') { B.innerHTML = `<input id="amQ" type="search" placeholder="🔎 Escribe el usuario de tu amigo" style="margin:6px 0" autocomplete="off"><div id="amR"><p class="sub">Escribe al menos 2 letras.</p></div>`;
      let tq; const qi = B.querySelector('#amQ'); qi.focus(); qi.oninput = () => { clearTimeout(tq); tq = setTimeout(async () => { const r = await api('amigos/buscar', { q: qi.value }); const R = B.querySelector('#amR'); if (!R) return;
        R.innerHTML = (r.usuarios || []).map(u => fila(u, u.estado === 'amigo' ? `<button class="am-btn" data-chat="${escH(u.usuario)}">💬</button>` : u.estado === 'enviada' ? '<small>⏳ Enviada</small>' : u.estado === 'recibida' ? `<button class="am-btn ok" data-acep="${escH(u.usuario)}">Aceptar</button>` : `<button class="am-btn" data-pedir="${escH(u.usuario)}">➕ Agregar</button>`)).join('') || '<p class="sub">No encontramos ese usuario.</p>'; }, 350); }; }
    B.onclick = async e => { const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.chat) return chat(t.dataset.chat); if (t.dataset.grupo) return chat(null, +t.dataset.grupo); if (t.id === 'amNuevoG') return nuevoGrupo(); if (t.id === 'amAvisos') { const r = await suscribir({ g: 'amigos' }).catch(() => 'no'); toast(r === 'granted' || LS.get('push') === '1' ? '🔔 ¡Listo! Te avisaremos cuando te escriban' : 'Puedes activarlas luego desde tu navegador'); return lista(); }
      if (t.dataset.pedir) { const r = await api('amigos/pedir', { usuario: t.dataset.pedir }); toast(r.error || (r.estado === 'amigo' ? '🎉 ¡Ahora son amigos!' : '📩 Solicitud enviada')); t.outerHTML = '<small>⏳ Enviada</small>'; }
      if (t.dataset.acep) { await api('amigos/aceptar', { usuario: t.dataset.acep }); toast('🎉 ¡Ahora son amigos!'); pestana = 'amigos'; lista(); }
      if (t.dataset.rech) { await api('amigos/quitar', { usuario: t.dataset.rech }); lista(); } };
  }

  function nuevoGrupo() {
    caja.querySelector('#amIn').innerHTML = `<div class="am-body"><button class="am-btn alt" id="amVol">← Volver</button><h3 style="margin:12px 0 6px">👥 Nuevo chat de grupo</h3>
      <input id="amGN" maxlength="30" placeholder="Nombre del grupo (ej.: Los cracks de GLORY)" style="margin:0 0 8px">
      <p class="sub" style="text-align:left;margin:4px 0">Elige a tus amigos (hasta 19):</p>${datos.amigos.map(u => `<label class="am-row" style="cursor:pointer"><input type="checkbox" value="${escH(u.usuario)}" style="width:auto;margin:0">${avImg(u.avatar, 36)}<div class="n"><b>${escH(u.usuario)}</b></div></label>`).join('')}
      <button class="am-btn" id="amGC" style="width:100%;margin-top:10px;padding:12px">Crear grupo</button></div>`;
    caja.querySelector('#amVol').onclick = () => lista();
    caja.querySelector('#amGC').onclick = async () => { const miembros = [...caja.querySelectorAll('input[type=checkbox]:checked')].map(x => x.value).slice(0, 19);
      const r = await api('grupos/crear', { nombre: caja.querySelector('#amGN').value.trim(), miembros }); if (r.error) return toast(r.error); toast('👥 Grupo creado'); chat(null, r.id); };
  }
  async function chat(usuario, grupo) {
    clearInterval(timer); hilo = { usuario, grupo, ultimo: 0 }; const G = !!grupo, titulo = G ? (datos?.grupos?.find(x => x.id === grupo)?.nombre || 'Grupo') : usuario;
    const J = datos?.juegos || {};
    caja.querySelector('#amIn').innerHTML = `<div class="am-row" style="margin:8px 12px;background:none;padding:0 4px"><button class="am-btn alt" id="amVol">←</button><span id="amAv"></span><div class="n"><b id="amTit">${escH(titulo)}</b><small id="amEst"></small></div><button class="am-btn" id="amInv">🎮</button>${G ? '<button class="am-btn alt" id="amAdd" title="Agregar amigos">👥➕</button>' : ''}<button class="am-btn alt" id="amMas">⋯</button></div>
      <div class="am-msgs" id="amM"><p class="sub">Cargando…</p></div>
      <div id="amJ" hidden style="padding:8px 12px;border-top:1px solid rgba(255,255,255,.1)"><p class="sub" style="text-align:left;margin:0 0 6px">¿A qué juego lo invitas?</p><div style="display:flex;flex-wrap:wrap;gap:6px">${Object.entries(J).slice(0, 40).map(([id, n]) => `<button class="am-btn alt" data-j="${id}">${escH(n)}</button>`).join('')}</div>
        <input id="amCod" maxlength="8" placeholder="Código de sala (opcional, ej.: de GLORY BROWN con amigos)" style="margin:8px 0 0;text-transform:uppercase"></div>
      <div class="am-envio"><input id="amT" maxlength="300" placeholder="Escribe un mensaje…" autocomplete="off"><button class="am-btn" id="amS">➤</button></div>
      <p class="sub" style="font-size:.7rem;margin:0 0 8px">Por tu seguridad no se permiten enlaces, teléfonos ni correos. Nunca compartas contraseñas.</p>`;
    const M = caja.querySelector('#amM');
    const cargar = async () => { if (!hilo || hilo.usuario !== usuario || hilo.grupo !== grupo) return; const r = await api(G ? 'grupos/hilo' : 'dm/hilo', G ? { id: grupo, desde: hilo.ultimo } : { usuario, desde: hilo.ultimo }).catch(() => null); if (!r || r.error) { if (r?.error) M.innerHTML = `<p class="sub">${escH(r.error)}</p>`; return; }
      if (!hilo.ultimo) { M.innerHTML = r.msgs.length ? '' : '<p class="sub">Salúdalo 👋 o invítalo a jugar.</p>'; caja.querySelector('#amAv').innerHTML = G ? '<span style="font-size:1.7rem">👥</span>' : avImg(r.amigo.avatar, 36); }
      if (G) { hilo.miembros = r.grupo.miembros; caja.querySelector('#amTit').textContent = r.grupo.nombre; caja.querySelector('#amEst').textContent = `${r.grupo.miembros.length} personas · ${r.grupo.miembros.filter(m => m.enLinea).length} en línea`; } else caja.querySelector('#amEst').textContent = r.amigo.enLinea ? '🟢 En línea' : 'Desconectado';
      for (const m of r.msgs) { hilo.ultimo = Math.max(hilo.ultimo, m.id); const d = document.createElement('div'); d.className = 'am-m' + (m.mio ? ' mio' : '') + (m.tipo === 'invita' ? ' am-inv' : '');
        if (m.tipo === 'sistema') { d.className = 'am-m'; d.style.cssText = 'align-self:center;background:none;opacity:.7;font-size:.8rem'; d.textContent = m.texto; M.querySelector('p.sub')?.remove(); M.append(d); continue; }
        d.innerHTML = (G && !m.mio ? `<b style="font-size:.75rem;color:#c4b5fd;display:block">${escH(m.de || '')}</b>` : '') + escH(m.texto) + (m.tipo === 'invita' ? `${m.extra?.codigo ? `<br>Código: <b style="letter-spacing:2px">${escH(m.extra.codigo)}</b>` : ''}<br><button class="am-btn ok" data-ir="${escH(m.extra?.juego || '')}" data-cod="${escH(m.extra?.codigo || '')}" style="margin-top:6px">▶ Jugar ahora</button>` : '') + `<small>${new Date(m.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;
        M.querySelector('p.sub')?.remove(); M.append(d); }
      if (r.msgs.length) M.scrollTop = M.scrollHeight; };
    await cargar(); timer = setInterval(cargar, 4000);
    const enviar = async () => { const i = caja.querySelector('#amT'), tx = i.value.trim(); if (!tx) return; i.value = ''; const r = await api(G ? 'grupos/enviar' : 'dm/enviar', G ? { id: grupo, texto: tx } : { usuario, texto: tx }); if (r.error) { toast(r.error); i.value = tx; } else cargar(); };
    caja.querySelector('#amS').onclick = enviar; caja.querySelector('#amT').onkeydown = e => { if (e.key === 'Enter') enviar(); };
    caja.querySelector('#amVol').onclick = () => { pestana = 'amigos'; lista(); };
    caja.querySelector('#amInv').onclick = () => { const j = caja.querySelector('#amJ'); j.hidden = !j.hidden; };
    caja.querySelector('#amJ').onclick = async e => { const b = e.target.closest('[data-j]'); if (!b) return; const r = await api(G ? 'grupos/enviar' : 'dm/enviar', { ...(G ? { id: grupo } : { usuario }), tipo: 'invita', juego: b.dataset.j, codigo: caja.querySelector('#amCod').value.trim() }); toast(r.error || '🎮 Invitación enviada'); caja.querySelector('#amJ').hidden = true; cargar(); };
    M.onclick = e => { const b = e.target.closest('[data-ir]'); if (!b || !b.dataset.ir) return; if (b.dataset.cod) { navigator.clipboard?.writeText(b.dataset.cod).catch(() => {}); toast('📋 Código copiado: ' + b.dataset.cod); } cerrar(); abrir(b.dataset.ir); };
    if (G) caja.querySelector('#amAdd').onclick = async () => { const ya = new Set((hilo.miembros || []).map(m => m.usuario)), libres = (datos.amigos || []).filter(u => !ya.has(u.usuario)); if (!libres.length) return toast('Todos tus amigos ya están en el grupo');
      const n = prompt('¿A quién agregas? Escribe su usuario:\n' + libres.map(u => '• ' + u.usuario).join('\n')); if (!n) return; const r = await api('grupos/agregar', { id: grupo, usuario: n.trim() }); toast(r.error || '➕ Agregado al grupo'); cargar(); };
    if (G) { caja.querySelector('#amMas').onclick = async () => { const op = prompt('Opciones del grupo:\n1 = Salir del grupo\n2 = Reportar mensajes del grupo\n\nEscribe el número:');
      if (op === '1' && confirm('¿Salir del grupo?')) { await api('grupos/salir', { id: grupo }); pestana = 'amigos'; lista(); }
      if (op === '2') { const motivo = prompt('Cuéntanos brevemente qué pasó:') || ''; await api('grupos/reportar', { id: grupo, motivo }); toast('🚩 Reporte enviado. Gracias.'); } }; return; }
    caja.querySelector('#amMas').onclick = async () => { const op = prompt(`Opciones para ${usuario}:\n1 = Quitar de amigos\n2 = Bloquear\n3 = Reportar (mensajes ofensivos o peligrosos)\n\nEscribe el número:`);
      if (op === '1' && confirm('¿Quitar de tus amigos?')) { await api('amigos/quitar', { usuario }); lista(); }
      if (op === '2' && confirm('¿Bloquear? Ya no podrá escribirte ni encontrarte.')) { await api('amigos/bloquear', { usuario }); toast('🚫 Bloqueado'); lista(); }
      if (op === '3') { const motivo = prompt('Cuéntanos brevemente qué pasó:') || ''; await api('amigos/reportar', { usuario, motivo }); toast('🚩 Reporte enviado. Gracias por cuidar la comunidad.'); } };
  }
  // Globito con mensajes y solicitudes nuevas
  async function revisar() { if (!tok()) return; const r = await api('dm/pendientes').catch(() => null); const n = (r?.sinLeer || 0) + (r?.solicitudes || 0); document.querySelectorAll('[data-amigos-badge]').forEach(x => { x.textContent = n || ''; x.hidden = !n; }); }
  setInterval(revisar, 30000); setTimeout(revisar, 2500);
  window.AMIGOS = { abrir: abrirAmigos, revisar, invitar: async (usuario, juego, codigo) => api('dm/enviar', { usuario, tipo: 'invita', juego, codigo }) };
})();
