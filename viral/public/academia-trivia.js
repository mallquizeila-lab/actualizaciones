// 🏆 Trivia en vivo de Yupitok Academy (cliente): crear o unirse a una sala, responder rápido, emojis y podio.
(() => {
  const raiz = document.getElementById('trivia'); if (!raiz) return;
  const CURSOS = JSON.parse(document.getElementById('trivia-data').textContent), EMOJIS = ['👏', '😂', '😮', '🔥', '💪', '🎉'];
  const h = (tag, attrs = {}, ...hijos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v != null && v !== false) e.setAttribute(k, v); } for (const x of hijos.flat()) if (x != null) e.append(x.nodeType ? x : document.createTextNode(String(x))); return e; };
  const post = (r, b) => fetch('/api/trivia/' + r, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(x => x.json());
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const add = (...xs) => raiz.append(...xs.filter(x => x != null && x !== false));
  let S = null, code = null, tokJ = null, es = null, reloj = 0, vistaQ = -1;

  function inicio(err) {
    raiz.innerHTML = '';
    const sel = h('select', { class: 'tin', 'aria-label': 'Tema de la trivia' }, ...CURSOS.map(c => h('option', { value: c.slug }, c.t)));
    const inp = h('input', { class: 'tin', maxlength: '4', placeholder: 'CÓDIGO', 'aria-label': 'Código de la sala', autocapitalize: 'characters', style: 'text-transform:uppercase;letter-spacing:4px;width:150px;text-align:center' });
    const q = new URLSearchParams(location.search).get('sala'); if (q) inp.value = q.toUpperCase().slice(0, 4);
    add(err ? h('p', { class: 'amal' }, err) : null,
      h('div', { class: 'card' }, h('b', { style: 'font-size:1.15rem' }, '🎮 Crear una sala'), h('p', { class: 'meta' }, 'Elige el tema y comparte el código con tus amigos, hermanos o compañeros de clase. Si juegas solo, te acompaña Yupi-bot.'), h('div', { class: 'aops' }, sel, h('button', { class: 'ab prim', type: 'button', onclick: async ev => { ev.currentTarget.disabled = true; const r = await post('crear', { curso: sel.value }).catch(() => ({ error: 'Sin conexión' })); if (r.error) return inicio(r.error); entrar(r); } }, '✨ Crear sala'))),
      h('div', { class: 'card' }, h('b', { style: 'font-size:1.15rem' }, '🔑 Unirme con un código'), h('div', { class: 'aops' }, inp, h('button', { class: 'ab prim', type: 'button', onclick: () => unir(inp.value) }, 'Entrar'))));
    if (q && !err) unir(q);
  }
  async function unir(c) { c = String(c || '').toUpperCase().trim(); if (c.length !== 4) return inicio('El código tiene 4 letras.'); const r = await post('unir', { code: c, tok: ss.get('triv:' + c) || undefined }).catch(() => ({ error: 'Sin conexión' })); if (r.error) return inicio(r.error); entrar(r); }
  function entrar(r) {
    code = r.code; tokJ = r.tok; ss.set('triv:' + code, tokJ); history.replaceState(null, '', location.pathname + '?sala=' + code);
    if (es) es.close(); es = new EventSource(`/api/trivia/ver?code=${code}&tok=${tokJ}`);
    es.onmessage = e => { S = JSON.parse(e.data); pintar(); };
    es.onerror = () => { if (es.readyState === 2) inicio('Se perdió la conexión con la sala.'); };
  }
  const enviar = (r, b = {}) => post(r, { code, tok: tokJ, ...b }).catch(() => ({}));

  function marcador() {
    return h('div', { class: 'tmarc' }, ...S.jugadores.map((j, i) => h('div', { class: 'tj' + (j.yo ? ' yo' : '') }, h('span', { class: 'tpos' }, ['🥇', '🥈', '🥉'][i] || (i + 1) + '.'), h('span', { class: 'tnom' }, j.nombre + (j.yo ? ' (tú)' : '')),
      j.emoji ? h('span', { class: 'temo' }, j.emoji) : null, S.estado === 'pregunta' ? h('span', {}, j.respondio ? '✅' : '⏳') : j.ultimo ? h('span', { class: 'aok' }, '+' + j.ultimo) : null, h('b', { class: 'tpts' }, j.puntos))));
  }
  const barraEmojis = () => h('div', { class: 'aops temos', role: 'group', 'aria-label': 'Reacciones' }, ...EMOJIS.map(e => h('button', { type: 'button', class: 'ab', onclick: () => enviar('emoji', { e }) }, e)));
  function compartir() {
    const url = location.origin + location.pathname + '?sala=' + code, txt = `🏆 ¡Te reto a una trivia en vivo en Yupitok Academy! Entra con el código ${code}:`;
    return h('div', { class: 'aops' }, h('a', { class: 'ab red', style: 'background:#16a34a', target: '_blank', rel: 'noopener', href: 'https://wa.me/?text=' + encodeURIComponent(txt + ' ' + url) }, '🟢 Invitar por WhatsApp'),
      h('button', { class: 'ab', type: 'button', onclick: ev => { const b = ev.currentTarget; (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => b.textContent = '✅ ¡Copiado!').catch(() => prompt('Copia el enlace:', url)); } }, '🔗 Copiar enlace'),
      navigator.share ? h('button', { class: 'ab', type: 'button', onclick: () => navigator.share({ title: 'Trivia Yupitok', text: txt, url }).catch(() => {}) }, '📤 Compartir') : null);
  }
  function pintar() {
    clearInterval(reloj); raiz.innerHTML = '';
    const cab = h('div', { class: 'tcab' }, h('span', {}, '🔑 Sala ', h('b', { class: 'tcode' }, S.code)), h('span', { class: 'meta' }, '📚 ' + S.cursoT), h('button', { type: 'button', class: 'cbt', onclick: () => { enviar('salir'); if (es) es.close(); history.replaceState(null, '', location.pathname); inicio(); } }, 'Salir'));
    add(cab);
    if (S.estado === 'espera') {
      add(h('p', { class: 'ap' }, `👥 Jugadores en la sala (${S.jugadores.length} de 6):`), marcador(), h('p', { class: 'meta' }, 'Tu nombre en el juego es ' + S.yo + '. Usamos nombres de animales para cuidar tu privacidad.'), compartir(),
        S.host ? h('button', { type: 'button', class: 'btn', onclick: ev => { ev.currentTarget.disabled = true; enviar('empezar'); } }, S.jugadores.length < 2 ? '▶ Empezar con Yupi-bot' : `▶ Empezar (${S.jugadores.length} jugadores)`) : h('p', { class: 'ap' }, '⏳ Esperando a que quien creó la sala empiece…'), barraEmojis());
      return;
    }
    if (S.estado === 'pregunta' || S.estado === 'resultado') {
      const q = S.pregunta, fin = Date.now() + (S.restante || 0), barra = h('i', { style: `width:${Math.round((S.restante || 0) / 150)}%` }), seg = h('b', {}, Math.ceil((S.restante || 0) / 1000) + ' s');
      const yaResp = S.estado === 'pregunta' && (S.jugadores.find(j => j.yo) || {}).respondio;
      add(h('div', { class: 'acab' }, h('b', {}, `Pregunta ${S.i + 1} de ${S.total}`), h('div', { class: 'abarra' }, barra), seg), h('p', { class: 'ap', style: 'font-size:1.3rem' }, q.p),
        h('div', { class: 'tops' }, ...q.ops.map((t, k) => { const b = h('button', { type: 'button', class: 'ab tbtn', onclick: () => { if (S.estado !== 'pregunta') return; raiz.querySelectorAll('.tbtn').forEach(x => x.disabled = true); b.classList.add('sel'); enviar('responder', { k }); } }, t);
          if (S.estado === 'resultado') { b.disabled = true; if (k === S.correcta) b.style.background = 'rgba(34,197,94,.55)'; else if (k === S.mia) b.style.background = 'rgba(239,68,68,.5)'; } else if (yaResp) b.disabled = true; return b; })),
        S.estado === 'resultado' ? h('p', { class: S.mia === S.correcta ? 'aok' : 'amal', style: 'font-size:1.15rem' }, S.mia === S.correcta ? '✅ ¡Correcto!' : S.mia == null ? '⌛ Se acabó el tiempo' : '❌ Esa no era') : yaResp ? h('p', { class: 'meta' }, '✅ ¡Respondido! Esperando a los demás…') : null,
        marcador(), barraEmojis());
      if (S.estado === 'pregunta') reloj = setInterval(() => { const r = Math.max(0, fin - Date.now()); barra.style.width = Math.round(r / 150) + '%'; seg.textContent = Math.ceil(r / 1000) + ' s'; if (!r) clearInterval(reloj); }, 200);
      return;
    }
    if (S.estado === 'fin') {
      const top = S.jugadores, gane = top[0] && top[0].yo;
      add(h('div', { class: 'cesc' }, gane ? '🏆' : '🎉'), h('h2', { style: 'text-align:center' }, gane ? '¡Ganaste la trivia!' : `Ganó ${top[0] ? top[0].nombre : ''}`), marcador(), barraEmojis(),
        S.host ? h('button', { type: 'button', class: 'btn', onclick: ev => { ev.currentTarget.disabled = true; enviar('empezar'); } }, '🔄 Jugar otra vez') : h('p', { class: 'meta' }, 'Quien creó la sala puede empezar otra partida.'), compartir(),
        h('p', {}, h('a', { href: '/academia' }, '🎓 Repasar en los cursos de la Academy')));
    }
  }
  inicio();
})();
