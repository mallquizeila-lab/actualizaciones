// 🎓 Yupitok Academy: actividades interactivas de cada lección (quiz, parejas, ordenar, escribir, robot y código)
// y progreso guardado solo en este navegador (no se piden datos del niño).
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const h = (tag, attrs = {}, ...hijos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } for (const x of hijos.flat()) if (x != null) e.append(x.nodeType ? x : document.createTextNode(String(x))); return e; };
  const leer = () => { try { return JSON.parse(localStorage.getItem('acad') || '{}') || {}; } catch (e) { return {}; } };
  const guardar = p => { try { localStorage.setItem('acad', JSON.stringify(p)); } catch (e) {} };
  const mezclar = (l, distinto) => { for (let t = 0; t < 8; t++) { const m = [...l].sort(() => Math.random() - .5); if (!distinto || l.length < 2 || m.some((x, i) => x !== l[i])) return m; } return [...l].reverse(); };
  const estrellas = n => '⭐'.repeat(n) + '☆'.repeat(3 - n);
  // 🗣️ Voz de narrador cálida para niños, en el idioma de cada visitante (lo detecta i18n.js por país e idioma del equipo).
  // Se prefiere una voz femenina natural ("Natural", "Neural", Paulina, Dalia, Jenny…) y se lee pausado, por frases.
  const VOZ = (() => {
    const PREF = ['natural', 'neural', 'online', 'dalia', 'paulina', 'mónica', 'monica', 'sabina', 'elvira', 'helena', 'laura', 'jenny', 'aria', 'emma', 'ava', 'samantha', 'karen', 'moira', 'tessa', 'francisca', 'luciana', 'amélie', 'amelie', 'denise', 'katja', 'elsa', 'alice', 'nanami', 'sunhi', 'xiaoxiao', 'google'];
    const MASC = /(jorge|pablo|diego|alvaro|álvaro|raul|raúl|david|mark|daniel|thomas|alex|fred|juan|carlos|enrique|george|james|guy|ryan|andrew|brian|conrad|henri|keita|yunxi|male)/i;
    const idioma = () => (window.IDIOMA && window.IDIOMA.codigoVoz) || 'es';
    const elegir = l => { let vs = []; try { vs = speechSynthesis.getVoices(); } catch (e) {} const base = l.slice(0, 2).toLowerCase(), c = vs.filter(v => v.lang.toLowerCase().startsWith(base)); if (!c.length) return null;
      const punt = v => { const n = v.name.toLowerCase(); let p = 0; PREF.forEach((k, i) => { if (n.includes(k)) p += 40 - i; }); if (MASC.test(n)) p -= 60; if (v.lang.toLowerCase() === l.toLowerCase()) p += 6; if (base === 'es' && /(mx|us|419|pe|co|ar|cl)/i.test(v.lang)) p += 10; return p; };
      return c.sort((a, b) => punt(b) - punt(a))[0]; };
    function hablar(t, { l, onb, onend, lento } = {}) {
      try { speechSynthesis.cancel(); } catch (e) { return; } const L = l || idioma(), lang = L === 'es' ? 'es-MX' : L, v = elegir(lang), texto = String(t).replace(/[—«»*_#]/g, ' ').replace(/\s+/g, ' ').trim();
      const trozos = []; let ini = 0; for (const f of texto.match(/[^.!?¡¿]+[.!?]*\s*/g) || [texto]) { if (trozos.length && (trozos[trozos.length - 1].t + f).length < 180) trozos[trozos.length - 1].t += f; else trozos.push({ t: f, ini }); ini += f.length; }
      trozos.forEach((z, i) => { const u = new SpeechSynthesisUtterance(z.t); u.lang = lang; if (v) u.voice = v; u.rate = lento ? .8 : .9; u.pitch = 1.08;
        if (onb) u.onboundary = e => onb({ name: e.name, charIndex: e.charIndex + z.ini }); if (onend && i === trozos.length - 1) u.onend = onend; speechSynthesis.speak(u); });
    }
    try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; } catch (e) {}
    return { hablar, parar: () => { try { speechSynthesis.cancel(); } catch (e) {} }, idioma, hay: 'speechSynthesis' in window };
  })();
  window.VOZ_ACAD = VOZ;
  const hablar = t => VOZ.hablar(t, { l: 'en-US', lento: true });
  const _viejoHablar = t => { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = .8; const v = speechSynthesis.getVoices().find(v => /^en[-_]US/i.test(v.lang)); if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} };
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').trim();

  // ---------- Cuenta: con cuenta gratis, el avance sigue en cualquier celular o PC ----------
  const ls = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  let VID = ls('vid'); if (!VID) { VID = Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem('vid', VID); } catch (e) {} }
  const TOK = ls('perfilTok'), USU = ls('perfilUsuario');
  const sincronizar = premio => fetch('/api/academia/progreso', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ uid: VID, tok: TOK || undefined, prog: leer(), premio: !!premio }) }).then(r => r.json()).then(r => { if (!r || !r.acad) return r; const p = leer(); for (const [k, v] of Object.entries(r.acad)) p[k] = Math.max(p[k] || 0, v); guardar(p); pintarProgreso(); return r; }).catch(() => null);
  const volver = encodeURIComponent(location.pathname);
  const invitacion = (ninos, corta) => h('div', { class: 'card acta' },
    h('b', { style: 'font-size:1.15rem' }, corta ? '💾 ¡Guarda tus estrellas para siempre!' : '💾 Crea tu cuenta gratis y nunca pierdas tu avance'),
    corta ? h('p', { style: 'margin:6px 0' }, 'Con tu cuenta sigues donde te quedaste en cualquier celular o computadora, ganas 💎 Yupicoins por cada lección nueva y puedes retar a tus amigos.')
      : h('ul', { class: 'aben' }, h('li', {}, '📱 Sigue justo donde te quedaste, en cualquier celular, tablet o computadora.'), h('li', {}, '💎 Gana Yupicoins y puntos del 🏆 Yupi Pass por cada lección nueva que termines.'), h('li', {}, '🏅 Tus estrellas e insignias quedan guardadas en tu perfil de Yupitok.'), h('li', {}, '📣 Comparte tus logros en tus redes y reta a tus amigos a superarte.')),
    h('div', { class: 'aops' }, h('a', { class: 'ab prim', href: '/?cuenta=crear&volver=' + volver }, '✨ Crear mi cuenta gratis'), h('a', { class: 'ab', href: '/?cuenta=entrar&volver=' + volver }, 'Ya tengo cuenta')),
    h('small', { style: 'opacity:.8' }, ninos ? '👨‍👩‍👧 Si eres peque, pide a un adulto que la cree contigo. Solo se pide un nombre de usuario y una clave, nada más.' : 'Gratis para siempre. Solo pides un nombre de usuario y una clave (o entras con Google).'));
  const conectado = () => h('div', { class: 'card acta ok' }, h('b', {}, `✅ ¡Hola, ${USU}!`), ' Tu avance se guarda en tu cuenta y ganas 💎 Yupicoins por cada lección nueva.');
  $$('#acad-cuenta').forEach(e => e.append(USU && TOK ? conectado() : invitacion(e.dataset.ninos === '1')));

  // ---------- Progreso en el centro de cursos y en la página del curso ----------
  function pintarProgreso() { const P = leer();
    $$('[data-clave]').forEach(e => { const n = P[e.dataset.clave]; if (n) { e.textContent = estrellas(n); e.title = 'Completada'; } });
    $$('[data-claves]').forEach(e => { const ks = e.dataset.claves.split(','), hechas = ks.filter(k => P[k]).length; if (hechas) e.textContent = hechas === ks.length ? '🏅 ¡Curso completado!' : `✅ ${hechas} de ${ks.length} lecciones`; }); }
  pintarProgreso(); if (TOK) sincronizar(false);
  $$('[data-voz]').forEach(e => e.addEventListener('click', () => hablar(e.dataset.voz)));
  const chips = $$('[data-filtro]');
  if (chips.length) {
    const aplicar = f => { chips.forEach(c => c.classList.toggle('on', c.dataset.filtro === f)); $$('[data-edad]').forEach(c => { c.hidden = f !== 'todas' && c.dataset.edad !== f; }); try { localStorage.setItem('acadEdad', f); } catch (e) {} };
    chips.forEach(c => c.addEventListener('click', () => aplicar(c.dataset.filtro)));
    let f0 = 'todas'; try { f0 = localStorage.getItem('acadEdad') || 'todas'; } catch (e) {} if (!chips.some(c => c.dataset.filtro === f0)) f0 = 'todas'; aplicar(f0);
  }

  const bl = document.getElementById('leerLeccion');
  if (bl && VOZ.hay) { let leyendo = false; bl.onclick = () => { if (leyendo) { VOZ.parar(); leyendo = false; bl.textContent = '🔊 Escuchar la explicación'; return; } const art = document.querySelector('article'); if (!art) return; leyendo = true; bl.textContent = '⏹️ Detener'; VOZ.hablar(art.innerText, { onend: () => { leyendo = false; bl.textContent = '🔊 Escuchar la explicación'; } }); }; } else if (bl) bl.hidden = true;

  // ---------- Actividades de una lección ----------
  const datos = $('#acad-data'), caja = $('#acad-act'); if (!datos || !caja) return;
  const D = JSON.parse(datos.textContent), A = D.act || [];
  let paso = 0, errores = 0;
  const bien = 'rgba(34,197,94,.35)', mal = 'rgba(239,68,68,.45)';
  const sacudir = e => { e.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 }); };
  const boton = (txt, fn, extra = '') => h('button', { class: 'ab ' + extra, type: 'button', onclick: fn }, txt);

  function mostrar() {
    caja.innerHTML = '';
    if (paso >= A.length) return terminar();
    const a = A[paso], cuerpo = h('div', { class: 'acuerpo' }), nota = h('div', { class: 'anota', 'aria-live': 'polite' });
    caja.append(h('div', { class: 'acab' }, h('b', {}, `Reto ${paso + 1} de ${A.length}`), h('div', { class: 'abarra' }, h('i', { style: `width:${Math.round(paso / A.length * 100)}%` }))), h('p', { class: 'ap' }, a.p), cuerpo, nota);
    const listo = () => { nota.innerHTML = ''; nota.append(h('p', { class: 'aok' }, '✅ ¡Muy bien! ' + (a.exp || '')), boton(paso + 1 < A.length ? 'Siguiente reto →' : 'Terminar lección 🎉', () => { paso++; mostrar(); caja.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 'prim')); $('.prim', nota).focus({ preventScroll: true }); };
    const fallo = (msg, el) => { errores++; nota.innerHTML = ''; nota.append(h('p', { class: 'amal' }, msg || '¡Casi! Inténtalo otra vez.')); if (el) sacudir(el); };
    const oir = a.voz && typeof a.voz === 'string' ? boton('🔊 Escuchar', () => hablar(a.voz), 'voz') : null;
    if (oir) { cuerpo.append(oir); setTimeout(() => hablar(a.voz), 400); }
    TIPOS[a.tipo](a, cuerpo, listo, fallo);
  }

  const TIPOS = {
    quiz(a, c, listo, fallo) {
      const ops = mezclar(a.ops.map((t, i) => ({ t, i }))), fila = h('div', { class: 'aops' });
      ops.forEach(o => fila.append(boton(o.t, ev => { const b = ev.currentTarget; if (o.i === a.ok) { b.style.background = bien; $$('button', fila).forEach(x => x.disabled = true); listo(); } else { b.style.background = mal; b.disabled = true; fallo('No es esa. ¡Prueba otra!', b); } })));
      c.append(fila);
    },
    parejas(a, c, listo, fallo) {
      const izq = h('div', { class: 'acol' }), der = h('div', { class: 'acol' }); let sel = null, hechas = 0;
      const marcar = b => { $$('button', izq).forEach(x => x.classList.remove('sel')); sel = b; if (b) b.classList.add('sel'); };
      a.pares.forEach(([x], i) => izq.append(boton((a.voz ? '🔊 ' : '') + x, ev => { if (a.voz) hablar(x); marcar(ev.currentTarget); ev.currentTarget.dataset.i = i; })));
      mezclar(a.pares.map((p, i) => ({ t: p[1], i })), true).forEach(o => der.append(boton(o.t, ev => { const b = ev.currentTarget; if (!sel) { nota(); return; } if (+sel.dataset.i === o.i) { [sel, b].forEach(x => { x.disabled = true; x.style.background = bien; }); marcar(null); if (++hechas === a.pares.length) listo(); } else { fallo('Esa pareja no va. ¡Mira bien!', b); } })));
      const nota = () => { const n = c.parentNode.querySelector('.anota'); n.innerHTML = ''; n.append(h('p', { class: 'amal' }, 'Primero toca una palabra de la izquierda.')); };
      c.append(h('div', { class: 'apar' }, izq, der));
    },
    ordenar(a, c, listo, fallo) {
      const resp = h('div', { class: 'aresp' }, h('span', { class: 'avacio' }, 'Toca en orden…')), fila = h('div', { class: 'aops' }); let k = 0;
      mezclar(a.items, true).forEach(t => fila.append(boton(t, ev => { const b = ev.currentTarget; if (t === a.items[k]) { if (!k) resp.innerHTML = ''; resp.append(h('span', { class: 'achip' }, `${k + 1}. ${t}`)); b.disabled = true; b.style.opacity = '.35'; if (++k === a.items.length) listo(); } else fallo('Ese no va ahora. ¿Qué viene primero?', b); })));
      c.append(resp, fila);
    },
    escribir(a, c, listo, fallo) {
      const inp = h('input', { class: 'ain', type: 'text', autocomplete: 'off', 'aria-label': 'Tu respuesta', inputmode: a.ok.every(x => /^[\d\s.,/]+$/.test(x)) ? 'decimal' : 'text' });
      const ok = new Set(a.ok.map(norm)), probar = () => { if (!inp.value.trim()) return; if (ok.has(norm(inp.value))) { inp.disabled = true; inp.style.background = bien; listo(); } else fallo('Todavía no. Revisa y vuelve a intentar.', inp); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') probar(); });
      c.append(h('div', { class: 'aops' }, inp, boton('Comprobar', probar, 'prim')));
    },
    codigo(a, c, listo, fallo) {
      const ta = h('textarea', { class: 'acod', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Tu código' }); ta.value = a.ini || '';
      const vista = h('iframe', { class: 'avista', title: 'Vista previa', sandbox: a.js ? 'allow-scripts allow-modals' : '' });
      let t = 0; const pintar = () => { vista.srcdoc = '<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;padding:8px">' + ta.value; };
      ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(pintar, 350); });
      ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); } });
      pintar();
      c.append(h('div', { class: 'aeditor' }, h('div', {}, h('small', {}, '✍️ Tu código'), ta), h('div', {}, h('small', {}, '👀 Vista previa'), vista)), boton('Comprobar mi código', () => { const falta = a.debe.filter(r => !new RegExp(r, 'i').test(ta.value)); if (!falta.length) { ta.readOnly = true; listo(); } else fallo('Casi: aún falta algo de lo que pide el reto. Revisa que cada etiqueta se abra y se cierre.', ta); }, 'prim'));
    },
    robot(a, c, listo, fallo) {
      const n = a.n, muro = new Set((a.muros || []).map(([x, y]) => x + ',' + y)), max = a.max || 12, maxB = 4, MOV = { '⬆️': [0, -1], '⬇️': [0, 1], '⬅️': [-1, 0], '➡️': [1, 0] };
      let prog = [], buc = [], modo = 'P', veces = 2, corriendo = false;
      const tab = h('div', { class: 'atab', style: `grid-template-columns:repeat(${n},1fr)` }), celdas = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const d = h('div', { class: 'acel' }, muro.has(x + ',' + y) ? '🪨' : x === a.meta[0] && y === a.meta[1] ? '⭐' : ''); celdas.push(d); tab.append(d); }
      const bot = h('div', { class: 'abot' }, '🤖'); tab.append(bot);
      const poner = (x, y) => { bot.style.left = (x / n * 100) + '%'; bot.style.top = (y / n * 100) + '%'; bot.style.width = bot.style.height = (100 / n) + '%'; };
      poner(...a.ini);
      const lp = h('div', { class: 'aprog' }), lb = h('div', { class: 'aprog' }), vecesT = h('b', {}, veces);
      const pintar = () => {
        lp.innerHTML = ''; lp.append(h('small', {}, `Principal (${prog.length}/${max}) `), ...(prog.length ? prog.map(x => h('span', { class: 'achip' }, x === '🔁' ? `🔁×${veces}` : x)) : [h('span', { class: 'avacio' }, 'vacío')]));
        lb.innerHTML = ''; lb.append(h('small', {}, `🔁 Bucle (${buc.length}/${maxB}) `), ...(buc.length ? buc.map(x => h('span', { class: 'achip' }, x)) : [h('span', { class: 'avacio' }, 'vacío')]));
        lp.classList.toggle('activo', modo === 'P'); lb.classList.toggle('activo', modo === 'B'); vecesT.textContent = veces;
      };
      const agregar = x => { if (corriendo) return; const L = modo === 'P' ? prog : buc, lim = modo === 'P' ? max : maxB; if (L.length >= lim) { fallo(`Máximo ${lim} bloques aquí.${a.bucle && modo === 'P' ? ' ¡Usa el bucle 🔁!' : ''}`, modo === 'P' ? lp : lb); errores--; return; } L.push(x); pintar(); };
      const flechas = h('div', { class: 'aops' }, ...Object.keys(MOV).map(k => boton(k, () => agregar(k), 'flecha')));
      if (a.bucle) flechas.append(boton('🔁', () => { if (modo === 'B') return; agregar('🔁'); }, 'flecha'));
      const ctrl = h('div', { class: 'aops' }, boton('⌫ Borrar', () => { if (corriendo) return; (modo === 'P' ? prog : buc).pop(); pintar(); }), boton('🗑️ Todo', () => { if (corriendo) return; prog = []; buc = []; pintar(); }), boton('▶ Ejecutar', correr, 'prim'));
      const zona = h('div', {}, lp);
      if (a.bucle) {
        zona.append(lb, h('div', { class: 'aops' }, h('span', {}, 'Escribir en: '), boton('Principal', () => { modo = 'P'; pintar(); }), boton('🔁 Bucle', () => { modo = 'B'; pintar(); })), h('div', { class: 'aops' }, h('span', {}, '🔁 El bucle se repite '), boton('−', () => { veces = Math.max(2, veces - 1); pintar(); }), vecesT, boton('+', () => { veces = Math.min(9, veces + 1); pintar(); }), h('span', {}, ' veces')));
      }
      c.append(h('div', { class: 'arobot' }, tab, h('div', { class: 'actrl' }, zona, flechas, ctrl)));
      pintar();
      async function correr() {
        if (corriendo) return; const pasos = prog.flatMap(x => x === '🔁' ? Array.from({ length: veces }, () => buc).flat() : [x]).slice(0, 120);
        if (!pasos.length) return fallo('Primero pon flechas en el programa.', lp), errores--;
        corriendo = true; let [x, y] = a.ini; poner(x, y);
        for (const p of pasos) {
          await new Promise(r => setTimeout(r, 330)); const nx = x + MOV[p][0], ny = y + MOV[p][1];
          if (nx < 0 || ny < 0 || nx >= n || ny >= n || muro.has(nx + ',' + ny)) { bot.textContent = '💥'; fallo('¡Ups! Yupi-bot chocó. Revisa tus flechas.', tab); await new Promise(r => setTimeout(r, 900)); bot.textContent = '🤖'; poner(...a.ini); corriendo = false; return; }
          x = nx; y = ny; poner(x, y);
        }
        corriendo = false;
        if (x === a.meta[0] && y === a.meta[1]) { bot.textContent = '🥳'; $$('button', c).forEach(b => b.disabled = true); listo(); }
        else { fallo('Yupi-bot no llegó a la ⭐. ¡Cambia algunas flechas!', tab); setTimeout(() => poner(...a.ini), 700); }
      }
    },
  };

  // ---------- Compartir y retar a amigos ----------
  const RETO = (() => { const n = Math.floor(+new URLSearchParams(location.search).get('reto')); return n >= 1 && n <= 3 ? n : 0; })();
  function compartir(texto, url) {
    const t = encodeURIComponent(texto), u = encodeURIComponent(url), tu = encodeURIComponent(texto + ' ' + url);
    const red = (nom, href, bg) => h('a', { class: 'ab red', href, target: '_blank', rel: 'noopener', style: 'background:' + bg }, nom);
    const fila = h('div', { class: 'aops' }, red('🟢 WhatsApp', 'https://wa.me/?text=' + tu, '#16a34a'), red('🔵 Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + u, '#1d4ed8'), red('✈️ Telegram', `https://t.me/share/url?url=${u}&text=${t}`, '#0284c7'), red('✖️ X', `https://twitter.com/intent/tweet?text=${t}&url=${u}`, '#111827'),
      boton('🔗 Copiar enlace', ev => { const b = ev.currentTarget; (navigator.clipboard ? navigator.clipboard.writeText(texto + ' ' + url) : Promise.reject()).then(() => { b.textContent = '✅ ¡Copiado!'; }).catch(() => { prompt('Copia este enlace:', url); }); }));
    if (navigator.share) fila.prepend(boton('📤 Compartir', () => navigator.share({ title: 'Yupitok Academy', text: texto, url }).catch(() => {}), 'prim'));
    return fila;
  }
  if (RETO && caja) caja.before(h('div', { class: 'card areto' }, h('b', {}, '🏆 ¡Te retaron!'), ` Un amigo sacó ${estrellas(RETO)} en esta lección. ¿Puedes igualarlo o superarlo?`));

  function terminar() {
    const n = errores === 0 ? 3 : errores <= 2 ? 2 : 1, p = leer(); p[D.clave] = Math.max(p[D.clave] || 0, n); guardar(p);
    const curso = (D.claves || []).every(k => p[k]);
    caja.append(h('div', { class: 'afin' }, h('div', { class: 'aest' }, estrellas(n)), h('h2', {}, '🎉 ¡Lección completada!'), h('p', {}, n === 3 ? '¡Perfecto, sin errores!' : n === 2 ? '¡Muy bien! Casi perfecto.' : '¡Lo lograste! Repite la lección para ganar más estrellas.'),
      curso ? h('p', { class: 'ains' }, `🏅 ¡Ganaste la insignia del curso «${D.cursoT}»!`) : null,
      D.sig ? h('a', { class: 'btn', href: D.sig }, 'Siguiente lección: ' + D.sigT + ' →') : h('a', { class: 'btn', href: D.cursoU }, 'Volver al curso'),
      boton('🔄 Repetir esta lección', () => { paso = 0; errores = 0; mostrar(); })));
    const fin = $('.afin', caja), base = location.origin + location.pathname;
    if (RETO) fin.prepend(h('p', { class: 'ains' }, n > RETO ? '🥇 ¡Ganaste el reto! Superaste a tu amigo.' : n === RETO ? '🤝 ¡Empate! Igualaste a tu amigo.' : '💪 Casi: tu amigo sacó más estrellas. ¡Repite y gánale!'));
    fin.append(h('div', { class: 'card acomp' }, h('b', { style: 'font-size:1.1rem' }, curso ? '📣 ¡Presume tu insignia y reta a tus amigos!' : '📣 Reta a tus amigos a superarte'), D.ninos ? h('p', { class: 'meta', style: 'margin:4px 0' }, '👨‍👩‍👧 Comparte con ayuda de un adulto.') : null,
      compartir(curso ? `🏅 ¡Terminé el curso «${D.cursoT}» en Yupitok Academy! ¿Te animas a lograrlo tú también?` : `🎓 Saqué ${estrellas(n)} en «${D.titulo}» de Yupitok Academy. ¿Puedes superarme? 😎`, curso ? location.origin + D.cursoU : base + '?reto=' + n)));
    fin.append(h('div', { class: 'card acta' }, h('b', {}, '📢 ¿Quieres más? '), D.ninos ? 'Papá o mamá: ' : '', 'reciban cada día un dibujo, un cuento o un juego nuevo en nuestro canal de Telegram. ', h('a', { href: (window.IDIOMA && window.IDIOMA.telegram) || 'https://t.me/yupitok_es', target: '_blank', rel: 'noopener' }, 'Unirme gratis →')));
    if (TOK && USU) sincronizar(true).then(r => { if (r && r.yc > 0) fin.append(h('p', { class: 'aok' }, `💎 +${r.yc} Yupicoins por terminar una lección nueva`)); });
    else { fin.append(invitacion(D.ninos, true)); sincronizar(false); }
    try { navigator.sendBeacon('/api/academia/ev', JSON.stringify({ c: D.clave, e: n })); } catch (e) {}
  }
  const ini = h('div', { class: 'afin' }, h('p', {}, `Esta lección tiene ${A.length} retos. ¿Listo?`), boton('🚀 ¡Empezar los retos!', mostrar, 'prim grande'));
  caja.append(ini);
})();
