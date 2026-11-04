// 📚✝️ Juegos educativos y cristianos: tablas de multiplicar, inglés con emojis,
// ordena el versículo, completa el versículo y versículo del día.
// Los versículos son de la Reina-Valera 1909 (dominio público), con ortografía actual.
(() => {
  const A = window.ARC_API; if (!A) return;
  const { JUEGOS, cab, fin, salir } = A, setParar = A.setParar;
  const btn = (txt, attrs = '', st = '') => `<button ${attrs} style="border:0;border-radius:12px;background:rgba(255,255,255,.12);color:#fff;font:700 1rem Figtree,sans-serif;cursor:pointer;${st}">${txt}</button>`;
  const mezclar = l => [...l].sort(() => Math.random() - .5);
  const azar = l => l[Math.floor(Math.random() * l.length)];

  // ---------- Versículos (Reina-Valera 1909, dominio público) ----------
  const VERS = [
    ['Juan 3:16', 'Porque de tal manera amó Dios al mundo, que haya dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.'],
    ['Salmos 23:1', 'Jehová es mi pastor; nada me faltará.'],
    ['Filipenses 4:13', 'Todo lo puedo en Cristo que me fortalece.'],
    ['Proverbios 3:5', 'Fíate de Jehová de todo tu corazón, y no estribes en tu prudencia.'],
    ['Mateo 5:9', 'Bienaventurados los pacificadores: porque ellos serán llamados hijos de Dios.'],
    ['1 Juan 4:8', 'El que no ama, no conoce a Dios; porque Dios es amor.'],
    ['Salmos 119:105', 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.'],
    ['Mateo 11:28', 'Venid a mí todos los que estáis trabajados y cargados, que yo os haré descansar.'],
    ['Juan 14:6', 'Yo soy el camino, y la verdad, y la vida: nadie viene al Padre, sino por mí.'],
    ['Salmos 46:1', 'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.'],
    ['Génesis 1:1', 'En el principio crió Dios los cielos y la tierra.'],
    ['Mateo 7:7', 'Pedid, y se os dará; buscad, y hallaréis; llamad, y se os abrirá.'],
    ['Salmos 118:24', 'Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.'],
    ['Efesios 6:1', 'Hijos, obedeced en el Señor a vuestros padres; porque esto es justo.'],
    ['Hebreos 13:8', 'Jesucristo es el mismo ayer, y hoy, y por los siglos.'],
    ['Salmos 136:1', 'Alabad a Jehová, porque es bueno; porque para siempre es su misericordia.'],
    ['Juan 8:32', 'Y conoceréis la verdad, y la verdad os libertará.'],
    ['Romanos 12:21', 'No seas vencido de lo malo; mas vence con el bien el mal.'],
    ['Mateo 22:39', 'Amarás a tu prójimo como a ti mismo.'],
    ['Romanos 8:28', 'Y sabemos que a los que a Dios aman, todas las cosas les ayudan a bien.'],
    ['Josué 1:9', 'Mira que te mando que te esfuerces y seas valiente: no temas ni desmayes, porque Jehová tu Dios será contigo.'],
    ['1 Corintios 13:4', 'La caridad es sufrida, es benigna.'],
  ];
  window.VERSICULOS = VERS;
  const FUENTE = '<p class="sub" style="font-size:.72rem;margin:8px 0 0">Versículos: Reina-Valera 1909 (dominio público).</p>';

  // ---------- Juego genérico de preguntas rápidas con tiempo ----------
  function rapido(t, { titulo, rondas = 15, seg = 8, gen, grande = '3rem', texto }) {
    salir(); registrar(t.id);
    let r = 0, pts = 0, racha = 0, ok = 0, tm, lim, act, vivo = true;
    stage(cab(t, `1/${rondas}`) + `<p class="sub" style="margin:4px 0">${titulo}</p><div style="height:6px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden;margin:8px 0"><i id="bar" style="display:block;height:100%;width:100%;background:linear-gradient(90deg,#22c55e,#facc15,#ef4444);transition:width .2s linear"></i></div>
      <div id="q" style="text-align:center;font:800 ${grande} Figtree,sans-serif;margin:18px 0;min-height:1.3em;line-height:1.25"></div><div id="ops" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"></div><p class="estado" id="msg">Puntos: 0</p></div>`);
    const sig = () => {
      if (!$('#q')) return; // ya salió del juego
      if (++r > rondas) { vivo = false; clearInterval(tm); FX.son('ganar'); return fin(t, pts, texto(ok, rondas)); }
      const g = gen(r); act = g.r; lim = Date.now() + seg * 1000; $('#info').textContent = `${r}/${rondas}`;
      $('#q').innerHTML = g.q; $('#ops').innerHTML = mezclar(g.ops).map(v => btn(escH(String(v)), `data-v="${escH(String(v))}"`, 'min-height:58px;font-size:1.25rem;padding:8px')).join('');
    };
    $('#ops').onclick = e => { const b = e.target.closest('[data-v]'); if (!b || !vivo) return;
      if (b.dataset.v === String(act)) { ok++; racha++; pts += 10 + Math.ceil(Math.max(0, lim - Date.now()) / 1000) + Math.min(racha, 10); FX.son('punto'); b.style.background = '#16a34a'; }
      else { racha = 0; FX.son('error'); FX.vibrar(40); b.style.background = '#dc2626'; const c = [...document.querySelectorAll('#ops [data-v]')].find(x => x.dataset.v === String(act)); if (c) c.style.background = '#16a34a'; }
      $('#msg').textContent = `Puntos: ${pts}${racha > 2 ? ` · racha x${racha} 🔥` : ''}`; vivo = false; setTimeout(() => { vivo = true; sig(); }, 650); };
    tm = setInterval(() => { if (!vivo) return; const q = Math.max(0, lim - Date.now()); const b = $('#bar'); if (b) b.style.width = (q / (seg * 10)) + '%'; if (!q) { racha = 0; FX.son('error'); vivo = false; const c = [...document.querySelectorAll('#ops [data-v]')].find(x => x.dataset.v === String(act)); if (c) c.style.background = '#16a34a'; setTimeout(() => { vivo = true; sig(); }, 800); } }, 100);
    setParar(() => { clearInterval(tm); vivo = false; }); sig();
  }

  // ---------- ✖️ Reto de tablas de multiplicar ----------
  JUEGOS.tablas = t => {
    salir(); registrar(t.id);
    stage(cab(t, '') + `<p class="sub">¿Qué tabla quieres practicar?</p><div id="tb" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => btn('× ' + n, `data-n="${n}"`, 'height:54px;font-size:1.2rem')).join('')}${btn('🎲 Todas', 'data-n="0"', 'height:54px;font-size:1rem;background:linear-gradient(135deg,#7c3aed,#ec4899)')}</div></div>`);
    $('#tb').onclick = e => { const b = e.target.closest('[data-n]'); if (!b) return; const n = +b.dataset.n;
      rapido(t, { titulo: n ? `Tabla del ${n}` : 'Todas las tablas', rondas: 15, seg: 7, texto: (ok, de) => `${ok} de ${de} correctas${n ? ' en la tabla del ' + n : ''}`,
        gen: () => { const a = n || 2 + Math.floor(Math.random() * 11), b = 1 + Math.floor(Math.random() * 12), r = a * b, ops = new Set([r]); while (ops.size < 4) { const v = r + (Math.floor(Math.random() * 5) - 2) * (Math.random() < .5 ? a : 1) + (Math.random() < .3 ? 1 : 0); if (v > 0 && v !== r) ops.add(v); } return { q: `${a} × ${b}`, r, ops: [...ops] }; } }); };
  };

  // ---------- ➕ Sumas y restas (1.° a 3.° de primaria) ----------
  JUEGOS.sumas = t => rapido(t, { titulo: 'Sumas y restas', rondas: 15, seg: 10, texto: (ok, de) => `${ok} de ${de} operaciones correctas`,
    gen: r => { const tope = r < 6 ? 10 : r < 11 ? 20 : 50, suma = Math.random() < .55; let a = 1 + Math.floor(Math.random() * tope), b = 1 + Math.floor(Math.random() * tope); if (!suma && b > a) [a, b] = [b, a];
      const res = suma ? a + b : a - b, ops = new Set([res]); while (ops.size < 4) { const v = res + Math.floor(Math.random() * 7) - 3; if (v >= 0) ops.add(v); else ops.add(res + ops.size); } return { q: `${a} ${suma ? '+' : '−'} ${b}`, r: res, ops: [...ops] }; } });

  // ---------- 🟰 Ecuaciones (secundaria): halla x ----------
  JUEGOS.ecuaciones = t => rapido(t, { titulo: 'Halla el valor de x', rondas: 12, seg: 15, grande: '2.2rem', texto: (ok, de) => `${ok} de ${de} ecuaciones resueltas`,
    gen: r => { const x = Math.floor(Math.random() * 21) - 5, a = r < 5 ? 1 : 2 + Math.floor(Math.random() * 6), b = Math.floor(Math.random() * 19) - 9, c = a * x + b;
      const izq = `${a === 1 ? '' : a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}`, ops = new Set([x]); while (ops.size < 4) ops.add(x + Math.floor(Math.random() * 9) - 4);
      return { q: `${izq} = ${c}`, r: x, ops: [...ops] }; } });

  // ---------- % Porcentajes y regla de tres (instituto y universidad) ----------
  JUEGOS.porcentajes = t => rapido(t, { titulo: 'Calcula rápido (sin calculadora)', rondas: 12, seg: 15, grande: '1.7rem', texto: (ok, de) => `${ok} de ${de} cálculos correctos`,
    gen: () => { const tipo = Math.floor(Math.random() * 3); let q, res;
      if (tipo === 0) { const p = azar([5, 10, 15, 20, 25, 30, 40, 50, 75]), n = azar([20, 40, 60, 80, 120, 200, 240, 300, 400, 500, 800]); q = `${p}% de ${n}`; res = p * n / 100; }
      else if (tipo === 1) { const n = azar([50, 80, 100, 120, 150, 200, 250, 400]), p = azar([10, 20, 25, 50]); q = `S/ ${n} con ${p}% de descuento`; res = n - n * p / 100; }
      else { const a = azar([2, 3, 4, 5, 6]), b = azar([10, 12, 15, 20, 30]), c = a * azar([2, 3, 4, 5]); q = `Si ${a} cuestan S/ ${b}, ¿cuánto cuestan ${c}?`; res = b * c / a; }
      res = Math.round(res * 100) / 100; const ops = new Set([res]); while (ops.size < 4) { const v = Math.round((res * (1 + (Math.floor(Math.random() * 7) - 3) / 10) + (Math.random() < .5 ? 5 : 0)) * 100) / 100; if (v > 0) ops.add(v); }
      return { q, r: res, ops: [...ops] }; } });

  // ---------- 🇬🇧 Inglés con emojis ----------
  const INGLES = [['🐶', 'dog'], ['🐱', 'cat'], ['🍎', 'apple'], ['🏠', 'house'], ['🚗', 'car'], ['☀️', 'sun'], ['🌙', 'moon'], ['📖', 'book'], ['🐟', 'fish'], ['🌳', 'tree'], ['🍌', 'banana'], ['🐦', 'bird'], ['💧', 'water'], ['🔥', 'fire'], ['⭐', 'star'], ['🍞', 'bread'], ['🥛', 'milk'], ['👟', 'shoe'], ['🚌', 'bus'], ['✈️', 'airplane'], ['🐄', 'cow'], ['🐷', 'pig'], ['🐴', 'horse'], ['🍊', 'orange'], ['🎂', 'cake'], ['⚽', 'ball'], ['🎁', 'gift'], ['✏️', 'pencil'], ['🪑', 'chair'], ['🛏️', 'bed'], ['👁️', 'eye'], ['👂', 'ear'], ['👃', 'nose'], ['✋', 'hand'], ['🌧️', 'rain'], ['❄️', 'snow'], ['🍇', 'grapes'], ['🐘', 'elephant'], ['🦁', 'lion'], ['🟥', 'red'], ['🟦', 'blue'], ['🟩', 'green'], ['🟨', 'yellow'], ['🍓', 'strawberry'], ['🐢', 'turtle'], ['🌸', 'flower'], ['🕐', 'clock'], ['🔑', 'key'], ['🚲', 'bicycle'], ['🍕', 'pizza']];
  JUEGOS.ingles = t => rapido(t, { titulo: '¿Cómo se dice en inglés?', rondas: 15, seg: 8, grande: '4.2rem', texto: (ok, de) => `${ok} de ${de} palabras en inglés`,
    gen: () => { const [e, w] = azar(INGLES), ops = new Set([w]); while (ops.size < 4) ops.add(azar(INGLES)[1]); return { q: e, r: w, ops: [...ops] }; } });

  // ---------- ✍️ Completa el versículo ----------
  const CLAVE = v => { const ps = v.replace(/[.,;:¿?¡!]/g, '').split(/\s+/).filter(p => p.length >= 4 && !/^(porque|para|todo|todos|aquel|ellos|mas|sino)$/i.test(p)); return azar(ps.length ? ps : v.split(/\s+/)); };
  JUEGOS.completa = t => rapido(t, { titulo: 'Toca la palabra que falta', rondas: 10, seg: 15, grande: '1.25rem', texto: (ok, de) => `${ok} de ${de} versículos completos`,
    gen: () => { const [ref, v] = azar(VERS), w = CLAVE(v), otras = new Set([w]); while (otras.size < 4) otras.add(CLAVE(azar(VERS)[1])); const q = v.replace(new RegExp('(^|[^\\p{L}])' + w + '(?![\\p{L}])', 'u'), '$1<span style="display:inline-block;min-width:80px;border-bottom:3px solid #fde047;color:#fde047">&nbsp;?&nbsp;</span>');
      return { q: `<div style="font-weight:600">“${q}”</div><small style="display:block;margin-top:8px;color:#fde68a;font-size:.9rem">${ref}</small>`, r: w, ops: [...otras] }; } });

  // ---------- 🧩 Ordena el versículo ----------
  JUEGOS.ordena = t => {
    salir(); registrar(t.id);
    const lista = mezclar(VERS.filter(([, v]) => v.split(' ').length <= 16)).slice(0, 5); let i = 0, pts = 0, err = 0, t0, tm;
    stage(cab(t, '1/5') + `<p class="sub" style="margin:4px 0">Toca las palabras en el orden correcto.</p><div id="ref" style="text-align:center;color:#fde68a;font-weight:800;margin:8px 0"></div>
      <div id="arm" style="min-height:70px;background:rgba(0,0,0,.25);border-radius:12px;padding:10px;font-size:1.05rem;line-height:1.6"></div><div id="pal" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:12px"></div><p class="estado" id="msg">Puntos: 0</p>${FUENTE}</div>`);
    let palabras, armado;
    const ronda = () => { if (!$('#pal')) return; if (i >= lista.length) { clearInterval(tm); FX.son('ganar'); return fin(t, pts, `Ordenaste ${lista.length} versículos con ${err} ${err === 1 ? 'error' : 'errores'}`); }
      const [ref, v] = lista[i]; palabras = v.split(' '); armado = 0; t0 = Date.now(); $('#info').textContent = `${i + 1}/${lista.length}`; $('#ref').textContent = ref; $('#arm').innerHTML = '';
      $('#pal').innerHTML = mezclar(palabras.map((p, k) => [p, k])).map(([p, k]) => btn(escH(p), `data-k="${k}"`, 'padding:8px 12px')).join(''); };
    $('#pal').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = +b.dataset.k;
      if (palabras[k] === palabras[armado]) { b.remove(); $('#arm').insertAdjacentHTML('beforeend', `<span style="color:#bbf7d0">${escH(palabras[armado])} </span>`); armado++; FX.son('click');
        if (armado === palabras.length) { pts += 50 + Math.max(0, 60 - Math.round((Date.now() - t0) / 1000)); FX.son('punto'); $('#msg').textContent = `Puntos: ${pts} · ¡Muy bien! 🙌`; i++; setTimeout(ronda, 1200); } }
      else { err++; pts = Math.max(0, pts - 5); FX.son('error'); FX.vibrar(40); b.style.background = '#dc2626'; setTimeout(() => { b.style.background = 'rgba(255,255,255,.12)'; }, 300); $('#msg').textContent = `Puntos: ${pts}`; } };
    tm = setInterval(() => {}, 1000); setParar(() => clearInterval(tm)); ronda();
  };

  // ---------- 📖 Versículo del día (para compartir) ----------
  JUEGOS.versiculo = t => {
    salir(); registrar(t.id);
    const hoy = new Date(Date.now() - 5 * 3600e3), n = Math.floor(hoy.getTime() / 864e5); let k = n % VERS.length;
    const pintar = () => { const [ref, v] = VERS[k];
      stage(cab(t, hoy.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })) + `<div style="margin:12px 0;padding:22px 18px;border-radius:18px;background:linear-gradient(160deg,#1e3a8a,#7c3aed 60%,#db2777);text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.35)">
        <div style="font-size:2.2rem">📖</div><p style="font:600 1.25rem/1.5 Figtree,sans-serif;margin:10px 0">“${escH(v)}”</p><b style="color:#fde68a">${escH(ref)}</b></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${btn('📲 Compartir', 'id="vcomp"', 'height:48px;background:#22c55e')}${btn('🖼️ Imagen para estado', 'id="vimg"', 'height:48px')}${btn('⬅️ Anterior', 'id="vant"', 'height:44px')}${btn('➡️ Otro', 'id="vsig"', 'height:44px')}</div>${FUENTE}</div>`);
      const url = `${location.origin}/?g=${t.id}${window.REF?.() || ''}`, txt = `📖 “${v}” — ${ref}`;
      $('#vant').onclick = () => { k = (k - 1 + VERS.length) % VERS.length; pintar(); }; $('#vsig').onclick = () => { k = (k + 1) % VERS.length; pintar(); };
      $('#vcomp').onclick = () => { if (navigator.share) navigator.share({ title: 'Versículo del día', text: txt, url }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(txt + '\n' + url), '_blank'); };
      $('#vimg').onclick = () => { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 1080, 1920); g.addColorStop(0, '#1e3a8a'); g.addColorStop(.6, '#7c3aed'); g.addColorStop(1, '#db2777'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
        x.fillStyle = 'rgba(255,255,255,.9)'; x.font = '120px serif'; x.textAlign = 'center'; x.fillText('📖', 540, 520); x.font = '600 64px Figtree,sans-serif'; x.fillStyle = '#fff';
        const pal = ('“' + v + '”').split(' '); let lin = '', y = 760; const lineas = []; for (const p of pal) { if (x.measureText(lin + p).width > 900) { lineas.push(lin); lin = ''; } lin += p + ' '; } lineas.push(lin); y = 960 - lineas.length * 42; for (const l of lineas) { x.fillText(l.trim(), 540, y); y += 86; }
        x.fillStyle = '#fde68a'; x.font = '800 60px Figtree,sans-serif'; x.fillText(ref, 540, y + 50); x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '600 40px Figtree,sans-serif'; x.fillText('Versículo del día · ' + location.host, 540, 1800);
        c.toBlob(b => { const f = new File([b], 'versiculo.png', { type: 'image/png' }); if (navigator.canShare?.({ files: [f] })) navigator.share({ files: [f], text: txt }).catch(() => {}); else { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'versiculo.png'; a.click(); toast('🖼️ Imagen descargada: súbela a tu estado'); } }, 'image/png'); };
      try { PERFIL.partida(t.juego, 10); } catch (e) {} };
    pintar();
  };
})();
