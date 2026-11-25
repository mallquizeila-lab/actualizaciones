/* 🤖 Libretín animado — mascota oficial de ProfeTok (SVG + CSS, liviano, se ve 3D).
   Conserva su identidad: cuaderno azul con espiral, ojos grandes, lentes redondos, mejillas rosadas,
   lápiz amarillo arriba y estrella dorada. Saluda, parpadea, celebra, señala. Respeta "movimiento reducido".
   window.LIBRETIN.svg(opts) -> string SVG ; window.LIBRETIN.asistente(mensaje, opts) -> burbuja flotante. */
(function () {
  'use strict';
  function estilos() {
    if (document.getElementById('lib-css')) return;
    document.head.appendChild(document.createElement('style')).id = 'lib-css';
    document.getElementById('lib-css').textContent = `
.lib-wrap{display:inline-block;line-height:0}
.lib-svg{overflow:visible}
.lib-flota{animation:libFlota 3.2s ease-in-out infinite}
@keyframes libFlota{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.lib-ojo{transform-box:fill-box;transform-origin:center;animation:libBlink 4.5s infinite}
@keyframes libBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.lib-brazoR{transform-box:fill-box;transform-origin:85% 10%}
.lib-saluda .lib-brazoR{animation:libSaluda 1s ease-in-out 3}
@keyframes libSaluda{0%,100%{transform:rotate(0)}25%{transform:rotate(22deg)}75%{transform:rotate(-18deg)}}
.lib-salta{animation:libSalta .6s ease 2}
@keyframes libSalta{0%,100%{transform:translateY(0)}40%{transform:translateY(-26px)}60%{transform:translateY(-18px)}}
.lib-estrella{transform-box:fill-box;transform-origin:center;animation:libGira 6s linear infinite}
@keyframes libGira{to{transform:rotate(360deg)}}
/* asistente flotante */
.lib-asis{position:fixed;z-index:4600;right:18px;bottom:18px;display:flex;align-items:flex-end;gap:10px;max-width:92vw;font-family:ui-sans-serif,system-ui,Arial}
.lib-asis.izq{right:auto;left:18px;flex-direction:row-reverse}
.lib-globo{background:#fff;border:2px solid #e0f2fe;border-radius:16px;padding:12px 14px;box-shadow:0 12px 30px -10px rgba(2,132,199,.4);max-width:260px;font-size:14px;color:#0f172a;position:relative;animation:libPop .35s ease}
@keyframes libPop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
.lib-globo b{color:#0284c7}
.lib-cerrar{position:absolute;top:-8px;right:-8px;width:22px;height:22px;border:none;border-radius:50%;background:#0284c7;color:#fff;cursor:pointer;font-size:12px;line-height:1}
@media(prefers-reduced-motion:reduce){.lib-flota,.lib-ojo,.lib-saluda .lib-brazoR,.lib-salta,.lib-estrella,.lib-globo{animation:none!important}}
`;
  }

  // El personaje en SVG (identidad: cuaderno azul, espiral, lentes, mejillas, lápiz, estrella)
  function svg(opts) {
    opts = opts || {}; const s = opts.size || 150;
    return `<svg class="lib-svg" width="${s}" height="${s}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Libretín, la mascota de ProfeTok">
<defs>
<linearGradient id="libCuerpo" x1="40" y1="30" x2="170" y2="180" gradientUnits="userSpaceOnUse"><stop stop-color="#38bdf8"/><stop offset="1" stop-color="#2563eb"/></linearGradient>
<linearGradient id="libLapiz" x1="120" y1="5" x2="175" y2="55" gradientUnits="userSpaceOnUse"><stop stop-color="#fde047"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
<radialGradient id="libMej" cx="0.5" cy="0.5" r="0.5"><stop stop-color="#fb7185"/><stop offset="1" stop-color="#fb7185" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="100" cy="186" rx="52" ry="9" fill="#0f172a" opacity="0.12"/>
<!-- lápiz amarillo arriba -->
<g transform="rotate(38 150 30)"><rect x="140" y="4" width="18" height="60" rx="4" fill="url(#libLapiz)"/><polygon points="140,64 158,64 149,78" fill="#fcd34d"/><polygon points="144,72 154,72 149,78" fill="#1f2937"/><rect x="140" y="4" width="18" height="10" rx="4" fill="#f472b6"/></g>
<!-- piernas -->
<g class="lib-piernas"><rect x="78" y="150" width="12" height="26" rx="6" fill="#1d4ed8"/><rect x="110" y="150" width="12" height="26" rx="6" fill="#1d4ed8"/><ellipse cx="80" cy="178" rx="15" ry="9" fill="#facc15"/><ellipse cx="120" cy="178" rx="15" ry="9" fill="#facc15"/></g>
<!-- brazo izquierdo (sostiene estrella) -->
<g class="lib-brazoL"><rect x="26" y="96" width="30" height="12" rx="6" fill="#2563eb" transform="rotate(20 40 100)"/><g class="lib-estrella"><path d="M30 118 l5 10 11 1 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -1z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/></g></g>
<!-- cuerpo (cuaderno) -->
<rect x="46" y="40" width="108" height="118" rx="20" fill="url(#libCuerpo)" stroke="#1e40af" stroke-width="2"/>
<rect x="60" y="40" width="94" height="118" rx="16" fill="#fff" opacity="0.08"/>
<!-- espiral -->
<g fill="#e5e7eb" stroke="#94a3b8" stroke-width="1">${[0, 1, 2, 3, 4, 5].map(i => `<ellipse cx="46" cy="${56 + i * 18}" rx="7" ry="5"/>`).join('')}</g>
<!-- brazo derecho (saluda) -->
<g class="lib-brazoR"><rect x="150" y="96" width="30" height="12" rx="6" fill="#2563eb" transform="rotate(-25 165 100)"/><circle cx="182" cy="86" r="9" fill="#fff"/></g>
<!-- cara -->
<g class="lib-cara">
<!-- lentes redondos -->
<circle cx="84" cy="92" r="20" fill="#fff"/><circle cx="120" cy="92" r="20" fill="#fff"/>
<circle cx="84" cy="92" r="20" fill="none" stroke="#1e3a8a" stroke-width="3"/><circle cx="120" cy="92" r="20" fill="none" stroke="#1e3a8a" stroke-width="3"/>
<line x1="104" y1="92" x2="100" y2="92" stroke="#1e3a8a" stroke-width="3"/>
<g class="lib-ojo"><circle cx="86" cy="94" r="9" fill="#1f2937"/><circle cx="89" cy="90" r="3" fill="#fff"/></g>
<g class="lib-ojo"><circle cx="118" cy="94" r="9" fill="#1f2937"/><circle cx="121" cy="90" r="3" fill="#fff"/></g>
<ellipse cx="68" cy="112" rx="11" ry="8" fill="url(#libMej)"/><ellipse cx="136" cy="112" rx="11" ry="8" fill="url(#libMej)"/>
<path d="M86 120 q14 14 28 0" stroke="#1e3a8a" stroke-width="4" stroke-linecap="round" fill="none"/>
</g>
<!-- letras AD en la estrella decorativa inferior -->
<text x="100" y="150" text-anchor="middle" font-family="Arial" font-weight="800" font-size="16" fill="#fff" opacity="0.9">ProfeTok</text>
</svg>`;
  }

  function mascota(opts) {
    estilos(); opts = opts || {};
    const w = document.createElement('div'); w.className = 'lib-wrap' + (opts.flota !== false ? ' lib-flota' : '');
    w.innerHTML = svg(opts);
    w.saludar = () => { w.classList.remove('lib-saluda'); void w.offsetWidth; w.classList.add('lib-saluda'); };
    w.celebrar = () => { w.classList.remove('lib-salta'); void w.offsetWidth; w.classList.add('lib-salta'); };
    setTimeout(() => w.saludar(), 300);
    return w;
  }

  // Asistente flotante con un mensaje (esquina). opts: {lado:'der'|'izq', segundos, celebrar}
  let actual = null;
  function asistente(mensaje, opts) {
    estilos(); opts = opts || {};
    if (actual) actual.remove();
    const box = document.createElement('div'); box.className = 'lib-asis' + (opts.lado === 'izq' ? ' izq' : '');
    const m = mascota({ size: opts.size || 96 });
    const globo = document.createElement('div'); globo.className = 'lib-globo'; globo.innerHTML = mensaje;
    const x = document.createElement('button'); x.className = 'lib-cerrar'; x.textContent = '✕'; x.onclick = () => box.remove();
    globo.appendChild(x);
    box.appendChild(globo); box.appendChild(m);
    document.body.appendChild(box); actual = box;
    if (opts.celebrar) setTimeout(() => m.celebrar(), 200);
    if (opts.segundos !== 0) setTimeout(() => { if (box.isConnected) box.remove(); }, (opts.segundos || 7) * 1000);
    return box;
  }

  function chatCss() {
    if (document.getElementById('lc-css')) return;
    document.head.appendChild(document.createElement('style')).id = 'lc-css';
    document.getElementById('lc-css').textContent = `
.lc-ov{position:fixed;inset:0;z-index:4600;background:rgba(15,23,42,.55);display:grid;place-items:center;padding:14px;font-family:ui-sans-serif,system-ui,Arial}
.lc-box{background:#f6f9ff;width:min(96vw,520px);height:min(90vh,720px);border-radius:22px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px -20px rgba(0,0,0,.5)}
.lc-top{display:flex;align-items:center;gap:10px;padding:12px 16px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff}
.lc-top b{font-size:18px}.lc-top small{opacity:.9;display:block;font-size:12px}
.lc-top .x{margin-left:auto;border:none;background:rgba(255,255,255,.2);color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:16px}
.lc-msgs{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.lc-b{max-width:82%;padding:10px 14px;border-radius:16px;font-size:15px;line-height:1.4;white-space:pre-wrap;word-break:break-word}
.lc-b.user{align-self:flex-end;background:#2563eb;color:#fff;border-bottom-right-radius:5px}
.lc-b.bot{align-self:flex-start;background:#fff;color:#0f172a;border:1px solid #e0f2fe;border-bottom-left-radius:5px}
.lc-hint{color:#64748b;font-size:13px;text-align:center;padding:4px 10px}
.lc-in{display:flex;gap:8px;align-items:center;padding:12px;background:#fff;border-top:1px solid #e5e7eb}
.lc-in input{flex:1;border:1px solid #e5e7eb;border-radius:22px;padding:11px 14px;font:inherit}
.lc-mic{width:52px;height:52px;border:none;border-radius:50%;background:#0ea5e9;color:#fff;font-size:22px;cursor:pointer;flex:0 0 auto;transition:.15s}
.lc-mic.on{background:#ef4444;animation:lcPulse 1s infinite}
@keyframes lcPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 12px rgba(239,68,68,0)}}
.lc-send{width:46px;height:46px;border:none;border-radius:50%;background:#2563eb;color:#fff;font-size:18px;cursor:pointer;flex:0 0 auto}
.lc-chips{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 10px;background:#fff}
.lc-chip{border:1px solid #e0f2fe;background:#f0f9ff;border-radius:16px;padding:7px 12px;font-size:13px;cursor:pointer;color:#0369a1}
@media(prefers-reduced-motion:reduce){.lc-mic.on{animation:none}}
`;
  }

  // 🎤 Conversación por voz con Libretín. ctx = { api, nombre }
  function chat(ctx) {
    estilos(); chatCss();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const soportaVoz = !!SR;
    const ov = document.createElement('div'); ov.className = 'lc-ov';
    const box = document.createElement('div'); box.className = 'lc-box';
    const nombre = (ctx && ctx.nombre ? ctx.nombre.split(' ')[0] : '') || 'profe';
    box.innerHTML = `<div class="lc-top"></div><div class="lc-msgs" id="lcM"></div><div class="lc-chips" id="lcC"></div><div class="lc-in"><button class="lc-mic" id="lcMic" title="Hablar">🎤</button><input id="lcT" placeholder="Escribe o toca el micro…" autocomplete="off"><button class="lc-send" id="lcS" title="Enviar">➤</button></div>`;
    const top = box.querySelector('.lc-top');
    const mini = mascota({ size: 46, flota: false }); top.appendChild(mini);
    top.insertAdjacentHTML('beforeend', `<div><b>Libretín</b><small>Tu asistente · habla o escribe</small></div>`);
    const xb = document.createElement('button'); xb.className = 'x'; xb.textContent = '✕'; top.appendChild(xb);
    ov.appendChild(box); document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const M = box.querySelector('#lcM'), input = box.querySelector('#lcT'), micBtn = box.querySelector('#lcMic'), sendBtn = box.querySelector('#lcS'), chips = box.querySelector('#lcC');
    const cerrar = () => { try { speechSynthesis.cancel(); } catch (e) {} if (rec) try { rec.stop(); } catch (e) {} ov.remove(); document.body.style.overflow = ''; };
    xb.onclick = cerrar; ov.onclick = e => { if (e.target === ov) cerrar(); };

    const hist = [];
    const burbuja = (rol, texto) => { const d = document.createElement('div'); d.className = 'lc-b ' + rol; d.textContent = texto; M.appendChild(d); M.scrollTop = M.scrollHeight; return d; };
    burbuja('bot', `¡Hola, ${nombre}! 👋 Soy Libretín. Pregúntame lo que necesites: una sesión de clase, un examen, ideas o cómo usar ProfeTok. ${soportaVoz ? 'Toca el 🎤 y háblame.' : 'Escríbeme aquí abajo.'}`);
    ['Hazme una sesión de Comunicación', 'Dame 5 ideas para motivar', '¿Cómo tomo asistencia?'].forEach(t => { const c = document.createElement('div'); c.className = 'lc-chip'; c.textContent = t; c.onclick = () => enviar(t); chips.appendChild(c); });

    function hablar(t) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/[*#_`>]/g, '')); u.lang = 'es-PE'; u.rate = 1.03; u.pitch = 1.05; const vs = speechSynthesis.getVoices(); const v = vs.find(x => /es-PE|es-419|es-MX|es-US/i.test(x.lang)) || vs.find(x => /^es/i.test(x.lang)); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) {} }
    let pensando = false;
    async function enviar(texto) {
      texto = (texto || '').trim(); if (!texto || pensando) return;
      const prev = hist.slice(); burbuja('user', texto); hist.push({ rol: 'user', texto }); input.value = '';
      pensando = true; const t = burbuja('bot', '…'); mini.saludar();
      try { const r = await ctx.api('tic/chat', { mensaje: texto, historial: prev }); t.textContent = r.texto || '…'; hist.push({ rol: 'bot', texto: r.texto }); hablar(r.texto); mini.celebrar(); }
      catch (e) { t.textContent = '⚠️ ' + e.message; }
      finally { pensando = false; }
    }
    sendBtn.onclick = () => enviar(input.value);
    input.onkeydown = e => { if (e.key === 'Enter') enviar(input.value); };

    // micrófono (Web Speech API)
    let rec = null, escuchando = false;
    micBtn.onclick = () => {
      if (!soportaVoz) { burbuja('bot', 'Tu navegador no deja usar el micrófono, profe. Usa Chrome en tu celular o PC, o escríbeme aquí abajo. 🙂'); return; }
      if (escuchando) { try { rec.stop(); } catch (e) {} return; }
      try { speechSynthesis.cancel(); } catch (e) {}
      rec = new SR(); rec.lang = 'es-PE'; rec.interimResults = true; rec.continuous = false; let fin = '';
      rec.onresult = e => { let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript; } input.value = fin + interim; };
      rec.onerror = () => { escuchando = false; micBtn.classList.remove('on'); };
      rec.onend = () => { escuchando = false; micBtn.classList.remove('on'); const t = input.value.trim(); if (t) enviar(t); };
      try { rec.start(); escuchando = true; micBtn.classList.add('on'); mini.saludar(); } catch (e) {}
    };
    try { speechSynthesis.getVoices(); } catch (e) {}
    input.focus();
    return ov;
  }

  window.LIBRETIN = { svg, mascota, asistente, chat };
})();

