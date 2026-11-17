// 🌐 Web para AdSense · 💼 Web para clientes (panel). Usa VIEWS, ACT, api, esc, toast, render, tab de app.js
(() => {
  const WB = { adsense: null, cliente: null }, WBt = { adsense: 0, cliente: 0 };
  let cargando = false, editor = null;
  const tipoDe = () => tab === 'webcli' ? 'cliente' : 'adsense';
  async function cargar(t = tipoDe()) { if (cargando) return; cargando = true; try { WB[t] = await api('/api/webs?tipo=' + t); } catch (e) { WB[t] = { error: e.message }; } WBt[t] = Date.now(); cargando = false;
    if ((tab === 'webads' || tab === 'webcli') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !editor) render(); }
  setInterval(() => { const t = tipoDe(); if ((tab === 'webads' || tab === 'webcli') && (WB[t]?.trabajando || Date.now() - WBt[t] > 20000)) cargar(t); }, 4000);
  const ESTADO = { idea: ['💡 Idea', '#e0e7ff', '#3730a3'], escribiendo: ['✍️ Escribiendo…', '#fef9c3', '#854d0e'], revisar: ['👀 Por revisar', '#ffedd5', '#9a3412'], aprobada: ['✅ Aprobada (programada)', '#dcfce7', '#166534'], publicada: ['🌐 Publicada', '#d1fae5', '#065f46'], error: ['⚠️ Error', '#fee2e2', '#991b1b'] };
  const chip = e => { const [t, bg, c] = ESTADO[e] || ['?', '#eee', '#333']; return `<span style="background:${bg};color:${c};border-radius:99px;padding:1px 8px;font-size:.75rem;white-space:nowrap">${t}</span>`; };
  const campo = (id, lab, val = '', ph = '', tipo = 'text') => `<label>${lab}<input id="${id}" type="${tipo}" value="${esc(val)}" placeholder="${esc(ph)}"></label>`;

  function formMagia() {
    const D = WB.adsense?.def || {};
    return `<div class="card" style="border:2px solid #7c3aed;background:linear-gradient(135deg,#faf5ff,#eef2ff)"><h3>✨ Crear web mágica</h3><p class="hint">Escribe solo la <b>temática</b> y el <b>dominio</b>. El sistema hace todo: nombre, lema, misión, color, <b>logo</b>, categorías, 24 temas sin repetir, las primeras 6 páginas con <b>imágenes</b>, revisión de calidad, páginas legales y SEO. Luego tú apruebas y se publica a ritmo natural (modo automático activado).</p>
    <div class="row">${campo('wm-nicho', 'Temática o nicho *', '', 'Ej: recetas peruanas fáciles · trámites en Perú · cuidado de mascotas')}${campo('wm-dominio', 'Dominio *', '', 'recetasperuanas.com')}</div>
    <div class="row"><label>País<select id="wm-pais">${['Perú', 'México', 'Colombia', 'Argentina', 'Chile', 'Ecuador', 'Bolivia', 'España', 'Estados Unidos', 'Latinoamérica'].map(p => `<option>${p}</option>`).join('')}</select></label>${campo('wm-resp', 'Responsable (tu nombre real, se guarda)', D.responsable || '', 'José Albitres')}${campo('wm-ciudad', 'Ciudad', D.ciudad || '', 'Lima')}</div>
    <p class="hint">📧 El correo será <b>contacto@tudominio</b>: actívalo gratis en Cloudflare → tu dominio → <b>Email Routing</b> (reenvía a tu Gmail). Sin correo que funcione, AdSense rechaza.</p>
    <div class="btns"><button class="b" data-act="wbMagia" style="background:#7c3aed">✨ Crear todo</button></div></div>`;
  }
  function formNueva(t) {
    return `${t === 'adsense' ? formMagia() : ''}<details class="card" ${WB[t]?.webs?.length || t === 'adsense' ? '' : 'open'}><summary style="cursor:pointer"><b>➕ Crear ${t === 'adsense' ? 'una web paso a paso (avanzado)' : 'una web nueva'}</b></summary>
    ${t === 'adsense' ? `<p class="hint">Un sitio de contenido útil para un nicho. La IA propone temas sin repetir, escribe cada página con datos y fuentes, otra IA la revisa y <b>tú apruebas</b> antes de publicar. Lo que AdSense exige (contacto, responsable, legales, fechas reales, SEO) se arma solo.</p>
    <div class="row">${campo('wn-nombre', 'Nombre del sitio *', '', 'Ej: Se Busca Empleo')}${campo('wn-dominio', 'Dominio (cuando lo compres)', '', 'sebuscaempleo.com')}</div>
    <div class="row">${campo('wn-nicho', 'Nicho / tema *', '', 'Ej: empleo, derechos laborales y CV en Perú')}${campo('wn-publico', 'Para quién', '', 'Ej: personas que buscan trabajo en Perú')}</div>
    <div class="row"><label>País<select id="wn-pais">${['Perú', 'México', 'Colombia', 'Argentina', 'Chile', 'Ecuador', 'Bolivia', 'España', 'Estados Unidos', 'Latinoamérica'].map(p => `<option>${p}</option>`).join('')}</select></label>${campo('wn-ciudad', 'Ciudad', '', 'Lima')}</div>
    <div class="row">${campo('wn-correo', 'Correo de contacto REAL *', '', 'contacto@tudominio.com', 'email')}${campo('wn-resp', 'Responsable (tu nombre real) *', '', 'José Albitres')}</div>
    <div class="row">${campo('wn-autor', 'Autor', 'Equipo editorial de Yupitok')}${campo('wn-editor', 'Editorial', 'Yupitok')}<label>Color<input id="wn-color" type="color" value="#2563eb"></label></div>`
    : `<p class="hint">Página profesional para un negocio (restaurante, taller, consultorio, tienda…): portada, servicios, por qué elegirlos, preguntas frecuentes, contacto con WhatsApp y mapa, y SEO local. Lista en minutos para entregar o publicar.</p>
    <div class="row">${campo('wn-nombre', 'Nombre del negocio *', '', 'Ej: Pollería El Buen Sabor')}${campo('wn-rubro', 'Rubro *', '', 'Ej: pollería y parrillas')}</div>
    <label>Servicios o productos (uno por línea o separados por coma)<textarea id="wn-servicios" style="min-height:60px" placeholder="Pollo a la brasa, parrillas, delivery, eventos"></textarea></label>
    <div class="row">${campo('wn-whatsapp', 'WhatsApp (con código de país)', '', '51987654321')}${campo('wn-correo', 'Correo', '', '', 'email')}</div>
    <div class="row">${campo('wn-direccion', 'Dirección', '', 'Av. Principal 123')}${campo('wn-ciudad', 'Ciudad', '', 'Lima')}${campo('wn-horario', 'Horario', '', 'Lun a Dom 12:00–23:00')}</div>
    <div class="row">${campo('wn-dominio', 'Dominio (si ya tiene)', '', 'polleriaelbuensabor.com')}<label>País<select id="wn-pais">${['Perú', 'México', 'Colombia', 'Argentina', 'Chile', 'Ecuador', 'Bolivia', 'España', 'Estados Unidos'].map(p => `<option>${p}</option>`).join('')}</select></label><label>Color de marca<input id="wn-color" type="color" value="#dc2626"></label></div>
    <label>¿Qué lo hace diferente? (opcional, solo cosas reales)<input id="wn-dif" placeholder="Ej: leña de algarrobo, 15 años en el barrio"></label>`}
    <div class="btns"><button class="b" data-act="wbCrear" data-t="${t}">✨ Crear web</button></div></details>`;
  }

  function tarjeta(w) {
    const pend = w.chequeo.filter(c => !c.ok), por = (e) => w.paginas.filter(p => p.estado === e);
    const fila = p => `<div style="border-top:1px solid #eee;padding:7px 0;display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:240px">${chip(p.estado)} <b>${esc(p.tituloSeo || p.titulo)}</b>${p.nota ? ` <span class="hint">· nota ${p.nota}/10 · ${p.palabras} palabras</span>` : ''}${p.fecha_pub ? ` <span class="hint">· ${p.estado === 'publicada' ? 'publicada' : 'sale'} el ${esc(p.fecha_pub)}</span>` : ''}
      <div class="hint">🎯 ${esc(p.intencion || '')}${p.bloque ? ' · 🧩 ' + esc(p.bloque) : ''}</div>${(p.problemas || []).length ? `<div class="hint" style="color:#9a3412">⚠️ ${p.problemas.map(esc).join(' · ')}</div>` : ''}${(p.faltan || []).length ? `<div class="hint" style="color:#991b1b">📌 Falta verificar: ${p.faltan.map(esc).join(' · ')}</div>` : ''}${p.error ? `<div class="hint" style="color:#991b1b">${esc(p.error)}</div>` : ''}</div>
      <div class="btns" style="margin:0">${['idea', 'error'].includes(p.estado) ? `<button class="b sm" data-act="wbPag" data-a="escribir" data-id="${w.id}" data-pid="${p.id}">✍️ Escribir</button>` : ''}${p.estado === 'revisar' ? `<button class="b sm" data-act="wbPag" data-a="aprobar" data-id="${w.id}" data-pid="${p.id}">✅ Aprobar</button><button class="b ghost sm" data-act="wbPag" data-a="escribir" data-id="${w.id}" data-pid="${p.id}">🔄 Reescribir</button>` : ''}${p.palabras ? `<button class="b ghost sm" data-act="wbEditar" data-id="${w.id}" data-pid="${p.id}">📝 Ver / editar</button>` : ''}${p.estado !== 'publicada' ? `<button class="b ghost sm" data-act="wbPag" data-a="descartar" data-id="${w.id}" data-pid="${p.id}">🗑</button>` : ''}</div></div>`;
    const prev = `/webs/${w.id}/`;
    if (w.tipo === 'cliente') return `<div class="card" style="border-left:5px solid ${esc(w.color)}"><h3>💼 ${esc(w.nombre)} <span class="hint">${esc(w.dominio || 'sin dominio aún')}</span></h3>
      <p>${w.textos ? '✅ Textos listos' : '⏳ Escribiendo los textos…'} ${w.construido ? '· 🏗️ Armada' : ''} ${w.publicado ? `· 🌐 <a href="${esc(w.publicado.url)}" target="_blank" rel="noopener">${esc(w.publicado.url)}</a>` : ''}</p>
      <div class="btns"><button class="b" data-act="wbAcc" data-a="construir" data-id="${w.id}">🏗️ Armar web</button><a class="b ghost" href="${prev}" target="_blank" rel="noopener">👁 Vista previa</a><button class="b ghost" data-act="wbAcc" data-a="textos" data-id="${w.id}">🔄 Reescribir textos</button><button class="b ghost" data-act="wbAcc" data-a="zip" data-id="${w.id}">⬇ ZIP para el cliente</button><button class="b ghost" data-act="wbAcc" data-a="publicar" data-id="${w.id}">🚀 Publicar en Cloudflare</button><button class="b ghost" data-act="wbAcc" data-a="borrar" data-id="${w.id}">🗑</button></div>
      ${ajustes(w)}${w.log.length ? `<details><summary class="hint" style="cursor:pointer">📋 Registro</summary><div class="hint">${w.log.map(esc).join('<br>')}</div></details>` : ''}</div>`;
    return `<div class="card" style="border-left:5px solid ${esc(w.color)}"><h3>${w.logo ? `<img src="/webs/${w.id}/logo.png?${esc(w.construido || '')}" alt="" width="30" height="30" style="vertical-align:middle;border-radius:6px"> ` : '🌐 '}${esc(w.nombre)} <span class="hint">${esc(w.dominio || 'sin dominio aún')} · ${esc(w.nicho)}</span></h3>
      <p class="hint">💡 ${por('idea').length} ideas · 👀 ${por('revisar').length} por revisar · ✅ ${por('aprobada').length} programadas · 🌐 ${por('publicada').length} publicadas${w.publicado ? ` · <a href="${esc(w.publicado.url)}" target="_blank" rel="noopener">${esc(w.publicado.url)}</a>` : ''}</p>
      <details ${pend.length ? 'open' : ''}><summary style="cursor:pointer"><b>📋 Lista para AdSense: ${w.chequeo.length - pend.length}/${w.chequeo.length}</b></summary><div style="margin:6px 0">${w.chequeo.map(c => `<div>${c.ok ? '✅' : '❌'} ${esc(c.t)}${c.ok ? '' : ` <span class="hint">— ${esc(c.consejo)}</span>`}</div>`).join('')}</div></details>
      <div class="btns">${por('revisar').length ? `<button class="b" data-act="wbAcc" data-a="aprobarBuenas" data-id="${w.id}" style="background:#16a34a">✅ Aprobar las de nota 9+</button>` : ''}<button class="b" data-act="wbAcc" data-a="escribir" data-id="${w.id}">✍️ Escribir 3 páginas</button>${w.logo ? '' : `<button class="b ghost" data-act="wbAcc" data-a="logo" data-id="${w.id}">🎨 Crear logo</button>`}<button class="b ghost" data-act="wbAcc" data-a="planificar" data-id="${w.id}">💡 Más ideas</button><button class="b ghost" data-act="wbAcc" data-a="construir" data-id="${w.id}">🏗️ Armar sitio</button><a class="b ghost" href="${prev}" target="_blank" rel="noopener">👁 Vista previa</a><button class="b ghost" data-act="wbAcc" data-a="zip" data-id="${w.id}">⬇ ZIP</button><button class="b ghost" data-act="wbAcc" data-a="publicar" data-id="${w.id}">🚀 Publicar en Cloudflare</button></div>
      ${ajustes(w)}
      ${['revisar', 'error', 'escribiendo', 'idea', 'aprobada', 'publicada'].map(e => por(e).length ? `<details ${['revisar', 'error', 'escribiendo'].includes(e) ? 'open' : ''}><summary style="cursor:pointer;margin-top:8px"><b>${chip(e)} ${por(e).length}</b></summary>${por(e).map(fila).join('')}</details>` : '').join('')}
      ${w.log.length ? `<details><summary class="hint" style="cursor:pointer;margin-top:8px">📋 Registro</summary><div class="hint">${w.log.map(esc).join('<br>')}</div></details>` : ''}</div>`;
  }
  function ajustes(w) {
    const v = (k, lab, ph = '', val = w[k]) => campo(`wa-${k}-${w.id}`, lab, val ?? '', ph);
    return `<details style="margin:6px 0"><summary class="hint" style="cursor:pointer">⚙️ Ajustes de la web</summary>
      <div class="row">${v('nombre', 'Nombre')}${v('dominio', 'Dominio', 'midominio.com')}${v('correo', 'Correo de contacto')}</div>
      ${w.tipo === 'adsense' ? `<div class="row">${v('responsable', 'Responsable (nombre real)')}${v('ciudad', 'Ciudad')}${v('lema', 'Lema corto')}</div>
      <label>Misión (aparece en la portada y en Sobre nosotros)<input id="wa-mision-${w.id}" value="${esc(w.mision || '')}"></label>
      <div class="row">${v('autor', 'Autor', '', w.autor?.nombre)}${v('autorBio', 'Bio del autor', '', w.autor?.bio)}</div>
      <div class="row">${v('adsenseId', 'ID de AdSense (ca-pub-…)', 'ca-pub-1234567890123456')}${v('gsc', 'Verificación de Search Console', 'código de la meta google-site-verification')}</div>
      <div class="row"><label>Páginas por semana<input id="wa-ritmo-${w.id}" type="number" min="1" max="7" value="${w.ritmo || 4}"></label><label>Borradores por día (modo automático)<input id="wa-porDia-${w.id}" type="number" min="1" max="5" value="${w.porDia || 2}"></label></div>
      <label><input type="checkbox" id="wa-auto-${w.id}" ${w.auto ? 'checked' : ''} style="width:auto"> 🤖 Modo automático: cada día escribe borradores nuevos (quedan «por revisar» para que tú apruebes)</label>
      <label><input type="checkbox" id="wa-autoPublicar-${w.id}" ${w.autoPublicar ? 'checked' : ''} style="width:auto"> 🚀 Republicar solo en Cloudflare cuando llegue la fecha de las páginas aprobadas</label>
      <label><input type="checkbox" id="wa-anuncios-${w.id}" ${w.anuncios ? 'checked' : ''} style="width:auto"> 💰 Mostrar anuncios (activar SOLO cuando AdSense apruebe el sitio)</label>`
      : `<div class="row">${v('rubro', 'Rubro', '', w.cliente?.rubro)}${v('whatsapp', 'WhatsApp', '', w.cliente?.whatsapp)}${v('horario', 'Horario', '', w.cliente?.horario)}</div>
      <div class="row">${v('direccion', 'Dirección', '', w.cliente?.direccion)}${v('ciudad', 'Ciudad', '', w.cliente?.ciudad)}</div>
      <label>Servicios<textarea id="wa-servicios-${w.id}" style="min-height:50px">${esc(w.cliente?.servicios || '')}</textarea></label>${v('diferencial', 'Diferencial (real)', '', w.cliente?.diferencial)}`}
      <label>Color<input type="color" id="wa-color-${w.id}" value="${esc(w.color)}"></label>
      <div class="btns"><button class="b sm" data-act="wbAjustes" data-id="${w.id}">💾 Guardar ajustes</button></div></details>`;
  }

  function vista(t) {
    const D = WB[t]; if (!D || Date.now() - WBt[t] > 20000) setTimeout(() => cargar(t), 0);
    const titulo = t === 'adsense' ? '🌐 Web para AdSense' : '💼 Web para clientes';
    const sub = t === 'adsense' ? 'Sitios propios de calidad para que AdSense los apruebe: cada página resuelve algo real, con fuentes, bloque único (tabla, checklist, plantilla o herramienta) y tu aprobación antes de publicar. SEO técnico completo: datos estructurados, sitemap con fechas reales, enlazado interno y páginas legales.'
      : 'Páginas profesionales para emprendedores: lista en minutos, con WhatsApp, mapa, SEO local y diseño para celular. Entrégala en ZIP o publícala en Cloudflare.';
    if (!D) return `<h1>${titulo}</h1><p class="sub">${sub}</p><div class="card">Cargando…</div>`;
    if (D.error) return `<h1>${titulo}</h1><div class="card" style="color:#b91c1c">${esc(D.error)}</div>`;
    return `<h1>${titulo}</h1><p class="sub">${sub}</p>${D.trabajando ? `<div class="card" style="background:#fef9c3">⏳ Trabajando: ${esc(D.trabajando)}… (se actualiza solo)</div>` : ''}${formNueva(t)}${D.webs.slice().reverse().map(tarjeta).join('') || ''}`;
  }
  VIEWS.webads = () => vista('adsense');
  VIEWS.webcli = () => vista('cliente');

  // Editor de una página
  function abrirEditor(w, p) {
    editor = { w, p }; const d = document.createElement('div'); d.id = 'wbEd'; d.style.cssText = 'position:fixed;inset:0;background:#0008;z-index:50;display:flex;align-items:center;justify-content:center;padding:14px';
    d.innerHTML = `<div class="card" style="max-width:920px;width:100%;max-height:92vh;overflow:auto"><h3>📝 ${esc(p.titulo)}</h3>
      <label>Título SEO (máx. 60)<input id="we-tit" value="${esc(p.tituloSeo || p.titulo)}" maxlength="70"></label><label>Meta descripción (máx. 155)<input id="we-desc" value="${esc(p.desc || '')}" maxlength="160"></label>
      <label>Contenido (Markdown) <span class="hint">· busca y completa los [FALTA DATO]</span><textarea id="we-cuerpo" style="min-height:45vh;font-family:monospace;font-size:.85rem">${esc(p.cuerpo || '')}</textarea></label>
      <label>Material verificado para reescribir <span class="hint">(opcional: pega datos oficiales con su enlace; la IA los usará al pulsar Reescribir)</span><textarea id="we-datos" style="min-height:60px">${esc(p.datos || '')}</textarea></label>
      ${(p.fuentes || []).length ? `<p class="hint">Fuentes: ${p.fuentes.map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.texto || f.url)}</a>`).join(' · ')}</p>` : ''}
      <div class="btns"><button class="b" data-act="wbGuardarEd">💾 Guardar</button><button class="b ghost" data-act="wbCerrarEd">Cerrar</button></div></div>`;
    document.body.append(d);
  }

  Object.assign(ACT, {
    wbMagia: guard(async el => { const v = id => document.getElementById(id)?.value.trim() || '';
      if (!v('wm-nicho')) throw new Error('Escribe la temática'); if (!v('wm-dominio')) throw new Error('Escribe el dominio');
      el.disabled = true; try { await api('/api/webs', { accion: 'magia', nicho: v('wm-nicho'), dominio: v('wm-dominio'), pais: v('wm-pais'), responsable: v('wm-resp'), ciudad: v('wm-ciudad') }); toast('✨ Creando todo: identidad, logo, temas y primeras páginas (10 a 20 minutos)…'); } finally { el.disabled = false; } await cargar('adsense'); }),
    wbCrear: guard(async el => { const t = el.dataset.t, v = id => document.getElementById(id)?.value || '';
      const o = { accion: 'crear', tipo: t, nombre: v('wn-nombre'), dominio: v('wn-dominio'), pais: v('wn-pais'), ciudad: v('wn-ciudad'), correo: v('wn-correo'), color: v('wn-color') };
      if (t === 'adsense') Object.assign(o, { nicho: v('wn-nicho'), publico: v('wn-publico'), responsable: v('wn-resp'), autor: v('wn-autor'), editor: v('wn-editor') });
      else Object.assign(o, { rubro: v('wn-rubro'), servicios: v('wn-servicios'), whatsapp: v('wn-whatsapp'), direccion: v('wn-direccion'), horario: v('wn-horario'), diferencial: v('wn-dif') });
      if (t === 'adsense' && !o.nicho) throw new Error('Escribe el nicho'); if (t === 'cliente' && !o.rubro) throw new Error('Escribe el rubro');
      await api('/api/webs', o); toast(t === 'adsense' ? '✨ Web creada: la IA está proponiendo categorías y temas…' : '✨ Web creada: la IA está escribiendo los textos…'); await cargar(t); }),
    wbAcc: guard(async el => { const a = el.dataset.a; if (a === 'borrar' && !confirm('¿Borrar esta web y todo su contenido?')) return; el.disabled = true;
      try { const r = await api('/api/webs', { accion: a, id: el.dataset.id });
        if (a === 'zip' && r.zip) { location.href = r.zip; toast('⬇ Descargando ZIP'); }
        else if (a === 'construir') toast(`🏗️ Sitio armado: ${r.construido?.paginas || 0} páginas. Mira la vista previa.`);
        else if (a === 'aprobarBuenas') toast(`✅ Aprobadas ${r.aprobadas} páginas (se publican a ritmo natural)`);
        else toast({ logo: '🎨 Creando logo…', escribir: '✍️ Escribiendo páginas (unos minutos)…', planificar: '💡 Buscando ideas nuevas…', publicar: '🚀 Publicando en Cloudflare…', textos: '✍️ Reescribiendo textos…', borrar: '🗑 Borrada' }[a] || 'Listo'); }
      finally { el.disabled = false; } await cargar(); }),
    wbPag: guard(async el => { const a = el.dataset.a; if (a === 'descartar' && !confirm('¿Descartar esta página?')) return; el.disabled = true;
      try { await api('/api/webs', { accion: a, id: el.dataset.id, pid: el.dataset.pid }); toast({ aprobar: '✅ Aprobada: se publicará en su fecha (ritmo natural)', escribir: '✍️ Escribiendo…', descartar: '🗑 Descartada' }[a]); }
      catch (e) { if (a === 'aprobar' && /FALTA DATO/.test(e.message) && confirm(e.message + '\n\n¿Aprobar igual? (no recomendado)')) await api('/api/webs', { accion: 'aprobar', id: el.dataset.id, pid: el.dataset.pid, forzar: true }); else throw e; }
      finally { el.disabled = false; } await cargar(); }),
    wbEditar: guard(async el => { const r = await api('/api/webs', { accion: 'ver', id: el.dataset.id, pid: el.dataset.pid }); abrirEditor({ id: el.dataset.id }, r.pagina); }),
    wbCerrarEd: () => { document.getElementById('wbEd')?.remove(); editor = null; render(); },
    wbGuardarEd: guard(async () => { const { w, p } = editor; await api('/api/webs', { accion: 'editar', id: w.id, pid: p.id, tituloSeo: $('#we-tit').value, desc: $('#we-desc').value, cuerpo: $('#we-cuerpo').value, datos: $('#we-datos').value }); toast('💾 Guardado'); document.getElementById('wbEd')?.remove(); editor = null; await cargar(); }),
    wbAjustes: guard(async el => { const id = el.dataset.id, g = k => document.getElementById(`wa-${k}-${id}`), o = { accion: 'ajustes', id };
      for (const k of ['nombre', 'dominio', 'correo', 'responsable', 'ciudad', 'lema', 'mision', 'autor', 'autorBio', 'adsenseId', 'gsc', 'ritmo', 'porDia', 'rubro', 'whatsapp', 'horario', 'direccion', 'servicios', 'diferencial', 'color']) if (g(k)) o[k] = g(k).value;
      for (const k of ['auto', 'autoPublicar', 'anuncios']) if (g(k)) o[k] = g(k).checked;
      await api('/api/webs', o); toast('💾 Ajustes guardados'); await cargar(); }),
  });
})();
