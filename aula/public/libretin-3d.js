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

  window.LIBRETIN = { svg, mascota, asistente };
})();
