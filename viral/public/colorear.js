// 🎨 Yupitok Academy: colorear tocando zonas, con nombres de colores en inglés, deshacer, guardado automático y descarga.
(() => {
  const svg = document.querySelector('#lam svg'), caja = document.getElementById('lam'); if (!svg || !caja) return;
  const slug = caja.dataset.slug, clave = 'col:' + slug, zonas = [...svg.querySelectorAll('.z')], BLANCO = '#ffffff';
  const PAL = [['#ef4444', 'Red', 'rojo'], ['#f97316', 'Orange', 'anaranjado'], ['#facc15', 'Yellow', 'amarillo'], ['#22c55e', 'Green', 'verde'], ['#3b82f6', 'Blue', 'azul'], ['#7dd3fc', 'Light blue', 'celeste'],
    ['#a855f7', 'Purple', 'morado'], ['#f472b6', 'Pink', 'rosado'], ['#92400e', 'Brown', 'marrón'], ['#e7c58f', 'Beige', 'arena'], ['#9ca3af', 'Gray', 'gris'], ['#1f2937', 'Black', 'negro'], [BLANCO, 'White', 'blanco (borrador)']];
  let color = PAL[0][0]; const pila = [];
  const hablar = t => { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} };
  const leer = () => { try { return JSON.parse(localStorage.getItem(clave) || '[]'); } catch (e) { return []; } };
  const guardar = () => { try { localStorage.setItem(clave, JSON.stringify(zonas.map(z => z.getAttribute('fill') || BLANCO))); } catch (e) {} };
  leer().forEach((c, i) => { if (zonas[i] && /^#[0-9a-f]{6}$/i.test(c)) zonas[i].setAttribute('fill', c); });

  const pal = document.getElementById('paleta'), nombre = document.getElementById('colNombre');
  PAL.forEach(([c, en, es]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pc'; b.style.background = c; b.title = `${en} (${es})`; b.setAttribute('aria-label', `${en}, ${es}`);
    b.onclick = () => { color = c; pal.querySelectorAll('.pc').forEach(x => x.classList.toggle('on', x === b)); nombre.innerHTML = `<b>${en}</b> · ${es}`; hablar(en); }; pal.append(b); });
  pal.firstChild.classList.add('on'); nombre.innerHTML = `<b>${PAL[0][1]}</b> · ${PAL[0][2]}`;

  const fin = document.getElementById('colFin');
  const revisar = () => { const hechas = zonas.filter(z => (z.getAttribute('fill') || BLANCO) !== BLANCO).length; document.getElementById('colProg').textContent = `${hechas} de ${zonas.length} partes pintadas`; if (fin) fin.hidden = hechas < zonas.length; };
  svg.addEventListener('click', e => { const z = e.target.closest('.z'); if (!z) return; const antes = z.getAttribute('fill') || BLANCO; if (antes === color) return; pila.push([z, antes]); if (pila.length > 300) pila.shift(); z.setAttribute('fill', color);
    z.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 220 }); guardar(); revisar(); });
  document.getElementById('colDeshacer').onclick = () => { const u = pila.pop(); if (!u) return; u[0].setAttribute('fill', u[1]); guardar(); revisar(); };
  document.getElementById('colBorrar').onclick = () => { if (!confirm('¿Borrar todos los colores de esta lámina?')) return; zonas.forEach(z => { pila.push([z, z.getAttribute('fill') || BLANCO]); z.setAttribute('fill', BLANCO); }); guardar(); revisar(); };
  document.getElementById('colBajar').onclick = () => {
    const c = svg.cloneNode(true); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', 1200); c.setAttribute('height', 1200);
    c.querySelectorAll('.z').forEach(z => { if (!z.getAttribute('fill')) z.setAttribute('fill', BLANCO); z.setAttribute('stroke', '#1f1f1f'); z.setAttribute('stroke-width', '4'); z.setAttribute('stroke-linejoin', 'round'); });
    c.querySelectorAll('.l').forEach(l => { l.setAttribute('fill', 'none'); l.setAttribute('stroke', '#1f1f1f'); l.setAttribute('stroke-width', '4'); l.setAttribute('stroke-linecap', 'round'); });
    const img = new Image(); img.onload = () => { const cv = document.createElement('canvas'); cv.width = cv.height = 1200; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1200, 1200); g.drawImage(img, 0, 0, 1200, 1200);
      g.font = 'bold 34px system-ui,sans-serif'; g.fillStyle = '#7c3aed'; g.textAlign = 'right'; g.fillText('yupitok.com/academia', 1176, 1176);
      cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `yupitok-${slug}.png`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }, 'image/png'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c));
  };
  revisar();
})();
