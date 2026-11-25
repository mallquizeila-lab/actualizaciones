/* 📚 Generador de plantillas profesionales para ProfeCrea (ProfeTok).
   16 diseños x 12 temas de color = 192 plantillas listas (más las infinitas de la IA de Libretín).
   Código propio, sin dependencias ni problemas de licencia. window.PLANTILLAS.galeria(onPick). */
(function () {
  'use strict';
  const el = (t, p = {}, h = '') => { const e = document.createElement(t); Object.assign(e, p); if (h) e.innerHTML = h; return e; };
  const EM = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- temas de color ----
  const TEMAS = [
    { id: 'oceano', nombre: 'Océano', bg: 'grad1', bgColor: '#0ea5e9', texto: '#ffffff', acento: '#e0f2fe', chip: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
    { id: 'atardecer', nombre: 'Atardecer', bg: 'grad2', bgColor: '#f97316', texto: '#ffffff', acento: '#ffedd5', chip: 'linear-gradient(135deg,#f97316,#ec4899)' },
    { id: 'menta', nombre: 'Menta', bg: 'grad3', bgColor: '#22c55e', texto: '#ffffff', acento: '#dcfce7', chip: 'linear-gradient(135deg,#22c55e,#0ea5e9)' },
    { id: 'uva', nombre: 'Uva', bg: 'grad4', bgColor: '#8b5cf6', texto: '#ffffff', acento: '#ede9fe', chip: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
    { id: 'fuego', nombre: 'Fuego', bg: 'grad5', bgColor: '#ef4444', texto: '#ffffff', acento: '#fee2e2', chip: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
    { id: 'bosque', nombre: 'Bosque', bg: 'grad6', bgColor: '#0f766e', texto: '#ffffff', acento: '#ccfbf1', chip: 'linear-gradient(135deg,#0f766e,#042f2e)' },
    { id: 'dorado', nombre: 'Dorado', bg: 'bgcolor', bgColor: '#fffdf7', texto: '#92400e', acento: '#d4a017', chip: '#fde68a' },
    { id: 'celeste', nombre: 'Celeste', bg: 'bgcolor', bgColor: '#e0f2fe', texto: '#0369a1', acento: '#0284c7', chip: '#bae6fd' },
    { id: 'rosado', nombre: 'Rosado', bg: 'bgcolor', bgColor: '#fce7f3', texto: '#be185d', acento: '#ec4899', chip: '#fbcfe8' },
    { id: 'amarillo', nombre: 'Amarillo', bg: 'bgcolor', bgColor: '#fef9c3', texto: '#854d0e', acento: '#f59e0b', chip: '#fde68a' },
    { id: 'pizarra', nombre: 'Pizarrón', bg: 'negro', bgColor: '#0f2419', texto: '#ffffff', acento: '#4ade80', chip: '#0f2419' },
    { id: 'blanco', nombre: 'Blanco', bg: 'bgcolor', bgColor: '#ffffff', texto: '#0f172a', acento: '#0284c7', chip: '#f1f5f9' }
  ];

  // ---- helpers de objetos ----
  const T = (text, x, y, size, color, bold, font) => ({ t: 'text', x, y, text, size, color, bold: !!bold, font: font || 'Arial, sans-serif' });
  const R = (x, y, w, h, color, width, fill) => ({ t: 'rect', x, y, w, h, color, width: width || 2, fill: !!fill });
  const E = (x, y, w, h, color, fill) => ({ t: 'ellipse', x, y, w, h, color, width: 3, fill: !!fill });
  const L = (x1, y1, x2, y2, color, width) => ({ t: 'line', x1, y1, x2, y2, color, width: width || 2 });
  const lineas = (x, y, w, n, gap, color) => Array.from({ length: n }, (_, i) => L(x, y + i * gap, x + w, y + i * gap, color, 2));

  // ---- 16 diseños (cada uno se recolorea con el tema) ----
  const LAYOUTS = [
    { id: 'cartel', cat: 'Carteles', nombre: 'Cartel', w: 1080, h: 1350, build: th => [T('🎯', 90, 150, 120), T('TÍTULO DEL\nCARTEL', 90, 360, 90, th.texto, true), T('Escribe aquí tu mensaje principal', 90, 720, 44, th.texto), R(90, 1200, 300, 10, th.acento, 0, true)] },
    { id: 'anuncio', cat: 'Carteles', nombre: 'Anuncio', w: 1080, h: 1350, build: th => [R(0, 120, 1080, 160, th.acento, 0, true), T('📢 AVISO', 110, 150, 72, th.bg === 'bgcolor' ? '#ffffff' : th.texto, true), T('Comunicamos a los\npadres de familia…', 100, 420, 60, th.texto, true), ...lineas(100, 760, 880, 5, 70, th.texto)] },
    { id: 'frase', cat: 'Carteles', nombre: 'Frase', w: 1080, h: 1080, build: th => [T('“', 80, 120, 180, th.acento, true, 'Georgia, serif'), T('El esfuerzo de\nhoy es el éxito\nde mañana', 110, 330, 72, th.texto, true, 'Georgia, serif'), T('— ProfeTok', 110, 900, 38, th.texto)] },
    { id: 'normas', cat: 'Aula', nombre: 'Normas del aula', w: 1080, h: 1350, build: th => { const c = ['#f59e0b', '#ef4444', '#22c55e', '#8b5cf6']; const o = [R(70, 90, 940, 150, th.acento, 0, true), T('NORMAS DE\nNUESTRA AULA', 110, 110, 54, th.bg === 'bgcolor' ? '#ffffff' : th.texto, true)]; ['Escucho con atención', 'Levanto la mano', 'Cuido mis materiales', 'Respeto a todos'].forEach((n, i) => { const y = 340 + i * 150; o.push(E(100, y, 70, 70, c[i], true), T(String(i + 1), 126, y + 16, 38, '#fff', true), T(n, 205, y + 14, 40, th.texto)); }); o.push(T('¡Juntos aprendemos mejor! 🌟', 150, 1250, 38, th.texto, true)); return o; } },
    { id: 'horario', cat: 'Aula', nombre: 'Horario', w: 1350, h: 1000, build: th => { const o = [T('HORARIO DE CLASES', 60, 45, 56, th.texto, true)], x0 = 60, y0 = 150, w = 1230, h = 790, col = w / 6, hh = 72; o.push(R(x0, y0, w, hh, th.acento, 0, true)); ['Hora', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie'].forEach((d, i) => o.push(T(d, x0 + col * i + 30, y0 + 20, 28, th.bg === 'bgcolor' ? '#ffffff' : th.texto, true))); o.push(R(x0, y0, w, h, th.texto, 2, false)); for (let k = 1; k < 6; k++) o.push(L(x0 + col * k, y0, x0 + col * k, y0 + h, th.texto, 1)); for (let r = 0; r <= 7; r++) o.push(L(x0, y0 + hh + (h - hh) / 7 * r, x0 + w, y0 + hh + (h - hh) / 7 * r, th.texto, 1)); return o; } },
    { id: 'cumple', cat: 'Aula', nombre: 'Cumpleaños del mes', w: 1080, h: 1350, build: th => [T('🎂', 440, 120, 170), T('CUMPLEAÑOS\nDEL MES', 150, 420, 70, th.texto, true), ...lineas(160, 760, 760, 5, 90, th.acento), T('¡Felicidades! 🎉', 320, 1230, 44, th.texto, true)] },
    { id: 'diploma', cat: 'Reconocimiento', nombre: 'Diploma', w: 1350, h: 1000, build: th => [R(45, 45, 1260, 910, th.acento, 10, false), R(68, 68, 1214, 864, th.acento, 3, false), E(600, 92, 150, 150, th.acento, true), T('🏅', 648, 118, 92), T('DIPLOMA DE HONOR', 310, 290, 74, th.texto, true, 'Georgia, serif'), T('Se otorga a:', 300, 440, 40, th.texto), L(300, 575, 1050, 575, th.acento, 2), L(360, 835, 580, 835, th.texto, 2), L(770, 835, 990, 835, th.texto, 2), T('Director(a)', 410, 850, 24, th.texto), T('Docente', 830, 850, 24, th.texto)] },
    { id: 'certificado', cat: 'Reconocimiento', nombre: 'Certificado', w: 1350, h: 1000, build: th => [R(60, 60, 1230, 880, th.acento, 6, false), T('CERTIFICADO', 360, 200, 90, th.texto, true, 'Georgia, serif'), T('de participación', 470, 320, 44, th.texto), L(350, 560, 1000, 560, th.acento, 2), T('por su destacada participación en…', 360, 620, 32, th.texto)] },
    { id: 'alumno', cat: 'Reconocimiento', nombre: 'Alumno del mes', w: 1350, h: 1000, build: th => [E(600, 120, 150, 150, th.acento, true), T('⭐', 648, 148, 90), T('ESTUDIANTE DEL MES', 340, 360, 62, th.texto, true), L(400, 560, 950, 560, th.acento, 2), T('¡Felicitaciones por tu esfuerzo!', 380, 620, 34, th.texto)] },
    { id: 'felicitacion', cat: 'Reconocimiento', nombre: 'Felicitaciones', w: 1080, h: 1080, build: th => [T('🎉', 450, 140, 170), T('¡FELICITACIONES!', 110, 520, 72, th.texto, true), T('Por tu excelente trabajo', 240, 660, 42, th.texto)] },
    { id: 'portada', cat: 'Cuaderno', nombre: 'Portada de área', w: 1080, h: 1350, build: th => [E(760, -130, 520, 520, th.acento, true), T('📘', 100, 300, 130), T('CUADERNO DE', 100, 540, 44, th.texto), T('Comunicación', 100, 600, 92, th.texto, true), T('5° de Primaria · 2026', 100, 780, 40, th.texto), R(100, 920, 640, 100, th.texto, 3, false), T('Nombre:', 120, 952, 36, th.texto)] },
    { id: 'etiqueta', cat: 'Cuaderno', nombre: 'Etiqueta', w: 1050, h: 600, build: th => [R(40, 40, 970, 520, th.acento, 8, false), T('📚', 90, 170, 120), T('Nombre:', 300, 160, 48, th.texto, true), L(300, 300, 960, 300, th.acento, 3), T('Grado y sección:', 300, 360, 40, th.texto), L(300, 470, 960, 470, th.acento, 3)] },
    { id: 'invitacion', cat: 'Eventos', nombre: 'Invitación', w: 1080, h: 1350, build: th => [T('✉️', 440, 130, 150), T('TE INVITAMOS', 180, 420, 76, th.texto, true), T('Reunión de padres de familia', 150, 560, 40, th.texto), ...lineas(180, 740, 720, 4, 100, th.acento), T('¡Te esperamos! 🙌', 300, 1240, 42, th.texto, true)] },
    { id: 'bienvenida', cat: 'Eventos', nombre: 'Bienvenida', w: 1080, h: 1350, build: th => [T('🎈', 120, 130, 140), T('🎈', 820, 130, 140), T('¡BIENVENIDOS\nA CLASE!', 120, 460, 92, th.texto, true), T('Un nuevo año para aprender juntos', 120, 860, 40, th.texto)] },
    { id: 'utiles', cat: 'Listas', nombre: 'Lista de útiles', w: 1080, h: 1350, build: th => [R(0, 110, 1080, 150, th.acento, 0, true), T('🎒 LISTA DE ÚTILES', 110, 140, 64, th.bg === 'bgcolor' ? '#ffffff' : th.texto, true), ...Array.from({ length: 8 }, (_, i) => T('☐  _______________________', 110, 380 + i * 110, 40, th.texto))] },
    { id: 'ficha', cat: 'Listas', nombre: 'Ficha de trabajo', w: 1080, h: 1350, build: th => [R(60, 90, 960, 120, th.acento, 0, true), T('FICHA DE TRABAJO', 110, 115, 54, th.bg === 'bgcolor' ? '#ffffff' : th.texto, true), T('Nombre: ____________________', 90, 280, 38, th.texto), T('Área: ____________   Fecha: ________', 90, 360, 38, th.texto), ...lineas(90, 520, 900, 8, 95, th.acento)] }
  ];

  const CATS = ['Todas', ...[...new Set(LAYOUTS.map(l => l.cat))]];
  const spec = (lay, th) => ({ w: lay.w, h: lay.h, bg: th.bg, bgColor: th.bgColor, objs: lay.build(th) });

  function estilos() {
    if (document.getElementById('pl-css')) return;
    document.head.appendChild(el('style', { id: 'pl-css' }, `
.pl-ov{position:fixed;inset:0;z-index:4400;background:#f6f7f9;display:flex;flex-direction:column;font-family:ui-sans-serif,system-ui,Arial}
.pl-bar{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb;flex-wrap:wrap}
.pl-bar h2{margin:0;font-size:19px;flex:0 0 auto}
.pl-x{margin-left:auto;border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px;cursor:pointer;font-weight:700}
.pl-search{border:1px solid #e5e7eb;border-radius:10px;padding:9px 12px;font:inherit;min-width:180px;flex:1}
.pl-sub{display:flex;gap:10px;align-items:center;padding:10px 16px;background:#fff;border-bottom:1px solid #eef2f6;flex-wrap:wrap;overflow:auto}
.pl-cat{border:1px solid #e5e7eb;background:#fff;border-radius:20px;padding:7px 14px;cursor:pointer;font-weight:700;font-size:13px;white-space:nowrap}
.pl-cat.on{background:#0284c7;color:#fff;border-color:#0284c7}
.pl-temas{display:flex;gap:5px;align-items:center;margin-left:auto}
.pl-tema{width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #cbd5e1;cursor:pointer}
.pl-tema.on{box-shadow:0 0 0 3px #0284c7}
.pl-body{flex:1;overflow:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;align-content:start}
.pl-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;cursor:pointer;transition:.12s}
.pl-card:hover{transform:translateY(-3px);box-shadow:0 10px 24px -12px rgba(2,132,199,.5);border-color:#7dd3fc}
.pl-card canvas{width:100%;display:block;background:#f1f5f9}
.pl-card .nm{padding:8px 10px;font-size:13px;font-weight:700}
.pl-card .ct{color:#94a3b8;font-weight:400;font-size:11px}
.pl-info{padding:0 16px 10px;color:#64748b;font-size:13px;background:#fff}
`));
  }

  function galeria(onPick) {
    estilos();
    const ov = el('div', { className: 'pl-ov' });
    let cat = 'Todas', tema = TEMAS[0], q = '';
    const bar = el('div', { className: 'pl-bar' });
    bar.appendChild(el('h2', {}, '📚 Plantillas'));
    const search = el('input', { className: 'pl-search', placeholder: '🔎 Buscar (diploma, horario, cartel…)' });
    const x = el('button', { className: 'pl-x', textContent: '✕ Cerrar' }); x.onclick = () => ov.remove();
    bar.appendChild(search); bar.appendChild(x);
    const sub = el('div', { className: 'pl-sub' });
    const info = el('div', { className: 'pl-info' });
    const body = el('div', { className: 'pl-body' });
    ov.appendChild(bar); ov.appendChild(sub); ov.appendChild(info); ov.appendChild(body);
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';

    const catChips = {};
    CATS.forEach(c => { const b = el('div', { className: 'pl-cat' + (c === cat ? ' on' : ''), textContent: c }); b.onclick = () => { cat = c; Object.values(catChips).forEach(z => z.classList.remove('on')); b.classList.add('on'); render(); }; catChips[c] = b; sub.appendChild(b); });
    const temasWrap = el('div', { className: 'pl-temas' });
    TEMAS.forEach(t => { const b = el('div', { className: 'pl-tema' + (t.id === tema.id ? ' on' : ''), title: t.nombre }); b.style.background = t.chip; b.onclick = () => { tema = t; temasWrap.querySelectorAll('.pl-tema').forEach(z => z.classList.remove('on')); b.classList.add('on'); render(); }; temasWrap.appendChild(b); });
    sub.appendChild(temasWrap);
    search.oninput = () => { q = search.value.trim().toLowerCase(); render(); };

    function render() {
      const lays = LAYOUTS.filter(l => (cat === 'Todas' || l.cat === cat) && (!q || (l.nombre + ' ' + l.cat).toLowerCase().includes(q)));
      info.textContent = `${LAYOUTS.length} diseños × ${TEMAS.length} colores = ${LAYOUTS.length * TEMAS.length} plantillas · y con el botón ✨ IA, infinitas.`;
      body.innerHTML = '';
      for (const lay of lays) {
        const sp = spec(lay, tema);
        const card = el('div', { className: 'pl-card' });
        const cv = el('canvas'); const W = 320, H = Math.round(W * lay.h / lay.w); cv.width = W; cv.height = H;
        const g = cv.getContext('2d'); g.scale(W / lay.w, W / lay.w);
        try { if (window.TIC && window.TIC.pintar) window.TIC.pintar(g, sp); } catch (e) {}
        card.appendChild(cv);
        card.appendChild(el('div', { className: 'nm' }, `${EM(lay.nombre)} <span class="ct">· ${EM(lay.cat)}</span>`));
        card.onclick = () => { ov.remove(); document.body.style.overflow = ''; onPick(sp); };
        body.appendChild(card);
      }
      if (!lays.length) body.innerHTML = '<p style="color:#94a3b8">No encontré plantillas con eso. Prueba otra palabra.</p>';
    }
    render();
  }

  window.PLANTILLAS = { galeria, TEMAS, LAYOUTS };
})();
