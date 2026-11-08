// 🌐 La página en el idioma de cada visitante.
// Detecta el idioma del celular o la computadora (o el que elija en el selector) y traduce lo que aparece en pantalla.
// Cada texto se traduce una sola vez en el servidor (con la IA de ShortForge) y queda guardado para todos.
// No se traducen los mensajes de las personas en los chats.
(() => {
  const NOMBRES = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', it: 'Italiano', de: 'Deutsch', ru: 'Русский', ja: '日本語', ko: '한국어', zh: '中文', id: 'Bahasa Indonesia', tr: 'Türkçe' };
  const BANDERA = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷', fr: '🇫🇷', it: '🇮🇹', de: '🇩🇪', ru: '🇷🇺', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', id: '🇮🇩', tr: '🇹🇷' };
  let L = null; try { L = localStorage.getItem('lang'); } catch (e) {}
  const HL = (/[?&]hl=([a-z]{2})\b/.exec(location.search) || [])[1]; if (HL && NOMBRES[HL]) { L = HL; try { localStorage.setItem('lang', HL); } catch (e) {} } // ?hl=en (enlaces de las páginas en inglés)
  // Los robots de Google (búsqueda y AdSense) y otros buscadores ven siempre la página original en español
  if (/bot|crawl|spider|slurp|Mediapartners|Google-|APIs-Google|AdsBot|facebookexternalhit|Lighthouse|Chrome-Lighthouse/i.test(navigator.userAgent)) L = 'es';
  if (!NOMBRES[L]) L = (navigator.languages || [navigator.language || 'es']).map(x => String(x).toLowerCase().slice(0, 2)).find(x => NOMBRES[x]) || 'es';
  document.documentElement.lang = L;
  const D = new Map(), HECHOS = new Set(), pend = new Map(), FALLO = new Map(); // FALLO: textos sin traducción todavía (se reintenta en 30 s)
  window.IDIOMA = {
    actual: L, nombres: NOMBRES, bandera: BANDERA,
    cambiar(l) { try { localStorage.setItem('lang', l); } catch (e) {} location.reload(); },
    codigoVoz: { es: 'es', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', it: 'it-IT', de: 'de-DE', ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', id: 'id-ID', tr: 'tr-TR' }[L],
    // Traducción inmediata si ya existe; si no, se pide en segundo plano y por ahora devuelve el original
    precargar: lista => { if (L !== 'es') for (const x of lista || []) if (typeof x === 'string') IDIOMA.t(x); }, // pide traducciones por adelantado (voces de los personajes)
    t: s => { if (L === 'es' || typeof s !== 'string') return s; const st = s.trim(), [p, n] = plantilla(st), r = D.get(p); if (r != null) return s.replace(st, rellenar(r, n)); traducir(s, () => {}); return s; },
    selector() {
      const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('translate', 'no');
      m.innerHTML = `<div class="card" style="text-align:center;max-width:360px"><h2 style="margin:0 0 10px">🌐 Idioma · Language</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${Object.entries(NOMBRES).map(([k, n]) => `<button class="btn ${k === L ? '' : 'alt'}" data-l="${k}" style="margin:0">${BANDERA[k]} ${n}</button>`).join('')}</div><button class="btn alt" data-l="" style="margin-top:10px">✕</button></div>`;
      m.onclick = e => { const b = e.target.closest('[data-l]'); if (!b && e.target !== m) return; m.remove(); if (b?.dataset.l && b.dataset.l !== L) IDIOMA.cambiar(b.dataset.l); };
      document.body.append(m);
    },
  };
  // Botón del idioma (abajo a la derecha de la pantalla, pequeño)
  const ponerBoton = () => { if (document.getElementById('btnIdioma')) return; const b = document.createElement('button'); b.id = 'btnIdioma'; b.setAttribute('translate', 'no'); b.title = 'Idioma / Language'; b.textContent = '🌐 ' + L.toUpperCase();
    b.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:45;border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:6px 10px;background:rgba(15,10,40,.75);color:#fff;font:700 .78rem system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(6px)';
    b.onclick = () => IDIOMA.selector(); document.body.append(b); };
  if (document.body) ponerBoton(); else document.addEventListener('DOMContentLoaded', ponerBoton);
  if (L === 'es') return;

  // ---- Traducción ----
  const plantilla = s => { const n = []; return [s.replace(/\d+(?:[.,]\d+)*/g, m => { n.push(m); return '{' + (n.length - 1) + '}'; }), n]; };
  const rellenar = (t, n) => t.replace(/\{(\d+)\}/g, (m, i) => n[+i] ?? m);
  const SALTAR = 'script,style,noscript,code,textarea,[translate="no"],.notranslate,#msgs,#mch,.mchat,.msgsv,#cmsgs';
  let timer = null;
  function traducir(raw, aplicar) {
    const s = raw.trim(); if (!s || s.length > 400 || HECHOS.has(s) || !/\p{L}{2,}/u.test(s)) return;
    if (FALLO.has(s) && Date.now() - FALLO.get(s) < 30000) return;
    const [p, n] = plantilla(s), r = D.get(p);
    if (r != null) { const tr = rellenar(r, n); HECHOS.add(tr.trim()); if (tr !== s) aplicar(raw.replace(s, tr)); return; }
    if (!pend.has(p)) pend.set(p, []); pend.get(p).push([raw, s, n, aplicar]);
    clearTimeout(timer); timer = setTimeout(pedir, 250);
  }
  let pidiendo = false;
  async function pedir() {
    if (pidiendo) return; pidiendo = true;
    const lote = [...pend.keys()].slice(0, 60);
    try { const r = await fetch('/api/i18n', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: L, textos: lote }) }); const j = await r.json(); for (const [k, v] of Object.entries(j.t || {})) D.set(k, v); } catch (e) {}
    for (const k of lote) { const lista = pend.get(k) || []; pend.delete(k); const r = D.get(k); if (r == null) { lista.forEach(([, s]) => FALLO.set(s, Date.now())); continue; } // sin traducción por ahora: se reintenta más tarde
      for (const [raw, s, n, aplicar] of lista) { const tr = rellenar(r, n); HECHOS.add(tr.trim()); if (tr !== s) aplicar(raw.replace(s, tr)); } }
    pidiendo = false; limpiarCC?.(); if (pend.size) timer = setTimeout(pedir, 250);
  }
  const ATR = ['placeholder', 'title', 'aria-label'];
  function recorrer(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { const el = raiz.parentElement; if (el && !el.closest(SALTAR)) traducir(raiz.nodeValue, v => { raiz.nodeValue = v; }); return; }
    if (raiz.nodeType !== 1 || raiz.closest(SALTAR)) return;
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: n => n.nodeType === 1 && n.matches(SALTAR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodos = [raiz]; let n; while ((n = w.nextNode())) nodos.push(n);
    for (const x of nodos) {
      if (x.nodeType === 3) traducir(x.nodeValue, v => { x.nodeValue = v; });
      else for (const a of ATR) { const v = x.getAttribute?.(a); if (v) traducir(v, t => x.setAttribute(a, t)); }
    }
  }
  // Texto dibujado dentro de los juegos (canvas): se traduce al dibujarlo, usando lo ya guardado
  const CC = new Map();
  const tCanvas = s => { if (s.length < 2 || !/\p{L}{2,}/u.test(s)) return s; let r = CC.get(s); if (r !== undefined) return r; const [p, n] = plantilla(s.trim()), d = D.get(p);
    if (d != null) { r = s.replace(s.trim(), rellenar(d, n)); CC.set(s, r); return r; } if (CC.size > 5000) CC.clear(); CC.set(s, s); traducir(s, () => {}); return s; };
  const limpiarCC = () => { for (const [k, v] of CC) if (k === v) CC.delete(k); };
  const CP = window.CanvasRenderingContext2D?.prototype;
  if (CP) for (const f of ['fillText', 'strokeText', 'measureText']) { const o = CP[f]; CP[f] = function (txt, ...r) { return o.call(this, typeof txt === 'string' ? tCanvas(txt) : txt, ...r); }; }
  // alert / confirm con texto traducido (si ya está guardado)
  const al = window.alert.bind(window), co = window.confirm.bind(window);
  window.alert = m => al(IDIOMA.t(m)); window.confirm = m => co(IDIOMA.t(m));
  const empezar = () => {
    recorrer(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') recorrer(m.target); else if (m.type === 'attributes') recorrer(m.target); else m.addedNodes.forEach(recorrer); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATR });
    setInterval(() => { if (FALLO.size) { FALLO.clear(); recorrer(document.body); } }, 30000); // reintenta lo que no se pudo traducir
  };
  fetch(`/i18n/${L}.json`).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(d => { for (const [k, v] of Object.entries(d || {})) D.set(k, v); })
    .finally(() => { if (document.body) empezar(); else document.addEventListener('DOMContentLoaded', empezar); });
})();
