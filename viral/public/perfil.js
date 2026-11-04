// 🧑‍🚀 Progreso del jugador: nivel y experiencia, monedas, racha diaria, misiones del día, logros y "Continuar jugando".
// Se guarda en el navegador y en el servidor (con código de recuperación para seguir en otro celular).
(() => {
  const hoy = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  const base = () => ({ v: 1, xp: 0, monedas: 50, racha: { dia: null, n: 0, max: 0 }, juegos: {}, misiones: null, logros: [], partidas: 0, creado: hoy() });
  let D = (() => { try { return Object.assign(base(), JSON.parse(LS.get('perfil') || 'null') || {}); } catch (e) { return base(); } })();
  let codigo = LS.get('perfilCodigo') || null, tg = null, tok = LS.get('perfilTok') || null, usuario = LS.get('perfilUsuario') || null;
  const nivelDe = xp => Math.floor(Math.sqrt(xp / 60)) + 1, xpPara = n => 60 * (n - 1) * (n - 1);
  const MISIONES = [
    ['jugar3', 'Juega 3 partidas', 3, 30], ['joyas2', 'Supera 2 niveles de Joyas', 2, 50], ['test1', 'Haz 1 test de personalidad', 1, 20],
    ['trivia1', 'Termina una trivia', 1, 25], ['huerto1', 'Supera 1 nivel de Huerto Defensor', 1, 40], ['mundo10', 'Recoge 10 monedas en el Mundo 3D', 10, 30], ['record1', 'Bate uno de tus récords', 1, 40], ['vivo1', 'Entra a una sala en vivo', 1, 20], ['juegos2', 'Prueba 2 juegos distintos', 2, 30],
  ];
  const LOGROS = [['primera', '🎮 Primera partida', d => d.partidas >= 1], ['diez', '🔟 10 partidas', d => d.partidas >= 10], ['cien', '💯 100 partidas', d => d.partidas >= 100],
    ['racha3', '🔥 Racha de 3 días', d => d.racha.max >= 3], ['racha7', '🔥 Racha de 7 días', d => d.racha.max >= 7], ['nivel5', '⭐ Nivel 5', d => nivelDe(d.xp) >= 5], ['nivel10', '🌟 Nivel 10', d => nivelDe(d.xp) >= 10],
    ['joyas10', '💎 Nivel 10 en Joyas', d => (d.juegos.joyas?.nivel || 1) > 10], ['joyas30', '💎 Nivel 30 en Joyas', d => (d.juegos.joyas?.nivel || 1) > 30], ['huerto10', '🌱 Nivel 10 en Huerto', d => (d.juegos.huerto?.nivel || 1) > 10], ['rico', '🪙 500 monedas', d => d.monedas >= 500], ['explorador', '🧭 10 juegos distintos', d => Object.keys(d.juegos).length >= 10]];

  function guardar() {
    LS.set('perfil', JSON.stringify(D)); clearTimeout(tg);
    tg = setTimeout(() => post('/api/perfil', { uid: VID, tok, data: D }).then(r => { if (r.codigo) { codigo = r.codigo; LS.set('perfilCodigo', codigo); } }).catch(() => {}), 1500);
  }
  function misionesHoy() {
    if (D.misiones?.dia !== hoy()) {
      const sem = hoy().split('-').reduce((a, x) => a * 31 + +x, 7), elegidas = [...MISIONES].sort((a, b) => ((a[0].charCodeAt(1) * sem) % 97) - ((b[0].charCodeAt(1) * sem) % 97)).slice(0, 3);
      D.misiones = { dia: hoy(), lista: elegidas.map(([id, txt, meta, premio]) => ({ id, txt, meta, premio, prog: 0, hecho: false, distintos: [] })) }; guardar();
    }
    return D.misiones.lista;
  }
  function avanzar(id, n = 1, extra) {
    for (const m of misionesHoy()) if (m.id === id && !m.hecho) {
      if (id === 'juegos2') { if (m.distintos.includes(extra)) continue; m.distintos.push(extra); }
      m.prog = Math.min(m.meta, m.prog + n);
      if (m.prog >= m.meta) { m.hecho = true; D.monedas += m.premio; aviso(`✅ Misión cumplida: ${m.txt} · +${m.premio} 🪙`); }
    }
  }
  function aviso(txt) { const d = document.createElement('div'); d.className = 'toast'; d.style.cssText = 'background:linear-gradient(90deg,#ffd166,#ff7aa8);color:#241a00;font-weight:800'; d.textContent = txt; document.body.append(d); setTimeout(() => d.remove(), 3200); try { FX?.son?.('ganar'); } catch (e) {} }
  function racha() {
    const h = hoy(); if (D.racha.dia === h) return;
    const ayer = new Date(Date.now() - 5 * 3600000 - 864e5).toISOString().slice(0, 10);
    D.racha.n = D.racha.dia === ayer ? D.racha.n + 1 : 1; D.racha.dia = h; D.racha.max = Math.max(D.racha.max, D.racha.n);
    const premio = Math.min(10 + D.racha.n * 5, 60); D.monedas += premio; setTimeout(() => aviso(`🔥 Racha de ${D.racha.n} ${D.racha.n === 1 ? 'día' : 'días'} · +${premio} 🪙`), 900);
  }
  function logros() { for (const [id, txt, cond] of LOGROS) if (!D.logros.includes(id) && cond(D)) { D.logros.push(id); D.monedas += 25; aviso(`🏅 Logro: ${txt} · +25 🪙`); } }
  function sumarXp(n) { const antes = nivelDe(D.xp); D.xp += n; const ahora = nivelDe(D.xp); if (ahora > antes) { D.monedas += 20 * ahora; setTimeout(() => aviso(`⭐ ¡Subiste a nivel ${ahora}! +${20 * ahora} 🪙`), 400); } }

  window.PERFIL = {
    get datos() { return D; }, get codigo() { return codigo; }, get tok() { return tok; }, get usuario() { return usuario; }, nivelDe, xpPara,
    async crearCuenta(u, clave) { const r = await post('/api/cuenta/crear', { uid: VID, tok, usuario: u, clave, data: D }); if (r.error) throw new Error(r.error); tok = r.tok; usuario = r.usuario; LS.set('perfilTok', tok); LS.set('perfilUsuario', usuario); if (!LS.get('chatNom')) LS.set('chatNom', usuario); guardar(); return usuario; },
    async entrar(u, clave) { const r = await post('/api/cuenta/entrar', { usuario: u, clave }); if (r.error) throw new Error(r.error); tok = r.tok; usuario = r.usuario; LS.set('perfilTok', tok); LS.set('perfilUsuario', usuario); LS.set('chatNom', usuario); if (r.data) D = Object.assign(base(), r.data); LS.set('perfil', JSON.stringify(D)); window.pintarHub?.(); return usuario; },
    // Continuar con Google / Facebook (el servidor verifica y crea o vincula la cuenta)
    async entrarSocial(proveedor, cred) { const r = await post('/api/cuenta/social', { proveedor, ...cred, uid: VID, tok, data: D }); if (r.error) throw new Error(r.error); tok = r.tok; usuario = r.usuario; LS.set('perfilTok', tok); LS.set('perfilUsuario', usuario); LS.set('chatNom', usuario);
      if (r.avatar) { LS.set('miFoto', r.avatar); LS.set('chatAv', r.avatar); } if (r.data) D = Object.assign(base(), r.data); LS.set('perfil', JSON.stringify(D)); if (r.nueva) guardar(); window.pintarHub?.(); return r; },
    async salirCuenta() { clearTimeout(tg); await post('/api/perfil', { uid: VID, tok, data: D }).catch(() => {}); post('/api/cuenta/salir', { tok }).catch(() => {}); tok = null; usuario = null; LS.set('perfilTok', ''); LS.set('perfilUsuario', ''); D = base(); LS.set('perfil', JSON.stringify(D)); window.pintarHub?.(); },
    // fin de una partida de cualquier juego
    partida(juego, puntos, extra = {}) {
      racha(); const J = D.juegos[juego] = D.juegos[juego] || { record: 0, partidas: 0 };
      const record = puntos > J.record && J.partidas > 0; J.partidas++; J.ultimo = Date.now(); if (puntos > J.record) J.record = puntos; Object.assign(J, extra);
      D.partidas++; sumarXp(10 + Math.min(40, Math.round(puntos / 50))); avanzar('jugar3'); avanzar('juegos2', 1, juego); if (record) avanzar('record1');
      logros(); guardar(); return { record };
    },
    evento(tipo, juego) { racha(); if (tipo === 'test') { avanzar('test1'); sumarXp(8); } if (tipo === 'trivia') { avanzar('trivia1'); sumarXp(12); } if (tipo === 'vivo') { avanzar('vivo1'); sumarXp(5); } if (juego) { const J = D.juegos[juego] = D.juegos[juego] || { record: 0, partidas: 0 }; J.ultimo = Date.now(); } logros(); guardar(); },
    nivelJuego(juego, n, estrellas) { const J = D.juegos[juego] = D.juegos[juego] || { record: 0, partidas: 0 }; J.estrellas = J.estrellas || {}; J.estrellas[n] = Math.max(J.estrellas[n] || 0, estrellas); J.nivel = Math.max(J.nivel || 1, n + 1); J.ultimo = Date.now(); if (juego === 'joyas') avanzar('joyas2'); if (juego === 'huerto') avanzar('huerto1'); sumarXp(15 + estrellas * 5); D.monedas += estrellas * 5; logros(); guardar(); },
    joyasNivel(n, estrellas) { return PERFIL.nivelJuego('joyas', n, estrellas); },
    ganar(n) { D.monedas += n; logros(); guardar(); },
    mision(id, n = 1) { avanzar(id, n); guardar(); },
    guardar() { guardar(); },
    gastar(n) { if (D.monedas < n) return false; D.monedas -= n; guardar(); return true; },
    recientes(nMax = 4) { return Object.entries(D.juegos).filter(([, j]) => j.ultimo).sort((a, b) => b[1].ultimo - a[1].ultimo).slice(0, nMax).map(([id, j]) => ({ juego: id, ...j })); },
    misiones: misionesHoy, logros: () => LOGROS.map(([id, txt]) => ({ id, txt, ok: D.logros.includes(id) })),
    async recuperar(cod) { const r = await post('/api/perfil/recuperar', { uid: VID, codigo: cod }); if (r.error) throw new Error(r.error); D = Object.assign(base(), r.data); guardar(); return true; },
  };
  // Si este navegador no tiene progreso guardado pero el servidor sí (p. ej. borraron datos del sitio sin cambiar de navegador), se recupera.
  post('/api/perfil', { uid: VID, tok }).then(r => { if (r.codigo) { codigo = r.codigo; LS.set('perfilCodigo', codigo); } if (r.data && (tok || (r.data.xp || 0) > (D.xp || 0))) { D = Object.assign(base(), r.data); LS.set('perfil', JSON.stringify(D)); window.pintarHub?.(); } }).catch(() => {});
})();
