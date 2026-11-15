// 📖 Yupitok Academy: cuentos interactivos (el lector elige el camino), lectura en voz alta con palabra resaltada y preguntas del Búho.
(() => {
  const datos = document.getElementById('cuento-data'), caja = document.getElementById('cuento'); if (!datos || !caja) return;
  const C = JSON.parse(datos.textContent), P = C.paginas, fines = Object.keys(P).filter(k => P[k].fin);
  const h = (tag, attrs = {}, ...hijos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v != null && v !== false) e.setAttribute(k, v); } for (const x of hijos.flat()) if (x != null) e.append(x.nodeType ? x : document.createTextNode(String(x))); return e; };
  const leer = () => { try { return JSON.parse(localStorage.getItem('cuentos') || '{}') || {}; } catch (e) { return {}; } };
  const guardar = p => { try { localStorage.setItem('cuentos', JSON.stringify(p)); } catch (e) {} };
  const mio = () => leer()[C.slug] || { fines: [], estrellas: 0 };
  let voz = true; try { voz = localStorage.getItem('cuentoVoz') !== '0'; } catch (e) {}
  const hayVoz = 'speechSynthesis' in window, VZ = () => window.VOZ_ACAD, LANG = () => (window.IDIOMA && window.IDIOMA.actual) || 'es';
  // En otro idioma, el texto de cada página se traduce entero (así la voz y las palabras iluminadas coinciden)
  const traducir = t => new Promise(ok => { if (LANG() === 'es' || !window.IDIOMA) return ok(t); let n = 0; const mira = () => { const r = window.IDIOMA.t(t); if (r !== t || n++ > 14) return ok(r); setTimeout(mira, 300); }; mira(); });
  const vozEs = () => { const vs = speechSynthesis.getVoices(); return vs.find(v => /^es[-_](MX|US|419|PE|CO|AR)/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null; };
  let sonando = null; const callar = () => { try { speechSynthesis.cancel(); } catch (e) {} if (sonando) { sonando.pause(); sonando = null; } };
  const conAudio = id => LANG() === 'es' && C.audio && (C.audio.paginas || []).includes(id); // la narración grabada está en español

  // Convierte el texto (con <b> e <i>) en palabras sueltas para resaltarlas mientras se lee
  function palabras(html) {
    const cont = h('p', { class: 'ctexto', translate: 'no' }), lista = []; let plano = '', b = false, i = false;
    for (const parte of html.split(/(<\/?[bi]>)/)) {
      if (/^<\/?[bi]>$/.test(parte)) { const on = parte[1] !== '/', t = parte.replace(/[<>/]/g, ''); if (t === 'b') b = on; else i = on; continue; }
      for (const tok of parte.split(/(\s+)/)) { if (!tok) continue; if (/^\s+$/.test(tok)) { cont.append(' '); plano += ' '; continue; }
        const s = h('span', { class: (b ? 'cb ' : '') + (i ? 'ci' : '') }, tok); lista.push({ s, ini: plano.length }); plano += tok; cont.append(s); }
    }
    return { cont, lista, plano };
  }
  function narrar(w, id) {
    if (conAudio(id)) { // 🔊 narración grabada (voz Kokoro): las palabras se iluminan según el avance del audio
      callar(); const a = new Audio(`/audio/cuentos/${C.slug}/${id}.mp3?v=${C.audio.v}`); sonando = a; const L = w.plano.length || 1;
      a.ontimeupdate = () => { if (!a.duration) return; const ch = a.currentTime / a.duration * L; let act = null; for (const x of w.lista) { if (x.ini <= ch) act = x; else break; } w.lista.forEach(x => x.s.classList.toggle('on', x === act)); };
      a.onended = () => w.lista.forEach(x => x.s.classList.remove('on')); a.play().catch(() => {}); return;
    }
    if (!hayVoz || !VZ()) return; callar();
    VZ().hablar(w.plano, { onb: e => { if (e.name && e.name !== 'word') return; let act = null; for (const x of w.lista) { if (x.ini <= e.charIndex) act = x; else break; } w.lista.forEach(x => x.s.classList.toggle('on', x === act)); }, onend: () => w.lista.forEach(x => x.s.classList.remove('on')) });
  }

  const camino = [];
  async function pagina(id) {
    callar(); camino.push(id); const p = P[id], w = palabras(LANG() === 'es' ? p.t : await traducir(String(p.t).replace(/<[^>]+>/g, ''))); caja.innerHTML = '';
    const barra = h('div', { class: 'cbarra' }, camino.length > 1 ? h('button', { type: 'button', class: 'cbt', onclick: () => { camino.pop(); pagina(camino.pop()); } }, '← Atrás') : h('span'),
      hayVoz || conAudio(id) ? h('button', { type: 'button', class: 'cbt', onclick: () => narrar(w, id) }, '🔊 Escuchar') : null,
      hayVoz || conAudio(id) ? h('button', { type: 'button', class: 'cbt', 'aria-pressed': String(voz), onclick: ev => { voz = !voz; try { localStorage.setItem('cuentoVoz', voz ? '1' : '0'); } catch (e) {} ev.currentTarget.textContent = voz ? '🗣️ Voz: sí' : '🔇 Voz: no'; if (!voz) callar(); } }, voz ? '🗣️ Voz: sí' : '🔇 Voz: no') : null);
    caja.append(barra, h('div', { class: 'cesc', 'aria-hidden': 'true' }, p.esc), w.cont);
    if (p.opciones) caja.append(h('p', { class: 'cpreg' }, '👉 Tú decides:'), h('div', { class: 'cops' }, ...p.opciones.map(o => h('button', { type: 'button', class: 'cop', onclick: () => pagina(o.ir) }, o.t))));
    else if (p.sig) caja.append(h('button', { type: 'button', class: 'cop prim', onclick: () => pagina(p.sig) }, 'Seguir leyendo →'));
    else if (p.fin) final(id, p);
    caja.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (voz) setTimeout(() => narrar(w, id), 350);
  }
  function final(id, p) {
    const m = mio(); if (!m.fines.includes(id)) m.fines.push(id); const t = leer(); t[C.slug] = m; guardar(t);
    caja.append(h('div', { class: 'card cmor' }, h('b', {}, '🦉 El Sabio Búho dice: '), p.moraleja),
      h('p', { class: 'meta' }, `🗺️ Finales descubiertos: ${m.fines.length} de ${fines.length}${m.fines.length < fines.length ? ' · ¡Prueba otro camino para encontrar el otro final!' : ' · ¡Los encontraste todos! 🏆'}`),
      h('div', { class: 'cops' }, h('button', { type: 'button', class: 'cop prim', onclick: preguntas }, '🦉 Responder las preguntas del Búho'), h('button', { type: 'button', class: 'cop', onclick: () => { camino.length = 0; pagina(C.inicio); } }, '🔄 Leer otra vez y elegir otro camino')));
  }
  function preguntas() {
    callar(); caja.innerHTML = ''; let i = 0, err = 0;
    const una = () => { caja.innerHTML = ''; if (i >= C.preguntas.length) return premio(err); const q = C.preguntas[i], nota = h('p', { 'aria-live': 'polite' });
      const ops = q.ops.map((t, k) => ({ t, k })).sort(() => Math.random() - .5);
      caja.append(h('div', { class: 'cesc', 'aria-hidden': 'true' }, '🦉'), h('p', { class: 'cpreg' }, `Pregunta ${i + 1} de ${C.preguntas.length}: ${q.p}`), h('div', { class: 'cops' }, ...ops.map(o => h('button', { type: 'button', class: 'cop', onclick: ev => { const b = ev.currentTarget; if (o.k === q.ok) { b.style.background = 'rgba(34,197,94,.45)'; caja.querySelectorAll('.cop').forEach(x => x.disabled = true); nota.textContent = '✅ ¡Correcto!'; setTimeout(() => { i++; una(); }, 900); } else { err++; b.disabled = true; b.style.background = 'rgba(239,68,68,.45)'; nota.textContent = '¡Casi! Prueba otra respuesta.'; } } }, o.t))), nota); };
    una();
  }
  function premio(err) {
    const n = err === 0 ? 3 : err <= 2 ? 2 : 1, t = leer(), m = mio(); m.estrellas = Math.max(m.estrellas || 0, n); t[C.slug] = m; guardar(t);
    const url = location.origin + location.pathname, txt = `📖 Leí «${C.titulo}» en Yupitok Academy y saqué ${'⭐'.repeat(n)} en las preguntas del Búho. ¿Te animas a leerlo? 🦉`;
    const red = (nom, href, bg) => h('a', { class: 'cop red', href, target: '_blank', rel: 'noopener', style: 'background:' + bg }, nom);
    caja.innerHTML = ''; caja.append(h('div', { class: 'cesc' }, '⭐'.repeat(n) + '☆'.repeat(3 - n)), h('h2', {}, '🎉 ¡Cuento terminado!'), h('p', {}, n === 3 ? '¡Respondiste todo perfecto!' : '¡Muy bien! Lee otra vez para ganar más estrellas.'),
      h('div', { class: 'card' }, h('b', {}, '📣 Recomiéndalo a tus amigos'), C.ninos ? h('p', { class: 'meta' }, '👨‍👩‍👧 Comparte con ayuda de un adulto.') : null,
        h('div', { class: 'cops' }, red('🟢 WhatsApp', 'https://wa.me/?text=' + encodeURIComponent(txt + ' ' + url), '#16a34a'), red('🔵 Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '#1d4ed8'), red('✈️ Telegram', `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(txt)}`, '#0284c7'))),
      h('div', { class: 'cops' }, h('a', { class: 'cop prim', href: '/academia/cuentos' }, '📚 Leer otro cuento'), C.curso ? h('a', { class: 'cop', href: '/academia/' + C.curso }, '🎓 Ir al curso del tema') : null));
  }

  // Portada del cuento
  const m = mio();
  caja.append(h('div', { class: 'cesc', 'aria-hidden': 'true' }, C.emoji), h('p', { class: 'ctexto', style: 'text-align:center' }, C.resumen),
    m.fines.length ? h('p', { class: 'meta', style: 'text-align:center' }, `🗺️ Ya descubriste ${m.fines.length} de ${fines.length} finales${m.estrellas ? ' · ' + '⭐'.repeat(m.estrellas) : ''}`) : null,
    h('div', { class: 'cops', style: 'justify-content:center' }, h('button', { type: 'button', class: 'cop prim grande', onclick: () => pagina(C.inicio) }, '📖 ¡Empezar a leer!')),
    hayVoz ? h('p', { class: 'meta', style: 'text-align:center' }, '🔊 El cuento se lee en voz alta y cada palabra se ilumina. Puedes apagar la voz cuando quieras.') : null);
  try { speechSynthesis.getVoices(); } catch (e) {}
  // marcar en la biblioteca
})();
